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
