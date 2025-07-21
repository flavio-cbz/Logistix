import 'server-only';
import Database from "better-sqlite3"
import path from "path"
import fs from "fs"
import crypto from "crypto"
import { Logger } from "@/lib/utils/logger"

const logger = new Logger("lib/db")

// Chemin vers la base de données
const dbPath = path.join(process.cwd(), "data", "logistix.db")

// S'assurer que le dossier data existe
const dataDir = path.dirname(dbPath)
if (!fs.existsSync(dataDir)) {
  logger.info("Création du dossier data...")
  fs.mkdirSync(dataDir, { recursive: true })
}

// Global database instance to prevent multiple initializations
let _db: Database.Database | null = null

// Création de la connexion à la base de données avec cache
function getDatabase() {
  if (_db) return _db
  
  _db = new Database(dbPath)
  
  // Configuration optimisée pour les performances
  _db.pragma("foreign_keys = ON")
  _db.pragma("journal_mode = WAL")
  _db.pragma("synchronous = NORMAL") // Changed from FULL for better performance
  _db.pragma("cache_size = 10000") // Increase cache size
  _db.pragma("temp_store = memory") // Use memory for temp storage
  _db.pragma("mmap_size = 268435456") // 256MB memory map
  
  return _db
}

const db = getDatabase()

// Track if database is already initialized to prevent multiple runs
let isInitialized = false

// Fonction pour initialiser la base de données (optimisée)
function initializeDatabase() {
  if (isInitialized) {
    logger.info("Base de données déjà initialisée, ignorer...")
    return
  }
  
  logger.info("Initialisation de la base de données...")

  try {
    // Activer les clés étrangères
    db.pragma("foreign_keys = ON")

    // Activer le mode WAL pour de meilleures performances et une meilleure fiabilité
    db.pragma("journal_mode = WAL")

    // Activer la synchronisation complète pour garantir la persistance des données
    db.pragma("synchronous = FULL")

    // Création de la table users si elle n'existe pas
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      language TEXT DEFAULT 'fr',
      theme TEXT DEFAULT 'system',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `)
    logger.info("Table users créée ou existante")

    // Création de la table sessions si elle n'existe pas
    db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `)
    logger.info("Table sessions créée ou existante")

    // Création de la table parcelles si elle n'existe pas
    db.exec(`
    CREATE TABLE IF NOT EXISTS parcelles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      numero TEXT NOT NULL,
      transporteur TEXT NOT NULL,
      prixAchat REAL NOT NULL,
      poids REAL NOT NULL,
      prixTotal REAL NOT NULL,
      prixParGramme REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `)
    logger.info("Table parcelles créée ou existante")

    // Création de la table produits si elle n'existe pas
    db.exec(`
    CREATE TABLE IF NOT EXISTS produits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      parcelleId TEXT,
      commandeId TEXT NOT NULL,
      nom TEXT NOT NULL,
      details TEXT,
      prixArticle REAL NOT NULL,
      prixArticleTTC REAL,
      poids REAL NOT NULL,
      prixLivraison REAL NOT NULL,
      vendu INTEGER DEFAULT 0,
      dateVente TIMESTAMP,
      tempsEnLigne TEXT,
      prixVente REAL,
      plateforme TEXT,
      benefices REAL,
      pourcentageBenefice REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parcelleId) REFERENCES parcelles(id) ON DELETE SET NULL
    );
    `)
    logger.info("Table produits créée ou existante")

    // Création de la table dashboard_config si elle n'existe pas
    db.exec(`
    CREATE TABLE IF NOT EXISTS dashboard_config (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      config TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `)
    logger.info("Table dashboard_config créée ou existante")

    // Création de la table market_analyses si elle n'existe pas
    db.exec(`
    CREATE TABLE IF NOT EXISTS market_analyses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      current_price REAL NOT NULL,
      min_price REAL NOT NULL,
      max_price REAL NOT NULL,
      avg_price REAL NOT NULL,
      sales_volume INTEGER NOT NULL,
      competitor_count INTEGER NOT NULL,
      trend TEXT NOT NULL,
      trend_percentage REAL NOT NULL,
      last_updated TIMESTAMP NOT NULL,
      recommended_price REAL NOT NULL,
      market_share REAL NOT NULL,
      demand_level TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `)
    logger.info("Table market_analyses créée ou existante")

    // Création de la table historical_prices si elle n'existe pas
    db.exec(`
    CREATE TABLE IF NOT EXISTS historical_prices (
      id TEXT PRIMARY KEY,
      product_name TEXT NOT NULL,
      date TIMESTAMP NOT NULL,
      price REAL NOT NULL,
      sales_volume INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `)
    logger.info("Table historical_prices créée ou existante")

    // Création d'index pour améliorer les performances
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_parcelles_user_id ON parcelles(user_id);
    CREATE INDEX IF NOT EXISTS idx_produits_user_id ON produits(user_id);
    CREATE INDEX IF NOT EXISTS idx_produits_parcelle_id ON produits(parcelleId);
    CREATE INDEX IF NOT EXISTS idx_dashboard_config_user_id ON dashboard_config(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_market_analyses_user_id ON market_analyses(user_id);
    CREATE INDEX IF NOT EXISTS idx_historical_prices_product_name ON historical_prices(product_name);
    CREATE INDEX IF NOT EXISTS idx_historical_prices_date ON historical_prices(date);
    `)
    logger.info("Index créés ou existants")

    // Vérifier si un utilisateur existe déjà
    const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get() as any;
    if (userCount && userCount.count === 0) {
      logger.info("Aucun utilisateur trouvé, création de l'administrateur...")

      // Mot de passe par défaut pour l'administrateur
      const adminPassword = "admin123"

      // Insérer l'utilisateur admin dans la base de données
      const id = generateId()
      const timestamp = getCurrentTimestamp()
      const passwordHash = hashPassword(adminPassword)

      db.prepare(`
        INSERT INTO users (id, username, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, "admin", passwordHash, timestamp, timestamp)

      logger.info("Utilisateur administrateur créé avec succès")
      logger.info("Nom d'utilisateur: admin")
      logger.info("Mot de passe: admin123")
    } else {
      logger.info("Un utilisateur existe déjà.")
    }

      // Performance indexes
      db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_parcelles_user_id ON parcelles(user_id);
      CREATE INDEX IF NOT EXISTS idx_parcelles_created_at ON parcelles(created_at);
      CREATE INDEX IF NOT EXISTS idx_produits_user_id ON produits(user_id);
      CREATE INDEX IF NOT EXISTS idx_produits_parcelle_id ON produits(parcelleId);
      CREATE INDEX IF NOT EXISTS idx_produits_vendu ON produits(vendu);
      CREATE INDEX IF NOT EXISTS idx_produits_created_at ON produits(created_at);
      `)
    })
    
    initTransaction()
    isInitialized = true
    logger.info("Initialisation de la base de données terminée avec succès")
    
  } catch (error) {
    logger.error("Erreur lors de l'initialisation de la base de données:", error)
    throw error
  }
}

// Fonction pour hacher un mot de passe
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex")
}

// Fonctions utilitaires pour la base de données
function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function getCurrentTimestamp() {
  return new Date().toISOString()
}

// Initialiser la base de données
initializeDatabase()

export { db, generateId, getCurrentTimestamp }
