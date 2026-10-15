// @ts-nocheck
// Shared pieces of the tactical combat system: who is on which side, positions and
// footprints, status effects, persistent zones and the one place damage is applied (so
// barriers, wards, Death Ward and kill credit work the same for everyone).
import { T } from "./three";
import { playAction } from "./anim";
import * as R from "./rules";

export var ROUND_SEC = 6;
export function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
export function lerpAngle(a, b, t) { var d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * Math.min(1, t); }
function num(x, d) { var n = Number(x); return isFinite(n) ? n : d; }

// ------------------------------------------------------------------ entities
// player (g.pe), allies (g.allies) and monsters (g.monsters) all expose x, y, z, yaw, c (model), st (statuses).
export function playerEntity(g) {
  var e = { kind: "player", id: "player", st: [], get x() { return g.pos.x; }, set x(v) { g.pos.x = v; }, get y() { return g.pos.y; }, get z() { return g.pos.z; }, set z(v) { g.pos.z = v; }, get yaw() { return g.yaw; }, set yaw(v) { g.yaw = v; } };
  Object.defineProperty(e, "hp", { get: function () { return g.stats.hp; }, set: function (v) { g.stats.hp = v; } });
  Object.defineProperty(e, "maxHp", { get: function () { return g.stats.maxHp; } });
  Object.defineProperty(e, "mp", { get: function () { return g.stats.mp; }, set: function (v) { g.stats.mp = v; } });
  Object.defineProperty(e, "sp", { get: function () { return g.stats.sp; }, set: function (v) { g.stats.sp = v; } });
  Object.defineProperty(e, "sheet", { get: function () { return g.v; } });
  Object.defineProperty(e, "name", { get: function () { return g.v["player-name"] || "You"; } });
  Object.defineProperty(e, "c", { get: function () { return { arch: "humanoid", size: 1, height: g.player ? g.player.height : 1.8, parts: { h: g.player } }; } });
  Object.defineProperty(e, "dead", { get: function () { return !!g.down; } });
  return e;
}
export function radius(m) { if (m.kind === "player" || m.kind === "ally") return 0.42; var a = m.c.arch, s = m.c.size || 1; return a === "humanoid" ? 0.42 : a === "brute" ? 0.62 : a === "winged" ? 0.5 + s * 0.45 : a === "serpent" ? 0.4 + s * 0.35 : a === "wisp" ? 0.45 : 0.3 + s * 0.33; }
export function isMon(e) { return !!e.mon; }
export function isFlying(m) { return !!(m.mon && m.fly); }
export function airborne(m) { return !!(m.fly && m.air > 0.5); }
export function sideOf(e) { return e.mon ? (hasSt(e, "controlled") ? "party" : "foe") : "party"; }
export function foesOf(g, e) {
  var b = g.battle; var side = sideOf(e);
  if (side === "foe") return partySide(g).filter(function (x) { return !x.dead && x.hp > 0; });
  return g.monsters.filter(function (m) { return m.inBattle && !m.dead && !m.fled && sideOf(m) === "foe"; });
}
export function partySide(g) { var l = [g.pe]; (g.allies || []).forEach(function (a) { if (!a.dead && !a.gone) l.push(a); }); g.monsters.forEach(function (m) { if (m.inBattle && !m.dead && hasSt(m, "controlled")) l.push(m); }); return l; }
export function sheetOf(g, e) { return e.kind === "player" ? g.v : e.kind === "ally" ? e.sheet : null; }
export function nameOf(e) { return e.kind === "monster" || e.mon ? e.mon.name + (e.tag || "") : e.name; }

export function hasReaction(g, e) { if (!g.battle) return false; return e.kind === "player" ? !!g.battle.reaction : e.reaction !== 0 && !e.dead; }
export function spendReaction(g, e) { if (e.kind === "player") { if (g.battle) g.battle.reaction = 0; } else e.reaction = 0; }

