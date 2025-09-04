BEGIN TRANSACTION;
ALTER TABLE users ADD COLUMN encryption_secret TEXT;
UPDATE users SET encryption_secret = lower(hex(randomblob(32))) WHERE encryption_secret IS NULL;
COMMIT;