/**
 * Configuration AI modifiable depuis l'application
 * Remplace les variables d'environnement par une configuration dynamique
 */

import { databaseService } from "@/lib/services/database/db";

// Déclaration pour étendre l'interface ProcessEnv et inclure les variables d'environnement personnalisées

export interface AISettings {
  // Configuration générale
  enabled: boolean;

  // Configuration des insights
  insights: {
    enabled: boolean;
    maxRetries: number;
    timeout: number;
    model: string;
    temperature: number;
  };

  // Configuration des recommandations
  recommendations: {
    enabled: boolean;
    maxRetries: number;
    timeout: number;
  };

  // Configuration de la qualité
  quality: {
    minDataPoints: number;
    minConfidence: number;
    maxProcessingTime: number;
  };

  // Configuration du cache (en mémoire)
  caching: {
    enabled: boolean;
    ttl: number; // en secondes
    maxSize: number;
  };

  // Configuration du fallback
  fallback: {
    enabled: boolean;
    timeout: number;
  };

  // Configuration des coûts
  costs: {
    maxTokensPerRequest: number;
    maxCostPerRequest: number;
    dailyTokenLimit: number;
  };

  // Configuration OpenAI
  openai: {
    apiKey: string;
    baseURL: string | undefined;
    organization: string | undefined;
  };
}

// Configuration par défaut
export const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: true,

  insights: {
    enabled: true,
    maxRetries: 3,
    timeout: 30000,
    model: "gpt-4",
    temperature: 0.3,
  },

  recommendations: {
    enabled: true,
    maxRetries: 2,
    timeout: 25000,
  },

  quality: {
    minDataPoints: 5,
    minConfidence: 0.6,
    maxProcessingTime: 30000,
  },

  caching: {
    enabled: true,
    ttl: 3600, // 1 heure
    maxSize: 1000,
  },

  fallback: {
    enabled: true,
    timeout: 5000,
  },

  costs: {
    maxTokensPerRequest: 3000,
    maxCostPerRequest: 0.15,
    dailyTokenLimit: 100000,
  },

  openai: {
    apiKey: process.env['OPENAI_API_KEY'] || "",
    baseURL: process.env['OPENAI_BASE_URL'] || undefined,
    organization: process.env['OPENAI_ORGANIZATION'] || undefined,
  },
};

// Cache en mémoire pour les paramètres
let currentSettings: AISettings = { ...DEFAULT_AI_SETTINGS };

/**
 * Gestionnaire de configuration AI
 */
export class AISettingsManager {
  private static instance: AISettingsManager;
  private settings: AISettings;
  private listeners: Array<(settings: AISettings) => void> = [];

  private constructor() {
    this.settings = { ...DEFAULT_AI_SETTINGS };
    this.loadFromDatabase();
  }

  public static getInstance(): AISettingsManager {
    if (!AISettingsManager.instance) {
      AISettingsManager.instance = new AISettingsManager();
    }
    return AISettingsManager.instance;
  }

  /**
   * Obtenir les paramètres actuels
   */
  public getSettings(): AISettings {
    return { ...this.settings };
  }

  /**
   * Mettre à jour les paramètres
   */
  public async updateSettings(newSettings: Partial<AISettings>): Promise<void> {
    const updatedSettings = {
      ...this.settings,
      ...newSettings,
      // Merge nested objects
      insights: { ...this.settings.insights, ...newSettings.insights },
      recommendations: {
        ...this.settings.recommendations,
        ...newSettings.recommendations,
      },
      quality: { ...this.settings.quality, ...newSettings.quality },
      caching: { ...this.settings.caching, ...newSettings.caching },
      fallback: { ...this.settings.fallback, ...newSettings.fallback },
      costs: { ...this.settings.costs, ...newSettings.costs },
      openai: { ...this.settings.openai, ...newSettings.openai },
    };

    // Valider les paramètres
    this.validateSettings(updatedSettings);

    // Sauvegarder en base de données
    await this.saveToDatabase(updatedSettings);

    // Mettre à jour les paramètres en mémoire
    this.settings = updatedSettings;
    currentSettings = { ...updatedSettings };

    // Notifier les listeners
    this.notifyListeners();
  }

