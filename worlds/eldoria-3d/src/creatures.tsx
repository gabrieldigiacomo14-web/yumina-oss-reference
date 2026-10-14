// @ts-nocheck
// Beasts, wyverns, serpents and crawlers. Bodies are lofted from elliptical rings along a
// spine (smooth barrels with deep chests, tapering necks, muzzles and tails), shaded from
// a darker back to a lighter belly with vertex colours. Limbs are jointed (hip, knee/hock,
// paw), jaws hinge open, wings fold and flap, tails and serpent bodies are pivot chains.
import { T, glowTex } from "./three";

// ------------------------------------------------------------------ geometry
// rings: [x, y, z, sideRadius, upRadius]; returns a closed, vertex-coloured BufferGeometry
function loft(rings, o) {
  var THREE = T(); o = o || {}; var RS = o.rs || 12; var pos = [], col = [], idx = [];
  var top = new THREE.Color(o.top || "#777777"), bot = new THREE.Color(o.bot || o.top || "#777777"), c = new THREE.Color();
  var V = THREE.Vector3; var t = new V(), side = new V(), up = new V(), hint = new V(o.hx || 0, o.hy == null ? 1 : o.hy, o.hz || 0);
  var n = rings.length;
  for (var i = 0; i < n; i++) {
    var r = rings[i], a = rings[Math.max(0, i - 1)], b = rings[Math.min(n - 1, i + 1)];
    t.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize(); side.crossVectors(t, hint); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize(); up.crossVectors(side, t).normalize();
    for (var k = 0; k <= RS; k++) { var ang = k / RS * Math.PI * 2, cs = Math.cos(ang), sn = Math.sin(ang); pos.push(r[0] + side.x * cs * r[3] + up.x * sn * r[4], r[1] + side.y * cs * r[3] + up.y * sn * r[4], r[2] + side.z * cs * r[3] + up.z * sn * r[4]); var sh = Math.pow((sn + 1) / 2, 0.8); c.copy(bot).lerp(top, sh); if (o.stripe && Math.sin(i * o.stripe) > 0.55 && sn > 0) c.multiplyScalar(0.62); col.push(c.r, c.g, c.b); }
  }
  for (var i2 = 0; i2 < n - 1; i2++) for (var k2 = 0; k2 < RS; k2++) { var p0 = i2 * (RS + 1) + k2, p1 = p0 + RS + 1; idx.push(p0, p1, p0 + 1, p0 + 1, p1, p1 + 1); }
  // caps
  [[0, -1], [n - 1, 1]].forEach(function (e) { var r = rings[e[0]]; var ci = pos.length / 3; pos.push(r[0], r[1], r[2]); var cc = col.slice(e[0] * (RS + 1) * 3, e[0] * (RS + 1) * 3 + 3); col.push(cc[0], cc[1], cc[2]); var base = e[0] * (RS + 1); for (var k = 0; k < RS; k++) { if (e[1] < 0) idx.push(ci, base + k + 1, base + k); else idx.push(ci, base + k, base + k + 1); } });
  var g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// sample a smooth path through control points [x,y,z,rs,ru] (Catmull-Rom on positions, linear radii)
function path(ctrl, n) {
  var out = []; for (var s = 0; s <= n; s++) { var u = s / n * (ctrl.length - 1); var i = Math.min(ctrl.length - 2, Math.floor(u)), f = u - i; var p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    var q = [0, 1, 2].map(function (k) { return 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * f + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f * f + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f * f * f); });
    var sf = f * f * (3 - 2 * f); out.push([q[0], q[1], q[2], p1[3] + (p2[3] - p1[3]) * sf, p1[4] + (p2[4] - p1[4]) * sf]); }
  return out;
}
var MAT = {};
function skin(rough) { var THREE = T(); var k = "v" + rough; return MAT[k] || (MAT[k] = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough || 0.85, metalness: 0 })); }
function flat(color, o) { var THREE = T(); var k = color + JSON.stringify(o || {}); return MAT[k] || (MAT[k] = new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(color), roughness: 0.7 }, o || {}))); }
function shade(hex, k) { var THREE = T(); var c = new THREE.Color(hex); var hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l * k))); return "#" + c.getHexString(); }
function M(geo, mat, parent, x, y, z) { var THREE = T(); var m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; if (parent) parent.add(m); return m; }
function G(parent, x, y, z) { var THREE = T(); var g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; }
function sph(r, w, h) { var THREE = T(); return new THREE.SphereGeometry(r, w || 10, h || 8); }
function cone(r, h, s) { var THREE = T(); var g = new THREE.ConeGeometry(r, h, s || 8); return g; }

