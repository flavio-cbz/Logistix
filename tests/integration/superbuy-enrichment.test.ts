<<<<<<< HEAD
/**
 * Test integration for Vinted ID lookup service
 * Run with: npx vitest run tests/integration/superbuy-enrichment.test.ts
 * Or: npx tsx tests/integration/superbuy-enrichment.test.ts
 */
import { databaseService } from '../../lib/database/database-service';
import { products } from '../../lib/database/schema';
import { eq, desc } from 'drizzle-orm';
import { decryptSecret } from '../../lib/utils/crypto';
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import vintedMappings from '../../lib/data/vinted-mappings.json';

interface SuperbuyMetadata {
    goodsName?: string;
    itemRemark?: string;
}

interface TestCase {
    name: string;
    description: string;
    productName: string;
    superbuyMetadata: SuperbuyMetadata;
    imageUrls: string[];
    expectedBrand?: string;
    expectedBrandId?: number;
    expectedCatalogId?: number;
}

function buildPrompt(fallbackName: string, imageCount: number, superbuyMetadata?: SuperbuyMetadata): string {
    let contextSection = `CONTEXTE:
- ${imageCount} photo(s) QC d'un produit acheté via Superbuy
- Ces photos montrent le produit réel reçu à l'entrepôt
- Référence Superbuy: "${fallbackName}"`;

    if (superbuyMetadata?.goodsName) {
        contextSection += `\n- Description vendeur: "${superbuyMetadata.goodsName}"`;
    }
    if (superbuyMetadata?.itemRemark) {
        contextSection += `\n- Spécifications: "${superbuyMetadata.itemRemark}"`;
    }

    // Generate mappings from JSON file
    const brandsList = Object.entries(vintedMappings.brands)
        .map(([name, id]) => `${name}=${id}`)
        .join(', ');

    const categoriesList = Object.entries(vintedMappings.categories)
        .map(([name, id]) => `${name}=${id}`)
        .join(', ');

    return `Tu es un expert en identification de produits pour la revente sur VINTED.

${contextSection}

MISSION EN 2 ÉTAPES:

1. IDENTIFICATION DU PRODUIT:
   - Analyse les images pour identifier la marque et le type de produit

2. SÉLECTION DES IDS VINTED:
   - Utilise les tables de référence ci-dessous pour trouver le brand_id et catalog_id

TABLE DE RÉFÉRENCE - MARQUES (brand → vintedBrandId):
${brandsList}

TABLE DE RÉFÉRENCE - CATÉGORIES (category → vintedCatalogId):
${categoriesList}

RÉPONSE (JSON strict, sans backticks):
{
  "name": "Marque + Modèle",
  "brand": "Nom de la marque",
  "vintedBrandId": <ID depuis la table, 0 si absent>,
  "category": "Catégorie",
  "subcategory": "Sous-catégorie si applicable",
  "vintedCatalogId": <ID depuis la table, 0 si absent>,
  "url": "URL produit authentique",
  "source": "Comment tu as identifié",
  "confidence": <0.0 à 1.0>,
  "productCode": "SKU si trouvé",
  "retailPrice": "Prix estimé",
  "color": "Couleur",
  "size": "Taille si visible",
  "description": "Description Vinted (2-3 phrases)"
}

RÈGLES:
- Les IDs DOIVENT provenir des tables ci-dessus
- Si absent de la table, mets 0
- Réponds UNIQUEMENT avec le JSON`;
}

async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
    try {
        const response = await fetch(imageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*' },
            redirect: 'follow',
        });
        if (!response.ok) return null;
        const buffer = await response.arrayBuffer();
        return { data: Buffer.from(buffer).toString("base64"), mimeType: response.headers.get("content-type")?.split(";")[0] || "image/jpeg" };
    } catch {
        return null;
    }
}

