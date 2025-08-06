import type React from "react"
import type { Metadata, Viewport } from "next"

import { getSessionUser } from "@/lib/services/auth"
import { ProfileForm } from "@/components/auth/profile-form"
import { redirect } from "next/navigation"
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profil</h3>
        <p className="text-sm text-muted-foreground">Gérez vos informations personnelles et vos préférences.</p>
      </div>
      <ProfileForm initialData={initialData} />
    </div>
  )
}

