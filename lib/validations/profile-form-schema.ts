/**
 * @fileoverview Zod validation schema for user profile form data
 * @description This module provides validation schema for user profile forms
 * including username and password validation with proper length constraints and error messages.
 * Ensures data integrity for user profile operations.
 * @version 1.0.0
 * @since 2025-01-09
 * @author Development Team
 */

import { z } from "zod";

/**
 * Zod schema for validating user profile form data
 * 
 * @description Validates user profile form submissions with proper constraints
 * for username and password fields. Both fields are optional to support partial
 * profile updates. Provides user-friendly French error messages.
 * @example
 * ```typescript
 * const profileData = profileFormSchema.parse({
 *   username: "john_doe",
 *   password: "newPassword123"
 * });
 * ```
 */
export const profileFormSchema = z.object({
  username: z
    .string()
    .min(2, "Le nom d'utilisateur doit contenir au moins 2 caractères.")
    .max(50, "Le nom d'utilisateur ne peut pas dépasser 50 caractères.")
    .optional(),
  password: z
    .string()
    .min(4, "Le mot de passe doit contenir au moins 4 caractères.")
    .optional(),
});

/**
 * TypeScript type for profile form values
 * 
 * @description Inferred type from profileFormSchema for use in TypeScript code.
 * Represents the structure of validated profile form data with optional fields.
 */
export type ProfileFormValues = z.infer<typeof profileFormSchema>;
