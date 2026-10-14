// @ts-nocheck
// Turn-based encounters in the manner of Baldur's Gate 3. Exploration runs in real time;
// the moment a hostile notices you, or you strike first, the world drops into rounds.
// Everyone rolls initiative (3d6 + Agility for you, 3d6 + Threat for monsters). On your
// turn you have an Action, a Bonus Action, a Reaction and 9 m (30 ft) of movement. Each
// round is six seconds of world time. Monsters take their turns through small scripted
// sequences (generators) so movement, swings, impacts and reactions play out in order.
import { T } from "./three";
import { MILE, landSD } from "./worldgen";
import { playAction, attackClip, CLIPS } from "./anim";
import * as R from "./rules";

export var MOVE_M = 9;
export var ROUND_SEC = 6;
var JOIN_R = 24, ESCAPE_R = 30;

function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function lerpAngle(a, b, t) { var d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * Math.min(1, t); }

// ------------------------------------------------------------------ geometry of a fight
export function radius(m) { var a = m.c.arch, s = m.c.size || 1; return a === "humanoid" ? 0.42 : a === "brute" ? 0.62 : a === "winged" ? 0.5 + s * 0.45 : a === "serpent" ? 0.4 + s * 0.35 : a === "wisp" ? 0.45 : 0.3 + s * 0.33; }
export function monsterReach(m) { return radius(m) + 0.4 + 1.5; }
export function playerReach(g, m, w) { w = w || R.weaponProfile(g.v); return radius(m) + 0.4 + (w.ranged ? 30 : w.kind === "spear" ? 2.4 : 1.6); }
export function moveOf(m) { var a = m.c.arch; return a === "canine" || a === "winged" ? 12 : a === "brute" ? 7.5 : a === "bug" ? 10 : a === "serpent" ? 8 : 9; }
function encumbrance(g) { var e = g.v.encumbrance; return e === "Overloaded" ? 0.5 : e === "Heavily Encumbered" ? 0.7 : 1; }

// ------------------------------------------------------------------ state queries
export function myTurn(g) { var b = g.battle; return !!(b && b.active && b.active.kind === "player"); }
export function busy(g) { var b = g.battle; return !!(b && (b.script || b.queue.length)); }
export function ready(g) { return myTurn(g) && !busy(g) && !g.down; }
export function canAct(g, cost) {
  var b = g.battle; if (!b) return true;
  if (!myTurn(g)) { g.toast("Wait for your turn.", "info"); return false; }
  if (busy(g)) return false;
  if (cost && !b.econ[cost]) { g.toast(cost === "action" ? "Your Action is spent this turn. Move, use a Bonus Action, or End Turn." : "Your Bonus Action is spent this turn.", "info"); return false; }
  return true;
}
export function spend(g, cost) { if (g.battle && cost) g.battle.econ[cost] = 0; }

// ------------------------------------------------------------------ scripts
export function run(g, gen, front) { var b = g.battle; if (!b) { drain(gen); return; } if (!b.script) { b.script = gen; b.sw = 0; } else if (front) b.queue.unshift(gen); else b.queue.push(gen); }
// outside a battle a script just runs instantly (no waits), so callers need not care
function drain(gen) { try { var r; var n = 0; do { r = gen.next(); } while (!r.done && n++ < 400); } catch (e) { console.error(e); } }
function tick(g, dt) {
  var b = g.battle; var guard = 0;
  while (b && b.script && guard++ < 20) {
    if (typeof b.sw === "function") { if (!b.sw()) return; b.sw = 0; }
    else if (b.sw > 0) { b.sw -= dt; if (b.sw > 0) return; b.sw = 0; }
    var r; try { r = b.script.next(); } catch (e) { console.error(e); r = { done: true }; }
    if (r.done) { b.script = b.queue.length ? b.queue.shift() : null; b.sw = 0; if (checkEnd(g)) return; b = g.battle; continue; }
    b.sw = r.value || 0; return;
  }
}

