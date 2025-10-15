import { getSessionUser } from "@/lib/services/auth/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/features/settings/settings-client";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import { databaseService } from "@/lib/database";
import { users } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export default async function SettingsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Charger les paramètres côté serveur
  const db = await databaseService.getDb();
  const profile = await db.select().from(users).where(eq(users.id, user.id)).get();

  if (!profile) {
    redirect("/login");
  }

  // Parser les préférences JSON
  const preferences =
    typeof profile.preferences === "string"
      ? JSON.parse(profile.preferences || "{}")
      : profile.preferences || {};

  const settingsData = {
    theme: profile.theme || "system",
    language: profile.language || "fr",
    animations: preferences.animations ?? true,
    preferences: {
      currency: preferences.currency || "EUR",
      weightUnit: preferences.weightUnit || "g",
      dateFormat: preferences.dateFormat || "DD/MM/YYYY",
      autoExchangeRate: preferences.autoExchangeRate ?? true,
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Paramètres
          </h1>
          <p className="text-sm text-muted-foreground">
            Configurez les paramètres de votre compte et préférences d'application
          </p>
        </div>
        <Badge variant="secondary">{user.username}</Badge>
      </div>

      <SettingsClient initialData={settingsData} />
    </div>
  );
}
