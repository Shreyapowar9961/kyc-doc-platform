// backend/routes/admin.js
/**
 * Admin & Audit Endpoints.
 * Strictly enforces ADMIN and AUDITOR roles per Section 4 Permission Matrix.
 */

const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { logAudit } = require("../lib/audit");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/ownership");

const router = express.Router();

const roleSchema = z.object({
  role: z.enum(["APPLICANT", "OFFICER", "MANAGER", "FRAUD_ANALYST", "AUDITOR", "ADMIN"]),
});

// ─── GET /admin/users — List all registered users (ADMIN only) ───────────────
router.get("/users", authenticate, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    res.json({
      users,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /admin/users/:id/role — Update role (ADMIN only) ──────────────────
router.patch("/users/:id/role", authenticate, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid role value", details: parsed.error.issues });
    }

    const { role } = parsed.data;

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    const previousRole = targetUser.role;

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    await logAudit({
      userId: req.user.id,
      action: "ROLE_CHANGE",
      details: { targetUserId, previousRole, newRole: role },
    });

    res.json({ user: updatedUser });
  } catch (err) {
    next(err);
  }
});

// ─── GET /admin/audit — View audit trail (AUDITOR, ADMIN) ────────────────────
router.get("/audit", authenticate, requireRole("AUDITOR", "ADMIN"), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const actionFilter = req.query.action || undefined;

    const where = {};
    if (actionFilter) where.action = actionFilter;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
