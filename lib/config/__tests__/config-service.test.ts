/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock server-only to avoid import errors in tests
vi.mock("server-only", () => ({}));

import { validateConfig, getDefaultConfig } from "../schemas";

describe("Configuration System", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("Configuration Validation", () => {
    it("should validate valid configuration", () => {
      const validConfig = getDefaultConfig();
      validConfig.auth.jwtSecret =
        "valid-secret-that-is-at-least-32-characters-long";
      validConfig.admin.defaultPassword = "valid-password";

      const result = validateConfig(validConfig);
      expect(result.success).toBe(true);
    });

    it("should reject invalid configuration", () => {
      const invalidConfig = {
        auth: {
          jwtSecret: "too-short", // Invalid: less than 32 characters
        },
      };

      const result = validateConfig(invalidConfig);
      expect(result.success).toBe(false);
    });

    it("should provide default configuration", () => {
      const defaultConfig = getDefaultConfig();

      expect(defaultConfig.database.path).toBe("./data/logistix.db");
      expect(defaultConfig.auth.cookieName).toBe("logistix_session");
      expect(defaultConfig.app.environment).toBe("development");
      expect(defaultConfig.features.enableVintedIntegration).toBe(true);
    });
  });
});
