require("dotenv").config();
const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit    = require("express-rate-limit");
const { pool }     = require("./db");
const reportsRouter = require("./routes/reports");
const statsRouter   = require("./routes/stats");
const feedRouter    = require("./routes/feed");
const contactRouter = require("./routes/contact");
const adminRouter   = require("./routes/admin");
const authRouter    = require("./routes/auth");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://192.168.12.187:3000",
  "http://192.168.12.187:3001",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods:        ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials:    true,
};

// ── Rate limiters ─────────────────────────────────────────────────────────────

// General API limiter — 200 requests per 15 min per IP
const generalLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              200,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: "Too many requests, please try again later." },
});

// Report submission — 5 reports per hour per IP (prevents spam flooding)
const reportSubmitLimiter = rateLimit({
  windowMs:         60 * 60 * 1000,
  max:              5,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: "Too many reports submitted from this IP. Please wait before submitting again." },
  // Only apply to POST (not GET)
  skip: (req) => req.method !== "POST",
});

// Contact form — 3 messages per hour per IP
const contactLimiter = rateLimit({
  windowMs:         60 * 60 * 1000,
  max:              3,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: "Too many messages sent. Please wait before contacting us again." },
  skip: (req) => req.method !== "POST",
});

// Auth — 10 attempts per 15 min per IP (brute-force protection)
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: "Too many authentication attempts. Please wait and try again." },
  skip: (req) => req.method !== "POST",
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "50kb" })); // also cap body size
app.use(generalLimiter);                  // blanket limiter on all routes

// ── Routes (rate limiters applied per-router) ─────────────────────────────────
app.use("/api/auth",    authLimiter,         authRouter);
app.use("/api/reports", reportSubmitLimiter, reportsRouter);
app.use("/api/stats",   statsRouter);
app.use("/api/feed",    feedRouter);
app.use("/api/contact", contactLimiter,      contactRouter);
app.use("/api/admin",   adminRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT NOW() AS time");
    res.json({ status: "ok", db: "connected", time: rows[0].time });
  } catch {
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await pool.query("SELECT 1");
    console.log("✅  PostgreSQL connected");
  } catch (err) {
    console.error("❌  Could not connect to PostgreSQL:", err.message);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`✡  ReportASA backend running → http://localhost:${PORT}`);
  });
}
start();