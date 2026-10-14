"""Generate src/data.tsx from the canonical Eldoria world file.

Everything the 3D client places in the world (settlement coordinates, districts,
monster stat blocks, trainers, spells) is parsed out of the lorebook entries, so
the 3D map and the AI Game Master read the same canon. Run:

    python3 -I worlds/eldoria-3d/tools/gen_data.py
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "source", "eldoria-original.json")
OUT = os.path.join(ROOT, "src", "data.tsx")

world = json.load(open(SRC, encoding="utf-8"))
ENTRIES = {e["name"]: e["content"] for e in world["entries"]}


def slug(s):
    s = s.lower().replace("khaz'modan", "khaz-modan").replace("'", "")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


# ---------------------------------------------------------------- atlas
REALM_HEAD = {
    "AURELIA": "Aurelia", "STONEHOLD": "Stonehold", "SYLVANOR": "Sylvanor",
    "DRAKMOR": "Drakmor", "SUNSCAR": "Sunscar", "VELKAR": "Velkar",
    "UMBRAL REACH": "Umbral Reach", "THE MARCHES": "The Marches",
}


def infer_kind(name, raw):
    raw = (raw or "").lower()
    n = name.lower()
    if "megadungeon" in raw: return "dungeon"
    if "capital" in raw: return "capital"
    if "port city" in raw: return "city"
    if "scholar-city" in raw: return "city"
    if "fortress-town" in raw: return "fort-town"
    if "mining town" in raw: return "town"
    if "lake village" in raw: return "village"
    if "village" in raw: return "village"
    if "hamlet" in raw: return "hamlet"
    if "ruined tower" in raw: return "ruin"
    if "ruin" in raw or "abandoned" in raw: return "ruin"
    if "wreck" in raw: return "ruin"
    if "dungeon" in raw: return "dungeon"
    if "town" in raw: return "town"
    if "headquarters" in raw or "seat" in raw or "grand water court" in raw: return "city"
    if re.search(r"\bfort\b|keep", n): return "fort"
    if "watchtower" in n or "rookspire" in n: return "tower"
    if "monastery" in n or "abbey" in n: return "monastery"
    if "gullet" in n or "tomb" in n or "vault of" in n or "undervein" in n: return "dungeon"
    if "waste" in n or "drowned fleet" in n or "silent march" in n: return "landmark"
    if "camp" in n: return "camp"
    if "pass" in n: return "fort"
    if "grove" in n: return "shrine"
    if "spire" in n: return "stronghold"
    if "oasis" in n: return "town"
    if "wells" in n or "palm rest" in n or "rock" in n or "cay" in n: return "village"
    if "last stand" in n or "cairnwatch" in n or "last hope" in n: return "fort"
    return "town"


atlas = {}
realm = None
for line in ENTRIES["Atlas Index"].splitlines():
    s = line.strip()
    if not s:
        continue
    head = s.split("—")[0].strip()
    if head in REALM_HEAD and "(" not in head:
        realm = REALM_HEAD[head]
        continue
    if s.startswith("BORDER") or s.startswith("GUILD HEADQUARTERS"):
        realm = None
    if realm is None:
        continue
    # "Grimfrost Marches, between ...: Last Hope (-20,+380), Bleakstead (-120,+300)"
    if ":" in s and realm == "The Marches":
        s = s.split(":", 1)[1]
    for part in re.split(r"\s\|\s|,\s(?=[A-Z][^()]*\()", s):
        m = re.match(r"\s*(.+?)\s*\(([+-]?\d+),\s*([+-]?\d+)\)\s*(.*)$", part)
        if not m:
            continue
        name, x, y, rest = m.group(1).strip(), int(m.group(2)), int(m.group(3)), m.group(4).strip()
        rest = rest.lstrip("—").strip()
        if rest.startswith("FRONTIER"):
            rest = ""
        sid = slug(name.split("/")[0])
        if sid in atlas:  # frontier duplicates (Stonefall/Last Hope listed twice)
            continue
        atlas[sid] = {"id": sid, "name": name, "x": x, "y": y, "realm": realm,
                      "kind": infer_kind(name, rest), "note": rest}

# Canon border notes: these frontier places belong to the Marches / Stonehold frontier.
for sid, reg in (("last-hope", "The Marches"), ("bleakstead", "The Marches")):
    if sid in atlas:
        atlas[sid]["realm"] = reg

# The registered starting settlements of the original creator use these exact ids.
ALIASES = {"khaz-modan": "khaz-modan", "saffaron": "saffaron"}
for k in ALIASES:
    assert k in atlas, ("missing atlas id", k, sorted(atlas)[:20])

# ---------------------------------------------------------------- interiors
interiors = {}
for name, content in ENTRIES.items():
    if not name.endswith("Fixed Interior Locations"):
        continue
    cur = None
    for line in content.splitlines():
        if re.match(r"^[^\s].*:\s*$", line) and not line.startswith("FIXED"):
            cur = line.strip().rstrip(":")
            interiors.setdefault(cur, [])
            continue
        m = re.match(r"^\s+\d+\.\s+(.+)$", line)
        if m and cur:
            interiors[cur].append(m.group(1).strip())


def match_place(label):
    """Map an interior heading like "Khaz'Modan / Anvil-Heart" to an atlas id."""
    sid = slug(label.split("/")[0])
    if sid in atlas:
        return sid
    for k, a in atlas.items():
        if slug(a["name"]) == slug(label) or a["name"].lower().startswith(label.lower()):
            return k
    for k, a in atlas.items():
        if label.lower() in a["name"].lower():
            return k
    return None


districts = {}
unmatched = []
for label, subs in interiors.items():
    sid = match_place(label)
    if sid:
        districts[sid] = subs
    else:
        unmatched.append(label)

# ---------------------------------------------------------------- bestiary
bestiary = []
for name, content in ENTRIES.items():
    if not name.startswith("Bestiary — "):
        continue
    region = name.split("—")[1].strip()
    blocks = re.split(r"\n\s*\n", content)
    for b in blocks:
        lines = [l.strip() for l in b.strip().splitlines() if l.strip()]
        if not lines or "|" not in lines[0]:
            continue
        head = [p.strip() for p in lines[0].split("|")]
        if len(head) < 5:
            continue
        mon = {"id": slug(head[0]), "name": head[0], "region": region,
               "threat": int(re.sub(r"\D", "", head[1]) or 1),
               "hp": int(re.sub(r"\D", "", head[2]) or 10),
               "evasion": int(re.sub(r"\D", "", head[3]) or 10),
               "dr": int(re.sub(r"\D", "", head[4].split("/")[-1]) or 0)}
        body = " ".join(lines[1:])
        fields = re.split(r"\s*(Attacks|Weakness/Counterplay|Loot|Tactics):\s*", body)
        pairs = [(fields[i], fields[i + 1].strip().rstrip(".")) for i in range(1, len(fields) - 1, 2)]
        for key, val in pairs:
            key = key.strip().lower()
            if key == "attacks":
                atks = []
                for a in val.split(";"):
                    a = a.strip().rstrip(".")
                    dm = re.search(r"(\d+)d(\d+)(?:\s*\+\s*(\d+)(?!d))?", a)
                    if dm:
                        nm = a[: dm.start()].strip() or "strike"
                        atks.append({"name": nm, "n": int(dm.group(1)), "d": int(dm.group(2)),
                                     "b": int(dm.group(3) or 0),
                                     "tag": a[dm.end():].strip()})
                mon["attacks"] = atks or [{"name": "strike", "n": 1, "d": 6, "b": 0, "tag": ""}]
            elif key.startswith("weakness"):
                mon["weakness"] = val.strip()
            elif key == "loot":
                mon["loot"] = val.strip()
            elif key == "tactics":
                mon["tactics"] = val.strip()
        bestiary.append(mon)

# ---------------------------------------------------------------- trainers
trainers = []
place = None
PLACE_IDS = {"AURELIA CITY": "aurelia-city"}
for line in ENTRIES["Trainer Index"].splitlines():
    s = line.strip()
    if not s:
        continue
    if s.isupper() or s.startswith("AURELIA CITY"):
        place = PLACE_IDS.get(s.split("(")[0].strip(), None)
        continue
    parts = [p.strip() for p in s.split(" — ")]
    if len(parts) < 3:
        continue
    nm, skills, rest = parts[0], parts[1], " — ".join(parts[2:])
    loc = place
    cm = re.search(r"\(([+-]?\d+),\s*([+-]?\d+)\)", rest)
    where = rest.split(".")[0]
    if loc is None:
        for k, a in atlas.items():
            if a["name"].split("/")[0].strip().lower() in rest.lower()[:60]:
                loc = k
                break
    if loc is None:
        continue
    trainers.append({"name": nm, "teaches": skills, "where": where, "place": loc,
                     "detail": rest[:220]})

# ---------------------------------------------------------------- spells
spells = {}
for name, content in ENTRIES.items():
    if not name.startswith("Spells — "):
        continue
    school = name.split("—")[1].strip()
    blocks = re.split(r"\n\s*\n", content)
    for b in blocks:
        lines = [l.strip() for l in b.strip().splitlines() if l.strip()]
        if not lines or lines[0].count("|") < 3:
            continue
        head = [p.strip() for p in lines[0].split("|")]
        desc = " ".join(lines[1:])
        mp = int(re.sub(r"\D", "", head[2]) or 0)
        dm = re.search(r"(\d+)d(\d+)\s*([a-z]+)?", desc)
        heal = bool(re.search(r"\b(heal|restore|recover|mend)\w*", desc, re.I)) and "damage" not in desc.lower()
        sid = slug(head[0])
        spells[sid] = {"id": sid, "name": head[0], "school": school, "tier": head[1], "mp": mp,
                       "cast": head[3], "range": head[4] if len(head) > 4 else "",
                       "dice": [int(dm.group(1)), int(dm.group(2))] if dm else None,
                       "element": (dm.group(3) if dm and dm.group(3) else "").lower(),
                       "heal": heal, "desc": desc[:240]}

# ---------------------------------------------------------------- notable Aurelia City people (from the city entry)
people = []
txt = ENTRIES["Aurelia City — People, Work & Rumor"]
sec = txt.split("NOTABLE PEOPLE", 1)[1].split("TYPICAL BOARD", 1)[0]
for line in sec.splitlines():
    s = line.strip()
    if " — " not in s or s.startswith("Magister Ilya Ferrant,"):
        continue
    nm, desc = s.split(" — ", 1)
    people.append({"name": nm.replace('"', "").strip(), "desc": desc.strip()[:240]})

boards = {}
for v in world["variables"]:
    if v["id"] == "quest-board-registry":
        for bid, b in v["defaultValue"].items():
            sid = match_place(b.get("settlement", ""))
            if sid:
                boards.setdefault(sid, []).append({"id": bid, "name": b.get("name"), "sub": b.get("sublocation"), "profile": b.get("profile")})

routes_text = ENTRIES["Roads & Trade Routes"]

out = {
    "ATLAS": list(atlas.values()),
    "DISTRICTS": districts,
    "BESTIARY": bestiary,
    "TRAINERS": trainers,
    "SPELL_LIBRARY": spells,
    "AURELIA_PEOPLE": people,
    "BOARDS": boards,
}

with open(OUT, "w", encoding="utf-8") as f:
    f.write("// @ts-nocheck\n// GENERATED by tools/gen_data.py from the canonical Eldoria lorebook. Do not edit by hand.\n")
    for k, v in out.items():
        f.write("export const %s = %s;\n" % (k, json.dumps(v, ensure_ascii=False, separators=(",", ":"))))

print("atlas", len(atlas), "districts", len(districts), "unmatched", unmatched)
print("bestiary", len(bestiary), "trainers", len(trainers), "spells", len(spells), "people", len(people), "boards", sum(len(b) for b in boards.values()))
if unmatched:
    sys.exit("unmatched interior headings: %r" % unmatched)
