var CONCEPT_WORD = { IDEA: "Early", EXPERIMENTAL: "Early", UNSTABLE: "Developing", REPEATABLE: "Stable", REFINED: "Refined", GRIMOIRE_CANDIDATE: "Resonant", MANIFESTED: "Manifested" };
var SPELL_CATS = [["all", "All", "dots"], ["offense", "Offense", "sword"], ["defense", "Defense", "shield"], ["support", "Support", "plus"], ["utility", "Utility", "star"]];
function spellCat(s) {
  var t = (str(s.category) + " " + str(s.type) + " " + str(s.intent) + " " + str(obj(s.mechanics).form) + " " + str(s.name) + " " + str(s.behavior)).toLowerCase();
  if (/defen|shield|barrier|wall|guard|ward|protect|armor|armour/.test(t)) return "defense";
  if (/heal|support|boost|bless|restor|enhanc|ally|allies|mend/.test(t)) return "support";
  if (/attack|offen|cut|blade|edge|strike|bolt|blast|slash|spear|arrow|burst|storm|lance|bullet|fang|claw|crush|explo/.test(t)) return "offense";
  return "utility";
}
var ATTR_ICON = { fire: "flame", water: "drop", wind: "wisp", earth: "mountain", lightning: "bolt", plant: "leaf", ice: "snow", sand: "mountain", smoke: "cloud", stone: "gem", steel: "sword", sound: "wave", cotton: "cloud", thread: "link", mirror: "ring", poison: "skull", ash: "flame", spatial: "star", light: "sun", dark: "moon", time: "hourglass" };
function attrIcon(a) { var k = str(a).toLowerCase().replace(/\(.*\)/, "").trim().split(/\s+/)[0]; return ATTR_ICON[k] || "star"; }
var ATTR_NATURE = {
  fire: "Hungry, fierce and warm. It answers passion and punishes carelessness.", water: "Patient and adaptable. It takes the shape of whatever holds it.",
  wind: "A light and ever-changing flow. Free, wild, and full of possibility.", earth: "Steady and enduring. Slow to stir, impossible to move once set.",
  lightning: "Sudden and bright. Speed first, questions later.", plant: "Living and growing. It remembers the hand that tends it.",
  ice: "Still and exacting. Precision made cold.", steel: "Hard, honest and heavy. It rewards discipline.",
  light: "Blinding and swift. Rare, and watched by many.", dark: "Deep and quiet. It swallows what others throw.", spatial: "Distance folds to will. Rare and demanding."
};
var BAND_ORDER = ["Negligible", "Poor", "Modest", "Average", "Good", "Strong", "Exceptional", "Extraordinary"];
function bandFrac(n) { var b = bandOf(n); var i = BAND_ORDER.indexOf(b); return num(n, 0) <= 0 ? 0.12 : (i + 1) / BAND_ORDER.length; }
function Radar(p) {
  var axes = p.axes; var n = axes.length; var R = 54; var cx = 80, cy = 72;
  function pt(i, f) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; }
  var rings = [0.25, 0.5, 0.75, 1].map(function (f) { return axes.map(function (_, i) { return pt(i, f).join(","); }).join(" "); });
  var shape = axes.map(function (a, i) { return pt(i, Math.max(0.08, a.f)).join(","); }).join(" ");
  return (
    <svg viewBox="-18 -4 196 158" className="bc-radar" role="img" aria-label={axes.map(function (a) { return a.label + " " + a.word; }).join(", ")}>
      {rings.map(function (r, i) { return <polygon key={i} points={r} fill="none" stroke="#c9a24e" strokeOpacity={i === 3 ? .55 : .2} strokeWidth="1" />; })}
      {axes.map(function (a, i) { var e = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={e[0]} y2={e[1]} stroke="#c9a24e" strokeOpacity=".25" />; })}
      <polygon points={shape} fill="rgba(217,180,99,.42)" stroke="#f3dda0" strokeWidth="1.4" />
      {axes.map(function (a, i) { var e = pt(i, 1.27); return <text key={i} x={e[0]} y={e[1] + 3} textAnchor="middle" fontSize="8.5" fill="#e1d6c1" fontFamily="Cinzel,Georgia,serif">{a.label}</text>; })}
    </svg>
  );
}
function GrimoireView(p) {
  var api = p.api; var v = api.variables || {}; var busy = !!api.isStreaming;
  var g = obj(v.grimoire); var mp = obj(v.magic_profile); var bp = obj(v.body_profile); var spells = arr(v.spells); var concepts = arr(v.spell_concepts); var techs = arr(v.techniques);
  var ec = React.useState(""); var castingError = ec[0], setCastingError = ec[1];
  var ss = React.useState("spells"); var sub = ss[0], setSub = ss[1];
  var os = React.useState(-1); var open = os[0], setOpen = os[1];
  var fc = React.useState("all"); var cat = fc[0], setCat = fc[1];
  var gfs = React.useState(false); var grimoireForge = gfs[0], setGrimoireForge = gfs[1];
  var nf = React.useState({ intent: "Offensive", idea: "", priority: "Precision", tradeoff: "" }); var form = nf[0], setForm = nf[1];
  var cp = obj(v.creation_profile); var attr = mp.attribute_known === false ? "" : str(mp.attribute);
  var mps = React.useState(false); var profileOpen = mps[0], setProfileOpen = mps[1];
  var mb = obj(mp.bands);
  var profileSheet = profileOpen ? (
    <Sheet title="Your magic" onClose={function () { setProfileOpen(false); }}>
      <div className="bc-tendency-body" style={{ marginBottom: 8 }}><Icon n={attrIcon(attr)} s={40} fill="#9fe7d6" /><div><strong>{attr || "Not yet understood"}</strong><small>{ATTR_NATURE[str(attr).toLowerCase()] || "Your mana's own nature, still revealing itself."}</small></div></div>
      <Row k="Reserves" v={str(mb.reserves) && mb.reserves !== "Unknown" ? str(mb.reserves) : bandOf(mp.capacity)} />
      <Row k="Output" v={str(mb.output) && mb.output !== "Unknown" ? str(mb.output) : bandOf(mp.output)} />
      <Row k="Control" v={str(mb.control) && mb.control !== "Unknown" ? str(mb.control) : bandOf(mp.control)} />
      <Row k="Sensing" v={str(mb.sensing) && mb.sensing !== "Unknown" ? str(mb.sensing) : bandOf(mp.sensing)} />
      <Row k="Physique" v={str(obj(bp.bands).physique) && obj(bp.bands).physique !== "Unknown" ? str(obj(bp.bands).physique) : bandOf((num(bp.strength, 0) + num(bp.endurance, 0)) / 2)} />
      {arr(mp.forms).length ? <Row k="Forms" v={arr(mp.forms).map(str).join(", ")} /> : null}
      <div className="bc-note">Descriptions only — the numbers behind them stay hidden. They grow through training, real use and breakthroughs.</div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <Btn small kind="gold" onClick={function () { setProfileOpen(false); p.goTrain("Mana control", ""); }}>Train my magic</Btn>
        <Btn small onClick={function () { setProfileOpen(false); setSub("developing"); setOpen(-1); }}>Shape a new spell</Btn>
      </div>
    </Sheet>
  ) : null;
  var hasG = isTrue(v.has_grimoire);
  var sBond = g.spirit_link ? str(g.spirit_link) : ""; var dBond = g.devil_link ? str(g.devil_link) : "";
  var bonds = (
    <Frame className="bc-bonds-panel" pad="9px 10px" style={{ marginBottom: 12 }}>
      <div className="bc-bonds-head">
        <Icon n="clover" s={30} />
        <div><strong>Bonds</strong><small>Spirits and Devils walk different paths. Both leave their mark on your story.</small></div>
      </div>
      <button type="button" className="bc-bondrow" onClick={p.goBound}>
        <span className="bc-bondrow-icon"><Icon n="wisp" s={26} /></span>
        <span className="bc-bondrow-text"><strong>Your spirit bond</strong><small>Your connection to a spirit and their power.</small></span>
        <span className={"bc-bondtag" + (sBond ? " bc-bondtag-on" : "")}><Icon n="wisp" s={16} /><span><strong>{sBond || "None"}</strong><small>{sBond ? "Bonded" : "Not bound"}</small></span><Icon n="chevr" s={11} /></span>
      </button>
      <button type="button" className="bc-bondrow bc-bondrow-devil" onClick={p.goBound}>
        <span className="bc-bondrow-icon"><Icon n="devil" s={24} fill="#d9534a" /></span>
        <span className="bc-bondrow-text"><strong>Your devil bond</strong><small>A fragment of forbidden power that lingers.</small></span>
        <span className="bc-bondtag bc-bondtag-devil"><Icon n="devil" s={15} fill="#d9534a" /><span><strong>{dBond || "Unknown"}</strong><small>{dBond ? "Pact or bond" : "Not yet awakened"}</small></span><Icon n="chevr" s={11} /></span>
      </button>
    </Frame>
  );
  if (!hasG) {
    return (
      <div>
        {bonds}
        <Frame pad="16px 15px">
          <div style={{ textAlign: "center", opacity: 0.55 }}><Icon n="book" s={64} /></div>
          <H size={19} m="10px 0">No grimoire has chosen you yet</H>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: C.label, margin: "0 0 12px" }}>Grimoires choose their owners at the March ceremony in a grimoire tower, once you have turned fifteen. If you miss it, you can visit a tower later. Until then your magic is raw and unshaped.</p>
          <Row k="Your magic, as far as you know" v={attr || "Not yet understood"} />
          {/Sun/.test(str(cp.origin)) ? <p style={{ fontSize: 15, color: C.muted, marginTop: 12 }}>In the Land of the Sun, magic is written in scrolls, not grimoires.</p> : null}
        </Frame>
      </div>
    );
  }
  var content = null;
  if (sub === "spells" && open >= 0 && spells[open]) {
    var s = spells[open]; var og = obj(s.origin);
    var sid = s.id || ("idx" + open);
    var spellImgUrl = p.art && p.art.spellImageUrl ? p.art.spellImageUrl(sid) : "";
    var plan = bcCastPlan(v, s, { output: "Normal" });
    content = (
      <Frame className="bc-turn bc-spellpage" key={"sp" + open} pad="14px 14px 16px">
        <div className="bc-spellpage-kicker">{"PAGE " + (s.page || open + 1) + " · " + spellCat(s).toUpperCase()}</div>
        <div className="bc-spellpage-name">{str(s.name)}</div>
        {p.art && p.art.setSpellImage ? (
          <ImgSlot url={spellImgUrl} h={190} marginBottom={10} placeholderIcon="book"
            onFile={function (e) { var fl = e.target.files && e.target.files[0]; e.target.value = ""; if (!fl) return; readImage(fl, 640, 480, function (err, data) { if (!err) p.art.setSpellImage(sid, data, function () {}); }); }}
            onRemove={function () { p.art.setSpellImage(sid, "", function () {}); }}
          />
        ) : (spellImgUrl ? <img src={spellImgUrl} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 5, margin: "0 0 10px" }} /> : null)}
        <p className="bc-spellpage-text">{str(s.behavior) || "The page's meaning is still settling."}</p>
        <PRow k="Proficiency" v={str(s.proficiency) || "Novice"} />
        {s.range ? <PRow k="Range" v={str(s.range)} /> : null}
        <PRow k="Typical demand" v={bcSpellMechanics(s).tier} />
        {plan.ok && showNums(v) ? <PRow k="Normal cast cost" v={plan.manaUnits + " mana units (" + plan.manaPercent + "% of your reserve)"} /> : null}
        {plan.ok && showNums(v) ? <PRow k="Physical cost" v={plan.stamina + " stamina · " + plan.fatigue + " fatigue"} /> : null}
        {plan.ok && showNums(v) ? <PRow k="Potential impact" v={plan.impact + " before defenses"} /> : null}
        {!plan.ok ? <PRow k="Cast availability" v={plan.reason || "Unavailable"} /> : null}
        {arr(s.variants).length ? <PRow k="Variants" v={arr(s.variants).map(function (x) { return typeof x === "string" ? x : str(x.name); }).join(", ")} /> : null}
        {s.origin ? <p style={{ fontSize: 14, color: C.muted, fontStyle: "italic", margin: "12px 0 0" }}>{"Appeared " + [str(og.date), str(og.place)].filter(Boolean).join(", ") + (og.trigger ? ": " + str(og.trigger) : "")}</p> : null}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          <Btn small onClick={function () { setOpen(-1); }}>Back to pages</Btn>
          <Btn small kind="gold" disabled={busy} onClick={function () { bcCastFromUI(api, s, { output: "Normal", target: "as fits the moment" }, function (ok, msg) { if (ok) p.toStory(); else setCastingError(msg); }); }}>Cast it</Btn>
          <Btn small onClick={function () { p.goTrain("A spell", str(s.name)); }}>Train it</Btn>
          {castingError ? <div role="alert" style={{ color: "#f1b8a8", fontSize: 13, width: "100%" }}>{castingError}</div> : null}
        </div>
      </Frame>
    );
  } else if (sub === "spells") {
    var shown = spells.map(function (sp, i) { return { sp: sp, i: i }; }).filter(function (x) { return cat === "all" || spellCat(x.sp) === cat; });
    var pages = num(g.pages_filled, spells.length); var potential = num(g.blank_potential, 0);
    var axes = [
      { label: "Control", f: bandFrac(mp.control), word: bandOf(mp.control) },
      { label: "Output", f: bandFrac(mp.output), word: bandOf(mp.output) },
      { label: "Reserves", f: bandFrac(mp.capacity), word: bandOf(mp.capacity) },
      { label: "Physique", f: bandFrac((num(bp.strength, 0) + num(bp.endurance, 0)) / 2), word: bandOf((num(bp.strength, 0) + num(bp.endurance, 0)) / 2) },
      { label: "Sensing", f: bandFrac(mp.sensing), word: bandOf(mp.sensing) }
    ];
    content = (
      <div>
        <Frame className="bc-spells-panel" pad="9px 9px 6px" style={{ marginBottom: 12 }}>
          <SectionHead icon="book" title="Spells & Pages" sub="Spells you have discovered and mastered."
            right={<button type="button" className="bc-pagecount" aria-label="Open the grimoire record" onClick={function () { setSub("record"); }}><small>Total pages</small><strong>{pages + (potential > pages ? " / " + potential : "")}</strong></button>} />
          <div className="bc-chiprow">{SPELL_CATS.map(function (c) { return <Chip key={c[0]} icon={c[2]} on={cat === c[0]} onClick={function () { setCat(c[0]); }}>{c[1]}</Chip>; })}</div>
          {shown.length ? shown.map(function (x) {
            var sp = x.sp, i = x.i; var su = p.art && p.art.spellImageUrl ? p.art.spellImageUrl(sp.id || ("idx" + i)) : ""; var c = spellCat(sp);
            var prog = clamp(num(sp.prog, 0), 0, 100);
            return (
              <button className="bc-spellrow" key={sp.id || i} type="button" onClick={function () { setOpen(i); }}>
                <span className="bc-spellrow-art">{su ? <img src={su} alt="" /> : <Icon n={attrIcon(sp.attribute || attr)} s={30} fill="#9fe7d6" />}</span>
                <span className="bc-spellrow-meta">
                  <strong>{str(sp.name).replace(/^[A-Za-z ]+Magic:\s*/, "")}</strong>
                  <small>{str(sp.behavior).slice(0, 90) || "A spell recorded in your grimoire."}</small>
                  <span className="bc-tags"><b className={"bc-tag bc-tag-" + c}>{c.charAt(0).toUpperCase() + c.slice(1)}</b>{(sp.attribute || attr) ? <b className="bc-tag bc-tag-attr">{str(sp.attribute || attr)}</b> : null}</span>
                </span>
                <span className="bc-spellrow-side">
                  <b className="bc-profbadge">{str(sp.proficiency) || "Novice"}</b>
                  <span className="bc-progbar"><i style={{ width: prog + "%" }} /></span>
                  <small>{"Page " + (sp.page || i + 1)}</small>
                </span>
                <Icon n="chevr" s={13} />
              </button>
            );
          }) : <Empty>{spells.length ? "No pages of that kind yet." : "Every page is still blank. Spells appear when your magic grows into them, through practice, experiments and the moments that test you."}</Empty>}
        </Frame>
        <div className="bc-grim-lower">
          <button type="button" className="bc-attr-panel bc-cardbtn" onClick={function () { setProfileOpen(true); }} aria-label="Open your magical profile">
            <SectionHead icon="compass" iconSize={24} title="Attributes" sub="Your current magical profile." />
            <Radar axes={axes} />
          </button>
          <div className="bc-grim-side">
            <button type="button" className="bc-tendency bc-cardbtn" onClick={function () { setProfileOpen(true); }} aria-label="Open your mana tendency">
              <SectionHead icon={attrIcon(attr)} iconSize={24} title="Mana Tendency" sub="The nature of your magic." />
              <div className="bc-tendency-body"><Icon n={attrIcon(attr)} s={34} fill="#9fe7d6" /><div><strong>{attr || "Not yet understood"}</strong><small>{ATTR_NATURE[str(attr).toLowerCase()] || (attr ? "Your mana's own nature, still revealing itself." : "Your attribute will reveal itself in time.")}</small></div><Icon n="chevr" s={12} /></div>
            </button>
            <button type="button" className="bc-progression" onClick={function () { setSub("developing"); }}>
              <Icon n="chart" s={28} /><span><strong>Progression</strong><small>Concepts in development, techniques and the grimoire's record.</small></span><Icon n="chevr" s={12} />
            </button>
          </div>
        </div>
        <div className="bc-grim-cover-row">
          <div className="bc-grimoire-cover"><Cover g={g} attr={mp.attribute} small={true} design={obj(p.art).grimoireDesign} imgUrl={artFor(p.api, obj(p.art).art, "grimoire_cover")} /></div>
          <div><strong>{(str(obj(g.appearance).cover) || "A soul-bound grimoire")}</strong><small>{(num(g.leaf_count, 3) + "-leaf") + (attr ? " · " + attr + " magic" : "")}</small><Btn small onClick={function () { setGrimoireForge(true); }}><Icon n="quill" s={14} />Customize / Upload cover</Btn></div>
        </div>
      </div>
    );
  } else if (sub === "developing") {
    content = (
      <div>
        {concepts.length ? concepts.map(function (c, i) {
          return (
            <Frame key={c.id || i} pad="11px 12px" style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ fontSize: 17, fontWeight: 700, color: C.ivory }}>{str(c.name)}</span><span style={{ fontSize: 13.5, color: C.gold, fontWeight: 700 }}>{CONCEPT_WORD[str(c.state)] || str(c.state) || "Early"}</span></div>
              {c.description || c.intent ? <p style={{ fontSize: 15, color: C.muted, margin: "4px 0 8px", lineHeight: 1.45 }}>{str(c.description || c.intent)}</p> : null}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn small disabled={busy} onClick={function () { send(api, "[UI:SHAPE] concept=" + str(c.name) + "; mode=experiment now"); p.toStory(); }}>Experiment now</Btn>
                <Btn small onClick={function () { p.goTrain("Spell shaping", str(c.name)); }}>Train over time</Btn>
              </div>
            </Frame>
          );
        }) : <Empty>No spells in development. Describe an idea below and try it.</Empty>}
        <Frame pad="14px" style={{ marginTop: 10 }}>
          <H size={17} m="0 0 12px">Shape a new idea</H>
          <Field label="What it is for"><Seg label="Purpose" value={form.intent} options={["Offensive", "Defensive", "Movement", "Support", "Utility"]} onChange={function (x) { setForm(Object.assign({}, form, { intent: x })); }} /></Field>
          <Field label="Describe it"><textarea className="bc-in bc-ta" aria-label="Spell idea" placeholder="For example: compress wind into a thin cutting edge I can throw" value={form.idea} onChange={function (e) { setForm(Object.assign({}, form, { idea: e.target.value })); }} /></Field>
          <Field label="What matters most"><Seg label="Priority" value={form.priority} options={["Power", "Speed", "Precision", "Range", "Efficiency", "Duration"]} onChange={function (x) { setForm(Object.assign({}, form, { priority: x })); }} /></Field>
          <Field label="What you would give up"><input className="bc-in" aria-label="Tradeoff" placeholder="Optional" value={form.tradeoff} onChange={function (e) { setForm(Object.assign({}, form, { tradeoff: e.target.value })); }} /></Field>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn kind="gold" disabled={busy || !form.idea.trim()} onClick={function () { send(api, "[UI:SHAPE] attribute=" + (str(mp.attribute) || "my attribute") + "; intent=" + form.intent + "; concept=" + form.idea.trim() + "; priority=" + form.priority + "; tradeoff=" + (form.tradeoff || "none stated") + "; mode=experiment now"); setForm(Object.assign({}, form, { idea: "", tradeoff: "" })); p.toStory(); }}>Try it now</Btn>
            <Btn disabled={!form.idea.trim()} onClick={function () { p.goTrain("Spell shaping", form.idea.trim()); }}>Train it over time</Btn>
          </div>
        </Frame>
      </div>
    );
  } else if (sub === "techniques") {
    content = techs.length ? <Frame pad="4px 14px 8px">{techs.map(function (t, i) { return <Row key={t.id || i} k={str(t.name)} v={str(t.tier) || "Novice"} />; })}</Frame>
      : <Empty>No techniques yet. Mana Skin, Mana Zone, Ki and the rest are learned from teachers, hard practice or discovery.</Empty>;
  } else {
    var hist = arr(g.history); var idn = obj(mp.identity);
    content = (
      <Frame pad="6px 14px 10px">
        <Row k="Insignia" v={str(g.insignia || "clover") + (num(g.leaf_count, 0) ? ", " + g.leaf_count + " leaves" : "")} />
        <Row k="Received" v={str(g.received_on) || "Unknown"} />
        <Row k="Pages written" v={str(num(g.pages_filled, spells.length))} />
        {arr(idn.themes).length ? <Row k="Recurring themes" v={arr(idn.themes).join(", ")} /> : null}
        <H size={16} m="16px 0 6px">History</H>
        {hist.length ? hist.map(function (h, i) { return <Row key={i} k={str(h.date)} v={str(h.event)} />; }) : <Empty>Nothing recorded yet.</Empty>}
      </Frame>
    );
  }
  return (
    <div>
      {profileSheet}
      {sub === "spells" && open < 0 ? bonds : null}
      {grimoireForge ? <GrimoireForgeSheet api={p.api} art={p.art} g={g} attr={mp.attribute} onClose={function () { setGrimoireForge(false); }} /> : null}
      {sub !== "spells" || open >= 0 ? <div className="bc-chiprow" style={{ marginBottom: 10 }}>{[["spells", "Overview", "book"], ["developing", "Developing", "quill"], ["techniques", "Techniques", "star"], ["record", "Record", "scroll"]].map(function (t) { return <Chip key={t[0]} icon={t[2]} on={sub === t[0] && open < 0} onClick={function () { setSub(t[0]); setOpen(-1); }}>{t[1]}</Chip>; })}</div> : null}
      {content}
    </div>
  );
}

