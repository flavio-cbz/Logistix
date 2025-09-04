#!/usr/bin/env ts-node
/**
 * Lightweight dependency analyzer wrapper using dependency-cruiser.
 * Outputs a compact summary to stdout.
 */
import { exec } from 'child_process';

function run(cmd: string): Promise<{ ok: boolean; stdout: string; stderr: string }>{
  return new Promise(resolve => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 64, windowsHide: true }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout, stderr });
    });
  });
}

async function main() {
  const include = ['app', 'lib', 'components'].map(p => `"${p}"`).join(' ');
  const excludes = [
    '^.next/', '^coverage/', '^public/', '^logs/', '^backups/', '^drizzle/', '^docs/'
  ].map(rx => `--exclude "${rx}"`).join(' ');
  const cmd = `npx --yes dependency-cruiser ${include} --output-type json ${excludes} --ts-pre-compilation-deps --no-config`;

  const { ok, stdout, stderr } = await run(cmd);
  if (!ok) {
    console.error('dependency-cruiser failed:', stderr || stdout);
    process.exit(1);
  }
  let json: any;
  try {
    json = JSON.parse(stdout);
  } catch (e) {
    console.error('Failed to parse dependency-cruiser output.');
    process.exit(1);
  }

  const modules: any[] = json.modules || [];
  const total = modules.length;
  const withDeps = modules.filter(m => Array.isArray(m.dependencies) && m.dependencies.length > 0).length;
  console.log(JSON.stringify({ modules: total, withDependencies: withDeps }, null, 2));
}

main();
