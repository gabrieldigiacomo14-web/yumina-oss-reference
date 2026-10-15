// @ts-nocheck
// Rigged glTF/GLB character support, with the procedural bodies kept as the fallback.
//
//   assets       GLB bytes arrive from a world asset (api.fetchAsset, the only way binary data enters the
//                sandbox), from the optional `world3d-models` manifest variable, or from base64. They are
//                parsed with three.js's own GLTFLoader (vendored in gltf-loader.tsx) and cached as templates.
//   rigs         bones are matched to the 15 joints the game animates by name (Mixamo, Blender "Rigify"/Unreal
//                style, glTF-standard and this game's own export), so any humanoid skeleton works.
//   animation    an AnimationMixer plays the asset's clips: speed-driven idle/walk/run blends, one-shot actions
//                (attack, cast, block, dodge, hit, death...) layered over the legs or the upper body, and
//                gameplay events (hit / release / use) fired on the clip's impact time.
//   faces        blink, jaw and brow morph targets (ARKit and common aliases) are driven for life and combat.
//   equipment    sockets on the hand/back/head bones take the procedural weapons, shields and hoods; asset
//                nodes named hair_*, beard_*, outfit_* act as appearance variants.
//   materials    imported PBR materials are tinted from the character's look and upgraded (sheen, clearcoat).
// Every entry point returns null / false on any problem so callers fall back to the procedural model.
import { T } from "./three";
import { makeGLTFLoader, cloneSkinned } from "./gltf-loader";
import { getMeshoptDecoder } from "./meshopt-decoder";
import { BUILTIN_MODELS } from "./builtin-models";

var CLIP_TABLE = {};
export function bindClipTable(t) { CLIP_TABLE = t || {}; }

// ------------------------------------------------------------------ bones
export var JOINTS = ["hips", "spine", "chest", "neck", "head", "lhip", "lknee", "rhip", "rknee", "lsh", "lel", "lhand", "rsh", "rel", "rhand"];
export function normBone(n) { return String(n || "").toLowerCase().replace(/^.*[:|]/, "").replace(/[^a-z0-9]/g, ""); }
// Bone names are split into tokens (camelCase, separators, Mixamo-style prefixes) and a side (left/right/l/r).
// SYN lists the base names each joint goes by across common rigs.
var SYN = {
  hips: ["hips", "pelvis", "hip"], spine: ["spine", "spine1", "spine01", "abdomen", "torso"], chest: ["chest", "spine2", "spine02", "upperchest", "spine3", "spine03"], neck: ["neck", "neck1", "neck01"], head: ["head"],
  hip: ["upleg", "upperleg", "thigh", "legupper", "upleg1"], knee: ["leg", "lowerleg", "calf", "shin", "leglower"], sh: ["arm", "upperarm", "armupper"], el: ["forearm", "lowerarm", "armlower"], hand: ["hand"]
};
function tokens(name) { var raw = String(name || "").replace(/^.*[:|]/, ""); return raw.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[^A-Za-z0-9]+/).filter(Boolean).map(function (t) { return t.toLowerCase(); }); }
function parseBone(name) { var tk = tokens(name); var side = null; var rest = []; tk.forEach(function (t, i) { if ((t === "left" || t === "l") && (side === null)) side = "l"; else if ((t === "right" || t === "r") && (side === null)) side = "r"; else rest.push(t); }); return { side: side, base: rest.join("") }; }
export function findBones(root) {
  var bones = []; root.traverse(function (o) { if (o.isBone) bones.push(o); }); if (!bones.length) { root.traverse(function (o) { if (o.isSkinnedMesh && o.skeleton) o.skeleton.bones.forEach(function (b) { if (bones.indexOf(b) < 0) bones.push(b); }); }); }
  var info = bones.map(function (b) { var p = parseBone(b.name); return { b: b, side: p.side, base: p.base, raw: String(b.name).toLowerCase() }; }); var out = {}; var used = {};
  // 1. this game's own export names the joints exactly
  JOINTS.forEach(function (j) { var e = info.find(function (x) { return x.raw === j; }); if (e) { out[j] = e.b; used[e.b.uuid] = 1; } });
  function take(joint, test) { if (out[joint]) return true; for (var i = 0; i < info.length; i++) { var e = info[i]; if (used[e.b.uuid]) continue; if (test(e)) { out[joint] = e.b; used[e.b.uuid] = 1; return true; } } return false; }
  function depth(b) { var d = 0; while (b.parent && d < 60) { d++; b = b.parent; } return d; }
  if (!out.hips) { for (var i = 0; i < SYN.hips.length && !out.hips; i++) take("hips", function (e) { return !e.side && e.base === SYN.hips[i]; }); if (!out.hips) take("hips", function (e) { return !e.side && /^(pelvis|hips?|root)/.test(e.base) && !/leg|thigh/.test(e.base); }); }
  take("head", function (e) { return !e.side && e.base === "head"; }); take("neck", function (e) { return !e.side && /^neck\d*$/.test(e.base); });
  if (!out.spine || !out.chest) {
    var sp = info.filter(function (e) { return !e.side && /^(spine|chest|abdomen|torso|upperchest)\d*$/.test(e.base) && !used[e.b.uuid]; }).sort(function (x, y) { return depth(x.b) - depth(y.b); });
    if (!out.spine && sp.length) { out.spine = sp[0].b; used[sp[0].b.uuid] = 1; }
    if (!out.chest) { var last = sp.filter(function (e) { return e.b !== out.spine; }); if (last.length) { out.chest = last[last.length - 1].b; used[out.chest.uuid] = 1; } else if (out.spine) out.chest = out.spine; }
  }
  ["l", "r"].forEach(function (sd) {
    function pick(joint, names, bad) { return take(sd + joint, function (e) { return e.side === sd && names.indexOf(e.base.replace(/\d+$/, "")) >= 0 && !(bad && bad.test(e.base)); }); }
    pick("hip", SYN.hip); pick("knee", SYN.knee); pick("sh", SYN.sh); pick("el", SYN.el); pick("hand", SYN.hand);
  });
  var missing = JOINTS.filter(function (j) { return !out[j]; }); return { map: out, missing: missing, count: bones.length };
}

