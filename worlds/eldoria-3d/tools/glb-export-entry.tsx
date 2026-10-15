// @ts-nocheck
// Runs in the browser (see export-glb.mjs): builds a procedural character, bakes the game's animation clips into
// glTF animations and writes a GLB. It proves the asset pipeline end to end and gives artists a template to
// replace: same bone names, same clip names, same sockets.
import * as THREE_NS from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
window.THREE = Object.assign({}, THREE_NS);
import { makeHumanoid } from "../src/models";
import { animateHumanoid, playAction, CLIPS } from "../src/anim";

var FPS = 30; var JOINT_NAMES = ["hips", "spine", "chest", "neck", "head", "lhip", "lknee", "rhip", "rknee", "lsh", "lel", "lhand", "rsh", "rel", "rhand"];
function sample(h, name, kind, dur) {
  var THREE = window.THREE; var bones = JOINT_NAMES.map(function (j) { return j === "hips" ? h.hips : j === "spine" ? h.spine : j === "chest" ? h.chest : j === "neck" ? h.neck : j === "head" ? h.head : j === "lhip" ? h.L.hip : j === "lknee" ? h.L.knee : j === "rhip" ? h.R.hip : j === "rknee" ? h.R.knee : j === "lsh" ? h.LA.sh : j === "lel" ? h.LA.el : j === "lhand" ? h.LA.hand : j === "rsh" ? h.RA.sh : j === "rel" ? h.RA.el : h.RA.hand; });
  h.t = 0; h.ph = 0; h.action = null; h.actionT = 0; h.deadHeld = false; h.rig.rotation.set(0, 0, 0); h.rig.position.set(0, 0, 0); var st = { speed: 0, calm: true };
  if (kind === "walk") st.speed = 1; if (kind === "run") st.speed = 2; if (kind === "combat") { st.combat = true; st.calm = false; } if (kind === "sit") st.sit = true; if (kind === "crossArms") st.crossArms = true;
  animateHumanoid(h, 0.0001, st); if (kind === "action") playAction(h, name, null);
  var n = Math.max(2, Math.round(dur * FPS) + 1); var times = []; var Q = bones.map(function () { return []; }); var P = []; var wpnHand = h.weaponKind === "bow" ? h.LA.hand : h.RA.hand;
  for (var i = 0; i < n; i++) {
    animateHumanoid(h, i === 0 ? 0.0001 : 1 / FPS, st); times.push(i / FPS); h.rig.updateMatrix(); h.hips.updateMatrix();
    bones.forEach(function (b, k) {
      var q = b.quaternion.clone();
      if (b === wpnHand && h.weapon) { var d = h.weapon.rotation.x - (h.weapon.userData.rest || 0); q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), d)); }
      if (k === 0) { var M = new THREE.Matrix4().multiplyMatrices(h.rig.matrix, h.hips.matrix); var p = new THREE.Vector3(), qq = new THREE.Quaternion(), sc = new THREE.Vector3(); M.decompose(p, qq, sc); P.push(p.x, p.y, p.z); q = qq; }
      Q[k].push(q.x, q.y, q.z, q.w);
    });
  }
  var tracks = bones.map(function (b, k) { return new THREE.QuaternionKeyframeTrack(JOINT_NAMES[k] + ".quaternion", times, Q[k]); }); tracks.push(new THREE.VectorKeyframeTrack("hips.position", times, P));
  return new THREE.AnimationClip(name, -1, tracks);
}
window.__exportHumanoid = function (look, opts) {
  var THREE = window.THREE; opts = opts || {}; var h = makeHumanoid(Object.assign({ detail: opts.detail || "lo" }, look)); if (h.glb) throw new Error("a glTF model is registered; export from the procedural body");
  var clips = []; var events = {};
  var loops = { idle: 3.7, walk: 0.924, run: 0.571, combat: 1.5, sit: 1, crossArms: 1 };
  ["idle", "combat", "walk", "run", "sit", "crossArms"].forEach(function (k) { clips.push(sample(h, k, k, loops[k])); });
  Object.keys(CLIPS).forEach(function (name) { var c = CLIPS[name]; clips.push(sample(h, name, "action", c.dur)); events[name] = c.ev || []; });
  // sockets / weapon are attached at runtime, not baked into the asset
  if (h.weapon && h.weapon.parent) h.weapon.parent.remove(h.weapon); var hood = h.head.userData.hood; if (hood && hood.parent) hood.parent.remove(hood);
  /* the exported nodes carry the bind pose, as DCC tools expect */ h.rig.rotation.set(0, 0, 0); h.rig.position.set(0, 0, 0); h.root.traverse(function (o) { if (o.isBone) o.quaternion.identity(); }); h.hips.position.set(0, h.hipY, 0);
  var meta = new THREE.Object3D(); meta.name = "EldoriaMeta"; meta.userData = { version: 1, source: "eldoria-procedural", headSize: h.body.headSize, noTint: true, clipEvents: events, retime: false, bakedFades: true, sockets: { hand_r: { pos: [0, -0.06, 0], rot: [Math.PI - 0.45, 0, 0] }, hand_l: { pos: [0, -0.06, 0], rot: [Math.PI, 0, 0] }, shield: { pos: [-0.07, -0.16, 0.02], rot: [0, 0.15, Math.PI / 2] } } };
  var scene = new THREE.Group(); scene.name = "Eldoria"; scene.add(h.root.children[0].children[0] || h.root); // built.root holds the skinned meshes
  scene.add(meta);
  // materials get stable names so the runtime can tell skin from cloth
  scene.traverse(function (o) { if (o.isMesh && !o.material.name) o.material.name = o.isSkinnedMesh && o === h.body.layers[0] ? "skin" : o.name || "material"; });
  return new Promise(function (resolve, reject) {
    new GLTFExporter().parse(scene, function (buf) { var u = new Uint8Array(buf); var s = ""; for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); resolve({ b64: btoa(s), bytes: u.length, clips: clips.map(function (c) { return c.name + ":" + c.duration.toFixed(2); }) }); }, reject, { binary: true, animations: clips, onlyVisible: false, embedImages: true, maxTextureSize: 1024 });
  });
};
