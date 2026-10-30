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

/* the canonical gazetteer (Atlas Index), one entry per place: miles from Aurelia City */
export var CANON_PLACES = [
  {"name": "Aurelia City", "x": 0, "y": 0, "realm": "Aurelia", "kind": "capital", "line": "capital"},
  {"name": "Northgate", "x": 0, "y": 190, "realm": "Aurelia", "kind": "fort", "line": "fortress-town"},
  {"name": "Silverstream", "x": 90, "y": -80, "realm": "Aurelia", "kind": "town", "line": "town"},
  {"name": "Port Valor", "x": -180, "y": -120, "realm": "Aurelia", "kind": "port", "line": "port city"},
  {"name": "Elarion", "x": -160, "y": 40, "realm": "Aurelia", "kind": "town", "line": "town"},
  {"name": "Oakhaven", "x": -120, "y": 110, "realm": "Aurelia", "kind": "town", "line": "town"},
  {"name": "Millrun", "x": 60, "y": 70, "realm": "Aurelia", "kind": "town", "line": "town"},
  {"name": "Stonebridge", "x": 150, "y": 60, "realm": "Aurelia", "kind": "town", "line": "town"},
  {"name": "Copperhill", "x": 185, "y": 95, "realm": "Aurelia", "kind": "town", "line": "mining town"},
  {"name": "Luminor", "x": -30, "y": 95, "realm": "Aurelia", "kind": "city", "line": "free scholar-city, Silver Moon Society headquarters"},
  {"name": "Ashford Crossing", "x": 35, "y": 25, "realm": "Aurelia", "kind": "village", "line": "village"},
  {"name": "Thornwell", "x": -40, "y": 35, "realm": "Aurelia", "kind": "village", "line": "village"},
  {"name": "Whitsun Ford", "x": 80, "y": 10, "realm": "Aurelia", "kind": "village", "line": "village"},
  {"name": "Wheatholt", "x": 25, "y": -110, "realm": "Aurelia", "kind": "village", "line": "village"},
  {"name": "Redmarsh", "x": 140, "y": -40, "realm": "Aurelia", "kind": "village", "line": "village"},
  {"name": "Hollowbrook", "x": -95, "y": 150, "realm": "Aurelia", "kind": "village", "line": "village"},
  {"name": "Lanternmere", "x": -130, "y": 75, "realm": "Aurelia", "kind": "village", "line": "lake village"},
  {"name": "Greyditch", "x": -75, "y": -45, "realm": "Aurelia", "kind": "village", "line": "hamlet"},
  {"name": "Fallow's End", "x": -210, "y": 90, "realm": "Aurelia", "kind": "village", "line": "hamlet"},
  {"name": "Fort Ironwatch", "x": 0, "y": 140, "realm": "Aurelia", "kind": "fort", "line": ""},
  {"name": "Watchtower Pellin", "x": 110, "y": 130, "realm": "Aurelia", "kind": "fort", "line": ""},
  {"name": "Kingsrest Monastery", "x": -55, "y": 120, "realm": "Aurelia", "kind": "shrine", "line": ""},
  {"name": "Sablewood Abbey", "x": -145, "y": -15, "realm": "Aurelia", "kind": "shrine", "line": ""},
  {"name": "Hollow Barrow", "x": -42, "y": 88, "realm": "Aurelia", "kind": "ruin", "line": "ruin"},
  {"name": "Direwood Warren", "x": -88, "y": 62, "realm": "Aurelia", "kind": "ruin", "line": "dungeon"},
  {"name": "Greyditch Mine", "x": -82, "y": -52, "realm": "Aurelia", "kind": "ruin", "line": "abandoned"},
  {"name": "Sunken Chapel of Vess", "x": 118, "y": -95, "realm": "Aurelia", "kind": "ruin", "line": "ruin"},
  {"name": "Rookspire", "x": 65, "y": 160, "realm": "Aurelia", "kind": "ruin", "line": "ruined tower"},
  {"name": "Khaz'Modan / Anvil-Heart", "x": 480, "y": 320, "realm": "Stonehold", "kind": "capital", "line": "capital"},
  {"name": "Karak Borgor", "x": 360, "y": 360, "realm": "Stonehold", "kind": "fort", "line": "Iron Vanguard headquarters"},
  {"name": "Ironpeak", "x": 280, "y": 240, "realm": "Stonehold", "kind": "town", "line": ""},
  {"name": "Gromril Hall", "x": 580, "y": 280, "realm": "Stonehold", "kind": "town", "line": ""},
  {"name": "Irondeep", "x": 290, "y": 180, "realm": "Stonehold", "kind": "town", "line": ""},
  {"name": "Hammerstead", "x": 210, "y": 190, "realm": "Stonehold", "kind": "town", "line": ""},
  {"name": "Stonegate", "x": 390, "y": 30, "realm": "Stonehold", "kind": "town", "line": ""},
  {"name": "Deepgate Junction", "x": 330, "y": 120, "realm": "Stonehold", "kind": "fort", "line": ""},
  {"name": "Cinderfall Forge", "x": 520, "y": 390, "realm": "Stonehold", "kind": "town", "line": ""},
  {"name": "Coalgate", "x": 540, "y": 350, "realm": "Stonehold", "kind": "town", "line": ""},
  {"name": "The Undervein", "x": 440, "y": 280, "realm": "Stonehold", "kind": "ruin", "line": "megadungeon"},
  {"name": "Stonefall", "x": 180, "y": 110, "realm": "Stonehold", "kind": "fort", "line": "Stonehold frontier holding in the Aurelian foothills"},
  {"name": "Greenwhisper", "x": -620, "y": 220, "realm": "Sylvanor", "kind": "capital", "line": "capital"},
  {"name": "Whisperleaf Glade", "x": -510, "y": 340, "realm": "Sylvanor", "kind": "shrine", "line": ""},
  {"name": "De Angelus", "x": -740, "y": 160, "realm": "Sylvanor", "kind": "town", "line": ""},
  {"name": "Greenhaven", "x": -380, "y": 140, "realm": "Sylvanor", "kind": "town", "line": ""},
  {"name": "Mossfall", "x": -560, "y": 270, "realm": "Sylvanor", "kind": "town", "line": ""},
  {"name": "Fernwatch", "x": -550, "y": 180, "realm": "Sylvanor", "kind": "town", "line": ""},
  {"name": "Thornhollow", "x": -700, "y": 420, "realm": "Sylvanor", "kind": "town", "line": ""},
  {"name": "The Weeping Grove", "x": -480, "y": 200, "realm": "Sylvanor", "kind": "shrine", "line": ""},
  {"name": "Frostfang Keep", "x": 0, "y": 720, "realm": "Drakmor", "kind": "capital", "line": "capital"},
  {"name": "Grimfrost Pass", "x": -80, "y": 510, "realm": "Drakmor", "kind": "pass", "line": ""},
  {"name": "Eroshold", "x": -220, "y": 680, "realm": "Drakmor", "kind": "town", "line": ""},
  {"name": "Wyrmstooth", "x": 180, "y": 640, "realm": "Drakmor", "kind": "town", "line": ""},
  {"name": "Hearthmoot", "x": 90, "y": 560, "realm": "Drakmor", "kind": "town", "line": ""},
  {"name": "Icetooth Camp", "x": -300, "y": 780, "realm": "Drakmor", "kind": "village", "line": ""},
  {"name": "Bearclaw Hold", "x": 80, "y": 480, "realm": "Drakmor", "kind": "town", "line": ""},
  {"name": "The Frozen Gullet", "x": 240, "y": 760, "realm": "Drakmor", "kind": "ruin", "line": "dungeon"},
  {"name": "Last Hope", "x": -20, "y": 380, "realm": "Drakmor", "kind": "fort", "line": "Drakmor's southernmost outpost, in the Grimfrost Marches"},
  {"name": "Saffaron / City of Brass", "x": -820, "y": -320, "realm": "Sunscar", "kind": "capital", "line": "capital"},
  {"name": "Oasis of Zahir", "x": -480, "y": -280, "realm": "Sunscar", "kind": "oasis", "line": "Grand Water Court"},
  {"name": "Oasis of Azure Palm", "x": -640, "y": -410, "realm": "Sunscar", "kind": "oasis", "line": ""},
  {"name": "Sandfall", "x": -340, "y": -190, "realm": "Sunscar", "kind": "town", "line": ""},
  {"name": "Karrath Wells", "x": -950, "y": -500, "realm": "Sunscar", "kind": "oasis", "line": ""},
  {"name": "Palm Rest", "x": -550, "y": -350, "realm": "Sunscar", "kind": "oasis", "line": ""},
  {"name": "The Glass Waste", "x": -1100, "y": -650, "realm": "Sunscar", "kind": "waste", "line": ""},
  {"name": "Tomb of Nine Kings", "x": -880, "y": -600, "realm": "Sunscar", "kind": "ruin", "line": ""},
  {"name": "Port Meridian", "x": -80, "y": -480, "realm": "Velkar", "kind": "port", "line": "Consulate seat, Sea Drake Company headquarters"},
  {"name": "Gildwater / Scabridge", "x": 20, "y": -340, "realm": "Velkar", "kind": "port", "line": ""},
  {"name": "Grayhaven North", "x": -140, "y": -310, "realm": "Velkar", "kind": "port", "line": ""},
  {"name": "Grayhaven South", "x": 160, "y": -580, "realm": "Velkar", "kind": "port", "line": ""},
  {"name": "Grayhaven Central", "x": 30, "y": -420, "realm": "Velkar", "kind": "port", "line": "Shadow Ravens headquarters"},
  {"name": "Port Valen", "x": -310, "y": -480, "realm": "Velkar", "kind": "port", "line": ""},
  {"name": "Saltmere", "x": -200, "y": -600, "realm": "Velkar", "kind": "port", "line": ""},
  {"name": "Copper Cay", "x": 90, "y": -700, "realm": "Velkar", "kind": "village", "line": ""},
  {"name": "Tern Rock", "x": 120, "y": -450, "realm": "Velkar", "kind": "village", "line": ""},
  {"name": "The Drowned Fleet", "x": -250, "y": -650, "realm": "Velkar", "kind": "wreck", "line": "wreck site"},
  {"name": "Black Spire", "x": 720, "y": 450, "realm": "Umbral", "kind": "fort", "line": "Holdout city-fortress, ruled by whoever holds it"},
  {"name": "Necrospire", "x": 630, "y": -120, "realm": "Umbral", "kind": "ruin", "line": ""},
  {"name": "Ashenport", "x": 880, "y": -280, "realm": "Umbral", "kind": "port", "line": ""},
  {"name": "Shadowfen", "x": 560, "y": -310, "realm": "Umbral", "kind": "fen", "line": ""},
  {"name": "Greyhollow", "x": 780, "y": 80, "realm": "Umbral", "kind": "ruin", "line": ""},
  {"name": "The Silent March", "x": 950, "y": 220, "realm": "Umbral", "kind": "waste", "line": ""},
  {"name": "Vault of Ashes", "x": 1050, "y": -150, "realm": "Umbral", "kind": "ruin", "line": ""},
  {"name": "Last Stand", "x": 480, "y": -90, "realm": "Marches", "kind": "fort", "line": "Cairnwatch (+540,+10)"},
  {"name": "Bleakstead", "x": -120, "y": 300, "realm": "Marches", "kind": "village", "line": "Grimfrost Marches hamlet on the Cold March"},
  {"name": "Cairnwatch", "x": 540, "y": 10, "realm": "Marches", "kind": "fort", "line": "Iron Vanguard cairn-fort in the Ashen Marches"}
];

