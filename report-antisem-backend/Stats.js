/**
 * /api/stats
 *
 * GET  /api/stats               – returns computed stats (used by homepage stat cards)
 * POST /api/stats/community     – manually set community_members count
 */

const express = require("express");
const router  = express.Router();
const fs      = require("fs");
const path    = require("path");
const db      = require("../db");

const OVERRIDE_FILE = path.join(__dirname, "../data/stats_overrides.json");

function getOverrides() {
  if (!fs.existsSync(OVERRIDE_FILE)) return {};
  return JSON.parse(fs.readFileSync(OVERRIDE_FILE, "utf8"));
}

function saveOverrides(data) {
  fs.writeFileSync(OVERRIDE_FILE, JSON.stringify(data, null, 2));
}

// GET /api/stats
router.get("/", (_req, res) => {
  const computed  = db.computeStats();
  const overrides = getOverrides();
  return res.json({ ...computed, ...overrides });
});

// POST /api/stats/community  { count: 12000 }
router.post("/community", (req, res) => {
  const { count } = req.body;
  if (typeof count !== "number" || count < 0) {
    return res.status(400).json({ error: "count must be a non-negative number" });
  }
  const overrides = getOverrides();
  overrides.community_members = count;
  saveOverrides(overrides);
  return res.json({ success: true, community_members: count });
});

module.exports = router;