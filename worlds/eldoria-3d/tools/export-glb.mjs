// Exports the procedural characters to GLB files (rigged, skinned, animated) with the game's own bone and clip names.
//   node tools/export-glb.mjs <outDir> <dir containing node_modules/three and node_modules/playwright-core>
// The result is a working template for artists: replace the meshes and keep the bone names, clip names and sockets.
import fs from "fs"; import os from "os"; import path from "path"; import http from "http"; import { fileURLToPath } from "url"; import { createRequire } from "module";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const [outDir, base] = process.argv.slice(2); if (!outDir || !base) { console.error("usage: node tools/export-glb.mjs <outDir> <nodeModulesParent>"); process.exit(2); }
const req = createRequire(path.join(path.resolve(base), "x.js")); const pw = await import(req.resolve("playwright-core")); const chromium = pw.chromium || pw.default.chromium; const esbuild = await import("../../../node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild/lib/main.js");
fs.mkdirSync(outDir, { recursive: true }); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "eldoria-glb-"));
await esbuild.build({ entryPoints: [path.join(HERE, "glb-export-entry.tsx")], bundle: true, outfile: path.join(tmp, "export.js"), format: "iife", loader: { ".tsx": "tsx" }, nodePaths: [path.join(path.resolve(base), "node_modules")], logLevel: "error" });
fs.writeFileSync(path.join(tmp, "index.html"), '<!doctype html><meta charset="utf-8"><body><script src="export.js"></script>');
const server = http.createServer((q, r) => { const f = path.join(tmp, q.url === "/" ? "index.html" : q.url.split("?")[0]); if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : "text/html" }); fs.createReadStream(f).pipe(r); }).listen(0);
const browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage(); page.on("pageerror", (e) => console.error("pageerror", e.message)); await page.goto("http://localhost:" + server.address().port + "/");
const looks = { "eldoria-humanoid": { calling: "Fighter", species: "Human", gender: "Male", skin: "#c98e64", hair: "#4a2e1d", hairStyle: "Short Crop", face: 2, build: "Athletic", armor: "light", weapon: "none", cape: null, main: "#5a4a3a", trim: "#8a8f96", cloth: "#6a5a40" } };
for (const [name, look] of Object.entries(looks)) { const r = await page.evaluate((l) => window.__exportHumanoid(l, { detail: "lo" }), look); fs.writeFileSync(path.join(outDir, name + ".glb"), Buffer.from(r.b64, "base64")); console.log("wrote", name + ".glb", (r.bytes / 1024).toFixed(0) + " KB", r.clips.length + " clips"); }
await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
