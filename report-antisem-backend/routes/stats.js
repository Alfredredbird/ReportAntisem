/**
 * /api/stats  — PostgreSQL version
 */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

// GET /api/stats
router.get("/", async (_req, res) => {
  try {
    return res.json(await db.computeStats());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to compute stats" });
  }
});

// POST /api/stats/community  { count: 12000 }
router.post("/community", async (req, res) => {
  const { count } = req.body;
  if (typeof count !== "number" || count < 0) {
    return res.status(400).json({ error: "count must be a non-negative number" });
  }
  try {
    await db.setCommunityMembers(count);
    return res.json({ success: true, community_members: count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update community count" });
  }
});

module.exports = router;