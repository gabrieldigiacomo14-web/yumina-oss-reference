// @ts-nocheck
// Turn scripts for everything that is not the player: hostile monsters, companions and
// anything the party has bound to its side. Each turn is a generator the battle runner steps
// once per frame, so movement, swings, bolts and breath play out in order and in view.
// Decisions come from each creature's own bestiary entry (attacks and tactics text), not from
// invented behaviour tables: animals defend territory and flee when hurt, packs flank,
// archers keep their distance, fliers dive and withdraw upward, breath is used when it hits
// something and then recharges, and veterans focus the weak or the healer.
import { MILE, landSD } from "./worldgen";
import { playAction, attackClip } from "./anim";
import * as R from "./rules";
import * as B from "./cbase";
import * as SC from "./spellcast";
import * as S from "./spells";
import * as I from "./items";

export var MOVE_M = 9;
export function moveOf(m) { if (m.kind === "ally") return MOVE_M; var a = m.c.arch; var base = a === "canine" || a === "winged" ? 12 : a === "brute" ? 7.5 : a === "bug" ? 10 : a === "serpent" ? 8 : 9; if (m.fly) base = Math.max(base, 12); return base; }
export function meleeReach(a, t) { return B.radius(a) + B.radius(t) + 1.5; }
export function weaponReach(w, t) { return B.radius(t) + 0.4 + (w.ranged ? 30 : w.kind === "spear" ? 2.4 : 1.6); }

var RANGED = /bow|javelin|hurl|spit|bolt|volley|boulder|dart|spells|web|debris|throw/;
export function profile(m) {
  if (m._p) return m._p; var atks = m.mon.attacks || []; var tac = (String(m.mon.tactics || "") + " " + String(m.mon.weakness || "")).toLowerCase(); var nm = m.mon.name.toLowerCase();
  var P = { melee: [], ranged: [], breath: null, area: null, tac: tac };
  atks.forEach(function (a) { var n = a.name.toLowerCase(), tag = String(a.tag || "").toLowerCase(); if (/breath/.test(n) || tag === "cone") P.breath = a; else if (tag === "area" || /quake|eruption/.test(n)) P.area = a; else if (RANGED.test(n)) P.ranged.push(a); else P.melee.push(a); });
  if (!P.melee.length && !P.ranged.length && !P.breath && !P.area && atks[0]) P.melee.push(atks[0]);
  if (!P.melee.length && !P.ranged.length && (P.breath || P.area)) P.melee.push(P.breath || P.area);
  P.pack = /pack|circle|coordinat|flank|swarm|surround|multi-angle/.test(tac); P.hitRun = /hit-and-run|disengage|aerial|dive|passes|abduct|retreats? underground|burrow/.test(tac); P.teleport = /teleport|blink/.test(tac) && !/does not/.test(tac);
  P.mindless = /mindless|does not flee|never flee|shield wall|disciplined|relentless|construct|siege/.test(tac) || /skeleton|colossus|walker|treant|wight|ghast|ghoul|revenant|lich|draugr|knight|avatar/.test(nm);
  P.fleeish = /flee|retreat|surrender|rather than dies|avoids combat|morale/.test(tac); P.berserk = /berserk|cornered/.test(tac);
  P.focusWeak = /weak target|wounded|isolates|isolated|rear|circle wounded|circles wounded/.test(tac) || P.pack; P.focusCaster = /healer|divine|caster|strikes? caster|targets? (healers|divine)/.test(tac);
  P.kite = P.ranged.length > 0 && /ambush|skirmish|volley|archer|bow|harass|hit-and-run|use cover/.test(tac + " " + nm + " " + atks.map(function (a) { return a.name; }).join(" "));
  P.rangedOnly = P.ranged.length > 0 && !P.melee.length; P.rangedM = /boulder|spit|bolt|breath|spells|volley/.test(P.ranged.map(function (a) { return a.name; }).join(" ")) ? 18 : 14;
  m._p = P; return P;
}

