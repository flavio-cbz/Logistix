import { NextResponse } from "next/server";
import { getSessionUser } from '@/lib/services/auth';
import { databaseService } from '@/lib/services/database/db';

interface Produit {
  id: string;
  nom: string;
  prixArticle: number;
  prixLivraison: number;
  prixVente?: number;
  benefices?: number;
  pourcentageBenefice?: number;
  vendu: boolean;
  dateVente?: string; // "YYYY-MM-DD HH:MM:SS"
  created_at: number; // Timestamp
  plateforme?: string;
  user_id: string; // Ajout pour le score des vendeurs
}

interface Parcelle {
  id: string;
  nom: string;
  // ... autres propriétés si nécessaire
}

// --- Fonctions de Calcul ---

function calculerRoiParProduit(produits: Produit[]) {
  return produits
    .filter(p => p.vendu && p.pourcentageBenefice != null)
    .map(p => ({
      produit: p.nom,
      roi: p.pourcentageBenefice,
    }))
    .sort((a, b) => (b.roi || 0) - (a.roi || 0))
    .slice(0, 10);
}

function calculerTempsMoyenVente(produits: Produit[]) {
  const produitsVendusAvecTemps = produits
    .filter(p => p.vendu && p.dateVente && p.created_at)
    .map(p => {
      const dateVente = new Date(p.dateVente!).getTime(); 
      const dateCreation = p.created_at * 1000;
      const tempsVente = (dateVente - dateCreation) / (1000 * 60 * 60 * 24);
      return { ...p, tempsVente };
    });

  const statsParPlateforme: { [key: string]: { totalJours: number, count: number } } = {};

  for (const p of produitsVendusAvecTemps) {
    const plateforme = p.plateforme || 'Non spécifié';
    if (!statsParPlateforme[plateforme]) {
      statsParPlateforme[plateforme] = { totalJours: 0, count: 0 };
    }
    statsParPlateforme[plateforme].totalJours += p.tempsVente;
    statsParPlateforme[plateforme].count++;
  }

  return Object.entries(statsParPlateforme).map(([plateforme, data]) => ({
    categorie: plateforme,
    jours: Math.round(data.totalJours / data.count),
  }));
}

function calculerHeatmapVentes(produits: Produit[]) {
  const heatmapData = Array(7).fill(0).map(() => Array(24).fill(0));
  
  produits
    .filter(p => p.vendu && p.dateVente)
    .forEach(p => {
      const dateVente = new Date(p.dateVente!);
      const dayOfWeek = dateVente.getDay();
      const hour = dateVente.getHours();
      if (heatmapData[dayOfWeek]?.[hour] !== undefined) {
  heatmapData[dayOfWeek][hour]++;
}
    });
  
  return heatmapData.map((hours, day) => 
    hours.map((value, hour) => ({ day, hour, value }))
  ).flat();
}

function calculerStatsCles(produits: Produit[], parcelles: Parcelle[]) {
  const produitsVendus = produits.filter(p => p.vendu).length;
  const ventesTotales = produits
    .filter(p => p.vendu && p.prixVente != null)
    .reduce((acc, p) => acc + (p.prixVente || 0), 0);
  const beneficesTotaux = produits
    .filter(p => p.vendu && p.benefices != null)
    .reduce((acc, p) => acc + (p.benefices || 0), 0);

  return {
    produitsVendus,
    ventesTotales: parseFloat(ventesTotales.toFixed(2)),
    beneficesTotaux: parseFloat(beneficesTotaux.toFixed(2)),
    nombreParcelles: parcelles.length,
  };
}

function calculerMeilleuresPlateformes(produits: Produit[]) {
  const rentabiliteParPlateforme: { [key: string]: number } = {};

  produits
    .filter(p => p.vendu && p.benefices != null)
    .forEach(p => {
      const plateforme = p.plateforme || 'Non spécifié';
      rentabiliteParPlateforme[plateforme] = (rentabiliteParPlateforme[plateforme] || 0) + (p.benefices || 0);
    });

  return Object.entries(rentabiliteParPlateforme)
    .map(([plateforme, rentabilite]) => ({ plateforme, rentabilite: parseFloat(rentabilite.toFixed(2)) }))
    .sort((a, b) => b.rentabilite - a.rentabilite)
    .slice(0, 5);
}

function calculerRadarPerformances(produits: Produit[]) {
  const produitsVendus = produits.filter(p => p.vendu);
  
  const totalBenefices = produitsVendus.reduce((acc, p) => acc + (p.benefices || 0), 0);
  const avgBenefice = produitsVendus.length > 0 ? totalBenefices / produitsVendus.length : 0;

  const totalTempsVente = produitsVendus
    .filter(p => p.dateVente && p.created_at)
    .reduce((acc, p) => {
      const dateVente = new Date(p.dateVente!).getTime();
      const dateCreation = p.created_at * 1000;
      return acc + (dateVente - dateCreation);
    }, 0);
  const avgTempsVenteJours = produitsVendus.length > 0 ? (totalTempsVente / produitsVendus.length) / (1000 * 60 * 60 * 24) : 0;
  const vitesseVenteScore = avgTempsVenteJours > 0 ? (100 / avgTempsVenteJours) : 0;

  const nombreVentes = produitsVendus.length;

  const fullMark = 100;

  return [
    { subject: 'Bénéfice Moyen', A: Math.min(avgBenefice > 0 ? Math.round(avgBenefice / 10) : 0, fullMark), fullMark },
    { subject: 'Vitesse Vente', A: Math.min(Math.round(vitesseVenteScore), fullMark), fullMark },
    { subject: 'Volume Ventes', A: Math.min(Math.round(nombreVentes), fullMark), fullMark },
  ];
}

