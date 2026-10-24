/* Black Clover cartography: a world generator in the style of the Universal
 * World Engine's map (Voronoi cells, elevation / moisture / temperature -> biome,
 * downhill rivers, kingdoms flooded outward from capitals, roads by path-finding,
 * fractal detail at any zoom). The same generation settings shape is kept
 * (width, height, kmPerUnit, cells, seaLevel, biomes, features) so the UWE map
 * can be re-ported here as it develops.
 *
 * Canon is a hard constraint: the four kingdoms sit where the gazetteer says,
 * every canon place and every place the story has pinned to a kingdom is land
 * inside that kingdom, and nothing is generated that contradicts them.
 * Pure functions, deterministic, no DOM and no AI. Coordinates are km from the
 * Royal Capital (+x east, +y north). */

export var FRAME = { X0: -330, X1: 290, Y0: -125, Y1: 330 };
export var GEN = { kmPerUnit: 0.5, spacingKm: 14, seaLevel: 0.32, seed: "black-clover-v1" };
var W = FRAME.X1 - FRAME.X0, H = FRAME.Y1 - FRAME.Y0;
export var UW = Math.round(W / GEN.kmPerUnit), UH = Math.round(H / GEN.kmPerUnit); // map units

export var KINGDOMS = [
  { k: "Clover", at: [0, 34], r: 112, label: "Clover Kingdom", capital: [0, 0] },
  { k: "Diamond", at: [145, 36], r: 104, label: "Diamond Kingdom", capital: [145, 36] },
  { k: "Heart", at: [-170, 18], r: 104, label: "Heart Kingdom", capital: [-170, 18] },
  { k: "Spade", at: [0, 212], r: 112, label: "Spade Kingdom", capital: [0, 212] }
];
export var KINGDOM_TINT = { Clover: "#6fa05a", Diamond: "#c89a5a", Heart: "#3f9e72", Spade: "#9aa6c0" };
var EXTRA_LAND = [[0, -18, 54], [-46, -14, 40], [66, 70, 44], [-88, 48, 52], [0, 112, 66], [-120, 140, 62], [104, 142, 52], [48, 58, 22], [150, -10, 34], [-190, -20, 30], [-70, 90, 40], [80, 110, 40]];
// canon places and the kingdom they belong to (km from the Royal Capital)
export var GAZ = {
  "royal capital": [0, 0], "clover castle": [0, 0], "castle town": [0, 2], "kikka": [2, 12], "nean": [-8, 26], "hecairo": [6, 28], "hage": [-2, 52],
  "rayaka": [14, 46], "saussy": [-32, 44], "sosshi": [-32, 44], "raquey": [14, -8], "raque": [14, -8], "kiten": [58, 18], "first dungeon": [62, 8],
  "witches' forest": [48, 58], "witches forest": [48, 58], "nairn": [-20, 20], "diamond kingdom": [145, 36], "heart kingdom": [-170, 18], "spade kingdom": [0, 212]
};
var GAZ_KINGDOM = { "diamond kingdom": "Diamond", "heart kingdom": "Heart", "spade kingdom": "Spade" };
/* Canon lore, generated into every map. Coordinates are the gazetteer's (km from the Royal Capital); places the
   lore names without a position are not invented here. "terrain" areas also reshape the land so it fits the lore. */
export var CANON_PLACES = [
  { name: "Royal Capital", x: 0, y: 0, kind: "castle", line: "Noble Realm: Clover Castle, Castle Town and the Magic Knights headquarters." },
  { name: "Kikka", x: 2, y: 12, kind: "town", line: "Common Realm town." },
  { name: "Nean", x: -8, y: 26, kind: "village", line: "Common Realm: the church-orphanage community." },
  { name: "Hecairo", x: 6, y: 28, kind: "town", line: "Common Realm town." },
  { name: "Nairn", x: -20, y: 20, kind: "town", line: "Common Realm town." },
  { name: "Raquey", x: 14, y: -8, kind: "water", line: "Seaside resort town. A Grand Magic Zone lies nearby and the Seabed Temple beneath the sea offshore." },
  { name: "Hage", x: -2, y: 52, kind: "village", line: "Forsaken Realm village: the church-orphanage of Father Orsi and Sister Lily, and a grimoire tower." },
  { name: "Rayaka", x: 14, y: 46, kind: "village", line: "Forsaken Realm village." },
  { name: "Saussy (Sosshi)", x: -32, y: 44, kind: "village", line: "Forsaken Realm village attacked by the Eye of the Midnight Sun early in canon." },
  { name: "Kiten", x: 58, y: 18, kind: "town", realm: "common", line: "Common Realm city near the Diamond border; site of a major Diamond attack." },
  { name: "First Dungeon", x: 62, y: 8, kind: "ruin", line: "A coastal dungeon east of Kiten." },
  { name: "Seabed Temple", x: 14, y: -31, kind: "ruin", line: "Beneath the sea off Raquey." },
  { name: "Witches' Forest", x: 48, y: 58, kind: "forest", line: "Neutral land between Clover and Diamond, ruled by the Witch Queen." }
];
export var CANON_AREAS = [
  { id: "witches", name: "Witches' Forest", x: 48, y: 58, r: 20, terrain: "forest", line: "Neutral land between Clover and Diamond." },
  { id: "gmz-raquey", name: "Grand Magic Zone", x: 28, y: -20, r: 20, line: "A zone of violent mana in the neutral lands near Raquey." },
  { id: "gmz-border", name: "Grand Magic Zone", x: 104, y: 78, r: 20, line: "Neutral land between the nations (position derived from the lore)." },
  { id: "diamond-mines", name: "Diamond mines and wasteland", x: 168, y: 46, r: 46, terrain: "badlands", line: "A harsh land of mines and wasteland." }
];
/* The Strong Magic Region: a wide band of Grand Magic Zones (violent, dense mana) in the neutral land between Clover and Spade.
   Crossing it takes very strong mana; Spade's forces cross in a mobile fortress fed by captured mana. Nobody owns it. */
