// @ts-nocheck
// Eldoria continental generator. Pure functions of (x, y) in canonical MILES
// (Aurelia City = 0,0; +x east; +y north), built from the lorebook's Physical
// Geography, Roads & Trade Routes and Atlas Index entries. The 3D terrain, the
// rotating minimap and the fog-of-war world map all sample these same functions,
// so every view agrees with the coordinates the Game Master writes.
import { ATLAS, DISTRICTS } from "./data";

export var MILE = 40; // world units per mile in the 3D scene
export var BOUNDS = { minX: -1250, maxX: 1250, minY: -900, maxY: 900 };

// ------------------------------------------------------------------ noise
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function rng(seed) { return mulberry(seed | 0); }
export function hashStr(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function hash2(x, y, s) { var h = Math.imul((x | 0) ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul((y | 0) + 0x9e3779b9, 0x85ebca6b) ^ (s | 0) * 0xc2b2ae35; h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) / 4294967296; }

var perm = new Uint8Array(512);
(function () { var r = rng(1247); var p = []; for (var i = 0; i < 256; i++) p.push(i); for (var i = 255; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = p[i]; p[i] = p[j]; p[j] = t; } for (var i = 0; i < 512; i++) perm[i] = p[i & 255]; })();
var GR = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
var F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
export function noise2(xin, yin) {
  var s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s), t = (i + j) * G2;
  var x0 = xin - (i - t), y0 = yin - (j - t), i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
  var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
  var ii = i & 255, jj = j & 255, n = 0;
  var t0 = 0.5 - x0 * x0 - y0 * y0; if (t0 > 0) { var g = GR[perm[ii + perm[jj]] & 7]; t0 *= t0; n += t0 * t0 * (g[0] * x0 + g[1] * y0); }
  var t1 = 0.5 - x1 * x1 - y1 * y1; if (t1 > 0) { var g = GR[perm[ii + i1 + perm[jj + j1]] & 7]; t1 *= t1; n += t1 * t1 * (g[0] * x1 + g[1] * y1); }
  var t2 = 0.5 - x2 * x2 - y2 * y2; if (t2 > 0) { var g = GR[perm[ii + 1 + perm[jj + 1]] & 7]; t2 *= t2; n += t2 * t2 * (g[0] * x2 + g[1] * y2); }
  return 70 * n;
}
export function fbm(x, y, oct) { var a = 0, amp = 1, f = 1, norm = 0; oct = oct || 4; for (var o = 0; o < oct; o++) { a += noise2(x * f + o * 17.3, y * f - o * 9.1) * amp; norm += amp; amp *= 0.5; f *= 2.03; } return a / norm; }
function ridged(x, y, oct) { var a = 0, amp = 1, f = 1, norm = 0; for (var o = 0; o < (oct || 4); o++) { var n = 1 - Math.abs(noise2(x * f + 31 * o, y * f + 7 * o)); a += n * n * amp; norm += amp; amp *= 0.5; f *= 2.1; } return a / norm; }
export function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
export function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// ------------------------------------------------------------------ settlements
export var KIND_RADIUS = { capital: 2.6, city: 2.0, "fort-town": 1.5, town: 1.2, village: 0.75, hamlet: 0.5, fort: 0.8, tower: 0.35, monastery: 0.65, ruin: 0.5, dungeon: 0.4, stronghold: 1.6, camp: 0.45, shrine: 0.5, landmark: 1.0 };
export var WALLED = { capital: 1, city: 1, "fort-town": 1, fort: 1, stronghold: 1 };
export var PLACES = ATLAS.map(function (a) {
  var r = KIND_RADIUS[a.kind] || 1;
  if (a.id === "aurelia-city") r = 3.0;
  return Object.assign({}, a, { r: r, districts: DISTRICTS[a.id] || [] });
});
export var PLACE_BY_ID = {}; PLACES.forEach(function (p) { PLACE_BY_ID[p.id] = p; });
export var PORTS = { "port-valor": 1, "port-meridian": 1, "port-valen": 1, "ashenport": 1, "gildwater": 1, "saltmere": 1, "grayhaven-north": 1, "grayhaven-south": 1, "grayhaven-central": 1, "copper-cay": 1, "tern-rock": 1, "lanternmere": 1 };
var ISLANDS = { "port-meridian": 26, "gildwater": 18, "grayhaven-north": 15, "grayhaven-central": 16, "grayhaven-south": 15, "port-valen": 14, "saltmere": 13, "copper-cay": 11, "tern-rock": 8, "the-drowned-fleet": 4 };

