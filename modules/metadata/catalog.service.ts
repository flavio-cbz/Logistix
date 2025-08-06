import 'server-only';
import { db, getCurrentTimestamp } from "@/lib/services/database/db";

// Types
export interface VintedCatalog {
  id: string;
  code: string;
  title: string;
  parent_id?: string | null;
  unisex_catalog_id?: string | null;
  created_at: string;
  updated_at: string;
}

// Service
export class CatalogService {
  async getAllCatalogs(): Promise<VintedCatalog[]> {
    const stmt = db.prepare(`
      SELECT id, code, title, parent_id, unisex_catalog_id, created_at, updated_at
      FROM vinted_catalogs
      ORDER BY title ASC
    `);
    return stmt.all() as VintedCatalog[];
  }

  async getCatalogTree(): Promise<VintedCatalog[]> {
    const stmt = db.prepare(`
      SELECT id, code, title, parent_id, unisex_catalog_id, created_at, updated_at
      FROM vinted_catalogs
      WHERE parent_id IS NULL
      ORDER BY title ASC
    `);
    return stmt.all() as VintedCatalog[];
  }

  async upsertCatalog(catalog: Omit<VintedCatalog, 'created_at' | 'updated_at'>): Promise<void> {
    const timestamp = getCurrentTimestamp();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO vinted_catalogs (id, code, title, parent_id, unisex_catalog_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM vinted_catalogs WHERE id = ?), ?), ?)
    `);
    stmt.run(
      catalog.id,
      catalog.code,
      catalog.title,
      catalog.parent_id,
      catalog.unisex_catalog_id,
      catalog.id,
      timestamp,
      timestamp
    );
  }
}