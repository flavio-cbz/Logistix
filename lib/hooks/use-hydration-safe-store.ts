"use client"

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/services/admin/store'

/**
 * Hook to safely use Zustand store with hydration
 * Prevents hydration mismatches by ensuring client-side only access
 */
export function useHydrationSafeStore() {
  const [hydrated, setHydrated] = useState(false)
  const store = useStore()

  useEffect(() => {
    // Rehydrate the store on client side
    useStore.persist.rehydrate()
    setHydrated(true)
  }, [])

  return {
    ...store,
    hydrated,
  }
}