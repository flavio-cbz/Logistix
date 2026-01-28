
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw } from "lucide-react";

interface SearchStepProps {
    query: string;
    setQuery: (query: string) => void;
    handleSearch: () => void;
    isSearching: boolean;
}

export function SearchStep({ query, setQuery, handleSearch, isSearching }: SearchStepProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Quel produit souhaitez-vous analyser ?</CardTitle>
                <CardDescription>Entrez le nom de la marque et du modèle pour commencer.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-4">
                    <Input
                        placeholder="Ex: Nike Air Force 1, iPhone 12, etc."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="text-lg py-6"
                        disabled={isSearching}
                    />
                    <Button size="lg" onClick={handleSearch} disabled={!query.trim() || isSearching}>
                        {isSearching ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Search className="w-5 h-5 mr-2" />}
                        Rechercher
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
