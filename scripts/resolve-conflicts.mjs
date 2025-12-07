/**
 * Script to resolve merge conflicts by keeping HEAD (current) content
 * Removes all merge conflict markers and keeps the HEAD section
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.md', '.sql', '.css'];
const IGNORE_DIRS = ['node_modules', '.git', '.next', 'dist', '.turbo'];

let filesFixed = 0;
let totalConflicts = 0;

function resolveConflictsInFile(filePath) {
    try {
        const content = readFileSync(filePath, 'utf-8');

        if (!content.includes('<<<<<<< HEAD')) {
            return false;
        }

        // Regex to match conflict blocks and keep only HEAD content
        const conflictRegex = /<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n[\s\S]*?>>>>>>> [^\r\n]+\r?\n?/g;

        let conflictCount = 0;
        const resolved = content.replace(conflictRegex, (match, headContent) => {
            conflictCount++;
            return headContent;
        });

        if (conflictCount > 0) {
            writeFileSync(filePath, resolved, 'utf-8');
            console.log(`✓ ${filePath} - ${conflictCount} conflict(s) resolved`);
            filesFixed++;
            totalConflicts += conflictCount;
            return true;
        }

        return false;
    } catch (error) {
        console.error(`✗ Error processing ${filePath}: ${error.message}`);
        return false;
    }
}

function walkDirectory(dir) {
    try {
        const entries = readdirSync(dir);

        for (const entry of entries) {
            const fullPath = join(dir, entry);

            try {
                const stat = statSync(fullPath);

                if (stat.isDirectory()) {
                    if (!IGNORE_DIRS.includes(entry)) {
                        walkDirectory(fullPath);
                    }
                } else if (stat.isFile()) {
                    const ext = extname(entry).toLowerCase();
                    if (EXTENSIONS.includes(ext)) {
                        resolveConflictsInFile(fullPath);
                    }
                }
            } catch (e) {
                // Skip files we can't access
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dir}: ${error.message}`);
    }
}

console.log('🔧 Resolving merge conflicts (keeping HEAD)...\n');

const projectRoot = process.cwd();
walkDirectory(projectRoot);

console.log(`\n✅ Done! Fixed ${filesFixed} files with ${totalConflicts} total conflicts.`);
