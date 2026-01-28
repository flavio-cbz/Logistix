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
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, CloudOff, XCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { logger } from "@/lib/utils/logging/logger";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

interface Job {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelling' | 'cancelled';
  progress: number;
  result?: {
    message?: string;
    error?: string;
    [key: string]: unknown
  };
}

export function SuperbuySyncDialog({ trigger, onSyncComplete }: SuperbuySyncDialogProps) {
  const [open, setOpen] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrichProducts, setEnrichProducts] = useState(true);
  const { formatDateTime } = useFormatting();

  // Job State
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Fetch integration status
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
      setTimeout(() => setCheckingStatus(false), 300);
    }
  }, []);

  // Check for existing active jobs
  const checkForActiveJob = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/jobs");
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          const syncJob = result.data.find((j: Job) => j.type === 'superbuy_sync');
          if (syncJob) {
            setActiveJob(syncJob);
          }
        }
      }
    } catch (e) {
      logger.error("Failed to check active jobs", { error: e });
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchStatus();
      checkForActiveJob();
      setError(null);
    }
  }, [open, fetchStatus, checkForActiveJob]);

  // SSE Connection for real-time updates
  useEffect(() => {
    if (!open) return undefined;

    let eventSource: EventSource | null = null;
    let fallbackPollInterval: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      eventSource = new EventSource("/api/v1/sse/events");

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "job:update" && data.payload) {
            const payload = data.payload;

            // Update activeJob if it matches
            setActiveJob((prev) => {
              if (!prev || prev.id !== payload.jobId) return prev;

              const updated: Job = {
                ...prev,
                status: payload.status,
                progress: payload.progress,
                result: payload.result,
              };

              // Handle completion states
              if (payload.status === "completed") {
                toast.success("Synchronisation terminée !");
                onSyncComplete?.();
              } else if (payload.status === "failed") {
                toast.error("Échec de la synchronisation");
              } else if (payload.status === "cancelled") {
                toast.info("Synchronisation annulée");
              }

              return updated;
            });
          }
        } catch (e) {
          logger.error("SSE parse error", { error: e });
        }
      };

      eventSource.onerror = () => {
        // SSE failed, fall back to polling
        eventSource?.close();
        eventSource = null;

        if (!fallbackPollInterval && activeJob && !['completed', 'failed', 'cancelled'].includes(activeJob.status)) {
          fallbackPollInterval = setInterval(async () => {
            try {
              const response = await fetch("/api/v1/jobs");
              if (response.ok) {
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                  const updatedJob = result.data.find((j: Job) => j.id === activeJob?.id);
                  if (updatedJob) {
                    setActiveJob(updatedJob);
                  } else {
                    setActiveJob((prev) => prev ? { ...prev, status: 'completed', progress: 100 } : null);
                    toast.success("Synchronisation terminée");
                    onSyncComplete?.();
                  }
                }
              }
            } catch (e) {
              logger.error("Polling error", { error: e });
            }
          }, 2000);
        }
      };
    };

    connectSSE();

    return () => {
      eventSource?.close();
      if (fallbackPollInterval) clearInterval(fallbackPollInterval);
    };
  }, [open, activeJob, onSyncComplete]);


  const startSync = async () => {
    setError(null);
    try {
      const response = await fetch("/api/v1/sync/superbuy/background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrichProducts }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || "Erreur de démarrage");

      // Set active job immediately to start polling
      setActiveJob({
        id: data.data.jobId,
        type: 'superbuy_sync',
        status: 'pending',
        progress: 0,
        result: { message: "Démarrage..." }
      });

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  const cancelSync = async () => {
    if (!activeJob) return;
    setCancelling(true);
    try {
      await fetch(`/api/v1/jobs/${activeJob.id}/cancel`, { method: "POST" });
      toast.info("Annulation demandée...");
      // Optimistic update
      setActiveJob(prev => prev ? { ...prev, status: 'cancelling' } : null);
    } catch (_e) {
      toast.error("Échec de l'annulation");
    } finally {
      setCancelling(false);
    }
  };

  const isSyncing = activeJob && ['pending', 'processing', 'cancelling'].includes(activeJob.status);

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // Allow closing even if syncing, it continues in background.
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
      <DialogContent className="sm:max-w-[450px] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Synchronisation Superbuy
            {status?.connected && (
              <Badge variant="secondary" className="bg-success/15 text-success">
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
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="py-2 min-h-[150px] flex items-center justify-center relative">
          {checkingStatus ? (
            <div className="flex flex-col items-center justify-center space-y-4 w-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Vérification...</p>
            </div>
          ) : isSyncing ? (
            <div className="w-full space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-primary">
                    {activeJob?.status === 'cancelling' ? 'Annulation en cours...' : 'Synchronisation en cours...'}
                  </span>
                  <span className="text-muted-foreground">{activeJob?.progress}%</span>
                </div>
                <Progress value={activeJob?.progress || 0} className="h-2" />
                <p className="text-xs text-muted-foreground h-5 truncate">
                  {activeJob?.result?.message || "Traitement..."}
                </p>
              </div>

              <div className="flex justify-center">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={cancelSync}
                  disabled={cancelling || activeJob?.status === 'cancelling'}
                >
                  {cancelling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Annuler la synchronisation
                </Button>
              </div>
            </div>
          ) : status?.connected ? (
            <div className="space-y-4 w-full">
              {activeJob?.status === 'completed' && (
                <Alert className="bg-success/10 border-success/20 text-success mb-4">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>Synchronisation terminée avec succès !</AlertDescription>
                </Alert>
              )}
              {activeJob?.status === 'failed' && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Échec: {activeJob?.result?.error || "Erreur inconnue"}</AlertDescription>
                </Alert>
              )}

              <div className="bg-muted/50 rounded-lg p-5 space-y-3 border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Compte relié</span>
                  <span className="text-sm font-medium">{status.email || "Compte principal"}</span>
                </div>
                {status.lastSyncAt && (
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">Dernière synchro</span>
                    <span className="text-sm">{formatDateTime(status.lastSyncAt)}</span>
                  </div>
                )}
              </div>

              <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="enrich-mode" className="flex flex-col gap-1 cursor-pointer">
                    <span className="font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      Enrichissement IA
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">
                      Analyser automatiquement les nouveaux produits (marque, catégorie...)
                    </span>
                  </Label>
                  <Switch
                    id="enrich-mode"
                    checked={enrichProducts}
                    onCheckedChange={setEnrichProducts}
                  />
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center space-y-4">
              <CloudOff className="h-10 w-10 text-warning mx-auto" />
              <p className="font-semibold">Non connecté</p>
              <Button asChild variant="outline" onClick={() => setOpen(false)}>
                <Link href="/settings">Configurer</Link>
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          {status?.connected && !isSyncing && !checkingStatus && (
            <Button onClick={startSync} className="w-full sm:w-auto">
              <RefreshCw className="mr-2 h-4 w-4" />
              {activeJob?.status === 'completed' ? 'Relancer' : 'Synchroniser maintenant'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

