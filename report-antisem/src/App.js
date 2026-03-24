import { useState, useEffect, useRef } from "react";
import Dashboard from "./Dashboard";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = "http://192.168.12.187:3001";

const NAV_LINKS = ["About Us", "Submit Offense", "Our Mission", "Press", "Contact Us", "Login"];

const STAT_DEFS = [
  { key: "reports_submitted",  label: "Reports Submitted",  icon: "📋", suffix: "",  format: "comma"  },
  { key: "cases_resolved_pct", label: "Cases Resolved",     icon: "✅", suffix: "%", format: "plain"  },
  { key: "states_covered",     label: "States Covered",     icon: "🗺️", suffix: "",  format: "plain"  },
  { key: "community_members",  label: "Community Members",  icon: "🤝", suffix: "+", format: "plain"  },
];

const CATEGORIES = [
  { icon: "🏫", title: "Educational Institutions", desc: "Schools, universities, and academic settings" },
  { icon: "💼", title: "Workplace",                desc: "Employment discrimination and hostile work environments" },
  { icon: "🌐", title: "Online Harassment",        desc: "Social media, forums, and digital platforms" },
  { icon: "🏘️", title: "Community / Public",       desc: "Neighborhoods, public spaces, and local events" },
  { icon: "🏛️", title: "Government & Legal",       desc: "Institutional bias and policy-related incidents" },
  { icon: "📰", title: "Media & Press",            desc: "Reporting biases in news and publications" },
];

const STATUS_COLOR = { "Under Review": "#f59e0b", "Resolved": "#10b981", "In Progress": "#3b82f6" };
const LABEL = { display: "block", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.65)", marginBottom: 8, letterSpacing: "0.03em" };

const FALLBACK_REPORTS = [
  { location: "New York, NY",    type: "Online Harassment", time: "2 hours ago", status: "Under Review" },
  { location: "Los Angeles, CA", type: "Workplace",         time: "5 hours ago", status: "Resolved"     },
  { location: "Chicago, IL",     type: "Educational",       time: "1 day ago",   status: "In Progress"  },
  { location: "Houston, TX",     type: "Community",         time: "2 days ago",  status: "Resolved"     },
];

const PRESS_RELEASES = [
  {
    date: "March 15, 2026",
    category: "Platform Update",
    title: "ReportASA Reaches 10,000 Documented Incidents Nationwide",
    excerpt: "ReportASA today announced a significant milestone: over 10,000 antisemitic incidents have been documented through the platform since its launch, representing a comprehensive national record of hate-based incidents against Jewish Americans.",
    readTime: "3 min read",
  },
  {
    date: "February 28, 2026",
    category: "Partnership",
    title: "ReportASA Partners with Major Civil Rights Organizations to Expand Reach",
    excerpt: "ReportASA has formalized partnerships with leading civil rights organizations across 12 states, enabling more coordinated responses to reported incidents and providing affected individuals with direct access to legal resources.",
    readTime: "4 min read",
  },
  {
    date: "January 10, 2026",
    category: "Research",
    title: "New Report: Antisemitic Incidents Up 34% in Educational Institutions",
    excerpt: "ReportASA's annual data analysis reveals a significant increase in documented antisemitic incidents within educational settings. The report, compiled from verified submissions over the past year, highlights emerging patterns and geographic hotspots.",
    readTime: "6 min read",
  },
  {
    date: "December 5, 2025",
    category: "Community",
    title: "ReportASA Launches Anonymous Reporting Feature for Workplace Incidents",
    excerpt: "In response to community feedback, ReportASA has enhanced its workplace reporting pathway with fully anonymized submissions, end-to-end encryption, and direct escalation options to appropriate labor regulatory bodies.",
    readTime: "3 min read",
  },
  {
    date: "October 22, 2025",
    category: "Platform Update",
    title: "ReportASA Dashboard Now Available to Partner Organizations",
    excerpt: "Verified partner organizations and advocacy groups can now access a dedicated dashboard to track incident trends in their regions, coordinate responses, and download anonymized data for research and policy work.",
    readTime: "5 min read",
  },
  {
    date: "September 1, 2025",
    category: "Launch",
    title: "ReportASA Officially Launches Nationwide Antisemitism Reporting Platform",
    excerpt: "After months of development and community consultation, ReportASA officially launched its national platform for documenting and responding to antisemitic incidents across the United States, with initial coverage in all 50 states.",
    readTime: "4 min read",
  },
];

const PRESS_CATEGORY_COLORS = {
  "Platform Update": "#3b82f6",
  "Partnership":     "#a78bfa",
  "Research":        "#e8c56d",
  "Community":       "#10b981",
  "Launch":          "#f59e0b",
};

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

function useCountUp(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || target === 0) { setCount(0); return; }
    let raf, startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(step);
      else setCount(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return count;
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ value, label, icon, suffix, format, animate }) {
  const count = useCountUp(value, 1800, animate);
  const display = format === "comma" ? count.toLocaleString() : count;
  return (
    <div
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "22px 14px", textAlign: "center", backdropFilter: "blur(12px)", transition: "transform 0.3s, box-shadow 0.3s", cursor: "default" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 36px rgba(0,0,0,0.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 800, color: "#e8c56d", fontFamily: "'DM Serif Display',serif", letterSpacing: -1 }}>
        {display}{suffix}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4, letterSpacing: "0.05em", textTransform: "uppercase", lineHeight: 1.4 }}>{label}</div>
    </div>
  );
}

