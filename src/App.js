import React, { useState, useEffect } from "react";
const SUPABASE_URL = "https://ribnyutdcldpjdldtiks.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYm55dXRkY2xkcGpkbGR0aWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NTY0NzMsImV4cCI6MjA5MjEzMjQ3M30.TVdx6N6FE8LTrEfz_X-ppNfAAcavFpPkWnQY-kSVThM";
const MODEL = "claude-sonnet-4-20250514";

const sb = {
  h: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  ah: (token) => ({ "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }),
  async signUp(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: sb.h, body: JSON.stringify({ email, password }) });
    return r.json();
  },
  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: sb.h, body: JSON.stringify({ email, password }) });
    return r.json();
  },
  async signOut(token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: sb.ah(token) });
  },
  async upsertProfile(token, profile) {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, { method: "POST", headers: { ...sb.ah(token), Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(profile) });
  },
  async getProfile(token, userId) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, { headers: sb.ah(token) });
    const d = await r.json();
    return Array.isArray(d) ? d[0] : null;
  },
  async logSearch(token, userId, query, country) {
    await fetch(`${SUPABASE_URL}/rest/v1/searches`, { method: "POST", headers: sb.ah(token), body: JSON.stringify({ user_id: userId, query, country, created_at: new Date().toISOString() }) });
  },
  async logClick(token, tag, retailer, product, revenue) {
    await fetch(`${SUPABASE_URL}/rest/v1/affiliate_clicks`, { method: "POST", headers: sb.ah(token), body: JSON.stringify({ affiliate_tag: tag, retailer, product_name: product, estimated_revenue: revenue, clicked_at: new Date().toISOString() }) });
  }
};

const AFFILIATE = {
  Amazon:     { tag: "deepn-20",  rate: 0.04, color: "#FF9900" },
  Walmart:    { tag: "deepn-wm",  rate: 0.04, color: "#0071CE" },
  Target:     { tag: "deepn-tg",  rate: 0.08, color: "#CC0000" },
  "Best Buy": { tag: "deepn-bb",  rate: 0.01, color: "#0046BE" },
  iHerb:      { tag: "deepn-ih",  rate: 0.10, color: "#6DB33F" },
  REI:        { tag: "deepn-rei", rate: 0.05, color: "#3D7A3D" },
  eBay:       { tag: "deepn-eb",  rate: 0.03, color: "#E53238" },
};

function affUrl(url, retailer) {
  const a = AFFILIATE[retailer]; if (!a) return url;
  try {
    const u = new URL(url);
    if (retailer === "Amazon") u.searchParams.set("tag", a.tag);
    else u.searchParams.set("ref", a.tag);
    return u.toString();
  } catch { return url; }
}

const COUNTRIES = [
  { code:"US", name:"United States", flag:"🇺🇸", currency:"USD", retailers:"Amazon, Walmart, Best Buy, Target" },
  { code:"GB", name:"United Kingdom", flag:"🇬🇧", currency:"GBP", retailers:"Amazon UK, Currys, Argos" },
  { code:"ES", name:"Spain",          flag:"🇪🇸", currency:"EUR", retailers:"Amazon ES, El Corte Inglés, MediaMarkt" },
  { code:"DE", name:"Germany",        flag:"🇩🇪", currency:"EUR", retailers:"Amazon DE, MediaMarkt, Saturn" },
  { code:"FR", name:"France",         flag:"🇫🇷", currency:"EUR", retailers:"Amazon FR, Fnac, Cdiscount" },
  { code:"CA", name:"Canada",         flag:"🇨🇦", currency:"CAD", retailers:"Amazon CA, Best Buy CA" },
  { code:"AU", name:"Australia",      flag:"🇦🇺", currency:"AUD", retailers:"Amazon AU, JB Hi-Fi" },
  { code:"MX", name:"Mexico",         flag:"🇲🇽", currency:"MXN", retailers:"Amazon MX, Mercado Libre" },
  { code:"JP", name:"Japan",          flag:"🇯🇵", currency:"JPY", retailers:"Amazon JP, Rakuten" },
];

const TRENDING = ["PS5","iPhone 16","AirPods Pro","Gaming Laptop","E-Bike","MacBook Air","Nike Air Max","4K TV","Dyson V15","Protein Powder"];
const CATS = ["All","Electronics","Gaming","Computers","Sports","Home","Fashion","Health","Toys","Automotive"];
const DEFAULT_COUNTRY = COUNTRIES[0];

