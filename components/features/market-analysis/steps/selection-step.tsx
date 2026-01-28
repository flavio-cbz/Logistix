<<<<<<< HEAD

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { type MarketProduct } from "@/lib/types/market";

interface SelectionStepProps {
    query: string;
    isSearching: boolean;
    isAnalyzing: boolean;
    searchResults: MarketProduct[];
    handleSelect: (id: string) => void;
    reset: () => void;
}

export function SelectionStep({
    query,
    isSearching,
    isAnalyzing,
    searchResults,
    handleSelect,
    reset
}: SelectionStepProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                    {isSearching ? "Recherche en cours..." : `Résultats pour "${query}"`}
                </h2>
                <Button variant="ghost" onClick={reset} disabled={isAnalyzing}>Nouvelle recherche</Button>
            </div>

            {isSearching ? (
                <div className="flex justify-center py-12">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
            ) : searchResults.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                    {searchResults.map((item) => (
                        <Card
                            key={item.id}
                            className="cursor-pointer hover:border-primary transition-all hover:shadow-md group"
                            onClick={() => handleSelect(item.id)}
                        >
                            <CardContent className="p-6 text-center space-y-4">
                                <div className="text-4xl group-hover:scale-110 transition-transform">{item.imageUrl}</div>
                                <div>
                                    <h3 className="font-bold truncate" title={item.title}>{item.title}</h3>
                                    <p className="text-sm text-muted-foreground">{item.condition}</p>
                                </div>
                                <div className="text-lg font-bold text-primary">{item.price} {item.currency}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                        <p>Aucun produit trouvé pour cette recherche.</p>
                        <Button variant="link" onClick={reset}>Essayer une autre recherche</Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
=======

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { type MarketProduct } from "@/lib/types/market";

interface SelectionStepProps {
    query: string;
    isSearching: boolean;
    isAnalyzing: boolean;
    searchResults: MarketProduct[];
    handleSelect: (id: string) => void;
    reset: () => void;
}

export function SelectionStep({
    query,
    isSearching,
    isAnalyzing,
    searchResults,
    handleSelect,
    reset
}: SelectionStepProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                    {isSearching ? "Recherche en cours..." : `Résultats pour "${query}"`}
                </h2>
                <Button variant="ghost" onClick={reset} disabled={isAnalyzing}>Nouvelle recherche</Button>
            </div>

            {isSearching ? (
                <div className="flex justify-center py-12">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
            ) : searchResults.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                    {searchResults.map((item) => (
                        <Card
                            key={item.id}
                            className="cursor-pointer hover:border-primary transition-all hover:shadow-md group"
                            onClick={() => handleSelect(item.id)}
                        >
                            <CardContent className="p-6 text-center space-y-4">
                                <div className="text-4xl group-hover:scale-110 transition-transform">{item.imageUrl}</div>
                                <div>
                                    <h3 className="font-bold truncate" title={item.title}>{item.title}</h3>
                                    <p className="text-sm text-muted-foreground">{item.condition}</p>
                                </div>
                                <div className="text-lg font-bold text-primary">{item.price} {item.currency}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                        <p>Aucun produit trouvé pour cette recherche.</p>
                        <Button variant="link" onClick={reset}>Essayer une autre recherche</Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
