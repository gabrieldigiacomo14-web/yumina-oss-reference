"""Canon cast: each named mage's real magic and the details the narrator keeps getting wrong.
One source for two outputs:
  - build.py turns it into keyword-triggered lore entries (one per group, so only the people in the scene are sent)
  - write_js() writes ui/bc-canon-cast.js, which the battle arena uses for spell names and colours
Only spells we are sure of are named; the rest is described plainly, so the narrator never invents fake canon names.
"""
import json, os

# key: canon-power name (first alias in bc-canon-power.js); keys: lore keywords; col: the colour of their magic
CAST = {
    "black-bulls": ("Canon Cast — Black Bulls: true magic", [
        dict(key="yami sukehiro", kw=["yami"], col="#3b2a5c",
             spells=["Dark Magic: Dark Cloaked Blade: Black Moon", "Dark Cloaked Dimension Slash", "Dark Cloaked Avidya Slash"],
             note="Dark Magic wrapped around a real katana he carries; senses ki (intent) to read attacks before they land. Rarely needs more than one slash."),
        dict(key="magna swing", kw=["magna"], col="#ff6a2b",
             spells=["Flame Magic: Explosive Fireball", "Flame Restraint Magic: Hellfire Torture Rail", "Soul Chain Deathmatch (Flame Restraint)"],
             note="Does NOT carry a physical bat: he pulls a flame-forged bat out of his grimoire with magic when he fights, and it vanishes after. Bats fireballs at targets; rides a broom; average mana, huge grit."),
        dict(key="luck voltia", kw=["/\\bLuck\\b/", "voltia"], col="#7fd8ff",
             spells=["Lightning Magic: Thunder God's Boots", "Lightning Magic: Thunder God's Gloves", "Lightning Magic: Thunder Crumbling Orb"],
             note="His lightning is BLUE / pale electric blue, never yellow. Fights with lightning-clad kicks and punches at blinding speed; smiles constantly and loves fighting strong people."),
        dict(key="vanessa enoteca", kw=["vanessa"], col="#ff5c8a",
             spells=["Thread Magic: Red Thread of Fate", "Thread Magic: thread restraints and puppet strings", "Thread Magic: mends wounds and clothes"],
             note="The Red Thread of Fate appears as a red cat that bends luck so the best possible outcome happens for her allies. A witch who fled the Witches' Forest; drinks."),
        dict(key="finral roulacase", kw=["finral"], col="#c9a2ff",
             spells=["Spatial Magic: Wandering Traveller's Gate (portals to any place he has seen)", "Spatial Magic: small portals to redirect attacks"],
             note="Transport and support, not an attacker. Refuses to hurt people. Hits on every woman he meets."),
        dict(key="gauche adlai", kw=["gauche"], col="#cfe8ff",
             spells=["Mirror Magic: Reflect Ray", "Mirror Magic: mirror clones of himself", "Mirror Magic: viewing his sister Marie in a pocket mirror"],
             note="Mirrors bounce and multiply beams of light. Obsessed with his sister Marie; nosebleeds."),
        dict(key="charmy pappitson", kw=["charmy"], col="#fff6e0",
             spells=["Cotton Magic: Sheep Cook", "Cotton Magic: cotton clouds, beds and barriers"],
             note="Her cotton sheep cook food that restores mana and health. Will do anything for food."),
        dict(key="gordon agrippa", kw=["gordon"], col="#7a5ca8",
             spells=["Poison Magic: poison and curse spells"], note="Mumbles too quietly to hear; very kind; desperate for friends."),
        dict(key="grey of the black bulls", kw=["/\\bGrey\\b/"], col="#b9b0d8",
             spells=["Transformation Magic: changes her own shape and others'"], note="Painfully shy; hides in a large armoured form."),
        dict(key="zora ideale", kw=["zora"], col="#9b9b9b",
             spells=["Ash Magic: ash trap spells set in advance", "Ash Magic: copies spells he has watched"], note="Fights dirty with traps; despises corrupt knights."),
        dict(key="secre swallowtail", kw=["secre", "nero"], col="#d8f0ff",
             spells=["Sealing Magic: seals wounds, magic and space"], note="Spent centuries as the anti-bird Nero."),
        dict(key="noelle silva", kw=["noelle"], col="#4fc3f7",
             spells=["Water Magic: Sea Dragon's Nest", "Water Magic: Sea Dragon's Roar", "Water Creation Magic: Valkyrie Dress"],
             note="Royal-born; huge mana she once couldn't aim. Tsundere."),
        dict(key="asta", kw=["asta"], col="#1d1d1d",
             spells=["Anti-Magic: Demon-Slayer Sword", "Anti-Magic: Demon-Dweller Sword", "Black Asta (anti-magic form)"],
             note="No mana at all. His swords live inside his five-leaf grimoire and are pulled out of it; anti-magic cancels spells it touches. Shouts constantly; trains his body."),
        dict(key="henry legolant", kw=["henry legolant", "/\\bHenry\\b/"], col="#a07c5a",
             spells=["Recombination Magic: moves and rebuilds the Black Bulls base"], note="His body drains mana from anyone near him."),
        dict(key="nacht faust", kw=["nacht"], col="#2a2a3a",
             spells=["Shadow Magic: travels and hides through shadows", "Devil Union with his four bound devils"], note="Vice-captain; arrives late, hates bad people."),
    ]),
    "captains": ("Canon Cast — Captains and the Wizard King: true magic", [
        dict(key="fuegoleon vermillion", kw=["fuegoleon"], col="#ff3b1f",
             spells=["Fire Magic: Leo Rugiens", "Fire Magic: Calidos Brachium", "Fire Magic: Spirit of Salamander"], note="Crimson Lion captain; the Fire Spirit Salamander chose him."),
        dict(key="mereoleona vermillion", kw=["mereoleona"], col="#ff5a1f",
             spells=["Fire Magic: Calidos Brachium (barrage)", "Mana Zone: flames from the surrounding natural mana", "Fire Magic: Leo Rugiens"], note="Fights with her fists wreathed in flame; a natural disaster of a woman."),
        dict(key="leopold vermillion", kw=["leopold"], col="#ff7a2b", spells=["Fire Magic: Leo Rugiens", "Fire Magic: Leo Palma"], note="Asta's rival; loud and earnest."),
        dict(key="william vangeance", kw=["vangeance"], col="#7cc36a",
             spells=["World Tree Magic: Yggdrasil's Tree (heals allies, drains mana from foes)"], note="Golden Dawn captain; always masked."),
        dict(key="nozel silva", kw=["nozel"], col="#cfd8dc", spells=["Mercury Magic: Silver Rain", "Mercury Magic: mercury spears and shields"], note="Silver Eagles captain; cold, royal."),
        dict(key="charlotte roselei", kw=["charlotte"], col="#5aa34a", spells=["Briar Magic: Briar Maiden's Song", "Briar Magic: walls of thorned briars"], note="Blue Rose captain; under a curse; secretly smitten with Yami."),
        dict(key="jack the ripper", kw=["jack the ripper"], col="#9fe870", spells=["Slash Magic: blades from his arms and legs that cut anything"], note="Green Mantis captain; craves strong opponents."),
        dict(key="rill boismortier", kw=["rill"], col="#ffd36e", spells=["Painting Magic: what he paints comes to life"], note="Aqua Deer captain; childlike."),
        dict(key="dorothy unsworth", kw=["dorothy"], col="#f5a8ff", spells=["Dream Magic: pulls people into her Dream World, where she is almost all-powerful"], note="Coral Peacock captain; usually asleep."),
        dict(key="julius novachrono", kw=["julius", "wizard king"], col="#e9d8a6",
             spells=["Time Magic: Chronostasis", "Time Magic: Chrono Anastasis", "Time Magic: Time Stock"], note="The Wizard King. Loves every kind of magic; stores time to use later."),
    ]),
    "golden-dawn": ("Canon Cast — Golden Dawn and others: true magic", [
        dict(key="yuno", kw=["yuno"], col="#7ff2c2",
             spells=["Wind Magic: Wind Blade Shower", "Wind Magic: Towering Tornado", "Spirit of Zephyr (Bell, the wind spirit Sylph)"], note="Asta's rival; four-leaf grimoire."),
        dict(key="klaus lunettes", kw=["klaus"], col="#b0bec5", spells=["Steel Magic: steel spears, walls and armour"], note="Stern, by-the-book."),
        dict(key="mimosa vermillion", kw=["mimosa"], col="#9be37a",
             spells=["Plant Magic: Magic Flower Guidance (finds a path or target)", "Plant Recovery Magic: Princess's Healing Flower Cradle"], note="Healer; gentle; blurts what she thinks."),
        dict(key="langris vaude", kw=["langris"], col="#b388ff", spells=["Spatial Magic: erases the space a target occupies"], note="Finral's younger brother; arrogant."),
        dict(key="sol marron", kw=["sol marron"], col="#a1887f", spells=["Earth Magic: earth golems and rock walls"], note="Blue Rose; calls Charlotte 'big sis'."),
        dict(key="solid silva", kw=["solid silva"], col="#4fc3f7", spells=["Water Magic: water attacks and restraints"], note="Noelle's cruel brother."),
        dict(key="patri", kw=["patri"], col="#fff7c2", spells=["Light Magic: Light Sword of Judgment", "Light Magic: moves at the speed of light"], note="Leader of the Eye of the Midnight Sun; elf."),
        dict(key="licht", kw=["licht"], col="#fff7c2", spells=["Sword Magic: the Sword of Lament and other cursed swords"], note="The elf leader; Asta's grimoire once was his."),
    ]),
}

