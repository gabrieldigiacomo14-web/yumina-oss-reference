/* Black Clover — deterministic spell mechanics v1.
 * Ruleset values are simulation balance, not canon measurements.
 * Pure functions; no UI, storage APIs, randomness or chat assumptions.
 * A mana bar is a projection of an absolute reserve ledger.
 */
function n(v,d){var z=Number(v);return Number.isFinite(z)?z:(d===undefined?0:d);}
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
function o(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}
function a(v){return Array.isArray(v)?v:[];}
function s(v){return v===undefined||v===null?'':String(v);}
function r(v){return Math.round(v*100)/100;}
var BAND={utility:{mana:0,stamina:0,fatigue:0,impact:0},small:{mana:8,stamina:1,fatigue:0.5,impact:8},standard:{mana:22,stamina:2,fatigue:1.5,impact:19},large:{mana:60,stamina:4,fatigue:4,impact:40},massive:{mana:140,stamina:8,fatigue:10,impact:70}};
var OUTPUT={Restrained:0.55,Normal:1,Full:1.75,Overdrawn:2.4};
var PROF={Unformed:0,Novice:0.02,Familiar:0.06,Practiced:0.12,Refined:0.19,Expert:0.27,Mastered:0.35,Transcendent:0.42};
function bcManaMax(profile){
 var c=clamp(n(o(profile).capacity),0,100);
 return c<=0?0:Math.round(20+2*c+0.18*c*c);
}
function bcIsMagicless(v){
 var p=o(v.magic_profile),sp=a(p.special).map(function(x){return s(x).toLowerCase();});
 return p.magicless===true||p.no_mana===true||sp.indexOf('mana-less')>=0||sp.indexOf('magicless')>=0||bcManaMax(p)===0;
}
function bcReserve(v){
 v=o(v);var max=bcManaMax(o(v.magic_profile)),bar=clamp(n(v.mana,max?100:0),0,100),saved=o(v.mana_reserve);
 if(max===0)return{maxUnits:0,currentUnits:0,percent:0,capacityBasis:0,lastPercent:0,version:1};
 var current=(n(saved.maxUnits,-1)>0&&Math.abs(n(saved.lastPercent,-1)-bar)<0.00001)
  ? r(clamp(n(saved.currentUnits),0,n(saved.maxUnits))*max/n(saved.maxUnits))
  :Math.round(max*bar/100);
 return{maxUnits:max,currentUnits:clamp(current,0,max),percent:bar,capacityBasis:n(o(v.magic_profile).capacity),lastPercent:bar,version:1};
}
function bcDemandTier(spell){
 var m=o(spell.mechanics);if(BAND[m.tier])return m.tier;
 var input=[spell.demand,spell.scale,spell.behavior,spell.name].map(s).join(' ').toLowerCase();
 if(/\b(cantrip|trivial|chores|utility|convenience)\b/.test(input))return'utility';
 if(/\b(massive|cataclysm|ultimate|enormous|vast)\b/.test(input))return'massive';
 if(/\b(large|huge|giant|wide.area|sustained|major)\b/.test(input))return'large';
 if(/\b(small|minor|weak|tiny)\b/.test(input))return'small';
 return'standard';
}
function bcSpellMechanics(spell){
 spell=o(spell);var raw=o(spell.mechanics),tier=bcDemandTier(spell),b=BAND[tier];
 // A provided field of zero is intentional; only absent fields receive defaults.
 function val(key,def,cap){return raw[key]===undefined?def:clamp(n(raw[key],def),0,cap);}
 return {version:1,tier:tier,energyType:raw.energyType==='anti_magic'?'anti_magic':'mana',
  manaUnits:r(val('manaUnits',b.mana,10000)),stamina:r(val('stamina',b.stamina,100)),fatigue:r(val('fatigue',b.fatigue,100)),
  impact:r(val('impact',b.impact,500)),range:s(raw.range||spell.range||'variable').slice(0,72),
  form:s(raw.form||spell.form||'Freeform').slice(0,65),duration:s(raw.duration||'instant').slice(0,72)};
}
function bcNormalizeSpells(spells){
 var changed=false,items=a(spells).map(function(sp){
  if(!sp||typeof sp!=='object')return sp;
  var mechanics=bcSpellMechanics(sp);
  if(JSON.stringify(o(sp.mechanics))===JSON.stringify(mechanics))return sp;
  changed=true;return Object.assign({},sp,{mechanics:mechanics});
 });
 return changed?items:null;
}
function bcCastPlan(v,spell,opts){
 v=o(v);spell=o(spell);opts=o(opts);var mp=o(v.magic_profile),mechanics=bcSpellMechanics(spell);
 var out=OUTPUT[opts.output]===undefined?'Normal':opts.output;
 var rawOut=OUTPUT[out],prof=PROF[spell.proficiency]||0,ctrl=clamp(n(mp.control,0),0,100);
 var efficiency=clamp(1-prof-ctrl/600,0.45,1),freeform=opts.freeform===true;
 var units=mechanics.energyType==='anti_magic'?0:r(mechanics.manaUnits*rawOut*efficiency*(freeform?1.4:1));
 var stamina=r(mechanics.stamina*(0.8+0.2*rawOut)*(freeform?1.2:1));
 var fatigue=r(mechanics.fatigue*(0.8+0.2*rawOut)*(freeform?1.25:1));
 var reserve=bcReserve(v),anti=mechanics.energyType==='anti_magic';
 var special=a(mp.special).map(function(x){return s(x).toLowerCase();});
 if(anti&&!mp.anti_magic&&!special.includes('anti-magic'))return{ok:false,reason:'Anti-Magic is not an available power.',reserve:reserve};
 if(!anti&&reserve.maxUnits===0)return{ok:false,reason:'This character has no mana and cannot use ordinary magic.',reserve:reserve};
 if(units>reserve.currentUnits)return{ok:false,reason:'Not enough mana for this output. Lower the output or rest.',reserve:reserve,requiredUnits:units};
 var actualOut=clamp(n(mp.output,20),0,100),capacity=n(mp.capacity,0);
 var impact=r(mechanics.impact*rawOut*(0.65+actualOut/140)*(0.88+ctrl/800)*(freeform?0.8:1));
 var percent=reserve.maxUnits?100*units/reserve.maxUnits:0;
 return{ok:true,name:s(spell.name||'Freeform magic'),tier:mechanics.tier,energyType:mechanics.energyType,freeform:freeform,
  output:out,outputMult:rawOut,manaUnits:units,manaPercent:r(percent),stamina:stamina,fatigue:fatigue,
  impact:impact,availableUnits:reserve.currentUnits,maxUnits:reserve.maxUnits,capacity:capacity,efficiency:r(efficiency),mechanics:mechanics,reserve:reserve};
}
function bcApplyPlayerCast(v,spell,opts){
 var plan=bcCastPlan(v,spell,opts);if(!plan.ok)return{ok:false,reason:plan.reason,plan:plan};
 var res=plan.reserve,remaining=clamp(r(res.currentUnits-plan.manaUnits),0,res.maxUnits),bar=res.maxUnits?Math.round(100*remaining/res.maxUnits):0;
 var old=o(v.spell_ledger),seq=Math.max(0,Math.floor(n(old.seq)))+1,id='cast-'+seq;
 var record={id:id,spellId:s(spell.id||''),spellName:plan.name,output:plan.output,
  freeform:plan.freeform,energyType:plan.energyType,manaUnits:plan.manaUnits,stamina:plan.stamina,
  fatigue:plan.fatigue,impact:plan.impact,at:s(v.world_date)+' '+s(v.world_time),source:'ui',state:'committed'};
 var ledger=Object.assign({},old,{version:2,seq:seq,recent:a(old.recent).concat([record]).slice(-80),processed:a(old.processed).slice(-160)});
 var patch={mana_reserve:{maxUnits:res.maxUnits,currentUnits:remaining,capacityBasis:n(o(v.magic_profile).capacity),percent:bar,lastPercent:bar,version:1},
  mana:bar,stamina:clamp(r(n(v.stamina,100)-plan.stamina),0,100),fatigue:clamp(r(n(v.fatigue,0)+plan.fatigue),0,100),spell_ledger:ledger};
 return{ok:true,patch:patch,plan:plan,record:record};
}
function bcImpact(v,event,cast){
 event=o(event);cast=o(cast);var accuracy=s(event.outcome||'hit').toLowerCase(),guard=s(event.defense||'none').toLowerCase();
 var hit={miss:0,dodged:0,blocked:0,graze:0.3,partial:0.65,hit:1,direct:1}[accuracy];
 var defense={none:1,partial:0.7,guarded:0.45,barrier:0.2,absorbed:0}[guard];
 if(hit===undefined||defense===undefined)return{ok:false,reason:'Unrecognized hit/defense outcome'};
 // Impact points are NOT hitpoints: only direct harmful hits map to vitality loss.
 var impact=r(Math.max(0,n(cast.impact))*hit*defense),harmful=event.harmful!==false;
 var damage=harmful?clamp(Math.round(impact*0.48),0,50):0;
 var staminaLoss=harmful?clamp(r(impact*0.12),0,25):0;
 var fatigueGain=harmful?clamp(r(impact*0.07),0,18):0;
 return{ok:true,impact:impact,vitalityLoss:damage,staminaLoss:staminaLoss,fatigueGain:fatigueGain,outcome:accuracy,defense:guard};
}
/* Narrative casting bridge v2: the same pure spell cost planner serves
 * UI buttons and GM-authored events. The engine, not the GM, owns numbers.
 * A cast event pays costs once; a separately linked impact event resolves
 * consequences. Both may arrive in the same GM reply in array order. */
