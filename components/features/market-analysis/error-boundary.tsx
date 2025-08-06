"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorId: string | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class MarketAnalysisErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return {
      hasError: true,
      error,
      errorId,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[MarketAnalysisErrorBoundary] Erreur capturée:', error, errorInfo)
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return (
          <FallbackComponent 
            error={this.state.error!} 
            retry={this.handleRetry} 
          />
        )
      }

      return (
        <div className="space-y-6">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Erreur dans l'analyse de marché
              </CardTitle>
              <CardDescription>
                Une erreur inattendue s'est produite lors du chargement de cette section
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">
                      {this.state.error?.message || 'Erreur inconnue'}
                    </p>
                    {this.state.errorId && (
                      <p className="text-xs opacity-75">
                        ID d'erreur: {this.state.errorId}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium">Que s'est-il passé ?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Une erreur technique s'est produite dans l'interface</li>
                  <li>• Vos données n'ont pas été perdues</li>
                  <li>• L'erreur a été automatiquement signalée</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Solutions possibles :</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Cliquez sur "Réessayer" pour recharger cette section</li>
                  <li>• Actualisez la page complète si le problème persiste</li>
                  <li>• Vérifiez votre connexion internet</li>
                  <li>• Contactez le support avec l'ID d'erreur si nécessaire</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Réessayer
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualiser la page
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/dashboard'}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Retour au tableau de bord
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Détails techniques (développement)
                  </summary>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Composant d'erreur simple pour les cas spécifiques
interface SimpleErrorDisplayProps {
  error: string
  onRetry?: () => void
  retryLabel?: string
  showRetry?: boolean
}

export function SimpleErrorDisplay({ 
  error, 
  onRetry, 
  retryLabel = "Réessayer",
  showRetry = true 
}: SimpleErrorDisplayProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <span>{error}</span>
          {showRetry && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {retryLabel}
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Hook pour gérer les erreurs dans les composants
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return {
    captureError,
    resetError,
  }
}

export default MarketAnalysisErrorBoundary