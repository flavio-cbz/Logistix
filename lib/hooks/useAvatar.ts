/**
 * Hook personnalisé pour la gestion des avatars
 * Design pattern: Separation of concerns pour la logique avatar
 */

import { useState, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import { logger } from "@/lib/utils/logging/logger";
import type { AvatarInfo, UseAvatarState } from "@/lib/types/profile";

// Generate avatar information utility
function createAvatarInfo(username: string, avatarUrl?: string): AvatarInfo {
  const initials = username
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);

  const colors = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
  ];

  const colorIndex =
    username.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
  const backgroundColor = colors[colorIndex];
  const textColor = "#ffffff";

  return {
    username,
    url: avatarUrl || undefined,
    initials,
    backgroundColor,
    textColor,
    hasCustomAvatar: Boolean(avatarUrl),
  } as AvatarInfo;
}

export function useAvatar(username: string, currentAvatarUrl?: string) {
  const [state, setState] = useState<UseAvatarState>({
    avatar: createAvatarInfo(username, currentAvatarUrl),
    loading: false,
    isUploading: false,
    uploadProgress: 0,
    error: null,
  });

  // Generate avatar information
  const generateAvatarInfo = useCallback(
    (name: string, url?: string): AvatarInfo => {
      const initials = name
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase())
        .join("")
        .slice(0, 2);

      // Generate consistent color based on username
      const colors = [
        "#6366f1",
        "#8b5cf6",
        "#ec4899",
        "#ef4444",
        "#f97316",
        "#eab308",
        "#22c55e",
        "#06b6d4",
        "#3b82f6",
        "#6366f1",
      ];

      const colorIndex =
        name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
        colors.length;
      const backgroundColor = colors[colorIndex];

      // Determine text color based on background (simple contrast)
      const textColor = "#ffffff";

      return {
        url: url || undefined,
        initials,
        backgroundColor,
        textColor,
        hasCustomAvatar: Boolean(url),
      } as AvatarInfo;
    },
    [],
  );

  // Upload new avatar
  const uploadAvatar = useCallback(
    async (file: File): Promise<boolean> => {
      setState((prev: any) => ({
        ...prev,
        isUploading: true,
        uploadProgress: 0,
        error: null,
      }));

      try {
        // Validate file
        if (!file.type.startsWith("image/")) {
          throw new Error("Le fichier doit être une image");
        }

        if (file.size > 5 * 1024 * 1024) {
          // 5MB limit
          throw new Error("L'image ne doit pas dépasser 5MB");
        }

        // Create FormData
        const formData = new FormData();
        formData.append("avatar", file);

        // Simulate upload progress
        const uploadPromise = fetch("/api/v1/profile/avatar", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        // Progress simulation
        const progressInterval = setInterval(() => {
          setState((prev: any) => ({
            ...prev,
            uploadProgress: Math.min(prev.uploadProgress + 10, 90),
          }));
        }, 100);

        const response = await uploadPromise;
        clearInterval(progressInterval);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success && result.avatarUrl) {
          const newAvatarInfo = generateAvatarInfo(username, result.avatarUrl);

          setState((prev) => ({
            ...prev,
            avatar: newAvatarInfo,
            isUploading: false,
            uploadProgress: 100,
            error: null,
          }));

          toast({
            title: "Avatar mis à jour",
            description: "Votre avatar a été mis à jour avec succès.",
          });

          return true;
        } else {
          throw new Error(result.error || "Failed to upload avatar");
        }
      } catch (error: any) {
        logger.error("Error uploading avatar:", error);
        setState((prev) => ({
          ...prev,
          isUploading: false,
          uploadProgress: 0,
          error:
            error.message || "Une erreur est survenue lors du téléchargement",
        }));

        toast({
          title: "Erreur",
          description: error.message || "Impossible de télécharger l'avatar",
          variant: "destructive",
        });

        return false;
      }
    },
    [username, generateAvatarInfo],
  );

  // Remove avatar
  const removeAvatar = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isUploading: true, error: null }));

    try {
      const response = await fetch("/api/v1/profile/avatar", {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const newAvatarInfo = generateAvatarInfo(username);

      setState((prev) => ({
        ...prev,
        avatar: newAvatarInfo,
        isUploading: false,
        error: null,
      }));

      toast({
        title: "Avatar supprimé",
        description: "Votre avatar a été supprimé avec succès.",
      });

      return true;
    } catch (error: any) {
      logger.error("Error removing avatar:", error);
      setState((prev) => ({
        ...prev,
        isUploading: false,
        error:
          error.message || "Une erreur est survenue lors de la suppression",
      }));

      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'avatar",
        variant: "destructive",
      });

      return false;
    }
  }, [username, generateAvatarInfo]);

  // Update avatar info when username or URL changes
  const updateAvatarInfo = useCallback(
    (newUsername?: string, newUrl?: string) => {
      const name = newUsername || username;
      const url = newUrl !== undefined ? newUrl : state.avatar.url;
      const newAvatarInfo = generateAvatarInfo(name, url);

      setState((prev) => ({
        ...prev,
        avatar: newAvatarInfo,
      }));
    },
    [username, state.avatar.url, generateAvatarInfo],
  );

  return {
    ...state,
    uploadAvatar,
    removeAvatar,
    updateAvatarInfo,
  };
}

// Utility function for generating avatar info (can be used standalone)
export function generateAvatarInfo(
  username: string,
  avatarUrl?: string,
): AvatarInfo {
  const initials = username
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);

  const colors = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
  ];

  const colorIndex =
    username.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
  const backgroundColor = colors[colorIndex];
  const textColor = "#ffffff";

  return {
    username,
    url: avatarUrl || undefined,
    initials,
    backgroundColor,
    textColor,
    hasCustomAvatar: Boolean(avatarUrl),
  } as AvatarInfo;
}