// ------------------------------------------------------------------ start, join, finish
export function engage(g, m, opts) {
  if (g.down || m.dead) return;
  if (g.battle) { if (!m.inBattle) join(g, m, false); return; }
  startBattle(g, m, opts || {});
}
export function startBattle(g, opener, opts) {
  opts = opts || {};
  g.endTalk && g.endTalk(); g.autoMove = null;
  var b = g.battle = { round: 1, order: [], idx: -1, active: null, script: null, queue: [], sw: 0, next: null, wait: 0, econ: { action: 0, bonus: 0, move: 0, moveMax: MOVE_M }, reaction: 1, banner: { text: "Combat", sub: "Roll for initiative", t: 0 }, pending: opts.pending || null, t: 0 };
  g.beginEncounter(opener);
  var ag = R.attrMod((g.v.attributes || {}).agility); var pr = R.roll3d6();
  b.order.push({ kind: "player", id: "player", name: g.v["player-name"] || "You", roll: pr.total + ag, init: pr.total + ag + (opts.playerFirst ? 100 : 0), surprise: !!opts.playerFirst });
  g.monsters.forEach(function (m) {
    if (m.dead || m.inBattle || m.fled) return;
    var near = m === opener || (!m.passive && !(m.calmUntil > g.time) && (dist(m, g.pos) < JOIN_R || (opener && m.mon.id === opener.mon.id && dist(m, opener) < 14)));
    if (near) join(g, m, true);
  });
  b.order.sort(function (x, y) { return y.init - x.init || (x.kind === "player" ? -1 : 1); });
  g.prevCam = { dist: g.camDist, pitch: g.camPitch }; g.camDist = Math.max(g.camDist, 12); g.camPitch = Math.max(g.camPitch, 0.78);
  g.pushLog("Combat! Initiative — " + b.order.map(function (c) { return c.name + " " + c.roll; }).join(", ") + (opts.playerFirst ? ". You strike first." : "."), "info");
  b.next = "turn"; b.wait = 1.0;
}
function join(g, m, quiet) {
  var b = g.battle; if (!b || m.inBattle) return; m.inBattle = true; m.aggro = true; m.autoT = 0;
  var r = R.roll3d6(); var init = r.total + Math.min(4, m.mon.threat) + (m.c.arch === "canine" ? 2 : 0);
  var same = b.order.filter(function (c) { return c.m && c.m.mon.name === m.mon.name; }).length; m.tag = same ? " " + String.fromCharCode(65 + same) : "";
  if (same === 1) { var first = b.order.find(function (c) { return c.m && c.m.mon.name === m.mon.name; }); if (first && !first.m.tag) { first.m.tag = " A"; first.name = first.m.mon.name + " A"; } m.tag = " B"; }
  var c = { kind: "monster", id: m.id, m: m, name: m.mon.name + (m.tag || ""), roll: init, init: init, reaction: 1 };
  if (b.idx < 0) b.order.push(c);
  else { var at = b.order.findIndex(function (x) { return x.init < init; }); if (at < 0) at = b.order.length; if (at <= b.idx) b.idx++; b.order.splice(at, 0, c); }
  g.noteFoe(m); if (!g.target || g.target.dead) g.target = m;
  if (!quiet) g.pushLog(c.name + " joins the fight (initiative " + init + ").", "hurt");
}
function checkEnd(g) {
  var b = g.battle; if (!b) return true;
  if (g.down) { finish(g, "fell"); return true; }
  var foes = b.order.filter(function (c) { return c.m && !c.m.dead && !c.m.fled; });
  if (!foes.length) { finish(g, "won"); return true; }
  return false;
}
export function finish(g, why) {
  var b = g.battle; if (!b) return; g.battle = null;
  b.order.forEach(function (c) { if (!c.m) return; c.m.inBattle = false; c.m.gait = 0; if (!c.m.dead) { c.m.aggro = false; c.m.state = "return"; c.m.calmUntil = g.time + 25; } });
  if (g.prevCam) { g.camDist = g.prevCam.dist; g.camPitch = g.prevCam.pitch; g.prevCam = null; }
  g.autoMove = null; g.dodging = false; g.disengaged = false; g.buffs.blessing = 0;
  if (g.combatSummary) g.combatSummary.rounds = b.round;
  g.after = { text: why === "won" ? "Victory" : why === "escaped" ? "Escaped" : why === "fell" ? "Defeat" : "Combat Ends", t: 0 };
  if (why === "escaped") g.pushLog("You slip away from the fight.", "info");
  if (why === "won") g.bridge.sfx && g.bridge.sfx("sfx-victory-medieval");
  g.closeCombat(true);
}

