// Import types and enums for interface definitions
import type { UserPreferences, UserAction } from '../lib/types/entities';
import { RiskTolerance } from '../lib/types/entities';

// Re-export shared types for consistency
export type { 
  UserPreferences, 
  UserAction, 
  RiskTolerance
} from '../lib/types/entities';

// Legacy interface for backward compatibility
export interface LegacyUserPreferences {
  id?: string;
  userId: string;
  objectives: Array<'profit' | 'volume' | 'speed' | 'market-share'>;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  preferredInsightTypes: Array<'trends' | 'opportunities' | 'risks' | 'competitive'>;
  notificationSettings: {
    anomalies: boolean;
    opportunities: boolean;
    priceChanges: boolean;
  };
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
  notificationSettings: {
    anomalies: true,
    opportunities: true,
    priceChanges: false,
  },
  customFilters: {},
};