// ------------------------------------------------------------------ species specs
var SPEC = {
  wolf: { len: 1.45, h: 0.82, g: 0.36, neck: 0.42, head: 0.42, muzzle: 1, ears: "point", tail: "bush", legs: 1 },
  jackal: { len: 1.25, h: 0.7, g: 0.3, neck: 0.38, head: 0.38, muzzle: 1.1, ears: "big", tail: "bush", legs: 1.05 },
  lion: { len: 1.7, h: 0.95, g: 0.46, neck: 0.4, head: 0.46, muzzle: 0.7, ears: "round", tail: "tuft", mane: true, legs: 1 },
  boar: { len: 1.45, h: 0.74, g: 0.52, neck: 0.25, head: 0.48, muzzle: 0.9, ears: "point", tail: "stub", tusks: true, bristle: true, legs: 0.85, front: 1.2 },
  bear: { len: 1.75, h: 1.0, g: 0.66, neck: 0.32, head: 0.48, muzzle: 0.65, ears: "round", tail: "stub", legs: 0.95, front: 1.1 },
  ram: { len: 1.35, h: 0.9, g: 0.46, neck: 0.36, head: 0.4, muzzle: 0.75, ears: "side", tail: "stub", horns: "curl", legs: 1, wool: true },
  stag: { len: 1.55, h: 1.15, g: 0.42, neck: 0.62, head: 0.44, muzzle: 0.85, ears: "side", tail: "stub", antlers: true, legs: 1.15 },
  lizard: { len: 1.6, h: 0.42, g: 0.34, neck: 0.3, head: 0.42, muzzle: 0.8, ears: null, tail: "long", sprawl: true, legs: 0.7 }
};
function speciesOf(n) { n = n.toLowerCase(); if (/jackal|hyena/.test(n)) return "jackal"; if (/lion|chimera|manticore/.test(n)) return "lion"; if (/boar|hog/.test(n)) return "boar"; if (/bear/.test(n)) return "bear"; if (/ram|goat/.test(n)) return "ram"; if (/stag|elk|deer/.test(n)) return "stag"; if (/salamander|lizard|basilisk|drake.*crawl/.test(n)) return "lizard"; return "wolf"; }

