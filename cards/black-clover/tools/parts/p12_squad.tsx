
/* ---------- squad roster ----------
   Modelled on the party system of the Barbarian card: the narrator never edits
   the roster itself. It files short squad_events (join / update / seen / leave /
   death); this hook applies them to squad_roster (hidden from the narrator) and
   writes a one-line squad_summary the narrator reads each turn. Squadmates live
   their own lives: one is "with you" only while they are in `party` (or an event
   says so); otherwise the roster keeps where they were last known to be. */
var SQ_CONDS = ["healthy", "tired", "bruised", "hurt", "injured", "badly hurt", "critical", "unconscious", "dead"];
var SQ_HP = { healthy: 100, tired: 85, bruised: 80, hurt: 62, injured: 45, "badly hurt": 30, critical: 14, unconscious: 8, dead: 0 };
var SQ_RECENT_DAYS = 30;
function sqKey(name) { return str(name).toLowerCase().replace(/^(captain|vice[- ]captain|sir|lady|lord)\s+/, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function sqCond(c) { c = str(c).toLowerCase().trim(); if (!c) return ""; for (var i = 0; i < SQ_CONDS.length; i++) if (c.indexOf(SQ_CONDS[i]) >= 0) return SQ_CONDS[i]; if (/wound|bleed/.test(c)) return "injured"; if (/fine|well|ok|rested|unhurt/.test(c)) return "healthy"; if (/exhaust|weary|drain/.test(c)) return "tired"; if (/scratch|graze|minor/.test(c)) return "bruised"; if (/k\.?o|knocked out|out cold/.test(c)) return "unconscious"; return c.slice(0, 24); }
function sqDay(v) { return Math.floor(num(v.elapsed_days, 0)); }
function sqPartyEntry(v, name) { var k = sqKey(name); return arr(v.party).filter(function (p) { var n = sqKey(obj(p).name || p); return n && (n === k || n.split(" ")[0] === k.split(" ")[0] && k.split(" ")[0].length > 3); })[0]; }
function sqInParty(v, name) { var k = sqKey(name); return arr(v.party).some(function (p) { var n = sqKey(obj(p).name || p); return n && (n === k || n.split(" ")[0] === k.split(" ")[0] && k.split(" ")[0].length > 3); }); }
function sqSquadName(v) { var s = str(obj(v.mk_status).squad); return s && s !== "none" ? s : ""; }
function sqPlaceOf(v) { var t = str(v.current_location); return t.split(/\s+[—–-]\s+|\(/)[0].trim() || t; }
function sqAgo(days) { return days <= 0 ? "today" : days === 1 ? "yesterday" : days + " days ago"; }

/* apply queued events and keep last-seen / summary current */
function useSquadRoster(api) {
  var v = (api && api.variables) || {};
  var squad = sqSquadName(v);
  var sig = JSON.stringify([v.squad_events, squad, v.party, v.current_location, v.elapsed_days, v.world_date, v.squad_summary, Object.keys(obj(obj(obj(v.squad_roster).squads)[squad])).length]);
  var attempted = React.useRef("");
  React.useEffect(function () {
    if (!isTrue(v.character_created) || !canWrite(api) || attempted.current === sig) return;
    var roster = JSON.parse(JSON.stringify(obj(v.squad_roster))); roster.squads = obj(roster.squads);
    var day = sqDay(v), date = str(v.world_date), here = sqPlaceOf(v), changed = false;
    var evs = arr(v.squad_events);
    evs.forEach(function (e) {
      e = obj(e); var name = str(e.name).trim(); if (!name) return;
      var sq = str(e.squad) || squad; if (!sq) return;
      var book = roster.squads[sq] = obj(roster.squads[sq]); var k = sqKey(name); var m = book[k];
      var type = str(e.type).toLowerCase() || "update";
      if (!m) { if (type === "leave" || type === "death") return; m = book[k] = { name: name, joinedDay: type === "join" && e.joined !== "before" ? day : null, joined: type === "join" && e.joined !== "before" ? date : "", history: [] }; }
      if (type === "join" && e.joined === "before") { m.joinedDay = null; m.joined = ""; }
      ["role", "rank", "magic", "notes", "mission"].forEach(function (f) { if (e[f] !== undefined && str(e[f]).trim()) m[f] = str(e[f]).trim(); });
      if (e.location !== undefined && str(e.location).trim()) { m.location = str(e.location).trim(); m.locDay = day; m.locDate = date; }
      if (e.condition !== undefined) { var c = sqCond(e.condition); if (c) m.condition = c; }
      if (e.hp !== undefined && isFinite(Number(e.hp))) m.hp = Math.max(0, Math.min(100, Math.round(Number(e.hp))));
      else if (e.condition !== undefined && SQ_HP[m.condition] !== undefined) m.hp = SQ_HP[m.condition];
      if (e.with === true) { m.with = true; m.withAt = here; m.viaParty = false; m.lastSeenDay = day; m.lastSeen = date; m.location = here; m.locDay = day; m.locDate = date; }
      if (e.with === false) { m.with = false; m.withAt = ""; }
      if (e.with !== true && e.location !== undefined && str(e.location).trim() && str(e.location).trim() !== here) { m.with = false; m.withAt = ""; }
      if (type === "seen") { m.lastSeenDay = day; m.lastSeen = date; if (!e.location && here) { m.location = here; m.locDay = day; m.locDate = date; } }
      if (type === "leave") { m.status = "left"; m.with = false; }
      else if (type === "death") { m.status = "dead"; m.condition = "dead"; m.hp = 0; m.with = false; }
      else if (e.status !== undefined && str(e.status).trim()) m.status = str(e.status).trim().toLowerCase();
      else if (!m.status) m.status = "active";
      var note = type === "join" ? (e.joined === "before" ? "On the roster" : "Joined the squad") : type === "leave" ? "Left the squad" + (e.note ? ": " + str(e.note) : "") : type === "death" ? "Died" + (e.note ? ": " + str(e.note) : "") : [m.condition && e.condition !== undefined ? m.condition : "", e.location ? "at " + str(e.location) : "", e.mission ? "mission: " + str(e.mission) : "", e.note ? str(e.note) : ""].filter(Boolean).join(", ");
      if (note) m.history = arr(m.history).concat([{ date: date, text: note }]).slice(-8);
      changed = true;
    });
    // anyone in the party right now is with you; everyone else keeps their last known place
    var book0 = squad ? roster.squads[squad] = obj(roster.squads[squad]) : {};
    Object.keys(book0).forEach(function (k) {
      var m = book0[k]; if (m.status === "dead" || m.status === "left") { if (m.with) { m.with = false; changed = true; } return; }
      var present = sqInParty(v, m.name);
      if (present) { var pe = obj(sqPartyEntry(v, m.name)), pc = sqCond(pe.condition); if (pc && pc !== m.condition) { m.condition = pc; if (SQ_HP[pc] !== undefined) m.hp = SQ_HP[pc]; changed = true; } }
      if (present) { if (!m.with || !m.viaParty || m.lastSeenDay !== day || m.location !== here) { m.with = true; m.withAt = here; m.viaParty = true; m.lastSeenDay = day; m.lastSeen = date; m.location = here; m.locDay = day; m.locDate = date; changed = true; } }
      // with you by the story's word stays true until you move on without them
      else if (m.with && (m.viaParty || !m.withAt || m.withAt !== here)) { m.with = false; m.withAt = ""; m.viaParty = false; changed = true; }
    });
    var summary = "";
    if (squad) {
      var list = Object.keys(book0).map(function (k) { return book0[k]; }).filter(function (m) { return m.status !== "left"; });
      var withYou = list.filter(function (m) { return m.with && m.status !== "dead"; }), away = list.filter(function (m) { return !m.with && m.status !== "dead"; });
      var recent = list.filter(function (m) { return m.joinedDay !== null && m.joinedDay !== undefined && day - m.joinedDay <= SQ_RECENT_DAYS && m.status !== "dead"; });
      var cond = function (m) { return m.condition && m.condition !== "healthy" ? " (" + m.condition + ")" : ""; };
      summary = squad + (list.length ? "" : ": no squadmates on file yet") +
        (withYou.length ? ". With you: " + withYou.map(function (m) { return m.name + cond(m); }).join(", ") : "") +
        (away.length ? ". Elsewhere: " + away.slice(0, 14).map(function (m) { return m.name + cond(m) + (m.mission ? " on " + m.mission : m.location ? " at " + m.location : "") + (m.locDay !== undefined && m.locDay !== null && day - m.locDay > 0 ? " (" + sqAgo(day - m.locDay) + ")" : ""); }).join("; ") + (away.length > 14 ? "; +" + (away.length - 14) + " more" : "") : "") +
        (recent.length ? ". Joined recently: " + recent.map(function (m) { return m.name; }).join(", ") : "") + ".";
    }
    var patch = {};
    if (evs.length) patch.squad_events = [];
    if (changed) patch.squad_roster = roster;
    if (summary !== str(v.squad_summary)) patch.squad_summary = summary;
    attempted.current = sig;
    if (!Object.keys(patch).length) return;
    bcPatch(api, patch, function (ok) { if (!ok) attempted.current = ""; });
  }, [sig, !!(api && api.isStreaming)]);
}

function SquadRoster(p) {
  var api = p.api, v = api.variables || {}, busy = !!api.isStreaming, squad = sqSquadName(v), day = sqDay(v);
  var book = obj(obj(obj(v.squad_roster).squads)[squad]);
  var fs = React.useState("all"), filter = fs[0], setFilter = fs[1];
  var os = React.useState(""), open = os[0], setOpen = os[1];
  var all = Object.keys(book).map(function (k) { var m = Object.assign({ key: k }, book[k]); m.with = m.status !== "dead" && m.status !== "left" && (sqInParty(v, m.name) || !!m.with); return m; });
  var current = all.filter(function (m) { return m.status !== "left"; }), former = all.filter(function (m) { return m.status === "left"; });
  var isNew = function (m) { return m.joinedDay !== null && m.joinedDay !== undefined && day - m.joinedDay <= SQ_RECENT_DAYS; };
  var rank = function (m) { var r = str(m.role).toLowerCase(); return /^captain/.test(r) ? 0 : /vice/.test(r) ? 1 : 2; };
  current.sort(function (a, b) { return (b.with ? 1 : 0) - (a.with ? 1 : 0) || rank(a) - rank(b) || (a.status === "dead") - (b.status === "dead") || a.name.localeCompare(b.name); });
  var shown = current.filter(function (m) { return filter === "with" ? m.with : filter === "away" ? !m.with && m.status !== "dead" : filter === "new" ? isNew(m) : true; });
  var counts = { with: current.filter(function (m) { return m.with; }).length, away: current.filter(function (m) { return !m.with && m.status !== "dead"; }).length, new: current.filter(isNew).length };
  function where(m) {
    if (m.status === "dead") return { cls: "dead", text: "Fallen" + (m.lastSeen ? " · last seen " + m.lastSeen : "") };
    if (m.with) return { cls: "with", text: "With you" };
    if (m.mission) return { cls: "mission", text: "On a mission: " + m.mission + (m.location ? " · " + m.location : "") };
    if (m.location) return { cls: "away", text: m.location + (m.locDay !== null && m.locDay !== undefined ? " · as of " + sqAgo(day - m.locDay) : "") };
    return { cls: "unknown", text: "Whereabouts unknown" };
  }
  function ask() { send(api, "[UI:SQUAD] Fill in my squad roster: file one squad_events join for each member of " + squad + " my character knows of (name, role, rank, magic; joined:\"before\" for people already in the squad when I arrived), with their current location if my character would know it. Narrate briefly, if at all."); if (p.toStory) p.toStory(); }
  return (
    <Frame className="bc-squadroster" pad="10px 12px 12px" style={{ marginBottom: 14 }}>
      <div className="bc-sq-head">
        <div><H m="0">Squadmates</H><small>{squad + " · " + current.filter(function (m) { return m.status !== "dead"; }).length + " on the roster"}</small></div>
      </div>
      {current.length ? (
        <div className="bc-chiprow bc-sq-filters">
          <Chip on={filter === "all"} onClick={function () { setFilter("all"); }}>All</Chip>
          <Chip on={filter === "with"} onClick={function () { setFilter("with"); }}>{"With you" + (counts.with ? " (" + counts.with + ")" : "")}</Chip>
          <Chip on={filter === "away"} onClick={function () { setFilter("away"); }}>{"Elsewhere" + (counts.away ? " (" + counts.away + ")" : "")}</Chip>
          <Chip on={filter === "new"} onClick={function () { setFilter("new"); }}>{"Joined recently" + (counts.new ? " (" + counts.new + ")" : "")}</Chip>
        </div>
      ) : null}
      {!current.length ? (
        <div>
          <Empty>{"No squadmates are on file yet. They appear here as you meet them in the story, or ask the GM to list the members your character knows."}</Empty>
          <Btn kind="gold" disabled={busy} onClick={ask}>Fill in my squad's roster</Btn>
        </div>
      ) : null}
      {current.length && !shown.length ? <Empty>No one here right now.</Empty> : null}
      {shown.map(function (m) {
        var w = where(m), on = open === m.key, hp = m.hp !== undefined && m.hp !== null ? m.hp : SQ_HP[m.condition];
        return (
          <div key={m.key} className={"bc-sq-card" + (m.with ? " with" : "") + (m.status === "dead" ? " dead" : "")}>
            <button type="button" className="bc-sq-main" aria-expanded={on ? "true" : "false"} onClick={function () { setOpen(on ? "" : m.key); }}>
              <span className="bc-sq-av">{m.name.split(/\s+/).slice(0, 2).map(function (x) { return x.charAt(0); }).join("").toUpperCase()}</span>
              <span className="bc-sq-text">
                <strong>{m.name}{isNew(m) ? <em className="bc-sq-new">New</em> : null}</strong>
                <small>{[m.role, m.rank, m.magic].filter(Boolean).join(" · ") || "Squad member"}</small>
                <span className={"bc-sq-where " + w.cls}><Icon n={w.cls === "with" ? "people" : w.cls === "mission" ? "scroll" : "pin"} s={12} />{w.text}</span>
              </span>
              <span className="bc-sq-side">
                {m.condition ? <span className={"bc-sq-cond c" + Math.min(4, Math.floor((100 - (hp === undefined ? 100 : hp)) / 25))}>{m.condition}</span> : null}
                {hp !== undefined && m.status !== "dead" ? <span className="bc-sq-hp" aria-label={"Health " + hp + "%"}><i style={{ width: hp + "%" }} /></span> : null}
              </span>
            </button>
            {on ? (
              <div className="bc-sq-more">
                {m.joined ? <div className="bc-note">{"Joined " + m.joined + " (" + sqAgo(day - (m.joinedDay || 0)) + ")"}</div> : null}
                {m.lastSeen && !m.with ? <div className="bc-note">{"Last with you " + m.lastSeen}</div> : null}
                {m.notes ? <div className="bc-note" style={{ color: C.ivory }}>{m.notes}</div> : null}
                {arr(m.history).length ? <div className="bc-sq-hist">{arr(m.history).slice(-4).reverse().map(function (h, i) { return <div key={i}><span>{str(h.date)}</span>{str(h.text)}</div>; })}</div> : null}
                {m.status !== "dead" ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {!m.with ? <Btn small disabled={busy} onClick={function () { send(api, "I go looking for " + m.name + (m.location ? ", last known to be at " + m.location : "") + "."); if (p.toStory) p.toStory(); }}>Go find them</Btn> : <Btn small disabled={busy} onClick={function () { send(api, "I turn to " + m.name + " and talk with them for a bit."); if (p.toStory) p.toStory(); }}>Talk</Btn>}
                  {!m.with ? <Btn small disabled={busy} onClick={function () { send(api, "I ask around the squad about where " + m.name + " is and how they're doing."); if (p.toStory) p.toStory(); }}>Ask after them</Btn> : null}
                </div> : null}
              </div>
            ) : null}
          </div>
        );
      })}
      {former.length && filter === "all" ? <div className="bc-note" style={{ marginTop: 8 }}>{"Former members: " + former.map(function (m) { return m.name; }).join(", ")}</div> : null}
      {current.length ? <div className="bc-note" style={{ marginTop: 8 }}>Positions update as the story moves people around; squadmates aren't always with you. Tap a name for details.</div> : null}
    </Frame>
  );
}
