<<<<<<< HEAD
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/utils/logging/logger";

// =============================================================================
// TYPES
// =============================================================================

export interface EnrichmentConfig {
    enabled: boolean;
    apiKey: string;
    model: string;
    confidenceThreshold: number;
}

export interface TestProduct {
    id: string;
    name: string;
    photoUrl: string | null;
}

export interface EnrichmentTestResult {
    originalName: string;
    name: string;
    url: string | null;
    confidence: number;
    source: string;
}

// =============================================================================
// HOOK
// =============================================================================

export function useEnrichmentConfig() {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<EnrichmentConfig>({
        enabled: false,
        apiKey: "",
        model: "gemini-2.5-flash",
        confidenceThreshold: 0.9,
    });

    const [availableModels, setAvailableModels] = useState<string[]>([]);

    // Test state
    const [products, setProducts] = useState<TestProduct[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<EnrichmentTestResult | null>(null);

    // Fetch available models from API
    const fetchModels = useCallback(async (key?: string) => {
        const apiKeyToUse = key || config.apiKey;
        if (!apiKeyToUse) return;

        try {
            const headers: HeadersInit = {};
            if (apiKeyToUse && !apiKeyToUse.includes("...")) {
                headers["x-gemini-api-key"] = apiKeyToUse;
            }

            const res = await fetch("/api/v1/settings/enrichment/models", { headers });
            if (res.ok) {
                const data = await res.json();
                if (data.models && data.models.length > 0) {
                    setAvailableModels(data.models);
                    return;
                }
            }
        } catch (e) {
            logger.error("Failed to fetch models", { error: e });
        }

        // Fallback defaults
        setAvailableModels([
            "gemini-2.5-flash",
            "gemini-3-flash-preview",
            "gemini-3-pro-preview",
            "gemini-1.5-pro",
            "gemini-1.5-flash"
        ]);
    }, [config.apiKey]);

    // Fetch initial config on mount
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch("/api/v1/settings/enrichment");
                if (res.ok) {
                    const data = await res.json();
                    if (data.config) {
                        setConfig({
                            enabled: data.config.enabled ?? false,
                            apiKey: data.config.apiKey || "",
                            model: data.config.model || "gemini-2.5-flash",
                            confidenceThreshold: data.config.confidenceThreshold ?? 0.9,
                        });
                        fetchModels(data.config.apiKey);
                    }
                }
            } catch (e) {
                logger.error("Failed to load enrichment config", { error: e });
            }
        };
        fetchConfig();
    }, [fetchModels]);

    // Fetch products for testing
    const fetchProducts = useCallback(async () => {
        try {
            const res = await fetch("/api/v1/settings/enrichment/products");
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products || []);
            }
        } catch (e) {
            logger.error("Failed to load products for test", { error: e });
        }
    }, []);

    // Save config to API
    const saveConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/v1/settings/enrichment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });

            if (!res.ok) throw new Error("Failed to save configuration");

            toast.success("Configuration sauvegardée", {
                description: "Les paramètres d'enrichissement ont été mis à jour."
            });
            fetchModels();
        } catch (_error) {
            toast.error("Erreur", {
                description: "Impossible de sauvegarder la configuration."
            });
        } finally {
            setLoading(false);
        }
    };

    // Run enrichment test
    const runTest = async () => {
        if (!selectedProductId) {
            toast.error("Sélectionnez un produit pour tester");
            return;
        }

        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch("/api/v1/settings/enrichment/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: selectedProductId,
                    config: config
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                if (res.status === 429) {
                    throw new Error("Quota dépassé (429). Changez de modèle ou attendez.");
                }
                throw new Error(data.error || "Le test a échoué");
            }

            setTestResult(data.result);
            toast.success("Test terminé");
        } catch (error) {
            toast.error("Erreur lors du test", {
                description: error instanceof Error ? error.message : "Erreur inconnue"
            });
        } finally {
            setTesting(false);
        }
    };

    // Config update helper
    const updateConfig = (partial: Partial<EnrichmentConfig>) => {
        setConfig(prev => ({ ...prev, ...partial }));
    };

    const selectedProduct = products.find(p => p.id === selectedProductId);

    return {
        // Config state
        config,
        updateConfig,
        loading,
        saveConfig,

        // Models
        availableModels,
        fetchModels,

        // Testing
        products,
        selectedProductId,
        setSelectedProductId,
        selectedProduct,
        testing,
        testResult,
        fetchProducts,
        runTest,
    };
}
=======
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/utils/logging/logger";

