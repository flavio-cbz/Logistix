import fs from 'fs';
import path from 'path';

const TARGET_DIRS = ['app', 'lib', 'components'];

function walk(dir: string, fileList: string[] = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && !file.startsWith('.')) {
                walk(filePath, fileList);
            }
        } else {
            if (/\.(ts|tsx|js|jsx)$/.test(file)) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

function removeConsoleLogs() {
    let count = 0;
    let filesProcessed = 0;

    TARGET_DIRS.forEach((dir) => {
        const fullDir = path.join(process.cwd(), dir);
        const files = walk(fullDir);

        files.forEach((file) => {
            filesProcessed++;
            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');
            let modified = false;

            const newLines = lines.map(line => {
                // Check if line has console.log/error/warn/info/debug and isn't already commented
                // We look for "console." followed by one of the methods
                if (/(console\.(log|error|warn|info|debug))/.test(line) && !line.trim().startsWith('//')) {
                    count++;
                    modified = true;
                    // Preserve indentation but comment out
                    // We use a regex to capture the leading whitespace and the console call
                    return line.replace(/(\s*)(console\.(log|error|warn|info|debug))/, '$1// $2');
                }
                return line;
            });

            if (modified) {
                fs.writeFileSync(file, newLines.join('\n'), 'utf-8');
            }
        });
    });
    console.log(`Processed ${filesProcessed} files.`);
    console.log(`Commented out ${count} console statements.`);
}

removeConsoleLogs();
