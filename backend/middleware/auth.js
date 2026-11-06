const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

// In-memory cache for verified tokens to eliminate DB connection pool contention
const userCache = new Map();
const USER_CACHE_TTL_MS = 30000; // 30 seconds

function invalidateUserCache(userId) {
  if (userId) userCache.delete(userId);
  else userCache.clear();
}

// Reads "Authorization: Bearer <token>". Kept in one function so a cookie
// can be accepted later without changing the rest of the code.
function getToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme === "Bearer" && token) return token;
  return null;
}

// Checks the token, loads the user from the database and sets req.user.
async function authenticate(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) return sendError(res, 401, "Authentication required");

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set in the environment");
      return sendError(res, 500, "Server configuration error");
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch (err) {
      const message =
        err.name === "TokenExpiredError"
          ? "Session expired, please log in again"
          : "Invalid token";
      return sendError(res, 401, message);
    }

    if (!payload.sub) return sendError(res, 401, "Invalid token");

    // Check fast in-memory cache first
    let user;
    const now = Date.now();
    const cached = userCache.get(payload.sub);
    if (cached && now - cached.cachedAt < USER_CACHE_TTL_MS) {
      user = cached.user;
    } else {
      user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, role: true, isActive: true },
      });
      if (user && user.isActive) {
        userCache.set(payload.sub, { user, cachedAt: now });
      }
    }

    // A disabled account stops working immediately, even with a valid token.
    if (!user || !user.isActive) {
      return sendError(res, 401, "Account not found or disabled");
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.message && err.message.includes("Timed out fetching a new connection")) {
      console.error("⚠️ Database connection pool busy (cold start in progress):", err.message);
      return sendError(res, 503, "Database is currently warming up. Please refresh in a few seconds.");
    }
    next(err);
  }
}

// Usage: router.get("/x", authenticate, allowRoles("ADMIN", "OFFICER"), handler)
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return sendError(res, 401, "Authentication required");
    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, "You do not have permission to do this");
    }
    next();
  };
}

module.exports = { authenticate, allowRoles, invalidateUserCache };
