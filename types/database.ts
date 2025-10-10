// Re-export shared types for backward compatibility
export type {
  Parcelle,
  CreateProductInput,
  UpdateProductInput,
  CreateParcelleInput,
  UpdateParcelleInput,
  CreateParcelleInput as CreateParcelleData,
  UpdateParcelleInput as UpdateParcelleData,
} from '../lib/types/entities';

// Local import used to build a compatibility alias below
import type { Product } from '../lib/types/entities';

// Legacy interface for backward compatibility
/**
 * Legacy `Produit` kept for backward compatibility.
 *
 * Many parts of the codebase still import `Produit`. To allow a safe, incremental
 * migration to the modern `Product` interface (see `lib/types/entities.ts`), we
 * expose `Produit` as a compatibility type that extends `Product` and adds the
 * legacy field names as optional aliases. This keeps the build working while new
 * code can prefer `Product`.
 */
export type Produit = Product & {
  // Legacy aliases (optional). When present they should mirror the modern fields:
  // - `nom` === `name`
  // - `prixArticle` === `price`
  // - `prixLivraison` === `coutLivraison`
  // - `prixVente` already exists on Product as `prixVente`
  nom?: string | undefined;
  details?: string | undefined;
  prixArticle?: number | undefined;
  prixLivraison?: number | undefined;
  // Historical / legacy fields kept for tests and older modules
  dateAchat?: string | undefined;
  tempsEnLigne?: string | undefined;
  pourcentageBenefice?: number | undefined;
  // parcelleId stays compatible (Product.parcelleId is optional/nullable)
  parcelleId: string;
}