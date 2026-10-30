// backend/routes/upload.js
// POST /upload/classify — File upload + OCR + classification pipeline

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();

// ─── Multer config (temp storage) ──────────────────────────────────────────
const tempDir = path.join(__dirname, "../temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported. Use PDF, PNG, JPG, TIFF.`));
    }
  },
});

// ─── Helper: Run Python classify.py ────────────────────────────────────────
function runClassifier(filePath, manualClass = null) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "../scripts/classify.py");
    const args = [scriptPath, filePath];
    if (manualClass) args.push("--manual-class", manualClass);

    const pythonCmd = process.env.PYTHON_CMD || "python";
    const proc = spawn(pythonCmd, args);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    proc.on("close", (code) => {
      if (code !== 0) {
        console.error("Python stderr:", stderr);
        return reject(new Error(`Classifier exited with code ${code}: ${stderr.slice(0, 500)}`));
      }
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse classifier output: ${stdout.slice(0, 200)}`));
      }
    });

    proc.on("error", (err) => reject(new Error(`Failed to start Python: ${err.message}`)));

    // Timeout after 5 minutes
    setTimeout(() => {
      proc.kill();
      reject(new Error("Classifier timed out after 60 seconds"));
    }, 300000);
  });
}

// ─── Helper: Compute cosine similarity in JS ───────────────────────────────
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Helper: Find top-N similar docs ───────────────────────────────────────
async function findTopSimilar(embedding, excludeId = null, topN = 3) {
  const allDocs = await prisma.document.findMany({
    where: excludeId ? { id: { not: excludeId } } : {},
    select: { id: true, filename: true, originalName: true, class: true, embedding: true, path: true },
  });

  const scored = allDocs
    .map((doc) => {
      try {
        const docEmb = JSON.parse(doc.embedding);
        const score = cosineSimilarity(embedding, docEmb);
        return { id: doc.id, filename: doc.originalName, path: doc.path, class: doc.class, score };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return scored;
}

// ─── POST /upload/classify ──────────────────────────────────────────────────
router.post("/classify", upload.single("file"), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded. Send a file with field name 'file'." });
  }

  const tempPath = req.file.path;
  const originalName = req.file.originalname;
  const manualClass = req.body.manualClass || null;

  console.log(`\n📄 Processing: ${originalName} (${(req.file.size / 1024).toFixed(1)} KB)`);
  if (manualClass) console.log(`🏷️  Manual class override: ${manualClass}`);

  try {
    // 1️⃣ Run ML pipeline
    console.log("🤖 Running classifier...");
    const mlResult = await runClassifier(tempPath, manualClass);

    const {
      class: docClass,
      confidence,
      text,
      embedding: embeddingArr,
      page_count: pageCount = 1,
      error: mlError,
    } = mlResult;

    if (mlError) {
      throw new Error(`ML pipeline error: ${mlError}`);
    }

    // 2️⃣ Move file to class folder
    const ext = path.extname(originalName);
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const finalFilename = `${timestamp}_${safeName}`;
    const classDir = path.join(__dirname, "../uploads", docClass);
    const finalPath = path.join(classDir, finalFilename);

    fs.renameSync(tempPath, finalPath);
    const relativePath = `uploads/${docClass}/${finalFilename}`;

    console.log(`✅ Saved to: ${relativePath}`);
    console.log(`🏷️  Class: ${docClass} (confidence: ${(confidence * 100).toFixed(1)}%)`);

    // 3️⃣ Save to database
    const doc = await prisma.document.create({
      data: {
        filename: finalFilename,
        originalName,
        path: relativePath,
        class: docClass,
        confidence,
        text: text.slice(0, 10000),
        embedding: JSON.stringify(embeddingArr),
        fileSize: req.file.size,
        pageCount,
        mimeType: req.file.mimetype,
        manualOverride: !!manualClass,
      },
    });

    // 4️⃣ Find top-3 similar docs
    const topSimilar = await findTopSimilar(embeddingArr, doc.id, 3);

    console.log(`🔍 Top similar docs: ${topSimilar.length} found`);

    res.status(201).json({
      success: true,
      document: {
        id: doc.id,
        filename: doc.originalName,
        path: doc.path,
        class: doc.class,
        confidence: doc.confidence,
        pageCount: doc.pageCount,
        uploadDate: doc.uploadDate,
        textPreview: text.slice(0, 300),
      },
      topSimilar,
    });

  } catch (err) {
    // Cleanup temp file if still exists
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    console.error("❌ Upload error:", err.message);
    next(err);
  }
});

module.exports = router;