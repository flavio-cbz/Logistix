import {
  ValidationReport,
  TokenValidationResult,
  ProductTestResult,
  DeletionValidationResult,
  IntegrityResult,
  DebugReport,
} from './types'; // Note: Assuming a 'types.ts' file exists or will be created.

interface ValidationData {
  tokenValidation: TokenValidationResult;
  productTests: ProductTestResult[];
  deletionTest: DeletionValidationResult;
  databaseIntegrity: IntegrityResult;
  debugInfo?: DebugReport;
}

export class ValidationReporter {
  private readonly validationData: ValidationData;
  private report: ValidationReport | null = null;

  constructor(validationData: ValidationData) {
    this.validationData = validationData;
  }

  public generateReport(): ValidationReport {
    const overallSuccess = this.calculateOverallSuccess();
    const recommendations = this.getRecommendations();

    this.report = {
      timestamp: new Date().toISOString(),
      overallSuccess,
      tokenValidation: this.validationData.tokenValidation,
      productTests: this.validationData.productTests,
      deletionTest: this.validationData.deletionTest,
      databaseIntegrity: this.validationData.databaseIntegrity,
      recommendations,
      debugInfo: this.validationData.debugInfo || undefined,
    };

    return this.report!;
  }

  public exportReport(format: 'json' | 'string' = 'json'): string {
    if (!this.report) {
      this.generateReport();
    }

    if (format === 'json') {
      return JSON.stringify(this.report, null, 2);
    } else {
      return this.formatReportAsString();
    }
  }

  private calculateOverallSuccess(): boolean {
    const { tokenValidation, productTests, deletionTest, databaseIntegrity } = this.validationData;

    if (!tokenValidation.isValid) return false;
    if (productTests.some(test => !test.success)) return false;
    if (!deletionTest.success) return false;
    if (!databaseIntegrity.databaseConsistent) return false;

    return true;
  }

  private getRecommendations(): string[] {
    const recommendations: string[] = [];
    const { tokenValidation, productTests, deletionTest, databaseIntegrity } = this.validationData;

    if (!tokenValidation.isValid) {
      recommendations.push('Le token API est invalide ou a expiré. Veuillez vérifier le token et les permissions associées.');
    }

    const failedProducts = productTests.filter(test => !test.success);
    if (failedProducts.length > 0) {
      recommendations.push(`L'analyse a échoué pour ${failedProducts.length} produit(s). Vérifiez les logs pour les produits suivants : ${failedProducts.map(p => p.productName).join(', ')}.`);
    }

    if (!deletionTest.success) {
      recommendations.push("Le test de suppression a échoué. Il pourrait y avoir des problèmes avec le cycle de vie des données ou des données orphelines.");
    }

    if (!databaseIntegrity.databaseConsistent) {
      recommendations.push("Des incohérences ont été détectées dans la base de données. Une vérification manuelle de l'intégrité est recommandée.");
    }

    if (recommendations.length === 0) {
      recommendations.push('Tous les tests de validation ont été passés avec succès. Le système semble opérationnel.');
    }

    return recommendations;
  }

  private formatReportAsString(): string {
    if (!this.report) return "Aucun rapport généré.";

    let reportString = `Rapport de Validation - ${this.report.timestamp}\n`;
    reportString += `==================================================\n`;
    reportString += `Statut Général: ${this.report.overallSuccess ? 'SUCCÈS' : 'ÉCHEC'}\n\n`;

    reportString += `--- Validation du Token ---\n`;
    reportString += `Valide: ${this.report.tokenValidation.isValid}\n`;
    if (this.report.tokenValidation.errors.length > 0) {
      reportString += `Erreurs: ${this.report.tokenValidation.errors.join(', ')}\n`;
    }
    reportString += `\n`;

    reportString += `--- Tests Produits ---\n`;
    this.report.productTests.forEach(test => {
      reportString += `Produit: ${test.productName} - Statut: ${test.success ? 'SUCCÈS' : 'ÉCHEC'}\n`;
      if (!test.success) {
        reportString += `  Erreurs: ${test.errors.join(', ')}\n`;
      }
    });
    reportString += `\n`;

    reportString += `--- Test de Suppression ---\n`;
    reportString += `Statut: ${this.report.deletionTest.success ? 'SUCCÈS' : 'ÉCHEC'}\n`;
    if (!this.report.deletionTest.success) {
      reportString += `Erreurs: ${this.report.deletionTest.errors.join(', ')}\n`;
    }
    reportString += `\n`;

    reportString += `--- Intégrité de la Base de Données ---\n`;
    reportString += `Cohérente: ${this.report.databaseIntegrity.databaseConsistent}\n`;
    if (!this.report.databaseIntegrity.databaseConsistent) {
      reportString += `Erreurs: ${this.report.databaseIntegrity.errors.join(', ')}\n`;
    }
    reportString += `\n`;

    reportString += `--- Recommandations ---\n`;
    this.report.recommendations.forEach(rec => {
      reportString += `- ${rec}\n`;
    });

    return reportString;
  }
}