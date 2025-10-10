-- Migration: Supprimer les colonnes description, material et condition de la table products
-- Date: 3 octobre 2025

-- Supprimer l'index sur la colonne condition avant de la supprimer
DROP INDEX IF EXISTS product_condition_idx;

-- Supprimer la colonne description
ALTER TABLE products DROP COLUMN description;

-- Supprimer la colonne material
ALTER TABLE products DROP COLUMN material;

-- Supprimer la colonne condition
ALTER TABLE products DROP COLUMN condition;