
// ---------- THE KIT (v21.18) ----------
// The Pack's inventory, rebuilt as Surviving the Game as a Barbarian's Kit on
// Black Clover's own physical engine (bc-inventory.js): reach, body slots with
// compare, bags as tiles with fill bars, Move to… with reasons, what is left
// here, filters, search, sorting, stack splitting and repair warnings. Every
// write still goes through the Pack's persist/move (no AI call).
var BCK_TIERS = [["hand", "In hand", "Already in your grip"], ["worn", "Worn", "On your body"], ["quick", "Quick", "A pocket or holder you reach in a heartbeat"], ["ready", "Ready", "A side pocket: a moment's fumbling"], ["slow", "Slow", "Straps: you have to stop to get it"], ["buried", "Buried", "Deep in a bag: it means taking the bag off"], ["loose", "Loose", "Carried in your arms"]];
var BCK_WORD = { hand: "in hand", worn: "worn", quick: "quick", ready: "ready", slow: "slow", buried: "buried", loose: "loose", away: "not with you" };
var BCK_SHOW_SLOTS = ["main-hand", "off-hand", "grimoire", "head", "cloak", "clothes", "base-upper", "base-lower", "torso", "hands", "feet", "waist", "hip", "back", "accessory"];
function bckTier(it, inv) {
  var p = it.placement || {};
  if (!bcCarried(it, inv)) return "away";
  if (p.kind === "body") return (p.slot === "main-hand" || p.slot === "off-hand" || p.slot === "grimoire") ? "hand" : "worn";
  if (p.kind === "loose") return p.held ? "hand" : "loose";
  if (p.kind === "container") {
    var bag = inv.find(function (x) { return x.id === p.containerId; }), st = bag && bcStorageOf(bag), sl = st && st.slots.find(function (s) { return s.id === p.slotId; });
    return sl ? sl.access : "buried";
  }
  return "away";
}
function bckNeedsRepair(it) { return /damaged|poor|ruined|torn|tattered|broken|cracked|frayed|in need of repair/i.test(str(it.cond || it.condition)); }
function bckUsage(inv, cid, sid) { var b = 0, w = 0; inv.forEach(function (x) { var p = x.placement || {}; if (p.kind === "container" && p.containerId === cid && p.slotId === sid) { b += bcBulk(x); w += bcWeight(x); } }); return { b: Math.round(b * 10) / 10, w: Math.round(w * 10) / 10 }; }
function bckRows(it) {
  var sp = bcSpec(it), t = (str(it.type) + " " + str(it.name)).toLowerCase();
  return [["Weight", bcWeight(it) + " kg", -1, bcWeight(it)], ["Bulk", bcBulk(it), -1, bcBulk(it)], ["Condition", str(it.cond) || "good", 0, null],
    ["Counts as a weapon in a fight", /sword|blade|knife|dagger|spear|axe|mace|staff|club|weapon/.test(t) ? "yes" : "no", 0, null],
    ["Material", str(it.material) || "—", 0, null]].concat(sp.tags.indexOf("clothing") >= 0 ? [["Clothing", "yes", 0, null]] : []);
}

