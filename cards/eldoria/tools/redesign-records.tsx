
/* ---------- the record screens, rebuilt as cards and tiles ----------
   Every in-story action sends the same words to the narrator as before; only the presentation changed. */
function Rec({icon,title,line,right,children,onClick,on,tone}:{icon?:string,title:any,line?:any,right?:any,children?:any,onClick?:any,on?:boolean,tone?:string}){
 var inner=<>{icon?<span className="recSigil"><ElIcon n={icon} s={15}/></span>:null}<span className="recWords"><b>{title}</b>{line?<small>{line}</small>:null}{children}</span>{right!=null&&right!==''?<em className="recRight">{right}</em>:null}</>;
 var cls='rec'+(onClick?' tap':'')+(on?' on':'')+(tone?' t-'+tone:'');
 return onClick?<button type="button" className={cls} onClick={onClick}>{inner}</button>:<div className={cls}>{inner}</div>;
}
function Lead({children}:{children:any}){ return <p className="lead">{children}</p>; }
function textOf(x:any):string{
 if(x==null)return ''; if(typeof x!=='object')return String(x);
 if(Array.isArray(x))return x.map(textOf).filter(Boolean).join(', ');
 var main=x.summary||x.text||x.description||x.status||x.name;
 if(main&&typeof main!=='object')return String(main)+(x.status&&main!==x.status?' · '+x.status:'');
 return Object.entries(x).map(([k,val]:any)=>titleCase(k)+': '+textOf(val)).join(' · ');
}
var RANK_LADDER=['F','E','D','C','B','A','S'];
function rankLetter(r:any){ var m=String(r||'').match(/^\s*([FEDCBAS])\b/i); return m?m[1].toUpperCase():''; }
function standingWord(n:number){ return n<=-50?'Hostile':n<-10?'Wary':n<=10?'Neutral':n<50?'Friendly':'Trusted'; }

function QuestBoards({v,api}:{v:any,api:any}){
 var boards=safeObj(v['quest-boards']), registry=safeObj(v['quest-board-registry']);
 var here=canonicalSettlement(String(v['current-location']||'')), sub=String(v['current-sublocation']||embeddedSublocation(String(v['current-location']||''))||'');
 var local=Object.entries(registry).filter(([k,b]:any)=>b.sublocation===sub || (b.settlement===here && (b.discovered===true || !!boards[k])));
 const [active,setActive]=React.useState('');
 React.useEffect(()=>{if(local.length && !local.some(([k]:any)=>k===active))setActive(String(local[0][0]));},[here,sub]);
 function reward(x:any){return x.rewardCp!=null?money(Number(x.rewardCp)||0):(x.reward||'');}
 function inspect(id:string,b:any){setActive(id);api.sendMessage('I inspect the '+b.name+' at '+b.sublocation+' in '+b.settlement+'. Enforce its access requirement ('+(b.access||'public')+'). Show only details my character is actually allowed to see. Preserve postings in quest-board state; do not regenerate the board merely because I reopened it, and synchronize any post with its underlying quest-world-state event.');}
 var activeDef:any=registry[active]||{}, activeBoard:any=boards[active]||{};
 var posts=safeArr(activeBoard.posts).filter((x:any)=>!x.status||x.status==='available');
 return <div className="screen ledger">
  <Panel title="Boards where you stand" sub={here+(sub&&sub!=='Unassigned'?' · '+sub:'')} icon="scroll">
   <Lead>Boards are physical objects: only those where you are standing appear. Tap one to go and read it.</Lead>
   {local.length?<div className="tileGrid">{local.map(([id,b]:any)=><Rec key={id} icon="scroll" title={b.name} line={[b.sublocation,titleCase(b.profile||'public'),b.access||'public'].filter(Boolean).join(' · ')} on={active===id} onClick={()=>inspect(String(id),b)}/>)}</div>:<Empty>There is no quest board where you are standing.</Empty>}
  </Panel>
  {active?<Panel title={activeDef.name||'Selected board'} sub={'Last read: '+(activeBoard.lastRefresh||activeBoard.lastObserved||'not yet')} icon="quest">
   {posts.length?<div className="tileGrid">{posts.map((x:any,i:number)=><div key={x.id||i} className="questTile static"><span className="rankBadge">{x.rank||'F'}</span><span className="tileWords"><b>{x.title||x.id}</b><small>{[x.issuer?'Issued by '+x.issuer:'',x.authorization,x.deadline?'due '+x.deadline:''].filter(Boolean).join(' · ')}</small>{x.summary||x.objective?<span className="postText">{x.summary||x.objective}</span>:null}</span><em className="questReward">{reward(x)}</em></div>)}</div>
    :<Empty>This board has not been read yet, or has no postings right now.</Empty>}
  </Panel>:null}
  <Panel title="Rank & authority" icon="crown">
   <div className="ladder">{RANK_LADDER.map(r=><span key={r} className={'rung'+(r==='S'?' crown':'')}>{r}</span>)}</div>
   <Lead>F through A requests come from ordinary people, Guild branches, merchants, temples, nobles, cities and militaries, by their means and the danger. A genuine S-rank commission is normally a matter for a kingdom's ruler, issued under seal or summons; public boards may display one, but rarely originate it.</Lead>
  </Panel>
 </div>;
}

