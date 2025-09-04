import { db, DbType } from "../database/drizzle-client";
import { appSecrets } from "../database/drizzle-schema";
import { nanoid } from "nanoid";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { eq } from "drizzle-orm"; // Import 'eq'

type SecretRowNew = { id: string; name: string; value: string };
type SecretRowLegacy = { id: string; key: string };

export class SecretManager {
  private static instance: SecretManager;
  private secrets: Map<string, string> = new Map();
  private initialized = false;
  private legacyMode: boolean | null = null;
  private dbPath = path.join(process.cwd(), "data", "logistix.db");

  private constructor() {}

  public static getInstance(): SecretManager {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager();
    }
    return SecretManager.instance;
  }

  // Detecte le schéma réel de la table app_secrets (nouveau: name/value, legacy: key)
  private detectSchema(): { exists: boolean; legacy: boolean } {
    if (!fs.existsSync(this.dbPath)) {
      return { exists: false, legacy: false };
    }
    const sqlite = new Database(this.dbPath, { readonly: true });
    try {
      const rows = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_secrets'").all();
      if (rows.length === 0) return { exists: false, legacy: false };
      const pragma = sqlite.prepare("PRAGMA table_info(app_secrets)").all();
      const cols = pragma.map((c: any) => String(c.name).toLowerCase());
      const hasKey = cols.includes("key");
      const hasName = cols.includes("name") && cols.includes("value");
      return { exists: true, legacy: hasKey && !hasName };
    } finally {
      try { sqlite.close(); } catch {}
    }
  }

  // Chargement des secrets, compatible nouveau et legacy
  public async init() {
    if (this.initialized) return;

    // Première tentative : utiliser l'ORM Drizzle (cas schéma récent)
    try {
      const typedDb = db as DbType; // Cast db to the correct type
      const rows = await typedDb.query.appSecrets.findMany();
      if (rows && rows.length > 0) {
        // Si les lignes ont name/value, on utilise ce mapping
        const first = rows[0]! as any;
        if ("name" in first && "value" in first) {
          for (const r of rows as unknown as SecretRowNew[]) {
            this.secrets.set(r.name, r.value);
          }
          this.legacyMode = false;
          this.initialized = true;
          return;
        }
      }
    } catch (err) {
      // ORM peut échouer si le schéma n'est pas celui attendu — on tombera en fallback sqlite
    }

    // Fallback direct SQLite pour supporter l'ancien schéma
    const schema = this.detectSchema();
    if (!schema.exists) {
      // Pas de table app_secrets — rien à charger
      this.legacyMode = null;
      this.initialized = true;
      return;
    }

    this.legacyMode = schema.legacy;
    const sqlite = new Database(this.dbPath, { readonly: true });
    try {
      if (this.legacyMode) {
        // Ancien schéma : colonne "key"
        const rows = sqlite.prepare("SELECT id, key FROM app_secrets").all() as SecretRowLegacy[];
        for (const r of rows) {
          // On expose la valeur legacy sous plusieurs clefs pour compatibilité :
          // - "ai_api_key" (utilisé auparavant par getKey)
          // - "default" (accès générique)
          this.secrets.set("ai_api_key", r.key);
          this.secrets.set("default", r.key);
        }
      } else {
        // Nouveau schéma : name/value
        const rows = sqlite.prepare("SELECT id, name, value FROM app_secrets").all() as SecretRowNew[];
        for (const r of rows) {
          this.secrets.set(r.name, r.value);
        }
      }
    } finally {
      try { sqlite.close(); } catch {}
    }

    this.initialized = true;
  }

  public getSecret(name: string): string | undefined {
    return this.secrets.get(name);
  }

  // Persist the secret in DB according to detected schema (or create table row if missing)
  public async setSecret(name: string, value: string) {
    const now = new Date().toISOString();

    // Ensure we know schema (init will auto-detect)
    await this.init();

    // If we detected legacy mode, write to legacy table structure (column "key")
    if (this.legacyMode === true) {
      // Use direct sqlite to update or insert a legacy key
      const sqlite = new Database(this.dbPath);
      try {
        const exists = sqlite.prepare("SELECT id FROM app_secrets LIMIT 1").get() as any | undefined;
        if (exists && exists.id) {
          // update the first row's key — legacy table didn't have named secrets,
          // so we overwrite the single stored key with the new value.
          sqlite.prepare("UPDATE app_secrets SET key = ?, is_active = 1 WHERE id = ?").run(value, exists.id);
        } else {
          const id = nanoid();
          sqlite.prepare("INSERT INTO app_secrets (id, _key, is_active, created_at) VALUES (?, ?, 1, ?)").run(id, value, now);
        }
      } finally {
        try { sqlite.close(); } catch {}
      }
      // keep in-memory map updated
      this.secrets.set("ai_api_key", value);
      this.secrets.set("default", value);
      return;
    }

    // If legacyMode is null (table absent), attempt to insert using Drizzle (new schema)
    if (this.legacyMode === null) {
      // Try to insert into new schema; if table missing, create minimal row via sqlite
      try {
        // try to find existing by name
        const typedDb = db as DbType; // Cast db to the correct type
        const existing = await typedDb.query.appSecrets.findFirst({ where: eq(appSecrets.name, name) });
        if (existing) {
          await db.update(appSecrets).set({ value, updatedAt: now }).where(eq(appSecrets.name, name));
        } else {
          await db.insert(appSecrets).values({
            id: nanoid(),
            name,
            value,
            isActive: 1,
            createdAt: now,
            updatedAt: now,
          });
        }
        this.secrets.set(name, value);
        return;
      } catch (err) {
        // If insertion fails because table does not exist, fallback to sqlite create/insert
        const sqlite = new Database(this.dbPath);
        try {
          // Create a minimal app_secrets table (best-effort) — prefer to fail loudly normally,
          // but here we create a simple table to allow runtime operations.
          sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS app_secrets (
              id TEXT PRIMARY KEY,
              name TEXT,
              value TEXT,
              is_active INTEGER DEFAULT 1,
              created_at TEXT,
              updated_at TEXT,
              revoked_at TEXT
            )
          `).run();
          const id = nanoid();
          sqlite.prepare("INSERT INTO app_secrets (id, name, value, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)").run(id, name, value, now, now);
        } finally {
          try { sqlite.close(); } catch {}
        }
        this.secrets.set(name, value);
        return;
      }
    }

    // Normal path: new schema detected
    try {
      const typedDb = db as DbType; // Cast db to the correct type
      const existing = await typedDb.query.appSecrets.findFirst({ where: eq(appSecrets.name, name) });
      if (existing) {
        await db.update(appSecrets).set({ value, updatedAt: now }).where(eq(appSecrets.name, name));
      } else {
        await db.insert(appSecrets).values({
          id: nanoid(),
          name,
          value,
          isActive: 1,
          createdAt: now,
          updatedAt: now,
        });
      }
      this.secrets.set(name, value);
    } catch (err) {
      // As a last resort, fallback to sqlite raw operations
      const sqlite = new Database(this.dbPath);
      try {
        const exists = sqlite.prepare("SELECT id FROM app_secrets WHERE name = ?").get(name) as any | undefined;
        if (exists && exists.id) {
          sqlite.prepare("UPDATE app_secrets SET value = ?, updated_at = ? WHERE id = ?").run(value, now, exists.id);
        } else {
          const id = nanoid();
          sqlite.prepare("INSERT INTO app_secrets (id, name, value, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)").run(id, name, value, now, now);
        }
      } finally {
        try { sqlite.close(); } catch {}
      }
      this.secrets.set(name, value);
    }
  }
}

export const secretManager = SecretManager.getInstance();