// ------------------------------------------------------------------ turns
export function update(g, dt) {
  var b = g.battle; if (!b) { if (g.after) { g.after.t += dt; if (g.after.t > 2) g.after = null; } return; }
  g.dtc = dt; b.t += dt; if (b.banner) { b.banner.t += dt; if (b.banner.t > 1.5) b.banner = null; }
  if (b.script || b.queue.length) { if (!b.script) { b.script = b.queue.shift(); b.sw = 0; } tick(g, dt); return; }
  if (b.next === "turn") { b.wait -= dt; if (b.wait <= 0) { b.next = null; nextTurn(g); } }
  // hostiles that wander close during the fight join it at once
  b.joinT = (b.joinT || 0) + dt; if (b.joinT > 0.5) { b.joinT = 0; g.monsters.forEach(function (m) { if (!m.dead && !m.inBattle && !m.passive && !m.fled && !(m.calmUntil > g.time) && dist(m, g.pos) < 13 + m.mon.threat * 3) join(g, m, false); }); }
}
function nextTurn(g) {
  var b = g.battle; if (!b || checkEnd(g)) return;
  for (var guard = 0; guard < 60; guard++) {
    b.idx++;
    if (b.idx >= b.order.length) { b.idx = 0; newRound(g); if (!g.battle) return; }
    var c = b.order[b.idx]; if (c.kind === "player" || (c.m && !c.m.dead && !c.m.fled)) break;
  }
  var c = b.order[b.idx]; b.active = c;
  if (c.kind === "player") playerTurn(g); else run(g, monsterTurn(g, c));
}
function newRound(g) {
  var b = g.battle; b.round++; g.clock += ROUND_SEC / 60;
  b.order = b.order.filter(function (c) { return c.kind === "player" || (c.m && !c.m.dead && !c.m.fled); });
  g.pushLog("— Round " + b.round + " —", "info");
}
function playerTurn(g) {
  var b = g.battle; var mv = Math.round(MOVE_M * encumbrance(g) * 10) / 10;
  b.econ = { action: 1, bonus: 1, move: mv, moveMax: mv }; b.reaction = 1; b.sneak = 0; g.dodging = false; g.disengaged = false;
  b.banner = { text: "Your Turn", sub: b.round === 1 && b.order[0].surprise ? "Surprise — you strike first" : "Action · Bonus Action · " + mv + " m", t: 0, mine: true };
  if (g.down) { endTurn(g); return; }
  if (b.pending) { var p = b.pending; b.pending = null; setTimeout(function () { if (g.battle === b && myTurn(g)) p(); }, 350); }
}
export function endTurn(g) {
  var b = g.battle; if (!b) return;
  if (b.active && b.active.kind === "player") {
    if (busy(g)) return;
    var foes = b.order.filter(function (c) { return c.m && !c.m.dead && !c.m.fled; });
    if (foes.length && foes.every(function (c) { return dist(c.m, g.pos) > ESCAPE_R; })) { finish(g, "escaped"); return; }
  }
  g.autoMove = null; b.active = null; b.next = "turn"; b.wait = 0.3;
}

