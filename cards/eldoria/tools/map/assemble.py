"""Builds el-cartography.js: Eldoria's map data and rules, plus the shared engine from Black Clover's bc-cartography.js.
Usage: python3 -I assemble.py <bc-cartography.js> <out el-cartography.js>"""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
bc = open(sys.argv[1], encoding='utf-8').read().split('\n')
def lines(a, b, starts):
    seg = bc[a - 1:b]
    assert seg[0].startswith(starts), (a, seg[0][:60])
    return '\n'.join(seg)
def P(n): return open(os.path.join(HERE, n), encoding='utf-8').read()
engine1 = lines(97, 148, '/* ---------- deterministic randomness')      # noise, coordinates, Voronoi
engine2 = lines(258, 312, '/* ---------- spatial lookup')                # grid, nearest cells, elevation raster, heap
routes = lines(357, 397, '/* ---------- routes')                         # roads by path-finding, discovery
render = lines(399, 480, '/* ---------- render a view')                  # terrain renderer
labels = lines(493, 500, 'export function kingdomLabels')
routes = routes.replace('if (best[2] < 160) add', 'if (best[2] < 160 * KS) add')
def rep(text, old, new):
    assert text.count(old) == 1, old[:60]
    return text.replace(old, new)
render = rep(render, '* kmPerPx) * 1.3, (view.cy', '* kmPerPx) * 1.3 / KS, (view.cy')
render = rep(render, 'if (outside) { e = 0; isW = true; }', 'if (outside) { isW = true; } // beyond the frame the sea continues as it is at the frame\'s edge')
render = rep(render, '* kmPerPx) * 1.9, 2)', '* kmPerPx) * 1.9 / KS, 2)')
render = rep(render, 'NOISE.detail.fbm(x_ * 0.9, y_ * 0.9, 3)', 'NOISE.detail.fbm(x_ * 0.9 / KS, y_ * 0.9 / KS, 3)')
render = rep(render, 'xx * kmPerPx * 0.35 + 3.1, yy * kmPerPx * 0.35 + 7.7', 'xx * kmPerPx * 0.35 / KS + 3.1, yy * kmPerPx * 0.35 / KS + 7.7')
i0 = render.index('    var bs = wat[i] ? 0 : barrierStrength(x_, y_);')
i1 = render.index('    if (fogA)')
render = render[:i0] + ('    var bs = wat[i] ? 0 : umbralHaze(x_, y_); // the Reach\'s blight lies over its land\n'
    '    if (bs > 0) { var sw = NOISE.detail.fbm(x_ * 0.09 / KS + y_ * 0.03 / KS, y_ * 0.09 / KS - x_ * 0.04 / KS, 3), a2 = Math.min(0.62, bs * (0.4 + 0.5 * sw)); r = r * (1 - a2) + 46 * a2; gch = gch * (1 - a2) + 24 * a2; b = b * (1 - a2) + 66 * a2; }\n') + render[i1:]
out = '\n'.join([P('head.js'), P('places.js'), P('features.js'), P('biomes.js'), engine1, P('land.js'), engine2, P('politics.js'), routes, render, P('tail.js'), labels, ''])
open(sys.argv[2], 'w', encoding='utf-8').write(out)
print('ok', len(out))
