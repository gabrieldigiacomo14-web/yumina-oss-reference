// @ts-nocheck
// Combat behaviour of every spell in the Eldoria library. The numbers (ranges, dice,
// durations, Mana, casting time) come straight from the library entries; this table only
// says which kind of effect the entry describes so the tactical client can aim and resolve
// it. Spells that need minutes or rituals, or that only matter outside a fight, are marked
// "util": they stay usable in the world and are refused with a reason during a fight.
import { SPELL_LIBRARY } from "./data";

var FT = 0.3048; // one foot in metres; 30 ft of movement is the 9 m a character covers in a turn

// t: bolt (one target, spell attack vs Evasion) | line | cone | burst | arc | heal | buff | debuff | wall | field | aura
//    teleport | summon | reaction | util
// tgt: self | ally | touch (self or ally in reach) | foe | point
export var FX = {
  // --- single-target attacks
  "spark": { t: "bolt" }, "ember-dart": { t: "bolt" }, "force-pebble": { t: "bolt" }, "arcane-bolt": { t: "bolt" }, "mana-needle": { t: "bolt" },
  "chill-touch": { t: "bolt", st: { id: "noheal", name: "Withered", rounds: 1, noheal: 1 } },
  "radiant-brand": { t: "bolt", vsHoly: [1, 4] },
  "shadow-bolt": { t: "bolt", st: { id: "dimmed", name: "Dimmed", rounds: 1, per: -1 } },
  "wither": { t: "bolt", touch: true },
  "drain-vitality": { t: "bolt", drain: 0.5 },
  "disintegrating-ray": { t: "bolt" },
  "lightning-arc": { t: "arc", jump: [1, 8], jumpR: 10 * FT },
  "lance-of-force": { t: "line", len: 80 * FT, w: 0.9, bonus: 0 },
  "shatter-pulse": { t: "cone", len: 20 * FT, ang: 1.05 },
  "burst-sphere": { t: "burst", brace: true },
  "meteor-brand": { t: "burst", brace: true },
  "pillar-of-dawn": { t: "burst", holy: true },
  "wall-of-flame": { t: "wall", len: 30 * FT, rounds: 3 },
  "grasping-night": { t: "field", rounds: 3, dot: [1, 6], slow: true, around: "self" },
  "heart-of-the-storm": { t: "aura", rounds: 5, strike: [3, 10], conc: true, radius: 30 * FT },
  // --- healing
  "mend-flesh": { t: "heal", flat: 2 }, "greater-mend": { t: "heal", flat: 0 },
  // --- wards and boons
  "frost-sheath": { t: "buff", tgt: "touch", st: { id: "frost", name: "Frost Sheath", rounds: 3, drEl: { fire: 2 } } },
  "mage-ward": { t: "reaction", st: { id: "mageward", name: "Mage Ward", rounds: 99, projEv: 2 }, prep: true },
  "barrier": { t: "buff", tgt: "touch", st: { id: "barrier", name: "Barrier", rounds: 3, barrier: 6 } },
  "element-ward": { t: "buff", tgt: "touch", choose: ["fire", "cold", "lightning", "acid"], st: { id: "eward", name: "Element Ward", rounds: 5 } },
  "sanctum-dome": { t: "buff", tgt: "self", dome: 50, rounds: 5, radius: 20 * FT },
  "aegis-absolute": { t: "buff", tgt: "self", st: { id: "aegis", name: "Aegis", rounds: 1, aegis: 1 } },
  "mirror-image": { t: "buff", tgt: "self", st: { id: "mirror", name: "Mirror Images", rounds: 10, images: 3 } },
  "mana-shield": { t: "reaction", st: { id: "manashield", name: "Mana Shield", rounds: 99, manaShield: 9 }, prep: true },
  "death-ward": { t: "buff", tgt: "touch", st: { id: "deathward", name: "Death Ward", rounds: 99, deathWard: 1 } },
  "blessing": { t: "buff", tgt: "touch", st: { id: "blessing", name: "Blessing", rounds: 99, nextAtk: 1 } },
  "smite": { t: "buff", tgt: "self", st: { id: "smite", name: "Smite", rounds: 1, smite: [2, 6] } },
  "barkskin": { t: "buff", tgt: "touch", st: { id: "barkskin", name: "Barkskin", rounds: 3, dr: 3, ev: -1 } },
  "courage": { t: "buff", tgt: "touch", st: { id: "courage", name: "Courage", rounds: 3, noFear: 1 } },
  "mass-courage": { t: "aura", allies: true, st: { id: "courage", name: "Courage", rounds: 5, noFear: 1 }, radius: 20 * FT },
  "guardian-halo": { t: "aura", allies: true, st: { id: "halo", name: "Guardian Halo", rounds: 5, dr: 1, noFear: 1 }, radius: 10 * FT },
  "rallying-chorus": { t: "aura", allies: true, st: { id: "rally", name: "Rallying Chorus", rounds: 1, atk: 1 }, radius: 20 * FT },
  "ballad-of-heroes": { t: "aura", allies: true, st: { id: "ballad", name: "Ballad of Heroes", rounds: 5, atk: 1, ev: 1, noFear: 1 }, radius: 30 * FT, conc: true },
  "invisibility": { t: "buff", tgt: "touch", st: { id: "invisible", name: "Invisible", rounds: 30, invisible: 1 } },
  "black-veil": { t: "buff", tgt: "self", st: { id: "hidden", name: "Veiled", rounds: 3, hidden: 1 } },
  "wind-step": { t: "teleport", react: true, dist: 15 * FT, free: true, walk: true },
  // --- hexes on enemies
  "stone-grip": { t: "debuff", grounded: true, st: { id: "rooted", name: "Gripped", rounds: 2, rooted: 1 }, resist: "str" },
  "thorn-snare": { t: "debuff", grounded: true, st: { id: "rooted", name: "Snared", rounds: 3, rooted: 1 }, resist: "agi" },
  "drowse": { t: "debuff", st: { id: "fatigued", name: "Fatigued", rounds: 3, atk: -2 }, resist: "end" },
  "nudge": { t: "debuff", st: { id: "nudged", name: "Nudged", rounds: 1, nudged: 1 }, resist: "will" },
  "cutting-verse": { t: "debuff", needsSpeech: true, st: { id: "shaken", name: "Shaken", rounds: 2, atk: -2 }, resist: "will" },
  "sovereign-voice": { t: "cone", len: 30 * FT, ang: 1.05, cmd: true, st: { id: "commanded", name: "Commanded", rounds: 1, skip: 1 }, resist: "will" },
  "eclipse-crown": { t: "aura", enemies: true, st: { id: "dread", name: "Dread", rounds: 5, atk: -2 }, radius: 30 * FT, resist: "will" },
  "command-undead": { t: "debuff", undeadOnly: true, st: { id: "controlled", name: "Controlled", rounds: 5, controlled: 1 }, resist: "will", maxThreat: 3 },
  "dispel-weave": { t: "debuff", dispel: true },
  "anchor": { t: "debuff", st: { id: "anchored", name: "Anchored", rounds: 3 }, resist: "will" },
  // --- movement
  "blink": { t: "teleport", dist: 15 * FT }, "gloomstep": { t: "teleport", dist: 30 * FT }, "fold-step": { t: "teleport", dist: 60 * FT },
  "gate-step": { t: "teleport", dist: 60 * FT }, "umbral-gate": { t: "teleport", dist: 100 * FT },
  // --- conjuration
  "summon-guardian": { t: "summon", rounds: 3, conc: true }
};