// ------------------------------------------------------------------ movement
export function setAir(m, v) { m.airT = v; }
function stepFree(g, m, nx, nz) { if (m.fly) return true; if (landSD(nx / MILE, -nz / MILE) <= 0.02 || g.terrain.groundAt(nx, nz) < -1.3) return false; return true; }
function separate(g, m, x, z) {
  var rm = B.radius(m);
  g.battleEntities().forEach(function (o) { if (o === m || o.dead || o.fled) return; if (m.fly && B.airborne(m) && !(o.kind === "player")) { if (o.mon && B.airborne(o)) { } else return; } var d = Math.hypot(x - o.x, z - o.z), mm = rm + B.radius(o) * 0.9; if (d < mm && d > 1e-4) { x = o.x + (x - o.x) / d * mm; z = o.z + (z - o.z) / d * mm; } });
  return { x: x, z: z };
}
// Walk toward (tx, tz) for at most maxD metres, stopping `stop` short. Provokes opportunity attacks and burns in zones.
export function* walkTo(g, m, tx, tz, maxD, stop, o) {
  o = o || {}; var moved = 0, stuck = 0; if (B.hasSt(m, "rooted")) { return 0; } if (B.hasSt(m, "slowed") || B.zoneSlow(g, m)) maxD *= 0.5;
  var foes = B.foesOf(g, m); var inReach = {}; foes.forEach(function (f) { inReach[f.id || f.name] = B.dist(m, f) <= meleeReach(f, m) + 0.2; });
  while (moved < maxD - 0.02 && !m.dead) {
    var dx = tx - m.x, dz = tz - m.z, d = Math.hypot(dx, dz); var left = Math.min(d - stop, maxD - moved); if (left <= 0.03) break;
    var sp = Math.min(m.fly ? 11 : 9, (m.speed || 7) * 0.8 + (o.dash ? 2 : 0)); var step = Math.min(left, sp * (g.dtc || 0.016));
    var nx = m.x + dx / d * step, nz = m.z + dz / d * step; if (!stepFree(g, m, nx, nz)) break;
    var p = g.collide ? g.collide(nx, nz, B.radius(m) * 0.6) : { x: nx, z: nz }; p = separate(g, m, p.x, p.z);
    var adv = Math.hypot(p.x - m.x, p.z - m.z); if (adv < step * 0.25) { if (++stuck > 8) break; } else stuck = 0;
    var ox = m.x, oz = m.z; m.x = p.x; m.z = p.z; moved += Math.max(adv, step * 0.25); m.yaw = B.lerpAngle(m.yaw, Math.atan2(dx, dz), (g.dtc || 0.016) * 12); m.gait = sp; if (m.fly) m.airT = 1;
    B.zonesOnStep(g, m, ox, oz, m.x, m.z); if (m.dead) break;
    if (!o.free && !m.fly || (m.fly && !o.free && !B.airborne(m))) {
      for (var i = 0; i < foes.length; i++) { var f = foes[i]; var k = f.id || f.name; if (f.dead || !inReach[k]) continue; var nowIn = B.dist(m, f) <= meleeReach(f, m) + 0.2; if (!nowIn && B.hasReaction(g, f) && !g.down) { inReach[k] = false; m.gait = 0; yield* opportunity(g, f, m); if (m.dead) break; } else inReach[k] = nowIn; }
    }
    yield 0;
  }
  m.gait = 0; return moved;
}
// the reaction a character or beast gets when something leaves its reach
function* opportunity(g, f, mover) {
  B.spendReaction(g, f);
  if (f.mon) { g.pushLog(B.nameOf(f) + " takes an opportunity attack on " + B.nameOf(mover) + ".", "info"); yield* strikeGen(g, f, mover, { tag: "opportunity" }); return; }
  var w = R.weaponProfile(B.sheetOf(g, f)); if (w.ranged) { return; }
  g.pushLog("Reaction — opportunity attack by " + B.nameOf(f) + " on " + B.nameOf(mover) + ".", "info"); yield* swingGen(g, f, mover, { free: true, tag: "opportunity" });
}

