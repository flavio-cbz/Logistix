"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fetchProfileAiConfig } from '@/lib/services/profile-ai-config-api';

interface AiModelSelectorProps {
  endpoint: string
  apiKey: string
  selectedModel: string
  onModelChange: (model: string) => void
}

export function AiModelSelector({ endpoint, apiKey, selectedModel, onModelChange }: AiModelSelectorProps) {
  const [models, setModels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      try {
        const data = await fetchProfileAiConfig();
        if (data && data.ai_config) {
          const config = typeof data.ai_config === 'string' ? JSON.parse(data.ai_config) : data.ai_config;
          onModelChange(config.model || '');
        }
      } catch (e) {
        // Optionnel : afficher une erreur
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [onModelChange]);

  const discoverModels = async () => {
    setError("")
    setLoading(true)
    setModels([])
    onModelChange("")
    try {
      const res = await fetch("/api/ai-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, apiKey })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur lors de la récupération des modèles")
      if (!data.data || !Array.isArray(data.data)) throw new Error("Format de réponse inattendu")
      setModels(data.data.map((m: any) => m.id))
    } catch (e: any) {
      setError("Échec de la requête : " + (e.message || "Impossible de découvrir les modèles."))
    } finally {
      setLoading(false)
    }
  }

  const filteredModels = useMemo(() => {
    return models.filter(model => model.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [models, searchTerm])

  return (
    <div className="space-y-2">
      <Label htmlFor="model">Modèle (optionnel)</Label>
      <div className="flex items-center gap-2">
        <Button type="button" onClick={discoverModels} disabled={!endpoint || loading}>
          {loading ? "Chargement..." : "Découvrir les modèles"}
        </Button>
      </div>
      {models.length > 0 && (
        <div className="space-y-2 pt-2">
           <Input 
            placeholder="Rechercher un modèle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={selectedModel} onValueChange={onModelChange} disabled={filteredModels.length === 0}>
            <SelectTrigger id="model">
              <SelectValue placeholder="Sélectionner un modèle" />
            </SelectTrigger>
            <SelectContent>
              {filteredModels.map(model => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}