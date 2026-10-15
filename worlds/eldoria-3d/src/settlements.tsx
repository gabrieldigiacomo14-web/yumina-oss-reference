// @ts-nocheck
// Procedural settlements and wild props. Each settlement is laid out from its
// canonical atlas entry: kind sets the size and walls, realm sets architecture,
// and its fixed-interior districts become real landmark buildings with doors.
import { T, GeoBuilder, prim, M, hex, shadeC, bannerTex, cobbleTex, textSprite, REALM_BANNER } from "./three";
import { CLS, patchBuildings } from "./surfaces";
import { MILE, heightAt, riverAt, roadAt, rng, hashStr, districtsOf, ROADS, PLACE_BY_ID, WALLED, PORTS, landSD, hash2, meshHeight, planSpans, onDeck, deckY, roadExits, townCut, isSmallPlace } from "./worldgen";

var STYLE = {
  "Aurelia": { stone: "#7f7b74", plaster: "#c4b9a2", timber: "#4a3626", roof: "#4b5868", roof2: "#6e4a3a", trim: "#c8b27a", roofKind: "gable", accent: "#1d3360", wallStone: "#77746e" },
  "Stonehold": { stone: "#6f665d", plaster: "#867a6c", timber: "#3a2c20", roof: "#4a3e36", roof2: "#5a4a3e", trim: "#c08a3a", roofKind: "flat", accent: "#4a2e1a", wallStone: "#5c554e" },
  "Sylvanor": { stone: "#9a8f74", plaster: "#c8bc94", timber: "#5a4428", roof: "#3c6a3c", roof2: "#4a7a40", trim: "#d8c890", roofKind: "round", accent: "#1f4a2a", wallStone: "#7a7058" },
  "Drakmor": { stone: "#7d7f82", plaster: "#6a5a48", timber: "#4a3a2a", roof: "#dfe4e8", roof2: "#8a7a5a", trim: "#a8b4be", roofKind: "steep", accent: "#5a6878", wallStone: "#6e7074" },
  "Sunscar": { stone: "#d6b98c", plaster: "#e4cfa6", timber: "#8a6a44", roof: "#d8c39a", roof2: "#2f7a92", trim: "#e0b040", roofKind: "dome", accent: "#8a3a1a", wallStone: "#c8a878" },
  "Velkar": { stone: "#a89c8a", plaster: "#e6dcc4", timber: "#5a4430", roof: "#a6492f", roof2: "#b86a3a", trim: "#e8d8a0", roofKind: "gable", accent: "#14505a", wallStone: "#8e8676", pastel: ["#e6dcc4", "#d8b8a0", "#b8c8c0", "#e0c890", "#c8a8a8"] },
  "Umbral Reach": { stone: "#3e383c", plaster: "#4c444a", timber: "#241e22", roof: "#221e26", roof2: "#2e2236", trim: "#8a6aa8", roofKind: "spire", accent: "#2a1838", wallStone: "#38323a" },
  "The Marches": { stone: "#6e6a62", plaster: "#7a6a52", timber: "#4a3a28", roof: "#5a4a36", roof2: "#6a5a40", trim: "#9a8a6a", roofKind: "gable", accent: "#3a3a32", wallStone: "#605c56" }
};
export function styleOf(p) { return STYLE[p.realm] || STYLE.Aurelia; }

// every palette color names a material: stone, plaster, timber or roof tiles (Drakmor's pale roofs are snow-laden: plaster-smooth)
var MATOF = { "#3a2618": CLS.wood, "#5a4630": CLS.wood, "#4a3424": CLS.wood, "#6a4c30": CLS.wood, "#5a4030": CLS.wood, "#6e5038": CLS.wood, "#7a5a3a": CLS.wood };
(function () { var order = [["roof", CLS.roof], ["roof2", CLS.roof], ["timber", CLS.wood], ["plaster", CLS.plaster], ["stone", CLS.stone], ["wallStone", CLS.stone]];
  for (var k in STYLE) { var st = STYLE[k]; order.forEach(function (o) { MATOF[st[o[0]].toLowerCase()] = o[1]; }); (st.pastel || []).forEach(function (h) { MATOF[h.toLowerCase()] = CLS.plaster; }); }
  MATOF[STYLE.Drakmor.roof] = CLS.plaster; })();
function C(h, j) { var c = hex(h); c.push(j == null ? 0.12 : j); c.push(MATOF[String(h).toLowerCase()] || 0); return c; }

