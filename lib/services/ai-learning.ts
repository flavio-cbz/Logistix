import { databaseService } from "../services/database/db";
import { userPreferencesService } from "../services/user-preferences-modern";
import {
  UserPreferences,
  UserAction,
  PreferenceLearning,
} from "../../types/user-preferences";
import { UserActionType, RiskTolerance } from "../../lib/types/entities";

// Define missing interfaces based on their usage in the code

export interface RecommendationQualityMetrics {
  totalRecommendations: number;
  followedRecommendations: number;
  ignoredRecommendations: number;
  followRate: number;
  averageTimeToAction: number; // in hours
  qualityScore: number; // 0-1
  improvementSuggestions: string[];
}

export interface UserFeedback {
  recommendationId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback:
    | "helpful"
    | "not_helpful"
    | "irrelevant"
    | "too_complex"
    | "too_simple";
  comment?: string;
  timestamp: string;
}

export interface LearningPattern {
  pattern: string;
  confidence: number;
  frequency: number;
  lastSeen: string;
  impact: "high" | "medium" | "low";
}

export interface AILearningService {
  analyzeUserBehavior(
    userId: string,
    timeframeDays?: number,
  ): Promise<PreferenceLearning>;
  updatePreferencesFromLearning(
    userId: string,
    learning: PreferenceLearning,
  ): Promise<void>;
  getRecommendationQuality(
    userId: string,
  ): Promise<RecommendationQualityMetrics>;
  adaptToUserFeedback(userId: string, feedback: UserFeedback): Promise<void>;
  generatePersonalizedInsights(
    userId: string,
    baseInsights: any[],
  ): Promise<any[]>;
}

