var PLACE_ART = ["place_torren", "place_capital", "place_lake", "place_detail", "location"];
function placeArt(l) { var n = str(l.name); if (/capital|castle/i.test(n)) return "place_capital"; if (str(l.status) === "rumored") return "place_rumor"; return hashPick(n, PLACE_ART); }
function PlaceRow(p) {
  var l = p.l; var name = str(l.name);
  return (
    <button type="button" className={"bc-placerow" + (p.on ? " bc-placerow-on" : "")} aria-pressed={p.on ? "true" : "false"} onClick={p.onClick}>
      <span className="bc-placerow-art"><img src={img(placeArt(l))} alt="" /></span>
      <span className="bc-placerow-text"><strong>{name}</strong><small>{[str(l.region), str(l.kingdom) ? kingdomLabel(l.kingdom) : ""].filter(Boolean).join(", ") || "Unknown region"}</small></span>
      <Icon n="chevr" s={14} />
    </button>
  );
}
var TRAVEL_MODES = [["On foot", "Travel normally", "run"], ["Broom", "By broom", "wisp"], ["Carriage", "By carriage", "castle"], ["Horse", "On horseback", "compass"], ["Ship", "By ship", "wave"]];
function MapView(p) {
  var api = p.api; var v = api.variables || {}; var busy = !!api.isStreaming; var locs = arr(v.known_locations);
  var ts = React.useState({ dest: "", other: "", mode: "On foot", pace: "Normal", route: "Main roads" }); var tr = ts[0], setTr = ts[1];
  function st(k, x) { var n = Object.assign({}, tr); n[k] = x; setTr(n); }
  var dest = tr.dest && tr.dest !== "Somewhere else" ? tr.dest : tr.other.trim();
  var here = { x: num(v.player_x, 0), y: num(v.player_y, 0) };
  var destCoords = dest ? findCoords(dest, locs) : null;
  var km = destCoords ? Math.round(distanceKm(here, destCoords)) : null;
  var eta = km !== null ? travelEta(km, tr.mode, tr.pace) : null;
  var destLoc = null; locs.forEach(function (l) { if (str(l.name) === tr.dest) destLoc = l; });
  var loc = parseLoc(v.current_location); var home = parseLoc(v.home_location); var cp = obj(v.creation_profile);
  var known = locs.filter(function (l) { return str(l.status) !== "rumored"; });
  var visited = locs.filter(function (l) { return str(l.status) === "visited"; });
  var rumored = locs.filter(function (l) { return str(l.status) === "rumored"; });
  function group(title, sub, icon, ls) {
    if (!ls.length) return null;
    return (
      <Frame className="bc-mapgroup" pad="6px 8px 8px" key={title}>
        <SectionHead icon={icon} iconSize={26} title={title} right={<small className="bc-shead-note">{sub}</small>} />
        {ls.map(function (l, i) { var n = str(l.name); return <PlaceRow key={str(l.id) || n || i} l={l} on={tr.dest === n} onClick={function () { st("dest", n); }} />; })}
      </Frame>
    );
  }
  return (
    <div className="bc-mapview">
      <button type="button" className="bc-curloc" onClick={function () { if (loc.settlement) st("dest", ""); }} aria-label={"Current location: " + (str(v.current_location) || "unknown")}>
        <img src={img("location")} alt="" /><span className="bc-curloc-shade" />
        <span className="bc-locbar-pin"><Icon n="pin" s={22} /></span>
        <span className="bc-curloc-text"><small>Current Location</small><strong>{loc.settlement || str(v.current_location) || "Unknown"}</strong><span>{[kingdomLabel(loc.kingdom || cp.homeland), loc.region].filter(Boolean).join(" — ") || loc.place}</span></span>
        {v.weather ? <span className="bc-curloc-weather">{str(v.weather)}</span> : null}
      </button>
      <div className="bc-homeloc"><Icon n="home" s={24} /><span><small>Home Location</small><strong>{home.settlement || str(v.home_location) || "Not established"}</strong></span><em>{[kingdomLabel(home.kingdom), home.region].filter(Boolean).join(" — ")}</em></div>
      {locs.length ? null : <Empty>You know your own neighborhood and little else.</Empty>}
      {group("Places You Know", "Locations you can travel to.", "pin", known)}
      {group("Visited", "Places you have been to before.", "book", visited)}
      {group("Rumored", "Places you have heard about.", "scroll", rumored)}
      <Frame className="bc-travel" pad="8px 9px 10px">
        <SectionHead icon="compass" iconSize={34} title="Travel" right={<small className="bc-shead-note">Choose where to go and how to travel.</small>} />
        <div className="bc-travel-grid">
          <div className="bc-travel-left">
            <div className="bc-mini-label">Destination</div>
            <div className="bc-destchips">
              {locs.slice(0, 6).map(function (l) { var n = str(l.name); return <Chip key={n} icon="pin" on={tr.dest === n} onClick={function () { st("dest", n); }}>{n}</Chip>; })}
              <Chip icon="pin" on={tr.dest === "Somewhere else"} onClick={function () { st("dest", "Somewhere else"); }}>Somewhere else</Chip>
            </div>
            {tr.dest === "Somewhere else" || !locs.length ? <input className="bc-in" aria-label="Other destination" placeholder="Where to" value={tr.other} onChange={function (e) { st("other", e.target.value); }} /> : null}
            {dest ? (
              <div className="bc-destcard">
                <img src={img(destLoc ? placeArt(destLoc) : "place_detail")} alt="" />
                <div><strong>{dest}</strong><small>{destLoc ? [str(destLoc.region), kingdomLabel(destLoc.kingdom)].filter(Boolean).join(", ") : "Unmapped"}</small>
                  <span>{destLoc && destLoc.notes ? str(destLoc.notes) : (km !== null ? "~" + km + " km · about " + (eta < 24 ? eta + " h" : Math.round(eta / 24 * 10) / 10 + " days") + " " + tr.mode.toLowerCase() + "." : "Distance unknown — the GM resolves the route.")}</span>
                  {destLoc && destLoc.notes && km !== null ? <span>{"~" + km + " km · about " + (eta < 24 ? eta + " h" : Math.round(eta / 24 * 10) / 10 + " days")}</span> : null}
                </div>
              </div>
            ) : null}
          </div>
          <div className="bc-travel-right">
            <div className="bc-mini-label">Travel Method</div>
            {TRAVEL_MODES.map(function (m) { return <button key={m[0]} type="button" className={"bc-method" + (tr.mode === m[0] ? " bc-method-on" : "")} aria-pressed={tr.mode === m[0] ? "true" : "false"} onClick={function () { st("mode", m[0]); }}><Icon n={m[2]} s={20} />{m[1]}</button>; })}
            <div className="bc-mini-label">Pace</div>
            <div className="bc-pacerow">{["Relaxed", "Normal", "Hurried"].map(function (x) { return <Chip key={x} on={tr.pace === x} onClick={function () { st("pace", x); }}>{x}</Chip>; })}</div>
            <button type="button" className="bc-travelbtn" disabled={busy || !dest} onClick={function () {
              if (!dest) return;
              var hidden = "[UI:TRAVEL] destination=" + dest + "; mode=" + tr.mode + "; pace=" + tr.pace + "; route=" + tr.route +
                (km !== null ? "; estimated_distance_km=" + km : "") +
                ". Resolve this leg as usual — interruptions, encounters, arrival. Among your own directives (current_location, known_locations, food, money), set last_travel_report to exactly \"hours=<number>;interrupted=<true or false>\" for the ACTUAL travel time this reply covers. The interface applies stamina, mana, fatigue, time and position from that value — do not write those yourself for this leg.";
              var visible = "I set out for " + dest + ", travelling " + tr.mode.toLowerCase() + " at a " + tr.pace.toLowerCase() + " pace.";
              if (api.storage) api.storage.set("bc_pending_travel", JSON.stringify({ mode: tr.mode, pace: tr.pace, dest: dest }));
              tellGM(api, hidden, visible);
              p.toStory();
            }}><Icon n="clover" s={18} fill="#2a1d0c" />Travel<Icon n="chevr" s={14} fill="#2a1d0c" /></button>
          </div>
        </div>
      </Frame>
    </div>
  );
}