// Session stored in localStorage (works in StackBlitz/Vercel, not Claude sandbox)
const store = {
  save: (s) => { try { localStorage.setItem("dn:sess", JSON.stringify(s)); } catch {} },
  load: () => { try { const s = localStorage.getItem("dn:sess"); return s ? JSON.parse(s) : null; } catch { return null; } },
  clear: () => { try { localStorage.removeItem("dn:sess"); } catch {} }
};

function Avatar({ name = "?", size = 38 }) {
  const i = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return <div style={{ width: size, height: size, borderRadius: "50%", background: "#6ee7b7", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.36, color: "#064e3b", flexShrink: 0 }}>{i}</div>;
}

function Spin({ label = "Loading..." }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 0" }}>
      <div style={{ width: 30, height: 30, border: "3px solid #d1fae5", borderTop: "3px solid #10b981", borderRadius: "50%", animation: "dspin .8s linear infinite", margin: "0 auto 12px" }} />
      <style>{`@keyframes dspin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontSize: 13, color: "#6b7280" }}>{label}</div>
    </div>
  );
}

function Toast({ msg, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); });
  const bg = type === "error" ? "#991b1b" : type === "info" ? "#1e40af" : "#065f46";
  return <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: bg, color: "#fff", padding: "12px 22px", borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 9999, maxWidth: 340, textAlign: "center" }}>{msg}</div>;
}

function Stars({ r }) {
  return <span style={{ color: "#f59e0b", fontSize: 13 }}>{"★".repeat(Math.floor(r))}{"☆".repeat(5 - Math.floor(r))}<span style={{ color: "#9ca3af", marginLeft: 4, fontSize: 12 }}>{r}</span></span>;
}

function Pill({ label, type = "best" }) {
  const m = { best: ["#d1fae5","#065f46"], sale: ["#fef3c7","#92400e"], hot: ["#fee2e2","#991b1b"], new: ["#ede9fe","#5b21b6"] };
  const [bg, col] = m[type] || m.best;
  return <span style={{ background: bg, color: col, fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>{label}</span>;
}

function Card({ p, saved, onSave, onCompare, comparing, session }) {
  const aff = AFFILIATE[p.retailer] || AFFILIATE.Amazon;
  const isSaved = saved.some(s => s.name === p.name && s.retailer === p.retailer);
  const isCmp = comparing.some(c => c.name === p.name && c.retailer === p.retailer);

  async function deal() {
    const url = affUrl(p.url, p.retailer);
    const rev = parseFloat(String(p.price).replace(/[^0-9.]/g, "")) * aff.rate;
    if (session?.token) { try { await sb.logClick(session.token, aff.tag, p.retailer, p.name, rev); } catch {} }
    window.open(url, "_blank");
  }

  return (
    <div style={{ background: "#fff", border: p.badge === "best" ? "2px solid #10b981" : "1px solid #e5e7eb", borderRadius: 16, padding: 14, marginBottom: 12, position: "relative" }}>
      {p.badge && <div style={{ position: "absolute", top: 12, right: 12 }}><Pill label={p.badgeLabel} type={p.badge} /></div>}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 68, height: 68, borderRadius: 12, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>{p.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111", lineHeight: 1.3, paddingRight: 52, marginBottom: 4 }}>{p.name}</div>
          <span style={{ background: aff.color + "22", color: aff.color === "#FF9900" ? "#7a4500" : aff.color, padding: "1px 8px", borderRadius: 10, fontWeight: 600, fontSize: 11 }}>{p.retailer}</span>
          <div style={{ marginTop: 5 }}><Stars r={p.rating} /><span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>({Number(p.reviews).toLocaleString()})</span></div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 10, gap: 8 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>{p.price}</span>
        {p.oldPrice && <><span style={{ fontSize: 13, color: "#9ca3af", textDecoration: "line-through" }}>{p.oldPrice}</span><span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>Save!</span></>}
      </div>
      {p.pros && <div style={{ marginTop: 8, background: "#f9fafb", borderRadius: 8, padding: "8px 10px" }}><div style={{ fontSize: 10, fontWeight: 800, color: "#9ca3af", marginBottom: 2 }}>WHY BUY</div><div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{p.pros}</div></div>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={deal} style={{ flex: 2, padding: "11px 0", borderRadius: 10, background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>View Deal →</button>
        <button onClick={() => onCompare(p)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, background: isCmp ? "#ede9fe" : "#f3f4f6", color: isCmp ? "#7c3aed" : "#374151", border: "none", fontSize: 12, cursor: "pointer" }}>{isCmp ? "✓ Added" : "+ Compare"}</button>
        <button onClick={() => onSave(p)} style={{ width: 42, borderRadius: 10, background: isSaved ? "#fee2e2" : "#f3f4f6", border: "none", fontSize: 18, cursor: "pointer" }}>{isSaved ? "❤️" : "🤍"}</button>
      </div>
    </div>
  );
}

function CmpModal({ items, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 900, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "75vh", overflow: "auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Compare ({items.length})</div>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 280 }}>
            <thead><tr>{["Feature",...items.map(p => p.name.slice(0,20))].map((h,i) => <th key={i} style={{ padding: "8px 6px", textAlign: i===0?"left":"center", color: "#6b7280", fontWeight: 600, fontSize: 11 }}>{i>0&&<div style={{fontSize:18,marginBottom:2}}>{items[i-1].icon}</div>}{h}</th>)}</tr></thead>
            <tbody>
              {["price","rating","retailer","reviews"].map(attr => (
                <tr key={attr} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "9px 6px", color: "#6b7280", fontWeight: 600, textTransform: "capitalize", fontSize: 12 }}>{attr}</td>
                  {items.map((p, i) => {
                    const val = attr === "reviews" ? Number(p[attr]).toLocaleString() : p[attr];
                    const best = attr === "rating" && p.rating === Math.max(...items.map(x => x.rating));
                    return <td key={i} style={{ padding: "9px 6px", textAlign: "center", color: best ? "#10b981" : "#374151", fontWeight: best ? 700 : 400 }}>{val}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 10 }}>Prices sourced from partner retailers</div>
      </div>
    </div>
  );
}

function LocSheet({ current, onSave, onClose }) {
  const [sel, setSel] = useState(current || DEFAULT_COUNTRY);
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState(false);
  function detect() {
    setDetecting(true);
    navigator.geolocation?.getCurrentPosition(() => { setDetected(true); setDetecting(false); }, () => setDetecting(false));
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 900, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "88vh", overflow: "auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>📍 Location</div>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ background: detected ? "#ecfdf5" : "#f9fafb", borderRadius: 12, padding: "12px 14px", marginBottom: 14, border: `1px solid ${detected ? "#a7f3d0" : "#e5e7eb"}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: detected ? "#065f46" : "#374151", marginBottom: 6 }}>{detected ? "✓ Location detected" : "Use my current location"}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>For local retailer prices and availability</div>
          <button onClick={detect} disabled={detecting || detected} style={{ padding: "8px 14px", borderRadius: 8, background: detected ? "#10b981" : "#064e3b", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: detected ? "default" : "pointer" }}>{detecting ? "Detecting..." : detected ? "✓ Enabled" : "Enable GPS"}</button>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>Choose country</div>
        {COUNTRIES.map(c => (
          <button key={c.code} onClick={() => setSel(c)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 14px", borderRadius: 12, border: sel.code === c.code ? "2px solid #10b981" : "1px solid #e5e7eb", background: sel.code === c.code ? "#ecfdf5" : "#fff", cursor: "pointer", marginBottom: 6, textAlign: "left" }}>
            <span style={{ fontSize: 22 }}>{c.flag}</span>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{c.name}</div><div style={{ fontSize: 11, color: "#6b7280" }}>{c.retailers}</div></div>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{c.currency}</span>
            {sel.code === c.code && <span style={{ color: "#10b981", fontWeight: 800 }}>✓</span>}
          </button>
        ))}
        <button onClick={() => onSave(sel)} style={{ width: "100%", padding: 14, borderRadius: 14, background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 8 }}>Save Location</button>
      </div>
    </div>
  );
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr(""); setLoading(true);
    if (!email || !pass) { setErr("Please fill all fields"); setLoading(false); return; }
    try {
      if (mode === "register") {
        const data = await sb.signUp(email, pass);
        if (data.error || data.msg) { setErr(data.error?.message || data.msg || "Sign up failed"); setLoading(false); return; }
        const token = data.access_token;
        const userId = data.user?.id;
        if (!token) { setErr("Account created! Please check your email to confirm, then log in."); setLoading(false); return; }
        const profile = { id: userId, name: name || email.split("@")[0], email, country: DEFAULT_COUNTRY, saved: [], alerts: [], history: [], created_at: new Date().toISOString() };
        await sb.upsertProfile(token, profile);
        onAuth({ user: data.user, token, profile });
      } else {
        const data = await sb.signIn(email, pass);
        if (data.error || data.error_description) { setErr(data.error_description || data.error || "Invalid credentials"); setLoading(false); return; }
        const token = data.access_token;
        const userId = data.user?.id;
        const profile = await sb.getProfile(token, userId) || { id: userId, name: email.split("@")[0], email, country: DEFAULT_COUNTRY, saved: [], alerts: [], history: [] };
        onAuth({ user: data.user, token, profile });
      }
    } catch (e) { setErr("Network error — please try again"); }
    setLoading(false);
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#f9fafb", minHeight: "100vh", maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "linear-gradient(160deg,#064e3b,#065f46)", padding: "64px 24px 44px", textAlign: "center" }}>
        <div style={{ fontSize: 42, fontWeight: 900, color: "#fff", letterSpacing: -2 }}>Deep<span style={{ color: "#6ee7b7" }}>N</span></div>
        <div style={{ fontSize: 13, color: "#a7f3d0", marginTop: 6 }}>Find the best deal, anywhere on Earth</div>
      </div>
      <div style={{ flex: 1, padding: "28px 20px" }}>
        <div style={{ display: "flex", background: "#e5e7eb", borderRadius: 12, padding: 4, marginBottom: 22 }}>
          {["login","register"].map(m => <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", background: mode === m ? "#fff" : "transparent", color: mode === m ? "#064e3b" : "#6b7280" }}>{m === "login" ? "Log In" : "Sign Up"}</button>)}
        </div>
        {err && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{err}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "register" && <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Full Name</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ height: 46, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 14px", fontSize: 15, width: "100%", boxSizing: "border-box" }} />
          </>}
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Email</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={{ height: 46, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 14px", fontSize: 15, width: "100%", boxSizing: "border-box" }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Password</div>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="••••••••" style={{ height: 46, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 14px", fontSize: 15, width: "100%", boxSizing: "border-box" }} />
          <button onClick={submit} disabled={loading} style={{ height: 50, borderRadius: 14, background: loading ? "#a7f3d0" : "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", fontWeight: 800, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", marginTop: 6 }}>
            {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#6b7280" }}>
          {mode === "login" ? "No account? " : "Have an account? "}
          <span onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(""); }} style={{ color: "#10b981", fontWeight: 700, cursor: "pointer" }}>{mode === "login" ? "Sign Up" : "Log In"}</span>
        </div>
        <div style={{ marginTop: 22, background: "#f3f4f6", borderRadius: 14, padding: "14px 16px" }}>
          {["Save products & wishlist","Price drop alerts","Local deals by country","Search history synced"].map(f => <div key={f} style={{ fontSize: 12, color: "#6b7280", padding: "4px 0" }}>✓ {f}</div>)}
        </div>
      </div>
    </div>
  );
}

export default function DeepN() {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);
  const [screen, setScreen] = useState("home");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState("");
  const [searching, setSearching] = useState(false);
  const [sortBy, setSortBy] = useState("best");
  const [comparing, setComparing] = useState([]);
  const [showCmp, setShowCmp] = useState(false);
  const [showLoc, setShowLoc] = useState(false);
  const [toast, setToast] = useState(null);

  const prof = session?.profile || {};
  const saved = prof.saved || [];
  const alerts = prof.alerts || [];
  const history = prof.history || [];
  const country = prof.country || DEFAULT_COUNTRY;

  useEffect(() => {
    const s = store.load();
    if (s) setSession(s);
    setBooting(false);
  }, []);

  function toast_(msg, type) { setToast({ msg, type }); }

  async function handleAuth(s) { setSession(s); store.save(s); }

  async function logout() {
    try { if (session?.token) await sb.signOut(session.token); } catch {}
    store.clear(); setSession(null); setScreen("home"); setResults([]); setQuery("");
  }

  async function patch(update) {
    const p = { ...prof, ...update };
    const s = { ...session, profile: p };
    setSession(s); store.save(s);
    if (session?.token) { try { await sb.upsertProfile(session.token, p); } catch {} }
  }

  async function toggleSave(p) {
    const ex = saved.some(s => s.name === p.name && s.retailer === p.retailer);
    await patch({ saved: ex ? saved.filter(s => !(s.name === p.name && s.retailer === p.retailer)) : [...saved, p] });
    toast_(ex ? "Removed from saved" : "Saved! ❤️", ex ? "info" : "success");
  }

  function toggleCmp(p) {
    setComparing(prev => {
      if (prev.some(c => c.name === p.name && c.retailer === p.retailer)) return prev.filter(c => !(c.name === p.name && c.retailer === p.retailer));
      if (prev.length >= 4) { toast_("Max 4 items", "error"); return prev; }
      return [...prev, p];
    });
  }

  function sorted(arr) {
    const a = [...arr];
    const num = s => parseFloat(String(s).replace(/[^0-9.]/g, "")) || 0;
    if (sortBy === "low") return a.sort((x, y) => num(x.price) - num(y.price));
    if (sortBy === "high") return a.sort((x, y) => num(y.price) - num(x.price));
    if (sortBy === "rating") return a.sort((x, y) => y.rating - x.rating);
    return a.sort((x, y) => (y.badge === "best" ? 1 : 0) - (x.badge === "best" ? 1 : 0));
  }

  async function search(q) {
    if (!q.trim()) return;
    setSearching(true); setResults([]); setSummary(""); setScreen("results");
    await patch({ history: [q, ...history.filter(x => x !== q)].slice(0, 20) });
    if (session?.token) { try { await sb.logSearch(session.token, session.user?.id, q, country.name); } catch {} }

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, category: cat, country })
      });
      const parsed = await res.json();
      setResults(parsed.products || []);
      setSummary(parsed.summary || "");
    } catch { setSummary("Search failed — please try again."); }
    setSearching(false);
  }

  const F = { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
  const wrap = { ...F, background: "#f9fafb", minHeight: "100vh", maxWidth: 430, margin: "0 auto", position: "relative", paddingBottom: 78 };
  const hdr = { background: "#064e3b", padding: "50px 16px 16px", position: "sticky", top: 0, zIndex: 50 };

  const Tabs = () => (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderTop: "1px solid #e5e7eb", display: "flex", zIndex: 100 }}>
      {[["home","🔍","Search"],["saved","❤️","Saved"],["alerts","🔔","Alerts"],["profile","👤","Profile"]].map(([id,icon,label]) => (
        <button key={id} onClick={() => setScreen(id)} style={{ flex: 1, padding: "10px 0 6px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontSize: 10, color: screen === id ? "#10b981" : "#9ca3af", fontWeight: screen === id ? 700 : 400 }}>{label}</span>
        </button>
      ))}
    </div>
  );

  if (booting) return <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 40, fontWeight: 900, color: "#064e3b" }}>Deep<span style={{ color: "#10b981" }}>N</span></div><div style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>Loading...</div></div></div>;
  if (!session) return <AuthScreen onAuth={handleAuth} />;

  if (screen === "home") return (
    <div style={wrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div style={{ background: "linear-gradient(160deg,#064e3b,#065f46)", padding: "50px 18px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: -1 }}>Deep<span style={{ color: "#6ee7b7" }}>N</span></div>
            <div style={{ fontSize: 12, color: "#a7f3d0" }}>Hi {(prof.name || "there").split(" ")[0]} 👋</div>
          </div>
          <button onClick={() => setShowLoc(true)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 20, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>{country.flag} {country.code} ›</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search(query)} placeholder={`Search in ${country.name}...`} style={{ flex: 1, height: 46, borderRadius: 12, border: "none", padding: "0 16px", fontSize: 15, background: "rgba(255,255,255,0.15)", color: "#fff", outline: "none" }} />
          <button onClick={() => search(query)} style={{ width: 46, height: 46, borderRadius: 12, background: "#6ee7b7", border: "none", fontSize: 22, cursor: "pointer" }}>🔍</button>
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {CATS.map(c => <button key={c} onClick={() => setCat(c)} style={{ padding: "5px 12px", borderRadius: 20, whiteSpace: "nowrap", background: cat === c ? "#6ee7b7" : "rgba(255,255,255,0.15)", color: cat === c ? "#064e3b" : "#d1fae5", border: "none", fontSize: 12, fontWeight: cat === c ? 700 : 400, cursor: "pointer" }}>{c}</button>)}
        </div>
      </div>
      <div style={{ padding: "18px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>🔥 Trending in {country.name}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
          {TRENDING.map(t => <button key={t} onClick={() => { setQuery(t); search(t); }} style={{ padding: "7px 14px", borderRadius: 20, background: "#fff", border: "1px solid #e5e7eb", fontSize: 13, color: "#374151", cursor: "pointer" }}>{t}</button>)}
        </div>
        {history.length > 0 && <>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>🕐 Recent</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {history.slice(0, 8).map((h, i) => <button key={i} onClick={() => { setQuery(h); search(h); }} style={{ padding: "7px 14px", borderRadius: 20, background: "#ecfdf5", border: "1px solid #a7f3d0", fontSize: 12, color: "#065f46", cursor: "pointer", whiteSpace: "nowrap" }}>{h}</button>)}
          </div>
        </>}
      </div>
      {showLoc && <LocSheet current={country} onSave={async c => { await patch({ country: c }); setShowLoc(false); toast_(`${c.flag} ${c.name}`, "success"); }} onClose={() => setShowLoc(false)} />}
      <Tabs />
    </div>
  );

  if (screen === "results") return (
    <div style={wrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div style={hdr}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <button onClick={() => setScreen("home")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 10, width: 36, height: 36, fontSize: 16, cursor: "pointer" }}>←</button>
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search(query)} style={{ flex: 1, height: 36, borderRadius: 10, border: "none", padding: "0 12px", fontSize: 14, background: "rgba(255,255,255,0.15)", color: "#fff", outline: "none" }} />
          <button onClick={() => search(query)} style={{ background: "#6ee7b7", border: "none", color: "#064e3b", borderRadius: 10, width: 36, height: 36, fontWeight: 800, cursor: "pointer" }}>→</button>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#6ee7b7" }}>{country.flag} {country.code}</span>
          {[["best","Best"],["low","$ Low"],["high","$ High"],["rating","⭐"]].map(([v,l]) => <button key={v} onClick={() => setSortBy(v)} style={{ padding: "4px 10px", borderRadius: 20, background: sortBy===v?"#6ee7b7":"rgba(255,255,255,0.12)", color: sortBy===v?"#064e3b":"#d1fae5", border: "none", fontSize: 11, fontWeight: sortBy===v?800:400, cursor: "pointer" }}>{l}</button>)}
          {comparing.length > 0 && <button onClick={() => setShowCmp(true)} style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 20, background: "#7c3aed", color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Compare ({comparing.length})</button>}
        </div>
      </div>
      <div style={{ padding: "14px 16px 0" }}>
        {searching && <Spin label={`Searching in ${country.name}...`} />}
        {!searching && summary && <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 800, color: "#065f46", marginBottom: 3 }}>🤖 AI BUYING GUIDE</div><div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{summary}</div></div>}
        {!searching && results.length > 0 && <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>{results.length} results for <strong style={{ color: "#111" }}>"{query}"</strong></div>}
        {sorted(results).map((p, i) => <Card key={i} p={p} saved={saved} onSave={toggleSave} onCompare={toggleCmp} comparing={comparing} session={session} />)}
      </div>
      {showCmp && comparing.length > 0 && <CmpModal items={comparing} onClose={() => setShowCmp(false)} />}
      <Tabs />
    </div>
  );

  if (screen === "saved") return (
    <div style={wrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div style={hdr}><div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>❤️ Saved Items</div><div style={{ fontSize: 12, color: "#a7f3d0" }}>{saved.length} items</div></div>
      <div style={{ padding: 16 }}>
        {saved.length === 0
          ? <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}><div style={{ fontSize: 52 }}>🤍</div><div style={{ marginTop: 12, fontSize: 14 }}>Nothing saved yet</div><div style={{ fontSize: 13, marginTop: 4 }}>Tap 🤍 on any product</div></div>
          : sorted(saved).map((p, i) => <Card key={i} p={p} saved={saved} onSave={toggleSave} onCompare={toggleCmp} comparing={comparing} session={session} />)}
      </div>
      <Tabs />
    </div>
  );

  if (screen === "alerts") return (
    <div style={wrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div style={hdr}><div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>🔔 Price Alerts</div><div style={{ fontSize: 12, color: "#a7f3d0" }}>{alerts.length} active</div></div>
      <div style={{ padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid #e5e7eb", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>New Alert</div>
          <input id="ap" placeholder="Product name..." style={{ width: "100%", height: 42, borderRadius: 10, border: "1px solid #e5e7eb", padding: "0 12px", fontSize: 14, marginBottom: 8, boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <input id="apr" placeholder={`Max price (${country.currency})`} type="number" style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid #e5e7eb", padding: "0 12px", fontSize: 14 }} />
            <button onClick={async () => {
              const p = document.getElementById("ap").value, r = document.getElementById("apr").value;
              if (!p || !r) return;
              await patch({ alerts: [...alerts, { product: p, price: r, currency: country.currency, date: new Date().toLocaleDateString() }] });
              document.getElementById("ap").value = ""; document.getElementById("apr").value = "";
              toast_("Alert set! 🔔", "success");
            }} style={{ padding: "0 18px", borderRadius: 10, background: "#10b981", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>Set</button>
          </div>
        </div>
        {alerts.length === 0
          ? <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}><div style={{ fontSize: 48 }}>🔔</div><div style={{ marginTop: 12, fontSize: 14 }}>No alerts yet</div></div>
          : alerts.map((a, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{a.product}</div><div style={{ fontSize: 12, color: "#6b7280" }}>Under {a.currency} {a.price} · {a.date}</div></div>
              <button onClick={async () => { await patch({ alerts: alerts.filter((_,j) => j!==i) }); }} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Remove</button>
            </div>
          ))}
      </div>
      <Tabs />
    </div>
  );

  if (screen === "profile") return (
    <div style={wrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div style={hdr}><div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>👤 Profile</div></div>
      <div style={{ padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid #e5e7eb", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
            <Avatar name={prof.name} size={54} />
            <div><div style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{prof.name}</div><div style={{ fontSize: 13, color: "#6b7280" }}>{prof.email}</div></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {[["Saved",saved.length],["Alerts",alerts.length],["Searches",history.length]].map(([l,v]) => (
              <div key={l} style={{ background: "#f9fafb", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#064e3b" }}>{v}</div>
                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: 12 }}>
          <button onClick={() => setShowLoc(true)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 16px", background: "none", border: "none", borderBottom: "1px solid #f3f4f6", cursor: "pointer", textAlign: "left" }}>
            <span style={{ fontSize: 20 }}>📍</span>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Location</div><div style={{ fontSize: 12, color: "#6b7280" }}>{country.flag} {country.name}</div></div>
            <span style={{ color: "#9ca3af" }}>›</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ fontSize: 20 }}>🗄️</span>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Database</div><div style={{ fontSize: 12, color: "#10b981" }}>✓ Supabase connected</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
            <span style={{ fontSize: 20 }}>🔗</span>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Affiliate Links</div><div style={{ fontSize: 12, color: "#10b981" }}>✓ Auto-embedded on all deals</div></div>
          </div>
        </div>
        {history.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🕐 Search History</div>
            {history.slice(0, 5).map((h, i) => (
              <button key={i} onClick={() => { setQuery(h); search(h); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 0", background: "none", border: "none", borderBottom: i < 4 ? "1px solid #f9fafb" : "none", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>🕐</span>
                <span style={{ fontSize: 13, color: "#374151", flex: 1 }}>{h}</span>
                <span style={{ color: "#9ca3af" }}>→</span>
              </button>
            ))}
            <button onClick={() => patch({ history: [] })} style={{ marginTop: 10, width: "100%", padding: "8px 0", borderRadius: 10, background: "none", border: "1px solid #e5e7eb", color: "#dc2626", fontSize: 13, cursor: "pointer" }}>Clear History</button>
          </div>
        )}
        <button onClick={logout} style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: "#fee2e2", color: "#dc2626", border: "none", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Log Out</button>
      </div>
      {showLoc && <LocSheet current={country} onSave={async c => { await patch({ country: c }); setShowLoc(false); toast_(`${c.flag} ${c.name}`, "success"); }} onClose={() => setShowLoc(false)} />}
      <Tabs />
    </div>
  );
}