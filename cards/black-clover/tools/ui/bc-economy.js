import { bcBankPayroll } from "./bc-banking.js";
/* BLACK CLOVER — YUL ECONOMY & MAGIC KNIGHT PAYROLL v1
   Scale is inspired by yen, NOT a canonical exchange rate.
   Annual-income constraint and 200,000-yul rookie salary are source-anchored;
   all intermediate rank rates and specific civilian/retail prices are simulation.
   Pure model: effects are performed only by the caller on actual world-date changes. */

export const BC_PAY_SCALE = Object.freeze({
  junior: Object.freeze({5:200000,4:215000,3:230000,2:250000,1:275000}),
  intermediate: Object.freeze({5:310000,4:350000,3:395000,2:445000,1:500000}),
  senior: Object.freeze({5:575000,4:660000,3:760000,2:875000,1:1000000}),
  grand: Object.freeze({1:1200000})
});
const BC_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const BC_MONTH_DAYS=[31,28,31,30,31,30,31,31,30,31,30,31];
function bcInt(x,d=0){const n=Number(x);return Number.isFinite(n)?Math.trunc(n):d;}
function bcTxt(x){return x==null?'':String(x);}
function bcArr(x){return Array.isArray(x)?x:[];}
function bcObj(x){return x && typeof x==='object' && !Array.isArray(x)?x:{};}
export function bcMoney(y){return Math.max(0,bcInt(y)).toLocaleString('en-US')+' Yul';}
export function bcMKRank(raw){
  let s=bcTxt(raw).toLowerCase();
  if(!s || s==='none' || s==='not joined')return null;
  if(/wizard\s*(king|emperor)/.test(s))return {tier:'wizard',grade:0,label:'Wizard King'};
  if(/grand/.test(s))return {tier:'grand',grade:1,label:'Grand Magic Knight'};
  let tier=/intermediate/.test(s)?'intermediate':/senior/.test(s)?'senior':/junior/.test(s)?'junior':'';
  if(!tier)return null;
  const names=['','First','Second','Third','Fourth','Fifth'];
  let m=s.match(/([1-5])(?:st|nd|rd|th)?\s*(?:class)?/)||s.match(/(first|second|third|fourth|fifth)\s*(?:class)?/);
  let grade=5;
  if(m){let text=m[1];grade=/^\d$/.test(text)?Number(text):['first','second','third','fourth','fifth'].indexOf(text)+1;}
  return {tier,grade,label:tier[0].toUpperCase()+tier.slice(1)+' Magic Knight, '+names[grade]+' Class'};
}
export function bcMKBase(rank){let r=bcMKRank(rank);return r && r.tier!=='wizard' ? BC_PAY_SCALE[r.tier][r.grade]||0 : 0;}
export function bcMKAllowance(personalStars){ // 1% of rank pay per VERIFIABLE individual merit star; hard cap 15%.
 return Math.min(15,Math.max(0,bcInt(personalStars)))/100;
}
export function bcMKMonthly(rank,personalStars){let base=bcMKBase(rank);return {base,merit:Math.round(base*bcMKAllowance(personalStars)),total:base+Math.round(base*bcMKAllowance(personalStars))};}
export function bcMKDate(s){
 let m=bcTxt(s).match(/^(\d{1,2})\s+([A-Za-z]+),?\s*CY\s*(-?\d+)\s*$/i);
 if(!m)return null;
 let idx=BC_MONTHS.findIndex(x=>x.toLowerCase()===m[2].toLowerCase());
 let day=Number(m[1]),year=Number(m[3]);
 if(idx<0||day<1||day>BC_MONTH_DAYS[idx])return null;
 return {day,month:idx,year};
}
export function bcMKFormatDate(d){return d.day+' '+BC_MONTHS[d.month]+', CY '+d.year;}
export function bcMKOrdinal(p){return p.year*365+BC_MONTH_DAYS.slice(0,p.month).reduce((a,b)=>a+b,0)+p.day;}
export function bcMKAnniversary(start,months){
 let mid=start.year*12+start.month+months,year=Math.floor(mid/12),month=((mid%12)+12)%12;
 return {year,month,day:Math.min(start.day,BC_MONTH_DAYS[month])};
}
export function bcMKDueMonths(start,current){
 if(!start||!current||bcMKOrdinal(current)<bcMKOrdinal(start))return 0;
 let elapsed=(current.year-start.year)*12+current.month-start.month;
 if(elapsed<=0)return 0;
 let next=bcMKAnniversary(start,elapsed);
 return Math.max(0,bcMKOrdinal(current)>=bcMKOrdinal(next)?elapsed:elapsed-1);
}
function bcMKRankHistory(rank,stars,date){return {date,rank:bcTxt(rank),personalStars:Math.max(0,bcInt(stars))};}
function bcMKPayAt(history,payDate){
 const payOrd=bcMKOrdinal(payDate);let best=history[0]||{};
 for(const h of history){const hd=bcMKDate(h.date);if(hd&&bcMKOrdinal(hd)<=payOrd)best=h;}
 return bcMKMonthly(best.rank,best.personalStars);
}
function bcMKService(mk){let squad=bcTxt(mk.squad).trim();return squad!==''&&!/^none|unassigned$/i.test(squad)&&!!bcMKRank(mk.rank);}
export function bcMKNextPayday(v){
 let rec=bcObj(v.mk_payroll),svc=bcObj(rec.service),start=bcMKDate(svc.started);
 if(!start||!bcMKService(bcObj(v.mk_status))||!svc.active)return null;
 return bcMKFormatDate(bcMKAnniversary(start,Math.max(0,bcInt(rec.cyclesPaid))+1));
}
/* Returns a pure state transition, never calls the GM. No player-state edits on invalid dates.
   Caller MUST atomically patch bank_account + mk_payroll together. */
