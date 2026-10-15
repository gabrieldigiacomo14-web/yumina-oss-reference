// @ts-nocheck
// Turn-based encounters in the manner of Baldur's Gate 3. Exploration runs in real time;
// the moment a hostile notices you, or you strike first, the world drops into rounds.
// Everyone rolls initiative (3d6 + Agility for you and your companions, 3d6 + Threat for
// monsters, per the Combat entry). On your turn you have an Action, a Bonus Action, a
// Reaction and 9 m (30 ft) of movement. Each round is six seconds of world time. Monsters
// and companions take their turns through scripts (ai.tsx) so movement, swings, impacts and
// reactions play out in order. The whole encounter is saved so a reload resumes it exactly.
import { T } from "./three";
import { playAction, attackClip, CLIPS } from "./anim";
import * as R from "./rules";
import * as B from "./cbase";
import * as AI from "./ai";
import * as SC from "./spellcast";

export var MOVE_M = AI.MOVE_M;
export var ROUND_SEC = B.ROUND_SEC;
var JOIN_R = 24, ESCAPE_R = 30;
export var dist = B.dist;
export var radius = B.radius;
export function monsterReach(m) { return AI.meleeReach(m, { kind: "player" }); }
export function playerReach(g, m, w) { w = w || R.weaponProfile(g.v); return AI.weaponReach(w, m); }
export var moveOf = AI.moveOf;
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
export function drain(gen) { try { var r; var n = 0; do { r = gen.next(); } while (!r.done && n++ < 400); } catch (e) { console.error(e); } }
function tick(g, dt) {
  var b = g.battle; var guard = 0;
  while (b && b.script && guard++ < 20) {
    if (typeof b.sw === "function") { if (!b.sw()) return; b.sw = 0; }
    else if (b.sw > 0) { b.sw -= dt; if (b.sw > 0) return; b.sw = 0; }
    var r; try { r = b.script.next(); } catch (e) { console.error(e); r = { done: true }; }
    if (r.done) { b.script = b.queue.length ? b.queue.shift() : null; b.sw = 0; b.dirtySave = true; if (checkEnd(g)) return; b = g.battle; continue; }
    b.sw = r.value || 0; return;
  }
}

