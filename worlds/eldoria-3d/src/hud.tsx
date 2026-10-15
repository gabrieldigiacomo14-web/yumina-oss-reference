// @ts-nocheck
// The in-game screen: 3D view + HUD laid out like the reference art.
import { loadThree } from "./three";
import { Game } from "./game";
import { makeHumanoid, renderPortrait } from "./models";
import { WorldMap, ensureBaseMap } from "./worldmap";
import { Icon, Bar, Win, cleanGM, stripReport } from "./ui";
import { Character, Skills, Inventory, Callings, Banking, Magic, QuestBoards, Quests, Guild, Party, Training, Factions, Crafting, Markets, Shops, Conditions, Journal, Codex, LivingEvents, PoliticsScreen, FaithsScreen, NewsScreen, Chronicle, AudioSettings, money as moneyText, safeObj, safeArr, titleCase } from "./panels";
import { CALLING_KIT, money } from "./rules";
import * as RIG from "./rig";

var MENU = [["inventory", "Inventory", "I", "Backpack"], ["equipment", "Equipment", "K", "Shirt"], ["skills", "Skills", "P", "Target"], ["techniques", "Techniques", "T", "Swords"], ["spells", "Known Spells", "L", "Sparkles"], ["callings", "Callings", "C", "Shield"], ["sep"], ["journal", "Journal", "J", "BookOpen"], ["quests", "Quests", "Q", "ScrollText"], ["party", "Party & Companions", "O", "Users"], ["codex", "Codex", "N", "Library"], ["crafting", "Crafting", "H", "Hammer"], ["bank", "Bank", "B", "Landmark"], ["map", "World Map", "M", "Map"]];
var KEYMAP = { i: "inventory", k: "equipment", p: "skills", t: "techniques", l: "spells", c: "callings", j: "journal", q: "quests", o: "party", n: "codex", h: "crafting", b: "bank", m: "map" };
var SLOT_ICON = { sword: ["Sword", "steel"], bow: ["Crosshair", "steel"], staff: ["Wand", "arcane"], dagger: ["Slice", "steel"], fist: ["Hand", "steel"], hammer: ["Hammer", "steel"], tech: ["Flame", "fire"], fire: ["Flame", "fire"], ice: ["Snowflake", "ice"], bolt: ["Zap", "ice"], magic: ["Sparkles", "arcane"], heal: ["HeartPulse", "holy"], "potion-red": ["FlaskConical", "red"], "potion-blue": ["FlaskRound", "blue"], herb: ["Leaf", "green"], dodge: ["Wind", "steel"], hand: ["Hand", "wood"], dash: ["ChevronsRight", "wood"], end: ["Hourglass", "holy"] };
export var QUALITY = {
  low: { name: "Low", pixelRatio: 1, shadows: false, shadowMap: 1024, far: 900, radius: 3, particles: 0, aa: false, genBudget: 5, townRange: 450, crowd: 0.35 },
  medium: { name: "Medium", pixelRatio: 1.25, shadows: true, shadowMap: 1024, far: 1300, radius: 4, particles: 1400, aa: true, genBudget: 7, townRange: 650, crowd: 0.75 },
  high: { name: "High", pixelRatio: 2, shadows: true, shadowMap: 2048, far: 1700, radius: 5, particles: 2800, aa: true, genBudget: 9, townRange: 850, crowd: 1 }
};
function isTouch() { try { return window.matchMedia("(pointer: coarse)").matches; } catch (e) { return false; } }
function weatherIcon(w) { w = String(w || "").toLowerCase(); return /storm|thunder/.test(w) ? "CloudLightning" : /snow|sleet|blizzard/.test(w) ? "CloudSnow" : /rain|drizzle|shower/.test(w) ? "CloudRain" : /fog|mist|haze|ash/.test(w) ? "CloudFog" : /cloud|overcast/.test(w) ? "Cloud" : "Sun"; }
function seasonIcon(s) { s = String(s || "").toLowerCase(); return /winter/.test(s) ? "Snowflake" : /autumn|fall/.test(s) ? "Leaf" : /summer/.test(s) ? "Sun" : "Flower2"; }

