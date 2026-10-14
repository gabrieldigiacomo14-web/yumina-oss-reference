// @ts-nocheck
// Deterministic rules shared by real-time combat and the sheets. Every number here
// comes from the lorebook entries "Core Resolution Engine", "Combat Numerics &
// Damage", "Attributes, Levels & Guild Rank" and the Bestiary. Nothing scales to
// the player.
import { SPELL_LIBRARY, BESTIARY } from "./data";

export function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
export function d(n) { return 1 + Math.floor(Math.random() * n); }
export function roll3d6() { var a = d(6), b = d(6), c = d(6); return { dice: [a, b, c], total: a + b + c }; }
export function rollDice(n, sides) { var s = 0, arr = []; for (var i = 0; i < n; i++) { var r = d(sides); arr.push(r); s += r; } return { dice: arr, total: s }; }
export function attrMod(v) { return Math.floor(((Number(v) || 10) - 10) / 2); }
// Bounded, diminishing skill mastery table.
export function skillBonus(level) { var l = Number(level) || 0; if (l <= 0) return 0; if (l <= 5) return 1; if (l <= 10) return 2; if (l <= 15) return 3; if (l <= 20) return 4; if (l <= 25) return 5; if (l <= 35) return 6; if (l <= 50) return 7; if (l <= 70) return 8; if (l <= 99) return 9; return 10; }
export function xpForLevel(level) { return 50 * level * (level - 1); }
export function levelFromXp(xp) { return Math.max(1, Math.floor((1 + Math.sqrt(1 + 0.08 * Math.max(0, xp))) / 2 + 1e-9)); }
export function skillNeed(level) { return 30 + 15 * level + 3 * level * level; }
export function degree(margin) { return margin >= 10 ? "Exceptional Success" : margin >= 5 ? "Strong Success" : margin >= 0 ? "Success" : margin >= -4 ? "Partial" : margin >= -9 ? "Failure" : "Severe Failure"; }
export function money(cp) { cp = Math.max(0, Math.floor(Number(cp) || 0)); var gp = Math.floor(cp / 10000); cp %= 10000; var sp = Math.floor(cp / 100); var c = cp % 100; return { gp: gp, sp: sp, cp: c, text: gp + " gp " + sp + " sp " + c + " cp" }; }
export function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function arr(v) { return Array.isArray(v) ? v : []; }
function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }

