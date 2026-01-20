"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    User,
    BarChart3,
    Palette,
    Settings as SettingsIcon,
    Plug,
} from "lucide-react";

// Sub-components
import { ProfileTab } from "./tabs/profile-tab";
import { SecurityTab } from "./tabs/security-tab";
import { PreferencesTab } from "./tabs/preferences-tab";
import { AppearanceTab } from "./tabs/appearance-tab";
import { StatsTab } from "./tabs/stats-tab";
import { IntegrationsTab } from "./tabs/integrations-tab";

// Types
import { ProfileData, SettingsData, Session } from "./types";
import { logger } from "@/lib/utils/logging/logger";

interface AccountSettingsClientProps {
    profileData: ProfileData;
    settingsData: SettingsData;
}

export function AccountSettingsClient({
    profileData: initialProfileData,
    settingsData: initialSettingsData,
}: AccountSettingsClientProps) {
    const { setTheme } = useTheme();

    // Hydration fix
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Navigation
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get("tab") || "profile";

    const handleTabChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", value);
        router.replace(`${pathname}?${params.toString()}`);
    };

    // State
    const [profile, setProfile] = useState<ProfileData>(initialProfileData);
    const [settings, setSettings] = useState<SettingsData>(initialSettingsData);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    // Sessions state
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);

    // Helper
    const getApiErrorMessage = (apiResponse: unknown, fallback = "Erreur inconnue") => {
        try {
            if (!apiResponse) return fallback;
            if (typeof apiResponse === "string") return apiResponse;
            const res = apiResponse as {
                error?: {
                    message?: string;
                    validationErrors?: Array<{ field?: string; message: string }>
                };
                success?: boolean;
                message?: string;
            };
            const err = res.error || res;
            if (!err) return fallback;
            if (typeof err === "string") return err;
            if (err.message) {
                const errorData = err as { message: string; validationErrors?: Array<{ field?: string; message: string }> };
                if (Array.isArray(errorData.validationErrors) && errorData.validationErrors.length) {
                    const details = errorData.validationErrors
                        .map((v) => (v.field ? `${v.field}: ${v.message}` : v.message))
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

    // Handlers
    const handleSaveProfile = async (data: { username: string; avatar: string | null }) => {
        setSavingProfile(true);
        try {
            const response = await fetch("/api/v1/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const json = await response.json();
            if (json.success) {
                setProfile((prev) => ({
                    ...prev,
                    username: data.username,
                    avatar: data.avatar,
                }));
                toast.success("Profil mis à jour avec succès");
            } else {
                throw new Error(getApiErrorMessage(json, "Erreur lors de la mise à jour"));
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erreur lors de la mise à jour");
        } finally {
            setSavingProfile(false);
        }
    };

    const saveSettings = async (partialSettings: Partial<SettingsData>) => {
        setSavingSettings(true);
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
            setSavingSettings(false);
        }
    };

    const handleSettingsUpdate = (partial: Partial<SettingsData>) => {
        setSettings(prev => ({ ...prev, ...partial }));
        // Optimistic theme update if needed
        if (partial.theme) {
            setTheme(partial.theme);
        }
        saveSettings(partial);
    };

    const handlePreferenceUpdate = (key: keyof SettingsData["preferences"], value: unknown) => {
        setSettings((prev) => ({
            ...prev,
            preferences: { ...prev.preferences, [key]: value },
        }));
    };

    const handleSavePreferences = () => {
        saveSettings({ preferences: settings.preferences });
    };

    // Sessions Handlers
    const fetchSessions = useCallback(async () => {
        setSessionsLoading(true);
        try {
            const res = await fetch("/api/v1/sessions");
            const json = await res.json();
            if (json.success) {
                setSessions(json.data?.sessions || []);
            }
        } catch (err) {
            logger.error("Error fetching sessions", { error: err });
        } finally {
            setSessionsLoading(false);
        }
    }, []);

    const handleDeleteSession = async (id: string) => {
        const res = await fetch(`/api/v1/sessions/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (json.success) {
            toast.success("Session supprimée");
            await fetchSessions();
        } else {
            throw new Error(json.error || "Erreur lors de la suppression");
        }
    };

    const handleDeleteAllSessions = async () => {
        const res = await fetch("/api/v1/sessions", { method: "DELETE" });
        const json = await res.json();
        if (json.success) {
            toast.success("Sessions terminées");
            await fetchSessions();
        } else {
            throw new Error(json.error || "Erreur lors de la suppression");
        }
    };

    useEffect(() => {
        if (activeTab === "security") {
            fetchSessions();
        }
    }, [activeTab, fetchSessions]);

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
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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

                {activeTab === "profile" && (
                    <ProfileTab
                        profile={profile}
                        onSave={handleSaveProfile}
                        isSaving={savingProfile}
                    />
                )}

                {activeTab === "stats" && (
                    <StatsTab profile={profile} />
                )}

                {activeTab === "appearance" && (
                    <AppearanceTab
                        settings={settings}
                        onUpdate={handleSettingsUpdate}
                        isSaving={savingSettings}
                    />
                )}

                {activeTab === "preferences" && (
                    <PreferencesTab
                        settings={settings}
                        onPreferenceChange={handlePreferenceUpdate}
                        onSave={handleSavePreferences}
                        isSaving={savingSettings}
                    />
                )}

                {activeTab === "security" && (
                    <SecurityTab
                        sessions={sessions}
                        sessionsLoading={sessionsLoading}
                        onDeleteSession={handleDeleteSession}
                        onDeleteAllSessions={handleDeleteAllSessions}
                    />
                )}

                {activeTab === "integrations" && (
                    <IntegrationsTab />
                )}
            </Tabs>
        </>
    );
}
