// @ts-nocheck
// The cartographer's map, laid out after the Eldoria reference map: painted terrain with
// mountain and forest glyphs, realm banners, sea names, sea lanes, compass rose, legends
// and a segmented scale — all at the canonical equal scale (1 unit = 1 mile) and hidden
// under fog of war until explored. Known locations come from the shared known-locations
// variable, so places the GM teaches you appear too.
import { paintMap, ROADS, RIVERS, PLACE_BY_ID, heightAt, biomeAt, mountainFactor, landSD, hash2 } from "./worldgen";
import { FOG_W, FOG_H, FOG_CELL } from "./game";
import { REALM_HERALDRY, GUILDS, drawCartouche, drawCompass, emblemURL } from "./emblems";
import { Icon } from "./ui";

var BASE = null, BASE_JOB = null, BASE_LISTENERS = [], GLYPHS = null;
export function ensureBaseMap(onReady) {
  if (BASE && BASE.done) { onReady && onReady(BASE.canvas); return; }
  if (onReady) BASE_LISTENERS.push(onReady);
  if (BASE_JOB) return;
  var c = document.createElement("canvas"); c.width = FOG_W; c.height = FOG_H; BASE = { canvas: c, done: false };
  BASE_JOB = paintMap(c.getContext("2d"), { cx: 0, cy: 0, mpp: FOG_CELL, w: FOG_W, h: FOG_H }, "painted", function () { buildGlyphs(); BASE.done = true; BASE_LISTENERS.forEach(function (f) { f(c); }); BASE_LISTENERS = []; }, 4);
}
// Illustrated relief: mountains (snow-capped in the north and the high peaks), woods, dead groves, dunes.
function buildGlyphs() {
  if (GLYPHS) return; GLYPHS = []; var step = 19;
  for (var gy = -880; gy <= 880; gy += step) for (var gx = -1240; gx <= 1240; gx += step) {
    var j1 = hash2(gx, gy, 3), j2 = hash2(gx, gy, 7); var x = gx + (j1 - 0.5) * step * 0.8, y = gy + (j2 - 0.5) * step * 0.8;
    if (landSD(x, y) < 4) continue; var h = heightAt(x, y), m = mountainFactor(x, y), b = biomeAt(x, y, h);
    if ((m > 0.18 && h > 45) || h > 95) GLYPHS.push({ x: x, y: y, k: "mtn", snow: h > (y > 600 ? 50 : y > 400 ? 110 : 150) || y > 760, s: 0.9 + Math.min(1, m) * 0.7 + j1 * 0.25, dark: b === "ash" });
    else if (/forest|taiga/.test(b) && j1 < 0.8) GLYPHS.push({ x: x, y: y, k: "tree", s: 0.75 + j2 * 0.4, c: b === "deepforest" ? "#24502a" : b === "darkforest" ? "#24361e" : b === "taiga" ? "#2c4a34" : "#3a6a2c" });
    else if (b === "ash" && j1 < 0.45) GLYPHS.push({ x: x, y: y, k: "dead", s: 0.8 + j2 * 0.4 });
    else if ((b === "desert" || b === "glass") && j1 < 0.35) GLYPHS.push({ x: x, y: y, k: "dune", s: 0.8 + j2 * 0.5 });
    else if (b === "plains" && j1 < 0.06) GLYPHS.push({ x: x, y: y, k: "tree", s: 0.6, c: "#46742e" });
  }
}
function drawGlyph(ctx, g, px, py, s) {
  if (g.k === "mtn") {
    var w = s * 0.62 * g.s, h = s * 0.62 * g.s;
    ctx.beginPath(); ctx.moveTo(px - w, py + h * 0.35); ctx.lineTo(px, py - h * 0.75); ctx.lineTo(px + w, py + h * 0.35); ctx.closePath();
    ctx.fillStyle = g.dark ? "#3a2c46" : "#8c8478"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(px, py - h * 0.75); ctx.lineTo(px + w, py + h * 0.35); ctx.lineTo(px + w * 0.15, py + h * 0.35); ctx.closePath(); ctx.fillStyle = g.dark ? "#1e1626" : "#4e4840"; ctx.fill();
    if (g.snow) { ctx.beginPath(); ctx.moveTo(px, py - h * 0.75); ctx.lineTo(px + w * 0.36, py - h * 0.18); ctx.lineTo(px + w * 0.1, py - h * 0.28); ctx.lineTo(px - w * 0.12, py - h * 0.16); ctx.lineTo(px - w * 0.36, py - h * 0.2); ctx.closePath(); ctx.fillStyle = "#eef2f8"; ctx.fill(); }
    ctx.strokeStyle = "rgba(20,16,12,0.55)"; ctx.lineWidth = Math.max(0.5, s * 0.05); ctx.beginPath(); ctx.moveTo(px - w, py + h * 0.35); ctx.lineTo(px, py - h * 0.75); ctx.lineTo(px + w, py + h * 0.35); ctx.stroke();
  } else if (g.k === "tree") {
    var r = s * 0.24 * g.s; ctx.fillStyle = g.c; for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(px + (i - 1) * r * 0.9, py - (i === 1 ? r * 0.5 : 0), r, 0, 7); ctx.fill(); }
    ctx.fillStyle = "rgba(10,20,8,0.45)"; ctx.beginPath(); ctx.arc(px + r * 0.6, py + r * 0.3, r * 0.8, 0, 7); ctx.fill();
  } else if (g.k === "dead") {
    ctx.strokeStyle = "#5a4a6a"; ctx.lineWidth = Math.max(0.6, s * 0.05); var hh = s * 0.5 * g.s; ctx.beginPath(); ctx.moveTo(px, py + hh * 0.4); ctx.lineTo(px, py - hh * 0.5); ctx.moveTo(px, py - hh * 0.1); ctx.lineTo(px - hh * 0.3, py - hh * 0.4); ctx.moveTo(px, py - hh * 0.2); ctx.lineTo(px + hh * 0.28, py - hh * 0.45); ctx.stroke();
  } else if (g.k === "dune") {
    ctx.strokeStyle = "rgba(120,74,24,0.55)"; ctx.lineWidth = Math.max(0.6, s * 0.05); var dw = s * 0.45 * g.s; ctx.beginPath(); ctx.moveTo(px - dw, py); ctx.quadraticCurveTo(px, py - dw * 0.55, px + dw, py); ctx.stroke();
  }
}
var SEA_LABELS = [["The Silver Ocean", -1150, 330], ["The Frostsea", -690, 650], ["The Grey Sea", -820, -40], ["The Sapphire Sea", 330, -470], ["The Southern Ocean", -980, -880], ["The Velkaran Sea", -60, -760]];
var LAND_LABELS = [["The Howling Wastes", 720, 780], ["The Withered Wastes", 1080, -40], ["The Dune Sea", -660, -560], ["The Frostfangs", -40, 850], ["The Ash Barrens", 830, 430], ["The Ironspine", 470, 360], ["The Direwood", -90, 100], ["The Blackpine", 140, 560], ["The Glass Waste", -1090, -690]];
var CARTOUCHES = [["Drakmor", 0, 800, ""], ["Sylvanor", -680, 330, "Elven Kingdom"], ["Aurelia", 0, 82, "Capital City: Aurelia"], ["Stonehold", 470, 220, "Dwarven Holds"], ["Umbral Reach", 860, 290, "Cursed Lands"], ["Sunscar", -770, -400, ""], ["Velkar", 80, -560, "Merchants and Freefolk"]];
var REALM_LINES = { "Aurelia": "Land of knights, honor, and ancient bloodlines.", "Stonehold": "Mountain realm of dwarves and master crafters.", "Sylvanor": "Ancient elven kingdom, guardians of nature.", "Drakmor": "Northern warriors who fight the cold and monsters.", "Sunscar": "Desert empire of trade, magic, and mystery.", "Velkar": "Independent cities bound by commerce.", "Umbral Reach": "Corrupted lands filled with darkness and dread." };
var REALM_CENTER = { "Aurelia": [0, 0], "Stonehold": [480, 320], "Sylvanor": [-620, 220], "Drakmor": [0, 720], "Sunscar": [-820, -320], "Velkar": [-80, -480], "Umbral Reach": [720, 450] };
var SEA_LANES = [["port-valor", "port-meridian"], ["port-meridian", "gildwater"], ["port-valen", "port-meridian"], ["port-meridian", "ashenport"], ["grayhaven-north", "grayhaven-central"], ["grayhaven-central", "grayhaven-south"], ["gildwater", "tern-rock"], ["saltmere", "port-meridian"], ["grayhaven-south", "copper-cay"]];
var KIND_STYLE = { capital: ["#f0c860", 6], city: ["#e0c070", 5], "fort-town": ["#d0b888", 4.5], town: ["#e2d6b8", 4], village: ["#cbbd9c", 3.2], hamlet: ["#b8aa8a", 2.6], fort: ["#b0b8c8", 4], stronghold: ["#c09ae0", 5], ruin: ["#a89a8a", 3.4], dungeon: ["#d07060", 3.6], tower: ["#b0b0c0", 3], monastery: ["#eeeed0", 3.4], shrine: ["#a0d0a0", 3], camp: ["#d0b080", 3], landmark: ["#d0d0d0", 4] };
var EMBLEMS = null;
function emblems() { if (EMBLEMS) return EMBLEMS; EMBLEMS = {}; Object.keys(REALM_HERALDRY).forEach(function (k) { EMBLEMS[k] = emblemURL(k, 56); }); GUILDS.forEach(function (g) { EMBLEMS[g.id] = emblemURL(g.id, 56); }); return EMBLEMS; }

