const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { hashPasswordSync } = require('../../lib/utils/crypto');
const Database = require("better-sqlite3");

// --- Configuration ---
const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "logistix.db");
const adminUserId = '6b8acaf0-9f56-4d90-b3e0-2c226b67059c';
const adminUsername = 'admin';
const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin';

// --- Fonctions Utilitaires ---


function columnExists(db, tableName, columnName) {
  const result = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return result.some(col => col.name === columnName);
}

// --- 1. Création du dossier et vérification des permissions ---
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

try {
  fs.accessSync(dataDir, fs.constants.R_OK | fs.constants.W_OK);
} catch (err) {
  console.error("Erreur: Le dossier data n'a pas les bonnes permissions.");
  process.exit(1);
}

// --- 2. Initialisation de la base de données ---
const db = new Database(dbPath);

try {
  // Création de la table users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  // Ajout des colonnes manquantes à la table users
  if (!columnExists(db, 'users', 'email')) {
    db.exec(`ALTER TABLE users ADD COLUMN email TEXT;`);
  }
  if (!columnExists(db, 'users', 'bio')) {
    db.exec(`ALTER TABLE users ADD COLUMN bio TEXT;`);
  }
  if (!columnExists(db, 'users', 'avatar')) {
    db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT;`);
  }
  if (!columnExists(db, 'users', 'language')) {
    db.exec(`ALTER TABLE users ADD COLUMN language TEXT;`);
  }
  if (!columnExists(db, 'users', 'theme')) {
    db.exec(`ALTER TABLE users ADD COLUMN theme TEXT;`);
  }
  if (!columnExists(db, 'users', 'ai_config')) {
    db.exec(`ALTER TABLE users ADD COLUMN ai_config TEXT;`);
  }

  // Création de la table market_analyses
  db.exec(`
    CREATE TABLE IF NOT EXISTS market_analyses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        catalog_id INTEGER,
        category_name TEXT,
        brand_id INTEGER,
        status TEXT NOT NULL,
        input TEXT,
        result TEXT,
        raw_data TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        expires_at TEXT
    );
  `);

  // On s'assure que toutes les colonnes existent, au cas où la table existait déjà
  const columns_to_check = ['brand_id', 'raw_data', 'input', 'result', 'expires_at', 'category_name', 'error'];
  for (const col of columns_to_check) {
      if (!columnExists(db, 'market_analyses', col)) {
          const col_type = col === 'brand_id' || col === 'catalog_id' ? 'INTEGER' : 'TEXT';
          db.exec(`ALTER TABLE market_analyses ADD COLUMN ${col} ${col_type};`);
      }
  }

  // Création de la table vinted_sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS vinted_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_cookie TEXT,
        session_expires_at TEXT,
        status TEXT NOT NULL DEFAULT 'requires_configuration',
        last_validated_at TEXT,
        last_refreshed_at TEXT,
        refresh_error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE (user_id)
    );
  `);

  // --- NOUVELLES TABLES POUR LES FONCTIONNALITÉS AVANCÉES ---

  // Table pour suivre les produits
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracked_products (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        catalog_id INTEGER NOT NULL,
        brand_id INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        last_checked_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  // Table pour stocker les tendances de marché
  db.exec(`
    CREATE TABLE IF NOT EXISTS market_trends (
        id TEXT PRIMARY KEY,
        analysis_id TEXT,
        tracked_product_id TEXT,
        snapshot_date TEXT NOT NULL,
        avg_price REAL NOT NULL,
        sales_volume INTEGER NOT NULL,
        FOREIGN KEY (analysis_id) REFERENCES market_analyses (id) ON DELETE CASCADE,
        FOREIGN KEY (tracked_product_id) REFERENCES tracked_products (id) ON DELETE CASCADE
    );
  `);
  // --- FIN DES NOUVELLES TABLES ---

  // Vérifier si l'utilisateur admin spécifique existe
  const stmt = db.prepare('SELECT id FROM users WHERE id = ?');
  const adminExists = stmt.get(adminUserId);

  if (!adminExists) {
    const passwordHash = hashPassword(adminPassword);
    const now = new Date().toISOString();
    
    const insertStmt = db.prepare(
      `INSERT INTO users (id, username, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    );
    insertStmt.run(adminUserId, adminUsername, passwordHash, now, now);
  } else {
  }

} catch (err) {
  console.error("Erreur lors de l'initialisation de la base de données :", err.message);
} finally {
  db.close();
}
