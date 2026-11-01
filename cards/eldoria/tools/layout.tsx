
/* ---------- layout: phone portrait, phone landscape, desktop ----------
   Picked from the screen size (the iframe Yumina gives the card), or fixed by the
   player in Settings → Display. The mode is a class on .app; the CSS does the rest. */
/* the narrowest of the widths the browser reports, so a phone is never mistaken for a wide screen */
function measureScreen(){
 var ws=[window.innerWidth,document.documentElement&&document.documentElement.clientWidth,(window as any).visualViewport&&(window as any).visualViewport.width].map(Number).filter((n:number)=>n>0);
 var hs=[window.innerHeight,(window as any).visualViewport&&(window as any).visualViewport.height].map(Number).filter((n:number)=>n>0);
 return {w:Math.round(ws.length?Math.min(...ws):390),h:Math.round(hs.length?Math.min(...hs):844)};
}
function useLayoutMode(api:any){
 const [pref,setPref]=React.useState('auto');
 const [dims,setDims]=React.useState(()=>measureScreen());
 React.useEffect(()=>{
   var alive=true;
   try{var r=api.storage&&api.storage.get?api.storage.get('eldoria-layout-v1'):null;Promise.resolve(r).then((raw:any)=>{if(alive&&raw&&/^(auto|portrait|landscape|desktop)$/.test(raw))setPref(raw);}).catch(()=>{});}catch(_e){}
   return ()=>{alive=false;};
 },[]);
 React.useEffect(()=>{
   function on(){setDims(measureScreen());}
   var vv=(window as any).visualViewport; if(vv)vv.addEventListener('resize',on);
   window.addEventListener('resize',on);window.addEventListener('orientationchange',on);
   var t=setTimeout(on,400);
   return ()=>{clearTimeout(t);if(vv)vv.removeEventListener('resize',on);window.removeEventListener('resize',on);window.removeEventListener('orientationchange',on);};
 },[]);
 var auto=dims.w>=1024&&dims.h>=560?'desktop':(dims.w>dims.h&&dims.h<=600)?'landscape':'portrait';
 // a chosen layout is only used where it fits: desktop puts a 232px sidebar and a 290px status panel around the
 // page, so on a phone it would leave the page itself no width (and no way back to Settings)
 var MIN_W:any={portrait:0,landscape:560,desktop:900};
 function fits(m:string){ return dims.w>=(MIN_W[m]||0); }
 var mode=pref==='auto'||!fits(pref)?auto:pref;
 function choose(m:string){setPref(m);try{api.storage&&api.storage.set&&api.storage.set('eldoria-layout-v1',m);}catch(_e){}}
 return {mode,pref,auto,choose,fits,width:dims.w,MIN_W};
}
var ELDORIA_UI_VERSION='21.6.0';
var LAYOUT_NAMES:any={portrait:'Phone (portrait)',landscape:'Phone (landscape)',desktop:'Desktop'};
function LayoutCard({layout}:{layout:any}){
 return <Panel title="Display" sub="Which layout Eldoria uses" icon="cog">
   <p className="muted">Eldoria picks a layout from your screen. Choose one here to keep it while the screen is big enough for it; on a smaller screen Eldoria falls back to the automatic choice.</p>
   {layout.pref!=='auto'&&!layout.fits(layout.pref)?<p className="warnLine">{LAYOUT_NAMES[layout.pref]+' needs a screen at least '+layout.MIN_W[layout.pref]+' px wide; this one is '+layout.width+' px, so '+LAYOUT_NAMES[layout.mode]+' is used here.'}</p>:null}
   <p className="uiVersion">{'Interface v'+ELDORIA_UI_VERSION+' · layout now: '+LAYOUT_NAMES[layout.mode]}</p>
   <div className="layoutPick">{[['auto','Automatic'],['portrait','Phone (portrait)'],['landscape','Phone (landscape)'],['desktop','Desktop']].map(o=><button key={o[0]} type="button" className={'layoutOpt'+(layout.pref===o[0]?' on':'')+(o[0]!=='auto'&&!layout.fits(o[0])?' cant':'')} aria-pressed={layout.pref===o[0]} onClick={()=>layout.choose(o[0])}><b>{o[1]}</b>{o[0]==='auto'?<small>{'Right now: '+LAYOUT_NAMES[layout.auto]}</small>:!layout.fits(o[0])?<small>{'Needs '+layout.MIN_W[o[0]]+' px or wider'}</small>:null}</button>)}</div>
 </Panel>
}
/* desktop only: the scene at a glance, beside the story */
function SidePanel({v,setScreen}:{v:any,setScreen:any}){
 var conds=safeArr(v.conditions).concat(safeArr(v.injuries));
 var party=safeArr(v.party);
 var sub=v['current-sublocation']&&v['current-sublocation']!=='Unassigned'?v['current-sublocation']:'';
 return <aside className="sidePanel" aria-label="Status">
   <div className="sideCard"><small>Where</small><b>{v['current-location']||'Unknown'}</b><span>{[sub,v['current-region']].filter(Boolean).join(' · ')}</span></div>
   <div className="sideCard"><small>When</small><b>{displayWorldTime(v['world-time'])}</b><span>{v['world-date']}</span><span className="sideDim">{[v.season,v.weather,v['moon-phase']].filter(Boolean).join(' • ')}</span></div>
   <div className="sideCard sideStats"><Meter label="Health" cur={v['player-hp']} max={v['player-max-hp']} kind="hp" icon="heart" word={vitalWord(v['player-hp'],v['player-max-hp'])}/><Meter label="Mana" cur={v['player-mana']} max={v['player-max-mana']} kind="mp" icon="drop"/><Meter label="Stamina" cur={v['player-stamina']} max={v['player-max-stamina']} kind="sp" icon="bolt"/></div>
   <div className="sideCard sideRank"><div><small>Level</small><b>{v['player-level']}</b></div><div><small>Rank</small><b>{v['guild-rank']||'—'}</b></div><div><small>Purse</small><b>{money(Number(v['player-money-cp'])||0)}</b></div><div><small>Load</small><b>{v.encumbrance||'—'}</b></div></div>
   {conds.length?<div className="sideCard"><small>Conditions</small>{conds.slice(0,5).map((c:any,i:number)=><span key={i}>{typeof c==='string'?c:(c.name||c.title||c.type||'Condition')}</span>)}</div>:null}
   {party.length?<div className="sideCard"><small>Company</small>{party.slice(0,6).map((m:any,i:number)=><span key={i}>{typeof m==='string'?m:(m.name||'Companion')}</span>)}</div>:null}
   <button type="button" className="sideMapBtn" onClick={()=>setScreen('world')}><ElIcon n="map" s={15}/>Open the map</button>
 </aside>
}
