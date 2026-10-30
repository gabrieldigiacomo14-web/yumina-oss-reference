import { chromium } from 'playwright-core';
const dir = new URL('.', import.meta.url).pathname; const out = 'out/' + (process.argv[2] || 'mapw'); const fs = await import('fs'); fs.mkdirSync(dir + out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 412, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await p.goto('file://' + dir + 'out/index.html'); await p.waitForTimeout(500);
await p.evaluate(() => window.__setVars({ known_locations: [], current_location: "Hage — Clover Kingdom (Forsaken Realm)", player_x: -2, player_y: 52 }));
await p.evaluate(() => document.querySelector('.bc-locbar').click()); await p.waitForTimeout(1200);
await p.locator('button', { hasText: /^Expand$/ }).click(); await p.waitForTimeout(700);
await p.locator('[aria-label*="ayer"], button:has-text("Layers")').first().click().catch(e => console.log('no layers btn'));
await p.waitForTimeout(300);
await p.locator('text=Unexplored shading').first().click().catch(e => console.log('no fog toggle'));
await p.waitForTimeout(300);
await p.keyboard.press('Escape').catch(() => {});
for (let i = 0; i < 6; i++) { await p.locator('[aria-label="Zoom out"]').click().catch(() => {}); await p.waitForTimeout(80); }
await p.waitForTimeout(1400); await p.screenshot({ path: dir + out + '/1-world.png' });
for (let i = 0; i < 2; i++) { await p.locator('[aria-label="Zoom in"]').click(); await p.waitForTimeout(80); }
await p.waitForTimeout(1200); await p.screenshot({ path: dir + out + '/2-clover.png' });
console.log('errors', errs.join('\n').slice(0,600)); await b.close();
