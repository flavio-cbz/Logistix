"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AiModelSelector } from './ai-model-selector'

export function AiConfigForm() {
  const [endpoint, setEndpoint] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [selectedModel, setSelectedModel] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/v1/auth/session")
        if (res.ok) {
          const user = await res.json()
          if (user?.aiConfig && typeof user.aiConfig === 'string') {
            const config = JSON.parse(user.aiConfig);
            setEndpoint(config.endpoint || "");
            setApiKey(config.apiKey || "");
            setSelectedModel(config.model || "");
          } else if (user?.aiConfig) { // Fallback for object
            setEndpoint(user.aiConfig.endpoint || "");
            setApiKey(user.aiConfig.apiKey || "");
            setSelectedModel(user.aiConfig.model || "");
          }
        }
      } catch (e) {
        console.error("Failed to fetch session:", e)
      }
    }
    fetchUser()
  }, [])

  const handleSaveConfig = async () => {
    setError("")
    setSuccess("")
    if (!endpoint) {
      setError("Veuillez remplir le endpoint.")
      return
    }
    try {
      const res = await fetch("/api/v1/profile/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, apiKey, selectedModel })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'enregistrement de la configuration.")
      setSuccess("Configuration enregistrée avec succès dans la base de données.")
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'enregistrement.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration de l'Intelligence Artificielle</CardTitle>
        <CardDescription>
          Saisissez votre endpoint et votre clé API (si nécessaire) pour découvrir et sélectionner un modèle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="endpoint">Endpoint</Label>
            <Input
              id="endpoint"
              placeholder="https://integrate.api.nvidia.com/v1"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
            />
          </div>
          <form>
            <div className="space-y-2">
              <Label htmlFor="api-key">Clé API (si requise)</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="••••••••••••••••••••"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
            </div>
          </form>
          <AiModelSelector
            endpoint={endpoint}
            apiKey={apiKey}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}
        <div className="flex justify-end">
          <Button type="button" onClick={handleSaveConfig} disabled={!endpoint}>
            Enregistrer la configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}