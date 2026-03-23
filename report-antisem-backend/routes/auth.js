/**
 * /api/auth  — PostgreSQL version (all db calls are now async)
 */

const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const db       = require("../db");

const JWT_SECRET  = process.env.JWT_SECRET || "reportasa-dev-secret-change-in-production";
const COOKIE_NAME = "reportasa_token";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  secure:   process.env.NODE_ENV === "production",
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function safeUser(user) {
  if (!user) return null;
  const { passwordHash, password_hash, ...rest } = user;
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
  try {
    const existing = await db.getUserByEmail(email);
    if (existing) return res.status(409).json({ error: "An account with that email already exists" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.createUser({ email, passwordHash, name, title, department, bio, avatar, role: "user" });

    res.cookie(COOKIE_NAME, signToken(user), COOKIE_OPTS);
    return res.status(201).json({ success: true, user: safeUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });
  try {
    const user = await db.getUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.passwordHash || user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    await db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
    const fresh = await db.getUserById(user.id);

    res.cookie(COOKIE_NAME, signToken(user), COOKIE_OPTS);
    return res.json({ success: true, user: safeUser(fresh) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Login failed" });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user    = await db.getUserById(payload.id);
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
router.patch("/me", async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const allowed = ["name", "title", "department", "bio", "avatar"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const updated = await db.updateUser(payload.id, updates);
    if (!updated) return res.status(404).json({ error: "User not found" });
    return res.json({ success: true, user: safeUser(updated) });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

module.exports = router;