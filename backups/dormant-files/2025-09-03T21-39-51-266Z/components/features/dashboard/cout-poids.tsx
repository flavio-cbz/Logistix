"use client"

import { useMemo, useCallback } from "react"
import { CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useState } from "react" // Déplacé l'importation de useState en haut

interface CoutPoidsData {
  name: string
  poids: number
  prixTotal: number
  prixParGramme: number
  transporteur: string
}

interface CoutPoidsProps {
  data: CoutPoidsData[]
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#a4de6c", "#d0ed57", "#ffc0cb"]

export default function CoutPoids({ data }: CoutPoidsProps) { // Ajout de l'exportation par défaut
  const transporteurs = useMemo(() => {
    const uniqueTransporteurs = Array.from(new Set(data.map((item) => item.transporteur)))
    return uniqueTransporteurs
  }, [data])

  const [selectedTransporteur, setSelectedTransporteur] = useState<string | "all">("all")

  const filteredData = useMemo(() => {
    if (selectedTransporteur === "all") {
      return data
    }
    return data.filter((item) => item.transporteur === selectedTransporteur) // Correction: _item en item
  }, [data, selectedTransporteur])

  const groupedData = useMemo(() => {
    const groups: { [key: string]: CoutPoidsData[] } = {}
    filteredData.forEach((item) => {
      if (!groups[item.transporteur]) {
        groups[item.transporteur] = []
      }
      groups[item.transporteur]!.push(item)
    })
    return Object.entries(groups).map(([transporteur, _data]) => ({
      transporteur,
      _data,
    }))
  }, [filteredData])

  const getColor = useCallback((index: number) => { // Correction: _index en index
    return COLORS[index % COLORS.length]!
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coût au Poids par Transporteur</CardTitle>
        <div className="flex items-center gap-2">
          <Label htmlFor="transporteur-select">Transporteur:</Label>
          <Select value={selectedTransporteur} onValueChange={setSelectedTransporteur}>
            <SelectTrigger id="transporteur-select" className="w-[180px]">
              <SelectValue placeholder="Tous les transporteurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {transporteurs.map((transporteur) => (
                <SelectItem key={transporteur} value={transporteur}>
                  {transporteur}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart
            margin={{
              top: 20,
              right: 20,
              bottom: 20,
              left: 20,
            }}
          >
            <CartesianGrid />
            <XAxis type="number" dataKey="poids" name="Poids (g)" unit="g" />
            <YAxis type="number" dataKey="prixTotal" name="Prix Total (€)" unit="€" />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            {/* Correction: data en _data et index en index */}
            {groupedData.map((group, index) => (
              <Scatter key={group.transporteur} name={group.transporteur} data={group._data} fill={getColor(index)} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}