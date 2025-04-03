"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"

export default function SignUpForm() {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    username?: string
    email?: string
    password?: string
    general?: string
  }>({})
  const router = useRouter()
  const { toast } = useToast()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      // Récupérer les valeurs du formulaire directement
      const formElement = event.currentTarget
      const username = formElement.username.value
      const email = formElement.email.value
      const password = formElement.password.value

      console.log("Tentative d'inscription avec:", { username, email, password: "***" })

      // Créer FormData manuellement
      const formData = new FormData()
      formData.append("username", username)
      formData.append("email", email)
      formData.append("password", password)

      // Utiliser fetch directement pour appeler l'API d'inscription
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("Résultat de l'inscription:", result)

      if (result.success) {
        toast({
          title: "Inscription réussie",
          description: "Votre compte a été créé avec succès. Vous êtes maintenant connecté.",
        })
        router.push("/dashboard")
      } else {
        // Afficher les erreurs spécifiques aux champs
        if (result.field === "username") {
          setErrors({ username: result.message })
        } else if (result.field === "email") {
          setErrors({ email: result.message })
        } else if (result.field === "password") {
          setErrors({ password: result.message })
        } else {
          setErrors({ general: result.message || "Une erreur est survenue lors de l'inscription" })
        }

        toast({
          variant: "destructive",
          title: "Erreur d'inscription",
          description: result.message || "Une erreur inattendue s'est produite",
        })
      }
    } catch (error: any) {
      console.error("Erreur complète lors de l'inscription:", error)
      setErrors({ general: "Une erreur inattendue s'est produite" })
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: error.message || "Une erreur inattendue s'est produite",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="w-full max-w-md shadow-lg border-opacity-50">
        <CardHeader>
          <CardTitle className="text-2xl">Inscription</CardTitle>
          <CardDescription>Créez un compte Logistix</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errors.general && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{errors.general}</div>
            )}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium">
                Nom d'utilisateur
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Nom d'utilisateur"
                required
                className={errors.username ? "border-destructive" : ""}
              />
              {errors.username && <p className="text-destructive text-sm mt-1">{errors.username}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Adresse email"
                required
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium">
                Mot de passe
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className={errors.password ? "border-destructive" : ""}
              />
              {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
              <p className="text-xs text-muted-foreground mt-1">Le mot de passe doit contenir au moins 6 caractères.</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span>Inscription en cours...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span>S'inscrire</span>
                </div>
              )}
            </Button>
            <div className="text-center text-sm">
              Vous avez déjà un compte ?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Se connecter
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  )
}

