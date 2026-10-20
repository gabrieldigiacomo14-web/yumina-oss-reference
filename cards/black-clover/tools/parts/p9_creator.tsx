/* ---------- creator pieces ---------- */
function Stepper(p) {
  return (
    <div className="bc-stepper" role="list">
      <div className="bc-stepper-line" aria-hidden="true" />
      {STEPS.map(function (s, i) {
        var active = i === p.page, done = i < p.page;
        return (
          <button key={s} type="button" role="listitem" className={"bc-step" + (active ? " bc-step-on" : "") + (done ? " bc-step-done" : "")} onClick={function () { if (done) p.go(i); }} aria-current={active ? "step" : undefined} aria-label={"Step " + (i + 1) + ": " + s}>
            <span className="bc-step-dot">{active && i === STEPS.length - 1 ? <Icon n="clover" s={18} /> : i + 1}</span>
            <span className="bc-step-label">{s}</span>
          </button>
        );
      })}
    </div>
  );
}
function TileGrid(p) {
  return (
    <div role="radiogroup" aria-label={p.label} className={"bc-tilegrid" + (p.cls ? " " + p.cls : "")} style={{ gridTemplateColumns: "repeat(" + (p.cols || p.items.length) + ", minmax(0,1fr))" }}>
      {p.items.map(function (t) {
        var on = p.value === t.v;
        return (
          <button key={t.v} type="button" role="radio" aria-checked={on ? "true" : "false"} aria-label={t.t.replace("\n", " ")} className={"bc-tilebtn" + (on ? " bc-tilebtn-on" : "")} onClick={function () { p.onChange(t.v); }}>
            <Icon n={t.icon} s={p.iconSize || 26} fill={t.fill || (on ? "url(#bcg-gold)" : "#c9b892")} />
            <span className="bc-tilebtn-t">{t.t}</span>
            {t.d ? <span className="bc-tilebtn-d">{t.d}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
function PanelHead(p) {
  return (
    <div className={"bc-phead" + (p.art ? " bc-phead-art" : "")}>
      {p.art ? <img className="bc-phead-img" src={img(p.art)} alt="" /> : null}
      <span className="bc-phead-icon">{p.icon ? <Icon n={p.icon} s={40} /> : <svg width="46" height="46" viewBox="-32 -32 64 64" aria-hidden="true"><Insignia kind="clover" leaves={3} color="url(#bcg-gold)" /></svg>}</span>
      <span className="bc-phead-text"><strong>{p.title}</strong><small>{p.sub}</small></span>
    </div>
  );
}
function CField(p) {
  return <div className={"bc-cbox" + (p.cls ? " " + p.cls : "")}><div className="bc-cbox-label">{p.label}{p.note ? <small>{p.note}</small> : null}</div>{p.children}{p.hint ? <div className="bc-cbox-hint">{p.hint}</div> : null}</div>;
}
function ListOpt(p) {
  return (
    <button type="button" role="radio" aria-checked={p.on ? "true" : "false"} className={"bc-listopt" + (p.on ? " bc-listopt-on" : "")} onClick={p.onClick}>
      <span className="bc-listopt-icon">{p.sym ? <span className="bc-sym" style={{ color: p.accent || C.goldHi }}>{p.sym}</span> : <Icon n={p.icon || "clover"} s={26} />}</span>
      <span className="bc-listopt-text"><strong>{p.title}{p.tag ? <em>{p.tag}</em> : null}</strong>{p.desc ? <small>{p.desc}</small> : null}</span>
      <Icon n="chevr" s={14} />
    </button>
  );
}
function GreenRibbon(p) {
  return (
    <div className="bc-greenrib" style={{ opacity: p.disabled ? 0.6 : 1 }}>
      <button type="button" aria-label={p.label} disabled={p.disabled} onClick={p.onClick}><span><Icon n="clover" s={24} fill="url(#bcg-gold)" />{p.children}<Icon n="clover" s={24} fill="url(#bcg-gold)" /></span></button>
    </div>
  );
}
function OpeningSheet(p) {
  var opts = OPENINGS[p.era] || [];
  return (
    <Sheet title="Opening Preference" onClose={p.close}>
      {p.era === "later" ? <div style={{ fontSize: 14.5, color: C.muted, marginBottom: 10 }}>Details stay hidden at your spoiler level. The world knows what has happened; you'll find out by living.</div> : null}
      {opts.map(function (o, i) {
        return <Opt key={o} on={p.value === o} title={o} tag={p.era === "during" && i === 0 ? "Recommended" : null} onClick={function () { p.onPick(o); p.close(); }} />;
      })}
    </Sheet>
  );
}
var ERA_TILES = [
  { v: "before", t: "Before\nMain Story", icon: "sun" }, { v: "during", t: "During\nCanon", icon: "clover" }, { v: "later", t: "Later", icon: "compass" },
  { v: "after", t: "Post-Canon\nFuture", icon: "hourglass" }, { v: "custom", t: "Custom", icon: "book" }
];
var ORIGIN_ICON = { Royal: "crown", Noble: "fleur", Commoner: "people", Peasant: "wheat", Custom: "feather" };
function originIcon(v) { if (ORIGIN_ICON[v]) return ORIGIN_ICON[v]; if (/royal|loyalist/i.test(v)) return "crown"; if (/military|guardian|resistance/i.test(v)) return "shield"; if (/scholar|mage/i.test(v)) return "book"; if (/merchant|mining/i.test(v)) return "coins"; if (/agricult|rural|poor|labor/i.test(v)) return "wheat"; if (/orphan|displaced|wanderer/i.test(v)) return "compass"; if (/witch/i.test(v)) return "wisp"; if (/sun/i.test(v)) return "sun"; return "people"; }
function householdIcon(v) { if (/urban|city/i.test(v)) return "castle"; if (/merchant/i.test(v)) return "coins"; if (/artisan|labor/i.test(v)) return "hammer"; if (/military/i.test(v)) return "shield"; if (/farm|rural|village/i.test(v)) return "home"; if (/church|orphan/i.test(v)) return "book"; if (/house|cadet|royal/i.test(v)) return "crown"; if (/noble/i.test(v)) return "fleur"; if (/custom/i.test(v)) return "feather"; return "home"; }
var REGION_ART = { "Forsaken Realm": "region_forsaken", "Common Realm": "region_common", "Noble Realm": "region_noble" };
var REGION_DESC = { "Forsaken Realm": "Rough lands and resilient people. A place for those who endure.", "Common Realm": "Bustling towns and hardworking communities. Where ordinary dreams take root.", "Noble Realm": "Prestige, tradition, and influence. A land of distinguished bloodlines and high expectations." };
var PLACE_ARTS = ["place_rural", "place_outskirts", "place_market", "place_castle"];
var ATTR_FILL = { Fire: "#e8663c", Water: "#4aa3e8", Wind: "#5fd1a9", Earth: "#b98d5a", Lightning: "#f2c94c", Plant: "#6cc15a", Ice: "#9fd8f2", Sand: "#d9b46a", Smoke: "#a8adb5", Stone: "#b8bcc4", Steel: "#c9ced6", Sound: "#b48ae8", Cotton: "#f0ece2", Thread: "#d9b463", Mirror: "#8fd0f0", Poison: "#9b6ad6", Ash: "#8c8c8c" };

/* ---------- creator ---------- */
function Creator(p) {
  var api = p.api; var art = p.art;
  var fs = React.useState(function () { var saved = obj(api && api.variables ? api.variables.creation_profile : null); return Object.assign({}, BLANK, saved && saved.name ? saved : {}); });
  var f = fs[0], setF = fs[1];
  var ps = React.useState(0); var page = ps[0], setPage = ps[1];
  var bs = React.useState(false); var busy = bs[0], setBusy = bs[1];
  var es = React.useState(""); var err = es[0], setErr = es[1];
  var shs = React.useState(""); var sheet = shs[0], setSheet = shs[1];
  var ws = React.useState(false); var worldOpen = ws[0], setWorldOpen = ws[1];
  var scRef = React.useRef(null);
  function set(k, val) { setErr(""); setF(function (o) { var n = Object.assign({}, o); n[k] = val; return n; }); }
  function setMany(m) { setErr(""); setF(function (o) { return Object.assign({}, o, m); }); }
  function go(n) { setErr(""); setPage(n); if (scRef.current) scRef.current.scrollTop = 0; }
  function problem(pg) {
    if (pg === 0) {
      if (!str(f.name).trim()) return "Give your character a name to continue.";
      if (!f.sex) return "Choose your character's gender to continue.";
      if (!(num(f.age, 0) >= 1)) return "Enter an age to continue.";
      if (f.era === "custom" && !str(f.era_detail).trim()) return "Describe when your custom start takes place.";
      if (f.era !== "custom" && !f.opening) return "Choose an opening.";
    }
    if (pg === 1) {
      if (!f.homeland) return "Choose your homeland.";
      if (!f.origin) return "Choose a social origin.";
      if (f.origin === "Custom" && !str(f.origin_note).trim()) return "Describe your custom background.";
    }
    if (pg === 2) {
      if (f.magic_mode === "Choose" && !f.attribute_choice) return "Pick an attribute, or switch to Random.";
      if (f.magic_mode === "Describe" && !str(f.attribute_custom).trim()) return "Describe your magic, or switch to Random.";
    }
    if (pg === 3) {
      if (!f.settlement) return "Choose where you live, or describe a place of your own.";
      if (f.settlement_mode === "custom" && !str(f.custom_place).trim()) return "Describe your custom home.";
    }
    return "";
  }
  function next() { var bad = problem(page); if (bad) { setErr(bad); return; } go(page + 1); }
  function commit() {
    for (var i = 0; i < 4; i++) { var bad = problem(i); if (bad) { setErr(bad); setPage(i); return; } }
    var name = str(f.name).trim();
    var prof = Object.assign({}, f, { name: name, age: clamp(num(f.age, 15), 1, 120), era: eraCode(f), era_group: f.era,
      era_detail: f.era === "custom" ? f.era_detail : f.opening,
      leanings: f.talent_mode === "Guided" ? { reserves: f.lean_reserves, control: f.lean_control, physique: f.lean_physique } : null });
    var birthMonth = f.birth_month || "March"; var birthDay = clamp(num(f.birth_day, 14), 1, MONTH_LEN[MONTHS.indexOf(birthMonth)]);
    var birthYear = 0 - prof.age;
    var birthDate = birthDay + " " + birthMonth + ", CY " + birthYear;
    var settings = { canon_guidance: f.canon_guidance, canon_participation: f.canon_participation, interruptions: f.interruptions,
      narrative_density: f.narrative_density, spoiler_level: f.spoiler_level, content_continuity: f.content_continuity, consequences: f.consequences, show_numbers: false };
    var payload = {
      creation_profile: prof, sim_settings: settings, player_name: name, player_age: prof.age,
      player_profile: { sex: f.sex, appearance: f.appearance, personality: f.personality, homeland: f.homeland, social_origin: f.origin + (f.origin_detail ? " (" + f.origin_detail + ")" : ""), race: f.race, birth_date: birthDate },
      character_created: true
    };
    var msg = "✦ BEGIN LIFE ✦ " + name + " opens their eyes.";
    setBusy(true); setErr("");
    try {
      if (typeof api.patchVariables === "function") {
        var pr = api.patchVariables(payload);
        if (pr && typeof pr.then === "function") {
          pr.then(function () { api.sendMessage(msg); }, function () { setBusy(false); setErr("Your choices could not be saved. Check your connection, then press Begin Life again."); });
        } else { setTimeout(function () { api.sendMessage(msg); }, 400); }
      } else if (typeof api.setVariable === "function") {
        Object.keys(payload).forEach(function (k) { if (k !== "character_created") api.setVariable(k, payload[k]); });
        api.setVariable("character_created", true);
        setTimeout(function () { api.sendMessage(msg); }, 600);
      } else { setBusy(false); setErr("This preview cannot save choices. Open the world in play mode to begin."); }
    } catch (e) { setBusy(false); setErr("Saving failed: " + (e && e.message ? e.message : "unknown error") + ". Press Begin Life to try again."); }
  }

  var origins = ORIGINS[f.homeland] || []; var originObj = null;
  origins.forEach(function (o) { if (o.v === f.origin) originObj = o; });
  var regions = PLACES[f.homeland] || []; var regionObj = null;
  regions.forEach(function (r) { if (r.r === f.region) regionObj = r; });
  var body = null; var head = null;
  if (page === 0) {
    head = <PanelHead title="I. Identity" sub="Every legend begins with a name." />;
    body = (
      <div>
        <CField label="Name"><div className="bc-namebox"><input className="bc-in" aria-label="Name" value={f.name} maxLength={60} placeholder="Enter your name..." onChange={function (e) { set("name", e.target.value); }} /><Icon n="feather" s={18} fill="#9a8d6e" /></div></CField>
        <CField label="Gender">
          <div role="radiogroup" aria-label="Gender" className="bc-gender">
            <Toggle on={f.sex === "Male"} icon={"♂"} onClick={function () { set("sex", "Male"); }}>Male</Toggle>
            <Toggle on={f.sex === "Female"} icon={"♀"} onClick={function () { set("sex", "Female"); }}>Female</Toggle>
          </div>
        </CField>
        <div className="bc-cgrid2">
          <CField label="Age">
            <div className="bc-agebox">
              <button type="button" aria-label="Younger" onClick={function () { set("age", clamp(num(f.age, 15) - 1, 1, 120)); }}><Icon n="chevl" s={15} /></button>
              <input aria-label="Age" inputMode="numeric" value={str(f.age)} onChange={function (e) { set("age", e.target.value.replace(/[^0-9]/g, "")); }} />
              <button type="button" aria-label="Older" onClick={function () { set("age", clamp(num(f.age, 15) + 1, 1, 120)); }}><Icon n="chevr" s={15} /></button>
            </div>
          </CField>
          <CField label="Birthday">
            <div className="bc-bdaybox">
              <select aria-label="Birth month" value={f.birth_month || "March"} onChange={function (e) { set("birth_month", e.target.value); }} className="bc-in">
                {MONTHS.map(function (m) { return <option key={m} value={m}>{m}</option>; })}
              </select>
              <select aria-label="Birth day" value={str(f.birth_day || 14)} onChange={function (e) { set("birth_day", num(e.target.value, 14)); }} className="bc-in">
                {Array.from({ length: MONTH_LEN[MONTHS.indexOf(f.birth_month || "March")] }, function (_, i) { return <option key={i} value={String(i + 1)}>{i + 1}</option>; })}
              </select>
            </div>
          </CField>
        </div>
        <CField label="Appearance">
          <button type="button" className="bc-appearbtn" aria-label="Customize appearance" onClick={function () { setSheet("appearance"); }}>
            <img className="bc-appearbtn-art" src={img("ident_appear")} alt="" />
            <span className="bc-appearbtn-icon">{art.portrait ? <img src={art.portrait} alt="" /> : <Icon n="bust" s={32} fill="#cbbf9f" />}</span>
            <span className="bc-appearbtn-text"><strong>Customize Appearance</strong><small>{f.appearance || "Define your look, style, and presence."}</small></span>
            <Icon n="chevr" s={14} />
          </button>
        </CField>
        <CField label="Story Timing"><TileGrid label="Story timing" items={ERA_TILES} value={f.era} onChange={function (x) { setMany({ era: x, opening: x === "custom" ? "" : OPENINGS[x][0] }); }} /></CField>
        {f.era === "custom" ? (
          <CField label="Your start" hint="For example: two years after Asta joined the Black Bulls.">
            <input className="bc-in" aria-label="Custom start" value={f.era_detail} placeholder="When does your story begin?" onChange={function (e) { set("era_detail", e.target.value); }} />
          </CField>
        ) : (
          <CField label="Opening Preference">
            <button type="button" className="bc-openbtn" aria-label="Opening preference" onClick={function () { setSheet("opening"); }}>
              <Icon n="book" s={28} />
              <span><strong>{f.opening || "Choose an opening"}</strong>{f.era === "during" && f.opening === OPENINGS.during[0] ? <small>Recommended</small> : null}</span>
              <Icon n="chevr" s={14} />
            </button>
          </CField>
        )}
      </div>
    );
  } else if (page === 1) {
    head = <PanelHead title="II. Background" sub="Your past shapes your path. Choose where you come from and who raised you." icon="scroll" art="bg_head" />;
    body = (
      <div>
        <CField label="Homeland" note="Every kingdom is a complete life in one shared world.">
          <div className="bc-kingdoms" role="radiogroup" aria-label="Homeland">
            {KINGDOMS.map(function (k) {
              var on = f.homeland === k.v;
              return <button key={k.v} type="button" role="radio" aria-checked={on ? "true" : "false"} className={"bc-kchip" + (on ? " bc-kchip-on" : "")} onClick={function () { if (f.homeland !== k.v) setMany({ homeland: k.v, origin: "", origin_detail: "", region: "", settlement: "", settlement_mode: "", custom_place: "" }); }}><span style={{ color: KCOL[k.v] }}>{k.sym}</span>{k.v}</button>;
            })}
          </div>
          {f.homeland ? <div className="bc-cbox-hint">{(KINGDOMS.filter(function (k) { return k.v === f.homeland; })[0] || {}).d}</div> : null}
        </CField>
        {f.homeland ? (
          <CField label="Social Origin" note="Origin shapes opportunity and how people treat you.">
            <div role="radiogroup" aria-label="Social origin">{origins.map(function (o) { return <ListOpt key={o.v} on={f.origin === o.v} icon={originIcon(o.v)} title={o.v} desc={o.d} onClick={function () { if (f.origin !== o.v) setMany({ origin: o.v, origin_detail: "" }); }} />; })}</div>
          </CField>
        ) : null}
        {originObj && originObj.subs && originObj.subs.length ? (
          <CField label="Household">
            <TileGrid label="Household" cls="bc-tilegrid-row" cols={3} iconSize={22} items={originObj.subs.map(function (s) { return { v: s, t: s, icon: householdIcon(s) }; })} value={f.origin_detail} onChange={function (x) { set("origin_detail", x); }} />
          </CField>
        ) : null}
        {f.origin === "Custom" ? <CField label="Describe your background"><textarea className="bc-in bc-ta" aria-label="Custom background" value={f.origin_note} onChange={function (e) { set("origin_note", e.target.value); }} /></CField> : null}
        {f.homeland ? (
          <CField label="Family" note="Your family gives you roots, or the freedom to forge your own.">
            <TileGrid label="Family" cls="bc-tilegrid-row" cols={3} iconSize={22} items={[{ v: "Generated family", t: "Generated family", icon: "people" }, { v: "Custom family", t: "Custom family", icon: "feather" }, { v: "Independent or orphaned", t: "Independent or orphaned", icon: "link" }]} value={f.family_mode} onChange={function (x) { set("family_mode", x); }} />
            {f.family_mode === "Custom family" ? <textarea className="bc-in bc-ta" style={{ marginTop: 8 }} aria-label="Family notes" placeholder="Parents, siblings, circumstances" value={f.family_note} onChange={function (e) { set("family_note", e.target.value); }} /> : null}
          </CField>
        ) : null}
        <CField label="Additional Details (Optional)">
          <div className="bc-countbox">
            <textarea className="bc-in bc-ta" aria-label="Background notes" maxLength={500} placeholder="Add any details about your family, background, or upbringing..." value={f.homeland_note} onChange={function (e) { set("homeland_note", e.target.value); }} />
            <small>{str(f.homeland_note).length + "/500"}</small>
          </div>
        </CField>
      </div>
    );
  } else if (page === 2) {
    var MAGIC_TILES = [{ v: "Random", t: "Random", d: "Let the world decide from your lineage and life.", icon: "dice" }, { v: "Choose", t: "Choose an attribute", d: "Select an elemental path or rare attribute.", icon: "clover" }, { v: "Describe", t: "Describe my own", d: "Create a unique magic based on your ideas.", icon: "quill" }];
    head = <PanelHead title="III. Magic & Grimoire" sub="Your mana is yours. The grimoire chooses later." />;
    body = (
      <div>
        <CField label="Your Magic" note="How you shape the world begins here. Choose or describe your magic.">
          <TileGrid label="Your magic" cls="bc-tilegrid-cards" items={MAGIC_TILES} iconSize={34} value={f.magic_mode} onChange={function (x) { set("magic_mode", x); }} />
        </CField>
        {f.magic_mode === "Choose" ? (
          <CField label="Attribute" note="Rarer attributes are harder to control but can lead to extraordinary power.">
            <div className="bc-attrgrid" role="radiogroup" aria-label="Attribute">
              {ATTRS.map(function (a) {
                var on = f.attribute_choice === a; var base = a.replace(/\s*\(.*\)/, "");
                return <button key={a} type="button" role="radio" aria-checked={on ? "true" : "false"} className={"bc-attrbtn" + (on ? " bc-attrbtn-on" : "") + (/rare/.test(a) ? " bc-attrbtn-wide" : "")} onClick={function () { set("attribute_choice", a); }}><Icon n={attrIcon(base)} s={18} fill={ATTR_FILL[base] || (base === "Light" ? "#f5d76e" : base === "Dark" ? "#9b7be0" : "#b48ae8")} />{a}</button>;
              })}
            </div>
          </CField>
        ) : null}
        {f.magic_mode === "Describe" ? (
          <CField label="Describe your magic" hint="Keep it to one domain. Powers that are too broad get narrowed.">
            <textarea className="bc-in bc-ta" aria-label="Custom magic" value={f.attribute_custom} onChange={function (e) { set("attribute_custom", e.target.value); }} />
          </CField>
        ) : null}
        <CField label="Talent" note="Choose how your magic behaves. The world will add variance.">
          <div role="radiogroup" aria-label="Talent">
            <ListOpt on={f.talent_mode === "Natural"} icon="leaf" title="Natural simulation" tag="Recommended" desc="Your abilities come from lineage, circumstance, variance and fate. You discover them by living." onClick={function () { set("talent_mode", "Natural"); }} />
            <ListOpt on={f.talent_mode === "Guided"} icon="book" title="Guided" desc="Choose broad leaning. The world still adds variance." onClick={function () { set("talent_mode", "Guided"); }} />
            <ListOpt on={f.talent_mode === "Sandbox"} icon="star" title="Full sandbox" desc="Specify exactly what you want. The world reacts honestly to it." onClick={function () { set("talent_mode", "Sandbox"); }} />
          </div>
        </CField>
        {f.talent_mode === "Guided" ? (
          <CField label="Leanings">
            <Field label="Mana reserves"><Seg label="Mana reserves" value={f.lean_reserves} options={["Modest", "Average", "Strong", "Exceptional"]} onChange={function (x) { set("lean_reserves", x); }} /></Field>
            <Field label="Control"><Seg label="Control" value={f.lean_control} options={["Clumsy", "Average", "Precise", "Exceptional"]} onChange={function (x) { set("lean_control", x); }} /></Field>
            <Field label="Physique"><Seg label="Physique" value={f.lean_physique} options={["Frail", "Average", "Robust", "Exceptional"]} onChange={function (x) { set("lean_physique", x); }} /></Field>
          </CField>
        ) : null}
        {f.talent_mode === "Sandbox" ? (
          <CField label="Sandbox specification" hint="Anything goes here, including a race other than human. Rare powers you force still have consequences.">
            <textarea className="bc-in bc-ta" aria-label="Sandbox specification" value={f.sandbox_note} onChange={function (e) { set("sandbox_note", e.target.value); }} />
          </CField>
        ) : null}
        <div className="bc-infonote"><Icon n="info" s={30} /><span>No grimoire is chosen here. At the ceremony a grimoire decides whether you are its owner, three leaves or something rarer. You find out by living.</span></div>
      </div>
    );
  } else if (page === 3) {
    var placeDesc = "";
    if (regionObj) regionObj.s.forEach(function (s) { if (s.n === f.settlement) placeDesc = str(s.d); });
    head = <PanelHead title="IV. Origin" sub="Choose where your first morning begins." />;
    body = (
      <div>
        {!f.homeland ? <Empty>Choose a homeland on the Background page first.</Empty> : (
          <div>
            <div className="bc-mini-head"><span>Choose a Region</span><small>Each region offers a different life, culture, and opportunity.</small></div>
            <div className="bc-regions" role="radiogroup" aria-label="Region">
              {regions.map(function (r, i) {
                var on = f.region === r.r; var a = REGION_ART[r.r] || ["region_common", "region_noble", "region_forsaken"][i % 3];
                var d = REGION_DESC[r.r] || (r.s[0] && r.s[0].d) || "A life of its own, far from the rest.";
                return (
                  <button key={r.r} type="button" role="radio" aria-checked={on ? "true" : "false"} className={"bc-region" + (on ? " bc-region-on" : "")} onClick={function () { setMany({ region: r.r, settlement: "", settlement_mode: "" }); }}>
                    <img src={img(a)} alt="" /><span className="bc-region-clover"><Icon n="clover" s={20} /></span>
                    <strong>{r.r}</strong><small>{d}</small><span className="bc-radio">{on ? <Icon n="star2" s={12} /> : null}</span>
                  </button>
                );
              })}
            </div>
            {regionObj ? (
              <div>
                <div className="bc-mini-head"><span>Choose a Starting Place</span><small>Select a more specific place to begin your story.</small></div>
                <div className="bc-places" role="radiogroup" aria-label="Starting place">
                  {regionObj.s.concat([{ n: "A place I describe", c: "custom", d: "Describe your own home." }]).map(function (s, i) {
                    var custom = s.c === "custom"; var on = custom ? f.settlement_mode === "custom" : f.settlement === s.n;
                    return (
                      <button key={s.n} type="button" role="radio" aria-checked={on ? "true" : "false"} className={"bc-place" + (on ? " bc-place-on" : "")} onClick={function () { custom ? setMany({ settlement: "Custom place", settlement_mode: "custom" }) : setMany({ settlement: s.n, settlement_mode: s.c }); }}>
                        <img src={img(PLACE_ARTS[i % PLACE_ARTS.length])} alt="" /><span className="bc-place-shade" />
                        <Icon n={custom ? "feather" : s.c === "canon" ? "castle" : "home"} s={22} />
                        <span className="bc-place-text"><strong>{s.n}</strong><small>{custom ? "Custom" : s.c === "canon" ? "Canon" : "Generated"}</small></span>
                        <span className="bc-radio">{on ? <Icon n="star2" s={12} /> : null}</span>
                      </button>
                    );
                  })}
                </div>
                {f.settlement_mode === "custom" ? <textarea className="bc-in bc-ta" style={{ marginTop: 8 }} aria-label="Custom home" placeholder="For example: a tiny mountain village where most families raise sheep" value={f.custom_place} onChange={function (e) { set("custom_place", e.target.value); }} /> : null}
              </div>
            ) : null}
            <div className="bc-about">
              <img src={img("origin_about")} alt="" /><span className="bc-about-shade" />
              <div><span className="bc-about-head"><Icon n="book" s={22} />About Your Origin</span><p>{placeDesc || "Your origin shapes your early experiences — the people you meet, the challenges you face, and the opportunities available to you. It won't limit your journey, but it sets the stage for your first chapter."}</p></div>
            </div>
          </div>
        )}
        <div className="bc-cquote">{"“Where you begin does not decide where you end.”"}<small>{"— Asta"}</small></div>
      </div>
    );
  } else {
    var eraT = ""; ERA_TILES.forEach(function (x) { if (x.v === f.era) eraT = x.t.replace("\n", " "); });
    var place = f.settlement_mode === "custom" ? (str(f.custom_place).slice(0, 60) || "A place you describe") : f.settlement;
    var rows = [
      { k: "Name", v: f.name, pg: 0, i: "bust" }, { k: "Age", v: str(f.age), pg: 0, i: "cal" },
      { k: "Social Origin", v: [f.origin, f.origin_detail].filter(Boolean).join(", "), pg: 1, i: "people" },
      { k: "Magical Leaning", v: f.magic_mode === "Random" ? "Random" : (f.magic_mode === "Choose" ? f.attribute_choice : "Described by you"), pg: 2, i: "star" },
      { k: "Origin Region", v: (f.region ? f.region + ": " : "") + (place || ""), pg: 3, i: "pin" },
      { k: "Opening Preference", v: f.era === "custom" ? f.era_detail : f.opening, pg: 0, i: "book" },
      { k: "Starting Mode", v: eraT, pg: 0, i: "compass" }
    ];
    head = <PanelHead title="Finalize Your Story" sub="Confirm your choices. Your legend is about to begin." />;
    body = (
      <div>
        <div className="bc-final-grid">
          <div className="bc-final-portrait-card">
            <img src={art.portrait || img("final_portrait")} alt="" />
            <div className="bc-final-quote">{"“Not giving up is my magic.”"}<small>{"— Asta"}</small></div>
          </div>
          <Frame className="bc-final-summary" pad="8px 9px">
            <div className="bc-final-summary-head"><strong>Character Summary</strong><button type="button" onClick={function () { go(0); }}><Icon n="quill" s={13} />Edit</button></div>
            {rows.map(function (r) {
              return <button key={r.k} type="button" className="bc-final-row" onClick={function () { go(r.pg); }} aria-label={"Change " + r.k}><Icon n={r.i} s={15} /><span>{r.k}</span><strong>{r.v || "Not set"}</strong></button>;
            })}
          </Frame>
        </div>
        <div className="bc-final-grid">
          <Frame className="bc-final-stats" pad="8px 9px">
            <div className="bc-final-h"><Icon n="chart" s={18} />Initial Stats</div>
            <div className="bc-final-statboxes">
              {[["heart", "Body", "Healthy", "hp"], ["drop", "Mana", "Full", "mp"], ["run", "Stamina", "Full", "st"], ["book", "Will", "Focused", "wl"]].map(function (s) { return <div key={s[1]} className={"bc-final-statbox bc-sb-" + s[3]}><Icon n={s[0]} s={20} /><span>{s[1]}</span><small>{s[2]}</small></div>; })}
            </div>
            <div className="bc-note" style={{ textAlign: "center" }}>Your journey begins with balanced potential. Growth comes through your choices.</div>
          </Frame>
          <Frame className="bc-final-modes" pad="8px 9px">
            <div className="bc-final-h"><Icon n="gear" s={18} />Narrative Mode Options</div>
            {[["leaf", "Natural Simulation", "A living world that moves on its own.", f.talent_mode === "Natural", function (on) { set("talent_mode", on ? "Natural" : "Guided"); }],
              ["book", "Story Guidance", "Receive direction and key story prompts.", f.canon_guidance !== "Off", function (on) { set("canon_guidance", on ? "Balanced" : "Off"); }],
              ["compass", "Sandbox Elements", "Freedom to explore beyond the main story.", f.content_continuity === "Full Official Sandbox", function (on) { set("content_continuity", on ? "Full Official Sandbox" : "Core Canon"); }]].map(function (m) {
              return (
                <div key={m[1]} className="bc-modeopt">
                  <Icon n={m[0]} s={18} /><span><strong>{m[1]}</strong><small>{m[2]}</small></span>
                  <button type="button" role="switch" aria-checked={m[3] ? "true" : "false"} aria-label={m[1]} className={"bc-switch" + (m[3] ? " bc-switch-on" : "")} onClick={function () { m[4](!m[3]); }}><i /></button>
                </div>
              );
            })}
          </Frame>
        </div>
        <button type="button" className="bc-inv-more" aria-expanded={worldOpen ? "true" : "false"} onClick={function () { setWorldOpen(!worldOpen); }}>{worldOpen ? "Hide world settings" : "More world settings"}<Icon n={worldOpen ? "chevd" : "chevr"} s={12} /></button>
        {worldOpen ? (
          <Frame pad="12px 13px" style={{ marginBottom: 10 }}>
            <Field label="Canon guidance" hint="How often chances tied to canon events surface. It never forces anything."><Seg label="Canon guidance" value={f.canon_guidance} options={["Strong", "Balanced", "Light", "Off"]} onChange={function (x) { set("canon_guidance", x); }} /></Field>
            <Field label="Canon participation"><Seg label="Canon participation" value={f.canon_participation} options={["Organic", "Opportunity-Favored"]} onChange={function (x) { set("canon_participation", x); }} /></Field>
            <Field label="Interruptions during time skips"><Seg label="Interruptions" value={f.interruptions} options={["Cinematic", "Balanced", "Simulationist"]} onChange={function (x) { set("interruptions", x); }} /></Field>
            <Field label="Narration length"><Seg label="Narration length" value={f.narrative_density} options={["Concise", "Balanced", "Detailed", "Cinematic"]} onChange={function (x) { set("narrative_density", x); }} /></Field>
            <Field label="Spoilers"><Seg label="Spoilers" value={f.spoiler_level} options={["Anime-safe", "Manga-safe", "Full canon"]} onChange={function (x) { set("spoiler_level", x); }} /></Field>
            <Field label="Content"><Seg label="Content" value={f.content_continuity} options={["Core Canon", "Expanded", "Full Official Sandbox"]} onChange={function (x) { set("content_continuity", x); }} /></Field>
            <Field label="Consequences" hint="Lethal means you can die. Grievous means mortal wounds leave lasting marks instead."><Seg label="Consequences" value={f.consequences} options={["Lethal", "Grievous"]} onChange={function (x) { set("consequences", x); }} /></Field>
          </Frame>
        ) : null}
      </div>
    );
  }
  var bannerUrl = artFor(api, art.art, "banner");
  var kingdom = f.homeland ? kingdomLabel(f.homeland) : "Clover Kingdom";
  return (
    <div className="bc-fill bc-creator">
      <div ref={scRef} className="bc-scroll">
        <Hero bannerUrl={bannerUrl} tagline="A world of magic awaits, your story begins here." kingdom={kingdom} />
        <div className="bc-wrap bc-creator-wrap">
          <Stepper page={page} go={go} />
          <div key={page} className="bc-turn">
            {head}
            {body}
          </div>
          {page === 4 ? <div className="bc-cquote">{"“A single page can change your fate. Now, write the first one.”"}</div> : null}
        </div>
      </div>
      <footer className="bc-creator-foot">
        <div className="bc-wrap">
          {err ? <div role="alert" className="bc-creator-err">{err}</div> : null}
          <div className="bc-creator-foot-row">
            {page > 0 ? <button type="button" className="bc-backcircle" aria-label="Back" disabled={busy} onClick={function () { go(page - 1); }}><Icon n="chevl" s={18} /></button> : null}
            <div style={{ flex: 1 }}>
              {page < 4
                ? <Ribbon label="Next" onClick={next}>Next<Icon n="chevr" s={16} fill="#f8eed2" /></Ribbon>
                : <GreenRibbon label="Begin life" disabled={busy} onClick={commit}>{busy ? "Opening..." : "Begin Life"}</GreenRibbon>}
            </div>
          </div>
        </div>
      </footer>
      {sheet === "appearance" ? <AppearanceSheet api={api} f={f} setMany={setMany} close={function () { setSheet(""); }} portrait={art.portrait} setPortrait={art.setPortrait} hasStore={art.hasStore} mediaError={art.mediaError} /> : null}
      {sheet === "opening" ? <OpeningSheet era={f.era} value={f.opening} onPick={function (o) { set("opening", o); }} close={function () { setSheet(""); }} /> : null}
    </div>
  );
}
