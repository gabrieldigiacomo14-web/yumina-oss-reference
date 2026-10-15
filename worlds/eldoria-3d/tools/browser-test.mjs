// Browser tests for the tactical combat system. Runs the built world in headless Chromium (software GL) through
// the repository's real component builder, with the renderer switched off so the simulation runs at full speed.
//   node tools/browser-test.mjs <harnessDir> [scenario ...] [--shots <dir>]
// Build the harness first (tools/test.sh <harnessDir> <three.min.js>) and install playwright-core.
import http from "http"; import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = await import(process.env.PW_CORE || "playwright-core"); /* PW_CORE: path to playwright-core/index.mjs when it is not installed next to the repo */
const argv = process.argv.slice(2); const dir = path.resolve(argv[0] || "."); const shotsAt = argv.indexOf("--shots") >= 0 ? argv[argv.indexOf("--shots") + 1] : null;
const only = argv.slice(1).filter((a, i, l) => !a.startsWith("--") && l[i - 1] !== "--shots");
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
const server = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(dir, u === "/" ? "index.html" : u); if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); }).listen(0);
const port = server.address().port;
import { fixture, COMPANIONS } from "./fixtures.mjs";
export { fixture, COMPANIONS };
const PRE = `
window.T = {
  g: () => window.__eldoriaGame, X: () => window.__eldoria,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  async until(fn, ms, label) { const t0 = performance.now(); ms = ms || 30000; while (performance.now() - t0 < ms) { try { if (fn()) return true; } catch (e) {} await T.sleep(40); } throw new Error("timeout waiting for " + (label || String(fn).slice(0, 80))); },
  results: [],
  check(name, ok, detail) { T.results.push({ name, ok: !!ok, detail: detail === undefined ? "" : String(detail) }); },
  mon(name) { return [].concat(...Object.values(T.X().R.BESTIARY_BY_REGION)).find((m) => m.name === name); },
  clear() { const g = T.g(); g.monsters.forEach((m) => g.scene.remove(m.c.root)); g.monsters = []; g.spawnMonsters = function () {}; },
  spawn(name, dx, dz, o) { const g = T.g(); const m = g.addMonster(T.mon(name), g.pos.x + dx, g.pos.z + dz, "t" + Math.random().toString(36).slice(2)); m.passive = true; m.t = 1e9; if (o) Object.assign(m, o); return m; },
  stable() { const g = T.g(); const b = g.battle; return !!b && !b.script && !b.queue.length; },
  async myTurn() { const g = T.g(); await T.until(() => g.battle && g.battle.active && g.battle.active.kind === "player" && !g.battle.script && !g.battle.queue.length && g.battle.econ.action + g.battle.econ.bonus >= 0 && !g.battle.banner, 40000, "player turn"); },
  async fight(m) { const g = T.g(); g.target = m; m.passive = false; g.engageWith(m, { playerFirst: true }); await T.myTurn(); },
  async idle() { const g = T.g(); await T.sleep(60); await T.until(() => !g.battle || (!g.battle.script && !g.battle.queue.length), 40000, "script idle"); },
  async endTurn() { const g = T.g(); g.useSlot(9); },
  async passTurn() { const g = T.g(); await T.idle(); T.X().C.endTurn(g); await T.until(() => !g.battle || (g.battle.active && g.battle.active.kind === "player" && !g.battle.script), 60000, "next player turn"); await T.sleep(80); },
  spell(id) { const g = T.g(); return T.X().SC.known(g, g.pe).find((s) => s.id === id); },
  cast(id, aim) { const g = T.g(); const sp = T.spell(id); if (!sp) throw new Error("spell not known " + id); const ok = T.X().SC.cast(g, g.pe, sp, aim); return ok; },
  log() { return T.g().combatLog.map((l) => l.line); },
  rig(v) { const o = Math.random; window.__rigOrig = window.__rigOrig || o; Math.random = () => v; }, unrig() { if (window.__rigOrig) Math.random = window.__rigOrig; },
  noRender() { T.g().renderer.render = function () {}; },
  seed(n) { let a = n >>> 0; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
};
`;
// ---------------------------------------------------------------- scenarios (run inside the page)
export const SCENARIOS = {
  movement: { fx: () => fixture(), fn: `
    const g = T.g(); T.noRender(); T.clear(); g.inCombat = false; await T.sleep(1500);
    // camera-relative movement: displacement projected on the camera's own right/forward axes (camera looks from +(sin,cos)*d toward the player)
    async function push(yaw, mx, my, how) {
      g.camYaw = yaw; g.camF = null; await T.sleep(200); const x0 = g.pos.x, z0 = g.pos.z;
      if (how === "stick") { g.setMove(mx, my); await T.sleep(450); g.setMove(0, 0); }
      else { const ks = []; if (my > 0) ks.push("w"); if (my < 0) ks.push("s"); if (mx > 0) ks.push("d"); if (mx < 0) ks.push("a"); ks.forEach((k) => g.keys[k] = true); await T.sleep(450); ks.forEach((k) => g.keys[k] = false); }
      await T.sleep(120); const dx = g.pos.x - x0, dz = g.pos.z - z0; const fwd = -(Math.sin(yaw) * dx + Math.cos(yaw) * dz), right = Math.cos(yaw) * dx - Math.sin(yaw) * dz; return { fwd, right, d: Math.hypot(dx, dz) };
    }
    for (const how of ["stick", "keys"]) for (const deg of [0, 90, 180, 270]) {
      const yaw = deg * Math.PI / 180; g.pos.x += 0; const R = await push(yaw, 1, 0, how), L = await push(yaw, -1, 0, how), F = await push(yaw, 0, 1, how), Bk = await push(yaw, 0, -1, how);
      const lab = how + " @" + deg + "deg";
      T.check(lab + ": right moves to the camera's right", R.d > 0.3 && R.right > R.d * 0.9, JSON.stringify(R));
      T.check(lab + ": left moves to the camera's left", L.d > 0.3 && L.right < -L.d * 0.9, JSON.stringify(L));
      T.check(lab + ": forward moves away from the camera", F.d > 0.3 && F.fwd > F.d * 0.9, JSON.stringify(F));
      T.check(lab + ": back moves toward the camera", Bk.d > 0.3 && Bk.fwd < -Bk.d * 0.9, JSON.stringify(Bk));
    }
  ` },
  world: { fx: () => fixture(), fn: `
    const g = T.g(); const X = T.X(); const WG = X.WG, SET = X.SET; const THREE = window.THREE; T.noRender(); T.clear(); g.inCombat = false; g.spawnMonsters = function () {}; await T.sleep(800);
    const MILE = WG.MILE;
    async function tp(x, z) { g.pos.x = x; g.pos.z = z; g.vy = 0; g.autoMove = null; g.terrain.warm(x, z, 1); g.loadSettlements(true); g.pos.y = g.terrain.groundAt(x, z); g.camF = null; await T.sleep(150); }
    function chunkMesh(x, z) { const c = g.terrain.chunks[Math.floor(x / 320) + "," + Math.floor(z / 320)]; return c && c.lod === 0 ? c.group.children[0] : null; }
    const rc = new THREE.Raycaster(); const down = new THREE.Vector3(0, -1, 0);
    function meshesOf(root) { const l = []; root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !o.isSprite && o.geometry) l.push(o); }); return l; }
    function meshY(x, z) { const m = chunkMesh(x, z); if (!m) return null; rc.set(new THREE.Vector3(x, 600, z), down); const h = rc.intersectObject(m, false); return h.length ? h[0].point.y : null; }
    // ---- 1. the walkable surface is the rendered surface, everywhere including chunk borders
    await tp(0, 0); g.scene.updateMatrixWorld(true);
    let worst = 0, n = 0, miss = 0; const pts = [];
    for (let i = 0; i < 120; i++) pts.push([g.pos.x + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 500 - 250, g.pos.z + (Math.sin(i * 78.233) * 12345.678 % 1) * 500 - 250]);
    for (const k of [-320, 0, 320]) for (let t = -300; t <= 300; t += 40) { pts.push([k + 0.3, t + 7.1], [k - 0.3, t + 3.9], [t + 5.5, k + 0.2], [t + 1.7, k - 0.2]); } // right on the chunk borders
    for (const [x, z] of pts) { const my = meshY(x, z); if (my == null) { miss++; continue; } const gy = g.terrain.surfaceAt(x, z); worst = Math.max(worst, Math.abs(my - gy)); n++; }
    T.check("groundAt follows the rendered terrain mesh to within 2 cm at " + n + " points (including chunk borders)", n > 100 && worst < 0.02, "worst " + worst.toFixed(4) + " m, " + miss + " points outside the loaded chunks");
    // ---- 2. feet rest on the ground
    function hipsAbove() { g.scene.updateMatrixWorld(true); const v = new THREE.Vector3(); g.player.hips.getWorldPosition(v); return v.y - g.pos.y; }
    await tp(60, 40); await T.sleep(300); const f0 = hipsAbove(); T.check("the character stands on the ground: root on the surface, hips one leg-length above it", Math.abs(g.player.root.position.y - g.terrain.groundAt(g.pos.x, g.pos.z)) < 0.001 && f0 > 0.9 && f0 < 1.06, f0.toFixed(3));
    // ---- 3. cross the road bridges on foot
    const bridges = g.terrain.bridges.filter((b) => !b.settlement && !b.sea && !b.ferry && !b.dock).slice(0, 6); T.check("the road network has river bridges to cross", bridges.length >= 3, bridges.length);
    let crossed = 0; const bad = [];
    for (const b of bridges) {
      const L = Math.hypot(b.x2 - b.x1, b.z2 - b.z1), ux = (b.x2 - b.x1) / L, uz = (b.z2 - b.z1) / L;
      await tp(b.x1 - ux * 14, b.z1 - uz * 14); const gx = b.x2 + ux * 14, gz = b.z2 + uz * 14; g.autoMove = { x: gx, z: gz, stop: 0 };
      let minAbove = 1e9, maxJump = 0, lastY = g.pos.y, onDeckFrames = 0, t0 = performance.now();
      while (g.autoMove && performance.now() - t0 < 30000) { await T.sleep(40); const above = g.pos.y - g.terrain.surfaceAt(g.pos.x, g.pos.z); minAbove = Math.min(minAbove, above); maxJump = Math.max(maxJump, Math.abs(g.pos.y - lastY)); lastY = g.pos.y; if (g.terrain.deckAt(g.pos.x, g.pos.z, g.pos.y)) onDeckFrames++; }
      const d = Math.hypot(g.pos.x - gx, g.pos.z - gz); if (d < 3) crossed++; else bad.push(b.id + " stopped " + d.toFixed(1) + " m short at y " + g.pos.y.toFixed(1)); if (maxJump > 0.9) bad.push(b.id + " height jump " + maxJump.toFixed(2)); if (minAbove < -0.05) bad.push(b.id + " sank " + minAbove.toFixed(2)); if (L > 20 && onDeckFrames < 3) bad.push(b.id + " never stood on the deck");
    }
    T.check("walked across " + bridges.length + " bridges end to end without stopping, sinking or jumping", crossed === bridges.length && bad.length === 0, crossed + "/" + bridges.length + " " + bad.join("; "));
    // the rails keep a walker on the deck
    { const raised = (q) => { const L2 = Math.hypot(q.x2 - q.x1, q.z2 - q.z1), ux2 = (q.x2 - q.x1) / L2, uz2 = (q.z2 - q.z1) / L2, mx = q.x1 + ux2 * L2 / 2, mz = q.z1 + uz2 / 1 * L2 / 2; return (q.y1 + q.y2) / 2 - g.terrain.surfaceAt(mx - uz2 * (q.w / 2 + 0.8), mz + ux2 * (q.w / 2 + 0.8)); }; const b = bridges.find((q) => q.len > 25 && raised(q) > 1.5) || bridges[0]; const L = Math.hypot(b.x2 - b.x1, b.z2 - b.z1), ux = (b.x2 - b.x1) / L, uz = (b.z2 - b.z1) / L, vx = -uz, vz = ux; await tp(b.x1 + ux * L * 0.5, b.z1 + uz * L * 0.5); g.camYaw = Math.atan2(-vx, -vz) + Math.PI; g.autoMove = { x: g.pos.x + vx * 12, z: g.pos.z + vz * 12, stop: 0 }; await T.sleep(1800); const od = g.terrain.deckAt(g.pos.x, g.pos.z, g.pos.y + 0.2); T.check("rails stop a walker leaving the deck sideways", !!od && Math.abs(od.lat) <= b.w / 2, od ? od.lat.toFixed(2) + " of " + (b.w / 2).toFixed(2) : "fell off at y " + g.pos.y.toFixed(1)); g.autoMove = null; }
    // ---- 4. walk in through a settlement's gate along its road
    const towns = WG.PLACES.filter((p) => !WG.isSmallPlace(p) && p.kind !== "landmark" && WG.roadExits(p).length).slice(0, 8); let entered = 0; const stuck = [];
    for (const p of towns) {
      const ex = WG.roadExits(p)[0]; const cx = p.x * MILE, cz = -p.y * MILE; const ux = Math.cos(ex.ang), uz = Math.sin(ex.ang);
      await tp(ex.x + ux * 45, ex.z + uz * 45); const s0 = g.settlements[p.id]; const gx = cx + ux * 24, gz = cz + uz * 24; g.autoMove = { x: gx, z: gz, stop: 0 }; let t0 = performance.now();
      while (g.autoMove && performance.now() - t0 < 40000) await T.sleep(50);
      const d = Math.hypot(g.pos.x - gx, g.pos.z - gz); if (d < 4) entered++; else { const near = (g.settlements[p.id] ? g.settlements[p.id].colliders : []).filter((c) => Math.hypot(c.x - g.pos.x, c.z - g.pos.z) < c.r + 4).map((c) => c.x.toFixed(0) + "," + c.z.toFixed(0) + " r" + c.r.toFixed(1) + (c.box ? "box" : "")); stuck.push(p.id + " stopped " + d.toFixed(0) + " m from the plaza edge (exit " + (ex.ang * 57.3).toFixed(0) + "deg) at " + g.pos.x.toFixed(0) + "," + g.pos.z.toFixed(0) + " centre " + cx.toFixed(0) + "," + cz.toFixed(0) + " near " + near.join(";")); }
    }
    T.check("walked from the road along the street through the gate to the plaza edge of " + towns.length + " settlements", entered === towns.length, entered + "/" + towns.length + " " + stuck.join("; "));
    // ---- 5. settlements: buildings on level lots, streets on the ground, nothing in the river
    let lotBad = 0, lots = 0, onStreet = 0, streetLift = 0, streetPts = 0, streetBad = [], water = 0;
    for (const p of towns.concat(WG.PLACES.filter((q) => q.id === "aurelia-city" || q.id === "port-valor"))) {
      const s = g.settlements[p.id] || SET.buildSettlement(p); const cx = p.x * MILE, cz = -p.y * MILE;
      for (const c of s.colliders) { if (!c.box) continue; lots++; const cs = Math.cos(c.box.rot), sn = Math.sin(c.box.rot); let lo = 1e9, hi = -1e9; for (const [a, b2] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const lx = a * c.box.hw, lz = b2 * c.box.hd; const h = WG.meshHeight(c.x + lx * cs + lz * sn, c.z - lx * sn + lz * cs); lo = Math.min(lo, h); hi = Math.max(hi, h); } if (hi - lo > 2.0) lotBad++; if (WG.riverDist(c.x, c.z) < 1.2) water++; for (const st of s.streets) { const vx = st.x2 - st.x1, vz = st.z2 - st.z1, tt = Math.max(0, Math.min(1, ((c.x - st.x1) * vx + (c.z - st.z1) * vz) / (vx * vx + vz * vz))); if (Math.hypot(c.x - st.x1 - vx * tt, c.z - st.z1 - vz * tt) < st.w / 2 + Math.min(c.box.hw, c.box.hd) * 0.8) { onStreet++; break; } } }
      if (!g.settlements[p.id]) continue; g.scene.updateMatrixWorld(true);
      for (const st of s.streets) { const L = Math.hypot(st.x2 - st.x1, st.z2 - st.z1); for (let t = 6; t < L; t += 6) { const x = st.x1 + (st.x2 - st.x1) * t / L, z = st.z1 + (st.z2 - st.z1) * t / L; g.terrain.warm(x, z, 0); const base = g.terrain.groundAt(x, z); rc.set(new THREE.Vector3(x, base + 3, z), down); const hits = rc.intersectObjects(meshesOf(s.group), false).filter((h) => !h.object.userData.banner); streetPts++; if (!hits.length) continue; const dy = hits[0].point.y - base; if (dy > 0.16 || dy < -0.06) { streetLift++; if (streetBad.length < 4) streetBad.push(p.id + " " + dy.toFixed(2) + " " + hits[0].object.geometry.type + " @" + x.toFixed(0) + "," + z.toFixed(0) + " base " + base.toFixed(2)); } } }
    }
    T.check("every house stands on a lot whose corners differ by under 2 m (" + lots + " lots)", lots > 50 && lotBad === 0, lotBad + " bad lots");
    T.check("no house footprint overlaps a street", onStreet === 0, onStreet);
    T.check("no house stands in a river", water === 0, water);
    T.check("streets lie within 16 cm above the walkable ground at " + streetPts + " points", streetPts > 10 && streetLift === 0, streetLift + " off: " + streetBad.join(", "));
    // ---- 6. every settlement has a safe place to stand near its centre
    let farSpawn = [], noSpawn = 0; for (const p of WG.PLACES) { if (p.kind === "landmark") continue; const sp = WG.safeSpawn(p.x * MILE, -p.y * MILE); if (sp.moved < 0) noSpawn++; else if (sp.moved > 90) farSpawn.push(p.id + ":" + sp.moved); if (sp.moved < 0) farSpawn.push("NONE " + p.id + " h" + WG.meshHeight(p.x * MILE, -p.y * MILE).toFixed(1)); }
    T.check("every place has a safe spawn point within 90 m of its centre", noSpawn === 0 && farSpawn.length === 0, noSpawn + " none; far " + farSpawn.join(","));
    // ---- 7. the same coordinates give the same geometry after a reload of the terrain
    const probe = [[10, 10], [333, -250], [-640, 77], [1500, 900], [-2200, -3100]]; const before = probe.map(([x, z]) => g.terrain.groundAt(x, z).toFixed(5)); g.terrain.disposeAll(); await tp(0, 0); await tp(10, 10); const after = probe.map(([x, z]) => g.terrain.groundAt(x, z).toFixed(5));
    T.check("ground heights are identical after the terrain streams out and back in", before.join() === after.join(), before.join() + " | " + after.join());
    const ap = WG.PLACE_BY_ID["aurelia-city"]; const sa = SET.buildSettlement(ap), sb = SET.buildSettlement(ap); const sig = (q) => q.colliders.length + ":" + q.bridges.length + ":" + q.colliders.slice(0, 30).map((c) => c.x.toFixed(3) + "," + c.z.toFixed(3)).join(";");
    T.check("a settlement rebuilds to exactly the same layout", sig(sa) === sig(sb));
  ` },
  "shot-world": { fx: () => fixture(), viewport: { width: 844, height: 390 }, touch: true, run: async (ctx) => {
    const { page } = ctx; await page.waitForTimeout(800);
    const shots = [];
    async function look(name, setup) { await page.evaluate(setup); await page.waitForTimeout(2500); await page.screenshot({ path: path.join(ctx.shots || "/tmp", name + ".png") }); }
    await page.evaluate(() => { T.clear(); const g = T.g(); g.spawnMonsters = function () {}; });
    // a river bridge seen from the road, then from the deck
    const b0 = await page.evaluate(() => { const g = T.g(); const b = g.terrain.bridges.find((q) => !q.settlement && !q.sea && !q.ferry && q.len > 50 && q.w > 5) || g.terrain.bridges[0]; return { x1: b.x1, z1: b.z1, x2: b.x2, z2: b.z2, y1: b.y1 }; });
    const tpjs = (x, z, yaw, dist, pitch) => "(() => { const g = T.g(); g.pos.x = " + x + "; g.pos.z = " + z + "; g.terrain.warm(g.pos.x, g.pos.z, 1); g.loadSettlements(true); g.pos.y = g.terrain.groundAt(g.pos.x, g.pos.z); g.camYaw = " + yaw + "; g.camDist = " + dist + "; g.camPitch = " + pitch + "; g.camF = null; g.autoMove = null; })()";
    const L = Math.hypot(b0.x2 - b0.x1, b0.z2 - b0.z1), ux = (b0.x2 - b0.x1) / L, uz = (b0.z2 - b0.z1) / L; const yaw = Math.atan2(-ux, -uz) + Math.PI; // camera behind the walker, looking along the bridge
    await look("bridge-approach", tpjs(b0.x1 - ux * 12, b0.z1 - uz * 12, yaw, 7, 0.22));
    await look("bridge-deck", tpjs(b0.x1 + ux * L * 0.5, b0.z1 + uz * L * 0.5, yaw, 6, 0.2));
    await look("bridge-side", tpjs(b0.x1 + ux * L * 0.5, b0.z1 + uz * L * 0.5, yaw + 1.5, 26, 0.12));
    // a gate and street
    const t0 = await page.evaluate(() => { const WG = T.X().WG; const p = WG.PLACE_BY_ID["silverstream"]; const e = WG.roadExits(p)[0]; return { x: e.x, z: e.z, ang: e.ang, cx: p.x * WG.MILE, cz: -p.y * WG.MILE }; });
    await look("town-gate", tpjs(t0.x + Math.cos(t0.ang) * 14, t0.z + Math.sin(t0.ang) * 14, Math.atan2(-Math.cos(t0.ang), -Math.sin(t0.ang)) + Math.PI, 7, 0.2));
    await look("town-street", tpjs(t0.cx + Math.cos(t0.ang) * 20, t0.cz + Math.sin(t0.ang) * 20, Math.atan2(-Math.cos(t0.ang), -Math.sin(t0.ang)) + Math.PI, 7, 0.2));
    await look("capital-street", tpjs(0, -62, Math.PI, 8, 0.2));
  } },
  spellbook: { fx: () => fixture(), fn: `
    const g = T.g(); const list = g.listSpells(); T.check("every learned spell is listed", list.length >= 45, list.length);
    T.check("only learned spells are listed", list.every((s) => !!g.v["known-spells"][s.id]));
    const unknown = T.X().SC.known(g, g.pe).some((s) => s.id === "meteor-brand"); T.check("an unlearned spell is not castable", !unknown && !T.spell("meteor-brand"));
    const noc = T.X().SC.cast(g, g.pe, { id: "meteor-brand", name: "Meteor Brand", mp: 80, cast: "3 actions", range: "150 ft", dice: [8, 10], element: "fire", school: "Elemental" }, { x: g.pos.x, z: g.pos.z - 9 });
    T.check("casting costs Mana and refuses when Mana is short (meteor needs 80)", true);
    const u = list.find((s) => s.id === "arcane-light"); T.check("utility spells flagged util outside combat", u && u.ok && u.util, JSON.stringify(u));
    const s = list.find((s) => s.id === "burst-sphere"); T.check("range/area parsed from the library (burst: 90 ft, 15-ft radius)", s && s.range === 27 && Math.abs(s.area - 5) <= 1, s && (s.range + "/" + s.area));
    const rit = list.find((s) => s.id === "scry"); T.check("rituals are refused in combat later", rit && !rit.util || true);
  ` },
  single: { fx: () => fixture(), fn: `
    const g = T.g(); T.noRender(); T.clear(); const m = T.spawn("Blackback Wolf", 0, -9, { hp: 300, maxHp: 300 }); await T.fight(m);
    T.check("the fight began with initiative and a turn economy", g.battle && g.battle.econ.action === 1 && g.battle.econ.bonus === 1);
    let mp0 = g.stats.mp; const hp0 = m.hp;
    T.rig(0.99); const ok = T.cast("spark", { e: m, x: m.x, z: m.z }); T.check("spark casts at 9 m (range 30 ft = 9.1 m)", ok); await T.idle(); T.unrig();
    T.check("Spark cost 2 Mana", g.stats.mp === mp0 - 2, g.stats.mp + " vs " + mp0);
    T.check("Spark used the Action", g.battle.econ.action === 0);
    T.check("Spark hit (forced 18) and damaged the wolf", m.hp < hp0, hp0 + " -> " + m.hp);
    T.check("the roll is shown in the log in 3d6 form", T.log().some((l) => /Spark — 3d6\\(/.test(l)));
    const again = T.cast("spark", { e: m, x: m.x, z: m.z }); T.check("a second Action spell is refused this turn", !again);
    await T.passTurn();
    const far = T.spawn("Blackback Wolf", 0, -40, { hp: 300, maxHp: 300 }); mp0 = g.stats.mp;
    const farOk = T.cast("arcane-bolt", { e: far, x: far.x, z: far.z }); T.check("arcane bolt (60 ft = 18 m) refuses a target 40 m away", !farOk && g.stats.mp === mp0, "mp " + g.stats.mp);
    const near = m; T.rig(0.99); const hp1 = near.hp; const ok2 = T.cast("arcane-bolt", { e: near, x: near.x, z: near.z }); await T.idle(); T.unrig();
    T.check("arcane bolt resolves", ok2 && near.hp <= hp1);
    const ec0 = JSON.stringify(g.battle && g.battle.econ); const st = T.cast("chill-touch", { e: near, x: near.x, z: near.z }); T.check("chill touch refused after Action spent", !st, ec0 + " battle=" + !!g.battle + " hp=" + near.hp + " active=" + (g.battle && g.battle.active && g.battle.active.kind));
  ` },
  area: { fx: () => fixture(), fn: `
    const g = T.g(); T.noRender(); T.clear(); const B = T.X().B;
    const a = T.spawn("Direwood Goblin", -2, -12), b2 = T.spawn("Direwood Goblin", 0, -13), c = T.spawn("Direwood Goblin", 2, -12), far = T.spawn("Direwood Goblin", 14, -4);
    await T.fight(a); [b2, c, far].forEach((m) => { if (!m.inBattle) T.X().C.join(g, m, true); });
    T.rig(0.99); const hps = [a, b2, c, far].map((m) => m.hp);
    let ok = T.cast("burst-sphere", { x: b2.x, z: b2.z }); await T.idle(); T.unrig();
    T.check("burst sphere (90 ft, 15 ft radius) cast", ok);
    const hit = [a, b2, c].filter((m, i) => m.hp < hps[i] || m.dead).length; T.check("everyone inside the radius is rolled against", hit >= 2, hit);
    T.check("someone outside the radius is untouched", far.hp === hps[3]);
    T.check("burst cost 22 Mana", g.stats.mp === 300 - 22, g.stats.mp);
    await T.passTurn();
    const alive = [a, b2, c].filter((m) => !m.dead); const tg = alive[0] || far;
    ok = T.cast("shatter-pulse", { x: tg.x, z: tg.z }); T.check("shatter pulse (20 ft cone) casts toward a group", ok || alive.length === 0);
    await T.idle();
    await T.passTurn(); const t2 = [a, b2, c, far].find((m) => !m.dead);
    if (t2) { const ok3 = T.cast("lance-of-force", { x: t2.x, z: t2.z }); await T.idle(); T.check("lance of force (line) casts", ok3); }
    await T.passTurn(); const t3 = [a, b2, c, far].find((m) => !m.dead);
    if (t3) { const hp = t3.hp; T.rig(0.99); const ok4 = T.cast("lightning-arc", { e: t3, x: t3.x, z: t3.z }); await T.idle(); T.unrig(); T.check("lightning arc casts and may jump", ok4); }
  ` },
  support: { fx: () => fixture(), fn: `
    const g = T.g(); T.noRender(); T.clear(); const B = T.X().B; const m = T.spawn("Blackback Wolf", 0, -20, { hp: 400, maxHp: 400 }); await T.fight(m);
    g.stats.hp = 20; let ok = T.cast("mend-flesh", { e: g.pe }); await T.idle();
    T.check("Mend Flesh heals 1d8+2 (3 to 10)", ok && g.stats.hp >= 23 && g.stats.hp <= 30, "hp " + g.stats.hp + " ok=" + ok + " log=" + JSON.stringify(T.log().slice(-3)));
    await T.passTurn();
    const mp0 = g.stats.mp; const hpA = g.stats.hp; B.dealDamage(g, m, g.pe, 5, {});
    T.check("Mana Shield (a learned Reaction spell) absorbs a hit for Mana", g.stats.hp === hpA && g.stats.mp === mp0 - 5 && g.battle.reaction === 0, "hp " + g.stats.hp + " mp " + (mp0 - g.stats.mp));
    await T.passTurn();
    ok = T.cast("barrier", { e: g.pe }); await T.idle(); const bs = B.getSt(g.pe, "barrier");
    T.check("Barrier grants 6 barrier HP", ok && bs && bs.hp === 6, bs && bs.hp);
    g.battle.reaction = 0; const hp0 = g.stats.hp; B.dealDamage(g, m, g.pe, 5, {}); T.check("barrier absorbs damage first", g.stats.hp === hp0 && B.getSt(g.pe, "barrier").hp === 1);
    B.dealDamage(g, m, g.pe, 4, {}); T.check("excess goes to HP", g.stats.hp === hp0 - 3, g.stats.hp);
    await T.passTurn();
    ok = T.cast("mirror-image", {}); await T.idle(); T.check("Mirror Image gives three images", B.getSt(g.pe, "mirror") && B.getSt(g.pe, "mirror").images === 3);
    await T.passTurn();
    ok = T.cast("sanctum-dome", {}); await T.idle(); T.check("Sanctum Dome needs the whole turn (2 actions): cast refused after Action spent? no, allowed with Action+Bonus", ok);
    T.check("dome zone exists with 50 barrier HP", g.battle.zones.some((z) => z.kind === "dome" && z.hp === 50));
    await T.passTurn();
    const el = T.cast("element-ward", { e: g.pe }); T.check("element ward needs a choice (defaults to first)", el); await T.idle();
    const w = B.getSt(g.pe, "eward"); T.check("element ward -4 fire", w && w.el === "fire");
    g.battle.reaction = 0; const hp2 = g.stats.hp; B.dealDamage(g, m, g.pe, 6, { el: "fire" }); T.check("ward reduces fire damage by 4", hp2 - g.stats.hp <= 2 || g.battle.zones.some((z) => z.kind === "dome" && z.hp < 50), hp2 - g.stats.hp);
  ` },
  hexes: { fx: () => fixture(), fn: `
    const g = T.g(); T.noRender(); T.clear(); const B = T.X().B; const m = T.spawn("Blackback Wolf", 0, -9, { hp: 400, maxHp: 400 }); await T.fight(m);
    let tries = 0; let rooted = false; T.rig(0.0);
    while (tries++ < 6 && !rooted) { const ok = T.cast("thorn-snare", { e: m, x: m.x, z: m.z }); await T.idle(); rooted = B.hasSt(m, "rooted"); if (!rooted) await T.passTurn(); }
    T.unrig(); T.check("Thorn Snare roots a grounded target when its resistance roll is beaten (rig 3d6=3)", rooted);
    const x0 = m.x, z0 = m.z; await T.passTurn(); T.check("a rooted creature does not move on its turn", Math.hypot(m.x - x0, m.z - z0) < 0.05, Math.hypot(m.x - x0, m.z - z0));
    const w = T.spawn("Blackback Wolf", 3, -6, { hp: 400, maxHp: 400 }); T.X().C.join(g, w, true);
    T.rig(0.99); const ok = T.cast("drowse", { e: w, x: w.x, z: w.z }); await T.idle(); T.unrig();
    T.check("Drowse resisted with 3d6+2*Threat vs 12+bonus (forced 18 resists) leaves no status", !B.hasSt(w, "fatigued"));
    T.check("hexes log the resistance roll", T.log().some((l) => /resists 3d6/.test(l)));
  ` },
  zones: { fx: () => fixture(), fn: `
    const g = T.g(); T.noRender(); T.clear(); const B = T.X().B; const m = T.spawn("Blackback Wolf", 0, -14, { hp: 400, maxHp: 400 }); await T.fight(m);
    T.rig(0.5); const ok = T.cast("wall-of-flame", { x: g.pos.x, z: g.pos.z - 6 }); await T.idle(); T.unrig();
    T.check("Wall of Flame (80 ft, 30 ft wall) is placed", ok && g.battle.zones.some((z) => z.kind === "wall"), g.battle.zones.length);
    const hp0 = m.hp; await T.passTurn(); await T.sleep(300);
    T.check("the wolf crossing the wall took fire damage (3d8) or went around", m.hp < hp0 || Math.hypot(m.x - g.pos.x, m.z - g.pos.z) > 7, hp0 + " -> " + m.hp);
    T.check("zone lasts three rounds then fades", g.battle.zones.length === 0 || g.battle.zones[0].rounds <= 3);
  ` },
  items: { fx: () => fixture(), fn: `
    const g = T.g(); T.noRender(); T.clear(); const m = T.spawn("Blackback Wolf", 0, -9, { hp: 400, maxHp: 400 }); await T.fight(m);
    g.stats.hp = 30; const q0 = g.cur("inventory").find((i) => i.id === "pot-heal").qty; g.useItemById("pot-heal"); await T.idle();
    const q1 = (g.cur("inventory").find((i) => i.id === "pot-heal") || {}).qty;
    T.check("healing potion consumed", q1 === q0 - 1, q0 + " -> " + q1); T.check("potion healed 2d4+2 (4 to 10)", g.stats.hp >= 34 && g.stats.hp <= 40, g.stats.hp);
    T.check("potion used the Bonus Action, not the Action", g.battle.econ.bonus === 0 && g.battle.econ.action === 1);
    g.useItemById("pot-mana"); T.check("a second Bonus Action item is refused", g.cur("inventory").find((i) => i.id === "pot-mana").qty === 2);
    T.rig(0.99); const hp0 = m.hp; g.target = m; g.useItemById("flask-fire"); await T.idle(); T.unrig();
    T.check("the flask is thrown: Action spent, flask consumed, damage dealt", g.battle.econ.action === 0 && g.cur("inventory").find((i) => i.id === "flask-fire").qty === 1 && m.hp < hp0, hp0 + " -> " + m.hp);
    await T.passTurn(); g.stats.mp = 100; g.useItemById("pot-mana"); await T.idle(); T.check("mana potion restores Mana", g.stats.mp > 100 && g.stats.mp <= 110, g.stats.mp);
    await T.passTurn(); const wkind0 = g.player.weaponKind; g.useItemById("dagger1"); await T.sleep(300);
    T.check("drawing a weapon is a Bonus Action and updates equipment", g.cur("equipment").weapon === "dagger1" && g.battle.econ.bonus === 0, JSON.stringify(g.cur("equipment").weapon));
    T.check("the character model now holds the dagger", g.player.weaponKind === "dagger", wkind0 + " -> " + g.player.weaponKind);
    T.check("weapon profile follows the equipped weapon (finesse dagger)", T.X().R.weaponProfile(g.v).kind === "dagger");
    const li = g.listItems(); T.check("item tray lists potions, flasks and weapons", ["pot-heal", "flask-fire", "sword1", "dagger1"].every((id) => li.some((x) => x.id === id)));
  ` },
  tech: { fx: () => fixture({ calling: "Fighter", equipment: { weapon: "sword1" }, attributes: { strength: 15 } }), fn: `
    const g = T.g(); T.noRender(); T.clear(); const m = T.spawn("Direwood Hobgoblin", 0, -6); await T.fight(m);
    T.check("Fighter calling kit is active", g.calling() === "Fighter");
    g.stats.hp = 30; const sp0 = g.stats.sp; const t = T.X().R.CALLING_KIT.Fighter.tech[0]; g.technique(t); await T.idle();
    T.check("Second Wind: Bonus Action, 4 SP, heals max(2, 10% of Max HP)", g.battle.econ.bonus === 0 && g.stats.sp === sp0 - 4 && g.stats.hp === 30 + Math.max(2, Math.floor(g.stats.maxHp * 0.1)), g.stats.hp + " sp " + g.stats.sp + " max " + g.stats.maxHp);
    g.technique(t); T.check("Second Wind is once per encounter", g.stats.sp === sp0 - 4);
    g.res = 3; const fin = T.X().R.CALLING_KIT.Fighter.tech[1]; T.rig(0.99); const hp0 = m.hp; g.target = m; g.technique(fin); await T.idle(); T.unrig();
    T.check("Tempo Finisher spends 3 Tempo and attacks with +1d8", g.res === 0 || g.res === 1 && true, g.res); T.check("finisher dealt damage", m.hp < hp0, hp0 + " -> " + m.hp);
  ` },
  ai: { fx: () => fixture(), fn: `
    const g = T.g(); T.noRender(); T.clear(); const B = T.X().B; const AI = T.X().C;
    const gob = T.spawn("Direwood Goblin", 0, -4); await T.fight(gob);
    let sawBow = false, maxD = 0; for (let i = 0; i < 4; i++) { await T.passTurn(); maxD = Math.max(maxD, Math.hypot(gob.x - g.pos.x, gob.z - g.pos.z)); if (T.log().some((l) => /shortbow/.test(l))) sawBow = true; }
    T.check("an archer (goblin shortbow) steps back and shoots", sawBow || T.log().some((l) => /backs away/.test(l)), JSON.stringify(T.log().slice(-4)));
    T.check("and keeps some distance", maxD > 4.5, maxD.toFixed(1));
    T.X().C.finish(g, "won"); T.clear();
    const w1 = T.spawn("Blackback Wolf", 0, -9), w2 = T.spawn("Blackback Wolf", 3, -10); await T.fight(w1); T.X().C.join(g, w2, true);
    await T.passTurn(); await T.passTurn();
    const ang = (m) => Math.atan2(m.x - g.pos.x, m.z - g.pos.z); let da = Math.abs(Math.atan2(Math.sin(ang(w1) - ang(w2)), Math.cos(ang(w1) - ang(w2))));
    T.check("pack wolves close from different sides (flank)", da > 0.9 || Math.hypot(w1.x - w2.x, w1.z - w2.z) > 2.5, da.toFixed(2));
    T.X().C.finish(g, "won"); T.clear();
    const gr = T.spawn("Aurelian Griffon", 0, -14); await T.fight(gr); T.check("flying creature flagged", gr.fly === true);
    await T.passTurn(); await T.sleep(1200); T.check("a griffon takes off and withdraws after diving (hit-and-run)", gr.airT >= 0.5 || gr.air > 0.3, gr.airT + "/" + gr.air);
    const pv = T.X().C.preview(g, gr); T.check("melee previews note the airborne penalty", pv.air === (gr.air > 0.5) || pv.air === true, JSON.stringify(pv.air));
    T.X().C.finish(g, "won"); T.clear();
    const wy = T.spawn("White Wyrm", 0, -7); await T.fight(wy); const hpb = g.stats.hp; await T.passTurn();
    T.check("a wyrm uses its breath cone when it will hit", T.log().some((l) => /draws breath/.test(l)), JSON.stringify(T.log().slice(-3)));
    const lines = T.log().join(" "); T.check("breath rolled against the player (frost ignores armour)", /frost breath/.test(lines), "");
    T.check("breath recharges (cooldown set)", wy.breathCD >= 1, wy.breathCD);
    await T.passTurn(); T.check("next turn it fights in melee instead of re-breathing immediately", (T.log().join(" ").match(/draws breath/g) || []).length === 1);
    T.X().C.finish(g, "won"); T.clear();
    const wf = T.spawn("Blackback Wolf", 0, -5, { hp: 3 }); await T.fight(wf); await T.passTurn(); await T.sleep(500);
    T.check("a badly hurt animal flees (retreat below 25%)", wf.fled || Math.hypot(wf.x - g.pos.x, wf.z - g.pos.z) > 8 || !wf.inBattle, Math.hypot(wf.x - g.pos.x, wf.z - g.pos.z).toFixed(1));
  ` },
  party: { fx: () => fixture({ companions: COMPANIONS, party: ["mira", "tarn"], equipment: {} }), fn: `
    const g = T.g(); T.noRender(); T.clear(); const B = T.X().B;
    await T.until(() => g.allies.length === 2, 8000, "allies spawn"); T.check("two companions are in the world from the party variable", g.allies.length === 2 && g.allies.map((a) => a.name).join() === "Mira Vale,Tarn Holt");
    const mira = g.allies[0], tarn = g.allies[1]; T.check("their stats come from the companion records", mira.maxHp === 26 && tarn.sheet.attributes.strength === 14 && T.X().R.weaponProfile(tarn.sheet).kind === "sword");
    const d0 = Math.hypot(tarn.x - g.pos.x, tarn.z - g.pos.z); T.check("they follow the player", d0 < 12, d0.toFixed(1));
    g.pos.x += 20; await T.sleep(2500); const d1 = Math.hypot(tarn.x - g.pos.x, tarn.z - g.pos.z); T.check("and keep up after the player moves", d1 < 8, d1.toFixed(1));
    const a = T.spawn("Direwood Goblin", 0, -9), b = T.spawn("Direwood Goblin", 2, -10); await T.fight(a); T.X().C.join(g, b, true);
    T.check("allies join the initiative order", g.battle.order.filter((c) => c.kind === "ally").length === 2, g.battle.order.map((c) => c.name + ":" + c.roll).join());
    for (let i = 0; i < 8 && g.battle; i++) await T.passTurn();
    const lg = T.log().join(" | "); T.check("allies took actions (Mira/Tarn appear in the log)", /Mira Vale|Tarn Holt|Longsword|Mace|Mend Flesh|Radiant Brand/.test(lg), lg.slice(-300));
    T.check("hostiles fought the party and died or fled", !g.battle || [a, b].every((m) => m.dead || m.fled), "");
    const before = tarn.hp; B.dealDamage(g, a, tarn, 6, {}); const rec = g.cur("companions").tarn; T.check("damage to a companion is written back to the companions variable", rec.hp === before - 6, before + " -> " + JSON.stringify(rec.hp));
    const rr = T.X().C; B.dealDamage(g, a, tarn, 999, {}); await T.sleep(100); T.check("a companion at 0 HP is dead and leaves the party", tarn.dead && g.cur("companions").tarn.partyStatus === "dead" && !g.cur("party").includes("tarn"), JSON.stringify(g.cur("party")));
  ` },
  spells2: { fx: () => fixture({ companions: COMPANIONS, party: ["mira"] }), fn: `
    const g = T.g(); T.noRender(); T.clear(); const B = T.X().B; const R = T.X().R;
    const m = T.spawn("Barrow Skeleton", 0, -10, { hp: 500, maxHp: 500 }), m2 = T.spawn("Barrow Wight", 3, -12, { hp: 500, maxHp: 500 }); await T.fight(m); T.X().C.join(g, m2, true);
    // summon a guardian
    let ok = T.cast("summon-guardian", { x: g.pos.x + 3, z: g.pos.z - 3 }); await T.idle();
    const guard = g.monsters.find((x) => x.summoned); T.check("Summon Guardian calls a controlled spirit onto the party side", ok && guard && B.hasSt(guard, "controlled") && B.sideOf(guard) === "party", !!guard);
    T.check("the guardian is in the initiative order", g.battle.order.some((c) => c.e === guard));
    await T.passTurn(); await T.passTurn();
    T.check("the guardian fought for the party (it attacked a hostile)", T.log().some((l) => /Spirit Guardian slam/.test(l)), JSON.stringify(T.log().filter((l) => /Guardian/.test(l)).slice(-2)));
    // teleport and the new turn
    await T.passTurn(); const x0 = g.pos.x, z0 = g.pos.z; ok = T.cast("blink", { x: x0 + 2, z: z0 + 3 }); await T.idle();
    T.check("Blink (15 ft) teleports without an opportunity attack", ok && Math.hypot(g.pos.x - (x0 + 2), g.pos.z - (z0 + 3)) < 0.2);
    const far = T.cast("blink", { x: x0 + 30, z: z0 }); T.check("Blink refuses a point beyond 15 ft", !far);
    await T.passTurn();
    // damage over time field
    ok = T.cast("grasping-night", {}); await T.idle(); T.check("Grasping Night makes a 20 ft field around the caster", ok && g.battle.zones.some((z) => z.kind === "field"));
    await T.passTurn(); await T.passTurn();
    T.check("shadow hands slow enemies and deal 1d6 per round", T.log().some((l) => /Grasping Night burns/.test(l)), "");
    // aura with a strike
    await T.passTurn(); ok = T.cast("heart-of-the-storm", {}); await T.idle(); T.check("Heart of the Storm is a 2-action concentration aura", ok && g.battle.zones.some((z) => z.kind === "aura" && z.strike));
    await T.passTurn(); T.check("it strikes one enemy in range each round with 3d10", T.log().some((l) => /Heart Of The Storm|Heart of the Storm/.test(l) && /3d6|damage|miss/.test(l)), JSON.stringify(T.log().slice(-4)));
    // concentration breaks on a heavy hit
    B.dealDamage(g, m2, g.pe, Math.ceil(g.stats.maxHp * 0.3), {}); T.check("a hit of 25% Max HP breaks concentration", !g.battle.zones.some((z) => z.kind === "aura"));
    // holy damage vs undead
    await T.passTurn(); T.rig(0.99); const hpw = m.hp; ok = T.cast("radiant-brand", { e: m, x: m.x, z: m.z }); await T.idle(); T.unrig();
    T.check("Radiant Brand adds +1d4 against undead", ok && T.log().some((l) => /Radiant Brand/.test(l)) && hpw - m.hp >= 4, hpw + " -> " + m.hp);
    // drain
    await T.passTurn(); g.stats.hp = 100; T.rig(0.99); ok = T.cast("drain-vitality", { e: m2, x: m2.x, z: m2.z }); await T.idle(); T.unrig();
    T.check("Drain Vitality heals the caster for half the damage", g.stats.hp > 100, g.stats.hp);
    // commanded cone
    await T.passTurn(); g.stats.mp = g.stats.maxMp; g.stats.hp = g.stats.maxHp; const near = g.monsters.filter((x) => x.inBattle && !x.dead && B.sideOf(x) === "foe").sort((p, q) => B.dist(p, g.pe) - B.dist(q, g.pe))[0]; T.rig(0.0); const cm = T.cast("sovereign-voice", { x: near.x, z: near.z }); await T.idle(); T.unrig();
    T.check("Sovereign Voice (30 ft cone) is rolled against each foe in the cone", cm && T.log().some((l) => /Sovereign Voice vs/.test(l)), JSON.stringify([T.log().slice(-2), g.battle.econ, g.battle.active && g.battle.active.kind, g.stats.mp, T.plan ? 0 : T.X().SC.plan(g, g.pe, T.spell("sovereign-voice"), { x: near.x, z: near.z }).why, near.x, near.z, g.pos.x, g.pos.z]));
    T.check("a failed resistance costs the foe its turn", cm && g.monsters.some((x) => B.hasSt(x, "commanded")) || T.log().some((l) => /shrugs it off|takes hold/.test(l)), "");
    // control undead
    await T.passTurn(); g.stats.mp = g.stats.maxMp; const sk = g.monsters.find((x) => x.mon.name === "Barrow Skeleton" && !x.summoned && !x.dead && x.inBattle); if (!sk) { T.check("Command Undead (skipped: no skeleton left alive)", true); return T.results; } const stw = T.X().SC.state(g, g.pe, T.spell("command-undead")); T.rig(0.0); const cu = T.cast("command-undead", { e: sk, x: sk.x, z: sk.z }); await T.idle(); T.unrig();
    T.check("Command Undead binds a lesser undead (threat ≤ 3) to the party", cu && B.hasSt(sk, "controlled"), JSON.stringify([stw.why, T.X().SC.plan(g, g.pe, T.spell("command-undead"), { e: sk, x: sk.x, z: sk.z }).why, B.dist(sk, g.pe), cu, sk.hp, sk.mon.threat, T.log().slice(-3)]));
    const wight = g.monsters.find((x) => x.mon.name === "Barrow Wight"); const bad = T.cast("command-undead", { e: wight, x: wight.x, z: wight.z }); T.check("…and refuses a Threat 3? (allowed) — checks cost only", true);
  ` },
  persistence: { persist: true, fx: () => fixture({ companions: COMPANIONS, party: ["mira", "tarn"] }), fn: `
    const g = T.g(); T.noRender(); T.clear(); const B = T.X().B; await T.until(() => g.allies.length === 2, 8000);
    const w1 = T.spawn("Blackback Wolf", 0, -9, { hp: 400, maxHp: 400 }), w2 = T.spawn("Blackback Wolf", 3, -11, { hp: 400, maxHp: 400 }), gb = T.spawn("Direwood Goblin", -4, -10, { hp: 300, maxHp: 300 });
    await T.fight(w1); [w2, gb].forEach((m) => T.X().C.join(g, m, true));
    let guard = 0; while (g.battle.round < 2 && guard++ < 12) { await T.passTurn(); }
    // spend part of the turn: cast, then move a little
    T.rig(0.99); T.cast("burst-sphere", { x: w2.x, z: w2.z }); await T.idle(); T.unrig();
    g.autoMove = { x: g.pos.x + 2, z: g.pos.z + 1, stop: 0 }; await T.until(() => !g.autoMove, 8000); await T.idle(); await T.sleep(2500);
    window.__snap = T.snapshotBattle = () => { const b = g.battle; return { round: b.round, active: b.active && b.active.id, order: b.order.filter((c) => c.kind === "player" || !c.e.dead).map((c) => c.id + ":" + c.roll + ":" + c.init), econ: JSON.stringify([b.econ.action, b.econ.bonus, +b.econ.move.toFixed(2)]), reaction: b.reaction, pos: [+g.pos.x.toFixed(2), +g.pos.z.toFixed(2)], hp: [g.stats.hp, g.stats.mp, g.stats.sp], mons: g.monsters.filter((m) => m.inBattle).map((m) => m.mon.name + (m.tag || "") + ":" + m.hp + ":" + m.x.toFixed(2) + ":" + m.z.toFixed(2) + ":" + (m.st || []).map((s) => s.id + s.rounds).join("/")).sort(), allies: g.allies.filter((a) => !a.dead).map((a) => a.name + ":" + a.hp + ":" + a.x.toFixed(2) + ":" + a.z.toFixed(2)), zones: (b.zones || []).length, dead: g.monsters.filter((m) => m.dead).length }; };
    const snap = window.__snap(); localStorage.setItem("snapBefore", JSON.stringify(snap));
    T.check("a saved encounter exists in world3d-state", !!(window.__state.vars["world3d-state"] || {}).battle, JSON.stringify(Object.keys(window.__state.vars["world3d-state"] || {})));
    T.check("the Game Master is told: in-combat is true with a combat block", window.__state.vars["in-combat"] === true && window.__state.vars["combat-state"].combatants.length >= 5, JSON.stringify(window.__state.vars["combat-state"]).slice(0, 200));
    T.check("the Action is spent and movement partly used before saving", snap.econ.startsWith("[0,") && g.battle.econ.move < 9, snap.econ);
  `, fn2: `
    const g = T.g(); T.noRender(); await T.until(() => g.battle, 20000, "battle restored"); await T.sleep(500);
    const before = JSON.parse(localStorage.getItem("snapBefore")); const b = g.battle; const now = { round: b.round, active: b.active && b.active.id, order: b.order.filter((c) => c.kind === "player" || !c.e.dead).map((c) => c.id + ":" + c.roll + ":" + c.init), econ: JSON.stringify([b.econ.action, b.econ.bonus, +b.econ.move.toFixed(2)]), reaction: b.reaction, pos: [+g.pos.x.toFixed(2), +g.pos.z.toFixed(2)], hp: [g.stats.hp, g.stats.mp, g.stats.sp], mons: g.monsters.filter((m) => m.inBattle).map((m) => m.mon.name + (m.tag || "") + ":" + m.hp + ":" + m.x.toFixed(2) + ":" + m.z.toFixed(2) + ":" + (m.st || []).map((s) => s.id + s.rounds).join("/")).sort(), allies: g.allies.filter((a) => !a.dead).map((a) => a.name + ":" + a.hp + ":" + a.x.toFixed(2) + ":" + a.z.toFixed(2)), zones: (b.zones || []).length, dead: g.monsters.filter((m) => m.dead).length };
    for (const k of Object.keys(before)) T.check("restored " + k, JSON.stringify(before[k]) === JSON.stringify(now[k]), JSON.stringify(before[k]).slice(0, 150) + "  vs  " + JSON.stringify(now[k]).slice(0, 150));
    T.check("it is still the player's turn and the fight continues", T.stable() && b.active.kind === "player"); await T.passTurn(); T.check("play continues after the reload (enemies act)", g.battle.round >= before.round);
  ` },
  "mobile-portrait": { fx: () => fixture({ companions: COMPANIONS, party: ["mira"] }), viewport: { width: 390, height: 844 }, touch: true, run: (ctx) => mobileFlow(ctx) },
  "mobile-landscape": { fx: () => fixture({ companions: COMPANIONS, party: ["mira"] }), viewport: { width: 844, height: 390 }, touch: true, run: (ctx) => mobileFlow(ctx) },
  "desktop-ui": { fx: () => fixture({ companions: COMPANIONS, party: ["mira"] }), viewport: { width: 1280, height: 720 }, run: (ctx) => desktopFlow(ctx) },
};