// spatial bucket for places (50-mile cells)
var PCELL = 50, placeGrid = {};
PLACES.forEach(function (p) { var cx = Math.floor(p.x / PCELL), cy = Math.floor(p.y / PCELL); for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) { var k = (cx + dx) + "," + (cy + dy); (placeGrid[k] = placeGrid[k] || []).push(p); } });
export function placesNear(x, y) { return placeGrid[Math.floor(x / PCELL) + "," + Math.floor(y / PCELL)] || []; }
export function nearestPlace(x, y, filter) {
  var best = null, bd = 1e9; for (var i = 0; i < PLACES.length; i++) { var p = PLACES[i]; if (filter && !filter(p)) continue; var d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
  return best ? { place: best, dist: bd } : null;
}

// ------------------------------------------------------------------ coastline (signed distance in miles, + = land)
function capsule(px, py, ax, ay, bx, by) { var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay; var t = clamp((wx * vx + wy * vy) / (vx * vx + vy * vy), 0, 1); return { d: Math.hypot(px - (ax + vx * t), py - (ay + vy * t)), t: t }; }
function baseLand(x, y) {
  var n = fbm(x / 140, y / 140, 3) * 34 + fbm(x / 26, y / 26, 2) * 7;
  var sd = Math.min(1215 - Math.abs(x), 875 - Math.abs(y)) + n;
  // The Silver Ocean washes Sylvanor's western shore; Sunscar runs on to the map's edge.
  sd = Math.min(sd, (x + 1065) + n * 0.9 + (y < -60 ? 400 : y < 20 ? (20 - y) * 5 : 0));
  // The Grey Sea: the cold northern reach of the Silver Ocean, reaching east to Port Valor.
  var g = capsule(x, y, -1320, -10, -205, -113); sd = Math.min(sd, g.d - lerp(85, 13, g.t) + n * 0.6);
  // Sapphire Sea and the Velkaran (Southern) Ocean between Velkar, Stonehold's coast and the Umbral Reach.
  var coastY = x < 470 ? -212 : x > 540 ? -336 : lerp(-212, -336, (x - 470) / 70);
  sd = Math.min(sd, Math.max(y - coastY, -(x + 392)) + n * 0.8);
  var bay = Math.hypot(x - 880, y + 305) - 26; sd = Math.min(sd, bay + n * 0.3); // Ashenport anchorage
  sd = Math.min(sd, (y + 848) + n * 0.4); // the Southern Ocean below Sunscar's ridge
  // The Frostsea between Sylvanor's and Drakmor's coasts.
  sd = Math.min(sd, Math.max(540 - y, x + 432) + n * 0.8);
  // Lanternmere's lake.
  sd = Math.min(sd, Math.hypot(x + 138, y - 69) - 5.5 + fbm(x / 3, y / 3, 2) * 1.2);
  // Velkar's islands rise out of the sea.
  for (var id in ISLANDS) { var p = PLACE_BY_ID[id]; if (!p) continue; var ir = ISLANDS[id]; var di = Math.hypot(x - p.x, y - p.y); if (di < ir * 2.2) { var isl = ir - di + fbm(x / 9 + ir, y / 9, 3) * ir * 0.45; if (id === "the-drowned-fleet") isl = Math.min(isl, -0.5); sd = Math.max(sd, isl); } }
  return sd;
}
export function landSD(x, y) {
  var sd = baseLand(x, y);
  var ps = placesNear(x, y);
  for (var i = 0; i < ps.length; i++) { var p = ps[i]; if (p.id === "the-drowned-fleet") continue; var d = Math.hypot(x - p.x, y - p.y); var keep = (PORTS[p.id] ? p.r * 0.85 : p.r + 1.5) - d; if (keep > sd) sd = keep; }
  return sd;
}
export function isWater(x, y) { return landSD(x, y) < 0; }

// ------------------------------------------------------------------ mountains
function mountainAmp(x, y) {
  var a = 0;
  var dIron = Math.hypot((x - 455) / 235, (y - 255) / 215); a = Math.max(a, (1 - smooth(0.45, 1.05, dIron)) * 230);
  var frost = smooth(735, 815, y) * (1 - smooth(430, 560, Math.abs(x))); a = Math.max(a, frost * 300);
  var dSab = Math.hypot((x - 265) / 95, (y - 50) / 105); a = Math.max(a, (1 - smooth(0.4, 1.0, dSab)) * 85);
  var ridge = (1 - smooth(18, 50, Math.abs(y + 792))) * (1 - smooth(1180, 1250, -x)) * smooth(260, 340, -x); a = Math.max(a, ridge * 150);
  var howl = smooth(560, 700, y) * smooth(380, 520, x); a = Math.max(a, howl * 70);
  return a;
}
export function mountainFactor(x, y) { return mountainAmp(x, y) / 300; }

// ------------------------------------------------------------------ segment indexes (rivers, roads)
function SegIndex(cell) { this.cell = cell; this.grid = {}; }
SegIndex.prototype.add = function (seg) {
  var c = this.cell, minx = Math.floor((Math.min(seg.ax, seg.bx) - seg.w * 3) / c), maxx = Math.floor((Math.max(seg.ax, seg.bx) + seg.w * 3) / c);
  var miny = Math.floor((Math.min(seg.ay, seg.by) - seg.w * 3) / c), maxy = Math.floor((Math.max(seg.ay, seg.by) + seg.w * 3) / c);
  for (var gx = minx; gx <= maxx; gx++) for (var gy = miny; gy <= maxy; gy++) { var k = gx + "," + gy; (this.grid[k] = this.grid[k] || []).push(seg); }
};
SegIndex.prototype.near = function (x, y) {
  var arr = this.grid[Math.floor(x / this.cell) + "," + Math.floor(y / this.cell)]; if (!arr) return null;
  var best = null, bd = 1e9, bt = 0;
  for (var i = 0; i < arr.length; i++) { var s = arr[i]; var r = capsule(x, y, s.ax, s.ay, s.bx, s.by); var dd = r.d - s.w; if (dd < bd) { bd = dd; best = s; bt = r.t; } }
  return best ? { seg: best, d: bd + best.w, t: bt } : null;
};
SegIndex.prototype.inCell = function (x, y) { return this.grid[Math.floor(x / this.cell) + "," + Math.floor(y / this.cell)] || []; };

function P(id) { var p = PLACE_BY_ID[id]; return [p.x, p.y]; }
// Meander a straight polyline with deterministic noise so roads and rivers do not look ruled.
function meander(pts, step, amp, seed) {
  var out = [];
  for (var i = 0; i < pts.length - 1; i++) {
    var a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / step));
    var nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
    for (var k = 0; k < n; k++) { var t = k / n; var px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t; var np = nearestPlace(px, py); var calm = np ? smooth(np.place.r, np.place.r + 10, np.dist) : 1; var w = Math.sin(t * Math.PI) * amp * calm * noise2(seed + i * 3.1 + t * L / 40, seed * 0.7); out.push([px + nx * w, py + ny * w]); }
  }
  out.push(pts[pts.length - 1]); return out;
}