export var BARRIER = { y: 150, half: 24 };
export function barrierY(x) { return BARRIER.y + 8 * Math.sin(x / 40) + 5 * Math.sin(x / 17 + 0.8); }
export function barrierStrength(x, y) { var d = Math.abs(y - barrierY(x)); return d >= BARRIER.half ? 0 : 1 - d / BARRIER.half; }
// km from the Royal Capital: the Noble Realm is the capital's heart, the Common Realm surrounds it, and the Forsaken Realm reaches out to the borders.
export var REALM_BOUNDS = { noble: 10, common: 48, forsaken: 105 };

export var BIOMES = [
  { id: "ocean", name: "Sea", color: "#2b4f6e", travel: 99, passable: false },
  { id: "coast", name: "Coast", color: "#cdbb8c", travel: 1.1, passable: true },
  { id: "snow", name: "Snowfield", color: "#e4eaee", travel: 2.6, passable: true },
  { id: "peaks", name: "Mountains", color: "#8b8378", travel: 3.2, passable: true },
  { id: "hills", name: "Hills", color: "#a39a6d", travel: 1.7, passable: true },
  { id: "fen", name: "Fen", color: "#5e7a5a", travel: 2.2, passable: true },
  { id: "badlands", name: "Wasteland", color: "#b58f5c", travel: 1.5, passable: true },
  { id: "taiga", name: "Spruce forest", color: "#476553", travel: 1.7, passable: true },
  { id: "forest", name: "Forest", color: "#3f6b3a", travel: 1.6, passable: true },
  { id: "tundra", name: "Tundra", color: "#98a392", travel: 1.5, passable: true },
  { id: "steppe", name: "Dry steppe", color: "#c2a86a", travel: 1.2, passable: true },
  { id: "grassland", name: "Grassland", color: "#7fa05a", travel: 1, passable: true }
];
var BIOME_IDX = {}; BIOMES.forEach(function (b, i) { BIOME_IDX[b.id] = i; });

