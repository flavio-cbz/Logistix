const Database = require("better-sqlite3")
const path = require("path")
const fs = require("fs")
const crypto = require("crypto")

// Chemin vers la base de données
const dbPath = path.join(process.cwd(), "data", "logistix.db")

// Création du dossier data s'il n'existe pas
const dataDir = path.dirname(dbPath)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Création de la connexion à la base de données
const db = new Database(dbPath)

console.log("Exécution des migrations...")

// Activation des clés étrangères
db.pragma("foreign_keys = ON")

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
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`)

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

// Vérifier si l'utilisateur admin existe déjà
const adminUser = db.prepare(`SELECT id FROM users WHERE username = 'admin'`).get()

// Créer l'utilisateur admin s'il n'existe pas
if (!adminUser) {
  console.log("Création de l'utilisateur administrateur...")

  // Mot de passe par défaut pour l'administrateur
  const adminPassword = "admin123"

  // Créer le fichier de mot de passe admin
  const adminPasswordFile = path.join(process.cwd(), "data", "admin-password.txt")
  fs.writeFileSync(adminPasswordFile, adminPassword)

  // Fonctions utilitaires
  const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  const getCurrentTimestamp = () => new Date().toISOString()
  const hashPassword = (password) => crypto.createHash("sha256").update(password).digest("hex")

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
}

console.log("Migrations terminées avec succès.")

// Fermeture de la connexion
db.close()
