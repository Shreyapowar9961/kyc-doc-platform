// backend/routes/history.js
/**
 * Document History Endpoint.
 * Role-filtered document query with class and outcome facets.
 */

const express = require("express");
const prisma = require("../lib/prisma");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const classFilter = req.query.class || null;
    const outcomeFilter = req.query.outcome || null;
    const search = req.query.search?.trim() || null;

    // Base scope by role
    const where = {};
    if (user.role === "APPLICANT") {
      where.OR = [
        { userId: user.id },
        { application: { applicantId: user.id } },
      ];
    } else if (["OFFICER", "MANAGER", "FRAUD_ANALYST"].includes(user.role)) {
      where.application = { status: { in: ["SUBMITTED", "UNDER_REVIEW", "RECOMMENDED"] } };
    } else if (["AUDITOR", "ADMIN"].includes(user.role)) {
      // Allowed to view metadata
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    if (classFilter && classFilter !== "all") {
      where.class = classFilter;
    }
    if (outcomeFilter && outcomeFilter !== "all") {
      where.outcome = outcomeFilter;
    }
    if (search) {
      where.originalName = { contains: search, mode: "insensitive" };
    }

    const [docs, total] = await Promise.all([
      prisma.document.findMany({
        where,
        select: {
          id: true,
          applicationId: true,
          originalName: true,
          class: true,
          confidence: true,
          outcome: true,
          ocrChars: true,
          fileSize: true,
          mimeType: true,
          uploadDate: true,
          manualOverride: true,
          extractedFields: ["AUDITOR", "ADMIN"].includes(user.role) ? false : true,
          application: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { uploadDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    // Aggregate class distribution
    const classCounts = await prisma.document.groupBy({
      by: ["class"],
      _count: { class: true },
      where,
    });

    res.json({
      documents: docs,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      classCounts: classCounts.reduce((acc, c) => {
        acc[c.class] = c._count.class;
        return acc;
      }, {}),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
