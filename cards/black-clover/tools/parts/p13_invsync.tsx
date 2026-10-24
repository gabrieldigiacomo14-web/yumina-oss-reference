
/* ---------- story → inventory sync ----------
   The narrator is asked to move items itself, but it often only narrates it
   ("you pull your shirt over your head") and the Satchel falls out of step.
   After a reply finishes, if the player's message or the reply puts a moving
   verb next to the name of one of the character's own things, ONE short,
   history-free classifier call reads that turn and says which belongings moved.
   The move is applied with the same rules as the Satchel buttons. It is a
   UI write after the reply, so regenerating the reply rewinds it too. */
var SYNC_VERB = /\b(take|takes|took|taking|taken|pull\w*|slip\w*|shrug\w*|strip\w*|undress\w*|remov\w+|put|puts|putting|don|dons|donn\w+|wear\w*|wore|dress\w*|chang\w+|set|sets|setting|lay|lays|laying|laid|drop\w*|plac\w+|leav\w+|left|pick\w*|grab\w*|snatch\w*|holster\w*|sheath\w*|unsheath\w*|draw|draws|drawn|drawing|drew|stow\w*|tuck\w*|hang|hangs|hung|toss\w*|float\w*|summon\w*|throw\w*|threw|thrown|unbuckl\w+|buckl\w+|unbutton\w*|shed|sheds|shedding|discard\w*|lift\w*|retriev\w+|tak\w+ off|kick\w* off|peel\w*)\b/gi;
var SYNC_SYS = "You track what the PLAYER CHARACTER physically did with their OWN belongings during one story turn. " +
  "Input: the player's message, the narrator's reply, and the numbered belongings with where each is right now. " +
  "Report only moves that actually happened to those belongings in this turn: not plans, not other people's things, not items merely mentioned or already where the list says. " +
  "Answer JSON only: {\"moves\":[{\"i\":N,\"do\":D,\"spot\":S}]}. D: wear (put on, equip, sling on) | remove (taken off but kept) | hold (now in hand: picked up, drawn, caught) | " +
  "stow (put away in a bag, pouch, sheath or holster) | leave (set down or left here; S = where, e.g. \"on the desk\") | float (grimoire only: now floating beside them). " +
  "{\"moves\":[]} when nothing moved.";
