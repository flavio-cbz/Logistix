/**
 * Service de gestion de la hiérarchie des catalogues Vinted
 * Assure que seules les catégories niveau 3 sont utilisées pour les analyses
 */

// Note: Logger removed for client-side compatibility
import { 
  VINTED_CATALOG_HIERARCHY, 
  PRODUCT_CATEGORY_MAPPING, 
  CATEGORY_VALIDATION_MESSAGES 
} from '@/lib/data/vinted-catalog-hierarchy';
import type {
  VintedCatalogHierarchy,
  VintedCatalogLevel1,
  VintedCatalogLevel2,
  VintedCatalogLevel3,
  VintedCatalogAny,
  CategoryPath,
  CategoryValidationResult,
  CategoryValidationError,
  ProductCategoryMapping
} from '@/lib/types/vinted-catalog-hierarchy';

export class VintedCatalogHierarchyService {
  private static instance: VintedCatalogHierarchyService;
  private hierarchy: VintedCatalogHierarchy;
  private level3Cache: Map<number, VintedCatalogLevel3> = new Map();
  private keywordIndex: Map<string, VintedCatalogLevel3[]> = new Map();

  private constructor() {
    this.hierarchy = VINTED_CATALOG_HIERARCHY;
    this.buildCaches();
  }

  public static getInstance(): VintedCatalogHierarchyService {
    if (!VintedCatalogHierarchyService.instance) {
      VintedCatalogHierarchyService.instance = new VintedCatalogHierarchyService();
    }
    return VintedCatalogHierarchyService.instance;
  }

  /**
   * Construit les caches pour optimiser les performances
   */
  private buildCaches(): void {
    // Construction des caches pour optimiser les performances
    
    // Cache des catégories niveau 3
    this.hierarchy.level1.forEach(level1 => {
      level1.children.forEach(level2 => {
        level2.children.forEach(level3 => {
          this.level3Cache.set(level3.id, level3);
          
          // Index des mots-clés
          level3.keywords.forEach(keyword => {
            const normalizedKeyword = keyword.toLowerCase();
            if (!this.keywordIndex.has(normalizedKeyword)) {
              this.keywordIndex.set(normalizedKeyword, []);
            }
            this.keywordIndex.get(normalizedKeyword)!.push(level3);
          });
        });
      });
    });

    // Cache construit avec ${this.level3Cache.size} catégories niveau 3
  }

  /**
   * Charge la hiérarchie complète
   */
  loadHierarchy(): VintedCatalogHierarchy {
    return this.hierarchy;
  }