  /**
   * Réinitialiser aux paramètres par défaut
   */
  public async resetToDefaults(): Promise<void> {
    await this.updateSettings(DEFAULT_AI_SETTINGS);
  }

  /**
   * Ajouter un listener pour les changements de configuration
   */
  public addListener(listener: (settings: AISettings) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Supprimer un listener
   */
  public removeListener(listener: (settings: AISettings) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Valider les paramètres
   */
  private validateSettings(settings: AISettings): void {
    const errors: string[] = [];

    // Validation des timeouts
    if (settings.insights.timeout < 5000 || settings.insights.timeout > 60000) {
      errors.push("Le timeout des insights doit être entre 5 et 60 secondes");
    }

    if (
      settings.recommendations.timeout < 5000 ||
      settings.recommendations.timeout > 45000
    ) {
      errors.push(
        "Le timeout des recommandations doit être entre 5 et 45 secondes",
      );
    }

    // Validation de la température
    if (
      settings.insights.temperature < 0 ||
      settings.insights.temperature > 2
    ) {
      errors.push("La température doit être entre 0 et 2");
    }

    // Validation des coûts
    if (
      settings.costs.maxCostPerRequest < 0.01 ||
      settings.costs.maxCostPerRequest > 1.0
    ) {
      errors.push("Le coût maximum par requête doit être entre 0.01 et 1.0");
    }

    // Validation de la clé API
    if (settings.enabled && !settings.openai.apiKey) {
      errors.push("La clé API OpenAI est requise quand l'IA est activée");
    }

    if (errors.length > 0) {
      throw new Error(`Erreurs de validation: ${errors.join(", ")}`);
    }
  }

  /**
   * Charger les paramètres depuis la base de données
   */
  private async loadFromDatabase(): Promise<void> {
    try {
      // Utiliser le service de base de données centralisé (compatibilité API)
      const dbService = databaseService;

      // Créer la table si elle n'existe pas (stockage JSON dans TEXT pour SQLite)
      await dbService.execute(`
        CREATE TABLE IF NOT EXISTS ai_settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          settings TEXT NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT single_row CHECK (id = 1)
        );
      `);

      const result = await dbService.queryOne<{ settings: string }>(
        "SELECT settings FROM ai_settings WHERE id = 1",
      );

      if (result && (result as any).settings) {
        const savedSettings = JSON.parse(
          (result as any).settings,
        ) as AISettings;
        this.settings = { ...DEFAULT_AI_SETTINGS, ...savedSettings };
        currentSettings = { ...this.settings };
      }
    } catch (error) {
      console.warn(
        "Impossible de charger les paramètres AI depuis la base:",
        error,
      );
      // Utiliser les paramètres par défaut
    }
  }

  /**
   * Sauvegarder les paramètres en base de données
   */
  private async saveToDatabase(settings: AISettings): Promise<void> {
    try {
      const dbService = databaseService;

      await dbService.execute(
        `
        INSERT INTO ai_settings (id, settings, updated_at) 
        VALUES (1, $1, CURRENT_TIMESTAMP)
        ON CONFLICT (id) 
        DO UPDATE SET settings = $1, updated_at = CURRENT_TIMESTAMP
      `,
        [JSON.stringify(settings)],
      );
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des paramètres AI:", error);
      throw new Error("Impossible de sauvegarder les paramètres");
    }
  }

  /**
   * Notifier les listeners des changements
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.settings);
      } catch (error) {
        console.error("Erreur dans un listener de configuration AI:", error);
      }
    });
  }
}

/**
 * Fonction utilitaire pour obtenir les paramètres actuels
 */
export function getAISettings(): AISettings {
  return currentSettings;
}

/**
 * Fonction utilitaire pour vérifier si l'IA est activée
 */
export function isAIEnabled(): boolean {
  return currentSettings.enabled && !!currentSettings.openai.apiKey;
}

/**
 * Fonction utilitaire pour vérifier si un service spécifique est activé
 */
export function isServiceEnabled(
  service: "insights" | "recommendations",
): boolean {
  return isAIEnabled() && (currentSettings as any)[service].enabled;
}
