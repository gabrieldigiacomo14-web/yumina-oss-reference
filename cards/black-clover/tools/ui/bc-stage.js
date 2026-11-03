/* Black Clover — Magic Stages, one measure for everyone.
   Canon labels: Stage 9 (weakest) up to Stage 0, then Arcane Stage, then Saint Stage.
   Every mage gets a power score (0–120) from the same stats:
     player      magic_profile + their best spell's proficiency + spirit/devil bonds
     created NPC their recorded magic_profile (world_truth.npcs), or a stage the story gave them
     canon NPC   the canon power table, which is also a floor (Yami is never below Arcane)
   Score → stage: 0–79 is Stage 9..0 (8 points a stage), 80–99 Arcane, 100+ Saint for a
   spirit host (anyone else that strong stays Arcane, "beyond measure" past 105).
   Arcane is a mix of power and uniqueness: 80+ is Arcane by power; one-of-a-kind magic
   (Anti-Magic, Time, World Tree…) is also Arcane once the mage is at least Stage 4 (score 40),
   while battles still use their real score. */
function n(x, d) { var v = Number(x); return isFinite(v) ? v : d; }
function o(x) { return x && typeof x === "object" && !Array.isArray(x) ? x : {}; }
function cl(x, a, b) { return Math.max(a, Math.min(b, x)); }
function low(x) { return String(x == null ? "" : x).toLowerCase(); }

export var STAGE_STEPS = ["Stage 9", "Stage 8", "Stage 7", "Stage 6", "Stage 5", "Stage 4", "Stage 3", "Stage 2", "Stage 1", "Stage 0", "Arcane", "Saint"];
var UNIQUE = /anti.?magic|\btime\b|world tree|sealing|transformation|\bdream\b|\bsoul\b|gravity|\bfate\b/;
var PROF = { Unformed: 0, Novice: 1, Familiar: 2, Practiced: 3, Refined: 4, Expert: 5, Mastered: 6, Transcendent: 7 };
var TIER_SCORE = { weak: 10, average: 26, strong: 42, elite: 64, captain: 86, legend: 98, apex: 112 };
export function threatToScore(t) { return TIER_SCORE[t] === undefined ? 26 : TIER_SCORE[t]; }
/* the battle arena's difficulty tier for a score */
export function scoreToThreat(s) { return s < 16 ? "weak" : s < 32 ? "average" : s < 48 ? "strong" : s < 80 ? "elite" : s < 95 ? "captain" : s < 105 ? "legend" : "apex"; }

/* the core of everyone's score: output matters most, then reserves, then control */
export function scoreFromProfile(mp) {
  mp = o(mp);
  // a field the story never recorded counts as average for that mage (their output), not as zero
  var out = cl(n(mp.output, 0), 0, 100);
  var cap = cl(n(mp.capacity, mp.capacity === undefined || mp.capacity === "" ? out : 0), 0, 100);
  var ctl = cl(n(mp.control, n(mp.spell_control, mp.control === undefined ? out : 0)), 0, 100);
  if (!out && !cap && !ctl) return null;
  // an average recruit (about 45 across) is Stage 6; maxed stats alone reach Stage 1, Arcane also takes mastered spells or a bond
  return 0.35 * out + 0.2 * cap + 0.1 * ctl + cl(n(mp.attribute_mastery, 0), 0, 100) * 0.05;
}
function isUnique(mp) {
  mp = o(mp);
  var sp = (Array.isArray(mp.special) ? mp.special : []).map(low).join(" ");
  return mp.anti_magic === true || UNIQUE.test(low(mp.attribute) + " " + sp);
}
/* a stage the story wrote down ("Stage 4", "arcane", "saint") as a score */
export function scoreFromStageText(t) {
  t = low(t); var m = t.match(/stage\s*(\d)/);
  if (m) return (9 - Number(m[1])) * 8 + 4;
  if (/saint/.test(t)) return 100; if (/arcane/.test(t)) return 86;
  return null;
}
export function playerScore(v) {
  v = o(v); var mp = o(v.magic_profile), g = o(v.grimoire), bp = o(v.body_profile);
  var base = scoreFromProfile(mp);
  if (base === null) {
    // no mana (Anti-Magic users, the magicless): the body is what fights
    var body = (n(bp.strength, 0) + n(bp.endurance, 0) + n(bp.agility, n(bp.speed, 0))) / 3;
    base = body ? body * 0.5 : 10;
  }
  var best = 0; (Array.isArray(v.spells) ? v.spells : []).forEach(function (s) { best = Math.max(best, PROF[o(s).proficiency] || 0); });
  return cl(base + best * 1.2 + (g.spirit_link ? 6 : 0) + (g.devil_link ? 6 : 0), 0, 120);
}
/* the label for a score. canonArcane: the canon names a mage Arcane outright */
export function stageOf(score, opts) {
  opts = o(opts); var s = cl(n(score, 0), 0, 130);
  var raw = s < 80 ? "Stage " + (9 - Math.floor(s / 8)) : s >= 100 && opts.spirit ? "Saint" : "Arcane";
  var rawIdx = STAGE_STEPS.indexOf(raw), arcaneBy = "";
  if (raw === "Arcane" || raw === "Saint") arcaneBy = "power";
  else if (opts.canonArcane || (opts.unique && s >= 40)) arcaneBy = "unique";
  var label = arcaneBy === "unique" ? "Arcane Stage" : raw === "Arcane" ? "Arcane Stage" + (s >= 105 ? " (beyond measure)" : "") : raw === "Saint" ? "Saint Stage" : raw;
  var next = s < 80 ? (rawIdx < 9 ? STAGE_STEPS[rawIdx + 1] : "Arcane") : "";
  var into = s < 80 ? (s % 8) / 8 : 1;
  return { score: Math.round(s), label: label, raw: raw, idx: rawIdx, arcaneBy: arcaneBy, next: next, into: into,
    note: arcaneBy === "unique" ? "One-of-a-kind magic; raw power " + raw : "" };
}
export function playerStage(v) {
  v = o(v); var mp = o(v.magic_profile);
  return stageOf(playerScore(v), { unique: isUnique(mp), spirit: !!o(v.grimoire).spirit_link });
}
/* any NPC (created or canon). canon: the canon power entry, or null */
export function npcStage(npc, canon, extra) {
  npc = o(npc); extra = o(extra);
  var s = scoreFromProfile(extra.magic_profile);
  if (s === null) s = scoreFromProfile(npc.magic_profile);
  if (s === null) s = scoreFromStageText(extra.stage || npc.stage || o(npc.magic_profile).stage);
  if (canon) s = Math.max(s === null ? 0 : s, n(canon.s, threatToScore(canon.t)));
  if (s === null) return null;
  var mp = o(npc.magic_profile);
  return stageOf(s, { canonArcane: !!(canon && canon.arc), unique: isUnique(mp) || isUnique(extra.magic_profile),
    spirit: !!(canon && canon.spirit) || !!npc.spirit_link || !!o(npc.grimoire).spirit_link });
}
