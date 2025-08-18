"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Settings, 
  Key, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff,
  Copy,
  ExternalLink,
  Shield
} from "lucide-react"
import { useMarketAnalysisStore } from "@/lib/store"

const TokenConfigurationSchema = z.object({
  cookie: z.string().min(10, "Le cookie doit contenir au moins 10 caractères"),
})

type TokenConfigurationForm = z.infer<typeof TokenConfigurationSchema>

interface TokenConfigurationProps {
  onTokenConfigured?: () => void
}

export default function TokenConfiguration({ onTokenConfigured }: TokenConfigurationProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showCookie, setShowCookie] = useState(false)
  const [tokenExpiration, setTokenExpiration] = useState<Date | null>(null)

  const { tokenConfigured, setTokenConfigured } = useMarketAnalysisStore()

  const form = useForm<TokenConfigurationForm>({
    resolver: zodResolver(TokenConfigurationSchema),
    defaultValues: {
      cookie: "",
    },
  })

  const handleSubmit = async (data: TokenConfigurationForm) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000'
      const response = await fetch(`${baseUrl}/api/v1/vinted/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cookie: data.cookie }),
credentials: 'include',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Erreur lors de la configuration du cookie')
      }

      setSuccess('Cookie configuré avec succès !')
      form.reset()
      
      await checkTokenStatus()
      
      if (onTokenConfigured) {
        onTokenConfigured()
      }

    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const checkTokenStatus = async () => {
    try {
      const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000'
      const response = await fetch(`${baseUrl}/api/v1/vinted/auth`, { credentials: 'include' })
const contentType = response.headers.get("Content-Type") || "";
if (!contentType.includes("application/json")) {
  setTokenConfigured(false);
  setTokenExpiration(null);
  console.error("Réponse inattendue : le serveur n'a pas retourné du JSON.");
  return;
}
      const data = await response.json()
      
      const isValid = !!data.authenticated
      setTokenConfigured(isValid)

      if (isValid) {
        const expRes = await fetch(`${baseUrl}/api/v1/vinted/token-info`, { credentials: 'include' })
        if (expRes.ok) {
          const expData = await expRes.json()
          if (expData.expiration) {
            setTokenExpiration(new Date(expData.expiration))
          } else {
            setTokenExpiration(null)
          }
        } else {
          setTokenExpiration(null)
        }
      } else {
        setTokenExpiration(null)
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du cookie:', error)
      setTokenConfigured(false)
      setTokenExpiration(null)
    }
  }

  const handleDeleteToken = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer le cookie configuré ?')) {
      return
    }

    setIsLoading(true)
    try {
      const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000'
      const response = await fetch(`${baseUrl}/api/v1/vinted/auth`, {
        method: 'DELETE',
credentials: 'include',
      })

      if (response.ok) {
        setSuccess('Cookie supprimé avec succès')
        setTokenConfigured(false)
      } else {
        throw new Error('Erreur lors de la suppression du cookie')
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  useEffect(() => {
    checkTokenStatus()
  }, [])

  return (
    <div className="space-y-6">
      {tokenConfigured !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Statut du Token
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {tokenConfigured ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-600">Token configuré et valide</p>
                      <p className="text-sm text-muted-foreground">
                        Prêt pour les analyses de marché
                      </p>
                      {tokenExpiration && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Expiration du token : {tokenExpiration.toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-600">Token invalide ou non configuré</p>
                      <p className="text-sm text-muted-foreground">
                        Veuillez configurer un token valide pour continuer.
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              {tokenConfigured !== null && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkTokenStatus}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Vérifier'
                    )}
                  </Button>
                  {tokenConfigured && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteToken}
                      disabled={isLoading}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulaire de configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Configuration du Token Vinted
          </CardTitle>
          <CardDescription>
            Configurez votre token d'authentification pour accéder aux données Vinted
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="cookie"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cookie de session Vinted</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showCookie ? "text" : "password"}
                          placeholder="Collez ici votre cookie Vinted complet (avec access_token_web)..."
                          {...field}
                          disabled={isLoading}
                          className="pr-20"
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCookie(!showCookie)}
                            className="h-8 w-8 p-0"
                          >
                            {showCookie ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(field.value)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Le cookie sera stocké de manière sécurisée et utilisé uniquement pour les analyses
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Messages d'erreur et de succès */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isLoading || !form.watch("cookie")}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Configuration en cours...
                  </>
                ) : (
                  <>
                    <Settings className="mr-2 h-4 w-4" />
                    Configurer le Token
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Instructions détaillées */}
      <Card>
        <CardHeader>
          <CardTitle>Comment obtenir votre token Vinted</CardTitle>
          <CardDescription>
            Guide étape par étape pour récupérer votre token d'authentification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">1</Badge>
              <div>
                <p className="font-medium">Connectez-vous à Vinted</p>
                <p className="text-sm text-muted-foreground">
                  Ouvrez votre navigateur et connectez-vous à votre compte Vinted
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">2</Badge>
              <div>
                <p className="font-medium">Ouvrez les outils de développement</p>
                <p className="text-sm text-muted-foreground">
                  Appuyez sur F12 ou clic droit → "Inspecter l'élément"
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">3</Badge>
              <div>
                <p className="font-medium">Allez dans l'onglet Network/Réseau</p>
                <p className="text-sm text-muted-foreground">
                  Cliquez sur l'onglet "Network" ou "Réseau" dans les outils de développement
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">4</Badge>
              <div>
                <p className="font-medium">Effectuez une action sur Vinted</p>
                <p className="text-sm text-muted-foreground">
                  Faites une recherche ou naviguez sur le site pour générer des requêtes API
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">5</Badge>
              <div>
                <p className="font-medium">Trouvez une requête API</p>
                <p className="text-sm text-muted-foreground">
                  Cherchez une requête vers "vinted.fr/api" dans la liste des requêtes
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">6</Badge>
              <div>
                <p className="font-medium">Copiez le token Bearer</p>
                <p className="text-sm text-muted-foreground">
                  Dans les headers de la requête, trouvez "Authorization: Bearer ..." et copiez la partie après "Bearer "
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Sécurité et confidentialité
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Votre token est stocké de manière sécurisée et chiffrée</li>
              <li>• Il n'est utilisé que pour les analyses de marché</li>
              <li>• Vous pouvez le supprimer à tout moment</li>
              <li>• Aucune donnée personnelle n'est collectée</li>
            </ul>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ExternalLink className="h-4 w-4" />
            <span>
              Besoin d'aide ? Consultez la documentation Vinted ou contactez le support
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}