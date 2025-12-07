"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, RefreshCw, Trash2, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface IntegrationStatus {
  connected: boolean;
  email?: string | null;
  lastSyncAt?: string | null;
  configuredAt?: string;
}

export function SuperbuyConnect() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);

  // Fetch current integration status on mount
  const fetchStatus = useCallback(async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch("/api/v1/integrations/superbuy/status");
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        if (data.email) {
          setEmail(data.email);
        }
      } else {
        setStatus({ connected: false });
      }
    } catch {
      setStatus({ connected: false });
    } finally {
      setCheckingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Erreur", { description: "Veuillez remplir tous les champs" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/integrations/superbuy/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Connexion échouée");

      toast.success("Connecté", {
        description: "Compte Superbuy connecté avec succès. Vos identifiants ont été enregistrés."
      });

      // Refresh status
      await fetchStatus();
      setPassword(""); // Clear password for security

    } catch (error) {
      toast.error("Erreur", {
        description: error instanceof Error ? error.message : "Échec de la connexion",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/v1/integrations/superbuy/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Synchronisation échouée");

      const parcelsCount = data.data?.parcelsCount ?? 0;
      const ordersCount = data.data?.ordersCount ?? 0;

      toast.success("Synchronisation terminée", {
        description: `${parcelsCount} parcelle(s) et ${ordersCount} commande(s) synchronisées.`
      });

      // Refresh status to update lastSyncAt
      await fetchStatus();

    } catch (error) {
      toast.error("Erreur", {
        description: error instanceof Error ? error.message : "Échec de la synchronisation",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    // For now, just clear the UI state - a proper disconnect would need an API endpoint
    setStatus({ connected: false });
    setEmail("");
    setPassword("");
    toast.info("Déconnecté", {
      description: "Pour reconnecter, entrez à nouveau vos identifiants."
    });
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (checkingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Intégration Superbuy</CardTitle>
          <CardDescription>Chargement...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              Intégration Superbuy
              {status?.connected && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Connecté
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Connectez votre compte Superbuy pour synchroniser automatiquement vos colis et produits.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected ? (
          <>
            {/* Connected State */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Compte</span>
                <span className="text-sm font-medium">{status.email}</span>
              </div>
              {status.lastSyncAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dernière synchronisation</span>
                  <span className="text-sm">{formatDate(status.lastSyncAt)}</span>
                </div>
              )}
              {status.configuredAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Configuré le</span>
                  <span className="text-sm">{formatDate(status.configuredAt)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="flex-1"
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Synchroniser maintenant
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDisconnect}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Vos identifiants sont stockés de manière sécurisée. La synchronisation peut également être lancée depuis les pages Parcelles ou Produits.
            </p>
          </>
        ) : (
          <>
            {/* Not Connected State */}
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="sb-email">Email Superbuy</Label>
                <Input
                  id="sb-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  disabled={loading}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sb-password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="sb-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-400">
                <p className="font-semibold mb-1">Note importante :</p>
                <p>
                  Lors de la première connexion, un navigateur s&apos;ouvrira pour résoudre le captcha de Superbuy.
                  Ne fermez pas cette fenêtre. L&apos;opération peut prendre environ 1 minute.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Connecter le compte
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
