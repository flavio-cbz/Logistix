-- Ajout des colonnes manquantes pour la gestion du chiffrement Vinted
ALTER TABLE vinted_sessions ADD COLUMN encrypted_dek TEXT;
ALTER TABLE vinted_sessions ADD COLUMN encryption_metadata TEXT;