// ------------------------------------------------------------------ attacks
function face(a, t) { a.yaw = Math.atan2(t.x - a.x, t.z - a.z); }
// A monster's attack against anyone on the other side.
export function* strikeGen(g, m, tgt, o) {
  o = o || {}; if (m.dead || tgt.dead) return; face(m, tgt); var atk = o.attack || B.pickAttack(m.mon, o.ranged ? function (a) { return RANGED.test(a.name.toLowerCase()); } : function (a) { return !RANGED.test(a.name.toLowerCase()) && !/breath/.test(a.name.toLowerCase()); }) || B.pickAttack(m.mon); var ranged = o.ranged != null ? o.ranged : RANGED.test(atk.name.toLowerCase());
  var h = m.c.parts.h; var fired = false, t0 = g.time;
  if (h) playAction(h, ranged ? "bow" : attackClip(h.weaponKind), function (ev) { if (ev === "hit" || ev === "release") fired = true; }); else { m.attackT = 0.62; m.attackDur = 0.62; }
  if (m.fly) m.airT = ranged ? 1 : 0.15;
  if (!ranged || !h) g.bridge.sfx && g.bridge.sfx(h ? "sfx-sword-swing" : /wolf|hound|jackal/i.test(m.mon.name) ? "sfx-wolf-growl" : "sfx-monster-growl");
  yield function () { return fired || (!h && g.time - t0 > 0.3) || g.time - t0 > 1.4; };
  if (ranged) {
    var done = false; var elem = B.elementOfAttack(atk); var col = elem === "fire" ? "#ff8a3a" : elem === "cold" ? "#9fe0ff" : elem === "lightning" ? "#d8e8ff" : elem === "acid" ? "#9ae05a" : elem === "necrotic" ? "#a06ad0" : null;
    var kind = /spit|bolt|spells|dart|drain|web/.test(atk.name.toLowerCase()) ? "bolt" : /boulder|debris|hurl/.test(atk.name.toLowerCase()) ? "rock" : "arrow";
    g.projectile(tgt, kind, function () { B.strikeAt(g, m, tgt, { attack: atk, ranged: true, tag: o.tag }); done = true; }, m, elem || (kind === "bolt" ? "arcane" : null), col);
    yield function () { return done || g.time - t0 > 3.5; };
  } else B.strikeAt(g, m, tgt, { attack: atk, ranged: false, tag: o.tag, bonus: o.bonus });
  yield 0.35;
}
// Weapon swing by the player or a companion at a monster (or, rarely, at anything hostile).
export function* swingGen(g, att, m, o) {
  o = o || {}; var sheet = B.sheetOf(g, att); var w = R.weaponProfile(sheet); face(att, m); var h = att.c.parts.h; var clip = w.ranged ? "bow" : attackClip(w.kind); var fired = false, t0 = g.time;
  if (h) playAction(h, clip, function (e) { if (e === "hit" || e === "release") fired = true; });
  if (!w.ranged) g.bridge.sfx && g.bridge.sfx("sfx-sword-swing");
  yield function () { return fired || g.time - t0 > 1.5; };
  var res = g.rollAttack(m, o, att);
  if (w.ranged) { var done = false; g.projectile(m, "arrow", function () { g.applyAttack(m, res, w.skill, o, att); done = true; }, att.kind === "player" ? null : att); yield function () { return done || g.time - t0 > 3; }; }
  else g.applyAttack(m, res, w.skill, o, att);
  yield 0.38;
}
// Breath: a cone from the monster, rolled against everyone in it; recharges after two rounds.
function* breathGen(g, m, atk, aimAt) {
  var P = profile(m); var len = m.mon.threat >= 5 ? 14 : 10; var half = 0.5; face(m, aimAt); var ang = m.yaw; var h = m.c.parts.h; var t0 = g.time;
  var elem = B.elementOfAttack(atk); var col = elem === "fire" ? "#ff8a3a" : elem === "cold" ? "#bfe8ff" : elem === "lightning" ? "#d8e8ff" : elem === "acid" ? "#9ae05a" : "#d0c0ff";
  g.pushLog(B.nameOf(m) + " draws breath — " + atk.name + "!", "hurt"); m.attackT = 1.1; m.attackDur = 1.1; if (m.fly) m.airT = 0.6;
  g.bridge.sfx && g.bridge.sfx("sfx-monster-growl"); yield 0.7;
  var o0 = { x: m.x + Math.sin(ang) * (B.radius(m) + 0.4), y: m.y + (m.c.height || 2) * 0.55, z: m.z + Math.cos(ang) * (B.radius(m) + 0.4) };
  for (var k = 0; k < 70; k++) { var a = ang + (Math.random() - 0.5) * 2 * half; var sp = 6 + Math.random() * len * 1.5; g.fx.emit(o0.x, o0.y, o0.z, { n: 1, color: col, color2: "#ffffff", speed: 0.1, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, vy: -1.2 + Math.random() * 0.6, size: 0.55, life: 0.55, grav: 0, drag: 2.2, alpha: 0.9 }); }
  g.fx.kick(0.2);
  var hits = B.foesOf(g, m).filter(function (e) { var dx = e.x - m.x, dz = e.z - m.z, dd = Math.hypot(dx, dz); if (dd > len + B.radius(e)) return false; var aa = Math.atan2(dx, dz); return Math.abs(Math.atan2(Math.sin(aa - ang), Math.cos(aa - ang))) <= half || dd < 1.5; });
  hits.forEach(function (e) { B.strikeAt(g, m, e, { attack: atk, ranged: true, tag: "breath" }); });
  m.breathCD = 3; yield 0.5;
}
function* quakeGen(g, m, atk) {
  g.pushLog(B.nameOf(m) + " brings down a " + atk.name + "!", "hurt"); m.attackT = 0.9; m.attackDur = 0.9; yield 0.5; g.fx.ring(m.x, m.y, m.z, "#a89a80", 6); g.fx.dust(m.x, m.y + 0.3, m.z, "#8a7a60", 30); g.fx.kick(0.3);
  B.foesOf(g, m).filter(function (e) { return B.dist(m, e) <= 5.5; }).forEach(function (e) { B.strikeAt(g, m, e, { attack: atk, ranged: false, tag: "area" }); }); yield 0.4;
}

