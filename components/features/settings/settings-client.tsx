"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Palette,
  Shield,
  Settings as SettingsIcon,
  Plug,
  LogOut,
  Trash,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SuperbuyConnect } from "./superbuy-connect";

interface SettingsData {
  theme: string;
  language: string;
  animations: boolean;
  preferences: {
    currency: string;
    weightUnit: string;
    dateFormat: string;
    autoExchangeRate: boolean;
  };
}

interface SettingsClientProps {
  initialData?: SettingsData;
}

export function SettingsClient({ initialData }: SettingsClientProps) {
  const [settings, setSettings] = useState<SettingsData | null>(
    initialData || null,
  );
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessions, setSessions] = useState<Array<any>>([]);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<any | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );


  const getApiErrorMessage = (
    apiResponse: any,
    fallback = "Erreur inconnue",
  ) => {
    try {
      if (!apiResponse) return fallback;
      if (typeof apiResponse === "string") return apiResponse;
      const err = apiResponse.error || apiResponse;
      if (!err) return fallback;
      if (typeof err === "string") return err;
      if (err.message) {
        if (
          Array.isArray(err.validationErrors) &&
          err.validationErrors.length
        ) {
          const details = err.validationErrors
            .map((v: any) => (v.field ? `${v.field}: ${v.message}` : v.message))
            .join("; ");
          return `${err.message} — ${details}`;
        }
        return err.message;
      }
      return JSON.stringify(err);
    } catch {
      return fallback;
    }
  };

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/settings");
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (_error) {
      toast.error("Erreur", {
        description: "Impossible de charger les paramètres",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!initialData) {
      loadSettings();
    } else {
      setSettings(initialData);
      setLoading(false);
    }

  }, [initialData, loadSettings]);

  const saveSettings = async (partialSettings: Partial<SettingsData>) => {
    setSaving(true);
    try {
      const response = await fetch("/api/v1/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partialSettings),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Succès", {
          description: "Paramètres sauvegardés avec succès",
        });
        // Recharger les settings
        await loadSettings();
      } else {
        const message = getApiErrorMessage(
          data,
          "Erreur lors de la sauvegarde",
        );
        throw new Error(message);
      }
    } catch (error) {
      toast.error("Erreur", {
        description:
          error instanceof Error
            ? error.message
            : "Erreur lors de la sauvegarde",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (theme: string) => {
    setSettings((prev) => (prev ? { ...prev, theme } : null));
    saveSettings({ theme });
  };

  const handleLanguageChange = (language: string) => {
    setSettings((prev) => (prev ? { ...prev, language } : null));
    saveSettings({ language });
  };

  const handleAnimationsChange = (animations: boolean) => {
    setSettings((prev) => (prev ? { ...prev, animations } : null));
    saveSettings({ animations });
  };

  const handlePreferenceChange = (
    key: keyof SettingsData["preferences"],
    value: any,
  ) => {
    setSettings((prev) =>
      prev
        ? {
          ...prev,
          preferences: { ...prev.preferences, [key]: value },
        }
        : null,
    );
  };

  const savePreferences = () => {
    if (settings) {
      saveSettings({ preferences: settings.preferences });
    }
  };

  // --- Sessions management ---
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/v1/sessions");
      const json = await res.json();
      if (json.success) {
        setSessions(json.data.sessions || []);
      } else {
        throw new Error(json.error || "Impossible de charger les sessions");
      }
    } catch (err) {
      toast.error("Erreur", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSessionsLoading(false);
    }
  }, [toast]);

  const handleDeleteSession = async (id: string) => {
    setDeletingSessionId(id);
    try {
      const res = await fetch(`/api/v1/sessions/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Succès", {
          description: json.data?.message || "Session supprimée",
        });
        await fetchSessions();
      } else {
        throw new Error(json.error || "Erreur lors de la suppression");
      }
    } catch (err) {
      toast.error("Erreur", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setDeletingSessionId(null);
      setSessionToDelete(null);
    }
  };

  useEffect(() => {
    // Pré-charger les sessions lorsque l'onglet sécurité est accessible
    // (On load initial pour simplicité)
    fetchSessions();

  }, [fetchSessions]);

  function SessionsList() {
    if (sessionsLoading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      );
    }

    if (!sessions.length) {
      return (
        <p className="text-sm text-muted-foreground">
          Aucune session active trouvée.
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {sessions.map((s: any) => (
          <div
            key={s.id}
            className="flex items-center justify-between p-3 border rounded"
          >
            <div>
              <div className="font-medium">{s.deviceName || "Inconnu"}</div>
              <div className="text-sm text-muted-foreground">
                {s.deviceType} • {s.ipAddress}
              </div>
              <div className="text-xs text-muted-foreground">
                Dernière activité: {new Date(s.lastActivityAt).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {s.isCurrent ? (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                  Actuelle
                </span>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSessionToDelete(s)}
                  >
                    <Trash className="w-4 h-4 mr-1" />
                    Terminer
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Session delete confirmation dialog
  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    await handleDeleteSession(sessionToDelete.id);
  };

  if (loading || !settings) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Apparence</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Sécurité</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Préférences</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Intégrations</span>
          </TabsTrigger>
        </TabsList>

        {/* Onglet Apparence */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Apparence de l'interface</CardTitle>
              <CardDescription>
                Personnalisez l'apparence de l'application selon vos préférences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Thème</Label>
                <Select
                  value={settings.theme}
                  onValueChange={handleThemeChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Clair</SelectItem>
                    <SelectItem value="dark">Sombre</SelectItem>
                    <SelectItem value="system">Système</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Choisissez le thème de couleur de l'interface
                </p>
              </div>

              <div className="space-y-2">
                <Label>Langue</Label>
                <Select
                  value={settings.language}
                  onValueChange={handleLanguageChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Langue de l'interface utilisateur
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Animations</Label>
                  <p className="text-sm text-muted-foreground">
                    Activer les animations d'interface
                  </p>
                </div>
                <Switch
                  checked={settings.animations}
                  onCheckedChange={handleAnimationsChange}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Sécurité */}
        <TabsContent value="security" className="space-y-4" forceMount>
          <Card>
            <CardHeader>
              <CardTitle>Sécurité du compte</CardTitle>
              <CardDescription>
                Gérez les sessions actives et la sécurité de votre compte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Gérer vos sessions actives : terminez des sessions
                    individuelles ou toutes les autres sessions à distance.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteAllDialog(true)}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Terminer les autres sessions
                  </Button>
                  {/* Delete all dialog */}
                  <Dialog
                    open={showDeleteAllDialog}
                    onOpenChange={setShowDeleteAllDialog}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Terminer les autres sessions</DialogTitle>
                        <DialogDescription>
                          Voulez-vous vraiment terminer toutes les autres
                          sessions actives ? Cette action déconnectera vos
                          sessions sur d'autres appareils.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                          Sessions trouvées :{" "}
                          {sessions.filter((s) => !s.isCurrent).length}
                        </p>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="ghost"
                          onClick={() => setShowDeleteAllDialog(false)}
                        >
                          Annuler
                        </Button>
                        <Button
                          onClick={async () => {
                            setDeletingAll(true);
                            try {
                              const res = await fetch("/api/v1/sessions", {
                                method: "DELETE",
                              });
                              const json = await res.json();
                              if (json.success) {
                                toast.success("Succès", {
                                  description:
                                    json.data?.message || "Sessions terminées",
                                });
                                await fetchSessions();
                                setShowDeleteAllDialog(false);
                              } else {
                                throw new Error(
                                  json.error || "Erreur lors de la suppression",
                                );
                              }
                            } catch (err) {
                              toast.error("Erreur", {
                                description:
                                  err instanceof Error
                                    ? err.message
                                    : String(err),
                              });
                            } finally {
                              setDeletingAll(false);
                            }
                          }}
                          disabled={deletingAll}
                        >
                          {deletingAll
                            ? "Suppression..."
                            : "Terminer les autres"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div>
                {/* Sessions list */}
                <SessionsList />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Préférences */}
        <TabsContent value="preferences" className="space-y-4" forceMount>
          <Card>
            <CardHeader>
              <CardTitle>Préférences métier</CardTitle>
              <CardDescription>
                Configurez les paramètres par défaut pour votre activité
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Devise par défaut</Label>
                <Select
                  value={settings.preferences.currency}
                  onValueChange={(value) =>
                    handlePreferenceChange("currency", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">Euro (€)</SelectItem>
                    <SelectItem value="USD">Dollar US ($)</SelectItem>
                    <SelectItem value="CNY">Yuan chinois (¥)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unité de poids</Label>
                <Select
                  value={settings.preferences.weightUnit}
                  onValueChange={(value) =>
                    handlePreferenceChange("weightUnit", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">Grammes (g)</SelectItem>
                    <SelectItem value="kg">Kilogrammes (kg)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Format de date</Label>
                <Select
                  value={settings.preferences.dateFormat}
                  onValueChange={(value) =>
                    handlePreferenceChange("dateFormat", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">JJ/MM/AAAA</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/JJ/AAAA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Taux de change automatique</Label>
                  <p className="text-sm text-muted-foreground">
                    Mise à jour automatique des taux de change
                  </p>
                </div>
                <Switch
                  checked={settings.preferences.autoExchangeRate}
                  onCheckedChange={(value) =>
                    handlePreferenceChange("autoExchangeRate", value)
                  }
                />
              </div>

              <Button
                onClick={savePreferences}
                disabled={saving}
                className="w-full"
              >
                {saving ? "Sauvegarde..." : "Sauvegarder les préférences"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Intégrations */}
        <TabsContent value="integrations" className="space-y-4">
          <SuperbuyConnect />

          <Card>
            <CardHeader>
              <CardTitle>Autres Intégrations</CardTitle>
              <CardDescription>
                Connectez vos comptes marketplace pour une synchronisation
                automatique
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Plug className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Bientôt disponible
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Les intégrations avec Vinted, eBay et d'autres
                  plateformes seront bientôt disponibles.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
      {/* Single session delete dialog */}
      <Dialog
        open={!!sessionToDelete}
        onOpenChange={(open) => {
          if (!open) setSessionToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminer la session</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de terminer la session suivante. Cette
              action est irréversible.
            </DialogDescription>
          </DialogHeader>
          {sessionToDelete && (
            <div className="py-4">
              <div className="font-medium">
                {sessionToDelete.deviceName || "Inconnu"}
              </div>
              <div className="text-sm text-muted-foreground">
                {sessionToDelete.deviceType} • {sessionToDelete.ipAddress}
              </div>
              <div className="text-xs text-muted-foreground">
                Dernière activité:{" "}
                {sessionToDelete.lastActivityAt
                  ? new Date(sessionToDelete.lastActivityAt).toLocaleString()
                  : "Inconnue"}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSessionToDelete(null)}>
              Annuler
            </Button>
            <Button
              onClick={confirmDeleteSession}
              disabled={!!deletingSessionId}
            >
              {deletingSessionId ? "Suppression..." : "Terminer la session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
