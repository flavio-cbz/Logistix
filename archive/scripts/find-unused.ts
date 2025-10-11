#!/usr/bin/env tsx
import { spawn } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Script to identify and report unused files in the Logistix project
 * This creates the missing script referenced in package.json
 */

const PROJECT_ROOT = resolve(__dirname, '..');

function runKnip(): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('Running Knip to identify unused files...');
    
    const knipProcess = spawn('npx', ['knip', '--no-progress', '--include', 'files,dependencies,unlisted,unresolved,exports'], {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let output = '';
    let error = '';

    knipProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    knipProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    knipProcess.on('close', (code) => {
      if (code === 0 || code === 1) { // Knip returns 1 when issues are found, which is expected
        resolve(output);
      } else {
        reject(new Error(`Knip process exited with code ${code}: ${error}`));
      }
    });

    knipProcess.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  try {
    const results = await runKnip();
    
    // Write the results to a report file
    const reportPath = resolve(PROJECT_ROOT, 'unused-files-report.txt');
    writeFileSync(reportPath, results);
    
    console.log('Unused files report generated at:', reportPath);
    console.log('Analysis complete! Review the report before removing any files.');
    
    // Also provide a summary
    const lines = results.split('\n');
    const unusedFilesSection = lines.slice(
      lines.findIndex(line => line.startsWith('Unused files')),
      lines.findIndex(line => line.startsWith('Unused dependencies')) || lines.length
    );
    
    const unusedFiles = unusedFilesSection
      .filter(line => line.trim() !== '' && !line.includes('Unused files'))
      .filter(line => !line.includes('(')); // exclude the header line
    
    console.log(`\nSummary: Found ${unusedFiles.length} unused files`);
    console.log('First 10 unused files:');
    unusedFiles.slice(0, 10).forEach(file => console.log(`  - ${file.trim()}`));
    if (unusedFiles.length > 10) {
      console.log(`  ... and ${unusedFiles.length - 10} more`);
    }
  } catch (error) {
    console.error('Error running unused file analysis:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default main;