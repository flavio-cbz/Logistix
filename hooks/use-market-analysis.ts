// hooks/use-market-analysis.ts
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "@/hooks/use-toast"
import { MarketMetrics, SimilarSale } from "@/types/api"

export type MarketAnalysisTaskStatus = "pending" | "completed" | "failed"

export interface MarketAnalysisTask {
  id: string
  userId: string
  status: MarketAnalysisTaskStatus
  productName: string
  result?: MarketMetrics
  error?: string
  createdAt: string
  updatedAt: string | null
}

interface UseMarketAnalysisOptions {
  pollingInterval?: number // ms
  maxRetries?: number
  retryDelay?: number
  enabled?: boolean // Permet de désactiver complètement le hook
}

interface ApiErrorResponse {
  message: string
  errors?: Array<{ field: string; message: string; code: string }>
  code?: string
}

// Error recovery utilities
const isRetryableError = (error: any): boolean => {
  if (!error) return false
  if (error.name === 'TypeError' && error.message.includes('fetch')) return true
  if (error.status >= 500) return true
  if (error.status === 429) return true
  return false
}

const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  if (error?.errors && Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors.map((e: any) => e.message).join(', ')
  }
  return 'Une erreur inconnue s\'est produite'
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export function useMarketAnalysis({
  pollingInterval = 30000,
  maxRetries = 3,
  retryDelay = 2000,
  enabled = true
}: UseMarketAnalysisOptions = {}) {
  const [tasks, setTasks] = useState<MarketAnalysisTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isFetching = useRef(false)

  const fetchTasks = useCallback(async () => {
    if (!enabled || isFetching.current) return
    isFetching.current = true
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/v1/market-analysis')
      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json()
        throw { ...errorData, status: response.status }
      }
      const data: MarketAnalysisTask[] = await response.json()
      setTasks(data)
      setRetryCount(0)
    } catch (err: any) {
      setError(getErrorMessage(err))
      if (isRetryableError(err) && retryCount < maxRetries) {
        setRetryCount(prev => prev + 1)
        await delay(retryDelay * (retryCount + 1))
        fetchTasks()
      }
    } finally {
      setLoading(false)
      isFetching.current = false
    }
  }, [enabled, retryCount, maxRetries, retryDelay])

  const createAnalysis = useCallback(async (productName: string) => {
    if (!enabled) return
    setLoading(true)
    try {
      const response = await fetch('/api/v1/market-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName }),
      })
      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json()
        throw { ...errorData, status: response.status }
      }
      const newTask: MarketAnalysisTask = await response.json()
      setTasks(prev => [newTask, ...prev])
      toast({ title: "Analyse lancée", description: `L'analyse pour "${productName}" a commencé.` })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: getErrorMessage(err) })
      throw err
    } finally {
      setLoading(false)
    }
  }, [enabled])

  const deleteAnalysis = useCallback(async (taskId: string) => {
    if (!enabled) return
    try {
      const response = await fetch(`/api/v1/market-analysis/${taskId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json()
        throw { ...errorData, status: response.status }
      }
      setTasks(prev => prev.filter(t => t.id !== taskId))
      toast({ title: "Analyse supprimée", description: "La tâche a été supprimée avec succès." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: getErrorMessage(err) })
      throw err
    }
  }, [enabled])

  const retryOperation = () => {
    setRetryCount(0)
    setError(null)
    fetchTasks()
  }
  
  const cleanup = () => {
    if (pollingRef.current) {
        clearInterval(pollingRef.current)
    }
  }

  useEffect(() => {
    if (!enabled) return
    fetchTasks()
    
    pollingRef.current = setInterval(() => {
      const hasPendingTasks = tasks.some(t => t.status === 'pending')
      if (hasPendingTasks) {
        fetchTasks()
      }
    }, pollingInterval)

    return cleanup
  }, [enabled, pollingInterval, fetchTasks])

  return {
    tasks,
    loading,
    error,
    retryCount,
    createAnalysis,
    deleteAnalysis,
    retryOperation,
    fetchTasks,
    cleanup
  }
}