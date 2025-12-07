
import Database from 'better-sqlite3';
import { resolve } from 'path';
import { compare } from 'bcrypt';

const DB_PATH = resolve(process.cwd(), 'data', 'logistix.db');
console.log('Database path:', DB_PATH);

const db = new Database(DB_PATH);

async function testAuthFlow() {
    try {
        // Step 1: Check if admin user exists
        const user = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get('admin') as any;

        if (!user) {
            console.error('❌ User "admin" not found in database!');
            return;
        }

        console.log('✅ User found:');
        console.log('   ID:', user.id);
        console.log('   Username:', user.username);
        console.log('   Hash length:', user.password_hash?.length || 0);
        console.log('   Hash prefix:', user.password_hash?.substring(0, 10) || 'N/A');

        // Step 2: Verify password using bcrypt
        const password = 'admin123';
        console.log('\n🔐 Testing password:', password);

        const isValid = await compare(password, user.password_hash);
        console.log('   Password valid:', isValid ? '✅ YES' : '❌ NO');

        // Step 3: Check if bcrypt hash format is correct
        if (user.password_hash?.startsWith('$2')) {
            console.log('\n✅ Hash is in bcrypt format');
        } else {
            console.log('\n⚠️ Hash may not be bcrypt! Detected format:', user.password_hash?.substring(0, 20));
        }

        // Step 4: List all users
        console.log('\n📋 All users in database:');
        const allUsers = db.prepare('SELECT id, username, password_hash FROM users').all() as any[];
        allUsers.forEach((u, i) => {
            console.log(`   ${i + 1}. ${u.username} (ID: ${u.id.substring(0, 8)}..., hash: ${u.password_hash?.substring(0, 10)}...)`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        db.close();
    }
}

testAuthFlow();