// ------------------------------------------------------------------ equipment
export function findItem(inv, id) { return arr(inv).find(function (x) { return x && (x.id === id || x.name === id); }) || null; }
var WEAPON_SKILL = [[/bow|longbow|shortbow/, "archery"], [/crossbow/, "crossbows"], [/dagger|knife|stiletto/, "dagger-fighting"], [/sword|blade|sabre|saber|scimitar|rapier|cutlass/, "swordsmanship"], [/axe/, "axe-fighting"], [/spear|pike|lance|glaive|halberd/, "spear-fighting"], [/hammer|maul|mace|club|flail/, "blunt-weapons"], [/staff|quarterstaff/, "staff-fighting"]];
export function weaponProfile(v) {
  var inv = arr(v.inventory), eq = obj(v.equipment); var it = eq.weapon ? findItem(inv, eq.weapon) : null;
  var name = it ? String(it.name || "") : "Unarmed"; var props = it ? arr(it.properties).map(String) : []; var hay = (name + " " + props.join(" ")).toLowerCase();
  var dm = hay.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/); var dice = dm ? [Number(dm[1]), Number(dm[2]), Number(dm[3] || 0)] : it ? [1, 6, 0] : [1, 3, 0];
  var skill = "unarmed-combat"; for (var i = 0; i < WEAPON_SKILL.length; i++) if (WEAPON_SKILL[i][0].test(hay)) { skill = WEAPON_SKILL[i][1]; break; }
  if (!it) skill = "unarmed-combat";
  var ranged = /bow|crossbow|sling|80 ft|ranged/.test(hay) && !/elbow/.test(hay);
  var finesse = /finesse|dagger|rapier/.test(hay) || skill === "dagger-fighting";
  var heavy = /two-handed|greatsword|greataxe|maul|warhammer|halberd|heavy/.test(hay);
  var blunt = skill === "blunt-weapons" || /staff|club|mace|hammer/.test(hay);
  var kind = ranged ? "bow" : /staff/.test(hay) ? "staff" : skill === "dagger-fighting" ? "dagger" : skill === "axe-fighting" ? "axe" : skill === "spear-fighting" ? "spear" : blunt ? (/hammer|maul/.test(hay) ? "hammer" : "mace") : skill === "swordsmanship" ? "sword" : "none";
  var accuracy = /masterwork|fine/.test(hay) ? 1 : 0;
  return { item: it, name: name, dice: dice, skill: skill, ranged: ranged, finesse: finesse, heavy: heavy, blunt: blunt, kind: kind, accuracy: accuracy, range: ranged ? 34 : kind === "spear" ? 3.6 : 2.7, cooldown: heavy ? 2.0 : finesse ? 1.15 : ranged ? 1.6 : 1.45 };
}
// Armor: explicit "DR n" in properties wins; otherwise type defaults.
export function armorDR(v) {
  var inv = arr(v.inventory), eq = obj(v.equipment), dr = 0, type = "cloth";
  ["chest", "head", "hands", "legs", "feet", "offhand"].forEach(function (slot) {
    var it = eq[slot] ? findItem(inv, eq[slot]) : null; if (!it) return; var hay = (String(it.name || "") + " " + arr(it.properties).join(" ")).toLowerCase();
    var m = hay.match(/\bdr\s*(\d+)/); if (m) { dr += Number(m[1]); }
    else if (slot === "chest") { if (/plate/.test(hay)) { dr += 5; type = "plate"; } else if (/mail|chain|scale|brigandine/.test(hay)) { dr += 3; type = "mail"; } else if (/studded|hide|padded|gambeson/.test(hay)) dr += 2; else if (/leather|jerkin/.test(hay)) dr += 1; }
    else if (/helm|gauntlet|greave|sabaton|boots of|vambrace/.test(hay)) dr += 0.5;
    if (slot === "chest" && /plate/.test(hay)) type = "plate"; else if (slot === "chest" && /mail|chain/.test(hay)) type = "mail";
  });
  return { dr: Math.floor(dr), type: type };
}
export function hasShield(v) { var eq = obj(v.equipment), inv = arr(v.inventory); var it = eq.offhand ? findItem(inv, eq.offhand) : null; return !!(it && /shield|buckler/i.test(String(it.name))); }
export function skillLevel(v, id) { var s = obj(v.skills)[id]; return s ? Number(s.level) || 1 : 0; }
export function evasion(v) { var a = obj(v.attributes); var acro = skillLevel(v, "acrobatics"); return 10 + attrMod(a.agility) + Math.floor(skillBonus(acro) / 2); }