/* Upload your own grimoire cover, right where the cover is customized (the same upload the More → Art page has) */
function GrimoireCoverUpload(p) {
  var bs = React.useState(false), busy = bs[0], setBusy = bs[1];
  var ms = React.useState(""), msg = ms[0], setMsg = ms[1];
  var art = p.art;
  function onFile(e) {
    var fl = e.target.files && e.target.files[0]; e.target.value = ""; if (!fl) return;
    readImage(fl, 900, 1200, function (err, data) {
      if (err) { setMsg(err); return; }
      setMsg(""); setBusy(true);
      art.setArt("grimoire_cover", data, function (ok) { setBusy(false); if (ok === false) setMsg(art.mediaError || "Upload failed — try again."); else if (p.api && p.api.showToast) p.api.showToast("Grimoire cover uploaded", "success"); });
    });
  }
  if (!art || typeof art.setArt !== "function") return null;
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <label className="bc-upload-btn" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "7px 12px", borderRadius: 6, border: "1px solid " + C.gold, color: C.goldHi, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? .6 : 1 }}>
        {busy ? "Uploading…" : "Upload your own cover"}<input type="file" accept="image/*" disabled={busy} style={{ display: "none" }} onChange={onFile} />
      </label>
      {msg ? <span role="alert" style={{ color: "#f1c7b8", fontSize: 13.5 }}>{msg}</span> : null}
    </span>
  );
}
