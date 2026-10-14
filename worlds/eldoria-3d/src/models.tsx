// @ts-nocheck
// Characters and creatures. Every humanoid is a small rig of pivot groups so the
// same builder serves the creator preview, the player, companions, townsfolk and
// humanoid monsters. Creatures are archetypes chosen from bestiary names.
import { T, hex, glowTex } from "./three";
import { hashStr, rng } from "./worldgen";

export var SKIN_TONES = ["#f1d2b6", "#e3b48f", "#c98e64", "#9a6a45", "#5e3d2a"];
export var HAIR_COLORS = ["#1c1a1a", "#4a2e1d", "#c7a46a", "#8a2c1c", "#c9c6c2"];
export var HAIR_STYLES = ["Messy Layered", "Short Crop", "Long Straight", "Swept Back", "Braided", "Ponytail", "Topknot", "Shaved Sides", "Curly Mop", "Long Wavy", "Warrior Braids", "Bald", "Buzz Cut", "Hooded"];
export var BUILDS = ["Slender", "Lean", "Athletic", "Sturdy", "Broad"];
export var FACE_COUNT = 12;

// Calling outfits: palette + armor weight + weapon. Mirrors each class entry's starting kit.
export var CALLING_LOOK = {
  "Fighter": { armor: "medium", weapon: "sword", main: "#3b4048", trim: "#9aa3ad", cloth: "#2a3550", cape: "#1f2c48", shield: false },
  "Rogue": { armor: "light", weapon: "dagger", main: "#2a2724", trim: "#5a4a38", cloth: "#1d1d22", cape: "#18181c", hood: true },
  "Ranger": { armor: "light", weapon: "bow", main: "#3d4a2c", trim: "#6b5232", cloth: "#2f3b22", cape: "#2c3a20", hood: true },
  "Mage": { armor: "robe", weapon: "staff", main: "#25305e", trim: "#c6a75a", cloth: "#1c2348", cape: "#1a2050" },
  "Cleric": { armor: "robe", weapon: "mace", main: "#d8d4c8", trim: "#c6a75a", cloth: "#bfb8a8", cape: "#ece6d6" },
  "Paladin": { armor: "heavy", weapon: "sword", main: "#a8a08a", trim: "#d4b25c", cloth: "#e6dcc0", cape: "#d9cfae", shield: true },
  "Barbarian": { armor: "bare", weapon: "axe", main: "#5a3a24", trim: "#7a5a3a", cloth: "#4a3020", cape: null },
  "Monk": { armor: "bare", weapon: "staff", main: "#8a5a2a", trim: "#c08a40", cloth: "#7a4a22", cape: null },
  "Bard": { armor: "light", weapon: "lute", main: "#6a2440", trim: "#d0a858", cloth: "#4a1a30", cape: "#5a1e38" },
  "Druid": { armor: "robe", weapon: "staff", main: "#3a4a24", trim: "#7a6a3a", cloth: "#2e3a1c", cape: "#36421e", hood: true },
  "Occultist": { armor: "robe", weapon: "dagger", main: "#2a1a34", trim: "#9a5ac0", cloth: "#1e1226", cape: "#24142e", hood: true },
  "Battlesmith": { armor: "heavy", weapon: "hammer", main: "#5a4a3a", trim: "#c08a3a", cloth: "#3a2e24", cape: null },
  "Sylvanoran Warden": { armor: "light", weapon: "spear", main: "#2e4a32", trim: "#c0b070", cloth: "#22382a", cape: "#2a4a30" },
  "Wyrm Hunter": { armor: "medium", weapon: "spear", main: "#4a5258", trim: "#c0c8d0", cloth: "#3a3e44", cape: "#5a6670" }
};
export var CALLINGS = Object.keys(CALLING_LOOK);

var MATS = {};
function mat(color, opts) {
  var THREE = T(); var key = color + JSON.stringify(opts || {});
  if (MATS[key]) return MATS[key];
  var m = new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(color), roughness: 0.75, metalness: 0 }, opts || {}));
  MATS[key] = m; return m;
}
function metal(color) { return mat(color, { roughness: 0.38, metalness: 0.75 }); }

function mesh(geo, material, x, y, z, sx, sy, sz) { var THREE = T(); var m = new THREE.Mesh(geo, material); m.position.set(x || 0, y || 0, z || 0); if (sx != null) m.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz); m.castShadow = true; m.receiveShadow = false; return m; }
var G = {};
function geo(kind) {
  if (G[kind]) return G[kind]; var THREE = T(), g;
  switch (kind) {
    case "sph": g = new THREE.SphereGeometry(0.5, 16, 12); break;
    case "sphLo": g = new THREE.SphereGeometry(0.5, 10, 7); break;
    case "limb": g = new THREE.CylinderGeometry(0.5, 0.4, 1, 10); g.translate(0, -0.5, 0); break; // hangs down from pivot
    case "limbT": g = new THREE.CylinderGeometry(0.5, 0.36, 1, 10); g.translate(0, -0.5, 0); break;
    case "box": g = new THREE.BoxGeometry(1, 1, 1); break;
    case "cyl": g = new THREE.CylinderGeometry(0.5, 0.5, 1, 12); break;
    case "cone": g = new THREE.ConeGeometry(0.5, 1, 12); break;
    case "cone4": g = new THREE.ConeGeometry(0.5, 1, 4); break;
    case "torso": { var pts = []; var prof = [[0, 0], [0.42, 0.02], [0.47, 0.18], [0.44, 0.42], [0.5, 0.72], [0.52, 0.86], [0.36, 1.0], [0.16, 1.04], [0, 1.04]]; prof.forEach(function (p) { pts.push(new THREE.Vector2(p[0], p[1])); }); g = new THREE.LatheGeometry(pts, 16); break; }
    case "skirt": { var pts2 = [new THREE.Vector2(0.44, 0), new THREE.Vector2(0.5, -0.3), new THREE.Vector2(0.62, -0.75)]; g = new THREE.LatheGeometry(pts2, 16, 0, Math.PI * 2); break; }
    case "hood": g = new THREE.SphereGeometry(0.5, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62); break;
    case "pauldron": g = new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5); break;
    case "cape": { g = new THREE.PlaneGeometry(1, 1, 4, 8); g.translate(0, -0.5, 0); var p = g.attributes.position; for (var i = 0; i < p.count; i++) { var x = p.getX(i); p.setZ(i, -Math.cos(x * Math.PI) * 0.12); } g.computeVertexNormals(); break; }
    case "blade": { var s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0.5, 0.9); s.lineTo(0, 1); s.lineTo(-0.5, 0.9); s.lineTo(-0.5, 0); g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false }); g.translate(0, 0, -0.06); break; }
    case "ear": g = new THREE.ConeGeometry(0.5, 1, 6); break;
    case "torus": g = new THREE.TorusGeometry(0.5, 0.06, 6, 18); g.rotateX(Math.PI / 2); break;
    case "wing": { var s2 = new THREE.Shape(); s2.moveTo(0, 0); s2.lineTo(1, 0.15); s2.lineTo(0.85, -0.25); s2.lineTo(0.6, -0.15); s2.lineTo(0.45, -0.4); s2.lineTo(0.25, -0.2); s2.lineTo(0, -0.35); s2.lineTo(0, 0); g = new THREE.ShapeGeometry(s2); break; }
    default: throw new Error(kind);
  }
  G[kind] = g; return g;
}

