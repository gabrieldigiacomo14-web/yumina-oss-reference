// @ts-nocheck
// The real-time layer. The 3D client owns moment-to-moment play (walking, fighting,
// harvesting, discovering) and writes the results into the same variables the AI
// Game Master reads. Conversation, trade, quests and anything social go to the GM.
import { T, glowTex, textSprite } from "./three";
import { MILE, heightAt, landSD, describe, insidePlace, PLACES, PLACE_BY_ID, nearestPlace, biomeAt, realmAt, roadAt, riverAt, hash2, hashStr, rng, placesNear, districtsOf, wildNameAt, mapColor } from "./worldgen";
import { Terrain, Environment, CH } from "./terrain";
import { buildSettlement, styleOf } from "./settlements";
import { makeHumanoid, animateHumanoid, playAction, makeCreature, animateCreature, CALLING_LOOK, SKIN_TONES, HAIR_COLORS, HAIR_STYLES } from "./models";
import { AURELIA_PEOPLE, TRAINERS } from "./data";
import * as R from "./rules";

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
  this.interact = null; this.talking = null; this.inCombat = false; this.combatSummary = null; this.time = 0; this.disposed = false; this.v = {};
}

Game.prototype.start = function (v) {
  var THREE = T(); var self = this; this.v = v || {};
  var r = new THREE.WebGLRenderer({ antialias: this.q.aa, powerPreference: "high-performance" });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.pixelRatio)); r.setSize(this.container.clientWidth, this.container.clientHeight);
  if (THREE.sRGBEncoding) r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = this.q.shadows; r.shadowMap.type = THREE.PCFSoftShadowMap;
  this.container.appendChild(r.domElement); r.domElement.style.display = "block"; r.domElement.style.touchAction = "none";
  this.renderer = r; this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(58, this.container.clientWidth / this.container.clientHeight, 0.2, this.q.far + 600);
  this.env = new Environment(this.scene, r, this.q); this.terrain = new Terrain(this.scene, { radius: this.q.radius }); this.terrain.seaMat = this.env.sea.material;
  // player
  this.buildPlayer(v);
  this.adoptState(v, true);
  // pre-warm the area around the player so they never spawn over a hole
  this.terrain.warm(this.pos.x, this.pos.z, 1);
  this.pos.y = this.terrain.groundAt(this.pos.x, this.pos.z);
  this.loadSettlements(true);
  this.bindInput();
  this.onResize = function () { if (!self.renderer) return; var w = self.container.clientWidth, h = self.container.clientHeight; self.renderer.setSize(w, h); self.camera.aspect = w / h; self.camera.updateProjectionMatrix(); };
  window.addEventListener("resize", this.onResize);
  this.ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(this.onResize) : null; if (this.ro) this.ro.observe(this.container);
  this.last = performance.now();
  var loop = function () { if (self.disposed) return; self.raf = requestAnimationFrame(loop); var now = performance.now(); var raw = (now - self.last) / 1000; var dt = Math.min(0.1, raw); self.last = now; self.wall = Math.min(1, raw); try { self.frame(dt); } catch (e) { if (!self.errShown) { self.errShown = true; console.error(e); self.bridge.toast && self.bridge.toast("3D error: " + e.message, "error"); } } };
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

