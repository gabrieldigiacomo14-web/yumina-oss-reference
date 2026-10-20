// @ts-nocheck
// Surface detail for the merged, vertex-colored world geometry. Every texture here is generated at startup from code
// (no image files, nothing to license, nothing added to the JSON) and packed four materials to one RGBA texture,
// one material per channel, so a triplanar lookup costs three texture fetches whatever the material.
//   buildings: R ashlar stone, G lime plaster, B timber, A roof tiles  (class 1..4 from the "mclass" vertex attribute)
//   terrain:   R grass, G earth and pebbles, B rock strata, A sand/snow (weights from vertex color and slope)
// The value in a channel is a height: it darkens crevices (mortar, tile overlaps, grain) and bends the normal through
// screen-space derivatives, so no normal maps are needed and WebGL1 works.
import { T } from "./three";

export var CLS = { none: 0, stone: 1, plaster: 2, wood: 3, roof: 4 };
// "lite" (the Low tier): one texture fetch along the dominant axis and no derivative bump, for phones
var LITE = false;
export function setSurfaceQuality(q) { LITE = q === "lite"; }
var TILE = 512; // pixels per texture tile; buildings: 4 m per tile, terrain: 6 m per tile

function rngOf(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// periodic value noise (period p lattice cells across the tile) and its fractal sum: tiles seamlessly
function lattice(p, seed) { var r = rngOf(seed), a = new Float32Array(p * p); for (var i = 0; i < a.length; i++) a[i] = r(); return a; }
function vnoise(L, p, x, y) { // x, y in [0, 1) tile space
  var fx = x * p, fy = y * p, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
  var x0 = ((ix % p) + p) % p, y0 = ((iy % p) + p) % p, x1 = (x0 + 1) % p, y1 = (y0 + 1) % p;
  var a = L[y0 * p + x0], b = L[y0 * p + x1], c = L[y1 * p + x0], d = L[y1 * p + x1];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}
function Fbm(seed, base, oct) { var Ls = []; for (var o = 0; o < oct; o++) Ls.push(lattice(base << o, seed + o * 101)); return function (x, y) { var s = 0, w = 0.5, n = 0; for (var o = 0; o < oct; o++) { s += vnoise(Ls[o], base << o, x, y) * w; n += w; w *= 0.5; } return s / n; }; }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function smooth(a, b, v) { var t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); }

// courses of blocks: rows of height rh px, blocks of random length; returns per-pixel {id, edge distance}
function courses(N, rh, minL, maxL, seed) {
  var r = rngOf(seed), rows = N / rh, cut = [];
  for (var y = 0; y < rows; y++) { var xs = [], x = Math.floor(r() * maxL); var start = x; while (x < start + N) { xs.push(x); x += Math.floor(minL + r() * (maxL - minL)); } cut.push({ xs: xs.map(function (v) { return v % N; }).sort(function (a, b) { return a - b; }), shade: xs.map(function () { return r(); }) }); }
  return function (px, py) {
    var row = Math.floor(py / rh) % rows, c = cut[row], xs = c.xs, k = xs.length - 1;
    for (var i = 0; i < xs.length; i++) if (xs[i] > px) { k = i - 1; break; }
    var left = k < 0 ? xs[xs.length - 1] - N : xs[k], right = k + 1 < xs.length ? xs[k + 1] : xs[0] + N;
    var ex = Math.min(px - left, right - px), ey = Math.min(py % rh, rh - py % rh);
    return { id: row * 97 + (k < 0 ? xs.length - 1 : k), shade: c.shade[k < 0 ? xs.length - 1 : k], ex: ex, ey: ey, fy: (py % rh) / rh };
  };
}

var _built = {};
function dataTex(key, fill) {
  if (_built[key]) return _built[key];
  var THREE = T(), N = TILE, data = new Uint8Array(N * N * 4); fill(data, N);
  var t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
  _built[key] = t; return t;
}

