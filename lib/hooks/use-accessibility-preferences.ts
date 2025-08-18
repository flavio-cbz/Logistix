"use client"

import { useCallback, useEffect, useState } from 'react'
import { useAccessibility, type AccessibilityPreferences } from '@/lib/contexts/accessibility-context'

export interface UseAccessibilityPreferencesOptions {
  autoSave?: boolean
  storageKey?: string
}

export function useAccessibilityPreferences(options: UseAccessibilityPreferencesOptions = {}) {
  const { preferences, updatePreferences, announceToScreenReader } = useAccessibility()
  const { autoSave = true, storageKey = 'accessibility-preferences' } = options

  // État local pour les modifications en cours
  const [localPreferences, setLocalPreferences] = useState<AccessibilityPreferences>(preferences)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Synchroniser avec le contexte
  useEffect(() => {
    setLocalPreferences(preferences)
    setHasUnsavedChanges(false)
  }, [preferences])

  // Mettre à jour une préférence locale
  const updateLocalPreference = useCallback(<K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
  ) => {
    setLocalPreferences(prev => {
      const newPreferences = { ...prev, [key]: value }
      setHasUnsavedChanges(true)
      
      if (autoSave) {
        updatePreferences({ [key]: value })
        announceToScreenReader(`Préférence ${key} mise à jour`)
      }
      
      return newPreferences
    })
  }, [autoSave, updatePreferences, announceToScreenReader])

  // Sauvegarder toutes les modifications
  const savePreferences = useCallback(() => {
    if (hasUnsavedChanges) {
      updatePreferences(localPreferences)
      setHasUnsavedChanges(false)
      announceToScreenReader('Préférences d\'accessibilité sauvegardées')
    }
  }, [hasUnsavedChanges, localPreferences, updatePreferences, announceToScreenReader])

  // Annuler les modifications
  const cancelChanges = useCallback(() => {
    setLocalPreferences(preferences)
    setHasUnsavedChanges(false)
    announceToScreenReader('Modifications annulées')
  }, [preferences, announceToScreenReader])

  // Réinitialiser aux valeurs par défaut
  const resetToDefaults = useCallback(() => {
    const defaultPreferences: AccessibilityPreferences = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      fontSize: 'medium',
      screenReader: false,
      keyboardNavigation: false,
    }
    
    setLocalPreferences(defaultPreferences)
    if (autoSave) {
      updatePreferences(defaultPreferences)
    } else {
      setHasUnsavedChanges(true)
    }
    
    announceToScreenReader('Préférences réinitialisées aux valeurs par défaut')
  }, [autoSave, updatePreferences, announceToScreenReader])

  // Importer des préférences
  const importPreferences = useCallback((importedPreferences: Partial<AccessibilityPreferences>) => {
    const validatedPreferences = {
      ...localPreferences,
      ...importedPreferences,
    }
    
    setLocalPreferences(validatedPreferences)
    if (autoSave) {
      updatePreferences(validatedPreferences)
    } else {
      setHasUnsavedChanges(true)
    }
    
    announceToScreenReader('Préférences importées')
  }, [localPreferences, autoSave, updatePreferences, announceToScreenReader])

  // Exporter les préférences
  const exportPreferences = useCallback(() => {
    const dataStr = JSON.stringify(localPreferences, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `${storageKey}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
    announceToScreenReader('Préférences exportées')
  }, [localPreferences, storageKey, announceToScreenReader])

  // Fonctions spécialisées pour chaque préférence
  const toggleReducedMotion = useCallback(() => {
    updateLocalPreference('reducedMotion', !localPreferences.reducedMotion)
  }, [localPreferences.reducedMotion, updateLocalPreference])

  const toggleHighContrast = useCallback(() => {
    updateLocalPreference('highContrast', !localPreferences.highContrast)
  }, [localPreferences.highContrast, updateLocalPreference])

  const setFontSize = useCallback((size: AccessibilityPreferences['fontSize']) => {
    updateLocalPreference('fontSize', size)
  }, [updateLocalPreference])

  const toggleScreenReader = useCallback(() => {
    updateLocalPreference('screenReader', !localPreferences.screenReader)
  }, [localPreferences.screenReader, updateLocalPreference])

  const toggleKeyboardNavigation = useCallback(() => {
    updateLocalPreference('keyboardNavigation', !localPreferences.keyboardNavigation)
  }, [localPreferences.keyboardNavigation, updateLocalPreference])

  // Appliquer les préférences au DOM
  useEffect(() => {
    const root = document.documentElement

    // Appliquer la taille de police
    root.style.setProperty('--font-size-multiplier', {
      'small': '0.875',
      'medium': '1',
      'large': '1.125',
      'extra-large': '1.25',
    }[localPreferences.fontSize])

    // Appliquer le contraste élevé
    if (localPreferences.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Appliquer la réduction de mouvement
    if (localPreferences.reducedMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }

    // Indiquer l'utilisation du clavier
    if (localPreferences.keyboardNavigation) {
      root.classList.add('keyboard-navigation')
    } else {
      root.classList.remove('keyboard-navigation')
    }
  }, [localPreferences])

  return {
    preferences: localPreferences,
    hasUnsavedChanges,
    updatePreference: updateLocalPreference,
    savePreferences,
    cancelChanges,
    resetToDefaults,
    importPreferences,
    exportPreferences,
    // Fonctions spécialisées
    toggleReducedMotion,
    toggleHighContrast,
    setFontSize,
    toggleScreenReader,
    toggleKeyboardNavigation,
  }
}

// Hook pour détecter les changements de préférences système
export function useSystemPreferences() {
  const [systemPreferences, setSystemPreferences] = useState({
    reducedMotion: false,
    highContrast: false,
    darkMode: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQueries = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
      darkMode: window.matchMedia('(prefers-color-scheme: dark)'),
    }

    const updatePreferences = () => {
      setSystemPreferences({
        reducedMotion: mediaQueries.reducedMotion.matches,
        highContrast: mediaQueries.highContrast.matches,
        darkMode: mediaQueries.darkMode.matches,
      })
    }

    // Initialiser
    updatePreferences()

    // Écouter les changements
    Object.values(mediaQueries).forEach(mq => {
      mq.addEventListener('change', updatePreferences)
    })

    return () => {
      Object.values(mediaQueries).forEach(mq => {
        mq.removeEventListener('change', updatePreferences)
      })
    }
  }, [])

  return systemPreferences
}

// Hook pour les préférences de thème
export function useThemePreferences() {
  const { preferences, updatePreference } = useAccessibilityPreferences()
  const systemPreferences = useSystemPreferences()

  const effectiveTheme = preferences.highContrast 
    ? 'high-contrast' 
    : systemPreferences.darkMode 
      ? 'dark' 
      : 'light'

  return {
    theme: effectiveTheme,
    isHighContrast: preferences.highContrast,
    isDarkMode: systemPreferences.darkMode,
    toggleHighContrast: () => updatePreference('highContrast', !preferences.highContrast),
  }
}