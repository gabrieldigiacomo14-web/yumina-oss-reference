# Hair as alpha-tested strand cards grown over the scalp, plus an opaque cap so no skin shows between cards.
# Cards are kept outside an ellipsoid fitted to the head, fall with gravity once they leave the scalp, and taper to the tip.
import math
import numpy as np
from PIL import Image
from scipy import ndimage
import bpy

def strand_texture(path, seed=7, W=256, H=512):
    """Strands with tapered, staggered ends: RGB luminance (tinted in game) and alpha coverage."""
    r = np.random.default_rng(seed); a = np.zeros((H, W)); lum = np.zeros((H, W))
    for i in range(int(W * 2.2)):
        x = r.uniform(0, W); L = r.uniform(0.55, 1.0) * H; w = r.uniform(0.6, 1.6); wav = r.uniform(0, 3); ph = r.uniform(0, 6.28); shade = r.uniform(0.75, 1.15)
        ys = np.arange(int(L)); xs = x + np.sin(ys / H * wav * 3 + ph) * 2.5
        taper = np.clip((L - ys) / (0.25 * L), 0, 1) ** 0.7
        for dx in (-1, 0, 1):
            xi = np.clip((xs + dx).astype(int), 0, W - 1); wt = np.clip(w - abs(dx) * 0.9, 0, 1) * taper
            a[ys, xi] = np.maximum(a[ys, xi], wt); lum[ys, xi] = np.maximum(lum[ys, xi], wt * shade)
    a = ndimage.gaussian_filter(a, 0.6); a = np.clip(a * 1.6, 0, 1)
    root = np.linspace(0.72, 1.0, H)[:, None] ** 0.6  # roots slightly darker
    l = np.clip(0.75 * root + 0.25 * lum / (lum.max() + 1e-6), 0, 1) * 0.95
    rgba = np.stack([l, l, l, a], -1); Image.fromarray((rgba * 255).astype(np.uint8), "RGBA").save(path); return path

def card_material(name, tex_path):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(tex_path); nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    gt = nt.nodes.new("ShaderNodeMath"); gt.operation = "GREATER_THAN"; gt.inputs[1].default_value = 0.42  # exported as alphaMode MASK, cutoff 0.42
    nt.links.new(t.outputs["Alpha"], gt.inputs[0]); nt.links.new(gt.outputs[0], b.inputs["Alpha"])
    b.inputs["Roughness"].default_value = 0.48; m.use_backface_culling = False; return m

class Head:
    def __init__(self, pts):
        self.c = (pts.max(0) + pts.min(0)) / 2; self.r = (pts.max(0) - pts.min(0)) / 2
        self.c[2] -= self.r[2] * 0.15; self.r[2] *= 1.15  # the scalp is the top of the head: extend the ellipsoid down
    def push(self, p, k=1.03):
        d = (p - self.c) / self.r; e = np.linalg.norm(d)
        return self.c + d / e * k * self.r if e < k else p
    def normal(self, p):
        d = (p - self.c) / (self.r ** 2); return d / np.linalg.norm(d)

STYLES = {  # n cards, segments, length range (m), width, droop toward gravity, comb direction weight, randomness
    "short_crop": dict(n=420, seg=2, L=(0.03, 0.045), w=0.026, droop=0.3, comb=0.9, rnd=0.12, lift=1.018, out=0.04, loft=0.01),
    "messy_layered": dict(n=400, seg=3, L=(0.05, 0.085), w=0.03, droop=0.45, comb=0.7, rnd=0.35, lift=1.02, out=0.06, loft=0.04),
    "long_straight": dict(n=420, seg=8, L=(0.2, 0.36), w=0.034, droop=1.0, comb=0.6, rnd=0.06, lift=1.025, loft=0.03),
    "ponytail": dict(n=260, seg=3, L=(0.06, 0.1), w=0.024, droop=0.1, comb=1.0, rnd=0.08, lift=1.025, tail=(0.3, 0.07)),
    "braided": dict(n=260, seg=3, L=(0.06, 0.1), w=0.024, droop=0.1, comb=1.0, rnd=0.06, lift=1.025, tail=(0.42, 0.045)),
    "topknot": dict(n=240, seg=3, L=(0.06, 0.09), w=0.024, droop=-0.2, comb=1.0, rnd=0.06, lift=1.025, knot=True),
}

