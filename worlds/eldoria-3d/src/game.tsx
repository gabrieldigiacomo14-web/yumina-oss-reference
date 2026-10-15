// @ts-nocheck
// The real-time layer. The 3D client owns moment-to-moment play (walking, fighting,
// harvesting, discovering) and writes the results into the same variables the AI
// Game Master reads. Conversation, trade, quests and anything social go to the GM.
import { T, glowTex, textSprite, makeEnvironment } from "./three";
import * as SURF from "./surfaces";
import { MILE, heightAt, landSD, describe, insidePlace, PLACES, PLACE_BY_ID, nearestPlace, biomeAt, realmAt, roadAt, riverAt, hash2, hashStr, rng, placesNear, districtsOf, wildNameAt, mapColor } from "./worldgen";
import { Terrain, Environment, CH } from "./terrain";
import { buildSettlement, styleOf } from "./settlements";
import { animateHumanoid, playAction, attackClip } from "./anim";
import { makeHumanoid, makeCreature, animateCreature, CALLING_LOOK, SKIN_TONES, HAIR_COLORS, HAIR_STYLES } from "./models";
import { AURELIA_PEOPLE, TRAINERS } from "./data";
import * as R from "./rules";
import * as C from "./combat";
import * as B from "./cbase";
import * as SC from "./spellcast";
import * as S from "./spells";
import * as I from "./items";
import * as RIG from "./rig";
import * as WG from "./worldgen";
import * as SET from "./settlements";
import { Fx } from "./vfx";

// ------------------------------------------------------------------ calendar (Concord Reckoning, mirrors the original sheet)
export var MONTHS = ["Frostwane", "Thawrise", "Dawnswell", "Rainmoot", "Bloomtide", "Suncrest", "Highsun", "Goldfield", "Harvestfall", "Emberwane", "Longnight", "Deepfrost"];
var WEEKDAYS = ["Moonday", "Forgeday", "Marketday", "Oathday", "Wayday", "Hearthday", "Dawnday"];
var MONTH_IX = {}; MONTHS.forEach(function (n, i) { MONTH_IX[n.toLowerCase()] = i; }); ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].forEach(function (n, i) { MONTH_IX[n] = i; });
export function parseDate(t) { var m = String(t || "").match(/(?:[A-Za-z-]+,\s*)?([A-Za-z]+)\s+(\d{1,2}),\s*(\d{1,4})/); if (!m) return null; var mi = MONTH_IX[m[1].toLowerCase()]; if (mi == null) return null; return Math.floor(Date.UTC(Number(m[3]), mi, Number(m[2])) / 86400000); }
export function formatDate(day) { var dt = new Date(day * 86400000); var anchor = Math.floor(Date.UTC(1247, 2, 3) / 86400000); var wd = WEEKDAYS[((6 + day - anchor) % 7 + 7) % 7]; return wd + ", " + MONTHS[dt.getUTCMonth()] + " " + dt.getUTCDate() + ", " + dt.getUTCFullYear() + " AR"; }
export function parseTime(t) { var m = String(t || "").match(/(\d{1,2}):(\d{1,2})\s*(AM|PM)?/i); if (!m) return 480; var h = Number(m[1]) % 12, mi = Number(m[2]); if (m[3] && m[3].toUpperCase() === "PM") h += 12; if (!m[3] && Number(m[1]) >= 12) h = Number(m[1]); return h * 60 + mi; }
export function formatTime(min) { min = ((Math.floor(min) % 1440) + 1440) % 1440; var h = Math.floor(min / 60), m = min % 60; var ap = h >= 12 ? "PM" : "AM"; var h12 = h % 12 || 12; return (h12 < 10 ? "0" : "") + h12 + ":" + (m < 10 ? "0" : "") + m + " " + ap; }
export function timeOfDay(min) { var h = min / 60; return h < 1 ? "Midnight" : h < 5 ? "Night" : h < 7 ? "Dawn" : h < 11 ? "Morning" : h < 13 ? "Mid-Day" : h < 17 ? "Afternoon" : h < 19 ? "Evening" : h < 20.5 ? "Dusk" : "Night"; }

// ------------------------------------------------------------------ fog of war (5-mile cells, run-length encoded into a hidden variable)
export var FOG_CELL = 5;
export var FOG_W = 500;
export var FOG_H = 360;
export function fogEncode(bits) { var out = [], cur = 0, run = 0; for (var i = 0; i < bits.length; i++) { var b = bits[i] ? 1 : 0; if (b === cur) run++; else { out.push(run.toString(36)); cur = b; run = 1; } } out.push(run.toString(36)); return out.join("."); }
export function fogDecode(s, bits) { if (!s) return bits; var parts = String(s).split("."), i = 0, cur = 0; parts.forEach(function (p) { var n = parseInt(p, 36) || 0; if (cur) bits.fill(1, i, Math.min(bits.length, i + n)); i += n; cur ^= 1; }); return bits; }
export function fogIndex(x, y) { var cx = Math.floor((x + 1250) / FOG_CELL), cy = Math.floor((900 - y) / FOG_CELL); if (cx < 0 || cy < 0 || cx >= FOG_W || cy >= FOG_H) return -1; return cy * FOG_W + cx; }

var NAMES = {
  "Aurelia": [["Aldous", "Bryn", "Cedric", "Della", "Edric", "Faye", "Garrick", "Hanna", "Ivo", "Joan", "Kester", "Lise", "Merek", "Nell", "Osric", "Petra", "Rowan", "Sabine", "Tobin", "Una", "Wat", "Mirela"], ["Ashby", "Brook", "Carter", "Dunmore", "Fletcher", "Greaves", "Hollis", "Marsh", "Pike", "Wren", "Tanner", "Cobb"]],
  "Stonehold": [["Borin", "Dagny", "Thrain", "Hilda", "Gorm", "Brunhild", "Durgan", "Kelda", "Orsik", "Vigdis", "Harbek", "Ylsa"], ["Ironhand", "Stonebrow", "Deepdelver", "Coalbeard", "Anvilborn", "Granitefist"]],
  "Sylvanor": [["Aerin", "Caladwen", "Faelar", "Ithil", "Lirael", "Nimra", "Saelith", "Thalion", "Elaria", "Vaeril", "Miriel"], ["Dawnbrook", "Leafwhisper", "Mossheart", "Starbough", "of the Glade"]],
  "Drakmor": [["Bjorn", "Sigrid", "Ulf", "Astrid", "Ragna", "Hakon", "Ingrid", "Torvald", "Eira", "Leif", "Solveig"], ["Frostborn", "Ironside", "Wolfsbane", "Hardrada", "Snowmane"]],
  "Sunscar": [["Amir", "Yasmin", "Zahra", "Khalid", "Nadia", "Rashid", "Samira", "Tariq", "Laila", "Farid"], ["al-Marran", "ibn Sahl", "al-Qadir", "bint Rafa", "al-Zahir"]],
  "Velkar": [["Marco", "Lucia", "Tomas", "Bianca", "Enzo", "Carla", "Dario", "Livia", "Paolo", "Sera"], ["Vantelli", "Moro", "Castell", "Brine", "Galeano"]],
  "Umbral Reach": [["Mordecai", "Vesna", "Grim", "Ilse", "Corvus", "Ashra", "Lenk", "Morwen", "Silas"], ["Ashgrave", "Blackthorn", "Duskmere", "Hollow"]],
  "The Marches": [["Garth", "Hild", "Rook", "Tamsin", "Brann", "Eda", "Kord"], ["Coldwater", "Hardgrave", "Stone", "Marchwick"]]
};
var CLOTH = ["#5a4a3a", "#3a4a5a", "#6a3a30", "#4a5a3a", "#6a5a40", "#3a3a40", "#7a6a50", "#5a3a4a"];

function placeLabel(p) { return p ? p.name : ""; }

export function Game(container, bridge, quality) {
  this.container = container; this.bridge = bridge; this.api = bridge.api; this.q = quality;
  this.keys = {}; this.move = { x: 0, y: 0 }; this.camYaw = Math.PI; this.camPitch = 0.12; this.camDist = 5.6; this.yaw = Math.PI;
  this.pos = { x: 0, y: 10, z: 0 }; this.vy = 0; this.grounded = true; this.running = false;
  this.settlements = {}; this.npcs = []; this.monsters = []; this.projectiles = []; this.floaters = []; this.corpses = [];
  this.combatLog = []; this.report = []; this.dirty = {}; this.lastSynced = {}; this.prevSynced = {}; this.pendingAt = {}; this.echo = {};
  this.fog = new Uint8Array(FOG_W * FOG_H); this.fogVersion = 0; this.slain = {}; this.spawnedCells = {};
  this.target = null; this.cooldowns = {}; this.res = 0; this.buffs = {}; this.down = false; this.dodgeT = 0; this.encounterUsed = {};
  this.clock = 0; this.lastClockWrite = 0; this.lastFlush = 0; this.hudT = 0; this.place = null; this.lastPlace = null; this.walked = 0; this.walkFrom = null;
  this.allies = []; this.tgt = null; this.autoReact = true; this.pe = B.playerEntity(this); this.interact = null; this.talking = null; this.inCombat = false; this.combatSummary = null; this.time = 0; this.disposed = false; this.v = {};
}

Game.prototype.start = function (v) {
  var THREE = T(); var self = this; this.v = v || {}; window.__eldoriaRules = R; window.__eldoria = { WG: WG, SET: SET, R: R, B: B, SC: SC, S: S, I: I, C: C, RIG: RIG, M: { makeHumanoid: makeHumanoid, makeCreature: makeCreature }, A: { animateHumanoid: animateHumanoid, playAction: playAction } }; /* debugging hooks for the test harness */
  SURF.setSurfaceQuality(this.q.surface);
  var r = new THREE.WebGLRenderer({ antialias: this.q.aa, powerPreference: "high-performance" });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.pixelRatio)); r.setSize(this.container.clientWidth, this.container.clientHeight);
  if (THREE.sRGBEncoding) r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = this.q.shadows; r.shadowMap.type = THREE.PCFSoftShadowMap;
  this.container.appendChild(r.domElement); r.domElement.style.display = "block"; r.domElement.style.touchAction = "none";
  this.renderer = r; this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(58, this.container.clientWidth / this.container.clientHeight, 0.2, this.q.far + 600);
  this.fx = new Fx(this.scene); this.env = new Environment(this.scene, r, this.q); this.terrain = new Terrain(this.scene, { radius: this.q.radius, veg: this.q.veg }); this.terrain.seaMat = this.env.sea.material;
  // player
  this.buildPlayer(v);
  this.adoptState(v, true);
  // pre-warm the area around the player so they never spawn over a hole
  this.terrain.warm(this.pos.x, this.pos.z, 1);
  this.pos.y = this.terrain.groundAt(this.pos.x, this.pos.z);
  this.loadSettlements(true);
  var sp0 = this.safeSpot(this.pos.x, this.pos.z); this.pos.x = sp0.x; this.pos.z = sp0.z; this.pos.y = this.terrain.groundAt(this.pos.x, this.pos.z);
  this.syncAllies(true);
  this.bindInput();
  this.onResize = function () { if (!self.renderer) return; var w = self.container.clientWidth, h = self.container.clientHeight; self.renderer.setSize(w, h); self.camera.aspect = w / h; self.camera.updateProjectionMatrix(); };
  window.addEventListener("resize", this.onResize);
  this.ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(this.onResize) : null; if (this.ro) this.ro.observe(this.container);
  var w3b = (v["world3d-state"] || {}).battle; if (w3b) { try { C.restore(this, w3b); } catch (e) { console.error(e); this.battle = null; this.inCombat = false; } }
  this.last = performance.now();
  var loop = function () { if (self.disposed) return; self.raf = requestAnimationFrame(loop); var now = performance.now(); if (self.q.fpsCap && now - self.last < 1000 / self.q.fpsCap - 4) return; var raw = (now - self.last) / 1000; self.pace(raw); var dt = Math.min(0.1, raw); self.last = now; self.wall = Math.min(1, raw); try { self.frame(dt); } catch (e) { if (!self.errShown) { self.errShown = true; console.error(e); self.bridge.toast && self.bridge.toast("3D error: " + e.message, "error"); } } };
  loop();
};

Game.prototype.buildPlayer = function (v) {
  if (this.player) this.scene.remove(this.player.root);
  var look = Object.assign({}, R.clamp ? {} : {}, (v["player-avatar"] && typeof v["player-avatar"] === "object") ? v["player-avatar"] : {});
  look.calling = look.calling || v["starting-calling"] || v["player-class"] || "Fighter"; look.species = v["player-species"] || look.species; look.gender = v["player-gender"] || look.gender;
  var wp = R.weaponProfile(v); if (wp.kind !== "none") look.weapon = wp.kind; else look.weapon = "none";
  if (R.hasShield(v)) look.shield = true;
  this.player = makeHumanoid(look); this.scene.add(this.player.root); this.playerLookKey = JSON.stringify(look);
  // the arcane light orb (spell) follows the player
};

// The nearest place to (x, z) where the player can stand: dry, out of the river, off cliff faces, outside every building.
Game.prototype.safeSpot = function (x, z) {
  var self = this;
  function ok(px, pz) {
    if (self.terrain && self.terrain.deckAt(px, pz)) return true; if (!WG.spawnOK(px, pz)) return false;
    var c = self.collide(px, pz, 0.7); return Math.hypot(c.x - px, c.z - pz) < 0.02;
  }
  var r = WG.safeSpawn(x, z, ok); return { x: r.x, z: r.z };
};