RULE = ("Use these real spells and details whenever these people use magic or appear. A canon mage fights with several distinct, named spells and "
        "varies them; never reduce one to a single repeated fireball or bolt. For anyone not listed, describe their magic plainly rather than "
        "inventing names that pass for canon.")

# the canon stage of each cast member, read from the battle arena's canon power table (one source)
TIER_SCORE = {"weak": 10, "average": 26, "strong": 42, "elite": 64, "captain": 86, "legend": 98, "apex": 112}
def canon_stages():
    import re
    js = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "ui", "bc-canon-power.js"), encoding="utf-8").read()
    out = {}
    for m in re.finditer(r'\{ n: \["([^"]+)"[^\]]*\], t: "(\w+)"([^}]*)\}', js):
        score = TIER_SCORE[m.group(2)]; arc = "arc: true" in m.group(3)
        if score >= 80: label = "Arcane Stage" + (" (beyond measure)" if score >= 105 else "")
        elif arc: label = "Arcane Stage (one-of-a-kind magic)"
        else: label = "Stage %d" % (9 - score // 8)
        out[m.group(1)] = label
    return out

def lore_entries():
    out = []
    stages = canon_stages()
    for gid, (title, people) in CAST.items():
        lines = [RULE, ""]
        kws = []
        for p in people:
            name = p["key"].title() if p["key"] != "grey of the black bulls" else "Grey"
            st = stages.get(p["key"])
            lines.append("%s%s: %s. %s" % (name, " [" + st + ", opening era]" if st else "", "; ".join(p["spells"]), p["note"]))
            kws += p["kw"]
        out.append(("canon-cast-" + gid, title, "\n".join(lines), sorted(set(kws))))
    return out

def write_js(path):
    data = {}
    for gid, (title, people) in CAST.items():
        for p in people:
            data[p["key"]] = {"sp": [s.split(" (")[0] for s in p["spells"]], "col": p["col"]}
    js = ("/* Generated by tools/canon_cast.py: each canon mage's true spell names and the colour of their magic. */\n"
          "export var CANON_CAST = " + json.dumps(data, ensure_ascii=False, indent=0) + ";\n")
    open(path, "w", encoding="utf-8").write(js)

if __name__ == "__main__":
    write_js(os.path.join(os.path.dirname(os.path.abspath(__file__)), "ui", "bc-canon-cast.js"))
    print("ok")