// ------------------------------------------------------------------ choosing
function isCaster(g, e) { if (e.kind === "player") return /Mage|Cleric|Druid|Bard|Occultist/.test(g.calling()); if (e.kind === "ally") return /Mage|Cleric|Druid|Bard|Occultist|Healer/i.test(String(e.sheet.class || e.sheet.calling || "") + " " + String(e.role || "")); return false; }
function pickTarget(g, m, foes, P) {
  var best = null, bs = 1e9; var group = foes.length;
  foes.forEach(function (f) {
    var d = B.dist(m, f); var s = d; if ((B.hasSt(f, "invisible") || B.hasSt(f, "hidden")) && d > 2.2) s += 18;
    if (P.focusWeak) s += (f.hp / Math.max(1, f.maxHp)) * 14; if (P.focusCaster && isCaster(g, f)) s -= 12;
    if (B.hasSt(f, "unconscious")) s += 8; if (m.lastTarget === f.id) s -= 2.5;
    if (P.pack || P.focusWeak) { var near = 99; foes.forEach(function (o) { if (o !== f) near = Math.min(near, B.dist(o, f)); }); if (near < 99) s -= Math.min(near, 12) * 0.35; }
    if (f.mon && B.sideOf(f) === "party") s -= 3; if (s < bs) { bs = s; best = f; }
  }); return best;
}
function shouldFlee(g, m, P) {
  if (P.mindless || B.hasSt(m, "controlled")) return false; var frac = m.hp / m.maxHp; var b = g.battle;
  if (m.flees || P.fleeish) { if (frac < 0.25) return true; }
  else if (frac < 0.15 && !P.berserk) return true;
  if (P.berserk && frac < 0.35) return false;
  var kin = g.monsters.filter(function (o) { return o.inBattle && o.mon.id === m.mon.id; }).length; var start = b.startCount && b.startCount[m.mon.id] || kin; var dead = start - kin;
  if (start >= 3 && dead >= Math.ceil(start / 2) && !P.mindless && !m.moraleChecked) { m.moraleChecked = true; var r = R.roll3d6(); var fled = r.total <= 8; g.pushLog("Morale — " + B.nameOf(m) + " 3d6(" + r.dice.join(",") + ")=" + r.total + (fled ? " ≤ 8: breaks and runs" : ": holds its ground"), "info"); return fled; }
  return false;
}
function flankPoint(g, m, t, stop) {
  var ally = null, bd = 1e9; g.monsters.forEach(function (o) { if (o === m || !o.inBattle || o.dead || B.sideOf(o) !== B.sideOf(m)) return; var d = B.dist(o, t); if (d < bd && d < 6) { bd = d; ally = o; } });
  var ang = ally ? Math.atan2(ally.x - t.x, ally.z - t.z) + Math.PI : Math.atan2(m.x - t.x, m.z - t.z) + (Math.random() < 0.5 ? 0.9 : -0.9);
  return { x: t.x + Math.sin(ang) * stop, z: t.z + Math.cos(ang) * stop };
}
function conePicks(g, m, len, half) {
  var foes = B.foesOf(g, m); var best = null, bn = 0; foes.forEach(function (f) { var ang = Math.atan2(f.x - m.x, f.z - m.z); var n = foes.filter(function (e) { var dx = e.x - m.x, dz = e.z - m.z; var dd = Math.hypot(dx, dz); if (dd > len + B.radius(e)) return false; var aa = Math.atan2(dx, dz); return Math.abs(Math.atan2(Math.sin(aa - ang), Math.cos(aa - ang))) <= half; }).length; if (B.dist(m, f) <= len + B.radius(f) && n > bn) { bn = n; best = f; } }); return best ? { t: best, n: bn } : null;
}