function grp(parent, x, y, z) { var THREE = T(); var g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; }

// ------------------------------------------------------------------ humanoid
// look: {skin, hair, hairStyle, build, species, gender, face, calling, cloth/main/trim overrides, weapon, armor, scale, beard}
export function makeHumanoid(look) {
  var THREE = T(); look = look || {};
  var cl = CALLING_LOOK[look.calling] || CALLING_LOOK.Fighter;
  var main = look.main || cl.main, trim = look.trim || cl.trim, cloth = look.cloth || cl.cloth, capeC = look.cape === null ? null : (look.cape || cl.cape);
  var armor = look.armor || cl.armor, weapon = look.weapon || cl.weapon;
  var buildI = Math.max(0, BUILDS.indexOf(look.build || "Athletic")); var bw = [0.86, 0.93, 1.0, 1.08, 1.17][buildI];
  var species = look.species || "Human"; var female = look.gender === "Female";
  var height = (look.scale || 1) * (species === "Dwarf" ? 0.78 : species === "Halfling" ? 0.66 : species === "Elf" ? 1.05 : species === "Orc-Blooded" ? 1.08 : 1);
  if (species === "Dwarf") bw *= 1.22; if (species === "Orc-Blooded") bw *= 1.12; if (female) bw *= 0.9;
  var skinC = look.skin || SKIN_TONES[1]; if (species === "Orc-Blooded" && !look.skinSet) skinC = "#7d8a5a";
  var skin = mat(skinC, { roughness: 0.62 }), hairM = mat(look.hair || HAIR_COLORS[1], { roughness: 0.85 });
  var mainM = armor === "heavy" || armor === "medium" ? metal(main) : mat(main), trimM = metal(trim), clothM = mat(cloth), leather = mat("#3a2a1c"), dark = mat("#141210");
  var root = new THREE.Group(); var rig = grp(root); rig.scale.setScalar(height);
  var hips = grp(rig, 0, 0.98, 0);
  var legH = species === "Dwarf" ? 0.82 : 1;
  // legs
  function leg(side) {
    var hip = grp(hips, side * 0.13 * bw, 0, 0);
    hip.add(mesh(geo("limbT"), armor === "heavy" ? mainM : clothM, 0, 0, 0, 0.19 * bw, 0.47 * legH, 0.2 * bw));
    var knee = grp(hip, 0, -0.47 * legH, 0);
    knee.add(mesh(geo("limb"), clothM, 0, 0, 0, 0.15 * bw, 0.45 * legH, 0.16 * bw));
    var boot = mesh(geo("box"), leather, 0, -0.43 * legH, 0.05, 0.15 * bw, 0.16, 0.28); knee.add(boot);
    var bootTop = mesh(geo("cyl"), leather, 0, -0.32 * legH, 0, 0.17 * bw, 0.18, 0.18 * bw); knee.add(bootTop);
    if (armor === "heavy" || armor === "medium") knee.add(mesh(geo("sphLo"), mainM, 0, 0.0, 0.07, 0.15, 0.13, 0.1));
    return { hip: hip, knee: knee };
  }
  var L = leg(-1), R = leg(1);
  // torso
  var spine = grp(hips, 0, 0.02, 0);
  var torsoM = armor === "bare" ? skin : armor === "robe" ? clothM : mainM;
  var torso = mesh(geo("torso"), torsoM, 0, 0, 0, 0.66 * bw * (female ? 0.92 : 1), 0.66, 0.42 * bw); spine.add(torso);
  if (armor === "bare") { spine.add(mesh(geo("cyl"), leather, 0, 0.06, 0, 0.62 * bw, 0.1, 0.4 * bw)); spine.add(mesh(geo("box"), clothM, 0, -0.08, 0.17 * bw, 0.3 * bw, 0.3, 0.05)); }
  if (armor === "robe") { var sk = mesh(geo("skirt"), clothM, 0, 0.05, 0, bw, 1.08, bw * 0.8); spine.add(sk); spine.add(mesh(geo("cyl"), trimM, 0, 0.08, 0, 0.6 * bw, 0.05, 0.4 * bw)); }
  if (armor === "light" || armor === "medium") { spine.add(mesh(geo("skirt"), armor === "light" ? leather : clothM, 0, 0.06, 0, bw * 0.95, 0.55, bw * 0.75)); }
  if (armor === "heavy") { spine.add(mesh(geo("skirt"), mainM, 0, 0.06, 0, bw * 0.95, 0.45, bw * 0.75)); spine.add(mesh(geo("box"), clothM, 0, -0.1, 0.2 * bw, 0.32, 0.5, 0.04)); }
  // belt + crossed straps (the leather harness of the reference look)
  spine.add(mesh(geo("cyl"), leather, 0, 0.1, 0, 0.64 * bw, 0.07, 0.43 * bw));
  if (armor !== "robe" && armor !== "bare") { var strap = mesh(geo("box"), leather, 0, 0.42, 0.205 * bw, 0.06, 0.78, 0.03); strap.rotation.z = 0.62; spine.add(strap); var strap2 = mesh(geo("box"), leather, 0, 0.42, -0.205 * bw, 0.06, 0.78, 0.03); strap2.rotation.z = -0.62; spine.add(strap2); }
  var chest = grp(spine, 0, 0.62, 0);
  // neck + head
  var neck = grp(chest, 0, 0.06, 0); neck.add(mesh(geo("cyl"), skin, 0, 0.05, 0, 0.13, 0.12, 0.13));
  var head = grp(neck, 0, 0.2, 0.0);
  var face = look.face || 0; var fr = rng(1000 + face * 77);
  var hw = 0.25 * (0.95 + fr() * 0.1), hh = 0.3 * (0.95 + fr() * 0.1);
  head.add(mesh(geo("sph"), skin, 0, 0.02, 0, hw, hh, 0.27));
  head.add(mesh(geo("sphLo"), skin, 0, -0.08, 0.03, hw * 0.78, 0.14, 0.2)); // jaw
  var eyeY = 0.04, eyeX = 0.058 + fr() * 0.01;
  [-1, 1].forEach(function (sd) {
    head.add(mesh(geo("sphLo"), mat("#f4efe6"), sd * eyeX, eyeY, 0.118, 0.042, 0.03, 0.026));
    head.add(mesh(geo("sphLo"), mat(look.eyes || ["#3a5a7a", "#4a3a22", "#3a6a3a", "#5a5a5a"][face % 4]), sd * eyeX, eyeY, 0.128, 0.022, 0.022, 0.014));
    var brow = mesh(geo("box"), hairM, sd * eyeX, eyeY + 0.045 + fr() * 0.01, 0.124, 0.06, 0.012 + (female ? 0 : 0.006), 0.02); brow.rotation.z = sd * (0.12 - fr() * 0.2); head.add(brow);
    if (species === "Elf" || species === "Half-Elf") { var ear = mesh(geo("ear"), skin, sd * hw * 0.5, 0.03, -0.01, 0.035, species === "Elf" ? 0.16 : 0.1, 0.03); ear.rotation.z = -sd * 1.05; ear.rotation.x = -0.25; head.add(ear); }
    else head.add(mesh(geo("sphLo"), skin, sd * hw * 0.48, 0.02, -0.005, 0.03, 0.06, 0.04));
    if (species === "Orc-Blooded") { var tusk = mesh(geo("cone"), mat("#e8e0c8"), sd * 0.04, -0.09, 0.1, 0.018, 0.05, 0.018); head.add(tusk); }
  });
  var nose = mesh(geo("cone4"), skin, 0, 0.0, 0.135, 0.04 + fr() * 0.015, 0.09, 0.05); nose.rotation.x = -1.35; head.add(nose);
  head.add(mesh(geo("box"), mat("#7a4038"), 0, -0.065, 0.122, 0.06, 0.012, 0.012));
  // beard for dwarves (and some men)
  var beard = species === "Dwarf" || (!female && look.beard);
  if (beard) { var bd = mesh(geo("cone"), hairM, 0, -0.14, 0.07, 0.2, species === "Dwarf" ? 0.32 : 0.13, 0.14); bd.rotation.x = Math.PI + 0.2; head.add(bd); head.add(mesh(geo("box"), hairM, 0, -0.05, 0.12, 0.12, 0.03, 0.02)); }
  var hairG = grp(head, 0, 0.01, 0); hairG.scale.setScalar(0.5); buildHair(hairG, look.hairStyle || HAIR_STYLES[0], hairM, female, hw); // hair is authored at 2x head scale
  if (cl.hood && look.hood !== false && armor !== "heavy") { var hd = mesh(geo("hood"), mat(capeC || cloth), 0, 0.02, -0.02, 0.34, 0.37, 0.34); hd.rotation.x = -0.25; head.add(hd); head.userData.hood = hd; hd.visible = !!look.hoodUp; }
  // scarf / cowl like the reference hero
  if (armor === "medium" || armor === "light") { var scarf = mesh(geo("torso"), mat(capeC || cloth), 0, -0.02, 0, 0.42 * bw, 0.18, 0.34 * bw); chest.add(scarf); }
  // arms
  function arm(side) {
    var sh = grp(chest, side * 0.3 * bw * (female ? 0.92 : 1), 0.0, 0);
    if (armor === "heavy" || armor === "medium") { var p = mesh(geo("pauldron"), mainM, side * 0.03, 0.02, 0, 0.27 * bw, 0.22, 0.27 * bw); sh.add(p); sh.add(mesh(geo("torus"), trimM, side * 0.03, 0.0, 0, 0.27 * bw, 0.27 * bw, 0.27 * bw)); }
    sh.add(mesh(geo("limbT"), armor === "bare" ? skin : armor === "robe" ? clothM : clothM, 0, 0, 0, 0.14 * bw, 0.36, 0.14 * bw));
    var el = grp(sh, 0, -0.36, 0);
    el.add(mesh(geo("limb"), armor === "bare" ? skin : (armor === "heavy" || armor === "medium") ? mainM : clothM, 0, 0, 0, 0.125 * bw, 0.32, 0.125 * bw));
    if (armor !== "bare" && armor !== "robe") el.add(mesh(geo("cyl"), leather, 0, -0.2, 0, 0.14 * bw, 0.14, 0.14 * bw));
    var hand = grp(el, 0, -0.36, 0); hand.add(mesh(geo("sphLo"), armor === "heavy" ? mainM : (armor === "medium" ? leather : skin), 0, 0, 0, 0.1, 0.12, 0.08));
    return { sh: sh, el: el, hand: hand };
  }
  var LA = arm(-1), RA = arm(1);
  // cape
  var cape = null;
  if (capeC && look.capeOn !== false) { cape = grp(chest, 0, 0.02, -0.2 * bw); var cm = mesh(geo("cape"), mat(capeC, { side: THREE.DoubleSide, roughness: 0.9 }), 0, 0, 0, 0.6 * bw, 1.25, 1); cape.add(cm); cape.rotation.x = 0.06; }
  // weapon
  var weaponG = buildWeapon(weapon, trimM, leather, mainM);
  var sheath = null;
  if (weaponG) { RA.hand.add(weaponG); weaponG.rotation.x = Math.PI / 2; }
  if (cl.shield || look.shield) { var shield = grp(LA.el, -0.06, -0.22, 0); shield.add(mesh(geo("cyl"), mainM, 0, 0, 0, 0.62, 0.06, 0.62)); shield.add(mesh(geo("cyl"), trimM, 0, 0.035, 0, 0.18, 0.04, 0.18)); shield.rotation.z = Math.PI / 2; shield.rotation.y = Math.PI / 2 * 0.15; }
  root.traverse(function (o) { if (o.isMesh) { o.castShadow = true; } });
  var rigObj = { root: root, rig: rig, hips: hips, spine: spine, chest: chest, head: head, neck: neck, L: L, R: R, LA: LA, RA: RA, cape: cape, weapon: weaponG, weaponKind: weapon, height: 1.85 * height, t: Math.random() * 10, action: null, actionT: 0, look: look };
  return rigObj;
}

