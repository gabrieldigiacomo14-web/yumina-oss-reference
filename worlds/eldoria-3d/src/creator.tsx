// @ts-nocheck
// Three-step character creator (Identity · Calling · Realm) with a live 3D preview.
// Writes exactly the state the original creator wrote, plus the 3D avatar.
import { T, GeoBuilder, prim, M, hex, runeCircleTex, bannerTex, glowTex } from "./three";
import { makeHumanoid, animateHumanoid, renderPortrait, SKIN_TONES, HAIR_COLORS, HAIR_STYLES, BUILDS, FACE_COUNT, CALLING_LOOK } from "./models";
import { buildSettlement } from "./settlements";
import { paintMap, PLACE_BY_ID, MILE } from "./worldgen";
import { REALM_STARTS, BACKGROUND_OPTIONS, BACKGROUND_INFO, CLASS_INFO, SPECIES, SPECIES_INFO, titleCase, skillFamily, money, canonicalSettlement, embeddedSublocation } from "./panels";
import { Icon } from "./ui";

var ORIGINS = ["Frontier Born", "City Born", "Village Born", "Noble Born", "Harbor Born", "Mountain Born", "Forest Born", "Desert Born", "Orphan of the Road", "Temple Raised", "Guild-Raised", "Exile"];
var COMMON = ["Fighter", "Rogue", "Ranger", "Mage", "Cleric", "Paladin", "Barbarian", "Monk", "Bard", "Druid", "Occultist"];
var SPECIAL = ["Battlesmith", "Sylvanoran Warden", "Wyrm Hunter"];
var SPECIAL_HINT = { "Battlesmith": "Stonehold realm path", "Sylvanoran Warden": "Sylvanor realm path", "Wyrm Hunter": "Drakmor realm path" };
var NAME_POOL = ["Kael", "Aric", "Seren", "Mira", "Torin", "Lysa", "Bran", "Isolde", "Corin", "Elyra", "Dain", "Rhea", "Garrick", "Nyra", "Varek", "Tamsin", "Orren", "Liora", "Hale", "Wren"];
var REALM_ORDER = ["Aurelia", "Stonehold", "Sylvanor", "Drakmor", "Sunscar", "Velkar", "Umbral Reach"];
var ATTR = [["strength", "Strength", "BicepsFlexed"], ["perception", "Perception", "Eye"], ["agility", "Agility", "Wind"], ["willpower", "Willpower", "Flame"], ["endurance", "Endurance", "HeartPulse"], ["presence", "Presence", "Crown"], ["intellect", "Intellect", "BookOpen"], ["arcana", "Arcana", "Sparkles"]];

export function lookFromForm(f) {
  return { species: f.species, gender: f.gender, skin: SKIN_TONES[f.skin], hair: HAIR_COLORS[f.hairColor], hairStyle: HAIR_STYLES[f.hair], face: f.face, build: BUILDS[f.build], calling: f.klass, beard: f.gender === "Male" && f.face % 3 === 2 };
}
export function describeLook(f) {
  var skinNames = ["fair", "light", "olive", "brown", "deep brown"], hairNames = ["black", "dark brown", "sandy blond", "auburn", "silver"];
  return BUILDS[f.build].toLowerCase() + " build, " + skinNames[f.skin] + " skin, " + hairNames[f.hairColor] + " hair worn " + HAIR_STYLES[f.hair].toLowerCase() + (f.marks ? "; " + f.marks : "");
}