// ---- rivers (Physical Geography)
var RIVER_DEF = [
  { name: "The Aurel", pts: [[205, 112], P("copperhill"), [120, 84], P("millrun"), P("ashford-crossing"), [12, -0.9], [-12, -1.1], P("thornwell"), [-92, -12], [-142, -78], [-195, -116]], w0: 0.07, w1: 0.32 },
  { name: "The Silverstream", pts: [[108, -150], P("silverstream"), [86, -30], P("whitsun-ford"), [44, 21]], w0: 0.05, w1: 0.12 },
  { name: "The Greenvein", pts: [P("thornhollow"), [-610, 340], P("mossfall"), [-655, 210], P("de-angelus"), [-800, 70], [-860, 25]], w0: 0.07, w1: 0.28 },
  { name: "The Deepwater", pts: [P("stonegate"), [420, -60], [446, -205]], w0: 0.06, w1: 0.14 },
  { name: "The Frostmaw", pts: [[10, 860], P("frostfang-keep"), [60, 640], P("hearthmoot"), [-60, 580], [-250, 575], [-445, 560]], w0: 0.06, w1: 0.26 },
  { name: "The Ashen", pts: [P("black-spire"), [760, 280], P("greyhollow"), [840, -110], [878, -282]], w0: 0.06, w1: 0.22, ashen: true },
  { name: "Zahir's Vein", pts: [[-470, -770], [-500, -520], P("oasis-of-zahir"), [-430, -150], [-420, -95]], w0: 0.08, w1: 0.16, dry: true }
];
export var RIVERS = RIVER_DEF.map(function (r, i) {
  var pts = meander(r.pts, 1.5, 3.5, 40 + i * 13);
  return { name: r.name, pts: pts, w0: r.w0, w1: r.w1, dry: !!r.dry, ashen: !!r.ashen, level: null };
});
export var riverIndex = new SegIndex(4);

// ---- roads (Roads & Trade Routes) and minor tracks to every other place
var ROAD_DEF = [
  { name: "Royal Highway North", kind: "paved", ids: ["aurelia-city", "fort-ironwatch", "northgate"] },
  { name: "Royal Highway South", kind: "paved", ids: ["aurelia-city", "wheatholt", "port-valor"] },
  { name: "The Gold Road", kind: "paved", ids: ["aurelia-city", "ashford-crossing", "millrun", "stonebridge", "stonefall", "ironpeak"] },
  { name: "The Green Way", kind: "paved", ids: ["aurelia-city", "elarion", "greenhaven", "greenwhisper"] },
  { name: "The Guild Road", kind: "gravel", ids: ["aurelia-city", "whitsun-ford", "silverstream", "redmarsh"] },
  { name: "The Cold March", kind: "track", ids: ["northgate", "bleakstead", "last-hope", "grimfrost-pass", "frostfang-keep"] },
  { name: "The Ash Track", kind: "cairn", ids: ["stonefall", "cairnwatch", "last-stand", "shadowfen"] },
  { name: "The Brass Road", kind: "gravel", ids: ["sandfall", "oasis-of-zahir", "saffaron"] }
];
export var ROADS = [];
(function buildRoads() {
  var onNet = {};
  ROAD_DEF.forEach(function (r, i) { ROADS.push({ name: r.name, kind: r.kind, pts: meander(r.ids.map(P), 2.2, 2.2, 200 + i * 7), ids: r.ids }); r.ids.forEach(function (id) { onNet[id] = 1; }); });
  function waterBetween(a, b) { var L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(L / 2); for (var k = 1; k < n; k++) { var t = k / n; if (baseLand(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t) < 0.5) return true; } return false; }
  var pending = PLACES.filter(function (p) { return !onNet[p.id] && !ISLANDS[p.id] && p.kind !== "landmark"; });
  var guard = 0;
  while (pending.length && guard++ < 400) {
    var best = null, bd = 1e9, bi = -1, bt = null;
    pending.forEach(function (p, i) { PLACES.forEach(function (q) { if (!onNet[q.id] || q === p) return; var d = Math.hypot(p.x - q.x, p.y - q.y); if (d < bd) { bd = d; best = p; bi = i; bt = q; } }); });
    if (!best || bd > 260) break;
    pending.splice(bi, 1);
    if (waterBetween(best, bt)) { onNet[best.id] = 1; continue; }
    var kind = /ruin|dungeon|tower|camp|shrine/.test(best.kind) ? "trail" : "track";
    ROADS.push({ name: "Track to " + best.name.split(" / ")[0], kind: kind, pts: meander([[bt.x, bt.y], [best.x, best.y]], 2.0, Math.min(6, bd / 8), hashStr(best.id) % 1000), ids: [bt.id, best.id] });
    onNet[best.id] = 1;
  }
  // Island ferries are sea lanes, not roads; Velkar's islands are connected by boat.
})();
var ROAD_W = { paved: 0.035, gravel: 0.03, track: 0.025, trail: 0.02, cairn: 0.02 };
export var roadIndex = new SegIndex(4);
ROADS.forEach(function (r, ri) { for (var i = 0; i < r.pts.length - 1; i++) roadIndex.add({ ax: r.pts[i][0], ay: r.pts[i][1], bx: r.pts[i + 1][0], by: r.pts[i + 1][1], w: ROAD_W[r.kind] || 0.03, road: r, i: i }); });

