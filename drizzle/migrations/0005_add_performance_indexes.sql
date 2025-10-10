CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_user_created ON products(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parcelles_user_id ON parcelles(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelles_numero ON parcelles(numero);
CREATE INDEX IF NOT EXISTS idx_parcelles_transporteur ON parcelles(transporteur);
CREATE INDEX IF NOT EXISTS idx_parcelles_created_at ON parcelles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parcelles_user_created ON parcelles(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parcelles_user_numero ON parcelles(user_id, numero);
