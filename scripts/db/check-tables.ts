
import Database from 'better-sqlite3';
import { resolve } from 'path';

const DB_PATH = resolve(process.cwd(), 'data', 'logistix.db');
console.log('Database path:', DB_PATH);

const db = new Database(DB_PATH);

try {
    // List all tables
    console.log('\n📋 All tables in database:');
    const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all() as any[];

    tables.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.name}`);
    });

    // Check if 'sessions' table exists
    const sessionsExists = tables.some(t => t.name === 'sessions');
    const userSessionsExists = tables.some(t => t.name === 'user_sessions');

    console.log('\n🔍 Session tables:');
    console.log('   sessions:', sessionsExists ? '✅ EXISTS' : '❌ NOT FOUND');
    console.log('   user_sessions:', userSessionsExists ? '✅ EXISTS' : '❌ NOT FOUND');

    // If user_sessions exists, show its structure
    if (userSessionsExists) {
        console.log('\n📐 user_sessions table structure:');
        const cols = db.prepare("PRAGMA table_info('user_sessions')").all() as any[];
        cols.forEach(c => {
            console.log(`   - ${c.name}: ${c.type}${c.notnull ? ' NOT NULL' : ''}${c.pk ? ' PRIMARY KEY' : ''}`);
        });
    }

    // If sessions exists, show its structure
    if (sessionsExists) {
        console.log('\n📐 sessions table structure:');
        const cols = db.prepare("PRAGMA table_info('sessions')").all() as any[];
        cols.forEach(c => {
            console.log(`   - ${c.name}: ${c.type}${c.notnull ? ' NOT NULL' : ''}${c.pk ? ' PRIMARY KEY' : ''}`);
        });
    }

} catch (error) {
    console.error('Error:', error);
} finally {
    db.close();
}
