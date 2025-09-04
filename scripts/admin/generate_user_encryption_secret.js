#!/usr/bin/env node
// scripts/admin/generate_user_encryption_secret.js
const { randomBytes } = require('crypto');

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node scripts/admin/generate_user_encryption_secret.js <userId>');
  process.exit(1);
}

const secret = randomBytes(32).toString('hex');

console.log('--- GENERATED USER ENCRYPTION SECRET ---');
console.log('userId:', userId);
console.log('encryption_secret (hex):', secret);
console.log('');
console.log('-- SQL (copy & run in your DB client) --');
console.log(`UPDATE users SET encryption_secret = '${secret}' WHERE id = '${userId}';`);
console.log('');
console.log('-- Quick sqlite3 example (adjust path to your DB file) --');
console.log(`sqlite3 ./data/database.sqlite "UPDATE users SET encryption_secret = '${secret}' WHERE id = '${userId}';"`);
console.log('');
console.log('-- Node/pg example (run manually if you want to apply from Node):');
console.log(`// Example using node-postgres - not executed by this script`);
console.log(`// const { Client } = require('pg');`);
console.log(`// await client.query("UPDATE users SET encryption_secret = $1 WHERE id = $2", [${secret}, ${userId}]);`);
process.exit(0);