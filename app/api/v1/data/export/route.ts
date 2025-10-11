import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { databaseService } from "@/lib/services/database/db";
import { validateQuery } from "@/lib/middleware/validation-middleware";
import { exportDataQuerySchema } from "@/lib/schemas";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";

// GET /api/v1/data/export - Export sécurisé des données avec validation Zod
export async function GET(request: NextRequest) {
  try {
    // Validation de l'authentification
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    // Validation des paramètres de requête avec Zod
    const queryResult = validateQuery(exportDataQuerySchema as any, request);
    const { format = "json", tables = ["produits", "parcelles"], metadata: includeMetadata = false } = queryResult.data as any;

    const exportData: Record<string, any> = {
      exportInfo: {
        userId: user.id,
        userName: user.username,
        exportDate: new Date().toISOString(),
        format,
        tables,
        version: "1.0",
      },
    };

    // Export des produits
    if (tables.includes("produits")) {
      const produits = await databaseService.query(
        `
        SELECT 
          id, nom, description, categorie, prixAchat, prixVente, 
          benefices, vendu, dateAchat, dateVente, createdAt, updatedAt
        FROM products 
        WHERE userId = ?
        ORDER BY createdAt DESC
      `,
        [user.id],
        "export-produits",
      );

      exportData['produits'] = produits;
    }

    // Export des parcelles
    if (tables.includes("parcelles")) {
      const parcelles = await databaseService.query(
        `
        SELECT 
          id, nom, description, adresse, ville, codePostal, 
          superficie, typeActivite, status, createdAt, updatedAt
        FROM parcelles 
        WHERE userId = ?
        ORDER BY createdAt DESC
      `,
        [user.id],
        "export-parcelles",
      );

      exportData['parcelles'] = parcelles;
    }

    // Export des analyses de marché
    if (tables.includes("market_analyses")) {
      const analyses = await databaseService.query(
        `
        SELECT 
          id, productName, category, averagePrice, minPrice, maxPrice,
          marketScore, competitionLevel, demandLevel, profitabilityScore,
          createdAt, updatedAt
        FROM market_analyses 
        WHERE userId = ?
        ORDER BY createdAt DESC
      `,
        [user.id],
        "export-market-analyses",
      );

      exportData['market_analyses'] = analyses;
    }

    // Métadonnées supplémentaires
    if (includeMetadata) {
      const stats = {
        totalProduits: exportData['produits']?.length || 0,
        totalParcelles: exportData['parcelles']?.length || 0,
        totalAnalyses: exportData['market_analyses']?.length || 0,
        produitsVendus:
          exportData['produits']?.filter((p: any) => p.vendu).length || 0,
        beneficesTotaux:
          exportData['produits']?.reduce(
            (sum: number, p: any) => sum + (p.benefices || 0),
            0,
          ) || 0,
      };

      exportData['metadata'] = stats;
    }

    // Enregistrement de l'export
    const exportId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await databaseService.execute(
      `
      INSERT INTO data_exports (
        id, userId, format, tables, dataSize, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        exportId,
        user.id,
        format,
        JSON.stringify(tables),
        JSON.stringify(exportData).length,
        new Date().toISOString(),
      ],
      "save-export-log",
    );

    // Retour selon le format demandé
    if (format === "csv" && tables && tables.length === 1) {
      // Conversion en CSV pour une seule table
      const tableName = tables[0];
      const data = exportData[tableName];

      if (data && data.length > 0) {
        const firstRow = data[0];
        if (firstRow) {
          const headers = Object.keys(firstRow).join(",");
          const rows = data.map((row: any) =>
            Object.values(row)
              .map((val) =>
                typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val,
              )
              .join(","),
          );
          const csv = [headers, ...rows].join("\n");

          return new NextResponse(csv, {
            headers: {
              "Content-Type": "text/csv",
              "Content-Disposition": `attachment; filename="${tableName}_export_${new Date().toISOString().split("T")[0]}.csv"`,
            },
          });
        }
      }
    }

    // Format JSON par défaut avec réponse standardisée
    return createSuccessResponse(exportData);
    
  } catch (error) {
    return createErrorResponse(error);
  }
}
