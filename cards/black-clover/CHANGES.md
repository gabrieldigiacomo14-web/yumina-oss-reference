# Black Clover: A Mage's Tale — v21.17

Import `Black_Clover_A_Mages_Tale_v21.17.json`. It is built from `source/Black_Clover_A_Mages_Tale_Narrative_Spell_Bridge.json` (v21.4 + the narrative spell bridge), so every mechanic from that file is kept.

## v21.17 — the official world layout, and real grimoire cover crafting

### World map (`tools/ui/bc-cartography.js`)
Reshaped to the official guidebook layout (see `docs/world-map-v21.17.png`):
- **Spade** is the largest kingdom, across the north (all ice and mountains, as before).
- **The neutral territory** (the Strong Magic Region, Grand Magic Zones) is now an **arch wrapped around Spade's south, west and east sides**. It was a straight strip between Clover and Spade only. It separates Spade from all three other kingdoms. A check confirms no Spade land touches another kingdom directly.
- **Heart** (west) and **Diamond** (east) **border Clover directly**; Clover sits south-centre with its southern coast, Raquey's bay and the concentric realms.
- **The Witches' Forest** moved into the neutral territory north-east of Clover, toward Diamond (74, 116). It now belongs to no kingdom (the territory fill used to claim it for Clover). Its trees show through the band's mana haze.
- **Rayaka** moved from (14, 46) to (20, 50), so it is in the Forsaken Realm as on the official Clover map.
- **Small fixes:**
  - One Grand Magic Zone moved into the western band; it had been on Spade's edge.
  - The haze no longer spills over the sea.
  - Heart has a few small western isles.
- **Ownership check** (`tools/check/map-owners.mjs`):
  - Every canon Clover place is in Clover and in the right realm.
  - The kingdom capitals are on land in their own kingdoms.
  - The neutral points are unowned.
  - Land share: Spade 333, Heart 174, neutral 163, Clover 153, Diamond 134 cells.
- **The narrator's geography** (gazetteer and world-map entries) now describes the same layout:
  - The new coordinates for Rayaka, the Witches' Forest and the three kingdoms.
  - A line on the neutral arch.
  - The Common/Forsaken boundary fixed to 48 km; the text said 38 while the map drew 48.
  - These entries load only when geography comes up, so the per-turn cost is unchanged (18,763 / 22,761).
- **Older saves:** a save that already stored the Witches' Forest or Rayaka at the old spot in `known_locations` keeps that stored point for those entries.

### Grimoire cover crafting (`tools/parts/p16_cover.tsx`)
**Why options seemed to do nothing:** every cover on a screen shared the same internal SVG ids. The Forge's live preview was drawn with the colours and textures of the page's saved cover behind it, so most choices didn't show until saved. Each cover now gets its own ids. The options are also all new or redone, and each one visibly changes the drawing (see `docs/grimoire-covers-v21.17.png`):
- **Cover color:** 14 swatches.
- **Trim:** 7 swatches (gold, silver, bronze, copper, rose gold, dark iron, bone).
- **Material**, each with its own texture:
  - **Leather:** grain, stitched border, spine bands.
  - **Velvet:** soft sheen and nap.
  - **Metal:** brushed, bevel, rivets.
  - **Stone:** speckle, cracks, heavy edge.
  - **Scaled hide:** scales.
  - **Wood:** grain.
- **Condition:**
  - **Pristine:** gloss.
  - **Worn:** rubbed corners, scuffs, faded colour.
  - **Ancient:** cracks, stains, torn corner, strongly faded.
  - **Battle-scarred:** slashes and a scorch mark.
- **Decoration:**
  - **Classic:** frame and corner caps.
  - **Minimal:** thin frame only.
  - **Ornate:** filigree and scrolls.
  - **Royal:** double frame, crown, jewels.
  - **Runic:** rune ring.
  - **Arcane:** magic circle.
  - "Royal" used to be identical to "Ornate".
- **New: Insignia setting:** plain, medallion, gem-set.
- **New: Clasp:** none, strap, lock, chains.
- **New: Page edges:** cream, gilded, black, red.
- **Magic aura:**
  - **Subtle:** glow only.
  - **Normal:** glow and drifting motes.
  - **Strong:** brighter glow, more motes and rays.
  - The colour still comes from your magic attribute.
- **Preview:** the live preview stays at the top while you scroll the options.
- **AI cover prompt:** includes all of these choices.
- **Old saved designs** still load (old wear words map to Worn or Ancient).

## v21.16.1 — upload your own grimoire cover

- **Grimoire page → Customize / Upload cover → Grimoire Forge** now has **Upload your own cover**, next to *Generate AI cover* and *Use crafted cover instead*. The upload already existed, but only under More → Art; it wasn't where you customize the grimoire.
- It is the same upload as the other portraits (resized to fit 900×1200, then saved the same way). The new cover shows on the Grimoire page and the Realm summary. "Use crafted cover instead" switches back to the generated design.
- Tested on the local test page: upload, success toast, "Use crafted cover instead" appears, and the cover image shows on the Grimoire page. The test page keeps the image inline; real Yumina stores it through the same media route the Art page uses, which I couldn't try from here.

## v21.16 — scene pictures (optional)

Each narration can open with a picture of the scene, framed with the place, time and weather.

- **Setting:** Settings → *Scene pictures*: **Off** (default, since pictures cost credits), **Key moments**, or **Every reply**. A note under it says what will happen and the price, taken from Yumina.
- **Key moments:** a picture on the first reply, on arriving somewhere new, when a fight starts or ends, and every 10 replies. A new time of day counts too, after 5 replies. At least 3 replies apart, except for fights.
- **Steering note:** the card builds it from the story's own state: place, hour, weather, who is present, what the character wears, and "mid-fight" or "hurt" when true. It is capped at the 198 characters Yumina accepts.
- **Frame:** the picture sits above the narration with a caption bar (place · time · date · weather) drawn by the card, from the state at that reply. Tap it to see it large. The latest one has a *Redraw* button.
- **Camera button** in the story card's toolbar: draw the latest scene now, whatever the setting says.
- **Uses Yumina's own switch if it's on:** if Settings → Display → Story illustrations is set to "illustrate every reply", the card doesn't ask again (that would charge twice). It only frames what Yumina draws. Pictures Yumina drew were previously hidden in this card; they now show.
- **If the account can't draw pictures** (Yumina decides this), the setting says so and nothing is requested.
- **Not possible:** putting the card's interface text inside the image (image models can't be given it), so the interface text lives in the frame. No video: dropped.
- **New variable:** `scene_pics` (hidden from the narrator), so no extra prompt tokens (still 18,763 early, 22,761 late).

