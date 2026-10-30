import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = new URL('.', import.meta.url).pathname;
const b = await chromium.launch();
for (const [w, h] of [[844, 390], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('file://' + dir + 'out/index.html'); await p.waitForTimeout(300);
  await p.evaluate(() => window.__setVars({ 'character-created': false })); await p.waitForTimeout(300);
  await p.mouse.move(w / 2, h / 2); await p.mouse.wheel(0, 900); await p.waitForTimeout(400);
  console.log(w + 'x' + h, JSON.stringify(await p.evaluate(() => { const c = document.querySelector('.creator'); return { creatorH: c.scrollHeight, clientH: c.clientHeight, scrollTop: c.scrollTop, docScroll: document.scrollingElement.scrollTop }; })));
}
await b.close();
