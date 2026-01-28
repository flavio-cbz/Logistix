import { useEffect, useState } from "react"
import { logger } from "@/lib/utils/logging/logger"

/**
 * Hook pour localStorage avec préférences de tableau
 */
export interface TablePreferences {
    columnVisibility?: Record<string, boolean>
    density?: "compact" | "comfortable"
    sorting?: {
        columnId: string
        direction: "asc" | "desc"
    }
}

interface UseTablePreferencesOptions {
    key: string
    defaultPreferences?: TablePreferences
}

export function useTablePreferences({
    key,
    defaultPreferences = {},
}: UseTablePreferencesOptions) {
    const [preferences, setPreferences] = useState<TablePreferences>(() => {
        if (typeof window === "undefined") return defaultPreferences

        try {
            const stored = localStorage.getItem(`table-prefs-${key}`)
            return stored ? JSON.parse(stored) : defaultPreferences
        } catch {
            return defaultPreferences
        }
    })

    useEffect(() => {
        try {
            localStorage.setItem(`table-prefs-${key}`, JSON.stringify(preferences))
        } catch (error) {
            logger.error("Failed to save table preferences", { error })
        }
    }, [key, preferences])

    const updatePreferences = (updates: Partial<TablePreferences>) => {
        setPreferences((prev) => ({ ...prev, ...updates }))
    }

    const resetPreferences = () => {
        setPreferences(defaultPreferences)
    }

    return {
        preferences,
        updatePreferences,
        resetPreferences,
    }
}
