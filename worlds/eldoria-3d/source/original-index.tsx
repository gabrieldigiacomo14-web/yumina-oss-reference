// @ts-nocheck
// Eldoria mobile-first Yumina rootComponent. No network access required.
// Built-ins (MessageList, MessageInput, useYumina) are provided by Yumina.

function clamp(n:number,min:number,max:number){ return Math.max(min,Math.min(max,n)); }
function xpForLevel(level:number){ return 50*level*(level-1); }
function levelFromXp(xp:number){ return Math.max(1,Math.floor((1+Math.sqrt(1+0.08*Math.max(0,xp)))/2 + 1e-9)); }
function skillNeed(level:number){ return 30 + 15*level + 3*level*level; }
function money(cp:number){
  cp=Math.max(0,Math.floor(Number(cp)||0));
  var gp=Math.floor(cp/10000); cp%=10000; var sp=Math.floor(cp/100); var c=cp%100;
  return gp+' gp | '+sp+' sp | '+c+' cp';
}
function pct(prog:number,level:number){ return clamp((Number(prog)||0)/skillNeed(Math.max(1,Number(level)||1))*100,0,100); }
function displayWorldTime(value:any){
  var raw=String(value||'').trim();
  if(!raw)return '08:00 AM';
  // search anywhere in the string, not just an exact full-string match, so
  // trailing notes or single-digit minutes don't silently break parsing
  var m=raw.match(/(\d{1,2}):(\d{1,2})\s*(AM|PM)/i);
  if(!m)return raw; // unrecognized format: show the real stored value, never mask it
  var h=Math.max(1,Math.min(12,parseInt(m[1],10)||12));
  var min=Math.max(0,Math.min(59,parseInt(m[2],10)||0));
  return String(h).padStart(2,'0')+':'+String(min).padStart(2,'0')+' '+m[3].toUpperCase();
}
var ELDORIA_MONTHS=['Frostwane','Thawrise','Dawnswell','Rainmoot','Bloomtide','Suncrest','Highsun','Goldfield','Harvestfall','Emberwane','Longnight','Deepfrost'];
var ELDORIA_WEEKDAYS=['Moonday','Forgeday','Marketday','Oathday','Wayday','Hearthday','Dawnday'];
var MONTHS:any={}; ELDORIA_MONTHS.forEach(function(n,i){MONTHS[n.toLowerCase()]=i;});
// Legacy aliases exist only so older saves migrate cleanly into the Concord Reckoning.
['january','february','march','april','may','june','july','august','september','october','november','december'].forEach(function(n,i){MONTHS[n]=i;});
function parseWorldDate(dateText:string){
  var m=String(dateText||'').match(/(?:[A-Za-z-]+,\s*)?([A-Za-z]+)\s+(\d{1,2}),\s*(\d{1,4})(?:\s*AR)?/i);
  if(!m)return null; var mi=MONTHS[String(m[1]).toLowerCase()]; if(mi==null)return null; return {month:mi,day:parseInt(m[2],10),year:parseInt(m[3],10)};
}
function worldDateUtc(dateText:string){ var p=parseWorldDate(dateText); return p?Date.UTC(p.year,p.month,p.day):null; }
function eldoriaWeekday(p:any){
  if(!p)return 'Dawnday'; var anchor=Date.UTC(1247,2,3), t=Date.UTC(p.year,p.month,p.day), delta=Math.floor((t-anchor)/86400000), anchorIndex=6;
  return ELDORIA_WEEKDAYS[((anchorIndex+delta)%7+7)%7];
}
function formatEldoriaDate(dateText:string){
  var p=parseWorldDate(dateText); if(!p)return String(dateText||'');
  return eldoriaWeekday(p)+', '+ELDORIA_MONTHS[p.month]+' '+p.day+', '+p.year+' AR';
}
function moonFromDate(dateText:string){
  var t=worldDateUtc(dateText); if(t==null)return 'Waxing Crescent'; var epoch=Date.UTC(1247,2,1); var days=Math.floor((t-epoch)/86400000); var d=((days%28)+28)%28+1;
  if(d===1||d===28)return 'New Moon'; if(d<=6)return 'Waxing Crescent'; if(d===7)return 'First Quarter'; if(d<=13)return 'Waxing Gibbous'; if(d===14)return 'Full Moon'; if(d<=20)return 'Waning Gibbous'; if(d===21)return 'Third Quarter'; return 'Waning Crescent';
}
function canonicalSettlement(place:string){ var s=String(place||'').trim(); var i=s.indexOf(' — '); return i>=0?s.slice(0,i).trim():s; }
function embeddedSublocation(place:string){ var s=String(place||'').trim(); var i=s.indexOf(' — '); return i>=0?s.slice(i+3).trim():''; }
function safeObj(v:any){ return v && typeof v==='object' && !Array.isArray(v)?v:{}; }
function safeArr(v:any){ return Array.isArray(v)?v:[]; }
function bar(current:number,max:number){ return max>0?clamp((Number(current)||0)/(Number(max)||1)*100,0,100):0; }
function titleCase(s:string){ return String(s||'').replace(/(^|[-_\s])\w/g,function(m){return m.toUpperCase().replace('-',' ').replace('_',' ')}); }


var BACKGROUND_OPTIONS=[
 'Guild Aspirant','Farmhand','Hunter','Caravan Guard','Town Militia',
 'Mercenary Recruit','Dockhand','Fisher','Miner','Blacksmith Apprentice',
 'Craft Apprentice','Merchant Apprentice','Scribe','Scholar','Temple Acolyte',
 'Healer’s Apprentice','Noble Retainer','Servant','Street Urchin','Outlander',
 'Refugee','Sailor','Scout','Herbalist','Gravekeeper'
];
var BACKGROUND_INFO:any={
 'Guild Aspirant':'Prepared for adventuring life and familiar with basic Guild customs.',
 'Farmhand':'Raised around crops, livestock, hard labor and rural communities.',
 'Hunter':'Experienced with tracking, trapping, fieldcraft and bringing game home.',
 'Caravan Guard':'Protected merchants and wagons on dangerous roads.',
 'Town Militia':'Part-time training defending a settlement, gate or neighborhood.',
 'Mercenary Recruit':'Served or trained under a paid fighting company.',
 'Dockhand':'Worked quays, warehouses, cargo lifts and harbor traffic.',
 'Fisher':'Knows small boats, nets, weather signs and life near water.',
 'Miner':'Worked around shafts, quarries, ore, supports and underground hazards.',
 'Blacksmith Apprentice':'Trained in forge work, repair and basic weapon maintenance.',
 'Craft Apprentice':'Learned a practical trade under a working artisan.',
 'Merchant Apprentice':'Knows weights, prices, bargaining, ledgers and local commerce.',
 'Scribe':'Copied records, contracts, letters and administrative documents.',
 'Scholar':'Spent time studying history, languages or other learned subjects.',
 'Temple Acolyte':'Served in a religious community and learned its rites and duties.',
 'Healer’s Apprentice':'Assisted with ordinary medicine, wounds, herbs and patient care.',
 'Noble Retainer':'Served a noble household and learned etiquette and hierarchy.',
 'Servant':'Worked in a household, inn, estate or institution and knows daily operations.',
 'Street Urchin':'Survived through quick thinking, odd jobs, local contacts and reading people.',
 'Outlander':'Came from beyond the local culture and is used to being an outsider.',
 'Refugee':'War, disaster or upheaval forced you from your previous home.',
 'Sailor':'Worked aboard ships and knows watches, rigging, ports and shipboard discipline.',
 'Scout':'Specialized in observation, messages, route-finding and moving ahead of others.',
 'Herbalist':'Gathered, prepared and traded common medicinal or practical plants.',
 'Gravekeeper':'Worked around burial grounds, funerary customs and records of the dead.'
};

var CLASS_OPTIONS=['Fighter','Rogue','Ranger','Mage','Cleric','Paladin','Barbarian','Monk','Bard','Druid','Occultist','Battlesmith','Sylvanoran Warden','Wyrm Hunter'];
var SPECIES=['Human','Elf','Dwarf','Half-Elf','Halfling','Orc-Blooded','Other'];
var SPECIES_INFO:any={
 Human:'Versatile and widespread across every Great Realm.',
 Elf:'Long-lived, keen-sensed and strongly represented in Sylvanor.',
 Dwarf:'Stone-born folk famed for craft, endurance and the holds of Stonehold.',
 'Half-Elf':'Between cultures, often adaptable in both human and elven lands.',
 Halfling:'Small, quick-footed folk found along trade roads, farms and river towns.',
 'Orc-Blooded':'Powerfully built descendants of mixed human and orcish lineages.',
 Other:'Use the appearance and origin fields to define an uncommon ancestry.'
};
var CLASS_INFO:any={
 Fighter:'Disciplined martial generalist. Weapons, armor, control and adaptable technique.',
 Rogue:'Stealth, precision, mobility, traps and opportunistic combat.',
 Ranger:'Wilderness mastery, tracking, ranged combat and monster knowledge.',
 Mage:'Formal arcane study, spellcraft and deep magical specialization.',
 Cleric:'Sacred magic, healing, wards, doctrine and spiritual authority.',
 Paladin:'Oath-bound armored champion combining martial and divine power.',
 Barbarian:'Raw physical force, endurance, instinct and momentum.',
 Monk:'Body discipline, speed, unarmed technique and inner control.',
 Bard:'Performance, lore, social mastery and subtle magic.',
 Druid:'Nature magic, survival, herbal knowledge and the living world.',
 Occultist:'Forbidden lore, pacts, hidden rituals and dangerous arcana.',
 Battlesmith:'Stonehold tradition joining master craft with armored battlefield engineering.',
 'Sylvanoran Warden':'Forest guardian blending tracking, nature lore and mobile defense.',
 'Wyrm Hunter':'Drakmoran specialist trained to read, pursue and survive great scaled prey.'
};
var REALM_STARTS:any={
 Aurelia:{name:'Aurelia',place:'Aurelia City — South Coach Gate',settlement:'Aurelia City',sublocation:'South Coach Gate',weather:'Overcast, light wind',x:0,y:0,id:'aurelia-city',kind:'capital',sigil:'♔',tag:'Heartland Kingdom',purseCp:5000,desc:'A prosperous central kingdom of highways, farms, guild halls and old barrows. The easiest place to begin a conventional Guild career.',gift:'Aurelian road cloak and Guild-district access.',asset:null},
 Stonehold:{name:'Stonehold',place:"Khaz'Modan / Anvil-Heart — Anvil Gate",settlement:"Khaz'Modan / Anvil-Heart",sublocation:'Anvil Gate',weather:'Cold, high cloud, mountain wind',x:480,y:320,id:'khaz-modan',kind:'capital-hold',sigil:'⚒',tag:'Dwarven Confederacy',purseCp:6500,desc:'Mountain holds, forge law, deep roads and the sealed Undervein. Metalwork is cheap; imported food and soft comforts cost more.',gift:'Stonehold mining lantern and cold-stone travel wrap.',asset:{id:'forge-chit',name:'Anvil-Heart Forge Chit',realm:'Stonehold',valueCp:1000,qty:1,acceptedAt:'licensed hold forges and provisioners',transferable:false,notes:'Local newcomer credit; not standard coin.'}},
 Sylvanor:{name:'Sylvanor',place:'Greenwhisper — Living Gate',settlement:'Greenwhisper',sublocation:'Living Gate',weather:'Cool canopy mist, light breeze',x:-620,y:220,id:'greenwhisper',kind:'capital',sigil:'❦',tag:'Ancient Forest Realm',purseCp:4000,desc:'A living forest realm governed by old custom, marked paths and the Circle of Nine. Herbs and timber are cheap; imported metal is expensive and foreign coin is less welcome deeper in the wood.',gift:'Forest cloak and herbal field pouch.',asset:{id:'green-ledger-credit',name:'Greenwhisper Trade Credit',realm:'Sylvanor',valueCp:2000,qty:1,acceptedAt:'Greenwhisper and affiliated forest markets',transferable:true,notes:'Locally trusted credit worth 20 sp at face value.'}},
 Drakmor:{name:'Drakmor',place:'Frostfang Keep — Frostfang Gate',settlement:'Frostfang Keep',sublocation:'Frostfang Gate',weather:'Freezing, light snow, hard north wind',x:0,y:720,id:'frostfang-keep',kind:'capital',sigil:'ᛉ',tag:'Cold Warrior Dominion',purseCp:9000,desc:'Tundra, shield-halls, wyrm country and brutal winters. Food is expensive, barter is common, and competence earns respect faster than pedigree.',gift:'Fur-lined cloak and winter waterskin.',asset:{id:'frostfang-bounty-token',name:'Frostfang Bounty Token',realm:'Drakmor',valueCp:1000,qty:1,acceptedAt:'Frostfang hunters, Guild outposts and many provisioners',transferable:true,notes:'Issued against future monster-material claims.'}},
 Sunscar:{name:'Sunscar',place:'Saffaron / City of Brass — Brass Gate',settlement:'Saffaron / City of Brass',sublocation:'Brass Gate',weather:'Dry, clear, warm desert wind',x:-820,y:-320,id:'saffaron',kind:'capital',sigil:'☼',tag:'Desert Sultanate',purseCp:7000,desc:'A wealthy desert power where wells define roads and water law is absolute. Water and iron command premiums; caravan credit is sophisticated.',gift:'Desert veil and two extra waterskins.',asset:{id:'water-court-scrip',name:'Water Court Brass Scrip',realm:'Sunscar',valueCp:2000,qty:1,acceptedAt:'registered wells, caravanserais and Water Court merchants',transferable:true,notes:'Especially useful for water and caravan services.'}},
 Velkar:{name:'Velkar',place:'Port Meridian — Adventurers’ Quay',settlement:'Port Meridian',sublocation:'Adventurers’ Quay',weather:'Cloudy, brisk sea wind, scattered drizzle',x:-80,y:-480,id:'port-meridian',kind:'consulate-seat',sigil:'⚓',tag:'Free Trading Cities',purseCp:6000,desc:'Salt air, islands, tariffs, ships and rival merchant houses. Banking and paper instruments are common; imported metal is pricier than sea goods.',gift:'Oilskin travel coat and dockside pass.',asset:{id:'meridian-dock-note',name:'Port Meridian Dock Note',realm:'Velkar',valueCp:2000,qty:1,acceptedAt:'Port Meridian merchants, ferries and Sea Drake desks',transferable:true,notes:'A small merchant note rather than loose coin.'}},
 'Umbral Reach':{name:'Umbral Reach',place:'Black Spire — Ash Gate',settlement:'Black Spire',sublocation:'Ash Gate',weather:'Ash haze, cool wind, dim sun',x:720,y:450,id:'black-spire',kind:'stronghold',sigil:'☾',tag:'Cursed Frontier',purseCp:15000,desc:'A harsh eastern frontier of ash, relics, undead threats and suspicious settlements. Clean food, holy goods and safe lodging cost dramatically more; survival barter matters.',gift:'Ash-filter scarf, basic ward-charm and extra preserved rations.',asset:{id:'black-spire-ration-chit',name:'Black Spire Ration Chit',realm:'Umbral Reach',valueCp:5000,qty:1,acceptedAt:'Black Spire Guild stores and licensed rationers',transferable:false,notes:'Worth 50 sp in survival provisions; deliberately more useful here than extra loose coin.'}}
};

var NAV=[['adventure','⚔','Adventure'],['character','♜','Character'],['skills','✦','Skills'],['inventory','⛨','Gear'],['world','⌖','World'],['more','☰','More']];
var MORE=[['callings','Callings'],['banking','Banking'],['magic','Magic'],['boards','Quest Boards'],['events','World Events'],['politics','Politics'],['faiths','Faiths'],['news','News & Rumors'],['chronicle','Chronicle'],['quests','Quest Log'],['guild','Guild'],['party','Party'],['training','Training'],['factions','Factions'],['crafting','Crafting'],['markets','Markets'],['shops','Shops'],['conditions','Conditions'],['journal','Journal'],['codex','Codex'],['audio','Audio']];

function ProgressBar({value,label}:{value:number,label?:string}){
 return <div className="bar"><div className="barFill" style={{width:clamp(value,0,100)+'%'}}></div>{label?<span>{label}</span>:null}</div>;
}
function StatPill({name,cur,max,kind}:{name:string,cur:number,max:number,kind:string}){
 return <div className={'stat '+kind}><div><b>{name}</b><span>{cur}/{max}</span></div><ProgressBar value={bar(cur,max)}/></div>;
}
function Card({title,children,action}:{title?:string,children:any,action?:any}){
 return <section className="card">{title?<div className="cardTitle"><b>{title}</b>{action||null}</div>:null}{children}</section>;
}
function Empty({children}:{children:any}){return <div className="empty">{children}</div>}

function ChoiceCard({selected,title,subtitle,detail,sigil,onClick}:{selected:boolean,title:string,subtitle?:string,detail?:string,sigil?:string,onClick:any}){
 return <button type="button" className={'choiceCard '+(selected?'selected':'')} onClick={onClick}><span className="choiceSigil">{sigil||'✦'}</span><span className="choiceWords"><b>{title}</b>{subtitle?<em>{subtitle}</em>:null}{detail?<small>{detail}</small>:null}</span><span className="choiceMark">{selected?'◆':'◇'}</span></button>
}

