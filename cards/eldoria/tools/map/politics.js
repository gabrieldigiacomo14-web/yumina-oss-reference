/* pins: [{x, y, k}] where k is a realm key. Returns an owner array. The Marches and the Howling Wastes stay unclaimed. */
export function politics(pins) {
  var B = baseWorld(), cells = B.cells, owner = new Int8Array(cells.length).fill(-1);
  var seeds = [];
  KINGDOMS.forEach(function (K, ki) { seeds.push({ c: nearestCell(cells, toU(K.capital[0], K.capital[1])), k: ki }); });
  CANON_PLACES.forEach(function (pn) { var ki = kingdomIndexByName(pn.realm); if (ki < 0 || pn.kind === "wreck") return; var c = nearestCell(cells, toU(pn.x, pn.y)); if (neutralAt(c.x, c.y)) return; seeds.push({ c: c, k: ki }); });
  (pins || []).forEach(function (pn) { var ki = kingdomIndexByName(pn.k); if (ki < 0 || !isFinite(pn.x) || !isFinite(pn.y)) return; var c = nearestCell(cells, toU(pn.x, pn.y)); if (c.water || neutralAt(c.x, c.y)) return; seeds.push({ c: c, k: ki }); });
  var unclaimed = function (c) { return !!neutralAt(c.x, c.y); };
  var cost = new Float32Array(cells.length).fill(1e18), heap = new MinHeap();
  seeds.forEach(function (sd) { if (sd.c.water) return; cost[sd.c.i] = 0; owner[sd.c.i] = sd.k; heap.push(sd.c.i, 0); });
  while (heap.size) {
    var t = heap.pop(), cur = t.v; if (t.k > cost[cur]) continue;
    cells[cur].n.forEach(function (nb) {
      if (cells[nb].water || unclaimed(cells[nb])) return;
      var tc = BIOMES[cells[nb].biome].travel, riverPen = cells[nb].river && !cells[cur].river ? 2.5 : 1;
      // a realm reaching outside its own character costs more, so borders settle where the land changes
      var zonePen = cells[nb].zone === KINGDOMS[owner[cur]].k ? 1 : 2.2;
      var dx = cells[cur].x - cells[nb].x, dy = cells[cur].y - cells[nb].y, nd = t.k + Math.sqrt(dx * dx + dy * dy) * tc * riverPen * zonePen;
      if (nd < cost[nb]) { cost[nb] = nd; owner[nb] = owner[cur]; heap.push(nb, nd); }
    });
  }
  // isles the flood could not reach go to the nearest realm by distance
  cells.forEach(function (c) { if (c.water || owner[c.i] >= 0 || unclaimed(c)) return; var best = 0, bd = 1e18; KINGDOMS.forEach(function (K, ki) { var d = Math.hypot(c.x - K.at[0], c.y - K.at[1]) / K.r; if (d < bd) { bd = d; best = ki; } }); owner[c.i] = best; });
  return { owner: owner, base: B };
}

/* ---------- queries ---------- */
export function cellAtKm(x, y) { var B = baseWorld(), uv = toU(x, y); return nearestIn(B, Math.max(0, Math.min(UW, uv[0])), Math.max(0, Math.min(UH, uv[1]))); }
export function ownerAtKm(P, x, y) { return P.owner[cellAtKm(x, y).i]; }
export function isLand(x, y) { var c = cellAtKm(x, y); return !c.water; }
export function neutralAtKm(x, y) { return neutralAt(x, y); }
/* a point inside a realm, chosen from a key so it is stable */
export function pointInKingdom(P, kname, realm, key) {
  var B = P.base, ki = kingdomIndexByName(kname), cand = B.cells.filter(function (c) { return !c.water && P.owner[c.i] === ki && c.biome !== BIOME_IDX.peaks; });
  if (!cand.length) cand = B.cells.filter(function (c) { return !c.water && P.owner[c.i] === ki; });
  if (!cand.length) { var K = KINGDOMS[ki < 0 ? 0 : ki]; return { x: K.at[0], y: K.at[1] }; }
  var h = hash32(key), c = cand[h % cand.length], j = ((h >>> 8) % 1000) / 1000 - 0.5, k2 = ((h >>> 18) % 1000) / 1000 - 0.5;
  return { x: c.x + j * GEN.spacingKm * 0.8, y: c.y + k2 * GEN.spacingKm * 0.8 };
}
export function kingdomIndex(k) { return kingdomIndexByName(k); }
