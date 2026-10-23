/* Black Clover — generated interactive world map.
 * The land, seas, kingdoms and realms are painted procedurally from the
 * gazetteer anchors (km from the Royal Capital, +x east, +y north). Places
 * come from known_locations: exact coordinates when the story recorded them,
 * otherwise a position worked out from the description ("two days east of
 * Kiten", "near Hage", kingdom and realm). Purely interface: no AI calls. */

function n(v, d) { var z = Number(v); return isFinite(z) ? z : (d === undefined ? 0 : d); }
function s(v) { return v === undefined || v === null ? "" : String(v); }
function o(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
function a(v) { return Array.isArray(v) ? v : []; }
function low(v) { return s(v).toLowerCase(); }

/* ---------- world frame ---------- */
var X0 = -260, X1 = 240, Y0 = -70, Y1 = 280; // km
var W = X1 - X0, H = Y1 - Y0;
export var KINGDOMS = [
  { k: "Clover", at: [0, 28], r: 92, col: [96, 150, 82], label: "Clover Kingdom" },
  { k: "Diamond", at: [148, 40], r: 78, col: [168, 138, 94], label: "Diamond Kingdom" },
  { k: "Heart", at: [-172, 22], r: 82, col: [70, 140, 96], label: "Heart Kingdom" },
  { k: "Spade", at: [0, 205], r: 100, col: [128, 140, 158], label: "Spade Kingdom" }
];
var EXTRA_LAND = [[66, 70, 44], [-88, 48, 52], [0, 112, 66], [-110, 150, 58], [104, 142, 52], [48, 58, 22], [150, -10, 34], [-190, -20, 30]];
export var GAZ = {
  "royal capital": [0, 0], "clover castle": [0, 0], "castle town": [0, 2], "kikka": [2, 12], "nean": [-8, 26], "hecairo": [6, 28], "hage": [-2, 52],
  "rayaka": [14, 46], "saussy": [-32, 44], "sosshi": [-32, 44], "raquey": [14, -8], "raque": [14, -8], "kiten": [58, 18], "first dungeon": [62, 8],
  "witches' forest": [48, 58], "witches forest": [48, 58], "nairn": [-20, 20], "diamond kingdom": [148, 40], "heart kingdom": [-172, 22], "spade kingdom": [0, 205]
};
var REGION_RING = { noble: [3, 9], common: [14, 34], forsaken: [42, 70] };

function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(str) { var h = 2166136261; str = s(str); for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
var PERM = (function () { var R = rng(9137), p = []; for (var i = 0; i < 256; i++) p[i] = i; for (var j = 255; j > 0; j--) { var k = Math.floor(R() * (j + 1)); var t = p[j]; p[j] = p[k]; p[k] = t; } return p.concat(p); })();
function vnoise(x, y) {
  var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  function g(i, j) { return PERM[(PERM[(i & 255)] + (j & 255)) & 511] / 255; }
  var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  var a0 = g(xi, yi), b0 = g(xi + 1, yi), a1 = g(xi, yi + 1), b1 = g(xi + 1, yi + 1);
  return a0 + (b0 - a0) * u + (a1 - a0) * v + (a0 - b0 - a1 + b1) * u * v;
}
function fbm(x, y) { return vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3) * 0.17; }
function landField(x, y) {
  var f = 0;
  KINGDOMS.forEach(function (K) { var dx = (x - K.at[0]) / K.r, dy = (y - K.at[1]) / (K.r * 0.92); f += Math.exp(-(dx * dx + dy * dy) * 1.25); });
  EXTRA_LAND.forEach(function (e) { var dx = (x - e[0]) / e[2], dy = (y - e[1]) / e[2]; f += 0.8 * Math.exp(-(dx * dx + dy * dy) * 1.3); });
  f += (fbm(x / 38, y / 38) - 0.5) * 0.55;
  var coast = -12 + 7 * Math.sin(x / 33) + 5 * Math.sin(x / 13 + 1.7); // southern sea: Raquey and the First Dungeon sit on it
  if (y < coast) f -= (coast - y) / 9;
  if (y > 262) f -= (y - 262) / 10;
  return f;
}
function kingdomAt(x, y) {
  var best = null, bd = 1e9;
  KINGDOMS.forEach(function (K) { var dx = x - K.at[0], dy = (y - K.at[1]) * 1.05; var d = Math.sqrt(dx * dx + dy * dy) / K.r + (fbm(x / 46 + 7, y / 46) - 0.5) * 0.5 + (fbm(x / 14 + 3, y / 14 + 9) - 0.5) * 0.12; if (d < bd) { bd = d; best = K; } });
  return best;
}

/* ---------- painted base (rendered once, cached) ---------- */
var BASE_CACHE = null;
export function paintedBase() {
  if (BASE_CACHE) return BASE_CACHE;
  var PX = 2.2; // px per km
  var cw = Math.round(W * PX), ch = Math.round(H * PX);
  var cv = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!cv || !cv.getContext) return (BASE_CACHE = { url: "", w: cw, h: ch, deco: [] });
  cv.width = cw; cv.height = ch;
  var ctx = cv.getContext("2d"); var img = ctx.createImageData(cw, ch); var d = img.data;
  var T = 0.42;
  var field = new Float32Array(cw * ch), kidx = new Int8Array(cw * ch);
  for (var py = 0; py < ch; py++) for (var px = 0; px < cw; px++) {
    var x = X0 + px / PX, y = Y1 - py / PX, i = py * cw + px;
    field[i] = landField(x, y);
    kidx[i] = KINGDOMS.indexOf(kingdomAt(x, y));
  }
  for (py = 0; py < ch; py++) for (px = 0; px < cw; px++) {
    i = py * cw + px; x = X0 + px / PX; y = Y1 - py / PX;
    var f = field[i], r, g, b, p = i * 4;
    if (f < T) {
      var depth = Math.min(1, (T - f) * 2.2), ripple = vnoise(x / 3, y / 9) * 10;
      r = 22 - depth * 12 + ripple * 0.3; g = 52 - depth * 20 + ripple * 0.6; b = 86 - depth * 22 + ripple;
      if (f > T - 0.05) { r += 30; g += 40; b += 38; } // shallows
    } else {
      var K = KINGDOMS[kidx[i]], c = K.col, h = fbm(x / 16, y / 16), h2 = fbm(x / 6 + 3, y / 6);
      var shade = (fbm((x + 1.5) / 16, (y + 1.5) / 16) - h) * 120; // hillshade
      var elev = Math.min(1, (f - T) * 1.6);
      r = c[0] + (h - 0.5) * 50 + shade + elev * 18; g = c[1] + (h - 0.5) * 40 + shade + elev * 6; b = c[2] + (h - 0.5) * 30 + shade;
      if (K.k === "Spade") { var snow = Math.max(0, (y - 170) / 90) * 0.7 + (h2 > 0.62 ? 0.25 : 0); r += snow * 80; g += snow * 80; b += snow * 85; }
      if (K.k === "Diamond" && h2 > 0.6) { r += 26; g += 14; b -= 4; }
      if ((K.k === "Heart" || (K.k === "Clover" && Math.hypot(x - 48, y - 58) < 20)) && h2 > 0.55) { r -= 26; g -= 8; b -= 14; }
      if (f < T + 0.035) { r = r * 0.55 + 150; g = g * 0.55 + 130; b = b * 0.55 + 90; } // beach
      var right = px + 1 < cw ? kidx[i + 1] : kidx[i], down = py + 1 < ch ? kidx[i + cw] : kidx[i];
      if ((right !== kidx[i] || down !== kidx[i]) && ((px + py) % 7 < 4)) { r = 232; g = 196; b = 118; } // border, dashed
    }
    d[p] = Math.max(0, Math.min(255, r)); d[p + 1] = Math.max(0, Math.min(255, g)); d[p + 2] = Math.max(0, Math.min(255, b)); d[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // coastline ink
  ctx.fillStyle = "rgba(20,14,6,.55)";
  for (py = 1; py < ch - 1; py++) for (px = 1; px < cw - 1; px++) {
    i = py * cw + px;
    if (field[i] >= T && (field[i - 1] < T || field[i + 1] < T || field[i - cw] < T || field[i + cw] < T)) ctx.fillRect(px - 0.5, py - 0.5, 1.6, 1.6);
  }
  // vignette
  var gr = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
  gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.45)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, cw, ch);
  // decorations: mountains, forests (positions in km)
  var R = rng(77), deco = [];
  for (var t = 0; t < 900 && deco.length < 150; t++) {
    var dx0 = X0 + R() * W, dy0 = Y0 + R() * H, ff = landField(dx0, dy0);
    if (ff < T + 0.12) continue;
    var KK = kingdomAt(dx0, dy0), hh = fbm(dx0 / 6 + 3, dy0 / 6);
    var nearTown = Object.keys(GAZ).some(function (k) { var g = GAZ[k]; return Math.hypot(g[0] - dx0, g[1] - dy0) < 9; });
    if (nearTown) continue;
    if ((KK.k === "Diamond" || KK.k === "Spade") && hh > 0.56) deco.push({ t: "mtn", x: dx0, y: dy0, s: 0.8 + R() * 0.7 });
    else if ((KK.k === "Heart" || (KK.k === "Clover" && dy0 > 38)) && hh > 0.55) deco.push({ t: "tree", x: dx0, y: dy0, s: 0.7 + R() * 0.6 });
    else if (KK.k === "Clover" && hh > 0.68) deco.push({ t: "hill", x: dx0, y: dy0, s: 0.8 + R() * 0.5 });
  }
  return (BASE_CACHE = { url: cv.toDataURL("image/jpeg", 0.86), w: cw, h: ch, px: PX, deco: deco });
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
/* Every known place gets a position. `exact` = coordinates were recorded;
   otherwise it is worked out from the description and drawn as approximate. */
export function layoutPlaces(v) {
  var locs = a(v.known_locations).map(o).filter(function (l) { return s(l.name); });
  var geo = o(o(v.world_truth).geo);
  var placed = [], pending = [];
  locs.forEach(function (l) {
    var name = s(l.name), key = low(name);
    if (isFinite(Number(l.x)) && isFinite(Number(l.y)) && l.x !== "" && l.y !== "") { placed.push(mk(l, Number(l.x), Number(l.y), "recorded")); return; }
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
  pending.forEach(function (l) {
    var kk = kingdomKey(l), realm = realmOf(l), hv = hash(l.name), ang = (hv % 360) * Math.PI / 180, x, y;
    if ((kk === "Clover" || !kk) && realm) { var ring = REGION_RING[realm]; var rad = ring[0] + ((hv >> 9) % 100) / 100 * (ring[1] - ring[0]); x = Math.cos(ang) * rad; y = Math.sin(ang) * rad * 0.9 + 6; if (y < -6) y = -6 + (hv % 9); }
    else if (kk === "Witches") { x = 48 + Math.cos(ang) * 6; y = 58 + Math.sin(ang) * 6; }
    else { var K = KINGDOMS.filter(function (q) { return q.k === (kk || "Clover"); })[0]; var rr = 8 + ((hv >> 7) % 100) / 100 * (K.r * 0.45); x = K.at[0] + Math.cos(ang) * rr; y = K.at[1] + Math.sin(ang) * rr; }
    placed.push(mk(l, x, y, "guessed"));
  });
  return placed;
  function mk(l, x, y, how) { return { name: s(l.name), x: x, y: y, how: how, status: s(l.status) || "known", kingdom: s(l.kingdom), region: s(l.region), notes: s(l.notes), route: s(l.route), kind: kindOf(l) }; }
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
export function playerXY(v, places) {
  var cur = low(v.current_location), cb = baseName(v.current_location);
  var hit = places.filter(function (q) { var qb = baseName(q.name); return cur && qb && (cur.indexOf(low(q.name)) >= 0 || cur.indexOf(qb) >= 0 || cb === qb); }).sort(function (x, y) { return y.name.length - x.name.length; })[0];
  if (hit) return { x: hit.x, y: hit.y };
  var g = cb ? lookupName(cb.split(/[,—-]/)[0], []) : null; if (g) return g;
  return { x: n(v.player_x, 0), y: n(v.player_y, 0) };
}

/* ---------- component ---------- */
var KIND_GLYPH = {
  castle: "M-6 6 V-3 H-4 V-1 H-2 V-6 H2 V-1 H4 V-3 H6 V6 Z", town: "M-6 6 V-1 L-3 -4 L0 -1 V-3 L3 -6 L6 -3 V6 Z", village: "M-5 6 V0 L0 -5 L5 0 V6 Z",
  ruin: "M-6 6 V-2 H-3 V3 H-1 V-5 H2 V2 H4 V-1 H6 V6 Z", forest: "M0 -7 L5 2 H2 L5 6 H-5 L-2 2 H-5 Z", mountain: "M-7 6 L-1 -6 L3 1 L5 -2 L8 6 Z",
  water: "M-6 1 Q-3 -3 0 1 T6 1 M-6 5 Q-3 1 0 5 T6 5", fort: "M-6 6 V-5 H-3 V-2 H0 V-5 H3 V-2 H6 V6 Z"
};
var STATUS_COL = { visited: "#f3dda0", known: "#e8e2d2", rumored: "#b48ae8", approximate: "#9fc7e8" };
export function WorldMap(p) {
  var v = p.v || {}; var base = React.useMemo(paintedBase, []);
  var places = layoutPlaces(v); var me = playerXY(v, places);
  var home = (function () { var hn = low(v.home_location); return places.filter(function (q) { return hn && hn.indexOf(low(q.name)) >= 0; })[0] || null; })();
  var boxRef = React.useRef(null);
  var vs = React.useState({ cx: me.x, cy: me.y, z: 2.4 }); var view = vs[0], setView = vs[1];
  var ss = React.useState(""); var sel = ss[0], setSel = ss[1];
  var ls = React.useState(true); var layers = ls[0], setLayers = ls[1];
  var fs = React.useState(false); var full = fs[0], setFull = fs[1];
  var seenS = React.useState(null); var seen = seenS[0], setSeen = seenS[1];
  var sz = React.useState({ w: 360, h: 300 }); var size = sz[0], setSize = sz[1];
  var drag = React.useRef(null);
  React.useEffect(function () {
    function fit() { var el = boxRef.current; if (el) setSize({ w: el.clientWidth || 360, h: el.clientHeight || 300 }); }
    fit(); window.addEventListener("resize", fit); return function () { window.removeEventListener("resize", fit); };
  }, [full]);
  React.useEffect(function () {
    var st = p.api && p.api.storage; if (!st || typeof st.get !== "function") { setSeen([]); return; }
    try { var pr = st.get("bc_map_seen"); if (pr && pr.then) pr.then(function (raw) { var l = []; try { l = raw ? JSON.parse(raw) : []; } catch (e) {} setSeen(Array.isArray(l) ? l : []); }, function () { setSeen([]); }); else setSeen([]); } catch (e) { setSeen([]); }
  }, []);
  var names = places.map(function (q) { return q.name; });
  var fresh = seen ? names.filter(function (x) { return seen.indexOf(x) < 0; }) : [];
  function markSeen() { var st = p.api && p.api.storage; setSeen(names); if (st && typeof st.set === "function") { try { st.set("bc_map_seen", JSON.stringify(names)); } catch (e) {} } }
  // km -> screen px
  var kmPx = (size.w / 220) * view.z;
  function sx(x) { return size.w / 2 + (x - view.cx) * kmPx; }
  function sy(y) { return size.h / 2 - (y - view.cy) * kmPx; }
  function zoomBy(f, ax, ay) {
    setView(function (cur) {
      var z = Math.max(0.6, Math.min(14, cur.z * f)); var kp0 = (size.w / 220) * cur.z, kp1 = (size.w / 220) * z;
      if (ax === undefined) return { cx: cur.cx, cy: cur.cy, z: z };
      var wx = cur.cx + (ax - size.w / 2) / kp0, wy = cur.cy - (ay - size.h / 2) / kp0;
      return { cx: wx - (ax - size.w / 2) / kp1, cy: wy + (ay - size.h / 2) / kp1, z: z };
    });
  }
  function onDown(e) {
    var el = boxRef.current; if (!el) return;
    if (e.target && e.target.closest && e.target.closest("button,[role=button]")) return; // let pins and buttons receive their own click
    if (!drag.current) drag.current = { pts: {}, moved: 0 };
    drag.current.pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function onMove(e) {
    var dr = drag.current; if (!dr || !dr.pts[e.pointerId]) return;
    var prev = dr.pts[e.pointerId], ids = Object.keys(dr.pts);
    if (ids.length >= 2) {
      var other = dr.pts[ids[0] === String(e.pointerId) ? ids[1] : ids[0]];
      var d0 = Math.hypot(prev.x - other.x, prev.y - other.y), d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (d0 > 0) { var r = boxRef.current.getBoundingClientRect(); zoomBy(d1 / d0, (e.clientX + other.x) / 2 - r.left, (e.clientY + other.y) / 2 - r.top); }
    } else {
      var dx = e.clientX - prev.x, dy = e.clientY - prev.y; dr.moved += Math.abs(dx) + Math.abs(dy);
      setView(function (cur) { var kp = (size.w / 220) * cur.z; return { cx: cur.cx - dx / kp, cy: cur.cy + dy / kp, z: cur.z }; });
    }
    dr.pts[e.pointerId] = { x: e.clientX, y: e.clientY };
  }
  function onUp(e) { var dr = drag.current; if (!dr) return; delete dr.pts[e.pointerId]; if (!Object.keys(dr.pts).length) { setTimeout(function () { drag.current = null; }, 0); } }
  function onWheel(e) { var r = boxRef.current.getBoundingClientRect(); zoomBy(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX - r.left, e.clientY - r.top); }
  function tap(name) { setSel(sel === name ? "" : name); if (fresh.indexOf(name) >= 0) markSeen(); }
  var selQ = places.filter(function (q) { return q.name === sel; })[0];
  var dist = selQ ? Math.round(Math.hypot(selQ.x - me.x, selQ.y - me.y)) : 0;
  var trail = a(p.trail).filter(function (t) { return isFinite(t.x) && isFinite(t.y); });
  var showLabels = view.z > 1.6;
  var baseStyle = { position: "absolute", left: sx(X0) + "px", top: sy(Y1) + "px", width: (W * kmPx) + "px", height: (H * kmPx) + "px" };
  var labelSlots = [];
  function pinFor(q) {
    var x = sx(q.x), y = sy(q.y);
    var ly = 24; labelSlots.forEach(function (sl) { if (Math.abs(sl[0] - x) < 70 && Math.abs(sl[1] - (y + ly)) < 13) ly += 13; }); labelSlots.push([x, y + ly]); if (x < -40 || y < -40 || x > size.w + 40 || y > size.h + 40) return null;
    var on = sel === q.name, isNew = fresh.indexOf(q.name) >= 0, col = STATUS_COL[q.status] || STATUS_COL.known;
    return (
      <g key={q.name} transform={"translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")"} className={"bcwm-pin" + (on ? " on" : "") + (q.how === "guessed" ? " guess" : "")} onClick={function () { tap(q.name); }} role="button" tabIndex={0} aria-label={q.name + (q.how === "guessed" ? ", approximate position" : "")} onKeyDown={function (e) { if (e.key === "Enter") tap(q.name); }}>
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
  return (
    <div className={"bcwm" + (full ? " bcwm-full" : "")}>
      <div className="bcwm-top">
        <span className="bcwm-title">The Known World</span>
        {fresh.length && seen && seen.length ? <button type="button" className="bcwm-newbtn" onClick={function () { var q = places.filter(function (x) { return x.name === fresh[0]; })[0]; if (q) { setView({ cx: q.x, cy: q.y, z: Math.max(view.z, 3) }); setSel(q.name); } markSeen(); }}>{"New: " + fresh.slice(0, 2).join(", ") + (fresh.length > 2 ? "…" : "")}</button> : null}
        <button type="button" className="bcwm-tbtn" aria-pressed={layers ? "true" : "false"} onClick={function () { setLayers(!layers); }}>Realms</button>
        <button type="button" className="bcwm-tbtn" onClick={function () { setFull(!full); }}>{full ? "Close" : "Expand"}</button>
      </div>
      <div ref={boxRef} className="bcwm-box" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}>
        {base.url ? <img src={base.url} alt="" draggable={false} style={baseStyle} className="bcwm-base" /> : null}
        <svg className="bcwm-svg" width={size.w} height={size.h} aria-label="World map">
          {base.deco.map(function (d, i) {
            var x = sx(d.x), y = sy(d.y); if (x < -20 || y < -20 || x > size.w + 20 || y > size.h + 20) return null;
            var k = Math.max(0.5, Math.min(2.2, kmPx / 3)) * d.s;
            if (d.t === "mtn") return <path key={i} d={"M" + (x - 7 * k) + " " + (y + 4 * k) + " L" + x + " " + (y - 6 * k) + " L" + (x + 7 * k) + " " + (y + 4 * k) + " Z"} className="bcwm-mtn" />;
            if (d.t === "tree") return <path key={i} d={"M" + x + " " + (y - 6 * k) + " L" + (x + 4 * k) + " " + (y + 3 * k) + " L" + (x - 4 * k) + " " + (y + 3 * k) + " Z"} className="bcwm-tree" />;
            return <path key={i} d={"M" + (x - 6 * k) + " " + (y + 2 * k) + " Q" + x + " " + (y - 5 * k) + " " + (x + 6 * k) + " " + (y + 2 * k)} className="bcwm-hill" />;
          })}
          {layers ? (
            <g>
              {[["Noble Realm", 10], ["Common Realm", 38]].map(function (r) { return <circle key={r[0]} cx={sx(0)} cy={sy(0)} r={r[1] * kmPx} className="bcwm-ring" />; })}
              {view.z > 1.4 ? <text x={sx(0)} y={sy(0) - 10 * kmPx - 4} className="bcwm-ringlabel">Noble Realm</text> : null}
              {view.z > 1.1 ? <text x={sx(0)} y={sy(0) - 38 * kmPx - 4} className="bcwm-ringlabel">Common Realm</text> : null}
              {view.z > 0.9 ? <text x={sx(-30)} y={sy(0) - 62 * kmPx} className="bcwm-ringlabel">Forsaken Realm</text> : null}
              {KINGDOMS.map(function (K) { return <text key={K.k} x={sx(K.at[0])} y={sy(K.at[1] + (K.k === "Clover" ? 70 : 0))} className="bcwm-klabel" style={{ fontSize: Math.max(11, Math.min(22, 10 + view.z * 2)) + "px" }}>{K.label}</text>; })}
              <text x={sx(20)} y={sy(-34)} className="bcwm-sea">Southern Sea</text>
            </g>
          ) : null}
          {trail.length > 1 ? <path d={"M" + trail.map(function (t) { return sx(t.x).toFixed(1) + " " + sy(t.y).toFixed(1); }).join("L")} className="bcwm-trail" /> : null}
          {selQ ? <line x1={meX} y1={meY} x2={sx(selQ.x)} y2={sy(selQ.y)} className="bcwm-route" /> : null}
          {home ? <g transform={"translate(" + sx(home.x) + " " + (sy(home.y) - 20) + ")"}><path d="M-6 3 L0 -4 L6 3 V8 H-6 Z" className="bcwm-home" /></g> : null}
          {places.map(pinFor)}
          <g transform={"translate(" + meX.toFixed(1) + " " + meY.toFixed(1) + ")"} className="bcwm-me" aria-label="You are here">
            <circle r="16" className="bcwm-me-pulse" /><circle r="7" className="bcwm-me-dot" />
          </g>
        </svg>
        <div className="bcwm-zoom">
          <button type="button" aria-label="Zoom in" onClick={function () { zoomBy(1.4); }}>+</button>
          <button type="button" aria-label="Zoom out" onClick={function () { zoomBy(1 / 1.4); }}>{"−"}</button>
          <button type="button" aria-label="Center on me" onClick={function () { setView({ cx: me.x, cy: me.y, z: Math.max(view.z, 2.4) }); }}>{"◎"}</button>
        </div>
        <div className="bcwm-scale"><i style={{ width: Math.min(120, 20 * kmPx) + "px" }} />{(Math.min(120, 20 * kmPx) / kmPx).toFixed(0) + " km"}</div>
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
  ".bcwm-box{position:relative;height:300px;overflow:hidden;touch-action:none;cursor:grab;background:#0e2338}",
  ".bcwm-full .bcwm-box{flex:1;height:auto}",
  ".bcwm-base{pointer-events:none;user-select:none;image-rendering:auto;display:block;max-width:none!important;max-height:none!important;min-width:0;object-fit:fill}",
  ".bcwm-svg{position:absolute;left:0;top:0}",
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