export function GameScreen(props) {
  var R = React; var api = props.api; var v = api.variables || {};
  var hostRef = R.useRef(null), miniRef = R.useRef(null), gameRef = R.useRef(null);
  var [snap, setSnap] = R.useState(null);
  var [status, setStatus] = R.useState("Loading the 3D engine…");
  var [panel, setPanel] = R.useState(null);
  var [tab, setTab] = R.useState(null);
  var [menu, setMenu] = R.useState(null);
  var [inspect, setInspect] = R.useState(false);
  var [dialog, setDialog] = R.useState(null);
  var [draft, setDraft] = R.useState("");
  var [hud, setHud] = R.useState(function () { return hudDefaults(); });
  var [tray, setTray] = R.useState(null);
  var [, setVw] = R.useState(0);
  var [qKey, setQKey] = R.useState(function () { return isTouch() ? "low" : "medium"; });
  var [portrait, setPortrait] = R.useState("");
  var [, force] = R.useState(0);
  var stateRef = R.useRef({}); stateRef.current = { panel: panel, menu: menu, dialog: dialog, tray: tray };
  var prefs = props.audioPrefs || {};
  var prefsRef = R.useRef(prefs); prefsRef.current = prefs;

  // which HUD blocks are open survives sessions (per viewer, phone and wide screens kept apart)
  R.useEffect(function () { try { Promise.resolve(api.storage && api.storage.get && api.storage.get(hudKey())).then(function (h) { if (h && typeof h === "object") setHud(Object.assign(hudDefaults(), h)); }); } catch (e) { } var onR = function () { setVw(window.innerWidth * 10000 + window.innerHeight); }; window.addEventListener("resize", onR); return function () { window.removeEventListener("resize", onR); }; }, []);
  function tog(k, val) { setHud(function (h) { var n = Object.assign({}, h); n[k] = val === undefined ? (h[k] ? 0 : 1) : val; try { api.storage && api.storage.set && api.storage.set(hudKey(), n); } catch (e) { } return n; }); }
  var togRef = R.useRef(tog); togRef.current = tog;
  // quality preference survives sessions (per viewer)
  R.useEffect(function () { try { Promise.resolve(api.storage && api.storage.get && api.storage.get("eldoria3d-quality")).then(function (q) { if (q && QUALITY[q]) setQKey(q); }); } catch (e) { } }, []);

  function sendToGM(text, opts) {
    opts = opts || {}; var g = gameRef.current;
    if (api.isStreaming) { api.showToast("The Game Master is still speaking…", "info"); return; }
    var lines = g ? g.takeReport() : [];
    var p = g ? g.flush() : Promise.resolve();
    var msg = text; if (lines.length) msg = "[Real-time play since my last message — already applied to state by the 3D client; narrate consequences, do not re-apply]\n- " + lines.join("\n- ") + "\n\n" + text;
    setDialog(function (d) { return Object.assign({ open: true }, d || {}, opts.npc !== undefined ? { npc: opts.npc } : {}, { open: true, sent: Date.now() }); });
    Promise.resolve(p).then(function () { api.sendMessage(msg); }).catch(function () { api.sendMessage(msg); });
  }
  R.useEffect(function () { window.__eldoriaSend = sendToGM; });

  // ---- boot the engine
  R.useEffect(function () {
    var alive = true; setStatus("Loading the 3D engine…");
    loadThree().then(function () {
      if (!alive || !hostRef.current) return; setStatus("Raising the land of Eldoria…");
      setTimeout(function () {
        if (!alive) return;
        window.__eldoriaPortrait = function (look) { return renderPortrait(function () { return makeHumanoid(look); }, { w: 96, h: 96 }); };
        var bridge = {
          api: api,
          toast: function (m, t) { try { api.showToast(m, t); } catch (e) { } },
          sfx: function (id) { if (prefsRef.current.sfx === false) return; try { api.playAudio(id, { volume: 0.6 }); } catch (e) { } },
          combatMusic: function (on, boss) { if (prefsRef.current.combat === false || prefsRef.current.music === false) return; try { if (on) api.playAudio(boss ? "bgm-combat-boss" : "bgm-combat-standard", { fadeDuration: 1.2, loop: true }); else { api.stopAudio("bgm-combat-standard", 2); api.stopAudio("bgm-combat-boss", 2); } } catch (e) { } },
          onHud: function (s) { if (alive) setSnap(s); },
          onNpc: function (card) { setInspect(false); setMenu(card); },
          onDoor: function (door, place) { sendToGM(door.kind === "dungeon" ? "I approach the entrance of " + door.name + " and carefully make my way inside." : door.kind === "market" ? "I browse the stalls of the " + door.name + " in " + place.name + "." : "I step into the " + door.name + " in " + place.name + ".", { npc: null }); },
          onBoard: function (board, place) { sendToGM("I stop at the " + board.name + " in " + place.name + " and read the requests posted there.", { npc: null }); },
          onFall: function (name) { setTimeout(function () { sendToGM("Everything goes dark as the " + name + " brings me down.", { npc: null }); }, 400); },
          hotkey: function (k, e) {
            var st = stateRef.current;
            if (k === "escape") { if (st.tray) { setTray(null); return true; } if (st.menu) { setMenu(null); return true; } if (st.panel) { setPanel(null); return true; } if (st.dialog && st.dialog.open) { closeDialog(); return true; } return false; }
            if (st.menu && (k === "e" || k === "f")) { menuAct("talk", st.menu); return true; }
            // while speaking to someone, letters belong to the reply box, not to hotkeys
            if (st.dialog && st.dialog.open && st.dialog.npc && k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { var ta = document.querySelector(".eDialog .eCompose textarea"); if (ta) { ta.focus(); return false; } }
            if (k === "enter") { setDialog(function (d) { return Object.assign({}, d || {}, { open: true, focus: Date.now() }); }); return true; }
            if (k === "u" && !e.ctrlKey && !e.metaKey) { togRef.current("min"); return true; }
            if ((k === "r" || k === "v") && !e.ctrlKey && !e.metaKey && !(st.dialog && st.dialog.open)) { var want = k === "r" ? "spells" : "items"; setTray(function (t) { return t === want ? null : want; }); return true; }
            if (KEYMAP[k] && !e.ctrlKey && !e.metaKey) { setPanel(function (p) { return p === KEYMAP[k] ? null : KEYMAP[k]; }); setTab(null); return true; }
            return false;
          }
        };
        var startGame = function () {
          if (!alive || !hostRef.current) return;
          try { var g = new Game(hostRef.current, bridge, QUALITY[qKey]); gameRef.current = g; window.__eldoriaGame = g; g.start(api.variables || {}); g.minimap = miniRef.current; setStatus(null); }
          catch (err) { console.error(err); if (gameRef.current) { try { gameRef.current.dispose(); } catch (e2) { } gameRef.current = null; } setStatus("The 3D view could not start: " + (err && err.message ? err.message : err) + ". Your chronicle is still available below."); }
        };
        // optional rigged glTF models (world assets named in the world3d-models variable) load first; failures fall back to the procedural bodies
        var man = (api.variables || {})["world3d-models"]; var gate = man && typeof man === "object" && Object.keys(man).length ? Promise.race([RIG.loadManifest(api, man), new Promise(function (r) { setTimeout(r, 25000); })]) : Promise.resolve(); setStatus(man && Object.keys(man).length ? "Loading character models…" : status);
        Promise.resolve(gate).catch(function () { }).then(startGame);
        setTimeout(function () { try { ensureBaseMap(); } catch (e) { console.error(e); } }, 4000);
      }, 30);
    }).catch(function (err) { setStatus(String(err && err.message || err)); });
    return function () { alive = false; if (gameRef.current) { gameRef.current.dispose(); gameRef.current = null; } };
  }, [qKey]);
  R.useEffect(function () { if (gameRef.current) gameRef.current.setVars(api.variables || {}); });
  R.useEffect(function () { if (gameRef.current && miniRef.current) gameRef.current.minimap = miniRef.current; });
  // player portrait from the avatar
  var avatarKey = JSON.stringify([v["player-avatar"], v["starting-calling"], v["player-species"], v["player-gender"]]);
  R.useEffect(function () { var t = setTimeout(function () { loadThree().then(function () { var look = Object.assign({}, v["player-avatar"] || {}, { calling: v["starting-calling"] || "Fighter", species: v["player-species"] || "Human", gender: v["player-gender"] }); setPortrait(renderPortrait(function () { return makeHumanoid(look); }, { w: 128, h: 128 })); }); }, 200); return function () { clearTimeout(t); }; }, [avatarKey]);

  function closeDialog() { setDialog(function (d) { return Object.assign({}, d || {}, { open: false }); }); gameRef.current && gameRef.current.endTalk(); }
  function menuAct(kind, card) {
    var who = card.name + (card.title ? ", " + card.title : "");
    var where = (snap && snap.sub ? snap.sub + ", " : "") + (snap ? snap.location : "");
    if (kind === "goodbye") { setMenu(null); gameRef.current && gameRef.current.endTalk(); return; }
    if (kind === "inspect") { setInspect(true); return; }
    gameRef.current && gameRef.current.startTalk(card.id); setMenu(null);
    if (kind === "talk") { setDialog({ open: true, npc: card, focus: Date.now() }); setDraft(""); return; }
    var text = kind === "trade" ? "I ask " + who + " to show me their wares and prices." : kind === "quest" ? "I ask " + who + " whether there is any work or request I could take on." : kind === "train" ? "I ask " + who + " about training in " + card.trainer + " and what it would cost." : "";
    sendToGM("(At " + where + ") " + text, { npc: card });
  }
  function submitDraft() { var t = draft.trim(); if (!t) return; var d = dialog || {}; var who = d.npc ? "(Speaking to " + d.npc.name + (d.npc.title ? ", " + d.npc.title : "") + ") " : ""; setDraft(""); sendToGM(who + t, { npc: d.npc || null }); }

  // ---- derived display data
  var s = snap || { hp: v["player-hp"], maxHp: v["player-max-hp"], mp: v["player-mana"], maxMp: v["player-max-mana"], sp: v["player-stamina"], maxSp: v["player-max-stamina"], location: v["current-location"], sub: v["current-sublocation"], time: v["world-time"], date: v["world-date"], hotbar: [], log: [], heading: Math.PI };
  var cp = money(v["player-money-cp"]); var inv = safeArr(v.inventory); var wt = inv.reduce(function (n, it) { return n + (Number(it && it.weight) || 0) * (Number(it && it.qty) || 1); }, 0); var str = Number(safeObj(v.attributes).strength) || 10; var cap = str * 12;
  var quests = safeArr(v["quest-log"]).filter(function (q) { return q && !/complete|failed|abandon|expired/i.test(String(q.status || "")); }).slice(0, 4);
  var partyList = []; safeArr(v.party).forEach(function (p) { if (typeof p === "string") { var c = safeObj(v.companions)[p] || {}; partyList.push(Object.assign({ name: titleCase(p) }, c)); } else if (p) partyList.push(p); }); if (!partyList.length) Object.keys(safeObj(v.companions)).forEach(function (k) { var c = safeObj(v.companions)[k]; if (c && (c.inParty || c.status === "traveling" || c.following)) partyList.push(Object.assign({ name: titleCase(k) }, c)); });
  var rot = (s.heading || Math.PI) - Math.PI;
  var ring = function (ax, ay) { return { left: (50 + (ax * Math.cos(rot) - ay * Math.sin(rot)) * 46) + "%", top: (50 + (ax * Math.sin(rot) + ay * Math.cos(rot)) * 46) + "%" }; };
  var lastGM = null; var msgs = safeArr(api.messages); for (var i = msgs.length - 1; i >= 0; i--) { if (msgs[i].role === "assistant") { lastGM = msgs[i]; break; } }
  var gmText = api.isStreaming ? api.streamingContent : lastGM ? lastGM.content : "";
  var html = ""; try { html = api.renderMarkdown ? api.renderMarkdown(cleanGM(gmText)) : ""; } catch (e) { html = ""; }

  // ---- panels
  function panelBody() {
    switch (panel) {
      case "inventory": case "equipment": return <Win title={panel === "equipment" ? "Equipment" : "Inventory"} icon="Backpack" onClose={function () { setPanel(null); }}><div className="ePanelBody"><Inventory api={api} v={v} /></div></Win>;
      case "character": return <Win title="Character" icon="UserRound" onClose={function () { setPanel(null); }} tabs={[["sheet", "Sheet"], ["conditions", "Wounds & Conditions"], ["factions", "Factions"]]} tab={tab || "sheet"} setTab={setTab}><div className="ePanelBody">{(tab || "sheet") === "sheet" ? <Character api={api} v={v} /> : tab === "conditions" ? <Conditions v={v} /> : <Factions v={v} />}</div></Win>;
      case "skills": return <Win title="Skills" icon="Target" onClose={function () { setPanel(null); }}><div className="ePanelBody"><Skills v={v} /></div></Win>;
      case "techniques": return <Win title="Techniques" icon="Swords" onClose={function () { setPanel(null); }}><div className="ePanelBody"><Techniques v={v} calling={v["starting-calling"]} /><Training v={v} /></div></Win>;
      case "spells": return <Win title="Known Spells" icon="Sparkles" onClose={function () { setPanel(null); }}><div className="ePanelBody"><Magic v={v} /></div></Win>;
      case "callings": return <Win title="Callings" icon="Shield" onClose={function () { setPanel(null); }}><div className="ePanelBody"><Callings v={v} /></div></Win>;
      case "journal": return <Win title="Journal" icon="BookOpen" onClose={function () { setPanel(null); }} tabs={[["notes", "Field Journal"], ["chronicle", "Chronicle"], ["news", "News & Rumors"], ["events", "World Events"]]} tab={tab || "notes"} setTab={setTab}><div className="ePanelBody">{(tab || "notes") === "notes" ? <Journal v={v} api={api} /> : tab === "chronicle" ? <Chronicle v={v} /> : tab === "news" ? <NewsScreen v={v} /> : <LivingEvents v={v} />}</div></Win>;
      case "quests": return <Win title="Quests" icon="ScrollText" onClose={function () { setPanel(null); }} tabs={[["log", "Quest Log"], ["boards", "Notice Boards"], ["guild", "Guild"]]} tab={tab || "log"} setTab={setTab}><div className="ePanelBody">{(tab || "log") === "log" ? <Quests v={v} /> : tab === "boards" ? <QuestBoards v={v} api={api} /> : <Guild v={v} />}</div></Win>;
      case "party": return <Win title="Party & Companions" icon="Users" onClose={function () { setPanel(null); }}><div className="ePanelBody"><Party v={v} api={api} /></div></Win>;
      case "codex": return <Win title="Codex" icon="Library" onClose={function () { setPanel(null); }} tabs={[["codex", "Codex"], ["politics", "Courts & Crowns"], ["faiths", "Faiths"]]} tab={tab || "codex"} setTab={setTab}><div className="ePanelBody">{(tab || "codex") === "codex" ? <Codex v={v} /> : tab === "politics" ? <PoliticsScreen v={v} /> : <FaithsScreen v={v} />}</div></Win>;
      case "crafting": return <Win title="Crafting" icon="Hammer" onClose={function () { setPanel(null); }} tabs={[["craft", "Workshop"], ["markets", "Markets"], ["shops", "Merchants"]]} tab={tab || "craft"} setTab={setTab}><div className="ePanelBody">{(tab || "craft") === "craft" ? <Crafting v={v} /> : tab === "markets" ? <Markets v={v} /> : <Shops v={v} />}</div></Win>;
      case "bank": return <Win title="Bank" icon="Landmark" onClose={function () { setPanel(null); }}><div className="ePanelBody"><Banking v={v} /></div></Win>;
      case "guild": return <Win title="Adventurer's Guild" icon="Award" onClose={function () { setPanel(null); }}><div className="ePanelBody"><Guild v={v} /><Factions v={v} /></div></Win>;
      case "map": return <Win title="World Map" icon="Map" wide cls="eMapWin" onClose={function () { setPanel(null); }}><WorldMap v={v} snap={snap || {}} fog={gameRef.current ? gameRef.current.fog : null} fogVersion={snap ? snap.fogVersion : 0} onTravel={function (id) { var g = gameRef.current; if (!g) return; var r = g.travelTo(id); setPanel(null); if (r) sendToGM("I set out from " + r.from + " for " + r.to + " along the roads (about " + r.miles + " miles).", { npc: null }); }} /></Win>;
      case "chronicle": return <Win title="The Chronicle" icon="Feather" wide cls="eChronWin" onClose={function () { setPanel(null); }}><div className="eChron"><div className="eChronList"><MessageList /></div><Composer draft={draft} setDraft={setDraft} onSend={submitDraft} busy={api.isStreaming} placeholder="Tell the Game Master what you do…" /></div></Win>;
      case "settings": return <Win title="Settings" icon="Settings" onClose={function () { setPanel(null); }}><div className="ePanelBody"><Settings api={api} q={qKey} setQ={function (q) { setQKey(q); try { api.storage && api.storage.set && api.storage.set("eldoria3d-quality", q); } catch (e) { } }} prefs={prefs} onPref={props.onAudioPref} send={sendToGM} close={function () { setPanel(null); }} /></div></Win>;
      default: return null;
    }
  }

  var dlgOpen = dialog && dialog.open; var H = hud; var bt = s.battle; var touch = isTouch(); var g0 = gameRef.current;
  var heading = (s.heading || Math.PI) - Math.PI;
  return <div className={"eGame" + (s.hurt ? " hurt" : "") + (s.down ? " down" : "") + (touch ? " touch" : "") + (H.min ? " minimal" : "") + (bt ? " inBattle" : "")}>
    <div className="eView" ref={hostRef} />
    {status ? <div className="eLoading"><div className="eLogo big"><b>ELDORIA</b><small>FROM F-RANK TO LEGEND</small></div><p>{status}</p>{/could not/i.test(status) ? <button className="eBtn small" onClick={function () { setPanel("chronicle"); }}>Open the Chronicle</button> : <div className="eSpinner" />}</div> : null}
    {snap && snap.loading > 6 ? <div className="eStream">Charting the land… {snap.loading}</div> : null}

    {/* player frame: full, or compact (portrait + bars) */}
    <div className={"eFrame ePlayer" + (H.player && !H.min ? "" : " compact")}>
      <button className="ePortrait" onClick={function () { setPanel(panel === "character" ? null : "character"); setTab(null); }} aria-label="Character sheet">{portrait ? <img src={portrait} alt="" /> : <Icon n="User" s={40} />}</button>
      <div className="ePlayerInfo"><div className="ePName"><b>{v["player-name"] || "Adventurer"}</b><span>Lv. {v["player-level"] || 1}</span></div>
        <div className="eRank"><Icon n="Award" s={13} /> Guild Rank <b>{v["guild-rank"] || "Unregistered"}</b></div>
        <div className="eBars"><div><Icon n="Heart" s={13} c="ic-hp" /><Bar kind="hp" cur={s.hp} max={s.maxHp} /></div><div><Icon n="Droplet" s={13} c="ic-mp" /><Bar kind="mp" cur={s.mp} max={s.maxMp} /></div><div><Icon n="Zap" s={13} c="ic-sp" /><Bar kind="sp" cur={s.sp} max={s.maxSp} /></div></div>
        {s.pst && s.pst.length ? <div className="eConds">{s.pst.map(function (c, i) { return <span key={i}>{c}</span>; })}</div> : null}
      </div>
      {!H.min ? <Fold onClick={function () { tog("player"); }} icon={H.player ? "ChevronsLeft" : "ChevronsRight"} title={H.player ? "Compact frame" : "Full frame"} /> : null}
    </div>

    {/* menu */}
    {!H.min ? <button className={"eMenuToggle" + (H.menu ? " on" : "")} onClick={function () { tog("menu"); }} aria-label="Menu" title="Menu"><Icon n={H.menu ? "PanelLeftClose" : "Menu"} s={20} /></button> : null}
    {H.menu && !H.min ? <div className="eFrame eMenu" role="navigation" aria-label="Game menu">{MENU.map(function (m, i) { if (m[0] === "sep") return <div key={i} className="eSep" />; return <button key={m[0]} className={panel === m[0] ? "on" : ""} onClick={function () { setPanel(panel === m[0] ? null : m[0]); setTab(null); if (phoneNow()) tog("menu", 0); }}><Icon n={m[3]} s={18} /><span>{m[1]}</span><kbd>{m[2]}</kbd></button>; })}</div> : null}

    {/* party */}
    {(s.allies && s.allies.length) && !H.min ? (H.party ? <div className="eParty"><Fold onClick={function () { tog("party"); }} icon="X" title="Hide party" />{s.allies.slice(0, 4).map(function (p, i) { return <div key={i} className={"eFrame eMate" + (p.dead ? " dead" : "")}><div className="eMateP"><Icon n={p.dead ? "Skull" : "UserRound"} s={26} /></div><div><b>{p.name}</b><small>{p.dead ? "Fallen" : (p.cls || "") + (p.conds && p.conds.length ? " · " + p.conds.join(", ") : "")}</small><Bar kind="hp" cur={p.hp} max={p.maxHp} label="" />{p.maxMp > 0 ? <Bar kind="mp" cur={p.mp} max={p.maxMp} label="" /> : null}</div></div>; })}</div> : <Pill cls="ePartyPill" icon="Users" label={String(s.allies.length)} title="Show party" onClick={function () { tog("party"); }} />) : (partyList.length && !H.min ? (H.party ? <div className="eParty"><Fold onClick={function () { tog("party"); }} icon="X" title="Hide party" />{partyList.slice(0, 4).map(function (p, i) { return <div key={i} className="eFrame eMate"><div className="eMateP"><Icon n="UserRound" s={26} /></div><div><b>{p.name}</b><small>{p.level || p.lv ? "Lv. " + (p.level || p.lv) : (p.class || p.calling || p.role || "")}</small>{p.hp != null ? <Bar kind="hp" cur={p.hp} max={p.maxHp || p.hp} label="" /> : null}{p.mana != null ? <Bar kind="mp" cur={p.mana} max={p.maxMana || p.mana} label="" /> : null}</div></div>; })}</div> : <Pill cls="ePartyPill" icon="Users" label={String(partyList.length)} title="Show party" onClick={function () { tog("party"); }} />) : null)}

    {/* location + minimap */}
    {!H.min ? <div className={"eFrame eWhere" + (H.where ? "" : " noText") + (H.mini ? "" : " noMini")}>
      {H.where ? <div className="eWhereText"><h3>{s.location}</h3><small>{s.sub}</small>
        <div className="eTime"><b>{s.time}</b><span>{s.date}</span></div>
        <div className="eWx"><span><Icon n={seasonIcon(v.season)} s={14} /> {v.season}</span><span><Icon n={weatherIcon(v.weather)} s={14} /> {v.weather}</span><span><Icon n="Moon" s={14} /> {v["moon-phase"]}</span></div>
      </div> : null}
      {H.mini ? <div className="eMini" onClick={function () { setPanel("map"); }} title="Open the world map (M)"><canvas ref={miniRef} width={190} height={190} /><div className="eMiniRing" />{[["N", 0, -1], ["E", 1, 0], ["S", 0, 1], ["W", -1, 0]].map(function (c) { return <span key={c[0]} className={"eCard " + c[0]} style={ring(c[1], c[2])}>{c[0]}</span>; })}</div>
        : <button className="eCompass" onClick={function () { tog("mini"); }} title="Show minimap" aria-label="Show minimap"><span style={{ transform: "rotate(" + (-heading) + "rad)" }}><b>N</b><Icon n="Navigation2" s={18} /></span></button>}
      <div className="eWhereTools"><Fold onClick={function () { tog("where"); }} icon={H.where ? "ChevronsRight" : "Info"} title={H.where ? "Hide location details" : "Show location details"} />{H.mini ? <Fold onClick={function () { tog("mini"); }} icon="Minus" title="Hide minimap" /> : null}</div>
    </div> : null}

    {/* quests */}
    {!H.min ? (H.quests ? <div className="eFrame eQuests"><button className="eQHead" onClick={function () { tog("quests"); }}><Icon n="ScrollText" s={16} /><span>Current Quests</span><Icon n="ChevronUp" s={16} /></button>
      {quests.length ? quests.map(function (q, i) { var obj = q.objective || q.objectives || q.currentStep || q.notes || q.description || q.summary || ""; var objs = Array.isArray(obj) ? obj : [obj]; return <div key={i} className="eQ"><b><Icon n="Diamond" s={12} /> {q.title || q.name || q.id}</b>{objs.filter(Boolean).slice(0, 2).map(function (o, k) { return <p key={k}><i />{typeof o === "string" ? o : (o.text || o.title || JSON.stringify(o))}</p>; })}{q.rank || q.deadline || q.reward ? <small>{q.rank ? "Rank " + q.rank : ""}{q.deadline ? " · due " + q.deadline : ""}{q.reward ? " · " + q.reward : ""}</small> : null}</div>; }) : <p className="eQEmpty">No active quests. Notice boards and townsfolk have work for those who ask.</p>}
    </div> : <Pill cls="eQuestPill" icon="ScrollText" label={quests.length ? String(quests.length) : ""} title="Show quests" onClick={function () { tog("quests"); }} />) : <Pill cls="eShowHud" icon="Eye" label="HUD" title="Show the HUD (U)" onClick={function () { tog("min"); }} />}

    {/* turn order, banners */}
    {bt ? <Initiative b={bt} portrait={portrait} onPick={function (id) { var g = gameRef.current; if (g) { var m = g.monsters.find(function (x) { return x.id === id; }); if (m && !m.dead) g.target = m; } }} /> : null}
    {bt && bt.banner ? <div key={bt.banner.text + ":" + bt.round} className={"eBanner" + (bt.banner.mine ? " mine" : bt.banner.foe ? " foe" : "")}><b>{bt.banner.text}</b>{bt.banner.sub ? <small>{bt.banner.sub}</small> : null}</div> : null}
    {s.after ? <div key={"after" + s.after.text} className="eBanner after"><b>{s.after.text}</b></div> : null}

    {/* target */}
    {s.target && !bt ? <div className="eFrame eTarget"><div><b>{s.target.name}</b><small>Threat {s.target.threat} · {s.target.region} · Evasion {s.target.evasion} · DR {s.target.dr}{s.target.weakness ? " · Weak: " + s.target.weakness : ""}</small></div><Bar kind="hp" cur={s.target.hp} max={s.target.maxHp} /></div> : null}
    <HoverTip h={s.hover} battle={!!bt} />

    {/* combat log */}
    {!H.min ? (H.log ? (s.log && s.log.length ? <div className={"eLog" + (s.combat ? " on" : "")}><Fold onClick={function () { tog("log"); }} icon="X" title="Hide the combat log" />{s.log.slice(-5).map(function (l, i) { return <div key={l.t + "" + i} className={"eLogL " + l.kind}>{l.line}</div>; })}</div> : null) : <Pill cls="eLogPill" icon="ScrollText" label="Log" title="Show the combat log" onClick={function () { tog("log"); }} />) : null}

    {/* interaction prompt */}
    {s.interact && !menu && !dlgOpen ? <button className="ePrompt" onClick={function () { gameRef.current && gameRef.current.doInteract(); }}><kbd>E</kbd>{s.interact}</button> : null}

    {/* NPC interaction menu */}
    {menu ? <div className="eFrame eNpcMenu">
      <div className="eNpcHead">{menu.portrait ? <img src={menu.portrait} alt="" /> : <Icon n="UserRound" s={30} />}<div><b>{menu.name}</b><small>{menu.title}</small></div></div>
      {inspect ? <div className="eInspect"><p>{menu.desc || "A local of " + (s.location || "these parts") + "."}</p>{menu.record ? <p className="muted">{["disposition", "attitude", "relationship", "notes"].map(function (k) { return menu.record[k] ? titleCase(k) + ": " + String(menu.record[k]) : null; }).filter(Boolean).join(" · ")}</p> : <p className="muted">You have no recorded history with them.</p>}<button className="eMenuItem" onClick={function () { setInspect(false); }}><Icon n="ArrowLeft" s={16} />Back</button></div> :
        <div>{[["talk", "Talk", "MessageCircle", "E"], ["trade", "Trade", "Coins"], ["quest", "Accept Quest", "ScrollText"]].concat(menu.trainer ? [["train", "Train", "GraduationCap"]] : []).concat([["inspect", "Inspect", "Search"], ["goodbye", "Goodbye", "ArrowLeft"]]).map(function (o, i) { return <button key={o[0]} className={"eMenuItem" + (i === 0 ? " first" : "") + (o[0] === "goodbye" ? " dim" : "")} onClick={function () { menuAct(o[0], menu); }}>{o[3] ? <kbd>{o[3]}</kbd> : <Icon n={o[2]} s={16} />}<span>{o[1]}</span></button>; })}</div>}
    </div> : null}

    {/* dialogue / chronicle box */}
    {dlgOpen ? <div className="eFrame eDialog">
      <div className="eDlgHead">{dialog.npc && dialog.npc.portrait ? <img src={dialog.npc.portrait} alt="" /> : <Icon n="Feather" s={22} />}<div><b>{dialog.npc ? dialog.npc.name : "The Chronicle"}</b><small>{dialog.npc ? dialog.npc.title : "Game Master"}</small></div><button className="eLink" onClick={function () { setPanel("chronicle"); }}><Icon n="ScrollText" s={15} /> <span>Full chronicle</span></button><button className="eX" onClick={closeDialog} aria-label="Close"><Icon n="X" s={18} /></button></div>
      <div className="eDlgText" ref={function (el) { if (el) el.scrollTop = el.scrollHeight; }}>{api.isStreaming && !gmText ? <p className="muted">The Game Master considers…</p> : html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <p className="muted">{dialog.npc ? "What do you say to " + dialog.npc.name + "?" : "Tell the Game Master what you do."}</p>}{api.error ? <p className="eErr">{String(api.error)}</p> : null}</div>
      {safeArr(api.pendingChoices).length && !api.isStreaming ? <div className="eChips">{safeArr(api.pendingChoices).slice(0, 4).map(function (c, i) { return <button key={i} onClick={function () { api.clearPendingChoices && api.clearPendingChoices(); sendToGM(c, { npc: dialog.npc || null }); }}>{c}</button>; })}</div> : null}
      {dialog.npc && !html ? <div className="eChips">{["Greet them politely.", "Ask what news they've heard.", "Ask about the Adventurer's Guild."].map(function (c) { return <button key={c} onClick={function () { sendToGM("(Speaking to " + dialog.npc.name + ") " + c, { npc: dialog.npc }); }}>{c}</button>; })}</div> : null}
      <Composer draft={draft} setDraft={setDraft} onSend={submitDraft} busy={api.isStreaming} autoFocus={dialog.focus} placeholder={dialog.npc ? "Say something to " + dialog.npc.name + "…" : "What do you do?"} onStop={function () { api.stopGeneration && api.stopGeneration(); }} />
    </div> : (bt ? null : <button className="eTalkBtn" onClick={function () { setDialog({ open: true, npc: null, focus: Date.now() }); }} title="Speak or act (Enter)"><Icon n="Feather" s={18} /><span>Chronicle</span>{api.isStreaming ? <i className="eDot" /> : null}</button>)}

    {/* aiming a spell */}
    {s.tgt ? <TargetBar t={s.tgt} g={gameRef} battle={!!bt} /> : null}
    {tray ? <Tray kind={tray} g={gameRef} close={function () { setTray(null); }} refresh={snap} /> : null}

    {/* hotbar, with the turn economy above it in combat */}
    <div className="eHotbar">
      {bt ? <Economy b={bt} g={gameRef} /> : null}
      {s.res ? <div className="eRes">{s.res.name}{Array.from({ length: s.res.max }).map(function (_, i) { return <i key={i} className={i < s.res.val ? "on" : ""} />; })}</div> : null}
      <div className="eSlots">{(s.hotbar || []).map(function (sl, i) { var key = i === 9 ? "0" : String(i + 1); if (!sl) return <div key={i} className="eSlot empty"><kbd>{key}</kbd></div>; var ic = SLOT_ICON[sl.icon] || ["Circle", "steel"]; return <button key={i} className={"eSlot " + ic[1] + (sl.disabled ? " off" : "") + (sl.kind === "endturn" ? " end" : "")} title={sl.label + (sl.desc ? " — " + sl.desc : "") + (sl.mp ? " (" + sl.mp + " MP)" : "")} aria-label={sl.label} {...tapOn(function () { gameRef.current && gameRef.current.useSlot(i); })}><Icon n={ic[0]} s={26} />{sl.cost ? <i className={"eCost " + sl.cost} /> : null}{sl.count != null ? <em>{sl.count}</em> : null}{sl.cd > 0 && !bt ? <div className="eCd" style={{ height: Math.min(100, sl.cd / 2 * 100) + "%" }} /> : null}<kbd>{key}</kbd></button>; })}</div>
    </div>
    <div className="eTrayBtns"><button className={"eRound" + (tray === "spells" ? " on" : "")} title="Spellbook (R)" aria-label="Spellbook" onClick={function () { setTray(tray === "spells" ? null : "spells"); }}><Icon n="BookMarked" s={20} /></button><button className={"eRound" + (tray === "items" ? " on" : "")} title="Items (V)" aria-label="Items" onClick={function () { setTray(tray === "items" ? null : "items"); }}><Icon n="FlaskConical" s={20} /></button></div>
    {bt ? <button className={"eEndTurn" + (bt.mine ? "" : " off")} onClick={function () { var g = gameRef.current; if (g) g.useSlot(9); }} title="End your turn (Space)" aria-label="End turn"><Icon n="Hourglass" s={24} /><span>End Turn</span></button> : null}

    {/* currency, weight, quick buttons */}
    {!H.min ? (H.wallet ? <div className="eFrame eWallet"><span><Icon n="Coins" s={16} c="ic-gold" /> <b>{cp.gp}</b>g <b>{cp.sp}</b>s <b>{cp.cp}</b>c</span><span><Icon n="Weight" s={16} /> {wt.toFixed(1)} / {cap}</span><Fold onClick={function () { tog("wallet"); }} icon="X" title="Hide purse" /></div> : null) : null}
    {!H.min ? <div className={"eQuick" + (H.quick ? "" : " folded")}>{H.quick ? [["character", "UserRound", "Character"], ["guild", "Award", "Guild"], ["chronicle", "BookOpen", "Chronicle"], ["party", "Users", "Party"], ["quests", "ScrollText", "Quests"], ["map", "Compass", "World Map"], ["settings", "Settings", "Settings"]].map(function (b) { return <button key={b[0]} className={"eRound" + (panel === b[0] ? " on" : "")} title={b[2]} aria-label={b[2]} onClick={function () { setPanel(panel === b[0] ? null : b[0]); setTab(null); }}><Icon n={b[1]} s={22} /></button>; }).concat(H.wallet ? [] : [<button key="wallet" className="eRound" title="Show purse" aria-label="Show purse" onClick={function () { tog("wallet"); }}><Icon n="Coins" s={20} /></button>]).concat([<button key="min" className="eRound" title="Hide the HUD (U)" aria-label="Hide the HUD" onClick={function () { tog("min"); }}><Icon n="EyeOff" s={20} /></button>, <button key="fold" className="eRound fold" title="Fold these buttons" aria-label="Fold buttons" onClick={function () { tog("quick"); }}><Icon n="ChevronsRight" s={20} /></button>])
      : [<button key="map" className="eRound" title="World Map" aria-label="World Map" onClick={function () { setPanel(panel === "map" ? null : "map"); }}><Icon n="Compass" s={22} /></button>, <button key="unfold" className="eRound" title="More" aria-label="More buttons" onClick={function () { tog("quick"); }}><Icon n="LayoutGrid" s={20} /></button>]}</div> : null}

    {/* touch controls */}
    {touch ? <TouchControls game={gameRef} battle={bt} tray={tray} openTray={function (k) { setTray(tray === k ? null : k); }} talk={function () { setDialog({ open: true, npc: null, focus: Date.now() }); }} streaming={api.isStreaming} /> : null}
    {s.down ? <div className="eDown"><h2>You have fallen</h2><p>The Game Master is resolving what happens next — consciousness, rescue or death — under the world's combat rules.</p></div> : null}
    {panelBody()}
  </div>;
}

var HUD_DEFAULT = { player: 1, menu: 1, where: 1, mini: 1, quests: 1, party: 1, log: 1, wallet: 1, quick: 1, min: 0 };
function phoneNow() { return window.innerWidth <= 700 || window.innerHeight <= 500; }
function hudKey() { return "eldoria3d-hud-" + (phoneNow() ? "phone" : "wide"); }
function hudDefaults() { var h = Object.assign({}, HUD_DEFAULT); if (phoneNow()) Object.assign(h, { menu: 0, where: 0, quests: 0, party: 0, log: 0, wallet: 0, quick: 0 }); else if (window.innerWidth <= 1100 || window.innerHeight <= 700) Object.assign(h, { menu: 0, wallet: 0 }); if (isTouch() && !phoneNow()) h.menu = 0; return h; }
function Fold(p) { return <button className="eFold" onClick={function (e) { e.stopPropagation(); p.onClick(); }} title={p.title} aria-label={p.title}><Icon n={p.icon || "Minus"} s={13} /></button>; }
function Pill(p) { return <button className={"ePill " + (p.cls || "")} onClick={p.onClick} title={p.title} aria-label={p.title}><Icon n={p.icon} s={16} />{p.label ? <span>{p.label}</span> : null}</button>; }
var ARCH_ICON = { canine: "Dog", beast: "PawPrint", winged: "Bird", serpent: "Waves", bug: "Bug", wisp: "Sparkles", humanoid: "Skull", brute: "Skull" };
function Initiative(p) {
  var b = p.b;
  return <div className="eInit"><div className="eRoundNo"><small>Round</small><b>{b.round}</b></div><div className="eInitRow">{b.order.map(function (c) { var pct = c.maxHp ? Math.max(0, Math.min(100, c.hp / c.maxHp * 100)) : 0; return <button key={c.id} className={"eChip " + c.kind + (c.active ? " on" : "") + (c.dead ? " dead" : "") + (c.target ? " tgt" : "")} title={c.name + " — initiative " + c.init + " · " + c.hp + "/" + c.maxHp + " HP"} onClick={function () { if (c.kind !== "player") p.onPick(c.id); }}>
    <div className="eChipP">{c.kind === "player" ? (p.portrait ? <img src={p.portrait} alt="" /> : <Icon n="User" s={22} />) : <Icon n={ARCH_ICON[c.arch] || "Skull"} s={22} />}{c.dead ? <div className="eChipX"><Icon n="X" s={26} /></div> : null}</div>
    <div className="eChipHp"><i style={{ width: pct + "%" }} /></div><span>{c.kind === "player" ? "You" : c.name}</span></button>; })}</div></div>;
}
function Economy(p) {
  var b = p.b, e = b.econ; var act = b.order.find(function (c) { return c.active; });
  if (!b.myTurn) return <div className="eEcon wait"><Icon n="Hourglass" s={14} /><span>{act ? (act.kind === "player" ? "Your turn" : act.name + "'s turn") : "Next turn…"}</span></div>;
  var pct = e.moveMax ? Math.max(0, Math.min(100, e.move / e.moveMax * 100)) : 0;
  return <div className="eEcon"><span className={"ePip act" + (e.action ? " on" : "")} title="Action — attack, cast, Dash, Dodge"><i />Action</span><span className={"ePip bon" + (e.bonus ? " on" : "")} title="Bonus Action — potions and quick techniques"><i />Bonus</span><span className={"ePip rea" + (e.reaction ? " on" : "")} title="Reaction — opportunity attacks and shield blocks"><i />Reaction</span><button className={"eAuto" + (b.autoReact ? " on" : "")} title="Spend Reactions automatically (block, Mage Ward, Mana Shield)" onClick={function () { var g = p.g.current; if (g) g.autoReact = !g.autoReact; }}>Auto-react</button><span className="eMove" title="Movement left this turn"><Icon n="Footprints" s={14} /><span className="eMoveBar"><i style={{ width: pct + "%" }} /></span><b>{e.move.toFixed(1)} m</b></span></div>;
}
function HoverTip(p) {
  var h = p.h; if (!h || h.sx < -100) return null; var W = window.innerWidth, Hh = window.innerHeight;
  var st = { left: Math.max(6, Math.min(W - 236, h.sx + (h.touch ? -110 : 18))), top: Math.max(6, Math.min(Hh - 140, h.sy + (h.touch ? -118 : 12))) };
  if (h.kind === "ground") return <div className="eTip small" style={st}><span className={h.ok ? "ok" : "bad"}>{h.ok ? "Move " + h.dist.toFixed(1) + " m" : "Too far — " + h.dist.toFixed(1) + " m (" + h.left.toFixed(1) + " m left)"}</span>{h.touch ? <small>Tap again to move{h.ok ? "" : " as far as you can"}</small> : null}</div>;
  var cls = h.chance >= 65 ? "good" : h.chance >= 40 ? "mid" : "bad";
  return <div className="eTip" style={st}><b>{h.name}</b><small>Threat {h.threat} · {h.hp}/{h.maxHp} HP</small>
    <div className="eTipRow"><span className={"eHit " + cls}>{h.chance}%</span><span>to hit · {h.dice} <em>({h.lo}–{h.hi})</em></span></div>
    {h.air ? <div className="eTipNote bad">Airborne: −3 to melee attacks</div> : null}{h.st && h.st.length ? <div className="eTipNote">{h.st.join(" · ")}</div> : null}{!h.ranged && h.approach > 0 ? <div className={"eTipNote" + (h.canReach ? "" : " bad")}>{h.canReach ? "Moves " + h.approach.toFixed(1) + " m, then attacks" : "Out of reach — " + h.approach.toFixed(1) + " m to close"}</div> : null}
    {h.ranged && !h.inReach ? <div className="eTipNote bad">Out of range</div> : null}
    <small className="eTipHint">{p.battle ? (h.my ? (h.touch ? "Tap again to attack" : "Click to attack") : "Not your turn") : (h.touch ? "Tap again to attack" : "Click again to attack")}</small></div>;
}

function Composer(p) {
  var R = React; var ref = R.useRef(null);
  R.useEffect(function () { if (p.autoFocus && ref.current) ref.current.focus(); }, [p.autoFocus]);
  return <form className="eCompose" onSubmit={function (e) { e.preventDefault(); p.onSend(); }}>
    <textarea ref={ref} rows={2} value={p.draft} placeholder={p.placeholder} onChange={function (e) { p.setDraft(e.target.value); }} onKeyDown={function (e) { e.stopPropagation(); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); p.onSend(); } if (e.key === "Escape") e.currentTarget.blur(); }} />
    {p.busy ? <button type="button" className="eBtn small" onClick={p.onStop}><Icon n="Square" s={14} /> Stop</button> : <button type="submit" className="eBtn small" disabled={!p.draft.trim()}><Icon n="Send" s={14} /> Send</button>}
  </form>;
}