/* ---------- journal: chronicle, missions, notices ---------- */
function JournalView(p) {
  var api = p.api; var v = api.variables || {}; var busy = !!api.isStreaming;
  var ts = React.useState(p.tab || "chronicle"); var tab = ts[0], setTab = ts[1];
  React.useEffect(function () { if (p.tab) setTab(p.tab); }, [p.tab]);
  var gs = React.useState(""); var goalText = gs[0], setGoalText = gs[1];
  var goals = arr(v.goals); var ch = arr(v.chronicle_archive).concat(arr(v.chronicle)).slice().reverse();
  function writeGoals(ng) { if (canWrite(api)) api.setVariable("goals", ng); }
  var notices = noticeCount(v); var ms = activeMissions(v);
  var body = null;
  if (tab === "missions") body = <MissionsView api={api} />;
  else if (tab === "notices") body = <NoticesView api={api} />;
  else body = (
    <div>
      <SectionHead icon="star" iconSize={24} title="Your goals" />
      <Frame pad="6px 14px 12px" style={{ marginBottom: 14 }}>
        {goals.length ? goals.map(function (g, i) {
          var active = !g.status || g.status === "active";
          return (
            <div key={i} style={{ padding: "9px 0", borderBottom: "1px solid " + C.lineSoft }}>
              <div style={{ fontSize: 16, color: active ? C.ivory : C.muted }}>{str(g.goal)}{active ? "" : " (" + str(g.status) + ")"}</div>
              {active ? <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <Btn small disabled={busy} onClick={function () { var ng = goals.slice(); ng[i] = Object.assign({}, g, { status: "done" }); writeGoals(ng); }}>Mark done</Btn>
                <Btn small disabled={busy} onClick={function () { var ng = goals.slice(); ng[i] = Object.assign({}, g, { status: "abandoned" }); writeGoals(ng); }}>Let it go</Btn>
              </div> : null}
            </div>
          );
        }) : <Empty>No goals yet. You don't need one; you can simply live.</Empty>}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input className="bc-in" aria-label="New goal" placeholder="For example: buy my own house" value={goalText} onChange={function (e) { setGoalText(e.target.value); }} />
          <Btn kind="gold" disabled={busy || !goalText.trim()} onClick={function () { writeGoals(goals.concat([{ goal: goalText.trim(), status: "active", set_on: str(v.world_date) }])); setGoalText(""); }}>Add</Btn>
        </div>
      </Frame>
      <SectionHead icon="doc" iconSize={24} title="Chronicle" sub="Your own history, page by page." />
      {ch.length ? ch.map(function (c, i) {
        return <Frame key={i} pad="10px 13px" style={{ marginBottom: 8 }}><div style={{ fontSize: 13.5, color: C.gold, fontWeight: 700 }}>{str(c.date)}</div><div style={{ fontFamily: DISPLAY, fontSize: 16.5, color: C.ivory }}>{str(c.title)}</div>{c.summary ? <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.45 }}>{str(c.summary)}</div> : null}</Frame>;
      }) : <Empty>Your history begins with your first day.</Empty>}
    </div>
  );
  return (
    <div>
      <div className="bc-chiprow" style={{ marginBottom: 12 }}>
        <Chip icon="doc" on={tab === "chronicle"} onClick={function () { setTab("chronicle"); }}>Chronicle</Chip>
        <Chip icon="scroll" on={tab === "missions"} onClick={function () { setTab("missions"); }}>{"Missions" + (ms ? " (" + ms + ")" : "")}</Chip>
        <Chip icon="bell" on={tab === "notices"} onClick={function () { setTab("notices"); }}>{"Notices" + (notices ? " (" + notices + ")" : "")}</Chip>
      </div>
      {body}
    </div>
  );
}