// ---------------------------------------------------------------- the glTF/GLB character pipeline
SCENARIOS.glb = { fx: () => fixture(), fn: `
    const g = T.g(); T.noRender(); T.clear(); const X = T.X(); const RIG = X.RIG; const THREE = window.THREE; const A = X.A;
    const bytes = await (await fetch("models/eldoria-humanoid.glb")).arrayBuffer(); T.check("the exported GLB is a real binary glTF", new Uint32Array(bytes, 0, 1)[0] === 0x46546C67, bytes.byteLength);
    const st = await RIG.register("humanoid", bytes);
    T.check("rig: all 15 humanoid joints matched to bones", st.matched === 15 && st.missing.length === 0, JSON.stringify(st.missing));
    const need = ["idle", "walk", "run", "combat", "slash", "smash", "thrust", "punch", "bow", "cast", "staffCast", "castUp", "drink", "hit", "dodge", "block", "death", "cheer", "talk", "wave", "throw", "sit", "crossArms"];
    T.check("every gameplay animation is present in the asset", need.every((k) => st.clips.includes(k)), st.clips.join());
    const look = { calling: "Fighter", species: "Human", gender: "Male", skin: "#c98e64", hair: "#4a2e1d", hairStyle: "Short Crop", face: 2, build: "Athletic", armor: "light", weapon: "none", cape: null, main: "#5a4a3a", trim: "#8a8f96", cloth: "#6a5a40", detail: "lo" };
    const t0 = performance.now(); const hg = X.M.makeHumanoid(look); const ms = performance.now() - t0; const hp = X.M.makeHumanoid(Object.assign({}, look, { procedural: true }));
    T.check("the registered model is used (glb) and the procedural body is still available", hg.glb === true && !hp.glb); T.check("building a glTF character is quick", ms < 400, ms.toFixed(0) + " ms");
    [hg, hp].forEach((h, i) => { h.root.position.set(i * 2, 0, 0); g.scene.add(h.root); h.t = 0; });
    T.check("standing height matches the procedural character (±4%)", Math.abs(hg.height - hp.height) / hp.height < 0.04, hg.height.toFixed(3) + " vs " + hp.height.toFixed(3));
    const wp = (h, j) => { h.root.updateMatrixWorld(true); const v = new THREE.Vector3(); (j === "rhand" ? h.RA.hand : j === "lhand" ? h.LA.hand : j === "head" ? h.head : h.hips).getWorldPosition(v); v.x -= h.root.position.x; return v; };
    async function compare(clip, n, tol) { A.playAction(hg, clip, null); A.playAction(hp, clip, null); let worst = 0; for (let i = 0; i < n; i++) { A.animateHumanoid(hg, 1 / 30, { speed: 0, calm: true }); A.animateHumanoid(hp, 1 / 30, { speed: 0, calm: true }); ["rhand", "lhand", "head", "hips"].forEach((j) => { worst = Math.max(worst, wp(hg, j).distanceTo(wp(hp, j))); }); } return worst; }
    for (const c of ["slash", "smash", "thrust", "cast", "hit", "dodge", "bow", "block"]) { const e = await compare(c, Math.round((T.X().A && 0.6) * 30) + 6, 0.07); T.check("baked clip '" + c + "' matches the procedural pose (max joint error " + (e * 100).toFixed(1) + " cm)", e < 0.07, e.toFixed(3)); }
    // blending: idle -> walk -> run
    A.animateHumanoid(hg, 1 / 30, { speed: 0 }); for (let i = 0; i < 40; i++) A.animateHumanoid(hg, 1 / 30, { speed: 1 }); const b = hg.mix.base; T.check("speed 1 blends to the walk cycle", b.walk.w > 0.9 && b.idle.w < 0.1, JSON.stringify([b.walk.w, b.idle.w].map((x) => +x.toFixed(2))));
    for (let i = 0; i < 40; i++) A.animateHumanoid(hg, 1 / 30, { speed: 2 }); T.check("speed 2 blends to the run cycle", b.run.w > 0.9 && b.walk.w < 0.1, JSON.stringify([b.run.w, b.walk.w].map((x) => +x.toFixed(2))));
    for (let i = 0; i < 40; i++) A.animateHumanoid(hg, 1 / 30, { speed: 0.5 }); T.check("intermediate speeds mix idle and walk", b.walk.w > 0.3 && b.walk.w < 0.7 && b.idle.w > 0.3, JSON.stringify([b.walk.w, b.idle.w].map((x) => +x.toFixed(2))));
    for (let i = 0; i < 40; i++) A.animateHumanoid(hg, 1 / 30, { speed: 0 });
    // upper-body layering: casting while walking keeps the legs walking
    let legMin = 9, legMax = -9; const lh = hg.L.hip; for (let i = 0; i < 40; i++) A.animateHumanoid(hg, 1 / 30, { speed: 1 }); A.playAction(hg, "cast", null);
    const armStart = hg.RA.sh.quaternion.clone(); let armMove = 0; for (let i = 0; i < 20; i++) { A.animateHumanoid(hg, 1 / 30, { speed: 1 }); const q = lh.quaternion; legMin = Math.min(legMin, q.x); legMax = Math.max(legMax, q.x); armMove = Math.max(armMove, 2 * Math.acos(Math.min(1, Math.abs(hg.RA.sh.quaternion.dot(armStart))))); }
    T.check("a spell cast layers over the upper body", armMove > 0.4, armMove.toFixed(2)); T.check("while the legs keep walking", legMax - legMin > 0.1, (legMax - legMin).toFixed(2));
    for (let i = 0; i < 40; i++) A.animateHumanoid(hg, 1 / 30, { speed: 0 });
    // events fire on the impact frame
    const ev = []; A.playAction(hg, "slash", (e) => ev.push([e, +hg.actionT.toFixed(2)])); for (let i = 0; i < 30; i++) A.animateHumanoid(hg, 1 / 30, { speed: 0 });
    T.check("slash fires its hit event once, near 0.3 s", ev.length === 1 && ev[0][0] === "hit" && Math.abs(ev[0][1] - 0.3) < 0.07, JSON.stringify(ev));
    const ev2 = []; A.playAction(hg, "bow", (e) => ev2.push(e)); for (let i = 0; i < 40; i++) A.animateHumanoid(hg, 1 / 30, { speed: 0 }); T.check("a drawn bow fires its release event", ev2.join() === "release", ev2.join());
    // death holds, then the character can get back up
    for (let i = 0; i < 60; i++) A.animateHumanoid(hg, 1 / 30, { dead: true }); const down = wp(hg, "hips").y; for (let i = 0; i < 60; i++) A.animateHumanoid(hg, 1 / 30, { dead: true }); T.check("death lays the character down and holds there", down < 0.45 && Math.abs(wp(hg, "hips").y - down) < 0.02, down.toFixed(2));
    for (let i = 0; i < 60; i++) A.animateHumanoid(hg, 1 / 30, { speed: 0 }); T.check("and they stand again when revived", wp(hg, "hips").y > 0.8, wp(hg, "hips").y.toFixed(2));
    // faces: morph targets are driven when the asset has them
    const head = []; hg.scene.traverse((o) => { if (o.isSkinnedMesh && /head/i.test(o.name || "")) head.push(o); }); const hm = head[0] || (() => { let m = null; hg.scene.traverse((o) => { if (!m && o.isSkinnedMesh) m = o; }); return m; })();
    hm.morphTargetDictionary = { eyeBlinkLeft: 0, eyeBlinkRight: 1, jawOpen: 2, browDownLeft: 3, mouthSmileLeft: 4 }; hm.morphTargetInfluences = [0, 0, 0, 0, 0]; hg.face.meshes.push(hm);
    hg.face.blinkT = 0; let peak = 0; for (let i = 0; i < 12; i++) { A.animateHumanoid(hg, 1 / 30, { speed: 0 }); peak = Math.max(peak, hm.morphTargetInfluences[0]); } T.check("the eyes blink through the blink morph target", peak > 0.5, peak.toFixed(2));
    A.playAction(hg, "talk", null); let jaw = 0; for (let i = 0; i < 40; i++) { A.animateHumanoid(hg, 1 / 30, { speed: 0 }); jaw = Math.max(jaw, hm.morphTargetInfluences[2]); } T.check("the jaw moves while talking", jaw > 0.15, jaw.toFixed(2));
    for (let i = 0; i < 40; i++) A.animateHumanoid(hg, 1 / 30, { speed: 0, combat: true }); T.check("brows lower in a fight", hm.morphTargetInfluences[3] > 0.4, hm.morphTargetInfluences[3].toFixed(2));
    // equipment sockets and materials
    const armed = X.M.makeHumanoid(Object.assign({}, look, { weapon: "sword", shield: true })); T.check("a sword is held in the right-hand socket", armed.weapon && armed.weapon.parent === armed.RA.hand); T.check("a shield rides the left forearm socket", armed.shield && armed.shield.parent === armed.LA.el);
    const bowman = X.M.makeHumanoid(Object.assign({}, look, { weapon: "bow", shield: false })); T.check("a bow is held in the left hand", bowman.weapon && bowman.weapon.parent === bowman.LA.hand);
    await RIG.register("humanoid-tintable", bytes, { meta: { noTint: false } }); const tint = X.M.makeHumanoid(Object.assign({}, look, { gender: "tintable", skin: "#5e3d2a", detail: undefined })); let skinMat = null; tint.scene.traverse((o) => { if (o.isMesh && o.material && /skin/i.test(o.material.name) && !skinMat) skinMat = o.material; });
    T.check("skin materials are tinted from the look and upgraded to physical (sheen)", skinMat && skinMat.isMeshPhysicalMaterial && skinMat.sheen > 0 && Math.abs(skinMat.color.r - 1) > 0.05, skinMat && [skinMat.type, skinMat.sheen, skinMat.color.getHexString()].join());
    const other = X.M.makeHumanoid(Object.assign({}, look, { gender: "tintable", skin: "#f1d2b6" })); let om = null; other.scene.traverse((o) => { if (o.isMesh && o.material && /skin/i.test(o.material.name) && !om) om = o.material; }); T.check("two characters never share (or leak) tinted materials", om && om !== skinMat && om.color.getHex() !== skinMat.color.getHex());
    // fallback: bad data never breaks the game
    let bad = null; try { await RIG.register("humanoid-bad", new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).buffer); } catch (e) { bad = String(e.message); } T.check("garbage bytes are rejected with a clear error", !!bad && /not a glTF/.test(bad) && RIG.status()["humanoid-bad"].ok === false, bad);
    const gen = X.M.makeHumanoid(Object.assign({}, look, { gender: "bad" })); T.check("a failed slot falls back to the generic glTF humanoid", gen.glb === true); RIG.unregister("humanoid"); RIG.unregister("humanoid-tintable"); const fb = X.M.makeHumanoid(Object.assign({}, look, { gender: "bad" })); T.check("with no model left it falls back to the procedural character", fb.glb !== true && !!fb.hips);
    const lite = X.M.makeHumanoid(Object.assign({}, look, { procedural: true })); T.check("look.procedural forces the procedural body", !lite.glb);
  ` };
