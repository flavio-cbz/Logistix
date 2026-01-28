import { useState, useEffect } from "react"

/**
 * Hook pour debounce d'une valeur
 * Utile pour les champs de recherche
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}

/**
 * Hook pour recherche avec debounce
 */
export function useDebouncedSearch(initialValue: string = "", delay: number = 300) {
    const [searchValue, setSearchValue] = useState(initialValue)
    const debouncedSearchValue = useDebouncedValue(searchValue, delay)

    return {
        searchValue,
        setSearchValue,
        debouncedSearchValue,
    }
}