export function buildingTex() {
  return dataTex("buildings", function (D, N) {
    var grain = Fbm(11, 8, 5), blot = Fbm(23, 4, 4), fine = Fbm(37, 32, 3), wood = Fbm(41, 4, 4);
    var ash = courses(N, 64, 70, 150, 5);      // 0.5 m courses of 0.55-1.2 m blocks
    var tiles = courses(N, 32, 22, 30, 9);     // 0.25 m roof tile courses, 0.17-0.23 m wide tiles
    var plank = courses(N, 40, 300, 512, 13);  // 0.31 m boards
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var u = x / N, v = y / N, i = (y * N + x) * 4, g = grain(u, v), f = fine(u, v);
      // stone: block faces with chipped, slightly domed surfaces and recessed mortar joints
      var s = ash(x, y), e = Math.min(s.ex, s.ey); var face = 0.5 + s.shade * 0.42 + (g - 0.5) * 0.4 + (f - 0.5) * 0.2;
      var stone = e < 2.5 ? 0.1 + f * 0.12 : face * (0.82 + 0.18 * smooth(2.5, 9, e + (g - 0.5) * 6));
      // plaster: soft blotches, fine trowel grain, the odd hairline crack and a patch of exposed stone
      var b = blot(u, v); var pl = 0.74 + (b - 0.5) * 0.6 + (f - 0.5) * 0.16 + (g - 0.5) * 0.12; var crack = Math.abs(grain(u * 2 % 1, v) - 0.5); if (crack < 0.006 && b > 0.62) pl *= 0.55;
      if (b < 0.24) pl = Math.min(pl, stone * 0.92 + 0.05);
      // timber: long grain along u, board seams, knots
      var pk = plank(x, y); var wv = wood(u * 0.5, v * 4); var gr = 0.62 + 0.25 * Math.sin((v * 90 + wv * 18 + pk.shade * 7) * 3.1) * 0.5 + (f - 0.5) * 0.25 + (pk.shade - 0.5) * 0.25;
      var tw = pk.ey < 2 ? 0.12 : pk.ex < 1.5 ? 0.18 : gr;
      // roof tiles: each course overlaps the one below: bright at the upper edge, shadowed lip at the bottom
      var t = tiles(x, y); var lip = smooth(0.0, 0.25, t.fy); var tl = (0.5 + t.shade * 0.3 + (g - 0.5) * 0.25) * (0.35 + 0.65 * lip) * (t.ex < 1.5 ? 0.45 : 1) + (f - 0.5) * 0.1;
      D[i] = clamp01(stone) * 255; D[i + 1] = clamp01(pl) * 255; D[i + 2] = clamp01(tw) * 255; D[i + 3] = clamp01(tl) * 255;
    }
  });
}

export function terrainTex() {
  return dataTex("terrain", function (D, N) {
    var a = Fbm(51, 16, 4), b = Fbm(63, 4, 5), c = Fbm(71, 64, 2), d = Fbm(83, 8, 4), r = rngOf(91);
    var pebble = new Float32Array(N * N); for (var k = 0; k < 900; k++) { var px = r() * N, py = r() * N, rad = 1.5 + r() * 4.5, h = 0.6 + r() * 0.4; for (var yy = -6; yy <= 6; yy++) for (var xx = -6; xx <= 6; xx++) { var q = (xx * xx + yy * yy) / (rad * rad); if (q > 1) continue; var X = (Math.floor(px) + xx + N) % N, Y = (Math.floor(py) + yy + N) % N; pebble[Y * N + X] = Math.max(pebble[Y * N + X], h * Math.sqrt(1 - q)); } }
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var u = x / N, v = y / N, i = (y * N + x) * 4, n1 = a(u, v), n2 = b(u, v), n3 = c(u, v);
      var grass = 0.55 + (n3 - 0.5) * 0.7 + (n1 - 0.5) * 0.35 + (n2 - 0.5) * 0.3;            // blades and clumps
      var earth = Math.max(0.45 + (n1 - 0.5) * 0.4 + (n2 - 0.5) * 0.3, pebble[y * N + x] * 0.9); // soil with pebbles
      var strata = 0.55 + 0.22 * Math.sin((v * 22 + d(u, v) * 5) * 3.14) + (n1 - 0.5) * 0.4 + (n3 - 0.5) * 0.15; // layered rock
      var sand = 0.68 + 0.12 * Math.sin((u * 14 + v * 5 + n2 * 2.5) * 6.28) + (n3 - 0.5) * 0.15;           // wind ripples
      D[i] = clamp01(grass) * 255; D[i + 1] = clamp01(earth) * 255; D[i + 2] = clamp01(strata) * 255; D[i + 3] = clamp01(sand) * 255;
    }
  });
}