// ------------------------------------------------------------------ attacks
// Returns a full, displayable resolution in the format the Response Format entry uses.
export function playerAttack(v, mon, opts) {
  opts = opts || {}; var a = obj(v.attributes); var w = weaponProfile(v);
  var attr = w.ranged || w.finesse ? "agility" : "strength"; var am = attrMod(a[attr]); var sb = skillBonus(skillLevel(v, w.skill));
  var bonus = am + sb + w.accuracy + (opts.bonus || 0) + (opts.condPenalty || 0);
  var r = roll3d6(); var total = r.total + bonus; var ev = mon.evasion + (opts.targetBonus || 0); var margin = total - ev;
  var label = (w.item ? w.name : "Unarmed strike");
  var line = "(" + label + " — 3d6(" + r.dice.join(",") + ")=" + r.total + signed(am, attr.slice(0, 3).toUpperCase()) + signed(sb, "skill") + (opts.bonus ? signed(opts.bonus, opts.bonusLabel || "bonus") : "") + (opts.condPenalty ? signed(opts.condPenalty, "condition") : "") + " = " + total + " vs Evasion " + ev;
  if (margin < 0) return { hit: false, margin: margin, natural: r.total, line: line + " — miss)", weapon: w, damage: 0 };
  var dmg = rollDice(w.dice[0], w.dice[1]); var raw = dmg.total + w.dice[2];
  var crit = r.total === 18 && margin >= 5; if (crit) raw += Math.floor(dmg.total * 0.5);
  var strMod = attrMod(a.strength); var strC = w.ranged ? 0 : w.finesse ? Math.max(0, Math.floor(strMod / 2)) : w.heavy ? Math.floor(strMod * 1.5) : strMod;
  raw += strC + (opts.extraDamage || 0);
  var weak = String(mon.weakness || "").toLowerCase(); var weakBonus = 0;
  if (w.blunt && /bludgeon/.test(weak)) { var m = weak.match(/bludgeoning\s*\+(\d+)/); weakBonus = m ? Number(m[1]) : 2; }
  raw += weakBonus;
  var dr = opts.ignoreDR ? 0 : mon.dr; var final = Math.max(0, raw - dr);
  line += " — " + (crit ? "CRITICAL " : "") + "hit. " + raw + " damage" + (weakBonus ? " (weak to bludgeoning)" : "") + (dr ? " − " + dr + " DR" : "") + " = " + final + ")";
  return { hit: true, margin: margin, natural: r.total, crit: crit, damage: final, line: line, weapon: w };
}
export function spellAttack(v, spell, mon) {
  var a = obj(v.attributes); var am = attrMod(a.arcana); var school = slug(spell.school || "arcane"); var sk = Math.max(skillLevel(v, school + "-magic"), skillLevel(v, "arcana"), skillLevel(v, school));
  var sb = skillBonus(sk); var r = roll3d6(); var total = r.total + am + sb; var margin = total - mon.evasion;
  var line = "(" + spell.name + " — 3d6(" + r.dice.join(",") + ")=" + r.total + signed(am, "ARC") + signed(sb, "skill") + " = " + total + " vs Evasion " + mon.evasion;
  if (margin < 0) return { hit: false, line: line + " — miss)", damage: 0 };
  var dice = spell.dice || [1, 6]; var dm = rollDice(dice[0], dice[1]); var raw = dm.total; var weak = String(mon.weakness || "").toLowerCase(); var el = String(spell.element || "").toLowerCase();
  var wb = (el && weak.indexOf(el) >= 0) || (/radiant|holy|divine/.test(el + " " + spell.school.toLowerCase()) && /radiant|holy/.test(weak)) ? 2 : 0; if (/cold\s*\+(\d+)/.test(weak) && el === "cold") wb = Number(weak.match(/cold\s*\+(\d+)/)[1]);
  raw += wb; if (r.total === 18 && margin >= 5) raw += Math.floor(dm.total * 0.5);
  line += " — hit. " + raw + " " + (el || "magic") + " damage" + (wb ? " (weakness)" : "") + ", ignores armor)";
  return { hit: true, damage: raw, line: line };
}
// A monster's strike against the player. Monsters use their stat-block dice; their
// accuracy is 3d6 + 2×Threat (bestiary threat is ecological danger, so this stays modest).
export function monsterAttack(mon, v, opts) {
  opts = opts || {}; var atk = mon.attacks[Math.floor(Math.random() * mon.attacks.length)] || { name: "strike", n: 1, d: 6, b: 0 };
  var r = roll3d6(); var bonus = mon.threat * 2; var total = r.total + bonus; var ev = evasion(v) + (opts.evasionBonus || 0);
  var line = "(" + mon.name + " " + atk.name + " — 3d6(" + r.dice.join(",") + ")=" + r.total + " +" + bonus + " = " + total + " vs your Evasion " + ev;
  if (opts.dodging) return { hit: false, line: line + " — dodged)", damage: 0, atk: atk };
  if (total < ev) return { hit: false, line: line + " — miss)", damage: 0, atk: atk };
  var dm = rollDice(atk.n, atk.d); var raw = dm.total + (atk.b || 0); if (r.total === 18 && total - ev >= 5) raw += Math.floor(dm.total * 0.5);
  var ar = armorDR(v); var dr = ar.dr; var magical = /necrotic|fire|cold|lightning|force|poison|drain|arc/.test((atk.name + " " + atk.tag).toLowerCase()); if (magical) dr = 0;
  if (!magical && ar.type === "mail" && /claw|blade|sword|scythe|cutlass|talon/.test(atk.name)) dr += 1;
  var final = Math.max(0, raw - dr - (opts.block || 0));
  return { hit: true, damage: final, line: line + " — hit. " + raw + " damage" + (dr ? " − " + dr + " DR" : "") + (opts.block ? " − " + opts.block + " blocked" : "") + " = " + final + ")", atk: atk };
}
// Odds of 3d6 meeting a target number (for hover previews), and the fixed parts of each roll.
var SUM3D6 = [1, 3, 6, 10, 15, 21, 25, 27, 27, 25, 21, 15, 10, 6, 3, 1];
export function chance3d6(need) { if (need <= 3) return 1; if (need > 18) return 0; var n = 0; for (var t = need; t <= 18; t++) n += SUM3D6[t - 3]; return n / 216; }
export function attackBonus(v) { var a = obj(v.attributes); var w = weaponProfile(v); var attr = w.ranged || w.finesse ? "agility" : "strength"; return attrMod(a[attr]) + skillBonus(skillLevel(v, w.skill)) + w.accuracy; }
export function spellBonus(v, spell) { var a = obj(v.attributes); var school = slug(spell.school || "arcane"); return attrMod(a.arcana) + skillBonus(Math.max(skillLevel(v, school + "-magic"), skillLevel(v, "arcana"), skillLevel(v, school))); }
export function damageText(v, mon) { var a = obj(v.attributes); var w = weaponProfile(v); var strMod = attrMod(a.strength); var strC = w.ranged ? 0 : w.finesse ? Math.max(0, Math.floor(strMod / 2)) : w.heavy ? Math.floor(strMod * 1.5) : strMod; var flat = w.dice[2] + strC; var lo = Math.max(0, w.dice[0] + flat - (mon ? mon.dr : 0)), hi = Math.max(0, w.dice[0] * w.dice[1] + flat - (mon ? mon.dr : 0)); return { dice: w.dice[0] + "d" + w.dice[1] + (flat ? (flat > 0 ? "+" : "−") + Math.abs(flat) : ""), lo: lo, hi: hi }; }
function signed(n, label) { if (!n) return ""; return (n > 0 ? " +" : " −") + Math.abs(n) + " " + label; }