// ------------------------------------------------------------------ height
function preHeight(x, y, sd) {
  if (sd === undefined) sd = landSD(x, y);
  if (sd < 0) return Math.max(-42, sd * 1.6) - 1.5;
  var h = 2.2 + (fbm(x / 55, y / 55, 4) * 0.5 + 0.5) * 14 + fbm(x / 9, y / 9, 3) * 3.2;
  var m = mountainAmp(x, y);
  if (m > 0) h += m * Math.pow(ridged(x / 22, y / 22, 5), 1.6) + m * 0.18;
  // regional relief
  if (y > 420 && y < 700) h += 10 * (fbm(x / 30, y / 30, 3) * 0.5 + 0.5); // Drakmor's broken uplands
  if (x < -300 && y > 100 && y < 520) h += 8 * (fbm(x / 20, y / 20, 2) * 0.5 + 0.5); // Sylvanor
  if (x < -150 && y < -50 && y > -840) h += 9 * Math.abs(noise2(x / 14, y / 30)); // dunes
  h *= smooth(0, 9, sd) * 0.85 + 0.15;
  return h + 0.6;
}
var plateauCache = {};
function plateau(p) {
  if (plateauCache[p.id] != null) return plateauCache[p.id];
  var h = preHeight(p.x, p.y); h = Math.max(PORTS[p.id] ? 2.2 : 3, Math.min(h, p.kind === "capital" || p.kind === "city" ? 70 : 110));
  if (p.realm === "Stonehold" && p.kind !== "dungeon") h = Math.max(h, 40);
  plateauCache[p.id] = h; return h;
}
function flattened(x, y) {
  var sd = landSD(x, y), h = preHeight(x, y, sd);
  var ps = placesNear(x, y);
  for (var i = 0; i < ps.length; i++) {
    var p = ps[i]; if (p.kind === "landmark") continue; var d = Math.hypot(x - p.x, y - p.y); var R = p.r * 1.05;
    if (d < R * 2.2) { var t = smooth(R, R * 2.2, d); var ph = plateau(p); if (sd < 0 && PORTS[p.id]) continue; h = lerp(ph, h, t); }
  }
  // castle hills: capitals and strongholds raise their citadel
  var hillPs = ps;
  for (var i = 0; i < hillPs.length; i++) { var p = hillPs[i]; if (p.kind !== "capital" && p.kind !== "stronghold") continue; var cy = p.y + p.r * 0.38, d = Math.hypot(x - p.x, y - cy); if (d < 0.9) h += (1 - smooth(0.35, 0.9, d)) * 16; }
  return h;
}

// river water levels: monotonic downhill along each course
(function buildRiverLevels() {
  RIVERS.forEach(function (r) {
    var lv = [], cur = 1e9, total = 0, lens = [0];
    for (var i = 1; i < r.pts.length; i++) { total += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]); lens.push(total); }
    for (var i = 0; i < r.pts.length; i++) { var g = flattened(r.pts[i][0], r.pts[i][1]); cur = Math.min(cur, g - 2.2); lv.push(Math.max(cur, 0.25)); }
    r.level = lv; r.len = lens; r.total = total;
    for (var i = 0; i < r.pts.length - 1; i++) { var t = lens[i] / total; riverIndex.add({ ax: r.pts[i][0], ay: r.pts[i][1], bx: r.pts[i + 1][0], by: r.pts[i + 1][1], w: lerp(r.w0, r.w1, t), river: r, i: i }); }
  });
})();

