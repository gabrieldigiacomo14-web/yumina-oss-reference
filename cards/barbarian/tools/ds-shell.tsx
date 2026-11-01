
// ==== ds-shell.tsx — THE LEDGER LAYOUT (v22) =====================
// The frame around the story: a slim top bar, a Story screen with the body's
// state and quick actions, a hub of tiles, a bottom nav around the Story
// emblem, and three layouts (phone portrait, phone landscape, desktop).
// Same materials as before: charcoal iron, parchment, leather, brass, blood.
var DS_UI_VERSION = "22.0";

/* layout: picked from the screen, or chosen in the Ledger; a choice is only used where it fits */
function dsMeasure() {
  var ws = [window.innerWidth, document.documentElement && document.documentElement.clientWidth, window.visualViewport && window.visualViewport.width].map(Number).filter(function (n) { return n > 0; });
  var hs = [window.innerHeight, window.visualViewport && window.visualViewport.height].map(Number).filter(function (n) { return n > 0; });
  return { w: Math.round(ws.length ? Math.min.apply(null, ws) : 390), h: Math.round(hs.length ? Math.min.apply(null, hs) : 844) };
}
var DS_MIN_W = { portrait: 0, landscape: 560, desktop: 900 };
var DS_LAYOUT_NAMES = { portrait: "Phone (portrait)", landscape: "Phone (landscape)", desktop: "Desktop" };
function useDsLayout(api) {
  var ps = React.useState("auto"), pref = ps[0], setPref = ps[1];
  var ds = React.useState(dsMeasure), dims = ds[0], setDims = ds[1];
  React.useEffect(function () {
    var alive = true;
    try { var r = api.storage && api.storage.get ? api.storage.get("ds-layout-v1") : null; Promise.resolve(r).then(function (x) { if (alive && x && /^(auto|portrait|landscape|desktop)$/.test(x)) setPref(x); }).catch(function () {}); } catch (e) {}
    function on() { setDims(dsMeasure()); }
    var vv = window.visualViewport; if (vv) vv.addEventListener("resize", on);
    window.addEventListener("resize", on); window.addEventListener("orientationchange", on);
    var t = setTimeout(on, 400);
    return function () { alive = false; clearTimeout(t); if (vv) vv.removeEventListener("resize", on); window.removeEventListener("resize", on); window.removeEventListener("orientationchange", on); };
  }, []);
  var auto = dims.w >= 1024 && dims.h >= 560 ? "desktop" : (dims.w > dims.h && dims.h <= 600) ? "landscape" : "portrait";
  function fits(m) { return dims.w >= (DS_MIN_W[m] || 0); }
  var mode = pref === "auto" || !fits(pref) ? auto : pref;
  function choose(m) { setPref(m); try { api.storage && api.storage.set && api.storage.set("ds-layout-v1", m); } catch (e) {} }
  return { mode: mode, pref: pref, auto: auto, fits: fits, width: dims.w, choose: choose };
}

/* screens and where they live */
var DS_SCREENS = {
  HUB: ["Ledger", "codex", "Who you are, and every record"],
  KIT: ["Kit", "kit", "What you carry, and where"],
  SHEET: ["Character", "sheet", "The body you woke in"],
  SKILLS: ["Skills", "skills", "What this body has learned"],
  PARTY: ["Party", "party", "Who walks beside you"],
  MAP: ["Map", "map", "Only what you have walked"],
  WORLD: ["World", "world", "What a person like you could know"],
  JOURNAL: ["Journal", "journal", "Open matters and rumours"],
  GUILD: ["Guild", "guild", "Registry, exchange, requests"],
  VAULT: ["Bank", "vault", "Alminus deposits"],
  HOME: ["Home", "home", "Roofs and rents"],
  FENCE: ["Goods", "fence", "No questions asked"],
  GRIND: ["Commit", "commit", "Time below, at risk"],
};
var DS_NAV_SHORT = { SHEET: "Sheet", JOURNAL: "Journal" };
var DS_NAV_L = ["HUB", "KIT", "SHEET", "SKILLS"];
var DS_NAV_R = ["PARTY", "MAP", "GUILD", "JOURNAL"];
var DS_MORE = ["WORLD", "VAULT", "HOME", "FENCE", "GRIND"];

