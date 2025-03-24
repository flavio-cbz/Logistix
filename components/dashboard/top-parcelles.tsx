"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Parcelle, Produit } from "@/types"

interface TopParcellesProps {
  parcelles: Parcelle[]
  produits: Produit[]
  title?: string
}

export function TopParcelles({ parcelles, produits, title = "Parcelles les plus rentables" }: TopParcellesProps) {
  // Calculer les bénéfices totaux par parcelle
  const parcellesAvecBenefices = parcelles.map((parcelle) => {
    const produitsDeLaParcelle = produits.filter((p) => p.parcelleId === parcelle.id && p.vendu)
    const beneficesTotal = produitsDeLaParcelle.reduce((total, p) => total + (p.benefices || 0), 0)
    const produitsTotalCount = produits.filter((p) => p.parcelleId === parcelle.id).length
    const produitsVendusCount = produitsDeLaParcelle.length
    const tauxVente = produitsTotalCount > 0 ? (produitsVendusCount / produitsTotalCount) * 100 : 0

    return {
      ...parcelle,
      beneficesTotal,
      produitsTotalCount,
      produitsVendusCount,
      tauxVente,
      roi: parcelle.prixTotal > 0 ? (beneficesTotal / parcelle.prixTotal) * 100 : 0,
    }
  })

  // Trier par ROI (retour sur investissement)
  const topParcelles = [...parcellesAvecBenefices].sort((a, b) => b.roi - a.roi).slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Les parcelles avec le meilleur retour sur investissement</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parcelle</TableHead>
              <TableHead>Transporteur</TableHead>
              <TableHead className="text-right">Prix Total</TableHead>
              <TableHead className="text-right">Bénéfices</TableHead>
              <TableHead className="text-right">ROI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topParcelles.map((parcelle) => (
              <TableRow key={parcelle.id}>
                <TableCell className="font-medium">#{parcelle.numero}</TableCell>
                <TableCell>{parcelle.transporteur}</TableCell>
                <TableCell className="text-right">{parcelle.prixTotal.toFixed(2)}€</TableCell>
                <TableCell className="text-right">{parcelle.beneficesTotal.toFixed(2)}€</TableCell>
                <TableCell className="text-right">
                  <span className={parcelle.roi > 0 ? "text-green-600" : "text-red-600"}>
                    {parcelle.roi.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

