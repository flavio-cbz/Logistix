import { ManualValidationChecklist } from "@/components/features/validation/manual-validation-checklist";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function ManualValidationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Validation Manuelle de l'Intégration Vinted</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
          <CardDescription>
            Veuillez suivre les étapes décrites dans le guide de validation pour vous assurer que l'intégration fonctionne correctement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            Avant de commencer, veuillez consulter le guide de validation manuelle détaillé. Ce guide contient toutes les informations nécessaires pour mener à bien les tests.
          </p>
          <Link href="/docs/MANUAL_VALIDATION_GUIDE.md" passHref>
            <a className="text-blue-500 hover:underline mt-2 inline-block" target="_blank" rel="noopener noreferrer">
              Ouvrir le guide de validation manuelle
            </a>
          </Link>
        </CardContent>
      </Card>

      <ManualValidationChecklist />
    </div>
  );
}