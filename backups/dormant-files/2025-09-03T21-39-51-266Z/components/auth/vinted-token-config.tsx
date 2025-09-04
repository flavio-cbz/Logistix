"use client"

import React, { useReducer, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, AlertCircle, Trash2 } from "lucide-react"

type State = {
  status: "idle" | "loading" | "success" | "error"
  token: string
  error: string | null
}

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; token: string }
  | { type: "FETCH_ERROR"; error: string }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; token: string }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "REMOVE_START" }
  | { type: "REMOVE_SUCCESS" }
  | { type: "REMOVE_ERROR"; error: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, status: "loading", error: null }
    case "FETCH_SUCCESS":
      return { ...state, status: "success", token: action.token, error: null }
    case "FETCH_ERROR":
      return { ...state, status: "error", token: "", error: action.error }
    case "SUBMIT_START":
      return { ...state, status: "loading", error: null }
    case "SUBMIT_SUCCESS":
      return { ...state, status: "success", token: action.token, error: null }
    case "SUBMIT_ERROR":
      return { ...state, status: "error", token: "", error: action.error }
    case "REMOVE_START":
      return { ...state, status: "loading", error: null }
    case "REMOVE_SUCCESS":
      return { ...state, status: "idle", token: "", error: null }
    case "REMOVE_ERROR":
      return { ...state, status: "error", error: action.error }
    default:
      return state
  }
}