function Guild({v}:{v:any}){
 var go=useNav(); var r=rankLetter(v['guild-rank']); var rep=Number(v['guild-reputation'])||0; var q=safeArr(v['quest-log']);
 var done=q.filter((x:any)=>/^(complete|completed|done|turned in)$/i.test(String(x.status||''))).length;
 return <div className="screen ledger">
  <Panel className="guildCard">
   <div className="guildTop"><div className="bigSeal"><small>Rank</small><b>{r||'—'}</b></div>
    <div className="heroWho"><b className="heroName">{v['guild-rank']||'Unregistered'}</b><small>{'Reputation '+(rep>=0?'+':'')+rep+' · '+done+' request'+(done===1?'':'s')+' completed'}</small></div></div>
   <div className="ladder">{RANK_LADDER.map(x=><span key={x} className={'rung'+(x===r?' here':'')+(r&&RANK_LADDER.indexOf(x)<RANK_LADDER.indexOf(r)?' past':'')}>{x}</span>)}</div>
   <Lead>Rank is certification, not character level. Promotion needs a record, reputation, competence and a real trial.</Lead>
  </Panel>
  <div className="tileGrid two">
   <Tile icon="quest" title="Quest Log" line={q.length+' recorded'} onClick={()=>go('quests')}/>
   <Tile icon="scroll" title="Quest Boards" line="Postings where you stand" onClick={()=>go('boards')}/>
   <Tile icon="people" title="Party" line="Your company and Guild team" onClick={()=>go('party')}/>
   <Tile icon="scales" title="Factions" line="Standing with the companies" onClick={()=>go('factions')}/>
  </div>
 </div>;
}