// ------------------------------------------------------------------ templates
var TEMPLATES = {}; var STATUS = {};
export function status() { return STATUS; }
export function has(key) { return !!TEMPLATES[key]; }
export function unregister(key) { delete TEMPLATES[key]; delete STATUS[key]; }
export function keys() { return Object.keys(TEMPLATES); }
function metaOf(scene) { var meta = {}; scene.traverse(function (o) { if (o.name === "EldoriaMeta" && o.userData) meta = Object.assign(meta, o.userData); }); if (scene.userData && scene.userData.eldoria) meta = Object.assign(meta, scene.userData.eldoria); return meta; }
function clipName(n) { return String(n || "").toLowerCase().replace(/^.*[|:]/, "").replace(/[^a-z0-9]/g, ""); }
// synonyms for each gameplay animation, tried in order against the normalised clip name
var CLIP_SYN = {
  idle: ["idle", "idle01", "standing", "stand", "breathingidle", "idleneutral"], combat: ["combatidle", "fightidle", "idlecombat", "battleidle", "readyidle", "idlearmed"], walk: ["walk", "walking", "walkforward", "walkfwd"], run: ["run", "running", "sprint", "runforward", "jog"],
  slash: ["slash", "attack", "attack01", "attackslash", "swordslash", "swing", "melee", "attackmelee"], smash: ["smash", "attackheavy", "overhead", "heavyattack", "attack02", "slam"], thrust: ["thrust", "stab", "attackthrust", "spear", "lunge"], punch: ["punch", "attackunarmed", "jab", "unarmed", "kick"],
  bow: ["bow", "shoot", "drawbow", "aim", "attackbow", "archer"], cast: ["cast", "castspell", "spell", "magic", "casting"], staffCast: ["staffcast", "castspellstaff", "staff"], castUp: ["castup", "channel", "heal", "raise", "buff", "praying"],
  drink: ["drink", "potion", "consume", "eat"], hit: ["hit", "hitreact", "hitreaction", "reacthit", "gethit", "damage", "flinch", "hurt"], dodge: ["dodge", "roll", "evade", "sidestep", "dive"], block: ["block", "guard", "defend", "shield"],
  death: ["death", "die", "dying", "dead", "fall", "knockdown"], cheer: ["cheer", "victory", "celebrate", "triumph"], talk: ["talk", "talking", "conversation", "gesture", "speak"], wave: ["wave", "greet", "hello"], throw: ["throw", "toss", "hurl"],
  sit: ["sit", "sitting", "seated", "sitidle"], crossArms: ["crossarms", "armscrossed", "guardstance", "standingarmscrossed"]
};
function resolveClips(animations) {
  var by = {}; animations.forEach(function (c) { by[clipName(c.name)] = c; }); var out = {}; var names = Object.keys(by);
  Object.keys(CLIP_SYN).forEach(function (k) { for (var i = 0; i < CLIP_SYN[k].length; i++) { var s = CLIP_SYN[k][i]; if (by[s]) { out[k] = by[s]; return; } } for (var j = 0; j < names.length; j++) { var nm = names[j]; if (CLIP_SYN[k].some(function (s2) { return nm.indexOf(s2) === 0 && s2.length >= 4; })) { out[k] = by[nm]; return; } } });
  // exact gameplay names (this game's own export) win
  animations.forEach(function (c) { var n = String(c.name || ""); if (CLIP_SYN[n]) out[n] = c; });
  return out;
}
// Parse GLB bytes into a template. Resolves {key, bones, missing, clips, morphs, variants} or rejects with a message.
export function register(key, bytes, opts) {
  opts = opts || {}; var THREE = T();
  return new Promise(function (resolve, reject) {
    try {
      var head4 = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength || 0)); var magic = String.fromCharCode.apply(null, head4); if (magic !== "glTF" && !(head4[0] === 0x7b)) { STATUS[key] = { ok: false, error: "not a glTF or GLB file" }; reject(new Error(key + ": not a glTF or GLB file")); return; }
      var Loader = makeGLTFLoader(THREE); var loader = new Loader(); loader.setMeshoptDecoder(getMeshoptDecoder()); /* gltfpack-compressed assets (EXT_meshopt_compression) */
      loader.parse(bytes, "", function (gltf) {
        try {
          var scene = gltf.scene || gltf.scenes[0]; var found = findBones(scene); var meta = Object.assign(metaOf(scene), opts.meta || {}); var clips = resolveClips(gltf.animations || []);
          var morphs = {}; scene.traverse(function (o) { if (o.morphTargetDictionary) Object.keys(o.morphTargetDictionary).forEach(function (m) { morphs[m] = 1; }); });
          var skinned = 0; scene.traverse(function (o) { if (o.isSkinnedMesh) skinned++; });
          if (!skinned || found.missing.length > 6) { var why = !skinned ? "no skinned mesh" : "only " + (15 - found.missing.length) + "/15 humanoid bones matched (missing " + found.missing.join(",") + ")"; if (!opts.allowPartial) { STATUS[key] = { ok: false, error: why }; reject(new Error(key + ": " + why)); return; } }
          TEMPLATES[key] = { scene: scene, animations: gltf.animations || [], clips: clips, meta: meta, bones: found, opts: opts };
          STATUS[key] = { ok: true, bones: found.count, matched: 15 - found.missing.length, missing: found.missing, clips: Object.keys(clips), morphs: Object.keys(morphs).length, bytes: bytes.byteLength || 0 };
          resolve(STATUS[key]);
        } catch (e) { STATUS[key] = { ok: false, error: String(e && e.message || e) }; reject(e); }
      }, function (err) { var msg = String(err && err.message || err); STATUS[key] = { ok: false, error: msg }; reject(new Error(key + ": " + msg)); });
    } catch (e) { STATUS[key] = { ok: false, error: String(e && e.message || e) }; reject(e); }
  });
}
function b64ToBuf(b64) { var bin = atob(b64); var u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
// manifest: { "humanoid": { "asset": "@asset:uuid" }, "humanoid-female": {...}, "creature:canine": {...}, "humanoid-test": { "b64": "..." } }
export function loadManifest(api, manifest) {
  var keys0 = manifest && typeof manifest === "object" ? Object.keys(manifest) : []; if (!keys0.length) return Promise.resolve({});
  var jobs = keys0.map(function (k) {
    var e = manifest[k] || {}; var sig = JSON.stringify([e.asset || null, e.b64 ? e.b64.length : 0]); if (TEMPLATES[k] && TEMPLATES[k].sig === sig) return Promise.resolve(STATUS[k]); /* already loaded */ var get = e.b64 ? Promise.resolve(b64ToBuf(e.b64)) : e.asset && api && api.fetchAsset ? api.fetchAsset(e.asset).then(function (r) { if (!r || !r.ok) throw new Error("asset " + e.asset + ": " + (r && r.error || "unavailable")); return r.bytes; }) : Promise.reject(new Error("no asset or b64"));
    return get.then(function (bytes) { return register(k, bytes, { meta: e.meta, allowPartial: !!e.allowPartial, scale: e.scale, tint: e.tint }).then(function (r) { if (TEMPLATES[k]) TEMPLATES[k].sig = sig; return r; }); }).catch(function (err) { STATUS[k] = { ok: false, error: String(err && err.message || err) }; return null; });
  });
  return Promise.all(jobs).then(function () { return STATUS; });
}
// The models to load: the built-in ones shipped with the world (unless the player chose the classic look), then the
// world3d-models variable, whose entries replace a slot (null or {disabled:true} removes it).
export function manifestFor(variables, prefs) {
  var m = {}; if (!(prefs && prefs.classic)) Object.keys(BUILTIN_MODELS).forEach(function (k) { m[k] = { b64: BUILTIN_MODELS[k], builtin: true }; });
  var v = variables && variables["world3d-models"]; if (v && typeof v === "object") Object.keys(v).forEach(function (k) { if (v[k] === null || (v[k] && v[k].disabled)) delete m[k]; else m[k] = v[k]; });
  return m;
}
// which template should dress this look? gender-specific first, then the generic humanoid
export function pick(look) { if (look && look.procedural) return null; var g = String(look && look.gender || "").toLowerCase(); var order = [g ? "humanoid-" + g : null, "humanoid"].filter(Boolean); for (var i = 0; i < order.length; i++) if (TEMPLATES[order[i]]) return order[i]; return null; }
export function pickCreature(mon, arch) { var o = ["creature:" + mon.id, "creature:" + mon.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), "creature:" + arch]; for (var i = 0; i < o.length; i++) if (TEMPLATES[o[i]]) return o[i]; return null; }

