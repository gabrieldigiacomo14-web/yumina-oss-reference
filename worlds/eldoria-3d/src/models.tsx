// @ts-nocheck
// Characters and creatures. Every humanoid is a small rig of pivot groups so the
// same builder serves the creator preview, the player, companions, townsfolk and
// humanoid monsters. Creatures are archetypes chosen from bestiary names.
import { T, hex, glowTex } from "./three";
import { hashStr, rng } from "./worldgen";
import { buildBody } from "./body";
import { animateHumanoid, playAction } from "./anim";
import * as RIG from "./rig";
import { makeBeast, animateBeast } from "./creatures";

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
// look: {skin, hair, hairStyle, build, species, gender, face, calling, main/trim/cloth/cape overrides, weapon, armor, scale, beard}
// Outfit layers per armour class; colours come from the calling (or the NPC's own clothes).
function outfitFor(armor, main, trim, cloth, leather, metalC, female) {
  var MET = { roughness: 0.32, metalness: 0.8 }, LEA = { roughness: 0.7 };
  var o;
  if (armor === "robe") o = [["pants", shadeHex(cloth, 0.7)], ["robe", cloth], ["bracers", leather, LEA]];
  else if (armor === "bare") o = [["loincloth", leather, LEA], ["bracers", leather, LEA], ["boots", shadeHex(leather, 0.8), LEA]];
  else if (armor === "light") o = [["pants", shadeHex(cloth, 0.75)], ["tunic", main, LEA], ["coat", shadeHex(main, 0.85), LEA], ["bracers", leather, LEA], ["boots", leather, LEA]];
  else if (armor === "medium") o = [["pants", shadeHex(cloth, 0.7)], ["shirtLong", cloth], ["cuirass", metalC, MET], ["faulds", leather, LEA], ["bracers", metalC, MET], ["boots", leather, LEA]];
  else if (armor === "heavy") o = [["pants", shadeHex(cloth, 0.7)], ["shirtLong", cloth], ["cuirass", metalC, MET], ["faulds", metalC, MET], ["greaves", metalC, MET], ["bracers", metalC, MET]];
  else o = [["pants", shadeHex(cloth, 0.75)], ["tunic", main]];
  o.boots = armor === "heavy" ? metalC : leather; if (armor === "heavy") o.gloves = metalC; return o;
}
function shadeHex(h, k) { var n = parseInt(String(h).replace("#", ""), 16); var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { return Math.max(0, Math.min(255, Math.round(v * k))); }); return "#" + c.map(function (v) { return (v < 16 ? "0" : "") + v.toString(16); }).join(""); }
export function makeHumanoid(look) {
  var THREE = T(); look = look || {};
  var cl = CALLING_LOOK[look.calling] || CALLING_LOOK.Fighter;
  // a rigged glTF character takes over when the world has one for this look; any failure falls back to the procedural body
  var glbKey = RIG.pick(look);
  if (glbKey) {
    try {
      var gm = look.main || cl.main, gt = look.trim || cl.trim, garmor = look.armor || cl.armor; var gtrim = metal(gt), gmain = garmor === "heavy" || garmor === "medium" ? metal(gm) : mat(gm); var gl = "#4a3322";
      var gh = RIG.build(Object.assign({}, look, { weapon: look.weapon || cl.weapon, armor: garmor, shield: !!(cl.shield || look.shield), main: gm, trim: gt, cloth: look.cloth || cl.cloth, cape: look.cape || cl.cape }), glbKey, {
        quality: look.detail === "lo" ? "low" : "high",
        buildWeapon: function (kind) { return buildWeapon(kind, gtrim, mat(gl), gmain); },
        buildShield: function () { var sg = new THREE.Group(); sg.add(mesh(geo("cyl"), gmain, 0, 0, 0, 0.52, 0.05, 0.52)); sg.add(mesh(geo("cyl"), gtrim, 0, 0.03, 0, 0.15, 0.04, 0.15)); return sg; }
      });
      if (gh) return gh;
    } catch (e) { console.error("glTF character failed, using the procedural body:", e); }
  }
  var main = look.main || cl.main, trim = look.trim || cl.trim, cloth = look.cloth || cl.cloth, capeC = look.cape === null ? null : (look.cape || cl.cape);
  var armor = look.armor || cl.armor, weapon = look.weapon || cl.weapon; var leather = "#4a3322";
  if (look.species === "Orc-Blooded" && !look.skinSet) look = Object.assign({}, look, { skin: "#7d8a5a" });
  var outfit = outfitFor(armor, main, trim, cloth, leather, armor === "medium" || armor === "heavy" ? main : "#8a8f96", look.gender === "Female");
  var built = buildBody(look, outfit); var P = built.P, J = built.J, bn = built.bones; var bw = P.bw;
  var scale = (look.scale || 1) * (P.species === "Dwarf" ? 0.9 : P.species === "Halfling" ? 0.74 : P.species === "Elf" ? 1.02 : P.species === "Orc-Blooded" ? 1.05 : 1);
  var root = new THREE.Group(); var rig = grp(root); rig.scale.setScalar(scale); rig.add(built.root);
  var trimM = metal(trim), mainM = armor === "heavy" || armor === "medium" ? metal(main) : mat(main);
  // pauldrons, belt, scarf, hood
  if (armor === "heavy" || armor === "medium") [[bn.lsh, -1], [bn.rsh, 1]].forEach(function (q) { var pd = mesh(geo("pauldron"), mainM, q[1] * 0.02, 0.02, 0, 0.17 * bw, 0.13, 0.17 * bw); pd.rotation.z = q[1] * -0.25; q[0].add(pd); var rim = mesh(geo("torus"), trimM, q[1] * 0.02, 0.0, 0, 0.17 * bw, 0.17 * bw, 0.17 * bw); rim.rotation.z = q[1] * -0.25; q[0].add(rim); });
  var belt = mesh(geo("torus"), mat(leather, { roughness: 0.6 }), 0, 0.05, 0, 0.34 * bw, 0.34 * bw, 0.25 * bw); belt.scale.set(0.34 * bw, 0.5, 0.25 * bw); bn.spine.add(belt);
  var buckle = mesh(geo("box"), trimM, 0, 0.05, 0.125 * bw, 0.04, 0.035, 0.012); bn.spine.add(buckle);
  if (armor !== "bare" && armor !== "heavy" && capeC) { var scarf = mesh(geo("torus"), mat(capeC, { roughness: 0.9 }), 0, 0.02, 0.005, 0.15 * bw, 0.15 * bw, 0.13 * bw); scarf.scale.set(0.15 * bw, 0.45, 0.13 * bw); bn.chest.add(scarf); }
  if (cl.hood && look.hood !== false && armor !== "heavy") { var hd = mesh(geo("hood"), mat(capeC || cloth, { side: THREE.DoubleSide }), 0, 0.035, -0.012, built.headSize[0] * 1.32, built.headSize[1] * 1.22, built.headSize[2] * 1.3); hd.rotation.x = -0.25; bn.head.add(hd); bn.head.userData.hood = hd; hd.visible = !!look.hoodUp; }
  // cape
  var cape = null;
  if (capeC && look.capeOn !== false && armor !== "bare") { cape = grp(bn.chest, 0, -0.01, -0.125 * bw); var cm = mesh(geo("cape"), mat(capeC, { side: THREE.DoubleSide, roughness: 0.92 }), 0, 0, 0, 0.44 * bw, (J.chestY - J.kneeY) * 0.95, 1); cape.add(cm); cape.rotation.x = 0.06; }
  // weapon & shield in hand
  var weaponG = buildWeapon(weapon, trimM, mat(leather), mainM);
  if (weaponG) { (weapon === "bow" ? bn.lhand : bn.rhand).add(weaponG); weaponG.position.y = -0.06; weaponG.rotation.x = /staff|spear|bow/.test(weapon) ? Math.PI : weapon === "lute" ? Math.PI / 2 : Math.PI - 0.45; weaponG.userData.rest = weaponG.rotation.x; weaponG.userData.tipY = { sword: 0.92, dagger: 0.4, staff: 1.38, axe: 0.72, hammer: 0.7, mace: 0.7, club: 0.78, spear: 1.68 }[weapon]; }
  if (cl.shield || look.shield) { var shield = grp(bn.lel, -0.07, -0.16, 0.02); shield.add(mesh(geo("cyl"), mainM, 0, 0, 0, 0.52, 0.05, 0.52)); shield.add(mesh(geo("cyl"), trimM, 0, 0.03, 0, 0.15, 0.04, 0.15)); shield.rotation.z = Math.PI / 2; shield.rotation.y = 0.15; }
  root.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
  return { root: root, rig: rig, body: built, hips: bn.hips, spine: bn.spine, chest: bn.chest, head: bn.head, neck: bn.neck, L: { hip: bn.lhip, knee: bn.lknee }, R: { hip: bn.rhip, knee: bn.rknee }, LA: { sh: bn.lsh, el: bn.lel, hand: bn.lhand }, RA: { sh: bn.rsh, el: bn.rel, hand: bn.rhand }, cape: cape, weapon: weaponG, weaponKind: weapon, hipY: J.hipY, height: (J.headY + 0.14) * scale, t: Math.random() * 10, action: null, actionT: 0, look: look, pose: {} };
}

