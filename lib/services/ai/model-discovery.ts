/**
 * Service de découverte automatique des modèles IA
 * Détecte les modèles disponibles sur différents endpoints et les classe
 */

export interface ModelRecommendation {
  id: string;
  name: string;
  provider: string;
  score: number;
  responseTime: number;
  efficiency: number;
  category: "champion" | "excellent" | "good" | "fast" | "budget" | "unknown";
  description: string;
  tested: boolean;
  recommended: boolean;
}

export interface EndpointInfo {
  url: string;
  type: "openai" | "gemini" | "anthropic" | "nvidia" | "custom";
  requiresAuth: boolean;
  modelsEndpoint?: string;
}

import { autoPerf } from "@/lib/services/auto-performance-integration";

// Base de données des résultats de nos tests
export const TESTED_MODELS: Record<string, ModelRecommendation> = {
  // Champions testés - GEMINI
  "gemini-2.0-flash": {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    score: 97.0,
    responseTime: 7800,
    efficiency: 12.4,
    category: "champion",
    description: "🏆 Champion absolu - Score quasi-parfait",
    tested: true,
    recommended: true,
  },
  "gemini-2.5-flash-lite": {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "Google",
    score: 93.0,
    responseTime: 5300,
    efficiency: 17.6,
    category: "fast",
    description: "⚡ Champion vitesse - Ultra-rapide",
    tested: true,
    recommended: true,
  },
  "gemini-1.5-pro": {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    score: 94.0,
    responseTime: 13600,
    efficiency: 6.9,
    category: "excellent",
    description: "🚀 Flagship Google - Multimodal",
    tested: true,
    recommended: true,
  },
  "gemini-1.5-flash": {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "Google",
    score: 94.5,
    responseTime: 6200,
    efficiency: 15.4,
    category: "excellent",
    description: "⚡ Version rapide Google",
    tested: true,
    recommended: true,
  },
  "gemini-1.5-pro-002": {
    id: "gemini-1.5-pro-002",
    name: "Gemini 1.5 Pro-002",
    provider: "Google",
    score: 96.5,
    responseTime: 15000,
    efficiency: 6.4,
    category: "excellent",
    description: "🔥 Version optimisée récente",
    tested: true,
    recommended: true,
  },

  // Champions testés - NVIDIA
  "meta/llama-3.3-70b-instruct": {
    id: "meta/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    provider: "Meta/NVIDIA",
    score: 98.0,
    responseTime: 9300,
    efficiency: 10.5,
    category: "champion",
    description: "🏆 Ex-champion NVIDIA - Excellent mais instable",
    tested: true,
    recommended: true,
  },
  "meta/llama-3.1-70b-instruct": {
    id: "meta/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B",
    provider: "Meta/NVIDIA",
    score: 95.7,
    responseTime: 12000,
    efficiency: 8.0,
    category: "excellent",
    description: "🎯 Référence qualité - Stable et éprouvé",
    tested: true,
    recommended: true,
  },
  "meta/llama-3.1-8b-instruct": {
    id: "meta/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B",
    provider: "Meta/NVIDIA",
    score: 86.0,
    responseTime: 7300,
    efficiency: 11.9,
    category: "good",
    description: "💨 Rapide et économique",
    tested: true,
    recommended: true,
  },
  "mistralai/mixtral-8x7b-instruct-v0.1": {
    id: "mistralai/mixtral-8x7b-instruct-v0.1",
    name: "Mixtral 8x7B",
    provider: "Mistral/NVIDIA",
    score: 64.0,
    responseTime: 3200,
    efficiency: 20.0,
    category: "fast",
    description: "🚀 Ultra-rapide - Qualité moyenne",
    tested: true,
    recommended: false,
  },
  "moonshotai/kimi-k2-instruct": {
    id: "moonshotai/kimi-k2-instruct",
    name: "Kimi K2",
    provider: "Moonshot/NVIDIA",
    score: 92.7,
    responseTime: 19600,
    efficiency: 4.7,
    category: "good",
    description: "📚 Contexte long - Lent mais détaillé",
    tested: true,
    recommended: false,
  },

  // Modèles OpenAI (estimations basées sur la réputation)
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    score: 95.0,
    responseTime: 8000,
    efficiency: 11.9,
    category: "excellent",
    description: "🎯 GPT-4 optimisé - Multimodal",
    tested: false,
    recommended: true,
  },
  "gpt-4-turbo": {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    score: 94.0,
    responseTime: 10000,
    efficiency: 9.4,
    category: "excellent",
    description: "⚡ GPT-4 rapide - Contexte long",
    tested: false,
    recommended: true,
  },
  "gpt-3.5-turbo": {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "OpenAI",
    score: 82.0,
    responseTime: 5000,
    efficiency: 16.4,
    category: "good",
    description: "💰 Économique et rapide",
    tested: false,
    recommended: true,
  },
};