// ------------------------------------------------------------------ the monster turn
export function* monsterTurn(g, c) {
  var m = c.e; var b = g.battle; var P = profile(m); m.reaction = 1; var ctrl = B.hasSt(m, "controlled");
  b.banner = { text: c.name, sub: ctrl ? "Under your command" : "Threat " + m.mon.threat, t: 0, foe: !ctrl }; yield 0.5;
  if (m.dead) { g.endTurnNow(); return; }
  var info = turnStart(g, m); if (m.dead) { g.endTurnNow(); return; }
  if (info.skip) { g.pushLog(B.nameOf(m) + " loses its turn (" + info.why + ").", "info"); yield 0.5; B.ageStatuses(g, m); g.endTurnNow(); return; }
  var mv = moveOf(m) * (info.slow ? 0.5 : 1); if (m.breathCD > 0) m.breathCD--;
  var foes = B.foesOf(g, m); if (!foes.length) { yield 0.2; B.ageStatuses(g, m); g.endTurnNow(); return; }
  // fleeing: the animal's morale or a hex
  if (!info.rooted && (info.flee || shouldFlee(g, m, P))) {
    var near = foes.slice().sort(function (a, b2) { return B.dist(m, a) - B.dist(m, b2); })[0]; var ax = m.x - near.x, az = m.z - near.z, l = Math.hypot(ax, az) || 1;
    g.pushLog(B.nameOf(m) + (info.flee ? " wanders off, nudged to leave." : " flees!"), "info");
    yield* walkTo(g, m, m.x + ax / l * mv * 2, m.z + az / l * mv * 2, mv * 2, 0, { dash: true });
    var far = foes.every(function (f) { return B.dist(m, f) > 13; }); if (far && !info.flee) { m.fled = true; m.inBattle = false; m.aggro = false; m.state = "return"; m.calmUntil = g.time + 90; g.combatNote("fled", m); g.pushLog(B.nameOf(m) + " escapes.", "info"); }
    B.ageStatuses(g, m); yield 0.2; g.endTurnNow(); return;
  }
  var tgt = pickTarget(g, m, foes, P); m.lastTarget = tgt.id;
  var d = B.dist(m, tgt); var reach = meleeReach(m, tgt); var stop = B.radius(m) + B.radius(tgt) + 0.95; var left = info.rooted ? 0 : mv;
  var bonus = P.berserk && m.hp < m.maxHp * 0.35 ? 2 : 0;
  // 1. breath when it will hit something
  if (P.breath && !(m.breathCD > 0)) { var cp = conePicks(g, m, m.mon.threat >= 5 ? 14 : 10, 0.5); if (!cp && !info.rooted && d > reach) { var pre = Math.min(left, Math.max(0, d - 8)); if (pre > 0.5) { yield* walkTo(g, m, tgt.x, tgt.z, pre, 6, {}); left -= pre; } cp = conePicks(g, m, m.mon.threat >= 5 ? 14 : 10, 0.5); } if (cp) { yield* breathGen(g, m, P.breath, cp.t); yield 0.3; B.ageStatuses(g, m); g.endTurnNow(); return; } }
  // 2. area attacks when several foes are within range
  if (P.area && B.foesOf(g, m).filter(function (f) { return B.dist(m, f) <= 5.5; }).length >= 2) { yield* quakeGen(g, m, P.area); yield 0.3; B.ageStatuses(g, m); g.endTurnNow(); return; }
  // 3. teleporters step behind their target
  if (P.teleport && !B.hasSt(m, "anchored") && d > reach + 1.5 && !info.rooted) { var dx = tgt.x - m.x, dz = tgt.z - m.z, dd = Math.hypot(dx, dz) || 1; var px = tgt.x + dx / dd * (stop + 0.1), pz = tgt.z + dz / dd * (stop + 0.1); g.fx.burst(m.x, m.y + 1, m.z, "#a06ad0", false); m.x = px; m.z = pz; g.fx.burst(m.x, m.y + 1, m.z, "#a06ad0", false); g.pushLog(B.nameOf(m) + " blinks behind " + B.nameOf(tgt) + ".", "info"); face(m, tgt); d = B.dist(m, tgt); yield 0.4; }
  // 4. ranged creatures keep their distance
  var useRanged = P.ranged.length && (P.rangedOnly || (P.kite && d > reach) || (d > reach + 2.5 && d <= P.rangedM));
  if (P.kite && P.ranged.length && d < 4.5 && left > 1 && !info.rooted && !m.fly) { var ax2 = m.x - tgt.x, az2 = m.z - tgt.z, l2 = Math.hypot(ax2, az2) || 1; var back = Math.min(left, 7); g.pushLog(B.nameOf(m) + " backs away to shoot.", "info"); yield* walkTo(g, m, m.x + ax2 / l2 * back, m.z + az2 / l2 * back, back, 0, {}); left -= back; d = B.dist(m, tgt); }
  if (useRanged) {
    if (d > P.rangedM && left > 0.5) { var adv = Math.min(left, d - P.rangedM + 1); yield* walkTo(g, m, tgt.x, tgt.z, adv, 0, {}); left -= adv; d = B.dist(m, tgt); }
    if (d <= P.rangedM + 0.5 && !m.dead) { yield* strikeGen(g, m, tgt, { ranged: true, attack: P.ranged[Math.floor(Math.random() * P.ranged.length)], bonus: bonus }); B.ageStatuses(g, m); yield 0.2; g.endTurnNow(); return; }
  }
  // 5. close with the target (flanking if it hunts in packs), then strike
  if (d > reach - 0.1 && left > 0.3 && !info.rooted) {
    var dest = P.pack && foes.length ? flankPoint(g, m, tgt, stop) : { x: tgt.x, z: tgt.z }; var st2 = P.pack ? 0.3 : stop; var charge = /charge|rush|pounce|dive|leap/.test((P.melee[0] ? P.melee[0].name : "") + " " + P.tac) && d >= 4;
    yield* walkTo(g, m, dest.x, dest.z, left, st2, { dash: false }); d = B.dist(m, tgt);
    if (d > reach + 0.3 && P.pack) { yield* walkTo(g, m, tgt.x, tgt.z, Math.max(0, mv - (mv - left)) * 0.3 + 1.5, stop, {}); d = B.dist(m, tgt); }
    if (d <= reach + 0.3 && charge && /charge/.test(P.melee[0] ? P.melee[0].name : "")) m.charged = true;
  }
  if (!m.dead && d <= reach + 0.3) {
    yield* strikeGen(g, m, tgt, { ranged: false, bonus: bonus + (m.charged ? 0 : 0), attack: P.melee.length ? P.melee[Math.floor(Math.random() * P.melee.length)] : undefined });
    if (m.mon.threat >= 3 && (m.mon.attacks || []).length >= 2 && !g.down && !m.dead && !tgt.dead && B.dist(m, tgt) <= reach + 0.3) { yield 0.2; yield* strikeGen(g, m, tgt, { ranged: false, bonus: bonus }); }
    if (m.charged) { m.charged = false; B.addSt(g, m, { id: "overrun", name: "Overextended", rounds: 1, ev: -2 }, m); g.pushLog(B.nameOf(m) + " overruns — poor turning radius, −2 Evasion until its next turn.", "info"); }
    // fliers and skirmishers withdraw after striking
    if (P.hitRun && !m.dead && !info.rooted) { var rest = Math.min(left, 6); if (rest > 2) { var ax3 = m.x - tgt.x, az3 = m.z - tgt.z, l3 = Math.hypot(ax3, az3) || 1; yield* walkTo(g, m, m.x + ax3 / l3 * rest, m.z + az3 / l3 * rest, rest, 0, { free: true }); } }
  } else if (!m.dead && P.ranged.length && d <= P.rangedM + 0.5) { yield* strikeGen(g, m, tgt, { ranged: true, attack: P.ranged[0] }); }
  else if (!m.dead && !info.rooted) { g.pushLog(B.nameOf(m) + " closes in.", "info"); }
  if (m.fly && !m.dead) m.airT = B.dist(m, tgt) <= reach + 0.5 && !P.hitRun ? 0.15 : 1;
  B.ageStatuses(g, m); yield 0.3; g.endTurnNow();
}