function bladeGeo(len, w, tipLen, thick) {
  var THREE = T(); var sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(-w / 2 * 0.92, len - tipLen); sh.quadraticCurveTo(-w * 0.2, len - tipLen * 0.3, 0, len); sh.quadraticCurveTo(w * 0.2, len - tipLen * 0.3, w / 2 * 0.92, len - tipLen); sh.lineTo(w / 2, 0); sh.lineTo(-w / 2, 0);
  var g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.9, bevelSize: w * 0.18, bevelSegments: 1, steps: 1 }); g.translate(0, 0, -thick / 2); g.computeVertexNormals(); return g;
}
var WGEO = {};
function wg(key, make) { return WGEO[key] || (WGEO[key] = make()); }
function buildWeapon(kind, trimM, leather, mainM) {
  var THREE = T(); var g = new THREE.Group(); var steel = mat("#c4c9d0", { roughness: 0.28, metalness: 0.9 }), wood = mat("#5a3e24", { roughness: 0.8 }), dark = mat("#2a1c12", { roughness: 0.7 });
  function add(geom, m, x, y, z, rx, ry, rz) { var o = new THREE.Mesh(geom, m); o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = true; g.add(o); return o; }
  if (kind === "sword" || kind === "dagger") {
    var L = kind === "sword" ? 0.82 : 0.3;
    add(wg("blade" + kind, function () { return bladeGeo(L, kind === "sword" ? 0.052 : 0.04, kind === "sword" ? 0.12 : 0.08, 0.006); }), steel, 0, 0.1, 0);
    add(wg("guard" + kind, function () { var c = new THREE.CylinderGeometry(0.012, 0.012, kind === "sword" ? 0.2 : 0.11, 8); c.rotateZ(Math.PI / 2); return c; }), trimM, 0, 0.095, 0);
    add(wg("grip", function () { return new THREE.CylinderGeometry(0.016, 0.018, 0.16, 10); }), dark, 0, 0.01, 0);
    add(wg("pommel", function () { return new THREE.SphereGeometry(0.026, 12, 8); }), trimM, 0, -0.08, 0);
  } else if (kind === "staff") {
    add(wg("staffShaft", function () { var c = new THREE.CylinderGeometry(0.018, 0.026, 1.85, 10, 6); var p = c.attributes.position; for (var i = 0; i < p.count; i++) { var y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * 7) * 0.006); } c.computeVertexNormals(); return c; }), wood, 0, 0.35, 0);
    for (var k = 0; k < 3; k++) add(wg("claw", function () { var c = new THREE.ConeGeometry(0.014, 0.17, 6); c.translate(0, 0.085, 0); return c; }), wood, Math.cos(k * 2.1) * 0.03, 1.24, Math.sin(k * 2.1) * 0.03, Math.sin(k * 2.1) * 0.5, 0, -Math.cos(k * 2.1) * 0.5);
    var orb = add(wg("orb", function () { return new THREE.SphereGeometry(0.055, 18, 12); }), mat("#9fd0ff", { emissive: new THREE.Color("#3a7ad0"), emissiveIntensity: 1.4, roughness: 0.1 }), 0, 1.34, 0); orb.castShadow = false; g.userData.orb = orb;
  } else if (kind === "bow") {
    var limb = wg("bowLimb", function () { var pts = []; for (var i = 0; i <= 12; i++) { var t = i / 12 * 2 - 1; pts.push(new THREE.Vector3(0, t * 0.7, -Math.cos(t * 1.2) * 0.16 + Math.pow(Math.abs(t), 3) * 0.06)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.014, 6, false); });
    add(limb, wood, 0, 0, 0); add(wg("bowString", function () { return new THREE.CylinderGeometry(0.002, 0.002, 1.32, 4); }), mat("#e8e0cc"), 0, 0, 0.0); add(wg("bowGrip", function () { return new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8); }), dark, 0, 0, -0.16);
    g.rotation.y = Math.PI / 2;
  } else if (kind === "axe") {
    add(wg("axeHaft", function () { return new THREE.CylinderGeometry(0.018, 0.022, 0.85, 8); }), wood, 0, 0.3, 0);
    add(wg("axeHead", function () { var sh = new THREE.Shape(); sh.moveTo(0, -0.04); sh.lineTo(0.06, -0.06); sh.quadraticCurveTo(0.2, -0.12, 0.2, 0.0); sh.quadraticCurveTo(0.2, 0.12, 0.06, 0.06); sh.lineTo(0, 0.04); sh.lineTo(0, -0.04); var e = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 }); e.translate(0, 0, -0.006); return e; }), steel, 0.01, 0.66, 0);
  } else if (kind === "hammer" || kind === "mace" || kind === "club") {
    add(wg("hamHaft", function () { return new THREE.CylinderGeometry(0.018, 0.022, 0.75, 8); }), wood, 0, 0.26, 0);
    if (kind === "hammer") { add(wg("hamHead", function () { var c = new THREE.CylinderGeometry(0.055, 0.055, 0.22, 12); c.rotateZ(Math.PI / 2); return c; }), steel, 0, 0.64, 0); add(wg("hamBand", function () { return new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8); }), trimM, 0, 0.64, 0); }
    else if (kind === "mace") { add(wg("maceHead", function () { return new THREE.SphereGeometry(0.06, 12, 10); }), steel, 0, 0.64, 0); for (var f = 0; f < 6; f++) add(wg("flange", function () { var b = new THREE.BoxGeometry(0.012, 0.11, 0.05); return b; }), steel, Math.cos(f) * 0.06, 0.64, Math.sin(f) * 0.06, 0, -f, 0); }
    else add(wg("clubHead", function () { var c = new THREE.CylinderGeometry(0.075, 0.03, 0.45, 9); var p = c.attributes.position; for (var i = 0; i < p.count; i++) { p.setX(i, p.getX(i) * (1 + Math.sin(i) * 0.12)); } c.computeVertexNormals(); return c; }), wood, 0, 0.55, 0);
  } else if (kind === "spear") {
    add(wg("spearShaft", function () { return new THREE.CylinderGeometry(0.016, 0.018, 2.0, 8); }), wood, 0, 0.45, 0);
    add(wg("spearHead", function () { return bladeGeo(0.24, 0.06, 0.12, 0.008); }), steel, 0, 1.44, 0);
  } else if (kind === "lute") {
    add(wg("luteBody", function () { var pts = []; for (var i = 0; i <= 12; i++) { var t = i / 12; pts.push(new THREE.Vector2(Math.sin(t * Math.PI) * (0.16 - t * 0.05), t * 0.38)); } var l = new THREE.LatheGeometry(pts, 16); l.scale(1, 1, 0.45); return l; }), wood, 0, -0.22, 0);
    add(wg("luteNeck", function () { return new THREE.BoxGeometry(0.04, 0.4, 0.025); }), dark, 0, 0.32, 0); g.rotation.z = 0.5;
  } else return null;
  return g;
}