async function runTest(testCase: TestCase, genAI: GoogleGenerativeAI, model: string) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`🧪 TEST: ${testCase.name}`);
    console.log(`   ${testCase.description}`);
    console.log("=".repeat(80));

    const prompt = buildPrompt(testCase.productName, testCase.imageUrls.length, testCase.superbuyMetadata);

    console.log(`\n📝 Métadonnées: goodsName="${testCase.superbuyMetadata.goodsName || '(vide)'}", itemRemark="${testCase.superbuyMetadata.itemRemark || '(vide)'}"`);

    const geminiModel = genAI.getGenerativeModel({ model, tools: [{ googleSearch: {} } as any] });
    const parts: Part[] = [];
    let successfulImages = 0;

    console.log(`📷 Chargement des images...`);
    for (const url of testCase.imageUrls.slice(0, 4)) {
        const imageData = await fetchImageAsBase64(url);
        if (imageData) {
            parts.push({ inlineData: { data: imageData.data, mimeType: imageData.mimeType } });
            successfulImages++;
        }
    }
    console.log(`✅ ${successfulImages}/${testCase.imageUrls.length} images chargées`);

    if (successfulImages === 0) return { success: false, error: "No images" };

    parts.push({ text: prompt });

    console.log(`\n⏳ Envoi au LLM...`);
    const result = await geminiModel.generateContent({ contents: [{ role: "user", parts }] });
    const responseText = result.response.text();

    console.log(`\n🤖 RÉPONSE LLM:`);
    console.log(responseText);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        console.log(`\n📊 RÉSULTAT:`);
        console.log(`   - Name: ${parsed.name}`);
        console.log(`   - Brand: ${parsed.brand} (vintedBrandId: ${parsed.vintedBrandId})`);
        console.log(`   - Category: ${parsed.category} (vintedCatalogId: ${parsed.vintedCatalogId})`);
        console.log(`   - Confidence: ${parsed.confidence}`);

        let allPassed = true;
        if (testCase.expectedBrandId !== undefined) {
            const pass = parsed.vintedBrandId === testCase.expectedBrandId;
            console.log(`   ✓ BrandId expected ${testCase.expectedBrandId}: ${pass ? '✅ PASS' : `❌ FAIL (got ${parsed.vintedBrandId})`}`);
            if (!pass) allPassed = false;
        }
        if (testCase.expectedCatalogId !== undefined) {
            const pass = parsed.vintedCatalogId === testCase.expectedCatalogId;
            console.log(`   ✓ CatalogId expected ${testCase.expectedCatalogId}: ${pass ? '✅ PASS' : `❌ FAIL (got ${parsed.vintedCatalogId})`}`);
            if (!pass) allPassed = false;
        }

        return { success: allPassed, result: parsed };
    }

    return { success: false, error: "JSON parse failed" };
}

const TEST_CASES: TestCase[] = [
    {
        name: "Parfum Hermès Terre d'Hermès",
        description: "Vérification avec table de référence: Hermès=4785, Parfums=145",
        productName: "SB_PARFUM_001",
        superbuyMetadata: { goodsName: "High quality fragrance", itemRemark: "Terre d'Hermes EDT 100ml" },
        imageUrls: ["https://m.media-amazon.com/images/I/51ZwFg3PHLL._AC_SX300_SY300_QL70_ML2_.jpg"],
        expectedBrand: "Hermès",
        expectedBrandId: 4785,
        expectedCatalogId: 145,
    },
];

