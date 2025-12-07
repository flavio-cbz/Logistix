// Legacy types for backward compatibility
// Merged from types/database.ts and types/user-preferences.ts

// Re-export shared types for backward compatibility
export type {
  Parcelle,
  CreateProductInput,
  UpdateProductInput,
  CreateParcelleInput,
  UpdateParcelleInput,
  CreateParcelleInput as CreateParcelleData,
  UpdateParcelleInput as UpdateParcelleData,
} from './entities';

// Local import used to build a compatibility alias below
import type { Product } from './entities';

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

// Import types and enums for interface definitions
import type { UserPreferences, UserAction } from './entities';
import { RiskTolerance } from './entities';

// Re-export shared types for consistency
export type {
  UserPreferences,
  UserAction,
  RiskTolerance
} from './entities';

// Legacy interface for backward compatibility
export interface LegacyUserPreferences {
  id?: string;
  userId: string;
  objectives: Array<'profit' | 'volume' | 'speed' | 'market-share'>;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  preferredInsightTypes: Array<'trends' | 'opportunities' | 'risks' | 'competitive'>;
  customFilters: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface LegacyUserAction {
  id?: string;
  userId: string;
  actionType: 'view_insight' | 'follow_recommendation' | 'ignore_recommendation' | 'export_analysis' | 'save_analysis' | 'share_analysis' | 'feedback';
  actionData: Record<string, unknown>;
  timestamp: string;
  context?: {
    analysisId?: string;
    insightType?: string;
    recommendationType?: string;
    feedbackType?: string;
    rating?: string;
  };
}

export interface UserPreferencesService {
  getUserPreferences(userId: string): Promise<UserPreferences>;
  updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void>;
  createDefaultPreferences(userId: string): Promise<UserPreferences>;
  validatePreferences(preferences: Partial<UserPreferences>): boolean;
  learnFromUserActions(userId: string, action: UserAction): Promise<void>;
}

export interface PreferenceLearning {
  userId: string;
  learnedPreferences: Partial<UserPreferences>;
  confidence: number;
  basedOnActions: number;
  lastUpdated: string;
}

// Default preferences for new users
export const DEFAULT_USER_PREFERENCES: Omit<UserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  objectives: ['profit'],
  riskTolerance: RiskTolerance.MODERATE,
  preferredInsightTypes: ['trends', 'opportunities'],
  customFilters: {},
};