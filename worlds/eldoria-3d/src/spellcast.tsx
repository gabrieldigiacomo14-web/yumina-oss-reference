// @ts-nocheck
// Casting: which spells a character may use, aiming them in the 3D view (range ring, area
// outline, who would be hit), paying Mana and the right part of the turn, and resolving each
// kind of effect with Eldoria's own 3d6 rules. Only spells in the character's known-spells
// can be cast; ranges, dice, durations and costs come from the spell library entries.
import { T } from "./three";
import { playAction } from "./anim";
import * as R from "./rules";
import * as S from "./spells";
import * as B from "./cbase";

function arr(v) { return Array.isArray(v) ? v : []; }
function slugName(s) { return R.slug(s); }

// ------------------------------------------------------------------ what is known
export function known(g, e) {
  var rec = e.kind === "player" ? g.v["known-spells"] : (e.sheet && (e.sheet["known-spells"] || e.sheet.knownSpells));
  var out = [];
  if (Array.isArray(rec)) rec.forEach(function (x) { var id = typeof x === "string" ? x : x && (x.id || x.name); if (id) out.push(R.spellFor(R.slug(id), typeof x === "object" ? x : {})); });
  else if (rec && typeof rec === "object") Object.keys(rec).forEach(function (k) { out.push(R.spellFor(k, rec[k])); });
  return out;
}
export function knows(g, e, id) { return known(g, e).some(function (s) { return s.id === id; }); }
export function manaCost(g, e, sp) { var c = sp.mp; if (e.kind === "player") { if (g.v.conditions && JSON.stringify(g.v.conditions).indexOf("Mana Burn") >= 0) c = Math.ceil(c * 1.5); if (g.overchannel && S.spellFx(sp).t !== "util") c = Math.ceil(c * 1.5); } return c; }

// Can this caster cast it now? {ok, why, mp, d}
export function state(g, e, sp) {
  var d = S.describeSpell(sp); var mp = manaCost(g, e, sp); var b = g.battle;
  var r = { sp: sp, d: d, mp: mp, ok: true, why: "", label: d.label };
  if (!d.usable) { r.ok = false; r.why = S.whyNot(sp); if (!b && d.kind === "util") { r.ok = true; r.why = ""; r.util = true; } return r; }
  if (e.mp < mp) { r.ok = false; r.why = "Not enough Mana for " + sp.name + " (" + mp + " MP)."; return r; }
  if (b) {
    var act = b.active && b.active.id === e.id; if (!act && !d.cost.reaction) { r.ok = false; r.why = "Not your turn."; return r; }
    var ec = e.kind === "player" ? b.econ : e.econ;
    if (d.cost.action && !(ec && ec.action)) { r.ok = false; r.why = "Your Action is spent this turn."; return r; }
    if (d.cost.bonus && !(ec && ec.bonus)) { r.ok = false; r.why = sp.name + " needs your Action and Bonus Action."; return r; }
    if (d.cost.move && !(ec && ec.move >= (ec.moveMax || 1) - 0.01)) { r.ok = false; r.why = sp.name + " takes your whole turn — move after casting, not before."; return r; }
    if (d.cost.reaction && !(e.kind === "player" ? b.reaction : e.reaction !== 0)) { r.ok = false; r.why = "Your Reaction is spent."; return r; }
  }
  return r;
}

// ------------------------------------------------------------------ aiming
function weaponFlag(g) { var w = R.weaponProfile(g.v); return w.kind === "staff"; }
function clipFor(g, caster, d) { var k = d.kind; if (k === "heal" || k === "buff" || k === "aura" || k === "reaction") return "castUp"; var w = caster.kind === "player" ? R.weaponProfile(g.v) : R.weaponProfile(caster.sheet); return w.kind === "staff" ? "staffCast" : "cast"; }
function angleTo(a, x, z) { return Math.atan2(x - a.x, z - a.z); }
function insideCone(c, ang, len, half, e) { var dx = e.x - c.x, dz = e.z - c.z, dd = Math.hypot(dx, dz); if (dd > len + B.radius(e)) return false; if (dd < 0.3) return true; var a = Math.atan2(dx, dz); return Math.abs(Math.atan2(Math.sin(a - ang), Math.cos(a - ang))) <= half; }
function alongLine(c, ang, len, w, e) { var ux = Math.sin(ang), uz = Math.cos(ang); var dx = e.x - c.x, dz = e.z - c.z; var t = dx * ux + dz * uz; if (t < 0 || t > len + B.radius(e)) return false; return Math.abs(dx * uz - dz * ux) <= w + B.radius(e); }
export function everyone(g) { var l = B.partySide(g).filter(function (e) { return e.kind !== "monster"; }); g.monsters.forEach(function (m) { if (m.inBattle && !m.dead && !m.fled) l.push(m); }); return l; }
function fakeMon(g, e) { if (e.mon) return e.mon; return { name: B.nameOf(e), region: "", weakness: "", evasion: B.evasionOf(g, e), dr: 0, threat: 0 }; }
export function bonusOf(g, caster, sp, d) { var sheet = B.sheetOf(g, caster); return R.spellBonus(sheet, sp) + B.stSum(caster, "atk") + (caster.kind === "player" ? g.conditionPenalty() : 0); }

