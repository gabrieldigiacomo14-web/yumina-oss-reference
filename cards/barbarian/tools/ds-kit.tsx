
// ==== ds-kit.tsx — THE KIT (v22) =================================
// The physical inventory, rebuilt around the same idea it always had: every
// object is one real thing that is somewhere — worn, in a named pocket of a
// named bag, loose in the hands, or on the ground. New: bags as tiles with
// fill bars, "Move to…" that lists only the places an item fits (and says why
// the others don't), a quick-draw belt sorted by how fast you can reach a
// thing, body slots with compare-before-equip, pick-up from the ground,
// filters, sorting, stack splitting and repair warnings. All writes go
// through the same helpers the rest of the interface uses.

var KIT_TIERS = [
  ["immediate", "In hand", "Already in your grip"],
  ["ready", "On the body", "Worn or strapped on"],
  ["quick", "Quick", "A pocket or holder you can reach in a heartbeat"],
  ["readyc", "Ready", "A side pocket or pouch: a moment's fumbling"],
  ["slow", "Slow", "Straps and holders: you have to stop to get it"],
  ["buried", "Buried", "Deep in the pack: it means taking the pack off"],
  ["awkward", "Loose", "Carried in your arms or stuffed anywhere"],
];
var KIT_ACCESS_WORD = { immediate: "in hand", ready: "ready", quick: "quick", slow: "slow", buried: "buried", awkward: "loose", none: "out of reach" };
var KIT_BLOCKED_IN_FIGHT = { buried: 1, slow: 1, awkward: 1, none: 1 };
var KIT_FILTERS = [["all", "All"], ["worn", "Worn"], ["weapons", "Weapons"], ["armor", "Armour"], ["food", "Food & drink"], ["tools", "Tools"], ["loot", "Loot & other"], ["repair", "Needs repair"]];
var KIT_SORTS = [["place", "By place"], ["name", "Name"], ["weight", "Heaviest"], ["worth", "Worth"]];

