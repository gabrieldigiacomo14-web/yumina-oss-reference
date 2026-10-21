"""Writes ui/bc-art.js: a map of art keys to hosted image URLs (no embedded base64).

usage: mkart.py <art-dir> <out.js> <base-url> [assets.json]
  art-dir   folder of <key>.jpg files (cards/black-clover/art)
  base-url  where those files are served from, ending in "/"; pin it to a commit
            so the card keeps working, e.g.
            https://raw.githubusercontent.com/<owner>/<repo>/<commit-sha>/cards/black-clover/art/

Yumina rejects new inline data: URIs on save; hosted https:// URLs are allowed.
assets.json (optional) maps a key to the "@asset:<id>" ref of the same image uploaded to the Yumina
Library; those keys use the Yumina CDN, any key not listed keeps its hosted https:// URL.
"""
import os, sys, json
art, out, base = sys.argv[1:4]
refs = json.load(open(sys.argv[4])) if len(sys.argv) > 4 else {}
assert base.endswith('/'), 'base url must end with /'
keys = sorted(f[:-4] for f in os.listdir(art) if f.endswith('.jpg'))
lines = ["/* Painted art cropped from the creator's own interface mockups, hosted as image files. Not sent to the AI. */",
         "export var BC_IMG = {"]
for k in keys:
    lines.append('  %s: %s,' % (k, json.dumps(refs.get(k) or (base + k + '.jpg'))))
lines.append("};")
open(out, 'w').write('\n'.join(lines) + '\n')
print('images', len(keys), '| via @asset:', sum(1 for k in keys if refs.get(k)))
