import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from './database/drizzle-client';
import { userPreferences, userActions } from './database/drizzle-schema';
import { 
  UserPreferences, 
  UserAction, 
  UserPreferencesService as IUserPreferencesService,
  DEFAULT_USER_PREFERENCES,
  PreferenceLearning
} from '../../types/user-preferences';

export class UserPreferencesService implements IUserPreferencesService {
  /**
   * Récupère les préférences utilisateur ou crée des préférences par défaut
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const result = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);

      if (result.length === 0) {
        // Créer des préférences par défaut si elles n'existent pas
        return await this.createDefaultPreferences(userId);
      }

      const prefs = result[0];
      return {
        id: prefs.id,
        userId: prefs.userId,
        objectives: (typeof prefs.objectives === 'string' ? (() => { try { return JSON.parse(prefs.objectives); } catch { return undefined; } })() : prefs.objectives),
        riskTolerance: prefs.riskTolerance,
        preferredInsightTypes: (typeof prefs.preferredInsightTypes === 'string' ? (() => { try { return JSON.parse(prefs.preferredInsightTypes); } catch { return undefined; } })() : prefs.preferredInsightTypes),
        notificationSettings: (typeof prefs.notificationSettings === 'string' ? (() => { try { return JSON.parse(prefs.notificationSettings); } catch { return undefined; } })() : prefs.notificationSettings),
        customFilters: (typeof prefs.customFilters === 'string' ? (() => { try { return JSON.parse(prefs.customFilters); } catch { return undefined; } })() : prefs.customFilters),
        createdAt: prefs.createdAt,
        updatedAt: prefs.updatedAt,
      };
    } catch (error) {
      throw new Error('Failed to retrieve user preferences');
    }
  }

  /**
   * Met à jour les préférences utilisateur
   */
  async updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    try {
      // Valider les préférences
      if (!this.validatePreferences(preferences)) {
        throw new Error('Invalid preferences provided');
      }

      const now = new Date().toISOString();
      
      // Récupérer les préférences existantes
      const existing = await this.getUserPreferences(userId);
      
      // Fusionner avec les nouvelles préférences
      const updated = {
        ...existing,
        ...preferences,
        updatedAt: now,
      };

      await db
        .update(userPreferences)
        .set({
          objectives: JSON.stringify(updated.objectives),
          riskTolerance: updated.riskTolerance,
          preferredInsightTypes: JSON.stringify(updated.preferredInsightTypes),
          notificationSettings: JSON.stringify(updated.notificationSettings),
          customFilters: JSON.stringify(updated.customFilters),
          updatedAt: now,
        })
        .where(eq(userPreferences.userId, userId));

    } catch (error) {
      throw new Error('Failed to update user preferences');
    }
  }

  /**
   * Crée des préférences par défaut pour un nouvel utilisateur
   */
  async createDefaultPreferences(userId: string): Promise<UserPreferences> {
    try {
      const now = new Date().toISOString();
      const id = uuidv4();

      const defaultPrefs: UserPreferences = {
        id,
        userId,
        ...DEFAULT_USER_PREFERENCES,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(userPreferences).values({
        id,
        userId,
        objectives: JSON.stringify(defaultPrefs.objectives),
        riskTolerance: defaultPrefs.riskTolerance,
        preferredInsightTypes: JSON.stringify(defaultPrefs.preferredInsightTypes),
        notificationSettings: JSON.stringify(defaultPrefs.notificationSettings),
        customFilters: JSON.stringify(defaultPrefs.customFilters),
        createdAt: now,
        updatedAt: now,
      });

      return defaultPrefs;
    } catch (error) {
      throw new Error('Failed to create default preferences');
    }
  }

  /**
   * Valide les préférences utilisateur
   */
  validatePreferences(preferences: Partial<UserPreferences>): boolean {
    try {
      // Valider les objectifs
      if (preferences.objectives) {
        const validObjectives = ['profit', 'volume', 'speed', 'market-share'];
        if (!Array.isArray(preferences.objectives) || 
            !preferences.objectives.every(obj => validObjectives.includes(obj))) {
          return false;
        }
      }

      // Valider la tolérance au risque
      if (preferences.riskTolerance) {
        const validRiskTolerances = ['conservative', 'moderate', 'aggressive'];
        if (!validRiskTolerances.includes(preferences.riskTolerance)) {
          return false;
        }
      }

      // Valider les types d'insights préférés
      if (preferences.preferredInsightTypes) {
        const validInsightTypes = ['trends', 'opportunities', 'risks', 'competitive'];
        if (!Array.isArray(preferences.preferredInsightTypes) || 
            !preferences.preferredInsightTypes.every(type => validInsightTypes.includes(type))) {
          return false;
        }
      }

      // Valider les paramètres de notification
      if (preferences.notificationSettings) {
        const settings = preferences.notificationSettings;
        if (typeof settings !== 'object' ||
            typeof settings.anomalies !== 'boolean' ||
            typeof settings.opportunities !== 'boolean' ||
            typeof settings.priceChanges !== 'boolean') {
          return false;
        }
      }

      // Valider les filtres personnalisés
      if (preferences.customFilters && typeof preferences.customFilters !== 'object') {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Enregistre une action utilisateur pour l'apprentissage IA
   */
  async learnFromUserActions(userId: string, action: UserAction): Promise<void> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      await db.insert(userActions).values({
        id,
        userId,
        actionType: action.actionType,
        actionData: JSON.stringify(action.actionData),
        timestamp: action.timestamp,
        context: action.context ? JSON.stringify(action.context) : null,
        createdAt: now,
      });

      // Déclencher l'adaptation des préférences basée sur les actions
      await this.adaptPreferencesFromActions(userId);
    } catch (error) {
      throw new Error('Failed to record user action');
    }
  }

  /**
   * Adapte les préférences basées sur les actions utilisateur
   */
  private async adaptPreferencesFromActions(userId: string): Promise<void> {
    try {
      // Récupérer les actions récentes de l'utilisateur (30 derniers jours)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentActions = await db
        .select()
        .from(userActions)
        .where(eq(userActions.userId, userId))
        .orderBy(userActions.timestamp);

      if (recentActions.length < 5) {
        // Pas assez d'actions pour adapter les préférences
        return;
      }

      const learning = this.analyzeUserBehavior(recentActions);
      
      if (learning.confidence > 0.7) {
        // Mettre à jour les préférences avec un niveau de confiance élevé
        await this.updatePreferences(userId, learning.learnedPreferences);
      }
    } catch (error) {
      // Ne pas lancer d'erreur pour ne pas bloquer l'enregistrement de l'action
    }
  }

  /**
   * Analyse le comportement utilisateur pour déduire les préférences
   */
  private analyzeUserBehavior(actions: any[]): PreferenceLearning {
    const learning: PreferenceLearning = {
      userId: actions[0]?.userId || '',
      learnedPreferences: {},
      confidence: 0,
      basedOnActions: actions.length,
      lastUpdated: new Date().toISOString(),
    };

    // Analyser les types d'insights les plus consultés
    const insightViews = actions.filter(a => a.actionType === 'view_insight');
    if (insightViews.length > 0) {
      const insightTypeCounts: Record<string, number> = {};
      
      insightViews.forEach(action => {
        const context = (typeof action.context === 'string'
  ? (() => { try { return JSON.parse(action.context); } catch { return {}; } })()
  : (action.context ?? {}));
        if (context.insightType) {
          insightTypeCounts[context.insightType] = (insightTypeCounts[context.insightType] || 0) + 1;
        }
      });

      // Déterminer les types d'insights préférés
      const sortedInsights = Object.entries(insightTypeCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([type]) => type);

      if (sortedInsights.length > 0) {
        learning.learnedPreferences.preferredInsightTypes = sortedInsights as any;
        learning.confidence += 0.3;
      }
    }

    // Analyser les recommandations suivies vs ignorées
    const followedRecommendations = actions.filter(a => a.actionType === 'follow_recommendation');
    const ignoredRecommendations = actions.filter(a => a.actionType === 'ignore_recommendation');
    
    if (followedRecommendations.length + ignoredRecommendations.length > 0) {
      const followRate = followedRecommendations.length / (followedRecommendations.length + ignoredRecommendations.length);
      
      // Déduire la tolérance au risque basée sur le taux de suivi des recommandations
      if (followRate > 0.8) {
        learning.learnedPreferences.riskTolerance = 'aggressive';
      } else if (followRate < 0.3) {
        learning.learnedPreferences.riskTolerance = 'conservative';
      } else {
        learning.learnedPreferences.riskTolerance = 'moderate';
      }
      
      learning.confidence += 0.4;
    }

    // Analyser les exports et partages pour déduire les objectifs
    const exports = actions.filter(a => a.actionType === 'export_analysis');
    const shares = actions.filter(a => a.actionType === 'share_analysis');
    
    if (exports.length > 0 || shares.length > 0) {
      // Les utilisateurs qui exportent/partagent souvent sont probablement orientés business
      learning.learnedPreferences.objectives = ['profit', 'market-share'];
      learning.confidence += 0.3;
    }

    return learning;
  }

  /**
   * Récupère les statistiques d'utilisation pour un utilisateur
   */
  async getUserActionStats(userId: string, days: number = 30): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    mostActiveDay: string;
    averageActionsPerDay: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const actions = await db
        .select()
        .from(userActions)
        .where(eq(userActions.userId, userId));

      const recentActions = actions.filter(action => 
        new Date(action.timestamp) >= startDate
      );

      const actionsByType: Record<string, number> = {};
      const actionsByDay: Record<string, number> = {};

      recentActions.forEach(action => {
        // Compter par type
        actionsByType[action.actionType] = (actionsByType[action.actionType] || 0) + 1;
        
        // Compter par jour
        const day = action.timestamp.split('T')[0];
        actionsByDay[day] = (actionsByDay[day] || 0) + 1;
      });

      const mostActiveDay = Object.entries(actionsByDay)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

      return {
        totalActions: recentActions.length,
        actionsByType,
        mostActiveDay,
        averageActionsPerDay: recentActions.length / days,
      };
    } catch (error) {
      throw new Error('Failed to retrieve user action statistics');
    }
  }
}

// Export singleton instance
export const userPreferencesService = new UserPreferencesService();