// @ts-nocheck
// Visual language of the reference art: smoked-steel panels, silver hairlines,
// gold accents, Cinzel headings and glowing blue selection.
import { ORIGINAL_CSS } from "./panels";

var THEME = `
:root{--e-bg:rgba(11,13,17,.84);--e-bg2:rgba(17,20,26,.94);--e-line:#58606c;--e-line2:#8e97a3;--e-gold:#c9a85a;--e-gold2:#e6cf8e;--e-text:#ece5d6;--e-muted:#9c978b;--e-blue:#5d95d8;--e-glow:rgba(93,149,216,.55);--e-hp:#c8402f;--e-mp:#2f74d8;--e-sp:#d09a2a}
html,body,#root{background:#07080a}
.eGame,.eCreator,.eLoading{position:fixed;inset:0;overflow:hidden;color:var(--e-text);font-family:"Cormorant Garamond","Palatino Linotype",Georgia,serif;user-select:none;-webkit-user-select:none}
.eGame h2,.eGame h3,.eCreator h2,.eLogo,.eWinHead h2,.eStep b,.eMenu span,.ePName b,.eQHead span,.eBtn,.eRound,.eTabs button{font-family:"Cinzel","Copperplate",Georgia,serif}
.eGame input,.eGame textarea,.eCreator input{user-select:text;-webkit-user-select:text}
.eView{position:absolute;inset:0}
.eView canvas{outline:none}
.eFrame,.ePanel,.eWin{position:absolute;background:linear-gradient(180deg,rgba(20,23,29,.9),rgba(9,11,14,.88));border:1px solid var(--e-line);box-shadow:0 0 0 1px rgba(0,0,0,.65),inset 0 0 0 1px rgba(255,255,255,.03),0 8px 26px rgba(0,0,0,.55);backdrop-filter:blur(3px)}
.eFrame:before,.ePanel:before,.eWin:before{content:"";position:absolute;inset:3px;border:1px solid rgba(201,168,90,.16);pointer-events:none}
.eFrame:after,.ePanel:after,.eWin:after{content:"";position:absolute;inset:-1px;pointer-events:none;background:
 linear-gradient(var(--e-line2),var(--e-line2)) top left/14px 2px no-repeat,linear-gradient(var(--e-line2),var(--e-line2)) top left/2px 14px no-repeat,
 linear-gradient(var(--e-line2),var(--e-line2)) top right/14px 2px no-repeat,linear-gradient(var(--e-line2),var(--e-line2)) top right/2px 14px no-repeat,
 linear-gradient(var(--e-line2),var(--e-line2)) bottom left/14px 2px no-repeat,linear-gradient(var(--e-line2),var(--e-line2)) bottom left/2px 14px no-repeat,
 linear-gradient(var(--e-line2),var(--e-line2)) bottom right/14px 2px no-repeat,linear-gradient(var(--e-line2),var(--e-line2)) bottom right/2px 14px no-repeat}
.eGame button,.eCreator button{font:inherit;color:inherit;cursor:pointer;background:none;border:0}
kbd{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 5px;border:1px solid #6a717c;background:linear-gradient(#22262d,#121418);color:#d8d2c4;font:600 12px Cinzel,Georgia,serif;border-radius:2px}
.muted{color:var(--e-muted)}
.eBtn{display:inline-flex;align-items:center;gap:10px;justify-content:center;padding:12px 26px;font-size:17px;letter-spacing:.06em;color:var(--e-text)!important;background:linear-gradient(180deg,#1d2a40,#0e1522)!important;border:1px solid #6d86a8!important;box-shadow:inset 0 0 0 1px rgba(0,0,0,.6),0 0 14px rgba(93,149,216,.25)}
.eBtn:hover{box-shadow:inset 0 0 0 1px rgba(0,0,0,.6),0 0 20px rgba(93,149,216,.55)}
.eBtn:disabled{opacity:.45;cursor:default}
.eBtn.small{padding:7px 14px;font-size:13px}
.eBtnRow{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
.eSeg{display:flex;gap:6px;flex-wrap:wrap}.eSeg button{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border:1px solid transparent!important;color:var(--e-muted)!important;background:rgba(255,255,255,.02)!important}
.eSeg button.on{border-color:var(--e-blue)!important;color:var(--e-text)!important;background:rgba(40,70,120,.35)!important;box-shadow:0 0 12px var(--e-glow)}
.eBar{position:relative;height:15px;background:#0a0b0e;border:1px solid #3d4249;box-shadow:inset 0 1px 3px #000;overflow:hidden;flex:1}
.eBarFill{position:absolute;inset:0 auto 0 0;transition:width .25s}
.eBar.hp .eBarFill{background:linear-gradient(180deg,#e2614c,#a32a1e 60%,#7a1c12)}
.eBar.mp .eBarFill{background:linear-gradient(180deg,#5aa0f0,#2a62c0 60%,#1a3f86)}
.eBar.sp .eBarFill{background:linear-gradient(180deg,#f2c45a,#c58a1c 60%,#8a5c10)}
.eBar span{position:absolute;right:6px;top:-1px;font:600 12px Georgia,serif;color:#f5efe2;text-shadow:0 1px 2px #000}
.ic-hp{color:#e2513f}.ic-mp{color:#4f95ea}.ic-sp{color:#f0b93a}.ic-gold{color:#e6c45a}
.eLogo{display:flex;flex-direction:column;align-items:center;line-height:1}
.eLogo b{font:700 40px Cinzel,Georgia,serif;letter-spacing:.06em;color:#e9e2d2;text-shadow:0 2px 0 #3a3226,0 0 22px rgba(255,230,180,.25);background:linear-gradient(180deg,#f6f0e4,#b8ab92);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.eLogo small{margin-top:6px;font:600 13px Cinzel,Georgia,serif;letter-spacing:.22em;color:#d6c7a2}
.eLogo.big b{font-size:64px}
.eLoading{display:grid;place-items:center;align-content:center;gap:16px;background:radial-gradient(circle at 50% 40%,#1a2130,#06070a 70%);z-index:50;text-align:center;padding:24px}
.eLoading p{font-size:19px;color:#cfc6b2;max-width:560px}
.eSpinner{width:42px;height:42px;border:3px solid rgba(201,168,90,.2);border-top-color:var(--e-gold);border-radius:50%;animation:espin 1s linear infinite}
@keyframes espin{to{transform:rotate(360deg)}}
.eIcFallback{display:inline-block;border:1px solid currentColor;border-radius:50%}

/* ------------------------------------------------------------ creator */
.eCreator{background:#0b0d10}
.eStage{position:absolute;inset:0}
.eStageHint{position:absolute;left:50%;bottom:62px;transform:translateX(-90%);display:flex;align-items:center;gap:8px;font-size:15px;color:#d8d2c4;text-shadow:0 1px 3px #000;pointer-events:none}
.eStageHint i{opacity:.5}
.eCreator .eLogo{position:absolute;top:10px;left:62px;z-index:3}
.eSteps{position:absolute;top:10px;left:50%;transform:translateX(-44%);display:flex;align-items:center;gap:6px;z-index:3;background:linear-gradient(180deg,rgba(16,19,24,.92),rgba(8,10,12,.86));border:1px solid var(--e-line);padding:6px 18px}
.eStep{display:flex;align-items:center;gap:12px;padding:6px 16px;color:var(--e-muted)!important;position:relative}
.eStep+.eStep:before{content:"⟶";position:absolute;left:-10px;color:#5c6470}
.eStep b{display:block;font-size:20px;color:#d6cfc0;font-weight:600}.eStep small{display:block;font-size:13px}
.eStepN{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;border:1.5px solid #6a7380;font:600 20px Cinzel,Georgia,serif;color:#cfd6df;background:radial-gradient(circle,#18202c,#0b0e13)}
.eStep.on .eStepN{border-color:#86b4ec;box-shadow:0 0 14px var(--e-glow),inset 0 0 10px rgba(93,149,216,.4);color:#fff}
.eStep.on b{color:#fff}.eStep.done .eStepN{border-color:var(--e-gold);color:var(--e-gold2)}
.ePanel{z-index:2;padding:14px 18px;overflow:auto;scrollbar-width:thin;scrollbar-color:#3a414b transparent}
.ePanelHead{display:flex;align-items:center;gap:12px;margin:0 0 6px}.ePanelHead h2{margin:0;font-size:21px;letter-spacing:.08em;font-weight:600;font-variant:small-caps;color:#ece4d2}
.ePanelHead.sub{margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.07)}
.ePanelHead svg{color:#cbbf9f}
.eLede{margin:0 0 10px;color:#bdb5a5;font-size:15.5px;line-height:1.3}
.eHint{margin:6px 0 0;color:#b6ae9e;font-size:14.5px;line-height:1.3}.eHint em{color:var(--e-muted)}
.eIdentity{top:104px;left:12px;width:448px;bottom:76px}
.eRow{display:grid;grid-template-columns:96px 1fr;align-items:center;gap:10px;margin:7px 0;font-size:17px}
.eRow.top{align-items:start}.eRow label{color:#d6cfc0}
.eName{display:flex;gap:8px}.eName input,.eMarks{flex:1;background:rgba(5,6,8,.75);border:1px solid #59616c;color:var(--e-text);padding:8px 12px;font:17px "Cormorant Garamond",Georgia,serif;outline:none}
.eName input:focus,.eMarks:focus{border-color:var(--e-blue);box-shadow:0 0 10px var(--e-glow)}
.eName button{width:40px;border:1px solid #59616c!important;background:rgba(5,6,8,.75)!important;display:grid;place-items:center}
.eSel{display:flex;align-items:center;gap:6px;border:1px solid #4c535d;background:rgba(5,6,8,.6);height:36px;position:relative;max-width:260px}
.eSel span{flex:1;text-align:center;font-size:16.5px}.eSel button{width:34px;height:100%;display:grid;place-items:center;color:#d8d0c0!important}
.eSel em{position:absolute;right:-56px;font-style:normal;color:var(--e-muted);font-size:15px}
.ePorts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.ePort{display:flex;flex-direction:column;align-items:center;gap:3px;padding:3px!important;border:1px solid #444b55!important;background:rgba(5,6,8,.5)!important}
.ePort img,.ePortPh{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:radial-gradient(circle at 50% 35%,#2b3442,#0d1015)}
.ePort small{font-size:14px;color:#d6cfc0}
.ePort.on,.eCall.on,.eRealm.on{border-color:#8fbaf0!important;box-shadow:0 0 0 1px #2b5fa6,0 0 16px var(--e-glow)}
.eFaces{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:8px 0 10px}
.eSw{display:flex;gap:12px}.eSw button{width:28px;height:28px;border-radius:50%;border:2px solid #2a2e34!important;box-shadow:inset 0 2px 4px rgba(0,0,0,.4)}
.eSw button.on{outline:2px solid #e8e2d4;outline-offset:2px;box-shadow:0 0 10px var(--e-glow)}
.eAttrs{top:104px;right:286px;width:376px}
.eAttrGrid{display:grid;grid-template-columns:1fr 1fr;gap:4px 18px}
.eAttr{display:grid;grid-template-columns:32px 1fr auto;align-items:center;gap:8px;font-size:16px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.eAttr b{font:600 18px Georgia,serif}.eAttrIc{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;border:1px solid #59616c;background:radial-gradient(#252b33,#0e1014);color:#cbd3dc}
.eSummary{top:104px;right:12px;width:262px}
.eSumRow{display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:16.5px;border-bottom:1px solid rgba(255,255,255,.05)}.eSumRow b{font-weight:600}
.eSumRow span{display:flex;align-items:center;gap:6px}.eSumRow.hp svg{color:#e2513f}.eSumRow.mp svg{color:#4f95ea}.eSumRow.sp svg{color:#f0b93a}
.eCallings{top:352px;right:12px;width:650px}
.eCallWrap{display:flex;gap:12px}
.eCallGrid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;flex:1}
.eCallGrid.sp{grid-template-columns:repeat(3,1fr)}
.eSpecial{width:186px;display:flex;flex-direction:column}.eSpecialHead{font:600 11px Cinzel,Georgia,serif;letter-spacing:.14em;color:#b9b19f;text-align:center;margin:-4px 0 4px}
.eCall,.eRealm{display:flex;flex-direction:column;align-items:stretch;padding:2px!important;border:1px solid #444b55!important;background:rgba(5,6,8,.55)!important;position:relative}
.eCall img,.eCall .ePortPh{width:100%;aspect-ratio:.8;object-fit:cover;display:block;background:radial-gradient(circle at 50% 30%,#2b3442,#0d1015)}
.eCall.tall img,.eCall.tall .ePortPh{aspect-ratio:.58}
.eCall small,.eRealm small{position:absolute;left:0;right:0;bottom:0;padding:10px 2px 3px;font-size:13px;text-align:center;background:linear-gradient(transparent,rgba(0,0,0,.85));color:#f0e9da;line-height:1.05}
.eRealms{top:672px;right:12px;width:650px;bottom:76px}
.eRealmGrid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.eRealm img,.eRealm .ePortPh{width:100%;aspect-ratio:.87;object-fit:cover;display:block}
.eBack{position:absolute;left:12px;bottom:12px;z-index:3;min-width:176px}
.eNext{position:absolute;right:12px;bottom:12px;z-index:3;min-width:300px}
@media (max-height:900px){.eCallings{top:330px}.eRealms{top:628px}.eLogo b{font-size:38px}}
@media (max-width:1280px){.eCreator{overflow:auto}.eAttrs{right:12px;top:96px;width:330px}.eSummary{top:104px;right:350px;width:240px}.eCallings,.eRealms{width:560px}.eIdentity{width:400px}}
@media (max-width:1050px){
 .eCreator{position:fixed;overflow:auto;display:flex;flex-direction:column;padding:0 10px 90px}
 .eCreator .eLogo{position:static;margin:10px auto 4px}.eSteps{position:static;transform:none;margin:0 auto 8px;padding:4px}.eStep{padding:4px 8px}.eStep small{display:none}.eStep b{font-size:15px}.eStepN{width:32px;height:32px;font-size:16px}
 .eStage{position:relative;inset:auto;height:46vh;min-height:300px;flex:none;border:1px solid var(--e-line)}
 .eStageHint{bottom:8px;transform:translateX(-50%)}
 .ePanel{position:relative;inset:auto!important;width:auto!important;margin-top:10px}
 .eCreator.step1 .eAttrs,.eCreator.step1 .eSummary,.eCreator.step1 .eCallings,.eCreator.step1 .eRealms,.eCreator.step2 .eIdentity,.eCreator.step2 .eRealms,.eCreator.step3 .eIdentity,.eCreator.step3 .eCallings,.eCreator.step3 .eAttrs{display:none}
 .eCallGrid{grid-template-columns:repeat(4,1fr)}.eCallWrap{flex-direction:column}.eSpecial{width:auto}.eRealmGrid{grid-template-columns:repeat(4,1fr)}
 .eBack,.eNext{position:fixed;bottom:10px;min-width:0}.eBack{left:10px}.eNext{right:10px;left:120px}
 .eSel em{position:static}
}

/* ------------------------------------------------------------ in-game HUD */
.eGame{background:#000}
.eGame.hurt:after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 140px rgba(200,20,10,.55);z-index:20}
.ePlayer{top:12px;left:12px;width:368px;display:flex;gap:12px;padding:8px;z-index:5}
.ePortrait{width:104px;height:104px;border:1px solid #6a717c;background:radial-gradient(circle at 50% 35%,#2b3442,#0d1015);display:grid;place-items:center;overflow:hidden;flex:none}
.ePortrait img{width:100%;height:100%;object-fit:cover}
.ePlayerInfo{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.ePName{display:flex;justify-content:space-between;align-items:baseline}.ePName b{font-size:22px;font-weight:600}.ePName span{font:600 18px Cinzel,Georgia,serif;color:#e8e2d4}
.eRank{display:flex;align-items:center;gap:5px;font-size:14.5px;color:#c9c2b2}.eRank b{margin-left:auto;font-weight:500;color:#ddd5c4}
.eBars{display:flex;flex-direction:column;gap:5px;margin-top:2px}.eBars>div{display:flex;align-items:center;gap:6px}
.eMenuToggle{position:absolute;top:136px;left:12px;z-index:6;width:38px;height:38px;display:grid!important;place-items:center;background:var(--e-bg2)!important;border:1px solid var(--e-line)!important}
.eMenu{top:180px;left:12px;width:244px;max-height:calc(100vh - 290px);overflow:auto;z-index:5;padding:8px 6px;display:flex;flex-direction:column}
.eMenu button{display:flex;align-items:center;gap:12px;padding:6px 10px;font-size:15.5px;color:#d9d2c3!important;letter-spacing:.02em;text-align:left;border-bottom:1px solid rgba(255,255,255,.04)!important}
.eMenu button svg{color:#c9bfa2;flex:none}.eMenu button span{flex:1}
.eMenu button:hover,.eMenu button.on{background:linear-gradient(90deg,rgba(70,100,150,.35),transparent)!important;color:#fff!important}
.eSep{height:10px}
.eParty{position:absolute;left:12px;bottom:16px;display:flex;flex-direction:column;gap:8px;z-index:4;width:226px}
.eMate{position:relative;display:flex;gap:10px;padding:6px 8px}.eMate b{display:block;font-size:15px}.eMate small{display:block;font-size:13px;color:var(--e-muted)}
.eMate .eBar{height:7px;margin-top:4px}.eMateP{width:52px;height:52px;border:1px solid #5a616c;display:grid;place-items:center;background:#0f1216;color:#9aa}
.eMate>div:last-child{flex:1}
.eWhere{top:12px;right:12px;display:flex;gap:10px;padding:12px 12px 12px 16px;z-index:5}
.eWhereText{width:186px;display:flex;flex-direction:column}
.eWhereText h3{margin:0;font-size:clamp(17px,1.4vw,23px);font-weight:600;line-height:1.05}.eWhereText>small{font-size:15px;color:#c8c0ae;margin:2px 0 8px}
.eTime b{display:block;font:600 16px Georgia,serif}.eTime span{display:block;font-size:13.5px;color:#cfc8b8}
.eWx{display:flex;flex-direction:column;gap:3px;margin-top:8px;font-size:13.5px;color:#d0c9b9}.eWx span{display:flex;gap:6px;align-items:center}
.eMini{position:relative;width:190px;height:190px;flex:none;cursor:pointer}
.eMini canvas{position:absolute;inset:0;width:100%;height:100%;border-radius:50%}
.eMiniRing{position:absolute;inset:-4px;border-radius:50%;border:2px solid #7d8590;box-shadow:inset 0 0 0 3px rgba(0,0,0,.6),0 0 0 1px #000,0 0 12px rgba(0,0,0,.8);pointer-events:none}
.eCard{position:absolute;transform:translate(-50%,-50%);font:700 15px Cinzel,Georgia,serif;color:#f0eadc;text-shadow:0 0 3px #000,0 0 6px #000;pointer-events:none}
.eCard.N{color:#ffd88a}
.eQuests{top:236px;right:12px;width:376px;z-index:5;padding:6px 12px 10px}
.eQHead{display:flex;width:100%;align-items:center;gap:10px;padding:6px 0!important;font-size:17px;letter-spacing:.06em;color:#ece4d2!important;border-bottom:1px solid rgba(255,255,255,.07)!important}
.eQHead span{flex:1;text-align:left;font-variant:small-caps}
.eQ{padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)}.eQ b{display:flex;gap:7px;align-items:center;color:#e6c97a;font-weight:600;font-size:16.5px}
.eQ p{margin:3px 0 0 20px;font-size:14.5px;color:#d6cfc0;line-height:1.25;display:flex;gap:8px}.eQ p i{flex:none;width:7px;height:7px;margin-top:6px;border:1px solid #d6cfc0;border-radius:50%}
.eQ small{display:block;margin:3px 0 0 20px;color:var(--e-muted)}.eQEmpty{color:var(--e-muted);font-size:14.5px;margin:8px 0 0}
.eTarget{top:14px;left:50%;transform:translateX(-50%);width:360px;padding:8px 12px;z-index:5;text-align:center}.eTarget b{font-size:18px}.eTarget small{display:block;color:var(--e-muted);font-size:13px;margin-bottom:5px}
.eLog{position:absolute;left:272px;bottom:96px;width:min(520px,40vw);z-index:4;display:flex;flex-direction:column;gap:2px;pointer-events:none;opacity:.55;transition:opacity .3s}
.eLog.on{opacity:1}.eLogL{font:13px Georgia,serif;color:#d8d2c4;background:rgba(0,0,0,.55);padding:2px 8px;border-left:2px solid #5a616c}
.eLogL.hit{border-color:#e0b040}.eLogL.hurt{border-color:#e05040;color:#ffc8c0}.eLogL.kill{border-color:#7ae07a;color:#d0ffd0}.eLogL.heal{border-color:#60d080}.eLogL.loot{border-color:#e6c45a}
.ePrompt{position:absolute;left:50%;bottom:168px;transform:translateX(-50%);z-index:6;display:flex;align-items:center;gap:10px;padding:8px 16px!important;background:rgba(8,10,14,.82)!important;border:1px solid #6a717c!important;font-size:17px}
.eNpcMenu{left:62%;top:44%;width:236px;z-index:7;padding:0}
.eNpcHead{display:flex;gap:10px;align-items:center;padding:10px;border-bottom:1px solid rgba(255,255,255,.08)}.eNpcHead img{width:44px;height:44px;border:1px solid #5a616c}.eNpcHead b{display:block;font-size:17px}.eNpcHead small{display:block;color:var(--e-muted);font-size:13px}
.eMenuItem{display:flex;width:100%;align-items:center;gap:14px;padding:9px 14px!important;font-size:17px;border-bottom:1px solid rgba(255,255,255,.05)!important;text-align:left}
.eMenuItem.first{background:linear-gradient(90deg,rgba(70,110,170,.45),rgba(40,60,100,.15))!important;box-shadow:inset 0 0 0 1px #5d8fd0}
.eMenuItem:hover{background:rgba(70,110,170,.25)!important}.eMenuItem.dim{color:var(--e-muted)!important}.eMenuItem svg{color:#c9bfa2}
.eInspect{padding:10px 12px;font-size:15px}.eInspect p{margin:0 0 8px;line-height:1.3}
.eDialog{left:50%;bottom:98px;transform:translateX(-50%);width:min(760px,calc(100vw - 680px));min-width:460px;z-index:8;display:flex;flex-direction:column;max-height:56vh;padding:0}
.eDlgHead{display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.08)}.eDlgHead img{width:40px;height:40px;border:1px solid #5a616c}
.eDlgHead b{display:block;font-size:17px}.eDlgHead small{display:block;color:var(--e-muted);font-size:13px}.eDlgHead>div{flex:1}
.eLink{display:flex;align-items:center;gap:5px;color:#9fc0ea!important;font-size:14px}
.eX{width:30px;height:30px;display:grid;place-items:center;color:#c8c0b0!important}
.eDlgText{padding:10px 16px;overflow:auto;font-size:17.5px;line-height:1.42;user-select:text;-webkit-user-select:text;flex:1;min-height:60px}
.eDlgText p{margin:0 0 9px}.eDlgText em{color:#e6dcc6}.eDlgText strong{color:#f4e6c2}.eErr{color:#ff9a8a}
.eChips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 8px}.eChips button{padding:5px 10px!important;border:1px solid #4f6f9a!important;background:rgba(30,50,80,.4)!important;font-size:14.5px}
.eCompose{display:flex;gap:8px;padding:8px 10px;border-top:1px solid rgba(255,255,255,.08)}
.eCompose textarea{flex:1;resize:none;background:rgba(4,5,7,.8);border:1px solid #545c67;color:var(--e-text);padding:8px 10px;font:16.5px "Cormorant Garamond",Georgia,serif;outline:none}
.eCompose textarea:focus{border-color:var(--e-blue)}
.eTalkBtn{position:absolute;left:50%;bottom:98px;transform:translateX(-50%);z-index:6;display:flex;align-items:center;gap:8px;padding:6px 14px!important;background:rgba(8,10,14,.75)!important;border:1px solid #59616c!important;font:600 14px Cinzel,Georgia,serif;letter-spacing:.06em}
.eDot{width:8px;height:8px;border-radius:50%;background:#7fb6ff;box-shadow:0 0 8px #7fb6ff;animation:epulse 1s infinite}
@keyframes epulse{50%{opacity:.3}}
.eHotbar{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);z-index:6;display:flex;flex-direction:column;align-items:center;gap:4px}
.eRes{display:flex;align-items:center;gap:5px;font:600 12px Cinzel,Georgia,serif;letter-spacing:.1em;color:#e6c97a;background:rgba(0,0,0,.5);padding:2px 10px}
.eRes i{width:10px;height:10px;transform:rotate(45deg);border:1px solid #c9a85a;background:#1a1408}.eRes i.on{background:#f0c860;box-shadow:0 0 8px #f0c860}
.eSlots{display:flex;gap:4px;padding:6px 8px;background:linear-gradient(180deg,rgba(18,21,27,.92),rgba(6,7,9,.92));border:1px solid var(--e-line);box-shadow:0 0 0 1px #000,0 6px 20px rgba(0,0,0,.6)}
.eSlot{position:relative;width:58px;height:58px;display:grid;place-items:center;border:1px solid #6a7280!important;background:radial-gradient(circle at 50% 35%,#3a4250,#12151a)!important;color:#eef!important;overflow:hidden}
.eSlot.steel{background:radial-gradient(circle at 50% 35%,#5a6270,#14171c)!important}.eSlot.arcane{background:radial-gradient(circle at 50% 35%,#3a6ad8,#101a3a)!important}.eSlot.fire{background:radial-gradient(circle at 50% 35%,#e0782a,#3a1408)!important}
.eSlot.ice{background:radial-gradient(circle at 50% 35%,#5ab0f0,#0a2038)!important}.eSlot.holy{background:radial-gradient(circle at 50% 35%,#e8c870,#3a2a0a)!important}.eSlot.red{background:radial-gradient(circle at 50% 35%,#c83a30,#2a0806)!important}
.eSlot.blue{background:radial-gradient(circle at 50% 35%,#3a6ae0,#081638)!important}.eSlot.green{background:radial-gradient(circle at 50% 35%,#5aa040,#0c1e08)!important}.eSlot.wood{background:radial-gradient(circle at 50% 35%,#a0784a,#2a1a0a)!important}
.eSlot.off{filter:grayscale(.8) brightness(.55)}.eSlot.empty{opacity:.5}
.eSlot svg{filter:drop-shadow(0 1px 2px #000)}
.eSlot kbd{position:absolute;bottom:-1px;left:50%;transform:translate(-50%,0);min-width:16px;height:16px;font-size:10px;padding:0 3px}
.eSlot em{position:absolute;right:3px;bottom:2px;font:600 12px Georgia,serif;font-style:normal;text-shadow:0 1px 2px #000}
.eCd{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.6)}
.eWallet{right:12px;bottom:76px;display:flex;gap:18px;padding:7px 14px;z-index:5;font-size:16px}.eWallet span{display:flex;align-items:center;gap:6px}.eWallet b{font-family:Georgia,serif;font-weight:600}
.eQuick{position:absolute;right:12px;bottom:12px;display:flex;gap:6px;z-index:5}
.eRound{width:54px;height:54px;display:grid;place-items:center;border:1px solid #6a717c!important;background:radial-gradient(circle at 50% 35%,#2a313b,#0b0d11)!important;color:#d8d0c0!important;box-shadow:0 0 0 1px #000,0 4px 12px rgba(0,0,0,.6)}
.eRound:hover,.eRound.on{border-color:#8fbaf0!important;box-shadow:0 0 14px var(--e-glow)}
.eStream{position:absolute;top:56px;left:50%;transform:translateX(-50%);font-size:13px;color:#cfc6b2;background:rgba(0,0,0,.5);padding:2px 10px;z-index:4}
.eDown{position:absolute;inset:0;display:grid;place-content:center;text-align:center;background:radial-gradient(circle,rgba(40,0,0,.2),rgba(0,0,0,.75));z-index:7;pointer-events:none}.eDown h2{font-size:44px;margin:0;color:#e8b0a0;letter-spacing:.1em}.eDown p{font-size:18px;max-width:520px}
/* windows */
.eWinBack{position:absolute;inset:0;z-index:20;display:grid;place-items:center;background:rgba(0,0,0,.35)}
.eWin{position:relative;width:min(880px,94vw);max-height:86vh;display:flex;flex-direction:column}
.eWinBack.wide .eWin{width:min(1320px,96vw);height:88vh;max-height:88vh}
.eWinHead{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.08)}.eWinHead h2{margin:0;font-size:22px;letter-spacing:.08em;font-variant:small-caps;font-weight:600}
.eWinHead>svg{color:#cbbf9f}.eWinHead .eX{margin-left:auto}
.eTabs{display:flex;gap:4px;margin-left:16px}.eTabs button{padding:5px 12px;font-size:13.5px;color:var(--e-muted)!important;border:1px solid transparent!important}.eTabs button.on{color:#fff!important;border-color:#5d8fd0!important;background:rgba(40,70,120,.35)!important}
.eWinBody{overflow:auto;flex:1;min-height:0;padding:4px 6px}
.ePanelBody{--ink:#0b0d11;--panel:#15171d;--panel2:#0d0f14;--metal:#6a7380;--metal2:#c4ced8;--accent:#3d5a86;--glow:#89b8dc;--rune:#a9d7f0;--paper:#e9e0cd;--muted:#a8a395;color:var(--e-text)}
.ePanelBody .screen{padding:8px 10px 16px;display:flex;flex-direction:column;gap:12px}
.ePanelBody .card{background:rgba(255,255,255,.025)!important;border:1px solid rgba(255,255,255,.08)!important;box-shadow:none!important}
.eKeys{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px}.eKeys div{display:flex;gap:10px;align-items:center;font-size:15px}
/* map */
.eMapWin .eWinBody{padding:0;overflow:hidden}
.eMap{display:flex;height:100%}
.eMapCanvas{position:relative;flex:1;min-width:0;background:#1a150e;overflow:hidden;cursor:grab}
.eMapCanvas canvas{display:block;touch-action:none}
.eMapLoading{position:absolute;inset:0;display:grid;place-items:center;font-size:20px;color:#e8d8b0;background:rgba(20,16,10,.6)}
.eMapTools{position:absolute;right:12px;top:12px;display:flex;flex-direction:column;gap:6px}.eMapTools button{width:36px;height:36px;display:grid;place-items:center;background:rgba(20,16,10,.85)!important;border:1px solid #8a7450!important;color:#f0e0b8!important}
.eRose{position:absolute;left:16px;top:14px;width:60px;height:60px;display:grid;place-items:center;color:rgba(60,40,20,.7)}.eRose span{position:absolute;font:700 12px Cinzel,serif;color:#3a2a14}.eRose .n{top:-6px}.eRose .s{bottom:-6px}.eRose .e{right:-6px}.eRose .w{left:-6px}
.eMapSide{width:270px;padding:14px;border-left:1px solid rgba(255,255,255,.08);overflow:auto;font-size:15px}
.eMapStat{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.06)}.eMapStat small{display:block;color:var(--e-muted)}
.eMapStat:first-child{flex-direction:column;align-items:flex-start}.eMapStat:first-child b{font-size:18px}
.eMapSel{margin:12px 0;padding:10px;border:1px solid #5d8fd0;background:rgba(30,50,80,.3)}.eMapSel h3{margin:0;font-size:18px}.eMapSel small{color:var(--e-muted)}.eMapSel p{margin:6px 0}
.eLegend{margin-top:14px;display:flex;flex-direction:column;gap:5px;font-size:14px;color:#cfc8b8}.eLegend i{display:inline-block;width:10px;height:10px;margin-right:8px;border:1px solid #1a1208}
.eChronWin .eWinBody{padding:0;display:flex;flex-direction:column}
.eChron{display:flex;flex-direction:column;height:100%;min-height:0}.eChronList{flex:1;min-height:0;overflow:auto;padding:6px 10px;user-select:text;-webkit-user-select:text}
.eMapTitle{position:absolute;left:18px;top:12px;pointer-events:none;display:flex;flex-direction:column;max-width:360px;text-shadow:0 2px 6px #000}
.eMapTitle b{font:700 30px Cinzel,Georgia,serif;letter-spacing:.05em;background:linear-gradient(180deg,#fff2c0,#d8a640 55%,#8a5a18);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 2px 2px rgba(0,0,0,.8))}
.eMapTitle.big b{font-size:clamp(40px,5vw,70px)}.eMapTitle small{font:600 11.5px Cinzel,Georgia,serif;letter-spacing:.1em;color:#efe2c0;margin-top:2px}.eMapTitle.big small{font-size:14px}
.eMapTitle p{margin:10px 0 0;font-size:16px;line-height:1.3;color:#e6dcc6}
.eBeyond{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);width:min(340px,60%);padding:10px 26px;text-align:center;pointer-events:none;background:linear-gradient(180deg,#e9d6a6,#cdb07a);color:#3a2610;border-radius:3px;box-shadow:0 6px 18px rgba(0,0,0,.6),inset 0 0 18px rgba(120,80,30,.45)}
.eBeyond:before,.eBeyond:after{content:"";position:absolute;top:-4px;bottom:-4px;width:14px;border-radius:7px;background:linear-gradient(90deg,#9a7848,#e6d0a0,#9a7848)}.eBeyond:before{left:-8px}.eBeyond:after{right:-8px}
.eBeyond b{display:block;font:700 15px Cinzel,Georgia,serif}.eBeyond span{font-size:14px;line-height:1.2}
.eMapTabs{margin:0 0 10px;flex-wrap:wrap}
.eHeraldry h4{margin:2px 0 8px;font:600 16px Cinzel,Georgia,serif;letter-spacing:.06em;color:#e6c97a}
.eHeraldry button{display:flex;gap:10px;align-items:center;width:100%;text-align:left;padding:6px 4px!important;border-bottom:1px solid rgba(255,255,255,.06)!important}
.eHeraldry button:hover{background:rgba(70,110,170,.18)!important}.eHeraldry img{width:40px;height:40px;flex:none}
.eHeraldry b{display:block;font:600 14.5px Cinzel,Georgia,serif;color:#e6c97a}.eHeraldry small{display:block;font-size:13.5px;color:#cfc6b2;line-height:1.2}
.eLegend i.lane{background:none!important;border:0!important;border-top:2px dashed #e6e0ce!important;height:0;width:14px}
.eMapCanvas{background:#0a1626}
/* touch */
.eTouch{position:absolute;inset:auto 0 90px 0;height:0;z-index:6}
.eStick{position:absolute;left:24px;bottom:30px;width:120px;height:120px;border-radius:50%;background:rgba(10,12,16,.45);border:1px solid rgba(200,200,220,.35);touch-action:none}
.eKnob{position:absolute;left:38px;top:38px;width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#7a8494,#2a3038);border:1px solid #9aa4b0}
.eActs{position:absolute;right:18px;bottom:40px;display:grid;grid-template-columns:repeat(2,58px);gap:10px}
.eActs button{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#3a4250,#101318)!important;border:1px solid #7a8290!important;touch-action:manipulation}
.eActs button:first-child{width:70px;height:70px;grid-row:span 2;align-self:center;background:radial-gradient(circle at 50% 35%,#5a6270,#14171c)!important}

/* fold buttons and reopen pills: every HUD block can be put away and brought back */
.eFold{position:absolute;top:3px;right:3px;width:20px;height:20px;display:grid;place-items:center;padding:0!important;border:1px solid rgba(255,255,255,.12)!important;background:rgba(0,0,0,.45)!important;color:#bdb5a2!important;z-index:3;opacity:.55;transition:opacity .2s}
.eFold:hover,.touch .eFold{opacity:1}
.ePill{position:absolute;z-index:5;display:flex;align-items:center;gap:6px;height:34px;padding:0 12px!important;border:1px solid #59616c!important;background:rgba(8,10,14,.82)!important;color:#ddd5c3!important;font:600 13px Cinzel,Georgia,serif;letter-spacing:.05em;box-shadow:0 2px 10px rgba(0,0,0,.5)}
.ePill:hover{border-color:#8fbaf0!important}
.eQuestPill{top:236px;right:12px}.ePartyPill{left:12px;bottom:16px}.eLogPill{left:12px;bottom:96px}.eShowHud{top:12px;right:12px}
.ePortrait{padding:0!important;border:0!important;background:none!important;cursor:pointer}
.ePlayer .eFold{top:4px;right:4px}
.ePlayer.compact{width:auto;padding:5px 26px 5px 5px;gap:8px}.ePlayer.compact .ePortrait{width:58px;height:58px}.ePlayer.compact .ePName,.ePlayer.compact .eRank{display:none}.ePlayer.compact .ePlayerInfo{width:138px;justify-content:center}.ePlayer.compact .eBar{height:11px}.ePlayer.compact .eBar span{font-size:9.5px;line-height:11px}
.eWhere{padding-right:30px}.eWhereTools{position:absolute;top:3px;right:3px;display:flex;flex-direction:column;gap:3px}.eWhereTools .eFold{position:static}
.eWhere.noText{padding:8px 30px 8px 8px}.eWhere.noMini.noText{padding:6px 30px 6px 6px}
.eCompass{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;padding:0!important;border:1px solid #7d8590!important;background:radial-gradient(circle at 50% 35%,#2a313b,#0b0d11)!important;color:#e6dcc4!important}
.eCompass span{display:flex;flex-direction:column;align-items:center;line-height:1}.eCompass b{font:700 11px Cinzel,serif;color:#e0b050}
.eQuick.folded{gap:6px}.eQuick .eRound.fold{width:34px;border-radius:17px}
.eParty .eFold{top:-24px;right:auto;left:0}.eLog .eFold{position:relative;top:auto;right:auto;align-self:flex-start;pointer-events:auto;margin-bottom:2px}.eLog{pointer-events:none}.eLog .eFold{pointer-events:auto}
.eWallet{padding-right:30px}

/* turn-based combat */
.eInit{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:7;display:flex;align-items:stretch;gap:6px;max-width:calc(100vw - 820px);min-width:220px}
.eRoundNo{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 10px;background:rgba(8,10,14,.85);border:1px solid #6a5a34;color:#e6cf8e;font-family:Cinzel,serif}.eRoundNo small{font-size:10px;letter-spacing:.14em;color:#b9a77a}.eRoundNo b{font-size:22px;line-height:1}
.eInitRow{display:flex;gap:5px;overflow-x:auto;overflow-y:hidden;padding:2px;scrollbar-width:none}.eInitRow::-webkit-scrollbar{display:none}
.eChip{position:relative;flex:none;width:62px;display:flex!important;flex-direction:column;align-items:center;gap:3px;padding:4px 3px 3px!important;background:linear-gradient(180deg,rgba(24,27,34,.92),rgba(8,9,12,.92))!important;border:1px solid #4a515c!important;color:#d8d0c0!important;transition:transform .2s}
.eChip.monster{border-color:#6a3a34!important}.eChip.player{border-color:#4a6a9a!important}
.eChip.on{transform:translateY(3px) scale(1.08);border-color:#f0c040!important;box-shadow:0 0 14px rgba(240,192,64,.55)}
.eChip.tgt:not(.on){border-color:#e05040!important}.eChip.dead{opacity:.4;filter:grayscale(1)}
.eChipP{position:relative;width:40px;height:40px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#3a2a28,#100a0a);border:1px solid rgba(255,255,255,.18)}
.eChip.player .eChipP{background:radial-gradient(circle at 50% 35%,#2a3a50,#0a0e16)}.eChipP img{width:100%;height:100%;object-fit:cover}
.eChipX{position:absolute;inset:0;display:grid;place-items:center;color:#e05040;background:rgba(0,0,0,.4)}
.eChipHp{width:100%;height:4px;background:#2a0c0a;border:1px solid #000}.eChipHp i{display:block;height:100%;background:linear-gradient(90deg,#a02818,#e04a30)}.eChip.player .eChipHp i{background:linear-gradient(90deg,#2a8a3a,#5ad06a)}
.eChip span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:11px Georgia,serif}
.eBanner{position:absolute;left:50%;top:26%;transform:translateX(-50%);z-index:9;pointer-events:none;display:flex;flex-direction:column;align-items:center;animation:eBanner 1.5s ease forwards;text-align:center;white-space:nowrap}
.eBanner b{font:700 46px Cinzel,Georgia,serif;letter-spacing:.08em;color:#efe6d0;text-shadow:0 2px 0 #000,0 0 26px rgba(0,0,0,.9)}.eBanner small{font:16px Georgia,serif;color:#d6ccb6;text-shadow:0 1px 3px #000;margin-top:2px}
.eBanner.mine b{color:#f2d27a}.eBanner.foe b{color:#ef8a78;font-size:36px}.eBanner.after b{color:#f2d27a;font-size:58px}.eBanner.after{animation-duration:2s}
@keyframes eBanner{0%{opacity:0;transform:translate(-50%,10px) scale(.92)}12%{opacity:1;transform:translate(-50%,0) scale(1)}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-8px)}}
.eEcon{display:flex;align-items:center;gap:10px;padding:4px 12px;background:rgba(8,10,14,.86);border:1px solid #4a515c;font:13px Georgia,serif;color:#d8d0c0;white-space:nowrap}
.eEcon.wait{color:#c9b98a}
.ePip{display:flex;align-items:center;gap:5px;opacity:.35}.ePip.on{opacity:1}
.ePip i{display:inline-block;width:12px;height:12px}.ePip.act i{border-radius:50%;background:#4ac060;box-shadow:0 0 6px #4ac060}.ePip.bon i{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:12px solid #e8962a;filter:drop-shadow(0 0 4px #e8962a)}.ePip.rea i{transform:rotate(45deg) scale(.8);background:#a46ae0;box-shadow:0 0 6px #a46ae0}
.eMove{display:flex;align-items:center;gap:6px;color:#e8d070}.eMoveBar{display:inline-block;width:90px;height:7px;background:#2a2410;border:1px solid #000}.eMoveBar i{display:block;height:100%;background:linear-gradient(90deg,#b08a20,#f0d060)}.eMove b{font-weight:600;min-width:44px}
.eCost{position:absolute;top:3px;left:3px;width:9px;height:9px;pointer-events:none}.eCost.action{border-radius:50%;background:#4ac060;box-shadow:0 0 4px #4ac060}.eCost.bonus{width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid #e8962a}
.eSlot.end{background:radial-gradient(circle at 50% 35%,#a08030,#2a1e08)!important}
.eEndTurn{position:absolute;bottom:78px;right:16px;z-index:6;width:86px;height:86px;border-radius:50%;display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:0!important;border:2px solid #c9a85a!important;background:radial-gradient(circle at 50% 35%,#6a5520,#1a1408)!important;color:#f6e6b6!important;font:700 11px Cinzel,serif;letter-spacing:.06em;box-shadow:0 0 0 2px #000,0 0 22px rgba(201,168,90,.45)}
.eEndTurn.off{filter:grayscale(.9) brightness(.6);box-shadow:0 0 0 2px #000}
.eTip{position:fixed;z-index:12;pointer-events:none;width:230px;padding:7px 10px;background:linear-gradient(180deg,rgba(22,25,31,.96),rgba(8,9,12,.96));border:1px solid #6a717c;box-shadow:0 6px 20px rgba(0,0,0,.6);font:13px Georgia,serif;color:#e0d8c6;display:flex;flex-direction:column;gap:3px}
.eTip b{font:600 15px Cinzel,Georgia,serif}.eTip small{color:#a8a08e;font-size:12px}.eTip em{color:#a8a08e;font-style:normal}
.eTip.small{width:auto;max-width:240px;flex-direction:column}.eTip .ok{color:#9fe07a}.eTip .bad,.eTipNote.bad{color:#f08a7a}
.eTipRow{display:flex;align-items:center;gap:8px}.eHit{font:700 20px Georgia,serif}.eHit.good{color:#8fe07a}.eHit.mid{color:#f0d060}.eHit.bad{color:#f08a7a}
.eTipNote{color:#e8d070;font-size:12.5px}.eTipHint{color:#8a9ab0!important;font-style:italic}
.inBattle .eTarget{display:none}.inBattle .eLog{opacity:1;bottom:136px}.inBattle .eLogPill{bottom:136px}.inBattle .eWallet{display:none}

/* spellbook and item trays, aiming bar, statuses */
.eConds{display:flex;flex-wrap:wrap;gap:3px;margin-top:3px}.eConds span{font:11px Georgia,serif;padding:1px 6px;background:rgba(120,60,150,.45);border:1px solid rgba(200,160,255,.35);color:#eadcff}
.eTrayBtns{position:absolute;bottom:14px;left:calc(50% - 392px);z-index:6;display:flex;gap:6px}.eTrayBtns .eRound{width:46px;height:46px}
.eTray{left:50%;bottom:92px;transform:translateX(-50%);width:min(560px,calc(100vw - 24px));max-height:min(54vh,460px);z-index:9;display:flex;flex-direction:column}
.eTrayHead{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.08)}.eTrayHead b{font:600 18px Cinzel,serif;letter-spacing:.06em}.eTrayHead small{color:var(--e-muted);font-size:12.5px;flex:1;min-width:0}.eTrayHead .eX{margin-left:auto}
.eTrayList{overflow:auto;padding:4px;display:flex;flex-direction:column;gap:3px}
.eTrayRow{flex-shrink:0;display:flex!important;align-items:center;gap:10px;justify-content:space-between;text-align:left;padding:7px 10px!important;background:rgba(255,255,255,.03)!important;border:1px solid rgba(255,255,255,.07)!important;min-height:44px}
.eTrayRow:hover{background:rgba(70,110,170,.25)!important;border-color:#5d8fd0!important}.eTrayRow.off{opacity:.5}
.eTrayMain{min-width:0;flex:1;display:flex;flex-direction:column}.eTrayMain b{font:600 15px Cinzel,serif;color:#efe6d0}.eTrayMain small{color:#a8a08e;font-size:12.5px;line-height:1.3}
.eTrayMeta{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;align-items:center;font:12px Georgia,serif;color:#cfc6b2;max-width:46%}.eTrayMeta .mp{color:#7fb0ff;font-weight:600}.eTrayMeta em{flex-basis:100%;text-align:right;color:#e8967a;font-style:normal}
.eTrayMeta .cost{padding:1px 7px;border:1px solid #4a515c}.eTrayMeta .cost.action{color:#7ae07a;border-color:#3a7a4a}.eTrayMeta .cost.bonus{color:#f0a040;border-color:#8a5a20}.eTrayMeta .cost.reaction{color:#c08aff;border-color:#6a3a9a}
.eTargetBar{left:50%;top:92px;transform:translateX(-50%);width:min(520px,calc(100vw - 24px));z-index:9;padding:6px 10px;display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;border-color:#8a6ad0}
.eTBHead{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.eTBHead b{font:600 16px Cinzel,serif;color:#e6d8ff}.eTBHead span{color:#b8aed0;font-size:12.5px}
.eTargetBar{pointer-events:none}.eTargetBar button{pointer-events:auto}
.eTargetBar p{margin:0;font-size:14px;color:#e0d8c6;flex:1;min-width:140px}.eTargetBar p.bad{color:#f0a090}.eTBBtns{display:flex;gap:6px;margin-left:auto}
.eChoose{display:flex;gap:5px;flex-wrap:wrap}.eChoose button{padding:4px 10px!important;border:1px solid #5a616c!important;background:rgba(255,255,255,.05)!important;text-transform:capitalize}.eChoose button.on{border-color:#c8a0ff!important;background:rgba(150,100,220,.35)!important}
.eBtn.alt{background:transparent!important;border-color:#6a717c!important;color:#d0c8b8!important}
.eTip.spell{width:auto;min-width:170px;max-width:260px;z-index:13}.eTipRow2{display:flex;justify-content:space-between;gap:10px;font:12.5px Georgia,serif}.eTipRow2.foe b{color:#ffb0a0}.eTipRow2.party b{color:#9fd0ff}.eTipRow2 span{color:#e0d8c6;text-align:right}
.eAuto{padding:1px 8px!important;font:11px Georgia,serif;border:1px solid #4a515c!important;background:transparent!important;color:#8a8a8a!important;min-height:0!important}.eAuto.on{color:#c8a0ff!important;border-color:#8a6ad0!important}
.eMate.dead{opacity:.5;filter:grayscale(1)}
@media (max-width:1100px),(max-height:700px){.eTrayBtns{left:calc(50% - 300px)}.eTrayBtns .eRound{width:40px;height:40px}.eTargetBar{top:84px}}
@media (max-width:700px),(max-height:500px){.eTrayBtns{left:auto;right:6px;bottom:auto;top:auto;flex-direction:column}.eTray{bottom:6px;width:calc(100vw - 12px);max-height:62vh}.eTargetBar{top:146px;bottom:auto;width:calc(100vw - 12px);padding:5px 8px}.eTrayMeta{max-width:50%}.eAuto{display:none}}
.touch .eTrayBtns{display:none!important}
.eActs button.on{border-color:#8fbaf0!important;box-shadow:0 0 12px var(--e-glow)}
@media (max-height:500px) and (min-width:701px){.eTrayBtns{bottom:4px;right:140px;left:auto;flex-direction:row}.eTargetBar{left:6px;top:72px;transform:none;bottom:auto;width:260px}.eTray{bottom:4px;left:140px;right:140px;transform:none;width:auto;max-height:82vh}}
@media (max-width:1500px){.eDialog{width:min(640px,calc(100vw - 560px));min-width:400px}.eInit{max-width:calc(100vw - 700px)}}
@media (max-width:1100px),(max-height:700px){
 .ePlayer{width:290px;padding:6px}.ePortrait{width:72px;height:72px}.ePName b{font-size:18px}
 .eMenuToggle{display:grid!important;top:100px}.eMenu{top:144px;width:220px;max-height:calc(100vh - 260px);overflow:auto}.eMenu button{font-size:14px;padding:5px 8px}
 .eMini{width:130px;height:130px}.eWhereText{width:150px}.eWhereText h3{font-size:16px}.eQuests{top:236px;width:250px;font-size:14px}.eQuestPill{top:236px}
 .eSlot{width:44px;height:44px}.eSlot svg{width:20px;height:20px}
 .eDialog{left:8px;right:8px;transform:none;width:auto;min-width:0;bottom:80px;max-height:50vh}
 .eQuick .eRound{width:42px;height:42px}.eWallet{bottom:62px}
 .eInit{top:auto;bottom:128px;max-width:calc(100vw - 24px)}.eEndTurn{bottom:62px;width:70px;height:70px}.eLog{left:12px;bottom:140px;width:min(420px,60vw)}.eLogPill{bottom:140px}
}
/* phones: portrait and landscape share the compact pieces */
@media (max-width:700px),(max-height:500px){
 .eMenuToggle{display:grid!important;width:40px;height:40px}
 .eMenu{position:absolute;inset:auto 6px 6px 6px!important;top:auto!important;width:auto!important;max-height:60vh;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:2px;z-index:15;overflow:auto;padding:8px}
 .eMenu .eSep{display:none}.eMenu button{font-size:14px;padding:9px 8px;border:1px solid rgba(255,255,255,.06)!important}
 .eWinBack{place-items:stretch}.eWin,.eWinBack.wide .eWin{width:100vw!important;height:100%!important;max-height:100%!important}.eWinHead{padding:6px 8px;gap:8px;flex-wrap:wrap}
 .eWinHead h2{font-size:17px}.eTabs{order:3;width:100%;overflow-x:auto;display:flex;margin-left:0}.eTabs button{padding:4px 8px;font-size:12px;white-space:nowrap}
 .eDialog{left:6px;right:6px;bottom:auto;top:auto;max-height:52vh}.eDlgHead .eLink span{display:none}
 .eNpcMenu{left:auto;right:8px;top:22%}
 .eTalkBtn{display:none}
 .ePrompt{font-size:14px;padding:6px 12px!important}
 .eEndTurn{display:none!important}
 .eTip{width:200px;font-size:12px}.eHit{font-size:17px}
 .eBanner b{font-size:32px}.eBanner.foe b{font-size:24px}.eBanner.after b{font-size:40px}.eBanner small{font-size:13px}
 .eQuick .eRound{width:38px;height:38px}
 .eTouch .eActs button.talk{position:absolute;right:0;top:-58px;width:44px;height:44px}
 .eActs.battle button.end{background:radial-gradient(circle at 50% 35%,#6a5520,#1a1408)!important;border-color:#c9a85a!important;color:#f6e6b6!important}.eActs.battle button.end.off{filter:grayscale(.9) brightness(.6)}
}
@media (max-width:700px){
 .ePlayer,.ePlayer.compact{top:6px;left:6px;width:auto;padding:4px 24px 4px 4px;gap:6px}.ePlayer .ePortrait{width:48px;height:48px}.ePName,.eRank{display:none}.ePlayerInfo{width:118px;justify-content:center}.eBar{height:11px}.eBar span{font-size:9px;line-height:11px}.eBars{gap:2px}
 .eMenuToggle{top:66px!important;left:6px}
 .eWhere{top:6px;right:6px;padding:4px 26px 4px 4px}.eWhere .eWhereText{display:none}.eWhereTools .eFold:first-child{display:none}.eMini{width:96px;height:96px}.eCard{font-size:10px}
 .eQuests{top:112px;right:6px;width:min(250px,64vw);font-size:13px}.eQuestPill{top:112px;right:6px}.ePartyPill{left:6px;top:112px;bottom:auto}.eLogPill{left:6px;top:152px;bottom:auto}
 .eParty{display:none}
 .eLog{left:6px;right:6px;width:auto;bottom:200px}.eLogL{font-size:11.5px}
 .eHotbar{bottom:6px;left:6px;right:6px;transform:none}.eSlots{gap:2px;padding:3px;justify-content:center}.eSlot{width:calc((100vw - 34px) / 10);height:calc((100vw - 34px) / 10);max-width:44px;max-height:44px}.eSlot svg{width:16px;height:16px}.eSlot kbd{display:none}.eRes{font-size:12px}
 .eEcon{gap:6px;padding:3px 8px;font-size:11.5px;flex-wrap:wrap;justify-content:center}.eMoveBar{width:54px}
 .eWallet{display:none}
 .eQuick{right:6px;bottom:auto;top:112px;flex-direction:column}.eQuick.folded{top:auto;bottom:auto;top:108px}
 .eQuestPill,.eQuests{right:52px}
 .eInit{top:74px;bottom:auto;left:6px;right:6px;transform:none;max-width:none;min-width:0}.eChip{width:50px}.eChipP{width:32px;height:32px}.eRoundNo{padding:2px 6px}.eRoundNo b{font-size:18px}
 .inBattle .eMenuToggle,.inBattle .eQuests,.inBattle .eQuestPill,.inBattle .ePartyPill{display:none!important}
 .eTouch{bottom:62px}.eStick{left:10px;bottom:14px;width:104px;height:104px}.eKnob{left:30px;top:30px}.eActs{right:8px;bottom:14px;grid-template-columns:repeat(2,50px);gap:8px}.eActs button{width:50px;height:50px}.eActs button:first-child{width:60px;height:60px}
 .ePrompt{bottom:190px}.eDialog{bottom:64px}
 .eMap{flex-direction:column}.eMapTitle p,.eBeyond{display:none}.eMapSide{width:auto;max-height:34%;border-left:0;border-top:1px solid rgba(255,255,255,.08)}
}
@media (max-height:500px) and (min-width:701px){
 .ePlayer,.ePlayer.compact{top:6px;left:6px;padding:4px 24px 4px 4px;width:auto}.ePlayer .ePortrait{width:46px;height:46px}.ePName,.eRank{display:none}.ePlayerInfo{width:130px;justify-content:center}.eBar{height:11px}.eBar span{font-size:9px;line-height:11px}
 .eMenuToggle{top:6px!important;left:206px}
 .eWhere{top:6px;right:6px;padding:4px 26px 4px 4px}.eWhereText{width:150px}.eMini{width:92px;height:92px}
 .eQuests{top:6px;right:auto;left:256px;width:250px;max-height:50vh;overflow:auto;font-size:13px}.eQuestPill{top:6px;right:auto;left:256px}.ePartyPill{top:6px;left:320px;bottom:auto}.eLogPill{top:6px;left:384px;bottom:auto}
 .eParty{display:none}
 .eLog{left:150px;bottom:62px;width:min(380px,40vw)}
 .eHotbar{bottom:4px}.eSlot{width:36px;height:36px}.eSlot svg{width:17px;height:17px}.eSlot kbd{display:none}.eSlots{gap:2px;padding:3px}
 .eEcon{padding:2px 8px;font-size:11.5px}.eMoveBar{width:54px}
 .eWallet{display:none}
 .eQuick{right:6px;bottom:auto;top:110px;flex-direction:column}.eQuick .eRound{width:36px;height:36px}
 .eInit{top:6px;bottom:auto;left:50%;transform:translateX(-50%);max-width:calc(100vw - 600px);min-width:0}.eChip{width:48px}.eChipP{width:30px;height:30px}.eChip span{display:none}
 .eTouch{bottom:58px}.eStick{left:12px;bottom:0;width:100px;height:100px}.eKnob{left:28px;top:28px}.eActs{right:10px;bottom:0;grid-template-columns:repeat(2,48px);gap:8px}.eActs button{width:48px;height:48px}.eActs button:first-child{width:56px;height:56px}
 .ePrompt{bottom:66px}.eDialog{bottom:52px;left:140px;right:140px;max-height:70vh}
 .eBanner{top:20%}
}
`;
var LANDSCAPE = `
/* ---- phone / short landscape ------------------------------------------------------------------------------------
   One layout for every landscape screen under ~520px tall (iPhone SE to Pro Max, with or without Safari's bars). It replaces the
   shrunken desktop/portrait rules above rather than adding to them. Everything hangs off the safe-area insets: the notch on the
   long side, the rounded bottom corners and the home-indicator strip. env() is 0 where the host does not expose insets. */
.eGame{touch-action:manipulation;overscroll-behavior:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
.eGame .eView,.eGame .eView canvas,.eStick,.eKnob{touch-action:none}
.eGame .ePanelBody,.eGame .eTrayList,.eGame .eMenu,.eGame .eQuests,.eGame .eDlgBody{touch-action:pan-y;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}.eGame .eInit{touch-action:pan-x}
.eGame{--sl:env(safe-area-inset-left,0px);--sr:env(safe-area-inset-right,0px);--st:env(safe-area-inset-top,0px);--sb:env(safe-area-inset-bottom,0px)}
/* portrait phones: keep the top row out of the notch/status area and the bottom row above the home indicator */
@media (orientation:portrait) and (max-width:700px){
 .ePlayer,.ePlayer.compact,.eWhere{top:calc(var(--st) + 6px)}.eMenuToggle{top:calc(var(--st) + 66px)!important}
 .eQuests,.eQuestPill,.eQuick,.eQuick.folded,.ePartyPill{top:calc(var(--st) + 112px)}.eLogPill{top:calc(var(--st) + 152px)}.eInit{top:calc(var(--st) + 74px)}
 .eHotbar{bottom:calc(var(--sb) + 6px)}.eTouch{bottom:calc(var(--sb) + 62px)}.eLog{bottom:calc(var(--sb) + 200px)}.ePrompt{bottom:calc(var(--sb) + 190px)}
 .eWinBack{padding:var(--st) var(--sr) var(--sb) var(--sl)}
}

@media (orientation:landscape) and (max-height:520px){
 .eGame{--ml:calc(var(--sl) + 6px);--mr:calc(var(--sr) + 6px);--mt:calc(var(--st) + 6px);--mb:calc(var(--sb) + 6px);--eside:calc(var(--mr) + 140px)}
 /* top-left: player frame, then a column of buttons under it */
 .ePlayer,.ePlayer.compact{top:var(--mt);left:var(--ml);width:auto;padding:4px 24px 4px 4px;gap:6px}.ePlayer .ePortrait{width:46px;height:46px}.ePName,.eRank{display:none}.ePlayerInfo{width:128px;justify-content:center}.eBar{height:11px}.eBar span{font-size:9px;line-height:11px}
 .eMenuToggle{top:calc(var(--mt) + 60px)!important;left:var(--ml)!important;width:40px;height:40px}
 .eQuestPill,.ePartyPill,.eLogPill{right:auto;bottom:auto;left:var(--ml);height:32px;padding:0 10px!important;font-size:12px}
 .eQuestPill{top:calc(var(--mt) + 104px)}.ePartyPill{top:calc(var(--mt) + 140px)}.eLogPill{top:calc(var(--mt) + 176px)}
 .eQuests{top:calc(var(--mt) + 62px);left:calc(var(--ml) + 48px);right:auto;width:min(260px,40vw);max-height:calc(100vh - var(--mt) - var(--mb) - 70px);overflow:auto;font-size:13px}
 .eParty{display:none}
 /* top-right: minimap; the two folded quick buttons sit beside it, the unfolded set is a sheet under it */
 .eWhere{top:var(--mt);right:var(--mr);padding:4px 26px 4px 4px}.eWhere .eWhereText{display:none}.eMini{width:92px;height:92px}
 .eQuick,.eQuick.folded{top:var(--mt);right:var(--eside);bottom:auto;flex-direction:row;gap:6px}.eQuick .eRound{width:38px;height:38px}
 .eQuick:not(.folded){top:var(--mt);right:var(--eside);width:204px;flex-wrap:wrap;justify-content:flex-end;padding:6px;background:rgba(8,10,14,.92);border:1px solid #59616c;z-index:12}
 .eWallet{display:none}
 /* bottom: stick left, action buttons right, hotbar between */
 .eTouch{inset:auto 0 0 0;height:0}
 .eStick{left:calc(var(--ml) + 4px);bottom:var(--mb);width:96px;height:96px}.eKnob{left:26px;top:26px}
 .eActs{right:calc(var(--mr) + 4px);bottom:var(--mb);grid-template-columns:repeat(2,48px);gap:7px}.eActs button{width:48px;height:48px}.eActs button:first-child{width:56px;height:56px}
 .eHotbar{bottom:var(--mb);left:50%;right:auto;transform:translateX(-50%);max-width:calc(100vw - var(--sl) - var(--sr) - 250px)}.eSlot{width:34px;height:34px}.eSlot svg{width:16px;height:16px}.eSlot kbd{display:none}.eSlots{gap:2px;padding:3px}
 .eEcon{padding:2px 8px;font-size:11px;gap:6px}.eMoveBar{width:44px}
 .ePrompt{bottom:calc(var(--mb) + 82px);font-size:13px;padding:5px 12px!important}
 .eLog{left:calc(var(--ml) + 56px);bottom:calc(var(--mb) + 62px);width:min(360px,38vw)}.inBattle .eLog{bottom:calc(var(--mb) + 62px)}
 /* combat: turn order between the player frame and the minimap, scrolling when long */
 .eInit{top:var(--mt);bottom:auto;left:calc(var(--ml) + 216px);right:var(--eside);transform:none;max-width:none;min-width:0;overflow-x:auto;overscroll-behavior:contain;scrollbar-width:none}.eInit::-webkit-scrollbar{display:none}
 .eChip{width:46px}.eChipP{width:28px;height:28px}.eChip span{display:none}.eRoundNo{padding:2px 6px}.eRoundNo b{font-size:17px}
 .inBattle .eMenuToggle,.inBattle .eQuests,.inBattle .eQuestPill,.inBattle .ePartyPill,.inBattle .eQuick{display:none!important}.inBattle .eLogPill{top:calc(var(--mt) + 60px)}
 .eEndTurn{display:none!important}
 .eTarget{top:var(--mt);left:calc(var(--ml) + 216px);right:var(--eside);transform:none;width:auto;padding:4px 10px}.eTarget b{font-size:15px}.eTarget small{font-size:11px;margin-bottom:3px}
 /* trays, dialogs, menus: between the stick and the buttons, never under the turn order */
 .eTray{bottom:var(--mb);left:calc(var(--sl) + 118px);right:calc(var(--sr) + 118px);transform:none;width:auto;max-height:calc(100vh - var(--mt) - var(--mb) - 52px)}
 .eTargetBar{top:calc(var(--mt) + 62px);left:var(--ml);transform:none;width:min(300px,42vw);padding:5px 8px}
 .eDialog{left:calc(var(--sl) + 118px);right:calc(var(--sr) + 118px);bottom:var(--mb);transform:none;width:auto;min-width:0;max-height:calc(100vh - var(--mt) - var(--mb) - 20px)}
 .eNpcMenu{left:auto;right:calc(var(--mr) + 120px);top:22%}
 .eMenu{position:absolute;inset:auto var(--mr) var(--mb) var(--ml)!important;top:auto!important;width:auto!important;max-height:calc(100vh - var(--mt) - var(--mb) - 8px);grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}
 .eMenu button{padding:7px 8px}
 .eBanner{top:18%}
 .eTip{width:190px}
 /* full-screen windows keep out of the notch and the corners */
 .eWinBack{padding:var(--st) var(--sr) var(--sb) var(--sl)}.eWin,.eWinBack.wide .eWin{width:100%!important;height:100%!important;max-height:100%!important}
 .eWinHead{padding:4px 10px}.eWinHead h2{font-size:16px}.ePanelBody{-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
 .eShowHud{top:var(--mt);right:var(--mr)}
}
@media (orientation:landscape) and (max-height:520px) and (max-width:720px){
 .eInit{left:calc(var(--ml) + 222px)}
 .eSlot{width:31px;height:31px}.eHotbar{max-width:calc(100vw - var(--sl) - var(--sr) - 236px)}
 .eStick{width:88px;height:88px}.eKnob{left:22px;top:22px}
}
/* the unfolded quick set is a sheet: its own fold button closes it */
`;
export var CSS = ORIGINAL_CSS + THEME + LANDSCAPE;