// ------------------------------------------------------------------ rewards
export var KILL_XP = { 1: 10, 2: 25, 3: 60, 4: 150, 5: 400, 6: 1000, 7: 2500 };
// Turns the bestiary loot text into concrete items. Only what anatomy/equipment provides.
export function lootFor(mon) {
  var text = String(mon.loot || ""); var out = { items: [], copper: 0 };
  text.split(/;|,/).slice(0, 2).forEach(function (part, idx) {
    var p = part.trim(); if (!p || /negligible|not normal|only if|killing taboo|often protected/.test(p)) return;
    var rng = p.match(/(\d+)\s*-\s*(\d+)\s*(cp|sp|gp)/); var mult = rng ? { cp: 1, sp: 100, gp: 10000 }[rng[3]] : 0;
    var value = rng ? (Number(rng[1]) + Math.floor(Math.random() * (Number(rng[2]) - Number(rng[1]) + 1))) * mult : 0;
    if (/coin/.test(p)) { out.copper += value || 0; return; }
    if (idx > 0 && Math.random() < 0.5) return;
    var noun = p.replace(/\d+\s*-\s*\d+\s*(cp|sp|gp)/, "").replace(/\b(as|rare|chance|on hide|sample)\b.*$/, "").trim(); if (!noun) return;
    var name = mon.name + " " + noun.split(" ").map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");
    out.items.push({ id: slug(name), name: name, qty: 1, weight: mon.threat >= 3 ? 3 : 0.5, valueCp: value || mon.threat * 120, condition: 100, equipped: false, properties: ["monster material", "harvested from " + mon.name] });
  });
  return out;
}
export function spellFor(id, rec) {
  rec = rec || {}; var k = slug(rec.name || id); var lib = SPELL_LIBRARY[k] || SPELL_LIBRARY[slug(id)] || null;
  var base = lib ? Object.assign({}, lib) : { id: k, name: rec.name || id, school: rec.school || "Arcane", tier: rec.tier || "Minor", mp: Number(rec.manaCost) || 2, dice: null, element: "", heal: false, desc: "" };
  if (rec.manaCost != null) base.mp = Number(rec.manaCost) || base.mp;
  return base;
}
export var BESTIARY_BY_REGION = {}; BESTIARY.forEach(function (m) { (BESTIARY_BY_REGION[m.region] = BESTIARY_BY_REGION[m.region] || []).push(m); });
export var REALM_TO_BESTIARY = { "Aurelia": "Aurelia", "Stonehold": "Stonehold", "Sylvanor": "Sylvanor", "Drakmor": "Drakmor", "Sunscar": "Sunscar", "Velkar": "Velkar", "Umbral Reach": "Umbral", "The Marches": "Marches" };

