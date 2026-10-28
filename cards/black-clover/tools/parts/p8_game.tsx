function Game(p) {
  var api = p.api; var art = p.art; var v = api.variables || {}; var streaming = !!api.isStreaming;
  useTrainResultWatcher(api);
  useTravelResultWatcher(api);
  useInventoryConsistency(api);
  useAgeSyncWatcher(api);
  useMKPayroll(api);
  useSpellStateSync(api);
  useSpellEventWatcher(api);
  useHousekeeping(api);
  useAiLabeler(api);
  useSquadRoster(api);
  useInventoryStorySync(api);
  useWorldThreads(api);
  useScenePictures(api);
  var vs = React.useState("home"); var view = vs[0], setView = vs[1];
  var hs = React.useState([]); var hist = hs[0], setHist = hs[1];
  var prs = React.useState(null); var preset = prs[0], setPreset = prs[1];
  var pf = React.useState("inventory"); var packFocus = pf[0], setPackFocus = pf[1];
  var sts = React.useState(""); var storySheet = sts[0], setStorySheet = sts[1];
  var bts = React.useState(null); var battle = bts[0], setBattle = bts[1];
  function openBattle(mode) { if (api.isStreaming) return; setStorySheet(""); setBattle({ mode: mode, k: Date.now() }); }
  var was = React.useRef(false);
  React.useEffect(function () { if (streaming && !was.current) { setView("story"); setHist([]); } was.current = streaming; }, [streaming]);
  function route(n) {
    if (n === "bank" || n === "market") { setPackFocus(n); return "pack"; }
    if (n === "pack") setPackFocus("inventory");
    if (n === "squad") return "crown";
    return n;
  }
  function go(n) { var t = route(n); setHist(hist.concat([view])); setView(t === "missions" || t === "notices" ? "journal:" + t : t); }
  function back() { var h = hist.slice(); var prev = h.length ? h.pop() : "home"; setHist(h); setView(prev); }
  function nav(n) { setHist([]); setView(route(n)); }
  function toStory() { setHist([]); setView("story"); }
  function goTrain(focus, target) { setPreset({ focus: focus, target: target }); go("train"); }
  var bannerUrl = artFor(api, art.art, "banner");
  var loc = parseLoc(v.current_location); var cp = obj(v.creation_profile);
  var kingdom = kingdomLabel(loc.kingdom || cp.homeland) || "Clover Kingdom";
  var base = view.split(":")[0]; var tab = view.split(":")[1] || "";
  var main = null;
  if (base === "home") main = <HomeView api={api} art={art} bannerUrl={bannerUrl} go={go} />;
  else if (base === "story") main = <StoryView api={api} art={art} bannerUrl={bannerUrl} onBack={function () { nav("home"); }} go={go} sheet={storySheet} setSheet={setStorySheet} openBattle={openBattle} />;
  else {
    var inner = null;
    if (base === "grimoire") inner = <GrimoireView api={api} art={art} goTrain={goTrain} toStory={toStory} goBound={function () { go("bound"); }} />;
    else if (base === "character") inner = <CharacterView api={api} portrait={art.portrait} setPortrait={art.setPortrait} hasStore={art.hasStore} mediaError={art.mediaError} />;
    else if (base === "crown") inner = <CrownView api={api} toStory={toStory} />;
    else if (base === "pack") inner = <PackView api={api} toStory={toStory} focus={packFocus} setFocus={setPackFocus} />;
    else if (base === "map") inner = <MapView api={api} toStory={toStory} />;
    else if (base === "people") inner = <PeopleView api={api} art={art} />;
    else if (base === "bound") inner = <BoundView api={api} art={art} />;
    else if (base === "journal") inner = <JournalView api={api} tab={tab || "chronicle"} />;
    else if (base === "train") inner = <div><SparCard api={api} onSpar={function () { openBattle("spar"); }} /><TrainingPanel api={api} preset={preset} toStory={toStory} /></div>;
    else if (base === "time") inner = <TimeView api={api} toStory={toStory} />;
    else if (base === "routine") inner = <RoutineView api={api} />;
    else if (base === "codex") inner = <CodexView api={api} toStory={toStory} />;
    else if (base === "household") inner = <HouseholdView api={api} />;
    else if (base === "art") inner = <ArtView api={api} art={art} />;
    else if (base === "settings") inner = <SettingsView api={api} toStory={toStory} />;
    else if (base === "help") inner = <HelpView />;
    else inner = <MenuView go={go} />;
    main = <Page title={TITLES[base] || ""} heroKey={base} onBack={hist.length ? back : function () { nav("home"); }} bannerUrl={bannerUrl} kingdom={kingdom} date={v.world_date} time={v.world_time}>{inner}</Page>;
  }
  return (
    <div className="bc-fill bc-game" style={{ background: PAGE_BG }}>
      <style>{BATTLE_CSS + "\n" + WORLDMAP_CSS}</style>
      {battle ? <BattleArena key={battle.k} v={v} mode={battle.mode} portrait={art.portrait} spellCat={spellCat}
        onCancel={function () { setBattle(null); }}
        onFinish={function (r, again) { applyBattle(api, v, r); setBattle(again ? { mode: battle.mode, k: Date.now() } : null); if (r.mode !== "spar") toStory(); }} /> : null}
      <main className="bc-main-area">{main}</main>
      {base === "story" ? <Composer api={api} sheet={storySheet} onPlus={function () { setStorySheet(storySheet === "actions" ? "" : "actions"); }} /> : null}
      <Nav view={base} nav={nav} notices={noticeCount(v)} missions={activeMissions(v)} />
    </div>
  );
}

var IDEAS = ["I take a slow look around and listen.", "I ask the nearest person what's new around here.", "I check what I'm carrying and tidy my things.", "I practice a small, controlled bit of my magic.", "I find somewhere quiet to think about what to do next.", "I go looking for honest work.", "I head somewhere I haven't been yet.", "I write a short letter to someone I care about."];
function composerIdea(v, random) {
  var chips = (CTX[str(v.scene_type)] || CTX.other).map(function (c) { return c + "."; });
  var goals = arr(v.goals).filter(function (g) { return g && (!g.status || g.status === "active"); });
  var ups = arr(v.known_events).filter(function (e) { return e && (e.kind === "upcoming" || e.kind === "opportunity") && (!e.status || e.status === "known"); });
  var focused = [];
  if (goals.length) focused.push("I work toward my goal: " + str(goals[0].goal).replace(/\.$/, "") + ".");
  if (ups.length) focused.push("I prepare for " + str(ups[0].title).replace(/\.$/, "") + ".");
  var pool = random ? chips.concat(IDEAS).concat(focused) : focused.concat(chips);
  return random ? pool[Math.floor(Math.random() * pool.length)] : pool[0];
}
function Composer(p) {
  var api = p.api; var busy = !!api.isStreaming; var v = api.variables || {};
  return (
    <div className="bc-composer">
      {api.error ? <div role="alert" className="bc-composer-err">{"The GM couldn't answer: " + str(api.error) + ". Send your message again."}</div> : null}
      <MessageInput />
    </div>
  );
}