// ------------------------------------------------------------------ state sync
function num(x, d) { var n = Number(x); return isFinite(n) ? n : d; }
Game.prototype.adoptState = function (v, initial) {
  var x = num(v["player-x"], 0), y = num(v["player-y"], 0);
  this.pos.x = x * MILE; this.pos.z = -y * MILE;
  // never stand in the sea, a river, a cliff face or a building: move to the nearest safe spot (bridge decks count as safe)
  var sp = this.safeSpot(this.pos.x, this.pos.z); this.pos.x = sp.x; this.pos.z = sp.z;
  this.pos.y = this.terrain ? this.terrain.groundAt(this.pos.x, this.pos.z) : heightAt(x, y);
  this.lastSynced["player-x"] = x; this.lastSynced["player-y"] = y;
  var day = parseDate(v["world-date"]); if (day == null) day = Math.floor(Date.UTC(1247, 2, 3) / 86400000); this.clock = day * 1440 + parseTime(v["world-time"]); this.lastSynced.clock = this.clock; this.lastClockWrite = this.clock;
  this.stats = { hp: num(v["player-hp"], 20), maxHp: num(v["player-max-hp"], 20), mp: num(v["player-mana"], 10), maxMp: num(v["player-max-mana"], 10), sp: num(v["player-stamina"], 20), maxSp: num(v["player-max-stamina"], 20) };
  ["player-hp", "player-mana", "player-stamina"].forEach(function (k) { this.lastSynced[k] = num(v[k], 0); }, this);
  var w3 = v["world3d-state"]; if (initial && w3 && typeof w3 === "object") { if (w3.fog) fogDecode(w3.fog, this.fog); this.slain = w3.slain || {}; }
  this.revealAround(true); this.down = this.stats.hp <= 0;
  if (initial) { this.walkFrom = describe(x, y); var cur = insidePlace(x, y); this.lastPlace = cur ? cur.id : null; }
};
// Called whenever Yumina's variables change. Distinguishes the GM's writes from our own echoes.
Game.prototype.setVars = function (v) {
  var self = this; this.v = v || {}; if (!this.renderer) return; var now = performance.now();
  var ov = null; for (var pid in this.pendingAt) if (now - this.pendingAt[pid] < 4000 && this.lastSynced[pid] !== undefined) { ov = ov || Object.assign({}, v); ov[pid] = this.lastSynced[pid]; }
  var vFresh = v; if (ov) this.v = ov;
  function external(id, val, eq) {
    var last = self.lastSynced[id]; if (eq ? eq(val, last) : val === last) return false;
    // any value we held or wrote in the last few seconds is our own write still travelling, not the GM's
    var hist = self.echo[id] || []; for (var i = 0; i < hist.length; i++) { if (now - hist[i].t < 9000 && (eq ? eq(val, hist[i].v) : val === hist[i].v)) return false; }
    return true;
  }
  var x = num(v["player-x"], 0), y = num(v["player-y"], 0);
  if (external("player-x", x, near) || external("player-y", y, near)) {
    // the GM moved us (travel narrated in chat): teleport to the written coordinates
    this.lastSynced["player-x"] = x; this.lastSynced["player-y"] = y; this.teleportMiles(x, y, false);
  }
  var day = parseDate(v["world-date"]); var clk = day == null ? this.clock : day * 1440 + parseTime(v["world-time"]);
  if (external("clock", clk, function (a, b) { return Math.abs(a - b) < 1; })) { this.clock = clk; this.lastSynced.clock = clk; this.lastClockWrite = clk; }
  var map = { "player-hp": "hp", "player-mana": "mp", "player-stamina": "sp" };
  for (var k in map) { var val = num(v[k], 0); if (external(k, val)) { this.stats[map[k]] = val; this.lastSynced[k] = val; } }
  this.stats.maxHp = num(v["player-max-hp"], this.stats.maxHp); this.stats.maxMp = num(v["player-max-mana"], this.stats.maxMp); this.stats.maxSp = num(v["player-max-stamina"], this.stats.maxSp);
  if (this.down && this.stats.hp > 0) { this.down = false; this.toast("You are back on your feet.", "info"); }
  // re-dress the avatar when the calling, species or weapon changes
  var look = Object.assign({}, v["player-avatar"] || {}); look.calling = look.calling || v["starting-calling"] || "Fighter"; var wp = R.weaponProfile(this.v); look.weapon = wp.kind; if (R.hasShield(this.v)) look.shield = true; look.species = v["player-species"] || look.species; look.gender = v["player-gender"] || look.gender;
  if (JSON.stringify(look) !== this.playerLookKey) { var p0 = this.player.root.position.clone(), rot = this.player.root.rotation.y; this.buildPlayer(this.v); this.player.root.position.copy(p0); this.player.root.rotation.y = rot; }
  function near(a, b) { return Math.abs(a - b) < 0.6; }
};
// Our latest value for a variable while our write is still in flight, else the shared state.
Game.prototype.cur = function (id) { if (this.pendingAt[id] && performance.now() - this.pendingAt[id] < 8000 && this.lastSynced[id] !== undefined) return this.lastSynced[id]; return this.v[id]; };
Game.prototype.remember = function (id, oldVal) { var now = performance.now(); var h = (this.echo[id] = (this.echo[id] || []).filter(function (e) { return now - e.t < 9000; })); h.push({ v: oldVal, t: now }); if (h.length > 40) h.shift(); };
Game.prototype.write = function (id, value) { this.remember(id, this.lastSynced[id]); this.prevSynced[id] = this.lastSynced[id]; this.lastSynced[id] = value; this.pendingAt[id] = performance.now(); this.dirty[id] = value; if (this.v[id] !== value) { this.v = Object.assign({}, this.v); this.v[id] = value; } /* rules read this.v, so our own writes are visible at once */ };
// Persist everything pending; resolves when the server confirmed (or immediately on old hosts).
Game.prototype.flush = function () {
  var patch = this.dirty; this.dirty = {}; var keys = Object.keys(patch); this.lastFlush = performance.now(); if (!keys.length) return Promise.resolve();
  var api = this.api;
  try { if (api.patchVariables) return api.patchVariables(patch).catch(function () { keys.forEach(function (k) { api.setVariable(k, patch[k]); }); }); } catch (e) { }
  keys.forEach(function (k) { api.setVariable(k, patch[k]); }); return Promise.resolve();
};
Game.prototype.writeClock = function (force) {
  if (!force && Math.abs(this.clock - this.lastClockWrite) < 15) return;
  var day = Math.floor(this.clock / 1440), min = this.clock - day * 1440; this.lastClockWrite = this.clock;
  var dt = formatDate(day), tm = formatTime(min);
  if (dt !== this.v["world-date"]) this.dirty["world-date"] = dt; if (tm !== this.v["world-time"]) this.dirty["world-time"] = tm;
  this.remember("clock", this.lastSynced.clock); this.prevSynced.clock = this.lastSynced.clock; this.lastSynced.clock = day * 1440 + parseTime(tm); this.pendingAt.clock = performance.now();
};
Game.prototype.writePosition = function (force) {
  var x = Math.round(this.pos.x / MILE * 10) / 10, y = Math.round(-this.pos.z / MILE * 10) / 10;
  if (!force && Math.hypot(x - this.lastSynced["player-x"], y - this.lastSynced["player-y"]) < 0.5) return;
  this.write("player-x", x); this.write("player-y", y);
  var d = describe(x, y), cur = this.v;
  var sub = this.subOverride || d.sublocation;
  if (cur["current-location"] !== d.location) this.dirty["current-location"] = d.location;
  if (cur["current-region"] !== d.region && !/Sea|Ocean/.test(d.region)) this.dirty["current-region"] = d.region;
  if (cur["current-sublocation"] !== sub) this.dirty["current-sublocation"] = sub;
  this.dirty["map-last-position"] = { x: x, y: y };
};
Game.prototype.writeStats = function () {
  if (this.battle) this.flushSoon(); var s = this.stats; var hp = Math.max(0, Math.round(s.hp)), mp = Math.max(0, Math.round(s.mp)), sp = Math.max(0, Math.round(s.sp));
  if (hp !== this.lastSynced["player-hp"]) this.write("player-hp", hp); if (mp !== this.lastSynced["player-mana"]) this.write("player-mana", mp); if (sp !== this.lastSynced["player-stamina"]) this.write("player-stamina", sp);
};
Game.prototype.write3d = function () { if (!this.fogEnc) this.fogEnc = fogEncode(this.fog); this.dirty["world3d-state"] = { v: 1, fog: this.fogEnc, slain: this.pruneSlain(), battle: C.serialize(this) }; };
Game.prototype.dirty3d = function () { this.write3d(); this.flushSoon(); };
Game.prototype.saveBattle = function () { this.write3d(); this.flushSoon(); };
// what the Game Master sees while a fight is on: the in-combat flag and a live combat block
Game.prototype.writeCombatState = function (on) {
  if (!on) { this.write("in-combat", false); this.write("combat-state", { round: 0, combatants: [], terrain: "", notes: "" }); this.flushSoon(); return; }
  var b = this.battle; if (!b) return; var self = this;
  var list = b.order.filter(function (c) { return c.kind === "player" || (c.e && !c.e.fled); }).map(function (c) { var e = c.e; return { name: c.name, side: c.kind === "monster" && B.sideOf(e) === "foe" ? "enemy" : "party", hp: Math.max(0, Math.round(e.hp)), maxHp: e.maxHp, conditions: B.conditionsText(e), distanceM: Math.round(B.dist(e, self.pos)), initiative: c.roll, active: b.active === c }; });
  this.write("in-combat", true); this.write("combat-state", { round: b.round, terrain: describe(this.pos.x / MILE, -this.pos.z / MILE).region || "", notes: "Turn-based 3D client encounter. A round is six seconds. Positions are tracked by the client; rolls use 3d6 per the Combat entries. Each combatant's HP below is current.", combatants: list }); this.flushSoon();
};
Game.prototype.pruneSlain = function () { var day = Math.floor(this.clock / 1440), out = {}; for (var k in this.slain) if (day - this.slain[k] < 6) out[k] = this.slain[k]; this.slain = out; return out; };

// ------------------------------------------------------------------ the GM report: everything that happened in real time since the last chat message
Game.prototype.log = function (line) { this.report.push(line); if (this.report.length > 40) this.report.shift(); };
Game.prototype.takeReport = function () {
  this.closeCombat(true); this.writePosition(true); this.writeClock(true); this.writeStats();
  var walked = this.walked > 0.4 ? "Walked about " + this.walked.toFixed(1) + " miles" + (this.walkFrom ? " from " + this.walkFrom.location : "") + "." : null; this.walked = 0; this.walkFrom = describe(this.pos.x / MILE, -this.pos.z / MILE);
  var lines = this.report.slice(); if (walked) lines.unshift(walked); this.report = [];
  return lines;
};

// ------------------------------------------------------------------ settlements
Game.prototype.loadSettlements = function (sync) {
  var x = this.pos.x / MILE, y = -this.pos.z / MILE, built = 0;
  for (var i = 0; i < PLACES.length; i++) {
    var p = PLACES[i]; var d = Math.hypot(p.x - x, p.y - y) * MILE; var have = this.settlements[p.id];
    if (!have && d < p.r * MILE + this.q.townRange && (sync || built < 1)) { var s = buildSettlement(p); this.scene.add(s.group); this.settlements[p.id] = s; this.terrain.addBridges(s.bridges); built++; }
    else if (have && d > p.r * MILE + this.q.townRange + 500) { this.unloadSettlement(p.id); }
  }
};
Game.prototype.unloadSettlement = function (id) {
  var s = this.settlements[id]; if (!s) return; this.scene.remove(s.group); s.group.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map && o.isSprite) { o.material.map.dispose(); o.material.dispose(); } });
  this.terrain.removeBridges(s.bridges); delete this.settlements[id];
  this.npcs = this.npcs.filter(function (n) { if (n.home === id) { this.scene.remove(n.h.root); return false; } return true; }, this);
};

