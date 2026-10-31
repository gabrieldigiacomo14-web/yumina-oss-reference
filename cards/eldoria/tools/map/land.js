/* ---------- the land: canon-shaped elevation field (miles) ---------- */
var NOISE = { elev: new ValueNoise(GEN.seed + "|elev"), moist: new ValueNoise(GEN.seed + "|moist"), temp: new ValueNoise(GEN.seed + "|temp"), warp: new ValueNoise(GEN.seed + "|warp"), detail: new ValueNoise(GEN.seed + "|detail"), shape: new ValueNoise(GEN.seed + "|shape") };
function blob(x, y, cx, cy, rx, ry, k) { var dx = (x - cx) / rx, dy = (y - cy) / ry; return Math.exp(-(dx * dx + dy * dy) * k); }
function landField(x, y) {
  var f = 0;
  KINGDOMS.forEach(function (K) { if (K.isles) return; f += blob(x, y, K.at[0], K.at[1], K.r, K.r * 0.92, 1.25); });
  EXTRA_LAND.forEach(function (e) { f += 0.8 * blob(x, y, e[0], e[1], e[2], e[2], 1.3); });
  f += (NOISE.shape.fbm(x / (40 * KS), y / (40 * KS), 4) - 0.5) * 0.6 + (NOISE.detail.fbm(x / 75, y / 75, 3) - 0.5) * 0.55;
  SEAS.forEach(function (s) { f -= s[4] * blob(x, y, s[0], s[1], s[2], s[3], 1.6); });
  // the open ocean at the edges of the map
  var edge = (NOISE.warp.fbm(x / 120, y / 120, 3) - 0.5) * 160;
  if (x < -1060 + edge) f -= (-1060 + edge - x) / 70; if (x > 1180 + edge) f -= (x - 1180 - edge) / 60; if (y > 920 + edge) f -= (y - 920 - edge) / 50; if (y < -830 + edge) f -= (-830 + edge - y) / 50;
  // the isles rise out of the sea after it is cut
  var isle = 0; ISLES.forEach(function (e) { isle = Math.max(isle, 1.25 * blob(x, y, e[0], e[1], e[2], e[2] * 0.85, 1.2) + (NOISE.shape.sample(x / 30, y / 30) - 0.5) * 0.25); });
  return Math.max(f, isle);
}
function ridge(x, y) { // the ranges the lore places
  var m = 0;
  // the Ironspine: a north-south granite spine, X +250..+650
  var t = Math.max(0, Math.min(1, (y - 60) / 400)), cx = 430 + 40 * t;
  m += Math.exp(-Math.pow((x - cx) / 110, 2)) * Math.exp(-Math.pow(Math.max(0, Math.abs(y - 260) - 190) / 60, 2)) * (0.55 + 0.35 * NOISE.shape.fbm(x / 60, y / 60, 3));
  // the Frostfangs: Drakmor's northern wall, Y +700..+900
  m += Math.exp(-Math.pow((y - 810) / 75, 2)) * Math.exp(-Math.pow(Math.max(0, Math.abs(x) - 330) / 90, 2)) * (0.46 + 0.3 * NOISE.shape.sample(x / 50, 3));
  // Drakmor's southern foothills, broken at Grimfrost Pass (-80, +510)
  m += Math.exp(-Math.pow((y - 515) / 38, 2)) * Math.exp(-Math.pow(Math.max(0, Math.abs(x - 20) - 300) / 70, 2)) * (1 - 0.8 * Math.exp(-Math.pow((x + 80) / 34, 2))) * 0.26;
  // the Sablecrown: low weathered range, X +180..+350, Y -50..+150
  m += blob(x, y, 265, 50, 90, 105, 1.6) * 0.2 * (0.6 + 0.8 * NOISE.shape.sample(x / 40 + 7, y / 40));
  // the Sunscar Ridge: volcanic, Sunscar's southern limit
  m += Math.exp(-Math.pow((y + 768) / 42, 2)) * Math.exp(-Math.pow(Math.max(0, Math.abs(x + 720) - 360) / 80, 2)) * 0.38;
  // Black Spire, and Sylvanor's northern highlands
  m += blob(x, y, 720, 450, 40, 40, 1) * 0.4 + blob(x, y, -650, 470, 260, 70, 1) * 0.14;
  return m;
}
var LAND_T = 0.34;
function elevAt(x, y) {
  var f = landField(x, y);
  if (f < LAND_T) return Math.max(0, 0.32 - (LAND_T - f) * 0.55);
  var e = GEN.seaLevel + 0.03 + Math.min(1, (f - LAND_T) / 2.6) * 0.3 + (NOISE.elev.fbm(x / (34 * KS), y / (34 * KS), 5) - 0.5) * 0.3 + ridge(x, y);
  return Math.max(0, Math.min(1, e));
}
function kingdomIndexByName(k) { for (var i = 0; i < KINGDOMS.length; i++) if (KINGDOMS[i].k === k) return i; return -1; }
/* which realm's character a point has (for its climate and ground), by the Atlas Index's realm boxes */
export function zoneAt(x, y) {
  var z = neutralAt(x, y); if (z) return z.id;
  var j = (NOISE.warp.fbm(x / 140 + 11, y / 140, 3) - 0.5) * 120; x += j; y += (NOISE.warp.fbm(x / 140, y / 140 + 23, 3) - 0.5) * 120;
  if (y > 430 && x > -440 && x < 450) return "Drakmor";
  if (x > 545 && y > -360 && y < 640) return "Umbral";
  if (x < -300 && y > 40) return "Sylvanor";
  if (x < -150 && y < -40 && !(x > -400 && y < -260)) return "Sunscar";
  if (y < -230 && x > -420 && x < 320) return "Velkar";
  if (x > 200 && y > -20 && x < 560) return "Stonehold";
  return "Aurelia";
}

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
    return { i: i, u: p[0], v: p[1], x: km[0], y: km[1], n: nbrs[i], elev: e, water: e < GEN.seaLevel, moist: 0, temp: 0, biome: 0, owner: -1, river: false, seen: true, zone: zoneAt(km[0], km[1]) };
  });
  // water that does not reach the open sea is filled in: the lore names no inland lakes but Lanternmere (drawn separately)
  var open = {}, oq = [];
  cells.forEach(function (c) { if (c.water && (c.u < sp * 1.5 || c.v < sp * 1.5 || c.u > UW - sp * 1.5 || c.v > UH - sp * 1.5)) { open[c.i] = 1; oq.push(c.i); } });
  for (var oi = 0; oi < oq.length; oi++) cells[oq[oi]].n.forEach(function (nb) { if (!open[nb] && cells[nb].water) { open[nb] = 1; oq.push(nb); } });
  cells.forEach(function (c) { if (c.water && !open[c.i]) { c.water = false; c.elev = GEN.seaLevel + 0.04; } });
  // every canonical place stands on dry land; ports are coastal by the sea shapes above
  CANON_PLACES.forEach(function (pn) { if (pn.kind === "wreck") return; var c = nearestCell(cells, toU(pn.x, pn.y)); if (c.water || c.elev < GEN.seaLevel + 0.03) { c.water = false; c.elev = GEN.seaLevel + 0.05; } });
  // distance from the sea, for moisture
  var hop = cells.map(function () { return 1e9; }), qd = [];
  cells.forEach(function (c) { if (c.water) { hop[c.i] = 0; qd.push(c.i); } });
  for (var qi = 0; qi < qd.length; qi++) { var cur = qd[qi]; cells[cur].n.forEach(function (nb) { if (hop[nb] > hop[cur] + 1) { hop[nb] = hop[cur] + 1; qd.push(nb); } }); }
  // rivers are the canonical ones (RIVERS); mark the cells they cross
  RIVERS.forEach(function (rv) { for (var k = 1; k < rv.pts.length; k++) { var a = rv.pts[k - 1], b = rv.pts[k], steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 15); for (var s = 0; s <= steps; s++) { var c = nearestCell(cells, toU(a[0] + (b[0] - a[0]) * s / steps, a[1] + (b[1] - a[1]) * s / steps)); if (!c.water) c.river = true; } } });
  cells.forEach(function (c) {
    var m = NOISE.moist.fbm(c.x / (36 * KS), c.y / (36 * KS), 4) * 0.75 + (c.river ? 0.25 : 0) + Math.max(0, 0.3 - hop[c.i] * 0.06);
    if (c.zone === "Sylvanor") m += 0.3; if (c.zone === "Sunscar" || c.zone === "ashen") m -= 0.4; if (c.zone === "Velkar") m += 0.1;
    c.moist = Math.max(0, Math.min(1, m));
    var lat = (c.y - FRAME.Y0) / H;
    c.temp = Math.max(0, Math.min(1, 0.95 - lat * 0.8 - Math.max(0, c.elev - GEN.seaLevel) * 0.45 + (NOISE.temp.sample(c.x / 160, c.y / 160) - 0.5) * 0.15));
    c.biome = BIOME_IDX[pickBiome(c)];
  });
  // named wilds reshape the ground (land cells only)
  CANON_AREAS.forEach(function (ar) {
    if (!ar.terrain) return;
    cells.forEach(function (c) { if (c.water || Math.hypot(c.x - ar.x, c.y - ar.y) > ar.r) return; if (c.biome === BIOME_IDX.peaks) return; c.biome = BIOME_IDX[ar.terrain]; });
  });
  // oases are green islands in the sand
  CANON_PLACES.forEach(function (pn) { if (pn.kind !== "oasis") return; var c = nearestCell(cells, toU(pn.x, pn.y)); if (!c.water) c.biome = BIOME_IDX.oasis; });
  BASE = { cells: cells, rivers: [], g: sp, hop: hop };
  buildGrid(BASE);
  buildElevRaster(BASE);
  return BASE;
}
function pickBiome(c) {
  if (c.water) return "ocean";
  var e = c.elev, m = c.moist, t = c.temp, sea = GEN.seaLevel, z = c.zone, n = NOISE.shape.fbm(c.x / 90 + 5, c.y / 90, 3);
  if (e < sea + 0.03 && t > 0.2 && z !== "Sunscar") return "coast";
  if (z === "Drakmor" || z === "howling") {
    if (e >= 0.88) return "peaks";
    if (c.y > 720 || z === "howling") return e >= 0.7 || n > 0.6 ? "snow" : "tundra";
    if (c.y > 450 && c.y < 660) return n > 0.62 ? "tundra" : "taiga";
    return "tundra";
  }
  if (z === "grimfrost") return e >= 0.75 ? "hills" : "tundra";
  if (z === "ashen") return e >= 0.75 ? "hills" : "badlands";
  if (z === "Sunscar") { if (e >= 0.8) return c.y < -700 ? "peaks" : "hills"; return n > 0.66 && c.y > -300 ? "steppe" : "desert"; }
  if (z === "Umbral") { if (e >= 0.88) return "peaks"; return n > 0.58 ? "ashwood" : "blight"; }
  if (z === "Sylvanor") { if (e >= 0.86) return "hills"; return c.y > 420 && n > 0.5 ? "taiga" : "forest"; }
  if (z === "Stonehold") { if (e >= 0.82) return "peaks"; if (e >= 0.68) return "hills"; return n > 0.55 ? "taiga" : "hills"; }
  if (z === "Velkar") return m > 0.62 ? "fen" : n > 0.55 ? "forest" : "grassland";
  // Aurelia: river valleys, wheat country, woods
  if (e >= 0.86) return "peaks";
  if (e >= 0.72) return "hills";
  if (m > 0.78 && e < 0.5) return "fen";
  return n > 0.64 ? "forest" : "grassland";
}