function buildHair(head, style, hairM, female, hw) {
  var s = String(style);
  if (s === "Bald" || s === "Hooded") return;
  // a skull cap tilted back so the brow line sits above the eyes and the face stays clear
  var cap = mesh(geo("hood"), hairM, 0, 0.035, -0.012, hw * 2.16, s === "Buzz Cut" ? 0.6 : 0.66, 0.6); cap.rotation.x = -0.62; head.add(cap);
  head.add(mesh(geo("sph"), hairM, 0, 0.02, -0.07, hw * 2.02, 0.56, 0.42)); // back of the head
  if (s === "Buzz Cut") return;
  var r = rng(hashStr(s));
  if (s === "Messy Layered" || s === "Curly Mop") {
    var n = s === "Curly Mop" ? 16 : 11;
    for (var i = 0; i < n; i++) { var a = -Math.PI * 0.9 + (i / (n - 1)) * Math.PI * 1.8 + (r() - 0.5) * 0.2; var m = s === "Curly Mop" ? mesh(geo("sphLo"), hairM, Math.sin(a) * 0.2, 0.17 + r() * 0.05, -Math.cos(a) * 0.17 - 0.02, 0.13, 0.11, 0.13) : mesh(geo("cone"), hairM, Math.sin(a) * 0.17, 0.12, -Math.cos(a) * 0.15 - 0.03, 0.1, 0.24, 0.08); if (s !== "Curly Mop") { m.rotation.set(-Math.cos(a) * 1.9 - 0.3, 0, -Math.sin(a) * 1.9); } head.add(m); }
    for (var k = -2; k <= 2; k++) { var fr = mesh(geo("cone"), hairM, k * 0.05, 0.13, 0.13, 0.06, 0.16, 0.05); fr.rotation.set(2.5, 0, k * 0.25); head.add(fr); } // fringe falling over the brow
  }
  if (s === "Short Crop" || s === "Shaved Sides") head.add(mesh(geo("box"), hairM, 0, 0.21, -0.02, s === "Shaved Sides" ? 0.16 : 0.4, 0.08, 0.4));
  if (s === "Swept Back") head.add(mesh(geo("sph"), hairM, 0, 0.15, -0.09, 0.46, 0.32, 0.52));
  if (s === "Long Straight" || s === "Long Wavy" || (female && s === "Messy Layered")) { head.add(mesh(geo("box"), hairM, 0, -0.14, -0.14, 0.46, 0.6, 0.12)); [-1, 1].forEach(function (sd) { var lk = mesh(geo("box"), hairM, sd * 0.215, -0.08, 0.0, 0.06, 0.44, 0.2); if (s === "Long Wavy") lk.rotation.z = sd * 0.08; head.add(lk); }); }
  if (s === "Ponytail") { var pt = mesh(geo("cone"), hairM, 0, -0.06, -0.27, 0.13, 0.55, 0.13); pt.rotation.x = Math.PI - 0.45; head.add(pt); }
  if (s === "Topknot") head.add(mesh(geo("sph"), hairM, 0, 0.3, -0.05, 0.15, 0.15, 0.15));
  if (s === "Braided" || s === "Warrior Braids") { [-1, 1].forEach(function (sd) { for (var k = 0; k < 5; k++) head.add(mesh(geo("sphLo"), hairM, sd * 0.19, -0.1 - k * 0.085, -0.07, 0.075, 0.095, 0.075)); }); if (s === "Warrior Braids") head.add(mesh(geo("box"), hairM, 0, 0.27, -0.02, 0.08, 0.08, 0.42)); }
}

