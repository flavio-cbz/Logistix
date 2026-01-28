import vintedMappings from "@/lib/data/vinted-mappings.json";
import { SuperbuyMetadata } from "./types";

/**
 * Builds an optimized prompt for IMAGE-BASED product identification
 * Includes Vinted-specific field requirements for brand_id and catalog_id
 * @param fallbackName - Generic name/code from Superbuy
 * @param imageCount - Number of images being analyzed
 * @param superbuyMetadata - Optional metadata from Superbuy order (description, specs)
 */
export function buildPrompt(fallbackName: string, imageCount: number, superbuyMetadata?: SuperbuyMetadata): string {
    // Build the context section with Superbuy metadata if available
    let contextSection = `CONTEXTE:
- ${imageCount} photo(s) QC (Quality Check) d'un produit acheté via un agent chinois (Superbuy)
- Ces photos montrent le produit réel reçu à l'entrepôt
- Le code barcode/référence Superbuy: "${fallbackName}"`;

    // Add Superbuy metadata as helpful hints (not authoritative, but useful for context)
    if (superbuyMetadata) {
        if (superbuyMetadata.goodsName) {
            contextSection += `\n- Titre annonce vendeur: "${superbuyMetadata.goodsName}"`;
        }
        if (superbuyMetadata.itemRemark) {
            contextSection += `\n- Spécifications commandées (PRIORITAIRE pour taille/couleur): "${superbuyMetadata.itemRemark}"`;
        }
        if (superbuyMetadata.notes) {
            contextSection += `\n- Notes additionnelles: "${superbuyMetadata.notes}"`;
        }
    }

    // Generate brand mapping string from JSON
    const brandsList = Object.entries(vintedMappings.brands)
        .map(([name, id]) => `${name}=${id}`)
        .join(', ');

    // Generate category mapping string from JSON
    const categoriesList = Object.entries(vintedMappings.categories)
        .map(([name, id]) => `${name}=${id}`)
        .join(', ');

    return `Tu es un expert en identification de produits de mode et streetwear pour la revente sur VINTED.

${contextSection}

IMPORTANT: Les "Spécifications commandées" indiquent exactement la variante achetée (taille, couleur). Elles sont TRÈS FIABLES. Utilise-les en priorité pour déterminer la taille et la couleur, sauf si les photos prouvent indiscutablement le contraire (ex: une étiquette visible).

MISSION EN 2 ÉTAPES:

1. IDENTIFICATION DU PRODUIT:
   - Analyse les images pour identifier la marque, le modèle et le type de produit
   - Utilise les indices textuels (description vendeur) si disponibles

2. SÉLECTION DES IDS VINTED:
   - Utilise les tables de référence ci-dessous pour trouver le brand_id et catalog_id
   - Si la marque exacte n'est pas dans la table, cherche une variante proche ou mets 0
   - Si la catégorie exacte n'est pas dans la table, choisis la plus proche

TABLE DE RÉFÉRENCE - MARQUES VINTED (brand → vintedBrandId):
${brandsList}

TABLE DE RÉFÉRENCE - CATÉGORIES VINTED (category → vintedCatalogId):
${categoriesList}

RÉPONSE OBLIGATOIRE (JSON strict, sans markdown ni backticks):
{
  "name": "Marque + Modèle + Colorway",
  "brand": "Nom exact de la marque",
  "vintedBrandId": <ID depuis la table ci-dessus, 0 si absent>,
  "category": "Catégorie du produit",
  "subcategory": "Sous-catégorie si applicable",
  "vintedCatalogId": <ID depuis la table ci-dessus, 0 si absent>,
  "url": "URL vers le produit authentique",
  "source": "Comment tu as identifié le produit",
  "confidence": <0.0 à 1.0>,
  "productCode": "SKU ou code produit si trouvé",
  "retailPrice": "Prix retail estimé",
  "color": "Couleur principale",
  "size": "Taille si visible dans les images",
  "description": "Description vendeuse pour Vinted (2-3 phrases)"
}

RÈGLES STRICTES:
- Les IDs DOIVENT provenir des tables de référence ci-dessus
- Si la marque n'est pas dans la table, mets vintedBrandId: 0
- Si la catégorie n'est pas dans la table, mets vintedCatalogId: 0
- Base-toi PRINCIPALEMENT sur ce que tu VOIS dans les images
- Réponds UNIQUEMENT avec le JSON, rien d'autre`;
}
