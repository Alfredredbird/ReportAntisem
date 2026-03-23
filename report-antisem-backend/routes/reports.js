/**
 * /api/reports
 *
 * POST   /api/reports            – submit a new report (status → "Under Review")
 * GET    /api/reports            – list all reports   (admin)
 * GET    /api/reports/:id        – get single report  (admin)
 * PATCH  /api/reports/:id/status – update status      (admin)
 * GET    /api/reports/recent     – last 10 reports as feed items (used by front-end)
 */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

const VALID_STATUSES = ["Under Review", "In Progress", "Resolved", "Dismissed"];

// ── POST /api/reports ─────────────────────────────────────────────────────────
router.post("/", (req, res) => {
  const { type, description } = req.body;

  if (!type || !description) {
    return res.status(400).json({ error: "type and description are required" });
  }

  const report = db.createReport(req.body);
  console.log(`[NEW REPORT] ${report.id} — ${report.type} — ${report.location || "no location"}`);
  return res.status(201).json({ success: true, report });
});

// ── GET /api/reports/recent (must be BEFORE /:id) ─────────────────────────────
router.get("/recent", (_req, res) => {
  const all    = db.getAllReports();
  const recent = all
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map(r => ({
      id:       r.id,
      location: r.location,
      type:     r.type,
      time:     timeAgo(r.createdAt),
      status:   r.status,
    }));
  return res.json(recent);
});

// ── GET /api/reports ──────────────────────────────────────────────────────────
router.get("/", (_req, res) => {
  const reports = db.getAllReports();
  return res.json({ count: reports.length, reports });
});

// ── GET /api/reports/:id ──────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const report = db.getReportById(req.params.id);
  if (!report) return res.status(404).json({ error: "Report not found" });
  return res.json(report);
});

// ── PATCH /api/reports/:id/status ─────────────────────────────────────────────
router.patch("/:id/status", (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "status is required" });
  }
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
    });
  }

  const updated = db.updateReportStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: "Report not found" });

  console.log(`[STATUS UPDATE] ${updated.id} → ${status}`);
  return res.json({ success: true, report: updated });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60)          return `${diff} seconds ago`;
  if (diff < 3600)        return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400)       return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800)      return `${Math.floor(diff / 86400)} days ago`;
  return new Date(isoString).toLocaleDateString();
}

module.exports = router;