async function main() {
    console.log("🔍 Test enrichissement avec TABLE DE RÉFÉRENCE JSON\n");
    console.log("=".repeat(80));
    console.log("Cette version utilise lib/data/vinted-mappings.json");
    console.log(`📊 ${Object.keys(vintedMappings.brands).length} marques, ${Object.keys(vintedMappings.categories).length} catégories`);
    console.log("=".repeat(80));

    const db = await databaseService.getDb();
    const adminUser = await db.query.users.findFirst();
    if (!adminUser) { console.error("❌ No user"); process.exit(1); }

    const cred = await db.query.integrationCredentials.findFirst({
        where: (t: any, { eq, and }: any) => and(eq(t.userId, adminUser.id), eq(t.provider, "gemini"))
    });
    if (!cred?.credentials) { console.error("❌ No Gemini key"); process.exit(1); }

    const apiKey = await decryptSecret((cred.credentials as any).apiKey, adminUser.id);
    const model = (cred.credentials as any).model || "gemini-2.5-flash";
    console.log(`\n👤 User: ${adminUser.username}`);
    console.log(`🤖 Model: ${model}`);

    const genAI = new GoogleGenerativeAI(apiKey);

    // Test real product
    console.log(`\n\n${"#".repeat(80)}`);
    console.log("# PRODUIT RÉEL DE LA BASE");
    console.log("#".repeat(80));

    const realProduct = await db.query.products.findFirst({
        where: eq(products.userId, adminUser.id),
        orderBy: [desc(products.createdAt)]
    });

    if (realProduct) {
        const photoUrls = (realProduct.photoUrls as string[]) || [realProduct.photoUrl].filter(Boolean);
        if (photoUrls.length > 0) {
            await runTest({
                name: "Produit réel",
                description: `ID: ${realProduct.id}`,
                productName: realProduct.name,
                superbuyMetadata: { goodsName: realProduct.brand || undefined, itemRemark: realProduct.subcategory || undefined },
                imageUrls: photoUrls,
            }, genAI, model);
        }
    }

    // Test fictitious
    console.log(`\n\n${"#".repeat(80)}`);
    console.log("# TESTS FICTIFS");
    console.log("#".repeat(80));

    const results: { name: string; success: boolean; error?: string }[] = [];
    for (const tc of TEST_CASES) {
        const result = await runTest(tc, genAI, model);
        results.push({ name: tc.name, success: result.success, error: result.error });
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`\n\n${"#".repeat(80)}`);
    console.log("# RÉSUMÉ");
    console.log("#".repeat(80));
    results.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.success ? '✅' : '❌'} ${r.name}${r.error ? ` - ${r.error}` : ''}`);
    });

    const passed = results.filter(r => r.success).length;
    console.log(`\n📈 Score: ${passed}/${results.length} tests réussis`);
    console.log("\n✨ Tests terminés!");
    process.exit(0);
}

main().catch(console.error);
=======
/**
 * Test integration for Vinted ID lookup service
 * Run with: npx vitest run tests/integration/superbuy-enrichment.test.ts
 * Or: npx tsx tests/integration/superbuy-enrichment.test.ts
 */
import { databaseService } from '../../lib/database/database-service';
import { products } from '../../lib/database/schema';
import { eq, desc } from 'drizzle-orm';
import { decryptSecret } from '../../lib/utils/crypto';
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import vintedMappings from '../../lib/data/vinted-mappings.json';

interface SuperbuyMetadata {
    goodsName?: string;
    itemRemark?: string;
}

interface TestCase {
    name: string;
    description: string;
    productName: string;
    superbuyMetadata: SuperbuyMetadata;
    imageUrls: string[];
    expectedBrand?: string;
    expectedBrandId?: number;
    expectedCatalogId?: number;
}

function buildPrompt(fallbackName: string, imageCount: number, superbuyMetadata?: SuperbuyMetadata): string {
    let contextSection = `CONTEXTE:
- ${imageCount} photo(s) QC d'un produit acheté via Superbuy
- Ces photos montrent le produit réel reçu à l'entrepôt
- Référence Superbuy: "${fallbackName}"`;

    if (superbuyMetadata?.goodsName) {
        contextSection += `\n- Description vendeur: "${superbuyMetadata.goodsName}"`;
    }
    if (superbuyMetadata?.itemRemark) {
        contextSection += `\n- Spécifications: "${superbuyMetadata.itemRemark}"`;
    }

    // Generate mappings from JSON file
    const brandsList = Object.entries(vintedMappings.brands)
        .map(([name, id]) => `${name}=${id}`)
        .join(', ');

    const categoriesList = Object.entries(vintedMappings.categories)
        .map(([name, id]) => `${name}=${id}`)
        .join(', ');

    return `Tu es un expert en identification de produits pour la revente sur VINTED.

${contextSection}

MISSION EN 2 ÉTAPES:

