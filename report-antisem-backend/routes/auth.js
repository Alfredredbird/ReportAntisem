/**
 * /api/auth
 *
 * POST /api/auth/register  – create a new user account
 * POST /api/auth/login     – login, sets httpOnly JWT cookie
 * GET  /api/auth/me        – return current user from cookie
 * POST /api/auth/logout    – clear the cookie
 */

const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const db       = require("../db");

const JWT_SECRET  = process.env.JWT_SECRET || "reportasa-dev-secret-change-in-production";
const COOKIE_NAME = "reportasa_token";
const COOKIE_OPTS = {
  httpOnly: true,          // JS cannot read it — protects against XSS
  sameSite: "lax",         // CSRF protection
  secure: process.env.NODE_ENV === "production", // HTTPS only in prod
  maxAge: 7 * 24 * 60 * 60 * 1000,              // 7 days in ms
};

// ── Helper: sign a JWT ────────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ── Helper: strip password before sending user to client ─────────────────────
function safeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { email, password, name, title, department, bio, avatar } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "email, password, and name are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "password must be at least 8 characters" });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = db.createUser({
    email,
    passwordHash,
    name,
    title:      title      || "",
    department: department || "",
    bio:        bio        || "",
    avatar:     avatar     || "",
    role:       "user",    // default role; change to "admin" manually in users.json
  });

  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  return res.status(201).json({ success: true, user: safeUser(user) });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // Update last login timestamp
  db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  return res.json({ success: true, user: safeUser(db.getUserById(user.id)) });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user    = db.getUserById(payload.id);
    if (!user) return res.status(401).json({ error: "User not found" });
    return res.json({ user: safeUser(user) });
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTS, maxAge: 0 });
  return res.json({ success: true });
});

// ── PATCH /api/auth/me ────────────────────────────────────────────────────────
// Update own profile (name, title, department, bio, avatar)
router.patch("/me", (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const allowed = ["name", "title", "department", "bio", "avatar"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const updated = db.updateUser(payload.id, updates);
    if (!updated) return res.status(404).json({ error: "User not found" });
    return res.json({ success: true, user: safeUser(updated) });
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

module.exports = router;