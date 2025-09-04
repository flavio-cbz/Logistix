'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/utils/logging/logger';
// import { statisticsService } from '@/lib/services/statistics-service'; // Commenté car l'appel se fera via API

export default function StatistiquesPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null); // Utiliser 'any' temporairement si le type exact n'est pas défini

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Appel à la nouvelle route API pour récupérer les données du tableau de bord
      const response = await fetch('/api/v1/statistics/dashboard');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      // Simulation de données pour les 6 derniers mois (peut être remplacé par des données réelles de l'API si la structure change)
      const derniers6Mois = Array.from({ length: 6 }).map((_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return {
          mois: date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }),
          debut: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(),
          fin: new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString(),
        };
      }).reverse();

      // Utilisation des données de l'API
      // Exemple: créer des données pour un graphique de ventes mensuelles
      const ventesData = derniers6Mois.map(({ mois }) => { 
        // Logique pour filtrer les données 'data' par mois/période si nécessaire
        // Pour l'exemple, nous allons juste prendre des valeurs aléatoires
        const ventes = Math.floor(Math.random() * 1000) + 100;
        const produits = Math.floor(Math.random() * 50) + 5;
        return { mois, ventes, produits };
      });

      setStats({
        produitsVendus: data.produitsVendus || 0,
        ventesTotales: data.ventesTotales || 0,
        beneficesTotaux: data.beneficesTotaux || 0,
        nombreParcelles: data.nombreParcelles || 0,
        roiParProduit: data.roiParProduit || [],
        ventesMensuelles: ventesData, // Données pour le graphique
      });

      toast({ title: "Statistiques chargées" });
    } catch (error) {
      logger.error("Erreur chargement statistiques:", error);
      toast({ title: "Erreur chargement statistiques", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>Chargement des statistiques...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto p-4">
        <p>Impossible de charger les statistiques. Veuillez réessayer.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Statistiques Générales</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Produits Vendus</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.produitsVendus}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ventes Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.ventesTotales.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bénéfices Totaux</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.beneficesTotaux.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Nombre de Parcelles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.nombreParcelles}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ventes Mensuelles</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Ici, vous intégreriez un composant graphique pour les ventes mensuelles */}
            <p>Graphique des ventes mensuelles à venir...</p>
            <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-4 rounded-md mt-4">
              {JSON.stringify(stats.ventesMensuelles, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ROI par Produit</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Ici, vous intégreriez un tableau ou un graphique pour le ROI par produit */}
            <p>Tableau/Graphique du ROI par produit à venir...</p>
            <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-4 rounded-md mt-4">
              {JSON.stringify(stats.roiParProduit, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <Button onClick={fetchStats} disabled={loading}>
          {loading ? 'Rechargement...' : 'Recharger les Statistiques'}
        </Button>
      </div>
    </div>
  );
}