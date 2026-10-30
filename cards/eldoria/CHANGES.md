# Eldoria: From F-Rank to Legend — v21.4

Import `Eldoria_From_F-Rank_to_Legend_v21.4.json`. It is built from `source/Eldoria_From_F-Rank_to_Legend_v21.3.json` by `tools/patch.py` (interface) and `tools/build.py` (card). Only the interface files and the version number changed. Lore, rules, variables and the narrator's prompt are exactly as before, so the per-turn cost is unchanged.

## Layout: phone portrait, phone landscape, desktop

**Why the phone screen was cut off on the right.** The app is a CSS grid whose only column was sized by its widest child. Yumina's message box puts the model picker, mushies, effort, voice and mic in one row, which is wider than a phone. That pushed the whole app past the right edge, cutting off the stat bars, the story text and the nav. In the test page the content was 548 px wide on a 390 px screen.

- **The fix:** the column is now `minmax(0, 1fr)`, so it always fits the screen, and the message box's controls wrap onto a second row when they need to.

**Why landscape had no room for the story.** Header, banner, location strip, stat bars, the message box and the nav were all stacked into about 390 px, leaving the story 83 px.

**Three layouts now, picked from the screen size:**
- **Phone portrait:** as before, minus the "Chronicle" banner on the story screen, which repeated the nav. The story gets that room.
- **Phone landscape:**
  - The nav becomes a rail down the left.
  - The location, time, weather and HP/MP/SP sit in a column beside the story.
  - The message box is tighter.
  - The story went from 83 px to about 190 px tall in the test page.
- **Desktop** (1024 px wide and up):
  - The nav is a sidebar on the left, and the story is in the middle at a readable width.
  - A status panel on the right shows where you are, the time, weather, HP/MP/SP, level, rank, purse, load, conditions and company, plus an "Open the map" button.
- **Settings:** the old "Sound Chamber" screen is now **Settings**. Its new **Display** card lets the player keep one layout whatever the screen does (Automatic / Phone portrait / Phone landscape / Desktop), saved in Yumina's storage.
- **Character creation** now scrolls inside the screen. The card's CSS locks the page height, which in the test page stopped the creator scrolling at all.
- **Small fix:** a missing list key on the More screen.

`docs/layout-phone-before-after.png` and `docs/layout-desktop.png` show the result.

## World map: Black Clover's generated map, rebuilt for Eldoria

The old map was a grid with pins. It also ignored places recorded the way the lore asks the narrator to (`"xy":[x,y]` with a `"type"`), so those never appeared.

The new map uses Black Clover's world engine: a Voronoi terrain generator with biomes, a territory fill, fog of discovery, zoom and pan. It is constrained entirely by Eldoria's own lore, so the map and the narrator agree:
- **Places:** all 85 places of the Atlas Index sit at their exact mile coordinates (`tools/map/gazetteer.json`).
- **Realms:**
  - Each realm's land is filled out from its capital and its places.
  - The Grimfrost Marches, Ashen Marches and Howling Wastes are claimed by no realm.
  - Stonefall stays a Stonehold holding in the Aurelian foothills, and Last Hope sits in the Grimfrost Marches.
- **Coasts and seas,** from the physical-geography entry:
  - The Silver Ocean, with its Grey Sea reaching Port Valor.
  - The channel south of Aurelia.
  - The Southern Ocean, the Sapphire Sea and the Frostsea.
  - The Velkar isles as true islands, with the Strait of Drakes.
- **Ranges:** the Ironspine, Frostfangs, Sablecrown and Sunscar Ridge, plus Drakmor's foothills broken at Grimfrost Pass.
- **Ground:**
  - Drakmor: taiga, tundra and snow.
  - Sylvanor: deep forest, with the ancient forest around Greenwhisper.
  - Sunscar: desert, with green oases and the Glass Waste.
  - The Umbral Reach: blighted land, the Ash Barrens' dead forest and the Withered Wastes, under a dark haze.
  - Aurelia: farmland, the Direwood and Redmarsh.
- **Rivers** follow their canonical courses through the named towns: the Aurel, Silverstream, Greenvein, Deepwater (dashed where it runs underground), Frostmaw, Zahir's Vein (seasonal) and the Ashen. Lanternmere is a lake.
- **Roads** follow the Roads & Trade Routes entry: the Royal Highways, the Gold Road, Green Way, Guild Road, Cold March, Ash Track and Brass Road, plus the sea lanes.
- **Pins and labels:**
  - Every discovered place is a pin, read from `x`/`y` or `xy`.
  - Capitals and great cities are labelled from the start.
  - Every other gazetteer place appears once discovered, or with the out-of-character "Every gazetteer place" layer.
- **Fog:** the terrain is drawn faded outside your homeland (`starting-realm`), where you are, and the places you know. A layer switch turns it off.
- **Tapping a place** shows its realm, coordinates, lore line, distance in miles and rough days on foot. **Travel here** sends "I plan a journey to …".
- **Tapping open ground** shows its biome and realm. If you're somewhere the gazetteer doesn't list, **I'm here** records it and your position. Gazetteer places never move.

**Checks** (`tools/check/full.mjs`):
- Every canonical place is on land (the Drowned Fleet is in the sea).
- Every port is on a coast.
- Every place is in its own realm.
- The Velkar isles are not joined by land to the mainland or to each other.

**Speed:** the world builds and draws in about 0.8 s on this machine (longer on a phone, behind "Drawing the continent…"). `docs/world-map-overview.png` and `docs/world-map-desktop.png` show it.

**Limits:**
- The terrain is the card's generated style, not a copy of the uploaded painting. The painting is kept in `source/eldoria-reference-map.jpg`.
- The Frostmaw's course past Hearthmoot isn't in the lore; it is drawn west to the Frostsea, the nearest sea.
- The "Endless Dunes" label comes from the uploaded map; the lore does not name them.

## Testing

`tools/harness` is a test page: esbuild, React, and a stand-in for Yumina's API whose message box has the same structure and width as the real one. It was used at 390×844, 844×390 and 1440×900 to:
- reproduce both reported bugs;
- check every main screen and the creator in all three layouts;
- try the map's Travel and I'm here actions.

Every file compiles with the same Sucrase transforms Yumina uses (`tools/harness/suc.mjs`).

**Not tested:** Yumina's real message box, which could size a little differently from the stand-in, and real phones.