// ------------------------------------------------------------------ 3D stage (courtyard, dais, castle)
function Stage(container) {
  var THREE = T(); this.container = container; var w = container.clientWidth || 600, h = container.clientHeight || 600;
  var r = new THREE.WebGLRenderer({ antialias: true, alpha: false }); r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.setSize(w, h); if (THREE.sRGBEncoding) r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(r.domElement); r.domElement.style.display = "block"; r.domElement.style.touchAction = "none";
  this.r = r; var scene = this.scene = new THREE.Scene(); scene.background = new THREE.Color(0x7d93aa); scene.fog = new THREE.Fog(0x8fa2b6, 120, 900); r.toneMappingExposure = 0.92;
  this.cam = new THREE.PerspectiveCamera(34, w / h, 0.1, 1200); this.yaw = 0.25; this.dist = 7.4; this.pitch = 0.08;
  scene.add(new THREE.HemisphereLight(0xb8cce8, 0x2a241c, 0.32));
  var sun = new THREE.DirectionalLight(0xffe6c4, 1.2); sun.position.set(-9, 12, 9); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); var sc = sun.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; scene.add(sun);
  var rim = new THREE.DirectionalLight(0x9ab8ff, 0.55); rim.position.set(6, 6, -8); scene.add(rim);
  // dais
  var dais = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.7, 0.5, 48), [new THREE.MeshStandardMaterial({ color: 0x4a4846, roughness: 0.9 }), new THREE.MeshStandardMaterial({ map: runeCircleTex(), roughness: 0.75 }), new THREE.MeshStandardMaterial({ color: 0x3a3836 })]);
  dais.position.y = -0.25; dais.receiveShadow = true; scene.add(dais);
  var floor = new THREE.Mesh(new THREE.CircleGeometry(80, 48), new THREE.MeshStandardMaterial({ color: 0x5a5650, roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.5; floor.receiveShadow = true; scene.add(floor);
  // braziers, pillars and banners framing the hero
  var B = new GeoBuilder(); var stone = hex("#77746e").concat([0.1]);
  [[-5.5, -2.5], [5.5, -2.5], [-7, -7], [7, -7]].forEach(function (p, i) { B.add(prim("cyl16"), M(p[0], -0.5, p[1], 0, 0, 0, 1.6, 9, 1.6), stone, true); B.add(prim("boxb"), M(p[0], 8.5, p[1], 0, 0, 0, 2.2, 0.8, 2.2), stone); });
  var bm = new THREE.Mesh(B.build(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 })); bm.castShadow = true; bm.receiveShadow = true; scene.add(bm);
  this.fires = [];
  [[-3.6, 1.6], [3.6, 1.6]].forEach(function (p) { var bz = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 1.2, 12), new THREE.MeshStandardMaterial({ color: 0x2a2622, metalness: 0.6, roughness: 0.4 })); bz.position.set(p[0], 0.1, p[1]); scene.add(bz); var fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff9a40, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); fl.position.set(p[0], 1.0, p[1]); fl.scale.set(1.6, 2.2, 1); scene.add(fl); var pl = new THREE.PointLight(0xff9040, 1.0, 8); pl.position.set(p[0], 1.4, p[1]); scene.add(pl); this.fires.push({ s: fl, l: pl }); }, this);
  this.bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex("Aurelia"), side: THREE.DoubleSide, transparent: true, alphaTest: 0.1 });
  [[-5.5, -1.6], [5.5, -1.6]].forEach(function (p) { var b = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.2), this.bannerMat); b.position.set(p[0], 5.4, p[1]); scene.add(b); }, this);
  // mountains
  var MB = new GeoBuilder(); for (var i = 0; i < 16; i++) { var a = -1.2 + i * 0.16, d = 300 + (i % 3) * 60; MB.add(prim("cone6"), M(Math.sin(a) * d, -20, -Math.cos(a) * d, 0, i, 0, 140 + (i * 37) % 90, 150 + (i * 53) % 120, 140), hex(i % 2 ? "#7a8494" : "#6a7484").concat([0.08]), true); MB.add(prim("cone6"), M(Math.sin(a) * d, 95 + (i * 53) % 120 * 0.6, -Math.cos(a) * d, 0, i, 0, 60, 60, 60), [0.92, 0.94, 0.97], true); }
  var mm = new THREE.Mesh(MB.build(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true })); scene.add(mm);
  this.backdrop = null; this.setRealm("Aurelia");
  this.char = null; this.t = 0; var self = this;
  var drag = null; var el = r.domElement;
  el.addEventListener("pointerdown", function (e) { drag = { x: e.clientX, y: e.clientY }; try { el.setPointerCapture(e.pointerId); } catch (_) { } });
  el.addEventListener("pointermove", function (e) { if (!drag) return; self.yaw -= (e.clientX - drag.x) * 0.01; self.pitch = Math.max(-0.2, Math.min(0.6, self.pitch + (e.clientY - drag.y) * 0.004)); drag = { x: e.clientX, y: e.clientY }; });
  el.addEventListener("pointerup", function () { drag = null; }); el.addEventListener("pointercancel", function () { drag = null; });
  el.addEventListener("wheel", function (e) { self.dist = Math.max(2.4, Math.min(11, self.dist * (e.deltaY > 0 ? 1.08 : 0.92))); e.preventDefault(); }, { passive: false });
  this.onResize = function () { var w2 = container.clientWidth, h2 = container.clientHeight; if (!w2 || !h2) return; r.setSize(w2, h2); self.cam.aspect = w2 / h2; self.cam.updateProjectionMatrix(); };
  window.addEventListener("resize", this.onResize); this.ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(this.onResize) : null; if (this.ro) this.ro.observe(container);
  var last = performance.now(); var loop = function () { if (self.dead) return; self.raf = requestAnimationFrame(loop); var now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; self.frame(dt); }; loop();
}
Stage.prototype.setRealm = function (realm) {
  var THREE = T(); if (this.realm === realm) return; this.realm = realm; if (this.backdrop) { this.scene.remove(this.backdrop); this.backdrop.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); }
  // a real capital from the generator, seen from beyond its walls
  var id = (REALM_STARTS[realm] || REALM_STARTS.Aurelia).id; var p = PLACE_BY_ID[id] || PLACE_BY_ID["aurelia-city"];
  var s = buildSettlement(p); var g = s.group; g.position.set(-s.center.x + 30, -s.center.y - 4, -s.center.z - 175); g.rotation.y = 0; this.scene.add(g); this.backdrop = g;
  s.winMat.emissiveIntensity = 0.4;
  this.bannerMat.map = bannerTex(realm); this.bannerMat.needsUpdate = true;
  var sky = { "Aurelia": 0x7d93aa, "Stonehold": 0x75828f, "Sylvanor": 0x7f9a84, "Drakmor": 0xa9b6c2, "Sunscar": 0xc8ae80, "Velkar": 0x7fa2ae, "Umbral Reach": 0x4a4250 }[realm] || 0x7d93aa;
  this.scene.background = new THREE.Color(sky); this.scene.fog.color = new THREE.Color(sky).multiplyScalar(1.08);
};
Stage.prototype.setLook = function (look) {
  var key = JSON.stringify(look); if (key === this.key) return; this.key = key; if (this.char) this.scene.remove(this.char.root);
  this.char = makeHumanoid(look); this.scene.add(this.char.root);
};
Stage.prototype.frame = function (dt) {
  this.t += dt; if (this.char) animateHumanoid(this.char, dt, { speed: 0 });
  this.fires.forEach(function (f, i) { var k = 1 + Math.sin(this.t * 13 + i * 2) * 0.08 + Math.sin(this.t * 7.3 + i) * 0.06; f.s.scale.set(1.5 * k, 2.1 * k, 1); f.l.intensity = 1.0 * k; }, this);
  var h = this.char ? this.char.height : 1.8; var ty = h * 0.55; var cy = ty + Math.sin(this.pitch) * this.dist;
  this.cam.position.set(Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist, cy, Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist); this.cam.lookAt(0, ty, 0);
  var w = this.r.domElement.clientWidth, h = this.r.domElement.clientHeight; if (w > 1050) this.cam.setViewOffset(w, h, w * 0.1, 0, w, h); else if (this.cam.view) this.cam.clearViewOffset();
  this.r.render(this.scene, this.cam);
};
Stage.prototype.dispose = function () { this.dead = true; cancelAnimationFrame(this.raf); window.removeEventListener("resize", this.onResize); if (this.ro) this.ro.disconnect(); this.r.dispose(); this.r.forceContextLoss && this.r.forceContextLoss(); this.r.domElement.remove(); };