Tested on the local test page (`tools/scenepics.mjs`, `tools/scenepics-key.mjs`) with Yumina's image calls simulated:
- Off: nothing is requested.
- Every reply: a request per reply, with the steering note.
- Key moments: drawn on replies 1, 5 (new place), 6 and 8 (fight start and end), not on 2–4 or 7.
- Yumina's own switch on: the card sends no requests.
- The framed picture, the "Drawing the scene…" placeholder, and the settings screen.

Not tested: real picture generation and its real prices (the test page can't reach Yumina's image service), and whether the `/cdn/key/…` addresses load inside the sandbox the same way as in these tests. The card's portrait pictures already use that form.

## v21.15 — the world moves on its own

A tester asked for characters who have their own business instead of focusing on the player. Alone in a scene (showering, training, sleeping), the narrator either skipped time or repeated what the player had just written.

**1. "Life continues" rule** (`core/core-living-world.txt`):
- Never retell the player's message; write what it causes and what the world adds.
- Others keep their own business: they work, talk among themselves, come and go.
- When the character is alone with nothing to decide, the narrator writes one fresh short beat, lets others' sounds or news reach them, and moves time on.

**2. World threads** (`parts/p14_threads.tsx`), built on tabletop "fronts" and faction clocks rather than an event list:
- **A few situations, not an event list:** the background is 4–6 ongoing situations with a 0–6 clock each. Example: "Wolves taking sheep on the Hage hillside, 2/6, next: a shepherd is attacked".
- **The narrator manages them through a queue:** it opens, records, pushes or ends threads with `thread_events` (same pattern as the squad roster). When fewer than 4 are active, it is asked to open one that fits the setting. Canon developments can be threads.
- **Clocks tick with in-world days:** about a 1 in 3 chance per thread per day, a little faster near the end. The dice are seeded by thread and day, so a regenerated reply sees the same world. No AI call is spent on it.
- **The narrator is told once when a thread moves offscreen.** It writes what happened (a "beat") and reveals it only through what the character could perceive. At 6/6 the thread comes to a head and the narrator resolves it.
- **News spreads with the clock:** from the people involved to the town (2+), the kingdom (4+) and everywhere (6). Taverns hear things one step sooner.
- **Overheard chatter:**
  - **Where and how often:** in public scenes (street, shop, tavern, church, workplace, squad HQ, ceremony), at most once every 3 replies.
  - **What gets picked:** the most relevant thread that has reached that place, favouring your squad, your home town and threads with news you haven't heard yet.
  - **How the narrator gets it:** one line of background talk, told the way locals would tell it.
  - **What the player sees:** once a reply has carried it, it is filed in the Journal.
- **Journal → Assignments** has a new **Word going around** section: rumors and news, with where you heard them ("Rumor · Overheard at Rusty Tankard"). The true state of each thread stays hidden.
- **The random "world churn" roll** (1 turn in 8) now prefers showing a sign of an existing thread instead of inventing something new.
- **Regenerate rewinds everything:** it is all in variables written after replies.

New variables: `world_threads` (hidden), `world_pulse` (read), `thread_events` (write).

**Cost:** +262 tokens per turn for the rules (18,763 early, 22,761 late), plus the pulse once threads exist. The pulse is about 40–60 tokens of thread list, plus a line when something moved or can be overheard.

**Fixed during testing:** the tick dice used a hash without a final mixing step. In a 200-day test, one thread never ticked at all and another ticked twice as often as normal. Fixed with a standard finalizer; all threads now tick about a third of days.

Tested on the local test page (`tools/threads.mjs`), with the narrator's part (filing threads and beats) simulated:
- Threads opened from the queue.
- The overheard line was offered in a tavern, then delivered and filed in the Journal.
- Ten days ticked the clocks and the narrator was asked for beats.
- A beat and a "hinder" applied correctly.

Not tested: how naturally a real model weaves it in.

## v21.14 — strong foes are strong

A tester beat Yami Sukehiro with a brand-new Magic Knight. Why it happened: foe strength came from a label the narrator wrote (or a guess from words in the notes). "Captain" in the notes only gave `elite` (175 HP), and even the top tier (290 HP) was beatable by dodging. The player's own level never mattered.

- **Canon power table** (`tools/ui/bc-canon-power.js`): captains, the Wizard King, Mereoleona, devils, Licht and Patri, squad seniors and the main cast. A named canon character is never weaker than the table, whatever the narrator rated them. Unknown NPCs still use the narrator's rating and the old word guesses. Two new tiers sit above captain: `legend` and `apex`.
- **Power gap:** the arena compares the foe's tier with the player's (from `magic_profile.output`) and scales the fight: foe health, your damage against them, their damage, speed and attack rate. Your own tier also adds a little damage, so training and rank matter.
- **Overwhelming foes (3+ tiers above you):**
  - The fight screen warns "far beyond you" and offers *Fight anyway*, *Run*, or *Let the story decide instead*.
  - The foe can't go below 1 HP in the arena.
  - They get serious at 20 s and again at 42 s.
  - Surviving 45 s ends it as a new outcome, `endured` ("You held out"). The narrator is told the character did not win and the foe decides what happens next.
- **Better fights at every level:**
  - Strong foes and above add a ring sweep.
  - Elite foes and above chain slams (1 extra at elite, 2 at captain and above).
  - Captain-class foes break shields faster and throw a second blast where you are running; casters do this every third cast.
  - A foe at elite or above gets enraged below half health (the unbeatable ones use the time phases instead).
  - A single hit is capped at 45 damage.
  - Signature attack names appear for captains.
- **Prompt:** the `combat` variable now accepts `legend|apex` and asks the narrator to rate famous fighters by canon rank (+44 tokens: 18,545 early, 22,542 late).

Test run with a simple bot (`tools/fight-yami.mjs`), not human play:
- A rookie (output 40) against "Yami" labelled `average`: the warning appeared and the fight was lost in about 20 s, with Yami left alive.
- A captain-tier player against Yami: a real, even fight (223 of 290 damage dealt before losing).
- A rookie against a bandit: won.
- The `endured` path was checked with a 5-second endure time; the narrator message was correct.