// ------------------------------------------------------------------ townsfolk and named NPCs
Game.prototype.populate = function (s) {
  var p = s.place; var self = this; var r = rng(hashStr(p.id) + Math.floor(this.clock / 1440));
  if (s.populated) return; s.populated = true;
  var names = NAMES[p.realm] || NAMES.Aurelia;
  function nm(rr) { return names[0][Math.floor(rr() * names[0].length)] + " " + names[1][Math.floor(rr() * names[1].length)]; }
  var specs = [];
  // canon people of Aurelia City and the trainer index, placed in their districts
  if (p.id === "aurelia-city") {
    var where = { "Clerk Maren Holt": "Golden Lion Guildhall", "Quest Administrator Doran Vale": "Golden Lion Guildhall", "Examiner Sylas Reigh": "Golden Lion Guildhall", "Lord Mayor Cassian Verrow": "Crownward Palace", "Captain-Commander Bryse Odal": "North Barracks", "High Sister Elowen": "Temple Close", "Fingers Nel": "Ratsend" };
    AURELIA_PEOPLE.forEach(function (pp) { specs.push({ name: pp.name, title: titleFrom(pp.name, pp.desc), desc: pp.desc, district: where[pp.name], named: true }); });
  }
  TRAINERS.filter(function (t) { return t.place === p.id; }).forEach(function (t) {
    var dist = p.id === "aurelia-city" ? ({ "Master Halric Vane": "Golden Lion Guildhall", "Ser Maud Everly": "North Barracks", "Brannoc Tull": "Kingsgate", "Magister Ilya Ferrant": "Royal Archive", "Sister Aveline Corr": "Temple Close", "Dagna Ironhand": "Artisans’ Row", "Corvin Grey Aszelay": "Ratsend", "Old Pell": "Riverside Warehouses" })[t.name.replace(/"/g, "")] : null;
    specs.push({ name: t.name.replace(/"/g, ""), title: "Trainer — " + t.teaches, desc: t.detail, district: dist, named: true, trainer: t.teaches });
  });
  // people the GM has recorded at this place
  var ns = this.v["npc-state"]; if (ns && typeof ns === "object") Object.keys(ns).forEach(function (k) { var n = ns[k] || {}; var loc = String(n.location || n.lastSeen || n.where || "").toLowerCase(); if (loc && loc.indexOf(p.name.split(" / ")[0].toLowerCase()) >= 0 && !specs.some(function (s2) { return s2.name === n.name; })) specs.push({ name: n.name || k, title: n.role || n.occupation || "Acquaintance", desc: n.notes || n.description || "", named: true, gm: true, sub: n.sublocation }); });
  // role NPCs at doors, vendors and gates
  s.doors.forEach(function (d) { var role = { guild: "Guild Clerk", inn: "Innkeeper", temple: p.realm === "Sylvanor" ? "Grove Keeper" : "Priest", smithy: "Smith", bank: "Banker", gate: "Gate Guard", barracks: "Watch Sergeant", library: "Archivist", docks: "Dockmaster", palace: "Herald", market: "Market Warden", mine: "Foreman" }[d.kind]; if (role && !specs.some(function (s2) { return s2.district === d.name && s2.named; })) specs.push({ name: nm(r), title: role, district: d.name, at: d, role: role }); });
  s.vendors.slice(0, 10).forEach(function (vd) { specs.push({ name: nm(r), title: "Merchant", vendor: vd, role: "Merchant" }); });
  var crowd = { capital: 26, city: 16, "fort-town": 10, town: 9, village: 6, hamlet: 3, fort: 6, stronghold: 10, monastery: 4, camp: 4 }[p.kind] || 0;
  crowd = Math.round(crowd * (this.q.crowd == null ? 1 : this.q.crowd));
  for (var i = 0; i < crowd; i++) specs.push({ name: nm(r), title: r() < 0.15 ? "Guard" : r() < 0.5 ? "Townsfolk" : "Traveler", wander: true, role: "Townsfolk" });
  specs.forEach(function (sp, i) {
    var rr = rng(hashStr(p.id + sp.name + i)); var guard = /Guard|Sergeant|Captain|Watch/.test(sp.title);
    var look = { calling: guard ? "Fighter" : /Priest|Sister|Keeper/.test(sp.title) ? "Cleric" : /Archivist|Magister/.test(sp.title) ? "Mage" : /Smith|Ironhand/.test(sp.title + sp.name) ? "Battlesmith" : "Bard", species: p.realm === "Stonehold" ? (rr() < 0.8 ? "Dwarf" : "Human") : p.realm === "Sylvanor" ? (rr() < 0.75 ? "Elf" : "Half-Elf") : rr() < 0.08 ? "Elf" : rr() < 0.08 ? "Dwarf" : "Human",
      gender: /Sister|Clerk Maren|Elowen|Dagna|Maud|Aveline|Nerissa|Faelith|Widow|Hesper/.test(sp.name) ? "Female" : rr() < 0.45 ? "Female" : "Male", skin: SKIN_TONES[p.realm === "Sunscar" ? 2 + Math.floor(rr() * 3) : Math.floor(rr() * 4)], hair: HAIR_COLORS[Math.floor(rr() * 5)], hairStyle: HAIR_STYLES[Math.floor(rr() * 11)], face: Math.floor(rr() * 12), build: ["Slender", "Lean", "Athletic", "Sturdy", "Broad"][Math.floor(rr() * 5)], beard: rr() < 0.4 };
    if (!guard) { look.main = CLOTH[Math.floor(rr() * CLOTH.length)]; look.cloth = CLOTH[Math.floor(rr() * CLOTH.length)]; look.armor = rr() < 0.5 ? "robe" : "light"; look.weapon = "none"; look.cape = rr() < 0.4 ? CLOTH[Math.floor(rr() * CLOTH.length)] : null; look.hood = false; }
    else { var st = styleOf(p); look.cape = st.accent; look.weapon = rr() < 0.5 ? "spear" : "sword"; look.shield = rr() < 0.4; }
    if (/Maren/.test(sp.name)) { look.hair = "#8a8a88"; look.hairStyle = "Topknot"; }
    var h = makeHumanoid(Object.assign({ detail: "lo" }, look)); var spot = null;
    if (sp.vendor) spot = { x: sp.vendor.x, z: sp.vendor.z, rot: sp.vendor.rot };
    else if (sp.at) spot = { x: sp.at.x + (rr() - 0.5) * 4, z: sp.at.z + (rr() - 0.5) * 4 };
    else if (sp.district) { var ds = s.spots.find(function (q) { return q.name === sp.district; }); if (ds) spot = { x: ds.x + (rr() - 0.5) * 6, z: ds.z + (rr() - 0.5) * 6 }; }
    if (!spot) { var pl = s.plazas[0] || { x: s.center.x, z: s.center.z, r: 10 }; var a = rr() * Math.PI * 2; spot = { x: pl.x + Math.cos(a) * pl.r * (0.5 + rr() * 0.5), z: pl.z + Math.sin(a) * pl.r * (0.5 + rr() * 0.5) }; }
    var npc = { id: p.id + ":" + i, name: sp.name, title: sp.title, desc: sp.desc || "", named: !!sp.named, trainer: sp.trainer, role: sp.role || sp.title, home: p.id, h: h, x: spot.x, z: spot.z, y: 0, yaw: spot.rot != null ? spot.rot : rr() * 6.28, wander: !!sp.wander, goal: null, wait: rr() * 5, speed: 0, district: sp.district || "", label: null, guard: guard, s: s };
    h.root.position.set(npc.x, self.terrain.groundAt(npc.x, npc.z), npc.z); self.scene.add(h.root); self.npcs.push(npc);
    if (npc.named) { var lab = textSprite(npc.name, { size: 30, scale: 0.0068, color: "#f4e6c2" }); lab.position.y = h.height + 0.42; h.root.add(lab); npc.label = lab; var tl = textSprite(npc.title.length > 34 ? npc.title.slice(0, 33) + "…" : npc.title, { size: 24, scale: 0.0058, color: "#c9c2b0" }); tl.position.y = h.height + 0.2; h.root.add(tl); npc.label2 = tl; }
  });
};
function titleFrom(name, desc) { var first = String(desc || "").split(/[.,]/)[0]; if (/clerk/i.test(name)) return "Guild Registry Clerk"; if (/administrator/i.test(name)) return "Quest Administrator"; if (/examiner/i.test(name)) return "Promotion Examiner"; if (/mayor/i.test(name)) return "Lord Mayor"; if (/commander/i.test(name)) return "Watch Captain-Commander"; if (/sister/i.test(name)) return "Temple of the Dawn"; return first.slice(0, 40); }

Game.prototype.updateNPCs = function (dt) {
  var px = this.pos.x, pz = this.pos.z; var self = this;
  this.npcs.forEach(function (n) {
    var d = Math.hypot(n.x - px, n.z - pz); var vis = d < (self.q.charRange || 160); n.h.root.visible = vis; if (!vis) return;
    if (n.label) { n.label.visible = d < 28; n.label2.visible = d < 18; }
    var speed = 0;
    if (self.talking === n) { n.yaw = lerpAngle(n.yaw, Math.atan2(px - n.x, pz - n.z), dt * 6); if (!n.h.action) playAction(n.h, "talk"); }
    else if (n.wander) {
      if (!n.goal) { n.wait -= dt; if (n.wait < 0) { var s = n.s; var cand = s.spots.concat(s.plazas.map(function (pl) { return { x: pl.x + (Math.random() - 0.5) * pl.r, z: pl.z + (Math.random() - 0.5) * pl.r }; })); var g = cand[Math.floor(Math.random() * cand.length)]; if (g) n.goal = { x: g.x + (Math.random() - 0.5) * 6, z: g.z + (Math.random() - 0.5) * 6 }; } }
      else { var gx = n.goal.x - n.x, gz = n.goal.z - n.z, gd = Math.hypot(gx, gz); if (gd < 1.2) { n.goal = null; n.wait = 3 + Math.random() * 8; } else { speed = 1.6; var dirx = gx / gd, dirz = gz / gd; var nx = n.x + dirx * speed * dt, nz = n.z + dirz * speed * dt; var pushed = self.collide(nx, nz, 0.4, n.s); if (Math.hypot(pushed.x - nx, pushed.z - nz) > 0.01) { n.stuck = (n.stuck || 0) + dt; if (n.stuck > 1.5) { n.goal = null; n.stuck = 0; n.wait = 1; } } n.x = pushed.x; n.z = pushed.z; n.yaw = lerpAngle(n.yaw, Math.atan2(dirx, dirz), dt * 5); } }
    } else if (d < 6 && !n.guard) n.yaw = lerpAngle(n.yaw, Math.atan2(px - n.x, pz - n.z), dt * 2);
    n.y = self.terrain.groundAt(n.x, n.z); n.h.root.position.set(n.x, n.y, n.z); n.h.root.rotation.y = n.yaw;
    var adt2 = self.charLod(n.h.root, n.x, n.y, n.z, d, dt, n); if (adt2 > 0) animateHumanoid(n.h, adt2, { speed: speed / 1.6 * 0.55, crossArms: n.guard || /Captain|Commander/.test(n.title) });
  });
};
// Character level of detail. Townsfolk and roaming creatures outside the view frustum or beyond the quality's range are
// hidden and not animated; distant ones animate every 2nd or 4th frame with the time they skipped (so clips stay in step),
// and only characters near the camera cast shadows. Combatants never go through here: their clips drive hit events.
Game.prototype.charLod = function (root, x, y, z, d, dt, st) {
  var THREE = T(); if (!this._sph) { this._sph = new THREE.Sphere(); this._fr = new THREE.Frustum(); this._pm = new THREE.Matrix4(); }
  var vis = d < (this.q.charRange || 160) && (!this._frOk || this._fr.intersectsSphere(this._sph.set(this._sph.center.set(x, y + 1, z), 1.8)));
  root.visible = vis; if (!vis) { st._acc = 0; return 0; }
  var sh = d < (this.q.shadowChars || 30); if (st._sh !== sh) { st._sh = sh; root.traverse(function (o) { if (o.isMesh && !o.userData.noShadow) o.castShadow = sh; }); }
  var every = d < 22 ? 1 : d < 45 ? 2 : 4; st._acc = (st._acc || 0) + dt; st._n = ((st._n || 0) + 1) % every; if (st._n) return 0;
  var a = Math.min(st._acc, 0.3); st._acc = 0; return a;
};
// Frame pacing and resolution: a frame-rate cap (steadier on phones than an uneven 40-60 fps), a render scale that drops
// when frames run long and climbs back when there is headroom, and shadow maps re-rendered every Nth frame on lighter tiers.
Game.prototype.pace = function (raw) {
  var q = this.q, r = this.renderer; if (!r) return;
  var target = 1 / (q.fpsCap || 60); this.ft = this.ft == null ? raw : this.ft + (Math.min(raw, 0.25) - this.ft) * 0.05;
  this.scaleT = (this.scaleT || 0) + raw; if (this.scaleT < 1.5 || window.__fixedRes) return; this.scaleT = 0;
  var maxS = Math.min(window.devicePixelRatio || 1, q.pixelRatio), minS = q.minScale || 0.6, cur = this.renderScale || maxS, next = cur;
  if (this.ft > target * 1.25) next = Math.max(minS, cur - 0.1); else if (this.ft < target * 0.8) next = Math.min(maxS, cur + 0.05);
  if (Math.abs(next - cur) > 0.001) { this.renderScale = next; r.setPixelRatio(next); r.setSize(this.container.clientWidth, this.container.clientHeight); }
  else this.renderScale = cur;
};
function lerpAngle(a, b, t) { var d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * Math.min(1, t); }

// ------------------------------------------------------------------ monsters: canonical populations, not encounters
var HABITAT = { shark: "sea", serpent: "sea", kraken: "sea", reef: "sea", siren: "sea", drowned: "sea", gull: "sea" };
var BIOME_DENSITY = { forest: 0.1, darkforest: 0.24, deepforest: 0.12, plains: 0.045, desert: 0.07, glass: 0.1, ash: 0.2, taiga: 0.1, tundra: 0.06, marsh: 0.14, rock: 0.09, waste: 0.14, highland: 0.08, coast: 0.07, steppe: 0.08, snow: 0.05, oasis: 0.03 };
var APEX_SITES = ["the-undervein", "the-frozen-gullet", "tomb-of-nine-kings", "the-glass-waste", "thornhollow", "vault-of-ashes", "necrospire", "the-drowned-fleet", "the-silent-march"];
Game.prototype.spawnMonsters = function () {
  var CELL = 60, pcx = Math.floor(this.pos.x / CELL), pcz = Math.floor(this.pos.z / CELL), day = Math.floor(this.clock / 1440), block = Math.floor(day / 3);
  var self = this; var made = 0;
  for (var dx = -5; dx <= 5; dx++) for (var dz = -5; dz <= 5; dz++) {
    if (made > 1) return; var cx = pcx + dx, cz = pcz + dz, key = cx + ":" + cz; if (this.spawnedCells[key]) continue; this.spawnedCells[key] = 1;
    if (Math.hypot(dx, dz) < 1.5) continue; // never pop in right beside the player
    var wx = (cx + 0.5) * CELL, wz = (cz + 0.5) * CELL, xm = wx / MILE, ym = -wz / MILE;
    if (landSD(xm, ym) < 0.2) continue; var np = nearestPlace(xm, ym, function (p) { return !/ruin|dungeon|landmark|shrine|tower/.test(p.kind); }); if (np && np.dist < np.place.r + 1.3) continue;
    var b = biomeAt(xm, ym); var dens = BIOME_DENSITY[b] || 0.06; var rd = roadAt(xm, ym); var realm = realmAt(xm, ym);
    if (rd && rd.d < 0.35) { if (!(realm === "The Marches" || /Ash Track|Gold Road/.test(rd.road.name) && hash2(cx, cz, 404) < 0.35)) continue; }
    if (hash2(cx, cz, block * 7 + 1) > dens) continue;
    if (this.slain[key] != null && day - this.slain[key] < 3) continue;
    var maxT = !np ? 4 : np.dist < 6 ? 1 : np.dist < 15 ? 2 : np.dist < 35 ? 3 : 4;
    var site = nearestPlace(xm, ym, function (p) { return /ruin|dungeon|landmark|shrine/.test(p.kind) || APEX_SITES.indexOf(p.id) >= 0; }); var nearSite = site && site.dist < 6 ? site.place : null;
    if (nearSite && APEX_SITES.indexOf(nearSite.id) >= 0) maxT = 5;
    var pool = (R.BESTIARY_BY_REGION[R.REALM_TO_BESTIARY[realm] || "Aurelia"] || []).filter(function (m) { var n = m.name.toLowerCase(); var sea = Object.keys(HABITAT).some(function (k) { return n.indexOf(k) >= 0; }); if (sea && landSD(xm, ym) > 4) return false; return m.threat <= maxT && m.threat <= (nearSite ? 5 : 4) && !/elder dragon|primordial|deep king|ashen widow/.test(n); });
    if (nearSite) { var sn = nearSite.name.toLowerCase(); var theme = /barrow|tomb|chapel|crypt|fleet|vault|spire/.test(sn) ? /skeleton|wight|draugr|ghoul|revenant|drowned|knight|ghast|lich|bone/ : /warren/.test(sn) ? /goblin/ : /mine|undervein|gullet/.test(sn) ? /stalker|crawler|worm|ghast|troll/ : null; if (theme) { var th = pool.filter(function (m) { return theme.test(m.name.toLowerCase()); }); if (th.length) pool = th; } }
    if (!pool.length) continue;
    var tot = 0; pool.forEach(function (m) { tot += 1 / Math.pow(m.threat, 1.6); }); var pick = hash2(cx, cz, 909) * tot, mon = pool[0]; for (var i = 0; i < pool.length; i++) { pick -= 1 / Math.pow(pool[i].threat, 1.6); if (pick <= 0) { mon = pool[i]; break; } }
    var pack = /wolf|jackal|hound|goblin|ghoul|gull|bandit|skeleton|sprite/.test(mon.name.toLowerCase()) ? 2 + Math.floor(hash2(cx, cz, 5) * 3) : 1;
    for (var k = 0; k < pack; k++) this.addMonster(mon, wx + (hash2(cx, cz, 20 + k) - 0.5) * 30, wz + (hash2(cx, cz, 40 + k) - 0.5) * 30, key);
    made++;
  }
};
Game.prototype.addMonster = function (mon, x, z, cell) {
  var c = makeCreature(mon); var y = this.terrain.groundAt(x, z); c.root.position.set(x, y, z); this.scene.add(c.root);
  var tac = String(mon.tactics || "").toLowerCase(); var passive = /not predatory|avoids combat|may not be hostile|defensive unless|negotiable/.test(tac + " " + String(mon.weakness || "").toLowerCase());
  var ranged = (mon.attacks || []).find(function (a) { return /bow|javelin|hurl|spit|breath|bolt|volley|boulder|dart|spells/.test(a.name); });
  var m = { kind: "monster", st: [], fly: c.arch === "winged", air: 0, airT: c.arch === "winged" ? 0.4 : 0, mon: mon, c: c, hp: mon.hp, maxHp: mon.hp, x: x, z: z, y: y, yaw: Math.random() * 6.28, home: { x: x, z: z }, cell: cell, state: "idle", t: Math.random() * 4, atkCD: 1 + Math.random(), passive: passive, flees: /flee|retreat/.test(tac), ranged: ranged, aggro: false, dead: false, speed: c.arch === "canine" ? 9.5 : c.arch === "brute" ? 5.2 : c.arch === "wisp" ? 6 : 7, reach: 1.6 + c.size * 0.55, id: Math.random().toString(36).slice(2) };
  this.monsters.push(m); return m;
};
Game.prototype.updateMonsters = function (dt) {
  var self = this, px = this.pos.x, pz = this.pos.z, adt = this.adt || dt;
  this.monsters = this.monsters.filter(function (m) {
    var d = Math.hypot(m.x - px, m.z - pz);
    if (d > 420 && !m.aggro && !m.inBattle) { self.scene.remove(m.c.root); delete self.spawnedCells[m.cell]; if (self.target === m) self.target = null; return false; }
    if (m.dead) { m.deadT = (m.deadT || 0) + dt; m.c.root.visible = true; animateCreature(m.c, adt, { dead: true }); if (m.deadT > 240 || (d > 300)) { self.scene.remove(m.c.root); return false; } return true; }
    // in a turn-based fight the battle scripts move this creature; here it is only posed
    if (m.inBattle) {
      m.c.root.visible = true; m.air += ((m.airT || 0) - m.air) * Math.min(1, dt * 3.5); m.y = self.terrain.groundAt(m.x, m.z) + (m.c.arch === "wisp" ? 0.2 : 0) + (m.fly ? m.air * 3.2 : 0); m.c.root.position.set(m.x, m.y, m.z); m.c.root.rotation.y = lerpAngle(m.c.root.rotation.y, m.yaw, dt * 14);
      if (m.hitT > 0) m.hitT -= dt; if (m.attackT > 0) m.attackT -= adt;
      animateCreature(m.c, adt, { speed: (m.gait || 0) / 6, attack: m.attackT > 0, attackT: (m.attackDur || 0.6) - (m.attackT || 0), attackDur: m.attackDur || 0.6, hitT: m.hitT || 0, combat: true, flying: m.fly && m.air > 0.35 });
      return true;
    }
    var speed = 0;
    var ag = !m.passive && !m.fled && !(m.calmUntil > self.time) && d < 13 + m.mon.threat * 3 && !self.down && !self.talking;
    if (ag) { self.onAggro(m); if (m.inBattle) return true; }
    if (m.state === "return") { var hx = m.home.x - m.x, hz = m.home.z - m.z, hd = Math.hypot(hx, hz); if (hd < 3) { m.state = "idle"; m.fled = false; } else { speed = m.speed * (m.fled ? 1 : 0.6); m.yaw = lerpAngle(m.yaw, Math.atan2(hx, hz), dt * 4); if (m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + dt * 2); } }
    else { m.t -= dt; if (m.t < 0) { m.t = 3 + Math.random() * 6; m.wanderYaw = Math.random() * 6.28; m.wandering = Math.random() < 0.5; } if (m.wandering) { speed = m.speed * 0.25; m.yaw = lerpAngle(m.yaw, m.wanderYaw, dt * 2); if (Math.hypot(m.x - m.home.x, m.z - m.home.z) > 40) m.wanderYaw = Math.atan2(m.home.x - m.x, m.home.z - m.z); } }
    if (speed) { var nx = m.x + Math.sin(m.yaw) * speed * dt, nz = m.z + Math.cos(m.yaw) * speed * dt; if (landSD(nx / MILE, -nz / MILE) > 0.02 && !insideTown(nx, nz)) { m.x = nx; m.z = nz; } else m.state = "return"; }
    m.air += ((m.fly ? 0.4 : 0) - m.air) * Math.min(1, dt * 2); m.y = self.terrain.groundAt(m.x, m.z) + (m.c.arch === "wisp" ? 0.2 : 0) + (m.fly ? m.air * 3.2 : 0); m.c.root.position.set(m.x, m.y, m.z); m.c.root.rotation.y = m.yaw;
    if (m.hitT > 0) m.hitT -= dt;
    var adt2 = self.charLod(m.c.root, m.x, m.y, m.z, d, adt, m); if (adt2 > 0) animateCreature(m.c, adt2, { speed: speed / 6, combat: false, flying: m.fly && speed > 0 });
    return true;
  });
  function insideTown(x, z) { var p = insidePlace(x / MILE, -z / MILE); return p && !/ruin|dungeon|landmark|shrine|tower|camp/.test(p.kind); }
};
Game.prototype.onAggro = function (m) { C.engage(this, m); };
Game.prototype.beginEncounter = function (m) {
  if (this.inCombat) return; this.inCombat = true; this.combatSummary = { foes: {}, killed: {}, fled: {}, dmgTaken: 0, dmgDealt: 0, xp: 0, rounds: 0, start: describe(this.pos.x / MILE, -this.pos.z / MILE).location, rolls: [] }; this.encounterUsed = {};
  var kit = R.CALLING_KIT[this.calling()]; this.res = kit && kit.start ? kit.start : 0;
  this.bridge.combatMusic && this.bridge.combatMusic(true, m && m.mon.threat >= 4); this.bridge.sfx && m && this.bridge.sfx(/wolf|hound|jackal/i.test(m.mon.name) ? "sfx-wolf-growl" : "sfx-monster-growl");
};
Game.prototype.noteFoe = function (m) { if (this.combatSummary) this.combatSummary.foes[m.mon.name] = (this.combatSummary.foes[m.mon.name] || 0) + 1; };
Game.prototype.combatNote = function (kind, m) { if (!this.combatSummary) return; var o = this.combatSummary[kind]; o[m.mon.name] = (o[m.mon.name] || 0) + 1; };
Game.prototype.closeCombat = function (force) {
  if (!this.inCombat) return; if (this.battle && !force) return; var cs = this.combatSummary; this.inCombat = false; this.bridge.combatMusic && this.bridge.combatMusic(false);
  if (!cs) return; function list(o) { return Object.keys(o).map(function (k) { return o[k] + "× " + k; }).join(", "); }
  var line = "Fought " + list(cs.foes) + " near " + cs.start + (cs.rounds ? " (" + cs.rounds + " round" + (cs.rounds > 1 ? "s" : "") + ", about " + cs.rounds * C.ROUND_SEC + " seconds)" : "") + "." + (Object.keys(cs.killed).length ? " Killed " + list(cs.killed) + "." : "") + (Object.keys(cs.fled).length ? " Fled: " + list(cs.fled) + "." : "") + " Took " + cs.dmgTaken + " damage (now " + Math.round(this.stats.hp) + "/" + this.stats.maxHp + " HP)." + (cs.xp ? " +" + cs.xp + " XP awarded." : "") + (cs.rolls.length ? " Key rolls: " + cs.rolls.slice(-3).join(" ") : "");
  this.log(line); this.combatSummary = null; this.writeStats();
};
// ------------------------------------------------------------------ combat
Game.prototype.calling = function () { return this.v["starting-calling"] || this.v["player-class"] || "Fighter"; };
Game.prototype.conditionPenalty = function () { var c = Array.isArray(this.v.conditions) ? this.v.conditions : []; var p = 0; c.forEach(function (x) { var n = String(typeof x === "string" ? x : x && x.name).toLowerCase(); if (/exhausted/.test(n)) p -= 5; else if (/fatigued/.test(n)) p -= 2; }); return p; };
Game.prototype.pickTarget = function () {
  var self = this, best = null, bd = 1e9; this.monsters.forEach(function (m) { if (m.dead) return; var d = Math.hypot(m.x - self.pos.x, m.z - self.pos.z); var ang = Math.abs(lerpAngle(0, Math.atan2(m.x - self.pos.x, m.z - self.pos.z) - self.yaw, 1)); var score = d + ang * 6; if (d < 40 && score < bd) { bd = score; best = m; } });
  return best;
};
Game.prototype.cycleTarget = function () { var self = this; var list = this.monsters.filter(function (m) { return !m.dead && Math.hypot(m.x - self.pos.x, m.z - self.pos.z) < 45; }).sort(function (a, b) { return Math.hypot(a.x - self.pos.x, a.z - self.pos.z) - Math.hypot(b.x - self.pos.x, b.z - self.pos.z); }); if (!list.length) { this.target = null; return; } var i = list.indexOf(this.target); this.target = list[(i + 1) % list.length]; };
Game.prototype.useSlot = function (slot) {
  if (this.down) { this.toast("You cannot act — you are down.", "error"); return; }
  var s = this.hotbar()[slot]; if (!s) return;
  if (s.kind === "endturn") { C.endTurn(this); return; }
  if (s.disabled) { if (s.why) this.toast(s.why, "info"); return; }
  if (!this.battle && this.cooldowns[s.id] > this.time) return;
  if (s.kind === "attack") this.attack(); else if (s.kind === "spell") this.castSpell(s.spell); else if (s.kind === "tech") this.technique(s.tech); else if (s.kind === "item") this.useItem(s.item); else if (s.kind === "dodge") this.dodge(); else if (s.kind === "dash") C.dash(this); else if (s.kind === "interact") this.doInteract();
};
Game.prototype.faceTarget = function (m) { this.yaw = Math.atan2(m.x - this.pos.x, m.z - this.pos.z); };
Game.prototype.attack = function (opts) {
  opts = opts || {}; var w = R.weaponProfile(this.v); var m = this.target && !this.target.dead ? this.target : this.pickTarget();
  if (!m) { if (this.battle) this.toast("No target — tap or click an enemy.", "info"); else playAction(this.player, w.ranged ? "bow" : attackClip(w.kind)); return false; }
  this.target = m; return C.attack(this, m, opts);
};
Game.prototype.situational = function (m) { return (this.quarry === m ? 1 : 0) + (this.read === m.mon.name ? 1 : 0) + (this.nextBonus || 0); };
Game.prototype.rollAttack = function (m, opts, att) {
  opts = opts || {}; att = att || this.pe; var b = this.battle; var player = att.kind === "player"; var sheet = B.sheetOf(this, att); var w = R.weaponProfile(sheet);
  var bonus = (opts.bonus || 0) + B.stSum(att, "atk") + B.stSum(m, "evMinus") + (B.airborne(m) && !w.ranged ? -3 : 0); var nb = B.getSt(att, "blessing"); if (nb) { bonus += 1; B.dropSt(att, "blessing"); }
  var extra = opts.extra || 0; var smite = B.getSt(att, "smite");
  if (player) { bonus += this.situational(m); this.nextBonus = 0; if (this.quarry === m) this.quarry = null; if (this.calling() === "Rogue" && b && !b.sneak) { var behind = Math.abs(lerpAngle(0, Math.atan2(this.pos.x - m.x, this.pos.z - m.z) - m.yaw, 1)) > 1.9; if (b.round === 1 || behind) { extra += R.d(6); b.sneak = 1; } } }
  var res = R.playerAttack(sheet, m.mon, { bonus: bonus, bonusLabel: "situational", extraDamage: extra, condPenalty: player ? this.conditionPenalty() : 0, evBonus: B.stSum(m, "ev") });
  if (res.hit && smite) { var sm = R.rollDice(smite.smite[0], smite.smite[1]).total; res.damage += sm; res.line = res.line.replace(/\)$/, " + " + sm + " radiant Smite)"); B.dropSt(att, "smite"); res.smitten = true; }
  return res;
};
Game.prototype.applyAttack = function (m, res, skill, opts, att) {
  att = att || this.pe; var kit = R.CALLING_KIT[att.kind === "player" ? this.calling() : String((att.sheet && (att.sheet.class || att.sheet.calling)) || "")] || {}; if (opts && opts.radiant && res.hit) res.line = res.line.replace(" damage", " radiant damage");
  this.resolveHit(m, res, skill, res.smitten || (opts && opts.radiant) ? "radiant" : null, att); if (res.hit && kit.build === "hit" && att.kind === "player") this.res = Math.min(kit.max, this.res + 1);
};
Game.prototype.chestOf = function (m) { return m ? { x: m.x, y: m.y + (m.c.height || 1.6) * 0.62, z: m.z } : { x: this.pos.x, y: this.pos.y + 1.25, z: this.pos.z }; };
Game.prototype.resolveHit = function (m, res, skill, element, src) {
  src = src || this.pe; this.pushLog(res.line, res.hit ? "hit" : "miss"); if (this.combatSummary && res.crit) this.combatSummary.rolls.push(res.line);
  var p = this.chestOf(m); var h = m.c.parts.h; var bloodless = /skeleton|bone|wisp|sprite|golem|colossus|construct|avatar|walker/i.test(m.mon.name) || m.c.arch === "wisp";
  var dmg = res.hit ? res.damage : (res.half || 0);
  if (!res.hit && !(dmg > 0)) { this.floater(m, "Miss", "#c8c8c8"); if (h && !h.action) playAction(h, Math.random() < 0.5 ? "dodge" : "block"); this.fx.dust(m.x, m.y + 0.2, m.z, null, 6); return; }
  var out = B.dealDamage(this, src, m, dmg, { el: element || res.element, magic: !!element, skill: skill });
  m.hitT = 0.3; this.floater(m, (res.crit ? "Critical! " : "") + out.dealt + (res.hit ? "" : " (half)"), res.crit ? "#ffd04a" : "#ffffff"); if (this.combatSummary && src.kind !== "ally") this.combatSummary.dmgDealt += out.dealt;
  if (element) this.fx.burst(p.x, p.y, p.z, SC.elementColor(element), res.crit); else { this.fx.sparks(p.x, p.y, p.z, null, res.crit); if (!bloodless) this.fx.blood(p.x, p.y, p.z); }
  this.fx.kick(res.crit ? 0.32 : 0.08); if (res.crit) this.hitStop = 0.12; else this.hitStop = 0.045;
  if (h && m.hp > 0) playAction(h, "hit");
  if (src.kind === "player") this.skillProgress(skill, 1);
};
function elementColor(e) { e = String(e || ""); return /fire|ember|flame/.test(e) ? "#ff8a3a" : /cold|frost|ice/.test(e) ? "#9fe0ff" : /lightning|storm/.test(e) ? "#d8e8ff" : /necrotic|umbral|shadow/.test(e) ? "#a06ad0" : /radiant|holy/.test(e) ? "#fff0a0" : /poison|acid/.test(e) ? "#9ae05a" : "#7ab8ff"; }
Game.prototype.kill = function (m, skill, src) {
  m.dead = true; m.hp = 0; m.aggro = false; if (this.target === m) this.target = null; m.st = [];
  if (m.summoned) { this.pushLog(m.mon.name + " dissipates.", "info"); this.fx.burst(m.x, m.y + 1, m.z, "#c8a0ff", false); return; }
  if (B.sideOf(m) === "party") { this.pushLog(m.mon.name + " falls, its bonds undone.", "info"); return; }
  var xp = R.KILL_XP[m.mon.threat] || 10; var v = this.v; this.write("player-xp", Math.max(0, Number(this.cur("player-xp")) || 0) + xp);
  if (this.combatSummary) { this.combatSummary.xp += xp; this.combatNote("killed", m); if (src && src.kind === "ally") this.combatSummary.allyKills = (this.combatSummary.allyKills || 0) + 1; }
  if (skill) this.skillProgress(skill, 3 + m.mon.threat * 3);
  this.slain[m.cell] = Math.floor(this.clock / 1440); this.dirtyFog = true;
  this.floater(m, "+" + xp + " XP", "#9fe07a"); this.pushLog(m.mon.name + " falls" + (src && src.kind === "ally" ? " to " + src.name : "") + ". +" + xp + " XP.", "kill");
  // codex: first proper identification
  var codex = Object.assign({ lore: [], titles: [], recipes: [], bestiary: [] }, this.cur("codex") || {}); var best = Array.isArray(codex.bestiary) ? codex.bestiary.slice() : [];
  var ix = best.findIndex(function (b) { return (b && (b.name || b)) === m.mon.name; });
  if (ix < 0) { best.push({ name: m.mon.name, region: m.mon.region, threat: m.mon.threat, killed: 1, firstEncountered: formatDate(Math.floor(this.clock / 1440)), observed: String(m.mon.tactics || "") }); this.log("First kill and codex entry: " + m.mon.name + "."); }
  else if (typeof best[ix] === "object") { best[ix] = Object.assign({}, best[ix], { killed: (Number(best[ix].killed) || 0) + 1 }); }
  codex.bestiary = best; this.write("codex", codex);
  this.flushSoon();
};
Game.prototype.skillProgress = function (id, amount) {
  if (!id) return; var skills = Object.assign({}, this.cur("skills") || {}); var s = Object.assign({ name: id.split("-").map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(" "), category: "Combat", level: 1, prog: 0, origin: "practice", teacher: null }, skills[id] || {});
  s.prog = (Number(s.prog) || 0) + amount; skills[id] = s; this.write("skills", skills);
};
Game.prototype.fall = function (m) {
  this.stats.hp = 0; this.down = true; if (this.battle) C.finish(this, "fell"); else if (this.inCombat) this.closeCombat(true);
  var t0 = this.time; this.monsters.forEach(function (x) { x.aggro = false; x.state = "return"; x.calmUntil = t0 + 180; });
  var d = describe(this.pos.x / MILE, -this.pos.z / MILE);
  this.bridge.sfx && this.bridge.sfx("sfx-defeat-medieval");
  this.log("I was struck down to 0 HP by " + (m && m.mon ? m.mon.name + " (" + m.mon.region + " bestiary, Threat " + m.mon.threat + ")" : "the fight") + " in " + d.location + ". The monsters broke off. Resolve consciousness, death or rescue strictly by the Combat rules — no plot armor.");
  this.writeStats(); this.flush(); this.bridge.onFall && this.bridge.onFall(m && m.mon ? m.mon.name : "the fight");
};
Game.prototype.onEntityHit = function (att, tgt, res, dealt, info) {
  var p = this.chestOf(tgt); var player = tgt.kind === "player"; var kit = player ? (R.CALLING_KIT[this.calling()] || {}) : {};
  if (res.hit && res.damage > 0 && dealt) {
    this.floatAt(tgt, "-" + dealt.dealt, "#ff6a5a"); if (tgt.mon) { tgt.hitT = 0.3; var th = tgt.c.parts.h; if (th && tgt.hp > 0) playAction(th, "hit"); } else { var h = tgt.c.parts.h; if (h && tgt.hp > 0) playAction(h, "hit"); }
    this.fx.blood(p.x, p.y, p.z); this.fx.sparks(p.x, p.y, p.z, "#ffd0b0"); this.fx.kick((player ? 0.12 : 0.05) + Math.min(0.3, dealt.dealt / Math.max(1, tgt.maxHp))); if (player) { this.hurtFlash = 0.4; this.hitStop = 0.05; if (this.combatSummary) this.combatSummary.dmgTaken += dealt.dealt; if (kit.build === "hurt") this.res = Math.min(kit.max, this.res + 1); if (dealt.dealt >= this.stats.maxHp * 0.25) this.log("Took a heavy blow (" + dealt.dealt + " damage, ≥25% Max HP) from " + (att.mon ? att.mon.name + "'s " + info.atk.name : "an attacker") + " — injury check owed per Combat Numerics."); this.writeStats(); }
    else if (tgt.kind === "ally" && dealt.dealt >= tgt.maxHp * 0.25) this.log(tgt.name + " took a heavy blow (" + dealt.dealt + " damage, ≥25% Max HP) from " + att.mon.name + " — injury check owed.");
  } else if (!(res.hit && res.damage > 0)) {
    var dodged = !res.hit; if (player && tgt.dodging) { var h2 = this.player; playAction(h2, "dodge"); this.skillProgress("acrobatics", 1); } else if (dodged && !tgt.mon) { var h3 = tgt.c.parts.h; if (h3 && !h3.action) playAction(h3, "dodge"); }
    if (player && kit.build === "dodge") this.res = Math.min(kit.max, this.res + 1);
    this.floatAt(tgt, info.blocked ? "Blocked" : tgt.dodging ? "Dodged" : "Miss", "#9fd0ff");
  }
};
Game.prototype.castSpell = function (sp) { SC.begin(this, sp); };
Game.prototype.cancelTarget = function () { SC.cancel(this); };
Game.prototype.confirmTarget = function () { SC.confirm(this); };
Game.prototype.knowsSpell = function (e, id) { return SC.knows(this, e, id); };
// spells with no use in a fight, cast in the world (the light, a ward on a door, a scrying…)
Game.prototype.useUtilSpell = function (sp) {
  if (this.battle) { this.toast(S.whyNot(sp) || (sp.name + " cannot be cast in a fight."), "info"); return; }
  var cost = SC.manaCost(this, this.pe, sp); if (this.stats.mp < cost) { this.toast("Not enough Mana for " + sp.name + " (" + cost + " MP).", "error"); return; }
  var self = this; this.stats.mp -= cost; this.cooldowns["spell:" + sp.id] = this.time + 2.2; this.bridge.sfx && this.bridge.sfx("sfx-magic-cast-" + (1 + Math.floor(Math.random() * 3)));
  this.writeStats(); this.skillProgress(R.slug(sp.school) + "-magic", 1); var col = SC.elementColor(sp.element || "");
  C.act(this, "castUp", null, function () {
    var hp = self.handPos(); self.fx.burst(hp.x, hp.y, hp.z, col, false); var id = sp.id;
    if (/light/.test(id)) { self.lightOrb(); self.pushLog("(" + sp.name + " — a floating light follows you for an hour)", "info"); self.log("Cast " + sp.name + "."); }
    else { self.pushLog("(" + sp.name + " — " + (sp.desc || "cast") + ")", "info"); self.log("Cast " + sp.name + " (" + (sp.desc || "utility") + "; narrate any lasting effect)."); }
  });
};
Game.prototype.handPos = function () { var T3 = T(); var v = new T3.Vector3(); try { this.player.root.updateMatrixWorld(true); this.player.RA.hand.getWorldPosition(v); } catch (e) { v.set(this.pos.x, this.pos.y + 1.3, this.pos.z); } return v; };
var TECH_COST = { "second-wind": "bonus", "cutting-verse": "bonus", "devotion-mend": "bonus", "cunning-motion": "bonus", "quarry": "bonus", "monster-read": "bonus", "overchannel": null, "exploit": null, "attunement": null, "field-temper": "bonus", "living-path": null };
var TECH_STRIKE = { "tempo-finisher": function () { return { extra: R.d(8) }; }, "brutal-swing": function () { return { extra: R.d(10) }; }, "smite": function () { return { extra: R.d(8), radiant: true }; }, "flurry": function () { return { twice: true }; } };
Game.prototype.techCost = function (t) { return TECH_STRIKE[t.id] ? "action" : TECH_COST[t.id] === undefined ? "action" : TECH_COST[t.id]; };
Game.prototype.technique = function (t) {
  var kit = R.CALLING_KIT[this.calling()] || {}; var self = this;
  if (t.sp && this.stats.sp < t.sp) { this.toast("Not enough Stamina.", "error"); return; }
  if (t.cost && this.res < t.cost) { this.toast("Requires " + t.cost + " " + kit.res + ".", "info"); return; }
  if (t.once && this.encounterUsed[t.id]) { this.toast(t.name + " is spent for this encounter.", "info"); return; }
  var pay = function () { if (t.sp) self.stats.sp -= t.sp; if (t.cost) self.res -= t.cost; if (t.once) self.encounterUsed[t.id] = 1; if (!self.battle) self.cooldowns["tech:" + t.id] = self.time + 1.5; self.writeStats(); };
  if (TECH_STRIKE[t.id]) {
    var m = this.target && !this.target.dead ? this.target : this.pickTarget(); if (!m) { this.toast("No target.", "info"); return; } this.target = m;
    if (!this.battle) { C.engage(this, m, { playerFirst: true, pending: function () { self.technique(t); } }); return; }
    if (C.attack(this, m, Object.assign({ cost: "action" }, TECH_STRIKE[t.id]()))) { pay(); this.pushLog("(" + t.name + ")", "info"); }
    return;
  }
  var cost = this.techCost(t); if (this.battle && !C.canAct(this, cost)) return;
  var clip = /mend|second|attune/.test(t.id) ? "castUp" : /read|quarry|living/.test(t.id) ? "talk" : "cheer";
  pay();
  C.act(this, clip, cost, function () {
    switch (t.id) {
      case "second-wind": var amt = Math.max(2, Math.floor(self.stats.maxHp * 0.1)); self.stats.hp = Math.min(self.stats.maxHp, self.stats.hp + amt); self.floater(null, "+" + amt, "#7ae07a"); self.fx.motes(self.pos.x, self.pos.y + 0.3, self.pos.z, "#ffe08a"); self.pushLog("(Second Wind — 4 SP, recover " + amt + " HP)", "heal"); break;
      case "cutting-verse": self.nextBonus = 2; self.pushLog("(Carry the Verse — +2 to your next attack)", "info"); break;
      case "devotion-mend": var h = R.d(8) + Math.max(0, R.attrMod((self.v.attributes || {}).willpower)); self.stats.hp = Math.min(self.stats.maxHp, self.stats.hp + h); self.floater(null, "+" + h, "#7ae07a"); self.fx.motes(self.pos.x, self.pos.y + 0.3, self.pos.z, "#fff0a0"); self.pushLog("(Devotion: Mend — heals " + h + ")", "heal"); break;
      case "cunning-motion": if (self.battle) { self.disengaged = true; self.battle.econ.move += 4.5; self.pushLog("(Cunning Motion — disengage, +4.5 m movement, no opportunity attacks this turn)", "info"); } else self.dodge(true); break;
      case "quarry": var q = self.target || self.pickTarget(); if (q) { self.quarry = q; self.pushLog("(Quarry marked: " + q.mon.name + " — +1 to your first attack)", "info"); } break;
      case "overchannel": self.overchannel = true; self.pushLog("(Arcane Overchannel primed — next spell +50% Mana, one step stronger)", "info"); break;
      case "monster-read": var m2 = self.target || self.pickTarget(); if (m2) { var res = R.roll3d6(); var pm = R.attrMod((self.v.attributes || {}).perception) + R.skillBonus(R.skillLevel(self.v, "tracking")); var ok = res.total + pm >= 12 + m2.mon.threat; self.pushLog("(Monster Read — 3d6(" + res.dice.join(",") + ")=" + res.total + " +" + pm + " vs DR " + (12 + m2.mon.threat) + " — " + (ok ? "you spot it: " + (m2.mon.weakness || "no obvious weakness") : "nothing certain yet") + ")", ok ? "info" : "miss"); if (ok) { self.read = m2.mon.name; self.log("Monster Read on " + m2.mon.name + ": learned " + (m2.mon.weakness || "its patterns") + "."); } } break;
      default: self.pushLog("(" + t.name + " — " + t.desc + ")", "info"); self.log("Used " + t.name + " (narrate its effect).");
    }
    self.writeStats();
  });
};
Game.prototype.dodge = function (free) {
  if (this.battle) { C.dodgeAction(this); return; }
  if (!free) { if (this.stats.sp < 2) { this.toast("Too winded to dodge.", "info"); return; } this.stats.sp -= 2; }
  this.dodgeT = this.time + 0.5; this.cooldowns.dodge = this.time + 0.9; playAction(this.player, "dodge"); var mx = this.move.x, my = this.move.y; var a = (mx || my) ? this.camYaw + Math.PI - Math.atan2(mx, my) : this.yaw + Math.PI; this.dash = { vx: Math.sin(a) * 18, vz: Math.cos(a) * 18, t: 0.28 }; this.fx.dust(this.pos.x, this.pos.y + 0.1, this.pos.z); this.writeStats();
};
Game.prototype.useItem = function (ref) {
  var inv = (this.cur("inventory") || []).slice(); var ix = inv.findIndex(function (x) { return x && (x.id === ref.id); }); if (ix < 0) { this.toast("You no longer have that.", "info"); return; }
  var it = Object.assign({}, inv[ix]); var c = I.classify(it); var self = this;
  if (c.kind === "weapon") return this.equipWeapon(it);
  if (c.kind === "throw") return this.throwItem(it, c);
  var cost = "bonus"; if (this.battle && !C.canAct(this, cost)) return;
  var consume = function () { var nv = (self.cur("inventory") || []).slice(); var j = nv.findIndex(function (x) { return x && x.id === it.id; }); if (j < 0) return; var q = Object.assign({}, nv[j]); q.qty = (Number(q.qty) || 1) - 1; if (q.qty <= 0) nv.splice(j, 1); else nv[j] = q; self.write("inventory", nv); };
  consume(); if (!this.battle) this.cooldowns["item:" + it.id] = this.time + 2;
  C.act(this, c.kind === "food" ? "talk" : "drink", cost, function () {
    var msg = "", col = "#9cff9c", d = c.dice ? R.rollDice(c.dice[0], c.dice[1]).total + c.dice[2] : 0;
    if (c.kind === "mana") { var a = Math.min(d, self.stats.maxMp - self.stats.mp); self.stats.mp += a; msg = "+" + d + " MP"; col = "#8ab8ff"; }
    else if (c.kind === "stamina") { self.stats.sp = Math.min(self.stats.maxSp, self.stats.sp + d); msg = "+" + d + " SP"; col = "#ffd070"; }
    else if (c.kind === "food") { self.stats.sp = Math.min(self.stats.maxSp, self.stats.sp + 5); msg = "+5 SP"; col = "#ffd070"; }
    else if (c.kind === "heal") { var got = B.healEntity(self, self.pe, self.pe, d); msg = "+" + d + " HP"; self.writeStats(); }
    else if (c.kind === "cure") { msg = "cured"; }
    if (c.cures || c.kind === "cure") { var cond = (self.cur("conditions") || []).filter(function (x) { var n = String(typeof x === "string" ? x : x && x.name).toLowerCase(); return !((c.cures || /poison|venom|toxin/).test(n)); }); if (cond.length !== (self.cur("conditions") || []).length) { self.write("conditions", cond); msg += (msg ? ", " : "") + "condition removed"; } }
    self.writeStats(); self.floater(null, msg, col); self.fx.motes(self.pos.x, self.pos.y + 0.3, self.pos.z, col, 18); self.pushLog("(Used " + it.name + " — " + msg + ")", "heal"); self.log("Used 1× " + it.name + " (" + msg + ").");
  }, { after: 0.25 });
};
// drawing a different weapon: a Bonus Action; the avatar re-dresses when the equipment changes
Game.prototype.equipWeapon = function (it) {
  if (it.id === (this.cur("equipment") || {}).weapon) { this.toast(it.name + " is already in hand.", "info"); return; }
  if (this.battle && !C.canAct(this, "bonus")) return; var self = this; if (this.battle) C.spend(this, "bonus");
  var inv = (this.cur("inventory") || []).map(function (x) { return Object.assign({}, x); }); var eq = Object.assign({}, this.cur("equipment") || {});
  var prev = eq.weapon && inv.find(function (x) { return x.id === eq.weapon; }); if (prev) prev.equipped = false; eq.weapon = it.id; var me = inv.find(function (x) { return x.id === it.id; }); if (me) me.equipped = true;
  if (I.twoHanded(it) && eq.offhand) { var off = inv.find(function (x) { return x.id === eq.offhand; }); if (off) off.equipped = false; eq.offhand = null; }
  this.write("equipment", eq); this.write("inventory", inv); this.flushSoon(); playAction(this.player, "talk");
  this.pushLog("(Drew " + it.name + ")", "info"); this.log("Drew " + it.name + (this.battle ? " as a Bonus Action." : ".")); this.v = Object.assign({}, this.v, { equipment: eq, inventory: inv }); this.rebuildPlayer();
};
Game.prototype.rebuildPlayer = function () { var p0 = this.player.root.position.clone(), rot = this.player.root.rotation.y; this.buildPlayer(this.v); this.player.root.position.copy(p0); this.player.root.rotation.y = rot; };
// a thrown flask or bomb: the Action, 12 m, 3d6 + Agility vs Evasion, damage ignores armour
Game.prototype.throwItem = function (it, c) {
  var m = this.target && !this.target.dead ? this.target : this.pickTarget(); if (!m) { this.toast("Choose an enemy to throw at.", "info"); return; } this.target = m; var self = this;
  var d = Math.hypot(m.x - this.pos.x, m.z - this.pos.z) - C.radius(m); if (d > c.range + 0.1) { this.toast("Out of range (" + Math.round(d) + " m, throw reach " + c.range + " m).", "info"); return; }
  if (!this.battle) { C.engage(this, m, { playerFirst: true, pending: function () { self.throwItem(it, c); } }); return; }
  if (!C.canAct(this, "action")) return;
  var nv = (this.cur("inventory") || []).slice(); var j = nv.findIndex(function (x) { return x && x.id === it.id; }); if (j >= 0) { var q = Object.assign({}, nv[j]); q.qty = (Number(q.qty) || 1) - 1; if (q.qty <= 0) nv.splice(j, 1); else nv[j] = q; this.write("inventory", nv); }
  var col = c.element === "fire" ? "#ff8a3a" : c.element === "acid" ? "#9ae05a" : c.element === "cold" ? "#9fe0ff" : "#d0c0a0";
  C.act(this, "throw", "action", function () { return (function* () { self.faceTarget(m); var done = false; self.projectile(m, "flask", function () { var res = I.throwAttack(self.v, c, m.mon, { name: it.name, bonus: B.stSum(self.pe, "atk"), evBonus: B.stSum(m, "ev") }); self.resolveHit(m, res, "throwing", res.hit ? c.element || "fire" : null, self.pe); if (res.hit && c.element === "fire") self.fx.ring(m.x, m.y, m.z, "#ff8a3a", 2.4); done = true; }, null, c.element, col); yield function () { return done; }; })(); });
  this.log("Threw " + it.name + " at " + m.mon.name + ".");
};
Game.prototype.hotbar = function () {
  var v = this.v, w = R.weaponProfile(v), kit = R.CALLING_KIT[this.calling()] || { tech: [] }; var slots = []; var self = this; var b = this.battle;
  slots.push({ id: "attack", kind: "attack", cost: "action", label: w.item ? w.name : "Unarmed", icon: w.ranged ? "bow" : w.kind === "staff" ? "staff" : w.kind === "dagger" ? "dagger" : w.kind === "none" ? "fist" : w.blunt ? "hammer" : "sword", desc: "Weapon attack (Action)." });
  (kit.tech || []).slice(0, 2).forEach(function (t) { slots.push({ id: "tech:" + t.id, kind: "tech", tech: t, cost: self.techCost(t), label: t.name, icon: "tech", desc: t.desc, disabled: (t.cost && self.res < t.cost) || (t.sp && self.stats.sp < t.sp) || (t.once && self.encounterUsed[t.id]), why: t.cost ? "Requires " + t.cost + " " + kit.res : t.once && self.encounterUsed[t.id] ? "Spent for this encounter." : "" }); });
  // the first spells the character can actually use in a fight; every learned spell is in the spellbook tray (R)
  var learned = SC.known(this, this.pe); learned.sort(function (a, b2) { return (S.describeSpell(b2).usable ? 1 : 0) - (S.describeSpell(a).usable ? 1 : 0); });
  learned.slice(0, 3).forEach(function (sp) { var st = SC.state(self, self.pe, sp); var kind = st.d.kind; slots.push({ id: "spell:" + sp.id, kind: "spell", spell: sp, cost: st.d.cost && st.d.cost.reaction ? "reaction" : st.d.cost && st.d.cost.action ? "action" : null, label: sp.name, icon: kind === "heal" ? "heal" : /fire|ember|flame/.test(sp.id + sp.element) ? "fire" : /frost|ice|cold/.test(sp.id + sp.element) ? "ice" : /lightning|spark|arc/.test(sp.id + sp.element) ? "bolt" : "magic", mp: st.mp, desc: sp.desc, disabled: !st.ok, why: st.why }); });
  while (slots.length < 5) slots.push(null);
  var inv0 = this.cur("inventory"); var inv = Array.isArray(inv0) ? inv0 : [];
  var heal = inv.find(function (x) { return x && Number(x.qty) > 0 && I.classify(x).kind === "heal"; }); var mana = inv.find(function (x) { return x && Number(x.qty) > 0 && I.classify(x).kind === "mana"; }); var food = inv.find(function (x) { return x && Number(x.qty) > 0 && I.classify(x).kind === "food"; });
  slots.push(heal ? { id: "item:" + heal.id, kind: "item", item: heal, cost: "bonus", label: heal.name, icon: "potion-red", count: heal.qty || 1, desc: "Drink (Bonus Action)." } : { id: "none6", kind: "empty", label: "No healing potion", icon: "potion-red", disabled: true, count: 0, why: "No healing potions in your pack." });
  slots.push(mana ? { id: "item:" + mana.id, kind: "item", item: mana, cost: "bonus", label: mana.name, icon: "potion-blue", count: mana.qty || 1, desc: "Drink (Bonus Action)." } : { id: "none7", kind: "empty", label: "No mana potion", icon: "potion-blue", disabled: true, count: 0, why: "No mana potions in your pack." });
  if (b) {
    slots.push({ id: "dodge", kind: "dodge", cost: "action", label: "Dodge", icon: "dodge", desc: "+3 Evasion until your next turn (Action)." });
    slots.push({ id: "dash", kind: "dash", cost: "action", label: "Dash", icon: "dash", desc: "Double your movement this turn (Action)." });
    slots.push({ id: "endturn", kind: "endturn", label: "End Turn", icon: "end", desc: "End your turn (Space)." });
    var ready = C.ready(this);
    slots.forEach(function (sl) { if (!sl || sl.kind === "empty") return; if (sl.kind === "endturn") { sl.disabled = !ready; return; } if (!ready || (sl.cost && sl.cost !== "reaction" && !b.econ[sl.cost])) { sl.disabled = true; sl.why = !ready ? "Wait for your turn." : sl.cost === "action" ? "Action spent this turn." : "Bonus Action spent this turn."; } });
  } else {
    slots.push(food ? { id: "item:" + food.id, kind: "item", item: food, cost: "bonus", label: food.name, icon: "herb", count: food.qty || 1 } : { id: "none8", kind: "empty", label: "No rations", icon: "herb", disabled: true, count: 0, why: "No separate rations or herbs." });
    slots.push({ id: "dodge", kind: "dodge", label: "Dodge Roll (2 SP)", icon: "dodge", disabled: this.stats.sp < 2 });
    slots.push({ id: "interact", kind: "interact", label: "Interact (E)", icon: "hand" });
  }
  return slots.slice(0, 10);
};
// the spellbook and item trays: everything learned or carried, with the reason when it cannot be used right now
Game.prototype.listSpells = function () {
  var self = this; return SC.known(this, this.pe).map(function (sp) { var st = SC.state(self, self.pe, sp); var d = st.d; return { id: sp.id, name: sp.name, school: sp.school, tier: sp.tier, mp: st.mp, ok: st.ok, why: st.why, label: d.label, kind: d.kind, util: !!st.util, range: Math.round(d.maxR || 0), area: Math.round(d.area || 0), dice: sp.dice ? sp.dice[0] + "d" + sp.dice[1] : "", element: sp.element || "", desc: sp.desc || "", tgt: d.tgt }; }).sort(function (a, b) { return (b.ok ? 1 : 0) - (a.ok ? 1 : 0) || (a.mp - b.mp); });
};
Game.prototype.listItems = function () {
  var inv = this.cur("inventory"); var eq = this.cur("equipment") || {}; var self = this; return I.combatItems(inv, eq).map(function (c) { var cost = I.costOf(c); var ok = true, why = ""; if (self.battle) { if (!C.ready(self)) { ok = false; why = "Wait for your turn."; } else if (!self.battle.econ[cost]) { ok = false; why = cost === "action" ? "Action spent." : "Bonus Action spent."; } } if (c.kind === "weapon" && c.equipped) { ok = false; why = "Already in hand."; } return { id: c.id, name: c.name, qty: c.qty, kind: c.kind, label: c.label, desc: I.describe(c), cost: cost, ok: ok, why: why, equipped: !!c.equipped }; });
};
Game.prototype.useSpellById = function (id) { var sp = SC.known(this, this.pe).find(function (x) { return x.id === id; }); if (sp) SC.begin(this, sp); };
Game.prototype.useItemById = function (id) { var it = (this.cur("inventory") || []).find(function (x) { return x && x.id === id; }); if (it) this.useItem(it); };
Game.prototype.handPos = function () { var T3 = T(); var v = new T3.Vector3(); try { this.player.root.updateMatrixWorld(true); this.player.RA.hand.getWorldPosition(v); } catch (e) { v.set(this.pos.x, this.pos.y + 1.3, this.pos.z); } return v; };
Game.prototype.engageWith = function (m, opts) { C.engage(this, m, opts); };
Game.prototype.runScript = function (gen) { C.run(this, gen); };
Game.prototype.endTurnNow = function () { C.endTurn(this); };
Game.prototype.battleEntities = function () { var l = [this.pe]; (this.allies || []).forEach(function (a) { if (!a.dead && !a.gone) l.push(a); }); this.monsters.forEach(function (m) { if (!m.dead && !m.fled && (m.inBattle || m.summoned)) l.push(m); }); return l; };
Game.prototype.entityById = function (id) { if (id === "player" || id == null) return this.pe; var a = this.allyById(id); if (a) return a; return this.monsters.find(function (m) { return m.id === id; }) || this.pe; };
Game.prototype.allyById = function (id) { return (this.allies || []).find(function (a) { return a.id === id; }) || null; };
Game.prototype.spawnGuardian = function (caster, x, z, rounds, sp) {
  var m = this.addMonster(R.GUARDIAN, x, z, "summon" + Math.random().toString(36).slice(2, 6)); if (!m) return; m.summoned = true; m.passive = false; m.speed = 8; C.join(this, m, true); B.addSt(this, m, { id: "controlled", name: "Spirit Guardian", rounds: rounds, controlled: 1 }, caster); m.tag = ""; var c = this.battle && this.battle.order.find(function (o) { return o.e === m; }); if (c) c.name = "Spirit Guardian"; this.fx.burst(x, m.y + 1, z, "#c8a0ff", true);
};
// ------------------------------------------------------------------ projectiles, floaters, effects
Game.prototype.projectile = function (target, kind, onHit, from, element, colOverride) {
  var THREE = T(); var o; var src = from ? { x: from.x, y: from.y + 1.4, z: from.z } : { x: this.pos.x, y: this.pos.y + 1.5, z: this.pos.z };
  if (kind === "arrow") { o = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0x8a6a40 })); o.rotation.order = "YXZ"; }
  else if (kind === "rock" || kind === "flask") { o = new THREE.Mesh(new THREE.SphereGeometry(kind === "rock" ? 0.28 : 0.13, 8, 6), new THREE.MeshStandardMaterial({ color: kind === "rock" ? 0x6a6560 : 0x7a5a30, roughness: 0.9 })); }
  else { var col = colOverride ? new THREE.Color(colOverride) : new THREE.Color(/fire|ember/.test(element || "") ? 0xff8a3a : /cold|frost|ice/.test(element || "") ? 0x9fe0ff : /lightning/.test(element || "") ? 0xd8e8ff : /necrotic|umbral/.test(element || "") ? 0x9a5ac0 : /radiant/.test(element || "") ? 0xfff0a0 : 0x7ab8ff); o = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); o.scale.set(1.3, 1.3, 1); }
  o.position.set(src.x, src.y, src.z); this.scene.add(o); this.projectiles.push({ o: o, target: target, onHit: onHit, speed: kind === "arrow" ? 46 : kind === "rock" || kind === "flask" ? 22 : 26, kind: kind, col: colOverride || SC.elementColor(element), arc: kind === "rock" || kind === "flask", t0: 0, d0: Math.hypot(target.x - src.x, target.z - src.z) });
};
Game.prototype.updateProjectiles = function (dt) {
  var self = this; this.projectiles = this.projectiles.filter(function (p) {
    var t = p.target; var tx = t.x, tz = t.z, ty = (t.y || 0) + ((t.c && t.c.height) || 1.4) * 0.6;
    var dx = tx - p.o.position.x, dy = ty - p.o.position.y, dz = tz - p.o.position.z, d = Math.hypot(dx, dy, dz);
    if (d < 0.8 || d > 300) { self.scene.remove(p.o); if (p.o.geometry) p.o.geometry.dispose(); p.o.material.dispose(); if (d < 0.8) { if (p.kind === "arrow") self.fx.sparks(p.o.position.x, p.o.position.y, p.o.position.z, "#e8d8b0"); p.onHit(); } return false; }
    var s = Math.min(d, p.speed * dt); p.o.position.x += dx / d * s; p.o.position.y += dy / d * s + (p.arc ? Math.sin(Math.min(1, (p.d0 - Math.hypot(dx, dz)) / Math.max(1, p.d0)) * Math.PI) * 4 * dt : 0); p.o.position.z += dz / d * s;
    if (p.kind === "arrow") { p.o.rotation.y = Math.atan2(dx, dz); p.o.rotation.x = Math.PI / 2; }
    else if (p.arc) { p.o.rotation.x += dt * 9; p.o.rotation.y += dt * 7; if (p.kind === "flask") self.fx.trailPuff(p.o.position.x, p.o.position.y, p.o.position.z, p.col); }
    else { p.o.scale.setScalar(1.1 + Math.sin(self.time * 30) * 0.15); self.fx.trailPuff(p.o.position.x, p.o.position.y, p.o.position.z, p.col || "#7ab8ff"); }
    return true;
  });
};
Game.prototype.projectileTo = function (caster, pt, col) { var self = this; var hp = this.handPos ? (caster.kind === "player" ? this.handPos() : { x: caster.x, y: caster.y + 1.4, z: caster.z }) : { x: caster.x, y: caster.y + 1.4, z: caster.z }; var o = { x: pt.x, y: pt.y, z: pt.z, c: { height: 0 } }; this.projectile(o, "bolt", function () { }, { x: hp.x, y: hp.y - 1.4, z: hp.z }, "", col); };
Game.prototype.beam = function (a, b, col) { var n = Math.ceil(B.dist(a, b) / 0.5); for (var i = 0; i <= n; i++) { var t = i / n; this.fx.emit(a.x + (b.x - a.x) * t, (a.y || 0) + 1.2 + (((b.y || 0) - (a.y || 0)) * t), a.z + (b.z - a.z) * t, { n: 2, color: col, color2: "#ffffff", speed: 0.4, size: 0.3, life: 0.35, grav: 0, drag: 2 }); } };
Game.prototype.floater = function (m, text, color) {
  var s = textSprite(text, { size: 34, scale: 0.011, color: color, bold: true, depthTest: false }); var pos = m ? { x: m.x, y: m.y + (m.c.height || 1.6) + 0.4, z: m.z } : { x: this.pos.x, y: this.pos.y + 2.3, z: this.pos.z };
  s.position.set(pos.x + (Math.random() - 0.5) * 0.6, pos.y, pos.z + (Math.random() - 0.5) * 0.6); this.scene.add(s); this.floaters.push({ s: s, t: 0 });
};
Game.prototype.floatAt = function (e, text, color) { this.floater(e && e.kind === "player" ? null : e, text, color); };
Game.prototype.statusFloat = function (e, name, good) { if (!name) return; this.floatAt(e, name, good ? "#d8c8ff" : "#ffb0a0"); };
Game.prototype.updateFloaters = function (dt) { var self = this; this.floaters = this.floaters.filter(function (f) { f.t += dt; f.s.position.y += dt * 1.4; f.s.material.opacity = Math.max(0, 1 - f.t / 1.3); if (f.t > 1.3) { self.scene.remove(f.s); f.s.material.map.dispose(); f.s.material.dispose(); return false; } return true; }); };
Game.prototype.lightOrb = function () { var THREE = T(); if (this.orb) { this.orbUntil = this.time + 60; return; } var l = new THREE.PointLight(0xbfd8ff, 1.6, 26); var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xbfd8ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.set(1.2, 1.2, 1); l.add(sp); this.scene.add(l); this.orb = l; this.orbUntil = this.time + 60; };
Game.prototype.pushLog = function (line, kind) { this.combatLog.push({ t: Date.now(), line: line, kind: kind || "info" }); if (this.combatLog.length > 30) this.combatLog.shift(); };
Game.prototype.toast = function (msg, type) { this.bridge.toast && this.bridge.toast(msg, type || "info"); };


