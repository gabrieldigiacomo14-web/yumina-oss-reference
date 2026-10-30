"""Builds ui/index.tsx from the card's original interface file plus Eldoria's new parts.
Usage: python3 -I patch.py <original index.tsx> <ui dir>"""
import sys, os, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
src, out_dir = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read().replace('\r\n', '\n')
def P(name): return open(os.path.join(HERE, name), encoding='utf-8').read()
def sub(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, 'expected %d, found %d: %r' % (n, c, old[:90])
    s = s.replace(old, new)

# ---- layout: phone portrait / phone landscape / desktop
sub("function App(){", P('layout.tsx') + "\nfunction App(){")
sub("if(!v['character-created']) return <><style>{CSS}</style><Creator api={api}/></>;",
    "const lay=useLayoutMode(api);\n if(!v['character-created']) return <><style>{CSS}</style><Creator api={api}/></>;")
sub("<div className={'app screenTheme theme-'+screen}>", "<div className={'app screenTheme theme-'+screen+' lay-'+lay.mode}>")
sub('</main><div className="composer">', '</main><SidePanel v={v} setScreen={setScreen}/><div className="composer">')
sub("screen==='audio')body=<AudioSettings prefs={audioPrefs} onChange={changeAudioPref}/>",
    "screen==='audio')body=<AudioSettings prefs={audioPrefs} onChange={changeAudioPref} layout={lay}/>")
sub("function AudioSettings({prefs,onChange}:{prefs:any,onChange:any}){\n return <div className=\"screen audioScreen\">",
    "function AudioSettings({prefs,onChange,layout}:{prefs:any,onChange:any,layout?:any}){\n return <div className=\"screen audioScreen\">\n   {layout?<LayoutCard layout={layout}/>:null}")
sub(" audio:['♫','Sound Chamber','Choose which parts of Eldoria you hear'],", " audio:['♫','Settings','Display and sound']," )
sub("['audio','Audio']];", "['audio','Settings']];")
sub("{MORE.map(x=><button onClick={()=>setScreen(x[0])}>", "{MORE.map(x=><button key={x[0]} onClick={()=>setScreen(x[0])}>")
# the CSS block is one template literal; the layout rules go at its end so they win
end = s.rindex('`;\nexport default App;')
s = s[:end] + P('layout.css') + s[end:]


# ---- the world map: Black Clover's generated map, rebuilt for Eldoria (el-cartography.js, el-worldmap.tsx)
sub("// Built-ins (MessageList, MessageInput, useYumina) are provided by Yumina.\n",
    "// Built-ins (MessageList, MessageInput, useYumina) are provided by Yumina.\nimport { WorldMap, WORLDMAP_CSS } from \"./el-worldmap\";\n")
i0 = s.index("function World({v}:{v:any}){")
i1 = s.index("function Callings({v}:{v:any}){")
s = s[:i0] + P('world.tsx') + s[i1:]
sub("screen==='world')body=<World v={v}/>", "screen==='world')body=<World v={v} api={api}/>")
sub("return <><style>{CSS}</style><div className={'app screenTheme", "return <><style>{CSS}</style><style>{WORLDMAP_CSS}</style><div className={'app screenTheme")

os.makedirs(out_dir, exist_ok=True)
for extra in ('el-cartography.js', 'el-worldmap.tsx'):
    shutil.copy(os.path.join(HERE, extra), os.path.join(out_dir, extra))
open(os.path.join(out_dir, 'index.tsx'), 'w', encoding='utf-8').write(s)
print('ok', len(s))
