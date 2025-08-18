#!/usr/bin/env node
const fs = require('fs');
const p = 'file_inventory.json';
if (!fs.existsSync(p)) { console.error('MISSING'); process.exit(2); }
let raw;
try {
  raw = fs.readFileSync(p, 'utf8');
} catch (e) {
  console.error('READ_ERROR', e.message);
  process.exit(3);
}
let j;
try {
  j = JSON.parse(raw);
} catch (e) {
  console.error('PARSE_ERROR', e.message);
  process.exit(4);
}
if (!j || !Array.isArray(j.files)) { console.error('INVALID_STRUCTURE'); process.exit(5); }
const paths = new Set([
  'app/api/v1/ai/inference/route.ts',
  'app/api/v1/ai/metrics/route.ts',
  'app/api/v1/database/health-check/route.ts',
  'lib/services/auth/compat.ts',
  'app/api/v1/search/global/route.ts'
]);
let changed = false;
for (const entry of j.files) {
  if (entry && typeof entry.path === 'string' && paths.has(entry.path)) {
    if (entry.status !== 'analysé') { entry.status = 'analysé'; changed = true; }
  }
}
if (changed) {
  try {
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n', 'utf8');
  } catch (e) {
    console.error('WRITE_ERROR', e.message);
    process.exit(6);
  }
} else {
}