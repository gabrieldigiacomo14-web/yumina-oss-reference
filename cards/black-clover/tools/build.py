"""Builds the optimized Black Clover card from the original export.
Usage: python3 -I build.py <original.json> <out.json>"""
import json, sys, os, copy
HERE = os.path.dirname(os.path.abspath(__file__))
src, dst = sys.argv[1], sys.argv[2]
d = json.load(open(src))
w = copy.deepcopy(d)
core = lambda n: open(os.path.join(HERE, 'core', n + '.txt')).read().strip()
E = {e['id']: e for e in w['entries']}

def entry(id, name, content, section='system-presets', position=0, tags=('core',), role='system', **kw):
    base = {"id": id, "name": name, "role": role, "tags": list(tags), "depth": None, "apiRole": "system",
            "content": content, "enabled": True, "section": section, "folderId": None, "keywords": [],
            "position": position, "alwaysSend": section != 'chat-history', "conditions": [], "conditionLogic": "all",
            "matchWholeWords": False, "excludeRecursion": True, "preventRecursion": True,
            "secondaryKeywords": [], "secondaryKeywordLogic": "AND_ANY"}
    base.update(kw)
    return base

# ---------------------------------------------------------------- 1. always-on core
ALWAYS = [
    ("core-prime-law", "Prime Law — Living Black Clover", ('core',)),
    ("core-gm-contract", "GM Contract & State Directives", ('core', 'state')),
    ("core-narration", "Knowledge, Narration & Scene Markup", ('core', 'ui', 'narration')),
    ("core-time", "Time, Canon Current & Divergence", ('core', 'time', 'canon')),
    ("core-magic-law", "Magic Core Law", ('core', 'magic')),
    ("core-living-world", "Living World Core", ('core', 'world')),
    ("core-phase-router", "Current Phase Router", ('core', 'state')),
    ("core-possessions", "Possessions, Money & Appearance", ('core', 'inventory', 'economy')),
    ("core-spell-bridge", "Spell Cost Bridge", ('core', 'magic', 'state')),
]
new_entries = []
greeting = E['greeting-prologue']; greeting['position'] = 0
new_entries.append(greeting)
for i, (id, name, tags) in enumerate(ALWAYS):
    new_entries.append(entry(id, name, core(id), position=i + 1, tags=tags))

# combat engine: loaded by state instead of toggle rules
combat = E['combat-live']
combat.update(enabled=True, alwaysSend=False, position=20,
              conditions=[{"value": True, "operator": "eq", "variableId": "in_combat"}],
              name="Combat Engine — Live (loads while in_combat)")
combat['content'] = combat['content'].replace("COMBAT ENGINE — LIVE (enabled only while in_combat is true)", "COMBAT ENGINE — LIVE (loaded while in_combat is true)")
new_entries.append(combat)

new_entries.append(entry("post-final-check", "Final Check — Every Reply", core('post-final-check'),
                         section='post-history', position=0, tags=('core', 'state'),
                         conditions=[{"value": True, "operator": "eq", "variableId": "character_created"}]))
new_entries.append(E['example-turn'])

# ---------------------------------------------------------------- 2. detailed rules become on-demand lore
def to_lore(e, depth=3):
    e.update(section='chat-history', alwaysSend=False, depth=depth, role='system', role_=None)
    e.pop('role_', None)
    return e
bank = to_lore(E['bc-bank-treasury-law'])
bank['name'] = "Banking, Yul Denominations & Secure Storage (detail)"
bank['content'] = (bank['content']
    .replace("`bank_account.balance` is secure on-account Yul", "Bank savings (shown read-only as bank_summary) are secure on-account Yul")
    .replace("Routine salaries and authorized merit bonuses automatically credit the protected payroll/treasury bank ledger, not `money`", "Routine salaries and authorized merit bonuses automatically credit the protected bank ledger, not `money`"))
inv = to_lore(E['bc-physical-inventory-law'])
inv['name'] = "Physical Inventory & Encumbrance (detail)"
inv['content'] = inv['content'].replace("Money held in bank_account has no carried weight.", "Money held in the bank has no carried weight.")
vis = to_lore(E['bc-visible-equipment-social-perception'])
vis['name'] = "Visible Equipment, Clothing & Social Perception (detail)"
for e in (bank, inv, vis):
    e['position'] = 90 + (bank, inv, vis).index(e)

