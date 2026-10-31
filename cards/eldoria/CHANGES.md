# Eldoria: From F-Rank to Legend — v21.5.0

Import `Eldoria_From_F-Rank_to_Legend_v21.5.0.json`. It is built from `source/Eldoria_From_F-Rank_to_Legend_v21.3.json` by `tools/patch.py` (interface) and `tools/build.py` (card). Lore, rules and variables are as before. The only prompt change is one line in the Response Format entry (about 35 tokens a turn, see below).

**Players only see this after the update is published and passes Yumina's review.** Until then an import plays as the creator's working copy. Settings → Display shows "Interface v21.5.0" when the new interface is the one running.

## v21.5.0 — the Ledger: Black Clover's card-and-tile layout, built in Eldoria's own look

Same kind of layout and mechanics as Black Clover (a hub of tiles, framed cards, a central emblem in the nav, bottom sheets, quick actions under the story). Nothing was copied across and relabelled: every screen was written for Eldoria's data, in its steel, rune-light and ember colours, Cinzel and Cormorant type, cut corners, and per-screen colour themes. The icons are new line drawings made for this card.

**The frame (every screen)**
- **Top bar:** the Eldoria emblem (opens the Ledger), the screen's name and a line about it, Sync, Advance time, and your level and rank (opens the Guild record). On the story screen the title is where you are, and a book button turns on reading mode.
- **Nav:** Ledger, Hero, Skills, Quests | the Chronicle emblem in the middle | Map, Magic, Gear, More. A badge on Hero shows unspent advancement points.
- The old screen banners and the "Speak / Act" label are gone; that room goes to the content.

**The Chronicle (story screen)**
- A status strip: Health, Mana and Stamina with a word for how you are (Bruised, Good, Low…), plus the time of day. Tap Health or Stamina for the Hero screen, Mana for Magic.
- The open quest runs under it as a one-line ticker (tap for Quests). In combat a red bar lists the foes.
- **How a reply is drawn:**
  - The narrator's pinned header becomes a slim scene line (time · place · weather).
  - A dice line in parentheses becomes a roll token, so rolls stand apart from the prose.
  - A speaker's lines become a speaker card with their initials.
  - Your own messages are set right, in italics.
- **Tools on the story card:** copy the latest passage, regenerate it, or save it to your Journal.
- **Quick actions under the story:**
  - **+** opens a sheet of actions (look around, rest, camp, use an item, cast a spell, travel, train, check gear).
  - **Suggest** and **Random** put an idea in the message box. Nothing is sent until you press send.
  - Four actions for where you are: a tavern offers "Order a meal" and "Listen for rumors"; a dungeon offers "Search the room" and "Check for traps"; and so on. In combat these become Attack, Defend, Cast, Use item, Fall back.
  - "Use item" and "Cast" open a list of your consumables or spells.
- **Reading mode** hides the strip and the actions (and on a phone the nav) so the story gets the screen. It is remembered.

**The Ledger (new hub)**
- Your hero card: portrait, name, title, level, rank, XP bar and the three meters.
- "Return to the Chronicle", with the start of the latest passage.
- Twelve tiles, each with a live line: Hero, Skills, Gear, Magic, Quests, Map, Party, Callings, Guild, Wounds, Journal, All records.

**Rebuilt screens**
- **Hero:**
  - Portrait (tap + to add your own picture; it is kept on this device), vitals with a word for each, and a grid of facts (species, origin, homeland, calling…).
  - **Attributes** as tiles. The advancement-point rules and the message to the narrator are unchanged: stage with + and −, then Confirm.
  - Callings as tiles, and your appearance and background.
- **Skills:** totals at the top, family chips (Weapons, Covert, Wilds…) to filter, and a tile per skill with its level seal and progress. Techniques get their own panel.
- **Gear:**
  - The purse as gold, silver and copper coins, banked funds, and a load meter.
  - An equipment slot grid (head, cloak, body, hands, legs, feet, both hands, trinkets, pack).
  - The pack as item tiles with filter chips (Equipped, Weapons, Armour, Supplies, Materials).
  - Tap an item for its details, with Equip / Take off (the same equip rules as before, including two-handed weapons), plus **Use** and **Examine**, which send that action to the story.
- **Magic:**
  - A mana orb, Instinct and Control meters, and the backlash-risk band.
  - The spellbook as tiles with tabs by origin (trained, innate, universal).
  - Tap a spell for its details and **Cast it**.
