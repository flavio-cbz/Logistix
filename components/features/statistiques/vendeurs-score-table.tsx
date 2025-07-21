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

interface VendeurScoreData {
  vendeur: string;
  score: number;
}

interface VendeursScoreTableProps {
  data: VendeurScoreData[];
}

export function VendeursScoreTable({ data }: VendeursScoreTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Vendeurs par Score</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendeur</TableHead>
              <TableHead className="text-right">Score (Bénéfices)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data && data.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.vendeur}</TableCell>
                <TableCell className="text-right">{item.score.toFixed(2)} €</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}