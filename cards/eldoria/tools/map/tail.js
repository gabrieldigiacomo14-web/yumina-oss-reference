/* the Umbral Reach's blight: a dark haze over its land, deepest toward Black Spire */
function umbralHaze(x, y) {
  if (x < 470 || y < -440 || y > 720) return 0;
  var d = Math.hypot((x - 840) / 360, (y - 140) / 430), s = Math.min(1, Math.max(0, 1 - d) * 1.7) + 0.5 * blob(x, y, 720, 450, 90, 90, 1);
  var fx = Math.max(0, Math.min(1, (x - 470) / 130)), fy = Math.max(0, Math.min(1, (720 - y) / 100)) * Math.max(0, Math.min(1, (y + 440) / 100));
  return Math.min(1, s) * fx * fx * (3 - 2 * fx) * fy;
}
/* terrain symbols (mountains, trees, hills, dunes, dead trees) for the cells in view: [{t, x, y, s}] in miles */
export function symbolsInView(P, view) {
  var B = P.base, out = [], halfW = view.w / 2 / view.pxPerKm + 40, halfH = view.h / 2 / view.pxPerKm + 40;
  B.cells.forEach(function (c) {
    if (c.water || Math.abs(c.x - view.cx) > halfW || Math.abs(c.y - view.cy) > halfH) return;
    var id = BIOMES[c.biome].id, t = id === "peaks" ? "mtn" : id === "hills" ? "hill" : id === "forest" || id === "taiga" || id === "ancient" ? "tree" : id === "fen" ? "fen" : id === "desert" ? "dune" : id === "ashwood" ? "dead" : "";
    if (!t) return;
    var R = rng(c.i * 7919 + 13), n = t === "mtn" ? 2 : t === "tree" ? 3 : t === "dune" ? 1 : 2;
    for (var k = 0; k < n; k++) out.push({ t: t, x: c.x + (R() - 0.5) * GEN.spacingKm * 0.8, y: c.y + (R() - 0.5) * GEN.spacingKm * 0.8, s: 0.8 + R() * 0.6, seen: c.seen, big: id === "ancient" });
  });
  return out;
}