# compressed high-traffic lore
E['bc-class-aware-attire-etiquette']['content'] = core('bc-class-aware-attire-etiquette')
E['work-wages']['content'] = core('work-wages')
mk = E['magic-knights']
mk['content'] = (mk['content']
    .replace("can be approved with a stable ID in mk_payroll.bonusAwards, which the UI credits to bank_account once.", "can be approved by pushing {\"id\",\"amount\",\"reason\",\"source\"} to mk_bonus_requests, which the UI credits to the bank once.")
    .replace("All routine Magic Knight salary and approved bonuses are engine/UI-owned via the mk_payroll ledger", "All routine Magic Knight salary and approved bonuses are engine/UI-owned via the payroll ledger")
    .replace("directly mutates bank_account, rewrites cyclesPaid,", "directly changes the bank,")
    .replace("mk_payroll records authoritative paid service, approved awards, and money transfers.", "the interface's payroll ledger records paid service, approved awards and transfers (summarized in bank_summary)."))
E['geography-gazetteer']['depth'] = 3
ledger = to_lore(E['bc-spell-mechanics-ledger'], depth=2)
ledger['name'] = "Spell Mechanics Ledger (detail)"
ledger['position'] = 93

# ---------------------------------------------------------------- 3. keyword tightening
KW = {
 'ui-action-protocol': (['[UI:'], False),
 'ooc-commands': (['[sync', '[merge npcs]', '[status]', '(ooc', 'ooc:'], False),
 'life-begins': (['begin life'], True),
 'talent-generation': (['begin life', 'hidden profile', 'mana potential', 'loved by mana', 'hated by mana'], True),
 'grimoire-ceremony': (['grimoire acceptance', 'grimoire tower', 'tower master', '/\\bceremon(y|ies)\\b/i', '/\\b(receive|receiving|received|get|got)\\s+(my|a|his|her|their)\\s+grimoire\\b/i'], True),
 'four-leaf-resonance': (['four-leaf', 'four leaf', 'fourth leaf', 'grimoire tower', '/\\bceremon(y|ies)\\b/i'], True),
 'grimoire-object': (['spellbook', 'grimoire cover', 'grimoire holster', 'grimoire pouch', 'without my grimoire', 'blank page', 'blank pages', '/\\b(lost|lose|losing|stolen|steal|stole|dropped|forgot|left|damaged|burned)\\b[^.\\n]{0,30}\\bgrimoire\\b/i'], True),
 'mana-engine': (['mana cost', 'out of mana', 'low on mana', 'reserves', 'overdraw', 'overdrawn', 'mana exhaustion', 'mana recovery', 'recover mana', 'magic power', 'drained'], True),
 'spell-proficiency': (['proficiency', 'mastery', 'master the spell', 'practice my spell', 'variant', 'variants', 'get better at'], True),
 'spell-shaping': (['spell concept', 'new spell', 'invent a spell', 'develop a spell', 'shaping', '[ui:shape]', 'experiment with', '/\\bshape (a|the|my|it|this)\\b/i'], True),
 'page-manifestation': (['new page', 'breakthrough', 'grimoire reacts', 'grimoire glows', 'page fills', 'page appears', 'page manifests', 'grimoire opens'], True),
 'freeform-magic': (['freeform', 'improvise', 'improvised', 'try something new', 'raw magic', '/\\bi (cast|channel|shape|try to cast|attempt to cast|use my magic)\\b/i', '/\\bwithout (a|my) (spell|grimoire)\\b/i'], True),
 'attribute-registry': (['attribute', 'attributes', 'what magic', 'rare magic', 'registry', 'which attribute'], True),
 'attribute-generator': (['custom magic', 'random magic', 'new attribute', 'unknown attribute', 'strange magic', 'unusual magic'], True),
 'magic-forms': (['creation magic', 'reinforcement magic', 'healing magic', 'restraining magic', 'trap magic', 'curse magic', 'sealing magic', 'compound magic', 'transformation magic', 'barrier magic'], True),
 'techniques-core': (['mana skin', 'mana sensing', 'sense mana', 'reinforcement magic', 'learn a technique', '/\\bsense (his|her|their|its) mana\\b/i', '/\\breinforc(e|es|ed|ing|ement)\\b[^.\\n]{0,25}\\b(body|fist|fists|arm|arms|legs|blade|sword|myself|yourself|mana)\\b/i'], True),
 'mana-zone': (['mana zone', 'surrounding mana', 'control the mana around'], True),
 'mana-method': (['mana method', 'rune', 'runes', 'rune array', 'true magic'], True),
 'ki': (['/\\bki\\b/i', 'zetten', 'sense his intent', 'sense her intent', 'life force'], True),
 'ultimate-magic': (['ultimate magic'], True),
 'magic-stages': (['magic stage', 'stage zero', 'stage one', 'arcane stage', 'saint stage'], True),
 'spirits': (['great spirit', 'spirit dive', 'spirit magic', 'spirit bond', 'sylph', 'salamander', 'undine', 'earth spirit'], True),
 'devils': (['devil', 'devils', 'underworld', 'five-leaf', 'five leaf', 'possessed', 'lucifero', 'megicula', 'zagred', 'liebe'], True),
 'forbidden-curses': (['forbidden magic', 'negative mana', 'curse', 'cursed', 'malice', 'human sacrifice'], True),
 'anti-magic': (['anti-magic', 'anti magic', 'demon-slayer', 'demon slayer'], True),
 'races-souls-heredity': (['/\\belf\\b/i', 'elves', 'elven', 'dwarf', 'dwarves', 'witch', 'witches', 'reincarnation', 'reincarnated', 'heredity', 'bloodline', 'lineage'], True),
 'magic-tools': (['magic tool', 'magic tools', 'artifact', 'artifacts', 'broom', 'communication device', 'mage stone', 'magic stone'], True),
 'compound-team': (['compound magic', 'combination magic', 'combination attack', 'combine our magic', 'team spell', 'together we cast', 'unison'], True),
 'magic-research': (['teach me', 'teacher', 'mentor', 'library', 'research', 'study magic', '/\\bstud(y|ying|ied) (magic|spells?|the grimoire|runes)\\b/i', '/\\bobserv(e|ing) (his|her|their) (magic|spell)/i'], True),
 'training-engine': (['/\\btrain(s|ed|ing|ee)?\\b/i', 'practice', 'drill', 'drills', '[ui:train]', 'intensity'], True),
 'advance-routine': (['advance time', 'skip ahead', 'time skip', 'weeks pass', 'time passes', '[ui:advance]', 'follow my routine', 'live my routine', 'routine', '/\\bskip(s|ped|ping)?\\b/i'], True),
 'recovery-rest': (['/\\b(i|you|we) (rest|sleep|nap)\\b/i', 'resting', 'sleep', 'overtrain', 'overtrained', 'exhausted', '[ui:rest]'], True),
 'combat-interactions': ([], True),
 'injury-healing': (['/\\binjur(y|ies|ed)\\b/i', 'wound', 'wounds', 'wounded', 'bleeding', 'fracture', 'fractured', 'broken bone', 'broken arm', 'broken leg', 'burned', 'burns', 'concussion', 'poison', 'poisoned', 'healer', 'healing magic', 'infirmary', 'medicine', 'bandage', 'bandaged'], True),
 'team-tactics': (['ally', 'allies', 'squadmate', 'squadmates', 'cover me', 'order', 'orders', 'surrender', 'retreat', 'escape', 'capture', '/\\bflee(s|ing)?\\b/i', 'companion', 'companions', 'party'], True),
 'combat-aftermath': (['aftermath', 'fight is over', 'battle ends', 'the dust settles', 'collateral'], True),
 'households-class': (['household', 'family', 'my parents', 'my mother', 'my father', 'my brother', 'my sister', 'orphan', 'orphanage', 'inheritance', 'allowance', 'dowry'], True),
 'work-wages': (['job', 'jobs', 'looking for work', 'find work', 'go to work', 'work for', 'wage', 'wages', 'hire', 'hiring', 'employer', 'apprentice', 'salary', 'payday', 'payslip', 'employment'], True),
 'economy-prices': (['price', 'prices', 'how much', 'haggle', 'bargain', 'sell', 'selling', 'merchant', 'afford', 'cost of', '[ui:buy]', '/\\bbuy(ing|s)?\\b/i'], True),
 'housing-property': (['/\\brent(s|ed|al|ing)?\\b/i', 'my house', 'our house', 'my room', 'a room', 'property', 'storage', 'move in', '/\\binns?\\b/i', 'lodging', 'quarters', 'landlord', 'buy a house'], True),
 'business-crafting': (['business', 'my own shop', 'crafting', '/\\bcraft(s|ed)?\\b/i', '/\\bforg(e|ed|es|ing)\\b/i', 'repair', 'workshop', 'invention', 'to invent', 'blacksmith'], True),
 'romance-family': (['romance', 'a date', 'kiss', 'kissed', 'marry', 'marriage', 'wedding', 'my child', 'our child', 'baby', 'pregnant', 'pregnancy', 'birthday', 'in love', 'confess', 'confession', 'flirt', 'courting'], True),
 'reputation-rumor': (['reputation', 'rumor', 'rumors', 'rumour', 'rumours', 'fame', 'famous', 'gossip', 'heard about', 'word spread', 'talk of the town'], True),
 'law-crime': (['crime', 'steal', 'stole', 'theft', 'thief', 'arrest', 'arrested', 'trial', 'prison', 'jail', 'murder', 'illegal', 'magic parliament', 'law', 'laws'], True),
 'food-survival': (['hungry', 'starving', 'forage', 'foraging', 'hunt', 'hunting', 'rations', 'supplies', 'camp', 'camping', 'thirst', 'thirsty', 'spoiled'], True),
 'codex-knowledge': (['codex', 'read about', 'learn about', 'school', 'library', 'lore reference'], True),
 'local-events': (['festival', 'harvest', 'accident', 'fire broke', 'problem in town', 'celebration', 'fair', 'disaster', 'flood', 'beast attack'], True),
 'bc-class-aware-attire-etiquette': (['nobility', 'aristocrat', 'aristocrats', 'peasant', 'peasants', 'commoner', 'commoners', 'palace', 'banquet', 'ballroom', 'reception', 'gala', 'high society', 'class prejudice', 'etiquette', 'snob', 'snobbish', 'sneer', 'sneers', 'looks down on', 'usher', 'noble realm'], True),
 'kingdom-clover': (['clover kingdom', 'noble realm', 'common realm', 'forsaken realm', 'castle town', 'clover castle', 'kiten', 'raque', 'nairn', 'king augustus'], True),
 'kingdom-diamond': (['diamond kingdom', 'diamond', 'mage warrior', 'shining general', 'moris', '/\\bmars\\b/i'], True),
 'kingdom-heart': (['heart kingdom', 'lolopechka', 'undine', 'spirit guardian', 'gadjah'], True),
 'kingdom-spade': (['spade', 'dark triad', 'zogratis', 'grinberryall', 'mage defense force', 'dante', 'zenon', 'vanica'], True),
 'other-origins': (["witches' forest", 'witch queen', 'hino', 'land of the sun', 'neutral land', 'borderland', 'borderlands'], True),
 'geography-map': (['how far', 'distance to', 'continent', 'world map', 'geography', 'which direction', 'map of'], True),
 'travel-engine': (['travel', 'traveling', 'travelling', 'journey', 'by carriage', 'take a carriage', 'set out', 'ride to', 'fly to', '/\\broutes?\\b/i', '[ui:travel]', 'on the road', 'days away'], True),
 'borders-citizenship': (['border', 'borders', 'checkpoint', 'citizenship', 'papers', 'smuggle', 'smuggling', 'cross into', 'foreign'], True),
 'weather-mana-geo': (['grand magic zone', 'strong magic region', 'volcano', 'seabed temple', 'mana-rich', 'dense mana', 'mana density', 'blizzard', 'thunderstorm'], True),
 'wilderness-ecology': (['wilderness', 'wildlife', 'tracking', 'track the', 'beast', 'beasts', 'magical beast', 'monster', 'monsters', 'wolf', 'wolves', 'camp', 'camping'], True),
 'exploration': (['explore', 'exploring', 'exploration', 'cave', 'ruins', 'cartograph', 'search the area', 'map this area', '/\\bdiscover(y|ed|ies)?\\b/i'], True),
 'dungeons': (['dungeon', 'dungeons', '/\\btraps?\\b/i', 'trapped', 'treasure', 'artifact', 'ruin', 'ruins', 'expedition'], True),
 'magic-knights': (['promotion', 'promoted', 'rank up', 'star award', 'stars', 'merit', 'vice-captain', 'junior magic knight', 'intermediate magic knight', 'senior magic knight', 'magic knight rank', 'join the magic knights', 'magic knights headquarters', 'squad hq', 'squad headquarters', 'mission report'], True),
 'nine-squads': (None, True),
 'factions-orgs': (['faction', 'factions', 'organization', 'guild', 'noble house', 'criminal', 'black market', 'join them'], True),
 'road-to-knights': (['entrance exam', 'magic knights exam', 'knights exam', 'take the exam'], True),
 'entrance-exam': (['entrance exam', 'exam grounds', 'raise their hand', 'raised his hand', 'raised her hand', 'captains watch', 'broom test'], True),
 'canon-runtime': (['/\\basta\\b/i', 'yuno', 'noelle', 'yami', 'julius', 'canon character', 'what would he do'], True),
 'cast-hage': (['/\\basta\\b/i', 'yuno', 'hage', 'father orsi', 'sister lily', 'revchi'], True),
 'cast-crown': (None, True),
 'cast-eotms': (None, True),
 'history-opening': (None, True),
 'history-later': (None, True),
 'era-start': (['starting era', 'which era', 'years before', 'years after', 'later era', 'after canon', 'far future', 'descendant'], True),
 'cast-foreign': (None, True),
 'missions-lore': (['mission', 'missions', 'assignment', 'deploy', 'deployed', 'contract', 'bounty', 'commission'], True),
 'relationships-lore': (['relationship', 'friendship', 'befriend', 'rival', 'rivals', 'rivalry', 'promise', 'promised', 'betray', 'betrayed', 'apologize', 'apologise', 'apology', 'argue', 'argument', 'grudge', '[merge npcs]'], True),
 'shops-gear': (['shop', 'shops', 'store', 'market stall', 'marketplace', 'browse', 'blacksmith', 'apothecary', 'armorer', 'weaponsmith', 'outfitter', 'tailor', 'browse the wares', 'general store', '[ui:buy]'], True),
 'geography-gazetteer': (['coordinates', 'how far', 'distance to', 'world map', '[ui:travel]', 'travel to', 'journey to'], True),
 'bc-bank-treasury-law': (['bank', 'banking', 'treasury', 'deposit', 'withdraw', 'savings', 'salary', 'payday', 'payslip', '[ui:bank]', 'account balance'], True),
 'bc-physical-inventory-law': (['[ui:item]', '[ui:buy]', 'backpack', 'satchel', 'pouch', 'inventory', 'carry weight', 'encumbered', 'overloaded', 'stow', 'pick up', 'picked up', 'storage chest', 'locker'], True),
 'bc-spell-mechanics-ledger': (['spell_events', '[ui:cast]', '[ui:freeform_cast]', 'receipt=cast', '/\\bcast(s|ing)?\\b/i', 'spell', 'spells', 'freeform', 'mana_reserve', 'npc caster'], True),
 'bc-visible-equipment-social-perception': (['undress', 'undressed', 'naked', 'underwear', 'change clothes', 'changed clothes', 'outfit', 'dressed', 'armor', 'armour', 'drawn weapon', 'unsheathe', 'draw my'], True),
}
def norm_kw(lst):
    out, seen = [], set()
    for k in lst:
        key = k if k.startswith('/') else k.lower()
        if key not in seen:
            seen.add(key); out.append(key)
    return out
