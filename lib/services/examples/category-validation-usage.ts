/**
 * Exemples d'utilisation du CategoryValidationService
 * Démontre les différentes fonctionnalités du service de validation
 */

import { categoryValidationService } from '../category-validation';

// Exemple 1: Validation simple d'une catégorie
export function validateSingleCategory() {
  console.log('=== Validation simple d\'une catégorie ===');
  
  // Catégorie niveau 3 valide
  const validResult = categoryValidationService.validateCategoryForAnalysis(2001); // Robes courtes
  console.log('Catégorie valide:', validResult);
  
  // Catégorie niveau 1 invalide
  const invalidResult = categoryValidationService.validateCategoryForAnalysis(1904); // Femmes
  console.log('Catégorie invalide:', invalidResult);
}

// Exemple 2: Validation avec contexte produit
export function validateWithProductContext() {
  console.log('\n=== Validation avec contexte produit ===');
  
  const productName = 'nike air max';
  const result = categoryValidationService.validateWithProductContext(1904, productName);
  
  console.log(`Validation pour "${productName}":`, result);
  console.log('Suggestions:', result.suggestions.map(cat => cat.name));
}

// Exemple 3: Génération de suggestions alternatives
export function generateAlternatives() {
  console.log('\n=== Génération de suggestions alternatives ===');
  
  // Pour une catégorie niveau 1
  const level1Suggestions = categoryValidationService.suggestAlternatives(1904, 5); // Femmes
  console.log('Suggestions pour "Femmes":', level1Suggestions.map(cat => cat.name));
  
  // Pour une catégorie niveau 2
  const level2Suggestions = categoryValidationService.suggestAlternatives(1906, 5); // Vêtements
  console.log('Suggestions pour "Vêtements":', level2Suggestions.map(cat => cat.name));
}

// Exemple 4: Messages d'erreur explicites
export function getValidationMessages() {
  console.log('\n=== Messages d\'erreur explicites ===');
  
  const testCases = [
    { id: 2001, name: 'Robes courtes (niveau 3)' },
    { id: 1906, name: 'Vêtements (niveau 2)' },
    { id: 1904, name: 'Femmes (niveau 1)' },
    { id: 99999, name: 'Catégorie inexistante' }
  ];
  
  testCases.forEach(testCase => {
    const message = categoryValidationService.getValidationMessage(testCase.id);
    console.log(`${testCase.name}: ${message}`);
  });
}

// Exemple 5: Actions correctives
export function generateCorrectiveActions() {
  console.log('\n=== Actions correctives ===');
  
  const actions = categoryValidationService.generateCorrectiveActions(1904, 'robe noire');
  console.log('Actions correctives pour "Femmes" avec produit "robe noire":');
  console.log('Action principale:', actions.primaryAction);
  console.log('Actions secondaires:', actions.secondaryActions);
  console.log('Suggestions:', actions.suggestions.map(cat => cat.name));
}

// Exemple 6: Validation par lot
export function batchValidation() {
  console.log('\n=== Validation par lot ===');
  
  const categoryIds = [2001, 2010, 1904, 1906, 99999]; // Mix de valides/invalides
  const batchResult = categoryValidationService.validateCategoriesBatch(categoryIds);
  
  console.log('Résumé de la validation par lot:', batchResult.summary);
  console.log('Catégories valides:', batchResult.valid.map(r => r.category?.name));
  console.log('Catégories invalides:', batchResult.invalid.map(r => r.category?.name || 'Inconnue'));
}

// Exemple 7: Vérification de compatibilité API
export function checkApiCompatibility() {
  console.log('\n=== Vérification de compatibilité API ===');
  
  const testCases = [2001, 1906, 1904, 99999];
  
  testCases.forEach(categoryId => {
    const compatibility = categoryValidationService.isApiCompatible(categoryId);
    console.log(`Catégorie ${categoryId}:`, {
      compatible: compatibility.compatible,
      reason: compatibility.reason,
      alternativesCount: compatibility.alternatives.length
    });
  });
}

// Exemple 8: Statistiques du service
export function getServiceStats() {
  console.log('\n=== Statistiques du service ===');
  
  const stats = categoryValidationService.getValidationStats();
  console.log('Statistiques:', stats);
}

// Exemple d'utilisation complète
export function completeExample() {
  console.log('=== EXEMPLE COMPLET D\'UTILISATION ===\n');
  
  // Scénario: Un utilisateur veut analyser "Nike Air Max" mais sélectionne "Femmes"
  const selectedCategoryId = 1904; // Femmes (niveau 1)
  const productName = 'Nike Air Max';
  
  console.log(`Scénario: Analyse de "${productName}" avec catégorie sélectionnée: ${selectedCategoryId}`);
  
  // 1. Validation initiale
  const validation = categoryValidationService.validateWithProductContext(selectedCategoryId, productName);
  console.log('\n1. Validation initiale:');
  console.log('Valide:', validation.isValid);
  console.log('Message:', validation.message);
  
  if (!validation.isValid) {
    // 2. Obtenir des actions correctives
    const actions = categoryValidationService.generateCorrectiveActions(selectedCategoryId, productName);
    console.log('\n2. Actions correctives:');
    console.log('Action principale:', actions.primaryAction);
    
    // 3. Afficher les suggestions
    console.log('\n3. Suggestions de catégories valides:');
    actions.suggestions.slice(0, 3).forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion.name} (ID: ${suggestion.id})`);
    });
    
    // 4. Valider une suggestion
    const suggestedCategoryId = actions.suggestions[0].id;
    const finalValidation = categoryValidationService.validateCategoryForAnalysis(suggestedCategoryId);
    console.log(`\n4. Validation de la suggestion "${actions.suggestions[0].name}":`, finalValidation.isValid);
    
    // 5. Vérifier la compatibilité API
    const apiCheck = categoryValidationService.isApiCompatible(suggestedCategoryId);
    console.log('5. Compatibilité API:', apiCheck.compatible);
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