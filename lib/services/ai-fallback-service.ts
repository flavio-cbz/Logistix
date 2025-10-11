export interface AIModelConfig {
  provider: "openai" | "anthropic" | "local" | "fallback";
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  isDefault?: boolean;
  isActive: boolean;
}

export interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
  provider?: string;
  model?: string;
  tokensUsed?: number;
}

export class AIFallbackService {
  private configs: AIModelConfig[] = [];
  private currentConfigIndex = 0;
  private maxRetries = 3;

  constructor() {
    this.initializeConfigs();
  }

  /**
   * Initialise les configurations d'IA disponibles
   */
  private initializeConfigs(): void {
    // Configuration OpenAI
  if (process.env['OPENAI_API_KEY']) {
      this.configs.push({
        provider: "openai",
        model: "gpt-4",
  apiKey: process.env['OPENAI_API_KEY'],
        baseUrl: "https://api.openai.com/v1",
        maxTokens: 4096,
        temperature: 0.7,
        isDefault: true,
        isActive: true,
      });
    }

    // Configuration Anthropic
  if (process.env['ANTHROPIC_API_KEY']) {
      this.configs.push({
        provider: "anthropic",
        model: "claude-3-sonnet-20240229",
  apiKey: process.env['ANTHROPIC_API_KEY'],
        baseUrl: "https://api.anthropic.com/v1",
        maxTokens: 4096,
        temperature: 0.7,
        isDefault: false,
        isActive: true,
      });
    }

    // Configuration locale (Ollama ou autre)
  if (process.env['LOCAL_AI_URL']) {
      this.configs.push({
        provider: "local",
  model: process.env['LOCAL_AI_MODEL'] || "llama2",
  baseUrl: process.env['LOCAL_AI_URL'],
        maxTokens: 2048,
        temperature: 0.7,
        isDefault: false,
        isActive: true,
      });
    }

    // Configuration de fallback (réponses prédéfinies)
    this.configs.push({
      provider: "fallback",
      model: "static-responses",
      isDefault: false,
      isActive: true,
    });

    // Trier par priorité (défaut en premier)
    this.configs.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return 0;
    });
  }

  /**
   * Effectue une requête IA avec fallback automatique
   */
  async makeRequest(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    },
  ): Promise<AIResponse> {
    let lastError: string | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const config = this.getCurrentConfig();

      if (!config) {
        return {
          success: false,
          error: "Aucune configuration IA disponible",
        };
      }

      try {
        const response = await this.executeRequest(config, prompt, options);

        if (response.success) {
          return response;
        }

        lastError = response.error || "Erreur inconnue";
        this.moveToNextConfig();
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Erreur inconnue";
        this.moveToNextConfig();
      }
    }

    return {
      success: false,
      error: `Échec après ${this.maxRetries} tentatives. Dernière erreur: ${lastError}`,
    };
  }

  /**
   * Exécute une requête avec une configuration spécifique
   */
  private async executeRequest(
    config: AIModelConfig,
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    },
  ): Promise<AIResponse> {
    switch (config.provider) {
      case "openai":
        return this.callOpenAI(config, prompt, options);

      case "anthropic":
        return this.callAnthropic(config, prompt, options);

      case "local":
        return this.callLocalAI(config, prompt, options);

      case "fallback":
        return this.callFallback(prompt);

      default:
        return {
          success: false,
          error: `Provider non supporté: ${config.provider}`,
        };
    }
  }

  /**
   * Appel à l'API OpenAI
   */
  private async callOpenAI(
    config: AIModelConfig,
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    },
  ): Promise<AIResponse> {
    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            ...(options?.systemPrompt
              ? [{ role: "system", content: options.systemPrompt }]
              : []),
            { role: "user", content: prompt },
          ],
          max_tokens: options?.maxTokens || config.maxTokens,
          temperature: options?.temperature || config.temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.choices[0].message.content,
        provider: "openai",
        model: config.model,
        tokensUsed: data.usage?.total_tokens,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Erreur OpenAI inconnue",
      };
    }
  }

  /**
   * Appel à l'API Anthropic
   */
  private async callAnthropic(
    config: AIModelConfig,
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    },
  ): Promise<AIResponse> {
    try {
      const response = await fetch(`${config.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: options?.maxTokens || config.maxTokens,
          temperature: options?.temperature || config.temperature,
          ...(options?.systemPrompt && { system: options.systemPrompt }),
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.content[0].text,
        provider: "anthropic",
        model: config.model,
        tokensUsed: data.usage?.total_tokens,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Erreur Anthropic inconnue",
      };
    }
  }

  /**
   * Appel à une IA locale (Ollama, etc.)
   */
  private async callLocalAI(
    config: AIModelConfig,
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    },
  ): Promise<AIResponse> {
    try {
      const response = await fetch(`${config.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          prompt: options?.systemPrompt
            ? `${options.systemPrompt}\n\n${prompt}`
            : prompt,
          stream: false,
          options: {
            num_predict: options?.maxTokens || config.maxTokens,
            temperature: options?.temperature || config.temperature,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Local AI error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: data.response,
        provider: "local",
        model: config.model,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Erreur IA locale inconnue",
      };
    }
  }

  /**
   * Réponses de fallback prédéfinies
   */
  private async callFallback(prompt: string): Promise<AIResponse> {
    // Réponses prédéfinies basées sur le contenu du prompt
    const fallbackResponses: Record<string, string> = {
      analyze:
        "Analyse non disponible - service IA temporairement indisponible",
      summary: "Résumé non disponible - service IA temporairement indisponible",
      recommendation:
        "Recommandations non disponibles - service IA temporairement indisponible",
      translation:
        "Traduction non disponible - service IA temporairement indisponible",
      description:
        "Description automatique non disponible - service IA temporairement indisponible",
    };

    const lowerPrompt = prompt.toLowerCase();
    let response =
      "Réponse non disponible - service IA temporairement indisponible";

    for (const [key, value] of Object.entries(fallbackResponses)) {
      if (lowerPrompt.includes(key)) {
        response = value;
        break;
      }
    }

    return {
      success: true,
      data: response,
      provider: "fallback",
      model: "static-responses",
    };
  }

  /**
   * Récupère la configuration actuelle
   */
  private getCurrentConfig(): AIModelConfig | null {
    const activeConfigs = this.configs.filter((c) => c.isActive);
    if (activeConfigs.length === 0) return null;

    return activeConfigs[this.currentConfigIndex % activeConfigs.length]!;
  }

  /**
   * Passe à la configuration suivante
   */
  private moveToNextConfig(): void {
    const activeConfigs = this.configs.filter((c) => c.isActive);
    this.currentConfigIndex =
      (this.currentConfigIndex + 1) % activeConfigs.length;
  }

  /**
   * Récupère les informations sur les configurations disponibles
   */
  getAvailableConfigs(): Omit<AIModelConfig, "apiKey">[] {
    return this.configs.map((config) => {
      const { apiKey, ...configWithoutKey } = config;
      return configWithoutKey;
    });
  }

  /**
   * Active ou désactive une configuration
   */
  setConfigActive(provider: string, model: string, isActive: boolean): boolean {
    const config = this.configs.find(
      (c) => c.provider === provider && c.model === model,
    );
    if (config) {
      config.isActive = isActive;
      return true;
    }
    return false;
  }

  /**
   * Réinitialise à la configuration par défaut
   */
  resetToDefault(): void {
    this.currentConfigIndex = 0;
  }
}

// Instance singleton
export const aiFallbackService = new AIFallbackService();

export default aiFallbackService;