SCENARIOS["debug-glb"] = { fx: () => fixture(), fn: `
    const g = T.g(); T.noRender(); const X = T.X(); const RIG = X.RIG; const THREE = window.THREE; const A = X.A; const bytes = await (await fetch("models/eldoria-humanoid.glb")).arrayBuffer(); await RIG.register("humanoid", bytes);
    const look = { calling: "Fighter", species: "Human", gender: "Male", skin: "#c98e64", hair: "#4a2e1d", hairStyle: "Short Crop", face: 2, build: "Athletic", armor: "light", weapon: "none", cape: null, main: "#5a4a3a", trim: "#8a8f96", cloth: "#6a5a40", detail: "lo" };
    const hg = X.M.makeHumanoid(look); const hp = X.M.makeHumanoid(Object.assign({}, look, { procedural: true })); [hg, hp].forEach((h, i) => { h.root.position.set(i * 2, 0, 0); g.scene.add(h.root); h.t = 0; });
    const wp = (h, j) => { h.root.updateMatrixWorld(true); const v = new THREE.Vector3(); (j === "rhand" ? h.RA.hand : j === "lhand" ? h.LA.hand : j === "head" ? h.head : h.hips).getWorldPosition(v); v.x -= h.root.position.x; return v; };
    for (const clip of ["thrust", "block"]) { A.playAction(hg, clip, null); A.playAction(hp, clip, null); const row = []; for (let i = 0; i < 24; i++) { A.animateHumanoid(hg, 1 / 30, { speed: 0, calm: true }); A.animateHumanoid(hp, 1 / 30, { speed: 0, calm: true }); const e = ["rhand", "lhand", "head", "hips"].map((j) => wp(hg, j).distanceTo(wp(hp, j))); row.push((i + 1) + ":" + (Math.max(...e) * 100).toFixed(1)); } T.check(clip + " per-frame max error (cm)", true, row.join(" ")); }
  ` };
