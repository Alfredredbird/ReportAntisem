/**
 * /api/auth  — PostgreSQL version with secure password reset
 *
 * Password reset flow:
 *   1. POST /api/auth/forgot-password  { email }
 *      → generates a short-lived (1h) signed JWT token
 *      → in production: emails a link to the user
 *      → in development: returns the token directly in the response (no email needed)
 *
 *   2. POST /api/auth/reset-password   { token, newPassword }
 *      → verifies the JWT, checks it's a reset token, checks it hasn't been used
 *      → hashes the new password and saves it
 *      → invalidates the token by storing it in a used_tokens table
 */

const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const db       = require("../db");

const JWT_SECRET       = process.env.JWT_SECRET || "reportasa-dev-secret-change-in-production";
const RESET_SECRET     = process.env.RESET_SECRET || JWT_SECRET + "-reset";   // separate secret for reset tokens
const COOKIE_NAME      = "reportasa_token";
const APP_URL          = process.env.APP_URL || "http://localhost:3000";
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

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
// Body: { email }
//
// Security design:
//   • Always returns 200 with the same message whether or not the email exists
//     (prevents email enumeration attacks)
//   • Token is a signed JWT with purpose:"reset", expires in 1 hour
//   • Token includes a random jti (JWT ID) stored in DB so it can be invalidated
//     after single use
//   • In production: send the token via email (plug in your email provider below)
//   • In development (NODE_ENV !== "production"): return the link in the response
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });

  // Always respond the same way to prevent email enumeration
  const genericResponse = { success: true, message: "If that email is registered, a reset link has been sent." };

  try {
    const user = await db.getUserByEmail(email);
    if (!user) {
      // Still return 200 — don't reveal whether email exists
      return res.json(genericResponse);
    }

    // Generate a unique token ID so we can invalidate after use
    const jti = crypto.randomBytes(16).toString("hex");

    // Sign a short-lived reset token
    const resetToken = jwt.sign(
      {
        id:      user.id,
        email:   user.email,
        purpose: "reset",
        jti,
      },
      RESET_SECRET,
      { expiresIn: "1h" }
    );

    // Persist the jti so it can be checked + invalidated (single use)
    await db.storeResetToken(user.id, jti);

    const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;

    if (process.env.NODE_ENV !== "production") {
      // ── DEV MODE: return token in response for easy testing ──────────────
      console.log(`[DEV] Password reset link for ${user.email}:\n  ${resetLink}`);
      return res.json({
        ...genericResponse,
        // Only included in development for testing — NEVER in production
        _dev_reset_link: resetLink,
        _dev_token:      resetToken,
      });
    }

    // ── PRODUCTION: send email ─────────────────────────────────────────────
    // Plug in your email provider here (SendGrid, Resend, Nodemailer, etc.)
    // Example with Resend (npm install resend):
    //
    // const { Resend } = require("resend");
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from:    "ReportASA <noreply@reportasa.org>",
    //   to:      user.email,
    //   subject: "Reset your ReportASA password",
    //   html: `
    //     <p>Hi ${user.name},</p>
    //     <p>Click the link below to reset your password. This link expires in 1 hour.</p>
    //     <p><a href="${resetLink}">Reset Password →</a></p>
    //     <p>If you didn't request this, ignore this email.</p>
    //   `,
    // });

    console.log(`[RESET] Token generated for ${user.email} — configure email provider to send.`);
    return res.json(genericResponse);
  } catch (err) {
    console.error("[forgot-password]", err);
    // Return the generic response even on error to prevent information leakage
    return res.json(genericResponse);
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
// Body: { token, newPassword }
//
// Security checks:
//   1. Token must be a valid JWT signed with RESET_SECRET
//   2. Token must have purpose:"reset"
//   3. Token jti must exist in DB (not already used / revoked)
//   4. New password must be at least 8 characters
//   5. After use, the jti is deleted from DB (single-use token)
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token)       return res.status(400).json({ error: "Reset token is required" });
  if (!newPassword) return res.status(400).json({ error: "New password is required" });
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    // 1. Verify JWT signature + expiry
    let payload;
    try {
      payload = jwt.verify(token, RESET_SECRET);
    } catch (e) {
      const msg = e.name === "TokenExpiredError"
        ? "This reset link has expired. Please request a new one."
        : "Invalid reset token.";
      return res.status(400).json({ error: msg });
    }

    // 2. Must be a reset-purpose token
    if (payload.purpose !== "reset") {
      return res.status(400).json({ error: "Invalid reset token." });
    }

    // 3. Check jti exists in DB (not already used)
    const valid = await db.validateResetToken(payload.id, payload.jti);
    if (!valid) {
      return res.status(400).json({ error: "This reset link has already been used or is no longer valid. Please request a new one." });
    }

    // 4. Hash and save new password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.updateUser(payload.id, { passwordHash });

    // 5. Invalidate token (single use)
    await db.consumeResetToken(payload.id, payload.jti);

    console.log(`[RESET] Password reset successful for user ${payload.id}`);
    return res.json({ success: true, message: "Password reset successfully. You can now log in with your new password." });
  } catch (err) {
    console.error("[reset-password]", err);
    return res.status(500).json({ error: "Password reset failed. Please try again." });
  }
});

// ── POST /api/auth/change-password ───────────────────────────────────────────
// Body: { currentPassword, newPassword }
// Requires: authenticated user (cookie)
router.post("/change-password", async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user    = await db.getUserById(payload.id);
    if (!user) return res.status(401).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash || user.password_hash);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.updateUser(user.id, { passwordHash });

    return res.json({ success: true, message: "Password changed successfully." });
  } catch (err) {
    console.error("[change-password]", err);
    return res.status(500).json({ error: "Password change failed" });
  }
});

// ── GET /api/auth/verify-reset-token ─────────────────────────────────────────
// Query: ?token=...
// Lets the frontend check if a reset token is still valid before showing the form.
router.get("/verify-reset-token", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ valid: false, error: "Token is required" });

  try {
    const payload = jwt.verify(token, RESET_SECRET);
    if (payload.purpose !== "reset") return res.json({ valid: false, error: "Invalid token" });

    const valid = await db.validateResetToken(payload.id, payload.jti);
    if (!valid) return res.json({ valid: false, error: "Token has already been used" });

    return res.json({ valid: true, email: payload.email });
  } catch (e) {
    const msg = e.name === "TokenExpiredError" ? "Token has expired" : "Invalid token";
    return res.json({ valid: false, error: msg });
  }
});

module.exports = router;