/* ---------- deterministic randomness and noise ---------- */
function hash32(str) { var h = 2166136261; str = String(str); for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed) { seed = typeof seed === "string" ? hash32(seed) : seed; return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function ValueNoise(seed) {
  this.salt = hash32(seed) % 2147483647;
}
ValueNoise.prototype.lattice = function (ix, iy) { var h = ix * 374761393 + iy * 668265263 + this.salt * 1442695041 | 0; h = Math.imul(h ^ h >>> 13, 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
ValueNoise.prototype.sample = function (x, y) {
  var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  var a = this.lattice(ix, iy), b = this.lattice(ix + 1, iy), c = this.lattice(ix, iy + 1), d = this.lattice(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};
ValueNoise.prototype.fbm = function (x, y, oct) { var amp = 1, f = 1, sum = 0, nrm = 0; oct = oct || 4; for (var i = 0; i < oct; i++) { sum += amp * this.sample(x * f, y * f); nrm += amp; amp *= 0.5; f *= 2; } return sum / nrm; };

/* ---------- coordinates ---------- */
export function toU(x, y) { return [(x - FRAME.X0) / GEN.kmPerUnit, (FRAME.Y1 - y) / GEN.kmPerUnit]; }
export function toKm(u, v) { return [FRAME.X0 + u * GEN.kmPerUnit, FRAME.Y1 - v * GEN.kmPerUnit]; }

/* ---------- Voronoi (Bowyer-Watson Delaunay, circumcentres as vertices) ---------- */
function circum(P, a, b, c) {
  var ax = P[a][0], ay = P[a][1], bx = P[b][0], by = P[b][1], cx = P[c][0], cy = P[c][1];
  var d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-12) return { a: a, b: b, c: c, cx: (ax + bx + cx) / 3, cy: (ay + by + cy) / 3, r2: Infinity };
  var a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
  var ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d, uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
  return { a: a, b: b, c: c, cx: ux, cy: uy, r2: (ax - ux) * (ax - ux) + (ay - uy) * (ay - uy) };
}
function delaunay(input) {
  var P = input.slice(), minX = 1e18, minY = 1e18, maxX = -1e18, maxY = -1e18, i;
  for (i = 0; i < P.length; i++) { minX = Math.min(minX, P[i][0]); minY = Math.min(minY, P[i][1]); maxX = Math.max(maxX, P[i][0]); maxY = Math.max(maxY, P[i][1]); }
  var dm = Math.max(maxX - minX, maxY - minY) * 20, mx = (minX + maxX) / 2, my = (minY + maxY) / 2, n = P.length;
  P.push([mx - dm, my - dm], [mx, my + dm], [mx + dm, my - dm]);
  var tris = [circum(P, n, n + 1, n + 2)];
  for (i = 0; i < n; i++) {
    var px = P[i][0], py = P[i][1], bad = [], keep = [];
    for (var t = 0; t < tris.length; t++) { var T = tris[t]; ((px - T.cx) * (px - T.cx) + (py - T.cy) * (py - T.cy) < T.r2 ? bad : keep).push(T); }
    var edges = {};
    bad.forEach(function (T) { [[T.a, T.b], [T.b, T.c], [T.c, T.a]].forEach(function (e) { var k = e[0] < e[1] ? e[0] + "," + e[1] : e[1] + "," + e[0]; if (edges[k]) delete edges[k]; else edges[k] = e; }); });
    for (var k in edges) keep.push(circum(P, edges[k][0], edges[k][1], i));
    tris = keep;
  }
  return tris.filter(function (T) { return T.a < n && T.b < n && T.c < n; });
}
function neighborsOf(pts, w, h) {
  var n = pts.length, frame = [], step = Math.max(w, h) / 10, x, y;
  for (x = -step; x <= w + step; x += step) { frame.push([x, -step * 1.2]); frame.push([x, h + step * 1.2]); }
  for (y = 0; y <= h; y += step) { frame.push([-step * 1.2, y]); frame.push([w + step * 1.2, y]); }
  var tris = delaunay(pts.concat(frame)), nb = pts.map(function () { return {}; });
  tris.forEach(function (T) { [[T.a, T.b], [T.b, T.c], [T.c, T.a]].forEach(function (e) { if (e[0] < n && e[1] < n) { nb[e[0]][e[1]] = 1; nb[e[1]][e[0]] = 1; } }); });
  return nb.map(function (o) { return Object.keys(o).map(Number).sort(function (a, b) { return a - b; }); });
}

/* ---------- the land: canon-shaped elevation field (km space) ---------- */
var NOISE = { elev: new ValueNoise(GEN.seed + "|elev"), moist: new ValueNoise(GEN.seed + "|moist"), temp: new ValueNoise(GEN.seed + "|temp"), warp: new ValueNoise(GEN.seed + "|warp"), detail: new ValueNoise(GEN.seed + "|detail"), shape: new ValueNoise(GEN.seed + "|shape") };
function landField(x, y) {
  var f = 0;
  KINGDOMS.forEach(function (K) { var dx = (x - K.at[0]) / K.r, dy = (y - K.at[1]) / (K.r * 0.92); f += Math.exp(-(dx * dx + dy * dy) * 1.25); });
  EXTRA_LAND.forEach(function (e) { var dx = (x - e[0]) / e[2], dy = (y - e[1]) / e[2]; f += 0.8 * Math.exp(-(dx * dx + dy * dy) * 1.3); });
  f += (NOISE.shape.fbm(x / 40, y / 40, 4) - 0.5) * 0.6;
  // The Royal Capital is the middle of Clover, so the open sea is far to the south. The coast is reached at two bays: Raquey's (with the
  // Seabed Temple offshore and a Grand Magic Zone) and the First Dungeon's east of Kiten.
  var coast = -74 + 6 * Math.sin(x / 33) + 4 * Math.sin(x / 13 + 1.7);
  if (y < coast) f -= (coast - y) / 9;
  [[28, -38, 19, 26, 4.2], [90, -12, 19, 18, 3.4]].forEach(function (b) { var dx = (x - b[0]) / b[2], dy = (y - b[1]) / b[3]; f -= b[4] * Math.exp(-(dx * dx + dy * dy) * 1.6); });
  if (y > 300) f -= (y - 300) / 10;
  return f;
}
function ridge(x, y) { // mountain belts: Spade's northern wall, the Clover-Spade border, Diamond's mines, a spur between Clover and Diamond
  var m = Math.exp(-Math.pow((y - 292) / 24, 2)) * 0.55 * (0.6 + 0.8 * NOISE.shape.sample(x / 22, 3));
  if (y > barrierY(x) + 10) m += 0.3 + 0.35 * NOISE.shape.fbm(x / 26 + 9, y / 26, 3);
  m += Math.exp(-Math.pow((y - 132) / 8, 2)) * Math.max(0, 1 - Math.abs(x) / 120) * 0.34 * (0.4 + NOISE.shape.sample(x / 15, 9));
  m += Math.exp(-(Math.pow((x - 188) / 38, 2) + Math.pow((y - 62) / 52, 2))) * 0.5;
  m += Math.exp(-(Math.pow((x - 98) / 14, 2) + Math.pow((y - 30) / 40, 2))) * 0.22;
  m += Math.exp(-(Math.pow((x + 235) / 16, 2) + Math.pow((y - 60) / 60, 2))) * 0.22;
  return m;
}
function lakes(x, y) { return Math.exp(-(Math.pow((x + 172) / 12, 2) + Math.pow((y - 40) / 8, 2))) + Math.exp(-(Math.pow((x + 132) / 10, 2) + Math.pow((y + 6) / 9, 2))) * 0.9; }
var LAND_T = 0.34;
function elevAt(x, y) {
  var f = landField(x, y);
  if (f < LAND_T) return Math.max(0, 0.32 - (LAND_T - f) * 0.55);
  var e = GEN.seaLevel + 0.03 + Math.min(1, (f - LAND_T) / 2.6) * 0.3 + (NOISE.elev.fbm(x / 34, y / 34, 5) - 0.5) * 0.32 + ridge(x, y);
  e -= lakes(x, y) * 0.34;
  return Math.max(0, Math.min(1, e));
}
function kingdomIndexByName(k) { for (var i = 0; i < KINGDOMS.length; i++) if (KINGDOMS[i].k === k) return i; return -1; }

/* ---------- generate the cell world ---------- */
var BASE = null;
export function baseWorld() {
  if (BASE) return BASE;
  var R = rng(GEN.seed + "|points");
  var sp = GEN.spacingKm / GEN.kmPerUnit, cols = Math.round(UW / sp), rows = Math.round(UH / sp), sx = UW / cols, sy = UH / rows, pts = [];
  for (var r = 0; r < rows; r++) for (var q = 0; q < cols; q++) pts.push([Math.round(((q + 0.5) * sx + (R() * 0.76 - 0.38) * sx) * 10) / 10, Math.round(((r + 0.5) * sy + (R() * 0.76 - 0.38) * sy) * 10) / 10]);
  var nbrs = neighborsOf(pts, UW, UH);
  var cells = pts.map(function (p, i) {
    var km = toKm(p[0], p[1]), e = elevAt(km[0], km[1]);
    return { i: i, u: p[0], v: p[1], x: km[0], y: km[1], n: nbrs[i], elev: e, water: e < GEN.seaLevel, moist: 0, temp: 0, biome: 0, owner: -1, river: false, seen: true, pinned: false };
  });
  // canon places are always dry land
  var canonPins = [];
  Object.keys(GAZ).forEach(function (name) { if (name === "diamond kingdom" || name === "heart kingdom" || name === "spade kingdom") return; canonPins.push({ x: GAZ[name][0], y: GAZ[name][1], name: name, k: "Clover" }); });
  KINGDOMS.forEach(function (K) { if (K.k !== "Clover") canonPins.push({ x: K.capital[0], y: K.capital[1], name: K.k + " capital", k: K.k }); });
  CANON_AREAS.filter(function (ar) { return ar.terrain === "forest"; }).forEach(function (ar) { cells.forEach(function (c) { if (Math.hypot(c.x - ar.x, c.y - ar.y) < ar.r * 0.8 && c.water) { c.water = false; c.elev = GEN.seaLevel + 0.06; } }); });
  canonPins.forEach(function (pn) { var c = nearestCell(cells, toU(pn.x, pn.y)); if (c.water || c.elev < GEN.seaLevel + 0.03) { c.water = false; c.elev = GEN.seaLevel + 0.05; } });
  // distance from the sea, for moisture
  var hop = cells.map(function () { return 1e9; }), qd = [];
  cells.forEach(function (c) { if (c.water) { hop[c.i] = 0; qd.push(c.i); } });
  for (var qi = 0; qi < qd.length; qi++) { var cur = qd[qi]; cells[cur].n.forEach(function (nb) { if (hop[nb] > hop[cur] + 1) { hop[nb] = hop[cur] + 1; qd.push(nb); } }); }
  // rivers: greedy descent from uplands to the sea
  var rr = rng(GEN.seed + "|rivers"), rivers = [];
  var ups = cells.filter(function (c) { return !c.water && c.elev > 0.62; }).map(function (c) { return c.i; });
  for (var s = ups.length - 1; s > 0; s--) { var j = Math.floor(rr() * (s + 1)), tmp = ups[s]; ups[s] = ups[j]; ups[j] = tmp; }
  var used = {};
  ups.slice(0, 40).forEach(function (src) {
    if (rivers.length >= 9 || used[src]) return;
    var path = [src], seen = {}; seen[src] = 1; var cur = src;
    for (var step = 0; step < 70 && !cells[cur].water; step++) {
      var opts = cells[cur].n.filter(function (nb) { return !seen[nb]; }); if (!opts.length) break;
      opts.sort(function (a, b) { return cells[a].elev - cells[b].elev; });
      cur = opts[0]; seen[cur] = 1; path.push(cur);
    }
    if (path.length >= 5 && cells[path[path.length - 1]].water) { rivers.push(path); path.forEach(function (i) { used[i] = 1; cells[i].river = true; }); }
  });
  // climate and biome
  var HEARTLIKE = function (c) { return Math.hypot(c.x + 170, c.y - 18) < 110; }, DIAMONDLIKE = function (c) { return Math.hypot(c.x - 150, c.y - 40) < 95; };
  cells.forEach(function (c) {
    var m = NOISE.moist.fbm(c.x / 36, c.y / 36, 4) * 0.75 + (c.river ? 0.25 : 0) + Math.max(0, 0.3 - hop[c.i] * 0.06);
    if (HEARTLIKE(c)) m += 0.22; if (DIAMONDLIKE(c)) m -= 0.30;
    c.moist = Math.max(0, Math.min(1, m));
    var lat = (c.y - FRAME.Y0) / H;
    c.temp = Math.max(0, Math.min(1, 0.9 - lat * 0.78 - Math.max(0, c.elev - GEN.seaLevel) * 0.45 + (NOISE.temp.sample(c.x / 40, c.y / 40) - 0.5) * 0.15));
    c.biome = BIOME_IDX[pickBiome(c)];
    // Spade (north of the barrier): ice and mountains only
    if (!c.water && c.y > barrierY(c.x) + 8) { var ice = NOISE.shape.fbm(c.x / 24 + 5, c.y / 24, 3); c.biome = BIOME_IDX[c.elev > 0.93 || ice > 0.56 ? "peaks" : "snow"]; }
  });
  // canon areas reshape the ground (only land cells, and never the sea around Raquey)
  CANON_AREAS.forEach(function (ar) {
    if (!ar.terrain) return;
    cells.forEach(function (c) { if (c.water || Math.hypot(c.x - ar.x, c.y - ar.y) > ar.r) return; if (c.biome === BIOME_IDX.peaks && ar.terrain !== "snow") return; c.biome = BIOME_IDX[ar.terrain]; if (ar.terrain === "forest" || ar.terrain === "taiga") c.moist = Math.max(c.moist, 0.7); });
  });
  BASE = { cells: cells, rivers: rivers, g: sp, hop: hop };
  buildGrid(BASE);
  buildElevRaster(BASE);
  return BASE;
}
function pickBiome(c) {
  if (c.water) return "ocean";
  var e = c.elev, m = c.moist, t = c.temp, sea = GEN.seaLevel;
  if (e < sea + 0.035 && t > 0.2) return "coast";
  if (e >= 0.6 && t < 0.14) return "snow";
  if (e >= 0.86) return "peaks";
  if (e >= 0.72) return "hills";
  if (e < 0.5 && m > 0.72 && t > 0.3) return "fen";
  if (t < 0.3) return m > 0.42 ? "taiga" : "tundra";
  if (m > 0.55 && t > 0.2) return "forest";
  if (m < 0.3 && t > 0.4) { return c.x > 90 ? "badlands" : "steppe"; }
  return "grassland";
}

/* ---------- spatial lookup ---------- */
function buildGrid(B) {
  var g = B.g, gw = Math.ceil(UW / g) + 1, gh = Math.ceil(UH / g) + 1; B.gw = gw; B.gh = gh; B.gcell = new Array(gw * gh);
  for (var i = 0; i < gw * gh; i++) B.gcell[i] = [];
  B.cells.forEach(function (c) { B.gcell[Math.floor(c.v / g) * gw + Math.floor(c.u / g)].push(c.i); });
}
function nearestCell(cells, uv) { var best = cells[0], bd = 1e18; for (var i = 0; i < cells.length; i++) { var dx = cells[i].u - uv[0], dy = cells[i].v - uv[1], d = dx * dx + dy * dy; if (d < bd) { bd = d; best = cells[i]; } } return best; }
// nearest cell plus how close the runner-up is: the blend weight softens biome edges
var NEAR2 = { c1: null, c2: null, d1: 0, d2: 0 };
function nearest2(B, u, v) {
  var g = B.g, gx = Math.floor(u / g), gy = Math.floor(v / g), b1 = -1, b2 = -1, d1 = 1e18, d2 = 1e18;
  for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
    var X = gx + dx, Y = gy + dy; if (X < 0 || Y < 0 || X >= B.gw || Y >= B.gh) continue;
    var list = B.gcell[Y * B.gw + X];
    for (var k = 0; k < list.length; k++) { var c = B.cells[list[k]], ddx = c.u - u, ddy = c.v - v, d = ddx * ddx + ddy * ddy; if (d < d1) { d2 = d1; b2 = b1; d1 = d; b1 = list[k]; } else if (d < d2) { d2 = d; b2 = list[k]; } }
  }
  if (b1 < 0) { var c0 = nearestIn(B, u, v); NEAR2.c1 = c0; NEAR2.c2 = c0; NEAR2.d1 = 0; NEAR2.d2 = 1; return NEAR2; }
  NEAR2.c1 = B.cells[b1]; NEAR2.c2 = B.cells[b2 < 0 ? b1 : b2]; NEAR2.d1 = Math.sqrt(d1); NEAR2.d2 = Math.sqrt(d2); return NEAR2;
}
function nearestIn(B, u, v) {
  var g = B.g, gx = Math.floor(u / g), gy = Math.floor(v / g), best = -1, bd = 1e18;
  for (var r = 1; r <= 3 && best < 0; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
    var X = gx + dx, Y = gy + dy; if (X < 0 || Y < 0 || X >= B.gw || Y >= B.gh) continue;
    var list = B.gcell[Y * B.gw + X];
    for (var k = 0; k < list.length; k++) { var c = B.cells[list[k]], ddx = c.u - u, ddy = c.v - v, d = ddx * ddx + ddy * ddy; if (d < bd) { bd = d; best = list[k]; } }
  }
  return B.cells[best < 0 ? 0 : best];
}
// smooth elevation / water raster, one pixel per map unit, blended from nearby cells like the UWE terrain sampler
function buildElevRaster(B) {
  var rs = 2, w = Math.ceil(UW / rs) + 2, h = Math.ceil(UH / rs) + 2; B.rs = rs; B.rw = w; B.rh = h; B.elevR = new Float32Array(w * h); B.waterR = new Uint8Array(w * h);
  var g = B.g, R = g * 1.6, gx, gy;
  for (var ry = 0; ry < h; ry++) for (var rx = 0; rx < w; rx++) {
    var px = rx * rs, py = ry * rs;
    gx = Math.floor(px / g); gy = Math.floor(py / g); var sw = 0, se = 0, swat = 0;
    for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
      var X = gx + dx, Y = gy + dy; if (X < 0 || Y < 0 || X >= B.gw || Y >= B.gh) continue;
      var list = B.gcell[Y * B.gw + X];
      for (var k = 0; k < list.length; k++) { var c = B.cells[list[k]], ddx = c.u - px, ddy = c.v - py, dd = Math.sqrt(ddx * ddx + ddy * ddy); if (dd >= R) continue; var wt = Math.pow(1 - dd / R, 3); sw += wt; se += wt * c.elev; swat += wt * (c.water ? 1 : 0); }
    }
    var i = ry * w + rx; if (sw === 0) { var c0 = nearestIn(B, px, py); B.elevR[i] = c0.elev; B.waterR[i] = c0.water ? 255 : 0; } else { B.elevR[i] = se / sw; B.waterR[i] = Math.round(255 * swat / sw); }
  }
  // two box-blur passes of the elevation (not the water mask, which keeps coasts sharp)
  var tmp = new Float32Array(w * h);
  for (var pass = 0; pass < 2; pass++) {
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) { var acc = 0, cnt = 0; for (var ox = -2; ox <= 2; ox++) { var X2 = xx + ox; if (X2 < 0 || X2 >= w) continue; acc += B.elevR[yy * w + X2]; cnt++; } tmp[yy * w + xx] = acc / cnt; }
    for (xx = 0; xx < w; xx++) for (yy = 0; yy < h; yy++) { acc = 0; cnt = 0; for (var oy = -2; oy <= 2; oy++) { var Y2 = yy + oy; if (Y2 < 0 || Y2 >= h) continue; acc += tmp[Y2 * w + xx]; cnt++; } B.elevR[yy * w + xx] = acc / cnt; }
  }
}