// ------------------------------------------------------------------ statuses
// {id, name, rounds, ev, atk, dr, drEl, per, rooted, skip, nudged, noheal, barrier, aegis, images, invisible,
//  hidden, dot:[n,d,el], slow, conc, controlled, smite, nextAtk, deathWard, eward, projEv, manaShield, noFear}
export function hasSt(e, id) { return !!(e.st && e.st.some(function (s) { return s.id === id; })); }
export function getSt(e, id) { return e.st && e.st.find(function (s) { return s.id === id; }); }
export function stSum(e, key) { var n = 0; (e.st || []).forEach(function (s) { if (typeof s[key] === "number") n += s[key]; }); return n; }
export function addSt(g, e, st, src) {
  if (!e.st) e.st = []; var old = e.st.find(function (s) { return s.id === st.id; }); var o = Object.assign({}, st, { src: src ? src.id : null, fresh: !!(g.battle && g.battle.active && g.battle.active.id === (src ? src.id : e.id)) });
  if (o.barrier != null && o.hp == null) o.hp = o.barrier; if (old) { if (o.rounds >= old.rounds || o.barrier) Object.assign(old, o); else old.rounds = Math.max(old.rounds, o.rounds); } else e.st.push(o);
  g.statusFloat && g.statusFloat(e, st.name, true);
}
export function dropSt(e, id) { if (e.st) e.st = e.st.filter(function (s) { return s.id !== id; }); }
export function conditionsText(e) { return (e.st || []).map(function (s) { return s.name + (s.rounds < 90 ? " (" + s.rounds + ")" : "") + (s.hp != null ? " " + Math.max(0, Math.round(s.hp)) + " HP" : ""); }); }
// End of the owner's turn: statuses placed this turn are not aged; the rest lose a round.
export function ageStatuses(g, e) { if (!e.st) return; e.st.forEach(function (s) { if (s.fresh) { s.fresh = false; return; } if (s.rounds < 90) s.rounds--; }); var gone = e.st.filter(function (s) { return s.rounds <= 0 || (s.barrier != null && s.hp <= 0); }); gone.forEach(function (s) { if (s.conc) endConc(g, e, s); }); e.st = e.st.filter(function (s) { return s.rounds > 0 && !(s.barrier != null && s.hp <= 0); }); }

// ------------------------------------------------------------------ derived defence
export function evasionOf(g, e) {
  if (e.mon) return e.mon.evasion + stSum(e, "ev");
  var sheet = sheetOf(g, e); return R.evasion(sheet) + stSum(e, "ev") + (e.dodging ? 3 : 0);
}
export function attackMod(e) { return stSum(e, "atk"); }