// ------------------------------------------------------------------ monsters
function* monsterTurn(g, c) {
  var b = g.battle, m = c.m; c.reaction = 1;
  b.banner = { text: c.name, sub: "Threat " + m.mon.threat, t: 0, foe: true };
  yield 0.55;
  if (m.dead || g.down) { endTurn(g); return; }
  var mv = moveOf(m), reach = monsterReach(m), d = dist(m, g.pos);
  if (m.flees && m.hp < m.maxHp * 0.3) {
    var ax = m.x - g.pos.x, az = m.z - g.pos.z, l = Math.hypot(ax, az) || 1;
    yield* walk(g, m, m.x + ax / l * mv * 2, m.z + az / l * mv * 2, mv * 2, 0);
    if (dist(m, g.pos) > 12) { m.fled = true; m.inBattle = false; m.aggro = false; m.state = "return"; m.calmUntil = g.time + 90; g.combatNote("fled", m); g.pushLog(c.name + " flees the fight!", "info"); }
    yield 0.2; endTurn(g); return;
  }
  var useRanged = m.ranged && d > reach + 0.5 && d < 24;
  if (!useRanged) {
    var stop = radius(m) + 0.4 + 0.95;
    if (d > reach - 0.15) { yield* walk(g, m, g.pos.x, g.pos.z, mv, stop); d = dist(m, g.pos); }
    if (d <= reach && !m.dead) {
      yield* strike(g, m, false);
      if (m.mon.threat >= 3 && (m.mon.attacks || []).length >= 2 && !g.down && !m.dead) { yield 0.2; yield* strike(g, m, false); }
    } else if (m.ranged && d < 24 && !m.dead) yield* strike(g, m, true);
    else if (!m.dead && d > reach) { b.banner = { text: c.name, sub: "Dashes", t: 0, foe: true }; yield* walk(g, m, g.pos.x, g.pos.z, mv, stop); }
  } else yield* strike(g, m, true);
  yield 0.35; endTurn(g);
}
function* walk(g, m, tx, tz, maxD, stop) {
  var moved = 0, pr = playerReach(g, m), wasIn = dist(m, g.pos) <= pr, stuck = 0;
  while (moved < maxD - 0.02 && !m.dead) {
    var dx = tx - m.x, dz = tz - m.z, d = Math.hypot(dx, dz); var left = Math.min(d - stop, maxD - moved); if (left <= 0.03) break;
    var sp = Math.min(9, m.speed * 0.8), step = Math.min(left, sp * (g.dtc || 0.016));
    var nx = m.x + dx / d * step, nz = m.z + dz / d * step;
    if (landSD(nx / MILE, -nz / MILE) <= 0.02 || g.terrain.groundAt(nx, nz) < -1.3) break;
    var p = g.collide(nx, nz, radius(m) * 0.6); p = separate(g, m, p.x, p.z);
    var adv = Math.hypot(p.x - m.x, p.z - m.z); if (adv < step * 0.25) { if (++stuck > 8) break; } else stuck = 0;
    m.x = p.x; m.z = p.z; moved += Math.max(adv, step * 0.25); m.yaw = lerpAngle(m.yaw, Math.atan2(dx, dz), (g.dtc || 0.016) * 12); m.gait = sp;
    var inNow = dist(m, g.pos) <= pr;
    if (wasIn && !inNow && g.battle && g.battle.reaction && !g.down && !R.weaponProfile(g.v).ranged) { g.battle.reaction = 0; m.gait = 0; g.pushLog("Reaction — opportunity attack on " + m.mon.name + (m.tag || "") + ".", "info"); yield* playerSwing(g, m, { free: true }); if (m.dead) break; }
    wasIn = inNow;
    yield 0;
  }
  m.gait = 0;
}
// keep bodies from overlapping
function separate(g, m, x, z) {
  var rm = radius(m); var b = g.battle;
  var pd = Math.hypot(x - g.pos.x, z - g.pos.z), pm = rm + 0.45; if (pd < pm && pd > 1e-4) { x = g.pos.x + (x - g.pos.x) / pd * pm; z = g.pos.z + (z - g.pos.z) / pd * pm; }
  if (b) b.order.forEach(function (c) { var o = c.m; if (!o || o === m || o.dead) return; var d = Math.hypot(x - o.x, z - o.z), mm = rm + radius(o) * 0.9; if (d < mm && d > 1e-4) { x = o.x + (x - o.x) / d * mm; z = o.z + (z - o.z) / d * mm; } });
  return { x: x, z: z };
}
function* strike(g, m, ranged, tag) {
  if (m.dead || g.down) return;
  m.yaw = Math.atan2(g.pos.x - m.x, g.pos.z - m.z);
  var h = m.c.parts.h; var fired = false, t0 = g.time;
  if (h) { playAction(h, ranged ? "bow" : attackClip(h.weaponKind), function (ev) { if (ev === "hit" || ev === "release") fired = true; }); }
  else { m.attackT = 0.62; m.attackDur = 0.62; }
  if (!ranged || !h) g.bridge.sfx && g.bridge.sfx(h ? "sfx-sword-swing" : /wolf|hound|jackal/i.test(m.mon.name) ? "sfx-wolf-growl" : "sfx-monster-growl");
  yield function () { return fired || (!h && g.time - t0 > 0.3) || g.time - t0 > 1.4; };
  if (ranged) {
    var done = false; var elem = /spit|breath|bolt|spells/.test(m.ranged ? m.ranged.name : "") ? (/fire|flame|breath/.test(m.ranged.name) ? "fire" : /frost|ice/.test(m.ranged.name) ? "cold" : "umbral") : null;
    g.projectile({ x: g.pos.x, z: g.pos.z, y: g.pos.y, c: { height: 1.6 } }, elem ? "bolt" : "arrow", function () { g.monsterHit(m, true, tag); done = true; }, m, elem);
    yield function () { return done || g.time - t0 > 3; };
  } else g.monsterHit(m, false, tag);
  yield 0.4;
}