/* ---------- politics: which kingdom owns which cell, given what the story has pinned ---------- */
function MinHeap() { this.a = []; }
MinHeap.prototype.push = function (v, k) { var a = this.a; a.push({ k: k, v: v }); var i = a.length - 1; while (i > 0) { var p = i - 1 >> 1; if (a[p].k <= a[i].k) break; var t = a[p]; a[p] = a[i]; a[i] = t; i = p; } };
MinHeap.prototype.pop = function () { var a = this.a; if (!a.length) return null; var top = a[0], last = a.pop(); if (a.length) { a[0] = last; var i = 0; for (;;) { var l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l].k < a[m].k) m = l; if (r < a.length && a[r].k < a[m].k) m = r; if (m === i) break; var t = a[m]; a[m] = a[i]; a[i] = t; i = m; } } return top; };
Object.defineProperty(MinHeap.prototype, "size", { get: function () { return this.a.length; } });

/* pins: [{x, y, k}] where k is "Clover" | "Diamond" | "Heart" | "Spade". Returns an owner array and realm helper. */
export function politics(pins) {
  var B = baseWorld(), cells = B.cells, owner = new Int8Array(cells.length).fill(-1);
  var seeds = [];
  KINGDOMS.forEach(function (K, ki) { seeds.push({ c: nearestCell(cells, toU(K.capital[0], K.capital[1])), k: ki }); });
  Object.keys(GAZ).forEach(function (name) { if (GAZ_KINGDOM[name]) return; seeds.push({ c: nearestCell(cells, toU(GAZ[name][0], GAZ[name][1])), k: 0 }); });
  (pins || []).forEach(function (pn) { var ki = kingdomIndexByName(pn.k); if (ki < 0 || !isFinite(pn.x) || !isFinite(pn.y)) return; var c = nearestCell(cells, toU(pn.x, pn.y)); if (c.water) return; seeds.push({ c: c, k: ki }); });
  var inBand = function (c) { return barrierStrength(c.x, c.y) > 0.05; };
  var cost = new Float32Array(cells.length).fill(1e18), heap = new MinHeap();
  seeds.forEach(function (sd) { if (cost[sd.c.i] > 0 || owner[sd.c.i] < 0) { cost[sd.c.i] = 0; owner[sd.c.i] = sd.k; heap.push(sd.c.i, 0); } });
  var reach = 1e9;
  while (heap.size) {
    var t = heap.pop(), cur = t.v; if (t.k > cost[cur]) continue;
    cells[cur].n.forEach(function (nb) {
      if (cells[nb].water || inBand(cells[nb])) return;
      var tc = BIOMES[cells[nb].biome].travel, riverPen = cells[nb].river && !cells[cur].river ? 2.5 : 1;
      var dx = cells[cur].x - cells[nb].x, dy = cells[cur].y - cells[nb].y, nd = t.k + Math.sqrt(dx * dx + dy * dy) * tc * riverPen;
      if (nd < cost[nb] && nd < reach) { cost[nb] = nd; owner[nb] = owner[cur]; heap.push(nb, nd); }
    });
  }
  // islands and strips the flood could not reach go to the nearest kingdom by distance
  cells.forEach(function (c) { if (c.water || owner[c.i] >= 0 || inBand(c)) return; var best = 0, bd = 1e18; KINGDOMS.forEach(function (K, ki) { var d = Math.hypot(c.x - K.at[0], c.y - K.at[1]) / K.r; if (d < bd) { bd = d; best = ki; } }); owner[c.i] = best; });
  return { owner: owner, base: B };
}
export function realmOfPoint(x, y) { var d = Math.hypot(x, y); if (Math.hypot(x - 58, y - 18) < 12) return "common"; /* Kiten is a Common Realm city */ return d <= REALM_BOUNDS.noble ? "noble" : d <= REALM_BOUNDS.common ? "common" : "forsaken"; }