export class AILearningServiceImpl implements AILearningService {
  /**
   * Analyse le comportement utilisateur pour identifier des patterns d'apprentissage
   */
  async analyzeUserBehavior(
    userId: string,
    timeframeDays: number = 30,
  ): Promise<PreferenceLearning> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeframeDays);

      const actions = await databaseService.query<UserAction>(
        `
        SELECT * FROM user_actions
        WHERE user_id = ? AND timestamp >= ?
        ORDER BY timestamp DESC
      `,
        [userId, startDate.toISOString()],
      );

      if (!actions || actions.length < 3) {
        return {
          userId,
          learnedPreferences: {},
          confidence: 0,
          basedOnActions: (actions && actions.length) || 0,
          lastUpdated: new Date().toISOString(),
        };
      }

      const patterns = this.identifyBehaviorPatterns(actions);
      const learnedPreferences = this.derivePreferencesFromPatterns(patterns);
      const confidence = this.calculateConfidence(patterns, actions.length);

      return {
        userId,
        learnedPreferences,
        confidence,
        basedOnActions: actions.length,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error("Failed to analyze user behavior");
    }
  }

  /**
   * Met à jour les préférences utilisateur basées sur l'apprentissage IA
   */
  async updatePreferencesFromLearning(
    userId: string,
    learning: PreferenceLearning,
  ): Promise<void> {
    try {
      if (learning.confidence < 0.6) {
        // Confiance trop faible pour mettre à jour les préférences
        return;
      }

      const currentPreferences =
        await userPreferencesService.getUserPreferences(userId);
      const updatedPreferences = this.mergePreferences(
        currentPreferences,
        learning.learnedPreferences,
      );

      await userPreferencesService.updatePreferences(
        userId,
        updatedPreferences,
      );
    } catch (error) {
      throw new Error("Failed to update preferences from learning");
    }
  }

  /**
   * Retourne des métriques de qualité des recommandations pour un utilisateur
   */
  async getRecommendationQuality(
    userId: string,
    timeframeDays: number = 30,
  ): Promise<RecommendationQualityMetrics> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - timeframeDays);

      const actions = await databaseService.query<UserAction>(
        `
        SELECT * FROM user_actions
        WHERE user_id = ? AND timestamp >= ?
      `,
        [userId, thirtyDaysAgo.toISOString()],
      );

      const followedActions = (actions || []).filter(
        (_a: UserAction) => _a.actionType === "follow_recommendation",
      );
      const ignoredActions = (actions || []).filter(
        (_a: UserAction) => _a.actionType === "ignore_recommendation",
      );

      const totalRecommendations =
        followedActions.length + ignoredActions.length;
      const followRate =
        totalRecommendations > 0
          ? followedActions.length / totalRecommendations
          : 0;

      // Calculer le temps moyen d'action
      const averageTimeToAction = this.calculateAverageTimeToAction(
        actions || [],
      );

      // Score de qualité basé sur plusieurs facteurs
      const qualityScore = this.calculateQualityScore(
        followRate,
        averageTimeToAction,
        actions || [],
      );

      const improvementSuggestions = this.generateImprovementSuggestions(
        followRate,
        averageTimeToAction,
        actions || [],
      );

      return {
        totalRecommendations,
        followedRecommendations: followedActions.length,
        ignoredRecommendations: ignoredActions.length,
        followRate,
        averageTimeToAction,
        qualityScore,
        improvementSuggestions,
      };
    } catch (error) {
      throw new Error("Failed to get recommendation quality metrics");
    }
  }

  /**
   * Adapte le système basé sur le feedback utilisateur
   */
  async adaptToUserFeedback(
    userId: string,
    feedback: UserFeedback,
  ): Promise<void> {
    try {
            // Enregistrer le feedback comme action utilisateur
      const feedbackAction: UserAction = {
        id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        actionType: UserActionType.FEEDBACK,
        actionData: {
          recommendationId: feedback.recommendationId,
          rating: feedback.rating,
          feedback: feedback.feedback,
          comment: feedback.comment,
        },
        timestamp: feedback.timestamp,
        context: {
          source: "ai_recommendation",
          recommendationId: feedback.recommendationId,
        },
        createdAt: new Date().toISOString(),
      };

      await userPreferencesService.learnFromUserActions(userId, feedbackAction);

      // Analyser le feedback pour ajuster les préférences
      await this.processFeedbackForLearning(userId, feedback);
    } catch (error) {
      throw new Error("Failed to adapt to user feedback");
    }
  }

  /**
   * Génère des insights personnalisés pour l'utilisateur
   */
  async generatePersonalizedInsights(
    userId: string,
    baseInsights: any[],
  ): Promise<any[]> {
    try {
      const preferences =
        await userPreferencesService.getUserPreferences(userId);
      // Optionnel : utiliser l'analyse comportementale pour priorisation
      // const _behavior = await this.analyzeUserBehavior(userId, 30);

      const results = (baseInsights || [])
        .filter((insight) => this.isInsightRelevant(insight, preferences))
        .map((insight) => this.personalizeInsight(insight, preferences))
        .sort(
          (a, b) =>
            this.calculateInsightPriority(b, preferences) -
            this.calculateInsightPriority(a, preferences),
        );

      return results;
    } catch (error) {
      throw new Error("Failed to generate personalized insights");
    }
  }

  /**
   * Identifie les patterns comportementaux dans les actions utilisateur
   */
  private identifyBehaviorPatterns(actions: UserAction[]): LearningPattern[] {
    const patterns: LearningPattern[] = [];

    // Pattern 1: Types d'insights préférés
    const insightViews = actions.filter((a) => a.actionType === "view_insight");
    if (insightViews.length > 0) {
      const insightTypeCounts: Record<string, number> = {};
      insightViews.forEach((action) => {
        let context: any = {};
        try {
          context =
            typeof action.context === "string"
              ? JSON.parse(action.context)
              : action.context || {};
        } catch {
          context = {};
        }
        if (context && context.insightType) {
          insightTypeCounts[context.insightType] =
            (insightTypeCounts[context.insightType] || 0) + 1;
        }
      });

      Object.entries(insightTypeCounts).forEach(([type, count]) => {
        patterns.push({
          pattern: `prefers_${type}_insights`,
          confidence: Math.min(count / insightViews.length, 1),
          frequency: count,
          lastSeen: insightViews[0].timestamp,
          impact:
            count > insightViews.length * 0.5
              ? "high"
              : count > insightViews.length * 0.2
                ? "medium"
                : "low",
        });
      });
    }

    // Pattern 2: Comportement de suivi des recommandations
    const recommendationActions = actions.filter(
      (a) =>
        a.actionType === "follow_recommendation" ||
        a.actionType === "ignore_recommendation",
    );

    if (recommendationActions.length > 0) {
      const followRate =
        recommendationActions.filter(
          (a) => a.actionType === "follow_recommendation",
        ).length / recommendationActions.length;
      patterns.push({
        pattern: `recommendation_follow_rate_${followRate > 0.7 ? "high" : followRate > 0.3 ? "medium" : "low"}`,
        confidence: Math.min(recommendationActions.length / 10, 1),
        frequency: recommendationActions.length,
        lastSeen: recommendationActions[0].timestamp,
        impact: "high",
      });
    }

    // Pattern 3: Fréquence d'utilisation
    const daysSinceFirst =
      actions.length > 0
        ? (new Date().getTime() -
            new Date(actions[actions.length - 1].timestamp).getTime()) /
          (1000 * 60 * 60 * 24)
        : 0;

    if (daysSinceFirst > 0) {
      const actionsPerDay = actions.length / daysSinceFirst;
      patterns.push({
        pattern: `usage_frequency_${actionsPerDay > 2 ? "high" : actionsPerDay > 0.5 ? "medium" : "low"}`,
        confidence: Math.min(actions.length / 20, 1),
        frequency: actions.length,
        lastSeen: actions[0].timestamp,
        impact: actionsPerDay > 1 ? "high" : "medium",
      });
    }

    return patterns;
  }

  /**
   * Dérive les préférences des patterns identifiés
   */
  private derivePreferencesFromPatterns(
    patterns: LearningPattern[],
  ): Partial<UserPreferences> {
    const preferences: Partial<UserPreferences> = {};

    // Dériver les types d'insights préférés
    const insightPatterns = patterns.filter(
      (p) =>
        p.pattern.startsWith("prefers_") && p.pattern.endsWith("_insights"),
    );
    if (insightPatterns.length > 0) {
      const preferredTypes = insightPatterns
        .filter((p) => p.confidence > 0.3)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
        .map((p) => p.pattern.replace("prefers_", "").replace("_insights", ""));

      if (preferredTypes.length > 0) {
        preferences.preferredInsightTypes = preferredTypes as any; // Cast to any for now, as types are more specific in UserPreferences
      }
    }

    // Dériver la tolérance au risque
    const followRatePattern = patterns.find((p) =>
      p.pattern.startsWith("recommendation_follow_rate_"),
    );
    if (followRatePattern && followRatePattern.confidence > 0.5) {
      if (followRatePattern.pattern.includes("high")) {
        preferences.riskTolerance = RiskTolerance.AGGRESSIVE;
      } else if (followRatePattern.pattern.includes("low")) {
        preferences.riskTolerance = RiskTolerance.CONSERVATIVE;
      } else {
        preferences.riskTolerance = RiskTolerance.MODERATE;
      }
    }

    // Dériver les objectifs basés sur la fréquence d'utilisation
    const usagePattern = patterns.find((p) =>
      p.pattern.startsWith("usage_frequency_"),
    );
    if (usagePattern && usagePattern.confidence > 0.5) {
      if (usagePattern.pattern.includes("high")) {
        preferences.objectives = ["profit", "market-share"];
      } else if (usagePattern.pattern.includes("medium")) {
        preferences.objectives = ["profit", "volume"];
      } else {
        preferences.objectives = ["profit"];
      }
    }

    return preferences;
  }

  /**
   * Calcule la confiance basée sur les patterns et le nombre d'actions
   */
  private calculateConfidence(
    patterns: LearningPattern[],
    actionCount: number,
  ): number {
    if (!patterns || patterns.length === 0 || actionCount < 5) {
      return 0;
    }

    const avgPatternConfidence =
      patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    const actionCountFactor = Math.min(actionCount / 50, 1); // Normaliser sur 50 actions
    const highImpactPatterns = patterns.filter(
      (p) => p.impact === "high",
    ).length;
    const impactFactor = Math.min(highImpactPatterns / 3, 1); // Normaliser sur 3 patterns à fort impact

    return (
      avgPatternConfidence * 0.5 + actionCountFactor * 0.3 + impactFactor * 0.2
    );
  }

  /**
   * Fusionne les préférences existantes avec les préférences apprises
   */
  private mergePreferences(
    current: UserPreferences,
    learned: Partial<UserPreferences>,
  ): Partial<UserPreferences> {
    const merged: Partial<UserPreferences> = { ...current }; // Start with current preferences

    // Fusionner les objectifs
    if (learned.objectives) {
      const combinedObjectives = [
        ...new Set([...(current.objectives || []), ...learned.objectives]),
      ];
      merged.objectives = combinedObjectives.slice(
        0,
        3,
      ) as UserPreferences["objectives"]; // Limiter à 3 objectifs et caster
    }

    // Mettre à jour la tolérance au risque si présente dans learned
    if (learned.riskTolerance) {
      merged.riskTolerance = learned.riskTolerance;
    }

    // Fusionner les types d'insights préférés
    if (learned.preferredInsightTypes) {
      const combinedTypes = [
        ...new Set([
          ...(current.preferredInsightTypes || []),
          ...learned.preferredInsightTypes,
        ]),
      ];
      merged.preferredInsightTypes = combinedTypes.slice(
        0,
        4,
      ) as UserPreferences["preferredInsightTypes"]; // Limiter à 4 types et caster
    }

    // Fusionner les paramètres de notification (si existe et est un objet)
    if (
      learned.notificationSettings &&
      typeof learned.notificationSettings === "object"
    ) {
      merged.notificationSettings = {
        ...(current.notificationSettings || {}),
        ...learned.notificationSettings,
      };
    }

    // Fusionner les filtres personnalisés (si existe et est un objet)
    if (learned.customFilters && typeof learned.customFilters === "object") {
      merged.customFilters = {
        ...(current.customFilters || {}),
        ...learned.customFilters,
      };
    }

    return merged;
  }

  /**
   * Calcule le temps moyen d'action en heures
   */
  private calculateAverageTimeToAction(actions: UserAction[]): number {
    const actionPairs: number[] = [];

    for (let i = 0; i < (actions ? actions.length - 1 : 0); i++) {
      const current = actions[i]!;
      const next = actions[i + 1]!;

      if (
        current.actionType === "view_insight" &&
        (next.actionType === "follow_recommendation" ||
          next.actionType === "ignore_recommendation")
      ) {
        const timeDiff =
          new Date(next.timestamp).getTime() -
          new Date(current.timestamp).getTime();
        actionPairs.push(Math.abs(timeDiff) / (1000 * 60 * 60)); // Convertir en heures
      }
    }

    return actionPairs.length > 0
      ? actionPairs.reduce((sum, time) => sum + time, 0) / actionPairs.length
      : 0;
  }

  /**
   * Calcule un score de qualité global
   */
  private calculateQualityScore(
    followRate: number,
    avgTimeToAction: number,
    actions: UserAction[],
  ): number {
    // Score basé sur le taux de suivi (0.4 de poids)
    const followScore = followRate;

    // Score basé sur le temps de réaction (0.3 de poids) - plus rapide = mieux
    const timeScore =
      avgTimeToAction > 0 ? Math.max(0, 1 - avgTimeToAction / 24) : 0.5;

    // Score basé sur l'engagement (0.3 de poids)
    const engagementScore = Math.min((actions || []).length / 50, 1);

    return followScore * 0.4 + timeScore * 0.3 + engagementScore * 0.3;
  }

  /**
   * Génère des suggestions d'amélioration
   */
  private generateImprovementSuggestions(
    followRate: number,
    avgTimeToAction: number,
    actions: UserAction[],
  ): string[] {
    const suggestions: string[] = [];

    if (followRate < 0.3) {
      suggestions.push(
        "Les recommandations semblent peu pertinentes. Considérer une personnalisation plus poussée.",
      );
    }

    if (avgTimeToAction > 12) {
      suggestions.push(
        "Les utilisateurs prennent du temps à agir. Simplifier les recommandations.",
      );
    }

    if ((actions || []).length < 10) {
      suggestions.push(
        "Engagement faible. Améliorer la présentation des insights.",
      );
    }

    const exportActions = (actions || []).filter(
      (a) => a.actionType === "export_analysis",
    );
    if (exportActions.length === 0) {
      suggestions.push(
        "Aucun export détecté. Promouvoir les fonctionnalités d'export.",
      );
    }

    return suggestions;
  }

  /**
   * Traite le feedback pour l'apprentissage
   */
  private async processFeedbackForLearning(
    userId: string,
    feedback: UserFeedback,
  ): Promise<void> {
    // Ajuster les préférences basées sur le feedback
    const currentPrefs =
      await userPreferencesService.getUserPreferences(userId);
    const adjustments: Partial<UserPreferences> = {};

    if (feedback.rating <= 2) {
      // Feedback négatif - ajuster les paramètres de notification
      if (feedback.feedback === "irrelevant") {
        adjustments.notificationSettings = {
          ...currentPrefs.notificationSettings,
          opportunities: false,
        };
      }
    } else if (feedback.rating >= 4) {
      // Feedback positif - renforcer les préférences actuelles (aucun changement nécessaire par défaut)
    }

    if (Object.keys(adjustments).length > 0) {
      await userPreferencesService.updatePreferences(userId, adjustments);
    }
  }

  /**
   * Détermine si un insight est pertinent pour l'utilisateur
   */
  private isInsightRelevant(
    insight: any,
    preferences: UserPreferences,
  ): boolean {
    if (!insight || !preferences) return true;
    if (
      !insight.type ||
      !preferences.preferredInsightTypes ||
      preferences.preferredInsightTypes.length === 0
    ) {
      return true; // Par défaut, inclure l'insight
    }
    return preferences.preferredInsightTypes.includes(insight.type);
  }

  /**
   * Personnalise un insight selon les préférences utilisateur
   */
  private personalizeInsight(insight: any, preferences: UserPreferences): any {
    const personalized = { ...insight };

    // Ajuster le niveau de détail basé sur la tolérance au risque
    if (preferences.riskTolerance === "conservative") {
      personalized.confidence = Math.min(personalized.confidence || 0.5, 0.8);
      personalized.riskWarning = true;
    } else if (preferences.riskTolerance === "aggressive") {
      personalized.confidence = Math.max(personalized.confidence || 0.5, 0.6);
      personalized.opportunityFocus = true;
    }

    // Ajuster basé sur les objectifs
    if (preferences.objectives && preferences.objectives.includes("profit")) {
      personalized.profitImpact = true;
    }

    if (preferences.objectives && preferences.objectives.includes("volume")) {
      personalized.volumeImpact = true;
    }

    return personalized;
  }

  /**
   * Calcule la priorité d'un insight pour l'utilisateur
   */
  private calculateInsightPriority(
    insight: any,
    preferences: UserPreferences,
  ): number {
    let priority =
      insight && insight.basePriority !== undefined
        ? insight.basePriority
        : 0.5;

    if (
      preferences &&
      preferences.preferredInsightTypes &&
      insight &&
      insight.type &&
      preferences.preferredInsightTypes.includes(insight.type)
    ) {
      priority += 0.3;
    }

    if (preferences && preferences.objectives && insight) {
      if (preferences.objectives.includes("profit") && insight.profitImpact) {
        priority += 0.2;
      }
      if (preferences.objectives.includes("volume") && insight.volumeImpact) {
        priority += 0.2;
      }
    }

    return Math.min(priority, 1);
  }
}

// Export singleton instance
export const aiLearningService = new AILearningServiceImpl();
