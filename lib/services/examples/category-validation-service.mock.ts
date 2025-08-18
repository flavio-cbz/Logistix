// Service de validation de catégories avec logique réelle basée sur les catégories Vinted

import { VintedCategoryFetcher } from '../vinted-category-fetcher';

type Category = {
  id: number;
  name: string;
  parent_id?: number;
  children?: Category[];
  level?: number;
  [key: string]: any;
};

function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = [];
  function recurse(catList: Category[], level = 1, parentId?: number) {
    for (const cat of catList) {
      result.push({ ...cat, level, parent_id: parentId });
      if (cat.children && cat.children.length > 0) {
        recurse(cat.children, level + 1, cat.id);
      }
    }
  }
  recurse(categories);
  return result;
}

function findCategoryById(categories: Category[], id: number): Category | undefined {
  return categories.find(cat => cat.id === id);
}

function getChildren(categories: Category[], parentId: number): Category[] {
  return categories.filter(cat => cat.parent_id === parentId);
}

function getCategoryLevel(category: Category): number {
  return category.level || 1;
}

export const categoryValidationService = {
  // Validation simple : la catégorie existe et est de niveau 3
  async validateCategory(category: string) {
    const categories = flattenCategories(await VintedCategoryFetcher.fetchCategories());
    const found = categories.find(cat => cat.name.toLowerCase().trim() === category.toLowerCase().trim());
    const isValid = !!found && getCategoryLevel(found) === 3;
    const suggestions = !found
      ? categories.filter(cat => cat.name.toLowerCase().includes(category.toLowerCase())).slice(0, 3)
      : [];
    return {
      isValid,
      suggestions: suggestions.map(cat => ({ id: cat.id, name: cat.name })),
      normalized: found ? found.name : category.trim(),
    };
  },

  // Validation par ID pour analyse : doit exister et être niveau 3
  async validateCategoryForAnalysis(categoryId: number) {
    const categories = flattenCategories(await VintedCategoryFetcher.fetchCategories());
    const found = findCategoryById(categories, categoryId);
    const isValid = !!found && getCategoryLevel(found) === 3;
    const suggestions = found && getCategoryLevel(found) !== 3
      ? getChildren(categories, found.id).filter(cat => getCategoryLevel(cat) === 3).slice(0, 3)
      : [];
    return {
      isValid,
      suggestions: suggestions.map(cat => ({ id: cat.id, name: cat.name })),
      normalized: found ? found.name : String(categoryId),
    };
  },

  // Validation avec contexte produit : propose des suggestions selon le nom produit
  async validateWithProductContext(categoryId: number, productName: string) {
    const categories = flattenCategories(await VintedCategoryFetcher.fetchCategories());
    const found = findCategoryById(categories, categoryId);
    const isValid = !!found && getCategoryLevel(found) === 3 && productName.length > 0;
    let suggestions: Category[] = [];
    if (found && productName) {
      suggestions = categories
        .filter(cat =>
          getCategoryLevel(cat) === 3 &&
          cat.name.toLowerCase().includes(productName.toLowerCase())
        )
        .slice(0, 3);
    }
    return {
      isValid,
      suggestions: suggestions.map(cat => ({ id: cat.id, name: cat.name })),
      normalized: productName.trim().toLowerCase(),
    };
  },

  // Suggère des alternatives enfants ou proches
  async suggestAlternatives(categoryId: number, count: number) {
    const categories = flattenCategories(await VintedCategoryFetcher.fetchCategories());
    const found = findCategoryById(categories, categoryId);
    let suggestions: Category[] = [];
    if (found) {
      suggestions = getChildren(categories, found.id).filter(cat => getCategoryLevel(cat) === 3);
      if (suggestions.length === 0) {
        // Si pas d'enfants niveau 3, proposer des catégories de même parent
        suggestions = categories.filter(
          cat => cat.parent_id === found.parent_id && cat.id !== found.id && getCategoryLevel(cat) === 3
        );
      }
    }
    return suggestions.slice(0, count).map(cat => ({ id: cat.id, name: cat.name }));
  },

  // Message explicite selon la validité
  async getValidationMessage(categoryId: number) {
    const categories = flattenCategories(await VintedCategoryFetcher.fetchCategories());
    const found = findCategoryById(categories, categoryId);
    if (!found) return `Catégorie ${categoryId} inexistante.`;
    if (getCategoryLevel(found) !== 3) return `Catégorie "${found.name}" non valide pour l'analyse (niveau ${getCategoryLevel(found)}).`;
    return `Catégorie "${found.name}" valide pour l'analyse.`;
  },

  // Actions correctives : suggestions et explications
  async generateCorrectiveActions(categoryId: number, productName: string) {
    const categories = flattenCategories(await VintedCategoryFetcher.fetchCategories());
    const found = findCategoryById(categories, categoryId);
    let suggestions: Category[] = [];
    if (found) {
      suggestions = categories
        .filter(cat =>
          getCategoryLevel(cat) === 3 &&
          cat.name.toLowerCase().includes(productName.toLowerCase())
        )
        .slice(0, 3);
    }
    const actions = [];
    if (!found) {
      actions.push(`Sélectionnez une catégorie existante correspondant à "${productName}".`);
    } else if (getCategoryLevel(found) !== 3) {
      actions.push(`Choisissez une sous-catégorie plus précise pour "${found.name}".`);
    } else {
      actions.push(`Catégorie correcte, aucune action requise.`);
    }
    return {
      suggestions: suggestions.map(cat => ({ id: cat.id, name: cat.name })),
      actions,
    };
  },

  // Validation par lot
  async validateCategoriesBatch(categoryIds: number[]) {
    const categories = flattenCategories(await VintedCategoryFetcher.fetchCategories());
    return categoryIds.map(id => {
      const found = findCategoryById(categories, id);
      return {
        id,
        isValid: !!found && getCategoryLevel(found) === 3,
      };
    });
  },

  // Compatibilité API : ici, on considère compatible si la catégorie existe et est active
  async isApiCompatible(categoryId: number) {
    const categories = flattenCategories(await VintedCategoryFetcher.fetchCategories());
    const found = findCategoryById(categories, categoryId);
    // On suppose qu'une catégorie est compatible si elle existe, niveau 3, et n'est pas désactivée
    return !!found && getCategoryLevel(found) === 3 && found.is_active !== false;
  },

  // Statistiques basées sur les catégories
  async getValidationStats() {
    const categories = flattenCategories(await VintedCategoryFetcher.fetchCategories());
    const total = categories.length;
    const valid = categories.filter(cat => getCategoryLevel(cat) === 3).length;
    const invalid = total - valid;
    return { total, valid, invalid };
  },
};