/* ---------- queries ---------- */
export function cellAtKm(x, y) { var B = baseWorld(), uv = toU(x, y); return nearestIn(B, Math.max(0, Math.min(UW, uv[0])), Math.max(0, Math.min(UH, uv[1]))); }
export function ownerAtKm(P, x, y) { return P.owner[cellAtKm(x, y).i]; }
export function isLand(x, y) { var c = cellAtKm(x, y); return !c.water; }
/* a point inside a kingdom (and, in Clover, a realm band), chosen from a key so it is stable */
export function pointInKingdom(P, kname, realm, key) {
  var B = P.base, ki = kingdomIndexByName(kname), cand = B.cells.filter(function (c) {
    if (c.water || P.owner[c.i] !== ki) return false;
    if (realm) return realmOfPoint(c.x, c.y) === realm && c.biome !== BIOME_IDX.peaks;
    return true;
  });
  if (!cand.length) cand = B.cells.filter(function (c) { return !c.water && P.owner[c.i] === ki; });
  if (!cand.length) { var K = KINGDOMS[ki < 0 ? 0 : ki]; return { x: K.at[0], y: K.at[1] }; }
  var h = hash32(key), c = cand[h % cand.length], j = ((h >>> 8) % 1000) / 1000 - 0.5, k2 = ((h >>> 18) % 1000) / 1000 - 0.5;
  return { x: c.x + j * GEN.spacingKm * 0.8, y: c.y + k2 * GEN.spacingKm * 0.8 };
}