// ------------------------------------------------------------------ quadrupeds
function quadruped(mon, col, eyeM) {
  var THREE = T(); var sp = SPEC[speciesOf(mon.name)]; var nm = mon.name.toLowerCase();
  var back = shade(col, 0.72), belly = shade(col, 1.35); var L = sp.len, H = sp.h, g = sp.g, fr = sp.front || 1;
  var root = new THREE.Group(); var rig = G(root); var parts = { legs: [], tail: [] };
  // torso: rump → waist → deep chest → shoulders
  var torsoC = [[0, H + 0.02, -L * 0.52, g * 0.35, g * 0.3], [0, H + 0.04, -L * 0.42, g * 0.82, g * 0.82], [0, H + 0.02, -L * 0.15, g * 0.78, g * 0.86], [0, H - 0.01, L * 0.14, g * 0.92 * fr, g * 1.08 * fr], [0, H + 0.05, L * 0.38, g * 0.86 * fr, g * 1.0 * fr], [0, H + 0.1, L * 0.5, g * 0.5, g * 0.6]];
  if (sp.sprawl) torsoC = torsoC.map(function (r) { return [r[0], r[1], r[2], r[3] * 1.15, r[4] * 0.75]; });
  var torso = M(loft(path(torsoC, 14), { top: back, bot: belly, rs: 14, stripe: /tiger|stripe|sand/.test(nm) ? 2.2 : 0 }), skin(sp.wool ? 1 : 0.85), rig); parts.torso = torso;
  if (sp.wool) M(loft(path([[0, H + 0.06, -L * 0.42, g * 0.95, g * 0.92], [0, H + 0.04, 0, g * 1.05, g * 1.08], [0, H + 0.06, L * 0.36, g * 1.0, g * 1.05]], 8), { top: "#e8e0cc", bot: "#c8bea8", rs: 12 }), skin(1), rig);
  if (sp.bristle) for (var b = 0; b < 9; b++) { var cz = -L * 0.35 + b * L * 0.09; var cb = M(cone(0.05, 0.16 + Math.sin(b / 8 * Math.PI) * 0.12, 4), flat(shade(col, 0.45), { roughness: 1 }), rig, 0, H + g * (0.95 + Math.sin(b / 8 * Math.PI) * 0.12), cz); cb.rotation.x = -0.4; }
  // neck pivot and head
  var neck = G(rig, 0, H + 0.12, L * 0.42); parts.neck = neck;
  var nk = sp.neck; M(loft(path([[0, -0.04, -0.06, g * 0.6, g * 0.66], [0, nk * 0.45, nk * 0.32, g * 0.48, g * 0.5], [0, nk * 0.8, nk * 0.55, g * 0.4, g * 0.42]], 6), { top: back, bot: belly, rs: 12 }), skin(), neck);
  if (sp.mane) M(loft(path([[0, -0.05, -0.12, g * 0.95, g * 1.0], [0, nk * 0.4, nk * 0.3, g * 1.15, g * 1.2], [0, nk * 0.85, nk * 0.62, g * 1.0, g * 1.05], [0, nk * 1.05, nk * 0.78, g * 0.4, g * 0.45]], 8), { top: shade(col, 0.5), bot: shade(col, 0.65), rs: 14 }), skin(1), neck);
  var head = G(neck, 0, nk * 0.82, nk * 0.6); parts.head = head;
  var hl = sp.head, mz = sp.muzzle;
  M(loft(path([[0, 0.02, -hl * 0.32, hl * 0.22, hl * 0.22], [0, 0.04, -hl * 0.12, hl * 0.4, hl * 0.38], [0, 0.03, hl * 0.08, hl * 0.36, hl * 0.32], [0, -0.03, hl * (0.3 + 0.15 * mz), hl * 0.2, hl * 0.18], [0, -0.04, hl * (0.48 + 0.3 * mz), hl * 0.13, hl * 0.12], [0, -0.05, hl * (0.56 + 0.34 * mz), hl * 0.05, hl * 0.06]], 10), { top: back, bot: belly, rs: 12 }), skin(), head);
  var noseZ = hl * (0.54 + 0.34 * mz); M(sph(hl * 0.08, 8, 6), flat(sp.ears === null ? shade(col, 0.5) : "#1a1412", { roughness: 0.4 }), head, 0, -0.03, noseZ);
  // jaw hinges below the skull
  var jaw = G(head, 0, -hl * 0.12, -hl * 0.05); parts.jaw = jaw;
  M(loft(path([[0, 0, 0, hl * 0.28, hl * 0.12], [0, -0.02, hl * 0.25, hl * 0.22, hl * 0.1], [0, -0.03, hl * (0.4 + 0.28 * mz), hl * 0.11, hl * 0.06], [0, -0.02, hl * (0.5 + 0.3 * mz), hl * 0.03, hl * 0.03]], 6), { top: belly, bot: shade(belly, 0.9), rs: 10 }), skin(), jaw);
  if (/wolf|jackal|lion|bear|lizard/.test(speciesOf(nm))) [-1, 1].forEach(function (sd) { var f = M(cone(0.018, 0.07, 5), flat("#efe8d4", { roughness: 0.4 }), head, sd * hl * 0.09, -hl * 0.14, hl * (0.38 + 0.3 * mz)); f.rotation.x = Math.PI; });
  [-1, 1].forEach(function (sd) {
    var e = M(sph(hl * 0.06, 8, 6), eyeM, head, sd * hl * 0.25, hl * 0.12, hl * 0.18); e.castShadow = false;
    if (sp.ears === "point" || sp.ears === "big") { var ear = M(cone(hl * (sp.ears === "big" ? 0.17 : 0.12), hl * (sp.ears === "big" ? 0.42 : 0.32), 4), skin(), head, sd * hl * 0.22, hl * 0.36, -hl * 0.1); ear.scale.set(1, 1, 0.45); ear.rotation.z = -sd * 0.25; ear.geometry = loftEar(back, hl * (sp.ears === "big" ? 0.17 : 0.12), hl * (sp.ears === "big" ? 0.42 : 0.32)); ear.rotation.z = -sd * 0.25; }
    if (sp.ears === "round") { var er = M(sph(hl * 0.12, 8, 6), skin(), head, sd * hl * 0.3, hl * 0.32, -hl * 0.14); er.geometry = loft([[0, -0.01, 0, hl * 0.12, hl * 0.1], [0, 0.04, 0, hl * 0.12, hl * 0.12], [0, 0.07, 0, hl * 0.06, hl * 0.06]], { top: back, bot: back, rs: 8, hz: 1, hy: 0 }); }
    if (sp.ears === "side") { var es = M(loftEar(back, hl * 0.1, hl * 0.3), skin(), head, sd * hl * 0.3, hl * 0.22, -hl * 0.08); es.rotation.z = -sd * 1.3; es.scale.set(1, 1, 0.5); }
    if (sp.tusks) { var tk = M(cone(0.03, 0.22, 6), flat("#efe6cc", { roughness: 0.35 }), jaw, sd * hl * 0.16, 0.06, hl * (0.3 + 0.2 * mz)); tk.rotation.x = -0.5; tk.rotation.z = -sd * 0.35; }
    if (sp.horns === "curl") { var hr = new THREE.Mesh(new THREE.TorusGeometry(hl * 0.22, hl * 0.07, 6, 14, Math.PI * 1.5), flat("#c8bca0", { roughness: 0.6 })); hr.position.set(sd * hl * 0.3, hl * 0.25, -hl * 0.12); hr.rotation.y = Math.PI / 2; hr.rotation.z = Math.PI * 0.2; hr.castShadow = true; head.add(hr); }
    if (sp.antlers) { var tine = flat("#d8ccb0", { roughness: 0.7 }); var a0 = G(head, sd * hl * 0.16, hl * 0.32, -hl * 0.1); a0.rotation.z = -sd * 0.45; a0.rotation.x = -0.3; antler(a0, 0, 0.55, 0.035, tine, 3); }
    if (/horn|chimera|manticore/.test(nm) && !sp.horns && !sp.antlers) { var hn = M(cone(0.05, 0.3, 6), flat("#d8ccb0"), head, sd * hl * 0.18, hl * 0.4, -hl * 0.1); hn.rotation.x = -0.6; }
  });
  // legs: hip pivot → thigh → knee/hock pivot → shin → paw
  var legLen = H - 0.04; var up = legLen * 0.52, lo = legLen * 0.5; var thick = g * 0.55 * (sp.legs < 0.9 ? 1.2 : 1);
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function (q) {
    var front = q[1] > 0, sx = q[0] * g * (sp.sprawl ? 1.05 : 0.62), z = q[1] * L * (front ? 0.33 : 0.36);
    var hip = G(rig, sx, H - 0.02, z); var tw = thick * (front ? 1 : 1.15) * (front ? fr : 1);
    M(loft(path([[0, 0.08, 0, tw * 0.75, tw * 0.9], [0, -up * 0.45, front ? 0.02 : -0.04, tw * 0.55, tw * 0.62], [0, -up, 0, tw * 0.32, tw * 0.34]], 6), { top: back, bot: belly, rs: 10 }), skin(), hip);
    var knee = G(hip, 0, -up, 0);
    M(loft(path([[0, 0.03, 0, tw * 0.34, tw * 0.36], [0, -lo * 0.6, 0, tw * 0.24, tw * 0.25], [0, -lo + 0.04, 0.01, tw * 0.22, tw * 0.22]], 5), { top: back, bot: shade(belly, 0.9), rs: 8 }), skin(), knee);
    var paw = M(sph(1, 10, 6), flat(sp.antlers || sp.horns || sp.tusks ? "#2a2018" : shade(col, 0.55), { roughness: 0.8 }), knee, 0, -lo + 0.03, 0.04); paw.scale.set(tw * 0.32, tw * 0.18, tw * (sp.antlers || sp.horns || sp.tusks ? 0.3 : 0.48));
    if (sp.sprawl) { hip.rotation.z = q[0] * 0.9; knee.rotation.z = -q[0] * 1.2; }
    hip.userData.rest = front ? -0.05 : 0.22; knee.userData.rest = front ? 0.06 : -0.38; hip.rotation.x = hip.userData.rest; knee.rotation.x = knee.userData.rest;
    parts.legs.push({ hip: hip, knee: knee, front: front, side: q[0] });
  });
  // tail chain
  var tl = sp.tail; var tb = G(rig, 0, H + 0.06, -L * 0.5); var segN = tl === "long" ? 4 : tl === "stub" ? 1 : 3; var segL = tl === "long" ? L * 0.26 : tl === "stub" ? 0.14 : tl === "tuft" ? L * 0.2 : L * 0.17; var prev = tb;
  for (var s = 0; s < segN; s++) { var tj = G(prev, 0, 0, s ? -segL : 0); var r0 = tl === "bush" ? g * (0.22 + 0.12 * Math.sin((s + 0.5) / segN * Math.PI)) : tl === "long" ? g * 0.42 * (1 - s / segN) : g * 0.12 * (1 - s / segN * 0.5); var r1 = tl === "bush" ? g * (0.22 + 0.12 * Math.sin((s + 1.2) / segN * Math.PI)) : tl === "long" ? g * 0.42 * (1 - (s + 1) / segN) + 0.01 : r0 * 0.8;
    M(loft([[0, 0, 0.02, r0, r0], [0, 0, -segL * 0.5, (r0 + r1) / 2, (r0 + r1) / 2], [0, 0, -segL - 0.02, r1, r1]], { top: back, bot: belly, rs: 8 }), skin(tl === "bush" ? 1 : 0.85), tj);
    tj.rotation.x = s === 0 ? (tl === "long" ? 0.15 : tl === "stub" ? -0.6 : 0.7) : 0.18; parts.tail.push(tj); prev = tj; }
  if (tl === "tuft") M(sph(g * 0.16, 8, 6), flat(shade(col, 0.45), { roughness: 1 }), prev, 0, 0, -segL);
  return { root: root, rig: rig, parts: parts, height: H + nk + hl * 0.5, kind: "quad" };
}
function loftEar(col, r, h) { return loft([[0, 0, 0, r, r * 0.45], [0, h * 0.55, 0, r * 0.7, r * 0.32], [0, h, 0, 0.004, 0.004]], { top: col, bot: shade(col, 1.3), rs: 6, hz: 1, hy: 0 }); }
function antler(parent, y, len, r, mat, depth) {
  var THREE = T(); var seg = G(parent, 0, y, 0); var c = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r, len, 6), mat); c.position.y = len / 2; c.castShadow = true; seg.add(c);
  if (depth > 0) { var b = G(seg, 0, len * 0.6, 0); b.rotation.x = 0.7; antler(b, 0, len * 0.55, r * 0.7, mat, depth - 1); var t = G(seg, 0, len, 0); t.rotation.z = 0.3 * (depth % 2 ? 1 : -1); antler(t, 0, len * 0.7, r * 0.75, mat, depth - 1); }
}