function Techniques(p) {
  var v = p.v; var kit = CALLING_KIT[p.calling] || { tech: [] }; var t = safeObj(v.techniques); var keys = Object.keys(t);
  return <div className="screen"><section className="card"><div className="cardTitle"><b>{p.calling} — Calling Mechanics</b></div>{kit.res ? <p>Resource: <b>{kit.res}</b> (max {kit.max}). Builds in real-time combat and clears when the fight ends.</p> : null}{(kit.tech || []).map(function (x) { return <div key={x.id} className="item"><div><b>{x.name}</b><small>{x.desc}{x.sp ? " · " + x.sp + " SP" : ""}{x.cost ? " · " + x.cost + " " + kit.res : ""}</small></div></div>; })}<p className="muted">Hotbar slots 2–3. These come from your calling's entry; new techniques are invented through practice and recorded by the Game Master.</p></section>
    <section className="card"><div className="cardTitle"><b>Learned Techniques</b></div>{keys.length ? keys.map(function (k) { var x = t[k] || {}; return <div key={k} className="item"><div><b>{x.name || titleCase(k)}</b><small>{x.skill || x.category || ""}{x.level ? " · Lv " + x.level : ""}{x.cost ? " · " + x.cost : ""}</small></div></div>; }) : <div className="empty">No techniques yet. Practice, train with a real teacher, or invent one in play.</div>}</section></div>;
}