/* ---------- routes: roads between places, by path-finding over the cells ---------- */
function cellPath(cells, from, to, step) {
  var g = {}, prev = {}, open = new MinHeap(), closed = {};
  g[from] = 0; var h = function (i) { return Math.hypot(cells[i].x - cells[to].x, cells[i].y - cells[to].y) * 0.9; }; open.push(from, h(from));
  while (open.size) {
    var cur = open.pop().v;
    if (cur === to) { var path = [to], c = to; while (prev[c] !== undefined) { c = prev[c]; path.push(c); } return path.reverse(); }
    if (closed[cur]) continue; closed[cur] = 1;
    for (var k = 0; k < cells[cur].n.length; k++) { var nb = cells[cur].n[k], st = step(cur, nb); if (!isFinite(st)) continue; var ng = g[cur] + st; if (ng < (g[nb] === undefined ? 1e18 : g[nb])) { g[nb] = ng; prev[nb] = cur; open.push(nb, ng + h(nb)); } }
  }
  return null;
}
export function roadBetween(a, b) { // km points -> list of km points along passable ground
  var B = baseWorld(), cells = B.cells, ca = cellAtKm(a.x, a.y), cb = cellAtKm(b.x, b.y);
  if (ca.i === cb.i) return [[a.x, a.y], [b.x, b.y]];
  var path = cellPath(cells, ca.i, cb.i, function (i, j) { if (cells[j].water) return Infinity; var dx = cells[i].x - cells[j].x, dy = cells[i].y - cells[j].y; return Math.sqrt(dx * dx + dy * dy) * BIOMES[cells[j].biome].travel * (cells[j].river && !cells[i].river ? 1.8 : 1); });
  if (!path) return [[a.x, a.y], [b.x, b.y]];
  var pts = [[a.x, a.y]]; for (var i = 1; i < path.length - 1; i++) pts.push([cells[path[i]].x, cells[path[i]].y]); pts.push([b.x, b.y]); return pts;
}
// the roads worth drawing: a spanning tree over the places, plus each place's second-nearest neighbour when close
export function roadNetwork(places) {
  var n = places.length, edges = {}, out = [];
  if (n < 2) return out;
  var inTree = {}; inTree[0] = 1; var count = 1;
  function add(i, j) { var k = i < j ? i + "," + j : j + "," + i; if (edges[k]) return; edges[k] = 1; out.push({ a: places[i], b: places[j], pts: roadBetween(places[i], places[j]) }); }
  while (count < n) {
    var best = null;
    for (var i = 0; i < n; i++) if (inTree[i]) for (var j = 0; j < n; j++) if (!inTree[j]) { var d = Math.hypot(places[i].x - places[j].x, places[i].y - places[j].y); if (!best || d < best[2]) best = [i, j, d]; }
    if (!best) break; inTree[best[1]] = 1; count++; if (best[2] < 160) add(best[0], best[1]);
  }
  return out;
}
export function riversKm() { var B = baseWorld(); return B.rivers.map(function (path) { return path.map(function (i) { return [B.cells[i].x, B.cells[i].y]; }); }); }

/* ---------- discovery: which cells the character has seen ---------- */
export function revealCells(discs) { // discs: [{x, y, r}] in km; everything within is "seen"
  var B = baseWorld();
  B.cells.forEach(function (c) { c.seen = false; });
  discs.forEach(function (d) { B.cells.forEach(function (c) { if (!c.seen && Math.hypot(c.x - d.x, c.y - d.y) <= d.r) c.seen = true; }); });
}
export function revealAll() { baseWorld().cells.forEach(function (c) { c.seen = true; }); }

