// backend/server.js
// KYC & Loan Document Platform — Express Server

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRouter = require("./routes/auth");
const applicationsRouter = require("./routes/applications");
const documentsRouter = require("./routes/documents");
const historyRouter = require("./routes/history");
const adminRouter = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Security & Observability Middleware ────────────────────────────────────
app.use(helmet());

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// ─── Mandatory Security Fix S3: No static public /uploads route ─────────────
// Direct downloads without token authentication are completely disabled.
// All file access streams through authenticated route: GET /documents/:id/file

// ─── Route Registration ─────────────────────────────────────────────────────
app.use("/auth", authRouter);
app.use("/applications", applicationsRouter);
app.use("/documents", documentsRouter);
app.use("/history", historyRouter);
app.use("/admin", adminRouter);

// Health check endpoint (public)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    databaseConnected: Boolean(process.env.DATABASE_URL),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler (never leaks server stack traces in production)
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error("❌ API Error:", err.message);
  res.status(status).json({
    error: err.message || "Internal server error",
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ─── Start server ────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`\n🚀 KYC & Loan Platform API running on port ${PORT}`);
    // Mandatory Security Fix S9: Startup log prints boolean only, NEVER DATABASE_URL
    console.log(`🗄️  Database configured: ${Boolean(process.env.DATABASE_URL)}`);
    console.log(`🔒 Static public file uploads route: DISABLED (Authenticated streaming active)\n`);
  });
}

module.exports = app;