function kitCap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
function kitW(it) { return Math.max(0, Number(it && it.weight) || 0) * Math.max(1, Number(it && it.qty) || 1); }
function kitDurPct(it) {
  return it && typeof it.durability === "number" && typeof it.maxDurability === "number" && it.maxDurability > 0
    ? Math.max(0, Math.min(100, Math.round(it.durability / it.maxDurability * 100))) : null;
}
function kitNeedsRepair(it) { var p = kitDurPct(it); return p !== null && p < 35; }
function kitIngestKind(it) {
  if (!it) return "";
  var n = (String(it.name || "") + " " + String(it.type || "")).toLowerCase();
  if (it.container && it.container.resource === "water") return "drink";
  var ef = it.effects && typeof it.effects === "object" ? it.effects : {};
  var per = ef.effectPerPortion && typeof ef.effectPerPortion === "object" ? ef.effectPerPortion : ef;
  if (typeof per.hydration === "number" && typeof per.hunger !== "number") return "drink";
  if (typeof per.hunger === "number") return "eat";
  if (/\b(food|bread|loaf|ration|rations|meat|jerky|fruit|vegetable|stew|soup|meal|cheese|fish|mushroom)\b/.test(n)) return "eat";
  if (/\b(water|waterskin|drink|juice|tea|coffee|milk|broth|ale|beer|wine|cider)\b/.test(n)) return "drink";
  return "";
}
function kitInferredIngest(it) {
  var n = (String(it.name || "") + " " + String(it.type || "")).toLowerCase();
  if (/\b(loaf|bread)\b/.test(n)) return { hunger: 20 };
  if (/\b(ration|rations)\b/.test(n)) return { hunger: 25 };
  if (/\b(jerky|dried meat)\b/.test(n)) return { hunger: 18 };
  if (/\b(meal|stew)\b/.test(n)) return { hunger: 40 };
  if (/\b(fruit)\b/.test(n)) return { hunger: 12, hydration: 4 };
  if (/\b(soup|broth)\b/.test(n)) return { hunger: 20, hydration: 12 };
  if (/\b(water)\b/.test(n) && !(it.container && it.container.resource === "water")) return { hydration: 20 };
  if (/\b(juice|milk|tea)\b/.test(n)) return { hydration: 18 };
  return null;
}
function kitKind(it) {
  if (!it) return "loot";
  if (it.weapon && typeof it.weapon === "object") return "weapons";
  if ((it.armor && typeof it.armor === "object") || /shield|helm|armou?r|cuirass|mail|greave|gauntlet|boot/.test(String(it.name || "").toLowerCase())) return "armor";
  if (kitIngestKind(it) || /potion|tonic|salve|bandage|draught/.test(String(it.name || "").toLowerCase())) return "food";
  if (storageProfileFor(it) || /tool|rope|torch|lantern|flint|pick|hammer|bedroll|blanket|kit/.test((String(it.name || "") + " " + String(it.type || "")).toLowerCase())) return "tools";
  return "loot";
}
// Where a thing is, in words.
function kitPlaceLabel(it, items) {
  var p = physicalPlacement(it);
  if (it.equipped) return (PIECE_SLOTS_panel.concat(AUX_SLOTS_panel).filter(function (x) { return x[0] === it.slot; })[0] || [0, kitCap(it.slot)])[1];
  if (p.kind === "container") {
    var c = byId(items, p.containerId), sp = c && storageProfileFor(c), sl = sp && sp.slots.filter(function (s) { return s.id === p.slotId; })[0];
    return (c ? c.name : "a container") + (sl ? " · " + kitCap(String(sl.label).toLowerCase()) : "");
  }
  if (p.kind === "world") return "On the ground";
  if (storageProfileFor(it)) return "Not worn";
  return "Loose";
}
function kitTierOf(it, items) {
  var t = itemAccessTier(it, items);
  if (t === "ready" && physicalPlacement(it).kind === "container") return "readyc";
  return t;
}
// An unequipped item never keeps a body placement; an equipped one never stays "in a pack".
function kitFixPlacement(list) {
  return list.map(function (x) {
    var p = physicalPlacement(x);
    if (x.equipped && isWearable(x.slot) && !storageProfileFor(x) && p.kind !== "body" && p.kind !== "hand") return Object.assign({}, x, { placement: { kind: "body", slot: x.slot } });
    if (!x.equipped && p.kind === "body") return Object.assign({}, x, { placement: { kind: "loose" } });
    return x;
  });
}
// The numbers a fighter actually compares.
function kitStatRows(it) {
  var rows = [];
  var wp = it && it.weapon && typeof it.weapon === "object" ? it.weapon : null;
  var ar = it && it.armor && typeof it.armor === "object" ? it.armor : null;
  if (wp) {
    [["power", "Power", 1], ["reach", "Reach", 1], ["speed", "Speed", 1], ["handling", "Handling", 1], ["armorPenetration", "Armour piercing", 1], ["critBias", "Critical bias", 1], ["staminaCost", "Stamina use", -1], ["hands", "Hands", 0]]
      .forEach(function (r) { if (wp[r[0]] !== undefined && wp[r[0]] !== null && wp[r[0]] !== "") rows.push([r[1], wp[r[0]], r[2]]); });
    if (wp.damageType) rows.push(["Damage", kitCap(wp.damageType), 0]);
  }
  if (ar) {
    var pr = ar.protection && typeof ar.protection === "object" ? ar.protection : {};
    ["blunt", "slash", "pierce"].forEach(function (k) { if (pr[k] !== undefined) rows.push([kitCap(k) + " protection", pr[k], 1]); });
    if (ar.block !== undefined) rows.push(["Block", ar.block, 1]);
    if (ar.mobility !== undefined) rows.push(["Mobility", ar.mobility, 1]);
    if (ar.stamina !== undefined) rows.push(["Stamina burden", ar.stamina, -1]);
    if (Array.isArray(ar.coverage) && ar.coverage.length) rows.push(["Covers", ar.coverage.join(", "), 0]);
  }
  rows.push(["Weight", Number(it && it.weight) || 0, -1]);
  var d = kitDurPct(it); if (d !== null) rows.push(["Durability", d + "%", 0]);
  return rows;
}
function kitCompare(cand, worn) {
  var a = {}, b = {};
  kitStatRows(cand).forEach(function (r) { a[r[0]] = r; });
  kitStatRows(worn).forEach(function (r) { b[r[0]] = r; });
  var keys = Object.keys(a).concat(Object.keys(b).filter(function (k) { return !a[k]; }));
  return keys.map(function (k) {
    var x = a[k], y = b[k], better = (x || y)[2];
    var nx = x && typeof x[1] === "number" ? x[1] : null, ny = y && typeof y[1] === "number" ? y[1] : null;
    var delta = nx !== null && ny !== null ? Math.round((nx - ny) * 10) / 10 : null;
    var tone = delta === null || delta === 0 || !better ? "" : (delta * better > 0 ? "up" : "down");
    return { label: k, mine: x ? x[1] : "—", worn: y ? y[1] : "—", delta: delta, tone: tone };
  });
}

