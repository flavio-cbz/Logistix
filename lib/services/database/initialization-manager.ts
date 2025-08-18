import 'server-only';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { hashPasswordSync } from '../../utils/crypto';
import bcrypt from 'bcrypt';

// Logger optimisé pour l'initialisation
import { getLogger } from '@/lib/utils/logging/simple-logger';

const logger = getLogger('InitManager');

// État d'initialisation
export enum InitializationState {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Interface du gestionnaire d'initialisation
export interface DatabaseInitializationManager {
  isInitialized(): boolean;
  initialize(): Promise<void>;
  waitForInitialization(): Promise<void>;
  markAsInitialized(): void;
  getInitializationState(): InitializationState;
  reset(): void;
}

/**
 * Gestionnaire d'initialisation thread-safe pour la base de données SQLite
 * Garantit qu'une seule initialisation se produit même avec des accès concurrents
 */
export class DatabaseInitializationManagerImpl implements DatabaseInitializationManager {
  private static instance: DatabaseInitializationManagerImpl;
  private initializationState: InitializationState = InitializationState.NOT_STARTED;
  private initializationPromise: Promise<void> | null = null;
  private initializationError: Error | null = null;
  private dbPath: string;
  private readonly initializationMutex = new Set<string>(); // Pour éviter les initialisations multiples