export function riverAt(x, y) {
  var n = riverIndex.near(x, y); if (!n) return null;
  var s = n.seg, r = s.river; var level = lerp(r.level[s.i], r.level[s.i + 1], n.t);
  return { d: n.d, w: s.w, level: level, river: r, seg: s };
}
export function roadAt(x, y) { var n = roadIndex.near(x, y); if (!n) return null; return { d: n.d, w: n.seg.w, road: n.seg.road, seg: n.seg }; }

// Final terrain height in WORLD UNITS for a point in miles.
export function heightAt(x, y) {
  var h = flattened(x, y);
  var rv = riverAt(x, y);
  if (rv && rv.d < rv.w * 3.2) { var bed = rv.level - (rv.river.dry ? 0.6 : 1.6); var t = smooth(rv.w * 0.9, rv.w * 3.2, rv.d); h = Math.min(h, lerp(bed, Math.max(h, rv.level + 0.9), t)); }
  var rd = roadAt(x, y);
  if (rd && rd.d < rd.w * 4 && h > 0.4 && !(rv && rv.d < rv.w * 1.4)) { var s2 = rd.seg; var ah = flattened(s2.ax, s2.ay), bh = flattened(s2.bx, s2.by); var cap = capsule(x, y, s2.ax, s2.ay, s2.bx, s2.by); var lh = lerp(ah, bh, cap.t); var t2 = smooth(rd.w, rd.w * 4, rd.d); if (Math.abs(lh - h) < 12) h = lerp(lerp(h, lh, 0.55), h, t2); }
  return h;
}

// ------------------------------------------------------------------ realms & biomes
export var REALM_COLORS = { "Aurelia": "#3e6aa8", "Stonehold": "#8a6d4a", "Sylvanor": "#3f8a4a", "Drakmor": "#9fb7c9", "Sunscar": "#c9963e", "Velkar": "#2f8f9a", "Umbral Reach": "#6b4a8a", "The Marches": "#8a8a7a" };
function warp(x, y) { return [x + fbm(x / 90, y / 90, 3) * 30, y + fbm(x / 90 + 50, y / 90 - 20, 3) * 30]; }
export function realmAt(x0, y0) {
  var x = x0, y = y0;
  if (landSD(x, y) < 0) {
    if (y > 520 && x < -400) return "The Frostsea";
    if (x < -380 && y > -150 && y < 100) return "The Grey Sea";
    if (y < -840 && x < -380) return "The Southern Ocean";
    if (y < -200 && x > -390) return x > 470 ? "The Sapphire Sea" : "The Sapphire Sea";
    if (x < -1150) return "The Silver Ocean";
    return "Open Sea";
  }
  var wp = warp(x, y); x = wp[0]; y = wp[1];
  if (x > -200 && x < 100 && y > 250 && y < 450) return "The Marches";
  if (x > 420 && x < 570 && y > -150 && y < 60) return "The Marches";
  if (x > 550 && y > -300 && y < 600) return "Umbral Reach";
  if (x >= 200 && x <= 700 && y >= 50 && y <= 450) return "Stonehold";
  if (x >= -1000 && x <= -300 && y >= 100 && y <= 520) return "Sylvanor";
  if (x >= -400 && x <= 420 && y >= 450) return "Drakmor";
  if (x <= -150 && y <= -50 && y >= -860) return "Sunscar";
  if (x >= -400 && x <= 320 && y <= -200) return "Velkar";
  if (x >= -250 && x <= 250 && y >= -200 && y <= 250) return "Aurelia";
  var n = nearestPlace(x0, y0, function (p) { return p.realm !== "The Marches"; }); return n ? n.place.realm : "Aurelia";
}
// Named wild regions from Physical Geography
export function wildNameAt(x0, y0) {
  var wp = warp(x0, y0), x = wp[0], y = wp[1];
  if (x > -140 && x < -40 && y > 40 && y < 160) return "the Direwood";
  if (x > 180 && x < 350 && y > -50 && y < 150) return "the Sablecrown";
  if (x > 250 && x < 650 && y > 80 && y < 450) return "the Ironspine";
  if (y > 740 && Math.abs(x) < 450) return "the Frostfangs";
  if (y > 450 && y < 650 && x > -400 && x < 400) return "the Blackpine";
  if (x > 650 && y > 250 && y < 600) return "the Ash Barrens";
  if (y > 600 && x > 420) return "the Howling Wastes";
  if (x > 1080) return "the Withered Wastes";
  if (x < -560 && x > -1000 && y > 300 && y < 520) return "the Deep Wood";
  if (x < -560 && y < -400 && y > -760) return "the Dune Sea";
  if (x > 540 && x < 620 && y < -270) return "the Shadowfen";
  if (y < -760 && y > -830) return "the Sunscar Ridge";
  return null;
}
// biome ids drive ground color, vegetation and ambient monsters
export function biomeAt(x, y, h) {
  if (h === undefined) h = heightAt(x, y);
  var realm = realmAt(x, y);
  if (h < 0.2) return "water";
  if (h > 150 || (y > 770 && h > 60)) return "snow";
  var mf = mountainAmp(x, y);
  if (mf > 60 && h > 55) return "rock";
  var wn = wildNameAt(x, y);
  if (wn === "the Direwood") return "darkforest";
  if (wn === "the Ash Barrens" || realm === "Umbral Reach") return (x > 540 && x < 620 && y < -260) ? "marsh" : "ash";
  if (wn === "the Howling Wastes" || wn === "the Withered Wastes") return "waste";
  if (realm === "Sylvanor") return wn === "the Deep Wood" ? "deepforest" : "forest";
  if (realm === "Drakmor") return y > 640 ? "tundra" : "taiga";
  if (realm === "Sunscar") return (x < -1020 && y < -560) ? "glass" : (Math.hypot(x + 480, y + 280) < 12 || Math.hypot(x + 640, y + 410) < 8) ? "oasis" : "desert";
  if (realm === "The Marches") return y > 200 ? "tundra" : "steppe";
  if (realm === "Velkar") return "coast";
  if (Math.hypot(x - 140, y + 40) < 9 || Math.hypot(x - 118, y + 95) < 5) return "marsh";
  if (realm === "Stonehold") return h > 70 ? "rock" : "highland";
  var wood = fbm(x / 22 + 40, y / 22, 3);
  if (wood > 0.28) return "forest";
  return "plains";
}
export var BIOME_COLOR = {
  water: [0.16, 0.28, 0.36], snow: [0.86, 0.89, 0.93], rock: [0.42, 0.40, 0.38], darkforest: [0.17, 0.24, 0.13], ash: [0.30, 0.28, 0.30], marsh: [0.25, 0.30, 0.18],
  waste: [0.55, 0.56, 0.58], deepforest: [0.12, 0.27, 0.12], forest: [0.22, 0.36, 0.15], tundra: [0.62, 0.64, 0.58], taiga: [0.26, 0.33, 0.23], glass: [0.70, 0.66, 0.55],
  oasis: [0.33, 0.48, 0.20], desert: [0.80, 0.66, 0.42], steppe: [0.50, 0.50, 0.32], coast: [0.42, 0.52, 0.28], highland: [0.40, 0.42, 0.28], plains: [0.38, 0.50, 0.22]
};
var ROAD_COLOR = { paved: [0.52, 0.50, 0.47], gravel: [0.58, 0.52, 0.40], track: [0.45, 0.38, 0.27], trail: [0.42, 0.36, 0.26], cairn: [0.36, 0.34, 0.33] };

