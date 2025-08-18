#!/usr/bin/env node
/**
 * scripts/remove-debug-logs.js
 *
 * Parcourt le projet et supprime les lignes de debug logs :
 * - console.log(...)
 * - console.debug(...)
 * - console.dir(...)
 * - <anything>logger.debug(...)
 * - debugLogger.<method>(...)
 *
 * Sauf si la ligne contient l'annotation exacte : // PRODUCTION_LOG
 *
 * Usage:
 *   node scripts/remove-debug-logs.js
 *
 * IMPORTANT: ce script évite node_modules, .git, public, dist, build, logs
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(['node_modules', '.git', 'public', 'dist', 'build', 'logs']);
const EXT_WHITELIST = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']);

const LOG_PATTERNS = [
  new RegExp('\\bconsole\\.(?:log|debug|dir)\\s*\\('),                 // console.log/debug/dir(
  new RegExp('\\b[A-Za-z0-9_]*logger\\.debug\\s*\\('),              // somethinglogger.debug(
  new RegExp('\\bdebugLogger\\.[A-Za-z0-9_]+\\s*\\(')               // debugLogger.someMethod(
];

const PRODUCTION_ANNOTATION = '// PRODUCTION_LOG';

const modifiedFiles = [];
const examples = [];
const errors = [];

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_WHITELIST.has(ext);
}

function walk(dir, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name.startsWith('.')) {
      // allow dotfiles except .git
      if (ent.name === '.git') continue;
    }
    if (ent.isDirectory()) {
      if (IGNORE_DIRS.has(ent.name)) continue;
      walk(path.join(dir, ent.name), callback);
    } else if (ent.isFile()) {
      callback(path.join(dir, ent.name));
    }
  }
}

function matchesLogPattern(line) {
  return LOG_PATTERNS.some(re => re.test(line));
}

function processFile(filePath) {
  try {
    if (!shouldProcessFile(filePath)) return;
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/);
    let changed = false;
    const out = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      if (matchesLogPattern(line) && !line.includes(PRODUCTION_ANNOTATION)) {
        // Start removal. Attempt to handle multiline calls by tracking parens balance.
        let parenBalance = 0;
        // Count parentheses on this line
        for (const ch of line) {
          if (ch === '(') parenBalance++;
          if (ch === ')') parenBalance--;
        }
        // If parenBalance <= 0 and line likely ends with ; or ), just remove this line.
        // Otherwise, consume subsequent lines until balance <= 0 or safety limit reached.
        const removedLines = [line];
        let j = i + 1;
        const SAFETY_MAX_LINES = 500; // avoid runaway
        let safety = 0;
        while ((parenBalance > 0 || (line.trim().endsWith('(') && parenBalance === 0)) && j < lines.length && safety < SAFETY_MAX_LINES) {
          const next = lines[j];
          removedLines.push(next);
          for (const ch of next) {
            if (ch === '(') parenBalance++;
            if (ch === ')') parenBalance--;
          }
          j++;
          safety++;
          // also stop if we find a semicolon at end and parenBalance <= 0
          if (parenBalance <= 0) break;
        }
        // Record example (first up to 200 chars)
        examples.push({
          file: filePath,
          snippet: removedLines.join('\n').slice(0, 200).replace(/\n/g, '\\n')
        });
        changed = true;
        i = j; // skip removed lines
        continue;
      } else {
        out.push(line);
        i++;
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, out.join('\n'), 'utf8');
      modifiedFiles.push(filePath);
    }
  } catch (err) {
    errors.push({ file: filePath, error: String(err) });
  }
}

function main() {
  console.log('Running remove-debug-logs script from', ROOT);
  walk(ROOT, (filePath) => processFile(filePath));

  console.log('--- Summary ---');
  console.log('Files modified:', modifiedFiles.length);
  if (modifiedFiles.length > 0) {
    console.log('Example modified files (first 10):');
    modifiedFiles.slice(0, 10).forEach(f => console.log(' -', f));
  }
  console.log('Example removed snippets (first 10):');
  examples.slice(0, 10).forEach(e => {
    console.log(` - ${e.file}: "${e.snippet}"`);
  });
  if (errors.length > 0) {
    console.log('Errors encountered:', errors.length);
    errors.forEach(e => console.error('ERR', e.file, e.error));
  } else {
    console.log('No file-level errors encountered.');
  }

  // Also write a JSON report to workspace root
  const report = {
    timestamp: new Date().toISOString(),
    modifiedFiles,
    examples,
    errors
  };
  try {
    fs.writeFileSync(path.join(ROOT, 'remove-debug-logs-report.json'), JSON.stringify(report, null, 2), 'utf8');
    console.log('Report written to remove-debug-logs-report.json');
  } catch (e) {
    console.error('Failed to write JSON report:', e);
  }
}

if (require.main === module) {
  main();
}