function Party({v,api}:{v:any,api:any}){
 var p=safeArr(v.party), c=safeObj(v.companions), pm=safeObj(v['party-management']), gr=safeObj(v['guild-team-registry']);
 var [selected,setSelected]=React.useState('');
 var memberIds=safeArr(pm.memberIds);
 function memberId(x:any){return typeof x==='string'?x:String(x.id||x.companionId||x.name||'');}
 var physicalIds=p.map(memberId).filter(Boolean);
 var ids=memberIds.length?memberIds:physicalIds;
 var selectedId=selected||ids[0]||''; var m=selectedId?(c[selectedId]||p.find((x:any)=>memberId(x)===selectedId)||{}):{};
 function ask(text:string){if(api&&api.sendMessage)api.sendMessage(text);}
 var attrs=safeObj(m.attributes), skills=safeObj(m.skills), tech=safeObj(m.techniques), spells=safeObj(m.knownSpells||m['known-spells']), eq=safeObj(m.equipment), inv=safeArr(m.inventory), cond=safeArr(m.conditions), inj=safeArr(m.injuries);
 var mName=m.name||titleCase(String(selectedId));
 function meter(label:string,cur:any,max:any,kind:string,icon:string){ var n=Number(cur),mx=Number(max); return isFinite(n)&&isFinite(mx)&&mx>0?<Meter label={label} cur={n} max={mx} kind={kind} icon={icon}/>:<Meter label={label} cur={0} max={0} kind={kind} icon={icon} word="Unknown"/>; }
 return <div className="screen ledger">
  <Panel title={pm.name||'Adventuring party'} sub={pm.formed?'Formed':'Not formally formed'} icon="people">
   <div className="factGrid tight">
    <div><small>Leader</small><b>{pm.leader&&pm.leader!=='player'?(c[pm.leader]?.name||pm.leader):(v['player-name']||'You')}</b></div>
    <div><small>Travelling</small><b>{physicalIds.length}</b></div>
    {pm.lootPolicy?<div><small>Loot</small><b>{titleCase(String(pm.lootPolicy).replace(/-/g,' '))}</b></div>:null}
   </div>
   <div className="sheetActs"><button type="button" className="btnMain" onClick={()=>ask(pm.formed?'I want to manage my adventuring party. Show me my in-world options.':'I want to found my own adventuring party and be its leader.')}>{pm.formed?'Manage party':'Found a party'}</button><button type="button" className="btnGhost" onClick={()=>ask('I want to invite or recruit someone I know into my adventuring party. Show me plausible candidates I can actually approach here.')}>Recruit</button></div>
  </Panel>
  <Panel title="Roster" sub="Tap someone to see their sheet" icon="hero">
   {ids.length?<div className="tileGrid">{ids.map((id:any)=>{var x=c[id]||p.find((z:any)=>memberId(z)===id)||{};var role=safeObj(pm.roles)[id]||x.role||'Member';return <button key={id} type="button" className={'member'+(selectedId===id?' on':'')} onClick={()=>setSelected(id)}><span className="speakerSeal">{initialsOf(x.name||id)}</span><span className="tileWords"><b>{x.name||titleCase(String(id))}</b><small>{[role,x.class||x.calling||'Calling unknown',x.level||x.lv?'Lv '+(x.level||x.lv):''].filter(Boolean).join(' · ')}</small></span>{x.hp!=null?<em className="recRight">{x.hp+'/'+(x.maxHp||'?')}</em>:null}</button>;})}</div>
    :<Empty>No one is travelling with you. Companions are recruited in the world, not from this menu.</Empty>}
  </Panel>
  {selectedId?<Panel title={mName} sub={[m.class||m.calling||'Calling unknown',m.level||m.lv?'Level '+(m.level||m.lv):'',m.guildRank||''].filter(Boolean).join(' · ')} icon="hero">
   <div className="heroMeters flat">{meter('Health',m.hp,m.maxHp,'hp','heart')}{meter('Mana',m.mana,m.maxMana,'mp','drop')}{meter('Stamina',m.stamina,m.maxStamina,'sp','bolt')}</div>
   <div className="factGrid tight">
    <div><small>Role</small><b>{safeObj(pm.roles)[selectedId]||m.role||'Member'}</b></div>
    <div><small>Trust</small><b>{m.trust!=null?m.trust+'/100':'Unknown'}</b></div>
    <div><small>XP</small><b>{m.xp!=null?m.xp:'—'}</b></div>
    <div><small>Guild rank</small><b>{m.guildRank||'Unknown'}</b></div>
   </div>
   <div className="subHead">Attributes</div>
   {Object.keys(attrs).length?<div className="statChips">{Object.entries(attrs).map(([k,x]:any)=><span key={k}><small>{titleCase(k).slice(0,3)}</small><b>{String(x)}</b></span>)}</div>:<p className="muted">Not known yet.</p>}
   <div className="subHead">Skills & techniques</div>
   {Object.keys(skills).length||Object.keys(tech).length?<div className="chipRow wrap">{Object.entries(skills).concat(Object.entries(tech)).map(([k,x]:any)=><span key={k} className="tag">{titleCase(k)+(typeof x==='object'?' '+(x.level||'?'):' '+String(x))}</span>)}</div>:<p className="muted">None recorded.</p>}
   <div className="subHead">Magic</div>
   {Object.keys(spells).length?<div className="chipRow wrap">{Object.entries(spells).map(([k,x]:any)=><span key={k} className="tag rune">{typeof x==='object'?(x.name||titleCase(k)):titleCase(k)}</span>)}</div>:<p className="muted">No known spells.</p>}
   <div className="subHead">Equipment & pack</div>
   {Object.keys(eq).length?<div className="slotGrid">{Object.entries(eq).map(([k,x]:any)=><div key={k} className={'slot'+(x?' full':'')}><small>{titleCase(k)}</small><b>{x?(typeof x==='string'?x:(x.name||'Equipped')):'—'}</b></div>)}</div>:<p className="muted">No equipment record.</p>}
   {inv.length?<p className="muted">{'Pack: '+inv.map((x:any)=>typeof x==='string'?x:(x.name||x.id)).join(', ')}</p>:null}
   {inj.length||cond.length?<><div className="subHead">Wounds & conditions</div><div className="chipRow wrap">{inj.concat(cond).map((x:any,i:number)=><span key={i} className="tag hurt">{typeof x==='string'?x:(x.name||'Condition')}</span>)}</div></>:null}
   <div className="sheetActs"><button type="button" className="btnGhost" onClick={()=>ask('I want to speak with '+(m.name||selectedId)+' about their role in the party.')}>Assign role</button><button type="button" className="btnGhost" onClick={()=>ask('I want to discuss '+(m.name||selectedId)+' leaving my adventuring party. Resolve this as an in-world conversation, not an automatic deletion.')}>Part ways</button></div>
  </Panel>:null}
  <Panel title="Guild team registry" sub={gr.registered?'Registered':'Not registered'} icon="crown">
   {gr.registered?<div className="factGrid tight">
    <div><small>Team</small><b>{gr.name||gr.teamId||'Registered team'}</b></div><div><small>Standing</small><b>{gr.standing||'New / unproven'}</b></div>
    <div><small>Requests</small><b>{Number(gr.completed||0)+' done · '+Number(gr.failed||0)+' failed · '+Number(gr.active||0)+' open'}</b></div><div><small>Highest cleared</small><b>{gr.highestCleared||'None'}</b></div>
   </div>:<Lead>Your travelling party and an official Guild team are separate. Registering is a Guild service, done in the world.</Lead>}
   {gr.rosterOutOfDate?<p className="warnLine">The official roster is out of date. Update it at a Guild office.</p>:null}
   <div className="sheetActs"><button type="button" className="btnGhost" onClick={()=>ask(gr.registered?'I want to update or manage my official Guild Team registration.':'I want to register my adventuring party as an official Guild Team. Tell me what I need to do at my current location.')}>{gr.registered?'Update roster':'Register a team'}</button></div>
  </Panel>
 </div>;
}

