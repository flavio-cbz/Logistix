"use client"

import type React from "react"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState } from "react"
import { getAppProfile, updateAppProfile } from "@/lib/actions"

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
  bio: z.string().max(160).min(4),
  language: z.string({
    required_error: "Veuillez sélectionner une langue.",
  }),
  theme: z.string({
    required_error: "Veuillez sélectionner un thème.",
  }),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function ProfilePage() {
  const { toast } = useToast()
  const [avatarUrl, setAvatarUrl] = useState<string>("")
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      bio: "",
      language: "fr",
      theme: "system",
    },
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getAppProfile()
        form.reset(profile)
        if (profile.avatar) {
          setAvatarUrl(profile.avatar)
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger le profil.",
        })
      }
    }
    loadProfile()
  }, [form, toast])

  async function onSubmit(data: ProfileFormValues) {
    try {
      await updateAppProfile({ ...data, avatar: avatarUrl })
      toast({
        title: "Profil mis à jour",
        description: "Vos modifications ont été enregistrées avec succès.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour du profil.",
      })
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profil</h3>
        <p className="text-sm text-muted-foreground">Gérez vos informations personnelles et vos préférences.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Photo de profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <div>
              <Input type="file" accept="image/*" onChange={handleAvatarChange} className="max-w-[400px]" />
              <p className="text-sm text-muted-foreground mt-2">JPG, GIF ou PNG. Taille maximale de 2MB.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent>
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
                    <FormDescription>
                      C'est votre nom public. Il peut être votre vrai nom ou un pseudonyme.
                    </FormDescription>
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
              <Button type="submit">Mettre à jour le profil</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

