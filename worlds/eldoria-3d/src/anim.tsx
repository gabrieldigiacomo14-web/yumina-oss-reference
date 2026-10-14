// @ts-nocheck
// Humanoid animation: a procedural locomotion layer (idle, walk, run, combat stance)
// plus keyframed action clips (slash, smash, thrust, bow, spellcast, hit, dodge, death,
// cheer, talk) blended over it with eased curves. Clips fire events on their impact
// frame so damage, sparks and sounds land exactly when the blow connects.

var JOINTS = ["hips", "spine", "chest", "neck", "head", "lhip", "lknee", "rhip", "rknee", "lsh", "lel", "lhand", "rsh", "rel", "rhand"];
var UPPER = { spine: 1, chest: 1, neck: 1, head: 1, lsh: 1, lel: 1, lhand: 1, rsh: 1, rel: 1, rhand: 1 };
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// keyframes: [time, { joint: [rx, ry, rz], hipsY: dy, rigX: rot, rigY: dy, wpn: drx }], events: [[time, name]]
export var CLIPS = {
  slash: { dur: 0.62, mask: "upper+", ev: [[0.3, "hit"]], kf: [[0, null], [0.18, { rsh: [-1.95, 0, 0.85], rel: [-1.3, 0, 0], spine: [0.05, 0.55, 0], chest: [0, 0.25, 0], lsh: [-0.45, 0, -0.35], lel: [-1.0, 0, 0], wpn: -0.5 }], [0.3, { rsh: [-0.85, 0, -0.6], rel: [-0.2, 0, 0], spine: [0.25, -0.5, 0], chest: [0.1, -0.3, 0], lsh: [-0.3, 0, -0.5], lel: [-0.8, 0, 0], lhip: [-0.5, 0, 0], lknee: [0.35, 0, 0], rhip: [0.25, 0, 0], rknee: [0.3, 0, 0], hipsY: -0.05, wpn: 0.4 }], [0.42, { rsh: [-0.35, 0, -0.9], rel: [-0.45, 0, 0], spine: [0.2, -0.65, 0], chest: [0.05, -0.3, 0], lhip: [-0.45, 0, 0], lknee: [0.3, 0, 0], rhip: [0.2, 0, 0], rknee: [0.25, 0, 0], hipsY: -0.05, wpn: 0.5 }], [0.62, null]] },
  smash: { dur: 0.95, mask: "full", ev: [[0.52, "hit"]], kf: [[0, null], [0.36, { rsh: [-2.95, 0, 0.25], rel: [-0.65, 0, 0], lsh: [-2.75, 0, -0.25], lel: [-0.7, 0, 0], spine: [-0.28, 0, 0], chest: [-0.12, 0, 0], head: [-0.2, 0, 0], hipsY: 0.02, wpn: -0.6 }], [0.52, { rsh: [-0.75, 0, -0.1], rel: [-0.1, 0, 0], lsh: [-0.85, 0, 0.1], lel: [-0.3, 0, 0], spine: [0.55, 0, 0], chest: [0.2, 0, 0], head: [0.2, 0, 0], hipsY: -0.13, lhip: [-0.7, 0, 0], lknee: [0.75, 0, 0], rhip: [0.35, 0, 0], rknee: [0.5, 0, 0], wpn: 0.35 }], [0.7, { rsh: [-0.7, 0, -0.1], rel: [-0.15, 0, 0], lsh: [-0.8, 0, 0.1], lel: [-0.35, 0, 0], spine: [0.45, 0, 0], hipsY: -0.12, lhip: [-0.65, 0, 0], lknee: [0.7, 0, 0], rhip: [0.3, 0, 0], rknee: [0.45, 0, 0], wpn: 0.3 }], [0.95, null]] },
  thrust: { dur: 0.58, mask: "upper+", ev: [[0.3, "hit"]], kf: [[0, null], [0.2, { rsh: [-0.55, 0, 0.35], rel: [-1.95, 0, 0], spine: [0, 0.45, 0], chest: [0, 0.2, 0], lsh: [-0.6, 0, -0.2], lel: [-1.1, 0, 0], wpn: 1.2 }], [0.3, { rsh: [-1.55, 0, 0.05], rel: [-0.05, 0, 0], spine: [0.22, -0.35, 0], chest: [0.1, -0.2, 0], lhip: [-0.55, 0, 0], lknee: [0.4, 0, 0], rhip: [0.3, 0, 0], rknee: [0.3, 0, 0], hipsY: -0.05, wpn: 1.55 }], [0.42, { rsh: [-1.45, 0, 0.05], rel: [-0.1, 0, 0], spine: [0.2, -0.3, 0], lhip: [-0.5, 0, 0], lknee: [0.35, 0, 0], hipsY: -0.05, wpn: 1.5 }], [0.58, null]] },
  punch: { dur: 0.5, mask: "upper+", ev: [[0.24, "hit"]], kf: [[0, null], [0.14, { rsh: [-0.6, 0, 0.3], rel: [-2.1, 0, 0], lsh: [-1.2, 0, -0.2], lel: [-1.8, 0, 0], spine: [0.05, 0.4, 0] }], [0.24, { rsh: [-1.6, 0, -0.05], rel: [-0.1, 0, 0], lsh: [-0.9, 0, -0.3], lel: [-1.9, 0, 0], spine: [0.2, -0.4, 0], lhip: [-0.45, 0, 0], lknee: [0.3, 0, 0], hipsY: -0.04 }], [0.5, null]] },
  bow: { dur: 1.05, mask: "upper", ev: [[0.66, "release"]], kf: [[0, null], [0.18, { lsh: [-1.52, 0, -0.1], lel: [-0.05, 0, 0], chest: [0, -0.85, 0], spine: [0, -0.2, 0], head: [0, 0.9, 0], rsh: [-1.45, 0, 0.05], rel: [-1.0, 0, 0] }], [0.6, { lsh: [-1.55, 0, -0.1], lel: [0, 0, 0], chest: [0, -0.95, 0], spine: [0, -0.25, 0], head: [0, 1.0, 0], rsh: [-1.55, 0, 0.35], rel: [-2.3, 0, 0] }], [0.7, { lsh: [-1.5, 0, -0.1], lel: [0, 0, 0], chest: [0, -0.9, 0], head: [0, 0.95, 0], rsh: [-1.25, 0, 0.6], rel: [-0.5, 0, 0] }], [1.05, null]] },
  cast: { dur: 0.95, mask: "upper", ev: [[0.52, "release"]], kf: [[0, null], [0.32, { lsh: [-0.95, 0, -0.45], lel: [-1.55, 0, 0], rsh: [-0.95, 0, 0.45], rel: [-1.55, 0, 0], spine: [-0.12, 0, 0], head: [-0.15, 0, 0] }], [0.52, { lsh: [-1.55, 0, -0.08], lel: [-0.08, 0, 0], rsh: [-1.55, 0, 0.08], rel: [-0.08, 0, 0], spine: [0.18, 0, 0], head: [0.05, 0, 0] }], [0.68, { lsh: [-1.45, 0, -0.1], lel: [-0.15, 0, 0], rsh: [-1.45, 0, 0.1], rel: [-0.15, 0, 0], spine: [0.15, 0, 0] }], [0.95, null]] },
  staffCast: { dur: 0.95, mask: "upper", ev: [[0.5, "release"]], kf: [[0, null], [0.32, { rsh: [-2.5, 0, 0.25], rel: [-0.35, 0, 0], lsh: [-0.9, 0, -0.4], lel: [-1.4, 0, 0], spine: [-0.2, 0.2, 0], head: [-0.25, 0, 0], wpn: -0.4 }], [0.5, { rsh: [-1.65, 0, 0.05], rel: [-0.1, 0, 0], lsh: [-1.4, 0, -0.2], lel: [-0.3, 0, 0], spine: [0.25, -0.15, 0], wpn: 0.9 }], [0.95, null]] },
  castUp: { dur: 1.05, mask: "upper", ev: [[0.48, "release"]], kf: [[0, null], [0.42, { lsh: [-2.75, 0, -0.45], lel: [-0.3, 0, 0], rsh: [-2.75, 0, 0.45], rel: [-0.3, 0, 0], spine: [-0.18, 0, 0], head: [-0.45, 0, 0] }], [0.7, { lsh: [-2.6, 0, -0.5], lel: [-0.35, 0, 0], rsh: [-2.6, 0, 0.5], rel: [-0.35, 0, 0], head: [-0.4, 0, 0] }], [1.05, null]] },
  drink: { dur: 1.0, mask: "upper", ev: [[0.55, "use"]], kf: [[0, null], [0.3, { rsh: [-1.6, 0, -0.6], rel: [-2.2, 0, 0], head: [-0.1, 0, 0] }], [0.6, { rsh: [-1.9, 0, -0.5], rel: [-2.4, 0, 0], head: [-0.55, 0, 0] }], [1.0, null]] },
  hit: { dur: 0.4, mask: "full", kf: [[0, null], [0.08, { spine: [-0.35, 0.25, 0], chest: [-0.15, 0.1, 0], head: [-0.4, 0.25, 0], rsh: [-0.4, 0, 0.45], lsh: [-0.4, 0, -0.45], rel: [-0.6, 0, 0], lel: [-0.6, 0, 0], hipsY: -0.04, rhip: [0.25, 0, 0], rknee: [0.25, 0, 0] }], [0.4, null]] },
  dodge: { dur: 0.6, mask: "full", kf: [[0, null], [0.14, { hipsY: -0.22, spine: [0.55, 0, 0], head: [0.2, 0, 0], lhip: [-1.05, 0, 0], lknee: [1.45, 0, 0], rhip: [-0.25, 0, 0], rknee: [1.1, 0, 0], lsh: [-0.7, 0, -0.3], rsh: [-0.7, 0, 0.3], lel: [-1.2, 0, 0], rel: [-1.2, 0, 0] }], [0.42, { hipsY: -0.18, spine: [0.45, 0, 0], lhip: [-0.9, 0, 0], lknee: [1.3, 0, 0], rhip: [-0.2, 0, 0], rknee: [1.0, 0, 0], lsh: [-0.6, 0, -0.3], rsh: [-0.6, 0, 0.3], lel: [-1.0, 0, 0], rel: [-1.0, 0, 0] }], [0.6, null]] },
  block: { dur: 0.5, mask: "upper", kf: [[0, null], [0.1, { lsh: [-1.35, 0, 0.35], lel: [-1.2, 0, 0], rsh: [-1.1, 0, -0.35], rel: [-1.3, 0, 0], spine: [-0.1, 0, 0] }], [0.35, { lsh: [-1.3, 0, 0.35], lel: [-1.2, 0, 0], rsh: [-1.05, 0, -0.35], rel: [-1.3, 0, 0] }], [0.5, null]] },
  death: { dur: 1.35, mask: "full", hold: true, kf: [[0, null], [0.28, { hipsY: -0.24, spine: [0.45, 0, 0.1], head: [0.45, 0, 0], lknee: [0.9, 0, 0], rknee: [0.7, 0, 0], lhip: [-0.5, 0, 0], rhip: [-0.3, 0, 0], lsh: [-0.3, 0, -0.4], rsh: [-0.3, 0, 0.4] }], [0.85, { rigX: -1.5, rigY: 0.14, hipsY: -0.3, spine: [-0.1, 0, 0.15], head: [-0.3, 0.6, 0], lknee: [0.4, 0, 0], rknee: [0.2, 0, 0], lhip: [-0.3, 0, 0], rhip: [0.0, 0, 0], lsh: [-2.6, 0, -0.5], rsh: [-1.6, 0, 1.0], lel: [-0.3, 0, 0], rel: [-0.5, 0, 0] }], [1.35, { rigX: -1.55, rigY: 0.12, hipsY: -0.3, spine: [-0.05, 0, 0.15], head: [-0.25, 0.7, 0], lknee: [0.3, 0, 0], rknee: [0.15, 0, 0], lhip: [-0.25, 0, 0], lsh: [-2.7, 0, -0.5], rsh: [-1.5, 0, 1.1], lel: [-0.2, 0, 0], rel: [-0.4, 0, 0] }]] },
  cheer: { dur: 1.3, mask: "upper", kf: [[0, null], [0.3, { rsh: [-2.95, 0, -0.25], rel: [-0.25, 0, 0], head: [-0.3, 0, 0], spine: [-0.12, 0, 0] }], [1.0, { rsh: [-2.9, 0, -0.3], rel: [-0.3, 0, 0], head: [-0.25, 0, 0] }], [1.3, null]] },
  talk: { dur: 2.2, mask: "upper", kf: [[0, null], [0.4, { rsh: [-0.6, 0, 0.15], rel: [-1.2, 0, 0], head: [0.05, 0.1, 0] }], [0.9, { rsh: [-0.45, 0, 0.3], rel: [-0.9, 0, 0], lsh: [-0.4, 0, -0.2], lel: [-1.0, 0, 0], head: [0, -0.08, 0] }], [1.5, { rsh: [-0.65, 0, 0.1], rel: [-1.3, 0, 0], head: [-0.05, 0.12, 0] }], [2.2, null]] },
  wave: { dur: 1.3, mask: "upper", kf: [[0, null], [0.25, { rsh: [-2.6, 0, 0.35], rel: [-0.5, 0, 0] }], [0.5, { rsh: [-2.6, 0, 0.75], rel: [-0.5, 0, 0] }], [0.75, { rsh: [-2.6, 0, 0.3], rel: [-0.5, 0, 0] }], [1.0, { rsh: [-2.6, 0, 0.7], rel: [-0.5, 0, 0] }], [1.3, null]] }
};
// pick the right swing for the weapon in hand
export function attackClip(kind) { return kind === "hammer" || kind === "axe" || kind === "club" ? "smash" : kind === "spear" || kind === "dagger" ? "thrust" : kind === "bow" ? "bow" : kind === "none" ? "punch" : kind === "staff" ? "slash" : "slash"; }

