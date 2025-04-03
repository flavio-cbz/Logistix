"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

const profileFormSchema = z.object({
  username: z
    .string()
    .min(2, {
      message: "Le nom d'utilisateur doit faire au moins 2 caractères.",
    })
    .max(30, {
      message: "Le nom d'utilisateur ne peut pas dépasser 30 caractères.",
    }),
  email: z.string().min(1, { message: "L'email est requis." }).email("Email invalide."),
  password: z.string().optional(),
  bio: z.string().max(160).min(4).optional(),
  language: z.string({
    required_error: "Veuillez sélectionner une langue.",
  }),
  theme: z.string({
    required_error: "Veuillez sélectionner un thème.",
  }),
  avatar: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

interface ProfileFormProps {
  initialData: ProfileFormValues
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: initialData,
  })

  async function onSubmit(data: ProfileFormValues) {
    setLoading(true)
    try {
      console.log("Envoi des données de profil:", { ...data, password: data.password ? "***" : undefined })

      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        console.error("Erreur HTTP:", response.status, response.statusText)
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const result = await response.json()
      console.log("Réponse reçue:", result)

      if (result.success) {
        toast({
          title: "Profil mis à jour",
          description: "Vos modifications ont été enregistrées avec succès.",
        })
      } else {
        console.error("Erreur lors de la mise à jour du profil:", result.message)
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.message || "Une erreur est survenue lors de la mise à jour du profil.",
        })
      }
    } catch (error: any) {
      console.error("Exception lors de la mise à jour du profil:", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Une erreur est survenue: ${error.message}`,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom d'utilisateur</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>C'est votre nom public. Il peut être votre vrai nom ou un pseudonyme.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Votre adresse email pour la connexion et les notifications.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mot de passe (optionnel)</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Laissez vide pour ne pas modifier" {...field} />
              </FormControl>
              <FormDescription>
                Laissez ce champ vide si vous ne souhaitez pas changer votre mot de passe.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Dites quelque chose à propos de vous..."
                  className="resize-none"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>Une brève description de vous-même.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Langue</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une langue" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>La langue utilisée dans l'interface.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thème</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un thème" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="light">Clair</SelectItem>
                  <SelectItem value="dark">Sombre</SelectItem>
                  <SelectItem value="system">Système</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>Le thème de l'interface utilisateur.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mise à jour en cours...
            </>
          ) : (
            "Mettre à jour le profil"
          )}
        </Button>
      </form>
    </Form>
  )
}

