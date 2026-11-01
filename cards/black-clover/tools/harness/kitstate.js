window.__KIT_EXTRA = function () {
  var loc = window.__getVars().current_location;
  var inv = window.__getVars().inventory.concat([
    { id: "it-pouch", name: "Belt pouch", qty: 1, cond: "good", weight: 0.3, bulk: 2, storage_profile: "belt_pouch", placement: { kind: "loose", held: true }, place: "loose" },
    { id: "it-sword", name: "Short sword", qty: 1, cond: "good", weight: 1.2, bulk: 4, type: "weapon", placement: { kind: "loose", held: true }, place: "loose" },
    { id: "it-cloak", name: "Torn travelling cloak", qty: 1, cond: "torn", weight: 0.9, bulk: 3, placement: { kind: "container", containerId: "it-satchel", slotId: "main" }, place: "bag" },
    { id: "it-potion", name: "Healing potion", qty: 2, cond: "good", weight: 0.45, bulk: 1, placement: { kind: "container", containerId: "it-satchel", slotId: "outer" }, place: "bag" },
    { id: "it-rope", name: "Rope", qty: 1, cond: "good", placement: { kind: "world", area: "ground", location: loc }, place: "ground" }]);
  window.__setVars({ inventory: inv });
};
