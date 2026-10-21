"""Writes ui/bc-art.js: a map of art keys to hosted image URLs (no embedded base64).

usage: mkart.py <art-dir> <out.js> <base-url>
  art-dir   folder of <key>.jpg files (cards/black-clover/art)
  base-url  where those files are served from, ending in "/"; pin it to a commit
            so the card keeps working, e.g.
            https://raw.githubusercontent.com/<owner>/<repo>/<commit-sha>/cards/black-clover/art/

Yumina rejects new inline data: URIs on save; hosted https:// URLs are allowed.
A value may also be an "@asset:<id>" ref if you upload the images in the Yumina Library.
"""
import os, sys, json
art, out, base = sys.argv[1:4]
assert base.endswith('/'), 'base url must end with /'
keys = sorted(f[:-4] for f in os.listdir(art) if f.endswith('.jpg'))
lines = ["/* Painted art cropped from the creator's own interface mockups, hosted as image files. Not sent to the AI. */",
         "export var BC_IMG = {"]
for k in keys:
    lines.append('  %s: %s,' % (k, json.dumps(base + k + '.jpg')))
lines.append("};")
open(out, 'w').write('\n'.join(lines) + '\n')
print('images', len(keys))
