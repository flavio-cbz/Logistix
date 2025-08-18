"use client"

import React, { useState, useCallback, useRef } from "react"
import { useStore } from "@/store/store"

interface RefreshOptions {
  showNotification?: boolean
  minDelay?: number // Minimum delay for visual feedback
}

interface RefreshState {
  isRefreshing: boolean
  lastRefresh: Date | null
  error: string | null
}

export function useDashboardRefresh(options: RefreshOptions = {}) {
  const { showNotification = true, minDelay = 500 } = options
  const { addNotification } = useStore()
  
  const [refreshState, setRefreshState] = useState<RefreshState>({
    isRefreshing: false,
    lastRefresh: null,
    error: null
  })

  const refreshTimeoutRef = useRef<NodeJS.Timeout>()

  const refresh = useCallback(async (
    refreshFn?: () => Promise<void>,
    customMessage?: string
  ) => {
    if (refreshState.isRefreshing) return

    setRefreshState(prev => ({
      ...prev,
      isRefreshing: true,
      error: null
    }))

    const startTime = Date.now()

    try {
      // Execute the refresh function if provided
      if (refreshFn) {
        await refreshFn()
      }

      // Ensure minimum delay for visual feedback
      const elapsed = Date.now() - startTime
      const remainingDelay = Math.max(0, minDelay - elapsed)

      if (remainingDelay > 0) {
        await new Promise(resolve => {
          refreshTimeoutRef.current = setTimeout(resolve, remainingDelay)
        })
      }

      setRefreshState(prev => ({
        ...prev,
        isRefreshing: false,
        lastRefresh: new Date(),
        error: null
      }))

      if (showNotification) {
        addNotification(
          "success", 
          customMessage || "Données actualisées avec succès"
        )
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'actualisation"
      
      setRefreshState(prev => ({
        ...prev,
        isRefreshing: false,
        error: errorMessage
      }))

      if (showNotification) {
        addNotification("error", errorMessage)
      }

      throw error
    }
  }, [refreshState.isRefreshing, minDelay, showNotification, addNotification])

  const clearError = useCallback(() => {
    setRefreshState(prev => ({ ...prev, error: null }))
  }, [])

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
  }, [])

  return {
    ...refreshState,
    refresh,
    clearError,
    cleanup
  }
}

// Hook for automatic refresh intervals
export function useAutoRefresh(
  refreshFn: () => Promise<void>,
  intervalMs: number = 30000, // 30 seconds default
  enabled: boolean = false
) {
  const intervalRef = useRef<NodeJS.Timeout>()
  const { refresh, isRefreshing } = useDashboardRefresh({ showNotification: false })

  const startAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = setInterval(async () => {
      if (!isRefreshing) {
        try {
          await refresh(refreshFn)
        } catch (error) {
          console.error("Auto refresh failed:", error)
        }
      }
    }, intervalMs)
  }, [refresh, refreshFn, intervalMs, isRefreshing])

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }
  }, [])

  // Start/stop based on enabled flag
  React.useEffect(() => {
    if (enabled) {
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }

    return stopAutoRefresh
  }, [enabled, startAutoRefresh, stopAutoRefresh])

  return {
    startAutoRefresh,
    stopAutoRefresh,
    isAutoRefreshing: !!intervalRef.current
  }
}

// Hook for managing multiple widget refresh states
export function useWidgetRefreshManager() {
  const [widgetStates, setWidgetStates] = useState<Record<string, RefreshState>>({})

  const updateWidgetState = useCallback((widgetId: string, state: Partial<RefreshState>) => {
    setWidgetStates(prev => ({
      ...prev,
      [widgetId]: {
        ...prev[widgetId],
        ...state
      }
    }))
  }, [])

  const refreshWidget = useCallback(async (
    widgetId: string,
    refreshFn: () => Promise<void>,
    options: RefreshOptions = {}
  ) => {
    const currentState = widgetStates[widgetId] || {
      isRefreshing: false,
      lastRefresh: null,
      error: null
    }

    if (currentState.isRefreshing) return

    updateWidgetState(widgetId, { isRefreshing: true, error: null })

    const startTime = Date.now()

    try {
      await refreshFn()

      // Ensure minimum delay for visual feedback
      const elapsed = Date.now() - startTime
      const remainingDelay = Math.max(0, (options.minDelay || 500) - elapsed)

      if (remainingDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingDelay))
      }

      updateWidgetState(widgetId, {
        isRefreshing: false,
        lastRefresh: new Date(),
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'actualisation"
      
      updateWidgetState(widgetId, {
        isRefreshing: false,
        error: errorMessage
      })

      throw error
    }
  }, [widgetStates, updateWidgetState])

  const getWidgetState = useCallback((widgetId: string): RefreshState => {
    return widgetStates[widgetId] || {
      isRefreshing: false,
      lastRefresh: null,
      error: null
    }
  }, [widgetStates])

  const clearWidgetError = useCallback((widgetId: string) => {
    updateWidgetState(widgetId, { error: null })
  }, [updateWidgetState])

  return {
    refreshWidget,
    getWidgetState,
    clearWidgetError,
    widgetStates
  }
}