
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, TrendingUp, DollarSign, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";

interface MarketStats {
    price: {
        average: number;
        median: number;
        min: number;
        max: number;
    };
    totalItems: number;
    samples: Array<{
        id: number;
        title: string;
        price: {
            amount: string;
            currency_code: string;
        };
        photo?: {
            url: string;
        };
        url: string;
        brand_title?: string;
        size_title?: string;
    }>;
}

export default function MarketAnalysisPage() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<MarketStats | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const res = await fetch("/api/v1/market/analysis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            });
            const data = await res.json();
            if (data.success) {
                setStats(data.stats);
            } else {
                toast.error("Erreur lors de l'analyse");
            }
        } catch {
            toast.error("Erreur technique lors de la recherche");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Analyse de Marché
            </h1>

            {/* Search Section */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <Input
                            placeholder="Rechercher un produit (ex: Nike Air Force 1, Veste Carhartt)..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="text-lg py-6"
                        />
                        <Button
                            type="submit"
                            size="lg"
                            disabled={loading}
                            className="bg-[#007782] hover:bg-[#006670] min-w-[150px]"
                        >
                            {loading ? "Analyse..." : (
                                <>
                                    <Search className="mr-2 h-5 w-5" />
                                    Analyser
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Results Section */}
            {stats && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Prix Moyen</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.price.average} €</div>
                                <p className="text-xs text-muted-foreground">
                                    Médiane: {stats.price.median} €
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Prix Min/Max</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.price.min} - {stats.price.max} €</div>
                                <p className="text-xs text-muted-foreground">
                                    Fourchette actuelle
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Volume analysé</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalItems}</div>
                                <p className="text-xs text-muted-foreground">
                                    Annonces récentes
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sample Items List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Échantillon des résultats</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {stats.samples.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-4">
                                            {item.photo?.url && (
                                                <img
                                                    src={item.photo.url}
                                                    alt={item.title}
                                                    className="w-12 h-12 rounded object-cover border"
                                                />
                                            )}
                                            <div>
                                                <p className="font-medium">{item.title}</p>
                                                <div className="flex gap-2 mt-1">
                                                    <Badge variant="outline">{item.brand_title}</Badge>
                                                    <Badge variant="secondary">{item.size_title}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-lg">{item.price.amount} {item.price.currency_code}</div>
                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                                                Voir l'annonce
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