// ------------------------------------------------------------------ building primitives (all write into a GeoBuilder)
function house(B, W, x, y, z, rot, w, d, h, st, r) {
  var wallC = st.pastel ? C(st.pastel[Math.floor(r() * st.pastel.length)]) : C(r() < 0.3 ? st.stone : st.plaster);
  B.add(prim("boxb"), M(x, y - 0.6, z, 0, rot, 0, w, h + 0.6, d), wallC, true);
  // ground floor stone base for timbered towns
  if (st.roofKind === "gable" || st.roofKind === "steep") B.add(prim("boxb"), M(x, y - 0.6, z, 0, rot, 0, w + 0.08, 1.4, d + 0.08), C(st.stone), true);
  var cs = Math.cos(rot), sn = Math.sin(rot);
  function local(lx, lz) { return [x + lx * cs + lz * sn, z - lx * sn + lz * cs]; }
  // half-timber framing on the long faces
  if (st === STYLE.Aurelia || st === STYLE["The Marches"]) {
    for (var s = -1; s <= 1; s += 2) { var fz = s * (d / 2 + 0.03); [[-w / 2 + 0.1, 0], [w / 2 - 0.1, 0], [0, 0]].forEach(function (q) { var p = local(q[0], fz); B.add(prim("boxb"), M(p[0], y + 1.2, p[1], 0, rot, 0, 0.18, h - 1.2, 0.08), C(st.timber, 0.05)); }); var pm = local(0, fz); B.add(prim("boxb"), M(pm[0], y + h * 0.55, pm[1], 0, rot, 0, w, 0.16, 0.08), C(st.timber, 0.05)); }
  }
  // door + windows (windows go to the emissive builder W so they glow at night)
  var dp = local(0, d / 2 + 0.05); B.add(prim("boxb"), M(dp[0], y, dp[1], 0, rot, 0, 0.9, 1.7, 0.1), C("#3a2618", 0.05));
  var floors = Math.max(1, Math.floor(h / 2.6));
  for (var f = 0; f < floors; f++) for (var k = -1; k <= 1; k += 2) { if (r() < 0.25) continue; var wp = local(k * w * 0.28, d / 2 + 0.06); W.add(prim("boxb"), M(wp[0], y + 1.6 + f * 2.5 + (f === 0 ? 0.3 : 0), wp[1], 0, rot, 0, 0.55, 0.75, 0.06), [1, 1, 1]); }
  roof(B, x, y + h, z, rot, w, d, st, r);
  if (r() < 0.45 && st.roofKind !== "dome") { var cp = local(w * 0.3, -d * 0.2); B.add(prim("boxb"), M(cp[0], y + h, cp[1], 0, rot, 0, 0.6, h * 0.35 + 1.6, 0.6), C(st.stone)); }
}
function roof(B, x, y, z, rot, w, d, st, r, kindOverride) {
  var kind = kindOverride || st.roofKind; var rc = C(r() < 0.75 ? st.roof : st.roof2, 0.1);
  if (kind === "flat") { B.add(prim("boxb"), M(x, y, z, 0, rot, 0, w + 0.3, 0.35, d + 0.3), C(st.stone)); for (var i = -1; i <= 1; i += 2) B.add(prim("boxb"), M(x, y + 0.35, z, 0, rot, 0, w + 0.3, 0.45, 0.3), C(st.trim, 0.05)); }
  else if (kind === "dome") { B.add(prim("boxb"), M(x, y, z, 0, rot, 0, w + 0.2, 0.3, d + 0.2), C(st.stone)); if (r() < 0.5) B.add(prim("dome"), M(x, y + 0.3, z, 0, 0, 0, Math.min(w, d) * 0.85, Math.min(w, d) * 0.7, Math.min(w, d) * 0.85), C(r() < 0.3 ? st.roof2 : st.roof)); }
  else if (kind === "round") { B.add(prim("cone8"), M(x, y, z, 0, rot, 0, Math.max(w, d) * 1.25, Math.max(w, d) * 0.55, Math.max(w, d) * 1.25), rc, true); }
  else if (kind === "spire") { B.add(prim("roof"), M(x, y, z, 0, rot, 0, w + 0.5, w * 1.1, d + 0.4), rc, true); }
  else { var steep = kind === "steep" ? 0.95 : 0.62; B.add(prim("roof"), M(x, y - 0.05, z, 0, rot + Math.PI / 2, 0, d + 0.7, w * steep + 0.4, w + 0.5), rc, true); }
}
function tower(B, x, y, z, r0, h, st, spire, rng0) {
  B.add(prim("cyl16"), M(x, y - 1, z, 0, 0, 0, r0 * 2, h + 1, r0 * 2), C(st.wallStone, 0.08), true);
  for (var i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2; B.add(prim("boxb"), M(x + Math.cos(a) * r0 * 1.02, y + h, z + Math.sin(a) * r0 * 1.02, 0, -a, 0, 0.6, 0.8, 0.6), C(st.wallStone)); }
  B.add(prim("cyl16"), M(x, y + h - 0.3, z, 0, 0, 0, r0 * 2.15, 0.4, r0 * 2.15), C(st.stone));
  if (spire) { var sh = spire === true ? r0 * 3.2 : spire; B.add(prim("cone8"), M(x, y + h + 0.4, z, 0, 0, 0, r0 * 2.3, sh, r0 * 2.3), C(st.roof, 0.05), true); B.add(prim("cyl"), M(x, y + h + 0.4 + sh, z, 0, 0, 0, 0.12, 1.6, 0.12), C(st.trim, 0)); }
  // arrow slits
  for (var k = 1; k < h / 4; k++) { var a2 = k * 1.7; B.add(prim("boxb"), M(x + Math.cos(a2) * r0 * 1.01, y + k * 4, z + Math.sin(a2) * r0 * 1.01, 0, -a2, 0, 0.12, 1.0, 0.2), C("#1a1a1a", 0)); }
}
function wallSeg(B, x1, z1, x2, z2, y, h, th, st) {
  var L = Math.hypot(x2 - x1, z2 - z1), a = Math.atan2(-(z2 - z1), x2 - x1);
  B.add(prim("boxb"), M((x1 + x2) / 2, y - 2, (z1 + z2) / 2, 0, a, 0, L, h + 2, th), C(st.wallStone, 0.1), true);
  var n = Math.floor(L / 1.6); for (var i = 0; i < n; i += 2) { var t = (i + 0.5) / n; B.add(prim("boxb"), M(x1 + (x2 - x1) * t, y + h, z1 + (z2 - z1) * t, 0, a, 0, 0.8, 0.7, th + 0.1), C(st.wallStone)); }
}
// A market stall: timber frame, counter with a plank top, a striped awning sloping out over the front with a valance,
// produce heaped on the counter, crates, a barrel and a sack beside it.
function stall(B, x, y, z, rot, r) {
  var cloth = ["#8a2c24", "#2c4a7a", "#b88a30", "#3a6a3a", "#6a2e5a", "#2e5a5a"][Math.floor(r() * 6)], cream = "#e2d6bc";
  var cs = Math.cos(rot), sn = Math.sin(rot); function L(lx, lz) { return [x + lx * cs + lz * sn, z - lx * sn + lz * cs]; } // +lz = front
  [[-1.35, -0.75, 2.75], [1.35, -0.75, 2.75], [-1.35, 0.85, 2.3], [1.35, 0.85, 2.3]].forEach(function (q) { var p = L(q[0], q[1]); B.add(prim("boxb"), M(p[0], y, p[1], 0, rot, 0, 0.13, q[2], 0.13), C("#4a3424", 0.06)); });
  var c0 = L(0, 0.05); B.add(prim("boxb"), M(c0[0], y, c0[1], 0, rot, 0, 2.5, 0.88, 1.15), C("#5a4030", 0.08)); B.add(prim("boxb"), M(c0[0], y + 0.88, c0[1], 0, rot, 0, 2.7, 0.07, 1.3), C("#6e5038", 0.05));
  // awning: seven strips, back edge high, front edge low, overhanging the counter
  var n = 7, slope = Math.atan2(0.5, 2.5); for (var i = 0; i < n; i++) { var lx = -1.5 + (i + 0.5) * 3.0 / n; var p = L(lx, 0.3); B.add(prim("box"), M(p[0], y + 2.52, p[1], slope, rot, 0, 3.0 / n + 0.005, 0.04, 2.6), C(i % 2 ? cream : cloth, 0.04)); var v = L(lx, 1.6); B.add(prim("box"), M(v[0], y + 2.15, v[1], 0, rot, 0, 3.0 / n * 0.92, 0.26, 0.03), C(i % 2 ? cloth : cream, 0.04)); }
  // goods: heaped produce in rows, a basket of something pale, crates and a barrel at the side
  var goods = [["#b8402a", "#d89a30", "#6a8a3a"], ["#c8b070", "#8a5a2a", "#d8c890"], ["#7a2a4a", "#b84a2a", "#e0c060"]][Math.floor(r() * 3)];
  for (var k = 0; k < 9; k++) { var gx = -0.95 + (k % 3) * 0.95 + (r() - 0.5) * 0.2, gz = 0.05 + (Math.floor(k / 3) - 1) * 0.32; var gp = L(gx, gz); B.add(prim("sphereLo"), M(gp[0], y + 0.98, gp[1], r(), r(), 0, 0.3 + r() * 0.08, 0.2, 0.3 + r() * 0.08), C(goods[k % 3], 0.15)); }
  var cr = L(1.75, 0.55); B.add(prim("boxb"), M(cr[0], y, cr[1], 0, rot + 0.2, 0, 0.6, 0.5, 0.6), C("#7a5a3a", 0.1), true); var cr2 = L(1.8, 0.5); B.add(prim("boxb"), M(cr2[0], y + 0.5, cr2[1], 0, rot - 0.15, 0, 0.5, 0.42, 0.5), C("#7a5a3a", 0.1), true);
  var br = L(-1.85, 0.4); B.add(prim("cyl16"), M(br[0], y, br[1], 0, 0, 0, 0.55, 0.85, 0.55), C("#5a4030", 0.08)); B.add(prim("cyl16"), M(br[0], y + 0.25, br[1], 0, 0, 0, 0.58, 0.06, 0.58), C("#3a3632", 0)); B.add(prim("cyl16"), M(br[0], y + 0.62, br[1], 0, 0, 0, 0.58, 0.06, 0.58), C("#3a3632", 0));
  var sk = L(-1.7, 1.05); B.add(prim("sphereLo"), M(sk[0], y + 0.3, sk[1], 0, r() * 3, 0, 0.5, 0.65, 0.45), C("#b8a47a", 0.1));
}
function statue(B, x, y, z, rot, st, lion) {
  B.add(prim("boxb"), M(x, y, z, 0, rot, 0, 2.2, 2.4, 2.2), C(st.stone)); B.add(prim("boxb"), M(x, y + 2.4, z, 0, rot, 0, 2.5, 0.3, 2.5), C(st.stone));
  var sc = C("#9a9890", 0.04);
  if (lion) { B.add(prim("sphere"), M(x, y + 3.6, z, 0, rot, 0, 1.6, 1.4, 2.4), sc); B.add(prim("sphere"), M(x + Math.sin(rot) * 1.1, y + 4.6, z + Math.cos(rot) * 1.1, 0, rot, 0, 1.4, 1.5, 1.2), sc); B.add(prim("sphere"), M(x + Math.sin(rot) * 1.6, y + 4.5, z + Math.cos(rot) * 1.6, 0, rot, 0, 0.7, 0.6, 0.8), sc); }
  else { B.add(prim("cyl"), M(x, y + 2.7, z, 0, 0, 0, 1.0, 3.4, 0.8), sc); B.add(prim("sphere"), M(x, y + 6.5, z, 0, 0, 0, 0.7), sc); B.add(prim("cyl"), M(x + 0.6, y + 3.8, z, 0, 0, 0.3, 0.16, 4.2, 0.16), sc); }
}
function fountain(B, x, y, z, st) { B.add(prim("cyl16"), M(x, y, z, 0, 0, 0, 7, 0.8, 7), C(st.stone)); B.add(prim("cyl16"), M(x, y + 0.1, z, 0, 0, 0, 6.2, 0.75, 6.2), C("#3a5a6a", 0)); B.add(prim("cyl"), M(x, y, z, 0, 0, 0, 0.8, 3.2, 0.8), C(st.stone)); B.add(prim("cyl16"), M(x, y + 2.6, z, 0, 0, 0, 2.4, 0.3, 2.4), C(st.stone)); }
function tree(B, x, y, z, s, style, r) {
  var tr = C("#4a3524", 0.1);
  if (style === "pine") { B.add(prim("cyl6"), M(x, y - 0.3, z, 0, 0, 0, 0.5 * s, 2.5 * s, 0.5 * s), tr); var g = C(r() < 0.5 ? "#2c4a30" : "#24402c", 0.15); for (var i = 0; i < 3; i++) B.add(prim("cone8"), M(x, y + (1.6 + i * 1.7) * s, z, 0, r() * 3, 0, (3.6 - i * 0.9) * s, 3.2 * s, (3.6 - i * 0.9) * s), g, true); return; }
  if (style === "palm" || style === "palmish") { var lean = (r() - 0.5) * 0.4; B.add(prim("cyl6"), M(x, y - 0.2, z, lean, 0, lean, 0.4 * s, 6 * s, 0.4 * s), C("#7a6040")); for (var i = 0; i < 7; i++) { var a = i / 7 * Math.PI * 2; B.add(prim("boxb"), M(x + Math.sin(lean) * 6 * s + Math.cos(a) * 1.5 * s, y + 5.8 * s, z + Math.sin(a) * 1.5 * s, 0.5, -a, 0, 3.2 * s, 0.12, 0.9 * s), C("#4a7a2a", 0.15)); } return; }
  if (style === "dead") { B.add(prim("cyl6"), M(x, y - 0.2, z, 0, 0, 0, 0.45 * s, 5 * s, 0.45 * s), C("#2c2826")); for (var i = 0; i < 4; i++) { var a = r() * 6.28; B.add(prim("cyl6"), M(x, y + (2.5 + r() * 2) * s, z, 0.7, a, 0, 0.18 * s, 2.4 * s, 0.18 * s), C("#2c2826")); } return; }
  if (style === "giant") { B.add(prim("cyl6"), M(x, y - 0.5, z, 0, 0, 0, 1.6 * s, 12 * s, 1.6 * s), C("#5a4630", 0.1)); for (var i = 0; i < 4; i++) B.add(prim("sphere1"), M(x + (r() - 0.5) * 6 * s, y + (11 + r() * 4) * s, z + (r() - 0.5) * 6 * s, 0, 0, 0, (6 + r() * 3) * s, (4 + r() * 2) * s, (6 + r() * 3) * s), C(r() < 0.5 ? "#2e5a2a" : "#3a6a30", 0.18), true); return; }
  if (style === "willow") { B.add(prim("cyl6"), M(x, y - 0.2, z, 0, 0, 0, 0.6 * s, 3 * s, 0.6 * s), tr); B.add(prim("cone8"), M(x, y + 0.6 * s, z, Math.PI, 0, 0, 4.4 * s, -3.6 * s, 4.4 * s), C("#5a6a3a", 0.15)); B.add(prim("sphere1"), M(x, y + 3.6 * s, z, 0, 0, 0, 3.6 * s, 2.0 * s, 3.6 * s), C("#5a6a3a", 0.15), true); return; }
  // oak / darkoak / elven
  var leaf = style === "darkoak" ? (r() < 0.5 ? "#1e2c1a" : "#26341e") : style === "elven" ? (r() < 0.3 ? "#6a8a3a" : "#3e6a2e") : (r() < 0.5 ? "#3c5a26" : "#4a6a2c");
  B.add(prim("cyl6"), M(x, y - 0.3, z, 0, 0, 0, 0.55 * s, 3.4 * s, 0.55 * s), tr);
  var n = 2 + Math.floor(r() * 3); for (var i = 0; i < n; i++) B.add(prim("sphere1"), M(x + (r() - 0.5) * 2.2 * s, y + (3.6 + r() * 1.6) * s, z + (r() - 0.5) * 2.2 * s, 0, r() * 3, 0, (2.6 + r()) * s, (2.2 + r() * 0.8) * s, (2.6 + r()) * s), C(leaf, 0.2), true);
}
export { tree as addTree };
export function addRock(B, x, y, z, s, col, r) { B.add(prim("sphereLo"), M(x, y + s * 0.15, z, r() * 3, r() * 3, r() * 3, s * (1 + r() * 0.6), s * (0.6 + r() * 0.4), s * (1 + r() * 0.5)), C(col || "#6a665e", 0.12), true); }