// ------------------------------------------------------------------ the player's actions
// Approach (if needed) and swing. Returns false if it could not be attempted.
export function attack(g, m, opts) {
  opts = opts || {}; var b = g.battle; var w = R.weaponProfile(g.v);
  if (!b) { engage(g, m, { playerFirst: true, pending: function () { attack(g, m, opts); } }); return true; }
  if (!canAct(g, opts.cost === undefined ? "action" : opts.cost)) return false;
  if (!m.inBattle) join(g, m, false);
  var reach = playerReach(g, m, w), d = dist(m, g.pos);
  if (d > reach) {
    if (w.ranged) { g.toast("Out of range (" + Math.round(d) + " m).", "info"); return false; }
    var need = d - (reach - 0.3);
    if (need > b.econ.move + 0.05) { g.toast("Too far — " + need.toFixed(1) + " m away, " + b.econ.move.toFixed(1) + " m of movement left. Dash or move closer.", "info"); return false; }
  }
  run(g, (function* () {
    if (dist(m, g.pos) > reach) { g.autoMove = { x: m.x, z: m.z, stop: reach - 0.35, script: true }; yield function () { return !g.autoMove; }; if (g.down || m.dead || dist(m, g.pos) > reach + 0.05) return; }
    spend(g, opts.cost === undefined ? "action" : opts.cost);
    yield* playerSwing(g, m, opts);
    if (opts.twice && !m.dead && !g.down) { yield 0.1; yield* playerSwing(g, m, opts); }
  })());
  return true;
}
export function* playerSwing(g, m, opts) {
  opts = opts || {}; var w = R.weaponProfile(g.v); g.faceTarget(m);
  var clip = w.ranged ? "bow" : attackClip(w.kind); var fired = false, t0 = g.time;
  playAction(g.player, clip, function (e) { if (e === "hit" || e === "release") fired = true; });
  if (!w.ranged) g.bridge.sfx && g.bridge.sfx("sfx-sword-swing");
  yield function () { return fired || g.time - t0 > 1.5; };
  var res = g.rollAttack(m, opts);
  if (w.ranged) { var done = false; g.projectile(m, "arrow", function () { g.applyAttack(m, res, w.skill, opts); done = true; }); yield function () { return done || g.time - t0 > 3; }; }
  else g.applyAttack(m, res, w.skill, opts);
  yield 0.38;
}
// Generic animated action (spells, potions, techniques): play a clip, fire at its event.
export function act(g, clip, cost, onFire, opts) {
  opts = opts || {}; if (g.battle && !canAct(g, cost)) return false; spend(g, cost);
  var quick = !(CLIPS[clip] && CLIPS[clip].ev); var go = function* () { var fired = false, t0 = g.time; playAction(g.player, clip, function (e) { if (e === "release" || e === "use" || e === "hit") fired = true; }); yield function () { return fired || g.time - t0 > (quick ? 0.35 : 1.2); }; var w = onFire(); if (w && typeof w.next === "function") yield* w; yield opts.after == null ? 0.35 : opts.after; };
  if (g.battle) run(g, go()); else if (quick) { playAction(g.player, clip); var w0 = onFire(); if (w0 && typeof w0.next === "function") drain(w0); } else { var fired = false; playAction(g.player, clip, function (e) { if (!fired && (e === "release" || e === "use" || e === "hit")) { fired = true; var w = onFire(); if (w && typeof w.next === "function") drain(w); } }); }
  return true;
}
export function dash(g) { if (!canAct(g, "action")) return; spend(g, "action"); var b = g.battle; b.econ.move += b.econ.moveMax; b.econ.moveMax += b.econ.moveMax; g.pushLog("(Dash — movement doubled this turn)", "info"); g.fx && g.fx.dust(g.pos.x, g.pos.y + 0.2, g.pos.z); }
export function dodgeAction(g) { if (!canAct(g, "action")) return; spend(g, "action"); g.dodging = true; playAction(g.player, "block"); g.pushLog("(Dodge — +3 Evasion until your next turn)", "info"); }
// Called by the movement code after every step the player takes during their turn.
export function afterPlayerStep(g, ox, oz, d) {
  var b = g.battle; if (!b) return; b.econ.move = Math.max(0, b.econ.move - d);
  if (g.disengaged) return;
  var hits = b.order.filter(function (c) { if (!c.m || c.m.dead || !c.reaction) return false; var r = monsterReach(c.m); return Math.hypot(ox - c.m.x, oz - c.m.z) <= r && dist(c.m, g.pos) > r; });
  if (!hits.length) return;
  g.autoMove = null; g.move.x = g.move.y = 0;
  hits.forEach(function (c) { c.reaction = 0; g.pushLog(c.name + " takes an opportunity attack as you leave its reach.", "hurt"); run(g, strike(g, c.m, false, "opportunity"), true); });
}