// Resolves an aim into everything the preview and the cast need. aim: {e?, x?, z?}
export function plan(g, caster, sp, aim) {
  var d = S.describeSpell(sp), fx = d.fx; var out = { ok: true, why: "", hits: [], shape: null, x: aim ? aim.x : caster.x, z: aim ? aim.z : caster.z, ang: 0 };
  var reach = d.maxR; var rcaster = B.radius(caster);
  function rangeCheck(tx, tz, extra) { var dd = Math.hypot(tx - caster.x, tz - caster.z) - (extra || 0); if (reach && dd > reach + 0.05) { out.ok = false; out.why = "Out of range (" + Math.max(0, Math.round(dd)) + " m, reach " + Math.round(reach) + " m)."; } }
  if (d.tgt === "foe") {
    if (!aim || !aim.e) { out.ok = false; out.why = "Choose an enemy."; return out; }
    var m = aim.e; out.x = m.x; out.z = m.z; rangeCheck(m.x, m.z, B.radius(m)); out.target = m; out.hits = [m];
    if (fx.t === "debuff" && fx.undeadOnly && !/skeleton|wight|ghast|draugr|ghoul|revenant|colossus|lich|grave|umbral|drowned|bone|knight|admiral|wisp/i.test(m.mon.name)) { out.ok = false; out.why = sp.name + " only binds undead."; }
    if (fx.t === "debuff" && fx.maxThreat && m.mon.threat > fx.maxThreat) { out.ok = false; out.why = "Too powerful for " + sp.name + " (lesser undead only)."; }
    if (fx.grounded && B.airborne(m)) { out.ok = false; out.why = m.mon.name + " is in the air."; }
    if (fx.needsSpeech && !/goblin|bandit|marauder|knight|admiral|sailor|sprite|raider|siren|efreeti|hobgoblin|ogre|giant/i.test(m.mon.name)) { out.ok = false; out.why = m.mon.name + " would not understand the verse."; }
    if (fx.t === "arc" || fx.t === "bolt") out.shape = { kind: "line", ax: caster.x, az: caster.z, bx: m.x, bz: m.z };
    return out;
  }
  if (d.tgt === "touch") {
    var a = aim && aim.e ? aim.e : caster; out.target = a; out.x = a.x; out.z = a.z; out.hits = [a]; if (a !== caster) rangeCheck(a.x, a.z, B.radius(a) + rcaster); if (a.dead || a.hp <= 0 && a.kind !== "player") { out.ok = false; out.why = "Too late for them."; }
    if (a.mon && B.sideOf(a) === "foe") { out.ok = false; out.why = "Choose yourself or an ally."; }
    return out;
  }
  if (d.tgt === "self") {
    out.x = caster.x; out.z = caster.z; out.hits = [caster]; var rad = d.area || fx.radius || 0;
    if (fx.t === "aura" || fx.t === "field" || fx.dome) { out.shape = { kind: "circle", cx: caster.x, cz: caster.z, r: fx.t === "field" ? (d.area || 6.1) : (rad || d.range.aura || 6) };
      out.hits = everyone(g).filter(function (e) { var inside = Math.hypot(e.x - caster.x, e.z - caster.z) <= out.shape.r + B.radius(e); if (!inside) return false; if (fx.allies) return B.sideOf(e) === "party"; if (fx.enemies) return B.sideOf(e) === "foe"; return true; }); }
    return out;
  }
  if (!aim || aim.x == null) { out.ok = false; out.why = d.tgt === "dir" ? "Pick a direction." : "Pick a place."; return out; }
  var tx = aim.x, tz = aim.z;
  if (d.tgt === "dir") {
    var ang = angleTo(caster, tx, tz); out.ang = ang; var len = fx.len || d.area || 6;
    if (fx.t === "cone") { var half = (fx.ang || 1.05) / 2; out.shape = { kind: "cone", cx: caster.x, cz: caster.z, ang: ang, len: len, half: half }; out.hits = everyone(g).filter(function (e) { return e !== caster && insideCone(caster, ang, len, half, e); }); }
    else { out.shape = { kind: "line", ax: caster.x, az: caster.z, bx: caster.x + Math.sin(ang) * len, bz: caster.z + Math.cos(ang) * len, w: fx.w || 0.9 }; out.hits = everyone(g).filter(function (e) { return e !== caster && alongLine(caster, ang, len, fx.w || 0.9, e); }); }
    if (fx.cmd) out.hits = out.hits.filter(function (e) { return B.sideOf(e) === "foe"; });
    return out;
  }
  // point
  var dd = Math.hypot(tx - caster.x, tz - caster.z); rangeCheck(tx, tz); out.x = tx; out.z = tz;
  if (fx.t === "burst") { var r = d.area || 4.6; out.shape = { kind: "circle", cx: tx, cz: tz, r: r }; out.hits = everyone(g).filter(function (e) { return Math.hypot(e.x - tx, e.z - tz) <= r + B.radius(e) * 0.6; }); }
  else if (fx.t === "wall") { var ang2 = angleTo(caster, tx, tz) + Math.PI / 2; var hl = (fx.len || 9) / 2; out.shape = { kind: "line", ax: tx - Math.sin(ang2) * hl, az: tz - Math.cos(ang2) * hl, bx: tx + Math.sin(ang2) * hl, bz: tz + Math.cos(ang2) * hl, w: 1.1 }; out.hits = everyone(g).filter(function (e) { return segD(e.x, e.z, out.shape) <= 1.2; }); }
  else if (fx.t === "teleport" || fx.t === "summon") { out.shape = { kind: "circle", cx: tx, cz: tz, r: 0.9 }; var blocked = everyone(g).some(function (e) { return e !== caster && Math.hypot(e.x - tx, e.z - tz) < B.radius(e) + 0.7; }); if (blocked) { out.ok = false; out.why = "Something is standing there."; } if (fx.t === "teleport" && !g.terrain.loaded(tx, tz) && g.terrain.groundAt(tx, tz) < -1.0) { out.ok = false; out.why = "No footing there."; } if (g.terrain.groundAt(tx, tz) < -1.3) { out.ok = false; out.why = "That is open water."; } }
  return out;
}
function segD(px, pz, s) { var vx = s.bx - s.ax, vz = s.bz - s.az, L = vx * vx + vz * vz; var t = L ? Math.max(0, Math.min(1, ((px - s.ax) * vx + (pz - s.az) * vz) / L)) : 0; return Math.hypot(px - (s.ax + vx * t), pz - (s.az + vz * t)); }

