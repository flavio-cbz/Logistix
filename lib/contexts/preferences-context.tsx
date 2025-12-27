"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

/**
 * Default exchange rates (EUR base)
 * These are approximate rates - for production, consider using a real-time API
 */
const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
    EUR: 1,
    USD: 1.08,
    CNY: 7.85,
};

/**
 * Types for user preferences
 */
export interface UserPreferences {
    currency: "EUR" | "USD" | "CNY";
    weightUnit: "g" | "kg";
    dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY";
    autoExchangeRate: boolean;
    manualExchangeRate?: number;
}

export interface PreferencesContextType {
    preferences: UserPreferences;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    exchangeRates: Record<string, number>;
    getExchangeRate: () => number;
}

const defaultPreferences: UserPreferences = {
    currency: "EUR",
    weightUnit: "g",
    dateFormat: "DD/MM/YYYY",
    autoExchangeRate: true,
};

const PreferencesContext = createContext<PreferencesContextType | null>(null);

/**
 * Hook to access user preferences
 */
export function usePreferences(): PreferencesContextType {
    const context = useContext(PreferencesContext);
    if (!context) {
        // Return default values if used outside provider (SSR or non-dashboard pages)
        return {
            preferences: defaultPreferences,
            isLoading: false,
            error: null,
            refetch: async () => { },
            exchangeRates: DEFAULT_EXCHANGE_RATES,
            getExchangeRate: () => 1,
        };
    }
    return context;
}

/**
 * Provider component that fetches and provides user preferences
 */
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
    const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exchangeRates] = useState<Record<string, number>>(DEFAULT_EXCHANGE_RATES);

    const fetchPreferences = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch("/api/v1/settings", {
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Failed to fetch preferences");
            }

            const data = await response.json();

            if (data.ok && data.data?.preferences) {
                setPreferences({
                    currency: data.data.preferences.currency || "EUR",
                    weightUnit: data.data.preferences.weightUnit || "g",
                    dateFormat: data.data.preferences.dateFormat || "DD/MM/YYYY",
                    autoExchangeRate: data.data.preferences.autoExchangeRate ?? true,
                    manualExchangeRate: data.data.preferences.manualExchangeRate,
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
            // Keep default preferences on error
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPreferences();
    }, [fetchPreferences]);

    /**
     * Get the current exchange rate based on preferences
     * Returns the rate to convert from EUR to the target currency
     */
    const getExchangeRate = useCallback(() => {
        // EUR is the base currency, no conversion needed
        if (preferences.currency === "EUR") {
            return 1;
        }

        // Use manual rate if autoExchangeRate is disabled and manual rate is set
        if (!preferences.autoExchangeRate && preferences.manualExchangeRate !== undefined) {
            return preferences.manualExchangeRate;
        }

        // Use automatic rate from exchangeRates
        return exchangeRates[preferences.currency] || 1;
    }, [preferences.currency, preferences.autoExchangeRate, preferences.manualExchangeRate, exchangeRates]);

    const contextValue = useMemo(() => ({
        preferences,
        isLoading,
        error,
        refetch: fetchPreferences,
        exchangeRates,
        getExchangeRate,
    }), [preferences, isLoading, error, fetchPreferences, exchangeRates, getExchangeRate]);

    return (
        <PreferencesContext.Provider value={contextValue}>
            {children}
        </PreferencesContext.Provider>
    );
}

/**
 * Export default preferences for use in non-React contexts
 */
export { defaultPreferences, DEFAULT_EXCHANGE_RATES };

