"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/use-toast";
import { logger } from "@/lib/utils/logging/logger";

export default function ThemePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);

    try {
      const response = await fetch("/api/v1/theme", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ theme: newTheme }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to update theme");
      }

      toast({
        title: "Thème mis à jour",
        description: "Votre préférence de thème a été enregistrée.",
      });
    } catch (error) {
      logger.error("Erreur lors de la mise à jour du thème:", {}, error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le thème.",
        variant: "destructive",
      });
      // Revert to previous theme on error
      setTheme(theme || "system");
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Thème</h3>
        <p className="text-sm text-muted-foreground">
          Personnalisez l'apparence de l'application.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Préférences d'apparence</CardTitle>
          <CardDescription>
            Sélectionnez le thème qui vous convient le mieux.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Thème</Label>
            <Select value={theme || "system"} onValueChange={handleThemeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sélectionner un thème" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Clair</SelectItem>
                <SelectItem value="dark">Sombre</SelectItem>
                <SelectItem value="system">Système</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Aperçu</Label>
            <RadioGroup
              value={theme || "system"}
              onValueChange={handleThemeChange}
              className="grid grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="light"
                  id="light"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="light"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <div className="space-y-2 rounded-sm bg-[#ecedef] p-2 w-full">
                    <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
                      <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                      <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                      <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                      <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                    </div>
                  </div>
                  <span className="block w-full p-2 text-center font-normal">
                    Clair
                  </span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="dark"
                  id="dark"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="dark"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <div className="space-y-2 rounded-sm bg-slate-950 p-2 w-full">
                    <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                      <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                      <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-slate-400" />
                      <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-slate-400" />
                      <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                    </div>
                  </div>
                  <span className="block w-full p-2 text-center font-normal">
                    Sombre
                  </span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="system"
                  id="system"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="system"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <div className="space-y-2 rounded-sm bg-slate-300 p-2 w-full">
                    <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                      <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                      <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                      <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-slate-400" />
                      <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                    </div>
                  </div>
                  <span className="block w-full p-2 text-center font-normal">
                    Système
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