function dsBodyWord(c) { return c >= 80 ? "Whole" : c >= 50 ? "Hurt" : c >= 20 ? "Badly hurt" : c > 0 ? "Dying" : "Gone"; }
function dsStamWord(s) { return s >= 70 ? "Fresh" : s >= 40 ? "Winded" : s >= 15 ? "Flagging" : s > 0 ? "Spent" : "Empty"; }
function dsPoolWord(p) { return p >= 85 ? "Full" : p >= 50 ? "Steady" : p >= 20 ? "Low" : p > 0 ? "Thin" : "Dry"; }
function dsReserveWord(p) { return p >= 70 ? "Fine" : p >= 40 ? "Wanting" : p >= 20 ? "Low" : "Critical"; }
function dsPouchCount(v) { var b = obj_panel(v["raw-stones"]); return Object.keys(b).reduce(function (a, k) { return a + (Number(b[k] && b[k].qty) || 0); }, 0); }
function dsWhere(v) { var f = num_panel(v["current-floor"], 0); return f === 0 ? String(v["location"] || "Rafdonia") : "Floor " + f + (v["location"] && String(v["location"]).indexOf("Floor") !== 0 ? " · " + v["location"] : ""); }
function dsWhen(v) { return "m" + num_panel(v["cycle-month"], 1) + " d" + num_panel(v["cycle-day"], 1) + " · " + clockLabel(num_panel(v["clock"], 420)); }

/* ---------- top bar ---------- */
function DsTop(props) {
  var v = props.v, lay = props.lay;
  var pouchS = React.useState(false), pouchOpen = pouchS[0], setPouchOpen = pouchS[1];
  var race = v["race"] || "", hurt = arr_panel(v["injuries"]).length > 0;
  var rank = num_panel(v["explorer-rank"], 0), status = v["citizen-status"] || "citizen";
  var pn = dsPouchCount(v);
  var meta = props.screen === "HUB" || props.screen === "KIT" ? DS_SCREENS[props.screen] : null;   // the other screens carry their own header
  return <header className="dsTop">
    <button type="button" className="dsMedal" aria-label="Open the Ledger" onClick={function () { props.go("HUB"); }}>
      <Medallion size={34} src={ART.portrait || (ART.races && ART.races[race]) || ""} icon={race ? "race-" + race : "sheet"} glow={hurt} ring={hurt ? C.bloodLit : C.brass} />
    </button>
    <div className="dsTopWords">
      <b>{meta && lay.mode !== "desktop" ? meta[0] : (v["char-name"] || "unnamed")}{status !== "citizen" ? <span className="dsStatusTag">{String(status).toUpperCase()}</span> : null}</b>
      <small>{meta && lay.mode !== "desktop" ? meta[2] : [race || "—", rank === 0 ? "Unregistered" : "Rank " + rank, "Soul " + num_panel(v["level"], 0)].join(" · ")}</small>
    </div>
    <div className="dsPurseChips">
      <span className="dsCoin" title="Stones — spendable currency"><Icon name="coin" size={13} fill={C.brass + "55"} />{num_panel(v["mana-stones"], 0).toLocaleString()}</span>
      <button type="button" className={"dsCoin pouch" + (pn ? " full" : "")} title="Mana stones in your pouch — loot, not money" onClick={function () { setPouchOpen(true); }}><Icon name="gem" size={13} />{pn.toLocaleString()}</button>
    </div>
    {pouchOpen ? <PouchDetail v={v} onClose={function () { setPouchOpen(false); }} /> : null}
  </header>;
}

/* ---------- bottom nav / rail / sidebar ---------- */
function DsNav(props) {
  var screen = props.screen, go = props.go, desk = props.lay.mode === "desktop";
  function btn(id) {
    var m = DS_SCREENS[id], on = screen === id;
    return <button key={id} type="button" className={"dsNavBtn" + (on ? " on" : "")} aria-current={on ? "page" : undefined} aria-label={m[0]} onClick={function () { go(on ? null : id); }}><Icon name={m[1]} size={18} /><span>{DS_NAV_SHORT[id] || m[0]}</span></button>;
  }
  return <nav className="dsNav" aria-label="Screens">
    {DS_NAV_L.map(btn)}
    <button type="button" className={"dsEmblem" + (screen === null ? " on" : "")} aria-label="The story" aria-current={screen === null ? "page" : undefined} onClick={function () { go(null); }}>
      <span className="dsEmblemDisc"><Icon name="race-Barbarian" size={22} stroke={1.5} /></span><span>Story</span></button>
    {DS_NAV_R.map(btn)}
    {desk ? <div className="dsNavMore"><small>Records</small>{DS_MORE.map(btn)}</div> : null}
  </nav>;
}

