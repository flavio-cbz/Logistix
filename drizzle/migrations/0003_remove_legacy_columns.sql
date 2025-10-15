-- Migration: Suppression des colonnes legacy après consolidation
-- Date: 2025-10-15
-- Description: Supprime les colonnes legacy (prix_vente, date_mise_en_ligne, date_vente)
--              après avoir consolidé les données vers les colonnes canoniques

-- ============================================================================
-- PRÉREQUIS
-- ============================================================================
-- Cette migration doit être exécutée APRÈS 0002_consolidate_legacy_fields.sql
-- Les données ont été consolidées vers selling_price, listed_at, sold_at

-- ============================================================================
-- OBJECTIF
-- ============================================================================
-- Nettoyer le schéma en supprimant les colonnes redondantes
-- Réduire la taille de la base de données
-- Simplifier la maintenance future
-- Breaking change : nécessite mise à jour des repositories

-- ============================================================================
-- SUPPRESSION COLONNE PRIX DE VENTE LEGACY
-- ============================================================================

-- Vérifier que les données ont été consolidées avant suppression
DO $$
DECLARE
  products_with_legacy_only INTEGER;
  total_products INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_products FROM products;

  -- Produits qui ont seulement prix_vente (pas selling_price)
  SELECT COUNT(*) INTO products_with_legacy_only
  FROM products
  WHERE prix_vente IS NOT NULL AND selling_price IS NULL;

  IF products_with_legacy_only > 0 THEN
    RAISE EXCEPTION 'Données non consolidées détectées: % produits ont seulement prix_vente',
      products_with_legacy_only;
  END IF;

  RAISE NOTICE 'Vérification passée: Toutes les données prix_vente consolidées';
END $$;

-- Supprimer la colonne legacy prix_vente
ALTER TABLE products DROP COLUMN IF EXISTS prix_vente;

-- ============================================================================
-- SUPPRESSION COLONNE DATE MISE EN LIGNE LEGACY
-- ============================================================================

DO $$
DECLARE
  products_with_legacy_only INTEGER;
BEGIN
  -- Produits qui ont seulement date_mise_en_ligne (pas listed_at)
  SELECT COUNT(*) INTO products_with_legacy_only
  FROM products
  WHERE date_mise_en_ligne IS NOT NULL AND listed_at IS NULL;

  IF products_with_legacy_only > 0 THEN
    RAISE EXCEPTION 'Données non consolidées détectées: % produits ont seulement date_mise_en_ligne',
      products_with_legacy_only;
  END IF;

  RAISE NOTICE 'Vérification passée: Toutes les données date_mise_en_ligne consolidées';
END $$;

-- Supprimer la colonne legacy date_mise_en_ligne
ALTER TABLE products DROP COLUMN IF EXISTS date_mise_en_ligne;

-- ============================================================================
-- SUPPRESSION COLONNE DATE VENTE LEGACY
-- ============================================================================

DO $$
DECLARE
  products_with_legacy_only INTEGER;
BEGIN
  -- Produits qui ont seulement date_vente (pas sold_at)
  SELECT COUNT(*) INTO products_with_legacy_only
  FROM products
  WHERE date_vente IS NOT NULL AND sold_at IS NULL;

  IF products_with_legacy_only > 0 THEN
    RAISE EXCEPTION 'Données non consolidées détectées: % produits ont seulement date_vente',
      products_with_legacy_only;
  END IF;

  RAISE NOTICE 'Vérification passée: Toutes les données date_vente consolidées';
END $$;

-- Supprimer la colonne legacy date_vente
ALTER TABLE products DROP COLUMN IF EXISTS date_vente;

-- ============================================================================
-- NETTOYAGE DES TRIGGERS (si existants)
-- ============================================================================
-- Supprimer les triggers de synchronisation créés dans la migration précédente

DROP TRIGGER IF EXISTS sync_product_fields_trigger ON products;
DROP FUNCTION IF EXISTS sync_product_fields();

-- ============================================================================
-- SUPPRESSION DES COMMENTAIRES DE DÉPRÉCIATION
-- ============================================================================
-- Les colonnes n'existent plus, donc plus besoin de commentaires

-- ============================================================================
-- VÉRIFICATIONS POST-MIGRATION
-- ============================================================================

DO $$
DECLARE
  column_count INTEGER;
BEGIN
  -- Vérifier que les colonnes legacy ont été supprimées
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'products'
    AND column_name IN ('prix_vente', 'date_mise_en_ligne', 'date_vente');

  IF column_count > 0 THEN
    RAISE EXCEPTION 'Échec de la suppression: % colonnes legacy encore présentes', column_count;
  END IF;

  RAISE NOTICE 'Migration réussie: Toutes les colonnes legacy supprimées';

  -- Statistiques finales
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ DE LA NETTOYAGE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Colonnes supprimées: prix_vente, date_mise_en_ligne, date_vente';
  RAISE NOTICE 'Triggers supprimés: sync_product_fields_trigger';
  RAISE NOTICE 'Fonctions supprimées: sync_product_fields()';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- NOTES IMPORTANTES
-- ============================================================================
-- 1. BACKUP RECOMMANDÉ : Cette migration supprime des données définitivement
-- 2. BREAKING CHANGE : Les repositories doivent être mis à jour pour ne plus référencer ces colonnes
-- 3. TESTS REQUISES : Tous les tests doivent passer après cette migration
-- 4. ROLLBACK : Restaurer depuis backup - impossible de recréer les colonnes supprimées
-- 5. PROCHAINES ÉTAPES :
--    - Mettre à jour le schéma Drizzle (supprimer les colonnes legacy)
--    - Supprimer les références dans les repositories
--    - Mettre à jour les normalizers si nécessaire
--    - Tests de non-régression complets

-- ROLLBACK (si nécessaire - REQUIERT BACKUP):
-- Cette migration ne peut pas être rollbackée automatiquement
-- Restaurer depuis un backup pris avant l'exécution de cette migration