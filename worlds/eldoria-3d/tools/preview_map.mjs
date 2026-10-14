// Renders the generated continent (with atlas markers) to a PPM for visual checks.
import { build } from "../../../node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild/lib/main.js";
import fs from "fs";
const out = process.argv[2] || "map.ppm"; const mpp = Number(process.argv[3] || 4);
const r = await build({ stdin: { contents: `import * as W from "./src/worldgen.tsx"; globalThis.W = W;`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "iife", loader: { ".tsx": "tsx" } });
eval(r.outputFiles[0].text);
const W = globalThis.W; const w = Math.round(2500 / mpp), h = Math.round(1800 / mpp);
const buf = Buffer.alloc(w * h * 3); const col = [0, 0, 0]; const t0 = Date.now();
for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) { W.mapColor(-1250 + px * mpp, 900 - py * mpp, col, "satellite"); const i = (py * w + px) * 3; buf[i] = col[0]; buf[i + 1] = col[1]; buf[i + 2] = col[2]; }
const ms = Date.now() - t0;
for (const road of W.ROADS) for (const [x, y] of road.pts) { const px = Math.round((x + 1250) / mpp), py = Math.round((900 - y) / mpp); const i = (py * w + px) * 3; if (i >= 0 && i < buf.length) { buf[i] = 230; buf[i + 1] = 200; buf[i + 2] = 120; } }
for (const p of W.PLACES) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const px = Math.round((p.x + 1250) / mpp) + dx, py = Math.round((900 - p.y) / mpp) + dy; const i = (py * w + px) * 3; buf[i] = 255; buf[i + 1] = 40; buf[i + 2] = 40; }
const water = W.PLACES.filter(p => W.isWater(p.x, p.y)).map(p => p.id);
fs.writeFileSync(out, Buffer.concat([Buffer.from(`P6 ${w} ${h} 255\n`), buf]));
console.log("ms", ms, "per-sample us", (ms * 1000 / (w * h)).toFixed(1), "places in water:", water, "roads", W.ROADS.length);
