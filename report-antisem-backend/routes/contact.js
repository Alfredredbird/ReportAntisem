/**
 * /api/contact  — PostgreSQL version
 */

const express = require("express");
const router  = express.Router();
const db      = require("../db");

router.post("/", async (req, res) => {
  const { email, message } = req.body;
  if (!email || !message) {
    return res.status(400).json({ error: "email and message are required" });
  }
  try {
    const submission = await db.createContactSubmission(req.body);
    console.log(`[CONTACT] ${submission.id} — ${submission.subject || "no subject"} — ${submission.email}`);
    return res.status(201).json({ success: true, submission });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to save message" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const all = await db.getAllContactSubmissions();
    return res.json({ count: all.length, submissions: all });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

module.exports = router;