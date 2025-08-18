const fs = require('fs').promises;
const path = require('path');

function allowed(p) {
  return /\.(ts|tsx|js|py|md|json)$/i.test(p)
}

async function fileExists(p) {
  try { await fs.access(p); return true } catch { return false }
}

(async function main() {
  try {
    const cwd = process.cwd();
    const invPath = path.join(cwd, 'file_inventory.json');
    if (!await fileExists(invPath)) {
      console.error('file_inventory.json missing');
      process.exit(1);
    }
    const invRaw = await fs.readFile(invPath, 'utf8');
    const inv = JSON.parse(invRaw);
    if (!Array.isArray(inv.files)) {
      console.error('Invalid inventory structure');
      process.exit(1);
    }

    const reportsDir = path.join(cwd, 'analysis_reports');
    await fs.mkdir(reportsDir, { recursive: true });
    const reportPath = path.join(reportsDir, 'reports_auto.md');
    await fs.writeFile(reportPath, `# Rapports automatiques\n\n`, { flag: 'a' });

    let batch = 0;
    while (true) {
      const next = inv.files.filter(e => e && e.path && e.status !== 'analysé' && allowed(e.path)).slice(0, 5);
      if (next.length === 0) break;
      batch++;
      let batchReport = `## Batch ${batch}\n\n`;
      for (const entry of next) {
        const rel = entry.path;
        const abs = path.join(cwd, rel);
        let content = '';
        let exists = await fileExists(abs);
        if (!exists) {
          batchReport += `- [\`${rel}\`](${rel}:1) — MISSING\n`;
          entry.status = 'analysé';
          continue;
        }
        content = await fs.readFile(abs, 'utf8');
        const lines = content.split(/\r?\n/).length;
        const flags = [];
        if (/(TODO|FIXME)/.test(content)) flags.push('TODO');
        if (/console\.log/.test(content)) flags.push('console.log');
        if (/\bz\.ZodError\b|\bzod\b|\bz\./i.test(content)) flags.push('Zod');
        if (/getSessionUser|getSession|createSession/.test(content)) flags.push('session');
        if (/DELETE\s+FROM/i.test(content)) flags.push('DELETE');
        const flagStr = flags.length ? ` — ${flags.join(', ')}` : '';
        batchReport += `- [\`${rel}\`](${rel}:1) — lignes: ${lines}${flagStr}\n`;
        entry.status = 'analysé';
      }
      batchReport += '\n';
      await fs.appendFile(reportPath, batchReport);
      await fs.writeFile(invPath, JSON.stringify(inv, null, 2) + '\n');
    }

    await fs.appendFile(reportPath, `\n# Fin — batches traités: ${batch}\n`);
    process.exit(0);

  } catch (err) {
    console.error(err);
    process.exit(2);
  }
})();