// hit chances for the tooltip: [{name, side, chance, dmg}]
export function previewList(g, caster, sp, p) {
  var d = S.describeSpell(sp); var fx = d.fx; var bonus = bonusOf(g, caster, sp, d); var out = [];
  p.hits.forEach(function (e) {
    var side = B.sideOf(e) === "foe" ? "foe" : "party"; var o = { name: B.nameOf(e), side: side, e: e };
    if (sp.dice && (fx.t === "bolt" || fx.t === "arc" || fx.t === "line" || fx.t === "cone" || fx.t === "burst" || fx.t === "field")) { var ev = B.evasionOf(g, e); o.chance = Math.round(R.chance3d6(ev - bonus) * 100); o.dice = sp.dice[0] + "d" + sp.dice[1]; o.brace = !!fx.brace; }
    else if (fx.t === "heal") { o.heal = sp.dice ? sp.dice[0] + "d" + sp.dice[1] + (fx.flat ? "+" + fx.flat : "") : ""; }
    else if (fx.t === "debuff" || fx.cmd || fx.enemies) { var dc = 12 + bonus; o.resist = true; o.chance = e.mon ? Math.round((1 - R.chance3d6(dc - e.mon.threat * 2)) * 100) : null; }
    out.push(o);
  });
  return out;
}

// ------------------------------------------------------------------ resource payment
function pay(g, caster, sp, d) {
  var mp = manaCost(g, caster, sp); caster.mp -= mp; var b = g.battle; var c = d.cost || {}; if (caster.kind === "player") { g.writeStats(); g.skillProgress(slugName(sp.school) + "-magic", 1); if (g.overchannel && d.kind !== "util") g.overchannelUsed = true; }
  if (b) { var ec = caster.kind === "player" ? b.econ : caster.econ; if (c.action) ec.action = 0; if (c.bonus) ec.bonus = 0; if (c.move) ec.move = 0; if (c.reaction) { if (caster.kind === "player") b.reaction = 0; else caster.reaction = 0; } }
  else if (caster.kind === "player") g.cooldowns["spell:" + sp.id] = g.time + 2.2;
}

// ------------------------------------------------------------------ casting
function elementColor(e) { e = String(e || ""); return /fire|ember|flame/.test(e) ? "#ff8a3a" : /cold|frost|ice/.test(e) ? "#9fe0ff" : /lightning|storm/.test(e) ? "#d8e8ff" : /necrotic|umbral|shadow/.test(e) ? "#a06ad0" : /radiant|holy/.test(e) ? "#fff0a0" : /poison|acid/.test(e) ? "#9ae05a" : /force/.test(e) ? "#c8a0ff" : "#7ab8ff"; }
export { elementColor };
function schoolColor(sp) { var e = sp.element || ""; if (e) return elementColor(e); var s = String(sp.school || "").toLowerCase(); return /divine|restor/.test(s) ? "#fff0a0" : /umbral|necro/.test(s) ? "#a06ad0" : /nature/.test(s) ? "#8ae05a" : /bardic/.test(s) ? "#ffd070" : /abjur/.test(s) ? "#8ab8ff" : /spatial/.test(s) ? "#c8a0ff" : "#7ab8ff"; }

