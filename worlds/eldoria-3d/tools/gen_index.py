"""Refresh the ORIGINAL ENGINE block in src/index.tsx from source/original-index.tsx.

That block is the original interface's deterministic normalizer and adaptive-audio
controller, copied verbatim so the 3D edition keeps every engine contract.
Run: python3 -I worlds/eldoria-3d/tools/gen_index.py
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
src = open(os.path.join(ROOT, "source", "original-index.tsx"), encoding="utf-8").read()
engine = src[src.index(" const [audioPrefs,setAudioPrefs]"):src.index(" // Mobile keyboard/editor guard.")]
p = os.path.join(ROOT, "src", "index.tsx"); cur = open(p, encoding="utf-8").read()
a = cur.index("// ---- ORIGINAL ENGINE (verbatim) ----\n") + len("// ---- ORIGINAL ENGINE (verbatim) ----\n"); b = cur.index("// ---- END ORIGINAL ENGINE ----")
open(p, "w", encoding="utf-8").write(cur[:a] + engine + cur[b:])
print("engine block:", len(engine), "chars")