function Creator({api}:{api:any}){
 const [page,setPage]=React.useState(1);
 const [form,setForm]=React.useState({name:'',age:'',gender:'Male',species:'Human',appearance:'',origin:'',background:'Guild Aspirant',klass:'Fighter',realm:'Aurelia'});
 function f(k:string,v:any){setForm((x:any)=>({...x,[k]:v}));}
 var start=REALM_STARTS[form.realm]||REALM_STARTS.Aurelia;
 function finish(){
   if(!form.name.trim()){api.showToast('Give your adventurer a name first.','error');return;}
   api.setVariable('player-name',form.name.trim()); api.setVariable('player-age',Number(form.age)||20); api.setVariable('player-gender',form.gender);
   api.setVariable('player-species',form.species); api.setVariable('player-appearance',form.appearance); api.setVariable('player-origin',form.origin.trim()||start.name);
   api.setVariable('player-background',form.background||'Guild Aspirant'); api.setVariable('player-class',form.klass); api.setVariable('starting-calling',form.klass); api.setVariable('starting-realm',start.name);
   api.setVariable('player-level',1); api.setVariable('player-xp',0); api.setVariable('guild-rank','Unregistered'); api.setVariable('guild-reputation',0);
   api.setVariable('player-max-hp',20); api.setVariable('player-hp',20); api.setVariable('player-max-mana',10); api.setVariable('player-mana',10); api.setVariable('player-max-stamina',20); api.setVariable('player-stamina',20);
   var attrs:any={strength:10,agility:10,endurance:10,intellect:10,perception:10,willpower:10,presence:10,arcana:10}; if(form.klass==='Mage')attrs.arcana=11; if(form.klass==='Paladin')attrs.willpower=11; if(form.klass==='Bard')attrs.presence=11; api.setVariable('attributes',attrs);
   api.setVariable('techniques',{}); api.setVariable('abilities',{}); api.setVariable('conditions',[]); api.setVariable('injuries',[]); api.setVariable('quest-log',[]); api.setVariable('party',[]); api.setVariable('companions',{}); api.setVariable('in-combat',false); api.setVariable('combat-state',{round:0,combatants:[],terrain:'',notes:''}); api.setVariable('encumbrance','Unburdened');
   api.setVariable('factions',{'golden-lion':0,'silver-moon':0,'iron-vanguard':0,'shadow-ravens':0,'sea-drake':0});
    api.setVariable('class-state',{class:form.klass,tier:1,specialization:null,milestones:[],unspentPoints:0,playstyle:{},oath:null,pactLedger:[]});
    // Level 1 grants no banked point; the first arrives with level 2.
    api.setVariable('attribute-points',0); api.setVariable('attribute-points-granted',1);
   var callingId=form.klass.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
   var initialCallings:any={}; initialCallings[callingId]={name:form.klass,status:'learned',learningProgress:100,tier:1,specialization:null,origin:'starting',teacher:null,milestones:[],playstyle:{},features:['Foundational '+form.klass+' training']}; api.setVariable('callings',initialCallings); api.setVariable('calling-learning-log',[{calling:form.klass,event:'Starting Calling',date:'March 3, 1247',source:'character creation'}]);
   var starterSkills:any={};
   var seeds:any={Fighter:['swordsmanship','athletics','shield-use'],Rogue:['stealth','dagger-fighting','lockpicking'],Ranger:['tracking','survival','archery'],Mage:['arcana','investigation','scribing'],Cleric:['religion','medicine','insight'],Paladin:['swordsmanship','shield-use','leadership'],Barbarian:['heavy-weapons','athletics','survival'],Monk:['unarmed-combat','acrobatics','perception'],Bard:['persuasion','insight','history'],Druid:['nature','survival','herbalism'],Occultist:['arcana','investigation','religion'],Battlesmith:['blacksmithing','blunt-weapons','heavy-weapons'],'Sylvanoran Warden':['survival','tracking','nature'],'Wyrm Hunter':['tracking','spear-fighting','perception']};
    // Seed with the REAL family + governing attribute so the Skills screen files
    // each one under its proper heading instead of a flat 'starting' bucket.
    var SKILL_ATTR:any={swordsmanship:'strength','shield-use':'strength','heavy-weapons':'strength','blunt-weapons':'strength','spear-fighting':'agility','dagger-fighting':'agility','unarmed-combat':'agility',archery:'agility',acrobatics:'agility',stealth:'agility',lockpicking:'agility',athletics:'strength',survival:'endurance',tracking:'perception',perception:'perception',investigation:'intellect',insight:'perception',arcana:'arcana',scribing:'intellect',religion:'willpower',medicine:'intellect',herbalism:'intellect',nature:'intellect',history:'intellect',persuasion:'presence',leadership:'presence',blacksmithing:'strength'};
    (seeds[form.klass]||[]).forEach((id:string)=>starterSkills[id]={name:titleCase(id),category:skillFamily(id,{}),level:1,prog:0,origin:'class',teacher:null,attribute:SKILL_ATTR[id]||'varies'});
   api.setVariable('skills',starterSkills);
   var starterSpells:any={};
   if(form.klass==='Mage')starterSpells['arcane-light']={id:'arcane-light',name:'Arcane Light',school:'Arcane',tier:'Minor',manaCost:1,castingTime:'1 action',range:'Touch',origin:'starting calling'};
   if(form.klass==='Cleric'||form.klass==='Paladin')starterSpells['blessing']={id:'blessing',name:'Blessing',school:'Divine',tier:'Minor',manaCost:2,castingTime:'1 action',range:'Touch',origin:'starting calling'};
   if(form.klass==='Bard')starterSpells['tune']={id:'tune',name:'Tune',school:'Bardic',tier:'Minor',manaCost:1,castingTime:'1 action',range:'Self',origin:'starting calling'};
   if(form.klass==='Druid')starterSpells['seedwake']={id:'seedwake',name:'Seedwake',school:'Nature',tier:'Minor',manaCost:2,castingTime:'1 min',range:'Touch',origin:'starting calling'};
   if(form.klass==='Occultist')starterSpells['shade']={id:'shade',name:'Shade',school:'Umbral',tier:'Minor',manaCost:2,castingTime:'1 action',range:'10-ft area',origin:'starting calling'};
   api.setVariable('known-spells',starterSpells);
   var gear:any[]=[{id:'starter-pack',name:'Adventurer Pack',qty:1,weight:8,valueCp:2500,condition:100,equipped:false,properties:['bedroll','flint','2 rations','waterskin']}];
   var eq:any={weapon:null,offhand:null,head:null,chest:null,hands:null,legs:null,feet:null,cloak:null,accessory1:null,accessory2:null,tools:[]};
   if(['Mage','Druid','Monk'].includes(form.klass)){gear.push({id:'starter-staff',name:'Quarterstaff',qty:1,weight:4,valueCp:600,condition:100,equipped:true,properties:['1d6','versatile 1d8']});eq.weapon='starter-staff';}
   else if(form.klass==='Rogue'){gear.push({id:'starter-dagger',name:'Dagger',qty:1,weight:.8,valueCp:800,condition:100,equipped:true,properties:['1d4','finesse']});eq.weapon='starter-dagger';}
   else if(form.klass==='Ranger'||form.klass==='Sylvanoran Warden'){gear.push({id:'starter-shortbow',name:'Shortbow',qty:1,weight:2,valueCp:3000,condition:100,equipped:true,properties:['1d6','80 ft']});eq.weapon='starter-shortbow';}
   else {gear.push({id:'starter-longsword',name:'Longsword',qty:1,weight:3,valueCp:3500,condition:100,equipped:true,properties:['1d8','versatile 1d10']});eq.weapon='starter-longsword';}
   var callingGear:any={
    Mage:{id:'starter-spellbook',name:'Apprentice Spellbook & Arcane Focus',qty:1,weight:1.5,valueCp:1200,condition:100,equipped:false,properties:['focus','notes']},
    Cleric:{id:'starter-holy-symbol',name:'Holy Symbol & Healer Kit',qty:1,weight:2,valueCp:1200,condition:100,equipped:false,properties:['divine focus','basic medicine']},
    Paladin:{id:'starter-oath-token',name:'Oath Token',qty:1,weight:.2,valueCp:400,condition:100,equipped:false,properties:['personal oath focus']},
    Bard:{id:'starter-instrument',name:'Travel Instrument & Songbook',qty:1,weight:2,valueCp:1400,condition:100,equipped:false,properties:['performance','notes']},
    Druid:{id:'starter-druid-focus',name:'Wooden Druidic Focus & Herbal Kit',qty:1,weight:2,valueCp:900,condition:100,equipped:false,properties:['nature focus','herbal tools']},
    Occultist:{id:'starter-occult-kit',name:'Ritual Knife, Ward Chalk & Journal',qty:1,weight:2,valueCp:1000,condition:100,equipped:false,properties:['ritual tools','warding']},
    Battlesmith:{id:'starter-smith-tools',name:'Apprentice Smith Tools',qty:1,weight:6,valueCp:1800,condition:100,equipped:false,properties:['repair tools']},
    'Sylvanoran Warden':{id:'starter-warden-kit',name:'Warden Field Kit',qty:1,weight:2,valueCp:1000,condition:100,equipped:false,properties:['trail markers','field care']},
    'Wyrm Hunter':{id:'starter-wyrm-kit',name:'Wyrm Hunter Field Kit',qty:1,weight:3,valueCp:1400,condition:100,equipped:false,properties:['scale scraper','wind pennant','field journal']}
   }; if(callingGear[form.klass])gear.push(callingGear[form.klass]);
   var realmGear:any={
    Aurelia:{id:'realm-aurelia-cloak',name:'Aurelian Road Cloak',qty:1,weight:2,valueCp:800,condition:100,equipped:false,properties:['weather-resistant']},
    Stonehold:{id:'realm-stonehold-lantern',name:'Stonehold Mining Lantern',qty:1,weight:2,valueCp:1200,condition:100,equipped:false,properties:['hooded','8h oil']},
    Sylvanor:{id:'realm-sylvanor-pouch',name:'Sylvanoran Herbal Pouch',qty:1,weight:1,valueCp:1000,condition:100,equipped:false,properties:['field herbs','foraging kit']},
    Drakmor:{id:'realm-drakmor-cloak',name:'Fur-Lined Drakmoran Cloak',qty:1,weight:4,valueCp:1800,condition:100,equipped:false,properties:['cold-weather']},
    Sunscar:{id:'realm-sunscar-water',name:'Sunscar Water Kit',qty:1,weight:4,valueCp:1400,condition:100,equipped:false,properties:['2 extra waterskins','desert veil']},
    Velkar:{id:'realm-velkar-oilskin',name:'Velkar Oilskin Coat',qty:1,weight:3,valueCp:1500,condition:100,equipped:false,properties:['rain-resistant','sea-spray resistant']},
    'Umbral Reach':{id:'realm-umbral-ward',name:'Ash-Ward Charm',qty:1,weight:.2,valueCp:2000,condition:100,equipped:false,properties:['minor ward','ash filter scarf']}
   };
   if(realmGear[start.name])gear.push(realmGear[start.name]);
   api.setVariable('inventory',gear); api.setVariable('equipment',eq); api.setVariable('player-money-cp',start.purseCp); api.setVariable('bank-accounts',{}); api.setVariable('financial-assets',start.asset?[start.asset]:[]);
   api.setVariable('world-date','Sunday, March 3, 1247'); api.setVariable('world-time','08:00 AM'); api.setVariable('season','Early Spring'); api.setVariable('weather',start.weather||'Clear'); api.setVariable('moon-phase','Waxing Crescent');
   api.setVariable('current-location',start.settlement||canonicalSettlement(start.place)); api.setVariable('current-sublocation',start.sublocation||embeddedSublocation(start.place)||'Unassigned'); api.setVariable('current-region',start.name); api.setVariable('player-x',start.x);api.setVariable('player-y',start.y);
   var known:any={}; known[start.id]={name:start.settlement||canonicalSettlement(start.place),x:start.x,y:start.y,region:start.name,discovered:true,kind:start.kind,discoveryMethod:'starting location',discoveredDate:'March 3, 1247'}; api.setVariable('known-locations',known);
   api.setVariable('map-discovery-log',[{id:start.id,name:start.settlement||canonicalSettlement(start.place),x:start.x,y:start.y,region:start.name,method:'starting location',date:'March 3, 1247'}]); api.setVariable('map-last-position',{x:start.x,y:start.y});
   api.setVariable('sync-state',{lastType:'creation',lastDate:'Sunday, March 3, 1247',lastTime:'08:00 AM',lastSummary:'Creation state initialized',corrections:0});
   
   var openingMessage=[
     'Begin my adventure using the character I just created.',
     '',
     'CHARACTER PROFILE',
     'Name: '+form.name.trim(),
     'Age: '+(Number(form.age)||20),
     'Sex: '+form.gender,
     'Ancestry: '+form.species,
     'Appearance: '+(form.appearance.trim()||'Unspecified'),
     'Personal Origin: '+(form.origin.trim()||start.name),
     'Background: '+(form.background||'Guild Aspirant'),
     'Starting Calling: '+form.klass,
     'Starting Realm: '+start.name,
     'Starting Settlement: '+(start.settlement||canonicalSettlement(start.place)),
     'Starting Sublocation: '+(start.sublocation||embeddedSublocation(start.place)||'Unassigned'),
     'Coordinates: ('+start.x+', '+start.y+')',
     'Level: 1',
     'Guild Status: Unregistered',
     'Starting Purse: '+money(start.purseCp),
     'Local Asset: '+(start.asset?start.asset.name+' ('+money(start.asset.valueCp)+' local value)':'None'),
     'Realm Provision: '+start.gift,
     '',
     'GM: Treat this profile as authoritative. Do not ask me to repeat character creation. Begin naturally at my recorded starting settlement and coordinates, using the established canon for my selected realm.'
   ].join('\n');
   api.setVariable('character-created',true);
   api.showToast('Character created. Entering the world…','success');
   api.sendMessage(openingMessage);
 }
 return <div className={'creator realm-'+String(form.realm).toLowerCase().replace(/[^a-z0-9]+/g,'-')}><div className={'creatorPanel creationStep'+page}><div className="crest">✦</div><h1>ELDORIA</h1><p className="sub">From F-Rank to Legend</p><div className="ornament">❧ ─────── ✦ ─────── ❧</div><div className="steps"><span className={page===1?'on':''}>I · Identity</span><span className={page===2?'on':''}>II · Calling</span><span className={page===3?'on':''}>III · Realm</span></div>
 {page===1?<div className="creationPage"><div className="note creatorHelp">Only your name is required here. Anything marked Optional can be left blank; sensible defaults will be used.</div><div className="sectionRune"><span>Identity & Blood</span></div><div className="formGrid"><label>Name<input value={form.name} onChange={(e:any)=>f('name',e.target.value)} placeholder="Your adventurer's name" /></label><label>Age <small>(Optional — defaults to 20)</small><input type="number" value={form.age} onChange={(e:any)=>f('age',e.target.value)} placeholder="20" /></label><div className="wide"><div className="fieldTitle">Sex</div><div className="choiceGrid genderGrid"><ChoiceCard selected={form.gender==='Male'} title="Male" detail="Male adventurer" sigil="♂" onClick={()=>f('gender','Male')}/><ChoiceCard selected={form.gender==='Female'} title="Female" detail="Female adventurer" sigil="♀" onClick={()=>f('gender','Female')}/></div></div><label className="wide">Appearance <small>(Optional)</small><textarea value={form.appearance} onChange={(e:any)=>f('appearance',e.target.value)} placeholder="Build, hair, eyes, clothing, distinguishing marks…" /></label><label className="wide">Personal Origin <small>(Optional)</small><input value={form.origin} onChange={(e:any)=>f('origin',e.target.value)} placeholder="Town, village, household, former trade, or leave blank for the chosen realm" /></label></div><div className="sectionRune"><span>Choose Your Ancestry</span></div><div className="choiceGrid speciesGrid">{SPECIES.map(x=><ChoiceCard selected={form.species===x} title={x} detail={SPECIES_INFO[x]} sigil={x==='Human'?'♙':x==='Elf'?'❧':x==='Dwarf'?'⚒':x==='Half-Elf'?'✧':x==='Halfling'?'♧':x==='Orc-Blooded'?'⚔':'✦'} onClick={()=>f('species',x)}/>)}</div></div>:null}
 {page===2?<div className="creationPage"><div className="note creatorHelp">You do not need to know the mechanics. Fighter is the safe default, and this is only your starting Calling — other Callings can be learned naturally in play. Background is simply your former life, not another class.</div><div className="sectionRune"><span>Choose Your Calling</span></div><div className="choiceGrid classGrid">{CLASS_OPTIONS.map(x=><ChoiceCard selected={form.klass===x} title={x} detail={CLASS_INFO[x]} sigil={x==='Mage'?'✧':x==='Cleric'||x==='Paladin'?'☼':x==='Ranger'||x==='Sylvanoran Warden'?'❦':x==='Battlesmith'?'⚒':x==='Wyrm Hunter'?'ᛉ':'⚔'} onClick={()=>f('klass',x)}/>)}</div><div className="sectionRune"><span>Choose Your Background</span></div><p className="realmIntro">Pick the life you had before adventuring. This gives the narrator believable prior knowledge, contacts and experience without locking your future progression.</p><div className="choiceGrid backgroundGrid">{BACKGROUND_OPTIONS.map(x=><ChoiceCard selected={form.background===x} title={x} detail={BACKGROUND_INFO[x]} sigil={x==='Guild Aspirant'?'⚔':x==='Scholar'||x==='Scribe'?'✎':x==='Temple Acolyte'?'☼':x==='Miner'||x==='Blacksmith Apprentice'||x==='Craft Apprentice'?'⚒':x==='Sailor'||x==='Fisher'?'⚓':x==='Hunter'||x==='Scout'?'❦':x==='Merchant Apprentice'?'◈':'✦'} onClick={()=>f('background',x)}/>)}</div><div className="note parchmentNote">This is your STARTING calling, not your only one. Every calling can be learned later through real teachers, schools, orders, study, factions, quests or other legitimate paths. A calling stays hidden from your character UI until you actually begin learning it.</div></div>:null}
 {page===3?<div className="creationPage"><div className="note creatorHelp">You do not need setting knowledge to begin. Aurelia is the default balanced starting realm; choose another only if its description interests you.</div><div className="sectionRune"><span>Choose Your Starting Realm</span></div><p className="realmIntro">Your choice changes the place, culture, climate, economy and immediate dangers of the opening. You begin at the listed settlement with its real coordinates.</p><div className="realmGrid">{Object.keys(REALM_STARTS).map(k=>{var r=REALM_STARTS[k];return <ChoiceCard selected={form.realm===k} title={r.name} subtitle={r.tag+' · '+r.place} detail={r.desc+' Starting provision: '+r.gift} sigil={r.sigil} onClick={()=>f('realm',k)}/>})}</div><div className="note creatorHelp">When you enter the world, every choice shown below is automatically sent to the AI/GM as the opening player message. You will not need to retype your character.</div><Card title="The Chronicle Opens"><p><b>{form.name||'Unnamed Adventurer'}</b> — {form.species} • Starting Calling: {form.klass} • {form.gender}</p><p>{form.background||'Guild Aspirant'}</p><div className="realmSeal"><span>{start.sigil}</span><div><b>{start.name}</b><small>{start.place} · ({start.x}, {start.y})</small></div></div><p>Level 1 • 0 XP • Unregistered</p><p>Starting purse: <b>{money(start.purseCp)}</b></p>{start.asset?<p>Local tender: <b>{start.asset.name}</b> ({money(start.asset.valueCp)} local value)</p>:null}<p className="muted">{start.gift}</p></Card></div>:null}
 <div className="creatorButtons">{page>1?<button className="medievalButton" onClick={()=>setPage(page-1)}>‹ Back</button>:<span/>}{page<3?<button className="medievalButton primary" onClick={()=>setPage(page+1)}>Continue ›</button>:<button className="medievalButton primary begin" onClick={finish}>⚔ Enter World & Begin ⚔</button>}</div></div></div>
}