// Public entry: cast `sp` from `caster` at `aim`. Returns true if the cast started.
export function cast(g, caster, sp, aim, opts) {
  var pre = prepare(g, caster, sp, aim, opts); if (!pre) return false; if (pre === true) return true;
  if (g.battle) g.runScript(pre.gen); else eventCast(g, caster, sp, pre.d, pre.p, aim, opts || {});
  return true;
}
// Checks, pays and returns {gen} for a caster that runs it inside its own turn script (companions). false: refused.
export function prepare(g, caster, sp, aim, opts) {
  opts = opts || {}; var st = state(g, caster, sp); if (!st.ok) { caster.kind === "player" && g.toast(st.why, "info"); return false; }
  var d = st.d; var p = plan(g, caster, sp, aim); if (!p.ok) { caster.kind === "player" && g.toast(p.why, "info"); return false; }
  // starting a fight with a hostile spell
  var hostile = ["bolt", "arc", "line", "cone", "burst", "wall", "field", "debuff"].indexOf(d.kind) >= 0 && (p.hits.some(function (e) { return e.mon && B.sideOf(e) === "foe"; }));
  if (!g.battle && hostile && caster.kind === "player") { var tm = p.hits.find(function (e) { return e.mon; }); if (tm) { g.tgt = null; g.engageWith(tm, { playerFirst: true, pending: function () { cast(g, caster, sp, aim, opts); } }); return true; } }
  pay(g, caster, sp, d); g.tgt = null;
  g.bridge.sfx && g.bridge.sfx(d.kind === "heal" ? "sfx-heal" : /lightning|electric|spark|arc/.test((sp.name + sp.element).toLowerCase()) ? "sfx-electric-spell" : "sfx-magic-cast-" + (1 + Math.floor(Math.random() * 3)));
  return { gen: castGen(g, caster, sp, d, p, aim, opts), d: d, p: p };
}
function face(g, caster, p) { var ang = p.target ? angleTo(caster, p.target.x, p.target.z) : p.shape && p.shape.kind === "cone" ? p.shape.ang : angleTo(caster, p.x, p.z); if (p.x !== caster.x || p.z !== caster.z || p.target) caster.yaw = ang; }
function* castGen(g, caster, sp, d, p, aim, opts) {
  var h = caster.c.parts.h; face(g, caster, p); var fired = false, t0 = g.time;
  if (h) playAction(h, clipFor(g, caster, d), function (ev) { if (ev === "release") fired = true; });
  yield function () { return fired || g.time - t0 > 1.4; };
  var w = effect(g, caster, sp, d, p, aim, opts); if (w && typeof w.next === "function") yield* w; yield 0.3;
}
function eventCast(g, caster, sp, d, p, aim, opts) {
  var h = caster.c.parts.h; face(g, caster, p); var done = false; var go = function () { if (done) return; done = true; var w = effect(g, caster, sp, d, p, aim, opts); if (w && typeof w.next === "function") { var n = 0, r; try { do { r = w.next(); } while (!r.done && n++ < 400); } catch (e) { console.error(e); } } };
  if (h) playAction(h, clipFor(g, caster, d), function (ev) { if (ev === "release") go(); }); else go(); setTimeout(go, 1600);
}
function handPos(g, caster) { var THREE = T(); var v = new THREE.Vector3(); try { var h = caster.c.parts.h; h.root.updateMatrixWorld(true); (h.weaponKind === "bow" ? h.LA.hand : h.RA.hand).getWorldPosition(v); } catch (e) { v.set(caster.x, (caster.y || 0) + 1.3, caster.z); } return v; }
function mk(g, caster, o) { return o; }