// ------------------------------------------------------------------ state sync
function num(x, d) { var n = Number(x); return isFinite(n) ? n : d; }
Game.prototype.adoptState = function (v, initial) {
  var x = num(v["player-x"], 0), y = num(v["player-y"], 0);
  this.pos.x = x * MILE; this.pos.z = -y * MILE;
  // never stand in the sea or a building: step toward the settlement plaza edge if needed
  var p = insidePlace(x, y); if (p) { var d = Math.hypot(x - p.x, y - p.y); if (d < 0.05) { this.pos.x = p.x * MILE + 18; this.pos.z = -p.y * MILE + 30; } }
  if (landSD(this.pos.x / MILE, -this.pos.z / MILE) < 0) { var np = nearestPlace(x, y); if (np) { this.pos.x = np.place.x * MILE + 20; this.pos.z = -np.place.y * MILE + 20; } }
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
  var look = Object.assign({}, v["player-avatar"] || {}); look.calling = look.calling || v["starting-calling"] || "Fighter"; var wp = R.weaponProfile(v); look.weapon = wp.kind; if (R.hasShield(v)) look.shield = true; look.species = v["player-species"] || look.species; look.gender = v["player-gender"] || look.gender;
  if (JSON.stringify(look) !== this.playerLookKey) { var p0 = this.player.root.position.clone(), rot = this.player.root.rotation.y; this.buildPlayer(v); this.player.root.position.copy(p0); this.player.root.rotation.y = rot; }
  function near(a, b) { return Math.abs(a - b) < 0.6; }
};
// Our latest value for a variable while our write is still in flight, else the shared state.
Game.prototype.cur = function (id) { if (this.pendingAt[id] && performance.now() - this.pendingAt[id] < 8000 && this.lastSynced[id] !== undefined) return this.lastSynced[id]; return this.v[id]; };
Game.prototype.remember = function (id, oldVal) { var now = performance.now(); var h = (this.echo[id] = (this.echo[id] || []).filter(function (e) { return now - e.t < 9000; })); h.push({ v: oldVal, t: now }); if (h.length > 40) h.shift(); };
Game.prototype.write = function (id, value) { this.remember(id, this.lastSynced[id]); this.prevSynced[id] = this.lastSynced[id]; this.lastSynced[id] = value; this.pendingAt[id] = performance.now(); this.dirty[id] = value; };
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
  var s = this.stats; var hp = Math.max(0, Math.round(s.hp)), mp = Math.max(0, Math.round(s.mp)), sp = Math.max(0, Math.round(s.sp));
  if (hp !== this.lastSynced["player-hp"]) this.write("player-hp", hp); if (mp !== this.lastSynced["player-mana"]) this.write("player-mana", mp); if (sp !== this.lastSynced["player-stamina"]) this.write("player-stamina", sp);
};
Game.prototype.write3d = function () { this.dirty["world3d-state"] = { v: 1, fog: fogEncode(this.fog), slain: this.pruneSlain() }; };
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
    if (!have && d < p.r * MILE + this.q.townRange && (sync || built < 1)) { var s = buildSettlement(p); this.scene.add(s.group); this.settlements[p.id] = s; s.bridges.forEach(function (b) { this.terrain.bridges.push(b); }, this); built++; }
    else if (have && d > p.r * MILE + this.q.townRange + 500) { this.unloadSettlement(p.id); }
  }
};
Game.prototype.unloadSettlement = function (id) {
  var s = this.settlements[id]; if (!s) return; this.scene.remove(s.group); s.group.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map && o.isSprite) { o.material.map.dispose(); o.material.dispose(); } });
  this.terrain.bridges = this.terrain.bridges.filter(function (b) { return s.bridges.indexOf(b) < 0; }); delete this.settlements[id];
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
    var h = makeHumanoid(look); var spot = null;
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
    var d = Math.hypot(n.x - px, n.z - pz); var vis = d < 160; n.h.root.visible = vis; if (!vis) return;
    if (n.label) { n.label.visible = d < 28; n.label2.visible = d < 18; }
    var speed = 0;
    if (self.talking === n) { n.yaw = lerpAngle(n.yaw, Math.atan2(px - n.x, pz - n.z), dt * 6); if (!n.h.action) playAction(n.h, "talk"); }
    else if (n.wander) {
      if (!n.goal) { n.wait -= dt; if (n.wait < 0) { var s = n.s; var cand = s.spots.concat(s.plazas.map(function (pl) { return { x: pl.x + (Math.random() - 0.5) * pl.r, z: pl.z + (Math.random() - 0.5) * pl.r }; })); var g = cand[Math.floor(Math.random() * cand.length)]; if (g) n.goal = { x: g.x + (Math.random() - 0.5) * 6, z: g.z + (Math.random() - 0.5) * 6 }; } }
      else { var gx = n.goal.x - n.x, gz = n.goal.z - n.z, gd = Math.hypot(gx, gz); if (gd < 1.2) { n.goal = null; n.wait = 3 + Math.random() * 8; } else { speed = 1.6; var dirx = gx / gd, dirz = gz / gd; var nx = n.x + dirx * speed * dt, nz = n.z + dirz * speed * dt; var pushed = self.collide(nx, nz, 0.4, n.s); if (Math.hypot(pushed.x - nx, pushed.z - nz) > 0.01) { n.stuck = (n.stuck || 0) + dt; if (n.stuck > 1.5) { n.goal = null; n.stuck = 0; n.wait = 1; } } n.x = pushed.x; n.z = pushed.z; n.yaw = lerpAngle(n.yaw, Math.atan2(dirx, dirz), dt * 5); } }
    } else if (d < 6 && !n.guard) n.yaw = lerpAngle(n.yaw, Math.atan2(px - n.x, pz - n.z), dt * 2);
    n.y = self.terrain.groundAt(n.x, n.z); n.h.root.position.set(n.x, n.y, n.z); n.h.root.rotation.y = n.yaw;
    if (d < 70) animateHumanoid(n.h, dt, { speed: speed / 1.6 * 0.55, crossArms: n.guard || /Captain|Commander/.test(n.title) });
  });
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
  var m = { mon: mon, c: c, hp: mon.hp, maxHp: mon.hp, x: x, z: z, y: y, yaw: Math.random() * 6.28, home: { x: x, z: z }, cell: cell, state: "idle", t: Math.random() * 4, atkCD: 1 + Math.random(), passive: passive, flees: /flee|retreat/.test(tac), ranged: ranged, aggro: false, dead: false, speed: c.arch === "canine" ? 9.5 : c.arch === "brute" ? 5.2 : c.arch === "wisp" ? 6 : 7, reach: 1.6 + c.size * 0.55, id: Math.random().toString(36).slice(2) };
  this.monsters.push(m);
};
Game.prototype.updateMonsters = function (dt) {
  var self = this, px = this.pos.x, pz = this.pos.z, alive = 0;
  this.monsters = this.monsters.filter(function (m) {
    var d = Math.hypot(m.x - px, m.z - pz);
    if (d > 420 && !m.aggro) { self.scene.remove(m.c.root); delete self.spawnedCells[m.cell]; if (self.target === m) self.target = null; return false; }
    if (m.dead) { m.deadT = (m.deadT || 0) + dt; animateCreature(m.c, dt, { dead: true }); if (m.deadT > 240 || (d > 300)) { self.scene.remove(m.c.root); return false; } return true; }
    alive++;
    var speed = 0; m.atkCD -= dt;
    var ag = !m.passive && d < 13 + m.mon.threat * 3 && !self.down && !self.dead;
    if (ag && !m.aggro) { m.aggro = true; self.onAggro(m); }
    if (m.aggro && (self.down || Math.hypot(m.x - m.home.x, m.z - m.home.z) > 160)) { m.aggro = false; m.state = "return"; }
    var fleeing = m.aggro && m.flees && m.hp < m.maxHp * 0.25;
    if (m.aggro) {
      var dirx = (px - m.x) / (d || 1), dirz = (pz - m.z) / (d || 1);
      if (fleeing) { m.yaw = lerpAngle(m.yaw, Math.atan2(-dirx, -dirz), dt * 6); speed = m.speed * 1.1; if (d > 70) { m.aggro = false; m.fled = true; self.combatNote("fled", m); } }
      else {
        m.yaw = lerpAngle(m.yaw, Math.atan2(dirx, dirz), dt * 8);
        var rangeOk = m.ranged && d > m.reach + 3 && d < 20;
        if (d > m.reach + 0.8 && !rangeOk) speed = m.speed; else if (m.atkCD <= 0) { m.atkCD = 2.0 + Math.random() * 0.6; self.monsterStrike(m, rangeOk); }
      }
    } else if (m.state === "return") { var hx = m.home.x - m.x, hz = m.home.z - m.z, hd = Math.hypot(hx, hz); if (hd < 3) m.state = "idle"; else { speed = m.speed * 0.6; m.yaw = lerpAngle(m.yaw, Math.atan2(hx, hz), dt * 4); if (m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + dt * 2); } }
    else { m.t -= dt; if (m.t < 0) { m.t = 3 + Math.random() * 6; m.wanderYaw = Math.random() * 6.28; m.wandering = Math.random() < 0.5; } if (m.wandering) { speed = m.speed * 0.25; m.yaw = lerpAngle(m.yaw, m.wanderYaw, dt * 2); if (Math.hypot(m.x - m.home.x, m.z - m.home.z) > 40) m.wanderYaw = Math.atan2(m.home.x - m.x, m.home.z - m.z); } }
    if (speed) { var nx = m.x + Math.sin(m.yaw) * speed * dt, nz = m.z + Math.cos(m.yaw) * speed * dt; if (landSD(nx / MILE, -nz / MILE) > 0.02 && !insideTown(nx, nz)) { m.x = nx; m.z = nz; } else if (m.aggro) { m.aggro = false; m.state = "return"; } }
    m.y = self.terrain.groundAt(m.x, m.z) + (m.c.arch === "wisp" ? 0.2 : 0); m.c.root.position.set(m.x, m.y, m.z); m.c.root.rotation.y = m.yaw;
    if (m.hitT > 0) { m.hitT -= dt; var k = 1 + m.hitT * 0.4; m.c.root.scale.set(k, 1 / k, k); } else m.c.root.scale.set(1, 1, 1);
    if (d < 180) animateCreature(m.c, dt, { speed: speed / 6, attack: m.attackT > 0, attackT: 0.4 - (m.attackT || 0), combat: m.aggro });
    if (m.attackT > 0) m.attackT -= dt;
    return true;
  });
  function insideTown(x, z) { var p = insidePlace(x / MILE, -z / MILE); return p && !/ruin|dungeon|landmark|shrine|tower|camp/.test(p.kind); }
};
Game.prototype.onAggro = function (m) {
  if (!this.inCombat) { this.inCombat = true; this.combatSummary = { foes: {}, killed: {}, fled: {}, dmgTaken: 0, dmgDealt: 0, xp: 0, start: describe(this.pos.x / MILE, -this.pos.z / MILE).location, rolls: [] }; this.encounterUsed = {}; var kit = R.CALLING_KIT[this.calling()]; this.res = kit && kit.start ? kit.start : 0; this.bridge.combatMusic && this.bridge.combatMusic(true, m.mon.threat >= 4); this.bridge.sfx && this.bridge.sfx(/wolf|hound|jackal/i.test(m.mon.name) ? "sfx-wolf-growl" : "sfx-monster-growl"); }
  this.combatSummary.foes[m.mon.name] = (this.combatSummary.foes[m.mon.name] || 0) + 1;
  if (!this.target || this.target.dead) this.target = m;
};
Game.prototype.combatNote = function (kind, m) { if (!this.combatSummary) return; var o = this.combatSummary[kind]; o[m.mon.name] = (o[m.mon.name] || 0) + 1; };
Game.prototype.closeCombat = function (force) {
  if (!this.inCombat) return; var anyAggro = this.monsters.some(function (m) { return m.aggro && !m.dead; });
  if (anyAggro && !force) return; var cs = this.combatSummary; this.inCombat = false; this.bridge.combatMusic && this.bridge.combatMusic(false);
  if (!cs) return; function list(o) { return Object.keys(o).map(function (k) { return o[k] + "× " + k; }).join(", "); }
  var line = "Fought " + list(cs.foes) + " near " + cs.start + "." + (Object.keys(cs.killed).length ? " Killed " + list(cs.killed) + "." : "") + (Object.keys(cs.fled).length ? " Fled: " + list(cs.fled) + "." : "") + " Took " + cs.dmgTaken + " damage (now " + Math.round(this.stats.hp) + "/" + this.stats.maxHp + " HP)." + (cs.xp ? " +" + cs.xp + " XP awarded." : "") + (cs.rolls.length ? " Key rolls: " + cs.rolls.slice(-3).join(" ") : "");
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
  var s = this.hotbar()[slot]; if (!s || s.disabled) { if (s && s.why) this.toast(s.why, "info"); return; }
  if (this.cooldowns[s.id] > this.time) return;
  if (s.kind === "attack") this.attack(); else if (s.kind === "spell") this.castSpell(s.spell); else if (s.kind === "tech") this.technique(s.tech); else if (s.kind === "item") this.useItem(s.item); else if (s.kind === "dodge") this.dodge(); else if (s.kind === "interact") this.doInteract();
};
Game.prototype.faceTarget = function (m) { this.yaw = Math.atan2(m.x - this.pos.x, m.z - this.pos.z); };
Game.prototype.attack = function (opts) {
  opts = opts || {}; var w = R.weaponProfile(this.v); var m = this.target && !this.target.dead ? this.target : this.pickTarget();
  if (!m) { playAction(this.player, w.ranged ? "shoot" : "attack"); this.cooldowns.attack = this.time + w.cooldown; return; }
  this.target = m; var d = Math.hypot(m.x - this.pos.x, m.z - this.pos.z);
  if (d > w.range + m.reach) { if (!w.ranged) { this.toast("Too far — close the distance.", "info"); return; } }
  this.faceTarget(m); playAction(this.player, w.ranged ? "shoot" : "attack"); this.cooldowns.attack = this.time + w.cooldown; this.bridge.sfx && !w.ranged && this.bridge.sfx("sfx-sword-swing");
  if (!m.aggro && !m.dead) { m.aggro = true; this.onAggro(m); }
  var self = this; var kit = R.CALLING_KIT[this.calling()] || {};
  var bonus = (this.buffs.blessing > this.time ? 1 : 0) + (this.quarry === m ? 1 : 0) + (this.read === m.mon.name ? 1 : 0) + (opts.bonus || 0) + (this.nextBonus || 0); this.nextBonus = 0;
  var extra = opts.extra || 0; if (this.calling() === "Rogue" && m.aggro && !m.targetingPlayer) extra += R.d(6);
  var res = R.playerAttack(this.v, m.mon, { bonus: bonus, bonusLabel: "situational", extraDamage: extra, condPenalty: this.conditionPenalty() });
  var apply = function () { self.resolveHit(m, res, w.skill); if (res.hit && kit.build === "hit") self.res = Math.min(kit.max, self.res + 1); };
  if (w.ranged) this.projectile(m, "arrow", apply); else setTimeout(apply, 220);
  if (this.quarry === m) this.quarry = null;
};
Game.prototype.resolveHit = function (m, res, skill) {
  this.pushLog(res.line, res.hit ? "hit" : "miss"); if (this.combatSummary && res.crit) this.combatSummary.rolls.push(res.line);
  if (!res.hit) { this.floater(m, "Miss", "#c8c8c8"); return; }
  m.hp -= res.damage; m.hitT = 0.25; this.floater(m, String(res.damage), res.crit ? "#ffd04a" : "#ffffff"); if (this.combatSummary) this.combatSummary.dmgDealt += res.damage;
  this.skillProgress(skill, 1);
  if (m.hp <= 0) this.kill(m, skill);
};
Game.prototype.kill = function (m, skill) {
  m.dead = true; m.hp = 0; m.aggro = false; if (this.target === m) this.target = null;
  var xp = R.KILL_XP[m.mon.threat] || 10; var v = this.v; this.write("player-xp", Math.max(0, Number(this.cur("player-xp")) || 0) + xp);
  if (this.combatSummary) { this.combatSummary.xp += xp; this.combatNote("killed", m); }
  this.skillProgress(skill, 3 + m.mon.threat * 3);
  this.slain[m.cell] = Math.floor(this.clock / 1440); this.dirtyFog = true;
  this.floater(m, "+" + xp + " XP", "#9fe07a"); this.pushLog(m.mon.name + " falls. +" + xp + " XP.", "kill");
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
Game.prototype.monsterStrike = function (m, ranged) {
  var self = this; m.attackT = 0.4; if (m.c.parts.h) playAction(m.c.parts.h, ranged ? "shoot" : "attack");
  var fire = function () {
    if (self.down || m.dead) return; var d = Math.hypot(m.x - self.pos.x, m.z - self.pos.z); if (!ranged && d > m.reach + 2.2) return;
    var res = R.monsterAttack(m.mon, self.v, { dodging: self.dodgeT > self.time, evasionBonus: self.calling() === "Fighter" && self.res >= 1 && self.blocking ? 1 : 0, block: self.blocking && R.hasShield(self.v) ? 2 : 0 });
    self.pushLog(res.line, res.hit ? "hurt" : "miss");
    if (res.hit && res.damage > 0) {
      self.stats.hp -= res.damage; playAction(self.player, "hit"); self.floater(null, "-" + res.damage, "#ff6a5a"); if (self.combatSummary) self.combatSummary.dmgTaken += res.damage; self.hurtFlash = 0.4;
      var kit = R.CALLING_KIT[self.calling()] || {}; if (kit.build === "hurt") self.res = Math.min(kit.max, self.res + 1);
      if (res.damage >= self.stats.maxHp * 0.25) self.log("Took a heavy blow (" + res.damage + " damage, ≥25% Max HP) from " + m.mon.name + "'s " + res.atk.name + " — injury check owed per Combat Numerics.");
      if (self.stats.hp <= 0) self.fall(m);
      self.writeStats();
    } else if (!res.hit && self.dodgeT > self.time) { self.skillProgress("acrobatics", 1); var kit2 = R.CALLING_KIT[self.calling()] || {}; if (kit2.build === "dodge") self.res = Math.min(kit2.max, self.res + 1); self.floater(null, "Dodged", "#9fd0ff"); }
    else self.floater(null, "Miss", "#c8c8c8");
  };
  if (ranged) this.projectile({ x: this.pos.x, z: this.pos.z, y: this.pos.y, c: { height: 1.6 } }, /spit|breath|bolt|spells/.test(m.ranged.name) ? "bolt" : "arrow", fire, m); else setTimeout(fire, 300);
};
Game.prototype.fall = function (m) {
  this.stats.hp = 0; this.down = true; this.inCombat && this.closeCombat(true);
  this.monsters.forEach(function (x) { x.aggro = false; x.state = "return"; });
  var d = describe(this.pos.x / MILE, -this.pos.z / MILE);
  this.log("I was struck down to 0 HP by " + m.mon.name + " (" + m.mon.region + " bestiary, Threat " + m.mon.threat + ") in " + d.location + ". The monsters broke off. Resolve consciousness, death or rescue strictly by the Combat rules — no plot armor.");
  this.writeStats(); this.flush(); this.bridge.onFall && this.bridge.onFall(m.mon.name);
};
Game.prototype.castSpell = function (sp) {
  var cost = sp.mp; if (this.v.conditions && JSON.stringify(this.v.conditions).indexOf("Mana Burn") >= 0) cost = Math.ceil(cost * 1.5);
  if (this.overchannel) cost = Math.ceil(cost * 1.5);
  if (this.stats.mp < cost) { this.toast("Not enough Mana for " + sp.name + " (" + cost + " MP).", "error"); return; }
  var self = this; this.stats.mp -= cost; this.cooldowns["spell:" + sp.id] = this.time + 2.2; playAction(this.player, "cast"); this.bridge.sfx && this.bridge.sfx(sp.heal ? "sfx-heal" : /lightning|electric|spark|arc/.test(sp.name.toLowerCase() + sp.element) ? "sfx-electric-spell" : "sfx-magic-cast-" + (1 + Math.floor(Math.random() * 3)));
  this.writeStats(); this.skillProgress(R.slug(sp.school) + "-magic", 1);
  if (sp.heal) { var r = R.rollDice((sp.dice || [1, 8])[0], (sp.dice || [1, 8])[1]); var amt = r.total + Math.max(0, R.attrMod((this.v.attributes || {}).willpower)); this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amt); this.floater(null, "+" + amt, "#7ae07a"); this.pushLog("(" + sp.name + " — heals " + amt + " HP)", "heal"); var kit = R.CALLING_KIT[this.calling()] || {}; if (kit.build === "heal") this.res = Math.min(kit.max, this.res + 1); this.writeStats(); return; }
  if (sp.dice) {
    var m = this.target && !this.target.dead ? this.target : this.pickTarget(); if (!m) { this.pushLog("(" + sp.name + " — no target)", "miss"); return; }
    this.target = m; this.faceTarget(m); if (!m.aggro) { m.aggro = true; this.onAggro(m); }
    var spell = this.overchannel ? Object.assign({}, sp, { dice: [sp.dice[0] + 1, sp.dice[1]] }) : sp; this.overchannel = false;
    this.projectile(m, "bolt", function () { var res = R.spellAttack(self.v, spell, m.mon); self.resolveHit(m, res, R.slug(sp.school) + "-magic"); }, null, sp.element);
    return;
  }
  // utility magic: visible but non-combat effects
  var id = sp.id;
  if (/light/.test(id)) { this.lightOrb(); this.pushLog("(" + sp.name + " — a floating light follows you for an hour)", "info"); this.log("Cast " + sp.name + "."); }
  else if (/bless/.test(id)) { this.buffs.blessing = this.time + 60; this.pushLog("(" + sp.name + " — +1 to attacks for the encounter)", "info"); }
  else { this.pushLog("(" + sp.name + " — " + (sp.desc || "cast") + ")", "info"); this.log("Cast " + sp.name + " (utility; narrate any lasting effect)."); }
};
Game.prototype.technique = function (t) {
  var kit = R.CALLING_KIT[this.calling()] || {}; var self = this;
  if (t.sp && this.stats.sp < t.sp) { this.toast("Not enough Stamina.", "error"); return; }
  if (t.cost && this.res < t.cost) { this.toast("Requires " + t.cost + " " + kit.res + ".", "info"); return; }
  if (t.once && this.encounterUsed[t.id]) { this.toast(t.name + " is spent for this encounter.", "info"); return; }
  if (t.sp) this.stats.sp -= t.sp; if (t.cost) this.res -= t.cost; if (t.once) this.encounterUsed[t.id] = 1; this.cooldowns["tech:" + t.id] = this.time + 1.5;
  switch (t.id) {
    case "second-wind": var amt = Math.max(2, Math.floor(this.stats.maxHp * 0.1)); this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amt); this.floater(null, "+" + amt, "#7ae07a"); this.pushLog("(Second Wind — 4 SP, recover " + amt + " HP)", "heal"); break;
    case "tempo-finisher": this.attack({ extra: R.d(8) }); break;
    case "brutal-swing": this.attack({ extra: R.d(10) }); break;
    case "smite": this.attack({ extra: R.d(8) }); break;
    case "flurry": this.attack(); setTimeout(function () { self.cooldowns.attack = 0; self.attack(); }, 380); break;
    case "cutting-verse": this.nextBonus = 2; this.pushLog("(Carry the Verse — +2 to your next attack)", "info"); break;
    case "devotion-mend": var h = R.d(8) + Math.max(0, R.attrMod((this.v.attributes || {}).willpower)); this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + h); this.floater(null, "+" + h, "#7ae07a"); this.pushLog("(Devotion: Mend — heals " + h + ")", "heal"); break;
    case "cunning-motion": this.dodge(true); break;
    case "quarry": var m = this.target || this.pickTarget(); if (m) { this.quarry = m; this.pushLog("(Quarry marked: " + m.mon.name + " — +1 to your first attack)", "info"); } break;
    case "overchannel": this.overchannel = true; this.pushLog("(Arcane Overchannel primed — next spell +50% Mana, one step stronger)", "info"); break;
    case "monster-read": var m2 = this.target || this.pickTarget(); if (m2) { var res = R.roll3d6(); var pm = R.attrMod((this.v.attributes || {}).perception) + R.skillBonus(R.skillLevel(this.v, "tracking")); var ok = res.total + pm >= 12 + m2.mon.threat; this.pushLog("(Monster Read — 3d6(" + res.dice.join(",") + ")=" + res.total + " +" + pm + " vs DR " + (12 + m2.mon.threat) + " — " + (ok ? "you spot it: " + (m2.mon.weakness || "no obvious weakness") : "nothing certain yet") + ")", ok ? "info" : "miss"); if (ok) { this.read = m2.mon.name; this.log("Monster Read on " + m2.mon.name + ": learned " + (m2.mon.weakness || "its patterns") + "."); } } break;
    default: this.pushLog("(" + t.name + " — " + t.desc + ")", "info"); this.log("Used " + t.name + " (narrate its effect)."); }
  this.writeStats();
};
Game.prototype.dodge = function (free) {
  if (!free) { if (this.stats.sp < 2) { this.toast("Too winded to dodge.", "info"); return; } this.stats.sp -= 2; }
  this.dodgeT = this.time + 0.5; this.cooldowns.dodge = this.time + 0.9; playAction(this.player, "dodge"); var mx = this.move.x, my = this.move.y; var a = (mx || my) ? this.camYaw + Math.atan2(mx, my) + Math.PI : this.yaw + Math.PI; this.dash = { vx: Math.sin(a) * 18, vz: Math.cos(a) * 18, t: 0.28 }; this.writeStats();
};
Game.prototype.useItem = function (item) {
  var inv = (this.cur("inventory") || []).slice(); var ix = inv.findIndex(function (x) { return x && x.id === item.id; }); if (ix < 0) return; var it = Object.assign({}, inv[ix]); var n = String(it.name).toLowerCase(); var msg = "";
  if (/mana/.test(n)) { var a = R.rollDice(2, 4).total + 2; this.stats.mp = Math.min(this.stats.maxMp, this.stats.mp + a); msg = "+" + a + " MP"; }
  else if (/potion|elixir|draught|tonic|salve/.test(n)) { var a = R.rollDice(2, 4).total + 2; this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + a); msg = "+" + a + " HP"; }
  else { var a = 5; this.stats.sp = Math.min(this.stats.maxSp, this.stats.sp + a); msg = "+" + a + " SP"; }
  it.qty = (Number(it.qty) || 1) - 1; if (it.qty <= 0) inv.splice(ix, 1); else inv[ix] = it; this.write("inventory", inv); this.writeStats();
  this.floater(null, msg, "#7ae07a"); this.pushLog("(Used " + item.name + " — " + msg + ")", "heal"); this.log("Used 1× " + item.name + " (" + msg + ")."); this.cooldowns["item:" + item.id] = this.time + 2;
};
Game.prototype.hotbar = function () {
  var v = this.v, w = R.weaponProfile(v), kit = R.CALLING_KIT[this.calling()] || { tech: [] }; var slots = []; var self = this;
  slots.push({ id: "attack", kind: "attack", label: w.item ? w.name : "Unarmed", icon: w.ranged ? "bow" : w.kind === "staff" ? "staff" : w.kind === "dagger" ? "dagger" : w.kind === "none" ? "fist" : w.blunt ? "hammer" : "sword" });
  (kit.tech || []).slice(0, 2).forEach(function (t) { slots.push({ id: "tech:" + t.id, kind: "tech", tech: t, label: t.name, icon: "tech", desc: t.desc, disabled: (t.cost && self.res < t.cost) || (t.sp && self.stats.sp < t.sp), why: t.cost ? "Requires " + t.cost + " " + kit.res : "" }); });
  var spells = v["known-spells"] && typeof v["known-spells"] === "object" ? v["known-spells"] : {};
  Object.keys(spells).slice(0, 3).forEach(function (k) { var sp = R.spellFor(k, spells[k]); slots.push({ id: "spell:" + sp.id, kind: "spell", spell: sp, label: sp.name, icon: sp.heal ? "heal" : /fire|ember|flame/.test(sp.id + sp.element) ? "fire" : /frost|ice|cold/.test(sp.id + sp.element) ? "ice" : /lightning|spark|arc/.test(sp.id + sp.element) ? "bolt" : "magic", mp: sp.mp, desc: sp.desc, disabled: self.stats.mp < sp.mp }); });
  while (slots.length < 5) slots.push(null);
  var inv0 = this.cur("inventory"); var inv = Array.isArray(inv0) ? inv0 : [];
  var heal = inv.find(function (x) { return x && /potion|elixir|draught|salve|tonic/i.test(x.name) && !/mana/i.test(x.name); }); var mana = inv.find(function (x) { return x && /mana/i.test(x.name) && /potion|elixir|draught/i.test(x.name); }); var food = inv.find(function (x) { return x && /ration|bread|jerky|herb|trail food|meal/i.test(x.name); });
  slots.push(heal ? { id: "item:" + heal.id, kind: "item", item: heal, label: heal.name, icon: "potion-red", count: heal.qty || 1 } : { id: "none6", kind: "empty", label: "No healing potion", icon: "potion-red", disabled: true, count: 0, why: "No healing potions in your pack." });
  slots.push(mana ? { id: "item:" + mana.id, kind: "item", item: mana, label: mana.name, icon: "potion-blue", count: mana.qty || 1 } : { id: "none7", kind: "empty", label: "No mana potion", icon: "potion-blue", disabled: true, count: 0, why: "No mana potions in your pack." });
  slots.push(food ? { id: "item:" + food.id, kind: "item", item: food, label: food.name, icon: "herb", count: food.qty || 1 } : { id: "none8", kind: "empty", label: "No rations", icon: "herb", disabled: true, count: 0, why: "No separate rations or herbs." });
  slots.push({ id: "dodge", kind: "dodge", label: "Dodge Roll (2 SP)", icon: "dodge", disabled: this.stats.sp < 2 });
  slots.push({ id: "interact", kind: "interact", label: "Interact (E)", icon: "hand" });
  return slots.slice(0, 10);
};