function calculerTendancesSaisonnieres(produits: Produit[]) {
  const ventesParMoisAnnee: { [key: string]: number } = {};

  produits
    .filter(p => p.vendu && p.dateVente && p.prixVente != null)
    .forEach(p => {
      const dateVente = new Date(p.dateVente!);
      const annee = dateVente.getFullYear();
      const mois = (dateVente.getMonth() + 1).toString().padStart(2, '0');
      const cle = `${annee}-${mois}`;
      ventesParMoisAnnee[cle] = (ventesParMoisAnnee[cle] || 0) + (p.prixVente || 0);
    });
  
  const tendances = Object.entries(ventesParMoisAnnee)
    .map(([periode, ventes]) => ({ periode, ventes: parseFloat(ventes.toFixed(2)) }))
    .sort((a, b) => a.periode.localeCompare(b.periode));

  return tendances;
}

interface CourbeTendanceData {
  mois: string;
  valeur: number;
  min: number;
  max: number;
}

interface PrevisionVenteData {
  mois: string;
  prevision: number;
}

function calculerCourbeTendanceEtPrevisions(produits: Produit[]): { courbeTendance: CourbeTendanceData[], previsionsVentes: PrevisionVenteData[] } {
  const ventesMensuelles: { [key: string]: number } = {};

  produits
    .filter(p => p.vendu && p.dateVente && p.prixVente != null)
    .forEach(p => {
      const dateVente = new Date(p.dateVente!);
      const annee = dateVente.getFullYear();
      const mois = dateVente.getMonth();
      const cle = `${annee}-${mois}`;
      ventesMensuelles[cle] = (ventesMensuelles[cle] || 0) + (p.prixVente || 0);
    });

  const courbeTendance: CourbeTendanceData[] = [];
  const previsionsVentes: PrevisionVenteData[] = [];
  const now = new Date();
  
  for (let i = 11; i >= -3; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const annee = date.getFullYear();
    const mois = date.getMonth();
    const cle = `${annee}-${mois}`;
    const nomMois = date.toLocaleString('fr-FR', { month: 'short', year: '2-digit' });

    let valeur = ventesMensuelles[cle] || 0;
    
    if (i < 0) { // Mois futurs = prévisions
        const lastItem = courbeTendance[courbeTendance.length - 1];
        const lastKnownValue = lastItem ? lastItem.valeur : 0;
        valeur = lastKnownValue * (1 + (Math.random() - 0.5) * 0.2);
        previsionsVentes.push({ mois: nomMois, prevision: parseFloat(valeur.toFixed(2)) });
    }

    const min = valeur * 0.9;
    const max = valeur * 1.1;

    courbeTendance.push({ mois: nomMois, valeur: parseFloat(valeur.toFixed(2)), min: parseFloat(min.toFixed(2)), max: parseFloat(max.toFixed(2)) });
  }

  return { courbeTendance, previsionsVentes };
}


export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');

    const produits = await databaseService.query<Produit>('SELECT * FROM produits WHERE user_id = ?', [user.id]);
    const parcelles = await databaseService.query<Parcelle>('SELECT * FROM parcelles WHERE user_id = ?', [user.id]);

    const roiParProduit = calculerRoiParProduit(produits);
    const tempsMoyenVente = calculerTempsMoyenVente(produits);
    const heatmapVentes = calculerHeatmapVentes(produits);
    const statsCles = calculerStatsCles(produits, parcelles);
    const meilleuresPlateformes = calculerMeilleuresPlateformes(produits);
    const radarPerformances = calculerRadarPerformances(produits);
    const tendancesSaisonnieres = calculerTendancesSaisonnieres(produits);
    const { courbeTendance, previsionsVentes } = calculerCourbeTendanceEtPrevisions(produits);
    
    const data = {
      ...statsCles,
      roiParProduit,
      tempsMoyenVente,
      heatmapVentes,
      meilleuresPlateformes,
      radarPerformances,
      tendancesSaisonnieres,
      courbeTendance,
      previsionsVentes,
    };

    if (format === 'csv') {
      let csvContent = "Statistique,Valeur\n";
      csvContent += `Produits Vendus,${data.produitsVendus}\n`;
      csvContent += `Ventes Totales,${data.ventesTotales}\n`;
      csvContent += `Bénéfices Totaux,${data.beneficesTotaux}\n`;
      csvContent += `Nombre de Parcelles,${data.nombreParcelles}\n`;

      // Ajouter d'autres données si nécessaire, par exemple le ROI par produit
      csvContent += "\nROI par Produit\n";
      data.roiParProduit.forEach(item => {
        csvContent += `${item.produit},${item.roi}\n`;
      });

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="statistiques.csv"',
        },
      });
    }

    if (format === 'pdf') {
      return NextResponse.json(
        { message: "L'export PDF est en cours de développement." },
        { status: 501 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques :", error);
    return NextResponse.json(
      { message: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}