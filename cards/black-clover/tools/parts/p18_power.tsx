/* ===== Magic Stages and the power scale (v21.19) =====
   One measure for everyone (bc-stage.js): Stage 9 up to Stage 0, then Arcane and Saint.
   PowerScale marks you and them on that ladder with a plain verdict ("Far beyond you")
   and what it means for a fight. StageCard shows your own stage and how close the next is. */
var STAGE_SHORT = ["9", "8", "7", "6", "5", "4", "3", "2", "1", "0", "A", "S"];
function stageNote(st) { return st.arcaneBy === "unique" ? " (one-of-a-kind magic; raw power " + st.raw + ")" : ""; }
function PowerScale(p) {
  var r = p.read; if (!r) return null;
  var g = Math.max(-2, Math.min(3, r.gap));
  return (
    <div className={"bc-pw g" + (g < 0 ? "m" + (-g) : g)} aria-label={"Power: " + r.label + ", " + r.word}>
      <div className="bc-pw-head"><span>{r.label}</span><b>{r.word}</b></div>
      <div className="bc-pw-track" aria-hidden="true">
        {POWER_TIERS.map(function (t, i) {
          var me = i === r.mine.idx, them = i === r.stage.idx;
          return <i key={t} className={(i >= 10 ? "hi " : "") + (me ? "me " : "") + (them ? "them" : "")} title={t}>
            {them ? <em style={r.col ? { background: r.col, color: "#0b1422" } : null}>{p.short || "Them"}</em> : null}{me ? <u>You</u> : null}<b>{STAGE_SHORT[i]}</b></i>;
        })}
      </div>
      <div className="bc-pw-ends"><span>Stage 9</span><span>Stage 0 · Arcane · Saint</span></div>
      <small>{(p.name ? p.name + ": " : "") + r.label + stageNote(r.stage) + (r.source === "canon" ? ", canon" : r.source === "rank" ? ", judged by rank" : "") + ". You: " + r.meLabel + ". " + r.advice}</small>
    </div>
  );
}
function StageCard(p) {
  var st = playerStage(obj(p.v));
  var pct = Math.round(st.into * 100);
  return (
    <div className="bc-stagecard" aria-label={"Your Magic Stage: " + st.label}>
      <div className="bc-stagecard-head"><span>Magic Stage</span><strong>{st.label}</strong></div>
      <div className="bc-pw-track bc-stage-track" aria-hidden="true">
        {POWER_TIERS.map(function (t, i) { return <i key={t} className={(i >= 10 ? "hi " : "") + (i < st.idx ? "past " : "") + (i === st.idx ? "me" : "")}><b>{STAGE_SHORT[i]}</b></i>; })}
      </div>
      {st.next ? <div className="bc-stage-next"><span>{"Toward " + (st.next === "Arcane" ? "Arcane Stage" : st.next)}</span><span className="bc-progbar"><i style={{ width: pct + "%" }} /></span></div> : null}
      <small>{st.arcaneBy === "unique" ? "Your magic is one of a kind, which marks you Arcane; your raw power is " + st.raw + ", and fights are measured by that." :
        st.raw === "Saint" ? "A spirit host at the very peak of magic." : st.arcaneBy === "power" ? "Among the most powerful mages alive." :
        "Measured from your output, reserves, control, your best spells and any bond. It rises with training and real breakthroughs."}</small>
    </div>
  );
}
/* the stage goes to the narrator as a read-only line, so the story and the interface agree */
function useMagicStage(api) {
  var v = (api && api.variables) || {};
  var st = playerStage(v), line = isTrue(v.character_created) ? st.label + stageNote(st) + (st.next ? "; toward " + st.next + " " + Math.round(st.into * 100) + "%" : "") : "";
  React.useEffect(function () {
    if (!line || line === str(v.magic_stage) || !canWrite(api)) return;
    bcPatch(api, { magic_stage: line }, function () {});
  }, [line, !!(api && api.isStreaming)]);
}
/* ===== Vitals guard (v21.19) =====
   Spells are paid by the spell engine (spell_events), never by the narrator writing [mana: -N].
   After each finished reply, any mana the narrator cut directly is given back, and a stamina cut
   bigger than the moment allows is trimmed (12 outside a fight, 25 in one). Interface-applied
   changes (arena, Grimoire casts, rest, training, travel) never go through directives, so they are
   untouched. The reply already handled is remembered in vitals_guard so nothing is applied twice. */
