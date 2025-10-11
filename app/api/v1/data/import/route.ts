import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { databaseService } from "@/lib/services/database/db";
import { validateBody } from "@/lib/middleware/validation-middleware";
import { importDataSchema } from "@/lib/schemas";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";

// POST /api/v1/data/import - Import sécurisé des données avec validation Zod
export async function POST(request: NextRequest) {
  try {
    // Validation de l'authentification
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    // Validation du body avec Zod
    const { data, options } = (await validateBody(importDataSchema, request)).data;
    const {
      overwrite = false,
      validateOnly = false,
      skipDuplicates = false,
      tablesToImport = []
    } = options || {};

    const importResult = {
      importId: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      summary: {
        totalRecords: 0,
        imported: 0,
        skipped: 0,
        errors: 0,
        tables: {} as Record<string, any>,
      },
      errors: [] as Array<{ table: string; record: number; error: string }>,
      warnings: [] as string[],
    };

    // Import des produits
    if (
      data['produits'] &&
      (tablesToImport.length === 0 || tablesToImport.includes("produits"))
    ) {
      const produits = Array.isArray(data['produits'])
        ? data['produits']
        : [data['produits']];
      const tableResult = { processed: 0, imported: 0, skipped: 0, errors: 0 };

      for (let i = 0; i < produits.length; i++) {
        const produit = produits[i];
        tableResult.processed++;

        try {
          // Validation des champs requis
          if (!produit?.['nom'] || !produit?.['categorie']) {
            importResult.errors.push({
              table: "produits",
              record: i + 1,
              error: "Nom et catégorie requis",
            });
            tableResult.errors++;
            continue;
          }

          // Vérification des doublons
          if (skipDuplicates && produit?.['id']) {
            const existing = await databaseService.queryOne(
              `
              SELECT id FROM products WHERE id = ? AND userId = ?
            `,
              [produit['id'], user.id],
              "check-produit-duplicate",
            );

            if (existing && !overwrite) {
              tableResult.skipped++;
              continue;
            }
          }

          if (!validateOnly) {
            const id =
              produit?.['id'] ||
              `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            if (overwrite && produit?.['id']) {
              // Mise à jour
              await databaseService.execute(
                `
                UPDATE produits SET
                  nom = ?, description = ?, categorie = ?, prixAchat = ?, 
                  prixVente = ?, benefices = ?, vendu = ?, dateAchat = ?, 
                  dateVente = ?, updatedAt = ?
                WHERE id = ? AND userId = ?
              `,
                [
                  produit?.['nom'],
                  produit?.['description'] || "",
                  produit?.['categorie'],
                  produit?.['prixAchat'] || 0,
                  produit?.['prixVente'] || 0,
                  produit?.['benefices'] || 0,
                  produit?.['vendu'] || false,
                  produit?.['dateAchat'] || new Date().toISOString(),
                  produit?.['dateVente'] || null,
                  new Date().toISOString(),
                  produit?.['id'],
                  user.id,
                ],
                "update-imported-produit",
              );
            } else {
              // Insertion
              await databaseService.execute(
                `
                INSERT INTO produits (
                  id, nom, description, categorie, prixAchat, prixVente, 
                  benefices, vendu, dateAchat, dateVente, userId, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `,
                [
                  id,
                  produit?.['nom'],
                  produit?.['description'] || "",
                  produit?.['categorie'],
                  produit?.['prixAchat'] || 0,
                  produit?.['prixVente'] || 0,
                  produit?.['benefices'] ||
                    (produit?.['prixVente'] || 0) - (produit?.['prixAchat'] || 0),
                  produit?.['vendu'] || false,
                  produit?.['dateAchat'] || new Date().toISOString(),
                  produit?.['dateVente'] || null,
                  user.id,
                  produit?.['createdAt'] || new Date().toISOString(),
                  new Date().toISOString(),
                ],
                "insert-imported-produit",
              );
            }
          }

          tableResult.imported++;
        } catch (error) {
          importResult.errors.push({
            table: "produits",
            record: i + 1,
            error: error instanceof Error ? error.message : "Erreur inconnue",
          });
          tableResult.errors++;
        }
      }

      importResult.summary.tables['produits'] = tableResult;
      importResult.summary.totalRecords += tableResult.processed;
      importResult.summary.imported += tableResult.imported;
      importResult.summary.skipped += tableResult.skipped;
      importResult.summary.errors += tableResult.errors;
    }

    // Import des parcelles
    if (
      data['parcelles'] &&
      (tablesToImport.length === 0 || tablesToImport.includes("parcelles"))
    ) {
      const parcelles = Array.isArray(data['parcelles'])
        ? data['parcelles']
        : [data['parcelles']];
      const tableResult = { processed: 0, imported: 0, skipped: 0, errors: 0 };

      for (let i = 0; i < parcelles.length; i++) {
        const parcelle = parcelles[i];
        tableResult.processed++;

        try {
          // Validation des champs requis
          if (!parcelle?.['nom'] || !parcelle?.['ville']) {
            importResult.errors.push({
              table: "parcelles",
              record: i + 1,
              error: "Nom et ville requis",
            });
            tableResult.errors++;
            continue;
          }

          // Vérification des doublons
          if (skipDuplicates && parcelle?.['id']) {
            const existing = await databaseService.queryOne(
              `
              SELECT id FROM parcelles WHERE id = ? AND userId = ?
            `,
              [parcelle['id'], user.id],
              "check-parcelle-duplicate",
            );

            if (existing && !overwrite) {
              tableResult.skipped++;
              continue;
            }
          }

          if (!validateOnly) {
            const id =
              parcelle?.['id'] ||
              `parc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            if (overwrite && parcelle?.['id']) {
              // Mise à jour
              await databaseService.execute(
                `
                UPDATE parcelles SET
                  nom = ?, description = ?, adresse = ?, ville = ?,
                  codePostal = ?, superficie = ?, typeActivite = ?,
                  status = ?, updatedAt = ?
                WHERE id = ? AND userId = ?
              `,
                [
                  parcelle?.['nom'],
                  parcelle?.['description'] || "",
                  parcelle?.['adresse'] || "",
                  parcelle?.['ville'],
                  parcelle?.['codePostal'] || "",
                  parcelle?.['superficie'] || 0,
                  parcelle?.['typeActivite'] || "agriculture",
                  parcelle?.['status'] || "active",
                  new Date().toISOString(),
                  parcelle?.['id'],
                  user.id,
                ],
                "update-imported-parcelle",
              );
            } else {
              // Insertion
              await databaseService.execute(
                `
                INSERT INTO parcelles (
                  id, nom, description, adresse, ville, codePostal, 
                  superficie, typeActivite, status, userId, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `,
                [
                  id,
                  parcelle?.['nom'],
                  parcelle?.['description'] || "",
                  parcelle?.['adresse'] || "",
                  parcelle?.['ville'],
                  parcelle?.['codePostal'] || "",
                  parcelle?.['superficie'] || 0,
                  parcelle?.['typeActivite'] || "agriculture",
                  parcelle?.['status'] || "active",
                  user.id,
                  parcelle?.['createdAt'] || new Date().toISOString(),
                  new Date().toISOString(),
                ],
                "insert-imported-parcelle",
              );
            }
          }

          tableResult.imported++;
        } catch (error) {
          importResult.errors.push({
            table: "parcelles",
            record: i + 1,
            error: error instanceof Error ? error.message : "Erreur inconnue",
          });
          tableResult.errors++;
        }
      }

      importResult.summary.tables['parcelles'] = tableResult;
      importResult.summary.totalRecords += tableResult.processed;
      importResult.summary.imported += tableResult.imported;
      importResult.summary.skipped += tableResult.skipped;
      importResult.summary.errors += tableResult.errors;
    }

    // Enregistrement de l'import
    if (!validateOnly) {
      await databaseService.execute(
        `
        INSERT INTO data_imports (
          id, userId, summary, errors, createdAt
        ) VALUES (?, ?, ?, ?, ?)
      `,
        [
          importResult.importId,
          user.id,
          JSON.stringify(importResult.summary),
          JSON.stringify(importResult.errors),
          new Date().toISOString(),
        ],
        "save-import-log",
      );
    }

    return createSuccessResponse({
      ...importResult,
      message: validateOnly
        ? "Validation terminée - aucune donnée importée"
        : `Import terminé: ${importResult.summary.imported} enregistrements importés`,
    });
    
  } catch (error) {
    return createErrorResponse(error);
  }
}
