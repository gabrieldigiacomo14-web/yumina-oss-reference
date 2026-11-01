# Surviving the Game as a Barbarian — v22.0.0

Import `Surviving_The_Game_as_a_Barbarian_v22.0.0.json`. It is built from `source/Surviving_The_Game_as_a_Barbarian_v21.0.0.json` by `tools/patch.py` (interface) and `tools/build.py` (card, which also runs `tools/prompts/apply.py`). Running them on the source rebuilds the shipped file byte for byte.

**Players only see this after the update is published and passes Yumina's review.** Until then an import plays as the creator's working copy. The Ledger's Display card shows "Interface v22.0" when the new interface is running.

| | v21 | v22 |
|---|---|---|
| Prompt per turn, before chat history (Yumina's own token estimate) | ~125,000 | ~41,800 |
| Always-sent rule entries | 62 | 18 |
| Variable instructions sent every turn | ~97,000 characters | ~42,500 |
| Card file | 1.99 MB | 1.14 MB |

## The interface: same look, new layout

The materials are unchanged: charcoal iron, parchment, leather, brass and blood, with the same fonts, icons and race sigils. What changed is the layout, which now matches Black Clover's and Eldoria's.

- **Top bar:** your race medallion (opens the Ledger), your name, race, rank and soul level, and the purse. Stones and mana stones sit side by side and are never confused; tap the pouch for its breakdown.
- **Bottom nav around the Story emblem:** Ledger, Kit, Sheet, Skills | Story | Party, Map, Guild, Journal. Bank, Home, Goods, Commit and World are tiles in the Ledger (and listed in the desktop sidebar).
- **Story screen:**
  - A strip with Body, Spirit, Stamina, plus Water and Food (shown below the surface or when either runs low). Each is a bar with a word, such as "Hurt", "Winded" or "Wanting"; Spirit is never a number.
  - Where and when you are, and your injuries.
  - The story itself. A line that is wholly a bracketed system line ("[ Goblin — Rank 9 mana stone added to the pouch ]") is drawn as an event slip.
  - **Quick actions:**
    - Underground: Look around, Listen, Search for the way down, Drink, Make camp.
    - On the surface: Look around, The Guild, Find a meal, Listen for talk, Somewhere to sleep.
    - In a fight, the row shows what you can grab at once.
    - **Suggest** puts an idea in the message box without sending it.
    - The ✎ button opens all actions, plus what is within quick reach.
  - The combat, shop and conversation panels open over the Story screen exactly as before.
- **The Ledger (new hub):**
  - Your hero card: medallion, soul level, essence slots, achievement points towards the next level, the bars, and purse, pouch and tax owed.
  - "Back to the story".
  - Twelve tiles with a live line each (Kit load and repairs, party members, open journal entries and rumours, rank, bank balance, address, gear someone could recognise, and so on).
  - A Display card.
- **Layouts:**
  - **Phone portrait:** the default.
  - **Phone landscape:** the nav becomes a rail, and the strip and quick actions sit beside the story.
  - **Desktop:** a sidebar with every screen, and a status panel on the right (where, when, bars, purse, pouch, tax, load, injuries, party).
  - A chosen layout is only used where the screen is wide enough (desktop 900 px, landscape 560 px). The Eldoria lesson is built in from the start, so a phone can't get stuck in desktop mode.
- **The other screens:** Character, Skills, Party, Map, Guild, Journal, Bank, Home, Goods, Commit, World, combat, shop, conversation and character creation open inside the new frame. Their content, buttons and logic are unchanged, and their design is the one they already had. The Character sheet's Kit and Bags tabs moved to the new Kit screen.

## The Kit: the same inventory idea, upgraded

The concept is kept exactly. Every object is one real thing that is somewhere: worn in one of the body slots, inside a named pocket of a bag, pouch, quiver, sheath or scabbard (each with its own space, weight, what-fits and reach), loose in your hands, or on the ground. Stones (coin) and mana stones (loot) stay separate, and numbered items stay in their ledger. All of it still runs on the card's own inventory helpers.

- **Reach, the quick-draw belt:** everything you own, sorted by how fast you can get at it: in hand, on the body, quick, ready, slow, buried (deep in the pack), loose. During a fight, the Kit warns that only in-hand, on-body and quick items can be used at once; the card already refused the rest, and now you can see why before you try.
- **Body:** a tile for every slot (main hand, off hand, head through clothes) with what is in it and its wear, plus total blunt, slash and pierce protection. **Tap an empty slot** to see what you carry that goes there.
- **Compare before you equip:** an item that would replace a worn piece shows both side by side (power, reach, speed, handling, armour piercing, critical bias, stamina use, protection, block, weight, durability), with green or red differences. Lower stamina use and weight count as better.
- **Bags as tiles:** each bag is a card. Each compartment shows its reach and two fill bars (space, weight) and what is inside; tap anything to open it. Put on or take off a bag from its card.
- **Move to…:**
  - Lists every compartment of every bag. The places it fits come first, with their reach and how full they are.
  - The others say why not ("not enough physical space", "that slot does not fit this kind of object", "not worn").
  - **Best free place** picks the quickest pocket that fits. **Take it out** holds it loose.
- **Ground:** what you dropped at your current location is listed with **Pick up**, which puts it in the best free pocket or your hands.
- **Find, filter and sort:** filters for Worn, Weapons, Armour, Food & drink, Tools, Loot & other, and Needs repair; a search box; sort by place, name, heaviest or worth.
- **Stacks:** split half or one off a stack. The new stack has its own identity and is held loose until you put it somewhere.
- **Repair warnings:** anything under 35% durability is marked, counted on the Ledger's Kit tile, and filterable.
- **Unchanged behaviour:**
  - Eat and Drink stay silent: the bars change and nothing is sent to the story.
  - Use, Drop, Equip and Remove tell the narrator what physically happened, as before.
  - Talismans: one worn at a time.
- **Two fixes:**
  - Equipping a piece straight from a bag left it recorded as still inside the bag, so a worn helmet counted as "buried". Equipping now moves it onto the body, and taking it off makes it loose.
  - The game closed every screen when a fight started, so you couldn't reach your gear in combat. The Kit now stays open in a fight (the combat panel waits on the Story screen); every other screen still closes.

## Prompt and file optimization (the rules are all kept)

**Always-sent rules: 62 entries merged into 18.** The same rules were stated several times: the essence drop rates in six entries, the one-way Labyrinth and time dilation in three, "mana stones are not money" in three, the economy in five, companions in five. Each topic is now stated once, keeping every specific number, name and exception.

The 18 entries:
- Core Simulation Directive (no plot, causality, canon and Bjorn-era history, source-of-truth order)
- World Primer
- Secrecy Layer
- The Knowledge Rule
- Hard Law — The Labyrinth (three clocks, entry window, one-way exit, floor close times, rifts, customs)
- Hard Law — Soul, Essence, Rank
- Hard Law — City, Money & Economy (tax, mana stones vs stones, price anchors, living economy, law, Guild requests)
- Hard Law — Bodies & Races
- Equipment, Possessions & Loot
- Living World Engine
- Companions & Party
- Interface Authority, Commands & Directive Safety (including the Alminus counter)
- Abstracted Grind
- Narration Style
- Character Creation (still only while creating)
- Interface Protocol: panel scenes
- RNG Oracle
- Output Discipline

The narrator no longer receives the "Interface Visual Direction" entry, which described how the interface looks.

**Variable instructions condensed.** For example, the shop, conversation, journal and kill-log instructions repeated whole paragraphs of the Interface Protocol. Nine pure-bookkeeping variables are now hidden from the narrator (their value and their instruction): the item-use ledger, the loot-resolution ledger, two compatibility mirrors, the entry-window and rift-portal config tables, the canon authority registry, the surface-time mirror and the economy day. The engine and interface still read and write them.

**Lore entries fire when relevant, not every turn.** Keywords matched inside other words ("law" in "flaw") and over-broad ones ("player", "city", "floor", "pay", "barbarian") fired almost every lore entry each turn, and each fired entry's text could fire the others. Lore now matches whole words, no longer chain-triggers, and the over-broad keywords are gone; a few natural ones were added ("training", "train my", "transmigrated"). Tested: essence erasure, tax and rent, monster weaknesses, Bjorn, numbered items and training each bring in their entry.

**Per-turn rule messages.** Six rules sent a message every turn (or on every inventory change) that repeated an always-sent rule; those messages are gone, and their state changes (such as the automatic 2 minutes a turn) are kept. One of them told the narrator to recompute carry weight, which the interface already does. The offscreen-simulation pass ran every turn, because the clock moves every turn; it now runs once per new day, and the heartbeat every 8 turns is unchanged.

**Fixes found by Yumina's validator:**
- The "seed the living world after creation" rule used an invalid trigger, so it never fired. It now fires once when the character is created.
- Thirty-eight entries had an invalid secondary-keyword setting, now set to the valid default.
- Two empty folders and a null playlist failed validation and were removed.
- The card now passes the schema with no errors.

**File size:** the stored compiled copy of the old interface (about 0.8 MB) is dropped; Yumina recompiles from source.

## Testing

- **The test page** (`tools/harness`) is Yumina's sandbox with a stand-in for its API and message box. The test save is a Barbarian on Floor 1 with worn armour, a pack and belt pouch with filled compartments, loose loot, something dropped on the ground, a companion and an injury.
- **Inventory checks** (`tools/harness/kittest.mjs`), all passing, with no page errors:
  - Equip the dagger (the mace comes off, held loose).
  - Equip a cap straight from the pack (now worn on the body).
  - Split a stack.
  - Move the mace into a weapon holder.
  - Drink from the waterskin (hydration up, skin down).
  - Pick up from the ground (into the best pocket).
  - Drop one of a stack.
  - The Kit stays open when a fight starts.
  - A buried item is refused in a fight.
  - The narrator is told about every physical action.
- **All 14 screens** open in phone portrait, phone landscape and desktop with no errors and nothing wider than the screen (`tools/harness/allscreens.mjs`). Combat, shop, conversation and character creation also render.
- **Prompt cost and schema** come from Yumina's own prompt builder, lore matcher and schema (`tools/analyze.ts`).
- The interface compiles with Yumina's Sucrase transforms.

**Not tested:** Yumina's real message list and composer (the test page imitates them), real phones, and real play with a live narrator. The merged rules keep every rule, but how a model behaves with the shorter prompt can only be seen in play. Worth watching in the first sessions: kill payouts, `[sync]`, shop and haggle flow, and the Labyrinth exit rules.

`docs/` has the screens: `v22-phone-portrait.png`, `v22-phone-landscape.png`, `v22-desktop-story.png`, `v22-desktop-kit.png`, and `v21-before-phone.png` for comparison.
