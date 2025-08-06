"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Produit } from "@/types/database"

interface TopProduitsProps {
  produits: Produit[]
}

export default function TopProduits({ produits }: TopProduitsProps) {
  // Tri des produits par bénéfice
  const topProduits = [...produits]
    .sort((a, b) => {
      const beneficeA = (a.prixVente || 0) - a.prixArticle - a.prixLivraison
      const beneficeB = (b.prixVente || 0) - b.prixArticle - b.prixLivraison
      return beneficeB - beneficeA
    })
    .slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 des produits</CardTitle>
        <CardDescription>Les produits les plus rentables</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Prix de vente</TableHead>
              <TableHead>Bénéfice</TableHead>
              <TableHead>Marge</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topProduits.map((produit) => {
              const benefice = (produit.prixVente || 0) - produit.prixArticle - produit.prixLivraison
              const marge = ((benefice / (produit.prixArticle + produit.prixLivraison)) * 100).toFixed(1)

              return (
                <TableRow key={produit.id}>
                  <TableCell className="font-medium">{produit.nom}</TableCell>
                  <TableCell>{produit.prixVente?.toFixed(2)} €</TableCell>
                  <TableCell>{benefice.toFixed(2)} €</TableCell>
                  <TableCell>{marge}%</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

