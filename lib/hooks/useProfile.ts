/**
 * Hook personnalisé pour la gestion du profil utilisateur
 * Design pattern: Custom hooks pour la logique métier
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import { logger } from "@/lib/utils/logging/logger";
import type {
  ProfileFormData,
  UseProfileState,
  ProfileApiResponse,
  ProfileUpdateApiResponse,
} from "@/lib/types/profile";

// Ajouter un type simple pour la session (adapter si un type existe déjà dans le projet)
interface Session {
  user?: {
    name?: string;
    email?: string;
  };
}

export function useProfile() {
  // Remplacer useSession par un état local pour la session
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<UseProfileState>({
    profile: null,
    isLoading: true,
    isUpdating: false,
    error: null,
    hasChanges: false,
  });

  // Fonction pour récupérer la session via l'API du projet
  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/auth/validate-session", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        setSession(data.data); // Assumer que data.data contient la session
      } else {
        setSession(null);
      }
    } catch (error) {
      logger.error("Error fetching session:", { error: error instanceof Error ? error.message : String(error) });
      setSession(null);
    }
  }, []);

  // Fonction pour mettre à jour la session localement (remplace updateSession)
  const updateSession = useCallback((updates: Partial<Session["user"]>) => {
    setSession((prev) =>
      prev ? { ...prev, user: { ...prev.user, ...updates } } : null,
    );
  }, []);

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!session?.user) return;

    setState((prev: any) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/v1/profile", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ProfileApiResponse = await response.json();

      if (data.success && data.data) {
        setState((prev: any) => ({
          ...prev,
          profile: data.data!,
          isLoading: false,
          error: null,
        }));
      } else {
        throw new Error(data.error || "Failed to fetch profile");
      }
    } catch (error: any) {
      logger.error("Error fetching profile:", error);
      setState((prev: any) => ({
        ...prev,
        isLoading: false,
        error:
          error.message ||
          "Une erreur est survenue lors du chargement du profil",
      }));

      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      });
    }
  }, [session]);

  // Update profile
  const updateProfile = useCallback(
    async (data: ProfileFormData) => {
      setState((prev: any) => ({ ...prev, isUpdating: true, error: null }));

      try {
        const response = await fetch("/api/v1/profile", {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ProfileUpdateApiResponse = await response.json();

        if (result.success && result.data) {
          // Update local state
          setState((prev: any) => ({
            ...prev,
            profile: prev.profile ? { ...prev.profile, ...result.data } : null,
            isUpdating: false,
            hasChanges: false,
            error: null,
          }));

          // Update session if username or email changed
          const updates: Partial<Session["user"]> = {};
          if (data.username !== undefined) updates.name = data.username;
          if (data.email !== undefined) updates.email = data.email;
          updateSession(updates);

          toast({
            title: "Profil mis à jour",
            description: "Vos modifications ont été sauvegardées avec succès.",
          });

          return true;
        } else {
          throw new Error(result.error || "Failed to update profile");
        }
      } catch (error: any) {
        logger.error("Error updating profile:", error);
        setState((prev: any) => ({
          ...prev,
          isUpdating: false,
          error:
            error.message || "Une erreur est survenue lors de la mise à jour",
        }));

        toast({
          title: "Erreur",
          description: error.message || "Impossible de mettre à jour le profil",
          variant: "destructive",
        });

        return false;
      }
    },
    [session, updateSession],
  );

  // Mark as having changes
  const setHasChanges = useCallback((hasChanges: boolean) => {
    setState((prev: any) => ({ ...prev, hasChanges }));
  }, []);

  // Refresh profile
  const refreshProfile = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Calculate profile completeness
  const getProfileCompleteness = useCallback(() => {
    if (!state.profile) return 0;

    let score = 0;
    const weights = {
      avatar: 20,
      bio: 15,
      email: 10,
      preferences: 25,
      security: 30,
    };

    if (state.profile.avatar) score += weights.avatar;
    if (state.profile.bio && state.profile.bio.length > 0) score += weights.bio;
    if (state.profile.email) score += weights.email;
    // Add logic for preferences and security when implemented

    return Math.min(score, 100);
  }, [state.profile]);

  // Initial load: récupérer la session d'abord, puis le profil
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session, fetchProfile]);

  return {
    ...state,
    updateProfile,
    refreshProfile,
    setHasChanges,
    getProfileCompleteness,
  };
}
