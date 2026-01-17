import { BaseRepository } from "./base-repository";
import { integrationCredentials, type IntegrationCredentials } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";
import { DatabaseService } from "@/lib/database";

export class IntegrationRepository extends BaseRepository<typeof integrationCredentials> {
  constructor(databaseService: DatabaseService) {
    super(integrationCredentials, databaseService, { tableName: "integration_credentials" });
  }

  async findByProvider(userId: string, provider: string) {
    return this.executeCustomQuery(async (db) => {
      const result = await db
        .select()
        .from(integrationCredentials)
        .where(
          and(
            eq(integrationCredentials.userId, userId),
            eq(integrationCredentials.provider, provider)
          )
        )
        .limit(1);

      return result[0] || null;
    });
  }

  async saveCredentials(
    userId: string,
    provider: string,
    data: { credentials?: Record<string, unknown>; cookies?: unknown[] }
  ) {
    return this.executeCustomQuery(async (db) => {
      const existing = await this.findByProvider(userId, provider);

      // Safe cast for credentials to match schema constraint
      const safeCredentials = data.credentials
        ? (data.credentials as unknown as IntegrationCredentials)
        : undefined;

      const safeCookies = data.cookies as unknown[] | undefined;

      if (existing) {
        return await db
          .update(integrationCredentials)
          .set({
            credentials: safeCredentials,
            cookies: safeCookies,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(integrationCredentials.id, existing.id))
          .returning();
      } else {
        return await db
          .insert(integrationCredentials)
          .values({
            userId,
            provider,
            credentials: safeCredentials,
            cookies: safeCookies,
            lastUsedAt: new Date().toISOString(),
          })
          .returning();
      }
    });
  }
}

