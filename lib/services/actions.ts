"use server";

import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import { getErrorMessage } from "@/lib/utils/error-utils";
import {
  databaseService,
  generateId,
  getCurrentTimestamp,
} from "@/lib/services/database/db";
import type { DashboardConfig } from "@/lib/types/dashboard";
import type { Parcelle } from "@/lib/shared/types/entities";
import { logger } from "@/lib/utils/logging/logger";
import type { LogContext } from "@/lib/utils/logging/logger";
import { CustomError } from "@/lib/errors/custom-error";
import type {
  CreateParcelleInput,
} from "@/lib/types/entities";
import { serviceContainer } from "@/lib/services/container";

// Schémas de validation Zod améliorés
const userSchema = z.object({
  username: z
    .string()
    .min(2, "Le nom d'utilisateur doit faire au moins 2 caractères")
    .max(50, "Le nom d'utilisateur ne peut pas dépasser 50 caractères")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores",
    ),
  password: z
    .string()
    .min(6, "Le mot de passe doit faire au moins 6 caractères")
    .max(100, "Le mot de passe ne peut pas dépasser 100 caractères"),
});

const loginSchema = z.object({
  password: z.string().min(1, "Le mot de passe est requis"),
});

const parcelleSchema = z.object({
  numero: z.string().min(1, "Le numéro de parcelle est requis"),
  transporteur: z.string().min(1, "Le transporteur est requis"),
  nom: z.string().min(1, "Le nom de la parcelle est requis"),
  statut: z.string().min(1, "Le statut est requis"),
  prixAchat: z.number().nonnegative("Le prix d'achat doit être positif"),
  poids: z.number().positive("Le poids doit être positif"),
});

// ======================================================================