// the effect proper
function effect(g, caster, sp, d, p, aim, opts) {
  var fx = d.fx, col = schoolColor(sp), hp = handPos(g, caster); var sheet = B.sheetOf(g, caster);
  var skill = slugName(sp.school) + "-magic"; var dmgSpell = sp;
  if (caster.kind === "player" && g.overchannelUsed) { dmgSpell = Object.assign({}, sp, { dice: sp.dice ? [sp.dice[0] + 1, sp.dice[1]] : sp.dice }); g.overchannel = false; g.overchannelUsed = false; g.pushLog("(Overchannel — " + sp.name + " strikes one step harder)", "info"); }
  var bonusStat = B.stSum(caster, "atk"); var nb = B.getSt(caster, "blessing");
  function spendBless() { if (nb) { B.dropSt(caster, "blessing"); } }
  function atkOpts(e, extra) { return Object.assign({ bonus: bonusStat + (nb ? 1 : 0), cond: caster.kind === "player" ? g.conditionPenalty() : 0, evBonus: e.mon ? B.stSum(e, "ev") : 0, vsHoly: fx.vsHoly, holy: fx.holy, step: 0 }, extra || {}); }
  function hurt(e, res, brace) {
    var target = e; var att = res; var label = B.nameOf(e);
    if (e.mon) { g.resolveHit(e, res, skill, res.element || sp.element || "arcane", caster); return; }
    g.pushLog(res.line, res.hit ? "hurt" : "miss");
    var dmg = res.hit ? res.damage : (res.half || 0); if (!res.hit && !(res.half > 0)) { g.floatAt(e, "Evaded", "#9fd0ff"); return; }
    var r = B.dealDamage(g, caster, e, dmg, { el: res.element || sp.element, magic: true }); g.floatAt(e, String(r.dealt), "#ff6a5a"); var pp = g.chestOf(e); g.fx.burst(pp.x, pp.y, pp.z, col, false); if (e.kind === "player") g.hurtFlash = 0.4;
  }
  var kitBuild = (R.CALLING_KIT[caster.kind === "player" ? g.calling() : (caster.sheet && (caster.sheet.class || caster.sheet.calling)) || ""] || {}).build;
  if (d.kind === "bolt") {
    var m = p.target; g.fx.flash(hp.x, hp.y, hp.z, col, 1.2);
    return (function* () {
      var done = false; g.projectile(m, "bolt", function () {
        var res = R.spellAttack(sheet, dmgSpell, m.mon, atkOpts(m, { vsHoly: fx.vsHoly })); spendBless(); res.element = sp.element;
        hurt(m, res); if (res.hit && fx.st) B.addSt(g, m, fx.st, caster); if (res.hit && fx.drain) { var got = B.healEntity(g, caster, caster, Math.floor(res.damage * fx.drain)); g.pushLog("(" + sp.name + " — " + B.nameOf(caster) + " regains " + got + " HP)", "heal"); }
        done = true;
      }, { x: hp.x, y: hp.y - 1.4, z: hp.z }, sp.element, col); yield function () { return done; }; })();
  }
  if (d.kind === "arc") {
    var m1 = p.target; return (function* () {
      var done = false; g.projectile(m1, "bolt", function () {
        var res = R.spellAttack(sheet, dmgSpell, m1.mon, atkOpts(m1)); spendBless(); res.element = sp.element; hurt(m1, res);
        var near = res.hit ? g.monsters.filter(function (o) { return o !== m1 && o.inBattle && !o.dead && B.sideOf(o) === "foe" && B.dist(o, m1) <= fx.jumpR + B.radius(o); }).sort(function (a, b2) { return B.dist(a, m1) - B.dist(b2, m1); })[0] : null;
        if (near) { g.fx.sparks(m1.x, m1.y + 1, m1.z, col, true); var jsp = Object.assign({}, sp, { dice: fx.jump, name: sp.name + " (arc)" }); var r2 = R.spellAttack(sheet, jsp, near.mon, atkOpts(near)); r2.element = sp.element; hurt(near, r2); g.beam(m1, near, col); }
        done = true;
      }, { x: hp.x, y: hp.y - 1.4, z: hp.z }, sp.element, col); yield function () { return done; }; })();
  }
  if (d.kind === "line" || d.kind === "cone") {
    var s = p.shape; var A = d.kind === "line" ? { x: s.ax, z: s.az } : { x: s.cx, z: s.cz };
    sweep(g, caster, s, col, d.kind);
    return (function* () {
      yield 0.25;
      p.hits.slice().forEach(function (e) {
        if (fx.cmd) { resistHex(g, caster, sp, fx, e, sheet, bonusOf(g, caster, sp, d)); return; }
        var res = R.spellAttack(sheet, dmgSpell, fakeMon(g, e), atkOpts(e)); res.element = sp.element; hurt(e, res);
      }); spendBless(); yield 0.3;
    })();
  }
  if (d.kind === "burst") {
    var cx = p.x, cz = p.z; var cy = g.terrain.groundAt(cx, cz); g.projectileTo && g.projectileTo(caster, { x: cx, y: cy + 0.6, z: cz }, col);
    return (function* () {
      yield 0.55; g.fx.burst(cx, cy + 0.8, cz, col, true); g.fx.ring(cx, cy, cz, col, d.area || 4.6); g.fx.dust(cx, cy + 0.2, cz, "#8a7a60", 26); g.fx.kick(0.28); g.hitStop = 0.08;
      p.hits.slice().forEach(function (e) { var res = R.spellAttack(sheet, dmgSpell, fakeMon(g, e), atkOpts(e, { brace: fx.brace, holy: fx.holy, vsHoly: null })); res.element = sp.element; hurt(e, res); }); spendBless(); yield 0.35;
    })();
  }
  if (d.kind === "heal") {
    var t = p.target; var dice = sp.dice || [1, 8]; var r = R.rollDice(dice[0], dice[1]); var amt = r.total + (fx.flat || 0);
    g.fx.burst(t.x, (t.y || 0) + 1, t.z, "#9cff9c", false); g.fx.motes(t.x, (t.y || 0) + 0.3, t.z, "#9cff9c", 30);
    var got = B.healEntity(g, caster, t, amt); g.pushLog("(" + sp.name + " — " + dice[0] + "d" + dice[1] + (fx.flat ? "+" + fx.flat : "") + "=" + amt + ", " + B.nameOf(t) + " recovers " + got + " HP)", "heal");
    if (kitBuild === "heal" && caster.kind === "player") g.res = Math.min((R.CALLING_KIT[g.calling()] || {}).max || 0, g.res + 1); return;
  }
  if (d.kind === "buff") {
    if (fx.dome) { var z0 = B.addZone(g, { kind: "dome", name: sp.name, owner: caster.id, x: caster.x, z: caster.z, r: d.area || fx.radius || 6.1, rounds: fx.rounds, hp: fx.dome, color: "#8ab8ff", color2: "#ffffff" }); g.fx.ring(caster.x, caster.y, caster.z, "#8ab8ff", z0.r); g.pushLog("(" + sp.name + " — a dome with " + fx.dome + " barrier HP rises for " + fx.rounds + " rounds)", "info"); return; }
    var tg = p.target || caster; var st = Object.assign({}, fx.st); if (fx.choose) { var el = (opts && opts.choice) || fx.choose[0]; st.el = el; st.name = "Ward vs " + el; }
    B.addSt(g, tg, st, caster); g.fx.burst(tg.x, (tg.y || 0) + 1, tg.z, col, false); g.fx.ring(tg.x, tg.y || 0, tg.z, col, 1.6); g.fx.motes(tg.x, (tg.y || 0) + 0.4, tg.z, col, 14);
    g.pushLog("(" + sp.name + " — " + B.nameOf(tg) + ": " + describeStatus(st) + ")", "info"); return;
  }
  if (d.kind === "aura") {
    var r2 = d.area || fx.radius || 6; g.fx.ring(caster.x, caster.y, caster.z, col, r2); g.fx.burst(caster.x, caster.y + 1, caster.z, col, false);
    if (fx.strike) { var zz = B.addZone(g, { kind: "aura", name: sp.name, owner: caster.id, follow: caster, r: r2, rounds: fx.rounds, strike: fx.strike, el: sp.element, conc: !!fx.conc, color: col }); if (fx.conc) B.addSt(g, caster, { id: "conc-" + sp.id, name: sp.name, rounds: fx.rounds, conc: true }, caster); g.pushLog("(" + sp.name + " — one " + fx.strike[0] + "d" + fx.strike[1] + " strike per round for " + fx.rounds + " rounds)", "info"); return; }
    p.hits.forEach(function (e) { if (fx.enemies) { resistHex(g, caster, sp, fx, e, sheet, bonusOf(g, caster, sp, d)); } else { B.addSt(g, e, Object.assign({}, fx.st), caster); g.fx.motes(e.x, (e.y || 0) + 0.4, e.z, col, 8); } });
    if (fx.conc) B.addSt(g, caster, { id: "conc-" + sp.id, name: sp.name, rounds: fx.st ? fx.st.rounds : 5, conc: true }, caster);
    if (!fx.enemies) g.pushLog("(" + sp.name + " — " + p.hits.length + " allies: " + describeStatus(fx.st) + ")", "info"); return;
  }
  if (d.kind === "field") {
    var rr = d.area || 6.1; var z1 = B.addZone(g, { kind: "field", name: sp.name, owner: caster.id, x: caster.x, z: caster.z, r: rr, rounds: fx.rounds, dmg: fx.dot, slow: fx.slow, el: "umbral", color: "#6a3a9a", color2: "#c8a0ff", friendly: false, side: "party" });
    g.fx.ring(caster.x, caster.y, caster.z, "#a06ad0", rr); g.fx.burst(caster.x, caster.y + 0.6, caster.z, "#a06ad0", true); g.pushLog("(" + sp.name + " — shadow hands slow and rake enemies for " + fx.rounds + " rounds)", "info"); return;
  }
  if (d.kind === "wall") {
    var sh = p.shape; var zw = B.addZone(g, { kind: "wall", name: sp.name, owner: caster.id, x: sh.ax, z: sh.az, x2: sh.bx, z2: sh.bz, r: 1.1, rounds: fx.rounds, dmg: sp.dice, el: sp.element || "fire", color: "#ff8a3a", color2: "#ffd070", skill: skill });
    g.fx.burst((sh.ax + sh.bx) / 2, g.terrain.groundAt(p.x, p.z) + 1, (sh.az + sh.bz) / 2, "#ff8a3a", true); g.fx.kick(0.15); g.pushLog("(" + sp.name + " — a wall of flame burns for " + fx.rounds + " rounds; crossing it deals " + sp.dice[0] + "d" + sp.dice[1] + " fire)", "info");
    p.hits.forEach(function (e) { B.zonesOnStep(g, e, e.x - 0.01, e.z - 0.01, e.x + 0.01, e.z + 0.01); }); return;
  }
  if (d.kind === "debuff") { var tt = p.target; g.fx.flash(hp.x, hp.y, hp.z, col, 1.0); return (function* () { var done = false; g.projectile(tt, "bolt", function () { resistHex(g, caster, sp, fx, tt, sheet, bonusOf(g, caster, sp, d)); done = true; }, { x: hp.x, y: hp.y - 1.4, z: hp.z }, sp.element, col); yield function () { return done; }; })(); }
  if (d.kind === "teleport") {
    var x0 = caster.x, z0b = caster.z, y0 = caster.y || 0; g.fx.burst(x0, y0 + 1, z0b, col, false); g.fx.motes(x0, y0 + 0.3, z0b, col, 14);
    caster.x = p.x; caster.z = p.z; if (caster.kind === "ally") caster.y = g.terrain.groundAt(p.x, p.z); if (caster.kind === "player") { g.pos.y = Math.max(g.pos.y, g.terrain.groundAt(p.x, p.z)); g.autoMove = null; }
    g.fx.burst(p.x, g.terrain.groundAt(p.x, p.z) + 1, p.z, col, false); g.fx.ring(p.x, g.terrain.groundAt(p.x, p.z), p.z, col, 1.8); g.pushLog("(" + sp.name + " — " + B.nameOf(caster) + " steps " + Math.round(Math.hypot(p.x - x0, p.z - z0b)) + " m without provoking attacks)", "info");
    B.zonesOnStep(g, caster, x0, z0b, p.x, p.z); return;
  }
  if (d.kind === "summon") { var gx = p.x, gz = p.z; g.fx.burst(gx, g.terrain.groundAt(gx, gz) + 1, gz, "#c8a0ff", true); g.fx.ring(gx, g.terrain.groundAt(gx, gz), gz, "#c8a0ff", 2.4); g.spawnGuardian && g.spawnGuardian(caster, gx, gz, fx.rounds, sp); g.pushLog("(" + sp.name + " — a spirit guardian answers for " + fx.rounds + " rounds)", "info"); return; }
  g.pushLog("(" + sp.name + " — " + (sp.desc || "cast") + ")", "info");
}
function describeStatus(st) { if (!st) return ""; var out = []; if (st.barrier) out.push(st.barrier + " barrier HP"); if (st.dr) out.push("+" + st.dr + " DR"); if (st.ev) out.push((st.ev > 0 ? "+" : "") + st.ev + " Evasion"); if (st.atk) out.push((st.atk > 0 ? "+" : "") + st.atk + " attacks"); if (st.drEl) out.push("resists fire"); if (st.images) out.push(st.images + " images"); if (st.aegis) out.push("ward against one vector"); if (st.invisible) out.push("invisible"); if (st.hidden) out.push("hidden"); if (st.noFear) out.push("fear suppressed"); if (st.nextAtk) out.push("+1 to the next attack"); if (st.smite) out.push("next hit +" + st.smite[0] + "d" + st.smite[1] + " radiant"); if (st.deathWard) out.push("cheats death once"); if (st.el) out.push("−4 " + st.el + " damage"); return (out.join(", ") || st.name) + (st.rounds < 90 ? " for " + st.rounds + " rounds" : ""); }

