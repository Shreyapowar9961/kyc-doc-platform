const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { logAudit } = require("../lib/audit");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const TOKEN_EXPIRY = "1h";
const BCRYPT_ROUNDS = 12;
// Compared against when the email is unknown, so login takes about the same
// time whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_ROUNDS);

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "Password is too long (maximum 72 bytes)"
  );

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  name: z.string().trim().max(100).optional(),
  password: passwordSchema,
  role: z.literal("APPLICANT").optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

function issuesToList(error) {
  return error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
}

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-ups from this address, try again later" },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts, try again later" },
});

// POST /auth/register - public sign-up. The role is strictly APPLICANT.
router.post("/register", registerLimiter, async (req, res, next) => {
  try {
    // Explicit server-side rejection for non-applicant registration attempts
    if (req.body && req.body.role && req.body.role !== "APPLICANT") {
      return res.status(403).json({
        error: "Public self-registration is strictly restricted to applicants. Staff accounts (Officer, Manager, Fraud Analyst, Auditor, Admin) must be provisioned by a platform administrator.",
      });
    }

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid input", details: issuesToList(parsed.error) });
    }
    const { email, name, password } = parsed.data;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let user;
    try {
      user = await prisma.user.create({
        data: {
          email,
          name: name || null,
          passwordHash,
          role: "APPLICANT",
        },
        select: { id: true, email: true, name: true, role: true },
      });
    } catch (err) {
      if (err.code === "P2002") {
        return res
          .status(409)
          .json({ error: "An account with this email already exists" });
      }
      throw err;
    }

    await logAudit({ userId: user.id, action: "REGISTER", details: { ip: req.ip } });
    return res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login - returns a short-lived token.
router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid input", details: issuesToList(parsed.error) });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    const passwordOk = await bcrypt.compare(
      password,
      user ? user.passwordHash : DUMMY_HASH
    );

    if (!user || !passwordOk) {
      await logAudit({
        userId: user ? user.id : null,
        action: "LOGIN_FAILED",
        details: { ip: req.ip },
      });
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.isActive) {
      await logAudit({
        userId: user.id,
        action: "LOGIN_BLOCKED_INACTIVE",
        details: { ip: req.ip },
      });
      return res.status(403).json({ error: "This account is disabled" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set in the environment");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const token = jwt.sign({}, process.env.JWT_SECRET, {
      subject: user.id,
      expiresIn: TOKEN_EXPIRY,
      algorithm: "HS256",
    });

    await logAudit({ userId: user.id, action: "LOGIN", details: { ip: req.ip } });
    return res.json({ token, expiresIn: TOKEN_EXPIRY, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me - the logged-in user's safe profile.
router.get("/me", authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