// ------------------------------------------------------------------ materials
// "@main" / "@cloth" / "@trim" / "@cape" in a material name take that colour from the character's calling palette; "@none" keeps the texture
var TAG_COLOR = { main: "main", cloth: "cloth", trim: "trim", cape: "cape" };
function tintFor(look, role, name) { var t = /@(\w+)/.exec(String(name || "")); if (t) return TAG_COLOR[t[1]] ? look[TAG_COLOR[t[1]]] || null : null; return role === "skin" ? look.skin : role === "hair" ? look.hair : null; }
var ROLE_RE = [["eye", /eye|iris|cornea/], ["hair", /hair|beard|brow|lash|moustache|mustache/], ["skin", /skin|face|head|body|hand|arm|leg|torso|flesh/], ["metal", /metal|armou?r|steel|iron|plate|mail|buckle|blade/], ["cloth", /cloth|fabric|cloak|cape|robe|tunic|shirt|pants|trouser|linen|wool|leather|boot|glove/]];
export function roleOf(name) { var n = String(name || "").toLowerCase(); for (var i = 0; i < ROLE_RE.length; i++) if (ROLE_RE[i][1].test(n)) return ROLE_RE[i][0]; return "other"; }
// Upgrade and tint the (cloned) materials of one character. Each clone gets its own material so tints do not leak.
// Dressed materials are shared between characters that end up with the same tint (one shader setup, far less memory).
var SHARED = {};
export function dressMaterials(obj, look, quality) {
  var THREE = T(); look = look || {}; var done = {}; var hi = quality !== "low";
  obj.traverse(function (o) {
    if (!o.isMesh) return; var arr = Array.isArray(o.material) ? o.material : [o.material]; var next = arr.map(function (m) {
      if (!m) return m; if (done[m.uuid]) return done[m.uuid]; var role = roleOf(m.name + " " + o.name);
      var skey = m.uuid + "|" + (look.__noTint ? "" : tintFor(look, role, m.name) || "") + "|" + hi + "|" + !!look.__exactTint; if (SHARED[skey]) { done[m.uuid] = SHARED[skey]; return SHARED[skey]; }
      var c = m.clone(); c.name = m.name;
      if (c.isMeshStandardMaterial && hi && (role === "skin" || role === "cloth" || role === "eye") && THREE.MeshPhysicalMaterial) { var p = new THREE.MeshPhysicalMaterial(); THREE.MeshStandardMaterial.prototype.copy.call(p, c); if (role === "skin") { p.sheen = 0.35; p.sheenRoughness = 0.5; p.sheenColor = new THREE.Color(0xffd8c0); p.roughness = Math.max(0.45, Math.min(0.7, c.roughness)); } else if (role === "cloth") { p.sheen = 0.5; p.sheenRoughness = 0.8; p.sheenColor = new THREE.Color(0xffffff); } else if (role === "eye") { p.clearcoat = 1; p.clearcoatRoughness = 0.05; p.roughness = 0.15; } c = p; c.name = m.name; }
      if (c.isMeshStandardMaterial) { c.envMapIntensity = role === "metal" ? 1.4 : 0.9; if (role === "metal") { c.metalness = Math.max(c.metalness, 0.7); c.roughness = Math.min(c.roughness, 0.5); } }
      var tint = look.__noTint ? null : tintFor(look, role, m.name); if (tint && c.color) { var base = new THREE.Color(tint); if (c.map && !look.__exactTint) { /* multiply onto the albedo, keeping its detail: normalise so mid-tones stay readable */ base.lerp(new THREE.Color(0xffffff), 0.35); } else if (role === "skin") { /* the painted skin carries its own redness: take some saturation out of the flat creator swatch */ var lum = base.r * 0.3 + base.g * 0.59 + base.b * 0.11; base.lerp(new THREE.Color(lum, lum, lum), 0.22).multiplyScalar(1.08); } c.color.copy(base); }
      if (c.alphaMap || (c.map && role === "hair")) { c.alphaTest = c.alphaTest || 0.5; c.side = THREE.DoubleSide; }
      done[m.uuid] = c; SHARED[skey] = c; return c;
    }); o.material = Array.isArray(o.material) ? next : next[0]; o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
  });
}

