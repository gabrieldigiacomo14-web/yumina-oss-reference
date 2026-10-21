"""Builds new/ui/index.tsx from the bridge interface + new parts. Usage: python3 -I splice.py <bridge index.tsx> <out index.tsx>"""
import sys, os, re, json
HERE = os.path.dirname(os.path.abspath(__file__))
P = lambda n: open(os.path.join(HERE, 'parts', n)).read()
s = open(sys.argv[1]).read().replace('\r\n', '\n')

def remove_func(src, name):
    m = re.search(r'\n(export default )?function ' + re.escape(name) + r'\(', src)
    assert m, name
    start = m.start()
    end = src.index('\n}\n', m.end()) + 3
    return src[:start] + '\n' + src[end:]
def cut_func(src, start):
    eol = src.index('\n', start + 1)
    line = src[start + 1:eol]
    if line.count('{') == line.count('}') and line.rstrip().endswith('}'):
        return src[:start] + src[eol:]
    end = src.index('\n}\n', start + 5) + 3
    return src[:start] + '\n' + src[end:]
def remove_var(src, name):
    m = re.search(r'\nvar ' + re.escape(name) + r' = ', src)
    assert m, name
    start = m.start(); i = m.end()
    # find the terminating ';' at depth 0 (skip strings)
    depth = 0; q = None
    while True:
        c = src[i]
        if q:
            if c == '\\': i += 2; continue
            if c == q: q = None
        elif c in '"\'': q = c
        elif c in '([{': depth += 1
        elif c in ')]}': depth -= 1
        elif c == ';' and depth == 0: break
        i += 1
    return src[:start] + '\n' + src[i + 1:]

s = s.replace('import {bcManaMax', 'import { BC_IMG } from "./bc-art.js";\nimport { BattleArena, BATTLE_CSS } from "./bc-battle";\nimport { WorldMap, WORLDMAP_CSS } from "./bc-worldmap";\nimport {bcManaMax', 1)
# the hero banner is a hosted image (bc-art.js), not an embedded data: URI
s, nb = re.subn(r'banner:\s*"data:image/[a-z]+;base64,[A-Za-z0-9+/=]+"', 'banner: (BC_IMG && BC_IMG.banner) || ""', s, count=1)
assert nb == 1, "banner data URI not found"
s = remove_var(s, 'TILE_KEYS')
# new home/nav core goes where the old TILES table was, so ART_SLOTS (evaluated at load) sees it
m = re.search(r'\nvar TILES = \[', s)
tiles_at = m.start()
s = remove_var(s, 'TILES')
s = s[:tiles_at] + '\n' + P('p1_core.tsx') + s[tiles_at:]
for f in ['Stepper', 'TileGrid', 'PanelHead', 'OpeningSheet', 'CreatorBanner', 'Creator', 'Tile', 'LocationBar', 'noticeCount', 'activeMissions',
          'HomeView', 'GrimoireView', 'PackView', 'MapView', 'JournalView', 'MenuView', 'Nav', 'Page', 'Game', 'Composer']:
    # remove the ORIGINAL definition only (the first one that is not from our parts)
    occ = [mm.start() for mm in re.finditer(r'\nfunction ' + f + r'\(', s)]
    assert occ, f
    first_new = s.index(P('p1_core.tsx'))
    old = [o for o in occ if not (first_new <= o < first_new + len(P('p1_core.tsx')))]
    assert len(old) == 1, (f, len(old))
    start = old[0]; s = cut_func(s, start)
for f in ['CharacterCard', 'AgeBadge']:
    occ = [mm.start() for mm in re.finditer(r'\nfunction ' + f + r'\(', s)]
    first_new = s.index(P('p1_core.tsx')); n = len(P('p1_core.tsx'))
    old = [o for o in occ if not (first_new <= o < first_new + n)]
    assert len(old) == 1, (f, len(old))
    start = old[0]; s = cut_func(s, start)