// ------------------------------------------------------------------ projectiles, floaters, effects
Game.prototype.projectile = function (target, kind, onHit, from, element) {
  var THREE = T(); var o; var src = from ? { x: from.x, y: from.y + 1.4, z: from.z } : { x: this.pos.x, y: this.pos.y + 1.5, z: this.pos.z };
  if (kind === "arrow") { o = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0x8a6a40 })); o.rotation.order = "YXZ"; }
  else { var col = /fire|ember/.test(element || "") ? 0xff8a3a : /cold|frost|ice/.test(element || "") ? 0x9fe0ff : /lightning/.test(element || "") ? 0xd8e8ff : /necrotic|umbral/.test(element || "") ? 0x9a5ac0 : /radiant/.test(element || "") ? 0xfff0a0 : 0x7ab8ff; o = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); o.scale.set(1.3, 1.3, 1); }
  o.position.set(src.x, src.y, src.z); this.scene.add(o); this.projectiles.push({ o: o, target: target, onHit: onHit, speed: kind === "arrow" ? 46 : 30, kind: kind });
};
Game.prototype.updateProjectiles = function (dt) {
  var self = this; this.projectiles = this.projectiles.filter(function (p) {
    var t = p.target; var tx = t.x, tz = t.z, ty = (t.y || 0) + ((t.c && t.c.height) || 1.4) * 0.6;
    var dx = tx - p.o.position.x, dy = ty - p.o.position.y, dz = tz - p.o.position.z, d = Math.hypot(dx, dy, dz);
    if (d < 0.8 || d > 300) { self.scene.remove(p.o); if (p.o.geometry) p.o.geometry.dispose(); p.o.material.dispose(); if (d < 0.8) p.onHit(); return false; }
    var s = Math.min(d, p.speed * dt); p.o.position.x += dx / d * s; p.o.position.y += dy / d * s; p.o.position.z += dz / d * s;
    if (p.kind === "arrow") { p.o.rotation.y = Math.atan2(dx, dz); p.o.rotation.x = Math.PI / 2; }
    return true;
  });
};
Game.prototype.floater = function (m, text, color) {
  var s = textSprite(text, { size: 34, scale: 0.011, color: color, bold: true, depthTest: false }); var pos = m ? { x: m.x, y: m.y + (m.c.height || 1.6) + 0.4, z: m.z } : { x: this.pos.x, y: this.pos.y + 2.3, z: this.pos.z };
  s.position.set(pos.x + (Math.random() - 0.5) * 0.6, pos.y, pos.z + (Math.random() - 0.5) * 0.6); this.scene.add(s); this.floaters.push({ s: s, t: 0 });
};
Game.prototype.updateFloaters = function (dt) { var self = this; this.floaters = this.floaters.filter(function (f) { f.t += dt; f.s.position.y += dt * 1.4; f.s.material.opacity = Math.max(0, 1 - f.t / 1.3); if (f.t > 1.3) { self.scene.remove(f.s); f.s.material.map.dispose(); f.s.material.dispose(); return false; } return true; }); };
Game.prototype.lightOrb = function () { var THREE = T(); if (this.orb) { this.orbUntil = this.time + 60; return; } var l = new THREE.PointLight(0xbfd8ff, 1.6, 26); var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xbfd8ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.set(1.2, 1.2, 1); l.add(sp); this.scene.add(l); this.orb = l; this.orbUntil = this.time + 60; };
Game.prototype.pushLog = function (line, kind) { this.combatLog.push({ t: Date.now(), line: line, kind: kind || "info" }); if (this.combatLog.length > 30) this.combatLog.shift(); };
Game.prototype.toast = function (msg, type) { this.bridge.toast && this.bridge.toast(msg, type || "info"); };

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
  if (changed) { this.fogVersion++; this.dirtyFog = true; }
  // canonical places within reach become known (the GM's discovery engine, applied locally)
  var known0 = this.cur("known-locations"); var known = known0 && typeof known0 === "object" ? known0 : {}; var add = null;
  var self = this;
  placesNear(x, y).forEach(function (p) { var d = Math.hypot(p.x - x, p.y - y); var sightR = /capital|city|stronghold|fort-town/.test(p.kind) ? 7 : /fort|tower|landmark/.test(p.kind) ? 5 : 2.5; if (d > p.r + sightR) return; var k = p.id; var have = add ? add[k] : known[k]; if (have && have.discovered && !have.approximate) return; add = add || Object.assign({}, known); add[k] = { name: p.name, x: p.x, y: p.y, region: p.realm, kind: p.kind, discovered: true, discoveryMethod: d < p.r + 0.5 ? "visited" : "sighted while exploring", discoveredDate: formatDate(Math.floor(self.clock / 1440)) }; if (!silent) { self.toast("Discovered: " + p.name, "success"); self.log("Discovered " + p.name + " (" + p.x + ", " + p.y + ")."); } var lg0 = self.newLog || self.cur("map-discovery-log"); var log = Array.isArray(lg0) ? lg0.slice() : []; self.newLog = log; log.push({ id: k, name: p.name, x: p.x, y: p.y, region: p.realm, method: "exploration", date: formatDate(Math.floor(self.clock / 1440)) }); });
  if (add) { this.write("known-locations", add); this.write("map-discovery-log", this.newLog); this.flushSoon(); } this.newLog = null;
};

