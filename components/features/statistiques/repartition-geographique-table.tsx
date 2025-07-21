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

interface RepartitionGeographiqueData {
  region: string;
  ventes: number;
}

interface RepartitionGeographiqueTableProps {
  data: RepartitionGeographiqueData[];
}

export function RepartitionGeographiqueTable({ data }: RepartitionGeographiqueTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition Géographique des Ventes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Région</TableHead>
              <TableHead className="text-right">Nombre de Ventes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data && data.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.region}</TableCell>
                <TableCell className="text-right">{item.ventes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}