// the target resists with 3d6 + 2×Threat against the caster's difficulty: 12 + ARC mod + skill (a "Routine" check plus the caster's own training)
export function resistHex(g, caster, sp, fx, e, sheet, bonus) {
  if (!e.mon) return; var dc = 12 + bonus; var imm = fx.cmd && e.mon.threat >= 6; var r = R.roll3d6(); var tot = r.total + e.mon.threat * 2; var ok = !imm && tot < dc;
  g.pushLog("(" + sp.name + " vs " + B.nameOf(e) + " — resists 3d6(" + r.dice.join(",") + ")=" + r.total + " +" + e.mon.threat * 2 + " = " + tot + " vs DR " + dc + (imm ? " — immune" : ok ? " — takes hold)" : " — shrugs it off)"), ok ? "hit" : "miss");
  if (!ok) { g.floatAt(e, "Resisted", "#c8c8c8"); return false; }
  if (fx.st) B.addSt(g, e, Object.assign({}, fx.st), caster); g.fx.burst(e.x, (e.y || 0) + 1, e.z, "#c8a0ff", false); g.fx.ring(e.x, e.y || 0, e.z, "#c8a0ff", 1.4); return true;
}
function sweep(g, caster, s, col, kind) {
  var base = handPos(g, caster); if (kind === "line") { var n = Math.ceil(Math.hypot(s.bx - s.ax, s.bz - s.az) / 0.7); for (var i = 0; i <= n; i++) { var t = i / n; var x = s.ax + (s.bx - s.ax) * t, z = s.az + (s.bz - s.az) * t; g.fx.emit(x, base.y + (g.terrain.groundAt(x, z) + 1.2 - base.y) * t, z, { n: 3, color: col, color2: "#ffffff", speed: 0.6, size: 0.4, life: 0.5, grav: 0, drag: 2 }); } g.fx.flash(s.bx, g.terrain.groundAt(s.bx, s.bz) + 1.2, s.bz, col, 2.0); g.fx.kick(0.12); }
  else { for (var k = 0; k < 46; k++) { var a = s.ang + (Math.random() - 0.5) * 2 * s.half; var sp = 5 + Math.random() * (s.len * 1.2); g.fx.emit(base.x, base.y, base.z, { n: 1, color: col, color2: "#ffffff", speed: 0.1, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, size: 0.45, life: 0.5, grav: 0, drag: 2.4, alpha: 0.9 }); } g.fx.kick(0.14); }
}

