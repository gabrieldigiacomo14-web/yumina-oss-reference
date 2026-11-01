import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = new URL('.', import.meta.url).pathname;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.goto('file://' + dir + 'out/index.html'); await p.waitForTimeout(400);
const inv = () => p.evaluate(() => window.__getVars().inventory.map(i => ({ id: i.id, name: i.name, qty: i.qty, eq: !!i.equipped, slot: i.slot, pl: i.placement && (i.placement.kind + (i.placement.slotId ? ':' + i.placement.slotId : '')) })));
const find = (list, n) => list.filter(i => i.name === n);
const openItem = async n => { await p.evaluate(n => [...document.querySelectorAll('.dsItem')].find(b => b.querySelector('b') && b.querySelector('b').textContent.startsWith(n)).click(), n); await p.waitForTimeout(150); };
const btn = async t => { await p.evaluate(t => [...document.querySelectorAll('.dsSheet button')].find(b => b.textContent.startsWith(t)).click(), t); await p.waitForTimeout(200); };
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
await p.locator('.dsNavBtn[aria-label="Kit"]').click(); await p.waitForTimeout(200);
// 1 equip the dagger: the mace comes off and is carried loose
await openItem('Goblin Dagger'); await btn('Equip');
let L = await inv(); ok(find(L,'Goblin Dagger')[0].eq && find(L,'Goblin Dagger')[0].pl==='body', 'dagger equipped and on the body');
ok(!find(L,'Flanged Mace')[0].eq && find(L,'Flanged Mace')[0].pl==='loose', 'mace taken off and held loose');
// 2 equip the iron cap straight out of the pack: placement moves to the body
await openItem('Iron Cap'); await btn('Equip');
L = await inv(); ok(find(L,'Iron Cap')[0].eq && find(L,'Iron Cap')[0].pl==='body', 'cap out of the pack and worn');
// 3 split rations
await openItem('Trail Rations'); await btn('Split 2');
L = await inv(); ok(find(L,'Trail Rations').map(x=>x.qty).sort().join()==='2,2', 'rations split 2 + 2: ' + JSON.stringify(find(L,'Trail Rations')));
// 4 move the mace into a weapon holder
await p.evaluate(() => document.querySelector('.dsVeil') && document.querySelector('.dsVeil').click()); await p.waitForTimeout(100);
await openItem('Flanged Mace'); await btn('Move to'); await p.evaluate(() => [...document.querySelectorAll('.dsMove.ok')].find(b => b.textContent.includes('Weapon holder l')).click()); await p.waitForTimeout(200);
L = await inv(); ok(find(L,'Flanged Mace')[0].pl==='container:weapon-left', 'mace into weapon holder L: ' + find(L,'Flanged Mace')[0].pl);
// 5 drink from the waterskin (ready access, not in a fight)
await p.evaluate(() => document.querySelector('.dsVeil') && document.querySelector('.dsVeil').click()); await p.waitForTimeout(100);
const hyd0 = await p.evaluate(() => window.__getVars().hydration);
await openItem('Waterskin'); await btn('Drink');
const v1 = await p.evaluate(() => ({ h: window.__getVars().hydration, w: window.__getVars().inventory.find(i => i.name === 'Waterskin').container.current }));
ok(v1.h > hyd0 && v1.w < 40, 'drank: hydration ' + hyd0 + '→' + v1.h + ', skin 40→' + v1.w);
// 6 pick up the torch from the ground
await p.evaluate(() => document.querySelector('.dsVeil') && document.querySelector('.dsVeil').click()); await p.waitForTimeout(100);
await p.evaluate(() => [...document.querySelectorAll('.dsBtn')].find(b => b.textContent === 'Pick up').click()); await p.waitForTimeout(200);
const g = await p.evaluate(() => window.__getVars()['ground-items'].length);
L = await inv(); ok(g === 0 && find(L,'Burnt-out Torch').length === 1, 'torch picked up into ' + (find(L,'Burnt-out Torch')[0]||{}).pl);
// 7 drop one fang: ground gets one, stack shrinks
await openItem('Cave Bat Fangs'); await btn('Drop one');
L = await inv(); const g2 = await p.evaluate(() => window.__getVars()['ground-items'].map(x=>x.name+':'+x.qty));
ok(find(L,'Cave Bat Fangs')[0].qty === 5 && g2.join()==='Cave Bat Fangs:1', 'dropped one fang: ' + g2);
// 8 in a fight, a buried item cannot be used
await p.evaluate(() => window.__setVars({ 'encounter-state': { active: true } })); await p.waitForTimeout(200);
const stillKit = await p.evaluate(() => !!document.querySelector('.dsKit'));
ok(stillKit, 'the Kit stays open when a fight starts');
const before = await p.evaluate(() => window.__getVars().inventory.find(i => i.name === 'Hemp Rope').qty);
await openItem('Hemp Rope'); await btn('Use');
const ctx = await p.evaluate(() => (window.__ctx || []).slice(-1)[0]);
ok(/cannot be used instantly/.test(ctx), 'buried rope refused in a fight');
const ctxAll = await p.evaluate(() => (window.__ctx || []).length);
ok(ctxAll >= 7, 'the GM was told about each physical action (' + ctxAll + ' notes)');
console.log(errs.length ? 'ERRORS ' + errs.join('\n') : 'no page errors');
await b.close();
