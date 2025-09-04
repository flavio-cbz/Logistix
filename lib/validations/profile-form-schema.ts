import { z } from 'zod';

export const profileFormSchema = z.object({
  username: z.string().min(2, "Le nom d'utilisateur doit contenir au moins 2 caractères.").max(50, "Le nom d'utilisateur ne peut pas dépasser 50 caractères.").optional(),
  password: z.string().min(4, "Le mot de passe doit contenir au moins 4 caractères.").optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;