export function WorldMap(props) {
  var R = React; var v = props.v || {}; var snap = props.snap || {};
  var canvasRef = R.useRef(null), wrapRef = R.useRef(null);
  var [ready, setReady] = R.useState(!!(BASE && BASE.done));
  var [view, setView] = R.useState({ cx: snap.x || 0, cy: snap.y || 0, z: 3.2 }); /* opens on your surroundings */
  var [region, setRegion] = R.useState(null); /* sharper local render {cx, cy, canvas} */
  var [sel, setSel] = R.useState(null);
  var [tab, setTab] = R.useState("here");
  var fogCanvas = R.useMemo(function () { var c = document.createElement("canvas"); c.width = FOG_W; c.height = FOG_H; return c; }, []);
  R.useEffect(function () { ensureBaseMap(function () { setReady(true); }); }, []);
  // fog bitmap → soft ink veil
  R.useEffect(function () { var fog = props.fog; if (!fog) return; var ctx = fogCanvas.getContext("2d"); var img = ctx.createImageData(FOG_W, FOG_H); for (var i = 0; i < fog.length; i++) { var o = i * 4, n = (i * 2654435761 >>> 24) / 255 * 10; img.data[o] = 9 + n; img.data[o + 1] = 13 + n; img.data[o + 2] = 22 + n; img.data[o + 3] = fog[i] ? 0 : 238; } ctx.putImageData(img, 0, 0); }, [props.fogVersion]);
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
    if (region && region.key === key) return; var c = document.createElement("canvas"); c.width = 420; c.height = 420; var cancel = paintMap(c.getContext("2d"), { cx: kx, cy: ky, mpp: 1, w: 420, h: 420 }, "painted", function () { setRegion({ key: key, cx: kx, cy: ky, canvas: c }); }, 6);
    return cancel;
  }, [Math.round(view.cx / 150), Math.round(view.cy / 150), z >= 1.2]);
  function toScreen(x, y) { var s = size(); return [(x - view.cx) * z + s.w / 2, (view.cy - y) * z + s.h / 2]; }
  function toWorld(px, py) { var s = size(); return [(px - s.w / 2) / z + view.cx, view.cy - (py - s.h / 2) / z]; }

  R.useEffect(function () {
    var c = canvasRef.current; if (!c) return; var s = size(); var dpr = Math.min(2, window.devicePixelRatio || 1); c.width = s.w * dpr; c.height = s.h * dpr; c.style.width = s.w + "px"; c.style.height = s.h + "px";
    var ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = "#0a1626"; ctx.fillRect(0, 0, s.w, s.h);
    var o = toScreen(-1250, 900); var W = 2500 * z, H = 1800 * z;
    if (BASE && BASE.done) { ctx.imageSmoothingEnabled = true; ctx.drawImage(BASE.canvas, o[0], o[1], W, H); }
    if (region && z >= 1.2) { var ro = toScreen(region.cx - 210, region.cy + 210); ctx.drawImage(region.canvas, ro[0], ro[1], 420 * z, 420 * z); }
    // relief glyphs, culled to the view and thinned when zoomed out
    if (GLYPHS) { var gs = Math.min(40, 19 * z * 1.9); if (gs >= 6) { var thin = gs < 10 ? 2 : 1; for (var gi = 0; gi < GLYPHS.length; gi += thin) { var g = GLYPHS[gi]; var p = toScreen(g.x, g.y); if (p[0] < -40 || p[1] < -40 || p[0] > s.w + 40 || p[1] > s.h + 40) continue; drawGlyph(ctx, g, p[0], p[1], gs); } } }
    // rivers & roads
    ctx.strokeStyle = "rgba(70,140,175,0.9)"; ctx.lineWidth = Math.max(1, z * 0.7); RIVERS.forEach(function (r) { if (r.dry) ctx.setLineDash([3, 3]); ctx.beginPath(); r.pts.forEach(function (p, i) { var s2 = toScreen(p[0], p[1]); i ? ctx.lineTo(s2[0], s2[1]) : ctx.moveTo(s2[0], s2[1]); }); ctx.stroke(); ctx.setLineDash([]); });
    ROADS.forEach(function (r) { ctx.strokeStyle = r.kind === "paved" ? "rgba(214,176,112,0.85)" : "rgba(200,160,100,0.55)"; ctx.lineWidth = r.kind === "paved" ? Math.max(1.2, z * 0.5) : 1; ctx.setLineDash(r.kind === "paved" ? [] : [4, 3]); ctx.beginPath(); r.pts.forEach(function (p, i) { var s2 = toScreen(p[0], p[1]); i ? ctx.lineTo(s2[0], s2[1]) : ctx.moveTo(s2[0], s2[1]); }); ctx.stroke(); }); ctx.setLineDash([]);
    // sea lanes (dashed, curving through open water) with ships
    ctx.strokeStyle = "rgba(230,224,206,0.7)"; ctx.lineWidth = 1.3; ctx.setLineDash([6, 5]);
    SEA_LANES.forEach(function (l, li) { var a = PLACE_BY_ID[l[0]], b = PLACE_BY_ID[l[1]]; if (!a || !b) return; var mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.18, my = (a.y + b.y) / 2 - (b.x - a.x) * 0.18; var p1 = toScreen(a.x, a.y), pm = toScreen(mx, my), p2 = toScreen(b.x, b.y); ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.quadraticCurveTo(pm[0], pm[1], p2[0], p2[1]); ctx.stroke(); if (li % 3 === 0) ship(ctx, (p1[0] + 2 * pm[0] + p2[0]) / 4, (p1[1] + 2 * pm[1] + p2[1]) / 4, Math.max(9, Math.min(18, z * 14))); });
    ctx.setLineDash([]);
    // fog of war
    ctx.save(); ctx.imageSmoothingEnabled = true; try { ctx.filter = "blur(" + Math.max(1, z * 2.4) + "px)"; } catch (e) { } ctx.drawImage(fogCanvas, o[0], o[1], W, H); ctx.restore();
    // common knowledge drawn above the fog: seas, great regions and the seven realms
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    SEA_LABELS.forEach(function (l) { var p = toScreen(l[1], l[2]); ctx.font = "italic 600 " + Math.max(12, Math.min(26, z * 30)) + "px 'Cormorant Garamond', Georgia, serif"; ctx.fillStyle = "rgba(150,190,230,0.85)"; ctx.shadowColor = "#000"; ctx.shadowBlur = 4; ctx.fillText(l[0], p[0], p[1]); });
    if (z > 0.45) LAND_LABELS.forEach(function (l) { var p = toScreen(l[1], l[2]); ctx.font = "600 " + Math.max(10, Math.min(18, z * 18)) + "px Cinzel, Georgia, serif"; ctx.fillStyle = "rgba(236,226,200,0.78)"; ctx.fillText(l[0], p[0], p[1]); });
    ctx.shadowBlur = 0;
    var ck = Math.max(0.62, Math.min(1.1, z / 0.62)), ca = z > 2.2 ? Math.max(0.28, 1 - (z - 2.2) / 2) : 1;
    CARTOUCHES.forEach(function (cc) { var p = toScreen(cc[1], cc[2]); if (p[0] < -200 || p[1] < -200 || p[0] > s.w + 200 || p[1] > s.h + 200) return; drawCartouche(ctx, cc[0], p[0], p[1], ck, ca, cc[3]); });
    // known locations
    ctx.textBaseline = "alphabetic";
    pins.forEach(function (p) { var s2 = toScreen(p.x, p.y); var st = KIND_STYLE[p.kind] || KIND_STYLE.town; var r = st[1] * Math.max(0.8, Math.min(1.6, z * 2)); ctx.fillStyle = st[0]; ctx.strokeStyle = "#140c04"; ctx.lineWidth = 1.5; ctx.beginPath(); if (/capital|city|stronghold/.test(p.kind)) { for (var k = 0; k < 10; k++) { var a = k / 10 * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.5 : r; ctx.lineTo(s2[0] + Math.cos(a) * rr, s2[1] + Math.sin(a) * rr); } ctx.closePath(); } else if (/ruin|dungeon/.test(p.kind)) { ctx.rect(s2[0] - r * 0.7, s2[1] - r * 0.7, r * 1.4, r * 1.4); } else ctx.arc(s2[0], s2[1], r * 0.7, 0, 7); ctx.fill(); ctx.stroke(); if (p.approximate) { ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.arc(s2[0], s2[1], r * 2, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      if (z > 0.55 || /capital|city/.test(p.kind)) { ctx.font = "600 " + Math.max(10, Math.min(15, 9 + z * 2)) + "px Cinzel, Georgia, serif"; ctx.lineWidth = 3.5; ctx.strokeStyle = "rgba(8,10,14,0.9)"; ctx.strokeText(p.name.split(" / ")[0], s2[0], s2[1] - r - 4); ctx.fillStyle = "#f2e8d0"; ctx.fillText(p.name.split(" / ")[0], s2[0], s2[1] - r - 4); }
      if (sel && sel.id === p.id) { ctx.strokeStyle = "#5d9fe0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s2[0], s2[1], r + 6, 0, 7); ctx.stroke(); } });
    questPins.forEach(function (q) { var s2 = toScreen(q.x, q.y); ctx.fillStyle = "#ffcf40"; ctx.font = "bold 16px serif"; ctx.fillText("✦", s2[0] + 9, s2[1] + 4); });
    // the adventurer
    var me = toScreen(snap.x || 0, snap.y || 0); ctx.save(); ctx.translate(me[0], me[1]); ctx.rotate(-(snap.yaw || 0) + Math.PI); ctx.fillStyle = "#2f7fd8"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.shadowColor = "#7fb6ff"; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, 7); ctx.lineTo(0, 3); ctx.lineTo(-7, 7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    // compass rose and segmented scale (bottom right), as on the reference map
    drawCompass(ctx, s.w - 58, 92, Math.min(36, s.w / 22));
    var seg = [10, 25, 50, 100, 250].find(function (m) { return m * z * 4 >= Math.min(260, s.w * 0.3); }) || 250; var bw = seg * z; var bx = s.w - 26 - bw * 4, by = s.h - 30;
    ctx.fillStyle = "rgba(8,10,14,0.65)"; ctx.fillRect(bx - 12, by - 22, bw * 4 + 24, 40);
    for (var si = 0; si < 4; si++) { ctx.fillStyle = si % 2 ? "#1a140c" : "#e6d4a4"; ctx.fillRect(bx + si * bw, by, bw, 5); }
    ctx.strokeStyle = "#e6d4a4"; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw * 4, 5); ctx.fillStyle = "#e6d4a4"; ctx.font = "11px Georgia, serif"; ctx.textAlign = "center";
    for (var si2 = 0; si2 <= 4; si2++) ctx.fillText(String(seg * si2), bx + si2 * bw, by - 6); ctx.font = "600 10px Cinzel, Georgia, serif"; ctx.fillText("MILES", bx + bw * 2, by + 16);
  });

  var drag = R.useRef(null);
  function onDown(e) { drag.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy, moved: false }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { } }
  function onMove(e) { var d = drag.current; if (!d) return; var dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true; setView({ cx: d.cx - dx / z, cy: d.cy + dy / z, z: z }); }
  function onUp(e) { var d = drag.current; drag.current = null; if (d && !d.moved) { var rect = e.currentTarget.getBoundingClientRect(); var px = e.clientX - rect.left, py = e.clientY - rect.top; var best = null, bd = 16; pins.forEach(function (p) { var s2 = toScreen(p.x, p.y); var dd = Math.hypot(s2[0] - px, s2[1] - py); if (dd < bd) { bd = dd; best = p; } }); setSel(best); if (best) setTab("here"); } }
  function zoom(k, px, py) { var s = size(); px = px == null ? s.w / 2 : px; py = py == null ? s.h / 2 : py; var w = toWorld(px, py); var nz = Math.max(fit() * 0.9, Math.min(12, z * k)); setView({ cx: w[0] - (px - s.w / 2) / nz, cy: w[1] + (py - s.h / 2) / nz, z: nz }); }
  function onWheel(e) { var rect = e.currentTarget.getBoundingClientRect(); zoom(e.deltaY > 0 ? 0.85 : 1.18, e.clientX - rect.left, e.clientY - rect.top); }
  function focus(x, y, zz) { setView({ cx: x, cy: y, z: zz || Math.max(z, 1.2) }); }
  var explored = 0; if (props.fog) { for (var i = 0; i < props.fog.length; i++) explored += props.fog[i]; explored = Math.round(explored / props.fog.length * 1000) / 10; }
  var dist = sel ? Math.round(Math.hypot(sel.x - (snap.x || 0), sel.y - (snap.y || 0)) * 1.18) : 0;
  var canTravel = sel && PLACE_BY_ID[sel.id] && !snap.combat && !snap.down && dist > 3;
  var E = emblems(); var wide = z < 1.05;
  return <div className="eMap">
    <div className="eMapCanvas" ref={wrapRef} onWheel={onWheel}>
      <canvas ref={canvasRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={function () { drag.current = null; }} />
      {!ready ? <div className="eMapLoading">The cartographer is inking the continent…</div> : null}
      <div className={"eMapTitle" + (wide ? " big" : "")}><b>ELDORIA</b><small>A World of Adventure, Magic, and Legend</small>{wide ? <p>From the icy peaks of Drakmor to the sands of Sunscar, from the elven woods of Sylvanor to the cursed lands of the Umbral Reach, countless heroes rise, seeking glory, treasure, and destiny.</p> : null}</div>
      {wide ? <div className="eBeyond"><b>Lands Beyond the Map</b><span>Sailors speak of distant continents, floating islands, and lands ruled by creatures older than time.</span></div> : null}
      <div className="eMapTools"><button onClick={function () { zoom(1.4); }} aria-label="Zoom in" title="Zoom in"><Icon n="Plus" s={18} /></button><button onClick={function () { zoom(1 / 1.4); }} aria-label="Zoom out" title="Zoom out"><Icon n="Minus" s={18} /></button><button onClick={function () { setView({ cx: snap.x || 0, cy: snap.y || 0, z: Math.max(z, 3.2) }); }} aria-label="Center on me" title="My surroundings"><Icon n="LocateFixed" s={18} /></button><button onClick={function () { setView({ cx: 0, cy: 0, z: 0 }); }} aria-label="Whole continent" title="Whole continent"><Icon n="Maximize" s={18} /></button></div>
    </div>
    <aside className="eMapSide">
      <div className="eTabs eMapTabs">{[["here", "Here"], ["realms", "Seven Kingdoms"], ["guilds", "Guilds"]].map(function (t) { return <button key={t[0]} className={tab === t[0] ? "on" : ""} onClick={function () { setTab(t[0]); }}>{t[1]}</button>; })}</div>
      {tab === "here" ? <>
        <div className="eMapStat"><b>{snap.location}</b><small>{snap.region} · ({(snap.x || 0).toFixed(1)}, {(snap.y || 0).toFixed(1)})</small></div>
        <div className="eMapStat"><span>Explored</span><b>{explored}%</b></div><div className="eMapStat"><span>Known places</span><b>{pins.length}</b></div>
        {sel ? <div className="eMapSel"><h3>{sel.name}</h3><small>{(sel.kind || "").replace("-", " ")} · {sel.region}{sel.approximate ? " · approximate" : ""}</small><p>({sel.x}, {sel.y}) · {dist} road miles · ~{(dist / 25).toFixed(1)} days on foot</p>{sel.method ? <p className="muted">Known by: {sel.method}</p> : null}
          {canTravel ? <button className="eBtn small" onClick={function () { props.onTravel(sel.id); }}><Icon n="Footprints" s={16} /> Travel here</button> : PLACE_BY_ID[sel.id] ? <p className="muted">{snap.combat ? "You cannot travel during combat." : dist <= 3 ? "You are here." : ""}</p> : <p className="muted">Ask the GM about the way there.</p>}
        </div> : <p className="muted">Click a known place to see it. Travel follows the roads and advances the clock; the Game Master narrates the journey. The fog lifts as you explore.</p>}
        <div className="eLegend">{[["capital", "Capital / city"], ["town", "Town"], ["village", "Village / hamlet"], ["fort", "Fort / tower"], ["dungeon", "Ruin / dungeon"]].map(function (l) { return <div key={l[0]}><i style={{ background: KIND_STYLE[l[0]][0] }} />{l[1]}</div>; })}<div><i style={{ background: "#ffcf40" }} />Active quest</div><div><i className="lane" />Sea lane</div></div>
      </> : tab === "realms" ? <div className="eHeraldry"><h4>The Seven Kingdoms</h4>{Object.keys(REALM_HERALDRY).map(function (k) { var c = REALM_CENTER[k]; return <button key={k} onClick={function () { focus(c[0], c[1], 0.9); }}><img src={E[k]} alt="" /><span><b style={{ color: REALM_HERALDRY[k].fg }}>{REALM_HERALDRY[k].title}</b><small>{REALM_LINES[k]}</small></span></button>; })}</div>
      : <div className="eHeraldry"><h4>Major Adventurer Guilds</h4>{GUILDS.map(function (g) { var p = PLACE_BY_ID[g.hq]; return <button key={g.id} onClick={function () { if (p) focus(p.x, p.y, 2.4); }}><img src={E[g.id]} alt="" /><span><b>{g.name}</b><small>Headquarters: {g.hqName}</small><small>{g.motto}</small></span></button>; })}</div>}
    </aside>
  </div>;
}
function ship(ctx, x, y, s) {
  ctx.save(); ctx.fillStyle = "#3a2614"; ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x + s * 0.5, y); ctx.lineTo(x + s * 0.35, y + s * 0.25); ctx.lineTo(x - s * 0.35, y + s * 0.25); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#efe6cc"; ctx.beginPath(); ctx.moveTo(x - s * 0.05, y - s * 0.65); ctx.lineTo(x - s * 0.05, y - s * 0.05); ctx.lineTo(x - s * 0.42, y - s * 0.05); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + s * 0.05, y - s * 0.55); ctx.lineTo(x + s * 0.05, y - s * 0.05); ctx.lineTo(x + s * 0.36, y - s * 0.05); ctx.closePath(); ctx.fill(); ctx.restore();
}
