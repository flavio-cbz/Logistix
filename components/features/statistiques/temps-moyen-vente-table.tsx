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

interface TempsMoyenVenteData {
  categorie: string;
  jours: number;
}

interface TempsMoyenVenteTableProps {
  data: TempsMoyenVenteData[];
}

export function TempsMoyenVenteTable({ data }: TempsMoyenVenteTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Temps de Vente Moyen par Plateforme</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plateforme</TableHead>
              <TableHead className="text-right">Jours (moy.)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data && data.map((_item, index) => (
              <TableRow key={index}>
                <TableCell>{_item.categorie}</TableCell>
                <TableCell className="text-right">{_item.jours}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}