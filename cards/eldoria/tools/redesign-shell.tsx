
/* =====================================================================================
   ELDORIA LEDGER UI — the card-and-tile layout, in Eldoria's own steel, rune-blue and
   ember look. One compact top bar on every screen, a status strip and story card on the
   Chronicle, a bottom nav around a central emblem, a Ledger hub of tiles, and screens
   built from framed cards and tiles. Interface only: no AI calls of its own.
   ===================================================================================== */
var NavCtx = React.createContext<any>(null);
function useNav(){ return React.useContext(NavCtx) || function(){}; }
/* line icons, drawn for this card (24×24, stroked) */
var EL_ICON:any={
 emblem:'M12 2.5 L14.2 9.8 L21.5 12 L14.2 14.2 L12 21.5 L9.8 14.2 L2.5 12 L9.8 9.8 Z',
 home:'M3 20 V9 L7 6 V3 H9 V4.6 L12 2.5 L21 9 V20 H14 V14 H10 V20 Z',
 hero:'M12 3 A4 4 0 1 1 11.99 3 Z M4.5 21 C5.2 15.8 8.2 13.5 12 13.5 C15.8 13.5 18.8 15.8 19.5 21',
 skills:'M12 3 L13.8 8.6 H19.7 L14.9 12 L16.7 17.6 L12 14.2 L7.3 17.6 L9.1 12 L4.3 8.6 H10.2 Z',
 quest:'M6 3 H16 A3 3 0 0 1 16 9 H18 V21 H8 A3 3 0 0 1 8 15 H6 Z M8 15 H18 M10 7 H15 M11 11 H16',
 map:'M3 6 L9 3.5 L15 6 L21 3.5 V18 L15 20.5 L9 18 L3 20.5 Z M9 3.5 V18 M15 6 V20.5',
 magic:'M12 2.5 L13.4 7.6 L18.5 9 L13.4 10.4 L12 15.5 L10.6 10.4 L5.5 9 L10.6 7.6 Z M18 14.5 L18.8 16.7 L21 17.5 L18.8 18.3 L18 20.5 L17.2 18.3 L15 17.5 L17.2 16.7 Z M6 15.5 L6.6 17.2 L8.3 17.8 L6.6 18.4 L6 20.1 L5.4 18.4 L3.7 17.8 L5.4 17.2 Z',
 gear:'M5 7 H19 L18 20.5 H6 Z M9 7 V5.5 A3 3 0 0 1 15 5.5 V7 M8.5 11 H15.5',
 more:'M4 4 H10 V10 H4 Z M14 4 H20 V10 H14 Z M4 14 H10 V20 H4 Z M14 14 H20 V20 H14 Z',
 heart:'M12 20.5 C5 15.5 3 12.4 3 9 A4.6 4.6 0 0 1 12 7.2 A4.6 4.6 0 0 1 21 9 C21 12.4 19 15.5 12 20.5 Z',
 drop:'M12 3 C15.5 8 18 11.2 18 14.5 A6 6 0 0 1 6 14.5 C6 11.2 8.5 8 12 3 Z',
 bolt:'M13.5 2.5 L5.5 13.5 H11.5 L10.5 21.5 L18.5 10.5 H12.5 Z',
 sun:'M12 7.5 A4.5 4.5 0 1 1 11.99 7.5 Z M12 2 V4 M12 20 V22 M2 12 H4 M20 12 H22 M4.9 4.9 L6.3 6.3 M17.7 17.7 L19.1 19.1 M4.9 19.1 L6.3 17.7 M17.7 6.3 L19.1 4.9',
 moon:'M15.5 3.5 A8.5 8.5 0 1 0 20.5 15 A7 7 0 0 1 15.5 3.5 Z',
 sync:'M20 12 A8 8 0 0 1 6.3 17.7 M4 12 A8 8 0 0 1 17.7 6.3 M17.7 2.8 V6.3 H14.2 M6.3 21.2 V17.7 H9.8',
 skip:'M4 6 L11 12 L4 18 Z M12 6 L19 12 L12 18 Z M20.5 5.5 V18.5',
 book:'M4 4.5 C7 3.5 10 3.8 12 5.5 C14 3.8 17 3.5 20 4.5 V19.5 C17 18.5 14 18.8 12 20.5 C10 18.8 7 18.5 4 19.5 Z M12 5.5 V20.5',
 copy:'M8 8 H19 V20 H8 Z M5 16 V4 H15',
 redo:'M19 12 A7 7 0 1 1 16.9 7 M19 3.5 V8 H14.5',
 save:'M6 3 H18 V21 L12 17 L6 21 Z',
 dice:'M4 4 H20 V20 H4 Z M8.5 8.5 H8.6 M15.5 8.5 H15.6 M12 12 H12.1 M8.5 15.5 H8.6 M15.5 15.5 H15.6',
 spark:'M12 3 L13.5 10.5 L21 12 L13.5 13.5 L12 21 L10.5 13.5 L3 12 L10.5 10.5 Z',
 plus:'M12 5 V19 M5 12 H19',
 sword:'M14.5 3 H21 V9.5 L10 20.5 L7.5 18 Z M3 21 L7.5 16.5 M5 14 L10 19',
 shield:'M12 2.5 L20 5.5 V11.5 C20 16 16.5 19.5 12 21.5 C7.5 19.5 4 16 4 11.5 V5.5 Z',
 run:'M14 4.5 A1.8 1.8 0 1 1 13.99 4.5 Z M10 21 L12.5 15 L15 17.5 V21.5 M9 11 L12 8.5 L15.5 10.5 L18 12.5 M12 8.5 L10.5 14',
 bed:'M3 18 V7 M3 13 H21 V18 M7 10 A1.8 1.8 0 1 1 6.99 10 Z M10.5 10.5 H19 A2 2 0 0 1 21 12.5 V13',
 eye:'M2 12 C5 6.5 19 6.5 22 12 C19 17.5 5 17.5 2 12 Z M12 9 A3 3 0 1 1 11.99 9 Z',
 talk:'M4 5 H20 V16 H11 L6 20 V16 H4 Z',
 coin:'M12 4 A8 8 0 1 1 11.99 4 Z M12 7.5 V16.5 M9.5 9.5 C9.5 8 14.5 8 14.5 9.8 C14.5 11.8 9.5 11.4 9.5 13.6 C9.5 15.6 14.5 15.8 14.5 14.2',
 tent:'M2 20 L12 4 L22 20 Z M12 4 V20 M9 20 L12 14 L15 20',
 hourglass:'M6 3 H18 M6 21 H18 M7 3 C7 9 17 9 17 12 C17 15 7 15 7 21 M17 3 C17 9 7 9 7 12 C7 15 17 15 17 21',
 people:'M8.5 4 A3 3 0 1 1 8.49 4 Z M16.5 5.5 A2.5 2.5 0 1 1 16.49 5.5 Z M2.5 20 C3 15.8 5.4 13.5 8.5 13.5 C11.6 13.5 14 15.8 14.5 20 M14.5 13.2 C17.6 12.8 20.6 14.8 21.5 19',
 crown:'M3 18 L4.5 7 L9 12 L12 5 L15 12 L19.5 7 L21 18 Z M3 21 H21',
 chev:'M9 5 L16 12 L9 19',
 back:'M15 5 L8 12 L15 19',
 cog:'M12 8.5 A3.5 3.5 0 1 1 11.99 8.5 Z M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5 M5.3 5.3 L7.1 7.1 M16.9 16.9 L18.7 18.7 M5.3 18.7 L7.1 16.9 M16.9 7.1 L18.7 5.3',
 anvil:'M3 7 H17 C17 10 19.5 10.5 21 10.5 V12 H15 L14 16 H17 V19 H7 V16 H10 L9 12 H6 C4 12 3 9.5 3 7 Z',
 temple:'M2.5 9 L12 3.5 L21.5 9 Z M4.5 9 V18 M9 9 V18 M15 9 V18 M19.5 9 V18 M3 18 H21 M2 21 H22',
 scroll:'M7 4 H18 A2 2 0 0 1 18 8 H16 V20 A2 2 0 0 1 12 20 H5 A2 2 0 0 1 5 16 H9 V6 A2 2 0 0 0 7 4 Z',
 flame:'M12 21 C7.5 21 5.5 18 5.5 14.5 C5.5 10.5 9 8.5 9.5 3.5 C12.5 6 13 8 13 10 C14.5 9 15 7.5 15 6.5 C17.5 9 18.5 11.5 18.5 14.5 C18.5 18 16.5 21 12 21 Z',
 scales:'M12 3 V21 M7 21 H17 M4 7 H20 M6.5 7 L3.5 13.5 H9.5 Z M17.5 7 L14.5 13.5 H20.5 Z'
};
function ElIcon({n,s,fill}:{n:string,s?:number,fill?:boolean}){
 var d=EL_ICON[n]||EL_ICON.spark; var sz=s||20;
 return <svg className={'elIcon'+(fill?' fill':'')} width={sz} height={sz} viewBox="0 0 24 24" aria-hidden="true"><path d={d}/></svg>;
}
/* the Eldoria emblem: a four-pointed star in a ring, used for the central nav button and headings */
function ElEmblem({s}:{s?:number}){
 var sz=s||40;
 return <svg className="elEmblem" width={sz} height={sz} viewBox="0 0 48 48" aria-hidden="true">
  <circle cx="24" cy="24" r="21" className="ring"/><circle cx="24" cy="24" r="16.5" className="ring2"/>
  <path d="M24 6 L27.2 20.8 L42 24 L27.2 27.2 L24 42 L20.8 27.2 L6 24 L20.8 20.8 Z" className="star"/>
  <path d="M24 13 L25.6 22.4 L35 24 L25.6 25.6 L24 35 L22.4 25.6 L13 24 L22.4 22.4 Z" className="core"/>
 </svg>;
}
/* framed panel with diamond corners — the basic card of the Ledger */
function Panel({title,sub,icon,action,children,className,accent}:{title?:any,sub?:any,icon?:string,action?:any,children?:any,className?:string,accent?:string}){
 return <section className={'panel'+(className?' '+className:'')} style={accent?{['--pa' as any]:accent}:undefined}>
  <i className="pc tl"/><i className="pc tr"/><i className="pc bl"/><i className="pc br"/>
  {title?<div className="panelHead">{icon?<span className="panelSigil"><ElIcon n={icon} s={15}/></span>:null}<div className="panelTitle"><b>{title}</b>{sub?<small>{sub}</small>:null}</div>{action||null}</div>:null}
  {children}
 </section>;
}
function Meter({label,cur,max,kind,icon,word}:{label:string,cur:any,max:any,kind:string,icon?:string,word?:string}){
 var c=Number(cur)||0, m=Number(max)||0, p=m>0?clamp(c/m*100,0,100):0;
 return <div className={'meter m-'+kind+(p<=25&&m>0?' low':'')}>{icon?<ElIcon n={icon} s={15}/>:null}<div className="meterBody"><div className="meterTop"><span>{label}</span><b>{m>0?c+'/'+m:'—'}</b></div><div className="meterBar"><i style={{width:p+'%'}}/></div>{word?<small>{word}</small>:null}</div></div>;
}
function Chip({on,children,onClick,icon,disabled}:{on?:boolean,children:any,onClick?:any,icon?:string,disabled?:boolean}){
 return <button type="button" className={'chip'+(on?' on':'')} onClick={onClick} disabled={disabled}>{icon?<ElIcon n={icon} s={13}/>:null}{children}</button>;
}
function Tile({icon,title,line,onClick,accent,badge,big}:{icon:string,title:string,line?:any,onClick?:any,accent?:string,badge?:any,big?:boolean}){
 return <button type="button" className={'tile'+(big?' big':'')} onClick={onClick} style={accent?{['--ta' as any]:accent}:undefined}>
  <span className="tileSigil"><ElIcon n={icon} s={big?24:20}/></span>
  <span className="tileWords"><b>{title}</b>{line?<small>{line}</small>:null}</span>
  {badge!=null&&badge!==''?<span className="tileBadge">{badge}</span>:null}
  <span className="tileChev"><ElIcon n="chev" s={14}/></span>
 </button>;
}
function Sheet({title,onClose,children}:{title:string,onClose:any,children:any}){
 return <div className="sheetVeil" onClick={onClose}><div className="sheet" role="dialog" aria-label={title} onClick={(e:any)=>e.stopPropagation()}>
  <div className="sheetHead"><b>{title}</b><button type="button" className="ghostBtn" onClick={onClose}>Close</button></div>
  <div className="sheetBody">{children}</div>
 </div></div>;
}
function initialsOf(name:any){ return String(name||'?').split(/\s+/).filter(Boolean).slice(0,2).map((w:string)=>w.charAt(0).toUpperCase()).join('')||'?'; }
function hourOf(t:any){ var m=String(t||'').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i); if(!m)return 9; var h=Number(m[1])%12; if(m[3]&&/pm/i.test(m[3]))h+=12; if(!m[3])h=Number(m[1]); return h; }
function partOfDay(t:any){ var h=hourOf(t); return h<5?'Night':h<7?'Dawn':h<11?'Morning':h<14?'Mid-Day':h<17?'Afternoon':h<20?'Evening':'Night'; }
function vitalWord(c:any,m:any){ var p=Number(m)>0?Number(c)/Number(m):1; return p>=0.95?'Whole':p>=0.7?'Bruised':p>=0.45?'Hurt':p>=0.2?'Badly hurt':'Near death'; }
function poolWord(c:any,m:any){ var p=Number(m)>0?Number(c)/Number(m):1; return p>=0.9?'Full':p>=0.6?'Good':p>=0.3?'Low':p>0?'Spent':'Empty'; }
/* the portrait: kept on this device in Yumina's storage, like Black Clover's */
function usePortrait(api:any){
 const [url,setUrl]=React.useState('');
 React.useEffect(()=>{ try{ var r=api.storage&&api.storage.get?api.storage.get('eldoria-portrait-v1'):null; Promise.resolve(r).then((x:any)=>{ if(x&&/^data:image\//.test(x))setUrl(x); }).catch(()=>{}); }catch(_e){} },[]);
 function set(data:string){ setUrl(data); try{ if(data)api.storage&&api.storage.set&&api.storage.set('eldoria-portrait-v1',data); else api.storage&&api.storage.remove&&api.storage.remove('eldoria-portrait-v1'); }catch(_e){} }
 return [url,set] as any;
}
function readImageFile(file:any,maxW:number,maxH:number,cb:any){
 try{ var fr=new FileReader(); fr.onload=function(){ var img=new Image(); img.onload=function(){ try{ var sc=Math.min(1,maxW/img.width,maxH/img.height), w=Math.max(1,Math.round(img.width*sc)), h=Math.max(1,Math.round(img.height*sc)); var cv=document.createElement('canvas'); cv.width=w; cv.height=h; (cv.getContext('2d') as any).drawImage(img,0,0,w,h); cb('',cv.toDataURL('image/jpeg',0.84)); }catch(e){cb('That image could not be processed.');} }; img.onerror=function(){cb('That file is not an image this browser can read.');}; img.src=String(fr.result); }; fr.readAsDataURL(file); }catch(e){ cb('That file could not be read.'); }
}
function Portrait({url,name,size,onPick}:{url:string,name:any,size?:number,onPick?:any}){
 var sz=size||84;
 return <div className="portrait" style={{width:sz,height:sz*1.22}}>
  {url?<img src={url} alt=""/>:<span>{initialsOf(name)}</span>}
  {onPick?<label className="portraitPick" aria-label={url?'Change portrait':'Add a portrait'}><ElIcon n="plus" s={13}/><input type="file" accept="image/*" onChange={onPick}/></label>:null}
 </div>;
}

/* ---------- the shell: top bar, main, status panel (desktop), message box, nav ---------- */
var NAV_LEFT=[['home','home','Ledger'],['character','hero','Hero'],['skills','skills','Skills'],['quests','quest','Quests']];
var NAV_RIGHT=[['world','map','Map'],['magic','magic','Magic'],['inventory','gear','Gear'],['more','more','More']];
var MORE_GROUPS=[
 ['Adventuring',[['boards','scroll','Quest Boards'],['party','people','Party'],['guild','crown','Guild'],['training','sword','Training'],['callings','spark','Callings'],['conditions','heart','Wounds & Conditions']]],
 ['Wealth & craft',[['banking','coin','Banking'],['markets','scales','Markets'],['shops','coin','Merchants'],['crafting','anvil','Crafting']]],
 ['The world',[['events','flame','World Events'],['news','talk','News & Rumors'],['politics','crown','Politics'],['faiths','temple','Faiths'],['factions','scales','Factions'],['chronicle','book','History'],['codex','book','Codex']]],
 ['You',[['journal','scroll','Journal'],['audio','cog','Settings']]]
];
function Shell({api,v,screen,setScreen,lay,tsOpen,setTsOpen,body,reading,setReading}:any){
 var meta=SCREEN_META[screen]||['✦',titleCase(screen),''];
 var story=screen==='adventure';
 var sub=v['current-sublocation']&&v['current-sublocation']!=='Unassigned'?v['current-sublocation']:'';
 var title=story?(v['current-location']||'Eldoria'):screen==='home'?'The Ledger':meta[1];
 var subtitle=story?[sub,v['current-region'],v['world-date']].filter(Boolean).join(' · '):screen==='home'?(v['player-name']||'Adventurer')+' · '+(v['current-location']||''):meta[2];
 var ap=Number(v['attribute-points'])||0;
 function navBtn(x:any){ var on=screen===x[0]||(x[0]==='more'&&MORE_GROUPS.some((g:any)=>g[1].some((y:any)=>y[0]===screen))); return <button key={x[0]} type="button" className={'navBtn'+(on?' active':'')} aria-current={on?'page':undefined} onClick={()=>setScreen(x[0])}><ElIcon n={x[1]} s={19}/><span>{x[2]}</span>{x[0]==='character'&&ap>0?<em className="navBadge">{ap}</em>:null}</button>; }
 return <div className={'app screenTheme theme-'+screen+' lay-'+lay.mode+(reading?' reading':'')} data-ui={ELDORIA_UI_VERSION}>
  <header className="top elTop">
   <button type="button" className="elBrand" onClick={()=>setScreen('home')} aria-label="Eldoria: open the Ledger"><ElEmblem s={30}/></button>
   <div className="elTitle"><b>{title}</b><small>{subtitle}</small></div>
   <div className="elActions">
    {story?<button type="button" className={'iconBtn'+(reading?' on':'')} aria-pressed={reading} aria-label="Reading mode" title={reading?'Show the status strip and actions':'Reading mode: give the story the screen'} onClick={()=>setReading(!reading)}><ElIcon n="book" s={17}/></button>:null}
    <button type="button" className="iconBtn" title="Synchronize the world state" aria-label="Sync" onClick={()=>api.sendMessage('[sync]')}><ElIcon n="sync" s={17}/></button>
    <div className="tsWrap"><button type="button" className="iconBtn" title={v['in-combat']?'Unavailable during combat':'Skip ahead in time'} aria-label="Advance time" disabled={!!v['in-combat']} onClick={()=>setTsOpen(!tsOpen)}><ElIcon n="skip" s={17}/></button>
     {tsOpen?<div className="tsMenu">{['1 week','1 month','1 year'].map(t=><button key={t} type="button" className="chip" onClick={()=>{api.sendMessage('[timeskip: '+t+']');setTsOpen(false);}}>{titleCase(t)}</button>)}</div>:null}</div>
    <button type="button" className="rankSeal" onClick={()=>setScreen('guild')} title="Guild record"><small>Lv</small><b>{v['player-level']}</b><span>{v['guild-rank']}</span></button>
   </div>
  </header>
  <main><div className="screenBody">{body}</div></main>
  <SidePanel v={v} setScreen={setScreen}/>
  <div className="composer"><MessageInput /></div>
  <nav className="elNav" aria-label="Eldoria">
   {NAV_LEFT.map(navBtn)}
   <button type="button" className={'navEmblem'+(story?' active':'')} aria-label="The Chronicle (your story)" aria-current={story?'page':undefined} onClick={()=>setScreen('adventure')}><ElEmblem s={44}/><span>Chronicle</span></button>
   {NAV_RIGHT.map(navBtn)}
   {lay.mode==='desktop'?<div className="navMore">{MORE_GROUPS.map((g:any)=><div key={g[0]} className="navGroup"><small>{g[0]}</small>{g[1].map((x:any)=><button key={x[0]} type="button" className={'navSub'+(screen===x[0]?' active':'')} onClick={()=>setScreen(x[0])}><ElIcon n={x[1]} s={14}/>{x[2]}</button>)}</div>)}</div>:null}
  </nav>
 </div>;
}
