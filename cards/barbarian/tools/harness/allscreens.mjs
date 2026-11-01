import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'fs';
const dir = new URL('.', import.meta.url).pathname;
const [,, outDir, w, h] = process.argv; fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 240)); });
await p.goto('file://' + dir + 'out/index.html'); await p.waitForTimeout(400);
const ids = ['STORY','HUB','KIT','SHEET','SKILLS','PARTY','MAP','GUILD','JOURNAL','VAULT','HOME','FENCE','GRIND','WORLD'];
let i = 0;
for (const id of ids) {
  if (id !== 'STORY') {
    const label = { HUB:'Ledger',KIT:'Kit',SHEET:'Character',SKILLS:'Skills',PARTY:'Party',MAP:'Map',GUILD:'Guild',JOURNAL:'Journal' }[id];
    if (label) { await p.locator('.dsNavBtn[aria-label="' + label + '"]').first().click(); }
    else { await p.locator('.dsNavBtn[aria-label="Ledger"]').first().click(); await p.waitForTimeout(150); await p.locator('.dsTile', { hasText: { VAULT:'Bank',HOME:'Home',FENCE:'Goods',GRIND:'Commit',WORLD:'World' }[id] }).first().click(); }
  }
  await p.waitForTimeout(350);
  const o = await p.evaluate(() => ({ dw: document.documentElement.scrollWidth, main: Math.round(document.querySelector('.dsMain').getBoundingClientRect().width) }));
  if (o.dw > +w + 1) console.log('overflow', id, JSON.stringify(o));
  await p.screenshot({ path: `${outDir}/${String(i++).padStart(2, '0')}-${id}.png` });
  if (id !== 'STORY' && id !== 'HUB') { await p.locator('.dsEmblem').click(); await p.waitForTimeout(150); }
}
console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'no errors');
await b.close();
