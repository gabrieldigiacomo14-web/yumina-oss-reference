// Unit tests for the pure rule code: Eldoria's 3d6 resolution, the spell table and item parsing.
//   node tools/unit.mjs
import { build } from "../../../node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild/lib/main.js";
import fs from "fs"; import os from "os"; import path from "path"; import { pathToFileURL } from "url";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "eldoria-unit-"));
const entry = path.join(tmp, "entry.tsx");
fs.writeFileSync(entry, `export * as R from ${JSON.stringify(path.resolve("src/rules.tsx"))}; export * as S from ${JSON.stringify(path.resolve("src/spells.tsx"))}; export * as I from ${JSON.stringify(path.resolve("src/items.tsx"))}; export { SPELL_LIBRARY, BESTIARY } from ${JSON.stringify(path.resolve("src/data.tsx"))};`);
await build({ entryPoints: [entry], bundle: true, outfile: path.join(tmp, "out.mjs"), format: "esm", loader: { ".tsx": "tsx" }, logLevel: "silent" });
const { R, S, I, SPELL_LIBRARY, BESTIARY } = await import(pathToFileURL(path.join(tmp, "out.mjs")).href);
let pass = 0, fail = 0; const t = (name, ok, d) => { if (ok) pass++; else { fail++; console.log("FAIL " + name + (d !== undefined ? "  [" + d + "]" : "")); } };
const approx = (a, b, e) => Math.abs(a - b) <= e;
function withRandom(seq, fn) { const o = Math.random; let i = 0; Math.random = () => seq[i++ % seq.length]; try { return fn(); } finally { Math.random = o; } }