/* ---------- desktop: the body at a glance ---------- */
function DsSide(props) {
  var v = props.v, go = props.go;
  var floor = num_panel(v["current-floor"], 0);
  var party = arr_panel(v["party"]);
  var hurt = arr_panel(v["injuries"]);
  var items = normalizeList(v["inventory"]), load = physicalCarryProfile(v, items);
  return <aside className="dsSide" aria-label="Status">
    <div className="dsSideCard"><small>Where</small><b>{dsWhere(v)}</b><span>{dsWhen(v) + (v["labyrinth-open"] ? "" : " · Labyrinth shut")}</span></div>
    <div className="dsSideCard"><DsBars v={v} /></div>
    <div className="dsSideCard grid"><div><small>Stones</small><b className="brass">{num_panel(v["mana-stones"], 0).toLocaleString()}</b></div><div><small>Mana stones</small><b>{dsPouchCount(v).toLocaleString()}</b></div><div><small>Tax owed</small><b className="blood">{num_panel(v["tax-owed"], 0).toLocaleString()}</b></div><div><small>Load</small><b>{kitCap(load.band)}</b></div></div>
    {hurt.length ? <div className="dsSideCard"><small>Injuries</small>{hurt.slice(0, 5).map(function (x, i) { return <span key={i} className="dsHurt">{x && x.what ? x.what : String(x)}</span>; })}</div> : null}
    {party.length ? <div className="dsSideCard"><small>Party</small>{party.map(function (m, i) { return <span key={i}>{m.name || String(m)}{m.class ? " · " + m.class : ""}</span>; })}</div> : null}
    <button type="button" className="dsBtn" onClick={function () { go("KIT"); }}><Icon name="kit" size={14} />Open the kit</button>
  </aside>;
}

/* the body's state, in bands and words (spirit is never a number) */
function DsBars(props) {
  var v = props.v, compact = props.compact;
  var cond = num_panel(v["condition"], 100), stam = num_panel(v["stamina"], 100);
  var spirit = num_panel(v["spirit"], 0), now = num_panel(v["spirit-current"], spirit), mp = spirit > 0 ? Math.min(100, Math.round(now / spirit * 100)) : 0;
  var floor = num_panel(v["current-floor"], 0);
  var hyd = num_panel(v["hydration"], num_panel(v["thirst"], 100)), hun = num_panel(v["hunger"], 100);
  var rows = [["body", "Body", cond, dsBodyWord(cond), cond < 25 ? C.bloodLit : "#c0392f"], ["spirit", "Spirit", mp, dsPoolWord(mp), C.brass], ["weight", "Stamina", stam, dsStamWord(stam), "#8a8474"]];
  if (floor > 0 || hyd < 50 || hun < 50) { rows.push(["drop", "Water", hyd, dsReserveWord(hyd), hyd < 25 ? C.bloodLit : "#4f86ad"]); rows.push(["hunger", "Food", hun, dsReserveWord(hun), hun < 25 ? C.bloodLit : "#b8893b"]); }
  return <div className={"dsBars" + (compact ? " compact" : "")}>{rows.map(function (r) {
    return <div key={r[1]} className="dsBar"><span className="dsBarIcon" style={{ color: r[4] }}><Icon name={r[0]} size={13} /></span><div><div className="dsBarTop"><span>{r[1]}</span><em>{r[3]}</em></div><i className="dsBarTrack"><i style={{ width: Math.max(0, Math.min(100, r[2])) + "%", background: r[4] }} /></i></div></div>;
  })}</div>;
}

