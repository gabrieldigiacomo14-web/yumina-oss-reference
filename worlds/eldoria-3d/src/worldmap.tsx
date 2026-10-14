// @ts-nocheck
// The cartographer's map: the whole continent at true equal scale (1 unit = 1 mile),
// hidden under fog of war until explored. Known locations come from the shared
// known-locations variable, so places the GM teaches you appear too.
import { paintMap, ROADS, RIVERS, PLACE_BY_ID, REALM_COLORS } from "./worldgen";
import { FOG_W, FOG_H, FOG_CELL } from "./game";
import { Icon } from "./ui";

var BASE = null, BASE_JOB = null, BASE_LISTENERS = [];
export function ensureBaseMap(onReady) {
  if (BASE && BASE.done) { onReady && onReady(BASE.canvas); return; }
  if (onReady) BASE_LISTENERS.push(onReady);
  if (BASE_JOB) return;
  var c = document.createElement("canvas"); c.width = FOG_W; c.height = FOG_H; BASE = { canvas: c, done: false };
  BASE_JOB = paintMap(c.getContext("2d"), { cx: 0, cy: 0, mpp: FOG_CELL, w: FOG_W, h: FOG_H }, "parchment", function () { BASE.done = true; BASE_LISTENERS.forEach(function (f) { f(c); }); BASE_LISTENERS = []; }, 4);
}
var LABELS = [["AURELIA", 0, 30], ["STONEHOLD", 450, 260], ["SYLVANOR", -650, 330], ["DRAKMOR", 0, 610], ["SUNSCAR", -760, -420], ["VELKAR", -40, -560], ["UMBRAL REACH", 850, 200], ["The Grey Sea", -760, -30], ["The Sapphire Sea", 250, -420], ["The Frostsea", -800, 700], ["The Southern Ocean", -700, -870], ["The Silver Ocean", -1170, 300]];
var KIND_STYLE = { capital: ["#e8c66a", 6], city: ["#d8b860", 5], "fort-town": ["#c8b080", 4.5], town: ["#d0c0a0", 4], village: ["#b8a888", 3.2], hamlet: ["#a89878", 2.6], fort: ["#a0a8b8", 4], stronghold: ["#b090d0", 5], ruin: ["#9a8a7a", 3.4], dungeon: ["#c06050", 3.6], tower: ["#a0a0b0", 3], monastery: ["#e0e0c0", 3.4], shrine: ["#90c090", 3], camp: ["#c0a070", 3], landmark: ["#c0c0c0", 4] };

