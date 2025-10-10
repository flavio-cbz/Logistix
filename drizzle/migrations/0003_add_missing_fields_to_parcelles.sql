-- Migration: Add missing fields to parcelles (already applied manually)
-- Note: Les colonnes nom, statut, actif, created_at, updated_at existent déjà dans la DB
-- Cette migration est marquée comme appliquée pour la cohérence avec le journal Drizzle
-- NO-OP: Cette migration ne fait rien car les changements ont déjà été appliqués manuellement
SELECT 1;