def build_style(style, scalp_pts, scalp_nrm, cap_obj, mat_cap, mat_cards, seed=3):
    """Returns a mesh object: the cap (copy of cap_obj geometry) + cards for this style."""
    S = STYLES[style]; r = np.random.default_rng(seed + len(style)); head = Head(scalp_pts)
    P = []; F = []; UV = []
    back = np.array([0, 1.0, 0]); up = np.array([0, 0, 1.0]); grav = -up
    tie = head.c + np.array([0, head.r[1] * 1.02, head.r[2] * 0.35]) if "tail" in S else head.c + np.array([0, head.r[1] * 0.2, head.r[2] * 1.12])
    idx = r.choice(len(scalp_pts), S["n"], replace=len(scalp_pts) < S["n"])
    def strip(pts, width, u0):
        base = len(P); k = len(pts)
        for i, p in enumerate(pts):
            d = pts[min(i + 1, k - 1)] - pts[max(i - 1, 0)]; d /= (np.linalg.norm(d) + 1e-9); n = head.normal(p); side = np.cross(d, n); side /= (np.linalg.norm(side) + 1e-9)
            wd = width * (1 - 0.55 * i / (k - 1)); P.append(p - side * wd / 2); P.append(p + side * wd / 2); v = i / (k - 1); UV.append((u0, 1 - v)); UV.append((u0 + 0.25, 1 - v))
        for i in range(k - 1): F.append((base + 2 * i, base + 2 * i + 1, base + 2 * i + 3, base + 2 * i + 2))
    for j in idx:
        p0 = scalp_pts[j]; n = scalp_nrm[j]; L = r.uniform(*S["L"]); seg = S["seg"]
        if "tail" in S or S.get("knot"):
            comb = tie - p0; comb -= n * np.dot(comb, n)
        else:
            comb = back * 0.7 + grav * 0.3; comb = comb - n * np.dot(comb, n)
            if p0[1] < head.c[1] - head.r[1] * 0.5 and p0[2] > head.c[2]: comb = comb * 0.5 + (grav - n * np.dot(grav, n)) * 0.1  # fringe falls forward-down
        comb /= (np.linalg.norm(comb) + 1e-9); rnd = r.normal(0, 1, 3); rnd -= n * np.dot(rnd, n)
        d = n * S.get("out", 0.12) + comb * S["comb"] + rnd * S["rnd"]; d /= np.linalg.norm(d); lift = S["lift"] + r.uniform(0, S.get("loft", 0.02))
        pts = [head.push(p0 + n * 0.004, lift)]
        for k in range(seg):
            p = pts[-1]; hn = head.normal(p); below = p[2] < head.c[2] - head.r[2] * 0.35
            if below and S["droop"] > 0.5: d = d * 0.3 + grav * 0.7 + hn * 0.05  # long hair leaves the head and falls
            else:
                want = comb * S["comb"] + grav * S["droop"] * 0.6 + rnd * S["rnd"]; want -= hn * np.dot(want, hn); d = d * 0.4 + want * 0.6
            d /= np.linalg.norm(d); q = p + d * L / seg
            if not below or S["droop"] <= 0.5:  # hug the scalp: back onto the ellipsoid shell at this strand's loft
                e = (q - head.c) / head.r; q = head.c + e / np.linalg.norm(e) * lift * head.r
            else: q = head.push(q, lift)
            pts.append(q)
        strip(np.array(pts), S["w"] * r.uniform(0.8, 1.2), r.integers(0, 4) * 0.25)
    if "tail" in S:  # the tail hanging from the tie
        TL, TW = S["tail"]
        for i in range(36):
            a = i / 36 * 2 * math.pi; o = np.array([math.cos(a) * 0.012, 0, math.sin(a) * 0.012])
            pts = [tie + o + np.array([0, 0.01, 0]) + np.array([0, 0.01 * t, -TL * t]) * (1 + 0.1 * r.normal()) for t in np.linspace(0, 1, 7)]
            if style == "braided": pts = [p + np.array([math.sin(t * 18) * 0.006, 0, 0]) for p, t in zip(pts, np.linspace(0, 1, 7))]
            strip(np.array(pts), TW, r.integers(0, 4) * 0.25)
    if S.get("knot"):
        for i in range(48):
            a = i / 48 * 2 * math.pi; b = r.uniform(-0.5, 0.5); c = tie + np.array([math.cos(a) * 0.035, math.sin(a) * 0.035, b * 0.02])
            pts = [c + np.array([math.cos(a + t * 2.4) * 0.03, math.sin(a + t * 2.4) * 0.03, t * 0.03]) for t in np.linspace(0, 1, 4)]
            strip(np.array(pts), 0.03, r.integers(0, 4) * 0.25)
    return assemble("hair_" + style, P, F, UV, cap_obj, mat_cap, mat_cards)

