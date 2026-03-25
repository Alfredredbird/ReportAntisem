/**
 * /api/feed  — PostgreSQL version
 */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

const VALID_STATUSES = ["Under Review", "In Progress", "Resolved", "Dismissed"];

router.get("/", async (_req, res) => {
  try {
    return res.json(await db.getLiveFeed(5));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch feed" });
  }
});

router.post("/", async (req, res) => {
  const { location, type, time, status } = req.body;
  if (!type || !status) return res.status(400).json({ error: "type and status are required" });
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }
  try {
    const item = { id: req.body.id || `feed-${Date.now()}`, location: location || "", type, time: time || "just now", status };
    const feed = await db.upsertFeedItem(item);
    return res.status(201).json({ success: true, feed });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to save feed item" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const feed = await db.getFeed();
    const item = feed.find(f => f.id === req.params.id);
    if (!item) return res.status(404).json({ error: "Feed item not found" });
    const { status } = req.body;
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    }
    const updated = await db.upsertFeedItem({ ...item, ...req.body, id: req.params.id });
    return res.json({ success: true, feed: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update feed item" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const feed = await db.getFeed();
    if (!feed.find(f => f.id === req.params.id)) {
      return res.status(404).json({ error: "Feed item not found" });
    }
    const updated = await db.deleteFeedItem(req.params.id);
    return res.json({ success: true, feed: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete feed item" });
  }
});

module.exports = router;