The numbers are first guesses. They sit in the `GAP`, `ENDURE_SECONDS`, `MAX_HIT` and `PLAYER_DMG` constants at the top of `bc-battle.tsx` and can be tuned from play-testing.

## v21.13 — the inventory follows the story

Fixes for four bugs a tester reported.

**1. "Taking off my shirt" in the story left it worn in the Satchel.** The narrator is told to move items itself, but it often only narrates the move. `parts/p13_invsync.tsx` now syncs the inventory from the story after each reply:
- **When it checks:** only when the player's message or the reply has a moving verb (take off, put on, set down, pick up, draw, stow, float…) within about 70 characters of one of the character's own things. Most turns make no call.
- **The check:** a short classifier call (`ai.complete`, no history or lore, at most 140 tokens out) that reads only that turn and the numbered list of belongings.
- **Applying the moves:** wear, remove, hold, stow, leave (with the spot, e.g. "on the desk") and float (grimoire). They use the same rules as the Satchel buttons: a taken-off shirt goes into a free compartment, or your hands if no compartment is free.
- **After the move:** a short note under the story says what changed. `inv_sync` (hidden) remembers which reply was checked, so it never runs twice.

**2. The grimoire went "backwards"** (floating when set on the desk, then on the desk after being picked up). This was the same missing sync. Setting it down records the spot ("Left on the desk · Mira's Bakery"). Picking it up and letting it float puts it back in the grimoire slot, and the Grimoire row now reads "Grimoire · floats at your side". Older saves that stored "on the desk" as the location can still be picked up.

**3. The "You undo the fastenings and take off…" note never went away.** Gear notes now belong to the moment they happened. They disappear with the next message, after 12 seconds, or when tapped.

**4. Regenerate didn't rewind stamina/inventory.**
- **What Yumina rewinds:** regenerate restores the state from before the reply. That includes every interface change made after it, such as spell costs and the new story sync.
- **Travel and training (fixed):** their pending choices were kept in browser storage and deleted once used. A regenerated travel or training reply then fell back to the defaults (on foot, moderate), so stamina dropped again by a different amount. They now live in a hidden variable, `bc_pending`, which rewinds with the turn.
- **What stays (by design):** a change you made yourself with a button before sending, such as Rest, a Satchel button or a finished arena fight. Regenerate only re-rolls the narrator's reply to that action, not the action itself.

Per-turn prompt cost is unchanged (early 18,501, late 22,498 tokens). The two new variables are hidden from the narrator.

## v21.12 — squad roster

A player asked to see their squadmates: who they are, where they are right now, how they're doing, and who joined recently. Modelled on the party system of *Surviving the Game as a Barbarian*, adapted so squadmates have their own duties instead of travelling with the character.

**How it works (`parts/p12_squad.tsx`):**
- **The AI files events.** When the story meets or changes a squadmate, the AI files a short entry in `squad_events`:
  - `join`: a new member, or one already in the squad when the character arrived (`joined: "before"`)
  - `update`: location, condition, mission or notes
  - `seen`, `leave` and `death`
- **The interface keeps the roster.** It applies the events to `squad_roster`, which the AI never sees. It records each squadmate's role, rank, magic, condition and health, last known place (and how long ago), mission, join date and a short history. Then it clears the queue.
- **The AI gets one line.** `squad_summary` (read-only) gives who is with you, where the others were last known to be, and who joined recently.
- **Not always with you:**
  - **In your party:** a squadmate is "with you" while they're in your `party` (their condition is copied from it), or while a `with: true` event says so and you haven't moved on.
  - **Leaving without them:** they stay where you left them.
  - **When they leave your party:** the roster remembers where you parted.

**On the Renown & Rank page:** a **Squadmates** panel with filters (All · With you · Elsewhere · Joined recently).
- **The cards:** each squadmate shows a condition badge and health bar, and where they are ("With you", "On a mission: …", "Black Bulls Hideout · as of yesterday", "Whereabouts unknown"). New members (joined within 30 in-world days) get a NEW badge.
- **Tap a card** for the join date, notes, recent history, and **Go find them** / **Ask after them** / **Talk**.
- **Empty squad:** **Fill in my squad's roster** asks the AI once (`[UI:SQUAD]`) to list the members the character knows, as the era allows.

**Also fixed:** a location line like "Black Bulls Hideout — Clover Kingdom (Common Realm)" made the corner banner read "Common Realm Kingdom". The kingdom and realm are now read from the right parts.

**Cost:** about 190 tokens per turn (the squad rules and the one-line summary).

## v21.11.4 — realm circles