/* ---------- crown: squad, rank and standing ---------- */
function CrownView(p) {
  var v = p.api.variables || {}; var rep = obj(v.reputation); var keys = Object.keys(rep);
  return (
    <div>
      <SquadView api={p.api} />
      <SectionHead icon="crown" iconSize={24} title="Standing" sub="How communities and institutions see you." />
      {keys.length ? <Frame pad="4px 14px 8px">{keys.map(function (k) { var r = rep[k]; return <Row key={k} k={k} v={typeof r === "object" && r ? [str(r.band), str(r.note)].filter(Boolean).join(" — ") : str(r)} />; })}</Frame> : <Empty>No one outside your home has formed an opinion of you yet.</Empty>}
    </div>
  );
}

var MENU_ITEMS = [["character", "Character", "Profile, skills and condition", "bust"], ["train", "Training", "Set up a block of practice", "dumbbell"], ["time", "Let Time Pass", "Skip ahead, or live your routine", "hourglass"],
  ["routine", "Routine", "Your usual day", "sun"], ["codex", "Codex", "What your character knows", "book"], ["household", "Home and Family", "Where you live and who with", "home"],
  ["art", "Artwork", "Put your own paintings into the interface", "star"], ["settings", "Settings", "How the world runs and reads", "gear"], ["help", "Help", "Commands and how this works", "info"]];
