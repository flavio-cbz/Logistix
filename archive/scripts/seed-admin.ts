#!/usr/bin/env ts-node

/**
 * Script de seed pour créer / mettre à jour l'administrateur de dev.
 * Utilisation: ADMIN_ID=... ADMIN_DEFAULT_PASSWORD=... ts-node scripts/seed-admin.ts
 */

import Database from 'better-sqlite3';
import { hashSync } from 'bcryptjs';

const dbPath = process.cwd() + '/data/logistix.db';
const db = new Database(dbPath);

const adminId = process.env['ADMIN_ID'] || 'baa65519-e92f-4010-a3c2-e9b5c67fb0d7';
const adminPassword = process.env['ADMIN_DEFAULT_PASSWORD'] || process.env['ADMIN_PASSWORD'] || 'admin123';
const username = process.env['ADMIN_USERNAME'] || 'admin';

try {
  const existing = db.prepare('SELECT id, username FROM users WHERE id = ?').get(adminId);
  if (existing) {
    console.log('Admin exists with id', adminId, ', updating username/password');
    // If another user already has the 'admin' username (but different id), rename it to avoid UNIQUE conflict
    try {
      const conflict = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, adminId) as { id: string } | undefined;
      if (conflict && conflict.id) {
        const newName = `admin_old_${Date.now()}`;
        console.log('Renaming existing admin username for id', conflict.id, '->', newName);
        db.prepare('UPDATE users SET username = ?, updated_at = ? WHERE id = ?').run(newName, new Date().toISOString(), conflict.id);
      }

      db.prepare('UPDATE users SET username = ?, password_hash = ?, role = ?, updated_at = ? WHERE id = ?')
        .run(username, hashSync(adminPassword, 12), 'admin', new Date().toISOString(), adminId);
    } catch (err) {
      console.error('Failed to update existing admin record:', err);
      throw err;
    }
  } else {
    console.log('Inserting admin with id', adminId);
    db.prepare('INSERT INTO users (id, username, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(adminId, username, hashSync(adminPassword, 12), 'admin', new Date().toISOString(), new Date().toISOString());
  }
  console.log('Done');
} finally {
  db.close();
}