// ------------------------------------------------------------------ companions
// The party the Game Master keeps in `party` and `companions` becomes real people who follow you in the world and
// fight beside you. Their statistics are the companion records' own (attributes, skills, equipment, spells, HP/Mana/Stamina).
function allySheet(rec) {
  var base = { strength: 10, agility: 10, endurance: 10, intellect: 10, perception: 10, willpower: 10, presence: 10, arcana: 10 };
  return { attributes: Object.assign(base, rec.attributes || {}), skills: rec.skills || {}, equipment: rec.equipment || {}, inventory: Array.isArray(rec.inventory) ? rec.inventory : [], "known-spells": rec.knownSpells || rec["known-spells"] || {}, techniques: rec.techniques || {}, class: rec.class || rec.calling || (Array.isArray(rec.callings) && rec.callings[0]) || "Fighter", conditions: rec.conditions || [], encumbrance: rec.encumbrance };
}
Game.prototype.partyMembers = function () {
  var v = this.v; var party = Array.isArray(v.party) ? v.party : []; var comps = v.companions && typeof v.companions === "object" ? v.companions : {}; var out = []; var seen = {};
  function ok(rec) { var st = String(rec.partyStatus || rec.status || "").toLowerCase(); return !/dead|captured|separated|departed|left|missing/.test(st) && !(rec.hp != null && Number(rec.hp) <= 0 && /dead/.test(st)); }
  party.forEach(function (p) { var id = typeof p === "string" ? p : (p && (p.id || p.name)); if (!id) return; var key = R.slug(id); var rec = Object.assign({ name: typeof p === "string" ? (comps[id] || {}).name || id : p.name || id }, comps[id] || comps[key] || {}, typeof p === "object" ? p : {}); if (!rec.name) rec.name = id; if (ok(rec) && !seen[key]) { seen[key] = 1; out.push({ id: key, key: comps[id] ? id : comps[key] ? key : id, rec: rec }); } });
  if (!party.length) Object.keys(comps).forEach(function (k) { var c = comps[k]; if (c && (c.inParty || /active|traveling|following|party/i.test(String(c.partyStatus || c.status || ""))) && ok(c) && !seen[R.slug(k)]) { seen[R.slug(k)] = 1; out.push({ id: R.slug(k), key: k, rec: Object.assign({ name: c.name || k }, c) }); } });
  return out;
};
function num2(x, d) { var n = Number(x); return isFinite(n) ? n : d; }
Game.prototype.spawnAlly = function (m) {
  var rec = m.rec; var rr = rng(hashStr(m.id)); var sheet = allySheet(rec); var w = R.weaponProfile(sheet);
  var cal = sheet.class; var look = { calling: CALLING_LOOK[cal] ? cal : "Fighter", species: rec.species || "Human", gender: rec.gender || (rr() < 0.5 ? "Female" : "Male"), skin: SKIN_TONES[Math.floor(rr() * 4)], hair: HAIR_COLORS[Math.floor(rr() * 5)], hairStyle: HAIR_STYLES[Math.floor(rr() * 11)], face: Math.floor(rr() * 12), build: ["Slender", "Lean", "Athletic", "Sturdy", "Broad"][Math.floor(rr() * 5)], beard: rr() < 0.3, weapon: w.kind, shield: R.hasShield(sheet) };
  var h = makeHumanoid(Object.assign({ detail: "lo" }, look)); var ang = this.yaw + Math.PI + (this.allies.length % 2 ? 0.7 : -0.7); var x = this.pos.x + Math.sin(ang) * 2.6, z = this.pos.z + Math.cos(ang) * 2.6;
  var hp = num2(rec.hp, num2(rec.maxHp, 20)); var maxHp = num2(rec.maxHp != null ? rec.maxHp : rec["max-hp"] != null ? rec["max-hp"] : rec.hpMax, hp);
  var a = { kind: "ally", id: "ally:" + m.id, cid: m.id, ckey: m.key, name: rec.name, role: rec.role, rec: rec, sheet: sheet, st: [], x: x, z: z, y: this.terrain.groundAt(x, z), yaw: this.yaw, hp: hp, maxHp: Math.max(1, maxHp), mp: num2(rec.mana != null ? rec.mana : rec.mp, 0), maxMp: num2(rec.maxMana != null ? rec.maxMana : rec["max-mana"], num2(rec.mana, 0)), sp: num2(rec.stamina != null ? rec.stamina : rec.sp, 10), maxSp: num2(rec.maxStamina != null ? rec.maxStamina : rec["max-stamina"], num2(rec.stamina, 10)), dead: false, gone: false, gait: 0, reaction: 1, c: { arch: "humanoid", size: 1, height: h.height, parts: { h: h } } };
  h.root.position.set(a.x, a.y, a.z); this.scene.add(h.root); var lab = textSprite(a.name, { size: 28, scale: 0.0062, color: "#a8dcff" }); lab.position.y = h.height + 0.35; h.root.add(lab); this.allies.push(a); return a;
};
Game.prototype.syncAllies = function (initial) {
  var self = this; var members = this.partyMembers();
  this.allies = this.allies.filter(function (a) { var keep = members.some(function (m) { return m.id === a.cid; }) && !a.dead; if (!keep && !a.dead) { self.scene.remove(a.c.parts.h.root); a.gone = true; } else if (!keep) { /* corpses stay where they fell */ } return keep || a.dead; });
  members.forEach(function (m) {
    var a = self.allies.find(function (x) { return x.cid === m.id; });
    if (!a) { self.spawnAlly(m); return; }
    a.rec = m.rec; a.sheet = allySheet(m.rec); a.name = m.rec.name || a.name; a.role = m.rec.role;
    if (!self.battle) { var hp = num2(m.rec.hp, a.hp); if (Math.round(hp) !== Math.round(a.hp)) a.hp = hp; a.maxHp = Math.max(1, num2(m.rec.maxHp != null ? m.rec.maxHp : m.rec["max-hp"], a.maxHp)); if (m.rec.mana != null) a.mp = num2(m.rec.mana, a.mp); if (m.rec.stamina != null) a.sp = num2(m.rec.stamina, a.sp); }
  });
};
Game.prototype.writeAlly = function (a) {
  var comps = Object.assign({}, this.cur("companions") || {}); var key = a.ckey in comps ? a.ckey : a.cid; var rec = Object.assign({}, comps[key] || { name: a.name });
  rec.hp = Math.max(0, Math.round(a.hp)); if (rec.maxHp == null && rec["max-hp"] == null) rec.maxHp = a.maxHp; if (rec.mana != null || a.maxMp > 0) rec.mana = Math.max(0, Math.round(a.mp)); if (rec.stamina != null) rec.stamina = Math.max(0, Math.round(a.sp));
  if (a.dead) { rec.status = "dead"; rec.partyStatus = "dead"; rec.alive = false; comps[key] = rec; this.write("companions", comps); var party = (this.cur("party") || []).filter(function (p) { var id = typeof p === "string" ? p : p && (p.id || p.name); return R.slug(id) !== a.cid; }); this.write("party", party); var pm = Object.assign({}, this.cur("party-management") || {}); if (Array.isArray(pm.memberIds)) { pm.memberIds = pm.memberIds.filter(function (id) { return R.slug(id) !== a.cid; }); this.write("party-management", pm); } this.flushSoon(); return; }
  comps[key] = rec; this.write("companions", comps); this.flushSoon();
};
Game.prototype.allyPack = function (a) { return a.sheet.inventory; };
Game.prototype.allyUseItem = function* (a, c) {
  a.econ.bonus = 0; var rec = Object.assign({}, a.rec); var inv = (rec.inventory || []).map(function (x) { return Object.assign({}, x); }); var j = inv.findIndex(function (x) { return x.id === c.id; }); if (j >= 0) { inv[j].qty = (Number(inv[j].qty) || 1) - 1; if (inv[j].qty <= 0) inv.splice(j, 1); }
  var h = a.c.parts.h; playAction(h, "drink"); yield 0.7; var d = c.dice ? R.rollDice(c.dice[0], c.dice[1]).total + c.dice[2] : 6; var got = B.healEntity(this, a, a, d); this.pushLog("(" + a.name + " drinks " + c.name + " — +" + got + " HP)", "heal"); this.fx.motes(a.x, a.y + 0.3, a.z, "#9cff9c", 16); a.rec.inventory = inv; a.sheet.inventory = inv;
  var comps = Object.assign({}, this.cur("companions") || {}); var key = a.ckey in comps ? a.ckey : a.cid; comps[key] = Object.assign({}, comps[key] || {}, { inventory: inv }); this.write("companions", comps); this.writeAlly(a); yield 0.2;
};
Game.prototype.updateAllies = function (dt) {
  var self = this; var adt = this.adt || dt;
  this.allies.forEach(function (a, i) {
    var h = a.c.parts.h; if (!a.dead && !a.inBattle) {
      var k = Math.floor(i / 2); var ang = self.yaw + Math.PI + (i % 2 ? 0.75 : -0.75) * (1 + k * 0.45); var dd = 2.6 + k * 1.5; var tx = self.pos.x + Math.sin(ang) * dd, tz = self.pos.z + Math.cos(ang) * dd; var d = Math.hypot(tx - a.x, tz - a.z);
      if (d > 55) { a.x = tx; a.z = tz; a.gait = 0; }
      else if (d > 0.9) { var sp = Math.min(13, 2.2 + d * 2.0); var step = Math.min(d, sp * dt); var nx = a.x + (tx - a.x) / d * step, nz = a.z + (tz - a.z) / d * step; var gh = self.terrain.groundAt(nx, nz); if (gh > -1.3) { var c = self.collide(nx, nz, 0.45); a.x = c.x; a.z = c.z; } a.yaw = lerpAngle(a.yaw, Math.atan2(tx - a.x, tz - a.z), dt * 9); a.gait = sp; }
      else { a.gait = 0; a.yaw = lerpAngle(a.yaw, self.yaw, dt * 3); }
    }
    a.y = self.terrain.groundAt(a.x, a.z); h.root.position.set(a.x, a.y, a.z); h.root.rotation.y = a.yaw;
    if (a.inBattle && a.gait === 0 && !B.hasSt(a, "unconscious")) { /* stance only */ }
    if (Math.hypot(a.x - self.pos.x, a.z - self.pos.z) < 180) animateHumanoid(h, adt, { speed: (a.gait || 0) / 7.2, combat: !!a.inBattle, dead: a.dead, calm: true });
    if (a.inBattle) a.gait = 0;
  });
};

