const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const CORE_JS = [
  'app-runtime.js','avatar-system.js','coach-cycle.js','coach-engine.js',
  'coach-settings.js','coach-training-ui.js','coach-training.js','coach-workflow.js',
  'core-data.js','firebase-sync.js','food-search.js','legacy-runtime.js',
  'nutrition-local.js','nutrition-reliability.js','platform.js','pwa.js',
  'system-ui.js','training.js'
];

function stripCssNoise(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, m => ' '.repeat(m.length))
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, m => ' '.repeat(m.length));
}

test('core JavaScript parses', () => {
  for (const file of CORE_JS) {
    assert.doesNotThrow(() => new Function(read(file)), file);
  }
});

test('app.css has balanced braces and no orphan animation tails', () => {
  const css = read('app.css');
  const stripped = stripCssNoise(css);
  let depth = 0;
  let minDepth = 0;
  for (const ch of stripped) {
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      minDepth = Math.min(minDepth, depth);
    }
  }
  assert.equal(depth, 0, 'unbalanced CSS braces');
  assert.equal(minDepth, 0, 'stray closing CSS brace');
  assert.doesNotMatch(css, /^\s*to\s*\{[^}]*\}\s*\}\s*$/m, 'orphan keyframe tail');
});

test('index has unique ids and all local refs exist', () => {
  const html = read('index.html');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate HTML id');
  const refs = [...html.matchAll(/(?:src|href)="\.\/([^"?#]+)(?:\?[^"]*)?"/g)].map(m => m[1]);
  for (const ref of refs) {
    assert.ok(fs.existsSync(path.join(ROOT, ref)), `missing local asset: ${ref}`);
  }
});

test('release version is synchronized', () => {
  const html = read('index.html');
  const m = html.match(/<meta content="(11\.\d+\.\d+)" name="achilles-build"\/>/);
  assert.ok(m, 'missing achilles-build meta');
  const version = m[1];
  assert.match(read('pwa.js'), new RegExp(version.replaceAll('.', '\\.')));
  assert.match(read('manifest.webmanifest'), new RegExp(version.replaceAll('.', '\\.')));
  assert.match(read('avatar-system.js'), new RegExp(version.replaceAll('.', '\\.')));
  const swVersion = version.replaceAll('.', '-');
  assert.match(read('sw.js'), new RegExp('achilles-os-v' + swVersion));
});

test('ring direction arrows are black', () => {
  assert.match(read('app.css'), /\.ring-direction path\{stroke:none;fill:#000!important\}/);
});

test('legacy food search tolerates removed loading spinner', () => {
  const js = read('firebase-sync.js');
  assert.doesNotMatch(js, /document\.getElementById\('loading-spinner'\)\.style/);
  assert.doesNotMatch(js, /(?<!if \(spinner\) )spinner\.style\.display/);
});
