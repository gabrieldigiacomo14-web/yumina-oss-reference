
/* ---------- The Ledger: the hub. Who you are at a glance, and a tile for every record ---------- */
function activeQuests(v:any){ return safeArr(v['quest-log']).filter((q:any)=>q&&!/^(complete|completed|failed|abandoned|done|turned in)$/i.test(String(q.status||''))); }
function loadInfo(v:any){
 var inv=safeArr(v.inventory), eq=safeObj(v.equipment), str=Number(safeObj(v.attributes).strength)||10;
 var wt=inv.reduce((n:number,it:any)=>n+(Number(it.weight)||0)*(Number(it.qty)||1),0);
 var bonus=0; if(eq.pack){ var p=inv.find((x:any)=>x.id===eq.pack); bonus=Number(p&&p.capacityBonus)||20; }
 return {wt:Math.round(wt*10)/10,cap:str*8+bonus,free:str*4+bonus};
}
function Hub({api,v}:{api:any,v:any}){
 var go=useNav(); const [portrait,setPortrait]=usePortrait(api);
 var xp=Number(v['player-xp'])||0, lvl=Number(v['player-level'])||1, lo=xpForLevel(lvl), hi=xpForLevel(lvl+1);
 var skills=safeObj(v.skills), sk=Object.keys(skills), top=sk.slice().sort((a,b)=>(Number(skills[b].level)||1)-(Number(skills[a].level)||1))[0];
 var spells=Object.keys(safeObj(v['known-spells'])), q=activeQuests(v), party=safeArr(v.party), notes=safeArr(v['player-notes']);
 var calls=Object.values(safeObj(v.callings)) as any[], conds=safeArr(v.conditions).length+safeArr(v.injuries).length;
 var ap=Number(v['attribute-points'])||0, ld=loadInfo(v), eqN=Object.entries(safeObj(v.equipment)).filter(([k,x]:any)=>k!=='tools'&&x).length;
 var ms=safeArr(api.messages), last=''; for(var i=ms.length-1;i>=0;i--){ if(ms[i]&&ms[i].role==='assistant'){ last=parseScene(ms[i].content).blocks.filter((b:any)=>b.kind!=='roll').map((b:any)=>b.body).join(' ').replace(/[*_#>`]/g,'').slice(0,150); break; } }
 function pick(e:any){ var f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f)return; readImageFile(f,480,600,(err:string,data:string)=>{ if(err){ try{api.showToast&&api.showToast(err,'error');}catch(_e){} } else setPortrait(data); }); }
 return <div className="screen hub">
  <Panel className="heroCard">
   <div className="heroRow">
    <Portrait url={portrait} name={v['player-name']} size={78} onPick={pick}/>
    <div className="heroWho">
     <b className="heroName">{v['player-name']||'Adventurer'}</b>
     <small>{[v['player-title'],v['player-species'],v['starting-calling']||v['player-class']].filter(Boolean).join(' · ')}</small>
     <div className="heroChips"><span className="tag">Level {lvl}</span><span className="tag rune">{v['guild-rank']||'Unregistered'}</span>{ap>0?<button type="button" className="tag hot" onClick={()=>go('character')}>{ap+' to spend'}</button>:null}</div>
     <div className="xpLine"><div className="meterBar"><i style={{width:clamp((xp-lo)/Math.max(1,hi-lo)*100,0,100)+'%'}}/></div><small>{xp+' / '+hi+' XP'}</small></div>
    </div>
   </div>
   <div className="heroMeters">
    <Meter label="Health" cur={v['player-hp']} max={v['player-max-hp']} kind="hp" icon="heart"/>
    <Meter label="Mana" cur={v['player-mana']} max={v['player-max-mana']} kind="mp" icon="drop"/>
    <Meter label="Stamina" cur={v['player-stamina']} max={v['player-max-stamina']} kind="sp" icon="bolt"/>
   </div>
  </Panel>
  <button type="button" className="resume" onClick={()=>go('adventure')}>
   <ElEmblem s={34}/><span><b>Return to the Chronicle</b><small>{last?last+(last.length>=150?'…':''):(v['current-location']||'Your story')+' · '+displayWorldTime(v['world-time'])}</small></span><ElIcon n="chev" s={16}/>
  </button>
  <div className="tileGrid">
   <Tile icon="hero" title="Hero" line={ap>0?ap+' advancement point'+(ap===1?'':'s')+' unspent':'Attributes, callings and background'} badge={ap>0?ap:''} onClick={()=>go('character')}/>
   <Tile icon="skills" title="Skills" line={sk.length?sk.length+' known · best: '+((skills[top]||{}).name||titleCase(top))+' '+(Number((skills[top]||{}).level)||1):'Nothing trained yet'} onClick={()=>go('skills')}/>
   <Tile icon="gear" title="Gear" line={money(v['player-money-cp'])+' · '+ld.wt+' lb · '+(v.encumbrance||'Unburdened')} badge={eqN||''} onClick={()=>go('inventory')}/>
   <Tile icon="magic" title="Magic" line={v['mana-awakened']?(spells.length?spells.length+' spell'+(spells.length===1?'':'s')+' known':'Awakened · no spells yet'):'Mana not yet awakened'} onClick={()=>go('magic')}/>
   <Tile icon="quest" title="Quests" line={q.length?(q[0].title||q[0].id)+(q.length>1?' · +'+(q.length-1)+' more':''):'No open obligations'} badge={q.length||''} onClick={()=>go('quests')}/>
   <Tile icon="map" title="Map" line={(v['current-location']||'Unknown')+(v['current-region']?' · '+v['current-region']:'')} onClick={()=>go('world')}/>
   <Tile icon="people" title="Party" line={party.length?party.map((m:any)=>typeof m==='string'?m:m.name).filter(Boolean).slice(0,3).join(', '):'Travelling alone'} badge={party.length||''} onClick={()=>go('party')}/>
   <Tile icon="spark" title="Callings" line={calls.length?calls.map((c:any)=>c.name).filter(Boolean).slice(0,3).join(', '):'No calling recorded'} onClick={()=>go('callings')}/>
   <Tile icon="crown" title="Guild" line={(v['guild-rank']||'Unregistered')+' · reputation '+(Number(v['guild-reputation'])>=0?'+':'')+(Number(v['guild-reputation'])||0)} onClick={()=>go('guild')}/>
   <Tile icon="heart" title="Wounds" line={conds?conds+' recorded':'No wounds or conditions'} badge={conds||''} onClick={()=>go('conditions')}/>
   <Tile icon="scroll" title="Journal" line={notes.length?notes.length+' note'+(notes.length===1?'':'s'):'Your own notes and goals'} onClick={()=>go('journal')}/>
   <Tile icon="more" title="All records" line="Boards, banking, markets, the world…" onClick={()=>go('more')}/>
  </div>
 </div>;
}

/* ---------- Hero ---------- */
function Character({api,v}:{api:any,v:any}){
 const [portrait,setPortrait]=usePortrait(api); var go=useNav();
 var a=safeObj(v.attributes), calls=safeObj(v.callings); var xp=Number(v['player-xp'])||0, lvl=Number(v['player-level'])||1, next=xpForLevel(lvl+1), cur=xpForLevel(lvl);
 var banked=Math.max(0,Number(v['attribute-points'])||0);
 const [draft,setDraft]=React.useState<any>({});
 const [open,setOpen]=React.useState('');
 var keys=ATTR_ORDER.concat(Object.keys(a).filter(k=>ATTR_ORDER.indexOf(k)<0));
 function baseOf(k:string){var n=Number(a[k]); return isFinite(n)?n:10;}
 function stagedOf(k:string){var n=Number(draft[k]); return isFinite(n)&&n>0?n:0;}
 function valueOf(k:string){return baseOf(k)+stagedOf(k);}
 function costOf(k:string){var val=baseOf(k),c=0,steps=stagedOf(k); for(var i=0;i<steps;i++){c+=attrStepCost(val);val++;} return c;}
 var spent=keys.reduce((n:number,k:string)=>n+costOf(k),0);
 var remaining=Math.max(0,banked-spent);
 function canRaise(k:string){var val=valueOf(k); if(val>=18)return false; return attrStepCost(val)<=remaining;}
 function raise(k:string){ if(!canRaise(k))return; setDraft((d:any)=>{var c={...d}; c[k]=(Number(c[k])||0)+1; return c;}); }
 function lower(k:string){ setDraft((d:any)=>{var n=Number(d[k])||0; if(n<=0)return d; var c={...d}; if(n-1<=0)delete c[k]; else c[k]=n-1; return c;}); }
 function confirm(){
   if(spent<=0)return;
   var na:any={...a}; var changed:string[]=[];
   keys.forEach(k=>{ if(stagedOf(k)){ na[k]=baseOf(k)+stagedOf(k); changed.push(titleCase(k)+' '+baseOf(k)+'→'+na[k]); } });
   api.setVariable('attributes',na);
   api.setVariable('attribute-points',Math.max(0,banked-spent));
   setDraft({});
   if(api.showToast)api.showToast('Advancement confirmed — '+changed.join(', '),'success');
   if(api.injectContext)api.injectContext('The player has just allocated banked advancement points through their own character sheet: '+changed.join('; ')+'. These attribute values are now authoritative. Do not offer to allocate points or ask where they should go — allocation is player-controlled. You may acknowledge the growth naturally in narration if the moment suits.');
 }
 function pick(e:any){ var f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f)return; readImageFile(f,480,600,(err:string,data:string)=>{ if(err){ try{api.showToast&&api.showToast(err,'error');}catch(_e){} } else setPortrait(data); }); }
 var callKeys=Object.keys(calls);
 var facts=[['Species',v['player-species']],['Gender',v['player-gender']],['Age',v['player-age']],['Origin',v['player-origin']],['Homeland',v['starting-realm']],['Calling',v['starting-calling']||v['player-class']]].filter((x:any)=>x[1]!=null&&String(x[1]).trim()!=='');
 return <div className="screen ledger">
  <Panel className="heroCard">
   <div className="heroRow">
    <Portrait url={portrait} name={v['player-name']} size={92} onPick={pick}/>
    <div className="heroWho">
     <b className="heroName">{v['player-name']||'Adventurer'}</b>
     <small>{v['player-title']||'No title yet'}</small>
     <div className="heroChips"><span className="tag">Level {lvl}</span><span className="tag rune">{v['guild-rank']||'Unregistered'}</span></div>
     <div className="xpLine"><div className="meterBar"><i style={{width:clamp((xp-cur)/Math.max(1,next-cur)*100,0,100)+'%'}}/></div><small>{xp+' / '+next+' XP to level '+(lvl+1)}</small></div>
     {portrait?<button type="button" className="linkBtn" onClick={()=>setPortrait('')}>Remove portrait</button>:<small className="hint">Tap + to add a portrait (kept on this device).</small>}
    </div>
   </div>
   <div className="heroMeters">
    <Meter label="Health" cur={v['player-hp']} max={v['player-max-hp']} kind="hp" icon="heart" word={vitalWord(v['player-hp'],v['player-max-hp'])}/>
    <Meter label="Mana" cur={v['player-mana']} max={v['player-max-mana']} kind="mp" icon="drop" word={v['mana-awakened']?poolWord(v['player-mana'],v['player-max-mana']):'Not awakened'}/>
    <Meter label="Stamina" cur={v['player-stamina']} max={v['player-max-stamina']} kind="sp" icon="bolt" word={poolWord(v['player-stamina'],v['player-max-stamina'])}/>
   </div>
   {facts.length?<div className="factGrid">{facts.map((f:any)=><div key={f[0]}><small>{f[0]}</small><b>{String(f[1])}</b></div>)}</div>:null}
  </Panel>

  <Panel title="Attributes" sub={banked>0?remaining+' of '+banked+' point'+(banked===1?'':'s')+' left to spend':'One point is banked each level'} icon="hero" action={banked>0?<span className="tag hot">{remaining}</span>:null}>
   <div className="attrTiles">{keys.map(k=>{
     var val=valueOf(k), mod=Math.floor((val-10)/2), st=stagedOf(k), cost=attrStepCost(val), maxed=val>=18;
     return <div key={k} className={'attrTile'+(st?' staged':'')}>
      <div className="attrHead"><span>{titleCase(k)}</span><small>{(mod>=0?'+':'')+mod}</small></div>
      <b className="attrVal">{val}{st?<i>{' +'+st}</i>:null}</b>
      <div className="attrNote">{ATTR_NOTE[k]||''}</div>
      {banked>0?<div className="attrCtl">
       <button type="button" className="apBtn" disabled={st<=0} onClick={()=>lower(k)} aria-label={'Lower '+titleCase(k)}>−</button>
       <span className="apCost">{maxed?'Ceiling':cost+(cost===1?' pt':' pts')}</span>
       <button type="button" className="apBtn up" disabled={!canRaise(k)} onClick={()=>raise(k)} aria-label={'Raise '+titleCase(k)}>+</button>
      </div>:null}
     </div>;
   })}</div>
   {spent>0?<div className="apActions"><button type="button" className="btnMain" onClick={confirm}>{'Confirm ('+spent+' spent)'}</button><button type="button" className="btnGhost" onClick={()=>setDraft({})}>Reset</button></div>:null}
   <p className="muted apFoot">Costs rise as an attribute climbs: 1 point below 14, 2 at 14–15, 3 at 16–17. Eighteen is the ceiling ordinary training reaches.</p>
  </Panel>

  <Panel title="Callings" sub="Disciplines you have begun to learn" icon="spark" action={<button type="button" className="linkBtn" onClick={()=>go('callings')}>Details</button>}>
   {callKeys.length?<div className="tileGrid two">{callKeys.map(k=>{var c=calls[k]||{}; var tr=c.status==='training'; return <div key={k} className="miniTile"><b>{c.name||titleCase(k)}</b><small>{tr?'In training · '+Number(c.learningProgress||0).toFixed(0)+'%':'Learned · Tier '+(c.tier||1)}{c.specialization?' · '+c.specialization:''}</small>{tr?<div className="meterBar thin"><i style={{width:clamp(Number(c.learningProgress)||0,0,100)+'%'}}/></div>:null}</div>;})}</div>:<Empty>No calling recorded yet.</Empty>}
  </Panel>

  {(v['player-appearance']||v['player-background'])?<Panel title="Background" icon="book">
   {v['player-appearance']?<div className="prosePara"><small>Appearance</small><p>{v['player-appearance']}</p></div>:null}
   {v['player-background']?<div className="prosePara"><small>Background</small><p>{open==='bg'||String(v['player-background']).length<360?v['player-background']:String(v['player-background']).slice(0,340)+'…'}</p>{String(v['player-background']).length>=360?<button type="button" className="linkBtn" onClick={()=>setOpen(open==='bg'?'':'bg')}>{open==='bg'?'Less':'Read all'}</button>:null}</div>:null}
  </Panel>:null}
 </div>;
}

/* ---------- Skills ---------- */
var FAMILY_ICON:any={Physical:'bolt',Weapons:'sword',Covert:'moon',Wilds:'tent',Mental:'eye',Social:'talk',Lore:'book',Craft:'anvil',Magic:'magic',Other:'spark'};
function SkillTile({id,s}:{id:string,s:any}){
 var lv=Number(s.level)||1, p=pct(s.prog,lv);
 return <div className="skillTile">
  <div className="skillHead"><b>{s.name||titleCase(id)}</b><span className="lvSeal"><small>Lv</small>{lv}</span></div>
  <div className="meterBar thin"><i style={{width:p+'%'}}/></div>
  <small>{[p.toFixed(0)+'% to '+(lv+1),s.attribute&&s.attribute!=='varies'?titleCase(String(s.attribute)):'',s.teacher?'taught by '+s.teacher:''].filter(Boolean).join(' · ')}</small>
 </div>;
}
function Skills({v}:{v:any}){
 var skills=safeObj(v.skills), tech=safeObj(v.techniques);
 const [fam,setFam]=React.useState('All');
 var keys=Object.keys(skills); var groups:any={};
 keys.forEach(k=>{var f=skillFamily(k,skills[k]||{}); (groups[f]=groups[f]||[]).push(k);});
 var present=FAMILY_ORDER.filter(f=>groups[f]&&groups[f].length).concat(Object.keys(groups).filter(f=>FAMILY_ORDER.indexOf(f)<0).sort());
 var shown=fam==='All'?present:present.filter(f=>f===fam);
 var byLv=(o:any)=>(a:string,b:string)=>(Number(o[b].level)||1)-(Number(o[a].level)||1);
 var tk=Object.keys(tech).sort(byLv(tech));
 var best=keys.slice().sort(byLv(skills))[0];
 var total=keys.reduce((n,k)=>n+(Number(skills[k].level)||1),0);
 return <div className="screen ledger">
  <div className="sumStrip">
   <div><small>Skills</small><b>{keys.length}</b></div>
   <div><small>Disciplines</small><b>{present.length}</b></div>
   <div><small>Total levels</small><b>{total}</b></div>
   <div><small>Techniques</small><b>{tk.length}</b></div>
  </div>
  {best?<p className="muted center">{'Best: '+((skills[best]||{}).name||titleCase(best))+' at level '+(Number(skills[best].level)||1)+'. Skills grow only by use, study and teaching.'}</p>:null}
  {present.length>1?<div className="chipRow" role="tablist">{['All'].concat(present).map(f=><Chip key={f} on={fam===f} icon={f==='All'?'skills':FAMILY_ICON[f]||'spark'} onClick={()=>setFam(f)}>{f==='All'?'All':f+' '+groups[f].length}</Chip>)}</div>:null}
  {keys.length?shown.map(f=><Panel key={f} title={f} sub={groups[f].length+' skill'+(groups[f].length===1?'':'s')} icon={FAMILY_ICON[f]||'spark'}>
    <div className="tileGrid two">{groups[f].slice().sort(byLv(skills)).map((k:string)=><SkillTile key={k} id={k} s={skills[k]||{}}/>)}</div>
   </Panel>)
   :<Panel title="Skills" icon="skills"><Empty>No skills recorded yet. They appear once your character trains, studies or uses them under pressure.</Empty></Panel>}
  {fam==='All'?<Panel title="Techniques" sub="Taught by masters or developed by hand" icon="sword">
   {tk.length?<div className="tileGrid two">{tk.map(k=><SkillTile key={k} id={k} s={tech[k]||{}}/>)}</div>:<Empty>No techniques learned yet.</Empty>}
  </Panel>:null}
 </div>;
}

/* ---------- Gear ---------- */
var SLOT_ORDER=[['head','Head'],['cloak','Cloak'],['chest','Body'],['hands','Hands'],['legs','Legs'],['feet','Feet'],['weapon','Main hand'],['offhand','Off hand'],['accessory1','Trinket'],['accessory2','Trinket'],['pack','Pack']];
var SLOT_ICON:any={head:'crown',cloak:'shield',chest:'shield',hands:'hero',legs:'run',feet:'run',weapon:'sword',offhand:'shield',accessory1:'spark',accessory2:'spark',pack:'gear'};
function itemKind(it:any){
 var h=(String(it.name||'')+' '+String(it.type||'')+' '+String(it.category||'')).toLowerCase();
 if(/potion|draught|elixir|tonic|salve|bandage|ration|food|bread|herb|scroll|meal|water|ale/.test(h))return 'Supplies';
 if(SLOT_KEYWORDS.weapon.some((k:string)=>h.includes(k))||/weapon|arrow|bolt/.test(h))return 'Weapons';
 if(['offhand','head','chest','hands','legs','feet','cloak'].some(s=>SLOT_KEYWORDS[s].some((k:string)=>h.includes(k)))||/armou?r/.test(h))return 'Armour';
 if(/ore|ingot|hide|pelt|leather|wood|cloth|gem|material|reagent|part|fang|claw|scale/.test(h))return 'Materials';
 return 'Other';
}
function Inventory({api,v}:{api:any,v:any}){ return <EldKit api={api} v={v}/>; }

/* ---------- Magic ---------- */
function Magic({api,v}:{api:any,v:any}){
 var s=safeObj(v['known-spells']); var keys=Object.keys(s); var awakened=!!v['mana-awakened']; var busy=!!api.isStreaming;
 var instinct=clamp(Number(v['instinct-pressure'])||0,0,100), control=clamp(Number(v['control-level'])||0,0,100), risk=clamp(Number(v['backlash-risk'])||0,0,100), band=riskBand(risk);
 const [tab,setTab]=React.useState('All'); const [sel,setSel]=React.useState('');
 function originOf(k:string){ var o=String((s[k]||{}).origin||'').toLowerCase(); return o==='innate'?'Innate':o==='universal'?'Universal':(o==='trained'||o==='starting calling')?'Trained':'Other'; }
 var tabs=['All','Trained','Innate','Universal','Other'].filter(t=>t==='All'||keys.some(k=>originOf(k)===t));
 var list=keys.filter(k=>tab==='All'||originOf(k)===tab);
 var x:any=sel?s[sel]||{}:null;
 return <div className="screen ledger">
  <Panel className="manaCard">
   <div className="manaRow">
    <div className={'manaOrb'+(awakened?'':' dim')} style={{['--fill' as any]:bar(v['player-mana'],v['player-max-mana'])+'%'}}><b>{Number(v['player-mana'])||0}</b><small>{'of '+(Number(v['player-max-mana'])||0)}</small></div>
    <div className="manaWords"><b>{awakened?'Mana awakened':'Mana unawakened'}</b><small>{awakened?poolWord(v['player-mana'],v['player-max-mana'])+' · '+keys.length+' spell'+(keys.length===1?'':'s')+' known':'Magic opens through a real event: a desperate cast under danger, an awakening rite, a mana font, a blessing. It cannot simply be declared.'}</small></div>
   </div>
   {awakened?<div className="heroMeters">
    <Meter label="Instinct" cur={instinct} max={100} kind="inst" icon="flame" word="Raw power from casting on instinct"/>
    <Meter label="Control" cur={control} max={100} kind="ctrl" icon="shield" word="Stability earned by training"/>
   </div>:null}
   {awakened?<div className={'riskBanner risk-'+band[1]}><div className="riskLabel"><b>Backlash risk</b><span>{band[0]+' · '+risk}</span></div><div className="meterBar"><i style={{width:risk+'%'}}/></div>
    <small>{band[1]==='calm'?'Magic sits stable.':band[1]==='stable'?'Occasional flickers; nothing dangerous yet.':band[1]==='volatile'?'A bold or instinctive cast risks a real backlash.':band[1]==='dangerous'?'Any reckless cast risks genuine harm. Seek a trainer.':'Backlash is near-certain on anything but the gentlest trained spell.'}</small></div>:null}
  </Panel>
  <Panel title="Spellbook" sub="A spell not written here cannot be cast by describing it" icon="book">
   {keys.length>0&&tabs.length>2?<div className="chipRow">{tabs.map(t=><Chip key={t} on={tab===t} onClick={()=>setTab(t)}>{t==='All'?'All '+keys.length:t+' '+keys.filter(k=>originOf(k)===t).length}</Chip>)}</div>:null}
   {list.length?<div className="tileGrid two">{list.map(k=>{ var sp=s[k]||{}; var o=originOf(k); return <button key={k} type="button" className={'spellTile o-'+o.toLowerCase()} onClick={()=>setSel(k)}>
     <span className="itemTop"><b>{sp.name||titleCase(k)}</b>{sp.mana!=null?<em>{sp.mana+' MP'}</em>:null}</span>
     <small>{[sp.school,sp.tier,o].filter(Boolean).join(' · ')}</small>
     {sp.prog!=null?<div className="meterBar thin"><i style={{width:pct(sp.prog,Number(sp.lv)||1)+'%'}}/></div>:null}
    </button>; })}</div>:<Empty>{awakened?'You know no spells yet. Find a teacher, a book, a shrine or a research path.':'Mana must awaken before any spell can be learned.'}</Empty>}
  </Panel>
  {x?<Sheet title={x.name||titleCase(sel)} onClose={()=>setSel('')}>
   <div className="factGrid">
    {[['School',x.school],['Tier',x.tier],['Origin',originOf(sel)],['Cost',x.mana!=null?x.mana+' MP':''],['Casting',x.castingTime],['Range',x.range],['Level',x.lv]].filter((f:any)=>f[1]!=null&&f[1]!=='').map((f:any)=><div key={f[0]}><small>{f[0]}</small><b>{String(f[1])}</b></div>)}
   </div>
   {x.description||x.effect?<p className="sheetText">{x.description||x.effect}</p>:null}
   <div className="sheetActs"><button type="button" className="btnMain" disabled={busy||!awakened} onClick={()=>{api.sendMessage('I cast '+(x.name||titleCase(sel))+'.');setSel('');}}>Cast it</button></div>
   <p className="sheetNote">Casting sends the action to the story; the narrator resolves the cost and the roll.</p>
  </Sheet>:null}
 </div>;
}

/* ---------- Quests ---------- */
function Quests({api,v}:{api:any,v:any}){
 var all=safeArr(v['quest-log']); var go=useNav();
 const [tab,setTab]=React.useState('Open'); const [sel,setSel]=React.useState<any>(null);
 var done=(q:any)=>/^(complete|completed|done|turned in)$/i.test(String(q.status||'')), lost=(q:any)=>/^(failed|abandoned)$/i.test(String(q.status||''));
 var open=all.filter((q:any)=>q&&!done(q)&&!lost(q));
 var list=tab==='Open'?open:tab==='Finished'?all.filter((q:any)=>q&&(done(q)||lost(q))):all;
 var q:any=sel!=null?all[sel]:null;
 return <div className="screen ledger">
  <div className="sumStrip">
   <div><small>Open</small><b>{open.length}</b></div>
   <div><small>Completed</small><b>{all.filter(done).length}</b></div>
   <div><small>Failed</small><b>{all.filter(lost).length}</b></div>
  </div>
  <Tile icon="scroll" title="Quest boards here" line="Postings where you are standing right now" onClick={()=>go('boards')}/>
  <div className="chipRow">{['Open','Finished','All'].map(t=><Chip key={t} on={tab===t} onClick={()=>setTab(t)}>{t}</Chip>)}</div>
  {list.length?<div className="tileGrid">{list.map((x:any)=>{ var i=all.indexOf(x); return <button key={x.id||i} type="button" className={'questTile'+(done(x)?' done':lost(x)?' lost':'')} onClick={()=>setSel(i)}>
    <span className="rankBadge">{x.rank||'—'}</span>
    <span className="tileWords"><b>{x.title||x.id||'Untitled request'}</b><small>{[titleCase(String(x.status||'active')),x.giver||x.client,x.deadline?'due '+x.deadline:''].filter(Boolean).join(' · ')}</small></span>
    {x.reward||x.rewardCp!=null?<em className="questReward">{x.rewardCp!=null?money(Number(x.rewardCp)||0):String(x.reward)}</em>:null}
   </button>; })}</div>:<Panel><Empty>{tab==='Open'?'No open obligations. The Guild’s boards are the usual place to find work.':'Nothing recorded here yet.'}</Empty></Panel>}
  {q?<Sheet title={q.title||q.id||'Request'} onClose={()=>setSel(null)}>
   <div className="factGrid">
    {[['Rank',q.rank],['Status',q.status?titleCase(String(q.status)):'Active'],['From',q.giver||q.client],['Where',q.location],['Due',q.deadline],['Reward',q.rewardCp!=null?money(Number(q.rewardCp)||0):q.reward]].filter((f:any)=>f[1]!=null&&f[1]!=='').map((f:any)=><div key={f[0]}><small>{f[0]}</small><b>{String(f[1])}</b></div>)}
   </div>
   {q.description||q.summary||q.notes?<p className="sheetText">{q.description||q.summary||q.notes}</p>:null}
   {safeArr(q.objectives).length?<ul className="objList">{safeArr(q.objectives).map((o:any,i:number)=><li key={i} className={o&&o.done?'done':''}>{typeof o==='string'?o:(o.text||o.name||'')}</li>)}</ul>:null}
   <div className="sheetActs"><button type="button" className="btnGhost" disabled={!!api.isStreaming} onClick={()=>{api.sendMessage('I go over what I know about "'+(q.title||q.id)+'" and decide my next step.');setSel(null);}}>Think it over</button></div>
  </Sheet>:null}
 </div>;
}

/* ---------- More: every other record, as grouped tiles ---------- */
function More({setScreen}:{setScreen:any}){
 return <div className="screen ledger">{MORE_GROUPS.map((g:any)=><Panel key={g[0]} title={g[0]}>
  <div className="tileGrid two">{g[1].map((x:any)=><Tile key={x[0]} icon={x[1]} title={x[2]} line={(SCREEN_META[x[0]]||[])[2]||''} onClick={()=>setScreen(x[0])}/>)}</div>
 </Panel>)}</div>;
}