/* ---------- render a view of the terrain into an ImageData ----------
   view: { cx, cy (km at the centre), pxPerKm, w, h } in output pixels. */
function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
var BIOME_RGB = BIOMES.map(function (b) { return hex(b.color); });
var TINT_RGB = {}; Object.keys(KINGDOM_TINT).forEach(function (k) { TINT_RGB[k] = hex(KINGDOM_TINT[k]); });
export function renderTerrain(P, view, opts) {
  opts = opts || {}; var B = P.base, w = view.w, h = view.h, img = new Uint8ClampedArray(w * h * 4);
  var cid2 = new Int32Array(w * h), bw = new Float32Array(w * h), elev = new Float32Array(w * h), cid = new Int32Array(w * h), own = new Int8Array(w * h), wat = new Uint8Array(w * h);
  var pxKm = view.pxPerKm, kmPerPx = 1 / pxKm, g = B.g, warpAmp = g * 0.45;
  var scaleU = kmPerPx / GEN.kmPerUnit; // map units per output pixel
  var octaves = Math.max(1, Math.min(3, Math.round(Math.log2(g / Math.max(0.05, scaleU)))));
  var detailAmp = 0.1, sea = GEN.seaLevel;
  for (var py = 0; py < h; py++) for (var px = 0; px < w; px++) {
    var i = py * w + px, x = view.cx + (px - w / 2) * kmPerPx, y = view.cy - (py - h / 2) * kmPerPx, u = (x - FRAME.X0) / GEN.kmPerUnit, v = (FRAME.Y1 - y) / GEN.kmPerUnit;
    var outside = u < 0 || v < 0 || u > UW || v > UH;
    var uc = u < 0 ? 0 : u > UW - 1.01 ? UW - 1.01 : u, vc = v < 0 ? 0 : v > UH - 1.01 ? UH - 1.01 : v;
    var wu = uc + (NOISE.warp.fbm(uc * 0.012, vc * 0.012, 3) - 0.5) * warpAmp * 2 + (NOISE.detail.sample(uc * 0.09, vc * 0.09) - 0.5) * g * 0.3, wv = vc + (NOISE.warp.fbm(uc * 0.012 + 37.1, vc * 0.012 + 11.7, 3) - 0.5) * warpAmp * 2 + (NOISE.detail.sample(uc * 0.09 + 5.3, vc * 0.09 + 8.1) - 0.5) * g * 0.3;
    var nr = nearest2(B, wu < 0 ? 0 : wu > UW ? UW : wu, wv < 0 ? 0 : wv > UH ? UH : wv), c = nr.c1, bwt = 0;
    if (!c.water && !nr.c2.water && nr.c2.biome !== c.biome) { var gap = nr.d2 - nr.d1, soft = g * 0.2; if (gap < soft) bwt = 0.5 * (1 - gap / soft); }
    var rc = uc / B.rs, rcy = vc / B.rs, ix = Math.floor(rc), iy = Math.floor(rcy), fx = rc - ix, fy = rcy - iy, k0 = iy * B.rw + ix; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var e = B.elevR[k0] * (1 - fx) * (1 - fy) + B.elevR[k0 + 1] * fx * (1 - fy) + B.elevR[k0 + B.rw] * (1 - fx) * fy + B.elevR[k0 + B.rw + 1] * fx * fy;
    var wf = (B.waterR[k0] * (1 - fx) * (1 - fy) + B.waterR[k0 + 1] * fx * (1 - fy) + B.waterR[k0 + B.rw] * (1 - fx) * fy + B.waterR[k0 + B.rw + 1] * fx * fy) / 255;
    e += (NOISE.detail.fbm(uc * (2 / g), vc * (2 / g), octaves) - 0.5) * detailAmp;
    var wb = wf + (NOISE.warp.sample(uc * 0.03, vc * 0.03) - 0.5) * 0.25;
    var isW = c.water ? wb > 0.35 : wb > 0.62;
    if (outside) { e = 0; isW = true; }
    cid2[i] = nr.c2.i; bw[i] = bwt;
    elev[i] = e; cid[i] = c.i; own[i] = isW ? -1 : P.owner[c.i]; wat[i] = isW ? 1 : 0;
  }
  var tint = opts.realms !== false, borders = opts.borders !== false, fog = opts.fog !== false && !!opts.fogDiscs;
  var fogA = null;
  if (fog) {
    fogA = new Float32Array(w * h).fill(1);
    opts.fogDiscs.forEach(function (d) {
      var rpx = d.r * pxKm, soft = Math.max(6, rpx * 0.38), reach = rpx + soft;
      var cxp = w / 2 + (d.x - view.cx) * pxKm, cyp = h / 2 - (d.y - view.cy) * pxKm;
      var x0 = Math.max(0, Math.floor(cxp - reach)), x1 = Math.min(w - 1, Math.ceil(cxp + reach)), y0 = Math.max(0, Math.floor(cyp - reach)), y1 = Math.min(h - 1, Math.ceil(cyp + reach));
      for (var yy = y0; yy <= y1; yy++) for (var xx = x0; xx <= x1; xx++) {
        var dd = Math.sqrt((xx - cxp) * (xx - cxp) + (yy - cyp) * (yy - cyp)), wob = (NOISE.detail.sample(xx * kmPerPx * 0.35 + 3.1, yy * kmPerPx * 0.35 + 7.7) - 0.5) * soft * 1.3;
        var t = (dd + wob - rpx) / soft; t = t < 0 ? 0 : t > 1 ? 1 : t; t = t * t * (3 - 2 * t);
        var k = yy * w + xx; if (t < fogA[k]) fogA[k] = t;
      }
    });
  }
  for (py = 0; py < h; py++) for (px = 0; px < w; px++) {
    i = py * w + px; var cc = B.cells[cid[i]], p = i * 4, r, gch, b, x_ = view.cx + (px - w / 2) * kmPerPx, y_ = view.cy - (py - h / 2) * kmPerPx;
    if (wat[i]) {
      var depth = Math.max(0, Math.min(1, (sea - elev[i]) * 2.4)), ripple = (NOISE.detail.fbm((view.cx + (px - w / 2) * kmPerPx) * 1.3, (view.cy - (py - h / 2) * kmPerPx) * 1.9, 2) - 0.5) * 3.5;
      r = 43 - depth * 22 + ripple * 0.4; gch = 79 - depth * 30 + ripple * 0.7; b = 110 - depth * 32 + ripple;
      if (depth < 0.12) { r += 22; gch += 30; b += 26; }
    } else {
      var col = BIOME_RGB[cc.biome], bi = cc.biome;
      if (bw[i] > 0) { var c2 = BIOME_RGB[B.cells[cid2[i]].biome], bwi = bw[i]; col = [col[0] * (1 - bwi) + c2[0] * bwi, col[1] * (1 - bwi) + c2[1] * bwi, col[2] * (1 - bwi) + c2[2] * bwi]; }
      // thresholds follow the detailed elevation so coasts, snow lines and peaks are crisp at any zoom
      if (elev[i] < sea + 0.03 && cc.temp > 0.2) col = BIOME_RGB[BIOME_IDX.coast];
      else if (elev[i] > 0.9) col = BIOME_RGB[BIOME_IDX.peaks];
      else if (elev[i] > 0.62 && cc.temp < 0.16) col = BIOME_RGB[BIOME_IDX.snow];
      r = col[0]; gch = col[1]; b = col[2];
      var nw = i - w - 1 >= 0 ? elev[i - w - 1] : elev[i], se2 = i + w + 1 < w * h ? elev[i + w + 1] : elev[i];
      var shade = Math.max(-1, Math.min(1, (nw - se2) * (7 + 14 * Math.min(1, kmPerPx * 6)))), lift = (elev[i] - 0.5) * 44;
      var tex = (NOISE.detail.fbm(x_ * 0.9, y_ * 0.9, 3) - 0.5) * 26; r += shade * 34 + lift + tex; gch += shade * 32 + lift + tex; b += shade * 28 + lift * 0.8 + tex * 0.8;
      if (tint) { var tc = TINT_RGB[KINGDOMS[own[i]] ? KINGDOMS[own[i]].k : ""]; if (tc) { r = r * 0.84 + tc[0] * 0.16; gch = gch * 0.84 + tc[1] * 0.16; b = b * 0.84 + tc[2] * 0.16; } }
      if (borders) {
        var rt = px + 1 < w ? own[i + 1] : own[i], dn = py + 1 < h ? own[i + w] : own[i], lf = px > 0 ? own[i - 1] : own[i], up = py > 0 ? own[i - w] : own[i];
        if ((rt !== own[i] && rt >= 0) || (dn !== own[i] && dn >= 0) || (lf !== own[i] && lf >= 0) || (up !== own[i] && up >= 0)) { if (((px + py) % 9) < 6) { r = r * 0.35 + 232 * 0.65; gch = gch * 0.35 + 196 * 0.65; b = b * 0.35 + 118 * 0.65; } }
      }
    }
    // coast ink
    if (!wat[i]) {
      var rt2 = px + 1 < w ? wat[i + 1] : 0, dn2 = py + 1 < h ? wat[i + w] : 0, lf2 = px > 0 ? wat[i - 1] : 0, up2 = py > 0 ? wat[i - w] : 0;
      if (rt2 || dn2 || lf2 || up2) { r *= 0.45; gch *= 0.45; b *= 0.4; }
    }
    var bs = barrierStrength(x_, y_);
    if (bs > 0) { var sw = NOISE.detail.fbm(x_ * 0.09 + y_ * 0.03, y_ * 0.09 - x_ * 0.04, 3), a2 = Math.min(0.92, Math.sqrt(bs) * (0.55 + 0.5 * sw)); r = r * (1 - a2) + 78 * a2; gch = gch * (1 - a2) + 30 * a2; b = b * (1 - a2) + 118 * a2; }
    if (fogA) { var fa = fogA[i] * 0.42; r = r * (1 - fa) + 6 * fa; gch = gch * (1 - fa) + 9 * fa; b = b * (1 - fa) + 16 * fa; }
    img[p] = r < 0 ? 0 : r > 255 ? 255 : r; img[p + 1] = gch < 0 ? 0 : gch > 255 ? 255 : gch; img[p + 2] = b < 0 ? 0 : b > 255 ? 255 : b; img[p + 3] = 255;
  }
  return img;
}

