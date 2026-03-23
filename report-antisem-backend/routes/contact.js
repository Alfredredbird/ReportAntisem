/**
 * /api/contact
 *
 * POST /api/contact  – save a contact form submission
 * GET  /api/contact  – list all submissions (admin)
 */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

// POST /api/contact
router.post("/", (req, res) => {
  const { email, message } = req.body;

  if (!email || !message) {
    return res.status(400).json({ error: "email and message are required" });
  }

  const submission = db.createContactSubmission(req.body);
  console.log(`[CONTACT] ${submission.id} — ${submission.subject || "no subject"} — ${submission.email}`);
  return res.status(201).json({ success: true, submission });
});

// GET /api/contact  (admin — list all)
router.get("/", (_req, res) => {
  const all = db.getAllContactSubmissions();
  return res.json({ count: all.length, submissions: all });
});

module.exports = router;