/* rivers, along the courses the physical-geography entry gives (through the named towns) */
export var RIVERS = [
  { name: "The Aurel", w: 3.2, pts: [[212, 118], [185, 96], [125, 86], [60, 70], [35, 25], [0, 0], [-40, 35], [-95, 8], [-140, -62], [-180, -120], [-212, -132]] },
  { name: "The Silverstream", w: 1.7, pts: [[104, -150], [90, -80], [86, -32], [80, 10], [46, 20]] },
  { name: "The Greenvein", w: 2.6, pts: [[-700, 420], [-640, 352], [-560, 270], [-640, 222], [-740, 160], [-792, 92], [-808, 58]] },
  { name: "The Deepwater", w: 1.8, pts: [[290, 180], [322, 122], [358, 72], [390, 30], [402, -24], [406, -72]], under: [0, 3] },
  // beyond Hearthmoot the lore gives no course; it is drawn west along the foothills to the Frostsea, the nearest sea
  { name: "The Frostmaw", w: 2.6, pts: [[40, 892], [12, 800], [0, 720], [48, 632], [90, 560], [68, 498], [0, 470], [-120, 468], [-262, 520], [-392, 566]] },
  { name: "Zahir's Vein", w: 1.6, seasonal: true, pts: [[-470, -742], [-492, -560], [-502, -420], [-480, -280], [-458, -168], [-432, -98]] },
  { name: "The Ashen", w: 2.2, blight: true, pts: [[720, 450], [752, 330], [782, 200], [780, 80], [818, -62], [858, -184], [880, -280], [886, -318]] }
];
/* lakes the lore names (Lanternmere is a lake village) */
export var LAKES = [{ name: "Lanternmere", x: -136, y: 82, rx: 13, ry: 8 }];
/* roads and routes from the Roads & Trade Routes entry; kind: highway | road | track | caravan | ash */
export var ROADS = [
  { name: "Royal Highway North", kind: "highway", pts: [[0, 0], [0, 140], [0, 190]] },
  { name: "Royal Highway South", kind: "highway", pts: [[0, 0], [25, -110], [-80, -120], [-180, -120]] },
  { name: "The Gold Road", kind: "road", pts: [[0, 0], [35, 25], [60, 70], [150, 60], [180, 110], [230, 175], [280, 240]] },
  { name: "The Green Way", kind: "road", pts: [[0, 0], [-160, 40], [-270, 90], [-380, 140], [-500, 180], [-620, 220]] },
  { name: "The Guild Road", kind: "road", pts: [[0, 0], [80, 10], [90, -80], [140, -40]] },
  { name: "The Cold March", kind: "track", pts: [[0, 190], [-120, 300], [-20, 380], [-80, 510], [-40, 620], [0, 720]] },
  { name: "The Ash Track", kind: "ash", pts: [[180, 110], [330, 60], [540, 10], [480, -90], [560, -310]] },
  { name: "The Brass Road", kind: "caravan", pts: [[-340, -190], [-480, -280], [-640, -300], [-820, -320]] },
  { name: "The Deep Route", kind: "track", pts: [[-820, -320], [-890, -420], [-950, -500]] }
];
export var SEA_LANES = [
  { name: "Port Valor to Port Meridian", pts: [[-212, -132], [-260, -210], [-200, -300], [-120, -400], [-80, -470]] },
  { name: "Port Meridian to Ashenport", pts: [[-80, -480], [100, -520], [360, -470], [620, -380], [880, -300]] },
  { name: "Coastal run", pts: [[-310, -480], [-180, -470], [-80, -480], [20, -342]] }
];
/* named wilds, ranges and wastes (label areas; some also reshape the ground) */
export var CANON_AREAS = [
  { id: "direwood", name: "The Direwood", x: -90, y: 100, r: 55, terrain: "forest", line: "Northwest Aurelia: goblin warrens, old barrows, the best boar hunting in the kingdom." },
  { id: "sablecrown", name: "The Sablecrown", x: 265, y: 50, r: 90, line: "Low weathered range between eastern Aurelia and the Ashen Marches. Old mines, older barrows." },
  { id: "ironspine", name: "The Ironspine", x: 450, y: 290, r: 160, line: "North-south granite spine of Stonehold, peaks to 14,000 ft. Four passes, snowbound December to March." },
  { id: "frostfangs", name: "The Frostfangs", x: 0, y: 820, r: 160, line: "Drakmor's northern wall. Never fully thaws. Wyrm territory above the snowline." },
  { id: "blackpine", name: "The Blackpine", x: 140, y: 560, r: 120, line: "Drakmor's taiga belt." },
  { id: "glass", name: "The Glass Waste", x: -1100, y: -650, r: 170, terrain: "glass", line: "Four hundred miles of sand fused by some ancient working. Nothing has lived there since." },
  { id: "dunes", name: "The Endless Dunes", x: -760, y: -180, r: 160, line: "Erg country between the Grey Sea and the caravan wells." },
  { id: "ridge", name: "The Sunscar Ridge", x: -720, y: -770, r: 220, line: "Volcanic; marks Sunscar's southern limit and feeds the obsidian trade." },
  { id: "barrens", name: "The Ash Barrens", x: 860, y: 250, r: 150, terrain: "ashwood", line: "The Reach's dead forest: standing trunks, no leaves, six hundred years and no rot." },
  { id: "withered", name: "The Withered Wastes", x: 1150, y: 120, r: 160, terrain: "withered", line: "The dead country ringing the Umbral Reach's eastern edge." },
  { id: "shadowfen", name: "Shadowfen", x: 560, y: -300, r: 45, terrain: "fen", line: "A migrating fen at the Reach's southern edge." },
  { id: "redmarsh", name: "Redmarsh", x: 140, y: -40, r: 24, terrain: "fen", line: "Marshland village country on the Guild Road." },
  { id: "greenwhisper", name: "The Great Tree", x: -620, y: 220, r: 70, terrain: "ancient", line: "Greenwhisper, seat of the Circle of Nine, under the oldest trees in the world." }
];
export var SEA_LABELS = [
  { name: "The Silver Ocean", x: -1230, y: 260 }, { name: "The Grey Sea", x: -660, y: 18 }, { name: "The Southern Ocean", x: -480, y: -900 },
  { name: "The Sapphire Sea", x: 430, y: -540 }, { name: "The Frostsea", x: -660, y: 760 }, { name: "Strait of Drakes", x: -96, y: -392, small: true }
];

