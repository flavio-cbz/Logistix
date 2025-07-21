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

interface PlateformeRentabiliteData {
  plateforme: string;
  rentabilite: number;
}

interface PlateformesRentabiliteTableProps {
  data: PlateformeRentabiliteData[];
}

export function PlateformesRentabiliteTable({ data }: PlateformesRentabiliteTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Meilleures Plateformes par Rentabilité</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plateforme</TableHead>
              <TableHead className="text-right">Rentabilité (€)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data && data.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.plateforme}</TableCell>
                <TableCell className="text-right">{item.rentabilite.toFixed(2)} €</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}