/* ---------- the story ---------- */
// A reply is drawn as prose; a line that is wholly a bracketed system line
// ("[ Goblin — Rank 9 mana stone added to the pouch ]") becomes an event slip.
function DsBubble(p) {
  var md = typeof p.renderMarkdown === "function" ? p.renderMarkdown : function (x) { return x; };
  if (p.role === "system") return null;
  if (p.role === "user") return <div className="dsYou"><div dangerouslySetInnerHTML={{ __html: md(String(p.content || "")) }} /></div>;
  var parts = String(p.content || "").replace(/\r/g, "").split(/\n\s*\n+/);
  return <div className="dsScene">{parts.map(function (raw, i) {
    var t = raw.trim(); if (!t) return null;
    if (/^\[[^\[\]]{2,260}\]$/.test(t) && !/^\[[\w-]+:/.test(t)) return <div key={i} className="dsSlip"><Icon name="codex" size={13} /><span>{t.slice(1, -1).trim()}</span></div>;
    return <div key={i} className="dsProse story" dangerouslySetInnerHTML={{ __html: md(t) }} />;
  })}{p.isStreaming ? <span className="dsQuill" aria-label="Writing" /> : null}</div>;
}
var DS_ACTS_BELOW = [["Look around", "vision", "I stop and take a careful look around."], ["Listen", "smell", "I hold still and listen."], ["Search for the way down", "map", "I spend the next hours searching this floor for the way down."], ["Drink", "drop", "DRINK"], ["Make camp and rest", "clock", "I find a defensible corner and rest for a few hours."]];
var DS_ACTS_ABOVE = [["Look around", "vision", "I take a slow look around."], ["The Guild", "guild", "I head to the Explorers' Guild."], ["Find a meal", "hunger", "I look for somewhere cheap to eat."], ["Listen for talk", "smell", "I find a corner and listen to what people are saying."], ["Somewhere to sleep", "home", "I look for somewhere to sleep tonight."]];
var DS_IDEAS_BELOW = ["I check how much water I have left and ration it.", "I mark the wall here so I can find my way back.", "I look for tracks or droppings that tell me what lives here.", "I count my mana stones and think about the walk out."];
var DS_IDEAS_ABOVE = ["I ask around about work that doesn't involve the Labyrinth.", "I go over my tax owed against what I could earn this cycle.", "I look for a smith who can mend my gear.", "I take the long way home and watch who else is on the street.", "I find somewhere to sit and listen for the words 'Dungeon & Stone'."];
function DsStory(props) {
  var api = props.api, v = props.v, go = props.go;
  var sheetS = React.useState(false), sheetOpen = sheetS[0], setSheetOpen = sheetS[1];
  var busy = !!api.isStreaming;
  var floor = num_panel(v["current-floor"], 0);
  var acts = floor > 0 ? DS_ACTS_BELOW : DS_ACTS_ABOVE;
  var hurt = arr_panel(v["injuries"]);
  var items = normalizeList(v["inventory"]);
  var quick = items.filter(function (x) { var t = itemAccessTier(x, items); return (t === "quick" || t === "immediate") && !storageProfileFor(x); });
  var fighting = obj_panel(v["encounter-state"]).active === true;
  function send(t) { if (busy) return; setSheetOpen(false); api.sendMessage(t); }
  function draft(pool) { var idea = pool[Math.floor(Math.random() * pool.length)]; if (typeof api.setComposerDraft === "function") api.setComposerDraft(idea); else try { api.showToast(idea); } catch (e) {} }
  function act(a) {
    if (a[2] === "DRINK") {
      var w = items.filter(function (x) { return x.container && x.container.resource === "water"; })[0];
      if (!w) { send("I check whether I have anything to drink."); return; }
      go("KIT"); return;
    }
    send(a[2]);
  }
  return <div className="dsStory">
    <div className="dsStrip">
      <DsBars v={v} compact />
      <div className="dsPlace"><Icon name={floor > 0 ? "torch" : "map"} size={13} /><b>{dsWhere(v)}</b><span>{dsWhen(v) + (floor === 0 && !v["labyrinth-open"] ? " · Labyrinth shut" : "")}</span></div>
      {hurt.length ? <div className="dsHurtRow">{hurt.slice(0, 3).map(function (x, i) { return <span key={i} className="dsHurt">{x && x.what ? x.what : String(x)}</span>; })}{hurt.length > 3 ? <span className="dsHurt">{"+" + (hurt.length - 3)}</span> : null}</div> : null}
    </div>
    <div className="dsStoryCard">
      <div className="dsMsgs ds-scroll"><MessageList rendererComponent={DsBubble} /></div>
    </div>
    <div className="dsQuick" role="toolbar" aria-label="Quick actions">
      <button type="button" className={"dsQ round" + (sheetOpen ? " on" : "")} aria-label="More actions" onClick={function () { setSheetOpen(!sheetOpen); }}><Icon name="edit" size={14} /></button>
      <button type="button" className="dsQ" disabled={busy} onClick={function () { draft(floor > 0 ? DS_IDEAS_BELOW : DS_IDEAS_ABOVE); }} title="Puts an idea in the message box; nothing is sent until you press send"><Icon name="skills" size={13} />Suggest</button>
      <span className="dsQSep" />
      {fighting && quick.length ? quick.slice(0, 4).map(function (x) { return <button key={x.id} type="button" className="dsQ item" onClick={function () { go("KIT"); }}><Icon name={glyphFor(x)} size={13} />{kitCap(x.name)}</button>; })
        : acts.slice(0, 4).map(function (a) { return <button key={a[0]} type="button" className="dsQ act" disabled={busy && a[2] !== "DRINK"} onClick={function () { act(a); }}><Icon name={a[1]} size={13} />{a[0]}</button>; })}
    </div>
    {sheetOpen ? <div className="dsVeil" onClick={function () { setSheetOpen(false); }}><div className="dsSheet" role="dialog" aria-label="Actions" onClick={function (e) { e.stopPropagation(); }}>
      <div className="dsSheetHead"><div className="dsSheetTitle"><b>Actions</b><small>Each one is sent as what you do</small></div><button type="button" className="dsX" aria-label="Close" onClick={function () { setSheetOpen(false); }}><Icon name="close" size={14} stroke={2} /></button></div>
      <div className="dsSheetBody">
        <div className="dsActGrid">{acts.map(function (a) { return <button key={a[0]} type="button" className="dsAct" disabled={busy && a[2] !== "DRINK"} onClick={function () { act(a); }}><Icon name={a[1]} size={20} /><span>{a[0]}</span></button>; })}
          <button type="button" className="dsAct soft" onClick={function () { setSheetOpen(false); go("KIT"); }}><Icon name="kit" size={20} /><span>Kit</span></button>
          <button type="button" className="dsAct soft" onClick={function () { setSheetOpen(false); go("MAP"); }}><Icon name="map" size={20} /><span>Map</span></button>
          {floor > 0 ? <button type="button" className="dsAct soft" onClick={function () { setSheetOpen(false); go("GRIND"); }}><Icon name="commit" size={20} /><span>Commit time</span></button> : null}
        </div>
        {quick.length ? <div className="dsQuickDraw"><small>Within quick reach</small><div>{quick.map(function (x) { return <button key={x.id} type="button" className="dsChipItem" onClick={function () { setSheetOpen(false); go("KIT"); }}><Icon name={glyphFor(x)} size={13} />{kitCap(x.name)}</button>; })}</div></div> : null}
        <p className="dsProse dim small">Commands still work in the message box: [sync], [sync all], [add: …], and OOC: questions.</p>
      </div></div></div> : null}
  </div>;
}

/* ---------- the Ledger: who you are and every record ---------- */
function DsHub(props) {
  var api = props.api, v = props.v, go = props.go, lay = props.lay;
  var items = normalizeList(v["inventory"]), load = physicalCarryProfile(v, items);
  var lvl = num_panel(v["level"], 0), ach = num_panel(v["achievements"], 0), next = THRESH[lvl] || null;
  var ess = arr_panel(v["essences"]), cap = num_panel(v["essence-capacity"], 1);
  var used = ess.reduce(function (a, e) { return a + num_panel(e && e.weight, 1); }, 0);
  var quests = arr_panel(v["quest-log"]).filter(function (q) { return q && (!q.status || q.status === "active"); });
  var rumors = quests.filter(function (q) { return q.kind === "rumor"; }).length;
  var party = arr_panel(v["party"]);
  var skills = arr_panel(v["skills"]);
  var rank = num_panel(v["explorer-rank"], 0);
  var reg = num_panel(v["registered-vault-balance"], 0), unreg = num_panel(v["unregistered-vault-balance"], 0);
  var props_ = arr_panel(v["properties"]), home = String(v["home-current"] || "").replace(/^"+|"+$/g, "").trim();
  var hot = arr_panel(v["hot-goods"]).filter(function (h) { return h && !h.laundered; }).length;
  var grind = obj_panel(v["grind-session"]);
  var repairN = items.filter(kitNeedsRepair).length;
  var race = v["race"] || "";
  var homeName = home ? ((props_.filter(function (p) { return p.id === home; })[0] || {}).name || "Your place") : "No fixed address";
  function tile(id, line, badge) {
    var m = DS_SCREENS[id];
    return <button key={id} type="button" className="dsTile" onClick={function () { go(id); }}>
      <span className="dsTileSigil"><Icon name={m[1]} size={19} /></span><span className="dsTileWords"><b>{m[0]}</b><small>{line}</small></span>
      {badge ? <span className="dsBadge">{badge}</span> : null}</button>;
  }
  return <div className="dsPage ds-scroll">
    <section className="dsPanel hero">
      <div className="dsHero">
        <Medallion size={70} square src={ART.portrait || (ART.races && ART.races[race]) || ""} icon={race ? "race-" + race : "sheet"} ring={C.brass} />
        <div className="dsHeroWords"><b>{v["char-name"] || "unnamed"}</b>
          <small>{[race || "—", v["path"] && v["path"] !== "unset" ? v["path"] : "", rank === 0 ? "Unregistered" : "Rank " + rank].filter(Boolean).join(" · ")}</small>
          <div className="dsHeroTags"><span>{"Soul " + lvl}</span><span>{"Essence " + used + "/" + cap}</span><span>{"Achievement " + ach + (next ? "/" + next : "")}</span></div>
        </div>
      </div>
      <DsBars v={v} />
      <div className="dsPurse">
        <div><small>Stones</small><b className="brass">{num_panel(v["mana-stones"], 0).toLocaleString()}</b><em>spendable</em></div>
        <div><small>Mana stones</small><b>{dsPouchCount(v).toLocaleString()}</b><em>to exchange</em></div>
        <div><small>Tax owed</small><b className="blood">{num_panel(v["tax-owed"], 0).toLocaleString()}</b><em>{"day " + num_panel(v["cycle-day"], 1) + " of the month"}</em></div>
      </div>
    </section>
    <button type="button" className="dsResume" onClick={function () { go(null); }}><Icon name="race-Barbarian" size={22} stroke={1.4} /><span><b>Back to the story</b><small>{dsWhere(v) + " · " + dsWhen(v)}</small></span><Icon name="next" size={16} /></button>
    <div className="dsTiles">
      {tile("KIT", load.carried + " carried · " + kitCap(load.band) + (repairN ? " · " + repairN + " to repair" : ""), repairN || "")}
      {tile("SHEET", "Soul, body, race and codex")}
      {tile("SKILLS", skills.length ? skills.map(function (s) { return s.name + " · " + s.stage; }).slice(0, 2).join(", ") : "Nothing trained yet")}
      {tile("PARTY", party.length ? party.map(function (m) { return m.name; }).join(", ") : "Alone", party.length || "")}
      {tile("MAP", dsWhere(v))}
      {tile("JOURNAL", quests.length ? quests.length + " open · " + rumors + " rumour" + (rumors === 1 ? "" : "s") : "Nothing open", quests.length || "")}
      {tile("GUILD", rank === 0 ? "Not registered" : "Rank " + rank + (v["party-registered"] ? " · team registered" : ""))}
      {tile("VAULT", reg || unreg ? (reg + unreg).toLocaleString() + " stones held" : "No account")}
      {tile("HOME", homeName)}
      {tile("FENCE", hot ? hot + " piece" + (hot === 1 ? "" : "s") + " someone could recognise" : "Selling where nobody asks", hot || "")}
      {tile("GRIND", grind.active ? "A run is under way" : num_panel(v["current-floor"], 0) > 0 ? "Commit days on this floor" : "Only below the surface")}
      {tile("WORLD", "News, prices and power, as far as you know")}
    </div>
    <section className="dsPanel">
      <div className="dsPanelHead"><span className="dsSigil"><Icon name="world" size={14} /></span><b>Display</b><small>{"Interface v" + DS_UI_VERSION + " · " + DS_LAYOUT_NAMES[lay.mode]}</small></div>
      {lay.pref !== "auto" && !lay.fits(lay.pref) ? <p className="dsWarn">{DS_LAYOUT_NAMES[lay.pref] + " needs a screen at least " + DS_MIN_W[lay.pref] + " px wide; this one is " + lay.width + " px, so " + DS_LAYOUT_NAMES[lay.mode] + " is used here."}</p> : null}
      <div className="dsLayoutPick">{[["auto", "Automatic"], ["portrait", "Phone (portrait)"], ["landscape", "Phone (landscape)"], ["desktop", "Desktop"]].map(function (o) {
        var cant = o[0] !== "auto" && !lay.fits(o[0]);
        return <button key={o[0]} type="button" className={"dsChip" + (lay.pref === o[0] ? " on" : "") + (cant ? " cant" : "")} onClick={function () { lay.choose(o[0]); }}>{o[1]}{o[0] === "auto" ? " (" + DS_LAYOUT_NAMES[lay.auto] + ")" : cant ? " — needs " + DS_MIN_W[o[0]] + " px" : ""}</button>;
      })}</div>
    </section>
  </div>;
}
