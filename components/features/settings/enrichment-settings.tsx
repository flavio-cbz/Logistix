<<<<<<< HEAD
"use client";

import { useState } from "react";
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
import { useEnrichmentConfig } from "@/lib/hooks/use-enrichment-config";

export function EnrichmentSettings() {
    const [showKey, setShowKey] = useState(false);

    const {
        config,
        updateConfig,
        loading,
        saveConfig,
        availableModels,
        fetchModels,
        products,
        selectedProductId,
        setSelectedProductId,
        selectedProduct,
        testing,
        testResult,
        fetchProducts,
        runTest,
    } = useEnrichmentConfig();

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
                            onCheckedChange={(checked) => updateConfig({ enabled: checked })}
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
                                    onChange={(e) => updateConfig({ apiKey: e.target.value })}
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
                            onValueChange={(val) => updateConfig({ model: val })}
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
                            onChange={(e) => updateConfig({
                                confidenceThreshold: parseInt(e.target.value) / 100
                            })}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <p className="text-xs text-muted-foreground">
                            Les produits avec une confiance inférieure seront marqués avec des guillemets.
                        </p>
                    </div>

                    <Button onClick={saveConfig} disabled={loading} className="w-full">
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
                        <Button onClick={runTest} disabled={testing || !selectedProductId}>
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
=======
"use client";

import { useState } from "react";
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
import { useEnrichmentConfig } from "@/lib/hooks/use-enrichment-config";

export function EnrichmentSettings() {
    const [showKey, setShowKey] = useState(false);

    const {
        config,
        updateConfig,
        loading,
        saveConfig,
        availableModels,
        fetchModels,
        products,
        selectedProductId,
        setSelectedProductId,
        selectedProduct,
        testing,
        testResult,
        fetchProducts,
        runTest,
    } = useEnrichmentConfig();

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
                            onCheckedChange={(checked) => updateConfig({ enabled: checked })}
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
                                    onChange={(e) => updateConfig({ apiKey: e.target.value })}
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
                            onValueChange={(val) => updateConfig({ model: val })}
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
                            onChange={(e) => updateConfig({
                                confidenceThreshold: parseInt(e.target.value) / 100
                            })}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <p className="text-xs text-muted-foreground">
                            Les produits avec une confiance inférieure seront marqués avec des guillemets.
                        </p>
                    </div>

                    <Button onClick={saveConfig} disabled={loading} className="w-full">
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
                        <Button onClick={runTest} disabled={testing || !selectedProductId}>
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
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
