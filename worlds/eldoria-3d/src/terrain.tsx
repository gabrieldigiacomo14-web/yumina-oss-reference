// @ts-nocheck
// Streaming terrain: chunks of the continent are generated a few rows per frame
// around the player at three levels of detail, with instanced vegetation, road and
// river ribbons, bridges, the sea, sky, day/night lighting and weather.
import { T, GeoBuilder, prim, M, hex, cobbleTex, noiseTex, glowTex, cloudTex } from "./three";
import { MILE, heightAt, groundColor, vegetation, biomeAt, riverAt, roadAt, ROADS, RIVERS, landSD, placesNear, hash2, rng, insidePlace, smooth } from "./worldgen";
import { addTree, addRock, addBridge, ribbon, styleOf } from "./settlements";

export var CH = 320; // chunk size in world units (8 miles)
var LOD_SEGS = [64, 32, 12];

// ------------------------------------------------------------------ vegetation templates (instanced)
var TEMPLATES = null;
function templates() {
  if (TEMPLATES) return TEMPLATES; var THREE = T(); TEMPLATES = {};
  ["oak", "darkoak", "elven", "pine", "palm", "palmish", "dead", "giant", "willow"].forEach(function (s) {
    var vars = []; for (var v = 0; v < 3; v++) { var B = new GeoBuilder(); addTree(B, 0, 0, 0, 1, s, rng(100 + v * 31 + s.length)); vars.push(B.build()); }
    TEMPLATES[s] = vars;
  });
  var RB = new GeoBuilder(); addRock(RB, 0, 0, 0, 1, "#7a766e", rng(5)); TEMPLATES.rock = [RB.build()];
  var GB = new GeoBuilder(); for (var i = 0; i < 5; i++) { var a = i / 5 * Math.PI; GB.add(prim("plane"), M(0, 0.35, 0, 0, a, 0, 0.9, 0.7, 1), [0.9, 1, 0.8]); } TEMPLATES.grass = [GB.build()];
  TEMPLATES.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  TEMPLATES.grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide, alphaTest: 0.5, map: grassTex() });
  return TEMPLATES;
}
function grassTex() { var THREE = T(); var c = document.createElement("canvas"); c.width = 64; c.height = 64; var x = c.getContext("2d"); for (var i = 0; i < 26; i++) { var bx = 4 + Math.random() * 56; x.strokeStyle = "rgba(" + (110 + Math.random() * 50) + "," + (150 + Math.random() * 50) + ",70,1)"; x.lineWidth = 2; x.beginPath(); x.moveTo(bx, 64); x.quadraticCurveTo(bx + (Math.random() - 0.5) * 12, 30, bx + (Math.random() - 0.5) * 20, 6 + Math.random() * 30); x.stroke(); } var t = new THREE.CanvasTexture(c); return t; }

