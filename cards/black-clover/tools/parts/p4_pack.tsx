function itemKind(it) {
  var ty = str(it.type).toLowerCase();
  var t = (ty + " " + arr(it.tags).join(" ") + " " + str(it.name)).toLowerCase();
  if (/\bkey\b|quest|letter|document|deed|\bmap\b|badge|insignia|token|\bseal\b|keepsake|heirloom|spell page/.test(t)) return "key";
  if (/^(clothing|weapon|armor|armour|tool|food|container|consumable|potion)$/.test(ty)) return "item";
  if (/material|ingredient|\bore\b|herb|resource|crystal|\bhide\b|pelt|lumber|\bbolt of cloth\b|thread|reagent|component/.test(t)) return "material";
  return "item";
}
var KIND_LABEL = { item: "Item", material: "Material", key: "Key Item" };
function itemIcon(it) {
  var t = (str(it.type) + " " + arr(it.tags).join(" ") + " " + str(it.name)).toLowerCase();
  if (/potion|elixir|tonic|vial/.test(t)) return ["drop", "#d64545"];
  if (/herb|plant|leaf|flower/.test(t)) return ["leaf", "#5fbf5f"];
  if (/crystal|gem|mana stone|magic stone/.test(t)) return ["gem", "#58a6e8"];
  if (/ore|iron|metal|stone/.test(t)) return ["mountain", "#b9bec7"];
  if (/page|scroll|letter|book|document|map/.test(t)) return ["scroll", "#d9b463"];
  if (/food|bread|loaf|meat|ration|fruit|cheese|bun/.test(t)) return ["food", "#e0a35a"];
  if (/sword|blade|knife|dagger|spear|axe|weapon/.test(t)) return ["sword", "#c9ced6"];
  if (/shield|armor|armour|helm/.test(t)) return ["shield", "#c9ced6"];
  if (/satchel|bag|pack|pouch|case|backpack/.test(t)) return ["pack", "#c79a5a"];
  if (/broom/.test(t)) return ["wisp", "#d9b463"];
  if (/clothing|tunic|trousers|boots|cloak|coat|shirt|dress|robe|hat/.test(t)) return ["bust", "#a99bd6"];
  return ["star", "#d9b463"];
}
function PackView(p) {
  var api = p.api, v = api.variables || {}, busy = !!api.isStreaming;
  var inv = bcNormalize(arr(v.inventory), v);
  var carry = bcCarryProfile(inv, obj(v.body_profile), bcWalletProfile(v.money).weightKg);
  var fs = React.useState("all"), filter = fs[0], setFilter = fs[1];
  var ss = React.useState("location"), sort = ss[0], setSort = ss[1];
  var es = React.useState(""), expanded = es[0], setExpanded = es[1];
  var ds = React.useState(false), details = ds[0], setDetails = ds[1];
  var sel = React.useState({}), chosen = sel[0], setChosen = sel[1];
  var msgState = React.useState(''), msg = msgState[0], setMsg = msgState[1];
  var refs = { inventory: React.useRef(null), market: React.useRef(null), bank: React.useRef(null) };
  var focus = p.focus || "inventory";
  React.useEffect(function () { var r = refs[focus]; if (focus !== "inventory" && r && r.current && r.current.scrollIntoView) { try { r.current.scrollIntoView({ block: "start" }); } catch (e) {} } }, [focus]);
  var atHome = !!str(v.home_location) && str(v.home_location) === str(v.current_location);
  var can = !busy && canWrite(api);
  var atSquad = bcAtSquadLocker(v);
  function persist(list, verb, it, kind, minutes) {
    if (!can) return;
    var normalized = bcNormalize(list, v);
    var appearance = bcAppearance(normalized, v);
    var existing = arr(v.equipment_activity);
    var nextId = 'gear-' + (num(v.equipment_event_seq, 0) + 1);
    var line = bcEventText(kind, it, normalized, appearance);
    appearance.lastChangedId = nextId;
    var event = { id: nextId, kind: kind, itemId: it && it.id, item: it && it.name, text: line, location: str(v.current_location), at: str(v.world_time),
      appearance: appearance.coverage, meaningful: kind === 'equip' || kind === 'remove' || kind === 'drop', observed: false };
    var patch = Object.assign({ inventory: normalized, carry_state: bcCarryProfile(normalized, obj(v.body_profile), bcWalletProfile(v.money).weightKg),
      appearance_state: appearance, equipment_activity: existing.concat([event]).slice(-6), equipment_event_seq: num(v.equipment_event_seq, 0) + 1 }, bcClockForInventory(v, minutes == null ? 1 : minutes));
    try {
      var result = typeof api.patchVariables === 'function' ? api.patchVariables(patch) : null;
      if (typeof api.patchVariables !== 'function') Object.keys(patch).forEach(function (k) { api.setVariable(k, patch[k]); });
      setMsg(line);
      if (result && typeof result.catch === 'function') result.catch(function () { setMsg('Inventory update could not be saved.'); });
    } catch (e) { setMsg('Save failed: ' + str(e && e.message || e)); }
  }
  function move(it, dest, caption, qty) {
    var res = bcMoveQty(inv, it.id, dest, v, qty);
    if (!res.ok) { setMsg(res.reason); return; }
    var wasWorn = it.placement && it.placement.kind === 'body';
    var kind = dest.kind === 'body' ? 'equip' : dest.kind === 'world' ? 'drop' : wasWorn ? 'remove' : caption === 'Retrieved' ? 'retrieve' : dest.kind === 'container' ? 'store' : 'move';
    if (dest.kind === 'world' && dest.area === 'home') kind = 'store';
    persist(res.inventory, caption, it, kind, kind === 'equip' || kind === 'remove' ? 2 : 1);
  }
  function useItem(it) {
    if (!bcIsAccessible(it, inv, isTrue(v.in_combat))) { setMsg('You cannot reach that item.'); return; }
    if (bcCanConsume(it) && !isTrue(v.in_combat)) {
      var result = bcConsume(inv, it.id, v);
      if (result.ok) { persist(result.inventory, 'Used', it, 'consume', 4); return; }
      setMsg(result.reason); return;
    }
    setMsg('This needs a story action. Select “Use in story (AI)” to resolve it.');
  }
  function itemActions(it) {
    var pl = it.placement || {}, sp = bcSpec(it), qty = num(it.qty, 1), worn = pl.kind === 'body';
    var carried = bcCarried(it, inv), stored = pl.kind === 'world';
    var easy = bcIsAccessible(it, inv, isTrue(v.in_combat));
    var destinations = carried ? bcDestinations(inv, it) : [];
    var rawSel = chosen[it.id], selKey = destinations.some(function (d) { return JSON.stringify(d.placement) === rawSel; }) ? rawSel : (destinations[0] ? JSON.stringify(destinations[0].placement) : '');
    var selDest = destinations.find(function (d) { return JSON.stringify(d.placement) === selKey; });
    var equippable = bcAllowedSlots(it);
    var inaccessible = stored && !(pl.location === str(v.current_location) || (pl.area === 'home' && atHome));
    return (
      <div className="bc-item-actions">
        <div className="bc-item-facts">{[bcPlaceLabel(inv, it), bcWeight(it) + ' kg', bcBulk(it) + ' bulk', it.cond ? 'Condition: ' + str(it.cond) : ''].filter(Boolean).join(' · ')}</div>
        <div className="bc-item-btns">
          {carried ? <Btn small disabled={!can || !easy} onClick={function () { useItem(it); }}>Use (free)</Btn> : null}
          <Btn small disabled={busy} onClick={function () { setMsg(bcLocalExamine(it, inv)); }}>Examine (free)</Btn>
          {carried ? <Btn small disabled={!can || !easy} onClick={function () { send(api, '[UI:ACT] I use ' + str(it.name) + ' (' + it.id + ') from ' + bcPlaceLabel(inv, it) + '. Resolve effects and witnesses from world state. Do not repeat any already-applied inventory transfer.'); p.toStory(); }}>Use in story (AI)</Btn> : null}
          {carried && equippable.map(function (slot) { return <Btn key={slot} small disabled={!can || (worn && pl.slot === slot)} onClick={function () { move(it, { kind: 'body', slot: slot }, 'Equipped'); }}>{worn && pl.slot === slot ? 'Equipped' : (slot === 'main-hand' || slot === 'off-hand' ? 'Wield · ' : 'Wear · ') + (BC_SLOTS.find(function (x) { return x[0] === slot; }) || ['', slot])[1]}</Btn>; })}
          {worn ? <Btn small disabled={!can} onClick={function () { var spot = bcFindSpot(inv, it); if (!spot) { setMsg('Free room in a bag or your arms before removing this item.'); return; } move(it, spot, 'Removed'); }}>Take off / Sheathe</Btn> : null}
          {stored && !inaccessible ? <Btn small disabled={!can} onClick={function () { var spot = bcFindSpot(inv, it); if (!spot) { setMsg('No free space to retrieve ' + it.name + '.'); return; } move(it, spot, 'Retrieved'); }}>Retrieve</Btn> : null}
          {carried ? <Btn small disabled={!can} onClick={function () { move(it, { kind: 'world', area: 'ground' }, 'Dropped'); }}>Drop</Btn> : null}
          {carried && qty > 1 ? <Btn small disabled={!can} onClick={function () { move(it, { kind: 'world', area: 'ground' }, 'Dropped one', 1); }}>Drop 1</Btn> : null}
          {carried && atHome ? <Btn small disabled={!can} onClick={function () { move(it, { kind: 'world', area: 'home' }, 'Stored at home'); }}>Store at home</Btn> : null}
          {carried && atSquad ? <Btn small disabled={!can} onClick={function () { move(it, { kind: 'world', area: 'storage' }, 'Stored at squad locker'); }}>Squad locker</Btn> : null}
        </div>
        {carried && destinations.length ? (
          <div className="bc-item-move">
            <select aria-label={'Move ' + str(it.name) + ' to'} value={selKey} onChange={function (e) { var n = Object.assign({}, chosen); n[it.id] = e.target.value; setChosen(n); }}>
              {destinations.map(function (d, i) { return <option key={i} value={JSON.stringify(d.placement)}>{d.label}</option>; })}
            </select>
            <Btn small disabled={!can || !selDest} onClick={function () { if (selDest) move(it, selDest.placement, 'Moved'); }}>Move</Btn>
          </div>
        ) : null}
        {sp.storage ? (
          <div className="bc-item-compartments">
            {BC_STORAGE[sp.storage].slots.map(function (slot) {
              var present = inv.filter(function (x) { var xpl = x.placement || {}; return xpl.kind === 'container' && xpl.containerId === it.id && xpl.slotId === slot.id; });
              var load = present.reduce(function (n, x) { return n + bcBulk(x); }, 0), mass = present.reduce(function (n, x) { return n + bcWeight(x); }, 0);
              return <div key={slot.id}><span>{slot.label + ' · ' + slot.access}{present.length ? ' (' + present.map(function (x) { return x.name; }).join(', ') + ')' : ''}</span><b style={{ color: load > slot.bulkCap || mass > slot.weightCap ? '#e7a2a2' : C.muted }}>{Math.round(load * 10) / 10 + '/' + slot.bulkCap + ' bulk'}</b></div>;
            })}
          </div>
        ) : null}
      </div>
    );
  }
  var list = inv.filter(function (it) { return filter === "all" || itemKind(it) === filter; });
  list = list.slice().sort(function (a, b) {
    if (sort === "name") return str(a.name).localeCompare(str(b.name));
    if (sort === "weight") return bcWeight(b) - bcWeight(a);
    if (sort === "type") return itemKind(a).localeCompare(itemKind(b)) || str(a.name).localeCompare(str(b.name));
    return (bcCarried(a, inv) ? 0 : 1) - (bcCarried(b, inv) ? 0 : 1);
  });
  var over = carry.band === 'overloaded' || carry.band === 'immobile';
  var appearance = bcAppearance(inv, v);
  var bank = bcBankState(v.bank_account);
  return (
    <div className="bc-packhub">
      <Frame className="bc-purse" pad="0">
        <img className="bc-purse-art" src={img("purse")} alt="" /><span className="bc-purse-shade" />
        <span className="bc-purse-icon"><Icon n="coins" s={44} /></span>
        <div className="bc-purse-text"><small>Your Purse</small><strong>{num(v.money, 0).toLocaleString() + " Yul"}</strong><span>{bank.open ? "Bank: " + bcMoney(bank.balance) + " on account." : "The coin of the Clover Kingdom."}</span></div>
      </Frame>
      <div className="bc-hubtabs" role="tablist" aria-label="Pack sections">
        {[["inventory", "Inventory", "Items & Materials", "pack"], ["market", "Market", "Buy · Sell · Trade", "coins"], ["bank", "Bank & Treasury", "Save · Deposit · Withdraw", "bank"]].map(function (t) {
          return <button key={t[0]} type="button" role="tab" aria-selected={focus === t[0] ? "true" : "false"} className={"bc-hubtab" + (focus === t[0] ? " bc-hubtab-on" : "")} onClick={function () { p.setFocus(t[0]); var r = refs[t[0]]; if (r.current && r.current.scrollIntoView) { try { r.current.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {} } }}><Icon n={t[3]} s={30} /><span><strong>{t[1]}</strong><small>{t[2]}</small></span></button>;
        })}
      </div>
      <div ref={refs.inventory} />
      <Frame className="bc-inv-panel" pad="0 0 8px">
        <SectionHead art="inv_head" icon="pack" title="Inventory" sub="Items, Materials, and Key Items you carry."
          right={<span className="bc-inv-tools"><span className="bc-capchip">{Math.round(carry.weight * 10) / 10 + " / " + carry.max + " kg"}</span>
            <select aria-label="Sort items" value={sort} onChange={function (e) { setSort(e.target.value); }}><option value="location">Location</option><option value="name">Name</option><option value="weight">Weight</option><option value="type">Type</option></select></span>} />
        <div className="bc-chiprow bc-inv-filters">{[["all", "All"], ["item", "Items"], ["material", "Materials"], ["key", "Key Items"]].map(function (f) { return <Chip key={f[0]} on={filter === f[0]} onClick={function () { setFilter(f[0]); }}>{f[1]}</Chip>; })}</div>
        {msg ? <div role="status" className="bc-inv-msg">{msg}</div> : null}
        <div className="bc-inv-list">
          {list.length ? list.map(function (it) {
            var ic = itemIcon(it); var k = itemKind(it); var open = expanded === it.id;
            return (
              <div key={it.id} className={"bc-invrow-wrap" + (open ? " bc-invrow-open" : "")}>
                <button type="button" className="bc-invrow" aria-expanded={open ? "true" : "false"} onClick={function () { setExpanded(open ? "" : it.id); setMsg(""); }}>
                  <span className="bc-invrow-icon" style={{ color: ic[1] }}><Icon n={ic[0]} s={26} fill={ic[1]} /></span>
                  <span className="bc-invrow-text"><strong>{str(it.name)}</strong><small>{str(it.notes) || bcPlaceLabel(inv, it)}</small></span>
                  <span className="bc-invrow-qty">{"× " + num(it.qty, 1)}</span>
                  <b className={"bc-kind bc-kind-" + k}>{KIND_LABEL[k]}</b>
                  <Icon n={open ? "chevd" : "chevr"} s={13} />
                </button>
                {open ? itemActions(it) : null}
              </div>
            );
          }) : <Empty>{inv.length ? "Nothing of that kind." : "Your hands and pockets are empty."}</Empty>}
        </div>
        <button type="button" className="bc-inv-more" aria-expanded={details ? "true" : "false"} onClick={function () { setDetails(!details); }}>{details ? "Hide load, slots & appearance" : "Load, equipment slots & appearance"}<Icon n={details ? "chevd" : "chevr"} s={12} /></button>
        {details ? (
          <div className="bc-inv-details">
            <div className="bc-loadrow"><span>{'Carry load · ' + carry.band}</span><span>{carry.weight + ' / ' + carry.max + ' kg'}</span></div>
            <div className="bc-loadbar"><i style={{ width: Math.min(100, 100 * carry.weight / Math.max(1, carry.max)) + '%', background: over ? '#ae7060' : undefined }} /></div>
            <div className="bc-note">{'Comfortable ≤ ' + carry.comfortable + ' kg · Heavy ≤ ' + carry.heavy + ' kg · Arms ' + carry.armsBulk + ' / ' + BC_ARMS_BULK + ' bulk · purse ' + bcWalletProfile(v.money).weightKg.toFixed(3) + ' kg'}</div>
            {carry.band !== 'comfortable' ? <div className="bc-note" style={{ color: over ? '#f1b8a8' : C.goldHi }}>{carry.band === 'immobile' ? 'Immobile: drop weight before moving.' : carry.band === 'overloaded' ? 'Overloaded: substantial penalties to travel, dodging and stamina.' : 'Heavy: movement and stamina are impaired.'}</div> : null}
            <H size={15} m="12px 0 4px">Equipment slots</H>
            {BC_SLOTS.map(function (pair) { var eq = inv.find(function (x) { return x.placement && x.placement.kind === 'body' && x.placement.slot === pair[0]; }); return <Row key={pair[0]} k={pair[1]} v={eq ? str(eq.name) : '—'} />; })}
            <H size={15} m="12px 0 4px">Visible appearance</H>
            <div className="bc-note" style={{ color: C.ivory }}>{appearance.summary}</div>
            {appearance.social ? <div className="bc-note">{'Social presentation · ' + appearance.social.outfitTier + ' dress · setting: ' + appearance.social.setting}</div> : null}
            {appearance.coverage !== 'dressed' ? <div className="bc-note" style={{ color: '#e7b5a4' }}>{'Dress: ' + appearance.inadequatelyDressed.join('; ') + '. NPCs may notice if present.'}</div> : null}
            <div className="bc-note">Equipment actions are free (no AI call). Complex uses go through "Use in story".</div>
          </div>
        ) : null}
      </Frame>
      <div ref={refs.market} />
      <div className="bc-hub-lower">
        <MarketView api={api} toStory={p.toStory} embedded={true} />
        <div ref={refs.bank} className="bc-bank-anchor" />
        <BankView api={api} toStory={p.toStory} embedded={true} />
      </div>
    </div>
  );
}
