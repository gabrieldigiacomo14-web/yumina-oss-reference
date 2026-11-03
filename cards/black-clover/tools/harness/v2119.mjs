// v21.19 checks: power scale, squad roster reads the story, bloodied clothes, Sosshi map merge
import { chromium } from 'playwright-core';
const dir = new URL('.', import.meta.url).pathname; const out = 'out/v2119'; const fs = await import('fs'); fs.mkdirSync(dir + out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 412, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + dir + 'out/index.html'); await p.waitForTimeout(500);
const nav = async (t) => { await p.evaluate((t) => [...document.querySelectorAll('.bc-nav-item')].find(b => b.textContent.trim().startsWith(t)).click(), t); await p.waitForTimeout(500); };
const check = (name, ok, info) => console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''));
await p.evaluate(() => window.__setVars({ magic_profile: Object.assign({}, window.__getVars().magic_profile, { output: 30 }),
  mk_status: { squad: "Black Bulls", rank: "Junior Magic Knight, 5th Class" }, elapsed_days: 40, world_date: "2 May, CY 0",
  current_location: "Black Bulls Hideout — Clover Kingdom (Common Realm)", party: [],
  squad_events: [{ type: "join", name: "Yami Sukehiro", role: "Captain", joined: "before", location: "Black Bulls Hideout" },
    { type: "join", name: "Luck Voltia", magic: "Lightning", joined: "before", location: "Kiten", mission: "Border patrol" },
    { type: "join", name: "Magna Swing", magic: "Fire", joined: "before", location: "Castle Town" }],
  relationships: { "yami-sukehiro": { name: "Yami Sukehiro", role: "Captain of the Black Bulls", affinity: 20 }, "mira": { name: "Mira", role: "Baker in Hage", affinity: 10 } } }));
await p.waitForTimeout(900);
// 1. the narrator writes a reply, files no squad_events
await p.evaluate(() => window.__setMsgs([{ id: "t-u1", role: "user", content: "I head down to the common room." },
  { id: "t-a1", role: "assistant", content: "Luck Voltia bursts through the door, bleeding from a cut above his eye and grinning. \"Fight me!\"\nYami doesn't look up from his paper. Somewhere far off, Magna is probably still on his mission.\n[world_time: set \"18:20\"]" }]));
