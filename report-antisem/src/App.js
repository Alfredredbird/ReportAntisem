import { useState, useEffect, useRef } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = "https://your-api.example.com"; // ← replace with your API URL
// GET  /api/stats          → { reports_submitted, cases_resolved_pct, states_covered, community_members }
// GET  /api/reports/recent → [{ location, type, time, status }, ...]
// POST /api/reports        → { type, date, location, org, description, contact, anonymous, links[] }

const NAV_LINKS = ["About Me", "Submit Offense", "Our Mission", "Login"];

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

  // Quick form
  const [qForm,       setQForm]       = useState({ type: "", location: "", description: "" });
  const [qLinks,      setQLinks]      = useState([]);
  const [qSt,         setQSt]         = useState("idle");

  // Fetch stats + recent reports
  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then(r => r.json())
      .then(d => setApiStats({
        reports_submitted:  d.reports_submitted  ?? 0,
        cases_resolved_pct: d.cases_resolved_pct ?? 0,
        states_covered:     d.states_covered     ?? 0,
        community_members:  d.community_members  ?? 0,
      }))
      .catch(() => {});

    fetch(`${API_BASE}/api/reports/recent`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length) setFeed(d); })
      .catch(() => {});
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
    const map = { "About Me": "about", "Submit Offense": "submit", "Our Mission": "mission", "Login": "login" };
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

  const handleQuickSubmit = async () => {
    if (!qForm.type || !qForm.description) return;
    setQSt("loading");
    try {
      await postReport({ ...qForm, anonymous: true, source: "quick_widget", links: qLinks.filter(l => l.trim()) });
      setQSt("success");
      setTimeout(() => { setQSt("idle"); setQForm({ type: "", location: "", description: "" }); setQLinks([]); }, 4000);
    } catch {
      setQSt("error");
      setTimeout(() => setQSt("idle"), 3000);
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
            {NAV_LINKS.map(l => l === "Submit Offense"
              ? <button key={l} className="cta" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => goPage(l)}>{l}</button>
              : <button key={l} className="nav-btn" onClick={() => goPage(l)}>{l}</button>
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

          {/* Feed + Quick Widget */}
          <section style={{ padding: mobile ? "16px 16px 56px" : "36px 24px 72px", maxWidth: 1060, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 40 : 44, alignItems: "start" }}>

              {/* Feed */}
              <div>
                <p style={{ color: "#e8c56d", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Live feed</p>
                <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(20px,3vw,32px)", letterSpacing: "-0.02em", marginBottom: 20 }}>Recent Reports</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {feed.map((r, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 11, padding: "13px 15px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.type}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,.38)" }}>{r.location} · {r.time}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[r.status] || "#888", background: `${STATUS_COLOR[r.status] || "#888"}1a`, border: `1px solid ${STATUS_COLOR[r.status] || "#888"}30`, borderRadius: 100, padding: "3px 9px", whiteSpace: "nowrap", flexShrink: 0 }}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick widget */}
              <div style={{ background: "rgba(232,197,109,.05)", border: "1px solid rgba(232,197,109,.15)", borderRadius: 18, padding: mobile ? 18 : 26 }}>
                <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, marginBottom: 3 }}>Quick Report</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.38)", marginBottom: 18 }}>Submit an incident in under 2 minutes</p>

                {qSt === "success" ? (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <div style={{ fontSize: 42, marginBottom: 10 }}>✓</div>
                    <div style={{ fontWeight: 600, color: "#10b981", fontSize: 15 }}>Submitted — Thank you!</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                    <select className="input-field" value={qForm.type} onChange={e => setQForm(p => ({ ...p, type: e.target.value }))}>
                      <option value="">Select incident type...</option>
                      {CATEGORIES.map(c => <option key={c.title}>{c.title}</option>)}
                    </select>
                    <input className="input-field" placeholder="Location (city, state)" value={qForm.location} onChange={e => setQForm(p => ({ ...p, location: e.target.value }))} />
                    <textarea className="input-field" placeholder="Brief description..." rows={3} style={{ resize: "vertical" }} value={qForm.description} onChange={e => setQForm(p => ({ ...p, description: e.target.value }))} />
                    <LinkInputs links={qLinks} setLinks={setQLinks} />
                    {qSt === "error" && <p style={{ color: "#ef4444", fontSize: 13 }}>Could not submit. Please try the full form.</p>}
                    <button className="cta" style={{ width: "100%", padding: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={handleQuickSubmit} disabled={qSt === "loading"}>
                      {qSt === "loading" ? <><Spinner />Submitting…</> : "Submit Report"}
                    </button>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,.22)", textAlign: "center" }}>🔒 Anonymous by default</p>
                  </div>
                )}
              </div>
            </div>
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
        <div style={{ maxWidth: 780, margin: "0 auto", padding: mobile ? "90px 16px 80px" : "118px 24px 80px", animation: "fadeUp .6s ease both" }}>
          <button onClick={() => setPage("home")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.42)", cursor: "pointer", fontSize: 14, marginBottom: 32 }}>← Back</button>
          <p style={{ color: "#e8c56d", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Who we are</p>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(30px,5vw,50px)", letterSpacing: "-0.02em", marginBottom: 28 }}>About Me</h1>
          <div style={{ display: "flex", gap: 26, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ width: 90, height: 90, background: "linear-gradient(135deg,#e8c56d,#c9972a)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, flexShrink: 0 }}>✡</div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,.68)", marginBottom: 16 }}>
                I founded ReportASA after witnessing antisemitism go unreported and unaddressed in my own community. As a Jewish American, I believe every incident deserves to be documented, heard, and acted upon.
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,.68)" }}>
                This platform is built for ordinary people who want to make their voices heard — safely, securely, and effectively.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════ MISSION ══════════════════════════ */}
      {page === "mission" && (
        <div style={{ maxWidth: 780, margin: "0 auto", padding: mobile ? "90px 16px 80px" : "118px 24px 80px", animation: "fadeUp .6s ease both" }}>
          <button onClick={() => setPage("home")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.42)", cursor: "pointer", fontSize: 14, marginBottom: 32 }}>← Back</button>
          <p style={{ color: "#e8c56d", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Our mission</p>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(30px,5vw,50px)", letterSpacing: "-0.02em", marginBottom: 32 }}>Why We Exist</h1>
          {[
            { icon: "📢", title: "Amplify Voices",       body: "Every report is a voice that deserves to be heard. We ensure incidents are documented with integrity and treated with the urgency they deserve." },
            { icon: "🛡️", title: "Protect Communities",  body: "By identifying patterns and hotspots, we help communities, institutions, and law enforcement respond proactively to antisemitic threats." },
            { icon: "📊", title: "Build the Record",      body: "Our database of verified incidents provides researchers, journalists, and policymakers with the data needed to understand and combat antisemitism." },
            { icon: "🌍", title: "Never Again — Together",body: "We believe that sunlight is the best disinfectant. Transparency, documentation, and community solidarity are our most powerful tools." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 18, marginBottom: 28, paddingBottom: 28, borderBottom: i < 3 ? "1px solid rgba(255,255,255,.07)" : "none" }}>
              <div style={{ fontSize: 26, flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
              <div>
                <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, marginBottom: 7 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,.52)", lineHeight: 1.7 }}>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════ LOGIN ══════════════════════════ */}
      {page === "login" && (
        <div style={{ maxWidth: 400, margin: "0 auto", padding: mobile ? "90px 16px 80px" : "130px 24px 80px", animation: "fadeUp .6s ease both" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 50, height: 50, background: "linear-gradient(135deg,#e8c56d,#c9972a)", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 16px" }}>✡</div>
            <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32, letterSpacing: "-0.02em", marginBottom: 5 }}>Welcome Back</h1>
            <p style={{ color: "rgba(255,255,255,.38)", fontSize: 14 }}>Log in to your ReportASA account</p>
          </div>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 18, padding: mobile ? 22 : 30 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
              <div><label style={LABEL}>Email Address</label><input className="input-field" type="email" placeholder="you@example.com" /></div>
              <div><label style={LABEL}>Password</label><input className="input-field" type="password" placeholder="••••••••" /></div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button style={{ background: "none", border: "none", color: "#e8c56d", fontSize: 13, cursor: "pointer" }}>Forgot password?</button>
              </div>
              <button className="cta" style={{ padding: 13, fontSize: 14 }}>Sign In</button>
              <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,.32)" }}>
                No account?{" "}
                <button style={{ background: "none", border: "none", color: "#e8c56d", cursor: "pointer", fontSize: 13 }}>Create one →</button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.07)", padding: "24px 20px", textAlign: "center", color: "rgba(255,255,255,.18)", fontSize: 12 }}>
        <div style={{ marginBottom: 3 }}>✡ ReportASA — Standing Against Antisemitism</div>
        <div>All reports are confidential. © 2025 ReportASA. All rights reserved.</div>
      </footer>
    </div>
  );
}

function Spinner() {
  return <span style={{ width: 15, height: 15, border: "2px solid #0a0a0f", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />;
}