// ------------------------------------------------------------------ landmark buildings for districts
function landmark(B, W, name, x, y, z, rot, st, r, out, p) {
  var n = name.toLowerCase(); var R = p.realm;
  var door = function (dx, dz, label, kind) { var cs = Math.cos(rot), sn = Math.sin(rot); out.doors.push({ name: label || name, kind: kind || "building", x: x + dx * cs + dz * sn, z: z - dx * sn + dz * cs, y: y }); };
  if (/palace|citadel|keep|castle|great hall|crownward|jarl|spire command|conclave/.test(n)) {
    // the royal castle: keep, curtain, many tall slate spires (the skyline of the reference art)
    var big = p.kind === "capital" ? 1 : 0.6;
    B.add(prim("boxb"), M(x, y - 1, z, 0, rot, 0, 26 * big, 22 * big, 18 * big), C(st.wallStone, 0.06), true);
    roof(B, x, y + 21 * big, z, rot, 26 * big, 18 * big, st, r, st.roofKind === "dome" ? "dome" : st.roofKind === "flat" ? "flat" : "steep");
    var ts = [[-15, -11, 3.2, 34], [15, -11, 3.2, 34], [-15, 11, 3.6, 40], [15, 11, 3.6, 40], [0, 14, 4.6, 52], [-7, -14, 2.2, 28], [7, -14, 2.2, 28], [-24, 0, 2.6, 30], [24, 0, 2.6, 30]];
    var cs = Math.cos(rot), sn = Math.sin(rot);
    ts.forEach(function (t) { var tx = x + (t[0] * cs + t[1] * sn) * big, tz = z + (-t[0] * sn + t[1] * cs) * big; tower(B, tx, y, tz, t[2] * big, t[3] * big, st, st.roofKind === "dome" ? false : st.roofKind === "flat" ? false : t[3] * big * 0.42, r); if (st.roofKind === "dome") B.add(prim("dome"), M(tx, y + t[3] * big, tz, 0, 0, 0, t[2] * 2.6 * big), C(st.roof2)); out.banners.push({ x: tx, y: y + t[3] * big * 0.7, z: tz, rot: rot + Math.PI / 2, s: 1.4 * big }); });
    for (var i = 0; i < 8; i++) W.add(prim("boxb"), M(x + (i - 3.5) * 2.8 * big * cs + 9.05 * big * sn, y + 9 * big, z - (i - 3.5) * 2.8 * big * sn + 9.05 * big * cs, 0, rot, 0, 0.9, 2.2, 0.1), [1, 1, 1]);
    door(0, 9.2 * big, name, "palace"); out.colliders.push({ x: x, z: z, r: 17 * big }); return 20 * big;
  }
  if (/temple|chapel|cathedral|shrine|church|sanctum|abbey|nave|sea temple|ancestor/.test(n)) {
    if (st.roofKind === "dome") { B.add(prim("boxb"), M(x, y - 0.5, z, 0, rot, 0, 14, 9, 14), C(st.plaster), true); B.add(prim("dome"), M(x, y + 8.5, z, 0, 0, 0, 12, 10, 12), C(st.roof2), true); [[-7, -7], [7, -7], [-7, 7], [7, 7]].forEach(function (q) { B.add(prim("cyl16"), M(x + q[0], y, z + q[1], 0, 0, 0, 1.6, 15, 1.6), C(st.plaster)); B.add(prim("cone8"), M(x + q[0], y + 15, z + q[1], 0, 0, 0, 2, 3, 2), C(st.roof2)); }); }
    else { B.add(prim("boxb"), M(x, y - 0.5, z, 0, rot, 0, 9, 10, 18), C(st.stone, 0.06), true); roof(B, x, y + 9.5, z, rot + Math.PI / 2, 18, 9, st, r, "steep"); var cs = Math.cos(rot), sn = Math.sin(rot); var bx = x + 9 * sn, bz = z + 9 * cs; B.add(prim("boxb"), M(bx, y - 0.5, bz, 0, rot, 0, 5, 20, 5), C(st.stone), true); B.add(prim("cone4"), M(bx, y + 19.5, bz, 0, rot, 0, 6.6, 10, 6.6), C(st.roof)); W.add(prim("cyl16"), M(bx + 2.56 * sn, y + 14, bz + 2.56 * cs, Math.PI / 2, rot, 0, 2.2, 0.1, 2.2), [1, 1, 1]); }
    door(0, 9.4, name, "temple"); out.colliders.push({ x: x, z: z, r: 9 }); return 11;
  }
  if (/market|bazaar|exchange|souk|coldmarket|salt market|reed market|oak market|moon market|lake market|river market|bridge market/.test(n)) {
    var cnt = p.kind === "capital" ? 14 : 7; for (var i = 0; i < cnt; i++) { var a = i / cnt * Math.PI * 2, rr = 8 + (i % 2) * 5; stall(B, x + Math.cos(a) * rr, y, z + Math.sin(a) * rr, -a + Math.PI / 2, r); out.vendors.push({ x: x + Math.cos(a) * (rr - 1.6), z: z + Math.sin(a) * (rr - 1.6), y: y, rot: -a - Math.PI / 2 }); }
    out.plazas.push({ x: x, z: z, r: 16 }); out.doors.push({ name: name, kind: "market", x: x, z: z, y: y }); return 16;
  }
  if (/guild|lodge|serai|delving|registry|contract|war hall|war board|notice house|guild post|guild office/.test(n)) {
    B.add(prim("boxb"), M(x, y - 0.5, z, 0, rot, 0, 18, 11, 13), C(st.stone, 0.06), true); roof(B, x, y + 10.5, z, rot, 18, 13, st, r);
    var cs = Math.cos(rot), sn = Math.sin(rot); [-6, 6].forEach(function (dx) { tower(B, x + dx * cs + 6.6 * sn, y, z - dx * sn + 6.6 * cs, 1.6, 15, st, st.roofKind === "gable" || st.roofKind === "steep" ? 6 : false, r); });
    for (var i = -2; i <= 2; i++) W.add(prim("boxb"), M(x + i * 3 * cs + 6.56 * sn, y + 6, z - i * 3 * sn + 6.56 * cs, 0, rot, 0, 1.0, 2.0, 0.1), [1, 1, 1]);
    out.banners.push({ x: x + 6.7 * sn, y: y + 9, z: z + 6.7 * cs, rot: rot, s: 1.6, front: true });
    out.boards.push({ x: x + 3 * cs + 9 * sn, z: z - 3 * sn + 9 * cs, y: y, rot: rot, name: name });
    door(0, 6.6, name, "guild"); out.colliders.push({ x: x, z: z, r: 10.5 }); return 12;
  }
  if (/forge|smith|anvil|armorer|artisan|foundry|smelter/.test(n)) {
    B.add(prim("boxb"), M(x, y - 0.5, z, 0, rot, 0, 12, 6, 9), C(st.stone), true); roof(B, x, y + 5.5, z, rot, 12, 9, st, r, st.roofKind === "dome" ? "flat" : null);
    B.add(prim("boxb"), M(x + 3, y + 3, z - 2, 0, rot, 0, 1.6, 8, 1.6), C("#3a3430")); out.smoke.push({ x: x + 3, y: y + 11, z: z - 2 }); W.add(prim("boxb"), M(x, y + 0.2, z + 4.56, 0, rot, 0, 3.2, 2.6, 0.1), [1, 0.6, 0.3]);
    door(0, 4.6, name, "smithy"); out.colliders.push({ x: x, z: z, r: 7 }); return 8;
  }
  if (/inn|tavern|alehouse|hall\b|ale vault|black lung|last inn|ditchside|crossroads|surface inn|riverside inn|silverstream inn|guest house|wayfarer/.test(n)) {
    house(B, W, x, y, z, rot, 12, 9, 7.5, st, r); var cs = Math.cos(rot), sn = Math.sin(rot);
    B.add(prim("boxb"), M(x + 5 * cs + 5.2 * sn, y + 4, z - 5 * sn + 5.2 * cs, 0, rot, 0, 1.4, 1.0, 0.1), C("#7a5a2a"));
    out.lamps.push({ x: x + 4 * cs + 5.4 * sn, y: y + 3, z: z - 4 * sn + 5.4 * cs });
    door(0, 4.6, name, "inn"); out.colliders.push({ x: x, z: z, r: 7.5 }); return 9;
  }
  if (/bank|vault|counting|treasury|toll/.test(n)) {
    B.add(prim("boxb"), M(x, y - 0.5, z, 0, rot, 0, 14, 8, 10), C(st.stone, 0.05), true); var cs = Math.cos(rot), sn = Math.sin(rot);
    for (var i = -2; i <= 2; i++) B.add(prim("cyl"), M(x + i * 2.6 * cs + 5.6 * sn, y, z - i * 2.6 * sn + 5.6 * cs, 0, 0, 0, 0.9, 7.2, 0.9), C("#c8c0b0"));
    B.add(prim("roof"), M(x + 0.6 * sn, y + 7.5, z + 0.6 * cs, 0, rot + Math.PI / 2, 0, 12, 2.4, 15), C(st.stone), true);
    door(0, 5.2, name, "bank"); out.colliders.push({ x: x, z: z, r: 8 }); return 9;
  }
  if (/quay|dock|harbor|wharf|pier|breakwater|landing|warehouse|admiralty/.test(n)) {
    for (var i = 0; i < 3; i++) house(B, W, x + (i - 1) * 9, y, z, rot, 7, 9, 6, st, r);
    door(0, 5, name, "docks"); out.colliders.push({ x: x, z: z, r: 13 }); return 14;
  }
  if (/barracks|garrison|armory|command|watch|bailey|citadel|gatehouse keep|signal/.test(n)) {
    B.add(prim("boxb"), M(x, y - 0.5, z, 0, rot, 0, 20, 7, 8), C(st.wallStone), true); roof(B, x, y + 6.5, z, rot, 20, 8, st, r);
    tower(B, x + 11 * Math.cos(rot), y, z - 11 * Math.sin(rot), 2.2, 14, st, st.roofKind === "gable" ? 5 : false, r);
    door(0, 4.1, name, "barracks"); out.colliders.push({ x: x, z: z, r: 11 }); return 12;
  }
  if (/archive|library|athenaeum|scriptorium|forum|observatory|silver moon|academy|study/.test(n)) {
    B.add(prim("boxb"), M(x, y - 0.5, z, 0, rot, 0, 14, 10, 14), C(st.stone, 0.05), true); B.add(prim("dome"), M(x, y + 9.5, z, 0, 0, 0, 11, 8, 11), C(/observatory|silver moon/.test(n) ? "#5a6a8a" : st.roof2), true);
    door(0, 7.1, name, "library"); out.colliders.push({ x: x, z: z, r: 9 }); return 10;
  }
  if (/mine|pit|lift|shaft|delve|descent|gallery|cavern|headframe/.test(n)) {
    B.add(prim("boxb"), M(x, y - 0.5, z, 0, rot, 0, 9, 7, 7), C(st.stone), true); B.add(prim("boxb"), M(x, y, z + 3.6, 0, rot, 0, 4.4, 4.6, 0.3), C("#121010", 0)); for (var i = -1; i <= 1; i += 2) B.add(prim("boxb"), M(x + i * 2.4, y, z + 3.7, 0, rot, 0, 0.5, 5.2, 0.5), C("#4a3a2a"));
    out.lamps.push({ x: x + 2.8, y: y + 4, z: z + 4.2 });
    door(0, 3.8, name, "mine"); out.colliders.push({ x: x, z: z, r: 6 }); return 7;
  }
  if (/gate/.test(n)) { out.doors.push({ name: name, kind: "gate", x: x, z: z, y: y }); return 0; }
  // generic district: a cluster of houses round a small square with a signpost
  for (var i = 0; i < 4; i++) { var a = i / 4 * Math.PI * 2 + 0.4; house(B, W, x + Math.cos(a) * 9, y, z + Math.sin(a) * 9, -a - Math.PI / 2, 6 + r() * 2, 6, 5 + r() * 3, st, r); out.colliders.push({ x: x + Math.cos(a) * 9, z: z + Math.sin(a) * 9, r: 4.4 }); }
  out.doors.push({ name: name, kind: "district", x: x, z: z, y: y });
  return 13;
}

