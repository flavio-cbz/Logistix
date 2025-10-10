CREATE INDEX IF NOT EXISTS idx_parcelles_user_numero ON parcelles(user_id, numero);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);