import { MainNav } from "@/components/main-nav"
import { UserNav } from "../../components/user-nav"
import { CommandMenu } from "../../components/command-menu"
import { MobileSidebar } from "../../components/layout/mobile-sidebar"
import { useState } from "react"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Simuler un utilisateur pour le développement
  const user = { username: "devuser", email: "dev@example.com", isAdmin: true };

  // Commenter la redirection pour le développement
  // if (!session || !user) {
  //   redirect("/login")
  // }

  const [openMobileSidebar, setOpenMobileSidebar] = useState(false); // État pour MobileSidebar

  return (
    <>
      <div className="flex-col md:flex">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            {/* Utiliser le cast pour MainNav, ou définir explicitement ses props */}
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <CommandMenu />
              <UserNav user={user} />
            </div>
            <MobileSidebar open={openMobileSidebar} onOpenChange={setOpenMobileSidebar} />
          </div>
        </div>
        <div className="flex-1 space-y-4 p-8 pt-6">{children}</div>
      </div>
    </>
  )
}