// ------------------------------------------------------------------ travel
Game.prototype.teleportMiles = function (x, y, announce) {
  this.monsters.forEach(function (m) { this.scene.remove(m.c.root); }, this); this.monsters = []; this.spawnedCells = {}; this.target = null;
  this.pos.x = x * MILE; this.pos.z = -y * MILE; var p = insidePlace(x, y); if (p && Math.hypot(x - p.x, y - p.y) < 0.08) { this.pos.x += 18; this.pos.z += 30; }
  this.terrain.warm(this.pos.x, this.pos.z, 1);
  this.loadSettlements(true); this.pos.y = this.terrain.groundAt(this.pos.x, this.pos.z); this.walkFrom = describe(x, y); this.walked = 0; this.revealAround(!announce);
};
// Fast travel along known roads; returns {miles, days} and moves time forward.
Game.prototype.travelTo = function (id) {
  var p = PLACE_BY_ID[id]; if (!p) return null; var x0 = this.pos.x / MILE, y0 = -this.pos.z / MILE; var from = describe(x0, y0).location;
  var miles = Math.round(Math.hypot(p.x - x0, p.y - y0) * 1.18); var hours = miles / 3; var days = miles / 25;
  // reveal along the route
  for (var t = 0; t <= 1; t += 2 / Math.max(2, miles)) { var i = fogIndex(x0 + (p.x - x0) * t, y0 + (p.y - y0) * t); if (i >= 0) this.fog[i] = 1; } this.fogVersion++; this.dirtyFog = true;
  this.clock += Math.round(days >= 1 ? Math.floor(days) * 1440 + (days % 1) * 10 * 60 : hours * 60);
  this.teleportMiles(p.x, p.y, true); this.walked = 0;
  this.log("Traveled from " + from + " to " + p.name + " (about " + miles + " road miles, ~" + (days >= 1 ? days.toFixed(1) + " days" : hours.toFixed(1) + " hours") + " on foot). The clock was advanced; roll travel events by Route Security and narrate the journey's costs (food, lodging, encounters).");
  this.writePosition(true); this.writeClock(true); this.subOverride = null; return { miles: miles, days: days, from: from, to: p.name };
};

