import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/services/auth';
import { databaseService } from '@/lib/services/database/db';
import { v4 as uuidv4 } from 'uuid';
import { createCriticalDatabaseHandler } from '@/lib/utils/api-route-optimization';

async function getHandler(request: NextRequest): Promise<NextResponse> {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }
    
    const parcelles = await databaseService.query(
        'SELECT * FROM parcelles WHERE user_id = ?', 
        [user.id],
        'get_user_parcelles'
    );
    
    return NextResponse.json(parcelles);
}

async function postHandler(request: NextRequest): Promise<NextResponse> {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }
    
    const { numero, transporteur, prixAchat, poids } = await request.json();

    try {
        const prixTotal = parseFloat(prixAchat);
        const poidsFloat = parseFloat(poids);
        if (isNaN(poidsFloat) || poidsFloat === 0) {
            return NextResponse.json({ success: false, message: 'Poids invalide ou égal à zéro' }, { status: 400 });
        }
        const prixParGramme = prixTotal / poidsFloat;
         
        const id = uuidv4();
        const created_at = new Date().toISOString();
        const updated_at = new Date().toISOString();

        await databaseService.execute(`
            INSERT INTO parcelles (id, user_id, numero, transporteur, prixAchat, poids, prixTotal, prixParGramme, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, user.id, numero, transporteur, prixAchat, poids, prixTotal, prixParGramme, created_at, updated_at], 'create_parcelle');

        const newParcelle = {
            id,
            user_id: user.id,
            numero,
            transporteur,
            prixAchat: parseFloat(prixAchat),
            poids: parseFloat(poids),
            prixTotal,
            prixParGramme,
            created_at,
            updated_at,
        };
        return NextResponse.json({ success: true, parcelle: newParcelle });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'; 
        console.error("Erreur détaillée lors de la création de la parcelle:", error);
        return NextResponse.json({ success: false, message: 'Erreur lors de la création de la parcelle', error: errorMessage }, { status: 500 });
    }
}

async function putHandler(request: NextRequest): Promise<NextResponse> {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }

    const { id, ...data } = await request.json();

    if (!id) {
        return NextResponse.json({ success: false, message: 'ID de parcelle manquant' }, { status: 400 });
    }

    try {
        const updated_at = new Date().toISOString();
        const prixTotal = parseFloat(data.prixAchat);
        const poidsFloat = parseFloat(data.poids);
        if (isNaN(poidsFloat) || poidsFloat === 0) {
            return NextResponse.json({ success: false, message: 'Poids invalide ou égal à zéro' }, { status: 400 });
        }
        const prixParGramme = prixTotal / poidsFloat;

        const result = await databaseService.execute(`
            UPDATE parcelles
            SET numero = ?, transporteur = ?, prixAchat = ?, poids = ?, prixTotal = ?, prixParGramme = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        `, [data.numero, data.transporteur, data.prixAchat, data.poids, prixTotal, prixParGramme, updated_at, id, user.id], 'update_parcelle');

        if (result.changes === 0) {
            return NextResponse.json({ success: false, message: 'Parcelle non trouvée ou non autorisée' }, { status: 404 });
        }

        const updatedParcelle = { id, ...data, prixTotal, prixParGramme, updated_at };
        return NextResponse.json({ success: true, parcelle: updatedParcelle });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'; 
        return NextResponse.json({ success: false, message: 'Erreur lors de la mise à jour de la parcelle', error: errorMessage }, { status: 500 });
    }
}

async function deleteHandler(request: NextRequest): Promise<NextResponse> {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
        return NextResponse.json({ success: false, message: 'ID de parcelle manquant' }, { status: 400 });
    }

    try {
        const result = await databaseService.execute(
            'DELETE FROM parcelles WHERE id = ? AND user_id = ?', 
            [id, user.id], 
            'delete_parcelle'
        );

        if (result.changes === 0) {
            return NextResponse.json({ success: false, message: 'Parcelle non trouvée ou non autorisée' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'; 
        return NextResponse.json({ success: false, message: 'Erreur lors de la suppression de la parcelle', error: errorMessage }, { status: 500 });
    }
}

// Utiliser le handler optimisé pour les routes critiques de base de données
const handlers = createCriticalDatabaseHandler({
    GET: getHandler,
    POST: postHandler,
    PUT: putHandler,
    DELETE: deleteHandler
});

export const { GET, POST, PUT, DELETE } = handlers;