// ------------------------------------------------------------------ interaction
Game.prototype.findInteract = function () {
  var px = this.pos.x, pz = this.pos.z, best = null, bd = 4.2;
  this.npcs.forEach(function (n) { var d = Math.hypot(n.x - px, n.z - pz); if (d < bd) { bd = d; best = { type: "npc", npc: n, label: "Talk to " + n.name }; } });
  if (best) return best; bd = 4.5;
  this.corpses = this.monsters.filter(function (m) { return m.dead && !m.harvested; });
  this.corpses.forEach(function (m) { var d = Math.hypot(m.x - px, m.z - pz); if (d < bd) { bd = d; best = { type: "corpse", m: m, label: "Harvest " + m.mon.name }; } });
  if (best) return best; bd = 5.5;
  for (var id in this.settlements) { var s = this.settlements[id]; if (Math.hypot(s.center.x - px, s.center.z - pz) > s.radius + 40) continue;
    s.boards.forEach(function (b) { var d = Math.hypot(b.x - px, b.z - pz); if (d < bd) { bd = d; best = { type: "board", board: b, s: s, label: "Read the " + b.name }; } });
    s.doors.forEach(function (dd) { if (dd.kind === "gate" || dd.kind === "district") return; var d = Math.hypot(dd.x - px, dd.z - pz); if (d < bd) { bd = d; best = { type: "door", door: dd, s: s, label: (dd.kind === "dungeon" ? "Delve into " : dd.kind === "market" ? "Browse " : "Enter ") + dd.name }; } });
  }
  return best;
};
Game.prototype.doInteract = function () {
  var it = this.interact; if (!it) { this.toast("Nothing to interact with here.", "info"); return; }
  if (it.type === "corpse") return this.harvest(it.m);
  if (it.type === "npc") { this.bridge.onNpc && this.bridge.onNpc(this.npcCard(it.npc)); return; }
  if (it.type === "door") { this.subOverride = it.door.name; this.writePosition(true); this.dirty["current-sublocation"] = it.door.name; this.bridge.onDoor && this.bridge.onDoor(it.door, it.s.place); return; }
  if (it.type === "board") { this.bridge.onBoard && this.bridge.onBoard(it.board, it.s.place); return; }
};
Game.prototype.npcCard = function (n) {
  var ns = this.v["npc-state"] || {}; var rec = null; Object.keys(ns).forEach(function (k) { var x = ns[k]; if (x && (x.name === n.name || k === R.slug(n.name))) rec = x; });
  var url = ""; try { url = n.portrait || (n.portrait = (window.__eldoriaPortrait ? window.__eldoriaPortrait(n.h.look) : "")); } catch (e) { }
  return { id: n.id, name: n.name, title: n.title, desc: n.desc, trainer: n.trainer, role: n.role, named: n.named, district: n.district, place: n.home, record: rec, portrait: url };
};
Game.prototype.startTalk = function (id) { var n = this.npcs.find(function (x) { return x.id === id; }); this.talking = n || null; if (n) { this.subOverride = n.district || this.subOverride; } };
Game.prototype.endTalk = function () { this.talking = null; };
Game.prototype.harvest = function (m) {
  m.harvested = true; var loot = R.lootFor(m.mon); var v = this.v; var inv0 = this.cur("inventory"); var inv = Array.isArray(inv0) ? inv0.slice() : []; var got = [];
  loot.items.forEach(function (it) { var ex = inv.findIndex(function (x) { return x && x.id === it.id; }); if (ex >= 0) inv[ex] = Object.assign({}, inv[ex], { qty: (Number(inv[ex].qty) || 1) + 1 }); else inv.push(it); got.push(it.name); });
  if (loot.items.length) this.write("inventory", inv);
  if (loot.copper) { this.write("player-money-cp", Math.max(0, Number(this.cur("player-money-cp")) || 0) + loot.copper); got.push(R.money(loot.copper).text.replace(/\b0 (gp|sp|cp)\s?/g, "").trim() || loot.copper + " cp"); this.bridge.sfx && this.bridge.sfx("sfx-coin"); }
  this.skillProgress("harvesting", 2);
  var hr0 = this.cur("harvest-records"); var hr = Array.isArray(hr0) ? hr0.slice(-40) : []; hr.push({ monster: m.mon.name, date: formatDate(Math.floor(this.clock / 1440)), items: got }); this.write("harvest-records", hr);
  this.clock += 15; this.pushLog(got.length ? "Harvested " + m.mon.name + ": " + got.join(", ") + "." : "Nothing usable on the " + m.mon.name + ".", "loot");
  this.toast(got.length ? "Harvested: " + got.join(", ") : "Nothing usable remains.", got.length ? "success" : "info"); if (got.length) this.log("Harvested " + m.mon.name + ": " + got.join(", ") + " (already added to inventory).");
  this.scene.remove(m.c.root); m.deadT = 999; this.flushSoon();
};
Game.prototype.flushSoon = function () { this.flushAt = performance.now() + 900; };