function buildWeapon(kind, trimM, leather, mainM) {
  var THREE = T(); var g = new THREE.Group(); var steel = metal("#c8ccd2"), wood = mat("#5a3e24");
  if (kind === "sword") { g.add(mesh(geo("blade"), steel, 0, 0.12, 0, 0.09, 1.05, 0.3)); g.add(mesh(geo("box"), trimM, 0, 0.1, 0, 0.3, 0.04, 0.06)); g.add(mesh(geo("cyl"), leather, 0, 0.0, 0, 0.045, 0.2, 0.045)); g.add(mesh(geo("sphLo"), trimM, 0, -0.11, 0, 0.07, 0.07, 0.07)); }
  else if (kind === "dagger") { g.add(mesh(geo("blade"), steel, 0, 0.08, 0, 0.07, 0.42, 0.3)); g.add(mesh(geo("box"), trimM, 0, 0.07, 0, 0.16, 0.03, 0.05)); g.add(mesh(geo("cyl"), leather, 0, 0, 0, 0.04, 0.13, 0.04)); }
  else if (kind === "staff") { g.add(mesh(geo("cyl"), wood, 0, 0.35, 0, 0.06, 1.9, 0.06)); var orb = mesh(geo("sph"), mat("#9fd0ff", { emissive: new THREE.Color("#3a7ad0"), emissiveIntensity: 1.4 }), 0, 1.35, 0, 0.14); orb.castShadow = false; g.add(orb); g.userData.orb = orb; g.add(mesh(geo("cyl"), trimM, 0, 1.25, 0, 0.09, 0.08, 0.09)); g.position.y = -0.0; }
  else if (kind === "bow") { var bowG = new THREE.Group(); var arc = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 6, 20, Math.PI * 0.9), wood); arc.rotation.z = Math.PI / 2 + Math.PI * 0.05; arc.position.x = -0.42; bowG.add(arc); var str = mesh(geo("cyl"), mat("#ddd8c8"), 0.0, 0, 0, 0.008, 1.2, 0.008); bowG.add(str); bowG.rotation.y = Math.PI / 2; g.add(bowG); }
  else if (kind === "axe") { g.add(mesh(geo("cyl"), wood, 0, 0.45, 0, 0.05, 1.3, 0.05)); var hd = mesh(geo("box"), steel, 0.14, 0.95, 0, 0.3, 0.32, 0.04); g.add(hd); }
  else if (kind === "hammer") { g.add(mesh(geo("cyl"), wood, 0, 0.4, 0, 0.05, 1.1, 0.05)); g.add(mesh(geo("box"), steel, 0, 0.95, 0, 0.36, 0.22, 0.22)); }
  else if (kind === "mace") { g.add(mesh(geo("cyl"), wood, 0, 0.3, 0, 0.045, 0.8, 0.045)); g.add(mesh(geo("sphLo"), steel, 0, 0.72, 0, 0.2)); }
  else if (kind === "spear") { g.add(mesh(geo("cyl"), wood, 0, 0.5, 0, 0.04, 2.1, 0.04)); g.add(mesh(geo("cone4"), steel, 0, 1.62, 0, 0.09, 0.3, 0.05)); }
  else if (kind === "lute") { var body = mesh(geo("sph"), wood, 0, -0.05, 0, 0.32, 0.42, 0.14); g.add(body); g.add(mesh(geo("box"), mat("#3a2414"), 0, 0.35, 0, 0.06, 0.55, 0.04)); g.rotation.z = 0.5; }
  else if (kind === "club") { g.add(mesh(geo("cone"), wood, 0, 0.45, 0, 0.16, 1.0, 0.16)); }
  else if (kind === "claws" || kind === "none") return null;
  g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Pose the rig for this frame. state: {speed (0..1 walk, >1 run), action, actionT, dead, sit, cast}
