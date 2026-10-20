// @ts-nocheck
// Shared UI atoms. `Icons` (all of lucide-react) is injected by the Yumina sandbox.
export function Icon(p) {
  var lib = typeof Icons !== "undefined" ? Icons : null; var C = lib && (lib[p.n] || lib[p.alt] || lib.Circle);
  if (!C) return <span className="eIcFallback" style={{ width: p.s || 16, height: p.s || 16 }} />;
  return <C size={p.s || 16} strokeWidth={p.w || 1.6} className={p.c || ""} />;
}
export function Bar(p) { var pct = p.max > 0 ? Math.max(0, Math.min(100, p.cur / p.max * 100)) : 0; return <div className={"eBar " + (p.kind || "")}><div className="eBarFill" style={{ width: pct + "%" }} /><span>{p.label != null ? p.label : Math.round(p.cur) + " / " + Math.round(p.max)}</span></div>; }
export function Win(p) {
  return <div className={"eWinBack" + (p.wide ? " wide" : "")} onMouseDown={function (e) { if (e.target === e.currentTarget) p.onClose(); }}>
    <div className={"eWin " + (p.cls || "")} role="dialog" aria-label={p.title}>
      <div className="eWinHead">{p.icon ? <Icon n={p.icon} s={20} /> : null}<h2>{p.title}</h2>{p.tabs ? <div className="eTabs">{p.tabs.map(function (t) { return <button key={t[0]} className={p.tab === t[0] ? "on" : ""} onClick={function () { p.setTab(t[0]); }}>{t[1]}</button>; })}</div> : null}<button className="eX" onClick={p.onClose} aria-label="Close"><Icon n="X" s={18} /></button></div>
      <div className="eWinBody">{p.children}</div>
    </div>
  </div>;
}
export function cleanGM(text) {
  return String(text || "").split("\n").filter(function (l) { var t = l.trim(); if (/^\|.*\|$/.test(t)) return false; if (/^\[[^\]\n]{1,200}\]$/.test(t)) return false; return true; }).join("\n").trim();
}
export function stripReport(text) { var s = String(text || ""); if (s.indexOf("[Real-time play since my last message") === 0) { var i = s.indexOf("\n\n"); return i >= 0 ? s.slice(i + 2) : s; } return s; }