for id, (kws, whole) in KW.items():
    e = E[id]
    if kws is None:
        kws = e['keywords']  # specific names already: just dedupe case variants
    e['keywords'] = norm_kw(kws)
    e['matchWholeWords'] = whole
    # substring keywords like '[UI:' must not be whole-word matched
    if any(k.startswith('[') or k.endswith(':') or k.startswith('(') for k in e['keywords']) and id in ('ui-action-protocol', 'ooc-commands'):
        e['matchWholeWords'] = False
# combat-only lore loads by state
E['combat-interactions'].update(conditions=[{"value": True, "operator": "eq", "variableId": "in_combat"}], keywords=[])
E['team-tactics']['conditions'] = [{"value": True, "operator": "eq", "variableId": "in_combat"}]
E['four-leaf-resonance']['conditions'] = [{"value": False, "operator": "eq", "variableId": "has_grimoire"}]

DROP = {'bc-spell-mechanics-ledger', 'bc-bank-treasury-law', 'greeting-prologue', 'core-response-contract', 'core-directives', 'core-knowledge-narration',
        'core-scene-presentation', 'core-time-costs', 'core-time-canon', 'core-magic-law', 'core-living-world',
        'core-phase-router', 'combat-live', 'bc-visible-equipment-social-perception', 'bc-physical-inventory-law',
        'post-turn-checklist', 'auto-sync-command', 'cot-bypass-directive-gate', 'example-turn', 'core-prime-law'}
