"use client";

import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

interface UserProfile {
  id: string;
  email: string;
  nom?: string;
  prenom?: string;
  telephone?: string;
  adresse?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

interface ProfileClientWrapperProps {
  profile?: UserProfile;
  initialData?: any; // Support pour les données passées depuis la page
  loading?: boolean;
  onSave?: (profile: Partial<UserProfile>) => Promise<void>;
  className?: string;
}

export function ProfileClientWrapper({
  profile,
  initialData,
  loading = false,
  onSave,
  className,
}: ProfileClientWrapperProps) {
  // Utiliser initialData si fourni, sinon profile
  const userData = initialData || profile;
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userData) {
      setEditedProfile({
        nom: userData.nom || userData.username || "",
        prenom: userData.prenom || "",
        telephone: userData.telephone || "",
        adresse: userData.adresse || "",
        bio: userData.bio || "",
      });
    }
  }, [userData]);

  const handleSave = async () => {
    if (!onSave) return;

    setSaving(true);
    try {
      await onSave(editedProfile);
      setIsEditing(false);
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (profile) {
      setEditedProfile({
        nom: profile.nom || "",
        prenom: profile.prenom || "",
        telephone: profile.telephone || "",
        adresse: profile.adresse || "",
        bio: profile.bio || "",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading || !profile) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Mon Profil</CardTitle>
              <CardDescription>
                Gérez vos informations personnelles
              </CardDescription>
            </div>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>Sauvegarde...</>
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
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email (read-only) */}
        <div className="space-y-2">
          <Label className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>Email</span>
          </Label>
          <Input value={userData.email || userData.username} disabled />
        </div>

        {/* Nom */}
        <div className="space-y-2">
          <Label htmlFor="nom">Nom de famille</Label>
          {isEditing ? (
            <Input
              id="nom"
              value={editedProfile.nom || ""}
              onChange={(e) =>
                setEditedProfile((prev) => ({ ...prev, nom: e.target.value }))
              }
              placeholder="Votre nom de famille"
            />
          ) : (
            <Input
              value={userData.nom || userData.username || "Non renseigné"}
              disabled
            />
          )}
        </div>

        {/* Prénom */}
        <div className="space-y-2">
          <Label htmlFor="prenom">Prénom</Label>
          {isEditing ? (
            <Input
              id="prenom"
              value={editedProfile.prenom || ""}
              onChange={(e) =>
                setEditedProfile((prev) => ({
                  ...prev,
                  prenom: e.target.value,
                }))
              }
              placeholder="Votre prénom"
            />
          ) : (
            <Input value={userData.prenom || "Non renseigné"} disabled />
          )}
        </div>

        {/* Téléphone */}
        <div className="space-y-2">
          <Label htmlFor="telephone" className="flex items-center space-x-2">
            <Phone className="h-4 w-4" />
            <span>Téléphone</span>
          </Label>
          {isEditing ? (
            <Input
              id="telephone"
              value={editedProfile.telephone || ""}
              onChange={(e) =>
                setEditedProfile((prev) => ({
                  ...prev,
                  telephone: e.target.value,
                }))
              }
              placeholder="Votre numéro de téléphone"
              type="tel"
            />
          ) : (
            <Input value={userData.telephone || "Non renseigné"} disabled />
          )}
        </div>

        {/* Adresse */}
        <div className="space-y-2">
          <Label htmlFor="adresse" className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>Adresse</span>
          </Label>
          {isEditing ? (
            <Textarea
              id="adresse"
              value={editedProfile.adresse || ""}
              onChange={(e) =>
                setEditedProfile((prev) => ({
                  ...prev,
                  adresse: e.target.value,
                }))
              }
              placeholder="Votre adresse complète"
              rows={3}
            />
          ) : (
            <Textarea
              value={userData.adresse || "Non renseignée"}
              disabled
              rows={3}
            />
          )}
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Biographie</Label>
          {isEditing ? (
            <Textarea
              id="bio"
              value={editedProfile.bio || ""}
              onChange={(e) =>
                setEditedProfile((prev) => ({ ...prev, bio: e.target.value }))
              }
              placeholder="Parlez-nous de vous..."
              rows={4}
            />
          ) : (
            <Textarea
              value={userData.bio || "Aucune biographie renseignée"}
              disabled
              rows={4}
            />
          )}
        </div>

        {/* Dates */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>
                Créé le {formatDate(userData.created_at || userData.createdAt)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>
                Modifié le{" "}
                {formatDate(userData.updated_at || userData.lastLoginAt)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProfileClientWrapper;