// ------------------------------------------------------------------ previews & markers
export function preview(g, m) {
  var w = R.weaponProfile(g.v); var bonus = R.attackBonus(g.v) + g.situational(m) + g.conditionPenalty(); var p = R.chance3d6(m.mon.evasion - bonus); var dm = R.damageText(g.v, m.mon);
  var reach = playerReach(g, m, w), d = dist(m, g.pos), b = g.battle; var need = Math.max(0, d - (reach - 0.3));
  return { chance: Math.round(p * 100), dice: dm.dice, lo: dm.lo, hi: dm.hi, dist: d, inReach: d <= reach, ranged: w.ranged, approach: !w.ranged && d > reach ? need : 0, canReach: w.ranged ? d <= reach : !b || need <= b.econ.move + 0.05 };
}
function drape(geo, pts, w, g) {
  var P = geo.attributes.position.array; var n = Math.min(pts.length, P.length / 6);
  for (var i = 0; i < n; i++) { var a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)]; var tx = c.x - a.x, tz = c.z - a.z, l = Math.hypot(tx, tz) || 1; var nx = -tz / l * w, nz = tx / l * w; var p = pts[i];
    P[i * 6] = p.x + nx; P[i * 6 + 1] = g.terrain.groundAt(p.x + nx, p.z + nz) + 0.07; P[i * 6 + 2] = p.z + nz; P[i * 6 + 3] = p.x - nx; P[i * 6 + 4] = g.terrain.groundAt(p.x - nx, p.z - nz) + 0.07; P[i * 6 + 5] = p.z - nz; }
  geo.attributes.position.needsUpdate = true; geo.setDrawRange(0, Math.max(0, n - 1) * 6); geo.computeBoundingSphere();
}
function strip(N, color, opacity) {
  var THREE = T(); var g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 6), 3).setUsage(THREE.DynamicDrawUsage)); var idx = []; for (var i = 0; i < N - 1; i++) { var a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } g.setIndex(idx);
  var m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: opacity || 0.85, depthWrite: false, side: THREE.DoubleSide })); m.frustumCulled = false; m.renderOrder = 18; return m;
}
function disc(color, r0, r1) { var THREE = T(); var geo = new THREE.RingGeometry(r0, r1, 48); geo.rotateX(-Math.PI / 2); var m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = 18; return m; }
function ensure(g) {
  if (g.mk) return g.mk; var THREE = T();
  var mk = g.mk = { ring: strip(97, "#e8c860", 0.75), pathIn: strip(80, "#7ae07a", 0.85), pathOut: strip(80, "#e05a4a", 0.7), end: disc("#e8e0c0", 0.22, 0.34), target: disc("#e05040", 0.9, 1.0), hover: disc("#f0f0f0", 0.9, 1.0), active: disc("#f0c040", 0.95, 1.08), dest: disc("#e8e0c0", 0.16, 0.3) };
  Object.keys(mk).forEach(function (k) { mk[k].visible = false; g.scene.add(mk[k]); });
  return mk;
}
function place(g, o, x, z, s) { o.visible = true; o.position.set(x, g.terrain.groundAt(x, z) + 0.08, z); o.scale.setScalar(s || 1); }
export function drawMarkers(g) {
  var mk = ensure(g); var b = g.battle; Object.keys(mk).forEach(function (k) { mk[k].visible = false; });
  var t = g.time;
  if (g.target && !g.target.dead) place(g, mk.target, g.target.x, g.target.z, radius(g.target) * (1 + Math.sin(t * 4) * 0.03));
  var hv = g.hover && g.hover.m && !g.hover.m.dead ? g.hover.m : null; if (hv && hv !== g.target) place(g, mk.hover, hv.x, hv.z, radius(hv));
  if (!b) { if (g.autoMove && !g.autoMove.script) place(g, mk.dest, g.autoMove.x, g.autoMove.z, 1 + Math.sin(t * 6) * 0.1); return; }
  if (b.active && b.active.m && !b.active.m.dead) place(g, mk.active, b.active.m.x, b.active.m.z, radius(b.active.m));
  if (!ready(g)) return;
  // movement left, as a ring
  var r = b.econ.move; if (r > 0.15) { var pts = []; for (var i = 0; i <= 96; i++) { var a = i / 96 * Math.PI * 2; pts.push({ x: g.pos.x + Math.sin(a) * r, z: g.pos.z + Math.cos(a) * r }); } drape(mk.ring.geometry, pts, 0.05, g); mk.ring.visible = true; }
  // path preview to the hovered ground point (or to striking range of a hovered foe)
  var goal = null; if (g.hover && g.hover.ground) goal = { x: g.hover.ground.x, z: g.hover.ground.z, stop: 0 };
  else if (hv) { var w = R.weaponProfile(g.v); if (!w.ranged) goal = { x: hv.x, z: hv.z, stop: playerReach(g, hv, w) - 0.35 }; }
  if (goal) {
    var dx = goal.x - g.pos.x, dz = goal.z - g.pos.z, d = Math.hypot(dx, dz) - goal.stop; if (d > 0.1) {
      var ux = dx / (d + goal.stop), uz = dz / (d + goal.stop); var inLen = Math.min(d, b.econ.move);
      function seg(l0, l1) { var pts = []; var n = Math.max(2, Math.min(80, Math.ceil((l1 - l0) / 0.35) + 1)); for (var i = 0; i < n; i++) { var l = l0 + (l1 - l0) * i / (n - 1); pts.push({ x: g.pos.x + ux * l, z: g.pos.z + uz * l }); } return pts; }
      if (inLen > 0.05) { drape(mk.pathIn.geometry, seg(0.3, inLen), 0.07, g); mk.pathIn.visible = true; }
      if (d > inLen + 0.05) { drape(mk.pathOut.geometry, seg(inLen, d), 0.06, g); mk.pathOut.visible = true; }
      if (!hv) place(g, mk.end, g.pos.x + ux * Math.min(d, inLen), g.pos.z + uz * Math.min(d, inLen));
    }
  }
}
export function snapshot(g) {
  var b = g.battle; if (!b) return null;
  return { round: b.round, mine: ready(g), myTurn: myTurn(g), busy: busy(g), banner: b.banner, econ: { action: b.econ.action, bonus: b.econ.bonus, reaction: b.reaction, move: Math.round(b.econ.move * 10) / 10, moveMax: b.econ.moveMax },
    order: b.order.filter(function (c) { return c.kind === "player" || (c.m && !c.m.fled); }).map(function (c) { return { id: c.id, name: c.name, kind: c.kind, hp: c.m ? Math.max(0, Math.round(c.m.hp)) : Math.round(g.stats.hp), maxHp: c.m ? c.m.maxHp : g.stats.maxHp, active: b.active === c, dead: c.m ? c.m.dead : g.down, threat: c.m ? c.m.mon.threat : 0, arch: c.m ? c.m.c.arch : "player", init: c.roll, target: c.m && g.target === c.m }; }) };
}
