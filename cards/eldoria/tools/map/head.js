/* Eldoria — world map generator.
 * Adapted from Black Clover's cartography engine (a Voronoi world in the style of the
 * Universal World Engine map), constrained by Eldoria's canon: the Atlas Index gazetteer,
 * the realm boxes, and the physical geography entry (ranges, rivers, seas, wilds).
 * Coordinates are MILES from Aurelia City (0,0), +x east, +y north, exactly as the
 * narrator records them. Variable names inside say "km" because the engine is shared;
 * here one unit is one mile. Deterministic: the same world on every device. */
export var UNIT = "mi";
export var FRAME = { X0: -1360, X1: 1300, Y0: -960, Y1: 1010 };
export var GEN = { kmPerUnit: 2, spacingKm: 40, seaLevel: 0.32, seed: "eldoria-v1" };
var KS = 4; // Eldoria is about four times the size of the map the engine was tuned on; fine-texture frequencies are divided by this
var W = FRAME.X1 - FRAME.X0, H = FRAME.Y1 - FRAME.Y0;
export var UW = Math.round(W / GEN.kmPerUnit), UH = Math.round(H / GEN.kmPerUnit); // map units

/* the seven realms (the order is the owner index) */
export var KINGDOMS = [
  { k: "Aurelia", label: "Kingdom of Aurelia", at: [0, 10], r: 250, capital: [0, 0] },
  { k: "Stonehold", label: "Stonehold Confederacy", at: [450, 250], r: 230, capital: [480, 320] },
  { k: "Sylvanor", label: "Sylvanor", at: [-650, 300], r: 300, capital: [-620, 220] },
  { k: "Drakmor", label: "Drakmor Dominion", at: [0, 660], r: 320, capital: [0, 720] },
  { k: "Sunscar", label: "Sunscar Sultanate", at: [-720, -420], r: 400, capital: [-820, -320] },
  { k: "Velkar", label: "Velkar Free Cities", at: [-60, -480], r: 240, capital: [-80, -480], isles: true },
  { k: "Umbral", label: "Umbral Reach", at: [840, 140], r: 320, capital: [720, 450] }
];
export var KINGDOM_TINT = { Aurelia: "#d0b45a", Stonehold: "#8f8a86", Sylvanor: "#3f8a52", Drakmor: "#a8bedc", Sunscar: "#dca25a", Velkar: "#3fa3a0", Umbral: "#7a4fa8" };
/* land claimed by nobody (Atlas Index: the Marches; physical geography: the Howling Wastes) */
export var NEUTRAL = [
  { id: "grimfrost", name: "Grimfrost Marches", x: -60, y: 330, r: 85, line: "Unclaimed border country between Aurelia's north edge and Drakmor proper." },
  { id: "ashen", name: "Ashen Marches", x: 510, y: -35, r: 85, line: "Unclaimed, garrisoned by the Iron Vanguard and a Stonehold levy; the western approach to the Reach." },
  { id: "howling", name: "Howling Wastes", x: 640, y: 790, r: 230, line: "Barren frozen country north of the Umbral Reach and east of Drakmor's mountains, claimed by no realm." }
];
function neutralAt(x, y) { for (var i = 0; i < NEUTRAL.length; i++) { var z = NEUTRAL[i]; if (Math.hypot(x - z.x, y - z.y) < z.r) return z; } return null; }

/* land: realm masses plus fill blobs [x, y, r] (miles) */
var EXTRA_LAND = [
  [0, -60, 170], [150, 40, 160], [-150, 60, 150], [-285, -195, 115], [-235, -165, 70], // Aurelia, and its land link past Port Valor to Sandfall
  [-50, 320, 130], [50, 420, 130], [-260, 320, 125], [-370, 420, 110],      // Grimfrost Marches, and the land between them and Sylvanor
  [-230, 650, 170], [240, 640, 170], [0, 830, 190], [-120, 520, 120],        // Drakmor
  [600, 780, 200], [440, 860, 150],                                          // Howling Wastes
  [560, 330, 170], [330, 180, 150], [400, 40, 120],                          // Stonehold
  [510, -40, 110],                                                           // Ashen Marches
  [760, 330, 190], [960, 150, 200], [820, -130, 190], [1080, -40, 150], [1060, 380, 150], [640, -230, 110], // Umbral
  [-860, 300, 200], [-480, 250, 170], [-650, 440, 170], [-900, 160, 150],    // Sylvanor
  [-900, -450, 250], [-560, -330, 200], [-1100, -620, 170], [-760, -700, 200], [-400, -230, 120], [-525, -560, 160], [-465, -380, 110] // Sunscar
];
/* water: seas cut into the land [x, y, rx, ry, strength] */
var SEAS = [
  [-980, 25, 240, 95, 3.6], [-720, 5, 210, 82, 3.6], [-500, -30, 170, 70, 3.4], [-330, -70, 100, 44, 3.2], [-238, -104, 48, 28, 3.2], [-203, -124, 22, 15, 3.4], // the Grey Sea, reaching Port Valor
  [30, -270, 300, 85, 3.4], [-110, -268, 95, 62, 3.2], [250, -235, 180, 90, 3.2],                    // the channel south of Aurelia
  [300, -420, 200, 180, 3.4], [560, -560, 230, 140, 3.4], [100, -640, 260, 160, 3.0],                // the Sapphire Sea
  [-650, 680, 250, 150, 3.6], [-560, 845, 180, 130, 3.4],                                            // the Frostsea
  [-368, -520, 58, 205, 3.2], [-150, -800, 260, 110, 2.8], [-560, -905, 520, 90, 2.6]                                           // between Sunscar and the isles, and the Southern Ocean
];
/* the Velkar isles, raised after the seas (each named isle carries its town) */
var ISLES = [[-80, -480, 58], [20, -342, 40], [-140, -310, 38], [30, -420, 36], [160, -580, 42], [-310, -480, 44], [-200, -600, 40], [90, -700, 30], [120, -450, 22],
  [-30, -560, 18], [210, -500, 16], [-250, -400, 14]];
