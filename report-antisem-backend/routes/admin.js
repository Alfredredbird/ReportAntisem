/**
 * /api/admin  — protected routes for dashboard (admin + team)
 *
 * Middleware: requireAuth (any logged-in user)
 *             requireAdmin (role === "admin" only)
 *
 * GET    /api/admin/reports              – all reports with full detail
 * PATCH  /api/admin/reports/:id          – edit any report field
 * PATCH  /api/admin/reports/:id/status   – update status
 * DELETE /api/admin/reports/:id          – delete a report
 *
 * GET    /api/admin/users                – list all users        [admin only]
 * PATCH  /api/admin/users/:id            – edit user fields      [admin only]
 * DELETE /api/admin/users/:id            – delete a user         [admin only]
 *
 * GET    /api/admin/contact              – all contact messages  [admin only]
 * GET    /api/admin/stats                – summary dashboard stats
 */

const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const db      = require("../db");

const JWT_SECRET  = process.env.JWT_SECRET || "reportasa-dev-secret-change-in-production";
const COOKIE_NAME = "reportasa_token";
const ALLOWED_ROLES = ["admin", "team"];

// ── Auth middleware ────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    if (!ALLOWED_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied — insufficient role" });
    }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// Apply requireAuth to ALL admin routes
router.use(requireAuth);

// ── Dashboard summary stats ───────────────────────────────────────────────────
router.get("/stats", async (_req, res) => {
  try {
    const [reports, users, contacts, feed, pending] = await Promise.all([
      db.getAllReports(),
      db.getAllUsers(),
      db.getAllContactSubmissions(),
      db.getFeed(),
      db.getAllPendingSubmissions(),
    ]);

    const byStatus = reports.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    const byType = reports.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});

    const now = Date.now();
    const daily = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now - i * 86400000);
      const label = day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const count = reports.filter(r => {
        const d = new Date(r.created_at || r.createdAt);
        return d.toDateString() === day.toDateString();
      }).length;
      return { label, count };
    }).reverse();

    return res.json({
      totals: {
        reports:     reports.length,
        users:       users.length,
        contacts:    contacts.length,
        feed:        feed.length,
        pendingSubs: pending.length,
      },
      byStatus,
      byType,
      daily,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load stats" });
  }
});

// ── Reports ───────────────────────────────────────────────────────────────────
router.get("/reports", async (_req, res) => {
  try {
    return res.json(await db.getAllReports());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.patch("/reports/:id", async (req, res) => {
  try {
    const allowed = ["type", "date", "location", "org", "description", "contact", "anonymous", "links", "source"];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    // Build dynamic SET clause
    const cols = Object.keys(updates);
    if (cols.length === 0) return res.status(400).json({ error: "No valid fields to update" });
    const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
    const vals = [...Object.values(updates), req.params.id];
    const { rows } = await db.query(
      `UPDATE reports SET ${sets}, updated_at = NOW() WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: "Report not found" });
    return res.json({ success: true, report: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update report" });
  }
});

router.patch("/reports/:id/status", requireAdmin, async (req, res) => {
  const VALID = ["Under Review", "In Progress", "Resolved", "Dismissed"];
  const { status } = req.body;
  if (!status || !VALID.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID.join(", ")}` });
  }
  try {
    const updated = await db.updateReportStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: "Report not found" });
    return res.json({ success: true, report: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update status" });
  }
});

router.delete("/reports/:id", requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query("DELETE FROM reports WHERE id = $1", [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: "Report not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete report" });
  }
});

// ── Report Submissions ────────────────────────────────────────────────────────