// Ground color for the 3D terrain (linear-ish rgb 0..1). slope = 0 flat .. 1 cliff.
export function groundColor(x, y, h, slope, out) {
  var b = biomeAt(x, y, h); var c = BIOME_COLOR[b] || BIOME_COLOR.plains;
  var n = fbm(x * 1.7, y * 1.7, 2) * 0.5 + 0.5, n2 = noise2(x * 9, y * 9) * 0.5 + 0.5;
  var r = c[0], g = c[1], bl = c[2];
  var k = 0.82 + n * 0.3 + n2 * 0.08; r *= k; g *= k; bl *= k;
  // farm plots around Aurelian villages and towns
  if (b === "plains") {
    var np = placesNear(x, y);
    for (var i = 0; i < np.length; i++) { var p = np[i]; if (!/village|town|hamlet|city|capital/.test(p.kind)) continue; var d = Math.hypot(x - p.x, y - p.y); if (d > p.r * 1.3 && d < p.r + 6) { var cx = Math.floor((x - p.x) * 2.2 + 50), cy = Math.floor((y - p.y) * 3.1 + 50); var f = hash2(cx, cy, 7); if (f < 0.3) { r = 0.72; g = 0.62; bl = 0.30; } else if (f < 0.5) { r = 0.45; g = 0.34; bl = 0.20; } else if (f < 0.7) { r = 0.40; g = 0.56; bl = 0.20; } r *= 0.9 + n2 * 0.15; g *= 0.9 + n2 * 0.15; break; } }
  }
  // inside towns the ground is trodden earth and stone, not meadow
  var tp = insidePlace(x, y);
  if (tp && !/ruin|dungeon|landmark|shrine|tower|camp/.test(tp.kind) && b !== "snow") { var dd = Math.hypot(x - tp.x, y - tp.y) / tp.r; var t0 = smooth(1.0, 0.75, dd) * 0.85; var paved = /Aurelia|Velkar|Sunscar|Stonehold|Umbral/.test(tp.realm) && /capital|city|town|fort|stronghold/.test(tp.kind); var tc = paved ? [0.46, 0.43, 0.39] : tp.realm === "Sunscar" ? [0.72, 0.6, 0.42] : [0.42, 0.35, 0.26]; var tn = 0.85 + n2 * 0.3; r = lerp(r, tc[0] * tn, t0); g = lerp(g, tc[1] * tn, t0); bl = lerp(bl, tc[2] * tn, t0); }
  // shore sand
  if (h < 1.6 && b !== "snow" && b !== "ash" && b !== "marsh") { var t = smooth(1.6, 0.4, h); r = lerp(r, 0.76, t); g = lerp(g, 0.70, t); bl = lerp(bl, 0.52, t); }
  // cliffs
  if (slope > 0.45) { var t = smooth(0.45, 0.9, slope); var rc = b === "desert" ? [0.6, 0.45, 0.30] : b === "ash" ? [0.22, 0.2, 0.22] : [0.40, 0.38, 0.36]; r = lerp(r, rc[0], t); g = lerp(g, rc[1], t); bl = lerp(bl, rc[2], t); }
  // snowline
  var snowLine = y > 600 ? 40 : y > 400 ? 120 : 175;
  if (h > snowLine && slope < 0.75) { var t = smooth(snowLine, snowLine + 30, h); r = lerp(r, 0.9, t); g = lerp(g, 0.92, t); bl = lerp(bl, 0.95, t); }
  // roads
  var rd = roadAt(x, y);
  if (rd && rd.d < rd.w * 1.6) { var rc2 = ROAD_COLOR[rd.road.kind] || ROAD_COLOR.track; var t = smooth(rd.w * 1.6, rd.w * 0.6, rd.d); if (b === "snow" || b === "tundra") t *= 0.6; r = lerp(r, rc2[0] * (0.9 + n2 * 0.2), t); g = lerp(g, rc2[1] * (0.9 + n2 * 0.2), t); bl = lerp(bl, rc2[2] * (0.9 + n2 * 0.2), t); }
  out[0] = r; out[1] = g; out[2] = bl; return b;
}