export var BIOMES = [
  { id: "ocean", name: "Sea", color: "#2b4f6e", travel: 99, passable: false },
  { id: "coast", name: "Coast", color: "#cdbb8c", travel: 1.1, passable: true },
  { id: "snow", name: "Snowfield", color: "#e4eaee", travel: 2.6, passable: true },
  { id: "peaks", name: "Mountains", color: "#8b8378", travel: 3.2, passable: true },
  { id: "hills", name: "Hills", color: "#a39a6d", travel: 1.7, passable: true },
  { id: "fen", name: "Fen", color: "#5e7a5a", travel: 2.2, passable: true },
  { id: "badlands", name: "Wasteland", color: "#b58f5c", travel: 1.5, passable: true },
  { id: "taiga", name: "Pine forest", color: "#476553", travel: 1.7, passable: true },
  { id: "forest", name: "Forest", color: "#3f6b3a", travel: 1.6, passable: true },
  { id: "tundra", name: "Tundra", color: "#98a392", travel: 1.5, passable: true },
  { id: "steppe", name: "Dry steppe", color: "#c2a86a", travel: 1.2, passable: true },
  { id: "grassland", name: "Farmland and meadow", color: "#83a35a", travel: 1, passable: true },
  { id: "desert", name: "Desert", color: "#dcbd7e", travel: 2.2, passable: true },
  { id: "glass", name: "Glass waste", color: "#cfc9b3", travel: 2.6, passable: true },
  { id: "oasis", name: "Oasis", color: "#5f9a55", travel: 1, passable: true },
  { id: "ancient", name: "Ancient forest", color: "#2c5634", travel: 1.9, passable: true },
  { id: "blight", name: "Blighted land", color: "#55495e", travel: 1.8, passable: true },
  { id: "ashwood", name: "Dead forest", color: "#5e5862", travel: 1.9, passable: true },
  { id: "withered", name: "Withered waste", color: "#7d7268", travel: 1.7, passable: true }
];
var BIOME_IDX = {}; BIOMES.forEach(function (b, i) { BIOME_IDX[b.id] = i; });

