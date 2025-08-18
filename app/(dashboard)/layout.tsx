import type React from "react"
import { SimpleSidebar } from "@/components/layout/simple-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { ResponsiveHeader } from "@/components/layout/responsive-header"
import { NotificationList } from "@/components/features/notifications/notification-list"
import { AuthButton } from "@/components/auth/auth-button"
import { SkipLinks } from "@/components/accessibility/skip-links"
import { KeyboardShortcuts } from "@/components/accessibility/keyboard-shortcuts"
import { FocusIndicator } from "@/components/accessibility/focus-management"
import { AccessibilityLayout } from "@/components/layout/accessibility-layout"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AccessibilityLayout>
      <>
        <FocusIndicator />
        
        <SkipLinks />
        
        <div className="min-h-screen flex">
          <SimpleSidebar />
          
          <div className="flex-1 flex flex-col">
            <header 
              id="main-header"
              role="banner"
              aria-label="En-tête de page"
              className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm"
            >
              <div className="flex h-16 items-center px-4 lg:px-6">
                <div className="md:hidden w-12" />
                <div className="ml-auto flex items-center space-x-3">
                  <KeyboardShortcuts />
                  <AuthButton user={null as any} />
                  <ThemeToggle />
                </div>
              </div>
            </header>
            
            <main 
              id="main-content"
              role="main"
              aria-label="Contenu principal"
              className="flex-1 overflow-auto"
              tabIndex={-1}
            >
              <div className="container mx-auto px-4 md:px-6 lg:px-8">
                <ResponsiveHeader className="border-b pb-4 mb-6 lg:border-b-0 lg:pb-0 lg:mb-8" />
                
                <div className="pb-8">
                  {children}
                </div>
              </div>
            </main>
          </div>
          <NotificationList />
        </div>
      </>
    </AccessibilityLayout>
  )
}