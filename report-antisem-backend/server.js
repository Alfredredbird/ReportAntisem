require("dotenv").config();   // load .env before anything else

const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const cookieParser = require("cookie-parser");
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
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods:      ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials:  true,
};

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",    authRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/stats",   statsRouter);
app.use("/api/feed",    feedRouter);
app.use("/api/contact", contactRouter);
app.use("/api/admin",   adminRouter);

// ── Health check (also pings Postgres) ───────────────────────────────────────
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

// ── Start: verify DB connection first ─────────────────────────────────────────
async function start() {
  try {
    await pool.query("SELECT 1");
    console.log("✅  PostgreSQL connected");
  } catch (err) {
    console.error("❌  Could not connect to PostgreSQL:", err.message);
    console.error("    Check your DATABASE_URL in .env and make sure the DB is running.");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`✡  ReportASA backend running → http://localhost:${PORT}`);
  });
}

start();