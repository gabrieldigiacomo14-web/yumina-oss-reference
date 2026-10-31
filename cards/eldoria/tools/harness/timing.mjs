import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = new URL('.', import.meta.url).pathname;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('file://' + dir + 'out/index.html'); await p.waitForTimeout(400);
const t0 = Date.now(); await p.locator('button:has-text("World")').first().click();
await p.waitForSelector('.elwm-loading', { state: 'detached', timeout: 20000 });
console.log('map ready (generate + first render) in', Date.now() - t0, 'ms');
await b.close();