// vegetation density 0..1 and tree style for a biome
export function vegetation(x, y, b) {
  var n = fbm(x / 6 + 11, y / 6 - 4, 3) * 0.5 + 0.5;
  switch (b) {
    case "deepforest": return { trees: 0.75 + n * 0.25, style: "giant", grass: 0.6 };
    case "forest": return { trees: 0.35 + n * 0.5, style: x < -300 ? "elven" : "oak", grass: 0.7 };
    case "darkforest": return { trees: 0.55 + n * 0.4, style: "darkoak", grass: 0.4 };
    case "taiga": return { trees: 0.4 + n * 0.5, style: "pine", grass: 0.3 };
    case "tundra": return { trees: n > 0.75 ? 0.06 : 0, style: "pine", grass: 0.15 };
    case "plains": return { trees: n > 0.62 ? 0.12 : 0.012, style: "oak", grass: 1 };
    case "highland": return { trees: n > 0.6 ? 0.18 : 0.02, style: "pine", grass: 0.6 };
    case "coast": return { trees: n > 0.6 ? 0.15 : 0.02, style: "palmish", grass: 0.6 };
    case "oasis": return { trees: 0.35, style: "palm", grass: 0.6 };
    case "desert": return { trees: n > 0.92 ? 0.02 : 0, style: "palm", grass: 0.03 };
    case "ash": return { trees: n > 0.55 ? 0.25 : 0.04, style: "dead", grass: 0.05 };
    case "marsh": return { trees: n > 0.5 ? 0.18 : 0.04, style: "willow", grass: 0.8 };
    case "steppe": return { trees: 0.01, style: "oak", grass: 0.7 };
    case "waste": return { trees: n > 0.85 ? 0.03 : 0, style: "dead", grass: 0.05 };
    case "rock": return { trees: n > 0.7 ? 0.04 : 0, style: "pine", grass: 0.1 };
    default: return { trees: 0, style: "oak", grass: 0 };
  }
}

