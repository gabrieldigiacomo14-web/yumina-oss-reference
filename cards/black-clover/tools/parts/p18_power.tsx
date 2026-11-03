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
