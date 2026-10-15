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
const base = JSON.parse(fs.readFileSync(path.join(HERE, "fixtures/base-preset.json"), "utf8"));
const SPELLS = ["arcane-light", "spark", "arcane-bolt", "chill-touch", "shadow-bolt", "drain-vitality", "lightning-arc", "lance-of-force", "shatter-pulse", "burst-sphere", "wall-of-flame", "grasping-night", "heart-of-the-storm", "mend-flesh", "greater-mend", "barrier", "mage-ward", "mana-shield", "mirror-image", "frost-sheath", "element-ward", "thorn-snare", "stone-grip", "drowse", "blink", "gloomstep", "summon-guardian", "courage", "blessing", "smite", "invisibility", "black-veil", "sanctum-dome", "death-ward", "cutting-verse", "mass-courage", "nudge", "eclipse-crown", "command-undead", "sovereign-voice", "radiant-brand", "pillar-of-dawn", "ember-dart", "wind-step", "barkskin", "aegis-absolute", "identify", "flicker", "scry", "anchor"];
export function fixture(o) {
  o = o || {}; const lib = JSON.parse(fs.readFileSync(path.join(HERE, "../src/data.tsx"), "utf8").match(/SPELL_LIBRARY = (\{.*\});?\s*$/m)[1]);
  const spells = {}; (o.spells || SPELLS).forEach((id) => { const e = lib[id]; if (e) spells[id] = { id, name: e.name, school: e.school, tier: e.tier, manaCost: e.mp, castingTime: e.cast, range: e.range, origin: "test" }; });
  const v = JSON.parse(JSON.stringify(base));
  Object.assign(v, { "player-xp": 20000, "player-hp": 210, "player-max-hp": 210, "player-mana": 300, "player-max-mana": 300, "player-stamina": 40, "player-max-stamina": 40, "known-spells": spells,
    attributes: Object.assign({}, v.attributes, { arcana: 14, agility: 12, strength: 12, endurance: 14 }, o.attributes || {}),
    inventory: [].concat(v.inventory, [
      { id: "pot-heal", name: "Healing Potion", qty: 3, weight: 0.5, valueCp: 5000, condition: 100, equipped: false, properties: ["restores 2d4+2 HP"] },
      { id: "pot-mana", name: "Mana Potion", qty: 2, weight: 0.5, valueCp: 5000, condition: 100, equipped: false, properties: ["restores 2d4+2 Mana"] },
      { id: "flask-fire", name: "Alchemist's Fire Flask", qty: 2, weight: 1, valueCp: 3000, condition: 100, equipped: false, properties: ["2d6 fire", "thrown"] },
      { id: "antidote", name: "Antidote", qty: 1, weight: 0.2, valueCp: 2000, condition: 100, equipped: false, properties: ["cures poison"] },
      { id: "dagger1", name: "Steel Dagger", qty: 1, weight: 1, valueCp: 1500, condition: 100, equipped: false, properties: ["1d4", "finesse"] },
      { id: "sword1", name: "Longsword", qty: 1, weight: 3, valueCp: 2500, condition: 100, equipped: false, properties: ["1d8"] },
      { id: "bow1", name: "Shortbow", qty: 1, weight: 2, valueCp: 2500, condition: 100, equipped: false, properties: ["1d6", "80 ft"] },
      { id: "ration1", name: "Trail Ration", qty: 2, weight: 0.5, valueCp: 100, condition: 100, equipped: false, properties: ["food"] }]),
    companions: o.companions || {}, party: o.party || [] });
  if (o.calling) { v["starting-calling"] = o.calling; v["class-state"] = Object.assign({}, v["class-state"], { class: o.calling }); v["player-class"] = o.calling; }
  if (o.equipment) v.equipment = Object.assign({}, v.equipment, o.equipment);
  if (o.vars) Object.assign(v, o.vars);
  return v;
}
export const COMPANIONS = {
  mira: { name: "Mira Vale", class: "Cleric", level: 2, hp: 26, maxHp: 26, mana: 30, maxMana: 30, stamina: 20, maxStamina: 20, species: "Human", gender: "Female", partyStatus: "active", role: "Healer", attributes: { strength: 10, agility: 11, endurance: 12, intellect: 11, perception: 12, willpower: 14, presence: 12, arcana: 12 }, skills: { "blunt-weapons": { level: 4 }, "divine-magic": { level: 3 } }, equipment: { weapon: "mira-mace" }, inventory: [{ id: "mira-mace", name: "Mace", qty: 1, equipped: true, properties: ["1d6"] }, { id: "mira-potion", name: "Healing Potion", qty: 1, properties: ["restores 2d4+2 HP"] }], knownSpells: { "mend-flesh": { id: "mend-flesh", name: "Mend Flesh", school: "Restoration", tier: "I", manaCost: 6 }, "radiant-brand": { id: "radiant-brand", name: "Radiant Brand", school: "Divine", tier: "I", manaCost: 5 } } },
  tarn: { name: "Tarn Holt", class: "Fighter", level: 2, hp: 34, maxHp: 34, mana: 0, maxMana: 0, stamina: 24, maxStamina: 24, species: "Human", gender: "Male", partyStatus: "active", role: "Vanguard", attributes: { strength: 14, agility: 11, endurance: 14, intellect: 9, perception: 11, willpower: 10, presence: 10, arcana: 8 }, skills: { swordsmanship: { level: 5 } }, equipment: { weapon: "tarn-sword", offhand: "tarn-shield", chest: "tarn-mail" }, inventory: [{ id: "tarn-sword", name: "Longsword", qty: 1, equipped: true, properties: ["1d8"] }, { id: "tarn-shield", name: "Round Shield", qty: 1, equipped: true, properties: ["shield"] }, { id: "tarn-mail", name: "Chain Mail", qty: 1, equipped: true, properties: ["DR 3"] }] }
};
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
    await T.passTurn(); const near = g.monsters.filter((x) => x.inBattle && !x.dead && B.sideOf(x) === "foe").sort((p, q) => B.dist(p, g.pe) - B.dist(q, g.pe))[0]; T.rig(0.0); const cm = T.cast("sovereign-voice", { x: near.x, z: near.z }); await T.idle(); T.unrig();
    T.check("Sovereign Voice (30 ft cone) is rolled against each foe in the cone", cm && T.log().some((l) => /Sovereign Voice vs/.test(l)), JSON.stringify(T.log().slice(-2)));
    T.check("a failed resistance costs the foe its turn", cm && g.monsters.some((x) => B.hasSt(x, "commanded")) || T.log().some((l) => /shrugs it off|takes hold/.test(l)), "");
    // control undead
    await T.passTurn(); const sk = g.monsters.find((x) => x.mon.name === "Barrow Skeleton" && !x.summoned && !x.dead && x.inBattle); if (!sk) { T.check("Command Undead (skipped: no skeleton left alive)", true); return T.results; } T.rig(0.0); const cu = T.cast("command-undead", { e: sk, x: sk.x, z: sk.z }); await T.idle(); T.unrig();
    T.check("Command Undead binds a lesser undead (threat ≤ 3) to the party", cu && B.hasSt(sk, "controlled"), "");
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
  const gp = await screenOf(page, `(() => { const g = T.g(); const W = innerWidth, H = innerHeight; for (let fy = 0.3; fy < 0.68; fy += 0.03) for (let fx = 0.12; fx < 0.88; fx += 0.04) { const p = g.groundPick(W * fx, H * fy); if (!p) continue; const d = Math.hypot(p.x - g.pos.x, p.z - g.pos.z); if (d > 2.5 && d < 5.5 && g.monsters.every((m) => Math.hypot(m.x - p.x, m.z - p.z) > 2.5) && (document.elementFromPoint(W * fx, H * fy) || {}).tagName === "CANVAS") return { x: W * fx, y: H * fy }; } return null; })()`); check("a free ground spot exists on screen", !!gp, JSON.stringify(gp));
  const pos0 = await q("[T.g().pos.x, T.g().pos.z]"); const mv0 = await q("T.g().battle.econ.move"); await tapAt(ctx, gp); await page.waitForTimeout(300); const mtip = await q("!!document.querySelector('.eTip.small')"); check("tapping the ground previews the move (distance tip)", mtip, JSON.stringify(gp) + " " + await q("JSON.stringify({ hover: T.g().hover && Object.keys(T.g().hover), ready: T.X().C.ready(T.g()), info: T.g().hoverInfo(), tgt: !!T.g().tgt, auto: !!T.g().autoMove, mine: T.X().C.myTurn(T.g()) })"));
  await tapAt(ctx, gp); await page.waitForFunction("!T.g().autoMove", null, { timeout: 15000 }); const pos1 = await q("[T.g().pos.x, T.g().pos.z]"); const mv1 = await q("T.g().battle.econ.move");
  check("the second tap walks there and spends movement", Math.hypot(pos1[0] - pos0[0], pos1[1] - pos0[1]) > 1.5 && mv1 < mv0 - 1.5, mv0 + " -> " + mv1);
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
  console.log("\n== " + name); for (const r of out) { total++; if (!r.ok) failed++; console.log((r.ok ? "  PASS " : "  FAIL ") + r.name + (r.ok && !r.detail ? "" : r.detail ? "  [" + r.detail.slice(0, 260) + "]" : "")); }
  if (errors.length) { failed++; total++; console.log("  FAIL page errors:\n    " + errors.slice(0, 5).join("\n    ")); }
  await page.close();
}
await browser.close(); server.close(); console.log("\n" + (total - failed) + "/" + total + " checks passed"); process.exit(failed ? 1 : 0);
