/**
 * Service de validation des catégories Vinted
 * Valide que les catégories sélectionnées sont de niveau 3 minimum
 * et fournit des suggestions alternatives avec messages d'erreur explicites
 */

// Note: Logger removed for client-side compatibility
import { vintedCatalogHierarchyService } from '@/lib/services/vinted-catalog-hierarchy';
import { CATEGORY_VALIDATION_MESSAGES } from '@/lib/data/vinted-catalog-hierarchy';
import type {
  VintedCatalogLevel3,
  VintedCatalogAny,
  CategoryValidationResult
} from '@/lib/types/vinted-catalog-hierarchy';
import { CategoryValidationError } from '@/lib/types/vinted-catalog-hierarchy';

export interface ValidationResult {
  isValid: boolean;
  level: number;
  message: string;
  suggestions: VintedCatalogLevel3[];
  userAction: string;
  category?: VintedCatalogAny;
  errorCode?: CategoryValidationError;
}

export interface ValidationOptions {
  includeAlternatives?: boolean;
  maxSuggestions?: number;
  productContext?: string;
}

export class CategoryValidationService {
  private static instance: CategoryValidationService;
  private hierarchyService = vintedCatalogHierarchyService;

  private constructor() {
    // Service de validation des catégories initialisé
  }

  public static getInstance(): CategoryValidationService {
    if (!CategoryValidationService.instance) {
      CategoryValidationService.instance = new CategoryValidationService();
    }
    return CategoryValidationService.instance;
  }

  /**
   * Valide qu'une catégorie peut être utilisée pour l'analyse de marché
   * Requirement 3.1: Validation du niveau hiérarchique
   */
  validateCategoryForAnalysis(
    categoryId: number, 
    options: ValidationOptions = {}
  ): ValidationResult {
    const { includeAlternatives = true, maxSuggestions = 8, productContext } = options;

    // Validation de la catégorie ${categoryId}

    // Vérifier si la catégorie existe
    const category = this.hierarchyService.findCategoryById(categoryId);
    
    if (!category) {
      return this.createValidationResult({
        isValid: false,
        level: 0,
        message: CATEGORY_VALIDATION_MESSAGES.NOT_FOUND,
        suggestions: includeAlternatives ? this.getPopularLevel3Categories(maxSuggestions) : [],
        userAction: "Veuillez sélectionner une catégorie valide dans la liste des catégories disponibles.",
        errorCode: CategoryValidationError.NOT_FOUND
      });
    }

    // Vérifier si c'est une catégorie niveau 3 (valide)
    if (category.level === 3) {
      const level3Category = category as VintedCatalogLevel3;
      
      if (level3Category.isValidForAnalysis) {
        return this.createValidationResult({
          isValid: true,
          level: 3,
          message: "✅ Catégorie valide pour l'analyse de marché",
          suggestions: [],
          userAction: "Vous pouvez procéder à l'analyse avec cette catégorie.",
          category
        });
      } else {
        // Cas rare où une catégorie niveau 3 n'est pas valide pour l'analyse
        return this.createValidationResult({
          isValid: false,
          level: 3,
          message: CATEGORY_VALIDATION_MESSAGES.API_INCOMPATIBLE,
          suggestions: includeAlternatives ? this.suggestAlternatives(categoryId, maxSuggestions, productContext) : [],
          userAction: "Sélectionnez une catégorie alternative compatible avec l'analyse.",
          category,
          errorCode: CategoryValidationError.API_INCOMPATIBLE
        });
      }
    }

    // Catégorie niveau 1 ou 2 - invalide pour l'analyse
    const suggestions = includeAlternatives ? 
      this.suggestAlternatives(categoryId, maxSuggestions, productContext) : [];

    const levelMessage = category.level === 1 ? 
      "Cette catégorie est trop générale" : 
      "Cette catégorie nécessite une spécification supplémentaire";

    return this.createValidationResult({
      isValid: false,
      level: category.level,
      message: `⚠️ ${levelMessage}. ${CATEGORY_VALIDATION_MESSAGES.INVALID_LEVEL}`,
      suggestions,
      userAction: category.level === 1 ? 
        "Naviguez dans les sous-catégories pour trouver une catégorie plus spécifique." :
        "Sélectionnez une sous-catégorie de niveau 3 pour procéder à l'analyse.",
      category,
      errorCode: CategoryValidationError.INVALID_LEVEL
    });
  }

