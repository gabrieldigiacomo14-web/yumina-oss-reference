import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'fs';
const dir = new URL('.', import.meta.url).pathname;
const [,, outDir, w, h] = process.argv; fs.mkdirSync(outDir, { recursive: true });
const html = fs.readFileSync(dir + 'out/index.html', 'utf8');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.goto('file://' + dir + 'out/index.html'); await p.waitForTimeout(400);
const main = ['Ledger','Hero','Skills','Quests','Map','Magic','Gear','More'];
const sub = ['Quest Boards','Party','Guild','Training','Callings','Wounds & Conditions','Banking','Markets','Merchants','Crafting','World Events','News & Rumors','Politics','Faiths','Factions','History','Codex','Journal','Settings'];
let i = 0;
for (const t of main.concat(sub)) {
  if (sub.includes(t)) { await p.locator('.elNav .navBtn', { hasText: 'More' }).first().click(); await p.waitForTimeout(150); await p.locator('.screen .tile', { hasText: t }).first().click(); }
  else await p.locator('.elNav .navBtn', { hasText: t }).first().click();
  await p.waitForTimeout(t === 'Map' ? 1200 : 200);
  const o = await p.evaluate(() => ({ dw: document.documentElement.scrollWidth, sw: Math.max(...[...document.querySelectorAll('.screen')].map(e => e.scrollWidth - e.clientWidth)) }));
  if (o.dw > innerWidthSafe(+w) || o.sw > 1) console.log('overflow', t, JSON.stringify(o));
  await p.screenshot({ path: `${outDir}/${String(i++).padStart(2, '0')}-${t.replace(/\W+/g, '_')}.png` });
}
function innerWidthSafe(x) { return x; }
console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'no errors');
await b.close();