function Adventure({api,v}:{api:any,v:any}){
 return <div className="screen adventure"><div className="worldStrip"><div><b>{v['current-location']||'Unknown'}</b><small>{v['current-region']||''}</small></div><div className="time"><b>{displayWorldTime(v['world-time'])}</b><small>{v['world-date']}</small></div></div><div className="weather">{v['season']} • {v['weather']} • {v['moon-phase']}</div><div className="statsRow"><StatPill name="HP" cur={v['player-hp']} max={v['player-max-hp']} kind="hp"/><StatPill name="MP" cur={v['player-mana']} max={v['player-max-mana']} kind="mp"/><StatPill name="SP" cur={v['player-stamina']} max={v['player-max-stamina']} kind="sp"/></div><div className="messages"><MessageList /></div></div>
}
// Canonical attribute order + flavor, mirroring the progression lorebook entry.
var ATTR_ORDER=['strength','agility','endurance','intellect','perception','willpower','presence','arcana'];
var ATTR_NOTE:any={strength:'Force, lifting, grappling, heavy melee',agility:'Coordination, speed, balance, reflexes',endurance:'Health, stamina, resilience, toxins',intellect:'Reasoning, research, technical and magical theory',perception:'Awareness, observation, tracking',willpower:'Concentration, courage, mental resistance',presence:'Leadership, persuasion, intimidation',arcana:'Magical capacity, sensitivity and control'};
// Attributes rise slowly by design: each step into the higher bands costs more,
// and 18 is the ceiling reachable through ordinary advancement.
function attrStepCost(val:number){ return val>=18?0:val>=16?3:val>=14?2:1; }