  /**
   * Suggère des alternatives si la catégorie n'est pas valide
   * Requirement 3.2: Suggestions alternatives avec avertissement
   */
  suggestAlternatives(
    categoryId: number, 
    maxSuggestions: number = 8,
    productContext?: string
  ): VintedCatalogLevel3[] {
    const category = this.hierarchyService.findCategoryById(categoryId);
    
    if (!category) {
      return this.getPopularLevel3Categories(maxSuggestions);
    }

    let suggestions: VintedCatalogLevel3[] = [];

    // Si on a un contexte produit, prioriser les suggestions basées sur le produit
    if (productContext) {
      const productSuggestions = this.hierarchyService.suggestLevel3ForProduct(productContext);
      suggestions.push(...productSuggestions.slice(0, Math.floor(maxSuggestions / 2)));
    }

    // Ajouter des suggestions basées sur la hiérarchie
    if (category.level === 1) {
      // Pour niveau 1: suggérer toutes les catégories niveau 3 de cette branche
      const level1Category = category as any;
      level1Category.children?.forEach((level2: any) => {
        suggestions.push(...level2.children.slice(0, 2)); // 2 par niveau 2
      });
    } else if (category.level === 2) {
      // Pour niveau 2: suggérer toutes les catégories niveau 3 de ce niveau 2
      const level2Category = category as any;
      suggestions.push(...(level2Category.children || []));
    }

    // Supprimer les doublons et limiter
    const uniqueSuggestions = Array.from(
      new Map(suggestions.map(cat => [cat.id, cat])).values()
    );

    // Si pas assez de suggestions, ajouter des catégories populaires
    if (uniqueSuggestions.length < maxSuggestions) {
      const popular = this.getPopularLevel3Categories(maxSuggestions - uniqueSuggestions.length);
      popular.forEach(cat => {
        if (!uniqueSuggestions.find(existing => existing.id === cat.id)) {
          uniqueSuggestions.push(cat);
        }
      });
    }

    return uniqueSuggestions.slice(0, maxSuggestions);
  }

  /**
   * Explique pourquoi une catégorie n'est pas valide
   * Requirement 3.3: Messages d'erreur explicites
   */
  getValidationMessage(categoryId: number, productContext?: string): string {
    const category = this.hierarchyService.findCategoryById(categoryId);
    
    if (!category) {
      return `❌ Catégorie introuvable (ID: ${categoryId}). ${CATEGORY_VALIDATION_MESSAGES.NOT_FOUND}`;
    }

    if (category.level === 3) {
      const level3Category = category as VintedCatalogLevel3;
      if (level3Category.isValidForAnalysis) {
        return `✅ "${category.name}" est une catégorie valide de niveau 3. Vous pouvez procéder à l'analyse.`;
      } else {
        return `❌ "${category.name}" n'est pas compatible avec l'API d'analyse. ${CATEGORY_VALIDATION_MESSAGES.API_INCOMPATIBLE}`;
      }
    }

    const path = this.hierarchyService.getCategoryPath(categoryId);
    const pathString = path.join(' > ');
    
    if (category.level === 1) {
      return `⚠️ "${pathString}" est une catégorie trop générale (niveau 1). L'analyse de marché nécessite une catégorie plus spécifique de niveau 3. Naviguez dans les sous-catégories pour affiner votre sélection.`;
    } else if (category.level === 2) {
      return `⚠️ "${pathString}" nécessite une spécification supplémentaire (niveau 2). Sélectionnez une sous-catégorie de niveau 3 pour obtenir des résultats d'analyse précis.`;
    }

    return `❌ Niveau de catégorie non reconnu pour "${(category as any).name}".`;
  }

  /**
   * Valide une liste de catégories et retourne un rapport détaillé
   * Requirement 3.4: Validation avec blocage si niveau < 3
   */
  validateCategoriesBatch(categoryIds: number[]): {
    valid: ValidationResult[];
    invalid: ValidationResult[];
    summary: {
      totalCount: number;
      validCount: number;
      invalidCount: number;
      canProceed: boolean;
    };
  } {
    const valid: ValidationResult[] = [];
    const invalid: ValidationResult[] = [];

    categoryIds.forEach(id => {
      const result = this.validateCategoryForAnalysis(id, { includeAlternatives: false });
      if (result.isValid) {
        valid.push(result);
      } else {
        invalid.push(result);
      }
    });

    return {
      valid,
      invalid,
      summary: {
        totalCount: categoryIds.length,
        validCount: valid.length,
        invalidCount: invalid.length,
        canProceed: invalid.length === 0
      }
    };
  }

  /**
   * Génère des actions correctives pour une catégorie invalide
   * Requirement 6.4: Actions correctives claires
   */
  generateCorrectiveActions(categoryId: number, productContext?: string): {
    primaryAction: string;
    secondaryActions: string[];
    suggestions: VintedCatalogLevel3[];
  } {
    const category = this.hierarchyService.findCategoryById(categoryId);
    
    if (!category) {
      return {
        primaryAction: "Sélectionnez une catégorie dans la liste des catégories disponibles",
        secondaryActions: [
          "Utilisez la recherche pour trouver une catégorie appropriée",
          "Parcourez la hiérarchie des catégories"
        ],
        suggestions: this.getPopularLevel3Categories(6)
      };
    }

    if (category.level === 1) {
      const level2Categories = this.hierarchyService.getLevel2Categories(categoryId);
      return {
        primaryAction: `Naviguez dans les sous-catégories de "${category.name}"`,
        secondaryActions: [
          `Explorez les ${level2Categories.length} sous-catégories disponibles`,
          "Sélectionnez la catégorie la plus spécifique possible",
          productContext ? `Recherchez "${productContext}" pour des suggestions automatiques` : "Utilisez la recherche pour affiner votre sélection"
        ],
        suggestions: this.suggestAlternatives(categoryId, 6, productContext)
      };
    } else if (category.level === 2) {
      const level3Categories = this.hierarchyService.getLevel3Categories(categoryId);
      return {
        primaryAction: `Sélectionnez une sous-catégorie spécifique de "${category.name}"`,
        secondaryActions: [
          `Choisissez parmi les ${level3Categories.length} options disponibles`,
          "Toutes ces options sont compatibles avec l'analyse de marché",
          productContext ? `Les suggestions sont adaptées à "${productContext}"` : "Sélectionnez la catégorie la plus pertinente"
        ],
        suggestions: level3Categories.slice(0, 6)
      };
    }

    return {
      primaryAction: "Sélectionnez une catégorie de niveau 3 valide",
      secondaryActions: ["Utilisez les suggestions ci-dessous"],
      suggestions: this.suggestAlternatives(categoryId, 6, productContext)
    };
  }

