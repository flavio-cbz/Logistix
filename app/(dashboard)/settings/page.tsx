import { getSessionUser } from "@/lib/services/auth/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Palette,
  Globe,
  Save,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

export default async function SettingsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Paramètres
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez les paramètres de votre compte et préférences d'application
          </p>
        </div>
        <Badge variant="secondary">{user.username}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profil utilisateur */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profil utilisateur
            </CardTitle>
            <CardDescription>
              Informations de base de votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input id="username" value={user.username} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="votre@email.com" />
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline" asChild>
                <Link href="/profile">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Voir le profil complet
                </Link>
              </Button>
              <Button size="sm">
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configurez vos préférences de notification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications push</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir des notifications dans le navigateur
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications email</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir des résumés par email
                </p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertes stock</Label>
                <p className="text-sm text-muted-foreground">
                  Alertes pour stock faible
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/notifications">
                Gérer les notifications
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Apparence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Apparence
            </CardTitle>
            <CardDescription>
              Personnalisez l'interface de l'application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Thème</Label>
              <Select defaultValue="system">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Clair</SelectItem>
                  <SelectItem value="dark">Sombre</SelectItem>
                  <SelectItem value="system">Système</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Langue</Label>
              <Select defaultValue="fr">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Français
                    </div>
                  </SelectItem>
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      English
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Animations</Label>
                <p className="text-sm text-muted-foreground">
                  Activer les animations d'interface
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Sécurité */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Sécurité & Confidentialité
            </CardTitle>
            <CardDescription>
              Paramètres de sécurité de votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Authentification à deux facteurs</Label>
                <p className="text-sm text-muted-foreground">
                  Sécurité renforcée pour votre compte
                </p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sessions actives</Label>
                <p className="text-sm text-muted-foreground">
                  Gérer les appareils connectés
                </p>
              </div>
              <Button variant="outline" size="sm">
                Voir
              </Button>
            </div>
            <Separator />
            <Button variant="destructive" size="sm">
              Changer le mot de passe
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Section données et sauvegarde */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Données & Sauvegarde
          </CardTitle>
          <CardDescription>
            Gestion des données de l'application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline">
              <Database className="w-4 h-4 mr-2" />
              Exporter les données
            </Button>
            <Button variant="outline">
              Sauvegarder la configuration
            </Button>
            <Button variant="outline">
              Réinitialiser les préférences
            </Button>
            <Button variant="destructive" className="ml-auto">
              Supprimer le compte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
