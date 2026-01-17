import { v4 as uuidv4 } from "uuid";
import { databaseService } from "@/lib/database";
import { logger } from "../utils/logging/logger";
import { RiskTolerance, UserActionType } from "@/lib/types/entities";

// Types inlined from deleted lib/types/legacy.ts
interface UserPreferences {
  id: string;
  userId: string;
  objectives?: string[];
  riskTolerance: RiskTolerance;
  preferredInsightTypes?: string[];
  customFilters?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface IUserPreferencesService {
  getUserPreferences(userId: string): Promise<UserPreferences>;
  updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void>;
  createDefaultPreferences(userId: string): Promise<UserPreferences>;
  recordUserAction(userId: string, actionType: UserActionType, actionData: Record<string, unknown>): Promise<void>;
  analyzeUserBehavior(userId: string): Promise<PreferenceLearning>;
  validatePreferences(preferences: Partial<UserPreferences>): boolean;
}

interface PreferenceLearning {
  userId: string;
  learnedPreferences: Partial<UserPreferences>;
  confidence: number;
  basedOnActions: number;
  lastUpdated: string;
}

const DEFAULT_USER_PREFERENCES: Omit<UserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  objectives: [],
  riskTolerance: RiskTolerance.MODERATE,
  preferredInsightTypes: [],
  customFilters: {},
};

/**
 * Service moderne de gestion des préférences utilisateur
 * Utilise databaseService pour toutes les opérations DB
 */
export class UserPreferencesService implements IUserPreferencesService {
  /**
   * Récupère les préférences utilisateur ou crée des préférences par défaut
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      logger.info(`Getting user preferences for user: ${userId}`);

      const result = await databaseService.queryOne<{
        id: string;
        user_id: string;
        objectives?: string | null;
        risk_tolerance: string;
        preferred_insight_types?: string | null;
        custom_filters?: string | null;
        created_at: string;
        updated_at: string;
      }>(
        'SELECT * FROM user_preferences WHERE user_id = ?',
        [userId],
        'get-user-preferences'
      );

      if (!result) {
        // Créer des préférences par défaut si elles n'existent pas
        logger.info(`No preferences found for user ${userId}, creating defaults`);
        return await this.createDefaultPreferences(userId);
      }

      return {
        id: result.id,
        userId: result.user_id,
        objectives: this.safeJsonParse(result.objectives) as string[],
        riskTolerance: result.risk_tolerance as RiskTolerance,
        preferredInsightTypes: this.safeJsonParse(result.preferred_insight_types) as string[],
        customFilters: this.safeJsonParse(result.custom_filters) as Record<string, unknown>,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      };
    } catch (error) {
      logger.error(`Failed to retrieve user preferences for ${userId}:`, { error, userId });
      throw new Error("Failed to retrieve user preferences");
    }
  }

  /**
   * Met à jour les préférences utilisateur
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>,
  ): Promise<void> {
    try {
      // Valider les préférences
      if (!this.validatePreferences(preferences)) {
        throw new Error("Invalid preferences provided");
      }

      const now = new Date().toISOString();

      // Construire la requête de mise à jour dynamiquement
      const updates: string[] = [];
      const params: unknown[] = [];

      if (preferences.objectives !== undefined) {
        updates.push('objectives = ?');
        params.push(JSON.stringify(preferences.objectives));
      }

      if (preferences.riskTolerance !== undefined) {
        updates.push('risk_tolerance = ?');
        params.push(preferences.riskTolerance);
      }

      if (preferences.preferredInsightTypes !== undefined) {
        updates.push('preferred_insight_types = ?');
        params.push(JSON.stringify(preferences.preferredInsightTypes));
      }

      if (preferences.customFilters !== undefined) {
        updates.push('custom_filters = ?');
        params.push(JSON.stringify(preferences.customFilters));
      }

      if (updates.length === 0) {
        logger.warn(`No valid updates provided for user ${userId}`);
        return;
      }

      updates.push('updated_at = ?');
      params.push(now);
      params.push(userId);

      const sql = `
        UPDATE user_preferences 
        SET ${updates.join(', ')}
        WHERE user_id = ?
      `;

      await databaseService.execute(sql, params, 'update-user-preferences');
      logger.info(`Updated preferences for user: ${userId}`);
    } catch (error) {
      logger.error(`Failed to update preferences for user ${userId}:`, { error, userId });
      throw new Error("Failed to update preferences");
    }
  }

  /**
   * Crée des préférences par défaut pour un utilisateur
   */
  async createDefaultPreferences(userId: string): Promise<UserPreferences> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      const preferences: UserPreferences = {
        id,
        userId,
        ...DEFAULT_USER_PREFERENCES,
        createdAt: now,
        updatedAt: now,
      };

      await databaseService.execute(
        `INSERT INTO user_preferences (
          id, user_id, objectives, risk_tolerance, preferred_insight_types,
          custom_filters, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          JSON.stringify(preferences.objectives),
          preferences.riskTolerance,
          JSON.stringify(preferences.preferredInsightTypes),
          JSON.stringify(preferences.customFilters),
          now,
          now,
        ],
        'create-default-preferences'
      );

      logger.info(`Created default preferences for user: ${userId}`);
      return preferences;
    } catch (error) {
      logger.error(`Failed to create default preferences for user ${userId}:`, { error, userId });
      throw new Error("Failed to create default preferences");
    }
  }

  /**
   * Enregistre une action utilisateur pour l'apprentissage des préférences
   */
  async recordUserAction(
    userId: string,
    actionType: UserActionType,
    actionData: Record<string, unknown>,
  ): Promise<void> {
    try {
      const id = uuidv4();
      const timestamp = new Date().toISOString();

      await databaseService.execute(
        `INSERT INTO user_actions (
          id, user_id, action_type, action_data, timestamp
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          actionType,
          JSON.stringify(actionData),
          timestamp,
        ],
        'record-user-action'
      );

