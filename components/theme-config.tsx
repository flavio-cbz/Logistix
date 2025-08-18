"use client"

import { useState } from "react"
import { Palette, Settings, Zap, Eye, RotateCcw } from "lucide-react"
import { useThemeConfig } from "@/lib/hooks/use-theme-config"

import { AnimatedButton } from "@/components/ui/animated-button"
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

const ACCENT_COLORS = [
  { name: 'Bleu', value: '#3b82f6', class: 'bg-blue-500' },
  { name: 'Vert', value: '#22c55e', class: 'bg-green-500' },
  { name: 'Rouge', value: '#ef4444', class: 'bg-red-500' },
  { name: 'Violet', value: '#8b5cf6', class: 'bg-violet-500' },
  { name: 'Orange', value: '#f97316', class: 'bg-orange-500' },
  { name: 'Rose', value: '#ec4899', class: 'bg-pink-500' },
  { name: 'Cyan', value: '#06b6d4', class: 'bg-cyan-500' },
  { name: 'Indigo', value: '#6366f1', class: 'bg-indigo-500' },
]

const BORDER_RADIUS_OPTIONS = [
  { name: 'Aucun', value: 'none' as const, description: 'Coins carrés' },
  { name: 'Petit', value: 'sm' as const, description: 'Légèrement arrondis' },
  { name: 'Moyen', value: 'md' as const, description: 'Modérément arrondis' },
  { name: 'Grand', value: 'lg' as const, description: 'Très arrondis' },
]

export function ThemeConfig() {
  const { config, updateConfig, resetToDefaults, isLoading, currentTheme } = useThemeConfig()
  const [isOpen, setIsOpen] = useState(false)

  if (isLoading) {
    return (
      <EnhancedCard variant="default" className="w-full max-w-2xl">
        <EnhancedCardHeader>
          <EnhancedCardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration du thème
          </EnhancedCardTitle>
        </EnhancedCardHeader>
        <EnhancedCardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </EnhancedCardContent>
      </EnhancedCard>
    )
  }

  return (
    <EnhancedCard variant="elevated" className="w-full max-w-2xl">
      <EnhancedCardHeader>
        <EnhancedCardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuration du thème
        </EnhancedCardTitle>
        <EnhancedCardDescription>
          Personnalisez l'apparence de l'application selon vos préférences
        </EnhancedCardDescription>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Thème actuel: {currentTheme === 'dark' ? 'Sombre' : 'Clair'}
          </Badge>
        </div>
      </EnhancedCardHeader>
      
      <EnhancedCardContent className="space-y-6">
        {/* Couleur d'accent */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Couleur d'accent
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => updateConfig({ accentColor: color.value })}
                className={`
                  relative h-12 rounded-lg border-2 transition-all duration-200 hover:scale-105
                  ${config.accentColor === color.value 
                    ? 'border-foreground ring-2 ring-offset-2 ring-foreground' 
                    : 'border-border hover:border-foreground/50'
                  }
                  ${color.class}
                `}
                title={color.name}
              >
                {config.accentColor === color.value && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Sélectionnez une couleur pour les éléments interactifs
          </p>
        </div>

        <Separator />

        {/* Rayon des bordures */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Style des bordures
          </Label>
          <Select 
            value={config.borderRadius} 
            onValueChange={(value: 'none' | 'sm' | 'md' | 'lg') => 
              updateConfig({ borderRadius: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BORDER_RADIUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span>{option.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Préférences d'animation */}
        <div className="space-y-4">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Animations et mouvement
          </Label>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="animations" className="text-sm">
                  Activer les animations
                </Label>
                <p className="text-xs text-muted-foreground">
                  Transitions et effets visuels
                </p>
              </div>
              <Switch
                id="animations"
                checked={config.animations}
                onCheckedChange={(checked) => updateConfig({ animations: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="reduced-motion" className="text-sm flex items-center gap-2">
                  <Eye className="h-3 w-3" />
                  Mouvement réduit
                </Label>
                <p className="text-xs text-muted-foreground">
                  Respecte les préférences d'accessibilité du système
                </p>
              </div>
              <Switch
                id="reduced-motion"
                checked={config.reducedMotion}
                onCheckedChange={(checked) => updateConfig({ reducedMotion: checked })}
              />
            </div>
          </div>

          {config.reducedMotion && (
            <div className="p-3 bg-muted/50 rounded-lg border">
              <p className="text-xs text-muted-foreground">
                ℹ️ Le mouvement réduit est activé. Les animations seront minimisées 
                pour améliorer l'accessibilité.
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <AnimatedButton
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            className="flex items-center gap-2"
            ripple={true}
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser
          </AnimatedButton>
          
          <div className="text-xs text-muted-foreground">
            Les paramètres sont sauvegardés automatiquement
          </div>
        </div>

        {/* Aperçu */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Aperçu</Label>
          <div className="p-4 border rounded-lg space-y-3" style={{
            borderRadius: config.borderRadius === 'none' ? '0px' : 
                         config.borderRadius === 'sm' ? '0.25rem' :
                         config.borderRadius === 'md' ? '0.5rem' : '0.75rem'
          }}>
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: config.accentColor }}
              />
              <span className="text-sm">Couleur d'accent</span>
            </div>
            
            <AnimatedButton 
              size="sm" 
              className="transition-all duration-200"
              style={{ 
                backgroundColor: config.accentColor,
                borderRadius: config.borderRadius === 'none' ? '0px' : 
                             config.borderRadius === 'sm' ? '0.25rem' :
                             config.borderRadius === 'md' ? '0.5rem' : '0.75rem'
              }}
              ripple={true}
            >
              Bouton d'exemple
            </AnimatedButton>
            
            <div 
              className="p-2 bg-muted text-sm"
              style={{
                borderRadius: config.borderRadius === 'none' ? '0px' : 
                             config.borderRadius === 'sm' ? '0.25rem' :
                             config.borderRadius === 'md' ? '0.5rem' : '0.75rem'
              }}
            >
              Exemple de carte avec les paramètres actuels
            </div>
          </div>
        </div>
      </EnhancedCardContent>
    </EnhancedCard>
  )
}