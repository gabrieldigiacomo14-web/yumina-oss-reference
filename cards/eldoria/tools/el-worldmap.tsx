/* Eldoria — the interactive world map.
 * Terrain, realms, rivers and roads come from el-cartography.js (Black Clover's Voronoi
 * world engine, constrained by Eldoria's Atlas Index and physical geography). This file
 * turns the story's known-locations into pins, places the character from player-x/y,
 * and draws the view: a canvas of terrain re-rendered for the current zoom, with fog over
 * what the character has not seen, and an SVG layer of pins, rivers, roads and labels.
 * Coordinates are miles from Aurelia City. Purely interface: no AI calls. */
import { CANON_PLACES, CANON_AREAS, NEUTRAL, RIVERS, LAKES, ROADS, SEA_LANES, SEA_LABELS, FRAME, KINGDOMS, BIOMES, baseWorld, politics, renderTerrain, pointInKingdom, revealCells, symbolsInView, kingdomLabels, cellAtKm, neutralAtKm, kingdomIndex } from "./el-cartography.js";

function n(v, d) { var z = Number(v); return isFinite(z) ? z : (d === undefined ? 0 : d); }
function s(v) { return v === undefined || v === null ? "" : String(v); }
function o(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
function a(v) { return Array.isArray(v) ? v : []; }
function low(v) { return s(v).toLowerCase(); }
function hash(str) { var h = 2166136261; str = s(str); for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
var MAP_READY = false;
var POL = { key: "", P: null };
function polFor(pins) {
  var key = pins.map(function (p) { return p.k + ":" + Math.round(p.x) + "," + Math.round(p.y); }).sort().join("|");
  if (POL.key !== key || !POL.P) POL = { key: key, P: politics(pins) };
  return POL.P;
}
var MI_PER_DAY = 22; // a fair day on foot by road (the Royal Highway North: 196 miles in eight days)

/* ---------- names ---------- */
/* "Saffaron / City of Brass", "the City of Brass" and "saffaron" are the same place */
function baseName(name) {
  return low(name).replace(/\(.*?\)/g, "").replace(/^the\s+/, "").replace(/^(village|town|city|hamlet|port|fort|oasis) of\s+/, "")
    .replace(/\s+(village|town|city|hamlet|settlement)$/, "").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}
var CANON_BY = {};
CANON_PLACES.forEach(function (c) { s(c.name).split("/").forEach(function (part) { var k = baseName(part); if (k) CANON_BY[k] = c; }); CANON_BY[baseName(c.name)] = c; });
export function canonPlace(name) { var k = baseName(name); if (!k) return null; if (CANON_BY[k]) return CANON_BY[k]; var hit = Object.keys(CANON_BY).filter(function (x) { return x.length > 4 && (k === x || k.indexOf(x + " ") === 0 || k.indexOf(" " + x) >= 0); }).sort(function (p, q) { return q.length - p.length; })[0]; return hit ? CANON_BY[hit] : null; }
function realmKey(text) {
  var t = low(text);
  if (/aurelia/.test(t)) return "Aurelia"; if (/stonehold|ironspine|dwar/.test(t)) return "Stonehold"; if (/sylvanor|elven/.test(t)) return "Sylvanor";
  if (/drakmor/.test(t)) return "Drakmor"; if (/sunscar|desert/.test(t)) return "Sunscar"; if (/velkar|grayhaven/.test(t)) return "Velkar"; if (/umbral|reach/.test(t)) return "Umbral";
  return "";
}
/* ---------- placing places from descriptions ---------- */
var DIR = { north: 90, n: 90, northeast: 45, ne: 45, east: 0, e: 0, southeast: -45, se: -45, south: -90, s: -90, southwest: -135, sw: -135, west: 180, w: 180, northwest: 135, nw: 135 };
var DIR_RE = "(north[- ]?east|north[- ]?west|south[- ]?east|south[- ]?west|north|south|east|west|ne|nw|se|sw)";
function dirAngle(w) { return DIR[low(w).replace(/[- ]/g, "")]; }
function miOf(num, unit) { unit = low(unit); if (/^day/.test(unit)) return num * MI_PER_DAY; if (/^hour|^hr/.test(unit)) return num * 3; if (/^k/.test(unit)) return num * 0.62; return num; }
function lookupName(name, placed) {
  var key = baseName(name); if (!key) return null;
  for (var i = 0; i < placed.length; i++) { var q = placed[i], qn = baseName(q.name); if (qn && (qn === key || qn.indexOf(key) === 0 || key.indexOf(qn) === 0)) return { x: q.x, y: q.y }; }
  var c = canonPlace(name); return c ? { x: c.x, y: c.y } : null;
}
function fromText(text, placed) {
  text = s(text); if (!text) return null;
  var re = new RegExp("(\\d+(?:\\.\\d+)?|a|an|one|two|three|four|five|half a)\\s*(miles?|mi|km|kilomet(?:er|re)s?|hours?|hrs?|days?)(?:'s)?(?:\\s+(?:walk|ride|travel|journey|march|sail))?\\s+(?:to the\\s+)?" + DIR_RE + "\\s+(?:of|from)\\s+(?:the\\s+)?([A-Z][\\w'’ -]{1,40})", "i");
  var m = text.match(re), words = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, "half a": 0.5 };
  if (m) { var ref = lookupName(m[4].replace(/[.,;].*$/, ""), placed); if (ref) { var mi = miOf(words[low(m[1])] || n(m[1], 1), m[2]), ang = dirAngle(m[3]) * Math.PI / 180; return { x: ref.x + Math.cos(ang) * mi, y: ref.y + Math.sin(ang) * mi, how: "described" }; } }
  var m2 = text.match(new RegExp(DIR_RE + "\\s+(?:of|from)\\s+(?:the\\s+)?([A-Z][\\w'’ -]{1,40})", "i"));
  if (m2) { var r2 = lookupName(m2[2].replace(/[.,;].*$/, ""), placed); if (r2) { var a2 = dirAngle(m2[1]) * Math.PI / 180; return { x: r2.x + Math.cos(a2) * 30, y: r2.y + Math.sin(a2) * 30, how: "described" }; } }
  var m3 = text.match(/(?:near|outside|beside|just past|close to|by)\s+(?:the\s+)?([A-Z][\w'’ -]{1,40})/);
  if (m3) { var r3 = lookupName(m3[1].replace(/[.,;].*$/, ""), placed); if (r3) { var a3 = (hash(text) % 360) * Math.PI / 180; return { x: r3.x + Math.cos(a3) * 12, y: r3.y + Math.sin(a3) * 12, how: "described" }; } }
  return null;
}
/* known-locations is an object keyed by id; records carry x/y or xy:[x,y], and kind or type */
function knownList(v) {
  var raw = v["known-locations"];
  var list = Array.isArray(raw) ? raw.map(function (l, i) { return [s(o(l).id) || "loc-" + i, l]; }) : Object.keys(o(raw)).map(function (k) { return [k, raw[k]]; });
  return list.map(function (e) { var l = o(e[1]); return Object.assign({}, l, { id: e[0], name: s(l.name) || e[0].replace(/[-_]+/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); }) }); })
    .filter(function (l) { return l.discovered !== false && l.hidden !== true; });
}
function coordsOf(l) {
  if (Array.isArray(l.xy) && isFinite(Number(l.xy[0])) && isFinite(Number(l.xy[1]))) return [Number(l.xy[0]), Number(l.xy[1])];
  if (l.x !== undefined && l.x !== null && l.x !== "" && isFinite(Number(l.x)) && isFinite(Number(l.y)) && l.y !== null && l.y !== "") return [Number(l.x), Number(l.y)];
  if (Array.isArray(l.coords)) return [Number(l.coords[0]), Number(l.coords[1])];
  return null;
}
/* every known place gets a position: recorded coordinates, else the gazetteer, else its description, else somewhere in its realm (drawn as approximate) */
export function layoutPlaces(v) {
  var locs = knownList(v), placed = [], pending = [];
  locs.forEach(function (l) {
    var xy = coordsOf(l), c = canonPlace(l.name);
    if (xy) {
      // a canonical place saved far from its gazetteer position (a slip in an old reply) is drawn where the gazetteer puts it
      if (c && Math.hypot(xy[0] - c.x, xy[1] - c.y) > 40) { placed.push(mk(l, c.x, c.y, "canon", c)); return; }
      placed.push(mk(l, xy[0], xy[1], "recorded", c)); return;
    }
    if (c) { placed.push(mk(l, c.x, c.y, "canon", c)); return; }
    pending.push(l);
  });
  for (var pass = 0; pass < 3 && pending.length; pass++) {
    pending = pending.filter(function (l) {
      var hit = null, near = s(l.near);
      if (near) { var ref = lookupName(near, placed); if (ref) { var ang = (dirAngle(s(l.dir)) !== undefined ? dirAngle(s(l.dir)) : (hash(l.name) % 360)) * Math.PI / 180, dist = n(l.miles || l.distance, 0) || 20; hit = { x: ref.x + Math.cos(ang) * dist, y: ref.y + Math.sin(ang) * dist, how: "described" }; } }
      if (!hit) hit = fromText([l.notes, l.description, l.route].map(s).join(". "), placed);
      if (hit) { placed.push(mk(l, hit.x, hit.y, hit.how, null)); return false; }
      return true;
    });
  }
  var pins = pinsOf(placed);
  var P = MAP_READY ? polFor(pins) : null;
  pending.forEach(function (l) {
    var rk = realmKey(s(l.region) + " " + s(l.realm) + " " + s(l.notes)) || "Aurelia", x, y;
    if (P) { var pt = pointInKingdom(P, rk, "", s(l.name)); x = pt.x; y = pt.y; }
    else { var K = KINGDOMS[Math.max(0, kingdomIndex(rk))], an = (hash(l.name) % 360) * Math.PI / 180; x = K.at[0] + Math.cos(an) * K.r * 0.4; y = K.at[1] + Math.sin(an) * K.r * 0.4; }
    placed.push(mk(l, x, y, "guessed", null));
  });
  placed.P = P;
  return placed;
  function mk(l, x, y, how, c) { return { id: s(l.id), name: s(l.name), x: x, y: y, how: how, region: s(l.region) || (c ? c.realm : ""), notes: s(l.notes || (c ? c.line : "")), kind: kindOf(s(l.kind || l.type) + " " + s(l.name), c), cleared: l.cleared === true, canon: !!c }; }
}
function pinsOf(placed) {
  var out = [];
  placed.forEach(function (q) { if (q.how === "guessed") return; var rk = realmKey(q.region); if (rk) out.push({ x: q.x, y: q.y, k: rk }); });
  return out;
}
function kindOf(text, c) {
  if (c && c.kind) return c.kind === "city" ? "town" : c.kind === "wreck" ? "port" : c.kind === "pass" ? "mountain" : c.kind === "waste" ? "ruin" : c.kind;
  var t = low(text);
  if (/capital|castle|palace/.test(t)) return "capital";
  if (/dungeon|ruin|tomb|crypt|barrow|lair|cave|vault|warren/.test(t)) return "ruin";
  if (/port|harbou?r|dock|coast|cove|isle/.test(t)) return "port";
  if (/fort|keep|tower|garrison|outpost|watch|hold/.test(t)) return "fort";
  if (/shrine|temple|abbey|monastery|chapel|grove|glade/.test(t)) return "shrine";
  if (/oasis|well/.test(t)) return "oasis";
  if (/mountain|peak|pass|mine/.test(t)) return "mountain";
  if (/city|town/.test(t)) return "town";
  return "village";
}
/* ---------- where the character is: player-x / player-y, which the narrator must keep current ---------- */
export function playerXY(v, places) {
  var px = Number(v["player-x"]), py = Number(v["player-y"]);
  if (isFinite(px) && isFinite(py) && v["player-x"] !== null && v["player-x"] !== "") return { x: px, y: py, approx: false };
  var c = canonPlace(s(v["current-location"]));
  if (c) return { x: c.x, y: c.y, approx: false };
  var hit = (places || []).filter(function (q) { return baseName(q.name) === baseName(v["current-location"]); })[0];
  if (hit) return { x: hit.x, y: hit.y, approx: hit.how === "guessed" };
  return { x: 0, y: 0, approx: true };
}

/* ---------- component ---------- */
var KIND_GLYPH = {
  capital: "M-6 6 V-3 H-4 V-1 H-2 V-6 H2 V-1 H4 V-3 H6 V6 Z", town: "M-6 6 V-1 L-3 -4 L0 -1 V-3 L3 -6 L6 -3 V6 Z", village: "M-5 6 V0 L0 -5 L5 0 V6 Z",
  ruin: "M-6 6 V-2 H-3 V3 H-1 V-5 H2 V2 H4 V-1 H6 V6 Z", fort: "M-6 6 V-5 H-3 V-2 H0 V-5 H3 V-2 H6 V6 Z", mountain: "M-7 6 L-1 -6 L3 1 L5 -2 L8 6 Z",
  port: "M0 -6 V5 M-5 1 Q-5 6 0 6 Q5 6 5 1 M-3 -3 H3", shrine: "M0 -7 L2 -2 H7 L3 1 L5 6 L0 3 L-5 6 L-3 1 L-7 -2 H-2 Z", oasis: "M0 6 V-1 M0 -1 Q-6 -6 -7 -1 M0 -1 Q6 -6 7 -1 M0 -1 Q-2 -7 -5 -7 M0 -1 Q2 -7 5 -7",
  fen: "M-6 2 H6 M-4 5 H4 M-2 -1 V-6 M2 -1 V-4"
};
var LINE_KINDS = { port: 1, oasis: 1, fen: 1 };
var MAJOR = { capital: 1, city: 1, port: 1 };
var DEF_LAYERS = { realms: true, roads: true, atlas: false, fog: true, symbols: true };
var ROAD_CLASS = { highway: "elwm-road hw", road: "elwm-road", track: "elwm-road track", caravan: "elwm-road caravan", ash: "elwm-road ash" };
function smoothPath(pts, sx, sy) { // a Catmull-Rom curve through the points, as an SVG path
  if (pts.length < 2) return "";
  var P = pts.map(function (q) { return [sx(q[0]), sy(q[1])]; }), d = "M" + P[0][0].toFixed(1) + " " + P[0][1].toFixed(1);
  for (var i = 0; i < P.length - 1; i++) { var p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2; d += " C" + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + " " + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + " " + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + " " + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + " " + p2[0].toFixed(1) + " " + p2[1].toFixed(1); }
  return d;
}
export function WorldMap(p) {
  var v = p.v || {};
  var rs0 = React.useState(MAP_READY); var ready = rs0[0], setReady = rs0[1];
  React.useEffect(function () { if (MAP_READY) return; var t = setTimeout(function () { try { baseWorld(); } catch (e) { console.warn("map generation failed", e); } MAP_READY = true; setReady(true); }, 40); return function () { clearTimeout(t); }; }, []);
  var places = layoutPlaces(v); var me = playerXY(v, places); var P = places.P || (ready ? polFor(pinsOf(places)) : null);
  var boxRef = React.useRef(null), cvRef = React.useRef(null), rendered = React.useRef(null);
  var vs = React.useState({ cx: me.x, cy: me.y, z: 1 }); var view = vs[0], setView = vs[1];
  var ss = React.useState(""); var sel = ss[0], setSel = ss[1];
  var ps0 = React.useState(null); var probe = ps0[0], setProbe = ps0[1];
  var ls = React.useState(DEF_LAYERS); var lay = ls[0], setLay = ls[1];
  var lm = React.useState(false); var layMenu = lm[0], setLayMenu = lm[1];
  var fs = React.useState(false); var full = fs[0], setFull = fs[1];
  var sz = React.useState({ w: 360, h: 420 }); var size = sz[0], setSize = sz[1];
  var rt = React.useState(0); var rtick = rt[0], setRtick = rt[1];
  var drag = React.useRef(null);
  React.useEffect(function () {
    function fit() { var el = boxRef.current; if (el) setSize({ w: el.clientWidth || 360, h: el.clientHeight || 420 }); }
    fit(); window.addEventListener("resize", fit); var t = setTimeout(fit, 60); return function () { window.removeEventListener("resize", fit); clearTimeout(t); };
  }, [full]);
  // miles <-> screen px: about 700 miles across at zoom 1
  var kmPx = (size.w / 700) * view.z;
  function sx(x) { return size.w / 2 + (x - view.cx) * kmPx; }
  function sy(y) { return size.h / 2 - (y - view.cy) * kmPx; }
  function zoomBy(f, ax, ay) {
    setView(function (cur) {
      var z = Math.max(0.22, Math.min(14, cur.z * f)); var kp0 = (size.w / 700) * cur.z, kp1 = (size.w / 700) * z;
      if (ax === undefined) return { cx: cur.cx, cy: cur.cy, z: z };
      var wx = cur.cx + (ax - size.w / 2) / kp0, wy = cur.cy - (ay - size.h / 2) / kp0;
      return { cx: wx - (ax - size.w / 2) / kp1, cy: wy + (ay - size.h / 2) / kp1, z: z };
    });
  }
  function fitWorld() { var zw = 700 / (FRAME.X1 - FRAME.X0) * 1.02, zh = 700 / (FRAME.Y1 - FRAME.Y0) * (size.w / size.h) * 1.02; setView({ cx: (FRAME.X0 + FRAME.X1) / 2, cy: (FRAME.Y0 + FRAME.Y1) / 2, z: Math.min(zw, zh) }); }
  function onDown(e) {
    var el = boxRef.current; if (!el) return;
    if (e.target && e.target.closest && e.target.closest("button,[role=button],.elwm-card,.elwm-laymenu")) return;
    if (!drag.current) drag.current = { pts: {}, moved: 0 };
    drag.current.pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var r = el.getBoundingClientRect(); drag.current.start = { x: e.clientX - r.left, y: e.clientY - r.top };
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function onMove(e) {
    var dr = drag.current; if (!dr || !dr.pts[e.pointerId]) return;
    var prev = dr.pts[e.pointerId], ids = Object.keys(dr.pts);
    if (ids.length >= 2) {
      var other = dr.pts[ids[0] === String(e.pointerId) ? ids[1] : ids[0]];
      var d0 = Math.hypot(prev.x - other.x, prev.y - other.y), d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (d0 > 0) { var r = boxRef.current.getBoundingClientRect(); zoomBy(d1 / d0, (e.clientX + other.x) / 2 - r.left, (e.clientY + other.y) / 2 - r.top); }
      dr.moved += 10;
    } else {
      var dx = e.clientX - prev.x, dy = e.clientY - prev.y; dr.moved += Math.abs(dx) + Math.abs(dy);
      setView(function (cur) { var kp = (size.w / 700) * cur.z; return { cx: cur.cx - dx / kp, cy: cur.cy + dy / kp, z: cur.z }; });
    }
    dr.pts[e.pointerId] = { x: e.clientX, y: e.clientY };
  }
  function onUp(e) {
    var dr = drag.current; if (!dr) return; delete dr.pts[e.pointerId];
    if (!Object.keys(dr.pts).length) {
      if (dr.moved < 8 && dr.start && P) { var wx = view.cx + (dr.start.x - size.w / 2) / kmPx, wy = view.cy - (dr.start.y - size.h / 2) / kmPx; setProbe({ x: wx, y: wy }); setSel(""); setLayMenu(false); }
      setTimeout(function () { drag.current = null; }, 0);
    }
  }
  function onWheel(e) { var r = boxRef.current.getBoundingClientRect(); zoomBy(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX - r.left, e.clientY - r.top); }
  var selQ = places.filter(function (q) { return "known:" + q.id === sel; })[0];
  var selCanon = !selQ && /^canon:/.test(sel) ? CANON_PLACES.filter(function (c) { return "canon:" + c.name === sel; })[0] : null;
  var target = selQ || selCanon;
  var dist = target ? Math.round(Math.hypot(target.x - me.x, target.y - me.y)) : 0;
  var knownCanon = {}; places.forEach(function (q) { var c = canonPlace(q.name); if (c) knownCanon[c.name] = 1; });
  var homeRealm = KINGDOMS[Math.max(0, kingdomIndex(realmKey(v["starting-realm"]) || "Aurelia"))];

  // what the character has seen: their homeland, where they are, the places they know
  var discs = React.useMemo(function () {
    var d = [{ x: homeRealm.capital[0], y: homeRealm.capital[1], r: 230 }, { x: me.x, y: me.y, r: 120 }];
    places.forEach(function (q) { if (q.how === "guessed") return; d.push({ x: q.x, y: q.y, r: 70 }); });
    return d;
  }, [places.map(function (q) { return q.id + Math.round(q.x) + Math.round(q.y); }).join("|"), Math.round(me.x), Math.round(me.y), homeRealm.k]);
  var polKey = POL.key;
  // terrain: re-rendered for the current view once the hands come off it; until then the last picture is moved and scaled
  React.useEffect(function () {
    if (!ready || !P) return;
    var t = setTimeout(function () {
      var cv = cvRef.current; if (!cv) return;
      var q = size.w * size.h > 420000 ? 2 : 1.5, w = Math.ceil(size.w / q), h = Math.ceil(size.h / q);
      try {
        revealCells(lay.fog ? discs : [{ x: 0, y: 0, r: 99999 }]);
        var out = renderTerrain(P, { cx: view.cx, cy: view.cy, pxPerKm: kmPx / q, w: w, h: h }, { realms: lay.realms, borders: lay.realms, fog: lay.fog, fogDiscs: lay.fog ? discs : null });
        cv.width = w; cv.height = h; var ctx = cv.getContext("2d"); var id = ctx.createImageData(w, h); id.data.set(out); ctx.putImageData(id, 0, 0);
        rendered.current = { cx: view.cx, cy: view.cy, kmPx: kmPx, w: w, h: h, q: q }; setRtick(function (x) { return x + 1; });
      } catch (err) { console.warn("map render failed", err); }
    }, rendered.current ? 140 : 0);
    return function () { clearTimeout(t); };
  }, [ready, polKey, Math.round(view.cx), Math.round(view.cy), Math.round(view.z * 100), size.w, size.h, lay.realms, lay.fog, discs]);
  var rc = rendered.current, cvStyle = null;
  if (rc) { var cssW = rc.w * rc.q * (kmPx / rc.kmPx), cssH = rc.h * rc.q * (kmPx / rc.kmPx); cvStyle = { position: "absolute", width: cssW + "px", height: cssH + "px", left: (size.w / 2 + (rc.cx - view.cx) * kmPx - cssW / 2) + "px", top: (size.h / 2 - (rc.cy - view.cy) * kmPx - cssH / 2) + "px" }; }

  var B = ready ? baseWorld() : null;
  var symbols = React.useMemo(function () {
    if (!ready || !P || !lay.symbols || view.z < 0.7) return [];
    return symbolsInView(P, { cx: view.cx, cy: view.cy, w: size.w, h: size.h, pxPerKm: kmPx });
  }, [ready, lay.symbols, Math.round(view.cx / 20), Math.round(view.cy / 20), Math.round(view.z * 4), size.w, size.h, rtick > -1 ? polKey : ""]);
  var showLabels = view.z > 1.5;
  function seenAt(x, y) { if (!lay.fog || !B) return true; var c = cellAtKm(x, y); return !!c.seen; }
  var labelSlots = [];
  function pinFor(q) {
    var x = sx(q.x), y = sy(q.y);
    var ly = 22; labelSlots.forEach(function (sl) { if (Math.abs(sl[0] - x) < 70 && Math.abs(sl[1] - (y + ly)) < 13) ly += 13; }); labelSlots.push([x, y + ly]); if (x < -40 || y < -40 || x > size.w + 40 || y > size.h + 40) return null;
    var on = sel === "known:" + q.id;
    return (
      <g key={"k" + q.id} transform={"translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")"} className={"elwm-pin" + (on ? " on" : "") + (q.how === "guessed" ? " guess" : "") + (q.cleared ? " cleared" : "")} onClick={function () { setSel(on ? "" : "known:" + q.id); setProbe(null); }} role="button" tabIndex={0} aria-label={q.name}>
        {q.how === "guessed" || q.how === "described" ? <circle r={q.how === "guessed" ? 13 : 11} className="elwm-halo" /> : null}
        <circle r="10" className="elwm-pinbg" />
        <path d={KIND_GLYPH[q.kind] || KIND_GLYPH.village} className={"elwm-glyph" + (LINE_KINDS[q.kind] ? " line" : "")} />
        {(showLabels || on) ? <text y={ly} className={"elwm-label" + (on ? " on" : "")}>{q.name}</text> : null}
      </g>
    );
  }
  var meX = sx(me.x), meY = sy(me.y);
  function describe(x, y) {
    if (!P) return { where: "", biome: "" };
    var c = cellAtKm(x, y); if (c.water) return { where: "Open water", biome: "Sea", k: "" };
    var z = neutralAtKm(x, y); if (z) return { where: z.name + " (claimed by no realm)", biome: BIOMES[c.biome].name, k: "", zone: z };
    var ki = P.owner[c.i], K = KINGDOMS[ki] || KINGDOMS[0];
    return { where: K.label, biome: BIOMES[c.biome].name, k: K.k };
  }
  var curName = s(v["current-location"]);
  function markHere(pt) {
    var api = p.api; if (!api || !curName || canonPlace(curName)) return; // gazetteer places never move
    var d = describe(pt.x, pt.y), raw = o(v["known-locations"]), next = Object.assign({}, raw), key = baseName(curName), id = "";
    Object.keys(next).forEach(function (k) { if (baseName(s(o(next[k]).name) || k) === key) id = k; });
    if (!id) id = key.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "marked-" + Date.now();
    var x = Math.round(pt.x), y = Math.round(pt.y);
    next[id] = Object.assign({}, o(next[id]), { name: curName, x: x, y: y, region: o(next[id]).region || d.k || (d.zone ? d.zone.name : ""), discovered: o(next[id]).discovered || true, notes: o(next[id]).notes || "Marked on the map by the player." });
    var patch = { "known-locations": next, "player-x": x, "player-y": y };
    try { if (typeof api.patchVariables === "function") api.patchVariables(patch); else Object.keys(patch).forEach(function (k) { api.setVariable(k, patch[k]); }); } catch (e) {}
    try { if (typeof api.showToast === "function") api.showToast("Marked " + curName + " on the map.", "success"); } catch (e) {}
    setProbe(null);
  }
  function travel(name) { var api = p.api; if (api && typeof api.sendMessage === "function") { try { api.sendMessage("I plan a journey to " + name + "."); } catch (e) {} } setFull(false); if (p.onTravel) p.onTravel(name); }
  var kLabels = ready && P && lay.realms ? kingdomLabels(P) : [];
  var probeInfo = probe ? describe(probe.x, probe.y) : null;
  var canonShown = CANON_PLACES.filter(function (c) {
    if (knownCanon[c.name] || c.kind === "wreck") return false;
    if (!lay.atlas && !MAJOR[c.kind]) return false;
    return true;
  });
  var scaleMi = 110 / kmPx, nice = [10, 25, 50, 100, 200, 250, 500, 1000].filter(function (m) { return m <= scaleMi; }).pop() || 10;
  var fz = Math.max(10, Math.min(16, 9 + view.z * 2.5));
  return (
    <div className={"elwm" + (full ? " elwm-full" : "")}>
      <div className="elwm-top">
        <span className="elwm-title">Map of Eldoria</span>
        <button type="button" className="elwm-tbtn" aria-pressed={layMenu ? "true" : "false"} onClick={function () { setLayMenu(!layMenu); }}>Layers</button>
        <button type="button" className="elwm-tbtn" onClick={function () { setFull(!full); }}>{full ? "Close" : "Expand"}</button>
      </div>
      <div ref={boxRef} className="elwm-box" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}>
        <canvas ref={cvRef} className="elwm-terrain" style={cvStyle || { display: "none" }} />
        {!ready || !rc ? <div className="elwm-loading"><span>Drawing the continent{"…"}</span></div> : null}
        <svg className="elwm-svg" width={size.w} height={size.h} aria-label="World map">
          {ready ? LAKES.map(function (l) { return <ellipse key={l.name} cx={sx(l.x)} cy={sy(l.y)} rx={Math.max(2, l.rx * kmPx)} ry={Math.max(1.5, l.ry * kmPx)} className="elwm-lake" />; }) : null}
          {ready ? RIVERS.map(function (rv) {
            if (!seenAt(rv.pts[0][0], rv.pts[0][1]) && !seenAt(rv.pts[rv.pts.length - 1][0], rv.pts[rv.pts.length - 1][1]) && !seenAt(rv.pts[Math.floor(rv.pts.length / 2)][0], rv.pts[Math.floor(rv.pts.length / 2)][1])) return null;
            var wpx = Math.max(1.2, Math.min(5, rv.w * kmPx * 0.9));
            if (rv.under) { var a0 = rv.pts.slice(0, rv.under[1] + 1), b0 = rv.pts.slice(rv.under[1]); return <g key={rv.name}><path d={smoothPath(a0, sx, sy)} className="elwm-river under" style={{ strokeWidth: wpx }} /><path d={smoothPath(b0, sx, sy)} className="elwm-river" style={{ strokeWidth: wpx }} /></g>; }
            return <path key={rv.name} d={smoothPath(rv.pts, sx, sy)} className={"elwm-river" + (rv.seasonal ? " seasonal" : "") + (rv.blight ? " blight" : "")} style={{ strokeWidth: wpx }} />;
          }) : null}
          {ready && lay.roads ? SEA_LANES.map(function (r) { return <path key={r.name} d={smoothPath(r.pts, sx, sy)} className="elwm-lane" />; }) : null}
          {ready && lay.roads ? ROADS.map(function (r) { return <path key={r.name} d={smoothPath(r.pts, sx, sy)} className={ROAD_CLASS[r.kind] || "elwm-road"} />; }) : null}
          {symbols.map(function (d, i) {
            if (lay.fog && !d.seen) return null; var x = sx(d.x), y = sy(d.y); if (x < -20 || y < -20 || x > size.w + 20 || y > size.h + 20) return null;
            var k = Math.max(0.55, Math.min(2.2, kmPx * 0.75)) * d.s * (d.big ? 1.4 : 1);
            if (d.t === "mtn") return <path key={i} d={"M" + (x - 7 * k) + " " + (y + 4 * k) + " L" + x + " " + (y - 6 * k) + " L" + (x + 7 * k) + " " + (y + 4 * k) + " Z"} className="elwm-mtn" />;
            if (d.t === "tree") return <path key={i} d={"M" + x + " " + (y - 6 * k) + " L" + (x + 4 * k) + " " + (y + 3 * k) + " L" + (x - 4 * k) + " " + (y + 3 * k) + " Z"} className="elwm-tree" />;
            if (d.t === "dead") return <path key={i} d={"M" + x + " " + (y + 4 * k) + " V" + (y - 5 * k) + " M" + x + " " + (y - 1 * k) + " L" + (x - 3 * k) + " " + (y - 4 * k) + " M" + x + " " + (y - 2 * k) + " L" + (x + 3 * k) + " " + (y - 5 * k)} className="elwm-dead" />;
            if (d.t === "dune") return <path key={i} d={"M" + (x - 7 * k) + " " + (y + 2 * k) + " Q" + (x - 2 * k) + " " + (y - 3 * k) + " " + (x + 3 * k) + " " + (y + 1 * k) + " Q" + (x + 5 * k) + " " + (y + 2 * k) + " " + (x + 7 * k) + " " + (y + 2 * k)} className="elwm-dune" />;
            if (d.t === "fen") return <path key={i} d={"M" + (x - 5 * k) + " " + y + " h" + 10 * k + " M" + (x - 3 * k) + " " + (y + 3 * k) + " h" + 6 * k} className="elwm-fen" />;
            return <path key={i} d={"M" + (x - 6 * k) + " " + (y + 2 * k) + " Q" + x + " " + (y - 5 * k) + " " + (x + 6 * k) + " " + (y + 2 * k)} className="elwm-hill" />;
          })}
          {lay.realms ? NEUTRAL.map(function (z) { var x = sx(z.x), y = sy(z.y), r = z.r * kmPx; if (x + r < 0 || y + r < 0 || x - r > size.w || y - r > size.h) return null; return <g key={z.id} pointerEvents="none"><circle cx={x} cy={y} r={r} className="elwm-neutral" />{view.z > 0.45 ? <text x={x} y={y + 4} className="elwm-arealabel neutral" style={{ fontSize: fz + "px" }}>{z.name}</text> : null}</g>; }) : null}
          {CANON_AREAS.map(function (ar) {
            var x = sx(ar.x), y = sy(ar.y); if (x < -120 || y < -40 || x > size.w + 120 || y > size.h + 40) return null;
            if (view.z < 0.8 || view.z > 7 || !seenAt(ar.x, ar.y)) return null;
            return <text key={ar.id} x={x} y={y} className="elwm-arealabel" style={{ fontSize: Math.max(9, fz - 2) + "px" }}>{ar.name}</text>;
          })}
          {lay.realms ? kLabels.map(function (K) { return <text key={K.k} x={sx(K.x)} y={sy(K.y)} className="elwm-klabel" style={{ fontSize: Math.max(12, Math.min(24, 10 + view.z * 4)) + "px", opacity: view.z > 3 ? 0.4 : 0.88 }}>{K.label}</text>; }) : null}
          {SEA_LABELS.map(function (sl) { if (sl.small && view.z < 1.2) return null; return <text key={sl.name} x={sx(sl.x)} y={sy(sl.y)} className={"elwm-sea" + (sl.small ? " small" : "")}>{sl.name}</text>; })}
          {canonShown.map(function (c) {
            var x = sx(c.x), y = sy(c.y); if (x < -30 || y < -30 || x > size.w + 30 || y > size.h + 30) return null;
            var on = sel === "canon:" + c.name, big = c.kind === "capital";
            return (
              <g key={c.name} transform={"translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")"} className={"elwm-canon" + (on ? " on" : "") + (big ? " cap" : "")} onClick={function () { setSel(on ? "" : "canon:" + c.name); setProbe(null); }} role="button" tabIndex={0} aria-label={c.name + ", gazetteer place"}>
                <circle r="12" className="elwm-canonhit" />
                {big ? <path d="M-6 4 L-6 -3 L-3 0 L0 -6 L3 0 L6 -3 L6 4 Z" className="elwm-canonmark" /> : <path d="M0 -5 L4 0 L0 5 L-4 0 Z" className="elwm-canonmark" />}
                {(on || big && view.z > 0.35 || view.z > 1.4) ? <text y="17" className={"elwm-canonlabel" + (big ? " cap" : "")}>{c.name.split(" / ")[0]}</text> : null}
              </g>
            );
          })}
          {target ? <line x1={meX} y1={meY} x2={sx(target.x)} y2={sy(target.y)} className="elwm-route" /> : null}
          {places.map(pinFor)}
          <g transform={"translate(" + meX.toFixed(1) + " " + meY.toFixed(1) + ")"} className="elwm-me" aria-label={me.approx ? "You are somewhere around here" : "You are here"}>
            {me.approx ? <circle r="22" className="elwm-me-halo" /> : null}
            <circle r="16" className="elwm-me-pulse" /><circle r="7" className="elwm-me-dot" />
          </g>
          {probe ? <g transform={"translate(" + sx(probe.x).toFixed(1) + " " + sy(probe.y).toFixed(1) + ")"}><circle r="5" className="elwm-probe" /><path d="M-9 0H-3M3 0H9M0 -9V-3M0 3V9" className="elwm-probe-x" /></g> : null}
        </svg>
        <div className="elwm-zoom">
          <button type="button" aria-label="Zoom in" onClick={function () { zoomBy(1.4); }}>+</button>
          <button type="button" aria-label="Zoom out" onClick={function () { zoomBy(1 / 1.4); }}>{"−"}</button>
          <button type="button" aria-label="Center on me" onClick={function () { setView({ cx: me.x, cy: me.y, z: Math.max(view.z, 1.6) }); }}>{"◎"}</button>
          <button type="button" aria-label="Whole continent" onClick={fitWorld}>{"⤢"}</button>
        </div>
        {layMenu ? (
          <div className="elwm-laymenu" role="group" aria-label="Map layers">
            {[["realms", "Realms and borders"], ["roads", "Roads and sea lanes"], ["symbols", "Mountains, forests, dunes"], ["fog", "Unexplored shading"], ["atlas", "Every gazetteer place (out of character)"]].map(function (r) {
              return <label key={r[0]}><input type="checkbox" checked={!!lay[r[0]]} onChange={function () { var nx = Object.assign({}, lay); nx[r[0]] = !nx[r[0]]; setLay(nx); }} />{r[1]}</label>;
            })}
          </div>
        ) : null}
        <div className="elwm-scale"><i style={{ width: nice * kmPx + "px" }} />{nice + " miles"}</div>
      </div>
      {target ? (
        <div className="elwm-card">
          <div className="elwm-card-head"><strong>{target.name}</strong><em>{selQ ? (selQ.how === "guessed" ? "approximate" : "discovered") : "gazetteer"}</em></div>
          <small>{selQ ? (selQ.region || describe(selQ.x, selQ.y).where) : describe(selCanon.x, selCanon.y).where}{" · (" + Math.round(target.x) + ", " + Math.round(target.y) + ")"}</small>
          <span>{s(selQ ? selQ.notes : selCanon.line).slice(0, 180)}</span>
          <span className="elwm-card-dist">{dist < 3 ? "You are here." : "About " + dist + " miles as the crow flies · roughly " + Math.max(1, Math.round(dist * 1.25 / MI_PER_DAY)) + (Math.round(dist * 1.25 / MI_PER_DAY) === 1 ? " day" : " days") + " on foot by road"}</span>
          <div className="elwm-card-btns">
            {dist >= 3 ? <button type="button" className="elwm-go" onClick={function () { travel(target.name.split(" / ")[0]); }}>Travel here</button> : null}
            <button type="button" onClick={function () { setView({ cx: target.x, cy: target.y, z: Math.max(view.z, 3) }); }}>Zoom here</button>
            <button type="button" onClick={function () { setSel(""); }}>Close</button>
          </div>
        </div>
      ) : null}
      {probe && !target ? (
        <div className="elwm-card">
          <div className="elwm-card-head"><strong>{probeInfo.biome || "Unknown ground"}</strong></div>
          <small>{probeInfo.where}{" · (" + Math.round(probe.x) + ", " + Math.round(probe.y) + ")"}</small>
          <span className="elwm-card-dist">{"About " + Math.round(Math.hypot(probe.x - me.x, probe.y - me.y)) + " miles from you"}</span>
          <div className="elwm-card-btns">
            {curName && !canonPlace(curName) && probeInfo.biome !== "Sea" && p.api ? <button type="button" className="elwm-go" onClick={function () { markHere(probe); }}>{"I’m here (" + curName.slice(0, 22) + ")"}</button> : null}
            <button type="button" onClick={function () { setProbe(null); }}>Close</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
export var WORLDMAP_CSS = [
  ".elwm{position:relative;margin:4px 0 12px;border:1px solid var(--metal,#788394);overflow:hidden;background:#0a1626;box-shadow:inset 0 0 24px #0008}",
  ".elwm-full{position:fixed;left:0;top:0;right:0;bottom:0;z-index:9000;margin:0;display:flex;flex-direction:column}",
  ".elwm-top{display:flex;align-items:center;gap:6px;padding:6px 8px;background:linear-gradient(180deg,#171a20,#090a0e);border-bottom:1px solid var(--metal,#788394)}",
  ".elwm-title{flex:1;font-family:Cinzel,Georgia,serif;font-size:13px;letter-spacing:.12em;color:#f0e3c9;text-transform:uppercase}",
  ".elwm-tbtn{min-height:32px;padding:3px 11px;border:1px solid var(--metal,#788394);background:linear-gradient(180deg,#17191f,#0b0c10);color:var(--rune,#a9d7f0);font:600 11px Cinzel,Georgia,serif;letter-spacing:.08em}",
  ".elwm-tbtn[aria-pressed=\"true\"]{border-color:var(--rune,#a9d7f0)}",
  ".elwm-box{position:relative;height:clamp(360px,62vh,720px);overflow:hidden;touch-action:none;cursor:grab;background:#0b1a2b}",
  ".elwm-full .elwm-box{flex:1;height:auto}",
  ".elwm-terrain{pointer-events:none;user-select:none;display:block;max-width:none!important;max-height:none!important;min-width:0}",
  ".elwm-svg{position:absolute;left:0;top:0;max-width:none!important}",
  ".elwm-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;color:#b8ad99;font:italic 15px Georgia,serif;letter-spacing:.06em}",
  ".elwm-river{fill:none;stroke:#6fb4e8;stroke-opacity:.85;stroke-linecap:round;stroke-linejoin:round}.elwm-river.under{stroke-dasharray:2 5;stroke-opacity:.55}.elwm-river.seasonal{stroke:#c9a86a;stroke-dasharray:6 4;stroke-opacity:.8}.elwm-river.blight{stroke:#8f8d96}",
  ".elwm-lake{fill:#3d6f94;stroke:#1c3348;stroke-width:1}",
  ".elwm-road{fill:none;stroke:#e8c98a;stroke-opacity:.82;stroke-width:1.5;stroke-dasharray:6 3;stroke-linecap:round}.elwm-road.hw{stroke-width:2.4;stroke-dasharray:none;stroke:#f0d79a}.elwm-road.track{stroke-dasharray:2 4;stroke-opacity:.75}.elwm-road.caravan{stroke:#f3c26b;stroke-dasharray:8 4}.elwm-road.ash{stroke:#d26a5a;stroke-dasharray:2 5}",
  ".elwm-lane{fill:none;stroke:#bfe1ff;stroke-opacity:.45;stroke-width:1.3;stroke-dasharray:3 6}",
  ".elwm-mtn{fill:#6b5a44;stroke:#2a2015;stroke-width:1}.elwm-tree{fill:#21492f;stroke:#0f2416;stroke-width:.8}.elwm-hill{fill:none;stroke:#3e5a33;stroke-width:1.4}.elwm-fen{fill:none;stroke:#2e4a35;stroke-width:1.2}.elwm-dune{fill:none;stroke:#9a7a42;stroke-width:1.2}.elwm-dead{fill:none;stroke:#2a2430;stroke-width:1.1}",
  ".elwm-neutral{fill:rgba(220,200,160,.05);stroke:#e8d7b0;stroke-opacity:.45;stroke-width:1.2;stroke-dasharray:4 5}",
  ".elwm-arealabel{fill:#e9dcb8;fill-opacity:.82;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:600;text-anchor:middle;letter-spacing:.08em;paint-order:stroke;stroke:#0a1220;stroke-width:3.5px;pointer-events:none}.elwm-arealabel.neutral{fill:#f1e4c0}",
  ".elwm-klabel{fill:#fff3cf;font-family:Cinzel,Georgia,serif;font-weight:700;text-anchor:middle;letter-spacing:.14em;paint-order:stroke;stroke:#0a1220;stroke-width:4px;pointer-events:none}",
  ".elwm-sea{fill:#9fc7e8;fill-opacity:.7;font:italic 13px Georgia,serif;text-anchor:middle;letter-spacing:.2em;pointer-events:none}.elwm-sea.small{font-size:11px;letter-spacing:.1em}",
  ".elwm-canon{cursor:pointer}.elwm-canonhit{fill:transparent}.elwm-canonmark{fill:#f3dda0;fill-opacity:.9;stroke:#2a1d0c;stroke-width:1}.elwm-canon.on .elwm-canonmark{fill:#fff3c9}",
  ".elwm-canonlabel{fill:#f3e6c4;font:italic 600 11.5px 'Cormorant Garamond',Georgia,serif;text-anchor:middle;paint-order:stroke;stroke:#0a1220;stroke-width:3.2px}.elwm-canonlabel.cap{font:700 12.5px Cinzel,Georgia,serif;letter-spacing:.04em}",
  ".elwm-pin{cursor:pointer}.elwm-pinbg{fill:#0a1220;fill-opacity:.88;stroke:#f3dda0;stroke-width:1.6}.elwm-pin.on .elwm-pinbg{stroke-width:2.6;fill:#2b2614}.elwm-pin.cleared .elwm-pinbg{stroke:#9fe7d6}",
  ".elwm-glyph{fill:#f3dda0;stroke:#f3dda0;stroke-width:.8;stroke-linejoin:round}.elwm-glyph.line{fill:none;stroke-width:1.4}",
  ".elwm-halo{fill:rgba(159,199,232,.12);stroke:#9fc7e8;stroke-opacity:.6;stroke-dasharray:3 3}",
  ".elwm-label{fill:#fff6dc;font:700 12px 'Cormorant Garamond',Georgia,serif;text-anchor:middle;paint-order:stroke;stroke:#0a1220;stroke-width:3.5px}.elwm-label.on{fill:#f3dda0;font-size:13.5px}",
  ".elwm-me-dot{fill:#5fd1a9;stroke:#fff;stroke-width:2}.elwm-me-halo{fill:rgba(95,209,169,.14);stroke:#5fd1a9;stroke-opacity:.8;stroke-dasharray:4 4}",
  "@keyframes elwmPulse{0%{r:8;opacity:.9}100%{r:22;opacity:0}}",
  ".elwm-me-pulse{fill:none;stroke:#5fd1a9;stroke-width:2;animation:elwmPulse 1.8s ease-out infinite}",
  ".elwm-route{stroke:#f3dda0;stroke-width:2;stroke-dasharray:6 5}",
  ".elwm-probe{fill:rgba(243,221,160,.25);stroke:#f3dda0;stroke-width:1.5}.elwm-probe-x{stroke:#f3dda0;stroke-width:1.5}",
  ".elwm-zoom{position:absolute;right:8px;top:8px;display:flex;flex-direction:column;gap:5px}",
  ".elwm-zoom button{width:36px;height:36px;border:1px solid var(--metal,#788394);background:rgba(10,14,20,.9);color:var(--rune,#a9d7f0);font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center}",
  ".elwm-laymenu{position:absolute;right:52px;top:8px;display:flex;flex-direction:column;gap:2px;padding:6px 10px;border:1px solid var(--rune,#a9d7f0);background:rgba(9,12,18,.96);box-shadow:0 6px 18px rgba(0,0,0,.6);z-index:3;max-width:calc(100% - 64px)}",
  ".elwm-laymenu label{display:flex;align-items:center;gap:8px;min-height:32px;font-size:14px;color:#e1d6c1}.elwm-laymenu input{width:18px;height:18px;accent-color:#a9d7f0}",
  ".elwm-scale{position:absolute;left:8px;bottom:8px;display:flex;align-items:center;gap:6px;font-size:12px;color:#fff6dc;text-shadow:0 1px 2px #000;pointer-events:none}",
  ".elwm-scale i{display:block;height:5px;border:1.5px solid #fff6dc;border-top:0}",
  ".elwm-card{position:absolute;left:8px;right:54px;bottom:8px;padding:8px 10px;border:1px solid var(--rune,#a9d7f0);background:rgba(9,12,18,.95);box-shadow:0 6px 20px rgba(0,0,0,.6);z-index:4}",
  ".elwm-full .elwm-card{bottom:calc(14px + env(safe-area-inset-bottom))}",
  ".elwm-card-head{display:flex;align-items:baseline;gap:8px}.elwm-card-head strong{font-family:Cinzel,Georgia,serif;font-size:15px;color:#f6edd7}",
  ".elwm-card-head em{font-style:normal;font-size:10.5px;padding:1px 7px;border:1px solid var(--metal,#788394);color:var(--rune,#a9d7f0);text-transform:uppercase;letter-spacing:.08em}",
  ".elwm-card small{display:block;font-size:12px;color:#b8ad99;margin-top:2px}",
  ".elwm-card span{display:block;font-size:13px;color:#e1d6c1;line-height:1.35;margin-top:3px}",
  ".elwm-card-dist{color:#9fe7d6!important}",
  ".elwm-card-btns{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap}",
  ".elwm-card-btns button{min-height:34px;padding:3px 11px;border:1px solid var(--metal,#788394);background:linear-gradient(180deg,#17191f,#0b0c10);color:#e1d6c1;font:600 12px Cinzel,Georgia,serif}",
  ".elwm-card-btns .elwm-go{border-color:var(--rune,#a9d7f0);color:var(--rune,#a9d7f0)}"
].join("\n");
