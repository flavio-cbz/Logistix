import { serviceContainer } from "@/lib/services/container";
import { redirect } from "next/navigation";
import { AccountSettingsClient } from "@/components/features/settings/account-settings-client";
import { databaseService } from "@/lib/database";
import { users, products, parcelles } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const authService = serviceContainer.getAuthService();
  const user = await authService.getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Load user data
  const db = await databaseService.getDb();
  const profile = await db.select().from(users).where(eq(users.id, user.id)).get();

  if (!profile) {
    redirect("/login");
  }

  // Calculate stats
  const totalProducts = await db.select().from(products).where(eq(products.userId, user.id)).all();
  const totalParcels = await db.select().from(parcelles).where(eq(parcelles.userId, user.id)).all();

  const createdDate = new Date(profile.createdAt);
  const now = new Date();
  const daysActive = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

  // Profile data
  const profileData = {
    id: profile.id,
    username: profile.username,
    email: profile.email,
    avatar: profile.avatar,
    role: profile.role,
    lastLoginAt: profile.lastLoginAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    stats: {
      totalProducts: totalProducts.length,
      totalParcels: totalParcels.length,
      daysActive,
    },
  };

  // Parse preferences
  const preferences =
    typeof profile.preferences === "string"
      ? JSON.parse(profile.preferences || "{}")
      : profile.preferences || {};

  // Settings data
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
      <div>
        <h1 className="text-3xl font-bold">Mon Compte</h1>
        <p className="text-sm text-muted-foreground">
          Gérez votre profil, vos préférences et la sécurité de votre compte
        </p>
      </div>
      <AccountSettingsClient profileData={profileData} settingsData={settingsData} />
    </div>
  );
}