// ------------------------------------------------------------------ start, join, finish
export function engage(g, m, opts) {
  if (g.down || m.dead) return;
  if (g.battle) { if (!m.inBattle) join(g, m, false); return; }
  startBattle(g, m, opts || {});
}
function newBattle(g, opts) { return { round: 1, order: [], idx: -1, active: null, script: null, queue: [], sw: 0, next: null, wait: 0, econ: { action: 0, bonus: 0, move: 0, moveMax: MOVE_M }, reaction: 1, banner: { text: "Combat", sub: "Roll for initiative", t: 0 }, pending: (opts && opts.pending) || null, t: 0, zones: [], zid: 0, startCount: {}, saveT: 0, dirtySave: true }; }
export function startBattle(g, opener, opts) {
  opts = opts || {}; g.endTalk && g.endTalk(); g.autoMove = null; g.tgt = null;
  var b = g.battle = newBattle(g, opts); g.pe.st = []; g.pe.dodging = false;
  g.beginEncounter(opener);
  var ag = R.attrMod((g.v.attributes || {}).agility); var pr = R.roll3d6();
  b.order.push({ kind: "player", id: "player", e: g.pe, name: g.v["player-name"] || "You", roll: pr.total + ag, init: pr.total + ag + (opts.playerFirst ? 100 : 0), surprise: !!opts.playerFirst });
  (g.allies || []).forEach(function (a) { if (a.dead || a.gone || dist(a, g.pos) > 60) return; joinAlly(g, a, true); });
  g.monsters.forEach(function (m) {
    if (m.dead || m.inBattle || m.fled) return;
    var near = m === opener || (!m.passive && !(m.calmUntil > g.time) && (dist(m, g.pos) < JOIN_R || (opener && m.mon.id === opener.mon.id && dist(m, opener) < 14)));
    if (near) join(g, m, true);
  });
  b.order.sort(function (x, y) { return y.init - x.init || (x.kind === "player" ? -1 : 1); });
  g.prevCam = { dist: g.camDist, pitch: g.camPitch }; g.camDist = Math.max(g.camDist, 12); g.camPitch = Math.max(g.camPitch, 0.78);
  g.pushLog("Combat! Initiative — " + b.order.map(function (c) { return c.name + " " + c.roll; }).join(", ") + (opts.playerFirst ? ". You strike first." : "."), "info");
  b.next = "turn"; b.wait = 1.0; g.writeCombatState && g.writeCombatState(true);
}
function joinAlly(g, a, quiet) {
  var b = g.battle; if (!b || a.inBattle) return; a.inBattle = true; a.reaction = 1; var ag = R.attrMod((a.sheet.attributes || {}).agility); var r = R.roll3d6(); var init = r.total + ag;
  var c = { kind: "ally", id: a.id, e: a, name: a.name, roll: init, init: init };
  if (b.idx < 0) b.order.push(c); else { var at = b.order.findIndex(function (x) { return x.init < init; }); if (at < 0) at = b.order.length; if (at <= b.idx) b.idx++; b.order.splice(at, 0, c); }
}
export function join(g, m, quiet) {
  var b = g.battle; if (!b || m.inBattle) return; m.inBattle = true; m.aggro = true; m.autoT = 0; m.reaction = 1; if (m.st) m.st = m.st.filter(function (s) { return s.id === "controlled"; }); else m.st = [];
  var r = R.roll3d6(); var init = r.total + Math.min(4, m.mon.threat) + (m.c.arch === "canine" ? 2 : 0);
  var same = b.order.filter(function (c) { return c.e && c.e.mon && c.e.mon.name === m.mon.name; }).length; m.tag = same ? " " + String.fromCharCode(65 + same) : "";
  if (same === 1) { var first = b.order.find(function (c) { return c.e && c.e.mon && c.e.mon.name === m.mon.name; }); if (first && !first.e.tag) { first.e.tag = " A"; first.name = first.e.mon.name + " A"; } m.tag = " B"; }
  var c = { kind: "monster", id: m.id, m: m, e: m, name: m.mon.name + (m.tag || ""), roll: init, init: init, reaction: 1 };
  b.startCount[m.mon.id] = (b.startCount[m.mon.id] || 0) + 1;
  if (b.idx < 0) b.order.push(c);
  else { var at = b.order.findIndex(function (x) { return x.init < init; }); if (at < 0) at = b.order.length; if (at <= b.idx) b.idx++; b.order.splice(at, 0, c); }
  g.noteFoe(m); if (!g.target || g.target.dead) g.target = m;
  if (!quiet) g.pushLog(c.name + " joins the fight (initiative " + init + ").", "hurt");
}
function alive(c) { var e = c.e; if (c.kind === "player") return true; if (e.mon) return !e.dead && !e.fled; return !e.dead && !e.gone; }
function checkEnd(g) {
  var b = g.battle; if (!b) return true;
  if (g.down) { finish(g, "fell"); return true; }
  var foes = g.monsters.filter(function (m) { return m.inBattle && !m.dead && !m.fled && B.sideOf(m) === "foe"; });
  if (!foes.length) { finish(g, "won"); return true; }
  return false;
}
export function finish(g, why) {
  var b = g.battle; if (!b) return; g.battle = null; g.tgt = null;
  g.monsters.forEach(function (m) { if (!m.inBattle) return; m.inBattle = false; m.gait = 0; m.st = []; if (m.summoned) { m.dead = true; m.gone = true; g.scene.remove(m.c.root); return; } if (!m.dead) { m.aggro = false; m.state = "return"; m.calmUntil = g.time + 25; m.airT = 0; } });
  (g.allies || []).forEach(function (a) { a.inBattle = false; a.st = []; a.gait = 0; });
  g.pe.st = []; g.pe.dodging = false;
  if (g.prevCam) { g.camDist = g.prevCam.dist; g.camPitch = g.prevCam.pitch; g.prevCam = null; }
  g.autoMove = null; g.disengaged = false; g.buffs.blessing = 0; g.overchannel = false;
  if (g.combatSummary) g.combatSummary.rounds = b.round;
  g.after = { text: why === "won" ? "Victory" : why === "escaped" ? "Escaped" : why === "fell" ? "Defeat" : "Combat Ends", t: 0 };
  if (why === "escaped") g.pushLog("You slip away from the fight.", "info");
  if (why === "won") g.bridge.sfx && g.bridge.sfx("sfx-victory-medieval");
  g.closeCombat(true); g.writeCombatState && g.writeCombatState(false); g.dirty3d && g.dirty3d();
}