function Character({api,v}:{api:any,v:any}){
 var a=safeObj(v.attributes), cs=safeObj(v['class-state']), calls=safeObj(v.callings); var xp=Number(v['player-xp'])||0, lvl=Number(v['player-level'])||1, next=xpForLevel(lvl+1), cur=xpForLevel(lvl);
 var learned=Object.values(calls).filter((x:any)=>x.status==='learned').length, training=Object.values(calls).filter((x:any)=>x.status==='training').length;
 var banked=Math.max(0,Number(v['attribute-points'])||0);
 const [draft,setDraft]=React.useState<any>({});
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
 function reset(){setDraft({});}
 function confirm(){
   if(spent<=0)return;
   var na:any={...a}; var changed:string[]=[];
   keys.forEach(k=>{ if(stagedOf(k)){ na[k]=baseOf(k)+stagedOf(k); changed.push(titleCase(k)+' '+baseOf(k)+'→'+na[k]); } });
   api.setVariable('attributes',na);
   api.setVariable('attribute-points',Math.max(0,banked-spent));
   setDraft({});
   if(api.showToast)api.showToast('Advancement confirmed — '+changed.join(', '),'success');
   // Tell the GM once, quietly, so narration can acknowledge the growth.
   if(api.injectContext)api.injectContext('The player has just allocated banked advancement points through their own character sheet: '+changed.join('; ')+'. These attribute values are now authoritative. Do not offer to allocate points or ask where they should go — allocation is player-controlled. You may acknowledge the growth naturally in narration if the moment suits.');
 }
 return <div className="screen">
  <Card title={(v['player-name']||'Adventurer')}><div className="heroLine"><span>Lv {lvl}</span><span>{v['guild-rank']}</span><span>{v['player-title']||'No Title'}</span></div><ProgressBar value={(xp-cur)/(next-cur)*100} label={xp+' / '+next+' XP'} /><p className="muted">{v['player-species']} • {v['player-gender']} • Age {v['player-age']||'—'} • {v['player-origin']||'Unknown origin'}</p><div className="row"><span>Starting Calling</span><b>{v['starting-calling']||v['player-class']||'—'}</b></div><div className="row"><span>Callings</span><b>{learned} learned{training?' • '+training+' training':''}</b></div></Card>
  <Card title="Attributes">
   <div className={'apBanner'+(banked>0?' apReady':'')}>
    <div className="apCount"><b>{remaining}</b><small>{remaining===1?'POINT':'POINTS'} UNSPENT</small></div>
    <div className="apWords">{banked>0?<>Advancement points from your level-ups. They keep stacking until you use them — nothing is lost by waiting.</>:<>One advancement point is banked here each time you gain a level. Spend them here; the Guild does not do it for you.</>}{spent>0?<em> {spent} staged, awaiting confirmation.</em>:null}</div>
   </div>
   <div className="attrGrid alloc">{keys.map(k=>{
     var val=valueOf(k), mod=Math.floor((val-10)/2), st=stagedOf(k), cost=attrStepCost(val), maxed=val>=18;
     return <div key={k} className={'attrCell'+(st?' staged':'')}>
      <div className="attrTop"><span>{titleCase(k)}</span><b>{val}{st?<i> +{st}</i>:null}</b><small>{mod>=0?'+':''}{mod}</small></div>
      <div className="attrNote">{ATTR_NOTE[k]||''}</div>
      <div className="attrCtl">
       <button className="apBtn" disabled={st<=0} onClick={()=>lower(k)} title="Return staged point">−</button>
       <span className="apCost">{maxed?'At 18 — further growth demands an extraordinary event':(banked>0?cost+(cost===1?' pt':' pts'):'—')}</span>
       <button className="apBtn up" disabled={!canRaise(k)} onClick={()=>raise(k)} title={maxed?'Ceiling for ordinary advancement':'Raise by one'}>+</button>
      </div>
     </div>;
   })}</div>
   {spent>0?<div className="apActions"><button className="medievalButton" onClick={confirm}>Confirm Advancement ({spent} spent)</button><button className="medievalButton itemBtn" onClick={reset}>Reset</button></div>:null}
   <p className="muted apFoot">Cost rises as an attribute climbs: 1 point below 14, 2 points at 14–15, 3 points at 16–17. Eighteen is the ceiling ordinary training can reach.</p>
  </Card>
  <Card title="Starting Calling Legacy Development"><p>Tier {cs.tier||1} {cs.specialization?'• '+cs.specialization:''}</p><p className="muted">The full multi-calling record is under Callings. This panel remains only for compatibility with older class-state logic.</p></Card>
 </div>
}
// Canonical skill families, mirroring the Skill System lorebook entry. Used to
// place a skill under the right heading even when the stored record predates
// categories or carries a placeholder value like 'starting'/'varies'.
var SKILL_FAMILIES:any=[
 ['Physical',['athletics','acrobatics','running','climbing','swimming','riding']],
 ['Weapons',['swordsmanship','dagger-fighting','axe-fighting','spear-fighting','blunt-weapons','archery','crossbows','shield-use','unarmed-combat','grappling','dual-wielding','heavy-weapons','polearms','thrown-weapons']],
 ['Covert',['stealth','sleight-of-hand','lockpicking','trap-handling','disguise','pickpocketing']],
 ['Wilds',['survival','tracking','foraging','hunting','fishing','navigation','cartography']],
 ['Mental',['perception','investigation','insight','concentration','memory']],
 ['Social',['persuasion','deception','intimidation','leadership','performance','etiquette','haggling','bargaining']],
 ['Lore',['arcana','history','religion','nature','medicine','first-aid','animal-handling','linguistics','appraisal']],
 ['Craft',['blacksmithing','metallurgy','smelting','refining','smelting-refining','armorsmithing','weaponsmithing','alchemy','cooking','leatherworking','tanning','woodworking','bowyer','fletching','bowyer-fletching','enchanting','runecraft','artificing','engineering','scribing','herbalism','tailoring','weaving','tailoring-weaving','jewelcrafting','gemcutting','brewing','mining','masonry','carpentry']]
];
var SKILL_FAMILY_INDEX:any=(function(){var m:any={};SKILL_FAMILIES.forEach(function(f:any){f[1].forEach(function(id:string){m[id]=f[0];});});return m;})();
var FAMILY_ORDER=['Physical','Weapons','Covert','Wilds','Mental','Social','Lore','Craft','Magic','Other'];
var FAMILY_SIGIL:any={Physical:'⚡',Weapons:'⚔',Covert:'☾',Wilds:'❦',Mental:'◉',Social:'✦',Lore:'✧',Craft:'⚒',Magic:'✺',Other:'❖'};
// A stored category only wins when it is a real family name; placeholders and
// legacy values fall through to the canonical map, then to keyword heuristics.
var PLACEHOLDER_CATS=['starting','class','varies','none','general','misc','unknown',''];
function normFamily(raw:any){
 var s=String(raw||'').trim(); if(!s)return '';
 var low=s.toLowerCase();
 for(var i=0;i<FAMILY_ORDER.length;i++){ if(FAMILY_ORDER[i].toLowerCase()===low)return FAMILY_ORDER[i]; }
 if(low==='physical'||low==='body'||low==='athletic')return 'Physical';
 if(low==='weapon'||low==='combat'||low==='martial')return 'Weapons';
 if(low==='stealth'||low==='thievery'||low==='roguery')return 'Covert';
 if(low==='wilderness'||low==='survival'||low==='wild')return 'Wilds';
 if(low==='knowledge'||low==='academic'||low==='scholarly')return 'Lore';
 if(low==='crafting'||low==='artisan'||low==='trade')return 'Craft';
 if(low==='arcane'||low==='spellcraft'||low==='magical')return 'Magic';
 return '';
}
function skillFamily(id:string,rec:any){
 var stored=String((rec&&rec.category)||'').trim().toLowerCase();
 if(PLACEHOLDER_CATS.indexOf(stored)===-1){ var fromStored=normFamily(rec.category); if(fromStored)return fromStored; }
 var key=String(id||'').toLowerCase().replace(/\s+/g,'-');
 if(SKILL_FAMILY_INDEX[key])return SKILL_FAMILY_INDEX[key];
 var name=String((rec&&rec.name)||'').toLowerCase().replace(/\s+/g,'-');
 if(SKILL_FAMILY_INDEX[name])return SKILL_FAMILY_INDEX[name];
 var hay=key+' '+name;
 if(/(sword|blade|axe|spear|bow|dagger|shield|mace|hammer|fight|weapon|martial|wield|unarmed|grappl)/.test(hay))return 'Weapons';
 if(/(stealth|lock|trap|thiev|pickpocket|disguise|sneak|shadow)/.test(hay))return 'Covert';
 if(/(smith|craft|forge|alchem|cook|leather|wood|tailor|weav|brew|gem|jewel|engineer|scrib|rune|enchant|artific|herbal|masonry|mining|tanning)/.test(hay))return 'Craft';
 if(/(survival|track|forage|hunt|fish|navigat|cartograph|wild)/.test(hay))return 'Wilds';
 if(/(persuas|decept|intimidat|leader|perform|etiquette|haggl|barter|social)/.test(hay))return 'Social';
 if(/(arcana|history|religion|nature|medicine|first-aid|lore|linguist|apprais|animal)/.test(hay))return 'Lore';
 if(/(percept|investigat|insight|concentrat|memory|focus)/.test(hay))return 'Mental';
 if(/(athlet|acrobat|climb|swim|run|rid|jump)/.test(hay))return 'Physical';
 if(/(spell|magic|cast|mana|conjur|evocat|abjur|illusion|necroman|divinat|transmut)/.test(hay))return 'Magic';
 return 'Other';
}
function SkillRow({id,s}:{id:string,s:any}){
 var lv=Number(s.level)||1,p=pct(s.prog,lv);
 return <div className="skill"><div className="skillTop"><b>{s.name||titleCase(id)}</b><span>Lv. {lv} | {p.toFixed(1)}%</span></div><ProgressBar value={p}/><small>{s.origin?'Origin: '+s.origin:''}{s.teacher?' • Teacher: '+s.teacher:''}{s.attribute&&s.attribute!=='varies'?' • '+titleCase(String(s.attribute)):''}</small></div>;
}
function Skills({v}:{v:any}){
 var skills=safeObj(v.skills), tech=safeObj(v.techniques);
 var skillKeys=Object.keys(skills);
 var groups:any={}; skillKeys.forEach(function(k){var fam=skillFamily(k,skills[k]||{}); (groups[fam]=groups[fam]||[]).push(k);});
 var present=FAMILY_ORDER.filter(function(f){return groups[f]&&groups[f].length;})
   .concat(Object.keys(groups).filter(function(f){return FAMILY_ORDER.indexOf(f)===-1;}).sort());
 var highest=skillKeys.slice().sort(function(a,b){return (Number(skills[b].level)||1)-(Number(skills[a].level)||1);})[0];
 var techKeys=Object.keys(tech);
 return <div className="screen">
  {skillKeys.length?<Card title="Mastery Summary">
   <div className="row"><span>Skills Recorded</span><b>{skillKeys.length}</b></div>
   <div className="row"><span>Disciplines</span><b>{present.length}</b></div>
   {highest?<div className="row"><span>Highest</span><b>{skills[highest].name||titleCase(highest)} — Lv. {Number(skills[highest].level)||1}</b></div>:null}
   {techKeys.length?<div className="row"><span>Techniques</span><b>{techKeys.length}</b></div>:null}
  </Card>:null}
  {skillKeys.length
   ? present.map(function(fam){
       var keys=groups[fam].slice().sort(function(a:string,b:string){return (Number(skills[b].level)||1)-(Number(skills[a].level)||1);});
       return <Card key={fam} title={(FAMILY_SIGIL[fam]||'❖')+'  '+fam+'  ('+keys.length+')'}>
         {keys.map(function(k:string){return <SkillRow key={k} id={k} s={skills[k]||{}}/>;})}
       </Card>;
     })
   : <Card title="Skills"><Empty>No skills recorded yet. Skills appear here once your character actually trains, studies or uses them under pressure.</Empty></Card>}
  <Card title="✷  Techniques">
   {techKeys.length
    ? techKeys.slice().sort(function(a,b){return (Number(tech[b].level)||1)-(Number(tech[a].level)||1);}).map(function(k){return <SkillRow key={k} id={k} s={tech[k]||{}}/>;})
    : <Empty>No techniques learned yet. Techniques are taught by masters or invented through deliberate development.</Empty>}
  </Card>
 </div>
}
var SLOT_KEYWORDS:any={weapon:['sword','blade','dagger','axe','mace','hammer','spear','staff','bow','crossbow','wand','rod','knife','flail','rapier'],offhand:['shield','buckler'],pack:['pack','backpack','satchel','rucksack','knapsack','saddlebag'],head:['helm','hood','circlet','cap','crown','coif'],chest:['armor','mail','plate','robe','tunic','breastplate','cuirass','jerkin','vest'],hands:['gloves','gauntlets','bracers'],legs:['greaves','leggings','trousers'],feet:['boots','shoes','sandals','sabatons'],cloak:['cloak','cape','mantle'],accessory1:['ring','amulet','necklace','pendant','talisman','charm']};
var TWO_HANDED=['greatsword','greataxe','warhammer','halberd','longbow','great axe','war hammer','two-handed'];
function guessSlot(it:any,eq:any){
 if(it.slot)return it.slot;
 var hay=(String(it.name||'')+' '+(Array.isArray(it.properties)?it.properties.join(' '):'')).toLowerCase();
 for(var s in SLOT_KEYWORDS){ if(SLOT_KEYWORDS[s].some((k:string)=>hay.includes(k))) return (s==='accessory1'&&eq.accessory1&&eq.accessory1!==it.id)?'accessory2':s; }
 return null;
}
function isTwoHanded(it:any){ var hay=(String(it.name||'')+' '+(Array.isArray(it.properties)?it.properties.join(' '):'')).toLowerCase(); return TWO_HANDED.some((k)=>hay.includes(k)); }
function Inventory({api,v}:{api:any,v:any}){
 var inv=safeArr(v.inventory), eq=safeObj(v.equipment), ac=safeObj(v['bank-accounts']), assets=safeArr(v['financial-assets']); var bankTotal=Object.values(ac).reduce((n:number,a:any)=>n+Number(a.balanceCp||0),0);
 function doEquip(it:any){
  var slot=guessSlot(it,eq); if(!slot)return;
  var newEq={...eq}; var newInv=inv.map((x:any)=>({...x}));
  var prevId=newEq[slot];
  if(prevId&&prevId!==it.id){ var prev=newInv.find((x:any)=>x.id===prevId); if(prev)prev.equipped=false; }
  if(slot==='weapon'&&isTwoHanded(it)&&newEq.offhand){ var prevOff=newInv.find((x:any)=>x.id===newEq.offhand); if(prevOff)prevOff.equipped=false; newEq.offhand=null; }
  newEq[slot]=it.id;
  var self=newInv.find((x:any)=>x.id===it.id); if(self)self.equipped=true;
  api.setVariable('equipment',newEq); api.setVariable('inventory',newInv);
 }
 function doUnequip(slot:string){
  var id=eq[slot]; if(!id)return;
  var newEq={...eq}; newEq[slot]=null;
  var newInv=inv.map((x:any)=>x.id===id?{...x,equipped:false}:x);
  api.setVariable('equipment',newEq); api.setVariable('inventory',newInv);
 }
 return <div className="screen"><Card title="Purse & Stored Wealth"><div className="money">{money(v['player-money-cp'])}</div><div className="row"><span>Banked / Vaulted</span><b>{money(bankTotal)}</b></div><div className="row"><span>Local Tender Instruments</span><b>{assets.length}</b></div><small>{v.encumbrance||'Unburdened'} • Banked funds are not in your pack.</small></Card><Card title="Equipped">{Object.entries(eq).filter(([slot])=>slot!=='tools').map(([slot,id]:any)=><div className="row" key={slot}><span>{titleCase(slot)}</span><b>{id?((inv.find((x:any)=>x.id===id)||{}).name||String(id)):'—'}</b>{id?<button className="medievalButton itemBtn" onClick={()=>doUnequip(slot)}>Unequip</button>:null}</div>)}</Card><Card title="Inventory">{inv.length?inv.map((it:any,i:number)=>{var slot=guessSlot(it,eq); return <div className="item" key={it.id||i}><div><b>{it.name||'Item'}</b><small> x{it.qty||1} • {it.weight||0} lb • Condition {it.condition??100}%</small></div><span>{it.equipped?<i>Equipped</i>:null}{slot&&!it.equipped?<button className="medievalButton itemBtn" onClick={()=>doEquip(it)}>Equip</button>:null}{slot&&it.equipped?<button className="medievalButton itemBtn" onClick={()=>doUnequip(slot)}>Unequip</button>:null}</span></div>}):<Empty>Your pack is empty.</Empty>}</Card></div>
}
function World({v}:{v:any}){
 var locs=safeObj(v['known-locations']);
 var vals=(Object.entries(locs) as any[]).map(([id,l]:any)=>({id,...(l||{})})).filter((l:any)=>l&&l.discovered!==false);
 var px=Number(v['player-x'])||0, py=Number(v['player-y'])||0;

 var savedBounds=safeObj(v['map-world-bounds']);
 var canonical={minX:-1250,maxX:1250,minY:-900,maxY:900};
 var allX=[canonical.minX,canonical.maxX,px,...vals.map((l:any)=>Number(l.x)).filter((n:any)=>Number.isFinite(n))];
 var allY=[canonical.minY,canonical.maxY,py,...vals.map((l:any)=>Number(l.y)).filter((n:any)=>Number.isFinite(n))];
 if(Number.isFinite(Number(savedBounds.minX)))allX.push(Number(savedBounds.minX));
 if(Number.isFinite(Number(savedBounds.maxX)))allX.push(Number(savedBounds.maxX));
 if(Number.isFinite(Number(savedBounds.minY)))allY.push(Number(savedBounds.minY));
 if(Number.isFinite(Number(savedBounds.maxY)))allY.push(Number(savedBounds.maxY));

 var rawMinX=Math.min(...allX), rawMaxX=Math.max(...allX), rawMinY=Math.min(...allY), rawMaxY=Math.max(...allY);
 var padX=Math.max(0,(rawMaxX-rawMinX)*.04), padY=Math.max(0,(rawMaxY-rawMinY)*.04);
 var bounds={
   minX:Math.floor((rawMinX-padX)/50)*50,
   maxX:Math.ceil((rawMaxX+padX)/50)*50,
   minY:Math.floor((rawMinY-padY)/50)*50,
   maxY:Math.ceil((rawMaxY+padY)/50)*50
 };
 var worldW=bounds.maxX-bounds.minX, worldH=bounds.maxY-bounds.minY;

 var [zoom,setZoom]=React.useState(1);
 var [pan,setPan]=React.useState({x:0,y:0});
 var dragRef=React.useRef<any>(null);
 var pinchRef=React.useRef<any>({points:{},distance:0,zoom:1});

 var clampZoom=(z:number)=>Math.max(.7,Math.min(6,z));
 var setZ=(z:number)=>setZoom(clampZoom(z));
 var resetView=()=>{setZoom(1);setPan({x:0,y:0})};
 var centerPlayer=()=>{var nx=((px-bounds.minX)/worldW-.5)*100;var ny=((bounds.maxY-py)/worldH-.5)*100;setPan({x:-nx*zoom*7.2,y:-ny*zoom*4.9})};

 var onWheel=(e:any)=>{e.preventDefault();setZ(zoom*(e.deltaY<0?1.14:.88))};
 var onPointerDown=(e:any)=>{
   try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
   pinchRef.current.points[e.pointerId]={x:e.clientX,y:e.clientY};
   var pts=Object.values(pinchRef.current.points) as any[];
   if(pts.length===1)dragRef.current={id:e.pointerId,x:e.clientX,y:e.clientY,panX:pan.x,panY:pan.y};
   if(pts.length===2){var dx=pts[0].x-pts[1].x,dy=pts[0].y-pts[1].y;pinchRef.current.distance=Math.hypot(dx,dy);pinchRef.current.zoom=zoom;dragRef.current=null}
 };
 var onPointerMove=(e:any)=>{
   if(pinchRef.current.points[e.pointerId])pinchRef.current.points[e.pointerId]={x:e.clientX,y:e.clientY};
   var pts=Object.values(pinchRef.current.points) as any[];
   if(pts.length===2){var dx=pts[0].x-pts[1].x,dy=pts[0].y-pts[1].y;var d=Math.hypot(dx,dy);if(pinchRef.current.distance>0)setZ(pinchRef.current.zoom*(d/pinchRef.current.distance));return}
   if(dragRef.current&&dragRef.current.id===e.pointerId){setPan({x:dragRef.current.panX+(e.clientX-dragRef.current.x),y:dragRef.current.panY+(e.clientY-dragRef.current.y)})}
 };
 var onPointerUp=(e:any)=>{delete pinchRef.current.points[e.pointerId];dragRef.current=null;if(Object.keys(pinchRef.current.points).length<2)pinchRef.current.distance=0};

 var pos=(x:any,y:any)=>({
   left:(((Number(x)-bounds.minX)/worldW)*100)+'%',
   top:(((bounds.maxY-Number(y))/worldH)*100)+'%'
 });
 var p=pos(px,py);

 var kindIcon=(k:any)=>{var s=String(k||'').toLowerCase();if(s.includes('capital'))return '♛';if(s.includes('city'))return '◆';if(s.includes('town'))return '■';if(s.includes('village')||s.includes('hamlet')||s.includes('settlement'))return '●';if(s.includes('fort')||s.includes('keep'))return '▲';if(s.includes('port'))return '⚓';if(s.includes('ruin')||s.includes('dungeon'))return '✦';return '•'};

 var minor=50, major=250;
 var minorPctX=(minor/worldW)*100, minorPctY=(minor/worldH)*100;
 var majorPctX=(major/worldW)*100, majorPctY=(major/worldH)*100;
 var aspect=worldW/worldH;

 return <div className="screen">
  <Card title="Current Position">
   <div className="coords">({px}, {py})</div>
   <p>{v['current-location']} — {v['current-region']}</p>
   {v['current-sublocation']?<small>{v['current-sublocation']}</small>:null}
   <div className="scaleFacts"><span>1 coordinate = 1 mile</span><span>{worldW.toLocaleString()} × {worldH.toLocaleString()} miles shown</span></div>
  </Card>

  <Card title="Interactive Discovery Map">
   <p className="muted">Drag to pan. Pinch or use the controls to zoom. Markers use their actual world coordinates; tiny settlements are plotted at the same geographic scale as capitals.</p>
   <div className="mapToolbar">
    <button onClick={()=>setZ(zoom/1.25)}>−</button>
    <span>{Math.round(zoom*100)}%</span>
    <button onClick={()=>setZ(zoom*1.25)}>+</button>
    <button className="wideMapBtn" onClick={centerPlayer}>⌖ Player</button>
    <button className="wideMapBtn" onClick={resetView}>Fit World</button>
   </div>
   <div className="mapViewport"
     onWheel={onWheel}
     onPointerDown={onPointerDown}
     onPointerMove={onPointerMove}
     onPointerUp={onPointerUp}
     onPointerCancel={onPointerUp}>
     <div className="mapPanLayer" style={{transform:'translate('+pan.x+'px,'+pan.y+'px) scale('+zoom+')'}}>
      <div className="mapWorld" style={{
        aspectRatio:String(aspect),
        backgroundSize:
          minorPctX+'% '+minorPctY+'%, '+
          minorPctX+'% '+minorPctY+'%, '+
          majorPctX+'% '+majorPctY+'%, '+
          majorPctX+'% '+majorPctY+'%'
      }}>
       <div className="axis axisX" style={{top:((bounds.maxY/worldH)*100)+'%'}}></div>
       <div className="axis axisY" style={{left:((-bounds.minX/worldW)*100)+'%'}}></div>
       {vals.map((l:any)=>{
         if(l.x==null||l.y==null)return null;
         var lp=pos(l.x,l.y);
         return <div key={l.id} className={'mapPlace '+String(l.kind||'place').toLowerCase().replace(/\s+/g,'-')} style={lp} title={(l.name||l.id)+' ('+l.x+', '+l.y+')'}>
          <span className="mapPin">{kindIcon(l.kind)}</span>
          <span className="mapLabel">{l.name||l.id}</span>
         </div>
       })}
       <div className="you liveYou" style={p} title={'You: ('+px+', '+py+')'}>◆<span>YOU</span></div>
       <div className="mapCornerLabel nw">({bounds.minX}, {bounds.maxY})</div>
       <div className="mapCornerLabel se">({bounds.maxX}, {bounds.minY})</div>
      </div>
     </div>
   </div>
   <div className="mapScaleLegend">
    <span><i className="minorLine"></i> 50 mi grid</span>
    <span><i className="majorLine"></i> 250 mi grid</span>
    <span>X east/west • Y north/south</span>
   </div>
  </Card>

  <Card title={'Discovered & Mapped Locations ('+vals.length+')'}>
   {vals.length?vals.sort((a:any,b:any)=>String(a.region||'').localeCompare(String(b.region||''))||String(a.name||'').localeCompare(String(b.name||''))).map((l:any)=><div className="row" key={l.id}><span>{kindIcon(l.kind)} {l.name||l.id}<small>{l.kind?' '+l.kind:''}{l.region?' • '+l.region:''}{l.visited===false?' • known, not visited':''}</small></span><small>{l.x!=null?'('+l.x+', '+l.y+')':''}</small></div>):<Empty>No mapped discoveries yet.</Empty>}
  </Card>
 </div>
}
function Callings({v}:{v:any}){
 var calls=safeObj(v.callings), keys=Object.keys(calls);
 return <div className="screen"><Card title="Your Callings"><p className="muted">Only disciplines you have actually begun learning appear here. There is no calling limit and no active-class lockout.</p>{keys.length?keys.map(k=>{var c=calls[k]||{},p=Number(c.learningProgress||0);return <div className="callingCard"><div className="skillTop"><div><b>{c.name||titleCase(k)}</b><small>{c.status==='training'?'In Training':'Learned'} {c.specialization?'• '+c.specialization:''}</small></div><span>{c.status==='training'?p.toFixed(0)+'%':'Tier '+(c.tier||1)}</span></div>{c.status==='training'?<ProgressBar value={p}/>:null}<div className="callingMeta"><small>Origin: {c.origin||'unknown'}{c.teacher?' • Teacher: '+c.teacher:''}</small></div>{Object.keys(safeObj(c.playstyle)).length?<div className="miniCounters">{Object.entries(safeObj(c.playstyle)).slice(0,8).map(([n,x]:any)=><span>{titleCase(n)} {String(x)}</span>)}</div>:null}</div>}):<Empty>No calling has been recorded. A created character should always have one starting calling.</Empty>}</Card><Card title="Learning More"><p>Find a master, academy, temple, order, guild instructor, druidic circle, monastic school, military tradition, manual, faction initiation, quest, supernatural source, or a plausible self-developed path. The moment legitimate training begins, that calling appears here as <b>In Training</b>.</p></Card></div>
}
function Banking({v}:{v:any}){
 var ac=safeObj(v['bank-accounts']), assets=safeArr(v['financial-assets']), keys=Object.keys(ac); var total=keys.reduce((n,k)=>n+Number((ac[k]||{}).balanceCp||0),0);
 return <div className="screen"><Card title="Carried Purse"><div className="money">{money(v['player-money-cp'])}</div><p className="muted">Coin on your person. Deposited funds are not carried weight and are tracked separately.</p></Card><Card title={'Bank & Vault Accounts • '+money(total)}>{keys.length?keys.map(k=>{var a=ac[k]||{};return <div className="bankAccount"><div className="skillTop"><div><b>{a.institution||titleCase(k)}</b><small>{a.branch||''}{a.realm?' • '+a.realm:''}</small></div><span>{money(a.balanceCp||0)}</span></div><small>{a.access||''}{a.fees?' • '+a.fees:''}</small></div>}):<Empty>No account opened yet. Visit a bank, Guild vault desk, hold vault-house, caravan bank, merchant house, or other institution that actually operates where you are.</Empty>}</Card><Card title="Local Tender & Financial Instruments">{assets.length?assets.map((a:any)=><div className="item"><div><b>{a.name||'Asset'}</b><small>{a.realm||''} • {a.acceptedAt||'limited acceptance'}</small></div><span>{money((a.valueCp||0)*(a.qty||1))}</span></div>):<Empty>No non-coin tender carried.</Empty>}</Card></div>
}
function Magic({v}:{v:any}){var s=safeObj(v['known-spells']);var keys=Object.keys(s);return <div className="screen"><Card title="Known Spells">{keys.length?keys.map(k=>{var x=s[k];return <div className="item"><div><b>{x.name||titleCase(k)}</b><small>{x.school||''} {x.tier?'• '+x.tier:''} {x.manaCost!=null?'• '+x.manaCost+' MP':''}</small></div></div>}):<Empty>You do not know any spells. Find a teacher, book, school, shrine, relic or research path.</Empty>}</Card><Card title="Mana"><StatPill name="MP" cur={v['player-mana']} max={v['player-max-mana']} kind="mp"/><p className="muted">A spell that is not in Known Spells cannot be cast merely by describing it.</p></Card></div>}
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
 return <div className="screen">
  <Card title="Quest Boards Near You"><p className="muted">Current location: {here}{sub&&sub!=='Unassigned'?' • '+sub:''}. Boards are physical objects; this screen does not reveal boards in places you are not currently visiting.</p>
   {local.length?local.map(([id,b]:any)=><button type="button" className={'choiceCard '+(active===id?'selected':'')} onClick={()=>inspect(String(id),b)}><span className="choiceSigil">▣</span><span className="choiceWords"><b>{b.name}</b><em>{b.sublocation} • {titleCase(b.profile||'public')}</em><small>{b.access||'public'}{b.profile==='sovereign'?' • sovereign/high-contract authority':''}</small></span><span className="choiceMark">{active===id?'◆':'◇'}</span></button>):<Empty>There is no canonical quest board at your present settlement/site, or you are not standing in a settlement that maintains one.</Empty>}
  </Card>
  {active?<Card title={activeDef.name||'Selected Board'}>{posts.length?posts.map((x:any)=><div className={'questPost rank'+String(x.rank||'F')}><div className="questRank">{x.rank||'F'}</div><div className="questWords"><b>{x.title||x.id}</b><small>{x.issuer?'Issued by '+x.issuer:''}{x.authorization?' • '+x.authorization:''}{x.deadline?' • Due '+x.deadline:''}</small><p>{x.summary||x.objective||''}</p>{x.rank==='S'?<small>True S-rank contracts normally carry sovereign authority.</small>:null}</div><div className="questPay">{reward(x)}</div></div>):<Empty>This board has not been inspected yet, or it currently has no available postings. Select it above to inspect it in-world.</Empty>}<small>Last observed: {activeBoard.lastRefresh||activeBoard.lastObserved||'not yet inspected'}</small></Card>:null}
  <Card title="Rank & Authority"><p>F through A requests can arise from ordinary people, Guild branches, merchants, temples, nobles, cities, militaries and other institutions according to their means and the danger involved. A genuine S-rank commission is normally a matter for a kingdom's ruler or ruling sovereign body and is usually issued under seal, summons, war council, or an empowered high official. Public boards may display such a proclamation, but they rarely originate it.</p></Card>
 </div>
}
function Quests({v}:{v:any}){var q=safeArr(v['quest-log']);return <div className="screen"><Card title="Quest Log">{q.length?q.map((x:any)=><div className="item"><div><b>{x.title||x.id}</b><small>{x.rank?'Rank '+x.rank+' • ':''}{x.status||'active'}{x.deadline?' • Due '+x.deadline:''}</small></div><span>{x.reward||''}</span></div>):<Empty>No active or recorded requests.</Empty>}</Card></div>}
function Guild({v}:{v:any}){return <div className="screen"><Card title="Adventurer's Guild"><div className="heroLine"><span>{v['guild-rank']}</span><span>Rep {v['guild-reputation']>=0?'+':''}{v['guild-reputation']}</span></div><p>Rank is certification, not character level. Promotion requires record, reputation, competence and a real trial.</p></Card></div>}
function Party({v,api}:{v:any,api:any}){
 var p=safeArr(v.party), c=safeObj(v.companions), pm=safeObj(v['party-management']), gr=safeObj(v['guild-team-registry']);
 var [selected,setSelected]=React.useState('');
 var memberIds=safeArr(pm.memberIds);
 function memberId(x:any){return typeof x==='string'?x:String(x.id||x.companionId||x.name||'');}
 var physicalIds=p.map(memberId).filter(Boolean);
 var ids=memberIds.length?memberIds:physicalIds;
 var selectedId=selected||ids[0]||''; var m=selectedId?(c[selectedId]||p.find((x:any)=>memberId(x)===selectedId)||{}):{};
 function ask(text:string){if(api&&api.sendMessage)api.sendMessage(text);}
 function meter(label:string,val:any,max:any){var n=Number(val),mx=Number(max);if(!isFinite(n)||!isFinite(mx)||mx<=0)return <div className="row"><span>{label}</span><span>Unknown</span></div>;return <div className="skill"><div className="skillTop"><b>{label}</b><span>{n}/{mx}</span></div><ProgressBar value={Math.max(0,Math.min(100,n/mx*100))}/></div>}
 var attrs=safeObj(m.attributes), skills=safeObj(m.skills), tech=safeObj(m.techniques), spells=safeObj(m.knownSpells||m['known-spells']), eq=safeObj(m.equipment), inv=safeArr(m.inventory), cond=safeArr(m.conditions), inj=safeArr(m.injuries);
 return <div className="screen">
  <Card title={pm.name?pm.name:'Adventuring Party'}>
   <div className="row"><span>Leader</span><b>{pm.leader&&pm.leader!=='player'?(c[pm.leader]?.name||pm.leader):(v['player-name']||'You')}</b></div>
   <div className="row"><span>Status</span><b>{pm.formed?'Formed':'Not formally formed'}</b></div>
   <div className="row"><span>Traveling Members</span><b>{physicalIds.length}</b></div>
   {pm.lootPolicy?<div className="row"><span>Loot Policy</span><span>{titleCase(String(pm.lootPolicy).replace(/-/g,' '))}</span></div>:null}
   <div className="partyActions"><button onClick={()=>ask(pm.formed?'I want to manage my adventuring party. Show me my in-world options.':'I want to found my own adventuring party and be its leader.')}>{pm.formed?'⚙ Manage Party':'✦ Found Party'}</button><button onClick={()=>ask('I want to invite or recruit someone I know into my adventuring party. Show me plausible candidates I can actually approach here.')}>＋ Recruit</button></div>
  </Card>
  <Card title="Party Roster">
   {ids.length?ids.map((id:any)=>{var x=c[id]||p.find((z:any)=>memberId(z)===id)||{};var role=safeObj(pm.roles)[id]||x.role||'Member';return <button className={'partyMember '+(selectedId===id?'selected':'')} onClick={()=>setSelected(id)}><div><b>{x.name||titleCase(String(id))}</b><small>{role} • {x.class||x.calling||'Calling unknown'} {x.level||x.lv?'• Lv '+(x.level||x.lv):''}</small></div><span>{x.hp!=null?(x.hp+'/'+(x.maxHp||'?')+' HP'):'Inspect'}</span></button>}):<Empty>No one is traveling with you. Recruit companions through the world rather than spawning party members from the menu.</Empty>}
  </Card>
  {selectedId?<><Card title={(m.name||titleCase(selectedId))+' — Character Sheet'}>
   <div className="row"><span>Calling</span><b>{m.class||m.calling||'Unknown'}</b></div><div className="row"><span>Level / XP</span><b>{m.level||m.lv||'?'}{m.xp!=null?' • '+m.xp+' XP':''}</b></div><div className="row"><span>Guild Rank</span><b>{m.guildRank||'Unregistered/Unknown'}</b></div><div className="row"><span>Party Role</span><b>{safeObj(pm.roles)[selectedId]||m.role||'Member'}</b></div><div className="row"><span>Trust</span><b>{m.trust!=null?m.trust+'/100':'Unknown'}</b></div>
   {meter('HP',m.hp,m.maxHp)}{meter('MP',m.mana,m.maxMana)}{meter('SP',m.stamina,m.maxStamina)}
   <div className="partyActions"><button onClick={()=>ask('I want to speak with '+(m.name||selectedId)+' about their role in the party.')}>Assign Role</button><button onClick={()=>ask('I want to discuss '+(m.name||selectedId)+' leaving my adventuring party. Resolve this as an in-world conversation, not an automatic deletion.')}>Dismiss / Part Ways</button></div>
  </Card>
  <Card title="Attributes">{Object.keys(attrs).length?Object.entries(attrs).map(([k,x]:any)=><div className="row"><span>{titleCase(k)}</span><b>{String(x)}</b></div>):<Empty>These attributes are not known or recorded yet.</Empty>}</Card>
  <Card title="Skills & Techniques">{Object.keys(skills).length?Object.entries(skills).map(([k,x]:any)=><div className="row"><span>{titleCase(k)}</span><b>{typeof x==='object'?'Lv '+(x.level||'?')+(x.prog!=null?' • '+x.prog+'p':''):String(x)}</b></div>):<Empty>No recorded skills.</Empty>}{Object.keys(tech).length?Object.entries(tech).map(([k,x]:any)=><div className="row"><span>{titleCase(k)}</span><b>{typeof x==='object'?'Lv '+(x.level||'?'):String(x)}</b></div>):null}</Card>
  <Card title="Magic">{Object.keys(spells).length?Object.entries(spells).map(([k,x]:any)=><div className="row"><span>{typeof x==='object'?(x.name||titleCase(k)):titleCase(k)}</span><span>{typeof x==='object'?(x.tier||x.school||'Known'):String(x)}</span></div>):<Empty>No known spells recorded.</Empty>}</Card>
  <Card title="Equipment & Pack">{Object.keys(eq).length?Object.entries(eq).map(([k,x]:any)=><div className="row"><span>{titleCase(k)}</span><span>{x?(typeof x==='string'?x:(x.name||'Equipped')):'Empty'}</span></div>):<Empty>No equipment record available.</Empty>}{inv.length?<div className="note">Pack: {inv.map((x:any)=>typeof x==='string'?x:(x.name||x.id)).join(', ')}</div>:null}</Card>
  <Card title="Conditions">{inj.length||cond.length?<>{inj.map((x:any)=><div className="item"><b>{typeof x==='string'?x:(x.name||'Injury')}</b></div>)}{cond.map((x:any)=><div className="item"><b>{typeof x==='string'?x:(x.name||'Condition')}</b></div>)}</>:<Empty>No recorded injuries or conditions.</Empty>}</Card></>:null}
  <Card title="Guild Team Registry"><div className="row"><span>Registration</span><b>{gr.registered?'Registered':'Not registered'}</b></div>{gr.registered?<><div className="row"><span>Team</span><b>{gr.name||gr.teamId||'Registered Team'}</b></div><div className="row"><span>Standing</span><b>{gr.standing||'New / Unproven'}</b></div><div className="row"><span>Requests</span><span>{Number(gr.completed||0)} completed • {Number(gr.failed||0)} failed • {Number(gr.active||0)} active</span></div><div className="row"><span>Highest Cleared</span><b>{gr.highestCleared||'None'}</b></div>{gr.rosterOutOfDate?<div className="note">Official Guild roster is OUT OF DATE. Update it at an appropriate Guild office.</div>:null}</>:<div className="note">Your traveling party and an official Guild Team are separate. Registering requires an in-world Guild service.</div>}<div className="partyActions"><button onClick={()=>ask(gr.registered?'I want to update or manage my official Guild Team registration.':'I want to register my adventuring party as an official Guild Team. Tell me what I need to do at my current location.')}>{gr.registered?'Update Guild Roster':'Register Guild Team'}</button></div></Card>
 </div>
}
function Training({v}:{v:any}){var t=safeObj(v['training-state']),p=safeObj(v['development-projects']);return <div className="screen"><Card title="Current Training">{Object.keys(t).length?Object.entries(t).map(([k,x]:any)=><div className="item"><div><b>{x.name||titleCase(k)}</b><small>{x.teacher?'Teacher: '+x.teacher+' • ':''}{x.hours||0}h recorded</small></div></div>):<Empty>No active training session. Find a real trainer or begin focused practice.</Empty>}</Card><Card title="Development Projects">{Object.keys(p).length?Object.entries(p).map(([k,x]:any)=><div className="skill"><div className="skillTop"><b>{x.name||titleCase(k)}</b><span>{Number(x.progress||0).toFixed(0)}%</span></div><ProgressBar value={Number(x.progress||0)}/><small>{x.stability?'Stability: '+x.stability:''}</small></div>):<Empty>No technique, spell or recipe development projects.</Empty>}</Card></div>}
function Factions({v}:{v:any}){var f=safeObj(v.factions);return <div className="screen"><Card title="Faction Standing">{Object.entries(f).map(([k,x]:any)=><div className="row"><span>{titleCase(k)}</span><b>{Number(x)>=0?'+':''}{String(x)}</b></div>)}</Card></div>}
function Crafting({v}:{v:any}){
 var c=safeObj(v.codex), recipes=safeArr(c.recipes), mats=safeObj(v['material-knowledge']), projects=safeArr(v['crafting-projects']), alloys=safeObj(v['alloy-discoveries']), notes=safeArr(v['crafting-notes']), artisans=safeObj(v['artisan-knowledge']), facilities=safeObj(v['crafting-facility-state']);
 const [tab,setTab]=React.useState('materials');
 var tabs=[['materials','Materials'],['recipes','Recipes'],['projects','Projects'],['artisans','Artisans'],['journal','Research']];
 return <div className="screen"><Card title="Material Science & Crafting"><div className="craftTabs">{tabs.map((x:any)=><button className={tab===x[0]?'active':''} onClick={()=>setTab(x[0])}>{x[1]}</button>)}</div><p className="muted">Materials have properties, forms and compatibility. Exotic does not automatically mean stronger; design and craftsmanship decide how a material is used.</p></Card>
 {tab==='materials'?<><Card title="Known Materials">{Object.keys(mats).length?Object.entries(mats).map(([k,x]:any)=><div className="materialCard"><div><b>{x.name||titleCase(k)}</b><small>{x.form?'Known form: '+x.form:''}{x.grade?' • '+x.grade:''}{x.source?' • learned from '+x.source:''}</small></div><div className="traitRow">{safeArr(x.knownTraits||x.traits).map((t:any)=><span>{typeof t==='string'?t:(t.name||String(t))}</span>)}</div>{x.notes?<p>{x.notes}</p>:null}</div>):<Empty>You have not recorded any assayed or studied material properties yet. Ordinary materials can still be recognized through normal background knowledge.</Empty>}</Card><Card title="Discovered Alloys & Composites">{Object.keys(alloys).length?Object.entries(alloys).map(([k,x]:any)=><div className="item"><div><b>{x.name||titleCase(k)}</b><small>{x.formula||x.ratio||''}</small></div><span>{x.quality||x.status||''}</span></div>):<Empty>No original alloy or composite formulas discovered yet.</Empty>}</Card></>:null}
 {tab==='recipes'?<Card title="Known Recipes & Procedures">{recipes.length?recipes.map((x:any)=><div className="item"><div><b>{typeof x==='string'?x:x.name}</b>{typeof x==='object'?<small>{x.skill||''}{x.facility?' • '+x.facility:''}</small>:null}</div></div>):<Empty>No formal recipes recorded in your codex yet. You may still experiment with plausible materials.</Empty>}</Card>:null}
 {tab==='projects'?<><Card title="Active Crafting / Experiments">{projects.length?projects.map((x:any,i:number)=><div className="materialCard"><div className="row"><b>{x.name||x.goal||'Project '+(i+1)}</b><span>{x.status||'active'}</span></div><small>{x.progress!=null?'Progress '+x.progress+'%':''}{x.facility?' • '+x.facility:''}{x.elapsed?' • '+x.elapsed:''}</small>{safeArr(x.materials).length?<p className="muted">Materials: {safeArr(x.materials).map((m:any)=>typeof m==='string'?m:(m.name||m.id)).join(', ')}</p>:null}</div>):<Empty>No active crafting or research projects.</Empty>}</Card><Card title="Facilities Known">{Object.keys(facilities).length?Object.entries(facilities).map(([k,x]:any)=><div className="item"><div><b>{x.name||titleCase(k)}</b><small>{x.location||''}{x.tier?' • '+x.tier:''}</small></div></div>):<Empty>No special workshop/facility records yet.</Empty>}</Card></>:null}
 {tab==='artisans'?<Card title="Known Artisans"><p className="muted">Only people your character has met or credibly heard about appear here. A village smith is not automatically capable of exotic metallurgy.</p>{Object.keys(artisans).length?Object.entries(artisans).map(([k,x]:any)=><div className="materialCard"><div className="row"><b>{x.name||titleCase(k)}</b><span>{x.status||''}</span></div><small>{x.location||''}</small><div className="traitRow">{safeArr(x.specialties||x.capabilities).map((t:any)=><span>{typeof t==='string'?t:(t.name||String(t))}</span>)}</div>{x.access?<p className="muted">Access: {x.access}</p>:null}</div>):<Empty>You have not learned enough about any specialist artisan yet. Ask guilds, merchants, smiths or locals for referrals.</Empty>}</Card>:null}
 {tab==='journal'?<><Card title="Experimental Journal">{notes.length?notes.map((x:any,i:number)=><div className="materialCard"><b>{x.title||x.subject||'Note '+(i+1)}</b><p>{x.text||x.observation||x.notes||String(x)}</p><small>{x.date||''}</small></div>):<Empty>No experimental notes yet. Failed tests can still teach properties and procedures.</Empty>}</Card><Card title="Core Rule"><p>Known recipe = predictable procedure. Unknown combination = experiment, not an automatic rejection. The GM derives the result from material traits, process, facility and your skills, and records what you learn.</p></Card></>:null}
 </div>
}
function Markets({v}:{v:any}){
 var known=safeObj(v['price-knowledge']), state=safeObj(v['market-state']); var keys=Object.keys(known);
 return <div className="screen"><Card title="Known Market Prices"><p className="muted">Only prices you have personally observed or learned from a report appear here. Market information becomes stale as caravans, seasons, shortages and demand change.</p>{keys.length?keys.map(k=>{var x=known[k]||{};return <div className="item"><div><b>{x.name||titleCase(k)}</b><small>{x.location||''}{x.observedDate?' • observed '+x.observedDate:''}{x.source?' • '+x.source:''}</small></div><span>{x.buyCp!=null?'Buy '+money(x.buyCp):x.sellCp!=null?'Sell '+money(x.sellCp):''}</span></div>}):<Empty>No reliable market observations yet. Visit shops, markets, guild boards or ask traders about prices.</Empty>}</Card><Card title="Local Market Conditions"><p className="muted">Visible conditions are limited to the current settlement and facts your character could reasonably know. Shortages and gluts are persistent world conditions, not random discounts.</p>{Object.keys(state).length?<div className="note">The world economy is active. Exact unseen market records remain hidden until discovered in play.</div>:<Empty>No unusual local shortage or surplus has been recorded yet.</Empty>}</Card></div>
}
function Shops({v}:{v:any}){var m=safeObj(v['merchant-state']);return <div className="screen"><Card title="Known Merchants">{Object.keys(m).length?Object.entries(m).map(([k,x]:any)=><div className="item"><div><b>{x.name||titleCase(k)}</b><small>{x.specialization||''}{x.cashCp!=null?' • Cash '+money(x.cashCp):''}</small></div></div>):<Empty>Merchant inventories appear after you meet or enter a tracked shop.</Empty>}</Card></div>}
function Conditions({v}:{v:any}){var c=safeArr(v.conditions),i=safeArr(v.injuries);return <div className="screen"><Card title="Conditions">{c.length?c.map((x:any)=><div className="item"><b>{typeof x==='string'?x:x.name}</b></div>):<Empty>No active conditions.</Empty>}</Card><Card title="Injuries">{i.length?i.map((x:any)=><div className="item"><div><b>{x.name||x.type||'Injury'}</b><small>{x.severity||''} {x.penalty?'• '+x.penalty:''}</small></div></div>):<Empty>No recorded injuries.</Empty>}</Card></div>}
function Journal({v,api}:{v:any,api:any}){var j=safeArr(v['player-notes']);const [txt,setTxt]=React.useState('');function add(){if(!txt.trim())return;api.setVariable('player-notes',[...j,{text:txt.trim(),created:v['world-date']+' '+v['world-time']}]);setTxt('');}return <div className="screen"><Card title="Personal Journal">{j.length?j.map((x:any,i:number)=><div className="item"><div><b>{x.text||String(x)}</b><small>{x.created||''}</small></div></div>):<Empty>No personal objectives or notes.</Empty>}<div className="journalAdd"><input value={txt} onChange={(e:any)=>setTxt(e.target.value)} placeholder="Add an objective or note…"/><button onClick={add}>Add</button></div></Card></div>}
function Codex({v}:{v:any}){var c=safeObj(v.codex);return <div className="screen"><Card title="Titles">{safeArr(c.titles).length?safeArr(c.titles).map((x:any)=><div className="item"><b>{typeof x==='string'?x:x.name}</b></div>):<Empty>No titles earned.</Empty>}</Card><Card title="Bestiary Discoveries"><p>{safeArr(c.bestiary).length} entries discovered</p></Card><Card title="Lore"><p>{safeArr(c.lore).length} entries recorded</p></Card></div>}