function BcKit(p) {
  var api = p.api, v = p.v, inv = p.inv, can = p.can, busy = !!api.isStreaming, fighting = isTrue(v.in_combat);
  var sS = React.useState(""), sel = sS[0], setSel = sS[1];
  var mS = React.useState(false), moving = mS[0], setMoving = mS[1];
  var pS = React.useState(null), slotPick = pS[0], setSlotPick = pS[1];
  var fS = React.useState("all"), filter = fS[0], setFilter = fS[1];
  var oS = React.useState("place"), sort = oS[0], setSort = oS[1];
  var qS = React.useState(""), q = qS[0], setQ = qS[1];
  var carry = bcCarryProfile(inv, obj(v.body_profile), bcWalletProfile(v.money).weightKg);
  var where = str(v.current_location), atHome = p.atHome, atSquad = p.atSquad;
  var bySlot = {}; inv.forEach(function (x) { var pl = x.placement || {}; if (pl.kind === "body" && !bcStorageOf(x)) bySlot[pl.slot] = x; });
  var bags = inv.filter(function (x) { return !!bcStorageOf(x); });
  var tiers = {}; inv.forEach(function (x) { if (bcStorageOf(x) && (x.placement || {}).kind === "body") return; var t = bckTier(x, inv); if (t !== "away") (tiers[t] = tiers[t] || []).push(x); });
  var here = inv.filter(function (x) { var pl = x.placement || {}; if (pl.kind !== "world") return false; if (pl.area === "ground") return pl.location === where; if (pl.area === "home") return atHome; if (pl.area === "storage") return atSquad && pl.location === where; return false; });
  var elsewhere = inv.filter(function (x) { return (x.placement || {}).kind === "world" && here.indexOf(x) < 0; }).length;
  var repairN = inv.filter(bckNeedsRepair).length;
  var list = inv.filter(function (x) {
    if (filter === "worn" && (x.placement || {}).kind !== "body") return false;
    if (filter === "repair" && !bckNeedsRepair(x)) return false;
    if (filter === "clothing" && bcSpec(x).tags.indexOf("clothing") < 0) return false;
    if (["item", "material", "key"].indexOf(filter) >= 0 && itemKind(x) !== filter) return false;
    if (q && str(x.name).toLowerCase().indexOf(q.toLowerCase()) < 0) return false;
    return true;
  });
  var order = { hand: 0, worn: 1, quick: 2, ready: 3, slow: 4, buried: 5, loose: 6, away: 7 };
  list.sort(function (a, b) {
    if (sort === "name") return str(a.name).localeCompare(str(b.name));
    if (sort === "weight") return bcWeight(b) - bcWeight(a);
    if (sort === "type") return itemKind(a).localeCompare(itemKind(b)) || str(a.name).localeCompare(str(b.name));
    return (order[bckTier(a, inv)] - order[bckTier(b, inv)]) || str(a.name).localeCompare(str(b.name));
  });
  var over = carry.band === "overloaded" || carry.band === "immobile";
  function pct(x) { return Math.min(100, x / Math.max(1, carry.max) * 100); }
  function close() { setSel(""); setMoving(false); }
  function takeOff(it) { var spot = bcFindSpot(inv, it); if (!spot) { p.setMsg("Free room in a bag or your arms before taking off " + str(it.name) + "."); return; } p.move(it, spot, "Removed"); close(); }
  function retrieve(it) { var spot = bcFindSpot(inv, it); if (!spot) { p.setMsg("No free space to take " + str(it.name) + "."); return; } p.move(it, spot, "Retrieved"); }

  var it = sel ? inv.find(function (x) { return x.id === sel; }) : null;
  var sheet = null;
  if (it) {
    var pl = it.placement || {}, st = bcStorageOf(it), tier = bckTier(it, inv), carried = bcCarried(it, inv), worn = pl.kind === "body";
    var slots = bcAllowedSlots(it), rival = !worn && slots.length ? bySlot[slots.filter(function (s) { return !bySlot[s]; })[0] || slots[0]] : null;
    if (rival && rival.id === it.id) rival = null;
    var others = inv.filter(function (x) { return x.id !== it.id; }), targets = [];
    bags.forEach(function (b) { bcStorageOf(b).slots.forEach(function (sl) {
      var dest = { kind: "container", containerId: b.id, slotId: sl.id }, inHere = pl.kind === "container" && pl.containerId === b.id && pl.slotId === sl.id;
      var f = (b.placement || {}).kind === "body" ? bcFits(others, it, dest) : { ok: false, reason: "Wear the bag first." };
      targets.push({ b: b, sl: sl, dest: dest, ok: f.ok && !inHere && carried, why: inHere ? "It is already here." : !carried ? "You are not carrying it." : f.reason, u: bckUsage(inv, b.id, sl.id) });
    }); });
    targets.sort(function (a, b) { return (b.ok ? 1 : 0) - (a.ok ? 1 : 0); });
    var mine = bckRows(it), theirs = rival ? bckRows(rival) : null;
    var reachable = bcIsAccessible(it, inv, fighting);
    sheet = <Sheet title={str(it.name) + (num(it.qty, 1) > 1 ? " × " + num(it.qty, 1) : "")} onClose={close}>
      <div className="bck-facts">{[bcPlaceLabel(inv, it), "reach: " + BCK_WORD[tier], bcWeight(it) + " kg", bcBulk(it) + " bulk"].join(" · ")}</div>
      {str(it.notes) ? <p className="bck-prose">{str(it.notes)}</p> : null}
      {fighting && carried && !reachable ? <div className="bck-warn">{"In a fight this is " + BCK_WORD[tier] + ": you can't reach it until you dig it out."}</div> : null}
      {bckNeedsRepair(it) ? <div className="bck-warn">{"Condition: " + str(it.cond) + ". It wants mending before it fails you."}</div> : null}
      {theirs ? <div className="bck-cmp"><div className="bck-cmp-head"><span>Compared with what you wear</span><b>{str(rival.name)}</b></div>
        {mine.map(function (r) { var o = theirs.find(function (x) { return x[0] === r[0]; }); var d = o && r[3] != null && o[3] != null ? Math.round((r[3] - o[3]) * 100) / 100 : null; var tone = d === null || d === 0 || !r[2] ? "" : (d * r[2] > 0 ? "up" : "down");
          return <div key={r[0]} className={"bck-cmp-row " + tone}><span>{r[0]}</span><b>{String(r[1])}</b><small>{o ? String(o[1]) : "—"}</small><em>{d === null || d === 0 ? "" : (d > 0 ? "+" : "") + d}</em></div>; })}</div>
        : <div className="bck-stats">{mine.map(function (r) { return <div key={r[0]}><small>{r[0]}</small><b>{String(r[1])}</b></div>; })}</div>}
      <div className="bck-acts">
        {carried && slots.map(function (slot) { return <Btn key={slot} small kind={!worn ? "gold" : undefined} disabled={!can || (worn && pl.slot === slot)} onClick={function () { p.move(it, { kind: "body", slot: slot }, "Equipped"); close(); }}>{worn && pl.slot === slot ? "Worn" : (slot === "off-hand" ? "Equip in off hand" : st ? "Put on" : rival && bySlot[slot] ? "Equip (replaces " + str(bySlot[slot].name) + ")" : "Equip")}</Btn>; })}
        {worn ? <Btn small disabled={!can} onClick={function () { takeOff(it); }}>{st ? "Take off" : "Take off / Sheathe"}</Btn> : null}
        {carried && !st ? <Btn small disabled={!can || !reachable} onClick={function () { p.useItem(it); }}>Use (free)</Btn> : null}
        {carried && !st ? <Btn small disabled={!can || !reachable} onClick={function () { close(); send(api, "[UI:ACT] I use " + str(it.name) + " (" + it.id + ") from " + bcPlaceLabel(inv, it) + ". Resolve effects and witnesses from world state. Do not repeat any already-applied inventory change."); if (p.toStory) p.toStory(); }}>Use in story (AI)</Btn> : null}
        {carried && !st && !worn ? <Btn small active={moving} disabled={!can} onClick={function () { setMoving(!moving); }}>Move to…</Btn> : null}
        {carried && num(it.qty, 1) > 1 && !st ? <Btn small disabled={!can} onClick={function () { p.move(it, { kind: "loose", held: true }, "Split off", Math.floor(num(it.qty, 1) / 2)); close(); }}>{"Split " + Math.floor(num(it.qty, 1) / 2)}</Btn> : null}
        {pl.kind === "world" && here.indexOf(it) >= 0 ? <Btn small kind="gold" disabled={!can} onClick={function () { retrieve(it); close(); }}>Take it</Btn> : null}
        {carried ? <Btn small disabled={!can} onClick={function () { p.move(it, { kind: "world", area: "ground" }, num(it.qty, 1) > 1 ? "Dropped one" : "Dropped", num(it.qty, 1) > 1 ? 1 : undefined); close(); }}>{num(it.qty, 1) > 1 ? "Drop 1" : "Drop"}</Btn> : null}
        {carried && atHome ? <Btn small disabled={!can} onClick={function () { p.move(it, { kind: "world", area: "home" }, "Stored at home"); close(); }}>Store at home</Btn> : null}
        {carried && atSquad ? <Btn small disabled={!can} onClick={function () { p.move(it, { kind: "world", area: "storage" }, "Stored at squad locker"); close(); }}>Squad locker</Btn> : null}
        <Btn small disabled={busy} onClick={function () { p.setMsg(bcLocalExamine(it, inv)); close(); }}>Examine (free)</Btn>
      </div>
      {moving ? <div className="bck-moves">
        {(function () { var best = bcFindSpot(inv.filter(function (x) { return x.id !== it.id; }), it, true); return best ? <button type="button" className="bck-move ok" onClick={function () { p.move(it, best, "Moved"); close(); }}><b>Best free place</b><small>The quickest pocket that fits</small></button> : null; })()}
        {!(pl.kind === "loose" && pl.held) ? <button type="button" className="bck-move ok" onClick={function () { p.move(it, { kind: "loose", held: true }, "Moved"); close(); }}><b>Hold in your hands</b><small>Arms carry {BC_ARMS_BULK} bulk at most</small></button> : null}
        {targets.map(function (t) { return <button key={t.b.id + t.sl.id} type="button" className={"bck-move" + (t.ok ? " ok" : "")} disabled={!t.ok} onClick={function () { p.move(it, t.dest, "Moved"); close(); }}>
          <b>{str(t.b.name) + " · " + t.sl.label}</b><small>{t.ok ? t.sl.access + " · room " + t.u.b + "/" + t.sl.bulkCap + " · weight " + t.u.w + "/" + t.sl.weightCap + " kg" : "Won't fit: " + t.why}</small></button>; })}
      </div> : null}
    </Sheet>;
  }
  var slotSheet = null;
  if (slotPick) {
    var fits = inv.filter(function (x) { return bcCarried(x, inv) && (x.placement || {}).kind !== "body" && bcAllowedSlots(x).indexOf(slotPick[0]) >= 0; });
    slotSheet = <Sheet title={slotPick[1]} onClose={function () { setSlotPick(null); }}>
      {fits.length ? fits.map(function (x) { return <button key={x.id} type="button" className="bck-move ok" onClick={function () { setSlotPick(null); setSel(x.id); }}><b>{str(x.name)}</b><small>{bcPlaceLabel(inv, x) + " · tap to compare and equip"}</small></button>; }) : <Empty>Nothing you carry goes there.</Empty>}
    </Sheet>;
  }
  return <Frame className="bc-inv-panel bck" pad="0 0 10px">
    <SectionHead art="inv_head" icon="pack" title="Inventory" sub="Everything you own, and where it is." right={<span className={"bc-capchip" + (carry.band !== "comfortable" ? " bc-crit" : "")}>{Math.round(carry.weight * 10) / 10 + " / " + carry.max + " kg"}</span>} />
    {p.msg ? <div role="status" className="bc-inv-msg">{p.msg}</div> : null}
    <div className="bck-sec">
      <div className="bck-load"><i className={over ? "bad" : carry.band === "heavy" ? "warn" : "ok"} style={{ width: pct(carry.weight) + "%" }} /><span style={{ left: pct(carry.comfortable) + "%" }} /><span className="h" style={{ left: pct(carry.heavy) + "%" }} /></div>
      <div className="bck-loadnums"><span>{"Load · " + carry.band}</span><span>{"Comfortable ≤ " + carry.comfortable + " kg"}</span><span>{"Heavy ≤ " + carry.heavy}</span><span>{"Arms " + carry.armsBulk + "/" + BC_ARMS_BULK + " bulk"}</span></div>
    </div>
    <div className="bck-sec"><div className="bck-h"><b>Reach</b><small>How fast you can get at each thing</small></div>
      {fighting ? <div className="bck-warn">In a fight, only what is in hand, worn, or in a quick or ready pocket can be used at once.</div> : null}
      {BCK_TIERS.map(function (t) { var xs = tiers[t[0]] || []; if (!xs.length) return null; return <div key={t[0]} className={"bck-tier t-" + t[0]}><div className="bck-tier-h"><b>{t[1]}</b><small>{t[2]}</small></div><div className="bck-chips">{xs.map(function (x) { var ic = itemIcon(x); return <button key={x.id} type="button" className="bck-chip" onClick={function () { setSel(x.id); setMoving(false); }}><span style={{ color: ic[1] }}><Icon n={ic[0]} s={15} fill={ic[1]} /></span>{str(x.name)}{num(x.qty, 1) > 1 ? " ×" + num(x.qty, 1) : ""}</button>; })}</div></div>; })}
    </div>
    <div className="bck-sec"><div className="bck-h"><b>Equipped</b><small>Tap an empty slot to fill it</small></div>
      <div className="bck-slots">{BC_SLOTS.filter(function (s) { return BCK_SHOW_SLOTS.indexOf(s[0]) >= 0 || bySlot[s[0]]; }).map(function (s) { var x = bySlot[s[0]]; return <button key={s[0]} type="button" className={"bck-slot" + (x ? " full" : "") + (x && bckNeedsRepair(x) ? " worn" : "")} onClick={function () { if (x) setSel(x.id); else setSlotPick(s); }}><small>{s[1]}</small><b>{x ? str(x.name) : "—"}</b></button>; })}</div>
    </div>
    <div className="bck-sec"><div className="bck-h"><b>Bags</b><small>{bags.filter(function (b) { return (b.placement || {}).kind === "body"; }).length + " worn"}</small></div>
      {bags.length ? null : <Empty>No satchel, pouch, holster or quiver. Whatever you own is in your hands.</Empty>}
      {bags.map(function (b) { var bst = bcStorageOf(b), bworn = (b.placement || {}).kind === "body"; return <div key={b.id} className={"bck-bag" + (bworn ? "" : " off")}>
        <div className="bck-bag-h"><div><b>{str(b.name)}</b><small>{bst.label + " · " + (bworn ? "worn" : bcPlaceLabel(inv, b))}</small></div>
          {bcCarried(b, inv) ? <Btn small disabled={!can} onClick={function () { if (bworn) takeOff(b); else { var sl = bcAllowedSlots(b)[0]; if (sl) p.move(b, { kind: "body", slot: sl }, "Equipped"); } }}>{bworn ? "Take off" : "Put on"}</Btn> : null}</div>
        <div className="bck-comps">{bst.slots.map(function (sl) { var u = bckUsage(inv, b.id, sl.id), occ = inv.filter(function (x) { var xp = x.placement || {}; return xp.kind === "container" && xp.containerId === b.id && xp.slotId === sl.id; });
          return <div key={sl.id} className={"bck-comp a-" + sl.access}><div className="bck-comp-h"><b>{sl.label}</b><em>{sl.access}</em></div>
            <div className="bck-fill"><small>room</small><i><i style={{ width: Math.min(100, u.b / sl.bulkCap * 100) + "%" }} /></i><span>{u.b + "/" + sl.bulkCap}</span></div>
            <div className="bck-fill w"><small>weight</small><i><i style={{ width: Math.min(100, u.w / sl.weightCap * 100) + "%" }} /></i><span>{u.w + "/" + sl.weightCap}</span></div>
            <div className="bck-chips">{occ.length ? occ.map(function (x) { return <button key={x.id} type="button" className="bck-chip" onClick={function () { setSel(x.id); setMoving(false); }}>{str(x.name)}{num(x.qty, 1) > 1 ? " ×" + num(x.qty, 1) : ""}</button>; }) : <span className="bck-empty">empty</span>}</div></div>; })}</div></div>; })}
    </div>
    <div className="bck-sec"><div className="bck-h"><b>Everything you own</b><small>{inv.length + " things" + (elsewhere ? " · " + elsewhere + " left elsewhere" : "")}</small></div>
      <div className="bc-chiprow">{[["all", "All"], ["worn", "Worn"], ["item", "Items"], ["material", "Materials"], ["key", "Key Items"], ["clothing", "Clothing"], ["repair", "Needs mending"]].map(function (f) { if (f[0] === "repair" && !repairN) return null; return <Chip key={f[0]} on={filter === f[0]} onClick={function () { setFilter(f[0]); }}>{f[1] + (f[0] === "repair" ? " " + repairN : "")}</Chip>; })}</div>
      <div className="bck-tools"><input className="bck-search" value={q} placeholder="Find…" aria-label="Find an item" onChange={function (e) { setQ(e.target.value); }} />
        <select className="bck-sort" aria-label="Sort items" value={sort} onChange={function (e) { setSort(e.target.value); }}><option value="place">By reach</option><option value="name">Name</option><option value="weight">Heaviest</option><option value="type">Type</option></select></div>
      <div className="bc-inv-list">{list.length ? list.map(function (x) { var ic = itemIcon(x), k = itemKind(x); return <button key={x.id} type="button" className={"bc-invrow bck-row" + (bckNeedsRepair(x) ? " worn" : "")} onClick={function () { setSel(x.id); setMoving(false); }}>
        <span className="bc-invrow-icon" style={{ color: ic[1] }}><Icon n={ic[0]} s={24} fill={ic[1]} /></span>
        <span className="bc-invrow-text"><strong>{str(x.name)}</strong><small>{bcPlaceLabel(inv, x) + " · " + BCK_WORD[bckTier(x, inv)]}</small></span>
        <span className="bc-invrow-qty">{"× " + num(x.qty, 1)}</span><b className={"bc-kind bc-kind-" + k}>{KIND_LABEL[k]}</b></button>; }) : <Empty>{inv.length ? "Nothing matches." : "Your hands and pockets are empty."}</Empty>}</div>
    </div>
    <div className="bck-sec"><div className="bck-h"><b>{atHome ? "At home" : atSquad ? "Here and in your locker" : "Left here"}</b><small>{where || "—"}</small></div>
      {here.length ? here.map(function (x) { return <div key={x.id} className="bck-here"><span>{str(x.name) + (num(x.qty, 1) > 1 ? " ×" + num(x.qty, 1) : "")}<small>{bcPlaceLabel(inv, x)}</small></span><Btn small disabled={!can} onClick={function () { retrieve(x); }}>Take it</Btn></div>; }) : <Empty>Nothing of yours is lying here.</Empty>}
    </div>
    {sheet}{slotSheet}
  </Frame>;
}