// ------------------------------------------------------------------ turns
export function update(g, dt) {
  var b = g.battle; if (!b) { if (g.after) { g.after.t += dt; if (g.after.t > 2) g.after = null; } return; }
  dt = Math.min(0.25, Math.max(dt, g.wall || 0)); /* scripts follow the wall clock, so slow devices do not stretch turns */
  g.dtc = dt; b.t += dt; if (b.banner) { b.banner.t += dt; if (b.banner.t > 1.5) b.banner = null; }
  B.zoneVisuals(g, dt);
  if (b.script || b.queue.length) { if (!b.script) { b.script = b.queue.shift(); b.sw = 0; } tick(g, dt); return; }
  b.saveT += dt; if (b.dirtySave && b.saveT > 0.2) { b.saveT = 0; b.dirtySave = false; g.saveBattle && g.saveBattle(); }
  if (b.next === "turn") { b.wait -= dt; if (b.wait <= 0) { b.next = null; nextTurn(g); } }
  b.joinT = (b.joinT || 0) + dt; if (b.joinT > 0.5) { b.joinT = 0; g.monsters.forEach(function (m) { if (!m.dead && !m.inBattle && !m.passive && !m.fled && !(m.calmUntil > g.time) && dist(m, g.pos) < 13 + m.mon.threat * 3) join(g, m, false); }); }
}
function nextTurn(g) {
  var b = g.battle; if (!b || checkEnd(g)) return;
  for (var guard = 0; guard < 80; guard++) {
    b.idx++;
    if (b.idx >= b.order.length) { b.idx = 0; newRound(g); if (!g.battle) return; }
    var c = b.order[b.idx]; if (alive(c)) break;
  }
  var c = b.order[b.idx]; b.active = c; b.dirtySave = true;
  if (c.kind === "player") playerTurn(g); else if (c.kind === "ally") run(g, AI.allyTurn(g, c)); else run(g, AI.monsterTurn(g, c));
}
function newRound(g) {
  var b = g.battle; b.round++; g.clock += ROUND_SEC / 60; B.zonesRoundEnd(g);
  b.order = b.order.filter(function (c) { return alive(c); });
  g.pushLog("— Round " + b.round + " —", "info"); g.writeCombatState && g.writeCombatState(true);
}
function playerTurn(g) {
  var b = g.battle; var mv = Math.round(MOVE_M * encumbrance(g) * 10) / 10; var pe = g.pe;
  b.econ = { action: 1, bonus: 1, move: mv, moveMax: mv }; b.reaction = 1; b.sneak = 0; pe.dodging = false; g.disengaged = false;
  var info = AI.turnStart(g, pe);
  if (info.slow) { b.econ.move = Math.round(mv * 5) / 10; b.econ.moveMax = b.econ.move; } if (info.rooted) { b.econ.move = 0; }
  b.banner = { text: "Your Turn", sub: b.round === 1 && b.order[0].surprise ? "Surprise — you strike first" : "Action · Bonus Action · " + b.econ.move + " m", t: 0, mine: true };
  if (g.down) { endTurn(g); return; }
  if (info.skip) { g.pushLog("You cannot act (" + info.why + ").", "hurt"); b.econ.action = 0; b.econ.bonus = 0; b.econ.move = 0; setTimeout(function () { if (g.battle === b && myTurn(g)) endTurn(g); }, 900); return; }
  if (b.pending) { var p = b.pending; b.pending = null; setTimeout(function () { if (g.battle === b && myTurn(g)) p(); }, 350); }
}
export function endTurn(g) {
  var b = g.battle; if (!b) return;
  if (b.active && b.active.kind === "player") {
    if (busy(g)) return; g.tgt = null;
    var foes = g.monsters.filter(function (m) { return m.inBattle && !m.dead && !m.fled && B.sideOf(m) === "foe"; });
    if (foes.length && foes.every(function (m) { return dist(m, g.pos) > ESCAPE_R; })) { finish(g, "escaped"); return; }
    B.ageStatuses(g, g.pe);
  }
  g.autoMove = null; b.active = null; b.next = "turn"; b.wait = 0.3; b.dirtySave = true;
}