  /**
   * Trouve toutes les catégories de niveau 3 pour un terme de recherche
   */
  findLevel3Categories(searchTerm: string): VintedCatalogLevel3[] {
    if (!searchTerm || searchTerm.length < 2) {
      return Array.from(this.level3Cache.values()).slice(0, 10); // Limiter les résultats
    }

    const normalizedTerm = searchTerm.toLowerCase().trim();
    const results = new Set<VintedCatalogLevel3>();

    // Recherche exacte dans les mots-clés
    if (this.keywordIndex.has(normalizedTerm)) {
      this.keywordIndex.get(normalizedTerm)!.forEach(cat => results.add(cat));
    }

    // Recherche partielle dans les mots-clés
    this.keywordIndex.forEach((categories, keyword) => {
      if (keyword.includes(normalizedTerm) || normalizedTerm.includes(keyword)) {
        categories.forEach(cat => results.add(cat));
      }
    });

    // Recherche dans les noms de catégories
    this.level3Cache.forEach(category => {
      if (category.name.toLowerCase().includes(normalizedTerm)) {
        results.add(category);
      }
    });

    return Array.from(results).sort((a, b) => {
      // Prioriser les correspondances exactes dans le nom
      const aExactMatch = a.name.toLowerCase() === normalizedTerm;
      const bExactMatch = b.name.toLowerCase() === normalizedTerm;
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      // Puis les correspondances dans le nom
      const aNameMatch = a.name.toLowerCase().includes(normalizedTerm);
      const bNameMatch = b.name.toLowerCase().includes(normalizedTerm);
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Obtient le chemin complet d'une catégorie (breadcrumb)
   */
  getCategoryPath(categoryId: number): string[] {
    const category = this.findCategoryById(categoryId);
    if (!category) {
      return [];
    }

    if (category.level === 1) {
      return [category.name];
    } else if (category.level === 2) {
      const level1 = this.findCategoryById(category.parentId);
      return level1 ? [level1.name, category.name] : [category.name];
    } else if (category.level === 3) {
      const level2 = this.findCategoryById(category.parentId);
      if (level2 && level2.level === 2) {
        const level1 = this.findCategoryById(level2.parentId);
        return level1 ? [level1.name, level2.name, category.name] : [level2.name, category.name];
      }
      return [category.name];
    }

    return [];
  }

  /**
   * Obtient le chemin complet avec les objets catégories
   */
  getCategoryFullPath(categoryId: number): CategoryPath | null {
    const level3 = this.level3Cache.get(categoryId);
    if (!level3) {
      return null;
    }

    const level2 = this.findLevel2ById(level3.parentId);
    if (!level2) {
      return null;
    }

    const level1 = this.findLevel1ById(level2.parentId);
    if (!level1) {
      return null;
    }

    return { level1, level2, level3 };
  }

  /**
   * Valide qu'une catégorie est de niveau 3 (compatible avec l'API)
   */
  isValidForAnalysis(categoryId: number): boolean {
    const category = this.level3Cache.get(categoryId);
    return category?.isValidForAnalysis === true;
  }

  /**
   * Suggère des catégories niveau 3 pour un produit
   */
  suggestLevel3ForProduct(productName: string): VintedCatalogLevel3[] {
    if (!productName || productName.length < 3) {
      return [];
    }

    const normalizedProduct = productName.toLowerCase();
    const suggestions = new Set<VintedCatalogLevel3>();

    // Recherche dans les mappings prédéfinis
    Object.entries(PRODUCT_CATEGORY_MAPPING).forEach(([key, mapping]) => {
      const keywordMatch = mapping.productKeywords.some(keyword => 
        normalizedProduct.includes(keyword.toLowerCase()) || 
        keyword.toLowerCase().includes(normalizedProduct)
      );

      if (keywordMatch) {
        mapping.suggestedCategories.forEach(categoryId => {
          const category = this.level3Cache.get(categoryId);
          if (category) {
            suggestions.add(category);
          }
        });
      }
    });

    // Si pas de mapping trouvé, recherche générale
    if (suggestions.size === 0) {
      const generalSuggestions = this.findLevel3Categories(productName);
      generalSuggestions.slice(0, 5).forEach(cat => suggestions.add(cat));
    }

    return Array.from(suggestions).sort((a, b) => {
      // Trier par priorité si disponible dans les mappings
      const aPriority = this.getCategoryPriority(a.id, normalizedProduct);
      const bPriority = this.getCategoryPriority(b.id, normalizedProduct);
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Obtient la priorité d'une catégorie pour un produit donné
   */
  private getCategoryPriority(categoryId: number, productName: string): number {
    for (const mapping of Object.values(PRODUCT_CATEGORY_MAPPING)) {
      if (mapping.suggestedCategories.includes(categoryId)) {
        const keywordMatch = mapping.productKeywords.some(keyword => 
          productName.includes(keyword.toLowerCase())
        );
        if (keywordMatch) {
          return mapping.priority;
        }
      }
    }
    return 3; // Priorité par défaut
  }

  /**
   * Trouve une catégorie par ID (tous niveaux)
   */
  findCategoryById(categoryId: number): VintedCatalogAny | null {
    // Recherche niveau 3 (plus fréquent)
    const level3 = this.level3Cache.get(categoryId);
    if (level3) {
      return level3;
    }

    // Recherche niveau 1 et 2
    for (const level1 of this.hierarchy.level1) {
      if (level1.id === categoryId) {
        return level1;
      }
      
      for (const level2 of level1.children) {
        if (level2.id === categoryId) {
          return level2;
        }
      }
    }

    return null;
  }

  /**
   * Trouve une catégorie niveau 1 par ID
   */
  private findLevel1ById(categoryId: number): VintedCatalogLevel1 | null {
    return this.hierarchy.level1.find(cat => cat.id === categoryId) || null;
  }

  /**
   * Trouve une catégorie niveau 2 par ID
   */
  private findLevel2ById(categoryId: number): VintedCatalogLevel2 | null {
    for (const level1 of this.hierarchy.level1) {
      const level2 = level1.children.find(cat => cat.id === categoryId);
      if (level2) {
        return level2;
      }
    }
    return null;
  }

  /**
   * Obtient toutes les catégories niveau 1
   */
  getLevel1Categories(): VintedCatalogLevel1[] {
    return this.hierarchy.level1;
  }

  /**
   * Obtient les catégories niveau 2 d'un parent niveau 1
   */
  getLevel2Categories(parentId: number): VintedCatalogLevel2[] {
    const level1 = this.findLevel1ById(parentId);
    return level1?.children || [];
  }

  /**
   * Obtient les catégories niveau 3 d'un parent niveau 2
   */
  getLevel3Categories(parentId: number): VintedCatalogLevel3[] {
    const level2 = this.findLevel2ById(parentId);
    return level2?.children || [];
  }

  /**
   * Obtient toutes les catégories niveau 3
   */
  getAllLevel3Categories(): VintedCatalogLevel3[] {
    return Array.from(this.level3Cache.values());
  }

  /**
   * Valide une catégorie et retourne le résultat détaillé
   */
  validateCategory(categoryId: number): CategoryValidationResult {
    const category = this.findCategoryById(categoryId);
    
    if (!category) {
      return {
        isValid: false,
        level: 1,
        message: CATEGORY_VALIDATION_MESSAGES.NOT_FOUND,
        suggestions: this.getAllLevel3Categories().slice(0, 5)
      };
    }

    if (category.level === 3) {
      return {
        isValid: true,
        level: 3,
        message: "Catégorie valide pour l'analyse",
        suggestions: [],
        category
      };
    }

    // Catégorie niveau 1 ou 2 - suggérer des alternatives niveau 3
    const suggestions = this.getSuggestionsForCategory(category);
    
    return {
      isValid: false,
      level: category.level as 1 | 2,
      message: CATEGORY_VALIDATION_MESSAGES.INVALID_LEVEL,
      suggestions,
      category
    };
  }

  /**
   * Obtient des suggestions de catégories niveau 3 pour une catégorie donnée
   */
  private getSuggestionsForCategory(category: VintedCatalogAny): VintedCatalogLevel3[] {
    if (category.level === 1) {
      // Retourner toutes les catégories niveau 3 de ce niveau 1
      const level1 = category as VintedCatalogLevel1;
      const suggestions: VintedCatalogLevel3[] = [];
      level1.children.forEach(level2 => {
        suggestions.push(...level2.children);
      });
      return suggestions.slice(0, 8); // Limiter à 8 suggestions
    } else if (category.level === 2) {
      // Retourner les catégories niveau 3 de ce niveau 2
      const level2 = category as VintedCatalogLevel2;
      return level2.children.slice(0, 8);
    }
    
    return [];
  }

  /**
   * Recherche intelligente avec suggestions automatiques
   */
  smartSearch(query: string): {
    exact: VintedCatalogLevel3[];
    suggestions: VintedCatalogLevel3[];
    popular: VintedCatalogLevel3[];
  } {
    const exact = this.findLevel3Categories(query);
    const suggestions = this.suggestLevel3ForProduct(query);
    
    // Catégories populaires (basées sur les mappings)
    const popular = Object.values(PRODUCT_CATEGORY_MAPPING)
      .filter(mapping => mapping.priority === 1)
      .flatMap(mapping => mapping.suggestedCategories)
      .map(id => this.level3Cache.get(id))
      .filter((cat): cat is VintedCatalogLevel3 => cat !== undefined)
      .slice(0, 6);

    return { exact, suggestions, popular };
  }

  /**
   * Statistiques du service
   */
  getStats(): {
    totalLevel1: number;
    totalLevel2: number;
    totalLevel3: number;
    totalKeywords: number;
    cacheSize: number;
  } {
    let totalLevel2 = 0;
    this.hierarchy.level1.forEach(level1 => {
      totalLevel2 += level1.children.length;
    });

    return {
      totalLevel1: this.hierarchy.level1.length,
      totalLevel2,
      totalLevel3: this.level3Cache.size,
      totalKeywords: this.keywordIndex.size,
      cacheSize: this.level3Cache.size
    };
  }
}

// Export de l'instance singleton
export const vintedCatalogHierarchyService = VintedCatalogHierarchyService.getInstance();