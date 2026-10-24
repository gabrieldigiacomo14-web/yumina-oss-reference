import { chromium } from 'playwright-core';
const dir = new URL('.', import.meta.url).pathname;
const out = 'out/yami'; const fs = await import('fs'); fs.mkdirSync(dir + out, { recursive: true });
const output = Number(process.argv[2] || 40), foeName = process.argv[3] || 'Captain Yami Sukehiro', label = process.argv[4] || 'average';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 412, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + dir + 'out/index.html'); await p.waitForTimeout(500);
await p.evaluate(([output, foeName, label]) => window.__setVars({ in_combat: true, scene_type: 'street', vitality: 100, magic_profile: { capacity: 55, control: 42, output, attribute: 'Wind', bands: {} }, mana: 90,
  spells: [{ id: 'sp-gale-edge', name: 'Wind Magic: Gale Edge', proficiency: 'Familiar', behavior: 'A thin crescent of compressed wind.' }, { id: 'sp-gust-wall', name: 'Wind Magic: Gust Wall', proficiency: 'Novice', behavior: 'A barrier of whirling wind.', category: 'defense' }],
  combat: { active: true, location: 'Hage square', participants: [{ name: foeName, side: 'enemy', threat: label, condition: 'ready', notes: 'lazy-looking' }] } }), [output, foeName, label]);
await p.locator('.bc-nav-story-btn').first().click(); await p.waitForTimeout(300);
await p.locator('text=Fight it out').first().click(); await p.waitForTimeout(400);
await p.screenshot({ path: dir + out + '/1-intro.png' });
console.log('warn:', await p.locator('.bcb-warn').count() ? await p.locator('.bcb-warn').innerText() : 'none', '| run btn:', await p.locator('button:has-text("Run")').count());
await p.locator('.bcb-big').first().click(); await p.waitForTimeout(600);
const keys = ['w', 'a', 'd', 's']; const t0 = Date.now(); let shots = 0;
for (let t = 0; t < 1200 && Date.now() - t0 < 80000; t++) {
  const k = keys[(t >> 2) % 4]; await p.keyboard.down(k);
  await p.keyboard.press(t % 3 === 0 ? '1' : 'j'); if (t % 5 === 0) await p.keyboard.press(' ');
  await p.waitForTimeout(80); await p.keyboard.up(k);
  if (Date.now() - t0 > 20000 && shots === 0) { shots++; await p.screenshot({ path: dir + out + '/2-mid.png' }); }
  if (await p.locator('.bcb-result').count()) break;
}
await p.waitForTimeout(1500);
const res = await p.locator('.bcb-result').count() ? { title: await p.locator('.bcb-res-title').innerText(), foes: await p.locator('.bcb-res-foes').innerText(), grid: await p.locator('.bcb-res-grid').innerText() } : 'still fighting';
console.log('real seconds', Math.round((Date.now() - t0) / 1000), JSON.stringify(res));
await p.screenshot({ path: dir + out + '/3-result.png' });
console.log('errors', errs.join('\n').slice(0, 800));
await b.close();