lore = [e for e in w['entries'] if e['id'] not in DROP and e['section'] == 'chat-history']
w['entries'] = new_entries + lore + [bank, inv, vis, ledger]
ids = [e['id'] for e in w['entries']]
assert len(ids) == len(set(ids)), 'duplicate entry ids'

# ---------------------------------------------------------------- 4. variables
V = {v['id']: v for v in w['variables']}
READ_ONLY = ['character_created', 'creation_profile', 'sim_settings', 'player_age', 'routine', 'carry_state', 'appearance_state', 'equipment_activity']
for k in READ_ONLY:
    V[k]['aiAccess'] = 'read'
V['mana_reserve']['aiAccess'] = 'read'
V['mana_reserve']['behaviorRules'] = "Engine-owned mana pool; mana is its percentage. Never write it."
V['spell_events']['behaviorRules'] = "Push one unique kind=cast event per typed released cast and kind=impact events per target struck (see Spell Cost Bridge). The engine processes and clears them."
for k in ['equipment_event_seq', 'mk_payroll', 'bank_account', 'spell_ledger']:
    V[k]['aiAccess'] = 'none'
V['player_age']['behaviorRules'] = "Derived by the interface from birth_date and world_date."
V['routine']['behaviorRules'] = "Written by the routine editor. Read it for ROUTINE time."
V['equipment_activity']['behaviorRules'] = "Recent free UI equipment actions, already applied. Never replay or re-narrate them."
V['carry_state']['behaviorRules'] = "Derived by the interface from inventory, purse and body_profile. bands: comfortable · heavy (slower, more stamina) · overloaded (big travel/dodge/combat penalties) · immobile."
V['appearance_state']['behaviorRules'] = "Derived from worn inventory. The observable truth of the character's look; NPCs react only with sight lines, context and reason."
V['creation_profile']['behaviorRules'] = "The creation screen's record. Read it for the Life Begins Protocol."
V['sim_settings']['behaviorRules'] = "Player settings (settings panel). Obey every field."
V['character_created']['behaviorRules'] = "Set by the creation screen."
V['money']['behaviorRules'] = ("Yul value of cash carried in the purse (integer; never one coin per Yul, never mirrored as items). "
    "Use +/- for purchases and civilian pay. Knight salary and bank transfers are handled by the interface — never [money: +salary].")
