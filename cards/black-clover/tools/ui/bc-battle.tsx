/* Black Clover — real-time battle arena.
 * The whole fight runs on the player's device: no AI calls while fighting.
 * Spell costs and impact come from the same spell engine the story uses
 * (bcCastPlan), so a Gale Edge costs the same here as in narration.
 * When the fight ends, BattleArena hands a result to onFinish(); the caller
 * applies it to state and asks the GM for one aftermath narration. */
import { bcCastPlan, bcSpellMechanics, bcReserve, bcManaMax } from "./bc-spell-engine.js";

function n(v, d) { var z = Number(v); return isFinite(z) ? z : (d === undefined ? 0 : d); }
function s(v) { return v === undefined || v === null ? "" : String(v); }
function o(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
function a(v) { return Array.isArray(v) ? v : []; }
function cl(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function low(v) { return s(v).toLowerCase(); }

var AW = 360, AH = 540; // arena units
var ATTR_COL = { fire: "#ff7a3c", water: "#4aa3e8", wind: "#5fe0b4", earth: "#c69a5a", lightning: "#ffd84a", plant: "#6cd15a", ice: "#a6e4ff", sand: "#e3c27a", smoke: "#b5bac2",
  stone: "#c4c8cf", steel: "#d6dbe3", sound: "#c49af0", cotton: "#f4efe4", thread: "#f0c85a", mirror: "#9fe0ff", poison: "#a46ae0", ash: "#9a9a9a", light: "#fff2a6", dark: "#8a6ad8",
  spatial: "#c0a6ff", time: "#e8d48a", blood: "#d4344a", gravity: "#7a5ab8", bone: "#e8e2d2", body: "#e89a7a", curse: "#9a3ad8", anti: "#2a2a2a" };
function attrCol(x) { var k = low(x).replace(/\(.*\)/, "").trim().split(/\s+/)[0]; return ATTR_COL[k] || "#f3dda0"; }
export var THREATS = {
  weak: { hp: 46, atk: 6, spd: 66, cd: 1.7, label: "Weak" }, average: { hp: 78, atk: 8, spd: 76, cd: 1.45, label: "Average" },
  strong: { hp: 118, atk: 11, spd: 86, cd: 1.25, label: "Strong" }, elite: { hp: 175, atk: 15, spd: 94, cd: 1.1, label: "Elite" },
  captain: { hp: 290, atk: 20, spd: 104, cd: 0.95, label: "Captain-class" }
};
var THREAT_ORDER = ["weak", "average", "strong", "elite", "captain"];
function threatFromOutput(out) { out = n(out, -1); if (out < 0) return ""; return out < 25 ? "weak" : out < 45 ? "average" : out < 65 ? "strong" : out < 85 ? "elite" : "captain"; }

/* Build the opposing side from combat.participants (and their saved NPC
   profiles). Strength comes from the world, never from the player's level. */
export function buildFoes(v, mode) {
  if (mode === "spar") return [{ key: "spar", name: s(o(v.spar_partner).name) || "Training Partner", kind: "brute", threat: "average", attr: "", hp: 105, max: 105, spar: true }];
  var npcs = o(o(v.world_truth).npcs);
  var parts = a(o(v.combat).participants).map(o).filter(function (p) {
    var side = low(p.side), cond = low(p.condition);
    return (side === "enemy" || side === "hostile" || side === "foe") && !/defeated|dead|fled|unconscious|surrender|captured|down\b/.test(cond);
  }).slice(0, 5);
  if (!parts.length) parts = [{ name: "Assailant", side: "enemy" }];
  return parts.map(function (p, i) {
    var key = s(p.key || p.id) || low(p.name).replace(/[^a-z0-9]+/g, "-");
    var npc = o(npcs[key] || npcs[low(p.name)] || npcs["npc-" + key]);
    var mp = o(npc.magic_profile);
    var text = low([p.name, p.notes, p.kind, p.role, p.threat, npc.role, npc.occupation].map(s).join(" "));
    var threat = THREATS[low(p.threat)] ? low(p.threat) : threatFromOutput(mp.output) ||
      (/captain|wizard king|general|vice-captain|royal knight|witch queen/.test(text) ? "elite" : /elite|veteran|knight|strong|noble mage|commander/.test(text) ? "strong" : /weak|novice|child|thug|petty|untrained/.test(text) ? "weak" : "average");
    var kind = /^(brute|caster|beast)$/.test(low(p.kind)) ? low(p.kind) :
      /beast|wolf|boar|bear|monster|creature|drake|serpent|hound|spider/.test(text) ? "beast" :
      (a(npc.spells).length || /mage|caster|wizard|witch|sorcer|knight|magic/.test(text)) ? "caster" : "brute";
    var T = THREATS[threat]; var cond = low(p.condition);
    var hpMul = /badly|critical|near death/.test(cond) ? 0.35 : /wounded|injured/.test(cond) ? 0.6 : /hurt|bruised|winded/.test(cond) ? 0.82 : 1;
    var attr = s(p.attribute || mp.attribute);
    return { key: key, name: s(p.name) || "Foe " + (i + 1), kind: kind, threat: threat, attr: attr, hp: Math.round(T.hp * hpMul), max: T.hp,
      manaPool: kind === "caster" ? Math.round(40 + THREAT_ORDER.indexOf(threat) * 30) : 0, persisted: !!npcs[key] };
  });
}
export function buildAllies(v) {
  return a(o(v.combat).participants).map(o).filter(function (p) { return /ally|friend|player/.test(low(p.side)) && low(p.name) !== "you" && !/defeated|dead|fled|unconscious|down\b/.test(low(p.condition)); }).slice(0, 2)
    .map(function (p) { return { key: s(p.key) || low(p.name), name: s(p.name), attr: s(p.attribute) }; });
}

/* What a recorded spell does in the arena, from its stored mechanics + text. */
function spellMove(sp, cat) {
  var mech = bcSpellMechanics(sp), t = low(s(sp.name) + " " + s(sp.behavior) + " " + s(mech.form));
  var shape = "bolt";
  if (cat === "defense" || /barrier|shield|wall|ward|guard|armou?r|dome/.test(t)) shape = "barrier";
  else if (cat === "support" && /heal|mend|restor|recover/.test(t)) shape = "heal";
  else if (/step|updraft|dash|flight|fly|leap|blink|boost|speed/.test(t)) shape = "blink";
  else if (/storm|burst|explo|blast|nova|eruption|bloom|rain/.test(t)) shape = "burst";
  else if (/wave|crescent|edge|slash|arc|sweep|scythe/.test(t)) shape = "wave";
  else if (/spear|lance|arrow|bullet|needle|beam|ray|pierc/.test(t)) shape = "lance";
  else if (/chain|bind|vine|restrain|snare|net|thread|cage/.test(t)) shape = "bind";
  var cd = { utility: 0.6, small: 0.8, standard: 1.25, large: 2.3, massive: 4.2 }[mech.tier] || 1.2;
  return { shape: shape, cd: cd, tier: mech.tier };
}

/* ---------- procedural arena ---------- */
function arenaTheme(scene) {
  scene = low(scene);
  if (/wilderness|travel|dungeon/.test(scene)) return { name: "wild", base: "#26371f", alt: "#2f4426", line: "#1b2716", obs: "tree" };
  if (/tavern|shop|home|church|workplace/.test(scene)) return { name: "wood", base: "#3b2a1c", alt: "#46321f", line: "#24180f", obs: "crate" };
  if (/training|squad|tower|ceremony/.test(scene)) return { name: "stone", base: "#2d3138", alt: "#353a42", line: "#1c1f24", obs: "pillar" };
  return { name: "street", base: "#34302b", alt: "#3d3832", line: "#221f1b", obs: "crate" };
}
function seeded(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function makeObstacles(theme, R) {
  var obs = [], tries = 0;
  var count = theme.obs === "tree" ? 5 : 4;
  while (obs.length < count && tries++ < 80) {
    var r = theme.obs === "pillar" ? 17 : theme.obs === "tree" ? 18 + R() * 6 : 15 + R() * 5;
    var x = 50 + R() * (AW - 100), y = 120 + R() * (AH - 260);
    if (obs.some(function (q) { return Math.hypot(q.x - x, q.y - y) < q.r + r + 46; })) continue;
    obs.push({ x: x, y: y, r: r, kind: theme.obs });
  }
  return obs;
}
function paintFloor(theme, obs, R) {
  var c = document.createElement("canvas"); c.width = AW; c.height = AH; var g = c.getContext("2d");
  g.fillStyle = theme.base; g.fillRect(0, 0, AW, AH);
  if (theme.name === "stone" || theme.name === "street") {
    for (var y = 0; y < AH; y += 24) for (var x = (y / 24) % 2 ? -18 : 0; x < AW; x += 36) {
      g.fillStyle = R() < 0.5 ? theme.alt : theme.base; g.fillRect(x + 1, y + 1, 34, 22);
      g.strokeStyle = theme.line; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, 35, 23);
    }
  } else if (theme.name === "wood") {
    for (var yy = 0; yy < AH; yy += 18) { g.fillStyle = (yy / 18) % 2 ? theme.alt : theme.base; g.fillRect(0, yy, AW, 17); g.fillStyle = theme.line; g.fillRect(0, yy + 17, AW, 1); for (var k = 0; k < 3; k++) g.fillRect(R() * AW, yy, 1, 17); }
  } else {
    for (var i = 0; i < 900; i++) { g.fillStyle = R() < 0.5 ? theme.alt : "#1f3019"; g.fillRect(R() * AW, R() * AH, 2 + R() * 3, 1 + R() * 2); }
    for (var j = 0; j < 60; j++) { g.fillStyle = "rgba(255,240,180,.25)"; g.fillRect(R() * AW, R() * AH, 2, 2); }
  }
  var vg = g.createRadialGradient(AW / 2, AH / 2, AH * 0.25, AW / 2, AH / 2, AH * 0.7); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.55)"); g.fillStyle = vg; g.fillRect(0, 0, AW, AH);
  return c;
}

/* ---------- component ---------- */
export function BattleArena(p) {
  var v = p.v || {}; var mode = p.mode || "combat";
  var canvasRef = React.useRef(null), wrapRef = React.useRef(null), stickRef = React.useRef(null);
  var G = React.useRef(null);
  var hs = React.useState(null); var hud = hs[0], setHud = hs[1];
  var ps = React.useState("intro"); var phase = ps[0], setPhase = ps[1];
  var rs = React.useState(null); var result = rs[0], setResult = rs[1];
  var pz = React.useState(false); var paused = pz[0], setPaused = pz[1];

  // ---- one-time setup ----
  if (!G.current) {
    var R = seeded((Date.now() & 0xffff) ^ 0x5bd1);
    var theme = arenaTheme(v.scene_type);
    var obs = makeObstacles(theme, R);
    var mp = o(v.magic_profile), bp = o(v.body_profile);
    var reserve = bcReserve(v);
    var attr = mp.attribute_known === false ? "" : s(mp.attribute);
    var spells = a(v.spells).map(o).filter(function (sp) { return sp.name; });
    var moves = spells.map(function (sp) { var m = spellMove(sp, p.spellCat ? p.spellCat(sp) : ""); return { id: s(sp.id) || s(sp.name), name: s(sp.name).replace(/^[A-Za-z ]+Magic:\s*/, ""), spell: sp, shape: m.shape, cd: m.cd, tier: m.tier, uses: 0 }; })
      .filter(function (m) { return m.tier !== "utility" || m.shape === "blink" || m.shape === "barrier"; }).slice(0, 3);
    if (!moves.length && reserve.maxUnits > 0) moves.push({ id: "freeform", name: (attr ? attr + " " : "Raw ") + "burst", spell: { id: "freeform", name: "Freeform magic", mechanics: { tier: "small" } }, freeform: true, shape: "bolt", cd: 1.1, tier: "small", uses: 0 });
    var techs = a(v.techniques).map(function (t) { return low(o(t).name); }).join(" ");
    var inv = a(v.inventory).map(o);
    var weapon = inv.filter(function (it) { var pl = o(it.placement); return pl.kind === "body" && (pl.slot === "main-hand" || pl.slot === "off-hand") && /sword|blade|knife|dagger|spear|axe|mace|staff|club|weapon/.test(low(s(it.type) + " " + s(it.name))); })[0];
    var foes = buildFoes(v, mode).map(function (f, i, all) {
      var col = (i + 1) / (all.length + 1);
      return Object.assign(f, { x: AW * col, y: 92 + (i % 2) * 34, vx: 0, vy: 0, r: f.kind === "beast" ? 15 : 17, cd: 1.2 + i * 0.5, state: "idle", t: 0, aim: 0, hitFlash: 0, stun: 0, casts: 0, alive: true, dmgDealt: 0 });
    });
    var allies = (mode === "spar" ? [] : buildAllies(v)).map(function (al, i) { return Object.assign(al, { x: AW / 2 + (i ? 60 : -60), y: AH - 130, r: 13, cd: 1.5 + i * 0.4, hp: 60, max: 60, alive: true }); });
    var img = null; if (p.portrait) { img = new Image(); img.src = p.portrait; }
    G.current = {
      R: R, theme: theme, obs: obs, floor: null, attr: attr, col: attrCol(attr), moves: moves, weapon: weapon ? s(weapon.name) : "",
      guardTech: /mana skin|reinforce/.test(techs), mp: mp, img: img,
      player: { x: AW / 2, y: AH - 80, r: 15, hp: cl(n(v.vitality, 100), 1, 100), hp0: cl(n(v.vitality, 100), 1, 100), st: Math.max(40, cl(n(v.stamina, 100), 0, 100)), stMax: Math.max(40, cl(n(v.stamina, 100), 0, 100)), st0: cl(n(v.stamina, 100), 0, 100), spent: 0,
        speed: 118 + cl(n(bp.agility, 40), 0, 100) * 0.9, dash: 0, iframe: 0, dashCd: 0, guard: false, barrier: 0, barrierT: 0, face: -Math.PI / 2, hurt: 0, strikeCd: 0 },
      units: reserve.currentUnits, maxUnits: reserve.maxUnits, units0: reserve.currentUnits,
      foes: foes, allies: allies, shots: [], zones: [], fx: [], texts: [], shake: 0, slow: 0, time: 0, focus: 0, combo: 0, comboT: 0, bestCombo: 0,
      dealt: 0, taken: 0, perfect: 0, interrupts: 0, casts: {}, target: null, keys: {}, stick: { x: 0, y: 0, on: false, id: null, ox: 0, oy: 0 },
      fleeT: 0, gate: mode === "combat" ? { x: AW / 2, y: AH - 14, w: 90 } : null, over: false, finisher: false, log: []
    };
  }

  // ---- helpers bound to the game state ----
  function g() { return G.current; }
  function planFor(m, full) {
    var S = g(); var pct = S.maxUnits ? 100 * S.units / S.maxUnits : 0;
    var live = { magic_profile: S.mp, mana: pct, mana_reserve: { maxUnits: S.maxUnits, currentUnits: S.units, lastPercent: pct, percent: pct } };
    return bcCastPlan(live, m.spell, { output: full ? "Full" : "Normal", freeform: !!m.freeform });
  }
  function say(text, x, y, col, big) { g().texts.push({ t: text, x: x, y: y, col: col || "#fff6dc", life: big ? 1.3 : 0.9, max: big ? 1.3 : 0.9, big: !!big }); }
  function burst(x, y, col, count, speed) { var S = g(); for (var i = 0; i < count; i++) { var ang = S.R() * Math.PI * 2, sp = (0.3 + S.R()) * (speed || 120); S.fx.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0.4 + S.R() * 0.4, col: col, r: 1.5 + S.R() * 2.5 }); } }
  function nearestFoe(x, y) { var S = g(), best = null, bd = 1e9; S.foes.forEach(function (f) { if (!f.alive) return; var d = Math.hypot(f.x - x, f.y - y); if (d < bd) { bd = d; best = f; } }); return best; }
  function aimAt() {
    var S = g(), P = S.player; var t = S.target && S.target.alive ? S.target : nearestFoe(P.x, P.y);
    if (t) return Math.atan2(t.y - P.y, t.x - P.x);
    return P.face;
  }
  function blocked(x, y, r) { var S = g(); return S.obs.some(function (q) { return Math.hypot(q.x - x, q.y - y) < q.r + r; }); }
  function pushOut(e) {
    var S = g(); e.x = cl(e.x, e.r + 4, AW - e.r - 4); e.y = cl(e.y, e.r + 4, AH - e.r - 4);
    S.obs.forEach(function (q) { var dx = e.x - q.x, dy = e.y - q.y, d = Math.hypot(dx, dy), m = q.r + e.r; if (d < m && d > 0.01) { e.x = q.x + dx / d * m; e.y = q.y + dy / d * m; } });
  }
  function hurtFoe(f, dmg, col, label) {
    var S = g(); if (!f.alive) return;
    var interrupt = f.state === "windup";
    if (interrupt) { dmg *= 1.5; f.state = "idle"; f.cd = f.cd + 0.9; f.stun = 0.6; S.interrupts++; S.focus = cl(S.focus + 15, 0, 100); say("INTERRUPT!", f.x, f.y - 34, "#ffd84a", true); }
    dmg = Math.max(1, Math.round(dmg)); f.hp -= dmg; f.hitFlash = 0.15; S.dealt += dmg;
    S.combo = S.comboT > 0 ? S.combo + 1 : 1; S.comboT = 2.2; S.bestCombo = Math.max(S.bestCombo, S.combo);
    S.focus = cl(S.focus + dmg * 0.55, 0, 100);
    say(String(dmg), f.x + (S.R() - 0.5) * 16, f.y - 22, col || "#fff6dc", dmg >= 25);
    burst(f.x, f.y, col || "#fff6dc", 8, 140); S.shake = Math.max(S.shake, dmg >= 25 ? 7 : 3);
    if (f.hp <= 0) {
      f.alive = false; f.hp = 0; burst(f.x, f.y, col || "#f3dda0", 26, 220); S.slow = 0.5; S.shake = 10;
      say(f.spar ? "YIELDS!" : "DOWN!", f.x, f.y - 40, "#f3dda0", true); S.log.push(f.name + " went down");
    }
  }
  function hurtPlayer(dmg, src) {
    var S = g(), P = S.player; if (S.over) return;
    if (P.iframe > 0) {
      if (src && src.windEnd !== undefined && Math.abs(S.time - src.windEnd) < 0.22) { S.perfect++; S.focus = cl(S.focus + 25, 0, 100); S.slow = 0.35; say("PERFECT DODGE", P.x, P.y - 34, "#5fe0b4", true); }
      return;
    }
    if (P.barrier > 0) { var ab = Math.min(P.barrier, dmg); P.barrier -= ab; dmg -= ab; burst(P.x, P.y, S.col, 6, 90); if (dmg <= 0) { say("Blocked", P.x, P.y - 30, S.col); return; } }
    if (P.guard) dmg *= S.guardTech ? 0.3 : 0.5;
    if (mode === "spar") dmg *= 0.45;
    dmg = Math.max(1, Math.round(dmg));
    P.hp -= dmg; P.hurt = 0.25; S.taken += dmg; S.combo = 0; S.shake = Math.max(S.shake, 6);
    say("-" + dmg, P.x, P.y - 24, "#ff8a7a", dmg >= 12); burst(P.x, P.y, "#ff6a5a", 8, 120);
    if (P.hp <= 0 || (mode === "spar" && S.taken >= 30)) finish(mode === "spar" ? "yielded" : "defeat");
  }
  function cast(i, wantFull) {
    var S = g(), P = S.player, m = S.moves[i]; if (!m || S.over || paused) return;
    if ((S.casts["cd" + i] || 0) > 0) return;
    var full = wantFull && S.focus >= 100;
    var plan = planFor(m, full);
    if (!plan.ok) { say(plan.reason && /mana/i.test(plan.reason) ? "Not enough mana" : "Can't cast", P.x, P.y - 32, "#ff8a7a"); return; }
    if (plan.stamina > P.st) { say("Too winded", P.x, P.y - 32, "#ff8a7a"); return; }
    S.units = Math.max(0, S.units - plan.manaUnits); P.st = Math.max(0, P.st - plan.stamina); P.spent += plan.stamina;
    S.casts["cd" + i] = m.cd; m.uses++; S.casts[m.name] = (S.casts[m.name] || 0) + 1;
    if (full) { S.focus = 0; S.slow = 0.45; S.shake = 8; say("FULL OUTPUT!", P.x, P.y - 40, S.col, true); }
    var dmg = plan.impact * 0.62 * (full ? 1.15 : 1), ang = aimAt(), col = S.col;
    P.face = ang;
    if (m.shape === "barrier") { P.barrier = Math.round(plan.impact * (full ? 1.6 : 1.1)) + 6; P.barrierT = 3.5; burst(P.x, P.y, col, 14, 80); say("Barrier", P.x, P.y - 30, col); return; }
    if (m.shape === "heal") { var hv = Math.round(plan.impact * 0.3); P.hp = Math.min(100, P.hp + hv); say("+" + hv, P.x, P.y - 30, "#7ae89a"); burst(P.x, P.y, "#7ae89a", 12, 70); return; }
    if (m.shape === "blink") { var dist = 110; var nx = P.x + Math.cos(ang + Math.PI) * 0 + Math.cos(P.face) * 0; nx = P.x + Math.cos(stickAngle()) * dist; var ny = P.y + Math.sin(stickAngle()) * dist; burst(P.x, P.y, col, 12, 100); P.x = nx; P.y = ny; pushOut(P); P.iframe = 0.35; burst(P.x, P.y, col, 12, 100); return; }
    if (m.shape === "burst") { var t = S.target && S.target.alive ? S.target : nearestFoe(P.x, P.y); var tx = t ? t.x : P.x + Math.cos(ang) * 120, ty = t ? t.y : P.y + Math.sin(ang) * 120; S.zones.push({ own: "p", x: tx, y: ty, r: full ? 64 : 48, t: 0, wind: 0.35, dmg: dmg, col: col }); return; }
    if (m.shape === "wave") { for (var k = -1; k <= 1; k++) S.shots.push({ own: "p", x: P.x, y: P.y, vx: Math.cos(ang + k * 0.16) * 300, vy: Math.sin(ang + k * 0.16) * 300, r: 9, life: 0.9, dmg: dmg * 0.55, col: col, pierce: true, hit: {} }); return; }
    if (m.shape === "bind") { S.shots.push({ own: "p", x: P.x, y: P.y, vx: Math.cos(ang) * 320, vy: Math.sin(ang) * 320, r: 8, life: 1.2, dmg: dmg * 0.6, col: col, bind: 1.6, hit: {} }); return; }
    var spd = m.shape === "lance" ? 560 : 400;
    S.shots.push({ own: "p", x: P.x, y: P.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: m.shape === "lance" ? 6 : 8, life: 1.3, dmg: dmg, col: col, hit: {}, big: full });
  }
  function strike() {
    var S = g(), P = S.player; if (S.over || paused || P.strikeCd > 0 || P.st < 3) return;
    P.st -= 3; P.spent += 3; P.strikeCd = 0.42;
    var ang = aimAt(); P.face = ang;
    var base = 4 + cl(n(o(v.body_profile).strength, 40), 0, 100) * 0.09; if (S.weapon) base *= 1.7;
    S.fx.push({ swing: true, x: P.x, y: P.y, a: ang, life: 0.16, col: S.weapon ? "#e8ecf2" : "#f3dda0" });
    S.foes.forEach(function (f) { if (!f.alive) return; var d = Math.hypot(f.x - P.x, f.y - P.y); var da = Math.abs(((Math.atan2(f.y - P.y, f.x - P.x) - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (d < 52 + f.r && da < 1.1) { hurtFoe(f, base, "#f3dda0"); var k = 14 / Math.max(1, d); f.x += (f.x - P.x) * k; f.y += (f.y - P.y) * k; pushOut(f); } });
  }
  function dash() {
    var S = g(), P = S.player; if (S.over || paused || P.dashCd > 0 || P.st < 8) return;
    P.st -= 8; P.spent += 8; P.dash = 0.18; P.iframe = 0.28; P.dashCd = 0.55;
    var ang = (S.stick.on || anyKey()) ? stickAngle() : P.face + Math.PI;
    P.dvx = Math.cos(ang) * 520; P.dvy = Math.sin(ang) * 520;
    burst(P.x, P.y, "#d9cfb7", 6, 60);
  }
  function anyKey() { var k = g().keys; return k.l || k.r || k.u || k.d; }
  function stickAngle() {
    var S = g(), k = S.keys; var x = S.stick.on ? S.stick.x : (k.r ? 1 : 0) - (k.l ? 1 : 0), y = S.stick.on ? S.stick.y : (k.d ? 1 : 0) - (k.u ? 1 : 0);
    if (!x && !y) return S.player.face; return Math.atan2(y, x);
  }
  function finish(outcome) {
    var S = g(); if (S.over) return; S.over = true;
    var P = S.player;
    var foes = S.foes.map(function (f) { return { key: f.key, name: f.name, outcome: !f.alive ? "defeated" : f.hp < f.max * 0.5 ? "badly hurt" : f.hp < f.max ? "hurt" : "unharmed", hpPct: Math.round(100 * Math.max(0, f.hp) / f.max), persisted: f.persisted }; });
    var secs = Math.round(S.time);
    var grade = outcome !== "victory" ? (outcome === "fled" ? "C" : "D") : (S.taken <= 6 && secs < 70 ? "S" : S.taken <= 18 ? "A" : S.taken <= 35 ? "B" : "C");
    var r = { outcome: outcome, mode: mode, seconds: secs, hp: Math.max(0, Math.round(P.hp)), hp0: Math.round(P.hp0), st: Math.round(cl(P.st0 - P.spent * 0.3 - secs * 0.05, 0, 100)), st0: Math.round(P.st0),
      units: Math.round(S.units * 100) / 100, units0: S.units0, maxUnits: S.maxUnits, dealt: Math.round(S.dealt), taken: Math.round(S.taken), perfect: S.perfect,
      interrupts: S.interrupts, bestCombo: S.bestCombo, grade: grade, foes: foes, spellsUsed: S.moves.filter(function (m) { return m.uses; }).map(function (m) { return { id: m.id, name: m.name, uses: m.uses, freeform: !!m.freeform }; }), log: S.log.slice(-6) };
    setTimeout(function () { setResult(r); setPhase("result"); }, outcome === "victory" ? 900 : 600);
  }

  // ---- main loop ----
  React.useEffect(function () {
    if (phase !== "fight") return;
    var S = g(); var cv = canvasRef.current; if (!cv) return;
    if (!S.floor) S.floor = paintFloor(S.theme, S.obs, S.R);
    var ctx = cv.getContext("2d"); var raf = 0, last = performance.now(), hudT = 0;
    function resize() { var w = wrapRef.current; if (!w) return; var dpr = Math.min(2, window.devicePixelRatio || 1); var bw = w.clientWidth, bh = w.clientHeight; var sc = Math.min(bw / AW, bh / AH); cv.style.width = AW * sc + "px"; cv.style.height = AH * sc + "px"; cv.width = Math.round(AW * sc * dpr); cv.height = Math.round(AH * sc * dpr); S.scale = sc * dpr; S.cssScale = sc; }
    resize(); window.addEventListener("resize", resize);
    function step(now) {
      var real = Math.min(0.05, (now - last) / 1000); last = now;
      if (!paused && !document.hidden) update(real * (S.slow > 0 ? 0.35 : 1), real);
      draw(); hudT += real;
      if (hudT > 0.1) { hudT = 0; setHud(snapshot()); }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return function () { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [phase, paused]);

  function snapshot() {
    var S = g(), P = S.player;
    return { hp: P.hp, st: P.st, mana: S.maxUnits ? 100 * S.units / S.maxUnits : 0, focus: S.focus, combo: S.comboT > 0 ? S.combo : 0, time: S.time, barrier: P.barrier,
      cds: S.moves.map(function (m, i) { var pl = planFor(m, false); return { cd: S.casts["cd" + i] || 0, max: m.cd, ok: pl.ok && pl.stamina <= P.st, cost: pl.ok ? Math.round(pl.manaPercent) : 0 }; }),
      foes: S.foes.map(function (f) { return { name: f.name, hp: Math.max(0, f.hp), max: f.max, alive: f.alive, target: S.target === f, threat: f.threat }; }),
      flee: S.fleeT, dashCd: P.dashCd, strikeCd: P.strikeCd, guard: P.guard };
  }

  function update(dt, real) {
    var S = g(), P = S.player; if (S.over && S.slow <= 0) { S.time += 0; }
    S.time += dt; S.slow = Math.max(0, S.slow - real); S.shake = Math.max(0, S.shake - real * 30); S.comboT = Math.max(0, S.comboT - dt); if (!S.comboT) S.combo = 0;
    P.iframe = Math.max(0, P.iframe - dt); P.dashCd = Math.max(0, P.dashCd - dt); P.strikeCd = Math.max(0, P.strikeCd - dt); P.hurt = Math.max(0, P.hurt - dt);
    if (P.barrierT > 0) { P.barrierT -= dt; if (P.barrierT <= 0) P.barrier = 0; }
    S.moves.forEach(function (m, i) { if (S.casts["cd" + i] > 0) S.casts["cd" + i] = Math.max(0, S.casts["cd" + i] - dt); });
    if (S.over) { stepFx(dt); return; }
    // player movement
    var k = S.keys, mx = S.stick.on ? S.stick.x : (k.r ? 1 : 0) - (k.l ? 1 : 0), my = S.stick.on ? S.stick.y : (k.d ? 1 : 0) - (k.u ? 1 : 0);
    var ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    if (P.dash > 0) { P.dash -= dt; P.x += P.dvx * dt; P.y += P.dvy * dt; }
    else { var sp = P.speed * (P.guard ? 0.45 : 1) * (P.st < 10 ? 0.75 : 1); P.x += mx * sp * dt; P.y += my * sp * dt; if (ml > 0.2) P.face = Math.atan2(my, mx); }
    pushOut(P);
    if (P.guard) { if (S.guardTech && S.maxUnits) S.units = Math.max(0, S.units - S.maxUnits * 0.012 * dt); else { P.st = Math.max(0, P.st - 6 * dt); P.spent += 6 * dt; } if (P.st <= 0 && !S.guardTech) P.guard = false; }
    else if (P.dash <= 0) P.st = Math.min(P.stMax, P.st + 4.5 * dt);
    // flee gate
    if (S.gate) {
      var inGate = Math.abs(P.x - S.gate.x) < S.gate.w / 2 && P.y > AH - 34;
      var crowded = S.foes.some(function (f) { return f.alive && Math.hypot(f.x - P.x, f.y - P.y) < 70; });
      S.fleeT = inGate && !crowded ? S.fleeT + dt : Math.max(0, S.fleeT - dt * 2);
      if (S.fleeT >= 2) { S.log.push("You broke away"); finish("fled"); }
    }
    // foes
    S.foes.forEach(function (f) { if (f.alive) foeAI(f, dt); f.hitFlash = Math.max(0, f.hitFlash - dt); });
    S.allies.forEach(function (al) { if (al.alive) allyAI(al, dt); });
    // projectiles
    S.shots = S.shots.filter(function (sh) {
      sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.life -= dt; (sh.trail = sh.trail || []).push([sh.x, sh.y]); if (sh.trail.length > 6) sh.trail.shift();
      if (sh.life <= 0 || sh.x < -20 || sh.y < -20 || sh.x > AW + 20 || sh.y > AH + 20) return false;
      if (blocked(sh.x, sh.y, sh.r * 0.6)) { burst(sh.x, sh.y, sh.col, 6, 80); return false; }
      if (sh.own === "p" || sh.own === "a") {
        var hitAny = false;
        S.foes.forEach(function (f) { if (!f.alive || sh.hit[f.key]) return; if (Math.hypot(f.x - sh.x, f.y - sh.y) < f.r + sh.r) { sh.hit[f.key] = 1; hurtFoe(f, sh.dmg, sh.col); if (sh.bind) { f.stun = Math.max(f.stun, sh.bind); say("Bound!", f.x, f.y - 30, sh.col); } hitAny = true; } });
        return !(hitAny && !sh.pierce);
      }
      if (Math.hypot(P.x - sh.x, P.y - sh.y) < P.r + sh.r) { hurtPlayer(sh.dmg, sh); return false; }
      return true;
    });
    // telegraphed zones
    S.zones = S.zones.filter(function (z) {
      z.t += dt; if (z.t < z.wind) return true;
      burst(z.x, z.y, z.col, 18, 200); S.shake = Math.max(S.shake, 5);
      if (z.own === "p") S.foes.forEach(function (f) { if (f.alive && Math.hypot(f.x - z.x, f.y - z.y) < z.r + f.r) hurtFoe(f, z.dmg, z.col); });
      else if (Math.hypot(P.x - z.x, P.y - z.y) < z.r + P.r * 0.6) hurtPlayer(z.dmg, { windEnd: z.born + z.wind });
      return false;
    });
    stepFx(dt);
    if (S.foes.every(function (f) { return !f.alive; })) finish("victory");
  }
  function stepFx(dt) {
    var S = g();
    S.fx = S.fx.filter(function (f) { f.life -= dt; if (!f.swing) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.92; f.vy *= 0.92; } return f.life > 0; });
    S.texts = S.texts.filter(function (t) { t.life -= dt; t.y -= 28 * dt; return t.life > 0; });
  }
  function foeAI(f, dt) {
    var S = g(), P = S.player, T = THREATS[f.threat];
    if (f.stun > 0) { f.stun -= dt; return; }
    var dx = P.x - f.x, dy = P.y - f.y, d = Math.hypot(dx, dy) || 1;
    f.cd -= dt;
    if (f.state === "windup") {
      f.t -= dt;
      if (f.t <= 0) {
        f.state = "recover"; f.t = 0.35; var wEnd = S.time;
        if (f.atk === "slam") { if (Math.hypot(P.x - f.x, P.y - f.y) < 58 + P.r * 0.5) hurtPlayer(T.atk * 1.15, { windEnd: wEnd }); burst(f.x, f.y, "#ff6a5a", 14, 180); S.shake = Math.max(S.shake, 4); f.dmgDealt++; }
        else if (f.atk === "charge") { f.state = "charge"; f.t = 0.42; f.hitOnce = false; f.windEnd = wEnd; }
        else if (f.atk === "volley") { var cnt = f.threat === "weak" ? 1 : 3; for (var i = 0; i < cnt; i++) { var an = f.aim + (i - (cnt - 1) / 2) * 0.22; S.shots.push({ own: "e", x: f.x, y: f.y, vx: Math.cos(an) * 250, vy: Math.sin(an) * 250, r: 7, life: 2.2, dmg: T.atk * 0.85, col: attrCol(f.attr || "dark"), windEnd: wEnd, hit: {} }); } }
      }
      return;
    }
    if (f.state === "charge") {
      f.t -= dt; f.x += Math.cos(f.aim) * 400 * dt; f.y += Math.sin(f.aim) * 400 * dt; pushOut(f);
      if (!f.hitOnce && Math.hypot(P.x - f.x, P.y - f.y) < f.r + P.r) { f.hitOnce = true; hurtPlayer(T.atk * 1.2, { windEnd: f.windEnd }); }
      if (f.t <= 0) { f.state = "recover"; f.t = 0.5; }
      return;
    }
    if (f.state === "recover") { f.t -= dt; if (f.t <= 0) f.state = "idle"; return; }
    // movement
    var want = f.kind === "caster" && f.manaPool > 0 ? 170 : f.kind === "beast" ? 120 : 40;
    var mvx = 0, mvy = 0;
    if (d > want + 15) { mvx = dx / d; mvy = dy / d; } else if (d < want - 25) { mvx = -dx / d; mvy = -dy / d; } else { mvx = -dy / d * 0.6; mvy = dx / d * 0.6; }
    S.foes.forEach(function (q) { if (q !== f && q.alive) { var qx = f.x - q.x, qy = f.y - q.y, qd = Math.hypot(qx, qy); if (qd < 44 && qd > 0.1) { mvx += qx / qd * 0.8; mvy += qy / qd * 0.8; } } });
    var spd = T.spd * (f.kind === "beast" ? 1.25 : 1);
    var nx = f.x + mvx * spd * dt, ny = f.y + mvy * spd * dt;
    if (blocked(nx, ny, f.r)) { nx = f.x + (-mvy) * spd * dt; ny = f.y + mvx * spd * dt; }
    f.x = nx; f.y = ny; pushOut(f);
    if (f.cd > 0) return;
    // choose attack (telegraphed so it can be read and dodged)
    var hard = THREAT_ORDER.indexOf(f.threat);
    if (f.kind === "caster" && f.manaPool > 0) {
      f.casts++; f.manaPool -= 12;
      if (f.casts % 3 === 0) { S.zones.push({ own: "e", x: P.x, y: P.y, r: 46 + hard * 4, t: 0, wind: 0.95 - hard * 0.05, dmg: T.atk * 1.3, col: attrCol(f.attr || "fire"), born: S.time }); f.cd = T.cd + 0.4; }
      else { f.state = "windup"; f.t = 0.45; f.atk = "volley"; f.aim = Math.atan2(dy, dx); f.cd = T.cd; }
      if (f.manaPool <= 0) say("Out of mana!", f.x, f.y - 30, "#9fc7e8");
      return;
    }
    if (f.kind === "beast" && d < 230 && d > 50) { f.state = "windup"; f.t = 0.55 - hard * 0.04; f.atk = "charge"; f.aim = Math.atan2(dy, dx); f.cd = T.cd + 0.3; return; }
    if (d < 70) { f.state = "windup"; f.t = 0.62 - hard * 0.05; f.atk = "slam"; f.cd = T.cd; }
  }
  function allyAI(al, dt) {
    var S = g(); var t = nearestFoe(al.x, al.y); if (!t) return;
    var dx = t.x - al.x, dy = t.y - al.y, d = Math.hypot(dx, dy) || 1;
    if (d > 140) { al.x += dx / d * 80 * dt; al.y += dy / d * 80 * dt; pushOut(al); }
    al.cd -= dt;
    if (al.cd <= 0 && d < 260) { al.cd = 1.7; S.shots.push({ own: "a", x: al.x, y: al.y, vx: dx / d * 330, vy: dy / d * 330, r: 6, life: 1.2, dmg: 6, col: attrCol(al.attr || "steel"), hit: {} }); }
  }

  // ---- rendering ----
  function draw() {
    var S = g(), cv = canvasRef.current; if (!cv) return; var ctx = cv.getContext("2d"), P = S.player;
    var sc = S.scale || 1; ctx.setTransform(sc, 0, 0, sc, 0, 0);
    var shx = S.shake ? (S.R() - 0.5) * S.shake : 0, shy = S.shake ? (S.R() - 0.5) * S.shake : 0;
    ctx.save(); ctx.translate(shx, shy);
    ctx.drawImage(S.floor, 0, 0);
    if (S.gate) { var gl = ctx.createLinearGradient(0, AH - 30, 0, AH); gl.addColorStop(0, "rgba(95,224,180,0)"); gl.addColorStop(1, "rgba(95,224,180," + (0.25 + 0.35 * S.fleeT / 2) + ")"); ctx.fillStyle = gl; ctx.fillRect(S.gate.x - S.gate.w / 2, AH - 30, S.gate.w, 30); ctx.fillStyle = "rgba(220,255,240,.75)"; ctx.font = "600 9px Georgia,serif"; ctx.textAlign = "center"; ctx.fillText(S.fleeT > 0 ? "BREAKING AWAY…" : "ESCAPE", S.gate.x, AH - 8); }
    // zones
    S.zones.forEach(function (z) {
      var k = Math.min(1, z.t / z.wind);
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fillStyle = z.own === "p" ? "rgba(95,224,180,.10)" : "rgba(255,70,60,.12)"; ctx.fill();
      ctx.strokeStyle = z.own === "p" ? z.col : "rgba(255,90,80,.9)"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r * k, 0, Math.PI * 2); ctx.fillStyle = z.own === "p" ? hexA(z.col, 0.25) : "rgba(255,70,60,.28)"; ctx.fill();
    });
    // obstacles
    S.obs.forEach(function (q) {
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(q.x + 4, q.y + 6, q.r, q.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      if (q.kind === "tree") { ctx.fillStyle = "#1d3a22"; circle(ctx, q.x, q.y, q.r); ctx.fillStyle = "#2c5530"; circle(ctx, q.x - 4, q.y - 4, q.r * 0.7); ctx.fillStyle = "#3b6b3c"; circle(ctx, q.x - 6, q.y - 7, q.r * 0.35); }
      else if (q.kind === "pillar") { ctx.fillStyle = "#555b66"; circle(ctx, q.x, q.y, q.r); ctx.fillStyle = "#717886"; circle(ctx, q.x - 3, q.y - 3, q.r * 0.75); ctx.strokeStyle = "#2a2e35"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.fillStyle = "#6b4a2b"; ctx.fillRect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2); ctx.strokeStyle = "#3b2715"; ctx.lineWidth = 2; ctx.strokeRect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2); ctx.beginPath(); ctx.moveTo(q.x - q.r, q.y - q.r); ctx.lineTo(q.x + q.r, q.y + q.r); ctx.moveTo(q.x + q.r, q.y - q.r); ctx.lineTo(q.x - q.r, q.y + q.r); ctx.stroke(); }
    });
    // foe telegraphs
    S.foes.forEach(function (f) {
      if (!f.alive || f.state !== "windup") return;
      var T = f.atk === "slam" ? 0.62 : 0.5, k = 1 - Math.max(0, f.t) / T;
      if (f.atk === "slam") { ctx.beginPath(); ctx.arc(f.x, f.y, 58, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,90,80,.9)"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.beginPath(); ctx.arc(f.x, f.y, 58 * k, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,70,60,.3)"; ctx.fill(); }
      else { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.aim); ctx.fillStyle = "rgba(255,70,60," + (0.15 + 0.3 * k) + ")"; ctx.fillRect(0, -f.r * 0.8, f.atk === "charge" ? 190 : 120, f.r * 1.6); ctx.restore(); }
    });
    // shots
    S.shots.forEach(function (sh) {
      var tr = sh.trail || []; for (var i = 0; i < tr.length; i++) { ctx.fillStyle = hexA(sh.col, (i + 1) / tr.length * 0.35); circle(ctx, tr[i][0], tr[i][1], sh.r * (i + 1) / tr.length); }
      ctx.shadowColor = sh.col; ctx.shadowBlur = 12; ctx.fillStyle = sh.own === "e" ? "#ff8a7a" : "#fffbe8"; circle(ctx, sh.x, sh.y, sh.r * 0.55); ctx.fillStyle = hexA(sh.col, 0.8); circle(ctx, sh.x, sh.y, sh.r * (sh.big ? 1.5 : 1)); ctx.shadowBlur = 0;
    });
    // allies, foes, player
    S.allies.forEach(function (al) { if (al.alive) token(ctx, al.x, al.y, al.r, "#5fe0b4", initials(al.name), null, 0); });
    S.foes.forEach(function (f) {
      if (!f.alive) { ctx.globalAlpha = 0.35; token(ctx, f.x, f.y, f.r, "#555", "✕", null, 0); ctx.globalAlpha = 1; return; }
      token(ctx, f.x, f.y, f.r, f.hitFlash > 0 ? "#ffffff" : attrCol(f.attr || (f.kind === "beast" ? "earth" : "blood")), f.kind === "beast" ? "\u{1F43A}" : initials(f.name), null, f.stun > 0 ? 1 : 0);
      var w = 34; ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(f.x - w / 2, f.y - f.r - 10, w, 4); ctx.fillStyle = "#e05a4b"; ctx.fillRect(f.x - w / 2, f.y - f.r - 10, w * Math.max(0, f.hp) / f.max, 4);
      if (S.target === f) { ctx.strokeStyle = "#f3dda0"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    });
    if (P.barrier > 0) { ctx.beginPath(); ctx.arc(P.x, P.y, P.r + 9, 0, Math.PI * 2); ctx.strokeStyle = hexA(S.col, 0.9); ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = hexA(S.col, 0.12); ctx.fill(); }
    if (P.guard) { ctx.beginPath(); ctx.arc(P.x, P.y, P.r + 5, P.face - 1, P.face + 1); ctx.strokeStyle = S.guardTech ? hexA(S.col, 0.95) : "#e8ecf2"; ctx.lineWidth = 4; ctx.stroke(); }
    if (P.iframe > 0) ctx.globalAlpha = 0.55;
    token(ctx, P.x, P.y, P.r, P.hurt > 0 ? "#ff6a5a" : S.col, initials(v.player_name || "You"), S.img, 0);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,246,220,.9)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P.x + Math.cos(P.face) * (P.r + 2), P.y + Math.sin(P.face) * (P.r + 2)); ctx.lineTo(P.x + Math.cos(P.face) * (P.r + 8), P.y + Math.sin(P.face) * (P.r + 8)); ctx.stroke();
    // fx + text
    S.fx.forEach(function (f) {
      if (f.swing) { ctx.strokeStyle = hexA(f.col, f.life / 0.16); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, 40, f.a - 0.9, f.a + 0.9); ctx.stroke(); return; }
      ctx.fillStyle = hexA(f.col, Math.min(1, f.life * 2)); circle(ctx, f.x, f.y, f.r);
    });
    S.texts.forEach(function (t) { ctx.globalAlpha = Math.min(1, t.life / t.max * 1.6); ctx.font = (t.big ? "800 15px " : "700 12px ") + "Cinzel,Georgia,serif"; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.8)"; ctx.strokeText(t.t, t.x, t.y); ctx.fillStyle = t.col; ctx.fillText(t.t, t.x, t.y); });
    ctx.globalAlpha = 1;
    if (S.slow > 0) { ctx.fillStyle = "rgba(10,20,40," + (S.slow * 0.35) + ")"; ctx.fillRect(0, 0, AW, AH); }
    ctx.restore();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); ctx.fill(); }
  function hexA(hex, al) { var h = s(hex).replace("#", ""); if (h.length !== 6) return "rgba(255,255,255," + al + ")"; return "rgba(" + parseInt(h.slice(0, 2), 16) + "," + parseInt(h.slice(2, 4), 16) + "," + parseInt(h.slice(4, 6), 16) + "," + al + ")"; }
  function initials(name) { return s(name).split(/\s+/).filter(Boolean).slice(0, 2).map(function (x) { return x.charAt(0).toUpperCase(); }).join(""); }
  function token(ctx, x, y, r, col, txt, im, stunned) {
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(x + 2, y + r * 0.7, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0a1220"; circle(ctx, x, y, r);
    if (im && im.complete && im.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 2, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(im, x - r, y - r * 1.15, r * 2, r * 2 * (im.naturalHeight / im.naturalWidth)); ctx.restore(); }
    else if (txt) { ctx.fillStyle = col; ctx.font = "700 " + Math.round(r * 0.8) + "px Cinzel,Georgia,serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(txt, x, y + 1); ctx.textBaseline = "alphabetic"; }
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    if (stunned) { ctx.fillStyle = "#ffd84a"; ctx.font = "700 11px Georgia"; ctx.textAlign = "center"; ctx.fillText("✧ ✧", x, y - r - 13); }
  }

  // ---- input ----
  React.useEffect(function () {
    function key(e, down) {
      var S = g(); if (!S) return; var c = e.key.toLowerCase();
      var map = { arrowleft: "l", a: "l", arrowright: "r", d: "r", arrowup: "u", w: "u", arrowdown: "d", s: "d" };
      if (map[c]) { S.keys[map[c]] = down; e.preventDefault(); return; }
      if (!down) { if (c === "shift") S.player.guard = false; return; }
      if (c === " ") { dash(); e.preventDefault(); } else if (c === "j" || c === "f") strike(); else if (c === "shift") S.player.guard = true;
      else if (c === "1" || c === "2" || c === "3") cast(Number(c) - 1, e.altKey); else if (c === "e") { cast(0, true); } else if (c === "escape" || c === "p") setPaused(function (x) { return !x; });
      else if (c === "tab") { var alive = S.foes.filter(function (f) { return f.alive; }); if (alive.length) { var i = alive.indexOf(S.target); S.target = alive[(i + 1) % alive.length]; } e.preventDefault(); }
    }
    function kd(e) { key(e, true); } function ku(e) { key(e, false); }
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    return function () { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [phase, paused]);
  function stickDown(e) { var S = g(), r = stickRef.current.getBoundingClientRect(); S.stick = { on: true, id: e.pointerId, ox: r.left + r.width / 2, oy: r.top + r.height / 2, x: 0, y: 0 }; try { stickRef.current.setPointerCapture(e.pointerId); } catch (er) {} stickMove(e); }
  function stickMove(e) { var S = g(); if (!S.stick.on || S.stick.id !== e.pointerId) return; var dx = e.clientX - S.stick.ox, dy = e.clientY - S.stick.oy, d = Math.hypot(dx, dy), m = 44; if (d > m) { dx = dx / d * m; dy = dy / d * m; } S.stick.x = dx / m; S.stick.y = dy / m; var k = stickRef.current && stickRef.current.firstChild; if (k) k.style.transform = "translate(" + dx + "px," + dy + "px)"; }
  function stickUp(e) { var S = g(); if (S.stick.id !== e.pointerId) return; S.stick = { on: false, x: 0, y: 0 }; var k = stickRef.current && stickRef.current.firstChild; if (k) k.style.transform = ""; }
  function canvasTap(e) {
    var S = g(), cv = canvasRef.current; if (!cv) return; var r = cv.getBoundingClientRect(); var x = (e.clientX - r.left) / (S.cssScale || 1), y = (e.clientY - r.top) / (S.cssScale || 1);
    var hit = null; S.foes.forEach(function (f) { if (f.alive && Math.hypot(f.x - x, f.y - y) < f.r + 14) hit = f; });
    if (hit) { S.target = hit; say("Target", hit.x, hit.y - 30, "#f3dda0"); }
  }

  var S0 = g(); var foesList = S0.foes;
  if (phase === "intro") {
    return (
      <div className="bcb-root bcb-intro" role="dialog" aria-label="Battle">
        <div className="bcb-vs">
          <div className="bcb-vs-side bcb-vs-you"><div className="bcb-vs-portrait" style={{ borderColor: S0.col }}>{p.portrait ? <img src={p.portrait} alt="" /> : <span>{initials(v.player_name || "You")}</span>}</div><strong>{s(v.player_name) || "You"}</strong><small>{S0.attr ? S0.attr + " magic" : "Untested magic"}</small></div>
          <div className="bcb-vs-mark">VS</div>
          <div className="bcb-vs-side bcb-vs-foes">{foesList.map(function (f) { return <div key={f.key} className="bcb-vs-foe"><span className="bcb-vs-chip" style={{ borderColor: attrCol(f.attr || "blood") }}>{f.kind === "beast" ? "\u{1F43A}" : initials(f.name)}</span><div><strong>{f.name}</strong><small>{THREATS[f.threat].label + " · " + (f.kind === "caster" ? "Caster" : f.kind === "beast" ? "Beast" : "Brawler") + (f.attr ? " · " + f.attr : "")}</small></div></div>; })}</div>
        </div>
        <div className="bcb-howto">
          <div><b>Move</b> left stick / WASD</div><div><b>Dodge-roll</b> → invulnerable for a moment. Roll through an attack as it lands for a <i>Perfect Dodge</i>.</div>
          <div><b>Red zones</b> are attacks winding up — get out, or hit the foe first to <i>Interrupt</i>.</div><div><b>Spells</b> cost your real mana. Fill <b>Focus</b> to unleash a Full-output finisher.</div>
          {mode === "combat" ? <div><b>Escape</b> by standing in the green gate for 2 seconds with no one on you.</div> : <div>Sparring ends when either of you takes a clean beating. No AI turn is used.</div>}
        </div>
        <div className="bcb-intro-btns">
          <button type="button" className="bcb-big" onClick={function () { setPhase("fight"); }}>{mode === "spar" ? "Begin sparring" : "Fight!"}</button>
          <button type="button" className="bcb-ghost" onClick={p.onCancel}>{mode === "spar" ? "Not now" : "Let the story decide instead"}</button>
        </div>
      </div>
    );
  }
  if (phase === "result" && result) {
    var R2 = result; var title = { victory: "Victory", defeat: "Defeated", fled: "Escaped", yielded: mode === "spar" ? "You yield" : "Surrendered" }[R2.outcome];
    return (
      <div className="bcb-root bcb-result" role="dialog" aria-label="Battle result">
        <div className={"bcb-res-title bcb-res-" + R2.outcome}>{title}</div>
        <div className="bcb-grade">{R2.grade}</div>
        <div className="bcb-res-grid">
          <div><small>Time</small><strong>{R2.seconds + "s"}</strong></div><div><small>Damage dealt</small><strong>{R2.dealt}</strong></div>
          <div><small>Damage taken</small><strong>{R2.taken}</strong></div><div><small>Best combo</small><strong>{R2.bestCombo}</strong></div>
          <div><small>Perfect dodges</small><strong>{R2.perfect}</strong></div><div><small>Interrupts</small><strong>{R2.interrupts}</strong></div>
        </div>
        <div className="bcb-res-foes">{R2.foes.map(function (f) { return <div key={f.key}><span>{f.name}</span><em>{f.outcome}</em></div>; })}</div>
        {R2.spellsUsed.length ? <div className="bcb-res-spells">{R2.spellsUsed.map(function (m) { return m.name + " ×" + m.uses; }).join(" · ")}</div> : null}
        <div className="bcb-res-note">{mode === "spar" ? "Stamina, mana and fatigue are applied, and practice counts toward the spells you used. No AI turn is spent." : "Your body, mana and the foes' fates are applied now. The GM writes one aftermath passage — the fight itself cost no AI turns."}</div>
        <div className="bcb-intro-btns">
          <button type="button" className="bcb-big" onClick={function () { p.onFinish(R2, false); }}>{mode === "spar" ? "Finish" : "Write the aftermath"}</button>
          {mode === "spar" ? <button type="button" className="bcb-ghost" onClick={function () { p.onFinish(R2, true); }}>Finish & spar again</button> : null}
        </div>
      </div>
    );
  }
  var h = hud || snapshot();
  return (
    <div className="bcb-root" role="application" aria-label="Battle arena">
      <div className="bcb-top">
        <div className="bcb-bars">
          <div className="bcb-bar bcb-hp"><i style={{ width: cl(h.hp, 0, 100) + "%" }} /><span>{"Body " + Math.max(0, Math.round(h.hp))}</span></div>
          <div className="bcb-bar bcb-mp"><i style={{ width: cl(h.mana, 0, 100) + "%" }} /><span>{"Mana " + Math.round(h.mana) + "%"}</span></div>
          <div className="bcb-bar bcb-st"><i style={{ width: cl(h.st, 0, 100) + "%" }} /><span>{"Wind " + Math.round(h.st)}</span></div>
        </div>
        <div className="bcb-foebars">{h.foes.map(function (f, i) { return <button type="button" key={i} className={"bcb-foebar" + (f.alive ? "" : " down") + (f.target ? " tgt" : "")} onClick={function () { var S = g(); if (S.foes[i].alive) S.target = S.foes[i]; }}><span>{f.name}</span><i style={{ width: 100 * f.hp / f.max + "%" }} /></button>; })}</div>
        <button type="button" className="bcb-pause" aria-label="Pause" onClick={function () { setPaused(true); }}>II</button>
      </div>
      <div className="bcb-mid">
        {h.combo > 1 ? <div className="bcb-combo">{h.combo + " HIT"}</div> : null}
        {h.flee > 0 ? <div className="bcb-flee"><i style={{ width: 50 * h.flee + "%" }} /></div> : null}
        <div ref={wrapRef} className="bcb-canvaswrap" onPointerDown={canvasTap}><canvas ref={canvasRef} /></div>
      </div>
      <div className="bcb-controls">
        <div ref={stickRef} className="bcb-stick" onPointerDown={stickDown} onPointerMove={stickMove} onPointerUp={stickUp} onPointerCancel={stickUp} aria-label="Movement stick"><span /></div>
        <div className="bcb-actions">
          <div className="bcb-focus" aria-label={"Focus " + Math.round(h.focus) + "%"}><i style={{ height: h.focus + "%" }} /><span>{h.focus >= 100 ? "FULL" : "Focus"}</span></div>
          <div className="bcb-spells">
            {S0.moves.map(function (m, i) { var c = h.cds[i] || {}; var ready = c.cd <= 0 && c.ok; return (
              <button type="button" key={m.id} className={"bcb-spell" + (ready ? "" : " cool") + (h.focus >= 100 && ready ? " full" : "")} onPointerDown={function (e) { e.preventDefault(); cast(i, h.focus >= 100); }} aria-label={m.name + (c.ok ? "" : ", unavailable")}>
                <span className="bcb-spell-cd" style={{ height: (c.cd > 0 ? 100 * c.cd / c.max : 0) + "%" }} />
                <strong>{m.name}</strong><small>{c.ok ? (c.cost ? c.cost + "% mana" : "free") : "no mana"}</small>
              </button>); })}
            {!S0.moves.length ? <div className="bcb-nospell">No mana to cast with. Fight with your body.</div> : null}
          </div>
          <div className="bcb-core">
            <button type="button" className="bcb-btn bcb-strike" onPointerDown={function (e) { e.preventDefault(); strike(); }} aria-label="Strike">{S0.weapon ? "Slash" : "Strike"}</button>
            <button type="button" className="bcb-btn bcb-dash" onPointerDown={function (e) { e.preventDefault(); dash(); }} aria-label="Dodge-roll">Roll</button>
            <button type="button" className={"bcb-btn bcb-guard" + (h.guard ? " on" : "")} onPointerDown={function (e) { e.preventDefault(); g().player.guard = true; }} onPointerUp={function () { g().player.guard = false; }} onPointerLeave={function () { g().player.guard = false; }} aria-label="Guard (hold)">{S0.guardTech ? "Mana Skin" : "Guard"}</button>
          </div>
        </div>
      </div>
      {paused ? (
        <div className="bcb-pausepanel" role="dialog" aria-label="Paused">
          <strong>Paused</strong>
          <button type="button" className="bcb-big" onClick={function () { setPaused(false); }}>Resume</button>
          <button type="button" className="bcb-ghost" onClick={function () { setPaused(false); g().log.push("You threw down your guard and yielded"); finish("yielded"); }}>{mode === "spar" ? "End sparring" : "Yield / surrender"}</button>
          {mode === "combat" ? <button type="button" className="bcb-ghost" onClick={p.onCancel}>Leave it to the story (nothing is applied)</button> : null}
          <div className="bcb-keys">Keys: WASD move · Space roll · J strike · Shift guard · 1-3 spells · E finisher · Tab target</div>
        </div>
      ) : null}
    </div>
  );
}

export var BATTLE_CSS = [
  ".bcb-root{position:fixed;left:0;top:0;right:0;bottom:0;z-index:9500;display:flex;flex-direction:column;background:radial-gradient(ellipse at 50% 30%,#14243a,#04080f 75%);color:#f6edd7;font-family:'Cormorant Garamond',Georgia,serif;touch-action:none;user-select:none;-webkit-user-select:none}",
  ".bcb-top{display:flex;align-items:flex-start;gap:6px;width:100%;max-width:760px;margin:0 auto;box-sizing:border-box;padding:calc(6px + env(safe-area-inset-top)) 8px 4px}",
  ".bcb-bars{display:flex;flex-direction:column;gap:3px;width:42%}",
  ".bcb-bar{position:relative;height:15px;border-radius:8px;background:#05080e;border:1px solid rgba(214,174,92,.55);overflow:hidden}",
  ".bcb-bar i{position:absolute;left:0;top:0;bottom:0;transition:width .12s}",
  ".bcb-hp i{background:linear-gradient(180deg,#e05a4b,#8a2622)}.bcb-mp i{background:linear-gradient(180deg,#47a8ee,#155f90)}.bcb-st i{background:linear-gradient(180deg,#4ccf7d,#246c41)}",
  ".bcb-bar span{position:relative;display:block;white-space:nowrap;padding-left:7px;font-size:10.5px;font-weight:800;color:#fff6dc;text-shadow:0 1px 2px #000;line-height:15px}",
  ".bcb-foebars{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0}",
  ".bcb-foebar{position:relative;height:15px;padding:0;border-radius:4px;border:1px solid rgba(224,90,75,.6);background:#1a0808;overflow:hidden;text-align:left;color:#ffd9d4}",
  ".bcb-foebar i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(180deg,#c0392b,#6d1415);transition:width .12s}",
  ".bcb-foebar span{position:relative;z-index:1;padding-left:5px;font-size:10.5px;font-weight:800;text-shadow:0 1px 2px #000;white-space:nowrap}",
  ".bcb-foebar.tgt{border-color:#f3dda0;box-shadow:0 0 6px rgba(243,221,160,.5)}.bcb-foebar.down{opacity:.4}",
  ".bcb-pause{width:34px;height:34px;flex-shrink:0;border-radius:17px;border:1px solid rgba(214,174,92,.7);background:#0a1320;color:#f3dda0;font-weight:900}",
  ".bcb-mid{position:relative;flex:1;min-height:0;display:flex}",
  ".bcb-canvaswrap{flex:1;min-height:0;display:flex;align-items:center;justify-content:center}",
  ".bcb-canvaswrap canvas{border:1px solid rgba(214,174,92,.6);border-radius:8px;box-shadow:0 0 30px rgba(0,0,0,.6)}",
  ".bcb-combo{position:absolute;right:14px;top:8px;z-index:2;font:800 22px Cinzel,Georgia,serif;color:#f3dda0;text-shadow:0 2px 6px #000;animation:bcbPop .25s ease-out}",
  "@keyframes bcbPop{from{transform:scale(1.5);opacity:.4}to{transform:none;opacity:1}}",
  ".bcb-flee{position:absolute;left:50%;bottom:6px;z-index:2;width:120px;margin-left:-60px;height:6px;border-radius:3px;background:#05080e;overflow:hidden}.bcb-flee i{display:block;height:100%;background:#5fe0b4}",
  ".bcb-controls{display:flex;align-items:flex-end;gap:8px;padding:6px 10px calc(10px + env(safe-area-inset-bottom))}",
  ".bcb-stick{position:relative;flex-shrink:0;width:112px;height:112px;border-radius:56px;border:1px solid rgba(214,174,92,.5);background:radial-gradient(circle,rgba(20,34,52,.9),rgba(6,12,22,.9));touch-action:none}",
  ".bcb-stick span{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:23px;background:radial-gradient(circle at 40% 35%,#f3dda0,#9a7431);box-shadow:0 2px 8px rgba(0,0,0,.6)}",
  ".bcb-actions{flex:1;display:flex;gap:6px;align-items:flex-end;min-width:0}",
  ".bcb-focus{position:relative;width:16px;height:112px;flex-shrink:0;border-radius:8px;border:1px solid rgba(214,174,92,.6);background:#05080e;overflow:hidden}",
  ".bcb-focus i{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(0deg,#9a7431,#f3dda0);transition:height .1s}",
  ".bcb-focus span{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-90deg);font-size:9px;font-weight:900;letter-spacing:.1em;color:#fff6dc;text-shadow:0 1px 2px #000;white-space:nowrap}",
  ".bcb-spells{flex:1;display:flex;flex-direction:column;gap:5px;min-width:0}",
  ".bcb-spell{position:relative;min-height:34px;padding:3px 8px;border-radius:7px;border:1px solid rgba(95,224,180,.7);background:linear-gradient(180deg,#0f3a36,#082220);color:#e8fff7;text-align:left;overflow:hidden}",
  ".bcb-spell strong{position:relative;display:block;font-size:13px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".bcb-spell small{position:relative;display:block;font-size:10.5px;color:#a8f0d8}",
  ".bcb-spell-cd{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.6)}",
  ".bcb-spell.cool{opacity:.6}.bcb-spell.full{border-color:#f3dda0;box-shadow:0 0 10px rgba(243,221,160,.6)}",
  ".bcb-nospell{font-size:12px;color:#b8ad99;padding:4px}",
  ".bcb-core{display:grid;grid-template-columns:1fr 1fr;gap:5px;width:118px;flex-shrink:0}",
  ".bcb-btn{min-height:52px;border-radius:26px;border:1px solid rgba(214,174,92,.7);background:radial-gradient(circle at 50% 35%,#24314a,#070c16);color:#f6edd7;font-weight:800;font-size:13px}",
  ".bcb-strike{grid-column:1/-1;min-height:56px;background:radial-gradient(circle at 50% 35%,#6d1f1a,#2a0907);border-color:#e05a4b}",
  ".bcb-guard.on{border-color:#f3dda0;background:radial-gradient(circle,#3a3018,#141109)}",
  ".bcb-btn:active,.bcb-spell:active{transform:scale(.95)}",
  ".bcb-pausepanel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(320px,86vw);display:flex;flex-direction:column;gap:8px;padding:16px;border:1px solid #f3dda0;border-radius:12px;background:rgba(9,15,26,.97);text-align:center}",
  ".bcb-pausepanel strong{font:700 20px Cinzel,Georgia,serif;color:#f3dda0}",
  ".bcb-keys{font-size:11.5px;color:#b8ad99}",
  ".bcb-big{min-height:48px;border-radius:8px;border:1px solid #f5e0a2;background:linear-gradient(180deg,#f0d38a,#b38b3c);color:#2a1d0c;font:700 17px Cinzel,Georgia,serif;letter-spacing:.06em}",
  ".bcb-ghost{min-height:42px;border-radius:8px;border:1px solid rgba(214,174,92,.55);background:#0a1320;color:#e1d6c1;font-weight:700;font-size:14px}",
  ".bcb-intro,.bcb-result{align-items:center;justify-content:center;gap:14px;padding:20px 16px;overflow-y:auto}",
  ".bcb-vs{display:flex;align-items:center;gap:12px;width:100%;max-width:520px;animation:bcbPop .4s ease-out}",
  ".bcb-vs-side{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}",
  ".bcb-vs-you{align-items:center;text-align:center}",
  ".bcb-vs-portrait{width:84px;height:84px;border-radius:42px;border:3px solid;overflow:hidden;background:#0a1220;display:flex;align-items:center;justify-content:center;font:700 26px Cinzel,Georgia,serif}",
  ".bcb-vs-portrait img{width:100%;height:100%;object-fit:cover}",
  ".bcb-vs-side strong{font:700 15px Cinzel,Georgia,serif;color:#f6edd7}.bcb-vs-side small{font-size:12px;color:#b8ad99}",
  ".bcb-vs-mark{font:900 34px Cinzel,Georgia,serif;color:#e05a4b;text-shadow:0 0 18px rgba(224,90,75,.7)}",
  ".bcb-vs-foe{display:flex;align-items:center;gap:8px}.bcb-vs-foe strong,.bcb-vs-foe small{display:block}.bcb-vs-foe small{opacity:.75;font-size:11px}",
  ".bcb-vs-chip{flex-shrink:0;width:38px;height:38px;border-radius:19px;border:2px solid;display:flex;align-items:center;justify-content:center;background:#1a0808;font:700 14px Cinzel,Georgia,serif}",
  ".bcb-howto{max-width:520px;display:flex;flex-direction:column;gap:5px;padding:10px 12px;border:1px solid rgba(214,174,92,.45);border-radius:9px;background:rgba(10,18,30,.85);font-size:14px;color:#e1d6c1;line-height:1.35}",
  ".bcb-howto b{color:#f3dda0}",
  ".bcb-intro-btns{display:flex;flex-direction:column;gap:8px;width:100%;max-width:360px}",
  ".bcb-res-title{font:800 30px Cinzel,Georgia,serif;letter-spacing:.08em}",
  ".bcb-res-victory{color:#f3dda0}.bcb-res-defeat{color:#e05a4b}.bcb-res-fled{color:#5fe0b4}.bcb-res-yielded{color:#c4c8cf}",
  ".bcb-grade{width:84px;height:84px;border-radius:42px;border:3px solid #f3dda0;display:flex;align-items:center;justify-content:center;font:900 44px Cinzel,Georgia,serif;color:#f3dda0;box-shadow:0 0 24px rgba(243,221,160,.4);animation:bcbPop .5s ease-out}",
  ".bcb-res-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;width:100%;max-width:420px}",
  ".bcb-res-grid div{padding:6px;border:1px solid rgba(214,174,92,.4);border-radius:7px;background:rgba(10,18,30,.8);text-align:center}",
  ".bcb-res-grid small{display:block;font-size:11px;color:#b8ad99}.bcb-res-grid strong{font:700 18px Cinzel,Georgia,serif;color:#f6edd7}",
  ".bcb-res-foes{width:100%;max-width:420px}.bcb-res-foes div{display:flex;justify-content:space-between;padding:4px 2px;border-bottom:1px solid #283344;font-size:14px}.bcb-res-foes em{font-style:normal;color:#f3dda0;text-transform:capitalize}",
  ".bcb-res-spells{font-size:13px;color:#a8f0d8}",
  ".bcb-res-note{max-width:420px;font-size:13px;color:#b8ad99;text-align:center}",
  "@media (min-width:820px){.bcb-controls{max-width:760px;margin:0 auto;width:100%}}"
].join("\n");
