// @ts-nocheck
// Skinned character bodies. A humanoid is one smooth skin mesh on a real bone skeleton,
// dressed in skinned clothing/armour layers, with a sculpted head (painted face texture,
// eyes, nose, ears) and hair built from strand clumps. Bones keep the joint names the
// animation system uses (hips, spine, chest, neck, head, hip/knee, shoulder/elbow/hand).
import { T } from "./three";
import { rng, hashStr } from "./worldgen";

// ------------------------------------------------------------------ geometry builder with skin attributes
function SB() { this.p = []; this.uv = []; this.si = []; this.sw = []; this.ix = []; this.n = 0; }
SB.prototype.v = function (x, y, z, u, v, w) { this.p.push(x, y, z); this.uv.push(u, v); this.si.push(w[0], w[1], 0, 0); this.sw.push(w[2], w[3], 0, 0); return this.n++; };
SB.prototype.tri = function (a, b, c) { this.ix.push(a, b, c); };
SB.prototype.geo = function (skinned) {
  var THREE = T(); var g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
  if (skinned) { g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(this.si, 4)); g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(this.sw, 4)); }
  g.setIndex(this.ix); g.computeVertexNormals(); g.computeBoundingSphere(); if (g.boundingSphere) g.boundingSphere.radius *= 1.35; return g;
};
function smooth01(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
// stops: [[y, boneIndex], ...] sorted by y ascending -> blended weights at height y
function weightsAt(stops, y) {
  if (y <= stops[0][0]) return [stops[0][1], 0, 1, 0];
  for (var i = 0; i < stops.length - 1; i++) { var a = stops[i], b = stops[i + 1]; if (y <= b[0]) { if (a[1] === b[1]) return [a[1], 0, 1, 0]; var t = smooth01((y - a[0]) / (b[0] - a[0])); return [a[1], b[1], 1 - t, t]; } }
  var l = stops[stops.length - 1]; return [l[1], 0, 1, 0];
}
// A tube of horizontal elliptical rings: rings = [[y, cx, cz, rx, rz], ...] bottom → top.
// LOD: 1 = full detail (player, creator, portraits), 0 = light (crowds and monsters)
var LOD = 1;
function tube(B, rings, stops, opt) {
  opt = opt || {}; var RS = Math.max(6, Math.round((opt.rs || 16) * (LOD ? 1 : 0.5))), base = B.n, n = rings.length;
  for (var i = 0; i < n; i++) { var r = rings[i]; for (var k = 0; k <= RS; k++) { var a = k / RS * Math.PI * 2; var x = r[1] + Math.sin(a) * r[3], z = r[2] + Math.cos(a) * r[4]; var w = opt.wfn ? opt.wfn(x, r[0], z) : weightsAt(stops, r[0]); B.v(x, r[0], z, k / RS, i / (n - 1), w); } }
  for (var i = 0; i < n - 1; i++) for (var k = 0; k < RS; k++) { var a = base + i * (RS + 1) + k, b = a + RS + 1; B.tri(a, a + 1, b); B.tri(b, a + 1, b + 1); }
  if (opt.capBottom) { var r0 = rings[0]; var c = B.v(r0[1], r0[0] - (opt.capBottom === true ? 0 : opt.capBottom), r0[2], 0.5, 0, opt.wfn ? opt.wfn(r0[1], r0[0], r0[2]) : weightsAt(stops, r0[0])); for (var k = 0; k < RS; k++) B.tri(base + k + 1, base + k, c); }
  if (opt.capTop) { var rt = rings[n - 1]; var c2 = B.v(rt[1], rt[0] + (opt.capTop === true ? 0 : opt.capTop), rt[2], 0.5, 1, opt.wfn ? opt.wfn(rt[1], rt[0], rt[2]) : weightsAt(stops, rt[0])); var o = base + (n - 1) * (RS + 1); for (var k = 0; k < RS; k++) B.tri(o + k, o + k + 1, c2); }
}
// Interpolate a profile [[y, rx, rz], ...] (ascending y) and emit rings with dense sampling.
function profile(pts, cx, cz, kx, kz, samples, y0, y1) {
  var out = [], N = Math.max(4, Math.round((samples || 18) * (LOD ? 1 : 0.45))); y0 = y0 == null ? pts[0][0] : y0; y1 = y1 == null ? pts[pts.length - 1][0] : y1;
  for (var s = 0; s <= N; s++) { var y = y0 + (y1 - y0) * s / N; var j = 0; while (j < pts.length - 2 && y > pts[j + 1][0]) j++; var a = pts[j], b = pts[j + 1]; var t = smooth01((y - a[0]) / (b[0] - a[0] || 1)); var rx = a[1] + (b[1] - a[1]) * t, rz = a[2] + (b[2] - a[2]) * t; out.push([y, typeof cx === "function" ? cx(y) : cx, typeof cz === "function" ? cz(y) : cz, rx * kx, rz * kz]); }
  return out;
}

// bone indices
var B_HIPS = 0, B_SPINE = 1, B_CHEST = 2, B_NECK = 3, B_HEAD = 4, B_LHIP = 5, B_LKNEE = 6, B_RHIP = 7, B_RKNEE = 8, B_LSH = 9, B_LEL = 10, B_LHAND = 11, B_RSH = 12, B_REL = 13, B_RHAND = 14;

// Body proportions for a look; all heights in metres-ish rig units before overall scale.
export function proportions(look) {
  var species = look.species || "Human", female = look.gender === "Female";
  var buildI = Math.max(0, ["Slender", "Lean", "Athletic", "Sturdy", "Broad"].indexOf(look.build || "Athletic"));
  var bw = [0.88, 0.94, 1.0, 1.08, 1.17][buildI]; if (species === "Dwarf") bw *= 1.2; if (species === "Orc-Blooded") bw *= 1.12; if (species === "Elf") bw *= 0.94; if (female) bw *= 0.92;
  var legH = species === "Dwarf" ? 0.78 : species === "Halfling" ? 0.88 : species === "Elf" ? 1.04 : 1;
  var thigh = 0.46 * legH, shin = 0.44 * legH, ankle = 0.07; var hipY = ankle + thigh + shin;
  return { bw: bw, legH: legH, female: female, species: species, thigh: thigh, shin: shin, ankle: ankle, hipY: hipY, torso: species === "Dwarf" ? 0.6 : 0.64, shx: 0.176 * bw * (female ? 0.93 : 1), hipx: 0.088 * bw * (female ? 1.08 : 1), upper: 0.29, fore: 0.27 };
}
// Joint positions (rig space) for the bind pose.
function joints(P) {
  var hy = P.hipY, chestY = hy + 0.02 + P.torso, neckY = chestY + 0.035, headY = neckY + 0.13;
  return { hipY: hy, spineY: hy + 0.02, chestY: chestY, neckY: neckY, headY: headY, kneeY: hy - P.thigh, ankleY: hy - P.thigh - P.shin, shY: chestY - 0.03, elY: chestY - 0.03 - P.upper, wrY: chestY - 0.03 - P.upper - P.fore };
}

// ------------------------------------------------------------------ geometry layers (cached per proportion key)
var CACHE = {};
function key(P, extra) { return [P.species, P.female ? 1 : 0, P.bw.toFixed(3), P.legH, extra || "", LOD].join("|"); }
// skin: torso, neck, arms, legs
function bodyGeo(P) {
  var k = key(P, "body"); if (CACHE[k]) return CACHE[k]; var J = joints(P), B = new SB(), bw = P.bw, f = P.female;
  var torsoPts = [[J.hipY - 0.13, 0.12, 0.095], [J.hipY - 0.04, 0.162 * (f ? 1.08 : 1), 0.112], [J.hipY + 0.07, 0.15, 0.105], [J.hipY + 0.15, 0.13 * (f ? 0.9 : 1), 0.098], [J.hipY + 0.28, 0.146, 0.108], [J.hipY + 0.4, 0.162, f ? 0.132 : 0.118], [J.chestY - 0.12, 0.162, 0.115], [J.chestY - 0.05, 0.15, 0.1], [J.chestY + 0.0, 0.11, 0.078], [J.chestY + 0.035, 0.056, 0.05]];
  tube(B, profile(torsoPts, 0, 0, bw, bw * 0.95, 26), [[J.hipY - 0.02, B_HIPS], [J.hipY + 0.09, B_SPINE], [J.hipY + 0.3, B_SPINE], [J.chestY - 0.2, B_CHEST]], { capBottom: 0.04, rs: 20 });
  tube(B, profile([[J.chestY, 0.05, 0.048], [J.neckY + 0.06, 0.046, 0.046], [J.headY - 0.03, 0.044, 0.044]], 0, 0.005, 1, 1, 6), [[J.chestY + 0.02, B_CHEST], [J.neckY + 0.02, B_NECK], [J.headY - 0.06, B_NECK], [J.headY - 0.02, B_HEAD]], { rs: 12 });
  [-1, 1].forEach(function (sd) {
    var shB = sd < 0 ? B_LSH : B_RSH, elB = sd < 0 ? B_LEL : B_REL, hipB = sd < 0 ? B_LHIP : B_RHIP, knB = sd < 0 ? B_LKNEE : B_RKNEE, x = sd * P.shx, hx = sd * P.hipx;
    var arm = [[J.wrY + 0.01, 0.03, 0.028], [J.elY - 0.1, 0.044, 0.04], [J.elY, 0.042, 0.04], [J.shY - 0.12, 0.05, 0.048], [J.shY - 0.03, 0.06, 0.056], [J.shY + 0.03, 0.05, 0.05]];
    tube(B, profile(arm, x, 0, bw * 0.95, bw * 0.95, 22), [[J.elY - 0.04, elB], [J.elY + 0.04, shB], [J.shY - 0.02, shB], [J.shY + 0.04, B_CHEST]], { capTop: 0.03, rs: 12 });
    var leg = [[J.ankleY - 0.01, 0.034, 0.036], [J.kneeY - 0.14, 0.052, 0.058], [J.kneeY, 0.05, 0.052], [J.kneeY + 0.18, 0.07, 0.072], [J.hipY - 0.05, 0.088 * (f ? 1.06 : 1), 0.084], [J.hipY + 0.03, 0.08, 0.08]];
    tube(B, profile(leg, function (y) { return hx * (0.92 + 0.08 * (y - J.ankleY) / P.hipY); }, 0, bw, bw, 24), [[J.kneeY - 0.04, knB], [J.kneeY + 0.05, hipB], [J.hipY - 0.07, hipB], [J.hipY + 0.02, B_HIPS]], { rs: 14 });
  });
  return (CACHE[k] = B.geo(true));
}
// clothing pieces built from the same profiles, inflated
function clothGeo(P, kind) {
  var k = key(P, kind); if (CACHE[k]) return CACHE[k]; var J = joints(P), B = new SB(), bw = P.bw, f = P.female;
  var tW = [[J.hipY - 0.04, B_HIPS], [J.hipY + 0.09, B_SPINE], [J.hipY + 0.3, B_SPINE], [J.chestY - 0.2, B_CHEST]];
  function torso(inf, yA, yB, flare) {
    var pts = [[J.hipY - 0.15, 0.165, 0.118], [J.hipY - 0.04, 0.17 * (f ? 1.06 : 1), 0.118], [J.hipY + 0.07, 0.158, 0.112], [J.hipY + 0.15, 0.142, 0.106], [J.hipY + 0.28, 0.154, 0.115], [J.hipY + 0.4, 0.17, f ? 0.138 : 0.125], [J.chestY - 0.12, 0.178, 0.122], [J.chestY - 0.04, 0.172, 0.108], [J.chestY + 0.012, 0.11, 0.084], [J.chestY + 0.035, 0.066, 0.06]];
    tube(B, profile(pts, 0, 0, bw * inf, bw * 0.95 * inf, 22, yA, yB), tW, { rs: 20 });
  }
  function sleeve(inf, yA, yB) { [-1, 1].forEach(function (sd) { var x = sd * P.shx; var arm = [[J.wrY + 0.03, 0.034, 0.032], [J.elY - 0.1, 0.048, 0.044], [J.elY, 0.047, 0.045], [J.shY - 0.12, 0.055, 0.053], [J.shY - 0.03, 0.066, 0.062], [J.shY + 0.035, 0.056, 0.056]]; tube(B, profile(arm, x, 0, bw * inf, bw * inf, 16, yA, yB), [[J.elY - 0.04, sd < 0 ? B_LEL : B_REL], [J.elY + 0.04, sd < 0 ? B_LSH : B_RSH], [J.shY - 0.02, sd < 0 ? B_LSH : B_RSH], [J.shY + 0.04, B_CHEST]], { rs: 12 }); }); }
  function legs(inf, yA, yB) { [-1, 1].forEach(function (sd) { var hx = sd * P.hipx; var leg = [[J.ankleY + 0.02, 0.04, 0.042], [J.kneeY - 0.14, 0.058, 0.062], [J.kneeY, 0.056, 0.058], [J.kneeY + 0.18, 0.076, 0.078], [J.hipY - 0.05, 0.094, 0.09], [J.hipY + 0.04, 0.09, 0.088]]; tube(B, profile(leg, function (y) { return hx * (0.92 + 0.08 * (y - J.ankleY) / P.hipY); }, 0, bw * inf, bw * inf, 16, yA, yB), [[J.kneeY - 0.04, sd < 0 ? B_LKNEE : B_RKNEE], [J.kneeY + 0.05, sd < 0 ? B_LHIP : B_RHIP], [J.hipY - 0.07, sd < 0 ? B_LHIP : B_RHIP], [J.hipY + 0.02, B_HIPS]], { rs: 14 }); }); }
  // a skirt/robe/coat tail hanging from the waist that follows each leg partly
  function skirt(inf, yTop, yBot, flareX, flareZ) {
    var pts = [[yBot, flareX, flareZ], [J.hipY - 0.12, 0.2 * (yTop - yBot > 0.6 ? 1.05 : 1), 0.16], [J.hipY + 0.02, 0.172, 0.12], [yTop, 0.158, 0.114]];
    tube(B, profile(pts, 0, 0, bw * inf, bw * inf, 18, yBot, yTop), null, { rs: 22, wfn: function (x, y, z) { if (y > J.hipY - 0.06) return [B_HIPS, 0, 1, 0]; var side = x < 0 ? B_LHIP : B_RHIP; var t = smooth01((J.hipY - 0.06 - y) / 0.5) * Math.min(1, Math.abs(x) / (0.09 * bw)) * 0.55; return [B_HIPS, side, 1 - t, t]; } });
  }
  switch (kind) {
    case "tunic": torso(1.06, J.hipY - 0.15, J.chestY + 0.035); sleeve(1.1, J.elY + 0.02, J.shY + 0.035); break;
    case "shirtLong": torso(1.05, J.hipY - 0.05, J.chestY + 0.035); sleeve(1.08, J.wrY + 0.03, J.shY + 0.035); break;
    case "coat": torso(1.12, J.hipY - 0.1, J.chestY + 0.03); sleeve(1.16, J.wrY + 0.05, J.shY + 0.035); skirt(1.12, J.hipY - 0.08, J.kneeY - 0.02, 0.22, 0.18); break;
    case "robe": torso(1.07, J.hipY - 0.1, J.chestY + 0.035); sleeve(1.2, J.wrY + 0.03, J.shY + 0.035); skirt(1.08, J.hipY - 0.08, J.ankleY + 0.03, 0.27, 0.23); break;
    case "pants": legs(1.1, J.ankleY + 0.12, J.hipY + 0.05); torso(1.04, J.hipY - 0.15, J.hipY + 0.06); break;
    case "skirtShort": skirt(1.1, J.hipY + 0.02, J.kneeY + 0.12, 0.21, 0.17); break;
    case "boots": legs(1.2, J.ankleY - 0.01, J.kneeY - 0.06); break;
    case "greaves": legs(1.24, J.ankleY + 0.02, J.kneeY + 0.04); break;
    case "cuirass": torso(1.15, J.hipY + 0.02, J.chestY - 0.02); break;
    case "bracers": sleeve(1.2, J.wrY + 0.02, J.elY - 0.03); break;
    case "faulds": skirt(1.16, J.hipY + 0.05, J.kneeY + 0.2, 0.2, 0.16); break;
    case "loincloth": skirt(1.08, J.hipY + 0.0, J.kneeY + 0.18, 0.15, 0.1); legs(1.06, J.hipY - 0.12, J.hipY + 0.04); break;
  }
  return (CACHE[k] = B.geo(true));
}

// ------------------------------------------------------------------ head, face, hair
var FACE_TEX = {};
function faceTexture(look, P) {
  var THREE = T(); var kk = [look.skin, look.hair, look.eyes, look.face, P.female, P.species, look.beard].join("|"); if (FACE_TEX[kk]) return FACE_TEX[kk];
  var c = document.createElement("canvas"); c.width = 512; c.height = 256; var x = c.getContext("2d"); var r = rng(1000 + (look.face || 0) * 77);
  var skin = look.skin || "#c98e64"; x.fillStyle = skin; x.fillRect(0, 0, 512, 256);
  var g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "rgba(0,0,0,0.05)"); g.addColorStop(0.55, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.25)"); x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  var cx = 128, ey = 116 + (r() - 0.5) * 4, sep = 29 + r() * 4;
  // cheeks and nose shading
  x.fillStyle = P.female ? "rgba(210,90,80,0.14)" : "rgba(170,70,60,0.08)"; [-1, 1].forEach(function (s) { x.beginPath(); x.ellipse(cx + s * 38, ey + 34, 20, 13, 0, 0, 7); x.fill(); });
  x.fillStyle = "rgba(60,30,20,0.14)"; x.beginPath(); x.ellipse(cx, ey + 26, 7, 18, 0, 0, 7); x.fill();
  // eye sockets
  x.fillStyle = "rgba(50,25,20,0.16)"; [-1, 1].forEach(function (s) { x.beginPath(); x.ellipse(cx + s * sep, ey - 2, 17, 11, 0, 0, 7); x.fill(); });
  var iris = look.eyes || ["#3a5a7a", "#4a3a22", "#3a6a3a", "#5a5a5a", "#6a4a2a"][(look.face || 0) % 5];
  [-1, 1].forEach(function (s) {
    var ex = cx + s * sep; x.fillStyle = "#f4f0ea"; x.beginPath(); x.ellipse(ex, ey, 11, 6.2, 0, 0, 7); x.fill();
    x.fillStyle = iris; x.beginPath(); x.arc(ex + s * 0.5, ey + 0.3, 5.4, 0, 7); x.fill(); x.fillStyle = "#0c0806"; x.beginPath(); x.arc(ex + s * 0.5, ey + 0.3, 2.4, 0, 7); x.fill();
    x.fillStyle = "rgba(255,255,255,0.9)"; x.beginPath(); x.arc(ex + s * 0.5 - 1.6, ey - 1.6, 1.3, 0, 7); x.fill();
    x.strokeStyle = "rgba(30,15,10,0.85)"; x.lineWidth = P.female ? 2.6 : 2; x.beginPath(); x.ellipse(ex, ey + 1, 11.5, 7, 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
    x.strokeStyle = "rgba(60,30,25,0.35)"; x.lineWidth = 1; x.beginPath(); x.ellipse(ex, ey - 1, 11, 7, 0, 0.15, Math.PI - 0.15); x.stroke();
    // brows
    x.strokeStyle = look.hair || "#3a2a1a"; x.lineWidth = P.female ? 2.6 : 4; x.lineCap = "round"; var tilt = (r() - 0.5) * 4; x.beginPath(); x.moveTo(ex - s * 11, ey - 12 + tilt); x.quadraticCurveTo(ex, ey - 17, ex + s * 12, ey - 13 - tilt); x.stroke();
  });
  // mouth
  var my = ey + 50, mw = 16 + r() * 4; x.fillStyle = P.female ? "#a24a48" : "#8a4a40"; x.beginPath(); x.moveTo(cx - mw, my); x.quadraticCurveTo(cx, my - 5, cx + mw, my); x.quadraticCurveTo(cx, my + 7, cx - mw, my); x.fill();
  x.strokeStyle = "rgba(50,20,15,0.6)"; x.lineWidth = 1.2; x.beginPath(); x.moveTo(cx - mw, my); x.quadraticCurveTo(cx, my + 1.5, cx + mw, my); x.stroke();
  // stubble / beard shadow
  if (!P.female && (look.beard || P.species === "Dwarf" || (look.face || 0) % 3 === 1)) { x.fillStyle = "rgba(30,20,15,0.22)"; x.beginPath(); x.ellipse(cx, my + 8, 46, 30, 0, 0, Math.PI); x.fill(); x.beginPath(); x.ellipse(cx, my - 6, 22, 6, 0, 0, 7); x.fill(); }
  if (P.species === "Orc-Blooded") { x.fillStyle = "rgba(40,60,20,0.25)"; x.fillRect(0, 0, 512, 256); }
  var t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; FACE_TEX[kk] = t; return t;
}
var HEAD_GEO = {};
function headGeo(P, face) {
  var k = P.species + (P.female ? "f" : "m") + (face % 4) + LOD; if (HEAD_GEO[k]) return HEAD_GEO[k]; var THREE = T();
  var g = LOD ? new THREE.SphereGeometry(0.5, 40, 30) : new THREE.SphereGeometry(0.5, 22, 16); var p = g.attributes.position; var r = rng(300 + face);
  var jaw = (P.female ? 0.82 : 0.9) + r() * 0.06 + (P.species === "Dwarf" || P.species === "Orc-Blooded" ? 0.08 : 0), chin = 0.04 + r() * 0.03;
  for (var i = 0; i < p.count; i++) { var x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < 0) { var t = -y / 0.5; x *= 1 - (1 - jaw) * t * 1.6; z *= 1 - 0.12 * t; if (z > 0) z += chin * t * t; }
    if (z < 0) z *= 1.04; if (y > 0.1) x *= 1 - 0.06 * (y - 0.1); // crown
    if (z > 0.3 && Math.abs(y) < 0.1) z -= 0.02 * (1 - Math.abs(y) / 0.1); // brow ridge/eye line
    p.setXYZ(i, x, y, z); }
  g.computeVertexNormals(); return (HEAD_GEO[k] = g);
}
// hair: strand clumps grown from the scalp, styled
function hairGeo(style, P, seed) {
  var THREE = T(); var k = style + "|" + (P.female ? 1 : 0) + "|" + seed + "|" + LOD; if (CACHE[k]) return CACHE[k];
  var B = new SB(), r = rng(hashStr(style) + seed); var R = 1; // unit head (scaled later)
  var s = String(style); if (s === "Bald") return null;
  // scalp shell: upper cranium pushed back from the forehead
  var shell = new THREE.SphereGeometry(0.535, LOD ? 28 : 16, LOD ? 16 : 9, 0, Math.PI * 2, 0, Math.PI * (s === "Buzz Cut" ? 0.5 : 0.56)); shell.rotateX(-0.42); shell.translate(0, 0.03, -0.035); addGeo(B, shell);
  if (s === "Buzz Cut" || s === "Hooded") return (CACHE[k] = B.geo(false));
  var LONG = /Long|Braid|Ponytail/.test(s) || (P.female && s === "Messy Layered");
  function clump(theta, phi, len, droop, back, width, curl, lift) {
    // grow along the skull surface toward the style's flow, then fall with gravity below the head
    var st = Math.sin(theta), cx = 0, cy = 0.03, cz = -0.03; var x = Math.sin(phi) * st * 0.55, y = Math.cos(theta) * 0.55 + cy, z = Math.cos(phi) * st * 0.55 + cz;
    var pts = [], segs = LOD ? 9 : 5, stepL = len / segs, layer = 0.555 + r() * 0.035;
    for (var i = 0; i <= segs; i++) {
      pts.push([x, y, z]); var t = i / segs;
      var fx = Math.sin(phi) * 0.25 + (curl ? Math.sin(t * 11 + phi * 4) * curl * 4 : 0), fy = -0.6 - droop * t * 2, fz = -back - (curl ? Math.cos(t * 11 + phi * 4) * curl * 2 : 0);
      var nx = x - cx, ny = y - cy, nz = z - cz, nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      var dot = fx * nx + fy * ny + fz * nz; var onHead = y > cy - 0.32;
      var tx = onHead ? fx - nx * dot : fx * 0.3, ty = onHead ? fy - ny * dot : -1, tz = onHead ? fz - nz * dot : fz * 0.25; var tl = Math.hypot(tx, ty, tz) || 1;
      x += tx / tl * stepL + nx * (lift || 0) * stepL; y += ty / tl * stepL; z += tz / tl * stepL + nz * (lift || 0) * stepL;
      var dx = x - cx, dy = y - cy, dz = z - cz, d = Math.hypot(dx, dy, dz); var rr = layer + (lift || 0) * t * 0.3; if (d < rr && y > cy - 0.42) { x = cx + dx / d * rr; y = cy + dy / d * rr; z = cz + dz / d * rr; }
    }
    strand(B, pts, LOD ? width : width * 1.55);
  }
  var n;
  if (s !== "Ponytail" && s !== "Topknot" || true) {
    var n = (s === "Curly Mop" ? 120 : 110) * (LOD ? 1 : 0.32);
    for (var i = 0; i < n; i++) {
      var phi = r() * Math.PI * 2, u = r(); var theta = Math.acos(1 - u * (s === "Shaved Sides" || s === "Warrior Braids" ? 0.4 : 1.05));
      if (s === "Ponytail" || s === "Topknot" || s === "Swept Back") { if (Math.cos(phi) > 0.2 && theta > 0.5) continue; }
      var frontal = Math.cos(phi) > 0.45 && theta > 0.45;
      var len = s === "Short Crop" || s === "Shaved Sides" ? 0.22 : s === "Curly Mop" ? 0.3 : s === "Swept Back" ? 0.42 : s === "Warrior Braids" ? 0.3 : s === "Ponytail" || s === "Topknot" ? 0.38 : 0.36;
      var back = s === "Swept Back" || s === "Ponytail" || s === "Topknot" ? 0.9 : 0.25, droop = 0.3, lift = s === "Messy Layered" ? 0.12 : s === "Curly Mop" ? 0.25 : 0.03;
      if (LONG && Math.cos(phi) < 0.55) { len = 0.95 + r() * 0.35; droop = 0.6; }
      if (frontal) { if (s === "Messy Layered" || s === "Curly Mop" || LONG) { len = 0.26 + r() * 0.08; back = -0.7; droop = 0.5; } else { len = 0.16; back = 1.2; } }
      clump(theta, phi, len * (0.85 + r() * 0.3), droop, back, s === "Curly Mop" ? 0.085 : 0.07, s === "Curly Mop" ? 0.012 : s === "Long Wavy" ? 0.006 : 0, lift);
    }
  }
  if (s === "Ponytail") { clump(0.9, Math.PI, 0.95, 0.9, 0.25, 0.13, 0); }
  if (s === "Topknot") { var bun = new THREE.SphereGeometry(0.16, 14, 10); bun.translate(0, 0.62, -0.08); addGeo(B, bun); }
  if (s === "Braided" || s === "Warrior Braids") [-1, 1].forEach(function (sd) { for (var b = 0; b < 7; b++) { var bead = new THREE.SphereGeometry(0.07, 8, 6); bead.scale(1, 1.25, 1); bead.translate(sd * 0.42, -0.1 - b * 0.12, -0.18); addGeo(B, bead); } });
  return (CACHE[k] = B.geo(false));
}
function strand(B, pts, width) {
  var RS = LOD ? 6 : 4, base = B.n, n = pts.length;
  for (var i = 0; i < n; i++) { var p = pts[i], q = pts[Math.min(n - 1, i + 1)], o = pts[Math.max(0, i - 1)]; var dx = q[0] - o[0], dy = q[1] - o[1], dz = q[2] - o[2], L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
    var ax = 0, ay = 1, az = 0; if (Math.abs(dy) > 0.9) { ax = 1; ay = 0; } var ux = dy * az - dz * ay, uy = dz * ax - dx * az, uz = dx * ay - dy * ax, ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul; var vx = dy * uz - dz * uy, vy = dz * ux - dx * uz, vz = dx * uy - dy * ux;
    var w = width * (1 - i / (n - 1) * 0.85) * (i === 0 ? 1.2 : 1);
    for (var k = 0; k <= RS; k++) { var a = k / RS * Math.PI * 2, c = Math.cos(a) * w, s = Math.sin(a) * w * 0.55; B.v(p[0] + ux * c + vx * s, p[1] + uy * c + vy * s, p[2] + uz * c + vz * s, k / RS, i / (n - 1), [0, 0, 1, 0]); } }
  for (var i = 0; i < n - 1; i++) for (var k = 0; k < RS; k++) { var a = base + i * (RS + 1) + k, b = a + RS + 1; B.tri(a, b, a + 1); B.tri(b, b + 1, a + 1); }
}
function addGeo(B, g) { var p = g.attributes.position, uv = g.attributes.uv, base = B.n; for (var i = 0; i < p.count; i++) B.v(p.getX(i), p.getY(i), p.getZ(i), uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0, [0, 0, 1, 0]); var ix = g.index; if (ix) for (var j = 0; j < ix.count; j++) B.ix.push(base + ix.getX(j)); else for (var j = 0; j < p.count; j++) B.ix.push(base + j); g.dispose(); }
function beardGeo(P, seed, long) {
  var k = "beard|" + long + "|" + seed + "|" + LOD; if (CACHE[k]) return CACHE[k]; var B = new SB(), r = rng(seed + 9);
  for (var i = 0; i < (long ? 46 : 30) * (LOD ? 1 : 0.5); i++) { var a = (r() - 0.5) * 2.4; var y0 = -0.08 - r() * 0.3, x = Math.sin(a) * 0.42, z = Math.cos(a) * 0.4 + 0.03; var pts = []; var len = long ? 0.55 + r() * 0.3 : 0.16 + r() * 0.08; for (var j = 0; j <= 5; j++) { var t = j / 5; pts.push([x * (1 - t * 0.3), y0 - len * t, z + 0.06 * t - (long ? 0.05 * t * t : 0)]); } strand(B, pts, 0.07); }
  return (CACHE[k] = B.geo(false));
}

