function World({v,api}:{v:any,api?:any}){
 var locs=safeObj(v['known-locations']);
 // records may carry x/y or xy:[x,y] (the format the lore asks the narrator for), and kind or type
 var vals=(Object.entries(locs) as any[]).map(([id,l]:any)=>{var r={id,...(l||{})};if(Array.isArray(r.xy)&&r.x==null){r.x=r.xy[0];r.y=r.xy[1];}if(!r.kind&&r.type)r.kind=r.type;return r;}).filter((l:any)=>l&&l.discovered!==false);
 var px=Number(v['player-x'])||0, py=Number(v['player-y'])||0;
 var kindIcon=(k:any)=>{var s=String(k||'').toLowerCase();if(s.includes('capital'))return '♛';if(s.includes('city'))return '◆';if(s.includes('town'))return '■';if(s.includes('village')||s.includes('hamlet')||s.includes('settlement'))return '●';if(s.includes('dungeon')||s.includes('ruin')||s.includes('tomb'))return '☠';if(s.includes('fort')||s.includes('keep')||s.includes('tower'))return '⛫';if(s.includes('port')||s.includes('harbor'))return '⚓';return '✦';};
 var go=useNav(); var sub=v['current-sublocation']&&v['current-sublocation']!=='Unassigned'?v['current-sublocation']:'';
 var kindIc=(k:any)=>{var s=String(k||'').toLowerCase();return /capital|city/.test(s)?'crown':/town|village|hamlet|settlement/.test(s)?'home':/dungeon|ruin|tomb|cave/.test(s)?'skull':/fort|keep|tower/.test(s)?'shield':/port|harbou?r/.test(s)?'map':'spark';};
 return <div className="screen ledger">
  <Panel className="posCard">
   <div className="posRow"><div className="coordSeal"><small>miles from Aurelia City</small><b>{'('+px+', '+py+')'}</b></div>
    <div className="heroWho"><b className="heroName">{v['current-location']||'Unknown'}</b><small>{[sub,v['current-region']].filter(Boolean).join(' · ')}</small>
     <div className="heroChips"><span className="tag">1 coordinate = 1 mile</span><span className="tag">{vals.length+' places known'}</span></div></div></div>
  </Panel>
  <WorldMap v={v} api={api}/>
  <Panel title="Places you know" sub="Sorted by region" icon="map">
   {vals.length?<div className="tileGrid">{vals.sort((a:any,b:any)=>String(a.region||'').localeCompare(String(b.region||''))||String(a.name||'').localeCompare(String(b.name||''))).map((l:any)=><Rec key={l.id} icon={kindIc(l.kind)} title={l.name||l.id} line={[l.kind?titleCase(String(l.kind)):'',l.region,l.visited===false?'known, not visited':''].filter(Boolean).join(' · ')} right={l.x!=null?'('+l.x+', '+l.y+')':''}/>)}</div>:<Empty>No mapped discoveries yet.</Empty>}
  </Panel>
 </div>
}
