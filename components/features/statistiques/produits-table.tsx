"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Produit } from "@/types/database"

interface ProduitsTableProps {
  produits: Produit[]
}

export function ProduitsTable({ produits }: ProduitsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Produits les plus rentables</CardTitle>
        <CardDescription>Classement des produits par bénéfice</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead className="text-right">Prix de vente</TableHead>
              <TableHead className="text-right">Bénéfices</TableHead>
              <TableHead className="text-right">Marge (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produits.map((produit) => (
              <TableRow key={produit.id}>
                <TableCell className="font-medium">{produit.nom}</TableCell>
                <TableCell className="text-right">{(produit.prixVente || 0).toFixed(2)} €</TableCell>
                <TableCell className="text-right">{(produit.benefices || 0).toFixed(2)} €</TableCell>
                <TableCell className="text-right">{(produit.pourcentageBenefice || 0).toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

