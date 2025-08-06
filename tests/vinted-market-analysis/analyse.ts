import axios from 'axios';
import { z } from 'zod';
import { URLSearchParams } from 'url';
import * as fs from 'fs';
import * as path from 'path';

// --- Gestion des logs ---
const args = process.argv.slice(2);
const isQuiet = args.includes('--quiet');

const logger = {
    log: (...args: any[]) => !isQuiet && console.log(...args),
    error: (...args: any[]) => console.error(...args),
    info: (...args: any[]) => !isQuiet && console.info(...args),
    warn: (...args: any[]) => !isQuiet && console.warn(...args),
};

// --- Schémas de validation avec Zod ---
const CatalogSchema = z.object({
    id: z.number(),
    title: z.string(),
    catalogs: z.array(z.lazy(() => CatalogSchema)).optional(),
});

const SoldItemSchema = z.object({
    title: z.string(),
    price: z.object({
        amount: z.string(),
    }),
});

const SuggestionBrandSchema = z.object({
    id: z.number(),
    title: z.string(),
});

const SuggestionsResponseSchema = z.object({
    brands: z.array(SuggestionBrandSchema),
});

const ApiResponseSoldItemsSchema = z.object({ items: z.array(SoldItemSchema) });
const InitializersResponseSchema = z.object({
    dtos: z.object({
        catalogs: z.array(CatalogSchema),
    }),
});

type SoldItem = z.infer<typeof SoldItemSchema>;
type Catalog = z.infer<typeof CatalogSchema>;

// --- Constantes API ---
const VINTED_API_BASE = 'https://www.vinted.fr/api/v2';
const SOLD_ITEMS_URL = `${VINTED_API_BASE}/item_upload/items/similar_sold_items`;
const SUGGESTIONS_URL = `${VINTED_API_BASE}/items/suggestions`;

// --- Gestion des erreurs ---
class ApiError extends Error {
    constructor(message: string, public status?: number) {
        super(message);
        this.name = 'ApiError';
    }
}

class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

function handleAxiosError(error: any, context: string): never {
    if (error && error.isAxiosError) {
        const axiosError = error;
        if (axiosError.response) {
            const { status, statusText } = axiosError.response;
            throw new ApiError(`Erreur API ${context} (status: ${status} ${statusText})`, status);
        } else if (axiosError.code === 'ECONNABORTED') {
            throw new ApiError(`Timeout de la requête ${context}`);
        } else {
            throw new ApiError(`Erreur réseau ${context}: ${axiosError.message}`);
        }
    }
    throw new Error(`Erreur inattendue ${context}: ${error && error.message}`);
}

function findCatalogsInTree(catalogs: Catalog[], categoryName: string): Catalog[] {
    let results: Catalog[] = [];
    const lowerCaseCategoryName = categoryName.toLowerCase();

    function search(catalogsToSearch: Catalog[]) {
        for (const catalog of catalogsToSearch) {
            if (catalog.title.toLowerCase() === lowerCaseCategoryName) {
                results.push({ id: catalog.id, title: catalog.title });
            }
            if (catalog.catalogs && catalog.catalogs.length > 0) {
                search(catalog.catalogs);
            }
        }
    }

    search(catalogs);
    return results;
}

async function getSuggestedBrandId(title: string, catalogId: number, headers: any): Promise<number> {
    const params = new URLSearchParams({
        title: title,
        catalog_id: catalogId.toString(),
        description: '',
        'photo_ids[]': '',
        upload_session_id: '',
    });
    const url = `${SUGGESTIONS_URL}?${params.toString()}`;
    logger.info(`  -> Appel de l'URL de suggestion : ${url}`);
    try {
        const response = await axios.get(url, { headers, timeout: 10000 });
        const parsed = SuggestionsResponseSchema.safeParse(response.data);
        if (!parsed.success || parsed.data.brands.length === 0) {
            throw new ValidationError(`Aucune marque suggérée trouvée pour le titre "${title}"`);
        }
        return parsed.data.brands[0].id;
    } catch (error) {
        handleAxiosError(error, `lors de la récupération des suggestions de marque`);
    }
}

async function getSoldItems(brandId: number, catalogId: number, headers: any): Promise<SoldItem[]> {
    let allItems: SoldItem[] = [];
    const ITEMS_PER_PAGE = 20;
    const MAX_PAGES_TO_FETCH = 5;

    for (let page = 1; page <= MAX_PAGES_TO_FETCH; page++) {
        const params = { brand_id: brandId.toString(), catalog_id: catalogId.toString(), status_id: '6', page: page.toString(), per_page: ITEMS_PER_PAGE.toString() };
        const url = `${SOLD_ITEMS_URL}?${new URLSearchParams(params).toString()}`;
        logger.info(`  -> Appel de l'URL : ${url}`);
        try {
            const response = await axios.get(url, { headers, timeout: 15000 });
            const parsed = ApiResponseSoldItemsSchema.safeParse(response.data);
            if (!parsed.success || parsed.data.items.length === 0) break;
            allItems = allItems.concat(parsed.data.items);
        } catch (error) {
            handleAxiosError(error, `lors de la récupération de la page ${page} des articles vendus`);
        }
    }
    return allItems;
}

