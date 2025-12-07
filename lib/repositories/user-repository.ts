<<<<<<< HEAD
import { eq, and, sql, desc } from "drizzle-orm";
import {
  BaseRepository,
  FilterOptions,
  buildTextSearch,
  combineConditions,
} from "./base-repository";
import { DatabaseService } from "@/lib/database";
import { users, User, NewUser } from "@/lib/database/schema";

// ============================================================================
// USER REPOSITORY
// ============================================================================
// Specialized repository for user management operations

export interface UserFilterOptions extends FilterOptions {
  username?: string;
  email?: string;
  searchTerm?: string;
}

export class UserRepository extends BaseRepository<
  typeof users,
  User,
  NewUser
> {
  constructor(databaseService: DatabaseService) {
    super(users, databaseService, {
      enableLogging: process.env['NODE_ENV'] === "development",
      defaultLimit: 50,
      maxLimit: 500,
      tableName: "users",
    });
  }

  /**
   * Find user by username
   */
  public async findByUsername(username: string): Promise<User | null> {
    try {
      return await this.executeCustomQuery((_db) => {
        const result = _db
          .select()
          .from(this.table)
          .where(eq(this.table.username, username))
          .get();
        return (result as User | undefined) || null;
      }, "findByUsername");
    } catch (error) {
      this.logError("findByUsername failed", error, { username });
      throw error;
    }
  }

  /**
   * Find user by email
   */
  public async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.executeCustomQuery((_db) => {
        const result = _db
          .select()
          .from(this.table)
          .where(eq(this.table.email, email))
          .get();
        return (result as User | undefined) || null;
      }, "findByEmail");
    } catch (error) {
      this.logError("findByEmail failed", error, { email });
      throw error;
    }
  }

  /**
   * Check if username exists
   */
  public async usernameExists(
    username: string,
    excludeId?: string,
  ): Promise<boolean> {
    try {
      return await this.executeCustomQuery((_db) => {
        let query: any = _db
          .select({ id: this.table.id })
          .from(this.table)
          .where(eq(this.table.username, username));

        if (excludeId) {
          query = (query as any).where(
            and(
              eq(this.table.username, username),
              sql`${this.table.id} != ${excludeId}`,
            ),
          );
        }
        const result = (query as any).get();
        return result !== undefined;
      }, "usernameExists");
    } catch (error) {
      this.logError("usernameExists failed", error, { username, excludeId });
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  public async emailExists(
    email: string,
    excludeId?: string,
  ): Promise<boolean> {
    try {
      return await this.executeCustomQuery((_db) => {
        let whereClause: any = eq(this.table.email, email);

        if (excludeId) {
          whereClause = and(
            eq(this.table.email, email),
            sql`${this.table.id} != ${excludeId}`,
          );
        }

        const result = _db
          .select({ id: this.table.id })
          .from(this.table)
          .where(whereClause)
          .get();

        return result !== undefined;
      }, "emailExists");
    } catch (error) {
      this.logError("emailExists failed", error, { email, excludeId });
      throw error;
    }
  }

  /**
   * Find users with advanced filtering
   */
  public async findUsers(options: UserFilterOptions = {}): Promise<User[]> {
    try {
      return await this.executeCustomQuery((_db) => {
        const conditions: any[] = [];

        // Username filter
        if (options.username) {
          conditions.push(eq(this.table.username, options.username));
        }

        // Email filter
        if (options.email) {
          conditions.push(eq(this.table.email, options.email));
        }

        // Search term (searches username, email, bio)
        if (options.searchTerm) {
          const searchConditions = [
            buildTextSearch(this.table.username, options.searchTerm),
            buildTextSearch(this.table.email, options.searchTerm),
            buildTextSearch(this.table.bio, options.searchTerm),
          ];
          conditions.push(sql`(${searchConditions.join(" OR ")})`);
        }

        // Combine with existing where clause
        const whereClause = combineConditions(options.where, ...conditions);

        return this.findAll({
          ...options,
          where: whereClause,
        });
      }, "findUsers");
    } catch (error) {
      this.logError("findUsers failed", error, { options });
      throw error;
    }
  }

  /**
   * Update user password
   */
  public async updatePassword(
    id: string,
    passwordHash: string,
  ): Promise<User | null> {
    try {
      return await this.executeCustomQuery((_db) => {
        const result = _db
          .update(this.table)
          .set({
            passwordHash,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(this.table.id, id))
          .returning()
          .get();

        return (result as User | undefined) || null;
      }, "updatePassword");
    } catch (error) {
      this.logError("updatePassword failed", error, { id });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  public async updateProfile(
    id: string,
    profile: Partial<
      Pick<User, "username" | "email" | "bio" | "avatar" | "language" | "theme">
    >,
  ): Promise<User | null> {
    try {
      return await this.executeCustomQuery((_db) => {
        const result = _db
          .update(this.table)
          .set({
            ...profile,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(this.table.id, id))
          .returning()
          .get();

        return (result as User | undefined) || null;
      }, "updateProfile");
    } catch (error) {
      this.logError("updateProfile failed", error, { id, profile });
      throw error;
    }
  }

  /**
   * Update user AI configuration
   */
  public async updateAiConfig(id: string, aiConfig: any): Promise<User | null> {
    try {
      return await this.executeCustomQuery((_db) => {
        const result = _db
          .update(this.table)
          .set({
            aiConfig,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(this.table.id, id))
          .returning()
          .get();

        return (result as User | undefined) || null;
      }, "updateAiConfig");
    } catch (error) {
      this.logError("updateAiConfig failed", error, { id });
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  public async getUserStats(id: string): Promise<{
    totalProducts: number;
    totalParcelles: number;
    totalAnalyses: number;
    joinedDate: string;
  } | null> {
    try {
      return await this.executeCustomQuery((_db) => {
        // First check if user exists
        const user = _db
          .select({ createdAt: this.table.createdAt })
          .from(this.table)
          .where(eq(this.table.id, id))
          .get();

        if (!user) return null;

        // Get counts from related tables
        const productCount = _db
          .select({ count: sql`COUNT(*)` })
          .from(_db.select().from(this.table).as("products"))
          .where(sql`user_id = ${id}`)
          .get();

        const parcelleCount = _db
          .select({ count: sql`COUNT(*)` })
          .from(_db.select().from(this.table).as("parcelles"))
          .where(sql`user_id = ${id}`)
          .get();

        const analysisCount = _db
          .select({ count: sql`COUNT(*)` })
          .from(_db.select().from(this.table).as("market_analyses"))
          .where(sql`user_id = ${id}`)
          .get();

        return {
          totalProducts: Number(productCount?.count || 0),
          totalParcelles: Number(parcelleCount?.count || 0),
          totalAnalyses: Number(analysisCount?.count || 0),
          joinedDate: user.createdAt,
        };
      }, "getUserStats");
    } catch (error) {
      this.logError("getUserStats failed", error, { id });
      throw error;
    }
  }

  /**
   * Soft delete user (mark as inactive rather than hard delete)
   */
  public async deactivateUser(id: string): Promise<boolean> {
    try {
      return await this.executeCustomQuery((db) => {
        // Update user to mark as deactivated
        const result = db
          .update(this.table)
          .set({
            // You might want to add an 'active' or 'status' field to the schema
            updatedAt: new Date().toISOString(),
            // For now, we'll clear sensitive data
            email: null,
            encryptionSecret: null,
          })
          .where(eq(this.table.id, id))
          .returning()
          .get();

        return result !== undefined;
      }, "deactivateUser");
    } catch (error) {
      this.logError("deactivateUser failed", error, { id });
      throw error;
    }
  }
  /**
   * Get user suggestions for search
   */
  public async getUserSuggestions(query: string): Promise<{ nom: string; count: number }[]> {
    try {
      return await this.executeCustomQuery((db) => {
        const results = db
          .select({
            nom: this.table.username,
            count: sql<number>`COUNT(*)`,
          })
          .from(this.table)
          .where(sql`${this.table.username} LIKE ${`%${query}%`}`)
          .groupBy(this.table.username)
          .orderBy(desc(sql`COUNT(*)`))
          .limit(5)
          .all();

        return results.map((r) => ({
          nom: r.nom,
          count: Number(r.count),
        }));
      }, "getUserSuggestions");
    } catch (error) {
      this.logError("getUserSuggestions failed", error, { query });
      return [];
    }
  }
}
=======
import { eq, and, sql } from "drizzle-orm";
import {
  BaseRepository,
  FilterOptions,
  buildTextSearch,
  combineConditions,
} from "./base-repository";
import { DatabaseService } from "@/lib/database";
import { users, User, NewUser } from "@/lib/database/schema";

// ============================================================================
// USER REPOSITORY
// ============================================================================
// Specialized repository for user management operations

export interface UserFilterOptions extends FilterOptions {
  username?: string;
  email?: string;
  searchTerm?: string;
}

export class UserRepository extends BaseRepository<
  typeof users,
  User,
  NewUser
> {
  constructor(databaseService: DatabaseService) {
    super(users, databaseService, {
  enableLogging: process.env['NODE_ENV'] === "development",
      defaultLimit: 50,
      maxLimit: 500,
      tableName: "users",
    });
  }

  /**
   * Find user by username
   */
  public async findByUsername(username: string): Promise<User | null> {
    try {
      return await this.executeCustomQuery((_db) => {
        const result = _db
          .select()
          .from(this.table)
          .where(eq(this.table.username, username))
          .get();
        return (result as User | undefined) || null;
      }, "findByUsername");
    } catch (error) {
      this.logError("findByUsername failed", error, { username });
      throw error;
    }
  }

  /**
   * Find user by email
   */
  public async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.executeCustomQuery((_db) => {
        const result = _db
          .select()
          .from(this.table)
          .where(eq(this.table.email, email))
          .get();
        return (result as User | undefined) || null;
      }, "findByEmail");
    } catch (error) {
      this.logError("findByEmail failed", error, { email });
      throw error;
    }
  }

  /**
   * Check if username exists
   */
  public async usernameExists(
    username: string,
    excludeId?: string,
  ): Promise<boolean> {
    try {
      return await this.executeCustomQuery((_db) => {
        let query: any = _db
          .select({ id: this.table.id })
          .from(this.table)
          .where(eq(this.table.username, username));

        if (excludeId) {
          query = (query as any).where(
            and(
              eq(this.table.username, username),
              sql`${this.table.id} != ${excludeId}`,
            ),
          );
        }
        const result = (query as any).get();
        return result !== undefined;
      }, "usernameExists");
    } catch (error) {
      this.logError("usernameExists failed", error, { username, excludeId });
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  public async emailExists(
    email: string,
    excludeId?: string,
  ): Promise<boolean> {
    try {
      return await this.executeCustomQuery((_db) => {
        let whereClause: any = eq(this.table.email, email);

        if (excludeId) {
          whereClause = and(
            eq(this.table.email, email),
            sql`${this.table.id} != ${excludeId}`,
          );
        }

        const result = _db
          .select({ id: this.table.id })
          .from(this.table)
          .where(whereClause)
          .get();

        return result !== undefined;
      }, "emailExists");
    } catch (error) {
      this.logError("emailExists failed", error, { email, excludeId });
      throw error;
    }
  }

  /**
   * Find users with advanced filtering
   */
  public async findUsers(options: UserFilterOptions = {}): Promise<User[]> {
    try {
      return await this.executeCustomQuery((_db) => {
        const conditions: any[] = [];

        // Username filter
        if (options.username) {
          conditions.push(eq(this.table.username, options.username));
        }

        // Email filter
        if (options.email) {
          conditions.push(eq(this.table.email, options.email));
        }

        // Search term (searches username, email, bio)
        if (options.searchTerm) {
          const searchConditions = [
            buildTextSearch(this.table.username, options.searchTerm),
            buildTextSearch(this.table.email, options.searchTerm),
            buildTextSearch(this.table.bio, options.searchTerm),
          ];
          conditions.push(sql`(${searchConditions.join(" OR ")})`);
        }

        // Combine with existing where clause
        const whereClause = combineConditions(options.where, ...conditions);

        return this.findAll({
          ...options,
          where: whereClause,
        });
      }, "findUsers");
    } catch (error) {
      this.logError("findUsers failed", error, { options });
      throw error;
    }
  }

  /**
   * Update user password
   */
  public async updatePassword(
    id: string,
    passwordHash: string,
  ): Promise<User | null> {
    try {
      return await this.executeCustomQuery((_db) => {
        const result = _db
          .update(this.table)
          .set({
            passwordHash,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(this.table.id, id))
          .returning()
          .get();

        return (result as User | undefined) || null;
      }, "updatePassword");
    } catch (error) {
      this.logError("updatePassword failed", error, { id });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  public async updateProfile(
    id: string,
    profile: Partial<
      Pick<User, "email" | "bio" | "avatar" | "language" | "theme">
    >,
  ): Promise<User | null> {
    try {
      return await this.executeCustomQuery((_db) => {
        const result = _db
          .update(this.table)
          .set({
            ...profile,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(this.table.id, id))
          .returning()
          .get();

        return (result as User | undefined) || null;
      }, "updateProfile");
    } catch (error) {
      this.logError("updateProfile failed", error, { id, profile });
      throw error;
    }
  }

  /**
   * Update user AI configuration
   */
  public async updateAiConfig(id: string, aiConfig: any): Promise<User | null> {
    try {
      return await this.executeCustomQuery((_db) => {
        const result = _db
          .update(this.table)
          .set({
            aiConfig,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(this.table.id, id))
          .returning()
          .get();

        return (result as User | undefined) || null;
      }, "updateAiConfig");
    } catch (error) {
      this.logError("updateAiConfig failed", error, { id });
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  public async getUserStats(id: string): Promise<{
    totalProducts: number;
    totalParcelles: number;
    totalAnalyses: number;
    joinedDate: string;
  } | null> {
    try {
      return await this.executeCustomQuery((_db) => {
        // First check if user exists
        const user = _db
          .select({ createdAt: this.table.createdAt })
          .from(this.table)
          .where(eq(this.table.id, id))
          .get();

        if (!user) return null;

        // Get counts from related tables
        const productCount = _db
          .select({ count: sql`COUNT(*)` })
          .from(_db.select().from(this.table).as("products"))
          .where(sql`user_id = ${id}`)
          .get();

        const parcelleCount = _db
          .select({ count: sql`COUNT(*)` })
          .from(_db.select().from(this.table).as("parcelles"))
          .where(sql`user_id = ${id}`)
          .get();

        const analysisCount = _db
          .select({ count: sql`COUNT(*)` })
          .from(_db.select().from(this.table).as("market_analyses"))
          .where(sql`user_id = ${id}`)
          .get();

        return {
          totalProducts: Number(productCount?.count || 0),
          totalParcelles: Number(parcelleCount?.count || 0),
          totalAnalyses: Number(analysisCount?.count || 0),
          joinedDate: user.createdAt,
        };
      }, "getUserStats");
    } catch (error) {
      this.logError("getUserStats failed", error, { id });
      throw error;
    }
  }

  /**
   * Soft delete user (mark as inactive rather than hard delete)
   */
  public async deactivateUser(id: string): Promise<boolean> {
    try {
      return await this.executeCustomQuery((db) => {
        // Update user to mark as deactivated
        const result = db
          .update(this.table)
          .set({
            // You might want to add an 'active' or 'status' field to the schema
            updatedAt: new Date().toISOString(),
            // For now, we'll clear sensitive data
            email: null,
            encryptionSecret: null,
          })
          .where(eq(this.table.id, id))
          .returning()
          .get();

        return result !== undefined;
      }, "deactivateUser");
    } catch (error) {
      this.logError("deactivateUser failed", error, { id });
      throw error;
    }
  }
}
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
