"""Builds the Barbarian card: prompt optimization (prompts/apply.py) + the v22 interface.
Usage: python3 -I build.py <original card json> <ui dir> <out json>"""
import sys, os, json, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
src, ui, dst = sys.argv[1], sys.argv[2], sys.argv[3]
tmp = dst + '.prompts.json'
subprocess.check_call([sys.executable, '-I', os.path.join(HERE, 'prompts', 'apply.py'), src, tmp])
w = json.load(open(tmp, encoding='utf-8')); os.remove(tmp)
rc = w['rootComponent']
files = {n: open(os.path.join(ui, n), encoding='utf-8').read() for n in sorted(os.listdir(ui))}
assert list(files) == ['index.tsx'] and rc['entryFile'] == 'index.tsx'
rc['files'] = files
rc.pop('compiled', None)   # belongs to the old files; Yumina recompiles when the source hash changes
w['version'] = '22.0.0'
json.dump(w, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('ok', dst, os.path.getsize(dst), 'bytes')
