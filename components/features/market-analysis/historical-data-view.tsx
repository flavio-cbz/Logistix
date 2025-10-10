"use client";
import { useState, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { History, Search, Filter, Eye } from "lucide-react";
import type {
  HistoricalDataViewProps,
  MarketAnalysisHistoryItem,
} from "@/types/vinted-market-analysis";

export default function HistoricalDataView({
  analyses,
  onLoadMore,
  hasMore,
  isLoading = false,
  onReload,
  onRowClick,
  onToggleCompare,
  selectedForComparison = [],
}: HistoricalDataViewProps & {
  onReload?: () => void;
  onRowClick?: (analysis: MarketAnalysisHistoryItem) => void;
  onToggleCompare?: (analysisId: string) => void;
  selectedForComparison?: string[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pendingDeletions, setPendingDeletions] = useState<string[]>([]);
  const deletionTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const { toast } = useToast();

  const handleUndo = (id: string) => {
    const timer = deletionTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      deletionTimers.current.delete(id);
    }
    setPendingDeletions((prev) => prev.filter((pendingId) => pendingId !== id));
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPendingDeletions((prev) => [...prev, id]);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/market-analysis?id=${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          toast({
            title: "Analyse supprimée",
            description: "L'article a été supprimé avec succès.",
            variant: "default",
          });
          if (onReload) onReload();
        } else {
          handleUndo(id);
          toast({
            title: "Erreur",
            description: "Erreur lors de la suppression.",
            variant: "destructive",
          });
        }
      } catch (e) {
        handleUndo(id);
        toast({
          title: "Erreur réseau",
          description: "Impossible de supprimer l'analyse.",
          variant: "destructive",
        });
      }
      deletionTimers.current.delete(id);
    }, 5000);

    deletionTimers.current.set(id, timer);
  };

  const filteredAnalyses = analyses.filter((analysis) => {
    const matchesSearch = analysis.productName
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || analysis.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatPrice = (price: number) => `${price.toFixed(2)} €`;
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: MarketAnalysisHistoryItem["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">
            Terminé
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]">
            En cours
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Échec</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historique des analyses
        </CardTitle>
        <CardDescription>
          Consultez, supprimez ou comparez vos analyses précédentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter!}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="pending">En cours</SelectItem>
                <SelectItem value="failed">Échec</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredAnalyses.length === 0 ? (
          <div className="text-center py-8">
            <p>Aucune analyse trouvée.</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Prix moyen</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnalyses.map((analysis) => {
                  const isPending = pendingDeletions.includes(analysis.id);
                  const isSelected = selectedForComparison.includes(
                    analysis.id,
                  );
                  return (
                    <TableRow
                      key={analysis.id}
                      onClick={() => onRowClick && onRowClick(analysis)}
                      className={`transition-all duration-300 ${
                        isPending
                          ? "opacity-50"
                          : "cursor-pointer hover:bg-muted/50"
                      } ${isSelected ? "bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]" : ""}`}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() =>
                            onToggleCompare && onToggleCompare(analysis.id)
                          }
                          disabled={isPending}
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{analysis.productName}</p>
                        {analysis.error && (
                          <p className="text-xs text-[hsl(var(--destructive-foreground))] mt-1">
                            {analysis.error}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(analysis.status)}</TableCell>
                      <TableCell>{formatPrice(analysis.avgPrice)}</TableCell>
                      <TableCell>{formatDate(analysis.createdAt)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRowClick && onRowClick(analysis)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!isPending && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => handleDelete(e, analysis.id)}
                            >
                              Supprimer
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={onLoadMore!}
              disabled={isLoading}
            >
              Charger plus
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