function MenuView(p) {
  return (
    <Frame pad="4px 10px">
      {MENU_ITEMS.map(function (m) {
        return <ActionRow key={m[0]} icon={m[3]} title={m[1]} sub={m[2]} onClick={function () { p.go(m[0]); }} />;
      })}
    </Frame>
  );
}

/* ---------- page shell ---------- */
var PAGE_HERO = {
  grimoire: { title: "Grimoire", sub: "Spells. Attributes. Progress.", quote: "“Every spell begins with a single page.”", quoteBy: "Asta", img: "grim_head", big: true, right: false },
  map: { title: "World Map", sub: "Travel · Discover · Plan", tagline: "Explore the Clover Kingdom and beyond. New places, people, and stories await.", big: true, right: "compass" },
  pack: { tagline: "Your purse, your pack, your savings." },
  people: { title: "Bonds", sub: "Friends. Rivals. Romance.", big: true },
  journal: { title: "Chronicle", sub: "Goals · Missions · History", big: true },
  bound: { title: "Bound", sub: "Spirits and Devils", big: true },
  crown: { title: "Crown", sub: "Rank · Merit · Service", big: true },
  menu: { title: "More", sub: "Life · Codex · Settings", big: true }
};
var TITLES = { grimoire: "Grimoire", character: "Character", squad: "Crown", crown: "Crown", pack: "Pack", bank: "Pack", market: "Pack", missions: "Chronicle", map: "World Map", people: "Bonds", notices: "Chronicle",
  journal: "Chronicle", bound: "Bound", menu: "More", train: "Training", time: "Let Time Pass", routine: "Routine", codex: "Codex", household: "Home and Family", art: "Artwork", settings: "Settings", help: "Help" };
function Page(p) {
  var hero = PAGE_HERO[p.heroKey] || { title: p.title, sub: dayMonthWD(p.date) ? dayMonthWD(p.date) + " · " + clock12(p.time) : "", big: true };
  return (
    <div className="bc-fill bc-page">
      <Hero bannerUrl={p.bannerUrl} title={hero.title} sub={hero.sub} tagline={hero.tagline} quote={hero.quote} quoteBy={hero.quoteBy} img={hero.img} big={hero.big}
        right={hero.right === undefined ? "kingdom" : hero.right} kingdom={p.kingdom} onBack={p.onBack} />
      <div className="bc-scroll bc-page-scroll"><div className="bc-wrap bc-fade bc-page-inner" key={p.title}>{p.children}</div></div>
    </div>
  );
}

