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
w['version'] = '21.5.2'
# one line in the response format: a speaker's name on its own line, so the Chronicle can draw a speaker card
fmt = [e for e in w['entries'] if e.get('id') == 'response-format']
assert len(fmt) == 1
old = 'After the header, write the narrative.'
line = 'When a named character speaks, put @ and their name alone on the line before their words (e.g. @Marta Vell), then a blank line after.'
if line not in fmt[0]['content']:
    assert fmt[0]['content'].count(old) == 1
    fmt[0]['content'] = fmt[0]['content'].replace(old, old + '\n\n' + line)
json.dump(w, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=None, separators=(',', ':'))
print('ok', dst, os.path.getsize(dst), 'bytes;', ', '.join('%s %d' % (k, len(v)) for k, v in files.items()))
