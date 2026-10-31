/* Black Clover — canon power levels for the battle arena.
   The narrator labels a foe's threat from the story, but it cannot know how
   strong a famous character really is, and it sometimes undersells them.
   This table is the floor: a named canon character is never weaker than the
   tier listed here. Tiers: weak < average < strong < elite < captain < legend < apex.
   weak..elite    recruits, squad seniors, strong fighters
   captain        the nine squad captains
   legend         the Wizard King and the very top (Mereoleona-class)
   apex           far beyond any mage of the opening era (devils, Licht, Patri…)
   Matching is by name tokens: "Captain Yami" and "Yami Sukehiro" both find "yami". */
export var CANON_POWER = [
  // captains (opening era)
  { n: ["yami sukehiro", "yami"], t: "captain", k: "brute", a: "dark", sig: "Dark Slash" },
  { n: ["william vangeance"], t: "captain", k: "caster", a: "world tree", sig: "Tree Lash" },
  { n: ["nozel silva", "nozel"], t: "captain", k: "caster", a: "mercury", sig: "Mercury Lance" },
  { n: ["fuegoleon vermillion", "fuegoleon"], t: "captain", k: "caster", a: "fire", sig: "Crimson Lion Flame" },
  { n: ["charlotte roselei"], t: "captain", k: "caster", a: "plant", sig: "Briar Bloom" },
  { n: ["jack the ripper"], t: "captain", k: "brute", a: "steel", sig: "Slash" },
  { n: ["rill boismortier", "rill"], t: "captain", k: "caster", a: "light", sig: "Living Picture" },
  { n: ["dorothy unsworth"], t: "captain", k: "caster", a: "dream", sig: "Dream Trap" },
  { n: ["gueldre poizot", "gueldre"], t: "captain", k: "brute", a: "", sig: "Heavy Blow" },
  // the very top
  { n: ["julius novachrono", "julius", "wizard king"], t: "legend", k: "caster", a: "time", sig: "Time Rift" },
  { n: ["mereoleona vermillion", "mereoleona"], t: "legend", k: "brute", a: "fire", sig: "Natural Mana Blaze" },
  { n: ["marx francois", "marx"], t: "elite", k: "caster", a: "", sig: "" },
  // apex: not a fight an opening-era mage can win
  { n: ["licht"], t: "apex", k: "caster", a: "light", sig: "Light of Ruin" },
  { n: ["patri"], t: "apex", k: "caster", a: "light", sig: "Judgment" },
  { n: ["lucius zogratis", "lucius"], t: "apex", k: "caster", a: "time", sig: "Time Stop" },
  { n: ["zagred"], t: "apex", k: "caster", a: "dark", sig: "Devil's Wrath" },
  { n: ["lucifero"], t: "apex", k: "caster", a: "dark", sig: "Devil's Wrath" },
  { n: ["megicula"], t: "apex", k: "caster", a: "dark", sig: "Devil's Wrath" },
  { n: ["lilith"], t: "apex", k: "caster", a: "dark", sig: "Devil's Wrath" },
  { n: ["devil", "arch devil"], t: "apex", k: "caster", a: "dark", sig: "Devil's Wrath" },
  // squad seniors and strong named mages
  { n: ["nacht faust", "nacht"], t: "elite", k: "caster", a: "shadow", sig: "Shadow Bind" },
  { n: ["klaus lunettes", "klaus"], t: "strong", k: "caster", a: "steel", sig: "Steel Lance" },
  { n: ["langris vaude", "langris"], t: "elite", k: "caster", a: "spatial", sig: "Spatial Cut" },
  { n: ["leopold vermillion", "leopold", "leo vermillion"], t: "strong", k: "caster", a: "fire", sig: "Flame Fist" },
  { n: ["magna swing", "magna"], t: "strong", k: "caster", a: "fire", sig: "Fire Burst" },
  { n: ["luck voltia"], t: "elite", k: "brute", a: "lightning", sig: "Lightning Rush" },
  { n: ["vanessa enoteca", "vanessa"], t: "strong", k: "caster", a: "thread", sig: "Thread Snare" },
  { n: ["finral roulacase", "finral"], t: "strong", k: "caster", a: "spatial", sig: "Spatial Slice" },
  { n: ["gauche adlai", "gauche"], t: "strong", k: "caster", a: "mirror", sig: "Mirror Shard" },
  { n: ["gordon agrippa"], t: "strong", k: "caster", a: "poison", sig: "Curse Mist" },
  { n: ["grey of the black bulls"], t: "average", k: "caster", a: "transformation", sig: "" },
  { n: ["charmy pappitson", "charmy"], t: "strong", k: "caster", a: "cotton", sig: "Cotton Wall" },
  { n: ["zora ideale", "zora"], t: "strong", k: "caster", a: "ash", sig: "Ash Snare" },
  { n: ["secre swallowtail", "secre"], t: "strong", k: "caster", a: "sealing", sig: "Seal" },
  { n: ["sol marron"], t: "strong", k: "caster", a: "earth", sig: "Rock Drop" },
  { n: ["solid silva"], t: "strong", k: "caster", a: "water", sig: "Water Burst" },
  { n: ["nebra silva", "nebra"], t: "strong", k: "caster", a: "", sig: "" },
  { n: ["noelle silva", "noelle"], t: "strong", k: "caster", a: "water", sig: "Sea Dragon" },
  { n: ["mimosa vermillion", "mimosa"], t: "strong", k: "caster", a: "plant", sig: "Plant Wall" },
  { n: ["asta"], t: "strong", k: "brute", a: "anti-magic", sig: "Anti-Magic Slash" },
  { n: ["yuno"], t: "elite", k: "caster", a: "wind", sig: "Wind Blade" },
  { n: ["vetto"], t: "elite", k: "caster", a: "", sig: "" },
  { n: ["fana"], t: "elite", k: "caster", a: "", sig: "" },
  { n: ["catherine"], t: "strong", k: "caster", a: "", sig: "" },
  { n: ["rades spirdust", "rades"], t: "elite", k: "caster", a: "", sig: "" }
];
var TITLES = /^(captain|vice|vicecaptain|sir|lady|lord|lord|wizard|king|royal|knight|the|senior|junior|magic|elder|master|dame)$/;
function tokens(name) { return String(name || "").toLowerCase().replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(function (t) { return t && !TITLES.test(t); }); }
/* The canon entry for a name, or null. Wizard King/Devil titles are matched
   on the raw name first, since they are the whole identity. */
export function canonPower(name) {
  var raw = String(name || "").toLowerCase();
  if (/wizard king/.test(raw)) return CANON_POWER.filter(function (e) { return e.n[0] === "julius novachrono"; })[0];
  if (/\bdevil\b/.test(raw)) return CANON_POWER.filter(function (e) { return e.n[0] === "devil"; })[0];
  var tk = tokens(name); if (!tk.length) return null;
  var best = null, bestLen = 0;
  CANON_POWER.forEach(function (e) {
    e.n.forEach(function (alias) {
      var at = alias.split(" ");
      if (at.every(function (x) { return tk.indexOf(x) >= 0; }) && at.length > bestLen) { best = e; bestLen = at.length; }
    });
  });
  return best;
}
