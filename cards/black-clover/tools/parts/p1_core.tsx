
/* ======================================================================
   v21.5 INTERFACE — layout rebuilt from the creator's mockups.
   Painted art lives in bc-art.js (interface-only, never sent to the AI).
   ====================================================================== */
var MORE_PATHS = {
  coins: "M24 6 C32 6 38 8.2 38 11 C38 13.8 32 16 24 16 C16 16 10 13.8 10 11 C10 8.2 16 6 24 6 Z M10 14.5 C10 17.3 16 19.5 24 19.5 C32 19.5 38 17.3 38 14.5 V19 C38 21.8 32 24 24 24 C16 24 10 21.8 10 19 Z M10 22.5 C10 25.3 16 27.5 24 27.5 C32 27.5 38 25.3 38 22.5 V27 C38 29.8 32 32 24 32 C16 32 10 29.8 10 27 Z M10 30.5 C10 33.3 16 35.5 24 35.5 C32 35.5 38 33.3 38 30.5 V35 C38 37.8 32 40 24 40 C16 40 10 37.8 10 35 Z",
  bank: "M24 4 L44 14 V18 H4 V14 Z M8 21 H14 V36 H8 Z M21 21 H27 V36 H21 Z M34 21 H40 V36 H34 Z M4 39 H44 V44 H4 Z",
  people: "M24 8 a6 6 0 1 1 0 12 a6 6 0 1 1 0 -12 Z M12 13 a5 5 0 1 1 0 10 a5 5 0 1 1 0 -10 Z M36 13 a5 5 0 1 1 0 10 a5 5 0 1 1 0 -10 Z M13 40 C13 30 18 24 24 24 C30 24 35 30 35 40 Z M3 38 C3 30 7 26 12 26 C14 26 15.5 26.5 17 27.5 C14 30.5 12.5 34 12.3 38 Z M45 38 C45 30 41 26 36 26 C34 26 32.5 26.5 31 27.5 C34 30.5 35.5 34 35.7 38 Z",
  crown: "M5 16 L15 25 L24 9 L33 25 L43 16 L39 37 H9 Z M9 40 H39 V44 H9 Z",
  gear: "M21 3 H27 L28 9 L33 11 L38 7 L42 11 L38 16 L40 21 L46 21 V27 L40 28 L38 33 L42 38 L38 42 L33 38 L28 40 L27 46 H21 L20 40 L15 38 L10 42 L6 38 L10 33 L8 28 L2 27 V21 L8 20 L10 15 L6 10 L10 6 L15 10 L20 8 Z M24 17 a7 7 0 1 0 0.01 0 Z",
  search: "M20 5 a14 14 0 1 1 0 28 a14 14 0 1 1 0 -28 Z M20 10 a9 9 0 1 0 0.01 0 Z M30 29 L34 25 L45 36 L41 40 Z",
  up: "M24 4 L40 22 H30 V36 H18 V22 H8 Z M10 40 H38 V45 H10 Z",
  down: "M18 4 H30 V18 H40 L24 36 L8 18 H18 Z M10 40 H38 V45 H10 Z",
  doc: "M11 3 H29 L39 13 V45 H11 Z M15 7 V41 H35 V15 H27 V7 Z M18 22 H32 V25 H18 Z M18 29 H32 V32 H18 Z M18 35 H28 V38 H18 Z",
  bed: "M4 12 H9 V27 H44 V40 H39 V35 H9 V40 H4 Z M11 21 a4.5 4.5 0 1 1 9 0 a4.5 4.5 0 1 1 -9 0 Z M22 17 H38 a5 5 0 0 1 5 5 V25 H22 Z",
  food: "M12 4 H14 V16 H16 V4 H18 V16 H20 V4 H22 V18 C22 21 20 23 18.5 23 V44 H15.5 V23 C14 23 12 21 12 18 Z M30 4 C35 4 37 10 37 18 C37 22 35 24 33 24 V44 H30 Z",
  dumbbell: "M3 19 H7 V29 H3 Z M8 13 H15 V35 H8 Z M16 22 H32 V26 H16 Z M33 13 H40 V35 H33 Z M41 19 H45 V29 H41 Z",
  drop: "M24 3 C24 3 10 20 10 30 C10 38 16 44 24 44 C32 44 38 38 38 30 C38 20 24 3 24 3 Z",
  run: "M28 3 a4.5 4.5 0 1 1 0 9 a4.5 4.5 0 1 1 0 -9 Z M20 14 L30 14 L35 23 L42 24 L41 28 L32 27 L29 22 L26 30 L33 36 L31 45 L27 44 L28 38 L20 32 L16 40 L7 40 L8 36 L13 36 L18 25 L16 21 L12 27 L8 25 L14 16 Z",
  flame: "M24 3 C26 12 36 16 36 29 C36 38 30 45 24 45 C18 45 12 39 12 31 C12 24 16 21 18 15 C20 20 22 21 23 21 C22 15 22 9 24 3 Z",
  leaf: "M40 6 C18 6 7 17 7 32 C7 36 8 39 10 42 L13 39 C12 37 12 35 12 33 C12 23 20 16 32 13 C22 18 16 25 14 36 C26 37 38 30 40 6 Z",
  shield: "M24 3 L41 9 V22 C41 32 34 40 24 45 C14 40 7 32 7 22 V9 Z",
  sword: "M38 4 L44 4 L44 10 L22 32 L26 36 L23 39 L19 35 L12 42 L9 39 L16 32 L12 28 L15 25 L19 29 Z",
  plus: "M20 6 H28 V20 H42 V28 H28 V42 H20 V28 H6 V20 H20 Z",
  dice: "M8 8 H40 V40 H8 Z M14 11 a3 3 0 1 0 0.01 0 Z M34 11 a3 3 0 1 0 0.01 0 Z M24 21 a3 3 0 1 0 0.01 0 Z M14 31 a3 3 0 1 0 0.01 0 Z M34 31 a3 3 0 1 0 0.01 0 Z",
  feather: "M42 4 C26 6 14 16 10 34 L6 44 L10 44 L13 37 C30 34 38 22 42 4 Z",
  link: "M14 18 H22 V23 H15 a5 5 0 0 0 0 10 H22 V38 H14 a10 10 0 0 1 0 -20 Z M26 18 H34 a10 10 0 0 1 0 20 H26 V33 H33 a5 5 0 0 0 0 -10 H26 Z M17 26 H31 V30 H17 Z",
  castle: "M6 44 V18 H10 V22 H14 V18 H18 V24 H22 V10 H18 V5 H22 V8 H26 V5 H30 V10 H26 V24 H30 V18 H34 V22 H38 V18 H42 V44 H28 V35 a4 4 0 0 0 -8 0 V44 Z",
  hammer: "M8 6 H30 L36 12 L30 16 H25 V44 H19 V16 H8 Z",
  wheat: "M23 44 V8 H25 V44 Z M24 8 C28 7 30 10 30 13 C27 14 25 12 24 8 Z M24 8 C20 7 18 10 18 13 C21 14 23 12 24 8 Z M24 16 C28 15 31 18 31 21 C27 22 25 20 24 16 Z M24 16 C20 15 17 18 17 21 C21 22 23 20 24 16 Z M24 24 C28 23 31 26 31 29 C27 30 25 28 24 24 Z M24 24 C20 23 17 26 17 29 C21 30 23 28 24 24 Z M24 3 C25.5 4 26 6 24 9 C22 6 22.5 4 24 3 Z",
  fleur: "M24 3 C29 9 30 15 26 22 H22 C18 15 19 9 24 3 Z M21 24 C14 25 8 21 7 14 C12 13 16 16 18 20 Z M27 24 C34 25 40 21 41 14 C36 13 32 16 30 20 Z M14 24 H34 V28 H14 Z M22 28 H26 V38 C26 41 29 43 32 43 H16 C19 43 22 41 22 38 Z",
  cal: "M8 9 H40 V43 H8 Z M12 18 V39 H36 V18 Z M14 4 H18 V12 H14 Z M30 4 H34 V12 H30 Z M16 22 H22 V28 H16 Z",
  info: "M24 3 a21 21 0 1 1 0 42 a21 21 0 1 1 0 -42 Z M21.5 20 H26.5 V36 H21.5 Z M24 10 a3 3 0 1 0 0.01 0 Z",
  chart: "M6 42 H44 V45 H6 Z M9 28 H15 V40 H9 Z M19 18 H25 V40 H19 Z M29 10 H35 V40 H29 Z",
  bookmark: "M12 4 H36 V44 L24 34 L12 44 Z",
  devil: "M24 44 C14 44 8 36 8 26 C8 22 9 18 11 15 L6 4 L17 11 C19 10 21.5 9.5 24 9.5 C26.5 9.5 29 10 31 11 L42 4 L37 15 C39 18 40 22 40 26 C40 36 34 44 24 44 Z",
  bolt: "M28 2 L10 27 H22 L18 46 L38 19 H26 Z",
  wave: "M4 20 C10 14 16 14 22 20 C28 26 34 26 44 18 V24 C34 32 28 32 22 26 C16 20 10 20 4 26 Z M4 32 C10 26 16 26 22 32 C28 38 34 38 44 30 V36 C34 44 28 44 22 38 C16 32 10 32 4 38 Z",
  gem: "M14 6 H34 L44 18 L24 44 L4 18 Z",
  snow: "M22 3 H26 V45 H22 Z M4.2 13.6 L6.2 10.1 L43.8 34.4 L41.8 37.9 Z M41.8 10.1 L43.8 13.6 L6.2 37.9 L4.2 34.4 Z",
  mountain: "M2 42 L17 14 L25 27 L31 18 L46 42 Z",
  skull: "M24 4 C34 4 41 11 41 21 C41 27 38 31 34 33 V40 H28 V36 H26 V40 H22 V36 H20 V40 H14 V33 C10 31 7 27 7 21 C7 11 14 4 24 4 Z M17 18 a4.5 4.5 0 1 0 0.01 0 Z M31 18 a4.5 4.5 0 1 0 0.01 0 Z",
  send: "M4 22 L44 4 L32 44 L24 28 Z",
  ring: "M24 6 a18 18 0 1 1 0 36 a18 18 0 1 1 0 -36 Z M24 12 a12 12 0 1 0 0.01 0 Z"
};
Object.keys(MORE_PATHS).forEach(function (k) { if (!PATHS[k]) PATHS[k] = MORE_PATHS[k]; });