// ------------------------------------------------------------------ place description (what the GM's location variables should say)
export function insidePlace(x, y) {
  var ps = placesNear(x, y), best = null, bd = 1e9;
  for (var i = 0; i < ps.length; i++) { var p = ps[i]; var d = Math.hypot(x - p.x, y - p.y); if (d < p.r * 1.12 && d < bd) { bd = d; best = p; } }
  return best;
}
// Districts are laid out on a ring; returns the nearest district name for a point inside a settlement.
export function districtLayout(p) {
  var subs = p.districts || []; var out = []; var r0 = rng(hashStr(p.id) + 5);
  for (var i = 0; i < subs.length; i++) {
    var name = subs[i]; var lname = name.toLowerCase(); var ang, dist;
    // gates sit on the walls, palaces/keeps to the north on the citadel hill, docks toward the water
    if (/gate/.test(lname)) { ang = /north|king|peak|frost/.test(lname) ? Math.PI / 2 : /east|anvil/.test(lname) ? 0 : /west|river/.test(lname) ? Math.PI : -Math.PI / 2; dist = 0.9; }
    else if (/palace|citadel|keep|castle|great hall|crownward|spire command|jarl/.test(lname)) { ang = Math.PI / 2; dist = 0.38; }
    else if (/quay|dock|harbor|wharf|pier|breakwater|port|warehouse|landing/.test(lname)) { ang = PORTS[p.id] || /river/.test(lname) ? -2.4 : -2.2; dist = 0.72; }
    else if (/\bnorth\b/.test(lname)) { ang = Math.PI / 2 + (r0() - 0.5) * 0.5; dist = 0.62; }
    else if (/\bsouth\b/.test(lname)) { ang = -Math.PI / 2 + (r0() - 0.5) * 0.5; dist = 0.62; }
    else if (/\beast\b/.test(lname)) { ang = (r0() - 0.5) * 0.5; dist = 0.62; }
    else if (/\bwest\b|ratsend/.test(lname)) { ang = Math.PI + (r0() - 0.5) * 0.5; dist = 0.62; }
    else { ang = (i / Math.max(1, subs.length)) * Math.PI * 2 + 0.4 + (r0() - 0.5) * 0.4; dist = 0.42 + r0() * 0.3; }
    out.push({ name: name, x: p.x + Math.cos(ang) * p.r * dist, y: p.y + Math.sin(ang) * p.r * dist, ang: ang, dist: dist });
  }
  return out;
}
var layoutCache = {};
export function districtsOf(p) { return layoutCache[p.id] || (layoutCache[p.id] = districtLayout(p)); }
export function describe(x, y) {
  var p = insidePlace(x, y);
  var region = realmAt(x, y);
  if (p) {
    var ds = districtsOf(p), best = null, bd = 1e9; for (var i = 0; i < ds.length; i++) { var d = Math.hypot(ds[i].x - x, ds[i].y - y); if (d < bd) { bd = d; best = ds[i]; } }
    var sub = best && bd < Math.min(0.5, p.r * 0.4) ? best.name : Math.hypot(x - p.x, y - p.y) < 0.35 ? (p.kind === "capital" || p.kind === "city" ? "Central Square" : "Town Square") : (p.kind === "capital" || p.kind === "city" ? "City Streets" : "Streets");
    return { location: p.name, sublocation: sub, region: p.realm || region, place: p, wild: false };
  }
  var wn = wildNameAt(x, y), np = nearestPlace(x, y);
  var b = biomeAt(x, y);
  var bname = { forest: "Woodland", deepforest: "Deep Forest", darkforest: "Dark Forest", taiga: "Pine Forest", tundra: "Tundra", plains: "Open Country", highland: "Highlands", coast: "Coast", desert: "Desert", oasis: "Oasis", ash: "Ashlands", marsh: "Marsh", steppe: "Steppe", waste: "Wastes", rock: "Mountains", snow: "Snowfields", glass: "Glass Desert", water: "Open Water" }[b] || "Wilderness";
  var rd = roadAt(x, y); var onRoad = rd && rd.d < 0.3 ? rd.road : null;
  var near = np ? np.place.name.split(" / ")[0] : "";
  var loc = onRoad && !/^Track/.test(onRoad.name) ? onRoad.name + " near " + near : (wn ? titleWild(wn) : bname) + " near " + near;
  return { location: loc, sublocation: onRoad ? "On the road" : "Wilderness", region: region, place: null, wild: true, biome: b };
}
function titleWild(s) { return s.replace(/^the /, "The "); }

// ------------------------------------------------------------------ 2D map painting
// Paints a map region into an ImageData progressively. view = {cx, cy, mpp (miles per pixel), w, h}
export function mapColor(x, y, out, style) {
  var sd = landSD(x, y);
  if (sd < 0) {
    var deep = smooth(0, 60, -sd);
    if (style === "parchment") { out[0] = lerp(118, 70, deep); out[1] = lerp(140, 92, deep); out[2] = lerp(146, 112, deep); }
    else { out[0] = lerp(46, 14, deep); out[1] = lerp(86, 38, deep); out[2] = lerp(104, 62, deep); }
    return;
  }
  var h = heightAt(x, y), b = biomeAt(x, y, h);
  var c = BIOME_COLOR[b] || BIOME_COLOR.plains;
  var hx = heightAt(x + 0.6, y) - h, hy = heightAt(x, y + 0.6) - h;
  var shade = clamp(1 + (-hx * 0.9 + hy * 0.9) * 0.05, 0.55, 1.35);
  var r = c[0] * 255, g = c[1] * 255, bl = c[2] * 255;
  if (h > 120) { var t = smooth(120, 200, h); r = lerp(r, 235, t); g = lerp(g, 235, t); bl = lerp(bl, 238, t); }
  if (style === "parchment") { r = lerp(r, 205, 0.38); g = lerp(g, 186, 0.38); bl = lerp(bl, 145, 0.38); }
  var rv = riverAt(x, y); if (rv && rv.d < Math.max(rv.w * 1.5, 0.9) && !rv.river.dry) { r = 60; g = 104; bl = 128; }
  out[0] = r * shade; out[1] = g * shade; out[2] = bl * shade;
}
export function paintMap(ctx, view, style, onDone, rowsPerSlice) {
  var w = view.w, h = view.h, img = ctx.createImageData(w, h), d = img.data, col = [0, 0, 0], y0 = 0, cancelled = false;
  rowsPerSlice = rowsPerSlice || 12;
  function slice() {
    if (cancelled) return;
    var end = Math.min(h, y0 + rowsPerSlice);
    for (var py = y0; py < end; py++) {
      var my = view.cy + (h / 2 - py) * view.mpp;
      for (var px = 0; px < w; px++) {
        var mx = view.cx + (px - w / 2) * view.mpp;
        mapColor(mx, my, col, style); var i = (py * w + px) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
    }
    y0 = end;
    if (y0 < h) setTimeout(slice, 0); else { ctx.putImageData(img, 0, 0); onDone && onDone(); }
  }
  slice();
  return function () { cancelled = true; };
}
