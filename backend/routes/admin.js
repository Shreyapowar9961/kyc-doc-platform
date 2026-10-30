// backend/routes/admin.js
/**
 * Admin & Audit Endpoints.
 * Strictly enforces ADMIN and AUDITOR roles per Section 4 Permission Matrix.
 */

const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { logAudit } = require("../lib/audit");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/ownership");

const router = express.Router();

const roleSchema = z.object({
  role: z.enum(["APPLICANT", "OFFICER", "MANAGER", "FRAUD_ANALYST", "AUDITOR", "ADMIN"]),
});

const provisionUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().max(100).optional(),
  password: z.string().min(10, "Password must be at least 10 characters"),
  role: z.enum(["OFFICER", "MANAGER", "FRAUD_ANALYST", "AUDITOR", "ADMIN", "APPLICANT"]),
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

// ─── POST /admin/users — Provision a new staff user (ADMIN only) ─────────────
router.post("/users", authenticate, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const parsed = provisionUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid user data", details: parsed.error.issues });
    }
    const { email, name, password, role } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
        role,
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });

    await logAudit({
      userId: req.user.id,
      action: "STAFF_PROVISION",
      details: { targetUserId: user.id, email: user.email, role: user.role },
    });

    res.status(201).json({ user });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
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