The two circles around the Royal Capital are now the **Common Realm** (radius 48 km) and the **Forsaken Realm** (radius 105 km, out to the kingdom's edges), with the **Noble Realm** as the small tinted heart of the capital (10 km) inside them. Before they were Noble (11 km) and Common (40 km), with Forsaken only a label. Each place's realm is worked out from these (Kikka, Nean, Hecairo, Nairn and Raquey are Common; Hage, Rayaka and Saussy are Forsaken). Kiten is also Common, as the lore says, even though it lies 61 km out.

## v21.11.3 — Spade is ice and mountains, behind the Strong Magic Region

**Spade:** all land north of the barrier is now snowfield and mountains, with no grass or forest. Elevation in Spade is raised so it reads as a wall of peaks.

**The Strong Magic Region:** a wide band of Grand Magic Zones in the neutral land between Clover and Spade, drawn as dark violet mana mist and labelled in three places. Nobody owns it: no kingdom tint, and borders at both edges. Tapping inside it says "Strong Magic Region — neutral land of violent mana." The canon is that crossing it takes very strong mana, and Spade's armies cross it in a mobile fortress fed by the mana of captured citizens (source: the Black Clover wiki, Grand Magic Zone page, and episode summaries). The kingdom-Spade lore entry now says so too. I couldn't confirm ice and mountains from a source, so that follows the lore's own "winter and fog" and the player's description.

**Elevation fix:** the extra land I added south of the capital made all of central Clover rise into hills. The curve is flatter now, so the capital is grassland again.

**Items set down somewhere:** an item saved as "In storage · on the desk" now reads "Left on the desk (stored)", and the grimoire row says "Left on the desk (stored) — not with you". The possessions rule now says a desk, table or floor is area `ground` with its exact spot, and `storage` is a locker or chest.

## v21.11.2 — the capital is in the middle of Clover; the grimoire row tells the truth

**Royal Capital position:** it sat close to the south coast. The sea now begins about 70 km south of the capital, and Clover spreads about 70 km south, 130 north and 120 west of it. The coordinates did not change (the capital is still 0,0 and every canon place keeps its gazetteer position), so saved games stay valid. The sea comes in only at two bays: Raquey's (with the Seabed Temple offshore and a Grand Magic Zone) and the coast east of Kiten at the First Dungeon. The "Southern Sea" label moved south, and the map frame grew to 620 × 455 km.

**Grimoire on the equipment list:** it said "Floats at your side" even when the character had put the grimoire on a desk. The row now follows the grimoire's inventory record:
- in a holster: "in Sword & Grimoire Belt Holster"
- in hand: "In your hands"
- set down or left: "Left on the ground · the desk in Room 5 — not with you"
- no record: "Floats at your side"

The AI rule now says: when the character sets the grimoire down or leaves it, record its exact spot as a world placement. It floats at the owner's side unless a record says otherwise, and it stops responding when far from its owner.

## v21.11.1 — canon lore areas are always on the map

The map now builds the canon places and areas from the card's own lore, even for a new character with nothing recorded yet. `bc-cartography.js` lists them (`CANON_PLACES`, `CANON_AREAS`) with the gazetteer's coordinates.

- **Places:** Royal Capital (Clover Castle, Castle Town, Magic Knights HQ), Kikka, Nean, Hecairo, Nairn, Hage with its grimoire tower, Rayaka, Saussy (Sosshi), Raquey, Kiten, the First Dungeon and the Seabed Temple off Raquey. Each is a small gold marker with its lore line. Tap one for the card and "Plan travel here".
- **Areas that reshape the land:**
  - **Witches' Forest:** neutral forest between Clover and Diamond.
  - **Diamond:** mines and wasteland.
  - **Spade:** a winter wall in the far north.
- **Grand Magic Zones:** drawn as dashed violet rings, one near Raquey and one on the neutral border. The second position is derived from the lore (it says only "in the neutral lands").
- **Not invented:** the lore names the Ultime-Volcano region and the other kingdoms' settlements without positions, so they aren't drawn. The map follows the lore's own rule against inventing canon.
- **Yours stay on top:** a place the story has recorded (for example Hage with its own pin) replaces the canon marker. The new **Canon landmarks and lore areas** layer toggle turns all of this off.
- **Travel:** "Plan travel here" works from a canon landmark even if you haven't learned it yet, and measures from where you are.

## v21.11 — a bigger map, built the way the Universal World Engine builds one

**What a player reported:** a Clover village (Hage) drew inside the Heart Kingdom, and the green "you" dot said they were in Hage when they were at the Black Bulls headquarters.

**Why:** the old map painted the kingdoms from fixed circles, so wherever the AI happened to record a place decided which kingdom it landed in. The "you" dot used only a simple text match on the location line, and fell back to a saved coordinate (the starting village) when nothing matched.

**New map generator (`bc-cartography.js`)**, modelled on the Universal World Engine map (`src/cartography`):
- **Land cells:** the world is about 1,300 irregular land and sea cells (Voronoi) with elevation, moisture and temperature. Those give 12 biomes: grassland, forest, spruce forest, hills, mountains, snow, tundra, fen, steppe, wasteland, coast and sea.
- **Detail at any zoom:** the terrain is redrawn for the current view with finer noise as you zoom in, and the edges between biomes are blended.
- **Rivers and roads:** nine rivers run downhill to the sea. Roads between the places you know follow the easiest ground (a minimum spanning tree of the known places, found by path-finding).
- **Kingdoms:** each kingdom is flooded outward from its capital, with rivers and mountains slowing it. Canon constraints: every canon place is dry land inside its kingdom, and the Noble, Common and Forsaken Realm bands stay centred on the Royal Capital.
- **Kingdom shapes:** places the story pins to a kingdom (a known place with `"kingdom":"Clover"` and coordinates) become seeds for that kingdom's land, so a Clover village is always drawn inside Clover.
- **Canon wins:** a canon place saved far from its canon position is drawn where canon puts it.
- **Fog:** only places you have seen are drawn clearly. Cells around the places you know, your trail and the Royal Capital's heartland are clear; the rest is shaded.
- **Same settings shape as UWE:** `width`, `height`, `kmPerUnit`, `cells`, `seaLevel`, biomes. When UWE's map gets updates, re-port them into this one file.

**The map's size:** the world frame grew from 500 × 350 km to 620 × 420 km, with room for the full Spade Kingdom. The map box is about 400–680px tall (it was 300px), and zooms from the whole world out to about 100 m a pixel. The default Realms toggle became a **Layers** menu (realms and borders, unexplored shading, mountains and trees, roads).

**Where you are:**
- The "you" dot now follows the place named in your current location. It matches any part of the line ("Room 5, Black Bulls Headquarters" finds "Black Bulls Headquarters"), and ignores generic words like room and village.
- When no place matches, it uses the kingdom and realm in the line, drawn as an approximate spot with a dashed halo and a note.
- **I'm here:** tap the map, then choose "I'm here (place name)". The card saves that place's coordinates, marks it visited and updates `player_x` / `player_y`, which fixes the position permanently.
- The travel planner measures distance from the same resolved spot.
- The AI's `player_x` / `player_y` rules now say to set them whenever the character relocates in the story.

## v21.10.1 — kingdom banner text

The date and time in the corner banner ran down into the point where the banner narrows, and the time was hard to read. The right banner is now taller (112px instead of 90px) with the clover at the top, and the kingdom name, date and time sit in the straight part, clear of the point. The date and time text is slightly larger and brighter.

## v21.10 — the AI labels things, the engine stays in charge

The engine used word lists to decide what an item or spell is. That missed things like "katana", and it misread "Charmy's" as a charm. Now the AI supplies labels, the engine checks them against fixed lists, and everything else stays in the engine. The AI never keeps state in this design: it answers a closed question once, the answer is saved, and the engine applies it.

**1. Labels in the narrator's reply (no extra call).** When the narrator creates an item, it adds:
- `"kind"`: weapon, garment, armor, container, tool, food, drink, medicine, material, valuable, document, magic-tool or other
- `"wear"`, if the item is worn or held ready: a body slot such as cloak, clothes, hip or main-hand
- for bags, pouches and holsters, also `"holds"` (general, small, blade, grimoire, bottle, arrows) and `"size"` (small, medium, large)

New spells get `"arena"`: lance, wave, bolt, burst, bind, wall, barrier, dome, seal, seal-foe, heal or blink.

The engine reads these before its word lists. A labelled container gets matching compartments; for example, a harness that holds a blade gets a blade loop. The rule text for this replaced the slot sentence added in v21.9, so the narrator's prompt barely grew.

**2. A rare backup classifier (`parts/p11_labels.tsx`).** It runs only when an item or spell has no label and the word lists can't place it either. Ordinary items like bread, boots and swords never trigger it.
- **When it runs:** after a reply has finished, as one batched call for at most 8 items and 6 spells.
- **What it sends:** a short system prompt with no story history and no lore, a JSON-only answer, temperature 0, and an output cap of 80 + 45 tokens per name.
- **Checking:** every answer is checked against the fixed lists. Anything else is dropped; an invented slot like "flying-carpet" is ignored while a valid kind is kept.
- **Saving:** answers are saved in `ai_labels`, which the narrator never sees. Each name is asked about once, even if the answer was unusable.
- **Failures:** if the call fails or isn't available (no mushies, preview), nothing is saved and it waits 5 minutes. There's also a 45-second gap between calls.
- **Why a raw call:** Yumina's built-in card-AI type also sends up to about 1,000 tokens of the card's always-on rules with every call, so the raw call is much cheaper. The card's own code does the checking.

**3. Leaner prompt.** Yumina heads each variable's rules with `[id | display name]` when the two differ. Variables the AI can see now use their ID as their name, which saves about 300 tokens every turn. Hidden interface variables keep friendly names.

**Cost per turn:** about 18,250 early and 22,250 late, down from 18,430 and 22,430 in v21.9, even with the label rules added. The always-on rules contain no per-turn values, so the provider's prompt cache (which Yumina's billing passes on) keeps working.

