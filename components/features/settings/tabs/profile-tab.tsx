<<<<<<< HEAD
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
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Camera, Save } from "lucide-react";
import { ProfileData } from "../types";

interface ProfileTabProps {
    profile: ProfileData;
    onSave: (data: { username: string; avatar: string | null }) => Promise<void>;
    isSaving: boolean;
}

export function ProfileTab({ profile, onSave, isSaving }: ProfileTabProps) {
    const [editedUsername, setEditedUsername] = useState(profile.username);
    const [editedAvatar, setEditedAvatar] = useState(profile.avatar || "");

    useEffect(() => {
        setEditedUsername(profile.username);
        setEditedAvatar(profile.avatar || "");
    }, [profile]);

    const hasChanges = editedUsername !== profile.username || editedAvatar !== (profile.avatar || "");

    const handleSave = async () => {
        await onSave({
            username: editedUsername,
            avatar: editedAvatar || null,
        });
    };

    return (
        <div className="space-y-6 mt-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Informations du profil
                    </CardTitle>
                    <CardDescription>
                        Modifiez votre nom d'utilisateur et votre avatar
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Avatar Section */}
                    <div className="flex items-center gap-6">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={editedAvatar || undefined} alt={profile.username} />
                            <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                                {profile.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="avatar-url" className="flex items-center gap-2">
                                <Camera className="h-4 w-4" />
                                URL de l'avatar
                            </Label>
                            <Input
                                id="avatar-url"
                                type="url"
                                value={editedAvatar}
                                onChange={(e) => setEditedAvatar(e.target.value)}
                                placeholder="https://exemple.com/avatar.jpg"
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Username */}
                    <div className="space-y-2">
                        <Label htmlFor="username" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Nom d'utilisateur
                        </Label>
                        <Input
                            id="username"
                            value={editedUsername}
                            onChange={(e) => setEditedUsername(e.target.value)}
                            placeholder="johndoe"
                        />
                        <p className="text-xs text-muted-foreground">
                            Ce nom sera visible dans l'application
                        </p>
                    </div>

                    {/* Save Button */}
                    {hasChanges && (
                        <Button onClick={handleSave} disabled={isSaving} className="w-full">
                            {isSaving ? "Sauvegarde..." : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Sauvegarder les modifications
                                </>
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
=======
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
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Camera, Save } from "lucide-react";
import { ProfileData } from "../types";

interface ProfileTabProps {
    profile: ProfileData;
    onSave: (data: { username: string; avatar: string | null }) => Promise<void>;
    isSaving: boolean;
}

export function ProfileTab({ profile, onSave, isSaving }: ProfileTabProps) {
    const [editedUsername, setEditedUsername] = useState(profile.username);
    const [editedAvatar, setEditedAvatar] = useState(profile.avatar || "");

    useEffect(() => {
        setEditedUsername(profile.username);
        setEditedAvatar(profile.avatar || "");
    }, [profile]);

    const hasChanges = editedUsername !== profile.username || editedAvatar !== (profile.avatar || "");

    const handleSave = async () => {
        await onSave({
            username: editedUsername,
            avatar: editedAvatar || null,
        });
    };

    return (
        <div className="space-y-6 mt-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Informations du profil
                    </CardTitle>
                    <CardDescription>
                        Modifiez votre nom d'utilisateur et votre avatar
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Avatar Section */}
                    <div className="flex items-center gap-6">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={editedAvatar || undefined} alt={profile.username} />
                            <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                                {profile.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="avatar-url" className="flex items-center gap-2">
                                <Camera className="h-4 w-4" />
                                URL de l'avatar
                            </Label>
                            <Input
                                id="avatar-url"
                                type="url"
                                value={editedAvatar}
                                onChange={(e) => setEditedAvatar(e.target.value)}
                                placeholder="https://exemple.com/avatar.jpg"
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Username */}
                    <div className="space-y-2">
                        <Label htmlFor="username" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Nom d'utilisateur
                        </Label>
                        <Input
                            id="username"
                            value={editedUsername}
                            onChange={(e) => setEditedUsername(e.target.value)}
                            placeholder="johndoe"
                        />
                        <p className="text-xs text-muted-foreground">
                            Ce nom sera visible dans l'application
                        </p>
                    </div>

                    {/* Save Button */}
                    {hasChanges && (
                        <Button onClick={handleSave} disabled={isSaving} className="w-full">
                            {isSaving ? "Sauvegarde..." : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Sauvegarder les modifications
                                </>
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
