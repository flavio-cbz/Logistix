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
import { Badge } from "@/components/ui/badge"

interface RoiData {
  produit: string;
  roi: number | null | undefined;
}

interface RoiTableProps {
  data: RoiData[];
}

export function RoiTable({ data }: RoiTableProps) {
  const getBadgeClass = (roi: number) => {
    if (roi > 100) return "bg-green-500 hover:bg-green-600"
    if (roi > 50) return "bg-yellow-500 hover:bg-yellow-600"
    return "bg-red-500 hover:bg-red-600"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 ROI par Produit</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead className="text-right">ROI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data && data.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.produit}</TableCell>
                <TableCell className="text-right">
                  <Badge className={getBadgeClass(item.roi || 0)}>
                    {item.roi != null ? `${item.roi.toFixed(1)}%` : "N/A"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}