export function animateHumanoid(h, dt, st) {
  h.t += dt; var t = h.t; var sp = st.speed || 0; var run = Math.min(1, Math.max(0, sp - 1));
  var w = Math.min(1, sp); var freq = 7 + run * 4.5; var ph = t * freq;
  var swing = Math.sin(ph) * (0.55 + run * 0.35) * w;
  if (st.dead) { h.rig.rotation.x = Math.min(Math.PI / 2, (h.rig.rotation.x || 0) + dt * 3); h.rig.position.y = 0.15; return; }
  h.rig.rotation.x = 0; h.rig.position.y = 0;
  h.L.hip.rotation.x = swing; h.R.hip.rotation.x = -swing;
  h.L.knee.rotation.x = Math.max(0, -Math.sin(ph - 1.2)) * 0.9 * w; h.R.knee.rotation.x = Math.max(0, Math.sin(ph - 1.2)) * 0.9 * w;
  h.hips.position.y = 0.98 + Math.abs(Math.cos(ph)) * 0.05 * w - 0.02 * w;
  h.spine.rotation.x = 0.06 * w + run * 0.12; h.spine.rotation.y = Math.sin(ph) * 0.08 * w;
  var breathe = Math.sin(t * 1.8) * 0.012; h.chest.scale.y = 1 + breathe;
  h.LA.sh.rotation.x = -swing * 0.8; h.RA.sh.rotation.x = swing * 0.8; h.LA.sh.rotation.z = -0.08 - (1 - w) * 0.05; h.RA.sh.rotation.z = 0.08 + (1 - w) * 0.05;
  h.LA.el.rotation.x = -0.25 - run * 0.9; h.RA.el.rotation.x = -0.25 - run * 0.9;
  h.head.rotation.y = st.look || 0; h.head.rotation.x = 0;
  if (h.cape) h.cape.rotation.x = 0.08 + w * 0.25 + run * 0.35 + Math.sin(t * 2.3) * 0.03;
  if (h.weapon && h.weapon.userData.orb) h.weapon.userData.orb.material.emissiveIntensity = 1.1 + Math.sin(t * 3) * 0.4;
  // actions override arms
  if (h.action) {
    h.actionT += dt; var a = h.action, k = h.actionT;
    if (a === "attack") { var p = Math.min(1, k / 0.45); var wind = p < 0.35 ? p / 0.35 : 1 - (p - 0.35) / 0.65; h.RA.sh.rotation.x = -2.2 * wind - 0.2 + (p > 0.35 ? (p - 0.35) * 1.5 : 0); h.RA.sh.rotation.z = 0.5 * wind; h.RA.el.rotation.x = -0.6 * wind; h.spine.rotation.y = -0.5 * wind + (p > 0.35 ? 0.4 * (1 - p) : 0); if (k > 0.5) h.action = null; }
    else if (a === "shoot") { h.LA.sh.rotation.x = -1.5; h.LA.sh.rotation.z = 0.1; h.RA.sh.rotation.x = -1.4; h.RA.el.rotation.x = -1.2 * Math.min(1, k * 3); h.spine.rotation.y = -0.6; if (k > 0.6) h.action = null; }
    else if (a === "cast") { var c = Math.min(1, k / 0.25); h.RA.sh.rotation.x = -1.6 * c; h.LA.sh.rotation.x = -1.3 * c; h.LA.sh.rotation.z = -0.4 * c; h.RA.el.rotation.x = -0.2; if (k > 0.7) h.action = null; }
    else if (a === "hit") { h.spine.rotation.x = -0.25 * (1 - k / 0.3); if (k > 0.3) h.action = null; }
    else if (a === "talk") { h.RA.sh.rotation.x = -0.5 + Math.sin(k * 5) * 0.15; h.RA.el.rotation.x = -0.9; if (k > 2.2) h.action = null; }
    else if (a === "wave") { h.RA.sh.rotation.x = -2.6; h.RA.sh.rotation.z = 0.3 + Math.sin(k * 10) * 0.3; if (k > 1.2) h.action = null; }
    else if (a === "dodge") { h.rig.rotation.x = Math.sin(Math.min(1, k / 0.45) * Math.PI) * 0.6; if (k > 0.45) { h.action = null; h.rig.rotation.x = 0; } }
  } else if (st.combat && w < 0.2) { h.RA.sh.rotation.x = -0.6; h.RA.el.rotation.x = -0.8; h.LA.sh.rotation.x = -0.3; }
  else if (st.crossArms && w < 0.1) { h.LA.sh.rotation.x = -0.6; h.RA.sh.rotation.x = -0.6; h.LA.sh.rotation.z = -0.5; h.RA.sh.rotation.z = 0.5; h.LA.el.rotation.x = -1.6; h.RA.el.rotation.x = -1.6; h.LA.sh.rotation.y = 0.6; h.RA.sh.rotation.y = -0.6; }
}
export function playAction(h, name) { h.action = name; h.actionT = 0; }

