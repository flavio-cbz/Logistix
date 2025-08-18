import { z } from "zod";
import { runInference } from "./inference-client";

// Schéma Zod pour la validation
const NormalizedTitleSchema = z.object({
  brand: z.string().nullable(),
  model: z.string().nullable(),
  year: z.number().nullable(),
  attributes: z.array(z.string()),
});

interface NormalizedTitle {
  brand: string | null;
  model: string | null;
  year: number | null;
  attributes: string[];
}

const NORMALIZATION_PROMPT_TEMPLATE = `
Extrait les informations structurées suivantes du titre de l'annonce ci-dessous.
Titre: "{title}"

Réponds uniquement avec un objet JSON valide au format suivant, sans texte supplémentaire avant ou après:
{
  "brand": "Marque du véhicule ou null",
  "model": "Modèle du véhicule ou null",
  "year": "Année du véhicule en nombre ou null",
  "attributes": ["liste", "des", "attributs", "pertinents"]
}
`;

export async function normalizeTitle(title: string): Promise<NormalizedTitle> {
  const prompt = NORMALIZATION_PROMPT_TEMPLATE.replace("{title}", title);

  try {
    const response = await runInference({
      prompt: prompt,
      temperature: 0.1,
      max_tokens: 150,
    });

    // La réponse de l'API peut contenir du texte avant/après le JSON.
    // Nous devons extraire le JSON de la réponse.
    const jsonString = response.choices[0].text.match(/{[\s\S]*}/)?.[0];
    if (!jsonString) {
      throw new Error("La réponse de l'IA ne contient pas de JSON valide.");
    }

    const parsed = JSON.parse(jsonString);
    const validationResult = NormalizedTitleSchema.safeParse(parsed);

    if (!validationResult.success) {
      throw new Error(`Validation Zod échouée: ${validationResult.error.message}`);
    }

    // Assurer que toutes les propriétés exigées par l'interface NormalizedTitle sont présentes
    return {
      brand: validationResult.data.brand ?? null,
      model: validationResult.data.model ?? null,
      year: validationResult.data.year ?? null,
      attributes: validationResult.data.attributes ?? [],
    };
  } catch (error) {
    console.error("Erreur lors de la normalisation du titre:", error);
    // En cas d'erreur, retourner un objet vide pour ne pas bloquer le pipeline
    return {
      brand: null,
      model: null,
      year: null,
      attributes: [],
    };
  }
}