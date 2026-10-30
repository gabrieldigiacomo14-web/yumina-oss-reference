import * as C from './carto.mjs';
import fs from 'fs';
const t0 = Date.now();
const B = C.baseWorld(); const t1 = Date.now();
const P = C.politics([]); const t2 = Date.now();
C.revealAll();
const w = 1100, h = 820, F = C.FRAME, pxPerKm = Math.min(w / (F.X1 - F.X0), h / (F.Y1 - F.Y0));
const view = { cx: (F.X0 + F.X1) / 2, cy: (F.Y0 + F.Y1) / 2, pxPerKm, w, h };
const img = C.renderTerrain(P, view, { realms: true, borders: true, fog: false }); const t3 = Date.now();
fs.writeFileSync('full.raw', Buffer.from(img.buffer || img));
const toPx = (x, y) => [w / 2 + (x - view.cx) * pxPerKm, h / 2 - (y - view.cy) * pxPerKm];
fs.writeFileSync('full.json', JSON.stringify({ w, h, places: C.CANON_PLACES.map(q => ({ n: q.name, k: q.kind, p: toPx(q.x, q.y) })), labels: C.kingdomLabels(P).map(l => ({ n: l.label, p: toPx(l.x, l.y) })), seas: C.SEA_LABELS.map(s => ({ n: s.name, p: toPx(s.x, s.y) })), rivers: C.RIVERS.map(r => r.pts.map(q => toPx(q[0], q[1]))), roads: C.ROADS.map(r => r.pts.map(q => toPx(q[0], q[1]))) }));
console.log('cells', B.cells.length, 'world ms', t1 - t0, 'politics ms', t2 - t1, 'render ms', t3 - t2);
// checks
const names = C.KINGDOMS.map(K => K.k);
let bad = [];
for (const q of C.CANON_PLACES) {
  const c = C.cellAtKm(q.x, q.y), o = P.owner[c.i], own = o < 0 ? 'none' : names[o];
  const want = q.realm === 'Marches' ? 'none' : q.realm;
  const land = !c.water;
  let coast = false; c.n.forEach(nb => { if (B.cells[nb].water) coast = true; });
  const flags = [];
  if (q.kind !== 'wreck' && !land) flags.push('IN SEA');
  if (q.kind === 'wreck' && land) flags.push('wreck on land');
  if (own !== want && !(q.name === 'Last Hope' && own === 'none') && !(q.name === 'Stonefall' && own === 'Stonehold') && q.kind !== 'wreck') flags.push('owner ' + own + ' want ' + want);
  if (q.kind === 'port' && !coast) flags.push('port not coastal');
  if (flags.length) bad.push(q.name + ': ' + flags.join(', '));
}
console.log(bad.length ? 'PROBLEMS:\n ' + bad.join('\n ') : 'all places ok');
// Velkar isles must not be connected by land to the mainland: flood from Port Meridian over land
const start = C.cellAtKm(-80, -480); const seen = new Set([start.i]); const q = [start.i];
while (q.length) { const i = q.pop(); for (const nb of B.cells[i].n) if (!seen.has(nb) && !B.cells[nb].water) { seen.add(nb); q.push(nb); } }
const reach = ['Aurelia City', 'Saffaron / City of Brass', 'Grayhaven North'].map(n => { const p = C.CANON_PLACES.find(x => x.name === n); return n + (seen.has(C.cellAtKm(p.x, p.y).i) ? ' CONNECTED' : ' separate'); });
console.log('from Port Meridian by land:', reach.join(' | '));
const cnt = {}; B.cells.forEach(c => { if (c.water) return; const o = P.owner[c.i]; const k = o < 0 ? 'none' : names[o]; cnt[k] = (cnt[k] || 0) + 1; });
console.log('land cells', JSON.stringify(cnt));
