<<<<<<< HEAD
import { redirect } from "next/navigation";

export default function ProfilePage() {
  // Redirect to the unified settings page
  redirect("/settings");
}
=======
import { getSessionUser } from "@/lib/services/auth/auth";
import { redirect } from "next/navigation";
import { ProfileClient } from "@/components/features/profile/profile-client";
import { databaseService } from "@/lib/database";
import { users, products, parcelles } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export default async function ProfilePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Charger les données du profil côté serveur
  const db = await databaseService.getDb();
  const profile = await db.select().from(users).where(eq(users.id, user.id)).get();

  if (!profile) {
    redirect("/login");
  }

  // Calculer les statistiques
  const totalProducts = await db.select().from(products).where(eq(products.userId, user.id)).all();
  const totalParcels = await db.select().from(parcelles).where(eq(parcelles.userId, user.id)).all();
  
  const createdDate = new Date(profile.createdAt);
  const now = new Date();
  const daysActive = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

  const profileData = {
    id: profile.id,
    username: profile.username,
    email: profile.email,
    bio: profile.bio,
    avatar: profile.avatar,
    language: profile.language,
    theme: profile.theme,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mon Profil</h1>
        <p className="text-sm text-muted-foreground">
          Gérez vos informations personnelles et la sécurité de votre compte
        </p>
      </div>
      <ProfileClient initialData={profileData} />
    </div>
  );
}
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
