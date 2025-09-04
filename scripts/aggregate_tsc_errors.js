const { spawnSync } = require('child_process');

const res = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], { encoding: 'utf8' });
const out = (res.stdout || '') + (res.stderr || '');

const matches = out.match(/error TS[0-9]+/g) || [];
const counts = {};
matches.forEach(m => { counts[m] = (counts[m] || 0) + 1; });

const arr = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20);

if (arr.length === 0) {
  console.log('No TypeScript errors found or tsc output could not be parsed.');
} else {
  arr.forEach(([code, count]) => {
    console.log(`${count} ${code}`);
  });
}

// Print a small summary header to help correlate with full tsc exit
console.log('');
console.log('--- Full tsc exit code: ' + (res.status !== null ? res.status : 'unknown') + ' ---');

process.exit(res.status || 0);