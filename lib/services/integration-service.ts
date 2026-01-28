import { BaseService } from "./base-service";
import { IntegrationRepository } from "@/lib/repositories";
import { encryptSecret, decryptSecret } from "@/lib/utils/crypto";

interface GeminiCredentials {
  apiKey: string;
  model?: string;
  enabled?: boolean;
}

export class IntegrationService extends BaseService {
  constructor(private readonly integrationRepository: IntegrationRepository) {
    super("IntegrationService");
  }

  /**
   * Get decrypted credentials for a provider
   */
  async getCredentials(userId: string, provider: string) {
    return this.executeOperation("getCredentials", async () => {
      this.validateUUID(userId, "userId");

      const credential = await this.integrationRepository.findByProvider(userId, provider);

      if (!credential || !credential.credentials) {
        return null;
      }

      // Handle Gemini provider specifically
      if (provider === "gemini") {
        const creds = credential.credentials as unknown as GeminiCredentials;
        let decryptedKey = "";

        if (creds.apiKey) {
          try {
            decryptedKey = await decryptSecret(creds.apiKey, userId);
          } catch (error) {
            this.logger.error("Failed to decrypt Gemini API key", {
              userId,
              provider,
              error,
            });
            // Return empty key on decryption failure instead of silently ignoring
            decryptedKey = "";
          }
        }

        return {
          enabled: creds.enabled ?? false,
          apiKey: decryptedKey,
          model: creds.model || "gemini-2.0-flash",
        };
      }

      // Generic credentials return
      return credential.credentials;
    }, { userId, provider });
  }

  /**
   * Update credentials for a provider
   */
  async updateCredentials(
    userId: string,
    provider: string,
    data: { enabled?: boolean; apiKey?: string; model?: string }
  ) {
    return this.executeOperation("updateCredentials", async () => {
      this.validateUUID(userId, "userId");

      // Handle Gemini provider specifically
      if (provider === "gemini") {
        let encryptedKey = "";

        // If apiKey is provided and not masked (contains "..."), encrypt it
        if (data.apiKey && !data.apiKey.includes("...")) {
          try {
            encryptedKey = await encryptSecret(data.apiKey, userId);
          } catch (error) {
            this.logger.error("Failed to encrypt Gemini API key", {
              userId,
              provider,
              error,
            });
            throw this.createBusinessError(
              "Failed to encrypt API key. Please try again."
            );
          }
        } else {
          // Preserve existing key if masked or not provided
          const existing = await this.integrationRepository.findByProvider(
            userId,
            provider
          );
          if (existing && existing.credentials) {
            const existingCreds = existing.credentials as unknown as GeminiCredentials;
            encryptedKey = existingCreds.apiKey || "";
          }
        }

        const credentials: GeminiCredentials = {
          enabled: data.enabled ?? false,
          apiKey: encryptedKey,
          model: data.model || "gemini-2.0-flash",
        };

        await this.integrationRepository.saveCredentials(userId, provider, {
          credentials: credentials as unknown as Record<string, unknown>,
        });

        this.logger.info("Gemini credentials updated", {
          userId,
          enabled: credentials.enabled,
          hasKey: !!credentials.apiKey,
        });

        return { success: true };
      }

      // Generic credentials update
      await this.integrationRepository.saveCredentials(userId, provider, {
        credentials: data as unknown as Record<string, unknown>,
      });

      return { success: true };
    }, { userId, provider });
  }
}
