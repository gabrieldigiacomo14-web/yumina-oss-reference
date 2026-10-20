// @ts-nocheck
// What the things in a pack actually do. Everything is read from the item's own name and
// properties (the same strings the inventory screen shows); nothing is invented beyond the
// defaults the earlier hotbar already used for an unspecified potion (2d4+2).
import * as R from "./rules";

function arr(v) { return Array.isArray(v) ? v : []; }
function hay(it) { return (String(it.name || "") + " " + arr(it.properties).join(" ")).toLowerCase(); }
var WEAPON_WORDS = /sword|blade|sabre|saber|scimitar|rapier|cutlass|dagger|knife|stiletto|axe|spear|pike|lance|glaive|halberd|hammer|maul|mace|club|flail|staff|quarterstaff|bow|crossbow|sling|wand/;
var ARMOR_WORDS = /armor|armour|mail|plate|cuirass|helm|gauntlet|greave|boots|jerkin|gambeson|shield|buckler|cloak|robe|vest|bracers/;
function dice(h, fallback) { var m = h.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/); return m ? [Number(m[1]), Number(m[2]), Number(m[3] || 0)] : fallback; }

// kind: heal | mana | stamina | food | cure | throw | weapon | armor | tool | other
export function classify(it) {
  if (!it) return { kind: "other" }; var h = hay(it); var n = String(it.name || "").toLowerCase();
  if (/flask|bomb|grenade|alchemist|fire pot|oil of|acid vial|vial of acid/.test(n) && dice(h, null) && !/healing|mana/.test(n)) {
    var el = /fire|oil|flame|ember/.test(h) ? "fire" : /acid/.test(h) ? "acid" : /frost|cold|ice/.test(h) ? "cold" : /lightning|storm/.test(h) ? "lightning" : "";
    return { kind: "throw", dice: dice(h, [1, 6, 0]), element: el, range: 12, label: "Throw" };
  }
  if (/mana/.test(n) && /potion|elixir|draught|tonic|vial/.test(n)) return { kind: "mana", dice: dice(h, [2, 4, 2]), label: "Drink" };
  if (/stamina|vigor|vigour|energy/.test(n) && /potion|elixir|draught|tonic|vial/.test(n)) return { kind: "stamina", dice: dice(h, [2, 4, 2]), label: "Drink" };
  if (/antidote|antitoxin|antivenom/.test(n)) return { kind: "cure", cures: /poison|venom|toxin/, label: "Drink" };
  if (/potion|elixir|draught|tonic|salve|bandage|poultice|healing/.test(n)) return { kind: "heal", dice: dice(h, [2, 4, 2]), label: /salve|bandage|poultice/.test(n) ? "Apply" : "Drink", cures: /bandage|poultice|salve/.test(n) ? /bleed/ : null };
  if (/ration|bread|jerky|herb|trail food|meal|waterskin|cheese|fruit/.test(n) && !/pack/.test(n)) return { kind: "food", label: "Eat" };
  if (WEAPON_WORDS.test(n) && dice(h, null) && !ARMOR_WORDS.test(n)) return { kind: "weapon", label: "Equip" };
  if (ARMOR_WORDS.test(n)) return { kind: "armor", label: "Wear" };
  if (/rope|torch|lantern|tool|kit|pick|hammer|flint/.test(n)) return { kind: "tool" };
  return { kind: "other" };
}
export function combatItems(inv, eq) {
  var out = []; arr(inv).forEach(function (it) {
    if (!it || !(Number(it.qty) > 0)) return; var c = classify(it); if (c.kind === "other" || c.kind === "tool" || c.kind === "armor") return;
    var equipped = c.kind === "weapon" && eq && eq.weapon === it.id; out.push(Object.assign({ it: it, id: it.id, name: it.name, qty: it.qty, equipped: equipped }, c));
  });
  var order = { heal: 0, mana: 1, stamina: 2, cure: 3, food: 4, throw: 5, weapon: 6 }; out.sort(function (a, b) { return (order[a.kind] - order[b.kind]) || String(a.name).localeCompare(String(b.name)); }); return out;
}
// What an item does and costs, for the tray text.
export function describe(c) {
  var d = c.dice ? c.dice[0] + "d" + c.dice[1] + (c.dice[2] ? "+" + c.dice[2] : "") : "";
  if (c.kind === "heal") return "Restores " + d + " HP" + (c.cures ? " and stops bleeding" : "");
  if (c.kind === "mana") return "Restores " + d + " Mana";
  if (c.kind === "stamina") return "Restores " + d + " Stamina";
  if (c.kind === "food") return "Restores 5 Stamina";
  if (c.kind === "cure") return "Removes poison";
  if (c.kind === "throw") return "Thrown, 12 m: " + d + (c.element ? " " + c.element : "") + ", ignores armor";
  if (c.kind === "weapon") return c.equipped ? "In hand" : "Draw it";
  return "";
}
export function costOf(c) { return c.kind === "weapon" || c.kind === "throw" ? (c.kind === "throw" ? "action" : "bonus") : "bonus"; }
// A thrown flask: 3d6 + Agility mod + skill vs Evasion, damage ignores physical armour (alchemical).
export function throwAttack(v, c, mon, opts) {
  opts = opts || {}; var a = v.attributes || {}; var sb = R.skillBonus(R.skillLevel(v, "throwing") || R.skillLevel(v, "alchemy")); var am = R.attrMod(a.agility);
  var r = R.roll3d6(); var total = r.total + am + sb + (opts.bonus || 0); var ev = mon.evasion + (opts.evBonus || 0);
  var line = "(" + (opts.name || "Flask") + " — 3d6(" + r.dice.join(",") + ")=" + r.total + (am ? (am > 0 ? " +" : " −") + Math.abs(am) + " AGI" : "") + (sb ? " +" + sb + " skill" : "") + " = " + total + " vs Evasion " + ev;
  if (total < ev) return { hit: false, line: line + " — miss)", damage: 0 };
  var dm = R.rollDice(c.dice[0], c.dice[1]); var raw = dm.total + c.dice[2]; var weak = String(mon.weakness || "").toLowerCase(); var wb = c.element && weak.indexOf(c.element) >= 0 ? 2 : 0; raw += wb;
  return { hit: true, damage: raw, element: c.element, line: line + " — hit. " + raw + " " + (c.element || "alchemical") + " damage" + (wb ? " (weakness)" : "") + ", ignores armor)", crit: r.total === 18 && total - ev >= 5 };
}
export function twoHanded(it) { return ['greatsword', 'greataxe', 'warhammer', 'halberd', 'longbow', 'great axe', 'war hammer', 'two-handed'].some(function (k) { return hay(it).indexOf(k) >= 0; }); /* same list the inventory screen uses */ }