// ------------------------------------------------------------------ discovery & fog
Game.prototype.revealAround = function (silent) {
  var x = this.pos.x / MILE, y = -this.pos.z / MILE; var night = this.envState ? this.envState.night : 0; var R0 = 13 - night * 6 + (this.pos.y > 60 ? 8 : 0); var changed = false;
  for (var dx = -R0; dx <= R0; dx += FOG_CELL) for (var dy = -R0; dy <= R0; dy += FOG_CELL) { if (dx * dx + dy * dy > R0 * R0) continue; var i = fogIndex(x + dx, y + dy); if (i >= 0 && !this.fog[i]) { this.fog[i] = 1; changed = true; } }
  if (changed) { this.fogVersion++; this.dirtyFog = true; this.fogEnc = null; }
  // canonical places within reach become known (the GM's discovery engine, applied locally)
  var known0 = this.cur("known-locations"); var known = known0 && typeof known0 === "object" ? known0 : {}; var add = null;
  var self = this;
  placesNear(x, y).forEach(function (p) { var d = Math.hypot(p.x - x, p.y - y); var sightR = /capital|city|stronghold|fort-town/.test(p.kind) ? 7 : /fort|tower|landmark/.test(p.kind) ? 5 : 2.5; if (d > p.r + sightR) return; var k = p.id; var have = add ? add[k] : known[k]; if (have && have.discovered && !have.approximate) return; add = add || Object.assign({}, known); add[k] = { name: p.name, x: p.x, y: p.y, region: p.realm, kind: p.kind, discovered: true, discoveryMethod: d < p.r + 0.5 ? "visited" : "sighted while exploring", discoveredDate: formatDate(Math.floor(self.clock / 1440)) }; if (!silent) { self.toast("Discovered: " + p.name, "success"); self.log("Discovered " + p.name + " (" + p.x + ", " + p.y + ")."); } var lg0 = self.newLog || self.cur("map-discovery-log"); var log = Array.isArray(lg0) ? lg0.slice() : []; self.newLog = log; log.push({ id: k, name: p.name, x: p.x, y: p.y, region: p.realm, method: "exploration", date: formatDate(Math.floor(self.clock / 1440)) }); });
  if (add) { this.write("known-locations", add); this.write("map-discovery-log", this.newLog); this.flushSoon(); } this.newLog = null;
};

