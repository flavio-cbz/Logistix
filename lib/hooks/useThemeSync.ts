"use client";

import { useTheme } from "next-themes";
import { logger } from "@/lib/utils/logging/logger";

/**
 * Hook pour synchroniser les changements de thème avec la base de données
 */
export function useThemeSync() {
  const { theme, setTheme } = useTheme();

  const updateThemeInDatabase = async (newTheme: string) => {
    try {
      const response = await fetch("/api/v1/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ theme: newTheme }),
        credentials: "include",
      });

      if (!response.ok) {
        logger.error("Failed to update theme in database");
      }
    } catch (error) {
      logger.error("Error updating theme:", { error: error instanceof Error ? error.message : String(error) });
    }
  };

  const changeTheme = async (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    await updateThemeInDatabase(newTheme);
  };

  return {
    theme,
    changeTheme,
    setTheme,
  };
}