function LivingEvents({v}:{v:any}){
 var a=safeArr(v['living-quest-events']), w=safeArr(v['world-events']);
 return <div className="screen"><Card title="World Events"><p className="muted">Events you have actually learned about. Hidden events remain hidden.</p>{[...a,...w].length?[...a,...w].map((x:any,i:number)=><div className="listRow" key={x.id||i}><div><b>{x.title||x.name||x.type||'Developing Event'}</b><small>{x.location||x.region||x.date||''}</small></div><span>{x.status||x.stage||''}</span></div>):<Empty>No major world events are currently known to you.</Empty>}</Card></div>
}
function PoliticsScreen({v}:{v:any}){
 var d=safeObj(v['diplomacy-state']), wars=safeArr(v['active-wars']), ts=safeArr(v['treaties']);
 return <div className="screen"><Card title="Politics & Diplomacy"><p className="muted">Your known political picture; private negotiations are not shown until learned.</p>{Object.keys(d).length?Object.keys(d).map((r:string)=><div className="listRow" key={r}><div><b>{r}</b><small>{Object.entries(safeObj(d[r])).map(([k,val])=>k+': '+String(val)).join(' • ')}</small></div></div>):<Empty>No diplomatic information recorded.</Empty>}</Card><Card title="Known Wars">{wars.length?wars.map((x:any,i:number)=><div className="listRow" key={x.id||i}><b>{x.name||'Conflict'}</b><span>{x.status||''}</span></div>):<Empty>No known active wars.</Empty>}</Card><Card title="Known Treaties">{ts.length?ts.map((x:any,i:number)=><div className="listRow" key={x.id||i}><b>{x.name||'Treaty'}</b><span>{x.status||'in force'}</span></div>):<Empty>No treaty details learned yet.</Empty>}</Card></div>
}
function FaithsScreen({v}:{v:any}){
 var s=safeObj(v['religion-state']);
 return <div className="screen"><Card title="Faiths & Religious Affairs"><p className="muted">Councils, festivals, disputes and religious developments you know about.</p>{Object.keys(s).length?Object.keys(s).map((k:string)=><div className="listRow" key={k}><div><b>{k}</b><small>{typeof s[k]==='string'?s[k]:JSON.stringify(s[k])}</small></div></div>):<Empty>No current religious affairs recorded in your knowledge.</Empty>}</Card></div>
}
function NewsScreen({v}:{v:any}){
 var news=safeArr(v['news-network']).filter((x:any)=>x.playerKnown!==false), rumors=safeArr(v['rumor-network']).filter((x:any)=>x.playerHeard!==false), priv=safeArr(v['private-conversations-heard']);
 return <div className="screen"><Card title="News"><>{news.length?news.map((x:any,i:number)=><div className="listRow" key={x.id||i}><div><b>{x.headline||x.title||x.subject||'Report'}</b><small>{x.source||''}{x.date?' • '+x.date:''}</small></div></div>):<Empty>No news reports recorded.</Empty>}</></Card><Card title="Rumors">{rumors.length?rumors.map((x:any,i:number)=><div className="listRow" key={x.id||i}><div><b>{x.subject||x.title||'Rumor'}</b><small>{x.currentWording||x.text||''}</small></div><span>{x.credibility!=null?x.credibility+'%':''}</span></div>):<Empty>No rumors recorded.</Empty>}</Card><Card title="Things Overheard">{priv.length?priv.map((x:any,i:number)=><div className="listRow" key={x.id||i}><div><b>{x.place||'Conversation'}</b><small>{x.text||x.summary||''}</small></div><span>{x.date||''}</span></div>):<Empty>Nothing noteworthy overheard yet.</Empty>}</Card></div>
}
function Chronicle({v}:{v:any}){
 var h=safeObj(v['historical-knowledge']);
 return <div className="screen"><Card title="Chronicle"><p className="muted">History your character has actually learned from people, monuments, books and records.</p>{Object.keys(h).length?Object.keys(h).map((k:string)=><div className="listRow" key={k}><div><b>{k}</b><small>{typeof h[k]==='string'?h[k]:(h[k].summary||h[k].text||JSON.stringify(h[k]))}</small></div><span>{h[k]&&h[k].confidence!=null?h[k].confidence+'%':''}</span></div>):<Empty>Your chronicle is still mostly blank.</Empty>}</Card></div>
}


function ToggleRow({title,detail,on,value}:{title:string,detail:string,on:any,value:boolean}){
 return <div className="audioRow"><div><b>{title}</b><small>{detail}</small></div><button type="button" className={'audioToggle '+(value?'on':'off')} onClick={()=>on(!value)} aria-pressed={value}><span>{value?'ON':'OFF'}</span></button></div>
}
function AudioSettings({prefs,onChange}:{prefs:any,onChange:any}){
 return <div className="screen audioScreen">
   <Card title="Audio Mixer">
     <p className="muted">Each layer is independent. You can keep Eldoria’s peaceful melodies while turning off voices or all environmental noise.</p>
     <ToggleRow title="Music" detail="Location, exploration, tavern, city and regional melodies." value={!!prefs.music} on={(x:any)=>onChange('music',x)}/>
     <ToggleRow title="Combat Music" detail="Switch to battle music when combat begins. Turn this off to keep the location melody instead." value={!!prefs.combat} on={(x:any)=>onChange('combat',x)}/>
     <ToggleRow title="Atmosphere" detail="Weather, forests, waves, fireplaces, ruins and environmental room tone." value={!!prefs.ambience} on={(x:any)=>onChange('ambience',x)}/>
     <ToggleRow title="Voices & Crowds" detail="Natural low-volume chatter in taverns, Guild halls and busy markets. Off by default." value={!!prefs.voices} on={(x:any)=>onChange('voices',x)}/>
     <ToggleRow title="Event Sounds" detail="Quest, level-up, spell, victory, weapon and other short sound effects." value={!!prefs.sfx} on={(x:any)=>onChange('sfx',x)}/>
   </Card>
   <Card title="Mixing Notes"><p className="muted">Voices are deliberately much quieter than music. Tavern and Guild chatter now use real public-domain room recordings instead of the old shouting-crowd loop.</p></Card>
 </div>
}