**Other:** common foods (loaf, bun, cheese, jerky, stew…) are now recognised without asking.

## v21.9 — squad robes, holsters, and nothing stuck "in your arms"

Reported by a player:
- the "Clothes" slot was confusing next to the shirt and trousers slots
- there was nowhere to wear a squad robe
- a robe put on in the story still showed "In your arms"
- most belongings showed "In your arms" even with room in the travel bag
- the grimoire sat in the Accessory slot instead of its holster

**Slots** (`bc-inventory.js`), listed head to toe:
- **Cloak / Squad robe** is new, an outer layer over your clothes. Squad robes, cloaks, capes and mantles go here. A worn squad robe shows as visible squad garments in the appearance the AI reads, so NPCs can react to it.
- **Hip / Holster** is new.
- **Grimoire** is new.
- "Clothes" is now **Full outfit (one piece)**, for a dress, a uniform or "everyday clothes" worn instead of a separate shirt and trousers. A note under the slot list explains this.
- Old saves are repaired automatically: a squad robe stored as "Clothes" or "Shoulders" moves to the cloak slot, and a grimoire stored as "Accessory" moves to the grimoire slot or holster.

**Holsters:** holsters, scabbards, sheaths, baldrics and grimoire holders are now containers with a **blade loop** and a **grimoire holder**. They're worn on the hip, so a "Sword & Grimoire Belt Holster" carries the sword and the grimoire.

**Nothing left in your arms by accident:**
- **Stowing:** an item added without a real place now goes into the best free bag, pouch or holster compartment. The grimoire goes to its holster first.
- **Bags carried loose:** a bag, pouch or holster that was "in your arms" is put on if its slot is free.
- **Held on purpose:** an item stays in hand only if it was put there on purpose ("Hold in your hands"). Otherwise the label reads "Carried loose (no room in your bags)", which only happens when the bags really are full.

**Recognising items:**
- **Weapons:** katana, wakizashi, scimitar, cutlass, claymore, halberd, glaive, warhammer and flail now count as weapons. Blade-care kits and oils don't.
- **Tools:** kits, flint, whetstones and similar tools are now small tools, so they fit pouches and outer pockets.
- **Light clothing:** vests and aprons now count as light torso wear, not 5-bulk armour.
- **Whole words only:** "Charmy's" is no longer read as a charm, and "chat" no longer as a hat.

**Satchel screen:** the equipment list shows only filled slots plus the key ones (cloak, shirt, trousers, feet, hip, back, grimoire), instead of 20 rows of dashes. The grimoire row says where it rides ("in Sword & Grimoire Belt Holster", or "Floats at your side"). Item icons now cover katanas, grimoires, holsters and kits.

**AI rules:**
- Body slots now include cloak, a one-piece outfit, shirt, trousers, hip and grimoire.
- Putting something on, taking it off, drawing it or sheathing it in the story must update that item's placement in the same reply.
- Unplaced items are stowed by the interface.
- The grimoire's inventory record is only where it physically rides.
- This adds about 225 tokens per turn.

## v21.8.1 — world map land lines up with places

Reported in a screen recording: when panning or zooming the expanded map, the painted land slid away from the labels, pins and realm rings. Places ended up over open sea, and at high zoom the land stretched into stripes.

The Yumina player loads Tailwind CSS. Its built-in reset gives every `<img>` `max-width: 100%`. The land picture is drawn far larger than the map box so it can be panned and zoomed, but the reset capped it at the box's width while the pins kept scaling. The map's land image now opts out (`max-width: none`), so land, labels and pins share one scale at every zoom. The test page now applies the same reset, so this kind of mismatch shows up before release.

## v21.8 — spells that act like themselves

Reported: a Granite Lance did nothing, and a shield-like sealing spell attacked instead. The arena guessed each spell's type by scanning its whole description, with shield words checked first. "Pierces armor" or "breaks through a wall" turned the lance into a barrier. A seal with no shield words fell through to the default, a plain attack bolt.