// ------------------------------------------------------------------ the player's targeting mode
export function begin(g, sp) {
  var e = g.pe; var st = state(g, e, sp); if (!st.ok) { g.toast(st.why, "info"); return false; }
  var d = st.d; var fx = d.fx;
  if (d.kind === "util" || (!g.battle && !d.usable)) { g.useUtilSpell(sp); return true; }
  g.tgt = { sp: sp, d: d, aim: null, choice: fx.choose ? fx.choose[0] : null, touch: false };
  if (d.tgt === "self" && !fx.choose) { return cast(g, e, sp, null); }
  g.toast(aimHint(d), "info"); return true;
}
function aimHint(d) { return d.tgt === "foe" ? "Choose an enemy." : d.tgt === "touch" ? "Choose yourself or an ally." : d.tgt === "dir" ? "Choose a direction." : d.tgt === "point" ? "Choose a place." : "Confirm."; }
export function cancel(g) { g.tgt = null; }
export function setChoice(g, c) { if (g.tgt) g.tgt.choice = c; }
// pointer picked something (screen position); returns true if the click was used
export function click(g, cx, cy, touch) {
  var t = g.tgt; if (!t) return false; var e = g.pe; var aim = aimFrom(g, t, cx, cy); if (!aim) { return true; }
  if (touch) { var same = t.aim && ((aim.e && t.aim.e === aim.e) || (aim.x != null && t.aim.x != null && Math.hypot(aim.x - t.aim.x, aim.z - t.aim.z) < 1.6)); if (!same) { t.aim = aim; t.touch = true; return true; } }
  t.aim = aim; return confirm(g);
}
export function confirm(g) { var t = g.tgt; if (!t) return false; var e = g.pe; var aim = t.aim || (t.d.tgt === "self" || t.d.tgt === "touch" ? { e: e } : null); if (!aim) { g.toast(aimHint(t.d), "info"); return true; } var ok = cast(g, e, t.sp, aim, { choice: t.choice }); if (!ok) { /* stay in targeting so the player can adjust */ } return true; }
export function aimFrom(g, t, cx, cy) {
  var d = t.d;
  if (d.tgt === "foe") { var m = g.pickAt(cx, cy, 70, false); return m ? { e: m, x: m.x, z: m.z } : null; }
  if (d.tgt === "touch") { var best = null, bd = 64; B.partySide(g).forEach(function (a) { if (a.mon || a.dead) return; var s = g.screenOf(a.x, (a.y || 0) + 1, a.z); if (!s) return; var dd = Math.hypot(s.x - cx, s.y - cy); if (dd < bd) { bd = dd; best = a; } }); return best ? { e: best, x: best.x, z: best.z } : null; }
  var gp = g.groundPick(cx, cy); return gp ? { x: gp.x, z: gp.z } : null;
}
export function hover(g, sx, sy) { var t = g.tgt; if (!t || t.touch) return; var a = aimFrom(g, t, sx, sy); if (a) { t.aim = a; t.sx = sx; t.sy = sy; } }
// outline points for the markers
export function outline(g, p) {
  var s = p && p.shape; if (!s) return null; var pts = [];
  if (s.kind === "circle") for (var i = 0; i <= 64; i++) { var a = i / 64 * Math.PI * 2; pts.push({ x: s.cx + Math.sin(a) * s.r, z: s.cz + Math.cos(a) * s.r }); }
  else if (s.kind === "cone") { pts.push({ x: s.cx, z: s.cz }); for (var k = 0; k <= 24; k++) { var a2 = s.ang - s.half + k / 24 * 2 * s.half; pts.push({ x: s.cx + Math.sin(a2) * s.len, z: s.cz + Math.cos(a2) * s.len }); } pts.push({ x: s.cx, z: s.cz }); }
  else if (s.kind === "line") { for (var q = 0; q <= 24; q++) { var t = q / 24; pts.push({ x: s.ax + (s.bx - s.ax) * t, z: s.az + (s.bz - s.az) * t }); } }
  return pts;
}
export function snapshot(g) {
  var t = g.tgt; if (!t) return null; var e = g.pe; var p = t.aim ? plan(g, e, t.sp, t.aim) : null; var list = p ? previewList(g, e, t.sp, p) : [];
  var sc = null; if (t.aim && t.aim.e) sc = g.screenOf(t.aim.e.x, (t.aim.e.y || 0) + (t.aim.e.c ? t.aim.e.c.height || 1.6 : 1.6) * 1.05, t.aim.e.z); else if (t.aim && t.aim.x != null) sc = g.screenOf(t.aim.x, g.terrain.groundAt(t.aim.x, t.aim.z) + 0.4, t.aim.z);
  return { name: t.sp.name, mp: manaCost(g, e, t.sp), label: t.d.label, kind: t.d.kind, tgt: t.d.tgt, range: Math.round(t.d.maxR), area: Math.round(t.d.area || 0), choose: t.d.fx.choose || null, choice: t.choice, ok: p ? p.ok : false, why: p ? p.why : aimHint(t.d), list: list.map(function (o) { return { name: o.name, side: o.side, chance: o.chance, dice: o.dice, heal: o.heal, brace: o.brace, resist: o.resist }; }), touch: t.touch, sx: sc ? sc.x : -999, sy: sc ? sc.y : -999, desc: t.sp.desc };
}

