-- Migration: Consolidation des champs legacy vers champs canoniques
-- Date: 2025-10-15
-- Description: Copie les données des colonnes legacy (français) vers les colonnes canoniques (anglais)
--              pour préparer la dépréciation des champs legacy

-- ============================================================================
-- OBJECTIF
-- ============================================================================
-- Standardiser les noms de colonnes vers l'anglais pour cohérence internationale
-- Maintenir la compatibilité avec le code existant pendant la transition
-- Préparer la suppression future des colonnes legacy (v2.0)

-- ============================================================================
-- ÉTAPE 1: Consolider selling_price (prix de vente)
-- ============================================================================
-- Copier les valeurs de prix_vente vers selling_price si selling_price est NULL
-- Priorité: selling_price (déjà rempli) > prix_vente (legacy)

DO $$ 
BEGIN
  -- Vérifier que la colonne existe avant de tenter la mise à jour
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'selling_price'
  ) THEN
    UPDATE products 
    SET selling_price = COALESCE(selling_price, prix_vente)
    WHERE selling_price IS NULL AND prix_vente IS NOT NULL;
    
    RAISE NOTICE 'Consolidation selling_price: % lignes mises à jour', 
      (SELECT COUNT(*) FROM products WHERE selling_price IS NOT NULL);
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 2: Consolider listed_at (date de mise en ligne)
-- ============================================================================
-- Copier les valeurs de date_mise_en_ligne vers listed_at si listed_at est NULL

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'listed_at'
  ) THEN
    UPDATE products 
    SET listed_at = COALESCE(listed_at, date_mise_en_ligne)
    WHERE listed_at IS NULL AND date_mise_en_ligne IS NOT NULL;
    
    RAISE NOTICE 'Consolidation listed_at: % lignes mises à jour', 
      (SELECT COUNT(*) FROM products WHERE listed_at IS NOT NULL);
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 3: Consolider sold_at (date de vente)
-- ============================================================================
-- Copier les valeurs de date_vente vers sold_at si sold_at est NULL

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'sold_at'
  ) THEN
    UPDATE products 
    SET sold_at = COALESCE(sold_at, date_vente)
    WHERE sold_at IS NULL AND date_vente IS NOT NULL;
    
    RAISE NOTICE 'Consolidation sold_at: % lignes mises à jour', 
      (SELECT COUNT(*) FROM products WHERE sold_at IS NOT NULL);
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 4: Ajouter des commentaires de dépréciation
-- ============================================================================
-- Marquer les colonnes legacy comme dépréciées pour avertir les développeurs

COMMENT ON COLUMN products.prix_vente IS 
  'DEPRECATED: Utiliser selling_price. Cette colonne sera supprimée en v2.0';

COMMENT ON COLUMN products.date_mise_en_ligne IS 
  'DEPRECATED: Utiliser listed_at. Cette colonne sera supprimée en v2.0';

COMMENT ON COLUMN products.date_vente IS 
  'DEPRECATED: Utiliser sold_at. Cette colonne sera supprimée en v2.0';

-- ============================================================================
-- ÉTAPE 5: Créer des triggers de synchronisation (optionnel - pour transition)
-- ============================================================================
-- Maintenir la synchronisation entre colonnes legacy et canoniques pendant la transition
-- Ces triggers seront supprimés lors de la suppression des colonnes legacy

CREATE OR REPLACE FUNCTION sync_product_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Synchroniser selling_price <-> prix_vente
  IF NEW.selling_price IS DISTINCT FROM OLD.selling_price THEN
    NEW.prix_vente := NEW.selling_price;
  ELSIF NEW.prix_vente IS DISTINCT FROM OLD.prix_vente THEN
    NEW.selling_price := NEW.prix_vente;
  END IF;
  
  -- Synchroniser listed_at <-> date_mise_en_ligne
  IF NEW.listed_at IS DISTINCT FROM OLD.listed_at THEN
    NEW.date_mise_en_ligne := NEW.listed_at;
  ELSIF NEW.date_mise_en_ligne IS DISTINCT FROM OLD.date_mise_en_ligne THEN
    NEW.listed_at := NEW.date_mise_en_ligne;
  END IF;
  
  -- Synchroniser sold_at <-> date_vente
  IF NEW.sold_at IS DISTINCT FROM OLD.sold_at THEN
    NEW.date_vente := NEW.sold_at;
  ELSIF NEW.date_vente IS DISTINCT FROM OLD.date_vente THEN
    NEW.sold_at := NEW.date_vente;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger seulement s'il n'existe pas
DROP TRIGGER IF EXISTS sync_product_fields_trigger ON products;
CREATE TRIGGER sync_product_fields_trigger
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_fields();

-- ============================================================================
-- VÉRIFICATIONS POST-MIGRATION
-- ============================================================================

-- Afficher les statistiques de consolidation
DO $$ 
DECLARE
  total_products INTEGER;
  with_selling_price INTEGER;
  with_listed_at INTEGER;
  with_sold_at INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_products FROM products;
  SELECT COUNT(*) INTO with_selling_price FROM products WHERE selling_price IS NOT NULL;
  SELECT COUNT(*) INTO with_listed_at FROM products WHERE listed_at IS NOT NULL;
  SELECT COUNT(*) INTO with_sold_at FROM products WHERE sold_at IS NOT NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ DE LA CONSOLIDATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total produits: %', total_products;
  RAISE NOTICE 'Avec selling_price: % (%.1f%%)', 
    with_selling_price, 
    (with_selling_price::float / NULLIF(total_products, 0) * 100);
  RAISE NOTICE 'Avec listed_at: % (%.1f%%)', 
    with_listed_at,
    (with_listed_at::float / NULLIF(total_products, 0) * 100);
  RAISE NOTICE 'Avec sold_at: % (%.1f%%)', 
    with_sold_at,
    (with_sold_at::float / NULLIF(total_products, 0) * 100);
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- NOTES IMPORTANTES
-- ============================================================================
-- 1. Cette migration est NON-DESTRUCTIVE : aucune donnée n'est supprimée
-- 2. Les colonnes legacy restent en place pour compatibilité ascendante
-- 3. Les triggers maintiennent la sync bidirectionnelle pendant la transition
-- 4. Planifier suppression colonnes legacy pour version 2.0 (breaking change)
-- 5. Mettre à jour tous les repositories pour utiliser les champs canoniques
-- 6. Utiliser lib/utils/product-field-normalizers.ts pour accès unifié

-- ROLLBACK (si nécessaire):
-- DROP TRIGGER IF EXISTS sync_product_fields_trigger ON products;
-- DROP FUNCTION IF EXISTS sync_product_fields();
-- UPDATE products SET prix_vente = selling_price WHERE prix_vente IS NULL;
-- UPDATE products SET date_mise_en_ligne = listed_at WHERE date_mise_en_ligne IS NULL;
-- UPDATE products SET date_vente = sold_at WHERE date_vente IS NULL;
