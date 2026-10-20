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
  var vs = React.useState("home"); var view = vs[0], setView = vs[1];
  var hs = React.useState([]); var hist = hs[0], setHist = hs[1];
  var prs = React.useState(null); var preset = prs[0], setPreset = prs[1];
  var pf = React.useState("inventory"); var packFocus = pf[0], setPackFocus = pf[1];
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
  else if (base === "story") main = <StoryView api={api} art={art} bannerUrl={bannerUrl} onBack={function () { nav("home"); }} />;
  else {
    var inner = null;
    if (base === "grimoire") inner = <GrimoireView api={api} art={art} goTrain={goTrain} toStory={toStory} goBound={function () { go("bound"); }} />;
    else if (base === "character") inner = <CharacterView api={api} portrait={art.portrait} setPortrait={art.setPortrait} hasStore={art.hasStore} mediaError={art.mediaError} />;
    else if (base === "crown") inner = <CrownView api={api} />;
    else if (base === "pack") inner = <PackView api={api} toStory={toStory} focus={packFocus} setFocus={setPackFocus} />;
    else if (base === "map") inner = <MapView api={api} toStory={toStory} />;
    else if (base === "people") inner = <PeopleView api={api} art={art} />;
    else if (base === "bound") inner = <BoundView api={api} art={art} />;
    else if (base === "journal") inner = <JournalView api={api} tab={tab || "chronicle"} />;
    else if (base === "train") inner = <TrainingPanel api={api} preset={preset} toStory={toStory} />;
    else if (base === "time") inner = <TimeView api={api} toStory={toStory} />;
    else if (base === "routine") inner = <RoutineView api={api} />;
    else if (base === "codex") inner = <CodexView api={api} toStory={toStory} />;
    else if (base === "household") inner = <HouseholdView api={api} />;
    else if (base === "art") inner = <ArtView api={api} art={art} />;
    else if (base === "settings") inner = <SettingsView api={api} toStory={toStory} />;
    else if (base === "help") inner = <HelpView />;
    else inner = <MenuView go={go} />;
    main = <Page title={TITLES[base] || ""} heroKey={base} onBack={hist.length ? back : null} bannerUrl={bannerUrl} kingdom={kingdom} date={v.world_date} time={v.world_time}>{inner}</Page>;
  }
  return (
    <div className="bc-fill bc-game" style={{ background: PAGE_BG }}>
      <main className="bc-main-area">{main}</main>
      {base === "story" ? <Composer api={api} /> : null}
      <Nav view={base} nav={nav} notices={noticeCount(v)} missions={activeMissions(v)} />
    </div>
  );
}
