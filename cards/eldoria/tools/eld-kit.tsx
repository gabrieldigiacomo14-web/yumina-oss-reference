
/* =====================================================================================
   THE PACK — Eldoria's physical inventory (v21.6), the same system as Surviving the Game
   as a Barbarian's Kit, built on Eldoria's own data: every item is one real thing that is
   somewhere — worn (the `equipment` slots), in a named pocket of a worn bag, pouch, quiver
   or scabbard, loose in your hands, or on the ground where you left it. Reach decides what
   you can use in a hurry. `inventory` and `equipment` stay authoritative and keep their
   shape; items only gain a `placement`.
   ===================================================================================== */
var EK_STORAGE:any={
 belt_pouch:{name:'Belt pouch',wear:'belt',slots:[
  {id:'pocket-1',label:'Pocket 1',bulk:2,weight:2,access:'quick',allowed:['small']},
  {id:'pocket-2',label:'Pocket 2',bulk:2,weight:2,access:'quick',allowed:['small']},
  {id:'pocket-3',label:'Pocket 3',bulk:2,weight:2,access:'quick',allowed:['small']}]},
 satchel:{name:'Satchel',wear:'pack',slots:[
  {id:'main',label:'Main compartment',bulk:12,weight:14,access:'buried',allowed:['general']},
  {id:'side-left',label:'Left pocket',bulk:3,weight:3,access:'ready',allowed:['small','bottle']},
  {id:'side-right',label:'Right pocket',bulk:3,weight:3,access:'ready',allowed:['small','bottle']},
  {id:'strap',label:'Lower strap',bulk:6,weight:5,access:'slow',allowed:['bedroll','rope','tool']}]},
 backpack:{name:'Backpack',wear:'pack',slots:[
  {id:'main',label:'Main compartment',bulk:22,weight:24,access:'buried',allowed:['general']},
  {id:'top',label:'Top pouch',bulk:5,weight:5,access:'ready',allowed:['small','bottle']},
  {id:'side-left',label:'Left side pocket',bulk:4,weight:4,access:'ready',allowed:['small','bottle']},
  {id:'side-right',label:'Right side pocket',bulk:4,weight:4,access:'ready',allowed:['small','bottle']},
  {id:'bedroll',label:'Bedroll straps',bulk:8,weight:7,access:'slow',allowed:['bedroll']},
  {id:'weapon-left',label:'Weapon holder L',bulk:8,weight:8,access:'slow',allowed:['weapon']},
  {id:'weapon-right',label:'Weapon holder R',bulk:8,weight:8,access:'slow',allowed:['weapon']}]},
 expedition_pack:{name:'Expedition pack',wear:'pack',slots:[
  {id:'main',label:'Deep compartment',bulk:36,weight:38,access:'buried',allowed:['general']},
  {id:'top',label:'Top pouch',bulk:7,weight:7,access:'ready',allowed:['small','bottle']},
  {id:'side-left',label:'Left pocket',bulk:5,weight:5,access:'ready',allowed:['small','bottle']},
  {id:'side-right',label:'Right pocket',bulk:5,weight:5,access:'ready',allowed:['small','bottle']},
  {id:'utility-1',label:'Utility pouch 1',bulk:4,weight:4,access:'quick',allowed:['small','tool']},
  {id:'utility-2',label:'Utility pouch 2',bulk:4,weight:4,access:'quick',allowed:['small','tool']},
  {id:'bedroll',label:'Bedroll straps',bulk:10,weight:9,access:'slow',allowed:['bedroll']},
  {id:'weapon-left',label:'Weapon holder L',bulk:10,weight:10,access:'slow',allowed:['weapon']},
  {id:'weapon-right',label:'Weapon holder R',bulk:10,weight:10,access:'slow',allowed:['weapon']}]},
 quiver:{name:'Quiver',wear:'back',slots:[
  {id:'arrows',label:'Arrow channel',bulk:8,weight:6,access:'quick',allowed:['arrow']},
  {id:'side-loop',label:'Side loop',bulk:2,weight:2,access:'ready',allowed:['small','tool']}]},
 scabbard:{name:'Scabbard',wear:'hip',slots:[{id:'blade',label:'Scabbard',bulk:7,weight:6,access:'quick',allowed:['sword']}]},
 sheath:{name:'Sheath',wear:'belt',slots:[{id:'blade',label:'Sheath',bulk:3,weight:3,access:'quick',allowed:['dagger']}]}
};
var EK_WEAR_LABEL:any={belt:'Belt',back:'Back',hip:'Hip',pack:'Pack'};
var EK_TIERS=[['hand','In hand','Already in your grip'],['worn','Worn','On your body'],['quick','Quick','A pocket or holder you reach in a heartbeat'],['ready','Ready','A side pocket: a moment’s fumbling'],['slow','Slow','Straps and holders: you must stop to get it'],['buried','Buried','Deep in the pack: it means taking the pack off'],['loose','Loose','In your arms, or stuffed anywhere']];
var EK_WORD:any={hand:'in hand',worn:'worn',quick:'quick',ready:'ready',slow:'slow',buried:'buried',loose:'loose',away:'not with you'};
var EK_FIGHT_OK:any={hand:1,worn:1,quick:1,ready:1};
var EK_SLOTS=[['weapon','Main hand'],['offhand','Off hand'],['head','Head'],['cloak','Cloak'],['chest','Body'],['hands','Hands'],['legs','Legs'],['feet','Feet'],['accessory1','Trinket'],['accessory2','Trinket'],['pack','Pack']];
function ekText(it:any){ return (String(it&&it.name||'')+' '+String(it&&it.type||'')+' '+(Array.isArray(it&&it.properties)?it.properties.join(' '):'')).toLowerCase(); }
function ekStorageKey(it:any){
 var n=String(it&&it.name||'').toLowerCase()+' '+String(it&&it.type||'').toLowerCase();
 if(it&&it.storage&&EK_STORAGE[it.storage])return it.storage;
 if(/expedition pack|trekking pack/.test(n))return 'expedition_pack';
 if(/backpack|rucksack|knapsack|pack frame|adventurer.?s pack|explorer.?s pack/.test(n))return 'backpack';
 if(/satchel|shoulder bag|haversack|saddlebag|day ?pack/.test(n))return 'satchel';
 if(/belt pouch|coin pouch|purse pouch|utility pouch/.test(n))return 'belt_pouch';
 if(/quiver/.test(n))return 'quiver';
 if(/scabbard/.test(n))return 'scabbard';
 if(/\bsheath\b/.test(n))return 'sheath';
 return '';
}
function ekStorage(it:any){ var k=ekStorageKey(it); return k?EK_STORAGE[k]:null; }
function ekTags(it:any){
 var t=ekText(it), out=['general'];
 if(/sword|blade|sabre|saber|rapier|falchion|scimitar/.test(t))out.push('weapon','sword');
 else if(/dagger|knife|dirk|stiletto/.test(t))out.push('weapon','dagger','small');
 else if(/axe|mace|hammer|spear|staff|club|flail|halberd|bow|crossbow|wand|rod/.test(t))out.push('weapon');
 if(/arrow|bolt/.test(t))out.push('arrow');
 if(/potion|draught|elixir|tonic|flask|bottle|waterskin|vial|salve/.test(t))out.push('bottle','small');
 if(/bedroll|blanket/.test(t))out.push('bedroll');
 if(/rope/.test(t))out.push('rope','tool');
 if(/torch|flint|tinder|tool|kit|lockpick|whetstone|hammer|chisel|lantern/.test(t))out.push('tool');
 if(ekBulk(it,true)<=2)out.push('small');
 return out;
}
function ekBulk(it:any,one?:boolean){
 if(!it)return 0; var t=ekText(it), w=Math.max(0,Number(it.weight)||0), n=one?1:Math.max(1,Number(it.qty)||1);
 if(typeof it.bulk==='number')return it.bulk*n;
 var b= /greatsword|greataxe|halberd|longbow|warhammer|great axe|war hammer|two-handed|polearm/.test(t)?8
  : /bow|crossbow|spear|staff/.test(t)?7
  : /sword|axe|mace|hammer|flail|club/.test(t)?5
  : /dagger|knife/.test(t)?2
  : /arrow|bolt/.test(t)?0.1
  : /potion|draught|elixir|vial|salve|ration|bandage|coin|gem|ring|herb/.test(t)?1
  : /waterskin|flask|bottle/.test(t)?2
  : /bedroll|blanket/.test(t)?6 : /rope/.test(t)?5 : /\b(lantern|lamp)\b/.test(t)?2 : /\b(helm|helmet|hood|cap|coif)\b/.test(t)?4
  : /armor|armour|mail|plate|jerkin|cuirass|robe/.test(t)?Math.max(4,Math.ceil(w*0.8))
  : Math.max(1,Math.ceil(w*0.65));
 return Math.round(b*n*10)/10;
}
function ekW(it:any){ return Math.max(0,Number(it&&it.weight)||0)*Math.max(1,Number(it&&it.qty)||1); }
function ekPlacement(it:any,eq:any){
 if(it&&it.equipped){ var s=Object.keys(eq||{}).find((k:string)=>k!=='tools'&&eq[k]===it.id); return {kind:'body',slot:s||it.slot||'worn'}; }
 var p=it&&it.placement&&typeof it.placement==='object'?it.placement:null;
 return p?p:{kind:'loose'};
}
function ekBag(inv:any[],id:any){ return inv.find((x:any)=>x&&x.id===id); }
function ekWornBag(b:any,eq:any){ return !!(b&&ekStorage(b)&&(b.equipped||ekPlacement(b,eq).kind==='body')); }
function ekOcc(inv:any[],cid:any,sid?:any){ return inv.filter((x:any)=>{var p=x&&x.placement; return p&&p.kind==='container'&&p.containerId===cid&&(sid===undefined||p.slotId===sid);}); }
function ekUsed(inv:any[],cid:any,sid:any,skip?:any){ var b=0,w=0; ekOcc(inv,cid,sid).forEach((x:any)=>{ if(x.id!==skip){ b+=ekBulk(x); w+=ekW(x); } }); return {bulk:Math.round(b*10)/10,weight:Math.round(w*10)/10}; }
function ekFits(inv:any[],eq:any,it:any,bag:any,sl:any){
 if(!it||!bag||!sl)return {ok:false,why:'missing object'};
 if(it.id===bag.id)return {ok:false,why:'a bag cannot hold itself'};
 if(ekStorage(it))return {ok:false,why:'bags are not carried inside other bags'};
 if(it.equipped)return {ok:false,why:'take it off first'};
 if(!ekWornBag(bag,eq))return {ok:false,why:'that bag is not being worn'};
 var tags=ekTags(it); if(sl.allowed.indexOf('general')<0&&!sl.allowed.some((a:string)=>tags.indexOf(a)>=0))return {ok:false,why:'that pocket does not take this kind of thing'};
 var u=ekUsed(inv,bag.id,sl.id,it.id);
 if(u.bulk+ekBulk(it)>sl.bulk+1e-9)return {ok:false,why:'not enough room'};
 if(u.weight+ekW(it)>sl.weight+1e-9)return {ok:false,why:'too heavy for that pocket'};
 return {ok:true,why:''};
}
var EK_RANK:any={quick:0,ready:1,slow:2,buried:3};
function ekBestSpot(inv:any[],eq:any,it:any){
 var best:any=null;
 inv.forEach((b:any)=>{ var st=ekStorage(b); if(!st||!ekWornBag(b,eq))return; st.slots.forEach((sl:any)=>{ if(!ekFits(inv,eq,it,b,sl).ok)return; var special=sl.allowed.indexOf('general')<0?0:1, sc=special*10+(EK_RANK[sl.access]||0); if(!best||sc<best.sc)best={bag:b,sl:sl,sc:sc}; }); });
 return best;
}
function ekTier(it:any,inv:any[],eq:any){
 var p=ekPlacement(it,eq);
 if(p.kind==='body')return (p.slot==='weapon'||p.slot==='offhand')?'hand':'worn';
 if(p.kind==='container'){ var b=ekBag(inv,p.containerId), st=b&&ekStorage(b), sl=st&&st.slots.find((s:any)=>s.id===p.slotId); if(!b||!ekWornBag(b,eq))return 'away'; return sl?sl.access:'buried'; }
 if(p.kind==='world')return 'away';
 return 'loose';
}
function ekPlaceLabel(it:any,inv:any[],eq:any){
 var p=ekPlacement(it,eq);
 if(p.kind==='body'){ var s=EK_SLOTS.find((x:any)=>x[0]===p.slot); return s?s[1]:(EK_WEAR_LABEL[p.slot]||titleCase(String(p.slot))); }
 if(p.kind==='container'){ var b=ekBag(inv,p.containerId), st=b&&ekStorage(b), sl=st&&st.slots.find((s:any)=>s.id===p.slotId); return (b?b.name:'a bag')+(sl?' · '+sl.label:''); }
 if(p.kind==='world')return 'Left at '+(p.location||'somewhere');
 return ekStorage(it)?'Not worn':'Loose';
}
function ekNeedsRepair(it:any){ var c=Number(it&&it.condition); return isFinite(c)&&c<35; }
// Items the narrator added have no placement yet: worn gear goes on the body; the rest into the best free pocket, or loose.
function ekSettle(inv:any[],eq:any){
 var changed=false, out=inv.map((x:any)=>Object.assign({},x));
 out.forEach((x:any)=>{
  var p=x.placement;
  if(x.equipped){ if(!p||p.kind!=='body'){ x.placement={kind:'body',slot:ekPlacement(x,eq).slot}; changed=true; } return; }
  if(p&&p.kind==='body'&&!ekStorage(x)){ x.placement={kind:'loose'}; changed=true; return; }
  if(p&&p.kind==='container'&&!ekBag(out,p.containerId)){ x.placement={kind:'loose'}; changed=true; return; }
  if(!p){ if(ekStorage(x)){ x.placement={kind:'loose'}; changed=true; return; } var s=ekBestSpot(out,eq,x); x.placement=s?{kind:'container',containerId:s.bag.id,slotId:s.sl.id}:{kind:'loose'}; changed=true; }
 });
 return {changed:changed,items:out};
}
function ekStatRows(it:any){
 var rows:any[]=[['Weight',(Number(it&&it.weight)||0)+' lb',-1,Number(it&&it.weight)||0],['Condition',(it&&it.condition!=null?it.condition:100)+'%',1,Number(it&&it.condition!=null?it.condition:100)]];
 if(it&&it.valueCp!=null)rows.push(['Value',money(it.valueCp),0,null]);
 if(it&&Array.isArray(it.properties)&&it.properties.length)rows.push(['Properties',it.properties.join(', '),0,null]);
 ['damage','armor','armorRating','reach','accuracy','block'].forEach((k:string)=>{ if(it&&it[k]!=null)rows.push([titleCase(k),String(it[k]),1,Number(it[k])]); });
 if(it&&isTwoHanded(it))rows.push(['Hands','two',0,null]);
 return rows;
}

