#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { resolve } from 'path';

const DB_PATH = resolve(process.cwd(), 'data', 'logistix.db');
const db = new Database(DB_PATH);

try {
  // Récupérer l'ID de l'admin
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as any;
  if (!admin) {
    console.error('❌ Admin user not found');
    process.exit(1);
  }

  // Récupérer une parcelle
  const parcelle = db.prepare('SELECT id FROM parcelles WHERE user_id = ? LIMIT 1').get(admin.id) as any;
  if (!parcelle) {
    console.error('❌ No parcelle found');
    process.exit(1);
  }

  // Vérifier si le produit existe déjà
  const existing = db.prepare('SELECT id FROM products WHERE vinted_item_id = ?').get('VINTEDCM001TEST') as any;
  if (existing) {
    console.log('✅ Product VINTEDCM001TEST already exists with ID:', existing.id);
    db.close();
    process.exit(0);
  }

  // Créer le produit de test
  const productId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO products (
      id, user_id, parcelle_id, name, poids, price, currency,
      vinted_item_id, vendu, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    productId,
    admin.id,
    parcelle.id,
    'Robe test',
    100,
    10.00,
    'EUR',
    'VINTEDCM001TEST',
    '0',
    'listed',
    now,
    now
  );

  console.log('✅ Test product created with ID:', productId);
  console.log('📦 Vinted Item ID: VINTEDCM001TEST');
} finally {
  db.close();
}
