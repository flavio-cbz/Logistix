<<<<<<< HEAD
// import "server-only";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { hashPasswordSync } from "../../utils/crypto";
import bcrypt from "bcrypt";

const noopLogger = {
  info: (_message: string, _data?: Record<string, any>) => { },
  warn: (_message: string, _data?: Record<string, any>) => { },
  error: (_message: string, _data?: Record<string, any>) => { },
  debug: (_message: string, _data?: Record<string, any>) => { }
};

// Vitest-safe: toujours utiliser un logger no-op pour éviter les erreurs de mock
const logger = noopLogger;

// État d'initialisation
export enum InitializationState {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
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
export class DatabaseInitializationManagerImpl
  implements DatabaseInitializationManager {
  private static instance: DatabaseInitializationManagerImpl;
  private initializationState: InitializationState =
    InitializationState.NOT_STARTED;
  private initializationPromise: Promise<void> | null = null;
  private initializationError: Error | null = null;
  private dbPath: string;
  private readonly initializationMutex = new Set<string>(); // Pour éviter les initialisations multiples

  private constructor() {
    this.dbPath = path.join(process.cwd(), "data", "logistix.db");
    logger.info("DatabaseInitializationManager created", {
      dbPath: this.dbPath,
    });
  }

  /**
   * Récupère l'instance unique du gestionnaire d'initialisation
   */
  public static getInstance(): DatabaseInitializationManagerImpl {
    if (!DatabaseInitializationManagerImpl.instance) {
      DatabaseInitializationManagerImpl.instance =
        new DatabaseInitializationManagerImpl();
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
      const tables = db
        .prepare(
          `
        SELECT name FROM sqlite_master
        WHERE type='table' AND name IN ('users', 'parcelles', 'products', 'user_sessions')
      `,
        )
        .all() as { name: string }[]; // Explicitly type the result

      db.close();

      const hasRequiredTables = tables.length >= 4; // Check if at least 4 tables exist

      return hasRequiredTables;
    } catch (error: unknown) {
      // Changed to unknown
      logger.warn("Error checking schema existence", {
        error: error instanceof Error ? error.message : String(error),
      }); // Improved error logging
      return false;
    }
  }

  /**
   * S'assure que le répertoire des données existe
   */
  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      logger.info("Creating data directory", { dataDir });
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Configure les PRAGMA pour des performances et une fiabilité optimales
   */
  private configureDatabase(db: Database.Database): void {
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("cache_size = 10000");
    db.pragma("temp_store = memory");
    db.pragma("mmap_size = 268435456"); // 256MB
    db.pragma("busy_timeout = 30000"); // 30s timeout pour les verrous
  }

  /**
   * Initialise le schéma de la base de données
   */
  private initializeSchema(db: Database.Database): void {
    logger.info("Initializing database schema via consolidated migration file...");

    const migrationFile = path.join(process.cwd(), 'drizzle', 'migrations', '0000_complete_schema.sql');

    if (!fs.existsSync(migrationFile)) {
      logger.error('Migration file not found', { migrationFile });
      throw new Error(`Migration file not found: ${migrationFile}`);
    }

    const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');

    // Split statements and ignore comments/empty lines
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const transaction = db.transaction(() => {
      for (const stmt of statements) {
        const statement = stmt.trim();
        if (!statement) continue;

        try {
          // Guard for CREATE INDEX statements: ensure columns exist first
          const lower = statement.toLowerCase();
          if (lower.startsWith('create index') || lower.startsWith('create unique index')) {
            const m = /on\s+([`"]?)([a-z0-9_]+)\1\s*\(([^)]+)\)/i.exec(statement);
            if (m) {
              const table = m[2];
              const cols = m[3]!
                .split(',')
                .map(c => c.trim().replace(/[`"\s]+/g, ''))
                .map(c => c.replace(/\s+(desc|asc)\s*$/i, ''))
                .map(c => c.toLowerCase());

              let tableColumns: string[] = [];
              try {
                const rows = db.prepare(`PRAGMA table_info('${table}')`).all();
                tableColumns = rows.map((r: any) => String(r.name).toLowerCase());
              } catch (_e) {
                logger.warn(`Table ${table} does not exist yet, skipping index: ${statement}`);
                continue;
              }

              const missing = cols.filter(c => !tableColumns.includes(c));
              if (missing.length > 0) {
                logger.info(`Skipping index on ${table}, missing columns: ${missing.join(', ')}`);
                continue;
              }
            }
          }

          db.prepare(statement).run();
        } catch (err: any) {
          // Ignore already exists errors because migration uses IF NOT EXISTS
          const msg = String(err?.message || err);
          if (msg.toLowerCase().includes('already exists')) {
            continue;
          }
          // Log and rethrow other errors
          logger.error('Error executing migration statement', { statement, error: msg });
          throw err;
        }
      }

      logger.info('Migration statements executed from file', { migrationFile, count: statements.length });
    });

    transaction();

    // Run existing upgrade helpers to ensure any programmatic upgrades are applied
    try {
      // Ensure produits/products table schema is up-to-date (tempsEnLigne and legacy columns used by statistics)
      this.upgradeProduitsSchema(db);
      logger.info('Post-migration schema upgrades applied');
    } catch (e: unknown) {
      logger.warn('Post-migration upgrades failed', { error: e instanceof Error ? e.message : String(e) });
    }

    // Création de l'utilisateur admin si aucun utilisateur n'existe
    this.createDefaultAdminUser(db);

    logger.info('Database schema initialization completed successfully (via migration file)');
  }

  /**
   * Crée un utilisateur administrateur par défaut si la table des utilisateurs est vide
   */
  private createDefaultAdminUser(db: Database.Database): void {
    type UserCountResult = { count: number };
    const userCount = db
      .prepare("SELECT COUNT(*) as count FROM users")
      .get() as UserCountResult; // Explicitly type the result

    if (userCount.count === 0) {
      logger.info("No users found, creating default administrator...");

      const adminPassword =
        process.env["ADMIN_DEFAULT_PASSWORD"] ||
        process.env["ADMIN_PASSWORD"] ||
        "admin123"; // Removed '!' as it can be null/undefined

      // Support a legacy fixed admin ID used by temporary session bypass in the codebase.
      // Allow override via ADMIN_ID env var for flexibility in CI/dev.
      const legacyAdminId = process.env["ADMIN_ID"] || 'baa65519-e92f-4010-a3c2-e9b5c67fb0d7';

      // Upsert pattern: if a user with legacyAdminId doesn't exist, insert it.
      const exists = db
        .prepare("SELECT 1 FROM users WHERE id = ? LIMIT 1")
        .get(legacyAdminId);

      if (!exists) {
        const insert = db.prepare(
          "INSERT INTO users (id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        );
        insert.run(
          legacyAdminId,
          "temp_admin",
          hashPasswordSync(adminPassword),
          this.getCurrentTimestamp(),
          this.getCurrentTimestamp(),
        );
        logger.info('Inserted legacy admin user to satisfy temporary session bypass', { legacyAdminId });
      } else {
        logger.info('Legacy admin user already present, skipping insert', { legacyAdminId });
      }

      logger.info("Default administrator user created successfully");
    } else {
      logger.info(
        "One or more users already exist, skipping default administrator creation",
      );
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
      logger.info("Previous initialization failed, retrying...");
      this.initializationState = InitializationState.NOT_STARTED;
      this.initializationError = null;
      this.initializationPromise = null;
    }

    // Vérifier si le schéma existe déjà
    if (await this.checkSchemaExists()) {
      logger.info("Database schema already exists, marking as initialized");
      // Upgrade existing schema to ensure required columns exist (brand_id, raw_data, expires_at)
      try {
        const db = new Database(this.dbPath);
        try {
          // Ensure produits/products table schema is up-to-date (tempsEnLigne and legacy columns used by statistics)
          this.upgradeProduitsSchema(db);
        } finally {
          db.close();
        }
      } catch (e: unknown) {
        // Changed to unknown
        logger.warn("Schema upgrade on existing database failed", {
          error: e instanceof Error ? e.message : String(e),
        }); // Improved error logging
      }

      // Avant de quitter, vérifier et migrer le mot de passe admin legacy si nécessaire
      try {
        await this.rotateLegacyAdminIfNeeded();
      } catch (err: unknown) {
        // Changed to unknown
        logger.warn("Error during legacy admin rotation check", {
          error: err instanceof Error ? err.message : String(err),
        }); // Improved error logging
      }

      this.initializationState = InitializationState.COMPLETED;
      return;
    }

    // Démarrer l'initialisation
    this.initializationState = InitializationState.IN_PROGRESS;
    const initializationId = randomUUID();
    this.initializationMutex.add(initializationId);

    logger.info("Starting database initialization", { initializationId });

    this.initializationPromise = this.performInitialization();

    try {
      await this.initializationPromise;
      this.initializationState = InitializationState.COMPLETED;
      logger.info("Database initialization completed successfully", {
        initializationId,
      });
    } catch (error: unknown) {
      // Changed to unknown
      this.initializationState = InitializationState.FAILED;
      this.initializationError =
        error instanceof Error ? error : new Error(String(error)); // Ensure Error object
      logger.error("Database initialization failed", {
        initializationId,
        error: this.initializationError.message,
      }); // Log error message
      throw error;
    } finally {
      this.initializationMutex.delete(initializationId);
    }
  }

  /**
   * Assure la présence des colonnes attendues dans la table `produits`.
   * - Ajoute `tempsEnLigne` si manquante
   * - Si une colonne legacy `dateMiseEnLigne` existe, copie ses valeurs dans `tempsEnLigne`
   */
  private upgradeProduitsSchema(db: Database.Database): void {
    try {
      // Work with both legacy 'produits' and normalized 'products' tables.
      const tablesToCheck = ["produits", "products"];

      for (const tbl of tablesToCheck) {
        const hasTemps = this.columnExists(db, tbl, "tempsEnLigne");
        const hasDateMise = this.columnExists(db, tbl, "dateMiseEnLigne");

        if (!hasTemps) {
          try {
            db.exec(`ALTER TABLE ${tbl} ADD COLUMN tempsEnLigne TEXT;`);
            logger.info(`Added column 'tempsEnLigne' to '${tbl}' table`);

            if (hasDateMise) {
              try {
                db.exec(
                  `UPDATE ${tbl} SET tempsEnLigne = dateMiseEnLigne WHERE dateMiseEnLigne IS NOT NULL;`,
                );
                logger.info(
                  `Migrated existing 'dateMiseEnLigne' values into 'tempsEnLigne' for table ${tbl}`,
                );
              } catch (e: unknown) {
                logger.warn(
                  `Failed to migrate dateMiseEnLigne -> tempsEnLigne for ${tbl}`,
                  { error: e instanceof Error ? e.message : String(e) },
                );
              }
            }
          } catch (e: unknown) {
            logger.warn(`Failed to add tempsEnLigne to ${tbl}`, {
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }
      }
    } catch (e: unknown) {
      logger.warn("upgradeProduitsSchema failed", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }


  /**
   * Effectue l'initialisation réelle de la base de données
   */
  private async performInitialization(): Promise<void> {
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

    if (
      this.initializationState === InitializationState.FAILED &&
      this.initializationError
    ) {
      throw this.initializationError;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    if (
      this.initializationState === InitializationState.FAILED &&
      this.initializationError
    ) {
      throw this.initializationError;
    }
  }

  /**
   * Marque l'initialisation comme terminée (pour les cas où l'initialisation est faite externement)
   */
  public markAsInitialized(): void {
    if (this.initializationState !== InitializationState.COMPLETED) {
      logger.info("Marking database as initialized externally");
      this.initializationState = InitializationState.COMPLETED;
      this.initializationError = null;
    }
  }

  /**
   * Remet à zéro l'état d'initialisation (pour les tests ou la réinitialisation)
   */
  public reset(): void {
    logger.info("Resetting initialization state");
    this.initializationState = InitializationState.NOT_STARTED;
    this.initializationError = null;
    this.initializationPromise = null;
    this.initializationMutex.clear();
  }

  /**
   * Génère un identifiant unique universel (UUID)
   */
  // generateId was previously defined here but the project uses shared generateId utilities
  // to avoid duplicate implementations. Remove the private one to satisfy linter.

  /**
   * Rotate legacy admin password (SHA-256) to bcrypt using ADMIN_DEFAULT_PASSWORD if provided.
   * This runs during initialization checks and is safe to call multiple times.
   */
  private async rotateLegacyAdminIfNeeded(): Promise<void> {
    try {
      const adminDefault =
        process.env["ADMIN_DEFAULT_PASSWORD"] ||
        process.env["ADMIN_PASSWORD"] ||
        null;
      if (!adminDefault) {
        // Nothing to do without a provided default password
        return;
      }

      const db = new Database(this.dbPath);
      try {
        const adminRow = db
          .prepare("SELECT id, password_hash FROM users WHERE username = ?")
          .get("admin") as { id: string; password_hash: string } | undefined; // Explicitly type the result
        if (!adminRow || !adminRow.password_hash) return;

        // Detect SHA-256 hex (64 hex chars)
        const isSha256Hex = /^[a-f0-9]{64}$/i.test(adminRow.password_hash);
        if (!isSha256Hex) return;

        const saltRounds = Number(process.env["BCRYPT_SALT_ROUNDS"]) || 12; // Removed '!' and added default
        const newHash = bcrypt.hashSync(adminDefault, saltRounds);

        db.prepare(
          "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
        ).run(newHash, this.getCurrentTimestamp(), adminRow.id);

        logger.info(
          "Legacy admin password rotated to bcrypt using ADMIN_DEFAULT_PASSWORD",
        );
      } finally {
        db.close();
      }
    } catch (err: unknown) {
      // Changed to unknown
      logger.warn("Error rotating legacy admin password", {
        error: err instanceof Error ? err.message : String(err),
      }); // Improved error logging
    }
  }

  /**
   * Récupère l'horodatage actuel au format ISO 8601
   */
  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }
  /**
   * Vérifie l'existence d'une colonne dans une table SQLite.
   */
  private columnExists(
    db: Database.Database,
    tableName: string,
    columnName: string,
  ): boolean {
    try {
      const result = db
        .prepare(`PRAGMA table_info(${tableName})`)
        .all() as Array<{ name: string }>;
      return result.some((col) => col.name === columnName);
    } catch (error: unknown) {
      // Changed to unknown
      logger.warn(
        `Error checking column existence for ${tableName}.${columnName}`,
        { error: error instanceof Error ? error.message : String(error) },
      ); // Improved logging
      return false;
    }
  }
}

// Export de l'instance singleton
export const initializationManager =
  DatabaseInitializationManagerImpl.getInstance();
=======
import "server-only";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { hashPasswordSync } from "../../utils/crypto";
import bcrypt from "bcrypt";

const noopLogger = { 
  info: (_message: string, _data?: Record<string, any>) => {}, 
  warn: (_message: string, _data?: Record<string, any>) => {}, 
  error: (_message: string, _data?: Record<string, any>) => {}, 
  debug: (_message: string, _data?: Record<string, any>) => {} 
};

// Vitest-safe: toujours utiliser un logger no-op pour éviter les erreurs de mock
const logger = noopLogger;

// État d'initialisation
export enum InitializationState {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
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
export class DatabaseInitializationManagerImpl
  implements DatabaseInitializationManager
{
  private static instance: DatabaseInitializationManagerImpl;
  private initializationState: InitializationState =
    InitializationState.NOT_STARTED;
  private initializationPromise: Promise<void> | null = null;
  private initializationError: Error | null = null;
  private dbPath: string;
  private readonly initializationMutex = new Set<string>(); // Pour éviter les initialisations multiples

  private constructor() {
    this.dbPath = path.join(process.cwd(), "data", "logistix.db");
    logger.info("DatabaseInitializationManager created", {
      dbPath: this.dbPath,
    });
  }

  /**
   * Récupère l'instance unique du gestionnaire d'initialisation
   */
  public static getInstance(): DatabaseInitializationManagerImpl {
    if (!DatabaseInitializationManagerImpl.instance) {
      DatabaseInitializationManagerImpl.instance =
        new DatabaseInitializationManagerImpl();
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
      const tables = db
        .prepare(
          `
        SELECT name FROM sqlite_master
        WHERE type='table' AND name IN ('users', 'parcelles', 'products', 'sessions')
      `,
        )
        .all() as { name: string }[]; // Explicitly type the result

      db.close();

      const hasRequiredTables = tables.length >= 4; // Check if at least 4 tables exist

      return hasRequiredTables;
    } catch (error: unknown) {
      // Changed to unknown
      logger.warn("Error checking schema existence", {
        error: error instanceof Error ? error.message : String(error),
      }); // Improved error logging
      return false;
    }
  }

  /**
   * S'assure que le répertoire des données existe
   */
  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      logger.info("Creating data directory", { dataDir });
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Configure les PRAGMA pour des performances et une fiabilité optimales
   */
  private configureDatabase(db: Database.Database): void {
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("cache_size = 10000");
    db.pragma("temp_store = memory");
    db.pragma("mmap_size = 268435456"); // 256MB
    db.pragma("busy_timeout = 30000"); // 30s timeout pour les verrous
  }

  /**
   * Initialise le schéma de la base de données
   */
  private initializeSchema(db: Database.Database): void {
    logger.info("Initializing database schema via consolidated migration file...");

    const migrationFile = path.join(process.cwd(), 'drizzle', 'migrations', '0000_complete_schema.sql');

    if (!fs.existsSync(migrationFile)) {
      logger.error('Migration file not found', { migrationFile });
      throw new Error(`Migration file not found: ${migrationFile}`);
    }

    const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');

    // Split statements and ignore comments/empty lines
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const transaction = db.transaction(() => {
      for (const stmt of statements) {
        const statement = stmt.trim();
        if (!statement) continue;

        try {
          // Guard for CREATE INDEX statements: ensure columns exist first
          const lower = statement.toLowerCase();
          if (lower.startsWith('create index') || lower.startsWith('create unique index')) {
            const m = /on\s+([`"]?)([a-z0-9_]+)\1\s*\(([^)]+)\)/i.exec(statement);
            if (m) {
              const table = m[2];
              const cols = m[3]!
                .split(',')
                .map(c => c.trim().replace(/[`"\s]+/g, ''))
                .map(c => c.replace(/\s+(desc|asc)\s*$/i, ''))
                .map(c => c.toLowerCase());

              let tableColumns: string[] = [];
              try {
                const rows = db.prepare(`PRAGMA table_info('${table}')`).all();
                tableColumns = rows.map((r: any) => String(r.name).toLowerCase());
              } catch (e) {
                logger.warn(`Table ${table} does not exist yet, skipping index: ${statement}`);
                continue;
              }

              const missing = cols.filter(c => !tableColumns.includes(c));
              if (missing.length > 0) {
                logger.info(`Skipping index on ${table}, missing columns: ${missing.join(', ')}`);
                continue;
              }
            }
          }

          db.prepare(statement).run();
        } catch (err: any) {
          // Ignore already exists errors because migration uses IF NOT EXISTS
          const msg = String(err?.message || err);
          if (msg.toLowerCase().includes('already exists')) {
            continue;
          }
          // Log and rethrow other errors
          logger.error('Error executing migration statement', { statement, error: msg });
          throw err;
        }
      }

      logger.info('Migration statements executed from file', { migrationFile, count: statements.length });
    });

    transaction();

    // Run existing upgrade helpers to ensure any programmatic upgrades are applied
    try {
      // Ensure produits/products table schema is up-to-date (tempsEnLigne and legacy columns used by statistics)
      this.upgradeProduitsSchema(db);
      logger.info('Post-migration schema upgrades applied');
    } catch (e: unknown) {
      logger.warn('Post-migration upgrades failed', { error: e instanceof Error ? e.message : String(e) });
    }

    // Création de l'utilisateur admin si aucun utilisateur n'existe
    this.createDefaultAdminUser(db);

    logger.info('Database schema initialization completed successfully (via migration file)');
  }

  /**
   * Crée un utilisateur administrateur par défaut si la table des utilisateurs est vide
   */
  private createDefaultAdminUser(db: Database.Database): void {
    type UserCountResult = { count: number };
    const userCount = db
      .prepare("SELECT COUNT(*) as count FROM users")
      .get() as UserCountResult; // Explicitly type the result

    if (userCount.count === 0) {
      logger.info("No users found, creating default administrator...");

      const adminPassword =
        process.env["ADMIN_DEFAULT_PASSWORD"] ||
        process.env["ADMIN_PASSWORD"] ||
        "admin123"; // Removed '!' as it can be null/undefined

      // Support a legacy fixed admin ID used by temporary session bypass in the codebase.
      // Allow override via ADMIN_ID env var for flexibility in CI/dev.
      const legacyAdminId = process.env["ADMIN_ID"] || 'baa65519-e92f-4010-a3c2-e9b5c67fb0d7';

      // Upsert pattern: if a user with legacyAdminId doesn't exist, insert it.
      const exists = db
        .prepare("SELECT 1 FROM users WHERE id = ? LIMIT 1")
        .get(legacyAdminId);

      if (!exists) {
        const insert = db.prepare(
          "INSERT INTO users (id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        );
        insert.run(
          legacyAdminId,
          "temp_admin",
          hashPasswordSync(adminPassword),
          this.getCurrentTimestamp(),
          this.getCurrentTimestamp(),
        );
        logger.info('Inserted legacy admin user to satisfy temporary session bypass', { legacyAdminId });
      } else {
        logger.info('Legacy admin user already present, skipping insert', { legacyAdminId });
      }

      logger.info("Default administrator user created successfully");
    } else {
      logger.info(
        "One or more users already exist, skipping default administrator creation",
      );
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
      logger.info("Previous initialization failed, retrying...");
      this.initializationState = InitializationState.NOT_STARTED;
      this.initializationError = null;
      this.initializationPromise = null;
    }

    // Vérifier si le schéma existe déjà
    if (await this.checkSchemaExists()) {
      logger.info("Database schema already exists, marking as initialized");
      // Upgrade existing schema to ensure required columns exist (brand_id, raw_data, expires_at)
      try {
        const db = new Database(this.dbPath);
        try {
          // Ensure produits/products table schema is up-to-date (tempsEnLigne and legacy columns used by statistics)
          this.upgradeProduitsSchema(db);
        } finally {
          db.close();
        }
      } catch (e: unknown) {
        // Changed to unknown
        logger.warn("Schema upgrade on existing database failed", {
          error: e instanceof Error ? e.message : String(e),
        }); // Improved error logging
      }

      // Avant de quitter, vérifier et migrer le mot de passe admin legacy si nécessaire
      try {
        await this.rotateLegacyAdminIfNeeded();
      } catch (err: unknown) {
        // Changed to unknown
        logger.warn("Error during legacy admin rotation check", {
          error: err instanceof Error ? err.message : String(err),
        }); // Improved error logging
      }

      this.initializationState = InitializationState.COMPLETED;
      return;
    }

    // Démarrer l'initialisation
    this.initializationState = InitializationState.IN_PROGRESS;
    const initializationId = randomUUID();
    this.initializationMutex.add(initializationId);

    logger.info("Starting database initialization", { initializationId });

    this.initializationPromise = this.performInitialization();

    try {
      await this.initializationPromise;
      this.initializationState = InitializationState.COMPLETED;
      logger.info("Database initialization completed successfully", {
        initializationId,
      });
    } catch (error: unknown) {
      // Changed to unknown
      this.initializationState = InitializationState.FAILED;
      this.initializationError =
        error instanceof Error ? error : new Error(String(error)); // Ensure Error object
      logger.error("Database initialization failed", {
        initializationId,
        error: this.initializationError.message,
      }); // Log error message
      throw error;
    } finally {
      this.initializationMutex.delete(initializationId);
    }
  }

  /**
   * Assure la présence des colonnes attendues dans la table `produits`.
   * - Ajoute `tempsEnLigne` si manquante
   * - Si une colonne legacy `dateMiseEnLigne` existe, copie ses valeurs dans `tempsEnLigne`
   */
  private upgradeProduitsSchema(db: Database.Database): void {
    try {
      // Work with both legacy 'produits' and normalized 'products' tables.
      const tablesToCheck = ["produits", "products"];

      for (const tbl of tablesToCheck) {
        const hasTemps = this.columnExists(db, tbl, "tempsEnLigne");
        const hasDateMise = this.columnExists(db, tbl, "dateMiseEnLigne");

        if (!hasTemps) {
          try {
            db.exec(`ALTER TABLE ${tbl} ADD COLUMN tempsEnLigne TEXT;`);
            logger.info(`Added column 'tempsEnLigne' to '${tbl}' table`);

            if (hasDateMise) {
              try {
                db.exec(
                  `UPDATE ${tbl} SET tempsEnLigne = dateMiseEnLigne WHERE dateMiseEnLigne IS NOT NULL;`,
                );
                logger.info(
                  `Migrated existing 'dateMiseEnLigne' values into 'tempsEnLigne' for table ${tbl}`,
                );
              } catch (e: unknown) {
                logger.warn(
                  `Failed to migrate dateMiseEnLigne -> tempsEnLigne for ${tbl}`,
                  { error: e instanceof Error ? e.message : String(e) },
                );
              }
            }
          } catch (e: unknown) {
            logger.warn(`Failed to add tempsEnLigne to ${tbl}`, {
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }
      }
    } catch (e: unknown) {
      logger.warn("upgradeProduitsSchema failed", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }


  /**
   * Effectue l'initialisation réelle de la base de données
   */
  private async performInitialization(): Promise<void> {
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

    if (
      this.initializationState === InitializationState.FAILED &&
      this.initializationError
    ) {
      throw this.initializationError;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    if (
      this.initializationState === InitializationState.FAILED &&
      this.initializationError
    ) {
      throw this.initializationError;
    }
  }

  /**
   * Marque l'initialisation comme terminée (pour les cas où l'initialisation est faite externement)
   */
  public markAsInitialized(): void {
    if (this.initializationState !== InitializationState.COMPLETED) {
      logger.info("Marking database as initialized externally");
      this.initializationState = InitializationState.COMPLETED;
      this.initializationError = null;
    }
  }

  /**
   * Remet à zéro l'état d'initialisation (pour les tests ou la réinitialisation)
   */
  public reset(): void {
    logger.info("Resetting initialization state");
    this.initializationState = InitializationState.NOT_STARTED;
    this.initializationError = null;
    this.initializationPromise = null;
    this.initializationMutex.clear();
  }

  /**
   * Génère un identifiant unique universel (UUID)
   */
  // generateId was previously defined here but the project uses shared generateId utilities
  // to avoid duplicate implementations. Remove the private one to satisfy linter.

  /**
   * Rotate legacy admin password (SHA-256) to bcrypt using ADMIN_DEFAULT_PASSWORD if provided.
   * This runs during initialization checks and is safe to call multiple times.
   */
  private async rotateLegacyAdminIfNeeded(): Promise<void> {
    try {
      const adminDefault =
        process.env["ADMIN_DEFAULT_PASSWORD"] ||
        process.env["ADMIN_PASSWORD"] ||
        null;
      if (!adminDefault) {
        // Nothing to do without a provided default password
        return;
      }

      const db = new Database(this.dbPath);
      try {
        const adminRow = db
          .prepare("SELECT id, password_hash FROM users WHERE username = ?")
          .get("admin") as { id: string; password_hash: string } | undefined; // Explicitly type the result
        if (!adminRow || !adminRow.password_hash) return;

        // Detect SHA-256 hex (64 hex chars)
        const isSha256Hex = /^[a-f0-9]{64}$/i.test(adminRow.password_hash);
        if (!isSha256Hex) return;

        const saltRounds = Number(process.env["BCRYPT_SALT_ROUNDS"]) || 12; // Removed '!' and added default
        const newHash = bcrypt.hashSync(adminDefault, saltRounds);

        db.prepare(
          "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
        ).run(newHash, this.getCurrentTimestamp(), adminRow.id);

        logger.info(
          "Legacy admin password rotated to bcrypt using ADMIN_DEFAULT_PASSWORD",
        );
      } finally {
        db.close();
      }
    } catch (err: unknown) {
      // Changed to unknown
      logger.warn("Error rotating legacy admin password", {
        error: err instanceof Error ? err.message : String(err),
      }); // Improved error logging
    }
  }

  /**
   * Récupère l'horodatage actuel au format ISO 8601
   */
  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }
  /**
   * Vérifie l'existence d'une colonne dans une table SQLite.
   */
  private columnExists(
    db: Database.Database,
    tableName: string,
    columnName: string,
  ): boolean {
    try {
      const result = db
        .prepare(`PRAGMA table_info(${tableName})`)
        .all() as Array<{ name: string }>;
      return result.some((col) => col.name === columnName);
    } catch (error: unknown) {
      // Changed to unknown
      logger.warn(
        `Error checking column existence for ${tableName}.${columnName}`,
        { error: error instanceof Error ? error.message : String(error) },
      ); // Improved logging
      return false;
    }
  }
}

// Export de l'instance singleton
export const initializationManager =
  DatabaseInitializationManagerImpl.getInstance();
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
