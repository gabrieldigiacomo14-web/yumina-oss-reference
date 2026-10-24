// Black Clover physical inventory bridge, adapted from Labyrinth Survival's
// storage/placement and encumbrance principles. No narration/AI is needed for
// local transfers. Canonical variable remains `inventory`.

// Listed head to toe, outer layer first. 'clothes' is a ONE-PIECE outfit
// (dress, uniform, "everyday clothes") worn instead of a separate shirt and
// trousers; a squad robe or cloak goes over everything in 'cloak'.
export const BC_SLOTS = [
  ['head','Head'], ['cloak','Cloak / Squad robe'], ['clothes','Full outfit (one piece)'],
  ['base-upper','Shirt / Upper clothes'], ['base-lower','Trousers / Lower clothes'],
  ['torso','Coat / Armour'], ['shoulders','Shoulders'], ['arms','Arms'], ['hands','Hands'],
  ['legs','Leg armour'], ['feet','Feet'], ['waist','Belt / Waist'], ['hip','Hip / Holster'],
  ['back','Back'], ['accessory','Accessory'], ['main-hand','Main hand'], ['off-hand','Off hand'],
  ['grimoire','Grimoire'],
  ['under-upper','Undergarment (upper)'], ['under-lower','Undergarment (lower)']
];
// A worn item recorded in an older or wrong slot is moved to the slot its
// kind belongs in (a squad robe saved as 'clothes' becomes the cloak).
const SLOT_REMAP = {cloak:['shoulders','clothes','torso','back'], grimoire:['accessory','main-hand','off-hand','waist','hip','back'], hip:['waist','accessory','back']};
const SLOT_LABELS = Object.fromEntries(BC_SLOTS);
export const BC_STORAGE = {
  belt_pouch: { label:'Belt pouch', slots:[
    {id:'pocket-1', label:'Pocket 1', bulkCap:2, weightCap:2, access:'quick', allowed:['small']},
    {id:'pocket-2', label:'Pocket 2', bulkCap:2, weightCap:2, access:'quick', allowed:['small']},
    {id:'coins', label:'Coin pocket', bulkCap:2, weightCap:3, access:'quick', allowed:['coin','small']}
  ]},
  travel_satchel: { label:'Travel satchel', slots:[
    {id:'main', label:'Main pocket', bulkCap:14, weightCap:15, access:'buried', allowed:['general']},
    {id:'outer', label:'Outer pocket', bulkCap:4, weightCap:3, access:'ready', allowed:['small','bottle']},
    {id:'strap', label:'Bedroll straps', bulkCap:7, weightCap:6, access:'slow', allowed:['bedroll','rope','tool']}
  ]},
  field_pack: { label:'Field pack', slots:[
    {id:'main', label:'Main compartment', bulkCap:24, weightCap:26, access:'buried', allowed:['general']},
    {id:'top', label:'Top pocket', bulkCap:5, weightCap:5, access:'ready', allowed:['small','bottle']},
    {id:'side-left', label:'Side pocket L', bulkCap:4, weightCap:4, access:'ready', allowed:['small','bottle']},
    {id:'side-right', label:'Side pocket R', bulkCap:4, weightCap:4, access:'ready', allowed:['small','bottle']},
    {id:'gear-straps', label:'Gear straps', bulkCap:10, weightCap:8, access:'slow', allowed:['weapon','tool','bedroll','rope']}
  ]},
  magic_tool_case: { label:'Magic-tool case', slots:[
    {id:'lined', label:'Padded compartment', bulkCap:8, weightCap:8, access:'ready', allowed:['magic-tool','small']},
    {id:'accessory', label:'Component pocket', bulkCap:3, weightCap:3, access:'quick', allowed:['small','material','magic-tool']}
  ]},
  holster: { label:'Holster', slots:[
    {id:'blade', label:'Blade loop', bulkCap:7, weightCap:5, access:'quick', allowed:['weapon']},
    {id:'grimoire', label:'Grimoire holder', bulkCap:2.5, weightCap:2, access:'quick', allowed:['grimoire']}
  ]},
  quiver: { label:'Quiver', slots:[
    {id:'arrows', label:'Arrow sleeve', bulkCap:8, weightCap:6, access:'quick', allowed:['arrow','ammo']}
  ]}
};
export const BC_ARMS_BULK = 8;
const ACCESS = {quick:0,ready:1,slow:2,buried:3};
const round = n => Math.round(n*100)/100;
const nval = (x,f=0) => Number.isFinite(Number(x)) ? Number(x) : f;
const txt = x => x == null ? '' : String(x);
const has = (text,pattern) => pattern.test(txt(text));
const units = it => Math.max(1,Math.floor(nval(it&&it.qty,1)));

