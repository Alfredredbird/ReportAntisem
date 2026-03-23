/**
 * Dashboard.jsx
 * Admin/Team dashboard — imported and rendered by App.js
 *
 * Props:
 *   user      – current user object
 *   API_BASE  – backend URL string
 *   onBack    – callback to go back to home
 *   onLogout  – callback to log out
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

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", animation: "fadeUp .25s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.07)", border: "none", borderRadius: 8, width: 32, height: 32, color: "#f0eee8", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard({ user, API_BASE, onBack, onLogout }) {
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState("reports");

  // Data
  const [reports,  setReports]  = useState([]);
  const [users,    setUsers]    = useState([]);
  const [contacts, setContacts] = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  // Editing
  const [editReport,  setEditReport]  = useState(null);
  const [editUser,    setEditUser]    = useState(null);
  const [viewReport,  setViewReport]  = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { kind: "report"|"user", id, label }
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState(null);

  // Filters
  const [reportFilter, setReportFilter] = useState("all");
  const [reportSearch, setReportSearch] = useState("");
  const [userSearch,   setUserSearch]   = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
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

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        apiFetch("/api/admin/reports"),
        apiFetch("/api/admin/stats"),
      ]);
      setReports(r);
      setSummary(s);
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
      await apiFetch(
        deleteTarget.kind === "report"
          ? `/api/admin/reports/${deleteTarget.id}`
          : `/api/admin/users/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      showToast(`${deleteTarget.kind === "report" ? "Report" : "User"} deleted`);
      setDeleteTarget(null);
      loadAll();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  // ── Filtered data ───────────────────────────────────────────────────────────
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

  // ── Sidebar tabs ────────────────────────────────────────────────────────────
  const tabs = [
    { id: "overview", icon: "📊", label: "Overview" },
    { id: "reports",  icon: "📋", label: "Reports",  count: reports.length },
    ...(isAdmin ? [
      { id: "users",    icon: "👥", label: "Users",    count: users.length },
      { id: "messages", icon: "✉️", label: "Messages", count: contacts.length },
    ] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#f0eee8", fontFamily: "'Outfit',sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .db-btn{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#f0eee8;border-radius:8px;padding:7px 14px;font-family:'Outfit',sans-serif;font-size:13px;cursor:pointer;transition:all .2s}
        .db-btn:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2)}
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
      `}</style>

      {/* ── Top bar ── */}
      <header style={{ height: 60, background: "rgba(10,10,15,.95)", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={onBack} className="db-btn" style={{ padding: "6px 12px", fontSize: 12 }}>← Back to Site</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#e8c56d,#c9972a)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✡</div>
            <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 16 }}>ReportASA</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)", borderLeft: "1px solid rgba(255,255,255,.12)", paddingLeft: 10, marginLeft: 2 }}>Dashboard</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)" }}>
            <span style={{ color: "#e8c56d", fontWeight: 600 }}>{user.name}</span>
            <span style={{ marginLeft: 6, fontSize: 11, background: isAdmin ? "rgba(232,197,109,.15)" : "rgba(59,130,246,.15)", border: `1px solid ${isAdmin ? "rgba(232,197,109,.3)" : "rgba(59,130,246,.3)"}`, borderRadius: 100, padding: "2px 8px", color: isAdmin ? "#e8c56d" : "#60a5fa" }}>
              {user.role}
            </span>
          </div>
          <button className="db-btn red" style={{ padding: "5px 12px", fontSize: 12 }} onClick={onLogout}>Sign Out</button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: 200, background: "rgba(255,255,255,.02)", borderRight: "1px solid rgba(255,255,255,.07)", padding: "20px 12px", flexShrink: 0, overflowY: "auto" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, paddingLeft: 8 }}>Navigation</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`db-btn${tab === t.id ? " tab-active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", border: "1px solid transparent", textAlign: "left", justifyContent: "flex-start" }}
              >
                <span style={{ fontSize: 15 }}>{t.icon}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{t.label}</span>
                {t.count !== undefined && (
                  <span style={{ fontSize: 11, background: "rgba(255,255,255,.08)", borderRadius: 100, padding: "1px 7px", color: "rgba(255,255,255,.5)" }}>{t.count}</span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 12, color: "rgba(255,255,255,.4)" }}>
              <Spinner size={20} /> Loading dashboard data…
            </div>
          ) : (

            <>
              {/* ── OVERVIEW ── */}
              {tab === "overview" && summary && (
                <div style={{ animation: "fadeUp .4s ease both" }}>
                  <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, marginBottom: 6 }}>Overview</h1>
                  <p style={{ color: "rgba(255,255,255,.4)", fontSize: 14, marginBottom: 28 }}>Welcome back, {user.name}. Here's a snapshot of the platform.</p>

                  {/* Summary cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 32 }}>
                    {[
                      { label: "Total Reports", value: summary.totals.reports,  icon: "📋", color: "#e8c56d" },
                      { label: "Users",          value: summary.totals.users,    icon: "👥", color: "#3b82f6" },
                      { label: "Messages",       value: summary.totals.contacts, icon: "✉️", color: "#a78bfa" },
                      { label: "Feed Items",     value: summary.totals.feed,     icon: "📡", color: "#10b981" },
                    ].map((c, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${c.color}22`, borderRadius: 14, padding: "20px 18px" }}>
                        <div style={{ fontSize: 26, marginBottom: 8 }}>{c.icon}</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: c.color, fontFamily: "'DM Serif Display',serif", letterSpacing: -1 }}>{c.value}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Status breakdown */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
                    <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "20px 22px" }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "rgba(255,255,255,.7)" }}>Reports by Status</h3>
                      {Object.entries(summary.byStatus).map(([s, n]) => {
                        const pct = summary.totals.reports > 0 ? Math.round((n / summary.totals.reports) * 100) : 0;
                        const col = STATUS_COLORS[s]?.text || "#888";
                        return (
                          <div key={s} style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                              <span style={{ fontSize: 13, color: col }}>{s}</span>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{n} <span style={{ color: "rgba(255,255,255,.35)", fontWeight: 400 }}>({pct}%)</span></span>
                            </div>
                            <div style={{ height: 5, background: "rgba(255,255,255,.07)", borderRadius: 3 }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 3, transition: "width .6s ease" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reports by type */}
                    <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "20px 22px" }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "rgba(255,255,255,.7)" }}>Reports by Type</h3>
                      {Object.entries(summary.byType).sort((a,b) => b[1]-a[1]).slice(0,6).map(([t, n]) => (
                        <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{t}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#e8c56d", flexShrink: 0 }}>{n}</span>
                        </div>
                      ))}
                      {Object.keys(summary.byType).length === 0 && <p style={{ fontSize: 13, color: "rgba(255,255,255,.3)" }}>No reports yet.</p>}
                    </div>
                  </div>

                  {/* Daily activity */}
                  <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "20px 22px" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, color: "rgba(255,255,255,.7)" }}>Reports — Last 7 Days</h3>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 80 }}>
                      {summary.daily.map((d, i) => {
                        const max = Math.max(...summary.daily.map(x => x.count), 1);
                        const h = Math.max((d.count / max) * 72, d.count > 0 ? 8 : 3);
                        return (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 11, color: "#e8c56d", fontWeight: 700 }}>{d.count || ""}</span>
                            <div style={{ width: "100%", height: h, background: d.count > 0 ? "linear-gradient(180deg,#e8c56d,#c9972a)" : "rgba(255,255,255,.08)", borderRadius: "4px 4px 0 0", transition: "height .4s ease" }} />
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)", textAlign: "center", lineHeight: 1.2 }}>{d.label.split(",")[0]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── REPORTS ── */}
              {tab === "reports" && (
                <div style={{ animation: "fadeUp .4s ease both" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, marginBottom: 4 }}>Reports</h1>
                      <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13 }}>{filteredReports.length} of {reports.length} reports</p>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <input className="db-input" placeholder="Search type, location…" value={reportSearch} onChange={e => setReportSearch(e.target.value)} style={{ width: 220 }} />
                      <select className="db-input" value={reportFilter} onChange={e => setReportFilter(e.target.value)} style={{ width: 150 }}>
                        <option value="all">All Statuses</option>
                        {VALID_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, overflow: "hidden" }}>
                    {/* Table header */}
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.2fr 1fr auto", gap: 12, padding: "11px 18px", borderBottom: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.03)" }}>
                      {["Type", "Location", "Date", "Status", "Actions"].map(h => (
                        <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                      ))}
                    </div>

                    {filteredReports.length === 0 && (
                      <div style={{ padding: "40px 18px", textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 14 }}>No reports match your filters.</div>
                    )}

                    {filteredReports.map((r, i) => (
                      <div key={r.id} className="row-hover" style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.2fr 1fr auto", gap: 12, padding: "13px 18px", borderBottom: i < filteredReports.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none", alignItems: "center", transition: "background .15s" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.type}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description?.slice(0, 60)}…</div>
                        </div>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.location || "—"}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</div>
                        <div>
                          <select
                            value={r.status}
                            onChange={e => changeStatus(r.id, e.target.value)}
                            style={{ ...INPUT, padding: "5px 8px", fontSize: 12, width: "auto", cursor: "pointer" }}
                          >
                            {VALID_STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="db-btn" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setViewReport(r)} title="View">👁</button>
                          <button className="db-btn" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setEditReport({ ...r })} title="Edit">✏️</button>
                          <button className="db-btn red" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setDeleteTarget({ kind: "report", id: r.id, label: r.type })} title="Delete">🗑</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── USERS (admin only) ── */}
              {tab === "users" && isAdmin && (
                <div style={{ animation: "fadeUp .4s ease both" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, marginBottom: 4 }}>Users</h1>
                      <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13 }}>{filteredUsers.length} of {users.length} users</p>
                    </div>
                    <input className="db-input" placeholder="Search name, email, role…" value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ width: 240 }} />
                  </div>

                  <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1.5fr auto", gap: 12, padding: "11px 18px", borderBottom: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.03)" }}>
                      {["Name", "Email", "Role", "Joined", "Actions"].map(h => (
                        <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                      ))}
                    </div>

                    {filteredUsers.length === 0 && (
                      <div style={{ padding: "40px 18px", textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 14 }}>No users found.</div>
                    )}

                    {filteredUsers.map((u, i) => (
                      <div key={u.id} className="row-hover" style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1.5fr auto", gap: 12, padding: "13px 18px", borderBottom: i < filteredUsers.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none", alignItems: "center", transition: "background .15s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#e8c56d,#c9972a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#0a0a0f", flexShrink: 0 }}>
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                            {u.title && <div style={{ fontSize: 11, color: "#e8c56d" }}>{u.title}</div>}
                          </div>
                        </div>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100, background: u.role === "admin" ? "rgba(232,197,109,.15)" : u.role === "team" ? "rgba(59,130,246,.15)" : "rgba(255,255,255,.07)", color: u.role === "admin" ? "#e8c56d" : u.role === "team" ? "#60a5fa" : "rgba(255,255,255,.5)", border: `1px solid ${u.role === "admin" ? "rgba(232,197,109,.3)" : u.role === "team" ? "rgba(59,130,246,.3)" : "rgba(255,255,255,.1)"}` }}>
                            {u.role}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="db-btn" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setEditUser({ ...u })} title="Edit">✏️</button>
                          <button className="db-btn red" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setDeleteTarget({ kind: "user", id: u.id, label: u.name })} title="Delete">🗑</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── MESSAGES (admin only) ── */}
              {tab === "messages" && isAdmin && (
                <div style={{ animation: "fadeUp .4s ease both" }}>
                  <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, marginBottom: 6 }}>Contact Messages</h1>
                  <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13, marginBottom: 24 }}>{contacts.length} message{contacts.length !== 1 ? "s" : ""} received</p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {contacts.length === 0 && <p style={{ color: "rgba(255,255,255,.3)", fontSize: 14 }}>No messages yet.</p>}
                    {contacts.map((c, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "18px 20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name || "Anonymous"}</span>
                            <span style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginLeft: 10 }}>{c.email}</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {c.subject && <span style={{ fontSize: 12, background: "rgba(232,197,109,.1)", border: "1px solid rgba(232,197,109,.2)", borderRadius: 100, padding: "2px 10px", color: "#e8c56d" }}>{c.subject}</span>}
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{c.created_at ? new Date(c.created_at).toLocaleString() : ""}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 14, color: "rgba(255,255,255,.6)", lineHeight: 1.65 }}>{c.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── View Report Modal ── */}
      {viewReport && (
        <Modal title="Report Details" onClose={() => setViewReport(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              ["ID",          viewReport.id],
              ["Type",        viewReport.type],
              ["Status",      null, <Badge status={viewReport.status} />],
              ["Location",    viewReport.location],
              ["Date",        viewReport.date || "—"],
              ["Organization",viewReport.org  || "—"],
              ["Anonymous",   viewReport.anonymous ? "Yes" : "No"],
              ["Source",      viewReport.source],
              ["Submitted",   viewReport.created_at ? new Date(viewReport.created_at).toLocaleString() : "—"],
            ].map(([label, val, node]) => (
              <div key={label}>
                <div style={LABEL}>{label}</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.75)" }}>{node || val}</div>
              </div>
            ))}
            <div>
              <div style={LABEL}>Description</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,.75)", lineHeight: 1.6, background: "rgba(255,255,255,.03)", borderRadius: 8, padding: 12 }}>{viewReport.description}</div>
            </div>
            {viewReport.links?.length > 0 && (
              <div>
                <div style={LABEL}>Evidence Links</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(typeof viewReport.links === "string" ? JSON.parse(viewReport.links) : viewReport.links).map((l, i) => (
                    <a key={i} href={l} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#e8c56d", wordBreak: "break-all" }}>{l}</a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Edit Report Modal ── */}
      {editReport && (
        <Modal title="Edit Report" onClose={() => setEditReport(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={LABEL}>Type</label><input className="db-input" value={editReport.type} onChange={e => setEditReport(p => ({ ...p, type: e.target.value }))} /></div>
            <div><label style={LABEL}>Location</label><input className="db-input" value={editReport.location} onChange={e => setEditReport(p => ({ ...p, location: e.target.value }))} /></div>
            <div><label style={LABEL}>Organization</label><input className="db-input" value={editReport.org || ""} onChange={e => setEditReport(p => ({ ...p, org: e.target.value }))} /></div>
            <div>
              <label style={LABEL}>Status</label>
              <select className="db-input" value={editReport.status} onChange={e => setEditReport(p => ({ ...p, status: e.target.value }))}>
                {VALID_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={LABEL}>Description</label><textarea className="db-input" rows={4} value={editReport.description} onChange={e => setEditReport(p => ({ ...p, description: e.target.value }))} style={{ resize: "vertical" }} /></div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
              <button className="db-btn" onClick={() => setEditReport(null)}>Cancel</button>
              <button className="db-btn gold" onClick={saveReport} disabled={saving}>{saving ? <Spinner /> : "Save Changes"}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit User Modal ── */}
      {editUser && (
        <Modal title="Edit User" onClose={() => setEditUser(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={LABEL}>Name</label><input className="db-input" value={editUser.name || ""} onChange={e => setEditUser(p => ({ ...p, name: e.target.value }))} /></div>
            <div><label style={LABEL}>Email</label><input className="db-input" type="email" value={editUser.email || ""} onChange={e => setEditUser(p => ({ ...p, email: e.target.value }))} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={LABEL}>Title</label><input className="db-input" value={editUser.title || ""} onChange={e => setEditUser(p => ({ ...p, title: e.target.value }))} /></div>
              <div><label style={LABEL}>Department</label><input className="db-input" value={editUser.department || ""} onChange={e => setEditUser(p => ({ ...p, department: e.target.value }))} /></div>
            </div>
            <div>
              <label style={LABEL}>Role</label>
              <select className="db-input" value={editUser.role || "user"} onChange={e => setEditUser(p => ({ ...p, role: e.target.value }))}>
                {VALID_ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div><label style={LABEL}>Bio</label><textarea className="db-input" rows={3} value={editUser.bio || ""} onChange={e => setEditUser(p => ({ ...p, bio: e.target.value }))} style={{ resize: "none" }} /></div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
              <button className="db-btn" onClick={() => setEditUser(null)}>Cancel</button>
              <button className="db-btn gold" onClick={saveUser} disabled={saving}>{saving ? <Spinner /> : "Save Changes"}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <Modal title={`Delete ${deleteTarget.kind === "report" ? "Report" : "User"}`} onClose={() => setDeleteTarget(null)}>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.65)", marginBottom: 24, lineHeight: 1.6 }}>
            Are you sure you want to permanently delete <strong style={{ color: "#f0eee8" }}>{deleteTarget.label}</strong>? This action cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="db-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="db-btn red" onClick={confirmDelete} disabled={saving} style={{ fontWeight: 700 }}>{saving ? <Spinner /> : "Delete Permanently"}</button>
          </div>
        </Modal>
      )}

      {/* ── Toast notification ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, background: toast.type === "error" ? "rgba(239,68,68,.12)" : "rgba(16,185,129,.12)", border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,.3)" : "rgba(16,185,129,.3)"}`, borderRadius: 10, padding: "12px 18px", fontSize: 14, color: toast.type === "error" ? "#ef4444" : "#10b981", fontWeight: 500, animation: "fadeUp .25s ease", maxWidth: 320 }}>
          {toast.type === "error" ? "⚠ " : "✓ "}{toast.msg}
        </div>
      )}
    </div>
  );
}