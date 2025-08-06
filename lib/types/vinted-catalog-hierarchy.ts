/**
 * Types pour la hiérarchie des catalogues Vinted à 3 niveaux
 * Nécessaire pour l'API similar_sold_items qui requiert des catégories niveau 3 minimum
 */

export interface VintedCatalogLevel3 {
  id: number;
  name: string;
  level: 3;
  parentId: number; // ID du niveau 2
  keywords: string[];
  isValidForAnalysis: true;
  description?: string;
}

export interface VintedCatalogLevel2 {
  id: number;
  name: string;
  level: 2;
  parentId: number; // ID du niveau 1
  children: VintedCatalogLevel3[];
  description?: string;
}

export interface VintedCatalogLevel1 {
  id: number;
  name: string;
  level: 1;
  children: VintedCatalogLevel2[];
  description?: string;
}

export interface VintedCatalogHierarchy {
  level1: VintedCatalogLevel1[];
}

export interface CategoryPath {
  level1: VintedCatalogLevel1;
  level2: VintedCatalogLevel2;
  level3: VintedCatalogLevel3;
}

export interface CategoryValidationResult {
  isValid: boolean;
  level: 1 | 2 | 3;
  message: string;
  suggestions: VintedCatalogLevel3[];
  category?: VintedCatalogLevel1 | VintedCatalogLevel2 | VintedCatalogLevel3;
}

export enum CategoryValidationError {
  INVALID_LEVEL = "INVALID_LEVEL",
  NOT_FOUND = "NOT_FOUND",
  NO_LEVEL3_AVAILABLE = "NO_LEVEL3_AVAILABLE",
  API_INCOMPATIBLE = "API_INCOMPATIBLE"
}

export interface ValidationResult {
  isValid: boolean;
  level: number;
  message: string;
  suggestions: VintedCatalogLevel3[];
  userAction: string;
  category?: VintedCatalogAny;
  errorCode?: CategoryValidationError;
}

export interface ValidationOptions {
  includeAlternatives?: boolean;
  maxSuggestions?: number;
  productContext?: string;
}

export interface ProductCategoryMapping {
  productKeywords: string[];
  suggestedCategories: number[]; // IDs des catégories niveau 3
  priority: number; // 1 = haute priorité, 3 = basse priorité
}

export type VintedCatalogAny = VintedCatalogLevel1 | VintedCatalogLevel2 | VintedCatalogLevel3;