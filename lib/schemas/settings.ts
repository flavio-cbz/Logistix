import { z } from "zod";

/**
 * Schémas de validation pour les paramètres utilisateur
 * Utilisé dans /api/v1/settings
 */

// ============================================================================
// SETTINGS UPDATE (Extended)
// ============================================================================

export const updateSettingsSchema = z.object({
  // Apparence
  theme: z
    .enum(["light", "dark", "system"], {
      message: "Le thème doit être 'light', 'dark' ou 'system'",
    })
    .optional(),
  language: z
    .enum(["fr", "en"], {
      message: "La langue doit être 'fr' ou 'en'",
    })
    .optional(),
  animations: z
    .boolean({
      message: "La valeur doit être un booléen",
    })
    .optional(),

  // Préférences métier
  preferences: z
    .object({
      currency: z
        .enum(["EUR", "USD", "CNY"], {
          message: "La devise doit être EUR, USD ou CNY",
        })
        .optional(),
      weightUnit: z
        .enum(["g", "kg"], {
          message: "L'unité de poids doit être g ou kg",
        })
        .optional(),
      dateFormat: z
        .enum(["DD/MM/YYYY", "MM/DD/YYYY"], {
          message: "Le format de date doit être DD/MM/YYYY ou MM/DD/YYYY",
        })
        .optional(),
      autoExchangeRate: z
        .boolean({
          message: "La valeur doit être un booléen",
        })
        .optional(),
      manualExchangeRate: z
        .number({
          message: "Le taux doit être un nombre",
        })
        .min(0, "Le taux doit être positif")
        .optional(),
      animations: z
        .boolean({
          message: "La valeur doit être un booléen",
        })
        .optional(),
    })
    .optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

// ============================================================================
// SETTINGS RESPONSE
// ============================================================================

export const settingsResponseSchema = z.object({
  theme: z.string().nullable(),
  language: z.string().nullable(),
  animations: z.boolean().default(true),
  preferences: z.object({
    currency: z.enum(["EUR", "USD", "CNY"]).default("EUR"),
    weightUnit: z.enum(["g", "kg"]).default("g"),
    dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY"]).default("DD/MM/YYYY"),
    autoExchangeRate: z.boolean().default(true),
    manualExchangeRate: z.number().optional(),
  }),
});

export type SettingsResponse = z.infer<typeof settingsResponseSchema>;

// ============================================================================
// USER SESSION
// ============================================================================

export const userSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  deviceName: z.string().nullable(),
  deviceType: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  lastActivityAt: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
});

export type UserSession = z.infer<typeof userSessionSchema>;

export const sessionsListResponseSchema = z.object({
  sessions: z.array(userSessionSchema),
  currentSessionId: z.string(),
});

export type SessionsListResponse = z.infer<typeof sessionsListResponseSchema>;
