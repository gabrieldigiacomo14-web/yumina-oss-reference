import { createRequire } from 'module';
const { chromium } = createRequire('/home/user/eldoria-work/harness/')('playwright');
const dir='/home/user/eldoria-work/harness/';
const b = await chromium.launch();
for (const [w,h] of [[390,844],[844,390],[1440,900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  // the player's saved choice: Desktop
  await p.addInitScript(() => { window.__PRESET_STORE = { 'eldoria-layout-v1': 'desktop' }; });
  await p.goto('file://' + dir + 'out/index.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>{}); 
  const mode = await p.evaluate(() => document.querySelector('.app').className.match(/lay-\w+/)[0]);
  const mainW = await p.evaluate(() => Math.round(document.querySelector('main').getBoundingClientRect().width));
  console.log(w+'x'+h, mode, 'main width', mainW);
  await p.screenshot({path:'/tmp/stuck-'+w+'.png'});
}
await b.close();