/* ---------- deterministic randomness and noise ---------- */
function hash32(str) { var h = 2166136261; str = String(str); for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed) { seed = typeof seed === "string" ? hash32(seed) : seed; return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function ValueNoise(seed) {
  this.salt = hash32(seed) % 2147483647;
}
ValueNoise.prototype.lattice = function (ix, iy) { var h = ix * 374761393 + iy * 668265263 + this.salt * 1442695041 | 0; h = Math.imul(h ^ h >>> 13, 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
ValueNoise.prototype.sample = function (x, y) {
  var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  var a = this.lattice(ix, iy), b = this.lattice(ix + 1, iy), c = this.lattice(ix, iy + 1), d = this.lattice(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};
ValueNoise.prototype.fbm = function (x, y, oct) { var amp = 1, f = 1, sum = 0, nrm = 0; oct = oct || 4; for (var i = 0; i < oct; i++) { sum += amp * this.sample(x * f, y * f); nrm += amp; amp *= 0.5; f *= 2; } return sum / nrm; };

/* ---------- coordinates ---------- */
export function toU(x, y) { return [(x - FRAME.X0) / GEN.kmPerUnit, (FRAME.Y1 - y) / GEN.kmPerUnit]; }
export function toKm(u, v) { return [FRAME.X0 + u * GEN.kmPerUnit, FRAME.Y1 - v * GEN.kmPerUnit]; }

/* ---------- Voronoi (Bowyer-Watson Delaunay, circumcentres as vertices) ---------- */
function circum(P, a, b, c) {
  var ax = P[a][0], ay = P[a][1], bx = P[b][0], by = P[b][1], cx = P[c][0], cy = P[c][1];
  var d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-12) return { a: a, b: b, c: c, cx: (ax + bx + cx) / 3, cy: (ay + by + cy) / 3, r2: Infinity };
  var a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
  var ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d, uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
  return { a: a, b: b, c: c, cx: ux, cy: uy, r2: (ax - ux) * (ax - ux) + (ay - uy) * (ay - uy) };
}
function delaunay(input) {
  var P = input.slice(), minX = 1e18, minY = 1e18, maxX = -1e18, maxY = -1e18, i;
  for (i = 0; i < P.length; i++) { minX = Math.min(minX, P[i][0]); minY = Math.min(minY, P[i][1]); maxX = Math.max(maxX, P[i][0]); maxY = Math.max(maxY, P[i][1]); }
  var dm = Math.max(maxX - minX, maxY - minY) * 20, mx = (minX + maxX) / 2, my = (minY + maxY) / 2, n = P.length;
  P.push([mx - dm, my - dm], [mx, my + dm], [mx + dm, my - dm]);
  var tris = [circum(P, n, n + 1, n + 2)];
  for (i = 0; i < n; i++) {
    var px = P[i][0], py = P[i][1], bad = [], keep = [];
    for (var t = 0; t < tris.length; t++) { var T = tris[t]; ((px - T.cx) * (px - T.cx) + (py - T.cy) * (py - T.cy) < T.r2 ? bad : keep).push(T); }
    var edges = {};
    bad.forEach(function (T) { [[T.a, T.b], [T.b, T.c], [T.c, T.a]].forEach(function (e) { var k = e[0] < e[1] ? e[0] + "," + e[1] : e[1] + "," + e[0]; if (edges[k]) delete edges[k]; else edges[k] = e; }); });
    for (var k in edges) keep.push(circum(P, edges[k][0], edges[k][1], i));
    tris = keep;
  }
  return tris.filter(function (T) { return T.a < n && T.b < n && T.c < n; });
}
function neighborsOf(pts, w, h) {
  var n = pts.length, frame = [], step = Math.max(w, h) / 10, x, y;
  for (x = -step; x <= w + step; x += step) { frame.push([x, -step * 1.2]); frame.push([x, h + step * 1.2]); }
  for (y = 0; y <= h; y += step) { frame.push([-step * 1.2, y]); frame.push([w + step * 1.2, y]); }
  var tris = delaunay(pts.concat(frame)), nb = pts.map(function () { return {}; });
  tris.forEach(function (T) { [[T.a, T.b], [T.b, T.c], [T.c, T.a]].forEach(function (e) { if (e[0] < n && e[1] < n) { nb[e[0]][e[1]] = 1; nb[e[1]][e[0]] = 1; } }); });
  return nb.map(function (o) { return Object.keys(o).map(Number).sort(function (a, b) { return a - b; }); });
}

/* ---------- the land: canon-shaped elevation field (miles) ---------- */
var NOISE = { elev: new ValueNoise(GEN.seed + "|elev"), moist: new ValueNoise(GEN.seed + "|moist"), temp: new ValueNoise(GEN.seed + "|temp"), warp: new ValueNoise(GEN.seed + "|warp"), detail: new ValueNoise(GEN.seed + "|detail"), shape: new ValueNoise(GEN.seed + "|shape") };
function blob(x, y, cx, cy, rx, ry, k) { var dx = (x - cx) / rx, dy = (y - cy) / ry; return Math.exp(-(dx * dx + dy * dy) * k); }
function landField(x, y) {
  var f = 0;
  KINGDOMS.forEach(function (K) { if (K.isles) return; f += blob(x, y, K.at[0], K.at[1], K.r, K.r * 0.92, 1.25); });
  EXTRA_LAND.forEach(function (e) { f += 0.8 * blob(x, y, e[0], e[1], e[2], e[2], 1.3); });
  f += (NOISE.shape.fbm(x / (40 * KS), y / (40 * KS), 4) - 0.5) * 0.6 + (NOISE.detail.fbm(x / 75, y / 75, 3) - 0.5) * 0.55;
  SEAS.forEach(function (s) { f -= s[4] * blob(x, y, s[0], s[1], s[2], s[3], 1.6); });
  // the open ocean at the edges of the map
  var edge = (NOISE.warp.fbm(x / 120, y / 120, 3) - 0.5) * 160;
  if (x < -1060 + edge) f -= (-1060 + edge - x) / 70; if (x > 1180 + edge) f -= (x - 1180 - edge) / 60; if (y > 920 + edge) f -= (y - 920 - edge) / 50; if (y < -830 + edge) f -= (-830 + edge - y) / 50;
  // the isles rise out of the sea after it is cut
  var isle = 0; ISLES.forEach(function (e) { isle = Math.max(isle, 1.25 * blob(x, y, e[0], e[1], e[2], e[2] * 0.85, 1.2) + (NOISE.shape.sample(x / 30, y / 30) - 0.5) * 0.25); });
  return Math.max(f, isle);
}
function ridge(x, y) { // the ranges the lore places
  var m = 0;
  // the Ironspine: a north-south granite spine, X +250..+650
  var t = Math.max(0, Math.min(1, (y - 60) / 400)), cx = 430 + 40 * t;
  m += Math.exp(-Math.pow((x - cx) / 110, 2)) * Math.exp(-Math.pow(Math.max(0, Math.abs(y - 260) - 190) / 60, 2)) * (0.55 + 0.35 * NOISE.shape.fbm(x / 60, y / 60, 3));
  // the Frostfangs: Drakmor's northern wall, Y +700..+900
  m += Math.exp(-Math.pow((y - 810) / 75, 2)) * Math.exp(-Math.pow(Math.max(0, Math.abs(x) - 330) / 90, 2)) * (0.46 + 0.3 * NOISE.shape.sample(x / 50, 3));
  // Drakmor's southern foothills, broken at Grimfrost Pass (-80, +510)
  m += Math.exp(-Math.pow((y - 515) / 38, 2)) * Math.exp(-Math.pow(Math.max(0, Math.abs(x - 20) - 300) / 70, 2)) * (1 - 0.8 * Math.exp(-Math.pow((x + 80) / 34, 2))) * 0.26;
  // the Sablecrown: low weathered range, X +180..+350, Y -50..+150
  m += blob(x, y, 265, 50, 90, 105, 1.6) * 0.2 * (0.6 + 0.8 * NOISE.shape.sample(x / 40 + 7, y / 40));
  // the Sunscar Ridge: volcanic, Sunscar's southern limit
  m += Math.exp(-Math.pow((y + 768) / 42, 2)) * Math.exp(-Math.pow(Math.max(0, Math.abs(x + 720) - 360) / 80, 2)) * 0.38;
  // Black Spire, and Sylvanor's northern highlands
  m += blob(x, y, 720, 450, 40, 40, 1) * 0.4 + blob(x, y, -650, 470, 260, 70, 1) * 0.14;
  return m;
}
var LAND_T = 0.34;
function elevAt(x, y) {
  var f = landField(x, y);
  if (f < LAND_T) return Math.max(0, 0.32 - (LAND_T - f) * 0.55);
  var e = GEN.seaLevel + 0.03 + Math.min(1, (f - LAND_T) / 2.6) * 0.3 + (NOISE.elev.fbm(x / (34 * KS), y / (34 * KS), 5) - 0.5) * 0.3 + ridge(x, y);
  return Math.max(0, Math.min(1, e));
}
function kingdomIndexByName(k) { for (var i = 0; i < KINGDOMS.length; i++) if (KINGDOMS[i].k === k) return i; return -1; }
/* which realm's character a point has (for its climate and ground), by the Atlas Index's realm boxes */
export function zoneAt(x, y) {
  var z = neutralAt(x, y); if (z) return z.id;
  var j = (NOISE.warp.fbm(x / 140 + 11, y / 140, 3) - 0.5) * 120; x += j; y += (NOISE.warp.fbm(x / 140, y / 140 + 23, 3) - 0.5) * 120;
  if (y > 430 && x > -440 && x < 450) return "Drakmor";
  if (x > 545 && y > -360 && y < 640) return "Umbral";
  if (x < -300 && y > 40) return "Sylvanor";
  if (x < -150 && y < -40 && !(x > -400 && y < -260)) return "Sunscar";
  if (y < -230 && x > -420 && x < 320) return "Velkar";
  if (x > 200 && y > -20 && x < 560) return "Stonehold";
  return "Aurelia";
}

/* ---------- generate the cell world ---------- */
var BASE = null;
export function baseWorld() {
  if (BASE) return BASE;
  var R = rng(GEN.seed + "|points");
  var sp = GEN.spacingKm / GEN.kmPerUnit, cols = Math.round(UW / sp), rows = Math.round(UH / sp), sx = UW / cols, sy = UH / rows, pts = [];
  for (var r = 0; r < rows; r++) for (var q = 0; q < cols; q++) pts.push([Math.round(((q + 0.5) * sx + (R() * 0.76 - 0.38) * sx) * 10) / 10, Math.round(((r + 0.5) * sy + (R() * 0.76 - 0.38) * sy) * 10) / 10]);
  var nbrs = neighborsOf(pts, UW, UH);
  var cells = pts.map(function (p, i) {
    var km = toKm(p[0], p[1]), e = elevAt(km[0], km[1]);
    return { i: i, u: p[0], v: p[1], x: km[0], y: km[1], n: nbrs[i], elev: e, water: e < GEN.seaLevel, moist: 0, temp: 0, biome: 0, owner: -1, river: false, seen: true, zone: zoneAt(km[0], km[1]) };
  });
  // water that does not reach the open sea is filled in: the lore names no inland lakes but Lanternmere (drawn separately)
  var open = {}, oq = [];
  cells.forEach(function (c) { if (c.water && (c.u < sp * 1.5 || c.v < sp * 1.5 || c.u > UW - sp * 1.5 || c.v > UH - sp * 1.5)) { open[c.i] = 1; oq.push(c.i); } });
  for (var oi = 0; oi < oq.length; oi++) cells[oq[oi]].n.forEach(function (nb) { if (!open[nb] && cells[nb].water) { open[nb] = 1; oq.push(nb); } });
  cells.forEach(function (c) { if (c.water && !open[c.i]) { c.water = false; c.elev = GEN.seaLevel + 0.04; } });
  // every canonical place stands on dry land; ports are coastal by the sea shapes above
  CANON_PLACES.forEach(function (pn) { if (pn.kind === "wreck") return; var c = nearestCell(cells, toU(pn.x, pn.y)); if (c.water || c.elev < GEN.seaLevel + 0.03) { c.water = false; c.elev = GEN.seaLevel + 0.05; } });
  // distance from the sea, for moisture
  var hop = cells.map(function () { return 1e9; }), qd = [];
  cells.forEach(function (c) { if (c.water) { hop[c.i] = 0; qd.push(c.i); } });
  for (var qi = 0; qi < qd.length; qi++) { var cur = qd[qi]; cells[cur].n.forEach(function (nb) { if (hop[nb] > hop[cur] + 1) { hop[nb] = hop[cur] + 1; qd.push(nb); } }); }
  // rivers are the canonical ones (RIVERS); mark the cells they cross
  RIVERS.forEach(function (rv) { for (var k = 1; k < rv.pts.length; k++) { var a = rv.pts[k - 1], b = rv.pts[k], steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 15); for (var s = 0; s <= steps; s++) { var c = nearestCell(cells, toU(a[0] + (b[0] - a[0]) * s / steps, a[1] + (b[1] - a[1]) * s / steps)); if (!c.water) c.river = true; } } });
  cells.forEach(function (c) {
    var m = NOISE.moist.fbm(c.x / (36 * KS), c.y / (36 * KS), 4) * 0.75 + (c.river ? 0.25 : 0) + Math.max(0, 0.3 - hop[c.i] * 0.06);
    if (c.zone === "Sylvanor") m += 0.3; if (c.zone === "Sunscar" || c.zone === "ashen") m -= 0.4; if (c.zone === "Velkar") m += 0.1;
    c.moist = Math.max(0, Math.min(1, m));
    var lat = (c.y - FRAME.Y0) / H;
    c.temp = Math.max(0, Math.min(1, 0.95 - lat * 0.8 - Math.max(0, c.elev - GEN.seaLevel) * 0.45 + (NOISE.temp.sample(c.x / 160, c.y / 160) - 0.5) * 0.15));
    c.biome = BIOME_IDX[pickBiome(c)];
  });
  // named wilds reshape the ground (land cells only)
  CANON_AREAS.forEach(function (ar) {
    if (!ar.terrain) return;
    cells.forEach(function (c) { if (c.water || Math.hypot(c.x - ar.x, c.y - ar.y) > ar.r) return; if (c.biome === BIOME_IDX.peaks) return; c.biome = BIOME_IDX[ar.terrain]; });
  });
  // oases are green islands in the sand
  CANON_PLACES.forEach(function (pn) { if (pn.kind !== "oasis") return; var c = nearestCell(cells, toU(pn.x, pn.y)); if (!c.water) c.biome = BIOME_IDX.oasis; });
  BASE = { cells: cells, rivers: [], g: sp, hop: hop };
  buildGrid(BASE);
  buildElevRaster(BASE);
  return BASE;
}
function pickBiome(c) {
  if (c.water) return "ocean";
  var e = c.elev, m = c.moist, t = c.temp, sea = GEN.seaLevel, z = c.zone, n = NOISE.shape.fbm(c.x / 90 + 5, c.y / 90, 3);
  if (e < sea + 0.03 && t > 0.2 && z !== "Sunscar") return "coast";
  if (z === "Drakmor" || z === "howling") {
    if (e >= 0.88) return "peaks";
    if (c.y > 720 || z === "howling") return e >= 0.7 || n > 0.6 ? "snow" : "tundra";
    if (c.y > 450 && c.y < 660) return n > 0.62 ? "tundra" : "taiga";
    return "tundra";
  }
  if (z === "grimfrost") return e >= 0.75 ? "hills" : "tundra";
  if (z === "ashen") return e >= 0.75 ? "hills" : "badlands";
  if (z === "Sunscar") { if (e >= 0.8) return c.y < -700 ? "peaks" : "hills"; return n > 0.66 && c.y > -300 ? "steppe" : "desert"; }
  if (z === "Umbral") { if (e >= 0.88) return "peaks"; return n > 0.58 ? "ashwood" : "blight"; }
  if (z === "Sylvanor") { if (e >= 0.86) return "hills"; return c.y > 420 && n > 0.5 ? "taiga" : "forest"; }
  if (z === "Stonehold") { if (e >= 0.82) return "peaks"; if (e >= 0.68) return "hills"; return n > 0.55 ? "taiga" : "hills"; }
  if (z === "Velkar") return m > 0.62 ? "fen" : n > 0.55 ? "forest" : "grassland";
  // Aurelia: river valleys, wheat country, woods
  if (e >= 0.86) return "peaks";
  if (e >= 0.72) return "hills";
  if (m > 0.78 && e < 0.5) return "fen";
  return n > 0.64 ? "forest" : "grassland";
}

/* ---------- spatial lookup ---------- */
function buildGrid(B) {
  var g = B.g, gw = Math.ceil(UW / g) + 1, gh = Math.ceil(UH / g) + 1; B.gw = gw; B.gh = gh; B.gcell = new Array(gw * gh);
  for (var i = 0; i < gw * gh; i++) B.gcell[i] = [];
  B.cells.forEach(function (c) { B.gcell[Math.floor(c.v / g) * gw + Math.floor(c.u / g)].push(c.i); });
}
function nearestCell(cells, uv) { var best = cells[0], bd = 1e18; for (var i = 0; i < cells.length; i++) { var dx = cells[i].u - uv[0], dy = cells[i].v - uv[1], d = dx * dx + dy * dy; if (d < bd) { bd = d; best = cells[i]; } } return best; }
// nearest cell plus how close the runner-up is: the blend weight softens biome edges
var NEAR2 = { c1: null, c2: null, d1: 0, d2: 0 };
function nearest2(B, u, v) {
  var g = B.g, gx = Math.floor(u / g), gy = Math.floor(v / g), b1 = -1, b2 = -1, d1 = 1e18, d2 = 1e18;
  for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
    var X = gx + dx, Y = gy + dy; if (X < 0 || Y < 0 || X >= B.gw || Y >= B.gh) continue;
    var list = B.gcell[Y * B.gw + X];
    for (var k = 0; k < list.length; k++) { var c = B.cells[list[k]], ddx = c.u - u, ddy = c.v - v, d = ddx * ddx + ddy * ddy; if (d < d1) { d2 = d1; b2 = b1; d1 = d; b1 = list[k]; } else if (d < d2) { d2 = d; b2 = list[k]; } }
  }
  if (b1 < 0) { var c0 = nearestIn(B, u, v); NEAR2.c1 = c0; NEAR2.c2 = c0; NEAR2.d1 = 0; NEAR2.d2 = 1; return NEAR2; }
  NEAR2.c1 = B.cells[b1]; NEAR2.c2 = B.cells[b2 < 0 ? b1 : b2]; NEAR2.d1 = Math.sqrt(d1); NEAR2.d2 = Math.sqrt(d2); return NEAR2;
}
function nearestIn(B, u, v) {
  var g = B.g, gx = Math.floor(u / g), gy = Math.floor(v / g), best = -1, bd = 1e18;
  for (var r = 1; r <= 3 && best < 0; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
    var X = gx + dx, Y = gy + dy; if (X < 0 || Y < 0 || X >= B.gw || Y >= B.gh) continue;
    var list = B.gcell[Y * B.gw + X];
    for (var k = 0; k < list.length; k++) { var c = B.cells[list[k]], ddx = c.u - u, ddy = c.v - v, d = ddx * ddx + ddy * ddy; if (d < bd) { bd = d; best = list[k]; } }
  }
  return B.cells[best < 0 ? 0 : best];
}
// smooth elevation / water raster, one pixel per map unit, blended from nearby cells like the UWE terrain sampler
function buildElevRaster(B) {
  var rs = 2, w = Math.ceil(UW / rs) + 2, h = Math.ceil(UH / rs) + 2; B.rs = rs; B.rw = w; B.rh = h; B.elevR = new Float32Array(w * h); B.waterR = new Uint8Array(w * h);
  var g = B.g, R = g * 1.6, gx, gy;
  for (var ry = 0; ry < h; ry++) for (var rx = 0; rx < w; rx++) {
    var px = rx * rs, py = ry * rs;
    gx = Math.floor(px / g); gy = Math.floor(py / g); var sw = 0, se = 0, swat = 0;
    for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
      var X = gx + dx, Y = gy + dy; if (X < 0 || Y < 0 || X >= B.gw || Y >= B.gh) continue;
      var list = B.gcell[Y * B.gw + X];
      for (var k = 0; k < list.length; k++) { var c = B.cells[list[k]], ddx = c.u - px, ddy = c.v - py, dd = Math.sqrt(ddx * ddx + ddy * ddy); if (dd >= R) continue; var wt = Math.pow(1 - dd / R, 3); sw += wt; se += wt * c.elev; swat += wt * (c.water ? 1 : 0); }
    }
    var i = ry * w + rx; if (sw === 0) { var c0 = nearestIn(B, px, py); B.elevR[i] = c0.elev; B.waterR[i] = c0.water ? 255 : 0; } else { B.elevR[i] = se / sw; B.waterR[i] = Math.round(255 * swat / sw); }
  }
  // two box-blur passes of the elevation (not the water mask, which keeps coasts sharp)
  var tmp = new Float32Array(w * h);
  for (var pass = 0; pass < 2; pass++) {
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) { var acc = 0, cnt = 0; for (var ox = -2; ox <= 2; ox++) { var X2 = xx + ox; if (X2 < 0 || X2 >= w) continue; acc += B.elevR[yy * w + X2]; cnt++; } tmp[yy * w + xx] = acc / cnt; }
    for (xx = 0; xx < w; xx++) for (yy = 0; yy < h; yy++) { acc = 0; cnt = 0; for (var oy = -2; oy <= 2; oy++) { var Y2 = yy + oy; if (Y2 < 0 || Y2 >= h) continue; acc += tmp[Y2 * w + xx]; cnt++; } B.elevR[yy * w + xx] = acc / cnt; }
  }
}

