/* Black Clover — deterministic bank, wallet and treasury model.
 * Yul denomination weights / access branches are gameplay assumptions,
 * not a canonical denomination catalogue or official banking institution.
 * `money` is carried purse; `bank_account.balance` is secured ledger money.
 * Neither balance is an inventory item. No AI or chat is needed for transfers.
 */
const integer = (n,d=0) => Number.isSafeInteger(Number(n)) && Number(n)>=0 ? Number(n) : d;
const str = s => s==null?'':String(s);
const MAX_YUL = 1_000_000_000_000;
export const BC_YUL_DENOMS = Object.freeze([
  {value:10000,kind:'note',grams:1.5},
  {value:1000,kind:'note',grams:1.5},
  {value:100,kind:'coin',grams:5},
  {value:10,kind:'coin',grams:3},
  {value:1,kind:'coin',grams:1.5}
]);
export function bcWalletProfile(money) {
  let remainder=integer(money),count=0,grams=0;
  const denominations=BC_YUL_DENOMS.map(d=>{
    const qty=Math.floor(remainder/d.value);remainder-=qty*d.value;
    count+=qty;grams+=qty*d.grams;
    return {value:d.value,kind:d.kind,count:qty};
  });
  return {yul:integer(money),weightKg:Math.round(grams*100)/100000,
    pieces:count,denominations};
}
export function bcBankState(raw) {
  const a=raw && typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  return {version:1,open:a.open===true,balance:integer(a.balance),
    ledger:Array.isArray(a.ledger)?a.ledger.slice(-80):[],txSeq:integer(a.txSeq),
    accountType:str(a.accountType||'personal'),lastTransaction:str(a.lastTransaction||'')};
}
// Publicly visible bank/treasury premises only; a river bank or private residence
// does not count. Location is supplied by the GM's authoritative world state.
export function bcBankHere(v) {
  const s=str(v&&v.current_location).toLowerCase();
  if(!s||/river\s*bank|riverbank|lake\s*bank|sand\s*bank|blood\s*bank/.test(s))return false;
  return /\b(bank(?:ing)?(?:\s+(?:office|hall|branch|counter|house))?|treasury\s+(?:office|counter|hall)|financial\s+office|counting[- ]house|money\s+exchange|exchange\s+office|cashier\s+office)\b/.test(s);
}
function append(a,entry) {
  return {...a,ledger:a.ledger.concat([entry]).slice(-80),lastTransaction:entry.id};
}
export function bcBankOpen(raw,ctx) {
  if(!bcBankHere(ctx))return {ok:false,reason:'Visit a staffed bank or treasury office to open an account.'};
  const acc=bcBankState(raw);
  if(acc.open)return {ok:false,reason:'Your account is already open.'};
  return {ok:true,bank_account:append({...acc,open:true},
    {id:'open-'+str(ctx.world_date)+'-'+str(ctx.world_time),kind:'open',amount:0,at:str(ctx.world_date),location:str(ctx.current_location)})};
}
export function bcBankTransfer(v,kind,rawAmount) {
  const amount=Number(rawAmount),cash=integer(v&&v.money),acc=bcBankState(v&&v.bank_account);
  if(!bcBankHere(v))return {ok:false,reason:'Visit a staffed bank or treasury office; remote transactions are unavailable.'};
  if(!acc.open)return {ok:false,reason:'Open an account at this office first.'};
  if(!Number.isSafeInteger(amount)||amount<=0||amount>MAX_YUL)return {ok:false,reason:'Enter a positive whole-Yul amount.'};
  if(kind!=='deposit'&&kind!=='withdraw')return {ok:false,reason:'Unsupported transaction.'};
  if(kind==='deposit'&&amount>cash)return {ok:false,reason:'You do not have that much cash.'};
  if(kind==='withdraw'&&amount>acc.balance)return {ok:false,reason:'Insufficient funds in your account.'};
  const money=kind==='deposit'?cash-amount:cash+amount;
  const balance=kind==='deposit'?acc.balance+amount:acc.balance-amount;
  if(money>MAX_YUL||balance>MAX_YUL)return {ok:false,reason:'Account limit exceeded.'};
  const transactionId='bank-'+(acc.txSeq+1);
  if(acc.ledger.some(x=>x.id===transactionId))return {ok:false,reason:'Transaction sequence conflict; refresh bank details.'};
  const entry={id:transactionId,kind,amount,at:str(v.world_date),time:str(v.world_time),location:str(v.current_location),balanceAfter:balance};
  return {ok:true,money,bank_account:append({...acc,balance,txSeq:acc.txSeq+1},entry),entry};
}
// Authenticated service payslips are issued once by the existing payroll engine.
// Future salary NEVER materializes as a carried sack of coins.
export function bcBankPayroll(raw,entries,location) {
  const a=bcBankState(raw),valid=(Array.isArray(entries)?entries:[]).filter(x=>x&&x.id&&integer(x.amount)>0);
  if(!valid.length)return a;
  let b={...a,open:true,accountType:a.open?a.accountType:'Magic Knight treasury payroll'};
  for(const pay of valid){
    const id='mk-'+pay.id;
    if(b.ledger.some(x=>x.id===id))continue;
    const amount=integer(pay.amount);
    if(b.balance+amount>MAX_YUL)throw new Error('Payroll treasury account capacity exceeded.');
    b=append({...b,balance:b.balance+amount},
      {id,kind:pay.kind==='bonus'?'award':'salary',amount,at:str(pay.date),location:location||'Squad treasury',balanceAfter:b.balance});
  }
  return b;
}