var VG_STAMINA_CAP = 12, VG_STAMINA_CAP_FIGHT = 25;
function vgCut(text, key, before) {
  // [mana: -8] subtracts; [mana: 40] or [mana: set 40] sets. Returns how much the reply took away.
  var re = new RegExp("\\[" + key + ":\\s*(set\\s+)?([+-]?)\\s*(\\d+(?:\\.\\d+)?)\\s*\\]", "gi"), m, cut = 0, cur = before;
  while ((m = re.exec(text))) {
    var val = Number(m[3]);
    if (m[2] === "-") { cut += val; cur -= val; }
    else if (m[2] === "+") { cur += val; cut = Math.max(0, cut - val); }
    else { if (val < cur) cut += cur - val; cur = val; }
  }
  return cut;
}
/* how much to scale a flat per-hour mana cost (training, broom flight) for this character's reserves */
function vgMins(v) { var t = str(v.world_time).match(/^(\d{1,2}):(\d{2})/); return t ? num(v.elapsed_days, 0) * 1440 + Number(t[1]) * 60 + Number(t[2]) : null; }
function manaScale(v) { var c = num(obj(v.magic_profile).capacity, 50); return Math.max(0.45, Math.min(1.25, 50 / Math.max(c, 20))); }
function useVitalsGuard(api) {
  var v = (api && api.variables) || {}, ms = arr(api && api.messages), streaming = !!(api && api.isStreaming);
  var pre = React.useRef(null);
  var last = null; for (var i = ms.length - 1; i >= 0; i--) { if (obj(ms[i]).role === "assistant") { last = ms[i]; break; } }
  var lastId = last ? str(last.id || ms.length) : "", lastIsUser = ms.length && obj(ms[ms.length - 1]).role === "user";
  // the values before the narrator answers: taken whenever the player has the floor
  if (!streaming && (lastIsUser || lastId === str(obj(v.vitals_guard).replyId))) pre.current = { mana: num(v.mana, 100), stamina: num(v.stamina, 100), mins: vgMins(v), at: ms.length };
  React.useEffect(function () {
    if (streaming || !last || !isTrue(v.character_created) || !canWrite(api)) return;
    var g = obj(v.vitals_guard); if (lastId === str(g.replyId)) return;
    // first run on a save: start watching from here, never reach back into an old reply
    if (!g.replyId) { bcPatch(api, { vitals_guard: { replyId: lastId, log: [] } }, function () {}); return; }
    var text = str(last.content), base = pre.current || { mana: num(v.mana, 100), stamina: num(v.stamina, 100) };
    var manaCut = vgCut(text, "mana", base.mana), stCut = vgCut(text, "stamina", base.stamina);
    var fight = isTrue(v.in_combat) || /\[(in_combat:\s*(set\s+)?true|combat[:.])/i.test(text);
    // time that passed in the reply allows more (hard labour is about 6 an hour)
    var hours = pre.current && pre.current.mins !== null && vgMins(v) !== null ? Math.max(0, vgMins(v) - pre.current.mins) / 60 : 0;
    var stExcess = Math.round(Math.max(0, stCut - (fight ? VG_STAMINA_CAP_FIGHT : VG_STAMINA_CAP) - 6 * hours));
    var patch = { vitals_guard: { replyId: lastId, log: arr(g.log).slice(-4) } }, notes = [];
    if (manaCut > 0) { patch.mana = Math.min(100, num(v.mana, 0) + manaCut); notes.push("mana +" + Math.round(manaCut) + " (spells are paid by the spell engine)"); }
    if (stExcess > 0) { patch.stamina = Math.min(100, num(v.stamina, 0) + stExcess); notes.push("stamina +" + Math.round(stExcess) + " (more than the moment costs)"); }
    if (notes.length) patch.vitals_guard.log = patch.vitals_guard.log.concat([{ reply: lastId, fixed: notes.join("; ") }]);
    bcPatch(api, patch, function () {});
  }, [lastId, streaming]);
}
