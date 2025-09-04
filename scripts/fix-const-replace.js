const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const exts = ['.ts', '.tsx', '.js', '.jsx'];
const pattern = /\(const as any\)\s*\[/g;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git', '.next', 'dist', 'out'].includes(e.name)) continue;
      walk(full);
    } else if (e.isFile()) {
      if (!exts.includes(path.extname(e.name))) continue;
      try {
        let txt = fs.readFileSync(full, 'utf8');
        const newTxt = txt.replace(pattern, 'const [');
        if (newTxt !== txt) {
          fs.writeFileSync(full, newTxt, 'utf8');
          console.log('Updated:', path.relative(ROOT, full));
        }
      } catch (err) {
        console.error('ERR', full, err.message);
      }
    }
  }
}

walk(ROOT);
console.log('Done');