// start of an actor's turn: zone burns, damage over time, hexes that cost the turn
export function turnStart(g, e) {
  var info = { skip: false, why: "", rooted: B.hasSt(e, "rooted"), slow: B.hasSt(e, "slowed") || B.zoneSlow(g, e), flee: B.hasSt(e, "nudged") };
  B.zonesTurnStart(g, e); (e.st || []).forEach(function (s) { if (s.dot && !e.dead) { var r = R.rollDice(s.dot[0], s.dot[1]); var res = B.dealDamage(g, null, e, r.total, { el: s.dot[2], magic: true }); g.pushLog("(" + s.name + " — " + s.dot[0] + "d" + s.dot[1] + "=" + r.total + " to " + B.nameOf(e) + ")", "hurt"); } });
  SC.auraStrikes(g, e);
  if (B.hasSt(e, "unconscious")) { info.skip = true; info.why = "unconscious"; } else if (B.hasSt(e, "commanded")) { info.skip = true; info.why = "commanded to stand still"; }
  return info;
}

// ------------------------------------------------------------------ companions
function econ(a) { a.econ = { action: 1, bonus: 1, move: MOVE_M, moveMax: MOVE_M }; a.reaction = 1; }
function pctHp(e) { return e.hp / Math.max(1, e.maxHp); }
function bestHeal(g, a) { return SC.known(g, a).map(function (sp) { return { sp: sp, d: S.describeSpell(sp) }; }).filter(function (x) { return x.d.kind === "heal" && SC.state(g, a, x.sp).ok; }).sort(function (p, q) { return (q.sp.dice ? q.sp.dice[0] * q.sp.dice[1] : 0) - (p.sp.dice ? p.sp.dice[0] * p.sp.dice[1] : 0); })[0]; }
function bestAttackSpell(g, a, foes) {
  var best = null, bs = -1; SC.known(g, a).forEach(function (sp) { var st = SC.state(g, a, sp); if (!st.ok || !sp.dice) return; var d = st.d; if (["bolt", "arc", "burst", "cone", "line"].indexOf(d.kind) < 0) return; var avg = sp.dice[0] * (sp.dice[1] + 1) / 2; var score = avg + (d.kind === "burst" || d.kind === "cone" ? 3 : 0); if (a.mp - st.mp < 0) return; if (score > bs) { bs = score; best = { sp: sp, d: d, st: st }; } }); return best;
}
function aimForSpell(g, a, x, foes) {
  var d = x.d, sp = x.sp; var tgt = foes.slice().sort(function (p, q) { return (B.dist(a, p) + pctHp(p) * 6) - (B.dist(a, q) + pctHp(q) * 6); })[0]; if (!tgt) return null;
  if (d.tgt === "foe") return { e: tgt, x: tgt.x, z: tgt.z };
  if (d.kind === "burst") { var r = d.area || 4.6; var bestC = null, bn = 0; foes.forEach(function (f) { var inside = foes.filter(function (o) { return B.dist(o, f) <= r; }).length; var ff = B.partySide(g).filter(function (o) { return B.dist(o, f) <= r + 0.5; }).length; var sc = inside - ff * 2; if (sc > bn && B.dist(a, f) <= d.maxR) { bn = sc; bestC = f; } }); return bestC ? { x: bestC.x, z: bestC.z } : null; }
  if (d.tgt === "dir") { var dd = B.dist(a, tgt); var ff2 = B.partySide(g).filter(function (o) { return o !== a && B.dist(a, o) < dd; }); if (ff2.length && ff2.some(function (o) { return Math.abs(Math.atan2(Math.sin(Math.atan2(o.x - a.x, o.z - a.z) - Math.atan2(tgt.x - a.x, tgt.z - a.z)), Math.cos(Math.atan2(o.x - a.x, o.z - a.z) - Math.atan2(tgt.x - a.x, tgt.z - a.z)))) < 0.4; })) return null; return { x: tgt.x, z: tgt.z }; }
  return { x: tgt.x, z: tgt.z };
}
export function* allyTurn(g, c) {
  var a = c.e; var b = g.battle; econ(a); b.banner = { text: a.name, sub: "Companion", t: 0, ally: true }; yield 0.45;
  if (a.dead) { g.endTurnNow(); return; }
  var info = turnStart(g, a); if (a.dead) { g.endTurnNow(); return; }
  if (info.skip) { g.pushLog(a.name + " cannot act (" + info.why + ").", "info"); yield 0.4; B.ageStatuses(g, a); g.endTurnNow(); return; }
  if (info.rooted) a.econ.move = 0; if (info.slow) a.econ.move *= 0.5;
  var foes = B.foesOf(g, a); if (!foes.length) { B.ageStatuses(g, a); g.endTurnNow(); return; }
  var sheet = a.sheet; var w = R.weaponProfile(sheet); var all = B.partySide(g).filter(function (x) { return !x.mon && x.hp > 0 && !x.dead; });
  // retreat when badly hurt: drink a potion if one is carried, otherwise fall back toward the leader
  if (pctHp(a) < 0.3) {
    var pot = I.combatItems(g.allyPack(a), null).find(function (x) { return x.kind === "heal"; });
    if (pot && a.econ.bonus) { yield* g.allyUseItem(a, pot); }
  }
  // healing a friend or themselves
  var hurt = all.slice().sort(function (p, q) { return pctHp(p) - pctHp(q); })[0]; var heal = hurt && pctHp(hurt) < 0.5 ? bestHeal(g, a) : null;
  if (heal && a.econ.action) { var need = B.dist(a, hurt) - (B.radius(a) + B.radius(hurt) + 1.5); if (need > 0 && a.econ.move > 0) { yield* walkTo(g, a, hurt.x, hurt.z, Math.min(need + 0.3, a.econ.move), B.radius(a) + B.radius(hurt) + 0.8, {}); a.econ.move = Math.max(0, a.econ.move - need); } if (B.dist(a, hurt) <= 1.9 + B.radius(hurt) + 0.2) { var pre = SC.prepare(g, a, heal.sp, { e: hurt, x: hurt.x, z: hurt.z }); if (pre && pre.gen) yield* pre.gen; } }
  // techniques that cost the bonus action
  var kit = R.CALLING_KIT[String(sheet.class || sheet.calling || "")] || null; if (kit && a.econ.bonus && pctHp(a) < 0.5) { var sw = (kit.tech || []).find(function (t) { return t.id === "second-wind"; }); if (sw && a.sp >= sw.sp && !a.usedSW) { a.usedSW = true; a.sp -= sw.sp; a.econ.bonus = 0; B.healEntity(g, a, a, Math.max(2, Math.floor(a.maxHp * 0.1))); g.pushLog("(" + a.name + " uses Second Wind)", "heal"); g.fx.motes(a.x, a.y + 0.3, a.z, "#ffe08a", 16); yield 0.5; } }
  // spells
  if (a.econ.action) { var x = bestAttackSpell(g, a, foes); if (x) { var aim = aimForSpell(g, a, x, foes); if (aim) { var pl = SC.plan(g, a, x.sp, aim); if (!pl.ok && x.d.maxR && aim.e) { var gap = B.dist(a, aim.e) - x.d.maxR + 1; if (gap > 0 && a.econ.move > 0) { yield* walkTo(g, a, aim.e.x, aim.e.z, Math.min(gap, a.econ.move), 0, {}); a.econ.move = Math.max(0, a.econ.move - gap); pl = SC.plan(g, a, x.sp, aim); } } if (pl.ok && !pl.hits.some(function (h) { return !h.mon && h !== a && x.d.kind !== "bolt" && x.d.kind !== "arc"; })) { var pre2 = SC.prepare(g, a, x.sp, aim); if (pre2 && pre2.gen) yield* pre2.gen; } } } }
  // weapon
  if (a.econ.action && !a.dead) {
    var tgt = foes.slice().sort(function (p, q) { return (B.dist(a, p) + pctHp(p) * 5) - (B.dist(a, q) + pctHp(q) * 5); })[0]; var reach = weaponReach(w, tgt); var d = B.dist(a, tgt);
    if (w.ranged) { if (d < 3 && a.econ.move > 1) { var ax = a.x - tgt.x, az = a.z - tgt.z, l = Math.hypot(ax, az) || 1; yield* walkTo(g, a, a.x + ax / l * 5, a.z + az / l * 5, Math.min(5, a.econ.move), 0, {}); a.econ.move = Math.max(0, a.econ.move - 5); d = B.dist(a, tgt); } if (d > 26 && a.econ.move > 0) { var adv = Math.min(a.econ.move, d - 22); yield* walkTo(g, a, tgt.x, tgt.z, adv, 0, {}); a.econ.move -= adv; d = B.dist(a, tgt); } }
    else if (d > reach - 0.3 && a.econ.move > 0.3) { var need2 = d - (reach - 0.4); var dest = tgt; yield* walkTo(g, a, dest.x, dest.z, Math.min(a.econ.move, need2 + 0.2), reach - 0.4, {}); a.econ.move = Math.max(0, a.econ.move - need2); d = B.dist(a, tgt); }
    if (d <= reach + 0.2 && !tgt.dead) { a.econ.action = 0; yield* swingGen(g, a, tgt, {}); }
  }
  B.ageStatuses(g, a); yield 0.3; g.endTurnNow();
}
