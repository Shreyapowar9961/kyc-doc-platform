// backend/routes/similar.js
// GET /similar/:id — find semantically similar documents

const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

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

// GET /similar/:id?topN=5&crossClass=true
router.get("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const topN = Math.min(10, Math.max(1, parseInt(req.query.topN) || 3));
    const crossClass = req.query.crossClass === "true"; // if false, same class only

    if (isNaN(id)) return res.status(400).json({ error: "Invalid document ID" });

    // Fetch the query document
    const queryDoc = await prisma.document.findUnique({ where: { id } });
    if (!queryDoc) return res.status(404).json({ error: "Document not found" });

    let queryEmbedding;
    try {
      queryEmbedding = JSON.parse(queryDoc.embedding);
    } catch {
      return res.status(500).json({ error: "Document embedding is corrupted" });
    }

    // Fetch candidates (all others, optionally same class)
    const where = { id: { not: id } };
    if (!crossClass) where.class = queryDoc.class;

    const candidates = await prisma.document.findMany({
      where,
      select: {
        id: true,
        filename: true,
        originalName: true,
        path: true,
        class: true,
        confidence: true,
        uploadDate: true,
        embedding: true,
      },
    });

    // Compute similarities
    const scored = candidates
      .map((doc) => {
        try {
          const emb = JSON.parse(doc.embedding);
          const score = cosineSimilarity(queryEmbedding, emb);
          const { embedding: _, ...docWithout } = doc;
          return { ...docWithout, score: parseFloat(score.toFixed(4)) };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);

    res.json({
      document: {
        id: queryDoc.id,
        filename: queryDoc.originalName,
        path: queryDoc.path,
        class: queryDoc.class,
        confidence: queryDoc.confidence,
      },
      similar: scored,
      meta: {
        topN,
        crossClass,
        totalCandidates: candidates.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