      logger.debug(`Recorded action ${actionType} for user: ${userId}`);
    } catch (error) {
      logger.error(`Failed to record user action for ${userId}:`, { error, userId });
      throw new Error("Failed to record user action");
    }
  }

  /**
   * Analyse les actions utilisateur pour apprendre les préférences
   */
  async analyzeUserBehavior(userId: string): Promise<PreferenceLearning> {
    try {
      // Récupérer les actions des 30 derniers jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentActions = await databaseService.query<{
        action_type: string;
        action_data: string;
        timestamp: string;
      }>(
        `SELECT action_type, action_data, timestamp 
         FROM user_actions 
         WHERE user_id = ? AND timestamp >= ?
         ORDER BY timestamp DESC`,
        [userId, thirtyDaysAgo.toISOString()],
        'analyze-user-behavior'
      );

      const actionCounts: Record<string, number> = {};
      const categoryInterests: Record<string, number> = {};
      const priceRangePreferences: { min: number; max: number; count: number }[] = [];

      for (const action of recentActions) {
        actionCounts[action.action_type] = (actionCounts[action.action_type] || 0) + 1;

        try {
          const data = JSON.parse(action.action_data);

          // Analyser les intérêts par catégorie
          if (data.category) {
            categoryInterests[data.category] = (categoryInterests[data.category] || 0) + 1;
          }

          // Analyser les préférences de prix
          if (data.price && typeof data.price === 'number') {
            priceRangePreferences.push({ min: data.price, max: data.price, count: 1 });
          }
        } catch (error) {
          logger.warn(`Failed to parse action data for user ${userId}:`, { error, userId });
        }
      }

      const mostActiveCategories = Object.entries(categoryInterests)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category]) => category);

      const priceRange = this.calculatePreferredPriceRange(priceRangePreferences);
      const riskIndicators = this.analyzeRiskTolerance(actionCounts);

      const learnedPrefs: Partial<UserPreferences> = {
        preferredInsightTypes: mostActiveCategories,
        customFilters: {
          categories: mostActiveCategories,
          priceRange,
          riskIndicators,
        },
      };

      return {
        userId,
        learnedPreferences: learnedPrefs,
        confidence: Math.min(recentActions.length / 50, 1), // Plus d'actions = plus de confiance
        basedOnActions: recentActions.length,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to analyze user behavior for ${userId}:`, { error, userId });
      throw new Error("Failed to analyze user behavior");
    }
  }

  /**
   * Valide les préférences utilisateur
   */
  validatePreferences(preferences: Partial<UserPreferences>): boolean {
    // Validation basique - peut être étendue
    if (preferences.riskTolerance &&
      !Object.values(RiskTolerance).includes(preferences.riskTolerance)) {
      return false;
    }

    return true;
  }

  /**
   * Parse JSON de manière sécurisée
   */
  private safeJsonParse(jsonString?: string | null): unknown {
    if (!jsonString) return undefined;
    try {
      return JSON.parse(jsonString);
    } catch {
      return undefined;
    }
  }

  /**
   * Calcule la gamme de prix préférée
   */
  private calculatePreferredPriceRange(
    priceData: { min: number; max: number; count: number }[]
  ): { min: number; max: number } {
    if (priceData.length === 0) {
      return { min: 0, max: 100 };
    }

    const prices = priceData.flatMap(p => Array(p.count).fill((p.min + p.max) / 2));
    prices.sort((a, b) => a - b);

    const percentile25 = prices[Math.floor(prices.length * 0.25)] || 0;
    const percentile75 = prices[Math.floor(prices.length * 0.75)] || 100;

    return { min: percentile25, max: percentile75 };
  }

  /**
   * Analyse la tolérance au risque basée sur les actions
   */
  private analyzeRiskTolerance(actionCounts: Record<string, number>): string[] {
    const indicators: string[] = [];

    if ((actionCounts['view_high_value_items'] || 0) > 5) {
      indicators.push('high_value_interest');
    }

    if ((actionCounts['quick_purchase'] || 0) > (actionCounts['detailed_analysis'] || 0)) {
      indicators.push('impulsive_behavior');
    }

    if ((actionCounts['price_comparison'] || 0) > 10) {
      indicators.push('price_conscious');
    }

    return indicators;
  }

  /**
   * Apprend à partir des actions utilisateur
   */
  async learnFromUserActions(userId: string, action: unknown): Promise<void> {
    try {
      if (typeof action === 'object' && action !== null) {
        const actionRecord = action as Record<string, unknown>;
        logger.info('Learning from user action:', {
          userId,
          actionType: actionRecord['type'],
          timestamp: actionRecord['timestamp']
        });
      }

      // Cette méthode pourrait être implémentée pour enregistrer et analyser
      // les actions utilisateur pour améliorer les préférences automatiquement
      // Pour l'instant, nous la laissons comme placeholder

    } catch (error) {
      logger.error('Error learning from user action:', { error, userId });
    }
  }
}

// Export du service singleton
export const userPreferencesService = new UserPreferencesService();