function More({setScreen}:{setScreen:any}){return <div className="screen"><Card title="Systems"><div className="moreGrid">{MORE.map(x=><button onClick={()=>setScreen(x[0])}><b>{x[1]}</b></button>)}</div></Card></div>}

var SCREEN_META:any={
 adventure:['⚔','The Chronicle','Your living adventure'],
 character:['♜','Character Ledger','Body, attributes and standing'],
 skills:['✦','Book of Mastery','Skills earned through practice'],
 inventory:['⛨','Arsenal & Pack','Equipment, burdens and possessions'],
 world:['⌖','Cartographer’s Table','The world as you have learned it'],
 callings:['✧','Hall of Callings','Disciplines you have begun to master'],
 banking:['◈','Vault Ledger','Coin, credit and regional accounts'],
 magic:['✺','Grimoire','Known spells and arcane mastery'],
 boards:['☷','Notice Boards','Work posted where you actually stand'],
 events:['☄','World Events','Known happenings beyond your path'],
 politics:['♛','Courts & Crowns','Known diplomacy, rulers and treaties'],
 faiths:['☀','Faith & Rite','Religious life and sacred affairs'],
 news:['✉','Whispers & Tidings','News, rumors and things overheard'],
 chronicle:['❦','Chronicle','History your character has learned'],
 quests:['⚑','Quest Ledger','Accepted obligations and undertakings'],
 guild:['⚜','Guild Record','Rank, standing and registered company'],
 party:['♟','Company','Those traveling beside you'],
 training:['⚒','Training Hall','Teachers, practice and development'],
 factions:['⚖','Factions','Reputation, loyalties and rivalries'],
 crafting:['⚒','Workshop','Recipes, materials and workmanship'],
 markets:['◉','Market Ledger','Observed prices and trade knowledge'],
 shops:['♢','Merchants','Known inventories and local sellers'],
 conditions:['✚','Wounds & Conditions','Injuries, ailments and effects'],
 journal:['✎','Field Journal','Your own notes and objectives'],
 codex:['⌘','Codex','Knowledge gathered across Eldoria'],
 audio:['♫','Sound Chamber','Choose which parts of Eldoria you hear'],
 more:['✥','Eldoria Ledger','Choose another record']
};

function App(){
 var api=useYumina(); var v=api.variables||{}; const [screen,setScreen]=React.useState('adventure'); const [tsOpen,setTsOpen]=React.useState(false);
 const [audioPrefs,setAudioPrefs]=React.useState<any>({music:true,combat:true,ambience:true,voices:false,sfx:true});
 const [audioPrefsReady,setAudioPrefsReady]=React.useState(false);
 const audioPrefsRef=React.useRef<any>(audioPrefs);
 React.useEffect(()=>{audioPrefsRef.current=audioPrefs;},[audioPrefs]);
 React.useEffect(()=>{
   var alive=true;
   try{
     var request=api.storage&&api.storage.get?api.storage.get('eldoria-audio-prefs-v2'):null;
     Promise.resolve(request).then((raw:any)=>{
       if(!alive)return;
       var next:any={music:true,combat:true,ambience:true,voices:false,sfx:true};
       if(raw){try{var saved=JSON.parse(raw);next={...next,...saved};}catch(_e){}}
       setAudioPrefs(next); audioPrefsRef.current=next; setAudioPrefsReady(true);
       if(v['audio-combat-music-enabled']!==!!next.combat)api.setVariable('audio-combat-music-enabled',!!next.combat);
       try{api.setAudioVolume?.('bgm',next.music?0.50:0);}catch(_e){}
       try{api.setAudioVolume?.('sfx',next.sfx?0.68:0);}catch(_e){}
     }).catch(()=>setAudioPrefsReady(true));
   }catch(_e){setAudioPrefsReady(true);}
   return ()=>{alive=false;};
 },[]);
 function changeAudioPref(key:string,value:boolean){
   var next:any={...audioPrefsRef.current,[key]:!!value}; audioPrefsRef.current=next; setAudioPrefs(next);
   try{api.storage?.set?.('eldoria-audio-prefs-v2',JSON.stringify(next));}catch(_e){}
   if(key==='music'){try{api.setAudioVolume?.('bgm',value?0.50:0);}catch(_e){}}
   if(key==='sfx'){try{api.setAudioVolume?.('sfx',value?0.68:0);}catch(_e){}}
   if(key==='combat' && v['audio-combat-music-enabled']!==!!value)api.setVariable('audio-combat-music-enabled',!!value);
 }


 // Adaptive ambience controller. This runs entirely in the UI, so location/weather sound does not consume AI context.
 const eldoriaActiveAmbient=React.useRef<any>({});
 React.useEffect(()=>{
   var loc=(String(v['current-location']||'')+' '+String(v['current-sublocation']||'')).toLowerCase();
   var region=String(v['current-region']||'').toLowerCase();
   var weather=String(v.weather||'').toLowerCase();
   var desired:any={};
   if(audioPrefsReady && audioPrefs.ambience){
     // Warm interiors keep their physical room sound even when Voices & Crowds is off.
     if(/tavern|inn|taproom|alehouse|public house/.test(loc)) desired['ambient-fireplace']=0.050;
     // Voices are a separate optional layer. They are OFF by default.
     if(audioPrefs.voices){
       if(/tavern|inn|taproom|alehouse|public house/.test(loc)) desired['ambient-tavern-chatter']=0.032;
       else if(/guild/.test(loc)) desired['ambient-guild-chatter']=0.024;
       else if(/market|bazaar|souk/.test(loc)) desired['ambient-guild-chatter']=0.020;
     }
     if((/forest|grove|wood|wilds/.test(loc)||region.indexOf('sylvanor')>=0) && region.indexOf('umbral')<0) desired['ambient-forest-birds']=0.16;
     if(/rain|storm|thunder/.test(weather)) desired['ambient-rain-storm']=0.15;
     if(/port|harbor|dock|quay|ship|coast|sea|beach|pier/.test(loc)||region.indexOf('velkar')>=0) desired['ambient-sea-waves']=0.15;
     if(region.indexOf('umbral')>=0 || /cursed|ashen|necropolis|haunted/.test(loc)) desired['ambient-umbral-horror']=0.10;
     if(/tomb|crypt|barrow|catacomb/.test(loc)) desired['ambient-tomb-dread']=0.11;
   }
   var active=eldoriaActiveAmbient.current||{};
   Object.keys(active).forEach((id)=>{ if(desired[id]==null){ try{api.stopAudio?.(id,1.2);}catch(e){} delete active[id]; } });
   Object.keys(desired).forEach((id)=>{
     if(active[id]==null){ try{api.playAudio?.(id,{volume:desired[id],fadeDuration:1.5,loop:true});}catch(e){} active[id]=desired[id]; }
     else if(active[id]!==desired[id]){ try{api.playAudio?.(id,{volume:desired[id],fadeDuration:0.4,loop:true});}catch(e){} active[id]=desired[id]; }
   });
   eldoriaActiveAmbient.current=active;
 },[audioPrefsReady,audioPrefs.ambience,audioPrefs.voices,v['current-location'],v['current-sublocation'],v['current-region'],v.weather]);

 // Smithies feel occupied: play a real five-strike hammer-on-anvil burst, then leave a short working pause before the next burst.
 React.useEffect(()=>{
   var loc=(String(v['current-location']||'')+' '+String(v['current-sublocation']||'')).toLowerCase();
   var active=audioPrefsReady && audioPrefs.ambience && /forge|smithy|blacksmith|anvil row|armorer|armourer/.test(loc);
   if(!active)return;
   var cancelled=false; var timer:any=null;
   function hammerBurst(){
     if(cancelled)return;
     try{api.playAudio?.('sfx-blacksmith-hammer',{volume:0.28,loop:false});}catch(e){}
     // The source clip already contains five distinct metal-on-metal anvil strikes.
     // Repeat in natural work bursts instead of isolated "ping" sounds.
     timer=setTimeout(hammerBurst,3600+Math.floor(Math.random()*4200));
   }
   timer=setTimeout(hammerBurst,650+Math.floor(Math.random()*950));
   return ()=>{cancelled=true;if(timer)clearTimeout(timer);try{api.stopAudio?.('sfx-blacksmith-hammer',{fadeDuration:0.15});}catch(e){}};
 },[audioPrefsReady,audioPrefs.ambience,v['current-location'],v['current-sublocation']]);

 // Deterministic normalizer: XP->level, skill/technique rollover, moon phase. It only writes when correction is needed.
 React.useEffect(()=>{
   var xp=Math.max(0,Number(v['player-xp'])||0), calc=levelFromXp(xp); if(Number(v['player-level'])!==calc) api.setVariable('player-level',calc);
   // Advancement points: exactly one per character level, banked and stacking until
   // the player spends them. 'granted' is a high-water mark so points are never
   // double-issued, and characters already mid-run get credited for levels earned
   // before this system existed. Levels are never taken back, so this only grows.
   var grantedThrough=Math.max(0,Number(v['attribute-points-granted'])||0);
   if(calc>grantedThrough){
     var owed=calc-grantedThrough;
     api.setVariable('attribute-points',Math.max(0,Number(v['attribute-points'])||0)+owed);
     api.setVariable('attribute-points-granted',calc);
   }
   var attrsHP=safeObj(v.attributes), endMod=Math.floor(((Number(attrsHP.endurance)||10)-10)/2), arcMod=Math.floor(((Number(attrsHP.arcana)||10)-10)/2);
   var targetMaxHp=20+(calc-1)*(6+endMod*2), targetMaxMana=10+(calc-1)*(4+arcMod*2), targetMaxStam=20+(calc-1)*(6+endMod*2);
   if(Number(v['player-max-hp'])!==targetMaxHp){ var dHp=targetMaxHp-(Number(v['player-max-hp'])||20); api.setVariable('player-max-hp',targetMaxHp); if(dHp>0)api.setVariable('player-hp',Math.min(targetMaxHp,(Number(v['player-hp'])||0)+dHp)); }
   if(Number(v['player-max-mana'])!==targetMaxMana){ var dMp=targetMaxMana-(Number(v['player-max-mana'])||10); api.setVariable('player-max-mana',targetMaxMana); if(dMp>0)api.setVariable('player-mana',Math.min(targetMaxMana,(Number(v['player-mana'])||0)+dMp)); }
   if(Number(v['player-max-stamina'])!==targetMaxStam){ var dSp=targetMaxStam-(Number(v['player-max-stamina'])||20); api.setVariable('player-max-stamina',targetMaxStam); if(dSp>0)api.setVariable('player-stamina',Math.min(targetMaxStam,(Number(v['player-stamina'])||0)+dSp)); }
   ['skills','techniques'].forEach((id)=>{var original=safeObj(v[id]), changed=false, next:any={...original}; Object.keys(next).forEach(k=>{var s={...next[k]},lv=Math.max(1,Number(s.level)||1),pr=Math.max(0,Number(s.prog)||0),guard=0; while(pr>=skillNeed(lv)&&guard++<1000){pr-=skillNeed(lv);lv++;changed=true;} if(s.level!==lv||s.prog!==pr){s.level=lv;s.prog=pr;next[k]=s;changed=true;}}); if(changed)api.setVariable(id,next);});
   var canonicalDate=formatEldoriaDate(v['world-date']); if(canonicalDate && v['world-date']!==canonicalDate)api.setVariable('world-date',canonicalDate);
   var m=moonFromDate(canonicalDate||v['world-date']); if(v['moon-phase']!==m)api.setVariable('moon-phase',m);
   var loc=String(v['current-location']||''); var embedded=embeddedSublocation(loc); if(embedded){ if(!v['current-sublocation']||v['current-sublocation']==='Unassigned')api.setVariable('current-sublocation',embedded); api.setVariable('current-location',canonicalSettlement(loc)); }
   var invW=safeArr(v.inventory), eqW=safeObj(v.equipment), strW=Number(safeObj(v.attributes).strength)||10;
   var totalWt=invW.reduce((n:number,it:any)=>n+(Number(it.weight)||0)*(Number(it.qty)||1),0);
   var packBonus=0; if(eqW.pack){ var packItem=invW.find((x:any)=>x.id===eqW.pack); packBonus=Number(packItem&&packItem.capacityBonus)||20; }
   var thUnb=strW*4+packBonus, thLoad=strW*8+packBonus, thEnc=strW*12+packBonus, thHeavy=strW*16+packBonus;
   var newEnc=totalWt<=thUnb?'Unburdened':totalWt<=thLoad?'Loaded':totalWt<=thEnc?'Encumbered':totalWt<=thHeavy?'Heavily Encumbered':'Overloaded';
   if(v.encumbrance!==newEnc)api.setVariable('encumbrance',newEnc);
 },[v['player-xp'],v.skills,v.techniques,v['world-date'],v['current-location'],v['current-sublocation'],v.inventory,v.equipment,v.attributes,v['player-max-hp'],v['player-max-mana'],v['player-max-stamina'],v['player-level'],v['attribute-points-granted']]);

 // Mobile keyboard/editor guard. Yumina's MessageList owns message editing; keep its active editor inside the visible viewport.
 React.useEffect(()=>{
   function applyVisualViewport(){
     try{
       var vv=(window as any).visualViewport; var h=vv?vv.height:window.innerHeight;
       document.documentElement.style.setProperty('--eldoria-visible-height',Math.max(320,Math.round(h))+'px');
     }catch(_e){}
   }
   function isMobile(){ try{return window.matchMedia('(max-width: 900px)').matches;}catch(_e){return true;} }
   function focusIn(ev:any){
     applyVisualViewport(); if(!isMobile())return; var t=ev&&ev.target; if(!t)return;
     var inMessages=t.closest&&t.closest('.messages');
     if(inMessages){
       document.documentElement.classList.add('eldoria-message-editing');
       setTimeout(function(){try{t.scrollIntoView({block:'center',inline:'nearest',behavior:'smooth'});}catch(_e){}},120);
       setTimeout(function(){try{t.scrollIntoView({block:'center',inline:'nearest'});}catch(_e){}},360);
     }
   }
   function focusOut(){
     setTimeout(function(){
       try{var a=document.activeElement as any; if(!(a&&a.closest&&a.closest('.messages')))document.documentElement.classList.remove('eldoria-message-editing');}catch(_e){}
     },80);
   }
   applyVisualViewport();
   var vv=(window as any).visualViewport;
   if(vv){vv.addEventListener('resize',applyVisualViewport);vv.addEventListener('scroll',applyVisualViewport);}
   window.addEventListener('resize',applyVisualViewport); document.addEventListener('focusin',focusIn); document.addEventListener('focusout',focusOut);
   return function(){if(vv){vv.removeEventListener('resize',applyVisualViewport);vv.removeEventListener('scroll',applyVisualViewport);}window.removeEventListener('resize',applyVisualViewport);document.removeEventListener('focusin',focusIn);document.removeEventListener('focusout',focusOut);document.documentElement.classList.remove('eldoria-message-editing');};
 },[]);

 // MessageList owns its own scroll position. Do not repeatedly force scrollTop on mobile:
 // iOS/WebKit can interpret that as a competing scroll gesture and leave the story pane apparently frozen.
 React.useEffect(()=>{
   if(screen!=='adventure')return;
   var el=document.querySelector('.messages') as any;
   if(!el)return;
   try{el.style.webkitOverflowScrolling='touch';el.style.touchAction='pan-y';}catch(_e){}
 },[screen]);
 if(!v['character-created']) return <><style>{CSS}</style><Creator api={api}/></>;
 var body:any=null;
 if(screen==='adventure')body=<Adventure api={api} v={v}/>; else if(screen==='character')body=<Character api={api} v={v}/>; else if(screen==='skills')body=<Skills v={v}/>; else if(screen==='inventory')body=<Inventory api={api} v={v}/>; else if(screen==='world')body=<World v={v}/>; else if(screen==='more')body=<More setScreen={setScreen}/>; else if(screen==='callings')body=<Callings v={v}/>; else if(screen==='banking')body=<Banking v={v}/>; else if(screen==='magic')body=<Magic v={v}/>; else if(screen==='boards')body=<QuestBoards v={v} api={api}/>; else if(screen==='events')body=<LivingEvents v={v}/>; else if(screen==='politics')body=<PoliticsScreen v={v}/>; else if(screen==='faiths')body=<FaithsScreen v={v}/>; else if(screen==='news')body=<NewsScreen v={v}/>; else if(screen==='chronicle')body=<Chronicle v={v}/>; else if(screen==='quests')body=<Quests v={v}/>; else if(screen==='guild')body=<Guild v={v}/>; else if(screen==='party')body=<Party v={v} api={api}/>; else if(screen==='training')body=<Training v={v}/>; else if(screen==='factions')body=<Factions v={v}/>; else if(screen==='crafting')body=<Crafting v={v}/>; else if(screen==='markets')body=<Markets v={v}/>; else if(screen==='shops')body=<Shops v={v}/>; else if(screen==='conditions')body=<Conditions v={v}/>; else if(screen==='journal')body=<Journal v={v} api={api}/>; else if(screen==='codex')body=<Codex v={v}/>; else if(screen==='audio')body=<AudioSettings prefs={audioPrefs} onChange={changeAudioPref}/>;
 var meta=SCREEN_META[screen]||['✦',titleCase(screen),''];
 return <><style>{CSS}</style><div className={'app screenTheme theme-'+screen}><header className="top"><button className="brand" onClick={()=>setScreen('adventure')}><span className="brandRune">✦</span> ELDORIA <span className="brandRune">✦</span></button><div className="topActions"><button className="syncButton" title="Synchronize world state" onClick={()=>api.sendMessage('[sync]')}>↻ <span>SYNC</span></button>{v['character-created']?<div className="tsWrap"><button className="syncButton" title={v['in-combat']?'Unavailable during combat':'Skip ahead in time'} disabled={!!v['in-combat']} onClick={()=>setTsOpen(!tsOpen)}>⏩ <span>ADVANCE</span></button>{tsOpen?<div className="tsMenu"><button className="medievalButton itemBtn" onClick={()=>{api.sendMessage('[timeskip: 1 week]');setTsOpen(false)}}>1 Week</button><button className="medievalButton itemBtn" onClick={()=>{api.sendMessage('[timeskip: 1 month]');setTsOpen(false)}}>1 Month</button><button className="medievalButton itemBtn" onClick={()=>{api.sendMessage('[timeskip: 1 year]');setTsOpen(false)}}>1 Year</button></div>:null}</div>:null}<div className="rankSeal"><small>ADVENTURER</small><b>Lv {v['player-level']}</b><span>{v['guild-rank']}</span></div></div></header><main><div className="screenBanner"><span className="bannerSigil">{meta[0]}</span><div><b>{meta[1]}</b><small>{meta[2]}</small></div><span className="bannerFlourish">❧</span></div><div className="screenBody">{body}</div></main><div className="composer"><div className="composerRune">✦ SPEAK / ACT ✦</div><MessageInput /></div><nav>{NAV.map(x=><button key={x[0]} className={screen===x[0]?'active':''} onClick={()=>setScreen(x[0])}><span className="navIcon">{x[1]}</span><span>{x[2]}</span>{x[0]==='character'&&Number(v['attribute-points'])>0?<span className="navBadge">{Number(v['attribute-points'])}</span>:null}</button>)}</nav></div></>;
}