// ------------------------------------------------------------------ appearance variants (hair_*, beard_*, outfit_*)
// hairstyles the asset does not model borrow the closest one it does
var HAIR_MAP = { sweptback: "shortcrop", shavedsides: "shortcrop", buzzcut: "shortcrop", hooded: "shortcrop", curlymop: "messylayered", longwavy: "longstraight", warriorbraids: "braided" };
var HAIR = ["Messy Layered", "Short Crop", "Long Straight", "Swept Back", "Braided", "Ponytail", "Topknot", "Shaved Sides", "Curly Mop", "Long Wavy", "Warrior Braids", "Bald", "Buzz Cut", "Hooded"];
function applyVariants(root, look) {
  var groups = {}; root.traverse(function (o) { var m = /^(hair|beard|brow|outfit|armor|armour|hood|helm)[_.\- ]*(.*)$/i.exec(o.name || ""); if (!m || o === root) return; var g = m[1].toLowerCase().replace("armour", "armor"); (groups[g] = groups[g] || []).push({ o: o, tag: m[2].toLowerCase() }); });
  var info = { groups: Object.keys(groups) };
  if (groups.hair) { var want = String(look.hairStyle || "").toLowerCase().replace(/[^a-z0-9]/g, ""); if (!groups.hair.some(function (e) { return e.tag.replace(/[^a-z0-9]/g, "") === want; }) && HAIR_MAP[want]) want = HAIR_MAP[want]; var idx = Math.max(0, HAIR.indexOf(look.hairStyle)); var any = groups.hair.some(function (e) { return e.tag.replace(/[^a-z0-9]/g, "") === want; }); groups.hair.forEach(function (e, i) { e.o.visible = look.hairStyle === "Bald" ? false : any ? e.tag.replace(/[^a-z0-9]/g, "") === want : i === idx % groups.hair.length; }); }
  if (groups.beard) groups.beard.forEach(function (e, i) { e.o.visible = !!look.beard && i === 0; });
  var armor = look.armor || "light"; var armorGroup = groups.outfit || groups.armor;
  if (armorGroup) { var re = armor === "heavy" ? /heavy|plate|knight/ : armor === "medium" ? /medium|mail|leather|brigand/ : armor === "robe" ? /robe|mage|cleric/ : armor === "bare" ? /^bare|^$/ : /light|cloth|tunic|common|travel/; var hit = false; armorGroup.forEach(function (e) { var ok = re.test(e.tag) || (armor === "bare" && e.tag === ""); if (ok) hit = true; e.o.visible = ok; }); if (!hit) armorGroup.forEach(function (e, i) { e.o.visible = i === 0; }); }
  // skin the visible outfit covers is not drawn at all (no poke-through when limbs bend, fewer triangles)
  var hide = {}; root.traverse(function (o) { if (o.visible && o.userData && o.userData.hide && /^outfit/i.test(o.name || "")) String(o.userData.hide).split(",").forEach(function (p) { hide[p] = 1; }); });
  root.traverse(function (o) { if (!o.isMesh) return; var mn = o.material && o.material.name || ""; var mm = /^skin#(\w+)/.exec(mn); if (mm) o.visible = !hide[mm[1]]; });
  info.hidden = Object.keys(hide);
  return info;
}

// Variants and covered skin this character does not show are removed outright: fewer objects to traverse, skin and draw.
function prune(root) { var gone = []; root.traverse(function (o) { if (o !== root && o.visible === false && (o.isMesh || /^(hair|beard|outfit|armor)/i.test(o.name || ""))) gone.push(o); }); gone.forEach(function (o) { if (o.parent) o.parent.remove(o); }); return gone.length; }

// ------------------------------------------------------------------ building a character from a template
var SPECIES_SCALE = { Dwarf: 0.9, Halfling: 0.74, Elf: 1.02, "Orc-Blooded": 1.05 };
function splitClip(THREE, clip, upperNames, mask) {
  var up = [], lo = []; clip.tracks.forEach(function (t) { var node = t.name.split(".")[0]; (upperNames[node] ? up : lo).push(t); });
  return { up: up.length ? new THREE.AnimationClip(clip.name + ":up", clip.duration, up) : null, lo: lo.length ? new THREE.AnimationClip(clip.name + ":lo", clip.duration, lo) : null };
}
function subtree(root) { var s = {}; root.traverse(function (o) { s[o.name] = 1; }); return s; }
export function build(look, key, deps) {
  var tpl = TEMPLATES[key]; if (!tpl) return null; var THREE = T(); deps = deps || {}; look = look || {};
  var scene = cloneSkinned(THREE, tpl.scene); var found = findBones(scene); var B = found.map; if (!B.hips || !B.head) return null;
  var root = new THREE.Group(); var rig = new THREE.Group(); root.add(rig); rig.add(scene);
  var meta = tpl.meta || {}; var species = look.species; var scale = (look.scale || 1) * (SPECIES_SCALE[species] || 1) * (tpl.opts.scale || meta.scale || 1); rig.scale.setScalar(scale);
  dressMaterials(scene, Object.assign({}, look, { __noTint: !!(tpl.meta && tpl.meta.noTint), __exactTint: !!(tpl.meta && tpl.meta.tinted) }), deps.quality); var variants = applyVariants(scene, look); prune(scene);
  // measure the standing height from the bind pose
  scene.updateMatrixWorld(true); var box = new THREE.Box3().setFromObject(scene); var height = (meta.height || (box.max.y - box.min.y)) * scale; var hipY = B.hips.getWorldPosition(new THREE.Vector3()).y - box.min.y;
  var hs = meta.headSize || [0.205 * 1, 0.25, 0.232];
  var h = { glb: true, key: key, root: root, rig: rig, scene: scene, bones: B, hips: B.hips, spine: B.spine || B.hips, chest: B.chest || B.spine || B.hips, neck: B.neck || null, head: B.head,
    L: { hip: B.lhip, knee: B.lknee }, R: { hip: B.rhip, knee: B.rknee }, LA: { sh: B.lsh, el: B.lel, hand: B.lhand }, RA: { sh: B.rsh, el: B.rel, hand: B.rhand }, cape: null, weapon: null, weaponKind: "none", hipY: hipY, height: height,
    body: { headSize: hs, variants: variants }, t: Math.random() * 10, action: null, actionT: 0, look: look, pose: {}, ph: 0 };
  // sockets: bone + offset, from the asset's metadata (defaults match this game's own export)
  var sockets = meta.sockets || {}; function socket(name, bone, def) { var s = Object.assign({}, def, sockets[name] || {}); var node = scene.getObjectByName("socket_" + name); return { parent: node || bone, pos: s.pos, rot: s.rot, scale: s.scale }; }
  h.sockets = { hand_r: socket("hand_r", B.rhand, { pos: [0, -0.06, 0], rot: [Math.PI - 0.45, 0, 0] }), hand_l: socket("hand_l", B.lhand, { pos: [0, -0.06, 0], rot: [Math.PI, 0, 0] }), shield: socket("shield", B.lel, { pos: [-0.07, -0.16, 0.02], rot: [0, 0.15, Math.PI / 2] }), head: socket("head", B.head, { pos: [0, 0, 0], rot: [0, 0, 0] }), back: socket("back", B.chest || B.spine || B.hips, { pos: [0, -0.01, -0.125], rot: [0.06, 0, 0] }) };
  // weapon and shield from the procedural builders (same shapes the other characters carry)
  if (deps.buildWeapon && look.weapon && look.weapon !== "none") { var w = deps.buildWeapon(look.weapon); if (w) { var bow = look.weapon === "bow"; var sk = bow ? h.sockets.hand_l : h.sockets.hand_r; sk.parent.add(w); w.position.set(sk.pos[0], sk.pos[1], sk.pos[2]); var rest = /staff|spear|bow/.test(look.weapon) ? Math.PI : look.weapon === "lute" ? Math.PI / 2 : Math.PI - 0.45; w.rotation.set(rest, sk.rot[1], sk.rot[2]); w.userData.rest = rest; w.userData.tipY = { sword: 0.92, dagger: 0.4, staff: 1.38, axe: 0.72, hammer: 0.7, mace: 0.7, club: 0.78, spear: 1.68 }[look.weapon]; h.weapon = w; h.weaponKind = look.weapon; } }
  if (deps.buildShield && (look.shield)) { var sh = deps.buildShield(); if (sh) { h.sockets.shield.parent.add(sh); sh.position.set(h.sockets.shield.pos[0], h.sockets.shield.pos[1], h.sockets.shield.pos[2]); sh.rotation.set(h.sockets.shield.rot[0], h.sockets.shield.rot[1], h.sockets.shield.rot[2]); h.shield = sh; } }
  var hood = scene.getObjectByName("hood") || scene.getObjectByName("Hood"); if (hood) { B.head.userData.hood = hood; hood.visible = !!look.hoodUp; }
  // faces
  h.face = { meshes: [], blinkT: 1 + Math.random() * 3, blink: 0, jaw: 0, brow: 0, smile: 0 }; scene.traverse(function (o) { if (o.morphTargetDictionary && o.morphTargetInfluences) h.face.meshes.push(o); });
  // build morphs: build_slender / build_broad ...
  var fem = String(look.gender || "").toLowerCase() === "female" ? 1 : 0; var elf = look.species === "Elf" ? 1 : look.species === "Half-Elf" ? 0.55 : 0;
  h.face.meshes.forEach(function (o) { var d = o.morphTargetDictionary; if (d.female !== undefined) o.morphTargetInfluences[d.female] = fem; if (d.ears_pointed !== undefined) o.morphTargetInfluences[d.ears_pointed] = elf; });
  var bn = "build" + String(look.build || "").toLowerCase().replace(/[^a-z]/g, ""); h.face.meshes.forEach(function (o) { Object.keys(o.morphTargetDictionary).forEach(function (n) { var nn = n.toLowerCase().replace(/[^a-z]/g, ""); if (nn.indexOf("build") === 0) o.morphTargetInfluences[o.morphTargetDictionary[n]] = nn === bn ? 1 : 0; }); });
  // animation set
  setupMixer(h, tpl); return h;
}

// ------------------------------------------------------------------ animation
function setupMixer(h, tpl) {
  var THREE = T(); var mixer = new THREE.AnimationMixer(h.scene); var upper = subtree(h.spine === h.hips ? h.chest : h.spine); h.mix = { mixer: mixer, base: {}, acts: {}, active: null, wt: { idle: 1, walk: 0, run: 0, combat: 0 }, upper: upper, dead: false, tpl: tpl };
  var clips = tpl.clips; var baseKeys = ["idle", "combat", "walk", "run", "sit", "crossArms"];
  baseKeys.forEach(function (k) { var c = clips[k] || (k === "combat" ? clips.idle : null) || (k === "sit" || k === "crossArms" ? null : clips.idle); if (!c) return; var sp = splitClip(THREE, c, upper); var w0 = k === "idle" ? 1 : 0; var ent = { clip: c, up: sp.up ? mixer.clipAction(sp.up) : null, lo: sp.lo ? mixer.clipAction(sp.lo) : null, w: w0 }; [ent.up, ent.lo].forEach(function (a) { if (a) { a.play(); a.setEffectiveWeight(w0); a.setLoop(THREE.LoopRepeat, Infinity); } }); h.mix.base[k] = ent; });
  if (h.mix.base.walk && h.mix.base.walk.clip) h.mix.walkDur = h.mix.base.walk.clip.duration;
}
function actionClipFor(h, name) { var tpl = h.mix.tpl; return tpl.clips[name] || (name === "staffCast" ? tpl.clips.cast : name === "castUp" ? (tpl.clips.cast || null) : name === "smash" || name === "thrust" ? tpl.clips.slash : name === "punch" ? tpl.clips.slash : name === "bow" ? tpl.clips.slash : name === "throw" ? tpl.clips.slash : name === "block" ? tpl.clips.dodge : name === "cheer" || name === "wave" || name === "talk" ? null : null); }
export function mixerPlay(h, name, onEvent) {
  var m = h.mix; if (!m) return false; var THREE = T(); var spec = CLIP_TABLE[name] || { dur: 0.6, mask: "upper+", ev: [] }; var clip = actionClipFor(h, name);
  if (m.active) { endAction(h); }
  if (!clip) { h.action = name; h.actionT = 0; h.onEvent = onEvent || null; h.fired = {}; m.active = { name: name, none: true, dur: spec.dur, spec: spec }; return true; } // no clip: only the timing and events run
  var key = name + "#" + clip.uuid; m.acts[key] = m.acts[key] || (function () { var sp = splitClip(THREE, clip, m.upper); var full = spec.mask === "full" || spec.mask === "upper+"; return { up: sp.up ? m.mixer.clipAction(sp.up) : null, lo: full && sp.lo ? m.mixer.clipAction(sp.lo) : null, clip: clip, full: full }; })();
  var a = m.acts[key]; var ts = spec.dur > 0 && !(m.tpl.meta && m.tpl.meta.retime === false) ? clip.duration / spec.dur : 1; var hold = !!spec.hold;
  [a.up, a.lo].forEach(function (x) { if (!x) return; x.reset(); x.setLoop(hold ? THREE.LoopOnce : THREE.LoopOnce, 1); x.clampWhenFinished = true; x.setEffectiveTimeScale(ts); x.setEffectiveWeight(0); x.play(); });
  m.active = { name: name, a: a, dur: spec.dur, spec: spec, hold: hold, ts: ts }; h.action = name; h.actionT = 0; h.onEvent = onEvent || null; h.fired = {}; return true;
}
function endAction(h) { var m = h.mix; var ac = m.active; if (!ac) return; if (ac.a) { [ac.a.up, ac.a.lo].forEach(function (x) { if (x) { x.stop(); } }); } m.active = null; h.action = null; }
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
export function mixerAnimate(h, dt, st) {
  var m = h.mix; var THREE = T(); st = st || {}; h.t += dt; var sp = Math.max(0, st.speed || 0); var w = Math.min(1, sp), run = Math.min(1, Math.max(0, sp - 1));
  if (st.dead && !m.dead) { m.dead = true; mixerPlay(h, "death"); }
  if (!st.dead && m.dead) { m.dead = false; endAction(h); }
  // locomotion targets
  var idleKey = st.combat && m.base.combat ? "combat" : "idle"; var tgt = { idle: 0, combat: 0, walk: 0, run: 0, sit: 0, crossArms: 0 };
  if (st.sit && m.base.sit) tgt.sit = 1; else if (st.crossArms && m.base.crossArms && w < 0.1) tgt.crossArms = 1; else { tgt[idleKey] = 1 - w; tgt.walk = m.base.walk ? w * (1 - run) : 0; tgt.run = m.base.run ? w * run : 0; if (!m.base.walk) tgt[idleKey] = 1; else if (!m.base.run && run > 0) { tgt.walk = w; } }
  var sum = 0; Object.keys(tgt).forEach(function (k) { if (!m.base[k]) tgt[k] = 0; sum += tgt[k]; }); if (sum <= 0.0001) { var any = m.base.idle ? "idle" : Object.keys(m.base)[0]; tgt[any] = 1; sum = 1; }
  Object.keys(tgt).forEach(function (k) { tgt[k] /= sum; });
  // actions: weights ramp in/out; the upper body (and legs for full-body actions) hand over from the locomotion layer
  var ac = m.active; var aw = 0, awLo = 0;
  if (ac) {
    h.actionT += dt; var t = h.actionT;
    if (ac.spec && ac.spec.ev && h.onEvent) ac.spec.ev.forEach(function (e) { if (t >= e[0] && !h.fired[e[1]]) { h.fired[e[1]] = 1; try { h.onEvent(e[1]); } catch (er) { } } });
    var dur = ac.dur || 0.6; if (t >= dur && !ac.hold) { endAction(h); ac = null; }
    else { aw = ac.hold ? Math.min(1, t / 0.2) : m.tpl.meta && m.tpl.meta.bakedFades ? 1 /* the clip already contains its own fade in and out */ : Math.max(0, Math.min(1, t / 0.08, (dur - t) / 0.12 + 0.0001)); awLo = ac.a && ac.a.lo ? aw : 0; if (ac.none) { aw = 0; awLo = 0; } }
  }
  var rate = Math.min(1, dt * 10);
  Object.keys(m.base).forEach(function (k) { var e = m.base[k]; e.w += (tgt[k] - e.w) * rate; if (e.up) e.up.setEffectiveWeight(e.w * (1 - aw)); if (e.lo) e.lo.setEffectiveWeight(e.w * (1 - awLo)); if (k === "walk" && e.up) { var ts = Math.max(0.6, Math.min(1.5, sp / 1)); e.up.setEffectiveTimeScale(ts); if (e.lo) e.lo.setEffectiveTimeScale(ts); } if (k === "run" && e.up) { var tr = Math.max(0.8, Math.min(1.4, (sp - 1) / 0.8 + 0.6)); e.up.setEffectiveTimeScale(tr); if (e.lo) e.lo.setEffectiveTimeScale(tr); } });
  if (ac && ac.a) { if (ac.a.up) ac.a.up.setEffectiveWeight(aw); if (ac.a.lo) ac.a.lo.setEffectiveWeight(awLo); }
  // keep the walk and run cycles in phase while they blend (no foot sliding)
  var bw = m.base.walk, br = m.base.run; if (bw && br && bw.up && br.up && bw.w > 0.02 && br.w > 0.02 && bw.up.getClip().duration > 0) { var ph = bw.up.time / bw.up.getClip().duration; br.up.time = ph * br.up.getClip().duration; if (br.lo && bw.lo) br.lo.time = ph * br.lo.getClip().duration; }
  m.mixer.update(dt);
  faceTick(h, dt, st);
  if (h.weapon && h.weapon.userData.orb) h.weapon.userData.orb.material.emissiveIntensity = 1.1 + Math.sin(h.t * 3) * 0.4 + (h.action === "staffCast" || h.action === "cast" ? 2.5 : 0);
}
function setMorph(h, names, v) { h.face.meshes.forEach(function (o) { names.forEach(function (n) { var i = o.morphTargetDictionary[n]; if (i !== undefined) o.morphTargetInfluences[i] = v; }); }); }
var BLINK = ["eyeBlinkLeft", "eyeBlinkRight", "blink", "Blink", "eyesClosed", "EyesClosed", "blink_L", "blink_R"], JAW = ["jawOpen", "JawOpen", "mouthOpen", "MouthOpen", "viseme_aa", "aa"], BROW = ["browDownLeft", "browDownRight", "browDown", "angry", "Angry"], SMILE = ["mouthSmileLeft", "mouthSmileRight", "smile", "Smile", "happy"], WINCE = ["wince", "mouthFrownLeft", "mouthFrownRight", "sad", "Sad", "eyeSquintLeft", "eyeSquintRight"];
function faceTick(h, dt, st) {
  var f = h.face; if (!f || !f.meshes.length) return; f.blinkT -= dt; if (f.blinkT <= 0) { f.blink = 1; f.blinkT = 2.2 + Math.random() * 4; } f.blink = Math.max(0, f.blink - dt * 8); var blink = h.action === "death" ? 1 : Math.sin(Math.min(1, f.blink) * Math.PI);
  var talk = h.action === "talk" || st.talking; var jawT = talk ? 0.25 + Math.abs(Math.sin(h.t * 11)) * 0.3 * (0.5 + 0.5 * Math.sin(h.t * 3)) : (h.action === "bow" || /slash|smash|thrust|punch/.test(h.action || "")) ? 0.18 : h.action === "hit" ? 0.5 : 0; f.jaw += (jawT - f.jaw) * Math.min(1, dt * 14);
  var browT = (st.combat || /slash|smash|thrust|punch|bow|cast/.test(h.action || "")) ? 0.7 : 0; f.brow += (browT - f.brow) * Math.min(1, dt * 8); var smileT = st.calm && !st.combat && !talk ? 0.25 : h.action === "cheer" ? 1 : 0; f.smile += (smileT - f.smile) * Math.min(1, dt * 5);
  var wince = h.action === "hit" ? 1 : 0; setMorph(h, BLINK, blink); setMorph(h, JAW, f.jaw); setMorph(h, BROW, f.brow); setMorph(h, SMILE, f.smile); setMorph(h, WINCE, wince);
}
// where gameplay should aim: world position of a joint
export function jointWorld(h, joint, out) { var THREE = T(); out = out || new THREE.Vector3(); (h.bones[joint] || h.hips).getWorldPosition(out); return out; }
export function dispose(h) { if (h.mix) { h.mix.mixer.stopAllAction(); h.mix.mixer.uncacheRoot(h.scene); } }

// ------------------------------------------------------------------ creatures
export function buildCreature(key, mon, opts) {
  var tpl = TEMPLATES[key]; if (!tpl) return null; var THREE = T(); var scene = cloneSkinned(THREE, tpl.scene); var root = new THREE.Group(); var rig = new THREE.Group(); root.add(rig); rig.add(scene); rig.scale.setScalar(tpl.opts.scale || (tpl.meta && tpl.meta.scale) || 1);
  dressMaterials(scene, { skin: null }, opts && opts.quality); scene.updateMatrixWorld(true); var box = new THREE.Box3().setFromObject(scene); var h = { glb: true, creature: true, key: key, root: root, rig: rig, scene: scene, height: box.max.y - box.min.y, t: Math.random() * 10, action: null, actionT: 0, pose: {}, ph: 0, bones: {}, face: { meshes: [] }, look: {}, hips: null };
  var mixer = new THREE.AnimationMixer(scene); h.mix = { mixer: mixer, base: {}, acts: {}, active: null, wt: {}, upper: {}, dead: false, tpl: tpl };
  ["idle", "combat", "walk", "run"].forEach(function (k) { var c = tpl.clips[k] || (k === "combat" ? tpl.clips.idle : null); if (!c) return; var a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(k === "idle" ? 1 : 0); h.mix.base[k] = { clip: c, up: a, lo: null, w: k === "idle" ? 1 : 0 }; });
  return h;
}
