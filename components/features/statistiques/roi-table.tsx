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
    if (roi > 100) return "bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]"
    if (roi > 50) return "bg-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]"
    return "bg-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]"
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
            {data && data.map((_item, index) => (
              <TableRow key={index}>
                <TableCell>{_item.produit}</TableCell>
                <TableCell className="text-right">
                  <Badge className={getBadgeClass(_item.roi || 0)}>
                    {_item.roi != null ? `${_item.roi.toFixed(1)}%` : "N/A"}
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