// ------------------------------------------------------------------ input
Game.prototype.bindInput = function () {
  var self = this, el = this.renderer.domElement; var drag = null;
  this.onKeyDown = function (e) { var tg = e.target; if (tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA" || tg.isContentEditable)) return; var k = e.key.toLowerCase(); if (self.bridge.hotkey && self.bridge.hotkey(k, e)) { e.preventDefault(); return; } var ae = document.activeElement; if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return; self.keys[k] = true; if (k === " ") { self.jump(); e.preventDefault(); } if (k === "e" || k === "f") self.doInteract(); if (k === "tab") { self.cycleTarget(); e.preventDefault(); } if (k === "escape") self.target = null; var n = "1234567890".indexOf(k); if (n >= 0) self.useSlot(n); if (k === "shift") self.running = true; if (k === "q") self.blocking = true; };
  this.onKeyUp = function (e) { var k = e.key.toLowerCase(); self.keys[k] = false; if (k === "shift") self.running = false; if (k === "q") self.blocking = false; };
  this.onDown = function (e) { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, id: e.pointerId, moved: false, button: e.button }; try { el.setPointerCapture(e.pointerId); } catch (_) { } };
  this.onMove = function (e) { if (!drag || drag.id !== e.pointerId) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 5) drag.moved = true; self.camYaw -= dx * 0.006; self.camPitch = Math.max(-0.35, Math.min(1.25, self.camPitch + dy * 0.004)); };
  this.onUp = function (e) { if (drag && !drag.moved && drag.button === 0) self.clickPick(e.clientX, e.clientY); drag = null; };
  this.onWheel = function (e) { self.camDist = Math.max(2.5, Math.min(34, self.camDist * (e.deltaY > 0 ? 1.1 : 0.9))); e.preventDefault(); };
  this.onCtx = function (e) { e.preventDefault(); };
  window.addEventListener("keydown", this.onKeyDown); window.addEventListener("keyup", this.onKeyUp); el.addEventListener("pointerdown", this.onDown); el.addEventListener("pointermove", this.onMove); el.addEventListener("pointerup", this.onUp); el.addEventListener("pointercancel", this.onUp); el.addEventListener("wheel", this.onWheel, { passive: false }); el.addEventListener("contextmenu", this.onCtx);
};
Game.prototype.clickPick = function (cx, cy) {
  var THREE = T(); var rect = this.renderer.domElement.getBoundingClientRect(); var best = null, bd = 60; var v = new THREE.Vector3(); var self = this;
  this.monsters.concat(this.npcs.map(function (n) { return { npc: n, x: n.x, y: n.y, z: n.z, c: { height: n.h.height } }; })).forEach(function (m) { if (m.dead) return; v.set(m.x, m.y + (m.c.height || 1.5) * 0.6, m.z).project(self.camera); if (v.z > 1) return; var sx = (v.x + 1) / 2 * rect.width + rect.left, sy = (1 - v.y) / 2 * rect.height + rect.top; var d = Math.hypot(sx - cx, sy - cy); if (d < bd) { bd = d; best = m; } });
  if (best && best.npc) { if (Math.hypot(best.x - this.pos.x, best.z - this.pos.z) < 6) this.bridge.onNpc && this.bridge.onNpc(this.npcCard(best.npc)); else this.toast(best.npc.name + " — walk closer to talk.", "info"); }
  else if (best) this.target = best;
};
Game.prototype.jump = function () { if (this.grounded && !this.down) { this.vy = 7.5; this.grounded = false; } };
Game.prototype.setMove = function (x, y) { this.move.x = x; this.move.y = y; };

