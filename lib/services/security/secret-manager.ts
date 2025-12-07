import { nanoid } from "nanoid";
import { databaseService } from "@/lib/services/database/db";
import { logger } from "@/lib/utils/logging/logger";

type SecretSchemaMode = "modern" | "legacy" | "absent";

interface SchemaDetectionResult {
  mode: SecretSchemaMode;
  legacyKeyColumn?: "key" | "_key";
}

interface ModernSecretRow {
  id: string;
  name: string;
  value: string;
  is_active?: number | null;
}

interface LegacySecretRow {
  id: string;
  secret_value: string | null;
}

export class SecretManager {
  private static instance: SecretManager | null = null;
  private secrets: Map<string, string> = new Map();
  private initialized = false;
  private schemaInfo: SchemaDetectionResult = { mode: "absent" };

  private constructor() {}

  public static getInstance(): SecretManager {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager();
    }
    return SecretManager.instance;
  }

  public static resetForTesting(): void {
    if ((process.env as any)["NODE_ENV"] !== "test") {
      return;
    }
    SecretManager.instance = null;
  }

  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.schemaInfo = await this.detectSchema();

    if (this.schemaInfo.mode === "modern") {
      await this.loadModernSecrets();
    } else if (this.schemaInfo.mode === "legacy") {
      await this.loadLegacySecrets();
    } else {
      logger.warn("[SecretManager] Table app_secrets introuvable, aucun secret chargé.");
    }

    this.initialized = true;
  }

  public getSecret(name: string): string | undefined {
    return this.secrets.get(name);
  }

  public async setSecret(name: string, value: string): Promise<void> {
    await this.init();
    const now = new Date().toISOString();

    if (this.schemaInfo.mode === "legacy") {
      await this.upsertLegacySecret(value, now);
      this.secrets.set("ai_api_key", value);
      this.secrets.set("default", value);
      return;
    }

    if (this.schemaInfo.mode === "absent") {
      await this.ensureModernTableExists();
      this.schemaInfo = { mode: "modern" };
    }

    await this.upsertModernSecret(name, value, now);
    this.secrets.set(name, value);
  }

  private async detectSchema(): Promise<SchemaDetectionResult> {
    try {
      const table = await databaseService.queryOne<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='app_secrets' LIMIT 1",
        [],
        "secret-manager-detect-table",
      );

      if (!table) {
        return { mode: "absent" };
      }

      const columns = await databaseService.query<{ name: string }>(
        "PRAGMA table_info(app_secrets)",
        [],
        "secret-manager-detect-columns",
      );

      const normalized = columns.map((column) => column.name.toLowerCase());
      const hasName = normalized.includes("name");
      const hasValue = normalized.includes("value");
      const hasKey = normalized.includes("key");
      const hasUnderscoreKey = normalized.includes("_key");

      if (hasName && hasValue) {
        return { mode: "modern" };
      }

      if (hasKey || hasUnderscoreKey) {
        return { mode: "legacy", legacyKeyColumn: hasKey ? "key" : "_key" };
      }

      return { mode: "modern" };
    } catch (error) {
      logger.warn("[SecretManager] Impossible de détecter le schéma des secrets", { error });
      return { mode: "absent" };
    }
  }

  private async loadModernSecrets(): Promise<void> {
    try {
      const rows = await databaseService.query<ModernSecretRow>(
        "SELECT id, name, value, is_active FROM app_secrets",
        [],
        "secret-manager-load-modern",
      );

      for (const row of rows) {
        if (row.value != null && row.name) {
          if (row.is_active === 0) continue;
          this.secrets.set(row.name, row.value);
        }
      }
    } catch (error) {
      logger.error("[SecretManager] Échec du chargement des secrets (modern)", {
        error,
      });
    }
  }

  private async loadLegacySecrets(): Promise<void> {
    const column = this.schemaInfo.legacyKeyColumn ?? "key";
    try {
      const rows = await databaseService.query<LegacySecretRow>(
        `SELECT id, ${column} as secret_value FROM app_secrets`,
        [],
        "secret-manager-load-legacy",
      );

      for (const row of rows) {
        if (!row.secret_value) continue;
        this.secrets.set("ai_api_key", row.secret_value);
        this.secrets.set("default", row.secret_value);
      }
    } catch (error) {
      logger.error("[SecretManager] Échec du chargement des secrets legacy", {
        error,
      });
    }
  }

  private async ensureModernTableExists(): Promise<void> {
    await databaseService.execute(
      `CREATE TABLE IF NOT EXISTS app_secrets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        is_active INTEGER DEFAULT 1 NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        revoked_at TEXT
      )`,
      [],
      "secret-manager-create-table",
    );
  }

  private async upsertLegacySecret(value: string, timestamp: string): Promise<void> {
    const column = this.schemaInfo.legacyKeyColumn ?? "key";

    const existing = await databaseService.queryOne<{ id: string }>(
      "SELECT id FROM app_secrets LIMIT 1",
      [],
      "secret-manager-legacy-select",
    );

    if (existing?.id) {
      await databaseService.execute(
        `UPDATE app_secrets SET ${column} = ?, is_active = 1 WHERE id = ?`,
        [value, existing.id],
        "secret-manager-legacy-update",
      );
      return;
    }

    await databaseService.execute(
      `INSERT INTO app_secrets (id, ${column}, is_active, created_at) VALUES (?, ?, 1, ?)`,
      [nanoid(), value, timestamp],
      "secret-manager-legacy-insert",
    );
  }

  private async upsertModernSecret(
    name: string,
    value: string,
    timestamp: string,
  ): Promise<void> {
    const existing = await databaseService.queryOne<{ id: string }>(
      "SELECT id FROM app_secrets WHERE name = ?",
      [name],
      "secret-manager-modern-select",
    );

    if (existing?.id) {
      await databaseService.execute(
        "UPDATE app_secrets SET value = ?, updated_at = ?, is_active = 1 WHERE id = ?",
        [value, timestamp, existing.id],
        "secret-manager-modern-update",
      );
      return;
    }

    await databaseService.execute(
      "INSERT INTO app_secrets (id, name, value, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
      [nanoid(), name, value, timestamp, timestamp],
      "secret-manager-modern-insert",
    );
  }
}

export const secretManager = SecretManager.getInstance();
