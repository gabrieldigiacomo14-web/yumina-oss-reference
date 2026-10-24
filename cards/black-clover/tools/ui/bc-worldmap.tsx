/* Black Clover — the interactive world map.
 * Terrain, kingdoms, rivers and roads come from bc-cartography.js (a Voronoi
 * world generator in the style of the Universal World Engine map, constrained
 * by canon). This file turns the story's known_locations into pins on it,
 * works out where the character really is, and draws the view: a canvas of
 * terrain re-rendered for the current zoom, with fog over what the character
 * has not seen, and an SVG layer of pins, rivers, roads and labels on top.
 * Purely interface: no AI calls. */
import { CANON_PLACES, CANON_AREAS, FRAME, KINGDOMS, KINGDOM_TINT, GAZ, REALM_BOUNDS, BIOMES, baseWorld, politics, renderTerrain, pointInKingdom, revealCells, symbolsInView, kingdomLabels, roadNetwork, realmOfPoint, ownerAtKm, cellAtKm, rng as mapRng } from "./bc-cartography.js";

function n(v, d) { var z = Number(v); return isFinite(z) ? z : (d === undefined ? 0 : d); }
function s(v) { return v === undefined || v === null ? "" : String(v); }
function o(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
function a(v) { return Array.isArray(v) ? v : []; }
function low(v) { return s(v).toLowerCase(); }
function hash(str) { var h = 2166136261; str = s(str); for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
var W = FRAME.X1 - FRAME.X0, H = FRAME.Y1 - FRAME.Y0;
var MAP_READY = false;
export function mapReady() { return MAP_READY; }
var POL = { key: "", P: null };
function polFor(pins) {
  var key = pins.map(function (p) { return p.k + ":" + Math.round(p.x) + "," + Math.round(p.y); }).sort().join("|");
  if (POL.key !== key || !POL.P) POL = { key: key, P: politics(pins) };
  return POL.P;
}

/* ---------- placing places from descriptions ---------- */
var DIR = { north: 90, n: 90, northeast: 45, ne: 45, east: 0, e: 0, southeast: -45, se: -45, south: -90, s: -90, southwest: -135, sw: -135, west: 180, w: 180, northwest: 135, nw: 135 };
var DIR_RE = "(north[- ]?east|north[- ]?west|south[- ]?east|south[- ]?west|north|south|east|west|ne|nw|se|sw)";
function dirAngle(w) { return DIR[low(w).replace(/[- ]/g, "")]; }
function kmOf(num, unit) {
  unit = low(unit);
  if (/^day/.test(unit)) return num * 30;
  if (/^hour|^hr/.test(unit)) return num * 4.5;
  if (/^mile/.test(unit)) return num * 1.6;
  return num;
}
function realmOf(l) { var t = low(s(l.region) + " " + s(l.realm) + " " + s(l.notes)); if (/noble realm/.test(t)) return "noble"; if (/common realm/.test(t)) return "common"; if (/forsaken realm/.test(t)) return "forsaken"; return ""; }
function kingdomKey(l) {
  var t = low(s(l.kingdom) + " " + s(l.region));
  if (/diamond/.test(t)) return "Diamond"; if (/heart/.test(t)) return "Heart"; if (/spade/.test(t)) return "Spade"; if (/witch/.test(t)) return "Witches";
  if (/clover|noble realm|common realm|forsaken realm/.test(t)) return "Clover"; return "";
}
/* "The Village of Hage", "Hage Village" and "hage" are the same place. */
function baseName(name) {
  return low(name).replace(/\(.*?\)/g, "").replace(/^the\s+/, "").replace(/^(village|town|city|hamlet|port|castle) of\s+/, "")
    .replace(/\s+(village|town|city|hamlet|settlement)$/, "").replace(/\s+/g, " ").trim();
}
export function lookupName(name, placed) {
  var key = baseName(name); if (!key) return null;
  if (GAZ[key]) return { x: GAZ[key][0], y: GAZ[key][1] };
  for (var i = 0; i < placed.length; i++) { var q = placed[i]; var qn = baseName(q.name); if (!qn) continue; if (qn === key || qn.indexOf(key) === 0 || key.indexOf(qn) === 0) return { x: q.x, y: q.y }; }
  var g = Object.keys(GAZ).filter(function (k) { return key.indexOf(k) >= 0; }).sort(function (x, y) { return y.length - x.length; })[0];
  return g ? { x: GAZ[g][0], y: GAZ[g][1] } : null;
}
function fromText(text, placed) {
  text = s(text); if (!text) return null;
  var re = new RegExp("(\\d+(?:\\.\\d+)?|a|an|one|two|three|four|five|half a)\\s*(km|kilomet(?:er|re)s?|miles?|hours?|hrs?|days?)(?:'s)?(?:\\s+(?:walk|ride|travel|journey|march))?\\s+(?:to the\\s+)?" + DIR_RE + "\\s+(?:of|from)\\s+(?:the\\s+)?([A-Z][\\w'’ -]{1,40})", "i");
  var m = text.match(re);
  var words = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, "half a": 0.5 };
  if (m) {
    var ref = lookupName(m[4].replace(/[.,;].*$/, ""), placed);
    if (ref) { var km = kmOf(words[low(m[1])] || n(m[1], 1), m[2]), ang = dirAngle(m[3]) * Math.PI / 180; return { x: ref.x + Math.cos(ang) * km, y: ref.y + Math.sin(ang) * km, how: "described" }; }
  }
  var m2 = text.match(new RegExp(DIR_RE + "\\s+(?:of|from)\\s+(?:the\\s+)?([A-Z][\\w'’ -]{1,40})", "i"));
  if (m2) { var r2 = lookupName(m2[2].replace(/[.,;].*$/, ""), placed); if (r2) { var a2 = dirAngle(m2[1]) * Math.PI / 180; return { x: r2.x + Math.cos(a2) * 12, y: r2.y + Math.sin(a2) * 12, how: "described" }; } }
  var m3 = text.match(/(?:near|outside|beside|just past|close to|by)\s+(?:the\s+)?([A-Z][\w'’ -]{1,40})/);
  if (m3) { var r3 = lookupName(m3[1].replace(/[.,;].*$/, ""), placed); if (r3) { var a3 = (hash(text) % 360) * Math.PI / 180; return { x: r3.x + Math.cos(a3) * 6, y: r3.y + Math.sin(a3) * 6, how: "described" }; } }
  return null;
}
/* Every known place gets a position. `recorded` = coordinates were saved;
   otherwise it is worked out from the description and drawn as approximate.
   A place the story put in a kingdom is also a pin for the map's politics, so
   that kingdom's land is drawn around it (a Clover village never ends up in Heart). */
var DEFAULT_START = { x: -2, y: 52 };
export function layoutPlaces(v) {
  var locs = a(v.known_locations).map(o).filter(function (l) { return s(l.name); });
  var geo = o(o(v.world_truth).geo);
  var placed = [], pending = [];
  locs.forEach(function (l) {
    var name = s(l.name), key = low(name);
    if (isFinite(Number(l.x)) && isFinite(Number(l.y)) && l.x !== "" && l.y !== "" && l.x !== null && l.y !== null) {
      // a canon place saved far from its canon position (a slip in an old reply) is drawn where canon puts it
      var cn = GAZ[key.replace(/^the\s+/, "")] || GAZ[baseName(name)];
      if (cn && Math.hypot(Number(l.x) - cn[0], Number(l.y) - cn[1]) > 30) { placed.push(mk(l, cn[0], cn[1], "canon")); return; }
      placed.push(mk(l, Number(l.x), Number(l.y), "recorded")); return;
    }
    var g = geo[name] || geo[Object.keys(geo).filter(function (k) { return low(k) === key; })[0]];
    if (g && isFinite(Number(g.x)) && isFinite(Number(g.y))) { placed.push(mk(l, Number(g.x), Number(g.y), "recorded")); return; }
    var c = GAZ[key.replace(/^the\s+/, "")] || GAZ[baseName(name)]; if (c) { placed.push(mk(l, c[0], c[1], "canon")); return; }
    pending.push(l);
  });
  for (var pass = 0; pass < 3 && pending.length; pass++) {
    pending = pending.filter(function (l) {
      var near = s(l.near), dir = s(l.dir), km = n(l.km || l.distance_km, 0), hit = null;
      if (near) { var ref = lookupName(near, placed); if (ref) { var ang = (dirAngle(dir) !== undefined ? dirAngle(dir) : (hash(l.name) % 360)) * Math.PI / 180; var dist = km || 8; hit = { x: ref.x + Math.cos(ang) * dist, y: ref.y + Math.sin(ang) * dist, how: "described" }; } }
      if (!hit) hit = fromText([l.notes, l.route, l.description, l.how_to_get_there].map(s).join(". "), placed);
      if (hit) { placed.push(mk(l, hit.x, hit.y, hit.how)); return false; }
      return true;
    });
  }
  var pins = pinsOf(placed);
  var P = MAP_READY ? polFor(pins) : null;
  pending.forEach(function (l) {
    var kk = kingdomKey(l), realm = realmOf(l), hv = hash(l.name), x, y;
    if (P && kk !== "Witches") { var pt = pointInKingdom(P, kk || "Clover", kk === "" || kk === "Clover" ? realm : "", s(l.name)); x = pt.x; y = pt.y; }
    else if (kk === "Witches") { var an = (hv % 360) * Math.PI / 180; x = 48 + Math.cos(an) * 6; y = 58 + Math.sin(an) * 6; }
    else { var an2 = (hv % 360) * Math.PI / 180, rad = realm === "noble" ? 3 + (hv >> 9) % 7 : realm === "common" ? 14 + (hv >> 9) % 22 : 44 + (hv >> 9) % 28; x = Math.cos(an2) * rad; y = Math.sin(an2) * rad * 0.9 + 6; }
    placed.push(mk(l, x, y, "guessed"));
  });
  placed.pins = pins; placed.P = P;
  return placed;
  function mk(l, x, y, how) { return { name: s(l.name), x: x, y: y, how: how, status: s(l.status) || "known", kingdom: s(l.kingdom), region: s(l.region), notes: s(l.notes), route: s(l.route), kind: kindOf(l), kk: kingdomKey(l) }; }
}
function pinsOf(placed) {
  var out = [];
  placed.forEach(function (q) { if (q.how === "guessed") return; var kk = q.kk || kingdomKey(q); if (kk === "Clover" || kk === "Diamond" || kk === "Heart" || kk === "Spade") out.push({ x: q.x, y: q.y, k: kk }); });
  return out;
}
function kindOf(l) {
  var t = low(s(l.name) + " " + s(l.notes) + " " + s(l.kind));
  if (/capital|castle|palace/.test(t)) return "castle";
  if (/dungeon|ruin|temple/.test(t)) return "ruin";
  if (/forest|wood/.test(t)) return "forest";
  if (/mountain|peak|pass|mine/.test(t)) return "mountain";
  if (/lake|river|port|harbou?r|coast|sea|beach|resort/.test(t)) return "water";
  if (/hq|headquarters|base|fort|garrison|outpost/.test(t)) return "fort";
  if (/city|town/.test(t)) return "town";
  return "village";
}
/* ---------- where the character is ---------- */
var STOP = { the: 1, of: 1, and: 1, in: 1, at: 1, on: 1, near: 1, room: 1, hall: 1, street: 1, house: 1, village: 1, town: 1, city: 1, hamlet: 1, church: 1, tower: 1, castle: 1, headquarters: 1, hq: 1, hideout: 1, base: 1, manor: 1, inn: 1, tavern: 1, shop: 1, market: 1, gate: 1, square: 1, district: 1, quarter: 1, north: 1, south: 1, east: 1, west: 1, kingdom: 1, realm: 1, clover: 1, noble: 1, common: 1, forsaken: 1, floor: 1, chamber: 1, bedroom: 1, home: 1, residence: 1 };
function tokens(t) { return low(t).replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(function (w) { return w.length >= 3 && !STOP[w]; }).map(function (w) { return w.replace(/'s$/, ""); }); }
function segmentsOf(text) { return s(text).split(/\s+[—–-]\s+|,|\(|\)/).map(function (x) { return x.trim(); }).filter(Boolean); }
/* the place whose name best matches a piece of text (a location line, a home line) */
export function matchPlace(text, places) {
  var segs = segmentsOf(text), best = null, bs = 0;
  segs.forEach(function (seg, si) {
    var st = tokens(seg); if (!st.length) return;
    places.forEach(function (q) {
      var qt = tokens(q.name); if (!qt.length) return;
      var inter = st.filter(function (w) { return qt.indexOf(w) >= 0; }).length; if (!inter) return;
      var full = inter === st.length || inter === qt.length;
      var score = (full ? 10 : inter) + inter - si * 0.1 + (low(q.name) === low(seg) ? 5 : 0);
      if (full && score > bs) { bs = score; best = q; }
    });
  });
  return best;
}
/* position of the character: the place named in their current location, else the
   kingdom and realm that line states, else the last saved coordinates */
export function playerXY(v, places) {
  var text = s(v.current_location), hit = text ? matchPlace(text, places) : null;
  if (hit) return { x: hit.x, y: hit.y, approx: hit.how === "guessed", name: hit.name, how: "place" };
  var px = n(v.player_x, DEFAULT_START.x), py = n(v.player_y, DEFAULT_START.y);
  var atDefault = Math.abs(px - DEFAULT_START.x) < 0.01 && Math.abs(py - DEFAULT_START.y) < 0.01;
  if (text && (atDefault || !places.some(function (q) { return Math.abs(q.x - px) < 1.5 && Math.abs(q.y - py) < 1.5; }))) {
    var kk = kingdomKey({ kingdom: text, region: text }), realm = realmOf({ region: text, notes: text });
    if (kk && places.P) { var pt = pointInKingdom(places.P, kk, kk === "Clover" ? realm : "", segmentsOf(text).filter(function (x) { return !/^(room|floor|bedroom|chamber)\b/i.test(x); })[0] || text); return { x: pt.x, y: pt.y, approx: true, name: "", how: "region" }; }
  }
  return { x: px, y: py, approx: atDefault && !!text, name: "", how: "saved" };
}
function placeNameOfCurrent(text) {
  var segs = segmentsOf(text).filter(function (x) { return !/^(room|floor|bedroom|chamber|cell|office|hall)\b/i.test(x) && !/^(clover|diamond|heart|spade)\b/i.test(x) && !/\b(realm)$/i.test(x); });
  return segs[0] || segmentsOf(text)[0] || "";
}

/* ---------- component ---------- */
var KIND_GLYPH = {
  castle: "M-6 6 V-3 H-4 V-1 H-2 V-6 H2 V-1 H4 V-3 H6 V6 Z", town: "M-6 6 V-1 L-3 -4 L0 -1 V-3 L3 -6 L6 -3 V6 Z", village: "M-5 6 V0 L0 -5 L5 0 V6 Z",
  ruin: "M-6 6 V-2 H-3 V3 H-1 V-5 H2 V2 H4 V-1 H6 V6 Z", forest: "M0 -7 L5 2 H2 L5 6 H-5 L-2 2 H-5 Z", mountain: "M-7 6 L-1 -6 L3 1 L5 -2 L8 6 Z",
  water: "M-6 1 Q-3 -3 0 1 T6 1 M-6 5 Q-3 1 0 5 T6 5", fort: "M-6 6 V-5 H-3 V-2 H0 V-5 H3 V-2 H6 V6 Z"
};
var STATUS_COL = { visited: "#f3dda0", known: "#e8e2d2", rumored: "#b48ae8", approximate: "#9fc7e8" };
/* ---------- component ---------- */
var STATUS_COL = { visited: "#f3dda0", known: "#e8e2d2", rumored: "#b48ae8", approximate: "#9fc7e8" };
var DEF_LAYERS = { realms: true, fog: true, symbols: true, roads: true, canon: true };
var CANON_OTHER = { diamond: "Diamond Kingdom", heart: "Heart Kingdom", spade: "Spade Kingdom" };
export function canonPlace(name) { var k = baseName(name); for (var i = 0; i < CANON_PLACES.length; i++) if (baseName(CANON_PLACES[i].name) === k || baseName(CANON_PLACES[i].name).indexOf(k) === 0 && k.length > 3) return CANON_PLACES[i]; return null; }
export function WorldMap(p) {
  var v = p.v || {};
  var rs0 = React.useState(MAP_READY); var ready = rs0[0], setReady = rs0[1];
  React.useEffect(function () { if (MAP_READY) return; var t = setTimeout(function () { try { baseWorld(); } catch (e) { console.warn("map generation failed", e); } MAP_READY = true; setReady(true); }, 40); return function () { clearTimeout(t); }; }, []);
  var places = layoutPlaces(v); var me = playerXY(v, places); var P = places.P;
  var home = React.useMemo(function () { return v.home_location ? matchPlace(s(v.home_location), places) : null; }, [s(v.home_location), places.length]);
  var boxRef = React.useRef(null), cvRef = React.useRef(null), rendered = React.useRef(null);
  var vs = React.useState({ cx: me.x, cy: me.y, z: 1.5 }); var view = vs[0], setView = vs[1];
  var ss = React.useState(""); var sel = ss[0], setSel = ss[1];
  var ps0 = React.useState(null); var probe = ps0[0], setProbe = ps0[1];
  var ls = React.useState(DEF_LAYERS); var lay = ls[0], setLay = ls[1];
  var lm = React.useState(false); var layMenu = lm[0], setLayMenu = lm[1];
  var fs = React.useState(false); var full = fs[0], setFull = fs[1];
  var seenS = React.useState(null); var seen = seenS[0], setSeen = seenS[1];
  var sz = React.useState({ w: 360, h: 420 }); var size = sz[0], setSize = sz[1];
  var rt = React.useState(0); var rtick = rt[0], setRtick = rt[1];
  var drag = React.useRef(null);
  React.useEffect(function () {
    function fit() { var el = boxRef.current; if (el) setSize({ w: el.clientWidth || 360, h: el.clientHeight || 420 }); }
    fit(); window.addEventListener("resize", fit); return function () { window.removeEventListener("resize", fit); };
  }, [full]);
  React.useEffect(function () {
    var st = p.api && p.api.storage; if (!st || typeof st.get !== "function") { setSeen([]); return; }
    try { var pr = st.get("bc_map_seen"); if (pr && pr.then) pr.then(function (raw) { var l = []; try { l = raw ? JSON.parse(raw) : []; } catch (e) {} setSeen(Array.isArray(l) ? l : []); }, function () { setSeen([]); }); else setSeen([]); } catch (e) { setSeen([]); }
  }, []);
  var names = places.map(function (q) { return q.name; });
  var fresh = seen ? names.filter(function (x) { return seen.indexOf(x) < 0; }) : [];
  function markSeen() { var st = p.api && p.api.storage; setSeen(names); if (st && typeof st.set === "function") { try { st.set("bc_map_seen", JSON.stringify(names)); } catch (e) {} } }
  // km <-> screen px
  var kmPx = (size.w / 220) * view.z;
  function sx(x) { return size.w / 2 + (x - view.cx) * kmPx; }
  function sy(y) { return size.h / 2 - (y - view.cy) * kmPx; }
  function zoomBy(f, ax, ay) {
    setView(function (cur) {
      var z = Math.max(0.45, Math.min(16, cur.z * f)); var kp0 = (size.w / 220) * cur.z, kp1 = (size.w / 220) * z;
      if (ax === undefined) return { cx: cur.cx, cy: cur.cy, z: z };
      var wx = cur.cx + (ax - size.w / 2) / kp0, wy = cur.cy - (ay - size.h / 2) / kp0;
      return { cx: wx - (ax - size.w / 2) / kp1, cy: wy + (ay - size.h / 2) / kp1, z: z };
    });
  }
  function onDown(e) {
    var el = boxRef.current; if (!el) return;
    if (e.target && e.target.closest && e.target.closest("button,[role=button],.bcwm-card,.bcwm-laymenu")) return;
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
      setView(function (cur) { var kp = (size.w / 220) * cur.z; return { cx: cur.cx - dx / kp, cy: cur.cy + dy / kp, z: cur.z }; });
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
  function tap(name) { setSel(sel === name ? "" : name); setProbe(null); if (fresh.indexOf(name) >= 0) markSeen(); }
  var selQ = places.filter(function (q) { return q.name === sel; })[0];
  var selCanon = !selQ && /^canon:/.test(sel) ? CANON_PLACES.filter(function (c) { return "canon:" + c.name === sel; })[0] : null;
  var dist = selQ ? Math.round(Math.hypot(selQ.x - me.x, selQ.y - me.y)) : selCanon ? Math.round(Math.hypot(selCanon.x - me.x, selCanon.y - me.y)) : 0;
  var knownKeys = {}; places.forEach(function (q) { knownKeys[baseName(q.name)] = 1; });
  var trail = a(p.trail).filter(function (t) { return isFinite(t.x) && isFinite(t.y); });
  var showLabels = view.z > 1.35;

  // what the character has seen: around places they know, along their trail, and the Royal Capital's heartland (common knowledge)
  var discs = React.useMemo(function () {
    var d = [{ x: 0, y: 0, r: 52 }, { x: me.x, y: me.y, r: 48 }];
    places.forEach(function (q) { if (q.status === "rumored" || q.how === "guessed") return; d.push({ x: q.x, y: q.y, r: q.status === "visited" ? 40 : 24 }); });
    trail.forEach(function (t) { d.push({ x: t.x, y: t.y, r: 28 }); });
    return d;
  }, [places.map(function (q) { return q.name + q.x + q.y + q.status; }).join("|"), Math.round(me.x), Math.round(me.y), trail.length]);
  var polKey = POL.key;
  // terrain: re-rendered for the current view once the hands come off it; until then the last picture is moved and scaled
  React.useEffect(function () {
    if (!ready || !P) return;
    var t = setTimeout(function () {
      var cv = cvRef.current; if (!cv) return;
      var q = size.w * size.h > 420000 ? 2 : 1.5, w = Math.ceil(size.w / q), h = Math.ceil(size.h / q);
      try {
        revealCells(lay.fog ? discs : [{ x: 0, y: 100, r: 9999 }]);
        var out = renderTerrain(P, { cx: view.cx, cy: view.cy, pxPerKm: kmPx / q, w: w, h: h }, { realms: lay.realms, borders: lay.realms, fog: lay.fog, fogDiscs: lay.fog ? discs : null });
        cv.width = w; cv.height = h; var ctx = cv.getContext("2d"); var id = ctx.createImageData(w, h); id.data.set(out); ctx.putImageData(id, 0, 0);
        rendered.current = { cx: view.cx, cy: view.cy, kmPx: kmPx, w: w, h: h, q: q }; setRtick(function (x) { return x + 1; });
      } catch (err) { console.warn("map render failed", err); }
    }, rendered.current ? 140 : 0);
    return function () { clearTimeout(t); };
  }, [ready, polKey, Math.round(view.cx * 4), Math.round(view.cy * 4), Math.round(view.z * 100), size.w, size.h, lay.realms, lay.fog, discs]);
  var rc = rendered.current, cvStyle = null;
  if (rc) { var cssW = rc.w * rc.q * (kmPx / rc.kmPx), cssH = rc.h * rc.q * (kmPx / rc.kmPx); cvStyle = { position: "absolute", width: cssW + "px", height: cssH + "px", left: (size.w / 2 + (rc.cx - view.cx) * kmPx - cssW / 2) + "px", top: (size.h / 2 - (rc.cy - view.cy) * kmPx - cssH / 2) + "px" }; }

  var B = ready ? baseWorld() : null;
  var roads = React.useMemo(function () {
    if (!ready || !lay.roads) return [];
    var known = places.filter(function (q) { return q.status !== "rumored" && q.how !== "guessed" && q.kind !== "forest"; }).map(function (q) { return { x: q.x, y: q.y, name: q.name }; });
    var capital = { x: 0, y: 0, name: "Royal Capital" }; if (!known.some(function (q) { return Math.hypot(q.x, q.y) < 6; })) known.push(capital);
    return roadNetwork(known.slice(0, 22));
  }, [ready, lay.roads, places.filter(function (q) { return q.status !== "rumored" && q.how !== "guessed"; }).map(function (q) { return q.name + Math.round(q.x) + Math.round(q.y); }).join("|")]);
  var symbols = React.useMemo(function () {
    if (!ready || !lay.symbols || view.z < 1.1) return [];
    return symbolsInView(P, { cx: view.cx, cy: view.cy, w: size.w, h: size.h, pxPerKm: kmPx });
  }, [ready, lay.symbols, Math.round(view.cx / 6), Math.round(view.cy / 6), Math.round(view.z * 4), size.w, size.h, rtick > -1 ? polKey : ""]);
  var labelSlots = [];
  function pinFor(q) {
    var x = sx(q.x), y = sy(q.y);
    var ly = 24; labelSlots.forEach(function (sl) { if (Math.abs(sl[0] - x) < 70 && Math.abs(sl[1] - (y + ly)) < 13) ly += 13; }); labelSlots.push([x, y + ly]); if (x < -40 || y < -40 || x > size.w + 40 || y > size.h + 40) return null;
    var on = sel === q.name, isNew = fresh.indexOf(q.name) >= 0, col = STATUS_COL[q.status] || STATUS_COL.known;
    return (
      <g key={q.name} transform={"translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")"} className={"bcwm-pin" + (on ? " on" : "") + (q.how === "guessed" ? " guess" : "")} onClick={function () { tap(q.name); }} role="button" tabIndex={0} aria-label={q.name + (q.how === "guessed" ? ", approximate position" : "")} onKeyDown={function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(q.name); } }}>
        {q.how !== "recorded" && q.how !== "canon" ? <circle r={q.how === "guessed" ? 13 : 10} className="bcwm-halo" /> : null}
        <circle r="11" className="bcwm-pinbg" style={{ stroke: col }} />
        <path d={KIND_GLYPH[q.kind] || KIND_GLYPH.village} className="bcwm-glyph" style={{ fill: q.kind === "water" ? "none" : col, stroke: col }} />
        {q.status === "rumored" ? <text y="-14" className="bcwm-q">?</text> : null}
        {(showLabels || on) ? <text y={ly} className={"bcwm-label" + (on ? " on" : "")}>{q.name}</text> : null}
        {isNew ? <text x="10" y="-9" className="bcwm-new">NEW</text> : null}
      </g>
    );
  }
  var meX = sx(me.x), meY = sy(me.y);
  function describe(x, y) {
    if (!P) return { where: "", biome: "" };
    var c = cellAtKm(x, y); if (c.water) return { where: "Open water", biome: "Sea" };
    var ki = P.owner[c.i], K = KINGDOMS[ki] || KINGDOMS[0];
    return { where: K.label + (K.k === "Clover" ? " — " + { noble: "Noble Realm", common: "Common Realm", forsaken: "Forsaken Realm" }[realmOfPoint(x, y)] : ""), biome: BIOMES[c.biome].name, k: K.k, realm: K.k === "Clover" ? realmOfPoint(x, y) : "" };
  }
  var cur = s(v.current_location), curName = placeNameOfCurrent(cur);
  function markHere(pt) {
    var api = p.api; if (!api || typeof api.patchVariables !== "function" || !curName) return;
    var d = describe(pt.x, pt.y), list = a(v.known_locations).map(function (l) { return Object.assign({}, l); }), key = baseName(curName), done = false;
    list.forEach(function (l) { if (baseName(l.name) === key) { l.x = Math.round(pt.x * 10) / 10; l.y = Math.round(pt.y * 10) / 10; if (!l.kingdom) l.kingdom = d.k ? d.k + " Kingdom" : ""; if (d.realm && !l.region) l.region = { noble: "Noble Realm", common: "Common Realm", forsaken: "Forsaken Realm" }[d.realm]; l.status = "visited"; done = true; } });
    if (!done) list.push({ name: curName, kingdom: d.k ? d.k + " Kingdom" : "", region: d.realm ? { noble: "Noble Realm", common: "Common Realm", forsaken: "Forsaken Realm" }[d.realm] : "", status: "visited", notes: "Marked on the map by the player.", x: Math.round(pt.x * 10) / 10, y: Math.round(pt.y * 10) / 10 });
    var pr; try { pr = api.patchVariables({ known_locations: list, player_x: Math.round(pt.x * 10) / 10, player_y: Math.round(pt.y * 10) / 10 }); } catch (e) { pr = null; }
    if (typeof api.showToast === "function") { try { api.showToast("Marked " + curName + " on the map.", "success"); } catch (e) {} }
    setProbe(null);
  }
  var kLabels = ready && P && lay.realms ? kingdomLabels(P) : [];
  var probeInfo = probe ? describe(probe.x, probe.y) : null;
  return (
    <div className={"bcwm" + (full ? " bcwm-full" : "")}>
      <div className="bcwm-top">
        <span className="bcwm-title">The Known World</span>
        {fresh.length && seen && seen.length ? <button type="button" className="bcwm-newbtn" onClick={function () { var q = places.filter(function (x) { return x.name === fresh[0]; })[0]; if (q) { setView({ cx: q.x, cy: q.y, z: Math.max(view.z, 3) }); setSel(q.name); } markSeen(); }}>{"New: " + fresh.slice(0, 2).join(", ") + (fresh.length > 2 ? "…" : "")}</button> : null}
        <button type="button" className="bcwm-tbtn" aria-pressed={layMenu ? "true" : "false"} onClick={function () { setLayMenu(!layMenu); }}>Layers</button>
        <button type="button" className="bcwm-tbtn" onClick={function () { setFull(!full); }}>{full ? "Close" : "Expand"}</button>
      </div>
      <div ref={boxRef} className="bcwm-box" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}>
        <canvas ref={cvRef} className="bcwm-terrain" style={cvStyle || { display: "none" }} />
        {!ready || !rc ? <div className="bcwm-loading"><span>Drawing the realm{"…"}</span></div> : null}
        <svg className="bcwm-svg" width={size.w} height={size.h} aria-label="World map">
          {ready && B ? B.rivers.map(function (path, ri) {
            var segs = [], seg = [];
            path.forEach(function (ci) { var c = B.cells[ci]; if (lay.fog && !c.seen) { if (seg.length > 1) segs.push(seg); seg = []; } else seg.push([sx(c.x), sy(c.y)]); });
            if (seg.length > 1) segs.push(seg);
            return segs.map(function (sg, k) { return <path key={ri + "-" + k} className="bcwm-river" style={{ strokeWidth: Math.max(1.4, Math.min(5, kmPx * 0.35)) }} d={"M" + sg.map(function (pt, i) { return pt[0].toFixed(1) + " " + pt[1].toFixed(1); }).join("L")} />; });
          }) : null}
          {roads.map(function (r, i) { return <path key={i} className="bcwm-road" d={"M" + r.pts.map(function (pt) { return sx(pt[0]).toFixed(1) + " " + sy(pt[1]).toFixed(1); }).join("L")} />; })}
          {symbols.map(function (d, i) {
            if (lay.fog && !d.seen) return null; var x = sx(d.x), y = sy(d.y); if (x < -20 || y < -20 || x > size.w + 20 || y > size.h + 20) return null;
            var k = Math.max(0.5, Math.min(2.2, kmPx / 3)) * d.s;
            if (d.t === "mtn") return <path key={i} d={"M" + (x - 7 * k) + " " + (y + 4 * k) + " L" + x + " " + (y - 6 * k) + " L" + (x + 7 * k) + " " + (y + 4 * k) + " Z"} className="bcwm-mtn" />;
            if (d.t === "tree") return <path key={i} d={"M" + x + " " + (y - 6 * k) + " L" + (x + 4 * k) + " " + (y + 3 * k) + " L" + (x - 4 * k) + " " + (y + 3 * k) + " Z"} className="bcwm-tree" />;
            if (d.t === "fen") return <path key={i} d={"M" + (x - 5 * k) + " " + y + " h" + 10 * k + " M" + (x - 3 * k) + " " + (y + 3 * k) + " h" + 6 * k} className="bcwm-fen" />;
            return <path key={i} d={"M" + (x - 6 * k) + " " + (y + 2 * k) + " Q" + x + " " + (y - 5 * k) + " " + (x + 6 * k) + " " + (y + 2 * k)} className="bcwm-hill" />;
          })}
          {lay.realms ? (
            <g>
              {[["Noble Realm", REALM_BOUNDS.noble], ["Common Realm", REALM_BOUNDS.common]].map(function (r) { return <circle key={r[0]} cx={sx(0)} cy={sy(0)} r={r[1] * kmPx} className="bcwm-ring" />; })}
              {view.z > 1.4 ? <text x={sx(0)} y={sy(0) - REALM_BOUNDS.noble * kmPx - 4} className="bcwm-ringlabel">Noble Realm</text> : null}
              {view.z > 0.9 ? <text x={sx(0)} y={sy(0) - REALM_BOUNDS.common * kmPx - 4} className="bcwm-ringlabel">Common Realm</text> : null}
              {view.z > 0.7 ? <text x={sx(-14)} y={sy(0) - (REALM_BOUNDS.common + 22) * kmPx} className="bcwm-ringlabel">Forsaken Realm</text> : null}
              {kLabels.map(function (K) { return <text key={K.k} x={sx(K.x)} y={sy(K.y + (K.k === "Clover" ? 40 : 0))} className="bcwm-klabel" style={{ fontSize: Math.max(11, Math.min(22, 9 + view.z * 3)) + "px", opacity: view.z > 3.5 ? 0.45 : 0.85 }}>{K.label}</text>; })}
              <text x={sx(20)} y={sy(-46)} className="bcwm-sea">Southern Sea</text>
            </g>
          ) : null}
          {lay.canon ? CANON_AREAS.map(function (ar) {
            var x = sx(ar.x), y = sy(ar.y), r = ar.r * kmPx; if (x + r < 0 || y + r < 0 || x - r > size.w || y - r > size.h) return null;
            var zone = !ar.terrain;
            return (
              <g key={ar.id} className={"bcwm-area" + (zone ? " zone" : "")} pointerEvents="none">
                {zone ? <circle cx={x} cy={y} r={r} className="bcwm-zonering" /> : null}
                {zone ? <circle cx={x} cy={y} r={r * 0.62} className="bcwm-zonering in" /> : null}
                {view.z > 0.9 && view.z < 6 ? <text x={x} y={zone ? y + 3 : y} className={"bcwm-arealabel" + (zone ? " zone" : "")} style={{ fontSize: Math.max(9, Math.min(15, 8 + view.z * 2)) + "px" }}>{ar.name}</text> : null}
              </g>
            );
          }) : null}
          {lay.canon ? CANON_PLACES.map(function (c) {
            if (knownKeys[baseName(c.name)] || (c.name === "Royal Capital" && knownKeys["royal capital"])) return null;
            var x = sx(c.x), y = sy(c.y); if (x < -30 || y < -30 || x > size.w + 30 || y > size.h + 30) return null;
            var on = sel === "canon:" + c.name; var big = c.kind === "castle" || c.kind === "town" || c.kind === "forest";
            if (c.kind === "forest") return null;
            return (
              <g key={c.name} transform={"translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")"} className={"bcwm-canon" + (on ? " on" : "")} onClick={function () { setSel(on ? "" : "canon:" + c.name); setProbe(null); }} role="button" tabIndex={0} aria-label={c.name + ", canon landmark"} onKeyDown={function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(on ? "" : "canon:" + c.name); setProbe(null); } }}>
                <circle r="13" className="bcwm-canonhit" />
                <path d="M0 -6 L5 0 L0 6 L-5 0 Z" className="bcwm-canonmark" />
                {(view.z > 1.5 || on || (big && view.z > 0.9)) ? <text y="18" className="bcwm-canonlabel">{c.name}</text> : null}
              </g>
            );
          }) : null}
          {trail.length > 1 ? <path d={"M" + trail.map(function (t) { return sx(t.x).toFixed(1) + " " + sy(t.y).toFixed(1); }).join("L")} className="bcwm-trail" /> : null}
          {selQ ? <line x1={meX} y1={meY} x2={sx(selQ.x)} y2={sy(selQ.y)} className="bcwm-route" /> : null}
          {home ? <g transform={"translate(" + sx(home.x) + " " + (sy(home.y) - 20) + ")"}><path d="M-6 3 L0 -4 L6 3 V8 H-6 Z" className="bcwm-home" /></g> : null}
          {places.map(pinFor)}
          <g transform={"translate(" + meX.toFixed(1) + " " + meY.toFixed(1) + ")"} className="bcwm-me" aria-label={me.approx ? "You are somewhere around here" : "You are here"}>
            {me.approx ? <circle r="22" className="bcwm-me-halo" /> : null}
            <circle r="16" className="bcwm-me-pulse" /><circle r="7" className="bcwm-me-dot" />
          </g>
          {probe ? <g transform={"translate(" + sx(probe.x).toFixed(1) + " " + sy(probe.y).toFixed(1) + ")"}><circle r="5" className="bcwm-probe" /><path d="M-9 0H-3M3 0H9M0 -9V-3M0 3V9" className="bcwm-probe-x" /></g> : null}
        </svg>
        <div className="bcwm-zoom">
          <button type="button" aria-label="Zoom in" onClick={function () { zoomBy(1.4); }}>+</button>
          <button type="button" aria-label="Zoom out" onClick={function () { zoomBy(1 / 1.4); }}>{"−"}</button>
          <button type="button" aria-label="Center on me" onClick={function () { setView({ cx: me.x, cy: me.y, z: Math.max(view.z, 2.4) }); }}>{"◎"}</button>
        </div>
        {layMenu ? (
          <div className="bcwm-laymenu" role="group" aria-label="Map layers">
            {[["realms", "Realms and borders"], ["canon", "Canon landmarks and lore areas"], ["fog", "Unexplored shading"], ["symbols", "Mountains and trees"], ["roads", "Roads"]].map(function (r) {
              return <label key={r[0]}><input type="checkbox" checked={!!lay[r[0]]} onChange={function () { var nx = Object.assign({}, lay); nx[r[0]] = !nx[r[0]]; setLay(nx); }} />{r[1]}</label>;
            })}
          </div>
        ) : null}
        <div className="bcwm-scale"><i style={{ width: Math.min(120, 20 * kmPx) + "px" }} />{(Math.min(120, 20 * kmPx) / kmPx).toFixed(0) + " km"}</div>
        {me.approx ? <div className="bcwm-approx" role="note">{"Your exact spot isn’t recorded. Tap the map where you are and choose “I’m here”."}</div> : null}
      </div>
      {selQ ? (
        <div className="bcwm-card">
          <div className="bcwm-card-head"><strong>{selQ.name}</strong><em>{selQ.status}</em></div>
          <small>{[selQ.region, selQ.kingdom].filter(Boolean).join(", ") || "Unmapped region"}</small>
          <span>{(selQ.notes || selQ.route || "") ? s(selQ.notes || selQ.route).slice(0, 160) : ""}</span>
          <span className="bcwm-card-dist">{dist < 1 ? "You are here." : "About " + dist + " km away as the crow flies" + (selQ.how === "guessed" ? " · position approximate" : selQ.how === "described" ? " · placed from its description" : "")}</span>
          <div className="bcwm-card-btns">
            {dist >= 1 && p.onTravel ? <button type="button" className="bcwm-go" onClick={function () { p.onTravel(selQ.name); setFull(false); }}>Plan travel here</button> : null}
            <button type="button" onClick={function () { setView({ cx: selQ.x, cy: selQ.y, z: Math.max(view.z, 4) }); }}>Zoom here</button>
            <button type="button" onClick={function () { setSel(""); }}>Close</button>
          </div>
        </div>
      ) : null}
      {selCanon ? (
        <div className="bcwm-card">
          <div className="bcwm-card-head"><strong>{selCanon.name}</strong><em>Canon landmark</em></div>
          <small>{describe(selCanon.x, selCanon.y).where}</small>
          <span>{selCanon.line}</span>
          <span className="bcwm-card-dist">{dist < 1 ? "You are here." : "About " + dist + " km away as the crow flies"}</span>
          <div className="bcwm-card-btns">
            {dist >= 1 && p.onTravel && selCanon.kind !== "forest" && selCanon.name !== "Seabed Temple" ? <button type="button" className="bcwm-go" onClick={function () { p.onTravel(selCanon.name); setFull(false); }}>Plan travel here</button> : null}
            <button type="button" onClick={function () { setView({ cx: selCanon.x, cy: selCanon.y, z: Math.max(view.z, 4) }); }}>Zoom here</button>
            <button type="button" onClick={function () { setSel(""); }}>Close</button>
          </div>
        </div>
      ) : null}
      {probe && !selQ && !selCanon ? (
        <div className="bcwm-card">
          <div className="bcwm-card-head"><strong>{probeInfo.biome || "Unknown ground"}</strong></div>
          <small>{probeInfo.where}</small>
          <span className="bcwm-card-dist">{"About " + Math.round(Math.hypot(probe.x - me.x, probe.y - me.y)) + " km from you"}</span>
          <div className="bcwm-card-btns">
            {curName && probeInfo.biome !== "Sea" ? <button type="button" className="bcwm-go" onClick={function () { markHere(probe); }}>{"I’m here (" + curName.slice(0, 22) + ")"}</button> : null}
            <button type="button" onClick={function () { setProbe(null); }}>Close</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
export var WORLDMAP_CSS = [
  ".bcwm{position:relative;margin-bottom:10px;border:1px solid rgba(214,174,92,.75);border-radius:9px;overflow:hidden;background:#0a1626}",
  ".bcwm-full{position:fixed;left:0;top:0;right:0;bottom:0;z-index:9000;border-radius:0;margin:0;display:flex;flex-direction:column}",
  ".bcwm-top{display:flex;align-items:center;gap:6px;padding:6px 8px;background:linear-gradient(180deg,#132036,#0a1220);border-bottom:1px solid rgba(214,174,92,.45)}",
  ".bcwm-title{flex:1;font-family:Cinzel,Georgia,serif;font-variant:small-caps;font-size:15px;color:#f3dda0;letter-spacing:.04em}",
  ".bcwm-tbtn,.bcwm-newbtn{min-height:30px;padding:3px 10px;border:1px solid rgba(214,174,92,.55);border-radius:6px;background:#0a1320;color:#e1d6c1;font-size:12.5px;font-weight:700}",
  ".bcwm-tbtn[aria-pressed=\"true\"]{border-color:#f3dda0;color:#f3dda0}",
  ".bcwm-newbtn{border-color:#b48ae8;color:#e8dbff;max-width:42%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".bcwm-box{position:relative;height:clamp(400px,64vh,680px);overflow:hidden;touch-action:none;cursor:grab;background:#0b1a2b}",
  ".bcwm-full .bcwm-box{flex:1;height:auto}",
  ".bcwm-terrain{pointer-events:none;user-select:none;image-rendering:auto;display:block;max-width:none!important;max-height:none!important;min-width:0}",
  ".bcwm-svg{position:absolute;left:0;top:0}",
  ".bcwm-loading{position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;pointer-events:none;color:#b8ad99;font:italic 14px Georgia,serif;letter-spacing:.06em}",
  ".bcwm-river{fill:none;stroke:#6fb4e8;stroke-opacity:.8;stroke-linecap:round;stroke-linejoin:round}",
  ".bcwm-road{fill:none;stroke:#e8c98a;stroke-opacity:.85;stroke-width:1.6;stroke-dasharray:6 3;stroke-linecap:round;stroke-linejoin:round}",
  ".bcwm-fen{fill:none;stroke:#2e4a35;stroke-width:1.2}",
  ".bcwm-zonering{fill:rgba(180,138,232,.07);stroke:#c4a2f5;stroke-opacity:.7;stroke-width:1.4;stroke-dasharray:3 4}.bcwm-zonering.in{fill:none;stroke-opacity:.45}",
  ".bcwm-arealabel{fill:#e9dcb8;fill-opacity:.85;font:italic 600 11px 'Cormorant Garamond',Georgia,serif;text-anchor:middle;letter-spacing:.08em;paint-order:stroke;stroke:#0a1220;stroke-width:3.5px}.bcwm-arealabel.zone{fill:#e0cffa}",
  ".bcwm-canon{cursor:pointer}.bcwm-canonhit{fill:transparent}.bcwm-canonmark{fill:#f3dda0;fill-opacity:.85;stroke:#2a1d0c;stroke-width:1}.bcwm-canon.on .bcwm-canonmark{fill:#fff3c9}",
  ".bcwm-canonlabel{fill:#f3e6c4;fill-opacity:.92;font:italic 600 11px 'Cormorant Garamond',Georgia,serif;text-anchor:middle;paint-order:stroke;stroke:#0a1220;stroke-width:3.2px}",
  ".bcwm-me-halo{fill:rgba(95,209,169,.14);stroke:#5fd1a9;stroke-opacity:.8;stroke-dasharray:4 4}",
  ".bcwm-probe{fill:rgba(243,221,160,.25);stroke:#f3dda0;stroke-width:1.5}.bcwm-probe-x{stroke:#f3dda0;stroke-width:1.5}",
  ".bcwm-laymenu{position:absolute;right:50px;top:8px;display:flex;flex-direction:column;gap:2px;padding:6px 10px;border:1px solid #f3dda0;border-radius:8px;background:rgba(9,15,26,.96);box-shadow:0 6px 18px rgba(0,0,0,.6);z-index:3}",
  ".bcwm-laymenu label{display:flex;align-items:center;gap:8px;min-height:32px;font-size:13.5px;color:#e1d6c1;white-space:nowrap}.bcwm-laymenu input{width:18px;height:18px;accent-color:#d9b463}",
  ".bcwm-approx{position:absolute;left:8px;right:52px;top:8px;padding:5px 9px;border:1px solid rgba(159,199,232,.6);border-radius:7px;background:rgba(9,15,26,.9);font-size:12px;line-height:1.3;color:#cfe3f5;pointer-events:none}",
  ".bcwm-mtn{fill:#6b5a44;stroke:#2a2015;stroke-width:1}.bcwm-tree{fill:#21492f;stroke:#0f2416;stroke-width:.8}.bcwm-hill{fill:none;stroke:#3e5a33;stroke-width:1.4}",
  ".bcwm-ring{fill:none;stroke:#f3dda0;stroke-opacity:.45;stroke-width:1.2;stroke-dasharray:5 5}",
  ".bcwm-ringlabel{fill:#f3dda0;fill-opacity:.75;font:600 10px Cinzel,Georgia,serif;text-anchor:middle;letter-spacing:.08em;paint-order:stroke;stroke:#0a1220;stroke-width:3px}",
  ".bcwm-klabel{fill:#fff3cf;font-family:Cinzel,Georgia,serif;font-weight:600;text-anchor:middle;letter-spacing:.12em;opacity:.8;paint-order:stroke;stroke:#0a1220;stroke-width:4px;font-variant:small-caps}",
  ".bcwm-sea{fill:#9fc7e8;fill-opacity:.6;font:italic 12px Georgia,serif;text-anchor:middle;letter-spacing:.2em}",
  ".bcwm-pin{cursor:pointer}.bcwm-pinbg{fill:#0a1220;fill-opacity:.85;stroke-width:1.6}",
  ".bcwm-pin.on .bcwm-pinbg{stroke-width:2.6;fill:#2b2614}",
  ".bcwm-glyph{stroke-width:.8;stroke-linejoin:round}",
  ".bcwm-halo{fill:rgba(159,199,232,.12);stroke:#9fc7e8;stroke-opacity:.6;stroke-dasharray:3 3}",
  ".bcwm-label{fill:#fff6dc;font:700 11.5px 'Cormorant Garamond',Georgia,serif;text-anchor:middle;paint-order:stroke;stroke:#0a1220;stroke-width:3.5px}",
  ".bcwm-label.on{fill:#f3dda0;font-size:13px}",
  ".bcwm-q{fill:#e8dbff;font:700 12px Georgia,serif;text-anchor:middle}",
  ".bcwm-new{fill:#e8dbff;font:800 8.5px Georgia,serif;paint-order:stroke;stroke:#3c2466;stroke-width:3px}",
  ".bcwm-me-dot{fill:#5fd1a9;stroke:#fff;stroke-width:2}",
  "@keyframes bcwmPulse{0%{r:8;opacity:.9}100%{r:22;opacity:0}}",
  ".bcwm-me-pulse{fill:none;stroke:#5fd1a9;stroke-width:2;animation:bcwmPulse 1.8s ease-out infinite}",
  ".bcwm-trail{fill:none;stroke:#5fd1a9;stroke-opacity:.7;stroke-width:2;stroke-dasharray:2 5;stroke-linecap:round}",
  ".bcwm-route{stroke:#f3dda0;stroke-width:2;stroke-dasharray:6 5}",
  ".bcwm-home{fill:#f3dda0;stroke:#2a1d0c;stroke-width:1}",
  ".bcwm-zoom{position:absolute;right:8px;top:8px;display:flex;flex-direction:column;gap:5px}",
  ".bcwm-zoom button{width:34px;height:34px;border-radius:7px;border:1px solid rgba(214,174,92,.7);background:rgba(10,18,32,.88);color:#f3dda0;font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center}",
  ".bcwm-scale{position:absolute;left:8px;bottom:8px;display:flex;align-items:center;gap:6px;font-size:11px;color:#fff6dc;text-shadow:0 1px 2px #000}",
  ".bcwm-scale i{display:block;height:5px;border:1.5px solid #fff6dc;border-top:0}",
  ".bcwm-card{position:absolute;left:8px;right:52px;bottom:8px;padding:8px 10px;border:1px solid #f3dda0;border-radius:8px;background:rgba(9,15,26,.95);box-shadow:0 6px 20px rgba(0,0,0,.6)}",
  ".bcwm-full .bcwm-card{bottom:calc(14px + env(safe-area-inset-bottom))}",
  ".bcwm-card-head{display:flex;align-items:baseline;gap:8px}",
  ".bcwm-card-head strong{font-family:Cinzel,Georgia,serif;font-size:16px;color:#f6edd7}",
  ".bcwm-card-head em{font-style:normal;font-size:11px;padding:1px 7px;border-radius:9px;border:1px solid #d9b463;color:#f3dda0;text-transform:capitalize}",
  ".bcwm-card small{display:block;font-size:12px;color:#b8ad99}",
  ".bcwm-card span{display:block;font-size:12.5px;color:#e1d6c1;line-height:1.35;margin-top:3px}",
  ".bcwm-card-dist{color:#9fe7d6!important}",
  ".bcwm-card-btns{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap}",
  ".bcwm-card-btns button{min-height:32px;padding:3px 10px;border:1px solid rgba(214,174,92,.6);border-radius:6px;background:#0a1320;color:#e1d6c1;font-weight:700;font-size:12.5px}",
  ".bcwm-card-btns .bcwm-go{background:linear-gradient(180deg,#f0d38a,#b38b3c);color:#2a1d0c;border-color:#f5e0a2}"
].join("\n");
