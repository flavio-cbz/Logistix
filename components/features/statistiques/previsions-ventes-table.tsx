"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PrevisionVenteData {
  mois: string;
  prevision: number;
}

interface PrevisionsVentesTableProps {
  data: PrevisionVenteData[];
}

export function PrevisionsVentesTable({ data }: PrevisionsVentesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prévisions de Ventes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mois</TableHead>
              <TableHead className="text-right">Prévision (€)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data && data.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.mois}</TableCell>
                <TableCell className="text-right">{item.prevision.toFixed(2)} €</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}