function Settings(p) {
  var api = p.api; var [ts, setTs] = React.useState(false);
  return <div className="screen">
    <section className="card"><div className="cardTitle"><b>Graphics</b></div><div className="eSeg">{Object.keys(QUALITY).map(function (k) { return <button key={k} className={p.q === k ? "on" : ""} onClick={function () { p.setQ(k); }}>{QUALITY[k].name}</button>; })}</div><p className="muted">Low suits phones and older laptops: no shadows, shorter view distance.</p></section>
    <section className="card"><div className="cardTitle"><b>Game Master</b></div><div className="eBtnRow">
      <button className="eBtn small" onClick={function () { api.sendMessage("[sync]"); p.close(); }}><Icon n="RefreshCw" s={14} /> Sync state</button>
      <button className="eBtn small" onClick={function () { api.sendMessage("[status]"); p.close(); }}><Icon n="Activity" s={14} /> Status</button>
      <button className="eBtn small" onClick={function () { p.send("I find a safe place, make camp and rest for the night."); p.close(); }}><Icon n="Tent" s={14} /> Make camp & rest</button>
      <button className="eBtn small" onClick={function () { setTs(!ts); }}><Icon n="FastForward" s={14} /> Advance time…</button></div>
      {ts ? <div className="eBtnRow">{["1 week", "1 month", "1 year"].map(function (x) { return <button key={x} className="eBtn small" onClick={function () { api.sendMessage("[timeskip: " + x + "]"); p.close(); }}>{x}</button>; })}</div> : null}
      <p className="muted">Resting, healing, shopping and anything social are narrated by the Game Master. Exploring runs in real time; fights are turn-based — each round is six seconds of world time.</p></section>
    <section className="card"><div className="cardTitle"><b>Sound</b></div><AudioSettings prefs={p.prefs} onChange={p.onPref} /></section>
    <section className="card"><div className="cardTitle"><b>Controls</b></div><div className="eKeys">{[["W A S D", "Move"], ["Click ground", "Walk there (in combat: within your movement)"], ["Click enemy", "Select; click again to attack (in combat: attack)"], ["Shift", "Run (uses stamina)"], ["Space", "Jump · End Turn in combat"], ["Drag / pinch", "Turn / zoom the camera"], ["Tab", "Cycle targets"], ["1 – 0", "Hotbar"], ["E", "Interact / harvest / talk"], ["Enter", "Speak to the Game Master"], ["I K P T L C J Q O N H B M", "Menus"], ["U", "Hide or show the HUD"], ["Esc", "Close"]].map(function (k) { return <div key={k[0]}><kbd>{k[0]}</kbd><span>{k[1]}</span></div>; })}</div></section>
  </div>;
}

