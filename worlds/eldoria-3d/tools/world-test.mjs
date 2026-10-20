// World-geometry validation that needs no browser: roads, bridges and spawn points of the procedural continent.
//   node tools/world-test.mjs
// worldgen.tsx is pure (functions of coordinates), so this bundles it with esbuild and checks the generated geometry:
// every road is continuous and walkable, every river crossing has a bridge whose ends meet dry ground flush, decks clear the
// water, and the same coordinates give the same geometry on every load.
import fs from "fs"; import os from "os"; import path from "path"; import { fileURLToPath, pathToFileURL } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const esbuild = await import(process.env.ESBUILD || "../../../node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild/lib/main.js");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "eldoria-world-"));
async function load(tag) { const out = path.join(tmp, "wg-" + tag + ".mjs"); await esbuild.build({ entryPoints: [path.join(HERE, "../src/worldgen.tsx")], bundle: true, outfile: out, format: "esm", loader: { ".tsx": "tsx" }, logLevel: "error" }); return import(pathToFileURL(out).href + "?" + tag); }
const W = await load("a"), W2 = await load("b");
let fails = 0, total = 0; const check = (name, ok, detail) => { total++; if (!ok) fails++; console.log((ok ? "  PASS " : "  FAIL ") + name + (detail ? "  [" + detail + "]" : "")); };
const { MILE, ROADS, roadFerries, PLACES, RIVERS, heightAt, riverAt, riverDist, meshHeight, roadBridges, onDeck, deckY, outsideTowns, roadExits, townCut, insidePlace, landSD, BANK_K } = W;

console.log("== bridges");
const bridges = roadBridges();
check("the continent has road bridges", bridges.length >= 8, bridges.length);
const sig = (m) => JSON.stringify(m.roadBridges().map((b) => [b.id, +b.x1.toFixed(3), +b.z1.toFixed(3), +b.x2.toFixed(3), +b.z2.toFixed(3), +b.y1.toFixed(3), +b.y2.toFixed(3), +b.w.toFixed(2)]));
check("two independent loads plan identical bridges (deterministic)", sig(W) === sig(W2));
let badEnd = 0, wetEnd = 0, lowDeck = 0, tooLong = 0, flush = 0; const issues = [];
for (const b of bridges) {
  if (b.sea || b.ferry) { if (b.y1 < 1.19 || b.y2 < 1.19) { wetEnd++; issues.push("sea bridge end near the water " + b.id); } if (Math.abs(b.y1 - meshHeight(b.x1, b.z1)) > 1e-6 && !b.ferry) flush++; continue; }
  [[b.x1, b.z1, b.y1], [b.x2, b.z2, b.y2]].forEach(([x, z, y]) => { if (riverDist(x, z) < BANK_K - 1e-6) { badEnd++; issues.push("end in channel " + b.id); } { const rv = riverAt(x / MILE, -z / MILE); if (rv && !rv.river.dry && y < rv.level + 0.3) { wetEnd++; issues.push("end below water " + b.id); } } if (Math.abs(y - meshHeight(x, z)) > 1e-6) flush++; });
  for (let t = 0; t <= 1; t += 0.02) { const x = b.x1 + (b.x2 - b.x1) * t, z = b.z1 + (b.z2 - b.z1) * t; const rv = riverAt(x / MILE, -z / MILE); if (rv && !rv.river.dry && rv.d < rv.w * 1.1 && deckY(b, t) < rv.level + 0.6) { lowDeck++; issues.push("deck under water " + b.id); break; } }
  if (b.len > 220) { tooLong++; issues.push("overlong " + b.id + " " + b.len.toFixed(0)); }
}
check("every bridge end is on dry ground outside the river's bank", badEnd === 0, issues.slice(0, 3).join("; "));
check("every bridge end stands above the water", wetEnd === 0);
check("every deck clears the water along its whole length", lowDeck === 0);
check("deck ends sit exactly on the terrain surface (flush with the road)", flush === 0, flush);
check("no bridge is absurdly long (roads no longer run inside river channels)", tooLong === 0, issues.filter((s) => /overlong/.test(s)).join("; "));

