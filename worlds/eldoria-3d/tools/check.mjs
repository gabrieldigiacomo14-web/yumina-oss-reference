// Syntax/bundle check of every source module with esbuild (fast feedback before the Yumina bundler).
import { build } from "../../../node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild/lib/main.js";
import fs from "fs";
const files = fs.readdirSync("src").filter(f => f.endsWith(".tsx"));
let ok = true;
for (const f of files) {
  try { await build({ entryPoints: ["src/" + f], bundle: true, write: false, format: "esm", loader: { ".tsx": "tsx" }, jsx: "transform", jsxFactory: "React.createElement", logLevel: "silent" }); }
  catch (e) { ok = false; console.log("FAIL", f, e.errors.map(x => x.text + " @" + (x.location && x.location.line)).join("\n")); }
}
console.log(ok ? "all modules bundle" : "errors");
// Guard: a `//` comment placed mid-line silently swallows the code after it.
for (const f of files) {
  fs.readFileSync("src/" + f, "utf8").split("\n").forEach((line, i) => {
    const m = line.match(/;\s*\/\/[^"'`\n]*;\s*(var|this|if|return|for)\b/);
    if (m) { ok = false; console.log("SUSPICIOUS mid-line comment", f + ":" + (i + 1)); }
  });
}
if (!ok) process.exit(1);
