import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/services/auth';
import { db } from '@/lib/services/db';
import { z } from 'zod';
import type { Produit } from '@/types';

// Schéma pour la création (la plupart des champs sont requis)
const createProductSchema = z.object({
  nom: z.string(),
  prixArticle: z.number(),
  prixLivraison: z.number(),
  poids: z.number(),
  commandeId: z.string(),
  parcelleId: z.string().optional(),
  details: z.string().optional(),
  vendu: z.boolean().optional(),
  prixVente: z.number().optional(),
  prixArticleTTC: z.number().optional(),
  dateVente: z.string().optional(),
  tempsEnLigne: z.string().optional(),
  plateforme: z.string().optional(),
});

// Schéma pour la mise à jour (tous les champs sont optionnels)
const updateProductSchema = createProductSchema.partial();

function getCurrentTimestamp() {
    return Math.floor(Date.now() / 1000);
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }

    const id = params.id;
    const produit = db.prepare('SELECT * FROM produits WHERE id = ? AND user_id = ?').get(id, user.id);
    if (produit) {
        return NextResponse.json(produit);
    } else {
        return NextResponse.json({ success: false, message: 'Produit non trouvé' }, { status: 404 });
    }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }

    const id = params.id;

    try {
        const body = await req.json();
        const validatedData = updateProductSchema.parse(body);

        const existingProduit = db.prepare('SELECT * FROM produits WHERE id = ? AND user_id = ?').get(id, user.id) as Produit | undefined;

        if (!existingProduit) {
            return NextResponse.json({ success: false, message: 'Produit non trouvé ou non autorisé' }, { status: 404 });
        }

        // Fusionner les données existantes avec les nouvelles données validées
        const finalData = { ...existingProduit, ...validatedData };

        const updated_at = getCurrentTimestamp();

        // Recalculer les champs financiers avec les données fusionnées
        const benefices = (finalData.prixVente != null && finalData.prixArticle != null && finalData.prixLivraison != null)
            ? finalData.prixVente - (finalData.prixArticle + finalData.prixLivraison)
            : null;

        const totalCost = finalData.prixArticle + finalData.prixLivraison;
        const pourcentageBenefice = (benefices !== null && totalCost > 0)
            ? (benefices / totalCost) * 100
            : null;

        const stmt = db.prepare(`
            UPDATE produits
            SET parcelleId = ?, commandeId = ?, nom = ?, details = ?, prixArticle = ?, prixArticleTTC = ?,
                poids = ?, prixLivraison = ?, vendu = ?, dateVente = ?, tempsEnLigne = ?, prixVente = ?,
                plateforme = ?, benefices = ?, pourcentageBenefice = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        `);

        stmt.run(
            finalData.parcelleId || null,
            finalData.commandeId,
            finalData.nom,
            finalData.details || null,
            finalData.prixArticle,
            finalData.prixArticleTTC || null,
            finalData.poids,
            finalData.prixLivraison,
            finalData.vendu ? 1 : 0,
            finalData.dateVente || null,
            finalData.tempsEnLigne || null,
            finalData.prixVente || null,
            finalData.plateforme || null,
            benefices,
            pourcentageBenefice,
            updated_at,
            id,
            user.id
        );

        const updatedProduit = {
            ...finalData,
            benefices,
            pourcentageBenefice,
            updated_at: updated_at,
        };

        return NextResponse.json({ success: true, produit: updatedProduit });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, message: 'Erreur de validation', errors: error.errors }, { status: 400 });
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({ success: false, message: 'Erreur lors de la mise à jour du produit', error: errorMessage }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }

    const id = params.id;

    if (!id) {
        return NextResponse.json({ success: false, message: 'ID de produit manquant' }, { status: 400 });
    }

    try {
        const stmt = db.prepare('DELETE FROM produits WHERE id = ? AND user_id = ?');
        const info = stmt.run(id, user.id);

        if (info.changes === 0) {
            return NextResponse.json({ success: false, message: 'Produit non trouvé ou non autorisé' }, { status: 404 });
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({ success: false, message: 'Erreur lors de la suppression du produit', error: errorMessage }, { status: 500 });
    }
}