**How spells are read now** (`readSpell` in `bc-battle.tsx`):
1. **Name first.** The last word in the spell's own name that names a form decides: Granite **Lance**, Stone **Seal**, Rock **Shield**, Stone **Wall**, Gale **Edge**, Thorn **Snare**.
2. **Then the stored category, then the description.** The first sentence counts double. "Pierces armor", "breaks through walls" and the like count as attack words, not defence words.
3. **The look comes from the material.** It's read from the name, then the attribute, then the description: granite, stone, steel, ice, fire, water, lightning, wind, plant, light, dark, sand or blood. A granite lance is a grey stone spear trailing dust. Hits throw off particles of that material: stone chunks, embers, shards, droplets.
4. **The pre-fight screen lists your spells** and what each will do ("Granite Lance — Piercing lance", "Granite Seal — Sealing ward"), so you can see how a spell was read before you fight.

**What each kind of spell does:**

| Kind | In the arena |
|---|---|
| Lance | Fast, heavy, pierces one foe (two at full output), knocks back, smashes crates. Hard to dodge. |
| Cutting wave | A wide crescent that passes through everyone in its path. |
| Projectile | An orb that hits the first foe. |
| Blast | Lands where you aim after a short warning. Hits everyone inside and breaks crates. |
| Binding shot | Roots the foe it hits. |
| Shield | Material plates that turn to face the nearest foe. Blocks shots, blows and charges from the front (a charging foe is rebuffed) until its strength runs out. |
| Barrier / dome | The same protection all round when the spell describes a dome, sphere or surrounding barrier. |
| Wall | Raises stone (or ice, iron…) blocks in front of you that stop enemy shots and movement for about 6 seconds. Your own shots pass through. |
| Sealing ward | A rune circle around you for about 3.5 seconds. Enemy shots and blasts inside it are erased, and foes inside can't start an attack. |
| Seal on a foe | When the description says it seals an enemy, target or movement, it locks one foe in place. |
| Heal | Restores body. |
| Quick shift | Moves you a short distance and briefly protects you. |

Defensive spells have longer cooldowns: shields 4.5s, walls 5s, sealing wards 6s.

**Feel of the fight:**
- **Aiming:** drag from a spell button to aim it, with an aim line, a target circle for blasts or the wall's footprint. A plain tap still auto-aims.
- **Weight:** hits pause for a split second (longer for big ones) and knock foes back.
- **Stagger:** enough damage in a short time staggers a foe for about a second, and staggered foes take extra damage.
- **Smarter enemies:** average-or-stronger foes may sidestep a slow projectile you shoot straight at them, and lances are harder to dodge. Brawlers also lunge from mid-range, with a warning shown first.
- **Cover:** your shots no longer vanish on the first crate. Lances and blasts smash crates, and other shots still stop on cover.

## v21.7 — room to read the story

On a phone the story screen left the narration about one line. The castle header, status strip, Upcoming bar, story toolbar, four action cards, Yumina's message box, a Suggest/Random row and the bottom bar all shared the screen, so an NPC's dialogue card was cut off too.

