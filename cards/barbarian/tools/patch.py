"""Builds the Barbarian interface (single-file index.tsx) from the card's original plus the v22 parts.
Usage: python3 -I patch.py <original index.tsx> <ui dir>"""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
src, out_dir = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read().replace('\r\n', '\n')
def P(n): return open(os.path.join(HERE, n), encoding='utf-8').read()
def sub(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, 'expected %d, found %d: %r' % (n, c, old[:90])
    s = s.replace(old, new)

css = P('ds-shell.css')
assert '`' not in css and '${' not in css
code = "\n// ==== v22 layout styles ====\nvar DS_CSS = `" + css + "`;\n" + P('ds-kit.tsx') + P('ds-shell.tsx') + "\n"
sub("function App() {", code + "function App() {")

# The HUD's job of keeping every value inside its bounds stays; its old drawing is replaced by the new top bar and strip.
sub("  var compactS = React.useState(false);\n  var compact = compactS[0], setCompact = compactS[1];\n  var name = v[\"char-name\"] || \"unnamed\";",
    "  if (props.watchOnly) return null;\n  var compactS = React.useState(false);\n  var compact = compactS[0], setCompact = compactS[1];\n  var name = v[\"char-name\"] || \"unnamed\";")

# KIT and BAGS become one screen of their own (the Kit); the character sheet keeps soul, race, body and codex.
sub('var TABS_panel = ["SOUL", "BODY", "KIT", "BAGS", "CODEX"];', 'var TABS_panel = ["SOUL", "BODY", "CODEX"];')
sub('var tabsList = raceTab ? ["SOUL", raceTab, "BODY", "KIT", "BAGS", "CODEX"] : TABS_panel;',
    'var tabsList = raceTab ? ["SOUL", raceTab, "BODY", "CODEX"] : TABS_panel;')

# A fight still takes every screen back, except the Kit: reaching for what you carry is what you do in a fight.
sub("    if ((fighting || dead) && screen !== null) setScreen(null);",
    "    if ((fighting || dead) && screen !== null && !(fighting && !dead && screen === \"KIT\")) setScreen(null);")

# Layout hook lives above the early return, with every other hook.
sub("  var s = React.useState(null);\n  var screen = s[0], setScreen = s[1];\n",
    "  var s = React.useState(null);\n  var screen = s[0], setScreen = s[1];\n  var lay = useDsLayout(api);\n")

# The App's frame: top bar, main (story or a screen), message box, nav, desktop status panel.
i0 = s.index("  if (!made) return <Creation api={api} />;\n")
i1 = s.index("export default App;")
watchers = ["Oracle", "PortalSearch", "SetBonusWatch", "RiftCycle", "ShopStock", "NarrativeIngestWatch", "PartyCombatEventWatch",
            "PartyProgressionWatch", "PartySurfaceLifeWatch", "CompanionLifeDirectiveWatch", "GuildWorldLawWatch", "RecruitmentStateWatch",
            "NpcActorEncounterWatch", "NpcInteractionMemoryWatch", "NpcActorDirectiveWatch", "NpcActorLifeWatch", "MasterTimekeeperWatch",
            "CanonAuthorityWatch", "HaggleWatch", "HaggleOffer", "NpcTradeWatch", "NpcTradeBar", "GrindClock", "PropertyClock"]
old_block = s[i0:i1]
for w in watchers:
    assert ("<" + w + " />") in old_block, w
screens = [("SHEET", "Sheet"), ("MAP", "MapScreen"), ("JOURNAL", "Journal"), ("GUILD", "Guild"), ("PARTY", "Party"), ("VAULT", "Vault"),
           ("HOME", "Home"), ("FENCE", "FenceScreen"), ("GRIND", "GrindPanel"), ("SKILLS", "Skills")]
for sid, comp in screens:
    assert ('screen === "%s"' % sid) in old_block and ("<" + comp + " ") in old_block, sid
new_block = '''  if (!made) return <Creation api={api} />;

  var onStory = screen === null;
  function go(id) { setScreen(id); }
  function close() { setScreen(null); }
  return (
    <div className={"ds-root dsx lay-" + lay.mode + (onStory ? "" : " notStory")} data-ui={DS_UI_VERSION}>
      <GlobalStyle />
      <style>{DS_CSS}</style>
      <Hud api={api} screen={screen} onScreen={setScreen} watchOnly />
''' + "".join("      <%s />\n" % w for w in watchers) + '''
      <DsTop v={v} lay={lay} screen={screen} go={go} />
      <div className="dsMain">
        {onStory ? <DsStory api={api} v={v} go={go} /> : null}
        {screen === "HUB" ? <DsHub api={api} v={v} go={go} lay={lay} /> : null}
        {screen === "KIT" ? <KitScreen onStory={close} /> : null}
''' + "".join('        {screen === "%s" ? <%s onClose={close} /> : null}\n' % (sid, comp) for sid, comp in screens) + '''        {screen === "WORLD" ? <WorldStateScreen api={api} onClose={close} /> : null}
        {/* Contextual layers, as before: the GM opens them by writing world state, and a fight outranks the rest. */}
        {!dead && fighting && screen !== "KIT" ? <Combat /> : null}
        {!dead && !fighting && screen === null ? <Shop /> : null}
        {!dead && !fighting && screen === null ? <Npc /> : null}
      </div>
      <div className="dsComposer"><MessageInput /></div>
      <DsNav screen={screen} go={go} lay={lay} />
      <DsSide v={v} go={go} />
      <Scan />
    </div>
  );
}

'''
s = s[:i0] + new_block + s[i1:]

os.makedirs(out_dir, exist_ok=True)
open(os.path.join(out_dir, 'index.tsx'), 'w', encoding='utf-8').write(s)
print('ok', len(s))