// =============================================================================
// TYPES
// =============================================================================

export interface EnrichmentConfig {
    enabled: boolean;
    apiKey: string;
    model: string;
    confidenceThreshold: number;
}

export interface TestProduct {
    id: string;
    name: string;
    photoUrl: string | null;
}

export interface EnrichmentTestResult {
    originalName: string;
    name: string;
    url: string | null;
    confidence: number;
    source: string;
}

// =============================================================================
// HOOK
// =============================================================================

export function useEnrichmentConfig() {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<EnrichmentConfig>({
        enabled: false,
        apiKey: "",
        model: "gemini-2.5-flash",
        confidenceThreshold: 0.9,
    });

    const [availableModels, setAvailableModels] = useState<string[]>([]);

    // Test state
    const [products, setProducts] = useState<TestProduct[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<EnrichmentTestResult | null>(null);

    // Fetch available models from API
    const fetchModels = useCallback(async (key?: string) => {
        const apiKeyToUse = key || config.apiKey;
        if (!apiKeyToUse) return;

        try {
            const headers: HeadersInit = {};
            if (apiKeyToUse && !apiKeyToUse.includes("...")) {
                headers["x-gemini-api-key"] = apiKeyToUse;
            }

            const res = await fetch("/api/v1/settings/enrichment/models", { headers });
            if (res.ok) {
                const data = await res.json();
                if (data.models && data.models.length > 0) {
                    setAvailableModels(data.models);
                    return;
                }
            }
        } catch (e) {
            logger.error("Failed to fetch models", { error: e });
        }

        // Fallback defaults
        setAvailableModels([
            "gemini-2.5-flash",
            "gemini-3-flash-preview",
            "gemini-3-pro-preview",
            "gemini-1.5-pro",
            "gemini-1.5-flash"
        ]);
    }, [config.apiKey]);

    // Fetch initial config on mount
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch("/api/v1/settings/enrichment");
                if (res.ok) {
                    const data = await res.json();
                    if (data.config) {
                        setConfig({
                            enabled: data.config.enabled ?? false,
                            apiKey: data.config.apiKey || "",
                            model: data.config.model || "gemini-2.5-flash",
                            confidenceThreshold: data.config.confidenceThreshold ?? 0.9,
                        });
                        fetchModels(data.config.apiKey);
                    }
                }
            } catch (e) {
                logger.error("Failed to load enrichment config", { error: e });
            }
        };
        fetchConfig();
    }, [fetchModels]);

    // Fetch products for testing
    const fetchProducts = useCallback(async () => {
        try {
            const res = await fetch("/api/v1/settings/enrichment/products");
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products || []);
            }
        } catch (e) {
            logger.error("Failed to load products for test", { error: e });
        }
    }, []);

    // Save config to API
    const saveConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/v1/settings/enrichment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });

            if (!res.ok) throw new Error("Failed to save configuration");

            toast.success("Configuration sauvegardée", {
                description: "Les paramètres d'enrichissement ont été mis à jour."
            });
            fetchModels();
        } catch (_error) {
            toast.error("Erreur", {
                description: "Impossible de sauvegarder la configuration."
            });
        } finally {
            setLoading(false);
        }
    };

    // Run enrichment test
    const runTest = async () => {
        if (!selectedProductId) {
            toast.error("Sélectionnez un produit pour tester");
            return;
        }

        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch("/api/v1/settings/enrichment/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: selectedProductId,
                    config: config
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                if (res.status === 429) {
                    throw new Error("Quota dépassé (429). Changez de modèle ou attendez.");
                }
                throw new Error(data.error || "Le test a échoué");
            }

            setTestResult(data.result);
            toast.success("Test terminé");
        } catch (error) {
            toast.error("Erreur lors du test", {
                description: error instanceof Error ? error.message : "Erreur inconnue"
            });
        } finally {
            setTesting(false);
        }
    };

    // Config update helper
    const updateConfig = (partial: Partial<EnrichmentConfig>) => {
        setConfig(prev => ({ ...prev, ...partial }));
    };

    const selectedProduct = products.find(p => p.id === selectedProductId);

    return {
        // Config state
        config,
        updateConfig,
        loading,
        saveConfig,

        // Models
        availableModels,
        fetchModels,

        // Testing
        products,
        selectedProductId,
        setSelectedProductId,
        selectedProduct,
        testing,
        testResult,
        fetchProducts,
        runTest,
    };
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
