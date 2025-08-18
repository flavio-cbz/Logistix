
import type { Metadata, Viewport } from "next"

import { getSessionUser } from "@/lib/services/auth"
import { redirect } from "next/navigation"
import { ProfileClientWrapper } from "@/components/features/profile/profile-client-wrapper"

export const metadata: Metadata = {
  title: "Profile",
  description: "Gérez vos informations personnelles et vos préférences.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default async function ProfilePage() {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  const initialData = {
    username: user.username,
    
    language: user.language || "fr",
    theme: user.theme || "system",
    avatar: user.avatar || "",
  }

  return (
    <ProfileClientWrapper initialData={initialData} />
  )
}