function EldKit({api,v}:{api:any,v:any}){
 var inv0=safeArr(v.inventory), eq=safeObj(v.equipment), ac=safeObj(v['bank-accounts']);
 var settled=ekSettle(inv0,eq), inv=settled.items;
 React.useEffect(()=>{ if(settled.changed)api.setVariable('inventory',settled.items); },[JSON.stringify(inv0.map((x:any)=>[x.id,x.placement,x.equipped]))]);
 var here=String(v['current-location']||''), ground=safeArr(v['ground-items']).filter((g:any)=>String((g&&g.placement&&g.placement.location)||'')===here);
 var fighting=!!v['in-combat']; var busy=!!api.isStreaming; var go=useNav();
 const [sel,setSel]=React.useState<any>(null); const [moving,setMoving]=React.useState(false); const [slotPick,setSlotPick]=React.useState<any>(null);
 const [filter,setFilter]=React.useState('all'); const [sort,setSort]=React.useState('place'); const [q,setQ]=React.useState(''); const [note,setNote]=React.useState('');
 function tell(m:string){ setNote(m); }
 function write(next:any[],msg:string,eqNext?:any){
  api.setVariable('inventory',next); if(eqNext)api.setVariable('equipment',eqNext);
  if(msg&&api.injectContext)api.injectContext('[UI PHYSICAL ACTION — ALREADY APPLIED] '+msg+' Inventory and equipment already reflect this; do not apply it again.');
 }
 function equip(it:any){
  var st=ekStorage(it);
  if(st&&st.wear!=='pack'){ write(inv.map((x:any)=>x.id===it.id?Object.assign({},x,{placement:{kind:'body',slot:st.wear}}):x),'The player put on '+it.name+'.'); return; }
  var slot=st?'pack':guessSlot(it,eq); if(!slot){ tell('That has no place on the body.'); return; }
  var newEq={...eq}; var next=inv.map((x:any)=>({...x})); var off:string[]=[];
  function takeOff(id:any){ if(!id||id===it.id)return; var p=next.find((x:any)=>x.id===id); if(p){ p.equipped=false; off.push(p.name); var s=ekStorage(p); if(s){ p.placement={kind:'loose'}; } else { var sp=ekBestSpot(next,newEq,p); p.placement=sp?{kind:'container',containerId:sp.bag.id,slotId:sp.sl.id}:{kind:'loose'}; } } }
  takeOff(newEq[slot]);
  if(slot==='weapon'&&isTwoHanded(it)&&newEq.offhand){ takeOff(newEq.offhand); newEq.offhand=null; }
  newEq[slot]=it.id; var self=next.find((x:any)=>x.id===it.id); if(self){ self.equipped=true; self.placement={kind:'body',slot:slot}; }
  write(next,'The player equipped '+it.name+' ('+slot+')'+(off.length?', taking off '+off.join(', '):'')+'.',newEq);
  tell(it.name+' equipped'+(off.length?'; '+off.join(', ')+' put away':'')+'.');
 }
 function unequip(it:any){
  var st=ekStorage(it);
  if(st&&st.wear!=='pack'&&!it.equipped){ write(inv.map((x:any)=>x.id===it.id?Object.assign({},x,{placement:{kind:'loose'}}):x),'The player took off '+it.name+'; its contents stayed inside it.'); return; }
  var slot=Object.keys(eq).find((k:string)=>k!=='tools'&&eq[k]===it.id); var newEq={...eq}; if(slot)newEq[slot]=null;
  var next=inv.map((x:any)=>({...x})); var self=next.find((x:any)=>x.id===it.id); if(!self)return;
  self.equipped=false;
  if(st){ self.placement={kind:'loose'}; } else { var sp=ekBestSpot(next,newEq,self); self.placement=sp?{kind:'container',containerId:sp.bag.id,slotId:sp.sl.id}:{kind:'loose'}; }
  write(next,'The player took off '+it.name+(st?'; its contents stayed inside it':'')+'.',newEq);
  tell(it.name+' → '+ekPlaceLabel(self,next,newEq)+'.');
 }
 function place(it:any,bag:any,sl:any){
  var t=ekFits(inv,eq,it,bag,sl); if(!t.ok){ tell('Can’t: '+t.why+'.'); return; }
  write(inv.map((x:any)=>x.id===it.id?Object.assign({},x,{placement:{kind:'container',containerId:bag.id,slotId:sl.id}}):x),'The player put '+it.name+' into '+bag.name+' — '+sl.label+'.');
  setMoving(false); tell(it.name+' → '+bag.name+', '+sl.label+'.');
 }
 function holdLoose(it:any){ write(inv.map((x:any)=>x.id===it.id?Object.assign({},x,{placement:{kind:'loose'}}):x),'The player took '+it.name+' out and is holding it.'); setMoving(false); }
 function autoStow(it:any){ var s=ekBestSpot(inv,eq,it); if(!s){ tell('Nothing you wear has room for '+it.name+'.'); return; } place(it,s.bag,s.sl); }
 function drop(it:any,one:boolean){
  var n=one?1:Math.max(1,Number(it.qty)||1);
  var piece=Object.assign({},it,{qty:n,equipped:false,placement:{kind:'world',location:here||'unknown'}});
  var next=(Number(it.qty)||1)>n?inv.map((x:any)=>x.id===it.id?Object.assign({},x,{qty:(Number(x.qty)||1)-n}):x):inv.filter((x:any)=>x.id!==it.id);
  api.setVariable('ground-items',safeArr(v['ground-items']).concat([piece]).slice(-80));
  write(next,'The player dropped '+(n>1?n+' ':'')+it.name+' at '+(here||'the current location')+'. It is now in ground-items and no longer carried.');
  setSel(null); tell('Dropped '+it.name+'.');
 }
 function pickUp(g:any){
  var all=safeArr(v['ground-items']); var ix=all.indexOf(g); if(ix<0)return;
  var obj:any=Object.assign({},g,{equipped:false}); delete obj.placement;
  if(inv.some((x:any)=>x.id===obj.id))obj.id=String(obj.id||'item')+'-'+Date.now().toString(36);
  var s=ekBestSpot(inv,eq,obj); obj.placement=s?{kind:'container',containerId:s.bag.id,slotId:s.sl.id}:{kind:'loose'};
  api.setVariable('ground-items',all.filter((_:any,j:number)=>j!==ix));
  write(inv.concat([obj]),'The player picked up '+obj.name+' at '+(here||'the current location')+'.');
  tell('Picked up '+obj.name+(s?' → '+s.bag.name:' (held)')+'.');
 }
 function split(it:any,n:number){
  var q2=Number(it.qty)||1; if(q2<2)return; var take=Math.max(1,Math.min(q2-1,n));
  var piece=Object.assign({},it,{id:String(it.id||'item')+'-'+Date.now().toString(36),qty:take,equipped:false,placement:{kind:'loose'}});
  write(inv.map((x:any)=>x.id===it.id?Object.assign({},x,{qty:q2-take}):x).concat([piece]),'The player split '+take+' '+it.name+' off the stack and is holding them.');
  setSel(piece.id); tell('Split '+take+' off — held loose.');
 }
 function useIt(it:any){
  var tier=ekTier(it,inv,eq);
  if(fighting&&!EK_FIGHT_OK[tier]){ tell(it.name+' is '+EK_WORD[tier]+' — you can’t get at it mid-fight.'); return; }
  if(busy)return; setSel(null); api.sendMessage('I use my '+(it.name||'item')+' ('+EK_WORD[tier]+').');
 }

 // ---------- derived
 var bySlot:any={}; Object.keys(eq).forEach((k:string)=>{ if(k!=='tools'&&eq[k]){ var it=inv.find((x:any)=>x.id===eq[k]); if(it)bySlot[k]=it; } });
 var bags=inv.filter((x:any)=>ekStorage(x));
 var tiers:any={}; inv.forEach((x:any)=>{ if(ekStorage(x)&&ekWornBag(x,eq))return; var t=ekTier(x,inv,eq); (tiers[t]=tiers[t]||[]).push(x); });
 var str=Number(safeObj(v.attributes).strength)||10, packIt=eq.pack?inv.find((x:any)=>x.id===eq.pack):null, bonus=packIt?(Number(packIt.capacityBonus)||20):0;
 var carried=Math.round(inv.reduce((n:number,x:any)=>n+(ekPlacement(x,eq).kind==='world'?0:ekW(x)),0)*10)/10;
 var th=[str*4+bonus,str*8+bonus,str*12+bonus,str*16+bonus];
 var band=v.encumbrance||'Unburdened', tone=/unburdened|loaded/i.test(band)?'ok':/heavily|overloaded/i.test(band)?'bad':'warn';
 var repairN=inv.filter(ekNeedsRepair).length;
 var kinds=(x:any)=>{ var t=ekText(x); return ekStorage(x)?'tools':/sword|blade|dagger|knife|axe|mace|hammer|spear|staff|bow|club|flail|wand|halberd/.test(t)?'weapons':/armor|armour|mail|plate|shield|helm|boots|gloves|gauntlet|greave|cloak|jerkin|robe|hood/.test(t)?'armor':/potion|draught|elixir|tonic|salve|bandage|ration|food|bread|herb|water|ale/.test(t)?'food':/rope|torch|flint|tool|kit|lantern|bedroll|blanket|lockpick/.test(t)?'tools':'other'; };
 var list=inv.filter((x:any)=>(filter==='all'||(filter==='worn'?!!x.equipped:filter==='repair'?ekNeedsRepair(x):kinds(x)===filter))&&(!q||String(x.name||'').toLowerCase().indexOf(q.toLowerCase())>=0));
 var order:any={hand:0,worn:1,quick:2,ready:3,slow:4,buried:5,loose:6,away:7};
 list.sort((a:any,b:any)=>sort==='name'?String(a.name).localeCompare(String(b.name)):sort==='weight'?ekW(b)-ekW(a):sort==='worth'?(Number(b.valueCp)||0)*(b.qty||1)-(Number(a.valueCp)||0)*(a.qty||1):(order[ekTier(a,inv,eq)]-order[ekTier(b,inv,eq)])||String(a.name).localeCompare(String(b.name)));
 var pct=(x:number)=>Math.min(100,x/Math.max(1,th[3])*100);
 var it=sel?inv.find((x:any)=>x.id===sel):null;

 var sheet:any=null;
 if(it){
  var st=ekStorage(it), tier=ekTier(it,inv,eq), slot=st?(st.wear==='pack'?'pack':null):guessSlot(it,eq), rival=!it.equipped&&slot&&eq[slot]&&eq[slot]!==it.id?inv.find((x:any)=>x.id===eq[slot]):null;
  var targets:any[]=[]; bags.forEach((b:any)=>ekStorage(b).slots.forEach((sl:any)=>{ var p=it.placement||{}; var inHere=p.kind==='container'&&p.containerId===b.id&&p.slotId===sl.id; var t=ekFits(inv,eq,it,b,sl); var u=ekUsed(inv,b.id,sl.id); targets.push({b:b,sl:sl,ok:t.ok&&!inHere,why:inHere?'it is already here':t.why,u:u}); }));
  targets.sort((a:any,b:any)=>(b.ok?1:0)-(a.ok?1:0));
  var mine=ekStatRows(it), theirs=rival?ekStatRows(rival):null;
  sheet=<Sheet title={(it.name||'Item')+((Number(it.qty)||1)>1?' ×'+it.qty:'')} onClose={()=>{setSel(null);setMoving(false);}}>
   <p className="muted">{[ekPlaceLabel(it,inv,eq),'reach: '+EK_WORD[tier],ekW(it)+' lb',ekBulk(it)+' bulk'].join(' · ')}</p>
   {it.description||it.notes?<p className="sheetText">{it.description||it.notes}</p>:null}
   {fighting&&!EK_FIGHT_OK[tier]?<p className="warnLine">{'In a fight this is '+EK_WORD[tier]+': you can’t use it until you get it out.'}</p>:null}
   {ekNeedsRepair(it)?<p className="warnLine">{'Condition '+it.condition+'% — it needs a smith before it fails you.'}</p>:null}
   {theirs?<div className="ekCompare"><div className="ekCmpHead"><span>Compared with what you wear</span><b>{rival.name}</b></div>
     {mine.map((r:any)=>{ var o=theirs.find((x:any)=>x[0]===r[0]); var d=o&&r[3]!=null&&o[3]!=null?Math.round((r[3]-o[3])*10)/10:null; var tone2=d===null||d===0||!r[2]?'':(d*r[2]>0?'up':'down'); return <div key={r[0]} className={'ekCmpRow '+tone2}><span>{r[0]}</span><b>{r[1]}</b><small>{o?o[1]:'—'}</small><em>{d===null||d===0?'':(d>0?'+':'')+d}</em></div>; })}</div>
    :<div className="factGrid tight">{mine.map((r:any)=><div key={r[0]}><small>{r[0]}</small><b>{r[1]}</b></div>)}</div>}
   <div className="sheetActs">
    {!it.equipped&&(slot||(st&&ekPlacement(it,eq).kind!=='body'))?<button type="button" className="btnMain" onClick={()=>{equip(it);setSel(null);}}>{st?'Put on':rival?'Equip (replaces '+rival.name+')':'Equip'}</button>:null}
    {it.equipped||(st&&ekPlacement(it,eq).kind==='body')?<button type="button" className="btnGhost" onClick={()=>{unequip(it);setSel(null);}}>Take off</button>:null}
    {!st?<button type="button" className="btnGhost" disabled={busy} onClick={()=>useIt(it)}>Use</button>:null}
    {!st&&!it.equipped?<button type="button" className={'btnGhost'+(moving?' on':'')} onClick={()=>setMoving(!moving)}>Move to…</button>:null}
    {(Number(it.qty)||1)>1?<button type="button" className="btnGhost" onClick={()=>split(it,Math.floor((Number(it.qty)||1)/2))}>{'Split '+Math.floor((Number(it.qty)||1)/2)}</button>:null}
    {!it.equipped?<button type="button" className="btnGhost" onClick={()=>drop(it,true)}>{(Number(it.qty)||1)>1?'Drop one':'Drop'}</button>:null}
    <button type="button" className="btnGhost" disabled={busy} onClick={()=>{setSel(null);api.sendMessage('I take a close look at my '+(it.name||'item')+'.');}}>Examine</button>
   </div>
   {moving?<div className="ekMoves">
    <button type="button" className="ekMove ok" onClick={()=>autoStow(it)}><b>Best free place</b><small>The quickest pocket that fits</small></button>
    {(it.placement||{}).kind!=='loose'?<button type="button" className="ekMove ok" onClick={()=>holdLoose(it)}><b>Take it out</b><small>Hold it</small></button>:null}
    {targets.map((t:any)=><button key={t.b.id+t.sl.id} type="button" className={'ekMove'+(t.ok?' ok':'')} disabled={!t.ok} onClick={()=>place(it,t.b,t.sl)}><b>{t.b.name+' · '+t.sl.label}</b><small>{t.ok?EK_WORD[t.sl.access]+' · room '+t.u.bulk+'/'+t.sl.bulk+' · weight '+t.u.weight+'/'+t.sl.weight+' lb':'Won’t fit: '+t.why}</small></button>)}
   </div>:null}
   <p className="sheetNote">Equip, Take off, Move and Drop change your gear straight away; the narrator is told. Use and Examine are sent to the story.</p>
  </Sheet>;
 }
 var slotSheet:any=null;
 if(slotPick){ var fits=inv.filter((x:any)=>!x.equipped&&!ekStorage(x)&&guessSlot(x,eq)===slotPick[0]);
  slotSheet=<Sheet title={slotPick[1]} onClose={()=>setSlotPick(null)}>{fits.length?<div className="pickList">{fits.map((x:any)=><button key={x.id} type="button" className="pickRow" onClick={()=>{setSlotPick(null);setSel(x.id);}}><b>{x.name}</b><small>{ekPlaceLabel(x,inv,eq)}</small></button>)}</div>:<div className="empty">Nothing you carry goes there.</div>}</Sheet>; }

 return <div className="screen ledger ekKit">
  {note?<div className="ekNote" onClick={()=>setNote('')}>{note}</div>:null}
  <Panel className="purse" title="Purse & load" icon="coin" action={<button type="button" className="linkBtn" onClick={()=>go('banking')}>Banking</button>}>
   <div className="coinRow">{money(v['player-money-cp']).split(' | ').map((c:string,i:number)=><span key={i} className={'coin c'+i}><i/>{c}</span>)}</div>
   <div className="purseFacts"><div><small>Banked</small><b>{money(Object.values(ac).reduce((n:number,a:any)=>n+Number(a.balanceCp||0),0))}</b></div><div><small>Load</small><b className={'ekTone '+tone}>{band}</b></div></div>
   <div className="ekLoad"><i className={tone} style={{width:pct(carried)+'%'}}/>{th.slice(0,3).map((t:number,i:number)=><span key={i} className={i===2?'h':''} style={{left:pct(t)+'%'}}/>)}</div>
   <div className="ekLoadNums"><span>{'Carried '+carried+' lb'}</span><span>{'Free to '+th[0]}</span><span>{'Encumbered past '+th[1]}</span><span>{'Overloaded past '+th[3]}</span></div>
  </Panel>
  <Panel title="Reach" sub="How fast you can get at each thing" icon="hourglass">
   {fighting?<p className="warnLine">In a fight, only what is in hand, worn, or in a quick or ready pocket can be used at once.</p>:null}
   <div className="ekBelt">{EK_TIERS.map((t:any)=>{ var xs=tiers[t[0]]||[]; if(!xs.length)return null; return <div key={t[0]} className={'ekTier t-'+t[0]}><div className="ekTierHead"><b>{t[1]}</b><small>{t[2]}</small></div><div className="ekTierItems">{xs.map((x:any)=><button key={x.id} type="button" className="ekChipItem" onClick={()=>{setSel(x.id);setMoving(false);}}>{x.name}{(Number(x.qty)||1)>1?' ×'+x.qty:''}</button>)}</div></div>; })}</div>
  </Panel>
  <Panel title="Equipped" sub="Tap an empty slot to fill it" icon="shield">
   <div className="slotGrid">{EK_SLOTS.map((s:any,i:number)=>{ var x=bySlot[s[0]]; return <button key={s[0]+i} type="button" className={'slot'+(x?' full':'')+(x&&ekNeedsRepair(x)?' worn':'')} onClick={()=>x?setSel(x.id):setSlotPick(s)}><small>{s[1]}</small><b>{x?x.name:'—'}</b>{x&&x.condition!=null?<i className="ekDur"><i style={{width:Math.max(0,Math.min(100,Number(x.condition)))+'%'}}/></i>:null}</button>; })}</div>
  </Panel>
  <Panel title="Bags" sub={bags.filter((b:any)=>ekWornBag(b,eq)).length+' worn'} icon="gear">
   {bags.length?null:<div className="empty">No pack, pouch, quiver or scabbard. Everything you own is in your hands.</div>}
   <div className="ekBags">{bags.map((b:any)=>{ var st2=ekStorage(b), worn=ekWornBag(b,eq); return <div key={b.id} className={'ekBag'+(worn?'':' off')}>
    <div className="ekBagHead"><div><b>{b.name}</b><small>{st2.name+' · '+(worn?'worn':'not worn — nothing in it can be reached')}</small></div><button type="button" className="btnGhost small" onClick={()=>worn?unequip(b):equip(b)}>{worn?'Take off':'Put on'}</button></div>
    <div className="ekComps">{st2.slots.map((sl:any)=>{ var u=ekUsed(inv,b.id,sl.id), occ=ekOcc(inv,b.id,sl.id); return <div key={sl.id} className={'ekComp a-'+sl.access}>
     <div className="ekCompHead"><b>{sl.label}</b><em>{EK_WORD[sl.access]}</em></div>
     <div className="ekFill"><small>room</small><i><i style={{width:Math.min(100,u.bulk/sl.bulk*100)+'%'}}/></i><span>{u.bulk+'/'+sl.bulk}</span></div>
     <div className="ekFill w"><small>weight</small><i><i style={{width:Math.min(100,u.weight/sl.weight*100)+'%'}}/></i><span>{u.weight+'/'+sl.weight}</span></div>
     <div className="ekCompItems">{occ.length?occ.map((x:any)=><button key={x.id} type="button" className="ekChipItem" onClick={()=>{setSel(x.id);setMoving(false);}}>{x.name}{(Number(x.qty)||1)>1?' ×'+x.qty:''}</button>):<span className="ekEmpty">empty</span>}</div>
    </div>; })}</div></div>; })}</div>
  </Panel>
  <Panel title="Everything you own" sub={inv.length+' things · '+carried+' lb'} icon="gear">
   <div className="chipRow">{[['all','All'],['worn','Worn'],['weapons','Weapons'],['armor','Armour'],['food','Supplies'],['tools','Tools & bags'],['other','Other'],['repair','Needs repair']].map((f:any)=>f[0]==='repair'&&!repairN?null:<Chip key={f[0]} on={filter===f[0]} onClick={()=>setFilter(f[0])}>{f[1]+(f[0]==='repair'?' '+repairN:'')}</Chip>)}</div>
   <div className="ekTools"><input className="ekSearch" value={q} placeholder="Find…" onChange={(e:any)=>setQ(e.target.value)}/><select className="ekSort" value={sort} onChange={(e:any)=>setSort(e.target.value)}><option value="place">By reach</option><option value="name">Name</option><option value="weight">Heaviest</option><option value="worth">Worth</option></select></div>
   {list.length?<div className="tileGrid two">{list.map((x:any)=><button key={x.id} type="button" className={'itemTile'+(x.equipped?' on':'')+(ekNeedsRepair(x)?' worn':'')} onClick={()=>{setSel(x.id);setMoving(false);}}>
     <span className="itemTop"><b>{x.name||'Item'}</b>{(Number(x.qty)||1)>1?<em>{'×'+x.qty}</em>:null}</span>
     <small>{ekPlaceLabel(x,inv,eq)+' · '+ekW(x)+' lb'}</small>
     {ekNeedsRepair(x)?<span className="tag hurt">Repair</span>:x.equipped?<span className="tag rune">Equipped</span>:null}
    </button>)}</div>:<div className="empty">{inv.length?'Nothing matches.':'Your pack is empty.'}</div>}
  </Panel>
  <Panel title="On the ground here" sub={here||'—'} icon="map">
   {ground.length?<div className="tileGrid">{ground.map((g:any,i:number)=><div key={(g.id||'g')+i} className="rec"><span className="recWords"><b>{g.name+((Number(g.qty)||1)>1?' ×'+g.qty:'')}</b><small>{ekW(g)+' lb'}</small></span><button type="button" className="btnGhost small" onClick={()=>pickUp(g)}>Pick up</button></div>)}</div>:<div className="empty">Nothing you left is lying here.</div>}
  </Panel>
  {sheet}{slotSheet}
 </div>;
}