// ------------------------------------------------------------------ shader patches
var BUMP = [
  "vec3 tpBump(vec3 nrm, float h, float scale, float fd) {",
  "  vec2 dh = vec2(dFdx(h), dFdy(h)) * scale; vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);",
  "  vec3 r1 = cross(sy, nrm), r2 = cross(nrm, sx); float det = dot(sx, r1) * fd;",
  "  vec3 g = sign(det) * (dh.x * r1 + dh.y * r2); return normalize(abs(det) * nrm - g); }"
].join("\n");
var VS_HEAD = "attribute float mclass;\nvarying vec3 vTpPos; varying vec3 vTpN; varying vec4 vTpMask;\n";
var VS_BODY = [
  "vec4 tpW = vec4(transformed, 1.0); vec3 tpN = objectNormal;",
  "#ifdef USE_INSTANCING", "tpW = instanceMatrix * tpW; tpN = mat3(instanceMatrix) * tpN;", "#endif",
  "tpW = modelMatrix * tpW; vTpPos = tpW.xyz; vTpN = normalize(mat3(modelMatrix) * tpN);"
].join("\n");

// building materials: material class per vertex, roofs laid in horizontal courses whatever their orientation
export function patchBuildings(mat, opts) {
  opts = opts || {}; var tex = buildingTex(), lite = LITE; mat.extensions = mat.extensions || {}; mat.extensions.derivatives = true;
  mat.userData.tpMap = { value: tex };
  mat.onBeforeCompile = function (sh) {
    sh.uniforms.tpMap = mat.userData.tpMap;
    sh.vertexShader = VS_HEAD + sh.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n" + VS_BODY + "\nvTpMask = vec4(equal(vec4(floor(mclass + 0.5)), vec4(1.0, 2.0, 3.0, 4.0)));");
    sh.fragmentShader = "uniform sampler2D tpMap;\nvarying vec3 vTpPos; varying vec3 vTpN; varying vec4 vTpMask;\nfloat tpH = 0.0; float tpOn = 0.0;\n" + sh.fragmentShader
      .replace("#include <normal_pars_fragment>", "#include <normal_pars_fragment>\n" + BUMP)
      .replace("#include <color_fragment>", [
        "#include <color_fragment>",
        "{ vec3 n = normalize(vTpN); vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z);",
        "  vec2 uy = vTpPos.xz; vec2 hn = n.xz / max(length(n.xz), 1e-3);",
        "  uy = mix(uy, vec2(dot(vTpPos.xz, vec2(-hn.y, hn.x)), vTpPos.y), vTpMask.w * step(0.08, length(n.xz)));", // roof courses follow the eaves
        "  float k = 0.25;",
        "#ifdef TP_LITE",
        "  vec2 uv1 = w.y > max(w.x, w.z) ? uy : (w.x > w.z ? vTpPos.zy : vTpPos.xy); vec4 t = texture2D(tpMap, uv1 * k);",
        "#else",
        "  vec4 t = texture2D(tpMap, vTpPos.zy * k) * w.x + texture2D(tpMap, uy * k) * w.y + texture2D(tpMap, vTpPos.xy * k) * w.z;",
        "#endif",
        "  tpOn = dot(vTpMask, vec4(1.0)); tpH = dot(t, vTpMask);",
        "  float macro = texture2D(tpMap, vTpPos.xz * 0.021 + vec2(vTpPos.y * 0.013)).g;",
        "  float lum = mix(1.0, (0.34 + 0.8 * tpH) * (0.78 + 0.4 * macro), tpOn);",
        "#ifdef TP_LITE", "  float soot = 1.0;", "#else",
        "  float soot = mix(1.0, 0.86 + 0.14 * smoothstep(0.25, 0.75, texture2D(tpMap, vec2(vTpPos.x + vTpPos.z, vTpPos.y * 3.0) * 0.07).r), tpOn);", "#endif", // streaks
        "  diffuseColor.rgb *= lum * soot; }"
      ].join("\n"))
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, clamp(1.05 - tpH * 0.35, 0.55, 1.0), tpOn * 0.8);")
      .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n#ifndef TP_LITE\nif (tpOn > 0.5) normal = tpBump(normal, tpH, 0.035 * clamp(1.0 - length(vViewPosition) / 70.0, 0.0, 1.0), faceDirection);\n#endif");
    if (lite) sh.fragmentShader = "#define TP_LITE\n" + sh.fragmentShader;
  };
  mat.customProgramCacheKey = function () { return "tp-buildings" + (lite ? "-lite" : ""); };
  mat.needsUpdate = true; return mat;
}