/* ---------- politics: which kingdom owns which cell, given what the story has pinned ---------- */
function MinHeap() { this.a = []; }
MinHeap.prototype.push = function (v, k) { var a = this.a; a.push({ k: k, v: v }); var i = a.length - 1; while (i > 0) { var p = i - 1 >> 1; if (a[p].k <= a[i].k) break; var t = a[p]; a[p] = a[i]; a[i] = t; i = p; } };
MinHeap.prototype.pop = function () { var a = this.a; if (!a.length) return null; var top = a[0], last = a.pop(); if (a.length) { a[0] = last; var i = 0; for (;;) { var l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l].k < a[m].k) m = l; if (r < a.length && a[r].k < a[m].k) m = r; if (m === i) break; var t = a[m]; a[m] = a[i]; a[i] = t; i = m; } } return top; };
Object.defineProperty(MinHeap.prototype, "size", { get: function () { return this.a.length; } });
/* pins: [{x, y, k}] where k is a realm key. Returns an owner array. The Marches and the Howling Wastes stay unclaimed. */
export function politics(pins) {
  var B = baseWorld(), cells = B.cells, owner = new Int8Array(cells.length).fill(-1);
  var seeds = [];
  KINGDOMS.forEach(function (K, ki) { seeds.push({ c: nearestCell(cells, toU(K.capital[0], K.capital[1])), k: ki }); });
  CANON_PLACES.forEach(function (pn) { var ki = kingdomIndexByName(pn.realm); if (ki < 0 || pn.kind === "wreck") return; var c = nearestCell(cells, toU(pn.x, pn.y)); if (neutralAt(c.x, c.y)) return; seeds.push({ c: c, k: ki }); });
  (pins || []).forEach(function (pn) { var ki = kingdomIndexByName(pn.k); if (ki < 0 || !isFinite(pn.x) || !isFinite(pn.y)) return; var c = nearestCell(cells, toU(pn.x, pn.y)); if (c.water || neutralAt(c.x, c.y)) return; seeds.push({ c: c, k: ki }); });
  var unclaimed = function (c) { return !!neutralAt(c.x, c.y); };
  var cost = new Float32Array(cells.length).fill(1e18), heap = new MinHeap();
  seeds.forEach(function (sd) { if (sd.c.water) return; cost[sd.c.i] = 0; owner[sd.c.i] = sd.k; heap.push(sd.c.i, 0); });
  while (heap.size) {
    var t = heap.pop(), cur = t.v; if (t.k > cost[cur]) continue;
    cells[cur].n.forEach(function (nb) {
      if (cells[nb].water || unclaimed(cells[nb])) return;
      var tc = BIOMES[cells[nb].biome].travel, riverPen = cells[nb].river && !cells[cur].river ? 2.5 : 1;
      // a realm reaching outside its own character costs more, so borders settle where the land changes
      var zonePen = cells[nb].zone === KINGDOMS[owner[cur]].k ? 1 : 2.2;
      var dx = cells[cur].x - cells[nb].x, dy = cells[cur].y - cells[nb].y, nd = t.k + Math.sqrt(dx * dx + dy * dy) * tc * riverPen * zonePen;
      if (nd < cost[nb]) { cost[nb] = nd; owner[nb] = owner[cur]; heap.push(nb, nd); }
    });
  }
  // isles the flood could not reach go to the nearest realm by distance
  cells.forEach(function (c) { if (c.water || owner[c.i] >= 0 || unclaimed(c)) return; var best = 0, bd = 1e18; KINGDOMS.forEach(function (K, ki) { var d = Math.hypot(c.x - K.at[0], c.y - K.at[1]) / K.r; if (d < bd) { bd = d; best = ki; } }); owner[c.i] = best; });
  return { owner: owner, base: B };
}

