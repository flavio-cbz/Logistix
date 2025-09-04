// scripts/codemods/fix_ts_errors.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, content) { fs.writeFileSync(file, content, 'utf8'); }

const root = process.cwd();
const patterns = ['**/*.ts', '**/*.tsx'];
const ignore = ['node_modules/**', '.next/**', 'dist/**', 'out/**', 'build/**', 'coverage/**', 'drizzle/migrations/**', 'scripts/tests/**', 'tests/**'];

const replacements = [
  {
    name: 'import-type-from-types',
    regex: /import\s+\{\s*([^}]+?)\s*\}\s+from\s+(['"])(@\/types\/[^'"]+)\2/g,
    repl: (m, p1, p2, p3) => `import type { ${p1} } from '${p3}'`
  },
  {
    name: 'data-index-non-null',
    regex: /\bdata\[[^\]]+\]/g,
    repl: (m) => m.endsWith('!') ? m : `${m}!`
  },
  {
    name: 'bracket-prop-non-null',
    // add non-null assertion before property access: obj[index]!.prop
    regex: /([A-Za-z0-9_]+\[[^\]]+\])\.(\s*)([A-Za-z0-9_]+)/g,
    repl: (m, p1, p2, p3) => p1.endsWith('!') ? `${p1}.${p3}` : `${p1}!.${p3}`
  },
  {
    name: 'className-default',
    regex: /className=\{([A-Za-z0-9_]+)\}/g,
    repl: (m, p1) => `className={${p1} ?? ''}`
  },
  {
    name: 'onProp-non-null',
    regex: /(\s)(on[A-Z][A-Za-z0-9_]+)=\{([A-Za-z0-9_]+)\}/g,
    repl: (m, p1, p2, p3) => `${p1}${p2}={${p3}!}`
  }
];

let filesChanged = 0;
const files = patterns.flatMap(p => glob.sync(p, { ignore }));
files.forEach(file => {
  const full = path.join(root, file);
  let src = read(full);
  const orig = src;
  replacements.forEach(r => {
    src = src.replace(r.regex, r.repl);
  });
  if (src !== orig) {
    write(full, src);
    console.log('Modified', file);
    filesChanged++;
  }
});
console.log('Done. Files modified:', filesChanged);