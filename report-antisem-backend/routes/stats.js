/**
 * /api/stats  — PostgreSQL version (enhanced)
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

// GET /api/stats/analytics — rich analytics for the dashboard overview
router.get("/analytics", async (_req, res) => {
  try {
    const { rows: reports } = await db.query(
      "SELECT type, location, status, created_at FROM reports ORDER BY created_at DESC"
    );

    // ── 1. Monthly trend (last 12 months) ───────────────────────────────────
    const monthlyMap = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      monthlyMap[key] = { label, count: 0 };
    }
    for (const r of reports) {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap[key]) monthlyMap[key].count++;
    }
    const monthly = Object.values(monthlyMap);

    // ── 2. Hourly distribution (0–23) ───────────────────────────────────────
    const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    for (const r of reports) {
      const h = new Date(r.created_at).getHours();
      hourly[h].count++;
    }

    // ── 3. Day-of-week distribution ──────────────────────────────────────────
    const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayOfWeek = DOW.map(label => ({ label, count: 0 }));
    for (const r of reports) {
      dayOfWeek[new Date(r.created_at).getDay()].count++;
    }

    // ── 4. Top states ────────────────────────────────────────────────────────
    const stateMap = {};
    for (const r of reports) {
      if (!r.location?.includes(",")) continue;
      const state = r.location.split(",").pop().trim();
      if (state) stateMap[state] = (stateMap[state] || 0) + 1;
    }
    const topStates = Object.entries(stateMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([state, count]) => ({ state, count }));

    // ── 5. Type breakdown (all) ──────────────────────────────────────────────
    const typeMap = {};
    for (const r of reports) {
      if (r.type) typeMap[r.type] = (typeMap[r.type] || 0) + 1;
    }
    const byType = Object.entries(typeMap)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));

    // ── 6. Resolution metrics ────────────────────────────────────────────────
    const statusMap = {};
    for (const r of reports) {
      statusMap[r.status] = (statusMap[r.status] || 0) + 1;
    }
    const total    = reports.length;
    const resolved = statusMap["Resolved"] || 0;
    const avgResolutionDays = await (async () => {
      try {
        const { rows } = await db.query(
          `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)::numeric(6,1) AS avg_days
           FROM reports WHERE status = 'Resolved' AND updated_at IS NOT NULL`
        );
        return rows[0]?.avg_days ? parseFloat(rows[0].avg_days) : null;
      } catch { return null; }
    })();

    // ── 7. Recent 30-day vs prior 30-day comparison ──────────────────────────
    const now   = Date.now();
    const d30   = now - 30 * 86400000;
    const d60   = now - 60 * 86400000;
    const last30  = reports.filter(r => new Date(r.created_at) >= d30).length;
    const prior30 = reports.filter(r => {
      const t = new Date(r.created_at).getTime();
      return t >= d60 && t < d30;
    }).length;
    const growthPct = prior30 === 0
      ? (last30 > 0 ? 100 : 0)
      : Math.round(((last30 - prior30) / prior30) * 100);

    // ── 8. Weekly velocity (last 8 weeks) ────────────────────────────────────
    const weekly = Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date(now - (7 - i) * 7 * 86400000);
      const weekEnd   = new Date(now - (6 - i) * 7 * 86400000);
      const label = `W${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      const count = reports.filter(r => {
        const t = new Date(r.created_at);
        return t >= weekStart && t < weekEnd;
      }).length;
      return { label, count };
    });

    return res.json({
      monthly,
      hourly,
      dayOfWeek,
      topStates,
      byType,
      statusMap,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
      avgResolutionDays,
      last30,
      prior30,
      growthPct,
      weekly,
      total,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to compute analytics" });
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