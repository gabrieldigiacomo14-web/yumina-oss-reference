import { chromium } from 'playwright-core';
const dir = new URL('.', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 412, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + dir + 'out/index.html'); await p.waitForTimeout(600);
await p.evaluate(() => window.__setVars({ character_created: true, has_grimoire: true, magic_profile: { attribute: 'Wind' }, grimoire: { leaf_count: 3, insignia: 'clover' } }));
await p.locator('[aria-label="Magic"], button:has-text("Magic")').first().click(); await p.waitForTimeout(300);
await p.locator('button:has-text("Customize")').first().click(); await p.waitForTimeout(300);
const combos = [
  { label: 'base', set: [] },
  { label: 'velvet-royal-medallion', set: [['Cover color', 'Wine'], ['Trim', 'Silver'], ['Material', 'Velvet'], ['Decoration', 'Royal'], ['Insignia setting', 'Medallion']] },
  { label: 'metal-runic-lock', set: [['Cover color', 'Ash grey'], ['Material', 'Metal'], ['Decoration', 'Runic'], ['Clasp', 'Lock'], ['Page edges', 'Gilded']] },
  { label: 'stone-ancient-chains', set: [['Cover color', 'Umber brown'], ['Trim', 'Dark iron'], ['Material', 'Stone'], ['Condition', 'Ancient'], ['Clasp', 'Chains'], ['Magic aura', 'Strong']] },
  { label: 'scale-arcane-gems', set: [['Cover color', 'Teal'], ['Trim', 'Rose gold'], ['Material', 'Scaled hide'], ['Decoration', 'Arcane'], ['Insignia setting', 'Gem-set'], ['Condition', 'Battle-scarred'], ['Page edges', 'Red']] },
  { label: 'wood-ornate-strap', set: [['Cover color', 'Amber gold'], ['Trim', 'Bronze'], ['Material', 'Wood'], ['Decoration', 'Ornate'], ['Clasp', 'Strap'], ['Magic aura', 'Normal'], ['Condition', 'Worn']] },
];
const fs = await import('fs'); fs.mkdirSync(dir + 'out/covers', { recursive: true });
for (const c of combos) {
  for (const [grp, opt] of c.set) { await p.locator(`[role=radiogroup][aria-label="${grp === 'Cover color' ? 'color' : grp === 'Trim' ? 'trim' : grp === 'Page edges' ? 'edges' : grp}"] [aria-label="${opt}"], [role=radiogroup][aria-label="${grp}"] button:has-text("${opt}")`).first().click(); }
  await p.waitForTimeout(150);
  await p.locator('.bc-forge-preview svg').first().screenshot({ path: dir + 'out/covers/' + c.label + '.png' });
}
console.log('errors', errs.join('\n').slice(0, 800));
await b.close();
