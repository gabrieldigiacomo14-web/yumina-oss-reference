"""Applies the prompt optimization to the Barbarian card.
Usage: python3 -I apply.py <in.json> <out.json>
- always-sent rule entries: replaced by the merged set in entries.txt (every rule kept, each stated once)
- variable instructions: condensed (varrules.py); pure bookkeeping hidden from the narrator
- lore entries: whole-word keywords, no chain-triggering, over-broad keywords removed
- per-turn rule messages that repeated an always-sent rule: removed (their state changes kept)
- schema: secondaryKeywordLogic 'any' -> 'AND_ANY' (the only values the schema accepts)"""
import sys, os, json, re
HERE = os.path.dirname(os.path.abspath(__file__))
src, dst = sys.argv[1], sys.argv[2]
w = json.load(open(src, encoding='utf-8'))
ns = {}
exec(open(os.path.join(HERE, 'varrules.py'), encoding='utf-8').read(), ns)
VR, HIDE = ns['R'], ns['HIDE']

# ---------- always-sent entries
blocks = re.split(r'^#### ', open(os.path.join(HERE, 'entries.txt'), encoding='utf-8').read(), flags=re.M)[1:]
new = []
for b in blocks:
    head, body = b.split('\n', 1)
    eid, name, section, role = [x.strip() for x in head.split('|')]
    new.append((eid, name, section, role, body.strip()))
old_always = [e for e in w['entries'] if e.get('alwaysSend')]
template = next(e for e in old_always if e['id'] == 'core-directive')
by_id = {e['id']: e for e in w['entries']}
keep_greeting = [e for e in old_always if e.get('role') == 'greeting']   # greetings are not sent each turn
out_entries = []
pos = 0
for eid, name, section, role, body in new:
    base = dict(by_id.get(eid, template))
    base.update({'id': eid, 'name': name, 'section': section, 'role': role, 'content': body,
                 'alwaysSend': True, 'enabled': True, 'keywords': [], 'secondaryKeywords': [],
                 'position': pos})
    if eid not in by_id:
        base['conditions'] = []
    pos += 1
    out_entries.append(base)
new_ids = {x[0] for x in new}
removed = [e['id'] for e in old_always if e['id'] not in new_ids and e.get('role') != 'greeting']
out_entries += keep_greeting

# ---------- lore entries: whole words, no recursion, over-broad keywords out
DROP = {
 'racial-state': ['contract', 'racial'],
 'lore-districts': ['district', 'city', 'market', 'palace'],
 'lore-skills': ['train', 'training', 'skill', 'skills'],
 'lore-substat-training': ['labor'],
 'lore-bestiary-tactics': ['weakness', 'native'],
 'lore-civic-life': ['law', 'count', 'gp', 'facility', 'noble', 'exchange'],
 'lore-economy-tax': ['money', 'price', 'cost', 'buy', 'sell', 'afford', 'pay', 'stones', 'economy'],
 'lore-labyrinth-core': ['floor', 'guardian', 'portal', 'descend'],
 'lore-bestiary': ['monster', 'hunt', 'kill', 'beast', 'dragon', 'wolf'],
 'lore-races': ['barbarian', 'human', 'race', 'tribe', 'contract', 'auror'],
 'lore-guild-clans': ['guild', 'party', 'noble', 'register', 'recruit'],
 'lore-evil-spirits-roster': ['player', 'hunter', 'possess', 'execution', 'transmigrat'],
 'lore-bjorn': ['baron'],
 'income-reality': ['pay', 'sell', 'request', 'contract', 'owed', 'how much', 'afford'],
 'lore-property': ['live', 'room', 'house', 'address', 'business'],
}
ADD = {'lore-evil-spirits-roster': ['transmigrated', 'transmigration', 'transmigrator'],
       'lore-substat-training': ['training', 'train my', 'drills', 'exercise', 'strength training', 'hauling']}
for e in w['entries']:
    if e.get('alwaysSend'):
        continue
    if e.get('secondaryKeywordLogic') not in ('AND_ANY', 'AND_ALL', 'NOT_ANY', 'NOT_ALL'):
        e['secondaryKeywordLogic'] = 'AND_ANY'
    e['matchWholeWords'] = True
    e['preventRecursion'] = True
    kws = [k for k in e.get('keywords', []) if k.lower() not in DROP.get(e['id'], [])]
    e['keywords'] = kws + [k for k in ADD.get(e['id'], []) if k not in kws]
    out_entries.append(e)
for e in out_entries:
    if e.get('secondaryKeywordLogic') not in ('AND_ANY', 'AND_ALL', 'NOT_ANY', 'NOT_ALL'):
        e['secondaryKeywordLogic'] = 'AND_ANY'
w['entries'] = out_entries

# ---------- variables
ids = {v['id'] for v in w['variables']}
for k in list(VR) + HIDE:
    assert k in ids, 'unknown variable ' + k
for v in w['variables']:
    if v['id'] in VR:
        v['behaviorRules'] = VR[v['id']]
    if v['id'] in HIDE:
        v['aiAccess'] = 'none'

# ---------- rules: drop per-turn messages that repeat an always-sent rule
DROP_MSG = {'hidden-auto-sync-every-turn', 'automatic-minimum-time-progression', 'physical-inventory-state-sync',
            'inventory-encumbrance-pass', 'weapon-profile-refresh', 'economy-causal-update', 'economy-daily-reversion'}
disabled = []
for r in w['rules']:
    if r['id'] in DROP_MSG:
        r['actions'] = [a for a in r['actions'] if a.get('type') != 'send-context']
        if not r['actions']:
            r['enabled'] = False
            disabled.append(r['id'])
    if r['id'] == 'clock-offscreen-simulation':
        # the clock moves every turn, so this asked for an offscreen pass every turn; once per day is enough
        # (the heartbeat rule still checks every 8 turns)
        r['trigger'] = {'type': 'state-change', 'variableId': 'cycle-day'}
        for a in r['actions']:
            if a.get('type') == 'send-context':
                a['message'] = a['message'].replace('CLOCK ADVANCED.', 'A NEW DAY.')

# ---------- schema repairs found by the engine's validator
for r in w['rules']:
    if r['id'] == 'creation-seed-living-world':
        # 'above' is not a valid direction, so this one-time seeding pass never fired
        r['trigger'] = {'type': 'state-change', 'variableId': 'character-created'}
        r['conditions'] = [{'value': True, 'operator': 'eq', 'variableId': 'character-created'}]
        r['maxFireCount'] = 1
if w.get('bgmPlaylist') is None:
    w.pop('bgmPlaylist', None)
if not any(e.get('folderId') for e in w['entries']):
    w.pop('entryFolders', None)   # two empty folders missing required fields; no entry uses them

json.dump(w, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('entries: always-sent', len(old_always), '->', len(new), '| merged away:', ', '.join(removed))
print('rules disabled (message-only):', ', '.join(disabled))
