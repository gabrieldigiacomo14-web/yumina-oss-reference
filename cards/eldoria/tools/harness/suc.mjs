import { createRequire } from 'module';
import fs from 'fs';
const { transform } = createRequire(import.meta.url)('sucrase');
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let bad = 0;
for (const [n, c] of Object.entries(d.rootComponent.files)) {
  try { const r = transform(c, { transforms: ['typescript', 'jsx', 'imports'], jsxRuntime: 'classic', production: true, filePath: n }); console.log('ok', n, r.code.length); }
  catch (e) { bad++; console.log('FAIL', n, String(e).slice(0, 300)); }
}
process.exit(bad ? 1 : 0);
