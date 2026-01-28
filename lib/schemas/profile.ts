import { z } from "zod";

/**
 * Schémas de validation pour le profil utilisateur
 * Utilisé dans /api/v1/profile
 */

// ============================================================================
// PROFILE UPDATE
// ============================================================================

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Le nom d'utilisateur doit faire au moins 3 caractères")
    .max(50, "Le nom d'utilisateur ne peut pas dépasser 50 caractères")
    .regex(/^[a-zA-Z0-9_-]+$/, "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores")
    .optional(),
  email: z
    .string()
    .email("Email invalide")
    .max(255, "L'email ne peut pas dépasser 255 caractères")
    .optional(),
  bio: z
    .string()
    .max(500, "La bio ne peut pas dépasser 500 caractères")
    .optional(),
  avatar: z
    .string()
    .url("L'URL de l'avatar doit être valide")
    .max(500, "L'URL ne peut pas dépasser 500 caractères")
    .optional()
    .or(z.literal(""))
    .or(z.null()), // Allow null to clear avatar
  language: z
    .enum(["fr", "en"], {
      message: "La langue doit être 'fr' ou 'en'",
    })
    .optional(),
  theme: z
    .enum(["light", "dark", "system"], {
      message: "Le thème doit être 'light', 'dark' ou 'system'",
    })
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ============================================================================
// PASSWORD CHANGE
// ============================================================================

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Le mot de passe actuel est requis"),
    newPassword: z
      .string()
      .min(8, "Le nouveau mot de passe doit faire au moins 8 caractères")
      .max(100, "Le mot de passe ne peut pas dépasser 100 caractères")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial (@$!%*?&)"
      ),
    confirmPassword: z
      .string()
      .min(1, "La confirmation du mot de passe est requise"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Le nouveau mot de passe doit être différent de l'ancien",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ============================================================================
// PROFILE RESPONSE
// ============================================================================

export const profileResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  bio: z.string().nullable(),
  avatar: z.string().nullable(),
  language: z.string().nullable(),
  theme: z.string().nullable(),
  role: z.string(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  stats: z.object({
    totalProducts: z.number(),
    totalParcels: z.number(),
    daysActive: z.number(),
  }).optional(),
});

export type ProfileResponse = z.infer<typeof profileResponseSchema>;
