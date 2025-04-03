"use client"

import { Button } from "@/components/ui/button"
import { Loader2, LogOut, User } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useState } from "react"

interface AuthButtonProps {
  user: { username: string; email: string } | null
  loading?: boolean
}

export function AuthButton({ user, loading = false }: AuthButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "Déconnexion réussie",
          description: "Vous avez été déconnecté avec succès.",
        })

        // Rediriger vers la page de connexion
        window.location.href = "/login"
      } else {
        throw new Error("Erreur lors de la déconnexion")
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la déconnexion.",
      })

      // Même en cas d'erreur, on essaie de rediriger
      window.location.href = "/login"
    } finally {
      setIsSigningOut(false)
    }
  }

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">Se connecter</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/signup">S'inscrire</Link>
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="hidden md:inline">{user.username || user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">Profil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isSigningOut} onClick={handleSignOut}>
          {isSigningOut ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
          <span>Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

