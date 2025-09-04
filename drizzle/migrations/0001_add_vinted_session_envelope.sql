-- Migration: add encryptedDek and encryptionMetadata to vinted_sessions
BEGIN TRANSACTION;
ALTER TABLE vinted_sessions ADD COLUMN encryptedDek TEXT;
ALTER TABLE vinted_sessions ADD COLUMN encryptionMetadata TEXT;
COMMIT;