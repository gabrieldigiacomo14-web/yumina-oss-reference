function World({v,api}:{v:any,api?:any}){
 var locs=safeObj(v['known-locations']);
 // records may carry x/y or xy:[x,y] (the format the lore asks the narrator for), and kind or type
 var vals=(Object.entries(locs) as any[]).map(([id,l]:any)=>{var r={id,...(l||{})};if(Array.isArray(r.xy)&&r.x==null){r.x=r.xy[0];r.y=r.xy[1];}if(!r.kind&&r.type)r.kind=r.type;return r;}).filter((l:any)=>l&&l.discovered!==false);
 var px=Number(v['player-x'])||0, py=Number(v['player-y'])||0;
 var kindIcon=(k:any)=>{var s=String(k||'').toLowerCase();if(s.includes('capital'))return '♛';if(s.includes('city'))return '◆';if(s.includes('town'))return '■';if(s.includes('village')||s.includes('hamlet')||s.includes('settlement'))return '●';if(s.includes('dungeon')||s.includes('ruin')||s.includes('tomb'))return '☠';if(s.includes('fort')||s.includes('keep')||s.includes('tower'))return '⛫';if(s.includes('port')||s.includes('harbor'))return '⚓';return '✦';};
 return <div className="screen">
  <Card title="Current Position">
   <div className="coords">({px}, {py})</div>
   <p>{v['current-location']} — {v['current-region']}</p>
   {v['current-sublocation']&&v['current-sublocation']!=='Unassigned'?<small>{v['current-sublocation']}</small>:null}
   <div className="scaleFacts"><span>1 coordinate = 1 mile</span><span>Aurelia City is (0, 0)</span></div>
  </Card>
  <WorldMap v={v} api={api}/>
  <Card title={'Discovered & Mapped Locations ('+vals.length+')'}>
   {vals.length?vals.sort((a:any,b:any)=>String(a.region||'').localeCompare(String(b.region||''))||String(a.name||'').localeCompare(String(b.name||''))).map((l:any)=><div className="row" key={l.id}><span>{kindIcon(l.kind)} {l.name||l.id}<small>{l.kind?' '+l.kind:''}{l.region?' • '+l.region:''}{l.visited===false?' • known, not visited':''}</small></span><small>{l.x!=null?'('+l.x+', '+l.y+')':''}</small></div>):<Empty>No mapped discoveries yet.</Empty>}
  </Card>
 </div>
}
