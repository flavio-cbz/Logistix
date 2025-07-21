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

interface TendancesSaisonnieresData {
  periode: string;
  ventes: number;
}

interface TendancesSaisonnieresTableProps {
  data: TendancesSaisonnieresData[];
}

export function TendancesSaisonnieresTable({ data }: TendancesSaisonnieresTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendances Saisonnieres (Ventes Mensuelles)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Période</TableHead>
              <TableHead className="text-right">Ventes (€)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data && data.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.periode}</TableCell>
                <TableCell className="text-right">{item.ventes.toFixed(2)} €</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}