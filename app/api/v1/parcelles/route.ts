import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/services/auth';
import { db } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }
    const parcelles = db.prepare('SELECT * FROM parcelles WHERE user_id = ?').all(user.id);
    return NextResponse.json(parcelles);
}

export async function POST(req: Request) {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }
    const { numero, transporteur, prixAchat, poids } = await req.json();

    try {
        const prixTotal = parseFloat(prixAchat);
        const poidsFloat = parseFloat(poids);
        const prixParGramme = prixTotal / poidsFloat;
         
        const id = uuidv4();
        const created_at = new Date().toISOString();
        const updated_at = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO parcelles (id, user_id, numero, transporteur, prixAchat, poids, prixTotal, prixParGramme, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(id, user.id, numero, transporteur, prixAchat, poids, prixTotal, prixParGramme, created_at, updated_at);

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

export async function PUT(req: Request) {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }

    const { id, ...data } = await req.json();

    if (!id) {
        return NextResponse.json({ success: false, message: 'ID de parcelle manquant' }, { status: 400 });
    }

    try {
        const updated_at = new Date().toISOString();
        const prixTotal = parseFloat(data.prixAchat);
        const prixParGramme = prixTotal / parseFloat(data.poids);

        const stmt = db.prepare(`
            UPDATE parcelles
            SET numero = ?, transporteur = ?, prixAchat = ?, poids = ?, prixTotal = ?, prixParGramme = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        `);

        const info = stmt.run(data.numero, data.transporteur, data.prixAchat, data.poids, prixTotal, prixParGramme, updated_at, id, user.id);

        if (info.changes === 0) {
            return NextResponse.json({ success: false, message: 'Parcelle non trouvée ou non autorisée' }, { status: 404 });
        }

        const updatedParcelle = { id, ...data, prixTotal, prixParGramme, updated_at };
        return NextResponse.json({ success: true, parcelle: updatedParcelle });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'; 
        return NextResponse.json({ success: false, message: 'Erreur lors de la mise à jour de la parcelle', error: errorMessage }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) {
        return NextResponse.json({ success: false, message: 'ID de parcelle manquant' }, { status: 400 });
    }

    try {
        const stmt = db.prepare('DELETE FROM parcelles WHERE id = ? AND user_id = ?');
        const info = stmt.run(id, user.id);

        if (info.changes === 0) {
            return NextResponse.json({ success: false, message: 'Parcelle non trouvée ou non autorisée' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'; 
        return NextResponse.json({ success: false, message: 'Erreur lors de la suppression de la parcelle', error: errorMessage }, { status: 500 });
    }
}