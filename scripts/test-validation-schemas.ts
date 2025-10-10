/**
 * Script de validation des endpoints sécurisés
 * 
 * Teste les endpoints sécurisés avec des données valides et invalides
 * pour s'assurer que la validation Zod fonctionne correctement.
 */

import {
  exportDataQuerySchema,
  createNotificationSchema,
  advancedSearchSchema,
  marketAnalysisCompareSchema,
  marketPredictionSchema,
  marketTrendsQuerySchema,
  marketStatusQuerySchema,
  marketAnalysisParamsSchema
} from '../lib/schemas';
import { z } from 'zod';

// Interface pour les tests de validation
interface ValidationTest {
  name: string;
  schema: z.ZodSchema<unknown>;
  validData: unknown;
  invalidData: unknown[];
  expectedErrors: string[];
}

// Tests de validation définis
const validationTests: ValidationTest[] = [

  // Test notification creation schema
  {
    name: "Create Notification Body",
    schema: createNotificationSchema,
    validData: {
      title: "Test notification",
      message: "This is a valid notification message",
      type: "success",
      priority: "high",
      data: { test: true }
    },
    invalidData: [
      { title: "", message: "Valid message" },
      { title: "Valid", message: "" },
      { title: "Valid", message: "Valid", type: "invalid" },
      { title: "A".repeat(201), message: "Valid" }
    ],
    expectedErrors: ["title required", "message required", "invalid type", "too long"]
  },

  // Test advanced search schema
  {
    name: "Advanced Search Body",
    schema: advancedSearchSchema,
    validData: {
      query: "test search",
      filters: {
        category: "electronics",
        priceMin: 10,
        priceMax: 100
      },
      sortBy: "relevance",
      limit: 20,
      searchTypes: ["produits", "parcelles"]
    },
    invalidData: [
      { query: "x" },
      { query: "valid", limit: -5 },
      { query: "valid", searchTypes: [] },
      { query: "valid", sortBy: "invalid" }
    ],
    expectedErrors: ["too short", "negative", "empty array", "invalid enum"]
  },

  // Test export data query schema
  {
    name: "Export Data Query",
    schema: exportDataQuerySchema,
    validData: {
      format: "csv",
      tables: "produits,parcelles",
      metadata: "true",
      compress: "false"
    },
    invalidData: [
      { format: "invalid_format" },
      { format: "csv", dateFrom: "invalid-date" }
    ],
    expectedErrors: ["invalid enum", "invalid date"]
  },

  // Test Market Analysis Compare schema
  {
    name: "Market Analysis Compare Body",
    schema: marketAnalysisCompareSchema,
    validData: {
      analysisIds: ["123e4567-e89b-12d3-a456-426614174000", "123e4567-e89b-12d3-a456-426614174001"],
      includeDetails: true,
      comparisonType: "detailed"
    },
    invalidData: [
      { analysisIds: ["123e4567-e89b-12d3-a456-426614174000"] },
      { analysisIds: Array(12).fill("123e4567-e89b-12d3-a456-426614174000") },
      { analysisIds: ["invalid-id", "123e4567-e89b-12d3-a456-426614174001"] }
    ],
    expectedErrors: ["minimum 2", "maximum 10", "invalid uuid"]
  },

  // Test Market Analysis Prediction schema
  {
    name: "Market Analysis Prediction Body",
    schema: marketPredictionSchema,
    validData: {
      productName: "MacBook Pro M3",
      category: "electronics",
      condition: "like_new",
      brand: "Apple",
      timeframe: "month",
      confidence: 0.85
    },
    invalidData: [
      { productName: "", category: "electronics" },
      { productName: "Valid Product", category: "invalid_category" },
      { productName: "Valid Product", category: "electronics", confidence: 1.5 }
    ],
    expectedErrors: ["minimum 2", "invalid enum", "maximum 1"]
  },

  // Test Market Analysis Trends Query schema
  {
    name: "Market Analysis Trends Query",
    schema: marketTrendsQuerySchema,
    validData: {
      period: "30d",
      metric: "price",
      format: "json"
    },
    invalidData: [
      { period: "invalid_period" },
      { period: "30d", metric: "invalid_metric" },
      { period: "30d", metric: "price", format: "invalid_format" }
    ],
    expectedErrors: ["invalid enum", "invalid enum", "invalid enum"]
  },

  // Test Market Analysis Status Query schema
  {
    name: "Market Analysis Status Query",
    schema: marketStatusQuerySchema,
    validData: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      includeStats: true,
      includeActive: true,
      includeCompleted: false
    },
    invalidData: [
      { id: "invalid-uuid" },
      {},
      { id: "123e4567-e89b-12d3-a456-426614174000", includeStats: "not_boolean" }
    ],
    expectedErrors: ["invalid uuid", "required", "invalid type"]
  }
];

// Fonction principale de test
function runAllValidationTests() {
  console.log("\n🧪 Tests de validation des schémas Zod");
  console.log("=====================================");
  
  let totalTests = 0;
  let passedTests = 0;
  
  validationTests.forEach(test => {
    console.log(`\n📋 Test: ${test.name}`);
    
    // Test avec données valides
    const validResult = test.schema.safeParse(test.validData);
    if (validResult.success) {
      console.log("  ✅ Données valides acceptées");
      passedTests++;
    } else {
      console.log("  ❌ Données valides rejetées:", validResult.error.issues);
    }
    totalTests++;
    
    // Test avec données invalides
    test.invalidData.forEach((invalidData, index) => {
      const invalidResult = test.schema.safeParse(invalidData);
      if (!invalidResult.success) {
        console.log(`  ✅ Données invalides ${index + 1} correctement rejetées`);
        passedTests++;
      } else {
        console.log(`  ❌ Données invalides ${index + 1} incorrectement acceptées`);
      }
      totalTests++;
    });
  });
  
  // Résumé
  console.log(`\n📊 Résultats des tests:`);
  console.log(`   ${passedTests}/${totalTests} tests réussis (${(passedTests/totalTests*100).toFixed(1)}%)`);
  
  if (passedTests === totalTests) {
    console.log("   🎉 Tous les tests de validation réussis !");
  } else {
    console.log(`   ⚠️  ${totalTests - passedTests} tests échoués`);
  }
  
  return { passedTests, totalTests };
}

// Test de performance
function performanceTest() {
  console.log("\n⚡ Test de performance");
  console.log("====================");
  
  const iterations = 1000;
  const testData = {
    title: "Performance test",
    message: "Testing schema validation performance",
    type: "info",
    priority: "medium",
    data: {}
  };

  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    createNotificationSchema.safeParse(testData);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`✅ ${iterations} validations en ${duration}ms`);
  console.log(`   Moyenne: ${(duration / iterations).toFixed(3)}ms par validation`);
  
  if (duration / iterations < 1) {
    console.log("   🚀 Performance excellente !");
  } else if (duration / iterations < 5) {
    console.log("   👍 Performance correcte");
  } else {
    console.log("   ⚠️  Performance à améliorer");
  }
}

// Export pour usage en tant que script
if (require.main === module) {
  const results = runAllValidationTests();
  performanceTest();
  
  // Code de sortie
  process.exit(results.passedTests === results.totalTests ? 0 : 1);
}

export { runAllValidationTests, performanceTest, validationTests };