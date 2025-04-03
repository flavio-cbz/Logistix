import Database from "better-sqlite3"
import path from "path"
import fs from "fs"
import crypto from "crypto"

// Chemin vers la base de données
const dbPath = path.join(process.cwd(), "data", "logistix.db")

// S'assurer que le dossier data existe
const dataDir = path.dirname(dbPath)
if (!fs.existsSync(dataDir)) {
  console.log("Création du dossier data...")
  fs.mkdirSync(dataDir, { recursive: true })
}

// Création de la connexion à la base de données
const db = new Database(dbPath)

// Activer les clés étrangères
db.pragma("foreign_keys = ON")

// Fonction pour initialiser la base de données
function initializeDatabase() {
  console.log("Initialisation de la base de données...")

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
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      bio TEXT,
      avatar TEXT,
      language TEXT DEFAULT 'fr',
      theme TEXT DEFAULT 'system',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `)
    console.log("Table users créée ou existante")

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
    console.log("Table sessions créée ou existante")

    // Création de la table parcelles si elle n'existe pas
    db.exec(`
    CREATE TABLE IF NOT EXISTS parcelles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      numero TEXT NOT NULL,
      transporteur TEXT NOT NULL,
      poids REAL NOT NULL,
      prixTotal REAL NOT NULL,
      prixParGramme REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `)
    console.log("Table parcelles créée ou existante")

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
    console.log("Table produits créée ou existante")

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
    console.log("Table dashboard_config créée ou existante")

    // Création d'index pour améliorer les performances
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_parcelles_user_id ON parcelles(user_id);
    CREATE INDEX IF NOT EXISTS idx_produits_user_id ON produits(user_id);
    CREATE INDEX IF NOT EXISTS idx_produits_parcelle_id ON produits(parcelleId);
    CREATE INDEX IF NOT EXISTS idx_dashboard_config_user_id ON dashboard_config(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    `)
    console.log("Index créés ou existants")

    // Vérifier si l'utilisateur admin existe déjà
    const adminUser = db
      .prepare(`
      SELECT id FROM users
      WHERE username = 'admin'
    `)
      .get()

    // Créer l'utilisateur admin s'il n'existe pas
    if (!adminUser) {
      console.log("Création de l'utilisateur administrateur...")

      // Mot de passe par défaut pour l'administrateur
      const adminPassword = "admin123"

      // Créer le fichier de mot de passe admin
      const adminPasswordFile = path.join(process.cwd(), "data", "admin-password.txt")
      fs.writeFileSync(adminPasswordFile, adminPassword)

      // Insérer l'utilisateur admin dans la base de données
      const id = generateId()
      const timestamp = getCurrentTimestamp()
      const passwordHash = hashPassword(adminPassword)

      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, "admin", "admin@logistix.local", passwordHash, timestamp, timestamp)

      console.log("Utilisateur administrateur créé avec succès")
      console.log("Nom d'utilisateur: admin")
      console.log("Mot de passe: admin123")
    } else {
      console.log("L'utilisateur administrateur existe déjà")
    }

    console.log("Initialisation de la base de données terminée avec succès")
  } catch (error) {
    console.error("Erreur lors de l'initialisation de la base de données:", error)
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

