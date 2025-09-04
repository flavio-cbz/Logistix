import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your profile settings.",
}

export default function ProfilePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold">Profile Page</h1>
      <p className="mt-3 text-2xl">
        Welcome to your profile!
      </p>
    </div>
  )
}