import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const dependencies = new Map<string, string>();
const devDependencies = new Map<string, string>();

// Store all dependencies with versions
Object.entries(packageJson.dependencies || {}).forEach(([name, version]) => {
    dependencies.set(name, version as string);
});

Object.entries(packageJson.devDependencies || {}).forEach(([name, version]) => {
    devDependencies.set(name, version as string);
});

const allDeps = new Set([...dependencies.keys(), ...devDependencies.keys()]);

// Extended list of Node.js built-in modules
const builtins = new Set([
    'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
    'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
    'events', 'fs', 'http', 'http2', 'https', 'inspector', 'module', 'net',
    'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring', 'readline',
    'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'trace_events',
    'tty', 'url', 'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib',
    // Also include fs/promises and other subpath variants
    'fs/promises', 'timers/promises', 'stream/promises', 'dns/promises'
]);

const isLocalImport = (imp: string) =>
    imp.startsWith('.') || imp.startsWith('/') || imp.startsWith('@/');

const isBuiltIn = (imp: string) => {
    if (imp.startsWith('node:')) return true;
    const baseName = imp.split('/')[0];
    return builtins.has(imp) || builtins.has(baseName);
};

interface AnalysisResult {
    missingDeps: Map<string, Set<string>>;
    usedDeps: Set<string>;
    unusedDeps: Set<string>;
    importsByFile: Map<string, Set<string>>;
}

async function analyzeImports(): Promise<AnalysisResult> {
    const files = await glob('**/*.{ts,tsx,js,jsx,mjs,cjs}', {
        ignore: [
            'node_modules/**',
            '.next/**',
            'dist/**',
            'build/**',
            'coverage/**',
            '**/*.d.ts',
            'scripts/analyze-deps.ts',
            'scripts/check-imports.ts'
        ],
        cwd: process.cwd(),
    });

    const missingDeps = new Map<string, Set<string>>();
    const usedDeps = new Set<string>();
    const importsByFile = new Map<string, Set<string>>();

    // Multiple import patterns to catch all variations
    const importPatterns = [
        // Standard ES6 imports
        /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]/g,
        // Dynamic imports
        /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        // Require statements
        /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const fileImports = new Set<string>();

        for (const pattern of importPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const imp = match[1];
                if (!imp) continue;

                fileImports.add(imp);

                if (isLocalImport(imp)) continue;
                if (isBuiltIn(imp)) continue;

                // Extract package name
                let pkgName = imp;
                if (imp.startsWith('@')) {
                    const parts = imp.split('/');
                    if (parts.length >= 2) {
                        pkgName = `${parts[0]}/${parts[1]}`;
                    }
                } else {
                    const parts = imp.split('/');
                    pkgName = parts[0];
                }

                if (allDeps.has(pkgName)) {
                    usedDeps.add(pkgName);
                } else {
                    if (!missingDeps.has(pkgName)) {
                        missingDeps.set(pkgName, new Set());
                    }
                    missingDeps.get(pkgName)!.add(file);
                }
            }
        }

        if (fileImports.size > 0) {
            importsByFile.set(file, fileImports);
        }
    }

    // Calculate unused dependencies
    const unusedDeps = new Set<string>();
    for (const dep of allDeps) {
        if (!usedDeps.has(dep)) {
            unusedDeps.add(dep);
        }
    }

    return { missingDeps, usedDeps, unusedDeps, importsByFile };
}

async function main() {
    console.log('🔍 Analyzing project dependencies...\n');

    const { missingDeps, usedDeps, unusedDeps, importsByFile } = await analyzeImports();

    // Report missing dependencies
    if (missingDeps.size > 0) {
        console.log('❌ MISSING DEPENDENCIES:');
        console.log('='.repeat(60));
        for (const [pkg, files] of missingDeps) {
            console.log(`\n📦 ${pkg}`);
            console.log(`   Used in ${files.size} file(s):`);
            const fileList = Array.from(files).slice(0, 5);
            fileList.forEach(f => console.log(`   - ${f}`));
            if (files.size > 5) console.log(`   ... and ${files.size - 5} more`);
        }
        console.log('\n');
    } else {
        console.log('✅ All imports are satisfied in package.json\n');
    }

    // Report unused dependencies
    if (unusedDeps.size > 0) {
        console.log('⚠️  POTENTIALLY UNUSED DEPENDENCIES:');
        console.log('='.repeat(60));

        // Separate into dependencies and devDependencies
        const unusedProd = Array.from(unusedDeps).filter(d => dependencies.has(d));
        const unusedDev = Array.from(unusedDeps).filter(d => devDependencies.has(d));

        if (unusedProd.length > 0) {
            console.log('\nProduction dependencies:');
            unusedProd.forEach(dep => console.log(`  - ${dep} (${dependencies.get(dep)})`));
        }

        if (unusedDev.length > 0) {
            console.log('\nDevelopment dependencies:');
            unusedDev.forEach(dep => console.log(`  - ${dep} (${devDependencies.get(dep)})`));
        }
        console.log('\n⚠️  Note: Some dependencies might be used in build configs, scripts, or runtime only.');
        console.log('\n');
    } else {
        console.log('✅ All dependencies appear to be used\n');
    }

    // Summary
    console.log('📊 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Total dependencies: ${dependencies.size}`);
    console.log(`Total devDependencies: ${devDependencies.size}`);
    console.log(`Used dependencies: ${usedDeps.size}`);
    console.log(`Files analyzed: ${importsByFile.size}`);
    console.log(`Missing dependencies: ${missingDeps.size}`);
    console.log(`Potentially unused: ${unusedDeps.size}`);

    // Exit with error if missing deps found
    if (missingDeps.size > 0) {
        process.exit(1);
    }
}

main().catch(console.error);
