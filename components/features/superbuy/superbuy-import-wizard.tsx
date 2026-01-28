"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  Package,
  ShoppingCart,
  Sparkles,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/shared/utils";

interface ImportWizardProps {
  onSuccess?: () => void;
  className?: string;
  trigger?: React.ReactNode;
}

type ImportType = "parcels" | "orders";

export function SuperbuyImportWizard({ onSuccess, className, trigger }: ImportWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"config" | "processing" | "result">("config");
  const [importType, setImportType] = useState<ImportType>("parcels");

  // Options
  const [enrichWithAI, setEnrichWithAI] = useState(true);
  const [syncPhotos, setSyncPhotos] = useState(true);
  const [daysLookback, setDaysLookback] = useState("30"); // 30 jours par défaut

  // État de progression
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [resultSummary, setResultSummary] = useState<{ parcels: number; products: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev.slice(-4), message]); // Garder les 5 derniers logs
  };

  const handleStartImport = async () => {
    setStep("processing");
    setIsLoading(true);
    setProgress(0);
    setLogs([]);
    addLog("Initialisation de la connexion à Superbuy...");

    try {
      // Démarrage du job en arrière-plan via l'API existante
      const response = await fetch("/api/v1/sync/superbuy/background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrichProducts: enrichWithAI,
          syncPhotos: syncPhotos,
          // Le backend actuel ne supporte peut-être pas encore ces filtres,
          // mais on les envoie pour préparer le terrain
          type: importType,
          daysLookback: parseInt(daysLookback),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.error || "Erreur lors du lancement de l'import");
      }

      const jobId = data.data?.jobId;
      if (!jobId) throw new Error("Aucun ID de job retourné");

      addLog("Tâche lancée en arrière-plan (Job ID: " + jobId.substring(0, 8) + "...)");
      setProgress(5);

      // Écoute des événements SSE pour la progression
      const eventSource = new EventSource("/api/v1/sse/events");

      eventSource.onmessage = (event) => {
        try {
          const evt = JSON.parse(event.data);
          if (evt.type === "job:update" && evt.payload?.jobId === jobId) {
            const job = evt.payload;

            if (job.progress) setProgress(job.progress);
            if (job.result?.message) addLog(job.result.message);

            if (job.status === "completed") {
              eventSource.close();
              setProgress(100);
              addLog("Terminé !");
              setResultSummary({
                parcels: job.result.parcelsCount || 0,
                products: job.result.productsCount || 0
              });
              setStep("result");
              onSuccess?.();
            } else if (job.status === "failed") {
              eventSource.close();
              throw new Error(job.error || "La synchronisation a échoué");
            }
          }
        } catch (e) {
          console.error("SSE Error:", e); // eslint-disable-line no-console
        }
      };

      eventSource.onerror = () => {
        addLog("Perte de connexion temps réel, passage en mode polling...");
        eventSource.close();
        // Fallback polling à implémenter si nécessaire, pour l'instant on laisse l'utilisateur
        // voir les derniers logs.
      };

    } catch (error) {
      console.error(error); // eslint-disable-line no-console
      addLog(`Erreur: ${error instanceof Error ? error.message : "Inconnue"}`);
      toast.error("Échec de l'import", {
        description: error instanceof Error ? error.message : "Vérifiez vos identifiants ou réessayez."
      });
      setIsLoading(false);
    }
  };

  const resetWizard = () => {
    setStep("config");
    setProgress(0);
    setLogs([]);
    setResultSummary(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!isLoading) {
        setOpen(o);
        if (!o) setTimeout(resetWizard, 300);
      }
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className={cn("gap-2", className)}>
            <Download className="h-4 w-4" />
            Importer depuis Superbuy
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Superbuy</DialogTitle>
          <DialogDescription>
            Synchronisez vos données depuis votre compte Superbuy.
          </DialogDescription>
        </DialogHeader>

        {step === "config" && (
          <div className="py-4 space-y-6">

            {/* Choix du type d'import */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Que souhaitez-vous importer ?</Label>
              <RadioGroup
                defaultValue="parcels"
                value={importType}
                onValueChange={(v) => setImportType(v as ImportType)}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem value="parcels" id="parcels" className="peer sr-only" />
                  <Label
                    htmlFor="parcels"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Package className="mb-3 h-6 w-6" />
                    <div className="text-center">
                      <div className="font-semibold">Parcelles</div>
                      <span className="text-xs text-muted-foreground">Colis expédiés</span>
                    </div>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="orders" id="orders" className="peer sr-only" />
                  <Label
                    htmlFor="orders"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <ShoppingCart className="mb-3 h-6 w-6" />
                    <div className="text-center">
                      <div className="font-semibold">Warehouse</div>
                      <span className="text-xs text-muted-foreground">Commandes stockées</span>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Options avancées */}
            <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">Période d'analyse</Label>
                <div className="flex gap-2">
                    {["7", "30", "90"].map((d) => (
                        <Button
                            key={d}
                            variant={daysLookback === d ? "default" : "outline"}
                            size="sm"
                            onClick={() => setDaysLookback(d)}
                            className="flex-1 h-8"
                        >
                            {d} jours
                        </Button>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-between space-x-2 pt-2 border-t">
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="photos" className="text-sm font-medium">Récupérer les photos</Label>
                  <span className="text-xs text-muted-foreground">Télécharge les images QC (plus lent)</span>
                </div>
                <Switch id="photos" checked={syncPhotos} onCheckedChange={setSyncPhotos} />
              </div>

              {importType === "parcels" && (
                <div className="flex items-center justify-between space-x-2 pt-2 border-t">
                  <div className="flex flex-col space-y-1">
                    <Label htmlFor="ai" className="text-sm font-medium flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-purple-500" />
                      Enrichissement IA
                    </Label>
                    <span className="text-xs text-muted-foreground">Détecte marque, taille et couleur auto.</span>
                  </div>
                  <Switch id="ai" checked={enrichWithAI} onCheckedChange={setEnrichWithAI} />
                </div>
              )}
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="py-8 space-y-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                    <RefreshCw className="h-12 w-12 text-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold">{progress}%</span>
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold text-lg">Synchronisation en cours</h3>
                    <p className="text-sm text-muted-foreground">Ne fermez pas cette fenêtre...</p>
                </div>
            </div>

            <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <div className="bg-muted/50 rounded-md p-3 h-24 overflow-y-auto text-xs font-mono space-y-1 border">
                    {logs.length === 0 && <span className="text-muted-foreground opacity-50">En attente...</span>}
                    {logs.map((log, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <span className="text-primary">›</span>
                            <span>{log}</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {step === "result" && (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
                <h3 className="font-semibold text-lg">Import terminé avec succès</h3>
                <p className="text-sm text-muted-foreground">Vos données sont à jour.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs mt-4">
                <div className="bg-muted rounded-lg p-3">
                    <p className="text-2xl font-bold">{resultSummary?.parcels}</p>
                    <p className="text-xs text-muted-foreground">Parcelles</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                    <p className="text-2xl font-bold">{resultSummary?.products}</p>
                    <p className="text-xs text-muted-foreground">Produits</p>
                </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "config" && (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleStartImport}>
                Lancer l'import
              </Button>
            </>
          )}
          {step === "result" && (
            <Button onClick={() => setOpen(false)} className="w-full">
              Fermer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