await p.waitForTimeout(1000);
let r = await p.evaluate(() => { const B = window.__getVars().squad_roster.squads["Black Bulls"]; return { luck: [B["luck voltia"].with, B["luck voltia"].condition], yami: B["yami sukehiro"].with, magna: B["magna swing"].with, sum: window.__getVars().squad_summary }; });
check('squad: Luck seen here and injured from the story', r.luck[0] === true && r.luck[1] === 'injured', JSON.stringify(r.luck));
check('squad: Yami seen here', r.yami === true);
check('squad: Magna only mentioned as away', r.magna !== true);
console.log('  summary:', r.sum);
// 2. three replies without Luck: no longer with you
for (const id of ["t-a2", "t-a3", "t-a4"]) { await p.evaluate((id) => window.__setMsgs([{ id: id, role: "assistant", content: "Yami yawns. The hideout creaks. " + id }]), id); await p.waitForTimeout(700); }
r = await p.evaluate(() => window.__getVars().squad_roster.squads["Black Bulls"]["luck voltia"].with);
check('squad: Luck drops off after 3 quiet replies', r === false);
await nav('Renown'); await p.locator('.bc-sq-main', { hasText: 'Yami Sukehiro' }).click(); await p.waitForTimeout(300);
await p.evaluate(() => document.querySelector('.bc-sq-card .bc-pw').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
const sqpw = await p.evaluate(() => { const e = document.querySelector('.bc-sq-card .bc-pw'); return e ? e.textContent : ''; });
check('power scale on squad card (Yami far beyond)', /Far beyond you/.test(sqpw), sqpw.slice(0, 160));
await p.screenshot({ path: dir + out + '/1-squad-power.png' });
// 3. person sheet
await nav('Relations'); await p.locator('[aria-label="Open Yami Sukehiro"]').click(); await p.waitForTimeout(400);
const pspw = await p.evaluate(() => { const e = document.querySelector('.bc-pw'); return e ? e.textContent : ''; });
check('power scale on person sheet', /Arcane Stage/.test(pspw), pspw.slice(0, 160));
await p.screenshot({ path: dir + out + '/2-person-power.png' });
await p.keyboard.press('Escape'); await p.evaluate(() => { const c = [...document.querySelectorAll('button')].find(b => /close|back/i.test(b.getAttribute('aria-label') || b.textContent)); c && c.click(); }); await p.waitForTimeout(300);
await p.locator('[aria-label="Open Mira"]').click().catch(() => {}); await p.waitForTimeout(300);
const mira = await p.evaluate(() => [...document.querySelectorAll('.bc-pw')].map(e => e.textContent).join('|'));
check('no scale for an unknown baker', !/Mira/.test(mira), mira.slice(0, 120));
// 4. combat bar
await p.evaluate(() => window.__setVars({ in_combat: true, combat: { location: "Hideout yard", participants: [{ name: "Yami Sukehiro", side: "enemy", condition: "relaxed" }, { name: "Bandit", side: "enemy", threat: "weak" }] } }));
await p.evaluate(() => { const c = [...document.querySelectorAll('button')].find(b => /^(close|back|done)$/i.test((b.getAttribute('aria-label') || b.textContent).trim())); c && c.click(); }); await p.waitForTimeout(300); console.log('  nav:', await p.evaluate(() => [...document.querySelectorAll('.bc-nav-item')].map(b => b.textContent.trim()).join(','))); await p.screenshot({ path: dir + out + '/dbg.png' }); await p.evaluate(() => { const n = [...document.querySelectorAll('.bc-nav-item, nav button')].find(b => /story/i.test((b.getAttribute('aria-label') || '') + b.className)); n && n.click(); });  await p.waitForTimeout(400);
const cb = await p.evaluate(() => [...document.querySelectorAll('.bc-combatbar-pw')].map(e => e.textContent));
check('combat bar shows power for foes', cb.length === 2 && /Far beyond/.test(cb[0]) && /Weaker|Far weaker|About/.test(cb[1]), JSON.stringify(cb));
await p.screenshot({ path: dir + out + '/3-combat-bar.png' });
await p.evaluate(() => window.__setVars({ in_combat: false, combat: {} }));
// 5. ruined and bloodied clothes reach the narrator's appearance
await p.evaluate(() => { const v = window.__getVars(); const inv = v.inventory.map(it => /clothes|uniform|robe|shirt|tunic|outfit/i.test(it.name) && it.placement && it.placement.kind === 'body' ? Object.assign({}, it, { cond: "ruined and bloodied" }) : it); window.__setVars({ inventory: inv }); });
await p.waitForTimeout(1200);
const ap = await p.evaluate(() => { const a = window.__getVars().appearance_state || {}; return { sum: a.summary, sig: (a.social || {}).visibleSignals, cond: (a.social || {}).condition }; });
check('appearance shows ruined and bloodied', /ruined and bloodied/.test(ap.sum || '') && /blood/i.test(JSON.stringify(ap.sig)), JSON.stringify(ap));
// 6. map: AI "Sosshi Village" merges with canon "Saussy (Sosshi)"
await p.evaluate(() => window.__setVars({ known_locations: [{ name: "Sosshi Village", status: "visited", kingdom: "Clover", region: "Forsaken Realm", notes: "engulfed in an unnatural, magical freezing fog" }] }));
await nav('Realm'); await p.evaluate(() => document.querySelector('.bc-locbar').click()); await p.waitForTimeout(100);
await p.waitForSelector('.bcwm-terrain:not([style*="display: none"])', { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
const pins = await p.evaluate(() => ({ canon: [...document.querySelectorAll('.bcwm-canon')].map(e => e.textContent).filter(t => /sosshi|saussy/i.test(t)), all: document.body.innerText.match(/Sosshi|Saussy/g) }));
check('map: no second canon pin for Sosshi', pins.canon.length === 0, JSON.stringify(pins));
await p.screenshot({ path: dir + out + '/4-map.png' });
// 7. Magic Stages: same measure for the player, a created NPC and canon
await p.evaluate(() => window.__setVars({ known_locations: [] }));
const st = await p.evaluate(() => window.__getVars().magic_stage);
check('magic_stage written for the narrator', /^Stage \d|Arcane|Saint/.test(st || ''), st);
await p.evaluate(() => window.__setVars({ world_truth: { npcs: { "bandit-mage": { name: "Bandit Mage", magic_profile: { output: 62, capacity: 55, control: 50, attribute: "Earth" } },
  "odd-boy": { name: "Odd Boy", magic_profile: { output: 72, capacity: 70, control: 65, attribute: "Time" } } } },
  relationships: { "bandit-mage": { name: "Bandit Mage", role: "Outlaw" }, "odd-boy": { name: "Odd Boy", role: "Wanderer" }, "asta": { name: "Asta", role: "Black Bulls" } } }));
await p.waitForTimeout(500);
await nav('Relations');
const read = async (nm) => { await p.locator('[aria-label="Open ' + nm + '"]').click(); await p.waitForTimeout(300); const t = await p.evaluate(() => { const e = document.querySelector('.bc-pw'); return e ? e.querySelector('small').textContent : ''; }); await p.evaluate(() => { const c = [...document.querySelectorAll('button')].find(b => /^close$/i.test((b.getAttribute('aria-label') || b.textContent).trim())); c && c.click(); }); await p.waitForTimeout(200); return t; };
const bm = await read('Bandit Mage'); check('created NPC measured from magic profile', /^Bandit Mage|Stage \d/.test(bm) && !/canon/.test(bm), bm);
const ob = await read('Odd Boy'); check('created NPC with one-of-a-kind magic is Arcane, raw power shown', /Arcane Stage \(one-of-a-kind magic; raw power Stage \d\)/.test(ob), ob);
const as = await read('Asta'); check('Asta is canon Arcane by unique magic', /Arcane Stage \(one-of-a-kind/.test(as) && /canon/.test(as), as);
await nav('Magic'); await p.waitForTimeout(300);
const card = await p.evaluate(() => { const e = document.querySelector('.bc-stagecard'); if (e) e.scrollIntoView({ block: 'center' }); return e ? e.textContent : ''; });
check('Magic screen shows your stage card', /Magic Stage/.test(card) && /Toward/.test(card), card.slice(0, 140));
await p.waitForTimeout(200); await p.screenshot({ path: dir + out + '/5-stage-card.png' });
console.log('errors', errs.join('\n').slice(0, 800));
await b.close();
