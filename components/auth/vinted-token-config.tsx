"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, Save, AlertCircle, Trash2, Beaker } from "lucide-react"

const vintedSessionSchema = z.object({
  sessionToken: z.string().min(1, "Le cookie ou token Vinted est requis."),
})

type VintedSessionFormValues = z.infer<typeof vintedSessionSchema>

interface VintedConfigStatus {
  status: 'active' | 'expired' | 'error' | 'requires_configuration';
  lastRefreshedAt?: string;
  refreshErrorMessage?: string;
}

export function VintedTokenConfig({
  initialToken = "",
  isConfigured = false,
  isValid = false,
  lastValidated
}: {
  initialToken?: string
  isConfigured?: boolean
  isValid?: boolean
  lastValidated?: string
}) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [configStatus, setConfigStatus] = useState<VintedConfigStatus | null>(null)
  const [isFetchingStatus, setIsFetchingStatus] = useState(true);

  const form = useForm<VintedSessionFormValues>({
    resolver: zodResolver(vintedSessionSchema),
    defaultValues: {
      sessionToken: "",
    },
  })

  useEffect(() => {
    const fetchStatus = async () => {
      setIsFetchingStatus(true);
      try {
        const response = await fetch("/api/v1/vinted/configure");
        const data: VintedConfigStatus = await response.json();
        setConfigStatus(data);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de récupérer le statut de la configuration Vinted.",
        });
      } finally {
        setIsFetchingStatus(false);
      }
    };
    fetchStatus();
  }, [toast]);

  const handleTestToken = async () => {
    const sessionToken = form.getValues("sessionToken");
    if (!sessionToken) {
      toast({
        variant: "destructive",
        title: "Champ requis",
        description: "Veuillez saisir un token avant de le tester.",
      });
      return;
    }

    console.log("Début du test du token...");
    setIsTesting(true);
    try {
      console.log("Appel de l'API /api/v1/vinted/test-token");
      const response = await fetch("/api/v1/vinted/test-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      });

      const result = await response.json();
      console.log("Réponse de l'API:", result);

      if (response.ok && result.isValid) {
        console.log("Affichage du toast de succès");
        toast({
          title: "Token valide",
          description: "Le token a été testé avec succès.",
        });
      } else {
        console.log("Affichage du toast d'erreur (token invalide)");
        toast({
          variant: "destructive",
          title: "Token invalide",
          description: result.message || "Le token est invalide ou a expiré.",
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'appel API:", error);
      console.log("Affichage du toast d'erreur (exception)");
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors du test du token.",
      });
    } finally {
      console.log("Fin du test du token.");
      setIsTesting(false);
    }
  };

  const onSubmit = async (data: VintedSessionFormValues) => {
    setIsSaving(true)

    try {
      const response = await fetch("/api/v1/vinted/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: data.sessionToken }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Configuration enregistrée",
          description: "Votre cookie/token Vinted a été enregistré et une session a été créée.",
        })
        window.location.reload()
      } else {
        toast({
          variant: "destructive",
          title: "Erreur de configuration",
          description: result.error || "Impossible d'enregistrer le cookie/token. Vérifiez-le et réessayez.",
        })
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveConfig = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer la configuration Vinted ? Cette action est irréversible.")) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/v1/vinted/configure", {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Configuration supprimée",
          description: "La configuration Vinted a été supprimée avec succès.",
        })
        window.location.reload()
      } else {
        const result = await response.json()
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.message || "Impossible de supprimer la configuration.",
        })
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const computedIsConfigured = configStatus?.status && configStatus.status !== 'requires_configuration';
  const computedIsValid = configStatus?.status === 'active';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Configuration Vinted
              {computedIsConfigured && (
                <Badge variant={computedIsValid ? "default" : "destructive"}>
                  {computedIsValid ? "Active" : "Erreur"}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Collez votre cookie ou token Vinted pour activer l'analyse de marché.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Votre cookie ou token Vinted est chiffré avant d'être stocké et n'est utilisé que pour rafraîchir automatiquement votre session.
          </AlertDescription>
        </Alert>

        {isFetchingStatus ? (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : computedIsConfigured ? (
          <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center gap-2">
              {computedIsValid ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                {computedIsValid ? "Configuration active" : `Erreur de session`}
              </span>
            </div>
            {configStatus?.lastRefreshedAt && (
              <p className="text-sm text-muted-foreground">
                Dernier rafraîchissement : {new Date(configStatus.lastRefreshedAt).toLocaleString("fr-FR")}
              </p>
            )}
            {configStatus?.status === 'error' && configStatus.refreshErrorMessage && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <p className="font-bold">Dernière erreur :</p>
                        <p className="text-xs">{configStatus.refreshErrorMessage}</p>
                    </AlertDescription>
                </Alert>
            )}
            <p className="text-sm text-muted-foreground">Pour modifier votre cookie/token, veuillez soumettre le formulaire ci-dessous à nouveau.</p>
          </div>
        ) : null}

        {configStatus?.status === 'expired' && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Votre token Vinted a expiré. Veuillez en fournir un nouveau pour continuer à utiliser l'analyse de marché.
                </AlertDescription>
            </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sessionToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cookie ou token Vinted</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Collez ici la valeur du cookie _vinted_fr_session ou access_token_web"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Rendez-vous sur Vinted, connectez-vous, puis copiez la valeur du cookie <b>_vinted_fr_session</b> ou <b>access_token_web</b> depuis les outils de développement de votre navigateur.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSaving || isTesting}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {computedIsConfigured ? "Mettre à jour" : "Enregistrer"}
                  </>
                )}
              </Button>

              <Button type="button" variant="outline" onClick={handleTestToken} disabled={isSaving || isTesting}>
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  <>
                    <Beaker className="mr-2 h-4 w-4" />
                    Tester le token
                  </>
                )}
              </Button>

              {computedIsConfigured && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRemoveConfig}
                  disabled={isSaving || isTesting}
                  className="ml-auto"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}