// ------------------------------------------------------------------ the player's actions
// Approach (if needed) and swing. Returns false if it could not be attempted.
export function attack(g, m, opts) {
  opts = opts || {}; var b = g.battle; var w = R.weaponProfile(g.v);
  if (!b) { engage(g, m, { playerFirst: true, pending: function () { attack(g, m, opts); } }); return true; }
  var cost = opts.cost === undefined ? "action" : opts.cost;
  if (!canAct(g, cost)) return false;
  if (!m.inBattle) join(g, m, false);
  var reach = playerReach(g, m, w), d = dist(m, g.pos);
  if (d > reach) {
    if (w.ranged) { g.toast("Out of range (" + Math.round(d) + " m).", "info"); return false; }
    var need = d - (reach - 0.3);
    if (need > b.econ.move + 0.05) { g.toast("Too far — " + need.toFixed(1) + " m away, " + b.econ.move.toFixed(1) + " m of movement left. Dash or move closer.", "info"); return false; }
  }
  run(g, (function* () {
    if (dist(m, g.pos) > reach) { g.autoMove = { x: m.x, z: m.z, stop: reach - 0.35, script: true }; yield function () { return !g.autoMove; }; if (g.down || m.dead || dist(m, g.pos) > reach + 0.05) return; }
    spend(g, cost);
    yield* AI.swingGen(g, g.pe, m, opts);
    if (opts.twice && !m.dead && !g.down) { yield 0.1; yield* AI.swingGen(g, g.pe, m, opts); }
  })());
  return true;
}
export var playerSwing = function (g, m, o) { return AI.swingGen(g, g.pe, m, o); };
// Generic animated action (potions, techniques): play a clip, fire at its event.
export function act(g, clip, cost, onFire, opts) {
  opts = opts || {}; if (g.battle && !canAct(g, cost)) return false; spend(g, cost);
  var quick = !(CLIPS[clip] && CLIPS[clip].ev); var go = function* () { var fired = false, t0 = g.time; playAction(g.player, clip, function (e) { if (e === "release" || e === "use" || e === "hit") fired = true; }); yield function () { return fired || g.time - t0 > (quick ? 0.35 : 1.2); }; var w = onFire(); if (w && typeof w.next === "function") yield* w; yield opts.after == null ? 0.35 : opts.after; };
  if (g.battle) run(g, go()); else if (quick) { playAction(g.player, clip); var w0 = onFire(); if (w0 && typeof w0.next === "function") drain(w0); } else { var fired = false; playAction(g.player, clip, function (e) { if (!fired && (e === "release" || e === "use" || e === "hit")) { fired = true; var w = onFire(); if (w && typeof w.next === "function") drain(w); } }); }
  return true;
}
export function dash(g) { if (!canAct(g, "action")) return; spend(g, "action"); var b = g.battle; b.econ.move += b.econ.moveMax; b.econ.moveMax += b.econ.moveMax; g.pushLog("(Dash — movement doubled this turn)", "info"); g.fx && g.fx.dust(g.pos.x, g.pos.y + 0.2, g.pos.z); }
export function dodgeAction(g) { if (!canAct(g, "action")) return; spend(g, "action"); g.pe.dodging = true; playAction(g.player, "block"); g.pushLog("(Dodge — +3 Evasion until your next turn)", "info"); }
// Called by the movement code after every step the player takes during their turn.
export function afterPlayerStep(g, ox, oz, d) {
  var b = g.battle; if (!b) return; b.econ.move = Math.max(0, b.econ.move - d); b.dirtySave = true; B.zonesOnStep(g, g.pe, ox, oz, g.pos.x, g.pos.z);
  if (g.disengaged) return;
  var hits = g.monsters.filter(function (m) { if (!m.inBattle || m.dead || m.fled || B.sideOf(m) !== "foe" || !B.hasReaction(g, m) || B.hasSt(m, "unconscious") || B.hasSt(m, "commanded")) return false; var r = AI.meleeReach(m, g.pe); return Math.hypot(ox - m.x, oz - m.z) <= r && dist(m, g.pos) > r; });
  if (!hits.length) return;
  g.autoMove = null; g.move.x = g.move.y = 0;
  hits.forEach(function (m) { B.spendReaction(g, m); g.pushLog(B.nameOf(m) + " takes an opportunity attack as you leave its reach.", "hurt"); run(g, AI.strikeGen(g, m, g.pe, { tag: "opportunity", ranged: false }), true); });
}

