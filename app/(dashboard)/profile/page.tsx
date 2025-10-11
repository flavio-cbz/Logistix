import { getSessionUser } from "@/lib/services/auth/auth";
import { redirect } from "next/navigation";
import { ProfileClientWrapper } from "@/components/features/profile/profile-client-wrapper";

export default async function ProfilePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch full user profile data
  let initialData = {
    id: user.id,
    username: user.username,
    bio: "",
    avatar: user.avatar || "",
    language: user.language || "fr",
    theme: user.theme || "system",
    role: user.isAdmin ? "admin" : "user",
    createdAt: "",
    lastLoginAt: "",
    stats: {
      totalProducts: 0,
      totalParcels: 0,
      daysActive: 0,
      profileCompleteness: 60,
    },
  };

  try {
    // Fetch additional profile data from API
    const response = await fetch(
      `${process.env['NEXT_PUBLIC_BASE_URL']}/api/v1/profile`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      },
    );

    if (response.ok) {
      const profileData = await response.json();
      initialData = {
        ...initialData,
        bio: profileData.bio || "",
        avatar: profileData.avatar || "",
        language: profileData.language || "fr",
        theme: profileData.theme || "system",
        role: profileData.role || "user",
        createdAt: profileData.createdAt || "",
        lastLoginAt: profileData.lastLoginAt || "",
        stats: profileData.stats || initialData.stats,
      };
    }
  } catch (error) {
    console.error("Error fetching profile data:", error);
  }

  return <ProfileClientWrapper initialData={initialData} />;
}
