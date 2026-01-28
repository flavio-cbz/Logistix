"use client";

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Wand2, Link as LinkIcon, AlertCircle, Unlink, RefreshCw, ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface VintedItem {
    id: number;
    title: string;
    price: { amount: string; currency_code: string };
    status_id: number;
    photo?: { url: string };
    photos?: Array<{ url: string; full_size_url?: string }>;
    url?: string;
    mapped: boolean;
    view_count?: number;
    favourite_count?: number;
}

interface VintedAssociationDialogProps {
    productId: string;
    productTitle: string;
    currentExternalId?: string | null;
    trigger?: React.ReactNode;
    onAssociationComplete?: () => void;
}

export function VintedAssociationDialog({
    productId,
    productTitle,
    currentExternalId,
    trigger,
    onAssociationComplete
}: VintedAssociationDialogProps) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<VintedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedItemId, setSelectedItemId] = useState<number | null>(currentExternalId ? parseInt(currentExternalId) : null);
    const [saving, setSaving] = useState(false);
    const [autoSuggested, setAutoSuggested] = useState(false);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/vinted/mapping');
            if (!res.ok) throw new Error('Failed to fetch wardrobe');
            const data = await res.json();
            setItems(data.items);
        } catch {
            toast.error("Erreur de chargement du dressing");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleAutoDetect = useCallback((silent = false) => {
        if (!items.length) return;

        // Client-side simple matching
        const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '');
        const tokens = normalize(productTitle).split(/\s+/).filter(t => t.length > 2);

        let bestId = null;
        let maxScore = 0;

        items.forEach(item => {
            const itemTitle = normalize(item.title || "");
            let matches = 0;
            tokens.forEach(t => {
                if (itemTitle.includes(t)) matches++;
            });
            const score = matches / tokens.length;
            if (score > maxScore) {
                maxScore = score;
                bestId = item.id;
            }
        });

        if (bestId && maxScore > 0.3) {
            setSelectedItemId(bestId);
            if (!silent) {
                toast.success(`Suggestion trouvée`, {
                    description: `Confiance: ${(maxScore * 100).toFixed(0)}%`
                });
            }
        } else if (!silent) {
            toast.info("Aucune correspondance évidente trouvée");
        }
    }, [items, productTitle]);

    useEffect(() => {
        if (open && items.length === 0) {
            fetchItems();
        }
    }, [open, items.length, fetchItems]);

    // Auto-suggest when items are loaded
    useEffect(() => {
        if (items.length > 0 && !autoSuggested && !currentExternalId) {
            handleAutoDetect(true);
            setAutoSuggested(true);
        }
    }, [items.length, autoSuggested, currentExternalId, handleAutoDetect]);

    const handleUnlink = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/v1/products/${productId}/unlink-vinted`, {
                method: 'POST'
            });

            if (res.ok) {
                toast.success("Association supprimée");
                setSelectedItemId(null);
                setOpen(false);
                onAssociationComplete?.();
            } else {
                throw new Error("Failed to unlink");
            }
        } catch {
            toast.error("Erreur lors de la dissociation");
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (!selectedItemId) return;
        setSaving(true);
        try {
            const selectedItem = items.find(i => i.id === selectedItemId);
            if (!selectedItem) return;

            const payload = {
                vintedId: selectedItemId,
                price: parseFloat(selectedItem.price.amount),
                currency: selectedItem.price.currency_code,
                title: selectedItem.title,
                url: selectedItem.url || `https://www.vinted.fr/items/${selectedItemId}`,
                photoUrl: selectedItem.photo?.url
            };

            const res = await fetch(`/api/v1/products/${productId}/link-vinted`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Produit associé avec succès");
                setOpen(false);
                onAssociationComplete?.();
            } else {
                throw new Error("Failed to link");
            }
        } catch {
            toast.error("Erreur lors de l'association");
        } finally {
            setSaving(false);
        }
    };

    const filteredItems = items.filter(i =>
        !searchQuery || i.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedItem = items.find(i => i.id === selectedItemId);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline" size="sm">Associer Vinted</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LinkIcon className="w-5 h-5" />
                        Associer à Vinted
                    </DialogTitle>
                    <DialogDescription>
                        Liez "<strong>{productTitle}</strong>" à un article de votre dressing
                    </DialogDescription>
                </DialogHeader>

                {/* Search and controls */}
                <div className="flex gap-2 py-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher dans le dressing..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Button variant="secondary" onClick={() => handleAutoDetect(false)} title="Suggérer automatiquement">
                        <Wand2 className="w-4 h-4 mr-2" />
                        Auto
                    </Button>
                    <Button variant="ghost" size="icon" onClick={fetchItems} title="Actualiser">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {/* Selected item preview */}
                {selectedItem && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                {selectedItem.photo && (
                                    <img src={selectedItem.photo.url} className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    <span className="text-xs text-primary font-medium">Sélectionné</span>
                                </div>
                                <h4 className="font-medium text-sm truncate mt-1">{selectedItem.title}</h4>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                    <span className="font-medium text-foreground">
                                        {selectedItem.price.amount} {selectedItem.price.currency_code}
                                    </span>
                                    {selectedItem.view_count !== undefined && (
                                        <span>👁️ {selectedItem.view_count}</span>
                                    )}
                                    {selectedItem.favourite_count !== undefined && (
                                        <span>❤️ {selectedItem.favourite_count}</span>
                                    )}
                                </div>
                            </div>
                            {selectedItem.url && (
                                <a href={selectedItem.url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Items list */}
                <ScrollArea className="flex-1 border rounded-md">
                    {loading ? (
                        <div className="flex items-center justify-center h-40 text-muted-foreground">
                            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                            Chargement du dressing...
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                            <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                            Aucun article trouvé
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredItems.map(item => (
                                <div
                                    key={item.id}
                                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${selectedItemId === item.id
                                            ? 'bg-primary/10 border-primary shadow-sm'
                                            : 'hover:bg-muted border-transparent'
                                        }`}
                                    onClick={() => setSelectedItemId(item.id)}
                                >
                                    <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                        {item.photo && <img src={item.photo.url} className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm truncate">{item.title}</h4>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{item.price.amount} {item.price.currency_code}</span>
                                            {item.mapped && item.id !== parseInt(currentExternalId || '0') && (
                                                <Badge variant="secondary" className="text-[10px] h-4 bg-orange-100 text-orange-700">
                                                    Déjà lié
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    {selectedItemId === item.id && (
                                        <div className="w-2 h-2 bg-primary rounded-full" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter className="mt-4 flex-row gap-2">
                    {currentExternalId && (
                        <Button
                            variant="destructive"
                            onClick={handleUnlink}
                            disabled={saving}
                            className="mr-auto"
                        >
                            <Unlink className="w-4 h-4 mr-2" />
                            Dissocier
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Annuler
                    </Button>
                    <Button onClick={handleSave} disabled={!selectedItemId || saving}>
                        {saving ? 'Enregistrement...' : 'Confirmer l\'association'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