// ------------------------------------------------------------------ travel
Game.prototype.teleportMiles = function (x, y, announce) {
  if (this.battle) C.finish(this, "moved");
  this.monsters.forEach(function (m) { this.scene.remove(m.c.root); }, this); this.monsters = []; this.spawnedCells = {}; this.target = null;
  this.pos.x = x * MILE; this.pos.z = -y * MILE; var p = insidePlace(x, y); if (p && Math.hypot(x - p.x, y - p.y) < 0.08) { this.pos.x += 18; this.pos.z += 30; }
  this.terrain.warm(this.pos.x, this.pos.z, 1);
  this.loadSettlements(true); this.pos.y = this.terrain.groundAt(this.pos.x, this.pos.z); this.walkFrom = describe(x, y); this.walked = 0; this.revealAround(!announce);
};
// Fast travel along known roads; returns {miles, days} and moves time forward.
Game.prototype.travelTo = function (id) {
  if (this.battle) { this.toast("You cannot travel in the middle of a fight.", "error"); return null; }
  var p = PLACE_BY_ID[id]; if (!p) return null; var x0 = this.pos.x / MILE, y0 = -this.pos.z / MILE; var from = describe(x0, y0).location;
  var miles = Math.round(Math.hypot(p.x - x0, p.y - y0) * 1.18); var hours = miles / 3; var days = miles / 25;
  // reveal along the route
  for (var t = 0; t <= 1; t += 2 / Math.max(2, miles)) { var i = fogIndex(x0 + (p.x - x0) * t, y0 + (p.y - y0) * t); if (i >= 0) this.fog[i] = 1; } this.fogVersion++; this.dirtyFog = true; this.fogEnc = null;
  this.clock += Math.round(days >= 1 ? Math.floor(days) * 1440 + (days % 1) * 10 * 60 : hours * 60);
  this.teleportMiles(p.x, p.y, true); this.walked = 0;
  this.log("Traveled from " + from + " to " + p.name + " (about " + miles + " road miles, ~" + (days >= 1 ? days.toFixed(1) + " days" : hours.toFixed(1) + " hours") + " on foot). The clock was advanced; roll travel events by Route Security and narrate the journey's costs (food, lodging, encounters).");
  this.writePosition(true); this.writeClock(true); this.subOverride = null; return { miles: miles, days: days, from: from, to: p.name };
};

// ------------------------------------------------------------------ input
Game.prototype.bindInput = function () {
  var self = this, el = this.renderer.domElement; var drag = null; var pts = {}; var pinch = null;
  this.onKeyDown = function (e) { var tg = e.target; if (tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA" || tg.isContentEditable)) return; var k = e.key.toLowerCase(); if (self.bridge.hotkey && self.bridge.hotkey(k, e)) { e.preventDefault(); return; } var ae = document.activeElement; if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return; self.keys[k] = true; if (k === " ") { if (self.battle) C.endTurn(self); else self.jump(); e.preventDefault(); } if (k === "e" || k === "f") self.doInteract(); if (k === "tab") { self.cycleTarget(); e.preventDefault(); } if (k === "escape") { if (self.tgt) { SC.cancel(self); } else { self.target = null; self.autoMove = null; } } var n = "1234567890".indexOf(k); if (n >= 0) self.useSlot(n); if (k === "shift") self.running = true; };
  this.onKeyUp = function (e) { var k = e.key.toLowerCase(); self.keys[k] = false; if (k === "shift") self.running = false; };
  this.onDown = function (e) { pts[e.pointerId] = { x: e.clientX, y: e.clientY }; var ids = Object.keys(pts); if (ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: self.camDist }; drag = null; return; } drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, id: e.pointerId, moved: false, button: e.button, touch: e.pointerType === "touch" || e.pointerType === "pen" }; try { el.setPointerCapture(e.pointerId); } catch (_) { } };
  this.onMove = function (e) {
    if (pts[e.pointerId]) pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (pinch) { var ids = Object.keys(pts); if (ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]]; var d = Math.hypot(a.x - b.x, a.y - b.y); self.camDist = Math.max(2.5, Math.min(34, pinch.dist * pinch.d / Math.max(20, d))); } return; }
    if (e.pointerType === "mouse" && !drag) { self.mouse = { x: e.clientX, y: e.clientY }; return; }
    if (!drag || drag.id !== e.pointerId) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > (drag.touch ? 10 : 5)) drag.moved = true; if (drag.moved) { self.camYaw -= dx * 0.006; self.camPitch = Math.max(-0.35, Math.min(1.25, self.camPitch + dy * 0.004)); }
  };
  this.onUp = function (e) { delete pts[e.pointerId]; if (pinch) { if (Object.keys(pts).length < 2) pinch = null; drag = null; return; } if (drag && !drag.moved && drag.button === 0) self.clickPick(e.clientX, e.clientY, drag.touch); drag = null; };
  this.onLeave = function (e) { if (e && e.pointerType && e.pointerType !== "mouse") return; /* a lifted finger also "leaves"; its preview must stay */ self.mouse = null; self.hover = null; };
  this.onWheel = function (e) { self.camDist = Math.max(2.5, Math.min(34, self.camDist * (e.deltaY > 0 ? 1.1 : 0.9))); e.preventDefault(); };
  this.onCtx = function (e) { e.preventDefault(); };
  window.addEventListener("keydown", this.onKeyDown); window.addEventListener("keyup", this.onKeyUp); el.addEventListener("pointerdown", this.onDown); el.addEventListener("pointermove", this.onMove); el.addEventListener("pointerup", this.onUp); el.addEventListener("pointercancel", this.onUp); el.addEventListener("pointerleave", this.onLeave); el.addEventListener("wheel", this.onWheel, { passive: false }); el.addEventListener("contextmenu", this.onCtx);
};
Game.prototype.screenOf = function (x, y, z) { var THREE = T(); var rect = this.renderer.domElement.getBoundingClientRect(); var v = new THREE.Vector3(x, y, z).project(this.camera); if (v.z > 1) return null; return { x: (v.x + 1) / 2 * rect.width + rect.left, y: (1 - v.y) / 2 * rect.height + rect.top }; };
Game.prototype.pickAt = function (cx, cy, radius, withNpcs) {
  var self = this, best = null, bd = radius || 60;
  var list = this.monsters.filter(function (m) { return !m.dead; }); if (withNpcs) list = list.concat(this.npcs.map(function (n) { return { npc: n, x: n.x, y: n.y, z: n.z, c: { height: n.h.height } }; }));
  list.forEach(function (m) { if (Math.hypot(m.x - self.pos.x, m.z - self.pos.z) > 90) return; var h = m.c.height || 1.5; [0.3, 0.65, 0.95].forEach(function (f) { var s = self.screenOf(m.x, m.y + h * f, m.z); if (!s) return; var d = Math.hypot(s.x - cx, s.y - cy); if (d < bd) { bd = d; best = m; } }); });
  return best;
};
Game.prototype.groundPick = function (cx, cy) {
  var THREE = T(); var rect = this.renderer.domElement.getBoundingClientRect(); var o = this.camera.position.clone();
  var dir = new THREE.Vector3((cx - rect.left) / rect.width * 2 - 1, -(cy - rect.top) / rect.height * 2 + 1, 0.5).unproject(this.camera).sub(o).normalize();
  var t = 0.5; for (var i = 0; i < 260; i++) { var x = o.x + dir.x * t, y = o.y + dir.y * t, z = o.z + dir.z * t; var g = this.terrain.groundAt(x, z); if (y <= g) { var t0 = t - (0.2 + t * 0.015); for (var k = 0; k < 6; k++) { var tm = (t0 + t) / 2; var ym = o.y + dir.y * tm, xm = o.x + dir.x * tm, zm = o.z + dir.z * tm; if (ym <= this.terrain.groundAt(xm, zm)) t = tm; else t0 = tm; } return { x: o.x + dir.x * t, z: o.z + dir.z * t }; } t += 0.2 + t * 0.015; if (t > 160) break; }
  return null;
};
Game.prototype.clickPick = function (cx, cy, touch) {
  if (this.tgt && SC.click(this, cx, cy, touch)) return;
  var best = this.pickAt(cx, cy, touch ? 64 : 48, !this.battle);
  if (best && best.npc) { if (Math.hypot(best.x - this.pos.x, best.z - this.pos.z) < 6) this.bridge.onNpc && this.bridge.onNpc(this.npcCard(best.npc)); else { this.autoMove = { x: best.x, z: best.z, stop: 2.2 }; this.toast(best.npc.name + " — walking over.", "info"); } return; }
  if (best) {
    var m = best;
    if (this.battle) { if (!C.ready(this)) { this.target = m; return; } if (touch && this.target !== m) { this.target = m; this.hover = { m: m, touch: true }; return; } this.target = m; this.hover = null; this.attack(); return; }
    if (this.target === m) this.attack(); else { this.target = m; this.hover = { m: m, touch: !!touch }; }
    return;
  }
  var gp = this.groundPick(cx, cy); if (!gp) return;
  if (this.battle) {
    if (!C.ready(this)) return;
    if (touch) { var pv = this.hover && this.hover.ground; if (!pv || Math.hypot(pv.x - gp.x, pv.z - gp.z) > 1.4) { this.hover = { ground: gp, touch: true }; return; } }
    this.autoMove = { x: gp.x, z: gp.z, stop: 0 }; this.hover = null; return;
  }
  if (Math.hypot(gp.x - this.pos.x, gp.z - this.pos.z) < 120) { this.autoMove = { x: gp.x, z: gp.z, stop: 0 }; this.hover = null; }
};
Game.prototype.updateHover = function () {
  if (this.tgt) { if (this.mouse && !this.tgt.touch) SC.hover(this, this.mouse.x, this.mouse.y); return; }
  if (this.hover && this.hover.touch) { if (this.hover.m && this.hover.m.dead) this.hover = null; return; }
  if (!this.mouse) return; var mm = this.mouse;
  var m = this.pickAt(mm.x, mm.y, 42, false);
  if (m) { this.hover = { m: m, sx: mm.x, sy: mm.y }; return; }
  if (this.battle && C.ready(this)) { var gp = this.groundPick(mm.x, mm.y); this.hover = gp ? { ground: gp, sx: mm.x, sy: mm.y } : null; return; }
  this.hover = null;
};
Game.prototype.jump = function () { if (this.grounded && !this.down) { this.vy = 7.5; this.grounded = false; } };
Game.prototype.setMove = function (x, y) { this.move.x = x; this.move.y = y; };

// ------------------------------------------------------------------ collision
Game.prototype.collide = function (x, z, rad, only) {
  var list = only ? [only] : Object.values(this.settlements);
  for (var i = 0; i < list.length; i++) { var s = list[i]; if (Math.hypot(s.center.x - x, s.center.z - z) > s.radius + 30) continue;
    for (var j = 0; j < s.colliders.length; j++) { var c = s.colliders[j]; var dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + rad; if (d >= m) continue;
      if (c.box) { // oriented rectangle (a building's real footprint): push out along the axis of least penetration
        var cs = Math.cos(c.box.rot), sn = Math.sin(c.box.rot); var lx = dx * cs - dz * sn, lz = dx * sn + dz * cs; var px = c.box.hw + rad - Math.abs(lx), pz = c.box.hd + rad - Math.abs(lz);
        if (px > 0 && pz > 0) { if (px < pz) lx += (lx >= 0 ? 1 : -1) * px; else lz += (lz >= 0 ? 1 : -1) * pz; x = c.x + lx * cs + lz * sn; z = c.z - lx * sn + lz * cs; }
      } else if (d > 1e-4) { x = c.x + dx / d * m; z = c.z + dz / d * m; } }
    for (var j = 0; j < s.segs.length; j++) { var g = s.segs[j]; var vx = g.x2 - g.x1, vz = g.z2 - g.z1, L2 = vx * vx + vz * vz; var t = Math.max(0, Math.min(1, ((x - g.x1) * vx + (z - g.z1) * vz) / L2)); var qx = g.x1 + vx * t, qz = g.z1 + vz * t; var dx = x - qx, dz = z - qz, d = Math.hypot(dx, dz), m = 1.4 + rad; if (d < m && d > 1e-4) { x = qx + dx / d * m; z = qz + dz / d * m; } }
  }
  return this.railClamp(x, z, rad);
};
// Bridge rails: on a deck that stands clear of the ground, keep the walker between the rails. Near the ends, where the deck
// is level with the bank, there is no rail to stop anyone.
Game.prototype.railClamp = function (x, z, rad) {
  var dk = this.terrain.deckAt(x, z, this.pos.y); if (!dk || dk.t < 0.04 || dk.t > 0.96) return { x: x, z: z };
  var lim = dk.b.w / 2 - 0.5 - rad; if (Math.abs(dk.lat) <= lim) return { x: x, z: z };
  var L = Math.hypot(dk.b.x2 - dk.b.x1, dk.b.z2 - dk.b.z1), vx = -(dk.b.z2 - dk.b.z1) / L, vz = (dk.b.x2 - dk.b.x1) / L; var over = dk.lat - (dk.lat > 0 ? lim : -lim);
  return { x: x - vx * over, z: z - vz * over };
};