// ------------------------------------------------------------------ damage, healing, death
// o: {el, magic, src, label, crit, melee, ranged, noMit}
export function dealDamage(g, src, e, dmg, o) {
  o = o || {}; dmg = Math.max(0, Math.round(dmg)); var raw = dmg; var notes = [];
  if (dmg > 0 && hasSt(e, "aegis")) { notes.push("Aegis"); dmg = 0; }
  if (dmg > 0 && o.el) { var ward = (e.st || []).find(function (s) { return s.id === "eward" && s.el === o.el; }); if (ward) { dmg = Math.max(0, dmg - 4); notes.push(o.el + " ward −4"); } var fs = (e.st || []).find(function (s) { return s.drEl && s.drEl[o.el]; }); if (fs) { dmg = Math.max(0, dmg - fs.drEl[o.el]); notes.push(o.el + " resisted −" + fs.drEl[o.el]); } }
  // Mana Shield: spend up to 9 Mana for equal barrier against this hit
  if (dmg > 0 && !e.mon && g.autoReact !== false && g.knowsSpell && g.knowsSpell(e, "mana-shield") && e.mp > 0 && hasReaction(g, e)) { var ab = Math.min(dmg, 9, Math.floor(e.mp)); if (ab > 0) { e.mp -= ab; dmg -= ab; spendReaction(g, e); if (e.kind === "player") g.writeStats(); notes.push("Mana Shield (Reaction) −" + ab + " for " + ab + " Mana"); } }
  // dome and barrier pools soak damage first
  if (dmg > 0 && g.battle) (g.battle.zones || []).forEach(function (z) { if (z.kind === "dome" && z.hp > 0 && !e.mon && dist(e, z) <= z.r) { var t = Math.min(z.hp, dmg); z.hp -= t; dmg -= t; notes.push("dome −" + t); } });
  (e.st || []).forEach(function (s) { if (dmg > 0 && s.barrier != null && s.hp > 0) { var t = Math.min(s.hp, dmg); s.hp -= t; dmg -= t; notes.push(s.name + " −" + t); } });
  var before = e.hp; var wasAbove = before > 1;
  e.hp = Math.max(0, e.hp - dmg);
  if (e.hp <= 0 && wasAbove && hasSt(e, "deathward")) { e.hp = 1; dropSt(e, "deathward"); notes.push("Death Ward holds"); }
  if (notes.length && g.pushLog) g.pushLog("  (" + nameOf(e) + ": " + notes.join(", ") + ")", "info");
  if (dmg > 0 && (e.st || []).some(function (s) { return s.conc; }) && dmg >= e.maxHp * 0.25) { (e.st || []).filter(function (s) { return s.conc; }).forEach(function (s) { endConc(g, e, s); dropSt(e, s.id); }); }
  var inj = dmg >= e.maxHp * 0.25 && e.kind === "player";
  if (e.kind === "ally") g.writeAlly && g.writeAlly(e);
  if (e.hp <= 0) { onZero(g, src, e, o); return { dealt: dmg, killed: true, notes: notes, inj: inj, raw: raw }; }
  // exactly 1 HP: roll 1d6 (1-3 unconscious) — the Combat entry's rule for player characters and companions
  if (!e.mon && e.hp === 1 && before > 1) { var r = R.d(6); if (g.pushLog) g.pushLog("(" + nameOf(e) + " is at 1 HP — 1d6=" + r + (r <= 3 ? ": unconscious" : ": still standing") + ")", r <= 3 ? "hurt" : "info"); if (r <= 3) { addSt(g, e, { id: "unconscious", name: "Unconscious", rounds: 99, skip: 1 }); } }
  return { dealt: dmg, killed: false, notes: notes, inj: inj, raw: raw };
}
function onZero(g, src, e, o) {
  if (e.mon) { e.hp = 0; g.kill(e, o.skill || null, src); return; }
  if (e.kind === "player") { g.fall(src && src.mon ? src : (g.battle && g.battle.lastFoe) || { mon: { name: "the fight", region: "", threat: 0 } }); return; }
  // companions: death is real
  e.dead = true; e.hp = 0; var h = e.c.parts.h; if (h) playAction(h, "death"); if (g.pushLog) g.pushLog(e.name + " has fallen — 0 HP. Dead companions stay dead.", "kill");
  g.log && g.log("Companion " + e.name + " fell to 0 HP in combat (killed by " + (src ? nameOf(src) : "the enemy") + "). Resolve injury and death strictly by the Combat rules.");
  g.writeAlly && g.writeAlly(e);
}
export function healEntity(g, src, e, amt, label) {
  amt = Math.max(0, Math.round(amt)); if (hasSt(e, "noheal")) { g.pushLog && g.pushLog("(" + nameOf(e) + "'s healing is suppressed)", "miss"); return 0; }
  var before = e.hp; e.hp = Math.min(e.maxHp, e.hp + amt); var got = e.hp - before; if (hasSt(e, "unconscious")) { dropSt(e, "unconscious"); if (g.pushLog) g.pushLog(nameOf(e) + " comes to.", "heal"); }
  if (e.kind === "player") g.writeStats(); else if (e.kind === "ally") g.writeAlly && g.writeAlly(e);
  g.floatAt && g.floatAt(e, "+" + got, "#7ae07a"); return got;
}
function endConc(g, e, s) { if (!g.battle) return; g.battle.zones = (g.battle.zones || []).filter(function (z) { return !(z.conc && z.owner === e.id && z.name === s.name); }); if (g.pushLog) g.pushLog(nameOf(e) + " loses concentration on " + s.name + ".", "info"); }

