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
.eMenuToggle{position:absolute;top:130px;left:12px;z-index:6;width:38px;height:38px;display:none!important;place-items:center;background:var(--e-bg2)!important;border:1px solid var(--e-line)!important}
.eMenu{top:136px;left:12px;width:244px;z-index:5;padding:8px 6px;display:flex;flex-direction:column}
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

@media (max-width:1500px){.eDialog{width:min(640px,calc(100vw - 560px));min-width:400px}.eLog{display:none}}
@media (max-width:1100px),(max-height:700px){
 .ePlayer{width:290px;padding:6px}.ePortrait{width:72px;height:72px}.ePName b{font-size:18px}
 .eMenuToggle{display:grid!important;top:100px}.eMenu{top:144px;width:220px}.eMenu button{font-size:14px;padding:5px 8px}
 .eWhereText{display:none}.eMini{width:130px;height:130px}.eQuests{top:166px;width:250px;font-size:14px}
 .eSlot{width:44px;height:44px}.eSlot svg{width:20px;height:20px}
 .eDialog{left:8px;right:8px;transform:none;width:auto;min-width:0;bottom:80px;max-height:50vh}
 .eQuick .eRound{width:42px;height:42px}.eWallet{bottom:62px}
 .eParty{display:none}
}
@media (max-width:700px){
 .ePlayer{width:calc(100vw - 166px);top:6px;left:6px}.ePortrait{width:54px;height:54px}.eRank{display:none}
 .eWhere{top:6px;right:6px;padding:6px}.eMini{width:116px;height:116px}
 .eQuests{display:none}.eQuick{right:6px;bottom:6px;gap:4px}.eQuick .eRound{width:38px;height:38px}
 .eHotbar{bottom:52px}.eSlot{width:32px;height:32px}.eSlot svg{width:16px;height:16px}.eSlots{gap:2px;padding:3px}
 .eWallet{left:6px;right:auto;top:84px;bottom:auto;font-size:12.5px;gap:10px;padding:4px 8px}.eMenuToggle{top:120px!important}.eMenu{top:162px!important}
 .eTalkBtn{bottom:96px}.ePrompt{bottom:136px}.eNpcMenu{left:auto;right:8px;top:30%}
 .eTouch{bottom:96px}.eStick{left:12px;bottom:8px;width:104px;height:104px}.eKnob{left:30px;top:30px}.eActs{right:8px;bottom:12px;grid-template-columns:repeat(2,50px)}.eActs button{width:50px;height:50px}.eActs button:first-child{width:60px;height:60px}
 .eMap{flex-direction:column}.eMapTitle p,.eBeyond{display:none}.eMapSide{width:auto;max-height:34%;border-left:0;border-top:1px solid rgba(255,255,255,.08)}
 .eTabs{margin-left:4px}.eTabs button{padding:4px 6px;font-size:12px}.eWinHead h2{font-size:17px}
}
`;
export var CSS = ORIGINAL_CSS + THEME;
