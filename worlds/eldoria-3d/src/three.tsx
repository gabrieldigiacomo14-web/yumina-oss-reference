// @ts-nocheck
// three.js bootstrap + low-level builders shared by every 3D module.
// The Yumina sandbox strips npm imports, but its CSP allows https: scripts, so the
// UMD build of three.js is injected from a pinned CDN URL (with a fallback mirror).
var THREE_URLS = [
  "https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js",
  "https://unpkg.com/three@0.149.0/build/three.min.js"
];
var loading = null;
export function loadThree() {
  if (typeof window !== "undefined" && window.THREE && window.THREE.WebGLRenderer) return Promise.resolve(colorManage(window.THREE));
  if (loading) return loading;
  loading = new Promise(function (resolve, reject) {
    var i = 0;
    function next() {
      if (i >= THREE_URLS.length) { loading = null; reject(new Error("Could not load the 3D engine (three.js) from the CDN. Check your connection and reload.")); return; }
      var s = document.createElement("script"); s.src = THREE_URLS[i++]; s.async = true; s.crossOrigin = "anonymous";
      s.onload = function () { if (window.THREE) resolve(colorManage(window.THREE)); else next(); };
      s.onerror = function () { s.remove(); next(); };
      document.head.appendChild(s);
    }
    next();
  });
  return loading;
}
export function T() { return window.THREE; }
// Treat every hex color as sRGB (three r149 defaults to legacy linear handling, which washes colors out).
export function colorManage(THREE) { try { var CM = THREE.ColorManagement; if (CM) { if ("enabled" in CM) CM.enabled = true; else CM.legacyMode = false; } } catch (e) { } return THREE; }

// ------------------------------------------------------------------ merged, vertex-colored geometry
// Thousands of houses, trees and rocks are baked into a handful of draw calls.
// color = [r, g, b, jitter, material class]; the class (see surfaces.tsx) picks the surface detail a patched material draws
export function GeoBuilder() { this.pos = []; this.nrm = []; this.col = []; this.uv = []; this.cls = []; this.anyCls = false; this._m = null; this._n = null; }
var _v, _n, _m3;
GeoBuilder.prototype.add = function (geo, matrix, color, flat) {
  var THREE = T(); if (!_v) { _v = new THREE.Vector3(); _n = new THREE.Vector3(); _m3 = new THREE.Matrix3(); }
  var g = geo.index ? geo.toNonIndexed() : geo; if (flat) g.computeVertexNormals();
  var p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv; _m3.getNormalMatrix(matrix);
  var c = color; var cr = c[0], cg = c[1], cb = c[2], jitter = c[3] || 0, cl = c[4] || 0; if (cl) this.anyCls = true;
  for (var i = 0; i < p.count; i++) {
    _v.fromBufferAttribute(p, i).applyMatrix4(matrix); this.pos.push(_v.x, _v.y, _v.z);
    _n.fromBufferAttribute(n, i).applyMatrix3(_m3).normalize(); this.nrm.push(_n.x, _n.y, _n.z);
    var j = jitter ? 1 + (((i * 7919) % 13) / 13 - 0.5) * jitter : 1;
    this.col.push(cr * j, cg * j, cb * j); this.cls.push(cl);
    if (uv) this.uv.push(uv.getX(i), uv.getY(i)); else this.uv.push(0, 0);
  }
  if (g !== geo) g.dispose();
  return this;
};
GeoBuilder.prototype.build = function () {
  var THREE = T(); var g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nrm, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
  if (this.anyCls) g.setAttribute("mclass", new THREE.Float32BufferAttribute(this.cls, 1));
  g.computeBoundingSphere(); return g;
};
GeoBuilder.prototype.empty = function () { return this.pos.length === 0; };

