// Builds dist/eldoria-3d.json: the original world + the 3D rootComponent, compiled with
// Yumina's own multi-file bundler and validated against the engine's world schema.
//   node worlds/eldoria-3d/tools/build.mjs
import { build } from "../../../node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild/lib/main.js";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url"; import { createRequire } from "module";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const ROOT = path.dirname(HERE); const REPO = path.resolve(ROOT, "../..");
const out = await build({ entryPoints: [path.join(HERE, "build-harness.ts")], bundle: true, write: false, platform: "node", format: "cjs", alias: { "@": path.join(REPO, "packages/app/src") }, nodePaths: [path.join(REPO, "packages/app/node_modules"), path.join(REPO, "packages/engine/node_modules"), path.join(REPO, "node_modules")], logLevel: "error" });
const require = createRequire(path.join(REPO, "packages/app/package.json"));
new Function("require", "module", "exports", out.outputFiles[0].text)(require, { exports: {} }, {});
const B = globalThis.EldoriaBuild;

const world = JSON.parse(fs.readFileSync(path.join(ROOT, "source/eldoria-original.json"), "utf8"));
const files = {}; for (const f of fs.readdirSync(path.join(ROOT, "src")).filter(f => f.endsWith(".tsx")).sort()) files[f] = fs.readFileSync(path.join(ROOT, "src", f), "utf8");
const res = B.bundleTSX({ files, entryFile: "index.tsx" });
if (!res.code) { console.error("BUNDLE FAILED", res.error, res.fileErrors); process.exit(1); }
fs.writeFileSync(path.join(ROOT, "dist/bundle.js"), res.code);

// ---- world edits (additive; nothing in the original lorebook or rules is removed)
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, "lore/3d-client-contract.json"), "utf8"));
world.entries = world.entries.filter(e => e.id !== contract.id);
const at = world.entries.findIndex(e => e.name === "State Integrity & Directives");
world.entries.splice(at + 1, 0, contract);
const newVars = JSON.parse(fs.readFileSync(path.join(ROOT, "lore/3d-variables.json"), "utf8"));
for (const nv of newVars) { world.variables = world.variables.filter(v => v.id !== nv.id); world.variables.push(nv); }
world.name = "Eldoria: From F-Rank to Legend — 3D";
world.version = "22.0.0-3d";
if (!world.description.includes("3D edition")) world.description = "3D edition: walk the whole continent in real time — streaming terrain built from the canonical atlas, every settlement and district, persistent monster populations, real-time 3d6 combat, fog-of-war world map and a rotating minimap — while the AI Game Master narrates everything social. " + world.description;
world.rootComponent = { ...world.rootComponent, name: "Eldoria 3D Interface", entryFile: "index.tsx", files, updatedAt: new Date().toISOString(), compiled: { code: res.code, filesHash: B.hashRootFiles("index.tsx", files), compilerVersion: B.COMPILED_FORMAT_VERSION } };

// Yumina exports carry explicit nulls for unset optional fields (depth, folderId, ...);
// the import path treats them as absent, so validate a copy with top-level-field nulls dropped.
function dropNulls(o, depth) { if (Array.isArray(o)) return o.map(x => dropNulls(x, depth + 1)); if (o && typeof o === "object") { const r = {}; for (const k in o) { if (o[k] === null && depth < 4) continue; r[k] = k === "defaultValue" || k === "value" ? o[k] : dropNulls(o[k], depth + 1); } return r; } return o; }
const parsed = B.worldDefinitionSchema.safeParse(dropNulls(world, 0));
// The original export already carries legacy values the import path migrates (e.g. "AND"
// keyword logic). Fail only on schema issues this build introduces.
const original = JSON.parse(fs.readFileSync(path.join(ROOT, "source/eldoria-original.json"), "utf8"));
const base = B.worldDefinitionSchema.safeParse(dropNulls(original, 0));
const sig = i => i.code + ":" + i.path.map(p => typeof p === "number" ? "#" : p).join(".") + ":" + (i.received || "");
const known = new Set(base.success ? [] : base.error.issues.map(sig));
const fresh = parsed.success ? [] : parsed.error.issues.filter(i => !known.has(sig(i)));
if (fresh.length) { console.error("SCHEMA FAILED (new issues)"); console.error(JSON.stringify(fresh.slice(0, 12), null, 1)); process.exit(1); }
console.log("schema: no new issues (" + (parsed.success ? 0 : parsed.error.issues.length) + " pre-existing legacy issues carried from the original export)");
const warnings = B.validateWorld(world);
const outFile = path.join(ROOT, "dist/eldoria-3d.json");
fs.writeFileSync(outFile, JSON.stringify(world));
const kb = n => (n / 1024).toFixed(0) + " KB";
console.log("bundle", kb(res.code.length), "| source", kb(Object.values(files).join("").length), "| world", kb(fs.statSync(outFile).size));
console.log("validator warnings:", warnings.length); for (const w of warnings.slice(0, 15)) console.log(" -", w.type || w.code || "", w.message || JSON.stringify(w));