for v in ['ERA_TILES', 'NAV', 'HOME_SUB', 'TITLES', 'MENU_ITEMS', 'CONCEPT_WORD']:
    occ = [mm.start() for mm in re.finditer(r'\nvar ' + v + r' = ', s)]
    first_new = s.index(P('p1_core.tsx')); n = len(P('p1_core.tsx'))
    old = [o for o in occ if not (first_new <= o < first_new + n)]
    assert len(old) == 1, (v, len(old))
    s2 = s[:old[0]] + '\n@@CUT@@' + s[old[0] + 1:]
    s = remove_var(s2.replace('\n@@CUT@@', '\nvar __CUT__' + v + ' = ', 1), '__CUT__' + v)
s = s.replace('homeland: "", homeland_note: ""', 'homeland: "Clover", homeland_note: ""', 1)
sv = s.index('\nfunction StoryView(')
s = s[:sv] + s[sv:].replace('var ss = React.useState(""); var sheet = ss[0], setSheet = ss[1];', 'var ss = React.useState(""); var sheet = p.setSheet ? p.sheet : ss[0], setSheet = p.setSheet || ss[1];', 1)
# StoryView return block
a = s.index('  return (\n    <div className="bc-fill bc-story">')
b = s.index('\n}\n', a) + 3
s = s[:a] + P('p2_story_return.tsx') + s[b:]
# MarketView / BankView returns
mv = s.index('\nfunction MarketView(')
a = s.index('  return (\n    <div>\n      {buyError', mv); b = s.index('\n}\n', a) + 3
s = s[:a] + P('p5_market_return.tsx') + s[b:]
bv = s.index('\nfunction BankView(')
a = s.index('  return <div>\n    <Eyebrow k="CLOVER KINGDOM', bv); b = s.index('\n}\n', a) + 3
s = s[:a] + P('p6_bank_return.tsx') + s[b:]
# remaining parts before App
app = s.index('\nexport default function App(')
s = s[:app] + '\n' + P('p3_grimoire.tsx') + P('p4_pack.tsx') + P('p7_rest.tsx') + P('p8_game.tsx') + P('p9_creator.tsx') + P('p10_battle.tsx') + s[app:]
# css
# the original 430px media rule never closed its block, swallowing every later rule on wider screens
s = s.replace('scroll-padding-bottom:calc(126px + env(safe-area-inset-bottom))}",', 'scroll-padding-bottom:calc(126px + env(safe-area-inset-bottom))}}",', 1)
css_lines = [l for l in P('p0_css.txt').split('\n') if l.strip()]
end = s.index('].join("\\n");')
pre = s[:end].rstrip()
if not pre.endswith(','): pre += ','
s = pre + '\n' + ',\n'.join('  ' + json.dumps(l) for l in css_lines) + '\n' + s[end:]

