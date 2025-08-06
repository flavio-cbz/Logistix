import { useState, useCallback } from 'react'
import { useToast } from '@/components/ui/use-toast'

interface ValidationSession {
  validationId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime: string
  progress: number
  elapsedSeconds?: number
  estimatedRemainingSeconds?: number
  message?: string
  error?: string
  summary?: {
    overallSuccess: boolean
    productTestsCount: number
    successfulTests: number
    recommendationsCount: number
    hasDeletionTest: boolean
    deletionTestSuccess?: boolean
    databaseIntegrityOk?: boolean
  }
}

interface ValidationReport {
  validationId: string
  timestamp: string
  overallSuccess: boolean
  tokenValidation: {
    isValid: boolean
    errors: string[]
  }
  productTests: Array<{
    productName: string
    success: boolean
    actualPriceRange: { min: number; max: number; currency: string }
    expectedPriceRange: { min: number; max: number; currency: string }
    analysisTime: number
    errors: string[]
    taskId: string
  }>
  deletionTest?: {
    success: boolean
    taskId: string
    errors: string[]
  }
  databaseIntegrity?: {
    taskRemoved: boolean
    noOrphanedData: boolean
    databaseConsistent: boolean
    errors: string[]
  }
  recommendations: string[]
  debugInfo?: {
    timestamp: string
    apiCalls: any[]
    databaseOperations: any[]
    calculations: any[]
    errors: any[]
  }
  sessionInfo: {
    startTime: string
    status: string
    progress: number
    elapsedTime: number
  }
}

export function useValidation() {
  const [currentSession, setCurrentSession] = useState<ValidationSession | null>(null)
  const [currentReport, setCurrentReport] = useState<ValidationReport | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const { toast } = useToast()

  const startValidation = useCallback(async (vintedToken: string, debugMode: boolean = false) => {
    if (!vintedToken.trim()) {
      toast({
        variant: "destructive",
        title: "Token requis",
        description: "Veuillez entrer votre token API Vinted"
      })
      return null
    }

    setIsStarting(true)
    try {
      const response = await fetch('/api/v1/validation/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vintedApiToken: vintedToken,
          debugMode
        })
      })

      if (response.ok) {
        const session: ValidationSession = await response.json()
        setCurrentSession(session)
        setCurrentReport(null)
        
        toast({
          title: "Validation démarrée",
          description: "La validation de l'analyse de marché a commencé"
        })
        
        return session
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Erreur de démarrage",
          description: error.message || "Impossible de démarrer la validation"
        })
        return null
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur réseau",
        description: "Impossible de communiquer avec le serveur"
      })
      return null
    } finally {
      setIsStarting(false)
    }
  }, [toast])

  const checkStatus = useCallback(async (validationId: string) => {
    try {
      const response = await fetch(`/api/v1/validation/market-analysis/status?validationId=${validationId}`)
      if (response.ok) {
        const session: ValidationSession = await response.json()
        setCurrentSession(session)
        return session
      }
      return null
    } catch (error) {
      console.error('Failed to check validation status:', error)
      return null
    }
  }, [])

  const loadReport = useCallback(async (validationId: string, includeDebugInfo: boolean = false) => {
    try {
      const response = await fetch(`/api/v1/validation/market-analysis/report?validationId=${validationId}&includeDebugInfo=${includeDebugInfo}`)
      if (response.ok) {
        const report: ValidationReport = await response.json()
        setCurrentReport(report)
        return report
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Erreur de chargement",
          description: error.message || "Impossible de charger le rapport"
        })
        return null
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur réseau",
        description: "Impossible de charger le rapport de validation"
      })
      return null
    }
  }, [toast])

  const resetValidation = useCallback(() => {
    setCurrentSession(null)
    setCurrentReport(null)
  }, [])

  return {
    currentSession,
    currentReport,
    isStarting,
    startValidation,
    checkStatus,
    loadReport,
    resetValidation
  }
}