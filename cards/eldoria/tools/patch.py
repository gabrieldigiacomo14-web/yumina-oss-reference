"""Builds ui/index.tsx from the card's original interface file plus Eldoria's new parts.
Usage: python3 -I patch.py <original index.tsx> <ui dir>"""
import sys, os, re, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
src, out_dir = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read().replace('\r\n', '\n')
def P(name): return open(os.path.join(HERE, name), encoding='utf-8').read()
def sub(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, 'expected %d, found %d: %r' % (n, c, old[:90])
    s = s.replace(old, new)
def remove_fn(name):
    """drop a top-level function, up to the next top-level declaration or comment"""
    global s
    i = s.index('\nfunction ' + name + '(')
    m = re.compile(r'\n(?=function |var |const |// |/\*)').search(s, i + 1)
    s = s[:i] + s[m.start():]

# ---- screens rebuilt in the card-and-tile style (redesign-*.tsx replace them)
for name in ('Adventure', 'Character', 'Skills', 'Inventory', 'Magic', 'Quests', 'More',
             'QuestBoards', 'Guild', 'Party', 'Training', 'Callings', 'Banking', 'Factions', 'Crafting', 'Markets', 'Shops',
             'Conditions', 'Journal', 'Codex', 'LivingEvents', 'PoliticsScreen', 'FaithsScreen', 'NewsScreen', 'Chronicle',
             'ToggleRow', 'AudioSettings', 'World'):
    remove_fn(name)
sub(" more:['✥','Eldoria Ledger','Choose another record']",
    " more:['✥','All Records','Every other part of your ledger'],\n home:['✦','The Ledger','Who you are, and every record']")

# ---- layout (phone portrait / phone landscape / desktop), the Ledger shell and the new screens
sub("function App(){", P('layout.tsx') + P('redesign-shell.tsx') + P('redesign-story.tsx') + P('redesign-screens.tsx') + P('redesign-records.tsx') + P('world.tsx') + "\nfunction App(){")
sub("const [tsOpen,setTsOpen]=React.useState(false);",
    "const [tsOpen,setTsOpen]=React.useState(false);\n const [reading,setReadingState]=React.useState(false);\n"
    " React.useEffect(()=>{ try{ var r=api.storage&&api.storage.get?api.storage.get('eldoria-reading-v1'):null; Promise.resolve(r).then((x:any)=>{ if(x==='1')setReadingState(true); }).catch(()=>{}); }catch(_e){} },[]);\n"
    " function setReading(on:boolean){ setReadingState(on); try{ api.storage&&api.storage.set&&api.storage.set('eldoria-reading-v1',on?'1':'0'); }catch(_e){} }")
sub("if(!v['character-created']) return <><style>{CSS}</style><Creator api={api}/></>;",
    "const lay=useLayoutMode(api);\n if(!v['character-created']) return <><style>{CSS}</style><Creator api={api}/></>;")
sub("if(screen==='adventure')body=<Adventure api={api} v={v}/>;",
    "if(screen==='home')body=<Hub api={api} v={v}/>; else if(screen==='adventure')body=<Adventure api={api} v={v} reading={reading}/>;")
sub("body=<Magic v={v}/>", "body=<Magic api={api} v={v}/>")
sub("body=<Quests v={v}/>", "body=<Quests api={api} v={v}/>")
sub("screen==='audio')body=<AudioSettings prefs={audioPrefs} onChange={changeAudioPref}/>",
    "screen==='audio')body=<AudioSettings prefs={audioPrefs} onChange={changeAudioPref} layout={lay}/>")
sub(" audio:['♫','Sound Chamber','Choose which parts of Eldoria you hear'],", " audio:['♫','Settings','Display and sound'],")
sub("['audio','Audio']];", "['audio','Settings']];")
# the old shell (banner, emoji nav) is replaced by Shell; the Ledger shell keeps the same grid rows
i0 = s.index(" var meta=SCREEN_META[screen]||['✦',titleCase(screen),''];\n return <><style>{CSS}</style>")
i1 = s.index("</nav></div></>;\n}", i0) + len("</nav></div></>;\n}")
s = s[:i0] + (" return <NavCtx.Provider value={setScreen}><style>{CSS}</style><style>{WORLDMAP_CSS}</style>"
              "<Shell api={api} v={v} screen={screen} setScreen={setScreen} lay={lay} tsOpen={tsOpen} setTsOpen={setTsOpen} body={body} reading={reading} setReading={setReading}/></NavCtx.Provider>;\n}") + s[i1:]

sub(" chronicle:['❦','Chronicle','History your character has learned'],", " chronicle:['❦','History','What your character has learned of the past'],")
# the CSS block is one template literal; the new rules go at its end so they win
assert '`' not in P('redesign.css') + P('layout.css')
end = s.rindex('`;\nexport default App;')
s = s[:end] + P('layout.css') + P('redesign.css') + s[end:]

# ---- the world map: Black Clover's generated map, rebuilt for Eldoria (el-cartography.js, el-worldmap.tsx)
sub("// Built-ins (MessageList, MessageInput, useYumina) are provided by Yumina.\n",
    "// Built-ins (MessageList, MessageInput, useYumina) are provided by Yumina.\nimport { WorldMap, WORLDMAP_CSS } from \"./el-worldmap\";\n")
sub("screen==='world')body=<World v={v}/>", "screen==='world')body=<World v={v} api={api}/>")

os.makedirs(out_dir, exist_ok=True)
for extra in ('el-cartography.js', 'el-worldmap.tsx'):
    shutil.copy(os.path.join(HERE, extra), os.path.join(out_dir, extra))
open(os.path.join(out_dir, 'index.tsx'), 'w', encoding='utf-8').write(s)
print('ok', len(s))