function Training({v}:{v:any}){
 var t=safeObj(v['training-state']),p=safeObj(v['development-projects']);
 return <div className="screen ledger">
  <Panel title="Current training" icon="sword">{Object.keys(t).length?<div className="tileGrid">{Object.entries(t).map(([k,x]:any)=><Rec key={k} icon="sword" title={x.name||titleCase(k)} line={[x.teacher?'Teacher: '+x.teacher:'',(x.hours||0)+' h recorded'].filter(Boolean).join(' · ')}/>)}</div>:<Empty>No training under way. Find a real trainer or start focused practice.</Empty>}</Panel>
  <Panel title="Development projects" sub="Techniques, spells and recipes you are working out" icon="anvil">{Object.keys(p).length?<div className="tileGrid two">{Object.entries(p).map(([k,x]:any)=><div key={k} className="skillTile"><div className="skillHead"><b>{x.name||titleCase(k)}</b><span className="lvSeal">{Number(x.progress||0).toFixed(0)+'%'}</span></div><div className="meterBar thin"><i style={{width:clamp(Number(x.progress)||0,0,100)+'%'}}/></div>{x.stability?<small>{'Stability: '+x.stability}</small>:null}</div>)}</div>:<Empty>No development projects.</Empty>}</Panel>
 </div>;
}

function Callings({v}:{v:any}){
 var calls=safeObj(v.callings), keys=Object.keys(calls);
 return <div className="screen ledger">
  <Panel title="Your callings" sub="No limit, and no active-class lockout" icon="spark">
   {keys.length?<div className="tileGrid">{keys.map(k=>{var c=calls[k]||{},p=Number(c.learningProgress||0),tr=c.status==='training';return <div key={k} className="callTile">
     <div className="skillHead"><b>{c.name||titleCase(k)}</b><span className={'lvSeal'+(tr?' dim':'')}>{tr?p.toFixed(0)+'%':'Tier '+(c.tier||1)}</span></div>
     <small>{[tr?'In training':'Learned',c.specialization,'Origin: '+(c.origin||'unknown'),c.teacher?'Teacher: '+c.teacher:''].filter(Boolean).join(' · ')}</small>
     {tr?<div className="meterBar thin"><i style={{width:clamp(p,0,100)+'%'}}/></div>:null}
     {Object.keys(safeObj(c.playstyle)).length?<div className="chipRow wrap">{Object.entries(safeObj(c.playstyle)).slice(0,8).map(([n,x]:any)=><span key={n} className="tag">{titleCase(n)+' '+String(x)}</span>)}</div>:null}
    </div>;})}</div>:<Empty>No calling recorded. A created character should always have one starting calling.</Empty>}
  </Panel>
  <Panel title="Learning more" icon="book"><Lead>Find a master, academy, temple, order, Guild instructor, druidic circle, monastic school, military tradition, manual, faction initiation, quest or supernatural source, or a plausible path of your own. The moment real training begins, that calling appears here as <b>In training</b>.</Lead></Panel>
 </div>;
}

function Banking({v}:{v:any}){
 var ac=safeObj(v['bank-accounts']), assets=safeArr(v['financial-assets']), keys=Object.keys(ac); var total=keys.reduce((n,k)=>n+Number((ac[k]||{}).balanceCp||0),0);
 return <div className="screen ledger">
  <div className="sumStrip"><div><small>Carried</small><b className="sm">{money(v['player-money-cp'])}</b></div><div><small>Banked</small><b className="sm">{money(total)}</b></div></div>
  <Panel title="Carried purse" sub="Coin on your person" icon="coin"><div className="coinRow">{money(v['player-money-cp']).split(' | ').map((c:string,i:number)=><span key={i} className={'coin c'+i}><i/>{c}</span>)}</div><Lead>Deposited funds are not carried weight and are tracked separately.</Lead></Panel>
  <Panel title="Bank & vault accounts" sub={keys.length+' open · '+money(total)} icon="temple">
   {keys.length?<div className="tileGrid">{keys.map(k=>{var a=ac[k]||{};return <Rec key={k} icon="temple" title={a.institution||titleCase(k)} line={[a.branch,a.realm,a.access,a.fees].filter(Boolean).join(' · ')} right={money(a.balanceCp||0)}/>;})}</div>:<Empty>No account yet. Visit a bank, Guild vault desk, hold vault-house, caravan bank or merchant house where you are.</Empty>}
  </Panel>
  <Panel title="Local tender & instruments" icon="scroll">{assets.length?<div className="tileGrid">{assets.map((a:any,i:number)=><Rec key={i} icon="scroll" title={a.name||'Asset'} line={[a.realm,a.acceptedAt||'limited acceptance'].filter(Boolean).join(' · ')} right={money((a.valueCp||0)*(a.qty||1))}/>)}</div>:<Empty>No non-coin tender carried.</Empty>}</Panel>
 </div>;
}

