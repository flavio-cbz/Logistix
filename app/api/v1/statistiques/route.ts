import { NextResponse } from "next/server";
import { getSessionUser } from '@/lib/services/auth';
import { statisticsService } from '@/lib/services/statistics-service';
import { formatApiError } from '@/lib/utils/error-handler';
import { z } from "zod";

const querySchema = z.object({
  format: z.enum(['csv', 'pdf']).optional()
});

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') ?? undefined;

    // Validation des query params
    const validation = querySchema.safeParse({ format });
    if (!validation.success) {
      return NextResponse.json(
        formatApiError(validation.error, { message: "Paramètre 'format' invalide", errors: validation.error.errors }),
        { status: 400 }
      );
    }

    const data = await statisticsService.getDashboardData(user.id);

    if (validation.data.format === 'csv') {
      let csvContent = "Statistique,Valeur\n";
      csvContent += `Produits Vendus,${data.produitsVendus}\n`;
      csvContent += `Ventes Totales,${data.ventesTotales}\n`;
      csvContent += `Bénéfices Totaux,${data.beneficesTotaux}\n`;
      csvContent += `Nombre de Parcelles,${data.nombreParcelles}\n`;

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

    if (validation.data.format === 'pdf') {
      return NextResponse.json(
        { message: "L'export PDF est en cours de développement." },
        { status: 501 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques :", error);
    return NextResponse.json(
      formatApiError(error, { message: "Erreur interne du serveur." }),
      { status: 500 }
    );
  }
}