// ------------------------------------------------------------------ zones
// walls, fields, domes and auras that outlast the turn. z: {kind, name, owner, x, z, x2, z2, r, rounds, dmg:[n,d], el, slow, dome, hp, conc, strike}
export function addZone(g, z) { var b = g.battle; if (!b) return; if (!b.zones) b.zones = []; z.id = "z" + (b.zid = (b.zid || 0) + 1); b.zones.push(z); return z; }
function segDist(px, pz, ax, az, bx, bz) { var vx = bx - ax, vz = bz - az, L = vx * vx + vz * vz; var t = L ? Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / L)) : 0; return Math.hypot(px - (ax + vx * t), pz - (az + vz * t)); }
function inZone(z, x, zz) { if (z.kind === "wall") return segDist(x, zz, z.x, z.z, z.x2, z.z2) <= z.r; if (z.kind === "aura") { var o = z.follow; return o ? Math.hypot(x - o.x, zz - o.z) <= z.r : false; } return Math.hypot(x - z.x, zz - z.z) <= z.r; }
function segHitsZone(z, x0, z0, x1, z1) { if (z.kind !== "wall") return false; var n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.4)); for (var i = 0; i <= n; i++) { var t = i / n; if (inZone(z, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return true; } return false; }
// damage from a zone: once per round per entity per zone
function zoneBurn(g, z, e) {
  var b = g.battle; if (!b || !z.dmg || z.owner === e.id && z.safeOwner) return; z.hit = z.hit || {}; if (z.hit[e.id] === b.round) return; z.hit[e.id] = b.round;
  if (z.friendly === false && sideOf(e) === z.side) return;
  var r = R.rollDice(z.dmg[0], z.dmg[1]); var d = r.total; var res = dealDamage(g, g.entityById(z.owner), e, d, { el: z.el, magic: true, skill: z.skill });
  g.pushLog("(" + z.name + " burns " + nameOf(e) + " — " + z.dmg[0] + "d" + z.dmg[1] + "=" + d + " " + (z.el || "magic") + (res.dealt !== d ? " → " + res.dealt : "") + ")", sideOf(e) === "foe" ? "hit" : "hurt");
  g.floatAt && g.floatAt(e, String(res.dealt), "#ffa050"); var p = g.chestOf ? g.chestOf(e) : e; g.fx && g.fx.sparks(p.x, p.y || 0, p.z, "#ff9a3a");
}
export function zonesOnStep(g, e, x0, z0, x1, z1) { var b = g.battle; if (!b || !b.zones) return; b.zones.forEach(function (z) { if (z.kind === "wall" && segHitsZone(z, x0, z0, x1, z1)) zoneBurn(g, z, e); else if (z.kind === "field" && z.dmg && inZone(z, x1, z1) && !inZone(z, x0, z0)) zoneBurn(g, z, e); }); }
export function zonesTurnStart(g, e) { var b = g.battle; if (!b || !b.zones) return; b.zones.forEach(function (z) { if (z.kind === "dome") return; if (z.kind === "aura") return; if (inZone(z, e.x, e.z)) { zoneBurn(g, z, e); if (z.slow && !e.mon === false) addSt(g, e, { id: "slowed", name: "Slowed", rounds: 1, slow: 1 }); else if (z.slow) addSt(g, e, { id: "slowed", name: "Slowed", rounds: 1, slow: 1 }); } }); }
export function zonesRoundEnd(g) { var b = g.battle; if (!b || !b.zones) return; b.zones.forEach(function (z) { z.rounds--; }); var gone = b.zones.filter(function (z) { return z.rounds <= 0 || (z.kind === "dome" && z.hp <= 0); }); gone.forEach(function (z) { if (g.pushLog) g.pushLog(z.name + " fades.", "info"); }); b.zones = b.zones.filter(function (z) { return z.rounds > 0 && !(z.kind === "dome" && z.hp <= 0); }); }
export function inAnyZone(g, x, z, kinds) { var b = g.battle; if (!b || !b.zones) return false; return b.zones.some(function (q) { return (!kinds || kinds.indexOf(q.kind) >= 0) && inZone(q, x, z); }); }
export function zoneSlow(g, e) { return !!(g.battle && (g.battle.zones || []).some(function (z) { return z.slow && inZone(z, e.x, e.z); })); }

// the visible side of zones, called every frame
export function zoneVisuals(g, dt) {
  var b = g.battle; if (!b || !b.zones || !g.fx) return; b.zones.forEach(function (z) {
    z.vt = (z.vt || 0) + dt; if (z.vt < 0.07) return; z.vt = 0; var col = z.color || "#ff8a3a", col2 = z.color2 || "#ffd070";
    if (z.kind === "wall") { var n = Math.ceil(Math.hypot(z.x2 - z.x, z.z2 - z.z) / 1.1); for (var i = 0; i <= n; i++) { var t = i / n; var x = z.x + (z.x2 - z.x) * t, zz = z.z + (z.z2 - z.z) * t; g.fx.emit(x, g.terrain.groundAt(x, zz) + 0.2, zz, { n: 2, color: col, color2: col2, speed: 0.3, up: 2.8, size: 0.95, life: 0.8, grav: -1, drag: 0.5, alpha: 0.85, spread: 0.5 }); } }
    else if (z.kind === "field" || z.kind === "dome") { for (var k = 0; k < 3; k++) { var a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * z.r; var x2 = z.x + Math.cos(a) * rr, z2 = z.z + Math.sin(a) * rr; g.fx.emit(x2, g.terrain.groundAt(x2, z2) + 0.15, z2, { n: 1, color: col, color2: col2, speed: 0.2, up: z.kind === "dome" ? 1.4 : 1.1, size: z.kind === "dome" ? 0.35 : 0.5, life: 0.9, grav: -0.6, drag: 0.6, alpha: 0.55 }); } }
    else if (z.kind === "aura" && z.follow) { var a2 = Math.random() * 6.28; g.fx.emit(z.follow.x + Math.cos(a2) * z.r, z.follow.y + 0.3, z.follow.z + Math.sin(a2) * z.r, { n: 1, color: col, color2: col2, speed: 0.2, up: 1.6, size: 0.3, life: 0.9, grav: -0.6, drag: 0.6 }); }
  });
}

// ------------------------------------------------------------------ one monster attack against one target
var MAGIC_NAME = /bolt|spit|breath|dart|spells|drain|arc|fire|frost|lightning|thorn|web|necrotic|force|volley/;
export function elementOfAttack(atk) { var t = (atk.name + " " + (atk.tag || "")).toLowerCase(); return /fire|flame|ember|forge/.test(t) ? "fire" : /frost|cold|ice|glacier/.test(t) ? "cold" : /lightning|arc/.test(t) ? "lightning" : /acid/.test(t) ? "acid" : /necrotic|drain/.test(t) ? "necrotic" : /force/.test(t) ? "force" : ""; }
export function pickAttack(mon, want) { var l = mon.attacks || []; if (want) { var f = l.filter(want); if (f.length) return f[Math.floor(Math.random() * f.length)]; } return l[Math.floor(Math.random() * l.length)] || { name: "strike", n: 1, d: 6, b: 0 }; }
// att: a monster (hostile or controlled). tgt: player, ally or monster. o: {attack, ranged, tag, bonus}
export function strikeAt(g, att, tgt, o) {
  o = o || {}; var atk = o.attack || pickAttack(att.mon); var tsheet = sheetOf(g, tgt); var ranged = !!o.ranged; var magicName = MAGIC_NAME.test((atk.name + " " + (atk.tag || "")).toLowerCase());
  var evb = 0; var notes = [];
  // Mage Ward: a Reaction that adds +2 Evasion against one magical projectile
  if (!tgt.mon && ranged && magicName && g.autoReact !== false && g.knowsSpell && g.knowsSpell(tgt, "mage-ward") && tgt.mp >= 2 && hasReaction(g, tgt)) { tgt.mp -= 2; spendReaction(g, tgt); evb += 2; notes.push("Mage Ward (Reaction) +2 Evasion"); if (tgt.kind === "player") g.writeStats(); }
  var fear = 0; var atkBonus = stSum(att, "atk") + (o.bonus || 0) + ((hasSt(tgt, "invisible") || hasSt(tgt, "hidden")) && dist(att, tgt) > 2.2 ? -2 : 0);
  var res;
  if (tgt.mon) res = R.creatureAttack(att.mon, { evasion: evasionOf(g, tgt) + evb, dr: tgt.mon.dr, name: nameOf(tgt) }, { attack: atk, atkBonus: atkBonus, drBonus: stSum(tgt, "dr") });
  else res = R.monsterAttack(att.mon, tsheet, { attack: atk, atkBonus: atkBonus, evasion: evasionOf(g, tgt) + evb, drBonus: stSum(tgt, "dr"), targetName: tgt.kind === "player" ? "your" : tgt.name + "'s" });
  if (att.tag && g.pushLog) { }
  var label = (o.tag === "opportunity" ? "Opportunity attack — " : "") + res.line;
  // Mirror Image: the first attacks may strike an image instead (1–3 on a d6)
  var mi = getSt(tgt, "mirror"); if (mi && mi.images > 0 && res.total >= 0 && !(res.hit === false && res.total < evasionOf(g, tgt))) { var rr = R.d(6); if (rr <= 3) { mi.images--; if (mi.images <= 0) dropSt(tgt, "mirror"); g.pushLog(label + " — Mirror Image: d6=" + rr + ", an image shatters (" + Math.max(0, mi.images) + " left)", "miss"); g.floatAt(tgt, "Image", "#c8a0ff"); g.fx.burst(tgt.x, (tgt.y || 0) + 1.2, tgt.z, "#c8a0ff", false); return { res: res, hit: false, image: true }; } }
  var el = elementOfAttack(atk); var blocked = false; var dealt = null;
  if (res.hit && res.damage > 0 && !tgt.mon && !ranged && !magicName && g.autoReact !== false && hasReaction(g, tgt) && tgt.sp >= 1) {
    var br = R.blockRoll(sheetOf(g, tgt), res.total, true);
    if (br) { spendReaction(g, tgt); tgt.sp -= 1; if (tgt.kind === "player") g.writeStats(); if (br.ok) { blocked = true; res.line = res.line.replace(/\)$/, "") + " — Reaction: Block 3d6(" + br.dice.join(",") + ")=" + (br.total) + " vs " + res.total + " — blocked, the " + (br.shield ? "shield" : "weapon") + " takes the strain)"; res.damage = 0; } else res.line = res.line.replace(/\)$/, "") + " — Reaction: Block 3d6(" + br.dice.join(",") + ")=" + br.total + " vs " + res.total + " fails)"; }
  }
  g.pushLog((o.tag === "opportunity" ? "Opportunity attack — " : "") + res.line + (notes.length ? " [" + notes.join(", ") + "]" : ""), res.hit && res.damage > 0 ? "hurt" : "miss");
  if (res.hit && res.damage > 0) { dealt = dealDamage(g, att, tgt, res.damage, { el: el, magic: res.magical, melee: !ranged }); if (res.atk && /web/.test(atk.name) && !tgt.mon && dist(att, tgt) > 0) addSt(g, tgt, { id: "rooted", name: "Webbed", rounds: 2, rooted: 1 }, att); }
  g.onEntityHit && g.onEntityHit(att, tgt, res, dealt, { blocked: blocked, ranged: ranged, atk: atk });
  return { res: res, hit: res.hit && res.damage > 0, blocked: blocked, dealt: dealt };
}