// --- 3d6 distribution
t("P(3d6 >= 3) = 1", R.chance3d6(3) === 1); t("P(3d6 >= 10) = 62.5%", approx(R.chance3d6(10), 135 / 216, 1e-9), R.chance3d6(10)); t("P(3d6 >= 18) = 1/216", approx(R.chance3d6(18), 1 / 216, 1e-9)); t("P(3d6 >= 19) = 0", R.chance3d6(19) === 0);
let n = 0, hits = 0; for (let i = 0; i < 40000; i++) { const r = R.roll3d6(); n++; if (r.total >= 12) hits++; } t("rolled 3d6 matches chance3d6(12) within 2%", approx(hits / n, R.chance3d6(12), 0.02), (hits / n).toFixed(3) + " vs " + R.chance3d6(12).toFixed(3));
// --- attributes, skills, levels
t("attribute modifier floor((a-10)/2)", R.attrMod(10) === 0 && R.attrMod(15) === 2 && R.attrMod(8) === -1 && R.attrMod(9) === -1);
const sb = { 0: 0, 1: 1, 5: 1, 6: 2, 10: 2, 11: 3, 15: 3, 16: 4, 20: 4, 21: 5, 25: 5, 26: 6, 35: 6, 36: 7, 50: 7, 51: 8, 70: 8, 71: 9, 99: 9, 100: 10, 250: 10 };
for (const [l, b] of Object.entries(sb)) t("skill mastery Lv " + l + " = +" + b, R.skillBonus(Number(l)) === b, R.skillBonus(Number(l)));
t("never adds character level to a roll (level 100 caps at +10)", R.skillBonus(100) === 10 && R.skillBonus(1000) === 10);
t("level from XP: 0 -> 1, 20000 -> 20", R.levelFromXp(0) === 1 && R.levelFromXp(20000) === 20, R.levelFromXp(20000));
// --- player attack: natural 18 with margin >= 5 is a critical (+50% rolled damage)
const sheet = { attributes: { strength: 14, agility: 12 }, skills: { swordsmanship: { level: 5 } }, inventory: [{ id: "s", name: "Longsword", qty: 1, properties: ["1d8"] }], equipment: { weapon: "s" } };
const mon = { name: "Dummy", evasion: 8, dr: 2, weakness: "", threat: 1, hp: 20, attacks: [{ name: "claw", n: 1, d: 6, b: 0 }] };
const crit = withRandom([0.99, 0.99, 0.99, 0.0], () => R.playerAttack(sheet, mon, {})); t("natural 18 and margin >= 5 is a critical", crit.hit && crit.crit && crit.natural === 18, JSON.stringify([crit.hit, crit.crit, crit.natural]));
const noCrit = withRandom([0.99, 0.99, 0.99, 0.0], () => R.playerAttack(sheet, Object.assign({}, mon, { evasion: 17 }), {})); t("natural 18 with margin < 5 is not a critical", noCrit.hit && !noCrit.crit, JSON.stringify([noCrit.hit, noCrit.crit, noCrit.margin]));
const miss = withRandom([0, 0, 0], () => R.playerAttack(sheet, mon, {})); t("3d6 of 3 misses a Evasion 8 target even with +4", !miss.hit && miss.damage === 0);
const dmg = withRandom([0.5, 0.5, 0.5, 0.99], () => R.playerAttack(sheet, mon, {})); t("damage = weapon dice + STR contribution − DR (1d8=8, +2 STR, −2 DR = 8)", dmg.hit && dmg.damage === 8, dmg.damage);
// --- monsters: accuracy 3d6 + 2×Threat vs Evasion; DR applies to physical, not elemental
const pc = { attributes: { agility: 10 }, skills: {}, inventory: [{ id: "a", name: "Chain Mail", qty: 1, properties: ["DR 3"] }], equipment: { chest: "a" } };
const wolf = BESTIARY.find((m) => m.name === "Blackback Wolf"); const hitW = withRandom([0.99, 0.99, 0.99, 0.5], () => R.monsterAttack(wolf, pc, { attack: wolf.attacks[0] })); t("monster attack total = 3d6 + 2*Threat", hitW.total === 18 + 2, hitW.total);
t("physical damage is reduced by DR 3", hitW.hit && hitW.damage === Math.max(0, hitW.raw - 3), JSON.stringify([hitW.raw, hitW.damage]));
const wyrm = BESTIARY.find((m) => m.name === "White Wyrm"); const br = withRandom([0.99, 0.99, 0.99, 0.5, 0.5], () => R.monsterAttack(wyrm, pc, { attack: wyrm.attacks.find((a) => /breath/.test(a.name)) })); t("frost breath ignores armour DR", br.magical && br.damage === br.raw, JSON.stringify([br.raw, br.damage]));
let h = 0, N = 30000; for (let i = 0; i < N; i++) if (R.monsterAttack(wolf, { attributes: { agility: 10 }, skills: {}, inventory: [], equipment: {} }, {}).hit) h++; t("wolf hit rate vs Evasion 10 matches 3d6+2 >= 10", approx(h / N, R.chance3d6(8), 0.02), (h / N).toFixed(3) + " vs " + R.chance3d6(8).toFixed(3));
// --- block (Combat Numerics): 3d6 + block skill vs the attack total
const shielded = { attributes: { strength: 14 }, skills: { "shield-use": { level: 6 } }, inventory: [{ id: "sh", name: "Round Shield", qty: 1, properties: ["shield"] }], equipment: { offhand: "sh" } }; const bl = withRandom([0.99, 0.99, 0.99], () => R.blockRoll(shielded, 16, true)); t("block succeeds when 3d6 + skill + STR beats the attack total", bl && bl.ok && bl.total === 18 + 2 + 2, JSON.stringify(bl));
t("no block without a shield or melee weapon", R.blockRoll({ attributes: {}, skills: {}, inventory: [], equipment: {} }, 10, true) === null);
// --- spells: every FX id exists in the library; ranges convert at 1 ft = 0.3048 m; casting times map to turn parts
t("the spell library has 128 spells", Object.keys(SPELL_LIBRARY).length === 128, Object.keys(SPELL_LIBRARY).length);
for (const id of Object.keys(S.FX)) t("FX entry exists in the library: " + id, !!SPELL_LIBRARY[id]);
const rg = S.parseRange("90 ft, 15-ft radius"); t("range 90 ft = 27.4 m, radius 15 ft = 4.6 m", approx(rg.ft, 27.43, 0.05) && approx(rg.radius, 4.57, 0.05), JSON.stringify(rg));
t("20-ft cone = 6.1 m", approx(S.parseRange("20-ft cone").cone, 6.1, 0.05)); t("Self 30-ft aura = 9.1 m", approx(S.parseRange("Self 30-ft aura").aura, 9.14, 0.05)); t("Touch is touch", S.parseRange("Touch").touch);
t("1 action costs the Action", JSON.stringify(S.castCost({ cast: "1 action" })) === '{"action":1}'); t("2 actions use Action + Bonus", JSON.stringify(S.castCost({ cast: "2 actions" })) === '{"action":1,"bonus":1}'); t("3 actions take the whole turn", S.castCost({ cast: "3 actions" }).move === 1); t("Reaction is a Reaction", S.castCost({ cast: "Reaction" }).reaction === 1);
t("rituals and minute-long casts cannot be done in combat", S.castCost({ cast: "Ritual 10 min" }) === null && S.castCost({ cast: "1 min" }) === null && S.castCost({ cast: "10 min" }) === null);
// every damaging library spell with dice is something the client can resolve
const unresolved = Object.values(SPELL_LIBRARY).filter((sp) => sp.dice && S.castCost(sp) && !S.FX[sp.id] ).map((sp) => sp.id); t("every combat-castable spell with dice has a resolver", unresolved.length === 0, unresolved.join());
const kinds = {}; for (const sp of Object.values(SPELL_LIBRARY)) { const d = S.describeSpell(sp); kinds[d.kind] = (kinds[d.kind] || 0) + 1; } t("spell kinds cover attacks, areas, heals, buffs and hexes", ["bolt", "burst", "cone", "line", "heal", "buff", "debuff", "wall", "field", "aura", "teleport", "summon", "util"].every((k) => kinds[k] > 0), JSON.stringify(kinds));
const spark = S.describeSpell(SPELL_LIBRARY["spark"]); t("Spark: bolt, 9.1 m, Action", spark.kind === "bolt" && approx(spark.maxR, 9.14, 0.05) && spark.label === "Action", JSON.stringify([spark.kind, spark.maxR, spark.label]));
const meteor = S.describeSpell(SPELL_LIBRARY["meteor-brand"]); t("Meteor Brand: 150 ft, 20 ft radius, whole turn", approx(meteor.maxR, 45.7, 0.1) && approx(meteor.area, 6.1, 0.1) && meteor.label === "Whole turn", JSON.stringify([meteor.maxR, meteor.area, meteor.label]));
t("Mend Flesh is a touch heal (1.9 m reach)", S.describeSpell(SPELL_LIBRARY["mend-flesh"]).kind === "heal" && S.describeSpell(SPELL_LIBRARY["mend-flesh"]).maxR === 1.9);
// --- items
const ci = (name, props) => I.classify({ id: "x", name, qty: 1, properties: props || [] });
t("healing potion with dice property", ci("Healing Potion", ["restores 3d4+1 HP"]).kind === "heal" && ci("Healing Potion", ["restores 3d4+1 HP"]).dice.join() === "3,4,1");
t("an unspecified healing potion defaults to 2d4+2 (the earlier hotbar rule)", ci("Healing Potion").dice.join() === "2,4,2");
t("mana potion", ci("Mana Potion").kind === "mana"); t("stamina draught", ci("Stamina Draught").kind === "stamina"); t("antidote cures poison", ci("Antidote").kind === "cure");
t("a ration is food", ci("Trail Ration").kind === "food"); t("the adventurer's pack is not food", ci("Adventurer Pack", ["2 rations"]).kind !== "food");
const fl = ci("Alchemist's Fire Flask", ["2d6 fire", "thrown"]); t("fire flask is a thrown fire weapon", fl.kind === "throw" && fl.element === "fire" && fl.dice.join() === "2,6,0", JSON.stringify(fl));
t("a sword is a weapon", ci("Longsword", ["1d8"]).kind === "weapon"); t("a shield is not a weapon", ci("Round Shield", ["shield"]).kind === "armor");
console.log("\n" + pass + "/" + (pass + fail) + " unit checks passed"); process.exit(fail ? 1 : 0);