# ---- display names (v21.6.2): the interface's own words; internal view ids are unchanged
def label(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, "label %r: expected %d, found %d" % (old, n, c)
    s = s.replace(old, new)
label('title: "Grimoire", sub: "Spells. Attributes. Progress."', 'title: "Magic", sub: "Spells. Attributes. Progress."')
label('people: { title: "Bonds", sub: "Friends. Rivals. Romance.", big: true }', 'people: { title: "Connections", sub: "Friends. Rivals. Romance.", big: true }')
label('journal: { title: "Chronicle", sub: "Goals · Missions · History", big: true }', 'journal: { title: "Kingdom Records", sub: "Goals · Assignments · Reports", big: true }')
label('bound: { title: "Bound", sub: "Spirits and Devils", big: true }', 'bound: { title: "Mystic Pacts", sub: "Spirit connections and devil contracts", big: true }')
label('crown: { title: "Crown", sub: "Rank · Merit · Service", big: true }', 'crown: { title: "Renown & Rank", sub: "Advancement · Merit · Reputation", big: true }')
s, n_t = re.subn(r'var TITLES = \{.*?\};', lambda m: 'var TITLES = { grimoire: "Magic", character: "Character", squad: "Renown & Rank", crown: "Renown & Rank", pack: "Satchel & Treasury", bank: "Satchel & Treasury", market: "Satchel & Treasury", missions: "Kingdom Records", map: "Realm Map", people: "Connections", notices: "Kingdom Records",\n  journal: "Kingdom Records", bound: "Mystic Pacts", menu: "More", train: "Training", time: "Let Time Pass", routine: "Routine", codex: "Codex", household: "Home and Family", art: "Artwork", settings: "Settings", help: "Help" };', s, count=1, flags=re.S)
assert n_t == 1
label('title="Chronicle" sub="Your own history, page by page."', 'title="Life Log" sub="Your own history, page by page."')
label('>Chronicle</Chip>', '>Life Log</Chip>')
label('{"Missions" + (ms ? " (" + ms + ")" : "")}', '{"Assignments" + (ms ? " (" + ms + ")" : "")}')
label('{"Notices" + (notices ? " (" + notices + ")" : "")}', '{"Reports" + (notices ? " (" + notices + ")" : "")}')
label('<Icon n="clover" s={13} />Chronicle</span>', '<Icon n="clover" s={13} />Story</span>')
label('Save to Journal', 'Save to Life Log')
label('<H>Missions and commitments</H>', '<H>Assignments and commitments</H>')
label('No missions. Requests come from', 'No assignments. Requests come from')
label('<Eyebrow k={"BONDS · FRIENDS AND RIVALS"}>{ids.length ? "No journey is solitary." : "No journey is solitary, yet."}</Eyebrow>', '<Eyebrow k={"CONNECTIONS · FRIENDS AND RIVALS"}>{ids.length ? "Every thread you have woven." : "No threads woven yet."}</Eyebrow>')
label('BOUND · SPIRITS AND DEVILS', 'MYSTIC PACTS · SPIRITS AND DEVILS')
label('<strong>Bonds</strong><small>Spirits and Devils walk different paths.', '<strong>Pacts</strong><small>Spirit connections and devil contracts walk different paths.')
label('aria-label="Pack sections"', 'aria-label="Satchel sections"')
label('["inventory", "Inventory", "Items & Materials", "pack"], ["market", "Market", "Buy · Sell · Trade", "coins"], ["bank", "Bank & Treasury", "Save · Deposit · Withdraw", "bank"]', '["inventory", "Equipment", "Gear & Materials", "pack"], ["market", "Trading", "Buy · Sell · Trade", "coins"], ["bank", "Banking", "Save · Deposit · Withdraw", "bank"]')
label('title="Inventory" sub="Items, Materials, and Key Items you carry."', 'title="Equipment" sub="Gear, materials and key items you carry."')
label('title="Bank & Treasury" sub="Safekeep your wealth."', 'title="Banking" sub="Safekeep your wealth."')
label('title="Market" sub="Buy, Sell, and Trade in the Kingdom."', 'title="Trading" sub="Buy, sell and trade across the Kingdom."')
label('title="Natural simulation"', 'title="World-Generated Talent"')
label('["leaf", "Natural Simulation",', '["leaf", "World-Generated Talent",')
# story-opening options, reworded
label('before: ["One year before the ceremony", "Three years before", "Five years before", "Ten years before", "A generation before"]', 'before: ["A year before the ceremony", "Three years before", "Five years before", "A decade before", "A generation before"]')
label('during: ["The Grimoire Acceptance Ceremony", "The months before the Entrance Exam", "Right after the Entrance Exam", "Asta and Yuno\'s first year as Magic Knights"]', 'during: ["Grimoire Ceremony Day", "Months before the Entrance Exam", "Just after the Entrance Exam", "Asta and Yuno\'s first year in the Knights"]')
label('after: ["Right after the published story", "Ten years after", "Twenty-five years after", "A generation later"]', 'after: ["Just after the published story", "A decade after", "A quarter-century after", "A generation on"]')
label('opening: "The Grimoire Acceptance Ceremony"', 'opening: "Grimoire Ceremony Day"')
label('  var api = useYumina();\n  var v = (api && api.variables) || {};\n  useRelationshipIdentityGuard(api);\n  var art = useArt(api);\n  return (\n    <div className="bc-root">', '  var api = useYumina();\n  if (api && typeof api.resolveAssetUrl === "function") ART_RESOLVE = function (ref) { return api.resolveAssetUrl(ref); };\n  var v = (api && api.variables) || {};\n  useRelationshipIdentityGuard(api);\n  var art = useArt(api);\n  return (\n    <div className="bc-root">')
open(sys.argv[2], 'w').write(s)
print('ok', len(s))
