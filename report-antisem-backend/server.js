const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");

const reportsRouter = require("./routes/reports");
const statsRouter   = require("./routes/stats");
const feedRouter    = require("./routes/feed");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/reports", reportsRouter);
app.use("/api/stats",   statsRouter);
app.use("/api/feed",    feedRouter);     // recent-reports feed (what the front-end polls)

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`✡  ReportASA backend running → http://localhost:${PORT}`);
});