/**
 * /api/reports  — PostgreSQL version
 */
const express = require("express");
const router  = express.Router();
const db      = require("../db");

const VALID_STATUSES = ["Under Review", "In Progress", "Resolved", "Dismissed"];

// Simple in-memory store for duplicate detection within a short window.
// Keyed by a fingerprint string; value is the timestamp of last submission.
// This is a lightweight guard — the rate limiter in server.js is the primary defence.
const recentFingerprints = new Map();
const DUPLICATE_WINDOW_MS = 60 * 1000; // 60 seconds

function makeFingerprint(body) {
  // A duplicate is same type + same description (lowercased, trimmed) within the window
  const type = (body.type || "").toLowerCase().trim();
  const desc = (body.description || "").toLowerCase().trim().slice(0, 120);
  return `${type}::${desc}`;
}

function isDuplicate(fingerprint) {
  const last = recentFingerprints.get(fingerprint);
  if (!last) return false;
  return Date.now() - last < DUPLICATE_WINDOW_MS;
}

// Periodically prune stale fingerprints so the Map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of recentFingerprints) {
    if (now - ts > DUPLICATE_WINDOW_MS) recentFingerprints.delete(key);
  }
}, 5 * 60 * 1000); // every 5 minutes

// Basic input sanitiser — strips leading/trailing whitespace, caps length
function sanitiseString(value, maxLen = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

// ── POST /api/reports ─────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const {
    type,
    description,
    date,
    location,
    org,
    contact,
    anonymous,
    links,
    reporterName, // ← new optional field
  } = req.body;

  // Required fields
  if (!type || !description) {
    return res.status(400).json({ error: "type and description are required" });
  }

  // Sanitise all string inputs
  const clean = {
    type:         sanitiseString(type, 100),
    description:  sanitiseString(description, 5000),
    date:         sanitiseString(date, 20),
    location:     sanitiseString(location, 200),
    org:          sanitiseString(org, 200),
    contact:      sanitiseString(contact, 200),
    reporterName: sanitiseString(reporterName, 100), // new
    anonymous:    anonymous !== false,
    links:        Array.isArray(links)
      ? links.map(l => sanitiseString(l, 500)).filter(Boolean).slice(0, 10)
      : [],
  };

  // Validate links are URLs
  const urlPattern = /^https?:\/\/.+/i;
  if (clean.links.some(l => !urlPattern.test(l))) {
    return res.status(400).json({ error: "All evidence links must be valid URLs starting with http:// or https://" });
  }

  // Duplicate guard
  const fingerprint = makeFingerprint(clean);
  if (isDuplicate(fingerprint)) {
    return res.status(429).json({ error: "A very similar report was just submitted. Please wait a moment before submitting again." });
  }
  recentFingerprints.set(fingerprint, Date.now());

  try {
    const report = await db.createReport(clean);
    console.log(`[NEW REPORT] ${report.id} — ${report.type} — ${report.location || "no location"}`);
    return res.status(201).json({ success: true, report });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to save report" });
  }
});

// ── GET /api/reports/recent (must be BEFORE /:id) ────────────────────────────
router.get("/recent", async (_req, res) => {
  try {
    const all = await db.getAllReports();
    const recent = all.slice(0, 10).map(r => ({
      id:       r.id,
      location: r.location,
      type:     r.type,
      time:     timeAgo(r.created_at || r.createdAt),
      status:   r.status,
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