// terrain: grass where the vertex color is green, rock on steep ground, sand/snow on pale ground, earth elsewhere
export function patchTerrain(mat) {
  var tex = terrainTex(), lite = LITE; mat.extensions = mat.extensions || {}; mat.extensions.derivatives = true; mat.map = null;
  mat.userData.tpMap = { value: tex };
  mat.onBeforeCompile = function (sh) {
    sh.uniforms.tpMap = mat.userData.tpMap;
    sh.vertexShader = VS_HEAD + sh.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n" + VS_BODY + "\nvTpMask = vec4(0.0);");
    sh.fragmentShader = "uniform sampler2D tpMap;\nvarying vec3 vTpPos; varying vec3 vTpN; varying vec4 vTpMask;\nfloat tpH = 0.0;\n" + sh.fragmentShader
      .replace("#include <normal_pars_fragment>", "#include <normal_pars_fragment>\n" + BUMP)
      .replace("#include <color_fragment>", [
        "#include <color_fragment>",
        "{ vec3 n = normalize(vTpN); vec3 c = diffuseColor.rgb; float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));",
        "  float lum = dot(c, vec3(0.3, 0.55, 0.15)); float sat = (mx - mn) / max(mx, 1e-3);",
        "  float rock = smoothstep(0.86, 0.68, n.y);",
        "  float grass = (1.0 - rock) * smoothstep(0.0, 0.05, c.g - max(c.r, c.b) * 0.92);",
        "  float pale = (1.0 - rock) * (1.0 - grass) * smoothstep(0.32, 0.55, lum);",
        "  vec4 wgt = vec4(grass, max(0.0, 1.0 - rock - grass - pale), rock, pale);",
        "  vec2 p = vTpPos.xz / 6.0; vec4 t0 = texture2D(tpMap, p);",
        "#ifdef TP_LITE",
        "  vec4 t = t0;",
        "#else",
        "  vec4 t1 = texture2D(tpMap, p * 0.23 + 0.37);",
        "  vec2 side = (abs(n.x) > abs(n.z) ? vTpPos.zy : vTpPos.xy) / 6.0; vec4 ts = texture2D(tpMap, side);",
        "  vec4 t = mix(t0 * 0.65 + t1 * 0.35, ts, rock * 0.7);",
        "#endif",
        "  tpH = dot(t, wgt);",
        "  float far = clamp(length(vViewPosition) / 160.0, 0.0, 1.0);",
        "#ifdef TP_LITE", "  float var = 1.0;", "#else",
        "  float var = 0.86 + 0.28 * texture2D(tpMap, vTpPos.xz / 97.0).g;", "#endif", // large scale tone variation breaks tiling
        "  diffuseColor.rgb *= mix(0.5 + 0.95 * tpH, 1.0, far * 0.6) * var;",
        "  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.06, 1.0, 0.9), grass * (1.0 - t0.r) * 0.6); }" // sun-bleached tips
      ].join("\n"))
      .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n#ifndef TP_LITE\nnormal = tpBump(normal, tpH, 0.06 * clamp(1.0 - length(vViewPosition) / 50.0, 0.0, 1.0), faceDirection);\n#endif");
    if (lite) sh.fragmentShader = "#define TP_LITE\n" + sh.fragmentShader;
  };
  mat.customProgramCacheKey = function () { return "tp-terrain" + (lite ? "-lite" : ""); };
  mat.needsUpdate = true; return mat;
}