export function bcMKPayrollStep(v){
 const mk=bcObj(v.mk_status),current=bcMKDate(v.world_date);if(!current)return null;
 const currentText=bcMKFormatDate(current),active=bcMKService(mk);
 let prev=bcObj(v.mk_payroll),svc=bcObj(prev.service),history=bcArr(prev.rateHistory).slice(),ledger=bcArr(prev.ledger).slice(),
     bonuses=bcArr(prev.bonusAwards).map(x=>Object.assign({},x)),paid=bcInt(prev.cyclesPaid),
     cumulative=bcInt(prev.totalPaid),totalBonusPaid=bcInt(prev.bonusPaid),changed=false;
 const squad=bcTxt(mk.squad),rank=bcTxt(mk.rank),stars=Math.max(0,bcInt(mk.personal_stars));
 let cash=0, salaryCount=0,bonusesCount=0,issued=[];
 if(!active){
   if(svc.active){svc=Object.assign({},svc,{active:false,lastServiceDate:currentText});changed=true;}
 }else{
   const wasActive=!!svc.active, start=bcMKDate(svc.started),badStart=!start||bcMKOrdinal(current)<bcMKOrdinal(start);
   // Never back-pay an imported, already-active old save. Start at first successful observation.
   if(!wasActive||badStart){
     svc={active:true,started:currentText,squad,joinedAt:bcTxt(mk.since)||currentText};
     paid=0;history=[bcMKRankHistory(rank,stars,currentText)];changed=true;
   }else{
     if(svc.squad!==squad){svc=Object.assign({},svc,{squad});changed=true;}
     const last=history[history.length-1];
     if(!last||last.rank!==rank||bcInt(last.personalStars)!==stars){
       history.push(bcMKRankHistory(rank,stars,currentText));changed=true;
     }
   }
   const first=bcMKDate(svc.started),due=bcMKDueMonths(first,current),remaining=Math.max(0,due-paid);
   // Catch up at most 60 pay periods each effect to bound UI operations.
   for(let i=0;i<Math.min(60,remaining);i++){
     let period=paid+i+1,date=bcMKAnniversary(first,period),dueText=bcMKFormatDate(date);
     let amount=bcMKPayAt(history,date);
     // The Wizard King is paid via separate court appropriation; not the rank ladder.
     if(amount.total>0){
       cash+=amount.total;salaryCount++;
       let receipt={id:'salary-'+svc.started+'-'+period,kind:'salary',date:dueText,base:amount.base,merit:amount.merit,amount:amount.total,reason:'Monthly Magic Knight salary',squad};
       ledger.push(receipt);issued.push(receipt);
     }
   }
   if(remaining>0){paid+=Math.min(60,remaining);changed=true;}
   // Only GM/captain-approved bonuses, not each squad star, trigger a bonus disbursement.
   for(let i=0;i<bonuses.length;i++){
     let b=bonuses[i],n=bcInt(b.amount);
     if(!b||b.status!=='approved'||!bcTxt(b.id)||n<=0||n>100000000)continue;
     // Do not allow a duplicate id to pay a second time.
     if(bonuses.slice(0,i).some(x=>x&&x.id===b.id))continue;
     if(ledger.some(x=>x.id==='bonus-'+b.id)){
       bonuses[i]=Object.assign({},b,{status:'paid'});changed=true;continue;
     }
     cash+=n;bonusesCount++;totalBonusPaid+=n;
     bonuses[i]=Object.assign({},b,{status:'paid',paidOn:currentText});
     let receipt={id:'bonus-'+b.id,kind:'bonus',date:currentText,amount:n,reason:bcTxt(b.reason)||'Approved service merit',squad};
     ledger.push(receipt);issued.push(receipt);changed=true;
   }
 }
 if(!changed)return null;
 // Existing cash and old transactions stay untouched; future pay is ledger money, not bulk coins.
 const nextBank=bcBankPayroll(v.bank_account,issued);
 const updated=Object.assign({},prev,{version:1,service:svc,cyclesPaid:paid,
   rateHistory:history.slice(-80),ledger:ledger.slice(-48),bonusAwards:bonuses.slice(-80),
   totalPaid:cumulative+cash,bonusPaid:totalBonusPaid,lastCheck:currentText,
   lastPayment:cash>0?currentText:bcTxt(prev.lastPayment)});
 return {bank_account:nextBank,mk_payroll:updated,salaryCount,bonusesCount,credited:cash};
}
