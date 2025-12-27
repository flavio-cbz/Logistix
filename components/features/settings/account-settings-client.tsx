"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    User,
    Lock,
    BarChart3,
    Palette,
    Settings as SettingsIcon,
    Plug,
    Save,
    Package,
    ShoppingBag,
    Calendar,
    LogOut,
    Trash,
    Camera,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SuperbuyConnect } from "./superbuy-connect";
import { useFormatting } from "@/lib/hooks/use-formatting";

// Types
interface ProfileData {
    id: string;
    username: string;
    email: string | null;
    avatar: string | null;
    role: string;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
    stats?: {
        totalProducts: number;
        totalParcels: number;
        daysActive: number;
    };
}

interface SettingsData {
    theme: string;
    language: string;
    animations: boolean;
    preferences: {
        currency: string;
        weightUnit: string;
        dateFormat: string;
        autoExchangeRate: boolean;
        manualExchangeRate?: number;
    };
}

interface AccountSettingsClientProps {
    profileData: ProfileData;
    settingsData: SettingsData;
}

export function AccountSettingsClient({
    profileData: initialProfileData,
    settingsData: initialSettingsData,
}: AccountSettingsClientProps) {
    // Theme hook for visual application
    const { setTheme } = useTheme();
    const { formatDateTime } = useFormatting();

    // Hydration fix - only render tabs after client mount
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Tab state - controlled mode to fix navigation issue
    const [activeTab, setActiveTab] = useState("profile");

    // Profile state
    const [profile, setProfile] = useState<ProfileData>(initialProfileData);
    const [editedUsername, setEditedUsername] = useState(initialProfileData.username);
    const [editedAvatar, setEditedAvatar] = useState(initialProfileData.avatar || "");
    const [savingProfile, setSavingProfile] = useState(false);

    // Password state
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [changingPassword, setChangingPassword] = useState(false);

    // Settings state
    const [settings, setSettings] = useState<SettingsData>(initialSettingsData);
    const [saving, setSaving] = useState(false);

    // Sessions state
    const [sessions, setSessions] = useState<any[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<any | null>(null);
    const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

    // Helper function
    const getApiErrorMessage = (apiResponse: any, fallback = "Erreur inconnue") => {
        try {
            if (!apiResponse) return fallback;
            if (typeof apiResponse === "string") return apiResponse;
            const err = apiResponse.error || apiResponse;
            if (!err) return fallback;
            if (typeof err === "string") return err;
            if (err.message) {
                if (Array.isArray(err.validationErrors) && err.validationErrors.length) {
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

    // Profile handlers
    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            const response = await fetch("/api/v1/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: editedUsername,
                    avatar: editedAvatar || null,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setProfile((prev) => ({
                    ...prev,
                    username: editedUsername,
                    avatar: editedAvatar || null,
                }));
                toast.success("Profil mis à jour avec succès");
            } else {
                throw new Error(getApiErrorMessage(data, "Erreur lors de la mise à jour"));
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erreur lors de la mise à jour");
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordChange = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("Les mots de passe ne correspondent pas");
            return;
        }

        if (passwordData.newPassword.length < 8) {
            toast.error("Le mot de passe doit contenir au moins 8 caractères");
            return;
        }

        setChangingPassword(true);
        try {
            const response = await fetch("/api/v1/profile/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(passwordData),
            });

            const data = await response.json();
            if (data.success) {
                toast.success("Mot de passe changé avec succès");
                setShowPasswordDialog(false);
                setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            } else {
                throw new Error(getApiErrorMessage(data, "Erreur lors du changement de mot de passe"));
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erreur lors du changement de mot de passe");
        } finally {
            setChangingPassword(false);
        }
    };

    // Settings handlers
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
                toast.success("Paramètres sauvegardés");
            } else {
                throw new Error(getApiErrorMessage(data, "Erreur lors de la sauvegarde"));
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erreur lors de la sauvegarde");
        } finally {
            setSaving(false);
        }
    };

    const handleThemeChange = (theme: string) => {
        setSettings((prev) => ({ ...prev, theme }));
        setTheme(theme); // Apply theme visually via next-themes
        saveSettings({ theme });
    };

    const handleLanguageChange = (language: string) => {
        setSettings((prev) => ({ ...prev, language }));
        saveSettings({ language });
    };

    const handleAnimationsChange = (animations: boolean) => {
        setSettings((prev) => ({ ...prev, animations }));
        saveSettings({ animations });
    };

    const handlePreferenceChange = (key: keyof SettingsData["preferences"], value: any) => {
        setSettings((prev) => ({
            ...prev,
            preferences: { ...prev.preferences, [key]: value },
        }));
    };

    const savePreferences = () => {
        saveSettings({ preferences: settings.preferences });
    };

    // Sessions handlers
    const fetchSessions = useCallback(async () => {
        setSessionsLoading(true);
        try {
            const res = await fetch("/api/v1/sessions");
            const json = await res.json();
            if (json.success) {
                setSessions(json.data?.sessions || []);
            }
        } catch (err) {
            console.error("Error fetching sessions:", err);
        } finally {
            setSessionsLoading(false);
        }
    }, []);

    const handleDeleteSession = async (id: string) => {
        setDeletingSessionId(id);
        try {
            const res = await fetch(`/api/v1/sessions/${id}`, { method: "DELETE" });
            const json = await res.json();
            if (json.success) {
                toast.success("Session supprimée");
                await fetchSessions();
            } else {
                throw new Error(json.error || "Erreur lors de la suppression");
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
        } finally {
            setDeletingSessionId(null);
            setSessionToDelete(null);
        }
    };

    const handleDeleteAllSessions = async () => {
        setDeletingAll(true);
        try {
            const res = await fetch("/api/v1/sessions", { method: "DELETE" });
            const json = await res.json();
            if (json.success) {
                toast.success("Sessions terminées");
                await fetchSessions();
                setShowDeleteAllDialog(false);
            } else {
                throw new Error(json.error || "Erreur lors de la suppression");
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
        } finally {
            setDeletingAll(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const hasProfileChanges = editedUsername !== profile.username || editedAvatar !== (profile.avatar || "");

    // Prevent hydration mismatch - show skeleton until client-side mounted
    if (!mounted) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-6">
                    <TabsTrigger value="profile" className="flex items-center gap-2" data-testid="tab-profile">
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">Profil</span>
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="flex items-center gap-2" data-testid="tab-stats">
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden sm:inline">Statistiques</span>
                    </TabsTrigger>
                    <TabsTrigger value="appearance" className="flex items-center gap-2" data-testid="tab-appearance">
                        <Palette className="h-4 w-4" />
                        <span className="hidden sm:inline">Apparence</span>
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="flex items-center gap-2" data-testid="tab-preferences">
                        <SettingsIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Préférences</span>
                    </TabsTrigger>
                    <TabsTrigger value="integrations" className="flex items-center gap-2" data-testid="tab-integrations">
                        <Plug className="h-4 w-4" />
                        <span className="hidden sm:inline">Intégrations</span>
                    </TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                {activeTab === "profile" && (
                    <div className="space-y-6 mt-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" />
                                    Informations du profil
                                </CardTitle>
                                <CardDescription>
                                    Modifiez votre nom d'utilisateur et votre avatar
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Avatar Section */}
                                <div className="flex items-center gap-6">
                                    <Avatar className="h-20 w-20">
                                        <AvatarImage src={editedAvatar || undefined} alt={profile.username} />
                                        <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                                            {profile.username.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-2">
                                        <Label htmlFor="avatar-url" className="flex items-center gap-2">
                                            <Camera className="h-4 w-4" />
                                            URL de l'avatar
                                        </Label>
                                        <Input
                                            id="avatar-url"
                                            type="url"
                                            value={editedAvatar}
                                            onChange={(e) => setEditedAvatar(e.target.value)}
                                            placeholder="https://exemple.com/avatar.jpg"
                                        />
                                    </div>
                                </div>

                                <Separator />

                                {/* Username */}
                                <div className="space-y-2">
                                    <Label htmlFor="username" className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Nom d'utilisateur
                                    </Label>
                                    <Input
                                        id="username"
                                        value={editedUsername}
                                        onChange={(e) => setEditedUsername(e.target.value)}
                                        placeholder="Votre nom d'utilisateur"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Ce nom sera visible dans l'application
                                    </p>
                                </div>

                                {/* Save Button */}
                                {hasProfileChanges && (
                                    <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
                                        {savingProfile ? "Sauvegarde..." : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" />
                                                Sauvegarder les modifications
                                            </>
                                        )}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Security Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lock className="h-5 w-5 text-primary" />
                                    Sécurité
                                </CardTitle>
                                <CardDescription>
                                    Gérez la sécurité de votre compte
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">Mot de passe</p>
                                        <p className="text-sm text-muted-foreground">
                                            Changez votre mot de passe régulièrement
                                        </p>
                                    </div>
                                    <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline">
                                                <Lock className="h-4 w-4 mr-2" />
                                                Changer
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Changer le mot de passe</DialogTitle>
                                                <DialogDescription>
                                                    Entrez votre mot de passe actuel et choisissez-en un nouveau.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                                                    <Input
                                                        id="currentPassword"
                                                        type="password"
                                                        value={passwordData.currentPassword}
                                                        onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                                                    <Input
                                                        id="newPassword"
                                                        type="password"
                                                        value={passwordData.newPassword}
                                                        onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        Minimum 8 caractères
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="confirmPassword">Confirmer</Label>
                                                    <Input
                                                        id="confirmPassword"
                                                        type="password"
                                                        value={passwordData.confirmPassword}
                                                        onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setShowPasswordDialog(false)} disabled={changingPassword}>
                                                    Annuler
                                                </Button>
                                                <Button onClick={handlePasswordChange} disabled={changingPassword}>
                                                    {changingPassword ? "Changement..." : "Changer"}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                <Separator />

                                {/* Sessions Management */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">Sessions actives</p>
                                            <p className="text-sm text-muted-foreground">
                                                Gérez vos sessions sur différents appareils
                                            </p>
                                        </div>
                                        <Button variant="outline" onClick={() => setShowDeleteAllDialog(true)}>
                                            <LogOut className="h-4 w-4 mr-2" />
                                            Terminer les autres
                                        </Button>
                                    </div>

                                    {sessionsLoading ? (
                                        <div className="space-y-2">
                                            <Skeleton className="h-16 w-full" />
                                            <Skeleton className="h-16 w-full" />
                                        </div>
                                    ) : sessions.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">Aucune session active</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {sessions.map((s: any) => (
                                                <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                    <div>
                                                        <div className="font-medium">{s.deviceName || "Appareil inconnu"}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {s.deviceType} • {s.ipAddress}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Dernière activité: {new Date(s.lastActivityAt).toLocaleString()}
                                                        </div>
                                                    </div>
                                                    {s.isCurrent ? (
                                                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                                                            Actuelle
                                                        </span>
                                                    ) : (
                                                        <Button variant="ghost" size="sm" onClick={() => setSessionToDelete(s)}>
                                                            <Trash className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === "stats" && (
                    <div className="space-y-6 mt-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-primary" />
                                    Statistiques du compte
                                </CardTitle>
                                <CardDescription>
                                    Vue d'ensemble de votre activité
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/20">
                                        <Package className="h-10 w-10 text-blue-500" />
                                        <div>
                                            <p className="text-3xl font-bold">{profile.stats?.totalProducts || 0}</p>
                                            <p className="text-sm text-muted-foreground">Produits</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-gradient-to-br from-green-50 to-transparent dark:from-green-950/20">
                                        <ShoppingBag className="h-10 w-10 text-green-500" />
                                        <div>
                                            <p className="text-3xl font-bold">{profile.stats?.totalParcels || 0}</p>
                                            <p className="text-sm text-muted-foreground">Parcelles</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-transparent dark:from-purple-950/20">
                                        <Calendar className="h-10 w-10 text-purple-500" />
                                        <div>
                                            <p className="text-3xl font-bold">{profile.stats?.daysActive || 0}</p>
                                            <p className="text-sm text-muted-foreground">Jours d'activité</p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Compte créé le</span>
                                        <span className="font-medium">{formatDateTime(profile.createdAt) || "Non disponible"}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Dernière connexion</span>
                                        <span className="font-medium">{formatDateTime(profile.lastLoginAt) || "Non disponible"}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Rôle</span>
                                        <span className="font-medium capitalize">{profile.role}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === "appearance" && (
                    <div className="space-y-6 mt-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Palette className="h-5 w-5 text-primary" />
                                    Apparence
                                </CardTitle>
                                <CardDescription>
                                    Personnalisez l'interface selon vos préférences
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Thème</Label>
                                    <Select value={settings.theme} onValueChange={handleThemeChange}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="light">Clair</SelectItem>
                                            <SelectItem value="dark">Sombre</SelectItem>
                                            <SelectItem value="system">Système</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Langue</Label>
                                    <Select value={settings.language} onValueChange={handleLanguageChange}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fr">Français</SelectItem>
                                            <SelectItem value="en">English</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
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
                    </div>
                )}

                {activeTab === "preferences" && (
                    <div className="space-y-6 mt-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <SettingsIcon className="h-5 w-5 text-primary" />
                                    Préférences métier
                                </CardTitle>
                                <CardDescription>
                                    Configurez les paramètres par défaut
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Devise par défaut</Label>
                                    <Select
                                        value={settings.preferences.currency}
                                        onValueChange={(value) => handlePreferenceChange("currency", value)}
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
                                        onValueChange={(value) => handlePreferenceChange("weightUnit", value)}
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
                                        onValueChange={(value) => handlePreferenceChange("dateFormat", value)}
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
                                    <div>
                                        <Label>Taux de change automatique</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Mise à jour automatique des taux
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.preferences.autoExchangeRate}
                                        onCheckedChange={(value) => handlePreferenceChange("autoExchangeRate", value)}
                                    />
                                </div>

                                {!settings.preferences.autoExchangeRate && settings.preferences.currency !== "EUR" && (
                                    <div className="space-y-2 p-4 rounded-lg bg-muted/50 border">
                                        <Label>Taux de change manuel (EUR → {settings.preferences.currency})</Label>
                                        <Input
                                            type="number"
                                            step="0.0001"
                                            min="0.0001"
                                            value={settings.preferences.manualExchangeRate || 1}
                                            onChange={(e) => handlePreferenceChange("manualExchangeRate", parseFloat(e.target.value) || 1)}
                                            placeholder="ex: 1.08"
                                            className="max-w-xs"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            1 EUR = {settings.preferences.manualExchangeRate || 1} {settings.preferences.currency}
                                        </p>
                                    </div>
                                )}

                                <Button onClick={savePreferences} disabled={saving} className="w-full">
                                    {saving ? "Sauvegarde..." : "Sauvegarder les préférences"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === "integrations" && (
                    <div className="space-y-6 mt-2">
                        <SuperbuyConnect />

                        <Card>
                            <CardHeader>
                                <CardTitle>Autres Intégrations</CardTitle>
                                <CardDescription>
                                    Connectez vos comptes marketplace
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Plug className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">Bientôt disponible</h3>
                                    <p className="text-sm text-muted-foreground max-w-md">
                                        Les intégrations avec Vinted, eBay et d'autres plateformes seront bientôt disponibles.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </Tabs>

            {/* Delete All Sessions Dialog */}
            <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Terminer les autres sessions</DialogTitle>
                        <DialogDescription>
                            Cette action déconnectera vos sessions sur d'autres appareils.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Sessions à terminer: {sessions.filter((s) => !s.isCurrent).length}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowDeleteAllDialog(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleDeleteAllSessions} disabled={deletingAll}>
                            {deletingAll ? "Suppression..." : "Terminer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Single Session Delete Dialog */}
            <Dialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Terminer la session</DialogTitle>
                        <DialogDescription>
                            Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    {sessionToDelete && (
                        <div className="py-4">
                            <div className="font-medium">{sessionToDelete.deviceName || "Inconnu"}</div>
                            <div className="text-sm text-muted-foreground">
                                {sessionToDelete.deviceType} • {sessionToDelete.ipAddress}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSessionToDelete(null)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={() => sessionToDelete && handleDeleteSession(sessionToDelete.id)}
                            disabled={!!deletingSessionId}
                        >
                            {deletingSessionId ? "Suppression..." : "Terminer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