// Action buttons fire on touch-down, not on click: a browser does not synthesise a click for a tap made while another finger is
// already down (the stick), so onClick alone makes buttons dead while moving. The click that follows a single touch is ignored.
var tapAt = 0;
function swallowGhostClick() {
  // the click a touch produces lands wherever the finger is when it lifts - possibly on something the tap just opened
  var h = function (ev) { ev.stopPropagation(); ev.preventDefault(); window.removeEventListener("click", h, true); };
  window.addEventListener("click", h, true); setTimeout(function () { window.removeEventListener("click", h, true); }, 700);
}
function tapOn(fn) {
  return {
    onPointerDown: function (e) { if (e.pointerType === "touch" || e.pointerType === "pen") { tapAt = Date.now(); swallowGhostClick(); fn(e); } },
    onClick: function (e) { if (Date.now() - tapAt < 800) return; /* the click that follows a touch we already handled */ fn(e); }
  };
}
function TouchControls(p) {
  var R = React; var base = R.useRef(null); var [knob, setKnob] = R.useState({ x: 0, y: 0 }); var act = R.useRef(null); var bt = p.battle;
  function upd(e) { var b = base.current.getBoundingClientRect(); var cx = b.left + b.width / 2, cy = b.top + b.height / 2; var dx = (e.clientX - cx) / (b.width / 2), dy = (e.clientY - cy) / (b.height / 2); var l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } setKnob({ x: dx, y: dy }); var g = p.game.current; if (g) { g.setMove(dx, -dy); g.move.run = l > 0.95; } }
  function end() { setKnob({ x: 0, y: 0 }); var g = p.game.current; if (g) g.setMove(0, 0); act.current = null; }
  function G() { return p.game.current; }
  return <div className="eTouch">
    <div className="eStick" ref={base} onPointerDown={function (e) { act.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); upd(e); }} onPointerMove={function (e) { if (act.current === e.pointerId) upd(e); }} onPointerUp={end} onPointerCancel={end}><div className="eKnob" style={{ transform: "translate(" + knob.x * 34 + "px," + knob.y * 34 + "px)" }} /></div>
    {bt ? <div className="eActs battle"><button {...tapOn(function () { G() && G().useSlot(0); })} aria-label="Attack"><Icon n="Sword" s={26} /></button><button {...tapOn(function () { G() && G().cycleTarget(); })} aria-label="Next target"><Icon n="Crosshair" s={22} /></button><button className={p.tray === "spells" ? "on" : ""} {...tapOn(function () { p.openTray("spells"); })} aria-label="Spellbook"><Icon n="BookMarked" s={22} /></button><button className={p.tray === "items" ? "on" : ""} {...tapOn(function () { p.openTray("items"); })} aria-label="Items"><Icon n="FlaskConical" s={22} /></button><button className={"end" + (bt.mine ? "" : " off")} {...tapOn(function () { G() && G().useSlot(9); })} aria-label="End turn"><Icon n="Hourglass" s={22} /></button></div>
      : <div className="eActs"><button {...tapOn(function () { G() && G().useSlot(0); })} aria-label="Attack"><Icon n="Sword" s={26} /></button><button {...tapOn(function () { G() && G().doInteract(); })} aria-label="Interact"><Icon n="Hand" s={22} /></button><button {...tapOn(function () { G() && G().jump(); })} aria-label="Jump"><Icon n="ArrowUp" s={22} /></button><button {...tapOn(function () { G() && G().dodge(); })} aria-label="Dodge"><Icon n="Wind" s={22} /></button><button {...tapOn(function () { p.openTray("spells"); })} aria-label="Spellbook"><Icon n="BookMarked" s={22} /></button><button className="talk" {...tapOn(p.talk)} aria-label="Speak to the Game Master"><Icon n="Feather" s={20} />{p.streaming ? <i className="eDot" /> : null}</button></div>}
  </div>;
}

