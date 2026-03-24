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
  const [viewSubs,    setViewSubs]    = useState([]);    // submissions loaded when view modal opens
  const [deleteTarget, setDeleteTarget] = useState(null); // { kind: "report"|"user", id, label }
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState(null);

  // Filters
  const [reportFilter, setReportFilter] = useState("all");
  const [reportSearch, setReportSearch] = useState("");
  const [userSearch,   setUserSearch]   = useState("");

  // Submissions
  const [submissions,    setSubmissions]    = useState([]);
  const [submitModal,    setSubmitModal]    = useState(null); // report object when open
  const [subForm,        setSubForm]        = useState({ markdown: "", imageLinks: [""] });
  const [subSaving,      setSubSaving]      = useState(false);
  const [reviewModal,    setReviewModal]    = useState(null); // submission object
  const [reviewDecision, setReviewDecision] = useState("approved");
  const [reviewNote,     setReviewNote]     = useState("");

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
      // Only show approved submissions in the view modal
      setViewSubs(Array.isArray(subs) ? subs.filter(s => s.status === "approved") : []);
    } catch {
      // silently ignore — submissions just won't appear
    }
  };
    const changeStatus = async (id, status) => {
  try {
    await apiFetch(`/api/admin/reports/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    showToast(`Status → ${status}`);
    loadAll();
  } catch (e) {
    showToast(e.message, "error");
  }
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

  // ── Sidebar tabs ────────────────────────────────────────────────────────────
  const tabs = [
    { id: "overview",    icon: "📊", label: "Overview" },
    { id: "reports",     icon: "📋", label: "Reports",     count: reports.length },
    { id: "submissions", icon: "📨", label: "Submissions", count: pendingCount > 0 ? pendingCount : submissions.length, urgent: pendingCount > 0 },
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
                  <span style={{ fontSize: 11, background: t.urgent ? "rgba(239,68,68,.2)" : "rgba(255,255,255,.08)", border: t.urgent ? "1px solid rgba(239,68,68,.4)" : "none", borderRadius: 100, padding: "1px 7px", color: t.urgent ? "#ef4444" : "rgba(255,255,255,.5)", fontWeight: t.urgent ? 700 : 400 }}>{t.count}</span>
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
                      { label: "Total Reports",      value: summary.totals.reports,     icon: "📋", color: "#e8c56d" },
                      { label: "Users",               value: summary.totals.users,       icon: "👥", color: "#3b82f6" },
                      { label: "Messages",            value: summary.totals.contacts,    icon: "✉️", color: "#a78bfa" },
                      { label: "Feed Items",          value: summary.totals.feed,        icon: "📡", color: "#10b981" },
                      { label: "Pending Submissions", value: summary.totals.pendingSubs, icon: "📨", color: summary.totals.pendingSubs > 0 ? "#ef4444" : "#6b7280" },
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
                          {isAdmin ? (
                            <select
                              value={r.status}
                              onChange={e => changeStatus(r.id, e.target.value)}
                              style={{ ...INPUT, padding: "5px 8px", fontSize: 12, width: "auto", cursor: "pointer" }}
                            >
                              {VALID_STATUSES.map(s => <option key={s}>{s}</option>)}
                            </select>
                          ) : (
                            <Badge status={r.status} />
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button className="db-btn" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => openView(r)} title="View">👁</button>
                          <button className="db-btn" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setEditReport({ ...r })} title="Edit">✏️</button>
                          {/* Team: Submit for Review — Admin: delete */}
                          {!isAdmin && (
                            <button className="db-btn" style={{ padding: "5px 10px", fontSize: 12, background: "rgba(232,197,109,.08)", border: "1px solid rgba(232,197,109,.25)", color: "#e8c56d" }}
                              onClick={() => { setSubmitModal(r); setSubForm({ markdown: "", imageLinks: [""] }); }}
                              title="Submit for Review"
                            >📨</button>
                          )}
                          {isAdmin && (
                            <button className="db-btn red" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setDeleteTarget({ kind: "report", id: r.id, label: r.type })} title="Delete">🗑</button>
                          )}
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
                            <button className="db-btn red" style={{ padding: "4px 9px", fontSize: 12 }}
                              onClick={() => setDeleteTarget({ kind: "message", id: c.id, label: `message from ${c.name || c.email}` })}>
                              🗑
                            </button>
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

          {/* ── SUBMISSIONS TAB ── */}
          {!loading && tab === "submissions" && (
            <div style={{ animation: "fadeUp .4s ease both" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, marginBottom: 4 }}>
                    {isAdmin ? "Review Queue" : "My Submissions"}
                  </h1>
                  <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13 }}>
                    {isAdmin
                      ? `${pendingCount} pending review · ${submissions.length} total`
                      : `${submissions.length} submission${submissions.length !== 1 ? "s" : ""} sent`}
                  </p>
                </div>
                {!isAdmin && (
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,.38)", maxWidth: 340, lineHeight: 1.6 }}>
                    Select a report from the Reports tab and click 📨 to submit notes for admin review.
                  </p>
                )}
              </div>

              {/* Pending banner for admin */}
              {isAdmin && pendingCount > 0 && (
                <div style={{ background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 12, padding: "13px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🔔</span>
                  <span style={{ fontSize: 14, color: "#ef4444", fontWeight: 600 }}>{pendingCount} submission{pendingCount !== 1 ? "s" : ""} awaiting your review</span>
                </div>
              )}

              {submissions.length === 0 && (
                <div style={{ padding: "48px 0", textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 14 }}>
                  No submissions yet.{!isAdmin && " Go to the Reports tab and click 📨 on a report to submit notes."}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {submissions.map(s => {
                  const isPending  = s.status === "pending";
                  const isApproved = s.status === "approved";
                  const statusCol  = isPending ? "#f59e0b" : isApproved ? "#10b981" : "#ef4444";
                  const images     = typeof s.image_links === "string" ? JSON.parse(s.image_links || "[]") : (s.image_links || []);

                  return (
                    <div key={s.id} style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${isPending ? "rgba(245,158,11,.2)" : "rgba(255,255,255,.07)"}`, borderRadius: 14, padding: "20px 22px" }}>
                      {/* Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>
                            {s.report_type || "Report"} — <span style={{ color: "rgba(255,255,255,.5)", fontWeight: 400 }}>{s.report_location || "No location"}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
                            Submitted by <span style={{ color: "#e8c56d" }}>{s.submitter_name}</span> · {s.created_at ? new Date(s.created_at).toLocaleString() : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: statusCol, background: `${statusCol}18`, border: `1px solid ${statusCol}30`, borderRadius: 100, padding: "3px 10px", textTransform: "capitalize" }}>{s.status}</span>
                          {isAdmin && isPending && (
                            <button className="db-btn gold" style={{ padding: "5px 14px", fontSize: 12 }}
                              onClick={() => { setReviewModal(s); setReviewDecision("approved"); setReviewNote(""); }}>
                              Review →
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Markdown content rendered as pre-formatted */}
                      <div style={{ background: "rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "14px 16px", marginBottom: images.length > 0 ? 14 : 0 }}>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Notes (Markdown)</div>
                        <pre style={{ fontSize: 13, color: "rgba(255,255,255,.7)", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, fontFamily: "monospace" }}>{s.markdown}</pre>
                      </div>

                      {/* Image links */}
                      {images.length > 0 && (
                        <div style={{ marginBottom: s.admin_note ? 14 : 0 }}>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Image Links</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {images.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#e8c56d", wordBreak: "break-all" }}>🖼 {url}</a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Admin note if reviewed */}
                      {s.admin_note && (
                        <div style={{ marginTop: 14, background: isApproved ? "rgba(16,185,129,.06)" : "rgba(239,68,68,.06)", border: `1px solid ${isApproved ? "rgba(16,185,129,.2)" : "rgba(239,68,68,.2)"}`, borderRadius: 10, padding: "12px 14px" }}>
                          <div style={{ fontSize: 11, color: isApproved ? "#10b981" : "#ef4444", fontWeight: 600, marginBottom: 4 }}>Admin Note ({isApproved ? "Approved" : "Denied"})</div>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>{s.admin_note}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── View Report Modal ── */}
      {viewReport && (
        <Modal title="Report Details" onClose={() => { setViewReport(null); setViewSubs([]); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Core report fields */}
            {[
              ["ID",           viewReport.id],
              ["Type",         viewReport.type],
              ["Status",       null, <Badge status={viewReport.status} />],
              ["Location",     viewReport.location],
              ["Date",         viewReport.date || "—"],
              ["Organization", viewReport.org  || "—"],
              ["Anonymous",    viewReport.anonymous ? "Yes" : "No"],
              ["Source",       viewReport.source],
              ["Submitted",    viewReport.created_at ? new Date(viewReport.created_at).toLocaleString() : "—"],
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

            {/* ── Approved Submissions ── */}
            {viewSubs.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 1, background: "rgba(255,255,255,.08)", marginBottom: 18 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: "#10b981", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 16 }}>✅</span> {viewSubs.length} Approved Submission{viewSubs.length !== 1 ? "s" : ""}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {viewSubs.map((s, i) => {
                    const images = typeof s.image_links === "string"
                      ? JSON.parse(s.image_links || "[]")
                      : (s.image_links || []);

                    return (
                      <div key={s.id} style={{ background: "rgba(16,185,129,.04)", border: "1px solid rgba(16,185,129,.18)", borderRadius: 12, padding: "16px 18px" }}>

                        {/* Submission meta */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>
                            Submitted by <span style={{ color: "#e8c56d", fontWeight: 600 }}>{s.submitter_name}</span>
                            <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
                            {s.created_at ? new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.25)", borderRadius: 100, padding: "2px 9px" }}>approved</span>
                        </div>

                        {/* Markdown notes */}
                        <div style={{ background: "rgba(0,0,0,.2)", borderRadius: 8, padding: "12px 14px", marginBottom: images.length > 0 ? 12 : 0 }}>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 7 }}>Notes</div>
                          <pre style={{ fontSize: 13, color: "rgba(255,255,255,.72)", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, fontFamily: "monospace" }}>{s.markdown}</pre>
                        </div>

                        {/* Image links */}
                        {images.length > 0 && (
                          <div style={{ marginBottom: s.admin_note ? 12 : 0 }}>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 7 }}>Image Evidence</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                              {images.map((url, j) => (
                                <a key={j} href={url} target="_blank" rel="noreferrer"
                                  style={{ fontSize: 13, color: "#e8c56d", wordBreak: "break-all", display: "flex", alignItems: "center", gap: 6 }}>
                                  <span>🖼</span>{url}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Admin note */}
                        {s.admin_note && (
                          <div style={{ marginTop: 12, background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.15)", borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ fontSize: 10, color: "#10b981", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 5 }}>Admin Note</div>
                            <div style={{ fontSize: 13, color: "rgba(255,255,255,.62)" }}>{s.admin_note}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No approved submissions yet */}
            {viewSubs.length === 0 && (
              <div style={{ marginTop: 4, padding: "12px 14px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10, fontSize: 13, color: "rgba(255,255,255,.3)", textAlign: "center" }}>
                No approved submissions for this report yet.
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
        <Modal title={`Delete ${deleteTarget.kind === "report" ? "Report" : deleteTarget.kind === "user" ? "User" : "Message"}`} onClose={() => setDeleteTarget(null)}>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.65)", marginBottom: 24, lineHeight: 1.6 }}>
            Are you sure you want to permanently delete <strong style={{ color: "#f0eee8" }}>{deleteTarget.label}</strong>? This action cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="db-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="db-btn red" onClick={confirmDelete} disabled={saving} style={{ fontWeight: 700 }}>{saving ? <Spinner /> : "Delete Permanently"}</button>
          </div>
        </Modal>
      )}

      {/* ── Submit for Review Modal (team only) ── */}
      {submitModal && (
        <Modal title={`Submit for Review — ${submitModal.type}`} onClose={() => setSubmitModal(null)}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", marginBottom: 20, lineHeight: 1.6 }}>
            Write your notes in Markdown and optionally add image links. An admin will review and either approve (marking the report <strong style={{ color: "#10b981" }}>Resolved</strong>) or deny your submission.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Markdown editor */}
            <div>
              <label style={LABEL}>Notes (Markdown) *</label>
              <textarea
                className="db-input"
                rows={10}
                placeholder={`# Summary\n\nDescribe what was found or resolved...\n\n## Evidence\n- Link 1\n- Link 2\n\n## Outcome\nWhat action was taken?`}
                value={subForm.markdown}
                onChange={e => setSubForm(p => ({ ...p, markdown: e.target.value }))}
                style={{ resize: "vertical", fontFamily: "monospace", fontSize: 13 }}
              />
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 5 }}>Supports Markdown: **bold**, *italic*, # headings, - lists</div>
            </div>

            {/* Image links */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={LABEL}>Image Links <span style={{ color: "rgba(255,255,255,.28)", fontWeight: 400 }}>({subForm.imageLinks.filter(l => l.trim()).length}/10)</span></label>
                {subForm.imageLinks.length < 10 && (
                  <button className="db-btn" style={{ fontSize: 12, padding: "3px 10px" }}
                    onClick={() => setSubForm(p => ({ ...p, imageLinks: [...p.imageLinks, ""] }))}>
                    + Add
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {subForm.imageLinks.map((link, i) => (
                  <div key={i} style={{ display: "flex", gap: 8 }}>
                    <input
                      className="db-input"
                      type="url"
                      placeholder={`https://example.com/screenshot-${i + 1}.png`}
                      value={link}
                      onChange={e => setSubForm(p => ({ ...p, imageLinks: p.imageLinks.map((l, x) => x === i ? e.target.value : l) }))}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="db-btn red"
                      style={{ width: 36, flexShrink: 0, padding: 0, fontSize: 16 }}
                      onClick={() => setSubForm(p => ({ ...p, imageLinks: p.imageLinks.filter((_, x) => x !== i) }))}
                    >×</button>
                  </div>
                ))}
                {subForm.imageLinks.length === 0 && (
                  <button className="db-btn" style={{ fontSize: 12, width: "100%", border: "1px dashed rgba(255,255,255,.12)" }}
                    onClick={() => setSubForm(p => ({ ...p, imageLinks: [""] }))}>
                    + Add an image link
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 5 }}>Direct URLs to screenshots, photos, or other image evidence</div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button className="db-btn" onClick={() => setSubmitModal(null)}>Cancel</button>
              <button className="db-btn gold" onClick={submitForReview} disabled={subSaving || !subForm.markdown.trim()}>
                {subSaving ? <Spinner /> : "Submit for Review →"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Admin Review Modal ── */}
      {reviewModal && (
        <Modal title="Review Submission" onClose={() => setReviewModal(null)}>
          {/* Submission info */}
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10, padding: "14px 16px", marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 4 }}>From <span style={{ color: "#e8c56d" }}>{reviewModal.submitter_name}</span> · {reviewModal.created_at ? new Date(reviewModal.created_at).toLocaleString() : ""}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{reviewModal.report_type} — {reviewModal.report_location}</div>
            <pre style={{ fontSize: 13, color: "rgba(255,255,255,.7)", lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, fontFamily: "monospace", maxHeight: 200, overflowY: "auto" }}>{reviewModal.markdown}</pre>
            {(() => {
              const imgs = typeof reviewModal.image_links === "string" ? JSON.parse(reviewModal.image_links || "[]") : (reviewModal.image_links || []);
              return imgs.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Image Links</div>
                  {imgs.map((url, i) => <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: 12, color: "#e8c56d", wordBreak: "break-all", marginBottom: 3 }}>🖼 {url}</a>)}
                </div>
              ) : null;
            })()}
          </div>

          {/* Decision */}
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Decision</label>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { val: "approved", label: "✓ Approve", color: "#10b981" },
                { val: "denied",   label: "✕ Deny",    color: "#ef4444" },
              ].map(opt => (
                <button key={opt.val} onClick={() => setReviewDecision(opt.val)}
                  style={{ flex: 1, padding: "10px", borderRadius: 9, border: `1px solid ${reviewDecision === opt.val ? opt.color : "rgba(255,255,255,.1)"}`, background: reviewDecision === opt.val ? `${opt.color}15` : "rgba(255,255,255,.03)", color: reviewDecision === opt.val ? opt.color : "rgba(255,255,255,.5)", fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {reviewDecision === "approved" && (
              <div style={{ marginTop: 10, fontSize: 13, color: "rgba(16,185,129,.8)", background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 8, padding: "8px 12px" }}>
                ✓ Approving will automatically mark this report as <strong>Resolved</strong>.
              </div>
            )}
          </div>

          {/* Admin note */}
          <div style={{ marginBottom: 18 }}>
            <label style={LABEL}>Note to team member <span style={{ color: "rgba(255,255,255,.28)", fontWeight: 400 }}>(optional)</span></label>
            <textarea
              className="db-input"
              rows={3}
              placeholder={reviewDecision === "approved" ? "Great work — report confirmed resolved." : "Please provide more evidence before this can be approved."}
              value={reviewNote}
              onChange={e => setReviewNote(e.target.value)}
              style={{ resize: "none" }}
            />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="db-btn" onClick={() => setReviewModal(null)}>Cancel</button>
            <button
              onClick={handleReview}
              disabled={subSaving}
              style={{ background: reviewDecision === "approved" ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#ef4444,#dc2626)", border: "none", borderRadius: 9, padding: "10px 22px", color: "#fff", fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            >
              {subSaving ? <Spinner /> : reviewDecision === "approved" ? "Approve Submission" : "Deny Submission"}
            </button>
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
