
/* ---------- the Chronicle: how a reply is drawn ----------
   The narrator's pinned header line (| Morning | 08:14 AM | date | moon | place | season | weather |)
   becomes a slim scene line; "@Name" before a speaker's lines becomes a speaker card; a line of
   dice resolution in parentheses becomes a roll token; everything else is prose. */
function parseScene(text:string){
 var lines=String(text||'').replace(/\r/g,'').split('\n'), head:any=null;
 while(lines.length&&!lines[0].trim())lines.shift();
 if(lines.length&&/^\s*\|.*\|\s*$/.test(lines[0])){ var cells=lines[0].split('|').map((x:string)=>x.trim()).filter(Boolean); head={tod:cells[0]||'',time:cells[1]||'',date:cells[2]||'',moon:cells[3]||'',place:cells[4]||'',season:cells[5]||'',weather:cells[6]||''}; lines.shift(); }
 var blocks:any[]=[]; var cur:any=null;
 lines.join('\n').split(/\n\s*\n+/).forEach((raw:string)=>{
   var ls=raw.replace(/^\s*\n/,'').split('\n'); var first=(ls[0]||'').trim(); var m=first.match(/^@\s*([^\n@]{1,48})$/);
   if(m){ cur={kind:'speech',who:m[1].trim(),body:ls.slice(1).join('\n').trim()}; if(cur.body)blocks.push(cur); return; }
   var t=raw.trim(); if(!t)return;
   if(t.indexOf('\n')<0&&/^\(.*(\d+d\d+|\bvs\.?\s|\bDR\s*\d|damage).*\)$/i.test(t)){ blocks.push({kind:'roll',body:t.slice(1,-1)}); return; }
   if(cur&&cur.kind==='speech'&&/^["“]/.test(t)){ cur.body+='\n\n'+t; return; }
   cur=null; blocks.push({kind:'prose',body:t});
 });
 return {head,blocks};
}
function StoryBubble(p:any){
 var md=typeof p.renderMarkdown==='function'?p.renderMarkdown:(x:string)=>x;
 if(p.role==='system')return null;
 if(p.role==='user')return <div className="youSaid"><div dangerouslySetInnerHTML={{__html:md(String(p.content||''))}}/></div>;
 var sc=parseScene(p.content);
 return <div className="scene">
  {sc.head?<div className="sceneHead"><span>{[sc.head.tod,sc.head.time].filter(Boolean).join(' · ')}</span><b>{sc.head.place}</b><span>{sc.head.weather}</span></div>:null}
  {sc.blocks.map((b:any,i:number)=>b.kind==='speech'
   ?<div key={i} className="speaker"><span className="speakerSeal">{initialsOf(b.who)}</span><div className="speakerWords"><b>{b.who}</b><div dangerouslySetInnerHTML={{__html:md(b.body)}}/></div></div>
   :b.kind==='roll'?<div key={i} className="roll"><ElIcon n="dice" s={14}/><span>{b.body}</span></div>
   :<div key={i} className="prose" dangerouslySetInnerHTML={{__html:md(b.body)}}/>)}
  {p.isStreaming?<span className="quill" aria-label="The narrator is writing"/>:null}
 </div>;
}
/* ---------- what the quick actions offer, from where you stand ---------- */
function placeKind(v:any){
 var t=(String(v['current-location']||'')+' '+String(v['current-sublocation']||'')).toLowerCase();
 if(v['in-combat'])return 'combat';
 if(/tavern|inn\b|taproom|alehouse|tankard|public house/.test(t))return 'tavern';
 if(/guild/.test(t))return 'guild';
 if(/market|bazaar|souk|stall|shop|emporium/.test(t))return 'market';
 if(/temple|shrine|abbey|monastery|chapel|church|cathedral/.test(t))return 'temple';
 if(/forge|smithy|smith|anvil/.test(t))return 'forge';
 if(/dungeon|ruin|barrow|crypt|tomb|warren|cave|mine|undervein|gullet/.test(t))return 'dungeon';
 if(/road|highway|track|trail|pass|march|wilds?|forest|wood|hills|plains|wastes?|fen|marsh|camp/.test(t))return 'wild';
 if(/port|harbou?r|dock|quay|pier/.test(t))return 'port';
 return 'town';
}
var PLACE_ACTS:any={
 tavern:['Order a meal','Listen for rumors','Ask about work','Rent a room'],
 guild:['Check the quest board','Ask the clerk about my rank','Look for a party','Report in'],
 market:['Browse the stalls','Ask about prices','Sell what I can spare','Haggle'],
 temple:['Offer a prayer','Ask for healing','Speak with a priest','Look around'],
 forge:['Ask about repairs','Commission a weapon','Watch the smiths work','Ask about materials'],
 dungeon:['Search the room','Listen carefully','Move forward cautiously','Check for traps'],
 wild:['Look around','Scout ahead','Search for tracks','Make camp'],
 port:['Ask about passage','Watch the ships','Visit the harbormaster','Look for work on the docks'],
 town:['Look around','Find an inn','Head to the Guild','Walk the streets']
};
var ACT_ICON:any={'Look around':'eye','Order a meal':'flame','Listen for rumors':'talk','Ask about work':'quest','Rent a room':'bed','Check the quest board':'scroll','Ask the clerk about my rank':'crown','Look for a party':'people','Report in':'talk','Browse the stalls':'coin','Ask about prices':'scales','Sell what I can spare':'coin','Haggle':'talk','Offer a prayer':'temple','Ask for healing':'heart','Speak with a priest':'talk','Ask about repairs':'anvil','Commission a weapon':'sword','Watch the smiths work':'eye','Ask about materials':'anvil','Search the room':'eye','Listen carefully':'talk','Move forward cautiously':'run','Check for traps':'shield','Scout ahead':'run','Search for tracks':'eye','Make camp':'tent','Ask about passage':'map','Watch the ships':'eye','Visit the harbormaster':'talk','Look for work on the docks':'quest','Find an inn':'bed','Head to the Guild':'crown','Walk the streets':'run'};
var IDEAS:any={
 tavern:['I find a seat near the hearth and listen to what the regulars are talking about.','I ask the barkeep who in here might need a capable pair of hands.','I buy a round for the table of off-duty guards and ask what they have seen lately.'],
 guild:['I read every posting on the board carefully before choosing.','I ask the clerk what it would take to reach the next rank.','I look around the hall for adventurers who might want a partner.'],
 market:['I walk the stalls slowly, noting prices before I buy anything.','I ask a merchant which goods are scarce this season, and why.','I look for someone who buys monster parts or salvage.'],
 temple:['I light a candle and sit quietly for a while.','I ask the priest what the temple needs help with.'],
 forge:['I ask the smith what it would cost to have my gear properly maintained.','I ask what metals are worth bringing back from the mountains.'],
 dungeon:['I stop, hold my breath and listen before going further.','I check the floor and walls ahead for anything that looks wrong.','I mark the way back before moving on.'],
 wild:['I find high ground and take a long look at the land around me.','I check the road ahead for tracks, and how fresh they are.','I look for a sheltered place to rest before dark.'],
 port:['I ask along the docks which ships are taking passengers, and where to.','I watch the cargo coming ashore and note what sells here.'],
 town:['I take a slow walk through the streets and get a feel for the place.','I ask a local where an honest traveler can find work.','I look for a notice board or town crier.'],
 combat:['I hold my ground and look for an opening.','I fall back to better footing before engaging.','I try to end this without killing anyone.']
};
var RANDOM_IDEAS=['I stop to help someone struggling with a heavy load.','I follow a street I have not walked before.','I strike up a conversation with the first stranger who meets my eye.','I take stock of my coin and my gear.','I write down what I have learned so far in my journal.','I look for somewhere quiet to practice my skills.','I ask around about the oldest place in town.','I spend an hour watching people go about their day.'];
var COMBAT_ACTS=[['Attack','sword','I attack.'],['Defend','shield','I take a defensive stance and protect myself.'],['Cast','magic','CAST'],['Use item','gear','ITEM'],['Fall back','run','I try to disengage and fall back.']];
function Adventure({api,v,reading}:{api:any,v:any,reading?:boolean}){
 var go=useNav(); var busy=!!api.isStreaming;
 const [sheet,setSheet]=React.useState('');
 var kind=placeKind(v); var acts=PLACE_ACTS[kind]||PLACE_ACTS.town;
 var ms=safeArr(api.messages); var lastAi:any=null; for(var i=ms.length-1;i>=0;i--){ if(ms[i]&&ms[i].role==='assistant'){ lastAi=ms[i]; break; } }
 var quests=safeArr(v['quest-log']).filter((q:any)=>q&&!/^(complete|completed|failed|abandoned|done)$/i.test(String(q.status||'')));
 var combat=safeObj(v['combat-state']); var foes=safeArr(combat.enemies||combat.participants||combat.combatants);
 function toast(m:string,t?:string){ try{ api.showToast&&api.showToast(m,t||'info'); }catch(_e){} }
 function act(text:string){ if(busy)return; setSheet(''); api.sendMessage(text); }
 function draft(random:boolean){ var pool=random?RANDOM_IDEAS.concat(IDEAS[kind]||[]):(IDEAS[kind]||IDEAS.town); var idea=pool[Math.floor(Math.random()*pool.length)]; if(typeof api.setComposerDraft==='function')api.setComposerDraft(idea); else toast(idea); }
 function plain(t:string){ return String(t||'').replace(/^\s*\|.*\|\s*$/m,'').replace(/^@.*$/gm,'').replace(/\n{3,}/g,'\n\n').trim(); }
 function copyLast(){ var t=plain(lastAi&&lastAi.content); if(!t)return; try{ if(api.copyToClipboard)api.copyToClipboard(t); else navigator.clipboard.writeText(t); toast('Passage copied.','success'); }catch(_e){ toast('Could not copy that passage.','error'); } }
 function saveLast(){ var t=plain(lastAi&&lastAi.content); if(!t)return; var j=safeArr(v['player-notes']); api.setVariable('player-notes',[...j,{text:t.slice(0,1400),created:String(v['world-date']||'')+' '+String(v['world-time']||''),source:'chronicle'}]); toast('Saved to your Journal.','success'); }
 function regen(){ if(lastAi&&typeof api.regenerateMessage==='function')api.regenerateMessage(lastAi.id); }
 var hp=[v['player-hp'],v['player-max-hp']], mp=[v['player-mana'],v['player-max-mana']], sp=[v['player-stamina'],v['player-max-stamina']];
 var night=/night|midnight|dusk/i.test(partOfDay(v['world-time']));
 var consumables=safeArr(v.inventory).filter((it:any)=>it&&/potion|draught|elixir|tonic|salve|bandage|ration|food|bread|herb|scroll/i.test(String(it.name||'')+' '+String(it.type||'')));
 var spells=Object.entries(safeObj(v['known-spells']));
 var sheetBody:any=null;
 if(sheet==='more')sheetBody=<div className="actGrid">
   {[['Look around','eye','I take a careful look around.'],['Rest a while','bed','I rest for an hour.'],['Make camp / sleep','tent','I find somewhere safe and sleep until morning.'],['Use an item','gear','ITEM'],['Cast a spell','magic','CAST'],['Travel','map','MAP'],['Train','sword','TRAIN'],['Check my gear','gear','GEAR']].map((x:any)=><button key={x[0]} type="button" className="actBtn" disabled={busy&&!/^[A-Z]+$/.test(x[2])} onClick={()=>{ if(x[2]==='ITEM')setSheet('item'); else if(x[2]==='CAST')setSheet('cast'); else if(x[2]==='MAP'){setSheet('');go('world');} else if(x[2]==='TRAIN'){setSheet('');go('training');} else if(x[2]==='GEAR'){setSheet('');go('inventory');} else act(x[2]); }}><ElIcon n={x[1]} s={20}/>{x[0]}</button>)}
   {acts.slice(0).map((a:string)=><button key={'p'+a} type="button" className="actBtn soft" disabled={busy} onClick={()=>act(a+'.')}><ElIcon n={ACT_ICON[a]||'spark'} s={18}/>{a}</button>)}
  </div>;
 if(sheet==='item')sheetBody=consumables.length?<div className="pickList">{consumables.map((it:any,i:number)=><button key={it.id||i} type="button" className="pickRow" disabled={busy} onClick={()=>act('I use my '+(it.name||'item')+'.')}><b>{it.name}</b><small>{(it.qty||1)+' carried'}</small></button>)}</div>:<div className="empty">Nothing you carry looks usable right now. Your full pack is under Gear.</div>;
 if(sheet==='cast')sheetBody=spells.length?<div className="pickList">{spells.map(([k,x]:any)=><button key={k} type="button" className="pickRow" disabled={busy} onClick={()=>act('I cast '+((x&&x.name)||titleCase(k))+'.')}><b>{(x&&x.name)||titleCase(k)}</b><small>{[(x&&x.school)||'',x&&x.mana!=null?x.mana+' MP':''].filter(Boolean).join(' · ')}</small></button>)}</div>:<div className="empty">{v['mana-awakened']?'You know no spells yet.':'Your mana has not awakened.'}</div>;
 return <div className={'screen adventure chron'+(reading?' reading':'')}>
  {reading?null:<div className="statStrip" role="group" aria-label="Your condition">
   <button type="button" className="statCell s-hp" onClick={()=>go('character')}><ElIcon n="heart" s={15}/><div><span>Health<b>{(Number(hp[0])||0)+'/'+(Number(hp[1])||0)}</b></span><div className="sbar"><i style={{width:bar(hp[0],hp[1])+'%'}}/></div><small>{vitalWord(hp[0],hp[1])}</small></div></button>
   <button type="button" className="statCell s-mp" onClick={()=>go('magic')}><ElIcon n="drop" s={15}/><div><span>Mana<b>{(Number(mp[0])||0)+'/'+(Number(mp[1])||0)}</b></span><div className="sbar"><i style={{width:bar(mp[0],mp[1])+'%'}}/></div><small>{poolWord(mp[0],mp[1])}</small></div></button>
   <button type="button" className="statCell s-sp" onClick={()=>go('character')}><ElIcon n="bolt" s={15}/><div><span>Stamina<b>{(Number(sp[0])||0)+'/'+(Number(sp[1])||0)}</b></span><div className="sbar"><i style={{width:bar(sp[0],sp[1])+'%'}}/></div><small>{poolWord(sp[0],sp[1])}</small></div></button>
   <div className="statCell s-sky" title={[v.season,v.weather,v['moon-phase']].filter(Boolean).join(' · ')}><ElIcon n={night?'moon':'sun'} s={16}/><div><span>{partOfDay(v['world-time'])}</span><b>{displayWorldTime(v['world-time'])}</b><small>{v.weather||''}</small></div></div>
  </div>}
  {!reading&&quests.length?<button type="button" className="ticker" onClick={()=>go('quests')}><span>Quest</span><em>{(quests[0].title||quests[0].id)+(quests[0].deadline?' · due '+quests[0].deadline:'')}</em><ElIcon n="chev" s={13}/></button>:null}
  {v['in-combat']?<div className="combatBar"><b><ElIcon n="sword" s={15}/>{'Combat'+(combat.location?' · '+combat.location:'')}</b>{foes.slice(0,4).map((f:any,i:number)=><span key={i}>{typeof f==='string'?f:[f.name,f.hp!=null&&f.maxHp!=null?f.hp+'/'+f.maxHp:f.condition].filter(Boolean).join(' · ')}</span>)}</div>:null}
  <div className="storyCard">
   <i className="pc tl"/><i className="pc tr"/><i className="pc bl"/><i className="pc br"/>
   <div className="storyHead"><span className="storyLabel"><ElEmblem s={16}/>The Chronicle</span>
    <div className="storyTools" role="toolbar" aria-label="Latest passage">
     <button type="button" disabled={!lastAi} onClick={copyLast} aria-label="Copy the latest passage" title="Copy"><ElIcon n="copy" s={15}/></button>
     <button type="button" disabled={!lastAi||busy||typeof api.regenerateMessage!=='function'} onClick={regen} aria-label="Regenerate the latest passage" title="Regenerate"><ElIcon n="redo" s={15}/></button>
     <button type="button" disabled={!lastAi} onClick={saveLast} aria-label="Save the latest passage to your Journal" title="Save to Journal"><ElIcon n="save" s={15}/></button>
    </div></div>
   <div className="messages"><MessageList rendererComponent={StoryBubble}/></div>
  </div>
  {reading?null:<div className="quickRow" role="toolbar" aria-label="Quick actions">
   <button type="button" className={'qBtn round'+(sheet?' on':'')} aria-label="More actions" aria-expanded={!!sheet} onClick={()=>setSheet(sheet?'':'more')}><ElIcon n="plus" s={15}/></button>
   {busy?<button type="button" className="qBtn busy" onClick={()=>{ try{api.stopGeneration&&api.stopGeneration();}catch(_e){} }}><span className="quill"/>Writing… <b>Stop</b></button>
    :<button type="button" className="qBtn" onClick={()=>draft(false)} title="Put a suggestion in the box. Nothing is sent until you press send."><ElIcon n="spark" s={13}/>Suggest</button>}
   <button type="button" className="qBtn" disabled={busy} onClick={()=>draft(true)} title="Put a random idea in the box. Nothing is sent until you press send."><ElIcon n="dice" s={13}/>Random</button>
   <span className="qSep" aria-hidden="true"/>
   {v['in-combat']
    ?COMBAT_ACTS.map((x:any)=><button key={x[0]} type="button" className="qBtn act" disabled={busy} onClick={()=>{ if(x[2]==='CAST')setSheet('cast'); else if(x[2]==='ITEM')setSheet('item'); else act(x[2]); }}><ElIcon n={x[1]} s={14}/>{x[0]}</button>)
    :acts.map((a:string)=><button key={a} type="button" className="qBtn act" disabled={busy} onClick={()=>act(a+'.')}><ElIcon n={ACT_ICON[a]||'spark'} s={14}/>{a}</button>)}
  </div>}
  {sheet?<Sheet title={sheet==='item'?'Use an item':sheet==='cast'?'Cast a spell':'Actions'} onClose={()=>setSheet('')}>{sheetBody}<p className="sheetNote">{sheet==='more'?'Actions send what your character does as your message. Travel, Training and Gear open their screens.':'Tap one to send it as your action.'}</p></Sheet>:null}
 </div>;
}