The story area on a 430 × 758 screen (a large iPhone with Safari's bars) went from about **30px** to **365px**, or **468px** in Reading mode. On a 390 × 664 screen it's 271px and 374px. These were measured with a stand-in for Yumina's message box at its real height of about 120px.

- **Header:** a slim bar shows the back button, the place and the date, plus a **Reading mode** button.
- **Reading mode** hides the status strip, the Upcoming bar and the action row so the story gets the screen. Tap **Show all** to bring them back. It's remembered on your device.
- **Status strip:** each stat's name and word now share a line, so the strip is about half as tall.
- **Story card:** Copy, Edit, Regenerate and Save are small icon buttons in the card's title row instead of a separate toolbar.
- **One action row:** **+**, **Suggest**, **Random** and the scene actions (Rest, Eat, Train, Head outside…) are a single row of chips you can swipe sideways. In combat the row shows Cast, Move, Defend, Allies and Items. The **Fight it out** button is unchanged.
- **Short screens:** under 640px tall, the Upcoming bar hides and the header gets thinner.

**Wording now follows the creator's "Distinct UI" file** (`Black_Clover_A_Mages_Tale_v21.6_Distinct_UI.json`), replacing the v21.6.2 choices. The exact before/after text is in `tools/distinct_labels.json`, which `splice.py` applies.
- Home cards: Mage Profile, Spellcraft, Journey, Kingdom Atlas, Magic Knights, Assignments, Connections, Equipment, Treasury, Trade, Life & Settings.
- Satchel tabs: Equipment · Accounts · Trade.
- The Connections and Mystic Pacts lines, and the Spirit & Devil Links box in Magic.
- Story openings get display names ("Ceremony Day · At the Grimoire Tower"…) while the saved values stay the same, so old saves still work. "Suggested Start" and "Lore-Grounded" tags.
- The AI's top rule is titled "A Mage's Tale".
- That file was built on v21.6.0, so it still embedded the 41 images and lacked the v21.6.1–v21.6.4 fixes. This version has both: its wording, and hosted art with the back-button and tap fixes.

## v21.6.4 — taps on the bar and back button

Reported: inside a page, the bottom bar looked normal but didn't respond to taps; only the page content did. The page area was a separate stacking layer above the bar. It now has no layer of its own, the bar sits above it (sheets still cover the bar), the header sits above the page, and touch-scroll tweaks that could capture taps are removed. This could not be reproduced outside a phone, so it is a fix for the most likely cause.

## v21.6.3 — back button on every page

Every page now has a **back button** in the top-left corner (44px, easier to tap). Before, it only appeared on pages opened from a Home card, so a page opened from the bottom bar had nothing to tap if the bar wasn't reachable. From the bar, back goes to Realm.

## v21.6.2 — new section names

Names only; nothing under them changed. Where the old names are still in the file (variables like `chronicle`, the internal page ids) the interface doesn't show them.

| Before | Now |
|---|---|
| Home | **Realm** |
| Bonds | **Relations** (page: **Connections**) |
| Crown | **Renown** (page: **Renown & Rank**) |
| Chronicle | **Records** (page: **Kingdom Records**, with **Life Log**, **Assignments** and **Reports**) |
| Adventure | **Story** (the clover) |
| Grimoire | **Magic** |
| Bound | **Pacts** (page: **Mystic Pacts**) |
| Pack | **Satchel** (page: **Satchel & Treasury**, with **Equipment**, **Trading** and **Banking**) |
| More | More |

- The bar is reordered to Realm · Relations · Renown · Records · **Story** · Magic · Pacts · Satchel · More.
- The Home cards are reordered (Story, Magic, Character, Connections, Renown, Assignments, Realm Map, Satchel, Trading, Treasury, More) and retitled to match.
- Connections no longer repeats "No journey is solitary."; it says "Every thread you have woven." (or "No threads woven yet.").
- Character creation: "Natural Simulation" is now **World-Generated Talent**, and the story-opening options are reworded (e.g. "Grimoire Ceremony Day", "Just after the Entrance Exam").
- Long page titles ("Kingdom Records", "Mystic Pacts") shrink to fit beside the pennants.
- The interface can now use images uploaded to the Yumina Library: `tools/art/mkart.py` takes an optional `assets.json` (image name → `@asset:<id>`), and any image listed there is loaded from the Yumina CDN instead of GitHub.

## v21.6.1 — hosted art (fixes the "inline base64" save error)

Yumina refuses to save a world that adds embedded base64 images ("This save would add 41 new inline base64 data URI(s)"). The 40 painted interface crops and the header banner were embedded that way. They are now ordinary image files in `art/` in this repository, and the card points to them by `https://` URL, which Yumina allows. Nothing looks different.

- The card contains **no** inline data URIs, and its size dropped from about 1.2 MB to 0.9 MB.
- The URLs are pinned to a specific commit of this repo, so they keep working after the branch is merged or deleted. The repo has to stay public.
- To host the images somewhere else, run `python3 tools/art/mkart.py art tools/ui/bc-art.js <base-url>/` and rebuild. If you would rather use Yumina's own CDN, upload the files in `art/` to your Library and put each `@asset:<id>` into `bc-art.js` (the interface resolves `@asset:` refs for the banner only, so other images need `https://` URLs).

## v21.6 — battle arena and a generated world map

### Battle arena

Fights can now be played out instead of narrated. It's a real-time top-down arena, not a menu of buttons. The whole fight runs in the interface, so it costs **no AI turns**. The AI writes one reply afterwards, about the aftermath.

- **Starting a fight:** while `in_combat` is true, the Adventure screen's combat bar has **Fight it out**. A VS card shows your side and the foes. You can **Fight!** or choose **Let the story decide instead** and carry on in text as before.
- **Controls:** on a phone, a left stick and buttons. On a keyboard: WASD to move, J to **Strike** (a melee hit), Space to **Roll** (a dodge with a moment of invulnerability), hold Shift to **Guard** (halves damage; with Mana Skin or Reinforcement it becomes a mana-fed guard that blocks more), 1–3 for up to three of your own spells, E for the finisher, Tab to switch targets and Esc to pause.
- **What makes it play:**
  - Enemy attacks wind up as red danger zones before they land.
  - Hitting a foe during its wind-up **interrupts** it for 1.5× damage.
  - Rolling through an attack as it lands is a **Perfect Dodge**, which slows time.
  - Hits build a combo and a **Focus** meter. A full meter unlocks a Full-output finisher for any spell.
  - Arenas match the scene (street, wilderness, wooden interior, stone training ground) and have cover to fight around.
- **Your real character, your real magic:**
  - The fight starts from your actual vitality, stamina and mana.
  - Spells cost exactly what the spell engine says (`bcCastPlan`), so a fight drains the same reserve the story uses.
  - Each spell's shape decides how it plays: bolt, lance, wave, burst, bind, barrier, heal or blink. The shape comes from its category and description.
  - Foe strength comes from the world (`combat.participants` threat and kind, saved NPC profiles), never from your level. A captain-class foe is a real wall.
  - Allies in `combat.participants` fight beside you.
- **Ways out:** win, get beaten, run out through the escape gate (hold it for 2 seconds), or pause and yield. You can also pause and hand the fight back to the story.
- **After the fight**, you get a grade (S–D), the stats, and each foe's fate, and the interface applies:
  - vitality and stamina (in-fight stamina is a separate "wind" gauge, and only part of what you spend is charged as real stamina)
  - fatigue, mana and `mana_reserve`
  - the clock
  - a "battle wounds" condition after a heavy beating
  - each foe's condition, in `combat` and in the saved NPC records
  - `in_combat` (on a defeat it stays true, and the AI decides what the enemy does)

  It then sends one hidden `[UI:BATTLE]` report, and the AI narrates the decisive moments and consequences without rewriting any of those numbers.
- **Sparring:** the Training page has **Spar in the arena**. It's a practice fight against a training partner with softer hits, and it ends when either side takes a clean beating. It spends stamina, mana and about 20 minutes, and adds spell practice to the spells you used (once per spell per day). It sends no message to the AI at all. **Finish & spar again** goes straight into another round.
- **Battle Record** on the Crown page lists your recent fights and grades.
- **New variables:** `battle_log` and `spar_practice` (both hidden from the AI). `combat.participants` can now carry `key`, `threat` (weak → captain), `kind` (brute / caster / beast) and `attribute`. The combat engine only mentions the arena while a fight is on, so ordinary turns cost the same tokens as before.

### World map, drawn from the story

The World Map page now has an interactive map that the interface generates itself from what the story has said:
- **Terrain:** the land, mountains, forests, coast and kingdom borders are painted procedurally around the canon layout. The Clover Kingdom's Noble, Common and Forsaken realms show as rings around the capital.
- **Where each place goes,** in order:
  1. coordinates the AI recorded
  2. the hidden `world_truth.geo` record
  3. the canon gazetteer
  4. `near` / `dir` / `km` fields
  5. the description itself, e.g. "a day north of Hage", "12 km east of Kiten", "near Nairn"
  6. a best guess from the kingdom or realm

  Places placed by a guess have a soft halo so you know they're approximate. Names like "Hage Village" and "The Village of Hage" are matched to the same spot.
- **Status and history:** visited, known and rumored places have their own colors and icons. Places you haven't looked at yet show **NEW**. Your past positions form a trail, and your home is marked.
- **Controls:** drag to pan, pinch or wheel to zoom, and use the +/−/◎ buttons, **Realms** and **Expand** (full screen). Tap a place to open its card, then **Plan travel here** fills in the Travel panel.
- The AI is now told to give `near`/`dir`/`km` for a new place when it has no exact coordinates, so the map can place it.

### Fixes in this pass

- On the map, the "you are here" marker now finds you even when the current location and the known place are named slightly differently.

## Lower mushie use

Measured with the engine's own prompt builder and lorebook matcher on a typical turn (tokens sent per turn, not counting chat history):

| | Before | After |
|---|---|---|
| Early game | ~42,000 | ~18,100 |
| Late game (big inventory, ledgers, chronicle) | ~48,500 | ~22,100 |

Chat history used to be sent whole (up to 200K tokens). It is now a running summary plus the latest 30 messages.

What changed:
- **Always-on rules: about 16K → 6.6K tokens.** Thirteen overlapping core entries became nine. Rules said three or four times (the world_time reminder alone appeared six times) are now said once. No rule was dropped.
- **Detailed rules load on demand.** The full banking, inventory, appearance and spell-ledger rules are keyword entries now; a compact core version of each is always sent. The combat engine loads automatically while `in_combat` is true, instead of being toggled by rules.
- **Tighter lore triggers.** Words like "mana", "home", "noble", "royal capital", "market" and "job" used to pull in about 18 entries (~15K tokens) on an ordinary turn. Triggers are now specific phrases and whole words, and the scan depth is 2 messages instead of 3.
- **No more duplicate every-turn reminders.** The every-turn directive-gate rule, the every-turn full-sync reaction and the inventory-guard rule are removed. One short final check sits in post-history instead. The 12-turn sync sweep is kept.
- **The AI no longer reads interface ledgers.** `bank_account`, `mk_payroll`, `spell_ledger` and `equipment_event_seq` are hidden from the AI. A one-line `bank_summary` replaces them. Values only the interface may change (`carry_state`, `appearance_state`, `mana_reserve`, `creation_profile`, `sim_settings`…) are read-only for the AI. Knight bonuses go through the new `mk_bonus_requests` list, which the interface files into payroll.
- **Automatic tidying (interface only, no AI calls):** chronicle pages beyond 20 and resolved events beyond 5 move to archives that the Journal still shows. Spell events are cleared once the spell engine has processed them.
- `maxTokens` is 12,000 (was 24,000).

## New mechanics (inspired by DanMachi and Draco)

- **World Churn (engine roll).** On about one turn in eight (never twice within six turns), the engine prompts the narrator to bring in one small piece of independent world life, such as a rumor, a local event or an NPC acting on their own. It costs no extra AI call. This is the dice-reaction pattern DanMachi uses.
- **New Day.** When the date changes, a one-time reminder tells the narrator to carry the weather forward and move schedules and deadlines.
- **Story summary + latest 30 messages**, with a summary focus written for this card: promises, debts, NPC feelings, divergence from canon.

## Interface

- Rebuilt to match the mockups: painted castle header with pennants, a location bar, a profile card with pill bars, a painted tile grid, and a navigation bar with Home · Grimoire · Bonds · Chronicle · ✣ · Pack · Bound · Crown · More.
- **Adventure:** a condition strip (body, mana, stamina, fatigue, time of day and weather), a Chronicle story card, 2×2 painted action cards, and quick Cast / Use item chips.
- **Grimoire:** Bonds (spirit and devil) at the top, Spells & Pages with category filters, tags and proficiency bars, an Attributes radar (drawn from the bands, so no hidden numbers are shown), Mana Tendency and Progression.
- **Pack:** one page with your purse, Inventory (All / Items / Materials / Key Items, sort, tap an item for its actions), Market and Bank & Treasury.
- **World Map:** current location, home, known / visited / rumored places with painted thumbnails, and a Travel panel (destination, travel method, pace).
- **Chronicle:** Chronicle / Missions / Notices tabs. Before, the notices badge pointed to a page you could not open.
- **Crown:** squad, pay and standing. **More:** character, training, time, routine, codex, family, artwork, settings, help.
- **Creator:** all five pages restyled to match the mockups (framed fields, region cards with art, starting-place cards, a finalize summary with narrative-mode toggles and a green Begin Life button). Homeland now defaults to Clover.
- **Fixed:** a stylesheet bug from the original. One media rule was never closed, so on screens wider than 430px every style after it was dropped.
- The art is cropped from the mockups into `bc-art.js`. It belongs to the interface and is never sent to the AI.

## Rebuilding

`art/` holds the interface images and `tools/` holds everything needed to regenerate the card: `splice.py` builds `ui/index.tsx` from the source interface plus `parts/`, `build.py` builds the card from the source JSON plus `core/` and `ui/`, and `analyze.ts` measures prompt size with the engine.

## v21.5 — interaction pass

Every element that looks clickable is now clickable, and every button actually does something.

- **Home:** the stat bars and age badge open Character. Each summary row opens its page (Mana → Character, Reputation/Squad/Title → Crown, Location → World Map), and the location bar opens the map. Body, mana and stamina pulse red when they're critically low (on the Adventure screen, fatigue pulses when it's too high).
- **Adventure:** the condition strip opens Character and the time/weather cell opens Let Time Pass. The Upcoming bar opens Notices. The story card has a working toolbar: **Copy**, **Edit** (prose only; the state that reply recorded is kept), **Regenerate** and **Save to Journal**. Action cards do the sensible thing:
  - **Rest** opens the rest panel.
  - **Train** opens the training planner.
  - **Eat something** eats a carried food item for free with no AI turn, and only asks the AI if you have no food.
  - Other cards send the action.
- **Composer:** **+** opens an Actions sheet (cast, use item, rest, training, travel, let time pass, plus any extra scene actions). **Suggest** and **Random** put an idea in the box without sending it. While the AI is writing, a **Stop** button appears.
- **Grimoire:** the Attributes and Mana Tendency cards open a "Your magic" sheet with every band, plus Train / Shape buttons. The page counter opens the grimoire record.
- **Pack:** the three tabs follow your scroll position. The purse jumps to the bank, and the weight chip opens load details.
- **World Map:** tapping a place selects it and scrolls to Travel. Home plans the way home, and Current Location opens a details sheet with a "look around" action.
- **Chronicle:** a Saved passages section (stored privately on your device, never sent to the AI).
- Every tappable element has press, hover and keyboard-focus feedback.

**Background art:** all 40 paintings are cropped further inward and none contains lettering. On the panels, the background art sits behind and to the side of the text, so only the interface's own words appear.
