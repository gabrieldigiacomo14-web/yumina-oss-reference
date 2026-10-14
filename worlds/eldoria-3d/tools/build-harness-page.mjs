// Bundles tools/harness-entry.tsx into <outDir>/harness.js next to an index.html that
// preloads a local three.js (pass its path) and the built world JSON.
import { build } from "../../../node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild/lib/main.js";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const ROOT = path.dirname(HERE); const REPO = path.resolve(ROOT, "../..");
const [outDir, threePath] = process.argv.slice(2);
await build({ entryPoints: [path.join(HERE, "harness-entry.tsx")], bundle: true, outfile: path.join(outDir, "harness.js"), format: "iife", jsx: "automatic", alias: { "@": path.join(REPO, "packages/app/src") }, nodePaths: [path.join(REPO, "packages/app/node_modules")], define: { "process.env.NODE_ENV": '"production"' }, logLevel: "error" });
fs.copyFileSync(threePath, path.join(outDir, "three.min.js"));
fs.copyFileSync(path.join(ROOT, "dist/eldoria-3d.json"), path.join(outDir, "eldoria-3d.json"));
fs.writeFileSync(path.join(outDir, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;height:100%}</style><script src="three.min.js"></script></head><body><div id="root"></div><script>window.__presetVars = JSON.parse(localStorage.getItem("preset") || "null") || {};</script><script src="harness.js"></script></body></html>`);
console.log("harness ready in", outDir);
