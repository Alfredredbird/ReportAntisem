/**
 * /api/feed  — manage the "Recent Reports" ticker on the homepage
 *
 * GET    /api/feed              – get all feed items
 * POST   /api/feed              – add or update a feed item
 * PATCH  /api/feed/:id          – update a specific feed item (e.g. change status)
 * DELETE /api/feed/:id          – remove a feed item
 *
 * A feed item shape:
 * {
 *   id:       string,
 *   location: string,   e.g. "New York, NY"
 *   type:     string,   e.g. "Online Harassment"
 *   time:     string,   e.g. "2 hours ago"
 *   status:   string,   "Under Review" | "In Progress" | "Resolved" | "Dismissed"
 * }
 */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

const VALID_STATUSES = ["Under Review", "In Progress", "Resolved", "Dismissed"];

// GET /api/feed
router.get("/", (_req, res) => {
  return res.json(db.getFeed());
});

// POST /api/feed  — upsert a feed item
router.post("/", (req, res) => {
  const { location, type, time, status } = req.body;

  if (!type || !status) {
    return res.status(400).json({ error: "type and status are required" });
  }
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  const item = {
    id:       req.body.id || `feed-${Date.now()}`,
    location: location || "",
    type,
    time:     time || "just now",
    status,
  };

  const feed = db.upsertFeedItem(item);
  return res.status(201).json({ success: true, feed });
});

// PATCH /api/feed/:id  — update status (or any field) of an existing feed item
router.patch("/:id", (req, res) => {
  const feed    = db.getFeed();
  const item    = feed.find(f => f.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Feed item not found" });

  const { status } = req.body;
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  const updated = db.upsertFeedItem({ ...item, ...req.body, id: req.params.id });
  return res.json({ success: true, feed: updated });
});

// DELETE /api/feed/:id
router.delete("/:id", (req, res) => {
  const before = db.getFeed();
  if (!before.find(f => f.id === req.params.id)) {
    return res.status(404).json({ error: "Feed item not found" });
  }
  const feed = db.deleteFeedItem(req.params.id);
  return res.json({ success: true, feed });
});

module.exports = router;