// ------------------------------------------------------------------ terrain chunk manager
export function Terrain(scene, opts) {
  this.scene = scene; this.chunks = {}; this.queue = []; this.job = null; this.opts = opts || {}; this.bridges = []; this.radius = opts.radius || 4;
  var THREE = T();
  this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0, map: noiseTex() });
  this.waterMat = new THREE.MeshStandardMaterial({ color: 0x2c5d70, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.86, polygonOffset: true, polygonOffsetFactor: -1 });
  this.ashenMat = new THREE.MeshStandardMaterial({ color: 0x5a5a58, roughness: 0.3, transparent: true, opacity: 0.9 });
  this.roadMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: cobbleTex(), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  this.dirtMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  this.propMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, flatShading: true });
}
Terrain.prototype.key = function (i, j) { return i + "," + j; };
Terrain.prototype.update = function (px, pz, budgetMs) {
  var ci = Math.floor(px / CH), cj = Math.floor(pz / CH), R = this.radius, want = {};
  for (var di = -R; di <= R; di++) for (var dj = -R; dj <= R; dj++) {
    var d = Math.max(Math.abs(di), Math.abs(dj)); if (Math.hypot(di, dj) > R + 0.5) continue;
    var lod = d <= 1 ? 0 : d <= 2 ? 1 : 2; var k = this.key(ci + di, cj + dj); want[k] = 1;
    var c = this.chunks[k];
    if (!c || (c.lod !== lod && !c.pending)) { if (!this.queue.some(function (q) { return q.k === k && q.lod === lod; })) this.queue.push({ k: k, i: ci + di, j: cj + dj, lod: lod, d: d }); }
  }
  // drop far chunks
  for (var k in this.chunks) if (!want[k]) { this.dispose(this.chunks[k]); delete this.chunks[k]; }
  this.queue = this.queue.filter(function (q) { return want[q.k]; });
  this.queue.sort(function (a, b) { return a.lod - b.lod || a.d - b.d; });
  var t0 = performance.now();
  while (performance.now() - t0 < budgetMs) {
    if (!this.job) { var q = this.queue.shift(); if (!q) break; var ex = this.chunks[q.k]; if (ex && ex.lod === q.lod) continue; this.job = this.startJob(q); }
    if (this.step(this.job, t0, budgetMs)) { this.finish(this.job); this.job = null; }
  }
  return this.queue.length + (this.job ? 1 : 0);
};
// Build the chunks under and around (x, z) right now (used on spawn and travel).
Terrain.prototype.warm = function (x, z, ring) {
  var ci = Math.floor(x / CH), cj = Math.floor(z / CH); ring = ring == null ? 1 : ring;
  for (var di = -ring; di <= ring; di++) for (var dj = -ring; dj <= ring; dj++) { var k = this.key(ci + di, cj + dj); var c = this.chunks[k]; if (c && c.lod === 0) continue; var job = this.startJob({ k: k, i: ci + di, j: cj + dj, lod: 0, d: 0 }); this.step(job, performance.now(), 1e9); this.finish(job); }
  this.queue = this.queue.filter(function (q) { return !(this.chunks[q.k] && this.chunks[q.k].lod === q.lod); }, this);
};
Terrain.prototype.startJob = function (q) {
  var segs = LOD_SEGS[q.lod], n = segs + 1; var x0 = q.i * CH, z0 = q.j * CH;
  return { q: q, segs: segs, n: n, x0: x0, z0: z0, row: 0, h: new Float32Array((n + 2) * (n + 2)), col: new Float32Array(n * n * 3), phase: 0, crow: 0 };
};
// Phase 0: heights (with a 1-vertex border for normals); phase 1: colors.
Terrain.prototype.step = function (job, t0, budget) {
  var n = job.n, step = CH / job.segs, c = [0, 0, 0];
  while (performance.now() - t0 < budget) {
    if (job.phase === 0) {
      var r = job.row; if (r >= n + 2) { job.phase = 1; continue; }
      for (var k = 0; k < n + 2; k++) { var x = job.x0 + (k - 1) * step, z = job.z0 + (r - 1) * step; job.h[r * (n + 2) + k] = heightAt(x / MILE, -z / MILE); }
      job.row++;
    } else {
      var r = job.crow; if (r >= n) return true;
      for (var k = 0; k < n; k++) {
        var hi = (r + 1) * (n + 2) + (k + 1), h = job.h[hi]; var dx = job.h[hi + 1] - job.h[hi - 1], dz = job.h[hi + n + 2] - job.h[hi - n - 2];
        var slope = Math.min(1, Math.hypot(dx, dz) / (2 * step) * 0.9);
        var x = job.x0 + k * step, z = job.z0 + r * step; groundColor(x / MILE, -z / MILE, h, slope, c);
        var o = (r * n + k) * 3; job.col[o] = c[0] * c[0]; job.col[o + 1] = c[1] * c[1]; job.col[o + 2] = c[2] * c[2]; // ~sRGB -> linear
      }
      job.crow++;
    }
  }
  return false;
};
Terrain.prototype.finish = function (job) {
  var THREE = T(); var q = job.q, n = job.n, segs = job.segs, step = CH / segs;
  var g = new THREE.PlaneGeometry(CH, CH, segs, segs); g.rotateX(-Math.PI / 2); g.translate(CH / 2, 0, CH / 2);
  var pos = g.attributes.position; var heights = new Float32Array(n * n);
  for (var i = 0; i < pos.count; i++) { var lx = pos.getX(i), lz = pos.getZ(i); var k = Math.round(lx / step), r = Math.round(lz / step); var h = job.h[(r + 1) * (n + 2) + (k + 1)]; pos.setY(i, h); heights[r * n + k] = h; }
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
  var col = g.attributes.color; for (var i = 0; i < pos.count; i++) { var k = Math.round(pos.getX(i) / step), r = Math.round(pos.getZ(i) / step); var o = (r * n + k) * 3; col.setXYZ(i, job.col[o], job.col[o + 1], job.col[o + 2]); }
  var uv = g.attributes.uv; for (var i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 6, pos.getZ(i) / 6);
  g.computeVertexNormals();
  // skirt to hide LOD seams
  var mesh = new THREE.Mesh(g, this.mat); mesh.position.set(job.x0, 0, job.z0); mesh.receiveShadow = true; mesh.castShadow = q.lod === 0;
  var group = new THREE.Group(); group.add(mesh);
  var skirt = this.skirt(job); if (skirt) group.add(skirt);
  var minH = 1e9; for (var i = 0; i < heights.length; i++) if (heights[i] < minH) minH = heights[i];
  if (minH < 0.4 && this.seaMat) { var sea = new THREE.Mesh(this.seaGeo || (this.seaGeo = new THREE.PlaneGeometry(CH, CH).rotateX(-Math.PI / 2).translate(CH / 2, 0, CH / 2)), this.seaMat); sea.position.set(job.x0, 0.05, job.z0); sea.receiveShadow = true; group.add(sea); }
  var chunk = { k: q.k, i: q.i, j: q.j, lod: q.lod, group: group, heights: heights, n: n, step: step, x0: job.x0, z0: job.z0, bridges: [] };
  if (q.lod <= 1) this.decorate(chunk, q.lod);
  var old = this.chunks[q.k]; if (old) this.dispose(old);
  this.chunks[q.k] = chunk; this.scene.add(group);
};
Terrain.prototype.skirt = function (job) {
  var THREE = T(); var n = job.n, step = CH / job.segs, P = [], C = [];
  function h(r, k) { return job.h[(r + 1) * (n + 2) + (k + 1)]; }
  function col(r, k) { var o = (r * n + k) * 3; return [job.col[o] * 0.7, job.col[o + 1] * 0.7, job.col[o + 2] * 0.7]; }
  var edges = [[0, 0, 0, 1], [n - 1, 0, 0, 1], [0, 0, 1, 0], [0, n - 1, 1, 0]];
  edges.forEach(function (e) { for (var t = 0; t < n - 1; t++) { var r1 = e[0] + e[2] * t, k1 = e[1] + e[3] * t, r2 = r1 + e[2], k2 = k1 + e[3]; var a = [k1 * step, h(r1, k1), r1 * step], b = [k2 * step, h(r2, k2), r2 * step]; var ca = col(r1, k1); var quad = [a, b, [b[0], b[1] - 8, b[2]], a, [b[0], b[1] - 8, b[2]], [a[0], a[1] - 8, a[2]]]; quad.forEach(function (p) { P.push(p[0], p[1], p[2]); C.push(ca[0], ca[1], ca[2]); }); } });
  var g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); g.computeVertexNormals();
  var m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.position.set(job.x0, 0, job.z0); return m;
};
// sample the chunk's own height grid so feet match the rendered surface
Terrain.prototype.groundAt = function (x, z) {
  var c = this.chunks[this.key(Math.floor(x / CH), Math.floor(z / CH))]; var h;
  if (c) { var fx = (x - c.x0) / c.step, fz = (z - c.z0) / c.step; var k = Math.min(c.n - 2, Math.max(0, Math.floor(fx))), r = Math.min(c.n - 2, Math.max(0, Math.floor(fz))); var tx = fx - k, tz = fz - r; var H = c.heights, n = c.n;
    // PlaneGeometry triangulation: (a=r,k) (b=r+1,k) (c=r+1,k+1) (d=r,k+1); tris a-b-d and b-c-d
    var ha = H[r * n + k], hb = H[(r + 1) * n + k], hc = H[(r + 1) * n + k + 1], hd = H[r * n + k + 1];
    if (tx + tz <= 1) h = ha + (hd - ha) * tx + (hb - ha) * tz; else h = hc + (hb - hc) * (1 - tx) + (hd - hc) * (1 - tz);
  } else h = heightAt(x / MILE, -z / MILE);
  for (var i = 0; i < this.bridges.length; i++) { var b = this.bridges[i]; var vx = b.x2 - b.x1, vz = b.z2 - b.z1, L2 = vx * vx + vz * vz; var t = ((x - b.x1) * vx + (z - b.z1) * vz) / L2; if (t < -0.02 || t > 1.02) continue; var d = Math.hypot(x - b.x1 - vx * t, z - b.z1 - vz * t); if (d < b.w / 2 + 0.3 && b.y > h - 0.5) h = Math.max(h, b.y); }
  return h;
};
Terrain.prototype.loaded = function (x, z) { var c = this.chunks[this.key(Math.floor(x / CH), Math.floor(z / CH))]; return !!c && c.lod === 0; };
Terrain.prototype.decorate = function (chunk, lod) {
  var THREE = T(); var TP = templates(); var x0 = chunk.x0, z0 = chunk.z0; var self = this;
  var cell = lod === 0 ? 11 : 16; var inst = {}; var rocks = []; var grass = [];
  var nC = Math.floor(CH / cell);
  for (var a = 0; a < nC; a++) for (var b = 0; b < nC; b++) {
    var gx = Math.floor(x0 / cell) + a, gz = Math.floor(z0 / cell) + b; var r1 = hash2(gx, gz, 11), r2 = hash2(gx, gz, 23), r3 = hash2(gx, gz, 37);
    var x = (gx + r1) * cell, z = (gz + r2) * cell; var xm = x / MILE, ym = -z / MILE;
    var h = this.groundAtChunk(chunk, x, z); if (h < 0.6) continue;
    var b0 = biomeAt(xm, ym, h); var veg = vegetation(xm, ym, b0);
    var ins = insidePlace(xm, ym); if (ins && Math.hypot(xm - ins.x, ym - ins.y) < ins.r * 1.05) { if (ins.realm !== "Sylvanor" || r3 > 0.15) continue; }
    var rd = roadAt(xm, ym); if (rd && rd.d < rd.w + 0.06) continue; var rv = riverAt(xm, ym); if (rv && rv.d < rv.w * 2.2) continue;
    var slope = Math.abs(this.groundAtChunk(chunk, x + 2, z) - h) + Math.abs(this.groundAtChunk(chunk, x, z + 2) - h);
    if (r3 < veg.trees && slope < 3.2) { var s = veg.style; (inst[s] = inst[s] || []).push([x, h, z, 0.8 + hash2(gx, gz, 5) * 0.7, hash2(gx, gz, 9) * 6.28, Math.floor(hash2(gx, gz, 13) * 3)]); }
    else if (r3 > 0.985 || (slope > 4 && r3 > 0.8)) rocks.push([x, h, z, 0.8 + r1 * 2.6, r2 * 6.28]);
    else if (lod === 0 && r3 > 1 - veg.grass * 0.55) { for (var q = 0; q < 3; q++) { var gx2 = x + (hash2(gx, gz, 50 + q) - 0.5) * cell, gz2 = z + (hash2(gx, gz, 70 + q) - 0.5) * cell; grass.push([gx2, this.groundAtChunk(chunk, gx2, gz2), gz2, 0.8 + hash2(gx, gz, 90 + q) * 0.8, hash2(gx, gz, 99 + q) * 6.28]); } }
  }
  var m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3(), colr = new THREE.Color();
  function addInst(geo, list, mat, shadow) { if (!list.length) return; var im = new THREE.InstancedMesh(geo, mat, list.length); for (var i = 0; i < list.length; i++) { var it = list[i]; e4.set(0, it[4], 0); q4.setFromEuler(e4); v4.set(it[0], it[1], it[2]); s4.set(it[3], it[3], it[3]); m4.compose(v4, q4, s4); im.setMatrixAt(i, m4); var k = 0.85 + hash2(i, list.length, 3) * 0.3; colr.setRGB(k, k, k); im.setColorAt && im.setColorAt(i, colr); } im.instanceMatrix.needsUpdate = true; im.castShadow = shadow; im.receiveShadow = true; im.frustumCulled = false; chunk.group.add(im); }
  for (var s in inst) { var lists = [[], [], []]; inst[s].forEach(function (it) { lists[it[5]].push(it); }); lists.forEach(function (l, vi) { addInst(TP[s][vi] || TP[s][0], l, TP.mat, lod === 0); }); }
  addInst(TP.rock[0], rocks, TP.mat, lod === 0);
  if (grass.length) addInst(TP.grass[0], grass, TP.grassMat, false);
  // rivers and roads
  this.ribbons(chunk, lod);
};
Terrain.prototype.groundAtChunk = function (c, x, z) { var fx = Math.max(0, Math.min(c.n - 1.001, (x - c.x0) / c.step)), fz = Math.max(0, Math.min(c.n - 1.001, (z - c.z0) / c.step)); var k = Math.floor(fx), r = Math.floor(fz), tx = fx - k, tz = fz - r, H = c.heights, n = c.n; var a = H[r * n + k], b = H[r * n + k + 1], cc = H[(r + 1) * n + k], d = H[(r + 1) * n + k + 1]; return (a * (1 - tx) + b * tx) * (1 - tz) + (cc * (1 - tx) + d * tx) * tz; };
Terrain.prototype.ribbons = function (chunk, lod) {
  var THREE = T(); var self = this; var minx = chunk.x0 - 10, maxx = chunk.x0 + CH + 10, minz = chunk.z0 - 10, maxz = chunk.z0 + CH + 10;
  function inBox(ax, az, bx, bz) { return !(Math.max(ax, bx) < minx || Math.min(ax, bx) > maxx || Math.max(az, bz) < minz || Math.min(az, bz) > maxz); }
  var WB = new GeoBuilder(), AB = new GeoBuilder();
  RIVERS.forEach(function (r) {
    if (r.dry) return;
    for (var i = 0; i < r.pts.length - 1; i++) {
      var ax = r.pts[i][0] * MILE, az = -r.pts[i][1] * MILE, bx = r.pts[i + 1][0] * MILE, bz = -r.pts[i + 1][1] * MILE; if (!inBox(ax, az, bx, bz)) continue;
      var t0 = r.len[i] / r.total, t1 = r.len[i + 1] / r.total; var w0 = (r.w0 + (r.w1 - r.w0) * t0) * MILE * 2.1, la = r.level[i] + 0.12, lb = r.level[i + 1] + 0.12;
      if (la < 0.3 && lb < 0.3) continue;
      // overlap segments slightly so joints have no gaps
      var L = Math.hypot(bx - ax, bz - az), ex = (bx - ax) / L * w0 * 0.3, ez = (bz - az) / L * w0 * 0.3;
      ribbon(r.ashen ? AB : WB, ax - ex, az - ez, bx + ex, bz + ez, w0, function (x, z) { var t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (L * L))); return la + (lb - la) * t; }, [1, 1, 1]);
    }
  });
  if (!WB.empty()) chunk.group.add(new THREE.Mesh(WB.build(), this.waterMat));
  if (!AB.empty()) chunk.group.add(new THREE.Mesh(AB.build(), this.ashenMat));
  if (lod > 1) return;
  var RB = new GeoBuilder(), DB = new GeoBuilder(), BB = new GeoBuilder();
  var stp = STYLE_FALLBACK;
  ROADS.forEach(function (rd) {
    var paved = rd.kind === "paved"; var w = { paved: 4.2, gravel: 3.4, track: 2.6, trail: 1.8, cairn: 1.6 }[rd.kind] || 2.4;
    for (var i = 0; i < rd.pts.length - 1; i++) {
      var ax = rd.pts[i][0] * MILE, az = -rd.pts[i][1] * MILE, bx = rd.pts[i + 1][0] * MILE, bz = -rd.pts[i + 1][1] * MILE; if (!inBox(ax, az, bx, bz)) continue;
      // skip inside settlements (the town streets take over)
      var mid = insidePlace((ax + bx) / 2 / MILE, -(az + bz) / 2 / MILE); if (mid) continue;
      var col = paved ? [0.95, 0.93, 0.9] : rd.kind === "gravel" ? [0.62, 0.55, 0.42] : rd.kind === "cairn" ? [0.38, 0.36, 0.35] : [0.46, 0.38, 0.27];
      ribbon(paved ? RB : DB, ax, az, bx, bz, w, function (x, z) { var c2 = self.chunks[self.key(Math.floor(x / CH), Math.floor(z / CH))]; return (c2 && c2.heights ? self.groundAtChunk(c2, x, z) : chunk.x0 <= x && x <= chunk.x0 + CH && chunk.z0 <= z && z <= chunk.z0 + CH ? self.groundAtChunk(chunk, x, z) : heightAt(x / MILE, -z / MILE)) + 0.22; }, col);
      // bridges where the road meets a river
      var L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 2), inW = false, sx = 0, sz = 0;
      for (var k = 0; k <= n; k++) { var t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (x < chunk.x0 || x >= chunk.x0 + CH || z < chunk.z0 || z >= chunk.z0 + CH) { inW = false; continue; } var rv = riverAt(x / MILE, -z / MILE); var wet = rv && !rv.river.dry && rv.d < rv.w * 1.25; if (wet && !inW) { inW = true; sx = x; sz = z; } if (!wet && inW) { inW = false; var ux = (bx - ax) / L, uz = (bz - az) / L; var x1 = sx - ux * 5, z1 = sz - uz * 5, x2 = x + ux * 5, z2 = z + uz * 5; var y = Math.max(heightAt(x1 / MILE, -z1 / MILE), heightAt(x2 / MILE, -z2 / MILE)) + 0.3; chunk.bridges.push(addBridge(BB, x1, z1, x2, z2, y, w + 1.2, stp)); } }
    }
  });
  if (!RB.empty()) { var rm = new THREE.Mesh(RB.build(), this.roadMat); rm.receiveShadow = true; chunk.group.add(rm); }
  if (!DB.empty()) { var dm = new THREE.Mesh(DB.build(), this.dirtMat); dm.receiveShadow = true; chunk.group.add(dm); }
  if (!BB.empty()) { var bm = new THREE.Mesh(BB.build(), this.propMat); bm.castShadow = true; bm.receiveShadow = true; chunk.group.add(bm); }
  chunk.bridges.forEach(function (b) { self.bridges.push(b); });
};
var STYLE_FALLBACK = { stone: "#8e8a83", wallStone: "#77746e" };
Terrain.prototype.dispose = function (c) {
  var self = this; this.scene.remove(c.group);
  c.group.traverse(function (o) { if (o.geometry && !o.isInstancedMesh && o.geometry !== self.seaGeo) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose && o.dispose(); });
  if (c.bridges.length) this.bridges = this.bridges.filter(function (b) { return c.bridges.indexOf(b) < 0; });
};
Terrain.prototype.disposeAll = function () { for (var k in this.chunks) this.dispose(this.chunks[k]); this.chunks = {}; this.queue = []; this.job = null; };

