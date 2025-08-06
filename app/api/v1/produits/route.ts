import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/services/auth';
import { databaseService } from '@/lib/services/database/db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const productSchema = z.object({
  nom: z.string(),
  prixArticle: z.number(),
  prixLivraison: z.number(),
  poids: z.number(),
  vendu: z.boolean().optional(),
  prixVente: z.number().optional(),
  commandeId: z.string(),
  parcelleId: z.string().optional(),
  details: z.string().optional(),
  prixArticleTTC: z.number().optional(),
  dateVente: z.string().optional(),
  tempsEnLigne: z.string().optional(),
  plateforme: z.string().optional(),
});

function getCurrentTimestamp() {
    return Math.floor(Date.now() / 1000);
}

export async function GET(_req: Request) {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }

    const produits = await databaseService.query('SELECT * FROM produits WHERE user_id = ?', [user.id]);
    return NextResponse.json(produits);
}

export async function POST(req: Request) {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const validatedData = productSchema.parse(body);
        const {
            parcelleId,
            commandeId,
            nom,
            details,
            prixArticle,
            prixArticleTTC,
            poids,
            prixLivraison,
            vendu,
            dateVente,
            tempsEnLigne,
            prixVente,
            plateforme,
        } = validatedData;

        const newId = uuidv4();
        const created_at = getCurrentTimestamp();

        // Calcul des bénéfices et du pourcentage de bénéfice
        const benefices = prixVente != null ? prixVente - (prixArticle + prixLivraison) : null;
        const pourcentageBenefice = benefices !== null && (prixArticle + prixLivraison) > 0
            ? (benefices / (prixArticle + prixLivraison)) * 100
            : null;

        await databaseService.execute(`
            INSERT INTO produits (id, user_id, parcelleId, commandeId, nom, details, prixArticle, prixArticleTTC, poids, prixLivraison, vendu, dateVente, tempsEnLigne, prixVente, plateforme, benefices, pourcentageBenefice, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            newId,
            user.id,
            parcelleId || null,
            commandeId,
            nom,
            details || null,
            prixArticle,
            prixArticleTTC || null,
            poids,
            prixLivraison,
            vendu ? 1 : 0,
            dateVente || null,
            tempsEnLigne || null,
            prixVente || null,
            plateforme || null,
            benefices,
            pourcentageBenefice,
            created_at,
            created_at
        ]);

        const newProduit = { id: newId, ...validatedData, benefices, pourcentageBenefice, user_id: user.id, created_at, updated_at: created_at };
        return NextResponse.json({ success: true, produit: newProduit }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, message: 'Erreur de validation', errors: error.errors }, { status: 400 });
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({ success: false, message: 'Erreur lors de la création du produit', error: errorMessage }, { status: 500 });
    }
}