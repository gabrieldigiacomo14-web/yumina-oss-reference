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
            <div key={s[1]} className={"bc-statcell bc-statcell-" + s[4]} aria-label={s[1] + ": " + s[3]}>
              <Icon n={s[0]} s={17} />
              <div className="bc-statcell-body"><span>{s[1]}</span><div className="bc-statbar"><i style={{ width: clamp(num(s[2], 0), 0, 100) + "%" }} /></div><small>{s[3]}</small></div>
            </div>
          );
        })}
        <div className="bc-statcell bc-statcell-sky"><Icon n={night ? "moon" : "sun"} s={18} /><div className="bc-statcell-body"><span>{tod}</span><small>{str(v.weather).split(",")[0] || clock12(v.world_time)}</small></div></div>
      </div>
      {ups.length ? (
        <div className="bc-upcoming"><span>Upcoming</span><em>{str(ups[0].title) + (ups[0].when ? ", " + str(ups[0].when) : "") + (ups[0].where ? ", " + str(ups[0].where) : "")}</em></div>
      ) : null}
      {inCombat ? (
        <div className="bc-combatbar">
          <div className="bc-combatbar-title">{"Combat" + (combat.location ? ", " + str(combat.location) : "")}</div>
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
      </div>
      {arr(v.equipment_activity).length ? (
        <div role="status" className="bc-equipnote">
          {arr(v.equipment_activity).slice(-2).map(function (e) { return <div key={e.id}>{str(e.text)}</div>; })}
        </div>
      ) : null}
      {sheet ? (
        <div className="bc-story-sheet">
          <div className="bc-story-sheet-head">
            <span>{{ cast: "Cast", move: "Move", defend: "Defend", ally: "Allies", item: "Items", rest: "Rest" }[sheet]}</span>
            <Btn small label="Close" onClick={function () { setSheet(""); }}>Close</Btn>
          </div>
          {sheetBody}
        </div>
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
              <button key={c} type="button" className={"bc-actcard" + (isRest && sheet === "rest" ? " bc-actcard-on" : "")} disabled={busy} onClick={function () { isRest ? setSheet(sheet === "rest" ? "" : "rest") : act(c + "."); }}>
                <img src={img(m.art)} alt="" /><span className="bc-actcard-shade" />
                <span className="bc-actcard-icon"><Icon n={m.icon} s={26} /></span>
                <span className="bc-actcard-text"><strong>{c}</strong><small>{m.sub}</small></span>
                <Icon n="chevr" s={12} />
              </button>
            );
          })}
          <div className="bc-actmore">
            <Chip icon="star" disabled={busy} on={sheet === "cast"} onClick={function () { setSheet(sheet === "cast" ? "" : "cast"); }}>Cast magic</Chip>
            <Chip icon="pack" disabled={busy} on={sheet === "item"} onClick={function () { setSheet(sheet === "item" ? "" : "item"); }}>Use item</Chip>
            {extra.map(function (c) { return <Chip key={c} disabled={busy} onClick={function () { act(c + "."); }}>{c}</Chip>; })}
          </div>
        </div>
      )}
    </div>
  );
}
var ACT_META = [
  [/rest|sleep|room/i, "bed", "Recover body and mind.", "act_rest"],
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
