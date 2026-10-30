import * as C from './carto.mjs';
const P = C.politics([]);
const names = ['Clover', 'Diamond', 'Heart', 'Spade'];
const own = (x, y) => { const o = C.ownerAtKm(P, x, y); return o < 0 ? 'neutral' : names[o]; };
const pts = [['Royal Capital', 0, 0], ['Kikka', 2, 12], ['Nean', -8, 26], ['Hecairo', 6, 28], ['Hage', -2, 52], ['Rayaka', 20, 50], ['Saussy', -32, 44], ['Raquey', 14, -8], ['Kiten', 58, 18], ['First Dungeon', 62, 8], ["Witches' Forest", 74, 116], ['GMZ border', -118, 152], ['Diamond cap', 160, 40], ['Heart cap', -185, 30], ['Spade cap', 0, 252], ['between Spade & Heart', -200, 175], ['between Spade & Diamond', 205, 170], ['north of Hage', 0, 118]];
for (const [n, x, y] of pts) console.log(n.padEnd(24), 'owner', own(x, y).padEnd(8), 'realm', C.realmOfPoint(x, y).padEnd(9), 'land', C.isLand(x, y), 'band', C.barrierStrength(x, y).toFixed(2));
const cells = C.baseWorld().cells; const cnt = { Clover: 0, Diamond: 0, Heart: 0, Spade: 0, neutral: 0 };
cells.forEach(c => { if (c.water) return; const o = P.owner[c.i]; cnt[o < 0 ? 'neutral' : names[o]]++; });
console.log('land cells by owner', JSON.stringify(cnt));
// does any Heart/Diamond/Clover cell touch a Spade cell directly? (the band must separate them)
let touch = {}; cells.forEach(c => { if (c.water) return; const o = P.owner[c.i]; if (o !== 3) return; c.n.forEach(nb => { const q = P.owner[nb]; if (q >= 0 && q !== 3 && !cells[nb].water) touch[names[q]] = (touch[names[q]] || 0) + 1; }); });
console.log('Spade cells touching other kingdoms directly:', JSON.stringify(touch));
