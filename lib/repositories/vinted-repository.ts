import { BaseRepository } from "./base-repository";
import { vintedSessions, type VintedSession, type NewVintedSession } from "../database/schema";
import { databaseService } from "../database/database-service";
import { eq } from "drizzle-orm";

/**
 * Repository for Vinted session management
 */
export class VintedRepository extends BaseRepository<
  typeof vintedSessions,
  VintedSession,
  NewVintedSession
> {
  constructor() {
    super(vintedSessions, databaseService, {
      tableName: "vinted_sessions",
    });
  }

  /**
   * Find session by user ID
   */
  async findByUserId(userId: string): Promise<VintedSession | null> {
    return this.executeCustomQuery(async (db) => {
      const result = db
        .select()
        .from(vintedSessions)
        .where(eq(vintedSessions.userId, userId))
        .get();
      return result || null;
    }, "VintedRepository.findByUserId");
  }

  /**
   * Delete session by user ID
   */
  async deleteByUserId(userId: string): Promise<boolean> {
    return this.executeCustomQuery(async (db) => {
      const result = db
        .delete(vintedSessions)
        .where(eq(vintedSessions.userId, userId))
        .returning()
        .get();
      return !!result;
    }, "VintedRepository.deleteByUserId");
  }
}

export const vintedRepository = new VintedRepository();
