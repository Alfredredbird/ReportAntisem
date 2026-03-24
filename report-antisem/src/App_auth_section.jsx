// ─────────────────────────────────────────────────────────────────────────────
// REPLACE the "login" page block in App.jsx with the code below.
// Also add these new state variables near your other auth state declarations:
//
//   const [authView, setAuthView] = useState("login"); // "login"|"register"|"forgot"|"reset"
//   const [resetToken,    setResetToken]    = useState("");
//   const [resetForm,     setResetForm]     = useState({ newPassword: "", confirm: "" });
//   const [resetSt,       setResetSt]       = useState("idle"); // idle|loading|success|error
//   const [resetErr,      setResetErr]      = useState("");
//   const [forgotEmail,   setForgotEmail]   = useState("");
//   const [forgotSt,      setForgotSt]      = useState("idle"); // idle|loading|success
//   const [changePassForm, setChangePassForm] = useState({ current: "", newPass: "", confirm: "" });
//   const [changePassSt,   setChangePassSt]   = useState("idle");
//   const [changePassErr,  setChangePassErr]  = useState("");
//
// Also add this useEffect to detect reset tokens in the URL on page load
// (place it near your other useEffects):
//
//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     const token  = params.get("token");
//     if (token) {
//       setResetToken(token);
//       setAuthView("reset");
//       setPage("login");
//       // Clean the URL without reloading
//       window.history.replaceState({}, "", window.location.pathname);
//     }
//   }, []);
//
// Handlers to add (alongside handleLogin, handleRegister, etc.):

const handleForgotPassword = async () => {
  if (!forgotEmail) return;
  setForgotSt("loading");
  try {
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotEmail }),
    });
    const data = await res.json();
    setForgotSt("success");
    // DEV ONLY: if server returns _dev_reset_link, auto-fill the token
    if (data._dev_token) {
      setResetToken(data._dev_token);
    }
  } catch {
    setForgotSt("success"); // Always show success (prevents email enumeration)
  }
};

const handleResetPassword = async () => {
  if (resetForm.newPassword !== resetForm.confirm) {
    setResetErr("Passwords do not match");
    return;
  }
  if (resetForm.newPassword.length < 8) {
    setResetErr("Password must be at least 8 characters");
    return;
  }
  setResetSt("loading");
  setResetErr("");
  try {
    const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resetToken, newPassword: resetForm.newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setResetSt("error");
      setResetErr(data.error || "Reset failed");
      return;
    }
    setResetSt("success");
  } catch {
    setResetSt("error");
    setResetErr("Could not connect to server. Please try again.");
  }
};

