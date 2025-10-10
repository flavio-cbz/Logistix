"use client";

import { useState, useEffect } from "react";
import { Package, Search, Filter, Edit, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Colis {
  id: string;
  nom: string;
  description?: string;
  poids?: number;
  adresse_livraison?: string;
  statut: 'en_preparation' | 'expedie' | 'en_transit' | 'livre' | 'retourne';
  actif: boolean;
  created_at: string;
  updated_at: string;
}

interface ColisListProps {
  parcelles?: Colis[];
  loading?: boolean;
  onEdit?: (colis: Colis) => void;
  onDelete?: (colis: Colis) => void;
  onRefresh?: () => void;
  onCreateColis?: () => void;
  className?: string;
}

export function ColisList({
  parcelles = [],
  loading = false,
  onEdit,
  onDelete,
  onRefresh,
  onCreateColis,
  className,
}: ColisListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredColis, setFilteredColis] = useState<Colis[]>([]);

  useEffect(() => {
    const filtered = parcelles.filter(
      (colis) =>
        colis.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (colis.description &&
          colis.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) ||
        (colis.adresse_livraison &&
          colis.adresse_livraison.toLowerCase().includes(searchTerm.toLowerCase())),
    );
    setFilteredColis(filtered);
  }, [parcelles, searchTerm]);

  const formatPoids = (poids?: number) => {
    if (!poids) return "-";
    return `${poids} kg`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Chargement des colis...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <div>
              <CardTitle>Liste des colis</CardTitle>
              <CardDescription>
                {filteredColis.length} colis
                trouvé{filteredColis.length > 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <Filter className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button size="sm" onClick={onCreateColis} data-testid="create-colis-button">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau colis
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un colis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {filteredColis.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm
                ? "Aucun colis trouvé pour cette recherche"
                : "Aucun colis enregistré"}
            </p>
            {!searchTerm && (
              <Button onClick={onCreateColis} className="mt-4" data-testid="create-first-colis-button">
                <Plus className="h-4 w-4 mr-2" />
                Créer votre premier colis
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Poids</TableHead>
                <TableHead>Adresse de livraison</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créée le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredColis.map((colis) => (
                <TableRow key={colis.id}>
                  <TableCell className="font-medium">{colis.nom}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {colis.description || "-"}
                  </TableCell>
                  <TableCell>{formatPoids(colis.poids)}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {colis.adresse_livraison || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      colis.statut === 'livre' ? 'default' : 
                      colis.statut === 'en_transit' ? 'secondary' : 
                      colis.statut === 'expedie' ? 'outline' : 'destructive'
                    }>
                      {colis.statut === 'en_preparation' ? 'En préparation' :
                       colis.statut === 'expedie' ? 'Expédié' :
                       colis.statut === 'en_transit' ? 'En transit' :
                       colis.statut === 'livre' ? 'Livré' : 'Retourné'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(colis.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit?.(colis)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete?.(colis)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default ColisList;
