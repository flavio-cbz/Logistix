
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, AlertTriangle, RefreshCw, LogOut, Clock, Cloud } from "lucide-react";
import { toast } from "sonner";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useProfileEditor } from "@/lib/hooks/use-profile";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface SessionStatus {
    connected: boolean;
    status: 'active' | 'requires_refresh' | 'requires_configuration' | 'disconnected';
    lastValidatedAt: string | null;
    lastRefreshedAt: string | null;
    errorMessage: string | null;
}

export function VintedConnect() {
    const [isLoading, setIsLoading] = useState(false);
    const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
    const [cookie, setCookie] = useState("");
    const [showInput, setShowInput] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ synced: number; failed: number; sold?: number; reserved?: number } | null>(null);

    const { profile, loading: profileLoading } = useProfileEditor();
    const userId = profile?.id;

    const fetchStatus = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await fetch(`/api/v1/integrations/vinted/status?userId=${userId}`);
            const data = await res.json();
            if (data.success) {
                setSessionStatus(data);
            }
        } catch {
            // Silently fail or show toast
            // toast.error("Erreur de statut Vinted");
        }
    }, [userId]);

    // Check initial connection status
    useEffect(() => {
        if (userId) fetchStatus();
    }, [userId, fetchStatus]);

    const handleTestSession = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/v1/integrations/vinted/status?userId=${userId}&verify=true`);
            const data = await res.json();

            if (data.valid) {
                toast.success("Session valide", { description: data.message });
                setSessionStatus(data);
            } else {
                toast.error("Session invalide", { description: data.message });
                setSessionStatus(prev => prev ? { ...prev, status: 'requires_refresh' } : null);
            }
        } catch {
            toast.error("Erreur de test");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/v1/integrations/vinted/status?userId=${userId}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            if (data.success) {
                toast.success("Déconnecté de Vinted");
                setSessionStatus({ connected: false, status: 'disconnected', lastValidatedAt: null, lastRefreshedAt: null, errorMessage: null });
            }
        } catch {
            toast.error("Erreur lors de la déconnexion");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSyncAll = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetch('/api/v1/vinted/sync-all', { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                setSyncResult({
                    synced: data.synced,
                    failed: data.failed,
                    sold: data.sold || 0,
                    reserved: data.reserved || 0
                });

                // Build toast description
                let description = `${data.synced} produits synchronisés`;
                if (data.sold > 0) description = `🎉 ${data.sold} vente(s) détectée(s)! ${description}`;
                if (data.reserved > 0) description += `, ${data.reserved} réservation(s)`;
                if (data.failed > 0) description += ` (${data.failed} échecs)`;

                toast.success(data.sold > 0 ? "Vente détectée!" : "Synchronisation terminée", {
                    description
                });
            } else {
                throw new Error(data.error || 'Sync failed');
            }
        } catch (e) {
            toast.error("Erreur de synchronisation", {
                description: e instanceof Error ? e.message : 'Une erreur est survenue'
            });
        } finally {
            setSyncing(false);
        }
    };

    const handleConnect = async () => {
        if (!userId) {
            toast.error("Profil utilisateur non chargé");
            return;
        }
        if (!cookie.trim()) {
            toast.error("Veuillez entrer le cookie");
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch("/api/v1/integrations/vinted/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, cookie: cookie.trim() }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                toast.success("Connexion réussie", {
                    description: "Votre session Vinted a été sauvegardée.",
                });
                setCookie("");
                setShowInput(false);
                fetchStatus();
            } else {
                throw new Error(data.message || "Erreur inconnue");
            }
        } catch (error) {
            toast.error("Échec de connexion", {
                description: error instanceof Error ? error.message : "Une erreur est survenue",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const isConnected = sessionStatus?.connected || false;
    const statusColor = sessionStatus?.status === 'active' ? 'bg-green-500' :
        sessionStatus?.status === 'requires_refresh' ? 'bg-orange-500' : 'bg-gray-400';

    const lastValidated = sessionStatus?.lastValidatedAt
        ? formatDistanceToNow(new Date(sessionStatus.lastValidatedAt), { addSuffix: true, locale: fr })
        : null;

    return (
        <Card className="border-l-4 border-l-[#007782] w-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            Vinted Integration
                            {sessionStatus && (
                                <Badge
                                    variant="secondary"
                                    className={`text-xs flex items-center gap-1 ${sessionStatus.status === 'active' ? 'bg-green-100 text-green-700' :
                                        sessionStatus.status === 'requires_refresh' ? 'bg-orange-100 text-orange-700' :
                                            'bg-gray-100 text-gray-600'
                                        }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                                    {sessionStatus.status === 'active' ? 'Connecté' :
                                        sessionStatus.status === 'requires_refresh' ? 'À renouveler' :
                                            sessionStatus.status === 'requires_configuration' ? 'Configuration requise' :
                                                'Déconnecté'}
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            Connectez votre compte pour activer l'analyse de marché et la gestion des articles.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Not connected or showing input */}
                {(!isConnected || showInput) && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="cookie">Cookie de Session (_vinted_fr_session)</Label>
                            <Input
                                id="cookie"
                                type="password"
                                placeholder="Collez le contenu de _vinted_fr_session ici..."
                                value={cookie}
                                onChange={(e) => setCookie(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Vos données sont chiffrées et stockées localement.
                            </p>
                        </div>

                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger className="text-sm">Comment récupérer mon cookie ?</AccordionTrigger>
                                <AccordionContent className="text-sm text-gray-600 space-y-2">
                                    <p>1. Connectez-vous à Vinted.fr dans votre navigateur habituel.</p>
                                    <p>2. Ouvrez les outils de développement (F12 ou clic droit &gt; Inspecter).</p>
                                    <p>3. Allez dans l'onglet <strong>Application</strong> &gt; <strong>Cookies</strong> &gt; <strong>https://www.vinted.fr</strong>.</p>
                                    <p>4. Cherchez le cookie nommé <code>_vinted_fr_session</code>.</p>
                                    <p>5. Copiez sa valeur et collez-la ci-dessus.</p>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleConnect}
                                disabled={isLoading || !cookie || profileLoading || !userId}
                                className="bg-[#007782] hover:bg-[#006670]"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Validation...
                                    </>
                                ) : (
                                    "Sauvegarder la session"
                                )}
                            </Button>
                            {isConnected && (
                                <Button variant="ghost" onClick={() => setShowInput(false)}>
                                    Annuler
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Connected state */}
                {isConnected && !showInput && (
                    <div className={`p-4 rounded-md flex items-start gap-3 ${sessionStatus?.status === 'active' ? 'bg-green-50' :
                        sessionStatus?.status === 'requires_refresh' ? 'bg-orange-50' : 'bg-gray-50'
                        }`}>
                        {sessionStatus?.status === 'active' ? (
                            <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                            <h4 className={`font-medium ${sessionStatus?.status === 'active' ? 'text-green-800' : 'text-orange-800'
                                }`}>
                                {sessionStatus?.status === 'active' ? 'Session Active' : 'Session à renouveler'}
                            </h4>
                            <p className={`text-sm mt-1 ${sessionStatus?.status === 'active' ? 'text-green-700' : 'text-orange-700'
                                }`}>
                                {sessionStatus?.status === 'active'
                                    ? "Votre session est configurée. Vous pouvez utiliser l'outil d'analyse de marché."
                                    : sessionStatus?.errorMessage || "La session a expiré, veuillez la renouveler."}
                            </p>

                            {lastValidated && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    Dernière validation: {lastValidated}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 mt-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTestSession}
                                    disabled={isLoading}
                                    className="h-8"
                                >
                                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                                    Tester
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSyncAll}
                                    disabled={syncing}
                                    className="h-8 bg-blue-50 hover:bg-blue-100 border-blue-200"
                                >
                                    {syncing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Cloud className="w-3 h-3 mr-1" />}
                                    Sync tous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowInput(true)}
                                    className="h-8"
                                >
                                    Mettre à jour
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDisconnect}
                                    disabled={isLoading}
                                    className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <LogOut className="w-3 h-3 mr-1" />
                                    Déconnecter
                                </Button>
                            </div>
                            {syncResult && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                    Dernière sync: {syncResult.synced} produits
                                    {syncResult.sold && syncResult.sold > 0 && (
                                        <span className="text-green-600 ml-1">• {syncResult.sold} vente(s) 🎉</span>
                                    )}
                                    {syncResult.reserved && syncResult.reserved > 0 && (
                                        <span className="text-blue-600 ml-1">• {syncResult.reserved} réservation(s)</span>
                                    )}
                                    {syncResult.failed > 0 && (
                                        <span className="text-orange-600 ml-1">• {syncResult.failed} échec(s)</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