var GEO_CACHE = {};
// Unit primitives (cached, never disposed) to stamp into builders.
export function prim(kind) {
  if (GEO_CACHE[kind]) return GEO_CACHE[kind];
  var THREE = T(), g;
  switch (kind) {
    case "box": g = new THREE.BoxGeometry(1, 1, 1); break;
    case "boxb": g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); break; // base at y=0
    case "cyl": g = new THREE.CylinderGeometry(0.5, 0.5, 1, 10); g.translate(0, 0.5, 0); break;
    case "cyl6": g = new THREE.CylinderGeometry(0.5, 0.5, 1, 6); g.translate(0, 0.5, 0); break;
    case "cyl16": g = new THREE.CylinderGeometry(0.5, 0.5, 1, 16); g.translate(0, 0.5, 0); break;
    case "cone": g = new THREE.ConeGeometry(0.5, 1, 10); g.translate(0, 0.5, 0); break;
    case "cone4": g = new THREE.ConeGeometry(0.5, 1, 4); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); break;
    case "cone6": g = new THREE.ConeGeometry(0.5, 1, 6); g.translate(0, 0.5, 0); break;
    case "cone8": g = new THREE.ConeGeometry(0.5, 1, 8); g.translate(0, 0.5, 0); break;
    case "sphere": g = new THREE.SphereGeometry(0.5, 12, 8); break;
    case "sphereLo": g = new THREE.IcosahedronGeometry(0.5, 0); break;
    case "sphere1": g = new THREE.IcosahedronGeometry(0.5, 1); break;
    case "dome": g = new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); break;
    case "roof": { // triangular prism: width x (1), height y (1), depth z (1), base at y=0
      var s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 1); s.lineTo(-0.5, 0);
      g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -0.5); break; }
    case "plane": g = new THREE.PlaneGeometry(1, 1); break;
    case "torus": g = new THREE.TorusGeometry(0.5, 0.08, 6, 16); break;
    case "tetra": g = new THREE.TetrahedronGeometry(0.5, 0); break;
    default: throw new Error("prim " + kind);
  }
  GEO_CACHE[kind] = g; return g;
}
var _mat;
// Matrix from position, Euler rotation (y first) and scale.
export function M(x, y, z, rx, ry, rz, sx, sy, sz) {
  var THREE = T(); if (!_mat) _mat = { m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3() };
  _mat.e.set(rx || 0, ry || 0, rz || 0, "YXZ"); _mat.q.setFromEuler(_mat.e); _mat.p.set(x, y, z); _mat.s.set(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz);
  return new THREE.Matrix4().compose(_mat.p, _mat.q, _mat.s);
}
function lin(v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
export function hex(c) { var n = typeof c === "string" ? parseInt(c.replace("#", ""), 16) : c; return [lin(((n >> 16) & 255) / 255), lin(((n >> 8) & 255) / 255), lin((n & 255) / 255)]; }
export { lin };
export function shadeC(c, k) { return [c[0] * k, c[1] * k, c[2] * k, c[3], c[4]]; }
export function mixC(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

// ------------------------------------------------------------------ canvas textures
var TEX = {};
export function canvasTex(key, w, h, draw, repeat) {
  if (TEX[key]) return TEX[key];
  var THREE = T(); var c = document.createElement("canvas"); c.width = w; c.height = h; var ctx = c.getContext("2d"); draw(ctx, w, h);
  var t = new THREE.CanvasTexture(c); t.anisotropy = 4; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
  TEX[key] = t; return t;
}
// The silver tree of Aurelia on a royal-blue field (the banners in the reference art).
export function drawTreeSigil(ctx, cx, cy, s, color) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = "round"; ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.moveTo(0, 46); ctx.lineTo(0, -6); ctx.stroke();
  function branch(x, y, a, len, d) { if (d === 0) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill(); return; } var x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; ctx.lineWidth = d * 0.9 + 0.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); branch(x2, y2, a - 0.42, len * 0.72, d - 1); branch(x2, y2, a + 0.42, len * 0.72, d - 1); }
  branch(0, -4, -Math.PI / 2, 15, 5);
  ctx.lineWidth = 2.2; [[-1, 1], [1, 1]].forEach(function (sd) { for (var k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(0, 40); ctx.quadraticCurveTo(sd[0] * (10 + k * 7), 46, sd[0] * (18 + k * 9), 52 + k * 2); ctx.stroke(); } });
  ctx.restore();
}
export var REALM_BANNER = {
  "Aurelia": ["#1d3360", "#dfe6f0", "tree"], "Stonehold": ["#4a2e1a", "#e0b25a", "anvil"], "Sylvanor": ["#1f4a2a", "#d8e8c0", "leaf"], "Drakmor": ["#5a6878", "#f0f4f8", "rune"],
  "Sunscar": ["#8a3a1a", "#f2cf6a", "sun"], "Velkar": ["#14505a", "#f0e2b0", "anchor"], "Umbral Reach": ["#2a1838", "#b49ad0", "moon"], "The Marches": ["#3a3a32", "#c8c0a0", "tower"]
};
export function drawSigil(ctx, kind, cx, cy, s, color) {
  ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 3 * s / 40;
  if (kind === "tree") drawTreeSigil(ctx, cx, cy - s * 0.5, s / 50, color);
  else if (kind === "anvil") { ctx.fillRect(cx - s * 0.5, cy - s * 0.25, s, s * 0.22); ctx.fillRect(cx - s * 0.2, cy - s * 0.05, s * 0.4, s * 0.35); ctx.fillRect(cx - s * 0.45, cy + s * 0.3, s * 0.9, s * 0.12); }
  else if (kind === "leaf") { ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.6); ctx.quadraticCurveTo(cx + s * 0.5, cy, cx, cy + s * 0.6); ctx.quadraticCurveTo(cx - s * 0.5, cy, cx, cy - s * 0.6); ctx.fill(); }
  else if (kind === "sun") { ctx.beginPath(); ctx.arc(cx, cy, s * 0.25, 0, 7); ctx.fill(); for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * s * 0.32, cy + Math.sin(a) * s * 0.32); ctx.lineTo(cx + Math.cos(a) * s * 0.55, cy + Math.sin(a) * s * 0.55); ctx.stroke(); } }
  else if (kind === "anchor") { ctx.beginPath(); ctx.arc(cx, cy - s * 0.45, s * 0.1, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.35); ctx.lineTo(cx, cy + s * 0.45); ctx.moveTo(cx - s * 0.25, cy - s * 0.15); ctx.lineTo(cx + s * 0.25, cy - s * 0.15); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy + s * 0.15, s * 0.32, 0.2, Math.PI - 0.2); ctx.stroke(); }
  else if (kind === "moon") { ctx.beginPath(); ctx.arc(cx, cy, s * 0.42, 0, 7); ctx.fill(); ctx.globalCompositeOperation = "destination-out"; ctx.beginPath(); ctx.arc(cx + s * 0.18, cy - s * 0.08, s * 0.38, 0, 7); ctx.fill(); }
  else if (kind === "rune") { ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.55); ctx.lineTo(cx, cy + s * 0.55); ctx.moveTo(cx, cy - s * 0.1); ctx.lineTo(cx - s * 0.35, cy - s * 0.45); ctx.moveTo(cx, cy - s * 0.1); ctx.lineTo(cx + s * 0.35, cy - s * 0.45); ctx.stroke(); }
  else { ctx.fillRect(cx - s * 0.2, cy - s * 0.5, s * 0.4, s); ctx.fillRect(cx - s * 0.3, cy - s * 0.55, s * 0.6, s * 0.15); }
  ctx.restore();
}
export function bannerTex(realm) {
  var b = REALM_BANNER[realm] || REALM_BANNER["Aurelia"];
  return canvasTex("banner-" + realm, 128, 256, function (ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, shadeHex(b[0], 0.7)); g.addColorStop(0.5, b[0]); g.addColorStop(1, shadeHex(b[0], 0.7)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = b[1]; ctx.globalAlpha = 0.8; ctx.lineWidth = 3; ctx.strokeRect(8, 8, w - 16, h - 40); ctx.globalAlpha = 1;
    drawSigil(ctx, b[2], w / 2, h * 0.45, 70, b[1]);
    ctx.clearRect(0, h - 28, w, 28); ctx.fillStyle = b[0]; ctx.beginPath(); ctx.moveTo(0, h - 28); ctx.lineTo(w / 2, h); ctx.lineTo(w, h - 28); ctx.fill();
  });
}
export function shadeHex(hx, k) { var n = parseInt(String(hx).replace("#", ""), 16); var c = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; return "rgb(" + Math.round(c[0] * 255 * k) + "," + Math.round(c[1] * 255 * k) + "," + Math.round(c[2] * 255 * k) + ")"; }
// Setts laid in a jittered grid (periodic Worley cells): rounded stone faces in varied greys and browns, packed-earth joints.
// The red channel doubles as the bump map. 512 px per tile, 4 m per tile on streets and plazas.
export function cobbleTex() {
  if (TEX.cobble) return TEX.cobble;
  var THREE = T(), N = 512, G = 16, cs = N / G, seed = 1, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  var px = [], py = [], tone = [];
  for (var j = 0; j < G; j++) for (var i = 0; i < G; i++) { px.push((i + 0.5 + (rnd() - 0.5) * 0.55 + (j % 2) * 0.5) * cs); py.push((j + 0.5 + (rnd() - 0.5) * 0.45) * cs); var w = rnd(); tone.push([0.62 + rnd() * 0.36, w]); }
  var D = new Uint8Array(N * N * 4);
  for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
    var ci = Math.floor(x / cs), cj = Math.floor(y / cs), f1 = 1e9, f2 = 1e9, id = 0;
    for (var dj = -1; dj <= 1; dj++) for (var di = -2; di <= 2; di++) { var ii = ((ci + di) % G + G) % G, jj = ((cj + dj) % G + G) % G, k = jj * G + ii; var ox = px[k] + Math.floor((ci + di) / G) * N, oy = py[k] + Math.floor((cj + dj) / G) * N;
      var dx = x - ox, dy = y - oy; dx -= Math.round(dx / N) * N; dy -= Math.round(dy / N) * N; var d = Math.sqrt(dx * dx + dy * dy); if (d < f1) { f2 = f1; f1 = d; id = k; } else if (d < f2) f2 = d; }
    var edge = (f2 - f1) * 0.5, gr = ((x * 7919 + y * 104729) % 97) / 97;
    var face = Math.min(1, edge / 5); face = face * face * (3 - 2 * face); var dome = 1 - Math.min(1, f1 / (cs * 0.75)) * 0.35;
    var t = tone[id], l = t[0] * dome * (0.92 + gr * 0.12), warm = t[1];
    var r = l * (0.5 + warm * 0.08), g2 = l * (0.48 + warm * 0.03), b = l * (0.45 - warm * 0.04);
    var jr = 0.2 + gr * 0.05, jg = 0.17 + gr * 0.04, jb = 0.13 + gr * 0.03; // earth between the stones
    var o = (y * N + x) * 4; D[o] = (jr + (r - jr) * face) * 255; D[o + 1] = (jg + (g2 - jg) * face) * 255; D[o + 2] = (jb + (b - jb) * face) * 255; D[o + 3] = 255;
  }
  var tx = new THREE.DataTexture(D, N, N, THREE.RGBAFormat); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.magFilter = THREE.LinearFilter; tx.minFilter = THREE.LinearMipmapLinearFilter; tx.generateMipmaps = true; tx.anisotropy = 8;
  if (THREE.sRGBEncoding) tx.encoding = THREE.sRGBEncoding; tx.needsUpdate = true; TEX.cobble = tx; return tx;
}
export function noiseTex() {
  return canvasTex("noise", 256, 256, function (ctx, w, h) {
    var img = ctx.createImageData(w, h); for (var i = 0; i < w * h; i++) { var v = 200 + Math.random() * 55; img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; } ctx.putImageData(img, 0, 0);
  }, true);
}
export function runeCircleTex() {
  return canvasTex("runes", 512, 512, function (ctx, w, h) {
    ctx.fillStyle = "#3b3a3a"; ctx.fillRect(0, 0, w, h);
    for (var i = 0; i < 900; i++) { var l = 50 + Math.random() * 30; ctx.fillStyle = "rgba(" + l + "," + l + "," + (l + 4) + ",0.5)"; ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    ctx.translate(w / 2, h / 2); ctx.strokeStyle = "rgba(170,200,230,0.55)"; ctx.lineWidth = 3;
    [235, 205, 120, 60].forEach(function (r) { ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); });
    ctx.font = "22px serif"; ctx.fillStyle = "rgba(170,200,230,0.6)"; var runes = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";
    for (var i = 0; i < 24; i++) { ctx.save(); ctx.rotate(i / 24 * Math.PI * 2); ctx.fillText(runes[i], -8, -212); ctx.restore(); }
    for (var i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i / 8 * Math.PI * 2); ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(0, -205); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = "rgba(0,0,0,0.25)"; for (var i = 0; i < 12; i++) { ctx.save(); ctx.rotate(i / 12 * Math.PI * 2); ctx.fillRect(-1, -256, 2, 140); ctx.restore(); }
  });
}
export function glowTex() {
  return canvasTex("glow", 64, 64, function (ctx, w, h) { var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,0.6)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); });
}
export function cloudTex() {
  return canvasTex("cloud", 256, 128, function (ctx, w, h) {
    for (var i = 0; i < 40; i++) { var x = 40 + Math.random() * 176, y = 50 + Math.random() * 40, r = 18 + Math.random() * 30; var g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(255,255,255,0.35)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  });
}
export function textSprite(text, opts) {
  var THREE = T(); opts = opts || {}; var fs = opts.size || 30; var c = document.createElement("canvas"); var ctx = c.getContext("2d");
  ctx.font = (opts.bold ? "600 " : "") + fs + "px Cinzel, Georgia, serif"; var w = Math.ceil(ctx.measureText(text).width) + 24; c.width = w; c.height = fs + 18;
  ctx.font = (opts.bold ? "600 " : "") + fs + "px Cinzel, Georgia, serif"; ctx.textBaseline = "middle"; ctx.lineWidth = 5; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.strokeText(text, 12, c.height / 2); ctx.fillStyle = opts.color || "#f2ead8"; ctx.fillText(text, 12, c.height / 2);
  var t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
  var m = new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true, depthTest: opts.depthTest !== false }); var s = new THREE.Sprite(m); var k = (opts.scale || 0.012); s.scale.set(c.width * k, c.height * k, 1); s.renderOrder = 10; return s;
}