  private constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'logistix.db');
    logger.info('DatabaseInitializationManager created', { dbPath: this.dbPath });
  }

  /**
   * Récupère l'instance unique du gestionnaire d'initialisation
   */
  public static getInstance(): DatabaseInitializationManagerImpl {
    if (!DatabaseInitializationManagerImpl.instance) {
      DatabaseInitializationManagerImpl.instance = new DatabaseInitializationManagerImpl();
    }
    return DatabaseInitializationManagerImpl.instance;
  }

  /**
   * Vérifie si la base de données est initialisée
   */
  public isInitialized(): boolean {
    return this.initializationState === InitializationState.COMPLETED;
  }

  /**
   * Obtient l'état actuel de l'initialisation
   */
  public getInitializationState(): InitializationState {
    return this.initializationState;
  }

  /**
   * Vérifie si le schéma de la base de données existe déjà
   */
  private async checkSchemaExists(): Promise<boolean> {
    if (!fs.existsSync(this.dbPath)) {
      return false;
    }

    try {
      const db = new Database(this.dbPath);
      
      // Vérifier l'existence des tables principales
      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name IN ('users', 'parcelles', 'produits', 'sessions', 'market_analyses')
      `).all();
      
      db.close();
      
      const hasRequiredTables = tables.length >= 4;
      
      return hasRequiredTables;
    } catch (error) {
      logger.warn('Error checking schema existence', { error });
      return false;
    }
  }

  /**
   * S'assure que le répertoire des données existe
   */
  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      logger.info('Creating data directory', { dataDir });
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Configure les PRAGMA pour des performances et une fiabilité optimales
   */
  private configureDatabase(db: Database.Database): void {
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = 10000');
    db.pragma('temp_store = memory');
    db.pragma('mmap_size = 268435456'); // 256MB
    db.pragma('busy_timeout = 30000'); // 30s timeout pour les verrous
  }

  /**
   * Initialise le schéma de la base de données
   */
  private initializeSchema(db: Database.Database): void {
    logger.info('Initializing database schema...');

    const initTransaction = db.transaction(() => {
      // Création des tables
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

        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

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

        CREATE TABLE IF NOT EXISTS dashboard_config (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          config TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        
        -- Supprimer l'ancienne table market_analyses si elle existe avec l'ancien schéma
        DROP TABLE IF EXISTS market_analyses;
        
        CREATE TABLE market_analyses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            product_name TEXT NOT NULL,
            catalog_id INTEGER,
            category_name TEXT,
            status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
            input TEXT,
            result TEXT,
            error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS historical_prices (
            id TEXT PRIMARY KEY,
            product_name TEXT NOT NULL,
            date TIMESTAMP NOT NULL,
            price REAL NOT NULL,
            sales_volume INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS similar_sales (
          id TEXT PRIMARY KEY,
          query_hash TEXT NOT NULL,
          raw_data TEXT NOT NULL,
          parsed_data TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Création des index
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_parcelles_user_id ON parcelles(user_id);
        CREATE INDEX IF NOT EXISTS idx_produits_user_id ON produits(user_id);
        CREATE INDEX IF NOT EXISTS idx_produits_parcelle_id ON produits(parcelleId);
        CREATE INDEX IF NOT EXISTS idx_dashboard_config_user_id ON dashboard_config(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_market_analyses_user_id ON market_analyses(user_id);
        CREATE INDEX IF NOT EXISTS idx_historical_prices_product_name ON historical_prices(product_name);
        CREATE INDEX IF NOT EXISTS idx_historical_prices_date ON historical_prices(date);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_parcelles_created_at ON parcelles(created_at);
        CREATE INDEX IF NOT EXISTS idx_produits_vendu ON produits(vendu);
        CREATE INDEX IF NOT EXISTS idx_produits_created_at ON produits(created_at);
        CREATE INDEX IF NOT EXISTS idx_similar_sales_query_hash ON similar_sales(query_hash);
      `);
      
      logger.info('Tables and indexes created or already exist');

      // Initialisation des métadonnées Vinted
      this.runMetadataSchema(db);
      
      // Création de l'utilisateur admin si aucun utilisateur n'existe
      this.createDefaultAdminUser(db);
    });

    initTransaction();
    logger.info('Database schema initialization completed successfully');
  }

  /**
   * Exécute le script SQL pour le schéma des métadonnées
   */
  private runMetadataSchema(db: Database.Database): void {
    const schemaPath = path.join(process.cwd(), 'lib', 'services', 'metadata-schema.sql');
    if (fs.existsSync(schemaPath)) {
      try {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);
        logger.info('Vinted metadata schema executed successfully');
      } catch (error) {
        logger.error('Error executing metadata schema', { error });
      }
    } else {
      logger.warn('Metadata schema file not found, step skipped');
    }
  }

  /**
   * Crée un utilisateur administrateur par défaut si la table des utilisateurs est vide
   */
  private createDefaultAdminUser(db: Database.Database): void {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

    if (userCount.count === 0) {
      logger.info('No users found, creating default administrator...');
      
      const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || process.env.ADMIN_PASSWORD || 'admin123';
      
      const insert = db.prepare(
        'INSERT INTO users (id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      );
      insert.run(
        this.generateId(),
        'admin',
        this.hashPassword(adminPassword),
        this.getCurrentTimestamp(),
        this.getCurrentTimestamp()
      );

      logger.info('Default administrator user created successfully');
      logger.warn(`Username: admin, Password: ${adminPassword}`);
    } else {
      logger.info('One or more users already exist, skipping default administrator creation');
    }
  }

  /**
   * Initialise la base de données de manière thread-safe
   */
  public async initialize(): Promise<void> {
    // Si déjà initialisé, retourner immédiatement
    if (this.initializationState === InitializationState.COMPLETED) {
      return;
    }

    // Si une initialisation est en cours, attendre sa completion
    if (this.initializationState === InitializationState.IN_PROGRESS) {
      return this.waitForInitialization();
    }

    // Si une initialisation a échoué, relancer
    if (this.initializationState === InitializationState.FAILED) {
      logger.info('Previous initialization failed, retrying...');
      this.initializationState = InitializationState.NOT_STARTED;
      this.initializationError = null;
      this.initializationPromise = null;
    }

    // Vérifier si le schéma existe déjà
    if (await this.checkSchemaExists()) {
      logger.info('Database schema already exists, marking as initialized');

      // Avant de quitter, vérifier et migrer le mot de passe admin legacy si nécessaire
      try {
        await this.rotateLegacyAdminIfNeeded();
      } catch (err) {
        logger.warn('Error during legacy admin rotation check', { error: err });
      }

      this.initializationState = InitializationState.COMPLETED;
      return;
    }

    // Démarrer l'initialisation
    this.initializationState = InitializationState.IN_PROGRESS;
    const initializationId = randomUUID();
    this.initializationMutex.add(initializationId);

    logger.info('Starting database initialization', { initializationId });

    this.initializationPromise = this.performInitialization(initializationId);
    
    try {
      await this.initializationPromise;
      this.initializationState = InitializationState.COMPLETED;
      logger.info('Database initialization completed successfully', { initializationId });
    } catch (error) {
      this.initializationState = InitializationState.FAILED;
      this.initializationError = error as Error;
      logger.error('Database initialization failed', { initializationId, error });
      throw error;
    } finally {
      this.initializationMutex.delete(initializationId);
    }
  }

  /**
   * Effectue l'initialisation réelle de la base de données
   */
  private async performInitialization(initializationId: string): Promise<void> {

    // S'assurer que le répertoire existe
    this.ensureDataDirectory();

    // Créer et configurer la base de données
    const db = new Database(this.dbPath);
    
    try {
      this.configureDatabase(db);
      this.initializeSchema(db);
      
    } finally {
      db.close();
    }
  }

  /**
   * Attend que l'initialisation soit terminée
   */
  public async waitForInitialization(): Promise<void> {
    if (this.initializationState === InitializationState.COMPLETED) {
      return;
    }

    if (this.initializationState === InitializationState.FAILED && this.initializationError) {
      throw this.initializationError;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    if (this.initializationState === InitializationState.FAILED && this.initializationError) {
      throw this.initializationError;
    }
  }

  /**
   * Marque l'initialisation comme terminée (pour les cas où l'initialisation est faite externement)
   */
  public markAsInitialized(): void {
    if (this.initializationState !== InitializationState.COMPLETED) {
      logger.info('Marking database as initialized externally');
      this.initializationState = InitializationState.COMPLETED;
      this.initializationError = null;
    }
  }

  /**
   * Remet à zéro l'état d'initialisation (pour les tests ou la réinitialisation)
   */
  public reset(): void {
    logger.info('Resetting initialization state');
    this.initializationState = InitializationState.NOT_STARTED;
    this.initializationError = null;
    this.initializationPromise = null;
    this.initializationMutex.clear();
  }

  /**
   * Génère un identifiant unique universel (UUID)
   */
  private generateId(): string {
    return randomUUID();
  }

  /**
   * Rotate legacy admin password (SHA-256) to bcrypt using ADMIN_DEFAULT_PASSWORD if provided.
   * This runs during initialization checks and is safe to call multiple times.
   */
  private async rotateLegacyAdminIfNeeded(): Promise<void> {
    try {
      const adminDefault = process.env.ADMIN_DEFAULT_PASSWORD || process.env.ADMIN_PASSWORD || null;
      if (!adminDefault) {
        // Nothing to do without a provided default password
        return;
      }

      const db = new Database(this.dbPath);
      try {
        const adminRow = db.prepare("SELECT id, password_hash FROM users WHERE username = ?").get('admin') as { id?: string; password_hash?: string } | undefined;
        if (!adminRow || !adminRow.password_hash) return;

        // Detect SHA-256 hex (64 hex chars)
        const isSha256Hex = /^[a-f0-9]{64}$/i.test(adminRow.password_hash);
        if (!isSha256Hex) return;

        const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
        const newHash = bcrypt.hashSync(adminDefault, saltRounds);

        db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
          .run(newHash, this.getCurrentTimestamp(), adminRow.id);

        logger.info('Legacy admin password rotated to bcrypt using ADMIN_DEFAULT_PASSWORD');
      } finally {
        db.close();
      }
    } catch (err) {
      logger.warn('Error rotating legacy admin password', { error: err });
    }
  }

  /**
   * Hache un mot de passe en utilisant SHA-256
   */
  private hashPassword(password: string): string {
    return hashPasswordSync(password);
  }

  /**
   * Récupère l'horodatage actuel au format ISO 8601
   */
  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }
}

// Export de l'instance singleton
export const initializationManager = DatabaseInitializationManagerImpl.getInstance();