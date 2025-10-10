CREATE INDEX IF NOT EXISTS idx_parcelles_created_at ON parcelles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);