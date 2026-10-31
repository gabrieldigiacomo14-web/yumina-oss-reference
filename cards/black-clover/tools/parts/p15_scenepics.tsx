
/* ---------- scene pictures ----------
   Yumina can draw a picture for any reply (api.illustrateMessage). This card
   adds three things around that: a setting (Off / Key moments / Every reply),
   a steering note built from the story's own state so the picture matches the
   place, hour, weather, company and what the character wears, and a framed
   picture above the narration with a caption bar (place, time, weather) that the
   card draws itself - image models cannot be given the interface, so the
   "interface text" lives in the frame, never inside the picture.
   Pictures cost the player credits, so Off is the default. If Yumina's own
   "illustrate every reply" switch is on, the card does not ask again (that would
   charge twice); it only shows what was drawn. */
PATHS.camera = "M5 15 H14 L17.5 10 H30.5 L34 15 H43 V39 H5 Z M24 19 A7.5 7.5 0 1 1 23.99 19 Z";
var SP_MODES = [{ v: "off", l: "Off" }, { v: "key", l: "Key moments" }, { v: "every", l: "Every reply" }];
var SP_MIN_GAP = 3, SP_FORCE_GAP = 10;
/* tiny shared store: which replies are being drawn right now, and which failed */
var spState = { drawing: {}, failed: {}, listeners: [] };
function spSet(kind, id, val) { if (val === null) delete spState[kind][id]; else spState[kind][id] = val; spState.listeners.slice().forEach(function (f) { f(); }); }
function useSpTick() {
  var t = React.useState(0), set = t[1];
  React.useEffect(function () { var f = function () { set(function (x) { return x + 1; }); }; spState.listeners.push(f); return function () { spState.listeners = spState.listeners.filter(function (g) { return g !== f; }); }; }, []);
}
function spBand(time) { var m = str(time).match(/^(\d{1,2})/); var h = m ? parseInt(m[1], 10) : 12; return h < 5 ? "night" : h < 8 ? "dawn" : h < 12 ? "morning" : h < 17 ? "afternoon" : h < 20 ? "evening" : "night"; }
function spPlace(v) { var l = parseLoc(v.current_location); return [l.place, l.settlement].filter(Boolean).join(", ") || str(v.current_location); }
function spKey(m) { return str(m && m.id) + ":" + stripTurnImageEmbeds(str(m && m.content)).length; }
function spLastReply(api) {
  var ms = arr(api && api.messages), last = null, n = 0;
  ms.forEach(function (m) { if (m && m.role === "assistant" && m.id && m.status !== "failed" && str(m.content)) { n++; last = m; } });
  return { m: last, n: n };
}
/* is this reply a moment worth a picture? */
function spIsMoment(v, sp, n, band, place) {
  var last = obj(sp.last);
  if (!last.n && last.n !== 0) return true; // the first reply of the story
  var since = n - num(last.n, 0);
  if (isTrue(v.in_combat) !== !!last.combat) return since >= 1;
  if (since < SP_MIN_GAP) return false;
  return place !== last.place || since >= SP_FORCE_GAP || (band !== last.band && since >= 5);
}
/* the steering note: only what the story state knows, short enough for the note field */
function spNote(api, v, reply) {
  var parts = [], band = spBand(v.world_time);
  var inv = arr(v.inventory).map(obj), apps = obj(v.appearance_state);
  parts.push("Scene at " + spPlace(v) + ", " + band + (str(v.weather) ? ", " + str(v.weather).toLowerCase() : "") + ".");
  var names = [];
  splitSceneBlocks(str(reply && reply.content)).forEach(function (b) { if (b.speaker && names.indexOf(b.speaker) < 0) names.push(b.speaker); });
  arr(v.party).forEach(function (p) { var n = str(obj(p).name || p); if (n && names.indexOf(n) < 0) names.push(n); });
  if (names.length) parts.push("With " + names.slice(0, 3).join(", ") + ".");
  var worn = inv.filter(function (it) { var p = obj(it.placement); return p.kind === "body" && /^(cloak|clothes|base-upper|base-lower|torso)$/.test(str(p.slot)); }).map(function (it) { return str(it.name).replace(/^(loose|plain|simple)\s+/i, "").toLowerCase(); }).slice(0, 2);
  if (worn.length) parts.push("Wearing " + worn.join(" and ") + ".");
  if (isTrue(v.in_combat)) parts.push("Mid-fight, dynamic action.");
  else if (num(v.vitality, 100) < 40) parts.push("Hurt and battered.");
  return clipArtNote(parts.join(" "), 198);
}
function useScenePictures(api) {
  var v = (api && api.variables) || {}, sp = obj(v.scene_pics), mode = str(sp.mode) || "off";
  var r = spLastReply(api), key = r.m ? spKey(r.m) : "";
  var hasPic = r.m ? !!lastTurnImageUrl(r.m.content) : false;
  var busy = React.useRef("");
  React.useEffect(function () {
    if (mode === "off" || !key || api.isStreaming || !r.m || busy.current === key || obj(sp.done)[key] || !isTrue(v.character_created)) return;
    if (hasPic) return; // already drawn (by Yumina's own switch or an earlier request)
    if (!canWrite(api) || typeof api.illustrateMessage !== "function" || typeof api.getTurnImageSettings !== "function") return;
    var band = spBand(v.world_time), place = spPlace(v);
    var moment = mode === "every" || spIsMoment(v, sp, r.n, band, place);
    busy.current = key;
    var id = str(r.m.id), reply = r.m;
    Promise.resolve(api.getTurnImageSettings()).then(function (s) {
      var done = Object.assign({}, obj(sp.done)); done[key] = 1;
      var ks = Object.keys(done); if (ks.length > 40) ks.slice(0, ks.length - 40).forEach(function (k) { delete done[k]; });
      // Yumina's own "illustrate every reply" is on: it draws, we only frame
      if (!s || !s.available || s.auto || !moment) { bcPatch(api, { scene_pics: Object.assign({}, sp, { done: done }) }, function () {}); return; }
      bcPatch(api, { scene_pics: Object.assign({}, sp, { done: done, last: { n: r.n, place: place, band: band, combat: isTrue(v.in_combat) } }) }, function () {});
      spSet("drawing", id, true); spSet("failed", id, null);
      return Promise.resolve(api.illustrateMessage(id, spNote(api, v, reply), false)).then(function (ok) { if (ok === false) spSet("failed", id, "Yumina couldn't draw this scene."); }, function () { spSet("failed", id, "Yumina couldn't draw this scene."); }).then(function () { spSet("drawing", id, null); });
    }, function () { }).then(function () { busy.current = ""; }, function () { busy.current = ""; });
  }, [key, mode, !!api.isStreaming, hasPic]);
}
/* a framed picture above the narration; caption comes from the state at that reply */
function ScenePicture(p) {
  useSpTick();
  var big = React.useState(false), isBig = big[0], setBig = big[1];
  var api = p.api, m = p.msg; if (!m) return null;
  var id = str(m.id), url = lastTurnImageUrl(m.content), drawing = !!spState.drawing[id], failed = spState.failed[id];
  var live = (api && api.variables) || {}, snap = obj(m.stateSnapshot);
  var sv = snap.current_location !== undefined ? snap : (p.isLast ? live : {});
  var place = spPlace(sv), when = [str(sv.world_time) ? clock12(sv.world_time) : "", str(sv.world_date)].filter(Boolean).join(" · ");
  if (!url && !drawing && !failed) return null;
  function redraw() {
    if (!canWrite(api) || typeof api.illustrateMessage !== "function") return;
    spSet("drawing", id, true); spSet("failed", id, null);
    Promise.resolve(api.illustrateMessage(id, spNote(api, live, m), false)).then(function (ok) { if (ok === false) spSet("failed", id, "Yumina couldn't redraw this scene."); }, function () { spSet("failed", id, "Yumina couldn't redraw this scene."); }).then(function () { spSet("drawing", id, null); });
  }
  return (
    <figure className="bc-scenepic">
      <div className="bc-scenepic-frame" onClick={function () { if (url) setBig(true); }} role={url ? "button" : undefined} aria-label={url ? "View the scene picture large" : undefined}>
        {url ? <img src={url} alt={"Scene: " + place} loading="lazy" /> : null}
        {drawing ? <div className="bc-scenepic-wait" role="status">{url ? "Redrawing the scene…" : "Drawing the scene…"}</div> : null}
        {failed && !drawing && !url ? <div className="bc-scenepic-wait bc-scenepic-fail" role="status">{str(failed)}</div> : null}
      </div>
      <figcaption className="bc-scenepic-cap">
        <span>{[place, when, str(sv.weather)].filter(Boolean).join("  ·  ")}</span>
        {p.isLast && canWrite(api) && !drawing ? <button type="button" onClick={redraw} aria-label="Redraw this scene picture">Redraw</button> : null}
      </figcaption>
      {isBig && url ? <div className="bc-scenepic-big" onClick={function () { setBig(false); }} role="dialog" aria-label="Scene picture"><img src={url} alt={"Scene: " + place} /></div> : null}
    </figure>
  );
}
/* the manual route: draw this scene, whatever the setting says */
function drawSceneNow(api, msg, done) {
  if (!msg || typeof api.illustrateMessage !== "function") { done && done("This Yumina build can't draw scenes."); return; }
  var id = str(msg.id), v = (api && api.variables) || {};
  spSet("drawing", id, true); spSet("failed", id, null);
  Promise.resolve(api.illustrateMessage(id, spNote(api, v, msg), false)).then(function (ok) { if (ok === false) { spSet("failed", id, "Yumina couldn't draw this scene."); done && done("Yumina couldn't draw that scene. Check Story illustrations in Settings, Display."); } }, function () { spSet("failed", id, "Yumina couldn't draw this scene."); done && done("Yumina couldn't draw that scene. Try again in a moment."); }).then(function () { spSet("drawing", id, null); });
}
/* settings block: the mode, and an honest note on what will happen */
function ScenePicSettings(p) {
  var api = p.api, v = (api && api.variables) || {}, sp = obj(v.scene_pics), mode = str(sp.mode) || "off";
  var ss = React.useState(null), st = ss[0], setSt = ss[1];
  React.useEffect(function () {
    if (!api || typeof api.getTurnImageSettings !== "function") { setSt({ available: false }); return; }
    try { Promise.resolve(api.getTurnImageSettings()).then(function (x) { setSt(x || { available: false }); }, function () { setSt({ available: false }); }); } catch (e) { setSt({ available: false }); }
  }, []);
  var cost = st && st.unlimited ? "Included with your plan." : st && num(st.freeLeft, 0) > 0 ? st.freeLeft + " free picture" + (st.freeLeft === 1 ? "" : "s") + " left, then credits." : st && typeof st.price === "number" ? "About " + st.price + " credits per picture." : "Pictures cost credits.";
  var line = !st ? "Checking whether this world can draw pictures…" : !st.available ? "Story illustrations aren't available on this account (Yumina decides this), so no pictures will be drawn." : st.auto ? "Yumina's own switch is already drawing a picture for every reply, so this card won't ask again. It frames them with the place, time and weather." : mode === "off" ? cost + " Nothing is drawn until you pick a mode, or tap the camera on a reply." : mode === "key" ? "Draws on arrival somewhere new, when a fight starts or ends, and every so often. " + cost : "Draws a picture for each reply. " + cost;
  return (
    <Frame pad="14px" style={{ marginBottom: 14 }}>
      <Field label="Scene pictures" hint="Each narration can open with a picture, framed with the place, time and weather. It follows the story: where you are, who is with you, what you wear, how hurt you are.">
        <Seg label="Scene pictures" value={mode} options={SP_MODES} onChange={function (x) { if (canWrite(api)) api.setVariable("scene_pics", Object.assign({}, sp, { mode: x })); }} />
      </Field>
      <div role="status" style={{ fontSize: 14, color: C.muted, lineHeight: 1.45 }}>{line}</div>
    </Frame>
  );
}
