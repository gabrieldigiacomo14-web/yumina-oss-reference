import { chromium } from 'playwright-core';
const dir = new URL('.', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 412, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + dir + 'out/index.html'); await p.waitForTimeout(600);
const W = () => p.evaluate(() => { const v = window.__getVars(); return { pulse: v.world_pulse, threads: (v.world_threads.list || []).map(t => t.id + ' ' + t.clock + ' ' + t.state + ' beats=' + (t.beats || []).length + ' heard=' + JSON.stringify(t.heard || null)), offer: v.world_threads.offer, pending: v.world_threads.pending, q: v.thread_events, rumors: (v.known_events || []).filter(e => e.kind === 'rumor') }; });
const step = async (label, fn) => { await p.evaluate(fn); await p.waitForTimeout(500); console.log('\n## ' + label + '\n' + JSON.stringify(await W(), null, 1)); };
await step('start in a tavern, no threads', () => { window.__setVars({ character_created: true, current_location: 'Rusty Tankard — Hage (Clover, Forsaken Realm)', scene_type: 'tavern', elapsed_days: 10, world_date: '1 April, CY 0', known_events: [], world_threads: {}, thread_events: [] }); window.__setMsgs([{ id: 'u1', role: 'user', content: 'I sit down.' }, { id: 'a1', role: 'assistant', content: 'The tavern is loud.' }]); });
await step('narrator opens two threads', () => window.__setVars({ thread_events: [
  { op: 'new', title: 'Wolves taking sheep on the Hage hillside', who: 'shepherds, a hungry pack', where: 'Hage hills', clock: 2, next: 'a shepherd is attacked', talk: "Old Tomas lost three ewes this week, and nobody's sending knights for sheep." },
  { op: 'new', title: 'Bandits on the Kiten road', who: 'the Red Sparrow gang', where: 'Kiten road', clock: 1, next: 'they rob a merchant caravan', talk: 'Caravans from Kiten are coming in late, and short.' } ] }));
await step('reply arrives (carries the overheard line)', () => window.__setMsgs([{ id: 'u1', role: 'user', content: 'I sit down.' }, { id: 'a1', role: 'assistant', content: 'The tavern is loud.' }, { id: 'u2', role: 'user', content: 'I order a drink.' }, { id: 'a2', role: 'assistant', content: 'At the next table a farmer grumbles about wolves.' }]));
await step('ten days pass', () => window.__setVars({ elapsed_days: 20, world_date: '11 April, CY 0' }));
await step('next reply + narrator files a beat', () => { window.__setMsgs([{ id: 'u3', role: 'user', content: 'I head out.' }, { id: 'a3', role: 'assistant', content: 'Morning comes.' }]); window.__setVars({ thread_events: [{ op: 'beat', id: 't2', text: 'The Red Sparrows hit a spice caravan outside Kiten.', next: 'Kiten hires mercenaries', talk: 'They say a whole spice caravan vanished near Kiten.' }, { op: 'hinder', id: 't1', by: 2, text: 'The character drove the pack off.' }] }); });
console.log('errors', errs.join('\n'));
await b.close();
