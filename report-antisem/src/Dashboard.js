/**
 * Dashboard.jsx — Admin/Team dashboard (mobile-responsive, enhanced analytics)
 */

import { useState, useEffect, useCallback } from "react";

const STATUS_COLORS = {
  "Under Review": { bg: "#f59e0b", text: "#f59e0b" },
  "In Progress":  { bg: "#3b82f6", text: "#3b82f6" },
  "Resolved":     { bg: "#10b981", text: "#10b981" },
  "Dismissed":    { bg: "#6b7280", text: "#6b7280" },
};
const VALID_STATUSES = ["Under Review", "In Progress", "Resolved", "Dismissed"];
const VALID_ROLES    = ["user", "team", "admin"];

const LABEL = { display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" };
const INPUT = { width: "100%", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "10px 12px", color: "#f0eee8", fontFamily: "'Outfit',sans-serif", fontSize: 14, outline: "none" };

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

function Spinner({ size = 14 }) {
  return <span style={{ width: size, height: size, border: `2px solid rgba(255,255,255,.2)`, borderTopColor: "#e8c56d", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />;
}

function Badge({ status }) {
  const c = STATUS_COLORS[status] || { text: "#888" };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: c.text, background: `${c.text}18`, border: `1px solid ${c.text}30`, borderRadius: 100, padding: "3px 10px", whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: "22px 20px", width: "100%", maxWidth: wide ? 700 : 560, maxHeight: "92vh", overflowY: "auto", animation: "fadeUp .25s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.07)", border: "none", borderRadius: 8, width: 32, height: 32, color: "#f0eee8", cursor: "pointer", fontSize: 18, flexShrink: 0 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Mini bar chart component ──────────────────────────────────────────────────
function MiniBarChart({ data, valueKey = "count", labelKey = "label", color = "#e8c56d", height = 80, showValues = false, accent }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height, width: "100%" }}>
      {data.map((d, i) => {
        const pct = d[valueKey] / max;
        const barH = Math.max(pct * (height - 20), d[valueKey] > 0 ? 4 : 2);
        const isAccent = accent !== undefined && i === accent;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }} title={`${d[labelKey]}: ${d[valueKey]}`}>
            {showValues && d[valueKey] > 0 && (
              <span style={{ fontSize: 9, color, fontWeight: 700, lineHeight: 1 }}>{d[valueKey]}</span>
            )}
            <div style={{
              width: "100%",
              height: barH,
              background: isAccent
                ? `linear-gradient(180deg, #fff, ${color})`
                : d[valueKey] > 0
                  ? `linear-gradient(180deg, ${color}, ${color}88)`
                  : "rgba(255,255,255,.06)",
              borderRadius: "3px 3px 0 0",
              transition: "height .5s ease",
            }} />
            <span style={{ fontSize: 8, color: "rgba(255,255,255,.3)", textAlign: "center", lineHeight: 1.2, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {d[labelKey]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Donut chart (SVG) ─────────────────────────────────────────────────────────
function DonutChart({ data, size = 120 }) {
  const COLORS = ["#e8c56d", "#3b82f6", "#10b981", "#a78bfa", "#f59e0b", "#ef4444", "#6b7280"];
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.2)", fontSize: 12 }}>No data</div>;

  let cumAngle = -90;
  const r = 42, cx = size / 2, cy = size / 2, stroke = 12;

  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;
    const toRad = (a) => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const large = angle > 180 ? 1 : 0;
    return { path: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, color: COLORS[i % COLORS.length], label: d.label, value: d.value };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={stroke} />
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill="none" stroke={s.color} strokeWidth={stroke} strokeLinecap="butt">
          <title>{s.label}: {s.value}</title>
        </path>
      ))}
      <text x={cx} y={cy - 5} textAnchor="middle" fill="#f0eee8" fontSize={16} fontWeight={700} fontFamily="'DM Serif Display',serif">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(255,255,255,.4)" fontSize={8}>TOTAL</text>
    </svg>
  );
}

// ── Stat delta pill ───────────────────────────────────────────────────────────
function DeltaPill({ value }) {
  if (value === undefined || value === null) return null;
  const up = value >= 0;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: up ? "#10b981" : "#ef4444", background: up ? "rgba(16,185,129,.1)" : "rgba(239,68,68,.1)", border: `1px solid ${up ? "rgba(16,185,129,.25)" : "rgba(239,68,68,.25)"}`, borderRadius: 100, padding: "2px 8px", whiteSpace: "nowrap" }}>
      {up ? "▲" : "▼"} {Math.abs(value)}%
    </span>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HBar({ label, value, max, color = "#e8c56d" }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>{value}</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,.06)", borderRadius: 3 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 3, transition: "width .6s ease" }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard({ user, API_BASE, onBack, onLogout }) {
  const isAdmin = user?.role === "admin";
  const width   = useWindowWidth();
  const mobile  = width < 768;
  const tablet  = width >= 768 && width < 1024;
  const compact = mobile || tablet;

  const [tab,           setTab]           = useState("reports");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);

  // Data
  const [reports,    setReports]    = useState([]);
  const [users,      setUsers]      = useState([]);
  const [contacts,   setContacts]   = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [analytics,  setAnalytics]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Editing
  const [editReport,   setEditReport]   = useState(null);
  const [editUser,     setEditUser]     = useState(null);
  const [viewReport,   setViewReport]   = useState(null);
  const [viewSubs,     setViewSubs]     = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState(null);

  // Filters
  const [reportFilter, setReportFilter] = useState("all");
  const [reportSearch, setReportSearch] = useState("");
  const [userSearch,   setUserSearch]   = useState("");

  // Submissions
  const [submissions,    setSubmissions]    = useState([]);
  const [submitModal,    setSubmitModal]    = useState(null);
  const [subForm,        setSubForm]        = useState({ markdown: "", imageLinks: [""] });
  const [subSaving,      setSubSaving]      = useState(false);
  const [reviewModal,    setReviewModal]    = useState(null);
  const [reviewDecision, setReviewDecision] = useState("approved");
  const [reviewNote,     setReviewNote]     = useState("");

  const [expandedReport, setExpandedReport] = useState(null);
  const [analyticsView,  setAnalyticsView]  = useState("trend"); // "trend"|"types"|"geo"|"time"

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const apiFetch = useCallback(async (path, opts = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    if (!res.ok) throw new Error((await res.json()).error || "Request failed");
    return res.json();
  }, [API_BASE]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await apiFetch("/api/stats/analytics");
      setAnalytics(data);
    } catch (e) {
      // analytics endpoint optional — fail silently
    } finally {
      setAnalyticsLoading(false);
    }
  }, [apiFetch]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s, subs] = await Promise.all([
        apiFetch("/api/admin/reports"),
        apiFetch("/api/admin/stats"),
        apiFetch("/api/admin/submissions"),
      ]);
      setReports(r);
      setSummary(s);
      setSubmissions(subs);
      if (isAdmin) {
        const [u, c] = await Promise.all([
          apiFetch("/api/admin/users"),
          apiFetch("/api/admin/contact"),
        ]);
        setUsers(u);
        setContacts(c);
      }
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, isAdmin]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Load analytics when overview tab is opened
  useEffect(() => {
    if (tab === "overview" && !analytics) {
      loadAnalytics();
    }
  }, [tab, analytics, loadAnalytics]);

  const changeTab = (id) => { setTab(id); setSidebarOpen(false); };

  // ── Report actions ──────────────────────────────────────────────────────────
  const saveReport = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/reports/${editReport.id}`, {
        method: "PATCH",
        body: JSON.stringify(editReport),
      });
      showToast("Report updated");
      setEditReport(null);
      loadAll();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const openView = async (r) => {
    setViewReport(r);
    setViewSubs([]);
    try {
      const subs = await apiFetch(`/api/admin/submissions/report/${r.id}`);
      setViewSubs(Array.isArray(subs) ? subs.filter(s => s.status === "approved") : []);
    } catch { }
  };

  const changeStatus = async (id, status) => {
    try {
      await apiFetch(`/api/admin/reports/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      showToast(`Status → ${status}`);
      loadAll();
    } catch (e) { showToast(e.message, "error"); }
  };

  // ── User actions ────────────────────────────────────────────────────────────
  const saveUser = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(editUser),
      });
      showToast("User updated");
      setEditUser(null);
      loadAll();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const path =
        deleteTarget.kind === "report"  ? `/api/admin/reports/${deleteTarget.id}`  :
        deleteTarget.kind === "user"    ? `/api/admin/users/${deleteTarget.id}`    :
        `/api/admin/contact/${deleteTarget.id}`;
      await apiFetch(path, { method: "DELETE" });
      showToast(`${deleteTarget.kind === "report" ? "Report" : deleteTarget.kind === "user" ? "User" : "Message"} deleted`);
      setDeleteTarget(null);
      loadAll();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  // ── Submission actions ──────────────────────────────────────────────────────
  const submitForReview = async () => {
    if (!submitModal || !subForm.markdown.trim()) return;
    setSubSaving(true);
    try {
      const imageLinks = subForm.imageLinks.filter(l => l.trim());
      await apiFetch("/api/admin/submissions", {
        method: "POST",
        body: JSON.stringify({ reportId: submitModal.id, markdown: subForm.markdown, imageLinks }),
      });
      showToast("Submission sent for admin review");
      setSubmitModal(null);
      setSubForm({ markdown: "", imageLinks: [""] });
      loadAll();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSubSaving(false); }
  };

  const handleReview = async () => {
    if (!reviewModal) return;
    setSubSaving(true);
    try {
      await apiFetch(`/api/admin/submissions/${reviewModal.id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ decision: reviewDecision, adminNote: reviewNote }),
      });
      showToast(reviewDecision === "approved" ? "✓ Approved — report marked Resolved" : "Submission denied");
      setReviewModal(null);
      setReviewNote("");
      setReviewDecision("approved");
      loadAll();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSubSaving(false); }
  };

  const pendingCount = submissions.filter(s => s.status === "pending").length;

  const filteredReports = reports.filter(r => {
    const matchStatus = reportFilter === "all" || r.status === reportFilter;
    const q = reportSearch.toLowerCase();
    const matchSearch = !q || r.type?.toLowerCase().includes(q) || r.location?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
  });

  const tabs = [
    { id: "overview",    icon: "📊", label: "Overview" },
    { id: "reports",     icon: "📋", label: "Reports",     count: reports.length },
    { id: "submissions", icon: "📨", label: "Submissions", count: pendingCount > 0 ? pendingCount : submissions.length, urgent: pendingCount > 0 },
    ...(isAdmin ? [
      { id: "users",    icon: "👥", label: "Users",    count: users.length },
      { id: "messages", icon: "✉️", label: "Messages", count: contacts.length },
    ] : []),
  ];

  // ── Mobile report card ──────────────────────────────────────────────────────
  const ReportCard = ({ r }) => {
    const isExpanded = expandedReport === r.id;
    return (
      <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ padding: "14px 16px", cursor: "pointer" }} onClick={() => setExpandedReport(isExpanded ? null : r.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.type}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {r.location && <span>📍 {r.location}</span>}
                <span>🕐 {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <Badge status={r.status} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)", transition: "transform .2s", transform: isExpanded ? "rotate(180deg)" : "none" }}>▼</span>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", padding: "14px 16px", background: "rgba(255,255,255,.02)" }}>
            {r.description && <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.6, marginBottom: 14 }}>{r.description}</div>}
            {isAdmin && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Status</div>
                <select value={r.status} onChange={e => changeStatus(r.id, e.target.value)} style={{ ...INPUT, padding: "8px 10px", fontSize: 13 }}>
                  {VALID_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="db-btn" style={{ fontSize: 12, padding: "7px 14px", flex: 1 }} onClick={() => openView(r)}>👁 View</button>
              <button className="db-btn" style={{ fontSize: 12, padding: "7px 14px", flex: 1 }} onClick={() => setEditReport({ ...r })}>✏️ Edit</button>
              {!isAdmin && (
                <button className="db-btn" style={{ fontSize: 12, padding: "7px 14px", flex: 1, background: "rgba(232,197,109,.08)", border: "1px solid rgba(232,197,109,.25)", color: "#e8c56d" }}
                  onClick={() => { setSubmitModal(r); setSubForm({ markdown: "", imageLinks: [""] }); }}>📨 Submit</button>
              )}
              {isAdmin && (
                <button className="db-btn red" style={{ fontSize: 12, padding: "7px 14px" }}
                  onClick={() => setDeleteTarget({ kind: "report", id: r.id, label: r.type })}>🗑 Delete</button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const UserCard = ({ u }) => (
    <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#e8c56d,#c9972a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#0a0a0f", flexShrink: 0 }}>
          {u.name?.charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100, flexShrink: 0,
          background: u.role === "admin" ? "rgba(232,197,109,.15)" : u.role === "team" ? "rgba(59,130,246,.15)" : "rgba(255,255,255,.07)",
          color: u.role === "admin" ? "#e8c56d" : u.role === "team" ? "#60a5fa" : "rgba(255,255,255,.5)",
          border: `1px solid ${u.role === "admin" ? "rgba(232,197,109,.3)" : u.role === "team" ? "rgba(59,130,246,.3)" : "rgba(255,255,255,.1)"}` }}>
          {u.role}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="db-btn" style={{ fontSize: 12, padding: "7px 14px", flex: 1 }} onClick={() => setEditUser({ ...u })}>✏️ Edit</button>
        <button className="db-btn red" style={{ fontSize: 12, padding: "7px 14px" }}
          onClick={() => setDeleteTarget({ kind: "user", id: u.id, label: u.name })}>🗑</button>
      </div>
    </div>
  );

  // ── OVERVIEW SECTION ────────────────────────────────────────────────────────
  const renderOverview = () => {
    if (!summary) return null;

    const ANALYTICS_TABS = [
      { id: "trend",  label: "📈 Trend"    },
      { id: "types",  label: "🏷 Types"   },
      { id: "geo",    label: "🗺 Geography" },
      { id: "time",   label: "🕐 Time"    },
    ];

    const a = analytics;

    return (
      <div style={{ animation: "fadeUp .4s ease both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: mobile ? 24 : 28, marginBottom: 2 }}>Overview</h1>
            <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13 }}>
              Welcome back, {user.name?.split(" ")[0]}.
              {a && <> <span style={{ color: "rgba(255,255,255,.25)" }}>·</span> {a.total} total incidents tracked</>}
            </p>
          </div>
          <button className="db-btn" style={{ fontSize: 12, padding: "7px 14px" }} onClick={() => { loadAnalytics(); loadAll(); }}>
            ↻ Refresh
          </button>
        </div>

        {/* ── KPI row ── */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: mobile ? 10 : 12, marginBottom: 20 }}>
          {[
            { label: "Total Reports",   value: summary.totals.reports,     icon: "📋", color: "#e8c56d", delta: a?.growthPct },
            { label: "Users",           value: summary.totals.users,        icon: "👥", color: "#3b82f6"  },
            { label: "Messages",        value: summary.totals.contacts,     icon: "✉️", color: "#a78bfa"  },
            { label: "Pending Review",  value: summary.totals.pendingSubs,  icon: "📨", color: summary.totals.pendingSubs > 0 ? "#ef4444" : "#6b7280" },
            { label: "Resolution Rate", value: a ? `${a.resolutionRate}%` : "—", icon: "✅", color: "#10b981" },
          ].map((c, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${c.color}20`, borderRadius: 12, padding: mobile ? "14px 12px" : "18px 16px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, background: `radial-gradient(circle at 100% 0%, ${c.color}18, transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ fontSize: 20, marginBottom: 6 }}>{c.icon}</div>
              <div style={{ fontSize: mobile ? 22 : 26, fontWeight: 800, color: c.color, fontFamily: "'DM Serif Display',serif", letterSpacing: -1 }}>{c.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.3, marginBottom: c.delta !== undefined ? 6 : 0 }}>{c.label}</div>
              {c.delta !== undefined && <DeltaPill value={c.delta} />}
            </div>
          ))}
        </div>

        {/* ── Last 30 days vs prior ── */}
        {a && (
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: mobile ? 10 : 12, marginBottom: 20 }}>
            {[
              { label: "Last 30 Days",     value: a.last30,    icon: "📅", color: "#e8c56d" },
              { label: "Prior 30 Days",    value: a.prior30,   icon: "📆", color: "rgba(255,255,255,.5)" },
              { label: "Avg Resolution",   value: a.avgResolutionDays != null ? `${a.avgResolutionDays}d` : "—", icon: "⏱", color: "#3b82f6" },
              { label: "States Reached",   value: a.topStates?.length || "—", icon: "🗺️", color: "#a78bfa" },
            ].map((c, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c.color}12`, border: `1px solid ${c.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{c.icon}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: c.color, fontFamily: "'DM Serif Display',serif" }}>{c.value}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Analytics panels ── */}
        <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
          {/* Tab switcher */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,.07)", padding: "0 4px", gap: 2, overflowX: "auto" }}>
            {ANALYTICS_TABS.map(t => (
              <button key={t.id} onClick={() => setAnalyticsView(t.id)}
                style={{ background: "none", border: "none", borderBottom: analyticsView === t.id ? "2px solid #e8c56d" : "2px solid transparent", color: analyticsView === t.id ? "#e8c56d" : "rgba(255,255,255,.45)", padding: "12px 14px", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", transition: "all .2s" }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: mobile ? 16 : 22 }}>
            {analyticsLoading && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, gap: 10, color: "rgba(255,255,255,.3)", fontSize: 13 }}>
                <Spinner /> Loading analytics…
              </div>
            )}

            {!analyticsLoading && !a && (
              <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,.25)", fontSize: 13 }}>
                Analytics data unavailable — make sure <code style={{ background: "rgba(255,255,255,.07)", borderRadius: 4, padding: "2px 6px", fontSize: 12 }}>/api/stats/analytics</code> is deployed.
              </div>
            )}

            {!analyticsLoading && a && (
              <>
                {/* TREND */}
                {analyticsView === "trend" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Monthly Volume</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>Incident submissions over the past 12 months</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>Peak: <strong style={{ color: "#e8c56d" }}>{Math.max(...a.monthly.map(m => m.count))}</strong></span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,.25)" }}>·</span>
                        <DeltaPill value={a.growthPct} />
                      </div>
                    </div>
                    <MiniBarChart data={a.monthly} height={mobile ? 90 : 110} showValues color="#e8c56d" />

                    <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,.07)" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Weekly Velocity</div>
                      <MiniBarChart data={a.weekly} height={mobile ? 70 : 80} color="#3b82f6" />
                    </div>
                  </div>
                )}

                {/* TYPES */}
                {analyticsView === "types" && (
                  <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Incident Types</div>
                      {a.byType.map((t, i) => (
                        <HBar key={i} label={t.type} value={t.count} max={a.byType[0]?.count || 1}
                          color={["#e8c56d","#3b82f6","#10b981","#a78bfa","#f59e0b","#ef4444"][i % 6]} />
                      ))}
                      {a.byType.length === 0 && <p style={{ fontSize: 13, color: "rgba(255,255,255,.3)" }}>No data yet.</p>}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Status Breakdown</div>
                      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                        <DonutChart
                          data={Object.entries(summary.byStatus).map(([label, value]) => ({ label, value }))}
                          size={mobile ? 110 : 130}
                        />
                        <div style={{ flex: 1, minWidth: 100 }}>
                          {Object.entries(summary.byStatus).map(([s, n], i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLORS[s]?.text || "#888", flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)", flex: 1 }}>{s}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLORS[s]?.text || "#888" }}>{n}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.07)" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Resolution Funnel</div>
                        {[
                          { label: "Submitted",    value: summary.totals.reports, color: "#e8c56d"  },
                          { label: "In Progress",  value: summary.byStatus?.["In Progress"] || 0, color: "#3b82f6" },
                          { label: "Resolved",     value: summary.byStatus?.["Resolved"] || 0,    color: "#10b981" },
                        ].map((f, i) => (
                          <HBar key={i} label={f.label} value={f.value} max={summary.totals.reports} color={f.color} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* GEO */}
                {analyticsView === "geo" && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Top States by Incident Count</div>
                    {a.topStates.length === 0 && (
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,.3)" }}>No location data yet. Reports need "City, State" format.</p>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 10 : 20 }}>
                      <div>
                        {a.topStates.map((s, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(232,197,109,.1)", border: "1px solid rgba(232,197,109,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#e8c56d", flexShrink: 0 }}>{i + 1}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.state}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#e8c56d", flexShrink: 0, marginLeft: 8 }}>{s.count}</span>
                              </div>
                              <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2 }}>
                                <div style={{ height: "100%", width: `${(s.count / (a.topStates[0]?.count || 1)) * 100}%`, background: `linear-gradient(90deg, #e8c56d, #c9972a)`, borderRadius: 2 }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 12 }}>Distribution</div>
                        <MiniBarChart
                          data={a.topStates.map(s => ({ label: s.state.slice(0, 4), count: s.count }))}
                          height={100}
                          color="#e8c56d"
                          showValues
                        />
                        <div style={{ marginTop: 16, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10, padding: "12px 14px" }}>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Coverage</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa", fontFamily: "'DM Serif Display',serif" }}>{a.topStates.length}</div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>states with reported incidents</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TIME */}
                {analyticsView === "time" && (
                  <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Hour of Day</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 16 }}>When incidents are most reported (local time)</div>
                      <MiniBarChart
                        data={a.hourly.map(h => ({ label: h.hour % 6 === 0 ? `${h.hour}h` : "", count: h.count }))}
                        height={90}
                        color="#a78bfa"
                        accent={a.hourly.reduce((max, h, i, arr) => h.count > arr[max].count ? i : max, 0)}
                      />
                      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {(() => {
                          const peakHour = a.hourly.reduce((max, h, i, arr) => h.count > arr[max].count ? i : max, 0);
                          const periods = [
                            { label: "Morning (6–12)", hours: [6,7,8,9,10,11] },
                            { label: "Afternoon (12–18)", hours: [12,13,14,15,16,17] },
                            { label: "Evening (18–24)", hours: [18,19,20,21,22,23] },
                            { label: "Night (0–6)", hours: [0,1,2,3,4,5] },
                          ];
                          return periods.map((p, i) => {
                            const count = p.hours.reduce((s, h) => s + (a.hourly[h]?.count || 0), 0);
                            return (
                              <div key={i} style={{ flex: 1, minWidth: 80, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa" }}>{count}</div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", lineHeight: 1.3 }}>{p.label}</div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Day of Week</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 16 }}>Volume by weekday</div>
                      <MiniBarChart
                        data={a.dayOfWeek}
                        height={90}
                        color="#f59e0b"
                        showValues
                        accent={a.dayOfWeek.reduce((max, d, i, arr) => d.count > arr[max].count ? i : max, 0)}
                      />
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 10 }}>Busiest vs quietest</div>
                        {(() => {
                          const sorted = [...a.dayOfWeek].sort((a, b) => b.count - a.count);
                          return (
                            <div style={{ display: "flex", gap: 10 }}>
                              <div style={{ flex: 1, background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 8, padding: "10px 12px" }}>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 4 }}>BUSIEST</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: "#f59e0b" }}>{sorted[0]?.label}</div>
                                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{sorted[0]?.count} reports</div>
                              </div>
                              <div style={{ flex: 1, background: "rgba(107,114,128,.06)", border: "1px solid rgba(107,114,128,.2)", borderRadius: 8, padding: "10px 12px" }}>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 4 }}>QUIETEST</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: "#6b7280" }}>{sorted[sorted.length - 1]?.label}</div>
                                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{sorted[sorted.length - 1]?.count} reports</div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Status bars + type breakdown (always visible, no analytics needed) ── */}
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 14 : 20, marginBottom: 20 }}>
          <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: "rgba(255,255,255,.7)" }}>Status Breakdown</h3>
            {Object.entries(summary.byStatus).map(([s, n]) => {
              const pct = summary.totals.reports > 0 ? Math.round((n / summary.totals.reports) * 100) : 0;
              const col = STATUS_COLORS[s]?.text || "#888";
              return (
                <div key={s} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: col }}>{s}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{n} <span style={{ color: "rgba(255,255,255,.35)", fontWeight: 400 }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height: 5, background: "rgba(255,255,255,.07)", borderRadius: 3 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 3, transition: "width .6s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "rgba(255,255,255,.7)" }}>Incident Types</h3>
            {Object.entries(summary.byType).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t, n]) => (
              <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{t}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e8c56d", flexShrink: 0 }}>{n}</span>
              </div>
            ))}
            {Object.keys(summary.byType).length === 0 && <p style={{ fontSize: 13, color: "rgba(255,255,255,.3)" }}>No reports yet.</p>}
          </div>
        </div>

        {/* ── 7-day bar ── */}
        <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px" }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 18, color: "rgba(255,255,255,.7)" }}>Reports — Last 7 Days</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: mobile ? 6 : 10, height: 70 }}>
            {summary.daily.map((d, i) => {
              const max = Math.max(...summary.daily.map(x => x.count), 1);
              const h = Math.max((d.count / max) * 60, d.count > 0 ? 8 : 3);
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 10, color: "#e8c56d", fontWeight: 700 }}>{d.count || ""}</span>
                  <div style={{ width: "100%", height: h, background: d.count > 0 ? "linear-gradient(180deg,#e8c56d,#c9972a)" : "rgba(255,255,255,.08)", borderRadius: "3px 3px 0 0", transition: "height .4s ease" }} />
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,.3)", textAlign: "center" }}>{d.label.split(",")[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#f0eee8", fontFamily: "'Outfit',sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-100%)}to{opacity:1;transform:translateX(0)}}
        .db-btn{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#f0eee8;border-radius:8px;padding:7px 14px;font-family:'Outfit',sans-serif;font-size:13px;cursor:pointer;transition:all .2s}
        .db-btn:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2)}
        .db-btn:active{transform:scale(.97)}
        .db-btn.gold{background:linear-gradient(135deg,#e8c56d,#c9972a);border:none;color:#0a0a0f;font-weight:700}
        .db-btn.gold:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(232,197,109,.3)}
        .db-btn.red{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.25);color:#ef4444}
        .db-btn.red:hover{background:rgba(239,68,68,.16)}
        .db-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
        .row-hover:hover{background:rgba(255,255,255,.04)!important}
        .tab-active{background:rgba(232,197,109,.1)!important;border-color:rgba(232,197,109,.3)!important;color:#e8c56d!important}
        input.db-input,select.db-input,textarea.db-input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:10px 12px;color:#f0eee8;font-family:'Outfit',sans-serif;font-size:14px;outline:none;transition:border-color .2s}
        input.db-input:focus,select.db-input:focus,textarea.db-input:focus{border-color:rgba(232,197,109,.5)}
        select.db-input option{background:#1a1a24}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#e8c56d22;border-radius:2px}
        .mobile-sidebar-overlay{position:fixed;inset:0;z-index:150;background:rgba(0,0,0,.6);backdrop-filter:blur(4px)}
        .mobile-sidebar{position:fixed;left:0;top:0;bottom:0;width:240px;z-index:151;background:#111118;border-right:1px solid rgba(255,255,255,.1);padding:20px 12px;overflow-y:auto;animation:slideIn .25s ease}
      `}</style>

      {/* ── Top bar ── */}
      <header style={{ height: 56, background: "rgba(10,10,15,.97)", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {compact && (
            <button onClick={() => setSidebarOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, padding: 4, marginRight: 4 }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ display: "block", width: 20, height: 2, background: "#f0eee8", borderRadius: 2, transition: "all .25s",
                  transform: sidebarOpen && i===0 ? "rotate(45deg) translate(4px,4px)" : sidebarOpen && i===2 ? "rotate(-45deg) translate(4px,-4px)" : "none",
                  opacity: sidebarOpen && i===1 ? 0 : 1 }} />
              ))}
            </button>
          )}
          {!compact && (
            <button onClick={onBack} className="db-btn" style={{ padding: "5px 10px", fontSize: 12 }}>← Site</button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 26, height: 26, background: "linear-gradient(135deg,#e8c56d,#c9972a)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✡</div>
            <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 15 }}>ReportASA</span>
            {!mobile && <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)", borderLeft: "1px solid rgba(255,255,255,.12)", paddingLeft: 9, marginLeft: 1 }}>Dashboard</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!mobile && (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)" }}>
              <span style={{ color: "#e8c56d", fontWeight: 600 }}>{user.name?.split(" ")[0]}</span>
              <span style={{ marginLeft: 6, fontSize: 11, background: isAdmin ? "rgba(232,197,109,.15)" : "rgba(59,130,246,.15)", border: `1px solid ${isAdmin ? "rgba(232,197,109,.3)" : "rgba(59,130,246,.3)"}`, borderRadius: 100, padding: "2px 8px", color: isAdmin ? "#e8c56d" : "#60a5fa" }}>
                {user.role}
              </span>
            </div>
          )}
          <button className="db-btn red" style={{ padding: "5px 10px", fontSize: 12 }} onClick={onLogout}>
            {mobile ? "↩" : "Sign Out"}
          </button>
        </div>
      </header>

      {/* ── Mobile sidebar ── */}
      {compact && sidebarOpen && (
        <>
          <div className="mobile-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
          <div className="mobile-sidebar">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#e8c56d,#c9972a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#0a0a0f" }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</div>
                <div style={{ fontSize: 11, color: "#e8c56d" }}>{user.role}</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, paddingLeft: 8 }}>Navigation</div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => changeTab(t.id)}
                  className={`db-btn${tab === t.id ? " tab-active" : ""}`}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 12px", border: "1px solid transparent", textAlign: "left", justifyContent: "flex-start" }}>
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{t.label}</span>
                  {t.count !== undefined && (
                    <span style={{ fontSize: 11, background: t.urgent ? "rgba(239,68,68,.2)" : "rgba(255,255,255,.08)", border: t.urgent ? "1px solid rgba(239,68,68,.4)" : "none", borderRadius: 100, padding: "1px 7px", color: t.urgent ? "#ef4444" : "rgba(255,255,255,.5)", fontWeight: t.urgent ? 700 : 400 }}>{t.count}</span>
                  )}
                </button>
              ))}
            </nav>
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.08)" }}>
              <button className="db-btn" style={{ width: "100%", fontSize: 12, textAlign: "center" }} onClick={onBack}>← Back to Site</button>
            </div>
          </div>
        </>
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Desktop sidebar ── */}
        {!compact && (
          <aside style={{ width: 200, background: "rgba(255,255,255,.02)", borderRight: "1px solid rgba(255,255,255,.07)", padding: "20px 12px", flexShrink: 0, overflowY: "auto" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, paddingLeft: 8 }}>Navigation</div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`db-btn${tab === t.id ? " tab-active" : ""}`}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", border: "1px solid transparent", textAlign: "left", justifyContent: "flex-start" }}>
                  <span style={{ fontSize: 15 }}>{t.icon}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{t.label}</span>
                  {t.count !== undefined && (
                    <span style={{ fontSize: 11, background: t.urgent ? "rgba(239,68,68,.2)" : "rgba(255,255,255,.08)", border: t.urgent ? "1px solid rgba(239,68,68,.4)" : "none", borderRadius: 100, padding: "1px 7px", color: t.urgent ? "#ef4444" : "rgba(255,255,255,.5)", fontWeight: t.urgent ? 700 : 400 }}>{t.count}</span>
                  )}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* ── Main content ── */}
        <main style={{ flex: 1, overflowY: "auto", padding: mobile ? "16px" : "24px", paddingBottom: mobile ? "80px" : "24px" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 12, color: "rgba(255,255,255,.4)" }}>
              <Spinner size={20} /> Loading dashboard data…
            </div>
          ) : (
            <>
              {tab === "overview" && renderOverview()}

              {/* ── REPORTS ── */}
              {tab === "reports" && (
                <div style={{ animation: "fadeUp .4s ease both" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: mobile ? 22 : 28, marginBottom: 2 }}>Reports</h1>
                      <p style={{ color: "rgba(255,255,255,.4)", fontSize: 12 }}>{filteredReports.length} of {reports.length}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: mobile ? "100%" : "auto" }}>
                      <input className="db-input" placeholder="Search…" value={reportSearch} onChange={e => setReportSearch(e.target.value)} style={{ flex: mobile ? 1 : "none", width: mobile ? "auto" : 200, fontSize: 13 }} />
                      <select className="db-input" value={reportFilter} onChange={e => setReportFilter(e.target.value)} style={{ flex: mobile ? 1 : "none", width: mobile ? "auto" : 145, fontSize: 13 }}>
                        <option value="all">All Statuses</option>
                        {VALID_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  {filteredReports.length === 0 && (
                    <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 14 }}>No reports match your filters.</div>
                  )}
                  {mobile ? (
                    filteredReports.map(r => <ReportCard key={r.id} r={r} />)
                  ) : (
                    <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, overflow: "hidden" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.1fr 1fr auto", gap: 12, padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.03)" }}>
                        {["Type", "Location", "Date", "Status", "Actions"].map(h => (
                          <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                        ))}
                      </div>
                      {filteredReports.map((r, i) => (
                        <div key={r.id} className="row-hover" style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.1fr 1fr auto", gap: 12, padding: "12px 18px", borderBottom: i < filteredReports.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none", alignItems: "center", transition: "background .15s" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.type}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description?.slice(0, 55)}…</div>
                          </div>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.location || "—"}</div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</div>
                          <div>
                            {isAdmin ? (
                              <select value={r.status} onChange={e => changeStatus(r.id, e.target.value)} style={{ ...INPUT, padding: "5px 8px", fontSize: 12, width: "auto", cursor: "pointer" }}>
                                {VALID_STATUSES.map(s => <option key={s}>{s}</option>)}
                              </select>
                            ) : (<Badge status={r.status} />)}
                          </div>
                          <div style={{ display: "flex", gap: 5 }}>
                            <button className="db-btn" style={{ padding: "5px 9px", fontSize: 12 }} onClick={() => openView(r)} title="View">👁</button>
                            <button className="db-btn" style={{ padding: "5px 9px", fontSize: 12 }} onClick={() => setEditReport({ ...r })} title="Edit">✏️</button>
                            {!isAdmin && (
                              <button className="db-btn" style={{ padding: "5px 9px", fontSize: 12, background: "rgba(232,197,109,.08)", border: "1px solid rgba(232,197,109,.25)", color: "#e8c56d" }}
                                onClick={() => { setSubmitModal(r); setSubForm({ markdown: "", imageLinks: [""] }); }} title="Submit for Review">📨</button>
                            )}
                            {isAdmin && (
                              <button className="db-btn red" style={{ padding: "5px 9px", fontSize: 12 }} onClick={() => setDeleteTarget({ kind: "report", id: r.id, label: r.type })} title="Delete">🗑</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── USERS ── */}
              {tab === "users" && isAdmin && (
                <div style={{ animation: "fadeUp .4s ease both" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: mobile ? 22 : 28, marginBottom: 2 }}>Users</h1>
                      <p style={{ color: "rgba(255,255,255,.4)", fontSize: 12 }}>{filteredUsers.length} of {users.length}</p>
                    </div>
                    <input className="db-input" placeholder="Search name, email, role…" value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ width: mobile ? "100%" : 220, fontSize: 13 }} />
                  </div>
                  {filteredUsers.length === 0 && <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 14 }}>No users found.</div>}
                  {mobile ? (
                    filteredUsers.map(u => <UserCard key={u.id} u={u} />)
                  ) : (
                    <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, overflow: "hidden" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1.4fr auto", gap: 12, padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.03)" }}>
                        {["Name", "Email", "Role", "Joined", "Actions"].map(h => (
                          <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                        ))}
                      </div>
                      {filteredUsers.map((u, i) => (
                        <div key={u.id} className="row-hover" style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1.4fr auto", gap: 12, padding: "12px 18px", borderBottom: i < filteredUsers.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none", alignItems: "center", transition: "background .15s" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#e8c56d,#c9972a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#0a0a0f", flexShrink: 0 }}>{u.name?.charAt(0).toUpperCase()}</div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                              {u.title && <div style={{ fontSize: 11, color: "#e8c56d" }}>{u.title}</div>}
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100, background: u.role === "admin" ? "rgba(232,197,109,.15)" : u.role === "team" ? "rgba(59,130,246,.15)" : "rgba(255,255,255,.07)", color: u.role === "admin" ? "#e8c56d" : u.role === "team" ? "#60a5fa" : "rgba(255,255,255,.5)", border: `1px solid ${u.role === "admin" ? "rgba(232,197,109,.3)" : u.role === "team" ? "rgba(59,130,246,.3)" : "rgba(255,255,255,.1)"}` }}>{u.role}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</div>
                          <div style={{ display: "flex", gap: 5 }}>
                            <button className="db-btn" style={{ padding: "5px 9px", fontSize: 12 }} onClick={() => setEditUser({ ...u })}>✏️</button>
                            <button className="db-btn red" style={{ padding: "5px 9px", fontSize: 12 }} onClick={() => setDeleteTarget({ kind: "user", id: u.id, label: u.name })}>🗑</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── MESSAGES ── */}
              {tab === "messages" && isAdmin && (
                <div style={{ animation: "fadeUp .4s ease both" }}>
                  <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: mobile ? 22 : 28, marginBottom: 4 }}>Contact Messages</h1>
                  <p style={{ color: "rgba(255,255,255,.4)", fontSize: 12, marginBottom: 20 }}>{contacts.length} message{contacts.length !== 1 ? "s" : ""}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {contacts.length === 0 && <p style={{ color: "rgba(255,255,255,.3)", fontSize: 14 }}>No messages yet.</p>}
                    {contacts.map((c, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "16px 18px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name || "Anonymous"}</span>
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginLeft: 8 }}>{c.email}</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            {c.subject && <span style={{ fontSize: 11, background: "rgba(232,197,109,.1)", border: "1px solid rgba(232,197,109,.2)", borderRadius: 100, padding: "2px 10px", color: "#e8c56d" }}>{c.subject}</span>}
                            {!mobile && <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{c.created_at ? new Date(c.created_at).toLocaleString() : ""}</span>}
                            <button className="db-btn red" style={{ padding: "4px 9px", fontSize: 12 }}
                              onClick={() => setDeleteTarget({ kind: "message", id: c.id, label: `message from ${c.name || c.email}` })}>🗑</button>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.65 }}>{c.message}</p>
                        {mobile && c.created_at && <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 8 }}>{new Date(c.created_at).toLocaleString()}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SUBMISSIONS ── */}
              {tab === "submissions" && (
                <div style={{ animation: "fadeUp .4s ease both" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: mobile ? 22 : 28, marginBottom: 2 }}>
                        {isAdmin ? "Review Queue" : "My Submissions"}
                      </h1>
                      <p style={{ color: "rgba(255,255,255,.4)", fontSize: 12 }}>
                        {isAdmin ? `${pendingCount} pending · ${submissions.length} total` : `${submissions.length} submitted`}
                      </p>
                    </div>
                    {!isAdmin && (
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,.38)", maxWidth: 280, lineHeight: 1.6 }}>
                        Go to Reports → tap 📨 to submit notes for admin review.
                      </p>
                    )}
                  </div>
                  {isAdmin && pendingCount > 0 && (
                    <div style={{ background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16 }}>🔔</span>
                      <span style={{ fontSize: 13, color: "#ef4444", fontWeight: 600 }}>{pendingCount} submission{pendingCount !== 1 ? "s" : ""} awaiting review</span>
                    </div>
                  )}
                  {submissions.length === 0 && (
                    <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 13 }}>No submissions yet.</div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {submissions.map(s => {
                      const isPending  = s.status === "pending";
                      const isApproved = s.status === "approved";
                      const statusCol  = isPending ? "#f59e0b" : isApproved ? "#10b981" : "#ef4444";
                      const images     = typeof s.image_links === "string" ? JSON.parse(s.image_links || "[]") : (s.image_links || []);
                      return (
                        <div key={s.id} style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${isPending ? "rgba(245,158,11,.2)" : "rgba(255,255,255,.07)"}`, borderRadius: 14, padding: "18px 18px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                                {s.report_type || "Report"} — <span style={{ color: "rgba(255,255,255,.5)", fontWeight: 400 }}>{s.report_location || "No location"}</span>
                              </div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>
                                By <span style={{ color: "#e8c56d" }}>{s.submitter_name}</span> · {s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: statusCol, background: `${statusCol}18`, border: `1px solid ${statusCol}30`, borderRadius: 100, padding: "3px 10px", textTransform: "capitalize" }}>{s.status}</span>
                              {isAdmin && isPending && (
                                <button className="db-btn gold" style={{ padding: "5px 12px", fontSize: 12 }}
                                  onClick={() => { setReviewModal(s); setReviewDecision("approved"); setReviewNote(""); }}>Review →</button>
                              )}
                            </div>
                          </div>
                          <div style={{ background: "rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "12px 14px", marginBottom: images.length > 0 ? 12 : 0 }}>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Notes</div>
                            <pre style={{ fontSize: 12, color: "rgba(255,255,255,.7)", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, fontFamily: "monospace" }}>{s.markdown}</pre>
                          </div>
                          {images.length > 0 && (
                            <div style={{ marginBottom: s.admin_note ? 12 : 0 }}>
                              {images.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: 12, color: "#e8c56d", wordBreak: "break-all", marginBottom: 4 }}>🖼 {url}</a>
                              ))}
                            </div>
                          )}
                          {s.admin_note && (
                            <div style={{ marginTop: 10, background: isApproved ? "rgba(16,185,129,.06)" : "rgba(239,68,68,.06)", border: `1px solid ${isApproved ? "rgba(16,185,129,.2)" : "rgba(239,68,68,.2)"}`, borderRadius: 8, padding: "10px 12px" }}>
                              <div style={{ fontSize: 10, color: isApproved ? "#10b981" : "#ef4444", fontWeight: 600, marginBottom: 4 }}>Admin Note ({isApproved ? "Approved" : "Denied"})</div>
                              <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>{s.admin_note}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Mobile bottom tabs ── */}
      {mobile && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 64, background: "rgba(10,10,15,.97)", borderTop: "1px solid rgba(255,255,255,.08)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "space-around", zIndex: 90, paddingBottom: "env(safe-area-inset-bottom)" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: "6px 12px", position: "relative", flex: 1 }}>
              {t.urgent && <span style={{ position: "absolute", top: 2, right: "50%", marginRight: -18, width: 8, height: 8, background: "#ef4444", borderRadius: "50%" }} />}
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: tab === t.id ? "#e8c56d" : "rgba(255,255,255,.4)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{t.label}</span>
              {tab === t.id && <span style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 20, height: 2, background: "#e8c56d", borderRadius: 2 }} />}
            </button>
          ))}
        </nav>
      )}

      {/* ── MODALS ── */}
      {viewReport && (
        <Modal title="Report Details" onClose={() => { setViewReport(null); setViewSubs([]); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[["ID", viewReport.id],["Type", viewReport.type],["Status", null, <Badge status={viewReport.status} />],["Location", viewReport.location],["Date", viewReport.date || "—"],["Organization", viewReport.org || "—"],["Anonymous", viewReport.anonymous ? "Yes" : "No"],["Submitted", viewReport.created_at ? new Date(viewReport.created_at).toLocaleString() : "—"]].map(([label, val, node]) => (
              <div key={label}><div style={LABEL}>{label}</div><div style={{ fontSize: 13, color: "rgba(255,255,255,.75)" }}>{node || val}</div></div>
            ))}
            <div><div style={LABEL}>Description</div><div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", lineHeight: 1.6, background: "rgba(255,255,255,.03)", borderRadius: 8, padding: 11 }}>{viewReport.description}</div></div>
            {viewReport.links?.length > 0 && (
              <div><div style={LABEL}>Evidence Links</div>
                {(typeof viewReport.links === "string" ? JSON.parse(viewReport.links) : viewReport.links).map((l, i) => (
                  <a key={i} href={l} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: 13, color: "#e8c56d", wordBreak: "break-all", marginBottom: 4 }}>{l}</a>
                ))}
              </div>
            )}
            {viewSubs.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ height: 1, background: "rgba(255,255,255,.08)", marginBottom: 14 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: "#10b981", marginBottom: 12 }}>✅ {viewSubs.length} Approved Submission{viewSubs.length !== 1 ? "s" : ""}</div>
                {viewSubs.map(s => (
                  <div key={s.id} style={{ background: "rgba(16,185,129,.04)", border: "1px solid rgba(16,185,129,.18)", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 8 }}>By <span style={{ color: "#e8c56d" }}>{s.submitter_name}</span></div>
                    <pre style={{ fontSize: 12, color: "rgba(255,255,255,.72)", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, fontFamily: "monospace" }}>{s.markdown}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {editReport && (
        <Modal title="Edit Report" onClose={() => setEditReport(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={LABEL}>Type</label><input className="db-input" value={editReport.type} onChange={e => setEditReport(p => ({ ...p, type: e.target.value }))} /></div>
            <div><label style={LABEL}>Location</label><input className="db-input" value={editReport.location} onChange={e => setEditReport(p => ({ ...p, location: e.target.value }))} /></div>
            <div><label style={LABEL}>Organization</label><input className="db-input" value={editReport.org || ""} onChange={e => setEditReport(p => ({ ...p, org: e.target.value }))} /></div>
            <div><label style={LABEL}>Status</label><select className="db-input" value={editReport.status} onChange={e => setEditReport(p => ({ ...p, status: e.target.value }))}>{VALID_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label style={LABEL}>Description</label><textarea className="db-input" rows={4} value={editReport.description} onChange={e => setEditReport(p => ({ ...p, description: e.target.value }))} style={{ resize: "vertical" }} /></div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button className="db-btn" onClick={() => setEditReport(null)}>Cancel</button>
              <button className="db-btn gold" onClick={saveReport} disabled={saving}>{saving ? <Spinner /> : "Save Changes"}</button>
            </div>
          </div>
        </Modal>
      )}

      {editUser && (
        <Modal title="Edit User" onClose={() => setEditUser(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={LABEL}>Name</label><input className="db-input" value={editUser.name || ""} onChange={e => setEditUser(p => ({ ...p, name: e.target.value }))} /></div>
            <div><label style={LABEL}>Email</label><input className="db-input" type="email" value={editUser.email || ""} onChange={e => setEditUser(p => ({ ...p, email: e.target.value }))} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={LABEL}>Title</label><input className="db-input" value={editUser.title || ""} onChange={e => setEditUser(p => ({ ...p, title: e.target.value }))} /></div>
              <div><label style={LABEL}>Department</label><input className="db-input" value={editUser.department || ""} onChange={e => setEditUser(p => ({ ...p, department: e.target.value }))} /></div>
            </div>
            <div><label style={LABEL}>Role</label><select className="db-input" value={editUser.role || "user"} onChange={e => setEditUser(p => ({ ...p, role: e.target.value }))}>{VALID_ROLES.map(r => <option key={r}>{r}</option>)}</select></div>
            <div><label style={LABEL}>Bio</label><textarea className="db-input" rows={3} value={editUser.bio || ""} onChange={e => setEditUser(p => ({ ...p, bio: e.target.value }))} style={{ resize: "none" }} /></div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button className="db-btn" onClick={() => setEditUser(null)}>Cancel</button>
              <button className="db-btn gold" onClick={saveUser} disabled={saving}>{saving ? <Spinner /> : "Save Changes"}</button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title={`Delete ${deleteTarget.kind === "report" ? "Report" : deleteTarget.kind === "user" ? "User" : "Message"}`} onClose={() => setDeleteTarget(null)}>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.65)", marginBottom: 24, lineHeight: 1.6 }}>
            Permanently delete <strong style={{ color: "#f0eee8" }}>{deleteTarget.label}</strong>? This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="db-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="db-btn red" onClick={confirmDelete} disabled={saving} style={{ fontWeight: 700 }}>{saving ? <Spinner /> : "Delete Permanently"}</button>
          </div>
        </Modal>
      )}

      {submitModal && (
        <Modal title={`Submit for Review — ${submitModal.type}`} onClose={() => setSubmitModal(null)}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", marginBottom: 18, lineHeight: 1.6 }}>Write your notes in Markdown and optionally add image links. An admin will review and either approve or deny.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={LABEL}>Notes (Markdown) *</label><textarea className="db-input" rows={8} placeholder="# Summary&#10;&#10;What was found or resolved..." value={subForm.markdown} onChange={e => setSubForm(p => ({ ...p, markdown: e.target.value }))} style={{ resize: "vertical", fontFamily: "monospace", fontSize: 12 }} /></div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={LABEL}>Image Links</label>
                {subForm.imageLinks.length < 10 && <button className="db-btn" style={{ fontSize: 11, padding: "3px 9px" }} onClick={() => setSubForm(p => ({ ...p, imageLinks: [...p.imageLinks, ""] }))}>+ Add</button>}
              </div>
              {subForm.imageLinks.map((link, i) => (
                <div key={i} style={{ display: "flex", gap: 7, marginBottom: 7 }}>
                  <input className="db-input" type="url" placeholder={`https://example.com/img-${i+1}.png`} value={link} onChange={e => setSubForm(p => ({ ...p, imageLinks: p.imageLinks.map((l, x) => x === i ? e.target.value : l) }))} style={{ flex: 1 }} />
                  <button className="db-btn red" style={{ width: 34, flexShrink: 0, padding: 0, fontSize: 16 }} onClick={() => setSubForm(p => ({ ...p, imageLinks: p.imageLinks.filter((_, x) => x !== i) }))}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button className="db-btn" onClick={() => setSubmitModal(null)}>Cancel</button>
              <button className="db-btn gold" onClick={submitForReview} disabled={subSaving || !subForm.markdown.trim()}>{subSaving ? <Spinner /> : "Submit for Review →"}</button>
            </div>
          </div>
        </Modal>
      )}

      {reviewModal && (
        <Modal title="Review Submission" onClose={() => setReviewModal(null)}>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10, padding: "13px 15px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 4 }}>From <span style={{ color: "#e8c56d" }}>{reviewModal.submitter_name}</span></div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{reviewModal.report_type} — {reviewModal.report_location}</div>
            <pre style={{ fontSize: 12, color: "rgba(255,255,255,.7)", lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, fontFamily: "monospace", maxHeight: 180, overflowY: "auto" }}>{reviewModal.markdown}</pre>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL}>Decision</label>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ val: "approved", label: "✓ Approve", color: "#10b981" }, { val: "denied", label: "✕ Deny", color: "#ef4444" }].map(opt => (
                <button key={opt.val} onClick={() => setReviewDecision(opt.val)}
                  style={{ flex: 1, padding: "10px", borderRadius: 9, border: `1px solid ${reviewDecision === opt.val ? opt.color : "rgba(255,255,255,.1)"}`, background: reviewDecision === opt.val ? `${opt.color}15` : "rgba(255,255,255,.03)", color: reviewDecision === opt.val ? opt.color : "rgba(255,255,255,.5)", fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {reviewDecision === "approved" && (
              <div style={{ marginTop: 8, fontSize: 12, color: "rgba(16,185,129,.8)", background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 7, padding: "8px 11px" }}>
                ✓ Approving will mark this report as <strong>Resolved</strong>.
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Note <span style={{ color: "rgba(255,255,255,.28)", fontWeight: 400 }}>(optional)</span></label>
            <textarea className="db-input" rows={3} placeholder={reviewDecision === "approved" ? "Great work — confirmed resolved." : "Please add more evidence first."} value={reviewNote} onChange={e => setReviewNote(e.target.value)} style={{ resize: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="db-btn" onClick={() => setReviewModal(null)}>Cancel</button>
            <button onClick={handleReview} disabled={subSaving}
              style={{ background: reviewDecision === "approved" ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#ef4444,#dc2626)", border: "none", borderRadius: 9, padding: "10px 20px", color: "#fff", fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              {subSaving ? <Spinner /> : reviewDecision === "approved" ? "Approve" : "Deny"}
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: mobile ? 76 : 24, right: mobile ? 12 : 24, left: mobile ? 12 : "auto", zIndex: 1000, background: toast.type === "error" ? "rgba(239,68,68,.12)" : "rgba(16,185,129,.12)", border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,.3)" : "rgba(16,185,129,.3)"}`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: toast.type === "error" ? "#ef4444" : "#10b981", fontWeight: 500, animation: "fadeUp .25s ease", textAlign: mobile ? "center" : "left" }}>
          {toast.type === "error" ? "⚠ " : "✓ "}{toast.msg}
        </div>
      )}
    </div>
  );
}