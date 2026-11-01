"""Builds the Eldoria card: the original world JSON with the rebuilt interface files.
Usage: python3 -I build.py <original card json> <ui dir> <out json>"""
import sys, os, json
src, ui, dst = sys.argv[1], sys.argv[2], sys.argv[3]
w = json.load(open(src, encoding='utf-8'))
rc = w['rootComponent']
files = {}
for n in sorted(os.listdir(ui)):
    files[n] = open(os.path.join(ui, n), encoding='utf-8').read()
assert 'index.tsx' in files and rc['entryFile'] == 'index.tsx'
rc['files'] = files
# the stored compiled copy belongs to the old files; Yumina would ignore it (its source hash no longer matches) and recompile
rc.pop('compiled', None)
w['version'] = '21.6.0'
# one line in the response format: a speaker's name on its own line, so the Chronicle can draw a speaker card
fmt = [e for e in w['entries'] if e.get('id') == 'response-format']
assert len(fmt) == 1
old = 'After the header, write the narrative.'
line = 'When a named character speaks, put @ and their name alone on the line before their words (e.g. @Marta Vell), then a blank line after.'
if line not in fmt[0]['content']:
    assert fmt[0]['content'].count(old) == 1
    fmt[0]['content'] = fmt[0]['content'].replace(old, old + '\n\n' + line)
# ---- the Pack (v21.6): items gain a placement, dropped things stay where they were left
INV_LINE = (" Items may carry placement {kind:'body'|'container'|'loose'|'world'}; the Gear screen sets it, and new items are stowed by the"
            " interface, so never write placement yourself. In combat only what is in hand, worn, or in a quick or ready pocket can be used at once;"
            " anything deeper takes time to dig out.")
for var in w['variables']:
    if var['id'] == 'inventory' and INV_LINE not in (var.get('behaviorRules') or ''):
        var['behaviorRules'] = (var.get('behaviorRules') or '') + INV_LINE
if not any(var['id'] == 'ground-items' for var in w['variables']):
    w['variables'].append({'id': 'ground-items', 'name': 'Left Behind', 'type': 'json', 'category': 'inventory',
        'description': 'Items the player dropped, by place.', 'defaultValue': [],
        'behaviorRules': "Items the player dropped, each with placement {kind:'world',location}. They stay at that location and do not follow the player; anyone there may find or take them. The Gear screen adds and removes these."})

json.dump(w, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=None, separators=(',', ':'))
print('ok', dst, os.path.getsize(dst), 'bytes;', ', '.join('%s %d' % (k, len(v)) for k, v in files.items()))
