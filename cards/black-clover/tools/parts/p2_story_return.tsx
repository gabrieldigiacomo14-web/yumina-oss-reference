  var eds = React.useState(null); var editing = eds[0], setEditing = eds[1];
  var ms0 = arr(api.messages); var lastAi = null;
  for (var mi = ms0.length - 1; mi >= 0; mi--) { if (ms0[mi] && ms0[mi].role === "assistant" && ms0[mi].status !== "failed") { lastAi = ms0[mi]; break; } }
  function toast(m, t) { if (typeof api.showToast === "function") api.showToast(m, t || "info"); }
  function copyLast() {
    var t = cleanPassage(proseOf(lastAi && lastAi.content)); if (!t) return;
    try { if (typeof api.copyToClipboard === "function") api.copyToClipboard(t); else navigator.clipboard.writeText(t); toast("Passage copied.", "success"); } catch (e) { toast("Couldn't copy that passage.", "error"); }
  }
  function regen() { if (lastAi && typeof api.regenerateMessage === "function") api.regenerateMessage(lastAi.id); }
  function saveLast() {
    var t = cleanPassage(proseOf(lastAi && lastAi.content)); if (!t) return;
    savePassage(api, { id: str(lastAi.id) || String(Date.now()), date: str(v.world_date), place: loc.place || loc.settlement, text: t.slice(0, 1200) }, function (ok, dup) { toast(dup ? "Already in your journal." : ok ? "Saved to your journal." : "Couldn't save to the journal.", ok || dup ? "success" : "error"); });
  }
  function eatSomething() {
    var food = physInv.filter(function (it) { return bcCanConsume(it) && bcIsAccessible(it, physInv, false); })[0];
    if (!food || !canWrite(api)) { act("Eat something."); return; }
    var r = bcConsume(physInv, food.id, v);
    if (!r.ok) { act("Eat something."); return; }
    var appearance = bcAppearance(r.inventory, v);
    var patch = Object.assign({ inventory: r.inventory, appearance_state: appearance, carry_state: bcCarryProfile(r.inventory, obj(v.body_profile), bcWalletProfile(v.money).weightKg), stamina: clamp(num(v.stamina, 0) + 6, 0, 100) }, bcClockForInventory(v, 15));
    bcPatch(api, patch, function (ok) { toast(ok ? "You eat the " + str(food.name).toLowerCase() + ". (free, no AI turn)" : "Couldn't save that.", ok ? "success" : "error"); });
  }
  function cardAction(c) {
    if (c === "Rest for a while") { setSheet(sheet === "rest" ? "" : "rest"); return; }
    if (/^train/i.test(c) && p.go) { p.go("train"); return; }
    if (c === "Eat something") { eatSomething(); return; }
    act(c + ".");
  }
  if (sheet === "actions") {
    var moreActs = chips.slice(4);
    sheetBody = (
      <div className="bc-actsheet">
        <div className="bc-actsheet-grid">
          <button type="button" className="bc-actbtn" disabled={busy} onClick={function () { setSheet("cast"); }}><Icon n="star" s={20} />Cast magic</button>
          <button type="button" className="bc-actbtn" disabled={busy} onClick={function () { setSheet("item"); }}><Icon n="pack" s={20} />Use an item</button>
          <button type="button" className="bc-actbtn" disabled={busy} onClick={function () { setSheet("rest"); }}><Icon n="bed" s={20} />Rest or sleep</button>
          <button type="button" className="bc-actbtn" onClick={function () { setSheet(""); p.go && p.go("train"); }}><Icon n="dumbbell" s={20} />Training</button>
          <button type="button" className="bc-actbtn" onClick={function () { setSheet(""); p.go && p.go("map"); }}><Icon n="map" s={20} />Travel</button>
          <button type="button" className="bc-actbtn" onClick={function () { setSheet(""); p.go && p.go("time"); }}><Icon n="hourglass" s={20} />Let time pass</button>
          {p.openBattle ? <button type="button" className="bc-actbtn" disabled={busy} onClick={function () { p.openBattle("spar"); }}><Icon n="sword" s={20} />Spar (practice)</button> : null}
        </div>
        {moreActs.length ? <div className="bc-actsheet-more">{moreActs.map(function (c) { return <Chip key={c} disabled={busy} onClick={function () { act(c + "."); }}>{c}</Chip>; })}</div> : null}
        <div className="bc-note">Cards and chips send the action as your message. Training, travel and time open their own planners.</div>
      </div>
    );
  }
  if (editing) {
    sheetBody = null;
  }
  var cp0 = obj(v.creation_profile);
  var kingdom0 = kingdomLabel(loc.kingdom || cp0.homeland) || "Clover Kingdom";
  var night = isNight(v.world_time);
  var tod = (function () { var m = str(v.world_time).match(/^(\d{1,2})/); var h = m ? parseInt(m[1], 10) : 9; return h < 5 ? "Night" : h < 11 ? "Morning" : h < 14 ? "Midday" : h < 18 ? "Afternoon" : h < 21 ? "Evening" : "Night"; })();
  var chapter = loc.place || loc.settlement || "The First Page";
  var chapterSub = loc.place && loc.settlement ? loc.settlement + " · " + dayMonthWD(v.world_date) : (dayMonthWD(v.world_date) || "Where your story begins.");
  var cards = chips.slice(0, 4); var extra = chips.slice(4);
  return (
    <div className="bc-fill bc-story">
      <Hero bannerUrl={p.bannerUrl} cls="bc-hero-story" onBack={p.onBack} kingdom={kingdom0}>
        <div className="bc-hero-chapter"><Icon n="book" s={30} /><div><strong>{chapter}</strong><small>{chapterSub}</small></div></div>
      </Hero>
      <div className="bc-statstrip" role="group" aria-label="Your condition">
        {[["heart", "Body", v.vitality, w(v.vitality, condWord(v.vitality)), "hp"], ["drop", "Mana", v.mana, w(v.mana, levelWord(v.mana)), "mp"], ["run", "Stamina", v.stamina, w(v.stamina, levelWord(v.stamina)), "st"], ["moon", "Fatigue", v.fatigue, w(v.fatigue, fatWord(v.fatigue)), "ft"]].map(function (s) {
          return (
            <button type="button" key={s[1]} className={"bc-statcell bc-statcell-" + s[4] + (hudLow(s[4], s[2]) ? " bc-crit" : "")} aria-label={s[1] + ": " + s[3] + ". Open character"} onClick={function () { p.go && p.go("character"); }}>
              <Icon n={s[0]} s={17} />
              <div className="bc-statcell-body"><span>{s[1]}</span><div className="bc-statbar"><i style={{ width: clamp(num(s[2], 0), 0, 100) + "%" }} /></div><small>{s[3]}</small></div>
            </button>
          );
        })}
        <button type="button" className="bc-statcell bc-statcell-sky" aria-label={tod + ", " + clock12(v.world_time) + ", " + str(v.weather) + ". Let time pass"} onClick={function () { p.go && p.go("time"); }}><Icon n={night ? "moon" : "sun"} s={18} /><div className="bc-statcell-body"><span>{tod}</span><small>{str(v.weather).split(",")[0] || clock12(v.world_time)}</small></div></button>
      </div>
      {ups.length ? (
        <button type="button" className="bc-upcoming" onClick={function () { p.go && p.go("notices"); }}><span>Upcoming</span><em>{str(ups[0].title) + (ups[0].when ? ", " + str(ups[0].when) : "") + (ups[0].where ? ", " + str(ups[0].where) : "")}</em><Icon n="chevr" s={11} /></button>
      ) : null}
      {inCombat ? (
        <div className="bc-combatbar">
          <div className="bc-combatbar-head"><div className="bc-combatbar-title">{"Combat" + (combat.location ? ", " + str(combat.location) : "")}</div>
            {p.openBattle ? <button type="button" className="bc-fightbtn" disabled={busy} onClick={function () { p.openBattle("combat"); }}><Icon n="sword" s={16} fill="#2a0907" />Fight it out</button> : null}</div>
          {arr(combat.participants).slice(0, 6).map(function (c, i) {
            return <div key={i} className={"bc-combatbar-row" + (c.side === "enemy" ? " bc-enemy" : "")}><span>{str(c.name)}</span><small>{[str(c.condition), str(c.distance)].filter(Boolean).join(", ")}</small></div>;
          })}
        </div>
      ) : null}
      <div className="bc-chat bc-story-chat bc-chronicle-card" aria-label="Living story and NPC dialogue">
        <div className="bc-chronicle-head" aria-hidden="true">
          <img src={img("story_head")} alt="" />
          <div><span><Icon n="clover" s={13} />Chronicle</span><strong>{chapter}</strong></div>
        </div>
        <StoryArtContext.Provider value={p.art}>
          <Chat className="bc-story-native-chat" renderBubble={StoryBubble} />
        </StoryArtContext.Provider>
        <div className="bc-cardbar" role="toolbar" aria-label="Latest passage">
          <button type="button" disabled={!lastAi} onClick={copyLast}><Icon n="doc" s={14} />Copy</button>
          <button type="button" disabled={!lastAi || busy || typeof api.editMessage !== "function"} onClick={function () { setEditing({ id: lastAi.id, text: proseOf(lastAi.content), dirs: dirsOf(lastAi.content) }); }}><Icon n="quill" s={14} />Edit</button>
          <button type="button" disabled={!lastAi || busy || typeof api.regenerateMessage !== "function"} onClick={regen}><Icon n="hourglass" s={14} />Regenerate</button>
          <span className="bc-cardbar-sep" />
          <button type="button" disabled={!lastAi} onClick={saveLast}><Icon n="bookmark" s={14} />Save to Journal</button>
        </div>
      </div>
      {arr(v.equipment_activity).length ? (
        <div role="status" className="bc-equipnote">
          {arr(v.equipment_activity).slice(-2).map(function (e) { return <div key={e.id}>{str(e.text)}</div>; })}
        </div>
      ) : null}
      {sheet ? (
        <div className="bc-story-sheet">
          <div className="bc-story-sheet-head">
            <span>{{ cast: "Cast", move: "Move", defend: "Defend", ally: "Allies", item: "Items", rest: "Rest", actions: "Actions" }[sheet]}</span>
            <Btn small label="Close" onClick={function () { setSheet(""); }}>Close</Btn>
          </div>
          {sheetBody}
        </div>
      ) : null}
      {editing ? (
        <Sheet title="Edit passage" onClose={function () { setEditing(null); }}>
          <textarea className="bc-in bc-ta bc-edit-ta" aria-label="Passage text" value={editing.text} onChange={function (e) { setEditing(Object.assign({}, editing, { text: e.target.value })); }} />
          <div className="bc-note">Only the prose changes. State already recorded by this reply stays exactly as it is.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Btn kind="gold" disabled={!editing.text.trim()} onClick={function () { var ed = editing; var pr = api.editMessage(ed.id, ed.text.trim() + (ed.dirs ? "\n\n" + ed.dirs : "")); setEditing(null); if (pr && pr.then) pr.then(function (ok) { toast(ok ? "Passage updated." : "Couldn't update that passage.", ok ? "success" : "error"); }, function () { toast("Couldn't update that passage.", "error"); }); }}>Save changes</Btn>
            <Btn onClick={function () { setEditing(null); }}>Cancel</Btn>
          </div>
        </Sheet>
      ) : null}
      {inCombat ? (
        <div className="bc-chips bc-story-chips">
          {[["cast", "Cast"], ["move", "Move"], ["defend", "Defend"], ["ally", "Allies"], ["item", "Items"]].map(function (x) { return <Btn key={x[0]} small active={sheet === x[0]} disabled={busy} onClick={function () { setSheet(sheet === x[0] ? "" : x[0]); }} style={{ flexShrink: 0 }}>{x[1]}</Btn>; })}
        </div>
      ) : (
        <div className="bc-actgrid">
          {cards.map(function (c) {
            var m = actMeta(c); var isRest = c === "Rest for a while";
            return (
              <button key={c} type="button" className={"bc-actcard" + (isRest && sheet === "rest" ? " bc-actcard-on" : "")} disabled={busy} onClick={function () { cardAction(c); }}>
                <img src={img(m.art)} alt="" /><span className="bc-actcard-shade" />
                <span className="bc-actcard-icon"><Icon n={m.icon} s={26} /></span>
                <span className="bc-actcard-text"><strong>{c}</strong><small>{m.sub}</small></span>
                <Icon n="chevr" s={12} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
var DIRECTIVE_LINE = /^\s*\[(?:audio|[A-Za-z_][\w.\-]*)\s*:[^\]]*\]\s*$/;
function proseOf(t) { return str(t).split("\n").filter(function (l) { return !DIRECTIVE_LINE.test(l); }).join("\n").replace(/\n{3,}/g, "\n\n").trim(); }
function cleanPassage(t) { return str(t).split("\n").map(function (l) { var m = l.match(/^\s*@(.+?)\s*$/); return m ? m[1] + ":" : l.replace(/(^|\s)[*_]+|[*_]+(?=\s|$|[.,!?;:])/g, "$1"); }).join("\n").replace(/:\n"/g, ": \"").trim(); }
function dirsOf(t) { return str(t).split("\n").filter(function (l) { return DIRECTIVE_LINE.test(l); }).join("\n"); }
function hudLow(k, val) { var n = num(val, k === "ft" ? 0 : 100); return k === "ft" ? n > 80 : (k === "hp" ? n < 25 : n < 15); }
var PASSAGE_KEY = "bc_saved_passages";
function loadPassages(api, cb) { var st = getStore(api); if (!st || typeof st.get !== "function") { cb([]); return; } try { var pr = st.get(PASSAGE_KEY); if (pr && pr.then) pr.then(function (raw) { var l = []; try { l = raw ? JSON.parse(raw) : []; } catch (e) {} cb(Array.isArray(l) ? l : []); }, function () { cb([]); }); else cb([]); } catch (e) { cb([]); } }
function storePassages(api, list, cb) { var st = getStore(api); if (!st || typeof st.set !== "function") { cb && cb(false); return; } try { var pr = st.set(PASSAGE_KEY, JSON.stringify(list.slice(-60))); if (pr && pr.then) pr.then(function () { cb && cb(true); }, function () { cb && cb(false); }); else cb && cb(true); } catch (e) { cb && cb(false); } }
function savePassage(api, item, cb) { loadPassages(api, function (l) { if (l.some(function (x) { return x.id === item.id; })) { cb(false, true); return; } storePassages(api, l.concat([item]), function (ok) { cb(ok, false); }); }); }
var ACT_META = [
  [/rest|sleep|room/i, "bed", "Recover body and mind.", "act_rest"],
  [/^eat something/i, "food", "Free if you carry food.", "act_eat"],
  [/^train/i, "dumbbell", "Opens the training planner.", "act_train"],
  [/eat|food|meal|order/i, "food", "Restore stamina.", "act_eat"],
  [/train|practice|spar/i, "dumbbell", "Sharpen your skills.", "act_train"],
  [/head|outside|leave|explore|keep going|advance|look around|route/i, "compass", "Explore the town.", "act_out"],
  [/talk|ask|captain|someone|companion|barkeep|employer|listen|rumou?r/i, "people", "See who will talk.", "act_out"],
  [/work|job|chores|pay/i, "hammer", "Earn your keep.", "act_train"],
  [/browse|wares|price|shop/i, "coins", "See what is for sale.", "act_eat"],
  [/mission|camp|forage|track|trap|map|wait|watch|step|slip/i, "scroll", "Take your time.", "act_out"]
];
function actMeta(label) {
  for (var i = 0; i < ACT_META.length; i++) if (ACT_META[i][0].test(label)) return { icon: ACT_META[i][1], sub: ACT_META[i][2], art: ACT_META[i][3] };
  return { icon: "star", sub: "Act on it.", art: "act_out" };
}
