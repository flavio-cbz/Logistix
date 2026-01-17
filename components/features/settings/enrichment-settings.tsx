"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Zap, Search, Eye, EyeOff, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/utils/logging/logger";

interface EnrichmentConfig {
    enabled: boolean;
    apiKey: string;
    model: string;
    confidenceThreshold: number; // Minimum confidence for auto-acceptance (0.0-1.0)
}

interface TestProduct {
    id: string;
    name: string;
    photoUrl: string | null;
}

interface EnrichmentTestResult {
    originalName: string;
    name: string;
    url: string | null;
    confidence: number;
    source: string;
}

export function EnrichmentSettings() {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<EnrichmentConfig>({
        enabled: false,
        apiKey: "",
        model: "gemini-2.5-flash",
        confidenceThreshold: 0.9,
    });
    const [showKey, setShowKey] = useState(false);

    // Test state
    const [products, setProducts] = useState<TestProduct[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<EnrichmentTestResult | null>(null);

    const [availableModels, setAvailableModels] = useState<string[]>([]);

    const fetchModels = useCallback(async (key?: string) => {
        const apiKeyToUse = key || config.apiKey;

        // Don't fetch if we have no key at all and no mask
        if (!apiKeyToUse) return;

        try {
            const headers: HeadersInit = {};
            // Only send key if it's not masked
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

        // Fallback defaults if API fails or returns empty
        setAvailableModels([
            "gemini-2.5-flash",
            "gemini-3-flash-preview",
            "gemini-3-pro-preview",
            "gemini-1.5-pro",
            "gemini-1.5-flash"
        ]);
    }, [config.apiKey]);

    // Fetch initial config
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
                        // Fetch models after getting config
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

    const handleSave = async () => {
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

    const handleTest = async () => {
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
                    config: config // Send current config to test without saving
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                // Handle specific error cases
                if (res.status === 429) {
                    throw new Error("Quota dépassé (429). Changez de modèle (ex: gemini-2.5-flash) ou attendez.");
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

    const selectedProduct = products.find(p => p.id === selectedProductId);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Enrichissement IA
                        </CardTitle>
                        <CardDescription>
                            Utilisez Google Gemini pour trouver les vrais noms et liens de vos produits Superbuy.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="enrichment-enabled" className="text-sm font-medium">Activer</Label>
                        <Switch
                            id="enrichment-enabled"
                            checked={config.enabled}
                            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Configuration Section */}
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="gemini-key">Clé API Gemini</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="gemini-key"
                                    type={showKey ? "text" : "password"}
                                    value={config.apiKey}
                                    onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                    placeholder="AIzaSy..."
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowKey(!showKey)}
                                >
                                    {showKey ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    toast.promise(fetchModels(config.apiKey), {
                                        loading: 'Vérification...',
                                        success: 'Clé valide ! Modèles chargés.',
                                        error: 'Clé invalide ou erreur réseau'
                                    });
                                }}
                                disabled={!config.apiKey}
                            >
                                Vérifier
                            </Button>
                        </div>
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-muted-foreground">
                                Nécessite le modèle Gemini Flash.
                            </p>
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                                Obtenir une clé API <span aria-hidden="true">→</span>
                            </a>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="model-select">Modèle</Label>
                        <Select
                            value={config.model}
                            onValueChange={(val) => setConfig(prev => ({ ...prev, model: val }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un modèle" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableModels.map(modelId => (
                                    <SelectItem key={modelId} value={modelId}>{modelId}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Confidence Threshold Slider */}
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="confidence-threshold">Seuil de confiance minimum</Label>
                            <span className="text-sm text-muted-foreground font-medium pr-1">
                                {Math.round(config.confidenceThreshold * 100)}%
                            </span>
                        </div>
                        <input
                            type="range"
                            id="confidence-threshold"
                            min="50"
                            max="100"
                            step="5"
                            value={Math.round(config.confidenceThreshold * 100)}
                            onChange={(e) => setConfig(prev => ({
                                ...prev,
                                confidenceThreshold: parseInt(e.target.value) / 100
                            }))}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <p className="text-xs text-muted-foreground">
                            Les produits avec une confiance inférieure seront marqués avec des guillemets.
                        </p>
                    </div>

                    <Button onClick={handleSave} disabled={loading} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sauvegarder la configuration
                    </Button>
                </div>

                <Separator />

                {/* Testing Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                            <Zap className="h-4 w-4 text-warning" />
                            Zone de Test
                        </h3>
                        <Button variant="outline" size="sm" onClick={fetchProducts} className="h-8">
                            Recharger les produits
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        <Select
                            value={selectedProductId}
                            onValueChange={setSelectedProductId}
                            onOpenChange={() => { if (products.length === 0) fetchProducts(); }}
                        >
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Choisir un produit pour tester..." />
                            </SelectTrigger>
                            <SelectContent>
                                {products.length === 0 ? (
                                    <SelectItem value="none" disabled>Aucun produit disponible</SelectItem>
                                ) : (
                                    products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleTest} disabled={testing || !selectedProductId}>
                            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </div>

                    {selectedProduct && selectedProduct.photoUrl && (
                        <div className="flex justify-center p-2 bg-muted rounded-md">
                            <img
                                src={selectedProduct.photoUrl}
                                alt="Product preview"
                                className="h-32 object-contain rounded-md"
                            />
                        </div>
                    )}

                    {testResult && (
                        <div className="bg-muted/40 rounded-lg p-4 space-y-4 text-sm animate-in fade-in slide-in-from-top-2">
                            {/* Confidence Badge */}
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-muted-foreground">Résultat de l'enrichissement</span>
                                <Badge
                                    variant={testResult.confidence > 0.8 ? "default" : testResult.confidence > 0.5 ? "secondary" : "destructive"}
                                    className={testResult.confidence > 0.8 ? "bg-success hover:bg-success/90 text-success-foreground" : testResult.confidence > 0.5 ? "bg-warning hover:bg-warning/90 text-warning-foreground" : ""}
                                >
                                    {testResult.confidence > 0.8 ? "✓" : testResult.confidence > 0.5 ? "~" : "?"} Confiance: {Math.round(testResult.confidence * 100)}%
                                </Badge>
                            </div>

                            {/* Before/After Comparison */}
                            <div className="grid gap-3 p-3 bg-background rounded-md border shadow-sm">
                                <div className="flex items-start gap-3">
                                    <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded">AVANT</span>
                                    <span className="text-muted-foreground line-through">{testResult.originalName || selectedProduct?.name}</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-xs font-medium text-success bg-success/15 px-2 py-0.5 rounded">APRÈS</span>
                                    <span className="font-medium">{testResult.name}</span>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="grid grid-cols-[80px_1fr] gap-2 text-xs">
                                <span className="text-muted-foreground">URL:</span>
                                {testResult.url ? (
                                    <a href={testResult.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                                        {testResult.url}
                                    </a>
                                ) : (
                                    <span className="text-muted-foreground italic">Non trouvée</span>
                                )}

                                <span className="text-muted-foreground">Source:</span>
                                <span>{testResult.source || "Gemini Search"}</span>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