// ------------------------------------------------------------------ frame
Game.prototype.frame = function (dt) {
  this.time += Math.max(dt, this.wall || 0); /* cooldowns and timers follow the wall clock even on slow devices */ var THREE = T(); var self = this;
  // a few frames of hit-stop on heavy impacts make blows land
  this.adt = dt; if (this.hitStop > 0) { this.hitStop -= dt; this.adt = dt * 0.12; }
  var b = this.battle;
  // movement: keys / stick, or a clicked destination (exploration and your turn alike)
  var kx = (this.keys.d || this.keys.arrowright ? 1 : 0) - (this.keys.a || this.keys.arrowleft ? 1 : 0), ky = (this.keys.w || this.keys.arrowup ? 1 : 0) - (this.keys.s || this.keys.arrowdown ? 1 : 0);
  var mx = kx + this.move.x, my = ky + this.move.y; var ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; ml = 1; }
  var speed = 0; var talkingLock = !!this.talking; var mine = b && C.myTurn(this);
  var free = !this.down && !talkingLock && (!b || (mine && !C.busy(this)));
  var a = null, mag = 0, run = false, left = 1e9;
  if (free && ml > 0.05) { a = this.camYaw + Math.PI - Math.atan2(mx, my); mag = ml; run = !b && (this.running || ml > 0.95 && this.move.run); if (this.autoMove && !this.autoMove.script) this.autoMove = null; }
  else if (this.autoMove && !this.down && !talkingLock && (!b || mine)) { var am = this.autoMove; var adx = am.x - this.pos.x, adz = am.z - this.pos.z; left = Math.hypot(adx, adz) - (am.stop || 0); if (left < 0.12 || (b && b.econ.move < 0.02)) this.autoMove = null; else { a = Math.atan2(adx, adz); mag = 1; run = !b && left > 10; } }
  if (a !== null) {
    var exhausted = this.stats.sp <= 0; var enc = this.v.encumbrance === "Overloaded" ? 0.5 : this.v.encumbrance === "Heavily Encumbered" ? 0.7 : 1;
    var sp = (b ? 4.6 : (run && !exhausted ? 13 : 7.2) * enc) * mag; var stepLen = Math.min(sp * dt, left); if (b) stepLen = Math.min(stepLen, b.econ.move);
    if (stepLen > 0.0005) {
      var vx = Math.sin(a), vz = Math.cos(a); var nx = this.pos.x + vx * stepLen, nz = this.pos.z + vz * stepLen; var gh = this.terrain.groundAt(nx, nz, this.pos.y);
      var climb = (gh - this.pos.y) / Math.max(0.001, stepLen);
      if (gh > -1.3 && climb < 1.9) { var c = this.collide(nx, nz, 0.45); var ox = this.pos.x, oz = this.pos.z; var dist = Math.hypot(c.x - ox, c.z - oz); this.pos.x = c.x; this.pos.z = c.z; speed = sp;
        if (b) C.afterPlayerStep(this, ox, oz, dist); else { this.walked += dist / MILE; this.clock += dist / MILE * 20; }
        if (this.autoMove && dist < stepLen * 0.15) { this.stuckT = (this.stuckT || 0) + dt; if (this.stuckT > 0.4) { this.autoMove = null; this.stuckT = 0; } } else this.stuckT = 0; }
      else { this.autoMove = null; if (gh <= -1.3 && (!this.waterWarned || this.time - this.waterWarned > 4)) { this.waterWarned = this.time; this.toast("Deep water — you need a boat or a ferry to cross.", "info"); } }
    }
    this.yaw = lerpAngle(this.yaw, a, dt * 10);
    if (run && !exhausted) { this.sprintT = (this.sprintT || 0) + dt; if (this.sprintT > 4) { this.sprintT = 0; this.stats.sp = Math.max(0, this.stats.sp - 1); this.writeStats(); } }
  }
  if (this.dash && this.dash.t > 0) { var c2 = this.collide(this.pos.x + this.dash.vx * dt, this.pos.z + this.dash.vz * dt, 0.45); if (this.terrain.groundAt(c2.x, c2.z) > -1.3) { this.pos.x = c2.x; this.pos.z = c2.z; } this.dash.t -= dt; }
  if (this.target && !this.target.dead && this.inCombat && a === null) this.yaw = lerpAngle(this.yaw, Math.atan2(this.target.x - this.pos.x, this.target.z - this.pos.z), dt * 6);
  // gravity
  var ground = this.terrain.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.6); this.vy -= 22 * dt; this.pos.y += this.vy * dt; if (this.pos.y <= ground) { this.pos.y = ground; this.vy = 0; this.grounded = true; }
  // idle time: half a game minute per real second out of combat; in combat each round is six seconds
  if (!b) this.clock += Math.max(dt, this.wall || 0) * 0.5;
  // stamina & mana trickle back out of combat
  this.regenT = (this.regenT || 0) + Math.max(dt, this.wall || 0); if (this.regenT > 3) { this.regenT = 0; if (!this.inCombat && !this.down) { var ch = false; if (this.stats.sp < this.stats.maxSp && !this.running) { this.stats.sp += 1; ch = true; } this.manaT = (this.manaT || 0) + 1; if (this.manaT >= 7 && this.stats.mp < this.stats.maxMp) { this.manaT = 0; this.stats.mp += 1; ch = true; } if (ch) this.writeStats(); } }
  // turn-based encounter
  C.update(this, dt); b = this.battle;
  // player pose
  var P = this.player; P.root.position.set(this.pos.x, this.pos.y, this.pos.z); P.root.rotation.y = this.yaw;
  animateHumanoid(P, this.adt, { speed: speed / 7.2, dead: this.down, combat: this.inCombat });
  if (P.head.userData.hood) P.head.userData.hood.visible = /rain|snow|storm|ash/.test(String(this.v.weather).toLowerCase());
  // camera: orbit a focus point that glides to whoever is acting
  var fx = this.pos.x, fy = this.pos.y + 1.95, fz = this.pos.z;
  if (b) { fy = this.pos.y + 1.4; var act = b.active && b.active.m && !b.active.m.dead ? b.active.m : null; if (act) { fx = act.x * 0.6 + this.pos.x * 0.4; fy = act.y * 0.6 + this.pos.y * 0.4 + 1.3; fz = act.z * 0.6 + this.pos.z * 0.4; } }
  if (!this.camF) this.camF = new THREE.Vector3(fx, fy, fz); var kf = 1 - Math.exp(-dt * (b ? 3.2 : 14)); this.camF.x += (fx - this.camF.x) * kf; this.camF.y += (fy - this.camF.y) * kf; this.camF.z += (fz - this.camF.z) * kf;
  var head = this.camF;
  var cd = this.camDist; var cx = head.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * cd, cz = head.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * cd, cy = head.y + Math.sin(this.camPitch) * cd;
  var cg = this.terrain.groundAt(cx, cz) + 0.6; if (cy < cg) cy = cg;
  var side = b ? 0 : 0.55; cx += Math.cos(this.camYaw) * side; cz -= Math.sin(this.camYaw) * side;
  this.camera.position.set(cx, cy, cz); this.camera.lookAt(head.x + Math.cos(this.camYaw) * side, head.y + (b ? 0 : 0.35), head.z - Math.sin(this.camYaw) * side);
  if (this.hurtFlash > 0) this.hurtFlash -= dt;
  // world systems
  this.terrain.update(this.pos.x, this.pos.z, dt > 0.05 ? Math.max(this.q.genBudget, 14) : this.q.genBudget);
  this.loadT = (this.loadT || 0) + dt; if (this.loadT > 0.7) { this.loadT = 0; this.loadSettlements(false); this.spawnMonsters(); this.revealAround(false); this.checkPlace(); this.syncAllies(false); }
  for (var id in this.settlements) { var s = this.settlements[id]; var d = Math.hypot(s.center.x - this.pos.x, s.center.z - this.pos.z); if (d < s.radius + 140) this.populate(s); s.labels.forEach(function (l) { l.visible = Math.hypot(l.position.x - self.pos.x, l.position.z - self.pos.z) < 40; }); }
  this.updateNPCs(dt); this.updateMonsters(dt); this.updateAllies(dt); this.updateProjectiles(dt); this.updateFloaters(dt);
  if (this.inCombat && !this.battle) { this.calmT = (this.calmT || 0) + dt; if (this.calmT > 1) { this.calmT = 0; this.closeCombat(true); } } else this.calmT = 0;
  if (this.orb) { this.orb.position.set(this.pos.x + Math.sin(this.time) * 0.6, this.pos.y + 2.6, this.pos.z + Math.cos(this.time) * 0.6); if (this.time > this.orbUntil) { this.scene.remove(this.orb); this.orb = null; } }
  // hover previews, ground markers, weapon trails and particles
  this.hoverT = (this.hoverT || 0) + dt; if (this.hoverT > 0.06) { this.hoverT = 0; this.updateHover(); }
  C.drawMarkers(this);
  this.fx.trail(P, "#dfe8ff"); if (b) b.order.forEach(function (c2) { if (c2.m && c2.m.c.parts.h) self.fx.trail(c2.m.c.parts.h, "#ffd8b0"); });
  this.fx.update(dt, this.camera);
  // environment
  var x = this.pos.x / MILE, y = -this.pos.z / MILE; var region = realmAt(x, y); var minutes = ((this.clock % 1440) + 1440) % 1440;
  this.envState = this.env.update(dt, this.pos, minutes, this.v.weather, region);
  this.envT = (this.envT || 99) + dt; if (this.envT > 20) { this.envT = 0; try { var U = this.env.uniforms; var old = this.envRT; this.envRT = makeEnvironment(this.renderer, U.top.value.clone().multiplyScalar(0.8).getHex(), U.horizon.value.clone().multiplyScalar(0.85).getHex(), U.ground.value.clone().multiplyScalar(0.6).getHex()); this.scene.environment = this.envRT.texture; if (old) old.dispose(); } catch (e) { } }
  var night = this.envState.night; for (var id2 in this.settlements) { var s2 = this.settlements[id2]; s2.winMat.emissiveIntensity = night * 1.6; s2.lampMat.emissiveIntensity = 0.2 + night * 2.4; }
  // interaction prompt
  this.interact = this.down || b ? null : this.findInteract();
  // persistence cadence
  this.writeClock(false); this.writePosition(false);
  if (this.dirtyFog && (!this.fogWriteT || this.time - this.fogWriteT > 12)) { this.fogWriteT = this.time; this.dirtyFog = false; this.write3d(); }
  var now = performance.now(); if ((this.flushAt && now > this.flushAt) || now - this.lastFlush > 5000) { this.flushAt = 0; if (Object.keys(this.dirty).length) this.flush(); else this.lastFlush = now; }
  if (this.q.shadows) { this.shadowN = ((this.shadowN || 0) + 1) % (this.q.shadowEvery || 1); this.renderer.shadowMap.autoUpdate = false; if (!this.shadowN) this.renderer.shadowMap.needsUpdate = true; }
  this.camera.updateMatrixWorld(); if (this._fr) { this._pm.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse); this._fr.setFromProjectionMatrix(this._pm); this._frOk = true; }
  this.renderer.render(this.scene, this.camera);
  // minimap + HUD snapshot
  if (this.minimap) this.drawMinimap();
  this.hudT += dt; if (this.hudT > 0.1) { this.hudT = 0; this.bridge.onHud && this.bridge.onHud(this.snapshot()); }
};
Game.prototype.checkPlace = function () {
  var self = this;
  var x = this.pos.x / MILE, y = -this.pos.z / MILE; var p = insidePlace(x, y); var id = p ? p.id : null;
  if (id !== this.lastPlace) { if (p) { this.toast("Entering " + p.name, "info"); if (this.walked > 0.4) this.log("Arrived at " + p.name + " after walking about " + this.walked.toFixed(1) + " miles" + (this.walkFrom ? " from " + this.walkFrom.location : "") + "."); this.walked = 0; this.walkFrom = describe(x, y); } else if (this.lastPlace) { var lp = PLACE_BY_ID[this.lastPlace]; this.log("Left " + (lp ? lp.name : "town") + "."); this.walkFrom = { location: lp ? lp.name : "town" }; this.walked = 0; } this.lastPlace = id; this.subOverride = null; this.writePosition(true); }
  // district from the built layout (more exact than the gazetteer ring)
  if (p && this.settlements[p.id]) { var s = this.settlements[p.id]; var best = null, bd = 30; s.spots.forEach(function (q) { var d = Math.hypot(q.x - self.pos.x, q.z - self.pos.z); if (d < bd) { bd = d; best = q; } }); var sub = best ? best.name : null; if (sub && sub !== this.subOverride && !this.talking) { this.subOverride = sub; this.writePosition(true); } }
};
Game.prototype.hoverInfo = function () {
  var h = this.hover; if (!h || this.tgt) return null; var b = this.battle;
  if (h.m && !h.m.dead) { var m = h.m; var pv = C.preview(this, m); var sc = h.touch || h.sx == null ? this.screenOf(m.x, m.y + (m.c.height || 1.6) * 1.05, m.z) : { x: h.sx, y: h.sy }; return Object.assign({ kind: "foe", name: m.mon.name + (m.tag || ""), hp: Math.max(0, Math.round(m.hp)), maxHp: m.maxHp, threat: m.mon.threat, sx: sc ? sc.x : -999, sy: sc ? sc.y : -999, touch: !!h.touch, my: b ? C.ready(this) : true }, pv); }
  if (h.ground && b) { var d = Math.hypot(h.ground.x - this.pos.x, h.ground.z - this.pos.z); var sc2 = h.touch || h.sx == null ? this.screenOf(h.ground.x, this.terrain.groundAt(h.ground.x, h.ground.z) + 0.3, h.ground.z) : { x: h.sx, y: h.sy }; return { kind: "ground", dist: d, ok: d <= b.econ.move + 0.05, left: b.econ.move, sx: sc2 ? sc2.x : -999, sy: sc2 ? sc2.y : -999, touch: !!h.touch }; }
  return null;
};
Game.prototype.snapshot = function () {
  var self = this; var x = this.pos.x / MILE, y = -this.pos.z / MILE; var d = describe(x, y); var minutes = ((this.clock % 1440) + 1440) % 1440; var day = Math.floor(this.clock / 1440);
  var tg = this.target && !this.target.dead ? { name: this.target.mon.name, hp: Math.max(0, Math.round(this.target.hp)), maxHp: this.target.maxHp, threat: this.target.mon.threat, region: this.target.mon.region, evasion: this.target.mon.evasion, dr: this.target.mon.dr, dist: Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z), weakness: this.read === this.target.mon.name ? this.target.mon.weakness : null } : null;
  var kit = R.CALLING_KIT[this.calling()] || {};
  return { x: x, y: y, heading: this.camYaw, yaw: this.yaw, location: d.location, sub: this.subOverride || d.sublocation, region: d.region, time: formatTime(minutes), date: formatDate(day), tod: timeOfDay(minutes), minutes: minutes,
    hp: Math.round(this.stats.hp), maxHp: this.stats.maxHp, mp: Math.round(this.stats.mp), maxMp: this.stats.maxMp, sp: Math.round(this.stats.sp), maxSp: this.stats.maxSp,
    target: tg, interact: this.interact ? this.interact.label : null, combat: this.inCombat, log: this.combatLog.slice(-6), down: this.down, hotbar: this.hotbar().map(function (s) { if (!s) return null; var cd = self.cooldowns[s.id] || 0; return Object.assign({}, s, { cd: Math.max(0, cd - self.time), tech: undefined, spell: undefined, item: undefined, mp: s.mp }); }),
    res: kit.res ? { name: kit.res, val: this.res, max: kit.max } : null, battle: C.snapshot(this), tgt: SC.snapshot(this), allies: this.allies.map(function (a) { return { name: a.name, hp: Math.max(0, Math.round(a.hp)), maxHp: a.maxHp, mp: Math.round(a.mp), maxMp: a.maxMp, dead: a.dead, role: a.role, conds: B.conditionsText(a), cls: a.sheet.class }; }), pst: B.conditionsText(this.pe), hover: this.hoverInfo(), after: this.after, hurt: this.hurtFlash > 0, fogVersion: this.fogVersion, loading: this.terrain.queue.length, reportCount: this.report.length, talking: this.talking ? this.talking.id : null };
};

// ------------------------------------------------------------------ minimap: rotating, fog-aware, centered on the player
Game.prototype.drawMinimap = function () {
  var cv = this.minimap; var ctx = cv.getContext("2d"); var W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, rad = W / 2 - 2; var self = this;
  var x = this.pos.x, z = this.pos.z; var inTown = insidePlace(x / MILE, -z / MILE); var scale = inTown ? 0.55 : 0.18; // px per world unit
  ctx.save(); ctx.clearRect(0, 0, W, H); ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.clip();
  ctx.translate(cx, cy); ctx.rotate(this.camYaw - Math.PI); // camera forward is up
  // terrain tiles (cached low-res images of mapColor)
  var tileU = 160; var range = rad / scale + tileU; var t0 = Math.floor((x - range) / tileU), t1 = Math.floor((x + range) / tileU), u0 = Math.floor((z - range) / tileU), u1 = Math.floor((z + range) / tileU);
  this.tiles = this.tiles || {}; var built = 0;
  for (var ti = t0; ti <= t1; ti++) for (var ui = u0; ui <= u1; ui++) { var key = ti + "," + ui; var tile = this.tiles[key]; if (!tile && built < 1) { tile = this.tiles[key] = makeTile(ti, ui, tileU); built++; } if (tile) ctx.drawImage(tile, (ti * tileU - x) * scale, (ui * tileU - z) * scale, tileU * scale + 1, tileU * scale + 1); }
  var keys = Object.keys(this.tiles); if (keys.length > 220) keys.slice(0, 60).forEach(function (k) { delete self.tiles[k]; });
  // fog veil
  ctx.fillStyle = "rgba(8,10,14,0.9)"; var fc = FOG_CELL * MILE; var fr = Math.ceil(range / fc);
  for (var a = -fr; a <= fr; a++) for (var b = -fr; b <= fr; b++) { var wx = x + a * fc, wz = z + b * fc; var i = fogIndex(wx / MILE, -wz / MILE); if (i >= 0 && this.fog[i]) continue; var gx0 = Math.floor((wx / MILE + 1250) / FOG_CELL) * FOG_CELL - 1250, gy0 = 900 - Math.floor((900 + wz / MILE) / FOG_CELL) * FOG_CELL; ctx.fillRect((gx0 * MILE - x) * scale, (-gy0 * MILE - z) * scale, fc * scale + 1, fc * scale + 1); }
  // settlement detail: streets, buildings, walls
  for (var id in this.settlements) { var s = this.settlements[id]; if (Math.hypot(s.center.x - x, s.center.z - z) > range + s.radius) continue;
    ctx.strokeStyle = "rgba(200,190,160,0.75)"; s.streets.forEach(function (st) { ctx.lineWidth = Math.max(1.5, st.w * scale); ctx.beginPath(); ctx.moveTo((st.x1 - x) * scale, (st.z1 - z) * scale); ctx.lineTo((st.x2 - x) * scale, (st.z2 - z) * scale); ctx.stroke(); });
    ctx.fillStyle = "rgba(60,52,44,0.9)"; s.colliders.forEach(function (c) { var r2 = c.r * scale; ctx.fillRect((c.x - x) * scale - r2, (c.z - z) * scale - r2, r2 * 2, r2 * 2); });
    ctx.strokeStyle = "rgba(150,140,120,0.9)"; ctx.lineWidth = Math.max(1.5, 2.2 * scale); s.segs.forEach(function (g) { ctx.beginPath(); ctx.moveTo((g.x1 - x) * scale, (g.z1 - z) * scale); ctx.lineTo((g.x2 - x) * scale, (g.z2 - z) * scale); ctx.stroke(); });
    ctx.fillStyle = "#e8c66a"; s.doors.forEach(function (dd) { if (dd.kind === "district" || dd.kind === "gate") return; var px = (dd.x - x) * scale, pz = (dd.z - z) * scale; ctx.save(); ctx.translate(px, pz); ctx.rotate(-(self.camYaw - Math.PI)); ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, 7); ctx.fill(); ctx.restore(); });
  }
  // NPCs and monsters
  this.npcs.forEach(function (n) { var px = (n.x - x) * scale, pz = (n.z - z) * scale; if (px * px + pz * pz > rad * rad) return; ctx.fillStyle = n.named ? "#ffd86a" : "rgba(220,220,220,0.7)"; ctx.beginPath(); ctx.arc(px, pz, n.named ? 2.6 : 1.6, 0, 7); ctx.fill(); });
  this.monsters.forEach(function (m) { if (m.dead) return; var px = (m.x - x) * scale, pz = (m.z - z) * scale; if (px * px + pz * pz > rad * rad) return; ctx.fillStyle = m.aggro ? "#ff4a3a" : "#d07a5a"; ctx.beginPath(); ctx.arc(px, pz, 2.4 + m.mon.threat * 0.4, 0, 7); ctx.fill(); });
  // quest / known location pins (from the GM's known-locations)
  var known = this.v["known-locations"] || {}; Object.keys(known).forEach(function (k) { var L = known[k]; if (!L || L.x == null) return; var px = (L.x * MILE - x) * scale, pz = (-L.y * MILE - z) * scale; var dd = Math.hypot(px, pz); if (dd > rad - 8) { px = px / dd * (rad - 8); pz = pz / dd * (rad - 8); } ctx.save(); ctx.translate(px, pz); ctx.rotate(-(self.camYaw - Math.PI)); ctx.fillStyle = "#c9a85a"; ctx.strokeStyle = "#1a1408"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(3.5, 0); ctx.lineTo(0, 4); ctx.lineTo(-3.5, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); });
  ctx.restore();
  // player arrow (always pointing up = facing relative to camera)
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-(this.yaw - this.camYaw)); ctx.fillStyle = "#9fd0ff"; ctx.strokeStyle = "#0a1a2a"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 6); ctx.lineTo(0, 2.5); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  // vignette ring
  var g = ctx.createRadialGradient(cx, cy, rad * 0.7, cx, cy, rad); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.55)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.fill();
};
function makeTile(ti, ui, size) { var c = document.createElement("canvas"); var N = 24; c.width = N; c.height = N; var ctx = c.getContext("2d"); var img = ctx.createImageData(N, N); var col = [0, 0, 0]; for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) { var wx = ti * size + (i + 0.5) * size / N, wz = ui * size + (j + 0.5) * size / N; mapColor(wx / MILE, -wz / MILE, col, "satellite"); var o = (j * N + i) * 4; img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255; } ctx.putImageData(img, 0, 0); return c; }

Game.prototype.dispose = function () {
  this.disposed = true; cancelAnimationFrame(this.raf); try { this.fx && this.fx.dispose(); } catch (e) { } try { this.flush(); } catch (e) { }
  window.removeEventListener("keydown", this.onKeyDown); window.removeEventListener("keyup", this.onKeyUp); window.removeEventListener("resize", this.onResize); if (this.ro) this.ro.disconnect();
  if (this.renderer) { this.terrain.disposeAll(); for (var id in this.settlements) this.unloadSettlement(id); this.renderer.dispose(); this.renderer.forceContextLoss && this.renderer.forceContextLoss(); if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement); }
};