// BC-specific assumptions, not STGAAB canon or numeric Black Clover canon.
// A declared item type/weight/volume always outranks heuristic identification.
export function bcSpec(it) {
  const name=txt(it&&it.name).toLowerCase(), type=txt(it&&it.type).toLowerCase();
  let storage=txt(it&&it.storage_profile||it&&it.storage||'');
  if (!BC_STORAGE[storage]) storage='';
  if (!storage) {
    if (has(name,/\b(belt pouch|coin pouch)\b/)) storage='belt_pouch';
    else if (has(name,/\b(backpack|field pack|rucksack|knight pack)\b/)) storage='field_pack';
    else if (has(name,/\b(satchel|travel pack|shoulder bag|traveler.s bag)\b/)) storage='travel_satchel';
    else if (has(name,/\b(magic.tool case|enchanter.s case)\b/)) storage='magic_tool_case';
    else if (has(name,/\bquiver\b/)) storage='quiver';
    else if (has(name,/\b(holsters?|scabbards?|sheaths?|baldrics?|sword belt|grimoire (holder|belt|chain|strap|case)|book holder)\b/)) storage='holster';
  }
  const tags=Array.isArray(it&&it.tags) ? it.tags.slice() : [];
  const tag = t => {if(tags.indexOf(t)<0) tags.push(t);};
  let weight=.5, bulk=1, slot='';
  if (storage) {
    weight=storage==='field_pack' ? 2.0 : storage==='travel_satchel' ? .8 : .3;
    bulk=storage==='field_pack' ? 9 : storage==='travel_satchel' ? 5 : 2;
    if (storage==='holster') {weight=.5;bulk=1.5;}
    slot=storage==='belt_pouch' ? 'waist' : storage==='holster' ? 'hip' : 'back';
  } else if (has(name+' '+type, /grimoire/)) {weight=.8; bulk=2; slot='grimoire';tag('grimoire');}
  else if (has(name+' '+type, /broom/)) {weight=2.5;bulk=8;tag('tool');}
  else if (has(name+' '+type, /sword|sabre|saber|rapier|katana|wakizashi|tanto|odachi|scimitar|cutlass|claymore|halberd|glaive|dagger|knife|spear|staff|wand|mace|\baxe|\bbows?\b|weapon|warhammer|flail/) && !has(name+' '+type, /\b(kit|oil|whetstone|polish|care|sheath|scabbard|holster)\b/)) {weight=1.5;bulk=5;slot='main-hand';tag('weapon');}
  else if (has(name+' '+type, /underwear|underpants|briefs|boxers|panties|drawers|loincloth/)) {weight=.1;bulk=.3;slot='under-lower';tag('clothing');}
  else if (has(name+' '+type, /bra|bandeau|undershirt|chemise/)) {weight=.15;bulk=.4;slot='under-upper';tag('clothing');}
  else if (has(name+' '+type, /trousers|pants|leggings|breeches|shorts|skirt|kilt|slacks/)) {weight=.4;bulk=1.8;slot='base-lower';tag('clothing');}
  else if (has(name+' '+type, /shirt|blouse|tunic|jersey|sweater|pullover|waistcoat/)) {weight=.45;bulk=2;slot='base-upper';tag('clothing');}
  else if (has(name+' '+type, /\b(cloaks?|capes?|mantles?|ponchos?|shawls?|squad robes?|knight'?s robes?|captain'?s robes?)\b/) || has(name+' '+type, /(black bulls?|golden dawn|silver eagles?|crimson lions?|blue roses?|green mantis|coral peacocks?|purple orcas?|aqua deer|azure deer|magic knight).{0,24}\brobes?\b/)) {weight=1;bulk=3.5;slot='cloak';}
  else if (has(name+' '+type, /dress|gown|robe|onesie|jumpsuit|outfit|uniform|everyday clothes|traveling clothes|civilian clothes|travelling clothes|clothes|clothing|garments|rags/)) {weight=.9;bulk=3.5;slot='clothes';tag('clothing');}
  else if (has(name+' '+type, /\b(vests?|aprons?|smocks?)\b/)) {weight=.45;bulk=1.5;slot='torso';}
  else if (has(name+' '+type, /armor|armour|breastplate|chestguard|coat|jacket/)) {weight=2;bulk=5;slot='torso';}
  else if (has(name+' '+type, /boot|shoe/)) {weight=.8;bulk=3;slot='feet';}
  else if (has(name+' '+type, /glove|gauntlet/)) {weight=.35;bulk=2;slot='hands';}
  else if (has(name+' '+type, /\b(hats?|caps?|helmets?|helms?|hoods?|circlets?)\b/)) {weight=.5;bulk=3;slot='head';}
  else if (has(name+' '+type, /\b(rings?|earrings?|amulets?|necklaces?|charms?|bracelets?|pendants?|brooch(es)?|lockets?)\b/)) {weight=.08;bulk=.3;slot='accessory';tag('small');}
  else if (has(name+' '+type, /potion|vial|flask|bottle|waterskin|salve|medicine/)) {weight=.45;bulk=1;tag('small');tag('bottle');}
  else if (has(name+' '+type, /bread|apple|ration|food|herb|berry/)) {weight=.3;bulk=.6;tag('small');}
  else if (has(name+' '+type, /arrow|bolt|dart|ammo/)) {weight=.04;bulk=.15;tag('arrow');tag('ammo');tag('small');}
  else if (has(name+' '+type, /\b(ores?|metal|wood|lumber|crystals?|stones?|materials?|gems?|ingots?)\b/)) {weight=.6;bulk=1;tag('material');}
  else if (has(name+' '+type, /magic tool|enchanted|magic-tool|relic|artifact/)) {weight=.65;bulk=1.5;tag('magic-tool');}
  else if (has(name+' '+type, /\b(kits?|flint|strikers?|tinder\w*|whetstones?|toolkits?|tools?|lanterns?|compass|needles?|thread|sewing)\b/)) {weight=.4;bulk=1;tag('small');tag('tool');}
  else if (has(name+' '+type, /rope/)) {weight=2;bulk=5;tag('rope');tag('tool');}
  else if (has(name+' '+type, /bedroll|blanket/)) {weight=1.4;bulk=5;tag('bedroll');}
  else if (has(name+' '+type, /yul|coins?|banknotes?|currency|money/)) {weight=.005;bulk=.02;tag('coin');tag('small');}
  else if (has(name+' '+type, /\b(letters?|keys?|maps?|documents?|tickets?|notes?|papers?)\b/)) {weight=.05;bulk=.2;tag('small');}
  let w = Math.max(0,nval(it&&it.weight,weight));
  let b = Math.max(0,nval(it&&it.bulk,bulk));
  const givenSlot=txt(it&&it.slot||it&&it.equip_slot||'');
  if (it&&it.coverage==='full') slot='clothes';
  if (givenSlot && SLOT_LABELS[givenSlot]) {
    // Old saves often stored every piece of clothing as 'clothes', which
    // destroyed layering by displacing shirts and trousers. Recover by name.
    if (it&&it.coverage==='full') slot='clothes';
    else if (SLOT_REMAP[slot]&&SLOT_REMAP[slot].includes(givenSlot)) {}
    else if (!(['clothes','torso','legs'].includes(givenSlot)&&['base-upper','base-lower','under-upper','under-lower'].includes(slot))) slot=givenSlot;
  }
  if (['clothes','base-upper','base-lower','under-upper','under-lower'].includes(slot))tag('clothing');
  if (tags.length===0) tag('general');
  return {storage,weight:w,bulk:b,slot,tags};
}
export const bcWeight = it => round(bcSpec(it).weight*units(it));
export const bcBulk = it => round(bcSpec(it).bulk*units(it));
export const bcStorageOf = it => BC_STORAGE[bcSpec(it).storage] || null;
export function bcCarried(it,inv) {
  const p=it&&it.placement;
  if(!p) return !has(it&&it.place,/home|storage|chest|ground|companion/i);
  if(p.kind==='body'||p.kind==='loose') return true;
  if(p.kind==='world') return false;
  if(p.kind==='container') {
    const parent=(inv||[]).find(x=>x.id===p.containerId);
    return !!(parent && parent.id!==it.id && parent.placement && (parent.placement.kind==='body'||parent.placement.kind==='loose'));
  }
  return false;
}
export function bcCarryProfile(inv, body, purseWeightKg=0) {
  let weight=0, bulk=0;
  (inv||[]).forEach(it=>{if(bcCarried(it,inv)) {weight+=bcWeight(it);if(it.placement&&it.placement.kind==='loose') bulk+=bcBulk(it);}});
  const purseWeight=Number.isFinite(Number(purseWeightKg))?Math.max(0,Number(purseWeightKg)):0;
  weight+=purseWeight;
  const str=nval(body&&body.strength,0),end=nval(body&&body.endurance,0);
  const comfortable=round(14+str*.3+end*.06),heavy=round(20+str*.43+end*.09),max=round(28+str*.62+end*.13);
  let band=weight>max?'immobile':weight>heavy?'overloaded':weight>comfortable?'heavy':'comfortable';
  if(bulk>BC_ARMS_BULK && band!=='immobile') band='overloaded';
  return {weight:round(weight),cashWeight:round(purseWeight),armsBulk:round(bulk),comfortable,heavy,max,band,
    paceMult:band==='comfortable'?1:band==='heavy'?1.3:band==='overloaded'?2.1:Infinity};
}
export function bcAllowedSlots(it) {
  const spec=bcSpec(it);
  if(!spec.slot)return [];
  if(spec.slot==='main-hand' && !has(it&&it.name,/bow|staff|spear|two.hand/i)) return ['main-hand','off-hand'];
  return [spec.slot];
}
const fail = reason => ({ok:false,reason});
const good = inventory => ({ok:true,inventory});
function usage(inv,cid,sid,skip) {
  let bulk=0,weight=0;
  inv.forEach(it=>{const p=it.placement;if(p&&p.kind==='container'&&p.containerId===cid&&p.slotId===sid&&it.id!==skip){bulk+=bcBulk(it);weight+=bcWeight(it);}});
  return {bulk,weight};
}
function looseBulk(inv,skip) {return inv.reduce((acc,it)=>acc+(it.id!==skip&&it.placement&&it.placement.kind==='loose'?bcBulk(it):0),0);}
export function bcFits(inv,item,dest) {
  if(!dest) return fail('Choose a destination.');
  if(dest.kind==='loose') return looseBulk(inv,item.id)+bcBulk(item) <= BC_ARMS_BULK+1e-8 ? {ok:true} : fail('Your arms are full.');
  if(dest.kind==='body') {
    if(!bcAllowedSlots(item).includes(dest.slot)) return fail('This item cannot use that equipment slot.');
    return {ok:true};
  }
  if(dest.kind!=='container') return fail('Unknown destination.');
  if(bcStorageOf(item))return fail('A container cannot be placed inside another container.');
  if(item.id===dest.containerId) return fail('Cannot place a container inside itself.');
  const bag=inv.find(it=>it.id===dest.containerId);
  if(!bag||!bag.placement||bag.placement.kind!=='body') return fail('Wear the container before using its compartments.');
  const st=bcStorageOf(bag),slot=st&&st.slots.find(s=>s.id===dest.slotId);
  if(!slot)return fail('No such compartment.');
  const tags=bcSpec(item).tags;
  if(!slot.allowed.includes('general')&&!slot.allowed.some(x=>tags.includes(x)))return fail('The item does not fit that type of compartment.');
  const used=usage(inv,bag.id,slot.id,item.id);
  if(used.bulk+bcBulk(item)>slot.bulkCap+1e-8)return fail('Compartment is too full.');
  if(used.weight+bcWeight(item)>slot.weightCap+1e-8)return fail('Compartment weight limit exceeded.');
  return {ok:true};
}
export function bcFindSpot(inv,item,noArms) {
  if(!bcStorageOf(item)) {
    const slots=[];
    (inv||[]).forEach(bag=>{
      if(bag.placement&&bag.placement.kind==='body'&&bcStorageOf(bag)) {
        bcStorageOf(bag).slots.forEach(slot=>slots.push({kind:'container',containerId:bag.id,slotId:slot.id,access:ACCESS[slot.access]||0,special:slot.allowed.some(t=>t!=='general'&&bcSpec(item).tags.includes(t))}));
      }
    });
    slots.sort((a,b)=>(Number(b.special)-Number(a.special))||(a.access-b.access));
    for(const p of slots) if(bcFits(inv,item,p).ok) return {kind:'container',containerId:p.containerId,slotId:p.slotId};
  }
  if(!noArms&&bcFits(inv,item,{kind:'loose'}).ok)return {kind:'loose'};
  return null;
}
export function bcDestinations(inv,it) {
  const dest=[];
  (inv||[]).forEach(c=>{const s=bcStorageOf(c);if(!s||!c.placement||c.placement.kind!=='body')return;
    s.slots.forEach(slot=>{const p={kind:'container',containerId:c.id,slotId:slot.id};
      if(it.placement&&it.placement.kind==='container'&&it.placement.containerId===c.id&&it.placement.slotId===slot.id)return;
      if(bcFits(inv,it,p).ok)dest.push({placement:p,label:txt(c.name)+' · '+slot.label,access:slot.access});
    });
  });
  if(!(it.placement&&it.placement.kind==='loose'&&it.placement.held)&&bcFits(inv,it,{kind:'loose'}).ok)dest.push({placement:{kind:'loose',held:true},label:'Hold in your hands',access:'quick'});
  return dest;
}
export function bcPlaceLabel(inv,it) {
  const p=it.placement||{};
  if(p.kind==='body')return 'Worn · '+(SLOT_LABELS[p.slot]||p.slot);
  if(p.kind==='loose')return p.held?'In your hands':'Carried loose (no room in your bags)';
  if(p.kind==='container'){
    const bag=(inv||[]).find(x=>x.id===p.containerId),s=bag&&bcStorageOf(bag);
    const slot=s&&s.slots.find(x=>x.id===p.slotId);
    return (bag?txt(bag.name):'Unidentified container')+' · '+(slot?slot.label:p.slotId);
  }
  if(p.kind==='world')return (p.area==='ground'?'On the ground':p.area==='home'?'At home':p.area==='companion'?'With companion':'In storage')+' · '+(p.location||'Unknown location');
  return txt(it.place||'Unassigned');
}
function setPlace(it,p) {
  let place='loose';
  if(p.kind==='body')place=p.slot==='main-hand'||p.slot==='off-hand'?'held':'worn';
  if(p.kind==='container')place='bag';
  if(p.kind==='world')place=p.area||'ground';
  return {...it,placement:p,place};
}
const areaFromLegacy = text => /^(home|storage|chest|companion|ground|room|stash)$/i.test(text) ? (text==='room'?'home':text==='stash'||text==='chest'?'storage':text) : '';
// Save migration: never delete legacy possessions. "bag" implies a satchel;
// backfill the physical container exactly once if no real bag already exists.
export function bcNormalize(raw,context) {
  const where=txt(context&&context.current_location||''),home=txt(context&&context.home_location||'');
  const initial=Array.isArray(raw)?raw:[];
  const items=initial.map((it,i)=>({...it,id:txt(it&&it.id)||('bc-legacy-item-'+i),qty:units(it)}));
  const ids=new Set();items.forEach(it=>{let id=it.id,j=1;while(ids.has(id))id=it.id+'-'+(j++);it.id=id;ids.add(id);});
  const hasLegacyBag=items.some(it=>!it.placement&&/bag|pack|satchel|backpack/i.test(txt(it.place))&&!bcStorageOf(it));
  if(hasLegacyBag&&!items.some(it=>bcStorageOf(it))){
    let id='bc-inferred-travel-satchel',i=1;while(ids.has(id))id='bc-inferred-travel-satchel-'+(i++);
    items.unshift({id,name:'Traveler\'s Satchel',qty:1,weight:.8,bulk:5,storage_profile:'travel_satchel',place:'worn',cond:'good',notes:'Migrated from an existing bag placement; not a new purchase.',placement:{kind:'body',slot:'back'}});
  }
  const picked=[],later=[];
  // First containers and already body-equipped pieces, then contents and other items.
  const ordered=items.slice().sort((a,b)=>(bcStorageOf(b)?1:0)-(bcStorageOf(a)?1:0));
  ordered.forEach(it=>{
    const p=it.placement;
    const repairedSlot=bcSpec(it).slot;
    const legacyGarmentSlot=p&&p.kind==='body' && repairedSlot && ((['clothes','base-upper','base-lower','under-upper','under-lower'].includes(repairedSlot) && ['clothes','torso','legs'].includes(p.slot)) || (SLOT_REMAP[repairedSlot]&&SLOT_REMAP[repairedSlot].includes(p.slot)));
    let target=legacyGarmentSlot?repairedSlot:p&&p.slot;
    // the grimoire rides in a worn holster when there is one
    if(p&&p.kind==='body'&&repairedSlot==='grimoire'&&p.slot!=='grimoire'){later.push(it);return;}
    // a bag, pouch or holster carried in the arms is meant to be worn
    if(bcStorageOf(it)&&p&&p.kind==='loose'&&!p.held&&repairedSlot&&!picked.some(x=>x.placement&&x.placement.kind==='body'&&x.placement.slot===repairedSlot)){picked.push(setPlace(it,{kind:'body',slot:repairedSlot}));return;}
    if(p&&p.kind==='body'&&bcAllowedSlots(it).includes(target) && !picked.some(x=>x.placement&&x.placement.kind==='body'&&x.placement.slot===target)) picked.push(setPlace(it,{kind:'body',slot:target}));
    else later.push(it);
  });
  later.forEach(it=>{
    const p=it.placement;
    if(p&&p.kind==='world') {picked.push(setPlace(it,p));return;}
    if(p&&p.kind==='container' && picked.some(x=>x.id===p.containerId) && (picked.find(x=>x.id===p.containerId).placement.kind!=='body'||bcFits(picked,it,p).ok)){picked.push(setPlace(it,p));return;}
    if(p&&p.kind==='loose'&&p.held) {picked.push(setPlace(it,p));return;}
    if(p&&p.kind==='loose'||bcSpec(it).tags.includes('grimoire')&&!(p&&p.kind==='container')) {
      // items added without a real place go into the best free compartment, not the arms
      const stow=bcFindSpot(picked,it,true);
      if(stow){picked.push(setPlace(it,stow));return;}
      if(bcSpec(it).slot==='grimoire'&&!picked.some(x=>x.placement&&x.placement.kind==='body'&&x.placement.slot==='grimoire')){picked.push(setPlace(it,{kind:'body',slot:'grimoire'}));return;}
      picked.push(setPlace(it,{kind:'loose'}));return;
    }
    if(!p){
      const area=areaFromLegacy(txt(it.place).toLowerCase());
      if(area){picked.push(setPlace(it,{kind:'world',area,location:txt(it.place_location||it.location)||(area==='home'?home:where)}));return;}
      if(/worn|wearing|equipp?ed|body|belt|pouch|sheath|held/i.test(txt(it.place)) || it.equipped===true || it.isEquipped===true || it.is_worn===true){
        const slots=bcAllowedSlots(it),target=slots.find(s=>!picked.some(x=>x.placement&&x.placement.kind==='body'&&x.placement.slot===s));
        if(target){picked.push(setPlace(it,{kind:'body',slot:target}));return;}
      }
    }
    const spot=bcFindSpot(picked,it);
    // Legacy over-capacity is preserved, clearly flagged in the capacity UI.
    picked.push(setPlace(it,spot||{kind:'loose'}));
  });
  return picked;
}
function allCarried(inv) {return inv.filter(it=>bcCarried(it,inv));}
function moveOne(inv,item,p) {
  const rest=inv.filter(it=>it.id!==item.id);
  const equipped=p.kind==='body'&&rest.find(it=>it.placement&&it.placement.kind==='body'&&it.placement.slot===p.slot);
  let moved=rest;
  if(equipped){
    moved=rest.filter(it=>it.id!==equipped.id);
    const spot=bcFindSpot([...moved,setPlace(item,p)],equipped);
    if(!spot)return fail('No space to put away '+equipped.name+'.');
    moved.push(setPlace(equipped,spot));
  }
  const result=[...moved,setPlace(item,p)];
  return bcCarryProfile(result,{}).armsBulk>BC_ARMS_BULK+1e-8?fail('Your arms would be too full.'):good(result);
}
// A home provides finite physical storage; nested contents of a bag left home
// also count, but are not charged twice as separate carried objects.
export function bcAtSquadLocker(context) {
  const squad=txt(context&&context.mk_status&&context.mk_status.squad);
  if(!squad||/^(none|unassigned)$/i.test(squad))return false;
  const loc=txt(context&&context.current_location).toLowerCase(),unit=squad.toLowerCase();
  return !!loc && loc.includes(unit) && /\b(hq|headquarters|base|barracks|quarters|hideout)\b/.test(loc);
}
export const BC_SQUAD_CAPACITY = Object.freeze({weight:100,bulk:100});
export function bcWorldStoreUsed(inv,area,where) {
  const cap=area==='home'?BC_HOME_CAPACITY:BC_SQUAD_CAPACITY;
  let weight=0,bulk=0;
  const inStore=new Set((inv||[]).filter(it=>it.placement&&it.placement.kind==='world'&&it.placement.area===area&&it.placement.location===where).map(it=>it.id));
  (inv||[]).forEach(it=>{
    const p=it.placement||{};
    if(inStore.has(it.id) || p.kind==='container'&&inStore.has(p.containerId)) {
      weight+=bcWeight(it);bulk+=bcBulk(it);
    }
  });
  return {weight:round(weight),bulk:round(bulk),maxWeight:cap.weight,maxBulk:cap.bulk};
}
export const BC_HOME_CAPACITY = Object.freeze({weight:150,bulk:150});
export function bcHomeUsed(inv,home) {return bcWorldStoreUsed(inv,'home',home);}
export function bcMove(inv,uid,dest,context) {
  const item=(inv||[]).find(it=>it.id===uid);if(!item)return fail('Item not found.');
  const p=item.placement||{};
  if(p.kind==='world') {
    const here=txt(context&&context.current_location),home=txt(context&&context.home_location);
    if(p.area==='ground'&&p.location!==here)return fail('That item was left at '+(p.location||'another place')+'.');
    if(p.area==='home'&&p.location!==here&&home!==here)return fail('You must return home to retrieve that item.');
    if(p.area==='storage'&&(p.location!==here||!bcAtSquadLocker(context)))return fail('Return to your assigned squad locker to access stored equipment.');
    if(p.area==='companion')return fail('Ask your companion to hand it over.');
  }
  if(p.kind==='container'){
    const container=inv.find(x=>x.id===p.containerId);
    if(!container)return fail('The container holding this item is missing.');
    if(container.placement&&container.placement.kind==='world') {
      const here=txt(context&&context.current_location),loc=container.placement.location;
      if(here!==loc)return fail('This item is inside a container left at '+(loc||'another location')+'.');
      if(container.placement.area==='storage'&&!bcAtSquadLocker(context))return fail('This is your squad locker; access requires current membership.');
    }
  }
  if(dest.kind==='world'){
    if(!bcCarried(item,inv))return fail('You are not carrying that.');
    const where=dest.area==='home'?txt(context&&context.home_location):txt(context&&context.current_location);
    if(!where)return fail('Your current location is unknown.');
    if(dest.area==='storage'&&!bcAtSquadLocker(context))return fail('You need access to your own squad headquarters locker.');
    if(dest.area==='home'&&where!==txt(context&&context.current_location))return fail('You must be home to store items there.');
    const changed=inv.map(it=>it.id===uid?setPlace(it,{kind:'world',area:dest.area||'ground',location:where}):it);
    if(dest.area==='home'||dest.area==='storage'){
      const used=bcWorldStoreUsed(changed,dest.area,where);
      if(used.weight>used.maxWeight||used.bulk>used.maxBulk)return fail('Home storage is full. You need more storage furniture or a separate property.');
    }
    return good(changed);
  }
  if(dest.kind==='body'){
    const f=bcFits(inv,item,dest);if(!f.ok)return f;
    const copy=inv.slice();return moveOne(copy,item,dest);
  }
  const f=bcFits(inv.filter(x=>x.id!==uid),item,dest);if(!f.ok)return f;
  return moveOne(inv,item,dest);
}
// Shop acquisitions only succeed when the item can actually be carried. Items
// are materialized as instances, preserving provenance, with collision-free ids.
export function bcReceive(inv,item) {
  const base={...item,qty:units(item),cond:item.cond||'good'};
  let id=txt(base.id)||'bc-item';
  while(inv.some(x=>x.id===id))id='bc-'+id+'-2';
  const newItem={...base,id};
  let spot=bcFindSpot(inv,newItem);
  if(!spot){
    const open=bcAllowedSlots(newItem).find(slot=>!inv.some(x=>x.placement&&x.placement.kind==='body'&&x.placement.slot===slot));
    if(open)spot={kind:'body',slot:open};
  }
  if(!spot)return fail('No physical space for '+txt(newItem.name)+'. Free a compartment or your arms before buying.');
  const candidate=[...inv,setPlace(newItem,spot)];
  if(bcCarryProfile(candidate,{}).armsBulk>BC_ARMS_BULK+1e-8)return fail('Your arms are full.');
  return good(candidate);
}
// All locally valid actions are pure functions. API writes are performed only
// by the UI adapter and should never be repeated in AI directives.
export function bcMoveQty(inv,uid,dest,context,qty) {
  const it=(inv||[]).find(x=>x.id===uid);
  if(!it)return fail('Item not found.');
  const total=units(it),amount=Math.floor(nval(qty,total));
  if(amount<=0||amount>total)return fail('Invalid quantity.');
  if(amount===total)return bcMove(inv,uid,dest,context);
  if(bcStorageOf(it))return fail('A container cannot be split.');
  let partId=uid+'-split-1',seq=1;
  while(inv.some(x=>x.id===partId))partId=uid+'-split-'+(++seq);
  const split={...it,id:partId,qty:amount};
  const kept=inv.map(x=>x.id===uid?{...x,qty:total-amount}:x);
  const candidate=[...kept,split];
  const moved=bcMove(candidate,partId,dest,context);
  if(!moved.ok)return moved;
  return moved;
}
export function bcIsAccessible(it,inv,combat) {
  if(!bcCarried(it,inv))return false;
  const p=it.placement||{};
  if(p.kind==='body'||p.kind==='loose')return true;
  if(p.kind!=='container')return false;
  const bag=(inv||[]).find(x=>x.id===p.containerId);
  const slot=bag&&bcStorageOf(bag)&&bcStorageOf(bag).slots.find(x=>x.id===p.slotId);
  if(!slot)return false;
  return !combat || slot.access==='quick'||slot.access==='ready';
}

