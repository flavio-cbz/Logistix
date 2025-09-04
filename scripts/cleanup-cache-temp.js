#!/usr/bin/env node
/*
  Simple cache/temp cleanup utility.
  Usage:
    node scripts/cleanup-cache-temp.js [clean] [--dry-run]
*/
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const repoRoot = path.resolve(__dirname, '..');

/** Remove a file or directory recursively, safely. */
function rmrf(targetPath) {
  const full = path.resolve(repoRoot, targetPath);
  if (!fs.existsSync(full)) return;
  if (DRY_RUN) {
    console.log(`[dry-run] would remove: ${path.relative(repoRoot, full)}`);
    return;
  }
  try {
    fs.rmSync(full, { recursive: true, force: true, maxRetries: 3 });
    console.log(`removed: ${path.relative(repoRoot, full)}`);
  } catch (err) {
    console.error(`failed to remove ${full}:`, err && err.message ? err.message : err);
  }
}

function ensureDir(p) {
  const full = path.resolve(repoRoot, p);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
}

function main() {
  const tasks = [
    '.next',
    '.turbo',
    'coverage',
    'dist',
    'build',
    'tmp',
    'temp',
    'logs/tmp',
    'node_modules/.cache',
  ];

  console.log(`Cleaning caches/temp (dry-run=${DRY_RUN})...`);
  tasks.forEach(rmrf);

  // Recreate minimal folders that are expected to exist
  ensureDir('logs');
  console.log('Done.');
}

if (require.main === module) {
  main();
}
