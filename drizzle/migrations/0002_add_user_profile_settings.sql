-- Migration: Ajout des champs profil utilisateur et gestion des sessions
-- Description: Ajoute lastLoginAt et preferences à users, crée la table user_sessions
-- Date: 2025-10-12
-- Author: LogistiX Team

-- ============================================================================
-- MODIFICATION DE LA TABLE USERS
-- ============================================================================

-- Ajouter le champ lastLoginAt pour tracker la dernière connexion
ALTER TABLE users ADD COLUMN last_login_at TEXT;

-- Ajouter le champ preferences pour stocker les préférences métier (JSON)
-- Format: { currency: 'EUR', weightUnit: 'g', dateFormat: 'DD/MM/YYYY', autoExchangeRate: true }
ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}';

-- ============================================================================
-- CRÉATION DE LA TABLE USER_SESSIONS
-- ============================================================================

-- Table pour gérer les sessions actives des utilisateurs
-- Permet de voir tous les appareils connectés et de les déconnecter
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_name TEXT,           -- Nom de l'appareil (ex: "Chrome sur MacBook Pro")
  device_type TEXT,           -- Type (desktop, mobile, tablet)
  ip_address TEXT,            -- Adresse IP de connexion
  user_agent TEXT,            -- User agent complet
  last_activity_at TEXT NOT NULL, -- Dernière activité
  created_at TEXT NOT NULL,   -- Date de création de la session
  expires_at TEXT NOT NULL,   -- Date d'expiration
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour optimiser les requêtes par utilisateur
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- Index pour optimiser les requêtes par date d'expiration (nettoyage)
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Index pour optimiser les requêtes par dernière activité
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity_at);

-- ============================================================================
-- MIGRATION DES DONNÉES EXISTANTES
-- ============================================================================

-- Initialiser les préférences par défaut pour les utilisateurs existants
UPDATE users 
SET preferences = '{"currency":"EUR","weightUnit":"g","dateFormat":"DD/MM/YYYY","autoExchangeRate":true}'
WHERE preferences IS NULL OR preferences = '';

-- ============================================================================
-- NOTES DE MIGRATION
-- ============================================================================
-- Tables modifiées: users (2 colonnes ajoutées)
-- Tables créées: user_sessions
-- Index créés: 3 sur user_sessions
-- Données migrées: Préférences par défaut initialisées
-- RLS: Pas nécessaire car géré au niveau applicatif avec JWT