  /**
   * Obtient les catégories niveau 3 les plus populaires
   */
  private getPopularLevel3Categories(count: number = 8): VintedCatalogLevel3[] {
    // Basé sur les mappings de produits populaires
    const popularIds = [
      2010, 2040, // Baskets femmes/hommes
      2001, 2002, // Robes courtes/longues
      2004, 2030, // T-shirts femmes/hommes
      2005, 2031, // Pantalons femmes/hommes
      2020, 2021, // Sacs à main, pochettes
      2011, 2012, // Talons, bottes
      2008, 2033, // Pulls femmes/hommes
      2007, 2034  // Vestes femmes/hommes
    ];

    return popularIds
      .map(id => this.hierarchyService.findCategoryById(id))
      .filter((cat): cat is VintedCatalogLevel3 => 
        cat !== null && cat.level === 3 && (cat as VintedCatalogLevel3).isValidForAnalysis
      )
      .slice(0, count);
  }

  /**
   * Crée un résultat de validation standardisé
   */
  private createValidationResult(params: {
    isValid: boolean;
    level: number;
    message: string;
    suggestions: VintedCatalogLevel3[];
    userAction: string;
    category?: VintedCatalogAny;
    errorCode?: CategoryValidationError;
  }): ValidationResult {
    return {
      isValid: params.isValid,
      level: params.level,
      message: params.message,
      suggestions: params.suggestions,
      userAction: params.userAction,
      category: params.category,
      errorCode: params.errorCode
    };
  }

  /**
   * Valide une catégorie avec contexte produit pour de meilleures suggestions
   * Requirement 6.1: Messages d'erreur avec suggestions alternatives
   */
  validateWithProductContext(categoryId: number, productName: string): ValidationResult {
    const result = this.validateCategoryForAnalysis(categoryId, {
      includeAlternatives: true,
      maxSuggestions: 6,
      productContext: productName
    });

    // Enrichir le message avec le contexte produit
    if (!result.isValid && productName) {
      const productSuggestions = this.hierarchyService.suggestLevel3ForProduct(productName);
      if (productSuggestions.length > 0) {
        result.message += ` Pour "${productName}", nous recommandons : ${productSuggestions.slice(0, 3).map(cat => cat.name).join(', ')}.`;
      }
    }

    return result;
  }

  /**
   * Vérifie si une catégorie est compatible avec l'API similar_sold_items
   * Requirement 6.2: Vérification API avec suggestions niveau 3
   */
  isApiCompatible(categoryId: number): {
    compatible: boolean;
    reason: string;
    alternatives: VintedCatalogLevel3[];
  } {
    const category = this.hierarchyService.findCategoryById(categoryId);
    
    if (!category) {
      return {
        compatible: false,
        reason: "Catégorie introuvable",
        alternatives: this.getPopularLevel3Categories(5)
      };
    }

    if (category.level === 3 && (category as VintedCatalogLevel3).isValidForAnalysis) {
      return {
        compatible: true,
        reason: "Catégorie de niveau 3 compatible avec l'API",
        alternatives: []
      };
    }

    const levelReason = category.level < 3 ? 
      `Niveau ${category.level} trop général pour l'API similar_sold_items` :
      "Catégorie non compatible avec l'API";

    return {
      compatible: false,
      reason: levelReason,
      alternatives: this.suggestAlternatives(categoryId, 5)
    };
  }

  /**
   * Statistiques du service de validation
   */
  getValidationStats(): {
    totalCategories: number;
    validLevel3Categories: number;
    validationCacheSize: number;
    popularCategoriesCount: number;
  } {
    const stats = this.hierarchyService.getStats();
    const popularCategories = this.getPopularLevel3Categories(20);

    return {
      totalCategories: stats.totalLevel1 + stats.totalLevel2 + stats.totalLevel3,
      validLevel3Categories: stats.totalLevel3,
      validationCacheSize: stats.cacheSize,
      popularCategoriesCount: popularCategories.length
    };
  }
}

// Export de l'instance singleton
export const categoryValidationService = CategoryValidationService.getInstance();