function KitScreen(props) {
  var api = useYumina();
  var v = api.variables || {};
  var items = normalizeList(v["inventory"]);
  var numbered = arr_panel(v["numbered-items"]);
  var here = String(v["location"] || "");
  var ground = arr_panel(v["ground-items"]).filter(function (g) { var p = g && g.placement || {}; return String(p.location || "") === here; });
  var fighting = obj_panel(v["encounter-state"]).active === true;
  var load = physicalCarryProfile(v, items);
  var selS = React.useState(null), sel = selS[0], setSel = selS[1];
  var slotPickS = React.useState(null), slotPick = slotPickS[0], setSlotPick = slotPickS[1];
  var filterS = React.useState("all"), filter = filterS[0], setFilter = filterS[1];
  var sortS = React.useState("place"), sort = sortS[0], setSort = sortS[1];
  var qS = React.useState(""), q = qS[0], setQ = qS[1];
  var moveS = React.useState(false), moving = moveS[0], setMoving = moveS[1];
  var noteS = React.useState(""), note = noteS[0], setNote = noteS[1];

  function say(msg) { setNote(msg); try { api.showToast && api.showToast(msg, "info"); } catch (e) {} }
  // Every physical change: write the list, refresh the carry state, tell the GM it already happened.
  function write(next, msg) {
    var fixed = kitFixPlacement(next);
    api.setVariable("inventory", fixed);
    api.setVariable("carry-state", physicalCarryProfile(v, fixed));
    if (msg) api.injectContext("[UI PHYSICAL ACTION — ALREADY APPLIED] " + msg + " Inventory placement is authoritative; do not narrate a duplicate transfer.", { role: "system" });
  }
  function equip(id) {
    var it = byId(items, id); if (!it) return;
    var sp = storageProfileFor(it);
    if (sp) {
      var next = items.map(function (x) {
        if (x.id === id) return Object.assign({}, x, { equipped: true, slot: sp.equipSlot, placement: { kind: "body", slot: sp.equipSlot } });
        if (x.equipped === true && x.slot === sp.equipSlot && storageProfileFor(x)) return Object.assign({}, x, { equipped: false, placement: { kind: "loose" } });
        return x;
      });
      write(next, "The player put on " + it.name + ".");
      return;
    }
    if (!isWearable(it.slot)) return;
    var bumped = items.filter(function (x) { return x.id !== id && x.equipped && equipmentKey(x) === equipmentKey(it); });
    var nx = setEquipped(items, id, true).map(function (x) { return x.id === id ? Object.assign({}, x, { placement: { kind: "body", slot: x.slot } }) : x; });
    var off = bumped.filter(function (b) { var n = byId(nx, b.id); return n && !n.equipped; });
    write(nx, "The player equipped " + it.name + " (" + it.slot + ")" + (off.length ? ", taking off " + off.map(function (b) { return b.name; }).join(", ") + ", now carried loose" : "") + ".");
  }
  function unequip(id) {
    var it = byId(items, id); if (!it) return;
    if (storageProfileFor(it)) {
      write(items.map(function (x) { return x.id === id ? Object.assign({}, x, { equipped: false, placement: { kind: "loose" } }) : x; }), "The player took off " + it.name + "; its contents stayed inside it.");
      return;
    }
    write(setEquipped(items, id, false).map(function (x) { return x.id === id ? Object.assign({}, x, { placement: { kind: "loose" } }) : x; }), "The player removed " + it.name + "; it is now carried loose.");
  }
  function place(id, cid, sid) {
    var it = byId(items, id), c = byId(items, cid), sp = c && storageProfileFor(c), sl = sp && sp.slots.filter(function (s) { return s.id === sid; })[0];
    if (!it || !c || !sl) return;
    var t = canPlaceInContainer(items, it, c, sl);
    if (!t.ok) { say("Can't stow " + it.name + ": " + t.why + "."); return; }
    var next = items.map(function (x) { return x.id === id ? Object.assign({}, x, { equipped: false, placement: { kind: "container", containerId: cid, slotId: sid } }) : x; });
    write(next, "The player put " + it.name + " into " + c.name + " — " + sl.label + ".");
    setMoving(false); say(it.name + " → " + c.name + ", " + kitCap(String(sl.label).toLowerCase()) + ".");
  }
  function holdLoose(id) {
    var it = byId(items, id); if (!it) return;
    var tier = itemAccessTier(it, items);
    write(items.map(function (x) { return x.id === id ? Object.assign({}, x, { equipped: false, placement: { kind: "loose" } }) : x; }), "The player took " + it.name + " out (" + tier + " access) and is now holding it loose.");
    setMoving(false);
  }
  function autoStow(id) {
    var it = byId(items, id); if (!it) return;
    var t = firstAutoStorageSlot(items, it);
    if (!t) { say("Nothing you are wearing can take " + it.name + "."); return; }
    place(id, t.container.id, t.slot.id);
  }
  function drop(id) {
    var it = byId(items, id); if (!it) return;
    var dropped = Object.assign({}, it, { qty: 1, equipped: false, placement: { kind: "world", location: here || "unknown" } });
    api.setVariable("ground-items", arr_panel(v["ground-items"]).concat([dropped]).slice(-120));
    write(removeItem(items, id, 1), "The player dropped one " + it.name + " at " + (here || "the current location") + ". The exact object is now in ground-items and no longer follows the player.");
    setSel(null);
  }
  function pickUp(g) {
    var all = arr_panel(v["ground-items"]); var ix = all.indexOf(g); if (ix < 0) return;
    var obj = normalizeItem(Object.assign({}, g, { equipped: false, placement: { kind: "loose" } }), 0);
    var t = firstAutoStorageSlot(items, obj);
    if (t) obj.placement = { kind: "container", containerId: t.container.id, slotId: t.slot.id };
    api.setVariable("ground-items", all.filter(function (_, j) { return j !== ix; }));
    write(items.concat([obj]), "The player picked up " + obj.name + " from the ground at " + (here || "the current location") + (t ? " and put it in " + t.container.name + " — " + t.slot.label : " and is holding it loose") + ".");
    say("Picked up " + obj.name + (t ? " → " + t.container.name : " (loose)") + ".");
  }
  function split(id, n) {
    var it = byId(items, id); if (!it || it.qty < 2) return;
    var take = Math.max(1, Math.min(it.qty - 1, n));
    var piece = Object.assign({}, it, { id: makeId("it"), qty: take, equipped: false, placement: { kind: "loose" } });
    var next = items.map(function (x) { return x.id === id ? Object.assign({}, x, { qty: x.qty - take }) : x; }).concat([piece]);
    write(next, "The player split " + take + " " + it.name + " off the stack; that portion is now held loose.");
    setSel(piece.id); say("Split " + take + " off — the new stack is held loose.");
  }
  function use(id) {
    var it = byId(items, id); if (!it) return;
    var access = itemAccessTier(it, items);
    if (fighting && KIT_BLOCKED_IN_FIGHT[access]) {
      say(it.name + " is " + KIT_ACCESS_WORD[access] + " — get it out first.");
      api.injectContext("[UI] " + it.name + " is " + access + " access from its actual placement. It cannot be used instantly in combat; retrieve it first.", { role: "system" });
      return;
    }
    var effects = it.effects && typeof it.effects === "object" ? it.effects : {};
    var ingest = kitIngestKind(it), inferred = kitInferredIngest(it);
    var next = items.slice(), idx = indexOfId(next, id); if (idx < 0) return;
    var live = Object.assign({}, next[idx]);
    function c100(x) { return Math.max(0, Math.min(100, x)); }
    var hunger = num_panel(v["hunger"], 100), hyd = num_panel(v["hydration"], num_panel(v["thirst"], 100)), sta = num_panel(v["stamina"], 100), con = num_panel(v["condition"], 100);
    var changed = [], consumed = false;
    if (live.container && live.container.resource === "water") {
      var c = Object.assign({}, live.container), avail = Math.max(0, num_panel(c.current, 0)), dr = Math.min(avail, Math.max(0, 100 - hyd));
      if (dr > 0) { hyd += dr; c.current = avail - dr; live.container = c; next[idx] = live; api.setVariable("hydration", c100(hyd)); api.setVariable("thirst", c100(hyd)); changed.push("hydration +" + dr); consumed = true; }
      else { say(avail <= 0 ? "The " + it.name + " is empty." : "You're not thirsty."); return; }
    } else {
      var per = effects.effectPerPortion && typeof effects.effectPerPortion === "object" ? effects.effectPerPortion : effects;
      if ((!per || Object.keys(per).length === 0) && inferred) per = inferred;
      var portions = effects.portionsCurrent != null ? Math.max(0, Math.floor(num_panel(effects.portionsCurrent, 0))) : null;
      if (portions !== null && portions > 0) { live.effects = Object.assign({}, effects, { portionsCurrent: portions - 1 }); next[idx] = live; consumed = true; }
      else if (live.type === "consumable" || ingest === "eat" || ingest === "drink") { next = removeItem(next, id, 1); consumed = true; }
      if (consumed) {
        if (typeof per.hunger === "number") { var a1 = Math.max(0, Math.min(per.hunger, 100 - hunger)); hunger += a1; api.setVariable("hunger", c100(hunger)); changed.push("hunger +" + a1); }
        if (typeof per.hydration === "number") { var a2 = Math.max(0, Math.min(per.hydration, 100 - hyd)); hyd += a2; api.setVariable("hydration", c100(hyd)); api.setVariable("thirst", c100(hyd)); changed.push("hydration +" + a2); }
        if (typeof per.stamina === "number") { var a3 = Math.max(0, Math.min(per.stamina, 100 - sta)); sta += a3; api.setVariable("stamina", c100(sta)); changed.push("stamina +" + a3); }
        if (typeof per.condition === "number") { var a4 = Math.max(0, Math.min(per.condition, 100 - con)); con += a4; api.setVariable("condition", c100(con)); changed.push("condition +" + a4); }
      }
    }
    if (!consumed) { setSel(null); if (props.onStory) props.onStory(); api.sendMessage("I use the " + it.name + "."); return; }
    api.setVariable("inventory", next);
    api.setVariable("item-use-ledger", arr_panel(v["item-use-ledger"]).concat([{ itemId: id, itemName: it.name, effects: changed, clock: v["clock"] }]).slice(-30));
    // EAT and DRINK stay silent, as before: the state is the record.
    if (ingest !== "eat" && ingest !== "drink") api.injectContext("[UI PHYSICAL ACTION — ALREADY APPLIED] The player used " + it.name + ". " + (changed.length ? changed.join(", ") : "The item was consumed.") + " The state already reflects this use; do not apply it twice.");
    say((ingest === "drink" ? "Drank from " : ingest === "eat" ? "Ate " : "Used ") + it.name + (changed.length ? " (" + changed.join(", ") + ")" : "") + ".");
    if (!byId(next, id)) setSel(null);
  }
  function toggleTalisman(i) {
    var it = numbered[i]; if (!it) return;
    var wasOn = it.equipped === true;
    api.setVariable("numbered-items", numbered.map(function (x, j) {
      if (j === i) return Object.assign({}, x, { equipped: !wasOn });
      if (!wasOn && x.slot === "talisman" && it.slot === "talisman") return Object.assign({}, x, { equipped: false });
      return x;
    }));
    api.injectContext(wasOn ? "[UI] The player stopped wearing No. " + it.no + " " + it.name + "." : "[UI] The player is now wearing No. " + it.no + " " + it.name + ".");
  }

  // ---------- derived views
  var worn = items.filter(function (x) { return x.equipped; });
  var bySlot = {};
  worn.forEach(function (x) { if (isWearable(x.slot) && !storageProfileFor(x)) (bySlot[x.slot] = bySlot[x.slot] || []).push(x); });
  var containers = items.filter(function (x) { return !!storageProfileFor(x); });
  var protection = {};
  worn.forEach(function (x) { var pr = x.armor && x.armor.protection; if (pr && typeof pr === "object") Object.keys(pr).forEach(function (k) { protection[k] = (protection[k] || 0) + (Number(pr[k]) || 0); }); });
  var tiers = {}; items.forEach(function (x) { if (storageProfileFor(x) && x.equipped) return; var t = kitTierOf(x, items); (tiers[t] = tiers[t] || []).push(x); });
  var repairN = items.filter(kitNeedsRepair).length;
  var pouch = obj_panel(v["raw-stones"]);
  var pouchN = Object.keys(pouch).reduce(function (a, k) { return a + (Number(pouch[k] && pouch[k].qty) || 0); }, 0);
  var list = items.filter(function (x) {
    if (filter === "worn" && !x.equipped) return false;
    if (filter === "repair" && !kitNeedsRepair(x)) return false;
    if (["weapons", "armor", "food", "tools", "loot"].indexOf(filter) >= 0 && kitKind(x) !== filter) return false;
    if (q && String(x.name || "").toLowerCase().indexOf(q.toLowerCase()) < 0) return false;
    return true;
  });
  var tierOrder = { immediate: 0, ready: 1, quick: 2, readyc: 3, slow: 4, buried: 5, awkward: 6, none: 7 };
  list.sort(function (a, b) {
    if (sort === "name") return String(a.name).localeCompare(String(b.name));
    if (sort === "weight") return kitW(b) - kitW(a);
    if (sort === "worth") return (Number(b.value) || 0) * (b.qty || 1) - (Number(a.value) || 0) * (a.qty || 1);
    return (tierOrder[kitTierOf(a, items)] || 0) - (tierOrder[kitTierOf(b, items)] || 0) || String(a.name).localeCompare(String(b.name));
  });
  var bandTone = load.band === "comfortable" ? "ok" : load.band === "heavy" ? "warn" : "bad";
  var pct = function (x) { return load.max > 0 ? Math.min(100, x / load.max * 100) : 0; };

  function itemTile(x) {
    var d = kitDurPct(x);
    return <button key={x.id} type="button" className={"dsItem" + (x.equipped ? " on" : "") + (kitNeedsRepair(x) ? " worn" : "")} onClick={function () { setSel(x.id); setMoving(false); }}>
      <span className="dsGlyph"><Icon name={glyphFor(x)} size={20} stroke={1.5} /></span>
      <span className="dsItemWords"><b>{kitCap(x.name)}{x.qty > 1 ? <em>{" ×" + x.qty}</em> : null}</b>
        <small>{kitPlaceLabel(x, items) + " · " + kitW(x).toFixed(1)}</small>
        {d !== null ? <i className="dsDur"><i style={{ width: d + "%" }} /></i> : null}</span>
      {kitNeedsRepair(x) ? <span className="dsBadge bad">Repair</span> : null}
    </button>;
  }

  // ---------- the item sheet
  var it = sel ? byId(items, sel) : null;
  var sheet = null;
  if (it) {
    var sp = storageProfileFor(it), tier = itemAccessTier(it, items), ing = kitIngestKind(it);
    var rival = !it.equipped && isWearable(it.slot) && !sp ? (bySlot[it.slot] || [])[0] : null;
    var d = kitDurPct(it);
    var targets = [];
    containers.forEach(function (c) { storageProfileFor(c).slots.forEach(function (sl) {
      var here2 = physicalPlacement(it), inHere = here2.kind === "container" && here2.containerId === c.id && here2.slotId === sl.id;
      var t = c.equipped ? canPlaceInContainer(items, it, c, sl) : { ok: false, why: "not worn" };
      targets.push({ c: c, sl: sl, ok: t.ok && !inHere, why: inHere ? "it is already here" : t.why, used: storedBulk(items, c.id, sl.id), w: storedWeight(items, c.id, sl.id) });
    }); });
    targets.sort(function (a, b) { return (b.ok ? 1 : 0) - (a.ok ? 1 : 0); });
    sheet = <div className="dsVeil" onClick={function () { setSel(null); }}>
      <div className="dsSheet" role="dialog" aria-label={it.name} onClick={function (e) { e.stopPropagation(); }}>
        <div className="dsSheetHead">
          <span className="dsGlyph big"><Icon name={glyphFor(it)} size={34} stroke={1.3} /></span>
          <div className="dsSheetTitle"><b>{kitCap(it.name)}{it.qty > 1 ? " ×" + it.qty : ""}</b>
            <small>{[kitPlaceLabel(it, items), "reach: " + (KIT_ACCESS_WORD[tier] || tier), kitW(it).toFixed(1) + " weight"].join(" · ")}</small></div>
          <button type="button" className="dsX" aria-label="Close" onClick={function () { setSel(null); }}><Icon name="close" size={14} stroke={2} /></button>
        </div>
        <div className="dsSheetBody">
          {it.description ? <p className="dsProse">{it.description}</p> : null}
          {d !== null ? <div className={"dsDurRow" + (d < 35 ? " bad" : "")}><span>Condition</span><i className="dsDur wide"><i style={{ width: d + "%" }} /></i><b>{d + "%"}</b>{d < 35 ? <em>Needs repair — a smith, or it fails when it matters</em> : null}</div> : null}
          {fighting && KIT_BLOCKED_IN_FIGHT[tier] ? <p className="dsWarn">{"In a fight this is " + KIT_ACCESS_WORD[tier] + ": you can't use it until you get it out."}</p> : null}
          {rival ? <div className="dsCompare"><div className="dsCompareHead"><span>Compared with what you wear</span><b>{kitCap(rival.name)}</b></div>
            {kitCompare(it, rival).map(function (r) { return <div key={r.label} className={"dsCmpRow " + r.tone}><span>{r.label}</span><b>{String(r.mine)}</b><small>{String(r.worn)}</small><em>{r.delta === null || r.delta === 0 ? "" : (r.delta > 0 ? "+" : "") + r.delta}</em></div>; })}</div>
            : <div className="dsStatGrid">{kitStatRows(it).map(function (r) { return <div key={r[0]}><small>{r[0]}</small><b>{String(r[1])}</b></div>; })}</div>}
          <div className="dsActs">
            {(isWearable(it.slot) || sp) && !it.equipped ? <button type="button" className="dsBtn main" onClick={function () { equip(it.id); }}>{sp ? "Put on" : rival ? "Equip (replaces " + kitCap(rival.name) + ")" : "Equip"}</button> : null}
            {it.equipped ? <button type="button" className="dsBtn" onClick={function () { unequip(it.id); }}>{sp ? "Take off" : "Remove"}</button> : null}
            {!sp ? <button type="button" className="dsBtn" onClick={function () { use(it.id); }}>{ing === "eat" ? "Eat" : ing === "drink" ? "Drink" : "Use"}</button> : null}
            {!sp && !it.equipped ? <button type="button" className={"dsBtn" + (moving ? " on" : "")} onClick={function () { setMoving(!moving); }}>Move to…</button> : null}
            {it.qty > 1 ? <button type="button" className="dsBtn" onClick={function () { split(it.id, Math.floor(it.qty / 2)); }}>{"Split " + Math.floor(it.qty / 2)}</button> : null}
            {it.qty > 2 ? <button type="button" className="dsBtn" onClick={function () { split(it.id, 1); }}>Split 1</button> : null}
            <button type="button" className="dsBtn ghost" onClick={function () { drop(it.id); }}>Drop one</button>
          </div>
          {moving ? <div className="dsMoveList">
            <button type="button" className="dsMove ok" onClick={function () { autoStow(it.id); }}><b>Best free place</b><small>The quickest pocket that fits</small></button>
            {physicalPlacement(it).kind !== "loose" ? <button type="button" className="dsMove ok" onClick={function () { holdLoose(it.id); }}><b>Take it out</b><small>Hold it loose</small></button> : null}
            {targets.map(function (t) {
              return <button key={t.c.id + t.sl.id} type="button" className={"dsMove" + (t.ok ? " ok" : "")} disabled={!t.ok} onClick={function () { place(it.id, t.c.id, t.sl.id); }}>
                <b>{t.c.name + " · " + kitCap(String(t.sl.label).toLowerCase())}</b>
                <small>{t.ok ? (KIT_ACCESS_WORD[t.sl.access] || t.sl.access) + " · space " + t.used + "/" + t.sl.bulkCap + " · weight " + Math.round(t.w * 10) / 10 + "/" + t.sl.weightCap : "Won't fit: " + t.why}</small></button>;
            })}
          </div> : null}
        </div>
      </div>
    </div>;
  }

  // ---------- empty-slot picker: what you carry that could go there
  var slotSheet = null;
  if (slotPick) {
    var fits = items.filter(function (x) { return !x.equipped && x.slot === slotPick[0] && !storageProfileFor(x); });
    slotSheet = <div className="dsVeil" onClick={function () { setSlotPick(null); }}><div className="dsSheet" role="dialog" aria-label={slotPick[1]} onClick={function (e) { e.stopPropagation(); }}>
      <div className="dsSheetHead"><div className="dsSheetTitle"><b>{slotPick[1]}</b><small>What you carry that goes here</small></div><button type="button" className="dsX" aria-label="Close" onClick={function () { setSlotPick(null); }}><Icon name="close" size={14} stroke={2} /></button></div>
      <div className="dsSheetBody">{fits.length ? fits.map(function (x) { return <button key={x.id} type="button" className="dsMove ok" onClick={function () { setSlotPick(null); setSel(x.id); }}><b>{kitCap(x.name)}</b><small>{kitPlaceLabel(x, items) + " · tap to compare and equip"}</small></button>; })
        : <p className="dsProse dim">Nothing you carry fits this slot.</p>}</div>
    </div></div>;
  }

  return <div className="dsPage dsKit ds-scroll">
    {note ? <div className="dsNote" onClick={function () { setNote(""); }}>{note}</div> : null}
    {/* load */}
    <section className="dsPanel">
      <div className="dsPanelHead"><span className="dsSigil"><Icon name="weight" size={14} /></span><b>Load</b><em className={"dsTone " + bandTone}>{kitCap(load.band)}</em></div>
      <div className="dsLoad"><i className={bandTone} style={{ width: pct(load.carried) + "%" }} /><span style={{ left: pct(load.comfortable) + "%" }} /><span className="h" style={{ left: pct(load.heavy) + "%" }} /></div>
      <div className="dsLoadNums"><span>{"Carried " + load.carried}</span><span>{"Comfortable " + load.comfortable}</span><span>{"Heavy " + load.heavy}</span><span>{"Max " + load.max}</span></div>
      <div className="dsPurse">
        <div><small>Stones</small><b className="brass">{num_panel(v["mana-stones"], 0).toLocaleString()}</b><em>coin · spendable</em></div>
        <div><small>Mana stones</small><b>{pouchN.toLocaleString()}</b><em>loot · exchange at the Guild</em></div>
        <div><small>Tax owed</small><b className={num_panel(v["tax-owed"], 0) > 0 ? "blood" : ""}>{num_panel(v["tax-owed"], 0).toLocaleString()}</b><em>stones</em></div>
      </div>
    </section>

    {/* quick-draw belt */}
    <section className="dsPanel">
      <div className="dsPanelHead"><span className="dsSigil"><Icon name="clock" size={14} /></span><b>Reach</b><small>How fast you can get at each thing</small></div>
      {fighting ? <p className="dsWarn">In a fight, only things in hand, on the body or in a quick pocket can be used at once.</p> : null}
      <div className="dsBelt">{KIT_TIERS.map(function (t) {
        var xs = tiers[t[0]] || []; if (!xs.length) return null;
        return <div key={t[0]} className={"dsTier t-" + t[0]}><div className="dsTierHead"><b>{t[1]}</b><small>{t[2]}</small></div>
          <div className="dsTierItems">{xs.map(function (x) { return <button key={x.id} type="button" className="dsChipItem" onClick={function () { setSel(x.id); setMoving(false); }}><Icon name={glyphFor(x)} size={14} />{kitCap(x.name)}{x.qty > 1 ? " ×" + x.qty : ""}</button>; })}</div></div>;
      })}</div>
    </section>

    {/* body */}
    <section className="dsPanel">
      <div className="dsPanelHead"><span className="dsSigil"><Icon name="armor" size={14} /></span><b>Body</b><small>One piece per slot · tap an empty slot to fill it</small></div>
      <div className="dsSlots">{AUX_SLOTS_panel.concat(PIECE_SLOTS_panel).map(function (s) {
        var on = bySlot[s[0]] || [];
        return <button key={s[0]} type="button" className={"dsSlot" + (on.length ? " full" : "")} onClick={function () { if (on.length) setSel(on[0].id); else setSlotPick(s); }}>
          <small>{s[1]}</small>
          {on.length ? on.map(function (x) { var d = kitDurPct(x); return <span key={x.id} className="dsSlotItem"><Icon name={glyphFor(x)} size={14} /><b>{kitCap(x.name)}</b>{d !== null ? <i className={"dsDur" + (d < 35 ? " bad" : "")}><i style={{ width: d + "%" }} /></i> : null}</span>; })
            : <span className="dsSlotEmpty">—</span>}
        </button>;
      })}</div>
      <div className="dsProt">{["blunt", "slash", "pierce"].map(function (k) { return <div key={k}><Icon name={k} size={14} /><small>{kitCap(k)}</small><b>{protection[k] || 0}</b></div>; })}</div>
      <p className="dsProse dim small">Protection only counts where a piece covers the struck spot, and each piece wears down on its own.</p>
    </section>

    {/* bags */}
    <section className="dsPanel">
      <div className="dsPanelHead"><span className="dsSigil"><Icon name="backpack" size={14} /></span><b>Bags</b><small>{containers.length ? containers.filter(function (c) { return c.equipped; }).length + " worn" : "none"}</small></div>
      {containers.length === 0 ? <p className="dsProse dim">No bag, pouch, quiver, sheath or scabbard. Everything you own is in your hands.</p> : null}
      <div className="dsBags">{containers.map(function (c) {
        var cp = storageProfileFor(c);
        return <div key={c.id} className={"dsBag" + (c.equipped ? "" : " off")}>
          <div className="dsBagHead"><span className="dsGlyph"><Icon name={glyphFor(c)} size={18} /></span><div><b>{c.name}</b><small>{cp.className + " · " + (c.equipped ? "worn on the " + cp.equipSlot : "not worn — nothing in it can be reached")}</small></div>
            <button type="button" className="dsBtn small" onClick={function () { c.equipped ? unequip(c.id) : equip(c.id); }}>{c.equipped ? "Take off" : "Put on"}</button></div>
          <div className="dsComps">{cp.slots.map(function (sl) {
            var occ = containerOccupants(items, c.id, sl.id), ub = storedBulk(items, c.id, sl.id), uw = storedWeight(items, c.id, sl.id);
            return <div key={sl.id} className={"dsComp a-" + sl.access}>
              <div className="dsCompHead"><b>{kitCap(String(sl.label).toLowerCase())}</b><em>{KIT_ACCESS_WORD[sl.access] || sl.access}</em></div>
              <div className="dsFill"><small>space</small><i><i style={{ width: Math.min(100, ub / Math.max(1, sl.bulkCap) * 100) + "%" }} /></i><span>{ub + "/" + sl.bulkCap}</span></div>
              <div className="dsFill w"><small>weight</small><i><i style={{ width: Math.min(100, uw / Math.max(1, sl.weightCap) * 100) + "%" }} /></i><span>{Math.round(uw * 10) / 10 + "/" + sl.weightCap}</span></div>
              <div className="dsCompItems">{occ.length ? occ.map(function (x) { return <button key={x.id} type="button" className="dsChipItem" onClick={function () { setSel(x.id); setMoving(false); }}><Icon name={glyphFor(x)} size={13} />{kitCap(x.name)}{x.qty > 1 ? " ×" + x.qty : ""}</button>; }) : <span className="dsEmptyTag">empty</span>}</div>
            </div>;
          })}</div>
        </div>;
      })}</div>
    </section>

    {/* everything */}
    <section className="dsPanel">
      <div className="dsPanelHead"><span className="dsSigil"><Icon name="bags" size={14} /></span><b>Everything you own</b><small>{items.length + " things · " + load.carried + " weight"}</small></div>
      <div className="dsChips">{KIT_FILTERS.map(function (f) { if (f[0] === "repair" && !repairN) return null; return <button key={f[0]} type="button" className={"dsChip" + (filter === f[0] ? " on" : "") + (f[0] === "repair" ? " bad" : "")} onClick={function () { setFilter(f[0]); }}>{f[1]}{f[0] === "repair" ? " " + repairN : ""}</button>; })}</div>
      <div className="dsTools"><input className="dsSearch ds-field" value={q} placeholder="Find…" onChange={function (e) { setQ(e.target.value); }} />
        <select className="dsSort" value={sort} onChange={function (e) { setSort(e.target.value); }}>{KIT_SORTS.map(function (s) { return <option key={s[0]} value={s[0]}>{s[1]}</option>; })}</select></div>
      <div className="dsItems">{list.length ? list.map(itemTile) : <p className="dsProse dim">Nothing matches.</p>}</div>
    </section>

    {/* ground */}
    <section className="dsPanel">
      <div className="dsPanelHead"><span className="dsSigil"><Icon name="box" size={14} /></span><b>On the ground here</b><small>{here || "—"}</small></div>
      {ground.length ? <div className="dsItems">{ground.map(function (g, i) { return <div key={(g.id || "g") + i} className="dsItem"><span className="dsGlyph"><Icon name={glyphFor(g)} size={20} stroke={1.5} /></span><span className="dsItemWords"><b>{kitCap(g.name)}{g.qty > 1 ? <em>{" ×" + g.qty}</em> : null}</b><small>{kitW(g).toFixed(1) + " weight"}</small></span><button type="button" className="dsBtn small" onClick={function () { pickUp(g); }}>Pick up</button></div>; })}</div>
        : <p className="dsProse dim">Nothing you dropped is lying here.</p>}
    </section>

    {/* numbered */}
    <section className="dsPanel blood">
      <div className="dsPanelHead"><span className="dsSigil"><Icon name="ring" size={14} /></span><b>Numbered</b><small>One number, one object, one holder</small></div>
      {numbered.length === 0 ? <p className="dsProse dim">None. Most explorers die never having held one.</p> :
        <div className="dsItems">{numbered.map(function (x, i) { return <div key={i} className="dsItem numbered"><span className="dsNo">{"No. " + x.no}</span><span className="dsItemWords"><b>{x.name}</b><small>{[x.soulbound ? "bound to you" : "", x.slot || "unclassified", x.equipped ? "worn" : "", x.disputed ? (x.disputed === "unnumbered" ? "NO VALID NUMBER" : "CLAIMED ELSEWHERE") : ""].filter(Boolean).join(" · ")}</small>
          <small className="dsProse">{x.known || "What it does, you have not finished finding out."}</small></span>
          {x.slot ? <button type="button" className={"dsBtn small" + (x.equipped ? " on" : "")} onClick={function () { toggleTalisman(i); }}>{x.equipped ? "Put away" : "Wear"}</button> : null}</div>; })}</div>}
    </section>
    {sheet}{slotSheet}
  </div>;
}