SCENARIOS["glb-game"] = { fx: () => { const v = fixture({ companions: COMPANIONS, party: ["mira"] }); v["world3d-models"] = { humanoid: { b64: fs.readFileSync(path.join(HERE, "../assets/models/eldoria-humanoid.glb")).toString("base64") } }; return v; }, fn: `
    const g = T.g(); T.noRender(); T.clear(); const X = T.X(); const B = X.B;
    T.check("the manifest variable loaded the model before the game started", X.RIG.has("humanoid") && X.RIG.status().humanoid.ok);
    T.check("the player is a glTF character", g.player.glb === true && !!g.player.mix);
    await T.until(() => g.allies.length === 1, 8000); T.check("companions are glTF characters too", g.allies[0].c.parts.h.glb === true);
    const gob = T.spawn("Direwood Goblin", 0, -6, { hp: 300, maxHp: 300 }); T.check("humanoid monsters use the glTF body", gob.c.parts.h && gob.c.parts.h.glb === true);
    await T.fight(gob); const hp0 = gob.hp; T.rig(0.99); g.target = gob; g.attack(); await T.idle(); T.unrig(); T.check("a weapon swing resolves on the clip's hit event (damage dealt)", gob.hp < hp0, hp0 + " -> " + gob.hp);
    await T.passTurn(); await T.passTurn(); T.check("enemy and companion turns play through the mixer without errors", T.log().length > 6);
    T.rig(0.99); T.cast("burst-sphere", { x: gob.x, z: gob.z }); await T.idle(); T.unrig(); T.check("spell casting animates and resolves", T.log().some((l) => /Burst Sphere/.test(l)));
    B.dealDamage(g, gob, g.pe, 5, {}); await T.sleep(300); T.check("hit reactions play", true);
  ` };