function getConfig() {
    const productNameArg = args.find(arg => arg.startsWith('--product_name='));
    const categoryNameArg = args.find(arg => arg.startsWith('--category_name='));
    const catalogIdArg = args.find(arg => arg.startsWith('--catalog_id='));
    const tokenArg = args.find(arg => arg.startsWith('--token='));

    const productName = process.env.PRODUCT_NAME || (productNameArg ? productNameArg.split('=')[1] : undefined);
    const categoryName = process.env.CATEGORY_NAME || (categoryNameArg ? categoryNameArg.split('=')[1] : undefined);
    const catalogId = process.env.CATALOG_ID || (catalogIdArg ? catalogIdArg.split('=')[1] : undefined);
    const bearerToken = process.env.VINTED_TOKEN || (tokenArg ? tokenArg.split('=')[1] : undefined);

    if ((!productName || (!categoryName && !catalogId)) || !bearerToken) {
        logger.error("Erreur: --product_name, --token et (--category_name ou --catalog_id) sont requis.");
        logger.error("Utilisation:");
        logger.error("  Étape 1: ts-node analyse.ts --product_name=\"...\" --category_name=\"...\" --token=...");
        logger.error("  Étape 2 (si nécessaire): ts-node analyse.ts --product_name=\"...\" --catalog_id=... --token=...");
        process.exit(1);
    }
    return { productName, categoryName, catalogId: catalogId ? parseInt(catalogId) : undefined, bearerToken };
}

async function main() {
    const { productName, categoryName, bearerToken } = getConfig();
    let { catalogId } = getConfig();

    const headers = {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    try {
        if (!catalogId) {
            if (!categoryName) {
                 logger.error("Le nom de la catégorie est requis si l'ID n'est pas fourni.");
                 process.exit(1);
            }
            
            const catalogFile = path.join(__dirname, 'catalogs.json');
            if (!fs.existsSync(catalogFile)) {
                logger.error(`Le fichier catalogs.json est introuvable. Veuillez d'abord le générer.`);
                logger.error(`(La logique pour le générer a été retirée, veuillez me demander de la remettre si besoin)`);
                process.exit(1);
            }

            const catalogData = JSON.parse(fs.readFileSync(catalogFile, 'utf-8'));
            const parsedCatalogs = InitializersResponseSchema.safeParse(catalogData);

            if (!parsedCatalogs.success) {
                logger.error("Le fichier catalogs.json est corrompu ou a un format inattendu.");
                process.exit(1);
            }

            logger.info(`1. Recherche de la catégorie "${categoryName}" dans l'arbre local...`);
            const catalogs = findCatalogsInTree(parsedCatalogs.data.dtos.catalogs, categoryName);

            if (catalogs.length === 0) {
                logger.error(`Aucune catégorie trouvée pour "${categoryName}".`);
                process.exit(1);
            } else if (catalogs.length > 1) {
                logger.warn(`Plusieurs catégories trouvées pour "${categoryName}". Veuillez préciser :`);
                catalogs.forEach(c => logger.warn(`  - ${c.title} (ID: ${c.id})`));
                logger.warn(`\nRelancez la commande en utilisant l'argument --catalog_id=ID_CHOISI`);
                process.exit(0);
            }
            catalogId = catalogs[0].id;
            logger.info(`   -> Catégorie trouvée : ${catalogs[0].title} (ID: ${catalogId})`);
        }

        logger.info(`2. Recherche de l'ID de marque suggéré pour "${productName}"...`);
        const brandId = await getSuggestedBrandId(productName!, catalogId, headers);
        logger.info(`   -> ID de marque suggéré trouvé : ${brandId}`);

        logger.info(`3. Récupération des articles vendus...`);
        const soldItems = await getSoldItems(brandId, catalogId, headers);
        
        if (soldItems.length === 0) {
            logger.warn("Aucun article vendu trouvé pour ces critères. Retour de zéro.");
            console.log("\n--- RÉSULTAT FINAL ---");
            console.log(`Volume de ventes analysé : 0`);
            console.log(`Prix de vente moyen : 0 €`);
            return;
        }

        const salesVolume = soldItems.length;
        const totalPrice = soldItems.reduce((sum, item) => sum + parseFloat(item.price.amount), 0);
        const avgPrice = salesVolume > 0 ? totalPrice / salesVolume : 0;
        
        const result = { salesVolume, avgPrice: parseFloat(avgPrice.toFixed(2)) };

        console.log("\n--- RÉSULTAT FINAL ---");
        console.log(`Volume de ventes analysé : ${result.salesVolume}`);
        console.log(`Prix de vente moyen : ${result.avgPrice} €`);

    } catch (e: any) {
        logger.error(`\nL'exécution du script a échoué: [${e.name}] ${e.message}`);
        process.exit(1);
    }
}

main();