// ------------------------------------------------------------------ winged (wyverns, drakes, griffons, rocs)
function winged(mon, col, eyeM) {
  var THREE = T(); var nm = mon.name.toLowerCase(); var bird = /griff|gryph|roc|gull/.test(nm);
  var back = shade(col, 0.7), belly = shade(col, 1.35); var root = new THREE.Group(); var rig = G(root); var parts = { legs: [], tail: [], wings: [] };
  var H = 1.25, L = 2.0, g = 0.5;
  parts.torso = M(loft(path([[0, H + 0.05, -L * 0.5, g * 0.3, g * 0.3], [0, H + 0.08, -L * 0.3, g * 0.75, g * 0.8], [0, H + 0.12, 0, g * 0.95, g * 1.05], [0, H + 0.22, L * 0.28, g * 0.85, g * 0.95], [0, H + 0.32, L * 0.42, g * 0.5, g * 0.55]], 12), { top: back, bot: belly, rs: 14 }), skin(bird ? 1 : 0.6), rig);
  var neck = G(rig, 0, H + 0.35, L * 0.38); parts.neck = neck;
  var nc = bird ? [[0, 0, 0, g * 0.5, g * 0.55], [0, 0.25, 0.15, g * 0.38, g * 0.4], [0, 0.42, 0.28, g * 0.32, g * 0.34]] : [[0, 0, 0, g * 0.5, g * 0.55], [0, 0.35, 0.25, g * 0.34, g * 0.36], [0, 0.75, 0.42, g * 0.28, g * 0.3], [0, 1.0, 0.72, g * 0.25, g * 0.27]];
  M(loft(path(nc, 10), { top: back, bot: belly, rs: 12 }), skin(), neck);
  var tip = nc[nc.length - 1]; var head = G(neck, 0, tip[1] + 0.02, tip[2] + 0.06); parts.head = head;
  if (bird) { M(loft(path([[0, 0, -0.2, 0.16, 0.17], [0, 0.03, 0, 0.22, 0.22], [0, 0.01, 0.18, 0.15, 0.15]], 6), { top: "#f0ece0", bot: "#d8d0c0", rs: 12 }), skin(1), head); var bk = M(cone(0.08, 0.3, 6), flat("#e0b030", { roughness: 0.4 }), head, 0, -0.02, 0.32); bk.rotation.x = Math.PI / 2 + 0.35; parts.jaw = G(head, 0, -0.04, 0.12); }
  else {
    M(loft(path([[0, 0.02, -0.22, 0.12, 0.12], [0, 0.05, -0.05, 0.2, 0.18], [0, 0.0, 0.22, 0.14, 0.12], [0, -0.03, 0.46, 0.07, 0.06]], 8), { top: back, bot: belly, rs: 12 }), skin(0.6), head);
    var jaw = G(head, 0, -0.07, -0.06); parts.jaw = jaw; M(loft(path([[0, 0, 0, 0.15, 0.06], [0, -0.02, 0.3, 0.08, 0.04], [0, -0.01, 0.5, 0.02, 0.02]], 5), { top: belly, bot: belly, rs: 8 }), skin(0.6), jaw);
    [-1, 1].forEach(function (sd) { var hr = M(cone(0.045, 0.42, 6), flat("#e0d8c0", { roughness: 0.5 }), head, sd * 0.1, 0.14, -0.18); hr.rotation.x = -1.9; hr.rotation.z = sd * 0.25; });
  }
  [-1, 1].forEach(function (sd) { var e = M(sph(0.035, 8, 6), eyeM, head, sd * 0.13, 0.08, 0.08); e.castShadow = false; });
  // wings: arm + forearm + three spars, membrane between them
  [-1, 1].forEach(function (sd) {
    var sh = G(rig, sd * g * 0.7, H + 0.35, L * 0.18); var arm = flat(back, { roughness: 0.6 });
    var u = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.9, 6), arm); u.rotation.z = Math.PI / 2; u.position.x = sd * 0.45; u.castShadow = true; sh.add(u);
    var fore = G(sh, sd * 0.9, 0, 0); var f = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.9, 6), arm); f.rotation.z = Math.PI / 2; f.position.x = sd * 0.45; fore.add(f);
    var tips = [[sd * 1.8, 0.1, -0.2], [sd * 1.6, -0.05, -0.75], [sd * 1.1, -0.1, -1.15]];
    tips.forEach(function (t) { var d = new THREE.Vector3(t[0] - sd * 0.9, t[1], t[2]); var len = d.length(); var spar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.025, len, 5), arm); spar.position.set(sd * 0.9 + d.x / 2, d.y / 2, d.z / 2); spar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); fore.add(spar); });
    // membrane in the forearm's frame (fan from the wrist), plus the inner panel from body to arm
    var P = [sd * 0.9, 0, 0].concat(tips[0], tips[1], tips[2]); var mem = new THREE.BufferGeometry(); mem.setAttribute("position", new THREE.Float32BufferAttribute([sd * 0.9, 0, 0].concat(tips[0], tips[1], sd * 0.9, 0, 0).concat(tips[1], tips[2], sd * 0.9, 0, 0).concat(tips[2], [0, -0.05, -0.35]), 3)); mem.computeVertexNormals();
    var memM = bird ? flat(shade(col, 0.95), { side: THREE.DoubleSide, roughness: 1 }) : flat(shade(col, 0.6), { side: THREE.DoubleSide, roughness: 0.8, transparent: true, opacity: 0.92 });
    var mm = new THREE.Mesh(mem, memM); mm.castShadow = true; fore.add(mm);
    var inner = new THREE.BufferGeometry(); inner.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, sd * 0.9, 0, 0, sd * 0.2, -0.1, -0.9, sd * 0.9, 0, 0, sd * 1.15, -0.1, -1.0, sd * 0.2, -0.1, -0.9], 3)); inner.computeVertexNormals(); var im = new THREE.Mesh(inner, memM); im.castShadow = true; sh.add(im);
    if (bird) for (var k = 0; k < 7; k++) { var fe = M(cone(0.09, 0.7, 4), flat(shade(col, 0.85 - k * 0.04), { roughness: 1 }), fore, sd * (0.9 + k * 0.14), -0.02, -0.3 - k * 0.07); fe.rotation.x = -Math.PI / 2 - 0.2; fe.scale.set(1, 1, 0.25); }
    parts.wings.push({ sh: sh, fore: fore, side: sd });
  });
  // hind legs with taloned feet
  [-1, 1].forEach(function (sd) {
    var hip = G(rig, sd * g * 0.62, H, -L * 0.15); M(loft(path([[0, 0.1, 0, 0.22, 0.26], [0, -0.3, 0.08, 0.15, 0.17], [0, -0.6, 0, 0.1, 0.1]], 6), { top: back, bot: belly, rs: 10 }), skin(), hip);
    var knee = G(hip, 0, -0.6, 0); M(loft(path([[0, 0.02, 0, 0.1, 0.1], [0, -0.3, -0.08, 0.07, 0.07], [0, -0.58, 0, 0.06, 0.06]], 5), { top: back, bot: belly, rs: 8 }), skin(), knee);
    for (var c = -1; c <= 1; c++) { var cl = M(cone(0.03, 0.22, 5), flat("#2a2420"), knee, c * 0.06, -0.6, 0.1); cl.rotation.x = Math.PI / 2 + 0.3; cl.rotation.y = c * 0.4; }
    hip.userData.rest = 0.25; knee.userData.rest = -0.35; hip.rotation.x = 0.25; knee.rotation.x = -0.35; parts.legs.push({ hip: hip, knee: knee, front: false, side: sd });
  });
  // tail chain with a spade (wyrms) or a feather fan (birds)
  var prev = G(rig, 0, H + 0.06, -L * 0.48); for (var s = 0; s < 5; s++) { var tj = G(prev, 0, 0, s ? -0.38 : 0); var r0 = g * 0.32 * (1 - s / 5), r1 = g * 0.32 * (1 - (s + 1) / 5) + 0.015; M(loft([[0, 0, 0.03, r0, r0], [0, 0, -0.4, r1, r1]], { top: back, bot: belly, rs: 8 }), skin(), tj); tj.rotation.x = s ? 0.08 : -0.1; parts.tail.push(tj); prev = tj; }
  if (bird) for (var k2 = -2; k2 <= 2; k2++) { var ff = M(cone(0.1, 0.8, 4), flat(shade(col, 0.8), { roughness: 1 }), prev, k2 * 0.09, 0, -0.5); ff.rotation.x = -Math.PI / 2; ff.rotation.z = k2 * 0.18; ff.scale.set(1, 1, 0.2); }
  else { var spade = M(cone(0.16, 0.3, 4), flat(shade(col, 0.6)), prev, 0, 0, -0.5); spade.rotation.x = -Math.PI / 2; spade.scale.set(1, 1, 0.25); }
  return { root: root, rig: rig, parts: parts, height: H + 1.1, kind: "winged" };
}