def build_beard(pts, nrm, base_obj, mat_base, mat_cards, n=520, seed=11, name="beard_full", length=0.08):
    """A full beard: short cards on the cheeks and upper lip, longer ones from the jaw and chin falling with gravity,
    over the painted beard layer (base_obj) so no skin shows between them."""
    r = np.random.default_rng(seed); P = []; F = []; UV = []
    up = np.array([0, 0, 1.0]); fwd = np.array([0, -1.0, 0]); zlo, zhi = pts[:, 2].min(), pts[:, 2].max()
    def strip(ps, width, u0):
        base = len(P); k = len(ps)
        for i, p in enumerate(ps):
            d = ps[min(i + 1, k - 1)] - ps[max(i - 1, 0)]; d /= (np.linalg.norm(d) + 1e-9); side = np.cross(d, fwd if abs(np.dot(d, fwd)) < 0.9 else up); side /= (np.linalg.norm(side) + 1e-9)
            wd = width * (1 - 0.6 * i / (k - 1)); P.append(p - side * wd / 2); P.append(p + side * wd / 2); v = i / (k - 1); UV.append((u0, 1 - v)); UV.append((u0 + 0.25, 1 - v))
        for i in range(k - 1): F.append((base + 2 * i, base + 2 * i + 1, base + 2 * i + 3, base + 2 * i + 2))
    for j in r.choice(len(pts), n, replace=len(pts) < n):
        p0 = pts[j]; nn = nrm[j]; t = (p0[2] - zlo) / max(zhi - zlo, 1e-6)  # 0 at the chin, 1 at the cheekbones
        L = length * (1 - 0.75 * t) * r.uniform(0.75, 1.25); seg = 4
        d = nn * 0.5 - up * (0.9 - 0.3 * t) + fwd * 0.15 + r.normal(0, 0.12, 3); d /= np.linalg.norm(d)
        if t > 0.42 and abs(p0[0]) < 0.05:  # upper lip and mouth corners: a short moustache swept out to the sides, mouth left clear
            if abs(p0[0]) < 0.014: continue
            L = 0.03 * r.uniform(0.8, 1.2); d = np.array([np.sign(p0[0]) * 0.8, -0.2, 0]) - up * 0.6 + nn * 0.3; d /= np.linalg.norm(d)
        ps = [p0 + nn * 0.003]
        for k in range(seg):
            q = ps[-1] + d * L / seg; out = np.dot(q - p0, nn)
            if out < 0.004: q = q + nn * (0.004 - out)  # never back into the face
            ps.append(q); d = d * 0.6 + (-up) * 0.4; d /= np.linalg.norm(d)
        strip(np.array(ps), 0.014 * r.uniform(0.8, 1.25), r.integers(0, 4) * 0.25)
    return assemble(name, P, F, UV, base_obj, mat_base, mat_cards)

def assemble(name, P, F, UV, cap_obj, mat_cap, mat_cards):
    """The base layer (a copy of cap_obj) plus the cards, all weighted to the head."""
    me = cap_obj.data.copy(); me.name = name; ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    for vg in cap_obj.vertex_groups: ob.vertex_groups.new(name=vg.name)
    hg = ob.vertex_groups.get("head") or ob.vertex_groups.new(name="head")
    for v in me.vertices: hg.add([v.index], 1.0, "REPLACE")
    for g in list(ob.vertex_groups):
        if g.name != "head": ob.vertex_groups.remove(g)
    import bmesh
    bm = bmesh.new(); bm.from_mesh(me); uvl = bm.loops.layers.uv.active or bm.loops.layers.uv.new("UVMap"); off = len(bm.verts)
    vs = [bm.verts.new(tuple(p)) for p in P]; bm.verts.ensure_lookup_table()
    me.materials.clear(); me.materials.append(mat_cap); me.materials.append(mat_cards)
    for f in F:
        try: face = bm.faces.new([vs[i] for i in f])
        except ValueError: continue
        face.material_index = 1; face.smooth = True
        for l, i in zip(face.loops, f): l[uvl].uv = UV[i]
    bm.to_mesh(me); bm.free()
    for v in me.vertices[off:]: hg.add([v.index], 1.0, "REPLACE")
    ob.parent = cap_obj.parent
    return ob