V['inventory']['behaviorRules'] = ("Unique physical item instances: {id,name,qty,cond,weight,bulk,type,tags,slot,placement}. placement = "
    "{\"kind\":\"body\",\"slot\":\"back\"} | {\"kind\":\"container\",\"containerId\":\"it-id\",\"slotId\":\"main\"} | {\"kind\":\"loose\"} | "
    "{\"kind\":\"world\",\"area\":\"ground|home|storage|companion\",\"location\":\"exact place\"}. New items must fit a real slot; never conjure bags or move items remotely; "
    "the grimoire is never an inventory item. The interface normalizes records and handles UI moves, purchases and storage.")
V['mk_status']['behaviorRules'] = ("New recruits start at Junior Magic Knight, 5th Class regardless of birth. Promotion is institutional, never automatic (Junior/Intermediate/Senior × 5th→1st). "
    "merit = recognition; personal_stars = confirmed individual merit stars only (squad star totals are separate). Salary is paid by the interface — never credit it yourself.")
w['variables'].append({"id": "bank_summary", "name": "Bank summary", "type": "string", "category": "resource", "aiAccess": "read",
    "defaultValue": "No bank account.", "description": "Interface-maintained one-line summary of the bank account and knight pay.",
    "behaviorRules": "Bank savings and knight pay, kept by the interface. Usable only in person at a staffed bank or treasury; never mirrored into money."})