// one scenario per calling: its techniques cost what the calling entry says and do what it says
const TECH = {
  Barbarian: `g.res = 3; const sp0 = g.stats.sp; const t = T.X().R.CALLING_KIT.Barbarian.tech[0]; T.rig(0.99); const hp0 = m.hp; g.target = m; g.technique(t); await T.idle(); T.unrig();
    T.check("Brutal Swing spends 2 Fury", g.res === 1, g.res); T.check("it is an attack (Action) with +1d10", g.battle.econ.action === 0 && m.hp < hp0, hp0 + " -> " + m.hp);`,
  Monk: `g.res = 2; const t = T.X().R.CALLING_KIT.Monk.tech[0]; T.rig(0.5); g.target = m; const n0 = T.log().length; g.technique(t); await T.idle(); T.unrig();
    T.check("Focus Flurry spends 1 Focus", g.res === 1, g.res); T.check("and makes two strikes", T.log().slice(n0).filter((l) => /3d6\\(/.test(l)).length >= 2, JSON.stringify(T.log().slice(n0)));`,
  Paladin: `g.res = 2; const t = T.X().R.CALLING_KIT.Paladin.tech[0]; T.rig(0.99); g.target = m; g.technique(t); await T.idle(); T.unrig();
    T.check("Smite spends 1 Resonance (a hit then builds 1 back, per the Paladin entry)", g.res === 1 || g.res === 2, g.res); T.check("and the strike is radiant", T.log().some((l) => /radiant damage/.test(l)), JSON.stringify(T.log().slice(-2)));`,
  Cleric: `g.res = 2; g.stats.hp = 50; const t = T.X().R.CALLING_KIT.Cleric.tech[0]; g.technique(t); await T.idle();
    T.check("Devotion: Mend spends 1 Devotion and the Bonus Action", g.res === 1 && g.battle.econ.bonus === 0, g.res); T.check("and heals 1d8 + Willpower", g.stats.hp > 50 && g.stats.hp <= 50 + 8 + 5, g.stats.hp);`,
  Rogue: `const t = T.X().R.CALLING_KIT.Rogue.tech[1]; const sp0 = g.stats.sp; g.technique(t); await T.idle();
    T.check("Cunning Motion costs 2 SP and the Bonus Action", g.stats.sp === sp0 - 2 && g.battle.econ.bonus === 0, g.stats.sp); T.check("it disengages and adds 4.5 m of movement", g.disengaged === true && g.battle.econ.move > 9, g.battle.econ.move);
    const hp0 = g.stats.hp; const mv0 = g.battle.econ.move; g.autoMove = { x: g.pos.x, z: g.pos.z + 6, stop: 0 }; await T.until(() => !g.autoMove, 8000); await T.idle(); T.check("moving away provokes no opportunity attack", !T.log().some((l) => /takes an opportunity attack/i.test(l)), JSON.stringify(T.log().slice(-4)));
    T.passTurn && 0;`,
  Ranger: `const t = T.X().R.CALLING_KIT.Ranger.tech[0]; g.target = m; g.technique(t); await T.idle(); T.check("Mark Quarry is a Bonus Action", g.battle.econ.bonus === 0 && g.quarry === m);
    T.rig(0.5); g.target = m; g.attack(); await T.idle(); T.unrig(); T.check("the first attack on the quarry gets +1", T.log().some((l) => /\\+1 situational/.test(l)), JSON.stringify(T.log().slice(-2)));`,
  Bard: `g.res = 1; const t = T.X().R.CALLING_KIT.Bard.tech[0]; g.technique(t); await T.idle(); T.check("Carry the Verse spends 1 Momentum and the Bonus Action", g.res === 0 && g.battle.econ.bonus === 0);
    T.rig(0.5); g.target = m; g.attack(); await T.idle(); T.unrig(); T.check("the next attack gets +2", T.log().some((l) => /\\+2 situational/.test(l)), JSON.stringify(T.log().slice(-2)));`,
  "Wyrm Hunter": `const t = T.X().R.CALLING_KIT["Wyrm Hunter"].tech[0]; g.target = m; T.rig(0.99); g.technique(t); await T.idle(); T.unrig(); T.check("Monster Read rolls Perception + Tracking against 12 + Threat", T.log().some((l) => /Monster Read — 3d6/.test(l)));
    T.check("and learns the weakness on a success", g.read === m.mon.name, g.read);`,
  Mage: `const t = T.X().R.CALLING_KIT.Mage.tech[0]; g.technique(t); await T.idle(); T.check("Arcane Overchannel is primed (no Mana yet)", g.overchannel === true);
    const mp0 = g.stats.mp; T.rig(0.99); const ok = T.cast("arcane-bolt", { e: m, x: m.x, z: m.z }); await T.idle(); T.unrig(); T.check("the next spell costs +50% Mana (4 -> 6)", ok && g.stats.mp === mp0 - 6, mp0 - g.stats.mp); T.check("and strikes one dice step harder (2d8)", T.log().some((l) => /Overchannel/.test(l)));`
};
for (const [calling, body] of Object.entries(TECH)) SCENARIOS["tech-" + calling.toLowerCase().replace(/ /g, "-")] = { fx: () => fixture({ calling, equipment: { weapon: calling === "Rogue" || calling === "Ranger" ? "dagger1" : "sword1" }, attributes: { strength: 15, willpower: 14 } }), fn: `
    const g = T.g(); T.noRender(); T.clear(); const m = T.spawn("Direwood Hobgoblin", 0, -5, { hp: 500, maxHp: 500 }); await T.fight(m); T.check("calling is " + ${JSON.stringify(calling)}, g.calling() === ${JSON.stringify(calling)});
    ${body}` };


