"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, Settings, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface SuperbuySyncDialogProps {
  trigger?: React.ReactNode;
  onSyncComplete?: () => void;
}

interface IntegrationStatus {
  connected: boolean;
  email?: string | null;
  lastSyncAt?: string | null;
  configuredAt?: string;
}

export function SuperbuySyncDialog({ trigger, onSyncComplete }: SuperbuySyncDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState("Initialisation...");
  const [error, setError] = useState<string | null>(null);

  // Fetch integration status when dialog opens
  const fetchStatus = useCallback(async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch("/api/v1/integrations/superbuy/status");
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
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
    if (open) {
      fetchStatus();
      setError(null);
    }
  }, [open, fetchStatus]);

  // Cycle status messages during sync
  useEffect(() => {
    if (loading) {
      const messages = [
        "Connexion à Superbuy...",
        "Vérification de la session...",
        "Récupération des colis...",
        "Analyse des données...",
        "Synchronisation en cours...",
        "Mise à jour de la base de données...",
      ];
      let i = 0;
      const interval = setInterval(() => {
        const msg = messages[i % messages.length];
        if (msg) setStatusMessage(msg);
        i++;
      }, 3000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [loading]);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    setStatusMessage("Démarrage de la synchronisation...");

    try {
      // Call sync without credentials - backend will use stored ones
      const response = await fetch("/api/v1/integrations/superbuy/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Erreur lors de la synchronisation");
      }

      const parcelsCount = data.data?.parcelsCount ?? 0;
      const ordersCount = data.data?.ordersCount ?? 0;

      toast.success("Synchronisation réussie", {
        description: `${parcelsCount} parcelle(s) et ${ordersCount} commande(s) synchronisées.`,
      });

      setOpen(false);
      onSyncComplete?.();

      // Refresh status for next time
      fetchStatus();

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Une erreur inconnue est survenue";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
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

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (loading) return; // Prevent closing while loading
      setOpen(val);
      if (!val) setError(null);
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Superbuy
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Synchronisation Superbuy
            {status?.connected && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Connecté
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Importez automatiquement vos colis et produits depuis Superbuy.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="py-4">
          {checkingStatus ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 relative z-10" />
              </div>
              <p className="text-sm font-medium text-center animate-pulse text-blue-600">
                {statusMessage}
              </p>
              <p className="text-xs text-muted-foreground text-center max-w-[280px]">
                Cette opération peut prendre quelques minutes selon la quantité de données.
              </p>
            </div>
          ) : status?.connected ? (
            <div className="space-y-4">
              {/* Connected state */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Compte</span>
                  <span className="text-sm font-medium">{status.email || "Configuré"}</span>
                </div>
                {status.lastSyncAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Dernière sync</span>
                    <span className="text-sm">{formatDate(status.lastSyncAt)}</span>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-400">
                <p>
                  Cliquez sur &quot;Synchroniser&quot; pour importer les dernières données.
                  Les colis et produits existants seront mis à jour automatiquement.
                </p>
              </div>
            </div>
          ) : (
            /* Not connected state */
            <div className="space-y-4">
              <div className="flex flex-col items-center py-6 space-y-3">
                <div className="p-3 bg-amber-100 dark:bg-amber-950/30 rounded-full">
                  <CloudOff className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-medium">Intégration non configurée</p>
                  <p className="text-sm text-muted-foreground">
                    Configurez vos identifiants Superbuy dans les paramètres pour activer la synchronisation.
                  </p>
                </div>
              </div>

              <Button asChild variant="outline" className="w-full">
                <Link href="/settings" onClick={() => setOpen(false)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configurer dans les Paramètres
                </Link>
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          {status?.connected && !loading && (
            <Button onClick={handleSync} className="w-full sm:w-auto">
              <RefreshCw className="mr-2 h-4 w-4" />
              Synchroniser maintenant
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