function zero() { var p = {}; JOINTS.forEach(function (j) { p[j] = [0, 0, 0]; }); p.hipsY = 0; p.rigX = 0; p.rigY = 0; p.wpn = 0; return p; }
// Procedural base layer.
function basePose(h, dt, st) {
  var p = zero(); h.t += dt; var t = h.t; var sp = Math.max(0, st.speed || 0); var w = Math.min(1, sp), run = Math.min(1, Math.max(0, sp - 1));
  h.ph = (h.ph || 0) + dt * (w > 0.03 ? 6.8 + run * 4.2 : 0); var ph = h.ph;
  var s = Math.sin(ph), c = Math.cos(ph);
  // legs
  p.lhip[0] = s * (0.5 + run * 0.32) * w; p.rhip[0] = -s * (0.5 + run * 0.32) * w;
  p.lknee[0] = (Math.max(0, -Math.sin(ph - 0.7)) * (0.95 + run * 0.6) + 0.06) * w; p.rknee[0] = (Math.max(0, Math.sin(ph - 0.7)) * (0.95 + run * 0.6) + 0.06) * w;
  p.hipsY = (-0.025 - run * 0.03 + Math.abs(c) * (0.04 + run * 0.03)) * w; p.hips[1] = s * 0.1 * w; p.hips[2] = c * 0.035 * w;
  p.spine[0] = 0.04 * w + run * 0.16; p.spine[1] = -s * 0.12 * w; p.chest[1] = -s * 0.06 * w; p.head[1] = s * 0.05 * w;
  // arms counter-swing
  p.lsh[0] = -s * (0.42 + run * 0.35) * w * -1 * -1; p.rsh[0] = s * (0.42 + run * 0.35) * w * -1 * -1;
  p.lsh[0] = -p.lhip[0] * 0.85; p.rsh[0] = -p.rhip[0] * 0.85;
  p.lsh[2] = -0.09; p.rsh[2] = 0.09; p.lel[0] = -0.18 - run * 0.95 - Math.max(0, s) * 0.15 * w; p.rel[0] = -0.18 - run * 0.95 - Math.max(0, -s) * 0.15 * w;
  // idle life: breathing, weight shift, glances
  var idle = 1 - w; var br = Math.sin(t * 1.7);
  p.chest[0] += br * 0.015 * idle; p.hips[2] += Math.sin(t * 0.45) * 0.025 * idle; p.lhip[2] = Math.sin(t * 0.45) * 0.03 * idle; p.rhip[2] = Math.sin(t * 0.45) * 0.03 * idle;
  p.head[1] += Math.sin(t * 0.31) * 0.25 * idle * (st.calm ? 1 : 0.4) + (st.look || 0); p.head[0] += Math.sin(t * 0.23) * 0.05 * idle;
  p.lsh[2] -= br * 0.01 * idle; p.rsh[2] += br * 0.01 * idle;
  if (st.combat && w < 0.6) {
    // ready stance: knees bent, weapon up, guard hand forward, light bounce
    var k = 1 - w; var b = Math.sin(t * 4.2) * 0.012;
    p.hipsY += (-0.07 + b) * k; p.lhip[0] += -0.38 * k; p.lknee[0] += 0.45 * k; p.rhip[0] += 0.12 * k; p.rknee[0] += 0.42 * k; p.spine[0] += 0.12 * k; p.spine[1] += 0.25 * k; p.chest[1] += 0.1 * k; p.head[1] -= 0.3 * k;
    p.rsh[0] += -0.65 * k; p.rsh[2] += 0.15 * k; p.rel[0] += -0.95 * k; p.lsh[0] += -0.55 * k; p.lsh[2] -= 0.15 * k; p.lel[0] += -1.2 * k; p.wpn += 0.55 * k;
  }
  if (st.crossArms && w < 0.1) { p.lsh = [-0.6, 0.6, -0.45]; p.rsh = [-0.6, -0.6, 0.45]; p.lel = [-1.65, 0, 0]; p.rel = [-1.65, 0, 0]; }
  if (st.sit) { p.lhip[0] = -1.5; p.rhip[0] = -1.5; p.lknee[0] = 1.5; p.rknee[0] = 1.5; p.hipsY = -0.45; }
  return p;
}
function clipPose(clip, t, base) {
  var kf = clip.kf; var i = 0; while (i < kf.length - 2 && t > kf[i + 1][0]) i++;
  var a = kf[i], b = kf[i + 1]; var u = Math.max(0, Math.min(1, (t - a[0]) / ((b[0] - a[0]) || 1))); u = ease(u);
  var out = {}; var A = a[1] || {}, B = b[1] || {};
  JOINTS.forEach(function (j) { if (!(j in A) && !(j in B)) return; var va = A[j] || base[j], vb = B[j] || base[j]; out[j] = [va[0] + (vb[0] - va[0]) * u, va[1] + (vb[1] - va[1]) * u, va[2] + (vb[2] - va[2]) * u]; });
  ["hipsY", "rigX", "rigY", "wpn"].forEach(function (k) { if (!(k in A) && !(k in B)) return; var va = k in A ? A[k] : base[k], vb = k in B ? B[k] : base[k]; out[k] = va + (vb - va) * u; });
  return out;
}
export function playAction(h, name, onEvent) {
  var c = CLIPS[name]; if (!c) return; h.action = name; h.actionT = 0; h.onEvent = onEvent || null; h.fired = {};
}
export function animateHumanoid(h, dt, st) {
  st = st || {}; var base = basePose(h, dt, st); var pose = base; var weight = 0, clip = null;
  if (st.dead && h.action !== "death" && !h.deadHeld) { playAction(h, "death"); }
  if (h.action) {
    clip = CLIPS[h.action]; h.actionT += dt; var t = h.actionT;
    if (clip.ev && h.onEvent) clip.ev.forEach(function (e) { if (t >= e[0] && !h.fired[e[1]]) { h.fired[e[1]] = 1; try { h.onEvent(e[1]); } catch (er) { } } });
    if (t >= clip.dur) { if (clip.hold) { h.deadHeld = true; t = clip.dur; h.actionT = clip.dur; } else { h.action = null; clip = null; } }
    if (clip) { weight = clip.hold ? 1 : Math.min(1, t / 0.08, (clip.dur - t) / 0.12 + 0.0001); var cp = clipPose(clip, Math.min(t, clip.dur), base); pose = blend(base, cp, Math.min(1, weight * 1.0001), clip.mask); }
  }
  if (!st.dead) h.deadHeld = false;
  apply(h, pose);
  if (h.cape) h.cape.rotation.x = 0.08 + Math.min(1, st.speed || 0) * 0.25 + Math.max(0, (st.speed || 0) - 1) * 0.35 + Math.sin(h.t * 2.3) * 0.03 + (pose.spine ? Math.max(0, pose.spine[0]) * 0.6 : 0);
  if (h.weapon && h.weapon.userData.orb) h.weapon.userData.orb.material.emissiveIntensity = 1.1 + Math.sin(h.t * 3) * 0.4 + (h.action === "staffCast" || h.action === "cast" ? 2.5 : 0);
}
function blend(base, cp, w, mask) {
  var out = {}; JOINTS.forEach(function (j) { var use = cp[j] && (mask === "full" || mask === "upper+" || UPPER[j]); var v = base[j]; out[j] = use ? [v[0] + (cp[j][0] - v[0]) * w, v[1] + (cp[j][1] - v[1]) * w, v[2] + (cp[j][2] - v[2]) * w] : v; });
  ["hipsY", "rigX", "rigY", "wpn"].forEach(function (k) { var v = base[k]; out[k] = k in cp && (mask !== "upper" || k === "wpn") ? v + (cp[k] - v) * w : v; }); return out;
}
var MAP = { hips: "hips", spine: "spine", chest: "chest", neck: "neck", head: "head" };
function apply(h, p) {
  h.hips.rotation.set(p.hips[0], p.hips[1], p.hips[2]); h.hips.position.y = (h.hipY || 0.98) + p.hipsY;
  h.spine.rotation.set(p.spine[0], p.spine[1], p.spine[2]); h.chest.rotation.set(p.chest[0], p.chest[1], p.chest[2]); h.head.rotation.set(p.head[0], p.head[1], p.head[2]); if (h.neck) h.neck.rotation.set(p.neck[0], p.neck[1], p.neck[2]);
  h.L.hip.rotation.set(p.lhip[0], p.lhip[1], p.lhip[2]); h.L.knee.rotation.set(p.lknee[0], 0, 0); h.R.hip.rotation.set(p.rhip[0], p.rhip[1], p.rhip[2]); h.R.knee.rotation.set(p.rknee[0], 0, 0);
  h.LA.sh.rotation.set(p.lsh[0], p.lsh[1], p.lsh[2]); h.LA.el.rotation.set(p.lel[0], 0, 0); h.RA.sh.rotation.set(p.rsh[0], p.rsh[1], p.rsh[2]); h.RA.el.rotation.set(p.rel[0], 0, 0);
  if (h.LA.hand) h.LA.hand.rotation.set(p.lhand[0], p.lhand[1], p.lhand[2]); if (h.RA.hand) h.RA.hand.rotation.set(p.rhand[0], p.rhand[1], p.rhand[2]);
  h.rig.rotation.x = p.rigX; h.rig.position.y = p.rigY;
  if (h.weapon && h.weapon.userData.rest != null) h.weapon.rotation.x = h.weapon.userData.rest + p.wpn;
}