// At the start of a caster's turn, auras they keep up strike one enemy in range (a spell attack roll each).
export function auraStrikes(g, e) {
  var b = g.battle; if (!b || !b.zones) return; b.zones.forEach(function (z) {
    if (z.kind !== "aura" || !z.strike || z.owner !== e.id || z.struck === b.round) return; z.struck = b.round;
    var foes = B.foesOf(g, e).filter(function (f) { return B.dist(e, f) <= z.r + B.radius(f); }).sort(function (p, q) { return B.dist(e, p) - B.dist(e, q); }); var f = foes[0]; if (!f) return;
    var sheet = B.sheetOf(g, e); var sp = { name: z.name, school: "Elemental", dice: z.strike, element: z.el }; var res = R.spellAttack(sheet, sp, f.mon || fakeMon(g, f), { bonus: B.stSum(e, "atk"), evBonus: f.mon ? B.stSum(f, "ev") : 0 }); res.element = z.el;
    var p = g.chestOf(f); g.fx.flash(p.x, p.y + 4, p.z, "#d8e8ff", 2.4); g.fx.sparks(p.x, p.y, p.z, "#d8e8ff", true); g.fx.kick(0.2);
    if (f.mon) g.resolveHit(f, res, "elemental-magic", z.el, e); else { g.pushLog(res.line, res.hit ? "hurt" : "miss"); if (res.hit) B.dealDamage(g, e, f, res.damage, { el: z.el, magic: true }); }
  });
}
