/**
 * Exemples d'utilisation du CategoryValidationService
 * Démontre les différentes fonctionnalités du service de validation
 */

import { categoryValidationService } from './category-validation-service.mock';

// Exemple 1: Validation simple d'une catégorie
export async function validateSingleCategory() {
  
  // Catégorie niveau 3 valide
  const validResult = await categoryValidationService.validateCategoryForAnalysis(2001); // Robes courtes
  
  // Catégorie niveau 1 invalide
  const invalidResult = await categoryValidationService.validateCategoryForAnalysis(1904); // Femmes
}

// Exemple 2: Validation avec contexte produit
export async function validateWithProductContext() {
  
  const productName = 'nike air max';
  const result = await categoryValidationService.validateWithProductContext(1904, productName);
  
}

// Exemple 3: Génération de suggestions alternatives
export async function generateAlternatives() {
  
  // Pour une catégorie niveau 1
  const level1Suggestions = await categoryValidationService.suggestAlternatives(1904, 5); // Femmes
  
  // Pour une catégorie niveau 2
  const level2Suggestions = await categoryValidationService.suggestAlternatives(1906, 5); // Vêtements
}

// Exemple 4: Messages d'erreur explicites
export async function getValidationMessages() {
  
  const testCases = [
    { id: 2001, name: 'Robes courtes (niveau 3)' },
    { id: 1906, name: 'Vêtements (niveau 2)' },
    { id: 1904, name: 'Femmes (niveau 1)' },
    { id: 99999, name: 'Catégorie inexistante' }
  ];
  
  for (const testCase of testCases) {
    const message = await categoryValidationService.getValidationMessage(testCase.id);
  }
}

// Exemple 5: Actions correctives
export async function generateCorrectiveActions() {
  
  const actions = await categoryValidationService.generateCorrectiveActions(1904, 'robe noire');
}

// Exemple 6: Validation par lot
export async function batchValidation() {
  
  const categoryIds = [2001, 2010, 1904, 1906, 99999]; // Mix de valides/invalides
  const batchResult = await categoryValidationService.validateCategoriesBatch(categoryIds);
  
}

// Exemple 7: Vérification de compatibilité API
export async function checkApiCompatibility() {
  
  const testCases = [2001, 1906, 1904, 99999];
  
  for (const categoryId of testCases) {
    const compatibility = await categoryValidationService.isApiCompatible(categoryId);
  }
}

// Exemple 8: Statistiques du service
export function getServiceStats() {
  
  const stats = categoryValidationService.getValidationStats();
}

// Exemple d'utilisation complète
export async function completeExample() {
  
  // Scénario: Un utilisateur veut analyser "Nike Air Max" mais sélectionne "Femmes"
  const selectedCategoryId = 1904; // Femmes (niveau 1)
  const productName = 'Nike Air Max';
  
  
  // 1. Validation initiale
  const validation = await categoryValidationService.validateWithProductContext(selectedCategoryId, productName);
  
  if (!validation.isValid) {
    // 2. Obtenir des actions correctives
    const actions = await categoryValidationService.generateCorrectiveActions(selectedCategoryId, productName);
    
    // 3. Afficher les suggestions
    actions.suggestions.slice(0, 3).forEach((suggestion, index) => {
    });
    
    // 4. Valider une suggestion
    const suggestedCategoryId = actions.suggestions[0].id;
    const finalValidation = await categoryValidationService.validateCategoryForAnalysis(suggestedCategoryId);
    
    // 5. Vérifier la compatibilité API
    const apiCheck = await categoryValidationService.isApiCompatible(suggestedCategoryId);
  }
}

// Exécuter tous les exemples si ce fichier est exécuté directement
if (require.main === module) {
  completeExample();
  validateSingleCategory();
  validateWithProductContext();
  generateAlternatives();
  getValidationMessages();
  generateCorrectiveActions();
  batchValidation();
  checkApiCompatibility();
  getServiceStats();
}