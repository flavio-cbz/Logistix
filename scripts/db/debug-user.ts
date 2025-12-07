
import Database from 'better-sqlite3';
import { resolve } from 'path';
import { compare } from 'bcrypt';

const DB_PATH = resolve(process.cwd(), 'data', 'logistix.db');
const db = new Database(DB_PATH);

async function main() {
    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as any;
        console.log('User found:', user);

        if (user) {
            const isValid = await compare('admin123', user.password_hash);
            console.log('Password valid:', isValid);
        } else {
            console.log('User admin not found');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
