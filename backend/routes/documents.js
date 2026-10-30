// backend/routes/documents.js
/**
 * Documents Download & Retrieval Endpoint.
 * Strictly enforces authenticated streaming downloads and the Section 4 Permission Matrix.
 */

const express = require("express");
const prisma = require("../lib/prisma");
const { logAudit } = require("../lib/audit");
const { authenticate } = require("../middleware/auth");
const storage = require("../lib/storage");

const router = express.Router();

/**
 * GET /documents/:id/file — Authenticated, authorized file download.
 * Prohibits public direct URLs.
 */
router.get("/:id/file", authenticate, async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id, 10);
    if (isNaN(docId)) return res.status(400).json({ error: "Invalid document ID" });

    const doc = await prisma.document.findUnique({
      where: { id: docId },
      include: {
        application: true,
      },
    });

    if (!doc || !doc.storagePath) {
      return res.status(404).json({ error: "Document not found" });
    }

    const user = req.user;

    // Role-based authorization check
    if (user.role === "APPLICANT") {
      // Must be owner
      if (doc.userId !== user.id && (!doc.application || doc.application.applicantId !== user.id)) {
        return res.status(404).json({ error: "Document not found" });
      }
    } else if (["OFFICER", "MANAGER", "FRAUD_ANALYST"].includes(user.role)) {
      // Staff can download documents of submitted applications only
      if (!doc.application || doc.application.status === "DRAFT") {
        return res.status(403).json({ error: "Cannot download documents of unsubmitted applications" });
      }
    } else {
      // AUDITOR and ADMIN are prohibited from downloading raw document content
      return res.status(403).json({ error: "Your role is not authorized to download document files" });
    }

    // Stream file from private storage
    const fileStream = await storage.getStream(doc.storagePath);

    await logAudit({
      userId: user.id,
      action: "FILE_DOWNLOAD",
      documentId: doc.id,
      details: { originalName: doc.originalName, applicationId: doc.applicationId },
    });

    res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.originalName)}"`);
    fileStream.pipe(res);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: "File not found in storage" });
    }
    next(err);
  }
});

module.exports = router;
