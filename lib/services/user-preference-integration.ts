import { userPreferencesService } from './user-preferences';
import { aiLearningService } from './ai-learning';
import { UserAction, UserPreferences } from '../../types/user-preferences';

/**
 * Service d'intégration qui coordonne les préférences utilisateur et l'apprentissage IA
 */
export class UserPreferenceIntegrationService {
  /**
   * Enregistre une action utilisateur et déclenche l'apprentissage automatique
   */
  async recordUserAction(userId: string, action: UserAction): Promise<void> {
    try {
      // Enregistrer l'action
      await userPreferencesService.learnFromUserActions(userId, action);

      // Analyser le comportement et mettre à jour les préférences si nécessaire
      const learning = await aiLearningService.analyzeUserBehavior(userId);
      await aiLearningService.updatePreferencesFromLearning(userId, learning);
    } catch (error) {
      console.error('Error recording user action:', error);
      throw new Error('Failed to record user action and update preferences');
    }
  }

  /**
   * Obtient les préférences utilisateur avec des insights personnalisés
   */
  async getUserPreferencesWithInsights(userId: string, baseInsights: any[] = []): Promise<{
    preferences: UserPreferences;
    personalizedInsights: any[];
    qualityMetrics: any;
  }> {
    try {
      const [preferences, personalizedInsights, qualityMetrics] = await Promise.all([
        userPreferencesService.getUserPreferences(userId),
        aiLearningService.generatePersonalizedInsights(userId, baseInsights),
        aiLearningService.getRecommendationQuality(userId),
      ]);

      return {
        preferences,
        personalizedInsights,
        qualityMetrics,
      };
    } catch (error) {
      console.error('Error getting user preferences with insights:', error);
      throw new Error('Failed to get user preferences with insights');
    }
  }

  /**
   * Met à jour les préférences utilisateur avec validation et apprentissage
   */
  async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<void> {
    try {
      // Mettre à jour les préférences
      await userPreferencesService.updatePreferences(userId, updates);

      // Enregistrer cette action comme feedback implicite
      const updateAction: UserAction = {
        userId,
        actionType: 'view_insight',
        actionData: {
          type: 'preference_update',
          updates,
        },
        timestamp: new Date().toISOString(),
        context: {
          // use an allowed property from the UserAction context type
          insightType: 'preference_update',
        },
      };

      await userPreferencesService.learnFromUserActions(userId, updateAction);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new Error('Failed to update user preferences');
    }
  }

  /**
   * Obtient un rapport complet sur l'utilisation et les préférences de l'utilisateur
   */
  async getUserAnalyticsReport(userId: string): Promise<{
    preferences: UserPreferences;
    actionStats: any;
    qualityMetrics: any;
    behaviorAnalysis: any;
    recommendations: string[];
  }> {
    try {
      const [preferences, actionStats, qualityMetrics, behaviorAnalysis] = await Promise.all([
        userPreferencesService.getUserPreferences(userId),
        userPreferencesService.getUserActionStats(userId),
        aiLearningService.getRecommendationQuality(userId),
        aiLearningService.analyzeUserBehavior(userId),
      ]);

      const recommendations = this.generateUserRecommendations(
        preferences,
        actionStats,
        qualityMetrics,
        behaviorAnalysis
      );

      return {
        preferences,
        actionStats,
        qualityMetrics,
        behaviorAnalysis,
        recommendations,
      };
    } catch (error) {
      console.error('Error getting user analytics report:', error);
      throw new Error('Failed to get user analytics report');
    }
  }

  /**
   * Génère des recommandations pour améliorer l'expérience utilisateur
   */
  private generateUserRecommendations(
    preferences: UserPreferences,
    actionStats: any,
    qualityMetrics: any,
    behaviorAnalysis: any
  ): string[] {
    const recommendations: string[] = [];

    // Recommandations basées sur l'activité
    if (actionStats.averageActionsPerDay < 0.5) {
      recommendations.push('Considérez explorer plus régulièrement les insights pour améliorer vos analyses.');
    }

    // Recommandations basées sur la qualité des recommandations
    if (qualityMetrics.followRate < 0.3) {
      recommendations.push('Vos préférences pourraient être affinées pour des recommandations plus pertinentes.');
    }

    // Recommandations basées sur les types d\'insights
    if (preferences.preferredInsightTypes.length < 2) {
      recommendations.push('Explorez différents types d\'insights pour une analyse plus complète.');
    }

    // Recommandations basées sur la tolérance au risque
    if (preferences.riskTolerance === 'conservative' && qualityMetrics.followRate > 0.8) {
      recommendations.push('Vous pourriez bénéficier d\'une approche légèrement plus agressive.');
    }

    // Recommandations basées sur l'apprentissage
    if (behaviorAnalysis.confidence > 0.7) {
      recommendations.push('Vos préférences ont été automatiquement optimisées basées sur votre utilisation.');
    }

    return recommendations;
  }
}

// Export singleton instance
export const userPreferenceIntegrationService = new UserPreferenceIntegrationService();