// ------------------------------------------------------------------ assemble a character
var MATS = {};
function M(color, o) { var THREE = T(); var kk = color + JSON.stringify(o || {}); if (MATS[kk]) return MATS[kk]; return (MATS[kk] = new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(color), roughness: 0.78, metalness: 0 }, o || {}))); }
export function buildBody(look, outfit) {
  LOD = look.detail === "lo" ? 0 : 1; try { return buildBody2(look, outfit); } finally { LOD = 1; }
}
function buildBody2(look, outfit) {
  var THREE = T(); var P = proportions(look); var J = joints(P);
  var root = new THREE.Group();
  // bones
  var bones = []; function bone(name, parent, x, y, z) { var b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); if (parent) parent.add(b); bones.push(b); return b; }
  var hips = bone("hips", null, 0, J.hipY, 0), spine = bone("spine", hips, 0, 0.02, 0), chest = bone("chest", spine, 0, J.chestY - J.spineY, 0), neck = bone("neck", chest, 0, J.neckY - J.chestY, 0), head = bone("head", neck, 0, J.headY - J.neckY, 0);
  var lhip = bone("lhip", hips, -P.hipx, 0, 0), lknee = bone("lknee", lhip, 0, -P.thigh, 0), rhip = bone("rhip", hips, P.hipx, 0, 0), rknee = bone("rknee", rhip, 0, -P.thigh, 0);
  var lsh = bone("lsh", chest, -P.shx, -0.03, 0), lel = bone("lel", lsh, 0, -P.upper, 0), lhand = bone("lhand", lel, 0, -P.fore, 0);
  var rsh = bone("rsh", chest, P.shx, -0.03, 0), rel = bone("rel", rsh, 0, -P.upper, 0), rhand = bone("rhand", rel, 0, -P.fore, 0);
  var skinMat = M(look.skin || "#c98e64", { roughness: 0.62 });
  var body = new THREE.SkinnedMesh(bodyGeo(P), skinMat); body.add(hips); root.add(body); root.updateMatrixWorld(true);
  var skeleton = new THREE.Skeleton(bones); body.bind(skeleton);
  var layers = [body];
  function layer(kind, color, opts) { var m = new THREE.SkinnedMesh(clothGeo(P, kind), M(color, opts)); root.add(m); m.bind(skeleton, body.matrixWorld); layers.push(m); return m; }
  outfit.forEach(function (o) { layer(o[0], o[1], o[2]); });
  // head with painted face, eyes, nose, ears
  var hw = 0.205 * (P.species === "Dwarf" ? 1.1 : 1), hh = 0.25, hd = 0.232;
  var headMesh = new THREE.Mesh(headGeo(P, look.face || 0), new THREE.MeshStandardMaterial({ map: faceTexture(look, P), roughness: 0.6 })); headMesh.scale.set(hw, hh, hd); headMesh.position.set(0, 0.03, 0.005); head.add(headMesh);
  var noseG = new THREE.SphereGeometry(0.5, 10, 8); var nose = new THREE.Mesh(noseG, skinMat); nose.scale.set(0.034, 0.05, 0.05 * (P.species === "Orc-Blooded" ? 1.2 : 1)); nose.position.set(0, 0.012, hd * 0.5 - 0.004); nose.rotation.x = 0.35; head.add(nose);
  [-1, 1].forEach(function (sd) {
    var ear = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), skinMat); var elf = P.species === "Elf" || P.species === "Half-Elf";
    ear.scale.set(0.02, elf ? (P.species === "Elf" ? 0.11 : 0.075) : 0.055, 0.04); ear.position.set(sd * hw * 0.5, elf ? 0.05 : 0.03, -0.005); ear.rotation.z = elf ? -sd * 0.55 : 0; ear.rotation.x = elf ? -0.35 : 0; head.add(ear);
    if (P.species === "Orc-Blooded") { var tusk = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 6), M("#efe6cc")); tusk.position.set(sd * 0.03, -0.055, hd * 0.5 - 0.012); head.add(tusk); }
  });
  var hairM = M(look.hair || "#3a2416", { roughness: 0.55 });
  var hg = hairGeo(look.hairStyle || "Messy Layered", P, look.face || 0); if (hg) { var hair = new THREE.Mesh(hg, hairM); hair.scale.set(hw * 1.0, hh * 0.93, hd * 0.98); hair.position.set(0, 0.03, 0.005); head.add(hair); }
  if (!P.female && (look.beard || P.species === "Dwarf")) { var bd = new THREE.Mesh(beardGeo(P, look.face || 0, P.species === "Dwarf"), hairM); bd.scale.set(hw, hh, hd); bd.position.set(0, 0.03, 0.005); head.add(bd); }
  // hands and feet (rigid, follow their bones)
  [[lhand, -1], [rhand, 1]].forEach(function (h) { var hand = new THREE.Mesh(LOD ? new THREE.SphereGeometry(0.5, 12, 10) : new THREE.SphereGeometry(0.5, 7, 5), outfit.gloves ? M(outfit.gloves) : skinMat); hand.scale.set(0.05 * P.bw, 0.095, 0.035); hand.position.set(0, -0.045, 0.005); h[0].add(hand); var thumb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), hand.material); thumb.scale.set(0.022, 0.05, 0.022); thumb.position.set(-h[1] * 0.02, -0.03, 0.025); thumb.rotation.z = h[1] * 0.4; h[0].add(thumb); });
  var bootC = outfit.boots || "#3a2a1c";
  [lknee, rknee].forEach(function (kn) { var foot = new THREE.Mesh(LOD ? new THREE.SphereGeometry(0.5, 14, 10) : new THREE.SphereGeometry(0.5, 8, 6), M(bootC, { roughness: 0.7 })); foot.scale.set(0.085 * P.bw, 0.075, 0.24); foot.position.set(0, -P.shin - 0.03, 0.05); kn.add(foot); });
  root.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return { root: root, skeleton: skeleton, layers: layers, P: P, J: J, bones: { hips: hips, spine: spine, chest: chest, neck: neck, head: head, lhip: lhip, lknee: lknee, rhip: rhip, rknee: rknee, lsh: lsh, lel: lel, lhand: lhand, rsh: rsh, rel: rel, rhand: rhand }, headSize: [hw, hh, hd] };
}