const handleChangePassword = async () => {
  if (changePassForm.newPass !== changePassForm.confirm) {
    setChangePassErr("Passwords do not match");
    return;
  }
  if (changePassForm.newPass.length < 8) {
    setChangePassErr("New password must be at least 8 characters");
    return;
  }
  setChangePassSt("loading");
  setChangePassErr("");
  try {
    const res = await fetch(`${API_BASE}/api/auth/change-password`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: changePassForm.current, newPassword: changePassForm.newPass }),
    });
    const data = await res.json();
    if (!res.ok) {
      setChangePassSt("error");
      setChangePassErr(data.error || "Change failed");
      return;
    }
    setChangePassSt("success");
    setChangePassForm({ current: "", newPass: "", confirm: "" });
  } catch {
    setChangePassSt("error");
    setChangePassErr("Could not connect to server. Please try again.");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REPLACE the entire {page === "login" && ( ... )} block with this:
// ─────────────────────────────────────────────────────────────────────────────

{page === "login" && (
  <div style={{ maxWidth: 480, margin: "0 auto", padding: mobile ? "90px 16px 80px" : "110px 24px 80px", animation: "fadeUp .6s ease both" }}>

    {/* ── LOGGED IN: Profile card ── */}
    {user ? (
      <>
        <button onClick={() => setPage("home")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.42)", cursor: "pointer", fontSize: 14, marginBottom: 32 }}>← Back</button>

        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, padding: "22px 24px", background: "linear-gradient(135deg,rgba(232,197,109,.08),rgba(232,197,109,.03))", border: "1px solid rgba(232,197,109,.2)", borderRadius: 18 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg,#e8c56d,#c9972a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#0a0a0f", flexShrink: 0 }}>
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, marginBottom: 2 }}>{user.name}</div>
            {user.title && <div style={{ fontSize: 12, color: "#e8c56d", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 2 }}>{user.title}</div>}
            {user.department && <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>{user.department}</div>}
          </div>
        </div>

        {/* Profile details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Email",        value: user.email,      icon: "✉️" },
            { label: "Role",         value: user.role,       icon: "🔑" },
            { label: "Member since", value: user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—", icon: "📅" },
            { label: "Last login",   value: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "—", icon: "🕐" },
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "12px 14px" }}>
              <span style={{ fontSize: 17, flexShrink: 0 }}>{row.icon}</span>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>{row.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{row.value || "—"}</div>
              </div>
            </div>
          ))}
          {user.bio && (
            <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Bio</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", lineHeight: 1.6 }}>{user.bio}</div>
            </div>
          )}
        </div>

        {/* Change password section */}
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "18px 18px", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            🔐 <span>Change Password</span>
          </div>

          {changePassSt === "success" ? (
            <div style={{ background: "rgba(16,185,129,.07)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#10b981" }}>
              ✓ Password changed successfully.
              <button style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: 12, cursor: "pointer", marginLeft: 8 }}
                onClick={() => setChangePassSt("idle")}>Dismiss</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div>
                <label style={LABEL}>Current Password</label>
                <input className="input-field" type="password" placeholder="••••••••" value={changePassForm.current} onChange={e => setChangePassForm(p => ({ ...p, current: e.target.value }))} />
              </div>
              <div>
                <label style={LABEL}>New Password</label>
                <input className="input-field" type="password" placeholder="Min. 8 characters" value={changePassForm.newPass} onChange={e => setChangePassForm(p => ({ ...p, newPass: e.target.value }))} />
              </div>
              <div>
                <label style={LABEL}>Confirm New Password</label>
                <input className="input-field" type="password" placeholder="Repeat new password" value={changePassForm.confirm} onChange={e => setChangePassForm(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              {changePassErr && (
                <div style={{ background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.22)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#ef4444" }}>⚠ {changePassErr}</div>
              )}
              <button className="cta" style={{ padding: "11px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                onClick={handleChangePassword}
                disabled={changePassSt === "loading" || !changePassForm.current || !changePassForm.newPass}>
                {changePassSt === "loading" ? <><Spinner /> Changing…</> : "Change Password →"}
              </button>
            </div>
          )}
        </div>

        <button onClick={handleLogout} style={{ width: "100%", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", color: "#ef4444", borderRadius: 10, padding: 13, fontSize: 14, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontWeight: 600, transition: "all .2s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.14)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,.08)"}>
          Sign Out
        </button>
      </>
    ) : authView === "forgot" ? (
      /* ── FORGOT PASSWORD ── */
      <>
        <button onClick={() => { setAuthView("login"); setForgotSt("idle"); setForgotEmail(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,.42)", cursor: "pointer", fontSize: 14, marginBottom: 32 }}>← Back to login</button>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: "linear-gradient(135deg,#e8c56d,#c9972a)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 18px" }}>🔑</div>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: "-0.02em", marginBottom: 6 }}>Reset Password</h1>
          <p style={{ color: "rgba(255,255,255,.38)", fontSize: 14, lineHeight: 1.6 }}>Enter your email address and we'll send you a reset link.</p>
        </div>

        {forgotSt === "success" ? (
          <div style={{ background: "rgba(16,185,129,.07)", border: "1px solid rgba(16,185,129,.22)", borderRadius: 14, padding: "28px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>📬</div>
            <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: "#10b981", marginBottom: 8 }}>Check your inbox</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", marginBottom: 20, lineHeight: 1.65 }}>
              If <strong style={{ color: "#f0eee8" }}>{forgotEmail}</strong> is registered, you'll receive a reset link shortly. Check your spam folder if you don't see it.
            </p>
            {/* DEV ONLY: show "use token" button if server returned a dev token */}
            {resetToken && (
              <button className="cta" style={{ fontSize: 13, padding: "10px 22px", marginBottom: 12 }}
                onClick={() => { setAuthView("reset"); setForgotSt("idle"); }}>
                [DEV] Continue to Reset Form →
              </button>
            )}
            <div>
              <button style={{ background: "none", border: "none", color: "#e8c56d", fontSize: 13, cursor: "pointer" }}
                onClick={() => { setAuthView("login"); setForgotSt("idle"); setForgotEmail(""); setResetToken(""); }}>
                Back to login →
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 18, padding: mobile ? 20 : 26 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={LABEL}>Email Address *</label>
                <input className="input-field" type="email" placeholder="you@example.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleForgotPassword()} />
              </div>
              <button className="cta" style={{ padding: "13px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                disabled={forgotSt === "loading" || !forgotEmail}
                onClick={handleForgotPassword}>
                {forgotSt === "loading" ? <><Spinner />Sending…</> : "Send Reset Link →"}
              </button>
            </div>
          </div>
        )}
      </>
    ) : authView === "reset" ? (
      /* ── RESET PASSWORD (from email link / dev flow) ── */
      <>
        <button onClick={() => { setAuthView("login"); setResetSt("idle"); setResetErr(""); setResetForm({ newPassword: "", confirm: "" }); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,.42)", cursor: "pointer", fontSize: 14, marginBottom: 32 }}>← Back to login</button>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: "linear-gradient(135deg,#e8c56d,#c9972a)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 18px" }}>🔐</div>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: "-0.02em", marginBottom: 6 }}>New Password</h1>
          <p style={{ color: "rgba(255,255,255,.38)", fontSize: 14 }}>Choose a strong password for your account.</p>
        </div>

        {resetSt === "success" ? (
          <div style={{ background: "rgba(16,185,129,.07)", border: "1px solid rgba(16,185,129,.22)", borderRadius: 14, padding: "32px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 50, marginBottom: 14 }}>✓</div>
            <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, color: "#10b981", marginBottom: 8 }}>Password Reset!</h3>
            <p style={{ color: "rgba(255,255,255,.45)", fontSize: 14, marginBottom: 24, lineHeight: 1.65 }}>Your password has been changed. You can now sign in with your new password.</p>
            <button className="cta" style={{ fontSize: 14, padding: "12px 28px" }}
              onClick={() => { setAuthView("login"); setResetSt("idle"); setResetForm({ newPassword: "", confirm: "" }); setResetToken(""); }}>
              Sign In →
            </button>
          </div>
        ) : (
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 18, padding: mobile ? 20 : 26 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={LABEL}>New Password *</label>
                <input className="input-field" type="password" placeholder="Min. 8 characters" value={resetForm.newPassword} onChange={e => setResetForm(p => ({ ...p, newPassword: e.target.value }))} />
              </div>
              <div>
                <label style={LABEL}>Confirm Password *</label>
                <input className="input-field" type="password" placeholder="Repeat your new password" value={resetForm.confirm} onChange={e => setResetForm(p => ({ ...p, confirm: e.target.value }))} />
                {/* Password strength indicator */}
                {resetForm.newPassword && (
                  <div style={{ marginTop: 8 }}>
                    {(() => {
                      const p = resetForm.newPassword;
                      const strong = p.length >= 12 && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
                      const medium = p.length >= 8 && (/[A-Z]/.test(p) || /[0-9]/.test(p));
                      const label  = strong ? "Strong" : medium ? "Medium" : "Weak";
                      const color  = strong ? "#10b981" : medium ? "#f59e0b" : "#ef4444";
                      const width  = strong ? "100%" : medium ? "60%" : "25%";
                      return (
                        <>
                          <div style={{ height: 3, background: "rgba(255,255,255,.07)", borderRadius: 2, marginBottom: 5 }}>
                            <div style={{ height: "100%", width, background: color, borderRadius: 2, transition: "width .3s, background .3s" }} />
                          </div>
                          <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label} password</span>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
              {resetErr && (
                <div style={{ background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.22)", borderRadius: 10, padding: "11px 14px", fontSize: 13, color: "#ef4444" }}>⚠ {resetErr}</div>
              )}
              <button className="cta" style={{ padding: "13px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                disabled={resetSt === "loading" || !resetForm.newPassword || !resetForm.confirm || !resetToken}
                onClick={handleResetPassword}>
                {resetSt === "loading" ? <><Spinner />Saving…</> : "Set New Password →"}
              </button>
              {!resetToken && (
                <p style={{ fontSize: 12, color: "rgba(239,68,68,.7)", textAlign: "center" }}>
                  ⚠ No reset token found. Please use the link from your email.
                </p>
              )}
            </div>
          </div>
        )}
      </>
    ) : (
      /* ── LOGIN / REGISTER ── */
      <>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: "linear-gradient(135deg,#e8c56d,#c9972a)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 18px" }}>✡</div>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 30, letterSpacing: "-0.02em", marginBottom: 6 }}>
            {authView === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p style={{ color: "rgba(255,255,255,.38)", fontSize: 14 }}>
            {authView === "login" ? "Sign in to your ReportASA account" : "Join the ReportASA team"}
          </p>
        </div>

        {/* Tab toggle */}
        <div style={{ display: "flex", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: 4, marginBottom: 26 }}>
          {["login", "register"].map(v => (
            <button key={v} onClick={() => { setAuthView(v); setAuthSt("idle"); setAuthErr(""); }}
              style={{ flex: 1, background: authView === v ? "rgba(232,197,109,.15)" : "none", border: authView === v ? "1px solid rgba(232,197,109,.3)" : "1px solid transparent", borderRadius: 7, padding: "9px 0", fontSize: 13, fontWeight: 600, color: authView === v ? "#e8c56d" : "rgba(255,255,255,.45)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", transition: "all .2s" }}>
              {v === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 18, padding: mobile ? 20 : 26 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                  <textarea className="input-field" rows={2} placeholder="A short bio…" style={{ resize: "none" }} value={authForm.bio} onChange={e => setAuthForm(p => ({ ...p, bio: e.target.value }))} />
                </div>
              </>
            )}

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
                <button style={{ background: "none", border: "none", color: "#e8c56d", fontSize: 13, cursor: "pointer" }}
                  onClick={() => { setAuthView("forgot"); setAuthSt("idle"); setAuthErr(""); }}>
                  Forgot password?
                </button>
              </div>
            )}

            {authErr && (
              <div style={{ background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.22)", borderRadius: 10, padding: "11px 14px", fontSize: 13, color: "#ef4444" }}>⚠ {authErr}</div>
            )}

            <button className="cta" style={{ padding: "13px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              disabled={authSt === "loading"}
              onClick={authView === "login" ? handleLogin : handleRegister}>
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