const ferries = roadFerries(); check("long sea gaps on roads are explicit ferry crossings with a jetty on each shore", ferries.every((f) => bridges.filter((b) => b.ferry && b.id.startsWith("f" + f.road + ".")).length >= 2), ferries.map((f) => f.id + ":" + f.len.toFixed(0) + "m").join(" "));
const inFerry = (ri, sArc) => ferries.some((f) => f.road === ri && sArc > f.sa + 0.5 && sArc < f.sb - 0.5);
console.log("== roads");
// walkable height of the ground at a point: terrain mesh, or a bridge deck standing on it
const near = bridges.map((b) => ({ b, x0: Math.min(b.x1, b.x2) - b.w, x1: Math.max(b.x1, b.x2) + b.w, z0: Math.min(b.z1, b.z2) - b.w, z1: Math.max(b.z1, b.z2) + b.w }));
function walk(x, z, ref) { let h = meshHeight(x, z); for (const n of near) { if (x < n.x0 || x > n.x1 || z < n.z0 || z > n.z1) continue; const od = onDeck(n.b, x, z, 0.25); if (od) { const y = deckY(n.b, od.t); if (y > h && (ref === undefined || ref > y - 1.2)) h = y; } } return h; }
let steps = 0, deep = 0, steep = 0, worst = 0, worstWhere = "", sea = 0;
const stepIssues = [];
for (const [ri, rd] of ROADS.entries()) {
  const pts = rd.pts.map((p) => [p[0] * MILE, -p[1] * MILE]); let prev = null, arc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const L = Math.hypot(bx - ax, bz - az); const n = Math.ceil(L); const arc0 = arc; arc += L;
    outsideTowns(ax, az, bx, bz).forEach(([t0, t1]) => { let first = true; for (let k = 0; k <= n; k++) { const t = k / n; if (t < t0 || t > t1) continue; const x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (inFerry(ri, arc0 + L * t)) { prev = null; first = true; continue; } const y = walk(x, z, prev ? prev.y : undefined); steps++; if (y < -1.3) { deep++; if (stepIssues.length < 6) stepIssues.push("deep water r" + ri + " " + rd.kind); }
        if (prev && !first) { const slope = Math.abs(y - prev.y) / Math.max(0.05, Math.hypot(x - prev.x, z - prev.z)); if (slope > worst) { worst = slope; worstWhere = "road " + ri + " " + rd.kind + " @" + (x / MILE).toFixed(1) + "," + (-z / MILE).toFixed(1); } if (slope > 1.9) { steep++; if (stepIssues.length < 12) stepIssues.push("steep r" + ri + " " + rd.kind + " @" + (x / MILE).toFixed(2) + "," + (-z / MILE).toFixed(2) + " " + prev.y.toFixed(1) + "->" + y.toFixed(1)); } } prev = { x, z, y }; first = false; } prev = null; });
  }
}
check("roads are continuous and walkable (no step steeper than the player can climb: 1.9)", steep === 0, "steep " + steep + " of " + steps + ", worst " + worst.toFixed(2) + " " + worstWhere + "; " + stepIssues.join(" | "));
check("roads never run through deep water", deep === 0, deep + " samples; " + stepIssues.join("; "));

console.log("== settlements");
let noExit = 0, gateOff = 0;
for (const p of PLACES) { if (townCut(p) <= 0) continue; const ex = roadExits(p); const cx = p.x * MILE, cz = -p.y * MILE; ex.forEach((e) => { if (Math.abs(Math.hypot(e.x - cx, e.z - cz) - townCut(p)) > 0.01) gateOff++; }); }
check("every road leaves a settlement exactly at its edge circle (roads and streets meet)", gateOff === 0, gateOff);
// the street from each gate to the plaza must be walkable too (ground steeper than the player can climb breaks the town in two)
{ let st = 0, sb = 0, worstS = 0, where = ""; for (const p of PLACES) { if (townCut(p) <= 0 || p.kind === "landmark" || W.isSmallPlace(p)) continue; const cx = p.x * MILE, cz = -p.y * MILE;
    for (const e of roadExits(p)) { let prev = null; const L = Math.hypot(e.x - cx, e.z - cz); for (let k = 0; k <= L; k++) { const x = cx + (e.x - cx) * k / L, z = cz + (e.z - cz) * k / L; if (riverDist(x, z) < BANK_K) { prev = null; continue; } const y = meshHeight(x, z); st++; if (prev != null) { const sl = Math.abs(y - prev); if (sl > worstS) { worstS = sl; where = p.id; } if (sl > 1.9) { sb++; (globalThis.__sl = globalThis.__sl || {})[p.id] = (globalThis.__sl[p.id] || 0) + 1; } } prev = y; } } }
  check("every street from a gate to its plaza is walkable (" + st + " samples)", sb === 0, sb + " too steep; worst " + worstS.toFixed(2) + " in " + where + " " + JSON.stringify(globalThis.__sl || {})); }
let wet = 0, drowned = []; for (const p of PLACES) { const y = meshHeight(p.x * MILE, -p.y * MILE); if (p.kind !== "landmark" && y < 0.4 && landSD(p.x, p.y) > 0) { wet++; drowned.push(p.id); } }
check("every settlement centre is on dry land", wet === 0, drowned.join(","));
function spawnOK(x, z) { const y = meshHeight(x, z); if (y < 0.3) return false; const rv = riverAt(x / MILE, -z / MILE); if (rv && !rv.river.dry && rv.d * MILE < rv.w * MILE * 1.1) return false; return true; }
let badSpawn = []; for (const p of PLACES) { if (p.kind === "landmark" && landSD(p.x, p.y) < 0) continue; const x = p.x * MILE, z = -p.y * MILE; if (!spawnOK(x, z) && !/Pier|port|dock/i.test(p.name) && !(RIVERS.some(() => insidePlace(p.x, p.y)))) badSpawn.push(p.id); }
check("place centres are valid spawn positions", badSpawn.length === 0, badSpawn.join(","));

fs.rmSync(tmp, { recursive: true, force: true });
console.log("\n" + (total - fails) + "/" + total + " world checks passed"); process.exit(fails ? 1 : 0);
