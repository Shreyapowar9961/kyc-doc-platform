// backend/routes/applications.js
/**
 * Applications API Endpoints.
 * Implements BRD v2.0 Section 14 (BR1, BR2, BR3, BR4, BR5, BR7, BR8, BR9, BR10).
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { z } = require("zod");

const prisma = require("../lib/prisma");
const { logAudit } = require("../lib/audit");
const { authenticate } = require("../middleware/auth");
const {
  requireRole,
  requireApplicationAccess,
  requireDraftOwner,
} = require("../middleware/ownership");
const storage = require("../lib/storage");
const mlClient = require("../lib/mlClient");
const { performCrossChecks } = require("../lib/crossCheck");

const router = express.Router();

// ─── Multer configuration (Memory storage for direct pipeline processing) ────
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || "10", 10);
const ALLOWED_EXTS = [".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp"];
const ALLOWED_MIMES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/tiff",
  "image/bmp",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024,
    files: 15,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      const err = new Error(`File extension ${ext} is not supported. Use PDF, PNG, JPG, TIFF, BMP.`);
      err.status = 415;
      return cb(err);
    }
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      const err = new Error(`MIME type ${file.mimetype} is not permitted.`);
      err.status = 415;
      return cb(err);
    }
    cb(null, true);
  },
});

function validateMagicBytes(buffer, ext) {
  if (!buffer || buffer.length < 4) return false;
  // PDF: %PDF (25 50 44 46)
  if (ext === ".pdf") {
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }
  // PNG: 89 50 4E 47
  if (ext === ".png") {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }
  // JPEG: FF D8 FF
  if (ext === ".jpg" || ext === ".jpeg") {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }
  // BMP: 42 4D (BM)
  if (ext === ".bmp") {
    return buffer[0] === 0x42 && buffer[1] === 0x4D;
  }
  // TIFF: 49 49 2A 00 or 4D 4D 00 2A
  if (ext === ".tiff") {
    return (
      (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2A) ||
      (buffer[0] === 0x4D && buffer[1] === 0x4D && buffer[2] === 0x2A)
    );
  }
  return true;
}

// ─── POST /applications — Create a new DRAFT application ─────────────────────
router.post("/", authenticate, requireRole("APPLICANT", "ADMIN"), async (req, res, next) => {
  try {
    const title = req.body.title?.trim() || `Loan Application ${new Date().toLocaleDateString()}`;

    const application = await prisma.application.create({
      data: {
        applicantId: req.user.id,
        title,
        status: "DRAFT",
      },
    });

    await logAudit({
      userId: req.user.id,
      action: "APPLICATION_CREATE",
      details: { applicationId: application.id, title },
    });

    res.status(201).json({ application });
  } catch (err) {
    next(err);
  }
});

// ─── GET /applications — List applications based on role ─────────────────────
router.get("/", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    let where = {};
    if (user.role === "APPLICANT") {
      where = { applicantId: user.id };
    } else if (["OFFICER", "MANAGER", "FRAUD_ANALYST"].includes(user.role)) {
      // Staff see submitted applications
      where = { status: { in: ["SUBMITTED", "UNDER_REVIEW", "RECOMMENDED"] } };
    } else if (["ADMIN", "AUDITOR"].includes(user.role)) {
      // Admins and Auditors have platform-wide oversight to view applications
      where = {};
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          applicant: { select: { id: true, name: true, email: true } },
          _count: { select: { documents: true, checks: true, reviews: true } },
        },
      }),
      prisma.application.count({ where }),
    ]);

    res.json({
      applications,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /applications/:id — Detail with documents & checks ──────────────────
router.get("/:id", authenticate, requireApplicationAccess, (req, res) => {
  const app = req.application;

  // Mask internal database storage paths in user responses
  const safeDocuments = app.documents.map((d) => ({
    id: d.id,
    applicationId: d.applicationId,
    originalName: d.originalName,
    class: d.class,
    confidence: d.confidence,
    outcome: d.outcome,
    ocrChars: d.ocrChars,
    extractedFields: d.extractedFields,
    fileSize: d.fileSize,
    mimeType: d.mimeType,
    uploadDate: d.uploadDate,
  }));

  res.json({
    application: {
      ...app,
      documents: safeDocuments,
    },
  });
});

// ─── POST /applications/:id/documents — Multi-file upload ────────────────────
router.post(
  "/:id/documents",
  authenticate,
  requireApplicationAccess,
  requireDraftOwner,
  upload.array("files", 15),
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const results = [];
      const applicationId = req.application.id;

      for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase();

        // 1. Validate magic bytes against spoofing
        if (!validateMagicBytes(file.buffer, ext)) {
          return res.status(415).json({
            error: `File header mismatch for ${file.originalname}. Invalid magic bytes.`,
          });
        }

        // 2. Classify via Python ML Microservice
        let mlResult;
        try {
          mlResult = await mlClient.classifyFile(file.buffer, file.originalname, file.mimetype);
        } catch (mlErr) {
          console.error("ML classify error:", mlErr.message);
          mlResult = {
            class: "other_unknown",
            confidence: 0.0,
            outcome: "NEEDS_REVIEW",
            ocr_chars: 0,
            text: "",
          };
        }

        // 3. Extract KYC fields (R2)
        let extracted = {};
        if (mlResult.text) {
          try {
            extracted = await mlClient.extractFields(mlResult.text, mlResult.class);
          } catch (_) {}
        }

        // 4. Save to Private Storage
        const fileUuid = uuidv4();
        const storagePath = `applications/${applicationId}/${fileUuid}${ext}`;
        await storage.putFile(file.buffer, storagePath, file.mimetype);

        // 5. Create Document database record
        const docRecord = await prisma.document.create({
          data: {
            filename: `${fileUuid}${ext}`,
            originalName: file.originalname,
            storagePath,
            class: mlResult.class || "other_unknown",
            confidence: mlResult.confidence || 0,
            outcome: mlResult.outcome || "NEEDS_REVIEW",
            ocrChars: mlResult.ocr_chars || 0,
            text: mlResult.text || "",
            extractedFields: Object.keys(extracted).length > 0 ? extracted : undefined,
            fileSize: file.size,
            mimeType: file.mimetype,
            userId: req.user.id,
            applicationId,
          },
        });

        await logAudit({
          userId: req.user.id,
          action: "DOCUMENT_UPLOAD",
          documentId: docRecord.id,
          details: {
            applicationId,
            originalName: file.originalname,
            class: docRecord.class,
            outcome: docRecord.outcome,
          },
        });

        results.push({
          id: docRecord.id,
          applicationId,
          originalName: docRecord.originalName,
          class: docRecord.class,
          confidence: docRecord.confidence,
          outcome: docRecord.outcome,
          extractedFields: docRecord.extractedFields,
        });
      }

      res.status(201).json({ documents: results });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /applications/:id/documents/:docId ───────────────────────────────
router.delete(
  "/:id/documents/:docId",
  authenticate,
  requireApplicationAccess,
  requireDraftOwner,
  async (req, res, next) => {
    try {
      const docId = parseInt(req.params.docId, 10);
      if (isNaN(docId)) return res.status(400).json({ error: "Invalid document ID" });

      const doc = await prisma.document.findFirst({
        where: { id: docId, applicationId: req.application.id },
      });

      if (!doc) return res.status(404).json({ error: "Document not found in application" });

      // Delete from storage
      if (doc.storagePath) {
        await storage.deleteFile(doc.storagePath);
      }

      await prisma.document.delete({ where: { id: docId } });

      await logAudit({
        userId: req.user.id,
        action: "DOCUMENT_DELETE",
        documentId: docId,
        details: { applicationId: req.application.id, originalName: doc.originalName },
      });

      res.json({ success: true, message: "Document deleted" });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /applications/:id/submit — Submit Application ──────────────────────
router.post(
  "/:id/submit",
  authenticate,
  requireApplicationAccess,
  requireDraftOwner,
  async (req, res, next) => {
    try {
      const app = req.application;
      if (!app.documents || app.documents.length === 0) {
        return res.status(400).json({ error: "Application must contain at least one document to submit" });
      }

      // 1. Update application status to SUBMITTED
      const updatedApp = await prisma.application.update({
        where: { id: app.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });

      // 2. Perform Cross-Checks (R2)
      try {
        const checkResults = performCrossChecks(app.documents);
        for (const cr of checkResults) {
          await prisma.checkResult.create({
            data: {
              applicationId: app.id,
              check: cr.check,
              severity: cr.severity,
              reasonCode: cr.reasonCode,
              message: cr.message,
              evidence: cr.evidence,
            },
          });
        }
      } catch (checkErr) {
        console.warn("Cross-check execution error (non-blocking for R1):", checkErr.message);
      }

      await logAudit({
        userId: req.user.id,
        action: "APPLICATION_SUBMIT",
        details: { applicationId: app.id, documentsCount: app.documents.length },
      });

      res.json({ success: true, application: updatedApp });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /applications/:id/review — Record Review Recommendation (R2) ────────
const reviewSchema = z.object({
  recommendation: z.enum(["APPROVE", "REJECT", "NEED_MORE_DOCUMENTS"]),
  reason: z.string().trim().min(3, "Reason must be provided"),
});

router.post(
  "/:id/review",
  authenticate,
  requireRole("OFFICER", "MANAGER"),
  requireApplicationAccess,
  async (req, res, next) => {
    try {
      const parsed = reviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid review input", details: parsed.error.issues });
      }

      const { recommendation, reason } = parsed.data;
      const app = req.application;

      // Append-only review creation
      const review = await prisma.review.create({
        data: {
          applicationId: app.id,
          reviewerId: req.user.id,
          recommendation,
          reason,
        },
      });

      // Status update: APPROVE transitions to RECOMMENDED; others keep status
      let nextStatus = app.status;
      if (recommendation === "APPROVE") {
        nextStatus = "RECOMMENDED";
      } else if (app.status === "SUBMITTED") {
        nextStatus = "UNDER_REVIEW";
      }

      if (nextStatus !== app.status) {
        await prisma.application.update({
          where: { id: app.id },
          data: { status: nextStatus },
        });
      }

      await logAudit({
        userId: req.user.id,
        action: "REVIEW_RECOMMEND",
        details: { applicationId: app.id, recommendation, reason, nextStatus },
      });

      res.status(201).json({ review, status: nextStatus });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
