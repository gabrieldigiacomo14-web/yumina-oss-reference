// v21.19 vitals guard: direct mana cuts undone, oversized stamina cuts trimmed, engine-paid spells untouched
import { chromium } from 'playwright-core';
const dir = new URL('.', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 412, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + dir + 'out/index.html'); await p.waitForTimeout(500);
const check = (name, ok, info) => console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''));
const V = () => p.evaluate(() => { const v = window.__getVars(); return { mana: v.mana, stamina: v.stamina, guard: v.vitals_guard }; });
let msgs = [{ id: "g-a0", role: "assistant", content: "The hideout is quiet." }];
const say = async (role, id, content, vars) => { msgs = msgs.concat([{ id, role, content }]); await p.evaluate(([m, vars]) => { if (vars) window.__setVars(vars); window.__setMsgs(m); }, [msgs, vars || null]); await p.waitForTimeout(800); };
await p.evaluate((m) => { window.__setVars({ magic_profile: Object.assign({}, window.__getVars().magic_profile, { capacity: 55, output: 45, control: 40 }), mana: 80, stamina: 90, in_combat: false, world_time: "10:00", elapsed_days: 40 }); window.__setMsgs(m); }, msgs); await p.waitForTimeout(800);
let r = await V(); check('first run only starts watching', r.guard && r.guard.replyId === 'g-a0' && r.mana === 80, JSON.stringify(r));
// 1. player says they're tired; the narrator cuts mana and stamina directly
await say('user', 'g-u1', "I'm tired.");
await say('assistant', 'g-a1', "You slump onto the bench, worn out.\n[mana: -20]\n[stamina: -30]\n[world_time: set \"10:05\"]", { mana: 60, stamina: 60, world_time: "10:05" });
r = await V(); check('direct mana cut is undone', r.mana === 80, 'mana ' + r.mana);
check('stamina cut trimmed to 12', r.stamina === 78, 'stamina ' + r.stamina + ' log ' + JSON.stringify(r.guard.log));
// 2. a spell paid through the engine is not refunded
await say('user', 'g-u2', "I fight him.");
await say('assistant', 'g-a2', "You loose a crescent of wind at the thug.\n[spell_events: push {\"id\":\"cast-g2\",\"kind\":\"cast\",\"actor\":\"player\",\"spellId\":\"freeform\",\"freeform\":true,\"tier\":\"standard\",\"output\":\"Normal\"}]",
  { spell_events: [{ id: "cast-g2", kind: "cast", actor: "player", spellId: "freeform", freeform: true, tier: "standard", output: "Normal" }] });
await p.waitForTimeout(600);
console.log('  ledger', JSON.stringify(await p.evaluate(() => { const v = window.__getVars(); return [v.spell_events, (v.spell_ledger || {}).results, v.magic_profile && v.magic_profile.capacity]; })).slice(0, 500)); r = await V(); check('engine-paid spell keeps its cost', r.mana < 80 && r.mana >= 70, 'mana ' + r.mana);
const afterSpell = r.mana;
// 3. a long march: six hours pass, a big stamina cost is allowed
await say('user', 'g-u3', "We march to Kiten.");
await say('assistant', 'g-a3', "Six hours on the road.\n[stamina: -40]\n[world_time: set \"16:05\"]", { stamina: 38, world_time: "16:05" });
r = await V(); check('six hours of marching may cost 40 stamina', r.stamina === 38, 'stamina ' + r.stamina);
// 4. rest restores mana (a raise is never touched)
await say('user', 'g-u4', "I sleep.");
await say('assistant', 'g-a4', "You sleep deeply.\n[mana: +15]", { mana: afterSpell + 15 });
r = await V(); check('recovery is left alone', r.mana === afterSpell + 15, 'mana ' + r.mana);
// 5. the same reply is never handled twice
await p.evaluate(() => window.__setVars({ mana: 50 })); await p.waitForTimeout(600);
r = await V(); check('a handled reply is not re-applied', r.mana === 50, 'mana ' + r.mana);
console.log('errors', errs.join('\n').slice(0, 600));
await b.close();
