import type React from "react"
import { MainNav } from "@/components/main-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { AppHeader } from "@/components/layout/app-header"
import { NotificationList } from "@/components/notifications/notification-list"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav />
          <div className="ml-auto flex items-center space-x-4">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <AppHeader />
        {children}
      </main>
      <NotificationList />
    </div>
  )
}

