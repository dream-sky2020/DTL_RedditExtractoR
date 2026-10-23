// Compile only the pure module in memory; no build output or browser is needed.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/pages/AdPlacementPage/calculations/timeline.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'ad_timeline_cases.json'), 'utf8'));
const results = fixtures.cases.map(({ name, input, expected }) => {
  const actual = context.exports.calculateAdTimeline({ ...fixtures.defaults, ...input });
  for (const [key, value] of Object.entries(expected)) {
    assert.ok(Math.abs(actual[key] - value) < 1e-9, `${name}: ${key}: ${actual[key]} != ${value}`);
  }
  return actual;
});
if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(results));
else console.log(`${results.length} frontend timeline cases passed`);