function TargetBar(p) {
  var t = p.t; var g = p.g;
  var tip = t.sx > -100 && t.list && t.list.length ? <div className="eTip spell" style={{ left: Math.max(6, Math.min(window.innerWidth - 246, t.sx + (t.touch ? -110 : 16))), top: Math.max(6, Math.min(window.innerHeight - 180, t.sy + (t.touch ? -130 : 10))) }}>{t.list.slice(0, 6).map(function (o, i) { return <div key={i} className={"eTipRow2 " + o.side}><b>{o.name}</b><span>{o.heal ? "heals " + o.heal : o.chance != null ? (o.resist ? o.chance + "% to take hold" : o.chance + "% · " + o.dice + (o.brace ? " (half if it braces)" : "")) : ""}</span></div>; })}{t.list.length > 6 ? <small>+{t.list.length - 6} more</small> : null}{!t.ok && t.why ? <div className="eTipNote bad">{t.why}</div> : null}</div> : null;
  var needCast = t.touch || t.tgt === "self" || t.tgt === "touch";
  var hint = t.ok || !t.why ? (t.tgt === "foe" ? "Choose an enemy" : t.tgt === "touch" ? "Choose yourself or an ally" : t.tgt === "dir" ? "Choose a direction" : t.tgt === "point" ? "Choose a place" : "Confirm") : t.why;
  return <div><div className="eFrame eTargetBar"><div className="eTBHead"><Icon n="Sparkles" s={16} /><b>{t.name}</b><span>{t.mp} MP · {t.label}{t.range ? " · " + t.range + " m" : ""}{t.area ? " · area " + t.area + " m" : ""}</span></div>
    <p className={t.ok || !t.why ? "" : "bad"}>{hint}{t.touch && t.ok ? " — tap again to cast" : ""}</p>
    {t.choose ? <div className="eChoose">{t.choose.map(function (c) { return <button key={c} className={t.choice === c ? "on" : ""} onClick={function () { var G = g.current; if (G && G.tgt) G.tgt.choice = c; }}>{c}</button>; })}</div> : null}
    <div className="eTBBtns">{needCast ? <button className="eBtn small" onClick={function () { var G = g.current; if (!G) return; if (G.tgt && (t.tgt === "touch" || t.tgt === "self") && !G.tgt.aim) G.tgt.aim = { e: G.pe }; SC_confirm(G); }}><Icon n={t.tgt === "touch" ? "User" : "Check"} s={14} /> {t.tgt === "touch" && !t.touch ? "Self" : "Cast"}</button> : null}<button className="eBtn small alt" onClick={function () { var G = g.current; if (G) G.cancelTarget(); }}><Icon n="X" s={14} /> Cancel</button></div></div>{tip}</div>;
}
function SC_confirm(G) { if (G.confirmTarget) G.confirmTarget(); }
function Tray(p) {
  var G = p.g.current; if (!G) return null; var spells = p.kind === "spells"; var rows = spells ? G.listSpells() : G.listItems(); var groups = {};
  return <div className="eFrame eTray" role="dialog" aria-label={spells ? "Spellbook" : "Items"}><div className="eTrayHead"><Icon n={spells ? "BookMarked" : "FlaskConical"} s={18} /><b>{spells ? "Spellbook" : "Items"}</b><small>{spells ? "Only spells you have learned appear here" : "Potions, food, thrown flasks and weapons in your pack"}</small><button className="eX" onClick={p.close} aria-label="Close"><Icon n="X" s={18} /></button></div>
    <div className="eTrayList">{rows.length ? rows.map(function (r) { return <button key={r.id} className={"eTrayRow" + (r.ok ? "" : " off")} title={r.ok ? "" : r.why} onClick={function () { if (!r.ok) { G.toast(r.why || "Cannot use that now.", "info"); return; } if (spells) G.useSpellById(r.id); else G.useItemById(r.id); p.close(); }}>
      <div className="eTrayMain"><b>{r.name}</b>{spells ? <small>{r.school} · Tier {r.tier}{r.dice ? " · " + r.dice + (r.element ? " " + r.element : "") : ""}</small> : <small>{r.desc}</small>}</div>
      <div className="eTrayMeta">{spells ? <span className="mp">{r.mp} MP</span> : (r.qty > 1 ? <span>×{r.qty}</span> : null)}<span className={"cost " + (spells ? (/Reaction/.test(r.label) ? "reaction" : /Action \+/.test(r.label) || /Whole/.test(r.label) ? "action" : /Out of/.test(r.label) ? "none" : "action") : r.cost)}>{spells ? r.label : r.label + " · " + (r.cost === "action" ? "Action" : "Bonus")}</span>{spells && r.range ? <span>{r.range} m</span> : null}{r.why && !r.ok ? <em>{r.why}</em> : null}</div></button>; }) : <p className="muted">{spells ? "You have not learned any spells yet." : "Nothing in your pack can be used in a fight."}</p>}</div></div>;
}