w['variables'].append({"id": "mk_bonus_requests", "name": "Knight bonus requests", "type": "json", "category": "resource",
    "defaultValue": [], "description": "Authorized one-time Magic Knight bonuses waiting for the payroll office.",
    "behaviorRules": "Push {\"id\",\"amount\",\"reason\",\"source\"} only for a genuinely authorized, funded one-time knight bonus (unique id). The interface pays it to the bank once and clears the list. Never also change money."})
for nid, nm, desc in [("chronicle_archive", "Chronicle archive", "Older chronicle pages kept for the player's Journal (not sent to the AI)."),
                      ("events_archive", "Resolved events archive", "Older resolved known_events kept for the Journal (not sent to the AI).")]:
    w['variables'].append({"id": nid, "name": nm, "type": "json", "category": "custom", "aiAccess": "none", "defaultValue": [], "description": desc})
V['chronicle']['behaviorRules'] = "Push {\"date\",\"title\",\"category\",\"summary\"} for genuine milestones only. The interface archives older pages automatically."
V['known_events']['behaviorRules'] = ("Push {\"id\",\"title\",\"when\",\"where\",\"kind\":\"upcoming|opportunity|news|rumor\",\"status\":\"known|missed|done|taken\"} when learned; "
    "update status when it resolves. The interface archives old resolved entries.")

