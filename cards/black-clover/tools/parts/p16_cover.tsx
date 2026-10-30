
/* ---------- crafted grimoire cover ----------
   Every option changes the drawing:
   colour, trim, material (its own texture), condition (its own damage), decoration
   (frame and motifs), insignia setting, clasp, page edges and aura.
   Each cover gets its own SVG ids: several covers on one screen (the page's cover
   behind the Forge's live preview) used to share ids, so the preview drew with the
   saved design's colours and textures and looked like the options did nothing. */
var COVER_SEQ = 0;
var GC_COLORS = [["Obsidian black", "#1f1b1a"], ["Midnight navy", "#18213a"], ["Sapphire blue", "#243a6b"], ["Teal", "#1f4f52"], ["Forest green", "#2f4f3a"], ["Moss green", "#4f5a2c"],
  ["Crimson red", "#6b2124"], ["Wine", "#4a1822"], ["Rose", "#8a4a55"], ["Royal violet", "#3d2a4a"], ["Umber brown", "#4d3223"], ["Amber gold", "#86672f"], ["Ivory", "#c9bea6"], ["Ash grey", "#4a4744"]];
var GC_TRIMS = [["Gold", "#d1ad5a"], ["Silver", "#b9c0c8"], ["Bronze", "#a66f3e"], ["Copper", "#b8673f"], ["Rose gold", "#d29a86"], ["Dark iron", "#5d5c60"], ["Bone", "#e2d6bb"]];
var GC_MATERIALS = ["Leather", "Velvet", "Metal", "Stone", "Scaled hide", "Wood"];
var GC_CONDITIONS = ["Pristine", "Worn", "Ancient", "Battle-scarred"];
var GC_STYLES = ["Classic", "Minimal", "Ornate", "Royal", "Runic", "Arcane"];
var GC_SETTINGS = ["Plain", "Medallion", "Gem-set"];
var GC_CLASPS = ["None", "Strap", "Lock", "Chains"];
var GC_EDGES = [["Cream", "#e9dcbc"], ["Gilded", "#d9b65e"], ["Black", "#1c1917"], ["Red", "#7a2a2a"]];
function gcPick(list, name, dflt) { var s = str(name).toLowerCase(); for (var i = 0; i < list.length; i++) if (list[i][0].toLowerCase() === s) return list[i][1]; return dflt; }
function gcColor(name) { return gcPick(GC_COLORS, name, "") || coverColor(name); }
function gcTrim(name) { return gcPick(GC_TRIMS, name, "") || grimoireTrim(name); }
function gcOne(list, val, dflt) { var s = str(val).toLowerCase(); for (var i = 0; i < list.length; i++) if (list[i].toLowerCase() === s) return list[i]; return dflt; }
/* old saves: "Royal" decoration used to equal Ornate; wear words like "weathered" map to Worn */
function gcDesign(g, design) {
  var ap = obj(g.appearance), d = obj(design);
  var cond = str(d.condition || ap.wear);
  cond = gcOne(GC_CONDITIONS, cond, /ancient|crumbl|rotting|tatter/i.test(cond) ? "Ancient" : /worn|scuff|old|fray|dirt|weather/i.test(cond) ? "Worn" : /battle|scar|scorch|slash/i.test(cond) ? "Battle-scarred" : "Pristine");
  return { color: str(d.color) || str(ap.color || ap.cover) || "Forest green", trim: str(d.trim) || "Gold", material: gcOne(GC_MATERIALS, d.material, "Leather"), condition: cond,
    style: gcOne(GC_STYLES, d.style, "Classic"), setting: gcOne(GC_SETTINGS, d.setting, "Plain"), clasp: gcOne(GC_CLASPS, d.clasp, "None"), edges: gcPick(GC_EDGES, d.edges, "") ? str(d.edges) : "Cream",
    aura: d.aura === false || /^off$/i.test(str(d.aura)) ? false : gcOne(["Subtle", "Normal", "Strong"], d.aura, "Subtle") };
}
function Cover(p) {
  var idr = React.useRef(null); if (!idr.current) idr.current = "gc" + (++COVER_SEQ);
  var u = idr.current; function id(k) { return u + k; } function ref(k) { return "url(#" + u + k + ")"; }
  var g = p.g || {}; var d = gcDesign(g, p.design);
  var base = gcColor(d.color), trim = gcTrim(d.trim), edge = gcPick(GC_EDGES, d.edges, "#e9dcbc");
  var aura = auraColor(p.attr); var ins = str(g.insignia || "clover"); var leaves = num(g.leaf_count, 3);
  var mat = d.material, cond = d.condition, sty = d.style;
  var label = "Your grimoire: " + (ins.indexOf("clover") >= 0 ? leaves + "-leaf clover" : ins) + " insignia, " + d.color + " " + mat.toLowerCase() + " cover";
  if (p.imgUrl) return <div style={{ width: "100%", maxWidth: p.small ? 92 : 200, margin: "0 auto", aspectRatio: "200 / 270", display: "flex", alignItems: "center", justifyContent: "center", background: "#070809", borderRadius: 6, overflow: "hidden", border: "1px solid " + trim }}><img src={p.imgUrl} alt={label} style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }} /></div>;
  var faded = cond === "Ancient" ? hexMix(base, "#8a7f6a", 0.35) : cond === "Worn" ? hexMix(base, "#8a7f6a", 0.12) : base;
  var auraA = d.aura === "Strong" ? 0.7 : d.aura === "Normal" ? 0.48 : d.aura === "Subtle" ? 0.26 : 0;
  var insCol = leaves >= 4 && ins.indexOf("clover") >= 0 ? "#dcc488" : trim;
  var X = 25, Y = 16, W = 152, H = 232; // the front board
  var corners = [[X + 8, Y + 8], [X + W - 8, Y + 8], [X + 8, Y + H - 8], [X + W - 8, Y + H - 8]];
  return (
    <svg viewBox="0 0 200 270" style={{ width: "100%", maxWidth: p.small ? 92 : 200, display: "block", margin: "0 auto" }} role="img" aria-label={label}>
      <defs>
        <radialGradient id={id("aura")} cx="50%" cy="46%" r="58%"><stop offset="0%" stopColor={aura} stopOpacity={auraA} /><stop offset="100%" stopColor={aura} stopOpacity="0" /></radialGradient>
        <linearGradient id={id("hide")} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={hexMix(faded, "#ffffff", mat === "Metal" ? 0.32 : mat === "Velvet" ? 0.06 : 0.16)} /><stop offset="55%" stopColor={faded} /><stop offset="100%" stopColor={hexMix(faded, "#000000", mat === "Velvet" ? 0.38 : 0.26)} /></linearGradient>
        <linearGradient id={id("edge")} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={hexMix(edge, "#000000", 0.25)} /><stop offset="50%" stopColor={edge} /><stop offset="100%" stopColor={hexMix(edge, "#ffffff", d.edges === "Gilded" ? 0.35 : 0.08)} /></linearGradient>
        <radialGradient id={id("sheen")} cx="38%" cy="30%" r="70%"><stop offset="0%" stopColor="#ffffff" stopOpacity={mat === "Velvet" ? 0.22 : 0} /><stop offset="100%" stopColor="#ffffff" stopOpacity="0" /></radialGradient>
        <linearGradient id={id("gloss")} x1="0" y1="0" x2="1" y2="1"><stop offset="35%" stopColor="#fff" stopOpacity="0" /><stop offset="48%" stopColor="#fff" stopOpacity=".16" /><stop offset="56%" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <radialGradient id={id("scorch")} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#000" stopOpacity=".7" /><stop offset="70%" stopColor="#2a1408" stopOpacity=".35" /><stop offset="100%" stopColor="#000" stopOpacity="0" /></radialGradient>
        <pattern id={id("leather")} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="2" r=".7" fill="#000" opacity=".22" /><circle cx="5" cy="5.2" r=".6" fill="#fff" opacity=".07" /><circle cx="4.6" cy="1.2" r=".45" fill="#000" opacity=".15" /></pattern>
        <pattern id={id("velvet")} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 2 H4" stroke="#fff" strokeOpacity=".05" strokeWidth=".8" /></pattern>
        <pattern id={id("metal")} width="12" height="3" patternUnits="userSpaceOnUse"><path d="M0 1.5 H12" stroke="#fff" strokeOpacity=".09" strokeWidth=".6" /><path d="M3 .4 H9" stroke="#000" strokeOpacity=".08" strokeWidth=".4" /></pattern>
        <pattern id={id("stone")} width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="3" cy="5" r="1.3" fill="#fff" opacity=".09" /><circle cx="12" cy="13" r="1.6" fill="#000" opacity=".16" /><circle cx="14" cy="4" r=".8" fill="#000" opacity=".2" /><path d="M9 1 L14 7 M2 15 L7 10" stroke="#000" strokeOpacity=".15" strokeWidth=".8" /></pattern>
        <pattern id={id("scale")} width="12" height="9" patternUnits="userSpaceOnUse"><path d="M0 9 Q6 -1 12 9" fill="none" stroke="#000" strokeOpacity=".3" strokeWidth=".9" /><path d="M-6 4.5 Q0 -5.5 6 4.5 M6 4.5 Q12 -5.5 18 4.5" fill="none" stroke="#000" strokeOpacity=".3" strokeWidth=".9" /><path d="M2 7 Q6 1.5 10 7" fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth=".6" /></pattern>
        <pattern id={id("wood")} width="40" height="10" patternUnits="userSpaceOnUse"><path d="M0 5 Q10 1.5 20 5 T40 5" fill="none" stroke="#000" strokeOpacity=".22" strokeWidth=".8" /><path d="M0 9 Q12 7 24 9 T40 8.5" fill="none" stroke="#fff" strokeOpacity=".07" strokeWidth=".6" /></pattern>
        <clipPath id={id("board")}><rect x={X} y={Y} width={W} height={H} rx="9" /></clipPath>
      </defs>
      {d.aura ? <ellipse cx="100" cy="132" rx="100" ry="128" fill={ref("aura")} /> : null}
      {d.aura === "Strong" ? <g stroke={aura} strokeOpacity=".35" strokeWidth="1.4" strokeLinecap="round">{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (i) { var a = i * Math.PI / 6 + 0.26; return <path key={i} d={"M" + (100 + Math.cos(a) * 112) + " " + (132 + Math.sin(a) * 138) + " L" + (100 + Math.cos(a) * 128) + " " + (132 + Math.sin(a) * 156)} />; })}</g> : null}
      {/* page block and page lines */}
      <rect x="31" y="21" width="152" height="232" rx="8" fill={ref("edge")} />
      <g stroke="#000" strokeOpacity=".14" strokeWidth=".5">{[0, 1, 2, 3].map(function (i) { return <path key={i} d={"M" + (60 + i * 30) + " 251.5 h22 M181.5 " + (50 + i * 50) + " v28"} />; })}</g>
      {/* the board */}
      <rect x={X} y={Y} width={W} height={H} rx="9" fill={ref("hide")} stroke={trim} strokeWidth={mat === "Stone" ? 2.6 : 1.4} />
      <g clipPath={ref("board")}>
        <rect x={X} y={Y} width={W} height={H} fill={ref(mat === "Velvet" ? "velvet" : mat === "Metal" ? "metal" : mat === "Stone" ? "stone" : mat === "Scaled hide" ? "scale" : mat === "Wood" ? "wood" : "leather")} />
        {mat === "Velvet" ? <rect x={X} y={Y} width={W} height={H} fill={ref("sheen")} /> : null}
        {mat === "Metal" ? <><path d={"M" + X + " " + (Y + 3) + " H" + (X + W)} stroke="#fff" strokeOpacity=".3" strokeWidth="2" /><path d={"M" + X + " " + (Y + H - 2) + " H" + (X + W)} stroke="#000" strokeOpacity=".35" strokeWidth="3" /></> : null}
        {mat === "Stone" ? <><path d="M60 40 L72 58 L68 74 M150 180 L138 196 L142 214 M40 140 L56 150" fill="none" stroke="#000" strokeOpacity=".3" strokeWidth="1" /><rect x={X + 3} y={Y + 3} width={W - 6} height={H - 6} rx="7" fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth="2" /></> : null}
        {mat === "Wood" ? <path d={"M" + (X + W / 2 + 18) + " " + Y + " V" + (Y + H)} stroke="#000" strokeOpacity=".22" strokeWidth="1" /> : null}
        {mat === "Leather" ? <rect x={X + 5} y={Y + 5} width={W - 10} height={H - 10} rx="6" fill="none" stroke={hexMix(trim, base, 0.4)} strokeOpacity=".55" strokeWidth=".9" strokeDasharray="3 2.4" /> : null}
        {/* spine shading and bands */}
        <rect x={X} y={Y} width="15" height={H} fill="#000" fillOpacity=".3" />
        {mat === "Leather" || mat === "Scaled hide" ? [0, 1, 2, 3].map(function (i) { return <rect key={i} x={X + 1} y={Y + 32 + i * 52} width="13" height="4" rx="2" fill="#000" fillOpacity=".28" stroke="#fff" strokeOpacity=".08" />; }) : null}
        {/* condition */}
        {cond === "Pristine" ? <rect x={X} y={Y} width={W} height={H} fill={ref("gloss")} /> : null}
        {cond === "Worn" || cond === "Ancient" ? <g>{corners.map(function (c, i) { return <circle key={i} cx={c[0]} cy={c[1]} r="16" fill="#fff" opacity=".09" />; })}<g stroke="#f4ecd9" strokeOpacity=".2" strokeWidth="1.1"><path d="M60,70 L88,64" /><path d="M120,190 L150,198" /><path d="M140,60 L150,92" /><path d="M70,200 L64,226" /><path d="M45,110 L52,122" /></g></g> : null}
        {cond === "Ancient" ? <g><ellipse cx="140" cy="80" rx="18" ry="11" fill="#000" opacity=".2" /><ellipse cx="62" cy="196" rx="14" ry="20" fill="#2a1a08" opacity=".22" /><path d="M120 16 L116 40 L124 58 L118 78 M176 150 L160 158 L154 176" fill="none" stroke="#000" strokeOpacity=".45" strokeWidth="1.2" /><path d={"M" + (X + W) + " " + (Y + H - 30) + " L" + (X + W - 22) + " " + (Y + H) + " L" + (X + W) + " " + (Y + H) + " Z"} fill={edge} /></g> : null}
        {cond === "Battle-scarred" ? <g><path d="M48 60 L120 104 M58 52 L132 98" stroke="#000" strokeOpacity=".5" strokeWidth="2.2" /><path d="M49 61 L121 105" stroke="#f4ecd9" strokeOpacity=".25" strokeWidth=".8" /><path d="M150 170 L110 220" stroke="#000" strokeOpacity=".5" strokeWidth="2" /><circle cx="148" cy="214" r="22" fill={ref("scorch")} /></g> : null}
      </g>
      {/* decoration */}
      {sty !== "Minimal" ? <rect x="50" y="32" width="112" height="200" rx="5" fill="none" stroke={trim} strokeOpacity=".62" strokeWidth={sty === "Royal" ? 1.6 : 1} /> : <rect x="46" y="28" width="120" height="208" rx="4" fill="none" stroke={trim} strokeOpacity=".38" strokeWidth=".7" />}
      {sty === "Royal" ? <rect x="56" y="38" width="100" height="188" rx="4" fill="none" stroke={trim} strokeOpacity=".45" strokeWidth=".8" /> : null}
      {sty === "Classic" || sty === "Ornate" || sty === "Royal" ? <path d="M25,42 L25,25 Q25,16 34,16 L51,16 Z M177,42 L177,25 Q177,16 168,16 L151,16 Z M25,222 L25,239 Q25,248 34,248 L51,248 Z M177,222 L177,239 Q177,248 168,248 L151,248 Z" fill={trim} /> : null}
      {sty === "Ornate" ? <g fill="none" stroke={trim} strokeOpacity=".7" strokeWidth="1.1"><path d="M60 48 Q80 38 106 48 Q132 58 152 48 M60 216 Q80 226 106 216 Q132 206 152 216" /><path d="M62 52 q-4 8 4 10 q6 1 4 -6 M150 52 q4 8 -4 10 q-6 1 -4 -6 M62 212 q-4 -8 4 -10 q6 -1 4 6 M150 212 q4 -8 -4 -10 q-6 -1 -4 6" /><path d="M56 80 Q50 132 56 184 M156 80 Q162 132 156 184" strokeDasharray="1 3" /><circle cx="106" cy="45" r="2.4" fill={trim} /><circle cx="106" cy="219" r="2.4" fill={trim} /></g> : null}
      {sty === "Royal" ? <g><path d="M90 86 L94 72 L100 80 L106 66 L112 80 L118 72 L122 86 Z" fill={trim} /><rect x="90" y="86" width="32" height="4" fill={trim} />{[[106, 69, "#c43a4a"], [92, 74, "#3a6ac4"], [120, 74, "#3a6ac4"]].map(function (j, i) { return <circle key={i} cx={j[0]} cy={j[1]} r="2" fill={j[2]} />; })}{corners.map(function (c, i) { return <circle key={"j" + i} cx={c[0] + (i % 2 ? -5 : 5)} cy={c[1] + (i < 2 ? 5 : -5)} r="3" fill={i % 2 ? "#3a6ac4" : "#c43a4a"} stroke={trim} strokeWidth=".8" />; })}</g> : null}
      {sty === "Runic" ? <g stroke={trim} strokeOpacity=".75" strokeWidth="1" fill="none"><circle cx="106" cy="128" r="50" /><circle cx="106" cy="128" r="44" strokeOpacity=".4" />{Array.apply(null, Array(16)).map(function (_, i) { var a = i * Math.PI / 8, x = 106 + Math.cos(a) * 47, y = 128 + Math.sin(a) * 47; return <path key={i} d={i % 3 === 0 ? "M" + (x - 2) + " " + (y - 3) + " L" + x + " " + (y + 3) + " L" + (x + 2) + " " + (y - 3) : i % 3 === 1 ? "M" + x + " " + (y - 3) + " V" + (y + 3) + " M" + (x - 2) + " " + y + " H" + (x + 2) : "M" + (x - 2) + " " + (y + 2) + " L" + (x + 2) + " " + (y - 2) + " M" + (x - 2) + " " + (y - 2) + " L" + x + " " + y} />; })}{[60, 100, 160, 200].map(function (y, i) { return <path key={"s" + i} d={"M54 " + y + " l3 -4 l3 4 M152 " + y + " v-5 m-2 2 h4"} />; })}</g> : null}
      {sty === "Arcane" ? <g stroke={trim} strokeOpacity=".6" strokeWidth=".9" fill="none"><circle cx="106" cy="128" r="54" /><circle cx="106" cy="128" r="38" /><path d={[0, 1, 2].map(function (k) { var a = -Math.PI / 2 + k * 2 * Math.PI / 3; return (k ? "L" : "M") + (106 + Math.cos(a) * 54) + " " + (128 + Math.sin(a) * 54); }).join(" ") + " Z"} /><path d={[0, 1, 2].map(function (k) { var a = Math.PI / 2 + k * 2 * Math.PI / 3; return (k ? "L" : "M") + (106 + Math.cos(a) * 54) + " " + (128 + Math.sin(a) * 54); }).join(" ") + " Z"} /><path d="M106 60 V40 M106 196 V224 M50 128 H38 M162 128 H174" strokeDasharray="2 2" /></g> : null}
      {/* insignia setting */}
      {d.setting === "Medallion" ? <g><circle cx="106" cy="128" r="34" fill={hexMix(trim, "#000000", 0.55)} stroke={trim} strokeWidth="2" /><circle cx="106" cy="128" r="29" fill="none" stroke={trim} strokeOpacity=".45" strokeWidth=".8" /></g> : null}
      <g transform={"translate(106,128) scale(" + (d.setting === "Medallion" ? 1.05 : 1.5) + ")"}><Insignia kind={ins} leaves={leaves} color={insCol} /></g>
      {d.setting === "Gem-set" ? <g>{[[106, 82], [148, 128], [106, 174], [64, 128]].map(function (q, i) { return <path key={i} d={"M" + q[0] + " " + (q[1] - 5) + " L" + (q[0] + 4) + " " + q[1] + " L" + q[0] + " " + (q[1] + 5) + " L" + (q[0] - 4) + " " + q[1] + " Z"} fill={i % 2 ? "#3ac49a" : "#c43a4a"} stroke={trim} strokeWidth=".9" />; })}</g> : null}
      {/* clasp */}
      {d.clasp === "Strap" ? <g><rect x="150" y="118" width="34" height="18" rx="2" fill={hexMix(base, "#000000", 0.35)} stroke="#000" strokeOpacity=".4" /><rect x="156" y="120" width="12" height="14" rx="1.5" fill="none" stroke={trim} strokeWidth="2" /><path d="M162 127 H174" stroke={trim} strokeWidth="1.6" /></g> : null}
      {d.clasp === "Lock" ? <g><rect x="160" y="110" width="26" height="36" rx="3" fill={trim} stroke="#000" strokeOpacity=".4" /><circle cx="173" cy="124" r="3.2" fill="#1a1408" /><path d="M173 125 L171 134 H175 Z" fill="#1a1408" /><circle cx="164" cy="114" r="1.2" fill="#1a1408" opacity=".6" /><circle cx="182" cy="142" r="1.2" fill="#1a1408" opacity=".6" /></g> : null}
      {d.clasp === "Chains" ? <g fill="none" stroke={trim === "#d1ad5a" ? "#9a9da3" : trim} strokeWidth="2.1">{[[22, 70, 180, 196], [22, 196, 180, 70]].map(function (c, k) { var n = 13; return <g key={k}>{Array.apply(null, Array(n)).map(function (_, i) { var t = i / (n - 1), x = c[0] + (c[2] - c[0]) * t, y = c[1] + (c[3] - c[1]) * t + Math.sin(t * Math.PI) * 10; return <ellipse key={i} cx={x} cy={y} rx="6.2" ry="3.4" transform={"rotate(" + (Math.atan2(c[3] - c[1], c[2] - c[0]) * 180 / Math.PI + (i % 2 ? 90 : 0)) + " " + x + " " + y + ")"} />; })}</g>; })}<rect x="94" y="122" width="24" height="18" rx="3" fill={hexMix(trim, "#000000", 0.3)} /></g> : null}
      {mat === "Metal" ? corners.map(function (c, i) { return <circle key={"r" + i} cx={c[0] + (i % 2 ? -14 : 14)} cy={c[1] + (i < 2 ? 14 : -14)} r="2" fill={hexMix(trim, "#ffffff", 0.2)} stroke="#000" strokeOpacity=".4" strokeWidth=".6" />; }) : null}
      {/* aura motes */}
      {d.aura === "Normal" || d.aura === "Strong" ? <g fill={aura}>{[[18, 60], [186, 90], [14, 190], [190, 210], [60, 262], [150, 8], [100, 266], [8, 120]].slice(0, d.aura === "Strong" ? 8 : 5).map(function (m, i) { return <circle key={i} cx={m[0]} cy={m[1]} r={i % 2 ? 2 : 1.4} opacity=".75" />; })}</g> : null}
    </svg>
  );
}
function GrimoireForgeSheet(p) {
  var g = p.g || {};
  var ds = React.useState(gcDesign(g, p.art && p.art.grimoireDesign)); var d = ds[0], setD = ds[1];
  var ais = React.useState(false); var aiOpen = ais[0], setAiOpen = ais[1];
  var coverUrl = artFor(p.api, obj(p.art).art, "grimoire_cover");
  function set(k, val) { var n = Object.assign({}, d); n[k] = val; setD(n); }
  function save() { if (p.art && p.art.setGrimoireDesign) p.art.setGrimoireDesign(d, function () {}); if (p.api && p.api.showToast) p.api.showToast("Grimoire design saved", "success"); }
  var ins = str(g.insignia || "clover"); var leaves = num(g.leaf_count, 3); var attr = str(p.attr) || "magic";
  var baseNote = "Object-only 3:4 grimoire: " + leaves + "-leaf " + ins + " emblem" + (d.setting !== "Plain" ? " (" + d.setting.toLowerCase() + ")" : "") + ", " + d.color + " " + d.material.toLowerCase() + ", " + d.trim + " trim, " + d.style.toLowerCase() + " decoration, " + d.condition.toLowerCase() + (d.clasp !== "None" ? ", " + d.clasp.toLowerCase() + " clasp" : "") + ", " + d.edges.toLowerCase() + " page edges, " + attr + (d.aura ? " " + str(d.aura).toLowerCase() + " aura" : "") + ". No people or text.";
  if (aiOpen) return <AIArtForge api={p.api} title="AI Grimoire Cover" closeLabel="Back" subject="Generate your grimoire cover" needle="grimoire" icon="book" aspect="3 / 4" currentUrl={coverUrl} baseNote={baseNote} onApply={function (u, cb) { p.art.setArt("grimoire_cover", u, cb); }} onClose={function () { setAiOpen(false); }} />;
  function swatches(list, k) {
    return (
      <div role="radiogroup" aria-label={k} style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {list.map(function (c) { var on = str(d[k]).toLowerCase() === c[0].toLowerCase(); return (
          <button key={c[0]} type="button" role="radio" aria-checked={on ? "true" : "false"} aria-label={c[0]} title={c[0]} onClick={function () { set(k, c[0]); }}
            style={{ width: 34, height: 34, borderRadius: 17, background: c[1], border: on ? "2px solid " + C.goldHi : "1px solid rgba(255,255,255,.18)", boxShadow: on ? "0 0 0 2px #0b0c0e, 0 0 10px " + C.gold : "none", cursor: "pointer" }} />
        ); })}
        <span style={{ alignSelf: "center", fontSize: 13.5, color: C.label, marginLeft: 4 }}>{d[k]}</span>
      </div>
    );
  }
  return (
    <Sheet title="Grimoire Forge" onClose={p.onClose}>
      <div className="bc-forge-preview" style={{ position: "sticky", top: 0, zIndex: 2, display: "grid", gridTemplateColumns: "132px 1fr", gap: 14, alignItems: "start", paddingBottom: 10, marginBottom: 6, background: "linear-gradient(180deg,#0f1622 82%,rgba(15,22,34,0))" }}>
        <div><Cover g={g} attr={p.attr} design={d} /><div style={{ fontSize: 11.5, color: C.muted, textAlign: "center", marginTop: 5 }}>Live preview</div></div>
        <div>
          <H size={17} m="0 0 5px">Customize the book</H>
          <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.45 }}>Cosmetic only. Your insignia, leaf count, spells and history come from the story.</div>
          {coverUrl ? <div style={{ marginTop: 9, fontSize: 12.5, color: C.gold }}>Your own cover is active (uploaded or AI). "Use crafted cover instead" switches back.</div> : null}
        </div>
      </div>
      <Field label="Cover color">{swatches(GC_COLORS, "color")}</Field>
      <Field label="Trim">{swatches(GC_TRIMS, "trim")}</Field>
      <Field label="Material"><Seg label="Material" value={d.material} options={GC_MATERIALS} onChange={function (x) { set("material", x); }} /></Field>
      <Field label="Condition"><Seg label="Condition" value={d.condition} options={GC_CONDITIONS} onChange={function (x) { set("condition", x); }} /></Field>
      <Field label="Decoration"><Seg label="Decoration" value={d.style} options={GC_STYLES} onChange={function (x) { set("style", x); }} /></Field>
      <Field label="Insignia setting"><Seg label="Insignia setting" value={d.setting} options={GC_SETTINGS} onChange={function (x) { set("setting", x); }} /></Field>
      <Field label="Clasp"><Seg label="Clasp" value={d.clasp} options={GC_CLASPS} onChange={function (x) { set("clasp", x); }} /></Field>
      <Field label="Page edges">{swatches(GC_EDGES, "edges")}</Field>
      <Field label="Magic aura"><Seg label="Magic aura" value={d.aura === false ? "Off" : str(d.aura)} options={["Off", "Subtle", "Normal", "Strong"]} onChange={function (x) { set("aura", x === "Off" ? false : x); }} /></Field>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        <Btn kind="gold" onClick={save}>Save crafted design</Btn>
        <GrimoireCoverUpload api={p.api} art={p.art} />
        <Btn onClick={function () { save(); setAiOpen(true); }}>Generate AI cover</Btn>
        {coverUrl ? <Btn onClick={function () { p.art.setArt("grimoire_cover", "", function () {}); }}>Use crafted cover instead</Btn> : null}
      </div>
    </Sheet>
  );
}
