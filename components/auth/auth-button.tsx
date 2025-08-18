"use client"

import { AnimatedButton } from "@/components/ui/animated-button"
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
  user: { username: string } | null
  loading?: boolean
}

export function AuthButton({ user, loading = false }: AuthButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      const response = await fetch("/api/v1/auth/logout", {
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
      <AnimatedButton variant="ghost" size="sm" disabled loading={true}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </AnimatedButton>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <AnimatedButton 
          variant="ghost" 
          size="sm" 
          asChild
          ripple={true}
          haptic={true}
          screenReaderDescription="Aller à la page de connexion"
        >
          <Link href="/login">Se connecter</Link>
        </AnimatedButton>
        <AnimatedButton 
          size="sm" 
          asChild
          ripple={true}
          haptic={true}
          screenReaderDescription="Aller à la page d'inscription"
        >
          <Link href="/signup">S'inscrire</Link>
        </AnimatedButton>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AnimatedButton 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2"
          ripple={true}
          haptic={true}
          screenReaderDescription="Ouvrir le menu utilisateur"
        >
          <User className="h-4 w-4" />
          <span className="hidden md:inline">{user.username}</span>
        </AnimatedButton>
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

