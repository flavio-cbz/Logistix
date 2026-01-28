import { serviceContainer } from "@/lib/services/container";
import { redirect } from "next/navigation";
import { AccountSettingsClient } from "@/components/features/settings/account-settings-client";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const authService = serviceContainer.getAuthService();
  const user = await authService.getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Use UserService instead of direct DB access
  const userService = serviceContainer.getUserService();

  const profileData = await userService.getProfile(user.id);
  const settingsData = await userService.getSettings(user.id);

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

