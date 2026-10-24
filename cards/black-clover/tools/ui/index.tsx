import { BC_IMG } from "./bc-art.js";
import { BattleArena, BATTLE_CSS, readSpell, setSpellLabels, spellLabelKey, BC_ARENA, BC_LOOKS } from "./bc-battle";
import { bcSetLabels, bcIsUncertain, bcLabelKey, BC_KINDS, BC_WEAR, BC_HOLDS } from "./bc-inventory.js";
import { WorldMap, WORLDMAP_CSS, layoutPlaces, playerXY, canonPlace } from "./bc-worldmap";
import {bcManaMax,bcReserve,bcIsMagicless,bcSpellMechanics,bcNormalizeSpells,bcCastPlan,bcApplyPlayerCast,bcProcessEvents} from "./bc-spell-engine.js";
import {bcWalletProfile,bcBankState,bcBankHere,bcBankOpen,bcBankTransfer} from "./bc-banking.js";
import { BC_SLOTS, BC_STORAGE, BC_ARMS_BULK, bcSpec, bcStorageOf, bcAllowedSlots, bcNormalize, bcCarryProfile, bcWeight, bcBulk, bcCarried, bcIsAccessible, bcPlaceLabel, bcDestinations, bcFindSpot, bcMoveQty, bcReceive, bcHomeUsed, bcAtSquadLocker, bcWorldStoreUsed, bcAppearance, bcRestoreLegacyClothes, bcEventText, bcLocalExamine, bcCanConsume, bcConsume } from "./bc-inventory.js";
import {bcMKPayrollStep,bcMKMonthly,bcMKNextPayday,bcMKRank,bcMKBase,bcMoney} from "./bc-economy";
/* Black Clover — The Living Grimoire · interface v2
   Styled after the creator's mockups: painted banner, gold-framed dark panels,
   five-step creator, dashboard tiles and a clover medallion navigation.
   Plain TSX for the Yumina sandbox: no type syntax, var + function only. */

/* ART SLOTS — to ship painted art to every player, upload images as world assets in the
   Yumina editor and paste their refs here ("@asset:<id>"), or use image URLs.
   Empty slots use the drawn scenes. Players can add their own under Menu > Artwork. */
var ART = {
  banner: (BC_IMG && BC_IMG.banner) || "",
  tiles: { adventure: "", grimoire: "", character: "", squad: "", inventory: "", market: "", missions: "", map: "", relationships: "", more: "" }
};


var C = {
  bg: "#080f1b", well: "#0b1420", line: "#425063", lineSoft: "#283344",
  gold: "#d9b463", goldHi: "#f3dda0", goldDim: "#97743b", goldLine: "rgba(219,172,83,.63)",
  ivory: "#f6edd7", label: "#e1d6c1", muted: "#b8ad99", faint: "#887f71", ink: "#2a1d14", inkSoft: "#5b4a39",
  hp1: "#c8473d", hp2: "#7d2725", mp1: "#3d93d4", mp2: "#155f90", st1: "#42b36c", st2: "#246c41", ft1: "#9280ad", ft2: "#4d3f63"
};
var DISPLAY = "'Cinzel','Trajan Pro','Trajan','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif";
var BODY = "'Cormorant Garamond','EB Garamond',Garamond,'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif";
var SHADOW = "0 1px 2px rgba(0,0,0,.95), 0 0 12px rgba(0,0,0,.6)";
var KCOL = { Clover: "#6fb68d", Diamond: "#b3add1", Heart: "#df8394", Spade: "#94a3cc", Other: "#ecd08a" };

function svgUrl(s) { return "url(\"data:image/svg+xml;charset=utf-8," + encodeURIComponent(s) + "\")"; }
var NOISE = svgUrl("<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 .92  0 0 0 0 .8  0 0 0 .075 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>");
var STONE = svgUrl("<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80'><rect width='120' height='80' fill='#15161a'/><g fill='#ffffff' fill-opacity='.03'><rect x='3' y='4' width='24' height='33'/><rect x='63' y='44' width='54' height='33'/><rect x='33' y='4' width='54' height='33'/></g><g fill='none' stroke='#08090b' stroke-width='3'><path d='M0 1.5H120M0 40H120M0 78.5H120M30 0V40M90 0V40M0 40V80M60 40V80M120 40V80'/></g></svg>");
var PANEL_BG = NOISE + ", radial-gradient(ellipse at 5% 0%, rgba(69,111,163,.13), transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(0,0,0,.35), transparent 60%), linear-gradient(180deg, #142234, #0b131e)";
var PAGE_BG = NOISE + ", radial-gradient(ellipse at 50% 0%, #1b2c42, #08111d 62%)";
var WALL_BG = "linear-gradient(90deg, rgba(0,0,0,.6), rgba(0,0,0,.12) 18%, rgba(0,0,0,.12) 82%, rgba(0,0,0,.6)), " + STONE;

var CSS = [
  "@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&display=swap');",
  ".bc-root{position:relative;display:flex;flex-direction:column;height:100vh;height:100dvh;width:100%;overflow:hidden;background:#0b0d11;color:#efe6cf;font-family:" + BODY + ";font-size:16px;-webkit-font-smoothing:antialiased}",
  ".bc-root *{box-sizing:border-box}",
  ".bc-root button{font-family:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}",
  ".bc-root button:disabled{cursor:default;opacity:.45}",
  ".bc-root button:focus-visible,.bc-root input:focus-visible,.bc-root textarea:focus-visible,.bc-root label:focus-within{outline:2px solid #ecd08a;outline-offset:2px}",
  ".bc-fill{flex:1;min-height:0;display:flex;flex-direction:column;position:relative}",
  ".bc-scroll{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}",
  ".bc-chat{flex:1;min-height:0;display:flex;flex-direction:column;overflow:auto}",
  ".bc-story-native-chat{height:100%;min-height:0;overflow:hidden}",
  ".bc-story-native-chat .play-composer-shell{display:none!important}",
  ".bc-story-native-chat .play-message-role,.bc-story-native-chat .play-message-speaker{display:none!important}",
  ".bc-story-native-chat .play-message-block{padding-left:8px;padding-right:8px}",
  ".bc-in{width:100%;min-height:48px;padding:10px 14px;border:1px solid #3b352c;border-radius:6px;background:#0d0e10;color:#efe6cf;font-family:" + BODY + ";font-size:17px}",
  ".bc-in::placeholder{color:#7a715f}",
  ".bc-in:focus{border-color:#c9a24e;outline:none;box-shadow:0 0 0 1px rgba(201,162,78,.45)}",
  ".bc-ta{min-height:88px;resize:vertical;line-height:1.45}",
  ".bc-turn{animation:bcTurn .32s ease-out}",
  ".bc-fade{animation:bcFade .22s ease-out}",
  "@keyframes bcTurn{from{opacity:0;transform:perspective(900px) rotateY(-8deg) translateX(10px)}to{opacity:1;transform:none}}",
  "@keyframes bcFade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}",
  "@media (prefers-reduced-motion:reduce){.bc-turn,.bc-fade{animation:none}}",
  "@media (max-width:370px){.bc-narrow-hide{display:none}}",
  ".bc-tile{transition:transform .12s ease}.bc-tile:active{transform:scale(.985)}",
  ".bc-chips{display:flex;gap:8px;overflow-x:auto;padding:8px 10px;scrollbar-width:none}",
  ".bc-chips::-webkit-scrollbar{display:none}",
  ".bc-wrap{max-width:560px;margin:0 auto;width:100%}",
  ".bc-scene-scroll{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:10px 9px 14px;scrollbar-width:thin}",
  ".bc-msg{width:100%;margin:0 0 10px}",
  ".bc-msg-user{display:flex;justify-content:flex-end}",
  ".bc-user-bubble{max-width:86%;padding:9px 11px;border:1px solid rgba(201,162,78,.34);border-radius:10px 10px 3px 10px;background:linear-gradient(180deg,rgba(52,43,29,.86),rgba(30,25,19,.92));color:#efe6cf;line-height:1.5;box-shadow:0 3px 10px rgba(0,0,0,.25)}",
  ".bc-narration{padding:3px 4px;color:#d9cfb7;line-height:1.58;font-size:16px}",
  ".bc-speaker-card{display:grid;grid-template-columns:58px minmax(0,1fr);gap:10px;align-items:start;padding:9px 10px;border:1px solid rgba(201,162,78,.42);border-radius:8px;background:linear-gradient(180deg,rgba(29,27,23,.96),rgba(17,16,14,.96));box-shadow:inset 0 0 0 1px rgba(255,238,188,.025),0 5px 14px rgba(0,0,0,.30)}",
  ".bc-speaker-portrait{width:58px;height:72px;border-radius:5px;overflow:hidden;border:1px solid rgba(201,162,78,.55);background:radial-gradient(circle at 50% 30%,#2e2a22,#111214 72%);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 2px rgba(0,0,0,.5);flex-shrink:0}",
  ".bc-speaker-name{font-family:" + DISPLAY + ";font-variant:small-caps;letter-spacing:.035em;color:#ecd08a;font-size:15px;font-weight:700;margin:0 0 4px;line-height:1.2}",
  ".bc-dialogue-line{color:#efe6cf;font-size:16.5px;line-height:1.52;margin:2px 0}",
  ".bc-action-line{color:#a59a83;font-size:15.5px;line-height:1.48;font-style:italic;margin:5px 0}",
  ".bc-beat-line{color:#d9cfb7;font-size:15.8px;line-height:1.5;margin:4px 0}",
  ".bc-streaming-dot{display:inline-block;width:6px;height:6px;margin-left:5px;border-radius:50%;background:#c9a24e;animation:bcPulse .9s ease-in-out infinite alternate}",
  "@keyframes bcPulse{from{opacity:.25;transform:scale(.8)}to{opacity:1;transform:scale(1)}}",
  ".bc-game{width:100%;height:100%;min-height:0;position:relative;isolation:isolate}",
  ".bc-main-area{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden;position:relative;z-index:2;isolation:isolate}",
  ".bc-main-area>*{flex:1;min-width:0;min-height:0}",
  ".bc-nav{position:relative;z-index:1;display:flex;align-items:stretch;background:linear-gradient(180deg,#111317,#07080a);border-top:1px solid #8a6a2e;padding-bottom:env(safe-area-inset-bottom);flex-shrink:0}",
  ".bc-home-location,.bc-home-character,.bc-home-tiles,.bc-home-objective{width:100%}",
  ".bc-sheet-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);display:flex;align-items:flex-end;overscroll-behavior:contain;touch-action:pan-y}",
  ".bc-sheet-panel{width:100%;max-height:88dvh;display:flex;flex-direction:column;overflow:hidden;overscroll-behavior:contain;background:" + PANEL_BG + ";border-top:1px solid #c9a24e;border-radius:14px 14px 0 0;padding:14px 14px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -10px 30px rgba(0,0,0,.72)}",
  ".bc-sheet-inner{width:100%;min-height:0;max-height:100%;display:flex;flex-direction:column}.bc-sheet-head{flex:0 0 auto}.bc-sheet-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;scrollbar-width:thin;padding:0 1px calc(118px + env(safe-area-inset-bottom));scroll-padding-bottom:calc(118px + env(safe-area-inset-bottom))}.bc-sheet-scroll::-webkit-scrollbar{width:5px}.bc-sheet-scroll::-webkit-scrollbar-thumb{background:rgba(201,162,78,.38);border-radius:4px}",
  "@media (min-width:820px), (orientation:landscape) and (min-width:640px){.bc-root{align-items:center;background:radial-gradient(ellipse at 50% 10%,#172235 0,#0b0d11 48%,#06070a 100%)}.bc-game{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:84px minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto;border-left:1px solid rgba(201,162,78,.28);border-right:1px solid rgba(201,162,78,.28);box-shadow:0 0 45px rgba(0,0,0,.6)}.bc-main-area{grid-column:2;grid-row:1}.bc-composer{grid-column:2;grid-row:2;padding:8px max(18px,calc((100% - 1040px)/2)) 14px!important}.bc-nav{grid-column:1;grid-row:1/3;flex-direction:column;justify-content:center;gap:4px;border-top:none!important;border-right:1px solid #8a6a2e;padding:12px 6px calc(12px + env(safe-area-inset-bottom))!important;background:linear-gradient(90deg,#08090b,#111317)}.bc-nav-item{flex:0 0 auto!important;width:100%;min-height:68px!important;padding:7px 2px!important;border-radius:7px}.bc-nav-item span{font-size:11px!important}.bc-nav-story-wrap{flex:0 0 auto!important;width:100%;margin:3px 0;justify-content:center!important}.bc-nav-story-btn{width:58px!important;height:58px!important;margin-top:0!important;border-radius:29px!important}.bc-wrap{max-width:980px}.bc-page-inner{max-width:980px!important;padding:18px 20px 32px!important}.bc-home-hero{height:132px!important}.bc-home-location{max-width:1120px;margin:-18px auto 0!important}.bc-home-character{max-width:1120px;margin:0 auto;padding:12px 14px 0!important}.bc-home-tiles{max-width:1120px;margin:0 auto;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;padding:12px 14px 0!important}.bc-home-objective{max-width:1092px;margin:12px auto 0!important}.bc-story .bc-wrap{max-width:1040px}.bc-story-chat{max-width:1040px;width:calc(100% - 32px);margin:12px auto 0!important}.bc-story-sheet{max-width:1040px;width:calc(100% - 32px);margin:10px auto 0!important}.bc-story-chips{max-width:1040px;width:100%;margin:0 auto;overflow-x:visible!important;flex-wrap:wrap!important;padding:10px 16px!important}.bc-speaker-card{grid-template-columns:66px minmax(0,1fr);padding:11px 12px}.bc-speaker-portrait{width:66px;height:82px}.bc-dialogue-line{font-size:17px}.bc-narration{font-size:16.5px}.bc-sheet-overlay{align-items:center!important;justify-content:center;padding:20px 24px!important}.bc-sheet-panel{width:min(760px,calc(100vw - 140px))!important;max-height:min(86dvh,820px)!important;border:1px solid #8a6a2e!important;border-radius:14px!important;padding:16px!important;box-shadow:0 20px 70px rgba(0,0,0,.78)!important}.bc-sheet-inner{max-width:none!important}.bc-sheet-scroll{padding-bottom:24px!important;scroll-padding-bottom:24px!important}.bc-creator .bc-wrap{max-width:900px}.bc-creator footer{padding-left:24px!important;padding-right:24px!important}}",
  "@media (min-width:1100px){.bc-home-tiles{grid-template-columns:repeat(5,minmax(0,1fr))!important}.bc-home-tiles .bc-tile{height:86px!important}.bc-page-inner{max-width:1040px!important}.bc-wrap{max-width:1040px}}",
  "@media (orientation:landscape) and (min-width:640px) and (max-height:560px){.bc-game{grid-template-columns:72px minmax(0,1fr)}.bc-nav{gap:1px;padding:4px 4px calc(4px + env(safe-area-inset-bottom))!important}.bc-nav-item{min-height:46px!important;padding:2px 0!important;gap:1px!important}.bc-nav-item svg{width:19px!important;height:19px!important}.bc-nav-item span{font-size:9.5px!important}.bc-nav-story-wrap{margin:0!important}.bc-nav-story-btn{width:44px!important;height:44px!important;border-radius:22px!important}.bc-nav-story-btn svg{width:27px!important;height:27px!important}.bc-home-hero{height:100px!important}.bc-page-head .bc-wrap,.bc-story-head .bc-wrap{min-height:50px!important;padding-top:4px!important;padding-bottom:5px!important}.bc-story-head .bc-wrap{padding-left:14px!important;padding-right:14px!important}.bc-story-chat{margin-top:5px!important}.bc-story-chips{padding-top:5px!important;padding-bottom:5px!important}.bc-composer{padding-top:4px!important;padding-bottom:5px!important}.bc-sheet-overlay{padding:8px 12px!important}.bc-sheet-panel{max-height:94dvh!important;padding:10px 12px!important}.bc-sheet-panel .bc-wrap{max-width:none!important}.bc-sheet-scroll{padding-bottom:16px!important;scroll-padding-bottom:16px!important}}",
  "@media (max-width:430px){.bc-sheet-panel{max-height:92dvh}.bc-sheet-scroll{padding-bottom:calc(126px + env(safe-area-inset-bottom));scroll-padding-bottom:calc(126px + env(safe-area-inset-bottom))}}",
  "@media (max-width:380px){.bc-speaker-card{grid-template-columns:48px minmax(0,1fr);gap:8px;padding:8px}.bc-speaker-portrait{width:48px;height:62px}.bc-dialogue-line{font-size:16px}}",
  ".bc-root{background:#07101d;color:#f6edd7;font-family:'Cormorant Garamond',Garamond,Georgia,serif;text-rendering:optimizeLegibility}",
  ".bc-root .bc-frame{background-color:#0c1725;box-shadow:inset 0 0 0 1px rgba(254,230,169,.055),0 5px 18px rgba(0,0,0,.32)}",
  ".bc-root .bc-btn,.bc-root .bc-choice,.bc-root .bc-tile,.bc-root .bc-map-place{transition:border-color .16s ease,background .16s ease,box-shadow .16s ease,transform .12s ease}",
  ".bc-root .bc-btn:active,.bc-root .bc-choice:active,.bc-root .bc-tile:active,.bc-root .bc-map-place:active{transform:scale(.988)}",
  ".bc-root .bc-btn:hover,.bc-root .bc-choice:hover{border-color:#d9b463!important}",
  ".bc-root .bc-in{background:linear-gradient(180deg,#08101b,#0d1929);border:1px solid rgba(173,158,124,.48);border-radius:7px;color:#f5e9d0;font-family:inherit;font-size:16px;min-height:48px}",
  ".bc-root .bc-in::placeholder{color:#989ba3}",
  ".bc-root .bc-field{margin-bottom:17px!important}",
  ".bc-root .bc-field>div:first-child{color:#e8cf95!important;font-size:12px!important;letter-spacing:.12em!important}",
  ".bc-root .bc-choice[aria-checked=\"true\"],.bc-root .bc-choice[aria-pressed=\"true\"]{border-color:#f1d083!important;box-shadow:inset 0 0 0 1px rgba(253,224,156,.13),0 0 13px rgba(214,164,73,.2)!important}",
  ".bc-creator-hero{border-bottom:1px solid rgba(215,171,83,.4)}",
  ".bc-creator-stepper{border-radius:10px!important;background:linear-gradient(180deg,#101b2a,#090f1a)!important;padding-top:11px!important;padding-bottom:9px!important}",
  ".bc-creator-page{background:linear-gradient(180deg,rgba(21,36,54,.95),rgba(11,19,30,.99))!important}",
  ".bc-home-scroll{background:radial-gradient(ellipse at 50% 0%,rgba(24,53,88,.28),transparent 67%)}",
  ".bc-home-hero{border-bottom:1px solid rgba(221,180,92,.45)}",
  ".bc-home-location{border-radius:9px!important;min-height:52px}",
  ".bc-home-tiles .bc-tile{height:76px!important;border-color:rgba(213,167,81,.64)!important;border-radius:7px!important}",
  ".bc-home-tiles .bc-tile:hover{border-color:#f3d994!important;box-shadow:0 0 0 1px rgba(255,233,176,.2),0 7px 20px rgba(0,0,0,.4)!important}",
  ".bc-home-tiles .bc-tile-more{grid-column:1/-1}",
  ".bc-home-character .bc-frame{min-width:0}",
  ".bc-home-objective{border-color:#b88d46!important}",
  ".bc-story-head{border-bottom:1px solid #b89252!important}",
  ".bc-story-chat{background:linear-gradient(180deg,#132131,#0b1521)!important;border-color:rgba(215,177,101,.68)!important;border-radius:9px!important;box-shadow:inset 0 0 0 1px rgba(255,244,212,.035)!important}",
  ".bc-story-native-chat .play-message-block{padding-left:10px!important;padding-right:10px!important}",
  ".bc-narration{color:#eee4d3!important;line-height:1.68!important;font-size:16.5px!important;letter-spacing:.005em}",
  ".bc-narration p{margin:.25em 0 .8em}",
  ".bc-speaker-card{background:linear-gradient(120deg,rgba(29,42,59,.98),rgba(11,19,30,.97))!important;border:1px solid rgba(218,170,83,.63)!important;border-left:3px solid #d7a750!important;border-radius:8px!important}",
  ".bc-speaker-name{color:#f2d591!important}",
  ".bc-dialogue-line{font-size:17px!important;line-height:1.58!important}",
  ".bc-action-line{color:#b7ad9a!important}",
  ".bc-user-bubble{background:linear-gradient(180deg,#2b2c31,#161f2c)!important;border-color:#85714d!important}",
  ".bc-story-chips{padding:9px 9px 11px!important;gap:7px!important}",
  ".bc-story-chips .bc-btn{min-height:40px!important;border-color:#746245!important;background:#111d2d!important}",
  ".bc-composer{background:linear-gradient(180deg,#142238,#0a111d)!important;border-top-color:#8d6b3b!important}",
  ".bc-nav{background:linear-gradient(180deg,#111e30,#080f1a)!important;border-top-color:#b08b47!important}",
  ".bc-nav-item[aria-current=\"page\"]{background:linear-gradient(180deg,rgba(218,176,93,.15),transparent)!important}",
  ".bc-nav-story-btn{box-shadow:0 0 0 3px rgba(5,12,20,.9),0 0 12px rgba(244,209,139,.34)!important}",
  ".bc-page-inner{padding-bottom:calc(32px + env(safe-area-inset-bottom))!important}",
  ".bc-page-scroll{background:radial-gradient(ellipse at 50% -8%,rgba(29,59,96,.18),transparent 70%)}",
  ".bc-page-inner .bc-btn{border-color:rgba(209,169,96,.54)}",
  ".bc-page-inner .bc-frame{margin-bottom:9px}",
  ".bc-section-title{display:flex;align-items:center;gap:9px;margin:8px 1px 10px;color:#edd399;font-family:Cinzel,Georgia,serif;font-size:17px;font-variant:small-caps;letter-spacing:.045em}",
  ".bc-section-title>small{margin-left:auto;color:#a8adba;font-size:12px;font-family:Georgia,serif}",
  ".bc-map-primary{color:#fff0ce;font-family:Cinzel,Georgia,serif;font-size:20px;line-height:1.35}",
  ".bc-map-home{display:flex;gap:8px;align-items:center;padding-top:11px;margin-top:12px;border-top:1px solid #3c4350;font-size:14px;color:#ccb993}",
  ".bc-map-home strong{margin-left:auto;min-width:0;text-align:right;color:#efe5d4;font-weight:600}",
  ".bc-map-place{width:100%;display:flex;align-items:center;gap:10px;padding:10px 5px;border:0;border-bottom:1px solid rgba(147,126,88,.3);background:transparent;text-align:left;color:#f4e8d4;min-height:54px}",
  ".bc-map-place:last-child{border-bottom:0}",
  ".bc-map-place[aria-pressed=\"true\"]{background:rgba(212,167,84,.1)}",
  ".bc-map-place-icon{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:30px;height:30px;border:1px solid rgba(201,162,78,.42);border-radius:6px;color:#edd28e}",
  ".bc-map-place-text{display:flex;flex-direction:column;min-width:0;flex:1;gap:3px}",
  ".bc-map-place-text strong{font-size:16px;font-weight:600;line-height:1.15}",
  ".bc-map-place-text small{font-size:13px;color:#afb1b8}",
  ".bc-travel-heading{margin-top:23px}",
  ".bc-wallet-summary{background:linear-gradient(105deg,#1f2a38,#151d28)!important}",
  ".bc-sheet-overlay{background:rgba(2,6,13,.78)!important}",
  ".bc-sheet-panel{background:linear-gradient(180deg,#17263a,#0b1422)!important}",
  ".bc-sheet-head{background:linear-gradient(180deg,#182a41,#0f1d30)!important}",
  "@media(max-width:500px){.bc-home-character{grid-template-columns:minmax(0,1fr)!important}.bc-profile-summary{display:grid!important;grid-template-columns:minmax(0,1fr)}.bc-home-character .bc-frame{padding:11px!important}.bc-home-tiles .bc-tile{height:69px!important}.bc-home-location{margin-top:-12px!important}.bc-creator-stepper{margin-top:-12px!important}.bc-creator-page{padding:16px 13px 18px!important}.bc-creator-hero{height:145px!important}.bc-nav-item span{font-size:10.5px!important}}",
  "@media(max-width:365px){.bc-home-tiles{gap:6px!important;padding-left:7px!important;padding-right:7px!important}.bc-home-tiles .bc-tile{height:67px!important}.bc-creator-stepper span{letter-spacing:0!important}.bc-narration{font-size:16px!important}}",
  "@media(min-width:820px){.bc-home-tiles .bc-tile-more{grid-column:auto}.bc-profile-summary{min-height:216px}.bc-page-inner .bc-map-group{max-width:100%}}",
  "@media(prefers-reduced-motion:reduce){.bc-root button,.bc-root .bc-tile{transition:none!important}}"
,
  ".bc-grimoire-hero{background:linear-gradient(115deg,#13273b,#0b1624)!important}",
  ".bc-grimoire-hero-inner{display:grid;grid-template-columns:95px minmax(0,1fr);gap:13px;align-items:center}",
  ".bc-grimoire-cover{max-width:95px}",
  ".bc-grimoire-overview{min-width:0}",
  ".bc-grimoire-overview .bc-section-title{margin-top:0;font-size:16px}",
  ".bc-grimoire-numbers{display:flex;align-items:center;gap:16px;margin:13px 0}",
  ".bc-grimoire-numbers>div{display:flex;flex-direction:column;gap:2px}",
  ".bc-grimoire-numbers strong{font:600 25px Cinzel,Georgia,serif;color:#f5da93}",
  ".bc-grimoire-numbers small{font-size:12px;color:#b8ad99}",
  ".bc-grimoire-spell{display:flex;align-items:center;gap:10px;width:100%;padding:9px 4px;background:transparent;border:0;border-bottom:1px solid rgba(194,158,94,.25);text-align:left;color:#f6edd7;min-height:68px}",
  ".bc-grimoire-spell:last-of-type{border-bottom:0}",
  ".bc-grimoire-spell-art{display:flex;flex-shrink:0;align-items:center;justify-content:center;width:54px;height:54px;background:radial-gradient(circle,#1b4f58,#0c1b2a);border:1px solid #906f3b;border-radius:6px;overflow:hidden;color:#e2c16f}",
  ".bc-grimoire-spell-art img{width:100%;height:100%;object-fit:cover}",
  ".bc-grimoire-spell-meta{display:flex;flex:1;min-width:0;flex-direction:column;gap:4px}",
  ".bc-grimoire-spell-meta strong{font-family:Cinzel,Georgia,serif;font-size:14px;color:#f3e0b0;line-height:1.2}",
  ".bc-grimoire-spell-meta small{font-size:13px;color:#bdb5a7;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}",
  ".bc-grimoire-spell-page{flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:3px;font-size:12px;color:#ddbe75}",
  ".bc-grimoire-spell-page small{font-size:12px;color:#b6b0a2}",
  "@media(max-width:365px){.bc-grimoire-hero-inner{grid-template-columns:74px minmax(0,1fr)}.bc-grimoire-cover{max-width:74px}.bc-grimoire-spell-art{width:45px;height:45px}.bc-grimoire-spell-page{font-size:11px}}",
  "@media (orientation:landscape) and (max-height:490px) and (min-width:640px){.bc-nav-item span{font-size:10px!important}.bc-nav-item{min-height:43px!important}.bc-nav-story-btn{width:42px!important;height:42px!important}}"
,
  ".bc-final-lead{display:flex;gap:13px;align-items:center;margin-bottom:16px;padding:11px;border:1px solid rgba(210,170,97,.5);border-radius:8px;background:linear-gradient(100deg,#172a3f,#0a1421)}",
  ".bc-final-portrait{flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:72px;height:92px;background:radial-gradient(circle,#2d4050,#090f19);border:1px solid #b9904b;border-radius:6px;overflow:hidden;color:#eacb87}",
  ".bc-final-portrait img{width:100%;height:100%;object-fit:cover}",
  ".bc-final-caption{display:flex;min-width:0;flex-direction:column;gap:4px}",
  ".bc-final-caption span{text-transform:uppercase;letter-spacing:.1em;font-size:11px;color:#cfb777}",
  ".bc-final-caption strong{font-family:Cinzel,Georgia,serif;font-size:19px;color:#f2e1c0;overflow-wrap:anywhere}",
  ".bc-final-caption small{font-size:13px;color:#acb4c1;line-height:1.35}",
  ".bc-final-review button:focus-visible{outline:2px solid #edcf8b}",
  ".bc-final-review button:hover{background:rgba(201,162,78,.1)!important}",
  ".bc-root{background:#060d18}",
  ".bc-wrap{max-width:620px}",
  ".bc-hero{position:relative;height:122px;overflow:hidden;flex-shrink:0;border-bottom:1px solid rgba(214,174,92,.75);background:#0a1424;box-shadow:0 4px 14px rgba(0,0,0,.45)}",
  ".bc-hero-big{height:132px}",
  ".bc-hero-img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:right center}",
  ".bc-hero-shade{position:absolute;left:0;top:0;right:0;bottom:0;background:linear-gradient(90deg,rgba(6,12,22,.94) 0%,rgba(6,12,22,.72) 34%,rgba(6,12,22,.12) 70%,rgba(6,12,22,0) 100%),linear-gradient(180deg,rgba(6,12,22,0) 55%,rgba(6,12,22,.6) 100%)}",
  ".bc-pennant{position:absolute;top:0;width:50px;height:84px;z-index:2}",
  ".bc-pennant-l{left:9px}",
  ".bc-pennant-r{right:9px;width:60px;height:90px}",
  ".bc-pennant-svg{position:absolute;left:0;top:0;width:100%;height:100%;filter:drop-shadow(0 3px 6px rgba(0,0,0,.7))}",
  ".bc-pennant-in{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding-top:calc(11px + env(safe-area-inset-top));text-align:center}",
  ".bc-pennant-label{font-family:Cinzel,Georgia,serif;font-size:9.5px;line-height:1.12;color:#f1dca4;letter-spacing:.03em;padding:0 6px;font-variant:small-caps}",
  ".bc-pennant-sub{font-size:8.5px;line-height:1.2;color:#cdbf9f;padding:0 5px;font-family:Georgia,serif}",
  ".bc-hero-title{position:absolute;left:68px;right:76px;top:calc(9px + env(safe-area-inset-top));z-index:2}",
  ".bc-hero-title-back{left:54px}",
  ".bc-hero-orn{display:flex;align-items:center;gap:5px;width:148px;margin:0 0 2px}",
  ".bc-hero-orn span{flex:1;height:1px;background:linear-gradient(90deg,rgba(201,162,78,0),#c9a24e)}",
  ".bc-hero-orn span:last-child{background:linear-gradient(90deg,#c9a24e,rgba(201,162,78,0))}",
  ".bc-hero-name{font-family:Cinzel,Georgia,serif;font-weight:600;font-size:25px;line-height:1.02;letter-spacing:.02em;font-variant:small-caps;color:#f3dda0;background:linear-gradient(180deg,#fff3cf 10%,#d9b463 90%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 2px 2px rgba(0,0,0,.85));white-space:nowrap}",
  ".bc-hero-big .bc-hero-name{font-size:30px}",
  ".bc-hero-sub{font-family:Cinzel,Georgia,serif;font-size:8.5px;letter-spacing:.36em;color:#efe5c9;margin-top:5px;text-transform:uppercase;text-shadow:0 1px 3px #000;white-space:nowrap}",
  ".bc-hero-big .bc-hero-sub{font-size:10px;letter-spacing:.24em}",
  ".bc-hero-tag{font-family:Cinzel,Georgia,serif;font-size:7.8px;line-height:1.55;letter-spacing:.15em;color:#efe5c9;margin-top:8px;text-transform:uppercase;max-width:205px;text-shadow:0 1px 3px #000}",
  ".bc-hero-big .bc-hero-tag{font-family:'Cormorant Garamond',Georgia,serif;font-size:12.5px;letter-spacing:0;text-transform:none;margin-top:6px;max-width:230px}",
  ".bc-hero-quote{font-style:italic;font-size:12.5px;line-height:1.3;color:#efe6cf;margin-top:6px;max-width:220px;text-shadow:0 1px 3px #000}",
  ".bc-hero-quote small{display:block;font-size:11px;color:#cdbf9f;padding-left:36px}",
  ".bc-hero-back{position:absolute;left:8px;top:calc(12px + env(safe-area-inset-top));z-index:3;width:38px;height:38px;border-radius:19px;border:1px solid rgba(214,174,92,.65);background:rgba(6,12,22,.65);display:flex;align-items:center;justify-content:center}",
  ".bc-hero-story{height:128px}",
  ".bc-hero-story .bc-hero-tag{display:none}",
  ".bc-hero-chapter{position:absolute;left:12px;right:80px;bottom:9px;z-index:2;display:flex;align-items:center;gap:9px}",
  ".bc-hero-chapter strong{display:block;font-family:Cinzel,Georgia,serif;font-size:17px;color:#f6edd7;font-variant:small-caps;letter-spacing:.03em;line-height:1.1;text-shadow:0 1px 3px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".bc-hero-chapter small{display:block;font-size:12.5px;color:#d8ccb3;text-shadow:0 1px 3px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".bc-hero-chapter>div{min-width:0}",
  ".bc-nav{display:flex!important;align-items:stretch;background:linear-gradient(180deg,#0f1b2d,#060c16)!important;border-top:1px solid #b08b47!important;padding-bottom:env(safe-area-inset-bottom)}",
  ".bc-nav-item{flex:1;min-width:0;min-height:56px;padding:6px 0 5px;background:transparent;border:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;position:relative}",
  ".bc-nav-item span{font-size:10.5px;color:#a3a7b0;font-weight:700;letter-spacing:0;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}",
  ".bc-nav-item[aria-current=\"page\"] span{color:#f3dda0}",
  ".bc-nav-item[aria-current=\"page\"]{background:linear-gradient(180deg,rgba(218,176,93,.17),transparent)!important}",
  ".bc-nav-badge{position:absolute;top:4px;left:calc(50% + 3px);min-width:15px;height:15px;border-radius:8px;background:#a3272a;color:#fff;font-size:9.5px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;border:1px solid #0b0d11}",
  ".bc-nav-item[aria-current=\"page\"]:after{content:\"\";position:absolute;top:0;left:28%;right:28%;height:2px;background:linear-gradient(90deg,transparent,#e5be71,transparent);pointer-events:none}",
  ".bc-nav-story-wrap{isolation:isolate}",
  ".bc-nav-story-wrap{flex:1.25;display:flex;justify-content:center}",
  ".bc-nav-story-btn{width:62px;height:62px;margin-top:-17px;border-radius:31px;border:2px solid #d9b463;background:radial-gradient(circle at 50% 38%,#24314a,#070c16 72%);display:flex;align-items:center;justify-content:center;position:relative;z-index:3;box-shadow:0 0 0 3px rgba(5,10,18,.95),0 0 0 4px rgba(217,180,99,.45),0 0 16px rgba(244,209,139,.4)!important}",
  ".bc-nav-story-btn[aria-current=\"page\"]{box-shadow:0 0 0 3px rgba(5,10,18,.95),0 0 0 4px rgba(217,180,99,.7),0 0 22px rgba(244,209,139,.7)!important}",
  ".bc-home-scroll{background:radial-gradient(ellipse at 50% 0%,rgba(24,53,88,.3),transparent 67%)}",
  ".bc-locbar{position:relative;display:flex;align-items:center;gap:9px;width:calc(100% - 20px);margin:8px 10px 0;min-height:52px;padding:6px 10px 6px 7px;border:1px solid rgba(214,174,92,.75);border-radius:10px;overflow:hidden;background:#0b1626;text-align:left}",
  ".bc-locbar-art{position:absolute;left:28%;top:0;width:72%;height:100%;object-fit:cover;opacity:.75}",
  ".bc-locbar-shade{position:absolute;left:0;top:0;right:0;bottom:0;background:linear-gradient(90deg,#0b1626 30%,rgba(11,22,38,.55) 58%,rgba(11,22,38,.82) 100%)}",
  ".bc-locbar-pin{position:relative;flex-shrink:0;width:36px;height:36px;border-radius:18px;border:1px solid rgba(214,174,92,.75);background:rgba(6,12,22,.85);display:flex;align-items:center;justify-content:center}",
  ".bc-locbar-text{position:relative;flex:1;min-width:0}",
  ".bc-locbar-text strong{display:block;font-family:Cinzel,Georgia,serif;font-size:17px;line-height:1.1;color:#f6edd7;font-variant:small-caps;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".bc-locbar-text small{display:block;font-size:12.5px;color:#d8ccb3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".bc-locbar-weather{position:relative;max-width:34%;font-size:11.5px;line-height:1.25;color:#efe6cf;font-style:italic;text-align:right;text-shadow:0 1px 3px #000}",
  ".bc-locbar>svg:last-child{position:relative;flex-shrink:0}",
  ".bc-home-character{display:grid!important;grid-template-columns:minmax(0,1.42fr) minmax(0,1fr)!important;gap:8px!important;padding:8px 10px 0!important}",
  ".bc-profile-card{display:flex;gap:9px;min-width:0}",
  ".bc-profile-portrait{position:relative;width:84px;flex-shrink:0}",
  ".bc-portrait-btn{display:block;width:84px;height:122px;padding:0;border-radius:6px;overflow:hidden;border:1px solid rgba(214,174,92,.6);background:radial-gradient(circle at 50% 30%,#22324a,#0a111d 75%)}",
  ".bc-portrait-btn img{width:100%;height:100%;object-fit:cover}",
  ".bc-portrait-empty{display:flex;height:100%;align-items:flex-end;justify-content:center;padding-bottom:12px}",
  ".bc-age{position:absolute;left:-3px;bottom:-6px;width:56px;text-align:center;z-index:2}",
  ".bc-age-ring{width:50px;height:50px;margin:0 auto;border-radius:25px;background:radial-gradient(circle at 50% 35%,#1c2a40,#060b14 70%);border:1.5px solid #d9b463;box-shadow:0 0 0 3px rgba(0,0,0,.6),0 0 9px rgba(201,162,78,.35);display:flex;flex-direction:column;align-items:center;justify-content:center}",
  ".bc-age-ring span{font-family:Cinzel,Georgia,serif;font-size:8.5px;color:#d9cfb7;letter-spacing:.08em;line-height:1}",
  ".bc-age-ring strong{font-family:Cinzel,Georgia,serif;font-size:20px;color:#f6edd7;line-height:1.05;font-weight:500}",
  ".bc-age-day{font-size:11px;color:#d9cfb7;margin-top:2px;font-weight:600;text-shadow:0 1px 2px #000}",
  ".bc-profile-info{flex:1;min-width:0}",
  ".bc-profile-name{font-family:Cinzel,Georgia,serif;font-size:16.5px;line-height:1.08;color:#f6edd7;font-variant:small-caps;letter-spacing:.02em;overflow-wrap:anywhere}",
  ".bc-profile-origin{font-size:12.5px;color:#d9cfb7;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".bc-profile-motto{font-size:12.5px;font-style:italic;color:#b8ad99;margin:2px 0 5px;line-height:1.2;max-height:30px;overflow:hidden}",
  ".bc-profile-alert{position:absolute;left:8px;bottom:4px;font-size:11px;color:#f1c7b8}",
  ".bc-pill{position:relative;height:21px;border-radius:11px;background:#05080e;border:1px solid rgba(214,174,92,.55);overflow:hidden;margin-top:5px;display:flex;align-items:center}",
  ".bc-pill-fill{position:absolute;left:0;top:0;bottom:0;transition:width .4s ease;box-shadow:inset 0 1px 0 rgba(255,255,255,.3)}",
  ".bc-pill-hp .bc-pill-fill{background:linear-gradient(180deg,#d65145,#8a2622)}",
  ".bc-pill-mp .bc-pill-fill{background:linear-gradient(180deg,#3f9be0,#155f90)}",
  ".bc-pill-st .bc-pill-fill{background:linear-gradient(180deg,#46b971,#246c41)}",
  ".bc-pill-icon{position:relative;width:19px;height:19px;margin-left:1px;border-radius:10px;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;flex-shrink:0}",
  ".bc-pill-label{position:relative;font-family:Cinzel,Georgia,serif;font-size:8.5px;letter-spacing:.02em;color:#fff6dc;margin-left:4px;text-transform:uppercase;text-shadow:0 1px 2px #000}",
  ".bc-pill-val{position:relative;margin-left:auto;padding:0 7px 0 4px;font-size:11.5px;font-weight:700;color:#fff6dc;text-shadow:0 1px 2px #000;white-space:nowrap}",
  ".bc-profile-summary{min-width:0}",
  ".bc-summary-grim{display:flex;align-items:center;gap:7px;width:100%;padding:3px 3px 7px;margin-bottom:2px;border:1px solid rgba(214,174,92,.35);border-radius:6px;background:rgba(6,12,22,.45);text-align:left}",
  ".bc-summary-grim-icon{width:30px;height:38px;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden}",
  ".bc-summary-grim-text{flex:1;min-width:0}",
  ".bc-summary-grim-text strong{display:block;font-family:Cinzel,Georgia,serif;font-size:13.5px;color:#f3dda0;font-variant:small-caps;line-height:1.1}",
  ".bc-summary-grim-text small{display:block;font-size:11.5px;color:#d9cfb7;line-height:1.2}",
  ".bc-summary-row{display:flex;justify-content:space-between;align-items:center;gap:5px;padding:4px 1px;border-bottom:1px solid rgba(66,80,99,.6);font-size:12px}",
  ".bc-summary-row:last-child{border-bottom:0}",
  ".bc-summary-k{display:flex;align-items:center;gap:5px;color:#b8ad99;white-space:nowrap}",
  ".bc-summary-v{color:#f6edd7;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}",
  ".bc-home-tiles{display:grid!important;grid-template-columns:1fr 1fr!important;gap:7px!important;padding:9px 10px 0!important}",
  ".bc-tile{position:relative;display:flex!important;align-items:center;gap:8px;height:60px!important;width:100%;padding:0 8px 0 9px!important;border:1px solid rgba(214,174,92,.75)!important;border-radius:7px!important;overflow:hidden;background:#0b1422!important;text-align:left;box-shadow:inset 0 0 0 1px rgba(255,238,190,.05),0 5px 12px rgba(0,0,0,.4)}",
  ".bc-tile-art{position:absolute;right:0;top:0;width:54%;height:100%;object-fit:cover}",
  ".bc-tile-shade{position:absolute;left:0;top:0;right:0;bottom:0;background:linear-gradient(90deg,#0b1422 36%,rgba(11,20,34,.72) 56%,rgba(11,20,34,.08) 100%)}",
  ".bc-tile-icon{position:relative;flex-shrink:0;display:flex;filter:drop-shadow(0 2px 3px rgba(0,0,0,.85))}",
  ".bc-tile-text{position:relative;flex:1;min-width:0}",
  ".bc-tile-text strong{display:block;font-family:Cinzel,Georgia,serif;font-size:12.5px;font-weight:600;letter-spacing:.01em;text-transform:uppercase;color:#f6edd7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 3px #000}",
  ".bc-tile-text small{display:block;font-size:11.5px;color:#ddd2bb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 3px #000;font-weight:600}",
  ".bc-tile-chev{position:relative;flex-shrink:0}",
  ".bc-tile-badge{position:absolute;top:5px;right:22px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:#a3272a;border:1px solid #d9b463;color:#fff;font-size:10.5px;font-weight:700;display:flex;align-items:center;justify-content:center}",
  ".bc-tile-more{grid-column:1/-1}",
  ".bc-tile-more .bc-tile-art{width:55%}",
  ".bc-home-objective{display:flex;align-items:center;gap:9px;margin:9px 10px 0!important;border-color:#b88d46!important}",
  ".bc-objective-text{flex:1;min-width:0}",
  ".bc-objective-text strong{display:block;font-family:Cinzel,Georgia,serif;font-variant:small-caps;font-size:15px;color:#f3dda0}",
  ".bc-objective-text span{display:block;font-size:14px;color:#e1d6c1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".bc-objective-btn{display:flex;align-items:center;gap:5px;flex-shrink:0;min-height:38px;padding:5px 10px;border:1px solid rgba(214,174,92,.7);border-radius:6px;background:rgba(6,12,22,.6);color:#f3dda0;font-weight:700;font-size:13px}",
  ".bc-shead{position:relative;display:flex;align-items:center;gap:9px;padding:9px 10px;min-height:52px;overflow:hidden}",
  ".bc-shead-art{border-bottom:1px solid rgba(214,174,92,.45);min-height:62px}",
  ".bc-shead-img{position:absolute;right:0;top:0;height:100%;width:52%;object-fit:cover;-webkit-mask-image:linear-gradient(90deg,transparent,#000 40%);mask-image:linear-gradient(90deg,transparent,#000 40%);opacity:.9}",
  ".bc-shead-icon{position:relative;flex-shrink:0;display:flex}",
  ".bc-shead-text{position:relative;flex:1;min-width:0}",
  ".bc-shead-text strong{display:block;font-family:Cinzel,Georgia,serif;font-size:17px;font-variant:small-caps;letter-spacing:.04em;color:#f3dda0;line-height:1.15;text-shadow:0 1px 3px #000}",
  ".bc-shead-text small{display:block;font-size:12.5px;color:#e1d6c1;line-height:1.25;text-shadow:0 1px 3px #000}",
  ".bc-shead-right{position:relative;flex-shrink:0;max-width:48%}",
  ".bc-shead-note{font-size:11.5px;color:#b8ad99;text-align:right;display:block}",
  ".bc-chiprow{display:flex;gap:6px;overflow-x:auto;padding:2px 2px 4px;scrollbar-width:none}",
  ".bc-chiprow::-webkit-scrollbar{display:none}",
  ".bc-chip{display:inline-flex;align-items:center;gap:5px;flex-shrink:0;min-height:34px;padding:5px 11px;border-radius:6px;border:1px solid rgba(120,128,142,.6);background:#0a1320;color:#d9cfb7;font-size:13.5px;font-weight:700;white-space:nowrap}",
  ".bc-chip-on{border-color:#e6c475;background:linear-gradient(180deg,#d8b45f,#9a7431);color:#1c1509;box-shadow:0 0 10px rgba(217,180,99,.3)}",
  ".bc-actrows{padding:2px 9px 4px}",
  ".bc-actrow{display:flex;align-items:center;gap:10px;width:100%;min-height:56px;margin:7px 0 0;padding:7px 10px;border:1px solid rgba(214,174,92,.55);border-radius:7px;background:linear-gradient(180deg,rgba(18,30,48,.9),rgba(9,16,27,.95));text-align:left}",
  ".bc-actrow-icon{flex-shrink:0;display:flex;width:34px;justify-content:center}",
  ".bc-actrow-text{flex:1;min-width:0}",
  ".bc-actrow-text strong{display:block;font-size:16px;color:#f6edd7;font-weight:600}",
  ".bc-actrow-text small{display:block;font-size:12.5px;color:#b8ad99;line-height:1.3}",
  ".bc-page-inner{padding:12px 10px 26px!important}",
  ".bc-statstrip{display:flex;gap:0;flex-shrink:0;background:linear-gradient(180deg,#101c2e,#0a1220);border-bottom:1px solid rgba(214,174,92,.6);padding:5px 4px}",
  ".bc-statcell{flex:1;min-width:0;display:flex;align-items:center;gap:4px;padding:0 4px;border-right:1px solid rgba(214,174,92,.25)}",
  ".bc-statcell:last-child{border-right:0}",
  ".bc-statcell-body{flex:1;min-width:0}",
  ".bc-statcell-body span{display:block;font-size:11px;color:#e1d6c1;font-weight:700;line-height:1.1}",
  ".bc-statcell-body small{display:block;font-size:10.5px;color:#b8ad99;text-align:right;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".bc-statcell-sky .bc-statcell-body small{text-align:left}",
  ".bc-statbar{height:5px;border-radius:3px;background:#05080e;border:1px solid #2a3344;overflow:hidden;margin:2px 0}",
  ".bc-statbar i{display:block;height:100%}",
  ".bc-statcell-hp i{background:linear-gradient(90deg,#8a2622,#e05a4b)}",
  ".bc-statcell-mp i{background:linear-gradient(90deg,#155f90,#47a8ee)}",
  ".bc-statcell-st i{background:linear-gradient(90deg,#246c41,#4ccf7d)}",
  ".bc-statcell-ft i{background:linear-gradient(90deg,#4d3f63,#9a86c0)}",
  ".bc-upcoming{display:flex;gap:8px;align-items:baseline;padding:6px 12px;background:#0b1422;border-bottom:1px solid #283344;font-size:13.5px;flex-shrink:0}",
  ".bc-upcoming span{font-family:Cinzel,Georgia,serif;font-variant:small-caps;color:#d9b463}",
  ".bc-upcoming em{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e1d6c1;font-style:normal}",
  ".bc-combatbar{padding:7px 12px;background:linear-gradient(180deg,#3a1413,#200b0a);border-bottom:1px solid #6b2a24;flex-shrink:0}",
  ".bc-combatbar-title{font-family:Cinzel,Georgia,serif;font-variant:small-caps;font-size:15px;color:#f1c7b8;margin-bottom:2px}",
  ".bc-combatbar-row{display:flex;justify-content:space-between;gap:8px;font-size:13.5px;color:#f6edd7}",
  ".bc-combatbar-row small{color:#b8ad99}",
  ".bc-combatbar-row.bc-enemy span{color:#f1c7b8}",
  ".bc-chronicle-card{margin:7px 8px 0!important;border:1px solid rgba(214,174,92,.75)!important;border-radius:9px!important;background:linear-gradient(180deg,#122033,#0a1420)!important;overflow:hidden!important;display:flex;flex-direction:column}",
  ".bc-chronicle-head{position:relative;flex-shrink:0;height:46px;display:flex;align-items:center;padding:0 12px;border-bottom:1px solid rgba(214,174,92,.4);overflow:hidden}",
  ".bc-chronicle-head img{position:absolute;right:0;top:0;width:62%;height:100%;object-fit:cover;-webkit-mask-image:linear-gradient(90deg,transparent,#000 45%);mask-image:linear-gradient(90deg,transparent,#000 45%)}",
  ".bc-chronicle-head div{position:relative;min-width:0}",
  ".bc-chronicle-head span{display:flex;align-items:center;gap:5px;font-family:Cinzel,Georgia,serif;font-variant:small-caps;font-size:12px;color:#d9b463;letter-spacing:.06em}",
  ".bc-chronicle-head strong{display:block;font-family:Cinzel,Georgia,serif;font-size:15px;color:#f6edd7;font-variant:small-caps;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 3px #000}",
  ".bc-chronicle-card .bc-story-native-chat{flex:1;min-height:0}",
  ".bc-equipnote{padding:5px 12px;margin:0 8px;font-size:12.5px;background:rgba(201,162,78,.065);border:1px solid #283344;border-top:0;color:#e1d6c1;max-height:60px;overflow-y:auto;flex-shrink:0}",
  ".bc-story-sheet{margin:7px 8px 0;padding:9px 11px;background:linear-gradient(180deg,#142234,#0b131e);border:1px solid rgba(214,174,92,.7);border-radius:8px;max-height:40%;overflow-y:auto;flex-shrink:0}",
  ".bc-story-sheet-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}",
  ".bc-story-sheet-head span{font-family:Cinzel,Georgia,serif;font-variant:small-caps;color:#f3dda0;font-size:16px}",
  ".bc-actgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:7px 8px 6px;flex-shrink:0}",
  ".bc-actcard{position:relative;display:flex;align-items:center;gap:7px;min-height:52px;padding:5px 8px;border:1px solid rgba(214,174,92,.75);border-radius:7px;overflow:hidden;background:#0b1422;text-align:left}",
  ".bc-actcard img{position:absolute;right:0;top:0;width:52%;height:100%;object-fit:cover}",
  ".bc-actcard-shade{position:absolute;left:0;top:0;right:0;bottom:0;background:linear-gradient(90deg,#0b1422 40%,rgba(11,20,34,.6) 70%,rgba(11,20,34,.2))}",
  ".bc-actcard-on{border-color:#f3dda0;box-shadow:0 0 10px rgba(217,180,99,.35)}",
  ".bc-actcard-icon{position:relative;flex-shrink:0;display:flex}",
  ".bc-actcard-text{position:relative;flex:1;min-width:0}",
  ".bc-actcard-text strong{display:block;font-size:14px;line-height:1.15;color:#f6edd7;font-weight:700;text-shadow:0 1px 3px #000}",
  ".bc-actcard-text small{display:block;font-size:11.5px;color:#d8ccb3;line-height:1.2;text-shadow:0 1px 3px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".bc-actcard>svg:last-child{position:relative;flex-shrink:0}",
  ".bc-actmore{grid-column:1/-1;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}",
  ".bc-actmore::-webkit-scrollbar{display:none}",
  ".bc-actmore .bc-chip{min-height:32px;font-size:12.5px;padding:4px 10px}",
  ".bc-composer{padding:6px 10px 12px!important;background:linear-gradient(180deg,#132036,#09101b)!important;border-top:1px solid #8d6b3b!important;border-radius:0}",
  ".bc-bonds-panel .bc-bonds-head{display:flex;gap:9px;align-items:center;padding:2px 2px 7px}",
  ".bc-bonds-head strong{display:block;font-family:Cinzel,Georgia,serif;font-size:18px;font-variant:small-caps;color:#f3dda0;letter-spacing:.04em}",
  ".bc-bonds-head small{display:block;font-size:12.5px;color:#d9cfb7;line-height:1.3}",
  ".bc-bondrow{display:flex;align-items:center;gap:9px;width:100%;margin-top:6px;padding:6px 7px;border:1px solid rgba(214,174,92,.5);border-radius:7px;background:linear-gradient(90deg,rgba(18,30,48,.9),rgba(9,16,27,.95));text-align:left}",
  ".bc-bondrow-icon{flex-shrink:0;width:42px;height:42px;border-radius:6px;border:1px solid rgba(214,174,92,.6);background:radial-gradient(circle,#3a2e12,#0b0d11);display:flex;align-items:center;justify-content:center}",
  ".bc-bondrow-devil .bc-bondrow-icon{background:radial-gradient(circle,#4a1414,#0b0d11)}",
  ".bc-bondrow-text{flex:1;min-width:0}",
  ".bc-bondrow-text strong{display:block;font-size:15px;color:#f6edd7;font-weight:600}",
  ".bc-bondrow-text small{display:block;font-size:12px;color:#b8ad99;line-height:1.25}",
  ".bc-bondtag{display:flex;align-items:center;gap:5px;flex-shrink:0;max-width:42%;padding:5px 6px;border-radius:6px;border:1px solid rgba(95,209,169,.45);background:rgba(15,60,52,.35)}",
  ".bc-bondtag-on{border-color:#5fd1a9;background:rgba(15,80,62,.5)}",
  ".bc-bondtag-devil{border-color:rgba(217,83,74,.55);background:rgba(74,20,20,.45)}",
  ".bc-bondtag>span{min-width:0}",
  ".bc-bondtag strong{display:block;font-family:Cinzel,Georgia,serif;font-size:12px;color:#f6edd7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".bc-bondtag small{display:block;font-size:10.5px;color:#b8ad99;white-space:nowrap}",
  ".bc-pagecount{display:flex;flex-direction:column;align-items:center;padding:3px 9px;border:1px solid rgba(214,174,92,.6);border-radius:6px;background:rgba(6,12,22,.6)}",
  ".bc-pagecount small{font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:#d9cfb7}",
  ".bc-pagecount strong{font-family:Cinzel,Georgia,serif;font-size:20px;color:#f3dda0;line-height:1.1}",
  ".bc-spells-panel .bc-chiprow{padding:2px 2px 6px}",
  ".bc-spellrow{display:flex;align-items:center;gap:8px;width:100%;margin-top:6px;padding:6px;border:1px solid rgba(214,174,92,.45);border-radius:7px;background:linear-gradient(90deg,rgba(18,30,48,.85),rgba(9,16,27,.95));text-align:left}",
  ".bc-spellrow-art{flex-shrink:0;width:62px;height:56px;border-radius:5px;overflow:hidden;border:1px solid rgba(214,174,92,.6);background:radial-gradient(circle,#17595a,#0a1a26 75%);display:flex;align-items:center;justify-content:center}",
  ".bc-spellrow-art img{width:100%;height:100%;object-fit:cover}",
  ".bc-spellrow-meta{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}",
  ".bc-spellrow-meta strong{font-family:Cinzel,Georgia,serif;font-size:13.5px;font-variant:small-caps;color:#f3e0b0;line-height:1.15}",
  ".bc-spellrow-meta small{font-size:12px;color:#c4bba9;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}",
  ".bc-tags{display:flex;gap:4px;flex-wrap:wrap}",
  ".bc-tag{font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:4px;border:1px solid;font-style:normal}",
  ".bc-tag-offense{color:#f1b4ab;border-color:#9c3a32;background:rgba(120,30,25,.45)}",
  ".bc-tag-defense{color:#b4cdf1;border-color:#3a5c9c;background:rgba(25,45,120,.45)}",
  ".bc-tag-support{color:#b9f1c8;border-color:#3a9c58;background:rgba(25,110,50,.4)}",
  ".bc-tag-utility{color:#e8dcb0;border-color:#8d7a3c;background:rgba(110,90,25,.35)}",
  ".bc-tag-attr{color:#a8f0d8;border-color:#2f8a6d;background:rgba(20,90,70,.4)}",
  ".bc-spellrow-side{flex-shrink:0;width:74px;display:flex;flex-direction:column;align-items:flex-start;gap:4px}",
  ".bc-profbadge{font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:4px;background:linear-gradient(180deg,#e9cc7e,#b38b3c);color:#1c1509;max-width:74px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".bc-progbar{display:block;width:100%;height:6px;border-radius:4px;background:#05080e;border:1px solid #3a4658;overflow:hidden}",
  ".bc-progbar i{display:block;height:100%;background:linear-gradient(90deg,#9a7431,#f3dda0)}",
  ".bc-spellrow-side small{font-size:11px;color:#b8ad99}",
  ".bc-grim-lower{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin-bottom:12px}",
  ".bc-grim-side{display:flex;flex-direction:column;gap:8px;min-width:0}",
  ".bc-radar{width:100%;height:auto;display:block}",
  ".bc-tendency-body{display:flex;gap:8px;align-items:center;padding:4px 4px 2px}",
  ".bc-tendency-body strong{display:block;font-family:Cinzel,Georgia,serif;font-size:15px;color:#f6edd7}",
  ".bc-tendency-body small{display:block;font-size:12px;color:#b8ad99;line-height:1.3}",
  ".bc-progression{display:flex;align-items:center;gap:8px;width:100%;padding:9px 9px;border:1px solid rgba(214,174,92,.7);border-radius:7px;background:linear-gradient(180deg,#142234,#0b131e);text-align:left}",
  ".bc-progression span{flex:1;min-width:0}",
  ".bc-progression strong{display:block;font-family:Cinzel,Georgia,serif;font-size:15px;font-variant:small-caps;color:#f3dda0}",
  ".bc-progression small{display:block;font-size:12px;color:#b8ad99;line-height:1.25}",
  ".bc-grim-cover-row{display:flex;gap:12px;align-items:center;padding:10px;border:1px solid rgba(214,174,92,.45);border-radius:8px;background:rgba(10,20,34,.7)}",
  ".bc-grim-cover-row .bc-grimoire-cover{width:70px;flex-shrink:0}",
  ".bc-grim-cover-row strong{display:block;font-family:Cinzel,Georgia,serif;font-size:14px;color:#f6edd7}",
  ".bc-grim-cover-row small{display:block;font-size:12.5px;color:#b8ad99;margin:2px 0 7px}",
  ".bc-spellpage-kicker{font-family:Cinzel,Georgia,serif;font-size:11px;letter-spacing:.14em;color:#d9b463}",
  ".bc-spellpage-name{font-family:Cinzel,Georgia,serif;font-size:20px;margin:4px 0 10px;line-height:1.25;color:#f6edd7}",
  ".bc-spellpage-text{font-size:16px;line-height:1.6;margin:0 0 10px;color:#e1d6c1}",
  ".bc-purse{position:relative;display:flex!important;align-items:center;gap:12px;min-height:96px;padding:12px 14px!important;overflow:hidden;margin-bottom:9px}",
  ".bc-purse-art{position:absolute;right:0;top:0;width:58%;height:100%;object-fit:cover}",
  ".bc-purse-shade{position:absolute;left:0;top:0;right:0;bottom:0;background:linear-gradient(90deg,#0d1828 40%,rgba(13,24,40,.55) 70%,rgba(13,24,40,.15))}",
  ".bc-purse-icon{position:relative;flex-shrink:0;display:flex}",
  ".bc-purse-text{position:relative;min-width:0}",
  ".bc-purse-text small{display:block;font-family:Cinzel,Georgia,serif;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#e8cf95}",
  ".bc-purse-text strong{display:block;font-family:Cinzel,Georgia,serif;font-size:30px;line-height:1.1;color:#f6edd7;text-shadow:0 2px 4px #000}",
  ".bc-purse-text span{display:block;font-size:13.5px;color:#e1d6c1;text-shadow:0 1px 3px #000}",
  ".bc-hubtabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:10px}",
  ".bc-hubtab{display:flex;align-items:center;gap:6px;min-height:52px;padding:6px 7px;border:1px solid rgba(214,174,92,.55);border-radius:7px;background:linear-gradient(180deg,#132036,#0a1220);text-align:left}",
  ".bc-hubtab-on{border-color:#f3dda0;background:linear-gradient(180deg,#2b2614,#141109);box-shadow:0 0 10px rgba(217,180,99,.3)}",
  ".bc-hubtab>span{min-width:0}",
  ".bc-hubtab strong{display:block;font-family:Cinzel,Georgia,serif;font-size:12px;font-variant:small-caps;color:#f6edd7;line-height:1.15}",
  ".bc-hubtab small{display:block;font-size:10.5px;color:#b8ad99;line-height:1.2}",
  ".bc-inv-panel,.bc-market-panel,.bc-bank-panel{margin-bottom:10px;overflow:hidden}",
  ".bc-inv-tools{display:flex;gap:5px;align-items:center}",
  ".bc-capchip{font-size:12px;color:#f6edd7;padding:5px 7px;border:1px solid rgba(214,174,92,.55);border-radius:5px;background:rgba(6,12,22,.8);white-space:nowrap}",
  ".bc-inv-tools select,.bc-item-move select{background:#0a1320;color:#f6edd7;border:1px solid rgba(214,174,92,.55);border-radius:5px;padding:5px 6px;font-size:12.5px;min-height:30px}",
  ".bc-inv-filters{padding:8px 9px 2px!important}",
  ".bc-inv-msg{margin:6px 10px;font-size:13px;color:#f3dda0;border-left:2px solid #d9b463;padding:4px 8px}",
  ".bc-inv-list{padding:0 9px}",
  ".bc-invrow-wrap{margin-top:6px;border:1px solid rgba(214,174,92,.45);border-radius:7px;background:linear-gradient(90deg,rgba(18,30,48,.85),rgba(9,16,27,.95));overflow:hidden}",
  ".bc-invrow-open{border-color:#d9b463}",
  ".bc-invrow{display:flex;align-items:center;gap:8px;width:100%;min-height:54px;padding:5px 8px 5px 5px;background:transparent;border:0;text-align:left}",
  ".bc-invrow-icon{flex-shrink:0;width:44px;height:44px;border-radius:6px;border:1px solid rgba(214,174,92,.6);background:radial-gradient(circle,#26324a,#080d16);display:flex;align-items:center;justify-content:center}",
  ".bc-invrow-text{flex:1;min-width:0}",
  ".bc-invrow-text strong{display:block;font-size:15.5px;color:#f6edd7;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".bc-invrow-text small{display:block;font-size:12px;color:#b8ad99;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".bc-invrow-qty{flex-shrink:0;font-size:14px;color:#e1d6c1}",
  ".bc-kind{flex-shrink:0;font-size:10.5px;font-weight:700;padding:3px 7px;border-radius:4px;border:1px solid #4a5568;background:#253042;color:#e1d6c1}",
  ".bc-kind-key{background:#3c2466;border-color:#7a4fc4;color:#e8dbff}",
  ".bc-item-actions{padding:2px 9px 9px}",
  ".bc-item-facts{font-size:12px;color:#b8ad99;margin-bottom:6px}",
  ".bc-item-btns{display:flex;gap:5px;flex-wrap:wrap}",
  ".bc-item-move{display:flex;gap:6px;align-items:center;margin-top:7px;flex-wrap:wrap}",
  ".bc-item-move select{flex:1 1 150px;max-width:100%}",
  ".bc-item-compartments{margin-top:7px;padding:5px 8px;background:rgba(201,162,78,.06);border:1px solid #283344;border-radius:5px}",
  ".bc-item-compartments div{display:flex;justify-content:space-between;gap:8px;padding:3px 0;font-size:12px;color:#d9cfb7}",
  ".bc-inv-more{display:flex;align-items:center;justify-content:center;gap:6px;width:calc(100% - 18px);margin:8px 9px 0;min-height:38px;border:1px dashed rgba(214,174,92,.45);border-radius:6px;background:transparent;color:#d9b463;font-weight:700;font-size:13px}",
  ".bc-inv-details{padding:6px 11px 2px}",
  ".bc-loadrow{display:flex;justify-content:space-between;font-size:13px;color:#e1d6c1}",
  ".bc-loadbar{height:8px;border-radius:6px;margin:6px 0 4px;background:#05080e;border:1px solid #3a4658;overflow:hidden}",
  ".bc-loadbar i{display:block;height:100%;background:linear-gradient(90deg,#9a7431,#f3dda0)}",
  ".bc-note{font-size:12.5px;color:#b8ad99;line-height:1.4;margin-top:4px}",
  ".bc-hub-lower{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:start}",
  ".bc-bank-anchor{display:none}",
  ".bc-hub-lower .bc-actrow{min-height:52px;padding:6px 7px;gap:7px}",
  ".bc-hub-lower .bc-actrow-text strong{font-size:14px}",
  ".bc-hub-lower .bc-actrow-text small{font-size:11.5px}",
  ".bc-hub-lower .bc-actrow-icon{width:28px}",
  ".bc-hub-lower .bc-shead-text strong{font-size:15px}",
  ".bc-hub-lower .bc-shead-text small{font-size:11.5px}",
  ".bc-stock{padding:6px 9px 0}",
  ".bc-stock-title{font-family:Cinzel,Georgia,serif;font-variant:small-caps;color:#f3dda0;font-size:14px;margin-bottom:3px}",
  ".bc-stockrow{display:flex;justify-content:space-between;align-items:center;gap:7px;padding:6px 0;border-bottom:1px solid #283344}",
  ".bc-stockrow strong{display:block;font-size:14px;color:#f6edd7}",
  ".bc-stockrow small{display:block;font-size:11.5px;color:#b8ad99}",
  ".bc-balance{position:relative;margin:8px 9px 0;min-height:76px;padding:9px 11px;border:1px solid rgba(214,174,92,.65);border-radius:7px;overflow:hidden;background:#0d1828}",
  ".bc-balance img{position:absolute;right:0;top:0;width:52%;height:100%;object-fit:cover}",
  ".bc-balance-shade{position:absolute;left:0;top:0;right:0;bottom:0;background:linear-gradient(90deg,#0d1828 40%,rgba(13,24,40,.4))}",
  ".bc-balance>div{position:relative}",
  ".bc-balance small{display:block;font-family:Cinzel,Georgia,serif;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#e8cf95}",
  ".bc-balance strong{display:block;font-family:Cinzel,Georgia,serif;font-size:24px;color:#f6edd7;line-height:1.15;text-shadow:0 1px 3px #000}",
  ".bc-balance span{display:block;font-size:12px;color:#e1d6c1;text-shadow:0 1px 3px #000}",
  ".bc-bank-where{padding:2px 10px 0}",
  ".bc-bank-amount{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:7px 2px 2px}",
  ".bc-bank-amount input{flex:1 1 110px;min-height:40px!important}",
  ".bc-bank-details{padding:4px 2px}",
  ".bc-mapview .bc-frame{margin-bottom:9px}",
  ".bc-curloc{position:relative;display:flex;align-items:center;gap:10px;width:100%;min-height:84px;padding:9px 11px;margin-bottom:8px;border:1px solid rgba(214,174,92,.8);border-radius:9px;overflow:hidden;background:#0b1626;text-align:left}",
  ".bc-curloc img{position:absolute;left:30%;top:0;width:70%;height:100%;object-fit:cover}",
  ".bc-curloc-shade{position:absolute;left:0;top:0;right:0;bottom:0;background:linear-gradient(90deg,#0b1626 32%,rgba(11,22,38,.4) 60%,rgba(11,22,38,.8))}",
  ".bc-curloc-text{position:relative;flex:1;min-width:0}",
  ".bc-curloc-text small{display:block;font-family:Cinzel,Georgia,serif;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#e8cf95}",
  ".bc-curloc-text strong{display:block;font-family:Cinzel,Georgia,serif;font-size:21px;line-height:1.1;color:#f6edd7;text-shadow:0 2px 3px #000;overflow-wrap:anywhere}",
  ".bc-curloc-text span{display:block;font-size:12.5px;color:#e1d6c1;text-shadow:0 1px 3px #000}",
  ".bc-curloc-weather{position:relative;max-width:32%;font-size:11.5px;line-height:1.3;color:#efe6cf;text-shadow:0 1px 3px #000;padding-left:8px;border-left:1px solid rgba(214,174,92,.5)}",
  ".bc-homeloc{display:flex;align-items:center;gap:10px;padding:8px 11px;margin-bottom:10px;border:1px solid rgba(214,174,92,.6);border-radius:8px;background:linear-gradient(180deg,#132036,#0a1220)}",
  ".bc-homeloc>span{flex:1;min-width:0}",
  ".bc-homeloc small{display:block;font-family:Cinzel,Georgia,serif;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#e8cf95}",
  ".bc-homeloc strong{display:block;font-family:Cinzel,Georgia,serif;font-size:16px;color:#f6edd7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".bc-homeloc em{font-style:normal;font-size:11.5px;color:#b8ad99;max-width:40%;text-align:right}",
  ".bc-placerow{display:flex;align-items:center;gap:10px;width:100%;margin-top:6px;padding:0 10px 0 0;min-height:56px;border:1px solid rgba(214,174,92,.5);border-radius:7px;overflow:hidden;background:linear-gradient(90deg,#0d1828,#0a1220);text-align:left}",
  ".bc-placerow-on{border-color:#f3dda0;box-shadow:0 0 10px rgba(217,180,99,.3)}",
  ".bc-placerow-art{position:relative;flex-shrink:0;width:34%;height:56px;overflow:hidden}",
  ".bc-placerow-art img{width:100%;height:100%;object-fit:cover;-webkit-mask-image:linear-gradient(90deg,#000 65%,transparent);mask-image:linear-gradient(90deg,#000 65%,transparent)}",
  ".bc-placerow-text{flex:1;min-width:0}",
  ".bc-placerow-text strong{display:block;font-family:Cinzel,Georgia,serif;font-size:15.5px;color:#f6edd7}",
  ".bc-placerow-text small{display:block;font-size:12.5px;color:#b8ad99}",
  ".bc-travel-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:9px;padding:0 2px}",
  ".bc-travel-right{border-left:1px solid rgba(214,174,92,.3);padding-left:8px}",
  ".bc-mini-label{font-family:Cinzel,Georgia,serif;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#e8cf95;margin:6px 0 5px}",
  ".bc-destchips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:7px}",
  ".bc-destchips .bc-chip{font-size:12.5px;min-height:32px;padding:4px 8px}",
  ".bc-destcard{display:flex;gap:8px;margin-top:6px;padding:6px;border:1px solid rgba(214,174,92,.55);border-radius:7px;background:rgba(6,12,22,.6)}",
  ".bc-destcard img{width:68px;height:70px;object-fit:cover;border-radius:5px;flex-shrink:0}",
  ".bc-destcard>div{min-width:0}",
  ".bc-destcard strong{display:block;font-family:Cinzel,Georgia,serif;font-size:14px;color:#f6edd7}",
  ".bc-destcard small{display:block;font-size:11.5px;color:#b8ad99;margin-bottom:3px}",
  ".bc-destcard span{display:block;font-size:12px;color:#e1d6c1;line-height:1.3}",
  ".bc-method{display:flex;align-items:center;gap:7px;width:100%;min-height:36px;margin-bottom:5px;padding:4px 8px;border:1px solid rgba(214,174,92,.45);border-radius:6px;background:#0a1320;color:#e1d6c1;font-size:13px;font-weight:700;text-align:left}",
  ".bc-method-on{border-color:#f3dda0;background:linear-gradient(180deg,#2b2614,#141109);color:#f3dda0}",
  ".bc-pacerow{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}",
  ".bc-pacerow .bc-chip{min-height:30px;padding:3px 7px;font-size:12px}",
  ".bc-travelbtn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:48px;border-radius:7px;border:1px solid #f5e0a2;background:linear-gradient(180deg,#f0d38a,#b38b3c);color:#2a1d0c;font-family:Cinzel,Georgia,serif;font-size:19px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;box-shadow:0 0 14px rgba(217,180,99,.35)}",
  ".bc-travelbtn:disabled{opacity:.5}",
  ".bc-creator{background:radial-gradient(ellipse at 50% 0%,#14243a,#060d18 70%)}",
  ".bc-creator-wrap{padding:0 10px 14px}",
  ".bc-stepper{position:relative;display:flex;margin:8px 0 10px;padding:9px 4px 7px;border:1px solid rgba(214,174,92,.6);border-radius:10px;background:linear-gradient(180deg,#101b2a,#090f1a)}",
  ".bc-stepper-line{position:absolute;left:10%;right:10%;top:25px;height:1px;background:linear-gradient(90deg,#97743b,#d9b463,#97743b)}",
  ".bc-step{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;background:transparent;border:none;padding:0;min-height:52px}",
  ".bc-step-dot{width:32px;height:32px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-family:Cinzel,Georgia,serif;font-size:15px;color:#d9cfb7;background:#0b1422;border:1px solid #5a6170}",
  ".bc-step-done .bc-step-dot{border-color:#d9b463;color:#f3dda0}",
  ".bc-step-on .bc-step-dot{width:38px;height:38px;margin-top:-3px;border:2px solid #f3dda0;color:#f3dda0;box-shadow:0 0 12px rgba(236,208,138,.6)}",
  ".bc-step-label{font-size:11.5px;line-height:1.1;color:#d9cfb7;text-align:center;font-weight:600}",
  ".bc-step-on .bc-step-label{color:#f3dda0;font-weight:700}",
  ".bc-phead{position:relative;display:flex;align-items:center;gap:12px;min-height:74px;margin-bottom:10px;padding:10px 12px;border:1px solid rgba(214,174,92,.7);border-radius:9px;overflow:hidden;background:linear-gradient(180deg,#142234,#0b131e)}",
  ".bc-phead-img{position:absolute;right:0;top:0;width:52%;height:100%;object-fit:cover;-webkit-mask-image:linear-gradient(90deg,transparent,#000 45%);mask-image:linear-gradient(90deg,transparent,#000 45%);opacity:.85}",
  ".bc-phead-icon{position:relative;flex-shrink:0;display:flex;filter:drop-shadow(0 2px 3px rgba(0,0,0,.7))}",
  ".bc-phead-text{position:relative;min-width:0}",
  ".bc-phead-text strong{display:block;font-family:Cinzel,Georgia,serif;font-size:27px;line-height:1.05;color:#f6edd7;font-variant:small-caps;letter-spacing:.03em;text-shadow:0 2px 3px #000}",
  ".bc-phead-text small{display:block;font-family:Cinzel,Georgia,serif;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#e1d6c1;margin-top:5px;line-height:1.5;text-shadow:0 1px 3px #000}",
  ".bc-cbox{margin-bottom:9px;padding:9px 11px 11px;border:1px solid rgba(214,174,92,.55);border-radius:8px;background:linear-gradient(180deg,rgba(20,34,52,.92),rgba(10,18,30,.96))}",
  ".bc-cbox-label{font-family:Cinzel,Georgia,serif;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#e8cf95;margin:0 0 8px;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px}",
  ".bc-cbox-label small{font-family:'Cormorant Garamond',Georgia,serif;text-transform:none;letter-spacing:0;font-size:13px;color:#b8ad99;font-style:italic}",
  ".bc-cbox-hint{font-size:13.5px;color:#b8ad99;margin-top:6px;line-height:1.4}",
  ".bc-cgrid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:8px}",
  ".bc-namebox{position:relative}",
  ".bc-namebox svg{position:absolute;right:12px;top:50%;transform:translateY(-50%)}",
  ".bc-gender{display:flex;gap:8px}",
  ".bc-agebox{display:flex;align-items:center;min-height:46px;border:1px solid rgba(173,158,124,.48);border-radius:7px;background:#08101b}",
  ".bc-agebox button{width:38px;height:44px;background:transparent;border:none;display:flex;align-items:center;justify-content:center;flex-shrink:0}",
  ".bc-agebox input{flex:1;min-width:0;width:30px;text-align:center;background:transparent;border:none;color:#f6edd7;font-family:Cinzel,Georgia,serif;font-size:22px;outline:none}",
  ".bc-bdaybox{display:flex;gap:6px}",
  ".bc-bdaybox select{min-width:0;padding:6px 8px!important}",
  ".bc-bdaybox select:first-child{flex:1.6}",
  ".bc-bdaybox select:last-child{flex:1}",
  ".bc-appearbtn{position:relative;display:flex;align-items:center;gap:10px;width:100%;min-height:62px;padding:6px 12px 6px 8px;border:1px solid rgba(173,158,124,.5);border-radius:7px;overflow:hidden;background:#08101b;text-align:left}",
  ".bc-appearbtn-art{position:absolute;right:0;top:0;height:100%;width:55%;object-fit:cover;opacity:.6;-webkit-mask-image:linear-gradient(90deg,transparent,#000 45%);mask-image:linear-gradient(90deg,transparent,#000 45%)}",
  ".bc-appearbtn-icon{position:relative;flex-shrink:0;width:44px;height:48px;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:5px}",
  ".bc-appearbtn-icon img{width:100%;height:100%;object-fit:cover}",
  ".bc-appearbtn-text{position:relative;flex:1;min-width:0}",
  ".bc-appearbtn-text strong{display:block;font-size:17px;color:#f6edd7;font-weight:600}",
  ".bc-appearbtn-text small{display:block;font-size:13px;color:#b8ad99;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".bc-appearbtn>svg:last-child{position:relative}",
  ".bc-openbtn{display:flex;align-items:center;gap:12px;width:100%;min-height:54px;padding:6px 12px;border:1px solid rgba(173,158,124,.5);border-radius:7px;background:#08101b;text-align:left}",
  ".bc-openbtn span{flex:1;min-width:0}",
  ".bc-openbtn strong{display:block;font-size:16.5px;color:#f6edd7;font-weight:600}",
  ".bc-openbtn small{display:block;font-size:12.5px;color:#d9b463}",
  ".bc-tilegrid{display:grid;gap:6px}",
  ".bc-tilebtn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-height:76px;padding:7px 3px;border:1px solid rgba(120,128,142,.55);border-radius:7px;background:#08101b;text-align:center}",
  ".bc-tilebtn-on{border:1.5px solid #f1d083;background:linear-gradient(180deg,#2b2614,#110f09);box-shadow:inset 0 0 0 1px rgba(253,224,156,.13),0 0 13px rgba(214,164,73,.25)}",
  ".bc-tilebtn-t{font-size:12.5px;line-height:1.15;font-weight:700;color:#e1d6c1;white-space:pre-line}",
  ".bc-tilebtn-on .bc-tilebtn-t{color:#f3dda0}",
  ".bc-tilebtn-d{font-size:11.5px;line-height:1.25;color:#b8ad99}",
  ".bc-tilegrid-row .bc-tilebtn{flex-direction:row;justify-content:flex-start;min-height:46px;padding:5px 8px;text-align:left;gap:7px}",
  ".bc-tilegrid-row .bc-tilebtn-t{font-size:13px}",
  ".bc-tilegrid-cards .bc-tilebtn{min-height:118px;padding:9px 6px}",
  ".bc-tilegrid-cards .bc-tilebtn-t{font-size:15px}",
  ".bc-kingdoms{display:flex;gap:5px;flex-wrap:wrap}",
  ".bc-kchip{display:inline-flex;align-items:center;gap:5px;min-height:38px;padding:5px 11px;border:1px solid rgba(120,128,142,.6);border-radius:6px;background:#08101b;color:#e1d6c1;font-weight:700;font-size:14px}",
  ".bc-kchip span{font-size:17px}",
  ".bc-kchip-on{border-color:#f1d083;color:#f3dda0;box-shadow:0 0 11px rgba(214,164,73,.25)}",
  ".bc-listopt{display:flex;align-items:center;gap:11px;width:100%;min-height:58px;margin-bottom:7px;padding:7px 12px;border:1px solid rgba(120,128,142,.5);border-radius:7px;background:#08101b;text-align:left}",
  ".bc-listopt-on{border:1.5px solid #f1d083;background:linear-gradient(180deg,#2b2614,#110f09);box-shadow:0 0 12px rgba(214,164,73,.25)}",
  ".bc-listopt-icon{flex-shrink:0;width:34px;display:flex;justify-content:center}",
  ".bc-sym{font-size:26px}",
  ".bc-listopt-text{flex:1;min-width:0}",
  ".bc-listopt-text strong{display:flex;align-items:center;gap:7px;font-size:17px;color:#f6edd7;font-weight:600}",
  ".bc-listopt-text strong em{font-style:normal;font-size:11px;padding:1px 7px;border-radius:9px;border:1px solid #d9b463;color:#f3dda0;font-weight:700}",
  ".bc-listopt-text small{display:block;font-size:13.5px;color:#b8ad99;line-height:1.3}",
  ".bc-countbox{position:relative}",
  ".bc-countbox small{position:absolute;right:10px;bottom:8px;font-size:12px;color:#8e8778}",
  ".bc-attrgrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}",
  ".bc-attrbtn{display:flex;align-items:center;gap:5px;min-height:40px;padding:4px 6px;border:1px solid rgba(214,174,92,.4);border-radius:6px;background:#08101b;color:#e1d6c1;font-size:12.5px;font-weight:700;text-align:left;overflow:hidden;white-space:nowrap}",
  ".bc-attrbtn svg{flex-shrink:0}",
  ".bc-attrbtn-wide{grid-column:span 2}",
  ".bc-attrbtn-on{border-color:#f3dda0;background:linear-gradient(180deg,#2b2614,#110f09);color:#f3dda0;box-shadow:0 0 10px rgba(214,164,73,.3)}",
  ".bc-infonote{display:flex;gap:11px;align-items:center;padding:10px 12px;border:1px solid rgba(214,174,92,.55);border-radius:8px;background:rgba(10,18,30,.9);font-size:14.5px;color:#e1d6c1;line-height:1.45}",
  ".bc-infonote svg{flex-shrink:0}",
  ".bc-mini-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:2px 10px;margin:8px 2px 7px}",
  ".bc-mini-head span{font-family:Cinzel,Georgia,serif;font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:#e8cf95}",
  ".bc-mini-head small{font-size:12.5px;color:#b8ad99}",
  ".bc-regions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}",
  ".bc-region{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 5px 26px;border:1px solid rgba(214,174,92,.5);border-radius:8px;overflow:hidden;background:#08101b;text-align:center}",
  ".bc-region img{width:calc(100% + 10px);height:72px;object-fit:cover;margin:0 -5px 0}",
  ".bc-region-on{border:1.5px solid #f3dda0;box-shadow:0 0 14px rgba(217,180,99,.35)}",
  ".bc-region-clover{margin-top:-14px;z-index:1;display:flex;filter:drop-shadow(0 2px 3px #000)}",
  ".bc-region strong{font-family:Cinzel,Georgia,serif;font-size:13px;color:#f6edd7;font-variant:small-caps;line-height:1.1}",
  ".bc-region small{font-size:11.5px;color:#b8ad99;line-height:1.25}",
  ".bc-radio{position:absolute;bottom:6px;left:50%;transform:translateX(-50%);width:18px;height:18px;border-radius:9px;border:1px solid #c9b892;display:flex;align-items:center;justify-content:center;background:#060b14}",
  ".bc-place .bc-radio{position:relative;bottom:auto;left:auto;transform:none;flex-shrink:0}",
  ".bc-places{display:grid;grid-template-columns:1fr 1fr;gap:6px}",
  ".bc-place{position:relative;display:flex;align-items:center;gap:7px;min-height:52px;padding:5px 8px;border:1px solid rgba(214,174,92,.5);border-radius:7px;overflow:hidden;background:#08101b;text-align:left}",
  ".bc-place img{position:absolute;right:0;top:0;width:55%;height:100%;object-fit:cover}",
  ".bc-place-shade{position:absolute;left:0;top:0;right:0;bottom:0;background:linear-gradient(90deg,#08101b 42%,rgba(8,16,27,.55))}",
  ".bc-place>svg,.bc-place-text{position:relative}",
  ".bc-place-text{flex:1;min-width:0}",
  ".bc-place-text strong{display:block;font-size:13.5px;color:#f6edd7;line-height:1.15;text-shadow:0 1px 3px #000}",
  ".bc-place-text small{display:block;font-size:11px;color:#d9cfb7;text-shadow:0 1px 3px #000}",
  ".bc-place-on{border:1.5px solid #f3dda0;box-shadow:0 0 12px rgba(217,180,99,.3)}",
  ".bc-about{position:relative;margin-top:10px;min-height:110px;padding:10px 12px;border:1px solid rgba(214,174,92,.6);border-radius:8px;overflow:hidden;background:#0b1422}",
  ".bc-about img{position:absolute;right:0;top:0;width:50%;height:100%;object-fit:cover}",
  ".bc-about-shade{position:absolute;left:0;top:0;right:0;bottom:0;background:linear-gradient(90deg,#0b1422 48%,rgba(11,20,34,.35))}",
  ".bc-about>div{position:relative;max-width:66%}",
  ".bc-about-head{display:flex;align-items:center;gap:7px;font-family:Cinzel,Georgia,serif;font-size:15px;font-variant:small-caps;color:#f3dda0}",
  ".bc-about p{margin:6px 0 0;font-size:13.5px;line-height:1.45;color:#e1d6c1}",
  ".bc-cquote{text-align:center;font-style:italic;font-size:15px;color:#e1d6c1;margin:14px 10px 4px}",
  ".bc-cquote small{display:block;font-size:12.5px;color:#b8ad99;margin-top:2px}",
  ".bc-final-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin-bottom:8px}",
  ".bc-final-portrait-card{position:relative;min-height:230px;border:1px solid rgba(214,174,92,.75);border-radius:8px;overflow:hidden;background:#0b1422}",
  ".bc-final-portrait-card img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover}",
  ".bc-final-quote{position:absolute;left:0;right:0;bottom:0;padding:24px 10px 9px;background:linear-gradient(180deg,transparent,rgba(6,12,22,.92));font-style:italic;font-size:14px;color:#f6edd7;text-align:center}",
  ".bc-final-quote small{display:block;font-size:11.5px;color:#cdbf9f}",
  ".bc-final-summary-head{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:3px}",
  ".bc-final-summary-head strong{font-family:Cinzel,Georgia,serif;font-size:14px;font-variant:small-caps;color:#f3dda0;letter-spacing:.04em}",
  ".bc-final-summary-head button{display:inline-flex;align-items:center;gap:4px;min-height:28px;padding:2px 8px;border:1px solid rgba(214,174,92,.6);border-radius:5px;background:transparent;color:#f3dda0;font-weight:700;font-size:12px}",
  ".bc-final-row{display:grid;grid-template-columns:16px minmax(0,.9fr) minmax(0,1fr);align-items:center;gap:6px;width:100%;min-height:34px;padding:4px 0;border:none;border-bottom:1px solid #283344;background:transparent;text-align:left}",
  ".bc-final-row span{font-family:Cinzel,Georgia,serif;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#b8ad99}",
  ".bc-final-row strong{font-size:12.5px;color:#f6edd7;font-weight:600;line-height:1.2;overflow-wrap:anywhere}",
  ".bc-final-h{display:flex;align-items:center;gap:7px;font-family:Cinzel,Georgia,serif;font-size:14px;font-variant:small-caps;color:#f3dda0;margin-bottom:7px}",
  ".bc-final-statboxes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}",
  ".bc-final-statbox{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px;border-radius:6px;border:1px solid}",
  ".bc-final-statbox span{font-family:Cinzel,Georgia,serif;font-size:9.5px;color:#f6edd7;text-transform:uppercase}",
  ".bc-final-statbox small{font-size:10.5px}",
  ".bc-sb-hp{border-color:#b33a32;background:rgba(120,30,25,.4)}.bc-sb-hp small{color:#f19a8f}",
  ".bc-sb-mp{border-color:#3a6fb3;background:rgba(25,55,120,.4)}.bc-sb-mp small{color:#8fbcf1}",
  ".bc-sb-st{border-color:#3a9c58;background:rgba(25,110,50,.35)}.bc-sb-st small{color:#8ff1ab}",
  ".bc-sb-wl{border-color:#7a4fc4;background:rgba(70,35,120,.4)}.bc-sb-wl small{color:#c9b0f1}",
  ".bc-modeopt{display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px solid #283344}",
  ".bc-modeopt:last-child{border-bottom:0}",
  ".bc-modeopt>span{flex:1;min-width:0}",
  ".bc-modeopt strong{display:block;font-size:13px;color:#f6edd7;font-weight:600}",
  ".bc-modeopt small{display:block;font-size:11px;color:#b8ad99;line-height:1.2}",
  ".bc-switch{position:relative;flex-shrink:0;width:42px;height:24px;border-radius:12px;border:1px solid #5a6170;background:#1a2230;padding:0}",
  ".bc-switch i{position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:8px;background:#9aa0ad;transition:left .15s}",
  ".bc-switch-on{background:linear-gradient(180deg,#d8b45f,#9a7431);border-color:#f3dda0}",
  ".bc-switch-on i{left:21px;background:#fff6dc}",
  ".bc-creator-foot{padding:8px 12px calc(10px + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(9,14,24,.95),#050a12);border-top:1px solid rgba(214,174,92,.55);flex-shrink:0}",
  ".bc-creator-foot-row{display:flex;align-items:center;gap:10px}",
  ".bc-creator-err{color:#f1c7b8;font-size:14px;margin-bottom:7px;text-align:center}",
  ".bc-backcircle{width:50px;height:50px;flex-shrink:0;border-radius:25px;border:1px solid rgba(214,174,92,.7);background:#0b1422;display:flex;align-items:center;justify-content:center}",
  ".bc-greenrib{filter:drop-shadow(0 5px 12px rgba(0,0,0,.6))}",
  ".bc-greenrib button{display:block;width:100%;padding:2px;border:none;background:linear-gradient(90deg,#6f5424,#f0d58f 22%,#b38b3c 50%,#f0d58f 78%,#6f5424);clip-path:polygon(4% 0,96% 0,100% 50%,96% 100%,4% 100%,0 50%);-webkit-clip-path:polygon(4% 0,96% 0,100% 50%,96% 100%,4% 100%,0 50%)}",
  ".bc-greenrib span{display:flex;align-items:center;justify-content:center;gap:16px;min-height:58px;clip-path:polygon(4% 0,96% 0,100% 50%,96% 100%,4% 100%,0 50%);-webkit-clip-path:polygon(4% 0,96% 0,100% 50%,96% 100%,4% 100%,0 50%);background:radial-gradient(ellipse at 50% 0%,rgba(120,220,140,.35),transparent 65%),linear-gradient(180deg,#1f7a3d,#0f4a24 60%,#0a3419);color:#f6e2a6;font-family:Cinzel,Georgia,serif;font-size:25px;letter-spacing:.08em;font-variant:small-caps;text-shadow:0 2px 3px rgba(0,0,0,.8)}",
  "@media (max-width:430px){.bc-attrgrid{grid-template-columns:repeat(4,minmax(0,1fr))}}",
  "@media (max-width:400px){.bc-hero-name{font-size:22px}.bc-hero-big .bc-hero-name{font-size:25px}.bc-hero-title{left:64px;right:72px}.bc-nav-item span{font-size:9.5px}.bc-attrgrid{grid-template-columns:repeat(4,minmax(0,1fr))}.bc-hub-lower,.bc-final-grid{grid-template-columns:minmax(0,1fr)}.bc-tile-text strong{font-size:12px}.bc-tile-text small{font-size:10.5px}.bc-hubtab small{display:none}.bc-regions .bc-region small{font-size:10.5px}}",
  "@media (max-width:360px){.bc-home-character{grid-template-columns:minmax(0,1fr)!important}.bc-travel-grid,.bc-grim-lower{grid-template-columns:minmax(0,1fr)}.bc-travel-right{border-left:0;padding-left:0}.bc-hero-tag{display:none}}",
  "@media (min-width:820px),(orientation:landscape) and (min-width:640px){.bc-nav{flex-direction:column!important;justify-content:center}.bc-nav-item{flex:0 0 auto;min-height:58px}.bc-nav-story-wrap{flex:0 0 auto;margin:6px 0}.bc-nav-story-btn{margin-top:0}.bc-hero{height:150px}.bc-hero-big{height:156px}.bc-wrap{max-width:900px}}",
  ".bc-spells-panel .bc-chip{font-size:12.5px;padding:4px 8px;min-height:32px;gap:4px}",
  ".bc-home-character{grid-template-columns:minmax(0,1.55fr) minmax(0,1fr)!important}",
  ".bc-pills{display:block;width:100%;padding:0;margin:0;border:0;background:transparent;text-align:left;border-radius:11px}",
  ".bc-summary-row{width:100%;background:transparent;border-left:0;border-right:0;border-top:0;text-align:left;font-family:inherit;color:inherit}",
  ".bc-summary-row:last-child{border-bottom:0}",
  ".bc-cardbtn{display:block;width:100%;padding:9px 9px;border:1px solid rgba(214,174,92,.55);border-radius:7px;background:linear-gradient(180deg,rgba(20,34,52,.92),rgba(10,18,30,.96));text-align:left;color:inherit;font-family:inherit;box-shadow:inset 0 0 0 1px rgba(255,238,190,.05),0 6px 18px rgba(0,0,0,.34)}",
  ".bc-cardbtn .bc-shead{padding:2px 2px 6px;min-height:0}",
  ".bc-tendency-body>svg:last-child{margin-left:auto;flex-shrink:0}",
  ".bc-pagecount{font-family:inherit;color:inherit;cursor:pointer}",
  ".bc-purse{width:100%;border:1px solid rgba(214,174,92,.7);border-radius:7px;text-align:left;font-family:inherit;color:inherit}",
  ".bc-capchip{font-family:inherit;cursor:pointer}",
  ".bc-homeloc{width:100%;text-align:left;font-family:inherit;color:inherit}",
  ".bc-homeloc:disabled{opacity:1}",
  ".bc-homeloc>svg:last-child{flex-shrink:0}",
  ".bc-curloc>svg:last-child{position:relative;flex-shrink:0}",
  ".bc-statcell{background:transparent;border-top:0;border-bottom:0;border-left:0;font-family:inherit;color:inherit;text-align:left;min-height:38px;cursor:pointer}",
  ".bc-upcoming{width:100%;border-left:0;border-right:0;border-top:0;text-align:left;font-family:inherit;cursor:pointer}",
  ".bc-upcoming>svg{flex-shrink:0;align-self:center}",
  ".bc-sec-anchor{scroll-margin-top:8px;height:0}",
  ".bc-locsheet-art{height:120px;border-radius:7px;overflow:hidden;border:1px solid rgba(214,174,92,.55);margin-bottom:8px}",
  ".bc-locsheet-art img{width:100%;height:100%;object-fit:cover}",
  ".bc-passage-meta{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12.5px;color:#d9b463;font-weight:700}",
  ".bc-passage-meta button{background:transparent;border:1px solid rgba(214,174,92,.45);border-radius:5px;color:#d9cfb7;font-size:12px;padding:2px 8px;min-height:28px}",
  ".bc-passage-text{font-size:15px;line-height:1.55;color:#e1d6c1;white-space:pre-line;margin-top:5px}",
  ".bc-edit-ta{min-height:220px}",
  ".bc-cardbar{display:flex;align-items:center;gap:2px;flex-shrink:0;padding:3px 6px;border-top:1px solid rgba(214,174,92,.35);background:rgba(6,12,22,.55)}",
  ".bc-cardbar button{display:inline-flex;align-items:center;gap:5px;min-height:34px;padding:3px 8px;border:0;border-radius:5px;background:transparent;color:#e1d6c1;font-size:13px;font-weight:700}",
  ".bc-cardbar-sep{flex:1;min-width:6px;height:18px;border-right:1px solid rgba(214,174,92,.3);margin-right:4px}",
  ".bc-composer-err{color:#f1c7b8;font-size:14px;padding:0 4px 6px}",
  ".bc-composer-tools{display:flex;align-items:center;gap:6px;padding:6px 2px 0}",
  ".bc-ctool{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:4px 12px;border:1px solid rgba(214,174,92,.5);border-radius:17px;background:#0a1320;color:#e1d6c1;font-size:13px;font-weight:700}",
  ".bc-ctool-plus{width:34px;padding:0;justify-content:center}",
  ".bc-ctool-on{border-color:#f3dda0;background:linear-gradient(180deg,#2b2614,#141109)}",
  ".bc-ctool-busy{border-color:#b48ae8;color:#e8dbff}",
  ".bc-ctool-busy b{margin-left:4px;padding:1px 7px;border-radius:9px;background:#3c2466;color:#fff;font-size:11.5px}",
  ".bc-actsheet-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}",
  ".bc-actbtn{display:flex;flex-direction:column;align-items:center;gap:4px;min-height:62px;padding:6px 4px;border:1px solid rgba(214,174,92,.5);border-radius:7px;background:#0a1320;color:#e1d6c1;font-size:12.5px;font-weight:700;text-align:center}",
  ".bc-actsheet-more{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}",
  ".bc-actsheet .bc-note{margin-top:8px}",
  "@keyframes bcCrit{0%,100%{box-shadow:0 0 0 0 rgba(224,90,75,0)}50%{box-shadow:0 0 0 2px rgba(224,90,75,.55),0 0 10px rgba(224,90,75,.45)}}",
  ".bc-crit{animation:bcCrit 1.6s ease-in-out infinite}",
  ".bc-pill.bc-crit{border-color:#e05a4b}",
  ".bc-statcell.bc-crit{animation:none}",
  ".bc-statcell.bc-crit .bc-statbar{animation:bcCrit 1.6s ease-in-out infinite;border-color:#e05a4b}",
  ".bc-statcell.bc-crit small{color:#f19a8f}",
  "@media (prefers-reduced-motion:reduce){.bc-crit,.bc-statcell.bc-crit .bc-statbar{animation:none}}",
  ".bc-root .bc-tile,.bc-root .bc-actrow,.bc-root .bc-invrow,.bc-root .bc-placerow,.bc-root .bc-spellrow,.bc-root .bc-actcard,.bc-root .bc-hubtab,.bc-root .bc-chip,.bc-root .bc-method,.bc-root .bc-region,.bc-root .bc-place,.bc-root .bc-listopt,.bc-root .bc-tilebtn,.bc-root .bc-attrbtn,.bc-root .bc-locbar,.bc-root .bc-curloc,.bc-root .bc-homeloc,.bc-root .bc-bondrow,.bc-root .bc-summary-grim,.bc-root .bc-summary-row,.bc-root .bc-progression,.bc-root .bc-cardbtn,.bc-root .bc-purse,.bc-root .bc-statcell,.bc-root .bc-ctool,.bc-root .bc-actbtn,.bc-root .bc-cardbar button,.bc-root .bc-kchip,.bc-root .bc-objective-btn,.bc-root .bc-travelbtn,.bc-root .bc-pills,.bc-root .bc-step{transition:transform .12s ease,border-color .15s ease,background-color .15s ease,box-shadow .15s ease,filter .15s ease;-webkit-tap-highlight-color:transparent}",
  ".bc-root .bc-tile:active,.bc-root .bc-actrow:active,.bc-root .bc-invrow:active,.bc-root .bc-placerow:active,.bc-root .bc-spellrow:active,.bc-root .bc-actcard:active,.bc-root .bc-hubtab:active,.bc-root .bc-chip:active,.bc-root .bc-method:active,.bc-root .bc-region:active,.bc-root .bc-place:active,.bc-root .bc-listopt:active,.bc-root .bc-tilebtn:active,.bc-root .bc-attrbtn:active,.bc-root .bc-locbar:active,.bc-root .bc-curloc:active,.bc-root .bc-homeloc:active,.bc-root .bc-bondrow:active,.bc-root .bc-progression:active,.bc-root .bc-cardbtn:active,.bc-root .bc-purse:active,.bc-root .bc-ctool:active,.bc-root .bc-actbtn:active,.bc-root .bc-travelbtn:active,.bc-root .bc-kchip:active{transform:scale(.985)}",
  ".bc-root .bc-summary-row:active,.bc-root .bc-statcell:active,.bc-root .bc-cardbar button:active,.bc-root .bc-pills:active{filter:brightness(1.25)}",
  "@media (hover:hover){.bc-root .bc-tile:hover,.bc-root .bc-actrow:hover,.bc-root .bc-invrow-wrap:hover,.bc-root .bc-placerow:hover,.bc-root .bc-spellrow:hover,.bc-root .bc-actcard:hover,.bc-root .bc-hubtab:hover,.bc-root .bc-method:hover,.bc-root .bc-region:hover,.bc-root .bc-place:hover,.bc-root .bc-listopt:hover,.bc-root .bc-tilebtn:hover,.bc-root .bc-attrbtn:hover,.bc-root .bc-locbar:hover,.bc-root .bc-curloc:hover,.bc-root .bc-homeloc:hover,.bc-root .bc-bondrow:hover,.bc-root .bc-progression:hover,.bc-root .bc-cardbtn:hover,.bc-root .bc-purse:hover,.bc-root .bc-actbtn:hover{border-color:#f3dda0!important;box-shadow:0 0 0 1px rgba(255,233,176,.18),0 6px 18px rgba(0,0,0,.4)}.bc-root .bc-chip:not(.bc-chip-on):hover,.bc-root .bc-ctool:hover,.bc-root .bc-kchip:hover{border-color:#d9b463}.bc-root .bc-summary-row:hover,.bc-root .bc-statcell:hover,.bc-root .bc-cardbar button:hover{background:rgba(217,180,99,.08)}}",
  ".bc-root button:focus-visible,.bc-root [role=\"button\"]:focus-visible,.bc-root select:focus-visible{outline:2px solid #f3dda0!important;outline-offset:2px}",
  ".bc-root button:disabled{cursor:default;opacity:.45;transform:none!important}",
  ".bc-root .bc-age[role=\"button\"]{cursor:pointer}",
  ".bc-shead-art .bc-shead-text{max-width:56%}",
  ".bc-shead-art .bc-shead-img{width:46%}",
  ".bc-hub-lower .bc-shead-art .bc-shead-img{width:34%;opacity:.75}",
  ".bc-hub-lower .bc-shead-art .bc-shead-text{max-width:66%}",
  ".bc-phead-art .bc-phead-text{max-width:64%}",
  ".bc-phead-art .bc-phead-img{width:44%}",
  ".bc-tile-text{max-width:none}",
  ".bc-tile .bc-tile-art{width:46%}",
  ".bc-tile-shade{background:linear-gradient(90deg,#0b1422 48%,rgba(11,20,34,.75) 64%,rgba(11,20,34,.1) 100%)!important}",
  ".bc-actcard-text{max-width:62%}",
  ".bc-place-text{max-width:60%}",
  ".bc-combatbar-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px}",
  ".bc-fightbtn{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:4px 14px;border-radius:18px;border:1px solid #ffb4a8;background:linear-gradient(180deg,#ff8a6a,#c0392b);color:#2a0907;font:800 14px Cinzel,Georgia,serif;letter-spacing:.04em;box-shadow:0 0 14px rgba(224,90,75,.55);animation:bcFightPulse 1.6s ease-in-out infinite}",
  "@keyframes bcFightPulse{0%,100%{box-shadow:0 0 8px rgba(224,90,75,.4)}50%{box-shadow:0 0 18px rgba(255,138,106,.85)}}",
  ".bc-sparcard{position:relative;display:flex;align-items:center;gap:10px;width:100%;min-height:72px;margin-bottom:12px;padding:8px 12px;border:1px solid rgba(214,174,92,.75);border-radius:9px;overflow:hidden;background:#0b1422;text-align:left;color:inherit;font-family:inherit}",
  ".bc-sparcard img{position:absolute;right:0;top:0;width:52%;height:100%;object-fit:cover}",
  ".bc-sparcard-shade{position:absolute;left:0;top:0;right:0;bottom:0;background:linear-gradient(90deg,#0b1422 44%,rgba(11,20,34,.55) 75%,rgba(11,20,34,.2))}",
  ".bc-sparcard>svg,.bc-sparcard-text{position:relative}",
  ".bc-sparcard-text{flex:1;min-width:0;max-width:68%}",
  ".bc-sparcard-text strong{display:block;font-family:Cinzel,Georgia,serif;font-size:16px;color:#f3dda0;font-variant:small-caps}",
  ".bc-sparcard-text small{display:block;font-size:12.5px;color:#e1d6c1;line-height:1.3;text-shadow:0 1px 3px #000}",
  ".bc-hero .bc-hero-name.bc-long,.bc-hero-big .bc-hero-name.bc-long{font-size:19px;letter-spacing:.04em}",
  ".bc-hero .bc-hero-sub.bc-long,.bc-hero-big .bc-hero-sub.bc-long{font-size:9px;letter-spacing:.08em}",
  ".bc-hero-back{width:44px;height:44px;border-radius:22px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;z-index:5}",
  ".bc-main-area{z-index:auto!important;isolation:auto!important}",
  ".bc-nav{position:relative!important;z-index:30!important;pointer-events:auto!important;touch-action:manipulation}",
  ".bc-nav *{touch-action:manipulation;-webkit-tap-highlight-color:transparent}",
  ".bc-hero{position:relative;z-index:6}",
  ".bc-scroll{-webkit-overflow-scrolling:auto;overscroll-behavior:auto}",
  ".bc-storybar{position:relative;z-index:6;flex-shrink:0;display:flex;align-items:center;gap:8px;min-height:54px;padding:calc(6px + env(safe-area-inset-top)) 8px 6px;border-bottom:1px solid rgba(214,174,92,.75);background:#0a1424;overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,.4)}",
  ".bc-storybar-img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:center 32%;opacity:.6}",
  ".bc-storybar-shade{position:absolute;left:0;top:0;right:0;bottom:0;background:linear-gradient(90deg,rgba(6,12,22,.94) 0,rgba(6,12,22,.72) 58%,rgba(6,12,22,.4))}",
  ".bc-storybar .bc-storybar-back{position:relative;left:auto;top:auto;flex-shrink:0;width:40px;height:40px;border-radius:20px}",
  ".bc-storybar-text{position:relative;flex:1;min-width:0}",
  ".bc-storybar-text strong{display:block;font-family:Cinzel,Georgia,serif;font-variant:small-caps;font-size:16.5px;line-height:1.15;color:#f6edd7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 3px #000}",
  ".bc-storybar-text small{display:block;font-size:12.5px;color:#d8ccb3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 3px #000}",
  ".bc-readbtn{position:relative;flex-shrink:0;display:inline-flex;align-items:center;gap:5px;height:34px;padding:0 11px;border-radius:17px;border:1px solid rgba(214,174,92,.7);background:rgba(6,12,22,.72);color:#f3dda0;font-family:inherit;font-size:13px;font-weight:700;white-space:nowrap;cursor:pointer;touch-action:manipulation}",
  ".bc-readbtn-on{background:linear-gradient(180deg,#f0d38a,#b38b3c);border-color:#f5e0a2;color:#2a1d0c}",
  ".bc-story .bc-statstrip{padding:3px 2px}",
  ".bc-story .bc-statcell{min-height:30px;gap:3px;padding:0 4px}",
  ".bc-story .bc-statcell-body{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:4px;align-items:baseline}",
  ".bc-story .bc-statcell-body span{grid-column:1;grid-row:1;font-size:10.5px}",
  ".bc-story .bc-statcell-body small{grid-column:2;grid-row:1;font-size:10px}",
  ".bc-story .bc-statbar{grid-column:1/-1;grid-row:2;height:4px;margin:2px 0 0}",
  ".bc-story .bc-upcoming{padding:4px 12px;font-size:13px}",
  ".bc-story .bc-chronicle-card{flex:1 1 auto;min-height:140px;margin:6px 6px 0!important}",
  ".bc-storycard-head{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:6px;height:34px;padding:0 4px 0 11px;border-bottom:1px solid rgba(214,174,92,.4);background:linear-gradient(180deg,rgba(26,38,58,.9),rgba(12,20,32,.6))}",
  ".bc-storycard-label{display:flex;align-items:center;gap:5px;min-width:0;font-family:Cinzel,Georgia,serif;font-variant:small-caps;font-size:13px;color:#d9b463;letter-spacing:.06em;white-space:nowrap}",
  ".bc-cardtools{display:flex;gap:2px;flex-shrink:0}",
  ".bc-cardtools button{width:36px;height:30px;display:flex;align-items:center;justify-content:center;border:0;border-radius:7px;background:transparent;color:#e1d6c1;cursor:pointer;touch-action:manipulation}",
  ".bc-cardtools button:active{background:rgba(217,180,99,.2)}",
  ".bc-cardtools button:disabled{opacity:.35;cursor:default}",
  ".bc-quickrow{flex-shrink:0;display:flex;align-items:center;gap:6px;padding:6px 8px 5px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-ms-overflow-style:none}",
  ".bc-quickrow::-webkit-scrollbar{display:none}",
  ".bc-qbtn{flex-shrink:0;display:inline-flex;align-items:center;gap:5px;height:34px;padding:0 12px;border:1px solid rgba(214,174,92,.55);border-radius:17px;background:#0a1320;color:#e9dfc8;font-family:inherit;font-size:13.5px;font-weight:700;white-space:nowrap;cursor:pointer;touch-action:manipulation}",
  ".bc-qbtn:active{filter:brightness(1.25)}",
  ".bc-qbtn:disabled{opacity:.45;cursor:default}",
  ".bc-qbtn-round{width:34px;padding:0;justify-content:center}",
  ".bc-qbtn-on{border-color:#f3dda0;background:linear-gradient(180deg,#2b2614,#141109);box-shadow:0 0 8px rgba(217,180,99,.3)}",
  ".bc-qbtn-busy{border-color:#b48ae8;color:#e8dbff}",
  ".bc-qbtn-busy b{margin-left:4px;padding:1px 7px;border-radius:9px;background:#3c2466;color:#fff;font-size:11.5px}",
  ".bc-qact{background:linear-gradient(180deg,#16243a,#0b1422);color:#f6edd7}",
  ".bc-qsep{flex-shrink:0;width:1px;height:22px;background:rgba(214,174,92,.4)}",
  ".bc-combatbar-slim{padding-top:4px;padding-bottom:4px}",
  ".bc-reading .bc-chronicle-card{margin-bottom:6px!important}",
  ".bc-composer{padding:5px 8px 6px!important}",
  "@media (max-height:640px){.bc-storybar{min-height:46px;padding-top:calc(3px + env(safe-area-inset-top));padding-bottom:3px}.bc-story .bc-upcoming{display:none}}",
  ".bc-pennant-r{width:64px;height:112px}",
  ".bc-pennant-r .bc-pennant-in{padding-top:calc(6px + env(safe-area-inset-top));gap:2px}",
  ".bc-pennant-r .bc-pennant-label{font-size:10px;padding:0 4px}",
  ".bc-pennant-r .bc-pennant-sub{font-size:10px;line-height:1.18;color:#f0e3bf;padding:0 4px;margin-top:2px;text-shadow:0 1px 2px #000}",
  ".bc-sq-head{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-bottom:6px}.bc-sq-head small{display:block;font-size:13px;color:#b8ad99}",
  ".bc-sq-filters{margin:4px 0 8px;flex-wrap:wrap}",
  ".bc-sq-card{border:1px solid rgba(214,174,92,.35);border-radius:8px;margin-bottom:7px;background:linear-gradient(180deg,#111d2e,#0b1422)}",
  ".bc-sq-card.with{border-color:rgba(95,209,169,.7);box-shadow:inset 3px 0 0 #5fd1a9}",
  ".bc-sq-card.dead{opacity:.55}",
  ".bc-sq-main{width:100%;display:flex;align-items:center;gap:10px;padding:8px 10px;background:none;border:0;color:inherit;text-align:left;font-family:inherit;cursor:pointer}",
  ".bc-sq-av{flex-shrink:0;width:38px;height:38px;border-radius:19px;border:1.5px solid #d9b463;display:flex;align-items:center;justify-content:center;font-family:Cinzel,Georgia,serif;font-size:14px;color:#f3dda0;background:#0a1220}",
  ".bc-sq-card.with .bc-sq-av{border-color:#5fd1a9;color:#c9fff0}",
  ".bc-sq-text{flex:1;min-width:0;display:flex;flex-direction:column}",
  ".bc-sq-text strong{font-size:16px;color:#f6edd7;display:flex;align-items:center;gap:6px}",
  ".bc-sq-text small{font-size:12.5px;color:#b8ad99;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".bc-sq-new{font-style:normal;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:1px 6px;border-radius:8px;background:#3c2466;color:#e8dbff}",
  ".bc-sq-where{display:flex;align-items:center;gap:4px;font-size:12.5px;margin-top:2px;color:#cfd7e6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".bc-sq-where.with{color:#7ff0c8;font-weight:700}.bc-sq-where.mission{color:#f3dda0}.bc-sq-where.unknown{color:#8f8a80;font-style:italic}.bc-sq-where.dead{color:#e7a59a}",
  ".bc-sq-side{flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:4px;width:74px}",
  ".bc-sq-cond{font-size:11.5px;font-weight:700;padding:1px 7px;border-radius:9px;border:1px solid;text-transform:capitalize;white-space:nowrap}",
  ".bc-sq-cond.c0{color:#9fe7c0;border-color:#3f8f6a}.bc-sq-cond.c1{color:#e8dc9a;border-color:#8f7f3f}.bc-sq-cond.c2{color:#f2b98a;border-color:#9a5f35}.bc-sq-cond.c3,.bc-sq-cond.c4{color:#f39a8f;border-color:#9a3f35}",
  ".bc-sq-hp{display:block;width:70px;height:5px;border-radius:3px;background:#05080e;border:1px solid #2a3344;overflow:hidden}.bc-sq-hp i{display:block;height:100%;background:linear-gradient(90deg,#8a2622,#e05a4b)}",
  ".bc-sq-more{padding:0 10px 10px 58px}",
  ".bc-sq-hist{margin-top:4px;font-size:12.5px;color:#d8ccb3}.bc-sq-hist div{padding:2px 0;border-top:1px solid #1f2a3a}.bc-sq-hist span{color:#d9b463;margin-right:6px}"
].join("\n");

/* ---------- value helpers ---------- */
function pj(v, d) {
  if (v === undefined || v === null || v === "") return d;
  if (typeof v === "string") {
    var s = v.trim();
    if (s.charAt(0) === "{" || s.charAt(0) === "[") { try { var p = JSON.parse(s); return p === null || p === undefined ? d : p; } catch (e) { return d; } }
    return d;
  }
  return v;
}
function arr(v) { var p = pj(v, []); return Array.isArray(p) ? p : []; }
function obj(v) { var p = pj(v, {}); return p && typeof p === "object" && !Array.isArray(p) ? p : {}; }
function str(v) { if (v === undefined || v === null) return ""; if (typeof v === "object") { try { return JSON.stringify(v); } catch (e) { return ""; } } return String(v); }
function num(v, d) { var n = Number(v); return isNaN(n) ? (d === undefined ? 0 : d) : n; }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function isTrue(v) { return v === true || v === "true"; }
function bandOf(n) {
  n = num(n, 0);
  if (n >= 95) return "Extraordinary"; if (n >= 85) return "Exceptional"; if (n >= 70) return "Strong";
  if (n >= 55) return "Good"; if (n >= 40) return "Average"; if (n >= 25) return "Modest"; if (n >= 10) return "Poor"; return "Negligible";
}
function send(api, text) { if (api && typeof api.sendMessage === "function" && !api.isStreaming) api.sendMessage(text); }
function tellGM(api, hidden, visible) {
  if (!api || api.isStreaming) return;
  if (typeof api.injectContext === "function") api.injectContext(hidden, { role: "system" });
  if (typeof api.sendMessage === "function") api.sendMessage(visible);
}
/* ---------- deterministic magic ledger / UI cast bridge ---------- */
function bcPatch(api, patch, cb) {
  if (!canWrite(api)) { cb && cb(false); return; }
  try {
    var result;
    if (typeof api.patchVariables === 'function') result = api.patchVariables(patch);
    else result = Promise.all(Object.keys(patch).map(function(k){return api.setVariable(k,patch[k]);}));
    if (result && typeof result.then === 'function') result.then(function(){cb&&cb(true);},function(){cb&&cb(false);});
    else cb && cb(true);
  } catch(err) { cb&&cb(false); }
}
function bcCastFromUI(api, spell, opts, onDone) {
  var v=(api&&api.variables)||{};
  var cast=bcApplyPlayerCast(v,spell,opts);
  if (!cast.ok) {onDone&&onDone(false,cast.reason||'Spell could not be cast.');return;}
  var receipt=cast.record,plan=cast.plan;
  bcPatch(api,cast.patch,function(ok){
    if(!ok){onDone&&onDone(false,'Unable to save the spell cost; no action was sent.');return;}
    var instruction='DETERMINISTIC CAST '+receipt.id+': The UI ALREADY debited '+plan.manaUnits+
      ' mana units, '+plan.stamina+' stamina and added '+plan.fatigue+' fatigue. The exact mana cost is '+plan.manaPercent+
      '% of a reserve of '+plan.maxUnits+' units. Do not change mana, stamina or fatigue again for this cast. '+
      'Its base impact score at '+receipt.output+' output is '+plan.impact+' (not direct vitality damage). '+
      'Resolve hit/miss, target, timing, resistance and consequences in fiction. For a concrete harmful hit, add exactly ONE '+
      '[spell_events: push {"id":"hit-'+receipt.id+'-target-unique","actor":"player","castId":"'+receipt.id+'","target":"exact-npc-key-or-player","outcome":"hit","defense":"none"}] '+
      'at the end; replace the target and event-id suffix with the actual NPC key (or player), outcome and defense; use a different event ID for EACH target; do not manually change vitality, stamina or fatigue for that hit. The UI engine handles vitality, stamina and fatigue impact when the event is committed. '+
      'If the spell misses, is merely a utility effect, or fails before hitting, do not create a damaging impact event. '+
      'Casting does not guarantee success. '+(plan.freeform?'Freeform spell shape: '+String(opts.description||'')+'. Tier '+plan.tier+'.':'Stored spell page: '+receipt.spellName+'.');
    var msg=plan.freeform?'[UI:FREEFORM_CAST] '+String(opts.description||'I shape my magic')+'; output='+receipt.output+'; scale='+plan.tier+'; receipt='+receipt.id
      :'[UI:CAST] spell='+receipt.spellName+'; output='+receipt.output+'; target='+(String(opts.target||'as fits the moment'))+'; receipt='+receipt.id;
    tellGM(api,instruction,msg);onDone&&onDone(true,'');
  });
}
function useSpellStateSync(api) {
  var v=(api&&api.variables)||{},mp=obj(v.magic_profile);
  var sig=JSON.stringify([v.spells,v.magic_profile,v.mana,v.mana_reserve,v.character_created]);
  var attempted=React.useRef('');
  React.useEffect(function(){
    if(!canWrite(api)||!isTrue(v.character_created)||attempted.current===sig)return;
    var patch={},normalized=bcNormalizeSpells(arr(v.spells));
    if(normalized)patch.spells=normalized;
    var hasProfile=num(mp.capacity,0)>0||mp.magicless===true||mp.no_mana===true||arr(mp.special).some(function(x){return /^(magicless|mana-less|anti-magic)$/i.test(str(x));});
    if(hasProfile){
      var reserve=bcReserve(v);var stored=obj(v.mana_reserve);
      if(JSON.stringify(reserve)!==JSON.stringify(stored))patch.mana_reserve=reserve;
      if(!reserve.maxUnits&&num(v.mana,0)!==0)patch.mana=0;
    }
    if(!Object.keys(patch).length){attempted.current='';return;}
    attempted.current=sig;bcPatch(api,patch,function(ok){if(!ok)attempted.current='';});
  },[sig,!!(api&&api.isStreaming)]);
}
function useSpellEventWatcher(api) {
  var v=(api&&api.variables)||{};
  var sig=JSON.stringify([v.spell_events,v.spell_ledger,v.spells,v.magic_profile,v.mana_reserve,v.mana,v.stamina,v.fatigue,v.world_truth,v.vitality,v.character_created]);
  var inFlight=React.useRef(false),attempted=React.useRef('');
  React.useEffect(function(){
    if(!canWrite(api)||!isTrue(v.character_created)||inFlight.current||attempted.current===sig)return;
    var result=bcProcessEvents(v);
    if(!result)return;
    inFlight.current=true;attempted.current=sig;
    var patch=result.patch;
    if(arr(v.spell_events).length>80)patch.spell_events=arr(v.spell_events).slice(-64);
    bcPatch(api,patch,function(ok){inFlight.current=false;if(!ok)attempted.current='';});
  },[sig,!!(api&&api.isStreaming)]);
}
var TRAIN_RATES = { Light: { st: 3, mn: 1, ft: 2 }, Moderate: { st: 6, mn: 3, ft: 4 }, Hard: { st: 10, mn: 6, ft: 7 }, Extreme: { st: 15, mn: 10, ft: 11 } };
function advanceClock(v, hours) {
  var t = str(v.world_time).match(/^(\d{1,2}):(\d{2})/);
  var mins = (t ? parseInt(t[1], 10) * 60 + parseInt(t[2], 10) : 0) + Math.round(hours * 60);
  var days = Math.floor(mins / 1440); mins = ((mins % 1440) + 1440) % 1440;
  var newTime = (Math.floor(mins / 60) < 10 ? "0" : "") + Math.floor(mins / 60) + ":" + (mins % 60 < 10 ? "0" : "") + (mins % 60);
  return { time: newTime, days: days };
}
function applyTraining(api, hours, intensity) {
  var v = api.variables || {}; var rate = TRAIN_RATES[intensity] || TRAIN_RATES.Moderate;
  var newStamina = clamp(num(v.stamina, 0) - Math.round(rate.st * hours), 0, 100);
  var newMana = clamp(num(v.mana, 0) - Math.round(rate.mn * hours), 0, 100);
  var newFatigue = clamp(num(v.fatigue, 0) + Math.round(rate.ft * hours), 0, 100);
  var adv = advanceClock(v, hours);
  canWrite(api) && api.setVariable("stamina", newStamina);
  canWrite(api) && api.setVariable("mana", newMana);
  canWrite(api) && api.setVariable("fatigue", newFatigue);
  canWrite(api) && api.setVariable("world_time", adv.time);
  if (adv.days > 0) {
    canWrite(api) && api.setVariable("world_date", addDays(v.world_date, adv.days));
    canWrite(api) && api.setVariable("elapsed_days", num(v.elapsed_days, 0) + adv.days);
  }
}
var TRAVEL_RATES = { "On foot": { st: 4, mn: 0, ft: 3 }, "Horse": { st: 2, mn: 0, ft: 1.5 }, "Carriage": { st: 1, mn: 0, ft: 1 }, "Broom": { st: 3, mn: 4, ft: 2.5 }, "Ship": { st: 1, mn: 0, ft: 1 } };
var TRAVEL_PACE_MULT = { "Relaxed": 0.7, "Normal": 1, "Hurried": 1.5 };
function applyTravel(api, hours, mode, pace, destName) {
  var v = api.variables || {}; var rate = TRAVEL_RATES[mode] || TRAVEL_RATES["On foot"]; var mult = TRAVEL_PACE_MULT[pace] || 1;
  if(mode==="On foot") {var burden=bcCarryProfile(bcNormalize(arr(v.inventory),v),obj(v.body_profile),bcWalletProfile(v.money).weightKg);mult*=Number.isFinite(burden.paceMult)?burden.paceMult:3.5;}
  var newStamina = clamp(num(v.stamina, 0) - Math.round(rate.st * mult * hours), 0, 100);
  var newMana = clamp(num(v.mana, 0) - Math.round(rate.mn * mult * hours), 0, 100);
  var newFatigue = clamp(num(v.fatigue, 0) + Math.round(rate.ft * mult * hours), 0, 100);
  var adv = advanceClock(v, hours);
  canWrite(api) && api.setVariable("stamina", newStamina);
  canWrite(api) && api.setVariable("mana", newMana);
  canWrite(api) && api.setVariable("fatigue", newFatigue);
  canWrite(api) && api.setVariable("world_time", adv.time);
  if (adv.days > 0) {
    canWrite(api) && api.setVariable("world_date", addDays(v.world_date, adv.days));
    canWrite(api) && api.setVariable("elapsed_days", num(v.elapsed_days, 0) + adv.days);
  }
  var dc = destName ? findCoords(destName, v.known_locations) : null;
  if (dc) { canWrite(api) && api.setVariable("player_x", dc.x); canWrite(api) && api.setVariable("player_y", dc.y); }
}
function useTravelResultWatcher(api) {
  var v = api.variables || {}; var report = str(v.last_travel_report);
  var lastRef = React.useRef("");
  React.useEffect(function () {
    if (!report || report === lastRef.current) return;
    lastRef.current = report;
    var m = report.match(/hours=([\d.]+);interrupted=(true|false)/i);
    function clear() { lastRef.current = ""; canWrite(api) && api.setVariable("last_travel_report", ""); }
    if (!m || !api.storage) { clear(); return; }
    api.storage.get("bc_pending_travel").then(function (raw) {
      var req = { mode: "On foot", pace: "Normal", dest: "" }; if (raw) { try { req = JSON.parse(raw); } catch (e) {} }
      var interrupted = m[2].toLowerCase() === "true";
      applyTravel(api, parseFloat(m[1]), req.mode, req.pace, interrupted ? null : req.dest);
      api.storage.remove && api.storage.remove("bc_pending_travel");
      clear();
    }).catch(clear);
  }, [report]);
}
function useAgeSyncWatcher(api) {
  var v = api.variables || {};
  var bd = obj(v.player_profile).birth_date; var wd = v.world_date;
  React.useEffect(function () {
    if (!bd || !wd) return;
    var b = parseWD(bd); var c = parseWD(wd);
    if (!b || !c) return;
    var age = c.year - b.year;
    if (c.monthIndex < b.monthIndex || (c.monthIndex === b.monthIndex && c.day < b.day)) age -= 1;
    if (age >= 0 && age !== num(v.player_age, -9999)) canWrite(api) && api.setVariable("player_age", age);
  }, [bd, wd]);
}
function useTrainResultWatcher(api) {
  var v = api.variables || {}; var report = str(v.last_train_report);
  var lastRef = React.useRef("");
  React.useEffect(function () {
    if (!report || report === lastRef.current) return;
    lastRef.current = report;
    var m = report.match(/hours=([\d.]+);interrupted=(true|false)/i);
    function clear() { lastRef.current = ""; canWrite(api) && api.setVariable("last_train_report", ""); }
    if (!m || !api.storage) { clear(); return; }
    api.storage.get("bc_pending_train").then(function (raw) {
      var req = { intensity: "Moderate" }; if (raw) { try { req = JSON.parse(raw); } catch (e) {} }
      applyTraining(api, parseFloat(m[1]), req.intensity);
      api.storage.remove && api.storage.remove("bc_pending_train");
      clear();
    }).catch(clear);
  }, [report]);
}
function canWrite(api) { return !!(api && typeof api.setVariable === "function" && !api.isStreaming); }

// One authoritative inventory array. This hook upgrades legacy item records
// after AI turns and keeps the weight HUD synchronized with every change.
function useInventoryConsistency(api) {
  var v=(api&&api.variables)||{};
  var incoming=arr(v.inventory);
  var signature=JSON.stringify([incoming, v.body_profile, v.current_location, v.home_location, v.scene_type, v.money, v.appearance_state, v.player_profile, v.mk_status, v.household]);
  var attempted=React.useRef('');
  React.useEffect(function() {
    if (!canWrite(api) || attempted.current===signature) return;
    var migrated=bcRestoreLegacyClothes(incoming,v);
    var normalized=bcNormalize(migrated,v);
    var carry=bcCarryProfile(normalized,obj(v.body_profile),bcWalletProfile(v.money).weightKg);
    var appearance=isTrue(v.character_created)?bcAppearance(normalized,v):{};
    var previousAppearance=obj(v.appearance_state);
    if(isTrue(v.character_created)) appearance.lastChangedId=previousAppearance.lastChangedId||'';
    var updates={};
    if (JSON.stringify(normalized)!==JSON.stringify(incoming)) updates.inventory=normalized;
    if (JSON.stringify(carry)!==JSON.stringify(obj(v.carry_state))) updates.carry_state=carry;
    if (JSON.stringify(appearance)!==JSON.stringify(previousAppearance)) updates.appearance_state=appearance;
    if (!Object.keys(updates).length) {attempted.current='';return;}
    attempted.current=signature;
    try {
      var result;
      if (typeof api.patchVariables==='function') result=api.patchVariables(updates);
      else {Object.keys(updates).forEach(function(k){api.setVariable(k,updates[k]);});}
      if(result&&typeof result.catch==='function') result.catch(function(){attempted.current='';});
    }catch(e){attempted.current='';}
  },[signature,!!(api&&api.isStreaming)]);
}
function bcClockForInventory(v,minutes) {
  if(!/^\d{1,2}:\d{2}$/.test(str(v.world_time))) return {};
  var adv=advanceClock(v,minutes/60),res={world_time:adv.time};
  if(adv.days>0) {res.world_date=addDays(v.world_date,adv.days);res.elapsed_days=num(v.elapsed_days,0)+adv.days;}
  return res;
}

function hexMix(a, b, t) {
  function h(x) { return parseInt(x, 16); }
  var ar = h(a.substr(1, 2)), ag = h(a.substr(3, 2)), ab = h(a.substr(5, 2)), br = h(b.substr(1, 2)), bg = h(b.substr(3, 2)), bb = h(b.substr(5, 2));
  function c(x, y) { var z = Math.round(x + (y - x) * t).toString(16); return z.length < 2 ? "0" + z : z; }
  return "#" + c(ar, br) + c(ag, bg) + c(ab, bb);
}
function splitKR(s, out) { var kr = str(s).split(",").map(function (x) { return x.trim(); }); if (kr.length === 1 && /realm$/i.test(kr[0])) { out.kingdom = ""; out.region = kr[0]; } else { out.kingdom = kr[0] || ""; out.region = kr.slice(1).join(", "); } if (!out.kingdom && /noble realm|common realm|forsaken realm/i.test(out.region)) out.kingdom = "Clover"; }
function parseLoc(s) {
  s = str(s).trim();
  var out = { place: "", settlement: s, kingdom: "", region: "" };
  var m = s.match(/^(.*?)\s+[\u2014\u2013-]\s+(.*?)\s*\(([^)]*)\)\s*$/);
  if (m) { out.place = m[1]; out.settlement = m[2]; splitKR(m[3], out); if (/^(clover|diamond|heart|spade)( kingdom)?$/i.test(out.settlement.trim())) { out.kingdom = out.settlement.trim().replace(/ kingdom$/i, ""); out.settlement = out.place; out.place = ""; } return out; }
  var m2 = s.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (m2) { out.settlement = m2[1]; splitKR(m2[2], out); }
  return out;
}
var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var MONTH_LEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function parseWD(d) {
  var s = str(d); var m = s.match(/(\d{1,2})\s+([A-Za-z]+)(?:,?\s*CY\s*(-?\d+))?/);
  if (!m) return null;
  var day = parseInt(m[1], 10); var mi = -1;
  for (var i = 0; i < 12; i++) { if (MONTHS[i].indexOf(m[2]) === 0) { mi = i; break; } }
  if (mi < 0 || !day) return null;
  var year = m[3] !== undefined ? parseInt(m[3], 10) : 0;
  return { day: day, monthIndex: mi, year: year };
}
function weekdayIndex(d) {
  var p = parseWD(d); if (!p) return -1;
  var doy = p.day - 1; for (var i = 0; i < p.monthIndex; i++) doy += MONTH_LEN[i];
  var total = p.year * 365 + doy;
  return ((total % 7) + 7) % 7;
}
function yearOf(d) { var p = parseWD(d); return p ? p.year : null; }
function seasonOf(d) {
  var s = str(d);
  for (var i = 0; i < 12; i++) { if (s.indexOf(MONTHS[i]) >= 0) return i >= 2 && i <= 4 ? "Spring" : (i >= 5 && i <= 7 ? "Summer" : (i >= 8 && i <= 10 ? "Autumn" : "Winter")); }
  return "";
}
function dayMonth(d) { var s = str(d); var m = s.match(/(\d{1,2})\s+([A-Z][a-z]+)/); return m ? m[1] + " " + m[2] : s.split(",")[0]; }
function dayMonthWD(d) { var wi = weekdayIndex(d); var dm = dayMonth(d); return wi >= 0 ? WEEKDAYS_SHORT[wi] + ", " + dm : dm; }
function fullDate(d) { var wi = weekdayIndex(d); var dm = dayMonth(d); var yr = yearOf(d); var s = wi >= 0 ? WEEKDAYS[wi] + ", " + dm : dm; return yr !== null ? s + ", CY " + yr : s; }
function clock12(t) {
  var m = str(t).match(/^(\d{1,2}):(\d{2})/); if (!m) return str(t);
  var h = parseInt(m[1], 10); var ap = h >= 12 ? "PM" : "AM"; var h12 = h % 12; if (h12 === 0) h12 = 12;
  return (h12 < 10 ? "0" : "") + h12 + ":" + m[2] + " " + ap;
}
function isNight(t) { var m = str(t).match(/^(\d{1,2})/); if (!m) return false; var h = parseInt(m[1], 10); return h < 6 || h >= 19; }
var GAZETTEER = {
  "Royal Capital": { x: 0, y: 0 }, "Kikka": { x: 2, y: 12 }, "Nean": { x: -8, y: 26 },
  "Hecairo": { x: 6, y: 28 }, "Hage": { x: -2, y: 52 }, "Rayaka": { x: 14, y: 46 },
  "Saussy": { x: -32, y: 44 }, "Sosshi": { x: -32, y: 44 }, "Raquey": { x: 14, y: -8 },
  "Kiten": { x: 58, y: 18 }, "First Dungeon": { x: 62, y: 8 }, "Witches' Forest": { x: 48, y: 58 },
  "Diamond Kingdom": { x: 140, y: 35 }, "Heart Kingdom": { x: -170, y: 15 }, "Spade Kingdom": { x: 0, y: 210 }
};
var MODE_KM_DAY = { "On foot": 30, "Horse": 55, "Carriage": 50, "Ship": 80, "Broom": 210 };
var PACE_SPEED_MULT = { "Relaxed": 0.8, "Normal": 1, "Hurried": 1.3 };
function findCoords(name, known) {
  var n = str(name);
  if (GAZETTEER[n]) return GAZETTEER[n];
  var hit = arr(known).filter(function (l) { return str(l.name) === n && typeof l.x === "number"; })[0];
  return hit ? { x: hit.x, y: hit.y } : null;
}
function distanceKm(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
function travelEta(km, mode, pace) {
  var daily = (MODE_KM_DAY[mode] || MODE_KM_DAY["On foot"]) * (PACE_SPEED_MULT[pace] || 1);
  var hours = (km / daily) * 10;
  return Math.max(0.5, Math.round(hours * 2) / 2);
}
function addDays(d, n) {
  var p = parseWD(d); if (!p) return d;
  var day = p.day, mi = p.monthIndex, yr = p.year;
  for (var i = 0; i < n; i++) {
    day += 1;
    if (day > MONTH_LEN[mi]) { day = 1; mi += 1; if (mi > 11) { mi = 0; yr += 1; } }
  }
  return day + " " + MONTHS[mi] + ", CY " + yr;
}
function kingdomLabel(k) { k = str(k).trim(); if (!k) return ""; return /kingdom|forest|land|border|sun/i.test(k) ? k : k + " Kingdom"; }
function weatherIcon(w, t) {
  var s = str(w).toLowerCase();
  if (/storm|thunder|rain|drizzle|shower/.test(s)) return "rain";
  if (/snow|sleet|cloud|overcast|fog|mist|grey|gray/.test(s)) return "cloud";
  return isNight(t) ? "moon" : "sun";
}
function getStore(api) {
  var s = api && api.storage;
  if (s && typeof s.get === "function") return s;
  if (typeof storage !== "undefined" && storage && typeof storage.get === "function") return storage;
  return null;
}
function quiet(pr) { if (pr && typeof pr.then === "function") pr.then(null, function () {}); }
var PORTRAIT_MEDIA_ID = "bc-portrait";
function artMediaId(k) { return "bc-art-" + k; }
function spellMediaId(id) { return "bc-spell-" + id; }
function personMediaId(id) { return "bc-person-" + id; }
function boundMediaId(k) { return "bc-bound-" + k; }
var BOUND_STATIC_KEYS = ["spirit", "devil", "spirit-sylph", "spirit-salamander", "spirit-undine", "spirit-the-earth-spirit"];
function dataUrlToFile(dataUrl, filename) {
  try {
    var parts = dataUrl.split(",");
    var mimeMatch = parts[0].match(/:(.*?);/);
    var mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    var bstr = atob(parts[1]);
    var n = bstr.length;
    var u8 = new Uint8Array(n);
    while (n--) u8[n] = bstr.charCodeAt(n);
    return new File([u8], filename, { type: mime });
  } catch (e) { return null; }
}
function readImage(file, maxW, maxH, cb) {
  try {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        try {
          var sc = Math.min(1, maxW / img.width, maxH / img.height);
          var w = Math.max(1, Math.round(img.width * sc)), h = Math.max(1, Math.round(img.height * sc));
          var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
          cv.getContext("2d").drawImage(img, 0, 0, w, h);
          cb("", cv.toDataURL("image/jpeg", 0.84));
        } catch (e) { cb("That image couldn't be processed here."); }
      };
      img.onerror = function () { cb("That file isn't an image this browser can read."); };
      img.src = reader.result;
    };
    reader.onerror = function () { cb("That file couldn't be read."); };
    reader.readAsDataURL(file);
  } catch (e) { cb("Images can't be loaded in this preview."); }
}
function artFor(api, local, key) {
  var v = (local && local[key]) || (key === "banner" ? ART.banner : (ART.tiles[key] || ""));
  if (!v) return "";
  if (v.indexOf("@asset:") === 0) {
    if (api && typeof api.resolveAssetUrl === "function") { try { return api.resolveAssetUrl(v) || ""; } catch (e) { return ""; } }
    return "";
  }
  return v;
}

/* ---------- icons ---------- */
var PATHS = {
  star: "M24 2 L28 20 L46 24 L28 28 L24 46 L20 28 L2 24 L20 20 Z",
  star2: "M24 11 L26 22 L37 24 L26 26 L24 37 L22 26 L11 24 L22 22 Z",
  bust: "M24 5 a8.5 8.5 0 1 1 0 17 a8.5 8.5 0 1 1 0 -17 Z M7 43 c0 -10 7.5 -17 17 -17 s17 7 17 17 Z",
  heart: "M24 43 C9 31 4 23 4 15.5 C4 9.5 8.8 5 14.3 5 C18.3 5 21.8 7.4 24 11 C26.2 7.4 29.7 5 33.7 5 C39.2 5 44 9.5 44 15.5 C44 23 39 31 24 43 Z",
  home: "M5 23 L24 6 L43 23 H38 V42 H29 V31 H19 V42 H10 V23 Z",
  bell: "M24 5 a3 3 0 0 1 3 3 v1.4 C32.8 11 36 16.2 36 22.5 v8 l4.5 5.5 H7.5 L12 30.5 v-8 C12 16.2 15.2 11 21 9.4 V8 a3 3 0 0 1 3 -3 Z M19 39 h10 a5 5 0 0 1 -10 0 Z",
  pin: "M24 3 C15.7 3 10 9.2 10 17.2 C10 28.5 24 45 24 45 S38 28.5 38 17.2 C38 9.2 32.3 3 24 3 Z M24 11 a6 6 0 1 0 0.01 0 Z",
  spade: "M24 4 C30 14 42 20 42 29 C42 35 36.5 38 31.5 35.5 C29 34.3 27 32.5 26 30.5 C26.5 35 28 39 31 42 H17 C20 39 21.5 35 22 30.5 C21 32.5 19 34.3 16.5 35.5 C11.5 38 6 35 6 29 C6 20 18 14 24 4 Z",
  hourglass: "M12 5 H36 V9 C36 16.5 29.5 20.5 27 24 C29.5 27.5 36 31.5 36 39 V43 H12 V39 C12 31.5 18.5 27.5 21 24 C18.5 20.5 12 16.5 12 9 Z",
  menu: "M8 12 H40 V16 H8 Z M8 22 H40 V26 H8 Z M8 32 H40 V36 H8 Z",
  basket: "M6 19 H42 L38 41 C37.7 42.4 36.5 43 35 43 H13 C11.5 43 10.3 42.4 10 41 Z M15 19 L21 7 H24.5 L18.5 19 Z M33 19 L27 7 H23.5 L29.5 19 Z",
  sun: "M24 14 a10 10 0 1 1 0 20 a10 10 0 1 1 0 -20 Z M22.5 2 h3 v7 h-3 Z M22.5 39 h3 v7 h-3 Z M2 22.5 h7 v3 h-7 Z M39 22.5 h7 v3 h-7 Z M8.1 10.2 l2.1 -2.1 5 5 -2.1 2.1 Z M32.8 34.9 l2.1 -2.1 5 5 -2.1 2.1 Z M10.2 39.9 l-2.1 -2.1 5 -5 2.1 2.1 Z M34.9 15.2 l-2.1 -2.1 5 -5 2.1 2.1 Z",
  moon: "M30 4 C20 5 12 13.5 12 24 C12 34.5 20.5 43 31 43 C35 43 38.6 41.8 41.6 39.6 C31.5 38.9 23.5 30.5 23.5 20.3 C23.5 13.4 26.1 8 30 4 Z",
  cloud: "M14 38 C8.5 38 5 34 5 29.5 C5 25 8.5 21.6 13 21.3 C14.2 15.4 19 11 25 11 C31 11 35.8 15.2 36.8 21 C41 21.4 44 25 44 29.3 C44 34 40.5 38 35.5 38 Z",
  rain: "M14 30 C8.5 30 5 26 5 21.5 C5 17 8.5 13.6 13 13.3 C14.2 7.4 19 3 25 3 C31 3 35.8 7.2 36.8 13 C41 13.4 44 17 44 21.3 C44 26 40.5 30 35.5 30 Z M15 34 l-3 8 h3 l3 -8 Z M25 34 l-3 8 h3 l3 -8 Z M35 34 l-3 8 h3 l3 -8 Z",
  chevr: "M17 8 L33 24 L17 40", chevl: "M31 8 L15 24 L31 40", chevd: "M8 17 L24 33 L40 17",
  wisp: "M24 3 C30 11 33 17 29 23 C34 24 38 29 36 35 C34 41 28 45 22 43 C16 41 12 35 14 29 C10 28 7 24 9 19 C11 14 16 12 18 8 C20 5 22 4 24 3 Z M23 17 C21 21 21 25 24 28 C27 25 27 21 25 17 C24.5 16 23.5 16 23 17 Z"
};
function Insignia(p) {
  var kind = str(p.kind || "clover").toLowerCase(); var col = p.color || C.gold; var n = clamp(num(p.leaves, 3), 1, 5);
  if (kind.indexOf("diamond") >= 0) return <path d="M0,-26 L18,0 L0,26 L-18,0 Z" fill={col} />;
  if (kind.indexOf("heart") >= 0) return <path d="M0,22 C-26,4 -18,-22 0,-10 C18,-22 26,4 0,22 Z" fill={col} />;
  if (kind.indexOf("spade") >= 0) return <path d="M0,-26 C14,-10 26,0 14,12 C8,17 3,14 2,10 L6,24 L-6,24 L-2,10 C-3,14 -8,17 -14,12 C-26,0 -14,-10 0,-26 Z" fill={col} />;
  var leaves = [];
  for (var i = 0; i < n; i++) {
    var ang = (360 / n) * i + (n === 4 ? 45 : 0);
    leaves.push(<path key={i} d="M0,0 C-9,-6 -14,-18 -6,-25 C-2,-28 0,-24 0,-21 C0,-24 2,-28 6,-25 C14,-18 9,-6 0,0 Z" transform={"rotate(" + ang + ")"} fill={col} />);
  }
  return <g>{leaves}<path d="M0,3 C1,12 3,20 7,27" stroke={col} strokeWidth="2.6" fill="none" strokeLinecap="round" /></g>;
}
function Icon(p) {
  var n = p.n; var s = p.s || 24; var f = p.fill || "url(#bcg-gold)"; var dk = "#1a1408";
  if (n === "clover") return <svg width={s} height={s} viewBox="-32 -32 64 64" aria-hidden="true" style={p.style}><Insignia kind="clover" leaves={p.leaves || 3} color={f} /></svg>;
  var body = null;
  if (n === "chevr" || n === "chevl" || n === "chevd") body = <path d={PATHS[n]} fill="none" stroke={p.fill || C.gold} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />;
  else if (n === "compass") body = <g><circle cx="24" cy="24" r="15" fill="none" stroke={f} strokeWidth="1.6" /><path d={PATHS.star2} fill={f} transform="rotate(45 24 24)" opacity=".85" /><path d={PATHS.star} fill={f} /></g>;
  else if (n === "book") body = <g><path d="M11 5 H35 a4 4 0 0 1 4 4 V39 a4 4 0 0 1 -4 4 H11 a3 3 0 0 1 -3 -3 V8 a3 3 0 0 1 3 -3 Z" fill={f} /><path d="M13 5 V43" stroke={dk} strokeOpacity=".45" strokeWidth="2" /><g transform="translate(25 23) scale(.34)"><Insignia kind="clover" leaves={3} color={dk} /></g></g>;
  else if (n === "pack") body = <g><path d="M17 13 a7 7 0 0 1 14 0 v1 h1.5 a5.5 5.5 0 0 1 5.5 5.5 V40 a4 4 0 0 1 -4 4 H14 a4 4 0 0 1 -4 -4 V19.5 A5.5 5.5 0 0 1 15.5 14 H17 Z M20.5 14 h7 v-1 a3.5 3.5 0 0 0 -7 0 Z" fill={f} fillRule="evenodd" /><rect x="16" y="27" width="16" height="10" rx="2" fill={dk} fillOpacity=".35" /></g>;
  else if (n === "cards") body = <g><rect x="8" y="8" width="20" height="28" rx="3" transform="rotate(-14 18 22)" fill={f} /><rect x="19" y="9" width="20" height="28" rx="3" transform="rotate(10 29 23)" fill={f} stroke={dk} strokeOpacity=".5" /><circle cx="15" cy="37" r="7" fill={f} stroke={dk} strokeOpacity=".5" /></g>;
  else if (n === "scroll") body = <g><path d="M12 8 H33 a5 5 0 0 1 5 5 V38 a4 4 0 0 1 -4 4 H15 a5 5 0 0 1 -5 -5 V12 a4 4 0 0 1 2 -4 Z" fill={f} /><path d="M16 16 H32 M16 22 H32 M16 28 H28" stroke={dk} strokeOpacity=".45" strokeWidth="2" /></g>;
  else if (n === "map") body = <g><path d="M5 11 L17 6 L31 11 L43 6 V37 L31 42 L17 37 L5 42 Z" fill={f} /><path d="M17 6 V37 M31 11 V42" stroke={dk} strokeOpacity=".4" strokeWidth="1.6" /><path d="M9 33 C14 26 19 30 24 22 S34 17 38 13" fill="none" stroke={dk} strokeOpacity=".55" strokeWidth="1.8" strokeDasharray="2.5 2.5" /></g>;
  else if (n === "list") body = <g><path d="M13 6 H35 a3 3 0 0 1 3 3 V42 a3 3 0 0 1 -3 3 H13 a3 3 0 0 1 -3 -3 V9 a3 3 0 0 1 3 -3 Z" fill={f} /><rect x="18" y="3" width="12" height="7" rx="2" fill={f} stroke={dk} strokeOpacity=".5" /><path d="M16 18 H32 M16 25 H32 M16 32 H27" stroke={dk} strokeOpacity=".45" strokeWidth="2.2" /></g>;
  else if (n === "quill") body = <g><path d="M10 12 H30 a4 4 0 0 1 4 4 V40 H14 a4 4 0 0 1 -4 -4 Z" fill={f} opacity=".9" /><path d="M16 20 H28 M16 26 H28" stroke={dk} strokeOpacity=".4" strokeWidth="1.8" /><path d="M43 4 C34 8 27 16 23 30 L25 31 C30 20 36 13 43 4 Z" fill={f} stroke={dk} strokeOpacity=".45" /></g>;
  else if (n === "crest") body = <g><path d="M24 3 L41 9 V22 C41 32 34 40 24 45 C14 40 7 32 7 22 V9 Z" fill={f} /><g transform="translate(24 23) scale(.36)"><Insignia kind="clover" leaves={3} color={dk} /></g></g>;
  else if (n === "dots") body = <g fill={f}><circle cx="10" cy="24" r="4.5" /><circle cx="24" cy="24" r="4.5" /><circle cx="38" cy="24" r="4.5" /></g>;
  else body = <path d={PATHS[n] || PATHS.star} fill={f} fillRule="evenodd" />;
  return <svg width={s} height={s} viewBox="0 0 48 48" aria-hidden="true" style={p.style}>{body}</svg>;
}
function Defs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="bcg-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f5e0a2" /><stop offset=".48" stopColor="#d2aa55" /><stop offset="1" stopColor="#8a6a2e" /></linearGradient>
        <linearGradient id="bcg-ivory" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbf4e2" /><stop offset="1" stopColor="#cfc4a9" /></linearGradient>
      </defs>
    </svg>
  );
}

/* ---------- frame kit ---------- */
function Corners(p) {
  var s = p.s || 16; var col = p.c || C.gold;
  var list = [["tl", { top: 3, left: 3 }, ""], ["tr", { top: 3, right: 3 }, "translate(16 0) scale(-1 1)"], ["bl", { bottom: 3, left: 3 }, "translate(0 16) scale(1 -1)"], ["br", { bottom: 3, right: 3 }, "translate(16 16) scale(-1 -1)"]];
  return (
    <React.Fragment>
      {list.map(function (c) {
        return (
          <svg key={c[0]} width={s} height={s} viewBox="0 0 16 16" aria-hidden="true" style={Object.assign({ position: "absolute", pointerEvents: "none" }, c[1])}>
            <g transform={c[2]}><path d="M1.5 12.5 V5 Q1.5 1.5 5 1.5 H12.5" fill="none" stroke={col} strokeWidth="1.3" strokeLinecap="round" /><path d="M5.5 9 Q5.5 5.5 9 5.5" fill="none" stroke={col} strokeWidth="1" strokeLinecap="round" /><circle cx="9.3" cy="9.3" r="1.1" fill={col} /></g>
          </svg>
        );
      })}
    </React.Fragment>
  );
}
function Frame(p) {
  var st = Object.assign({ position: "relative", border: "1px solid " + C.goldLine, borderRadius: p.r === undefined ? 7 : p.r, background: p.bg || PANEL_BG,
    boxShadow: "inset 0 0 0 1px rgba(255,238,190,.06), 0 6px 18px rgba(0,0,0,.34)", padding: p.pad === undefined ? 14 : p.pad }, p.style || {});
  return <div className={"bc-frame " + (p.className || "")} style={st}>{p.corners === false ? null : <Corners s={p.cs} />}{p.children}</div>;
}
function Divider(p) {
  return (
    <div aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 8, margin: p && p.m ? p.m : "10px 0 16px" }}>
      <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, " + C.goldDim + ")" }} />
      <svg width="14" height="14" viewBox="0 0 48 48"><path d={PATHS.star} fill="url(#bcg-gold)" /></svg>
      <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, " + C.goldDim + ", transparent)" }} />
    </div>
  );
}
var RIB = "polygon(5% 0, 95% 0, 100% 50%, 95% 100%, 5% 100%, 0 50%)";
function Ribbon(p) {
  return (
    <div style={{ filter: "drop-shadow(0 5px 10px rgba(0,0,0,.65))", opacity: p.disabled ? 0.6 : 1 }}>
      <button type="button" aria-label={p.label} disabled={p.disabled} onClick={p.onClick}
        style={{ display: "block", width: "100%", padding: 2, border: "none", opacity: 1, background: "linear-gradient(90deg,#6f5424,#f0d58f 22%,#b38b3c 50%,#f0d58f 78%,#6f5424)", clipPath: RIB, WebkitClipPath: RIB }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 52, clipPath: RIB, WebkitClipPath: RIB,
          background: "radial-gradient(ellipse at 50% 0%, rgba(230,80,70,.55), transparent 65%), linear-gradient(180deg,#a3272a,#6d1415 58%,#480c0d)",
          color: "#f8eed2", fontFamily: DISPLAY, fontSize: 21, letterSpacing: ".12em", textTransform: "uppercase", textShadow: "0 1px 2px rgba(0,0,0,.85)" }}>{p.children}</span>
      </button>
    </div>
  );
}
function Btn(p) {
  var kind = p.kind || "ghost";
  var st = { minHeight: 44, padding: p.small ? "7px 12px" : "10px 16px", borderRadius: 6, fontSize: p.small ? 14.5 : 16, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, lineHeight: 1.2, fontFamily: BODY, fontWeight: 700 };
  if (kind === "gold") { st.background = "linear-gradient(180deg,#e9cc7e,#b38b3c)"; st.border = "1px solid #f5e0a2"; st.color = "#1c1509"; }
  else {
    st.background = p.active ? "linear-gradient(180deg,#231c10,#0f0d09)" : "rgba(13,14,16,.88)"; st.border = "1px solid " + (p.active ? C.gold : C.line);
    st.color = p.active ? C.goldHi : C.label; if (p.active) st.boxShadow = "0 0 10px rgba(201,162,78,.25)";
  }
  if (p.block) st.width = "100%";
  return <button className="bc-btn" type="button" aria-label={p.label} disabled={p.disabled} onClick={p.onClick} style={Object.assign(st, p.style || {})}>{p.children}</button>;
}
function Seg(p) {
  return (
    <div role="radiogroup" aria-label={p.label} style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {p.options.map(function (o) {
        var v = typeof o === "string" ? o : o.v; var l = typeof o === "string" ? o : o.l; var on = p.value === v;
        return (
          <button className="bc-choice" key={v} type="button" role="radio" aria-checked={on ? "true" : "false"} onClick={function () { p.onChange(v); }}
            style={{ minHeight: 44, padding: "8px 13px", borderRadius: 6, fontSize: 15, fontFamily: BODY, fontWeight: 700,
              border: on ? "1.5px solid " + C.gold : "1px solid " + C.line, background: on ? "linear-gradient(180deg,#221c10,#0f0d09)" : "rgba(13,14,16,.85)",
              color: on ? C.goldHi : C.label, boxShadow: on ? "0 0 10px rgba(201,162,78,.22)" : "none" }}>{l}</button>
        );
      })}
    </div>
  );
}
function Opt(p) {
  var on = !!p.on;
  return (
    <button className="bc-choice" type="button" onClick={p.onClick} aria-pressed={on ? "true" : "false"}
      style={{ display: "flex", gap: 12, alignItems: "flex-start", width: "100%", textAlign: "left", minHeight: 50, padding: "11px 12px", marginBottom: 8, borderRadius: 6,
        border: on ? "1.5px solid " + C.gold : "1px solid " + C.line, background: on ? "linear-gradient(180deg,#201a10,#0f0d09)" : "rgba(13,14,16,.85)",
        boxShadow: on ? "0 0 12px rgba(201,162,78,.22), inset 0 0 12px rgba(201,162,78,.08)" : "none", color: C.ivory }}>
      {p.icon ? <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 18, border: "1px solid " + (on ? C.gold : C.line), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: p.accent || C.goldHi, fontSize: 19, background: "#0b0c0e" }}>{p.icon}</span> : null}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 17, fontWeight: 700, color: on ? C.goldHi : C.ivory }}>
          {p.title}{p.tag ? <span style={{ fontSize: 12, fontWeight: 700, padding: "1px 8px", borderRadius: 10, border: "1px solid " + C.goldDim, color: C.gold }}>{p.tag}</span> : null}
        </span>
        {p.desc ? <span style={{ display: "block", fontSize: 14.5, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{p.desc}</span> : null}
      </span>
    </button>
  );
}
function Toggle(p) {
  var on = !!p.on;
  return (
    <button className="bc-choice" type="button" role="radio" aria-checked={on ? "true" : "false"} onClick={p.onClick}
      style={{ flex: 1, minHeight: 52, borderRadius: 6, border: on ? "1.5px solid " + C.gold : "1px solid " + C.line, background: on ? "linear-gradient(180deg,#1f1a10,#0f0d09)" : C.well,
        boxShadow: on ? "0 0 0 1px rgba(236,208,138,.2), 0 0 14px rgba(201,162,78,.3), inset 0 0 14px rgba(201,162,78,.12)" : "none",
        color: on ? C.goldHi : C.label, fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
      {p.icon ? <span aria-hidden="true" style={{ fontSize: 24, lineHeight: 1 }}>{p.icon}</span> : null}{p.children}
    </button>
  );
}
function Lbl(p) { return <div style={{ fontFamily: DISPLAY, fontSize: 12.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.label, margin: p.m || "0 0 8px" }}>{p.children}</div>; }
function Field(p) {
  return <div className="bc-field" style={{ marginBottom: 18 }}><Lbl>{p.label}</Lbl>{p.children}{p.hint ? <div style={{ fontSize: 14.5, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>{p.hint}</div> : null}</div>;
}
function H(p) { return <div style={{ fontFamily: DISPLAY, fontVariant: "small-caps", letterSpacing: ".05em", fontSize: p.size || 18, color: p.color || C.goldHi, margin: p.m || "4px 0 10px" }}>{p.children}</div>; }
function Eyebrow(p) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 11.5, letterSpacing: ".18em", textTransform: "uppercase", color: C.gold }}>{p.k}</div>
      <div style={{ fontFamily: DISPLAY, fontSize: 24, color: C.ivory, marginTop: 5, lineHeight: 1.18 }}>{p.children}</div>
    </div>
  );
}
function Empty(p) { return <div style={{ padding: "10px 2px 14px", color: C.muted, fontSize: 16, lineHeight: 1.5, fontStyle: "italic" }}>{p.children}</div>; }
function Row(p) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid " + C.lineSoft, fontSize: 16 }}><span style={{ color: C.muted }}>{p.k}</span><span style={{ textAlign: "right", color: C.ivory }}>{p.v}</span></div>;
}
function Sheet(p) {
  return (
    <div className="bc-sheet-overlay" role="dialog" aria-modal="true" aria-label={p.title} onClick={function (e) { if (e.target === e.currentTarget) p.onClose(); }}>
      <div className="bc-fade bc-sheet-panel">
        <div className="bc-wrap bc-sheet-inner">
          <div className="bc-sheet-head" style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "-14px -14px 8px", padding: "14px 14px 10px", background: "linear-gradient(180deg,rgba(24,22,18,.995),rgba(24,22,18,.98))", borderBottom: "1px solid rgba(201,162,78,.16)" }}><H size={20} m="0">{p.title}</H><Btn small label={p.closeLabel || "Close"} onClick={p.onClose}>{p.closeLabel || "Close"}</Btn></div>
          <div className="bc-sheet-scroll">
            {p.children}
            <div aria-hidden="true" style={{ height: 1 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ImgSlot(p) {
  var boxStyle = Object.assign({ position: "relative", width: "100%", height: p.h || 180, borderRadius: 5, overflow: "hidden", border: "1px solid " + C.goldLine, background: C.well }, p.boxStyle || {});
  return (
    <div style={{ marginTop: p.marginTop != null ? p.marginTop : 10, marginBottom: p.marginBottom != null ? p.marginBottom : 0 }}>
      <div style={boxStyle}>
        {p.url ? <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: p.fit || "cover", objectPosition: p.pos || "center center", display: "block" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n={p.placeholderIcon || "bust"} s={30} fill={C.goldDim} /></div>}
        <label aria-label={p.url ? "Change image" : "Add image"} style={{ position: "absolute", right: 6, bottom: 6, width: 30, height: 30, borderRadius: 15, border: "1px solid " + C.goldLine, background: "#0b0c0eee", display: "flex", alignItems: "center", justifyContent: "center", cursor: p.busy ? "default" : "pointer", opacity: p.busy ? .6 : 1, boxShadow: "0 1px 4px rgba(0,0,0,.5)" }}>
          <Icon n="quill" s={15} fill={C.gold} />
          <input type="file" accept="image/*" disabled={p.busy} onChange={p.onFile} style={{ display: "none" }} />
        </label>
      </div>
      {p.url && p.onRemove ? <Btn small style={{ marginTop: 6 }} onClick={p.onRemove}>Remove image</Btn> : null}
    </div>
  );
}

function turnImageUrls(text) {
  var out = []; var re = /\[\s*image:\s*(\/cdn\/key\/[A-Za-z0-9_-]+)[^\]\n]*\]/g; var m;
  while ((m = re.exec(str(text)))) out.push(m[1]);
  return out;
}
function lastTurnImageUrl(text) { var a = turnImageUrls(text); return a.length ? a[a.length - 1] : ""; }
function stripTurnImageEmbeds(text) { return str(text).replace(/\n*\[\s*image:\s*\/cdn\/key\/[A-Za-z0-9_-]+[^\]\n]*\]/g, "").trim(); }
function clipArtNote(s, n) { s = str(s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, Math.max(0, n - 1)).trim() + "…" : s; }
function pickIllustrationMessage(api, needle) {
  var msgs = arr(api && api.messages).filter(function (m) { return m && m.role === "assistant" && m.id && str(m.content); });
  if (!msgs.length) return null;
  var q = normSpeaker(needle);
  function findMatch(requireBlank) {
    for (var i = msgs.length - 1; i >= 0; i--) {
      if (requireBlank && lastTurnImageUrl(msgs[i].content)) continue;
      var c = normSpeaker(stripTurnImageEmbeds(msgs[i].content));
      if (!q || c.indexOf(q) >= 0 || c.indexOf(q.replace(/^(captain|sir|lady|queen|king)\s+/, "")) >= 0) return msgs[i];
    }
    return null;
  }
  return findMatch(true) || findMatch(false) || msgs[msgs.length - 1];
}
function AIArtForge(p) {
  var api = p.api;
  var es = React.useState(""); var extra = es[0], setExtra = es[1];
  var ss = React.useState(null); var settings = ss[0], setSettings = ss[1];
  var bs = React.useState(false); var busy = bs[0], setBusy = bs[1];
  var ms = React.useState(""); var msg = ms[0], setMsg = ms[1];
  var ps = React.useState(null); var pending = ps[0], setPending = ps[1];
  var hs = React.useState(false); var fine = hs[0], setFine = hs[1];
  var sig = arr(api && api.messages).map(function (m) { return str(m.id) + ":" + str(m.content).length + ":" + lastTurnImageUrl(m.content); }).join("|");
  function refresh() {
    if (!api || typeof api.getTurnImageSettings !== "function") { setSettings({ available: false }); return; }
    try { var pr = api.getTurnImageSettings(); if (pr && pr.then) pr.then(function (x) { setSettings(x || { available: false }); }, function () { setSettings({ available: false }); }); } catch (e) { setSettings({ available: false }); }
  }
  React.useEffect(function () { refresh(); }, []);
  React.useEffect(function () {
    if (!pending) return;
    var m = arr(api && api.messages).filter(function (x) { return x && x.id === pending.id; })[0];
    if (!m) return;
    var u = lastTurnImageUrl(m.content);
    if (u && u !== pending.before) {
      setBusy(false); setPending(null); setMsg("Generated and applied.");
      if (p.onApply) p.onApply(u, function (ok) { if (ok === false) setMsg("The picture was generated, but saving it failed."); });
    }
  }, [sig, pending && pending.id, pending && pending.before]);
  async function generate() {
    if (!api || typeof api.illustrateMessage !== "function") { setMsg("This Yumina build does not expose in-world image generation yet."); return; }
    var target = pickIllustrationMessage(api, p.needle || p.subject);
    if (!target) { setMsg("Play at least one story turn first, then try again. Yumina needs an assistant reply to attach the generated picture to."); return; }
    var note = clipArtNote(str(p.baseNote) + (extra.trim() ? " " + extra.trim() : ""), 198);
    setMsg(""); setBusy(true); setPending({ id: target.id, before: lastTurnImageUrl(target.content) });
    try {
      var ok = await api.illustrateMessage(target.id, note, !!fine);
      if (!ok) { setBusy(false); setPending(null); setMsg("Yumina couldn't generate that picture. Check Story illustrations in Settings → Display, or try again."); refresh(); }
    } catch (e) { setBusy(false); setPending(null); setMsg("Yumina couldn't generate that picture. Try again in a moment."); }
  }
  var available = settings && settings.available === true;
  var priceText = settings ? (num(settings.freeLeft, 0) > 0 ? (settings.freeLeft + " free generation" + (settings.freeLeft === 1 ? "" : "s") + " left") : (settings.unlimited ? "Included with your plan" : (typeof settings.price === "number" ? settings.price + " mushies per image" : "Image generation available"))) : "Checking Yumina image generation…";
  return (
    <Sheet title={p.title || "AI Image Forge"} closeLabel={p.closeLabel} onClose={function () { if (!busy) p.onClose(); }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(96px,140px) 1fr", gap: 12, alignItems: "start" }}>
        <div style={{ aspectRatio: p.aspect || "3 / 4", border: "1px solid " + C.goldLine, borderRadius: 6, overflow: "hidden", background: "#070809", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {p.currentUrl ? <img src={p.currentUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Icon n={p.icon || "bust"} s={42} fill={C.goldDim} />}
        </div>
        <div>
          <H size={17} m="0 0 6px">{p.subject || "Generate artwork"}</H>
          <div style={{ fontSize: 13.5, lineHeight: 1.45, color: C.muted }}>Yumina draws this with its new Story Illustrations system, then this UI automatically saves the result into the correct portrait/art slot. It does not create or rename an NPC.</div>
          <div style={{ marginTop: 8, fontSize: 12.5, color: available ? C.goldHi : C.muted }}>{priceText}</div>
        </div>
      </div>
      <Field label="Extra direction" hint="Optional. Add clothing, expression, framing, background, or other visual details.">
        <textarea className="bc-in bc-ta" maxLength={90} aria-label="Extra image direction" placeholder="For example: serious expression, moonlit squad headquarters" value={extra} onChange={function (e) { setExtra(e.target.value); }} />
      </Field>
      {settings && settings.fine ? <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: C.label, margin: "4px 0 12px" }}><input type="checkbox" checked={fine} onChange={function (e) { setFine(e.target.checked); }} /> High-detail redraw</label> : null}
      {!available && settings ? <div style={{ fontSize: 13, color: "#e1b991", lineHeight: 1.45, marginBottom: 10 }}>Story illustrations are not enabled for this session/account. Turn them on in Yumina Settings → Display → Experimental, then tap Check again.</div> : null}
      {msg ? <div role="alert" style={{ fontSize: 13, color: msg.indexOf("Generated") === 0 ? "#a9d7aa" : "#f1c7b8", marginBottom: 10 }}>{msg}</div> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn kind="gold" disabled={busy || !available} onClick={generate}>{busy ? "Drawing…" : (p.currentUrl ? "Generate a new version" : "Generate image")}</Btn>
        <Btn disabled={busy} onClick={refresh}>Check again</Btn>
        {settings && !settings.unlimited && num(settings.freeLeft, 0) <= 0 && typeof api.openCreditTopUp === "function" ? <Btn disabled={busy} onClick={function () { api.openCreditTopUp(); }}>Get mushies</Btn> : null}
      </div>
    </Sheet>
  );
}
function GrimoireForgeSheet(p) {
  var g = p.g || {}; var ap = obj(g.appearance); var saved = obj(p.art && p.art.grimoireDesign);
  var ds = React.useState({ color: str(saved.color) || str(ap.color || ap.cover) || "Forest green", trim: str(saved.trim) || "Gold", material: str(saved.material) || "Leather", condition: str(saved.condition) || (str(ap.wear) || "Pristine"), style: str(saved.style) || "Classic", aura: saved.aura === false ? false : (saved.aura || "Subtle") });
  var d = ds[0], setD = ds[1]; var ais = React.useState(false); var aiOpen = ais[0], setAiOpen = ais[1];
  var coverUrl = artFor(p.api, obj(p.art).art, "grimoire_cover");
  function set(k, val) { var n = Object.assign({}, d); n[k] = val; setD(n); }
  function save() { if (p.art && p.art.setGrimoireDesign) p.art.setGrimoireDesign(d, function () {}); if (p.api && p.api.showToast) p.api.showToast("Grimoire design saved", "success"); }
  var ins = str(g.insignia || "clover"); var leaves = num(g.leaf_count, 3); var attr = str(p.attr) || "magic";
  var baseNote = "Object-only 3:4 grimoire portrait: " + leaves + "-leaf " + ins + " emblem, " + d.color + " " + d.material + ", " + d.trim + " trim, " + attr + " motif, " + d.condition + ", " + d.style + ". No people, hands or text.";
  if (aiOpen) return <AIArtForge api={p.api} title="AI Grimoire Cover" closeLabel="Back" subject="Generate your grimoire cover" needle="grimoire" icon="book" aspect="3 / 4" currentUrl={coverUrl} baseNote={baseNote} onApply={function (u, cb) { p.art.setArt("grimoire_cover", u, cb); }} onClose={function () { setAiOpen(false); }} />;
  return (
    <Sheet title="Grimoire Forge" onClose={p.onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 14, alignItems: "start" }}>
        <div><Cover g={g} attr={p.attr} design={d} /><div style={{ fontSize: 11.5, color: C.muted, textAlign: "center", marginTop: 5 }}>Live crafted preview</div></div>
        <div>
          <H size={17} m="0 0 5px">Customize the book</H>
          <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.45 }}>Cosmetic only. Your real insignia, leaf count, spells and grimoire history stay controlled by game state and cannot be changed here.</div>
          {coverUrl ? <div style={{ marginTop: 9, fontSize: 12.5, color: C.gold }}>An AI cover is currently active.</div> : null}
        </div>
      </div>
      <Field label="Cover color"><select className="bc-in" value={d.color} onChange={function (e) { set("color", e.target.value); }}>{["Obsidian black","Forest green","Crimson red","Sapphire blue","Royal violet","Ivory","Umber brown","Amber gold"].map(function (x) { return <option key={x}>{x}</option>; })}</select></Field>
      <Field label="Trim"><Seg label="Trim" value={d.trim} options={["Gold","Silver","Bronze","Dark iron"]} onChange={function (x) { set("trim", x); }} /></Field>
      <Field label="Material"><Seg label="Material" value={d.material} options={["Leather","Velvet","Metal","Stone"]} onChange={function (x) { set("material", x); }} /></Field>
      <Field label="Condition"><Seg label="Condition" value={d.condition} options={["Pristine","Worn","Ancient"]} onChange={function (x) { set("condition", x); }} /></Field>
      <Field label="Decoration"><Seg label="Decoration" value={d.style} options={["Classic","Minimal","Ornate","Royal"]} onChange={function (x) { set("style", x); }} /></Field>
      <Field label="Magic aura"><Seg label="Magic aura" value={d.aura === false ? "Off" : str(d.aura)} options={["Off","Subtle","Normal","Strong"]} onChange={function (x) { set("aura", x === "Off" ? false : x); }} /></Field>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        <Btn kind="gold" onClick={save}>Save crafted design</Btn>
        <Btn onClick={function () { save(); setAiOpen(true); }}>Generate AI cover</Btn>
        {coverUrl ? <Btn onClick={function () { p.art.setArt("grimoire_cover", "", function () {}); }}>Use crafted cover instead</Btn> : null}
      </div>
    </Sheet>
  );
}
/* ---------- drawn stand-in art ---------- */
function SceneCastle() {
  var towers = [[144, 98, 9, 15, 0], [162, 82, 9, 19, 0], [180, 70, 10, 23, 1], [200, 52, 12, 32, 2], [220, 70, 10, 23, 1], [238, 82, 9, 19, 0], [256, 96, 9, 15, 0]];
  function crenellations(x, y, w) {
    var n = Math.max(3, Math.round(w / 5)); var out = []; var step = w / n;
    for (var i = 0; i < n; i += 2) out.push("M" + (x + i * step) + " " + y + " h" + step + " v-4 h-" + step + " Z");
    return out.join(" ");
  }
  return (
    <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }} aria-hidden="true">
      <defs>
        <linearGradient id="bcs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#173d78" /><stop offset=".5" stopColor="#4f86bf" /><stop offset="1" stopColor="#c3ddef" /></linearGradient>
        <radialGradient id="bcs-sun" cx=".78" cy=".18" r=".22"><stop offset="0" stopColor="#fff6d8" stopOpacity=".9" /><stop offset="1" stopColor="#fff6d8" stopOpacity="0" /></radialGradient>
        <linearGradient id="bcs-stoneL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5c6a80" /><stop offset=".5" stopColor="#c7cdd4" /><stop offset="1" stopColor="#8a97ab" /></linearGradient>
        <linearGradient id="bcs-stoneD" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#404a5c" /><stop offset=".5" stopColor="#8c95a5" /><stop offset="1" stopColor="#5a6478" /></linearGradient>
        <linearGradient id="bcs-roof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5b3a52" /><stop offset="1" stopColor="#33202f" /></linearGradient>
        <filter id="bcs-soft" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      <rect width="400" height="160" fill="url(#bcs-sky)" />
      <circle cx="312" cy="30" r="46" fill="url(#bcs-sun)" />
      <g fill="#ffffff" filter="url(#bcs-soft)" opacity=".85">
        <ellipse cx="58" cy="28" rx="30" ry="8" /><ellipse cx="82" cy="34" rx="22" ry="7" /><ellipse cx="38" cy="36" rx="18" ry="6" />
        <ellipse cx="292" cy="20" rx="34" ry="8" /><ellipse cx="322" cy="26" rx="24" ry="7" />
        <ellipse cx="190" cy="12" rx="26" ry="5" />
      </g>
      <path d="M0 118 L40 100 L84 112 L130 92 L176 106 L222 90 L268 108 L314 88 L360 106 L400 96 V160 H0 Z" fill="#93add0" opacity=".55" />
      <path d="M0 128 L36 112 L78 122 L122 104 L170 116 L216 100 L264 118 L312 100 L356 116 L400 108 V160 H0 Z" fill="#71890f" opacity="0" />
      <path d="M0 128 L36 112 L78 122 L122 104 L170 116 L216 100 L264 118 L312 100 L356 116 L400 108 V160 H0 Z" fill="#5e7096" opacity=".7" />
      <path d="M120 160 L130 130 L140 122 L148 126 L156 114 L166 120 L176 112 L188 118 L200 108 L212 118 L224 112 L234 120 L244 114 L252 126 L260 122 L270 130 L280 160 Z" fill="#3c4658" />
      <rect x="142" y="100" width="116" height="20" fill="url(#bcs-stoneL)" />
      <path d={crenellations(142, 100, 116)} fill="#5c6a80" />
      {towers.map(function (t, i) {
        var x = t[0], y = t[1], w = t[2], sh = t[3], tier = t[4];
        var grad = i % 2 === 0 ? "url(#bcs-stoneL)" : "url(#bcs-stoneD)";
        var roofTip = y - sh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={120 - y} fill={grad} />
            {tier ? <rect x={x - 1} y={y + 4} width={w + 2} height="2.5" fill="#33394a" opacity=".6" /> : null}
            {tier ? <rect x={x - 1} y={y + (120 - y) * 0.6} width={w + 2} height="2" fill="#33394a" opacity=".5" /> : null}
            <path d={crenellations(x - 1, y, w + 2)} fill={i % 2 === 0 ? "#c7cdd4" : "#8c95a5"} />
            {tier === 2 ? <rect x={x + w * 0.15} y={y - sh * 0.4} width={w * 0.7} height={sh * 0.4} fill={grad} /> : null}
            <path d={"M" + (x - 2) + " " + (tier === 2 ? y - sh * 0.4 : y) + " Q" + (x + w / 2) + " " + (roofTip - (tier === 2 ? sh * 0.35 : 0)) + " " + (x + w + 2) + " " + (tier === 2 ? y - sh * 0.4 : y) + " Z"} fill="url(#bcs-roof)" />
            <circle cx={x + w / 2} cy={roofTip - (tier === 2 ? sh * 0.4 : 0) - 3} r="1.4" fill="#e8c98a" />
            <path d={"M" + (x + w / 2 - 1.6) + " " + (y + 7) + " q1.6 -3 3.2 0 v5 h-3.2 Z"} fill="#e8c98a" opacity=".85" />
          </g>
        );
      })}
      <path d="M0 160 V140 L12 134 L22 140 V136 L34 128 L46 136 V132 L60 124 L72 132 V138 L86 130 L98 138 V160 Z M300 160 V138 L312 130 L324 138 V134 L338 126 L350 134 V130 L364 122 L376 130 V136 L390 130 L400 134 V160 Z" fill="#262d38" />
      <path d="M0 160 V150 C60 142 120 152 200 148 C280 144 340 152 400 146 V160 Z" fill="#12161d" />
    </svg>
  );
}
var SKY = { adventure: ["#1b3150", "#56789e"], grimoire: ["#1d140c", "#3a2715"], character: ["#15120f", "#2c2217"], squad: ["#141922", "#2a2019"], inventory: ["#221710", "#3a2716"],
  market: ["#100d15", "#2a1416"], missions: ["#2a1b10", "#4a3218"], map: ["#3d2f1b", "#6b5534"], relationships: ["#3a1f2c", "#b0674e"], more: ["#121216", "#26211b"] };
function TileScene(p) {
  var k = p.k; var id = "bct-" + k; var sky = SKY[k] || ["#111111", "#222222"]; var fg = null;
  if (k === "adventure") {
    fg = <g><path d="M0 64 V44 L30 34 L60 42 L95 30 L130 40 L165 28 L200 38 V64 Z" fill="#344a66" />
      <g fill="#243246"><rect x="138" y="22" width="5" height="16" /><path d="M136.5 22 L140.5 14 L144.5 22 Z" /><rect x="146" y="18" width="6" height="20" /><path d="M144.5 18 L149 8 L153.5 18 Z" /><rect x="154" y="24" width="5" height="14" /><path d="M152.5 24 L156.5 17 L160.5 24 Z" /></g>
      <path d="M0 64 V52 L8 46 L14 52 L20 44 L28 52 L36 46 L44 53 L52 45 L60 52 L70 47 L80 54 L92 48 L104 55 L120 50 L136 56 L150 51 L166 57 L182 52 L200 56 V64 Z" fill="#141e2a" />
      <path d="M120 64 C130 58 150 56 170 50" stroke="#c9a24e" strokeOpacity=".35" strokeWidth="1.5" fill="none" /></g>;
  } else if (k === "grimoire" || k === "more") {
    var books = []; var cols = ["#5a3a22", "#3d2a1a", "#6b4a2b", "#2f3d2a", "#4a2424"];
    for (var i = 0; i < 26; i++) {
      var bx = 8 + i * 7.3; var bh = 16 + ((i * 37) % 11);
      books.push(<rect key={"a" + i} x={bx} y={46 - bh} width="6" height={bh} fill={cols[i % 5]} opacity=".75" />);
      books.push(<rect key={"b" + i} x={bx} y={62 - bh + 4} width="6" height={bh - 4} fill={cols[(i + 2) % 5]} opacity=".7" />);
    }
    fg = <g>{books}<rect x="0" y="30" width="200" height="3" fill="#1a110a" /><rect x="0" y="58" width="200" height="3" fill="#1a110a" /><circle cx="150" cy="30" r="40" fill="#e8b35a" opacity={k === "more" ? ".08" : ".16"} /></g>;
  } else if (k === "character") {
    fg = <g><rect x="150" y="10" width="26" height="36" fill="#d9b56a" opacity=".18" /><path d="M150 10 H176 V46 H150 Z M163 10 V46 M150 28 H176" stroke="#0f0c09" strokeWidth="1.5" fill="none" opacity=".6" />
      <path d="M110 64 C110 50 118 42 128 42 C138 42 146 50 146 64 Z M128 22 a9 9 0 1 1 0 18 a9 9 0 1 1 0 -18 Z" fill="#0d0b09" opacity=".85" /></g>;
  } else if (k === "squad") {
    fg = <g>{[40, 80, 120, 160].map(function (x, i) { return <g key={i}><path d={"M" + x + " 4 H" + (x + 20) + " V40 L" + (x + 10) + " 34 L" + x + " 40 Z"} fill={i % 2 ? "#1f2e4a" : "#5a1a1a"} opacity=".85" /><path d={"M" + x + " 4 H" + (x + 20)} stroke="#c9a24e" strokeOpacity=".6" strokeWidth="1.5" /></g>; })}
      <circle cx="20" cy="30" r="14" fill="#f0a040" opacity=".18" /><circle cx="190" cy="30" r="14" fill="#f0a040" opacity=".18" /><rect x="0" y="54" width="200" height="10" fill="#0d0c0a" opacity=".7" /></g>;
  } else if (k === "inventory") {
    fg = <g fill="#140e08" opacity=".85"><rect x="120" y="36" width="30" height="24" /><rect x="152" y="30" width="26" height="30" /><ellipse cx="190" cy="48" rx="10" ry="14" /><path d="M120 36 H150 M120 48 H150 M152 44 H178" stroke="#6b4a2b" strokeOpacity=".5" /></g>;
  } else if (k === "market") {
    fg = <g><circle cx="140" cy="22" r="20" fill="#ff9a3d" opacity=".22" /><circle cx="176" cy="30" r="14" fill="#ff7a2d" opacity=".2" /><path d="M110 64 V40 L126 32 L142 40 V64 Z M150 64 V44 L166 36 L182 44 V64 Z" fill="#0c0a0d" opacity=".9" /><rect x="137" y="18" width="6" height="9" rx="1.5" fill="#ffc070" opacity=".8" /></g>;
  } else if (k === "missions") {
    fg = <g><rect x="100" y="6" width="96" height="54" fill="#2a1a0c" opacity=".6" />{[[108, 12, -4], [130, 14, 3], [154, 10, -2], [176, 16, 5], [118, 34, 2], [146, 32, -3], [170, 36, 4]].map(function (q, i) { return <rect key={i} x={q[0]} y={q[1]} width="16" height="18" fill="#d8c7a0" opacity=".45" transform={"rotate(" + q[2] + " " + (q[0] + 8) + " " + (q[1] + 9) + ")"} />; })}</g>;
  } else if (k === "map") {
    fg = <g><rect width="200" height="64" fill="#000000" opacity=".12" /><path d="M100 50 C120 30 140 44 160 26 S190 18 196 10" stroke="#2a1d10" strokeWidth="1.6" strokeDasharray="3 3" fill="none" opacity=".75" /><path d="M120 20 C124 16 132 18 134 24 C128 26 122 26 120 20 Z M150 44 C156 40 166 42 168 48 C160 50 154 50 150 44 Z" fill="#2a1d10" opacity=".4" /></g>;
  } else if (k === "relationships") {
    fg = <g><circle cx="160" cy="36" r="16" fill="#f4c27a" opacity=".45" /><path d="M0 64 V46 L14 38 L28 46 V42 L44 32 L60 42 V36 L78 28 L96 36 V44 L112 36 L128 44 V38 L146 30 L164 38 V44 L180 36 L200 42 V64 Z" fill="#2a1a1f" /></g>;
  }
  return (
    <svg viewBox="0 0 200 64" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }} aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient></defs>
      <rect width="200" height="64" fill={"url(#" + id + ")"} />{fg}
    </svg>
  );
}
function BannerArt(p) { return p.url ? <img src={p.url} alt="" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <SceneCastle />; }
function TitleBlock(p) {
  var big = p.small ? 22 : 28;
  return (
    <div style={Object.assign({ display: "flex", alignItems: "center", gap: 7 }, p.style || {})}>
      <svg width={p.small ? 28 : 36} height={p.small ? 28 : 36} viewBox="-32 -32 64 64" aria-hidden="true" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,.8))" }}><Insignia kind="clover" leaves={3} color="url(#bcg-ivory)" /></svg>
      <div>
        <div style={{ fontFamily: DISPLAY, fontVariant: "small-caps", fontSize: big, lineHeight: 1, color: "#f6eedb", letterSpacing: ".01em", textShadow: SHADOW, whiteSpace: "nowrap" }}>Black Clover</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 8.5, letterSpacing: ".32em", color: "#efe5c9", marginTop: 5, textShadow: SHADOW, whiteSpace: "nowrap" }}>A MAGE'S TALE</div>
      </div>
    </div>
  );
}
function Plaque(p) {
  return (
    <div role="group" aria-label={p.label} style={{ position: "absolute", right: 8, top: 0, width: 94, height: 128 }}>
      <svg viewBox="0 0 94 128" preserveAspectRatio="none" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }} aria-hidden="true">
        <defs><linearGradient id="bcp-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#101722" /><stop offset="1" stopColor="#070a0f" /></linearGradient></defs>
        <path d="M1 0 H93 V108 L47 127 L1 108 Z" fill="url(#bcp-bg)" stroke="#c9a24e" strokeOpacity=".8" strokeWidth="1.2" />
        <path d="M5 4 H89 V105 L47 122 L5 105 Z" fill="none" stroke="#c9a24e" strokeOpacity=".3" strokeWidth=".8" />
      </svg>
      <div style={{ position: "relative", textAlign: "center", padding: "calc(7px + env(safe-area-inset-top)) 4px 0" }}>
        <svg width="24" height="24" viewBox="-32 -32 64 64" aria-hidden="true"><Insignia kind="clover" leaves={3} color="url(#bcg-gold)" /></svg>
        <div style={{ fontFamily: DISPLAY, fontVariant: "small-caps", fontSize: 11.5, color: C.goldHi, lineHeight: 1.1, marginTop: 1 }}>{p.kingdom}</div>
        <div style={{ height: 1, background: C.goldDim, margin: "5px 12px" }} />
        <div style={{ fontFamily: DISPLAY, fontSize: 10.5, color: C.label, lineHeight: 1.35 }}>{p.season}{p.season ? <br /> : null}{p.date}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: DISPLAY, fontSize: 10.5, color: C.label, marginTop: 2 }}><Icon n={p.night ? "moon" : "sun"} s={12} />{p.time}</div>
      </div>
    </div>
  );
}
function Portrait(p) {
  var w = p.w || 92, h = p.h || 130;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 6, overflow: "hidden", border: "1px solid " + C.goldLine, background: "radial-gradient(ellipse at 50% 30%, #2d2c2f, #0b0b0d 75%)", boxShadow: "inset 0 0 0 2px rgba(0,0,0,.6)", flexShrink: 0 }}>
      {p.url ? <img src={p.url} alt="Your portrait" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        : <svg viewBox="0 0 92 130" preserveAspectRatio="xMidYMax meet" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }} aria-hidden="true">
            <path d="M46 30 a17 17 0 1 1 0 34 a17 17 0 1 1 0 -34 Z M8 130 C8 98 24 78 46 78 C68 78 84 98 84 130 Z" fill="#050506" opacity=".92" />
            <path d="M29.5 47 a16.5 16.5 0 0 1 33 0" fill="none" stroke="#c9a24e" strokeOpacity=".35" strokeWidth="1.2" />
          </svg>}
      <Corners s={10} />
    </div>
  );
}
function coverColor(name) {
  var s = str(name).toLowerCase();
  if (/black|ebony|obsidian/.test(s)) return "#1f1b1a"; if (/crimson|red|scarlet|wine/.test(s)) return "#6b2124";
  if (/green|emerald|moss/.test(s)) return "#2f4f3a"; if (/blue|navy|azure|sapphire/.test(s)) return "#243252";
  if (/purple|violet/.test(s)) return "#3d2a4a"; if (/grey|gray|slate|ash/.test(s)) return "#4a4744";
  if (/white|ivory|pale|bone/.test(s)) return "#bdb3a0"; if (/gold|amber|ochre/.test(s)) return "#86672f";
  if (/brown|umber|tan|leather/.test(s)) return "#4d3223";
  return "#4a2f25";
}
function auraColor(attr) {
  var s = str(attr).toLowerCase();
  if (/fire|flame|ash/.test(s)) return "#d0643a"; if (/water|ice|mercury/.test(s)) return "#4f8fc0";
  if (/wind|air|smoke/.test(s)) return "#6fbf9a"; if (/earth|stone|sand|steel/.test(s)) return "#a07f52";
  if (/lightning|thunder/.test(s)) return "#d8c24a"; if (/plant|wood|briar/.test(s)) return "#6f9f4a";
  if (/dark|shadow/.test(s)) return "#6a4f8a"; if (/light/.test(s)) return "#e8dc9a";
  return "#8fb0c0";
}
function grimoireTrim(name) {
  var s = str(name).toLowerCase();
  if (/silver|steel/.test(s)) return "#b9c0c8";
  if (/bronze|copper/.test(s)) return "#a66f3e";
  if (/iron|black/.test(s)) return "#5d5c60";
  if (/ivory|white/.test(s)) return "#e8dfc8";
  return C.gold;
}
function Cover(p) {
  var g = p.g || {}; var ap = obj(g.appearance); var d = obj(p.design);
  var chosenColor = str(d.color) || str(ap.color || ap.cover); var base = coverColor(chosenColor);
  var condition = str(d.condition || ap.wear); var worn = /tatter|worn|scuff|old|fray|dirt|battered|ancient|weathered/i.test(condition);
  var aura = auraColor(p.attr); var ins = str(g.insignia || "clover"); var leaves = num(g.leaf_count, 3);
  var trim = grimoireTrim(d.trim); var material = str(d.material || "Leather").toLowerCase(); var style = str(d.style || "Classic").toLowerCase();
  var auraOn = d.aura !== false && str(d.aura).toLowerCase() !== "off"; var auraOpacity = /strong|radiant/i.test(str(d.aura)) ? .68 : /subtle/i.test(str(d.aura)) ? .28 : .45;
  var label = "Your grimoire: " + (ins.indexOf("clover") >= 0 ? leaves + "-leaf clover" : ins) + " insignia" + (chosenColor ? ", " + chosenColor + " cover" : "");
  if (p.imgUrl) return <div style={{ width: "100%", maxWidth: p.small ? 92 : 200, margin: "0 auto", aspectRatio: "200 / 270", display: "flex", alignItems: "center", justifyContent: "center", background: "#070809", borderRadius: 6, overflow: "hidden", border: "1px solid " + trim }}><img src={p.imgUrl} alt={label} style={{ width: "100%", height: "100%", display: "block", objectFit: "contain", objectPosition: "center center" }} /></div>;
  return (
    <svg viewBox="0 0 200 270" style={{ width: "100%", maxWidth: p.small ? 92 : 200, display: "block", margin: "0 auto" }} role="img" aria-label={label}>
      <defs>
        <radialGradient id="bcAura" cx="50%" cy="46%" r="58%"><stop offset="0%" stopColor={aura} stopOpacity={auraOn ? auraOpacity : 0} /><stop offset="100%" stopColor={aura} stopOpacity="0" /></radialGradient>
        <linearGradient id="bcHide" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={hexMix(base, "#ffffff", material.indexOf("metal") >= 0 ? 0.28 : 0.16)} /><stop offset="100%" stopColor={hexMix(base, "#000000", material.indexOf("velvet") >= 0 ? 0.12 : 0.24)} /></linearGradient>
        <pattern id="bcStoneTex" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="3" cy="5" r="1.2" fill="#fff" opacity=".07" /><path d="M9 1 L14 6 M2 13 L7 9" stroke="#000" strokeOpacity=".12" strokeWidth=".8" /></pattern>
        <pattern id="bcMetalTex" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 2 H10 M0 7 H10" stroke="#fff" strokeOpacity=".055" strokeWidth=".7" /></pattern>
      </defs>
      <ellipse cx="100" cy="132" rx="100" ry="128" fill="url(#bcAura)" />
      <rect x="31" y="21" width="152" height="232" rx="8" fill="#e9dcbc" />
      <rect x="25" y="16" width="152" height="232" rx="9" fill="url(#bcHide)" stroke={trim} strokeWidth="1.4" />
      {material.indexOf("stone") >= 0 ? <rect x="25" y="16" width="152" height="232" rx="9" fill="url(#bcStoneTex)" /> : null}
      {material.indexOf("metal") >= 0 ? <rect x="25" y="16" width="152" height="232" rx="9" fill="url(#bcMetalTex)" /> : null}
      <rect x="25" y="16" width="15" height="232" rx="6" fill="#000000" fillOpacity="0.28" />
      <rect x="50" y="32" width="112" height="200" rx="5" fill="none" stroke={trim} strokeOpacity="0.58" />
      {/ornate|royal/i.test(style) ? <><path d="M59 48 Q106 72 153 48 M59 216 Q106 192 153 216" fill="none" stroke={trim} strokeOpacity=".48" strokeWidth="1.1" /><circle cx="106" cy="45" r="3" fill={trim} opacity=".62" /><circle cx="106" cy="219" r="3" fill={trim} opacity=".62" /></> : null}
      {/minimal/i.test(style) ? null : <path d="M25,40 L25,25 Q25,16 34,16 L49,16 Z M177,40 L177,25 Q177,16 168,16 L153,16 Z M25,224 L25,239 Q25,248 34,248 L49,248 Z M177,224 L177,239 Q177,248 168,248 L153,248 Z" fill={trim} />}
      <g transform="translate(106,128) scale(1.5)"><Insignia kind={ins} leaves={leaves} color={leaves >= 4 && ins.indexOf("clover") >= 0 ? "#dcc488" : trim} /></g>
      {worn ? <g stroke="#f4ecd9" strokeOpacity="0.18" strokeWidth="1.2"><path d="M60,70 L88,64" /><path d="M120,190 L150,198" /><path d="M140,60 L150,92" /><path d="M70,200 L64,226" /></g> : null}
    </svg>
  );
}
function Quote() {
  return (
    <div style={{ textAlign: "center", padding: "16px 20px 20px", fontStyle: "italic", fontSize: 15, color: C.label, lineHeight: 1.45 }}>
      <Divider m="0 30px 10px" />
      <div>{"\u201cNot giving up is my magic!\u201d"}</div>
      <div style={{ fontSize: 13, color: C.faint, marginTop: 3 }}>{"\u2014 Asta"}</div>
    </div>
  );
}

/* ---------- creation data ---------- */

var OPENINGS = {
  before: ["One year before the ceremony", "Three years before", "Five years before", "Ten years before", "A generation before"],
  during: ["The Grimoire Acceptance Ceremony", "The months before the Entrance Exam", "Right after the Entrance Exam", "Asta and Yuno's first year as Magic Knights"],
  later: ["Later era I", "Later era II", "Later era III"],
  after: ["Right after the published story", "Ten years after", "Twenty-five years after", "A generation later"],
  custom: []
};
var KINGDOMS = [
  { v: "Clover", sym: "\u2663", t: "Clover Kingdom", d: "Royals, nobles, commoners and the Forsaken Realm. Magic Knights, class prejudice, the broadest sandbox." },
  { v: "Diamond", sym: "\u2666", t: "Diamond Kingdom", d: "Mines, wasteland and war. Mage Warriors, scarcity, and experiments on mages." },
  { v: "Heart", sym: "\u2665", t: "Heart Kingdom", d: "Forests, rivers and rich natural mana. Spirit Guardians and Mana Method." },
  { v: "Spade", sym: "\u2660", t: "Spade Kingdom", d: "A kingdom whose rulers were overthrown. The era decides everything; the danger is political." },
  { v: "Other", sym: "\u2727", t: "Another origin", d: "The Witches' Forest, the Land of the Sun, the neutral borderlands, or somewhere you describe." }
];
var ORIGINS = {
  Clover: [
    { v: "Royal", d: "Born into a royal house: power, scrutiny and expectations.", subs: ["House Kira", "House Silva", "House Vermillion", "Cadet or related branch"] },
    { v: "Noble", d: "A noble family of the Noble Realm.", subs: ["Generated noble house", "Custom noble house"] },
    { v: "Commoner", d: "Ordinary life in the Common Realm.", subs: ["Urban household", "Merchant household", "Artisan household", "Military household", "Rural household"] },
    { v: "Peasant", d: "Hard life at the edge of the kingdom.", subs: ["Village household", "Farming household", "Church or orphan upbringing", "Laboring household"] },
    { v: "Custom", d: "Describe your own background.", subs: [] }
  ],
  Diamond: [
    { v: "Influential household", d: "Connected, comfortable, watched." }, { v: "Military household", d: "Service runs in the family." },
    { v: "Scholar household", d: "Close to the Mage Scholars and their secrets." }, { v: "Merchant or mining household", d: "Ore, trade and hard bargains." },
    { v: "Ordinary citizen", d: "Rations, work and propaganda." }, { v: "Poor laboring household", d: "Scarcity every day." },
    { v: "Orphan or state ward", d: "Raised by institutions." }, { v: "Custom", d: "Describe your own background." }
  ],
  Heart: [
    { v: "Royal household", d: "Extremely restricted; enormous responsibility." }, { v: "Guardian-affiliated household", d: "Close to the Spirit Guardians." },
    { v: "Mage household", d: "A family known for its magic." }, { v: "Agricultural household", d: "Fields, rivers and seasons." },
    { v: "Artisan household", d: "Craft and trade." }, { v: "Ordinary citizen", d: "A quiet life in a rich land." },
    { v: "Remote community", d: "Far from the capital, close to wild mana." }, { v: "Custom", d: "Describe your own background." }
  ],
  Spade: [
    { v: "Former royal loyalist", d: "Your family remembers the old crown." }, { v: "Military household", d: "The regime's army is family business." },
    { v: "Government-affiliated", d: "Close to power, and to its dangers." }, { v: "Ordinary citizen", d: "Head down, eyes open." },
    { v: "Rural citizen", d: "Far from the capital, not far enough." }, { v: "Occupied community", d: "Soldiers in the square." },
    { v: "Resistance-connected", d: "Someone you love is taking risks." }, { v: "Orphan or displaced", d: "The regime took your home." },
    { v: "Custom", d: "Describe your own background." }
  ],
  Other: [
    { v: "Witch of the Witches' Forest", d: "A closed, powerful community under the Witch Queen." }, { v: "Born in the Land of the Sun", d: "Scrolls, Ki and swords instead of grimoires." },
    { v: "Neutral borderlands", d: "Lawless country between the kingdoms." }, { v: "Wanderer", d: "No fixed home." }, { v: "Custom", d: "Describe your own background." }
  ]
};
var PLACES = {
  Clover: [
    { r: "Forsaken Realm", s: [{ n: "Hage", c: "canon", d: "Remote farming village with a church-orphanage and a grimoire tower." }, { n: "Sosshi", c: "canon", d: "A small Forsaken Realm village." }, { n: "A generated Forsaken village", c: "generated", d: "The world builds a village that fits." }] },
    { r: "Common Realm", s: [{ n: "Kiten", c: "canon", d: "A city near the Diamond border." }, { n: "Nairn", c: "canon", d: "A Common Realm town." }, { n: "Raque", c: "canon", d: "A seaside town." }, { n: "A generated town or city", c: "generated", d: "The world builds a town that fits." }] },
    { r: "Noble Realm", s: [{ n: "Royal Capital", c: "canon", d: "Clover Castle, Castle Town and the Magic Knights." }, { n: "A generated noble estate", c: "generated", d: "An estate that fits your family." }] }
  ],
  Diamond: [
    { r: "Mining regions", s: [{ n: "A generated mining settlement", c: "generated" }] },
    { r: "Military frontier", s: [{ n: "A generated garrison town", c: "generated" }, { n: "A generated border settlement", c: "generated" }] },
    { r: "Heartland", s: [{ n: "A generated capital district", c: "generated" }, { n: "A generated research district", c: "generated" }, { n: "A generated agricultural outpost", c: "generated" }] }
  ],
  Heart: [
    { r: "Royal lands", s: [{ n: "A town near the royal palace", c: "generated" }] },
    { r: "Forests and rivers", s: [{ n: "A generated forest settlement", c: "generated" }, { n: "A generated river village", c: "generated" }, { n: "A generated lakeside town", c: "generated" }] },
    { r: "Remote lands", s: [{ n: "A generated remote community", c: "generated" }] }
  ],
  Spade: [
    { r: "Capital region", s: [{ n: "A generated capital district", c: "generated" }] },
    { r: "Provinces", s: [{ n: "A generated occupied village", c: "generated" }, { n: "A generated provincial town", c: "generated" }] },
    { r: "Military frontier", s: [{ n: "A generated border stronghold", c: "generated" }] }
  ],
  Other: [
    { r: "Witches' Forest", s: [{ n: "Witches' Forest", c: "canon", d: "Neutral land of witches between Clover and Diamond." }] },
    { r: "Land of the Sun", s: [{ n: "A generated settlement in the Land of the Sun", c: "generated" }] },
    { r: "Neutral borderlands", s: [{ n: "A generated border settlement", c: "generated" }, { n: "On the road", c: "generated" }] }
  ]
};
var ATTRS = ["Fire", "Water", "Wind", "Earth", "Lightning", "Plant", "Ice", "Sand", "Smoke", "Stone", "Steel", "Sound", "Cotton", "Thread", "Mirror", "Poison", "Ash", "Spatial (rare)", "Light (very rare)", "Dark (very rare)"];
var STEPS = ["Identity", "Background", "Magic & Grimoire", "Origin", "Finalize"];
var STEP_HEAD = [
  ["I. Identity", "Every legend begins with a name."], ["II. Background", "Where you come from shapes how the world sees you."],
  ["III. Magic & Grimoire", "Your mana is yours. The grimoire chooses later."], ["IV. Origin", "Choose where your first morning begins."],
  ["V. Finalize", "Review your life before it begins."]
];
var BLANK = {
  name: "", sex: "", age: 15, appearance: "", appearance_detail: {}, personality: "", era: "during", opening: "The Grimoire Acceptance Ceremony", era_detail: "",
  homeland: "Clover", homeland_note: "", origin: "", origin_detail: "", origin_note: "", region: "", settlement: "", settlement_mode: "", custom_place: "",
  family_mode: "Generated family", family_note: "", magic_mode: "Random", attribute_choice: "", attribute_custom: "",
  talent_mode: "Natural", lean_reserves: "Average", lean_control: "Average", lean_physique: "Average", sandbox_note: "", race: "Human",
  canon_guidance: "Balanced", canon_participation: "Organic", interruptions: "Balanced", narrative_density: "Balanced",
  spoiler_level: "Anime-safe", content_continuity: "Core Canon", consequences: "Lethal"
};
function eraCode(f) {
  if (f.era === "during") return f.opening === OPENINGS.during[0] || f.opening === OPENINGS.during[1] ? "opening" : "knights";
  return f.era;
}

/* ---------- creator pieces ---------- */
function AppearanceSheet(p) {
  var d0 = obj(p.f.appearance_detail);
  var ds = React.useState(Object.assign({ hair: "", eyes: "", build: "", height: "", features: "", clothing: "", notes: "" }, d0)); var d = ds[0], setD = ds[1];
  var ps = React.useState(p.f.personality || ""); var pers = ps[0], setPers = ps[1];
  var ms = React.useState(""); var msg = ms[0], setMsg = ms[1];
  var afs = React.useState(false); var aiForge = afs[0], setAiForge = afs[1];
  function sd(k, x) { var n = Object.assign({}, d); n[k] = x; setD(n); }
  function done() {
    var parts = [];
    [["hair", "Hair"], ["eyes", "Eyes"], ["build", "Build"], ["height", "Height"], ["features", "Features"], ["clothing", "Clothing"]].forEach(function (x) { if (str(d[x[0]]).trim()) parts.push(x[1] + ": " + str(d[x[0]]).trim()); });
    if (str(d.notes).trim()) parts.push(str(d.notes).trim());
    p.setMany({ appearance_detail: d, appearance: parts.join(". "), personality: pers });
    p.close();
  }
  var bs = React.useState(false); var busy = bs[0], setBusy = bs[1];
  function onFile(e) {
    var fl = e.target.files && e.target.files[0]; e.target.value = "";
    if (!fl) return;
    readImage(fl, 360, 460, function (err, data) {
      if (err) { setMsg(err); return; }
      setMsg(""); setBusy(true);
      p.setPortrait(data, function (ok) { setBusy(false); if (!ok) setMsg(p.mediaError || "Upload failed \u2014 try again."); });
    });
  }
  if (aiForge) return <AIArtForge api={p.api} title="AI Portrait Forge" closeLabel="Back" subject={str(p.f.name) || "Your character"} currentUrl={p.portrait} baseNote={"Solo 3:4 anime character portrait. " + clipArtNote([d.hair && ("Hair: " + d.hair), d.eyes && ("Eyes: " + d.eyes), d.build && ("Build: " + d.build), d.height && ("Height: " + d.height), d.features, d.clothing].filter(Boolean).join("; "), 135) + ". Face visible, no other people."} onApply={function (u, cb) { p.setPortrait(u, cb); }} onClose={function () { setAiForge(false); }} />;
  return (
    <Sheet title="Appearance" onClose={p.close}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
        <Portrait url={p.portrait} w={84} h={110} />
        <div style={{ flex: 1 }}>
          <label style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "8px 14px", borderRadius: 6, border: "1px solid " + C.gold, color: C.goldHi, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? .6 : 1 }}>
            {busy ? "Uploading\u2026" : (p.portrait ? "Change portrait" : "Add a portrait")}<input type="file" accept="image/*" disabled={busy} onChange={onFile} style={{ display: "none" }} />
          </label>
          <Btn small kind="gold" disabled={busy} style={{ marginLeft: 8, marginTop: 6 }} onClick={function () { setAiForge(true); }}>AI Generate</Btn>
          {p.portrait ? <Btn small disabled={busy} style={{ marginLeft: 8, marginTop: 6 }} onClick={function () { setBusy(true); p.setPortrait("", function () { setBusy(false); }); }}>Remove</Btn> : null}
          <div style={{ fontSize: 13.5, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>{p.hasStore ? "Private to your account. Shown on your character card; never sent to the GM." : "Shown for this session only in this preview."}</div>
          {msg ? <div role="alert" style={{ fontSize: 13.5, color: "#f1c7b8", marginTop: 4 }}>{msg}</div> : null}
        </div>
      </div>
      <Field label="Hair"><input className="bc-in" aria-label="Hair" value={d.hair} placeholder="Color, length, style" onChange={function (e) { sd("hair", e.target.value); }} /></Field>
      <Field label="Eyes"><input className="bc-in" aria-label="Eyes" value={d.eyes} onChange={function (e) { sd("eyes", e.target.value); }} /></Field>
      <Field label="Build"><Seg label="Build" value={d.build} options={["Slight", "Lean", "Athletic", "Sturdy", "Heavy"]} onChange={function (x) { sd("build", x); }} /></Field>
      <Field label="Height"><Seg label="Height" value={d.height} options={["Short", "Average", "Tall"]} onChange={function (x) { sd("height", x); }} /></Field>
      <Field label="Distinguishing features"><input className="bc-in" aria-label="Distinguishing features" value={d.features} placeholder="Scars, marks, anything memorable" onChange={function (e) { sd("features", e.target.value); }} /></Field>
      <Field label="Clothing and style"><input className="bc-in" aria-label="Clothing" value={d.clothing} onChange={function (e) { sd("clothing", e.target.value); }} /></Field>
      <Field label="Presence and personality" hint="Describes who they are. It never makes choices for you.">
        <textarea className="bc-in bc-ta" aria-label="Personality" value={pers} onChange={function (e) { setPers(e.target.value); }} />
      </Field>
      <Field label="Anything else"><textarea className="bc-in bc-ta" aria-label="Appearance notes" value={d.notes} onChange={function (e) { sd("notes", e.target.value); }} /></Field>
      <Btn kind="gold" block onClick={done}>Save appearance</Btn>
    </Sheet>
  );
}

/* ---------- creator ---------- */

/* ---------- in-game pieces ---------- */
function condWord(v) { v = num(v, 100); if (v >= 85) return "Healthy"; if (v >= 60) return "Hurt"; if (v >= 35) return "Wounded"; if (v >= 15) return "Badly hurt"; return "Critical"; }
function levelWord(v) { v = num(v, 100); if (v >= 80) return "Full"; if (v >= 55) return "Good"; if (v >= 30) return "Low"; if (v >= 12) return "Very low"; return "Empty"; }
function fatWord(v) { v = num(v, 0); if (v <= 30) return "Fresh"; if (v <= 60) return "Tired"; if (v <= 80) return "Worn"; return "Exhausted"; }
function showNums(v) { return obj(v.sim_settings).show_numbers === true; }
function relBand(n) { n = num(n, 0); if (n >= 85) return "Deep"; if (n >= 70) return "Strong"; if (n >= 55) return "Good"; if (n >= 40) return "Fair"; if (n >= 25) return "Some"; if (n >= 10) return "Slight"; return "None"; }
function negBand(n) { n = num(n, 0); if (n >= 85) return "Intense"; if (n >= 70) return "Serious"; if (n >= 55) return "Real"; if (n >= 40) return "Notable"; if (n >= 25) return "Some"; if (n >= 10) return "Slight"; return "None"; }
function RelBar(p) {
  var val = clamp(num(p.value, 0), 0, 100);
  return (
    <div style={{ marginBottom: p.compact ? 6 : 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: p.compact ? 12 : 13.5, color: C.label, marginBottom: 3, fontWeight: 600 }}>
        <span>{p.label}</span><span style={{ color: p.neg ? "#e0a898" : C.goldHi }}>{p.text}{p.nums ? " (" + val + ")" : ""}</span>
      </div>
      <div style={{ height: p.compact ? 5 : 7, borderRadius: 4, background: "#07080a", border: "1px solid #24211c", overflow: "hidden" }}>
        <div style={{ width: val + "%", height: "100%", background: p.neg ? "linear-gradient(90deg,#7a2b24,#c24a3a)" : "linear-gradient(90deg,#8a6a2e,#e8cf8e)", transition: "width .4s ease" }} />
      </div>
    </div>
  );
}
var REL_ALWAYS = [["familiarity", "Familiarity"], ["trust", "Trust"], ["respect", "Respect"], ["affection", "Affection"], ["loyalty", "Loyalty"]];
var REL_COND_POS = [["attraction", "Attraction"]];
var REL_COND_NEG = [["rivalry", "Rivalry"], ["fear", "Fear"], ["resentment", "Resentment"]];
function PersonSheet(p) {
  var r = p.r; var nums = p.nums; var art = p.art;
  var imgUrl = art && art.personImageUrl ? art.personImageUrl(p.id) : "";
  var condPos = REL_COND_POS.filter(function (d) { return num(r[d[0]], 0) >= 10; });
  var condNeg = REL_COND_NEG.filter(function (d) { return num(r[d[0]], 0) >= 10; });
  var ps = React.useState(false); var portBusy = ps[0], setPortBusy = ps[1];
  var ms = React.useState(""); var portMsg = ms[0], setPortMsg = ms[1];
  var fs = React.useState(false); var forgeOpen = fs[0], setForgeOpen = fs[1];
  function onPersonFile(e) {
    var fl = e.target.files && e.target.files[0]; e.target.value = ""; if (!fl) return;
    setPortMsg("");
    readImage(fl, 640, 800, function (err, data) {
      if (err) { setPortMsg(err); return; }
      setPortBusy(true);
      art.setPersonImage(p.id, data, function (ok) {
        setPortBusy(false);
        if (!ok) setPortMsg(art.mediaError || "That portrait couldn't be saved. Try again.");
      });
    });
  }
  function removePersonImage() {
    setPortMsg(""); setPortBusy(true);
    art.setPersonImage(p.id, "", function (ok) {
      setPortBusy(false);
      if (!ok) setPortMsg(art.mediaError || "That portrait couldn't be removed.");
    });
  }
  if (forgeOpen) return <AIArtForge api={p.api} title="AI Portrait Forge" closeLabel="Back" subject={str(r.name) || p.id} needle={str(r.name) || p.id} currentUrl={imgUrl} baseNote={"Solo 3:4 anime character portrait of " + (str(r.name) || p.id) + ". " + clipArtNote([str(r.role), str(r.summary), str(r.appearance)].filter(Boolean).join("; "), 105) + ". Face visible, no player, no other people."} onApply={function (u, cb) { art.setPersonImage(p.id, u, cb); }} onClose={function () { setForgeOpen(false); }} />;
  return (
    <Sheet title={str(r.name) || p.id} onClose={p.onClose}>
      <div style={{ fontSize: 13.5, color: C.gold, fontWeight: 700, marginBottom: 2 }}>{str(r.role)}{r.status && r.status !== "alive" ? ", " + str(r.status) : ""}</div>
      {art && art.setPersonImage ? (
        <div>
          <ImgSlot url={imgUrl} h={220} marginBottom={portMsg ? 6 : 14} placeholderIcon="bust" busy={portBusy}
            fit="contain" pos="center center"
            boxStyle={{ height: "auto", aspectRatio: "3 / 4", maxWidth: 360, margin: "0 auto", background: "#070809" }}
            onFile={onPersonFile}
            onRemove={imgUrl ? removePersonImage : null}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: portMsg ? 6 : 12 }}><Btn small kind="gold" disabled={portBusy} onClick={function () { setForgeOpen(true); }}>AI Portrait</Btn></div>
          {portMsg ? <div role="alert" style={{ fontSize: 13, color: "#f1c7b8", marginBottom: 12 }}>{portMsg}</div> : null}
          {!art.hasStore ? <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Portrait saving isn't available in this preview.</div> : null}
        </div>
      ) : (imgUrl ? <img src={imgUrl} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 5, border: "1px solid " + C.goldLine, margin: "2px 0 12px" }} /> : null)}
      <div style={{ fontSize: 15.5, color: C.label, lineHeight: 1.45, marginBottom: 16 }}>{str(r.summary) || "You don't know each other well yet."}</div>
      <Lbl>How they feel about you</Lbl>
      {REL_ALWAYS.map(function (d) { return <RelBar key={d[0]} label={d[1]} value={r[d[0]]} text={relBand(r[d[0]])} nums={nums} />; })}
      {condPos.map(function (d) { return <RelBar key={d[0]} label={d[1]} value={r[d[0]]} text={relBand(r[d[0]])} nums={nums} />; })}
      {condNeg.length ? <div style={{ marginTop: 10 }}>{condNeg.map(function (d) { return <RelBar key={d[0]} label={d[1]} value={r[d[0]]} text={negBand(r[d[0]])} neg nums={nums} />; })}</div> : null}
      {r.last_seen ? <div style={{ fontSize: 13, color: C.muted, marginTop: 10, fontStyle: "italic" }}>{"Last seen: " + str(r.last_seen)}</div> : null}
    </Sheet>
  );
}
function VBar(p) {
  var val = clamp(num(p.value, 0), 0, 100);
  return (
    <div aria-label={p.label + ": " + p.text} style={{ position: "relative", height: 18, borderRadius: 9, background: "#07080a", border: "1px solid #2e2a23", overflow: "hidden", marginTop: 6 }}>
      <div style={{ width: val + "%", height: "100%", background: "linear-gradient(180deg," + p.c1 + "," + p.c2 + ")", boxShadow: "inset 0 1px 0 rgba(255,255,255,.28)", transition: "width .4s ease" }} />
      <div style={{ position: "absolute", left: 8, right: 8, top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: DISPLAY, fontSize: 10, letterSpacing: ".08em", color: "#f6efdd", textShadow: "0 1px 1px rgba(0,0,0,.95)" }}>
        <span>{p.label.toUpperCase()}</span><span style={{ fontFamily: BODY, letterSpacing: 0, fontSize: 12.5, fontWeight: 700 }}>{p.text}</span>
      </div>
    </div>
  );
}
function MiniBar(p) {
  var val = clamp(num(p.value, 0), 0, 100);
  return (
    <div style={{ flex: 1, minWidth: 0 }} aria-label={p.label + ": " + p.text}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: C.label, marginBottom: 3, fontWeight: 600 }}><span>{p.label}</span><span style={{ color: C.muted }}>{p.text}</span></div>
      <div style={{ height: 5, borderRadius: 3, background: "#07080a", overflow: "hidden", border: "1px solid #24211c" }}><div style={{ width: val + "%", height: "100%", background: "linear-gradient(90deg," + p.c2 + "," + p.c1 + ")", transition: "width .4s ease" }} /></div>
    </div>
  );
}

/* ======================================================================
   v21.5 INTERFACE — layout rebuilt from the creator's mockups.
   Painted art lives in bc-art.js (interface-only, never sent to the AI).
   ====================================================================== */
var MORE_PATHS = {
  coins: "M24 6 C32 6 38 8.2 38 11 C38 13.8 32 16 24 16 C16 16 10 13.8 10 11 C10 8.2 16 6 24 6 Z M10 14.5 C10 17.3 16 19.5 24 19.5 C32 19.5 38 17.3 38 14.5 V19 C38 21.8 32 24 24 24 C16 24 10 21.8 10 19 Z M10 22.5 C10 25.3 16 27.5 24 27.5 C32 27.5 38 25.3 38 22.5 V27 C38 29.8 32 32 24 32 C16 32 10 29.8 10 27 Z M10 30.5 C10 33.3 16 35.5 24 35.5 C32 35.5 38 33.3 38 30.5 V35 C38 37.8 32 40 24 40 C16 40 10 37.8 10 35 Z",
  bank: "M24 4 L44 14 V18 H4 V14 Z M8 21 H14 V36 H8 Z M21 21 H27 V36 H21 Z M34 21 H40 V36 H34 Z M4 39 H44 V44 H4 Z",
  people: "M24 8 a6 6 0 1 1 0 12 a6 6 0 1 1 0 -12 Z M12 13 a5 5 0 1 1 0 10 a5 5 0 1 1 0 -10 Z M36 13 a5 5 0 1 1 0 10 a5 5 0 1 1 0 -10 Z M13 40 C13 30 18 24 24 24 C30 24 35 30 35 40 Z M3 38 C3 30 7 26 12 26 C14 26 15.5 26.5 17 27.5 C14 30.5 12.5 34 12.3 38 Z M45 38 C45 30 41 26 36 26 C34 26 32.5 26.5 31 27.5 C34 30.5 35.5 34 35.7 38 Z",
  crown: "M5 16 L15 25 L24 9 L33 25 L43 16 L39 37 H9 Z M9 40 H39 V44 H9 Z",
  gear: "M21 3 H27 L28 9 L33 11 L38 7 L42 11 L38 16 L40 21 L46 21 V27 L40 28 L38 33 L42 38 L38 42 L33 38 L28 40 L27 46 H21 L20 40 L15 38 L10 42 L6 38 L10 33 L8 28 L2 27 V21 L8 20 L10 15 L6 10 L10 6 L15 10 L20 8 Z M24 17 a7 7 0 1 0 0.01 0 Z",
  search: "M20 5 a14 14 0 1 1 0 28 a14 14 0 1 1 0 -28 Z M20 10 a9 9 0 1 0 0.01 0 Z M30 29 L34 25 L45 36 L41 40 Z",
  up: "M24 4 L40 22 H30 V36 H18 V22 H8 Z M10 40 H38 V45 H10 Z",
  down: "M18 4 H30 V18 H40 L24 36 L8 18 H18 Z M10 40 H38 V45 H10 Z",
  doc: "M11 3 H29 L39 13 V45 H11 Z M15 7 V41 H35 V15 H27 V7 Z M18 22 H32 V25 H18 Z M18 29 H32 V32 H18 Z M18 35 H28 V38 H18 Z",
  bed: "M4 12 H9 V27 H44 V40 H39 V35 H9 V40 H4 Z M11 21 a4.5 4.5 0 1 1 9 0 a4.5 4.5 0 1 1 -9 0 Z M22 17 H38 a5 5 0 0 1 5 5 V25 H22 Z",
  food: "M12 4 H14 V16 H16 V4 H18 V16 H20 V4 H22 V18 C22 21 20 23 18.5 23 V44 H15.5 V23 C14 23 12 21 12 18 Z M30 4 C35 4 37 10 37 18 C37 22 35 24 33 24 V44 H30 Z",
  dumbbell: "M3 19 H7 V29 H3 Z M8 13 H15 V35 H8 Z M16 22 H32 V26 H16 Z M33 13 H40 V35 H33 Z M41 19 H45 V29 H41 Z",
  drop: "M24 3 C24 3 10 20 10 30 C10 38 16 44 24 44 C32 44 38 38 38 30 C38 20 24 3 24 3 Z",
  run: "M28 3 a4.5 4.5 0 1 1 0 9 a4.5 4.5 0 1 1 0 -9 Z M20 14 L30 14 L35 23 L42 24 L41 28 L32 27 L29 22 L26 30 L33 36 L31 45 L27 44 L28 38 L20 32 L16 40 L7 40 L8 36 L13 36 L18 25 L16 21 L12 27 L8 25 L14 16 Z",
  flame: "M24 3 C26 12 36 16 36 29 C36 38 30 45 24 45 C18 45 12 39 12 31 C12 24 16 21 18 15 C20 20 22 21 23 21 C22 15 22 9 24 3 Z",
  leaf: "M40 6 C18 6 7 17 7 32 C7 36 8 39 10 42 L13 39 C12 37 12 35 12 33 C12 23 20 16 32 13 C22 18 16 25 14 36 C26 37 38 30 40 6 Z",
  shield: "M24 3 L41 9 V22 C41 32 34 40 24 45 C14 40 7 32 7 22 V9 Z",
  sword: "M38 4 L44 4 L44 10 L22 32 L26 36 L23 39 L19 35 L12 42 L9 39 L16 32 L12 28 L15 25 L19 29 Z",
  plus: "M20 6 H28 V20 H42 V28 H28 V42 H20 V28 H6 V20 H20 Z",
  dice: "M8 8 H40 V40 H8 Z M14 11 a3 3 0 1 0 0.01 0 Z M34 11 a3 3 0 1 0 0.01 0 Z M24 21 a3 3 0 1 0 0.01 0 Z M14 31 a3 3 0 1 0 0.01 0 Z M34 31 a3 3 0 1 0 0.01 0 Z",
  feather: "M42 4 C26 6 14 16 10 34 L6 44 L10 44 L13 37 C30 34 38 22 42 4 Z",
  link: "M14 18 H22 V23 H15 a5 5 0 0 0 0 10 H22 V38 H14 a10 10 0 0 1 0 -20 Z M26 18 H34 a10 10 0 0 1 0 20 H26 V33 H33 a5 5 0 0 0 0 -10 H26 Z M17 26 H31 V30 H17 Z",
  castle: "M6 44 V18 H10 V22 H14 V18 H18 V24 H22 V10 H18 V5 H22 V8 H26 V5 H30 V10 H26 V24 H30 V18 H34 V22 H38 V18 H42 V44 H28 V35 a4 4 0 0 0 -8 0 V44 Z",
  hammer: "M8 6 H30 L36 12 L30 16 H25 V44 H19 V16 H8 Z",
  wheat: "M23 44 V8 H25 V44 Z M24 8 C28 7 30 10 30 13 C27 14 25 12 24 8 Z M24 8 C20 7 18 10 18 13 C21 14 23 12 24 8 Z M24 16 C28 15 31 18 31 21 C27 22 25 20 24 16 Z M24 16 C20 15 17 18 17 21 C21 22 23 20 24 16 Z M24 24 C28 23 31 26 31 29 C27 30 25 28 24 24 Z M24 24 C20 23 17 26 17 29 C21 30 23 28 24 24 Z M24 3 C25.5 4 26 6 24 9 C22 6 22.5 4 24 3 Z",
  fleur: "M24 3 C29 9 30 15 26 22 H22 C18 15 19 9 24 3 Z M21 24 C14 25 8 21 7 14 C12 13 16 16 18 20 Z M27 24 C34 25 40 21 41 14 C36 13 32 16 30 20 Z M14 24 H34 V28 H14 Z M22 28 H26 V38 C26 41 29 43 32 43 H16 C19 43 22 41 22 38 Z",
  cal: "M8 9 H40 V43 H8 Z M12 18 V39 H36 V18 Z M14 4 H18 V12 H14 Z M30 4 H34 V12 H30 Z M16 22 H22 V28 H16 Z",
  info: "M24 3 a21 21 0 1 1 0 42 a21 21 0 1 1 0 -42 Z M21.5 20 H26.5 V36 H21.5 Z M24 10 a3 3 0 1 0 0.01 0 Z",
  chart: "M6 42 H44 V45 H6 Z M9 28 H15 V40 H9 Z M19 18 H25 V40 H19 Z M29 10 H35 V40 H29 Z",
  bookmark: "M12 4 H36 V44 L24 34 L12 44 Z",
  devil: "M24 44 C14 44 8 36 8 26 C8 22 9 18 11 15 L6 4 L17 11 C19 10 21.5 9.5 24 9.5 C26.5 9.5 29 10 31 11 L42 4 L37 15 C39 18 40 22 40 26 C40 36 34 44 24 44 Z",
  bolt: "M28 2 L10 27 H22 L18 46 L38 19 H26 Z",
  wave: "M4 20 C10 14 16 14 22 20 C28 26 34 26 44 18 V24 C34 32 28 32 22 26 C16 20 10 20 4 26 Z M4 32 C10 26 16 26 22 32 C28 38 34 38 44 30 V36 C34 44 28 44 22 38 C16 32 10 32 4 38 Z",
  gem: "M14 6 H34 L44 18 L24 44 L4 18 Z",
  snow: "M22 3 H26 V45 H22 Z M4.2 13.6 L6.2 10.1 L43.8 34.4 L41.8 37.9 Z M41.8 10.1 L43.8 13.6 L6.2 37.9 L4.2 34.4 Z",
  mountain: "M2 42 L17 14 L25 27 L31 18 L46 42 Z",
  skull: "M24 4 C34 4 41 11 41 21 C41 27 38 31 34 33 V40 H28 V36 H26 V40 H22 V36 H20 V40 H14 V33 C10 31 7 27 7 21 C7 11 14 4 24 4 Z M17 18 a4.5 4.5 0 1 0 0.01 0 Z M31 18 a4.5 4.5 0 1 0 0.01 0 Z",
  send: "M4 22 L44 4 L32 44 L24 28 Z",
  ring: "M24 6 a18 18 0 1 1 0 36 a18 18 0 1 1 0 -36 Z M24 12 a12 12 0 1 0 0.01 0 Z"
};
Object.keys(MORE_PATHS).forEach(function (k) { if (!PATHS[k]) PATHS[k] = MORE_PATHS[k]; });

/* Art values in bc-art.js are https URLs or "@asset:<id>" refs (resolved through the sandbox once App has set the resolver). */
var ART_RESOLVE = null;
function img(k) {
  var v = (BC_IMG && BC_IMG[k]) || "";
  if (v.indexOf("@asset:") !== 0) return v;
  if (!ART_RESOLVE) return "";
  try { return ART_RESOLVE(v) || ""; } catch (e) { return ""; }
}
function hashPick(s, list) { var h = 0; s = str(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return list[Math.abs(h) % list.length]; }

function Pennant(p) {
  var id = "bcpn-" + (p.side || "l");
  return (
    <div className={"bc-pennant bc-pennant-" + (p.side || "l")} role={p.label ? "group" : undefined} aria-label={p.label ? p.label + (p.sub ? ", " + p.sub : "") : undefined} aria-hidden={p.label ? undefined : "true"}>
      <svg viewBox="0 0 60 100" preserveAspectRatio="none" className="bc-pennant-svg" aria-hidden="true">
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#15253f" /><stop offset="1" stopColor="#070d18" /></linearGradient></defs>
        <path d="M2 0 H58 V80 L30 98 L2 80 Z" fill={"url(#" + id + ")"} stroke="#d4ae5c" strokeWidth="1.6" />
        <path d="M7 3 H53 V77 L30 92 L7 77 Z" fill="none" stroke="#d4ae5c" strokeOpacity=".45" strokeWidth=".9" />
        <path d="M22 84 L30 89 L38 84" fill="none" stroke="#d4ae5c" strokeOpacity=".7" strokeWidth="1" />
      </svg>
      <div className="bc-pennant-in">
        {p.icon === "compass" ? <Icon n="compass" s={30} /> : <Icon n="clover" s={p.label ? 22 : 34} />}
        {p.label ? <div className="bc-pennant-label">{p.label}</div> : null}
        {p.sub ? <div className="bc-pennant-sub">{p.sub}</div> : null}
      </div>
    </div>
  );
}
function Hero(p) {
  var bg = p.img ? img(p.img) : p.bannerUrl;
  return (
    <header className={"bc-hero" + (p.big ? " bc-hero-big" : "") + (p.cls ? " " + p.cls : "")} style={p.h ? { height: p.h } : undefined}>
      {bg ? <img className="bc-hero-img" src={bg} alt="" /> : <SceneCastle />}
      <div className="bc-hero-shade" />
      {p.onBack ? <button type="button" className="bc-hero-back" aria-label="Back" onClick={p.onBack}><Icon n="chevl" s={18} fill={C.goldHi} /></button> : (p.left === false ? null : <Pennant side="l" />)}
      <div className={"bc-hero-title" + (p.onBack || p.left === false ? " bc-hero-title-back" : "")}>
        <div className="bc-hero-orn" aria-hidden="true"><span /><Icon n="clover" s={12} /><span /></div>
        <div className={"bc-hero-name" + ((p.title || "").length > 12 ? " bc-long" : "")}>{p.title || "Black Clover"}</div>
        <div className={"bc-hero-sub" + ((p.sub || "").length > 22 ? " bc-long" : "")}>{p.sub || "A Mage's Tale"}</div>
        {p.tagline ? <div className="bc-hero-tag">{p.tagline}</div> : null}
        {p.quote ? <div className="bc-hero-quote">{p.quote}{p.quoteBy ? <small>{"— " + p.quoteBy}</small> : null}</div> : null}
      </div>
      {p.right === false ? null : <Pennant side="r" icon={p.right === "compass" ? "compass" : null} label={p.right === "compass" ? "" : (p.kingdom || "Clover Kingdom")} sub={p.pennantSub} />}
      {p.children}
    </header>
  );
}
function SectionHead(p) {
  return (
    <div className={"bc-shead" + (p.art ? " bc-shead-art" : "")}>
      {p.art ? <img className="bc-shead-img" src={img(p.art)} alt="" /> : null}
      <span className="bc-shead-icon"><Icon n={p.icon} s={p.iconSize || 30} /></span>
      <span className="bc-shead-text"><strong>{p.title}</strong>{p.sub ? <small>{p.sub}</small> : null}</span>
      {p.right ? <span className="bc-shead-right">{p.right}</span> : null}
    </div>
  );
}
function Chip(p) {
  return <button type="button" className={"bc-chip" + (p.on ? " bc-chip-on" : "")} aria-pressed={p.on ? "true" : "false"} onClick={p.onClick} disabled={p.disabled}>{p.icon ? <Icon n={p.icon} s={15} /> : null}{p.children}</button>;
}
function ActionRow(p) {
  return (
    <button type="button" className="bc-actrow" onClick={p.onClick} disabled={p.disabled} aria-expanded={p.expanded === undefined ? undefined : (p.expanded ? "true" : "false")}>
      <span className="bc-actrow-icon"><Icon n={p.icon} s={p.iconSize || 30} /></span>
      <span className="bc-actrow-text"><strong>{p.title}</strong>{p.sub ? <small>{p.sub}</small> : null}</span>
      <Icon n={p.expanded ? "chevd" : "chevr"} s={14} />
    </button>
  );
}

/* ---------- navigation ---------- */
var NAV = [["home", "Realm", "home"], ["people", "Relations", "people"], ["crown", "Renown", "crown"], ["journal", "Records", "doc"], ["story", "Story", "clover"], ["grimoire", "Magic", "book"], ["bound", "Pacts", "wisp"], ["pack", "Satchel", "pack"], ["menu", "More", "gear"]];
var HOME_SUB = { character: 1, train: 1, time: 1, routine: 1, codex: 1, household: 1, art: 1, settings: 1, help: 1, map: 1 };
var PACK_SUB = { bank: 1, market: 1 };
var JOURNAL_SUB = { missions: 1, notices: 1 };
function Nav(p) {
  return (
    <nav className="bc-nav" aria-label="Sections">
      {NAV.map(function (it) {
        var on = p.view === it[0] || (it[0] === "home" && HOME_SUB[p.view]) || (it[0] === "pack" && PACK_SUB[p.view]) || (it[0] === "journal" && JOURNAL_SUB[p.view]) || (it[0] === "crown" && p.view === "squad");
        if (it[0] === "story") {
          return (
            <div key="story" className="bc-nav-story-wrap">
              <button className="bc-nav-story-btn" type="button" aria-label="Return to the living story" title="Return to the living story" aria-current={on ? "page" : undefined} onClick={function () { p.nav("story"); }}>
                <Icon n="clover" s={38} />
              </button>
            </div>
          );
        }
        var badge = it[0] === "journal" ? p.notices : 0;
        return (
          <button className="bc-nav-item" key={it[0]} type="button" aria-label={it[1] + (badge ? ", " + badge + " notices" : "")} aria-current={on ? "page" : undefined} onClick={function () { p.nav(it[0]); }}>
            <Icon n={it[2]} s={21} fill={on ? "url(#bcg-gold)" : "#9aa0ad"} />
            <span>{it[1]}</span>
            {badge ? <b className="bc-nav-badge">{badge}</b> : null}
          </button>
        );
      })}
    </nav>
  );
}

/* ---------- home ---------- */
var TILES = [
  { k: "character", t: "Mage Profile", s: "Identity, skills and condition.", icon: "bust", view: "character" },
  { k: "grimoire", t: "Spellcraft", s: "Attributes, spells and magical growth.", icon: "book", view: "grimoire" },
  { k: "adventure", t: "Journey", s: "Live your own story across the kingdoms.", icon: "compass", view: "story" },
  { k: "map", t: "Kingdom Atlas", s: "Travel routes and discovered places.", icon: "map", view: "map" },
  { k: "squad", t: "Magic Knights", s: "Squad, standing and merit.", icon: "people", view: "crown" },
  { k: "missions", t: "Assignments", s: "Duties, requests and opportunities.", icon: "scroll", view: "missions" },
  { k: "relationships", t: "Connections", s: "Friends, rivals and confidants.", icon: "heart", view: "people" },
  { k: "inventory", t: "Equipment", s: "Carry, equip and organize.", icon: "pack", view: "pack" },
  { k: "bank", t: "Treasury", s: "Accounts, savings and deposits.", icon: "bank", view: "bank" },
  { k: "market", t: "Trade", s: "Buy, sell and barter.", icon: "coins", view: "market" },
  { k: "more", t: "Life & Settings", s: "Training, routine and world options.", icon: "dots", view: "menu" }
];
var TILE_KEYS = TILES.map(function (t) { return t.k; });
function Tile(p) {
  var url = p.url || img("tile_" + p.k);
  return (
    <button type="button" className={"bc-tile bc-tile-" + p.k} onClick={p.onClick} aria-label={p.t + (p.badge ? ", " + p.badge + " active" : "")}>
      {url ? <img className="bc-tile-art" src={url} alt="" /> : <TileScene k={p.k} />}
      <span className="bc-tile-shade" />
      <Corners s={10} />
      <span className="bc-tile-icon"><Icon n={p.icon} s={30} /></span>
      <span className="bc-tile-text"><strong>{p.t}</strong><small>{p.s}</small></span>
      <span className="bc-tile-chev"><Icon n="chevr" s={13} /></span>
      {p.badge ? <span className="bc-tile-badge">{p.badge}</span> : null}
    </button>
  );
}
function LocationBar(p) {
  var v = p.v; var loc = parseLoc(v.current_location); var cp = obj(v.creation_profile);
  var sub = [kingdomLabel(loc.kingdom || cp.homeland), loc.region].filter(Boolean).join(" — ");
  return (
    <button type="button" className="bc-locbar" onClick={p.onClick} aria-label={"You are in " + (loc.settlement || "an unknown place") + ". Open the world map."}>
      <img className="bc-locbar-art" src={img("location")} alt="" />
      <span className="bc-locbar-shade" />
      <span className="bc-locbar-pin"><Icon n="pin" s={19} /></span>
      <span className="bc-locbar-text"><strong>{loc.settlement || "Somewhere unknown"}</strong><small>{sub || loc.place}</small></span>
      {v.weather ? <span className="bc-locbar-weather">{str(v.weather)}</span> : null}
      <Icon n="chevr" s={13} />
    </button>
  );
}
function StatPill(p) {
  var val = clamp(num(p.value, 0), 0, 100);
  return (
    <div className={"bc-pill bc-pill-" + p.k + (hudLow(p.k, p.value) ? " bc-crit" : "")} aria-label={p.label + ": " + p.text}>
      <div className="bc-pill-fill" style={{ width: val + "%" }} />
      <span className="bc-pill-icon"><Icon n={p.icon} s={12} fill="#fff6dc" /></span>
      <span className="bc-pill-label">{p.label}</span>
      <span className="bc-pill-val">{p.text}</span>
    </div>
  );
}
function CharacterCard(p) {
  var v = p.v; var pp = obj(v.player_profile); var mp = obj(v.magic_profile); var g = obj(v.grimoire); var mk = obj(v.mk_status); var nums = showNums(v);
  var loc = parseLoc(v.current_location); var home = parseLoc(v.home_location);
  var origin = str(pp.social_origin).split(" (")[0];
  var goals = arr(v.goals).filter(function (x) { return x && (!x.status || x.status === "active"); });
  var motto = goals.length ? "“" + str(goals[0].goal) + "”" : "“Still wandering. Still becoming.”";
  var rep = obj(v.reputation); var rk = Object.keys(rep); var repTxt = "Unknown";
  if (rk.length) { var r0 = rep[rk[0]]; repTxt = typeof r0 === "object" && r0 ? str(r0.band) : str(r0); }
  var hasG = isTrue(v.has_grimoire); var squad = str(mk.squad) && str(mk.squad) !== "none" ? str(mk.squad) : "None";
  var title = str(mk.rank) && str(mk.rank) !== "none" ? str(mk.rank) : "—";
  function val(n, w) { return nums ? num(n) + " / 100" : w; }
  var pbs = React.useState(false); var portBusy = pbs[0], setPortBusy = pbs[1];
  var pms = React.useState(""); var portMsg = pms[0], setPortMsg = pms[1];
  var qos = React.useState(false); var portraitMenu = qos[0], setPortraitMenu = qos[1];
  var qas = React.useState(false); var quickAi = qas[0], setQuickAi = qas[1];
  function onQuickPortraitFile(e) {
    var fl = e.target.files && e.target.files[0]; e.target.value = ""; if (!fl || !p.setPortrait) return;
    readImage(fl, 600, 800, function (err, data) {
      if (err) { setPortMsg(err); return; }
      setPortMsg(""); setPortBusy(true);
      p.setPortrait(data, function (ok) { setPortBusy(false); if (!ok) setPortMsg(p.mediaError || "Upload failed."); });
    });
  }
  return (
    <div className="bc-home-character">
      <Frame className="bc-profile-card" pad={9}>
        <div className="bc-profile-portrait">
          <button type="button" className="bc-portrait-btn" aria-label={p.portrait ? "Portrait options" : "Add a portrait"} disabled={portBusy || !p.setPortrait} onClick={function () { setPortraitMenu(true); }}>
            {p.portrait ? <img src={p.portrait} alt="" /> : <span className="bc-portrait-empty"><Icon n="bust" s={54} fill="#3a4658" /></span>}
          </button>
          <AgeBadge age={str(v.player_age) || "?"} day={num(v.elapsed_days, 0) + 1} onClick={function () { p.go && p.go("character"); }} />
        </div>
        <div className="bc-profile-info">
          <div className="bc-profile-name">{str(v.player_name) || "Nameless"}</div>
          <div className="bc-profile-origin">{[origin, home.settlement || loc.settlement].filter(Boolean).join(" · ")}</div>
          <div className="bc-profile-motto">{motto}</div>
          <button type="button" className="bc-pills" aria-label="Open character: condition and skills" onClick={function () { p.go && p.go("character"); }}>
            <StatPill k="hp" icon="heart" label="Body" value={v.vitality} text={val(v.vitality, condWord(v.vitality))} />
            <StatPill k="mp" icon="drop" label="Mana" value={v.mana} text={val(v.mana, levelWord(v.mana))} />
            <StatPill k="st" icon="run" label="Stamina" value={v.stamina} text={val(v.stamina, levelWord(v.stamina))} />
          </button>
        </div>
        {portMsg ? <div role="alert" className="bc-profile-alert">{portMsg}</div> : null}
      </Frame>
      <Frame className="bc-profile-summary" pad="7px 9px">
        <button type="button" className="bc-summary-grim" onClick={p.goGrimoire}>
          <span className="bc-summary-grim-icon">{hasG ? <Cover g={g} attr={mp.attribute} small design={p.grimoireDesign} imgUrl={artFor(p.api, obj(p.grimoireArt), "grimoire_cover")} /> : <Icon n="book" s={30} />}</span>
          <span className="bc-summary-grim-text"><strong>Grimoire</strong><small>{hasG ? (num(g.leaf_count, 3) + "-leaf · " + num(g.pages_filled, arr(v.spells).length) + " pages") : "Not yet received"}</small></span>
          <Icon n="chevr" s={12} />
        </button>
        {[["star", "Mana", str(obj(mp.bands).reserves) || "Unknown", "character"], ["people", "Reputation", repTxt, "crown"], ["clover", "Squad", squad, "crown"], ["bookmark", "Title", title, "crown"], ["pin", "Location", loc.settlement || "—", "map"]].map(function (r) {
          return (
            <button type="button" key={r[1]} className="bc-summary-row" aria-label={r[1] + ": " + r[2]} onClick={function () { p.go && p.go(r[3]); }}>
              <span className="bc-summary-k"><Icon n={r[0]} s={14} />{r[1]}</span>
              <span className="bc-summary-v">{r[2]}</span>
            </button>
          );
        })}
      </Frame>
      {quickAi ? <AIArtForge api={p.api} title="AI Portrait Forge" closeLabel="Back" subject={str(v.player_name) || "Your character"} needle={str(v.player_name)} currentUrl={p.portrait} baseNote={"Solo 3:4 anime character portrait of my player character " + (str(v.player_name) || "the protagonist") + ". " + clipArtNote([str(pp.appearance), str(pp.sex), str(pp.social_origin), mp.attribute_known === false ? "" : (str(mp.attribute) + " magic")].filter(Boolean).join("; "), 110) + ". Face visible, no other people."} onApply={function (u, cb) { p.setPortrait(u, cb); }} onClose={function () { setQuickAi(false); }} /> : null}
      {portraitMenu && !quickAi ? <Sheet title="Portrait" onClose={function () { setPortraitMenu(false); }}>
        <div style={{ display: "grid", gridTemplateColumns: "112px minmax(0,1fr)", gap: 12, alignItems: "start" }}>
          <div style={{ aspectRatio: "3 / 4", borderRadius: 6, overflow: "hidden", border: "1px solid " + C.goldLine, background: "#070809" }}>{p.portrait ? <img src={p.portrait} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="bust" s={42} fill={C.goldDim} /></div>}</div>
          <div style={{ minWidth: 0 }}>
            <H size={17} m="0 0 5px">Your character portrait</H>
            <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.4 }}>Upload your own picture or let Yumina generate one from your established appearance.</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 7, marginTop: 10 }}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", minHeight: 40, padding: "5px 8px", borderRadius: 6, border: "1px solid " + C.gold, color: C.goldHi, fontWeight: 700, cursor: portBusy ? "default" : "pointer", opacity: portBusy ? .6 : 1, fontSize: 14 }}>
                {portBusy ? "Uploading…" : (p.portrait ? "Upload replacement" : "Upload image")}<input type="file" accept="image/*" disabled={portBusy} onChange={onQuickPortraitFile} style={{ display: "none" }} />
              </label>
              <Btn kind="gold" disabled={portBusy} style={{ width: "100%", justifyContent: "center" }} onClick={function () { setQuickAi(true); }}>AI Generate</Btn>
              {p.portrait ? <Btn disabled={portBusy} style={{ width: "100%", justifyContent: "center" }} onClick={function () { setPortBusy(true); p.setPortrait("", function () { setPortBusy(false); }); }}>Remove portrait</Btn> : null}
            </div>
          </div>
        </div>
        {portMsg ? <div role="alert" style={{ fontSize: 13, color: "#f1c7b8", marginTop: 9 }}>{portMsg}</div> : null}
      </Sheet> : null}
    </div>
  );
}
function AgeBadge(p) {
  return (
    <div className="bc-age" role={p.onClick ? "button" : undefined} tabIndex={p.onClick ? 0 : undefined} onClick={p.onClick} onKeyDown={function (e) { if (p.onClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); p.onClick(); } }} aria-label={"Age " + p.age + ", day " + p.day}>
      <div className="bc-age-ring"><span>AGE</span><strong>{p.age}</strong></div>
      <div className="bc-age-day">{"Day " + p.day}</div>
    </div>
  );
}
function noticeCount(v) {
  var ups = arr(v.known_events).filter(function (e) { return e && (e.kind === "upcoming" || e.kind === "opportunity") && (!e.status || e.status === "known"); }).length;
  var com = arr(v.commitments).filter(function (c) { return c && (!c.status || /active|open|pending|due/i.test(str(c.status))); }).length;
  return ups + com + arr(v.conditions).length;
}
function activeMissions(v) { return arr(v.missions).filter(function (m) { return m && (m.status === "active" || m.status === "accepted" || m.status === "offered"); }).length; }
function HomeView(p) {
  var api = p.api; var v = api.variables || {}; var loc = parseLoc(v.current_location); var cp = obj(v.creation_profile);
  var goals = arr(v.goals).filter(function (g) { return g && (!g.status || g.status === "active"); });
  var missions = arr(v.missions).filter(function (m) { return m && (m.status === "active" || m.status === "accepted"); });
  var ups = arr(v.known_events).filter(function (e) { return e && (e.kind === "upcoming" || e.kind === "opportunity") && (!e.status || e.status === "known"); });
  var objective = goals.length ? str(goals[0].goal) : (missions.length ? str(missions[0].title) : (ups.length ? str(ups[0].title) + (ups[0].when ? ", " + str(ups[0].when) : "") : "No active objective."));
  var kingdom = kingdomLabel(loc.kingdom || cp.homeland) || "Clover Kingdom";
  return (
    <div className="bc-scroll bc-home-scroll">
      <Hero bannerUrl={p.bannerUrl} tagline="A world of magic awaits, your story begins here." kingdom={kingdom} pennantSub={dayMonth(v.world_date) ? dayMonth(v.world_date) + " · " + clock12(v.world_time) : ""} />
      <div className="bc-wrap">
        <LocationBar v={v} onClick={function () { p.go("map"); }} />
        <CharacterCard api={api} v={v} portrait={p.art.portrait} setPortrait={p.art.setPortrait} mediaError={p.art.mediaError} grimoireArt={p.art.art} grimoireDesign={p.art.grimoireDesign} goGrimoire={function () { p.go("grimoire"); }} go={p.go} />
        <div className="bc-home-tiles">
          {TILES.map(function (t) {
            var badge = t.k === "missions" ? activeMissions(v) : 0;
            return <Tile key={t.k} k={t.k} t={t.t} s={t.s} icon={t.icon} badge={badge} url={artFor(api, p.art.art, t.k)} onClick={function () { p.go(t.view); }} />;
          })}
        </div>
        <Frame className="bc-home-objective" pad="9px 11px">
          <Icon n="clover" s={28} />
          <div className="bc-objective-text"><strong>Current Objective</strong><span>{objective}</span></div>
          <button type="button" className="bc-objective-btn" onClick={function () { p.go("journal"); }}>View Journal<Icon n="chevr" s={11} /></button>
        </Frame>
        <Quote />
      </div>
    </div>
  );
}



/* ---------- story screen ---------- */
var CTX = {
  home: ["Rest for a while", "Eat something", "Train nearby", "Head outside"],
  street: ["Look around", "Talk to someone nearby", "Look for work", "Find something to eat"],
  shop: ["Browse the wares", "Ask about prices", "Ask about work", "Leave"],
  tavern: ["Order food", "Listen for rumors", "Talk to the barkeep", "Take a room"],
  tower: ["Step inside", "Wait with the others", "Talk to someone", "Leave"],
  ceremony: ["Wait for my turn", "Watch the others", "Step forward", "Slip away"],
  church: ["Help with the chores", "Talk to someone", "Rest", "Head outside"],
  workplace: ["Get to work", "Talk to my employer", "Take a break", "Ask about pay"],
  training: ["Keep training", "Try something new", "Rest", "Stop for today"],
  squad_hq: ["Check for missions", "Train with someone", "Find the captain", "Rest in my quarters"],
  wilderness: ["Explore the area", "Look for tracks", "Forage", "Make camp"],
  travel: ["Keep going", "Make camp", "Check the route", "Talk to my companions"],
  dungeon: ["Search carefully for traps", "Advance slowly", "Map this area", "Fall back"],
  other: ["Look around", "Wait and watch"]
};
var MOVES = ["Close the distance", "Fall back", "Take cover", "Circle left", "Circle right", "Get above them"];
var DEFENDS = ["Dodge", "Block", "Brace with magic", "Protect an ally"];

/* ---------- engine-side scene transcript ----------
   The GM writes scene prose once. The engine reads api.messages, recognizes lightweight
   @Speaker beats, resolves the existing Bond portrait, and renders dialogue/actions itself.
   No duplicate scene variable and no portrait directive are required. */
function normSpeaker(s) {
  return str(s).toLowerCase().replace(/[*_`~]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
function slugSpeaker(s) {
  return normSpeaker(s).replace(/\s+/g, "-");
}

/* ---------- relationship identity guard ----------
   Presentation is read-only, but GM state directives can still accidentally invent a second key
   such as npc-yami beside yami. These helpers coalesce exact duplicate identities and keep canon
   characters on their stable plain-name ids. Original NPCs keep whichever established id has the
   richer record, so this does not flatten custom characters into canon-style ids. */
var CANON_PERSON_ALIASES = {
  "asta":"asta", "yuno":"yuno", "noelle":"noelle", "noelle silva":"noelle",
  "yami":"yami", "yami sukehiro":"yami", "captain yami":"yami", "captain yami sukehiro":"yami",
  "julius":"julius", "julius novachrono":"julius", "wizard king julius novachrono":"julius",
  "finral":"finral", "finral roulacase":"finral", "magna":"magna", "magna swing":"magna",
  "luck":"luck", "luck voltia":"luck", "vanessa":"vanessa", "vanessa enoteca":"vanessa",
  "gauche":"gauche", "gauche adlai":"gauche", "gordon":"gordon", "gordon agrippa":"gordon",
  "grey":"grey", "charmy":"charmy", "charmy pappitson":"charmy", "henry":"henry", "henry legolant":"henry",
  "zora":"zora", "zora ideale":"zora", "nacht":"nacht", "nacht faust":"nacht",
  "secre":"secre", "secre swallowtail":"secre", "nero":"secre",
  "fuegoleon":"fuegoleon", "fuegoleon vermillion":"fuegoleon",
  "mereoleona":"mereoleona", "mereoleona vermillion":"mereoleona",
  "leopold":"leopold", "leopold vermillion":"leopold",
  "charlotte":"charlotte", "charlotte roselei":"charlotte",
  "william":"william", "william vangeance":"william",
  "jack":"jack", "jack the ripper":"jack", "dorothy":"dorothy", "dorothy unsworth":"dorothy",
  "rill":"rill", "rill boismortier":"rill", "kaiser":"kaiser", "kaiser granvorka":"kaiser",
  "nozel":"nozel", "nozel silva":"nozel", "mimosa":"mimosa", "mimosa vermillion":"mimosa",
  "klaus":"klaus", "klaus lunettes":"klaus", "langris":"langris", "langris vaude":"langris",
  "sol":"sol", "sol marron":"sol", "kirsch":"kirsch", "kirsch vermillion":"kirsch",
  "marx":"marx", "marx francois":"marx", "damnatio":"damnatio", "damnatio kira":"damnatio",
  "lolopechka":"lolopechka", "gadjah":"gadjah", "fana":"fana", "mars":"mars", "ladros":"ladros",
  "patry":"patry", "rhya":"rhya", "vetto":"vetto", "licht":"licht",
  "liebe":"liebe", "lucifero":"lucifero", "megicula":"megicula"
};
function bareRelationshipId(id) { return slugSpeaker(str(id).replace(/^npc-/i, "")); }
function canonIdFor(id, r) {
  var byId = CANON_PERSON_ALIASES[bareRelationshipId(id)];
  if (byId) return byId;
  var nm = normSpeaker(r && r.name);
  return CANON_PERSON_ALIASES[nm] || "";
}
function relFilled(v) { return !(v == null || v === "" || (Array.isArray(v) && !v.length)); }
function relRichness(r) {
  r = obj(r); var score = 0;
  Object.keys(r).forEach(function (k) { if (relFilled(r[k])) score += (k === "summary" ? Math.min(8, str(r[k]).length / 28) : 1); });
  return score;
}
function mergeRelationshipRecords(primary, secondary) {
  var out = Object.assign({}, obj(primary)); var src = obj(secondary);
  Object.keys(src).forEach(function (k) { if (!relFilled(out[k]) && relFilled(src[k])) out[k] = src[k]; });
  return out;
}
function relationshipKeysDuplicate(aid, a, bid, b) {
  if (aid === bid) return true;
  var ab = bareRelationshipId(aid), bb = bareRelationshipId(bid);
  if (ab && bb && ab === bb) return true;
  var an = normSpeaker(a && a.name), bn = normSpeaker(b && b.name);
  if (an && bn && an === bn) return true;
  var ac = canonIdFor(aid, a), bc = canonIdFor(bid, b);
  return !!(ac && bc && ac === bc);
}
function canonicalizeNamedPeople(src) {
  src = obj(src); var ids = Object.keys(src); var used = {}; var out = {}; var changed = false;
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i]; if (used[id]) continue;
    var group = [id]; used[id] = true;
    for (var j = i + 1; j < ids.length; j++) {
      var id2 = ids[j]; if (used[id2]) continue;
      var hit = false;
      for (var g = 0; g < group.length; g++) { if (relationshipKeysDuplicate(group[g], src[group[g]], id2, src[id2])) { hit = true; break; } }
      if (hit) { group.push(id2); used[id2] = true; }
    }
    var canon = "";
    group.forEach(function (gid) { if (!canon) canon = canonIdFor(gid, src[gid]); });
    var winner = group[0];
    if (canon) {
      for (var q = 0; q < group.length; q++) if (group[q] === canon) { winner = group[q]; break; }
    } else {
      group.forEach(function (gid) { if (relRichness(src[gid]) > relRichness(src[winner])) winner = gid; });
    }
    var target = canon || winner; var rec = obj(src[winner]);
    group.forEach(function (gid) { if (gid !== winner) rec = mergeRelationshipRecords(rec, src[gid]); });
    out[target] = rec;
    if (group.length > 1 || target !== id) changed = true;
  }
  return { value: out, changed: changed || JSON.stringify(out) !== JSON.stringify(src) };
}
function useRelationshipIdentityGuard(api) {
  var v = (api && api.variables) || {};
  var relSig = JSON.stringify(obj(v.relationships));
  var npcSig = JSON.stringify(obj(obj(v.world_truth).npcs));
  React.useEffect(function () {
    if (!canWrite(api)) return;
    var rr = canonicalizeNamedPeople(obj(v.relationships));
    if (rr.changed) api.setVariable("relationships", rr.value);
    var wt = obj(v.world_truth); var np = canonicalizeNamedPeople(obj(wt.npcs));
    if (np.changed) api.setVariable("world_truth", Object.assign({}, wt, { npcs: np.value }));
  }, [relSig, npcSig, !!(api && api.isStreaming)]);
}
function stripStateDirectives(text) {
  var lines = stripTurnImageEmbeds(text).replace(/\r/g, "").split("\n");
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  while (lines.length) {
    var z = lines[lines.length - 1].trim();
    if (/^\[[A-Za-z_][A-Za-z0-9_.-]*\s*:/.test(z)) lines.pop();
    else break;
  }
  return lines.join("\n").trim();
}
function speakerMarker(line) {
  var s = str(line).trim();
  var m = s.match(/^@([A-Za-z0-9][A-Za-z0-9 .'\-]{0,79})\s*:?\s*$/);
  if (m) return m[1].trim();
  m = s.match(/^\*\*([^*]{1,80})\*\*\s*:?\s*$/);
  if (m) return m[1].trim();
  return "";
}
function splitSceneBlocks(text) {
  var cleaned = stripStateDirectives(text);
  if (!cleaned) return [];
  var rawBlocks = cleaned.split(/\n\s*\n+/);
  var out = [];
  rawBlocks.forEach(function (raw) {
    var lines = raw.split("\n");
    var who = speakerMarker(lines[0]);
    if (who) lines.shift();
    var body = lines.join("\n").trim();
    if (!body && who) return;
    out.push({ speaker: who, body: body || raw.trim() });
  });
  return out;
}
function classifyBeatLine(line) {
  var s = str(line).trim();
  if (!s) return { type: "blank", text: "" };
  var plain = s.replace(/^>\s*/, "").trim();
  var dialogue = (/^["\u201c\u2018]/.test(plain) && /["\u201d\u2019][.!?,;:\u2026-]*$/.test(plain)) || /^["\u201c].+["\u201d]$/.test(plain);
  if (dialogue) return { type: "dialogue", text: plain };
  if ((/^\*[^*].*\*$/.test(plain) || /^_[^_].*_$/.test(plain)) && !/^\*\*/.test(plain)) {
    return { type: "action", text: plain.replace(/^\*|^\_|(\*|_)$/g, "") };
  }
  return { type: "beat", text: s };
}
function relationshipIdForSpeaker(v, speaker) {
  var rel = canonicalizeNamedPeople(obj(v.relationships)).value;
  var target = normSpeaker(speaker);
  var ids = Object.keys(rel);
  for (var i = 0; i < ids.length; i++) {
    var r = obj(rel[ids[i]]);
    if (normSpeaker(r.name) === target || normSpeaker(ids[i]) === target || normSpeaker(ids[i].replace(/^npc-/, "")) === target) return ids[i];
  }
  return CANON_PERSON_ALIASES[target] || slugSpeaker(speaker).replace(/^npc-/, "");
}
function hasDialogue(body) {
  var lines = str(body).split("\n");
  for (var i = 0; i < lines.length; i++) if (classifyBeatLine(lines[i]).type === "dialogue") return true;
  return false;
}
function ScenePortrait(p) {
  var url = p.url || "";
  var initials = str(p.name).split(/\s+/).filter(Boolean).slice(0, 2).map(function (x) { return x.charAt(0).toUpperCase(); }).join("") || "\u2663";
  return (
    <div className="bc-speaker-portrait" aria-hidden="true">
      {url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 18%" }} /> :
        <span style={{ fontFamily: DISPLAY, color: C.gold, fontSize: initials.length > 1 ? 16 : 22, opacity: .8 }}>{initials}</span>}
    </div>
  );
}
function BeatBody(p) {
  var lines = str(p.body).split("\n");
  return (
    <div>
      {lines.map(function (ln, i) {
        var b = classifyBeatLine(ln);
        if (b.type === "blank") return <div key={i} style={{ height: 5 }} />;
        if (b.type === "dialogue") return <div key={i} className="bc-dialogue-line">{b.text}</div>;
        if (b.type === "action") return <div key={i} className="bc-action-line">{b.text}</div>;
        return <div key={i} className="bc-beat-line" dangerouslySetInnerHTML={{ __html: p.api.renderMarkdown ? p.api.renderMarkdown(b.text) : b.text }} />;
      })}
    </div>
  );
}
function SceneAssistantMessage(p) {
  var api = p.api; var v = api.variables || {}; var blocks = splitSceneBlocks(p.text);
  if (!blocks.length) return null;
  return (
    <div className="bc-msg">
      {blocks.map(function (b, i) {
        var talk = !!b.speaker && hasDialogue(b.body);
        if (talk) {
          var pid = relationshipIdForSpeaker(v, b.speaker);
          var portrait = p.art && p.art.personImageUrl ? p.art.personImageUrl(pid) : "";
          return (
            <div key={i} className="bc-speaker-card" style={{ marginBottom: 8 }}>
              <ScenePortrait url={portrait} name={b.speaker} />
              <div style={{ minWidth: 0 }}>
                <div className="bc-speaker-name">{b.speaker}</div>
                <BeatBody api={api} body={b.body} />
              </div>
            </div>
          );
        }
        return (
          <div key={i} className="bc-narration" style={{ marginBottom: 6 }}
            dangerouslySetInnerHTML={{ __html: api.renderMarkdown ? api.renderMarkdown(b.body) : b.body }} />
        );
      })}
      {p.streaming ? <span className="bc-streaming-dot" /> : null}
    </div>
  );
}
function SceneUserMessage(p) {
  var txt = str(p.text);
  return (
    <div className="bc-msg bc-msg-user">
      <div className="bc-user-bubble" dangerouslySetInnerHTML={{ __html: p.api.renderMarkdown ? p.api.renderMarkdown(txt) : txt }} />
    </div>
  );
}
var StoryArtContext = React.createContext(null);
function StoryBubble(p) {
  var api = useYumina();
  var art = React.useContext(StoryArtContext);
  if (p.role === "system") return null;
  if (p.role === "user") return <SceneUserMessage api={api} text={p.content} />;
  return <SceneAssistantMessage api={api} art={art} text={p.content} streaming={!!p.isStreaming} />;
}
function SceneTranscript(p) {
  var api = p.api;
  var msgs = (api && api.messages) || [];
  var box = React.useRef(null);
  var streamText = str(api && api.streamingContent);
  React.useEffect(function () {
    var el = box.current;
    if (!el) return;
    try { el.scrollTop = el.scrollHeight; } catch (e) {}
  }, [msgs.length, streamText]);
  var shown = msgs.filter(function (m) { return m && (m.role === "assistant" || m.role === "user"); });
  return (
    <div ref={box} className="bc-scene-scroll" aria-live="polite">
      {shown.map(function (m, i) {
        var isLast = i === shown.length - 1;
        var streaming = !!(m.status === "streaming" || (isLast && api.isStreaming && m.role === "assistant"));
        var text = str(m.content);
        if (m.role === "user") return <SceneUserMessage key={m.id || i} api={api} text={text} />;
        if (streaming && isLast && streamText && streamText.length >= text.length) text = streamText;
        return <SceneAssistantMessage key={m.id || i} api={api} art={p.art} text={text} streaming={streaming} />;
      })}
      {api.isStreaming && (!shown.length || shown[shown.length - 1].role !== "assistant") && streamText ?
        <SceneAssistantMessage api={api} art={p.art} text={streamText} streaming={true} /> : null}
    </div>
  );
}

function StoryView(p) {
  var api = p.api; var v = api.variables || {}; var busy = !!api.isStreaming; var loc = parseLoc(v.current_location); var nums = showNums(v);
  var ss = React.useState(""); var sheet = p.setSheet ? p.sheet : ss[0], setSheet = p.setSheet || ss[1];
  var os = React.useState("Normal"); var out = os[0], setOut = os[1];
  var tg = React.useState(""); var tgt = tg[0], setTgt = tg[1];
  var fs=React.useState("");var freeText=fs[0],setFreeText=fs[1];
  var ts=React.useState("small");var freeTier=ts[0],setFreeTier=ts[1];
  var er=React.useState("");var castError=er[0],setCastError=er[1];
  var inCombat = isTrue(v.in_combat); var combat = obj(v.combat);
  var ups = arr(v.known_events).filter(function (e) { return e && e.kind === "upcoming" && (!e.status || e.status === "known"); });
  var chips = CTX[str(v.scene_type)] || CTX.other;
  var spells = arr(v.spells); var party = arr(v.party);
  var physInv=bcNormalize(arr(v.inventory),v);
  var onBody = physInv.filter(function(it){return bcIsAccessible(it,physInv,isTrue(v.in_combat));});
  function act(t) { setSheet(""); send(api, t); }
  function w(n, word) { return nums ? String(num(n)) : word; }
  var chipRow = function (list) { return <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{list}</div>; };
  var sheetBody = null;
  if (sheet === "cast") {
    var pool=bcReserve(v);
    sheetBody = (
      <div>
        <p style={{fontSize:13.5,color:C.muted,margin:'0 0 8px'}}>{pool.maxUnits?(showNums(v)?'Mana reservoir: '+Math.round(pool.currentUnits)+' / '+pool.maxUnits+' units.':'Mana: '+levelWord(v.mana)+'.'):'No mana reserve.'} Costs are persistent, but the world decides if an attack connects.</p>
        <Seg label="Output" value={out} options={["Restrained", "Normal", "Full"]} onChange={setOut} />
        <input className="bc-in" style={{ margin: "8px 0" }} aria-label="Target" placeholder="Target or direction (optional)" value={tgt} onChange={function (e) { setTgt(e.target.value); }} />
        {spells.length ? <div style={{fontSize:14,color:C.goldHi,margin:'9px 0 5px'}}>Recorded spells</div> : null}
        {chipRow(spells.map(function (spell, i) {
          var plan=bcCastPlan(v,spell,{output:out});
          return <Btn key={spell.id||i} small disabled={busy||!plan.ok} onClick={function(){setCastError('');bcCastFromUI(api,spell,{output:out,target:tgt},function(ok,msg){if(ok)setSheet('');else setCastError(msg);});}}>{str(spell.name).replace(/^.*Magic:\s*/,"")+(plan.ok?(showNums(v)?' · '+plan.manaUnits+' mana':' · '+plan.tier):' · unavailable')}</Btn>;
        }))}
        <div style={{fontSize:14,color:C.goldHi,margin:'12px 0 5px'}}>Freeform magic</div>
        <textarea className="bc-in bc-ta" aria-label="Freeform magic idea" placeholder="Describe the magic you want to attempt. It may fail if it exceeds your skill." value={freeText} onChange={function(e){setFreeText(e.target.value);}} />
        <Seg label="Scope" value={freeTier} options={["utility","small","standard","large","massive"]} onChange={setFreeTier} />
        {(() => {var sp={id:'temporary',name:'Freeform magic',mechanics:{tier:freeTier}},plan=bcCastPlan(v,sp,{output:out,freeform:true});return <div style={{fontSize:13,color:C.muted,margin:'8px 0'}}>{plan.ok?(showNums(v)?'Projected cost: '+plan.manaUnits+' mana units, '+plan.stamina+' stamina, +'+plan.fatigue+' fatigue.':'Expected demand: '+plan.tier+'. Actual reserves and skill determine the cost.'):'Cannot cast: '+plan.reason}</div>;})()}
        <Btn small kind="gold" disabled={busy||!freeText.trim()} onClick={function(){setCastError('');bcCastFromUI(api,{id:'freeform',name:'Freeform magic',mechanics:{tier:freeTier}},{output:out,freeform:true,description:freeText.trim(),target:tgt},function(ok,msg){if(ok)setSheet('');else setCastError(msg);});}}>Attempt freeform magic</Btn>
        {castError ? <div role="alert" style={{color:'#f1b8a8',fontSize:13,marginTop:8}}>{castError}</div> : null}
      </div>
    );
  } else if (sheet === "move") sheetBody = chipRow(MOVES.map(function (m) { return <Btn key={m} small disabled={busy} onClick={function () { act(m + "."); }}>{m}</Btn>; }));
  else if (sheet === "defend") sheetBody = chipRow(DEFENDS.map(function (m) { return <Btn key={m} small disabled={busy} onClick={function () { act(m + "."); }}>{m}</Btn>; }));
  else if (sheet === "ally") sheetBody = party.length ? chipRow(party.map(function (a, i) { return <Btn key={a.id || i} small disabled={busy} onClick={function () { act("I call out to " + str(a.name) + ": "); }}>{str(a.name) + (a.condition ? ", " + str(a.condition) : "")}</Btn>; })) : <Empty>No one is fighting beside you.</Empty>;
  else if (sheet === "item") sheetBody = onBody.length ? chipRow(onBody.map(function (it, i) { return <Btn key={it.id || i} small disabled={busy} onClick={function () { act("I use my " + str(it.name) + "."); }}>{str(it.name)}</Btn>; })) : <Empty>Nothing within reach.</Empty>;
  else if (sheet === "rest") {
    function doRest(hours) {
      var newStamina = clamp(num(v.stamina, 0) + Math.round(hours * 20), 0, 100);
      var newMana = clamp(num(v.mana, 0) + Math.round(hours * 12), 0, 100);
      var newFatigue = clamp(num(v.fatigue, 0) - Math.round(hours * 6), 0, 100);
      var t = str(v.world_time).match(/^(\d{1,2}):(\d{2})/);
      var mins = t ? parseInt(t[1], 10) * 60 + parseInt(t[2], 10) + hours * 60 : 0;
      var days = Math.floor(mins / 1440); mins = mins % 1440;
      var newTime = (Math.floor(mins / 60) < 10 ? "0" : "") + Math.floor(mins / 60) + ":" + (mins % 60 < 10 ? "0" : "") + (mins % 60);
      canWrite(api) && api.setVariable("stamina", newStamina); canWrite(api) && api.setVariable("mana", newMana);
      canWrite(api) && api.setVariable("fatigue", newFatigue); canWrite(api) && api.setVariable("world_time", newTime);
      if (days > 0) { canWrite(api) && api.setVariable("world_date", addDays(v.world_date, days)); canWrite(api) && api.setVariable("elapsed_days", num(v.elapsed_days, 0) + days); }
      var hid1 = "[UI:REST] duration=" + hours + " hour" + (hours === 1 ? "" : "s") + "; already applied: stamina " + num(v.stamina, 0) + "\u2192" + newStamina + ", mana " + num(v.mana, 0) + "\u2192" + newMana + ", fatigue " + num(v.fatigue, 0) + "\u2192" + newFatigue + ", time now " + newTime + (days > 0 ? " (next day)" : "") + ". Narrate the rest only \u2014 do not re-write these fields.";
      setSheet(""); tellGM(api, hid1, "I rest for a while.");
    }
    function doSleep() {
      var newStamina = clamp(90 + Math.round(Math.random() * 10), 0, 100);
      var newMana = clamp(85 + Math.round(Math.random() * 15), 0, 100);
      var newFatigue = clamp(num(v.fatigue, 0) - (20 + Math.round(Math.random() * 15)), 0, 100);
      var newDate = addDays(v.world_date, 1);
      canWrite(api) && api.setVariable("stamina", newStamina); canWrite(api) && api.setVariable("mana", newMana);
      canWrite(api) && api.setVariable("fatigue", newFatigue); canWrite(api) && api.setVariable("world_time", "07:00");
      canWrite(api) && api.setVariable("world_date", newDate); canWrite(api) && api.setVariable("elapsed_days", num(v.elapsed_days, 0) + 1);
      var hid2 = "[UI:REST] duration=sleep until morning; already applied: stamina\u2192" + newStamina + ", mana\u2192" + newMana + ", fatigue\u2192" + newFatigue + ", now " + newDate + " 07:00. Narrate falling asleep and waking only \u2014 do not re-write these fields.";
      setSheet(""); tellGM(api, hid2, "I settle in and sleep for the night.");
    }
    sheetBody = (
      <div>
        <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 8 }}>{"Recovery is calculated here, not narrated \u2014 the numbers below are exact."}</div>
        {chipRow([1, 2, 3].map(function (h) { return <Btn key={h} small disabled={busy} onClick={function () { doRest(h); }}>{"Rest " + h + " hour" + (h === 1 ? "" : "s")}</Btn>; }))}
        <div style={{ marginTop: 8 }}>{chipRow([<Btn key="sleep" small disabled={busy} onClick={doSleep}>Sleep until morning</Btn>])}</div>
      </div>
    );
  }
  var eds = React.useState(null); var editing = eds[0], setEditing = eds[1];
  var ms0 = arr(api.messages); var lastAi = null;
  for (var mi = ms0.length - 1; mi >= 0; mi--) { if (ms0[mi] && ms0[mi].role === "assistant" && ms0[mi].status !== "failed") { lastAi = ms0[mi]; break; } }
  function toast(m, t) { if (typeof api.showToast === "function") api.showToast(m, t || "info"); }
  function copyLast() {
    var t = cleanPassage(proseOf(lastAi && lastAi.content)); if (!t) return;
    try { if (typeof api.copyToClipboard === "function") api.copyToClipboard(t); else navigator.clipboard.writeText(t); toast("Passage copied.", "success"); } catch (e) { toast("Couldn't copy that passage.", "error"); }
  }
  function regen() { if (lastAi && typeof api.regenerateMessage === "function") api.regenerateMessage(lastAi.id); }
  function saveLast() {
    var t = cleanPassage(proseOf(lastAi && lastAi.content)); if (!t) return;
    savePassage(api, { id: str(lastAi.id) || String(Date.now()), date: str(v.world_date), place: loc.place || loc.settlement, text: t.slice(0, 1200) }, function (ok, dup) { toast(dup ? "Already in your Life Log." : ok ? "Saved to your Life Log." : "Couldn't save to the journal.", ok || dup ? "success" : "error"); });
  }
  function eatSomething() {
    var food = physInv.filter(function (it) { return bcCanConsume(it) && bcIsAccessible(it, physInv, false); })[0];
    if (!food || !canWrite(api)) { act("Eat something."); return; }
    var r = bcConsume(physInv, food.id, v);
    if (!r.ok) { act("Eat something."); return; }
    var appearance = bcAppearance(r.inventory, v);
    var patch = Object.assign({ inventory: r.inventory, appearance_state: appearance, carry_state: bcCarryProfile(r.inventory, obj(v.body_profile), bcWalletProfile(v.money).weightKg), stamina: clamp(num(v.stamina, 0) + 6, 0, 100) }, bcClockForInventory(v, 15));
    bcPatch(api, patch, function (ok) { toast(ok ? "You eat the " + str(food.name).toLowerCase() + ". (free, no AI turn)" : "Couldn't save that.", ok ? "success" : "error"); });
  }
  function cardAction(c) {
    if (c === "Rest for a while") { setSheet(sheet === "rest" ? "" : "rest"); return; }
    if (/^train/i.test(c) && p.go) { p.go("train"); return; }
    if (c === "Eat something") { eatSomething(); return; }
    act(c + ".");
  }
  if (sheet === "actions") {
    var moreActs = chips.slice(4);
    sheetBody = (
      <div className="bc-actsheet">
        <div className="bc-actsheet-grid">
          <button type="button" className="bc-actbtn" disabled={busy} onClick={function () { setSheet("cast"); }}><Icon n="star" s={20} />Cast magic</button>
          <button type="button" className="bc-actbtn" disabled={busy} onClick={function () { setSheet("item"); }}><Icon n="pack" s={20} />Use an item</button>
          <button type="button" className="bc-actbtn" disabled={busy} onClick={function () { setSheet("rest"); }}><Icon n="bed" s={20} />Rest or sleep</button>
          <button type="button" className="bc-actbtn" onClick={function () { setSheet(""); p.go && p.go("train"); }}><Icon n="dumbbell" s={20} />Training</button>
          <button type="button" className="bc-actbtn" onClick={function () { setSheet(""); p.go && p.go("map"); }}><Icon n="map" s={20} />Travel</button>
          <button type="button" className="bc-actbtn" onClick={function () { setSheet(""); p.go && p.go("time"); }}><Icon n="hourglass" s={20} />Let time pass</button>
          {p.openBattle ? <button type="button" className="bc-actbtn" disabled={busy} onClick={function () { p.openBattle("spar"); }}><Icon n="sword" s={20} />Spar (practice)</button> : null}
        </div>
        {moreActs.length ? <div className="bc-actsheet-more">{moreActs.map(function (c) { return <Chip key={c} disabled={busy} onClick={function () { act(c + "."); }}>{c}</Chip>; })}</div> : null}
        <div className="bc-note">Cards and chips send the action as your message. Training, travel and time open their own planners.</div>
      </div>
    );
  }
  if (editing) {
    sheetBody = null;
  }
  var cp0 = obj(v.creation_profile);
  var kingdom0 = kingdomLabel(loc.kingdom || cp0.homeland) || "Clover Kingdom";
  var night = isNight(v.world_time);
  var tod = (function () { var m = str(v.world_time).match(/^(\d{1,2})/); var h = m ? parseInt(m[1], 10) : 9; return h < 5 ? "Night" : h < 11 ? "Morning" : h < 14 ? "Midday" : h < 18 ? "Afternoon" : h < 21 ? "Evening" : "Night"; })();
  var chapter = loc.place || loc.settlement || "The First Page";
  var chapterSub = loc.place && loc.settlement ? loc.settlement + " · " + dayMonthWD(v.world_date) : (dayMonthWD(v.world_date) || "Where your story begins.");
  var cards = chips.slice(0, 4); var extra = chips.slice(4);
  var rds = React.useState(false); var reading = rds[0], setReading = rds[1];
  React.useEffect(function () { var st = getStore(api); if (!st || typeof st.get !== "function") return; try { var pr = st.get("bc_reading_mode"); if (pr && pr.then) pr.then(function (x) { if (x === "1") setReading(true); }, function () {}); } catch (e) {} }, []);
  function toggleReading() { var n = !reading; setReading(n); setSheet(""); var st = getStore(api); if (st && typeof st.set === "function") { try { var pr = st.set("bc_reading_mode", n ? "1" : "0"); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} } }
  function draft(random) {
    var idea = composerIdea(v, random);
    if (typeof api.setComposerDraft === "function") api.setComposerDraft(idea);
    else toast(idea, "info");
  }
  var quick = (
    <div className="bc-quickrow" role="toolbar" aria-label="Quick actions">
      <button type="button" className={"bc-qbtn bc-qbtn-round" + (sheet === "actions" ? " bc-qbtn-on" : "")} aria-label="More actions" aria-expanded={sheet === "actions" ? "true" : "false"} onClick={function () { setSheet(sheet === "actions" ? "" : "actions"); }}><Icon n="plus" s={14} /></button>
      {busy
        ? <button type="button" className="bc-qbtn bc-qbtn-busy" onClick={function () { if (typeof api.stopGeneration === "function") api.stopGeneration(); }}><span className="bc-streaming-dot" />{"Writing…"}<b>Stop</b></button>
        : <button type="button" className="bc-qbtn" onClick={function () { draft(false); }} title="Put a suggestion in the box. Nothing is sent until you press send."><Icon n="star" s={13} />Suggest</button>}
      <button type="button" className="bc-qbtn" disabled={busy} onClick={function () { draft(true); }} title="Put a random idea in the box. Nothing is sent until you press send."><Icon n="dice" s={13} />Random</button>
      <span className="bc-qsep" aria-hidden="true" />
      {inCombat
        ? [["cast", "Cast", "star"], ["move", "Move", "run"], ["defend", "Defend", "shield"], ["ally", "Allies", "people"], ["item", "Items", "pack"]].map(function (x) {
            return <button key={x[0]} type="button" className={"bc-qbtn" + (sheet === x[0] ? " bc-qbtn-on" : "")} disabled={busy} onClick={function () { setSheet(sheet === x[0] ? "" : x[0]); }}><Icon n={x[2]} s={13} />{x[1]}</button>;
          })
        : cards.map(function (c) {
            var m = actMeta(c); var on = c === "Rest for a while" && sheet === "rest";
            return <button key={c} type="button" className={"bc-qbtn bc-qact" + (on ? " bc-qbtn-on" : "")} disabled={busy} onClick={function () { cardAction(c); }}><Icon n={m.icon} s={14} />{c}</button>;
          })}
    </div>
  );
  return (
    <div className={"bc-fill bc-story" + (reading ? " bc-reading" : "")}>
      <header className="bc-storybar">
        {p.bannerUrl ? <img className="bc-storybar-img" src={p.bannerUrl} alt="" /> : null}
        <span className="bc-storybar-shade" />
        {p.onBack ? <button type="button" className="bc-hero-back bc-storybar-back" aria-label="Back" onClick={p.onBack}><Icon n="chevl" s={18} fill={C.goldHi} /></button> : null}
        <div className="bc-storybar-text"><strong>{chapter}</strong><small>{chapterSub}</small></div>
        <button type="button" className={"bc-readbtn" + (reading ? " bc-readbtn-on" : "")} aria-pressed={reading ? "true" : "false"} onClick={toggleReading} title={reading ? "Show the status bar and actions again" : "Give the story the whole screen"}><Icon n="book" s={15} />{reading ? "Show all" : "Reading mode"}</button>
      </header>
      {reading ? null : (
        <div className="bc-statstrip" role="group" aria-label="Your condition">
          {[["heart", "Body", v.vitality, w(v.vitality, condWord(v.vitality)), "hp"], ["drop", "Mana", v.mana, w(v.mana, levelWord(v.mana)), "mp"], ["run", "Stamina", v.stamina, w(v.stamina, levelWord(v.stamina)), "st"], ["moon", "Fatigue", v.fatigue, w(v.fatigue, fatWord(v.fatigue)), "ft"]].map(function (s) {
            return (
              <button type="button" key={s[1]} className={"bc-statcell bc-statcell-" + s[4] + (hudLow(s[4], s[2]) ? " bc-crit" : "")} aria-label={s[1] + ": " + s[3] + ". Open character"} onClick={function () { p.go && p.go("character"); }}>
                <Icon n={s[0]} s={15} />
                <div className="bc-statcell-body"><span>{s[1]}</span><div className="bc-statbar"><i style={{ width: clamp(num(s[2], 0), 0, 100) + "%" }} /></div><small>{s[3]}</small></div>
              </button>
            );
          })}
          <button type="button" className="bc-statcell bc-statcell-sky" aria-label={tod + ", " + clock12(v.world_time) + ", " + str(v.weather) + ". Let time pass"} onClick={function () { p.go && p.go("time"); }}><Icon n={night ? "moon" : "sun"} s={16} /><div className="bc-statcell-body"><span>{tod}</span><small>{str(v.weather).split(/[,;.]/)[0] || clock12(v.world_time)}</small></div></button>
        </div>
      )}
      {!reading && ups.length ? (
        <button type="button" className="bc-upcoming" onClick={function () { p.go && p.go("notices"); }}><span>Upcoming</span><em>{str(ups[0].title) + (ups[0].when ? ", " + str(ups[0].when) : "") + (ups[0].where ? ", " + str(ups[0].where) : "")}</em><Icon n="chevr" s={11} /></button>
      ) : null}
      {inCombat ? (
        <div className={"bc-combatbar" + (reading ? " bc-combatbar-slim" : "")}>
          <div className="bc-combatbar-head"><div className="bc-combatbar-title">{"Combat" + (combat.location ? ", " + str(combat.location) : "")}</div>
            {p.openBattle ? <button type="button" className="bc-fightbtn" disabled={busy} onClick={function () { p.openBattle("combat"); }}><Icon n="sword" s={16} fill="#2a0907" />Fight it out</button> : null}</div>
          {reading ? null : arr(combat.participants).slice(0, 4).map(function (c, i) {
            return <div key={i} className={"bc-combatbar-row" + (c.side === "enemy" ? " bc-enemy" : "")}><span>{str(c.name)}</span><small>{[str(c.condition), str(c.distance)].filter(Boolean).join(", ")}</small></div>;
          })}
        </div>
      ) : null}
      <div className="bc-chat bc-story-chat bc-chronicle-card" aria-label="Living story and NPC dialogue">
        <div className="bc-storycard-head">
          <span className="bc-storycard-label"><Icon n="clover" s={13} />Your Story</span>
          <div className="bc-cardtools" role="toolbar" aria-label="Latest passage">
            <button type="button" disabled={!lastAi} onClick={copyLast} aria-label="Copy the latest passage" title="Copy"><Icon n="doc" s={15} /></button>
            <button type="button" disabled={!lastAi || busy || typeof api.editMessage !== "function"} onClick={function () { setEditing({ id: lastAi.id, text: proseOf(lastAi.content), dirs: dirsOf(lastAi.content) }); }} aria-label="Edit the latest passage" title="Edit"><Icon n="quill" s={15} /></button>
            <button type="button" disabled={!lastAi || busy || typeof api.regenerateMessage !== "function"} onClick={regen} aria-label="Regenerate the latest passage" title="Regenerate"><Icon n="hourglass" s={15} /></button>
            <button type="button" disabled={!lastAi} onClick={saveLast} aria-label="Save the latest passage to your Life Log" title="Save to Life Log"><Icon n="bookmark" s={15} /></button>
          </div>
        </div>
        <StoryArtContext.Provider value={p.art}>
          <Chat className="bc-story-native-chat" renderBubble={StoryBubble} />
        </StoryArtContext.Provider>
      </div>
      {!reading && arr(v.equipment_activity).length ? (
        <div role="status" className="bc-equipnote">
          {arr(v.equipment_activity).slice(-2).map(function (e) { return <div key={e.id}>{str(e.text)}</div>; })}
        </div>
      ) : null}
      {sheet ? (
        <div className="bc-story-sheet">
          <div className="bc-story-sheet-head">
            <span>{{ cast: "Cast", move: "Move", defend: "Defend", ally: "Allies", item: "Items", rest: "Rest", actions: "Actions" }[sheet]}</span>
            <Btn small label="Close" onClick={function () { setSheet(""); }}>Close</Btn>
          </div>
          {sheetBody}
        </div>
      ) : null}
      {editing ? (
        <Sheet title="Edit passage" onClose={function () { setEditing(null); }}>
          <textarea className="bc-in bc-ta bc-edit-ta" aria-label="Passage text" value={editing.text} onChange={function (e) { setEditing(Object.assign({}, editing, { text: e.target.value })); }} />
          <div className="bc-note">Only the prose changes. State already recorded by this reply stays exactly as it is.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Btn kind="gold" disabled={!editing.text.trim()} onClick={function () { var ed = editing; var pr = api.editMessage(ed.id, ed.text.trim() + (ed.dirs ? "\n\n" + ed.dirs : "")); setEditing(null); if (pr && pr.then) pr.then(function (ok) { toast(ok ? "Passage updated." : "Couldn't update that passage.", ok ? "success" : "error"); }, function () { toast("Couldn't update that passage.", "error"); }); }}>Save changes</Btn>
            <Btn onClick={function () { setEditing(null); }}>Cancel</Btn>
          </div>
        </Sheet>
      ) : null}
      {reading ? null : quick}
    </div>
  );
}
var DIRECTIVE_LINE = /^\s*\[(?:audio|[A-Za-z_][\w.\-]*)\s*:[^\]]*\]\s*$/;
function proseOf(t) { return str(t).split("\n").filter(function (l) { return !DIRECTIVE_LINE.test(l); }).join("\n").replace(/\n{3,}/g, "\n\n").trim(); }
function cleanPassage(t) { return str(t).split("\n").map(function (l) { var m = l.match(/^\s*@(.+?)\s*$/); return m ? m[1] + ":" : l.replace(/(^|\s)[*_]+|[*_]+(?=\s|$|[.,!?;:])/g, "$1"); }).join("\n").replace(/:\n"/g, ": \"").trim(); }
function dirsOf(t) { return str(t).split("\n").filter(function (l) { return DIRECTIVE_LINE.test(l); }).join("\n"); }
function hudLow(k, val) { var n = num(val, k === "ft" ? 0 : 100); return k === "ft" ? n > 80 : (k === "hp" ? n < 25 : n < 15); }
var PASSAGE_KEY = "bc_saved_passages";
function loadPassages(api, cb) { var st = getStore(api); if (!st || typeof st.get !== "function") { cb([]); return; } try { var pr = st.get(PASSAGE_KEY); if (pr && pr.then) pr.then(function (raw) { var l = []; try { l = raw ? JSON.parse(raw) : []; } catch (e) {} cb(Array.isArray(l) ? l : []); }, function () { cb([]); }); else cb([]); } catch (e) { cb([]); } }
function storePassages(api, list, cb) { var st = getStore(api); if (!st || typeof st.set !== "function") { cb && cb(false); return; } try { var pr = st.set(PASSAGE_KEY, JSON.stringify(list.slice(-60))); if (pr && pr.then) pr.then(function () { cb && cb(true); }, function () { cb && cb(false); }); else cb && cb(true); } catch (e) { cb && cb(false); } }
function savePassage(api, item, cb) { loadPassages(api, function (l) { if (l.some(function (x) { return x.id === item.id; })) { cb(false, true); return; } storePassages(api, l.concat([item]), function (ok) { cb(ok, false); }); }); }
var ACT_META = [
  [/rest|sleep|room/i, "bed", "Recover body and mind.", "act_rest"],
  [/^eat something/i, "food", "Free if you carry food.", "act_eat"],
  [/^train/i, "dumbbell", "Opens the training planner.", "act_train"],
  [/eat|food|meal|order/i, "food", "Restore stamina.", "act_eat"],
  [/train|practice|spar/i, "dumbbell", "Sharpen your skills.", "act_train"],
  [/head|outside|leave|explore|keep going|advance|look around|route/i, "compass", "Explore the town.", "act_out"],
  [/talk|ask|captain|someone|companion|barkeep|employer|listen|rumou?r/i, "people", "See who will talk.", "act_out"],
  [/work|job|chores|pay/i, "hammer", "Earn your keep.", "act_train"],
  [/browse|wares|price|shop/i, "coins", "See what is for sale.", "act_eat"],
  [/mission|camp|forage|track|trap|map|wait|watch|step|slip/i, "scroll", "Take your time.", "act_out"]
];
function actMeta(label) {
  for (var i = 0; i < ACT_META.length; i++) if (ACT_META[i][0].test(label)) return { icon: ACT_META[i][1], sub: ACT_META[i][2], art: ACT_META[i][3] };
  return { icon: "star", sub: "Act on it.", art: "act_out" };
}

/* ---------- screens ---------- */
function PRow(p) { return <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid " + C.lineSoft, fontSize: 15.5 }}><span style={{ color: C.muted }}>{p.k}</span><span style={{ textAlign: "right", color: C.ivory }}>{p.v}</span></div>; }
function Tabs(p) { return <div role="tablist" aria-label={p.label} style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>{p.items.map(function (t) { return <Btn key={t[0]} small active={p.value === t[0]} onClick={function () { p.onChange(t[0]); }}>{t[1]}</Btn>; })}</div>; }

function CharacterView(p) {
  var v = p.api.variables || {}; var pp = obj(v.player_profile); var mp = obj(v.magic_profile); var bp = obj(v.body_profile); var nums = showNums(v);
  var ss = React.useState("profile"); var sub = ss[0], setSub = ss[1];
  var mb = obj(mp.bands); var bb = obj(bp.bands); var content = null;
  function nv(k, src) { return nums ? " (" + num(src[k]) + ")" : ""; }
  if (sub === "profile") {
    content = (
      <div>
        <Row k="Gender" v={str(pp.sex)} /><Row k="Homeland" v={str(pp.homeland)} /><Row k="Origin" v={str(pp.social_origin)} />
        <Row k="Home" v={str(v.home_location)} /><Row k="Occupation" v={str(v.occupation) || "None yet"} />
        {pp.appearance ? <p style={{ fontSize: 16, lineHeight: 1.55, color: C.label }}>{str(pp.appearance)}</p> : null}
        {pp.personality ? <p style={{ fontSize: 16, lineHeight: 1.55, color: C.muted, fontStyle: "italic" }}>{str(pp.personality)}</p> : null}
      </div>
    );
  } else if (sub === "condition") {
    var conds = arr(v.conditions);
    content = (
      <div>
        <Row k="Body" v={condWord(v.vitality) + (nums ? " (" + num(v.vitality) + ")" : "")} /><Row k="Stamina" v={levelWord(v.stamina) + (nums ? " (" + num(v.stamina) + ")" : "")} />
        <Row k="Mana" v={levelWord(v.mana) + (nums ? " (" + num(v.mana) + "%)" : "")} /><Row k="Fatigue" v={fatWord(v.fatigue) + (nums ? " (" + num(v.fatigue) + ")" : "")} />
        <H size={16} m="16px 0 6px">Injuries and conditions</H>
        {conds.length ? conds.map(function (c, i) { return <Row key={c.id || i} k={(str(c.type) || str(c.kind)) + (c.location ? ", " + str(c.location) : "")} v={str(c.severity) + (c.effects ? ": " + str(c.effects) : "")} />; }) : <Empty>No injuries or conditions.</Empty>}
      </div>
    );
  } else if (sub === "magic") {
    content = (
      <div>
        <Row k="Attribute" v={mp.attribute_known === false ? "Not yet understood" : (str(mp.attribute) || "Unknown")} />
        <Row k="Mana reserves" v={(str(mb.reserves) || bandOf(mp.capacity)) + nv("capacity", mp)} />
        <Row k="Output" v={(str(mb.output) || bandOf(mp.output)) + nv("output", mp)} />
        <Row k="Control" v={(str(mb.control) || bandOf(mp.control)) + nv("control", mp)} />
        <Row k="Sensing" v={(str(mb.sensing) || bandOf(mp.sensing)) + nv("sensing", mp)} />
        <Row k="Physique" v={str(bb.physique) || "Unknown"} /><Row k="Fighting" v={str(bb.combat) || "Unknown"} />
        <Row k="Assessment" v={!mp.stage || str(mp.stage) === "unassessed" ? "Never assessed" : str(mp.stage)} />
        {Object.keys(obj(bp.skills)).length ? <div><H size={16} m="16px 0 6px">Skills</H>{Object.keys(obj(bp.skills)).map(function (k) { return <Row key={k} k={k} v={str(obj(bp.skills)[k])} />; })}</div> : null}
      </div>
    );
  } else {
    var rep = obj(v.reputation); var keys = Object.keys(rep);
    content = keys.length ? keys.map(function (k) { var r = rep[k]; var o = typeof r === "object" && r ? r : { band: str(r) }; return <Row key={k} k={k} v={str(o.band) + (o.note ? ": " + str(o.note) : "")} />; }) : <Empty>Nobody much knows your name yet.</Empty>;
  }
  var ms = React.useState(""); var portMsg = ms[0], setPortMsg = ms[1];
  var pbs = React.useState(false); var portBusy = pbs[0], setPortBusy = pbs[1];
  var afs = React.useState(false); var aiForge = afs[0], setAiForge = afs[1];
  function onPortraitFile(e) {
    var fl = e.target.files && e.target.files[0]; e.target.value = ""; if (!fl) return;
    readImage(fl, 360, 460, function (err, data) {
      if (err) { setPortMsg(err); return; }
      setPortMsg(""); setPortBusy(true);
      p.setPortrait && p.setPortrait(data, function (ok) { setPortBusy(false); if (!ok) setPortMsg(p.mediaError || "Upload failed \u2014 try again."); });
    });
  }
  return (
    <div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
        <Portrait url={p.portrait} w={78} h={104} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 22, color: C.ivory, lineHeight: 1.15 }}>{str(v.player_name)}</div>
          <div style={{ fontSize: 15, color: C.label }}>{[str(pp.social_origin).split(" (")[0], v.player_age ? "Age " + v.player_age : ""].filter(Boolean).join(" \u00b7 ")}</div>
          <div style={{ fontSize: 15, color: C.muted }}>{str(v.occupation)}</div>
          {p.setPortrait ? (
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "inline-flex", alignItems: "center", minHeight: 36, padding: "5px 10px", borderRadius: 6, border: "1px solid " + C.gold, color: C.goldHi, fontWeight: 700, cursor: portBusy ? "default" : "pointer", opacity: portBusy ? .6 : 1, fontSize: 13.5 }}>
                {portBusy ? "Uploading\u2026" : (p.portrait ? "Change portrait" : "Add a portrait")}<input type="file" accept="image/*" disabled={portBusy} onChange={onPortraitFile} style={{ display: "none" }} />
              </label>
              <Btn small kind="gold" disabled={portBusy} onClick={function () { setAiForge(true); }}>AI Portrait</Btn>
              {p.portrait ? <Btn small disabled={portBusy} onClick={function () { setPortBusy(true); p.setPortrait("", function () { setPortBusy(false); }); }}>Remove</Btn> : null}
            </div>
          ) : null}
          {portMsg ? <div role="alert" style={{ fontSize: 13, color: "#f1c7b8", marginTop: 4 }}>{portMsg}</div> : null}
          {p.setPortrait && !p.hasStore ? <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>This preview can't save art between sessions.</div> : null}
        </div>
      </div>
      {aiForge ? <AIArtForge api={p.api} title="AI Portrait Forge" subject={str(v.player_name) || "Your character"} needle={str(v.player_name)} currentUrl={p.portrait} baseNote={"Solo 3:4 anime character portrait of my player character " + (str(v.player_name) || "the protagonist") + ". " + clipArtNote([str(pp.appearance), str(pp.sex), str(pp.social_origin), mp.attribute_known === false ? "" : (str(mp.attribute) + " magic")].filter(Boolean).join("; "), 110) + ". Face visible, no other people."} onApply={function (u, cb) { p.setPortrait(u, cb); }} onClose={function () { setAiForge(false); }} /> : null}
      <Tabs label="Character sections" value={sub} onChange={setSub} items={[["profile", "Profile"], ["condition", "Condition"], ["magic", "Magic"], ["reputation", "Reputation"]]} />
      <Frame pad="4px 14px 10px">{content}</Frame>
    </div>
  );
}
function SquadView(p) {
  var v = p.api.variables || {}; var mk = obj(v.mk_status); var aff = arr(v.affiliations); var party = arr(v.party); var exam = obj(mk.exam);
  var inSquad = str(mk.squad) && str(mk.squad) !== "none";
  var payroll=obj(v.mk_payroll);var service=obj(payroll.service);
  var compensation=bcMKMonthly(mk.rank,mk.personal_stars);
  var payday=bcMKNextPayday(v);
  var payments=arr(payroll.ledger).slice(-5).reverse();
  return (
    <div>
      <Frame pad="14px" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Icon n="crest" s={46} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 20, color: C.ivory }}>{inSquad ? str(mk.squad) : "No squad"}</div>
            <div style={{ fontSize: 15, color: C.muted }}>{inSquad ? [str(mk.rank), mk.captain ? "Captain " + str(mk.captain) : "", mk.since ? "since " + str(mk.since) : ""].filter(Boolean).join(", ") : "You don't serve in any squad. The Magic Knights hold their Entrance Exam once a year in the Royal Capital."}</div>
          </div>
        </div>
        {exam.status && exam.status !== "none" ? <Row k="Entrance exam" v={str(exam.status) + (exam.year ? ", " + str(exam.year) : "")} /> : null}
        {arr(exam.offers).length ? <Row k="Offers" v={arr(exam.offers).join(", ")} /> : null}
      </Frame>
      {inSquad ? <Frame pad="14px" style={{marginBottom:14}}>
        <H m="0 0 7px">Clover Kingdom Service Pay</H>
        {compensation.base>0 ? <>
          <Row k="Official rank base / month" v={bcMoney(compensation.base)}/>
          <Row k="Individual merit stars" v={Math.max(0,num(mk.personal_stars,0)).toLocaleString()+" (max +15% allowance)"}/>
          <Row k="Merit service allowance" v={bcMoney(compensation.merit)}/>
          <Row k="Expected monthly total" v={bcMoney(compensation.total)}/>
          <Row k="Next scheduled payday" v={payday||"Service record initializing…"}/>
          <Row k="Total payroll credited to bank" v={bcMoney(payroll.totalPaid)}/>
        </> : <div style={{color:C.muted,fontSize:13}}>Your compensation is administered separately by the Crown.</div>}
        <div style={{fontSize:12.5,color:C.muted,lineHeight:1.4,marginTop:8}}>
          Salary credits automatically on the in-world monthly anniversary; equipment purchases and AI turns do not cause salary payments. All squads use the same rank base. Bonuses require a genuine, approved award. 1 Yul ≈ 1 yen is a pricing guideline, not an official exchange rate.
        </div>
        {payments.length ? <><H m="14px 0 7px">Recent Payslips & Awards</H>
          {payments.map(function(t,i){return <div key={t.id||i} style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:12.5,padding:'5px 0',borderBottom:'1px solid '+C.lineSoft}}>
            <span style={{color:C.label}}>{str(t.date)+' · '+(t.kind==='bonus'?'Merit award':'Salary')}</span>
            <span style={{color:C.goldHi,fontWeight:700,whiteSpace:'nowrap'}}>+{bcMoney(t.amount)}</span>
          </div>;})}
        </> : null}
      </Frame> : null}
      {inSquad ? <SquadRoster api={p.api} toStory={p.toStory} /> : null}
      <H>Organizations</H>
      {aff.length ? <Frame pad="4px 14px 8px">{aff.map(function (a, i) { return <Row key={i} k={str(a.org)} v={[str(a.role), str(a.rank), str(a.standing)].filter(Boolean).join(", ")} />; })}</Frame> : <Empty>You don't belong to any organization yet.</Empty>}
      <H m="18px 0 10px">With you now</H>
      {party.length ? <Frame pad="4px 14px 8px">{party.map(function (a, i) { return <Row key={a.id || i} k={str(a.name)} v={str(a.condition) || "Nearby"} />; })}</Frame> : <Empty>You are on your own.</Empty>}
    </div>
  );
}



function BankView(p) {
  var api=p.api,v=api.variables||{},bank=bcBankState(v.bank_account),wallet=bcWalletProfile(v.money);
  var here=bcBankHere(v),ready=canWrite(api);
  var amountState=React.useState(''),amount=amountState[0],setAmount=amountState[1];
  var msgState=React.useState(''),msg=msgState[0],setMsg=msgState[1];
  var pending=React.useRef(false);
  var startSignature=React.useRef('');
  var stateSignature=JSON.stringify([v.money,v.bank_account]);
  React.useEffect(function(){if(pending.current&&stateSignature!==startSignature.current) pending.current=false;},[stateSignature]);
  function apply(patch,success){
    if(pending.current||!ready)return;
    pending.current=true;startSignature.current=stateSignature;
    try{
      var result;
      if(typeof api.patchVariables==='function')result=api.patchVariables(patch);
      else Object.keys(patch).forEach(function(k){api.setVariable(k,patch[k]);});
      if(result&&typeof result.then==='function')result.then(function(){setMsg(success);},function(){pending.current=false;setMsg('Transaction could not be saved. Please check the balances before trying again.');});
      else setMsg(success);
    }catch(e){pending.current=false;setMsg('Save failed: '+str(e&&e.message||e));}
  }
  function open(){
    var r=bcBankOpen(v.bank_account,v);
    if(!r.ok){setMsg(r.reason);return;}
    apply(Object.assign({bank_account:r.bank_account},bcClockForInventory(v,5)),'Account opened. Deposits and withdrawals can now be completed at a staffed branch.');
  }
  function transfer(kind,n){
    if(pending.current)return;
    var r=bcBankTransfer(v,kind,n);
    if(!r.ok){setMsg(r.reason);return;}
    var inv=bcNormalize(arr(v.inventory),v);
    var patch=Object.assign({money:r.money,bank_account:r.bank_account,
      carry_state:bcCarryProfile(inv,obj(v.body_profile),bcWalletProfile(r.money).weightKg)},bcClockForInventory(v,3));
    apply(patch,(kind==='deposit'?'Deposited ':'Withdrew ')+bcMoney(n)+'; both balances have been updated.');
    setAmount('');
  }
  var md = React.useState(""); var mode = md[0], setMode = md[1];
  var acctLabel = bank.open ? (bank.accountType && bank.accountType !== "personal" ? bank.accountType : "Stored in the Clover Kingdom Treasury.") : "No account opened yet.";
  function amountBox(kind) {
    return (
      <div className="bc-bank-amount">
        <input className="bc-in" inputMode="numeric" type="number" min="1" step="1" aria-label={kind === "deposit" ? "Amount to deposit" : "Amount to withdraw"} value={amount} onChange={function (e) { setAmount(e.target.value); }} placeholder="Whole Yul" />
        <Btn small kind="gold" disabled={!ready || !here || !bank.open || !(Number(amount) > 0)} onClick={function () { transfer(kind, Number(amount)); }}>{kind === "deposit" ? "Deposit" : "Withdraw"}</Btn>
        {kind === "deposit" ? <Btn small disabled={!ready || !here || !bank.open || wallet.yul <= 0} onClick={function () { transfer('deposit', wallet.yul); }}>All cash</Btn> : null}
      </div>
    );
  }
  return (
    <Frame className="bc-bank-panel" pad="0 0 8px">
      <SectionHead art="bank_head" icon="bank" title="Bank & Treasury" sub="Safekeep your wealth." />
      <div className="bc-balance">
        <img src={img("bank_balance")} alt="" /><span className="bc-balance-shade" />
        <div><small>Account Balance</small><strong>{num(bank.balance, 0).toLocaleString() + " Yul"}</strong><span>{acctLabel}</span></div>
      </div>
      <div className="bc-note bc-bank-where" style={{ color: here ? C.goldHi : C.muted }}>{here ? "A staffed counter is here: deposits and withdrawals are open." : "Transactions need a visit to a staffed bank or treasury office."}</div>
      {here && !bank.open ? <div style={{ padding: "0 10px 8px" }}><Btn kind="gold" disabled={!ready} onClick={open}>Open a free account</Btn></div> : null}
      <div className="bc-actrows">
        <ActionRow icon="up" title="Deposit Yul" sub="Move Yul from your purse to the bank." expanded={mode === "deposit"} onClick={function () { setMode(mode === "deposit" ? "" : "deposit"); }} />
        {mode === "deposit" ? amountBox("deposit") : null}
        <ActionRow icon="down" title="Withdraw Yul" sub="Take Yul from your bank to your purse." expanded={mode === "withdraw"} onClick={function () { setMode(mode === "withdraw" ? "" : "withdraw"); }} />
        {mode === "withdraw" ? amountBox("withdraw") : null}
        <ActionRow icon="doc" title="Account Details" sub="View history and treasury information." expanded={mode === "details"} onClick={function () { setMode(mode === "details" ? "" : "details"); }} />
        {mode === "details" ? (
          <div className="bc-bank-details">
            <Row k="Purse · spendable cash" v={bcMoney(v.money)} />
            <Row k="Purse weight" v={wallet.weightKg.toFixed(3) + ' kg (' + wallet.pieces + ' pieces)'} />
            <Row k="Account" v={bank.open ? 'Active' : 'Not opened'} />
            {bank.ledger.length ? bank.ledger.slice(-12).reverse().map(function (e, i) { return <Row key={e.id || i} k={str(e.kind) + ' · ' + str(e.at)} v={(e.kind === 'withdraw' ? '-' : '+') + bcMoney(e.amount)} />; }) : <Empty>No banking transactions have been recorded.</Empty>}
            <Btn small disabled={!!api.isStreaming} onClick={function () { send(api, "I ask where the nearest reputable banking or treasury office is and how to reach it."); p.toStory(); }}>Ask where to bank (AI)</Btn>
            <div className="bc-note">Knight salary and approved awards credit this account automatically. Opening and transfers are local and use no AI.</div>
          </div>
        ) : null}
      </div>
      {msg ? <div role="status" className="bc-inv-msg">{msg}</div> : null}
    </Frame>
  );
}

function MarketView(p) {
  var api = p.api; var v = api.variables || {}; var busy = !!api.isStreaming; var locs = arr(v.known_locations); var cx = arr(v.codex);
  var shopRe = /shop|market|merchant|smith|baker|store|stall|inn|tavern|trader|emporium/i; var blackRe = /black market|black-market|smuggl|fence|underground|contraband/i;
  var shops = locs.filter(function (l) { return shopRe.test(str(l.name) + " " + str(l.notes)) && !blackRe.test(str(l.name) + " " + str(l.notes)); });
  var shady = locs.filter(function (l) { return blackRe.test(str(l.name) + " " + str(l.notes)); }).concat(cx.filter(function (c) { return blackRe.test(str(c.topic) + " " + str(c.text)); }));
  var stock = arr(v.shop_stock);
  function ask(t) { send(api, t); p.toStory(); }
  var buyMessage=React.useState(''),buyError=buyMessage[0],setBuyError=buyMessage[1];
  function buyItem(item, idx) {
    if(!canWrite(api)||num(item.qty,1)<=0)return;
    var price=num(item.price,0);
    if(price<0||num(v.money,0)<price){setBuyError('Not enough yul.');return;}
    var current=bcNormalize(arr(v.inventory),v);
    // A shop-stock entry describes a type, but each purchase makes a new
    // physical instance. Never share the stock id with purchased instances.
    var id='it-bc-'+String(item.id||'stock').replace(/[^a-zA-Z0-9_-]/g,'-')+'-'+(current.length+1);
    var materialized={id:id,name:str(item.name),qty:1,cond:str(item.cond)||'good',
      type:item.type,weight:item.weight,bulk:item.bulk,slot:item.slot,tags:item.tags,
      storage_profile:item.storage_profile,quality:item.quality,durability:item.durability,
      maxDurability:item.maxDurability,material:item.material,
      notes:str(item.notes),provenance:{source:'shop',price:price,location:str(v.current_location)}};
    var received=bcReceive(current,materialized);
    if(!received.ok){setBuyError(received.reason+' No yul spent.');return;}
    var newStock=stock.slice(),newQty=num(item.qty,1)-1;
    if(newQty<=0)newStock.splice(idx,1);
    else newStock[idx]=Object.assign({},item,{qty:newQty});
    var newMoney=num(v.money,0)-price;
    var patch=Object.assign({money:newMoney,shop_stock:newStock,inventory:received.inventory,
      carry_state:bcCarryProfile(received.inventory,obj(v.body_profile),bcWalletProfile(newMoney).weightKg)},bcClockForInventory(v,2));
    setBuyError('');
    try {
      var result;
      if(typeof api.patchVariables==='function')result=api.patchVariables(patch);
      else Object.keys(patch).forEach(function(k){api.setVariable(k,patch[k]);});
      var hid='[UI:BUY] item='+str(item.name)+'; price='+price+' yul; STATE ALREADY APPLIED. Do not add inventory or deduct money again.';
      if(result&&typeof result.then==='function') {
        result.then(function(){tellGM(api,hid,'I buy the '+str(item.name).toLowerCase()+'.');p.toStory();},function(e){setBuyError('Purchase failed to save.');});
      }else{tellGM(api,hid,'I buy the '+str(item.name).toLowerCase()+'.');p.toStory();}
    }catch(e){setBuyError('Purchase failed: '+str(e&&e.message||e));}
  }
  return (
    <Frame className="bc-market-panel" pad="0 0 8px">
      <SectionHead art="market_head" icon="coins" title="Market" sub="Buy, Sell, and Trade in the Kingdom." />
      {buyError ? <div role="alert" className="bc-inv-msg" style={{ color: "#efb6a5" }}>{buyError}</div> : null}
      {stock.length ? (
        <div className="bc-stock">
          <div className="bc-stock-title">Currently browsing</div>
          {stock.map(function (item, i) {
            var afford = num(v.money, 0) >= num(item.price, 0);
            return (
              <div key={item.id || i} className="bc-stockrow">
                <div><strong>{str(item.name) + (num(item.qty, 1) > 1 ? " ×" + num(item.qty, 1) : "")}</strong>{item.notes ? <small>{str(item.notes)}</small> : null}</div>
                <Btn small disabled={busy || !afford} onClick={function () { buyItem(item, i); }}>{num(item.price, 0).toLocaleString() + " Yul"}</Btn>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="bc-actrows">
        <ActionRow icon="search" title="Look for a shop" sub={shops.length ? "Known: " + shops.slice(0, 3).map(function (l) { return str(l.name); }).join(", ") : "Browse what is nearby."} disabled={busy} onClick={function () { ask("I look for somewhere nearby to buy what I need."); }} />
        <ActionRow icon="coins" title="Sell something" sub="Turn your items into Yul." disabled={busy} onClick={function () { ask("I try to sell something I'm carrying."); }} />
        <ActionRow icon="people" title="Ask around discreetly" sub={shady.length ? "Leads: " + shady.slice(0, 2).map(function (x) { return str(x.name || x.topic); }).join(", ") : "Find rare items and special deals through local connections."} disabled={busy} onClick={function () { ask("I quietly ask around about where someone could buy things off the books."); }} />
      </div>
    </Frame>
  );
}
function MissionsView(p) {
  var v = p.api.variables || {}; var missions = arr(v.missions);
  var events = arr(v.known_events).filter(function (e) { return e && !/^(done|missed|taken|resolved|expired)$/i.test(str(e.status)); });
  var past = arr(v.known_events).filter(function (e) { return e && /^(done|missed|taken|resolved|expired)$/i.test(str(e.status)); }).slice(-5).reverse();
  return (
    <div>
      <H>Missions and commitments</H>
      {missions.length ? <Frame pad="4px 14px 8px">{missions.map(function (m, i) { return <Row key={m.id || i} k={str(m.title) + (m.issuer ? " (" + str(m.issuer) + ")" : "")} v={str(m.status)} />; })}</Frame> : <Empty>No missions. Requests come from real problems: squads, officials, villages and people you know.</Empty>}
      <H m="20px 0 10px">Things you know are coming</H>
      {events.length ? <Frame pad="4px 14px 8px">{events.map(function (e, i) { return <Row key={e.id || i} k={str(e.title)} v={[str(e.when), str(e.where)].filter(Boolean).join(", ")} />; })}</Frame> : <Empty>Nothing on the horizon that you know of.</Empty>}
      {past.length ? <div><H m="20px 0 10px">Recently resolved</H><Frame pad="4px 14px 8px">{past.map(function (e, i) { return <Row key={e.id || i} k={str(e.title)} v={str(e.status)} />; })}</Frame></div> : null}
    </div>
  );
}
function PeopleView(p) {
  var v = p.api.variables || {}; var rel = canonicalizeNamedPeople(obj(v.relationships)).value; var ids = Object.keys(rel); var com = arr(v.commitments); var nums = showNums(v);
  var os = React.useState(""); var open = os[0], setOpen = os[1];
  return (
    <div style={{ position: "relative" }}>
      <Eyebrow k={"CONNECTIONS · ALLIES AND RIVALS"}>{ids.length ? "Every meeting can change your path." : "Your story has room for others."}</Eyebrow>
      {ids.length ? ids.map(function (id) {
        var r = obj(rel[id]);
        var nm = str(r.name) || id;
        var imgUrl = p.art && p.art.personImageUrl ? p.art.personImageUrl(id) : "";
        var initials = nm.split(/\s+/).filter(Boolean).slice(0, 2).map(function (x) { return x.charAt(0).toUpperCase(); }).join("") || "?";
        return (
          <button key={id} type="button" onClick={function () { setOpen(id); }} aria-label={"Open " + nm}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 13px", marginBottom: 8, borderRadius: 6, border: "1px solid " + C.goldLine, background: PANEL_BG, boxShadow: "inset 0 0 0 2px rgba(0,0,0,.4)", overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 11, alignItems: "stretch", minWidth: 0 }}>
              <div aria-hidden="true" style={{ width: 68, height: 86, flex: "0 0 68px", borderRadius: 5, overflow: "hidden", border: "1px solid " + C.goldLine, background: "radial-gradient(circle at 50% 30%,rgba(196,150,63,.16),rgba(8,9,12,.96) 72%)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {imgUrl ? <img src={imgUrl} alt="" loading="lazy" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 18%" }} /> : <span style={{ fontFamily: DISPLAY, fontSize: 21, letterSpacing: 1, color: C.gold, opacity: .78 }}>{initials}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontFamily: DISPLAY, fontSize: 17, color: C.ivory, lineHeight: 1.15, minWidth: 0, overflowWrap: "anywhere" }}>{nm}</span>
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, fontSize: 12.5, lineHeight: 1.2, color: C.gold, fontWeight: 700, flex: "0 1 48%", textAlign: "right" }}>{str(r.role)}{r.status && r.status !== "alive" ? ", " + str(r.status) : ""}<Icon n="chevr" s={10} /></span>
                </div>
                <div style={{ fontSize: 14.5, color: C.label, lineHeight: 1.38, marginTop: 5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{str(r.summary) || "You don't know each other well yet."}</div>
              </div>
            </div>
            <div style={{ marginTop: 9 }}>
              <RelBar compact label="Trust" value={r.trust} text={relBand(r.trust)} nums={nums} />
              <RelBar compact label="Affection" value={r.affection} text={relBand(r.affection)} nums={nums} />
            </div>
          </button>
        );
      }) : <Empty>You haven't met anyone who matters yet.</Empty>}
      {com.length ? <div><H m="18px 0 10px">Promises and debts</H><Frame pad="4px 14px 8px">{com.map(function (c, i) { return <Row key={i} k={str(c.who) + ": " + str(c.content)} v={str(c.status)} />; })}</Frame></div> : null}
      {open && rel[open] ? <PersonSheet api={p.api} id={open} r={obj(rel[open])} nums={nums} art={p.art} onClose={function () { setOpen(""); }} /> : null}
    </div>
  );
}
var SPIRIT_REGISTRY = [
  { n: "Sylph", attr: "Wind", holder: "Bonded, with Yuno", note: "The wind spirit those close to her call “Bell.”" },
  { n: "Salamander", attr: "Fire", holder: "Bonded, host changes with the era", note: "Tied to the Eye of the Midnight Sun's Fana early on, and later to Fuegoleon Vermillion." },
  { n: "Undine", attr: "Water", holder: "Bonded, with Queen Lolopechka", note: "An ancient covenant with the Heart royal line." },
  { n: "The earth spirit", attr: "Earth", holder: "Identity unconfirmed", note: "Canon has never named this spirit or its host." }
];
function boundInitials(name) {
  return str(name).split(/\s+/).filter(Boolean).slice(0, 2).map(function (x) { return x.charAt(0).toUpperCase(); }).join("") || "✦";
}
function BoundPortraitSheet(p) {
  var art = p.art; var imgUrl = art && art.boundImageUrl ? art.boundImageUrl(p.slotKey) : "";
  var bs = React.useState(false); var busy = bs[0], setBusy = bs[1];
  var ms = React.useState(""); var msg = ms[0], setMsg = ms[1];
  var fs = React.useState(false); var forgeOpen = fs[0], setForgeOpen = fs[1];
  function onFile(e) {
    var fl = e.target.files && e.target.files[0]; e.target.value = ""; if (!fl) return;
    setMsg("");
    readImage(fl, 640, 800, function (err, data) {
      if (err) { setMsg(err); return; }
      setBusy(true);
      art.setBoundImage(p.slotKey, data, function (ok) { setBusy(false); if (!ok) setMsg(art.mediaError || "That portrait couldn't be saved."); });
    });
  }
  function removeImage() {
    setMsg(""); setBusy(true);
    art.setBoundImage(p.slotKey, "", function (ok) { setBusy(false); if (!ok) setMsg(art.mediaError || "That portrait couldn't be removed."); });
  }
  if (forgeOpen) return <AIArtForge api={p.api} title="AI Spirit Portrait" closeLabel="Back" subject={p.name} needle={p.name} currentUrl={imgUrl} baseNote={"Solo 3:4 anime fantasy portrait of " + p.name + ", " + (p.attr || "elemental") + " spirit. " + clipArtNote(p.note, 90) + ". Face/form clear, no player, no other people."} onApply={function (u, cb) { art.setBoundImage(p.slotKey, u, cb); }} onClose={function () { setForgeOpen(false); }} />;
  return (
    <Sheet title={p.name} onClose={p.onClose}>
      {p.attr ? <div style={{ fontSize: 13.5, color: C.gold, fontWeight: 700, marginBottom: 2 }}>{p.attr}</div> : null}
      {p.subtitle ? <div style={{ fontSize: 15, color: C.label, marginBottom: 4 }}>{p.subtitle}</div> : null}
      {p.note ? <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 10, fontStyle: "italic", lineHeight: 1.45 }}>{p.note}</div> : null}
      <ImgSlot url={imgUrl} h={220} marginBottom={msg ? 6 : 8} placeholderIcon="wisp" busy={busy}
        fit="contain" pos="center center"
        boxStyle={{ height: "auto", aspectRatio: "3 / 4", maxWidth: 360, margin: "0 auto", background: "#070809" }}
        onFile={onFile}
        onRemove={imgUrl ? removeImage : null}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: msg ? 6 : 12 }}><Btn small kind="gold" disabled={busy} onClick={function () { setForgeOpen(true); }}>AI Portrait</Btn></div>
      {msg ? <div role="alert" style={{ fontSize: 13, color: "#f1c7b8", marginBottom: 12 }}>{msg}</div> : null}
      {!art.hasStore ? <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Portrait saving isn't available in this preview.</div> : null}
    </Sheet>
  );
}
function BoundCompactCard(p) {
  var imgUrl = p.art && p.art.boundImageUrl ? p.art.boundImageUrl(p.slotKey) : "";
  var initials = boundInitials(p.name);
  return (
    <button type="button" onClick={p.onOpen} aria-label={"Open " + p.name}
      style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 13px", marginBottom: 8, borderRadius: 6, border: "1px solid " + C.goldLine, background: PANEL_BG, boxShadow: "inset 0 0 0 2px rgba(0,0,0,.4)", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 11, alignItems: "stretch", minWidth: 0 }}>
        <div aria-hidden="true" style={{ width: 68, height: 86, flex: "0 0 68px", borderRadius: 5, overflow: "hidden", border: "1px solid " + C.goldLine, background: "radial-gradient(circle at 50% 30%,rgba(196,150,63,.16),rgba(8,9,12,.96) 72%)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {imgUrl ? <img src={imgUrl} alt="" loading="lazy" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 18%" }} /> : <span style={{ fontFamily: DISPLAY, fontSize: 20, letterSpacing: 1, color: C.gold, opacity: .78 }}>{initials}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontFamily: DISPLAY, fontSize: 17, color: C.ivory, lineHeight: 1.15, minWidth: 0, overflowWrap: "anywhere" }}>{p.name}</span>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, fontSize: 12.5, lineHeight: 1.2, color: C.gold, fontWeight: 700, flexShrink: 0 }}>{p.attr || p.kind || "Bound"}<Icon n="chevr" s={10} /></span>
          </div>
          {p.subtitle ? <div style={{ fontSize: 14.5, color: C.label, lineHeight: 1.35, marginTop: 4 }}>{p.subtitle}</div> : null}
          {p.note ? <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.35, marginTop: 3, fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.note}</div> : null}
        </div>
      </div>
    </button>
  );
}
function BoundView(p) {
  var v = p.api.variables || {}; var g = obj(v.grimoire); var art = p.art;
  var sBond = g.spirit_link ? str(g.spirit_link) : ""; var dBond = g.devil_link ? str(g.devil_link) : "";
  var os = React.useState(""); var open = os[0], setOpen = os[1];
  var selected = null;
  if (open === "spirit" && sBond) selected = { slotKey: "spirit", name: sBond, attr: "Your spirit bond", subtitle: "Bound to you", note: "Your current spirit bond." };
  else if (open === "devil" && dBond) selected = { slotKey: "devil", name: dBond, attr: "Your devil bond", subtitle: "Pact or bond", note: "Your current devil bond." };
  else if (open.indexOf("spirit-") === 0) {
    SPIRIT_REGISTRY.forEach(function (r) { var k = "spirit-" + r.n.toLowerCase().replace(/[^a-z0-9]+/g, "-"); if (k === open) selected = { slotKey: k, name: r.n, attr: r.attr, subtitle: r.holder, note: r.note }; });
  }
  return (
    <div style={{ position: "relative" }}>
      <Eyebrow k={"MYSTIC PACTS · SPIRITS AND DEVILS"}>Power shared is never power without consequence.</Eyebrow>
      <H>Spiritual connections</H>
      {sBond ? <BoundCompactCard art={art} slotKey="spirit" name={sBond} kind="Spirit" subtitle="Your spirit bond" note="A living bond carried in your grimoire state." onOpen={function () { setOpen("spirit"); }} /> : <Frame pad="4px 14px 8px" style={{ marginBottom: 8 }}><Row k="Your spirit bond" v="No spirit bound" /></Frame>}
      {dBond ? <BoundCompactCard art={art} slotKey="devil" name={dBond} kind="Devil" subtitle="Your devil bond" note="A pact or bond carried in your grimoire state." onOpen={function () { setOpen("devil"); }} /> : <Frame pad="4px 14px 8px" style={{ marginBottom: 16 }}><Row k="Your devil bond" v="No devil pact" /></Frame>}
      <H m="18px 0 10px">The great spirits</H>
      {SPIRIT_REGISTRY.map(function (r) {
        var slotKey = "spirit-" + r.n.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return <BoundCompactCard key={r.n} art={art} slotKey={slotKey} name={r.n} attr={r.attr} subtitle={r.holder} note={r.note} onOpen={function () { setOpen(slotKey); }} />;
      })}
      <p style={{ fontSize: 13.5, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>Lore reference, not your own state. Spirit bonds and devil pacts only ever come from real, extraordinary circumstance in play.</p>
      {selected ? <BoundPortraitSheet api={p.api} art={art} slotKey={selected.slotKey} name={selected.name} attr={selected.attr} subtitle={selected.subtitle} note={selected.note} onClose={function () { setOpen(""); }} /> : null}
    </div>
  );
}
function NoticesView(p) {
  var v = p.api.variables || {};
  var ups = arr(v.known_events).filter(function (e) { return e && (!e.status || e.status === "known"); });
  var com = arr(v.commitments).filter(function (c) { return c && (!c.status || /active|open|pending|due/i.test(str(c.status))); });
  var conds = arr(v.conditions); var recent = arr(v.chronicle).slice(-3).reverse();
  function block(t, list) { return list.length ? <div style={{ marginBottom: 16 }}><H>{t}</H><Frame pad="4px 14px 8px">{list}</Frame></div> : null; }
  return (
    <div>
      {!ups.length && !com.length && !conds.length && !recent.length ? <Empty>Nothing needs your attention.</Empty> : null}
      {block("Coming up", ups.map(function (e, i) { return <Row key={e.id || i} k={str(e.title)} v={[str(e.when), str(e.where)].filter(Boolean).join(", ")} />; }))}
      {block("Promises and debts", com.map(function (c, i) { return <Row key={i} k={str(c.who) + ": " + str(c.content)} v={str(c.due) || str(c.status)} />; }))}
      {block("Your condition", conds.map(function (c, i) { return <Row key={c.id || i} k={str(c.type) || str(c.kind)} v={str(c.severity)} />; }))}
      {block("Recently", recent.map(function (c, i) { return <Row key={i} k={str(c.title)} v={str(c.date)} />; }))}
    </div>
  );
}
var DURS = ["3 hours", "1 day", "3 days", "1 week", "2 weeks", "1 month", "3 months"];
var FOCI = ["Mana capacity", "Mana control", "Mana output", "Mana sensing", "Physical conditioning", "Combat", "A spell", "Spell shaping", "A technique", "Study", "Custom"];
function TrainingPanel(p) {
  var api = p.api; var v = api.variables || {}; var busy = !!api.isStreaming; var job = obj(v.training_job); var init = p.preset || {};
  var fs = React.useState({ dur: "1 week", durCustom: "", intensity: "Moderate", focus: init.focus || "Mana control", target: init.target || "", secondary: [], trainer: "Alone", trainerName: "", loc: "", interrupt: "Balanced" });
  var f = fs[0], setF = fs[1];
  function set(k, x) { var n = Object.assign({}, f); n[k] = x; setF(n); }
  function toggleSec(x) { var s = f.secondary.slice(); var i = s.indexOf(x); if (i >= 0) s.splice(i, 1); else if (s.length < 2) s.push(x); set("secondary", s); }
  var spells = arr(v.spells); var concepts = arr(v.spell_concepts);
  function begin() {
    var durTxt = f.dur === "Custom" ? f.durCustom : f.dur;
    var hidden = "[UI:TRAIN] duration=" + durTxt + "; intensity=" + f.intensity + "; focus=" + f.focus + (f.target ? " (" + f.target + ")" : "") +
      "; secondary=" + (f.secondary.join(", ") || "none") + "; trainer=" + f.trainer + (f.trainerName ? " (" + f.trainerName + ")" : "") + "; location=" + (f.loc || str(v.current_location) || "here") + "; interruptions=" + f.interrupt +
      ". Resolve this training scene as usual \u2014 narrate what happens and any interruption. Among your own directives, set last_train_report to exactly \"hours=<number>;interrupted=<true or false>\", reporting the ACTUAL active training time this reply covers (not the full requested duration if it didn't all happen) \u2014 e.g. [last_train_report: set \"hours=5.5;interrupted=false\"]. The interface uses that one value for stamina, mana, fatigue and time bookkeeping, so it must be accurate; do not write directives for stamina, mana, fatigue, world_time, world_date or elapsed_days yourself for this training \u2014 the interface owns those now. Still write your own directives for anything else that changed (progression, spell_concepts, techniques, injuries, relationships, events) as usual.";
    var visible = "I begin training" + (f.trainer !== "Alone" ? " with " + (f.trainerName || f.trainer.toLowerCase()) : "") + ", focusing on " + f.focus.toLowerCase() + ".";
    if (api.storage) api.storage.set("bc_pending_train", JSON.stringify({ intensity: f.intensity, focus: f.focus }));
    tellGM(api, hidden, visible);
    p.toStory();
  }
  return (
    <div>
      {job.active === true ? <Frame pad="12px 14px" style={{ marginBottom: 14 }}><span style={{ color: C.label }}>{"In progress: " + str(job.focus || job.kind) + (job.end ? ", until " + str(job.end) : "")}</span></Frame> : null}
      <Frame pad="14px">
        <Field label="How long"><Seg label="Duration" value={f.dur} options={DURS.concat(["Custom"])} onChange={function (x) { set("dur", x); }} />
          {f.dur === "Custom" ? <input className="bc-in" style={{ marginTop: 8 }} aria-label="Custom duration" placeholder="For example: every evening until the exam" value={f.durCustom} onChange={function (e) { set("durCustom", e.target.value); }} /> : null}</Field>
        <Field label="Intensity" hint="Harder training grows faster, and breaks people faster."><Seg label="Intensity" value={f.intensity} options={["Light", "Moderate", "Hard", "Extreme"]} onChange={function (x) { set("intensity", x); }} /></Field>
        <Field label="Main focus"><Seg label="Focus" value={f.focus} options={FOCI} onChange={function (x) { setF(Object.assign({}, f, { focus: x, target: "" })); }} /></Field>
        {f.focus === "A spell" ? <Field label="Which spell">{spells.length ? <Seg label="Spell" value={f.target} options={spells.map(function (s) { return str(s.name); })} onChange={function (x) { set("target", x); }} /> : <Empty>No spells yet.</Empty>}</Field> : null}
        {f.focus === "Spell shaping" ? <Field label="Which idea">{concepts.length ? <Seg label="Concept" value={f.target} options={concepts.map(function (c) { return str(c.name); })} onChange={function (x) { set("target", x); }} /> : null}
          <input className="bc-in" style={{ marginTop: 8 }} aria-label="Idea" placeholder="Or describe a new idea" value={f.target} onChange={function (e) { set("target", e.target.value); }} /></Field> : null}
        {f.focus === "A technique" || f.focus === "Study" || f.focus === "Custom" ? <Field label="Details"><input className="bc-in" aria-label="Focus details" value={f.target} onChange={function (e) { set("target", e.target.value); }} /></Field> : null}
        <Field label="Also work on" hint="Up to two. Each extra focus slows the main one.">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{FOCI.slice(0, 6).filter(function (x) { return x !== f.focus; }).map(function (x) { var on = f.secondary.indexOf(x) >= 0; return <Btn key={x} small active={on} onClick={function () { toggleSec(x); }}>{x}</Btn>; })}</div>
        </Field>
        <Field label="With whom"><Seg label="Trainer" value={f.trainer} options={["Alone", "With a companion", "With a teacher", "With my squad"]} onChange={function (x) { set("trainer", x); }} />
          {f.trainer !== "Alone" ? <input className="bc-in" style={{ marginTop: 8 }} aria-label="Trainer name" placeholder="Who" value={f.trainerName} onChange={function (e) { set("trainerName", e.target.value); }} /> : null}</Field>
        <Field label="Where"><input className="bc-in" aria-label="Location" placeholder={str(v.current_location) || "Here"} value={f.loc} onChange={function (e) { set("loc", e.target.value); }} /></Field>
        <Field label="Stop me for"><Seg label="Interruptions" value={f.interrupt} options={["Cinematic", "Balanced", "Simulationist", "Do not interrupt"]} onChange={function (x) { set("interrupt", x); }} /></Field>
        <Ribbon label="Begin training" disabled={busy || (f.dur === "Custom" && !f.durCustom.trim())} onClick={begin}>Begin Training</Ribbon>
      </Frame>
    </div>
  );
}
function TimeView(p) {
  var api = p.api; var busy = !!api.isStreaming;
  var as = React.useState("Balanced"); var adv = as[0], setAdv = as[1];
  function go(d, r) { send(api, "[UI:ADVANCE] duration=" + d + "; interruptions=" + adv + "; routine=" + (r ? "yes" : "no")); p.toStory(); }
  return (
    <Frame pad="14px">
      <p style={{ fontSize: 16, color: C.label, lineHeight: 1.5, marginTop: 0 }}>Time keeps moving for everyone. The world stops the clock when something needs you.</p>
      <Field label="Stop me for"><Seg label="Interruptions" value={adv} options={["Cinematic", "Balanced", "Simulationist", "Do not interrupt"]} onChange={setAdv} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {["1 hour", "The rest of the day", "Until tomorrow", "3 days", "1 week", "2 weeks", "1 month"].map(function (d) { return <Btn key={d} disabled={busy} onClick={function () { go(d, false); }}>{d}</Btn>; })}
      </div>
      <Ribbon label="Live my routine for a week" disabled={busy} onClick={function () { go("1 week", true); }}>Live My Routine</Ribbon>
    </Frame>
  );
}
function RoutineView(p) {
  var api = p.api; var v = api.variables || {};
  var rs = React.useState(null); var rt = rs[0], setRt = rs[1];
  var ns = React.useState(""); var note = ns[0], setNote = ns[1];
  var cur = rt || Object.assign({ morning: "", day: "", evening: "", night: "", weekly: "", auto_meals: true, auto_shopping: false, auto_rent: true, auto_work: true }, obj(v.routine));
  function setR(k, x) { var n = Object.assign({}, cur); n[k] = x; setRt(n); }
  return (
    <Frame pad="14px">
      {[["morning", "Mornings"], ["day", "Days"], ["evening", "Evenings"], ["night", "Nights"], ["weekly", "Each week"]].map(function (x) { return <Field key={x[0]} label={x[1]}><input className="bc-in" aria-label={x[1]} value={str(cur[x[0]])} onChange={function (e) { setR(x[0], e.target.value); }} /></Field>; })}
      {[["auto_meals", "Eat meals automatically"], ["auto_shopping", "Buy basic supplies automatically"], ["auto_rent", "Pay rent and bills automatically"], ["auto_work", "Go to work automatically"]].map(function (x) { return <Field key={x[0]} label={x[1]}><Seg label={x[1]} value={cur[x[0]] ? "On" : "Off"} options={["On", "Off"]} onChange={function (y) { setR(x[0], y === "On"); }} /></Field>; })}
      {note ? <div role="status" style={{ color: C.goldHi, fontSize: 15, marginBottom: 8 }}>{note}</div> : null}
      <Btn kind="gold" block disabled={!canWrite(api)} onClick={function () { api.setVariable("routine", cur); setRt(null); setNote("Routine saved."); }}>Save routine</Btn>
    </Frame>
  );
}
function CodexView(p) {
  var api = p.api; var v = api.variables || {}; var busy = !!api.isStreaming;
  var ls = React.useState(""); var lore = ls[0], setLore = ls[1];
  var cx = arr(v.codex); var cats = {};
  cx.forEach(function (c) { var k = str(c.category) || "other"; (cats[k] = cats[k] || []).push(c); });
  return (
    <div>
      {cx.length ? Object.keys(cats).map(function (k) {
        return <div key={k} style={{ marginBottom: 12 }}><Lbl m="8px 0 6px">{k}</Lbl><Frame pad="4px 14px 8px">{cats[k].map(function (c, i) { return <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid " + C.lineSoft }}><div style={{ fontWeight: 700, fontSize: 16, color: C.ivory }}>{str(c.topic)}</div><div style={{ fontSize: 15, color: C.muted, lineHeight: 1.45 }}>{str(c.text)}</div></div>; })}</Frame></div>;
      }) : <Empty>Your character's knowledge will collect here as they learn.</Empty>}
      <H m="20px 0 8px">Ask as the player</H>
      <p style={{ fontSize: 15, color: C.muted, margin: "0 0 8px" }}>Out-of-character lore questions. Answers respect your spoiler setting and don't become your character's knowledge.</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="bc-in" aria-label="Lore question" placeholder="For example: what are the Magic Knight ranks?" value={lore} onChange={function (e) { setLore(e.target.value); }} />
        <Btn kind="gold" disabled={busy || !lore.trim()} onClick={function () { send(api, "(OOC lore reference) " + lore.trim()); setLore(""); p.toStory(); }}>Ask</Btn>
      </div>
    </div>
  );
}
function HouseholdView(p) {
  var v = p.api.variables || {}; var hh = obj(v.household); var props = arr(v.property);
  return (
    <div>
      <Frame pad="6px 14px 10px" style={{ marginBottom: 16 }}><Row k="Home" v={str(v.home_location)} /><Row k="Household means" v={str(hh.wealth) || "Unknown"} /></Frame>
      <H>Household</H>
      {arr(hh.members).length ? <Frame pad="4px 14px 8px">{arr(hh.members).map(function (m, i) { return <Row key={i} k={str(m.name)} v={[str(m.relation), m.age ? str(m.age) : "", str(m.occupation)].filter(Boolean).join(", ")} />; })}</Frame> : <Empty>No one lives with you.</Empty>}
      <H m="20px 0 10px">Places you can use</H>
      {props.length ? <Frame pad="4px 14px 8px">{props.map(function (x, i) { return <Row key={x.id || i} k={str(x.name)} v={[str(x.status), x.rent ? "rent " + str(x.rent) : ""].filter(Boolean).join(", ")} />; })}</Frame> : <Empty>Nothing beyond where you sleep.</Empty>}
    </div>
  );
}
var ART_SLOTS = [["banner", "Banner", "Wide painting behind the title, about 3 to 1"], ["grimoire_cover", "Grimoire cover", "Your grimoire's cover, portrait orientation about 3 to 4"]].concat(TILES.map(function (t) { return [t.k, t.t + " tile", "Background for the " + t.t + " tile, about 3 to 1"]; }));
function ArtView(p) {
  var api = p.api; var art = p.art;
  var rs = React.useState({}); var refs = rs[0], setRefs = rs[1];
  var ms = React.useState(""); var msg = ms[0], setMsg = ms[1];
  var bs = React.useState(""); var busyKey = bs[0], setBusyKey = bs[1]; // "" | "portrait" | slot key
  function onPortraitFile(e) {
    var fl = e.target.files && e.target.files[0]; e.target.value = ""; if (!fl) return;
    readImage(fl, 600, 800, function (err, data) {
      if (err) { setMsg(err); return; }
      setMsg(""); setBusyKey("portrait");
      art.setPortrait(data, function (ok) { setBusyKey(""); if (!ok) setMsg(art.mediaError || "Upload failed \u2014 try again."); });
    });
  }
  return (
    <div>
      <p style={{ fontSize: 15.5, color: C.label, lineHeight: 1.5, marginTop: 0 }}>Replace any drawn scene with your own painting. Upload an image, or paste an asset reference (@asset:...) or image link.</p>
      {!art.hasStore ? <p style={{ fontSize: 14.5, color: C.muted }}>This preview can't save art between sessions.</p> : null}
      {msg ? <div role="alert" style={{ color: "#f1c7b8", fontSize: 14.5, marginBottom: 8 }}>{msg}</div> : null}
      <Frame pad="10px" style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 40, height: 52, position: "relative", overflow: "hidden", borderRadius: 4, border: "1px solid " + C.line, flexShrink: 0, background: C.well }}>
            {art.portrait ? <img src={art.portrait} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon n="bust" s={22} fill="#a39c8f" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 16, color: C.ivory, fontWeight: 700 }}>Portrait</div><div style={{ fontSize: 13.5, color: C.muted }}>{art.portrait ? "Your art" : "Shown on your character card"}</div></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "7px 12px", borderRadius: 6, border: "1px solid " + C.gold, color: C.goldHi, fontWeight: 700, cursor: busyKey === "portrait" ? "default" : "pointer", opacity: busyKey === "portrait" ? .6 : 1, fontSize: 14.5 }}>
            {busyKey === "portrait" ? "Uploading\u2026" : "Upload"}<input type="file" accept="image/*" disabled={busyKey === "portrait"} style={{ display: "none" }} onChange={onPortraitFile} />
          </label>
          {art.portrait ? <Btn small disabled={busyKey === "portrait"} onClick={function () { setBusyKey("portrait"); art.setPortrait("", function () { setBusyKey(""); }); }}>Clear</Btn> : null}
        </div>
      </Frame>
      {ART_SLOTS.map(function (s) {
        var url = artFor(api, art.art, s[0]); var k = s[0]; var slotBusy = busyKey === k;
        return (
          <Frame key={k} pad="10px" style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 104, height: 40, position: "relative", overflow: "hidden", borderRadius: 4, border: "1px solid " + C.line, flexShrink: 0, background: C.well }}>{url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (k === "banner" ? <SceneCastle /> : (k === "grimoire_cover" ? <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="clover" s={20} fill="#8a6a2e" /></div> : <TileScene k={k} />))}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 16, color: C.ivory, fontWeight: 700 }}>{s[1]}</div><div style={{ fontSize: 13.5, color: C.muted }}>{url ? "Your art" : s[2]}</div></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "7px 12px", borderRadius: 6, border: "1px solid " + C.gold, color: C.goldHi, fontWeight: 700, cursor: slotBusy ? "default" : "pointer", opacity: slotBusy ? .6 : 1, fontSize: 14.5 }}>
                {slotBusy ? "Uploading\u2026" : "Upload"}<input type="file" accept="image/*" disabled={slotBusy} style={{ display: "none" }} onChange={function (e) {
                  var fl = e.target.files && e.target.files[0]; e.target.value = ""; if (!fl) return;
                  readImage(fl, 1400, 700, function (err, data) {
                    if (err) { setMsg(err); return; }
                    setMsg(""); setBusyKey(k);
                    art.setArt(k, data, function (ok) { setBusyKey(""); if (!ok) setMsg(art.mediaError || "Upload failed \u2014 try again."); });
                  });
                }} />
              </label>
              <input className="bc-in" style={{ flex: 1, minWidth: 140, minHeight: 44, fontSize: 15 }} aria-label={s[1] + " reference"} placeholder="@asset:... or link" value={refs[k] || ""} onChange={function (e) { var n = Object.assign({}, refs); n[k] = e.target.value; setRefs(n); }} />
              <Btn small disabled={!(refs[k] || "").trim()} onClick={function () { art.setArt(k, (refs[k] || "").trim()); }}>Use</Btn>
              {url ? <Btn small disabled={slotBusy} onClick={function () { art.setArt(k, ""); }}>Clear</Btn> : null}
            </div>
          </Frame>
        );
      })}
    </div>
  );
}
function SettingsView(p) {
  var api = p.api; var v = api.variables || {}; var busy = !!api.isStreaming;
  var ss = React.useState(null); var sset = ss[0], setSset = ss[1];
  var ns = React.useState(""); var note = ns[0], setNote = ns[1];
  var cs = sset || Object.assign({}, obj(v.sim_settings));
  function setS(k, x) { var n = Object.assign({}, cs); n[k] = x; setSset(n); }
  return (
    <div>
      <Frame pad="14px" style={{ marginBottom: 14 }}>
        <Field label="Canon guidance"><Seg label="Canon guidance" value={cs.canon_guidance} options={["Strong", "Balanced", "Light", "Off"]} onChange={function (x) { setS("canon_guidance", x); }} /></Field>
        <Field label="Canon participation"><Seg label="Canon participation" value={cs.canon_participation} options={["Organic", "Opportunity-Favored"]} onChange={function (x) { setS("canon_participation", x); }} /></Field>
        <Field label="Interruptions"><Seg label="Interruptions" value={cs.interruptions} options={["Cinematic", "Balanced", "Simulationist"]} onChange={function (x) { setS("interruptions", x); }} /></Field>
        <Field label="Narration length"><Seg label="Narration length" value={cs.narrative_density} options={["Concise", "Balanced", "Detailed", "Cinematic"]} onChange={function (x) { setS("narrative_density", x); }} /></Field>
        <Field label="Spoilers"><Seg label="Spoilers" value={cs.spoiler_level} options={["Anime-safe", "Manga-safe", "Full canon"]} onChange={function (x) { setS("spoiler_level", x); }} /></Field>
        <Field label="Show engine numbers" hint="Out of character. Shows hidden values beside the descriptions."><Seg label="Show numbers" value={cs.show_numbers === true ? "On" : "Off"} options={["On", "Off"]} onChange={function (x) { setS("show_numbers", x === "On"); }} /></Field>
        {note ? <div role="status" style={{ color: C.goldHi, fontSize: 15, marginBottom: 8 }}>{note}</div> : null}
        <Btn kind="gold" block disabled={!canWrite(api)} onClick={function () { api.setVariable("sim_settings", cs); setSset(null); setNote("Settings saved."); }}>Save settings</Btn>
      </Frame>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn disabled={busy} onClick={function () { send(api, "[sync]"); p.toStory(); }}>Check state</Btn>
        <Btn disabled={busy} onClick={function () { send(api, "[status]"); p.toStory(); }}>Status report</Btn>
      </div>
    </div>
  );
}
function HelpView() {
  return (
    <Frame pad="14px 16px">
      <div style={{ fontSize: 16.5, lineHeight: 1.6, color: C.label }}>
        <p style={{ marginTop: 0 }}>Type anything into the box above the menu, on any screen. Buttons are shortcuts for the same thing and never limit what you can do.</p>
        <p><strong style={{ color: C.goldHi }}>[sync]</strong> asks the GM to reconcile the story with the saved state. <strong style={{ color: C.goldHi }}>[status]</strong> gives a short out-of-character summary. Start a message with <strong style={{ color: C.goldHi }}>(OOC</strong> to talk to the GM directly.</p>
        <p>Canon is the world's history, not your script. Asta, Yuno and everyone else live their own lives; you can meet them, ignore them, or never hear of them.</p>
        <p style={{ color: C.muted, marginBottom: 0 }}>Rewinds and branches use Yumina's own session tools.</p>
      </div>
    </Frame>
  );
}


/* ---------- shell ---------- */




/* Safe once-only client payroll bridge. It sees authoritative state from the UI/game engine.
   No AI calls, no chat messages, no changes on navigation/re-renders. */
function useMKPayroll(api) {
  var v=(api&&api.variables)||{};
  var sig=JSON.stringify([v.world_date,v.mk_status,v.mk_payroll,v.bank_account,v.character_created]);
  var inFlight=React.useRef(false), attempted=React.useRef('');
  React.useEffect(function(){
    if(!isTrue(v.character_created)||!canWrite(api)||inFlight.current||attempted.current===sig)return;
    attempted.current=sig;
    var transition=bcMKPayrollStep(v);
    if(!transition)return;
    inFlight.current=true;
    try {
      var patch={bank_account:transition.bank_account,mk_payroll:transition.mk_payroll};
      var req;
      if(typeof api.patchVariables==='function')req=api.patchVariables(patch);
      else {api.setVariable('mk_payroll',patch.mk_payroll);api.setVariable('bank_account',patch.bank_account);}
      if(req&&typeof req.then==='function')req.then(function(){inFlight.current=false;},function(){inFlight.current=false;attempted.current='';});
      else inFlight.current=false;
    }catch(err){inFlight.current=false;attempted.current='';}
  },[sig,!!(api&&api.isStreaming)]);
}

function useArt(api) {
  // Yumina's supported persistent Custom UI storage is api.storage.
  // Portraits/art are compressed to JPEG data URLs before they reach this layer,
  // then saved outside game variables so image data never enters the GM context.
  var st = getStore(api);
  var hasStore = !!(st && typeof st.get === "function" && typeof st.set === "function" && typeof st.remove === "function");
  var ms = React.useState({}); var mediaMap = ms[0], setMediaMap = ms[1]; // entryId -> data URL
  var rs = React.useState({}); var refArt = rs[0], setRefArt = rs[1]; // slot key -> typed ref/link
  var es = React.useState(""); var mediaErr = es[0], setMediaErr = es[1];
  var gs = React.useState({}); var grimoireDesign = gs[0], setGrimoireDesignLocal = gs[1];

  function storageMediaKey(entryId) { return "bc_media_" + entryId; }
  function putLocal(entryId, val) {
    setMediaMap(function (o) { var n = Object.assign({}, o); if (val) n[entryId] = val; else delete n[entryId]; return n; });
  }

  var relObj = obj(api && api.variables ? api.variables.relationships : null);
  var spellArr = arr(api && api.variables ? api.variables.spells : null);
  var personIds = [];
  Object.keys(relObj).forEach(function (id) {
    personIds.push(personMediaId(id));
    var bare = bareRelationshipId(id);
    if (bare && id !== bare) personIds.push(personMediaId(bare));
    if (bare && id === bare) personIds.push(personMediaId("npc-" + bare));
    var canon = canonIdFor(id, obj(relObj[id]));
    if (canon) { personIds.push(personMediaId(canon)); personIds.push(personMediaId("npc-" + canon)); }
  });
  var dynamicIds = personIds.concat(spellArr.map(function (s, i) { return spellMediaId(str(s && s.id) || ("idx-" + i)); }));
  var dynamicSig = dynamicIds.slice().sort().join("|");

  React.useEffect(function () {
    if (!hasStore) return;
    var cancelled = false;
    var ids = [PORTRAIT_MEDIA_ID, artMediaId("banner"), artMediaId("grimoire_cover")]
      .concat(BOUND_STATIC_KEYS.map(function (k) { return boundMediaId(k); }))
      .concat(TILE_KEYS.map(function (k) { return artMediaId(k); }))
      .concat(dynamicIds);
    var seen = {};
    ids.forEach(function (entryId) {
      if (!entryId || seen[entryId]) return; seen[entryId] = true;
      try {
        var pr = st.get(storageMediaKey(entryId));
        if (pr && pr.then) pr.then(function (val) { if (!cancelled && val) putLocal(entryId, val); }, function () {});
      } catch (e) {}
    });
    return function () { cancelled = true; };
  }, [hasStore, dynamicSig]);

  React.useEffect(function () {
    if (!hasStore) return;
    ["banner", "grimoire_cover"].concat(TILE_KEYS).forEach(function (k) {
      try {
        var pr = st.get("bc_art_ref_" + k);
        if (pr && pr.then) pr.then(function (val) { if (val) setRefArt(function (o) { var n = Object.assign({}, o); n[k] = val; return n; }); }, function () {});
      } catch (e) {}
    });
  }, [hasStore]);

  React.useEffect(function () {
    if (!hasStore) return;
    try {
      var pr = st.get("bc_grimoire_design");
      if (pr && pr.then) pr.then(function (val) { try { if (val) setGrimoireDesignLocal(JSON.parse(val)); } catch (e) {} }, function () {});
    } catch (e) {}
  }, [hasStore]);

  function setGrimoireDesign(val, cb) {
    var clean = obj(val); setGrimoireDesignLocal(clean);
    if (!hasStore) { cb && cb(false); return; }
    try {
      var pr = st.set("bc_grimoire_design", JSON.stringify(clean));
      if (pr && pr.then) pr.then(function () { cb && cb(true); }, function () { cb && cb(false); });
      else cb && cb(true);
    } catch (e) { cb && cb(false); }
  }

  function mediaUrl(entryId) { return mediaMap[entryId] || ""; }

  function uploadMedia(entryId, dataUrl, title, cb) {
    if (!hasStore) { setMediaErr("Persistent portrait storage isn't available in this preview."); cb && cb(false); return; }
    if (!dataUrl || typeof dataUrl !== "string" || dataUrl.indexOf("data:image/") !== 0) { setMediaErr("That image couldn't be processed here."); cb && cb(false); return; }
    try {
      var pr = st.set(storageMediaKey(entryId), dataUrl);
      if (pr && pr.then) {
        pr.then(function () { putLocal(entryId, dataUrl); setMediaErr(""); cb && cb(true); }, function () { setMediaErr("Portrait save failed — try again."); cb && cb(false); });
      } else { putLocal(entryId, dataUrl); setMediaErr(""); cb && cb(true); }
    } catch (e) { setMediaErr("Portrait save failed — try again."); cb && cb(false); }
  }

  function saveMedia(entryId, value, title, cb) {
    if (typeof value === "string" && value.indexOf("data:image/") === 0) { uploadMedia(entryId, value, title, cb); return; }
    if (!hasStore) { setMediaErr("Persistent portrait storage isn't available in this preview."); cb && cb(false); return; }
    if (!value || typeof value !== "string" || !(/^\/cdn\/key\/[A-Za-z0-9_-]+/.test(value) || /^https?:\/\//i.test(value) || value.indexOf("@asset:") === 0)) { setMediaErr("That generated image reference couldn't be saved."); cb && cb(false); return; }
    try {
      var pr = st.set(storageMediaKey(entryId), value);
      if (pr && pr.then) pr.then(function () { putLocal(entryId, value); setMediaErr(""); cb && cb(true); }, function () { setMediaErr("Portrait save failed — try again."); cb && cb(false); });
      else { putLocal(entryId, value); setMediaErr(""); cb && cb(true); }
    } catch (e) { setMediaErr("Portrait save failed — try again."); cb && cb(false); }
  }

  function removeMedia(entryId, cb) {
    if (!hasStore) { putLocal(entryId, ""); cb && cb(false); return; }
    try {
      var pr = st.remove(storageMediaKey(entryId));
      if (pr && pr.then) pr.then(function () { putLocal(entryId, ""); setMediaErr(""); cb && cb(true); }, function () { setMediaErr("Couldn't remove that image."); cb && cb(false); });
      else { putLocal(entryId, ""); setMediaErr(""); cb && cb(true); }
    } catch (e) { setMediaErr("Couldn't remove that image."); cb && cb(false); }
  }

  function setPortrait(val, cb) {
    if (!val) { removeMedia(PORTRAIT_MEDIA_ID, cb); return; }
    saveMedia(PORTRAIT_MEDIA_ID, val, "Character portrait", cb);
  }

  function setArt(k, val, cb) {
    if (!val) {
      removeMedia(artMediaId(k), function () {});
      setRefArt(function (o) { var n = Object.assign({}, o); delete n[k]; return n; });
      if (hasStore) { try { quiet(st.remove("bc_art_ref_" + k)); } catch (e) {} }
      cb && cb(true); return;
    }
    if (typeof val === "string" && val.indexOf("data:") === 0) {
      uploadMedia(artMediaId(k), val, k, cb);
      setRefArt(function (o) { var n = Object.assign({}, o); delete n[k]; return n; });
      if (hasStore) { try { quiet(st.remove("bc_art_ref_" + k)); } catch (e) {} }
    } else {
      removeMedia(artMediaId(k), function () {});
      setRefArt(function (o) { var n = Object.assign({}, o); n[k] = val; return n; });
      if (hasStore) { try { quiet(st.set("bc_art_ref_" + k, val)); } catch (e) {} }
      cb && cb(true);
    }
  }

  var artOut = {};
  TILE_KEYS.concat(["banner", "grimoire_cover"]).forEach(function (k) { artOut[k] = mediaUrl(artMediaId(k)) || refArt[k] || ""; });

  function spellImageUrl(id) { return id ? mediaUrl(spellMediaId(id)) : ""; }
  function setSpellImage(id, val, cb) {
    if (!id) { cb && cb(false); return; }
    if (!val) { removeMedia(spellMediaId(id), cb); return; }
    saveMedia(spellMediaId(id), val, "Spell image", cb);
  }

  function personImageUrl(id) {
    if (!id) return "";
    var r = obj(relObj[id]); var bare = bareRelationshipId(id); var canon = canonIdFor(id, r);
    var candidates = [id];
    if (canon) candidates.push(canon, "npc-" + canon);
    if (bare) candidates.push(bare, "npc-" + bare);
    var seen = {};
    for (var i = 0; i < candidates.length; i++) { var c = candidates[i]; if (!c || seen[c]) continue; seen[c] = true; var u = mediaUrl(personMediaId(c)); if (u) return u; }
    return "";
  }
  function setPersonImage(id, val, cb) {
    if (!id) { cb && cb(false); return; }
    var r = obj(relObj[id]); var target = canonIdFor(id, r) || id;
    if (!val) {
      var keys = [target, id, bareRelationshipId(id), "npc-" + bareRelationshipId(id)]; var left = keys.filter(Boolean); var done = 0;
      if (!left.length) { cb && cb(true); return; }
      left.forEach(function (k) { removeMedia(personMediaId(k), function () { done++; if (done === left.length) cb && cb(true); }); });
      return;
    }
    saveMedia(personMediaId(target), val, "Bond portrait", cb);
  }

  function boundImageUrl(k) { return k ? mediaUrl(boundMediaId(k)) : ""; }
  function setBoundImage(k, val, cb) {
    if (!k) { cb && cb(false); return; }
    if (!val) { removeMedia(boundMediaId(k), cb); return; }
    saveMedia(boundMediaId(k), val, "Bound image", cb);
  }

  return { art: artOut, portrait: mediaUrl(PORTRAIT_MEDIA_ID), setArt: setArt, setPortrait: setPortrait, hasStore: hasStore, mediaError: mediaErr, spellImageUrl: spellImageUrl, setSpellImage: setSpellImage, personImageUrl: personImageUrl, setPersonImage: setPersonImage, boundImageUrl: boundImageUrl, setBoundImage: setBoundImage, grimoireDesign: grimoireDesign, setGrimoireDesign: setGrimoireDesign };
}
var CONCEPT_WORD = { IDEA: "Early", EXPERIMENTAL: "Early", UNSTABLE: "Developing", REPEATABLE: "Stable", REFINED: "Refined", GRIMOIRE_CANDIDATE: "Resonant", MANIFESTED: "Manifested" };
var SPELL_CATS = [["all", "All", "dots"], ["offense", "Offense", "sword"], ["defense", "Defense", "shield"], ["support", "Support", "plus"], ["utility", "Utility", "star"]];
function spellCat(s) {
  var t = (str(s.category) + " " + str(s.type) + " " + str(s.intent) + " " + str(obj(s.mechanics).form) + " " + str(s.name) + " " + str(s.behavior)).toLowerCase();
  if (/defen|shield|barrier|wall|guard|ward|protect|armor|armour/.test(t)) return "defense";
  if (/heal|support|boost|bless|restor|enhanc|ally|allies|mend/.test(t)) return "support";
  if (/attack|offen|cut|blade|edge|strike|bolt|blast|slash|spear|arrow|burst|storm|lance|bullet|fang|claw|crush|explo/.test(t)) return "offense";
  return "utility";
}
var ATTR_ICON = { fire: "flame", water: "drop", wind: "wisp", earth: "mountain", lightning: "bolt", plant: "leaf", ice: "snow", sand: "mountain", smoke: "cloud", stone: "gem", steel: "sword", sound: "wave", cotton: "cloud", thread: "link", mirror: "ring", poison: "skull", ash: "flame", spatial: "star", light: "sun", dark: "moon", time: "hourglass" };
function attrIcon(a) { var k = str(a).toLowerCase().replace(/\(.*\)/, "").trim().split(/\s+/)[0]; return ATTR_ICON[k] || "star"; }
var ATTR_NATURE = {
  fire: "Hungry, fierce and warm. It answers passion and punishes carelessness.", water: "Patient and adaptable. It takes the shape of whatever holds it.",
  wind: "A light and ever-changing flow. Free, wild, and full of possibility.", earth: "Steady and enduring. Slow to stir, impossible to move once set.",
  lightning: "Sudden and bright. Speed first, questions later.", plant: "Living and growing. It remembers the hand that tends it.",
  ice: "Still and exacting. Precision made cold.", steel: "Hard, honest and heavy. It rewards discipline.",
  light: "Blinding and swift. Rare, and watched by many.", dark: "Deep and quiet. It swallows what others throw.", spatial: "Distance folds to will. Rare and demanding."
};
var BAND_ORDER = ["Negligible", "Poor", "Modest", "Average", "Good", "Strong", "Exceptional", "Extraordinary"];
function bandFrac(n) { var b = bandOf(n); var i = BAND_ORDER.indexOf(b); return num(n, 0) <= 0 ? 0.12 : (i + 1) / BAND_ORDER.length; }
function Radar(p) {
  var axes = p.axes; var n = axes.length; var R = 54; var cx = 80, cy = 72;
  function pt(i, f) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; }
  var rings = [0.25, 0.5, 0.75, 1].map(function (f) { return axes.map(function (_, i) { return pt(i, f).join(","); }).join(" "); });
  var shape = axes.map(function (a, i) { return pt(i, Math.max(0.08, a.f)).join(","); }).join(" ");
  return (
    <svg viewBox="-18 -4 196 158" className="bc-radar" role="img" aria-label={axes.map(function (a) { return a.label + " " + a.word; }).join(", ")}>
      {rings.map(function (r, i) { return <polygon key={i} points={r} fill="none" stroke="#c9a24e" strokeOpacity={i === 3 ? .55 : .2} strokeWidth="1" />; })}
      {axes.map(function (a, i) { var e = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={e[0]} y2={e[1]} stroke="#c9a24e" strokeOpacity=".25" />; })}
      <polygon points={shape} fill="rgba(217,180,99,.42)" stroke="#f3dda0" strokeWidth="1.4" />
      {axes.map(function (a, i) { var e = pt(i, 1.27); return <text key={i} x={e[0]} y={e[1] + 3} textAnchor="middle" fontSize="8.5" fill="#e1d6c1" fontFamily="Cinzel,Georgia,serif">{a.label}</text>; })}
    </svg>
  );
}
function GrimoireView(p) {
  var api = p.api; var v = api.variables || {}; var busy = !!api.isStreaming;
  var g = obj(v.grimoire); var mp = obj(v.magic_profile); var bp = obj(v.body_profile); var spells = arr(v.spells); var concepts = arr(v.spell_concepts); var techs = arr(v.techniques);
  var ec = React.useState(""); var castingError = ec[0], setCastingError = ec[1];
  var ss = React.useState("spells"); var sub = ss[0], setSub = ss[1];
  var os = React.useState(-1); var open = os[0], setOpen = os[1];
  var fc = React.useState("all"); var cat = fc[0], setCat = fc[1];
  var gfs = React.useState(false); var grimoireForge = gfs[0], setGrimoireForge = gfs[1];
  var nf = React.useState({ intent: "Offensive", idea: "", priority: "Precision", tradeoff: "" }); var form = nf[0], setForm = nf[1];
  var cp = obj(v.creation_profile); var attr = mp.attribute_known === false ? "" : str(mp.attribute);
  var mps = React.useState(false); var profileOpen = mps[0], setProfileOpen = mps[1];
  var mb = obj(mp.bands);
  var profileSheet = profileOpen ? (
    <Sheet title="Your magic" onClose={function () { setProfileOpen(false); }}>
      <div className="bc-tendency-body" style={{ marginBottom: 8 }}><Icon n={attrIcon(attr)} s={40} fill="#9fe7d6" /><div><strong>{attr || "Not yet understood"}</strong><small>{ATTR_NATURE[str(attr).toLowerCase()] || "Your mana's own nature, still revealing itself."}</small></div></div>
      <Row k="Reserves" v={str(mb.reserves) && mb.reserves !== "Unknown" ? str(mb.reserves) : bandOf(mp.capacity)} />
      <Row k="Output" v={str(mb.output) && mb.output !== "Unknown" ? str(mb.output) : bandOf(mp.output)} />
      <Row k="Control" v={str(mb.control) && mb.control !== "Unknown" ? str(mb.control) : bandOf(mp.control)} />
      <Row k="Sensing" v={str(mb.sensing) && mb.sensing !== "Unknown" ? str(mb.sensing) : bandOf(mp.sensing)} />
      <Row k="Physique" v={str(obj(bp.bands).physique) && obj(bp.bands).physique !== "Unknown" ? str(obj(bp.bands).physique) : bandOf((num(bp.strength, 0) + num(bp.endurance, 0)) / 2)} />
      {arr(mp.forms).length ? <Row k="Forms" v={arr(mp.forms).map(str).join(", ")} /> : null}
      <div className="bc-note">Descriptions only — the numbers behind them stay hidden. They grow through training, real use and breakthroughs.</div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <Btn small kind="gold" onClick={function () { setProfileOpen(false); p.goTrain("Mana control", ""); }}>Train my magic</Btn>
        <Btn small onClick={function () { setProfileOpen(false); setSub("developing"); setOpen(-1); }}>Shape a new spell</Btn>
      </div>
    </Sheet>
  ) : null;
  var hasG = isTrue(v.has_grimoire);
  var sBond = g.spirit_link ? str(g.spirit_link) : ""; var dBond = g.devil_link ? str(g.devil_link) : "";
  var bonds = (
    <Frame className="bc-bonds-panel" pad="9px 10px" style={{ marginBottom: 12 }}>
      <div className="bc-bonds-head">
        <Icon n="clover" s={30} />
        <div><strong>Spirit & Devil Links</strong><small>Different powers. Different promises. Each bond carries its own consequence.</small></div>
      </div>
      <button type="button" className="bc-bondrow" onClick={p.goBound}>
        <span className="bc-bondrow-icon"><Icon n="wisp" s={26} /></span>
        <span className="bc-bondrow-text"><strong>Your spirit bond</strong><small>Your connection to a spirit and their power.</small></span>
        <span className={"bc-bondtag" + (sBond ? " bc-bondtag-on" : "")}><Icon n="wisp" s={16} /><span><strong>{sBond || "None"}</strong><small>{sBond ? "Bonded" : "Not bound"}</small></span><Icon n="chevr" s={11} /></span>
      </button>
      <button type="button" className="bc-bondrow bc-bondrow-devil" onClick={p.goBound}>
        <span className="bc-bondrow-icon"><Icon n="devil" s={24} fill="#d9534a" /></span>
        <span className="bc-bondrow-text"><strong>Your devil bond</strong><small>A fragment of forbidden power that lingers.</small></span>
        <span className="bc-bondtag bc-bondtag-devil"><Icon n="devil" s={15} fill="#d9534a" /><span><strong>{dBond || "Unknown"}</strong><small>{dBond ? "Pact or bond" : "Not yet awakened"}</small></span><Icon n="chevr" s={11} /></span>
      </button>
    </Frame>
  );
  if (!hasG) {
    return (
      <div>
        {bonds}
        <Frame pad="16px 15px">
          <div style={{ textAlign: "center", opacity: 0.55 }}><Icon n="book" s={64} /></div>
          <H size={19} m="10px 0">No grimoire has chosen you yet</H>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: C.label, margin: "0 0 12px" }}>Grimoires choose their owners at the March ceremony in a grimoire tower, once you have turned fifteen. If you miss it, you can visit a tower later. Until then your magic is raw and unshaped.</p>
          <Row k="Your magic, as far as you know" v={attr || "Not yet understood"} />
          {/Sun/.test(str(cp.origin)) ? <p style={{ fontSize: 15, color: C.muted, marginTop: 12 }}>In the Land of the Sun, magic is written in scrolls, not grimoires.</p> : null}
        </Frame>
      </div>
    );
  }
  var content = null;
  if (sub === "spells" && open >= 0 && spells[open]) {
    var s = spells[open]; var og = obj(s.origin);
    var sid = s.id || ("idx" + open);
    var spellImgUrl = p.art && p.art.spellImageUrl ? p.art.spellImageUrl(sid) : "";
    var plan = bcCastPlan(v, s, { output: "Normal" });
    content = (
      <Frame className="bc-turn bc-spellpage" key={"sp" + open} pad="14px 14px 16px">
        <div className="bc-spellpage-kicker">{"PAGE " + (s.page || open + 1) + " · " + spellCat(s).toUpperCase()}</div>
        <div className="bc-spellpage-name">{str(s.name)}</div>
        {p.art && p.art.setSpellImage ? (
          <ImgSlot url={spellImgUrl} h={190} marginBottom={10} placeholderIcon="book"
            onFile={function (e) { var fl = e.target.files && e.target.files[0]; e.target.value = ""; if (!fl) return; readImage(fl, 640, 480, function (err, data) { if (!err) p.art.setSpellImage(sid, data, function () {}); }); }}
            onRemove={function () { p.art.setSpellImage(sid, "", function () {}); }}
          />
        ) : (spellImgUrl ? <img src={spellImgUrl} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 5, margin: "0 0 10px" }} /> : null)}
        <p className="bc-spellpage-text">{str(s.behavior) || "The page's meaning is still settling."}</p>
        <PRow k="Proficiency" v={str(s.proficiency) || "Novice"} />
        {s.range ? <PRow k="Range" v={str(s.range)} /> : null}
        <PRow k="Typical demand" v={bcSpellMechanics(s).tier} />
        {plan.ok && showNums(v) ? <PRow k="Normal cast cost" v={plan.manaUnits + " mana units (" + plan.manaPercent + "% of your reserve)"} /> : null}
        {plan.ok && showNums(v) ? <PRow k="Physical cost" v={plan.stamina + " stamina · " + plan.fatigue + " fatigue"} /> : null}
        {plan.ok && showNums(v) ? <PRow k="Potential impact" v={plan.impact + " before defenses"} /> : null}
        {!plan.ok ? <PRow k="Cast availability" v={plan.reason || "Unavailable"} /> : null}
        {arr(s.variants).length ? <PRow k="Variants" v={arr(s.variants).map(function (x) { return typeof x === "string" ? x : str(x.name); }).join(", ")} /> : null}
        {s.origin ? <p style={{ fontSize: 14, color: C.muted, fontStyle: "italic", margin: "12px 0 0" }}>{"Appeared " + [str(og.date), str(og.place)].filter(Boolean).join(", ") + (og.trigger ? ": " + str(og.trigger) : "")}</p> : null}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          <Btn small onClick={function () { setOpen(-1); }}>Back to pages</Btn>
          <Btn small kind="gold" disabled={busy} onClick={function () { bcCastFromUI(api, s, { output: "Normal", target: "as fits the moment" }, function (ok, msg) { if (ok) p.toStory(); else setCastingError(msg); }); }}>Cast it</Btn>
          <Btn small onClick={function () { p.goTrain("A spell", str(s.name)); }}>Train it</Btn>
          {castingError ? <div role="alert" style={{ color: "#f1b8a8", fontSize: 13, width: "100%" }}>{castingError}</div> : null}
        </div>
      </Frame>
    );
  } else if (sub === "spells") {
    var shown = spells.map(function (sp, i) { return { sp: sp, i: i }; }).filter(function (x) { return cat === "all" || spellCat(x.sp) === cat; });
    var pages = num(g.pages_filled, spells.length); var potential = num(g.blank_potential, 0);
    var axes = [
      { label: "Control", f: bandFrac(mp.control), word: bandOf(mp.control) },
      { label: "Output", f: bandFrac(mp.output), word: bandOf(mp.output) },
      { label: "Reserves", f: bandFrac(mp.capacity), word: bandOf(mp.capacity) },
      { label: "Physique", f: bandFrac((num(bp.strength, 0) + num(bp.endurance, 0)) / 2), word: bandOf((num(bp.strength, 0) + num(bp.endurance, 0)) / 2) },
      { label: "Sensing", f: bandFrac(mp.sensing), word: bandOf(mp.sensing) }
    ];
    content = (
      <div>
        <Frame className="bc-spells-panel" pad="9px 9px 6px" style={{ marginBottom: 12 }}>
          <SectionHead icon="book" title="Spells & Pages" sub="Spells you have discovered and mastered."
            right={<button type="button" className="bc-pagecount" aria-label="Open the grimoire record" onClick={function () { setSub("record"); }}><small>Total pages</small><strong>{pages + (potential > pages ? " / " + potential : "")}</strong></button>} />
          <div className="bc-chiprow">{SPELL_CATS.map(function (c) { return <Chip key={c[0]} icon={c[2]} on={cat === c[0]} onClick={function () { setCat(c[0]); }}>{c[1]}</Chip>; })}</div>
          {shown.length ? shown.map(function (x) {
            var sp = x.sp, i = x.i; var su = p.art && p.art.spellImageUrl ? p.art.spellImageUrl(sp.id || ("idx" + i)) : ""; var c = spellCat(sp);
            var prog = clamp(num(sp.prog, 0), 0, 100);
            return (
              <button className="bc-spellrow" key={sp.id || i} type="button" onClick={function () { setOpen(i); }}>
                <span className="bc-spellrow-art">{su ? <img src={su} alt="" /> : <Icon n={attrIcon(sp.attribute || attr)} s={30} fill="#9fe7d6" />}</span>
                <span className="bc-spellrow-meta">
                  <strong>{str(sp.name).replace(/^[A-Za-z ]+Magic:\s*/, "")}</strong>
                  <small>{str(sp.behavior).slice(0, 90) || "A spell recorded in your grimoire."}</small>
                  <span className="bc-tags"><b className={"bc-tag bc-tag-" + c}>{c.charAt(0).toUpperCase() + c.slice(1)}</b>{(sp.attribute || attr) ? <b className="bc-tag bc-tag-attr">{str(sp.attribute || attr)}</b> : null}</span>
                </span>
                <span className="bc-spellrow-side">
                  <b className="bc-profbadge">{str(sp.proficiency) || "Novice"}</b>
                  <span className="bc-progbar"><i style={{ width: prog + "%" }} /></span>
                  <small>{"Page " + (sp.page || i + 1)}</small>
                </span>
                <Icon n="chevr" s={13} />
              </button>
            );
          }) : <Empty>{spells.length ? "No pages of that kind yet." : "Every page is still blank. Spells appear when your magic grows into them, through practice, experiments and the moments that test you."}</Empty>}
        </Frame>
        <div className="bc-grim-lower">
          <button type="button" className="bc-attr-panel bc-cardbtn" onClick={function () { setProfileOpen(true); }} aria-label="Open your magical profile">
            <SectionHead icon="compass" iconSize={24} title="Attributes" sub="Your current magical profile." />
            <Radar axes={axes} />
          </button>
          <div className="bc-grim-side">
            <button type="button" className="bc-tendency bc-cardbtn" onClick={function () { setProfileOpen(true); }} aria-label="Open your mana tendency">
              <SectionHead icon={attrIcon(attr)} iconSize={24} title="Mana Tendency" sub="The nature of your magic." />
              <div className="bc-tendency-body"><Icon n={attrIcon(attr)} s={34} fill="#9fe7d6" /><div><strong>{attr || "Not yet understood"}</strong><small>{ATTR_NATURE[str(attr).toLowerCase()] || (attr ? "Your mana's own nature, still revealing itself." : "Your attribute will reveal itself in time.")}</small></div><Icon n="chevr" s={12} /></div>
            </button>
            <button type="button" className="bc-progression" onClick={function () { setSub("developing"); }}>
              <Icon n="chart" s={28} /><span><strong>Progression</strong><small>Concepts in development, techniques and the grimoire's record.</small></span><Icon n="chevr" s={12} />
            </button>
          </div>
        </div>
        <div className="bc-grim-cover-row">
          <div className="bc-grimoire-cover"><Cover g={g} attr={mp.attribute} small={true} design={obj(p.art).grimoireDesign} imgUrl={artFor(p.api, obj(p.art).art, "grimoire_cover")} /></div>
          <div><strong>{(str(obj(g.appearance).cover) || "A soul-bound grimoire")}</strong><small>{(num(g.leaf_count, 3) + "-leaf") + (attr ? " · " + attr + " magic" : "")}</small><Btn small onClick={function () { setGrimoireForge(true); }}><Icon n="quill" s={14} />Customize / AI Cover</Btn></div>
        </div>
      </div>
    );
  } else if (sub === "developing") {
    content = (
      <div>
        {concepts.length ? concepts.map(function (c, i) {
          return (
            <Frame key={c.id || i} pad="11px 12px" style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ fontSize: 17, fontWeight: 700, color: C.ivory }}>{str(c.name)}</span><span style={{ fontSize: 13.5, color: C.gold, fontWeight: 700 }}>{CONCEPT_WORD[str(c.state)] || str(c.state) || "Early"}</span></div>
              {c.description || c.intent ? <p style={{ fontSize: 15, color: C.muted, margin: "4px 0 8px", lineHeight: 1.45 }}>{str(c.description || c.intent)}</p> : null}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn small disabled={busy} onClick={function () { send(api, "[UI:SHAPE] concept=" + str(c.name) + "; mode=experiment now"); p.toStory(); }}>Experiment now</Btn>
                <Btn small onClick={function () { p.goTrain("Spell shaping", str(c.name)); }}>Train over time</Btn>
              </div>
            </Frame>
          );
        }) : <Empty>No spells in development. Describe an idea below and try it.</Empty>}
        <Frame pad="14px" style={{ marginTop: 10 }}>
          <H size={17} m="0 0 12px">Shape a new idea</H>
          <Field label="What it is for"><Seg label="Purpose" value={form.intent} options={["Offensive", "Defensive", "Movement", "Support", "Utility"]} onChange={function (x) { setForm(Object.assign({}, form, { intent: x })); }} /></Field>
          <Field label="Describe it"><textarea className="bc-in bc-ta" aria-label="Spell idea" placeholder="For example: compress wind into a thin cutting edge I can throw" value={form.idea} onChange={function (e) { setForm(Object.assign({}, form, { idea: e.target.value })); }} /></Field>
          <Field label="What matters most"><Seg label="Priority" value={form.priority} options={["Power", "Speed", "Precision", "Range", "Efficiency", "Duration"]} onChange={function (x) { setForm(Object.assign({}, form, { priority: x })); }} /></Field>
          <Field label="What you would give up"><input className="bc-in" aria-label="Tradeoff" placeholder="Optional" value={form.tradeoff} onChange={function (e) { setForm(Object.assign({}, form, { tradeoff: e.target.value })); }} /></Field>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn kind="gold" disabled={busy || !form.idea.trim()} onClick={function () { send(api, "[UI:SHAPE] attribute=" + (str(mp.attribute) || "my attribute") + "; intent=" + form.intent + "; concept=" + form.idea.trim() + "; priority=" + form.priority + "; tradeoff=" + (form.tradeoff || "none stated") + "; mode=experiment now"); setForm(Object.assign({}, form, { idea: "", tradeoff: "" })); p.toStory(); }}>Try it now</Btn>
            <Btn disabled={!form.idea.trim()} onClick={function () { p.goTrain("Spell shaping", form.idea.trim()); }}>Train it over time</Btn>
          </div>
        </Frame>
      </div>
    );
  } else if (sub === "techniques") {
    content = techs.length ? <Frame pad="4px 14px 8px">{techs.map(function (t, i) { return <Row key={t.id || i} k={str(t.name)} v={str(t.tier) || "Novice"} />; })}</Frame>
      : <Empty>No techniques yet. Mana Skin, Mana Zone, Ki and the rest are learned from teachers, hard practice or discovery.</Empty>;
  } else {
    var hist = arr(g.history); var idn = obj(mp.identity);
    content = (
      <Frame pad="6px 14px 10px">
        <Row k="Insignia" v={str(g.insignia || "clover") + (num(g.leaf_count, 0) ? ", " + g.leaf_count + " leaves" : "")} />
        <Row k="Received" v={str(g.received_on) || "Unknown"} />
        <Row k="Pages written" v={str(num(g.pages_filled, spells.length))} />
        {arr(idn.themes).length ? <Row k="Recurring themes" v={arr(idn.themes).join(", ")} /> : null}
        <H size={16} m="16px 0 6px">History</H>
        {hist.length ? hist.map(function (h, i) { return <Row key={i} k={str(h.date)} v={str(h.event)} />; }) : <Empty>Nothing recorded yet.</Empty>}
      </Frame>
    );
  }
  return (
    <div>
      {profileSheet}
      {sub === "spells" && open < 0 ? bonds : null}
      {grimoireForge ? <GrimoireForgeSheet api={p.api} art={p.art} g={g} attr={mp.attribute} onClose={function () { setGrimoireForge(false); }} /> : null}
      {sub !== "spells" || open >= 0 ? <div className="bc-chiprow" style={{ marginBottom: 10 }}>{[["spells", "Overview", "book"], ["developing", "Developing", "quill"], ["techniques", "Techniques", "star"], ["record", "Record", "scroll"]].map(function (t) { return <Chip key={t[0]} icon={t[2]} on={sub === t[0] && open < 0} onClick={function () { setSub(t[0]); setOpen(-1); }}>{t[1]}</Chip>; })}</div> : null}
      {content}
    </div>
  );
}
function itemKind(it) {
  var ty = str(it.type).toLowerCase();
  var t = (ty + " " + arr(it.tags).join(" ") + " " + str(it.name)).toLowerCase();
  if (/\bkey\b|quest|letter|document|deed|\bmap\b|badge|insignia|token|\bseal\b|keepsake|heirloom|spell page/.test(t)) return "key";
  if (/^(clothing|weapon|armor|armour|tool|food|container|consumable|potion)$/.test(ty)) return "item";
  if (/material|ingredient|\bore\b|herb|resource|crystal|\bhide\b|pelt|lumber|\bbolt of cloth\b|thread|reagent|component/.test(t)) return "material";
  return "item";
}
var KIND_LABEL = { item: "Item", material: "Material", key: "Key Item" };
function itemIcon(it) {
  var t = (str(it.type) + " " + arr(it.tags).join(" ") + " " + str(it.name)).toLowerCase();
  if (/potion|elixir|tonic|vial/.test(t)) return ["drop", "#d64545"];
  if (/grimoire/.test(t) && !/holster|holder|belt|case|strap/.test(t)) return ["book", "#d9b463"];
  if (/holster|scabbard|sheath/.test(t)) return ["sword", "#c79a5a"];
  if (/herb|plant|leaf|flower/.test(t)) return ["leaf", "#5fbf5f"];
  if (/crystal|gem|mana stone|magic stone/.test(t)) return ["gem", "#58a6e8"];
  if (/ore|iron|metal|stone/.test(t)) return ["mountain", "#b9bec7"];
  if (/page|scroll|letter|book|document|map/.test(t)) return ["scroll", "#d9b463"];
  if (/food|bread|loaf|meat|ration|fruit|cheese|bun/.test(t)) return ["food", "#e0a35a"];
  if (/sword|blade|knife|dagger|spear|axe|weapon|katana|sabre|saber|rapier|scimitar|cutlass/.test(t) && !/kit|oil|care/.test(t)) return ["sword", "#c9ced6"];
  if (/shield|armor|armour|helm/.test(t)) return ["shield", "#c9ced6"];
  if (/satchel|bag|pack|pouch|case|backpack/.test(t)) return ["pack", "#c79a5a"];
  if (/broom/.test(t)) return ["wisp", "#d9b463"];
  if (/clothing|tunic|trousers|boots|cloak|cape|mantle|coat|shirt|dress|robe|hat|vest|apron/.test(t)) return ["bust", "#a99bd6"];
  if (/kit|flint|tool|whetstone/.test(t)) return ["hammer", "#c9ced6"];
  return ["star", "#d9b463"];
}
function PackView(p) {
  var api = p.api, v = api.variables || {}, busy = !!api.isStreaming;
  var inv = bcNormalize(arr(v.inventory), v);
  var carry = bcCarryProfile(inv, obj(v.body_profile), bcWalletProfile(v.money).weightKg);
  var fs = React.useState("all"), filter = fs[0], setFilter = fs[1];
  var ss = React.useState("location"), sort = ss[0], setSort = ss[1];
  var es = React.useState(""), expanded = es[0], setExpanded = es[1];
  var ds = React.useState(false), details = ds[0], setDetails = ds[1];
  var sel = React.useState({}), chosen = sel[0], setChosen = sel[1];
  var msgState = React.useState(''), msg = msgState[0], setMsg = msgState[1];
  var refs = { inventory: React.useRef(null), market: React.useRef(null), bank: React.useRef(null) };
  var focus = p.focus || "inventory";
  var vs0 = React.useState(focus); var visible = vs0[0], setVisible = vs0[1];
  function jump(k, smooth) { var r = refs[k]; setVisible(k); if (r && r.current && r.current.scrollIntoView) { try { r.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" }); } catch (e) {} } }
  React.useEffect(function () { if (focus !== "inventory") jump(focus, false); }, [focus]);
  React.useEffect(function () {
    if (typeof IntersectionObserver !== "function") return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { var k = en.target.getAttribute("data-sec"); if (k) setVisible(k); } });
    }, { rootMargin: "-25% 0px -65% 0px" });
    ["inventory", "market", "bank"].forEach(function (k) { if (refs[k].current) obs.observe(refs[k].current); });
    return function () { obs.disconnect(); };
  }, []);
  var atHome = !!str(v.home_location) && str(v.home_location) === str(v.current_location);
  var can = !busy && canWrite(api);
  var atSquad = bcAtSquadLocker(v);
  function persist(list, verb, it, kind, minutes) {
    if (!can) return;
    var normalized = bcNormalize(list, v);
    var appearance = bcAppearance(normalized, v);
    var existing = arr(v.equipment_activity);
    var nextId = 'gear-' + (num(v.equipment_event_seq, 0) + 1);
    var line = bcEventText(kind, it, normalized, appearance);
    appearance.lastChangedId = nextId;
    var event = { id: nextId, kind: kind, itemId: it && it.id, item: it && it.name, text: line, location: str(v.current_location), at: str(v.world_time),
      appearance: appearance.coverage, meaningful: kind === 'equip' || kind === 'remove' || kind === 'drop', observed: false };
    var patch = Object.assign({ inventory: normalized, carry_state: bcCarryProfile(normalized, obj(v.body_profile), bcWalletProfile(v.money).weightKg),
      appearance_state: appearance, equipment_activity: existing.concat([event]).slice(-6), equipment_event_seq: num(v.equipment_event_seq, 0) + 1 }, bcClockForInventory(v, minutes == null ? 1 : minutes));
    try {
      var result = typeof api.patchVariables === 'function' ? api.patchVariables(patch) : null;
      if (typeof api.patchVariables !== 'function') Object.keys(patch).forEach(function (k) { api.setVariable(k, patch[k]); });
      setMsg(line);
      if (result && typeof result.catch === 'function') result.catch(function () { setMsg('Inventory update could not be saved.'); });
    } catch (e) { setMsg('Save failed: ' + str(e && e.message || e)); }
  }
  function move(it, dest, caption, qty) {
    var res = bcMoveQty(inv, it.id, dest, v, qty);
    if (!res.ok) { setMsg(res.reason); return; }
    var wasWorn = it.placement && it.placement.kind === 'body';
    var kind = dest.kind === 'body' ? 'equip' : dest.kind === 'world' ? 'drop' : wasWorn ? 'remove' : caption === 'Retrieved' ? 'retrieve' : dest.kind === 'container' ? 'store' : 'move';
    if (dest.kind === 'world' && dest.area === 'home') kind = 'store';
    persist(res.inventory, caption, it, kind, kind === 'equip' || kind === 'remove' ? 2 : 1);
  }
  function useItem(it) {
    if (!bcIsAccessible(it, inv, isTrue(v.in_combat))) { setMsg('You cannot reach that item.'); return; }
    if (bcCanConsume(it) && !isTrue(v.in_combat)) {
      var result = bcConsume(inv, it.id, v);
      if (result.ok) { persist(result.inventory, 'Used', it, 'consume', 4); return; }
      setMsg(result.reason); return;
    }
    setMsg('This needs a story action. Select “Use in story (AI)” to resolve it.');
  }
  function itemActions(it) {
    var pl = it.placement || {}, sp = bcSpec(it), qty = num(it.qty, 1), worn = pl.kind === 'body';
    var carried = bcCarried(it, inv), stored = pl.kind === 'world';
    var easy = bcIsAccessible(it, inv, isTrue(v.in_combat));
    var destinations = carried ? bcDestinations(inv, it) : [];
    var rawSel = chosen[it.id], selKey = destinations.some(function (d) { return JSON.stringify(d.placement) === rawSel; }) ? rawSel : (destinations[0] ? JSON.stringify(destinations[0].placement) : '');
    var selDest = destinations.find(function (d) { return JSON.stringify(d.placement) === selKey; });
    var equippable = bcAllowedSlots(it);
    var inaccessible = stored && !(pl.location === str(v.current_location) || (pl.area === 'home' && atHome));
    return (
      <div className="bc-item-actions">
        <div className="bc-item-facts">{[bcPlaceLabel(inv, it), bcWeight(it) + ' kg', bcBulk(it) + ' bulk', it.cond ? 'Condition: ' + str(it.cond) : ''].filter(Boolean).join(' · ')}</div>
        <div className="bc-item-btns">
          {carried ? <Btn small disabled={!can || !easy} onClick={function () { useItem(it); }}>Use (free)</Btn> : null}
          <Btn small disabled={busy} onClick={function () { setMsg(bcLocalExamine(it, inv)); }}>Examine (free)</Btn>
          {carried ? <Btn small disabled={!can || !easy} onClick={function () { send(api, '[UI:ACT] I use ' + str(it.name) + ' (' + it.id + ') from ' + bcPlaceLabel(inv, it) + '. Resolve effects and witnesses from world state. Do not repeat any already-applied inventory transfer.'); p.toStory(); }}>Use in story (AI)</Btn> : null}
          {carried && equippable.map(function (slot) { return <Btn key={slot} small disabled={!can || (worn && pl.slot === slot)} onClick={function () { move(it, { kind: 'body', slot: slot }, 'Equipped'); }}>{worn && pl.slot === slot ? 'Equipped' : (slot === 'main-hand' || slot === 'off-hand' ? 'Wield · ' : 'Wear · ') + (BC_SLOTS.find(function (x) { return x[0] === slot; }) || ['', slot])[1]}</Btn>; })}
          {worn ? <Btn small disabled={!can} onClick={function () { var spot = bcFindSpot(inv, it); if (!spot) { setMsg('Free room in a bag or your arms before removing this item.'); return; } move(it, spot, 'Removed'); }}>Take off / Sheathe</Btn> : null}
          {stored && !inaccessible ? <Btn small disabled={!can} onClick={function () { var spot = bcFindSpot(inv, it); if (!spot) { setMsg('No free space to retrieve ' + it.name + '.'); return; } move(it, spot, 'Retrieved'); }}>Retrieve</Btn> : null}
          {carried ? <Btn small disabled={!can} onClick={function () { move(it, { kind: 'world', area: 'ground' }, 'Dropped'); }}>Drop</Btn> : null}
          {carried && qty > 1 ? <Btn small disabled={!can} onClick={function () { move(it, { kind: 'world', area: 'ground' }, 'Dropped one', 1); }}>Drop 1</Btn> : null}
          {carried && atHome ? <Btn small disabled={!can} onClick={function () { move(it, { kind: 'world', area: 'home' }, 'Stored at home'); }}>Store at home</Btn> : null}
          {carried && atSquad ? <Btn small disabled={!can} onClick={function () { move(it, { kind: 'world', area: 'storage' }, 'Stored at squad locker'); }}>Squad locker</Btn> : null}
        </div>
        {carried && destinations.length ? (
          <div className="bc-item-move">
            <select aria-label={'Move ' + str(it.name) + ' to'} value={selKey} onChange={function (e) { var n = Object.assign({}, chosen); n[it.id] = e.target.value; setChosen(n); }}>
              {destinations.map(function (d, i) { return <option key={i} value={JSON.stringify(d.placement)}>{d.label}</option>; })}
            </select>
            <Btn small disabled={!can || !selDest} onClick={function () { if (selDest) move(it, selDest.placement, 'Moved'); }}>Move</Btn>
          </div>
        ) : null}
        {sp.storage ? (
          <div className="bc-item-compartments">
            {BC_STORAGE[sp.storage].slots.map(function (slot) {
              var present = inv.filter(function (x) { var xpl = x.placement || {}; return xpl.kind === 'container' && xpl.containerId === it.id && xpl.slotId === slot.id; });
              var load = present.reduce(function (n, x) { return n + bcBulk(x); }, 0), mass = present.reduce(function (n, x) { return n + bcWeight(x); }, 0);
              return <div key={slot.id}><span>{slot.label + ' · ' + slot.access}{present.length ? ' (' + present.map(function (x) { return x.name; }).join(', ') + ')' : ''}</span><b style={{ color: load > slot.bulkCap || mass > slot.weightCap ? '#e7a2a2' : C.muted }}>{Math.round(load * 10) / 10 + '/' + slot.bulkCap + ' bulk'}</b></div>;
            })}
          </div>
        ) : null}
      </div>
    );
  }
  var list = inv.filter(function (it) { return filter === "all" || itemKind(it) === filter; });
  list = list.slice().sort(function (a, b) {
    if (sort === "name") return str(a.name).localeCompare(str(b.name));
    if (sort === "weight") return bcWeight(b) - bcWeight(a);
    if (sort === "type") return itemKind(a).localeCompare(itemKind(b)) || str(a.name).localeCompare(str(b.name));
    return (bcCarried(a, inv) ? 0 : 1) - (bcCarried(b, inv) ? 0 : 1);
  });
  var over = carry.band === 'overloaded' || carry.band === 'immobile';
  var appearance = bcAppearance(inv, v);
  var bank = bcBankState(v.bank_account);
  return (
    <div className="bc-packhub">
      <button type="button" className="bc-purse bc-frame" onClick={function () { jump("bank", true); }} aria-label={"Purse: " + num(v.money, 0).toLocaleString() + " Yul. Go to the bank."}>
        <img className="bc-purse-art" src={img("purse")} alt="" /><span className="bc-purse-shade" /><Corners s={14} />
        <span className="bc-purse-icon"><Icon n="coins" s={44} /></span>
        <div className="bc-purse-text"><small>Your Purse</small><strong>{num(v.money, 0).toLocaleString() + " Yul"}</strong><span>{bank.open ? "Bank: " + bcMoney(bank.balance) + " on account." : "The coin of the Clover Kingdom."}</span></div>
      </button>
      <div className="bc-hubtabs" role="tablist" aria-label="Satchel and treasury sections">
        {[["inventory", "Equipment", "Items · Materials", "pack"], ["bank", "Accounts", "Deposit · Withdraw", "bank"], ["market", "Trade", "Buy · Sell", "coins"]].map(function (t) {
          return <button key={t[0]} type="button" role="tab" aria-selected={visible === t[0] ? "true" : "false"} className={"bc-hubtab" + (visible === t[0] ? " bc-hubtab-on" : "")} onClick={function () { jump(t[0], true); }}><Icon n={t[3]} s={30} /><span><strong>{t[1]}</strong><small>{t[2]}</small></span></button>;
        })}
      </div>
      <div ref={refs.inventory} data-sec="inventory" className="bc-sec-anchor" />
      <Frame className="bc-inv-panel" pad="0 0 8px">
        <SectionHead art="inv_head" icon="pack" title="Inventory" sub="Items, Materials, and Key Items you carry."
          right={<span className="bc-inv-tools"><button type="button" className={"bc-capchip" + (carry.band !== "comfortable" ? " bc-crit" : "")} aria-label={"Carried " + Math.round(carry.weight * 10) / 10 + " of " + carry.max + " kilograms, " + carry.band + ". Show load details."} onClick={function () { setDetails(!details); }}>{Math.round(carry.weight * 10) / 10 + " / " + carry.max + " kg"}</button>
            <select aria-label="Sort items" value={sort} onChange={function (e) { setSort(e.target.value); }}><option value="location">Location</option><option value="name">Name</option><option value="weight">Weight</option><option value="type">Type</option></select></span>} />
        <div className="bc-chiprow bc-inv-filters">{[["all", "All"], ["item", "Items"], ["material", "Materials"], ["key", "Key Items"]].map(function (f) { return <Chip key={f[0]} on={filter === f[0]} onClick={function () { setFilter(f[0]); }}>{f[1]}</Chip>; })}</div>
        {msg ? <div role="status" className="bc-inv-msg">{msg}</div> : null}
        <div className="bc-inv-list">
          {list.length ? list.map(function (it) {
            var ic = itemIcon(it); var k = itemKind(it); var open = expanded === it.id;
            return (
              <div key={it.id} className={"bc-invrow-wrap" + (open ? " bc-invrow-open" : "")}>
                <button type="button" className="bc-invrow" aria-expanded={open ? "true" : "false"} onClick={function () { setExpanded(open ? "" : it.id); setMsg(""); }}>
                  <span className="bc-invrow-icon" style={{ color: ic[1] }}><Icon n={ic[0]} s={26} fill={ic[1]} /></span>
                  <span className="bc-invrow-text"><strong>{str(it.name)}</strong><small>{str(it.notes) || bcPlaceLabel(inv, it)}</small></span>
                  <span className="bc-invrow-qty">{"× " + num(it.qty, 1)}</span>
                  <b className={"bc-kind bc-kind-" + k}>{KIND_LABEL[k]}</b>
                  <Icon n={open ? "chevd" : "chevr"} s={13} />
                </button>
                {open ? itemActions(it) : null}
              </div>
            );
          }) : <Empty>{inv.length ? "Nothing of that kind." : "Your hands and pockets are empty."}</Empty>}
        </div>
        <button type="button" className="bc-inv-more" aria-expanded={details ? "true" : "false"} onClick={function () { setDetails(!details); }}>{details ? "Hide load, slots & appearance" : "Load, equipment slots & appearance"}<Icon n={details ? "chevd" : "chevr"} s={12} /></button>
        {details ? (
          <div className="bc-inv-details">
            <div className="bc-loadrow"><span>{'Carry load · ' + carry.band}</span><span>{carry.weight + ' / ' + carry.max + ' kg'}</span></div>
            <div className="bc-loadbar"><i style={{ width: Math.min(100, 100 * carry.weight / Math.max(1, carry.max)) + '%', background: over ? '#ae7060' : undefined }} /></div>
            <div className="bc-note">{'Comfortable ≤ ' + carry.comfortable + ' kg · Heavy ≤ ' + carry.heavy + ' kg · Arms ' + carry.armsBulk + ' / ' + BC_ARMS_BULK + ' bulk · purse ' + bcWalletProfile(v.money).weightKg.toFixed(3) + ' kg'}</div>
            {carry.band !== 'comfortable' ? <div className="bc-note" style={{ color: over ? '#f1b8a8' : C.goldHi }}>{carry.band === 'immobile' ? 'Immobile: drop weight before moving.' : carry.band === 'overloaded' ? 'Overloaded: substantial penalties to travel, dodging and stamina.' : 'Heavy: movement and stamina are impaired.'}</div> : null}
            <H size={15} m="12px 0 4px">Equipment slots</H>
            {BC_SLOTS.filter(function (pair) { return EQUIP_ALWAYS[pair[0]] || inv.some(function (x) { return x.placement && x.placement.kind === 'body' && x.placement.slot === pair[0]; }); }).map(function (pair) {
              var eq = inv.find(function (x) { return x.placement && x.placement.kind === 'body' && x.placement.slot === pair[0]; });
              var val = eq ? str(eq.name) : '—';
              if (pair[0] === 'grimoire' && !eq) {
                var gi = inv.find(function (x) { return bcSpec(x).tags.indexOf('grimoire') >= 0; }), gp = gi && gi.placement ? gi.placement : null;
                if (gp && gp.kind === 'container') { var bag = inv.find(function (x) { return x.id === gp.containerId; }); val = str(gi.name) + ' \u00b7 in ' + str(bag ? bag.name : 'its holder'); }
                else if (gp && gp.kind === 'world') val = bcPlaceLabel(inv, gi) + ' \u2014 not with you';
                else if (gp && gp.kind === 'loose') val = 'In your hands';
                else val = isTrue(v.has_grimoire) ? 'Floats at your side' : 'Not yet received';
              }
              return <Row key={pair[0]} k={pair[1]} v={val} />;
            })}
            <div className="bc-note">{'"Full outfit" is one-piece clothing (a dress, a uniform, "everyday clothes") worn instead of a separate shirt and trousers. A squad robe or cloak goes over your clothes in "Cloak / Squad robe".'}</div>
            <H size={15} m="12px 0 4px">Visible appearance</H>
            <div className="bc-note" style={{ color: C.ivory }}>{appearance.summary}</div>
            {appearance.social ? <div className="bc-note">{'Social presentation · ' + appearance.social.outfitTier + ' dress · setting: ' + appearance.social.setting}</div> : null}
            {appearance.coverage !== 'dressed' ? <div className="bc-note" style={{ color: '#e7b5a4' }}>{'Dress: ' + appearance.inadequatelyDressed.join('; ') + '. NPCs may notice if present.'}</div> : null}
            <div className="bc-note">Equipment actions are free (no AI call). Complex uses go through "Use in story".</div>
          </div>
        ) : null}
      </Frame>
      <div ref={refs.market} data-sec="market" className="bc-sec-anchor" />
      <div className="bc-hub-lower">
        <MarketView api={api} toStory={p.toStory} embedded={true} />
        <div ref={refs.bank} data-sec="bank" className="bc-sec-anchor bc-bank-anchor" />
        <BankView api={api} toStory={p.toStory} embedded={true} />
      </div>
    </div>
  );
}
var EQUIP_ALWAYS = { cloak: 1, 'base-upper': 1, 'base-lower': 1, feet: 1, hip: 1, back: 1, grimoire: 1 };
var PLACE_ART = ["place_torren", "place_capital", "place_lake", "place_detail", "location"];
function placeArt(l) { var n = str(l.name); if (/capital|castle/i.test(n)) return "place_capital"; if (str(l.status) === "rumored") return "place_rumor"; return hashPick(n, PLACE_ART); }
function PlaceRow(p) {
  var l = p.l; var name = str(l.name);
  return (
    <button type="button" className={"bc-placerow" + (p.on ? " bc-placerow-on" : "")} aria-pressed={p.on ? "true" : "false"} onClick={p.onClick}>
      <span className="bc-placerow-art"><img src={img(placeArt(l))} alt="" /></span>
      <span className="bc-placerow-text"><strong>{name}</strong><small>{[str(l.region), str(l.kingdom) ? kingdomLabel(l.kingdom) : ""].filter(Boolean).join(", ") || "Unknown region"}</small></span>
      <Icon n="chevr" s={14} />
    </button>
  );
}
var TRAVEL_MODES = [["On foot", "Travel normally", "run"], ["Broom", "By broom", "wisp"], ["Carriage", "By carriage", "castle"], ["Horse", "On horseback", "compass"], ["Ship", "By ship", "wave"]];
function MapView(p) {
  var api = p.api; var v = api.variables || {}; var busy = !!api.isStreaming; var locs = arr(v.known_locations);
  var ts = React.useState({ dest: "", other: "", mode: "On foot", pace: "Normal", route: "Main roads" }); var tr = ts[0], setTr = ts[1];
  function st(k, x) { var n = Object.assign({}, tr); n[k] = x; setTr(n); }
  var travelRef = React.useRef(null);
  var ls0 = React.useState(false); var locSheet = ls0[0], setLocSheet = ls0[1];
  function pick(name) {
    var isKnown = locs.some(function (l) { return str(l.name) === name; });
    var n = Object.assign({}, tr, isKnown ? { dest: name } : { dest: "Somewhere else", other: name }); setTr(n);
    setTimeout(function () { if (travelRef.current && travelRef.current.scrollIntoView) { try { travelRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {} } }, 30);
  }
  var dest = tr.dest && tr.dest !== "Somewhere else" ? tr.dest : tr.other.trim();
  var mapPlaces = layoutPlaces(v);
  var here = playerXY(v, mapPlaces);
  var destPlace = dest ? mapPlaces.filter(function (q) { return q.name === dest; })[0] : null;
  var destCanon = dest && !destPlace ? canonPlace(dest) : null;
  var destCoords = destPlace ? { x: destPlace.x, y: destPlace.y } : destCanon ? { x: destCanon.x, y: destCanon.y } : (dest ? findCoords(dest, locs) : null);
  var km = destCoords ? Math.round(distanceKm(here, destCoords)) : null;
  var eta = km !== null ? travelEta(km, tr.mode, tr.pace) : null;
  var destLoc = null; locs.forEach(function (l) { if (str(l.name) === tr.dest) destLoc = l; });
  var loc = parseLoc(v.current_location); var home = parseLoc(v.home_location); var cp = obj(v.creation_profile);
  var known = locs.filter(function (l) { return str(l.status) !== "rumored"; });
  var visited = locs.filter(function (l) { return str(l.status) === "visited"; });
  var rumored = locs.filter(function (l) { return str(l.status) === "rumored"; });
  function group(title, sub, icon, ls) {
    if (!ls.length) return null;
    return (
      <Frame className="bc-mapgroup" pad="6px 8px 8px" key={title}>
        <SectionHead icon={icon} iconSize={26} title={title} right={<small className="bc-shead-note">{sub}</small>} />
        {ls.map(function (l, i) { var n = str(l.name); return <PlaceRow key={str(l.id) || n || i} l={l} on={tr.dest === n} onClick={function () { pick(n); }} />; })}
      </Frame>
    );
  }
  return (
    <div className="bc-mapview">
      <button type="button" className="bc-curloc" onClick={function () { setLocSheet(true); }} aria-label={"Current location: " + (str(v.current_location) || "unknown") + ". Show details"}>
        <img src={img("location")} alt="" /><span className="bc-curloc-shade" />
        <span className="bc-locbar-pin"><Icon n="pin" s={22} /></span>
        <span className="bc-curloc-text"><small>Current Location</small><strong>{loc.settlement || str(v.current_location) || "Unknown"}</strong><span>{[kingdomLabel(loc.kingdom || cp.homeland), loc.region].filter(Boolean).join(" — ") || loc.place}</span></span>
        {v.weather ? <span className="bc-curloc-weather">{str(v.weather)}</span> : null}
        <Icon n="chevr" s={14} />
      </button>
      <button type="button" className="bc-homeloc" disabled={!home.settlement} onClick={function () { pick(home.settlement); }} aria-label={"Home: " + (home.settlement || "not established") + ". Plan the way home"}><Icon n="home" s={24} /><span><small>Home Location</small><strong>{home.settlement || str(v.home_location) || "Not established"}</strong></span><em>{[kingdomLabel(home.kingdom), home.region].filter(Boolean).join(" \u2014 ")}</em>{home.settlement ? <Icon n="chevr" s={13} /> : null}</button>
      <WorldMap v={v} api={api} trail={mapTrail(api)} onTravel={pick} />
      {locSheet ? <LocationSheet api={api} v={v} close={function () { setLocSheet(false); }} toStory={p.toStory} /> : null}
      {locs.length ? null : <Empty>You know your own neighborhood and little else.</Empty>}
      {group("Places You Know", "Locations you can travel to.", "pin", known)}
      {group("Visited", "Places you have been to before.", "book", visited)}
      {group("Rumored", "Places you have heard about.", "scroll", rumored)}
      <div ref={travelRef} className="bc-sec-anchor" />
      <Frame className="bc-travel" pad="8px 9px 10px">
        <SectionHead icon="compass" iconSize={34} title="Travel" right={<small className="bc-shead-note">Choose where to go and how to travel.</small>} />
        <div className="bc-travel-grid">
          <div className="bc-travel-left">
            <div className="bc-mini-label">Destination</div>
            <div className="bc-destchips">
              {locs.filter(function (l) { return str(l.name) !== loc.settlement; }).slice(0, 8).map(function (l) { var n = str(l.name); return <Chip key={n} icon="pin" on={tr.dest === n} onClick={function () { st("dest", n); }}>{n}</Chip>; })}
              <Chip icon="pin" on={tr.dest === "Somewhere else"} onClick={function () { st("dest", "Somewhere else"); }}>Somewhere else</Chip>
            </div>
            {tr.dest === "Somewhere else" || !locs.length ? <input className="bc-in" aria-label="Other destination" placeholder="Where to" value={tr.other} onChange={function (e) { st("other", e.target.value); }} /> : null}
            {dest ? (
              <div className="bc-destcard">
                <img src={img(destLoc ? placeArt(destLoc) : "place_detail")} alt="" />
                <div><strong>{dest}</strong><small>{destLoc ? [str(destLoc.region), kingdomLabel(destLoc.kingdom)].filter(Boolean).join(", ") : "Unmapped"}</small>
                  <span>{destLoc && destLoc.notes ? str(destLoc.notes) : (km !== null ? "~" + km + " km · about " + (eta < 24 ? eta + " h" : Math.round(eta / 24 * 10) / 10 + " days") + " " + tr.mode.toLowerCase() + "." : "Distance unknown — the GM resolves the route.")}</span>
                  {destLoc && destLoc.notes && km !== null ? <span>{"~" + km + " km · about " + (eta < 24 ? eta + " h" : Math.round(eta / 24 * 10) / 10 + " days")}</span> : null}
                </div>
              </div>
            ) : null}
          </div>
          <div className="bc-travel-right">
            <div className="bc-mini-label">Travel Method</div>
            {TRAVEL_MODES.map(function (m) { return <button key={m[0]} type="button" className={"bc-method" + (tr.mode === m[0] ? " bc-method-on" : "")} aria-pressed={tr.mode === m[0] ? "true" : "false"} onClick={function () { st("mode", m[0]); }}><Icon n={m[2]} s={20} />{m[1]}</button>; })}
            <div className="bc-mini-label">Pace</div>
            <div className="bc-pacerow">{["Relaxed", "Normal", "Hurried"].map(function (x) { return <Chip key={x} on={tr.pace === x} onClick={function () { st("pace", x); }}>{x}</Chip>; })}</div>
            <button type="button" className="bc-travelbtn" disabled={busy || !dest} onClick={function () {
              if (!dest) return;
              var hidden = "[UI:TRAVEL] destination=" + dest + "; mode=" + tr.mode + "; pace=" + tr.pace + "; route=" + tr.route +
                (km !== null ? "; estimated_distance_km=" + km : "") +
                ". Resolve this leg as usual — interruptions, encounters, arrival. Among your own directives (current_location, known_locations, food, money), set last_travel_report to exactly \"hours=<number>;interrupted=<true or false>\" for the ACTUAL travel time this reply covers. The interface applies stamina, mana, fatigue, time and position from that value — do not write those yourself for this leg.";
              var visible = "I set out for " + dest + ", travelling " + tr.mode.toLowerCase() + " at a " + tr.pace.toLowerCase() + " pace.";
              if (api.storage) api.storage.set("bc_pending_travel", JSON.stringify({ mode: tr.mode, pace: tr.pace, dest: dest }));
              tellGM(api, hidden, visible);
              p.toStory();
            }}><Icon n="clover" s={18} fill="#2a1d0c" />Travel<Icon n="chevr" s={14} fill="#2a1d0c" /></button>
          </div>
        </div>
      </Frame>
    </div>
  );
}

function mapTrail(api) {
  var out = [], last = "";
  arr(api.messages).forEach(function (m) { var sn = obj(m && m.stateSnapshot); if (sn.player_x === undefined || sn.player_y === undefined) return; var k = num(sn.player_x, 0) + "," + num(sn.player_y, 0); if (k === last) return; last = k; out.push({ x: num(sn.player_x, 0), y: num(sn.player_y, 0) }); });
  return out.slice(-8);
}
function LocationSheet(p) {
  var v = p.v; var api = p.api; var loc = parseLoc(v.current_location); var busy = !!api.isStreaming;
  var rec = null; arr(v.known_locations).forEach(function (l) { if (str(l.name) === loc.settlement) rec = l; });
  return (
    <Sheet title={loc.settlement || "Where you are"} onClose={p.close}>
      <div className="bc-locsheet-art"><img src={img(/capital|castle/i.test(loc.settlement) ? "map_head" : "story_head")} alt="" /></div>
      <Row k="Place" v={loc.place || "\u2014"} />
      <Row k="Region" v={[kingdomLabel(loc.kingdom), loc.region].filter(Boolean).join(" \u2014 ") || "\u2014"} />
      <Row k="Weather" v={str(v.weather) || "\u2014"} />
      <Row k="Time" v={dayMonthWD(v.world_date) + " \u00b7 " + clock12(v.world_time)} />
      {rec && rec.notes ? <p className="bc-note" style={{ fontSize: 14 }}>{str(rec.notes)}</p> : null}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <Btn small kind="gold" disabled={busy} onClick={function () { p.close(); send(api, "I take a careful look around " + (loc.place || loc.settlement || "here") + "."); p.toStory(); }}>Look around (story)</Btn>
        <Btn small onClick={p.close}>Close</Btn>
      </div>
    </Sheet>
  );
}

/* ---------- journal: chronicle, missions, notices ---------- */
function JournalView(p) {
  var api = p.api; var v = api.variables || {}; var busy = !!api.isStreaming;
  var ts = React.useState(p.tab || "chronicle"); var tab = ts[0], setTab = ts[1];
  React.useEffect(function () { if (p.tab) setTab(p.tab); }, [p.tab]);
  var gs = React.useState(""); var goalText = gs[0], setGoalText = gs[1];
  var goals = arr(v.goals); var ch = arr(v.chronicle_archive).concat(arr(v.chronicle)).slice().reverse();
  function writeGoals(ng) { if (canWrite(api)) api.setVariable("goals", ng); }
  var notices = noticeCount(v); var ms = activeMissions(v);
  var ps0 = React.useState([]); var passages = ps0[0], setPassages = ps0[1];
  React.useEffect(function () { loadPassages(api, setPassages); }, [tab]);
  function dropPassage(id) { var n = passages.filter(function (x) { return x.id !== id; }); setPassages(n); storePassages(api, n); }
  var body = null;
  if (tab === "missions") body = <MissionsView api={api} />;
  else if (tab === "notices") body = <NoticesView api={api} />;
  else body = (
    <div>
      <SectionHead icon="star" iconSize={24} title="Your goals" />
      <Frame pad="6px 14px 12px" style={{ marginBottom: 14 }}>
        {goals.length ? goals.map(function (g, i) {
          var active = !g.status || g.status === "active";
          return (
            <div key={i} style={{ padding: "9px 0", borderBottom: "1px solid " + C.lineSoft }}>
              <div style={{ fontSize: 16, color: active ? C.ivory : C.muted }}>{str(g.goal)}{active ? "" : " (" + str(g.status) + ")"}</div>
              {active ? <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <Btn small disabled={busy} onClick={function () { var ng = goals.slice(); ng[i] = Object.assign({}, g, { status: "done" }); writeGoals(ng); }}>Mark done</Btn>
                <Btn small disabled={busy} onClick={function () { var ng = goals.slice(); ng[i] = Object.assign({}, g, { status: "abandoned" }); writeGoals(ng); }}>Let it go</Btn>
              </div> : null}
            </div>
          );
        }) : <Empty>No goals yet. You don't need one; you can simply live.</Empty>}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input className="bc-in" aria-label="New goal" placeholder="For example: buy my own house" value={goalText} onChange={function (e) { setGoalText(e.target.value); }} />
          <Btn kind="gold" disabled={busy || !goalText.trim()} onClick={function () { writeGoals(goals.concat([{ goal: goalText.trim(), status: "active", set_on: str(v.world_date) }])); setGoalText(""); }}>Add</Btn>
        </div>
      </Frame>
      {passages.length ? <SectionHead icon="bookmark" iconSize={22} title="Saved passages" sub="Moments you kept from the story. Private, never sent to the AI." /> : null}
      {passages.slice().reverse().map(function (x) {
        return (
          <Frame key={x.id} pad="10px 13px" style={{ marginBottom: 8 }}>
            <div className="bc-passage-meta"><span>{[str(x.date), str(x.place)].filter(Boolean).join(" \u00b7 ")}</span><button type="button" onClick={function () { dropPassage(x.id); }} aria-label="Remove passage">Remove</button></div>
            <div className="bc-passage-text">{str(x.text)}</div>
          </Frame>
        );
      })}
      <SectionHead icon="doc" iconSize={24} title="Life Log" sub="The events that shaped your mage’s journey." />
      {ch.length ? ch.map(function (c, i) {
        return <Frame key={i} pad="10px 13px" style={{ marginBottom: 8 }}><div style={{ fontSize: 13.5, color: C.gold, fontWeight: 700 }}>{str(c.date)}</div><div style={{ fontFamily: DISPLAY, fontSize: 16.5, color: C.ivory }}>{str(c.title)}</div>{c.summary ? <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.45 }}>{str(c.summary)}</div> : null}</Frame>;
      }) : <Empty>Your history begins with your first day.</Empty>}
    </div>
  );
  return (
    <div>
      <div className="bc-chiprow" style={{ marginBottom: 12 }}>
        <Chip icon="doc" on={tab === "chronicle"} onClick={function () { setTab("chronicle"); }}>Life Log</Chip>
        <Chip icon="scroll" on={tab === "missions"} onClick={function () { setTab("missions"); }}>{"Assignments" + (ms ? " (" + ms + ")" : "")}</Chip>
        <Chip icon="bell" on={tab === "notices"} onClick={function () { setTab("notices"); }}>{"Reports" + (notices ? " (" + notices + ")" : "")}</Chip>
      </div>
      {body}
    </div>
  );
}

/* ---------- crown: squad, rank and standing ---------- */
function CrownView(p) {
  var v = p.api.variables || {}; var rep = obj(v.reputation); var keys = Object.keys(rep);
  return (
    <div>
      <SquadView api={p.api} toStory={p.toStory} />
      <BattleRecord v={v} />
      <SectionHead icon="crown" iconSize={24} title="Standing" sub="How communities and institutions see you." />
      {keys.length ? <Frame pad="4px 14px 8px">{keys.map(function (k) { var r = rep[k]; return <Row key={k} k={k} v={typeof r === "object" && r ? [str(r.band), str(r.note)].filter(Boolean).join(" — ") : str(r)} />; })}</Frame> : <Empty>No one outside your home has formed an opinion of you yet.</Empty>}
    </div>
  );
}

var MENU_ITEMS = [["character", "Character", "Profile, skills and condition", "bust"], ["train", "Training", "Set up a block of practice", "dumbbell"], ["time", "Let Time Pass", "Skip ahead, or live your routine", "hourglass"],
  ["routine", "Routine", "Your usual day", "sun"], ["codex", "Codex", "What your character knows", "book"], ["household", "Home and Family", "Where you live and who with", "home"],
  ["art", "Artwork", "Put your own paintings into the interface", "star"], ["settings", "Settings", "How the world runs and reads", "gear"], ["help", "Help", "Commands and how this works", "info"]];
function MenuView(p) {
  return (
    <Frame pad="4px 10px">
      {MENU_ITEMS.map(function (m) {
        return <ActionRow key={m[0]} icon={m[3]} title={m[1]} sub={m[2]} onClick={function () { p.go(m[0]); }} />;
      })}
    </Frame>
  );
}

/* ---------- page shell ---------- */
var PAGE_HERO = {
  grimoire: { title: "Grimoire", sub: "Spells. Attributes. Progress.", quote: "“Every spell begins with a single page.”", quoteBy: "Asta", img: "grim_head", big: true, right: false },
  map: { title: "World Map", sub: "Travel · Discover · Plan", tagline: "Explore the Clover Kingdom and beyond. New places, people, and stories await.", big: true, right: "compass" },
  pack: { title: "Satchel & Treasury", sub: "Equipment · Trading · Banking", tagline: "All you carry, earn and keep." },
  people: { title: "Connections", sub: "Allies · Rivals · Relationships", big: true },
  journal: { title: "Kingdom Records", sub: "Life Log · Assignments · Reports", big: true },
  bound: { title: "Mystic Pacts", sub: "Spirit Companions · Devil Contracts", big: true },
  crown: { title: "Renown & Rank", sub: "Magic Knights · Merit · Reputation", big: true },
  menu: { title: "More", sub: "Life · Codex · Settings", big: true }
};
var TITLES = { grimoire: "Grimoire", character: "Mage Profile", squad: "Renown & Rank", crown: "Renown & Rank", pack: "Satchel & Treasury", bank: "Satchel & Treasury", market: "Satchel & Treasury", missions: "Kingdom Records", map: "Kingdom Atlas", people: "Connections", notices: "Kingdom Records",
  journal: "Kingdom Records", bound: "Mystic Pacts", menu: "More", train: "Training", time: "Let Time Pass", routine: "Routine", codex: "Codex", household: "Home and Family", art: "Artwork", settings: "Settings", help: "Help" };
function Page(p) {
  var hero = PAGE_HERO[p.heroKey] || { title: p.title, sub: dayMonthWD(p.date) ? dayMonthWD(p.date) + " · " + clock12(p.time) : "", big: true };
  return (
    <div className="bc-fill bc-page">
      <Hero bannerUrl={p.bannerUrl} title={hero.title} sub={hero.sub} tagline={hero.tagline} quote={hero.quote} quoteBy={hero.quoteBy} img={hero.img} big={hero.big}
        right={hero.right === undefined ? "kingdom" : hero.right} kingdom={p.kingdom} onBack={p.onBack} />
      <div className="bc-scroll bc-page-scroll"><div className="bc-wrap bc-fade bc-page-inner" key={p.title}>{p.children}</div></div>
    </div>
  );
}

/* ---------- background bookkeeping (no AI, no chat) ----------
   Keeps what the AI reads each turn small: archives old chronicle pages and
   resolved events, files authorized knight bonuses into payroll, trims spent
   spell events, and maintains a one-line bank summary instead of exposing
   the full ledgers to the AI. */
function useHousekeeping(api) {
  var v = (api && api.variables) || {};
  var sig = JSON.stringify([v.chronicle, v.known_events, v.mk_bonus_requests, v.bank_account, v.mk_status, v.mk_payroll && v.mk_payroll.totalPaid, v.mk_payroll && v.mk_payroll.cyclesPaid, v.bank_summary, v.spell_events, v.spell_ledger && v.spell_ledger.seq, v.world_date, v.character_created]);
  var attempted = React.useRef("");
  React.useEffect(function () {
    if (!isTrue(v.character_created) || !canWrite(api) || attempted.current === sig) return;
    var patch = {};
    var chron = arr(v.chronicle);
    if (chron.length > 24) { var cut = chron.length - 20; patch.chronicle = chron.slice(cut); patch.chronicle_archive = arr(v.chronicle_archive).concat(chron.slice(0, cut)).slice(-400); }
    var evs = arr(v.known_events); var resolved = evs.filter(function (e) { return e && /^(done|missed|taken|resolved|expired)$/i.test(str(e.status)); });
    if (resolved.length > 5) {
      var old = resolved.slice(0, resolved.length - 5);
      patch.known_events = evs.filter(function (e) { return old.indexOf(e) < 0; });
      patch.events_archive = arr(v.events_archive).concat(old).slice(-300);
    }
    var reqs = arr(v.mk_bonus_requests);
    // Wait while a payroll transition is pending so the two writers never race on mk_payroll.
    if (reqs.length && !bcMKPayrollStep(v)) {
      var pay = obj(v.mk_payroll); var awards = arr(pay.bonusAwards).slice();
      reqs.forEach(function (r) {
        r = obj(r); var id = str(r.id).trim(); var amt = Math.floor(num(r.amount, 0));
        if (!id || amt <= 0 || awards.some(function (a) { return a && a.id === id; })) return;
        awards.push({ id: id, amount: amt, reason: str(r.reason) || "Approved service merit", source: str(r.source) || "Squad command", status: "approved", filed: str(v.world_date) });
      });
      patch.mk_payroll = Object.assign({}, pay, { bonusAwards: awards.slice(-80) });
      patch.mk_bonus_requests = [];
    }
    var done = arr(obj(v.spell_ledger).processed); var events = arr(v.spell_events);
    if (events.length) {
      var pending = events.filter(function (e) { return !(e && done.indexOf(str(e.id)) >= 0); });
      if (pending.length !== events.length) patch.spell_events = pending;
    }
    var bank = bcBankState(v.bank_account); var mk = obj(v.mk_status); var comp = bcMKMonthly(mk.rank, mk.personal_stars); var payday = bcMKNextPayday(v);
    var summary = (bank.open ? "Account open, balance " + bcMoney(bank.balance) : "No bank account") +
      (comp.total > 0 ? "; knight pay " + bcMoney(comp.total) + "/month" + (payday ? ", next payday " + payday : "") : "") + ".";
    if (summary !== str(v.bank_summary)) patch.bank_summary = summary;
    if (!Object.keys(patch).length) { attempted.current = sig; return; }
    attempted.current = sig;
    bcPatch(api, patch, function (ok) { if (!ok) attempted.current = ""; });
  }, [sig, !!(api && api.isStreaming)]);
}
function Game(p) {
  var api = p.api; var art = p.art; var v = api.variables || {}; var streaming = !!api.isStreaming;
  useTrainResultWatcher(api);
  useTravelResultWatcher(api);
  useInventoryConsistency(api);
  useAgeSyncWatcher(api);
  useMKPayroll(api);
  useSpellStateSync(api);
  useSpellEventWatcher(api);
  useHousekeeping(api);
  useAiLabeler(api);
  useSquadRoster(api);
  var vs = React.useState("home"); var view = vs[0], setView = vs[1];
  var hs = React.useState([]); var hist = hs[0], setHist = hs[1];
  var prs = React.useState(null); var preset = prs[0], setPreset = prs[1];
  var pf = React.useState("inventory"); var packFocus = pf[0], setPackFocus = pf[1];
  var sts = React.useState(""); var storySheet = sts[0], setStorySheet = sts[1];
  var bts = React.useState(null); var battle = bts[0], setBattle = bts[1];
  function openBattle(mode) { if (api.isStreaming) return; setStorySheet(""); setBattle({ mode: mode, k: Date.now() }); }
  var was = React.useRef(false);
  React.useEffect(function () { if (streaming && !was.current) { setView("story"); setHist([]); } was.current = streaming; }, [streaming]);
  function route(n) {
    if (n === "bank" || n === "market") { setPackFocus(n); return "pack"; }
    if (n === "pack") setPackFocus("inventory");
    if (n === "squad") return "crown";
    return n;
  }
  function go(n) { var t = route(n); setHist(hist.concat([view])); setView(t === "missions" || t === "notices" ? "journal:" + t : t); }
  function back() { var h = hist.slice(); var prev = h.length ? h.pop() : "home"; setHist(h); setView(prev); }
  function nav(n) { setHist([]); setView(route(n)); }
  function toStory() { setHist([]); setView("story"); }
  function goTrain(focus, target) { setPreset({ focus: focus, target: target }); go("train"); }
  var bannerUrl = artFor(api, art.art, "banner");
  var loc = parseLoc(v.current_location); var cp = obj(v.creation_profile);
  var kingdom = kingdomLabel(loc.kingdom || cp.homeland) || "Clover Kingdom";
  var base = view.split(":")[0]; var tab = view.split(":")[1] || "";
  var main = null;
  if (base === "home") main = <HomeView api={api} art={art} bannerUrl={bannerUrl} go={go} />;
  else if (base === "story") main = <StoryView api={api} art={art} bannerUrl={bannerUrl} onBack={function () { nav("home"); }} go={go} sheet={storySheet} setSheet={setStorySheet} openBattle={openBattle} />;
  else {
    var inner = null;
    if (base === "grimoire") inner = <GrimoireView api={api} art={art} goTrain={goTrain} toStory={toStory} goBound={function () { go("bound"); }} />;
    else if (base === "character") inner = <CharacterView api={api} portrait={art.portrait} setPortrait={art.setPortrait} hasStore={art.hasStore} mediaError={art.mediaError} />;
    else if (base === "crown") inner = <CrownView api={api} toStory={toStory} />;
    else if (base === "pack") inner = <PackView api={api} toStory={toStory} focus={packFocus} setFocus={setPackFocus} />;
    else if (base === "map") inner = <MapView api={api} toStory={toStory} />;
    else if (base === "people") inner = <PeopleView api={api} art={art} />;
    else if (base === "bound") inner = <BoundView api={api} art={art} />;
    else if (base === "journal") inner = <JournalView api={api} tab={tab || "chronicle"} />;
    else if (base === "train") inner = <div><SparCard api={api} onSpar={function () { openBattle("spar"); }} /><TrainingPanel api={api} preset={preset} toStory={toStory} /></div>;
    else if (base === "time") inner = <TimeView api={api} toStory={toStory} />;
    else if (base === "routine") inner = <RoutineView api={api} />;
    else if (base === "codex") inner = <CodexView api={api} toStory={toStory} />;
    else if (base === "household") inner = <HouseholdView api={api} />;
    else if (base === "art") inner = <ArtView api={api} art={art} />;
    else if (base === "settings") inner = <SettingsView api={api} toStory={toStory} />;
    else if (base === "help") inner = <HelpView />;
    else inner = <MenuView go={go} />;
    main = <Page title={TITLES[base] || ""} heroKey={base} onBack={hist.length ? back : function () { nav("home"); }} bannerUrl={bannerUrl} kingdom={kingdom} date={v.world_date} time={v.world_time}>{inner}</Page>;
  }
  return (
    <div className="bc-fill bc-game" style={{ background: PAGE_BG }}>
      <style>{BATTLE_CSS + "\n" + WORLDMAP_CSS}</style>
      {battle ? <BattleArena key={battle.k} v={v} mode={battle.mode} portrait={art.portrait} spellCat={spellCat}
        onCancel={function () { setBattle(null); }}
        onFinish={function (r, again) { applyBattle(api, v, r); setBattle(again ? { mode: battle.mode, k: Date.now() } : null); if (r.mode !== "spar") toStory(); }} /> : null}
      <main className="bc-main-area">{main}</main>
      {base === "story" ? <Composer api={api} sheet={storySheet} onPlus={function () { setStorySheet(storySheet === "actions" ? "" : "actions"); }} /> : null}
      <Nav view={base} nav={nav} notices={noticeCount(v)} missions={activeMissions(v)} />
    </div>
  );
}

var IDEAS = ["I take a slow look around and listen.", "I ask the nearest person what's new around here.", "I check what I'm carrying and tidy my things.", "I practice a small, controlled bit of my magic.", "I find somewhere quiet to think about what to do next.", "I go looking for honest work.", "I head somewhere I haven't been yet.", "I write a short letter to someone I care about."];
function composerIdea(v, random) {
  var chips = (CTX[str(v.scene_type)] || CTX.other).map(function (c) { return c + "."; });
  var goals = arr(v.goals).filter(function (g) { return g && (!g.status || g.status === "active"); });
  var ups = arr(v.known_events).filter(function (e) { return e && (e.kind === "upcoming" || e.kind === "opportunity") && (!e.status || e.status === "known"); });
  var focused = [];
  if (goals.length) focused.push("I work toward my goal: " + str(goals[0].goal).replace(/\.$/, "") + ".");
  if (ups.length) focused.push("I prepare for " + str(ups[0].title).replace(/\.$/, "") + ".");
  var pool = random ? chips.concat(IDEAS).concat(focused) : focused.concat(chips);
  return random ? pool[Math.floor(Math.random() * pool.length)] : pool[0];
}
function Composer(p) {
  var api = p.api; var busy = !!api.isStreaming; var v = api.variables || {};
  return (
    <div className="bc-composer">
      {api.error ? <div role="alert" className="bc-composer-err">{"The GM couldn't answer: " + str(api.error) + ". Send your message again."}</div> : null}
      <MessageInput />
    </div>
  );
}
/* ---------- creator pieces ---------- */
function Stepper(p) {
  return (
    <div className="bc-stepper" role="list">
      <div className="bc-stepper-line" aria-hidden="true" />
      {STEPS.map(function (s, i) {
        var active = i === p.page, done = i < p.page;
        return (
          <button key={s} type="button" role="listitem" className={"bc-step" + (active ? " bc-step-on" : "") + (done ? " bc-step-done" : "")} onClick={function () { if (done) p.go(i); }} aria-current={active ? "step" : undefined} aria-label={"Step " + (i + 1) + ": " + s}>
            <span className="bc-step-dot">{active && i === STEPS.length - 1 ? <Icon n="clover" s={18} /> : i + 1}</span>
            <span className="bc-step-label">{s}</span>
          </button>
        );
      })}
    </div>
  );
}
function TileGrid(p) {
  return (
    <div role="radiogroup" aria-label={p.label} className={"bc-tilegrid" + (p.cls ? " " + p.cls : "")} style={{ gridTemplateColumns: "repeat(" + (p.cols || p.items.length) + ", minmax(0,1fr))" }}>
      {p.items.map(function (t) {
        var on = p.value === t.v;
        return (
          <button key={t.v} type="button" role="radio" aria-checked={on ? "true" : "false"} aria-label={t.t.replace("\n", " ")} className={"bc-tilebtn" + (on ? " bc-tilebtn-on" : "")} onClick={function () { p.onChange(t.v); }}>
            <Icon n={t.icon} s={p.iconSize || 26} fill={t.fill || (on ? "url(#bcg-gold)" : "#c9b892")} />
            <span className="bc-tilebtn-t">{t.t}</span>
            {t.d ? <span className="bc-tilebtn-d">{t.d}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
function PanelHead(p) {
  return (
    <div className={"bc-phead" + (p.art ? " bc-phead-art" : "")}>
      {p.art ? <img className="bc-phead-img" src={img(p.art)} alt="" /> : null}
      <span className="bc-phead-icon">{p.icon ? <Icon n={p.icon} s={40} /> : <svg width="46" height="46" viewBox="-32 -32 64 64" aria-hidden="true"><Insignia kind="clover" leaves={3} color="url(#bcg-gold)" /></svg>}</span>
      <span className="bc-phead-text"><strong>{p.title}</strong><small>{p.sub}</small></span>
    </div>
  );
}
function CField(p) {
  return <div className={"bc-cbox" + (p.cls ? " " + p.cls : "")}><div className="bc-cbox-label">{p.label}{p.note ? <small>{p.note}</small> : null}</div>{p.children}{p.hint ? <div className="bc-cbox-hint">{p.hint}</div> : null}</div>;
}
function ListOpt(p) {
  return (
    <button type="button" role="radio" aria-checked={p.on ? "true" : "false"} className={"bc-listopt" + (p.on ? " bc-listopt-on" : "")} onClick={p.onClick}>
      <span className="bc-listopt-icon">{p.sym ? <span className="bc-sym" style={{ color: p.accent || C.goldHi }}>{p.sym}</span> : <Icon n={p.icon || "clover"} s={26} />}</span>
      <span className="bc-listopt-text"><strong>{p.title}{p.tag ? <em>{p.tag}</em> : null}</strong>{p.desc ? <small>{p.desc}</small> : null}</span>
      <Icon n="chevr" s={14} />
    </button>
  );
}
function GreenRibbon(p) {
  return (
    <div className="bc-greenrib" style={{ opacity: p.disabled ? 0.6 : 1 }}>
      <button type="button" aria-label={p.label} disabled={p.disabled} onClick={p.onClick}><span><Icon n="clover" s={24} fill="url(#bcg-gold)" />{p.children}<Icon n="clover" s={24} fill="url(#bcg-gold)" /></span></button>
    </div>
  );
}
// UI-only titles: the stable OPENINGS values remain unchanged for lore / era routing and old saves.
var OPENING_DISPLAY = {
  "The Grimoire Acceptance Ceremony": "Ceremony Day · At the Grimoire Tower",
  "The months before the Entrance Exam": "Training Season · Before the Magic Knights Exam",
  "Right after the Entrance Exam": "Knight Selection · After the Entrance Exam",
  "Asta and Yuno's first year as Magic Knights": "Rising Knights · Asta and Yuno's First Year"
};
function openingDisplay(value) { return OPENING_DISPLAY[value] || value; }
function OpeningSheet(p) {
  var opts = OPENINGS[p.era] || [];
  return (
    <Sheet title="Opening Preference" onClose={p.close}>
      {p.era === "later" ? <div style={{ fontSize: 14.5, color: C.muted, marginBottom: 10 }}>Details stay hidden at your spoiler level. The world knows what has happened; you'll find out by living.</div> : null}
      {opts.map(function (o, i) {
        return <Opt key={o} on={p.value === o} title={openingDisplay(o)} tag={p.era === "during" && i === 0 ? "Suggested Start" : null} onClick={function () { p.onPick(o); p.close(); }} />;
      })}
    </Sheet>
  );
}
var ERA_TILES = [
  { v: "before", t: "Before\nMain Story", icon: "sun" }, { v: "during", t: "During\nCanon", icon: "clover" }, { v: "later", t: "Later", icon: "compass" },
  { v: "after", t: "Post-Canon\nFuture", icon: "hourglass" }, { v: "custom", t: "Custom", icon: "book" }
];
var ORIGIN_ICON = { Royal: "crown", Noble: "fleur", Commoner: "people", Peasant: "wheat", Custom: "feather" };
function originIcon(v) { if (ORIGIN_ICON[v]) return ORIGIN_ICON[v]; if (/royal|loyalist/i.test(v)) return "crown"; if (/military|guardian|resistance/i.test(v)) return "shield"; if (/scholar|mage/i.test(v)) return "book"; if (/merchant|mining/i.test(v)) return "coins"; if (/agricult|rural|poor|labor/i.test(v)) return "wheat"; if (/orphan|displaced|wanderer/i.test(v)) return "compass"; if (/witch/i.test(v)) return "wisp"; if (/sun/i.test(v)) return "sun"; return "people"; }
function householdIcon(v) { if (/urban|city/i.test(v)) return "castle"; if (/merchant/i.test(v)) return "coins"; if (/artisan|labor/i.test(v)) return "hammer"; if (/military/i.test(v)) return "shield"; if (/farm|rural|village/i.test(v)) return "home"; if (/church|orphan/i.test(v)) return "book"; if (/house|cadet|royal/i.test(v)) return "crown"; if (/noble/i.test(v)) return "fleur"; if (/custom/i.test(v)) return "feather"; return "home"; }
var REGION_ART = { "Forsaken Realm": "region_forsaken", "Common Realm": "region_common", "Noble Realm": "region_noble" };
var REGION_DESC = { "Forsaken Realm": "Rough lands and resilient people. A place for those who endure.", "Common Realm": "Bustling towns and hardworking communities. Where ordinary dreams take root.", "Noble Realm": "Prestige, tradition, and influence. A land of distinguished bloodlines and high expectations." };
var PLACE_ARTS = ["place_rural", "place_outskirts", "place_market", "place_castle"];
var ATTR_FILL = { Fire: "#e8663c", Water: "#4aa3e8", Wind: "#5fd1a9", Earth: "#b98d5a", Lightning: "#f2c94c", Plant: "#6cc15a", Ice: "#9fd8f2", Sand: "#d9b46a", Smoke: "#a8adb5", Stone: "#b8bcc4", Steel: "#c9ced6", Sound: "#b48ae8", Cotton: "#f0ece2", Thread: "#d9b463", Mirror: "#8fd0f0", Poison: "#9b6ad6", Ash: "#8c8c8c" };

/* ---------- creator ---------- */
function Creator(p) {
  var api = p.api; var art = p.art;
  var fs = React.useState(function () { var saved = obj(api && api.variables ? api.variables.creation_profile : null); return Object.assign({}, BLANK, saved && saved.name ? saved : {}); });
  var f = fs[0], setF = fs[1];
  var ps = React.useState(0); var page = ps[0], setPage = ps[1];
  var bs = React.useState(false); var busy = bs[0], setBusy = bs[1];
  var es = React.useState(""); var err = es[0], setErr = es[1];
  var shs = React.useState(""); var sheet = shs[0], setSheet = shs[1];
  var ws = React.useState(false); var worldOpen = ws[0], setWorldOpen = ws[1];
  var scRef = React.useRef(null);
  function set(k, val) { setErr(""); setF(function (o) { var n = Object.assign({}, o); n[k] = val; return n; }); }
  function setMany(m) { setErr(""); setF(function (o) { return Object.assign({}, o, m); }); }
  function go(n) { setErr(""); setPage(n); if (scRef.current) scRef.current.scrollTop = 0; }
  function problem(pg) {
    if (pg === 0) {
      if (!str(f.name).trim()) return "Give your character a name to continue.";
      if (!f.sex) return "Choose your character's gender to continue.";
      if (!(num(f.age, 0) >= 1)) return "Enter an age to continue.";
      if (f.era === "custom" && !str(f.era_detail).trim()) return "Describe when your custom start takes place.";
      if (f.era !== "custom" && !f.opening) return "Choose an opening.";
    }
    if (pg === 1) {
      if (!f.homeland) return "Choose your homeland.";
      if (!f.origin) return "Choose a social origin.";
      if (f.origin === "Custom" && !str(f.origin_note).trim()) return "Describe your custom background.";
    }
    if (pg === 2) {
      if (f.magic_mode === "Choose" && !f.attribute_choice) return "Pick an attribute, or switch to Random.";
      if (f.magic_mode === "Describe" && !str(f.attribute_custom).trim()) return "Describe your magic, or switch to Random.";
    }
    if (pg === 3) {
      if (!f.settlement) return "Choose where you live, or describe a place of your own.";
      if (f.settlement_mode === "custom" && !str(f.custom_place).trim()) return "Describe your custom home.";
    }
    return "";
  }
  function next() { var bad = problem(page); if (bad) { setErr(bad); return; } go(page + 1); }
  function commit() {
    for (var i = 0; i < 4; i++) { var bad = problem(i); if (bad) { setErr(bad); setPage(i); return; } }
    var name = str(f.name).trim();
    var prof = Object.assign({}, f, { name: name, age: clamp(num(f.age, 15), 1, 120), era: eraCode(f), era_group: f.era,
      era_detail: f.era === "custom" ? f.era_detail : f.opening,
      leanings: f.talent_mode === "Guided" ? { reserves: f.lean_reserves, control: f.lean_control, physique: f.lean_physique } : null });
    var birthMonth = f.birth_month || "March"; var birthDay = clamp(num(f.birth_day, 14), 1, MONTH_LEN[MONTHS.indexOf(birthMonth)]);
    var birthYear = 0 - prof.age;
    var birthDate = birthDay + " " + birthMonth + ", CY " + birthYear;
    var settings = { canon_guidance: f.canon_guidance, canon_participation: f.canon_participation, interruptions: f.interruptions,
      narrative_density: f.narrative_density, spoiler_level: f.spoiler_level, content_continuity: f.content_continuity, consequences: f.consequences, show_numbers: false };
    var payload = {
      creation_profile: prof, sim_settings: settings, player_name: name, player_age: prof.age,
      player_profile: { sex: f.sex, appearance: f.appearance, personality: f.personality, homeland: f.homeland, social_origin: f.origin + (f.origin_detail ? " (" + f.origin_detail + ")" : ""), race: f.race, birth_date: birthDate },
      character_created: true
    };
    var msg = "✦ BEGIN LIFE ✦ " + name + " opens their eyes.";
    setBusy(true); setErr("");
    try {
      if (typeof api.patchVariables === "function") {
        var pr = api.patchVariables(payload);
        if (pr && typeof pr.then === "function") {
          pr.then(function () { api.sendMessage(msg); }, function () { setBusy(false); setErr("Your choices could not be saved. Check your connection, then press Begin Life again."); });
        } else { setTimeout(function () { api.sendMessage(msg); }, 400); }
      } else if (typeof api.setVariable === "function") {
        Object.keys(payload).forEach(function (k) { if (k !== "character_created") api.setVariable(k, payload[k]); });
        api.setVariable("character_created", true);
        setTimeout(function () { api.sendMessage(msg); }, 600);
      } else { setBusy(false); setErr("This preview cannot save choices. Open the world in play mode to begin."); }
    } catch (e) { setBusy(false); setErr("Saving failed: " + (e && e.message ? e.message : "unknown error") + ". Press Begin Life to try again."); }
  }

  var origins = ORIGINS[f.homeland] || []; var originObj = null;
  origins.forEach(function (o) { if (o.v === f.origin) originObj = o; });
  var regions = PLACES[f.homeland] || []; var regionObj = null;
  regions.forEach(function (r) { if (r.r === f.region) regionObj = r; });
  var body = null; var head = null;
  if (page === 0) {
    head = <PanelHead title="I. Identity" sub="Every legend begins with a name." />;
    body = (
      <div>
        <CField label="Name"><div className="bc-namebox"><input className="bc-in" aria-label="Name" value={f.name} maxLength={60} placeholder="Enter your name..." onChange={function (e) { set("name", e.target.value); }} /><Icon n="feather" s={18} fill="#9a8d6e" /></div></CField>
        <CField label="Gender">
          <div role="radiogroup" aria-label="Gender" className="bc-gender">
            <Toggle on={f.sex === "Male"} icon={"♂"} onClick={function () { set("sex", "Male"); }}>Male</Toggle>
            <Toggle on={f.sex === "Female"} icon={"♀"} onClick={function () { set("sex", "Female"); }}>Female</Toggle>
          </div>
        </CField>
        <div className="bc-cgrid2">
          <CField label="Age">
            <div className="bc-agebox">
              <button type="button" aria-label="Younger" onClick={function () { set("age", clamp(num(f.age, 15) - 1, 1, 120)); }}><Icon n="chevl" s={15} /></button>
              <input aria-label="Age" inputMode="numeric" value={str(f.age)} onChange={function (e) { set("age", e.target.value.replace(/[^0-9]/g, "")); }} />
              <button type="button" aria-label="Older" onClick={function () { set("age", clamp(num(f.age, 15) + 1, 1, 120)); }}><Icon n="chevr" s={15} /></button>
            </div>
          </CField>
          <CField label="Birthday">
            <div className="bc-bdaybox">
              <select aria-label="Birth month" value={f.birth_month || "March"} onChange={function (e) { set("birth_month", e.target.value); }} className="bc-in">
                {MONTHS.map(function (m) { return <option key={m} value={m}>{m}</option>; })}
              </select>
              <select aria-label="Birth day" value={str(f.birth_day || 14)} onChange={function (e) { set("birth_day", num(e.target.value, 14)); }} className="bc-in">
                {Array.from({ length: MONTH_LEN[MONTHS.indexOf(f.birth_month || "March")] }, function (_, i) { return <option key={i} value={String(i + 1)}>{i + 1}</option>; })}
              </select>
            </div>
          </CField>
        </div>
        <CField label="Appearance">
          <button type="button" className="bc-appearbtn" aria-label="Customize appearance" onClick={function () { setSheet("appearance"); }}>
            <img className="bc-appearbtn-art" src={img("ident_appear")} alt="" />
            <span className="bc-appearbtn-icon">{art.portrait ? <img src={art.portrait} alt="" /> : <Icon n="bust" s={32} fill="#cbbf9f" />}</span>
            <span className="bc-appearbtn-text"><strong>Customize Appearance</strong><small>{f.appearance || "Define your look, style, and presence."}</small></span>
            <Icon n="chevr" s={14} />
          </button>
        </CField>
        <CField label="Story Timing"><TileGrid label="Story timing" items={ERA_TILES} value={f.era} onChange={function (x) { setMany({ era: x, opening: x === "custom" ? "" : OPENINGS[x][0] }); }} /></CField>
        {f.era === "custom" ? (
          <CField label="Your start" hint="For example: two years after Asta joined the Black Bulls.">
            <input className="bc-in" aria-label="Custom start" value={f.era_detail} placeholder="When does your story begin?" onChange={function (e) { set("era_detail", e.target.value); }} />
          </CField>
        ) : (
          <CField label="Opening Preference">
            <button type="button" className="bc-openbtn" aria-label="Opening preference" onClick={function () { setSheet("opening"); }}>
              <Icon n="book" s={28} />
              <span><strong>{openingDisplay(f.opening) || "Choose an opening"}</strong>{f.era === "during" && f.opening === OPENINGS.during[0] ? <small>Suggested Start</small> : null}</span>
              <Icon n="chevr" s={14} />
            </button>
          </CField>
        )}
      </div>
    );
  } else if (page === 1) {
    head = <PanelHead title="II. Background" sub="Your past shapes your path. Choose where you come from and who raised you." icon="scroll" art="bg_head" />;
    body = (
      <div>
        <CField label="Homeland" note="Every kingdom is a complete life in one shared world.">
          <div className="bc-kingdoms" role="radiogroup" aria-label="Homeland">
            {KINGDOMS.map(function (k) {
              var on = f.homeland === k.v;
              return <button key={k.v} type="button" role="radio" aria-checked={on ? "true" : "false"} className={"bc-kchip" + (on ? " bc-kchip-on" : "")} onClick={function () { if (f.homeland !== k.v) setMany({ homeland: k.v, origin: "", origin_detail: "", region: "", settlement: "", settlement_mode: "", custom_place: "" }); }}><span style={{ color: KCOL[k.v] }}>{k.sym}</span>{k.v}</button>;
            })}
          </div>
          {f.homeland ? <div className="bc-cbox-hint">{(KINGDOMS.filter(function (k) { return k.v === f.homeland; })[0] || {}).d}</div> : null}
        </CField>
        {f.homeland ? (
          <CField label="Social Origin" note="Origin shapes opportunity and how people treat you.">
            <div role="radiogroup" aria-label="Social origin">{origins.map(function (o) { return <ListOpt key={o.v} on={f.origin === o.v} icon={originIcon(o.v)} title={o.v} desc={o.d} onClick={function () { if (f.origin !== o.v) setMany({ origin: o.v, origin_detail: "" }); }} />; })}</div>
          </CField>
        ) : null}
        {originObj && originObj.subs && originObj.subs.length ? (
          <CField label="Household">
            <TileGrid label="Household" cls="bc-tilegrid-row" cols={3} iconSize={22} items={originObj.subs.map(function (s) { return { v: s, t: s, icon: householdIcon(s) }; })} value={f.origin_detail} onChange={function (x) { set("origin_detail", x); }} />
          </CField>
        ) : null}
        {f.origin === "Custom" ? <CField label="Describe your background"><textarea className="bc-in bc-ta" aria-label="Custom background" value={f.origin_note} onChange={function (e) { set("origin_note", e.target.value); }} /></CField> : null}
        {f.homeland ? (
          <CField label="Family" note="Your family gives you roots, or the freedom to forge your own.">
            <TileGrid label="Family" cls="bc-tilegrid-row" cols={3} iconSize={22} items={[{ v: "Generated family", t: "Generated family", icon: "people" }, { v: "Custom family", t: "Custom family", icon: "feather" }, { v: "Independent or orphaned", t: "Independent or orphaned", icon: "link" }]} value={f.family_mode} onChange={function (x) { set("family_mode", x); }} />
            {f.family_mode === "Custom family" ? <textarea className="bc-in bc-ta" style={{ marginTop: 8 }} aria-label="Family notes" placeholder="Parents, siblings, circumstances" value={f.family_note} onChange={function (e) { set("family_note", e.target.value); }} /> : null}
          </CField>
        ) : null}
        <CField label="Additional Details (Optional)">
          <div className="bc-countbox">
            <textarea className="bc-in bc-ta" aria-label="Background notes" maxLength={500} placeholder="Add any details about your family, background, or upbringing..." value={f.homeland_note} onChange={function (e) { set("homeland_note", e.target.value); }} />
            <small>{str(f.homeland_note).length + "/500"}</small>
          </div>
        </CField>
      </div>
    );
  } else if (page === 2) {
    var MAGIC_TILES = [{ v: "Random", t: "Random", d: "Let the world decide from your lineage and life.", icon: "dice" }, { v: "Choose", t: "Choose an attribute", d: "Select an elemental path or rare attribute.", icon: "clover" }, { v: "Describe", t: "Describe my own", d: "Create a unique magic based on your ideas.", icon: "quill" }];
    head = <PanelHead title="III. Magic & Grimoire" sub="Your mana is yours. The grimoire chooses later." />;
    body = (
      <div>
        <CField label="Your Magic" note="How you shape the world begins here. Choose or describe your magic.">
          <TileGrid label="Your magic" cls="bc-tilegrid-cards" items={MAGIC_TILES} iconSize={34} value={f.magic_mode} onChange={function (x) { set("magic_mode", x); }} />
        </CField>
        {f.magic_mode === "Choose" ? (
          <CField label="Attribute" note="Rarer attributes are harder to control but can lead to extraordinary power.">
            <div className="bc-attrgrid" role="radiogroup" aria-label="Attribute">
              {ATTRS.map(function (a) {
                var on = f.attribute_choice === a; var base = a.replace(/\s*\(.*\)/, "");
                return <button key={a} type="button" role="radio" aria-checked={on ? "true" : "false"} className={"bc-attrbtn" + (on ? " bc-attrbtn-on" : "") + (/rare/.test(a) ? " bc-attrbtn-wide" : "")} onClick={function () { set("attribute_choice", a); }}><Icon n={attrIcon(base)} s={18} fill={ATTR_FILL[base] || (base === "Light" ? "#f5d76e" : base === "Dark" ? "#9b7be0" : "#b48ae8")} />{a}</button>;
              })}
            </div>
          </CField>
        ) : null}
        {f.magic_mode === "Describe" ? (
          <CField label="Describe your magic" hint="Keep it to one domain. Powers that are too broad get narrowed.">
            <textarea className="bc-in bc-ta" aria-label="Custom magic" value={f.attribute_custom} onChange={function (e) { set("attribute_custom", e.target.value); }} />
          </CField>
        ) : null}
        <CField label="Talent" note="Choose how your magic behaves. The world will add variance.">
          <div role="radiogroup" aria-label="Talent">
            <ListOpt on={f.talent_mode === "Natural"} icon="leaf" title="World-Generated Talent" tag="Lore-Grounded" desc="Your abilities come from lineage, circumstance, variance and fate. You discover them by living." onClick={function () { set("talent_mode", "Natural"); }} />
            <ListOpt on={f.talent_mode === "Guided"} icon="book" title="Guided" desc="Choose broad leaning. The world still adds variance." onClick={function () { set("talent_mode", "Guided"); }} />
            <ListOpt on={f.talent_mode === "Sandbox"} icon="star" title="Full sandbox" desc="Specify exactly what you want. The world reacts honestly to it." onClick={function () { set("talent_mode", "Sandbox"); }} />
          </div>
        </CField>
        {f.talent_mode === "Guided" ? (
          <CField label="Leanings">
            <Field label="Mana reserves"><Seg label="Mana reserves" value={f.lean_reserves} options={["Modest", "Average", "Strong", "Exceptional"]} onChange={function (x) { set("lean_reserves", x); }} /></Field>
            <Field label="Control"><Seg label="Control" value={f.lean_control} options={["Clumsy", "Average", "Precise", "Exceptional"]} onChange={function (x) { set("lean_control", x); }} /></Field>
            <Field label="Physique"><Seg label="Physique" value={f.lean_physique} options={["Frail", "Average", "Robust", "Exceptional"]} onChange={function (x) { set("lean_physique", x); }} /></Field>
          </CField>
        ) : null}
        {f.talent_mode === "Sandbox" ? (
          <CField label="Sandbox specification" hint="Anything goes here, including a race other than human. Rare powers you force still have consequences.">
            <textarea className="bc-in bc-ta" aria-label="Sandbox specification" value={f.sandbox_note} onChange={function (e) { set("sandbox_note", e.target.value); }} />
          </CField>
        ) : null}
        <div className="bc-infonote"><Icon n="info" s={30} /><span>No grimoire is chosen here. At the ceremony a grimoire decides whether you are its owner, three leaves or something rarer. You find out by living.</span></div>
      </div>
    );
  } else if (page === 3) {
    var placeDesc = "";
    if (regionObj) regionObj.s.forEach(function (s) { if (s.n === f.settlement) placeDesc = str(s.d); });
    head = <PanelHead title="IV. Origin" sub="Choose where your first morning begins." />;
    body = (
      <div>
        {!f.homeland ? <Empty>Choose a homeland on the Background page first.</Empty> : (
          <div>
            <div className="bc-mini-head"><span>Choose a Region</span><small>Each region offers a different life, culture, and opportunity.</small></div>
            <div className="bc-regions" role="radiogroup" aria-label="Region">
              {regions.map(function (r, i) {
                var on = f.region === r.r; var a = REGION_ART[r.r] || ["region_common", "region_noble", "region_forsaken"][i % 3];
                var d = REGION_DESC[r.r] || (r.s[0] && r.s[0].d) || "A life of its own, far from the rest.";
                return (
                  <button key={r.r} type="button" role="radio" aria-checked={on ? "true" : "false"} className={"bc-region" + (on ? " bc-region-on" : "")} onClick={function () { setMany({ region: r.r, settlement: "", settlement_mode: "" }); }}>
                    <img src={img(a)} alt="" /><span className="bc-region-clover"><Icon n="clover" s={20} /></span>
                    <strong>{r.r}</strong><small>{d}</small><span className="bc-radio">{on ? <Icon n="star2" s={12} /> : null}</span>
                  </button>
                );
              })}
            </div>
            {regionObj ? (
              <div>
                <div className="bc-mini-head"><span>Choose a Starting Place</span><small>Select a more specific place to begin your story.</small></div>
                <div className="bc-places" role="radiogroup" aria-label="Starting place">
                  {regionObj.s.concat([{ n: "A place I describe", c: "custom", d: "Describe your own home." }]).map(function (s, i) {
                    var custom = s.c === "custom"; var on = custom ? f.settlement_mode === "custom" : f.settlement === s.n;
                    return (
                      <button key={s.n} type="button" role="radio" aria-checked={on ? "true" : "false"} className={"bc-place" + (on ? " bc-place-on" : "")} onClick={function () { custom ? setMany({ settlement: "Custom place", settlement_mode: "custom" }) : setMany({ settlement: s.n, settlement_mode: s.c }); }}>
                        <img src={img(PLACE_ARTS[i % PLACE_ARTS.length])} alt="" /><span className="bc-place-shade" />
                        <Icon n={custom ? "feather" : s.c === "canon" ? "castle" : "home"} s={22} />
                        <span className="bc-place-text"><strong>{s.n}</strong><small>{custom ? "Custom" : s.c === "canon" ? "Canon" : "Generated"}</small></span>
                        <span className="bc-radio">{on ? <Icon n="star2" s={12} /> : null}</span>
                      </button>
                    );
                  })}
                </div>
                {f.settlement_mode === "custom" ? <textarea className="bc-in bc-ta" style={{ marginTop: 8 }} aria-label="Custom home" placeholder="For example: a tiny mountain village where most families raise sheep" value={f.custom_place} onChange={function (e) { set("custom_place", e.target.value); }} /> : null}
              </div>
            ) : null}
            <div className="bc-about">
              <img src={img("origin_about")} alt="" /><span className="bc-about-shade" />
              <div><span className="bc-about-head"><Icon n="book" s={22} />About Your Origin</span><p>{placeDesc || "Your origin shapes your early experiences — the people you meet, the challenges you face, and the opportunities available to you. It won't limit your journey, but it sets the stage for your first chapter."}</p></div>
            </div>
          </div>
        )}
        <div className="bc-cquote">{"“Where you begin does not decide where you end.”"}<small>{"— Asta"}</small></div>
      </div>
    );
  } else {
    var eraT = ""; ERA_TILES.forEach(function (x) { if (x.v === f.era) eraT = x.t.replace("\n", " "); });
    var place = f.settlement_mode === "custom" ? (str(f.custom_place).slice(0, 60) || "A place you describe") : f.settlement;
    var rows = [
      { k: "Name", v: f.name, pg: 0, i: "bust" }, { k: "Age", v: str(f.age), pg: 0, i: "cal" },
      { k: "Social Origin", v: [f.origin, f.origin_detail].filter(Boolean).join(", "), pg: 1, i: "people" },
      { k: "Magical Leaning", v: f.magic_mode === "Random" ? "Random" : (f.magic_mode === "Choose" ? f.attribute_choice : "Described by you"), pg: 2, i: "star" },
      { k: "Origin Region", v: (f.region ? f.region + ": " : "") + (place || ""), pg: 3, i: "pin" },
      { k: "Opening Preference", v: f.era === "custom" ? f.era_detail : openingDisplay(f.opening), pg: 0, i: "book" },
      { k: "Starting Mode", v: eraT, pg: 0, i: "compass" }
    ];
    head = <PanelHead title="Finalize Your Story" sub="Confirm your choices. Your legend is about to begin." />;
    body = (
      <div>
        <div className="bc-final-grid">
          <div className="bc-final-portrait-card">
            <img src={art.portrait || img("final_portrait")} alt="" />
            <div className="bc-final-quote">{"“Not giving up is my magic.”"}<small>{"— Asta"}</small></div>
          </div>
          <Frame className="bc-final-summary" pad="8px 9px">
            <div className="bc-final-summary-head"><strong>Character Summary</strong><button type="button" onClick={function () { go(0); }}><Icon n="quill" s={13} />Edit</button></div>
            {rows.map(function (r) {
              return <button key={r.k} type="button" className="bc-final-row" onClick={function () { go(r.pg); }} aria-label={"Change " + r.k}><Icon n={r.i} s={15} /><span>{r.k}</span><strong>{r.v || "Not set"}</strong></button>;
            })}
          </Frame>
        </div>
        <div className="bc-final-grid">
          <Frame className="bc-final-stats" pad="8px 9px">
            <div className="bc-final-h"><Icon n="chart" s={18} />Initial Stats</div>
            <div className="bc-final-statboxes">
              {[["heart", "Body", "Healthy", "hp"], ["drop", "Mana", "Full", "mp"], ["run", "Stamina", "Full", "st"], ["book", "Will", "Focused", "wl"]].map(function (s) { return <div key={s[1]} className={"bc-final-statbox bc-sb-" + s[3]}><Icon n={s[0]} s={20} /><span>{s[1]}</span><small>{s[2]}</small></div>; })}
            </div>
            <div className="bc-note" style={{ textAlign: "center" }}>Your journey begins with balanced potential. Growth comes through your choices.</div>
          </Frame>
          <Frame className="bc-final-modes" pad="8px 9px">
            <div className="bc-final-h"><Icon n="gear" s={18} />Narrative Mode Options</div>
            {[["leaf", "World-Generated Talent", "Your aptitude comes from the simulated world.", f.talent_mode === "Natural", function (on) { set("talent_mode", on ? "Natural" : "Guided"); }],
              ["book", "Story Guidance", "Receive direction and key story prompts.", f.canon_guidance !== "Off", function (on) { set("canon_guidance", on ? "Balanced" : "Off"); }],
              ["compass", "Sandbox Elements", "Freedom to explore beyond the main story.", f.content_continuity === "Full Official Sandbox", function (on) { set("content_continuity", on ? "Full Official Sandbox" : "Core Canon"); }]].map(function (m) {
              return (
                <div key={m[1]} className="bc-modeopt">
                  <Icon n={m[0]} s={18} /><span><strong>{m[1]}</strong><small>{m[2]}</small></span>
                  <button type="button" role="switch" aria-checked={m[3] ? "true" : "false"} aria-label={m[1]} className={"bc-switch" + (m[3] ? " bc-switch-on" : "")} onClick={function () { m[4](!m[3]); }}><i /></button>
                </div>
              );
            })}
          </Frame>
        </div>
        <button type="button" className="bc-inv-more" aria-expanded={worldOpen ? "true" : "false"} onClick={function () { setWorldOpen(!worldOpen); }}>{worldOpen ? "Hide world settings" : "More world settings"}<Icon n={worldOpen ? "chevd" : "chevr"} s={12} /></button>
        {worldOpen ? (
          <Frame pad="12px 13px" style={{ marginBottom: 10 }}>
            <Field label="Canon guidance" hint="How often chances tied to canon events surface. It never forces anything."><Seg label="Canon guidance" value={f.canon_guidance} options={["Strong", "Balanced", "Light", "Off"]} onChange={function (x) { set("canon_guidance", x); }} /></Field>
            <Field label="Canon participation"><Seg label="Canon participation" value={f.canon_participation} options={["Organic", "Opportunity-Favored"]} onChange={function (x) { set("canon_participation", x); }} /></Field>
            <Field label="Interruptions during time skips"><Seg label="Interruptions" value={f.interruptions} options={["Cinematic", "Balanced", "Simulationist"]} onChange={function (x) { set("interruptions", x); }} /></Field>
            <Field label="Narration length"><Seg label="Narration length" value={f.narrative_density} options={["Concise", "Balanced", "Detailed", "Cinematic"]} onChange={function (x) { set("narrative_density", x); }} /></Field>
            <Field label="Spoilers"><Seg label="Spoilers" value={f.spoiler_level} options={["Anime-safe", "Manga-safe", "Full canon"]} onChange={function (x) { set("spoiler_level", x); }} /></Field>
            <Field label="Content"><Seg label="Content" value={f.content_continuity} options={["Core Canon", "Expanded", "Full Official Sandbox"]} onChange={function (x) { set("content_continuity", x); }} /></Field>
            <Field label="Consequences" hint="Lethal means you can die. Grievous means mortal wounds leave lasting marks instead."><Seg label="Consequences" value={f.consequences} options={["Lethal", "Grievous"]} onChange={function (x) { set("consequences", x); }} /></Field>
          </Frame>
        ) : null}
      </div>
    );
  }
  var bannerUrl = artFor(api, art.art, "banner");
  var kingdom = f.homeland ? kingdomLabel(f.homeland) : "Clover Kingdom";
  return (
    <div className="bc-fill bc-creator">
      <div ref={scRef} className="bc-scroll">
        <Hero bannerUrl={bannerUrl} tagline="A world of magic awaits, your story begins here." kingdom={kingdom} />
        <div className="bc-wrap bc-creator-wrap">
          <Stepper page={page} go={go} />
          <div key={page} className="bc-turn">
            {head}
            {body}
          </div>
          {page === 4 ? <div className="bc-cquote">{"“A single page can change your fate. Now, write the first one.”"}</div> : null}
        </div>
      </div>
      <footer className="bc-creator-foot">
        <div className="bc-wrap">
          {err ? <div role="alert" className="bc-creator-err">{err}</div> : null}
          <div className="bc-creator-foot-row">
            {page > 0 ? <button type="button" className="bc-backcircle" aria-label="Back" disabled={busy} onClick={function () { go(page - 1); }}><Icon n="chevl" s={18} /></button> : null}
            <div style={{ flex: 1 }}>
              {page < 4
                ? <Ribbon label="Next" onClick={next}>Next<Icon n="chevr" s={16} fill="#f8eed2" /></Ribbon>
                : <GreenRibbon label="Begin life" disabled={busy} onClick={commit}>{busy ? "Opening..." : "Begin Life"}</GreenRibbon>}
            </div>
          </div>
        </div>
      </footer>
      {sheet === "appearance" ? <AppearanceSheet api={api} f={f} setMany={setMany} close={function () { setSheet(""); }} portrait={art.portrait} setPortrait={art.setPortrait} hasStore={art.hasStore} mediaError={art.mediaError} /> : null}
      {sheet === "opening" ? <OpeningSheet era={f.era} value={f.opening} onPick={function (o) { set("opening", o); }} close={function () { setSheet(""); }} /> : null}
    </div>
  );
}

/* ---------- battle arena glue: apply results, entry points ---------- */
function applyBattle(api, v, r, opts) {
  opts = opts || {};
  var maxU = num(r.maxUnits, 0), units = clamp(num(r.units, 0), 0, maxU || 0);
  var bar = maxU ? Math.round(100 * units / maxU) : 0;
  var spar = r.mode === "spar";
  var lost = Math.max(0, num(r.hp0, 0) - num(r.hp, 0));
  var vit = spar ? clamp(num(v.vitality, 100) - Math.round(r.taken * 0.5), 1, 100) : clamp(num(r.hp, 0), 0, 100);
  var manaFrac = maxU ? (num(r.units0, 0) - units) / maxU : 0;
  var minutes = Math.max(1, Math.round(r.seconds / 20)) + (spar ? 20 : 0);
  var patch = Object.assign({
    vitality: vit, stamina: clamp(num(r.st, 0), 0, 100),
    fatigue: clamp(num(v.fatigue, 0) + Math.round(r.seconds / 25 + manaFrac * 10 + r.taken / 10 + (spar ? 3 : 0)), 0, 100)
  }, bcClockForInventory(v, minutes));
  if (maxU) { patch.mana = bar; patch.mana_reserve = { version: 1, maxUnits: maxU, currentUnits: Math.round(units * 100) / 100, capacityBasis: num(obj(v.magic_profile).capacity, 0), percent: bar, lastPercent: bar }; }
  var log = arr(v.battle_log).slice();
  log.push({ date: str(v.world_date), time: str(v.world_time), mode: r.mode, outcome: r.outcome, grade: r.grade, seconds: r.seconds, foes: r.foes.map(function (f) { return f.name; }), where: parseLoc(v.current_location).settlement || "" });
  patch.battle_log = log.slice(-40);
  if (spar) {
    // Practice counts: each spell used gains a little progress, once per in-world day.
    var today = str(v.world_date), done = obj(v.spar_practice), nextDone = Object.assign({}, done), gained = [];
    var spells = arr(v.spells).map(function (sp) {
      var u = r.spellsUsed.filter(function (m) { return m.id === str(sp.id) || m.id === str(sp.name); })[0];
      if (!u || done[str(sp.id) || str(sp.name)] === today) return sp;
      nextDone[str(sp.id) || str(sp.name)] = today; gained.push(u.name);
      return Object.assign({}, sp, { prog: clamp(num(sp.prog, 0) + Math.min(4, 1 + u.uses), 0, 100) });
    });
    if (gained.length) { patch.spells = spells; patch.spar_practice = nextDone; }
    bcPatch(api, patch, function (ok) {
      if (typeof api.showToast === "function") api.showToast(ok ? "Sparring done (" + r.grade + "). " + (gained.length ? "Practice gained: " + gained.join(", ") + "." : "Spells already practiced today.") + " No AI turn used." : "Couldn't save the sparring result.", ok ? "success" : "error");
    });
    return;
  }
  var npcs = Object.assign({}, obj(obj(v.world_truth).npcs)), npcChanged = false;
  var parts = arr(obj(v.combat).participants).map(function (pt) {
    pt = obj(pt); var f = r.foes.filter(function (x) { return x.name === str(pt.name); })[0];
    if (!f) return pt;
    if (f.persisted && npcs[f.key]) { npcs[f.key] = Object.assign({}, obj(npcs[f.key]), { vitality: f.hpPct }); npcChanged = true; }
    return Object.assign({}, pt, { condition: f.outcome === "defeated" ? "defeated" : f.outcome });
  });
  patch.combat = Object.assign({}, obj(v.combat), { participants: parts, resolved: r.outcome });
  if (npcChanged) patch.world_truth = Object.assign({}, obj(v.world_truth), { npcs: npcs });
  if (r.outcome !== "defeat") { patch.in_combat = false; patch.combat.active = false; }
  if (lost >= 15) {
    var sev = lost >= 45 ? "serious" : lost >= 25 ? "moderate" : "minor";
    patch.conditions = arr(v.conditions).concat([{ id: "battle-" + log.length + "-" + str(v.world_date).replace(/\W+/g, ""), kind: "injury", location: "various", type: "battle wounds", severity: sev, effects: sev === "serious" ? "bleeding, impaired movement" : sev === "moderate" ? "deep bruising, cuts" : "bruises and scrapes", treatment: "", healing: "0%", since: str(v.world_date) }]);
  }
  var title = { victory: "victory", defeat: "defeat", fled: "escape", yielded: "surrender" }[r.outcome];
  var hidden = "[UI:BATTLE] The fight was PLAYED OUT in the battle arena and its results are ALREADY APPLIED to state. Outcome: " + r.outcome.toUpperCase() +
    " after about " + Math.max(1, Math.round(r.seconds / 20)) + (Math.max(1, Math.round(r.seconds / 20)) === 1 ? " minute" : " minutes") + " of fighting. Foes: " + r.foes.map(function (f) { return f.name + " (" + f.outcome + ")"; }).join(", ") +
    ". The character took " + r.taken + " damage (vitality " + r.hp0 + "→" + vit + "), spent " + Math.round(manaFrac * 100) + "% of their mana" +
    (r.spellsUsed.length ? " casting " + r.spellsUsed.map(function (m) { return m.name + " ×" + m.uses; }).join(", ") : " without spells") +
    "; best combo " + r.bestCombo + ", " + r.perfect + (r.perfect === 1 ? " perfect dodge, " : " perfect dodges, ") + r.interrupts + (r.interrupts === 1 ? " interrupted attack" : " interrupted attacks") + (r.log.length ? "; moments: " + r.log.join("; ") : "") +
    ". Narrate the end of this fight and its immediate aftermath in prose that matches this result exactly (a short, vivid summary, not a blow-by-blow replay). " +
    "Do NOT write vitality, stamina, fatigue, mana, mana_reserve, conditions, in_combat, combat or world_time for it, and emit no spell_events for these casts — all already applied. " +
    "You still own the consequences: what defeated or fled foes do next, loot actually present, witnesses, reputation, crimes, and relationships." + (r.outcome === "defeat" ? " The character has collapsed; what the enemy does now is decided by them and the world (in_combat is still true — you own combat and in_combat from here)." : "");
  bcPatch(api, patch, function (ok) {
    if (!ok) { if (typeof api.showToast === "function") api.showToast("Couldn't save the battle result.", "error"); return; }
    tellGM(api, hidden, "⚔ The battle ends in " + title + ".");
  });
}
function BattleRecord(p) {
  var log = arr(p.v.battle_log); if (!log.length) return null;
  var fights = log.filter(function (b) { return b.mode !== "spar"; }), wins = fights.filter(function (b) { return b.outcome === "victory"; }).length;
  var best = log.map(function (b) { return str(b.grade); }).sort()[0] || "—";
  return (
    <div>
      <SectionHead icon="sword" iconSize={22} title="Battle record" sub="Fought in the arena." />
      <Frame pad="6px 12px 8px" style={{ marginBottom: 12 }}>
        <Row k="Real fights" v={fights.length + " (" + wins + " won)"} />
        <Row k="Sparring sessions" v={String(log.length - fights.length)} />
        <Row k="Best grade" v={best} />
        {log.slice(-4).reverse().map(function (b, i) { return <Row key={i} k={(b.mode === "spar" ? "Spar · " : "") + arr(b.foes).join(", ")} v={str(b.outcome) + " · " + str(b.grade)} />; })}
      </Frame>
    </div>
  );
}
function SparCard(p) {
  var v = p.api.variables || {}; var busy = !!p.api.isStreaming;
  return (
    <button type="button" className="bc-sparcard" disabled={busy || isTrue(v.in_combat)} onClick={p.onSpar}>
      <img src={img("act_train")} alt="" /><span className="bc-sparcard-shade" />
      <Icon n="sword" s={30} />
      <span className="bc-sparcard-text"><strong>Spar in the arena</strong><small>A real-time practice fight. Costs stamina and mana, builds spell practice, uses no AI turn.</small></span>
      <Icon n="chevr" s={14} />
    </button>
  );
}

/* ---------- AI labels: what an item or spell IS ----------
   The narrator labels new items and spells itself (kind/wear/holds/size on
   items, arena/look on spells), which costs no extra call. Only when something
   arrives unlabelled AND the engine's word lists can't place it does this hook
   make ONE batched, history-free, lore-free classifier call after the reply has
   finished. Answers are checked against the fixed option lists, saved in
   ai_labels (hidden from the narrator) and never asked for again. */
var LABEL_SYS = "You label objects for a Black Clover RPG engine. Answer JSON only: " +
  "{\"items\":{\"<exact name>\":{\"kind\":K,\"wear\":W,\"holds\":[H],\"size\":Z}},\"spells\":{\"<exact name>\":{\"arena\":A,\"look\":L}}}. " +
  "K: " + BC_KINDS.join("|") + ". W, where it is worn or carried ready (none if it is just carried): " + BC_WEAR.join("|") +
  ". cloak = squad robes, capes, cloaks over clothes; clothes = one-piece outfits only; hip = holsters, scabbards. " +
  "holds and size only for bags, pouches, holsters: H " + BC_HOLDS.join("|") + "; Z small|medium|large. " +
  "A, how the spell acts in a fight: " + BC_ARENA.join("|") + " (dome = barrier all around; seal-foe = seals one enemy). L: " + BC_LOOKS.join("|") + "|none.";
function lbl(x) { return str(x).toLowerCase(); }
function pickByName(map, name) {
  if (map[name]) return map[name];
  var k = lbl(name); for (var key in map) if (lbl(key) === k) return map[key];
  return null;
}
function capMap(m, n) { var ks = Object.keys(m); if (ks.length <= n) return m; var out = {}; ks.slice(ks.length - n).forEach(function (k) { out[k] = m[k]; }); return out; }
function useAiLabeler(api) {
  var v = api.variables || {}; var L = obj(v.ai_labels), asked = obj(L.asked), li = obj(L.items), ls = obj(L.spells);
  var attr = obj(v.magic_profile).attribute;
  var items = [], spells = [], seen = {};
  arr(v.inventory).forEach(function (it) {
    if (!it || !str(it.name)) return; var k = bcLabelKey(it.name);
    if (!k || seen[k] || asked[k] || li[k] || !bcIsUncertain(it)) return;
    seen[k] = 1; items.push({ name: str(it.name), type: str(it.type), notes: str(it.notes || it.description).slice(0, 120) });
  });
  arr(v.spells).forEach(function (sp) {
    if (!sp || !str(sp.name) || sp.arena) return; var k = spellLabelKey(sp.name);
    if (!k || seen["s:" + k] || asked["s:" + k] || ls[k] || !readSpell(sp, attr).guessed) return;
    seen["s:" + k] = 1; spells.push({ name: str(sp.name), does: str(sp.behavior || sp.description).slice(0, 200) });
  });
  var sig = items.map(function (x) { return x.name; }).concat(spells.map(function (x) { return "s:" + x.name; })).join("|");
  var busy = React.useRef(false), nextOk = React.useRef(0);
  React.useEffect(function () {
    if (!sig || api.isStreaming || busy.current || !canWrite(api) || Date.now() < nextOk.current) return;
    if (!api.ai || typeof api.ai.complete !== "function") return;
    var reqI = items.slice(0, 8), reqS = spells.slice(0, 6);
    busy.current = true; nextOk.current = Date.now() + 45000;
    var pr;
    try { pr = api.ai.complete({ messages: [{ role: "system", content: LABEL_SYS }, { role: "user", content: JSON.stringify({ items: reqI, spells: reqS }) }], maxTokens: 80 + 45 * (reqI.length + reqS.length), temperature: 0, responseFormat: { type: "json_object" } }); }
    catch (e) { busy.current = false; return; }
    Promise.resolve(pr).then(function (text) {
      text = str(text);
      if (!text || /^\[Error:/.test(text)) { nextOk.current = Date.now() + 300000; return; } // not charged or not available: try again much later
      var parsed = null, t = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
      try { parsed = JSON.parse(t); } catch (e) { var a0 = t.indexOf("{"), b0 = t.lastIndexOf("}"); if (a0 >= 0 && b0 > a0) { try { parsed = JSON.parse(t.slice(a0, b0 + 1)); } catch (e2) { parsed = null; } } }
      var cur = obj(obj(api.variables).ai_labels);
      var next = { items: Object.assign({}, obj(cur.items)), spells: Object.assign({}, obj(cur.spells)), asked: Object.assign({}, obj(cur.asked)) };
      var pi = obj(parsed && parsed.items), ps = obj(parsed && parsed.spells);
      reqI.forEach(function (it) {
        var k = bcLabelKey(it.name), r = obj(pickByName(pi, it.name)), lab = {};
        if (BC_KINDS.indexOf(lbl(r.kind)) >= 0) lab.kind = lbl(r.kind);
        if (BC_WEAR.indexOf(lbl(r.wear)) >= 0) lab.wear = lbl(r.wear);
        var h = arr(r.holds).map(lbl).filter(function (x) { return BC_HOLDS.indexOf(x) >= 0; }); if (h.length && lab.kind === "container") lab.holds = h;
        if (["small", "medium", "large"].indexOf(lbl(r.size)) >= 0 && lab.kind === "container") lab.size = lbl(r.size);
        if (lab.kind || lab.wear) next.items[k] = lab;
        next.asked[k] = 1;
      });
      reqS.forEach(function (sp) {
        var k = spellLabelKey(sp.name), r = obj(pickByName(ps, sp.name)), lab = {};
        if (BC_ARENA.indexOf(lbl(r.arena)) >= 0) lab.arena = lbl(r.arena);
        if (BC_LOOKS.indexOf(lbl(r.look)) >= 0) lab.look = lbl(r.look);
        if (lab.arena) next.spells[k] = lab;
        next.asked["s:" + k] = 1;
      });
      next.items = capMap(next.items, 300); next.spells = capMap(next.spells, 120); next.asked = capMap(next.asked, 500);
      api.setVariable("ai_labels", next);
    }, function (e) { nextOk.current = Date.now() + 300000; try { console.warn("bc labeler:", e); } catch (er) {} }).then(function () { busy.current = false; }, function () { busy.current = false; });
  }, [sig, !!api.isStreaming]);
}

/* ---------- squad roster ----------
   Modelled on the party system of the Barbarian card: the narrator never edits
   the roster itself. It files short squad_events (join / update / seen / leave /
   death); this hook applies them to squad_roster (hidden from the narrator) and
   writes a one-line squad_summary the narrator reads each turn. Squadmates live
   their own lives: one is "with you" only while they are in `party` (or an event
   says so); otherwise the roster keeps where they were last known to be. */
var SQ_CONDS = ["healthy", "tired", "bruised", "hurt", "injured", "badly hurt", "critical", "unconscious", "dead"];
var SQ_HP = { healthy: 100, tired: 85, bruised: 80, hurt: 62, injured: 45, "badly hurt": 30, critical: 14, unconscious: 8, dead: 0 };
var SQ_RECENT_DAYS = 30;
function sqKey(name) { return str(name).toLowerCase().replace(/^(captain|vice[- ]captain|sir|lady|lord)\s+/, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function sqCond(c) { c = str(c).toLowerCase().trim(); if (!c) return ""; for (var i = 0; i < SQ_CONDS.length; i++) if (c.indexOf(SQ_CONDS[i]) >= 0) return SQ_CONDS[i]; if (/wound|bleed/.test(c)) return "injured"; if (/fine|well|ok|rested|unhurt/.test(c)) return "healthy"; if (/exhaust|weary|drain/.test(c)) return "tired"; if (/scratch|graze|minor/.test(c)) return "bruised"; if (/k\.?o|knocked out|out cold/.test(c)) return "unconscious"; return c.slice(0, 24); }
function sqDay(v) { return Math.floor(num(v.elapsed_days, 0)); }
function sqPartyEntry(v, name) { var k = sqKey(name); return arr(v.party).filter(function (p) { var n = sqKey(obj(p).name || p); return n && (n === k || n.split(" ")[0] === k.split(" ")[0] && k.split(" ")[0].length > 3); })[0]; }
function sqInParty(v, name) { var k = sqKey(name); return arr(v.party).some(function (p) { var n = sqKey(obj(p).name || p); return n && (n === k || n.split(" ")[0] === k.split(" ")[0] && k.split(" ")[0].length > 3); }); }
function sqSquadName(v) { var s = str(obj(v.mk_status).squad); return s && s !== "none" ? s : ""; }
function sqPlaceOf(v) { var t = str(v.current_location); return t.split(/\s+[—–-]\s+|\(/)[0].trim() || t; }
function sqAgo(days) { return days <= 0 ? "today" : days === 1 ? "yesterday" : days + " days ago"; }

/* apply queued events and keep last-seen / summary current */
function useSquadRoster(api) {
  var v = (api && api.variables) || {};
  var squad = sqSquadName(v);
  var sig = JSON.stringify([v.squad_events, squad, v.party, v.current_location, v.elapsed_days, v.world_date, v.squad_summary, Object.keys(obj(obj(obj(v.squad_roster).squads)[squad])).length]);
  var attempted = React.useRef("");
  React.useEffect(function () {
    if (!isTrue(v.character_created) || !canWrite(api) || attempted.current === sig) return;
    var roster = JSON.parse(JSON.stringify(obj(v.squad_roster))); roster.squads = obj(roster.squads);
    var day = sqDay(v), date = str(v.world_date), here = sqPlaceOf(v), changed = false;
    var evs = arr(v.squad_events);
    evs.forEach(function (e) {
      e = obj(e); var name = str(e.name).trim(); if (!name) return;
      var sq = str(e.squad) || squad; if (!sq) return;
      var book = roster.squads[sq] = obj(roster.squads[sq]); var k = sqKey(name); var m = book[k];
      var type = str(e.type).toLowerCase() || "update";
      if (!m) { if (type === "leave" || type === "death") return; m = book[k] = { name: name, joinedDay: type === "join" && e.joined !== "before" ? day : null, joined: type === "join" && e.joined !== "before" ? date : "", history: [] }; }
      if (type === "join" && e.joined === "before") { m.joinedDay = null; m.joined = ""; }
      ["role", "rank", "magic", "notes", "mission"].forEach(function (f) { if (e[f] !== undefined && str(e[f]).trim()) m[f] = str(e[f]).trim(); });
      if (e.location !== undefined && str(e.location).trim()) { m.location = str(e.location).trim(); m.locDay = day; m.locDate = date; }
      if (e.condition !== undefined) { var c = sqCond(e.condition); if (c) m.condition = c; }
      if (e.hp !== undefined && isFinite(Number(e.hp))) m.hp = Math.max(0, Math.min(100, Math.round(Number(e.hp))));
      else if (e.condition !== undefined && SQ_HP[m.condition] !== undefined) m.hp = SQ_HP[m.condition];
      if (e.with === true) { m.with = true; m.withAt = here; m.viaParty = false; m.lastSeenDay = day; m.lastSeen = date; m.location = here; m.locDay = day; m.locDate = date; }
      if (e.with === false) { m.with = false; m.withAt = ""; }
      if (e.with !== true && e.location !== undefined && str(e.location).trim() && str(e.location).trim() !== here) { m.with = false; m.withAt = ""; }
      if (type === "seen") { m.lastSeenDay = day; m.lastSeen = date; if (!e.location && here) { m.location = here; m.locDay = day; m.locDate = date; } }
      if (type === "leave") { m.status = "left"; m.with = false; }
      else if (type === "death") { m.status = "dead"; m.condition = "dead"; m.hp = 0; m.with = false; }
      else if (e.status !== undefined && str(e.status).trim()) m.status = str(e.status).trim().toLowerCase();
      else if (!m.status) m.status = "active";
      var note = type === "join" ? (e.joined === "before" ? "On the roster" : "Joined the squad") : type === "leave" ? "Left the squad" + (e.note ? ": " + str(e.note) : "") : type === "death" ? "Died" + (e.note ? ": " + str(e.note) : "") : [m.condition && e.condition !== undefined ? m.condition : "", e.location ? "at " + str(e.location) : "", e.mission ? "mission: " + str(e.mission) : "", e.note ? str(e.note) : ""].filter(Boolean).join(", ");
      if (note) m.history = arr(m.history).concat([{ date: date, text: note }]).slice(-8);
      changed = true;
    });
    // anyone in the party right now is with you; everyone else keeps their last known place
    var book0 = squad ? roster.squads[squad] = obj(roster.squads[squad]) : {};
    Object.keys(book0).forEach(function (k) {
      var m = book0[k]; if (m.status === "dead" || m.status === "left") { if (m.with) { m.with = false; changed = true; } return; }
      var present = sqInParty(v, m.name);
      if (present) { var pe = obj(sqPartyEntry(v, m.name)), pc = sqCond(pe.condition); if (pc && pc !== m.condition) { m.condition = pc; if (SQ_HP[pc] !== undefined) m.hp = SQ_HP[pc]; changed = true; } }
      if (present) { if (!m.with || !m.viaParty || m.lastSeenDay !== day || m.location !== here) { m.with = true; m.withAt = here; m.viaParty = true; m.lastSeenDay = day; m.lastSeen = date; m.location = here; m.locDay = day; m.locDate = date; changed = true; } }
      // with you by the story's word stays true until you move on without them
      else if (m.with && (m.viaParty || !m.withAt || m.withAt !== here)) { m.with = false; m.withAt = ""; m.viaParty = false; changed = true; }
    });
    var summary = "";
    if (squad) {
      var list = Object.keys(book0).map(function (k) { return book0[k]; }).filter(function (m) { return m.status !== "left"; });
      var withYou = list.filter(function (m) { return m.with && m.status !== "dead"; }), away = list.filter(function (m) { return !m.with && m.status !== "dead"; });
      var recent = list.filter(function (m) { return m.joinedDay !== null && m.joinedDay !== undefined && day - m.joinedDay <= SQ_RECENT_DAYS && m.status !== "dead"; });
      var cond = function (m) { return m.condition && m.condition !== "healthy" ? " (" + m.condition + ")" : ""; };
      summary = squad + (list.length ? "" : ": no squadmates on file yet") +
        (withYou.length ? ". With you: " + withYou.map(function (m) { return m.name + cond(m); }).join(", ") : "") +
        (away.length ? ". Elsewhere: " + away.slice(0, 14).map(function (m) { return m.name + cond(m) + (m.mission ? " on " + m.mission : m.location ? " at " + m.location : "") + (m.locDay !== undefined && m.locDay !== null && day - m.locDay > 0 ? " (" + sqAgo(day - m.locDay) + ")" : ""); }).join("; ") + (away.length > 14 ? "; +" + (away.length - 14) + " more" : "") : "") +
        (recent.length ? ". Joined recently: " + recent.map(function (m) { return m.name; }).join(", ") : "") + ".";
    }
    var patch = {};
    if (evs.length) patch.squad_events = [];
    if (changed) patch.squad_roster = roster;
    if (summary !== str(v.squad_summary)) patch.squad_summary = summary;
    attempted.current = sig;
    if (!Object.keys(patch).length) return;
    bcPatch(api, patch, function (ok) { if (!ok) attempted.current = ""; });
  }, [sig, !!(api && api.isStreaming)]);
}

function SquadRoster(p) {
  var api = p.api, v = api.variables || {}, busy = !!api.isStreaming, squad = sqSquadName(v), day = sqDay(v);
  var book = obj(obj(obj(v.squad_roster).squads)[squad]);
  var fs = React.useState("all"), filter = fs[0], setFilter = fs[1];
  var os = React.useState(""), open = os[0], setOpen = os[1];
  var all = Object.keys(book).map(function (k) { var m = Object.assign({ key: k }, book[k]); m.with = m.status !== "dead" && m.status !== "left" && (sqInParty(v, m.name) || !!m.with); return m; });
  var current = all.filter(function (m) { return m.status !== "left"; }), former = all.filter(function (m) { return m.status === "left"; });
  var isNew = function (m) { return m.joinedDay !== null && m.joinedDay !== undefined && day - m.joinedDay <= SQ_RECENT_DAYS; };
  var rank = function (m) { var r = str(m.role).toLowerCase(); return /^captain/.test(r) ? 0 : /vice/.test(r) ? 1 : 2; };
  current.sort(function (a, b) { return (b.with ? 1 : 0) - (a.with ? 1 : 0) || rank(a) - rank(b) || (a.status === "dead") - (b.status === "dead") || a.name.localeCompare(b.name); });
  var shown = current.filter(function (m) { return filter === "with" ? m.with : filter === "away" ? !m.with && m.status !== "dead" : filter === "new" ? isNew(m) : true; });
  var counts = { with: current.filter(function (m) { return m.with; }).length, away: current.filter(function (m) { return !m.with && m.status !== "dead"; }).length, new: current.filter(isNew).length };
  function where(m) {
    if (m.status === "dead") return { cls: "dead", text: "Fallen" + (m.lastSeen ? " · last seen " + m.lastSeen : "") };
    if (m.with) return { cls: "with", text: "With you" };
    if (m.mission) return { cls: "mission", text: "On a mission: " + m.mission + (m.location ? " · " + m.location : "") };
    if (m.location) return { cls: "away", text: m.location + (m.locDay !== null && m.locDay !== undefined ? " · as of " + sqAgo(day - m.locDay) : "") };
    return { cls: "unknown", text: "Whereabouts unknown" };
  }
  function ask() { send(api, "[UI:SQUAD] Fill in my squad roster: file one squad_events join for each member of " + squad + " my character knows of (name, role, rank, magic; joined:\"before\" for people already in the squad when I arrived), with their current location if my character would know it. Narrate briefly, if at all."); if (p.toStory) p.toStory(); }
  return (
    <Frame className="bc-squadroster" pad="10px 12px 12px" style={{ marginBottom: 14 }}>
      <div className="bc-sq-head">
        <div><H m="0">Squadmates</H><small>{squad + " · " + current.filter(function (m) { return m.status !== "dead"; }).length + " on the roster"}</small></div>
      </div>
      {current.length ? (
        <div className="bc-chiprow bc-sq-filters">
          <Chip on={filter === "all"} onClick={function () { setFilter("all"); }}>All</Chip>
          <Chip on={filter === "with"} onClick={function () { setFilter("with"); }}>{"With you" + (counts.with ? " (" + counts.with + ")" : "")}</Chip>
          <Chip on={filter === "away"} onClick={function () { setFilter("away"); }}>{"Elsewhere" + (counts.away ? " (" + counts.away + ")" : "")}</Chip>
          <Chip on={filter === "new"} onClick={function () { setFilter("new"); }}>{"Joined recently" + (counts.new ? " (" + counts.new + ")" : "")}</Chip>
        </div>
      ) : null}
      {!current.length ? (
        <div>
          <Empty>{"No squadmates are on file yet. They appear here as you meet them in the story, or ask the GM to list the members your character knows."}</Empty>
          <Btn kind="gold" disabled={busy} onClick={ask}>Fill in my squad's roster</Btn>
        </div>
      ) : null}
      {current.length && !shown.length ? <Empty>No one here right now.</Empty> : null}
      {shown.map(function (m) {
        var w = where(m), on = open === m.key, hp = m.hp !== undefined && m.hp !== null ? m.hp : SQ_HP[m.condition];
        return (
          <div key={m.key} className={"bc-sq-card" + (m.with ? " with" : "") + (m.status === "dead" ? " dead" : "")}>
            <button type="button" className="bc-sq-main" aria-expanded={on ? "true" : "false"} onClick={function () { setOpen(on ? "" : m.key); }}>
              <span className="bc-sq-av">{m.name.split(/\s+/).slice(0, 2).map(function (x) { return x.charAt(0); }).join("").toUpperCase()}</span>
              <span className="bc-sq-text">
                <strong>{m.name}{isNew(m) ? <em className="bc-sq-new">New</em> : null}</strong>
                <small>{[m.role, m.rank, m.magic].filter(Boolean).join(" · ") || "Squad member"}</small>
                <span className={"bc-sq-where " + w.cls}><Icon n={w.cls === "with" ? "people" : w.cls === "mission" ? "scroll" : "pin"} s={12} />{w.text}</span>
              </span>
              <span className="bc-sq-side">
                {m.condition ? <span className={"bc-sq-cond c" + Math.min(4, Math.floor((100 - (hp === undefined ? 100 : hp)) / 25))}>{m.condition}</span> : null}
                {hp !== undefined && m.status !== "dead" ? <span className="bc-sq-hp" aria-label={"Health " + hp + "%"}><i style={{ width: hp + "%" }} /></span> : null}
              </span>
            </button>
            {on ? (
              <div className="bc-sq-more">
                {m.joined ? <div className="bc-note">{"Joined " + m.joined + " (" + sqAgo(day - (m.joinedDay || 0)) + ")"}</div> : null}
                {m.lastSeen && !m.with ? <div className="bc-note">{"Last with you " + m.lastSeen}</div> : null}
                {m.notes ? <div className="bc-note" style={{ color: C.ivory }}>{m.notes}</div> : null}
                {arr(m.history).length ? <div className="bc-sq-hist">{arr(m.history).slice(-4).reverse().map(function (h, i) { return <div key={i}><span>{str(h.date)}</span>{str(h.text)}</div>; })}</div> : null}
                {m.status !== "dead" ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {!m.with ? <Btn small disabled={busy} onClick={function () { send(api, "I go looking for " + m.name + (m.location ? ", last known to be at " + m.location : "") + "."); if (p.toStory) p.toStory(); }}>Go find them</Btn> : <Btn small disabled={busy} onClick={function () { send(api, "I turn to " + m.name + " and talk with them for a bit."); if (p.toStory) p.toStory(); }}>Talk</Btn>}
                  {!m.with ? <Btn small disabled={busy} onClick={function () { send(api, "I ask around the squad about where " + m.name + " is and how they're doing."); if (p.toStory) p.toStory(); }}>Ask after them</Btn> : null}
                </div> : null}
              </div>
            ) : null}
          </div>
        );
      })}
      {former.length && filter === "all" ? <div className="bc-note" style={{ marginTop: 8 }}>{"Former members: " + former.map(function (m) { return m.name; }).join(", ")}</div> : null}
      {current.length ? <div className="bc-note" style={{ marginTop: 8 }}>Positions update as the story moves people around; squadmates aren't always with you. Tap a name for details.</div> : null}
    </Frame>
  );
}

export default function App() {
  var api = useYumina();
  if (api && typeof api.resolveAssetUrl === "function") ART_RESOLVE = function (ref) { return api.resolveAssetUrl(ref); };
  var aiLabels0 = obj(obj(api && api.variables).ai_labels); bcSetLabels(obj(aiLabels0.items)); setSpellLabels(obj(aiLabels0.spells));
  var v = (api && api.variables) || {};
  useRelationshipIdentityGuard(api);
  var art = useArt(api);
  return (
    <div className="bc-root">
      <style>{CSS}</style>
      <Defs />
      {isTrue(v.character_created) ? <Game api={api} art={art} /> : <Creator api={api} art={art} />}
    </div>
  );
}