// ------------------------------------------------------------------ creatures
// Picks a body plan from the bestiary name.
export function creatureArchetype(name) {
  var n = name.toLowerCase();
  if (/siren/.test(n)) return "humanoid";
  if (/wolf|jackal|hound/.test(n)) return "canine";
  if (/boar|\bram\b|bear|stag|lion|chimera|salamander/.test(n)) return "beast";
  if (/wyvern|wyrm|drake|dragon|\broc\b|griff|gryph|gull/.test(n)) return "winged";
  if (/serpent|worm|kraken|shark/.test(n)) return "serpent";
  if (/scorpion|mantis|crawler|stalker|widow/.test(n)) return "bug";
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
  var THREE = T(); var arch = creatureArchetype(mon.name);
  var ckey = RIG.pickCreature(mon, arch);
  if (ckey) { try { var gc = RIG.buildCreature(ckey, mon, {}); if (gc) { var cs = Math.min(3.2, 0.8 + mon.threat * 0.35 + mon.hp / 160); return { root: gc.root, parts: { arch: arch, glb: gc }, arch: arch, size: cs, height: gc.height, glb: gc, kind: "glb", seed: Math.random() * 6 }; } } catch (e) { console.error("glTF creature failed:", e); } } var col = creatureColor(mon.name); var body = mat(col, { roughness: 0.8 }); var dark = mat("#1a1612"); var eye = mat("#ffd060", { emissive: new THREE.Color(/umbral|wight|ghast|lich|draugr|revenant|knight|ghoul|skeleton/.test(mon.name.toLowerCase()) ? "#60ffe0" : "#ffb020"), emissiveIntensity: 1.5 });
  var size = Math.min(3.2, 0.8 + mon.threat * 0.35 + mon.hp / 160);
  var root = new THREE.Group(); var rig = grp(root); var parts = { arch: arch };
  if (arch === "humanoid" || arch === "brute") {
    var undead = /skeleton|bone|draugr|wight|ghast|ghoul|lich|revenant|admiral|drowned|knight/.test(mon.name.toLowerCase());
    var look = { calling: undead ? "Fighter" : "Barbarian", skin: col, skinSet: true, hair: "#1a1410", hairStyle: undead ? "Bald" : "Shaved Sides", build: arch === "brute" ? "Broad" : "Lean", species: /goblin/.test(mon.name.toLowerCase()) ? "Halfling" : "Human", main: undead ? "#4a4e50" : "#4a3a2a", trim: "#6a6050", cloth: undead ? "#2a2e30" : "#3a2a1a", cape: undead ? "#22262a" : null, weapon: /bow/.test(JSON.stringify(mon.attacks)) && Math.random() < 0.4 ? "bow" : arch === "brute" ? "club" : /spear/.test(JSON.stringify(mon.attacks)) ? "spear" : /axe/.test(JSON.stringify(mon.attacks)) ? "axe" : "sword", armor: undead ? "medium" : "bare", scale: arch === "brute" ? 1.4 + mon.threat * 0.12 : /goblin/.test(mon.name.toLowerCase()) ? 0.9 : 1 };
    var h = makeHumanoid(Object.assign({ detail: "lo" }, look)); var hs = h.body.headSize; [-1, 1].forEach(function (sd) { var e = mesh(geo("sphLo"), eye, sd * 0.034, 0.047, hs[2] * 0.5 - 0.004, 0.022, 0.016, 0.01); e.castShadow = false; h.head.add(e); });
    if (arch === "brute") h.rig.scale.multiplyScalar(1.15);
    root.add(h.root); parts.h = h; parts.height = h.height * (arch === "brute" ? 1.15 : 1);
    return { root: root, parts: parts, arch: arch, size: size, height: parts.height };
  }
  var s = size;
  if (arch !== "wisp") {
    var bst = makeBeast(mon, arch, col); var k = arch === "winged" ? s * 0.5 : arch === "serpent" ? s * 0.6 : arch === "bug" ? 0.6 + s * 0.25 : 0.75 + s * 0.25; bst.rig.scale.setScalar(k);
    bst.parts.arch = arch; return { root: bst.root, parts: bst.parts, arch: arch, size: k, height: bst.height * k, kind: bst.kind, seed: Math.random() * 6 };
  }
  // wisp / sprite
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(col).lerp(new THREE.Color("#ffffff"), 0.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(2.2, 2.2, 1); glow.position.y = 1.4; rig.add(glow);
  var core = mesh(geo("sph"), mat(col, { emissive: new THREE.Color(col), emissiveIntensity: 1.2 }), 0, 1.4, 0, 0.45); rig.add(core); parts.core = core; parts.glow = glow;
  return { root: root, parts: parts, arch: arch, size: s, height: 1.6 };
}

export function animateCreature(c, dt, st) {
  if (c.glb) { var gh2 = c.glb; if (st.attack && !c._atk) { c._atk = true; RIG.mixerPlay(gh2, "slash"); } if (!st.attack) c._atk = false; if (st.hitT > 0 && !c._hit && !st.dead) { c._hit = true; RIG.mixerPlay(gh2, "hit"); } if (!(st.hitT > 0)) c._hit = false; RIG.mixerAnimate(gh2, dt, { speed: st.speed, combat: st.combat, dead: st.dead }); return; }
  var p = c.parts; c.t = (c.t || Math.random() * 10) + dt; var t = c.t; var sp = st.speed || 0; var w = Math.min(1, sp);
  if (p.h) { animateHumanoid(p.h, dt, st); return; }
  if (st.dead) { var r0 = c.root.children[0]; r0.rotation.z = Math.min(Math.PI / 2, (r0.rotation.z || 0) + dt * 3.2); r0.position.z *= 0.9; if (p.legs) p.legs.forEach(function (lg, i) { var o = lg.hip || lg; o.rotation.x += ((i % 2 ? 0.5 : -0.4) - o.rotation.x) * Math.min(1, dt * 4); }); if (p.jaw) p.jaw.rotation.x = Math.min(0.5, p.jaw.rotation.x + dt); if (p.core) { p.core.scale.multiplyScalar(Math.max(0, 1 - dt * 2)); p.glow.material.opacity = Math.max(0, (p.glow.material.opacity == null ? 1 : p.glow.material.opacity) - dt); } return; }
  if (c.kind) { animateBeast(c, dt, st); return; }
  var ph = t * (6 + sp * 3);
  if (p.legs) p.legs.forEach(function (lg, i) { lg.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6 * w; });
  if (p.tail) p.tail.rotation.y = Math.sin(t * 3) * 0.3;
  if (p.wings) p.wings.forEach(function (wg, i) { wg.rotation.z = (i ? -1 : 1) * (Math.sin(t * (st.flying ? 6 : 1.5)) * (st.flying ? 0.7 : 0.15) - 0.1); });
  if (p.segs) p.segs.forEach(function (sg, i) { sg.position.x = Math.sin(t * 3 - i * 0.7) * 0.35 * (0.3 + w); });
  if (p.core) { p.core.position.y = 1.4 + Math.sin(t * 2) * 0.25; p.glow.position.y = p.core.position.y; }
  // attack: crouch back, lunge, recover; struck: recoil
  var rig = c.root.children[0]; var lunge = 0, pitch = 0;
  if (st.attack) { var u = Math.min(1, st.attackT / (st.attackDur || 0.6)); lunge = u < 0.35 ? -0.25 * (u / 0.35) : u < 0.55 ? -0.25 + 1.25 * ((u - 0.35) / 0.2) : 1 - (u - 0.55) / 0.45; pitch = lunge; if (p.head) p.head.rotation.x = -0.5 * Math.max(0, lunge) + 0.25 * Math.min(0, lunge) * -1; if (p.tail) p.tail.rotation.x = (p.tail.userData.rx == null ? (p.tail.userData.rx = p.tail.rotation.x) : p.tail.userData.rx) - lunge * 0.5; }
  else if (p.head) p.head.rotation.x *= 0.85;
  var hit = st.hitT > 0 ? Math.sin(Math.min(1, (0.3 - st.hitT) / 0.3) * Math.PI) : 0;
  rig.position.z = lunge * 0.55 * (c.size || 1) - hit * 0.35; rig.rotation.x = -pitch * 0.12 - hit * 0.18;
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