// ------------------------------------------------------------------ serpents, worms, eels
function serpent(mon, col, eyeM) {
  var THREE = T(); var back = shade(col, 0.7), belly = shade(col, 1.4); var root = new THREE.Group(); var rig = G(root); var parts = { segs: [], tail: [] };
  var N = 9, sl = 0.55, r = 0.38; var prev = G(rig, 0, 0.42, 0.9); parts.head = prev;
  // head with hinged jaw
  M(loft(path([[0, 0.02, -0.25, r * 0.9, r * 0.8], [0, 0.04, 0, r * 1.05, r * 0.85], [0, 0.0, 0.3, r * 0.7, r * 0.5], [0, -0.02, 0.5, r * 0.3, r * 0.25]], 8), { top: back, bot: belly, rs: 12 }), skin(0.5), prev);
  var jaw = G(prev, 0, -r * 0.35, -0.1); parts.jaw = jaw; M(loft(path([[0, 0, 0, r * 0.75, r * 0.25], [0, -0.02, 0.35, r * 0.5, r * 0.18], [0, 0, 0.55, r * 0.15, r * 0.1]], 5), { top: belly, bot: belly, rs: 10 }), skin(0.5), jaw);
  [-1, 1].forEach(function (sd) { var e = M(sph(0.05, 8, 6), eyeM, prev, sd * r * 0.62, r * 0.4, 0.12); e.castShadow = false; var f = M(cone(0.025, 0.12, 5), flat("#efe8d4"), prev, sd * r * 0.4, -r * 0.3, 0.4); f.rotation.x = Math.PI; });
  var body = G(rig, 0, 0.42, 0.75); parts.body = body; var link = body;
  for (var i = 0; i < N; i++) { var j = G(link, 0, 0, i ? -sl : 0); var ra = r * (1 - i / N * 0.75), rb = r * (1 - (i + 1) / N * 0.75); M(loft([[0, 0, 0.08, ra, ra * 0.92], [0, 0, -sl * 0.5, (ra + rb) / 2 * 1.04, (ra + rb) / 2 * 0.95], [0, 0, -sl - 0.08, rb, rb * 0.92]], { top: back, bot: belly, rs: 10, stripe: 3 }), skin(0.55), j); parts.segs.push(j); link = j; }
  return { root: root, rig: rig, parts: parts, height: 1.0, kind: "serpent" };
}

