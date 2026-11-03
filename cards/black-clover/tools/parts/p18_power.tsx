/* ===== Power scale (v21.19): how strong someone is next to you =====
   A seven-step ladder from Weak to Beyond mortal. You and them are marked on
   it, with a plain verdict ("Far beyond you") and what that means for a fight,
   so a player knows their limits before picking one. */
function PowerScale(p) {
  var r = p.read; if (!r) return null;
  var g = Math.max(-2, Math.min(3, r.gap));
  return (
    <div className={"bc-pw g" + (g < 0 ? "m" + (-g) : g)} aria-label={"Power: " + r.word}>
      <div className="bc-pw-head"><span>Power</span><b>{r.word}</b></div>
      <div className="bc-pw-track" aria-hidden="true">
        {POWER_TIERS.map(function (t) {
          var me = t[0] === r.me, them = t[0] === r.tier;
          return <i key={t[0]} className={(me ? "me " : "") + (them ? "them" : "")} title={t[1]}>{them ? <em style={r.col ? { background: r.col } : null}>{p.short || "Them"}</em> : null}{me ? <u>You</u> : null}</i>;
        })}
      </div>
      <div className="bc-pw-ends"><span>Weak</span><span>Beyond mortal</span></div>
      <small>{(p.name ? p.name + ": " : "") + r.label + (r.source === "canon" ? " (canon)" : r.source === "rank" ? " (by rank)" : "") + " · you: " + r.meLabel + ". " + r.advice}</small>
    </div>
  );
}
