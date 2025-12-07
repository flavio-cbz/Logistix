import { BaseRepository } from "./base-repository";
import { integrationCredentials } from "@/lib/database/schema";
import { DatabaseService } from "@/lib/database";
import { eq, and } from "drizzle-orm";

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
    data: { credentials?: Record<string, any>; cookies?: any[] }
  ) {
    return this.executeCustomQuery(async (db) => {
      const existing = await this.findByProvider(userId, provider);

      if (existing) {
        return await db
          .update(integrationCredentials)
          .set({
            ...data,
            lastUsedAt: new Date().toISOString(),
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
            ...data,
            lastUsedAt: new Date().toISOString(),
          })
          .returning();
      }
    });
  }
}
