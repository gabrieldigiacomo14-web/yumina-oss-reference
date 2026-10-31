
/* ---------- world threads: the world moves while you are elsewhere ----------
   No event list. The world is 4-6 ongoing situations ("threads"), each with a
   0-6 clock, like Apocalypse World fronts or Blades in the Dark faction clocks.
   - The narrator opens, records and ends threads through thread_events; this
     hook applies them to world_threads (hidden) and writes world_pulse, the one
     line the narrator reads.
   - Each new in-world day the clocks may tick (dice seeded by thread and day,
     so a regenerated reply sees the same world). A tick tells the narrator once
     that something happened offscreen; it writes what it was (a beat). Details
     are invented only when needed, then kept.
   - News spreads with the clock: insiders → the town → the kingdom → everywhere.
     In a public scene the most relevant thread that has reached this place is
     offered as overheard chatter (at most once every few replies); once a reply
     has carried it, it is filed in known_events as a rumor with where it was heard.
   All of it lives in variables written after replies, so regenerate rewinds it. */
var WT_MAX = 6, WT_WANT = 4, WT_TICK = 0.32, WT_HEAR_GAP = 3;
var WT_PUBLIC = /^(street|shop|tavern|church|workplace|squad_hq|ceremony)$/;
var WT_KINGDOMS = ["clover", "diamond", "heart", "spade"];
function wtHash(s) { var h = 2166136261; s = str(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  // final mix: without it, similar ids ("t4:12", "t4:13") give near-identical rolls and a thread can stall forever
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function wtWords(s) { return str(s).toLowerCase().replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(function (w) { return w.length > 3 && !/^(kingdom|realm|common|noble|forsaken|road|the|near|town|city|village|outside|north|south|east|west|area|region)$/.test(w); }); }
function wtKingdom(s) { var t = str(s).toLowerCase(); for (var i = 0; i < WT_KINGDOMS.length; i++) if (t.indexOf(WT_KINGDOMS[i]) >= 0) return WT_KINGDOMS[i]; return ""; }
/* where the news of a thread can be heard: by its clock, sooner in a tavern */
function wtReaches(t, v) {
  var here = str(v.current_location).toLowerCase(), c = num(t.clock, 0) + (str(v.scene_type) === "tavern" ? 1 : 0);
  var local = wtWords(t.where).some(function (w) { return here.indexOf(w) >= 0; });
  var hk = wtKingdom(here) || "clover", tk = wtKingdom(t.where) || "clover";
  return c >= 6 || (c >= 4 && hk === tk) || (c >= 2 && local);
}
function wtSalience(t, v) {
  var s = num(t.clock, 0), h = obj(t.heard), beats = arr(t.beats).length;
  if (h.clock === t.clock && h.beats === beats) return -1; // nothing new since the character last heard of it
  var squad = str(obj(v.mk_status).squad).toLowerCase(), home = wtWords(v.home_location), text = (str(t.title) + " " + str(t.who) + " " + str(t.where)).toLowerCase();
  if (squad && squad !== "none" && text.indexOf(squad.split(" ").pop()) >= 0) s += 3;
  if (home.some(function (w) { return text.indexOf(w) >= 0; })) s += 2;
  if (beats > num(h.beats, 0)) s += 2;
  if (!h.clock) s += 1;
  return s;
}
function wtLastReply(api) {
  var ms = arr(api && api.messages), n = 0, last = null;
  ms.forEach(function (m) { if (m && m.role === "assistant" && m.status !== "failed") { n++; last = m; } });
  return { key: last ? str(last.id) + ":" + str(last.content).length : "", n: n };
}
function wtClip(s, n) { s = str(s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function useWorldThreads(api) {
  var v = (api && api.variables) || {};
  var rep = wtLastReply(api);
  var day = Math.floor(num(v.elapsed_days, 0));
  var sig = JSON.stringify([v.world_threads, v.thread_events, v.current_location, v.scene_type, day, rep.key, v.world_pulse, v.character_created]);
  var attempted = React.useRef("");
  React.useEffect(function () {
    if (!isTrue(v.character_created) || !canWrite(api) || attempted.current === sig) return;
    var W = JSON.parse(JSON.stringify(obj(v.world_threads)));
    W.list = arr(W.list); W.pending = arr(W.pending); W.seq = num(W.seq, 0);
    var date = str(v.world_date), place = sqPlaceOf(v), patch = {}, changed = false, known = null;
    function find(id) { id = str(id).trim(); return W.list.filter(function (t) { return t.id === id || str(t.title).toLowerCase() === id.toLowerCase(); })[0]; }
    // 1. the reply that just finished carried the pending lines: they are delivered
    if (W.replyKey !== rep.key) {
      if (W.replyKey !== undefined && rep.key) {
        if (W.pending.length) { W.pending = []; changed = true; }
        var off = obj(W.offer);
        if (off.id && off.key === W.replyKey) {
          var ot = find(off.id);
          if (ot) {
            ot.heard = { clock: ot.clock, beats: arr(ot.beats).length, day: day, at: place };
            known = arr(known || v.known_events).slice(); var eid = "rumor-" + ot.id;
            var entry = { id: eid, title: wtClip(ot.talk || ot.title, 90), when: date, where: str(ot.where), kind: "rumor", status: "known", source: "Overheard at " + place, thread: ot.id };
            var at = -1; known.forEach(function (e, i) { if (e && e.id === eid) at = i; });
            if (at >= 0) known[at] = Object.assign({}, known[at], entry); else known.push(entry);
          }
          W.lastHeardN = rep.n; W.offer = null; changed = true;
        }
      }
      W.replyKey = rep.key; changed = true;
    }
    // 2. apply what the narrator filed
    var evs = arr(v.thread_events);
    evs.forEach(function (e) {
      e = obj(e); var op = str(e.op || e.type).toLowerCase(), t = find(e.id || e.title);
      if (op === "new") {
        if (!str(e.title).trim() || t && t.state !== "ended") return;
        if (W.list.filter(function (x) { return x.state !== "ended"; }).length >= WT_MAX) return;
        W.seq++; W.list.push({ id: "t" + W.seq, title: wtClip(e.title, 60), who: wtClip(e.who, 60), where: wtClip(e.where, 60), clock: Math.max(0, Math.min(5, Math.round(num(e.clock, 1)))),
          next: wtClip(e.next, 90), talk: wtClip(e.talk, 110), state: "active", made: date, beats: [] });
      } else if (t) {
        if (op === "beat" || op === "push" || op === "hinder") {
          if (str(e.text).trim()) t.beats = arr(t.beats).concat([{ date: date, text: wtClip(e.text, 140) }]).slice(-6);
          if (op !== "beat") t.clock = Math.max(0, Math.min(6, num(t.clock, 0) + (op === "hinder" ? -Math.abs(num(e.by, 1)) : Math.abs(num(e.by, 1)))));
        }
        if (op === "end") { t.state = "ended"; t.outcome = wtClip(e.outcome || e.text, 140); t.ended = date; }
        if (e.next !== undefined && str(e.next).trim()) t.next = wtClip(e.next, 90);
        if (e.talk !== undefined && str(e.talk).trim()) t.talk = wtClip(e.talk, 110);
        if (e.where !== undefined && str(e.where).trim()) t.where = wtClip(e.where, 60);
      }
      changed = true;
    });
    if (evs.length) patch.thread_events = [];
    // keep the ten most recent ended threads for continuity, drop the rest
    var ended = W.list.filter(function (t) { return t.state === "ended"; });
    if (ended.length > 10) { var drop = ended.slice(0, ended.length - 10); W.list = W.list.filter(function (t) { return drop.indexOf(t) < 0; }); changed = true; }
    // 3. days passed: roll the clocks once per day
    if (W.day === undefined) { W.day = day; changed = true; }
    else if (day > W.day) {
      for (var d = Math.max(W.day + 1, day - 6); d <= day; d++) {
        W.list.forEach(function (t) {
          if (t.state === "ended" || num(t.clock, 0) >= 6) return;
          if (wtHash(t.id + ":" + d) < WT_TICK + (num(t.clock, 0) >= 4 ? 0.08 : 0)) {
            t.clock = num(t.clock, 0) + 1;
            W.pending = W.pending.filter(function (p) { return p.id !== t.id; }).concat([{ id: t.id, clock: t.clock }]);
          }
        });
      }
      W.day = day; changed = true;
    }
    // 4. something worth overhearing here?
    var active = W.list.filter(function (t) { return t.state !== "ended"; });
    {
      var pick = null, best = -1;
      if (WT_PUBLIC.test(str(v.scene_type)) && rep.n - num(W.lastHeardN, -99) >= WT_HEAR_GAP) {
        active.forEach(function (t) { if (!wtReaches(t, v)) return; var sc = wtSalience(t, v); if (sc > best) { best = sc; pick = t; } });
      }
      var nextOffer = pick && best >= 0 ? { id: pick.id, key: rep.key } : null;
      if (JSON.stringify(nextOffer) !== JSON.stringify(W.offer || null)) { W.offer = nextOffer; changed = true; }
    }
    // 5. the one line the narrator reads
    var lines = [];
    if (active.length) lines.push("Threads: " + active.map(function (t) { return t.id + " " + t.title + (t.where ? " @" + t.where : "") + " " + num(t.clock, 0) + "/6" + (t.next ? " → " + wtClip(t.next, 60) : ""); }).join(" · "));
    W.pending.forEach(function (p) {
      var t = find(p.id); if (!t) return;
      lines.push(p.clock >= 6 ? "OFFSCREEN: " + t.id + " comes to a head now. Decide the outcome; file beat + end (or a follow-up thread)."
        : "OFFSCREEN: " + t.id + " moved (" + p.clock + "/6). File a beat: what happened, the new next step and what people now say. Reveal it only through what the character could perceive.");
    });
    var of = W.offer && find(W.offer.id);
    if (of) lines.push("HEARD HERE: people nearby are talking about " + of.id + (of.talk ? ": \"" + of.talk + "\"" : "") + ". Work it in as one or two lines of background talk the character overhears, as locals would tell it (may be partly wrong). Don't make it the scene.");
    if (active.length < WT_WANT) lines.push("FEW THREADS (" + active.length + "/" + WT_WANT + "): when it fits, open one offscreen situation that suits the setting (thread_events new).");
    var pulse = lines.join("\n");
    if (pulse !== str(v.world_pulse)) patch.world_pulse = pulse;
    if (changed) patch.world_threads = W;
    if (known) patch.known_events = known;
    if (!Object.keys(patch).length) { attempted.current = sig; return; }
    attempted.current = sig;
    bcPatch(api, patch, function (ok) { if (!ok) attempted.current = ""; });
  }, [sig, !!(api && api.isStreaming)]);
}
