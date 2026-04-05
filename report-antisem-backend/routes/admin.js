/**
 * /api/admin  — protected routes for dashboard (admin + team)
 *
 * NEW:
 *   POST /api/admin/reports/:id/analyze  — send report to local Ollama (Qwen)
 *                                          and save criticality score
 */

const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const db      = require("../db");

const JWT_SECRET  = process.env.JWT_SECRET || "reportasa-dev-secret-change-in-production";
const COOKIE_NAME = "reportasa_token";
const ALLOWED_ROLES = ["admin", "team"];

// Ollama config — override via env vars
const OLLAMA_BASE  = process.env.OLLAMA_BASE  || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2:7b";

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

// ── AI Criticality Analysis (Ollama / Qwen) ───────────────────────────────────
//
// POST /api/admin/reports/:id/analyze
//
// Sends the report to your local Ollama instance and stores the result.
// Criticality levels: critical | important | normal | spam
//
// Requires the `criticality` column on the reports table:
//   ALTER TABLE reports ADD COLUMN IF NOT EXISTS criticality TEXT;
//   ALTER TABLE reports ADD COLUMN IF NOT EXISTS criticality_reason TEXT;
//   ALTER TABLE reports ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ;
//
router.post("/reports/:id/analyze", async (req, res) => {
  try {
    const report = await db.getReportById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });

    // Build the prompt
    const prompt = `You are a triage assistant for an incident-reporting platform.

Analyze the following report and classify its criticality as EXACTLY one of:
  critical  – immediate danger, serious crime, urgent action required
  important – significant issue warranting prompt attention
  normal    – routine report, no immediate urgency
  spam      – test data, gibberish, duplicate, or malicious submission

Report details:
  Type:        ${report.type || "N/A"}
  Location:    ${report.location || "N/A"}
  Organization:${report.org || "N/A"}
  Date:        ${report.date || "N/A"}
  Description: ${report.description || "N/A"}

Respond with ONLY a JSON object in this exact format (no markdown, no explanation):
{"criticality":"<level>","reason":"<one sentence reason>"}`;

    // Call Ollama
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:  OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.1, num_predict: 120 },
      }),
      // 30-second timeout
      signal: AbortSignal.timeout(30000),
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text();
      console.error("[OLLAMA ERROR]", ollamaRes.status, errText);
      return res.status(502).json({ error: `Ollama returned ${ollamaRes.status}: ${errText.slice(0, 200)}` });
    }

    const ollamaData = await ollamaRes.json();
    const rawText = (ollamaData.response || "").trim();

    // Parse the JSON response — be tolerant of minor formatting issues
    let criticality = "normal";
    let reason = "";
    try {
      // Strip any accidental markdown fences
      const clean = rawText.replace(/```json|```/g, "").trim();
      // Extract first {...} block
      const match = clean.match(/\{[\s\S]*?\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const VALID_LEVELS = ["critical", "important", "normal", "spam"];
        criticality = VALID_LEVELS.includes(parsed.criticality) ? parsed.criticality : "normal";
        reason = typeof parsed.reason === "string" ? parsed.reason.slice(0, 500) : "";
      }
    } catch (parseErr) {
      console.warn("[OLLAMA PARSE WARN] Could not parse response as JSON:", rawText.slice(0, 300));
      // Fallback: grep for a keyword in the raw text
      const lower = rawText.toLowerCase();
      if (lower.includes("critical"))  criticality = "critical";
      else if (lower.includes("important")) criticality = "important";
      else if (lower.includes("spam"))      criticality = "spam";
      reason = "Auto-classified from AI response";
    }

    // Persist to DB
    await db.query(
      `UPDATE reports
       SET criticality = $1, criticality_reason = $2, analyzed_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [criticality, reason, report.id]
    );

    console.log(`[AI ANALYZE] Report ${report.id} → ${criticality}`);
    return res.json({ success: true, criticality, reason, reportId: report.id });

  } catch (err) {
    if (err.name === "TimeoutError") {
      return res.status(504).json({ error: "Ollama request timed out. Is it running? Try: ollama serve" });
    }
    console.error("[ANALYZE ERROR]", err);
    return res.status(500).json({ error: "Failed to analyze report: " + err.message });
  }
});

// Bulk analyze all un-analyzed reports
router.post("/reports/analyze-all", requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id FROM reports WHERE criticality IS NULL ORDER BY created_at DESC LIMIT 50"
    );
    if (rows.length === 0) return res.json({ success: true, analyzed: 0, message: "All reports already analyzed" });

    // Fire and forget — respond immediately, process in background
    res.json({ success: true, queued: rows.length, message: `Analyzing ${rows.length} reports in background…` });

    // Background processing with a small delay between requests to avoid hammering Ollama
    (async () => {
      let done = 0;
      for (const { id } of rows) {
        try {
          await fetch(`http://localhost:${process.env.PORT || 3001}/api/admin/reports/${id}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: req.headers.cookie || "" },
          });
          done++;
          await new Promise(r => setTimeout(r, 500)); // 500ms gap
        } catch (e) {
          console.error(`[ANALYZE-ALL] Failed for report ${id}:`, e.message);
        }
      }
      console.log(`[ANALYZE-ALL] Done: ${done}/${rows.length}`);
    })();

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to queue analysis" });
  }
});

// ── Report Submissions ────────────────────────────────────────────────────────
router.get("/submissions", async (req, res) => {
  try {
    const all = await db.getAllSubmissions();
    if (req.user.role === "team") {
      return res.json(all.filter(s => s.submitted_by === req.user.id));
    }
    return res.json(all);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

router.get("/submissions/pending", requireAdmin, async (_req, res) => {
  try {
    return res.json(await db.getAllPendingSubmissions());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch pending submissions" });
  }
});

router.get("/submissions/report/:reportId", async (req, res) => {
  try {
    const subs = await db.getSubmissionsByReport(req.params.reportId);
    if (req.user.role === "team") {
      return res.json(subs.filter(s => s.submitted_by === req.user.id));
    }
    return res.json(subs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

router.post("/submissions", async (req, res) => {
  const { reportId, markdown, imageLinks } = req.body;
  if (!reportId)  return res.status(400).json({ error: "reportId is required" });
  if (!markdown?.trim()) return res.status(400).json({ error: "markdown content is required" });

  const links = Array.isArray(imageLinks) ? imageLinks.filter(Boolean) : [];
  for (const l of links) {
    try { new URL(l); } catch {
      return res.status(400).json({ error: `Invalid URL: ${l}` });
    }
  }

  try {
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