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
