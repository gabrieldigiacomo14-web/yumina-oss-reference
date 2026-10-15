# MakeHuman (hm08) asset reader: base mesh, morph targets, skeleton joints, skin weights, proxy fitting.
# Pure numpy, no Blender. All MakeHuman assets used here are CC0 1.0 (see tools/character/README.md).
import json, os, re
import numpy as np

class Base:
    """The hm08 base mesh: vertices, texture coordinates and faces grouped by name."""
    def __init__(self, root):
        self.root = root
        V, VT, faces = [], [], []
        group = None
        for line in open(os.path.join(root, "3dobjs/base.obj")):
            if line.startswith("v "): V.append([float(x) for x in line.split()[1:4]])
            elif line.startswith("vt "): VT.append([float(x) for x in line.split()[1:3]])
            elif line.startswith("g "): group = line.split()[1]
            elif line.startswith("f "):
                corners = []
                for t in line.split()[1:]:
                    p = t.split("/"); corners.append((int(p[0]) - 1, int(p[1]) - 1 if len(p) > 1 and p[1] else -1))
                faces.append((group, corners))
        self.V = np.array(V, dtype=np.float64); self.VT = np.array(VT, dtype=np.float64); self.faces = faces
        self.groups = {}
        for g, f in faces: self.groups.setdefault(g, set()).update(c[0] for c in f)

    def target(self, rel):
        """Sparse morph target -> (indices, deltas)."""
        idx, d = [], []
        for line in open(os.path.join(self.root, "targets", rel)):
            if not line.strip() or line[0] == "#": continue
            p = line.split(); idx.append(int(p[0])); d.append([float(p[1]), float(p[2]), float(p[3])])
        return np.array(idx, dtype=np.int64), np.array(d, dtype=np.float64).reshape(-1, 3)

    def delta(self, recipe):
        """Dense displacement for a list of (target path, weight)."""
        out = np.zeros_like(self.V)
        for rel, w in recipe:
            if not w or not os.path.exists(os.path.join(self.root, "targets", rel)): continue
            i, d = self.target(rel); out[i] += d * w
        return out


def macro(gender=1.0, muscle=0.5, weight=0.5, age="young", race="caucasian", proportions=0.6, height=0.0):
    """MakeHuman's macro modifiers as a target recipe. gender 0 female .. 1 male; muscle and weight 0..1 (0.5 average)."""
    def tri(v):  # slider -> weights over min/average/max
        if v < 0.5: return {"min": (0.5 - v) * 2, "average": v * 2, "max": 0.0}
        return {"min": 0.0, "average": (1 - v) * 2, "max": (v - 0.5) * 2}
    g = {"female": 1 - gender, "male": gender}; m = tri(muscle); wt = tri(weight); rec = []
    for gn, gw in g.items():
        if gw <= 0: continue
        rec.append(("macrodetails/%s-%s-%s.target" % (race, gn, age), gw))
        for mn, mw in m.items():
            for wn, ww in wt.items():
                w = gw * mw * ww
                if w <= 1e-6: continue
                rec.append(("macrodetails/universal-%s-%s-%smuscle-%sweight.target" % (gn, age, mn, wn), w))
                if proportions: rec.append(("macrodetails/proportions/%s-%s-%smuscle-%sweight-idealproportions.target" % (gn, age, mn, wn), w * proportions))
                if height > 0: rec.append(("macrodetails/height/%s-%s-%smuscle-%sweight-maxheight.target" % (gn, age, mn, wn), w * height))
                if height < 0: rec.append(("macrodetails/height/%s-%s-%smuscle-%sweight-minheight.target" % (gn, age, mn, wn), w * -height))
    return rec


class Skeleton:
    """The default MakeHuman skeleton: joint positions are the centroids of helper vertices."""
    def __init__(self, root):
        s = json.load(open(os.path.join(root, "rigs/default.mhskel")))
        self.bones = s["bones"]; self.joints = {k: np.array(v, dtype=np.int64) for k, v in s["joints"].items()}
        self.weights = json.load(open(os.path.join(root, "rigs/default_weights.mhw")))["weights"]

    def joint(self, V, name):
        return V[self.joints[name]].mean(axis=0)

    def head(self, V, bone): return self.joint(V, self.bones[bone]["head"])
    def tail(self, V, bone): return self.joint(V, self.bones[bone]["tail"])

    def merged_weights(self, nverts, rule):
        """Collapse the 163 MakeHuman bones onto a smaller game skeleton. rule(name) -> game bone or None."""
        out = {}
        for b, lst in self.weights.items():
            g = rule(b)
            if g is None: continue
            a = out.setdefault(g, np.zeros(nverts))
            for vi, w in lst: a[vi] += w
        tot = sum(out.values()); tot[tot == 0] = 1
        return {k: v / tot for k, v in out.items()}


def proxy_fit(path, V):
    """Fit a MakeHuman proxy (.mhclo + .obj) to the (morphed) base mesh. Returns (verts, uvs, faces)."""
    d = os.path.dirname(path); lines = open(path).read().splitlines(); obj = None; refs = []; mode = None; scales = {}
    for ln in lines:
        if ln.startswith("#") or not ln.strip(): continue
        if ln.startswith("obj_file"): obj = ln.split()[1]
        elif ln.split()[0] in ("x_scale", "y_scale", "z_scale"): p = ln.split(); scales[p[0][0]] = (int(p[1]), int(p[2]), float(p[3]))
        elif ln.startswith("verts"): mode = "v"
        elif re.match(r"^[a-z_]", ln): mode = None
        elif mode == "v": refs.append([float(x) for x in ln.split()])
    sc = np.ones(3)
    for i, a in enumerate("xyz"):
        if a in scales: v1, v2, den = scales[a]; sc[i] = abs(V[v1][i] - V[v2][i]) / den
    P = []
    for r in refs:
        if len(r) == 1: P.append(V[int(r[0])])
        else:
            i = [int(x) for x in r[0:3]]; w = r[3:6]; off = np.array(r[6:9])
            P.append(V[i[0]] * w[0] + V[i[1]] * w[1] + V[i[2]] * w[2] + off * sc)
    pv, pt, pf = [], [], []
    for ln in open(os.path.join(d, obj)):
        if ln.startswith("vt "): pt.append([float(x) for x in ln.split()[1:3]])
        elif ln.startswith("f "): pf.append([(int(t.split("/")[0]) - 1, int(t.split("/")[1]) - 1) for t in ln.split()[1:]])
    return np.array(P), np.array(pt), pf
