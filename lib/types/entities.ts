// Minimal shared entity types used across the app.
// Recreated to satisfy imports after cleanup. Keep small and conservative — expand if other code needs additional fields.

export enum ProductStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  SOLD = "sold",
}

export enum Platform {
  VINTED = "vinted",
  OTHER = "other",
}

export type Product = {
  id: string;
  userId: string;
  parcelleId?: string | null;
  name?: string | null;
  nom?: string | null; // legacy
  details?: string | null;
  price?: number | null;
  prixArticle?: number | null;
  prixArticleTTC?: number | null;
  prixLivraison?: number | null;
  prixVente?: number | null;
  vendu?: "0" | "1" | "2" | "3";
  dateVente?: string | null;
  tempsEnLigne?: string | null;
  plateforme?: Platform | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateProductInput = Omit<Product, "id" | "created_at" | "updated_at">;
export type UpdateProductInput = Partial<CreateProductInput> & { id: string };

// Re-export names expected by some modules
export type { Product as ProductEntity };
