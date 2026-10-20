// @ts-nocheck
// Combat effects: one pooled additive particle cloud (sparks, dust, embers, heal motes,
// spell trails), weapon-swing trails, expanding impact rings, flash sprites and camera
// shake. Everything is a handful of draw calls so phones keep up.
import { T, glowTex } from "./three";

var MAXP = 900;
export function Fx(scene) {
  var THREE = T(); this.scene = scene; this.n = 0; this.p = []; this.rings = []; this.flashes = []; this.trails = []; this.shake = 0; this.t = 0;
  var g = new THREE.BufferGeometry(); this.pos = new Float32Array(MAXP * 3); this.tint = new Float32Array(MAXP * 4); this.size = new Float32Array(MAXP);
  g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute("tint", new THREE.BufferAttribute(this.tint, 4).setUsage(THREE.DynamicDrawUsage)); g.setAttribute("size", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
  g.setDrawRange(0, 0); this.geo = g;
  var m = new THREE.ShaderMaterial({ uniforms: { map: { value: glowTex() }, scale: { value: 420 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: "attribute float size; attribute vec4 tint; varying vec4 vT; uniform float scale; void main(){ vT = tint; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / max(0.5, -mv.z); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "uniform sampler2D map; varying vec4 vT; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vT.rgb * t.rgb, t.a * vT.a); }" });
  this.points = new THREE.Points(g, m); this.points.frustumCulled = false; this.points.renderOrder = 20; scene.add(this.points);
}
function rgb(c) { var THREE = T(); var k = new THREE.Color(c); return [k.r, k.g, k.b]; }
// opts: n, color, speed, up, size, life, grav, drag, spread (radius), grow, alpha
Fx.prototype.emit = function (x, y, z, o) {
  var c = rgb(o.color || "#ffd080"), c2 = o.color2 ? rgb(o.color2) : c; var n = o.n || 10;
  for (var i = 0; i < n && this.p.length < MAXP; i++) {
    var a = Math.random() * Math.PI * 2, e = (Math.random() * 2 - 1) * (o.flat ? 0.25 : 1), sp = (o.speed || 3) * (0.35 + Math.random() * 0.65), r = Math.sqrt(Math.max(0, 1 - e * e));
    var s = o.spread || 0; var k = Math.random();
    this.p.push({ x: x + (Math.random() - 0.5) * s, y: y + (Math.random() - 0.5) * s * 0.6, z: z + (Math.random() - 0.5) * s, vx: Math.cos(a) * r * sp + (o.vx || 0), vy: e * sp + (o.up || 0) * (0.6 + Math.random() * 0.8), vz: Math.sin(a) * r * sp + (o.vz || 0), life: 0, max: (o.life || 0.6) * (0.6 + Math.random() * 0.7), size: (o.size || 0.25) * (0.6 + Math.random() * 0.8), grow: o.grow || 0, grav: o.grav == null ? 9 : o.grav, drag: o.drag == null ? 1.5 : o.drag, r: c[0] + (c2[0] - c[0]) * k, g: c[1] + (c2[1] - c[1]) * k, b: c[2] + (c2[2] - c[2]) * k, a: o.alpha || 1 });
  }
};
Fx.prototype.sparks = function (x, y, z, color, big) { this.emit(x, y, z, { n: big ? 34 : 16, color: color || "#fff2c0", color2: "#ff9a3a", speed: big ? 9 : 6, size: 0.12, life: 0.45, grav: 14, drag: 2.5 }); this.flash(x, y, z, color || "#ffe6b0", big ? 1.8 : 1.0); };
Fx.prototype.blood = function (x, y, z, color) { this.emit(x, y, z, { n: 12, color: color || "#7a1410", color2: "#3a0806", speed: 4, size: 0.16, life: 0.6, grav: 16, drag: 1, alpha: 0.9 }); };
Fx.prototype.dust = function (x, y, z, color, n) { this.emit(x, y, z, { n: n || 14, color: color || "#a89a80", color2: "#6a604e", speed: 2.4, up: 0.8, size: 0.7, grow: 1.6, life: 0.9, grav: -0.3, drag: 3, alpha: 0.35, flat: true }); };
Fx.prototype.motes = function (x, y, z, color, n) { this.emit(x, y, z, { n: n || 26, color: color || "#9cff9c", color2: "#fffcc0", speed: 0.8, up: 2.2, size: 0.18, life: 1.3, grav: -0.6, drag: 0.6, spread: 1.0 }); };
Fx.prototype.burst = function (x, y, z, color, big) { this.emit(x, y, z, { n: big ? 46 : 26, color: color, color2: "#ffffff", speed: big ? 7 : 5, size: 0.3, life: 0.6, grav: 2, drag: 2.2 }); this.flash(x, y, z, color, big ? 3 : 1.8); this.ring(x, y - 0.8, z, color, big ? 3.2 : 2); };
Fx.prototype.trailPuff = function (x, y, z, color) { this.emit(x, y, z, { n: 2, color: color, color2: "#ffffff", speed: 0.5, size: 0.28, life: 0.35, grav: 0, drag: 1, spread: 0.12 }); };
Fx.prototype.flash = function (x, y, z, color, size) {
  var THREE = T(); var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(color || "#ffffff"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.position.set(x, y, z); s.scale.setScalar(0.1); s.renderOrder = 21; this.scene.add(s); this.flashes.push({ s: s, t: 0, max: 0.22, size: size || 1.2 });
};
Fx.prototype.ring = function (x, y, z, color, radius) {
  var THREE = T(); if (!Fx.ringGeo) { Fx.ringGeo = new THREE.RingGeometry(0.82, 1, 48); Fx.ringGeo.rotateX(-Math.PI / 2); }
  var m = new THREE.Mesh(Fx.ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color || "#ffffff"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.position.set(x, y + 0.06, z); m.scale.setScalar(0.2); m.renderOrder = 21; this.scene.add(m); this.rings.push({ m: m, t: 0, max: 0.5, r: radius || 2 });
};
Fx.prototype.kick = function (amount) { this.shake = Math.min(0.6, this.shake + amount); };

// Weapon trail for a humanoid whose weapon carries userData.tipY. Call every frame.
var SWINGS = { slash: 1, smash: 1, thrust: 1, punch: 0 };
Fx.prototype.trail = function (h, color) {
  var THREE = T(); var w = h.weapon; if (!w || w.userData.tipY == null) return;
  var tr = h._trail; var active = !!(h.action && SWINGS[h.action] && h.actionT > 0.08 && h.actionT < (h.action === "smash" ? 0.7 : 0.45));
  if (!tr) { if (!active) return; var N = 18; var g = new THREE.BufferGeometry(); var pos = new Float32Array(N * 2 * 3), col = new Float32Array(N * 2 * 4); g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute("color", new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage)); var idx = []; for (var i = 0; i < N - 1; i++) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx); g.setDrawRange(0, 0);
    var mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); mesh.frustumCulled = false; mesh.renderOrder = 19; this.scene.add(mesh); tr = h._trail = { mesh: mesh, N: N, s: [], c: rgb(color || "#d8e8ff") }; this.trails.push(tr); }
  var now = this.t; if (active) { h.root.updateMatrixWorld(true); var tip = new THREE.Vector3(0, w.userData.tipY, 0), base = new THREE.Vector3(0, w.userData.tipY * 0.45, 0); w.localToWorld(tip); w.localToWorld(base); tr.s.push({ t: now, a: base, b: tip }); if (tr.s.length > tr.N) tr.s.shift(); }
  tr.s = tr.s.filter(function (q) { return now - q.t < 0.14; }); tr.h = h;
};
Fx.prototype.updateTrails = function () {
  var now = this.t; var self = this;
  this.trails = this.trails.filter(function (tr) {
    tr.s = tr.s.filter(function (q) { return now - q.t < 0.14; });
    var g = tr.mesh.geometry; var P = g.attributes.position.array, C = g.attributes.color.array; var n = tr.s.length;
    for (var i = 0; i < n; i++) { var q = tr.s[i]; var k = (1 - (now - q.t) / 0.14) * (i / Math.max(1, n - 1)); P.set([q.a.x, q.a.y, q.a.z, q.b.x, q.b.y, q.b.z], i * 6); C.set([tr.c[0], tr.c[1], tr.c[2], k * 0.05, tr.c[0], tr.c[1], tr.c[2], k * 0.85], i * 8); }
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.setDrawRange(0, Math.max(0, n - 1) * 6);
    if (!n && tr.idle > 4) { self.scene.remove(tr.mesh); g.dispose(); tr.mesh.material.dispose(); if (tr.h) tr.h._trail = null; return false; }
    tr.idle = n ? 0 : (tr.idle || 0) + 1 / 60; return true;
  });
};
Fx.prototype.update = function (dt, camera) {
  this.t += dt; var P = this.pos, C = this.tint, S = this.size; var j = 0;
  this.p = this.p.filter(function (q) { q.life += dt; if (q.life >= q.max) return false; var dr = Math.exp(-q.drag * dt); q.vx *= dr; q.vz *= dr; q.vy = q.vy * dr - q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; return true; });
  for (var i = 0; i < this.p.length; i++) { var q = this.p[i]; var u = q.life / q.max; var fade = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85; P[j * 3] = q.x; P[j * 3 + 1] = q.y; P[j * 3 + 2] = q.z; C[j * 4] = q.r; C[j * 4 + 1] = q.g; C[j * 4 + 2] = q.b; C[j * 4 + 3] = fade * q.a; S[j] = q.size * (1 + q.grow * u); j++; }
  this.geo.setDrawRange(0, j); if (j) { this.geo.attributes.position.needsUpdate = true; this.geo.attributes.tint.needsUpdate = true; this.geo.attributes.size.needsUpdate = true; }
  var sc = this.scene;
  this.flashes = this.flashes.filter(function (f) { f.t += dt; var u = f.t / f.max; f.s.scale.setScalar(f.size * (0.4 + u * 0.9)); f.s.material.opacity = 1 - u; if (u >= 1) { sc.remove(f.s); f.s.material.dispose(); return false; } return true; });
  this.rings = this.rings.filter(function (r) { r.t += dt; var u = r.t / r.max; r.m.scale.setScalar(0.2 + r.r * (1 - Math.pow(1 - u, 3))); r.m.material.opacity = 0.85 * (1 - u); if (u >= 1) { sc.remove(r.m); r.m.material.dispose(); return false; } return true; });
  this.updateTrails();
  if (camera && this.shake > 0.002) { var s = this.shake; camera.position.x += (Math.random() - 0.5) * s; camera.position.y += (Math.random() - 0.5) * s; camera.position.z += (Math.random() - 0.5) * s; this.shake *= Math.exp(-dt * 9); }
};
Fx.prototype.dispose = function () { var sc = this.scene; sc.remove(this.points); this.geo.dispose(); this.points.material.dispose(); this.flashes.forEach(function (f) { sc.remove(f.s); }); this.rings.forEach(function (r) { sc.remove(r.m); }); this.trails.forEach(function (t) { sc.remove(t.mesh); t.mesh.geometry.dispose(); }); };