/* ---------- background bookkeeping (no AI, no chat) ----------
   Keeps what the AI reads each turn small: archives old chronicle pages and
   resolved events, files authorized knight bonuses into payroll, trims spent
   spell events, and maintains a one-line bank summary instead of exposing
   the full ledgers to the AI. */
function useHousekeeping(api) {
  var v = (api && api.variables) || {};
  var sig = JSON.stringify([v.chronicle, v.known_events, v.mk_bonus_requests, v.bank_account, v.mk_status, v.mk_payroll && v.mk_payroll.totalPaid, v.mk_payroll && v.mk_payroll.cyclesPaid, v.bank_summary, v.spell_events, v.spell_ledger && v.spell_ledger.seq, v.world_date, v.character_created]);
  var attempted = React.useRef("");
  React.useEffect(function () {
    if (!isTrue(v.character_created) || !canWrite(api) || attempted.current === sig) return;
    var patch = {};
    var chron = arr(v.chronicle);
    if (chron.length > 24) { var cut = chron.length - 20; patch.chronicle = chron.slice(cut); patch.chronicle_archive = arr(v.chronicle_archive).concat(chron.slice(0, cut)).slice(-400); }
    var evs = arr(v.known_events); var resolved = evs.filter(function (e) { return e && /^(done|missed|taken|resolved|expired)$/i.test(str(e.status)); });
    if (resolved.length > 5) {
      var old = resolved.slice(0, resolved.length - 5);
      patch.known_events = evs.filter(function (e) { return old.indexOf(e) < 0; });
      patch.events_archive = arr(v.events_archive).concat(old).slice(-300);
    }
    var reqs = arr(v.mk_bonus_requests);
    // Wait while a payroll transition is pending so the two writers never race on mk_payroll.
    if (reqs.length && !bcMKPayrollStep(v)) {
      var pay = obj(v.mk_payroll); var awards = arr(pay.bonusAwards).slice();
      reqs.forEach(function (r) {
        r = obj(r); var id = str(r.id).trim(); var amt = Math.floor(num(r.amount, 0));
        if (!id || amt <= 0 || awards.some(function (a) { return a && a.id === id; })) return;
        awards.push({ id: id, amount: amt, reason: str(r.reason) || "Approved service merit", source: str(r.source) || "Squad command", status: "approved", filed: str(v.world_date) });
      });
      patch.mk_payroll = Object.assign({}, pay, { bonusAwards: awards.slice(-80) });
      patch.mk_bonus_requests = [];
    }
    var done = arr(obj(v.spell_ledger).processed); var events = arr(v.spell_events);
    if (events.length) {
      var pending = events.filter(function (e) { return !(e && done.indexOf(str(e.id)) >= 0); });
      if (pending.length !== events.length) patch.spell_events = pending;
    }
    var bank = bcBankState(v.bank_account); var mk = obj(v.mk_status); var comp = bcMKMonthly(mk.rank, mk.personal_stars); var payday = bcMKNextPayday(v);
    var summary = (bank.open ? "Account open, balance " + bcMoney(bank.balance) : "No bank account") +
      (comp.total > 0 ? "; knight pay " + bcMoney(comp.total) + "/month" + (payday ? ", next payday " + payday : "") : "") + ".";
    if (summary !== str(v.bank_summary)) patch.bank_summary = summary;
    if (!Object.keys(patch).length) { attempted.current = sig; return; }
    attempted.current = sig;
    bcPatch(api, patch, function (ok) { if (!ok) attempted.current = ""; });
  }, [sig, !!(api && api.isStreaming)]);
}
