"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

export default function VintedConfigRequired() {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Analyse de Marché Vinted</h3>
        <p className="text-sm text-muted-foreground">
          Configuration requise pour accéder aux données Vinted
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration Vinted requise
          </CardTitle>
          <CardDescription>
            Un cookie de session Vinted est requis pour effectuer des analyses
            de marché
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Vous devez configurer votre cookie de session Vinted pour utiliser
              cette fonctionnalité. Rendez-vous dans votre profil pour
              configurer l'accès à Vinted.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-medium">Comment configurer :</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                Allez dans votre <strong>Profil</strong> via le menu de
                navigation
              </li>
              <li>
                Trouvez la section <strong>"Configuration Vinted"</strong>
              </li>
              <li>
                Suivez les instructions pour obtenir votre cookie de session
              </li>
              <li>Testez et enregistrez votre configuration</li>
            </ol>
          </div>

          <Button onClick={() => router.push("/profile")}>
            Aller au Profil
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