var CSS=`
*{box-sizing:border-box}
html,body,#root{margin:0;height:100%;height:100dvh;overflow:hidden;background:#08090b;color:#eee4d0;font-family:"Cormorant Garamond","Palatino Linotype","Book Antiqua",Palatino,Georgia,serif}
button,input,textarea{font-family:inherit}button{letter-spacing:.035em}input,textarea{font-size:16px}
.top,.cardTitle,.steps,.heroLine,.moreGrid button,nav button,.sectionRune,.choiceCard b,.screenBanner,.rankSeal{font-family:"Cinzel","Copperplate","Palatino Linotype",Georgia,serif}
.screen,.messages,.note,.empty,.row,.item,.skill,.formGrid{font-family:"Cormorant Garamond","Palatino Linotype","Book Antiqua",Palatino,Georgia,serif}

.app{--ink:#0b0d11;--panel:#15171d;--panel2:#0d0f14;--metal:#788394;--metal2:#c4ced8;--accent:#6d88a8;--glow:#89b8dc;--rune:#a9d7f0;--paper:#e9e0cd;--muted:#a8a395;height:var(--eldoria-visible-height,100dvh);max-height:var(--eldoria-visible-height,100dvh);display:grid;grid-template-rows:58px 1fr auto 66px;background:radial-gradient(circle at 50% -15%,color-mix(in srgb,var(--accent) 26%,#111) 0,#0b0d12 40%,#050608 100%);overflow:hidden;position:relative}
.app:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.28;background-image:radial-gradient(circle at 20% 20%,var(--glow) 0 1px,transparent 1.5px),radial-gradient(circle at 78% 33%,var(--glow) 0 1px,transparent 1.5px),radial-gradient(circle at 42% 77%,var(--rune) 0 1px,transparent 1.5px);background-size:93px 93px,137px 137px,181px 181px;filter:blur(.1px)}
.theme-adventure{--accent:#7f3030;--glow:#d06b55;--rune:#f0a36d;--metal:#76564a}
.theme-character{--accent:#4f6180;--glow:#8da9d4;--rune:#c7d8f1;--metal:#77879e}
.theme-skills,.theme-training{--accent:#795329;--glow:#d28c42;--rune:#f0bd67;--metal:#8b7156}
.theme-inventory,.theme-crafting,.theme-shops{--accent:#515861;--glow:#9aa6b0;--rune:#d7dfe3;--metal:#7d8790}
.craftTabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin:6px 0 10px}.craftTabs button{background:#0e1116;border:1px solid color-mix(in srgb,var(--metal) 55%,#222);color:var(--paper);padding:8px 4px;border-radius:4px;font-size:11px}.craftTabs button.active{border-color:var(--rune);box-shadow:0 0 10px color-mix(in srgb,var(--glow) 28%,transparent);background:color-mix(in srgb,var(--accent) 45%,#101218)}.materialCard{border:1px solid color-mix(in srgb,var(--metal) 42%,#23262b);background:linear-gradient(180deg,#11141a,#0c0e12);padding:10px;margin:8px 0;border-radius:5px}.materialCard small{display:block;color:var(--muted);margin-top:2px}.materialCard p{margin:6px 0}.traitRow{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.traitRow span{font-size:11px;border:1px solid color-mix(in srgb,var(--rune) 45%,#333);padding:3px 6px;border-radius:10px;background:#0b0e12;color:#d7e4e8}@media(max-width:520px){.craftTabs{grid-template-columns:repeat(3,minmax(0,1fr))}}

.theme-world{--accent:#315b4b;--glow:#65a77e;--rune:#a9d39e;--metal:#687b69}
.theme-callings{--accent:#60477a;--glow:#aa7bd2;--rune:#d8b6ef;--metal:#766583}
.theme-banking,.theme-markets{--accent:#3f625c;--glow:#62b7a4;--rune:#a5e2d4;--metal:#66847d}
.theme-magic{--accent:#3e427e;--glow:#7d84df;--rune:#b9c3ff;--metal:#666b9c}
.theme-boards,.theme-quests,.theme-guild{--accent:#704d2d;--glow:#c1874e;--rune:#e3bb78;--metal:#80694f}
.theme-events{--accent:#704038;--glow:#d27660;--rune:#f1ad91;--metal:#815e56}
.theme-politics{--accent:#633545;--glow:#c26482;--rune:#e9a5ba;--metal:#866675}
.theme-faiths{--accent:#6a6640;--glow:#d6c85e;--rune:#fff1a0;--metal:#898263}
.theme-news,.theme-chronicle,.theme-journal,.theme-codex{--accent:#5e4c39;--glow:#b99b6b;--rune:#e4cea1;--metal:#796b59}
.theme-party,.theme-factions{--accent:#425d6e;--glow:#6ea7bd;--rune:#a9dbe7;--metal:#607986}
.theme-conditions{--accent:#71313a;--glow:#d14d5f;--rune:#f09ba7;--metal:#865c63}
.theme-more{--accent:#55436d;--glow:#9471bc;--rune:#c9a6e4;--metal:#71637d}
.theme-audio{--accent:#43596d;--glow:#78a8ca;--rune:#b9dff2;--metal:#657c8b}

.top{position:relative;display:flex;align-items:center;justify-content:space-between;padding:0 11px;border-bottom:1px solid color-mix(in srgb,var(--metal2) 35%,transparent);background:linear-gradient(180deg,#171a20,#090a0e);box-shadow:0 4px 20px #000c,inset 0 -1px color-mix(in srgb,var(--glow) 30%,transparent);z-index:8}
.top:before{content:"";position:absolute;left:9px;right:9px;bottom:-4px;height:7px;background:linear-gradient(90deg,transparent,var(--accent),var(--rune),var(--accent),transparent);clip-path:polygon(0 45%,45% 45%,47% 0,50% 45%,53% 0,55% 45%,100% 45%,100% 55%,55% 55%,53% 100%,50% 55%,47% 100%,45% 55%,0 55%)}
.brand{border:0;background:transparent;color:#f2e8d2;font-family:"Cinzel Decorative","Cinzel","Copperplate",Georgia,serif;font-size:16px;font-weight:900;letter-spacing:.13em;text-shadow:0 2px 2px #000,0 0 14px var(--glow)}
.brandRune{font-size:10px;color:var(--rune)}
.topActions{display:flex;align-items:center;gap:6px}.syncButton{border:1px solid color-mix(in srgb,var(--metal) 75%,#111);background:linear-gradient(180deg,#17191f,#0b0c10);color:var(--rune);padding:5px 7px;font-size:9px;clip-path:polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)}.syncButton span{font-size:7px;letter-spacing:.08em}.syncButton:active{transform:translateY(1px)}
.rankSeal{display:grid;grid-template-columns:auto auto;column-gap:6px;align-items:center;text-align:right;padding:4px 7px;border:1px solid color-mix(in srgb,var(--metal) 75%,#111);background:linear-gradient(135deg,#17191f,#0c0d11);clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px)}
.rankSeal small{grid-column:1/-1;font-size:7px;letter-spacing:.14em;color:var(--muted)}
.rankSeal b{font-size:11px}.rankSeal span{font-size:11px;color:var(--rune)}

main{min-height:0;overflow:hidden;position:relative;display:grid;grid-template-rows:auto 1fr}
.screenBanner{position:relative;z-index:2;display:grid;grid-template-columns:38px 1fr 24px;align-items:center;gap:7px;margin:9px 9px 0;padding:8px 10px;background:linear-gradient(100deg,color-mix(in srgb,var(--accent) 40%,#0b0d11),#111319 55%,color-mix(in srgb,var(--accent) 22%,#0b0d11));border:1px solid color-mix(in srgb,var(--metal) 75%,#111);border-bottom:2px solid var(--accent);box-shadow:0 5px 18px #0008,inset 0 0 20px color-mix(in srgb,var(--glow) 8%,transparent);clip-path:polygon(7px 0,calc(100% - 7px) 0,100% 7px,100% 100%,0 100%,0 7px)}
.screenBanner:after{content:"";position:absolute;left:48px;right:36px;bottom:-2px;height:1px;background:linear-gradient(90deg,transparent,var(--rune),transparent)}
.bannerSigil{width:32px;height:32px;display:grid;place-items:center;border:1px solid var(--metal);transform:rotate(45deg);background:#0c0e13;box-shadow:0 0 14px color-mix(in srgb,var(--glow) 30%,transparent);color:var(--rune);font-size:17px}.bannerSigil::first-letter{transform:rotate(-45deg)}
.screenBanner>div b{display:block;color:#f3e8d2;font-size:13px;letter-spacing:.08em}.screenBanner>div small{display:block;color:var(--muted);font-family:Georgia,serif;font-size:9px;margin-top:1px}
.bannerFlourish{color:var(--rune);opacity:.8;font-size:18px}
.screenBody{min-height:0;overflow:hidden}
.screen{height:100%;overflow-y:auto;padding:10px 9px 26px;background-image:linear-gradient(90deg,transparent 0 96%,color-mix(in srgb,var(--accent) 8%,transparent) 96%),linear-gradient(color-mix(in srgb,var(--rune) 3%,transparent) 1px,transparent 1px);background-size:100% 100%,100% 31px}
.adventure{display:flex;flex-direction:column;overflow:hidden}

.worldStrip{position:relative;display:flex;justify-content:space-between;align-items:start;padding:9px 11px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 24%,#17191e),#0c0e12);border:1px solid var(--metal);border-radius:2px;box-shadow:inset 0 0 24px #0007,0 4px 12px #0007}
.worldStrip:before{content:"✦";position:absolute;left:50%;top:-7px;transform:translateX(-50%);color:var(--rune);background:#0c0e12;padding:0 5px}
.worldStrip b,.worldStrip small{display:block}.worldStrip b{font-family:"Cinzel",serif;color:#f0e3c9}.worldStrip small,.time small,.muted,small{color:var(--muted);font-size:11px}.time{text-align:right}
.weather{font-size:11px;color:#c9c2b2;padding:7px 10px;border:1px solid var(--metal);border-top:0;background:#0c0e12;letter-spacing:.03em}

.statsRow{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:9px 0}
.stat{position:relative;background:linear-gradient(180deg,#181b21,#0b0d11);border:1px solid var(--metal);padding:7px 7px 8px;clip-path:polygon(5px 0,calc(100% - 5px) 0,100% 5px,100% 100%,0 100%,0 5px);box-shadow:inset 0 0 12px #0008}
.stat:before{content:"";position:absolute;left:4px;right:4px;top:3px;height:1px;background:linear-gradient(90deg,transparent,var(--rune),transparent);opacity:.5}
.stat>div:first-child{display:flex;justify-content:space-between;font-size:11px}
.bar{height:8px;position:relative;background:#050608;border:1px solid #343841;overflow:hidden;margin-top:5px;box-shadow:inset 0 1px 4px #000}
.barFill{height:100%;background:linear-gradient(90deg,var(--accent),var(--glow));box-shadow:0 0 8px var(--glow)}
.bar span{position:absolute;left:0;right:0;top:-18px;text-align:center;font-size:10px}
.hp .barFill{background:linear-gradient(90deg,#541820,#c44a54);box-shadow:0 0 8px #b93b47}.mp .barFill{background:linear-gradient(90deg,#29306c,#6b72d7);box-shadow:0 0 8px #686ed5}.sp .barFill{background:linear-gradient(90deg,#28543e,#62a870);box-shadow:0 0 8px #5ca06a}
.messages{min-height:0;flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;overscroll-behavior-y:contain;border:1px solid var(--metal);padding:7px;background:linear-gradient(180deg,#101218ee,#090a0dee);box-shadow:inset 0 0 24px #0008}

.card{position:relative;background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 10%,#17191e),#0c0e12 58%,#090a0d);border:1px solid color-mix(in srgb,var(--metal) 80%,#111);padding:13px;margin-bottom:11px;box-shadow:0 7px 20px #0007,inset 0 0 0 1px color-mix(in srgb,var(--rune) 8%,transparent);clip-path:polygon(7px 0,calc(100% - 7px) 0,100% 7px,100% calc(100% - 7px),calc(100% - 7px) 100%,7px 100%,0 calc(100% - 7px),0 7px)}
.card:before{content:"◆";position:absolute;left:5px;top:4px;color:var(--rune);font-size:7px;text-shadow:0 0 7px var(--glow)}
.card:after{content:"◆";position:absolute;right:5px;bottom:4px;color:var(--rune);font-size:7px;text-shadow:0 0 7px var(--glow)}
.cardTitle{display:flex;justify-content:space-between;color:#f0e4cd;margin-bottom:10px;padding:0 12px 7px;border-bottom:1px solid color-mix(in srgb,var(--accent) 65%,#333);letter-spacing:.07em;text-transform:uppercase;font-size:12px}
.cardTitle:after{content:"◇";color:var(--rune);font-size:9px}

.heroLine{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px}.heroLine span{background:#12151a;border:1px solid var(--metal);padding:5px 9px;font-size:12px;color:#e7ddca;clip-path:polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)}
.attrGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.attrGrid>div{display:grid;grid-template-columns:1fr auto auto;gap:7px;background:#101319;padding:8px;border:1px solid var(--metal);font-size:12px}
/* ADVANCEMENT POINT ALLOCATION */
.apBanner{display:flex;gap:10px;align-items:center;padding:9px;margin-bottom:9px;background:linear-gradient(145deg,#15161c,#0c0d11);border:1px solid var(--metal)}
.apBanner.apReady{border-color:var(--rune);box-shadow:inset 0 0 18px color-mix(in srgb,var(--glow) 14%,transparent)}
.apCount{min-width:52px;text-align:center;border-right:1px solid var(--metal);padding-right:9px}
.apCount b{display:block;font-family:"Cinzel",Georgia,serif;font-size:22px;color:var(--rune);line-height:1;text-shadow:0 0 9px color-mix(in srgb,var(--glow) 40%,transparent)}
.apCount small{font-size:7px;letter-spacing:.09em;color:var(--muted)}
.apWords{font-size:11px;color:#cfc4b0;line-height:1.5}.apWords em{color:var(--rune);font-style:italic}
.attrGrid.alloc{grid-template-columns:1fr}
.attrGrid.alloc>.attrCell{display:block;padding:8px 9px}
.attrCell.staged{border-color:var(--rune);background:#131620}
.attrTop{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:baseline}
.attrTop b{font-family:"Cinzel",Georgia,serif;font-size:15px;color:#eee1c8}.attrTop b i{color:var(--rune);font-style:normal;font-size:11px}
.attrTop small{color:var(--muted);min-width:22px;text-align:right}
.attrNote{font-size:10px;color:var(--muted);margin:3px 0 6px;line-height:1.4}
.attrCtl{display:flex;align-items:center;justify-content:space-between;gap:8px}
.apCost{font-size:10px;color:var(--muted);text-align:center;flex:1}
.apBtn{width:34px;height:34px;min-width:34px;border:1px solid var(--metal);background:#0a0b0e;color:#e7ddca;font-size:17px;line-height:1;cursor:pointer;font-family:"Cinzel",Georgia,serif}
.apBtn.up{border-color:var(--rune);color:var(--rune)}
.apBtn:disabled{opacity:.28;cursor:not-allowed;border-color:var(--metal);color:var(--muted)}
.apActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
.apFoot{font-size:10px;margin-top:9px;line-height:1.5}
.navBadge{position:absolute;top:5px;right:calc(50% - 19px);min-width:15px;height:15px;padding:0 4px;border-radius:9px;background:var(--rune);color:#14100a;font-size:9px;font-weight:800;display:grid;place-items:center;box-shadow:0 0 8px color-mix(in srgb,var(--glow) 55%,transparent)}
nav button{position:relative}
.row,.item{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid color-mix(in srgb,var(--metal) 35%,transparent)}.row:last-child,.item:last-child{border-bottom:0}.item>div{display:flex;flex-direction:column}.skill{padding:9px 0;border-bottom:1px solid color-mix(in srgb,var(--metal) 35%,transparent)}.skill:last-child{border:0}.skillTop{display:flex;justify-content:space-between;font-size:12px}
.empty{padding:14px;color:var(--muted);text-align:center;font-size:12px;font-style:italic}.money,.coords{font-family:"Cinzel","Palatino Linotype",Georgia,serif;font-size:17px;color:var(--rune);text-shadow:0 0 8px color-mix(in srgb,var(--glow) 35%,transparent)}

.scaleFacts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.scaleFacts span{font-size:9px;border:1px solid var(--metal);padding:3px 6px;background:#0a0d0b;color:#cfd3bd}
.mapToolbar{display:grid;grid-template-columns:38px 58px 38px 1fr 1fr;gap:5px;margin:8px 0}.mapToolbar button,.mapToolbar span{min-height:32px;display:grid;place-items:center;border:1px solid #5f705f;background:linear-gradient(180deg,#19221c,#0b0f0c);color:#d8dfc7;font-family:"Cinzel",serif;font-size:11px}.mapToolbar span{color:#a9d39e}.mapToolbar .wideMapBtn{padding:0 7px}
.mapViewport{height:430px;position:relative;overflow:hidden;border:1px solid #576552;background:#050806;box-shadow:inset 0 0 30px #000,0 5px 18px #0008;touch-action:none;cursor:grab;user-select:none}.mapViewport:active{cursor:grabbing}
.mapPanLayer{position:absolute;inset:0;display:grid;place-items:center;transform-origin:center center;will-change:transform}
.mapWorld{position:relative;width:min(92%,920px);max-height:92%;background-color:#263429;background-image:linear-gradient(#b7c49c18 1px,transparent 1px),linear-gradient(90deg,#b7c49c18 1px,transparent 1px),linear-gradient(#e8e3b233 1px,transparent 1px),linear-gradient(90deg,#e8e3b233 1px,transparent 1px);border:1px solid #71806b;box-shadow:inset 0 0 55px #000b,0 0 0 4px #0e130f,0 0 0 5px #51604f}
.mapWorld:after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 48% 48%,transparent 0 42%,#111b 100%),linear-gradient(135deg,#91a6760a,#0000 35%,#c2b77c0a 65%,#0000)}
.axis{position:absolute;background:#d5d8b2;opacity:.34;z-index:1}.axisX{left:0;right:0;height:1px}.axisY{top:0;bottom:0;width:1px}
.mapPlace{position:absolute;transform:translate(-50%,-50%);z-index:3;white-space:nowrap;pointer-events:none}.mapPin{display:block;text-align:center;color:#d9dca7;font-size:12px;text-shadow:0 1px 5px #000}.mapLabel{display:block;margin-top:1px;padding:1px 3px;background:#09100bcc;color:#ece7d2;font-size:7.5px;line-height:1.15;border:1px solid #71806b99;max-width:92px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 4px #0009}.mapPlace.village .mapPin,.mapPlace.hamlet .mapPin,.mapPlace.settlement .mapPin{font-size:8px}.mapPlace.village .mapLabel,.mapPlace.hamlet .mapLabel,.mapPlace.settlement .mapLabel{font-size:6.5px}
.you{position:absolute;transform:translate(-50%,-50%);color:#fff6b8;font-size:18px;text-shadow:0 0 11px #f1e06b;z-index:7;pointer-events:none}.liveYou span{display:block;font-size:6px;letter-spacing:1px;background:#10150dee;border:1px solid #d6c967;padding:1px 3px;margin-top:-2px}
.mapCornerLabel{position:absolute;font-size:6px;color:#b8c1a7;background:#09100bcc;padding:1px 3px;z-index:4}.mapCornerLabel.nw{left:3px;top:3px}.mapCornerLabel.se{right:3px;bottom:3px}
.mapScaleLegend{display:flex;gap:12px;flex-wrap:wrap;margin-top:7px;color:#aab2a0;font-size:9px}.mapScaleLegend span{display:flex;align-items:center;gap:4px}.mapScaleLegend i{width:18px;height:0;border-top:1px solid #879378}.mapScaleLegend .majorLine{border-top-color:#d6d1a2;border-top-width:2px}
.moreGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.moreGrid button{position:relative;padding:19px 8px;background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 18%,#17191f),#0c0e12);color:#eee4d0;border:1px solid var(--metal);box-shadow:inset 0 0 16px #0005;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px)}.moreGrid button:before{content:"✦";display:block;color:var(--rune);font-size:14px;margin-bottom:4px;text-shadow:0 0 8px var(--glow)}.moreGrid button:active{transform:translateY(1px)}
.journalAdd{display:flex;gap:6px;margin-top:10px}.journalAdd input{flex:1}


.audioScreen{padding-bottom:34px}.audioRow{display:grid;grid-template-columns:1fr auto;align-items:center;gap:12px;padding:12px 4px;border-bottom:1px solid color-mix(in srgb,var(--metal) 35%,transparent)}.audioRow:last-child{border-bottom:0}.audioRow b{display:block;font-family:"Cinzel",serif;font-size:12px;color:#f1e6d0}.audioRow small{display:block;margin-top:3px;line-height:1.25;color:var(--muted)}.audioToggle{min-width:64px;height:34px;border:1px solid var(--metal);background:#0c0f13;color:#a5a7a9;clip-path:polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)}.audioToggle.on{border-color:var(--rune);color:#f4ead5;background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 55%,#17191f),#0b0d11);box-shadow:0 0 10px color-mix(in srgb,var(--glow) 25%,transparent)}.audioToggle span{font-family:"Cinzel",serif;font-size:10px;letter-spacing:.1em}

.composer{position:relative;border-top:1px solid var(--metal);background:linear-gradient(180deg,#111319,#08090c);padding:15px 6px 4px;box-shadow:0 -5px 20px #000a}.composerRune{position:absolute;top:2px;left:0;right:0;text-align:center;font-family:"Cinzel",serif;font-size:7px;letter-spacing:.18em;color:var(--rune);opacity:.75}

/* Mobile message-editing mode: when Yumina opens an editor inside MessageList, reclaim the composer/nav space and keep the edited message above the software keyboard. */
.messages textarea:focus,.messages input:focus,.messages [contenteditable="true"]:focus{scroll-margin-top:88px;scroll-margin-bottom:170px;position:relative;z-index:30}
.eldoria-message-editing .app{grid-template-rows:58px 1fr 0 0}
.eldoria-message-editing .composer,.eldoria-message-editing nav{display:none!important}
.eldoria-message-editing .messages{overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding-bottom:42vh}
@media (min-width:901px){.eldoria-message-editing .app{grid-template-rows:58px 1fr auto 66px}.eldoria-message-editing .composer{display:block!important}.eldoria-message-editing nav{display:grid!important}.eldoria-message-editing .messages{padding-bottom:7px}}

nav{display:grid;grid-template-columns:repeat(6,1fr);border-top:1px solid var(--metal);background:linear-gradient(180deg,#12141a,#07080b);box-shadow:0 -3px 18px #0009;z-index:8}
nav button{border:0;border-right:1px solid #2d3139;background:transparent;color:#989b9e;font-size:8px;padding:6px 2px 7px;display:flex;flex-direction:column;align-items:center;gap:2px}
nav button:last-child{border-right:0}.navIcon{font-size:17px;line-height:20px;color:#8b9097;text-shadow:0 1px #000}
nav button.active{color:#f2e9d5;background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 42%,#17191f),#0c0e12);box-shadow:inset 0 2px var(--rune)}
nav button.active .navIcon{color:var(--rune);text-shadow:0 0 9px var(--glow)}

button{cursor:pointer;color:inherit}input,textarea{width:100%;background:#090b0f;border:1px solid var(--metal);color:#eee4d0;border-radius:1px;padding:11px;font-size:14px;box-shadow:inset 0 2px 9px #0009}input:focus,textarea:focus{outline:1px solid var(--rune);border-color:var(--rune);box-shadow:inset 0 2px 9px #0009,0 0 9px color-mix(in srgb,var(--glow) 30%,transparent)}textarea{min-height:90px;resize:vertical}

/* CHARACTER CREATION: illustrated-book / illuminated-manuscript feeling, with realm-specific magical atmosphere */
.creator{--realm:#7f3030;--realmGlow:#c46d56;min-height:100vh;background:radial-gradient(circle at 50% 12%,color-mix(in srgb,var(--realm) 48%,#17100d) 0,#0b0b0d 43%,#050608 100%);padding:18px 12px 30px;overflow:auto;position:relative;color:#eee2c8}
.creator:before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 24%,transparent 0 18%,#0008 70%),repeating-radial-gradient(circle at 50% 30%,transparent 0 35px,color-mix(in srgb,var(--realmGlow) 6%,transparent) 36px 37px,transparent 38px 70px)}
.creator:after{content:"✦ ᚱ ✧ ᚨ ✦ ᛉ ✧ ᛟ ✦";position:fixed;left:0;right:0;bottom:7px;text-align:center;color:var(--realmGlow);font-size:10px;letter-spacing:14px;opacity:.28;pointer-events:none}
.realm-aurelia{--realm:#79373c;--realmGlow:#d19a6a}.realm-stonehold{--realm:#4d5860;--realmGlow:#a9c1c4}.realm-sylvanor{--realm:#2e6046;--realmGlow:#81c36d}.realm-drakmor{--realm:#405a75;--realmGlow:#91c8e8}.realm-sunscar{--realm:#8a4d2d;--realmGlow:#e0a75c}.realm-velkar{--realm:#245c68;--realmGlow:#6bc1c8}.realm-umbral-reach{--realm:#57365f;--realmGlow:#ba79c6}
.creatorPanel{position:relative;max-width:720px;margin:auto;border:1px solid color-mix(in srgb,var(--realmGlow) 65%,#777);background:linear-gradient(155deg,#151419f2,#0a0a0df5);padding:18px 13px 20px;box-shadow:0 18px 55px #000d,inset 0 0 45px color-mix(in srgb,var(--realm) 14%,transparent);clip-path:polygon(11px 0,calc(100% - 11px) 0,100% 11px,100% calc(100% - 11px),calc(100% - 11px) 100%,11px 100%,0 calc(100% - 11px),0 11px)}
.creatorPanel:before{content:"";position:absolute;inset:6px;border:1px solid color-mix(in srgb,var(--realmGlow) 28%,transparent);pointer-events:none;clip-path:polygon(13px 0,calc(100% - 13px) 0,100% 13px,100% calc(100% - 13px),calc(100% - 13px) 100%,13px 100%,0 calc(100% - 13px),0 13px)}
.crest{text-align:center;color:var(--realmGlow);font-size:31px;height:31px;text-shadow:0 0 15px var(--realmGlow);animation:crestPulse 3s ease-in-out infinite}@keyframes crestPulse{50%{filter:brightness(1.25);text-shadow:0 0 22px var(--realmGlow)}}
.creator h1{text-align:center;font-family:"Cinzel Decorative","Cinzel","Copperplate",Georgia,serif;color:#f1e5ce;letter-spacing:.16em;margin:3px 0 0;text-shadow:0 2px #000,0 0 17px var(--realmGlow)}
.sub{text-align:center;color:#bdb3a1;margin:2px 0}.ornament{text-align:center;color:var(--realmGlow);font-size:12px;margin:9px 0 14px;letter-spacing:.18em}
.steps{display:flex;gap:6px;margin:14px 0 18px}.steps span{position:relative;flex:1;text-align:center;padding:10px 3px;background:#0d0e12;color:#777b80;font-size:9px;border:1px solid #343840;clip-path:polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)}.steps .on{background:linear-gradient(180deg,color-mix(in srgb,var(--realm) 55%,#17191f),#101116);color:#f1e3c7;border-color:var(--realmGlow);box-shadow:inset 0 0 15px color-mix(in srgb,var(--realmGlow) 12%,transparent)}
.creationPage{animation:pageReveal .28s ease}@keyframes pageReveal{from{opacity:.25;transform:translateY(7px) scale(.995);filter:blur(1px)}to{opacity:1;transform:none;filter:none}}
.sectionRune{display:flex;align-items:center;gap:8px;color:var(--realmGlow);margin:16px 0 9px;text-transform:uppercase;font-size:11px;letter-spacing:.11em}.sectionRune:before,.sectionRune:after{content:"";height:1px;background:linear-gradient(90deg,transparent,var(--realmGlow));flex:1}.sectionRune:after{background:linear-gradient(90deg,var(--realmGlow),transparent)}
.formGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.formGrid label,.scrollField{font-size:11px;color:#c9bea8}.formGrid label input,.formGrid label textarea,.scrollField input{margin-top:5px}.wide{grid-column:1/-1}
.note{background:#111318;border-left:2px solid var(--realmGlow);padding:10px;color:#c8bea9;font-size:12px;box-shadow:inset 8px 0 18px color-mix(in srgb,var(--realm) 13%,transparent)}.parchmentNote{border:1px solid #4d5058;border-left:2px solid var(--realmGlow);margin-top:12px}
.choiceGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.speciesGrid,.classGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
.choiceCard{min-height:82px;display:grid;grid-template-columns:32px 1fr 18px;align-items:center;text-align:left;gap:7px;padding:10px;background:linear-gradient(145deg,#17191f,#0c0d11);border:1px solid #414650;color:#e8dfcd;box-shadow:inset 0 0 13px #0006;clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)}
.choiceCard:hover{border-color:var(--realmGlow);background:linear-gradient(145deg,color-mix(in srgb,var(--realm) 24%,#17191f),#0d0e12)}
.choiceCard.selected{border-color:var(--realmGlow);background:linear-gradient(145deg,color-mix(in srgb,var(--realm) 46%,#1a1c21),#0d0e12);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--realmGlow) 35%,transparent),0 0 17px color-mix(in srgb,var(--realmGlow) 20%,transparent)}
.choiceSigil{font-size:23px;color:var(--realmGlow);text-align:center;text-shadow:0 0 9px var(--realmGlow)}.choiceWords{display:flex;flex-direction:column;gap:2px}.choiceWords b{color:#f0e5d0;font-size:12px}.choiceWords em{font-style:normal;color:#c9bca3;font-size:10px}.choiceWords small{line-height:1.25;color:#96968f}.choiceMark{color:var(--realmGlow);text-align:right}
.realmGrid{display:grid;grid-template-columns:1fr;gap:8px}.realmGrid .choiceCard{min-height:96px}.realmIntro{font-size:12px;color:#c7bca6;text-align:center;margin:0 6px 10px}.realmSeal{display:flex;align-items:center;gap:11px;border:1px solid var(--realmGlow);background:linear-gradient(120deg,color-mix(in srgb,var(--realm) 34%,#111318),#0c0d11);padding:10px;margin:11px 0;box-shadow:0 0 16px color-mix(in srgb,var(--realmGlow) 12%,transparent)}.realmSeal>span{font-size:30px;color:var(--realmGlow);width:36px;text-align:center;text-shadow:0 0 12px var(--realmGlow)}.realmSeal div{display:flex;flex-direction:column}.realmSeal b{font-family:"Cinzel",serif;color:#f2e5cc}.scrollField{display:block}
.creatorButtons{display:flex;justify-content:space-between;margin-top:17px;gap:10px}.medievalButton{padding:11px 20px;border:1px solid #515660;background:linear-gradient(180deg,#1a1c22,#0c0d11);color:#e8ddc7;box-shadow:inset 0 0 0 1px #ffffff08;clip-path:polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)}.medievalButton.primary{background:linear-gradient(180deg,color-mix(in srgb,var(--realm) 65%,#202229),#111318);border-color:var(--realmGlow);color:#fff1d4;text-shadow:0 1px #000;box-shadow:0 0 14px color-mix(in srgb,var(--realmGlow) 18%,transparent)}.medievalButton.begin{font-family:"Cinzel",serif;letter-spacing:.07em}.medievalButton:active{transform:translateY(1px)}.itemBtn{padding:4px 11px;font-size:.75rem;letter-spacing:.03em;margin-left:8px}.tsWrap{position:relative;margin-left:8px}.syncButton:disabled{opacity:.4;cursor:not-allowed}.tsMenu{position:absolute;top:calc(100% + 6px);right:0;display:flex;flex-direction:column;gap:6px;padding:8px;background:var(--panel2);border:1px solid color-mix(in srgb,var(--metal) 45%,transparent);border-radius:6px;z-index:20;min-width:110px}.tsMenu .medievalButton{width:100%;margin-left:0;text-align:center}

.boardPanel{margin:10px 0 14px;padding:10px;background:linear-gradient(145deg,#19171a,#0d0e11);border:1px solid var(--metal);box-shadow:inset 0 0 20px #0006}.boardHead{display:flex;justify-content:space-between;gap:8px;align-items:start;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid var(--accent)}.boardHead b,.questPost b{font-family:"Cinzel","Copperplate",Georgia,serif;color:#eee1c8}.boardHead small{display:block;margin-top:2px}.boardHead>span{font-size:10px;text-transform:uppercase;color:var(--rune);border:1px solid var(--metal);padding:3px 5px}.questPost{display:grid;grid-template-columns:34px 1fr auto;gap:8px;align-items:start;padding:9px 5px;border-bottom:1px solid #34363d}.questRank{width:30px;height:30px;border:1px solid var(--metal);display:grid;place-items:center;font-family:"Cinzel",serif;font-weight:800;color:var(--rune);background:#090a0d;box-shadow:inset 0 0 9px #000}.questWords small{display:block;margin-top:2px}.questWords p{margin:4px 0 0;font-size:12px;color:#d2c7b3}.questPay{font-size:11px;color:var(--rune);white-space:nowrap}.rankS .questRank{box-shadow:0 0 13px #d9c6ff88,inset 0 0 9px #715399}.rankA .questRank,.rankB .questRank{border-width:2px}

@media(max-width:560px){.choiceGrid,.classGrid,.speciesGrid{grid-template-columns:1fr}.creatorPanel{padding-left:10px;padding-right:10px}.choiceCard{min-height:76px}.realmGrid .choiceCard{min-height:90px}.screenBanner{margin-left:7px;margin-right:7px}.app{grid-template-rows:56px 1fr auto 64px}}
@media(max-width:380px){.syncButton span{display:none}.syncButton{padding:5px 6px}.statsRow{gap:4px}.stat{padding:5px}.top{padding:0 7px}.screen{padding:8px 7px}.brand{font-size:13px}.formGrid{grid-template-columns:1fr}.wide{grid-column:1}.attrGrid{grid-template-columns:1fr 1fr}.creator{padding:10px 7px 24px}.creatorButtons .medievalButton{padding:10px 13px;font-size:12px}.screenBanner{grid-template-columns:32px 1fr 18px;padding:7px}.bannerSigil{width:27px;height:27px;font-size:14px}}

/* COMPACT READING LAYOUT — presentation only; no mechanical values are changed */
.top{min-height:44px;padding:0 9px}.brand{font-size:13px}.rankSeal{padding:2px 6px}.rankSeal small{font-size:6px}.rankSeal b,.rankSeal span{font-size:9px}
.app{grid-template-rows:46px 1fr auto 56px}
.screenBanner{grid-template-columns:27px 1fr 16px;gap:5px;margin:5px 7px 0;padding:5px 7px;min-height:42px}
.bannerSigil{width:23px;height:23px;font-size:12px}.screenBanner>div b{font-size:10px}.screenBanner>div small{font-size:7px}.bannerFlourish{font-size:12px}
.screen{padding:6px 7px 16px}
.worldStrip{padding:5px 8px}.worldStrip b{font-size:12px}.worldStrip small,.time small{font-size:8px}.time b{font-size:11px}
.weather{padding:4px 8px;font-size:9px}
.statsRow{gap:4px;margin:5px 0}
.stat{padding:4px 5px 5px}.stat>div:first-child{font-size:9px}.bar{height:5px;margin-top:3px}.bar span{font-size:8px}
.messages{padding:5px}
.composer{padding:12px 5px 3px}.composerRune{font-size:6px}
nav button{padding:4px 1px 5px;font-size:6.5px}.navIcon{font-size:14px;line-height:16px}
.creatorHelp{margin-bottom:10px;border-left-color:var(--realmGlow)}
.creator label small,.scrollField small{font-size:9px;color:#8f918d}
@media(max-width:560px){
 .app{grid-template-rows:44px 1fr auto 54px}
 .top{min-height:42px}
 .screenBanner{min-height:38px;margin-top:4px;padding-top:4px;padding-bottom:4px}
 .bannerSigil{width:21px;height:21px}
 .worldStrip{padding:4px 7px}
 .statsRow{margin:4px 0}
 .stat{padding:3px 4px 4px}
 .bar{height:4px}
 nav button{padding-top:3px;padding-bottom:4px}
}

.backgroundGrid{grid-template-columns:repeat(2,minmax(0,1fr));max-height:430px;overflow:auto;padding-right:2px}
.backgroundGrid .choiceCard{min-height:92px}
@media(max-width:560px){.backgroundGrid{grid-template-columns:1fr;max-height:390px}.backgroundGrid .choiceCard{min-height:78px}}

.partyActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.partyActions button,.partyMember{border:1px solid rgba(211,166,115,.42);background:rgba(21,17,20,.88);color:inherit;padding:10px 12px;border-radius:3px}.partyActions button{flex:1;min-width:130px}.partyMember{width:100%;display:flex;justify-content:space-between;align-items:center;text-align:left;margin:6px 0}.partyMember small{display:block;opacity:.72;margin-top:3px}.partyMember.selected{box-shadow:inset 3px 0 0 rgba(230,173,112,.9);background:rgba(73,39,36,.55)}@media(max-width:600px){.partyActions{display:grid;grid-template-columns:1fr 1fr}.partyActions button{min-width:0}.partyMember{padding:12px 10px}.partyMember span{font-size:12px}}
`;
export default App;