// ------------------------------------------------------------------ creatures
// Picks a body plan from the bestiary name.
export function creatureArchetype(name) {
  var n = name.toLowerCase();
  if (/wolf|jackal|hound|lion/.test(n)) return "canine";
  if (/boar|ram|bear|stag/.test(n)) return "beast";
  if (/wyvern|wyrm|drake|dragon|roc|griff|gryph|gull/.test(n)) return "winged";
  if (/serpent|worm|kraken|shark/.test(n)) return "serpent";
  if (/scorpion|mantis|crawler|stalker|widow|chimera|salamander/.test(n)) return "bug";
  if (/sprite|wisp|avatar/.test(n)) return "wisp";
  if (/troll|ogre|giant|colossus|walker|treant|king|horror/.test(n)) return "brute";
  return "humanoid";
}
var CREATURE_COLOR = [
  [/goblin/, "#5d7a3a"], [/hobgoblin/, "#7a5a3a"], [/skeleton|bone|draugr|colossus/, "#d8d0bc"], [/wight|ghast|ghoul|lich|revenant|admiral|drowned|knight/, "#6a7a72"], [/frost|ice|white|snow|glacier/, "#d8e4ee"],
  [/blackback|withered|umbral|shadow|widow/, "#2a2628"], [/greenfang|moss|vine|treant|thorn/, "#3e6a34"], [/sand|dune|glass|desert/, "#c8a46a"], [/rock|stone|cave|deep/, "#6a6560"], [/fire|forge|ember|efreeti|salamander/, "#b0482a"],
  [/reef|sapphire|sea|kraken|siren/, "#2e6a7a"], [/gull/, "#e8e8e0"], [/aurora/, "#6ad0c0"], [/rot|wisp/, "#8a9a5a"], [/griffon|gryphon/, "#b08a50"], [/bandit|mercenary|marauder|raider/, "#5a4a3a"], [/boar|bear|ram|stag/, "#5a3e2a"], [/troll|ogre|giant/, "#6a7a5a"], [/wolf|hound|jackal|lion/, "#7a6a5a"]
];
export function creatureColor(name) { var n = name.toLowerCase(); for (var i = 0; i < CREATURE_COLOR.length; i++) if (CREATURE_COLOR[i][0].test(n)) return CREATURE_COLOR[i][1]; return "#6a6a6a"; }