/* ---------- queries ---------- */
export function cellAtKm(x, y) { var B = baseWorld(), uv = toU(x, y); return nearestIn(B, Math.max(0, Math.min(UW, uv[0])), Math.max(0, Math.min(UH, uv[1]))); }
export function ownerAtKm(P, x, y) { return P.owner[cellAtKm(x, y).i]; }
export function isLand(x, y) { var c = cellAtKm(x, y); return !c.water; }
export function neutralAtKm(x, y) { return neutralAt(x, y); }
/* a point inside a realm, chosen from a key so it is stable */
export function pointInKingdom(P, kname, realm, key) {
  var B = P.base, ki = kingdomIndexByName(kname), cand = B.cells.filter(function (c) { return !c.water && P.owner[c.i] === ki && c.biome !== BIOME_IDX.peaks; });
  if (!cand.length) cand = B.cells.filter(function (c) { return !c.water && P.owner[c.i] === ki; });
  if (!cand.length) { var K = KINGDOMS[ki < 0 ? 0 : ki]; return { x: K.at[0], y: K.at[1] }; }
  var h = hash32(key), c = cand[h % cand.length], j = ((h >>> 8) % 1000) / 1000 - 0.5, k2 = ((h >>> 18) % 1000) / 1000 - 0.5;
  return { x: c.x + j * GEN.spacingKm * 0.8, y: c.y + k2 * GEN.spacingKm * 0.8 };
}
export function kingdomIndex(k) { return kingdomIndexByName(k); }

