<<<<<<< HEAD
"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Palette } from "lucide-react";
import { SettingsData } from "../types";
import { useTheme } from "next-themes";

interface AppearanceTabProps {
    settings: SettingsData;
    onUpdate: (partial: Partial<SettingsData>) => void;
    isSaving: boolean;
}

export function AppearanceTab({ settings, onUpdate, isSaving }: AppearanceTabProps) {
    const { setTheme } = useTheme();

    const handleThemeChange = (theme: string) => {
        setTheme(theme);
        onUpdate({ theme });
    };

    const handleLanguageChange = (language: string) => {
        onUpdate({ language });
    };

    const handleAnimationsChange = (animations: boolean) => {
        onUpdate({ animations });
    };

    return (
        <div className="space-y-6 mt-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-primary" />
                        Apparence
                    </CardTitle>
                    <CardDescription>
                        Personnalisez l'interface selon vos préférences
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Thème</Label>
                        <Select value={settings.theme} onValueChange={handleThemeChange}>
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
                        <Select value={settings.language} onValueChange={handleLanguageChange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fr">Français</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Animations</Label>
                            <p className="text-sm text-muted-foreground">
                                Activer les animations d'interface
                            </p>
                        </div>
                        <Switch
                            checked={settings.animations}
                            onCheckedChange={handleAnimationsChange}
                            disabled={isSaving}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
=======
"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Palette } from "lucide-react";
import { SettingsData } from "../types";
import { useTheme } from "next-themes";

interface AppearanceTabProps {
    settings: SettingsData;
    onUpdate: (partial: Partial<SettingsData>) => void;
    isSaving: boolean;
}

export function AppearanceTab({ settings, onUpdate, isSaving }: AppearanceTabProps) {
    const { setTheme } = useTheme();

    const handleThemeChange = (theme: string) => {
        setTheme(theme);
        onUpdate({ theme });
    };

    const handleLanguageChange = (language: string) => {
        onUpdate({ language });
    };

    const handleAnimationsChange = (animations: boolean) => {
        onUpdate({ animations });
    };

    return (
        <div className="space-y-6 mt-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-primary" />
                        Apparence
                    </CardTitle>
                    <CardDescription>
                        Personnalisez l'interface selon vos préférences
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Thème</Label>
                        <Select value={settings.theme} onValueChange={handleThemeChange}>
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
                        <Select value={settings.language} onValueChange={handleLanguageChange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fr">Français</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Animations</Label>
                            <p className="text-sm text-muted-foreground">
                                Activer les animations d'interface
                            </p>
                        </div>
                        <Switch
                            checked={settings.animations}
                            onCheckedChange={handleAnimationsChange}
                            disabled={isSaving}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
