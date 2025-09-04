import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth";
import { db } from "@/lib/services/database/drizzle-client";
import { users } from "@/lib/services/database/drizzle-schema";
import { eq } from "drizzle-orm";
import { deriveUserKek, encrypt as encryptWithKey, decrypt as decryptWithKey, generateUserSecret } from "@/lib/services/security/encryption-service";
import { z } from "zod";

// Types et schémas
const AiConfigInputSchema = z.object({
  endpoint: z.string().trim().min(1, "Endpoint requis"),
  apiKey: z.string().optional(),
  selectedModel: z.string().trim().optional(),
});

type AiConfig = {
  endpoint?: string | undefined;
  apiKey?: string | null | undefined; // Stockée chiffrée en base
  model?: string | undefined;
};

type DbUserRow = {
  encryption_secret: string | null;
  ai_config: string | null;
};

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

function maskSecret(secret: string): string {
  if (!secret) return "";
  const last4 = secret.slice(-4);
  return `***${last4}`;
}

function isMasked(secret?: string | null): boolean {
  if (!secret) return false;
  return secret.startsWith("***");
}

function parseAiConfig(raw: unknown): AiConfig | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as AiConfig;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw as AiConfig;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = AiConfigInputSchema.safeParse(body);
    if (!parsed.success) {
      // Ne pas exposer de détails sensibles, renvoyer un message concis
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues.map(i => ({ path: i.path, _message: i.message })) },
        { status: 400 }
      );
    }

    const { endpoint, apiKey, selectedModel } = parsed.data;

    // Récupère secret et config existante en une seule requête
    const userRow = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { encryption_secret: true, ai_config: true },
    }) as DbUserRow | undefined;

    // Garantir un secret d'utilisateur
    let userSecret = userRow?.encryption_secret ?? null;
    if (!userSecret) {
      userSecret = generateUserSecret();
      await db.update(users).set({ encryption_secret: userSecret }).where(eq(users.id, user.id));
    }

    const kek = await deriveUserKek(userSecret);

    const previousConfig = (parseAiConfig(userRow?.ai_config) ?? {}) as AiConfig;

    // Préparer la prochaine config en conservant les valeurs existantes si non fournies
    const nextConfig: AiConfig = {
      ...previousConfig,
      endpoint: endpoint ?? previousConfig.endpoint,
      model: selectedModel ?? previousConfig.model,
    };

    // Gestion robuste de la clé API
    if (typeof apiKey === "undefined") {
      // Non fournie: conserver valeur chiffrée existante
      nextConfig.apiKey = previousConfig.apiKey ?? null;
    } else if (apiKey === "") {
      // Vider explicitement la clé
      nextConfig.apiKey = null;
    } else if (isMasked(apiKey)) {
      // Valeur masquée renvoyée par le GET: conserver l'ancienne
      nextConfig.apiKey = previousConfig.apiKey ?? null;
    } else {
      // Nouvelle clé fournie: chiffrer
      nextConfig.apiKey = encryptWithKey(apiKey, kek);
    }

    const updated = await db
      .update(users)
      .set({ ai_config: nextConfig })
      .where(eq(users.id, user.id))
      .returning() as any[];

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: "Impossible de mettre à jour l'utilisateur" }, { status: 500 });
    }

    return NextResponse.json({ success: true, _message: "Configuration enregistrée." });
  } catch (e: unknown) {
    // Journalisation sans données sensibles
    console.error("Erreur lors de la sauvegarde de la configuration IA");
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const result = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        ai_config: true,
        encryption_secret: true,
      },
    }) as DbUserRow | undefined;

    if (!result || !result.ai_config) {
      return NextResponse.json({ ai_config: null }, { headers: NO_STORE_HEADERS });
    }

    const userSecret = result.encryption_secret;
    const aiConfig = (parseAiConfig(result.ai_config) ?? {}) as AiConfig;

    // Déchiffrer la clé API avant de renvoyer AU FORMAT MASQUÉ pour sécurité
    if (aiConfig && aiConfig.apiKey && typeof aiConfig.apiKey === "string") {
      try {
        if (!userSecret) throw new Error("Utilisateur sans encryption_secret");
        const kek = await deriveUserKek(userSecret);
        const decrypted = decryptWithKey(aiConfig.apiKey, kek);
        aiConfig.apiKey = maskSecret(decrypted);
      } catch {
        // En cas d'échec, ne pas renvoyer de clé
        aiConfig.apiKey = null;
      }
    }

    // Conserver le même shape qu'avant (string JSON) pour compatibilité front
    return NextResponse.json({ ai_config: JSON.stringify(aiConfig) }, { headers: NO_STORE_HEADERS });
  } catch (e: unknown) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}