export default function VintedTokenConfig() {
  const [state, dispatch] = useReducer(reducer, { status: "idle", token: "", error: null })
const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [validation, setValidation] = useState<{ status: "idle" | "loading" | "success" | "error"; message: string }>({ status: "idle", message: "" })
// Vérification périodique et initiale de la validité du token Vinted
useEffect(() => {
  if (!state.token) {
    setIsTokenValid(null);
    return;
  }
  const checkToken = async () => {
    try {
      const res = await fetch("/api/v1/vinted/test-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: state.token }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setIsTokenValid(true);
        setValidation((v) => ({ ...v, status: "success", message: "Token Vinted valide." }));
      } else {
        setIsTokenValid(false);
        setValidation((v) => ({ ...v, status: "error", message: data.error || "Token Vinted invalide ou expiré." }));
      }
    } catch {
      setIsTokenValid(false);
      setValidation((v) => ({ ...v, status: "error", _message: "Erreur lors de la vérification périodique du token." }));
    }
  };
  checkToken();
  const interval = setInterval(checkToken, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, [state.token]);

  useEffect(() => {
    dispatch({ type: "FETCH_START" })
    fetch("/api/v1/vinted/token-info", { credentials: "include" })
      .then(async (res) => {
        // Always attempt to parse body; treat any non-OK or error as "not configured"
        let data = null
        try {
          data = await res.json()
        } catch (e) {
          data = null
        }
        if (!res.ok || !data || !data.configured) {
          // Degraded behavior: inform UI that Vinted is not configured instead of throwing
          dispatch({ type: "FETCH_SUCCESS", token: "" })
          return
        }
        dispatch({ type: "FETCH_SUCCESS", token: data.token || "" })
      })
      .catch((err) => {
        // Network or unexpected error -> show non-blocking state
        dispatch({ type: "FETCH_ERROR", error: err.message })
      })
  }, [])
// Vérification périodique de la validité du token Vinted
useEffect(() => {
  if (!state.token) return;
  const interval = setInterval(async () => {
    setValidation((v) => ({ ...v, status: "loading", message: "" }));
    try {
      const res = await fetch("/api/v1/vinted/test-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: state.token }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setValidation((v) => ({ ...v, status: "success", message: "Token Vinted valide." }));
      } else {
        setValidation((v) => ({ ...v, status: "error", message: data.error || "Token Vinted invalide ou expiré." }));
      }
    } catch {
      setValidation((v) => ({ ...v, status: "error", message: "Erreur lors de la vérification périodique du token." }));
    }
  }, 5 * 60 * 1000); // 5 minutes
  return () => clearInterval(interval);
}, [state.token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const token = formData.get("token") as string
    if (!token) {
      dispatch({ type: "SUBMIT_ERROR", error: "Le token est requis." })
      return
    }
    dispatch({ type: "SUBMIT_START" })
    setValidation({ status: "idle", message: "" })
    try {
      const res = await fetch("/api/v1/vinted/configure", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: token }),
      })
      const data = await res.json()
      if (res.ok && data.configured) {
        dispatch({ type: "SUBMIT_SUCCESS", token })
        // Validation du token via la nouvelle route
        setValidation({ status: "loading", message: "" })
        const testRes = await fetch("/api/v1/vinted/test-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
        const testData = await testRes.json()
        if (testRes.ok && testData.valid) {
          setValidation({ status: "success", message: "Token Vinted valide. Authentification réussie !" })
        } else {
          setValidation({ status: "error", message: testData.error || "Token Vinted invalide ou expiré." })
        }
      } else {
        dispatch({ type: "SUBMIT_ERROR", error: data.error || "Erreur lors de la sauvegarde." })
      }
    } catch (err: any) {
      dispatch({ type: "SUBMIT_ERROR", error: err.message })
    }
  }

  // handleRefresh intentionally removed (unused). Re-add and call it from UI if refresh action is required.

  const handleRemove = async () => {
    if (!window.confirm("Supprimer la configuration Vinted ?")) return
    dispatch({ type: "REMOVE_START" })
    try {
      const res = await fetch("/api/v1/vinted/token-info", {
        method: "DELETE",
        credentials: "include",
      })
      if (res.ok) {
        dispatch({ type: "REMOVE_SUCCESS" })
        setValidation({ status: "idle", message: "" })
      } else {
        const data = await res.json()
        dispatch({ type: "REMOVE_ERROR", error: data.error || "Erreur lors de la suppression." })
      }
    } catch (err: any) {
      dispatch({ type: "REMOVE_ERROR", error: err.message })
    }
  }

  // UI rendering
  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-2">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()}>Réessayer</Button>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Configuration du Token Vinted
          <Badge variant={state.token ? "default" : "destructive"}>
            {isTokenValid === false ? "Non configuré" : state.token ? "Configuré" : "Non configuré"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Configurez votre token d’authentification pour accéder aux données Vinted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isTokenValid === true ? (
  <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
    <div className="flex items-center gap-2">
      <CheckCircle className="h-5 w-5 text-[hsl(var(--success-foreground))]" />
      <span className="font-medium">Configuration active</span>
    </div>
    <p className="text-sm text-muted-foreground">
      Pour modifier votre token, soumettez le formulaire ci-dessous à nouveau.
    </p>
  </div>
) : (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      {isTokenValid === false
        ? "Token Vinted invalide ou expiré. Veuillez reconfigurer."
        : "Aucun token Vinted configuré. Veuillez en fournir un."}
    </AlertDescription>
  </Alert>
)}

        {/* Message de validation du token */}
        {validation.status === "loading" && (
          <Alert variant="default" className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Vérification du token en cours...</AlertDescription>
          </Alert>
        )}
        {validation.status === "success" && (
          <Alert variant="success" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-[hsl(var(--success-foreground))]" />
            <AlertDescription>{validation.message}</AlertDescription>
          </Alert>
        )}
        

        <form onSubmit={handleSubmit!} className="space-y-4">
          <Input
            name="token"
            placeholder="Collez ici la valeur du cookie _vinted_fr_session ou access_token_web"
            defaultValue=""
            disabled={validation.status === "loading"}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={validation.status === "loading"}>
              {state.token ? "Mettre à jour" : "Enregistrer"}
            </Button>
            {state.token && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemove!}
                disabled={validation.status === "loading"}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
export { VintedTokenConfig };