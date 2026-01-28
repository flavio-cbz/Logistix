"use client";

import { useCallback } from "react";
import { usePreferences } from "@/lib/contexts/preferences-context";
import {
    formatCurrency as formatCurrencyBase,
    formatDate as formatDateBase,
    formatWeight as formatWeightBase,
    formatDateTime as formatDateTimeBase,
    type CurrencyCode,
    type DateFormatType,
    type WeightUnit,
} from "@/lib/utils/formatting";

/**
 * Hook that provides formatting functions with user preferences applied
 * 
 * @example
 * const { formatCurrency, formatDate, formatWeight } = useFormatting();
 * 
 * // Uses user's preferred currency with exchange rate conversion
 * // Data is stored in EUR, converted to display currency
 * formatCurrency(25.50) // -> "25,50 €" (EUR) or "$27.54" (USD with rate 1.08)
 * 
 * // Uses user's preferred date format
 * formatDate(new Date()) // -> "12/12/2024" or "12/12/2024"
 * 
 * // Uses user's preferred weight unit
 * formatWeight(1500) // -> "1500 g" or "1.50 kg"
 */
export function useFormatting() {
    const { preferences, isLoading, getExchangeRate, exchangeRates } = usePreferences();

    /**
     * Format currency with automatic conversion from EUR to target currency
     * All data is stored in EUR and converted at display time
     */
    const formatCurrency = useCallback(
        (value: number | null | undefined, overrideCurrency?: CurrencyCode) => {
            if (value == null || isNaN(value)) {
                return formatCurrencyBase(null, overrideCurrency ?? preferences.currency);
            }

            const targetCurrency = overrideCurrency ?? preferences.currency;
            let convertedValue = value;

            // Apply conversion only when target is not EUR (base currency)
            // and no override currency is specified
            if (targetCurrency !== "EUR" && !overrideCurrency) {
                const rate = getExchangeRate();
                convertedValue = value * rate;
            }

            return formatCurrencyBase(convertedValue, targetCurrency);
        },
        [preferences.currency, getExchangeRate]
    );

    const formatDate = useCallback(
        (
            date: Date | string | number | null | undefined,
            format?: DateFormatType,
            options?: Intl.DateTimeFormatOptions
        ) => {
            return formatDateBase(date, format ?? preferences.dateFormat, options);
        },
        [preferences.dateFormat]
    );

    const formatDateTime = useCallback(
        (
            date: Date | string | number | null | undefined,
            format?: DateFormatType
        ) => {
            return formatDateTimeBase(date, format ?? preferences.dateFormat);
        },
        [preferences.dateFormat]
    );

    const formatWeight = useCallback(
        (weight: number | null | undefined, unit?: WeightUnit, forceUnit?: boolean) => {
            return formatWeightBase(weight, unit ?? preferences.weightUnit, forceUnit);
        },
        [preferences.weightUnit]
    );

    const getCurrencySymbol = useCallback(() => {
        const symbols: Record<CurrencyCode, string> = {
            EUR: "€",
            USD: "$",
            CNY: "¥",
        };
        return symbols[preferences.currency] || "€";
    }, [preferences.currency]);

    /**
     * Get current exchange rate for display purposes
     */
    const getCurrentExchangeRate = useCallback(() => {
        return getExchangeRate();
    }, [getExchangeRate]);

    return {
        formatCurrency,
        formatDate,
        formatDateTime,
        formatWeight,
        getCurrencySymbol,
        getCurrentExchangeRate,
        exchangeRates,
        preferences,
        isLoading,
    };
}
