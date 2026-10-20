
/* ---------- battle arena glue: apply results, entry points ---------- */
function applyBattle(api, v, r, opts) {
  opts = opts || {};
  var maxU = num(r.maxUnits, 0), units = clamp(num(r.units, 0), 0, maxU || 0);
  var bar = maxU ? Math.round(100 * units / maxU) : 0;
  var spar = r.mode === "spar";
  var lost = Math.max(0, num(r.hp0, 0) - num(r.hp, 0));
  var vit = spar ? clamp(num(v.vitality, 100) - Math.round(r.taken * 0.5), 1, 100) : clamp(num(r.hp, 0), 0, 100);
  var manaFrac = maxU ? (num(r.units0, 0) - units) / maxU : 0;
  var minutes = Math.max(1, Math.round(r.seconds / 20)) + (spar ? 20 : 0);
  var patch = Object.assign({
    vitality: vit, stamina: clamp(num(r.st, 0), 0, 100),
    fatigue: clamp(num(v.fatigue, 0) + Math.round(r.seconds / 25 + manaFrac * 10 + r.taken / 10 + (spar ? 3 : 0)), 0, 100)
  }, bcClockForInventory(v, minutes));
  if (maxU) { patch.mana = bar; patch.mana_reserve = { version: 1, maxUnits: maxU, currentUnits: Math.round(units * 100) / 100, capacityBasis: num(obj(v.magic_profile).capacity, 0), percent: bar, lastPercent: bar }; }
  var log = arr(v.battle_log).slice();
  log.push({ date: str(v.world_date), time: str(v.world_time), mode: r.mode, outcome: r.outcome, grade: r.grade, seconds: r.seconds, foes: r.foes.map(function (f) { return f.name; }), where: parseLoc(v.current_location).settlement || "" });
  patch.battle_log = log.slice(-40);
  if (spar) {
    // Practice counts: each spell used gains a little progress, once per in-world day.
    var today = str(v.world_date), done = obj(v.spar_practice), nextDone = Object.assign({}, done), gained = [];
    var spells = arr(v.spells).map(function (sp) {
      var u = r.spellsUsed.filter(function (m) { return m.id === str(sp.id) || m.id === str(sp.name); })[0];
      if (!u || done[str(sp.id) || str(sp.name)] === today) return sp;
      nextDone[str(sp.id) || str(sp.name)] = today; gained.push(u.name);
      return Object.assign({}, sp, { prog: clamp(num(sp.prog, 0) + Math.min(4, 1 + u.uses), 0, 100) });
    });
    if (gained.length) { patch.spells = spells; patch.spar_practice = nextDone; }
    bcPatch(api, patch, function (ok) {
      if (typeof api.showToast === "function") api.showToast(ok ? "Sparring done (" + r.grade + "). " + (gained.length ? "Practice gained: " + gained.join(", ") + "." : "Spells already practiced today.") + " No AI turn used." : "Couldn't save the sparring result.", ok ? "success" : "error");
    });
    return;
  }
  var npcs = Object.assign({}, obj(obj(v.world_truth).npcs)), npcChanged = false;
  var parts = arr(obj(v.combat).participants).map(function (pt) {
    pt = obj(pt); var f = r.foes.filter(function (x) { return x.name === str(pt.name); })[0];
    if (!f) return pt;
    if (f.persisted && npcs[f.key]) { npcs[f.key] = Object.assign({}, obj(npcs[f.key]), { vitality: f.hpPct }); npcChanged = true; }
    return Object.assign({}, pt, { condition: f.outcome === "defeated" ? "defeated" : f.outcome });
  });
  patch.combat = Object.assign({}, obj(v.combat), { participants: parts, resolved: r.outcome });
  if (npcChanged) patch.world_truth = Object.assign({}, obj(v.world_truth), { npcs: npcs });
  if (r.outcome !== "defeat") { patch.in_combat = false; patch.combat.active = false; }
  if (lost >= 15) {
    var sev = lost >= 45 ? "serious" : lost >= 25 ? "moderate" : "minor";
    patch.conditions = arr(v.conditions).concat([{ id: "battle-" + log.length + "-" + str(v.world_date).replace(/\W+/g, ""), kind: "injury", location: "various", type: "battle wounds", severity: sev, effects: sev === "serious" ? "bleeding, impaired movement" : sev === "moderate" ? "deep bruising, cuts" : "bruises and scrapes", treatment: "", healing: "0%", since: str(v.world_date) }]);
  }
  var title = { victory: "victory", defeat: "defeat", fled: "escape", yielded: "surrender" }[r.outcome];
  var hidden = "[UI:BATTLE] The fight was PLAYED OUT in the battle arena and its results are ALREADY APPLIED to state. Outcome: " + r.outcome.toUpperCase() +
    " after about " + Math.max(1, Math.round(r.seconds / 20)) + (Math.max(1, Math.round(r.seconds / 20)) === 1 ? " minute" : " minutes") + " of fighting. Foes: " + r.foes.map(function (f) { return f.name + " (" + f.outcome + ")"; }).join(", ") +
    ". The character took " + r.taken + " damage (vitality " + r.hp0 + "→" + vit + "), spent " + Math.round(manaFrac * 100) + "% of their mana" +
    (r.spellsUsed.length ? " casting " + r.spellsUsed.map(function (m) { return m.name + " ×" + m.uses; }).join(", ") : " without spells") +
    "; best combo " + r.bestCombo + ", " + r.perfect + (r.perfect === 1 ? " perfect dodge, " : " perfect dodges, ") + r.interrupts + (r.interrupts === 1 ? " interrupted attack" : " interrupted attacks") + (r.log.length ? "; moments: " + r.log.join("; ") : "") +
    ". Narrate the end of this fight and its immediate aftermath in prose that matches this result exactly (a short, vivid summary, not a blow-by-blow replay). " +
    "Do NOT write vitality, stamina, fatigue, mana, mana_reserve, conditions, in_combat, combat or world_time for it, and emit no spell_events for these casts — all already applied. " +
    "You still own the consequences: what defeated or fled foes do next, loot actually present, witnesses, reputation, crimes, and relationships." + (r.outcome === "defeat" ? " The character has collapsed; what the enemy does now is decided by them and the world (in_combat is still true — you own combat and in_combat from here)." : "");
  bcPatch(api, patch, function (ok) {
    if (!ok) { if (typeof api.showToast === "function") api.showToast("Couldn't save the battle result.", "error"); return; }
    tellGM(api, hidden, "⚔ The battle ends in " + title + ".");
  });
}
function BattleRecord(p) {
  var log = arr(p.v.battle_log); if (!log.length) return null;
  var fights = log.filter(function (b) { return b.mode !== "spar"; }), wins = fights.filter(function (b) { return b.outcome === "victory"; }).length;
  var best = log.map(function (b) { return str(b.grade); }).sort()[0] || "—";
  return (
    <div>
      <SectionHead icon="sword" iconSize={22} title="Battle record" sub="Fought in the arena." />
      <Frame pad="6px 12px 8px" style={{ marginBottom: 12 }}>
        <Row k="Real fights" v={fights.length + " (" + wins + " won)"} />
        <Row k="Sparring sessions" v={String(log.length - fights.length)} />
        <Row k="Best grade" v={best} />
        {log.slice(-4).reverse().map(function (b, i) { return <Row key={i} k={(b.mode === "spar" ? "Spar · " : "") + arr(b.foes).join(", ")} v={str(b.outcome) + " · " + str(b.grade)} />; })}
      </Frame>
    </div>
  );
}
function SparCard(p) {
  var v = p.api.variables || {}; var busy = !!p.api.isStreaming;
  return (
    <button type="button" className="bc-sparcard" disabled={busy || isTrue(v.in_combat)} onClick={p.onSpar}>
      <img src={img("act_train")} alt="" /><span className="bc-sparcard-shade" />
      <Icon n="sword" s={30} />
      <span className="bc-sparcard-text"><strong>Spar in the arena</strong><small>A real-time practice fight. Costs stamina and mana, builds spell practice, uses no AI turn.</small></span>
      <Icon n="chevr" s={14} />
    </button>
  );
}