// Appearance is computed from the SAME authoritative inventory, not a second
// equipment database. Armor and accessories do not magically become clothing.
export function bcIsClothing(it) {
  const s=bcSpec(it),n=txt(it&&it.name).toLowerCase();
  return s.tags.includes('clothing') || ['clothes','base-upper','base-lower','under-upper','under-lower'].includes(s.slot) ||
    /\b(shirt|trousers|pants|dress|robe|uniform|tunic|underwear|skirt|clothes|garments|outfit)\b/i.test(n);
}
// Deterministic, OBSERVABLE presentation signals. Social reactions themselves
// require a real observer and are resolved by existing world/NPC interactions.
// Clothing cannot change a person's bloodline, magically confer authority, or
// tell a stranger facts which their eyes cannot establish.
export function bcSocialPresentation(inv, context, appearance) {
  const ctx=context||{},profile=ctx.player_profile||{},home=ctx.household||{},knights=ctx.mk_status||{};
  const place=txt(ctx.current_location),scene=txt(ctx.scene_type);
  const originText=txt(profile.social_origin||ctx.social_origin||'');
  const origin=/^royal\b/i.test(originText)?'Royal':/^noble\b/i.test(originText)?'Noble':/^commoner\b/i.test(originText)?'Commoner':/^peasant\b/i.test(originText)?'Peasant':'Unspecified';
  const equipped=(inv||[]).filter(it=>it&&it.placement&&it.placement.kind==='body');
  const outerGarments=equipped.filter(it=>bcIsClothing(it)||['cloak','torso','shoulders','legs','head'].includes(it.placement.slot)&&/cloak|mantle|coat|jacket|robe|tunic|uniform/i.test(txt(it.name)+' '+txt(it.type)));
  let finery=0,wear=0,formal=false,uniform=false;
  const signals=[];
  outerGarments.forEach(it=>{
    const description=[it.name,it.type,it.material,it.quality,it.notes,...(Array.isArray(it.tags)?it.tags:[])].map(txt).join(' ').toLowerCase();
    const cond=txt(it.cond||it.condition).toLowerCase();
    if(/\b(royal|regal|silk|velvet|brocade|gold.thread|silver.thread|jeweled|jewelled|haute|luxury|luxurious|exquisite|extravagant)\b/.test(description))finery=Math.max(finery,3);
    else if(/\b(fine|fine.ly|tailored|embroider|formal|high.quality|ceremonial|noble|ornate|elegant|refined|fashionable)\b/.test(description))finery=Math.max(finery,2);
    else if(/\b(neat|respectable|well.made|sturdy|uniform|pressed|smart|polished)\b/.test(description))finery=Math.max(finery,1);
    if(/\b(ragged|rags|threadbare|tattered|torn|patched|poorly.fitting|frayed|shabby)\b/.test(description)||/^(poor|tattered|torn|ruined)$/.test(cond))wear=Math.max(wear,2);
    else if(/\b(dirty|muddy|dusty|stained|soiled|bloodied|weather.worn|faded|worn)\b/.test(description)||/^(damaged|worn|dirty)$/.test(cond))wear=Math.max(wear,1);
    if(/\b(formal|ceremonial|court|ball.gown|dress.uniform)\b/.test(description))formal=true;
    if(/\b(magic.knight|knight.squad|squad.uniform|squad.cloak|black.bulls|golden.dawn|silver.eagles|crimson.lion|blue.rose|green.mantis|coral.peacock|purple.orca|azure.deer)\b/.test(description))uniform=true;
  });
  const armour=equipped.filter(it=>/armor|armour|plate|cuirass|mail|breastplate|gauntlet|helm|shield/i.test(txt(it.name)+' '+txt(it.type)));
  const jewelry=equipped.filter(it=>/amulet|jewel|gemmed|necklace|ring|bracelet|pendant|brooch|signet/i.test(txt(it.name)+' '+txt(it.type)));
  if(jewelry.some(it=>/royal|gem|gold|ornate|masterwork|signet|precious/i.test([it.name,it.quality,it.material,it.notes].map(txt).join(' ')))) signals.push('Visible jewelry or status ornamentation');
  if(armour.length)signals.push('Visible armor: '+armour.map(it=>txt(it.name)).join(', '));
  if(uniform)signals.push('Recognizable-looking Magic Knight or squad garments (verify insignia before assigning authority)');
  if(formal)signals.push('Formal or ceremonial style');
  if(wear>=2)signals.push('Visibly damaged, patched, or shabby fabric');
  else if(wear===1)signals.push('Weathered or soiled presentation');
  if(finery>=2)signals.push('Fine tailoring or costly fabric');
  const outfitTier=finery>=3?'lavish':finery>=2?'fine':finery===1?'respectable':'ordinary';
  const condition=wear>=2?'shabby':wear===1?'weathered':'no visible damage recorded';
  const privatePlace=!!(appearance&&appearance.privatePlace);
  // Royal Capital is a city, not automatically a royal audience chamber.
  const court=/\b(throne.room|royal court|royal audience|audience chamber|palace|royal banquet|royal ball|castle reception)\b/i.test(place+' '+scene);
  const estate=!court&&/\b(noble estate|aristocratic estate|noble manor|noble ballroom|high society|noble salon|noble mansion|royal estate|noble quarter|noble realm)\b/i.test(place+' '+scene);
  const formalEvent=!court&&!estate&&/\b(ceremony|formal reception|banquet|ballroom|gala|diplomatic|entrance exam)\b/i.test(place+' '+scene);
  const squad=!court&&!estate&&!formalEvent&&/\b(squad|barracks|magic knights|knight headquarters)\b/i.test(place+' '+scene);
  const capital=!court&&!estate&&!formalEvent&&!squad&&/\b(royal capital|castle town)\b/i.test(place+' '+scene);
  const foreign=/\b(heart kingdom|spade kingdom|diamond kingdom|heart realm|spade realm|diamond realm)\b/i.test(place);
  const setting=privatePlace?'private':court?'royal court':estate?'aristocratic':formalEvent?'formal event':squad?'knight institution':capital?'capital public':'ordinary public';
  const inadequatelyDressed=appearance&&appearance.coverage!=='dressed';
  const workingClass=origin==='Peasant'||origin==='Commoner';
  const courtLike=court||estate||formalEvent;
  const scrutiny=privatePlace?'low':inadequatelyDressed?'high':courtLike&&workingClass&&!foreign?'high':courtLike?'elevated':capital&&workingClass?'elevated':'ordinary';
  const knightStatus=txt(knights.squad)&&txt(knights.squad)!=='none' ? txt(knights.rank||'Magic Knight')+' of '+txt(knights.squad):'No established Magic Knight affiliation';
  const socialNotes=[];
  if(courtLike)socialNotes.push('Elite social protocols may apply; entry, dress, names and rank matter');
  if(capital)socialNotes.push('Mixed city: class can matter, but not every street is a royal court');
  if(foreign)socialNotes.push('Foreign kingdom: apply local hierarchies, not Clover birth-class assumptions');
  if(workingClass&&courtLike&&!foreign)socialNotes.push('Commoner/peasant origins may invite more scrutiny IF a witness knows or infers them');
  if(finery>=2&&workingClass&&!foreign)socialNotes.push('Fine attire may earn interest, respect, envy or an accusation of pretension; it does not confer noble birth');
  if(wear>=1&&courtLike)socialNotes.push('Shabby/soiled clothing can breach elite dress expectations even for a noble');
  if(uniform)socialNotes.push('Visible regalia may temper disrespect, subject to authenticity and recognition');
  if(inadequatelyDressed&&!privatePlace)socialNotes.push('Inadequate public dress is conspicuous regardless of origin');
  return {origin,originSource:'character background; NOT automatically known by strangers',
    householdStanding:txt(home.wealth)||'not recorded',outfitTier,condition,formal,uniform,
    visibleSignals:signals,setting,scrutiny,knightStatus,socialNotes,
    observerWarning:'These are presentation cues and possible pressures, NOT witnessed reactions, reputation changes, class disclosure, access grants, or an AI action.'};
}

