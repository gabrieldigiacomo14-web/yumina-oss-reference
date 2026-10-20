# Texture and material generation for the character pipeline. Every image is synthesised here from noise and simple
# physical patterns (weave, leather grain, mail rings, brushed metal, hair strands) - no third-party texture is used.
# Body textures are painted in MakeHuman's UV layout with masks derived from the CC0 expression targets.
import os, math
import numpy as np
from PIL import Image
from scipy import ndimage
import bpy

RNG = np.random.default_rng(1247)

# ------------------------------------------------------------------ noise
def fbm(size, octaves=5, base=4, seed=0, tile=True):
    r = np.random.default_rng(seed); out = np.zeros((size, size)); amp = 1.0; tot = 0
    for o in range(octaves):
        n = base * 2 ** o; g = r.standard_normal((n, n))
        z = ndimage.zoom(np.tile(g, (3, 3)), size * 3 / (n * 3), order=3, mode="wrap")[size:2 * size, size:2 * size] if tile else ndimage.zoom(g, size / n, order=3)
        out += z[:size, :size] * amp; tot += amp; amp *= 0.5
    out /= tot; return (out - out.mean()) / (out.std() + 1e-9)

def normal_from_height(h, strength=2.0):
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength; gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    n = np.stack([-gx, gy, np.ones_like(h)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True); return (n * 0.5 + 0.5)

def save(path, arr, mode="RGB"):
    a = np.clip(arr, 0, 1); img = Image.fromarray((a * 255 + 0.5).astype(np.uint8), mode); img.save(path); return path

def srgb(c): return np.array(c, dtype=np.float64)

# ------------------------------------------------------------------ UV rasteriser for painting per-vertex attributes into the body layout
class UVRaster:
    def __init__(self, size, base, faces):
        self.size = size; S = size; tri = np.full((S, S), -1, np.int64); bary = np.zeros((S, S, 3)); T = []
        for f in faces:
            for k in range(1, len(f) - 1): T.append((f[0], f[k], f[k + 1]))
        self.T = T; uv = base.VT
        for ti, (a, b, c) in enumerate(T):
            p = np.array([uv[a[1]], uv[b[1]], uv[c[1]]]) * [S, S]; p[:, 1] = S - p[:, 1]
            x0, y0 = np.floor(p.min(0)).astype(int); x1, y1 = np.ceil(p.max(0)).astype(int)
            x0 = max(x0, 0); y0 = max(y0, 0); x1 = min(x1, S - 1); y1 = min(y1, S - 1)
            if x1 < x0 or y1 < y0: continue
            xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
            v0 = p[1] - p[0]; v1 = p[2] - p[0]; den = v0[0] * v1[1] - v1[0] * v0[1]
            if abs(den) < 1e-12: continue
            wx = xs - p[0, 0]; wy = ys - p[0, 1]; l1 = (wx * v1[1] - v1[0] * wy) / den; l2 = (v0[0] * wy - wx * v0[1]) / den; l0 = 1 - l1 - l2
            m = (l0 >= -0.002) & (l1 >= -0.002) & (l2 >= -0.002)
            yy, xx = np.nonzero(m); yy += y0; xx += x0; tri[yy, xx] = ti; bary[yy, xx] = np.stack([l0[m], l1[m], l2[m]], -1)
        self.tri = tri; self.bary = bary; self.cover = tri >= 0
        TV = np.array([[a[0], b[0], c[0]] for a, b, c in T]); self.TV = TV
        # nearest covered pixel for padding (avoids seams when mip-mapping)
        _, idx = ndimage.distance_transform_edt(~self.cover, return_indices=True); self.pad = idx

    def paint(self, values):  # values: per base-vertex (n,) or (n,k)
        v = np.asarray(values, dtype=np.float64); vv = v[self.TV]  # (T,3,...)
        t = np.where(self.tri >= 0, self.tri, 0); w = self.bary
        if vv.ndim == 2: out = (vv[t] * w).sum(-1)
        else: out = (vv[t] * w[..., None]).sum(-2)
        out = out[self.pad[0], self.pad[1]]; return out

# ------------------------------------------------------------------ Blender material helpers
_IMG = {}
def img(path, colorspace="sRGB"):
    if path in _IMG: return _IMG[path]
    im = bpy.data.images.load(path); im.colorspace_settings.name = colorspace; _IMG[path] = im; return im

def principled(name, color=None, base_img=None, normal_img=None, orm_img=None, rough=0.7, metal=0.0, scale=None, alpha_img=False, normal_strength=1.0, emission=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    uvn = None
    if scale:
        tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (scale, scale, 1); nt.links.new(tc.outputs["UV"], mp.inputs["Vector"]); uvn = mp.outputs["Vector"]
    def tex(image, cs="sRGB"):
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = img(image, cs) if isinstance(image, str) else image
        if uvn is not None: nt.links.new(uvn, t.inputs["Vector"])
        return t
    if base_img:
        t = tex(base_img); nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
        if alpha_img: nt.links.new(t.outputs["Alpha"], b.inputs["Alpha"]); m.blend_method = "CLIP" if hasattr(m, "blend_method") else None
    elif color is not None: b.inputs["Base Color"].default_value = (color[0], color[1], color[2], 1)
    if orm_img:
        t = tex(orm_img, "Non-Color"); sp = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(t.outputs["Color"], sp.inputs["Color"])
        nt.links.new(sp.outputs["Green"], b.inputs["Roughness"]); nt.links.new(sp.outputs["Blue"], b.inputs["Metallic"])
    else: b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if normal_img:
        t = tex(normal_img, "Non-Color"); nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = normal_strength
        nt.links.new(t.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    if emission: b.inputs["Emission Color"].default_value = (*emission, 1); b.inputs["Emission Strength"].default_value = 1.0
    return m

class Materials:
    def __init__(self, work, size, base, V, N, mask):
        self.work = work; self.size = size; self.base = base; self.V = V; self.N = N; self.mask = mask; self.cache = {}
        self.body_faces = [f for g, f in base.faces if g == "body"]
        self.ras = None

    def p(self, name): return os.path.join(self.work, name)

    def raster(self):
        if self.ras is None: self.ras = UVRaster(self.size, self.base, self.body_faces)
        return self.ras

    # -------------------------------------------------- skin: neutral albedo that the game tints to the character's skin tone
    def skin(self):
        if "skin" in self.cache: return self.cache["skin"]
        S = self.size; ras = self.raster(); V = self.V; M = self.mask
        y = V[:, 1]; x = V[:, 0]; z = V[:, 2]
        # regional tones (relative to a near-white base; the runtime multiplies by the skin colour)
        col = np.ones((len(V), 3)) * srgb([0.97, 0.93, 0.91])
        lips = M["lips"][:, None] ** 1.5; col = col * (1 - lips * 0.75) + lips * 0.75 * srgb([0.93, 0.74, 0.72])
        lids = M["lids"][:, None]; col = col * (1 - lids * 0.5) + lids * 0.5 * srgb([0.86, 0.78, 0.80])
        head_y = np.percentile(y, 99) - 2.4
        cheek = np.exp(-((np.abs(x) - 0.62) ** 2 + (y - (head_y + 0.15)) ** 2 + (z - 0.9) ** 2) / 0.07)[:, None]; col = col * (1 - cheek * 0.25) + cheek * 0.25 * srgb([1.0, 0.78, 0.76])
        nose = np.exp(-((x) ** 2 + (y - (head_y + 0.35)) ** 2 + (z - 1.35) ** 2) / 0.05)[:, None]; col = col * (1 - nose * 0.2) + nose * 0.2 * srgb([1.0, 0.8, 0.78])
        knuckle = (np.abs(x) > 5.2)[:, None] * 0.12; col = col * (1 - knuckle) + knuckle * srgb([1.0, 0.82, 0.8])
        alb = ras.paint(col)
        brow = self.brow_strokes(); alb *= (1 - 0.62 * brow[..., None] * np.array([1.0, 1.04, 1.08]))
        # mottling, freckles and pores
        n1 = fbm(S, 5, 8, 11); n2 = fbm(S, 3, 64, 12); fr = np.clip(fbm(S, 2, 96, 13) - 1.6, 0, 1)
        alb *= (1 + 0.02 * n1[..., None] + 0.012 * n2[..., None])[..., :]
        alb *= (1 - 0.12 * fr[..., None] * np.array([0.3, 0.55, 0.7]))
        # cavity shading: baked occlusion from the shaped mesh (ears, nostrils, eye sockets, folds)
        ao = self.bake_ao()
        if ao is not None: alb *= (0.72 + 0.28 * ao[..., None])
        save(self.p("skin_albedo.png"), alb)
        # micro normal: pores and fine wrinkles; roughness: oilier T-zone and lips
        h = fbm(S, 1, 384, 14)
        save(self.p("skin_normal.png"), normal_from_height(h, 0.35))
        rough = 0.6 - 0.1 * ras.paint(M["lips"]) - 0.05 * ras.paint(nose[:, 0])
        orm = np.stack([np.ones_like(rough), rough, np.zeros_like(rough)], -1); save(self.p("skin_orm.png"), orm)
        m = principled("skin", base_img=self.p("skin_albedo.png"), orm_img=self.p("skin_orm.png"))  # no micro normal map: lossy-compressed noise reads as lumps at game distance
        self.cache["skin"] = m; return m

    def bake_ao(self):
        """Ambient occlusion of the shaped body in its own UV layout, baked with Cycles."""
        try:
            from mathutils import Vector
            S = self.size; base = self.base
            sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 48; sc.cycles.device = "CPU"
            V = self.V; faces = self.body_faces
            me = bpy.data.meshes.new("aoBody"); me.from_pydata((V * 0.1).tolist(), [], [[c[0] for c in f] for f in faces]); me.update()
            uv = me.uv_layers.new(name="UVMap"); uv.data.foreach_set("uv", np.array([base.VT[c[1]] for f in faces for c in f], dtype=np.float32).ravel())
            for pgn in me.polygons: pgn.use_smooth = True
            ob = bpy.data.objects.new("aoBody", me); sc.collection.objects.link(ob)
            im = bpy.data.images.new("ao", S, S, float_buffer=True); mat = bpy.data.materials.new("aoMat"); mat.use_nodes = True
            t = mat.node_tree.nodes.new("ShaderNodeTexImage"); t.image = im; mat.node_tree.nodes.active = t; me.materials.append(mat)
            for o in sc.objects: o.select_set(False)
            ob.select_set(True); bpy.context.view_layer.objects.active = ob
            sc.render.bake.margin = 8; sc.world = sc.world or bpy.data.worlds.new("w")
            bpy.ops.object.bake(type="AO")
            a = np.array(im.pixels[:]).reshape(S, S, 4)[::-1, :, 0]
            bpy.data.objects.remove(ob, do_unlink=True); sc.render.engine = "BLENDER_EEVEE" if "BLENDER_EEVEE" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else sc.render.engine
            a = ndimage.gaussian_filter(a, 0.8); return np.clip(a, 0, 1) ** 0.8
        except Exception as e:
            print("AO bake skipped:", e); return None

    def brow_strokes(self):
        """Short angled hair strokes inside the brow mask, painted in UV space (returns coverage 0..1)."""
        S = self.size; ras = self.raster(); M = ras.paint(self.mask["brow"] ** 1.5); r = np.random.default_rng(71); a = np.zeros((S, S))
        ys, xs = np.nonzero(M > 0.3); n = int(len(ys) * 0.35)
        for i in (r.choice(len(ys), n, replace=False) if n else []):
            y0, x0 = ys[i], xs[i]; L = S / 150 * (0.6 + 0.8 * r.random()); ang = 0.15 + r.normal(0, 0.2)
            for t in np.linspace(0, 1, int(L) + 2):
                yy = int(y0 - math.sin(ang) * L * t); xx = int(x0 + math.cos(ang) * L * t)
                if 0 <= yy < S and 0 <= xx < S: a[yy, xx] = max(a[yy, xx], (1 - 0.5 * t) * min(1, M[y0, x0] * 1.4))
        return np.clip(ndimage.gaussian_filter(a, 0.55) * 1.6, 0, 1)

    def eye(self, path):
        return principled("eye", base_img=path, rough=0.08)

    def simple(self, kind):
        c = {"teeth": ([0.86, 0.83, 0.76], 0.35), "tongue": ([0.62, 0.32, 0.32], 0.45)}[kind]
        return principled(kind, color=c[0], rough=c[1])

    # -------------------------------------------------- tileable cloth, leather and metal (greyscale-ish; tinted in game by @tag)
    UVK = 1.0  # set by the caller: how many times denser this surface's UVs are than the body's (skirt / scalp shells)
    def tile(self, key, gen, scale, rough, metal=0.0, nstr=1.0, tag="@none"):
        name = key + " " + tag + ("" if self.UVK == 1.0 else " x%.0f" % self.UVK)
        if name in self.cache: return self.cache[name]
        S = 512
        if not os.path.exists(self.p(key + "_albedo.png")):
            alb, h, r = gen(S)
            save(self.p(key + "_albedo.png"), alb); save(self.p(key + "_normal.png"), normal_from_height(h, nstr * 3.0))
            orm = np.stack([np.ones((S, S)), np.clip(r, 0.03, 1), np.full((S, S), metal)], -1); save(self.p(key + "_orm.png"), orm)
        keep_normal = key in ("mail", "plate")  # cloth and leather read fine without one; their compressed noise looked like fuzz
        m = principled(name, base_img=self.p(key + "_albedo.png"), normal_img=self.p(key + "_normal.png") if keep_normal else None, orm_img=self.p(key + "_orm.png"), scale=scale * self.UVK)
        self.cache[name] = m; return m

    def fabric(self, kind, tag):
        def weave(S, fine, tone):
            yy, xx = np.mgrid[0:S, 0:S] / S * 2 * math.pi * fine
            warp = np.sin(xx) * 0.5 + 0.5; weft = np.sin(yy) * 0.5 + 0.5; over = (np.sin(xx / 2) * np.sin(yy / 2) > 0)
            h = np.where(over, warp, weft) * 0.7 + fbm(S, 3, 32, sum(map(ord, kind))) * 0.15 + fbm(S, 2, 8, 7) * 0.15
            lum = tone * (0.93 + 0.07 * h) * (1 + 0.05 * fbm(S, 4, 4, 3))
            return np.stack([lum] * 3, -1) * srgb([1.0, 0.98, 0.95]), h, 0.82 + 0.1 * fbm(S, 2, 8, 5) * 0.2
        spec = {"linen": (64, 0.86, 9), "wool": (40, 0.78, 7), "robe": (72, 0.82, 8), "sash": (48, 0.84, 12)}[kind]
        return self.tile(kind, lambda S: weave(S, spec[0], spec[1]), spec[2], 0.85, nstr=0.22, tag=tag)

    def leather(self, kind, tag):
        def gen(S):
            r = np.random.default_rng(sum(map(ord, kind))); seeds = np.ones((S, S), bool); pts = (r.random((900, 2)) * S).astype(int); seeds[pts[:, 1], pts[:, 0]] = False
            d = ndimage.distance_transform_edt(np.tile(seeds, (3, 3)))[S:2 * S, S:2 * S]  # wrapped Voronoi distance = the grain cells
            cell = d / d.max(); h = ndimage.gaussian_filter(-cell * 0.5 + fbm(S, 4, 6, 21) * 0.3, 1.2)
            scr = np.clip(fbm(S, 2, 3, 23) * fbm(S, 1, 48, 24) - 1.2, 0, 1)
            if tag == "@none": base = srgb([0.30, 0.19, 0.12]) if kind != "belt" else srgb([0.22, 0.14, 0.09])
            else: base = srgb([0.62, 0.58, 0.55])
            lum = (0.9 + 0.1 * (1 - cell)) * (1 + 0.06 * fbm(S, 4, 3, 25))
            alb = base * lum[..., None] * (1 + 0.18 * ndimage.gaussian_filter(scr, 2)[..., None]); return alb, h, 0.55 + 0.2 * cell + 0.1 * scr
        key = "leather_dark" if kind == "belt" else ("leather_brown" if tag == "@none" else "leather_tint"); return self.tile(key, gen, 5 if kind != "belt" else 10, 0.6, nstr=0.3, tag=tag)

    def mail(self):
        def gen(S):
            n = 16; c = S / n; yy, xx = np.mgrid[0:S, 0:S]; h = np.zeros((S, S))
            for oy in (0, 0.5):
                cx = (xx / c + oy) % 1 - 0.5; cy = (yy / c) % 1 - 0.5; rr = np.sqrt(cx * cx + cy * cy); ring = np.exp(-((rr - 0.33) / 0.09) ** 2); h = np.maximum(h, ring)
            alb = np.stack([0.46 + 0.3 * h] * 3, -1) * srgb([0.95, 0.96, 1.0]) * (1 + 0.08 * fbm(S, 3, 8, 31))[..., None]
            return alb * (0.35 + 0.65 * h[..., None]), h, 0.42 - 0.1 * h
        return self.tile("mail", gen, 10, 0.4, metal=0.9, nstr=1.2, tag="@none")

    def plate(self, tag):
        def gen(S):
            streak = ndimage.gaussian_filter1d(np.random.default_rng(41).standard_normal((S, S)), 40, axis=1, mode="wrap"); streak /= streak.std()
            dents = fbm(S, 3, 3, 42)
            alb = np.stack([0.72 + 0.04 * streak + 0.05 * dents] * 3, -1) * srgb([0.97, 0.97, 1.0])
            return alb, dents * 0.4 + streak * 0.05, 0.3 + 0.06 * streak + 0.08 * np.clip(fbm(S, 2, 6, 43), 0, 2)
        return self.tile("plate", gen, 4, 0.32, metal=1.0, nstr=0.6, tag=tag)

    # -------------------------------------------------- hair, brows, beard
    def hair(self):
        if "hair" in self.cache: return self.cache["hair"]
        S = 512; r = np.random.default_rng(51); g = r.standard_normal((S, S)); strands = ndimage.gaussian_filter1d(g, 18, axis=0, mode="wrap"); strands = ndimage.gaussian_filter1d(strands, 0.7, axis=1, mode="wrap"); strands /= strands.std()
        lum = 0.86 + 0.09 * strands + 0.04 * fbm(S, 3, 4, 52); alb = np.stack([lum] * 3, -1)
        save(self.p("hair_albedo.png"), alb); save(self.p("hair_normal.png"), normal_from_height(strands * 0.5, 2.5))
        orm = np.stack([np.ones((S, S)), 0.42 + 0.08 * strands * 0.3, np.zeros((S, S))], -1); save(self.p("hair_orm.png"), orm)
        m = principled("hair", base_img=self.p("hair_albedo.png"), orm_img=self.p("hair_orm.png"), scale=5)
        self.cache["hair"] = m; return m

    def strokes(self, name, mask, density, length, angle, thick, alpha_floor=0.0):
        """Hair strokes painted inside a body-UV mask, with alpha: brows and beard."""
        S = self.size; ras = self.raster(); M = ras.paint(mask); r = np.random.default_rng(len(name)); a = np.zeros((S, S))
        ys, xs = np.nonzero(M > 0.25); n = int(len(ys) * density)
        if n:
            pick = r.choice(len(ys), n, replace=False)
            for i in pick:
                y0, x0 = ys[i], xs[i]; ang = angle + r.normal(0, 0.25); L = length * (0.6 + 0.8 * r.random())
                for t in np.linspace(0, 1, int(L) + 2):
                    yy = int(y0 - math.sin(ang) * L * t); xx = int(x0 + math.cos(ang) * L * t)
                    if 0 <= yy < S and 0 <= xx < S: a[yy, xx] = max(a[yy, xx], (1 - t * 0.6) * M[y0, x0])
        a = ndimage.gaussian_filter(a, thick); a = np.clip(a * 1.1, 0, 0.85) * np.clip(M * 1.2, 0, 1) ** 1.5 + alpha_floor * M
        lum = 0.55 + 0.1 * fbm(S, 2, 64, 61)
        rgba = np.stack([lum, lum, lum, a], -1); save(self.p(name + ".png"), rgba, "RGBA")
        m = principled(name, base_img=self.p(name + ".png"), rough=0.6, alpha_img=True); return m

    def brows(self): return self.strokes("brow_hair", self.mask["brow"] ** 2, 0.18, self.size / 130, 0.2, 0.4)
    def beard(self): return self.strokes("beard_hair", np.clip(self.mask["jaw"] * 1.1 - self.mask["lips"] * 1.5, 0, 1) ** 2, 0.5, self.size / 180, -1.4, 0.4, 0.05)


def hair_extra(ob, kind, Vm, to_b, skel):
    """Longer hairstyles: hanging strands generated from the back of the scalp layer (kept simple and light)."""
    import bmesh
    from mathutils import Vector
    head = Vector(to_b(skel.head(Vm, "head"))); bm = bmesh.new(); bm.from_mesh(ob.data); uvl = bm.loops.layers.uv.active
    rr = np.random.default_rng({"long": 1, "braid": 2, "tail": 3, "knot": 4}[kind]); new_faces = []
    if kind in ("long", "braid"):
        n = 22 if kind == "long" else 2
        for i in range(n):
            a = math.pi * (0.15 + 0.7 * i / max(1, n - 1)) if kind == "long" else math.pi * (0.4 + 0.2 * i)
            top = head + Vector((math.cos(a) * 0.095, math.sin(a) * 0.075 + 0.02, 0.07)); L = (0.32 if kind == "long" else 0.4) * (0.85 + 0.3 * rr.random()); w = 0.045 if kind == "long" else 0.03
            side = Vector((-math.sin(a), math.cos(a), 0)) * w; out = Vector((math.cos(a), math.sin(a), 0)) * 0.025; prev = None
            for k in range(6):
                t = k / 5; p = top + Vector((0, 0, -L * t)) + out * t; v1 = bm.verts.new(p - side * (1 - t * 0.5)); v2 = bm.verts.new(p + side * (1 - t * 0.5))
                if prev: f = bm.faces.new((prev[0], prev[1], v2, v1)); new_faces.append(f)
                prev = (v1, v2)
    else:
        c = head + (Vector((0, 0.11, 0.0)) if kind == "tail" else Vector((0, 0.02, 0.17)))
        bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=0.045, matrix=__import__("mathutils").Matrix.Translation(c))
        if kind == "tail":
            prev = None
            for k in range(6):
                t = k / 5; p = c + Vector((0, 0.03 + 0.03 * t, -0.28 * t)); v1 = bm.verts.new(p + Vector((-0.03, 0, 0)) * (1 - 0.6 * t)); v2 = bm.verts.new(p + Vector((0.03, 0, 0)) * (1 - 0.6 * t))
                if prev: new_faces.append(bm.faces.new((prev[0], prev[1], v2, v1)))
                prev = (v1, v2)
    for f in new_faces:
        for i, l in enumerate(f.loops): l[uvl].uv = (0.1 * i, 0.5)
    bm.to_mesh(ob.data); bm.free()
    vg = ob.vertex_groups.get("head") or ob.vertex_groups.new(name="head")
    for v in ob.data.vertices:
        if not v.groups: vg.add([v.index], 1.0, "REPLACE")
