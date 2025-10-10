#!/usr/bin/env ts-node
/*
 * Environment Doctor Script
 * Diagnoses Node version, ABI, native modules (better-sqlite3) build alignment.
 */
import fs from 'fs';
import path from 'path';

interface CheckResult {
  name: string;
  status: 'ok' | 'warn' | 'error';
  details?: string;
  suggestion?: string;
}

function logHeader(title: string) {
  console.log(`\n=== ${title} ===`)
}

function resolveModule(m: string) {
  try {
    return require.resolve(m)
  } catch {
    return undefined
  }
}

function formatResult(r: CheckResult) {
  const symbol = r.status === 'ok' ? '✅' : r.status === 'warn' ? '⚠️ ' : '❌';
  console.log(`${symbol} ${r.name}: ${r.details || ''}`)
  if (r.suggestion) console.log(`   → Suggestion: ${r.suggestion}`)
}

async function main() {
  logHeader('Node Runtime');
  console.log('Node version:', process.version)
  console.log('Platform:', process.platform, process.arch)
  console.log('ABI (modules):', (process as any).versions?.modules)

  logHeader('better-sqlite3');
  const modPath = resolveModule('better-sqlite3');
  if (!modPath) {
    formatResult({ name: 'Module presence', status: 'error', details: 'better-sqlite3 not found', suggestion: 'Run npm ci' });
  } else {
    console.log('Entry module path:', modPath)
    const baseDir = path.resolve(path.dirname(modPath), '..');
    const candidate = path.join(baseDir, 'build', 'Release', 'better_sqlite3.node');
    if (fs.existsSync(candidate)) {
      const stat = fs.statSync(candidate);
      formatResult({
        name: 'Native binary',
        status: 'ok',
        details: `${candidate} (mtime: ${stat.mtime.toISOString()})`,
      });
    } else {
      formatResult({ name: 'Native binary', status: 'error', details: 'Binary not found at expected path', suggestion: 'npm run rebuild:native' });
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const lib = require('better-sqlite3');
      const version = lib?.version || lib?.prototype?.version;
      formatResult({ name: 'Require test', status: 'ok', details: `Loaded successfully (version: ${version || 'unknown'})` });
    } catch (e: unknown) {
    const error = e as Error;
      formatResult({ name: 'Require test', status: 'error', details: error?.message || 'Unknown error', suggestion: 'Ensure Node version matches build; run npm run rebuild:native' });
    }
  }

  logHeader('Suggested Next Steps');
  console.log('- If ABI mismatch: rm -rf node_modules package-lock.json && npm ci && npm run rebuild:native');
  console.log('- Ensure .nvmrc matches intended team Node version (now targeting Node 22).');
  console.log('- After switching Node: nvm use && npm run rebuild:native');
}

main().catch(err => {
  console.error('Doctor script failed:', err);
  process.exit(1);
});