/* terrain symbols (mountains, trees, hills) for the cells in view: [{t, x, y, s}] in km */
export function symbolsInView(P, view) {
  var B = P.base, out = [], halfW = view.w / 2 / view.pxPerKm + 10, halfH = view.h / 2 / view.pxPerKm + 10;
  B.cells.forEach(function (c) {
    if (c.water || Math.abs(c.x - view.cx) > halfW || Math.abs(c.y - view.cy) > halfH) return;
    var id = BIOMES[c.biome].id, t = id === "peaks" ? "mtn" : id === "hills" ? "hill" : id === "forest" || id === "taiga" ? "tree" : id === "fen" ? "fen" : "";
    if (!t) return;
    var R = rng(c.i * 7919 + 13), n = t === "mtn" ? 2 : t === "tree" ? 3 : 2;
    for (var k = 0; k < n; k++) out.push({ t: t, x: c.x + (R() - 0.5) * GEN.spacingKm * 0.8, y: c.y + (R() - 0.5) * GEN.spacingKm * 0.8, s: 0.8 + R() * 0.6, seen: c.seen });
  });
  return out;
}
export function kingdomLabels(P) {
  var B = P.base;
  return KINGDOMS.map(function (K, ki) {
    var sx = 0, sy = 0, n = 0; B.cells.forEach(function (c) { if (!c.water && P.owner[c.i] === ki) { sx += c.x; sy += c.y; n++; } });
    return { k: K.k, label: K.label, x: n ? sx / n : K.at[0], y: n ? sy / n : K.at[1] };
  });
}
export function biomeAt(x, y) { return BIOMES[cellAtKm(x, y).biome]; }