// ------------------------------------------------------------------ settlement assembly
// Returns { group, colliders, doors, boards, vendors, spots, lamps, bridges, banners, smoke, plazas, center:{x,y,z}, radius }
export function buildSettlement(p, surf) {
  surf = surf || meshHeight; /* the walkable terrain surface: buildings, streets and the player's feet all use this one function */
  var THREE = T(); var st = styleOf(p); var r = rng(hashStr(p.id));
  var cx = p.x * MILE, cz = -p.y * MILE, R = p.r * MILE; var baseY = surf(cx, cz);
  var B = new GeoBuilder(), W = new GeoBuilder(), P = new GeoBuilder();
  var out = { colliders: [], doors: [], boards: [], vendors: [], spots: [], lamps: [], bridges: [], banners: [], smoke: [], plazas: [], segs: [], streets: [] };
  function gy(x, z) { return surf(cx + x, cz + z); }
  function inRiver(x, z, pad) { var rv = riverAt((cx + x) / MILE, -(cz + z) / MILE); return rv && rv.d * MILE < rv.w * MILE * 1.6 + (pad || 0); }
  function inSea(x, z) { return landSD((cx + x) / MILE, -(cz + z) / MILE) < 0.05; }
  var occupied = [];
  function free(x, z, rad) { for (var i = 0; i < occupied.length; i++) { var o = occupied[i]; if (Math.hypot(o.x - x, o.z - z) < o.r + rad) return false; } return !inRiver(x, z, rad) && !inSea(x, z) && Math.hypot(x, z) < R * 0.93; }
  function occupy(x, z, rad) { occupied.push({ x: x, z: z, r: rad }); }
  function freeS(x, z, rad) { return free(x, z, rad) && streets.every(function (st) { return segDist(x, z, st) >= st.w / 2 + rad * 0.9; }); }
  // a building lot: the ground under its four corners must not differ much, and it gets a foundation down to the lowest corner
  function lotRange(x, z, w, d, rot) { var cs = Math.cos(rot), sn = Math.sin(rot), lo = 1e9, hi = -1e9; [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]].forEach(function (q) { var lx = q[0] * w / 2, lz = q[1] * d / 2; var h = gy(x + lx * cs + lz * sn, z - lx * sn + lz * cs); lo = Math.min(lo, h); hi = Math.max(hi, h); }); return { lo: lo, hi: hi }; }
  function boxCollider(x, z, w, d, rot) { out.colliders.push({ x: x, z: z, r: Math.hypot(w, d) / 2, box: { hw: w / 2 + 0.1, hd: d / 2 + 0.1, rot: rot } }); }

  // exits: where each connected road actually crosses the settlement's edge (so streets, gates and roads line up),
  // plus cardinal fallbacks for walled towns
  var exits = [], exitW = {};
  roadExits(p).forEach(function (e) { var dup = exits.findIndex(function (a) { return Math.abs(Math.atan2(Math.sin(a - e.ang), Math.cos(a - e.ang))) < 0.2; }); if (dup >= 0) { exitW[dup] = Math.max(exitW[dup], e.w); return; } exitW[exits.length] = e.w; exits.push(e.ang); });
  if (WALLED[p.kind] && exits.length < 2) [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(function (a) { if (!exits.some(function (e) { return Math.abs(Math.atan2(Math.sin(e - a), Math.cos(e - a))) < 0.6; })) { exitW[exits.length] = 3; exits.push(a); } });
  if (!exits.length) { exitW[0] = 3; exits.push(r() * Math.PI * 2); }

  var small = isSmallPlace(p); var CUT = townCut(p) || R;
  var plazaR = p.kind === "capital" ? 26 : p.kind === "city" ? 18 : 10;
  // ---- ground: cobbled plaza and streets (textured mesh) for proper towns
  var paved = !small && /Aurelia|Velkar|Sunscar|Stonehold|Umbral Reach/.test(p.realm) && /capital|city|town|fort-town|stronghold/.test(p.kind);
  var streets = [];
  if (!small) {
    exits.forEach(function (a, ei) { streets.push({ a: a, x1: 0, z1: 0, x2: Math.cos(a) * CUT, z2: Math.sin(a) * CUT, w: p.kind === "capital" ? 6 : Math.max(3.4, Math.min(4.5, exitW[ei] || 4.5)) }); });
    if (p.kind === "capital" || p.kind === "city") { var ringR = R * 0.55; for (var i = 0; i < 16; i++) { var a1 = i / 16 * Math.PI * 2, a2 = (i + 1) / 16 * Math.PI * 2; streets.push({ ring: i, x1: Math.cos(a1) * ringR, z1: Math.sin(a1) * ringR, x2: Math.cos(a2) * ringR, z2: Math.sin(a2) * ringR, w: 4 }); } }
  }
  out.streets = streets.map(function (s) { return { x1: s.x1 + cx, z1: s.z1 + cz, x2: s.x2 + cx, z2: s.z2 + cz, w: s.w }; });
  occupy(0, 0, plazaR);
  // ---- walls
  var wallH = p.kind === "capital" ? 11 : p.kind === "city" || p.kind === "stronghold" ? 9 : 6.5;
  if (WALLED[p.kind] && p.realm !== "Sylvanor") {
    var segs = Math.max(16, Math.round(R * 2 * Math.PI / 14)); var wr = R * 0.96; var wood = p.realm === "The Marches" || p.realm === "Drakmor" && p.kind !== "capital";
    for (var i = 0; i < segs; i++) {
      var a1 = i / segs * Math.PI * 2, a2 = (i + 1) / segs * Math.PI * 2, am = (a1 + a2) / 2;
      var gate = exits.some(function (e) { return Math.abs(Math.atan2(Math.sin(e - am), Math.cos(e - am))) < Math.PI / segs * 1.05; });
      var x1 = Math.cos(a1) * wr, z1 = Math.sin(a1) * wr, x2 = Math.cos(a2) * wr, z2 = Math.sin(a2) * wr;
      var wet = inRiver((x1 + x2) / 2, (z1 + z2) / 2, 2) || inSea((x1 + x2) / 2, (z1 + z2) / 2);
      if (gate) { var gx = Math.cos(am) * wr, gz = Math.sin(am) * wr; [-1, 1].forEach(function (sd) { var tx = gx + Math.cos(am + Math.PI / 2) * sd * 5.5, tz = gz + Math.sin(am + Math.PI / 2) * sd * 5.5; tower(B, cx + tx, gy(tx, tz), cz + tz, 2.6, wallH + 6, st, p.kind === "capital" && st.roofKind === "gable" ? 7 : false, r); out.colliders.push({ x: cx + tx, z: cz + tz, r: 3 }); }); B.add(prim("boxb"), M(cx + gx, gy(gx, gz) + wallH - 1, cz + gz, 0, -am + Math.PI / 2, 0, 9, 3.5, 3), C(st.wallStone), true); out.doors.push({ name: gateName(p, am), kind: "gate", x: cx + gx, z: cz + gz, y: gy(gx, gz) }); out.banners.push({ x: cx + gx + Math.cos(am) * 1.8, y: gy(gx, gz) + wallH - 2, z: cz + gz + Math.sin(am) * 1.8, rot: -am + Math.PI / 2, s: 1.3, front: true }); continue; }
      if (wet) continue;
      var y1 = gy(x1, z1), y2 = gy(x2, z2);
      if (wood) { var L = Math.hypot(x2 - x1, z2 - z1), n = Math.ceil(L / 0.9); for (var k = 0; k < n; k++) { var t = k / n; B.add(prim("cyl6"), M(cx + x1 + (x2 - x1) * t, Math.min(y1, y2) - 1, cz + z1 + (z2 - z1) * t, 0, 0, 0, 0.8, wallH + 1 + (k % 2) * 0.6, 0.8), C("#5a4630", 0.15)); } }
      else wallSeg(B, cx + x1, cz + z1, cx + x2, cz + z2, Math.min(y1, y2), wallH, 2.2, st);
      out.segs.push({ x1: cx + x1, z1: cz + z1, x2: cx + x2, z2: cz + z2 });
      if (i % 4 === 0) { tower(B, cx + x1, y1, cz + z1, 2.2, wallH + 3.5, st, p.kind === "capital" && st.roofKind === "gable" ? 6 : false, r); }
    }
  }
  // ---- districts (from the fixed-interior gazetteer) become landmarks with doors
  var ds = districtsOf(p);
  ds.forEach(function (d, i) {
    var lx = d.x * MILE - cx, lz = -d.y * MILE - cz; var rot = Math.atan2(lx, lz) + Math.PI; // face the plaza
    // landmarks never stand on a street or another building: search outward from the preferred spot in rings until one fits
    var lmR = Math.min(20, R * 0.2); var placed = freeS(lx, lz, lmR);
    if (!placed) { var a0 = Math.atan2(lz, lx), r0 = Math.hypot(lx, lz); search: for (var ring = 1; ring <= 14; ring++) { var rr = r0 + (ring % 2 ? 1 : -1) * Math.ceil(ring / 2) * lmR * 0.5; if (rr < R * 0.25 || rr > R * 0.88) continue; for (var kk = 0; kk < 24; kk++) { var aa = a0 + (kk % 2 ? 1 : -1) * Math.ceil(kk / 2) * 0.16; var tx = Math.cos(aa) * rr, tz = Math.sin(aa) * rr; if (freeS(tx, tz, lmR)) { lx = tx; lz = tz; placed = true; break search; } } } }
    rot = Math.atan2(lx, lz) + Math.PI;
    if (/gate/.test(d.name.toLowerCase()) && WALLED[p.kind]) { var a0 = Math.atan2(lz, lx); var best = exits.reduce(function (b, e) { return Math.abs(Math.atan2(Math.sin(e - a0), Math.cos(e - a0))) < Math.abs(Math.atan2(Math.sin(b - a0), Math.cos(b - a0))) ? e : b; }, exits[0]); var gd = out.doors.find(function (q) { return q.kind === "gate" && Math.abs(Math.atan2(q.z - cz, q.x - cx) - best) < 0.3; }); if (gd) { gd.name = d.name; out.spots.push({ name: d.name, x: gd.x - Math.cos(best) * 8, z: gd.z - Math.sin(best) * 8, y: gd.y }); return; } }
    var y0 = gy(lx, lz); var rad = landmark(B, W, d.name, cx + lx, y0, cz + lz, rot, st, r, out, p);
    var lo = y0; for (var qa = 0; qa < 8; qa++) lo = Math.min(lo, gy(lx + Math.cos(qa * 0.785) * rad * 0.85, lz + Math.sin(qa * 0.785) * rad * 0.85)); if (y0 - lo > 0.4) B.add(prim("cyl16"), M(cx + lx, lo - 0.5, cz + lz, 0, 0, 0, rad * 1.9, y0 - lo + 0.5, rad * 1.9), C(st.stone, 0.1), true); /* plinth under the landmark */
    occupy(lx, lz, Math.max(rad, 6)); out.spots.push({ name: d.name, x: cx + lx + Math.sin(rot) * (rad + 3), z: cz + lz + Math.cos(rot) * (rad + 3), y: y0 });
  });
  // ---- central plaza: statue / fountain / lion pillars and the quest board
  if (!small) {
    var py0 = gy(0, 0);
    if (p.kind === "capital" || p.kind === "city") { fountain(B, cx, py0, cz, st); statue(B, cx + 14, py0, cz - 6, -1.2, st, false); statue(B, cx - 14, py0, cz - 6, 1.2, st, true); out.colliders.push({ x: cx, z: cz, r: 4 }, { x: cx + 14, z: cz - 6, r: 1.8 }, { x: cx - 14, z: cz - 6, r: 1.8 }); }
    else { B.add(prim("cyl16"), M(cx, py0, cz, 0, 0, 0, 3.2, 1.0, 3.2), C(st.stone)); B.add(prim("cyl16"), M(cx, py0 + 0.9, cz, 0, 0, 0, 2.2, 0.2, 2.2), C("#1a2a30", 0)); out.colliders.push({ x: cx, z: cz, r: 2 }); }
    if (p.kind === "capital" || p.kind === "city") { // a ring of stalls around the plaza, clear of the statues, the board and the streets
      var nS = p.kind === "capital" ? 7 : 4; for (var si = 0; si < nS; si++) { var sa = si / nS * Math.PI * 2 + 0.9, sr = plazaR * 0.7; var sx = Math.cos(sa) * sr, sz = Math.sin(sa) * sr;
        if (Math.hypot(sx - 14, sz + 6) < 5 || Math.hypot(sx + 14, sz + 6) < 5 || streets.some(function (s3) { return segDist(sx, sz, s3) < s3.w / 2 + 2.2; })) continue;
        stall(B, cx + sx, gy(sx, sz), cz + sz, Math.atan2(-sx, -sz), r); boxCollider(cx + sx, cz + sz, 4.2, 2.6, Math.atan2(-sx, -sz)); } }
    var bA = r() * Math.PI * 2; out.boards.push({ x: cx + Math.cos(bA) * (plazaR * 0.6), z: cz + Math.sin(bA) * (plazaR * 0.6), y: gy(Math.cos(bA) * plazaR * 0.6, Math.sin(bA) * plazaR * 0.6), rot: -bA - Math.PI / 2, name: "Notice Board" });
    out.plazas.push({ x: cx, z: cz, r: plazaR });
    // lamps around the plaza
    for (var i = 0; i < (p.kind === "capital" ? 10 : 5); i++) { var a = i / (p.kind === "capital" ? 10 : 5) * Math.PI * 2 + 0.3; out.lamps.push({ x: cx + Math.cos(a) * plazaR * 0.92, z: cz + Math.sin(a) * plazaR * 0.92, y: py0 + 3.4, post: true }); }
  }
  // ---- houses along every street, then infill
  var houseCount = 0, target = { capital: 420, city: 220, "fort-town": 90, town: 70, village: 26, hamlet: 10, fort: 8, stronghold: 120, monastery: 6, camp: 0, tower: 0, ruin: 0, dungeon: 0, shrine: 2, landmark: 0 }[p.kind] || 20;
  if (p.realm === "Sylvanor") target = Math.round(target * 0.5);
  streets.forEach(function (s) {
    var L = Math.hypot(s.x2 - s.x1, s.z2 - s.z1), a = Math.atan2(s.z2 - s.z1, s.x2 - s.x1);
    for (var t = plazaR + 6; t < L - 6; t += 7 + r() * 3) { if (houseCount >= target) break; for (var sd = -1; sd <= 1; sd += 2) {
      var w = 5 + r() * 3, d = 5 + r() * 2.5, off = s.w / 2 + d / 2 + 0.8;
      var hx = s.x1 + Math.cos(a) * t + Math.cos(a + Math.PI / 2) * sd * off, hz = s.z1 + Math.sin(a) * t + Math.sin(a + Math.PI / 2) * sd * off;
      if (!free(hx, hz, Math.max(w, d) * 0.55)) continue;
      var hgt = (p.kind === "capital" ? 6 : 4.5) + r() * (p.kind === "capital" ? 5 : 3);
      var hrot = Math.atan2(Math.cos(a + Math.PI / 2) * -sd, Math.sin(a + Math.PI / 2) * -sd); var fw = p.realm === "Drakmor" ? w * 1.7 : w; var lot = lotRange(hx, hz, fw, d, hrot); if (lot.hi - lot.lo > 1.8 || streets.some(function (s2) { return s2 !== s && segDist(hx, hz, s2) < s2.w / 2 + Math.max(fw, d) * 0.6; })) continue;
      buildHouse(B, W, P, p, st, cx + hx, gy(hx, hz), cz + hz, hrot, w, d, hgt, r, lot.lo);
      occupy(hx, hz, Math.max(w, d) * 0.55); boxCollider(cx + hx, cz + hz, fw, d, hrot); houseCount++;
    } }
  });
  var guard = 0;
  while (houseCount < target && guard++ < target * 12) {
    var a = r() * Math.PI * 2, rr = Math.sqrt(r()) * R * 0.9; var hx = Math.cos(a) * rr, hz = Math.sin(a) * rr;
    var w = 5 + r() * 3, d = 5 + r() * 2.5; if (!free(hx, hz, Math.max(w, d) * 0.6)) continue;
    var irot = Math.round(r() * 4) * Math.PI / 2 + a * 0.2; var fw = p.realm === "Drakmor" ? w * 1.7 : w; var lot = lotRange(hx, hz, fw, d, irot);
    if (streets.some(function (s) { return segDist(hx, hz, s) < s.w / 2 + Math.max(fw, d) * 0.62 + 0.5; }) || lot.hi - lot.lo > 1.8) continue;
    buildHouse(B, W, P, p, st, cx + hx, gy(hx, hz), cz + hz, irot, w, d, 4 + r() * (p.kind === "capital" ? 7 : 3), r, lot.lo);
    occupy(hx, hz, Math.max(w, d) * 0.6); boxCollider(cx + hx, cz + hz, fw, d, irot); houseCount++;
  }
  // ---- special sites
  if (p.kind === "ruin" || p.kind === "dungeon") ruinSite(B, p, st, cx, cz, gy, r, out);
  if (p.kind === "tower") { tower(B, cx, gy(0, 0), cz, 4, 26, st, p.id === "rookspire" ? false : 9, r); out.colliders.push({ x: cx, z: cz, r: 4.5 }); out.doors.push({ name: p.name, kind: "tower", x: cx, z: cz + 4.6, y: gy(0, 4.6) }); }
  if (p.kind === "camp") { for (var i = 0; i < 7; i++) { var a = i / 7 * Math.PI * 2; var tx = Math.cos(a) * 9, tz = Math.sin(a) * 9; B.add(prim("cone8"), M(cx + tx, gy(tx, tz), cz + tz, 0, a, 0, 4.4, 3.6, 4.4), C(["#8a7a5a", "#6a5a42", "#9a8a6a"][i % 3], 0.1), true); } B.add(prim("cyl16"), M(cx, gy(0, 0), cz, 0, 0, 0, 2, 0.3, 2), C("#3a3430")); out.smoke.push({ x: cx, y: gy(0, 0) + 1, z: cz, fire: true }); out.doors.push({ name: p.name, kind: "camp", x: cx, z: cz, y: gy(0, 0) }); }
  if (p.kind === "shrine") { for (var i = 0; i < 9; i++) { var a = i / 9 * Math.PI * 2; B.add(prim("cyl6"), M(cx + Math.cos(a) * 10, gy(0, 0), cz + Math.sin(a) * 10, 0, 0, 0, 1, 4 + (i % 3), 1), C(st.stone)); } tree(B, cx, gy(0, 0), cz, 2.4, "giant", r); out.doors.push({ name: p.name, kind: "shrine", x: cx, z: cz + 6, y: gy(0, 6) }); }
  if (p.kind === "monastery") { landmark(B, W, "Great Chapel", cx, gy(0, 0), cz, 0, st, r, out, p); }
  if (p.kind === "landmark") { landmarkSite(B, p, st, cx, cz, gy, r, out); }
  if (p.realm === "Sylvanor" && !small) { for (var i = 0; i < (p.kind === "capital" ? 9 : 4); i++) { var a = i / (p.kind === "capital" ? 9 : 4) * Math.PI * 2 + 0.3, rr = R * (0.35 + 0.35 * (i % 2)); var tx = Math.cos(a) * rr, tz = Math.sin(a) * rr; if (!freeS(tx, tz, 8)) continue; treeHall(B, W, cx + tx, gy(tx, tz), cz + tz, p.kind === "capital" ? 1.4 : 1, r); occupy(tx, tz, 8); out.colliders.push({ x: cx + tx, z: cz + tz, r: 3.4 * (p.kind === "capital" ? 1.4 : 1) }); } }
  // ---- docks for ports
  if (PORTS[p.id]) { for (var i = 0; i < 24; i++) { var a = i / 24 * Math.PI * 2; var ex = Math.cos(a) * R * 1.05, ez = Math.sin(a) * R * 1.05; if (inSea(ex, ez)) { var px = Math.cos(a) * R * 0.85, pz = Math.sin(a) * R * 0.85; pier(B, cx + px, cz + pz, -a, st); out.doors.push({ name: "Harbor", kind: "docks", x: cx + px, z: cz + pz, y: 1.2 }); out.bridges.push({ id: "d" + p.id, dock: true, x1: cx + px, z1: cz + pz, x2: cx + px + Math.cos(a) * 30, z2: cz + pz + Math.sin(a) * 30, w: 4, y1: 1.3, y2: 1.3, level: 0 }); break; } } }
  // ---- bridges where streets cross a river (Aurelia City has several): the same planner as the roads, so each deck is
  // anchored to the bank heights at both ends. The ring street is one closed polyline, not sixteen unrelated pieces.
  var bridgeN = 0; var lines = [];
  streets.forEach(function (s) { if (s.ring == null) lines.push({ pts: [[s.x1 + cx, s.z1 + cz], [s.x2 + cx, s.z2 + cz]], w: s.w }); });
  var ringPts = streets.filter(function (s) { return s.ring != null; }).map(function (s) { return [s.x1 + cx, s.z1 + cz]; }); if (ringPts.length) { ringPts.push(ringPts[0]); lines.push({ pts: ringPts, w: 4 }); }
  lines.forEach(function (ln) { planSpans(ln.pts, surf).forEach(function (b) { b.w = ln.w + 1.2; b.settlement = true; b.id = "s" + p.id + "." + (bridgeN++); out.bridges.push(addBridge(B, b, st)); }); });

  // ---- materials and meshes
  var group = new THREE.Group();
  var mainMat = patchBuildings(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.02, flatShading: true }));
  var m1 = new THREE.Mesh(B.build(), mainMat); m1.castShadow = true; m1.receiveShadow = true; group.add(m1); out.solid = m1.geometry; /* world-space building shell: the camera collides with it (game.tsx) */
  P.empty() || group.add(Object.assign(new THREE.Mesh(P.build(), mainMat), { castShadow: true, receiveShadow: true }));
  var winMat = new THREE.MeshStandardMaterial({ color: 0x1c1610, emissive: new THREE.Color(0xffb560), emissiveIntensity: 0.0, roughness: 0.5 });
  if (!W.empty()) { var wm = new THREE.Mesh(W.build(), winMat); group.add(wm); }
  // streets (cobble ribbons) and plaza disks
  if (!small) {
    var SB = new GeoBuilder(); var sc = paved ? [1.5, 1.45, 1.4] : [0.55, 0.45, 0.33];
    function streetY(x, z) { var h = surf(x, z) + 0.05; for (var bi = 0; bi < out.bridges.length; bi++) { var bb = out.bridges[bi]; var od = onDeck(bb, x, z, 0.25); if (od) h = Math.max(h, deckY(bb, od.t) + 0.05); } return h; }
    streets.forEach(function (s) { ribbon(SB, s.x1 + cx, s.z1 + cz, s.x2 + cx, s.z2 + cz, s.w, streetY, sc); });
    // the plaza disk follows the ground it sits on (rings of vertices, each set to the terrain surface)
    var pd = new THREE.RingGeometry(0.001, plazaR, 28, 6); pd.rotateX(-Math.PI / 2); var puv = pd.attributes.uv, ppos = pd.attributes.position; for (var ui = 0; ui < puv.count; ui++) { puv.setXY(ui, ppos.getX(ui) / 4, ppos.getZ(ui) / 4); ppos.setY(ui, surf(cx + ppos.getX(ui), cz + ppos.getZ(ui)) + 0.05); } pd.computeVertexNormals(); SB.add(pd, M(cx, 0, cz), sc);
    var smat = new THREE.MeshStandardMaterial({ vertexColors: true, map: paved ? cobbleTex() : null, bumpMap: paved ? cobbleTex() : null, bumpScale: 0.06, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    var sm = new THREE.Mesh(SB.build(), smat); sm.receiveShadow = true; group.add(sm);
  }
  // banners (textured planes) with the realm's sigil
  var bt = bannerTex(p.realm); var bmat = new THREE.MeshStandardMaterial({ map: bt, side: THREE.DoubleSide, roughness: 0.9, transparent: true, alphaTest: 0.1 });
  out.banners.slice(0, 26).forEach(function (b) { var pl = new THREE.Mesh(new THREE.PlaneGeometry(1.6 * b.s, 3.2 * b.s, 1, 4), bmat); pl.position.set(b.x + (b.front ? Math.sin(b.rot) * 0.3 : 0), b.y, b.z + (b.front ? Math.cos(b.rot) * 0.3 : 0)); pl.rotation.y = b.rot; pl.castShadow = true; pl.userData.banner = true; group.add(pl); });
  // lamp posts (emissive heads; the game turns them on at dusk)
  var LB = new GeoBuilder(), lampHeads = new GeoBuilder();
  out.lamps.forEach(function (l) { if (l.post) LB.add(prim("cyl6"), M(l.x, l.y - 3.4, l.z, 0, 0, 0, 0.22, 3.4, 0.22), C("#2a2622", 0)); lampHeads.add(prim("box"), M(l.x, l.y + 0.2, l.z, 0, 0.6, 0, 0.3, 0.42, 0.3), [1, 1, 1]); /* lantern: glass box under an iron cap with a base plate */ LB.add(prim("cone4"), M(l.x, l.y + 0.41, l.z, 0, 0.6, 0, 0.5, 0.28, 0.5), C("#2a2622", 0)); LB.add(prim("boxb"), M(l.x, l.y - 0.04, l.z, 0, 0.6, 0, 0.38, 0.05, 0.38), C("#2a2622", 0)); LB.add(prim("cyl6"), M(l.x, l.y + 0.69, l.z, 0, 0, 0, 0.06, 0.14, 0.06), C("#2a2622", 0)); });
  out.boards.forEach(function (b) { LB.add(prim("cyl6"), M(b.x - Math.cos(b.rot) * 1, b.y, b.z + Math.sin(b.rot) * 1, 0, 0, 0, 0.2, 2.6, 0.2), C("#4a3424", 0)); LB.add(prim("cyl6"), M(b.x + Math.cos(b.rot) * 1, b.y, b.z - Math.sin(b.rot) * 1, 0, 0, 0, 0.2, 2.6, 0.2), C("#4a3424", 0)); LB.add(prim("boxb"), M(b.x, b.y + 1.0, b.z, 0, b.rot, 0, 2.4, 1.5, 0.12), C("#6a4c30", 0.05)); for (var k = 0; k < 5; k++) LB.add(prim("box"), M(b.x + Math.sin(b.rot) * 0.08 + Math.cos(b.rot) * (k - 2) * 0.42, b.y + 1.5 + (k % 2) * 0.35, b.z + Math.cos(b.rot) * 0.08 - Math.sin(b.rot) * (k - 2) * 0.42, 0, b.rot, (k - 2) * 0.05, 0.34, 0.42, 0.02), C("#e8dcc0", 0.1)); out.colliders.push({ x: b.x, z: b.z, r: 1.1 }); });
  if (!LB.empty()) { var lm = new THREE.Mesh(LB.build(), mainMat); lm.castShadow = true; group.add(lm); }
  var lampMat = new THREE.MeshStandardMaterial({ color: 0x2a2014, emissive: new THREE.Color(0xffc070), emissiveIntensity: 0.2 });
  if (!lampHeads.empty()) group.add(new THREE.Mesh(lampHeads.build(), lampMat));
  // name sign above each district spot (only visible nearby)
  var labels = [];
  out.spots.forEach(function (s) { var sp = textSprite(s.name, { size: 30, scale: 0.012, color: "#e6cf8e" }); sp.position.set(s.x, s.y + 5, s.z); sp.visible = false; group.add(sp); labels.push(sp); });
  out.labels = labels;
  out.group = group; out.winMat = winMat; out.lampMat = lampMat; out.center = { x: cx, y: baseY, z: cz }; out.radius = R; out.place = p;
  return out;
}
function segDist(x, z, s) { var vx = s.x2 - s.x1, vz = s.z2 - s.z1, t = Math.max(0, Math.min(1, ((x - s.x1) * vx + (z - s.z1) * vz) / (vx * vx + vz * vz))); return Math.hypot(x - s.x1 - vx * t, z - s.z1 - vz * t); }
function gateName(p, a) { var deg = ((a * 180 / Math.PI) % 360 + 360) % 360; var dir = deg < 45 || deg > 315 ? "East" : deg < 135 ? "South" : deg < 225 ? "West" : "North"; if (p.id === "aurelia-city") return { North: "Kingsgate", East: "Eastgate", West: "Rivergate", South: "South Coach Gate" }[dir]; return dir + " Gate"; }

function buildHouse(B, W, P, p, st, x, y, z, rot, w, d, h, r, lowY) {
  if (lowY != null && y - lowY > 0.3) B.add(prim("boxb"), M(x, lowY - 0.4, z, 0, rot, 0, (p.realm === "Drakmor" ? w * 1.7 : w) + 0.12, y - lowY + 0.9, d + 0.12), C(st.stone, 0.1), true); /* foundation down to the lowest corner */
  if (p.realm === "Drakmor" && r() < 0.6) { longhouse(B, x, y, z, rot, w * 1.6, d, st, r); return; }
  if (p.realm === "Stonehold" && r() < 0.5) { B.add(prim("boxb"), M(x, y - 0.6, z, 0, rot, 0, w, h * 0.7 + 0.6, d), C(st.stone, 0.1), true); roof(B, x, y + h * 0.7, z, rot, w, d, st, r, "flat"); W.add(prim("boxb"), M(x + Math.sin(rot) * (d / 2 + 0.05), y + 1.5, z + Math.cos(rot) * (d / 2 + 0.05), 0, rot, 0, 0.6, 0.8, 0.06), [1, 1, 1]); return; }
  if (p.realm === "Sylvanor") { B.add(prim("cyl16"), M(x, y - 0.4, z, 0, 0, 0, w, h * 0.7, w), C(st.plaster, 0.1), true); B.add(prim("cone8"), M(x, y + h * 0.7 - 0.4, z, 0, r(), 0, w * 1.3, h * 0.6, w * 1.3), C(st.roof, 0.1), true); W.add(prim("boxb"), M(x + Math.sin(rot) * w * 0.5, y + 1.4, z + Math.cos(rot) * w * 0.5, 0, rot, 0, 0.6, 0.8, 0.06), [1, 1, 1]); return; }
  if (p.realm === "Umbral Reach" && r() < 0.25) { tower(B, x, y, z, Math.min(w, d) * 0.4, h * 2.2, st, h * 1.4, r); return; }
  house(B, W, x, y, z, rot, w, d, h, st, r);
}
function longhouse(B, x, y, z, rot, w, d, st, r) { B.add(prim("boxb"), M(x, y - 0.5, z, 0, rot, 0, w, 3.4, d), C(st.timber, 0.1), true); B.add(prim("roof"), M(x, y + 2.8, z, 0, rot + Math.PI / 2, 0, d + 1.2, d * 0.75, w + 0.6), C(st.roof, 0.06), true); var cs = Math.cos(rot), sn = Math.sin(rot); [-1, 1].forEach(function (sd) { B.add(prim("cone4"), M(x + sd * (w / 2 + 0.2) * cs, y + 2.8 + d * 0.62, z - sd * (w / 2 + 0.2) * sn, 0, rot, sd * 0.6, 0.3, 1.4, 0.3), C(st.timber)); }); }
function treeHall(B, W, x, y, z, s, r) { B.add(prim("cyl6"), M(x, y - 1, z, 0, 0, 0, 5 * s, 34 * s, 5 * s), C("#6a5236", 0.08), true); for (var i = 0; i < 3; i++) { var hy = y + (9 + i * 8) * s; B.add(prim("cyl16"), M(x, hy, z, 0, 0, 0, (14 - i * 3) * s, 0.6, (14 - i * 3) * s), C("#8a6a40"), true); B.add(prim("cone8"), M(x + 4 * s, hy + 0.6, z, 0, 0, 0, 5 * s, 4 * s, 5 * s), C("#3e6a3a"), true); W.add(prim("boxb"), M(x + 4 * s, hy + 1.4, z + 2.3 * s, 0, 0, 0, 0.6, 0.8, 0.06), [1, 1, 1]); } for (var i = 0; i < 5; i++) B.add(prim("sphere1"), M(x + (r() - 0.5) * 18 * s, y + (36 + r() * 6) * s, z + (r() - 0.5) * 18 * s, 0, 0, 0, 16 * s, 10 * s, 16 * s), C(r() < 0.5 ? "#3a6a2e" : "#4c7a34", 0.15), true); }
function pier(B, x, z, a, st) { var L = 30; var cs = Math.cos(a), sn = Math.sin(a); for (var t = 0; t < L; t += 4) { var px = x + Math.cos(-a) * t, pz = z + Math.sin(-a) * t; [-1, 1].forEach(function (sd) { B.add(prim("cyl6"), M(px + Math.sin(-a) * sd * 1.8, -3, pz - Math.cos(-a) * sd * 1.8, 0, 0, 0, 0.4, 4.4, 0.4), C("#3a2a1c")); }); } B.add(prim("boxb"), M(x + Math.cos(-a) * L / 2, 1.0, z + Math.sin(-a) * L / 2, 0, a, 0, L, 0.3, 4.2), C("#6a5038", 0.1), true); var bx = x + Math.cos(-a) * (L - 6) + Math.sin(-a) * 6, bz = z + Math.sin(-a) * (L - 6) - Math.cos(-a) * 6; ship(B, bx, bz, a); }
function ship(B, x, z, a) { B.add(prim("sphere"), M(x, 0.2, z, 0, a, 0, 12, 3.4, 4), C("#4a3424", 0.06), true); B.add(prim("boxb"), M(x, 1.0, z, 0, a, 0, 10, 0.3, 3.4), C("#7a5a3a")); B.add(prim("cyl6"), M(x, 1.0, z, 0, 0, 0, 0.4, 12, 0.4), C("#3a2a1c")); B.add(prim("boxb"), M(x, 4.5, z, 0, a + Math.PI / 2, 0, 0.1, 6, 5), C("#e8e0cc", 0.05)); }
// A bridge b = { x1, z1, x2, z2, y1, y2, w, level } from planSpans: a deck that runs straight between the two bank heights
// (so it meets the road flush at both ends), stone rails, and piers down to the river bed. The deck's walking surface is
// deckY(b, t); the slab is 0.9 m thick below it.
function addBridge(B, b, st) {
  var THREE = T(); var L = Math.hypot(b.x2 - b.x1, b.z2 - b.z1); if (L < 0.5) return b; var ux = (b.x2 - b.x1) / L, uz = (b.z2 - b.z1) / L, vx = -uz, vz = ux; var n = Math.max(1, Math.ceil(L / 2));
  function deck(t) { return b.y1 + (b.y2 - b.y1) * t; }
  function strip(o0, o1, dyBot, dyTop, col) {
    var P = [], N = []; function quad(a, bb, c, d, nx, ny, nz) { var e1 = [bb[0] - a[0], bb[1] - a[1], bb[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; var cx = e1[1] * e2[2] - e1[2] * e2[1], cy = e1[2] * e2[0] - e1[0] * e2[2], cz = e1[0] * e2[1] - e1[1] * e2[0]; var tri = (cx * nx + cy * ny + cz * nz) >= 0 ? [a, bb, c, a, c, d] : [a, c, bb, a, d, c]; tri.forEach(function (q) { P.push(q[0], q[1], q[2]); N.push(nx, ny, nz); }); }
    for (var i = 0; i < n; i++) {
      var t0 = i / n, t1 = (i + 1) / n; var ax = b.x1 + (b.x2 - b.x1) * t0, az = b.z1 + (b.z2 - b.z1) * t0, bx = b.x1 + (b.x2 - b.x1) * t1, bz = b.z1 + (b.z2 - b.z1) * t1; var y0 = deck(t0), y1 = deck(t1);
      var T00 = [ax + vx * o0, y0 + dyTop, az + vz * o0], T01 = [bx + vx * o0, y1 + dyTop, bz + vz * o0], T10 = [ax + vx * o1, y0 + dyTop, az + vz * o1], T11 = [bx + vx * o1, y1 + dyTop, bz + vz * o1];
      var B00 = [T00[0], y0 + dyBot, T00[2]], B01 = [T01[0], y1 + dyBot, T01[2]], B10 = [T10[0], y0 + dyBot, T10[2]], B11 = [T11[0], y1 + dyBot, T11[2]];
      quad(T00, T01, T11, T10, 0, 1, 0); quad(B00, B01, B11, B10, 0, -1, 0); quad(T00, T01, B01, B00, -vx, 0, -vz); quad(T10, T11, B11, B10, vx, 0, vz);
    }
    var g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); B.add(g, new THREE.Matrix4(), col); g.dispose();
  }
  var hw = b.w / 2; strip(-hw, hw, -0.9, 0, C(st.stone, 0.08));
  [-1, 1].forEach(function (sd) { strip(sd === -1 ? -hw : hw - 0.5, sd === -1 ? -hw + 0.5 : hw, 0, 0.95, C(st.stone, 0.06)); });
  // end posts and piers
  [0, 1].forEach(function (t) { [-1, 1].forEach(function (sd) { var x = b.x1 + (b.x2 - b.x1) * t + vx * sd * (hw - 0.25), z = b.z1 + (b.z2 - b.z1) * t + vz * sd * (hw - 0.25); B.add(prim("boxb"), M(x, deck(t), z, 0, Math.atan2(ux, uz), 0, 0.8, 1.35, 0.8), C(st.stone, 0.05)); }); });
  var np = L > 16 ? Math.floor(L / 12) : 0;
  for (var i = 1; i <= np; i++) { var t = i / (np + 1); var x = b.x1 + (b.x2 - b.x1) * t, z = b.z1 + (b.z2 - b.z1) * t; var bed = Math.min(b.level - 3, deck(t) - 6); B.add(prim("cyl6"), M(x, bed, z, 0, 0, 0, Math.min(2.4, b.w * 0.5), deck(t) - 0.9 - bed, Math.min(2.4, b.w * 0.5)), C(st.stone)); }
  return b;
}
export { addBridge };
export function ribbon(B, x1, z1, x2, z2, w, hfn, col) {
  var THREE = T(); var L = Math.hypot(x2 - x1, z2 - z1); var n = Math.max(1, Math.ceil(L / 3)); var nx = -(z2 - z1) / L * w / 2, nz = (x2 - x1) / L * w / 2;
  var pos = [], uv = []; for (var i = 0; i <= n; i++) { var t = i / n, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t; pos.push([x + nx, hfn(x + nx, z + nz), z + nz, x - nx, hfn(x - nx, z - nz), z - nz]); uv.push(t * L / 4); }
  var g = new THREE.BufferGeometry(); var P = [], U = [], N = [];
  for (var i = 0; i < n; i++) { var a = pos[i], b = pos[i + 1]; var quad = [[a[0], a[1], a[2], 0, uv[i]], [b[0], b[1], b[2], 0, uv[i + 1]], [a[3], a[4], a[5], w / 4, uv[i]], [a[3], a[4], a[5], w / 4, uv[i]], [b[0], b[1], b[2], 0, uv[i + 1]], [b[3], b[4], b[5], w / 4, uv[i + 1]]]; /* counter-clockwise from above */ quad.forEach(function (q) { P.push(q[0], q[1], q[2]); U.push(q[3], q[4]); N.push(0, 1, 0); }); }
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  B.add(g, new THREE.Matrix4(), col); g.dispose();
}
function ruinSite(B, p, st, cx, cz, gy, r, out) {
  var n = p.name.toLowerCase();
  if (/barrow|tomb|warren|vault|gullet|undervein|mine|chapel/.test(n) || p.kind === "dungeon") {
    // burial mound / cave mouth with a stone door
    var y0 = gy(0, 0); B.add(prim("dome"), M(cx, y0 - 2, cz, 0, 0, 0, 40, 18, 40), C(/warren|gullet/.test(n) ? "#4a4436" : "#5a6a40", 0.12), true);
    B.add(prim("boxb"), M(cx, y0 - 0.5, cz + 17, 0, 0, 0, 7, 7, 4), C(st.stone)); B.add(prim("boxb"), M(cx, y0, cz + 19.1, 0, 0, 0, 3.6, 4.6, 0.3), C("#0c0a0a", 0)); B.add(prim("boxb"), M(cx, y0 + 6.3, cz + 17, 0, 0, 0, 8.4, 1.2, 4.6), C(st.stone));
    for (var i = 0; i < 10; i++) { var a = r() * Math.PI * 2; addRock(B, cx + Math.cos(a) * (22 + r() * 8), y0, cz + Math.sin(a) * (22 + r() * 8), 1.2 + r() * 1.5, st.stone, r); }
    out.colliders.push({ x: cx, z: cz, r: 17 }); out.doors.push({ name: p.name, kind: "dungeon", x: cx, z: cz + 20.5, y: y0 }); out.lamps.push({ x: cx + 3, y: y0 + 4, z: cz + 19.5 });
    return;
  }
  // broken walls, toppled columns
  for (var i = 0; i < 14; i++) { var a = i / 14 * Math.PI * 2, rr = 12 + r() * 6; var x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr, y = gy(Math.cos(a) * rr, Math.sin(a) * rr); if (r() < 0.6) B.add(prim("boxb"), M(x, y - 0.5, z, 0, -a, (r() - 0.5) * 0.2, 5, 1 + r() * 6, 1.4), C(st.stone, 0.15), true); else B.add(prim("cyl6"), M(x, y, z, r() < 0.4 ? Math.PI / 2 : 0, r() * 3, 0, 1.2, 3 + r() * 5, 1.2), C(st.stone, 0.15)); }
  if (/tower|rook/.test(n)) tower(B, cx, gy(0, 0), cz, 4, 18, st, false, r);
  out.doors.push({ name: p.name, kind: "ruin", x: cx, z: cz, y: gy(0, 0) });
}
function landmarkSite(B, p, st, cx, cz, gy, r, out) {
  var n = p.name.toLowerCase(); var y0 = gy(0, 0);
  if (/glass/.test(n)) for (var i = 0; i < 30; i++) { var a = r() * 6.28, rr = r() * 60; B.add(prim("tetra"), M(cx + Math.cos(a) * rr, gy(Math.cos(a) * rr, Math.sin(a) * rr) + 1, cz + Math.sin(a) * rr, r() * 3, r() * 3, 0, 2 + r() * 5), C("#c8d8d0", 0.2), true); }
  else if (/march/.test(n)) for (var i = 0; i < 40; i++) { var a = r() * 6.28, rr = r() * 50; B.add(prim("boxb"), M(cx + Math.cos(a) * rr, gy(Math.cos(a) * rr, Math.sin(a) * rr), cz + Math.sin(a) * rr, 0, r() * 3, 0, 0.4, 1.2 + r(), 0.2), C("#c8c4b8")); }
  else if (/fleet/.test(n)) for (var i = 0; i < 6; i++) { var a = r() * 6.28; ship(B, cx + Math.cos(a) * 20, cz + Math.sin(a) * 20, r() * 3); }
  out.doors.push({ name: p.name, kind: "landmark", x: cx, z: cz, y: y0 });
}
