import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

// =============================================================================
// TYPES
// =============================================================================

export interface ProfileData {
    id: string;
    username: string;
    email: string | null;
    bio: string | null;
    avatar: string | null;
    language: string | null;
    theme: string | null;
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

// =============================================================================
// HELPER
// =============================================================================

export function getApiErrorMessage(
    apiResponse: unknown,
    fallback = "Erreur inconnue",
): string {
    try {
        if (!apiResponse) return fallback;
        if (typeof apiResponse === "string") return apiResponse;

        const res = apiResponse as {
            error?: {
                message?: string;
                validationErrors?: Array<{ field?: string; message: string }>;
            };
            success?: boolean;
            message?: string;
        };
        const err = (res.error || res) as
            | { message?: string; validationErrors?: Array<{ field?: string; message: string }> }
            | string;
        if (!err) return fallback;
        if (typeof err === "string") return err;

        if (err.message) {
            if (Array.isArray(err.validationErrors) && err.validationErrors.length) {
                const details = err.validationErrors
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
}

// =============================================================================
// HOOK: useProfileEditor
// =============================================================================

export function useProfileEditor(initialData?: ProfileData) {
    const [profile, setProfile] = useState<ProfileData | null>(initialData || null);
    const [editedProfile, setEditedProfile] = useState<Partial<ProfileData>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(!initialData);
    const [saving, setSaving] = useState(false);

    const loadProfile = useCallback(async () => {
        try {
            const response = await fetch("/api/v1/profile");
            const data = await response.json();
            if (data.success) {
                setProfile(data.data);
                setEditedProfile({
                    email: data.data.email || "",
                    bio: data.data.bio || "",
                    avatar: data.data.avatar || "",
                });
            }
        } catch (_error) {
            toast.error("Erreur", {
                description: "Impossible de charger le profil",
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!initialData) {
            loadProfile();
        } else {
            setProfile(initialData);
            setEditedProfile({
                email: initialData.email || "",
                bio: initialData.bio || "",
                avatar: initialData.avatar || "",
            });
            setLoading(false);
        }
    }, [initialData, loadProfile]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch("/api/v1/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editedProfile),
            });

            const data = await response.json();
            if (data.success) {
                toast.success("Succès", {
                    description: "Profil mis à jour avec succès",
                });
                setIsEditing(false);
                await loadProfile();
            } else {
                const message = getApiErrorMessage(data, "Erreur lors de la mise à jour");
                throw new Error(message);
            }
        } catch (error) {
            toast.error("Erreur", {
                description: error instanceof Error ? error.message : "Erreur lors de la mise à jour",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedProfile({
            email: profile?.email || "",
            bio: profile?.bio || "",
            avatar: profile?.avatar || "",
        });
    };

    const updateField = (field: keyof ProfileData, value: string) => {
        setEditedProfile((prev) => ({ ...prev, [field]: value }));
    };

    return {
        profile,
        editedProfile,
        isEditing,
        setIsEditing,
        loading,
        saving,
        handleSave,
        handleCancel,
        updateField,
    };
}

// =============================================================================
// HOOK: usePasswordChange
// =============================================================================

export function usePasswordChange() {
    const [showDialog, setShowDialog] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [changing, setChanging] = useState(false);

    const updateField = (field: keyof typeof passwordData, value: string) => {
        setPasswordData((prev) => ({ ...prev, [field]: value }));
    };

    const reset = () => {
        setPasswordData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        });
    };

    const handleChange = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("Erreur", {
                description: "Les mots de passe ne correspondent pas",
            });
            return;
        }

        setChanging(true);
        try {
            const response = await fetch("/api/v1/profile/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(passwordData),
            });

            const data = await response.json();
            if (data.success) {
                toast.success("Succès", {
                    description: "Mot de passe changé avec succès",
                });
                setShowDialog(false);
                reset();
            } else {
                const message = getApiErrorMessage(data, "Erreur lors du changement de mot de passe");
                throw new Error(message);
            }
        } catch (error) {
            toast.error("Erreur", {
                description: error instanceof Error ? error.message : "Erreur lors du changement de mot de passe",
            });
        } finally {
            setChanging(false);
        }
    };

    return {
        showDialog,
        setShowDialog,
        passwordData,
        updateField,
        changing,
        handleChange,
        reset,
    };
}