function syncWhere(inv, it, here) {
  var p = obj(it.placement);
  if (p.kind === "body") return p.slot === "grimoire" ? "grimoire floating beside them" : p.slot === "main-hand" || p.slot === "off-hand" ? "in hand" : "worn";
  if (p.kind === "loose") return p.held ? "in hand" : "carried in arms";
  if (p.kind === "container") { var bag = inv.find(function (x) { return x.id === p.containerId; }); return "in " + str(bag ? bag.name : "a bag"); }
  if (p.kind === "world") return "left " + (str(p.spot) || (/^(on|in|at|under|beside|by|near|inside|behind|against)\b/i.test(str(p.location)) ? str(p.location) : "here"));
  return "carried";
}
function syncHere(it, here) {
  var p = obj(it.placement); if (p.kind !== "world") return false;
  // older saves stored the spot ("on the desk") as the location itself
  return str(p.location) === here || /^(on|in|at|under|beside|by|near|inside|behind|against)\b/i.test(str(p.location));
}
function syncNouns(it) {
  var out = [], n = str(it.name).toLowerCase().replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(function (w) { return w.length > 2 && !/^(the|and|with|of|old|new|plain|loose|simple|worn|black|white|gray|grey|red|blue|green|brown|dark|light|small|large|leather|wool|cotton|linen|silk)$/.test(w); });
  if (n.length) out.push(n[n.length - 1].replace(/s$/, ""));
  if (bcSpec(it).tags.indexOf("grimoire") >= 0) out.push("grimoire", "book");
  if (bcIsClothing(it)) out.push("clothes", "clothing", "outfit", "uniform");
  if (/robe|cloak|mantle|cape/i.test(str(it.name))) out.push("robe", "cloak");
  return out;
}
function syncNeedsCheck(text, items) {
  var verbs = [], m; SYNC_VERB.lastIndex = 0;
  while ((m = SYNC_VERB.exec(text))) verbs.push(m.index);
  if (!verbs.length) return false;
  var low = text.toLowerCase();
  return items.some(function (it) {
    return syncNouns(it).some(function (w) {
      var re = new RegExp("\\b" + w.replace(/[^a-z']/g, "") + "(e?s)?\\b", "g"), k;
      while ((k = re.exec(low))) { var at = k.index; if (verbs.some(function (vi) { return Math.abs(vi - at) <= 70; })) return true; }
      return false;
    });
  });
}
function syncApply(inv, it, mv, v) {
  var here = str(v.current_location), id = it.id, q = Math.max(1, num(it.qty, 1));
  var p = obj(it.placement);
  // an item set down in an older save is picked up from where it lies
  if (p.kind === "world" && syncHere(it, here) && str(p.location) !== here) {
    inv = inv.map(function (x) { return x.id === id ? Object.assign({}, x, { placement: { kind: "world", area: p.area || "ground", location: here, spot: str(p.spot) || str(p.location) } }) : x; });
  }
  function move(dest) { var r = bcMoveQty(inv, id, dest, v, q); return r && r.ok ? r.inventory : null; }
  function stowed() { var cur = inv.find(function (x) { return x.id === id; }); var spot = cur && bcFindSpot(inv.filter(function (x) { return x.id !== id; }), cur, true); return spot ? move(spot) : null; }
  var d = str(mv.do).toLowerCase(), out = null;
  if (d === "wear") { var slots = bcAllowedSlots(it); for (var i = 0; i < slots.length && !out; i++) out = move({ kind: "body", slot: slots[i] }); }
  else if (d === "remove") out = (p.kind === "body" ? stowed() || move({ kind: "loose", held: true }) : null) || null;
  else if (d === "hold") out = move({ kind: "loose", held: true }) || stowed();
  else if (d === "stow") out = stowed() || move({ kind: "loose", held: true });
  else if (d === "float") out = bcAllowedSlots(it).indexOf("grimoire") >= 0 ? move({ kind: "body", slot: "grimoire" }) : null;
  else if (d === "leave") {
    out = move({ kind: "world", area: "ground" });
    var spot = str(mv.spot).trim().slice(0, 40);
    if (out && spot) out = out.map(function (x) { return x.id === id ? Object.assign({}, x, { placement: Object.assign({}, x.placement, { spot: /^(on|in|at|under|beside|by|near|inside|behind|against)\b/i.test(spot) ? spot : "by the " + spot.replace(/^the\s+/i, "") }) }) : x; });
  }
  return out;
}
var SYNC_TEXT = { wear: "put on", remove: "took off", hold: "picked up", stow: "put away", leave: "set down", float: "let float beside you" };
function useInventoryStorySync(api) {
  var v = (api && api.variables) || {};
  var ms = arr(api && api.messages), lastAi = null, lastUser = null;
  for (var i = ms.length - 1; i >= 0; i--) {
    var m = ms[i]; if (!m) continue;
    if (!lastAi) { if (m.role === "assistant" && m.status !== "failed") lastAi = m; else if (m.role === "user") break; continue; }
    if (m.role === "user") { lastUser = m; break; }
  }
  var key = lastAi ? str(lastAi.id) + ":" + str(lastAi.content).length : "";
  var done = str(obj(v.inv_sync).k);
  var live = React.useRef(api); live.current = api;
  var busy = React.useRef(""), skipped = React.useRef("");
  React.useEffect(function () {
    if (!key || key === done || busy.current === key || skipped.current === key) return;
    if (!isTrue(v.character_created) || !canWrite(api) || !api.ai || typeof api.ai.complete !== "function") return;
    var here = str(v.current_location), inv = arr(v.inventory);
    var mine = inv.filter(function (it) { return it && str(it.name) && (bcCarried(it, inv) || syncHere(it, here)); }).slice(0, 40);
    var said = str(lastUser && lastUser.content).slice(-600), told = cleanPassage(proseOf(lastAi.content)).slice(-2400);
    if (!mine.length || !syncNeedsCheck(said + "\n" + told, mine)) { skipped.current = key; return; }
    busy.current = key;
    var list = mine.map(function (it, n) { return n + ". " + str(it.name) + " — " + syncWhere(inv, it, here); }).join("\n");
    var pr;
    try { pr = api.ai.complete({ messages: [{ role: "system", content: SYNC_SYS }, { role: "user", content: "PLAYER: " + (said || "(none)") + "\n\nREPLY: " + told + "\n\nBELONGINGS:\n" + list }], maxTokens: 140, temperature: 0, responseFormat: { type: "json_object" } }); }
    catch (e) { busy.current = ""; skipped.current = key; return; }
    Promise.resolve(pr).then(function (text) {
      var a = live.current, cv = obj(a && a.variables);
      // the reply was regenerated or edited meanwhile: its own check will run
      var ms2 = arr(a && a.messages), last2 = null; for (var j = ms2.length - 1; j >= 0; j--) if (ms2[j] && ms2[j].role === "assistant") { last2 = ms2[j]; break; }
      if (!last2 || str(last2.id) + ":" + str(last2.content).length !== key || !canWrite(a)) return;
      text = str(text); var t = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, ""), parsed = null;
      try { parsed = JSON.parse(t); } catch (e) { var a0 = t.indexOf("{"), b0 = t.lastIndexOf("}"); if (a0 >= 0 && b0 > a0) { try { parsed = JSON.parse(t.slice(a0, b0 + 1)); } catch (e2) { parsed = null; } } }
      var cur = bcNormalize(arr(cv.inventory), cv), changed = [], moved = {};
      arr(parsed && parsed.moves).slice(0, 6).forEach(function (mv) {
        mv = obj(mv); var ref = mine[Math.floor(num(mv.i, -1))]; if (!ref || moved[ref.id] || !SYNC_TEXT[str(mv.do).toLowerCase()]) return;
        var it = cur.find(function (x) { return x.id === ref.id; }); if (!it) return;
        var next = syncApply(cur, it, mv, cv); if (!next) return;
        var after = next.find(function (x) { return x.id === ref.id; });
        if (after && JSON.stringify(after.placement) === JSON.stringify(it.placement)) return;
        cur = bcNormalize(next, cv); moved[ref.id] = 1; changed.push(SYNC_TEXT[str(mv.do).toLowerCase()] + " " + str(it.name));
      });
      var patch = { inv_sync: { k: key } };
      if (changed.length) {
        var appearance = bcAppearance(cur, cv), seq = num(cv.equipment_event_seq, 0) + 1;
        appearance.lastChangedId = "gear-" + seq;
        patch.inventory = cur; patch.appearance_state = appearance;
        patch.carry_state = bcCarryProfile(cur, obj(cv.body_profile), bcWalletProfile(cv.money).weightKg);
        patch.equipment_activity = arr(cv.equipment_activity).concat([{ id: "gear-" + seq, kind: "story", text: "Satchel updated from the story: you " + changed.join(", ") + ".",
          location: str(cv.current_location), at: str(cv.world_time), meaningful: false, observed: true, msgs: ms2.length }]).slice(-6);
        patch.equipment_event_seq = seq;
      }
      bcPatch(a, patch, function () {});
    }, function (e) { try { console.warn("bc inventory sync:", e); } catch (er) {} skipped.current = key; }).then(function () { busy.current = ""; }, function () { busy.current = ""; });
  }, [key, done, !!(api && api.isStreaming)]);
}
