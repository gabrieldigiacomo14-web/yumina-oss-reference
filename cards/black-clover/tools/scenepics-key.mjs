import { chromium } from 'playwright-core';
const dir = new URL('.', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 412, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + dir + 'out/index.html'); await p.waitForTimeout(600);
await p.evaluate(() => { window.__illusDelay = 50; window.__imgSettings = { available: true, auto: false }; window.__setVars({ character_created: true, current_location: "Mira's Bakery — Hage (Clover, Forsaken Realm)", world_time: '10:00', in_combat: false, scene_pics: { mode: 'key' } }); window.__msgs = []; });
let n = 0;
async function reply(label, vars) {
  n++; await p.evaluate(([n, vars]) => { window.__setVars(vars || {}); window.__msgs.push({ id: 'u' + n, role: 'user', content: 'go ' + n }, { id: 'a' + n, role: 'assistant', content: 'Reply number ' + n + '.' }); window.__setMsgs(window.__msgs.map(m => ({ ...m }))); }, [n, vars]);
  await p.waitForTimeout(450);
  const drawn = await p.evaluate(() => (window.__illus || []).map(x => x.id));
  console.log(label.padEnd(34), '-> drawn so far:', drawn.join(','));
}
await reply('1 first reply of the story');
await reply('2 same place');
await reply('3 same place');
await reply('4 same place (gap 3 not enough)');
await reply('5 new place', { current_location: 'Hage Market — Hage (Clover, Forsaken Realm)' });
await reply('6 fight starts (gap only 1)', { in_combat: true });
await reply('7 fight ongoing');
await reply('8 fight ends', { in_combat: false });
console.log('errors', errs.join('\n'));
await b.close();