// ------------------------------------------------------------------ previews & markers
export function preview(g, m) {
  var w = R.weaponProfile(g.v); var air = B.airborne(m) && !w.ranged ? -3 : 0; var bonus = R.attackBonus(g.v) + g.situational(m) + g.conditionPenalty() + B.stSum(g.pe, "atk") + air; var p = R.chance3d6(B.evasionOf(g, m) - bonus); var dm = R.damageText(g.v, m.mon);
  var reach = playerReach(g, m, w), d = dist(m, g.pos), b = g.battle; var need = Math.max(0, d - (reach - 0.3));
  return { chance: Math.round(p * 100), dice: dm.dice, lo: dm.lo, hi: dm.hi, dist: d, inReach: d <= reach, ranged: w.ranged, approach: !w.ranged && d > reach ? need : 0, canReach: w.ranged ? d <= reach : !b || need <= b.econ.move + 0.05, air: air < 0, st: B.conditionsText(m) };
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
  if (g.mk) return g.mk;
  var mk = g.mk = { ring: strip(97, "#e8c860", 0.75), pathIn: strip(80, "#7ae07a", 0.85), pathOut: strip(80, "#e05a4a", 0.7), end: disc("#e8e0c0", 0.22, 0.34), target: disc("#e05040", 0.9, 1.0), hover: disc("#f0f0f0", 0.9, 1.0), active: disc("#f0c040", 0.95, 1.08), dest: disc("#e8e0c0", 0.16, 0.3), spellRange: strip(97, "#8ab8ff", 0.55), spellArea: strip(97, "#ffd070", 0.9), spellBad: strip(97, "#e05a4a", 0.9), allyRing: disc("#6ad0ff", 0.9, 1.0) };
  Object.keys(mk).forEach(function (k) { mk[k].visible = false; g.scene.add(mk[k]); });
  return mk;
}
function place(g, o, x, z, s) { o.visible = true; o.position.set(x, g.terrain.groundAt(x, z) + 0.08, z); o.scale.setScalar(s || 1); }
function circlePts(cx, cz, r) { var pts = []; for (var i = 0; i <= 96; i++) { var a = i / 96 * Math.PI * 2; pts.push({ x: cx + Math.sin(a) * r, z: cz + Math.cos(a) * r }); } return pts; }
export function drawMarkers(g) {
  var mk = ensure(g); var b = g.battle; Object.keys(mk).forEach(function (k) { mk[k].visible = false; });
  var t = g.time;
  if (g.target && !g.target.dead) place(g, mk.target, g.target.x, g.target.z, radius(g.target) * (1 + Math.sin(t * 4) * 0.03));
  var hv = g.hover && g.hover.m && !g.hover.m.dead ? g.hover.m : null; if (hv && hv !== g.target) place(g, mk.hover, hv.x, hv.z, radius(hv));
  if (!b) { if (g.autoMove && !g.autoMove.script) place(g, mk.dest, g.autoMove.x, g.autoMove.z, 1 + Math.sin(t * 6) * 0.1); drawSpellMarkers(g, mk); return; }
  if (b.active && b.active.e && !b.active.e.dead && b.active.kind !== "player") place(g, mk.active, b.active.e.x, b.active.e.z, radius(b.active.e));
  (g.allies || []).forEach(function (a, i) { if (!a.dead && !a.gone && i === 0 && b) place(g, mk.allyRing, a.x, a.z, radius(a) * 0.9); });
  if (!ready(g)) { drawSpellMarkers(g, mk); return; }
  if (g.tgt) { drawSpellMarkers(g, mk); return; }
  var r = b.econ.move; if (r > 0.15) { drape(mk.ring.geometry, circlePts(g.pos.x, g.pos.z, r), 0.05, g); mk.ring.visible = true; }
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
// range ring, area outline and highlighted targets while aiming a spell
function drawSpellMarkers(g, mk) {
  var t = g.tgt; if (!t) return; var e = g.pe; var d = t.d; if (d.maxR > 2.2) { drape(mk.spellRange.geometry, circlePts(e.x, e.z, d.maxR), 0.05, g); mk.spellRange.visible = true; }
  if (!t.aim) return; var p = SC.plan(g, e, t.sp, t.aim); var pts = SC.outline(g, p); var tgtMesh = p.ok ? mk.spellArea : mk.spellBad;
  if (pts) { drape(tgtMesh.geometry, pts, 0.07, g); tgtMesh.visible = true; }
  else if (t.aim.e) { place(g, p.ok ? mk.target : mk.hover, t.aim.e.x, t.aim.e.z, radius(t.aim.e)); }
  p.hits.forEach(function (h) { if (h !== t.aim.e && h.kind !== "player") { /* targets inside an area get the red ring */ } });
}
export function snapshot(g) {
  var b = g.battle; if (!b) return null;
  return { round: b.round, mine: ready(g), myTurn: myTurn(g), busy: busy(g), banner: b.banner, econ: { action: b.econ.action, bonus: b.econ.bonus, reaction: b.reaction, move: Math.round(b.econ.move * 10) / 10, moveMax: b.econ.moveMax }, autoReact: g.autoReact !== false,
    order: b.order.filter(function (c) { return c.kind === "player" || (c.e && !c.e.fled); }).map(function (c) { var e = c.e; return { id: c.id, name: c.name, kind: c.kind === "monster" && B.sideOf(e) === "party" ? "ally" : c.kind, hp: Math.max(0, Math.round(e.hp)), maxHp: e.maxHp, active: b.active === c, dead: c.kind === "player" ? g.down : !!e.dead, threat: e.mon ? e.mon.threat : 0, arch: e.mon ? e.c.arch : "player", init: c.roll, target: !!(e.mon && g.target === e), st: B.conditionsText(e) }; }) };
}

// ------------------------------------------------------------------ persistence
function stCopy(l) { return (l || []).map(function (s) { var o = Object.assign({}, s); return o; }); }
export function serialize(g) {
  var b = g.battle; if (!b) return null; var pe = g.pe;
  return { v: 1, round: b.round, idx: b.idx, active: b.active ? b.active.id : null, next: b.next ? 1 : 0, startCount: b.startCount, zid: b.zid, sneak: b.sneak || 0,
    order: b.order.map(function (c) { return { kind: c.kind, id: c.id, name: c.name, roll: c.roll, init: c.init, surprise: !!c.surprise }; }),
    player: { x: g.pos.x, z: g.pos.z, yaw: g.yaw, econ: Object.assign({}, b.econ), reaction: b.reaction, st: stCopy(pe.st), dodging: !!pe.dodging, disengaged: !!g.disengaged },
    allies: (g.allies || []).filter(function (a) { return a.inBattle; }).map(function (a) { return { id: a.id, x: a.x, z: a.z, yaw: a.yaw, hp: a.hp, mp: a.mp, sp: a.sp, econ: a.econ ? Object.assign({}, a.econ) : null, reaction: a.reaction, st: stCopy(a.st), dead: !!a.dead, usedSW: !!a.usedSW }; }),
    monsters: g.monsters.filter(function (m) { return m.inBattle && !m.dead; }).map(function (m) { return { mid: m.mon.id, id: m.id, tag: m.tag || "", cell: m.cell, x: m.x, z: m.z, yaw: m.yaw, hp: m.hp, reaction: m.reaction, st: stCopy(m.st), air: m.air || 0, breathCD: m.breathCD || 0, moraleChecked: !!m.moraleChecked, summoned: !!m.summoned, home: m.home, passive: !!m.passive, lastTarget: m.lastTarget || null }; }),
    zones: (b.zones || []).map(function (z) { var o = Object.assign({}, z); if (o.follow) { o.followId = o.follow.id; delete o.follow; } return o; }),
    target: g.target && g.target.inBattle ? g.target.id : null, quarry: g.quarry ? g.quarry.id : null, read: g.read || null, nextBonus: g.nextBonus || 0, overchannel: !!g.overchannel,
    cam: g.prevCam || null };
}
function findMon(id) { var all = []; Object.keys(R.BESTIARY_BY_REGION).forEach(function (k) { R.BESTIARY_BY_REGION[k].forEach(function (m) { all.push(m); }); }); var f = all.find(function (m) { return m.id === id; }); return f || (id === "spirit-guardian" ? R.GUARDIAN : null); }
export function restore(g, data) {
  if (!data || data.v !== 1 || g.battle) return false;
  var b = g.battle = newBattle(g, {}); b.round = data.round; b.zid = data.zid || 0; b.startCount = data.startCount || {}; b.sneak = data.sneak || 0; b.idx = data.idx; b.dirtySave = false;
  var pe = g.pe; pe.st = stCopy(data.player.st); pe.dodging = !!data.player.dodging; g.disengaged = !!data.player.disengaged; b.econ = Object.assign({}, data.player.econ); b.reaction = data.player.reaction;
  g.pos.x = data.player.x; g.pos.z = data.player.z; g.yaw = data.player.yaw; g.pos.y = g.terrain.groundAt(g.pos.x, g.pos.z); g.terrain.warm(g.pos.x, g.pos.z, 1);
  g.beginEncounter(null); g.inCombat = true;
  var byId = {}; byId.player = { kind: "player", e: pe };
  (data.allies || []).forEach(function (s) { var a = g.allyById(s.id); if (!a) return; a.x = s.x; a.z = s.z; a.yaw = s.yaw; a.hp = s.hp; a.mp = s.mp; a.sp = s.sp; a.econ = s.econ; a.reaction = s.reaction; a.st = stCopy(s.st); a.dead = !!s.dead; a.usedSW = !!s.usedSW; a.inBattle = true; a.y = g.terrain.groundAt(a.x, a.z); byId[a.id] = { kind: "ally", e: a }; });
  (data.monsters || []).forEach(function (s) {
    var mon = findMon(s.mid); if (!mon) return; var m = g.addMonster(mon, s.x, s.z, s.cell); if (!m) return; m.id = s.id; m.tag = s.tag; m.yaw = s.yaw; m.hp = s.hp; m.reaction = s.reaction; m.st = stCopy(s.st); m.air = s.air; m.airT = s.air; m.breathCD = s.breathCD; m.moraleChecked = s.moraleChecked; m.summoned = s.summoned; m.inBattle = true; m.aggro = true; m.home = s.home || m.home; m.passive = false; m.lastTarget = s.lastTarget;
    g.spawnedCells[s.cell] = 1; m.c.root.position.set(m.x, m.y, m.z); byId[m.id] = { kind: "monster", e: m, m: m }; g.noteFoe && g.noteFoe(m);
  });
  b.order = data.order.filter(function (o) { return byId[o.id]; }).map(function (o) { var r = byId[o.id]; var c = { kind: o.kind, id: o.id, name: o.name, roll: o.roll, init: o.init, surprise: o.surprise, e: r.e }; if (r.m) c.m = r.m; return c; });
  b.active = data.active ? b.order.find(function (c) { return c.id === data.active; }) || null : null; b.idx = b.order.indexOf(b.active);
  (data.zones || []).forEach(function (z) { var o = Object.assign({}, z); if (o.followId) { var fe = byId[o.followId]; o.follow = fe ? fe.e : pe; delete o.followId; } b.zones.push(o); });
  g.target = data.target && byId[data.target] ? byId[data.target].e : null; g.quarry = data.quarry && byId[data.quarry] ? byId[data.quarry].e : null; g.read = data.read; g.nextBonus = data.nextBonus || 0; g.overchannel = !!data.overchannel; g.prevCam = data.cam || { dist: g.camDist, pitch: g.camPitch };
  g.camDist = Math.max(g.camDist, 12); g.camPitch = Math.max(g.camPitch, 0.78);
  b.banner = { text: "Combat resumed", sub: "Round " + b.round, t: 0 };
  if (!b.active) { b.next = "turn"; b.wait = 0.5; b.idx = data.idx; }
  else if (b.active.kind === "ally") run(g, AI.allyTurn(g, b.active)); else if (b.active.kind === "monster") run(g, AI.monsterTurn(g, b.active));
  g.pushLog("Combat resumed — round " + b.round + ".", "info"); return true;
}
