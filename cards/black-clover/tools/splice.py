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
open(sys.argv[2], 'w').write(s)
print('ok', len(s))