// ------------------------------------------------------------------ collision
Game.prototype.collide = function (x, z, rad, only) {
  var list = only ? [only] : Object.values(this.settlements);
  for (var i = 0; i < list.length; i++) { var s = list[i]; if (Math.hypot(s.center.x - x, s.center.z - z) > s.radius + 30) continue;
    for (var j = 0; j < s.colliders.length; j++) { var c = s.colliders[j]; var dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + rad; if (d < m && d > 1e-4) { x = c.x + dx / d * m; z = c.z + dz / d * m; } }
    for (var j = 0; j < s.segs.length; j++) { var g = s.segs[j]; var vx = g.x2 - g.x1, vz = g.z2 - g.z1, L2 = vx * vx + vz * vz; var t = Math.max(0, Math.min(1, ((x - g.x1) * vx + (z - g.z1) * vz) / L2)); var qx = g.x1 + vx * t, qz = g.z1 + vz * t; var dx = x - qx, dz = z - qz, d = Math.hypot(dx, dz), m = 1.4 + rad; if (d < m && d > 1e-4) { x = qx + dx / d * m; z = qz + dz / d * m; } }
  }
  return { x: x, z: z };
};

// ------------------------------------------------------------------ frame
Game.prototype.frame = function (dt) {
  this.time += Math.max(dt, this.wall || 0); /* cooldowns and timers follow the wall clock even on slow devices */ var THREE = T(); var self = this;
  // movement
  var kx = (this.keys.d || this.keys.arrowright ? 1 : 0) - (this.keys.a || this.keys.arrowleft ? 1 : 0), ky = (this.keys.w || this.keys.arrowup ? 1 : 0) - (this.keys.s || this.keys.arrowdown ? 1 : 0);
  var mx = kx + this.move.x, my = ky + this.move.y; var ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; ml = 1; }
  var speed = 0; var talkingLock = !!this.talking;
  if (!this.down && !talkingLock && ml > 0.05) {
    var run = this.running || ml > 0.95 && this.move.run; var exhausted = this.stats.sp <= 0; var sp = (run && !exhausted ? 13 : 7.2) * ml * (this.v.encumbrance === "Overloaded" ? 0.5 : this.v.encumbrance === "Heavily Encumbered" ? 0.7 : 1);
    var a = this.camYaw + Math.atan2(mx, my) + Math.PI; var vx = Math.sin(a) * sp, vz = Math.cos(a) * sp;
    var nx = this.pos.x + vx * dt, nz = this.pos.z + vz * dt; var gh = this.terrain.groundAt(nx, nz);
    var climb = (gh - this.pos.y) / Math.max(0.001, sp * dt);
    if (gh > -1.3 && climb < 1.9) { var c = this.collide(nx, nz, 0.45); var dist = Math.hypot(c.x - this.pos.x, c.z - this.pos.z); this.pos.x = c.x; this.pos.z = c.z; this.walked += dist / MILE; this.clock += dist / MILE * 20; speed = sp; }
    else if (gh <= -1.3) { if (!this.waterWarned || this.time - this.waterWarned > 4) { this.waterWarned = this.time; this.toast("Deep water — you need a boat or a ferry to cross.", "info"); } }
    if (!(this.target && this.inCombat && ml < 0.1)) this.yaw = lerpAngle(this.yaw, a, dt * 10);
    if (run && !exhausted) { this.sprintT = (this.sprintT || 0) + dt; if (this.sprintT > 4) { this.sprintT = 0; this.stats.sp = Math.max(0, this.stats.sp - 1); this.writeStats(); } }
  }
  if (this.dash && this.dash.t > 0) { var c2 = this.collide(this.pos.x + this.dash.vx * dt, this.pos.z + this.dash.vz * dt, 0.45); if (this.terrain.groundAt(c2.x, c2.z) > -1.3) { this.pos.x = c2.x; this.pos.z = c2.z; } this.dash.t -= dt; }
  if (this.target && !this.target.dead && this.inCombat && ml < 0.05) this.yaw = lerpAngle(this.yaw, Math.atan2(this.target.x - this.pos.x, this.target.z - this.pos.z), dt * 8);
  // gravity
  var ground = this.terrain.groundAt(this.pos.x, this.pos.z); this.vy -= 22 * dt; this.pos.y += this.vy * dt; if (this.pos.y <= ground) { this.pos.y = ground; this.vy = 0; this.grounded = true; }
  // idle time: half a game minute per real second (travel time is added per mile walked above)
  this.clock += Math.max(dt, this.wall || 0) * 0.5;
  // stamina & mana trickle back out of combat
  this.regenT = (this.regenT || 0) + Math.max(dt, this.wall || 0); if (this.regenT > 3) { this.regenT = 0; if (!this.inCombat && !this.down) { var ch = false; if (this.stats.sp < this.stats.maxSp && !this.running) { this.stats.sp += 1; ch = true; } this.manaT = (this.manaT || 0) + 1; if (this.manaT >= 7 && this.stats.mp < this.stats.maxMp) { this.manaT = 0; this.stats.mp += 1; ch = true; } if (ch) this.writeStats(); } }
  // player pose
  var P = this.player; P.root.position.set(this.pos.x, this.pos.y, this.pos.z); P.root.rotation.y = this.yaw;
  animateHumanoid(P, dt, { speed: speed / 7.2, dead: this.down, combat: this.inCombat });
  if (P.head.userData.hood) P.head.userData.hood.visible = /rain|snow|storm|ash/.test(String(this.v.weather).toLowerCase());
  // camera
  var head = new THREE.Vector3(this.pos.x, this.pos.y + 1.95, this.pos.z);
  var cd = this.camDist; var cx = head.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * cd, cz = head.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * cd, cy = head.y + Math.sin(this.camPitch) * cd;
  var cg = this.terrain.groundAt(cx, cz) + 0.6; if (cy < cg) cy = cg;
  var side = 0.55; cx += Math.cos(this.camYaw) * side; cz -= Math.sin(this.camYaw) * side;
  this.camera.position.set(cx, cy, cz); this.camera.lookAt(head.x + Math.cos(this.camYaw) * side, head.y + 0.35, head.z - Math.sin(this.camYaw) * side);
  if (this.hurtFlash > 0) this.hurtFlash -= dt;
  // world systems
  this.terrain.update(this.pos.x, this.pos.z, dt > 0.05 ? Math.max(this.q.genBudget, 14) : this.q.genBudget);
  this.loadT = (this.loadT || 0) + dt; if (this.loadT > 0.7) { this.loadT = 0; this.loadSettlements(false); this.spawnMonsters(); this.revealAround(false); this.checkPlace(); }
  for (var id in this.settlements) { var s = this.settlements[id]; var d = Math.hypot(s.center.x - this.pos.x, s.center.z - this.pos.z); if (d < s.radius + 140) this.populate(s); s.labels.forEach(function (l) { l.visible = Math.hypot(l.position.x - self.pos.x, l.position.z - self.pos.z) < 40; }); }
  this.updateNPCs(dt); this.updateMonsters(dt); this.updateProjectiles(dt); this.updateFloaters(dt);
  if (this.inCombat && !this.monsters.some(function (m) { return m.aggro && !m.dead; })) { this.calmT = (this.calmT || 0) + dt; if (this.calmT > 4) { this.calmT = 0; this.closeCombat(); } } else this.calmT = 0;
  if (this.orb) { this.orb.position.set(this.pos.x + Math.sin(this.time) * 0.6, this.pos.y + 2.6, this.pos.z + Math.cos(this.time) * 0.6); if (this.time > this.orbUntil) { this.scene.remove(this.orb); this.orb = null; } }
  // environment
  var x = this.pos.x / MILE, y = -this.pos.z / MILE; var region = realmAt(x, y); var minutes = ((this.clock % 1440) + 1440) % 1440;
  this.envState = this.env.update(dt, this.pos, minutes, this.v.weather, region);
  var night = this.envState.night; for (var id2 in this.settlements) { var s2 = this.settlements[id2]; s2.winMat.emissiveIntensity = night * 1.6; s2.lampMat.emissiveIntensity = 0.2 + night * 2.4; }
  // interaction prompt
  this.interact = this.down ? null : this.findInteract();
  // persistence cadence
  this.writeClock(false); this.writePosition(false);
  if (this.dirtyFog && (!this.fogWriteT || this.time - this.fogWriteT > 12)) { this.fogWriteT = this.time; this.dirtyFog = false; this.write3d(); }
  var now = performance.now(); if ((this.flushAt && now > this.flushAt) || now - this.lastFlush > 5000) { this.flushAt = 0; if (Object.keys(this.dirty).length) this.flush(); else this.lastFlush = now; }
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
Game.prototype.snapshot = function () {
  var self = this; var x = this.pos.x / MILE, y = -this.pos.z / MILE; var d = describe(x, y); var minutes = ((this.clock % 1440) + 1440) % 1440; var day = Math.floor(this.clock / 1440);
  var tg = this.target && !this.target.dead ? { name: this.target.mon.name, hp: Math.max(0, Math.round(this.target.hp)), maxHp: this.target.maxHp, threat: this.target.mon.threat, region: this.target.mon.region, evasion: this.target.mon.evasion, dr: this.target.mon.dr, dist: Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z), weakness: this.read === this.target.mon.name ? this.target.mon.weakness : null } : null;
  var kit = R.CALLING_KIT[this.calling()] || {};
  return { x: x, y: y, heading: this.camYaw, yaw: this.yaw, location: d.location, sub: this.subOverride || d.sublocation, region: d.region, time: formatTime(minutes), date: formatDate(day), tod: timeOfDay(minutes), minutes: minutes,
    hp: Math.round(this.stats.hp), maxHp: this.stats.maxHp, mp: Math.round(this.stats.mp), maxMp: this.stats.maxMp, sp: Math.round(this.stats.sp), maxSp: this.stats.maxSp,
    target: tg, interact: this.interact ? this.interact.label : null, combat: this.inCombat, log: this.combatLog.slice(-6), down: this.down, hotbar: this.hotbar().map(function (s) { if (!s) return null; var cd = self.cooldowns[s.id] || 0; return Object.assign({}, s, { cd: Math.max(0, cd - self.time), tech: undefined, spell: undefined, item: undefined, mp: s.mp }); }),
    res: kit.res ? { name: kit.res, val: this.res, max: kit.max } : null, hurt: this.hurtFlash > 0, fogVersion: this.fogVersion, loading: this.terrain.queue.length, reportCount: this.report.length, talking: this.talking ? this.talking.id : null };
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
  this.disposed = true; cancelAnimationFrame(this.raf); try { this.flush(); } catch (e) { }
  window.removeEventListener("keydown", this.onKeyDown); window.removeEventListener("keyup", this.onKeyUp); window.removeEventListener("resize", this.onResize); if (this.ro) this.ro.disconnect();
  if (this.renderer) { this.terrain.disposeAll(); for (var id in this.settlements) this.unloadSettlement(id); this.renderer.dispose(); this.renderer.forceContextLoss && this.renderer.forceContextLoss(); if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement); }
};