/* ---------- routes: roads between places, by path-finding over the cells ---------- */
function cellPath(cells, from, to, step) {
  var g = {}, prev = {}, open = new MinHeap(), closed = {};
  g[from] = 0; var h = function (i) { return Math.hypot(cells[i].x - cells[to].x, cells[i].y - cells[to].y) * 0.9; }; open.push(from, h(from));
  while (open.size) {
    var cur = open.pop().v;
    if (cur === to) { var path = [to], c = to; while (prev[c] !== undefined) { c = prev[c]; path.push(c); } return path.reverse(); }
    if (closed[cur]) continue; closed[cur] = 1;
    for (var k = 0; k < cells[cur].n.length; k++) { var nb = cells[cur].n[k], st = step(cur, nb); if (!isFinite(st)) continue; var ng = g[cur] + st; if (ng < (g[nb] === undefined ? 1e18 : g[nb])) { g[nb] = ng; prev[nb] = cur; open.push(nb, ng + h(nb)); } }
  }
  return null;
}
export function roadBetween(a, b) { // km points -> list of km points along passable ground
  var B = baseWorld(), cells = B.cells, ca = cellAtKm(a.x, a.y), cb = cellAtKm(b.x, b.y);
  if (ca.i === cb.i) return [[a.x, a.y], [b.x, b.y]];
  var path = cellPath(cells, ca.i, cb.i, function (i, j) { if (cells[j].water) return Infinity; var dx = cells[i].x - cells[j].x, dy = cells[i].y - cells[j].y; return Math.sqrt(dx * dx + dy * dy) * BIOMES[cells[j].biome].travel * (cells[j].river && !cells[i].river ? 1.8 : 1); });
  if (!path) return [[a.x, a.y], [b.x, b.y]];
  var pts = [[a.x, a.y]]; for (var i = 1; i < path.length - 1; i++) pts.push([cells[path[i]].x, cells[path[i]].y]); pts.push([b.x, b.y]); return pts;
}
// the roads worth drawing: a spanning tree over the places, plus each place's second-nearest neighbour when close
export function roadNetwork(places) {
  var n = places.length, edges = {}, out = [];
  if (n < 2) return out;
  var inTree = {}; inTree[0] = 1; var count = 1;
  function add(i, j) { var k = i < j ? i + "," + j : j + "," + i; if (edges[k]) return; edges[k] = 1; out.push({ a: places[i], b: places[j], pts: roadBetween(places[i], places[j]) }); }
  while (count < n) {
    var best = null;
    for (var i = 0; i < n; i++) if (inTree[i]) for (var j = 0; j < n; j++) if (!inTree[j]) { var d = Math.hypot(places[i].x - places[j].x, places[i].y - places[j].y); if (!best || d < best[2]) best = [i, j, d]; }
    if (!best) break; inTree[best[1]] = 1; count++; if (best[2] < 160 * KS) add(best[0], best[1]);
  }
  return out;
}
export function riversKm() { var B = baseWorld(); return B.rivers.map(function (path) { return path.map(function (i) { return [B.cells[i].x, B.cells[i].y]; }); }); }

/* ---------- discovery: which cells the character has seen ---------- */
export function revealCells(discs) { // discs: [{x, y, r}] in km; everything within is "seen"
  var B = baseWorld();
  B.cells.forEach(function (c) { c.seen = false; });
  discs.forEach(function (d) { B.cells.forEach(function (c) { if (!c.seen && Math.hypot(c.x - d.x, c.y - d.y) <= d.r) c.seen = true; }); });
}
export function revealAll() { baseWorld().cells.forEach(function (c) { c.seen = true; }); }
/* ---------- render a view of the terrain into an ImageData ----------
   view: { cx, cy (km at the centre), pxPerKm, w, h } in output pixels. */
