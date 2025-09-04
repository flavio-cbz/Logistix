#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

const CATEGORIES: Record<string, string> = {
  admin: 'Administration & secrets',
  analysis: 'Analyses & diagnostics',
  codemods: 'Codemods & migrations',
  cron: 'Tâches planifiées',
  development: 'Développement & intégrations',
  maintenance: 'Maintenance & DB',
  production: 'Production & déploiement',
  testing: 'Tests & validations',
};

function listDir(dir: string) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [] as string[];
  return fs.readdirSync(abs).map(f => path.join(dir, f));
}

function main() {
  const rootFiles = fs.readdirSync(path.join(ROOT, 'scripts'))
    .filter(f => !fs.statSync(path.join(ROOT, 'scripts', f)).isDirectory())
    .map(f => path.join('scripts', f));

  console.log('Scripts à la racine:');
  rootFiles.forEach(f => console.log(' -', f));

  for (const [dir, label] of Object.entries(CATEGORIES)) {
    const files = listDir(path.join('scripts', dir))
      .filter(f => fs.statSync(path.join(ROOT, f)).isFile());
    if (files.length === 0) continue;
    console.log(`\n${label} (${dir}/):`);
    files.forEach(f => console.log(' -', f));
  }
}

main();