export function WorldMap(props) {
  var R = React; var v = props.v || {}; var snap = props.snap || {};
  var canvasRef = R.useRef(null), wrapRef = R.useRef(null);
  var [ready, setReady] = R.useState(!!(BASE && BASE.done));
  var [view, setView] = R.useState({ cx: snap.x || 0, cy: snap.y || 0, z: 3.2 }); // opens on your surroundings
  var [region, setRegion] = R.useState(null); // sharper local render {cx, cy, mpp, canvas}
  var [sel, setSel] = R.useState(null);
  var fogCanvas = R.useMemo(function () { var c = document.createElement("canvas"); c.width = FOG_W; c.height = FOG_H; return c; }, []);
  R.useEffect(function () { ensureBaseMap(function () { setReady(true); }); }, []);
  // fog bitmap → soft veil
  R.useEffect(function () { var fog = props.fog; if (!fog) return; var ctx = fogCanvas.getContext("2d"); var img = ctx.createImageData(FOG_W, FOG_H); for (var i = 0; i < fog.length; i++) { var o = i * 4; img.data[o] = 24; img.data[o + 1] = 19; img.data[o + 2] = 13; img.data[o + 3] = fog[i] ? 0 : 245; } ctx.putImageData(img, 0, 0); }, [props.fogVersion]);
  var known = v["known-locations"] && typeof v["known-locations"] === "object" ? v["known-locations"] : {};
  var quests = Array.isArray(v["quest-log"]) ? v["quest-log"] : [];
  var pins = Object.keys(known).map(function (k) { var L = known[k] || {}; return { id: k, name: L.name || k, x: Number(L.x), y: Number(L.y), kind: L.kind || (PLACE_BY_ID[k] && PLACE_BY_ID[k].kind) || "town", region: L.region || "", approximate: !!L.approximate, visited: L.discovered !== false, method: L.discoveryMethod || "" }; }).filter(function (p) { return isFinite(p.x) && isFinite(p.y); });
  var questPins = []; quests.forEach(function (q) { if (!q || /complete|failed|abandon/i.test(String(q.status || ""))) return; var hay = JSON.stringify(q).toLowerCase(); pins.forEach(function (p) { if (hay.indexOf(String(p.name).toLowerCase().split(" / ")[0]) >= 0) questPins.push({ x: p.x, y: p.y, q: q.title || q.id }); }); });

  function size() { var el = wrapRef.current; return el ? { w: el.clientWidth, h: el.clientHeight } : { w: 800, h: 560 }; }
  var fit = function () { var s = size(); return Math.min(s.w / 2500, s.h / 1800) * 0.98; };
  var z = view.z || fit();
  // When zoomed in, paint a 1-mile-per-pixel regional sheet around the view centre (cached per 150-mile cell).
  R.useEffect(function () {
    if (z < 1.2) return; var kx = Math.round(view.cx / 150) * 150, ky = Math.round(view.cy / 150) * 150; var key = kx + "," + ky;
    if (region && region.key === key) return; var c = document.createElement("canvas"); c.width = 420; c.height = 420; var cancel = paintMap(c.getContext("2d"), { cx: kx, cy: ky, mpp: 1, w: 420, h: 420 }, "parchment", function () { setRegion({ key: key, cx: kx, cy: ky, canvas: c }); }, 6);
    return cancel;
  }, [Math.round(view.cx / 150), Math.round(view.cy / 150), z >= 1.2]);
  function toScreen(x, y) { var s = size(); return [(x - view.cx) * z + s.w / 2, (view.cy - y) * z + s.h / 2]; }
  function toWorld(px, py) { var s = size(); return [(px - s.w / 2) / z + view.cx, view.cy - (py - s.h / 2) / z]; }

  R.useEffect(function () {
    var c = canvasRef.current; if (!c) return; var s = size(); var dpr = Math.min(2, window.devicePixelRatio || 1); c.width = s.w * dpr; c.height = s.h * dpr; c.style.width = s.w + "px"; c.style.height = s.h + "px";
    var ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = "#1a150e"; ctx.fillRect(0, 0, s.w, s.h);
    var o = toScreen(-1250, 900); var W = 2500 * z, H = 1800 * z;
    if (BASE && BASE.done) { ctx.imageSmoothingEnabled = true; ctx.drawImage(BASE.canvas, o[0], o[1], W, H); }
    if (region && z >= 1.2) { var ro = toScreen(region.cx - 210, region.cy + 210); ctx.drawImage(region.canvas, ro[0], ro[1], 420 * z, 420 * z); }
    // grid at canonical scale: minor 50 mi, major 250 mi
    ctx.lineWidth = 1; [[50, "rgba(60,44,24,0.12)"], [250, "rgba(60,44,24,0.3)"]].forEach(function (g) { if (g[0] * z < 6) return; ctx.strokeStyle = g[1]; ctx.beginPath(); for (var x = -1250; x <= 1250; x += g[0]) { var a = toScreen(x, 900), b = toScreen(x, -900); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } for (var y = -900; y <= 900; y += g[0]) { var a2 = toScreen(-1250, y), b2 = toScreen(1250, y); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); } ctx.stroke(); });
    // rivers & roads (hidden by fog where unexplored)
    ctx.strokeStyle = "rgba(52,92,118,0.85)"; ctx.lineWidth = Math.max(1, z * 0.6); RIVERS.forEach(function (r) { if (r.dry) ctx.setLineDash([3, 3]); ctx.beginPath(); r.pts.forEach(function (p, i) { var s2 = toScreen(p[0], p[1]); i ? ctx.lineTo(s2[0], s2[1]) : ctx.moveTo(s2[0], s2[1]); }); ctx.stroke(); ctx.setLineDash([]); });
    ROADS.forEach(function (r) { ctx.strokeStyle = r.kind === "paved" ? "rgba(120,72,30,0.9)" : "rgba(120,80,40,0.65)"; ctx.lineWidth = r.kind === "paved" ? Math.max(1.2, z * 0.5) : 1; ctx.setLineDash(r.kind === "paved" ? [] : [4, 3]); ctx.beginPath(); r.pts.forEach(function (p, i) { var s2 = toScreen(p[0], p[1]); i ? ctx.lineTo(s2[0], s2[1]) : ctx.moveTo(s2[0], s2[1]); }); ctx.stroke(); }); ctx.setLineDash([]);
    ctx.textAlign = "center"; LABELS.forEach(function (l) { var s2 = toScreen(l[1], l[2]); var sea = /The /.test(l[0]); ctx.font = (sea ? "italic " : "600 ") + Math.max(10, Math.min(22, z * (sea ? 14 : 20))) + "px Cinzel, Georgia, serif"; ctx.fillStyle = sea ? "rgba(40,60,80,0.75)" : "rgba(70,40,20,0.7)"; ctx.fillText(l[0], s2[0], s2[1]); });
    // fog of war
    ctx.save(); ctx.imageSmoothingEnabled = true; try { ctx.filter = "blur(" + Math.max(1, z * 2.4) + "px)"; } catch (e) { } ctx.drawImage(fogCanvas, o[0], o[1], W, H); ctx.restore();
    // known locations
    pins.forEach(function (p) { var s2 = toScreen(p.x, p.y); var st = KIND_STYLE[p.kind] || KIND_STYLE.town; var r = st[1] * Math.max(0.8, Math.min(1.6, z * 2)); ctx.fillStyle = st[0]; ctx.strokeStyle = "#1a1208"; ctx.lineWidth = 1.5; ctx.beginPath(); if (/capital|city|stronghold/.test(p.kind)) { for (var k = 0; k < 10; k++) { var a = k / 10 * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.5 : r; ctx.lineTo(s2[0] + Math.cos(a) * rr, s2[1] + Math.sin(a) * rr); } ctx.closePath(); } else if (/ruin|dungeon/.test(p.kind)) { ctx.rect(s2[0] - r * 0.7, s2[1] - r * 0.7, r * 1.4, r * 1.4); } else ctx.arc(s2[0], s2[1], r * 0.7, 0, 7); ctx.fill(); ctx.stroke(); if (p.approximate) { ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.arc(s2[0], s2[1], r * 2, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      if (z > 0.55 || /capital|city/.test(p.kind)) { ctx.font = "600 " + Math.max(10, Math.min(15, 9 + z * 2)) + "px Cinzel, Georgia, serif"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(245,232,200,0.85)"; ctx.strokeText(p.name.split(" / ")[0], s2[0], s2[1] - r - 4); ctx.fillStyle = "#2a1a0a"; ctx.fillText(p.name.split(" / ")[0], s2[0], s2[1] - r - 4); }
      if (sel && sel.id === p.id) { ctx.strokeStyle = "#5d9fe0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s2[0], s2[1], r + 6, 0, 7); ctx.stroke(); } });
    questPins.forEach(function (q) { var s2 = toScreen(q.x, q.y); ctx.fillStyle = "#ffcf40"; ctx.font = "bold 16px serif"; ctx.fillText("✦", s2[0] + 9, s2[1] + 4); });
    // the adventurer
    var me = toScreen(snap.x || 0, snap.y || 0); ctx.save(); ctx.translate(me[0], me[1]); ctx.rotate(-(snap.yaw || 0) + Math.PI); ctx.fillStyle = "#2f7fd8"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, 7); ctx.lineTo(0, 3); ctx.lineTo(-7, 7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    // scale bar
    var miles = z > 2 ? 25 : z > 0.8 ? 100 : 250; var px = miles * z; ctx.fillStyle = "rgba(20,14,8,0.8)"; ctx.fillRect(16, s.h - 34, px + 16, 22); ctx.fillStyle = "#e8d8b0"; ctx.fillRect(24, s.h - 21, px, 3); ctx.font = "12px Georgia, serif"; ctx.textAlign = "left"; ctx.fillText(miles + " miles", 26, s.h - 25);
  });

  var drag = R.useRef(null);
  function onDown(e) { drag.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy, moved: false }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { } }
  function onMove(e) { var d = drag.current; if (!d) return; var dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true; setView({ cx: d.cx - dx / z, cy: d.cy + dy / z, z: z }); }
  function onUp(e) { var d = drag.current; drag.current = null; if (d && !d.moved) { var rect = e.currentTarget.getBoundingClientRect(); var px = e.clientX - rect.left, py = e.clientY - rect.top; var best = null, bd = 16; pins.forEach(function (p) { var s2 = toScreen(p.x, p.y); var dd = Math.hypot(s2[0] - px, s2[1] - py); if (dd < bd) { bd = dd; best = p; } }); setSel(best); } }
  function zoom(k, px, py) { var s = size(); px = px == null ? s.w / 2 : px; py = py == null ? s.h / 2 : py; var w = toWorld(px, py); var nz = Math.max(fit() * 0.9, Math.min(12, z * k)); setView({ cx: w[0] - (px - s.w / 2) / nz, cy: w[1] + (py - s.h / 2) / nz, z: nz }); }
  function onWheel(e) { var rect = e.currentTarget.getBoundingClientRect(); zoom(e.deltaY > 0 ? 0.85 : 1.18, e.clientX - rect.left, e.clientY - rect.top); }
  var explored = 0; if (props.fog) { for (var i = 0; i < props.fog.length; i++) explored += props.fog[i]; explored = Math.round(explored / props.fog.length * 1000) / 10; }
  var dist = sel ? Math.round(Math.hypot(sel.x - (snap.x || 0), sel.y - (snap.y || 0)) * 1.18) : 0;
  var canTravel = sel && PLACE_BY_ID[sel.id] && !snap.combat && !snap.down && dist > 3;
  return <div className="eMap">
    <div className="eMapCanvas" ref={wrapRef} onWheel={onWheel}>
      <canvas ref={canvasRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={function () { drag.current = null; }} />
      {!ready ? <div className="eMapLoading">The cartographer is inking the continent…</div> : null}
      <div className="eMapTools"><button onClick={function () { zoom(1.4); }} aria-label="Zoom in"><Icon n="Plus" s={18} /></button><button onClick={function () { zoom(1 / 1.4); }} aria-label="Zoom out"><Icon n="Minus" s={18} /></button><button onClick={function () { setView({ cx: snap.x || 0, cy: snap.y || 0, z: Math.max(z, 1.6) }); }} aria-label="Center on me"><Icon n="LocateFixed" s={18} /></button><button onClick={function () { setView({ cx: 0, cy: 0, z: 0 }); }} aria-label="Whole continent" title="Whole continent"><Icon n="Maximize" s={18} /></button></div>
      <div className="eRose"><span className="n">N</span><span className="e">E</span><span className="s">S</span><span className="w">W</span><Icon n="Compass" s={46} w={1} /></div>
    </div>
    <aside className="eMapSide">
      <div className="eMapStat"><b>{snap.location}</b><small>{snap.region} · ({(snap.x || 0).toFixed(1)}, {(snap.y || 0).toFixed(1)})</small></div>
      <div className="eMapStat"><span>Explored</span><b>{explored}%</b></div><div className="eMapStat"><span>Known places</span><b>{pins.length}</b></div>
      {sel ? <div className="eMapSel"><h3>{sel.name}</h3><small>{(sel.kind || "").replace("-", " ")} · {sel.region}{sel.approximate ? " · approximate" : ""}</small><p>({sel.x}, {sel.y}) · {dist} road miles · ~{(dist / 25).toFixed(1)} days on foot</p>{sel.method ? <p className="muted">Known by: {sel.method}</p> : null}
        {canTravel ? <button className="eBtn small" onClick={function () { props.onTravel(sel.id); }}><Icon n="Footprints" s={16} /> Travel here</button> : PLACE_BY_ID[sel.id] ? <p className="muted">{snap.combat ? "You cannot travel during combat." : dist <= 3 ? "You are here." : ""}</p> : <p className="muted">Ask the GM about the way there.</p>}
      </div> : <p className="muted">Click a known place to see it. Travel follows the roads and advances the clock; the Game Master narrates the journey.</p>}
      <div className="eLegend">{[["capital", "Capital / city"], ["town", "Town"], ["village", "Village / hamlet"], ["fort", "Fort / tower"], ["dungeon", "Ruin / dungeon"]].map(function (l) { return <div key={l[0]}><i style={{ background: KIND_STYLE[l[0]][0] }} />{l[1]}</div>; })}<div><i style={{ background: "#ffcf40" }} />Active quest</div></div>
    </aside>
  </div>;
}