function img(k) { return (BC_IMG && BC_IMG[k]) || ""; }
function hashPick(s, list) { var h = 0; s = str(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return list[Math.abs(h) % list.length]; }

function Pennant(p) {
  var id = "bcpn-" + (p.side || "l");
  return (
    <div className={"bc-pennant bc-pennant-" + (p.side || "l")} role={p.label ? "group" : undefined} aria-label={p.label ? p.label + (p.sub ? ", " + p.sub : "") : undefined} aria-hidden={p.label ? undefined : "true"}>
      <svg viewBox="0 0 60 100" preserveAspectRatio="none" className="bc-pennant-svg" aria-hidden="true">
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#15253f" /><stop offset="1" stopColor="#070d18" /></linearGradient></defs>
        <path d="M2 0 H58 V80 L30 98 L2 80 Z" fill={"url(#" + id + ")"} stroke="#d4ae5c" strokeWidth="1.6" />
        <path d="M7 3 H53 V77 L30 92 L7 77 Z" fill="none" stroke="#d4ae5c" strokeOpacity=".45" strokeWidth=".9" />
        <path d="M22 84 L30 89 L38 84" fill="none" stroke="#d4ae5c" strokeOpacity=".7" strokeWidth="1" />
      </svg>
      <div className="bc-pennant-in">
        {p.icon === "compass" ? <Icon n="compass" s={30} /> : <Icon n="clover" s={p.label ? 22 : 34} />}
        {p.label ? <div className="bc-pennant-label">{p.label}</div> : null}
        {p.sub ? <div className="bc-pennant-sub">{p.sub}</div> : null}
      </div>
    </div>
  );
}
function Hero(p) {
  var bg = p.img ? img(p.img) : p.bannerUrl;
  return (
    <header className={"bc-hero" + (p.big ? " bc-hero-big" : "") + (p.cls ? " " + p.cls : "")} style={p.h ? { height: p.h } : undefined}>
      {bg ? <img className="bc-hero-img" src={bg} alt="" /> : <SceneCastle />}
      <div className="bc-hero-shade" />
      {p.onBack ? <button type="button" className="bc-hero-back" aria-label="Back" onClick={p.onBack}><Icon n="chevl" s={18} fill={C.goldHi} /></button> : (p.left === false ? null : <Pennant side="l" />)}
      <div className={"bc-hero-title" + (p.onBack || p.left === false ? " bc-hero-title-back" : "")}>
        <div className="bc-hero-orn" aria-hidden="true"><span /><Icon n="clover" s={12} /><span /></div>
        <div className="bc-hero-name">{p.title || "Black Clover"}</div>
        <div className="bc-hero-sub">{p.sub || "A Mage's Tale"}</div>
        {p.tagline ? <div className="bc-hero-tag">{p.tagline}</div> : null}
        {p.quote ? <div className="bc-hero-quote">{p.quote}{p.quoteBy ? <small>{"— " + p.quoteBy}</small> : null}</div> : null}
      </div>
      {p.right === false ? null : <Pennant side="r" icon={p.right === "compass" ? "compass" : null} label={p.right === "compass" ? "" : (p.kingdom || "Clover Kingdom")} sub={p.pennantSub} />}
      {p.children}
    </header>
  );
}
function SectionHead(p) {
  return (
    <div className={"bc-shead" + (p.art ? " bc-shead-art" : "")}>
      {p.art ? <img className="bc-shead-img" src={img(p.art)} alt="" /> : null}
      <span className="bc-shead-icon"><Icon n={p.icon} s={p.iconSize || 30} /></span>
      <span className="bc-shead-text"><strong>{p.title}</strong>{p.sub ? <small>{p.sub}</small> : null}</span>
      {p.right ? <span className="bc-shead-right">{p.right}</span> : null}
    </div>
  );
}
function Chip(p) {
  return <button type="button" className={"bc-chip" + (p.on ? " bc-chip-on" : "")} aria-pressed={p.on ? "true" : "false"} onClick={p.onClick} disabled={p.disabled}>{p.icon ? <Icon n={p.icon} s={15} /> : null}{p.children}</button>;
}
function ActionRow(p) {
  return (
    <button type="button" className="bc-actrow" onClick={p.onClick} disabled={p.disabled} aria-expanded={p.expanded === undefined ? undefined : (p.expanded ? "true" : "false")}>
      <span className="bc-actrow-icon"><Icon n={p.icon} s={p.iconSize || 30} /></span>
      <span className="bc-actrow-text"><strong>{p.title}</strong>{p.sub ? <small>{p.sub}</small> : null}</span>
      <Icon n={p.expanded ? "chevd" : "chevr"} s={14} />
    </button>
  );
}

/* ---------- navigation ---------- */
var NAV = [["home", "Home", "home"], ["grimoire", "Grimoire", "book"], ["people", "Bonds", "people"], ["journal", "Chronicle", "doc"], ["story", "Adventure", "clover"], ["pack", "Pack", "pack"], ["bound", "Bound", "wisp"], ["crown", "Crown", "crown"], ["menu", "More", "gear"]];
var HOME_SUB = { character: 1, train: 1, time: 1, routine: 1, codex: 1, household: 1, art: 1, settings: 1, help: 1, map: 1 };
var PACK_SUB = { bank: 1, market: 1 };
var JOURNAL_SUB = { missions: 1, notices: 1 };
function Nav(p) {
  return (
    <nav className="bc-nav" aria-label="Sections">
      {NAV.map(function (it) {
        var on = p.view === it[0] || (it[0] === "home" && HOME_SUB[p.view]) || (it[0] === "pack" && PACK_SUB[p.view]) || (it[0] === "journal" && JOURNAL_SUB[p.view]) || (it[0] === "crown" && p.view === "squad");
        if (it[0] === "story") {
          return (
            <div key="story" className="bc-nav-story-wrap">
              <button className="bc-nav-story-btn" type="button" aria-label="Adventure" aria-current={on ? "page" : undefined} onClick={function () { p.nav("story"); }}>
                <Icon n="clover" s={38} />
              </button>
            </div>
          );
        }
        var badge = it[0] === "journal" ? p.notices : 0;
        return (
          <button className="bc-nav-item" key={it[0]} type="button" aria-label={it[1] + (badge ? ", " + badge + " notices" : "")} aria-current={on ? "page" : undefined} onClick={function () { p.nav(it[0]); }}>
            <Icon n={it[2]} s={21} fill={on ? "url(#bcg-gold)" : "#9aa0ad"} />
            <span>{it[1]}</span>
            {badge ? <b className="bc-nav-badge">{badge}</b> : null}
          </button>
        );
      })}
    </nav>
  );
}

/* ---------- home ---------- */
var TILES = [
  { k: "adventure", t: "Adventure", s: "Explore. Fight. Grow.", icon: "compass", view: "story" },
  { k: "grimoire", t: "Grimoire", s: "Spells. Attributes. Progress.", icon: "book", view: "grimoire" },
  { k: "character", t: "Character", s: "Profile. Skills. Conditions.", icon: "bust", view: "character" },
  { k: "squad", t: "Squad", s: "Join. Rise. Make a name.", icon: "people", view: "crown" },
  { k: "inventory", t: "Inventory", s: "Items. Materials. Key items.", icon: "pack", view: "pack" },
  { k: "market", t: "Market", s: "Buy. Sell. Trade.", icon: "coins", view: "market" },
  { k: "bank", t: "Bank & Treasury", s: "Save. Deposit. Withdraw.", icon: "bank", view: "bank" },
  { k: "missions", t: "Missions", s: "Requests. Bounties. Guild.", icon: "scroll", view: "missions" },
  { k: "map", t: "World Map", s: "Travel. Discover. Plan.", icon: "map", view: "map" },
  { k: "relationships", t: "Bonds", s: "Friends. Rivals. Romance.", icon: "heart", view: "people" },
  { k: "more", t: "More", s: "Journal. Codex. Settings.", icon: "dots", view: "menu" }
];
var TILE_KEYS = TILES.map(function (t) { return t.k; });
function Tile(p) {
  var url = p.url || img("tile_" + p.k);
  return (
    <button type="button" className={"bc-tile bc-tile-" + p.k} onClick={p.onClick} aria-label={p.t + (p.badge ? ", " + p.badge + " active" : "")}>
      {url ? <img className="bc-tile-art" src={url} alt="" /> : <TileScene k={p.k} />}
      <span className="bc-tile-shade" />
      <Corners s={10} />
      <span className="bc-tile-icon"><Icon n={p.icon} s={30} /></span>
      <span className="bc-tile-text"><strong>{p.t}</strong><small>{p.s}</small></span>
      <span className="bc-tile-chev"><Icon n="chevr" s={13} /></span>
      {p.badge ? <span className="bc-tile-badge">{p.badge}</span> : null}
    </button>
  );
}
function LocationBar(p) {
  var v = p.v; var loc = parseLoc(v.current_location); var cp = obj(v.creation_profile);
  var sub = [kingdomLabel(loc.kingdom || cp.homeland), loc.region].filter(Boolean).join(" — ");
  return (
    <button type="button" className="bc-locbar" onClick={p.onClick} aria-label={"You are in " + (loc.settlement || "an unknown place") + ". Open the world map."}>
      <img className="bc-locbar-art" src={img("location")} alt="" />
      <span className="bc-locbar-shade" />
      <span className="bc-locbar-pin"><Icon n="pin" s={19} /></span>
      <span className="bc-locbar-text"><strong>{loc.settlement || "Somewhere unknown"}</strong><small>{sub || loc.place}</small></span>
      {v.weather ? <span className="bc-locbar-weather">{str(v.weather)}</span> : null}
      <Icon n="chevr" s={13} />
    </button>
  );
}
function StatPill(p) {
  var val = clamp(num(p.value, 0), 0, 100);
  return (
    <div className={"bc-pill bc-pill-" + p.k + (hudLow(p.k, p.value) ? " bc-crit" : "")} aria-label={p.label + ": " + p.text}>
      <div className="bc-pill-fill" style={{ width: val + "%" }} />
      <span className="bc-pill-icon"><Icon n={p.icon} s={12} fill="#fff6dc" /></span>
      <span className="bc-pill-label">{p.label}</span>
      <span className="bc-pill-val">{p.text}</span>
    </div>
  );
}
function CharacterCard(p) {
  var v = p.v; var pp = obj(v.player_profile); var mp = obj(v.magic_profile); var g = obj(v.grimoire); var mk = obj(v.mk_status); var nums = showNums(v);
  var loc = parseLoc(v.current_location); var home = parseLoc(v.home_location);
  var origin = str(pp.social_origin).split(" (")[0];
  var goals = arr(v.goals).filter(function (x) { return x && (!x.status || x.status === "active"); });
  var motto = goals.length ? "“" + str(goals[0].goal) + "”" : "“Still wandering. Still becoming.”";
  var rep = obj(v.reputation); var rk = Object.keys(rep); var repTxt = "Unknown";
  if (rk.length) { var r0 = rep[rk[0]]; repTxt = typeof r0 === "object" && r0 ? str(r0.band) : str(r0); }
  var hasG = isTrue(v.has_grimoire); var squad = str(mk.squad) && str(mk.squad) !== "none" ? str(mk.squad) : "None";
  var title = str(mk.rank) && str(mk.rank) !== "none" ? str(mk.rank) : "—";
  function val(n, w) { return nums ? num(n) + " / 100" : w; }
  var pbs = React.useState(false); var portBusy = pbs[0], setPortBusy = pbs[1];
  var pms = React.useState(""); var portMsg = pms[0], setPortMsg = pms[1];
  var qos = React.useState(false); var portraitMenu = qos[0], setPortraitMenu = qos[1];
  var qas = React.useState(false); var quickAi = qas[0], setQuickAi = qas[1];
  function onQuickPortraitFile(e) {
    var fl = e.target.files && e.target.files[0]; e.target.value = ""; if (!fl || !p.setPortrait) return;
    readImage(fl, 600, 800, function (err, data) {
      if (err) { setPortMsg(err); return; }
      setPortMsg(""); setPortBusy(true);
      p.setPortrait(data, function (ok) { setPortBusy(false); if (!ok) setPortMsg(p.mediaError || "Upload failed."); });
    });
  }
  return (
    <div className="bc-home-character">
      <Frame className="bc-profile-card" pad={9}>
        <div className="bc-profile-portrait">
          <button type="button" className="bc-portrait-btn" aria-label={p.portrait ? "Portrait options" : "Add a portrait"} disabled={portBusy || !p.setPortrait} onClick={function () { setPortraitMenu(true); }}>
            {p.portrait ? <img src={p.portrait} alt="" /> : <span className="bc-portrait-empty"><Icon n="bust" s={54} fill="#3a4658" /></span>}
          </button>
          <AgeBadge age={str(v.player_age) || "?"} day={num(v.elapsed_days, 0) + 1} onClick={function () { p.go && p.go("character"); }} />
        </div>
        <div className="bc-profile-info">
          <div className="bc-profile-name">{str(v.player_name) || "Nameless"}</div>
          <div className="bc-profile-origin">{[origin, home.settlement || loc.settlement].filter(Boolean).join(" · ")}</div>
          <div className="bc-profile-motto">{motto}</div>
          <button type="button" className="bc-pills" aria-label="Open character: condition and skills" onClick={function () { p.go && p.go("character"); }}>
            <StatPill k="hp" icon="heart" label="Body" value={v.vitality} text={val(v.vitality, condWord(v.vitality))} />
            <StatPill k="mp" icon="drop" label="Mana" value={v.mana} text={val(v.mana, levelWord(v.mana))} />
            <StatPill k="st" icon="run" label="Stamina" value={v.stamina} text={val(v.stamina, levelWord(v.stamina))} />
          </button>
        </div>
        {portMsg ? <div role="alert" className="bc-profile-alert">{portMsg}</div> : null}
      </Frame>
      <Frame className="bc-profile-summary" pad="7px 9px">
        <button type="button" className="bc-summary-grim" onClick={p.goGrimoire}>
          <span className="bc-summary-grim-icon">{hasG ? <Cover g={g} attr={mp.attribute} small design={p.grimoireDesign} imgUrl={artFor(p.api, obj(p.grimoireArt), "grimoire_cover")} /> : <Icon n="book" s={30} />}</span>
          <span className="bc-summary-grim-text"><strong>Grimoire</strong><small>{hasG ? (num(g.leaf_count, 3) + "-leaf · " + num(g.pages_filled, arr(v.spells).length) + " pages") : "Not yet received"}</small></span>
          <Icon n="chevr" s={12} />
        </button>
        {[["star", "Mana", str(obj(mp.bands).reserves) || "Unknown", "character"], ["people", "Reputation", repTxt, "crown"], ["clover", "Squad", squad, "crown"], ["bookmark", "Title", title, "crown"], ["pin", "Location", loc.settlement || "—", "map"]].map(function (r) {
          return (
            <button type="button" key={r[1]} className="bc-summary-row" aria-label={r[1] + ": " + r[2]} onClick={function () { p.go && p.go(r[3]); }}>
              <span className="bc-summary-k"><Icon n={r[0]} s={14} />{r[1]}</span>
              <span className="bc-summary-v">{r[2]}</span>
            </button>
          );
        })}
      </Frame>
      {quickAi ? <AIArtForge api={p.api} title="AI Portrait Forge" closeLabel="Back" subject={str(v.player_name) || "Your character"} needle={str(v.player_name)} currentUrl={p.portrait} baseNote={"Solo 3:4 anime character portrait of my player character " + (str(v.player_name) || "the protagonist") + ". " + clipArtNote([str(pp.appearance), str(pp.sex), str(pp.social_origin), mp.attribute_known === false ? "" : (str(mp.attribute) + " magic")].filter(Boolean).join("; "), 110) + ". Face visible, no other people."} onApply={function (u, cb) { p.setPortrait(u, cb); }} onClose={function () { setQuickAi(false); }} /> : null}
      {portraitMenu && !quickAi ? <Sheet title="Portrait" onClose={function () { setPortraitMenu(false); }}>
        <div style={{ display: "grid", gridTemplateColumns: "112px minmax(0,1fr)", gap: 12, alignItems: "start" }}>
          <div style={{ aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", border: "1px solid " + C.goldLine, background: "#070809" }}>{p.portrait ? <img src={p.portrait} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="bust" s={42} fill={C.goldDim} /></div>}</div>
          <div style={{ minWidth: 0 }}>
            <H size={17} m="0 0 5px">Your character portrait</H>
            <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.4 }}>Upload your own picture or let Yumina generate one from your established appearance.</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 7, marginTop: 10 }}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", minHeight: 40, padding: "5px 8px", borderRadius: 6, border: "1px solid " + C.gold, color: C.goldHi, fontWeight: 700, cursor: portBusy ? "default" : "pointer", opacity: portBusy ? .6 : 1, fontSize: 14 }}>
                {portBusy ? "Uploading…" : (p.portrait ? "Upload replacement" : "Upload image")}<input type="file" accept="image/*" disabled={portBusy} onChange={onQuickPortraitFile} style={{ display: "none" }} />
              </label>
              <Btn kind="gold" disabled={portBusy} style={{ width: "100%", justifyContent: "center" }} onClick={function () { setQuickAi(true); }}>AI Generate</Btn>
              {p.portrait ? <Btn disabled={portBusy} style={{ width: "100%", justifyContent: "center" }} onClick={function () { setPortBusy(true); p.setPortrait("", function () { setPortBusy(false); }); }}>Remove portrait</Btn> : null}
            </div>
          </div>
        </div>
        {portMsg ? <div role="alert" style={{ fontSize: 13, color: "#f1c7b8", marginTop: 9 }}>{portMsg}</div> : null}
      </Sheet> : null}
    </div>
  );
}
function AgeBadge(p) {
  return (
    <div className="bc-age" role={p.onClick ? "button" : undefined} tabIndex={p.onClick ? 0 : undefined} onClick={p.onClick} onKeyDown={function (e) { if (p.onClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); p.onClick(); } }} aria-label={"Age " + p.age + ", day " + p.day}>
      <div className="bc-age-ring"><span>AGE</span><strong>{p.age}</strong></div>
      <div className="bc-age-day">{"Day " + p.day}</div>
    </div>
  );
}
function noticeCount(v) {
  var ups = arr(v.known_events).filter(function (e) { return e && (e.kind === "upcoming" || e.kind === "opportunity") && (!e.status || e.status === "known"); }).length;
  var com = arr(v.commitments).filter(function (c) { return c && (!c.status || /active|open|pending|due/i.test(str(c.status))); }).length;
  return ups + com + arr(v.conditions).length;
}
function activeMissions(v) { return arr(v.missions).filter(function (m) { return m && (m.status === "active" || m.status === "accepted" || m.status === "offered"); }).length; }
function HomeView(p) {
  var api = p.api; var v = api.variables || {}; var loc = parseLoc(v.current_location); var cp = obj(v.creation_profile);
  var goals = arr(v.goals).filter(function (g) { return g && (!g.status || g.status === "active"); });
  var missions = arr(v.missions).filter(function (m) { return m && (m.status === "active" || m.status === "accepted"); });
  var ups = arr(v.known_events).filter(function (e) { return e && (e.kind === "upcoming" || e.kind === "opportunity") && (!e.status || e.status === "known"); });
  var objective = goals.length ? str(goals[0].goal) : (missions.length ? str(missions[0].title) : (ups.length ? str(ups[0].title) + (ups[0].when ? ", " + str(ups[0].when) : "") : "No active objective."));
  var kingdom = kingdomLabel(loc.kingdom || cp.homeland) || "Clover Kingdom";
  return (
    <div className="bc-scroll bc-home-scroll">
      <Hero bannerUrl={p.bannerUrl} tagline="A world of magic awaits, your story begins here." kingdom={kingdom} pennantSub={dayMonth(v.world_date) ? dayMonth(v.world_date) + " · " + clock12(v.world_time) : ""} />
      <div className="bc-wrap">
        <LocationBar v={v} onClick={function () { p.go("map"); }} />
        <CharacterCard api={api} v={v} portrait={p.art.portrait} setPortrait={p.art.setPortrait} mediaError={p.art.mediaError} grimoireArt={p.art.art} grimoireDesign={p.art.grimoireDesign} goGrimoire={function () { p.go("grimoire"); }} go={p.go} />
        <div className="bc-home-tiles">
          {TILES.map(function (t) {
            var badge = t.k === "missions" ? activeMissions(v) : 0;
            return <Tile key={t.k} k={t.k} t={t.t} s={t.s} icon={t.icon} badge={badge} url={artFor(api, p.art.art, t.k)} onClick={function () { p.go(t.view); }} />;
          })}
        </div>
        <Frame className="bc-home-objective" pad="9px 11px">
          <Icon n="clover" s={28} />
          <div className="bc-objective-text"><strong>Current Objective</strong><span>{objective}</span></div>
          <button type="button" className="bc-objective-btn" onClick={function () { p.go("journal"); }}>View Journal<Icon n="chevr" s={11} /></button>
        </Frame>
        <Quote />
      </div>
    </div>
  );
}