// Calling resources from each class entry's CLASS MECHANICS paragraph.
export var CALLING_KIT = {
  "Fighter": { res: "Tempo", max: 3, build: "hit", tech: [{ id: "second-wind", name: "Second Wind", sp: 4, once: true, desc: "Recover 10% Max HP (minimum 2). Once per encounter." }, { id: "tempo-finisher", name: "Tempo Finisher", cost: 3, desc: "Spend 3 Tempo: a class finisher, +1d8 damage." }] },
  "Rogue": { res: null, tech: [{ id: "exploit", name: "Exploit", desc: "+1d6 precision damage when the target's attention is elsewhere." }, { id: "cunning-motion", name: "Cunning Motion", sp: 2, desc: "Disengage and reposition without an opening." }] },
  "Ranger": { res: null, tech: [{ id: "quarry", name: "Mark Quarry", desc: "+1 to the first attack against your studied quarry." }] },
  "Mage": { res: null, tech: [{ id: "overchannel", name: "Arcane Overchannel", desc: "Next spell +1 damage step for +50% Mana." }] },
  "Cleric": { res: "Devotion", max: 3, build: "heal", tech: [{ id: "devotion-mend", name: "Devotion: Mend", cost: 1, desc: "Spend 1 Devotion to strengthen a healing rite: heal 1d8 + Willpower." }] },
  "Paladin": { res: "Resonance", max: 3, build: "hit", tech: [{ id: "smite", name: "Smite", cost: 1, desc: "Spend 1 Resonance to empower a strike with +1d8 radiant." }] },
  "Barbarian": { res: "Fury", max: 5, build: "hurt", tech: [{ id: "brutal-swing", name: "Brutal Swing", cost: 2, desc: "Spend 2 Fury: +1d10 damage." }] },
  "Monk": { res: "Focus", max: 5, start: 2, build: "dodge", tech: [{ id: "flurry", name: "Focus Flurry", cost: 1, desc: "Spend 1 Focus for a two-strike burst." }] },
  "Bard": { res: "Momentum", max: 3, build: "hit", tech: [{ id: "cutting-verse", name: "Carry the Verse", cost: 1, desc: "Spend 1 Momentum to steady yourself: +2 to your next attack." }] },
  "Druid": { res: null, tech: [{ id: "attunement", name: "Attunement", desc: "Sense the biome: +1 Survival/Nature here." }] },
  "Occultist": { res: null, tech: [] },
  "Battlesmith": { res: null, tech: [{ id: "field-temper", name: "Field Temper", desc: "Study your gear in a serious fight to open a refinement project." }] },
  "Sylvanoran Warden": { res: null, tech: [{ id: "living-path", name: "Living Path", desc: "In Sylvanor, sense whether a path has been moved." }] },
  "Wyrm Hunter": { res: null, tech: [{ id: "monster-read", name: "Monster Read", desc: "Observe a large monster to identify a weakness: +1 to attacks against it." }] }
};