export class ModelDiscoveryService {
  private static instance: ModelDiscoveryService;

  public static getInstance(): ModelDiscoveryService {
    if (!ModelDiscoveryService.instance) {
      ModelDiscoveryService.instance = new ModelDiscoveryService();
    }
    return ModelDiscoveryService.instance;
  }

  /**
   * Détecte le type d'endpoint basé sur l'URL
   */
  public detectEndpointType(url: string): EndpointInfo {
    const normalizedUrl = url.toLowerCase();

    if (
      normalizedUrl.includes("openai.com") ||
      normalizedUrl.includes("/v1/chat/completions")
    ) {
      return {
        url,
        type: "openai",
        requiresAuth: true,
        modelsEndpoint: url.replace(/\/chat\/completions.*/, "/models"),
      };
    }

    if (
      normalizedUrl.includes("generativelanguage.googleapis.com") ||
      normalizedUrl.includes("gemini")
    ) {
      return {
        url,
        type: "gemini",
        requiresAuth: true,
        modelsEndpoint: url.replace(/\/models\/.*/, "/models"),
      };
    }

    if (
      normalizedUrl.includes("nvidia.com") ||
      normalizedUrl.includes("integrate.api.nvidia.com")
    ) {
      return {
        url,
        type: "nvidia",
        requiresAuth: true,
        modelsEndpoint: url.replace(/\/chat\/completions.*/, "/models"),
      };
    }

    if (
      normalizedUrl.includes("anthropic.com") ||
      normalizedUrl.includes("claude")
    ) {
      return {
        url,
        type: "anthropic",
        requiresAuth: true,
      };
    }

    return {
      url,
      type: "custom",
      requiresAuth: true,
      modelsEndpoint: url.replace(/\/chat\/completions.*/, "/models"),
    };
  }

  /**
   * Découvre les modèles disponibles sur un endpoint
   */
  public async discoverModels(
    endpointUrl: string,
    apiKey: string,
  ): Promise<ModelRecommendation[]> {
    const endpointInfo = this.detectEndpointType(endpointUrl);

    try {
      let availableModels: string[] = [];

      if (endpointInfo.type === "gemini") {
        availableModels = await this.discoverGeminiModels(endpointUrl, apiKey);
      } else if (
        endpointInfo.type === "openai" ||
        endpointInfo.type === "nvidia" ||
        endpointInfo.type === "custom"
      ) {
        availableModels = await this.discoverOpenAICompatibleModels(
          endpointInfo.modelsEndpoint!,
          apiKey,
        );
      }

      // Classer les modèles découverts
      return this.classifyDiscoveredModels(availableModels, endpointInfo.type);
    } catch (error) {
      console.error("Erreur lors de la découverte des modèles:", error);
      return this.getFallbackModels(endpointInfo.type);
    }
  }

  /**
   * Découvre les modèles Gemini disponibles
   */
  private async discoverGeminiModels(
    endpointUrl: string,
    apiKey: string,
  ): Promise<string[]> {
    const baseUrl = endpointUrl.includes("/models/")
      ? endpointUrl.substring(0, endpointUrl.indexOf("/models/"))
      : endpointUrl;

    const modelsUrl = `${baseUrl}/models?key=${apiKey}`;

    try {
      const response = await autoPerf.autoFetch(modelsUrl);
      const data = await response.json();

      if (data.models) {
        return data.models
          .filter((model: any) => model.name.includes("generateContent"))
          .map((model: any) => model.name.replace("models/", ""));
      }
    } catch (error) {
      console.error("Erreur découverte Gemini:", error);
    }

    // Fallback avec modèles connus
    return [
      "gemini-2.0-flash",
      "gemini-2.5-flash-lite",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "gemini-1.5-pro-002",
    ];
  }

  /**
   * Découvre les modèles compatibles OpenAI
   */
  private async discoverOpenAICompatibleModels(
    modelsEndpoint: string,
    apiKey: string,
  ): Promise<string[]> {
    try {
      const response = await autoPerf.autoFetch(modelsEndpoint, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.data) {
        return data.data.map((model: any) => model.id);
      }
    } catch (error) {
      console.error("Erreur découverte OpenAI compatible:", error);
    }

    return [];
  }