// ------------------------------------------------------------------ sky, sun, sea, weather
var SKY_VS = "varying vec3 vDir; void main(){ vec4 wp = modelMatrix*vec4(position,1.0); vDir = normalize(wp.xyz - cameraPosition); gl_Position = projectionMatrix*viewMatrix*wp; gl_Position.z = gl_Position.w; }";
var SKY_FS = "uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunSize; varying vec3 vDir; void main(){ vec3 d = normalize(vDir); float h = d.y; vec3 c = h > 0.0 ? mix(horizon, top, pow(clamp(h,0.0,1.0), 0.55)) : mix(horizon, ground, clamp(-h*3.0,0.0,1.0)); float s = max(dot(d, normalize(sunDir)), 0.0); c += sunColor * (pow(s, 600.0) * sunSize + pow(s, 12.0) * 0.18 + pow(s, 3.0)*0.06); gl_FragColor = vec4(c, 1.0); }";

export function Environment(scene, renderer, quality) {
  var THREE = T(); this.scene = scene; this.q = quality;
  this.uniforms = { top: { value: new THREE.Color(0x3a6aa8) }, horizon: { value: new THREE.Color(0xbcd0de) }, ground: { value: new THREE.Color(0x4a4a44) }, sunDir: { value: new THREE.Vector3(0.3, 0.6, -0.5) }, sunColor: { value: new THREE.Color(0xfff2d0) }, sunSize: { value: 1.0 } };
  this.sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false }));
  this.sky.frustumCulled = false; this.sky.renderOrder = -10; scene.add(this.sky);
  this.hemi = new THREE.HemisphereLight(0xc8dcff, 0x4a4030, 0.65); scene.add(this.hemi);
  this.sun = new THREE.DirectionalLight(0xfff0d8, 1.6); this.sun.castShadow = quality.shadows; var sz = 80;
  this.sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap); var sc = this.sun.shadow.camera; sc.left = -sz; sc.right = sz; sc.top = sz; sc.bottom = -sz; sc.near = 1; sc.far = 600; this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.6;
  scene.add(this.sun); scene.add(this.sun.target);
  scene.fog = new THREE.Fog(0xbcd0de, 300, quality.far);
  // sea
  var wt = noiseTex().clone(); wt.needsUpdate = true; wt.repeat.set(220, 220);
  this.sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000, 1, 1), new THREE.MeshStandardMaterial({ color: 0x1e4c62, roughness: 0.18, metalness: 0.25, transparent: true, opacity: 0.9, bumpMap: wt, bumpScale: 0.6 }));
  this.sea.rotation.x = -Math.PI / 2; this.sea.position.y = 0.05; this.seaTex = wt; // per-chunk quads share this.sea.material
  // stars
  var sp = []; var r = rng(77); for (var i = 0; i < 1400; i++) { var u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u); if (u < -0.05) continue; sp.push(Math.cos(th) * s * 1800, u * 1800, Math.sin(th) * s * 1800); }
  var sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false })); this.stars.frustumCulled = false; scene.add(this.stars);
  // moon
  this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xdfe8ff, transparent: true, depthWrite: false, fog: false })); this.moon.scale.set(90, 90, 1); scene.add(this.moon);
  // clouds
  this.clouds = new THREE.Group(); var ct = cloudTex(); for (var i = 0; i < 26; i++) { var c = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, transparent: true, depthWrite: false, opacity: 0.8, fog: false })); var a = r() * Math.PI * 2, d = 400 + r() * 1100; c.position.set(Math.cos(a) * d, 260 + r() * 160, Math.sin(a) * d); c.scale.set(420 + r() * 300, 160 + r() * 80, 1); this.clouds.add(c); } scene.add(this.clouds);
  // precipitation
  var N = quality.particles; var pp = new Float32Array(N * 3); for (var i = 0; i < N; i++) { pp[i * 3] = (r() - 0.5) * 120; pp[i * 3 + 1] = r() * 60; pp[i * 3 + 2] = (r() - 0.5) * 120; }
  var pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  this.precip = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xcfd8e0, size: 0.18, transparent: true, opacity: 0.7, depthWrite: false })); this.precip.visible = false; this.precip.frustumCulled = false; scene.add(this.precip);
  this.weatherKind = "clear"; this.t = 0;
}
// minutes: minutes after midnight; weather: the weather variable text; region: realm name
Environment.prototype.update = function (dt, center, minutes, weather, region, biome) {
  var THREE = T(); this.t += dt; var U = this.uniforms;
  var dayT = (minutes / 1440) * Math.PI * 2 - Math.PI / 2; // sunrise ~6:00
  var elev = Math.sin(dayT), az = Math.cos(dayT);
  var sunDir = new THREE.Vector3(az * 0.8, elev, -0.35).normalize(); U.sunDir.value.copy(sunDir);
  var day = smooth(-0.12, 0.25, elev), dusk = Math.max(0, 1 - Math.abs(elev) / 0.28) * smooth(-0.25, 0, elev);
  var w = String(weather || "").toLowerCase(); var overcast = /storm|heavy|rain|snow|fog/.test(w) ? 0.8 : /overcast/.test(w) ? 0.45 : /cloud|drizzle|mist|haze|ash/.test(w) ? 0.3 : 0.08;
  var umbral = region === "Umbral Reach" ? 1 : 0, desert = region === "Sunscar" ? 1 : 0, cold = /Drakmor|Marches/.test(region) ? 1 : 0;
  var topDay = new THREE.Color(0x2f62a8).lerp(new THREE.Color(0x7a8494), overcast * 0.8).lerp(new THREE.Color(0x4a4058), umbral * 0.7);
  var horDay = new THREE.Color(0xc6dbe8).lerp(new THREE.Color(0xa8b0b8), overcast * 0.7).lerp(new THREE.Color(0xe6d2a8), desert * 0.5).lerp(new THREE.Color(0x8a7a7e), umbral * 0.75);
  var topN = new THREE.Color(0x070b18), horN = new THREE.Color(0x1a2236), duskC = new THREE.Color(0xe8865a);
  U.top.value.copy(topN).lerp(topDay, day); U.horizon.value.copy(horN).lerp(horDay, day).lerp(duskC, dusk * 0.65 * (1 - overcast));
  U.ground.value.copy(U.horizon.value).multiplyScalar(0.55);
  U.sunColor.value.setRGB(1, 0.85 + day * 0.1, 0.6 + day * 0.3).multiplyScalar(elev > -0.05 ? (1 - overcast * 0.85) : 0);
  this.scene.fog.color.copy(U.horizon.value);
  var fogNear = /fog|mist/.test(w) ? 40 : umbral ? 120 : /rain|snow|storm/.test(w) ? 180 : 420; this.scene.fog.near = fogNear; this.scene.fog.far = Math.min(this.q.far, /fog|mist/.test(w) ? 380 : umbral ? 700 : this.q.far);
  // lights
  var lightDir = elev > -0.08 ? sunDir.clone() : new THREE.Vector3(-az * 0.6, Math.max(0.2, -elev), 0.3).normalize();
  this.sun.position.set(center.x + lightDir.x * 300, center.y + lightDir.y * 300, center.z + lightDir.z * 300); this.sun.target.position.set(center.x, center.y, center.z);
  this.sun.intensity = elev > -0.08 ? (0.25 + day * 1.55) * (1 - overcast * 0.55) : 0.22; this.sun.color.setRGB(1, 0.8 + day * 0.15, 0.62 + day * 0.32);
  if (elev <= -0.08) this.sun.color.setRGB(0.55, 0.65, 0.95);
  this.hemi.intensity = 0.12 + day * 0.22; this.hemi.color.copy(U.horizon.value).lerp(new THREE.Color(0xffffff), 0.4); this.hemi.groundColor.setRGB(0.25 + day * 0.1, 0.22 + day * 0.08, 0.18);
  this.sky.position.copy(center); this.stars.position.copy(center); this.stars.material.opacity = Math.max(0, 1 - day * 1.6) * (1 - overcast);
  this.moon.position.set(center.x - lightDir.x * 1500, center.y + Math.max(200, -elev * 900 + 300), center.z - lightDir.z * 1500); this.moon.material.opacity = Math.max(0, 1 - day * 1.4);
  this.clouds.position.set(center.x, 0, center.z); this.clouds.rotation.y += dt * 0.002; this.clouds.children.forEach(function (c) { c.material.opacity = (0.35 + overcast * 0.55) * (0.3 + day * 0.7); c.material.color.copy(U.horizon.value).lerp(new THREE.Color(0xffffff), 0.5 * day); });
  this.seaTex.offset.set(this.t * 0.01, this.t * 0.006); this.sea.material.color.setRGB(0.1 + day * 0.07, 0.24 + day * 0.1, 0.32 + day * 0.1);
  // precipitation
  var kind = /snow|blizzard|sleet/.test(w) || (cold && /storm/.test(w)) ? "snow" : /rain|storm|drizzle|shower/.test(w) ? "rain" : umbral ? "ash" : "none";
  this.precip.visible = kind !== "none" && this.q.particles > 0;
  if (this.precip.visible) {
    var pm = this.precip.material; pm.color.set(kind === "rain" ? 0x9fb4c8 : kind === "snow" ? 0xffffff : 0x6a6268); pm.size = kind === "rain" ? 0.12 : kind === "snow" ? 0.3 : 0.22;
    var vy = kind === "rain" ? 38 : kind === "snow" ? 3 : 1.2; var a = this.precip.geometry.attributes.position; var arr = a.array;
    for (var i = 0; i < arr.length; i += 3) { arr[i + 1] -= vy * dt; if (kind !== "rain") { arr[i] += Math.sin(this.t + i) * dt * 0.8; } if (arr[i + 1] < -5) arr[i + 1] += 60; }
    a.needsUpdate = true; this.precip.position.set(center.x, center.y - 5, center.z);
  }
  return { day: day, elev: elev, night: 1 - day };
};