export function spellFx(sp) { var f = FX[sp.id]; if (f) return f; return { t: "util" }; }

// "30 ft" "Touch" "Self/Touch" "90 ft, 15-ft radius" "20-ft cone" "Self 30-ft aura" ...
export function parseRange(str) {
  var s = String(str || "").toLowerCase(); var out = { self: false, touch: false, ft: 0, radius: 0, cone: 0, aura: 0 };
  if (/self/.test(s)) out.self = true; if (/touch|weapon/.test(s)) out.touch = true;
  var r = s.match(/(\d+)-ft radius|(\d+)\s*ft radius/); if (r) out.radius = Number(r[1] || r[2]) * FT;
  var c = s.match(/(\d+)-ft cone/); if (c) out.cone = Number(c[1]) * FT; var a = s.match(/(\d+)-ft aura/); if (a) out.aura = Number(a[1]) * FT;
  var f = s.match(/^(\d+)\s*ft/); if (f) out.ft = Number(f[1]) * FT; else if (!out.touch && !out.self && !out.cone && !out.aura) { var g = s.match(/(\d+)\s*ft/); if (g) out.ft = Number(g[1]) * FT; }
  return out;
}
// Casting time -> which parts of the turn it uses. null: cannot be done in a fight.
export function castCost(sp) {
  var s = String(sp.cast || "1 action").toLowerCase();
  if (/ritual|min|hr|hour/.test(s)) return null;
  if (/reaction/.test(s)) return { reaction: 1 };
  var n = (s.match(/(\d+)\s*action/) || [0, 1])[1] | 0;
  if (n >= 3) return { action: 1, bonus: 1, move: 1 };
  if (n === 2) return { action: 1, bonus: 1 };
  return { action: 1 };
}
export function costLabel(sp) { var c = castCost(sp); if (!c) return "Out of combat"; return c.reaction ? "Reaction" : c.move ? "Whole turn" : c.bonus ? "Action + Bonus" : "Action"; }

