// Test fixtures: a created character (tools/fixtures/base-preset.json) topped up with learned spells, potions, flasks,
// weapons and companions, so every combat system can be exercised.
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
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