// ------------------------------------------------------------------ image-based lighting
// A soft sky/ground environment so metal, cloth and skin are lit from every side.
var _pmrem = null, _envScene = null;
export function makeEnvironment(renderer, top, horizon, ground) {
  var THREE = T(); if (!_pmrem || _pmrem._r !== renderer) { _pmrem = new THREE.PMREMGenerator(renderer); _pmrem._r = renderer; }
  if (!_envScene) {
    _envScene = new THREE.Scene(); var g = new THREE.SphereGeometry(10, 32, 16); var cols = new Float32Array(g.attributes.position.count * 3); g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    _envScene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    var sun = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); sun.position.set(4, 6, 5); sun.name = "sun"; _envScene.add(sun);
  }
  var mesh = _envScene.children[0], pos = mesh.geometry.attributes.position, col = mesh.geometry.attributes.color;
  var t = new THREE.Color(top), h = new THREE.Color(horizon), gr = new THREE.Color(ground), c = new THREE.Color();
  for (var i = 0; i < pos.count; i++) { var y = pos.getY(i) / 10; if (y >= 0) c.copy(h).lerp(t, Math.pow(y, 0.6)); else c.copy(h).lerp(gr, Math.min(1, -y * 3)); col.setXYZ(i, c.r, c.g, c.b); }
  col.needsUpdate = true; _envScene.getObjectByName("sun").material.color.copy(h).multiplyScalar(2.2);
  var rt = _pmrem.fromScene(_envScene, 0.035); return rt;
}
