import { getLogger } from '@/lib/utils/logging/simple-logger';

const logger = getLogger('CategoryValidationServiceMock');

/**
 * Interface pour la structure d'une catégorie.
 */
interface Category {
  id: string;
  name: string;
  type: 'clothing' | 'electronics' | 'home'; // Exemple de types de catégorie
  min_price?: number;
  max_price?: number;
}

/**
 * Données de catégorie mockées pour la validation.
 */
const categoriesData: Category[] = [
  { id: '1', name: 'T-shirts', type: 'clothing', min_price: 5, max_price: 50 },
  { id: '2', name: 'Smartphones', type: 'electronics', min_price: 100, max_price: 1000 },
  { id: '3', name: 'Meubles', type: 'home', min_price: 20, max_price: 500 },
  { id: '4', name: 'Livres', type: 'home' },
];

/**
 * Service mock pour la validation des catégories.
 * Simule les appels API ou DB pour la validation et la récupération des détails de catégorie.
 */
export const categoryValidationServiceMock = {
  /**
   * Valide si une catégorie existe et est valide.
   * @param categoryId L'ID de la catégorie à valider.
   * @returns Vrai si la catégorie est valide, faux sinon.
   */
  async validateCategory(categoryId: string): Promise<boolean> {
    logger.info(`Validating category: ${categoryId}`);
    // Simuler un délai asynchrone
    await new Promise(resolve => setTimeout(resolve, 100));
    const isValid = categoriesData.some(cat => cat.id === categoryId);
    if (!isValid) {
      logger.warn(`Category with ID ${categoryId} not found.`);
    }
    return isValid;
  },

  /**
   * Récupère les détails d'une catégorie par son ID.
   * @param categoryId L'ID de la catégorie.
   * @returns Les détails de la catégorie ou null si non trouvée.
   */
  async getCategoryDetails(categoryId: string): Promise<Category | null> {
    logger.info(`Fetching details for category: ${categoryId}`);
    // Simuler un délai asynchrone
    await new Promise(resolve => setTimeout(resolve, 150));
    const category = categoriesData.find(cat => cat.id === categoryId);
    if (!category) {
      logger.warn(`Details for category ID ${categoryId} not found.`);
      return null;
    }
    return category;
  },

  /**
   * Simule la recherche de catégories par nom.
   * @param query La chaîne de recherche.
   * @returns Un tableau de catégories correspondantes.
   */
  async searchCategories(query: string): Promise<Category[]> {
    logger.info(`Searching categories for query: "${query}"`);
    await new Promise(resolve => setTimeout(resolve, 200));
    const lowerCaseQuery = query.toLowerCase();
    return categoriesData.filter(cat => cat.name.toLowerCase().includes(lowerCaseQuery));
  },

  /**
   * Simule la récupération de toutes les catégories.
   * @returns Un tableau de toutes les catégories.
   */
  async getAllCategories(): Promise<Category[]> {
    logger.info('Fetching all categories.');
    await new Promise(resolve => setTimeout(resolve, 100));
    return categoriesData;
  },
};