function bcProcessEvents(v){
 v=o(v);
 var events=a(v.spell_events), old=o(v.spell_ledger), processed=a(old.processed).slice(), recent=a(old.recent).slice();
 var results=a(old.results).slice(), newly=[], newResults=[], notes=[], npcBase=o(o(v.world_truth).npcs);
 var npcs=Object.assign({},npcBase), changedNpc=false;
 var reserve=bcReserve(v), mana=clamp(n(v.mana,reserve.maxUnits?100:0),0,100);
 var stamina=clamp(n(v.stamina,100),0,100),fatigue=clamp(n(v.fatigue,0),0,100),vitality=clamp(n(v.vitality,100),0,100);
 var playerChanged=false, seq=Math.max(0,Math.floor(n(old.seq)));
 function eligible(id){return /^[a-zA-Z0-9_-]{1,80}$/.test(id)&&processed.indexOf(id)<0&&newly.indexOf(id)<0;}
 function finish(id,status,detail){
  newly.push(id);var x=Object.assign({id:id,status:status,recordedAt:s(v.world_date)+' '+s(v.world_time)},detail||{});
  newResults.push(x);if(status==='rejected')notes.push(id+': '+s(x.reason));
 }
 function getCast(id){return recent.filter(function(c){return c&&s(c.id)===id&&c.state==='committed';})[0]||null;}
 function findSpell(items,key){
  var list=a(items), exact=list.filter(function(x){return s(o(x).id)===key;});
  if(exact.length===1)return exact[0];
  var names=list.filter(function(x){return s(o(x).name).toLowerCase()===key.toLowerCase();});
  return names.length===1?names[0]:null;
 }
 function handleCast(e,id){
  var actor=s(e.actor||'player'),isPlayer=actor==='player',person=isPlayer?null:o(npcs[actor]);
  if(!isPlayer&&!Object.prototype.hasOwnProperty.call(npcs,actor)){
   finish(id,'rejected',{kind:'cast',actor:actor,reason:'Unknown NPC key; save persistent caster first.'});return;
  }
  var free=e.freeform===true||s(e.spellId)==='freeform',spell;
  if(free){
   var tier=s(e.tier||e.scope).toLowerCase();
   if(!BAND[tier]){finish(id,'rejected',{kind:'cast',actor:actor,reason:'Freeform cast requires a valid scope (utility/small/standard/large/massive).'});return;}
   spell={id:'freeform',name:'Freeform magic',mechanics:{tier:tier}};
  }else{
   var key=s(e.spellId).trim();
   if(!key){finish(id,'rejected',{kind:'cast',actor:actor,reason:'A stored spellId is required.'});return;}
   spell=findSpell(isPlayer?v.spells:person.spells,key);
   if(!spell){finish(id,'rejected',{kind:'cast',actor:actor,reason:'Spell not found or name ambiguous in the caster’s saved spells.'});return;}
  }
  var output=s(e.output||'Normal');
  if(!Object.prototype.hasOwnProperty.call(OUTPUT,output)){
   finish(id,'rejected',{kind:'cast',actor:actor,reason:'Invalid casting output.'});return;
  }
  var available=isPlayer?{magic_profile:v.magic_profile,mana:mana,mana_reserve:reserve}:
   {magic_profile:person.magic_profile,mana:0,mana_reserve:{}};
  if(!isPlayer){
   var max=bcManaMax(person.magic_profile);
   if(person.manaUnits===undefined){finish(id,'rejected',{kind:'cast',actor:actor,reason:'NPC has no persistent manaUnits ledger.'});return;}
   var pool=clamp(n(person.manaUnits),0,max);
   available.mana=max?100*pool/max:0;
   available.mana_reserve={maxUnits:max,currentUnits:pool,capacityBasis:n(o(person.magic_profile).capacity),percent:available.mana,lastPercent:available.mana,version:1};
  }
  var plan=bcCastPlan(available,spell,{output:output,freeform:free});
  if(!plan.ok){finish(id,'rejected',{kind:'cast',actor:actor,spellId:s(spell.id),reason:plan.reason});return;}
  // Charges are computed from saved spell data and caster stats, never e.cost/e.damage.
  if(isPlayer){
   reserve=Object.assign({},plan.reserve,{currentUnits:clamp(r(plan.reserve.currentUnits-plan.manaUnits),0,plan.reserve.maxUnits)});
   mana=reserve.maxUnits?Math.round(100*reserve.currentUnits/reserve.maxUnits):0;
   reserve.percent=mana;reserve.lastPercent=mana;playerChanged=true;
   stamina=clamp(r(stamina-plan.stamina),0,100);fatigue=clamp(r(fatigue+plan.fatigue),0,100);
  }else{
   npcs[actor]=Object.assign({},person,{manaUnits:clamp(r(available.mana_reserve.currentUnits-plan.manaUnits),0,available.mana_reserve.maxUnits),
    stamina:clamp(r(n(person.stamina,100)-plan.stamina),0,100),fatigue:clamp(r(n(person.fatigue,0)+plan.fatigue),0,100)});
   changedNpc=true;
  }
  seq+=1;
  // The event id is the cast id as well, so same-turn hits can refer to it.
  var rec={id:id,actor:actor,spellId:s(spell.id||''),spellName:plan.name,output:plan.output,
   freeform:free,energyType:plan.energyType,manaUnits:plan.manaUnits,stamina:plan.stamina,fatigue:plan.fatigue,
   impact:plan.impact,at:s(v.world_date)+' '+s(v.world_time),source:'narrative',state:'committed'};
  recent.push(rec);
  finish(id,'committed',{kind:'cast',actor:actor,spellId:rec.spellId,spellName:rec.spellName,
   manaUnits:rec.manaUnits,stamina:rec.stamina,fatigue:rec.fatigue,impact:rec.impact});
 }
 function handleImpact(e,id){
  var ref=s(e.castId),cast=getCast(ref),target=s(e.target||'').toLowerCase();
  if(!cast){finish(id,'rejected',{kind:'impact',reason:'No paid cast receipt found for '+ref+'.'});return;}
  if(!target||target==='none'){
   finish(id,'rejected',{kind:'impact',reason:'Missing exact target key.'});return;
  }
  var actor=s(e.actor||'player');
  if(s(cast.actor||'player')!==actor){finish(id,'rejected',{kind:'impact',reason:'Actor does not match paid cast.'});return;}
  if(target!=='player'&&!Object.prototype.hasOwnProperty.call(npcs,target)){
   finish(id,'rejected',{kind:'impact',reason:'Target NPC key not persisted.'});return;
  }
  var impact=bcImpact(v,e,cast);
  if(!impact.ok){finish(id,'rejected',{kind:'impact',reason:impact.reason});return;}
  if(target==='player'){
   vitality=clamp(vitality-impact.vitalityLoss,0,100);
   stamina=clamp(r(stamina-impact.staminaLoss),0,100);
   fatigue=clamp(r(fatigue+impact.fatigueGain),0,100);
   if(impact.vitalityLoss||impact.staminaLoss||impact.fatigueGain)playerChanged=true;
  }else if(impact.impact>0){
   var person=o(npcs[target]),updates={};
   if(person.vitality!==undefined)updates.vitality=clamp(n(person.vitality)-impact.vitalityLoss,0,100);
   if(person.stamina!==undefined)updates.stamina=clamp(r(n(person.stamina)-impact.staminaLoss),0,100);
   if(person.fatigue!==undefined)updates.fatigue=clamp(r(n(person.fatigue)+impact.fatigueGain),0,100);
   if(Object.keys(updates).length){npcs[target]=Object.assign({},person,updates);changedNpc=true;}
  }
  finish(id,'applied',{kind:'impact',actor:actor,castId:ref,target:target,spellName:s(cast.spellName),
   outcome:impact.outcome,defense:impact.defense,impact:impact.impact,vitalityLoss:impact.vitalityLoss,
   staminaLoss:impact.staminaLoss,fatigueGain:impact.fatigueGain});
 }
 events.slice(-64).forEach(function(raw){
  var e=o(raw),id=s(e.id).trim();if(!eligible(id))return;
  var kind=s(e.kind||'impact').toLowerCase();
  // Backward compatibility: old NPC impact events encoded casting and impact together.
  // Normalize to a cast + impact, reusing the same id for legacy receipt once.
  if(kind==='impact'&&!e.castId&&s(e.actor||'player')!=='player'&&e.spellId){
   var legacyId='legacy_'+id;
   if(!getCast(legacyId))handleCast(Object.assign({},e,{kind:'cast'}),legacyId);
   handleImpact(Object.assign({},e,{castId:legacyId}),id);return;
  }
  if(kind==='cast')handleCast(e,id);
  else if(kind==='impact')handleImpact(e,id);
  else finish(id,'rejected',{reason:'Unknown spell event kind.'});
 });
 if(!newly.length)return null;
 var next=Object.assign({},old,{version:2,seq:seq,processed:processed.concat(newly).slice(-160),recent:recent.slice(-80),
  results:results.concat(newResults).slice(-80)});
 var patch={spell_ledger:next};
 if(playerChanged){
  patch.mana=mana;patch.mana_reserve=reserve;patch.stamina=stamina;patch.fatigue=fatigue;patch.vitality=vitality;
 }
 if(changedNpc)patch.world_truth=Object.assign({},o(v.world_truth),{npcs:npcs});
 return{patch:patch,results:newResults,notes:notes};
}

export{bcManaMax,bcReserve,bcIsMagicless,bcSpellMechanics,bcNormalizeSpells,bcCastPlan,bcApplyPlayerCast,bcImpact,bcProcessEvents};
