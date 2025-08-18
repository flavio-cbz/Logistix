"use client"

import * as React from "react"
import { useAccessibility } from "@/lib/contexts/accessibility-context"
import { designTokens, generateCSSVariables, type DesignTokens } from "./tokens"

export type Theme = 'light' | 'dark' | 'high-contrast' | 'system'

export interface ThemeConfig {
  theme: Theme
  customTokens?: Partial<DesignTokens>
  reducedMotion?: boolean
  fontSize?: 'small' | 'medium' | 'large' | 'extra-large'
}

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark' | 'high-contrast'
  tokens: DesignTokens
  updateTokens: (tokens: Partial<DesignTokens>) => void
  resetTokens: () => void
  exportTheme: () => string
  importTheme: (themeData: string) => void
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'ui-theme',
  enableSystem = true,
  disableTransitionOnChange = true,
}: {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}) {
  const { preferences } = useAccessibility()
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const [customTokens, setCustomTokens] = React.useState<Partial<DesignTokens>>({})
  const [mounted, setMounted] = React.useState(false)

  // Charger le thème depuis le localStorage
  React.useEffect(() => {
    const savedTheme = localStorage.getItem(storageKey) as Theme
    if (savedTheme) {
      setThemeState(savedTheme)
    }
    setMounted(true)
  }, [storageKey])

  // Charger les tokens personnalisés
  React.useEffect(() => {
    const savedTokens = localStorage.getItem(`${storageKey}-tokens`)
    if (savedTokens) {
      try {
        const parsed = JSON.parse(savedTokens)
        setCustomTokens(parsed)
      } catch (error) {
        console.warn('Erreur lors du chargement des tokens personnalisés:', error)
      }
    }
  }, [storageKey])

  // Résoudre le thème effectif
  const resolvedTheme = React.useMemo((): 'light' | 'dark' | 'high-contrast' => {
    if (preferences.highContrast) {
      return 'high-contrast'
    }

    if (theme === 'system' && enableSystem) {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return 'light'
    }

    return theme === 'system' ? 'light' : theme as 'light' | 'dark' | 'high-contrast'
  }, [theme, preferences.highContrast, enableSystem])

  // Fusionner les tokens de base avec les tokens personnalisés
  const mergedTokens = React.useMemo((): DesignTokens => {
    return {
      ...designTokens,
      ...customTokens,
      colors: {
        ...designTokens.colors,
        ...customTokens.colors,
      },
      typography: {
        ...designTokens.typography,
        ...customTokens.typography,
      },
      spacing: {
        ...designTokens.spacing,
        ...customTokens.spacing,
      },
      shadows: {
        ...designTokens.shadows,
        ...customTokens.shadows,
      },
      borderRadius: {
        ...designTokens.borderRadius,
        ...customTokens.borderRadius,
      },
      breakpoints: {
        ...designTokens.breakpoints,
        ...customTokens.breakpoints,
      },
      animation: {
        ...designTokens.animation,
        ...customTokens.animation,
      },
      accessibility: {
        ...designTokens.accessibility,
        ...customTokens.accessibility,
      },
    }
  }, [customTokens])

  // Appliquer le thème au DOM
  React.useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    
    // Supprimer les classes de thème existantes
    root.classList.remove('light', 'dark', 'high-contrast')
    
    // Ajouter la classe du thème résolu
    root.classList.add(resolvedTheme)

    // Générer et appliquer les variables CSS
    const cssVariables = generateCSSVariables(mergedTokens)
    Object.entries(cssVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })

    // Appliquer les préférences d'accessibilité
    if (preferences.reducedMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }

    // Appliquer la taille de police
    const fontSizeMultipliers = {
      'small': '0.875',
      'medium': '1',
      'large': '1.125',
      'extra-large': '1.25',
    }
    root.style.setProperty('--font-size-multiplier', fontSizeMultipliers[preferences.fontSize])

    // Désactiver les transitions pendant le changement de thème
    if (disableTransitionOnChange) {
      root.classList.add('disable-transitions')
      setTimeout(() => {
        root.classList.remove('disable-transitions')
      }, 0)
    }
  }, [mounted, resolvedTheme, mergedTokens, preferences, disableTransitionOnChange])

  // Écouter les changements de préférences système
  React.useEffect(() => {
    if (!enableSystem || theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      // Le thème sera automatiquement mis à jour via resolvedTheme
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [enableSystem, theme])

  // Fonctions de gestion du thème
  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(storageKey, newTheme)
  }, [storageKey])

  const updateTokens = React.useCallback((newTokens: Partial<DesignTokens>) => {
    const updatedTokens = { ...customTokens, ...newTokens }
    setCustomTokens(updatedTokens)
    localStorage.setItem(`${storageKey}-tokens`, JSON.stringify(updatedTokens))
  }, [customTokens, storageKey])

  const resetTokens = React.useCallback(() => {
    setCustomTokens({})
    localStorage.removeItem(`${storageKey}-tokens`)
  }, [storageKey])

  const exportTheme = React.useCallback(() => {
    const themeData = {
      theme,
      customTokens,
      version: '1.0.0',
      exportDate: new Date().toISOString(),
    }
    return JSON.stringify(themeData, null, 2)
  }, [theme, customTokens])

  const importTheme = React.useCallback((themeData: string) => {
    try {
      const parsed = JSON.parse(themeData)
      if (parsed.theme) {
        setTheme(parsed.theme)
      }
      if (parsed.customTokens) {
        updateTokens(parsed.customTokens)
      }
    } catch (error) {
      console.error('Erreur lors de l\'importation du thème:', error)
      throw new Error('Format de thème invalide')
    }
  }, [setTheme, updateTokens])

  const contextValue: ThemeContextType = {
    theme,
    setTheme,
    resolvedTheme,
    tokens: mergedTokens,
    updateTokens,
    resetTokens,
    exportTheme,
    importTheme,
  }

  if (!mounted) {
    return null
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Hook pour accéder aux tokens de design
export function useDesignTokens() {
  const { tokens } = useTheme()
  return tokens
}

// Hook pour les couleurs avec support du contraste
export function useColors() {
  const { tokens, resolvedTheme } = useTheme()
  const { preferences } = useAccessibility()

  return React.useMemo(() => {
    const colors = tokens.colors

    // Ajuster les couleurs pour le contraste élevé
    if (preferences.highContrast || resolvedTheme === 'high-contrast') {
      return {
        ...colors,
        // Utiliser des couleurs plus contrastées
        primary: {
          ...colors.primary,
          500: colors.primary[700],
          600: colors.primary[800],
        },
        secondary: {
          ...colors.secondary,
          500: colors.secondary[700],
          600: colors.secondary[800],
        },
      }
    }

    return colors
  }, [tokens.colors, preferences.highContrast, resolvedTheme])
}

// Hook pour les animations avec support de reduced motion
export function useAnimations() {
  const { tokens } = useTheme()
  const { preferences } = useAccessibility()

  return React.useMemo(() => {
    if (preferences.reducedMotion) {
      return {
        ...tokens.animation,
        duration: {
          ...tokens.animation.duration,
          fast: '0ms',
          normal: '0ms',
          slow: '0ms',
          slower: '0ms',
          slowest: '0ms',
        },
      }
    }

    return tokens.animation
  }, [tokens.animation, preferences.reducedMotion])
}

// Composant pour injecter les styles CSS globaux
export function ThemeStyles() {
  return (
    <style jsx global>{`
      :root {
        /* Variables CSS générées dynamiquement */
      }

      .disable-transitions * {
        transition: none !important;
        animation: none !important;
      }

      .reduce-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }

      .high-contrast {
        --shadow-base: var(--shadow-high-contrast);
        --shadow-md: var(--shadow-high-contrast);
        --shadow-lg: var(--shadow-high-contrast);
      }

      .high-contrast button,
      .high-contrast input,
      .high-contrast select,
      .high-contrast textarea {
        border: 2px solid currentColor;
      }

      .high-contrast a {
        text-decoration: underline;
      }

      .high-contrast .focus-visible {
        outline: 3px solid currentColor;
        outline-offset: 2px;
      }

      /* Styles pour les tailles de police */
      html {
        font-size: calc(16px * var(--font-size-multiplier, 1));
      }

      /* Styles pour la navigation clavier */
      .keyboard-navigable:focus-visible {
        outline: var(--focus-ring-width) solid var(--focus-ring-color);
        outline-offset: var(--focus-ring-offset);
      }

      /* Styles pour les cibles tactiles minimales */
      button,
      input[type="button"],
      input[type="submit"],
      input[type="reset"],
      [role="button"],
      [tabindex="0"] {
        min-height: var(--min-touch-target);
        min-width: var(--min-touch-target);
      }

      /* Styles pour les lecteurs d'écran */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      /* Styles pour les live regions */
      [aria-live] {
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
    `}</style>
  )
}