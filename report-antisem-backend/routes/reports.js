/**
 * /api/reports  — PostgreSQL version (all handlers async)
 */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

const VALID_STATUSES = ["Under Review", "In Progress", "Resolved", "Dismissed"];

// ── POST /api/reports ─────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { type, description } = req.body;
  if (!type || !description) {
    return res.status(400).json({ error: "type and description are required" });
  }
  try {
    const report = await db.createReport(req.body);
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
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
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