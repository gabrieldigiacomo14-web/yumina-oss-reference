# Rewrites a GLB for the crowd LOD: every embedded image scaled down to at most N pixels (the node build of gltfpack cannot
# resize textures) and the facial morph targets dropped (only body shape morphs are kept; nobody reads a face at 20 m).
# Usage: python shrink_textures.py in.glb out.glb 256
import io, json, struct, sys
from PIL import Image

def read(path):
    b = open(path, "rb").read(); n = struct.unpack("<I", b[12:16])[0]; j = json.loads(b[20:20 + n])
    m = 20 + n; bl = struct.unpack("<I", b[m:m + 4])[0]; return j, b[m + 8:m + 8 + bl]

def write(path, j, bin_):
    while len(bin_) % 4: bin_ += b"\0"
    js = json.dumps(j, separators=(",", ":")).encode()
    while len(js) % 4: js += b" "
    out = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)) + struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(bin_), 0x004E4942) + bin_
    open(path, "wb").write(out)

def main(src, dst, limit):
    j, bin_ = read(src); views = j["bufferViews"]; chunks = []
    KEEP = ("female", "build_broad", "ears_pointed")
    for m in j.get("meshes", []):
        names = (m.get("extras") or {}).get("targetNames")
        if not names: continue
        keep = [i for i, n in enumerate(names) if n in KEEP]
        for p in m["primitives"]:
            if "targets" in p: p["targets"] = [p["targets"][i] for i in keep]
        if "weights" in m: m["weights"] = [m["weights"][i] for i in keep]
        m["extras"]["targetNames"] = [names[i] for i in keep]
    imgview = {img["bufferView"]: img for img in j.get("images", []) if "bufferView" in img}
    for i, v in enumerate(views):  # rebuild the buffer view by view, replacing image data
        data = bin_[v.get("byteOffset", 0): v.get("byteOffset", 0) + v["byteLength"]]
        if i in imgview:
            im = Image.open(io.BytesIO(data)); fmt = (imgview[i].get("mimeType") or "image/png").split("/")[1].upper()
            if max(im.size) > limit:
                k = limit / max(im.size); im = im.resize((max(1, round(im.size[0] * k)), max(1, round(im.size[1] * k))), Image.LANCZOS)
                buf = io.BytesIO(); im.save(buf, "WEBP" if fmt == "WEBP" else "PNG" if fmt == "PNG" else "JPEG", quality=82); data = buf.getvalue()
        chunks.append(data)
    out = b""
    for v, d in zip(views, chunks):
        while len(out) % 4: out += b"\0"
        v["byteOffset"] = len(out); v["byteLength"] = len(d); out += d
    j["buffers"] = [{"byteLength": len(out)}]; write(dst, j, out)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 256)