- **Quests:** open, completed and failed counts; Open / Finished / All tabs; a tile per quest with a rank badge and reward; a link to the quest boards where you stand. Tap a quest for its giver, deadline, reward, description and objectives.
- **More:** every other record as grouped tiles (Adventuring, Wealth & craft, The world, You).
- **Every other screen was rebuilt the same way.** Their content and their messages to the narrator are unchanged; only the presentation is new. (`docs/v21.5-record-screens.png`)
  - **Quest Boards:** a tile for each board where you stand, posting tiles with rank badges and rewards, and the F–S rank ladder.
  - **Guild:** a large rank seal, the F–S ladder with your rank lit, your reputation and completed requests, and tiles to your quests, boards, party and factions.
  - **Party:** a member tile for each companion. Their sheet shows meters, role, trust, attribute chips, skill and spell tags, an equipment slot grid and wounds. Found a party, Recruit, Assign role, Part ways and the Guild team registry are kept.
  - **Training, Callings:** tiles with progress bars, tutors and playstyle tags.
  - **Wounds & Conditions:** health and stamina meters, with injury and condition tiles marked in red.
  - **Banking:** carried and banked totals, the purse as coins, and account and instrument tiles.
  - **Markets, Merchants:** price and merchant tiles.
  - **Crafting:** tabs as chips with counts. Material, alloy, recipe, project, facility, artisan and research tiles show traits as tags.
  - **World Events, News & Rumors, Politics, Faiths, History:**
    - Event, report, rumor, war, treaty, faith and history tiles, with counts on News.
    - Each realm's relations show as tags, coloured red when hostile and green when friendly.
    - Faith records no longer print raw data.
  - **Factions:** a tile per faction with a standing bar that runs from hostile to trusted.
  - **Codex:** counts, title tags, and bestiary and lore tiles.
  - **Journal:** the note box at the top (Enter adds a note), newest notes first, and passages saved from the Chronicle shown in full.
  - **Settings:** the Display choice, and the sound layers as switches.
  - **Map:** your position as a coordinate seal beside the place name, and the places you know as tiles.
- The history record under More is now called **History**, so it isn't confused with the Chronicle story screen.

**Layouts**
- **Phone landscape:**
  - The nav is a rail on the left.
  - The story sits beside a column with the status strip, quest ticker and quick actions.
  - Tiles flow into more columns.
- **Desktop:**
  - The sidebar has the Chronicle at the top, the main screens, and every other record grouped below, one click away.
  - The story and screens are in the middle.
  - The status panel on the right now uses the same meters.

**The one prompt change (about 35 tokens a turn).** The Response Format entry gains: "When a named character speaks, put @ and their name alone on the line before their words (e.g. @Marta Vell), then a blank line after." That is what lets the Chronicle draw speaker cards. If the narrator forgets, the speech is shown as ordinary prose; nothing breaks.

**Tested** in the test page at 390×844, 844×390 and 1440×900 (`docs/v21.5-*.png`):
- All 27 screens open in each layout, filled with test data, with no console errors or warnings and nothing wider than the screen (`tools/harness/allscreens.mjs`).
- The sheets, reading mode and the item, spell and quest details were all exercised.
- The rebuilt files compile with Yumina's Sucrase transforms.
- The repository's tools rebuild the shipped JSON byte for byte.

**Not tested:** Yumina's real message list draws its own controls around each reply (the test page only imitates them), and real phones.

## v21.4.2 — a compact message box

v21.4 fixed the page being cut off, but on a real phone the message box then took a third of the screen. Its control row (+, model picker, "High", voice, mic) wrapped into three spread-out rows under a two-line text area.

- **Why it wrapped:** v21.4 told the toolbar to wrap. Yumina's own toolbar already handles narrow screens: below 400 px it shortens the model pill and keeps one row (`sandbox/chat/message-input.tsx`). The wrap rule is gone. The left group may now shrink, so the model pill shortens instead of pushing "High", voice and the mic onto new lines.
- **Smaller text area:** 16 px type (iPhones zoom in on anything smaller when you tap it), less padding, starting at one line. It still grows as you type, using Yumina's own padding variables.
- **Result on the test page:** at 390 × 844 the message box went from about 200 px to about 90 px tall, and the story area from 393 px to 442 px. Landscape and desktop also stay on one row.
- **Settings → Display** now reads "Interface v21.4.2".
- **Test stand-in:** now copies the real composer's structure (`play-composer-send-row`, the model pill's shrinking name, the extension slot), so this kind of wrapping shows up in tests.

`docs/message-box-before-after.png` shows it. On a real phone the model pill shortens itself, as Yumina does below 400 px, so it won't look exactly like the stand-in.

## v21.4.1 — a visible version, to check which interface is running

A tester's screenshots after v21.4 still showed the old interface in both orientations: the "Chronicle" banner on the story screen, no landscape side rail, and the page cut off on the right. In Yumina's code (`viewerSeesWorkingCopy`, `detectMaterialChange`), an import into a **published** card goes into a working copy that only its creator plays. Interface files count as a "material" change, so players only get them after the update is published and passes review.

- **Settings → Display** now shows **"Interface v21.4.1 · layout now: …"**, and the app carries `data-ui="21.4.1"`. If that line is missing, the old interface is still the one being served.
- Otherwise identical to v21.4.

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