export function makeCreature(mon) {
  var THREE = T(); var arch = creatureArchetype(mon.name); var col = creatureColor(mon.name); var body = mat(col, { roughness: 0.8 }); var dark = mat("#1a1612"); var eye = mat("#ffd060", { emissive: new THREE.Color(/umbral|wight|ghast|lich|draugr|revenant|knight|ghoul|skeleton/.test(mon.name.toLowerCase()) ? "#60ffe0" : "#ffb020"), emissiveIntensity: 1.5 });
  var size = Math.min(3.2, 0.8 + mon.threat * 0.35 + mon.hp / 160);
  var root = new THREE.Group(); var rig = grp(root); var parts = { arch: arch };
  if (arch === "humanoid" || arch === "brute") {
    var undead = /skeleton|bone|draugr|wight|ghast|ghoul|lich|revenant|admiral|drowned|knight/.test(mon.name.toLowerCase());
    var look = { calling: undead ? "Fighter" : "Barbarian", skin: col, skinSet: true, hair: "#1a1410", hairStyle: undead ? "Bald" : "Shaved Sides", build: arch === "brute" ? "Broad" : "Lean", species: /goblin/.test(mon.name.toLowerCase()) ? "Halfling" : "Human", main: undead ? "#4a4e50" : "#4a3a2a", trim: "#6a6050", cloth: undead ? "#2a2e30" : "#3a2a1a", cape: undead ? "#22262a" : null, weapon: /bow/.test(JSON.stringify(mon.attacks)) && Math.random() < 0.4 ? "bow" : arch === "brute" ? "club" : /spear/.test(JSON.stringify(mon.attacks)) ? "spear" : /axe/.test(JSON.stringify(mon.attacks)) ? "axe" : "sword", armor: undead ? "medium" : "bare", scale: arch === "brute" ? 1.4 + mon.threat * 0.12 : /goblin/.test(mon.name.toLowerCase()) ? 0.9 : 1 };
    var h = makeHumanoid(look); h.head.children.forEach(function (c) { if (c.material && c.material.color && c.material.color.getHexString() === "f4efe6") c.material = eye; });
    if (arch === "brute") h.rig.scale.multiplyScalar(1.15);
    root.add(h.root); parts.h = h; parts.height = h.height * (arch === "brute" ? 1.15 : 1);
    return { root: root, parts: parts, arch: arch, size: size, height: parts.height };
  }
  var s = size;
  if (arch === "canine" || arch === "beast") {
    var bulky = arch === "beast"; var len = bulky ? 1.6 : 1.4, ht = bulky ? 1.0 : 0.75;
    var torso = mesh(geo("sph"), body, 0, ht, 0, 0.7 * (bulky ? 1.25 : 1), 0.62 * (bulky ? 1.25 : 1), len); rig.add(torso);
    var neck = grp(rig, 0, ht + 0.15, len * 0.45); var hd = grp(neck, 0, 0.1, 0.25); hd.add(mesh(geo("sph"), body, 0, 0, 0, 0.42, 0.38, 0.5)); var snout = mesh(geo("cone"), body, 0, -0.05, 0.33, 0.24, 0.42, 0.22); snout.rotation.x = Math.PI / 2; hd.add(snout); hd.add(mesh(geo("sphLo"), dark, 0, -0.03, 0.55, 0.08, 0.06, 0.06));
    [-1, 1].forEach(function (sd) { hd.add(mesh(geo("sphLo"), eye, sd * 0.13, 0.08, 0.2, 0.06)); if (!bulky || /bear/.test(mon.name.toLowerCase())) { var e = mesh(geo("cone"), body, sd * 0.14, 0.26, -0.05, 0.12, 0.22, 0.08); hd.add(e); } });
    var nm = mon.name.toLowerCase();
    if (/boar/.test(nm)) [-1, 1].forEach(function (sd) { var tk = mesh(geo("cone"), mat("#efe6cc"), sd * 0.15, -0.12, 0.42, 0.05, 0.3, 0.05); tk.rotation.x = -0.6; hd.add(tk); });
    if (/ram/.test(nm)) [-1, 1].forEach(function (sd) { var hr = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.06, 6, 12, Math.PI * 1.4), mat("#c8bca0")); hr.position.set(sd * 0.25, 0.12, 0); hr.rotation.y = Math.PI / 2; hd.add(hr); });
    if (/stag/.test(nm)) [-1, 1].forEach(function (sd) { for (var k = 0; k < 3; k++) { var an = mesh(geo("cyl"), mat("#d8ccb0"), sd * (0.15 + k * 0.08), 0.35 + k * 0.15, -0.05, 0.04, 0.35, 0.04); an.rotation.z = -sd * 0.5; hd.add(an); } });
    if (/lion/.test(nm)) hd.add(mesh(geo("sph"), mat("#8a5a2a"), 0, 0, -0.1, 0.7, 0.66, 0.5));
    var legs = [];
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function (p) { var lg = grp(rig, p[0] * 0.3, ht - 0.15, p[1] * len * 0.32); lg.add(mesh(geo("limb"), body, 0, 0, 0, 0.2, ht - 0.05, 0.22)); legs.push(lg); });
    var tail = grp(rig, 0, ht + 0.1, -len * 0.48); var tm = mesh(geo("limb"), body, 0, 0, 0, 0.12, 0.6, 0.12); tail.add(tm); tail.rotation.x = -0.9;
    rig.scale.setScalar(s * 0.8); parts.legs = legs; parts.head = neck; parts.tail = tail; parts.torso = torso;
    root.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    return { root: root, parts: parts, arch: arch, size: s, height: (ht + 0.6) * s * 0.8 };
  }
  if (arch === "winged") {
    var torso = mesh(geo("sph"), body, 0, 1.3, 0, 0.9, 0.8, 2.0); rig.add(torso);
    var neck = grp(rig, 0, 1.6, 0.9); var nk = mesh(geo("limb"), body, 0, 0, 0, 0.35, 1.0, 0.35); nk.rotation.x = -2.2; neck.add(nk); var hd = grp(neck, 0, 0.55, 0.85); hd.add(mesh(geo("sph"), body, 0, 0, 0, 0.5, 0.42, 0.8)); [-1, 1].forEach(function (sd) { hd.add(mesh(geo("sphLo"), eye, sd * 0.18, 0.1, 0.22, 0.08)); var hr = mesh(geo("cone"), mat("#e0d8c0"), sd * 0.15, 0.3, -0.25, 0.08, 0.5, 0.08); hr.rotation.x = -1.2; hd.add(hr); });
    var wings = []; [-1, 1].forEach(function (sd) { var w = grp(rig, sd * 0.5, 1.7, 0.2); var wm = new THREE.Mesh(geo("wing"), mat(col, { side: THREE.DoubleSide, roughness: 0.9 })); wm.scale.set(sd * 3.0, 2.4, 1); wm.rotation.x = -Math.PI / 2; w.add(wm); wings.push(w); });
    var legs = []; [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function (p) { var lg = grp(rig, p[0] * 0.45, 1.0, p[1] * 0.6); lg.add(mesh(geo("limb"), body, 0, 0, 0, 0.22, 1.0, 0.24)); legs.push(lg); });
    var tail = grp(rig, 0, 1.3, -1.0); var tm = mesh(geo("limb"), body, 0, 0, 0, 0.3, 2.0, 0.3); tail.add(tm); tail.rotation.x = -1.3;
    rig.scale.setScalar(s * 0.7); parts.wings = wings; parts.legs = legs; parts.head = neck; parts.tail = tail;
    root.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    return { root: root, parts: parts, arch: arch, size: s, height: 2.2 * s * 0.7 };
  }
  if (arch === "serpent") {
    var segs = []; for (var i = 0; i < 9; i++) { var sg = mesh(geo("sph"), body, 0, 0.6, -i * 0.6, 0.9 - i * 0.07, 0.8 - i * 0.06, 0.9); rig.add(sg); segs.push(sg); }
    var hd = segs[0]; hd.add(mesh(geo("sphLo"), eye, 0.25, 0.15, 0.35, 0.15)); hd.add(mesh(geo("sphLo"), eye, -0.25, 0.15, 0.35, 0.15));
    rig.scale.setScalar(s * 0.7); parts.segs = segs; root.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    return { root: root, parts: parts, arch: arch, size: s, height: 1.2 * s };
  }
  if (arch === "bug") {
    var torso = mesh(geo("sph"), body, 0, 0.7, -0.3, 1.0, 0.6, 1.4); rig.add(torso); var front = mesh(geo("sph"), body, 0, 0.75, 0.6, 0.7, 0.5, 0.7); rig.add(front);
    [-1, 1].forEach(function (sd) { front.add(mesh(geo("sphLo"), eye, sd * 0.2, 0.2, 0.4, 0.15)); var cl2 = mesh(geo("cone"), body, sd * 0.4, 0.0, 0.7, 0.18, 0.8, 0.18); cl2.rotation.x = Math.PI / 2; front.add(cl2); });
    var legs = []; for (var i = 0; i < 6; i++) { var sd = i % 2 ? 1 : -1; var lg = grp(rig, sd * 0.45, 0.75, 0.5 - Math.floor(i / 2) * 0.55); var lm = mesh(geo("limb"), dark, 0, 0, 0, 0.1, 1.0, 0.1); lm.rotation.z = sd * 0.9; lg.add(lm); legs.push(lg); }
    if (/scorpion|widow/.test(mon.name.toLowerCase())) { var tail = grp(rig, 0, 0.9, -1.0); var tm = mesh(geo("limb"), body, 0, 0, 0, 0.25, 1.4, 0.25); tail.add(tm); tail.rotation.x = -2.5; parts.tail = tail; }
    rig.scale.setScalar(s * 0.75); parts.legs = legs; root.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    return { root: root, parts: parts, arch: arch, size: s, height: 1.2 * s * 0.75 };
  }
  // wisp / sprite
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(col).lerp(new THREE.Color("#ffffff"), 0.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(2.2, 2.2, 1); glow.position.y = 1.4; rig.add(glow);
  var core = mesh(geo("sph"), mat(col, { emissive: new THREE.Color(col), emissiveIntensity: 1.2 }), 0, 1.4, 0, 0.45); rig.add(core); parts.core = core; parts.glow = glow;
  return { root: root, parts: parts, arch: arch, size: s, height: 1.6 };
}