function Factions({v}:{v:any}){
 var f=safeObj(v.factions);
 return <div className="screen ledger"><Panel title="Faction standing" sub="Reputation with the great companies" icon="scales">
  {Object.keys(f).length?<div className="tileGrid two">{Object.entries(f).map(([k,x]:any)=>{var n=Number(x)||0;return <div key={k} className="factTile"><div className="skillHead"><b>{titleCase(k)}</b><span className={'lvSeal'+(n<0?' neg':'')}>{(n>=0?'+':'')+n}</span></div>
   <div className="standBar"><i className={n<0?'neg':''} style={{left:(n<0?50+clamp(n,-100,0)/2:50)+'%',width:Math.abs(clamp(n,-100,100))/2+'%'}}/><span/></div><small>{standingWord(n)}</small></div>;})}</div>:<Empty>No standing recorded yet.</Empty>}
 </Panel></div>;
}

function Crafting({v}:{v:any}){
 var c=safeObj(v.codex), recipes=safeArr(c.recipes), mats=safeObj(v['material-knowledge']), projects=safeArr(v['crafting-projects']), alloys=safeObj(v['alloy-discoveries']), notes=safeArr(v['crafting-notes']), artisans=safeObj(v['artisan-knowledge']), facilities=safeObj(v['crafting-facility-state']);
 const [tab,setTab]=React.useState('materials');
 var tabs=[['materials','Materials','anvil',Object.keys(mats).length],['recipes','Recipes','book',recipes.length],['projects','Projects','hourglass',projects.length],['artisans','Artisans','people',Object.keys(artisans).length],['journal','Research','scroll',notes.length]];
 function traits(x:any){ var t=safeArr(x.knownTraits||x.traits||x.specialties||x.capabilities); return t.length?<div className="chipRow wrap">{t.map((y:any,i:number)=><span key={i} className="tag">{typeof y==='string'?y:(y.name||String(y))}</span>)}</div>:null; }
 return <div className="screen ledger">
  <div className="chipRow">{tabs.map((x:any)=><Chip key={x[0]} icon={x[2]} on={tab===x[0]} onClick={()=>setTab(x[0])}>{x[1]+(x[3]?' '+x[3]:'')}</Chip>)}</div>
  {tab==='materials'?<><Panel title="Known materials" sub="Exotic does not mean stronger; design and craft decide" icon="anvil">{Object.keys(mats).length?<div className="tileGrid">{Object.entries(mats).map(([k,x]:any)=><Rec key={k} icon="anvil" title={x.name||titleCase(k)} line={[x.form?'Form: '+x.form:'',x.grade,x.source?'from '+x.source:''].filter(Boolean).join(' · ')}>{traits(x)}{x.notes?<span className="postText">{x.notes}</span>:null}</Rec>)}</div>:<Empty>No assayed or studied material properties yet. Ordinary materials are still recognised from background knowledge.</Empty>}</Panel>
   <Panel title="Alloys & composites" icon="flame">{Object.keys(alloys).length?<div className="tileGrid">{Object.entries(alloys).map(([k,x]:any)=><Rec key={k} icon="flame" title={x.name||titleCase(k)} line={x.formula||x.ratio||''} right={x.quality||x.status||''}/>)}</div>:<Empty>No original alloy or composite discovered yet.</Empty>}</Panel></>:null}
  {tab==='recipes'?<Panel title="Recipes & procedures" icon="book">{recipes.length?<div className="tileGrid">{recipes.map((x:any,i:number)=><Rec key={i} icon="book" title={typeof x==='string'?x:x.name} line={typeof x==='object'?[x.skill,x.facility].filter(Boolean).join(' · '):''}/>)}</div>:<Empty>No formal recipes yet. You can still experiment with plausible materials.</Empty>}</Panel>:null}
  {tab==='projects'?<><Panel title="Crafting & experiments" icon="hourglass">{projects.length?<div className="tileGrid two">{projects.map((x:any,i:number)=><div key={i} className="skillTile"><div className="skillHead"><b>{x.name||x.goal||'Project '+(i+1)}</b><span className="lvSeal">{x.progress!=null?x.progress+'%':(x.status||'active')}</span></div>{x.progress!=null?<div className="meterBar thin"><i style={{width:clamp(Number(x.progress)||0,0,100)+'%'}}/></div>:null}<small>{[x.status,x.facility,x.elapsed].filter(Boolean).join(' · ')}</small>{safeArr(x.materials).length?<small>{'Materials: '+safeArr(x.materials).map((m:any)=>typeof m==='string'?m:(m.name||m.id)).join(', ')}</small>:null}</div>)}</div>:<Empty>No active crafting or research.</Empty>}</Panel>
   <Panel title="Facilities known" icon="temple">{Object.keys(facilities).length?<div className="tileGrid">{Object.entries(facilities).map(([k,x]:any)=><Rec key={k} icon="temple" title={x.name||titleCase(k)} line={[x.location,x.tier].filter(Boolean).join(' · ')}/>)}</div>:<Empty>No workshop or facility records yet.</Empty>}</Panel></>:null}
  {tab==='artisans'?<Panel title="Known artisans" sub="Only people you have met or credibly heard of" icon="people">{Object.keys(artisans).length?<div className="tileGrid">{Object.entries(artisans).map(([k,x]:any)=><Rec key={k} icon="hero" title={x.name||titleCase(k)} line={[x.location,x.access?'Access: '+x.access:''].filter(Boolean).join(' · ')} right={x.status||''}>{traits(x)}</Rec>)}</div>:<Empty>No specialist artisan known yet. Ask guilds, merchants, smiths or locals for referrals.</Empty>}</Panel>:null}
  {tab==='journal'?<><Panel title="Experimental journal" icon="scroll">{notes.length?<div className="tileGrid">{notes.map((x:any,i:number)=><Rec key={i} icon="scroll" title={x.title||x.subject||'Note '+(i+1)} line={x.date||''}><span className="postText">{x.text||x.observation||x.notes||String(x)}</span></Rec>)}</div>:<Empty>No experimental notes yet. Failed tests can still teach.</Empty>}</Panel>
   <Panel title="The rule" icon="scales"><Lead>A known recipe is a predictable procedure. An unknown combination is an experiment, not an automatic refusal: the result comes from the materials' traits, the process, the facility and your skills, and what you learn is recorded.</Lead></Panel></>:null}
 </div>;
}

function Markets({v}:{v:any}){
 var known=safeObj(v['price-knowledge']), state=safeObj(v['market-state']); var keys=Object.keys(known);
 return <div className="screen ledger">
  <Panel title="Prices you know" sub="Observed or reported; they go stale" icon="scales">{keys.length?<div className="tileGrid">{keys.map(k=>{var x=known[k]||{};return <Rec key={k} icon="coin" title={x.name||titleCase(k)} line={[x.location,x.observedDate?'seen '+x.observedDate:'',x.source].filter(Boolean).join(' · ')} right={x.buyCp!=null?'Buy '+money(x.buyCp):x.sellCp!=null?'Sell '+money(x.sellCp):''}/>;})}</div>:<Empty>No reliable prices yet. Visit shops and markets, or ask traders.</Empty>}</Panel>
  <Panel title="Local conditions" icon="eye"><Lead>Only what your character could reasonably know here. Shortages and gluts are lasting conditions in the world, not random discounts.</Lead>{Object.keys(state).length?<p className="muted">The economy is moving. Records you have not seen stay hidden until found in play.</p>:<Empty>No unusual local shortage or surplus recorded.</Empty>}</Panel>
 </div>;
}

function Shops({v}:{v:any}){
 var m=safeObj(v['merchant-state']);
 return <div className="screen ledger"><Panel title="Known merchants" icon="coin">{Object.keys(m).length?<div className="tileGrid">{Object.entries(m).map(([k,x]:any)=><Rec key={k} icon="coin" title={x.name||titleCase(k)} line={x.specialization||''} right={x.cashCp!=null?money(x.cashCp):''}/>)}</div>:<Empty>Merchants appear here once you meet them or enter a tracked shop.</Empty>}</Panel></div>;
}

function Conditions({v}:{v:any}){
 var c=safeArr(v.conditions),i=safeArr(v.injuries);
 return <div className="screen ledger">
  <div className="heroMeters flat panelLike"><Meter label="Health" cur={v['player-hp']} max={v['player-max-hp']} kind="hp" icon="heart" word={vitalWord(v['player-hp'],v['player-max-hp'])}/><Meter label="Stamina" cur={v['player-stamina']} max={v['player-max-stamina']} kind="sp" icon="bolt" word={poolWord(v['player-stamina'],v['player-max-stamina'])}/></div>
  <Panel title="Injuries" icon="heart">{i.length?<div className="tileGrid">{i.map((x:any,n:number)=><Rec key={n} icon="heart" tone="hurt" title={x.name||x.type||'Injury'} line={[x.severity,x.penalty].filter(Boolean).join(' · ')}/>)}</div>:<Empty>No recorded injuries.</Empty>}</Panel>
  <Panel title="Conditions" icon="flame">{c.length?<div className="tileGrid">{c.map((x:any,n:number)=><Rec key={n} icon="flame" tone="hurt" title={typeof x==='string'?x:x.name} line={typeof x==='object'?[x.duration,x.effect].filter(Boolean).join(' · '):''}/>)}</div>:<Empty>No active conditions.</Empty>}</Panel>
 </div>;
}

function Journal({v,api}:{v:any,api:any}){
 var j=safeArr(v['player-notes']); const [txt,setTxt]=React.useState('');
 function add(){if(!txt.trim())return;api.setVariable('player-notes',[...j,{text:txt.trim(),created:v['world-date']+' '+v['world-time']}]);setTxt('');}
 return <div className="screen ledger">
  <Panel title="Field journal" sub="Your own notes and goals; the narrator does not write here" icon="scroll">
   <div className="journalAdd"><input value={txt} onChange={(e:any)=>setTxt(e.target.value)} onKeyDown={(e:any)=>{if(e.key==='Enter')add();}} placeholder="Add an objective or note…"/><button type="button" className="btnMain" onClick={add}>Add</button></div>
   {j.length?<div className="tileGrid">{j.slice().reverse().map((x:any,i:number)=><Rec key={j.length-i} icon={x&&x.source==='chronicle'?'book':'scroll'} title={x&&x.source==='chronicle'?'From the Chronicle':(x.text||String(x)).slice(0,80)} line={x.created||''}>{x&&x.source==='chronicle'||String(x.text||'').length>80?<span className="postText">{x.text||String(x)}</span>:null}</Rec>)}</div>:<Empty>No notes or objectives yet.</Empty>}
  </Panel>
 </div>;
}

function Codex({v}:{v:any}){
 var c=safeObj(v.codex), t=safeArr(c.titles), b=safeArr(c.bestiary), l=safeArr(c.lore), r=safeArr(c.recipes);
 var name=(x:any)=>typeof x==='string'?x:(x&&(x.name||x.title))||'Entry';
 return <div className="screen ledger">
  <div className="sumStrip"><div><small>Titles</small><b>{t.length}</b></div><div><small>Bestiary</small><b>{b.length}</b></div><div><small>Lore</small><b>{l.length}</b></div><div><small>Recipes</small><b>{r.length}</b></div></div>
  <Panel title="Titles" icon="crown">{t.length?<div className="chipRow wrap">{t.map((x:any,i:number)=><span key={i} className="tag rune">{name(x)}</span>)}</div>:<Empty>No titles earned.</Empty>}</Panel>
  <Panel title="Bestiary" icon="eye">{b.length?<div className="tileGrid">{b.map((x:any,i:number)=><Rec key={i} icon="eye" title={name(x)} line={typeof x==='object'?textOf(x.notes||x.summary||x.type||''):''}/>)}</div>:<Empty>No creatures recorded.</Empty>}</Panel>
  <Panel title="Lore" icon="book">{l.length?<div className="tileGrid">{l.map((x:any,i:number)=><Rec key={i} icon="book" title={name(x)} line={typeof x==='object'?textOf(x.summary||x.text||''):''}/>)}</div>:<Empty>No lore recorded.</Empty>}</Panel>
 </div>;
}

function LivingEvents({v}:{v:any}){
 var all=[...safeArr(v['living-quest-events']),...safeArr(v['world-events'])];
 return <div className="screen ledger"><Panel title="World events" sub="Only what you have actually learned" icon="flame">{all.length?<div className="tileGrid">{all.map((x:any,i:number)=><Rec key={x.id||i} icon="flame" title={x.title||x.name||x.type||'Developing event'} line={[x.location||x.region,x.date].filter(Boolean).join(' · ')} right={x.status||x.stage||''}/>)}</div>:<Empty>No major world events are known to you.</Empty>}</Panel></div>;
}
function PoliticsScreen({v}:{v:any}){
 var d=safeObj(v['diplomacy-state']), wars=safeArr(v['active-wars']), ts=safeArr(v['treaties']);
 return <div className="screen ledger">
  <Panel title="Courts & crowns" sub="Your known picture; private negotiations stay hidden" icon="crown">{Object.keys(d).length?<div className="tileGrid">{Object.keys(d).map((r:string)=><div key={r} className="realmTile"><b>{r}</b><div className="chipRow wrap">{Object.entries(safeObj(d[r])).map(([k,val]:any)=><span key={k} className={'tag rel-'+String(textOf(val)).toLowerCase().replace(/[^a-z]+/g,'-')}>{k+': '+textOf(val)}</span>)}</div></div>)}</div>:<Empty>No diplomatic information recorded.</Empty>}</Panel>
  <Panel title="Known wars" icon="sword">{wars.length?<div className="tileGrid">{wars.map((x:any,i:number)=><Rec key={x.id||i} icon="sword" tone="hurt" title={x.name||'Conflict'} right={x.status||''}/>)}</div>:<Empty>No known active wars.</Empty>}</Panel>
  <Panel title="Known treaties" icon="scroll">{ts.length?<div className="tileGrid">{ts.map((x:any,i:number)=><Rec key={x.id||i} icon="scroll" title={x.name||'Treaty'} right={x.status||'in force'}/>)}</div>:<Empty>No treaty details learned yet.</Empty>}</Panel>
 </div>;
}
function FaithsScreen({v}:{v:any}){
 var s=safeObj(v['religion-state']);
 return <div className="screen ledger"><Panel title="Faith & rite" sub="Councils, festivals, disputes you know about" icon="temple">{Object.keys(s).length?<div className="tileGrid">{Object.keys(s).map((k:string)=><Rec key={k} icon="temple" title={k} line={textOf(s[k])}/>)}</div>:<Empty>No religious affairs recorded in your knowledge.</Empty>}</Panel></div>;
}
function NewsScreen({v}:{v:any}){
 var news=safeArr(v['news-network']).filter((x:any)=>x.playerKnown!==false), rumors=safeArr(v['rumor-network']).filter((x:any)=>x.playerHeard!==false), priv=safeArr(v['private-conversations-heard']);
 return <div className="screen ledger">
  <div className="sumStrip"><div><small>News</small><b>{news.length}</b></div><div><small>Rumors</small><b>{rumors.length}</b></div><div><small>Overheard</small><b>{priv.length}</b></div></div>
  <Panel title="News" icon="scroll">{news.length?<div className="tileGrid">{news.map((x:any,i:number)=><Rec key={x.id||i} icon="scroll" title={x.headline||x.title||x.subject||'Report'} line={[x.source,x.date].filter(Boolean).join(' · ')}/>)}</div>:<Empty>No news reports recorded.</Empty>}</Panel>
  <Panel title="Rumors" icon="talk">{rumors.length?<div className="tileGrid">{rumors.map((x:any,i:number)=><Rec key={x.id||i} icon="talk" title={x.subject||x.title||'Rumor'} line={x.currentWording||x.text||''} right={x.credibility!=null?x.credibility+'%':''}/>)}</div>:<Empty>No rumors recorded.</Empty>}</Panel>
  <Panel title="Things overheard" icon="eye">{priv.length?<div className="tileGrid">{priv.map((x:any,i:number)=><Rec key={x.id||i} icon="eye" title={x.place||'Conversation'} line={x.text||x.summary||''} right={x.date||''}/>)}</div>:<Empty>Nothing noteworthy overheard yet.</Empty>}</Panel>
 </div>;
}
function Chronicle({v}:{v:any}){
 var h=safeObj(v['historical-knowledge']);
 return <div className="screen ledger"><Panel title="History" sub="Learned from people, monuments, books and records" icon="book">{Object.keys(h).length?<div className="tileGrid">{Object.keys(h).map((k:string)=><Rec key={k} icon="book" title={k} line={typeof h[k]==='string'?h[k]:textOf(h[k])} right={h[k]&&h[k].confidence!=null?h[k].confidence+'%':''}/>)}</div>:<Empty>Your history is still mostly blank.</Empty>}</Panel></div>;
}

function ToggleRow({title,detail,on,value}:{title:string,detail:string,on:any,value:boolean}){
 return <button type="button" className={'switchTile'+(value?' on':'')} onClick={()=>on(!value)} aria-pressed={value}><span className="tileWords"><b>{title}</b><small>{detail}</small></span><span className="switch" aria-hidden="true"><i/></span></button>;
}
function AudioSettings({prefs,onChange,layout}:{prefs:any,onChange:any,layout?:any}){
 return <div className="screen ledger audioScreen">
  {layout?<LayoutCard layout={layout}/>:null}
  <Panel title="Sound" sub="Each layer is separate" icon="talk">
   <div className="tileGrid">
    <ToggleRow title="Music" detail="Location, exploration, tavern, city and regional melodies." value={!!prefs.music} on={(x:any)=>onChange('music',x)}/>
    <ToggleRow title="Combat music" detail="Battle music when combat begins. Off keeps the location melody." value={!!prefs.combat} on={(x:any)=>onChange('combat',x)}/>
    <ToggleRow title="Atmosphere" detail="Weather, forests, waves, fireplaces, ruins and room tone." value={!!prefs.ambience} on={(x:any)=>onChange('ambience',x)}/>
    <ToggleRow title="Voices & crowds" detail="Low chatter in taverns, Guild halls and markets. Off by default." value={!!prefs.voices} on={(x:any)=>onChange('voices',x)}/>
    <ToggleRow title="Event sounds" detail="Quest, level-up, spell, victory, weapon and other short effects." value={!!prefs.sfx} on={(x:any)=>onChange('sfx',x)}/>
   </div>
   <p className="muted">Voices sit well below the music. Tavern and Guild chatter are real public-domain room recordings.</p>
  </Panel>
 </div>;
}
