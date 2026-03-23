import { useState, useEffect, useRef } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = "http://192.168.12.187:3001"; // ← http not https for local dev
// GET  /api/stats          → { reports_submitted, cases_resolved_pct, states_covered, community_members }
// GET  /api/reports/recent → [{ location, type, time, status }, ...]
// POST /api/reports        → { type, date, location, org, description, contact, anonymous, links[] }

const NAV_LINKS = ["About Us", "Submit Offense", "Our Mission", "Contact Us", "Login"];

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

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth);
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

  const [page,        setPage]        = useState("home");
  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [statsVis,    setStatsVis]    = useState(false);

  // API data
  const [apiStats,    setApiStats]    = useState({ reports_submitted: 0, cases_resolved_pct: 0, states_covered: 0, community_members: 0 });
  const [feed,        setFeed]        = useState(FALLBACK_REPORTS);

  // Full form
  const blankForm = { type: "", date: "", location: "", org: "", description: "", contact: "", anonymous: true };
  const [form,        setForm]        = useState(blankForm);
  const [links,       setLinks]       = useState([]);
  const [submitSt,    setSubmitSt]    = useState("idle"); // idle|loading|success|error
  const [submitErr,   setSubmitErr]   = useState("");

  // Contact form
  const blankContact = { name: "", email: "", subject: "", message: "" };
  const [contactForm,   setContactForm]   = useState(blankContact);
  const [contactSt,     setContactSt]     = useState("idle"); // idle|loading|success|error

  // Auth state
  const [user,        setUser]        = useState(null);   // null = not logged in
  const [authView,    setAuthView]    = useState("login"); // "login" | "register"
  const [authForm,    setAuthForm]    = useState({ email: "", password: "", name: "", title: "", department: "", bio: "" });
  const [authSt,      setAuthSt]      = useState("idle"); // idle|loading|error
  const [authErr,     setAuthErr]     = useState("");

  // Restore session from cookie on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setUser(d.user); })
      .catch(() => {});
  }, []);

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
    } catch (e) { setAuthSt("error"); setAuthErr(e.message); }
  };

  const handleLogout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
    setPage("home");
  };

  // Quick form — removed (quick widget replaced with expanded feed)

  // Fetch stats + feed, then refresh every 30s
  useEffect(() => {
    const fetchAll = () => {
      fetch(`${API_BASE}/api/stats`)
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(d => setApiStats({
          reports_submitted:  d.reports_submitted  ?? 0,
          cases_resolved_pct: d.cases_resolved_pct ?? 0,
          states_covered:     d.states_covered     ?? 0,
          community_members:  d.community_members  ?? 0,
        }))
        .catch(() => {}); // keep defaults at 0 on failure

      // /api/feed is the curated homepage feed (managed separately from raw reports)
      fetch(`${API_BASE}/api/feed`)
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(d => { if (Array.isArray(d) && d.length) setFeed(d); })
        .catch(() => {}); // keep fallback data on failure
    };

    fetchAll();
    const interval = setInterval(fetchAll, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Scroll listener
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Stats intersection
  useEffect(() => {
    if (page !== "home") return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVis(true); }, { threshold: 0.2 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, [page]);

  const goPage = (label) => {
    const map = { "About Us": "about", "Submit Offense": "submit", "Our Mission": "mission", "Login": "login", "Contact Us": "contact" };
    setPage(map[label] || "home");
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

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#f0eee8", fontFamily: "'Outfit',sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
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
      `}</style>

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: scrolled ? "rgba(10,10,15,.95)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? "1px solid rgba(255,255,255,.06)" : "none", transition: "all .3s", padding: "0 20px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => { setPage("home"); window.scrollTo({ top: 0 }); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#e8c56d,#c9972a)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>✡</div>
          <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, color: "#f0eee8" }}>ReportASA</span>
        </button>

        {/* desktop */}
        {!mobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {NAV_LINKS.filter(l => l !== "Login").map(l => l === "Submit Offense"
              ? <button key={l} className="cta" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => goPage(l)}>{l}</button>
              : <button key={l} className="nav-btn" onClick={() => goPage(l)}>{l}</button>
            )}
            {user ? (
              <button onClick={() => setPage("login")} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(232,197,109,.08)", border: "1px solid rgba(232,197,109,.2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginLeft: 4 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#e8c56d,#c9972a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#0a0a0f", fontWeight: 700 }}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#e8c56d", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name?.split(" ")[0]}</span>
              </button>
            ) : (
              <button className="nav-btn" onClick={() => goPage("Login")}>Login</button>
            )}
          </div>
        )}

        {/* hamburger */}
        {mobile && (
          <button onClick={() => setMenuOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: 5, padding: 4 }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ display: "block", width: 23, height: 2, background: "#f0eee8", borderRadius: 2, transition: "all .25s", transform: menuOpen && i===0 ? "rotate(45deg) translate(5px,5px)" : menuOpen && i===2 ? "rotate(-45deg) translate(5px,-5px)" : "none", opacity: menuOpen && i===1 ? 0 : 1 }} />
            ))}
          </button>
        )}
      </nav>

      {/* mobile drawer */}
      {mobile && menuOpen && (
        <div style={{ position: "fixed", top: 62, left: 0, right: 0, bottom: 0, zIndex: 150, background: "rgba(10,10,15,.98)", backdropFilter: "blur(20px)", padding: "20px 28px", animation: "fadeUp .2s ease" }}>
          {NAV_LINKS.map(l => (
            <button key={l} className="mob-item" onClick={() => goPage(l)} style={{ color: l === "Submit Offense" ? "#e8c56d" : "#f0eee8" }}>{l}</button>
          ))}
        </div>
      )}

      {/* ══════════════════════════ HOME ══════════════════════════ */}
      {page === "home" && (
        <>
          {/* Hero */}
          <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: mobile ? "96px 20px 56px" : "120px 24px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "12%", left: "4%",  width: mobile?180:380, height: mobile?180:380, background: "radial-gradient(circle,rgba(232,197,109,.08) 0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
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
              <div style={{ position: "absolute", bottom:"26%", left: "7%",  fontSize: 18, color: "rgba(232,197,109,.08)", animation: "float 8s ease-in-out infinite 2s", pointerEvents: "none" }}>✡</div>
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

          {/* Feed — full width, expanded */}
          <section style={{ padding: mobile ? "16px 16px 56px" : "36px 24px 72px", maxWidth: 1060, margin: "0 auto" }}>
            <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", justifyContent: "space-between", alignItems: mobile ? "flex-start" : "flex-end", gap: 16, marginBottom: 28 }}>
              <div>
                <p style={{ color: "#e8c56d", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Live feed</p>
                <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(22px,3vw,36px)", letterSpacing: "-0.02em" }}>Recent Reports</h2>
              </div>
              <button className="cta" style={{ padding: "10px 22px", fontSize: 13, flexShrink: 0 }} onClick={() => goPage("Submit Offense")}>+ Submit a Report</button>
            </div>

            {/* Summary bar */}
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(3,1fr)" : "repeat(3,1fr)", gap: mobile ? 8 : 14, marginBottom: 24 }}>
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

            {/* Report rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {feed.map((r, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: mobile ? "14px 15px" : "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, transition: "background .2s, border-color .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.07)"; }}
                >
                  {/* Left: type + meta */}
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
                  {/* Right: status badge */}
                  <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[r.status] || "#888", background: `${STATUS_COLOR[r.status] || "#888"}1a`, border: `1px solid ${STATUS_COLOR[r.status] || "#888"}35`, borderRadius: 100, padding: "4px 12px", whiteSpace: "nowrap", flexShrink: 0 }}>{r.status}</span>
                </div>
              ))}
            </div>

            {feed.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,.3)", fontSize: 14 }}>No reports yet.</div>
            )}
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

          {/* Mission strip */}
          <div style={{ background: "linear-gradient(135deg,rgba(232,197,109,.08),rgba(232,197,109,.03))", border: "1px solid rgba(232,197,109,.18)", borderRadius: 18, padding: mobile ? "24px 20px" : "28px 36px", marginBottom: 64, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 36 }}>✡</div>
            <div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, marginBottom: 6 }}>Our Commitment</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,.5)", lineHeight: 1.7, maxWidth: 560 }}>Every report is treated with confidentiality, urgency, and care. We never share personal information without consent, and we always follow up.</div>
            </div>
          </div>

          {/* Team heading */}
          <p style={{ color: "#e8c56d", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>The team</p>
          <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(24px,4vw,38px)", letterSpacing: "-0.02em", marginBottom: 36 }}>People Behind the Platform</h2>

          {/* Team grid */}
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(auto-fill,minmax(260px,1fr))", gap: 20, marginBottom: 64 }}>
            {[
              { name: "Sarah Cohen",      role: "Founder & Executive Director", emoji: "👩‍💼", bio: "Founded ReportASA after personally experiencing antisemitism go unaddressed in her neighborhood.", social: "@sarahcohen" },
              { name: "David Levine",     role: "Lead Developer",               emoji: "👨‍💻", bio: "Full-stack engineer with 10+ years of experience building community safety tools.", social: "@dlevine_dev" },
              { name: "Rachel Goldberg",  role: "Head of Community Outreach",   emoji: "👩‍🤝‍👩", bio: "Connects ReportASA with local organizations, synagogues, and advocacy groups nationwide.", social: "@rachelg" },
              { name: "Michael Stern",    role: "Legal Advisor",                emoji: "⚖️",  bio: "Civil rights attorney who ensures every report is handled in accordance with applicable law.", social: "@msternlaw" },
              { name: "Alyssa Weiss",     role: "Data & Research Analyst",      emoji: "📊",  bio: "Transforms incident data into actionable insights that inform policy and advocacy work.", social: "@alyssaweiss" },
              { name: "Jordan Katz",      role: "Operations Manager",           emoji: "🗂️",  bio: "Keeps the team running smoothly and ensures every submission receives a timely response.", social: "@jordankatz" },
            ].map((member, i) => (
              <div key={i}
                style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "24px 22px", transition: "all .25s", cursor: "default" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(232,197,109,.05)"; e.currentTarget.style.borderColor = "rgba(232,197,109,.25)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"; e.currentTarget.style.transform = "none"; }}
              >
                {/* Avatar */}
                <div style={{ width: 56, height: 56, background: "linear-gradient(135deg,rgba(232,197,109,.2),rgba(201,151,42,.15))", border: "1px solid rgba(232,197,109,.25)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 16 }}>
                  {member.emoji}
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 3 }}>{member.name}</div>
                <div style={{ fontSize: 12, color: "#e8c56d", fontWeight: 600, letterSpacing: "0.04em", marginBottom: 12, textTransform: "uppercase" }}>{member.role}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.48)", lineHeight: 1.65, marginBottom: 16 }}>{member.bio}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.28)" }}>{member.social}</div>
              </div>
            ))}
          </div>

          {/* Join CTA */}
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

          {/* Hero banner */}
          <section style={{ position: "relative", overflow: "hidden", padding: mobile ? "110px 20px 72px" : "140px 48px 96px", textAlign: "center" }}>
            <div style={{ position: "absolute", top: "10%", left: "5%",  width: mobile?160:360, height: mobile?160:360, background: "radial-gradient(circle,rgba(232,197,109,.07) 0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom:"5%",  right:"5%", width: mobile?120:260, height: mobile?120:260, background: "radial-gradient(circle,rgba(59,130,246,.05) 0%,transparent 70%)",  borderRadius: "50%", pointerEvents: "none" }} />
            <button onClick={() => setPage("home")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.42)", cursor: "pointer", fontSize: 14, display: "block", marginBottom: 40, position: "relative", zIndex: 1 }}>← Back</button>
            <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(232,197,109,.1)", border: "1px solid rgba(232,197,109,.25)", borderRadius: 100, padding: "5px 14px", marginBottom: 24, fontSize: 12, color: "#e8c56d", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Our Mission
              </div>
              <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(36px,7vw,68px)", lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: 22 }}>
                Why We<br />
                <span style={{ background: "linear-gradient(135deg,#e8c56d,#f0d488,#c9972a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200%", animation: "gShift 4s ease infinite" }}>Exist</span>
              </h1>
              <p style={{ fontSize: mobile ? 15 : 17, color: "rgba(255,255,255,.5)", lineHeight: 1.75, fontWeight: 300 }}>
                Antisemitism doesn't disappear when it goes unreported. We exist to make sure every incident leaves a record, gets a response, and helps build a safer future for Jewish communities everywhere.
              </p>
            </div>
          </section>

          {/* Big stat strip */}
          <section style={{ padding: mobile ? "0 16px 64px" : "0 48px 80px", maxWidth: 1060, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: mobile ? 10 : 16 }}>
              {[
                { num: "2026",  label: "Year Founded",        icon: "📅" },
                { num: "50+",   label: "Partner Orgs",         icon: "🤝" },
                { num: "38",    label: "States Reached",       icon: "🗺️" },
                { num: "100%",  label: "Volunteer-Led",        icon: "❤️" },
              ].map((s, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: mobile ? "18px 14px" : "22px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 800, color: "#e8c56d", fontFamily: "'DM Serif Display',serif", letterSpacing: -1, marginBottom: 5 }}>{s.num}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.42)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Core pillars */}
          <section style={{ padding: mobile ? "0 16px 72px" : "0 48px 88px", maxWidth: 1060, margin: "0 auto" }}>
            <p style={{ color: "#e8c56d", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>What drives us</p>
            <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(24px,4vw,40px)", letterSpacing: "-0.02em", marginBottom: 40 }}>Our Core Pillars</h2>

            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 20 }}>
              {[
                { icon: "📢", color: "#e8c56d", title: "Amplify Voices",        body: "Every report is a voice that deserves to be heard. We ensure incidents are documented with integrity and treated with the urgency they deserve. Silence is not an option." },
                { icon: "🛡️", color: "#3b82f6", title: "Protect Communities",   body: "By identifying patterns and hotspots, we help communities, institutions, and law enforcement respond proactively to antisemitic threats before they escalate." },
                { icon: "📊", color: "#10b981", title: "Build the Record",       body: "Our growing database of verified incidents gives researchers, journalists, and policymakers the evidence needed to understand the true scale of antisemitism." },
                { icon: "🌍", color: "#a78bfa", title: "Never Again — Together", body: "Transparency and documentation are our most powerful tools. Community solidarity, informed advocacy, and collective memory are how we honor the past and protect the future." },
              ].map((item, i) => (
                <div key={i}
                  style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 18, padding: mobile ? "24px 20px" : "32px 28px", transition: "all .25s", position: "relative", overflow: "hidden" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${item.color}40`; e.currentTarget.style.background = `${item.color}08`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.07)"; e.currentTarget.style.background = "rgba(255,255,255,.03)"; e.currentTarget.style.transform = "none"; }}
                >
                  {/* Accent corner glow */}
                  <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at 100% 0%, ${item.color}18 0%, transparent 70%)`, pointerEvents: "none" }} />
                  <div style={{ width: 52, height: 52, background: `${item.color}15`, border: `1px solid ${item.color}30`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 20 }}>
                    {item.icon}
                  </div>
                  <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, marginBottom: 12, letterSpacing: "-0.01em" }}>{item.title}</h3>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,.5)", lineHeight: 1.75 }}>{item.body}</p>
                  <div style={{ marginTop: 20, width: 32, height: 3, background: `linear-gradient(90deg, ${item.color}, transparent)`, borderRadius: 2 }} />
                </div>
              ))}
            </div>
          </section>

          {/* How it works timeline */}
          <section style={{ padding: mobile ? "0 16px 72px" : "0 48px 88px", maxWidth: 1060, margin: "0 auto" }}>
            <p style={{ color: "#e8c56d", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>The process</p>
            <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(24px,4vw,40px)", letterSpacing: "-0.02em", marginBottom: 44 }}>How We Handle Every Report</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { step: "01", title: "You Submit",     desc: "A report is filed through our secure form — anonymously if preferred. You can include links, dates, and as much or as little detail as you're comfortable sharing.", icon: "📝" },
                { step: "02", title: "We Review",      desc: "Our trained team reviews every submission within 24 hours, assessing severity, verifying details where possible, and assigning a case handler.", icon: "🔍" },
                { step: "03", title: "We Respond",     desc: "Depending on the incident, we may connect you with legal resources, escalate to authorities, or add the case to our public incident database.", icon: "⚡" },
                { step: "04", title: "We Document",    desc: "Every verified incident is recorded in our database, contributing to the growing body of evidence used by researchers, advocates, and policymakers.", icon: "📂" },
              ].map((s, i, arr) => (
                <div key={i} style={{ display: "flex", gap: mobile ? 16 : 28, position: "relative" }}>
                  {/* Vertical line */}
                  {i < arr.length - 1 && (
                    <div style={{ position: "absolute", left: mobile ? 19 : 23, top: 52, bottom: 0, width: 2, background: "linear-gradient(to bottom, rgba(232,197,109,.3), rgba(232,197,109,.05))", zIndex: 0 }} />
                  )}
                  {/* Step circle */}
                  <div style={{ width: mobile ? 40 : 48, height: mobile ? 40 : 48, borderRadius: "50%", background: "linear-gradient(135deg,#e8c56d,#c9972a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, zIndex: 1, marginTop: 4 }}>
                    {s.icon}
                  </div>
                  {/* Content */}
                  <div style={{ paddingBottom: i < arr.length - 1 ? 40 : 0, flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#e8c56d", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 4 }}>STEP {s.step}</div>
                    <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, marginBottom: 8 }}>{s.title}</h3>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,.48)", lineHeight: 1.75, maxWidth: 580 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Values strip */}
          <section style={{ padding: mobile ? "0 16px 72px" : "0 48px 88px", maxWidth: 1060, margin: "0 auto" }}>
            <div style={{ background: "linear-gradient(135deg,rgba(232,197,109,.07),rgba(232,197,109,.02))", border: "1px solid rgba(232,197,109,.15)", borderRadius: 22, padding: mobile ? "32px 22px" : "48px 48px" }}>
              <p style={{ color: "#e8c56d", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Our values</p>
              <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(22px,4vw,36px)", letterSpacing: "-0.02em", marginBottom: 32 }}>What We Stand For</h2>
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: mobile ? 16 : 24 }}>
                {[
                  { icon: "🔒", label: "Confidentiality" },
                  { icon: "⚖️", label: "Accountability"  },
                  { icon: "🌐", label: "Transparency"    },
                  { icon: "💙", label: "Community First" },
                ].map((v, i) => (
                  <div key={i} style={{ textAlign: "center", padding: mobile ? "16px 8px" : "20px 12px" }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>{v.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#f0eee8", letterSpacing: "0.02em" }}>{v.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section style={{ padding: mobile ? "0 16px 80px" : "0 48px 100px", maxWidth: 1060, margin: "0 auto" }}>
            <div style={{ background: "#0a0a0f", border: "1px solid rgba(255,255,255,.08)", borderRadius: 22, padding: mobile ? "36px 22px" : "52px 52px", display: "flex", flexDirection: mobile ? "column" : "row", justifyContent: "space-between", alignItems: "center", gap: 28 }}>
              <div>
                <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(20px,3vw,30px)", marginBottom: 8 }}>Ready to make a difference?</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", maxWidth: 420, lineHeight: 1.7 }}>Every report you submit adds to the record and helps protect your community. It takes less than 2 minutes.</p>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", flexShrink: 0 }}>
                <button className="cta" style={{ fontSize: 15, padding: "13px 28px" }} onClick={() => goPage("Submit Offense")}>Report an Incident →</button>
                <button className="nav-btn" style={{ fontSize: 14, padding: "12px 20px", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10 }} onClick={() => goPage("Contact Us")}>Get in Touch</button>
              </div>
            </div>
          </section>

        </div>
      )}

      {/* ══════════════════════════ LOGIN / PROFILE ══════════════════════════ */}
      {page === "login" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: mobile ? "90px 16px 80px" : "110px 24px 80px", animation: "fadeUp .6s ease both" }}>

          {/* ── LOGGED IN: Profile card ── */}
          {user ? (
            <>
              <button onClick={() => setPage("home")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.42)", cursor: "pointer", fontSize: 14, marginBottom: 32 }}>← Back</button>

              {/* Avatar + name */}
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32, padding: "24px 28px", background: "linear-gradient(135deg,rgba(232,197,109,.08),rgba(232,197,109,.03))", border: "1px solid rgba(232,197,109,.2)", borderRadius: 18 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#e8c56d,#c9972a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#0a0a0f", flexShrink: 0 }}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, marginBottom: 3 }}>{user.name}</div>
                  {user.title && <div style={{ fontSize: 13, color: "#e8c56d", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 2 }}>{user.title}</div>}
                  {user.department && <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>{user.department}</div>}
                </div>
              </div>

              {/* Profile details */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
                {[
                  { label: "Email",      value: user.email,      icon: "✉️" },
                  { label: "Role",       value: user.role,       icon: "🔑" },
                  { label: "Member since", value: user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—", icon: "📅" },
                  { label: "Last login", value: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "—", icon: "🕐" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "13px 16px" }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{row.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>{row.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{row.value || "—"}</div>
                    </div>
                  </div>
                ))}
                {user.bio && (
                  <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "13px 16px" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Bio</div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,.65)", lineHeight: 1.6 }}>{user.bio}</div>
                  </div>
                )}
              </div>

              <button onClick={handleLogout} style={{ width: "100%", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", color: "#ef4444", borderRadius: 10, padding: 13, fontSize: 14, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontWeight: 600, transition: "all .2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.14)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,.08)"}
              >
                Sign Out
              </button>
            </>
          ) : (
            /* ── NOT LOGGED IN: Login / Register forms ── */
            <>
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <div style={{ width: 52, height: 52, background: "linear-gradient(135deg,#e8c56d,#c9972a)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 18px" }}>✡</div>
                <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: "-0.02em", marginBottom: 6 }}>
                  {authView === "login" ? "Welcome Back" : "Create Account"}
                </h1>
                <p style={{ color: "rgba(255,255,255,.38)", fontSize: 14 }}>
                  {authView === "login" ? "Sign in to your ReportASA account" : "Join the ReportASA team"}
                </p>
              </div>

              {/* Tab toggle */}
              <div style={{ display: "flex", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: 4, marginBottom: 28 }}>
                {["login", "register"].map(v => (
                  <button key={v} onClick={() => { setAuthView(v); setAuthSt("idle"); setAuthErr(""); }}
                    style={{ flex: 1, background: authView === v ? "rgba(232,197,109,.15)" : "none", border: authView === v ? "1px solid rgba(232,197,109,.3)" : "1px solid transparent", borderRadius: 7, padding: "9px 0", fontSize: 13, fontWeight: 600, color: authView === v ? "#e8c56d" : "rgba(255,255,255,.45)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", transition: "all .2s" }}>
                    {v === "login" ? "Sign In" : "Register"}
                  </button>
                ))}
              </div>

              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 18, padding: mobile ? 22 : 28 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* Register-only fields */}
                  {authView === "register" && (
                    <>
                      <div>
                        <label style={LABEL}>Full Name *</label>
                        <input className="input-field" placeholder="Jane Smith" value={authForm.name} onChange={e => setAuthForm(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={LABEL}>Title</label>
                          <input className="input-field" placeholder="e.g. Advocate" value={authForm.title} onChange={e => setAuthForm(p => ({ ...p, title: e.target.value }))} />
                        </div>
                        <div>
                          <label style={LABEL}>Department</label>
                          <input className="input-field" placeholder="e.g. Outreach" value={authForm.department} onChange={e => setAuthForm(p => ({ ...p, department: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <label style={LABEL}>Bio <span style={{ color: "rgba(255,255,255,.3)", fontWeight: 400 }}>(optional)</span></label>
                        <textarea className="input-field" rows={2} placeholder="A short bio about yourself..." style={{ resize: "none" }} value={authForm.bio} onChange={e => setAuthForm(p => ({ ...p, bio: e.target.value }))} />
                      </div>
                    </>
                  )}

                  {/* Shared fields */}
                  <div>
                    <label style={LABEL}>Email Address *</label>
                    <input className="input-field" type="email" placeholder="you@example.com" value={authForm.email} onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label style={LABEL}>Password *</label>
                    <input className="input-field" type="password" placeholder={authView === "register" ? "Min. 8 characters" : "••••••••"} value={authForm.password} onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))} />
                  </div>

                  {authView === "login" && (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button style={{ background: "none", border: "none", color: "#e8c56d", fontSize: 13, cursor: "pointer" }}>Forgot password?</button>
                    </div>
                  )}

                  {authErr && (
                    <div style={{ background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.22)", borderRadius: 10, padding: "11px 14px", fontSize: 13, color: "#ef4444" }}>⚠ {authErr}</div>
                  )}

                  <button className="cta" style={{ padding: "13px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                    disabled={authSt === "loading"}
                    onClick={authView === "login" ? handleLogin : handleRegister}
                  >
                    {authSt === "loading" ? <><Spinner />{authView === "login" ? "Signing in…" : "Creating account…"}</> : authView === "login" ? "Sign In →" : "Create Account →"}
                  </button>

                  <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,.32)" }}>
                    {authView === "login" ? "No account? " : "Already have one? "}
                    <button style={{ background: "none", border: "none", color: "#e8c56d", cursor: "pointer", fontSize: 13 }}
                      onClick={() => { setAuthView(authView === "login" ? "register" : "login"); setAuthSt("idle"); setAuthErr(""); }}>
                      {authView === "login" ? "Create one →" : "Sign in →"}
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
          <p style={{ color: "rgba(255,255,255,.45)", fontSize: 15, marginBottom: 48, lineHeight: 1.7, maxWidth: 560 }}>
            Have a question, want to partner with us, or need help with a report? We're here. Reach out and our team will respond within 48 hours.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 40 : 56, alignItems: "start" }}>

            {/* Contact info cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { icon: "✉️", label: "Email",        value: "hello@reportasa.org",        sub: "General inquiries & partnerships" },
                { icon: "🔒", label: "Secure Tips",   value: "secure@reportasa.org",       sub: "Sensitive or confidential matters" },
                { icon: "📞", label: "Hotline",       value: "1-800-REPORT-ASA",           sub: "Mon–Fri, 9am–6pm EST" },
                { icon: "🐦", label: "Twitter / X",   value: "@ReportASA",                  sub: "Follow for updates" },
              ].map((c, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "18px 20px", display: "flex", gap: 16, alignItems: "flex-start", transition: "border-color .2s, background .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(232,197,109,.04)"; e.currentTarget.style.borderColor = "rgba(232,197,109,.2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"; }}
                >
                  <div style={{ width: 40, height: 40, background: "rgba(232,197,109,.1)", border: "1px solid rgba(232,197,109,.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{c.icon}</div>
                  <div>
                    <div style={{ fontSize: 11, color: "#e8c56d", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{c.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#f0eee8", marginBottom: 2 }}>{c.value}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.38)" }}>{c.sub}</div>
                  </div>
                </div>
              ))}

              {/* Response time note */}
              <div style={{ background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 18 }}>⚡</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#10b981", marginBottom: 2 }}>Fast Response</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Urgent safety concerns are prioritized — typically responded to within 4 hours.</div>
                </div>
              </div>
            </div>

            {/* Contact form */}
            <div style={{ background: "rgba(232,197,109,.04)", border: "1px solid rgba(232,197,109,.13)", borderRadius: 18, padding: mobile ? 20 : 28 }}>
              {contactSt === "success" ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 14 }}>✓</div>
                  <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, color: "#10b981", marginBottom: 8 }}>Message Sent!</h3>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", marginBottom: 24 }}>We'll get back to you within 48 hours.</p>
                  <button className="cta" style={{ padding: "10px 24px", fontSize: 13 }} onClick={() => { setContactSt("idle"); setContactForm(blankContact); }}>Send Another</button>
                </div>
              ) : (
                <>
                  <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, marginBottom: 4 }}>Send a Message</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,.38)", marginBottom: 22 }}>We read every message personally.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={LABEL}>Your Name</label>
                        <input className="input-field" placeholder="Jane Smith" value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div>
                        <label style={LABEL}>Email *</label>
                        <input className="input-field" type="email" placeholder="you@example.com" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label style={LABEL}>Subject</label>
                      <select className="input-field" value={contactForm.subject} onChange={e => setContactForm(p => ({ ...p, subject: e.target.value }))}>
                        <option value="">Select a topic...</option>
                        <option>General Inquiry</option>
                        <option>Partnership / Media</option>
                        <option>Help with a Report</option>
                        <option>Technical Issue</option>
                        <option>Urgent Safety Concern</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={LABEL}>Message *</label>
                      <textarea className="input-field" rows={5} placeholder="How can we help you?" style={{ resize: "vertical" }} value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))} />
                    </div>
                    {contactSt === "error" && (
                      <div style={{ background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.22)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#ef4444" }}>⚠ Could not send message. Please email us directly.</div>
                    )}
                    <button className="cta" style={{ padding: "13px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                      disabled={contactSt === "loading"}
                      onClick={async () => {
                        if (!contactForm.email || !contactForm.message) return;
                        setContactSt("loading");
                        try {
                          const res = await fetch(`${API_BASE}/api/contact`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(contactForm),
                          });
                          if (!res.ok) throw new Error();
                          setContactSt("success");
                        } catch {
                          setContactSt("error");
                        }
                      }}
                    >
                      {contactSt === "loading" ? <><Spinner /> Sending…</> : "Send Message →"}
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
          {["About Us", "Our Mission", "Submit Offense", "Contact Us"].map(l => (
            <button key={l} onClick={() => goPage(l)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.35)", fontSize: 12, cursor: "pointer", fontFamily: "'Outfit',sans-serif", transition: "color .2s" }}
              onMouseEnter={e => e.currentTarget.style.color = "#e8c56d"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.35)"}
            >{l}</button>
          ))}
        </div>
        <div style={{ marginBottom: 4 }}>✡ ReportASA — Standing Against Antisemitism</div>
        <div>All reports are confidential. © 2025 ReportASA. All rights reserved.</div>
      </footer>
    </div>
  );
}

function Spinner() {
  return <span style={{ width: 15, height: 15, border: "2px solid #0a0a0f", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />;
}