export function animateCreature(c, dt, st) {
  var p = c.parts; c.t = (c.t || Math.random() * 10) + dt; var t = c.t; var sp = st.speed || 0; var w = Math.min(1, sp);
  if (p.h) { animateHumanoid(p.h, dt, st); return; }
  if (st.dead) { c.root.children[0].rotation.z = Math.min(Math.PI / 2, (c.root.children[0].rotation.z || 0) + dt * 3); return; }
  var ph = t * (6 + sp * 3);
  if (p.legs) p.legs.forEach(function (lg, i) { lg.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6 * w; });
  if (p.tail) p.tail.rotation.y = Math.sin(t * 3) * 0.3;
  if (p.wings) p.wings.forEach(function (wg, i) { wg.rotation.z = (i ? -1 : 1) * (Math.sin(t * (st.flying ? 6 : 1.5)) * (st.flying ? 0.7 : 0.15) - 0.1); });
  if (p.segs) p.segs.forEach(function (sg, i) { sg.position.x = Math.sin(t * 3 - i * 0.7) * 0.35 * (0.3 + w); });
  if (p.core) { p.core.position.y = 1.4 + Math.sin(t * 2) * 0.25; p.glow.position.y = p.core.position.y; }
  if (st.attack && p.head) p.head.rotation.x = Math.sin(Math.min(1, st.attackT / 0.4) * Math.PI) * -0.6;
  if (p.torso) p.torso.position.y = p.torso.position.y + Math.sin(ph * 2) * 0.004 * w;
}

// Head-and-shoulders portrait rendered off-screen (used for HUD frames and calling cards).
var portraitRenderer = null;
export function renderPortrait(build, opts) {
  var THREE = T(); opts = opts || {}; var w = opts.w || 128, h = opts.h || 128;
  try {
    if (!portraitRenderer) { portraitRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); if (THREE.sRGBEncoding) portraitRenderer.outputEncoding = THREE.sRGBEncoding; }
    portraitRenderer.setPixelRatio(1); portraitRenderer.setSize(w, h, false);
    var scene = new THREE.Scene(); var cam = new THREE.PerspectiveCamera(opts.fov || 26, w / h, 0.1, 50);
    scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x302820, 0.9)); var key = new THREE.DirectionalLight(0xfff0dc, 1.4); key.position.set(2, 3, 4); scene.add(key); var rim = new THREE.DirectionalLight(0x8ab0ff, 0.9); rim.position.set(-3, 2, -3); scene.add(rim);
    var made = build(); scene.add(made.root);
    if (made.rig && made.head) { animateHumanoid(made, 0.01, { speed: 0 }); made.root.updateMatrixWorld(true); }
    var target = new THREE.Vector3(); var ht = made.height || 1.8;
    if (opts.full) { target.set(0, ht * 0.52, 0); cam.position.set(ht * 0.5, ht * 0.6, ht * 2.4); }
    else if (made.head) { made.head.getWorldPosition(target); cam.position.set(target.x + 0.25, target.y + 0.05, target.z + 1.45); target.y -= 0.06; }
    else { target.set(0, ht * 0.6, 0); cam.position.set(ht * 1.2, ht * 0.9, ht * 2.2); }
    cam.lookAt(target);
    if (opts.bg) { scene.background = new THREE.Color(opts.bg); }
    portraitRenderer.setClearColor(0x000000, 0);
    portraitRenderer.render(scene, cam);
    var url = portraitRenderer.domElement.toDataURL("image/png");
    scene.traverse(function (o) { if (o.geometry && !Object.values(G).includes(o.geometry)) o.geometry.dispose && false; });
    return url;
  } catch (e) { return ""; }
}