// GET /api/admin/submissions — all submissions (admin sees all, team sees own)
router.get("/submissions", async (req, res) => {
  try {
    const all = await db.getAllSubmissions();
    // team members only see their own submissions
    if (req.user.role === "team") {
      return res.json(all.filter(s => s.submitted_by === req.user.id));
    }
    return res.json(all);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// GET /api/admin/submissions/pending — pending queue (admin only)
router.get("/submissions/pending", requireAdmin, async (_req, res) => {
  try {
    return res.json(await db.getAllPendingSubmissions());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch pending submissions" });
  }
});

// GET /api/admin/submissions/report/:reportId — submissions for a single report
router.get("/submissions/report/:reportId", async (req, res) => {
  try {
    const subs = await db.getSubmissionsByReport(req.params.reportId);
    // team members only see their own
    if (req.user.role === "team") {
      return res.json(subs.filter(s => s.submitted_by === req.user.id));
    }
    return res.json(subs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// POST /api/admin/submissions — team member submits notes for review
// Body: { reportId, markdown, imageLinks[] }
router.post("/submissions", async (req, res) => {
  const { reportId, markdown, imageLinks } = req.body;
  if (!reportId)  return res.status(400).json({ error: "reportId is required" });
  if (!markdown?.trim()) return res.status(400).json({ error: "markdown content is required" });

  // Validate image links (must be valid URLs or empty)
  const links = Array.isArray(imageLinks) ? imageLinks.filter(Boolean) : [];
  for (const l of links) {
    try { new URL(l); } catch {
      return res.status(400).json({ error: `Invalid URL: ${l}` });
    }
  }

  try {
    // Fetch submitter's name from DB
    const submitter = await db.getUserById(req.user.id);
    const sub = await db.createSubmission({
      reportId,
      submittedBy:   req.user.id,
      submitterName: submitter?.name || req.user.email,
      markdown,
      imageLinks:    links,
    });
    console.log(`[SUBMISSION] ${sub.id} by ${sub.submitter_name} for report ${reportId}`);
    return res.status(201).json({ success: true, submission: sub });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create submission" });
  }
});

// PATCH /api/admin/submissions/:id/review — admin approves or denies
// Body: { decision: "approved"|"denied", adminNote? }
// If approved → marks the report as "Resolved"
// If denied   → leaves report status unchanged, records note
router.patch("/submissions/:id/review", requireAdmin, async (req, res) => {
  const { decision, adminNote } = req.body;
  if (!["approved", "denied"].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'approved' or 'denied'" });
  }

  try {
    const updated = await db.reviewSubmission(req.params.id, {
      status:     decision,
      adminNote:  adminNote || "",
      reviewedBy: req.user.id,
    });
    if (!updated) return res.status(404).json({ error: "Submission not found" });

    // If approved, mark the parent report as Resolved
    if (decision === "approved") {
      await db.updateReportStatus(updated.report_id, "Resolved");
      console.log(`[APPROVED] Submission ${updated.id} → report ${updated.report_id} marked Resolved`);
    } else {
      console.log(`[DENIED] Submission ${updated.id} by admin`);
    }

    return res.json({ success: true, submission: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to review submission" });
  }
});

// ── Users (admin only) ────────────────────────────────────────────────────────
router.get("/users", requireAdmin, async (_req, res) => {
  try {
    const users = await db.getAllUsers();
    return res.json(users.map(u => { const { password_hash, ...rest } = u; return rest; }));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.patch("/users/:id", requireAdmin, async (req, res) => {
  const allowed = ["name", "title", "department", "bio", "role", "email"];
  const updates = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  try {
    const updated = await db.updateUser(req.params.id, updates);
    if (!updated) return res.status(404).json({ error: "User not found" });
    const { passwordHash, password_hash, ...safe } = updated;
    return res.json({ success: true, user: safe });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/users/:id", requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: "User not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete user" });
  }
});

// ── Contact messages (admin only) ─────────────────────────────────────────────
router.get("/contact", requireAdmin, async (_req, res) => {
  try {
    return res.json(await db.getAllContactSubmissions());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.delete("/contact/:id", requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query(
      "DELETE FROM contact_submissions WHERE id = $1",
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Message not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete message" });
  }
});

module.exports = router;