export function bcAppearance(inv, context) {
  const equipped=(inv||[]).filter(it=>it.placement&&it.placement.kind==='body');
  const pieces=equipped.filter(bcIsClothing);
  const at=(slot)=>equipped.filter(it=>it.placement.slot===slot);
  const full=pieces.some(it=>it.placement.slot==='clothes');
  const regularUpper=full||pieces.some(it=>it.placement.slot==='base-upper');
  const regularLower=full||pieces.some(it=>it.placement.slot==='base-lower');
  // Coat/armor can cover the upper torso; a few lower-body armor pieces also
  // provide visual coverage. Gloves/boots/accessories NEVER imply full dress.
  const outerUpper=at('torso').some(it=>/coat|jacket|vest|robe|tunic|armor|armour|breastplate|mail|cuirass/i.test(txt(it.name)+' '+txt(it.type)));
  const outerLower=at('legs').some(it=>/trousers|pants|kilt|skirt|leggings|cuisses|leg armor|leg armour/i.test(txt(it.name)+' '+txt(it.type)));
  const undiesUpper=pieces.some(it=>it.placement.slot==='under-upper');
  const undiesLower=pieces.some(it=>it.placement.slot==='under-lower');
  const upperCovered=regularUpper||outerUpper||undiesUpper;
  const lowerCovered=regularLower||outerLower||undiesLower;
  const upperDressed=regularUpper||outerUpper;
  const lowerDressed=regularLower||outerLower;
  const coverage=upperDressed&&lowerDressed?'dressed':
    !upperCovered&&!lowerCovered?'undressed':
    !upperDressed&&!lowerDressed&&undiesUpper&&undiesLower?'underdressed':'partially_dressed';
  const underwearVisible=(undiesUpper&&!upperDressed)||(undiesLower&&!lowerDressed);
  const exposed=[];
  if(!upperCovered)exposed.push('upper body');
  if(!lowerCovered)exposed.push('lower body');
  const inadequatelyDressed=[];
  if(!upperDressed)inadequatelyDressed.push(undiesUpper?'upper undergarment':'uncovered upper body');
  if(!lowerDressed)inadequatelyDressed.push(undiesLower?'lower undergarment':'uncovered lower body');
  const arms=equipped.filter(it=>['main-hand','off-hand'].includes(it.placement.slot)&&bcSpec(it).tags.includes('weapon'));
  const armor=equipped.filter(it=>/armor|armour|plate|guard|mail|gauntlet|helm|bracer/i.test(txt(it.name)+' '+txt(it.type)));
  const fancy=equipped.filter(it=>/masterwork|royal|ornate|ceremonial|enchanted|legendary|finely|extravagant/i.test(txt(it.quality)+' '+txt(it.name)+' '+txt(it.notes)));
  const loc=txt(context&&context.current_location),scene=txt(context&&context.scene_type);
  const privatePlace=/home|bedroom|bath|changing|private/i.test(loc+' '+scene);
  const names=pieces.map(it=>txt(it.name));
  const appearance = {initialized:true,coverage,upperCovered,lowerCovered,underwearVisible,
    exposed,inadequatelyDressed,clothing:names,visibleArmor:armor.map(it=>txt(it.name)),
    drawnWeapons:arms.map(it=>txt(it.name)),notableGear:fancy.map(it=>txt(it.name)),privatePlace,location:loc,
    summary:coverage==='undressed'?'No clothing covering the torso or legs':
      coverage==='underdressed'?'Wearing only undergarments':
      coverage==='partially_dressed'?'Not fully dressed':
      (names.length?'Wearing '+names.join(', '):'Wearing outer garments or armor'),
    // A possible reaction is NOT an event. Only real witnesses can observe it.
    attention:coverage==='undressed'?'high':coverage==='underdressed'?'high':
      coverage==='partially_dressed'?'possible':arms.length?'possible':
      armor.length||fancy.length?'occasional':'low'};
  appearance.social=bcSocialPresentation(inv,context,appearance);
  return appearance;
}
// If an old save had never inventoried its ordinary clothes, restore ONE basic
// non-magical outfit on its first migration. Do not do this after an intentional
// undressing, nor manufacture clothing repeatedly as the player changes outfits.
export function bcRestoreLegacyClothes(raw, context) {
  const a=Array.isArray(raw)?raw:[];
  const previous=context&&context.appearance_state;
  if(!context||context.character_created!==true || (previous&&previous.initialized))return a;
  if(a.some(bcIsClothing))return a;
  const profile=context.player_profile||{},creation=context.creation_profile||{};
  const nameHint=txt(profile.outfit||profile.clothing||creation.outfit||creation.clothing).trim();
  if(/^(none|naked|undressed|no clothing|no clothes)$/i.test(nameHint))return a;
  let name=nameHint&&nameHint.length<90?nameHint:'Everyday Clothes';
  let id='bc-legacy-everyday-clothes';let n=1;
  while(a.some(it=>it&&it.id===id))id='bc-legacy-everyday-clothes-'+(++n);
  const slot='clothes';
  return [...a,{id,name,qty:1,weight:.9,bulk:3.5,slot,coverage:'full',place:'worn',placement:{kind:'body',slot},
    cond:'good',tags:['clothing'],origin:'migration',notes:'Ordinary clothes already worn before the physical inventory update; restored once.'}];
}
export function bcEventText(verb,item,inv,appearance) {
  const name=txt(item&&item.name)||'the item';
  const s=bcSpec(item||{}),cloth=bcIsClothing(item||{});
  const n=name.toLowerCase();
  if(verb==='equip') {
    let phrase='You put on '+name+', securing it in place.';
    if(/cloak|mantle/i.test(n))phrase='You settle '+name+' across your shoulders and draw the fabric into place.';
    else if(/coat|jacket/i.test(n))phrase='You slip into '+name+' and fasten the front.';
    else if(/trousers|pants|breeches|skirt|kilt/i.test(n))phrase='You pull on '+name+' and straighten the waistband.';
    else if(/shirt|blouse|tunic|undershirt/i.test(n))phrase='You pull on '+name+' and smooth its fabric.';
    else if(/dress|gown|robe|uniform|outfit|clothes|garments/i.test(n))phrase='You dress in '+name+', adjusting the fit and fastenings.';
    else if(/boot|shoe/i.test(n))phrase='You put on '+name+' and secure the laces or straps.';
    else if(/glove|gauntlet/i.test(n))phrase='You slip on '+name+' and flex your fingers to settle the fit.';
    else if(/helmet|helm|hat/i.test(n))phrase='You place '+name+' on your head and adjust it.';
    else if(s.tags.includes('weapon'))phrase='You take '+name+' in hand and settle your grip.';
    else if(s.storage)phrase='You shoulder '+name+' and adjust its straps.';
    else if(/armor|armour|plate|mail|guard/i.test(n))phrase='You fit '+name+' into position and tighten its fastenings.';
    if(cloth&&appearance&&appearance.coverage!=='dressed')phrase+=' You are still not fully dressed.';
    return phrase;
  }
  if(verb==='remove')return cloth?'You undo the fastenings and take off '+name+'.':
    s.tags.includes('weapon')?'You lower '+name+' and stow it safely.':'You unfasten and remove '+name+'.';
  if(verb==='drop')return 'You set '+name+' down at your current location.';
  if(verb==='store')return 'You tuck '+name+' away among your belongings.';
  if(verb==='retrieve')return 'You retrieve '+name+' from its previous location.';
  if(verb==='consume')return 'You eat or drink '+name+'.';
  if(verb==='move')return 'You rearrange '+name+' among your belongings.';
  return 'You handle '+name+'.';
}
export function bcLocalExamine(item,inv) {
  const it=item||{},s=bcSpec(it);
  const facts=[txt(it.name),it.cond?'Condition: '+txt(it.cond):'',it.material?'Material: '+txt(it.material):'',
    it.quality?'Quality: '+txt(it.quality):'',it.durability!=null?'Durability: '+txt(it.durability):'',
    'Weight: '+bcWeight(it)+' kg', 'Location: '+bcPlaceLabel(inv,it),txt(it.notes)];
  return facts.filter(Boolean).join(' · ');
}
export function bcCanConsume(it) {
  const n=txt(it&&it.name)+' '+txt(it&&it.type),s=bcSpec(it||{});
  if(it&&it.usable==='gm')return false;
  // Never invent healing, mana or special magical effects from item names.
  // For unusual/poisoned/enchanted food use the story action instead.
  if(/poison|curse|enchanted|magic|potion|elixir|medicine|drug|unknown|mystery/i.test(n))return false;
  return it&&it.consumable===true||/\b(bread|ration|apple|pear|berry|berries|meal|sandwich|pastry|water|juice|milk|tea|drink)\b/i.test(n) &&
    (s.tags.includes('small')||s.tags.includes('bottle'));
}
export function bcConsume(inv,itemId,context) {
  const it=(inv||[]).find(x=>x.id===itemId);
  if(!it||!bcIsAccessible(it,inv,!!(context&&context.in_combat)))return fail('Item is not accessible.');
  if(!bcCanConsume(it))return fail('This item needs an in-world action or GM resolution.');
  if(context&&context.in_combat)return fail('Combat items need GM resolution for enemy reactions and time.');
  const qty=units(it);
  return good(qty>1?inv.map(x=>x.id===itemId?{...x,qty:qty-1}:x):inv.filter(x=>x.id!==itemId));
}
