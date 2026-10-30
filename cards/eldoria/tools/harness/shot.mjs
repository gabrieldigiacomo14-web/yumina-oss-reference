import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'fs';
const dir = new URL('.', import.meta.url).pathname;
const [,, outDir, w = '390', h = '844', ...steps] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const html = `<!doctype html><html><head><meta name=viewport content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;height:100%}</style><style>${fs.readFileSync(dir + 'yumina-base.css', 'utf8')}</style></head><body><div id=root></div><script>${fs.readFileSync(dir + 'state.js', 'utf8')}</script><script>${fs.readFileSync(dir + 'out/app.js', 'utf8')}</script></body></html>`;
fs.writeFileSync(dir + 'out/index.html', html);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + dir + 'out/index.html'); await p.waitForTimeout(500);
let i = 0;
try { for (const s of steps) {
  if (s.startsWith('click=')) { const t = s.slice(6); await p.locator(`[aria-label="${t}"], button:has-text("${t}")`).first().click(); await p.waitForTimeout(300); }
  else if (s.startsWith('eval=')) { await p.evaluate(s.slice(5)); await p.waitForTimeout(200); }
  else if (s.startsWith('wait=')) { await p.waitForTimeout(+s.slice(5)); }
  else if (s.startsWith('shot=')) { await p.waitForTimeout(250); await p.screenshot({ path: `${outDir}/${String(i++).padStart(2, '0')}-${s.slice(5)}.png` }); }
  else if (s === 'overflow') { console.log('overflow', JSON.stringify(await p.evaluate(() => ({ docW: document.documentElement.scrollWidth, winW: innerWidth, app: (document.querySelector('.app') || {}).scrollWidth, appBox: document.querySelector('.app') && Math.round(document.querySelector('.app').getBoundingClientRect().width), msgsH: document.querySelector('.messages') && Math.round(document.querySelector('.messages').getBoundingClientRect().height), nav: document.querySelector('nav') && JSON.stringify(document.querySelector('nav').getBoundingClientRect()) })))); }
} } catch (e) { console.log('STEP FAIL', String(e).slice(0, 300)); }
if (errs.length) console.log('ERRORS:', errs.join('\n').slice(0, 1500));
await b.close();
