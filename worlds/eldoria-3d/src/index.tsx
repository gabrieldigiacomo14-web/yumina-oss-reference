// @ts-nocheck
// Eldoria — 3D edition. Entry point for the Yumina rootComponent.
// The block marked ORIGINAL ENGINE is copied verbatim from the original interface
// (refresh it with tools/gen_index.py): it is the deterministic normalizer
// (XP -> level, advancement points, HP/Mana/Stamina maxima, skill rollover, calendar,
// moon phase, encumbrance) and the adaptive ambience controller the world relies on.
import { loadThree } from "./three";
import * as RIG from "./rig";
import { Creator } from "./creator";
import { GameScreen } from "./hud";
import { CSS } from "./styles";
import { safeObj, safeArr, levelFromXp, skillNeed, formatEldoriaDate, moonFromDate, canonicalSettlement, embeddedSublocation } from "./panels";

function CreatorGate(props) {
  var [ready, setReady] = React.useState(!!(window.THREE && window.THREE.WebGLRenderer));
  var [err, setErr] = React.useState(null);
  var [modelsReady, setModelsReady] = React.useState(false);
  React.useEffect(function () { if (ready) return; loadThree().then(function () { setReady(true); }).catch(function (e) { setErr(String(e && e.message || e)); }); }, []);
  /* optional glTF models named in the world3d-models variable are loaded once before the creator shows its preview */
  React.useEffect(function () { if (!ready) return; var man = (props.api.variables || {})["world3d-models"]; if (!man || typeof man !== "object" || !Object.keys(man).length) { setModelsReady(true); return; } var dead = false; Promise.race([RIG.loadManifest(props.api, man), new Promise(function (r) { setTimeout(r, 25000); })]).catch(function () { }).then(function () { if (!dead) setModelsReady(true); }); return function () { dead = true; }; }, [ready]);
  if (err) return <div className="eLoading"><div className="eLogo big"><b>ELDORIA</b><small>FROM F-RANK TO LEGEND</small></div><p>{err}</p><button className="eBtn small" onClick={function () { setErr(null); loadThree().then(function () { setReady(true); }).catch(function (e) { setErr(String(e && e.message || e)); }); }}>Try again</button></div>;
  if (!ready) return <div className="eLoading"><div className="eLogo big"><b>ELDORIA</b><small>FROM F-RANK TO LEGEND</small></div><p>Loading the 3D engine…</p><div className="eSpinner" /></div>;
  if (!modelsReady) return <div className="eLoading"><div className="eLogo big"><b>ELDORIA</b><small>FROM F-RANK TO LEGEND</small></div><p>Loading character models…</p><div className="eSpinner" /></div>;
  return <Creator api={props.api} />;
}

function useFonts() {
  React.useEffect(function () {
    if (document.getElementById("eldoria-fonts")) return;
    var l = document.createElement("link"); l.id = "eldoria-fonts"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=swap";
    document.head.appendChild(l);
  }, []);
}

export default function App() {
 var api = useYumina(); var v = api.variables || {};
 useFonts();
// ---- ORIGINAL ENGINE (verbatim) ----
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

// ---- END ORIGINAL ENGINE ----
 if (!v["character-created"]) return <><style>{CSS}</style><CreatorGate api={api} /></>;
 return <><style>{CSS}</style><GameScreen api={api} audioPrefs={audioPrefs} onAudioPref={changeAudioPref} /></>;
}
