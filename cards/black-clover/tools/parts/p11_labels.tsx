
/* ---------- AI labels: what an item or spell IS ----------
   The narrator labels new items and spells itself (kind/wear/holds/size on
   items, arena/look on spells), which costs no extra call. Only when something
   arrives unlabelled AND the engine's word lists can't place it does this hook
   make ONE batched, history-free, lore-free classifier call after the reply has
   finished. Answers are checked against the fixed option lists, saved in
   ai_labels (hidden from the narrator) and never asked for again. */
var LABEL_SYS = "You label objects for a Black Clover RPG engine. Answer JSON only: " +
  "{\"items\":{\"<exact name>\":{\"kind\":K,\"wear\":W,\"holds\":[H],\"size\":Z}},\"spells\":{\"<exact name>\":{\"arena\":A,\"look\":L}}}. " +
  "K: " + BC_KINDS.join("|") + ". W, where it is worn or carried ready (none if it is just carried): " + BC_WEAR.join("|") +
  ". cloak = squad robes, capes, cloaks over clothes; clothes = one-piece outfits only; hip = holsters, scabbards. " +
  "holds and size only for bags, pouches, holsters: H " + BC_HOLDS.join("|") + "; Z small|medium|large. " +
  "A, how the spell acts in a fight: " + BC_ARENA.join("|") + " (dome = barrier all around; seal-foe = seals one enemy). L: " + BC_LOOKS.join("|") + "|none.";
function lbl(x) { return str(x).toLowerCase(); }
function pickByName(map, name) {
  if (map[name]) return map[name];
  var k = lbl(name); for (var key in map) if (lbl(key) === k) return map[key];
  return null;
}
function capMap(m, n) { var ks = Object.keys(m); if (ks.length <= n) return m; var out = {}; ks.slice(ks.length - n).forEach(function (k) { out[k] = m[k]; }); return out; }
function useAiLabeler(api) {
  var v = api.variables || {}; var L = obj(v.ai_labels), asked = obj(L.asked), li = obj(L.items), ls = obj(L.spells);
  var attr = obj(v.magic_profile).attribute;
  var items = [], spells = [], seen = {};
  arr(v.inventory).forEach(function (it) {
    if (!it || !str(it.name)) return; var k = bcLabelKey(it.name);
    if (!k || seen[k] || asked[k] || li[k] || !bcIsUncertain(it)) return;
    seen[k] = 1; items.push({ name: str(it.name), type: str(it.type), notes: str(it.notes || it.description).slice(0, 120) });
  });
  arr(v.spells).forEach(function (sp) {
    if (!sp || !str(sp.name) || sp.arena) return; var k = spellLabelKey(sp.name);
    if (!k || seen["s:" + k] || asked["s:" + k] || ls[k] || !readSpell(sp, attr).guessed) return;
    seen["s:" + k] = 1; spells.push({ name: str(sp.name), does: str(sp.behavior || sp.description).slice(0, 200) });
  });
  var sig = items.map(function (x) { return x.name; }).concat(spells.map(function (x) { return "s:" + x.name; })).join("|");
  var busy = React.useRef(false), nextOk = React.useRef(0);
  React.useEffect(function () {
    if (!sig || api.isStreaming || busy.current || !canWrite(api) || Date.now() < nextOk.current) return;
    if (!api.ai || typeof api.ai.complete !== "function") return;
    var reqI = items.slice(0, 8), reqS = spells.slice(0, 6);
    busy.current = true; nextOk.current = Date.now() + 45000;
    var pr;
    try { pr = api.ai.complete({ messages: [{ role: "system", content: LABEL_SYS }, { role: "user", content: JSON.stringify({ items: reqI, spells: reqS }) }], maxTokens: 80 + 45 * (reqI.length + reqS.length), temperature: 0, responseFormat: { type: "json_object" } }); }
    catch (e) { busy.current = false; return; }
    Promise.resolve(pr).then(function (text) {
      text = str(text);
      if (!text || /^\[Error:/.test(text)) { nextOk.current = Date.now() + 300000; return; } // not charged or not available: try again much later
      var parsed = null, t = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
      try { parsed = JSON.parse(t); } catch (e) { var a0 = t.indexOf("{"), b0 = t.lastIndexOf("}"); if (a0 >= 0 && b0 > a0) { try { parsed = JSON.parse(t.slice(a0, b0 + 1)); } catch (e2) { parsed = null; } } }
      var cur = obj(obj(api.variables).ai_labels);
      var next = { items: Object.assign({}, obj(cur.items)), spells: Object.assign({}, obj(cur.spells)), asked: Object.assign({}, obj(cur.asked)) };
      var pi = obj(parsed && parsed.items), ps = obj(parsed && parsed.spells);
      reqI.forEach(function (it) {
        var k = bcLabelKey(it.name), r = obj(pickByName(pi, it.name)), lab = {};
        if (BC_KINDS.indexOf(lbl(r.kind)) >= 0) lab.kind = lbl(r.kind);
        if (BC_WEAR.indexOf(lbl(r.wear)) >= 0) lab.wear = lbl(r.wear);
        var h = arr(r.holds).map(lbl).filter(function (x) { return BC_HOLDS.indexOf(x) >= 0; }); if (h.length && lab.kind === "container") lab.holds = h;
        if (["small", "medium", "large"].indexOf(lbl(r.size)) >= 0 && lab.kind === "container") lab.size = lbl(r.size);
        if (lab.kind || lab.wear) next.items[k] = lab;
        next.asked[k] = 1;
      });
      reqS.forEach(function (sp) {
        var k = spellLabelKey(sp.name), r = obj(pickByName(ps, sp.name)), lab = {};
        if (BC_ARENA.indexOf(lbl(r.arena)) >= 0) lab.arena = lbl(r.arena);
        if (BC_LOOKS.indexOf(lbl(r.look)) >= 0) lab.look = lbl(r.look);
        if (lab.arena) next.spells[k] = lab;
        next.asked["s:" + k] = 1;
      });
      next.items = capMap(next.items, 300); next.spells = capMap(next.spells, 120); next.asked = capMap(next.asked, 500);
      api.setVariable("ai_labels", next);
    }, function (e) { nextOk.current = Date.now() + 300000; try { console.warn("bc labeler:", e); } catch (er) {} }).then(function () { busy.current = false; }, function () { busy.current = false; });
  }, [sig, !!api.isStreaming]);
}
