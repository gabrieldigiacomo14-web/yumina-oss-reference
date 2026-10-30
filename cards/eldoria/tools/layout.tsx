
/* ---------- layout: phone portrait, phone landscape, desktop ----------
   Picked from the screen size (the iframe Yumina gives the card), or fixed by the
   player in Settings → Display. The mode is a class on .app; the CSS does the rest. */
function useLayoutMode(api:any){
 const [pref,setPref]=React.useState('auto');
 const [dims,setDims]=React.useState(()=>({w:window.innerWidth||390,h:window.innerHeight||844}));
 React.useEffect(()=>{
   var alive=true;
   try{var r=api.storage&&api.storage.get?api.storage.get('eldoria-layout-v1'):null;Promise.resolve(r).then((raw:any)=>{if(alive&&raw&&/^(auto|portrait|landscape|desktop)$/.test(raw))setPref(raw);}).catch(()=>{});}catch(_e){}
   return ()=>{alive=false;};
 },[]);
 React.useEffect(()=>{
   function on(){setDims({w:window.innerWidth||390,h:window.innerHeight||844});}
   window.addEventListener('resize',on);window.addEventListener('orientationchange',on);
   return ()=>{window.removeEventListener('resize',on);window.removeEventListener('orientationchange',on);};
 },[]);
 var auto=dims.w>=1024&&dims.h>=560?'desktop':(dims.w>dims.h&&dims.h<=600)?'landscape':'portrait';
 var mode=pref==='auto'?auto:pref;
 function choose(m:string){setPref(m);try{api.storage&&api.storage.set&&api.storage.set('eldoria-layout-v1',m);}catch(_e){}}
 return {mode,pref,auto,choose};
}
var LAYOUT_NAMES:any={portrait:'Phone (portrait)',landscape:'Phone (landscape)',desktop:'Desktop'};
function LayoutCard({layout}:{layout:any}){
 return <Card title="Display">
   <p className="muted">Eldoria picks a layout from your screen. Choose one here to keep it whatever the screen does.</p>
   <div className="layoutPick">{[['auto','Automatic'],['portrait','Phone (portrait)'],['landscape','Phone (landscape)'],['desktop','Desktop']].map(o=><button key={o[0]} type="button" className={'layoutOpt'+(layout.pref===o[0]?' on':'')} aria-pressed={layout.pref===o[0]} onClick={()=>layout.choose(o[0])}><b>{o[1]}</b>{o[0]==='auto'?<small>{'Right now: '+LAYOUT_NAMES[layout.auto]}</small>:null}</button>)}</div>
 </Card>
}
/* desktop only: the scene at a glance, beside the story */
function SidePanel({v,setScreen}:{v:any,setScreen:any}){
 var conds=safeArr(v.conditions).concat(safeArr(v.injuries));
 var party=safeArr(v.party);
 var sub=v['current-sublocation']&&v['current-sublocation']!=='Unassigned'?v['current-sublocation']:'';
 return <aside className="sidePanel" aria-label="Status">
   <div className="sideCard"><small>Where</small><b>{v['current-location']||'Unknown'}</b><span>{[sub,v['current-region']].filter(Boolean).join(' · ')}</span></div>
   <div className="sideCard"><small>When</small><b>{displayWorldTime(v['world-time'])}</b><span>{v['world-date']}</span><span className="sideDim">{[v.season,v.weather,v['moon-phase']].filter(Boolean).join(' • ')}</span></div>
   <div className="sideCard sideStats"><StatPill name="HP" cur={v['player-hp']} max={v['player-max-hp']} kind="hp"/><StatPill name="MP" cur={v['player-mana']} max={v['player-max-mana']} kind="mp"/><StatPill name="SP" cur={v['player-stamina']} max={v['player-max-stamina']} kind="sp"/></div>
   <div className="sideCard sideRank"><div><small>Level</small><b>{v['player-level']}</b></div><div><small>Rank</small><b>{v['guild-rank']||'—'}</b></div><div><small>Purse</small><b>{money(Number(v['player-money-cp'])||0)}</b></div><div><small>Load</small><b>{v.encumbrance||'—'}</b></div></div>
   {conds.length?<div className="sideCard"><small>Conditions</small>{conds.slice(0,5).map((c:any,i:number)=><span key={i}>{typeof c==='string'?c:(c.name||c.title||c.type||'Condition')}</span>)}</div>:null}
   {party.length?<div className="sideCard"><small>Company</small>{party.slice(0,6).map((m:any,i:number)=><span key={i}>{typeof m==='string'?m:(m.name||'Companion')}</span>)}</div>:null}
   <button type="button" className="sideMapBtn" onClick={()=>setScreen('world')}>⌖ Open the map</button>
 </aside>
}