function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
var BIOME_RGB = BIOMES.map(function (b) { return hex(b.color); });
var TINT_RGB = {}; Object.keys(KINGDOM_TINT).forEach(function (k) { TINT_RGB[k] = hex(KINGDOM_TINT[k]); });
export function renderTerrain(P, view, opts) {
  opts = opts || {}; var B = P.base, w = view.w, h = view.h, img = new Uint8ClampedArray(w * h * 4);
  var cid2 = new Int32Array(w * h), bw = new Float32Array(w * h), elev = new Float32Array(w * h), cid = new Int32Array(w * h), own = new Int8Array(w * h), wat = new Uint8Array(w * h);
  var pxKm = view.pxPerKm, kmPerPx = 1 / pxKm, g = B.g, warpAmp = g * 0.45;
  var scaleU = kmPerPx / GEN.kmPerUnit; // map units per output pixel
  var octaves = Math.max(1, Math.min(3, Math.round(Math.log2(g / Math.max(0.05, scaleU)))));
  var detailAmp = 0.1, sea = GEN.seaLevel;
  for (var py = 0; py < h; py++) for (var px = 0; px < w; px++) {
    var i = py * w + px, x = view.cx + (px - w / 2) * kmPerPx, y = view.cy - (py - h / 2) * kmPerPx, u = (x - FRAME.X0) / GEN.kmPerUnit, v = (FRAME.Y1 - y) / GEN.kmPerUnit;
    var outside = u < 0 || v < 0 || u > UW || v > UH;
    var uc = u < 0 ? 0 : u > UW - 1.01 ? UW - 1.01 : u, vc = v < 0 ? 0 : v > UH - 1.01 ? UH - 1.01 : v;
    var wu = uc + (NOISE.warp.fbm(uc * 0.012, vc * 0.012, 3) - 0.5) * warpAmp * 2 + (NOISE.detail.sample(uc * 0.09, vc * 0.09) - 0.5) * g * 0.3, wv = vc + (NOISE.warp.fbm(uc * 0.012 + 37.1, vc * 0.012 + 11.7, 3) - 0.5) * warpAmp * 2 + (NOISE.detail.sample(uc * 0.09 + 5.3, vc * 0.09 + 8.1) - 0.5) * g * 0.3;
    var nr = nearest2(B, wu < 0 ? 0 : wu > UW ? UW : wu, wv < 0 ? 0 : wv > UH ? UH : wv), c = nr.c1, bwt = 0;
    if (!c.water && !nr.c2.water && nr.c2.biome !== c.biome) { var gap = nr.d2 - nr.d1, soft = g * 0.2; if (gap < soft) bwt = 0.5 * (1 - gap / soft); }
    var rc = uc / B.rs, rcy = vc / B.rs, ix = Math.floor(rc), iy = Math.floor(rcy), fx = rc - ix, fy = rcy - iy, k0 = iy * B.rw + ix; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var e = B.elevR[k0] * (1 - fx) * (1 - fy) + B.elevR[k0 + 1] * fx * (1 - fy) + B.elevR[k0 + B.rw] * (1 - fx) * fy + B.elevR[k0 + B.rw + 1] * fx * fy;
    var wf = (B.waterR[k0] * (1 - fx) * (1 - fy) + B.waterR[k0 + 1] * fx * (1 - fy) + B.waterR[k0 + B.rw] * (1 - fx) * fy + B.waterR[k0 + B.rw + 1] * fx * fy) / 255;
    e += (NOISE.detail.fbm(uc * (2 / g), vc * (2 / g), octaves) - 0.5) * detailAmp;
    var wb = wf + (NOISE.warp.sample(uc * 0.03, vc * 0.03) - 0.5) * 0.25;
    var isW = c.water ? wb > 0.35 : wb > 0.62;
    if (outside) { isW = true; } // beyond the frame the sea continues as it is at the frame's edge
    cid2[i] = nr.c2.i; bw[i] = bwt;
    elev[i] = e; cid[i] = c.i; own[i] = isW ? -1 : P.owner[c.i]; wat[i] = isW ? 1 : 0;
  }
  var tint = opts.realms !== false, borders = opts.borders !== false, fog = opts.fog !== false && !!opts.fogDiscs;
  var fogA = null;
  if (fog) {
    fogA = new Float32Array(w * h).fill(1);
    opts.fogDiscs.forEach(function (d) {
      var rpx = d.r * pxKm, soft = Math.max(6, rpx * 0.38), reach = rpx + soft;
      var cxp = w / 2 + (d.x - view.cx) * pxKm, cyp = h / 2 - (d.y - view.cy) * pxKm;
      var x0 = Math.max(0, Math.floor(cxp - reach)), x1 = Math.min(w - 1, Math.ceil(cxp + reach)), y0 = Math.max(0, Math.floor(cyp - reach)), y1 = Math.min(h - 1, Math.ceil(cyp + reach));
      for (var yy = y0; yy <= y1; yy++) for (var xx = x0; xx <= x1; xx++) {
        var dd = Math.sqrt((xx - cxp) * (xx - cxp) + (yy - cyp) * (yy - cyp)), wob = (NOISE.detail.sample(xx * kmPerPx * 0.35 / KS + 3.1, yy * kmPerPx * 0.35 / KS + 7.7) - 0.5) * soft * 1.3;
        var t = (dd + wob - rpx) / soft; t = t < 0 ? 0 : t > 1 ? 1 : t; t = t * t * (3 - 2 * t);
        var k = yy * w + xx; if (t < fogA[k]) fogA[k] = t;
      }
    });
  }
  for (py = 0; py < h; py++) for (px = 0; px < w; px++) {
    i = py * w + px; var cc = B.cells[cid[i]], p = i * 4, r, gch, b, x_ = view.cx + (px - w / 2) * kmPerPx, y_ = view.cy - (py - h / 2) * kmPerPx;
    if (wat[i]) {
      var depth = Math.max(0, Math.min(1, (sea - elev[i]) * 2.4)), ripple = (NOISE.detail.fbm((view.cx + (px - w / 2) * kmPerPx) * 1.3 / KS, (view.cy - (py - h / 2) * kmPerPx) * 1.9 / KS, 2) - 0.5) * 3.5;
      r = 43 - depth * 22 + ripple * 0.4; gch = 79 - depth * 30 + ripple * 0.7; b = 110 - depth * 32 + ripple;
      if (depth < 0.12) { r += 22; gch += 30; b += 26; }
    } else {
      var col = BIOME_RGB[cc.biome], bi = cc.biome;
      if (bw[i] > 0) { var c2 = BIOME_RGB[B.cells[cid2[i]].biome], bwi = bw[i]; col = [col[0] * (1 - bwi) + c2[0] * bwi, col[1] * (1 - bwi) + c2[1] * bwi, col[2] * (1 - bwi) + c2[2] * bwi]; }
      // thresholds follow the detailed elevation so coasts, snow lines and peaks are crisp at any zoom
      if (elev[i] < sea + 0.03 && cc.temp > 0.2) col = BIOME_RGB[BIOME_IDX.coast];
      else if (elev[i] > 0.9) col = BIOME_RGB[BIOME_IDX.peaks];
      else if (elev[i] > 0.62 && cc.temp < 0.16) col = BIOME_RGB[BIOME_IDX.snow];
      r = col[0]; gch = col[1]; b = col[2];
      var nw = i - w - 1 >= 0 ? elev[i - w - 1] : elev[i], se2 = i + w + 1 < w * h ? elev[i + w + 1] : elev[i];
      var shade = Math.max(-1, Math.min(1, (nw - se2) * (7 + 14 * Math.min(1, kmPerPx * 6)))), lift = (elev[i] - 0.5) * 44;
      var tex = (NOISE.detail.fbm(x_ * 0.9 / KS, y_ * 0.9 / KS, 3) - 0.5) * 26; r += shade * 34 + lift + tex; gch += shade * 32 + lift + tex; b += shade * 28 + lift * 0.8 + tex * 0.8;
      if (tint) { var tc = TINT_RGB[KINGDOMS[own[i]] ? KINGDOMS[own[i]].k : ""]; if (tc) { r = r * 0.84 + tc[0] * 0.16; gch = gch * 0.84 + tc[1] * 0.16; b = b * 0.84 + tc[2] * 0.16; } }
      if (borders) {
        var rt = px + 1 < w ? own[i + 1] : own[i], dn = py + 1 < h ? own[i + w] : own[i], lf = px > 0 ? own[i - 1] : own[i], up = py > 0 ? own[i - w] : own[i];
        if ((rt !== own[i] && rt >= 0) || (dn !== own[i] && dn >= 0) || (lf !== own[i] && lf >= 0) || (up !== own[i] && up >= 0)) { if (((px + py) % 9) < 6) { r = r * 0.35 + 232 * 0.65; gch = gch * 0.35 + 196 * 0.65; b = b * 0.35 + 118 * 0.65; } }
      }
    }
    // coast ink
    if (!wat[i]) {
      var rt2 = px + 1 < w ? wat[i + 1] : 0, dn2 = py + 1 < h ? wat[i + w] : 0, lf2 = px > 0 ? wat[i - 1] : 0, up2 = py > 0 ? wat[i - w] : 0;
      if (rt2 || dn2 || lf2 || up2) { r *= 0.45; gch *= 0.45; b *= 0.4; }
    }
    var bs = wat[i] ? 0 : umbralHaze(x_, y_); // the Reach's blight lies over its land
    if (bs > 0) { var sw = NOISE.detail.fbm(x_ * 0.09 / KS + y_ * 0.03 / KS, y_ * 0.09 / KS - x_ * 0.04 / KS, 3), a2 = Math.min(0.62, bs * (0.4 + 0.5 * sw)); r = r * (1 - a2) + 46 * a2; gch = gch * (1 - a2) + 24 * a2; b = b * (1 - a2) + 66 * a2; }
    if (fogA) { var fa = fogA[i] * 0.42; r = r * (1 - fa) + 6 * fa; gch = gch * (1 - fa) + 9 * fa; b = b * (1 - fa) + 16 * fa; }
    img[p] = r < 0 ? 0 : r > 255 ? 255 : r; img[p + 1] = gch < 0 ? 0 : gch > 255 ? 255 : gch; img[p + 2] = b < 0 ? 0 : b > 255 ? 255 : b; img[p + 3] = 255;
  }
  return img;
}

/* the Umbral Reach's blight: a dark haze over its land, deepest toward Black Spire */
function umbralHaze(x, y) {
  if (x < 470 || y < -440 || y > 720) return 0;
  var d = Math.hypot((x - 840) / 360, (y - 140) / 430), s = Math.min(1, Math.max(0, 1 - d) * 1.7) + 0.5 * blob(x, y, 720, 450, 90, 90, 1);
  var fx = Math.max(0, Math.min(1, (x - 470) / 130)), fy = Math.max(0, Math.min(1, (720 - y) / 100)) * Math.max(0, Math.min(1, (y + 440) / 100));
  return Math.min(1, s) * fx * fx * (3 - 2 * fx) * fy;
}
/* terrain symbols (mountains, trees, hills, dunes, dead trees) for the cells in view: [{t, x, y, s}] in miles */
export function symbolsInView(P, view) {
  var B = P.base, out = [], halfW = view.w / 2 / view.pxPerKm + 40, halfH = view.h / 2 / view.pxPerKm + 40;
  B.cells.forEach(function (c) {
    if (c.water || Math.abs(c.x - view.cx) > halfW || Math.abs(c.y - view.cy) > halfH) return;
    var id = BIOMES[c.biome].id, t = id === "peaks" ? "mtn" : id === "hills" ? "hill" : id === "forest" || id === "taiga" || id === "ancient" ? "tree" : id === "fen" ? "fen" : id === "desert" ? "dune" : id === "ashwood" ? "dead" : "";
    if (!t) return;
    var R = rng(c.i * 7919 + 13), n = t === "mtn" ? 2 : t === "tree" ? 3 : t === "dune" ? 1 : 2;
    for (var k = 0; k < n; k++) out.push({ t: t, x: c.x + (R() - 0.5) * GEN.spacingKm * 0.8, y: c.y + (R() - 0.5) * GEN.spacingKm * 0.8, s: 0.8 + R() * 0.6, seen: c.seen, big: id === "ancient" });
  });
  return out;
}

export function kingdomLabels(P) {
  var B = P.base;
  return KINGDOMS.map(function (K, ki) {
    var sx = 0, sy = 0, n = 0; B.cells.forEach(function (c) { if (!c.water && P.owner[c.i] === ki) { sx += c.x; sy += c.y; n++; } });
    return { k: K.k, label: K.label, x: n ? sx / n : K.at[0], y: n ? sy / n : K.at[1] };
  });
}
export function biomeAt(x, y) { return BIOMES[cellAtKm(x, y).biome]; }