  /**
   * Classe les modèles découverts selon nos tests
   */
  private classifyDiscoveredModels(
    modelIds: string[],
    providerType: string,
  ): ModelRecommendation[] {
    const recommendations: ModelRecommendation[] = [];

    for (const modelId of modelIds) {
      // Vérifier si on a des données de test pour ce modèle
      if (TESTED_MODELS[modelId]!) {
        recommendations.push({ ...TESTED_MODELS[modelId]! });
      } else {
        // Créer une recommandation basée sur des heuristiques
        const recommendation = this.createHeuristicRecommendation(
          modelId,
          providerType,
        );
        recommendations.push(recommendation);
      }
    }

    // Trier par score décroissant, puis par efficacité
    return recommendations.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.efficiency - a.efficiency;
    });
  }

  /**
   * Crée une recommandation basée sur des heuristiques
   */
  private createHeuristicRecommendation(
    modelId: string,
    providerType: string,
  ): ModelRecommendation {
    const id = modelId.toLowerCase();
    let score = 70; // Score de base
    let responseTime = 10000; // 10s par défaut
    let category: ModelRecommendation["category"] = "unknown";
    let description = "❓ Modèle non testé";
    let recommended = false;

    // Heuristiques basées sur le nom du modèle
    if (id.includes("gpt-4")) {
      score = 90;
      responseTime = 8000;
      category = "excellent";
      description = "🎯 Modèle GPT-4 - Qualité élevée attendue";
      recommended = true;
    } else if (id.includes("gpt-3.5")) {
      score = 80;
      responseTime = 5000;
      category = "good";
      description = "💰 Modèle GPT-3.5 - Économique";
      recommended = true;
    } else if (id.includes("gemini")) {
      if (id.includes("2.0") || id.includes("2.5")) {
        score = 95;
        responseTime = 7000;
        category = "champion";
        description = "🚀 Gemini 2.x - Nouvelle génération";
        recommended = true;
      } else if (id.includes("1.5")) {
        score = 90;
        responseTime = 12000;
        category = "excellent";
        description = "⭐ Gemini 1.5 - Performant";
        recommended = true;
      } else if (id.includes("flash")) {
        score = 85;
        responseTime = 6000;
        category = "fast";
        description = "⚡ Version rapide";
        recommended = true;
      }
    } else if (id.includes("llama")) {
      if (id.includes("70b") || id.includes("405b")) {
        score = 90;
        responseTime = 12000;
        category = "excellent";
        description = "🦙 Llama large - Haute qualité";
        recommended = true;
      } else if (id.includes("8b") || id.includes("7b")) {
        score = 80;
        responseTime = 7000;
        category = "fast";
        description = "🦙 Llama compact - Rapide";
        recommended = true;
      }
    } else if (id.includes("mixtral")) {
      score = 75;
      responseTime = 5000;
      category = "fast";
      description = "🌪️ Mixtral - Rapide";
      recommended = id.includes("8x7b");
    } else if (id.includes("claude")) {
      score = 88;
      responseTime = 9000;
      category = "excellent";
      description = "🎭 Claude - Qualité Anthropic";
      recommended = true;
    }

    const efficiency = score / (responseTime / 1000);

    return {
      id: modelId,
      name: this.formatModelName(modelId),
      provider: this.getProviderName(providerType),
      score,
      responseTime,
      efficiency,
      category,
      description,
      tested: false,
      recommended,
    };
  }

  /**
   * Formate le nom du modèle pour l'affichage
   */
  private formatModelName(modelId: string): string {
    return modelId
      .replace(/^[^\/]*\//, "") // Enlever le préfixe provider/
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Obtient le nom du provider
   */
  private getProviderName(providerType: string): string {
    switch (providerType) {
      case "openai":
        return "OpenAI";
      case "gemini":
        return "Google";
      case "nvidia":
        return "NVIDIA";
      case "anthropic":
        return "Anthropic";
      default:
        return "Custom";
    }
  }

  /**
   * Retourne des modèles de fallback si la découverte échoue
   */
  private getFallbackModels(providerType: string): ModelRecommendation[] {
    const fallbackIds: Record<string, string[]> = {
      gemini: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
      openai: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
      nvidia: ["meta/llama-3.1-70b-instruct", "meta/llama-3.1-8b-instruct"],
      anthropic: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
    };

    const ids = fallbackIds[providerType]! || [];
    return ids.map(
      (id) =>
        TESTED_MODELS[id]! ||
        this.createHeuristicRecommendation(id, providerType),
    );
  }

  /**
   * Obtient les modèles recommandés pour l'analyse de marché français
   */
  public getRecommendedModels(): ModelRecommendation[] {
    return Object.values(TESTED_MODELS)
      .filter((model) => model.recommended)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Obtient le top 5 des modèles par catégorie
   */
  public getTopModelsByCategory(): Record<string, ModelRecommendation[]> {
    const allModels = Object.values(TESTED_MODELS);

    return {
      champions: allModels
        .filter((m) => m.category === "champion")
        .sort((a, b) => b.score - a.score),
      excellent: allModels
        .filter((m) => m.category === "excellent")
        .sort((a, b) => b.score - a.score),
      fast: allModels
        .filter((m) => m.category === "fast")
        .sort((a, b) => b.efficiency - a.efficiency),
      good: allModels
        .filter((m) => m.category === "good")
        .sort((a, b) => b.score - a.score),
      budget: allModels
        .filter((m) => m.category === "budget")
        .sort((a, b) => b.efficiency - a.efficiency),
    };
  }
}
