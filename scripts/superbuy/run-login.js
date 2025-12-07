#!/usr/bin/env node
/*
 Wrapper to run the TypeScript headful superbuy login script in a cross-platform way.
 Usage:
  - Positional args: node scripts/superbuy/run-login.js <username> <password>
  - Env: set SUPERBUY_USERNAME and SUPERBUY_PASSWORD then run
  - --print: prints usage and envs
 This script spawns npx tsx scripts/superbuy-headful-login.ts and forwards envs/args.
*/
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function printUsage() {
  console.log('Usage: node scripts/superbuy/run-login.js <username> <password>');
  console.log('Or set SUPERBUY_USERNAME and SUPERBUY_PASSWORD environment variables and run:');
  console.log('  SUPERBUY_USERNAME=you@example.com SUPERBUY_PASSWORD=secret npm run superbuy:login:env');
  console.log('Options:');
  console.log('  --print   Print this help');
}

try {
  const argv = process.argv.slice(2);
  if (argv.includes('--print') || argv.includes('-h') || argv.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  // If positional args were supplied, use them as username/password
  if (argv.length >= 2) {
    // We clone env because we don't want to mutate parent's env
    process.env.SUPERBUY_USERNAME = argv[0];
    process.env.SUPERBUY_PASSWORD = argv[1];
  }

  // Build the command to run the TypeScript script via tsx
  // __dirname is scripts/superbuy -> projectRoot is repo root
  const projectRoot = path.resolve(__dirname, '..', '..');
  const scriptPath = path.resolve(projectRoot, 'scripts', 'superbuy-headful-login.ts');

  if (!fs.existsSync(scriptPath)) {
    console.error('[run-login] Error: target script not found:', scriptPath);
    process.exit(2);
  }

  // Use npx tsx to execute the TS script. We add tsconfig-paths/register so path aliases work like in the rest of the repo.
  const cmd = 'npx';
  const args = ['tsx', '-r', 'tsconfig-paths/register', scriptPath];

  // Add any remaining args after username/password (for example --print in package.json)
  // If argv started with username/password then shift those out
  const spawnArgs = argv.length >= 2 ? argv.slice(2) : argv;
  for (const a of spawnArgs) args.push(a);

  // Merge env with our overridden values
  const childEnv = Object.assign({}, process.env);

  console.log('[run-login] Spawning:', cmd, args.join(' '));
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: childEnv,
    shell: false,
  });

  process.exit(r.status ?? 1);
} catch (e) {
  console.error('[run-login] Unexpected error', e instanceof Error ? e.message : String(e));
  process.exit(1);
}