V['shop_stock']['behaviorRules'] = ("[{id,name,price,qty,notes}] for the shop being browsed; [] when none. The first time a specific shop is seriously browsed, set its real, "
    "price-anchored stock (see Economy & Shops); on later visits reflect what is still there (sold/restocked), never regenerate. Set [] when the character leaves. The Market screen buys from it.")
V['world_truth']['behaviorRules'] = ("GM-only, never revealed. Record hidden facts the moment you decide them: .npcs, .rumors, .four_leaf, .exam, .settlement, "
    ".geo {\"<Place>\":{x,y,kingdom,realm,kind,reason,places}} for every GENERATED permanent place (before the character learns of it), and "
    ".houses {\"House <Surname>\":{tier,seat,standing,notes}} for every generated noble/royal house — check here before inventing a new one.")
V['known_locations']['behaviorRules'] = ("Push {name,kingdom,region,status:visited|known|rumored|approximate,notes,route,x,y} when learned; upgrade status on visiting. "
    "x/y = km from the Royal Capital (+x east, +y north): copy from the gazetteer for canon places or from world_truth.geo for generated ones; never move a place once used.")
# battle arena + generated map
V['combat']['behaviorRules'] = ("While fighting: {\"active\":true,\"location\",\"participants\":[{\"name\",\"key\",\"side\",\"threat\":\"weak|average|strong|elite|captain\",\"kind\":\"brute|caster|beast\",\"attribute\",\"condition\",\"distance\",\"notes\"}],\"objectives\":[],\"hazards\":[]} "
    "— only what the character can perceive (threat/kind = honest read of the foe; the battle arena uses them). Reset to {\"active\":false} when it ends.")
V['known_locations']['behaviorRules'] += (" If exact coordinates are unknown, give \"near\":\"<known place>\",\"dir\":\"N|NE|E|SE|S|SW|W|NW\",\"km\":<number> instead — the interface draws its map from these.")
combat['content'] += ("\nARENA: the player may settle a fight in the interface's battle arena instead of turn-by-turn. A [UI:BATTLE] message then reports the outcome; "
    "its results are already applied.")
uiap = E['ui-action-protocol']
uiap['content'] += (" [UI:BATTLE] outcome · foes · duration · damage → the fight was played out in the battle arena and the interface has ALREADY applied vitality, stamina, fatigue, mana, "
    "mana_reserve, conditions, in_combat, combat and world_time — do not write those or spell_events for it. Narrate the decisive moments and aftermath consistent with the report "
    "(who fell, fled or yielded), then update relationships, world_truth, loot, missions and everything else as usual.")
for nid, nm, typ, dv, desc in [("battle_log", "Battle record", "json", [], "Arena fight results kept for the Crown page (not sent to the AI)."),
                               ("spar_practice", "Spar practice", "json", {}, "Per-day spar progress tracker used by the interface (not sent to the AI).")]:
    w['variables'].append({"id": nid, "name": nm, "type": typ, "category": "custom", "aiAccess": "none", "defaultValue": dv, "description": desc})
V['last_train_report']['behaviorRules'] = "When a training block resolves, set exactly \"hours=<number>;interrupted=<true|false>\" (actual training time this reply). The interface then applies stamina, mana, fatigue and the clock — don't write those. Otherwise leave \"\"."
V['last_travel_report']['behaviorRules'] = "When a travel leg resolves, set exactly \"hours=<number>;interrupted=<true|false>\" (actual travel time this reply). The interface then applies stamina, mana, fatigue and the clock; you still write current_location, known_locations, food and money. Otherwise leave \"\"."

# ---------------------------------------------------------------- 5. rules & reactions
R = {r['id']: r for r in w['rules']}
R['rule-combat-on']['actions'] = [a for a in R['rule-combat-on']['actions'] if a['type'] != 'toggle-entry']
R['rule-combat-on']['description'] = "Announces combat; the Combat Engine lore loads by state while in_combat is true."
R['rule-combat-off']['actions'] = [a for a in R['rule-combat-off']['actions'] if a['type'] != 'toggle-entry'] + [
    {"type": "modify-variable", "variableId": "combat", "operation": "set", "value": {"active": False}}]
