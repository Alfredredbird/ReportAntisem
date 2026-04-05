/**
 * /api/reports  — PostgreSQL version
 * NEW: Auto-analyze criticality via Ollama/Qwen on every new report submission
 */
const express = require("express");
const router  = express.Router();
const db      = require("../db");

const VALID_STATUSES = ["Under Review", "In Progress", "Resolved", "Dismissed"];

// ── Ollama config (mirrors admin.js — override via env) ───────────────────────
const OLLAMA_BASE  = process.env.OLLAMA_BASE  || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2:7b";

// ── Auto-analyze: fire-and-forget after report creation ───────────────────────
// Runs in the background so the submission response is never delayed.
async function autoAnalyze(report) {
  const prompt = `You are a strict triage assistant for an incident-reporting platform.

Your job is to classify reports into EXACTLY one of:
- critical  → immediate danger, violence, serious crime, urgent response needed
- important → significant issue requiring attention soon
- normal    → valid report but low urgency
- spam      → invalid, meaningless, test, or malicious input

STRICT RULES:
- If the description is empty, extremely short (< 10 characters), or meaningless → spam
- If the description contains only symbols, HTML tags (e.g. <b></b>), or random letters → spam
- If the description is gibberish or not understandable English → spam
- If the report looks like a test (e.g. "test", "123", "hello") → spam
- If content is duplicated or clearly fake → spam

- Only classify as normal/important/critical if the report contains a clear, meaningful real-world issue

EXAMPLES:
Description: "asdfghjkl" → spam
Description: "<b></b>" → spam
Description: "test" → spam
Description: "There is a fight happening outside the school right now" → critical
Description: "Broken streetlight on 5th ave" → normal

Report details:
Type:        ${report.type || "N/A"}
Location:    ${report.location || "N/A"}
Organization:${report.org || "N/A"}
Date:        ${report.date || "N/A"}
Description: ${report.description || "N/A"}

Respond with ONLY a JSON object:
{"criticality":"<level>","reason":"<short reason>"}`;

  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:  OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.1, num_predict: 120 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!ollamaRes.ok) {
      console.warn(`[AUTO-ANALYZE] Ollama ${ollamaRes.status} for report ${report.id}`);
      return;
    }

    const ollamaData = await ollamaRes.json();
    const rawText = (ollamaData.response || "").trim();

    let criticality = "normal";
    let reason = "";

    try {
      const clean = rawText.replace(/```json|```/g, "").trim();
      const match = clean.match(/\{[\s\S]*?\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const VALID = ["critical", "important", "normal", "spam"];
        criticality = VALID.includes(parsed.criticality) ? parsed.criticality : "normal";
        reason = typeof parsed.reason === "string" ? parsed.reason.slice(0, 500) : "";
      }
    } catch {
      // Fallback: keyword scan
      const lower = rawText.toLowerCase();
      if (lower.includes("critical"))       criticality = "critical";
      else if (lower.includes("important")) criticality = "important";
      else if (lower.includes("spam"))      criticality = "spam";
      reason = "Auto-classified from AI response";
    }

    await db.query(
      `UPDATE reports
       SET criticality = $1, criticality_reason = $2, analyzed_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [criticality, reason, report.id]
    );

    console.log(`[AUTO-ANALYZE] Report ${report.id} → ${criticality} ("${reason.slice(0, 60)}")`);

  } catch (err) {
    // Never throw — this is background work
    if (err.name === "TimeoutError") {
      console.warn(`[AUTO-ANALYZE] Ollama timeout for report ${report.id} — is Ollama running?`);
    } else {
      console.warn(`[AUTO-ANALYZE] Failed for report ${report.id}:`, err.message);
    }
  }
}

// ── Duplicate detection ───────────────────────────────────────────────────────
const recentFingerprints = new Map();
const DUPLICATE_WINDOW_MS = 60 * 1000;

function makeFingerprint(body) {
  const type = (body.type || "").toLowerCase().trim();
  const desc = (body.description || "").toLowerCase().trim().slice(0, 120);
  return `${type}::${desc}`;
}

function isDuplicate(fingerprint) {
  const last = recentFingerprints.get(fingerprint);
  if (!last) return false;
  return Date.now() - last < DUPLICATE_WINDOW_MS;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of recentFingerprints) {
    if (now - ts > DUPLICATE_WINDOW_MS) recentFingerprints.delete(key);
  }
}, 5 * 60 * 1000);

function sanitiseString(value, maxLen = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

// ── POST /api/reports ─────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { type, description, date, location, org, contact, anonymous, links, reporterName } = req.body;

  if (!type || !description) {
    return res.status(400).json({ error: "type and description are required" });
  }

  const clean = {
    type:         sanitiseString(type, 100),
    description:  sanitiseString(description, 5000),
    date:         sanitiseString(date, 20),
    location:     sanitiseString(location, 200),
    org:          sanitiseString(org, 200),
    contact:      sanitiseString(contact, 200),
    reporterName: sanitiseString(reporterName, 100),
    anonymous:    anonymous !== false,
    links:        Array.isArray(links)
      ? links.map(l => sanitiseString(l, 500)).filter(Boolean).slice(0, 10)
      : [],
  };

  const urlPattern = /^https?:\/\/.+/i;
  if (clean.links.some(l => !urlPattern.test(l))) {
    return res.status(400).json({ error: "All evidence links must be valid URLs starting with http:// or https://" });
  }

  const fingerprint = makeFingerprint(clean);
  if (isDuplicate(fingerprint)) {
    return res.status(429).json({ error: "A very similar report was just submitted. Please wait a moment before submitting again." });
  }
  recentFingerprints.set(fingerprint, Date.now());

  try {
    const report = await db.createReport(clean);
    console.log(`[NEW REPORT] ${report.id} — ${report.type} — ${report.location || "no location"}`);

    // ── Fire-and-forget AI analysis ──────────────────────────────────────────
    // setImmediate pushes this after the response is sent, keeping latency zero.
    setImmediate(() => autoAnalyze(report));

    return res.status(201).json({ success: true, report });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to save report" });
  }
});

// ── GET /api/reports/recent ───────────────────────────────────────────────────
router.get("/recent", async (_req, res) => {
  try {
    const all = await db.getAllReports();
    const recent = all.slice(0, 10).map(r => ({
      id:           r.id,
      location:     r.location,
      type:         r.type,
      time:         timeAgo(r.created_at || r.createdAt),
      status:       r.status,
      criticality:  r.criticality || null,
    }));
    return res.json(recent);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// ── GET /api/reports ──────────────────────────────────────────────────────────
router.get("/", async (_req, res) => {
  try {
    const reports = await db.getAllReports();
    return res.json({ count: reports.length, reports });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// ── GET /api/reports/:id ──────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const report = await db.getReportById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    return res.json(report);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch report" });
  }
});

// ── PATCH /api/reports/:id/status ─────────────────────────────────────────────
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "status is required" });
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
    });
  }
  try {
    const updated = await db.updateReportStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: "Report not found" });
    console.log(`[STATUS UPDATE] ${updated.id} → ${status}`);
    return res.json({ success: true, report: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update status" });
  }
});

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60)     return `${diff} seconds ago`;
  if (diff < 3600)   return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(isoString).toLocaleDateString();
}

module.exports = router;