// ─── LINK INPUTS ──────────────────────────────────────────────────────────────
function LinkInputs({ links, setLinks }) {
  const add    = () => links.length < 10 && setLinks([...links, ""]);
  const remove = (i) => setLinks(links.filter((_, x) => x !== i));
  const update = (i, v) => setLinks(links.map((l, x) => x === i ? v : l));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <label style={LABEL}>
          Evidence Links{" "}
          <span style={{ color: "rgba(255,255,255,0.28)", fontWeight: 400 }}>({links.length}/10)</span>
        </label>
        {links.length < 10 && (
          <button onClick={add} style={{ background: "rgba(232,197,109,0.1)", border: "1px solid rgba(232,197,109,0.3)", color: "#e8c56d", borderRadius: 8, padding: "4px 12px", fontSize: 12, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontWeight: 600 }}>
            + Add
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {links.map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 8 }}>
            <input className="input-field" type="url" placeholder={`https://example.com/evidence-${i+1}`} value={l} onChange={e => update(i, e.target.value)} style={{ flex: 1 }} />
            <button onClick={() => remove(i)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: 8, width: 40, height: 44, cursor: "pointer", fontSize: 18, flexShrink: 0 }}>×</button>
          </div>
        ))}
        {links.length === 0 && (
          <button onClick={add} style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.13)", borderRadius: 10, padding: 14, color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 13, fontFamily: "'Outfit',sans-serif", width: "100%" }}>
            + Add an evidence link (screenshots, articles, posts…)
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const width   = useWindowWidth();
  const mobile  = width < 768;
  const statsRef = useRef(null);

  const [page,      setPage]      = useState("home");
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [statsVis,  setStatsVis]  = useState(false);

  // API data
  const [apiStats, setApiStats] = useState({ reports_submitted: 0, cases_resolved_pct: 0, states_covered: 0, community_members: 0 });
  const [feed,     setFeed]     = useState(FALLBACK_REPORTS);

  // Full form
  const blankForm = { type: "", date: "", location: "", org: "", description: "", contact: "", anonymous: true };
  const [form,      setForm]      = useState(blankForm);
  const [links,     setLinks]     = useState([]);
  const [submitSt,  setSubmitSt]  = useState("idle");
  const [submitErr, setSubmitErr] = useState("");

  // Contact form
  const blankContact = { name: "", email: "", subject: "", message: "" };
  const [contactForm, setContactForm] = useState(blankContact);
  const [contactSt,   setContactSt]   = useState("idle");

  // Auth state
  const [user,     setUser]     = useState(null);
  const [authView, setAuthView] = useState("login"); // "login"|"register"|"forgot"|"reset"
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "", title: "", department: "", bio: "" });
  const [authSt,   setAuthSt]   = useState("idle");
  const [authErr,  setAuthErr]  = useState("");

  // Password reset state
  const [resetToken,     setResetToken]     = useState("");
  const [resetForm,      setResetForm]      = useState({ newPassword: "", confirm: "" });
  const [resetSt,        setResetSt]        = useState("idle");
  const [resetErr,       setResetErr]       = useState("");
  const [forgotEmail,    setForgotEmail]    = useState("");
  const [forgotSt,       setForgotSt]       = useState("idle");
  const [changePassForm, setChangePassForm] = useState({ current: "", newPass: "", confirm: "" });
  const [changePassSt,   setChangePassSt]   = useState("idle");
  const [changePassErr,  setChangePassErr]  = useState("");

  // Press release expanded state
  const [expandedPress, setExpandedPress] = useState(null);

  // ── Lock body scroll when mobile menu is open ─────────────────────────────
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [menuOpen]);

  // ── Detect reset token in URL (from email link) ───────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");
    if (token) {
      setResetToken(token);
      setAuthView("reset");
      setPage("login");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ── Restore session ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setUser(d.user); })
      .catch(() => {});
  }, []);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setAuthSt("loading"); setAuthErr("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authForm.email, password: authForm.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      setUser(data.user);
      setAuthSt("idle");
      setAuthForm({ email: "", password: "", name: "", title: "", department: "", bio: "" });
      // On mobile: close menu and redirect appropriately
      setMenuOpen(false);
      if (data.user?.role === "admin" || data.user?.role === "team") {
        setPage("dashboard");
      } else {
        setPage("home");
      }
    } catch (e) { setAuthSt("error"); setAuthErr(e.message); }
  };

  const handleRegister = async () => {
    setAuthSt("loading"); setAuthErr("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setUser(data.user);
      setAuthSt("idle");
      setAuthForm({ email: "", password: "", name: "", title: "", department: "", bio: "" });
      setPage("home");
    } catch (e) { setAuthSt("error"); setAuthErr(e.message); }
  };

  const handleLogout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
    setPage("home");
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) return;
    setForgotSt("loading");
    try {
      const res  = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      setForgotSt("success");
      if (data._dev_token) setResetToken(data._dev_token);
    } catch {
      setForgotSt("success");
    }
  };

  const handleResetPassword = async () => {
    if (resetForm.newPassword !== resetForm.confirm) { setResetErr("Passwords do not match"); return; }
    if (resetForm.newPassword.length < 8) { setResetErr("Password must be at least 8 characters"); return; }
    setResetSt("loading"); setResetErr("");
    try {
      const res  = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword: resetForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setResetSt("error"); setResetErr(data.error || "Reset failed"); return; }
      setResetSt("success");
    } catch { setResetSt("error"); setResetErr("Could not connect to server."); }
  };

  const handleChangePassword = async () => {
    if (changePassForm.newPass !== changePassForm.confirm) { setChangePassErr("Passwords do not match"); return; }
    if (changePassForm.newPass.length < 8) { setChangePassErr("New password must be at least 8 characters"); return; }
    setChangePassSt("loading"); setChangePassErr("");
    try {
      const res  = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: changePassForm.current, newPassword: changePassForm.newPass }),
      });
      const data = await res.json();
      if (!res.ok) { setChangePassSt("error"); setChangePassErr(data.error || "Change failed"); return; }
      setChangePassSt("success");
      setChangePassForm({ current: "", newPass: "", confirm: "" });
    } catch { setChangePassSt("error"); setChangePassErr("Could not connect to server."); }
  };

  const handleProfileClick = () => {
    if (user?.role === "admin" || user?.role === "team") {
      setPage("dashboard");
    } else {
      setPage("login");
    }
  };

  // ── Fetch stats + feed ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = () => {
      fetch(`${API_BASE}/api/stats`)
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(d => setApiStats({ reports_submitted: d.reports_submitted ?? 0, cases_resolved_pct: d.cases_resolved_pct ?? 0, states_covered: d.states_covered ?? 0, community_members: d.community_members ?? 0 }))
        .catch(() => {});
      fetch(`${API_BASE}/api/feed`)
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(d => { if (Array.isArray(d) && d.length) setFeed(d); })
        .catch(() => {});
    };
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, []);

  // ── Scroll listener ───────────────────────────────────────────────────────
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  // ── Stats intersection ────────────────────────────────────────────────────
  useEffect(() => {
    if (page !== "home") return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVis(true); }, { threshold: 0.2 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, [page]);

  const goPage = (label) => {
    const map = { "About Us": "about", "Submit Offense": "submit", "Our Mission": "mission", "Login": "login", "Contact Us": "contact", "Press": "press" };
    const target = map[label] || "home";
    // If logged in and clicking Login → profile or dashboard
    if (label === "Login" && user) {
      handleProfileClick();
      setMenuOpen(false);
      return;
    }
    setPage(target);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const postReport = (payload) =>
    fetch(`${API_BASE}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });

  const handleFullSubmit = async () => {
    if (!form.type || !form.description) return;
    setSubmitSt("loading"); setSubmitErr("");
    try {
      await postReport({ ...form, links: links.filter(l => l.trim()) });
      setSubmitSt("success");
      setLinks([]); setForm(blankForm);
    } catch {
      setSubmitSt("error");
      setSubmitErr("Could not reach the server. Please try again or email us directly.");
    }
  };

  // ── Dashboard full-screen ─────────────────────────────────────────────────
  if (page === "dashboard" && user && (user.role === "admin" || user.role === "team")) {
    return (
      <Dashboard
        user={user}
        API_BASE={API_BASE}
        onBack={() => { setPage("home"); window.scrollTo({ top: 0 }); }}
        onLogout={handleLogout}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#f0eee8", fontFamily: "'Outfit',sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{-webkit-text-size-adjust:100%;touch-action:pan-y}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:#0a0a0f}
        ::-webkit-scrollbar-thumb{background:#e8c56d33;border-radius:3px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes gShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .nav-btn{background:none;border:none;color:rgba(255,255,255,.65);font-family:'Outfit',sans-serif;font-size:14px;font-weight:500;cursor:pointer;padding:8px 13px;border-radius:8px;transition:all .2s;white-space:nowrap}
        .nav-btn:hover{color:#e8c56d;background:rgba(232,197,109,.08)}
        .cta{background:linear-gradient(135deg,#e8c56d,#c9972a);color:#0a0a0f;border:none;border-radius:10px;padding:11px 24px;font-family:'Outfit',sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:all .25s;white-space:nowrap}
        .cta:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(232,197,109,.35)}
        .cta:disabled{opacity:.55;cursor:not-allowed;transform:none}
        .cat-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:18px;cursor:pointer;transition:all .3s}
        .cat-card:hover{background:rgba(232,197,109,.06);border-color:rgba(232,197,109,.3);transform:translateY(-3px)}
        .input-field{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:13px 14px;color:#f0eee8;font-family:'Outfit',sans-serif;font-size:15px;outline:none;transition:border-color .2s}
        .input-field:focus{border-color:rgba(232,197,109,.5)}
        .input-field::placeholder{color:rgba(255,255,255,.28)}
        select.input-field option{background:#1a1a24}
        .mob-item{display:block;width:100%;background:none;border:none;color:#f0eee8;font-family:'Outfit',sans-serif;font-size:18px;font-weight:500;padding:18px 0;text-align:left;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.07)}
        .press-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:24px;transition:all .3s;cursor:pointer}
        .press-card:hover{background:rgba(255,255,255,.05);border-color:rgba(232,197,109,.25);transform:translateY(-2px)}
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: scrolled ? "rgba(10,10,15,.95)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? "1px solid rgba(255,255,255,.06)" : "none", transition: "all .3s", padding: "0 20px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => { setPage("home"); window.scrollTo({ top: 0 }); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#e8c56d,#c9972a)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>✡</div>
          <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: "#f0eee8" }}>ReportASA</span>
        </button>

        {/* Desktop nav */}
        {!mobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {NAV_LINKS.filter(l => l !== "Login").map(l => l === "Submit Offense"
              ? <button key={l} className="cta" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => goPage(l)}>{l}</button>
              : <button key={l} className="nav-btn" onClick={() => goPage(l)}>{l}</button>
            )}
            {user ? (
              <button onClick={handleProfileClick} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(232,197,109,.08)", border: "1px solid rgba(232,197,109,.2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginLeft: 4 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#e8c56d,#c9972a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#0a0a0f", fontWeight: 700 }}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#e8c56d", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name?.split(" ")[0]}</span>
                {(user.role === "admin" || user.role === "team") && (
                  <span style={{ fontSize: 10, background: "rgba(232,197,109,.2)", borderRadius: 4, padding: "1px 5px", color: "#e8c56d" }}>⚙</span>
                )}
              </button>
            ) : (
              <button className="nav-btn" onClick={() => goPage("Login")}>Login</button>
            )}
          </div>
        )}

        {/* Mobile: show user avatar OR hamburger */}
        {mobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* User avatar pill — always visible when logged in */}
            {user && (
              <button onClick={handleProfileClick} style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(232,197,109,.08)", border: "1px solid rgba(232,197,109,.2)", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#e8c56d,#c9972a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#0a0a0f", fontWeight: 700, flexShrink: 0 }}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#e8c56d", maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.name?.split(" ")[0]}
                </span>
                {(user.role === "admin" || user.role === "team") && (
                  <span style={{ fontSize: 9, background: "rgba(232,197,109,.2)", borderRadius: 4, padding: "1px 4px", color: "#e8c56d" }}>⚙</span>
                )}
              </button>
            )}
            {/* Hamburger */}
            <button onClick={() => setMenuOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: 5, padding: 4 }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ display: "block", width: 23, height: 2, background: "#f0eee8", borderRadius: 2, transition: "all .25s", transform: menuOpen && i===0 ? "rotate(45deg) translate(5px,5px)" : menuOpen && i===2 ? "rotate(-45deg) translate(5px,-5px)" : "none", opacity: menuOpen && i===1 ? 0 : 1 }} />
              ))}
            </button>
          </div>
        )}
      </nav>

      {/* Mobile drawer — position:fixed, no horizontal scroll, touch-action locked */}
      {mobile && menuOpen && (
        <div
          style={{ position: "fixed", top: 62, left: 0, right: 0, bottom: 0, zIndex: 150, background: "rgba(10,10,15,.98)", backdropFilter: "blur(20px)", padding: "20px 28px", animation: "fadeUp .2s ease", overflowY: "auto", overflowX: "hidden", touchAction: "pan-y" }}
          onTouchMove={e => e.stopPropagation()}
        >
          {/* Show user info at top if logged in */}
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0 20px", marginBottom: 4, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#e8c56d,#c9972a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#0a0a0f", flexShrink: 0 }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#f0eee8" }}>{user.name}</div>
                <div style={{ fontSize: 12, color: "#e8c56d", fontWeight: 500, textTransform: "capitalize" }}>{user.role}</div>
              </div>
            </div>
          )}
          {NAV_LINKS.map(l => {
            // Replace "Login" with context-aware label
            const label = l === "Login" && user ? (user.role === "admin" || user.role === "team" ? "Dashboard ⚙" : "My Profile") : l;
            return (
              <button key={l} className="mob-item" onClick={() => goPage(l)} style={{ color: l === "Submit Offense" ? "#e8c56d" : "#f0eee8" }}>
                {label}
              </button>
            );
          })}
          {user && (
            <button className="mob-item" onClick={handleLogout} style={{ color: "#ef4444", borderBottom: "none", marginTop: 8 }}>
              Sign Out
            </button>
          )}
        </div>
      )}

      {/* ══════════════════════════ HOME ══════════════════════════ */}
      {page === "home" && (
        <>
          {/* Hero */}
          <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: mobile ? "96px 20px 56px" : "120px 24px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "12%", left: "4%", width: mobile?180:380, height: mobile?180:380, background: "radial-gradient(circle,rgba(232,197,109,.08) 0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom:"12%", right:"4%", width: mobile?120:280, height: mobile?120:280, background: "radial-gradient(circle,rgba(100,149,237,.06) 0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
            <div style={{ maxWidth: 740, animation: "fadeUp .8s ease both", position: "relative", zIndex: 1, width: "100%" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(232,197,109,.1)", border: "1px solid rgba(232,197,109,.25)", borderRadius: 100, padding: "5px 13px", marginBottom: 26, fontSize: 12, color: "#e8c56d", fontWeight: 500 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e8c56d", animation: "pulse 2s infinite", display: "inline-block" }} />
                Active monitoring across the United States
              </div>
              <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(36px,9vw,76px)", lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: 18 }}>
                Stand Against<br />
                <span style={{ background: "linear-gradient(135deg,#e8c56d,#f0d488,#c9972a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200%", animation: "gShift 4s ease infinite" }}>Antisemitism</span>
              </h1>
              <p style={{ fontSize: mobile ? 15 : 17, color: "rgba(255,255,255,.52)", lineHeight: 1.7, maxWidth: 540, margin: "0 auto 32px", fontWeight: 300 }}>
                Report antisemitic incidents securely and anonymously. Together, we document, respond, and protect our communities.
              </p>
              <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: 12, justifyContent: "center", alignItems: mobile ? "stretch" : "center" }}>
                <button className="cta" style={{ fontSize: 15, padding: "13px 30px" }} onClick={() => goPage("Submit Offense")}>Report an Incident →</button>
                <button className="nav-btn" style={{ fontSize: 15, padding: "13px 22px", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10 }} onClick={() => goPage("Our Mission")}>Our Mission</button>
              </div>
            </div>
            {!mobile && <>
              <div style={{ position: "absolute", top: "18%", right: "10%", fontSize: 26, color: "rgba(232,197,109,.12)", animation: "float 6s ease-in-out infinite", pointerEvents: "none" }}>✡</div>
              <div style={{ position: "absolute", bottom:"26%", left: "7%", fontSize: 18, color: "rgba(232,197,109,.08)", animation: "float 8s ease-in-out infinite 2s", pointerEvents: "none" }}>✡</div>
            </>}
          </section>

          {/* Stats */}
          <section ref={statsRef} style={{ padding: mobile ? "44px 16px" : "64px 24px", maxWidth: 1060, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: mobile ? 10 : 18 }}>
              {STAT_DEFS.map((s, i) => (
                <StatCard key={i} value={apiStats[s.key]} label={s.label} icon={s.icon} suffix={s.suffix} format={s.format} animate={statsVis} />
              ))}
            </div>
          </section>

          {/* Categories */}
          <section style={{ padding: mobile ? "20px 16px 52px" : "36px 24px 68px", maxWidth: 1060, margin: "0 auto" }}>
            <p style={{ color: "#e8c56d", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Where incidents happen</p>
            <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(22px,4vw,38px)", letterSpacing: "-0.02em", marginBottom: 28 }}>Report by Category</h2>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(auto-fill,minmax(250px,1fr))", gap: 12 }}>
              {CATEGORIES.map((c, i) => (
                <div key={i} className="cat-card" onClick={() => goPage("Submit Offense")}>
                  <div style={{ fontSize: 26, marginBottom: 10 }}>{c.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,.42)", lineHeight: 1.55 }}>{c.desc}</div>
                  <div style={{ marginTop: 12, color: "#e8c56d", fontSize: 12, fontWeight: 600 }}>Report →</div>
                </div>
              ))}
            </div>
          </section>

          {/* Feed */}
          <section style={{ padding: mobile ? "16px 16px 56px" : "36px 24px 72px", maxWidth: 1060, margin: "0 auto" }}>
            <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", justifyContent: "space-between", alignItems: mobile ? "flex-start" : "flex-end", gap: 16, marginBottom: 28 }}>
              <div>
                <p style={{ color: "#e8c56d", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Live feed</p>
                <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(22px,3vw,36px)", letterSpacing: "-0.02em" }}>Recent Reports</h2>
              </div>
              <button className="cta" style={{ padding: "10px 22px", fontSize: 13, flexShrink: 0 }} onClick={() => goPage("Submit Offense")}>+ Submit a Report</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: mobile ? 8 : 14, marginBottom: 24 }}>
              {[
                { label: "Under Review", color: "#f59e0b", count: feed.filter(r => r.status === "Under Review").length },
                { label: "In Progress",  color: "#3b82f6", count: feed.filter(r => r.status === "In Progress").length  },
                { label: "Resolved",     color: "#10b981", count: feed.filter(r => r.status === "Resolved").length     },
              ].map((s, i) => (
                <div key={i} style={{ background: `${s.color}0d`, border: `1px solid ${s.color}30`, borderRadius: 12, padding: mobile ? "10px 12px" : "14px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: mobile ? 20 : 26, fontWeight: 800, color: s.color, fontFamily: "'DM Serif Display',serif" }}>{s.count}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 3, letterSpacing: "0.04em", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {feed.map((r, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: mobile ? "14px 15px" : "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, transition: "background .2s, border-color .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.07)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: mobile ? 10 : 16, minWidth: 0, flex: 1 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${STATUS_COLOR[r.status] || "#888"}15`, border: `1px solid ${STATUS_COLOR[r.status] || "#888"}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                      {r.type === "Online Harassment" ? "🌐" : r.type === "Workplace" ? "💼" : r.type === "Educational" || r.type === "Educational Institutions" ? "🏫" : r.type === "Community" || r.type === "Community / Public" ? "🏘️" : r.type === "Government & Legal" ? "🏛️" : r.type === "Media & Press" ? "📰" : "📋"}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.type}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.38)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {r.location && <span>📍 {r.location}</span>}
                        <span>🕐 {r.time}</span>
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[r.status] || "#888", background: `${STATUS_COLOR[r.status] || "#888"}1a`, border: `1px solid ${STATUS_COLOR[r.status] || "#888"}35`, borderRadius: 100, padding: "4px 12px", whiteSpace: "nowrap", flexShrink: 0 }}>{r.status}</span>
                </div>
              ))}
            </div>
            {feed.length === 0 && <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,.3)", fontSize: 14 }}>No reports yet.</div>}
          </section>

          {/* CTA banner */}
          <section style={{ padding: mobile ? "32px 16px 72px" : "52px 24px 92px" }}>
            <div style={{ maxWidth: 860, margin: "0 auto", background: "linear-gradient(135deg,rgba(232,197,109,.1),rgba(232,197,109,.03))", border: "1px solid rgba(232,197,109,.2)", borderRadius: 22, padding: mobile ? "36px 22px" : "52px 44px", textAlign: "center" }}>
              <div style={{ fontSize: 34, marginBottom: 12 }}>✡</div>
              <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(22px,4vw,40px)", marginBottom: 12, letterSpacing: "-0.02em" }}>Every Report Matters</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", maxWidth: 440, margin: "0 auto 26px", lineHeight: 1.7 }}>Your voice helps build a safer, documented record of antisemitism in America.</p>
              <button className="cta" style={{ fontSize: 15, padding: "13px 34px" }} onClick={() => goPage("Submit Offense")}>Make a Report Now</button>
            </div>
          </section>
        </>
      )}

      {/* ══════════════════════════ SUBMIT ══════════════════════════ */}
      {page === "submit" && (
        <div style={{ maxWidth: 700, margin: "0 auto", padding: mobile ? "90px 16px 80px" : "118px 24px 80px", animation: "fadeUp .6s ease both" }}>
          <button onClick={() => setPage("home")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.42)", cursor: "pointer", fontSize: 14, marginBottom: 32 }}>← Back to home</button>
          <p style={{ color: "#e8c56d", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Submit an offense</p>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(26px,6vw,48px)", letterSpacing: "-0.02em", marginBottom: 8 }}>Report an Incident</h1>
          <p style={{ color: "rgba(255,255,255,.38)", fontSize: 14, marginBottom: 36, lineHeight: 1.6 }}>All submissions are confidential. Accurate details help us respond effectively.</p>
          {submitSt === "success" ? (
            <div style={{ background: "rgba(16,185,129,.07)", border: "1px solid rgba(16,185,129,.22)", borderRadius: 16, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 50, marginBottom: 14 }}>✓</div>
              <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, marginBottom: 7, color: "#10b981" }}>Report Submitted</h3>
              <p style={{ color: "rgba(255,255,255,.45)", marginBottom: 22 }}>Our team will review your submission within 24 hours. Thank you for speaking up.</p>
              <button className="cta" onClick={() => { setSubmitSt("idle"); setPage("home"); }}>Back to Home</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div><label style={LABEL}>Incident Type *</label>
                <select className="input-field" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="">Choose a category...</option>
                  {CATEGORIES.map(c => <option key={c.title}>{c.title}</option>)}
                </select>
              </div>
              <div><label style={LABEL}>Date of Incident</label>
                <input className="input-field" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={{ colorScheme: "dark" }} />
              </div>
              <div><label style={LABEL}>Location (City, State) *</label>
                <input className="input-field" placeholder="e.g. Brooklyn, New York" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
              </div>
              <div><label style={LABEL}>Organization / Venue Involved</label>
                <input className="input-field" placeholder="Optional" value={form.org} onChange={e => setForm(p => ({ ...p, org: e.target.value }))} />
              </div>
              <div><label style={LABEL}>Description of Incident *</label>
                <textarea className="input-field" rows={6} placeholder="Describe what happened in as much detail as you're comfortable sharing..." style={{ resize: "vertical" }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <LinkInputs links={links} setLinks={setLinks} />
              <div><label style={LABEL}>Contact Email (optional)</label>
                <input className="input-field" type="email" placeholder="For follow-up if needed" value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} />
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 11, background: "rgba(255,255,255,.03)", borderRadius: 10, padding: 15 }}>
                <input type="checkbox" id="anon" checked={form.anonymous} onChange={e => setForm(p => ({ ...p, anonymous: e.target.checked }))} style={{ marginTop: 2, accentColor: "#e8c56d" }} />
                <label htmlFor="anon" style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.55, cursor: "pointer" }}>Submit anonymously — your identity will not be shared with any third parties</label>
              </div>
              {submitSt === "error" && (
                <div style={{ background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.22)", borderRadius: 10, padding: "13px 15px", fontSize: 13, color: "#ef4444" }}>⚠ {submitErr}</div>
              )}
              <button className="cta" style={{ padding: "14px", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={handleFullSubmit} disabled={submitSt === "loading"}>
                {submitSt === "loading" ? <><Spinner />Submitting…</> : "Submit Report Securely →"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════ ABOUT ══════════════════════════ */}
      {page === "about" && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: mobile ? "90px 16px 80px" : "118px 48px 80px", animation: "fadeUp .6s ease both" }}>
          <button onClick={() => setPage("home")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.42)", cursor: "pointer", fontSize: 14, marginBottom: 32 }}>← Back</button>
          <p style={{ color: "#e8c56d", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Who we are</p>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(30px,5vw,52px)", letterSpacing: "-0.02em", marginBottom: 16 }}>About Us</h1>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,.55)", maxWidth: 620, marginBottom: 64, fontWeight: 300 }}>
            ReportASA was founded by a group of Jewish Americans who believe every antisemitic incident deserves to be documented, heard, and acted upon. We are volunteers, advocates, and technologists united by one mission.
          </p>
          <div style={{ background: "linear-gradient(135deg,rgba(232,197,109,.08),rgba(232,197,109,.03))", border: "1px solid rgba(232,197,109,.18)", borderRadius: 18, padding: mobile ? "24px 20px" : "28px 36px", marginBottom: 64, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 36 }}>✡</div>
            <div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, marginBottom: 6 }}>Our Commitment</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,.5)", lineHeight: 1.7, maxWidth: 560 }}>Every report is treated with confidentiality, urgency, and care. We never share personal information without consent, and we always follow up.</div>
            </div>
          </div>
          <p style={{ color: "#e8c56d", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>The team</p>
          <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(24px,4vw,38px)", letterSpacing: "-0.02em", marginBottom: 36 }}>People Behind the Platform</h2>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(auto-fill,minmax(260px,1fr))", gap: 20, marginBottom: 64 }}>
            {[
              { name: "Sarah Cohen",     role: "Founder & Executive Director", emoji: "👩‍💼", bio: "Founded ReportASA after personally experiencing antisemitism go unaddressed in her neighborhood.", social: "@sarahcohen" },
              { name: "David Levine",    role: "Lead Developer",               emoji: "👨‍💻", bio: "Full-stack engineer with 10+ years of experience building community safety tools.", social: "@dlevine_dev" },
              { name: "Rachel Goldberg", role: "Head of Community Outreach",   emoji: "👩‍🤝‍👩", bio: "Connects ReportASA with local organizations, synagogues, and advocacy groups nationwide.", social: "@rachelg" },
              { name: "Michael Stern",   role: "Legal Advisor",                emoji: "⚖️",  bio: "Civil rights attorney who ensures every report is handled in accordance with applicable law.", social: "@msternlaw" },
              { name: "Alyssa Weiss",    role: "Data & Research Analyst",      emoji: "📊",  bio: "Transforms incident data into actionable insights that inform policy and advocacy work.", social: "@alyssaweiss" },
              { name: "Jordan Katz",     role: "Operations Manager",           emoji: "🗂️",  bio: "Keeps the team running smoothly and ensures every submission receives a timely response.", social: "@jordankatz" },
            ].map((member, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "24px 22px", transition: "all .25s", cursor: "default" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(232,197,109,.05)"; e.currentTarget.style.borderColor = "rgba(232,197,109,.25)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"; e.currentTarget.style.transform = "none"; }}>
                <div style={{ width: 56, height: 56, background: "linear-gradient(135deg,rgba(232,197,109,.2),rgba(201,151,42,.15))", border: "1px solid rgba(232,197,109,.25)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 16 }}>{member.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 3 }}>{member.name}</div>
                <div style={{ fontSize: 12, color: "#e8c56d", fontWeight: 600, letterSpacing: "0.04em", marginBottom: 12, textTransform: "uppercase" }}>{member.role}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.48)", lineHeight: 1.65, marginBottom: 16 }}>{member.bio}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.28)" }}>{member.social}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: mobile ? "28px 20px" : "36px 40px", display: "flex", flexDirection: mobile ? "column" : "row", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
            <div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, marginBottom: 6 }}>Want to join our team?</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,.45)" }}>We're always looking for passionate advocates, developers, and researchers.</div>
            </div>
            <button className="cta" style={{ padding: "12px 28px", fontSize: 14, flexShrink: 0 }} onClick={() => setPage("contact")}>Get in Touch →</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════ MISSION ══════════════════════════ */}
      {page === "mission" && (
        <div style={{ animation: "fadeUp .6s ease both" }}>
          <section style={{ position: "relative", overflow: "hidden", padding: mobile ? "110px 20px 72px" : "140px 48px 96px", textAlign: "center" }}>
            <div style={{ position: "absolute", top: "10%", left: "5%", width: mobile?160:360, height: mobile?160:360, background: "radial-gradient(circle,rgba(232,197,109,.07) 0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom:"5%", right:"5%", width: mobile?120:260, height: mobile?120:260, background: "radial-gradient(circle,rgba(59,130,246,.05) 0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
            <button onClick={() => setPage("home")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.42)", cursor: "pointer", fontSize: 14, display: "block", marginBottom: 40, position: "relative", zIndex: 1 }}>← Back</button>
            <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(232,197,109,.1)", border: "1px solid rgba(232,197,109,.25)", borderRadius: 100, padding: "5px 14px", marginBottom: 24, fontSize: 12, color: "#e8c56d", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Our Mission</div>
              <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(36px,7vw,68px)", lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: 22 }}>
                Why We<br /><span style={{ background: "linear-gradient(135deg,#e8c56d,#f0d488,#c9972a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200%", animation: "gShift 4s ease infinite" }}>Exist</span>
              </h1>
              <p style={{ fontSize: mobile ? 15 : 17, color: "rgba(255,255,255,.5)", lineHeight: 1.75, fontWeight: 300 }}>Antisemitism doesn't disappear when it goes unreported. We exist to make sure every incident leaves a record, gets a response, and helps build a safer future for Jewish communities everywhere.</p>
            </div>
          </section>
          <section style={{ padding: mobile ? "0 16px 64px" : "0 48px 80px", maxWidth: 1060, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: mobile ? 10 : 16 }}>
              {[{ num:"2025",label:"Year Founded",icon:"📅"},{num:"10+",label:"Partner Orgs",icon:"🤝"},{num:"38",label:"States Reached",icon:"🗺️"},{num:"100%",label:"Volunteer-Led",icon:"❤️"}].map((s,i)=>(
                <div key={i} style={{ background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:mobile?"18px 14px":"22px 18px",textAlign:"center"}}>
                  <div style={{fontSize:24,marginBottom:8}}>{s.icon}</div>
                  <div style={{fontSize:"clamp(22px,4vw,32px)",fontWeight:800,color:"#e8c56d",fontFamily:"'DM Serif Display',serif",letterSpacing:-1,marginBottom:5}}>{s.num}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.42)",letterSpacing:"0.06em",textTransform:"uppercase"}}>{s.label}</div>
                </div>
              ))}
            </div>
          </section>
          <section style={{ padding: mobile ? "0 16px 72px" : "0 48px 88px", maxWidth: 1060, margin: "0 auto" }}>
            <p style={{ color:"#e8c56d",fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>What drives us</p>
            <h2 style={{ fontFamily:"'DM Serif Display',serif",fontSize:"clamp(24px,4vw,40px)",letterSpacing:"-0.02em",marginBottom:40}}>Our Core Pillars</h2>
            <div style={{ display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:20}}>
              {[
                {icon:"📢",color:"#e8c56d",title:"Amplify Voices",body:"Every report is a voice that deserves to be heard. We ensure incidents are documented with integrity and treated with the urgency they deserve. Silence is not an option."},
                {icon:"🛡️",color:"#3b82f6",title:"Protect Communities",body:"By identifying patterns and hotspots, we help communities, institutions, and law enforcement respond proactively to antisemitic threats before they escalate."},
                {icon:"📊",color:"#10b981",title:"Build the Record",body:"Our growing database of verified incidents gives researchers, journalists, and policymakers the evidence needed to understand the true scale of antisemitism."},
                {icon:"🌍",color:"#a78bfa",title:"Never Again — Together",body:"Transparency and documentation are our most powerful tools. Community solidarity, informed advocacy, and collective memory are how we honor the past and protect the future."},
              ].map((item,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:18,padding:mobile?"24px 20px":"32px 28px",transition:"all .25s",position:"relative",overflow:"hidden"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=`${item.color}40`;e.currentTarget.style.background=`${item.color}08`;e.currentTarget.style.transform="translateY(-2px)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.07)";e.currentTarget.style.background="rgba(255,255,255,.03)";e.currentTarget.style.transform="none";}}>
                  <div style={{position:"absolute",top:0,right:0,width:80,height:80,background:`radial-gradient(circle at 100% 0%, ${item.color}18 0%, transparent 70%)`,pointerEvents:"none"}}/>
                  <div style={{width:52,height:52,background:`${item.color}15`,border:`1px solid ${item.color}30`,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:20}}>{item.icon}</div>
                  <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,marginBottom:12,letterSpacing:"-0.01em"}}>{item.title}</h3>
                  <p style={{fontSize:14,color:"rgba(255,255,255,.5)",lineHeight:1.75}}>{item.body}</p>
                  <div style={{marginTop:20,width:32,height:3,background:`linear-gradient(90deg, ${item.color}, transparent)`,borderRadius:2}}/>
                </div>
              ))}
            </div>
          </section>
          <section style={{ padding: mobile ? "0 16px 72px" : "0 48px 88px", maxWidth: 1060, margin: "0 auto" }}>
            <p style={{color:"#e8c56d",fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>The process</p>
            <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:"clamp(24px,4vw,40px)",letterSpacing:"-0.02em",marginBottom:44}}>How We Handle Every Report</h2>
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {[{step:"01",title:"You Submit",desc:"A report is filed through our secure form — anonymously if preferred. You can include links, dates, and as much or as little detail as you're comfortable sharing.",icon:"📝"},{step:"02",title:"We Review",desc:"Our trained team reviews every submission within 24 hours, assessing severity, verifying details where possible, and assigning a case handler.",icon:"🔍"},{step:"03",title:"We Respond",desc:"Depending on the incident, we may connect you with legal resources, escalate to authorities, or add the case to our public incident database.",icon:"⚡"},{step:"04",title:"We Document",desc:"Every verified incident is recorded in our database, contributing to the growing body of evidence used by researchers, advocates, and policymakers.",icon:"📂"}].map((s,i,arr)=>(
                <div key={i} style={{display:"flex",gap:mobile?16:28,position:"relative"}}>
                  {i<arr.length-1&&<div style={{position:"absolute",left:mobile?19:23,top:52,bottom:0,width:2,background:"linear-gradient(to bottom, rgba(232,197,109,.3), rgba(232,197,109,.05))",zIndex:0}}/>}
                  <div style={{width:mobile?40:48,height:mobile?40:48,borderRadius:"50%",background:"linear-gradient(135deg,#e8c56d,#c9972a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,zIndex:1,marginTop:4}}>{s.icon}</div>
                  <div style={{paddingBottom:i<arr.length-1?40:0,flex:1}}>
                    <div style={{fontSize:11,color:"#e8c56d",fontWeight:700,letterSpacing:"0.1em",marginBottom:4}}>STEP {s.step}</div>
                    <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,marginBottom:8}}>{s.title}</h3>
                    <p style={{fontSize:14,color:"rgba(255,255,255,.48)",lineHeight:1.75,maxWidth:580}}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section style={{ padding: mobile ? "0 16px 72px" : "0 48px 88px", maxWidth: 1060, margin: "0 auto" }}>
            <div style={{background:"linear-gradient(135deg,rgba(232,197,109,.07),rgba(232,197,109,.02))",border:"1px solid rgba(232,197,109,.15)",borderRadius:22,padding:mobile?"32px 22px":"48px 48px"}}>
              <p style={{color:"#e8c56d",fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Our values</p>
              <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:"clamp(22px,4vw,36px)",letterSpacing:"-0.02em",marginBottom:32}}>What We Stand For</h2>
              <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(4,1fr)",gap:mobile?16:24}}>
                {[{icon:"🔒",label:"Confidentiality"},{icon:"⚖️",label:"Accountability"},{icon:"🌐",label:"Transparency"},{icon:"💙",label:"Community First"}].map((v,i)=>(
                  <div key={i} style={{textAlign:"center",padding:mobile?"16px 8px":"20px 12px"}}>
                    <div style={{fontSize:32,marginBottom:10}}>{v.icon}</div>
                    <div style={{fontSize:13,fontWeight:600,color:"#f0eee8",letterSpacing:"0.02em"}}>{v.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section style={{ padding: mobile ? "0 16px 80px" : "0 48px 100px", maxWidth: 1060, margin: "0 auto" }}>
            <div style={{background:"#0a0a0f",border:"1px solid rgba(255,255,255,.08)",borderRadius:22,padding:mobile?"36px 22px":"52px 52px",display:"flex",flexDirection:mobile?"column":"row",justifyContent:"space-between",alignItems:"center",gap:28}}>
              <div>
                <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:"clamp(20px,3vw,30px)",marginBottom:8}}>Ready to make a difference?</h3>
                <p style={{fontSize:14,color:"rgba(255,255,255,.45)",maxWidth:420,lineHeight:1.7}}>Every report you submit adds to the record and helps protect your community. It takes less than 2 minutes.</p>
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",flexShrink:0}}>
                <button className="cta" style={{fontSize:15,padding:"13px 28px"}} onClick={()=>goPage("Submit Offense")}>Report an Incident →</button>
                <button className="nav-btn" style={{fontSize:14,padding:"12px 20px",border:"1px solid rgba(255,255,255,.15)",borderRadius:10}} onClick={()=>goPage("Contact Us")}>Get in Touch</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ══════════════════════════ PRESS ══════════════════════════ */}
      {page === "press" && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: mobile ? "90px 16px 80px" : "118px 48px 80px", animation: "fadeUp .6s ease both" }}>
          <button onClick={() => setPage("home")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.42)", cursor: "pointer", fontSize: 14, marginBottom: 32 }}>← Back</button>
          <p style={{ color: "#e8c56d", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Newsroom</p>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(30px,5vw,52px)", letterSpacing: "-0.02em", marginBottom: 16 }}>Press Releases</h1>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,.5)", maxWidth: 580, marginBottom: 16, fontWeight: 300 }}>
            Official statements, platform announcements, and research publications from ReportASA.
          </p>

          {/* Press contact bar */}
          <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: 12, alignItems: mobile ? "stretch" : "center", marginBottom: 52, padding: "16px 20px", background: "rgba(232,197,109,.05)", border: "1px solid rgba(232,197,109,.15)", borderRadius: 14 }}>
            <div style={{ fontSize: 18, flexShrink: 0 }}>📬</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e8c56d", marginBottom: 2 }}>Press Inquiries</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>For media inquiries, interview requests, or press credentials, contact <span style={{ color: "#f0eee8" }}>press@reportasa.org</span> — we respond within 24 hours.</div>
            </div>
            <button className="cta" style={{ padding: "9px 20px", fontSize: 13, flexShrink: 0 }} onClick={() => setPage("contact")}>Contact Press Team →</button>
          </div>

          {/* Releases list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {PRESS_RELEASES.map((pr, i) => {
              const isExpanded = expandedPress === i;
              const catColor   = PRESS_CATEGORY_COLORS[pr.category] || "#888";
              return (
                <div key={i} className="press-card" onClick={() => setExpandedPress(isExpanded ? null : i)}
                  style={{ background: isExpanded ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.03)", borderColor: isExpanded ? "rgba(232,197,109,.25)" : "rgba(255,255,255,.08)" }}>
                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: catColor, background: `${catColor}15`, border: `1px solid ${catColor}30`, borderRadius: 100, padding: "3px 10px", whiteSpace: "nowrap" }}>{pr.category}</span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>{pr.date}</span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,.25)" }}>· {pr.readTime}</span>
                    </div>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,.3)", transition: "transform .2s", transform: isExpanded ? "rotate(180deg)" : "none", flexShrink: 0, marginTop: 2 }}>▼</span>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: mobile ? 17 : 20, lineHeight: 1.35, letterSpacing: "-0.01em", color: "#f0eee8", marginBottom: isExpanded ? 16 : 0 }}>
                    {pr.title}
                  </h3>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 16 }}>
                      <p style={{ fontSize: 14, color: "rgba(255,255,255,.6)", lineHeight: 1.75, marginBottom: 20 }}>{pr.excerpt}</p>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="cta" style={{ fontSize: 12, padding: "8px 18px" }} onClick={e => { e.stopPropagation(); setPage("contact"); }}>
                          Request Full Release →
                        </button>
                        <button style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "8px 16px", color: "rgba(255,255,255,.6)", fontSize: 12, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}
                          onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(window.location.href); }}>
                          Share 🔗
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Media kit CTA */}
          <div style={{ marginTop: 52, background: "linear-gradient(135deg,rgba(232,197,109,.07),rgba(232,197,109,.02))", border: "1px solid rgba(232,197,109,.15)", borderRadius: 18, padding: mobile ? "28px 22px" : "36px 40px", display: "flex", flexDirection: mobile ? "column" : "row", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
            <div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: mobile ? 20 : 24, marginBottom: 8 }}>📁 Media Kit</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,.45)", lineHeight: 1.65, maxWidth: 420 }}>Download our press kit including logos, founder bios, platform statistics, and editorial guidelines for journalists and partners.</div>
            </div>
            <button className="cta" style={{ padding: "12px 24px", fontSize: 14, flexShrink: 0 }} onClick={() => setPage("contact")}>
              Request Media Kit →
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════ LOGIN / PROFILE ══════════════════════════ */}
      {page === "login" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: mobile ? "90px 16px 80px" : "110px 24px 80px", animation: "fadeUp .6s ease both" }}>
          {user ? (
            <>
              <button onClick={() => setPage("home")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.42)", cursor: "pointer", fontSize: 14, marginBottom: 32 }}>← Back</button>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, padding: "22px 24px", background: "linear-gradient(135deg,rgba(232,197,109,.08),rgba(232,197,109,.03))", border: "1px solid rgba(232,197,109,.2)", borderRadius: 18 }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg,#e8c56d,#c9972a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#0a0a0f", flexShrink: 0 }}>{user.name?.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, marginBottom: 2 }}>{user.name}</div>
                  {user.title && <div style={{ fontSize: 12, color: "#e8c56d", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 2 }}>{user.title}</div>}
                  {user.department && <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>{user.department}</div>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                {[{ label:"Email",value:user.email,icon:"✉️"},{label:"Role",value:user.role,icon:"🔑"},{label:"Member since",value:user.createdAt?new Date(user.createdAt).toLocaleDateString("en-US",{month:"long",year:"numeric"}):"—",icon:"📅"},{label:"Last login",value:user.lastLoginAt?new Date(user.lastLoginAt).toLocaleString():"—",icon:"🕐"}].map((row,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:12,padding:"12px 14px"}}>
                    <span style={{fontSize:17,flexShrink:0}}>{row.icon}</span>
                    <div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,.35)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:2}}>{row.label}</div>
                      <div style={{fontSize:13,fontWeight:500}}>{row.value||"—"}</div>
                    </div>
                  </div>
                ))}
                {user.bio && (
                  <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:12,padding:"12px 14px"}}>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.35)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Bio</div>
                    <div style={{fontSize:13,color:"rgba(255,255,255,.65)",lineHeight:1.6}}>{user.bio}</div>
                  </div>
                )}
              </div>
              {/* Change password */}
              <div style={{ background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"18px 18px",marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>🔐 <span>Change Password</span></div>
                {changePassSt === "success" ? (
                  <div style={{background:"rgba(16,185,129,.07)",border:"1px solid rgba(16,185,129,.2)",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#10b981"}}>
                    ✓ Password changed successfully.
                    <button style={{background:"none",border:"none",color:"rgba(255,255,255,.4)",fontSize:12,cursor:"pointer",marginLeft:8}} onClick={()=>setChangePassSt("idle")}>Dismiss</button>
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:11}}>
                    <div><label style={LABEL}>Current Password</label><input className="input-field" type="password" placeholder="••••••••" value={changePassForm.current} onChange={e=>setChangePassForm(p=>({...p,current:e.target.value}))}/></div>
                    <div><label style={LABEL}>New Password</label><input className="input-field" type="password" placeholder="Min. 8 characters" value={changePassForm.newPass} onChange={e=>setChangePassForm(p=>({...p,newPass:e.target.value}))}/></div>
                    <div><label style={LABEL}>Confirm New Password</label><input className="input-field" type="password" placeholder="Repeat new password" value={changePassForm.confirm} onChange={e=>setChangePassForm(p=>({...p,confirm:e.target.value}))}/></div>
                    {changePassErr && <div style={{background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.22)",borderRadius:8,padding:"10px 12px",fontSize:13,color:"#ef4444"}}>⚠ {changePassErr}</div>}
                    <button className="cta" style={{padding:"11px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={handleChangePassword} disabled={changePassSt==="loading"||!changePassForm.current||!changePassForm.newPass}>
                      {changePassSt==="loading"?<><Spinner/> Changing…</>:"Change Password →"}
                    </button>
                  </div>
                )}
              </div>
              <button onClick={handleLogout} style={{width:"100%",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.25)",color:"#ef4444",borderRadius:10,padding:13,fontSize:14,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontWeight:600,transition:"all .2s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,.14)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,.08)"}>Sign Out</button>
            </>
          ) : authView === "forgot" ? (
            <>
              <button onClick={()=>{setAuthView("login");setForgotSt("idle");setForgotEmail("");}} style={{background:"none",border:"none",color:"rgba(255,255,255,.42)",cursor:"pointer",fontSize:14,marginBottom:32}}>← Back to login</button>
              <div style={{textAlign:"center",marginBottom:32}}>
                <div style={{width:52,height:52,background:"linear-gradient(135deg,#e8c56d,#c9972a)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 18px"}}>🔑</div>
                <h1 style={{fontFamily:"'DM Serif Display',serif",fontSize:28,letterSpacing:"-0.02em",marginBottom:6}}>Reset Password</h1>
                <p style={{color:"rgba(255,255,255,.38)",fontSize:14,lineHeight:1.6}}>Enter your email address and we'll send you a reset link.</p>
              </div>
              {forgotSt === "success" ? (
                <div style={{background:"rgba(16,185,129,.07)",border:"1px solid rgba(16,185,129,.22)",borderRadius:14,padding:"28px 24px",textAlign:"center"}}>
                  <div style={{fontSize:42,marginBottom:12}}>📬</div>
                  <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:"#10b981",marginBottom:8}}>Check your inbox</h3>
                  <p style={{fontSize:13,color:"rgba(255,255,255,.45)",marginBottom:20,lineHeight:1.65}}>If <strong style={{color:"#f0eee8"}}>{forgotEmail}</strong> is registered, you'll receive a reset link shortly.</p>
                  {resetToken && <button className="cta" style={{fontSize:13,padding:"10px 22px",marginBottom:12}} onClick={()=>{setAuthView("reset");setForgotSt("idle")}}>[DEV] Continue to Reset Form →</button>}
                  <div><button style={{background:"none",border:"none",color:"#e8c56d",fontSize:13,cursor:"pointer"}} onClick={()=>{setAuthView("login");setForgotSt("idle");setForgotEmail("");setResetToken("");}}>Back to login →</button></div>
                </div>
              ) : (
                <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.09)",borderRadius:18,padding:mobile?20:26}}>
                  <div style={{display:"flex",flexDirection:"column",gap:14}}>
                    <div><label style={LABEL}>Email Address *</label><input className="input-field" type="email" placeholder="you@example.com" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleForgotPassword()}/></div>
                    <button className="cta" style={{padding:"13px",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} disabled={forgotSt==="loading"||!forgotEmail} onClick={handleForgotPassword}>
                      {forgotSt==="loading"?<><Spinner/>Sending…</>:"Send Reset Link →"}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : authView === "reset" ? (
            <>
              <button onClick={()=>{setAuthView("login");setResetSt("idle");setResetErr("");setResetForm({newPassword:"",confirm:""}); }} style={{background:"none",border:"none",color:"rgba(255,255,255,.42)",cursor:"pointer",fontSize:14,marginBottom:32}}>← Back to login</button>
              <div style={{textAlign:"center",marginBottom:32}}>
                <div style={{width:52,height:52,background:"linear-gradient(135deg,#e8c56d,#c9972a)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 18px"}}>🔐</div>
                <h1 style={{fontFamily:"'DM Serif Display',serif",fontSize:28,letterSpacing:"-0.02em",marginBottom:6}}>New Password</h1>
                <p style={{color:"rgba(255,255,255,.38)",fontSize:14}}>Choose a strong password for your account.</p>
              </div>
              {resetSt === "success" ? (
                <div style={{background:"rgba(16,185,129,.07)",border:"1px solid rgba(16,185,129,.22)",borderRadius:14,padding:"32px 24px",textAlign:"center"}}>
                  <div style={{fontSize:50,marginBottom:14}}>✓</div>
                  <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:24,color:"#10b981",marginBottom:8}}>Password Reset!</h3>
                  <p style={{color:"rgba(255,255,255,.45)",fontSize:14,marginBottom:24,lineHeight:1.65}}>Your password has been changed. You can now sign in with your new password.</p>
                  <button className="cta" style={{fontSize:14,padding:"12px 28px"}} onClick={()=>{setAuthView("login");setResetSt("idle");setResetForm({newPassword:"",confirm:""});setResetToken("");}}>Sign In →</button>
                </div>
              ) : (
                <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.09)",borderRadius:18,padding:mobile?20:26}}>
                  <div style={{display:"flex",flexDirection:"column",gap:14}}>
                    <div>
                      <label style={LABEL}>New Password *</label>
                      <input className="input-field" type="password" placeholder="Min. 8 characters" value={resetForm.newPassword} onChange={e=>setResetForm(p=>({...p,newPassword:e.target.value}))}/>
                    </div>
                    <div>
                      <label style={LABEL}>Confirm Password *</label>
                      <input className="input-field" type="password" placeholder="Repeat your new password" value={resetForm.confirm} onChange={e=>setResetForm(p=>({...p,confirm:e.target.value}))}/>
                      {resetForm.newPassword && (() => {
                        const p=resetForm.newPassword;
                        const strong=p.length>=12&&/[A-Z]/.test(p)&&/[0-9]/.test(p)&&/[^A-Za-z0-9]/.test(p);
                        const medium=p.length>=8&&(/[A-Z]/.test(p)||/[0-9]/.test(p));
                        const label=strong?"Strong":medium?"Medium":"Weak";
                        const color=strong?"#10b981":medium?"#f59e0b":"#ef4444";
                        const w=strong?"100%":medium?"60%":"25%";
                        return <div style={{marginTop:8}}><div style={{height:3,background:"rgba(255,255,255,.07)",borderRadius:2,marginBottom:5}}><div style={{height:"100%",width:w,background:color,borderRadius:2,transition:"width .3s, background .3s"}}/></div><span style={{fontSize:11,color,fontWeight:600}}>{label} password</span></div>;
                      })()}
                    </div>
                    {resetErr && <div style={{background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.22)",borderRadius:10,padding:"11px 14px",fontSize:13,color:"#ef4444"}}>⚠ {resetErr}</div>}
                    <button className="cta" style={{padding:"13px",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} disabled={resetSt==="loading"||!resetForm.newPassword||!resetForm.confirm||!resetToken} onClick={handleResetPassword}>
                      {resetSt==="loading"?<><Spinner/>Saving…</>:"Set New Password →"}
                    </button>
                    {!resetToken && <p style={{fontSize:12,color:"rgba(239,68,68,.7)",textAlign:"center"}}>⚠ No reset token found. Please use the link from your email.</p>}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{textAlign:"center",marginBottom:32}}>
                <div style={{width:52,height:52,background:"linear-gradient(135deg,#e8c56d,#c9972a)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 18px"}}>✡</div>
                <h1 style={{fontFamily:"'DM Serif Display',serif",fontSize:30,letterSpacing:"-0.02em",marginBottom:6}}>{authView==="login"?"Welcome Back":"Create Account"}</h1>
                <p style={{color:"rgba(255,255,255,.38)",fontSize:14}}>{authView==="login"?"Sign in to your ReportASA account":"Join the ReportASA team"}</p>
              </div>
              <div style={{display:"flex",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:4,marginBottom:26}}>
                {["login","register"].map(v=>(
                  <button key={v} onClick={()=>{setAuthView(v);setAuthSt("idle");setAuthErr("");}}
                    style={{flex:1,background:authView===v?"rgba(232,197,109,.15)":"none",border:authView===v?"1px solid rgba(232,197,109,.3)":"1px solid transparent",borderRadius:7,padding:"9px 0",fontSize:13,fontWeight:600,color:authView===v?"#e8c56d":"rgba(255,255,255,.45)",cursor:"pointer",fontFamily:"'Outfit',sans-serif",transition:"all .2s"}}>
                    {v==="login"?"Sign In":"Register"}
                  </button>
                ))}
              </div>
              <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.09)",borderRadius:18,padding:mobile?20:26}}>
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {authView==="register"&&(
                    <>
                      <div><label style={LABEL}>Full Name *</label><input className="input-field" placeholder="Jane Smith" value={authForm.name} onChange={e=>setAuthForm(p=>({...p,name:e.target.value}))}/></div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                        <div><label style={LABEL}>Title</label><input className="input-field" placeholder="e.g. Advocate" value={authForm.title} onChange={e=>setAuthForm(p=>({...p,title:e.target.value}))}/></div>
                        <div><label style={LABEL}>Department</label><input className="input-field" placeholder="e.g. Outreach" value={authForm.department} onChange={e=>setAuthForm(p=>({...p,department:e.target.value}))}/></div>
                      </div>
                      <div><label style={LABEL}>Bio <span style={{color:"rgba(255,255,255,.3)",fontWeight:400}}>(optional)</span></label><textarea className="input-field" rows={2} placeholder="A short bio…" style={{resize:"none"}} value={authForm.bio} onChange={e=>setAuthForm(p=>({...p,bio:e.target.value}))}/></div>
                    </>
                  )}
                  <div><label style={LABEL}>Email Address *</label><input className="input-field" type="email" placeholder="you@example.com" value={authForm.email} onChange={e=>setAuthForm(p=>({...p,email:e.target.value}))}/></div>
                  <div><label style={LABEL}>Password *</label><input className="input-field" type="password" placeholder={authView==="register"?"Min. 8 characters":"••••••••"} value={authForm.password} onChange={e=>setAuthForm(p=>({...p,password:e.target.value}))}/></div>
                  {authView==="login"&&(
                    <div style={{display:"flex",justifyContent:"flex-end"}}>
                      <button style={{background:"none",border:"none",color:"#e8c56d",fontSize:13,cursor:"pointer"}} onClick={()=>{setAuthView("forgot");setAuthSt("idle");setAuthErr("");}}>Forgot password?</button>
                    </div>
                  )}
                  {authErr&&<div style={{background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.22)",borderRadius:10,padding:"11px 14px",fontSize:13,color:"#ef4444"}}>⚠ {authErr}</div>}
                  <button className="cta" style={{padding:"13px",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} disabled={authSt==="loading"} onClick={authView==="login"?handleLogin:handleRegister}>
                    {authSt==="loading"?<><Spinner/>{authView==="login"?"Signing in…":"Creating account…"}</>:authView==="login"?"Sign In →":"Create Account →"}
                  </button>
                  <p style={{textAlign:"center",fontSize:13,color:"rgba(255,255,255,.32)"}}>
                    {authView==="login"?"No account? ":"Already have one? "}
                    <button style={{background:"none",border:"none",color:"#e8c56d",cursor:"pointer",fontSize:13}} onClick={()=>{setAuthView(authView==="login"?"register":"login");setAuthSt("idle");setAuthErr("");}}>
                      {authView==="login"?"Create one →":"Sign in →"}
                    </button>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════ CONTACT ══════════════════════════ */}
      {page === "contact" && (
        <div style={{ maxWidth: 780, margin: "0 auto", padding: mobile ? "90px 16px 80px" : "118px 24px 80px", animation: "fadeUp .6s ease both" }}>
          <button onClick={() => setPage("home")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.42)", cursor: "pointer", fontSize: 14, marginBottom: 32 }}>← Back</button>
          <p style={{ color: "#e8c56d", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Get in touch</p>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(30px,5vw,52px)", letterSpacing: "-0.02em", marginBottom: 12 }}>Contact Us</h1>
          <p style={{ color: "rgba(255,255,255,.45)", fontSize: 15, marginBottom: 48, lineHeight: 1.7, maxWidth: 560 }}>Have a question, want to partner with us, or need help with a report? We're here. Reach out and our team will respond within 48 hours.</p>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 40 : 56, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[{icon:"✉️",label:"Email",value:"hello@reportasa.org",sub:"General inquiries & partnerships"},{icon:"🔒",label:"Secure Tips",value:"secure@reportasa.org",sub:"Sensitive or confidential matters"},{icon:"📞",label:"Hotline",value:"1-800-REPORT-ASA",sub:"Mon–Fri, 9am–6pm EST"},{icon:"🐦",label:"Twitter / X",value:"@ReportASA",sub:"Follow for updates"}].map((c,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"18px 20px",display:"flex",gap:16,alignItems:"flex-start",transition:"border-color .2s, background .2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(232,197,109,.04)";e.currentTarget.style.borderColor="rgba(232,197,109,.2)";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.03)";e.currentTarget.style.borderColor="rgba(255,255,255,.08)";}}>
                  <div style={{width:40,height:40,background:"rgba(232,197,109,.1)",border:"1px solid rgba(232,197,109,.2)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{c.icon}</div>
                  <div>
                    <div style={{fontSize:11,color:"#e8c56d",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>{c.label}</div>
                    <div style={{fontSize:14,fontWeight:600,color:"#f0eee8",marginBottom:2}}>{c.value}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,.38)"}}>{c.sub}</div>
                  </div>
                </div>
              ))}
              <div style={{background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.2)",borderRadius:12,padding:"14px 18px",display:"flex",gap:12,alignItems:"center"}}>
                <span style={{fontSize:18}}>⚡</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"#10b981",marginBottom:2}}>Fast Response</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>Urgent safety concerns are prioritized — typically responded to within 4 hours.</div>
                </div>
              </div>
            </div>
            <div style={{background:"rgba(232,197,109,.04)",border:"1px solid rgba(232,197,109,.13)",borderRadius:18,padding:mobile?20:28}}>
              {contactSt === "success" ? (
                <div style={{textAlign:"center",padding:"32px 0"}}>
                  <div style={{fontSize:48,marginBottom:14}}>✓</div>
                  <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:24,color:"#10b981",marginBottom:8}}>Message Sent!</h3>
                  <p style={{fontSize:14,color:"rgba(255,255,255,.45)",marginBottom:24}}>We'll get back to you within 48 hours.</p>
                  <button className="cta" style={{padding:"10px 24px",fontSize:13}} onClick={()=>{setContactSt("idle");setContactForm(blankContact);}}>Send Another</button>
                </div>
              ) : (
                <>
                  <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,marginBottom:4}}>Send a Message</h3>
                  <p style={{fontSize:13,color:"rgba(255,255,255,.38)",marginBottom:22}}>We read every message personally.</p>
                  <div style={{display:"flex",flexDirection:"column",gap:14}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      <div><label style={LABEL}>Your Name</label><input className="input-field" placeholder="Jane Smith" value={contactForm.name} onChange={e=>setContactForm(p=>({...p,name:e.target.value}))}/></div>
                      <div><label style={LABEL}>Email *</label><input className="input-field" type="email" placeholder="you@example.com" value={contactForm.email} onChange={e=>setContactForm(p=>({...p,email:e.target.value}))}/></div>
                    </div>
                    <div><label style={LABEL}>Subject</label>
                      <select className="input-field" value={contactForm.subject} onChange={e=>setContactForm(p=>({...p,subject:e.target.value}))}>
                        <option value="">Select a topic...</option>
                        <option>General Inquiry</option><option>Partnership / Media</option><option>Help with a Report</option><option>Technical Issue</option><option>Urgent Safety Concern</option><option>Press / Media Request</option><option>Other</option>
                      </select>
                    </div>
                    <div><label style={LABEL}>Message *</label><textarea className="input-field" rows={5} placeholder="How can we help you?" style={{resize:"vertical"}} value={contactForm.message} onChange={e=>setContactForm(p=>({...p,message:e.target.value}))}/></div>
                    {contactSt==="error"&&<div style={{background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.22)",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#ef4444"}}>⚠ Could not send message. Please email us directly.</div>}
                    <button className="cta" style={{padding:"13px",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} disabled={contactSt==="loading"}
                      onClick={async()=>{
                        if(!contactForm.email||!contactForm.message)return;
                        setContactSt("loading");
                        try{const res=await fetch(`${API_BASE}/api/contact`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(contactForm)});if(!res.ok)throw new Error();setContactSt("success");}
                        catch{setContactSt("error");}
                      }}>
                      {contactSt==="loading"?<><Spinner/> Sending…</>:"Send Message →"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.07)", padding: "32px 20px", textAlign: "center", color: "rgba(255,255,255,.18)", fontSize: 12 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
          {["About Us", "Our Mission", "Press", "Submit Offense", "Contact Us"].map(l => (
            <button key={l} onClick={() => goPage(l)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.35)", fontSize: 12, cursor: "pointer", fontFamily: "'Outfit',sans-serif", transition: "color .2s" }}
              onMouseEnter={e => e.currentTarget.style.color = "#e8c56d"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.35)"}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 4 }}>✡ ReportASA — Standing Against Antisemitism</div>
        <div>All reports are confidential. © 2026 ReportASA. All rights reserved.</div>
      </footer>
    </div>
  );
}

function Spinner() {
  return <span style={{ width: 15, height: 15, border: "2px solid #0a0a0f", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />;
}