R['rule-combat-off']['description'] = "Clears the combat tracker and prompts the aftermath."
R['rule-sync-sweep']['actions'][0]['message'] = ("SYNC SWEEP (every 12 turns, silent): reconcile time/date, location, inventory placement, money, conditions, relationships, missions, "
    "known_events and chronicle with the last several turns. Emit only directives the fiction clearly established; invent nothing; don't mention the sweep.")
R['bc-payroll-ui-authority']['actions'][0]['message'] = ("PAYROLL: monthly knight salary is paid to the bank by the interface from the in-world calendar — never credit it. "
    "On a real promotion update mk_status.rank; on individually awarded merit stars update mk_status.personal_stars. A genuinely authorized one-time bonus goes to mk_bonus_requests only.")
w['rules'] = [r for r in w['rules'] if r['id'] not in ('rule-every-turn-directive-gate', 'bc-physical-inventory-guard')]
for r in w['rules']:
    for k in ('maxFireCount', 'cooldownTurns'):
        if r.get(k) is None: r.pop(k, None)
w['reactions'] = [x for x in w['reactions'] if x['id'] != 'full-sync-sweep']
CREATED = {"value": True, "operator": "eq", "variableId": "character_created"}
NOFIGHT = {"value": False, "operator": "eq", "variableId": "in_combat"}
w['reactions'] += [
 {"id": "world-churn-roll", "name": "World Churn (engine roll)", "enabled": True, "priority": 10, "chance": 12, "cooldownTurns": 6,
  "description": "Engine-side dice, no extra AI call: about one turn in eight (never twice within six turns) the narrator is told to surface one small piece of independent world life.",
  "when": {"eventType": "turn:complete"}, "conditions": [CREATED, NOFIGHT], "conditionLogic": "all",
  "then": [{"type": "emit", "event": {"type": "ai:context", "role": "system", "message":
    "WORLD CHURN (engine roll): in the next reply, where the character could plausibly notice it, let ONE small piece of independent world life surface — "
    "an overheard rumor, a minor local event, a known NPC acting on their own goals, news or a letter from elsewhere, a shift in prices or supply, or a stranger with a problem. "
    "Pick what fits this place and hour, vary it from last time, keep it brief and organic. Not a quest; the player may ignore it. Record anything lasting in state."}}]},
 {"id": "new-day-weather", "name": "New Day — Weather & Schedules", "enabled": True, "priority": 5,
  "description": "When the date changes, remind the narrator once to roll the weather forward and let schedules move.",
  "when": {"eventType": "state:changed", "match": {"variableId": {"value": "world_date", "operator": "eq"}}}, "conditions": [CREATED], "conditionLogic": "all",
  "then": [{"type": "emit", "event": {"type": "ai:context", "role": "system", "message":
    "NEW DAY: carry the weather forward for this season and region with small variation (write weather if it changed), and let NPC schedules, shop hours and pending deadlines move with the date."}}]},
]

# ---------------------------------------------------------------- 6. settings & metadata
w['settings'].update({
    "maxTokens": 12000,
    "lorebookScanDepth": 2,
    "historyLimit": 30,
    "storySummary": {"enabled": True, "focus": "Keep: where the character lives and is now, the date, injuries and conditions, money owed or promised, "
        "every promise, debt and favor (who owes whom), how each named NPC feels about the character and why, grimoire/spell milestones, "
        "squad and rank changes, crimes and witnesses, and every way the story has diverged from canon."},
})
w["version"] = "21.6.4"
w['description'] = d['description'] + \
    " | v21.5: leaner prompt (about half the always-on rules, tighter lore triggers, summary + latest 30 messages), engine-rolled world events, reorganized interface. | v21.6.4: bottom bar always above page content. v21.6.3: always-present back button. v21.6.2: renamed interface sections, hosted art. v21.6: real-time battle arena (fights and spars, no AI turn spent), a world map the interface draws from the story's own descriptions."

# ---------------------------------------------------------------- 7. interface files
files = w['rootComponent']['files']
for n in sorted(os.listdir(os.path.join(HERE, 'ui'))):
    files[n] = open(os.path.join(HERE, 'ui', n)).read()
json.dump(w, open(dst, 'w'), ensure_ascii=False, indent=None, separators=(',', ':'))
print('entries', len(w['entries']), 'vars', len(w['variables']), 'rules', len(w['rules']), 'reactions', len(w['reactions']))