1. IDENTIFICATION DU PRODUIT:
   - Analyse les images pour identifier la marque et le type de produit

2. SÉLECTION DES IDS VINTED:
   - Utilise les tables de référence ci-dessous pour trouver le brand_id et catalog_id

TABLE DE RÉFÉRENCE - MARQUES (brand → vintedBrandId):
${brandsList}

TABLE DE RÉFÉRENCE - CATÉGORIES (category → vintedCatalogId):
${categoriesList}

RÉPONSE (JSON strict, sans backticks):
{
  "name": "Marque + Modèle",
  "brand": "Nom de la marque",
  "vintedBrandId": <ID depuis la table, 0 si absent>,
  "category": "Catégorie",
  "subcategory": "Sous-catégorie si applicable",
  "vintedCatalogId": <ID depuis la table, 0 si absent>,
  "url": "URL produit authentique",
  "source": "Comment tu as identifié",
  "confidence": <0.0 à 1.0>,
  "productCode": "SKU si trouvé",
  "retailPrice": "Prix estimé",
  "color": "Couleur",
  "size": "Taille si visible",
  "description": "Description Vinted (2-3 phrases)"
}

RÈGLES:
- Les IDs DOIVENT provenir des tables ci-dessus
- Si absent de la table, mets 0
- Réponds UNIQUEMENT avec le JSON`;
}

async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
    try {
        const response = await fetch(imageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*' },
            redirect: 'follow',
        });
        if (!response.ok) return null;
        const buffer = await response.arrayBuffer();
        return { data: Buffer.from(buffer).toString("base64"), mimeType: response.headers.get("content-type")?.split(";")[0] || "image/jpeg" };
    } catch {
        return null;
    }
}

async function runTest(testCase: TestCase, genAI: GoogleGenerativeAI, model: string) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`🧪 TEST: ${testCase.name}`);
    console.log(`   ${testCase.description}`);
    console.log("=".repeat(80));

    const prompt = buildPrompt(testCase.productName, testCase.imageUrls.length, testCase.superbuyMetadata);

    console.log(`\n📝 Métadonnées: goodsName="${testCase.superbuyMetadata.goodsName || '(vide)'}", itemRemark="${testCase.superbuyMetadata.itemRemark || '(vide)'}"`);

    const geminiModel = genAI.getGenerativeModel({ model, tools: [{ googleSearch: {} } as any] });
    const parts: Part[] = [];
    let successfulImages = 0;

    console.log(`📷 Chargement des images...`);
    for (const url of testCase.imageUrls.slice(0, 4)) {
        const imageData = await fetchImageAsBase64(url);
        if (imageData) {
            parts.push({ inlineData: { data: imageData.data, mimeType: imageData.mimeType } });
            successfulImages++;
        }
    }
    console.log(`✅ ${successfulImages}/${testCase.imageUrls.length} images chargées`);

    if (successfulImages === 0) return { success: false, error: "No images" };

    parts.push({ text: prompt });

    console.log(`\n⏳ Envoi au LLM...`);
    const result = await geminiModel.generateContent({ contents: [{ role: "user", parts }] });
    const responseText = result.response.text();

    console.log(`\n🤖 RÉPONSE LLM:`);
    console.log(responseText);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        console.log(`\n📊 RÉSULTAT:`);
        console.log(`   - Name: ${parsed.name}`);
        console.log(`   - Brand: ${parsed.brand} (vintedBrandId: ${parsed.vintedBrandId})`);
        console.log(`   - Category: ${parsed.category} (vintedCatalogId: ${parsed.vintedCatalogId})`);
        console.log(`   - Confidence: ${parsed.confidence}`);

        let allPassed = true;
        if (testCase.expectedBrandId !== undefined) {
            const pass = parsed.vintedBrandId === testCase.expectedBrandId;
            console.log(`   ✓ BrandId expected ${testCase.expectedBrandId}: ${pass ? '✅ PASS' : `❌ FAIL (got ${parsed.vintedBrandId})`}`);
            if (!pass) allPassed = false;
        }
        if (testCase.expectedCatalogId !== undefined) {
            const pass = parsed.vintedCatalogId === testCase.expectedCatalogId;
            console.log(`   ✓ CatalogId expected ${testCase.expectedCatalogId}: ${pass ? '✅ PASS' : `❌ FAIL (got ${parsed.vintedCatalogId})`}`);
            if (!pass) allPassed = false;
        }

        return { success: allPassed, result: parsed };
    }

    return { success: false, error: "JSON parse failed" };
}

const TEST_CASES: TestCase[] = [
    {
        name: "Parfum Hermès Terre d'Hermès",
        description: "Vérification avec table de référence: Hermès=4785, Parfums=145",
        productName: "SB_PARFUM_001",
        superbuyMetadata: { goodsName: "High quality fragrance", itemRemark: "Terre d'Hermes EDT 100ml" },
        imageUrls: ["https://m.media-amazon.com/images/I/51ZwFg3PHLL._AC_SX300_SY300_QL70_ML2_.jpg"],
        expectedBrand: "Hermès",
        expectedBrandId: 4785,
        expectedCatalogId: 145,
    },
];

async function main() {
    console.log("🔍 Test enrichissement avec TABLE DE RÉFÉRENCE JSON\n");
    console.log("=".repeat(80));
    console.log("Cette version utilise lib/data/vinted-mappings.json");
    console.log(`📊 ${Object.keys(vintedMappings.brands).length} marques, ${Object.keys(vintedMappings.categories).length} catégories`);
    console.log("=".repeat(80));

    const db = await databaseService.getDb();
    const adminUser = await db.query.users.findFirst();
    if (!adminUser) { console.error("❌ No user"); process.exit(1); }

    const cred = await db.query.integrationCredentials.findFirst({
        where: (t: any, { eq, and }: any) => and(eq(t.userId, adminUser.id), eq(t.provider, "gemini"))
    });
    if (!cred?.credentials) { console.error("❌ No Gemini key"); process.exit(1); }

    const apiKey = await decryptSecret((cred.credentials as any).apiKey, adminUser.id);
    const model = (cred.credentials as any).model || "gemini-2.5-flash";
    console.log(`\n👤 User: ${adminUser.username}`);
    console.log(`🤖 Model: ${model}`);

    const genAI = new GoogleGenerativeAI(apiKey);

    // Test real product
    console.log(`\n\n${"#".repeat(80)}`);
    console.log("# PRODUIT RÉEL DE LA BASE");
    console.log("#".repeat(80));

    const realProduct = await db.query.products.findFirst({
        where: eq(products.userId, adminUser.id),
        orderBy: [desc(products.createdAt)]
    });

    if (realProduct) {
        const photoUrls = (realProduct.photoUrls as string[]) || [realProduct.photoUrl].filter(Boolean);
        if (photoUrls.length > 0) {
            await runTest({
                name: "Produit réel",
                description: `ID: ${realProduct.id}`,
                productName: realProduct.name,
                superbuyMetadata: { goodsName: realProduct.brand || undefined, itemRemark: realProduct.subcategory || undefined },
                imageUrls: photoUrls,
            }, genAI, model);
        }
    }

    // Test fictitious
    console.log(`\n\n${"#".repeat(80)}`);
    console.log("# TESTS FICTIFS");
    console.log("#".repeat(80));

    const results: { name: string; success: boolean; error?: string }[] = [];
    for (const tc of TEST_CASES) {
        const result = await runTest(tc, genAI, model);
        results.push({ name: tc.name, success: result.success, error: result.error });
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`\n\n${"#".repeat(80)}`);
    console.log("# RÉSUMÉ");
    console.log("#".repeat(80));
    results.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.success ? '✅' : '❌'} ${r.name}${r.error ? ` - ${r.error}` : ''}`);
    });

    const passed = results.filter(r => r.success).length;
    console.log(`\n📈 Score: ${passed}/${results.length} tests réussis`);
    console.log("\n✨ Tests terminés!");
    process.exit(0);
}

main().catch(console.error);
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
