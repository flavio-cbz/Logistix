<<<<<<< HEAD
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon } from "lucide-react";
import { SettingsData } from "../types";

interface PreferencesTabProps {
    settings: SettingsData;
    onPreferenceChange: (key: keyof SettingsData["preferences"], value: unknown) => void;
    onSave: () => void;
    isSaving: boolean;
}

export function PreferencesTab({ settings, onPreferenceChange, onSave, isSaving }: PreferencesTabProps) {
    return (
        <div className="space-y-6 mt-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <SettingsIcon className="h-5 w-5 text-primary" />
                        Préférences métier
                    </CardTitle>
                    <CardDescription>
                        Configurez les paramètres par défaut
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Devise par défaut</Label>
                        <Select
                            value={settings.preferences.currency}
                            onValueChange={(value) => onPreferenceChange("currency", value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EUR">Euro (€)</SelectItem>
                                <SelectItem value="USD">Dollar US ($)</SelectItem>
                                <SelectItem value="CNY">Yuan chinois (¥)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Unité de poids</Label>
                        <Select
                            value={settings.preferences.weightUnit}
                            onValueChange={(value) => onPreferenceChange("weightUnit", value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="g">Grammes (g)</SelectItem>
                                <SelectItem value="kg">Kilogrammes (kg)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Format de date</Label>
                        <Select
                            value={settings.preferences.dateFormat}
                            onValueChange={(value) => onPreferenceChange("dateFormat", value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DD/MM/YYYY">JJ/MM/AAAA</SelectItem>
                                <SelectItem value="MM/DD/YYYY">MM/JJ/AAAA</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Taux de change automatique</Label>
                            <p className="text-sm text-muted-foreground">
                                Mise à jour automatique des taux
                            </p>
                        </div>
                        <Switch
                            checked={settings.preferences.autoExchangeRate}
                            onCheckedChange={(value) => onPreferenceChange("autoExchangeRate", value)}
                        />
                    </div>

                    {!settings.preferences.autoExchangeRate && settings.preferences.currency !== "EUR" && (
                        <div className="space-y-2 p-4 rounded-lg bg-muted/50 border">
                            <Label>Taux de change manuel (EUR → {settings.preferences.currency})</Label>
                            <Input
                                type="number"
                                step="0.0001"
                                value={settings.preferences.manualExchangeRate || ""}
                                onChange={(e) => onPreferenceChange("manualExchangeRate", Number.parseFloat(e.target.value))}
                                placeholder="ex: 1.08"
                            />
                        </div>
                    )}

                    <Button onClick={onSave} disabled={isSaving} className="w-full">
                        {isSaving ? "Sauvegarde..." : "Sauvegarder les préférences"}
                    </Button>
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon } from "lucide-react";
import { SettingsData } from "../types";

interface PreferencesTabProps {
    settings: SettingsData;
    onPreferenceChange: (key: keyof SettingsData["preferences"], value: unknown) => void;
    onSave: () => void;
    isSaving: boolean;
}

export function PreferencesTab({ settings, onPreferenceChange, onSave, isSaving }: PreferencesTabProps) {
    return (
        <div className="space-y-6 mt-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <SettingsIcon className="h-5 w-5 text-primary" />
                        Préférences métier
                    </CardTitle>
                    <CardDescription>
                        Configurez les paramètres par défaut
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Devise par défaut</Label>
                        <Select
                            value={settings.preferences.currency}
                            onValueChange={(value) => onPreferenceChange("currency", value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EUR">Euro (€)</SelectItem>
                                <SelectItem value="USD">Dollar US ($)</SelectItem>
                                <SelectItem value="CNY">Yuan chinois (¥)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Unité de poids</Label>
                        <Select
                            value={settings.preferences.weightUnit}
                            onValueChange={(value) => onPreferenceChange("weightUnit", value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="g">Grammes (g)</SelectItem>
                                <SelectItem value="kg">Kilogrammes (kg)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Format de date</Label>
                        <Select
                            value={settings.preferences.dateFormat}
                            onValueChange={(value) => onPreferenceChange("dateFormat", value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DD/MM/YYYY">JJ/MM/AAAA</SelectItem>
                                <SelectItem value="MM/DD/YYYY">MM/JJ/AAAA</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Taux de change automatique</Label>
                            <p className="text-sm text-muted-foreground">
                                Mise à jour automatique des taux
                            </p>
                        </div>
                        <Switch
                            checked={settings.preferences.autoExchangeRate}
                            onCheckedChange={(value) => onPreferenceChange("autoExchangeRate", value)}
                        />
                    </div>

                    {!settings.preferences.autoExchangeRate && settings.preferences.currency !== "EUR" && (
                        <div className="space-y-2 p-4 rounded-lg bg-muted/50 border">
                            <Label>Taux de change manuel (EUR → {settings.preferences.currency})</Label>
                            <Input
                                type="number"
                                step="0.0001"
                                value={settings.preferences.manualExchangeRate || ""}
                                onChange={(e) => onPreferenceChange("manualExchangeRate", Number.parseFloat(e.target.value))}
                                placeholder="ex: 1.08"
                            />
                        </div>
                    )}

                    <Button onClick={onSave} disabled={isSaving} className="w-full">
                        {isSaving ? "Sauvegarde..." : "Sauvegarder les préférences"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
