"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  Mail,
  Edit,
  Save,
  X,
  Lock,
  BarChart3,
  Calendar,
  Package,
  ShoppingBag,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { useProfileEditor, usePasswordChange, type ProfileData } from "@/lib/hooks/use-profile";

interface ProfileClientProps {
  initialData?: ProfileData;
}

export function ProfileClient({ initialData }: ProfileClientProps) {
  const { formatDateTime } = useFormatting();

  const {
    profile,
    editedProfile,
    isEditing,
    setIsEditing,
    loading,
    saving,
    handleSave,
    handleCancel,
    updateField,
  } = useProfileEditor(initialData);

  const password = usePasswordChange();

  if (loading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1 : Informations Personnelles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Informations personnelles</CardTitle>
                <CardDescription>
                  Gérez vos informations de profil
                </CardDescription>
              </div>
            </div>
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button onClick={handleSave} disabled={saving} size="sm">
                  {saving ? (
                    "Sauvegarde..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Sauvegarder
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={saving}
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Username (lecture seule) */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Nom d'utilisateur</span>
            </Label>
            <Input value={profile.username} disabled />
            <p className="text-xs text-muted-foreground">
              Le nom d'utilisateur ne peut pas être modifié
            </p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </Label>
            {isEditing ? (
              <Input
                type="email"
                value={editedProfile.email || ""}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="votre@email.com"
              />
            ) : (
              <Input value={profile.email || "Non renseigné"} disabled />
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label>Biographie</Label>
            {isEditing ? (
              <Textarea
                value={editedProfile.bio || ""}
                onChange={(e) => updateField("bio", e.target.value)}
                placeholder="Parlez-nous de vous..."
                rows={4}
                maxLength={500}
              />
            ) : (
              <Textarea
                value={profile.bio || "Aucune biographie renseignée"}
                disabled
                rows={4}
              />
            )}
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                {(editedProfile.bio || "").length}/500 caractères
              </p>
            )}
          </div>

          {/* Avatar URL */}
          <div className="space-y-2">
            <Label>URL de l'avatar</Label>
            {isEditing ? (
              <Input
                type="url"
                value={editedProfile.avatar || ""}
                onChange={(e) => updateField("avatar", e.target.value)}
                placeholder="https://exemple.com/avatar.jpg"
              />
            ) : (
              <Input value={profile.avatar || "Aucun avatar"} disabled />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2 : Sécurité */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Lock className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Sécurité du compte</CardTitle>
              <CardDescription>
                Gérez la sécurité de votre compte
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Mot de passe</p>
              <p className="text-sm text-muted-foreground">
                Changez votre mot de passe régulièrement pour plus de sécurité
              </p>
            </div>
            <Dialog
              open={password.showDialog}
              onOpenChange={password.setShowDialog}
            >
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Lock className="h-4 w-4 mr-2" />
                  Changer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Changer le mot de passe</DialogTitle>
                  <DialogDescription>
                    Entrez votre mot de passe actuel et choisissez un nouveau
                    mot de passe sécurisé.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={password.passwordData.currentPassword}
                      onChange={(e) => password.updateField("currentPassword", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={password.passwordData.newPassword}
                      onChange={(e) => password.updateField("newPassword", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum 8 caractères, avec majuscule, minuscule, chiffre
                      et caractère spécial
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirmer le mot de passe
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={password.passwordData.confirmPassword}
                      onChange={(e) => password.updateField("confirmPassword", e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => password.setShowDialog(false)}
                    disabled={password.changing}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={password.handleChange}
                    disabled={password.changing}
                  >
                    {password.changing
                      ? "Changement..."
                      : "Changer le mot de passe"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Section 3 : Statistiques */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Statistiques du compte</CardTitle>
              <CardDescription>
                Vue d'ensemble de votre activité
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 border rounded-lg">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {profile.stats?.totalProducts || 0}
                </p>
                <p className="text-sm text-muted-foreground">Produits</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 border rounded-lg">
              <ShoppingBag className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {profile.stats?.totalParcels || 0}
                </p>
                <p className="text-sm text-muted-foreground">Parcelles</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 border rounded-lg">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {profile.stats?.daysActive || 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  Jours d'activité
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Compte créé le</span>
              <span className="font-medium">
                {formatDateTime(profile.createdAt) || "Non disponible"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dernière connexion</span>
              <span className="font-medium">
                {formatDateTime(profile.lastLoginAt) || "Non disponible"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rôle</span>
              <span className="font-medium capitalize">{profile.role}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
