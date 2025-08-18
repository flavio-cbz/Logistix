const fs = require('fs').promises;
const path = require('path');

const CWD = process.cwd();
const INVENTORY = path.join(CWD,'file_inventory.json');
const REPORTS_DIR = path.join(CWD,'analysis_reports');
const REPORT_PATH = path.join(REPORTS_DIR,'reports_auto_deep.md');

const ALLOWED = /\.(ts|tsx|js|py|md|json|sql|png|ico|db|yaml|yml)$/i;
const BINARY_EXT = /\.(png|ico|db)$/i;

async function walk(dir, collected=[]) {
  const entries = await fs.readdir(dir,{withFileTypes:true});
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === '.next' || e.name === 'dist' ) continue;
    const full = path.join(dir,e.name);
    if (e.isDirectory()) {
      await walk(full,collected);
    } else if (e.isFile()) {
      collected.push(full);
    }
  }
  return collected;
}

async function fileExists(p){ try{ await fs.access(p); return true }catch{return false} }

function toRel(p){ return p.split(path.sep).join('/').replace(`${CWD.replace(/\\/g,'/')}/`,''); }

function detectFlags(content){
  const flags = [];
  if (/(TODO|FIXME)/.test(content)) flags.push('TODO');
  if (/console\.log/.test(content)) flags.push('console.log');
  if (/\bz\.ZodError\b|\bzod\b|\bz\./i.test(content)) flags.push('Zod');
  if (/getSessionUser|getSession|createSession/.test(content)) flags.push('session');
  if (/DELETE\s+FROM/i.test(content)) flags.push('DELETE');
  return flags;
}

(async function main(){
  try{
    const allFiles = await walk(CWD,[]);
    const relFiles = allFiles.map(p=>toRel(p)).filter(p=>ALLOWED.test(p));
    await fs.mkdir(REPORTS_DIR,{recursive:true});
    const hasInv = await fileExists(INVENTORY);
    let inv = {files:[]};
    if (hasInv){
      const raw = await fs.readFile(INVENTORY,'utf8');
      inv = JSON.parse(raw);
      if(!Array.isArray(inv.files)) inv.files = [];
    }

    // Add missing files to inventory
    const existingPaths = new Set(inv.files.map(e=>e.path));
    for (const f of relFiles){
      if (!existingPaths.has(f)){
        inv.files.push({path:f,status:'non-analysé'});
      }
    }

    // Main batch loop
    let batch = 0;
    while(true){
      const next = inv.files.filter(e=>e && e.path && e.status !== 'analysé' && ALLOWED.test(e.path)).slice(0,5);
      if (next.length===0) break;
      batch++;
      let batchReport = `## Deep Batch ${batch}\n\n`;
      for (const entry of next){
        const rel = entry.path;
        const abs = path.join(CWD,rel);
        const exists = await fileExists(abs);
        if(!exists){
          batchReport += `- [\`${rel}\`](${rel}:1) — MISSING\n`;
          entry.status = 'analysé';
          continue;
        }
        if (BINARY_EXT.test(rel)){
          batchReport += `- [\`${rel}\`](${rel}:1) — binary (skipped content)\n`;
          entry.status = 'analysé';
          continue;
        }
        const content = await fs.readFile(abs,'utf8');
        const lines = content.split(/\r?\n/).length;
        const flags = detectFlags(content);
        const flagStr = flags.length ? ` — ${flags.join(', ')}` : '';
        batchReport += `- [\`${rel}\`](${rel}:1) — lignes: ${lines}${flagStr}\n`;
        entry.status = 'analysé';
      }
      batchReport += '\n';
      await fs.appendFile(REPORT_PATH, batchReport);
      await fs.writeFile(INVENTORY, JSON.stringify(inv,null,2)+'\n');
    }

    await fs.appendFile(REPORT_PATH, `\n# Fin — deep batches traités: ${batch}\n`);
    process.exit(0);
  }catch(err){
    console.error('ERROR',err);
    process.exit(2);
  }
})();