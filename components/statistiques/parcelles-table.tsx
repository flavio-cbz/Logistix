"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Parcelle } from "@/types"

interface ParcellesTableProps {
  parcelles: Parcelle[]
}

export function ParcellesTable({ parcelles }: ParcellesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Parcelles les plus économiques</CardTitle>
        <CardDescription>Classement des parcelles par prix au gramme</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parcelle</TableHead>
              <TableHead className="text-right">Prix/g</TableHead>
              <TableHead className="text-right">Poids total</TableHead>
              <TableHead className="text-right">Prix total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parcelles.map((parcelle) => (
              <TableRow key={parcelle.id}>
                <TableCell className="font-medium">#{parcelle.numero}</TableCell>
                <TableCell className="text-right">{parcelle.prixParGramme.toFixed(3)} €/g</TableCell>
                <TableCell className="text-right">{parcelle.poids}g</TableCell>
                <TableCell className="text-right">{parcelle.prixTotal.toFixed(2)} €</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