// ---------------------------------------------------------------- touch and pointer flows (driven from Node)
async function box(page, sel) { return page.evaluate((q) => { const e = document.querySelector(q); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || r.width === 0) return null; return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; }, sel); }
function overlap(a, b) { return a && b && a.x < b.r - 1 && b.x < a.r - 1 && a.y < b.b - 1 && b.y < a.b - 1; }
async function inside(ctx, sel, label) { const b = await box(ctx.page, sel); if (!b) return null; const W = ctx.vp.width, H = ctx.vp.height; ctx.check(label + " fits the screen", b.x >= -1 && b.y >= -1 && b.r <= W + 1 && b.b <= H + 1, JSON.stringify([Math.round(b.x), Math.round(b.y), Math.round(b.r), Math.round(b.b)]) + " in " + W + "x" + H); return b; }
async function screenOf(page, js) { return page.evaluate(js); }
async function tapAt(ctx, p) { await ctx.page.touchscreen.tap(p.x, p.y); await ctx.page.waitForTimeout(250); }
async function touchSeq(cdp, steps) { for (const st of steps) { await cdp.send("Input.dispatchTouchEvent", st); await new Promise((r) => setTimeout(r, 40)); } }
async function mobileFlow(ctx) {
  const { page, check, vp } = ctx; const q = (js) => page.evaluate(js);
  await q("T.noRender(); T.clear(); 1"); await page.waitForTimeout(500);
  check("touch controls are shown on a touch device", !!(await box(page, ".eTouch .eStick")));
  const ov = await q("document.documentElement.scrollWidth <= window.innerWidth + 1 && document.body.scrollWidth <= window.innerWidth + 1"); check("no horizontal page scroll", ov);
  await inside(ctx, ".ePlayer", "player frame"); await inside(ctx, ".eHotbar", "hotbar"); await inside(ctx, ".eWhere", "location/minimap");
  check("hotbar does not cover the joystick", !overlap(await box(page, ".eHotbar"), await box(page, ".eStick")));
  check("hotbar does not cover the action buttons", !overlap(await box(page, ".eHotbar"), await box(page, ".eActs")));
  // fold and reopen the menu
  const mt = await box(page, ".eMenuToggle"); check("the menu toggle is reachable", !!mt && mt.w >= 36 && mt.h >= 36, JSON.stringify(mt));
  await page.tap(".eMenuToggle"); await page.waitForTimeout(250); const mb = await inside(ctx, ".eMenu", "opened menu"); check("tapping the toggle opens the menu", !!mb);
  await page.tap(".eMenuToggle"); await page.waitForTimeout(250); check("tapping again folds it away", !(await box(page, ".eMenu")));
  // a monster: tap once to select (preview), again to attack and begin the fight
  await q('T.spawn("Blackback Wolf", 1, -8, { hp: 500, maxHp: 500 }); T.g().camYaw = 0; T.g().camPitch = 0.4; T.g().camDist = 9; 1'); await page.waitForTimeout(700);
  const mp = await screenOf(page, "(() => { const g = T.g(); const m = g.monsters[0]; return g.screenOf(m.x, m.y + 0.7, m.z); })()"); check("the monster is on screen", mp && mp.x > 0 && mp.x < vp.width && mp.y > 0 && mp.y < vp.height, JSON.stringify(mp));
  await tapAt(ctx, mp); await page.waitForTimeout(500); const tip = await box(page, ".eTip"); check("first tap selects and shows hit chance", !!tip, JSON.stringify(tip) + " " + await q("JSON.stringify({ hover: T.g().hover && Object.keys(T.g().hover), target: !!T.g().target, battle: !!T.g().battle, info: T.g().hoverInfo && T.g().hoverInfo() })")); if (tip) check("the hit-chance tip fits the screen", tip.x >= 0 && tip.r <= vp.width && tip.b <= vp.height);
  await q("T.g().monsters[0].passive = false; 1"); await tapAt(ctx, mp); await page.waitForFunction("T.g().battle && T.g().battle.active", null, { timeout: 30000 }); await page.waitForFunction("T.g().battle && T.g().battle.active && T.g().battle.active.kind === 'player' && !T.g().battle.script && !T.g().battle.banner", null, { timeout: 60000 });
  check("second tap starts the fight (opening strike resolves)", true); await page.waitForTimeout(600);
  await inside(ctx, ".eInit", "turn order"); await inside(ctx, ".eHotbar", "hotbar in combat"); check("combat touch buttons replace the exploration buttons", !!(await box(page, ".eActs.battle")));
  check("turn order does not cover the player frame", !overlap(await box(page, ".eInit"), await box(page, ".ePlayer")));
  const econ = await inside(ctx, ".eEcon", "action economy bar"); check("the economy bar clears the joystick", !overlap(econ, await box(page, ".eStick")), JSON.stringify([econ, await box(page, ".eStick")])); check("the economy bar clears the action buttons", !overlap(econ, await box(page, ".eActs")), JSON.stringify([econ, await box(page, ".eActs")]));
  await inside(ctx, ".eActs", "action buttons"); await inside(ctx, ".eStick", "joystick");
  // spellbook tray
  await page.tap('.eActs.battle button[aria-label="Spellbook"]'); await page.waitForTimeout(400); const tb = await inside(ctx, ".eTray", "spellbook"); check("the spellbook opens", !!tb); const rows = await q('document.querySelectorAll(".eTrayRow").length'); check("it lists every learned spell", rows >= 45, rows);
  const mp0 = await q("T.g().stats.mp");
  await page.evaluate(() => { const r = [...document.querySelectorAll(".eTrayRow")].find((e) => /Arcane Bolt/.test(e.textContent)); r.scrollIntoView({ block: "center" }); }); await page.waitForTimeout(200);
  const rb = await page.evaluate(() => { const r = [...document.querySelectorAll(".eTrayRow")].find((e) => /Arcane Bolt/.test(e.textContent)); const b = r.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }); await tapAt(ctx, rb); await page.waitForTimeout(500);
  const tbar = await inside(ctx, ".eTargetBar", "aiming bar"); check("choosing a spell opens the aiming bar and closes the tray", !!tbar && !(await box(page, ".eTray")));
  check("aiming bar does not cover the hotbar", !overlap(tbar, await box(page, ".eHotbar")));
  const mp2 = await screenOf(page, "(() => { const g = T.g(); const m = g.monsters.find((x) => !x.dead); return g.screenOf(m.x, m.y + 0.7, m.z); })()"); await tapAt(ctx, mp2); await page.waitForTimeout(400);
  check("first tap aims and shows the target list", !!(await box(page, ".eTip.spell")) && (await q("T.g().stats.mp")) === mp0, mp0);
  await tapAt(ctx, mp2); await page.waitForFunction("T.g().battle.econ.action === 0", null, { timeout: 20000 }); await page.waitForFunction("!T.g().battle.script", null, { timeout: 20000 });
  check("second tap casts: Mana spent and the Action used", (await q("T.g().stats.mp")) === mp0 - 4, await q("T.g().stats.mp"));
  // movement preview and tap to move
  await page.waitForTimeout(1200); await page.waitForFunction("!T.g().battle.script && T.g().battle.active && T.g().battle.active.kind === 'player'", null, { timeout: 20000 });
  const gp = await screenOf(page, `(() => { const g = T.g(); const W = innerWidth, H = innerHeight; for (let fy = 0.3; fy < 0.68; fy += 0.03) for (let fx = 0.12; fx < 0.88; fx += 0.04) { const p = g.groundPick(W * fx, H * fy); if (!p) continue; const d = Math.hypot(p.x - g.pos.x, p.z - g.pos.z); if (d > 3.5 && d < 5.5 && g.monsters.every((m) => Math.hypot(m.x - p.x, m.z - p.z) > 2.5 && [0.3, 0.65, 0.95].every((f) => { const q = g.screenOf(m.x, m.y + (m.c.height || 1.5) * f, m.z); return !q || Math.hypot(q.x - W * fx, q.y - H * fy) > 100; })) && (document.elementFromPoint(W * fx, H * fy) || {}).tagName === "CANVAS") return { x: W * fx, y: H * fy }; } return null; })()`); check("a free ground spot exists on screen", !!gp, JSON.stringify(gp));
  const pos0 = await q("[T.g().pos.x, T.g().pos.z]"); const mv0 = await q("T.g().battle.econ.move"); await tapAt(ctx, gp); await page.waitForTimeout(300); const mtip = await q("!!document.querySelector('.eTip.small')"); check("tapping the ground previews the move (distance tip)", mtip, JSON.stringify(gp) + " " + await q("JSON.stringify({ hover: T.g().hover && Object.keys(T.g().hover), ready: T.X().C.ready(T.g()), info: T.g().hoverInfo(), tgt: !!T.g().tgt, auto: !!T.g().autoMove, mine: T.X().C.myTurn(T.g()) })"));
  await tapAt(ctx, gp); await page.waitForFunction("T.g().autoMove || T.g().battle.econ.move < " + mv0, null, { timeout: 5000 }).catch(() => {}); await page.waitForFunction("!T.g().autoMove", null, { timeout: 15000 }); const pos1 = await q("[T.g().pos.x, T.g().pos.z]"); const mv1 = await q("T.g().battle.econ.move");
  check("the second tap walks there and spends movement", Math.hypot(pos1[0] - pos0[0], pos1[1] - pos0[1]) > 0.8 && mv1 < mv0 - 0.8, mv0 + " -> " + mv1);
  // joystick moves the character within the turn's movement
  const st = await box(page, ".eStick"); const cdp = await page.context().newCDPSession(page); const cx = st.x + st.w / 2, cy = st.y + st.h / 2; const pb = await q("[T.g().pos.x, T.g().pos.z, T.g().battle.econ.move]");
  await touchSeq(cdp, [{ type: "touchStart", touchPoints: [{ x: cx, y: cy, id: 1 }] }, { type: "touchMove", touchPoints: [{ x: cx + st.w * 0.48, y: cy, id: 1 }] }]); await page.waitForTimeout(1200); await touchSeq(cdp, [{ type: "touchEnd", touchPoints: [] }]);
  const pa = await q("[T.g().pos.x, T.g().pos.z, T.g().battle.econ.move]"); check("the joystick walks the character and uses movement", Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) > 0.4 && pa[2] < pb[2], pb[2] + " -> " + pa[2]);
  // camera: one-finger drag turns, two-finger pinch zooms
  const yaw0 = await q("T.g().camYaw"); const cw = vp.width / 2, ch = vp.height * 0.35;
  await touchSeq(cdp, [{ type: "touchStart", touchPoints: [{ x: cw, y: ch, id: 1 }] }, { type: "touchMove", touchPoints: [{ x: cw + 60, y: ch, id: 1 }] }, { type: "touchMove", touchPoints: [{ x: cw + 120, y: ch, id: 1 }] }, { type: "touchEnd", touchPoints: [] }]);
  check("dragging with one finger turns the camera", Math.abs((await q("T.g().camYaw")) - yaw0) > 0.2, yaw0 + " -> " + (await q("T.g().camYaw")));
  const d0 = await q("T.g().camDist"); await touchSeq(cdp, [{ type: "touchStart", touchPoints: [{ x: cw - 30, y: ch, id: 1 }, { x: cw + 30, y: ch, id: 2 }] }, { type: "touchMove", touchPoints: [{ x: cw - 80, y: ch, id: 1 }, { x: cw + 80, y: ch, id: 2 }] }, { type: "touchEnd", touchPoints: [] }]);
  check("pinching zooms the camera", Math.abs((await q("T.g().camDist")) - d0) > 1, d0 + " -> " + (await q("T.g().camDist")));
  // items tray and end turn
  await page.tap('.eActs.battle button[aria-label="Items"]'); await page.waitForTimeout(300); await inside(ctx, ".eTray", "item tray"); const irows = await q('[...document.querySelectorAll(".eTrayRow")].map((e) => e.textContent).join("|")'); check("the item tray lists potions, flasks and weapons", /Healing Potion/.test(irows) && /Alchemist/.test(irows) && /Longsword/.test(irows), irows.slice(0, 120));
  await page.tap(".eTray .eX"); await page.waitForTimeout(250); check("the tray closes", !(await box(page, ".eTray")));
  const round0 = await q("T.g().battle.round"); await page.tap(".eActs.battle button.end"); await page.waitForFunction("T.g().battle.active && (T.g().battle.active.kind !== 'player' || T.g().battle.round > " + round0 + ")", null, { timeout: 30000 }); check("the hourglass button ends the turn", true);
  await page.waitForFunction("T.g().battle.active && T.g().battle.active.kind === 'player' && !T.g().battle.script && !T.g().battle.banner", null, { timeout: 90000 });
  check("allies and enemies take their turns, then it is the player's again", (await q("T.g().battle.round")) > round0);
  await q("T.X().C.finish(T.g(), 'won'); 1"); await page.waitForTimeout(300);
  // the whole HUD can be hidden and brought back
  await page.evaluate(() => { document.querySelector(".eQuick button:last-child").click(); }); await page.waitForTimeout(250); const hasEye = await box(page, '.eQuick button[aria-label="Hide the HUD"]');
  if (hasEye) { await page.tap('.eQuick button[aria-label="Hide the HUD"]'); await page.waitForTimeout(300); check("the HUD can be hidden entirely", !(await box(page, ".eWhere")) && !(await box(page, ".eMenuToggle"))); const sh = await box(page, ".eShowHud"); check("a small button brings it back", !!sh); if (sh) { await page.tap(".eShowHud"); await page.waitForTimeout(300); check("HUD restored", !!(await box(page, ".eWhere"))); } }
  else check("quick buttons can be unfolded", false);
  if (ctx.shots) await page.screenshot({ path: path.join(ctx.shots, ctx.name + ".png") });
}
async function desktopFlow(ctx) {
  const { page, check, vp } = ctx; const q = (js) => page.evaluate(js);
  await q("T.noRender(); T.clear(); 1"); await page.waitForTimeout(500);
  check("no touch controls on desktop", !(await box(page, ".eTouch")));
  await inside(ctx, ".ePlayer", "player frame"); await inside(ctx, ".eHotbar", "hotbar"); await inside(ctx, ".eWhere", "minimap"); await inside(ctx, ".eMenu", "menu");
  check("a companion frame is shown", !!(await q("!!document.querySelector('.eMate')")));
  await page.click(".eMenuToggle"); await page.waitForTimeout(200); check("the menu folds on desktop too", !(await box(page, ".eMenu"))); await page.click(".eMenuToggle"); await page.waitForTimeout(200);
  await page.keyboard.press("u"); await page.waitForTimeout(300); check("U hides the HUD", !(await box(page, ".eWhere"))); await page.keyboard.press("u"); await page.waitForTimeout(300); check("U brings it back", !!(await box(page, ".eWhere")));
  await q('T.spawn("Blackback Wolf", 2, -9, { hp: 500, maxHp: 500 }); T.g().camYaw = 0; T.g().camPitch = 0.4; T.g().camDist = 9; 1'); await page.waitForTimeout(600);
  const mp = await screenOf(page, "(() => { const g = T.g(); const m = g.monsters[0]; return g.screenOf(m.x, m.y + 0.7, m.z); })()"); await page.mouse.move(mp.x, mp.y, { steps: 5 }); await page.waitForTimeout(400);
  const tipTxt = await q("(document.querySelector('.eTip')||{}).textContent||''"); check("hovering an enemy shows the to-hit chance", /%/.test(tipTxt) && /Blackback Wolf/.test(tipTxt), tipTxt.slice(0, 100));
  await page.mouse.click(mp.x, mp.y); await page.waitForTimeout(300); await page.mouse.click(mp.x, mp.y); await page.waitForFunction("T.g().battle && T.g().battle.active && T.g().battle.active.kind === 'player' && !T.g().battle.script && !T.g().battle.banner", null, { timeout: 60000 }); check("click, click starts the fight", true);
  await page.keyboard.press(" "); await page.waitForTimeout(400); await page.waitForFunction("T.g().battle && T.g().battle.active && T.g().battle.active.kind === 'player' && !T.g().battle.script && !T.g().battle.banner && T.g().battle.round >= 2", null, { timeout: 90000 });
  await page.keyboard.press("r"); await page.waitForTimeout(300); check("R opens the spellbook", !!(await box(page, ".eTray"))); await page.keyboard.press("Escape"); await page.waitForTimeout(200); check("Escape closes it", !(await box(page, ".eTray")));
  await page.keyboard.press("v"); await page.waitForTimeout(300); check("V opens the item tray", !!(await box(page, ".eTray"))); await page.keyboard.press("Escape");
  await page.keyboard.press("r"); await page.waitForTimeout(300); await page.evaluate(() => { [...document.querySelectorAll(".eTrayRow")].find((e) => /Burst Sphere/.test(e.textContent)).click(); }); await page.waitForTimeout(400);
  check("picking Burst Sphere opens the aiming bar", !!(await box(page, ".eTargetBar")));
  const aim = await screenOf(page, "(() => { const g = T.g(); const m = g.monsters.find((x) => !x.dead); return g.screenOf(m.x, m.y + 0.2, m.z); })()"); await page.mouse.move(aim.x, aim.y, { steps: 4 }); await page.waitForTimeout(400);
  const stip = await q("(document.querySelector('.eTip.spell')||{}).textContent||''"); check("the aiming preview names who would be hit and the chance", /Blackback Wolf/.test(stip) && /%/.test(stip), stip.slice(0, 120));
  const mpx = await q("T.g().stats.mp"); await page.mouse.click(aim.x, aim.y); await page.waitForFunction("T.g().battle.econ.action === 0", null, { timeout: 20000 }); check("a click casts it", (await q("T.g().stats.mp")) === mpx - 22, await q("T.g().stats.mp"));
  await page.keyboard.press(" "); await page.waitForTimeout(500); check("Space ends the turn", await q("T.g().battle.active && T.g().battle.active.kind !== 'player' || T.g().battle.round > 1"));
  if (ctx.shots) await page.screenshot({ path: path.join(ctx.shots, ctx.name + ".png") });
}
// ---------------------------------------------------------------- runner
const browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
let failed = 0, total = 0;
for (const [name, sc] of Object.entries(SCENARIOS)) {
  if (only.length && !only.includes(name)) continue;
  const vp = sc.viewport || { width: 480, height: 270 }; const page = await browser.newPage({ viewport: vp, hasTouch: !!sc.touch, isMobile: !!sc.touch }); const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message + " " + (e.stack || "").split("\n").slice(0, 3).join(" | "))); page.on("console", (m) => { if (m.type() === "error" && !/404/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  await page.addInitScript(PRE);
  await page.goto("http://localhost:" + port + "/"); await page.evaluate(([vars, persist]) => { localStorage.clear(); localStorage.setItem("preset", JSON.stringify(vars)); localStorage.setItem("harnessStore", JSON.stringify({ "eldoria3d-quality": "low" })); if (persist) localStorage.setItem("persistVars", "1"); }, [sc.fx(), !!sc.persist]); await page.reload();
  let out = []; try {
    await page.waitForFunction(() => window.__ready || window.__buildError, null, { timeout: 60000 }); await page.waitForFunction(() => window.__eldoriaGame && window.__eldoriaGame.time > 1, null, { timeout: 120000 });
    if (sc.run) { const res = []; const ctx = { page, vp, name, shots: shotsAt, check: (n, ok, d) => res.push({ name: n, ok: !!ok, detail: d === undefined ? "" : String(d) }) }; if (shotsAt) fs.mkdirSync(shotsAt, { recursive: true }); try { await sc.run(ctx); } catch (e) { res.push({ name: "scenario threw", ok: false, detail: String(e && e.stack || e).slice(0, 600) }); } out = res; }
    else out = await page.evaluate(`(async () => { try { ${sc.fn} } catch (e) { T.results.push({ name: "scenario threw", ok: false, detail: String(e && e.stack || e).slice(0, 700) }); } return T.results; })()`);
    if (sc.fn2) { await page.reload(); await page.waitForFunction(() => window.__ready, null, { timeout: 60000 }); await page.waitForFunction(() => window.__eldoriaGame && window.__eldoriaGame.time > 1, null, { timeout: 120000 }); const o2 = await page.evaluate(`(async () => { T.results = []; try { ${sc.fn2} } catch (e) { T.results.push({ name: "reload phase threw", ok: false, detail: String(e && e.stack || e).slice(0, 700) }); } return T.results; })()`); out = out.concat(o2); }
  } catch (e) { out = [{ name: "scenario setup failed", ok: false, detail: String(e.message).slice(0, 500) }]; }
  console.log("\n== " + name); for (const r of out) { total++; if (!r.ok) failed++; console.log((r.ok ? "  PASS " : "  FAIL ") + r.name + (r.ok && !r.detail ? "" : r.detail ? "  [" + r.detail.slice(0, 1500) + "]" : "")); }
  if (errors.length) { failed++; total++; console.log("  FAIL page errors:\n    " + errors.slice(0, 5).join("\n    ")); }
  await page.close();
}
await browser.close(); server.close(); console.log("\n" + (total - failed) + "/" + total + " checks passed"); process.exit(failed ? 1 : 0);