// ------------------------------------------------------------------ crawlers: scorpions, spiders, mantises
function crawler(mon, col, eyeM) {
  var THREE = T(); var nm = mon.name.toLowerCase(); var scorp = /scorpion|stalker/.test(nm), spider = /widow|spider/.test(nm), mantis = /mantis/.test(nm);
  var back = shade(col, 0.7), belly = shade(col, 1.25), dark = shade(col, 0.45); var root = new THREE.Group(); var rig = G(root); var parts = { legs: [], tail: [] }; var H = mantis ? 0.75 : 0.55;
  parts.torso = M(loft(path([[0, H, 0.55, 0.1, 0.08], [0, H + 0.04, 0.35, 0.34, 0.2], [0, H + 0.05, 0.0, 0.4, 0.22], [0, H + 0.02, -0.3, 0.3, 0.16]], 8), { top: back, bot: belly, rs: 12 }), skin(0.45), rig);
  var abd = spider ? [[0, H + 0.1, -0.25, 0.25, 0.25], [0, H + 0.3, -0.65, 0.62, 0.55], [0, H + 0.28, -1.05, 0.5, 0.45], [0, H + 0.2, -1.3, 0.1, 0.1]] : mantis ? [[0, H, -0.25, 0.18, 0.16], [0, H - 0.05, -0.8, 0.26, 0.22], [0, H - 0.12, -1.3, 0.1, 0.1]] : [[0, H, -0.25, 0.32, 0.17], [0, H, -0.6, 0.34, 0.17], [0, H, -0.9, 0.24, 0.13]];
  M(loft(path(abd, 10), { top: spider ? "#141012" : back, bot: belly, rs: 12, stripe: scorp ? 6 : 0 }), skin(0.4), rig);
  if (spider) { var hg = M(sph(0.12, 8, 6), flat("#b02018", { emissive: new THREE.Color("#400806") }), rig, 0, H + 0.42, -0.75); hg.scale.set(1, 0.4, 1.4); }
  var head = G(rig, 0, H + (mantis ? 0.45 : 0.02), 0.55); parts.head = head;
  if (mantis) { var neck = M(loft(path([[0, -0.45, -0.2, 0.12, 0.1], [0, -0.1, 0, 0.1, 0.1], [0, 0, 0.02, 0.06, 0.06]], 5), { top: back, bot: belly, rs: 8 }), skin(0.5), head); M(cone(0.16, 0.22, 3), skin(0.5), head, 0, 0.05, 0.06).rotation.x = Math.PI; }
  [-1, 1].forEach(function (sd) { for (var e = 0; e < (spider ? 2 : 1); e++) { var ey = M(sph(spider ? 0.03 : 0.05, 8, 6), eyeM, head, sd * (0.08 + e * 0.06), 0.06 + e * 0.02, 0.05 - e * 0.04); ey.castShadow = false; } });
  var jaw = G(head, 0, -0.02, 0.08); parts.jaw = jaw; [-1, 1].forEach(function (sd) { var mdb = M(cone(0.035, 0.16, 5), flat(dark), jaw, sd * 0.06, 0, 0.06); mdb.rotation.x = Math.PI / 2; mdb.rotation.z = sd * 0.3; });
  // legs: coxa pivot → femur (up and out) → tibia (down)
  var pairs = spider || scorp ? 4 : 2;
  for (var i = 0; i < pairs; i++) [-1, 1].forEach(function (sd) {
    var z = 0.3 - i * (spider ? 0.2 : 0.22) - (mantis ? 0.35 : 0); var hip = G(rig, sd * 0.3, H, z); hip.rotation.y = sd * (0.35 - i * 0.28) * -1;
    var fem = spider ? 0.62 : 0.45, tib = spider ? 0.8 : 0.55;
    M(loft(path([[0, 0, 0, 0.05, 0.05], [sd * fem * 0.5, fem * 0.35, 0, 0.045, 0.045], [sd * fem, fem * 0.45, 0, 0.035, 0.035]], 5), { top: dark, bot: back, rs: 6 }), skin(0.45), hip);
    var knee = G(hip, sd * fem, fem * 0.45, 0); M(loft(path([[0, 0, 0, 0.035, 0.035], [sd * tib * 0.25, -tib * 0.55, 0, 0.028, 0.028], [sd * tib * 0.32, -H - fem * 0.45 + 0.02, 0, 0.012, 0.012]], 5), { top: dark, bot: back, rs: 6 }), skin(0.45), knee);
    hip.userData.rest = 0; knee.userData.rest = 0; parts.legs.push({ hip: hip, knee: knee, front: i < pairs / 2, side: sd, bug: true, i: i });
  });
  // pincers (scorpions) or raptorial forelegs (mantises)
  if (scorp || mantis) { parts.claws = []; [-1, 1].forEach(function (sd) {
    var arm = G(rig, sd * 0.25, H + (mantis ? 0.35 : 0.04), mantis ? 0.3 : 0.5); M(loft(path([[0, 0, 0, 0.06, 0.06], [sd * 0.12, 0.05, 0.3, 0.06, 0.06], [sd * 0.08, 0.05, 0.5, 0.05, 0.05]], 6), { top: back, bot: belly, rs: 8 }), skin(0.45), arm);
    var claw = G(arm, sd * 0.08, 0.05, 0.5); M(loft(path([[0, 0, 0, 0.1, 0.07], [0, 0, 0.2, 0.12, 0.08], [sd * 0.02, 0, 0.42, 0.03, 0.03]], 6), { top: back, bot: belly, rs: 8 }), skin(0.45), claw);
    var finger = G(claw, sd * 0.07, 0, 0.12); M(loft(path([[0, 0, 0, 0.04, 0.035], [sd * 0.02, 0, 0.18, 0.03, 0.025], [0, 0, 0.3, 0.008, 0.008]], 5), { top: back, bot: belly, rs: 6 }), skin(0.45), finger);
    arm.rotation.y = -sd * 0.35; parts.claws.push({ arm: arm, finger: finger, side: sd }); }); }
  // scorpion tail arching over the back, ending in a stinger
  if (scorp || /widow/.test(nm) && false) { var prev = G(rig, 0, H + 0.04, -0.85); for (var s = 0; s < 5; s++) { var tj = G(prev, 0, 0, s ? -0.3 : 0); var rr = 0.13 - s * 0.015; M(loft([[0, 0, 0.04, rr, rr * 0.9], [0, 0, -0.17, rr * 1.1, rr], [0, 0, -0.32, rr * 0.9, rr * 0.85]], { top: back, bot: belly, rs: 8 }), skin(0.45), tj); tj.rotation.x = s === 0 ? -0.5 : -0.62; parts.tail.push(tj); prev = tj; }
    var st = M(cone(0.06, 0.26, 6), flat("#d8c060", { roughness: 0.3 }), prev, 0, -0.06, -0.38); st.rotation.x = -Math.PI / 2 - 0.9; }
  return { root: root, rig: rig, parts: parts, height: H + 0.6, kind: "bug" };
}

