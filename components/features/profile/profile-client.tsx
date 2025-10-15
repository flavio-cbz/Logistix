"use client";

import { useState, useEffect } from "react";
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
import { useToast } from "@/components/ui/use-toast";
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

interface ProfileData {
  id: string;
  username: string;
  email: string | null;
  bio: string | null;
  avatar: string | null;
  language: string | null;
  theme: string | null;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats?: {
    totalProducts: number;
    totalParcels: number;
    daysActive: number;
  };
}

interface ProfileClientProps {
  initialData?: ProfileData;
}

export function ProfileClient({ initialData }: ProfileClientProps) {
  const [profile, setProfile] = useState<ProfileData | null>(
    initialData || null,
  );
  const [editedProfile, setEditedProfile] = useState<Partial<ProfileData>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const { toast } = useToast();

  const getApiErrorMessage = (
    apiResponse: any,
    fallback = "Erreur inconnue",
  ) => {
    try {
      if (!apiResponse) return fallback;
      if (typeof apiResponse === "string") return apiResponse;
      const err = apiResponse.error || apiResponse;
      if (!err) return fallback;
      if (typeof err === "string") return err;
      if (err.message) {
        // If validation errors exist, concatenate them
        if (
          Array.isArray(err.validationErrors) &&
          err.validationErrors.length
        ) {
          const details = err.validationErrors
            .map((v: any) => (v.field ? `${v.field}: ${v.message}` : v.message))
            .join("; ");
          return `${err.message} — ${details}`;
        }
        return err.message;
      }
      return JSON.stringify(err);
    } catch {
      return fallback;
    }
  };

  const loadProfile = async () => {
    try {
      const response = await fetch("/api/v1/profile");
      const data = await response.json();
      if (data.success) {
        setProfile(data.data);
        setEditedProfile({
          email: data.data.email || "",
          bio: data.data.bio || "",
          avatar: data.data.avatar || "",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      loadProfile();
    } else {
      setProfile(initialData);
      setEditedProfile({
        email: initialData.email || "",
        bio: initialData.bio || "",
        avatar: initialData.avatar || "",
      });
      setLoading(false);
    }
    
  }, []); // Ne se déclenche qu'au montage initial

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/v1/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedProfile),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Succès",
          description: "Profil mis à jour avec succès",
        });
        setIsEditing(false);
        await loadProfile();
      } else {
        const message = getApiErrorMessage(
          data,
          "Erreur lors de la mise à jour",
        );
        throw new Error(message);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile({
      email: profile?.email || "",
      bio: profile?.bio || "",
      avatar: profile?.avatar || "",
    });
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch("/api/v1/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordData),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Succès",
          description: "Mot de passe changé avec succès",
        });
        setShowPasswordDialog(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        const message = getApiErrorMessage(
          data,
          "Erreur lors du changement de mot de passe",
        );
        throw new Error(message);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Erreur lors du changement de mot de passe",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Non disponible";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
                onChange={(e) =>
                  setEditedProfile((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
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
                onChange={(e) =>
                  setEditedProfile((prev) => ({ ...prev, bio: e.target.value }))
                }
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
                onChange={(e) =>
                  setEditedProfile((prev) => ({
                    ...prev,
                    avatar: e.target.value,
                  }))
                }
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
              open={showPasswordDialog}
              onOpenChange={setShowPasswordDialog}
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
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
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
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordDialog(false)}
                    disabled={changingPassword}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handlePasswordChange}
                    disabled={changingPassword}
                  >
                    {changingPassword
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
              <Package className="h-8 w-8 text-blue-500" />
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
              <Calendar className="h-8 w-8 text-purple-500" />
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
                {formatDate(profile.createdAt)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dernière connexion</span>
              <span className="font-medium">
                {formatDate(profile.lastLoginAt)}
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
