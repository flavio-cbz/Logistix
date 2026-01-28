import {
  hash as bcryptHashPassword,
  compare as bcryptComparePassword,
} from "bcrypt";
import { BaseService } from "../base-service";
import { AuthError } from "@/lib/errors/custom-error";
import { databaseService } from "@/lib/database";

// =============================================================================
// PASSWORD MANAGER
// =============================================================================

/**
 * PasswordManager
 *
 * Responsible for:
 * - Hashing passwords
 * - Verifying passwords
 * - Changing user passwords
 */
export class PasswordManager extends BaseService {
  private readonly BCRYPT_ROUNDS = 10;

  constructor() {
    super("PasswordManager");
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return this.executeOperation("hashPassword", async () => {
      return await bcryptHashPassword(password, this.BCRYPT_ROUNDS);
    });
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return this.executeOperation("verifyPassword", async () => {
      return await bcryptComparePassword(password, hash);
    });
  }

  /**
   * Change a user's password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    return this.executeOperation("changePassword", async () => {
      // Get user
      const user = await databaseService.executeQuery(async (db) => {
        const { users } = await import("@/lib/database/schema");
        const { eq } = await import("drizzle-orm");
        const result = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .get();
        return result;
      }, "getUserForPasswordChange");

      if (!user) {
        throw new AuthError("User not found");
      }

      // Verify current password
      const isValid = await this.verifyPassword(
        currentPassword,
        user.passwordHash
      );

      if (!isValid) {
        throw new AuthError("Current password is incorrect");
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      await databaseService.executeQuery(async (db) => {
        const { users } = await import("@/lib/database/schema");
        const { eq } = await import("drizzle-orm");
        await db
          .update(users)
          .set({ passwordHash: newPasswordHash })
          .where(eq(users.id, userId));
      }, "updatePassword");

      this.logger.info("Password changed successfully", { userId });
    }, { userId });
  }
}