// ------------------------------------------------------------------ entry
export function makeBeast(mon, arch, col) {
  var THREE = T(); var undead = /umbral|wight|ghast|lich|draugr|revenant|knight|ghoul|skeleton/.test(mon.name.toLowerCase());
  var eyeM = flat("#ffd060", { emissive: new THREE.Color(undead ? "#60ffe0" : "#ffb020"), emissiveIntensity: 1.6 });
  var b = arch === "winged" ? winged(mon, col, eyeM) : arch === "serpent" ? serpent(mon, col, eyeM) : arch === "bug" ? crawler(mon, col, eyeM) : quadruped(mon, col, eyeM);
  b.root.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
  return b;
}

// ------------------------------------------------------------------ animation
export function animateBeast(c, dt, st) {
  var p = c.parts; var t = c.t; var sp = st.speed || 0; var w = Math.min(1, sp); var rig = c.root.children[0];
  c.ph = (c.ph || 0) + dt * (w > 0.02 ? 5 + sp * 3.2 : 0); var ph = c.ph;
  var atk = 0; if (st.attack) { var u = Math.min(1, st.attackT / (st.attackDur || 0.6)); atk = u < 0.35 ? -0.3 * (u / 0.35) : u < 0.55 ? -0.3 + 1.3 * ((u - 0.35) / 0.2) : 1 - (u - 0.55) / 0.45; }
  // legs
  if (p.legs) p.legs.forEach(function (lg) {
    if (lg.bug) { var off = (lg.i % 2 ? Math.PI : 0) + (lg.side > 0 ? Math.PI : 0); var s2 = Math.sin(ph * 1.4 + off); lg.hip.rotation.y = (lg.hip.userData.ry == null ? (lg.hip.userData.ry = lg.hip.rotation.y) : lg.hip.userData.ry) + s2 * 0.35 * w; lg.hip.rotation.z = Math.max(0, Math.cos(ph * 1.4 + off)) * 0.25 * w * lg.side + Math.sin(t * 2 + lg.i) * 0.02; return; }
    var diag = (lg.front ? 0 : Math.PI) + (lg.side > 0 ? Math.PI : 0); var s = Math.sin(ph + diag), cph = Math.cos(ph + diag);
    var amp = (c.kind === "winged" ? 0.45 : 0.55) * w; lg.hip.rotation.x = lg.hip.userData.rest + s * amp - (lg.front ? atk * 0.25 : -atk * 0.15);
    var lift = Math.max(0, cph) * (lg.front ? 0.9 : -0.8) * w; lg.knee.rotation.x = lg.knee.userData.rest + lift + (st.combat && !w ? (lg.front ? 0.08 : -0.12) : 0);
  });
  // body bob, breathing, combat crouch
  var bob = Math.abs(Math.sin(ph)) * 0.05 * w; var breath = Math.sin(t * 1.9) * 0.012 * (1 - w);
  if (p.torso) { p.torso.scale.set(1 + breath, 1 + breath, 1); }
  var crouch = st.combat && !st.dead ? 0.04 : 0;
  // head: looks about when idle, lowers in combat, lunges on attack
  if (p.neck) { p.neck.rotation.x = (st.combat ? 0.22 : 0) - atk * 0.35 + Math.sin(ph * 2) * 0.05 * w; p.neck.rotation.y = (1 - w) * Math.sin(t * 0.4 + c.seed) * 0.35 * (st.combat ? 0.3 : 1); }
  if (p.head && p.neck) p.head.rotation.x = -atk * 0.3 + (st.combat ? -0.12 : 0);
  if (p.jaw) p.jaw.rotation.x = Math.max(0, atk) * 0.75 + (st.combat ? 0.08 + Math.max(0, Math.sin(t * 3)) * 0.06 : 0);
  if (p.claws) p.claws.forEach(function (cl) { cl.arm.rotation.x = -atk * 0.4 + Math.sin(t * 2 + cl.side) * 0.04; cl.finger.rotation.y = cl.side * (0.15 + Math.max(0, Math.sin(t * 3 + cl.side)) * 0.25 + Math.max(0, -atk) * 0.6); });
  // tail
  if (p.tail && p.tail.length) p.tail.forEach(function (tj, i) { tj.rotation.y = Math.sin(t * (st.combat ? 4 : 2.2) - i * 0.6) * (c.kind === "bug" ? 0.06 : 0.22) * (1 + w * 0.5); if (c.kind === "bug") tj.rotation.x = (i === 0 ? -0.5 : -0.62) - Math.max(0, atk) * (i === 0 ? 0.2 : 0.18); });
  // wings: folded at rest, spread in combat, beating in flight or when striking
  if (p.wings) p.wings.forEach(function (wg) { var spread = st.combat || st.flying ? 1 : 0.15; var beat = st.flying ? Math.sin(t * 6) * 0.7 : st.combat ? Math.sin(t * 1.6) * 0.12 + Math.max(0, atk) * 0.5 : Math.sin(t * 1.1) * 0.04; wg.sh.rotation.z = wg.side * (-0.15 + beat) * spread + wg.side * (1 - spread) * 0.9; wg.sh.rotation.y = wg.side * (1 - spread) * 0.9; wg.fore.rotation.y = -wg.side * (1 - spread) * 1.6; });
  // serpents undulate
  if (p.segs) { p.segs.forEach(function (sg, i) { sg.rotation.y = Math.sin(t * (2.2 + sp) - i * 0.75) * (0.18 + w * 0.12); }); if (p.head) { p.head.rotation.y = Math.sin(t * 1.4) * 0.15; p.head.rotation.x = -0.1 - atk * 0.4; p.head.position.y = 0.42 + (st.combat ? 0.35 : 0) + Math.max(0, -atk) * 0.25; } if (p.body) p.body.position.y = 0.42; }
  // lunge and recoil
  var hit = st.hitT > 0 ? Math.sin(Math.min(1, (0.3 - st.hitT) / 0.3) * Math.PI) : 0;
  rig.position.z = atk * 0.5 * (c.size || 1) - hit * 0.3; rig.position.y = bob - crouch; rig.rotation.x = -atk * 0.1 - hit * 0.15;
}
