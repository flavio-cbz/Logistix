
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const dependencies = new Set([
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
]);

// Add built-in modules to ignore
const builtins = new Set([
    'fs', 'path', 'os', 'util', 'events', 'http', 'https', 'url', 'crypto', 'stream', 'buffer', 'zlib', 'child_process', 'process', 'net', 'tls', 'dgram', 'dns', 'querystring', 'assert', 'v8', 'vm', 'module', 'worker_threads', 'cluster', 'tty', 'readline', 'repl', 'console', 'perf_hooks', 'async_hooks', 'inspector', 'trace_events', 'wasi', 'diagnostics_channel', 'punycode', 'string_decoder', 'constants', 'timers'
]);

// Add project specific aliases if any (e.g. @/...)
// We will ignore imports starting with . or / or @/
const isLocalImport = (imp: string) => imp.startsWith('.') || imp.startsWith('/') || imp.startsWith('@/');

async function checkImports() {
    const files = await glob('**/*.{ts,tsx,js,jsx}', {
        ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**', 'coverage/**'],
        cwd: process.cwd(),
    });

    const missingImports = new Map<string, Set<string>>();

    const importRegex = /from\s+['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g;

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const imp = match[1] || match[2];
            if (!imp) continue;

            if (isLocalImport(imp)) continue;
            if (builtins.has(imp)) continue;
            if (imp.startsWith('node:')) continue;

            // Handle scoped packages and subpaths (e.g. @radix-ui/react-checkbox or lodash/merge)
            let pkgName = imp;
            if (imp.startsWith('@')) {
                const parts = imp.split('/');
                if (parts.length >= 2) {
                    pkgName = `${parts[0]}/${parts[1]}`;
                }
            } else {
                const parts = imp.split('/');
                if (parts.length >= 1) {
                    pkgName = parts[0];
                }
            }

            if (!dependencies.has(pkgName)) {
                if (!missingImports.has(pkgName)) {
                    missingImports.set(pkgName, new Set());
                }
                missingImports.get(pkgName)!.add(file);
            }
        }
    }

    if (missingImports.size > 0) {
        console.log('Missing dependencies found:');
        for (const [pkg, files] of missingImports) {
            console.log(`- ${pkg} (used in ${files.size} files)`);
            // Limit file listing
            const fileList = Array.from(files).slice(0, 3);
            fileList.forEach(f => console.log(`  - ${f}`));
            if (files.size > 3) console.log(`  - ... and ${files.size - 3} more`);
        }
        process.exit(1);
    } else {
        console.log('All imports are satisfied in package.json');
    }
}

checkImports().catch(console.error);