// ------------------------------------------------------------------ the creator
export function Creator(props) {
  var api = props.api; var R = React;
  var [step, setStep] = R.useState(1);
  var [f, setF] = R.useState({ name: "", age: 20, gender: "Male", species: "Human", origin: 0, background: 0, hair: 0, hairColor: 1, face: 2, skin: 2, build: 2, klass: "Fighter", realm: "Aurelia", marks: "" });
  var [busy, setBusy] = R.useState(false);
  var [ports, setPorts] = R.useState({ species: {}, faces: [], callings: {}, realms: {} });
  var stageEl = R.useRef(null), stage = R.useRef(null);
  function set(k, v) { setF(function (x) { var n = Object.assign({}, x); n[k] = v; return n; }); }
  function cyc(k, n, d) { setF(function (x) { var o = Object.assign({}, x); o[k] = ((x[k] + d) % n + n) % n; return o; }); }
  var look = lookFromForm(f);
  R.useEffect(function () { if (!stageEl.current) return; try { stage.current = new Stage(stageEl.current); } catch (e) { console.error(e); } return function () { stage.current && stage.current.dispose(); stage.current = null; }; }, []);
  R.useEffect(function () { try { stage.current && stage.current.setLook(look); } catch (e) { console.error(e); } }, [JSON.stringify(look)]);
  R.useEffect(function () { try { stage.current && stage.current.setRealm(f.realm); } catch (e) { console.error(e); } }, [f.realm]);
  // portraits: species heads, face presets, calling cards (debounced as the look changes)
  R.useEffect(function () {
    var t = setTimeout(function () {
      var sp = {}; ["Human", "Elf", "Dwarf", "Half-Elf", "Halfling", "Orc-Blooded"].forEach(function (s, i) { sp[s] = renderPortrait(function () { return makeHumanoid(Object.assign({}, look, { species: s, calling: "Fighter", hairStyle: HAIR_STYLES[[0, 2, 9, 3, 8, 7][i]], face: i * 2, beard: s === "Dwarf" })); }, { w: 112, h: 112 }); });
      var faces = []; for (var i = 0; i < 5; i++) faces.push(renderPortrait(function () { return makeHumanoid(Object.assign({}, look, { face: (Math.floor(f.face / 5) * 5 + i) % FACE_COUNT })); }, { w: 96, h: 96 }));
      setPorts(function (p) { return Object.assign({}, p, { species: sp, faces: faces }); });
    }, 150); return function () { clearTimeout(t); };
  }, [f.skin, f.hairColor, f.hair, f.gender, f.build, Math.floor(f.face / 5)]);
  R.useEffect(function () {
    var t = setTimeout(function () { var cs = {}; COMMON.concat(SPECIAL).forEach(function (k) { cs[k] = renderPortrait(function () { return makeHumanoid(Object.assign({}, look, { calling: k })); }, { w: 120, h: 150, full: true, fov: 24 }); }); setPorts(function (p) { return Object.assign({}, p, { callings: cs }); }); }, 450);
    return function () { clearTimeout(t); };
  }, [f.species, f.skin, f.hairColor, f.hair, f.gender, f.build, f.face]);
  R.useEffect(function () {
    var cancels = []; REALM_ORDER.forEach(function (rk) { var st = REALM_STARTS[rk]; var c = document.createElement("canvas"); c.width = 96; c.height = 110; var ctx = c.getContext("2d"); cancels.push(paintMap(ctx, { cx: st.x, cy: st.y, mpp: 1.6, w: 96, h: 110 }, "satellite", function () { ctx.fillStyle = "rgba(255,210,120,0.95)"; ctx.beginPath(); ctx.arc(48, 55, 3.5, 0, 7); ctx.fill(); var url = c.toDataURL(); setPorts(function (p) { var r2 = Object.assign({}, p.realms); r2[rk] = url; return Object.assign({}, p, { realms: r2 }); }); }, 8)); });
    return function () { cancels.forEach(function (c) { c(); }); };
  }, []);

  var start = REALM_STARTS[f.realm] || REALM_STARTS.Aurelia;
  var attrs = { strength: 10, agility: 10, endurance: 10, intellect: 10, perception: 10, willpower: 10, presence: 10, arcana: 10 }; if (f.klass === "Mage") attrs.arcana = 11; if (f.klass === "Paladin") attrs.willpower = 11; if (f.klass === "Bard") attrs.presence = 11;

  function finish() {
    if (!f.name.trim()) { api.showToast("Give your adventurer a name first.", "error"); setStep(1); return; }
    setBusy(true);
    var name = f.name.trim(), klass = f.klass, origin = ORIGINS[f.origin], background = BACKGROUND_OPTIONS[f.background];
    var V = {};
    V["player-name"] = name; V["player-age"] = Number(f.age) || 20; V["player-gender"] = f.gender; V["player-species"] = f.species; V["player-appearance"] = describeLook(f); V["player-origin"] = origin + " (" + start.name + ")"; V["player-background"] = background;
    V["player-class"] = klass; V["starting-calling"] = klass; V["starting-realm"] = start.name; V["player-level"] = 1; V["player-xp"] = 0; V["guild-rank"] = "Unregistered"; V["guild-reputation"] = 0;
    V["player-max-hp"] = 20; V["player-hp"] = 20; V["player-max-mana"] = 10; V["player-mana"] = 10; V["player-max-stamina"] = 20; V["player-stamina"] = 20;
    V["attributes"] = attrs; V["techniques"] = {}; V["abilities"] = {}; V["conditions"] = []; V["injuries"] = []; V["quest-log"] = []; V["party"] = []; V["companions"] = {}; V["in-combat"] = false; V["combat-state"] = { round: 0, combatants: [], terrain: "", notes: "" }; V["encumbrance"] = "Unburdened";
    V["factions"] = { "golden-lion": 0, "silver-moon": 0, "iron-vanguard": 0, "shadow-ravens": 0, "sea-drake": 0 };
    V["class-state"] = { class: klass, tier: 1, specialization: null, milestones: [], unspentPoints: 0, playstyle: {}, oath: null, pactLedger: [] };
    V["attribute-points"] = 0; V["attribute-points-granted"] = 1;
    var callingId = klass.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); var calls = {}; calls[callingId] = { name: klass, status: "learned", learningProgress: 100, tier: 1, specialization: null, origin: "starting", teacher: null, milestones: [], playstyle: {}, features: ["Foundational " + klass + " training"] };
    V["callings"] = calls; V["calling-learning-log"] = [{ calling: klass, event: "Starting Calling", date: "Dawnswell 3, 1247 AR", source: "character creation" }];
    var seeds = { Fighter: ["swordsmanship", "athletics", "shield-use"], Rogue: ["stealth", "dagger-fighting", "lockpicking"], Ranger: ["tracking", "survival", "archery"], Mage: ["arcana", "investigation", "scribing"], Cleric: ["religion", "medicine", "insight"], Paladin: ["swordsmanship", "shield-use", "leadership"], Barbarian: ["heavy-weapons", "athletics", "survival"], Monk: ["unarmed-combat", "acrobatics", "perception"], Bard: ["persuasion", "insight", "history"], Druid: ["nature", "survival", "herbalism"], Occultist: ["arcana", "investigation", "religion"], Battlesmith: ["blacksmithing", "blunt-weapons", "heavy-weapons"], "Sylvanoran Warden": ["survival", "tracking", "nature"], "Wyrm Hunter": ["tracking", "spear-fighting", "perception"] };
    var SKILL_ATTR = { swordsmanship: "strength", "shield-use": "strength", "heavy-weapons": "strength", "blunt-weapons": "strength", "spear-fighting": "agility", "dagger-fighting": "agility", "unarmed-combat": "agility", archery: "agility", acrobatics: "agility", stealth: "agility", lockpicking: "agility", athletics: "strength", survival: "endurance", tracking: "perception", perception: "perception", investigation: "intellect", insight: "perception", arcana: "arcana", scribing: "intellect", religion: "willpower", medicine: "intellect", herbalism: "intellect", nature: "intellect", history: "intellect", persuasion: "presence", leadership: "presence", blacksmithing: "strength" };
    var sk = {}; (seeds[klass] || []).forEach(function (id) { sk[id] = { name: titleCase(id), category: skillFamily(id, {}), level: 1, prog: 0, origin: "class", teacher: null, attribute: SKILL_ATTR[id] || "varies" }; }); V["skills"] = sk;
    var spells = {};
    if (klass === "Mage") spells["arcane-light"] = { id: "arcane-light", name: "Arcane Light", school: "Arcane", tier: "Minor", manaCost: 1, castingTime: "1 action", range: "Touch", origin: "starting calling" };
    if (klass === "Cleric" || klass === "Paladin") spells["blessing"] = { id: "blessing", name: "Blessing", school: "Divine", tier: "Minor", manaCost: 2, castingTime: "1 action", range: "Touch", origin: "starting calling" };
    if (klass === "Bard") spells["tune"] = { id: "tune", name: "Tune", school: "Bardic", tier: "Minor", manaCost: 1, castingTime: "1 action", range: "Self", origin: "starting calling" };
    if (klass === "Druid") spells["seedwake"] = { id: "seedwake", name: "Seedwake", school: "Nature", tier: "Minor", manaCost: 2, castingTime: "1 min", range: "Touch", origin: "starting calling" };
    if (klass === "Occultist") spells["shade"] = { id: "shade", name: "Shade", school: "Umbral", tier: "Minor", manaCost: 2, castingTime: "1 action", range: "10-ft area", origin: "starting calling" };
    V["known-spells"] = spells;
    var gear = [{ id: "starter-pack", name: "Adventurer Pack", qty: 1, weight: 8, valueCp: 2500, condition: 100, equipped: false, properties: ["bedroll", "flint", "2 rations", "waterskin"] }];
    var eq = { weapon: null, offhand: null, head: null, chest: null, hands: null, legs: null, feet: null, cloak: null, accessory1: null, accessory2: null, tools: [] };
    if (["Mage", "Druid", "Monk"].indexOf(klass) >= 0) { gear.push({ id: "starter-staff", name: "Quarterstaff", qty: 1, weight: 4, valueCp: 600, condition: 100, equipped: true, properties: ["1d6", "versatile 1d8"] }); eq.weapon = "starter-staff"; }
    else if (klass === "Rogue") { gear.push({ id: "starter-dagger", name: "Dagger", qty: 1, weight: .8, valueCp: 800, condition: 100, equipped: true, properties: ["1d4", "finesse"] }); eq.weapon = "starter-dagger"; }
    else if (klass === "Ranger" || klass === "Sylvanoran Warden") { gear.push({ id: "starter-shortbow", name: "Shortbow", qty: 1, weight: 2, valueCp: 3000, condition: 100, equipped: true, properties: ["1d6", "80 ft"] }); eq.weapon = "starter-shortbow"; }
    else { gear.push({ id: "starter-longsword", name: "Longsword", qty: 1, weight: 3, valueCp: 3500, condition: 100, equipped: true, properties: ["1d8", "versatile 1d10"] }); eq.weapon = "starter-longsword"; }
    var callingGear = { Mage: { id: "starter-spellbook", name: "Apprentice Spellbook & Arcane Focus", qty: 1, weight: 1.5, valueCp: 1200, condition: 100, equipped: false, properties: ["focus", "notes"] }, Cleric: { id: "starter-holy-symbol", name: "Holy Symbol & Healer Kit", qty: 1, weight: 2, valueCp: 1200, condition: 100, equipped: false, properties: ["divine focus", "basic medicine"] }, Paladin: { id: "starter-oath-token", name: "Oath Token", qty: 1, weight: .2, valueCp: 400, condition: 100, equipped: false, properties: ["personal oath focus"] }, Bard: { id: "starter-instrument", name: "Travel Instrument & Songbook", qty: 1, weight: 2, valueCp: 1400, condition: 100, equipped: false, properties: ["performance", "notes"] }, Druid: { id: "starter-druid-focus", name: "Wooden Druidic Focus & Herbal Kit", qty: 1, weight: 2, valueCp: 900, condition: 100, equipped: false, properties: ["nature focus", "herbal tools"] }, Occultist: { id: "starter-occult-kit", name: "Ritual Knife, Ward Chalk & Journal", qty: 1, weight: 2, valueCp: 1000, condition: 100, equipped: false, properties: ["ritual tools", "warding"] }, Battlesmith: { id: "starter-smith-tools", name: "Apprentice Smith Tools", qty: 1, weight: 6, valueCp: 1800, condition: 100, equipped: false, properties: ["repair tools"] }, "Sylvanoran Warden": { id: "starter-warden-kit", name: "Warden Field Kit", qty: 1, weight: 2, valueCp: 1000, condition: 100, equipped: false, properties: ["trail markers", "field care"] }, "Wyrm Hunter": { id: "starter-wyrm-kit", name: "Wyrm Hunter Field Kit", qty: 1, weight: 3, valueCp: 1400, condition: 100, equipped: false, properties: ["scale scraper", "wind pennant", "field journal"] } };
    if (callingGear[klass]) gear.push(callingGear[klass]);
    var realmGear = { Aurelia: { id: "realm-aurelia-cloak", name: "Aurelian Road Cloak", qty: 1, weight: 2, valueCp: 800, condition: 100, equipped: false, properties: ["weather-resistant"] }, Stonehold: { id: "realm-stonehold-lantern", name: "Stonehold Mining Lantern", qty: 1, weight: 2, valueCp: 1200, condition: 100, equipped: false, properties: ["hooded", "8h oil"] }, Sylvanor: { id: "realm-sylvanor-pouch", name: "Sylvanoran Herbal Pouch", qty: 1, weight: 1, valueCp: 1000, condition: 100, equipped: false, properties: ["field herbs", "foraging kit"] }, Drakmor: { id: "realm-drakmor-cloak", name: "Fur-Lined Drakmoran Cloak", qty: 1, weight: 4, valueCp: 1800, condition: 100, equipped: false, properties: ["cold-weather"] }, Sunscar: { id: "realm-sunscar-water", name: "Sunscar Water Kit", qty: 1, weight: 4, valueCp: 1400, condition: 100, equipped: false, properties: ["2 extra waterskins", "desert veil"] }, Velkar: { id: "realm-velkar-oilskin", name: "Velkar Oilskin Coat", qty: 1, weight: 3, valueCp: 1500, condition: 100, equipped: false, properties: ["rain-resistant", "sea-spray resistant"] }, "Umbral Reach": { id: "realm-umbral-ward", name: "Ash-Ward Charm", qty: 1, weight: .2, valueCp: 2000, condition: 100, equipped: false, properties: ["minor ward", "ash filter scarf"] } };
    if (realmGear[start.name]) gear.push(realmGear[start.name]);
    V["inventory"] = gear; V["equipment"] = eq; V["player-money-cp"] = start.purseCp; V["bank-accounts"] = {}; V["financial-assets"] = start.asset ? [start.asset] : [];
    V["world-date"] = "Dawnday, Dawnswell 3, 1247 AR"; V["world-time"] = "08:00 AM"; V["season"] = "Early Spring"; V["weather"] = start.weather || "Clear"; V["moon-phase"] = "Waxing Crescent";
    var settlement = start.settlement || canonicalSettlement(start.place), sub = start.sublocation || embeddedSublocation(start.place) || "Unassigned";
    V["current-location"] = settlement; V["current-sublocation"] = sub; V["current-region"] = start.name; V["player-x"] = start.x; V["player-y"] = start.y;
    var known = {}; known[start.id] = { name: settlement, x: start.x, y: start.y, region: start.name, discovered: true, kind: start.kind, discoveryMethod: "starting location", discoveredDate: "Dawnswell 3, 1247 AR" }; V["known-locations"] = known;
    V["map-discovery-log"] = [{ id: start.id, name: settlement, x: start.x, y: start.y, region: start.name, method: "starting location", date: "Dawnswell 3, 1247 AR" }]; V["map-last-position"] = { x: start.x, y: start.y };
    V["sync-state"] = { lastType: "creation", lastDate: "Dawnday, Dawnswell 3, 1247 AR", lastTime: "08:00 AM", lastSummary: "Creation state initialized", corrections: 0 };
    V["player-avatar"] = Object.assign(lookFromForm(f), { marks: f.marks || "", origin: origin }); V["world3d-state"] = { v: 1, fog: "", slain: {} };
    var msg = ["Begin my adventure using the character I just created.", "", "CHARACTER PROFILE", "Name: " + name, "Age: " + (Number(f.age) || 20), "Sex: " + f.gender, "Ancestry: " + f.species, "Appearance: " + describeLook(f), "Personal Origin: " + origin + " (" + start.name + ")", "Background: " + background, "Starting Calling: " + klass, "Starting Realm: " + start.name, "Starting Settlement: " + settlement, "Starting Sublocation: " + sub, "Coordinates: (" + start.x + ", " + start.y + ")", "Level: 1", "Guild Status: Unregistered", "Starting Purse: " + money(start.purseCp), "Local Asset: " + (start.asset ? start.asset.name + " (" + money(start.asset.valueCp) + " local value)" : "None"), "Realm Provision: " + start.gift, "", "GM: Treat this profile as authoritative. Do not ask me to repeat character creation. Begin naturally at my recorded starting settlement and coordinates, using the established canon for my selected realm. I am playing in the 3D edition: I will walk the world myself, so open with a short scene and leave me free to move."].join("\n");
    V["character-created"] = true;
    var done = function () { api.showToast("Character created. Entering Eldoria…", "success"); try { api.sendMessage(msg); } catch (e) { } props.onDone && props.onDone(); };
    var p = null; try { p = api.patchVariables ? api.patchVariables(V) : null; } catch (e) { p = null; }
    if (p && p.then) p.then(done).catch(function () { setBusy(false); api.showToast("Could not save your character — please try again.", "error"); });
    else { Object.keys(V).forEach(function (k) { api.setVariable(k, V[k]); }); done(); }
  }

  var stepDefs = [[1, "Identity", "Define who you are"], [2, "Calling", "Choose your path"], [3, "Realm", "Where your story begins"]];
  var next = step === 1 ? "Next: Choose Your Calling" : step === 2 ? "Next: Choose Your Realm" : "Begin Your Legend";
  function Arrow(p2) { return <div className="eSel"><button onClick={function () { p2.on(-1); }} aria-label="Previous"><Icon n="ChevronLeft" s={18} /></button><span>{p2.label}</span><button onClick={function () { p2.on(1); }} aria-label="Next"><Icon n="ChevronRight" s={18} /></button>{p2.count ? <em>{p2.count}</em> : null}</div>; }
  return <div className={"eCreator step" + step}>
    <div className="eLogo"><b>ELDORIA</b><small>FROM F-RANK TO LEGEND</small></div>
    <div className="eSteps">{stepDefs.map(function (s) { return <button key={s[0]} className={"eStep" + (step === s[0] ? " on" : step > s[0] ? " done" : "")} onClick={function () { setStep(s[0]); }}><span className="eStepN">{s[0]}</span><span><b>{s[1]}</b><small>{s[2]}</small></span></button>; })}</div>
    <div className="eStage" ref={stageEl}><div className="eStageHint"><Icon n="Rotate3d" s={14} /> Drag to rotate <i>|</i> Scroll to zoom</div></div>
    <section className="ePanel eIdentity">
      <div className="ePanelHead"><Icon n="TreeDeciduous" s={22} /><h2>Identity</h2></div>
      <p className="eLede">Your story begins here. Shape the adventurer who will carve their name into Eldoria.</p>
      <div className="eRow"><label>Name</label><div className="eName"><input value={f.name} maxLength={40} placeholder="Your adventurer's name" onChange={function (e) { set("name", e.target.value); }} /><button title="Random name" onClick={function () { set("name", NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)]); }}><Icon n="Dices" s={18} /></button></div></div>
      <div className="eRow"><label>Age</label><Arrow label={String(f.age)} on={function (d) { set("age", Math.max(16, Math.min(90, Number(f.age) + d))); }} /></div>
      <div className="eRow"><label>Gender</label><div className="eSeg">{[["Male", "User"], ["Female", "UserRound"], ["Non-binary", "Heart"]].map(function (g) { return <button key={g[0]} className={f.gender === g[0] ? "on" : ""} onClick={function () { set("gender", g[0]); }}><Icon n={g[1]} s={15} />{g[0]}</button>; })}</div></div>
      <div className="eRow top"><label>Species</label><div className="ePorts">{["Human", "Elf", "Dwarf", "Half-Elf", "Halfling", "Orc-Blooded"].map(function (s) { return <button key={s} title={SPECIES_INFO[s]} className={"ePort" + (f.species === s ? " on" : "")} onClick={function () { set("species", s); }}>{ports.species[s] ? <img src={ports.species[s]} alt="" /> : <span className="ePortPh" />}<small>{s}</small></button>; })}</div></div>
      <div className="eRow"><label>Origin</label><Arrow label={ORIGINS[f.origin]} on={function (d) { cyc("origin", ORIGINS.length, d); }} /></div>
      <div className="eRow"><label>Background</label><Arrow label={BACKGROUND_OPTIONS[f.background]} on={function (d) { cyc("background", BACKGROUND_OPTIONS.length, d); }} /></div>
      <p className="eHint">{BACKGROUND_INFO[BACKGROUND_OPTIONS[f.background]]}</p>
      <div className="ePanelHead sub"><Icon n="Sparkle" s={20} /><h2>Appearance</h2></div>
      <div className="eFaces">{ports.faces.map(function (u, i) { var idx = (Math.floor(f.face / 5) * 5 + i) % FACE_COUNT; return <button key={i} className={"ePort sq" + (f.face === idx ? " on" : "")} onClick={function () { set("face", idx); }}>{u ? <img src={u} alt="" /> : <span className="ePortPh" />}</button>; })}</div>
      <div className="eRow"><label>Hair</label><Arrow label={HAIR_STYLES[f.hair]} count={(f.hair + 1) + "/" + HAIR_STYLES.length} on={function (d) { cyc("hair", HAIR_STYLES.length, d); }} /></div>
      <div className="eRow"><label>Hair Color</label><div className="eSw">{HAIR_COLORS.map(function (c, i) { return <button key={c} style={{ background: c }} className={f.hairColor === i ? "on" : ""} onClick={function () { set("hairColor", i); }} aria-label={"Hair color " + (i + 1)} />; })}</div></div>
      <div className="eRow"><label>Face</label><Arrow label={"Face " + (f.face + 1)} count={(f.face + 1) + "/" + FACE_COUNT} on={function (d) { cyc("face", FACE_COUNT, d); }} /></div>
      <div className="eRow"><label>Skin Tone</label><div className="eSw">{SKIN_TONES.map(function (c, i) { return <button key={c} style={{ background: c }} className={f.skin === i ? "on" : ""} onClick={function () { set("skin", i); }} aria-label={"Skin tone " + (i + 1)} />; })}</div></div>
      <div className="eRow"><label>Build</label><Arrow label={BUILDS[f.build]} count={(f.build + 1) + "/" + BUILDS.length} on={function (d) { cyc("build", BUILDS.length, d); }} /></div>
      <div className="eRow"><label>Marks</label><input className="eMarks" value={f.marks} maxLength={120} placeholder="Scars, tattoos, eyes… (optional)" onChange={function (e) { set("marks", e.target.value); }} /></div>
    </section>
    <section className="ePanel eAttrs">
      <div className="ePanelHead"><h2>Core Attributes</h2></div>
      <div className="eAttrGrid">{ATTR.map(function (a) { return <div key={a[0]} className="eAttr"><span className="eAttrIc"><Icon n={a[2]} s={16} /></span><span>{a[1]}</span><b>{attrs[a[0]]}</b></div>; })}</div>
    </section>
    <section className="ePanel eSummary">
      <div className="ePanelHead"><h2>Character Summary</h2></div>
      <div className="eSumRow"><span>Level</span><b>1</b></div><div className="eSumRow"><span>XP</span><b>0 / 100</b></div><div className="eSumRow"><span>Guild Rank</span><b>Unregistered</b></div>
      <div className="eSumRow hp"><span><Icon n="Heart" s={14} /> HP</span><b>20</b></div><div className="eSumRow mp"><span><Icon n="Droplet" s={14} /> Mana</span><b>10</b></div><div className="eSumRow sp"><span><Icon n="Zap" s={14} /> Stamina</span><b>20</b></div>
    </section>
    <section className="ePanel eCallings">
      <div className="ePanelHead"><Icon n="Shield" s={20} /><h2>Choose Your Calling</h2></div>
      <p className="eLede">Every legend begins with a calling. You can learn and master other callings later.</p>
      <div className="eCallWrap"><div className="eCallGrid">{COMMON.map(function (k) { return <button key={k} className={"eCall" + (f.klass === k ? " on" : "")} onClick={function () { set("klass", k); if (step < 2) setStep(2); }} title={CLASS_INFO[k]}>{ports.callings[k] ? <img src={ports.callings[k]} alt="" /> : <span className="ePortPh" />}<small>{k}</small></button>; })}</div>
        <div className="eSpecial"><div className="eSpecialHead">Special Paths</div><div className="eCallGrid sp">{SPECIAL.map(function (k) { return <button key={k} className={"eCall tall" + (f.klass === k ? " on" : "")} onClick={function () { set("klass", k); if (step < 2) setStep(2); }} title={CLASS_INFO[k] + " (" + SPECIAL_HINT[k] + ")"}>{ports.callings[k] ? <img src={ports.callings[k]} alt="" /> : <span className="ePortPh" />}<small>{k}</small></button>; })}</div></div></div>
      <p className="eHint"><b>{f.klass}:</b> {CLASS_INFO[f.klass]}</p>
    </section>
    <section className="ePanel eRealms">
      <div className="ePanelHead"><Icon n="Compass" s={20} /><h2>Choose Your Realm</h2></div>
      <p className="eLede">Your homeland shapes your beginning, but the whole of Eldoria is yours to explore.</p>
      <div className="eRealmGrid">{REALM_ORDER.map(function (k) { var r2 = REALM_STARTS[k]; return <button key={k} className={"eRealm" + (f.realm === k ? " on" : "")} onClick={function () { set("realm", k); if (step < 3) setStep(3); }} title={r2.desc}>{ports.realms[k] ? <img src={ports.realms[k]} alt="" /> : <span className="ePortPh" />}<small>{k === "Sunscar" ? "Sunscar Sultanate" : k === "Velkar" ? "Velkar Free Cities" : k === "Stonehold" ? "Stonehold Confederacy" : k === "Drakmor" ? "Drakmor Dominion" : k}</small></button>; })}</div>
      <p className="eHint"><b>{start.place}</b> · ({start.x}, {start.y}) — {start.desc} <em>Purse {money(start.purseCp)}. {start.gift}</em></p>
    </section>
    <button className="eBtn eBack" onClick={function () { if (step > 1) setStep(step - 1); }} disabled={step === 1}><Icon n="ArrowLeft" s={20} /> Back</button>
    <button className="eBtn eNext" disabled={busy} onClick={function () { if (step < 3) setStep(step + 1); else finish(); }}>{busy ? "Entering Eldoria…" : next} <Icon n={step < 3 ? "ArrowRight" : "Swords"} s={20} /></button>
  </div>;
}