// Everything the UI and the resolver need to know about a spell, for one caster.
export function describeSpell(sp) {
  var fx = spellFx(sp); var rg = parseRange(sp.range); var cost = castCost(sp);
  var reach = fx.touch || (rg.touch && !rg.ft) ? "touch" : null;
  var maxR = fx.t === "cone" ? (fx.len || rg.cone) : fx.t === "wall" || fx.t === "burst" || fx.t === "bolt" || fx.t === "arc" || fx.t === "line" || fx.t === "debuff" || fx.t === "teleport" || fx.t === "summon" ? (rg.ft || (fx.dist || 0)) : 0;
  if (fx.t === "teleport") maxR = fx.dist || rg.ft;
  var area = fx.t === "burst" ? rg.radius : fx.t === "cone" ? (fx.len || rg.cone) : fx.t === "wall" ? fx.len : fx.t === "field" ? (rg.radius || 6.1) : (fx.radius || rg.aura || rg.radius);
  var tgt = fx.t === "bolt" || fx.t === "arc" || (fx.t === "debuff" && !fx.dispel) ? "foe" : fx.t === "debuff" ? "foe" : fx.t === "heal" || (fx.t === "buff" && fx.tgt === "touch") ? "touch" : fx.t === "buff" || fx.t === "aura" || fx.t === "reaction" || fx.t === "field" ? "self" : fx.t === "line" || fx.t === "cone" ? "dir" : fx.t === "burst" || fx.t === "wall" || fx.t === "teleport" || fx.t === "summon" ? "point" : "self";
  if (fx.t === "heal" || (fx.t === "buff" && fx.tgt === "touch")) maxR = 1.9; if (fx.touch) maxR = 1.9;
  return { fx: fx, range: rg, cost: cost, tgt: tgt, maxR: maxR, area: area, label: costLabel(sp), usable: !!cost && fx.t !== "util" && !(fx.t === "reaction" && false), kind: fx.t };
}
export function whyNot(sp) { var fx = spellFx(sp); var c = castCost(sp); if (!c) return sp.name + " takes too long to cast in a fight (" + (sp.cast || "ritual") + ")."; if (fx.t === "util") return sp.name + " has no use in a fight."; return ""; }
export function libraryIds() { return Object.keys(SPELL_LIBRARY); }
