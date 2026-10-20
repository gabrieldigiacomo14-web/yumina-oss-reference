# Black Clover: A Mage's Tale — v21.5

Import `Black_Clover_A_Mages_Tale_v21.5.json`. It is built from `source/Black_Clover_A_Mages_Tale_Narrative_Spell_Bridge.json` (v21.4 + the narrative spell bridge), so every mechanic from that file is kept.

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

`tools/` holds everything needed to regenerate the card: `splice.py` builds `ui/index.tsx` from the source interface plus `parts/`, `build.py` builds the card from the source JSON plus `core/` and `ui/`, and `analyze.ts` measures prompt size with the engine.

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
