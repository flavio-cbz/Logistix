"use client"

import React, { createContext, useContext, useCallback, useRef, useEffect, useState } from 'react'

// Types pour le contexte d'accessibilité
export interface KeyboardShortcut {
  key: string
  description: string
  category: string
  action: () => void
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
}

export interface AccessibilityPreferences {
  reducedMotion: boolean
  highContrast: boolean
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  screenReader: boolean
  keyboardNavigation: boolean
}

export interface FocusManagement {
  trapFocus: (element: HTMLElement) => () => void
  restoreFocus: (element: HTMLElement) => void
  skipToContent: () => void
  focusFirst: (container: HTMLElement) => void
  focusLast: (container: HTMLElement) => void
}

export interface KeyboardNavigation {
  registerShortcut: (shortcut: KeyboardShortcut) => () => void
  getShortcuts: () => KeyboardShortcut[]
  handleKeyDown: (event: KeyboardEvent) => boolean
}

export interface AccessibilityContextType {
  // Annonces pour lecteurs d'écran
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void
  
  // Gestion du focus
  focusManagement: FocusManagement
  
  // Navigation clavier
  keyboardNavigation: KeyboardNavigation
  
  // Préférences utilisateur
  preferences: AccessibilityPreferences
  updatePreferences: (preferences: Partial<AccessibilityPreferences>) => void
  
  // État du contexte
  isScreenReaderActive: boolean
  announcements: Array<{ id: string; message: string; priority: 'polite' | 'assertive'; timestamp: number }>
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

// Détection des préférences système
const detectSystemPreferences = (): AccessibilityPreferences => {
  // Always return default values on server to prevent hydration mismatch
  const defaultPrefs = {
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium' as const,
    screenReader: false,
    keyboardNavigation: false,
  }

  if (typeof window === 'undefined' || !window.matchMedia) {
    return defaultPrefs
  }

  try {
    return {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      fontSize: 'medium', // Par défaut, peut être personnalisé
      screenReader: false, // Détecté dynamiquement
      keyboardNavigation: false, // Activé lors de la première utilisation du clavier
    }
  } catch (error) {
    // Fallback for test environments
    return defaultPrefs
  }
}

// Utilitaires pour la gestion du focus
const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ')

  return Array.from(container.querySelectorAll(focusableSelectors))
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => {
    // Use default preferences on server to prevent hydration mismatch
    return {
      reducedMotion: false,
      highContrast: false,
      fontSize: 'medium' as const,
      screenReader: false,
      keyboardNavigation: false,
    }
  })
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false)
  const [announcements, setAnnouncements] = useState<Array<{ id: string; message: string; priority: 'polite' | 'assertive'; timestamp: number }>>([])
  
  const focusHistoryRef = useRef<HTMLElement[]>([])
  const shortcutsRef = useRef<Map<string, KeyboardShortcut>>(new Map())
  const liveRegionRef = useRef<HTMLDivElement>(null)
  const assertiveRegionRef = useRef<HTMLDivElement>(null)

  // Initialize after mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
    setPreferences(detectSystemPreferences())
  }, [])

  // Détection de l'utilisation d'un lecteur d'écran
  useEffect(() => {
    if (!mounted) return

    const detectScreenReader = () => {
      // Détection basée sur les événements de focus et les requêtes média
      const hasScreenReader = window.navigator.userAgent.includes('NVDA') ||
                             window.navigator.userAgent.includes('JAWS') ||
                             window.speechSynthesis?.getVoices().length > 0

      setIsScreenReaderActive(hasScreenReader)
    }

    detectScreenReader()
    
    // Écouter les changements de préférences système
    if (window.matchMedia) {
      try {
        const mediaQueries = [
          window.matchMedia('(prefers-reduced-motion: reduce)'),
          window.matchMedia('(prefers-contrast: high)'),
        ]

        const handleMediaChange = () => {
          setPreferences(prev => ({
            ...prev,
            reducedMotion: mediaQueries[0].matches,
            highContrast: mediaQueries[1].matches,
          }))
        }

        mediaQueries.forEach(mq => {
          if (mq && typeof mq.addEventListener === 'function') {
            mq.addEventListener('change', handleMediaChange)
          }
        })

        return () => {
          mediaQueries.forEach(mq => {
            if (mq && typeof mq.removeEventListener === 'function') {
              mq.removeEventListener('change', handleMediaChange)
            }
          })
        }
      } catch (error) {
        console.warn('Error setting up media query listeners:', error)
      }
    }
  }, [mounted])

  // Fonction d'annonce pour lecteurs d'écran
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const id = Math.random().toString(36).substr(2, 9)
    const announcement = { id, message, priority, timestamp: Date.now() }
    
    setAnnouncements(prev => [...prev.slice(-4), announcement]) // Garder seulement les 5 dernières

    // Utiliser les live regions ARIA
    const region = priority === 'assertive' ? assertiveRegionRef.current : liveRegionRef.current
    if (region) {
      region.textContent = message
      // Nettoyer après un délai
      setTimeout(() => {
        if (region.textContent === message) {
          region.textContent = ''
        }
      }, 1000)
    }
  }, [])

  // Gestion du focus
  const focusManagement: FocusManagement = {
    trapFocus: useCallback((element: HTMLElement) => {
      const focusableElements = getFocusableElements(element)
      if (focusableElements.length === 0) return () => {}

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              event.preventDefault()
              lastElement.focus()
            }
          } else {
            if (document.activeElement === lastElement) {
              event.preventDefault()
              firstElement.focus()
            }
          }
        }
      }

      element.addEventListener('keydown', handleKeyDown)
      firstElement.focus()

      return () => {
        element.removeEventListener('keydown', handleKeyDown)
      }
    }, []),

    restoreFocus: useCallback((element: HTMLElement) => {
      focusHistoryRef.current.push(document.activeElement as HTMLElement)
      element.focus()
    }, []),

    skipToContent: useCallback(() => {
      const mainContent = document.querySelector('main') || document.querySelector('[role="main"]')
      if (mainContent) {
        (mainContent as HTMLElement).focus()
        announceToScreenReader('Contenu principal atteint')
      }
    }, [announceToScreenReader]),

    focusFirst: useCallback((container: HTMLElement) => {
      const focusableElements = getFocusableElements(container)
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      }
    }, []),

    focusLast: useCallback((container: HTMLElement) => {
      const focusableElements = getFocusableElements(container)
      if (focusableElements.length > 0) {
        focusableElements[focusableElements.length - 1].focus()
      }
    }, []),
  }

  // Navigation clavier
  const keyboardNavigation: KeyboardNavigation = {
    registerShortcut: useCallback((shortcut: KeyboardShortcut) => {
      const key = `${shortcut.ctrlKey ? 'ctrl+' : ''}${shortcut.altKey ? 'alt+' : ''}${shortcut.shiftKey ? 'shift+' : ''}${shortcut.key.toLowerCase()}`
      shortcutsRef.current.set(key, shortcut)

      return () => {
        shortcutsRef.current.delete(key)
      }
    }, []),

    getShortcuts: useCallback(() => {
      return Array.from(shortcutsRef.current.values())
    }, []),

    handleKeyDown: useCallback((event: KeyboardEvent) => {
if (!event.key) return false
      const key = `${event.ctrlKey ? 'ctrl+' : ''}${event.altKey ? 'alt+' : ''}${event.shiftKey ? 'shift+' : ''}${event.key.toLowerCase()}`
      const shortcut = shortcutsRef.current.get(key)
      
      if (shortcut) {
        event.preventDefault()
        shortcut.action()
        return true
      }
      
      return false
    }, []),
  }

  // Mise à jour des préférences
  const updatePreferences = useCallback((newPreferences: Partial<AccessibilityPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }))
    
    // Sauvegarder dans localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessibility-preferences', JSON.stringify({ ...preferences, ...newPreferences }))
    }
  }, [preferences])

  // Charger les préférences sauvegardées
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return

    const saved = localStorage.getItem('accessibility-preferences')
    if (saved) {
      try {
        const savedPreferences = JSON.parse(saved)
        setPreferences(prev => ({ ...prev, ...savedPreferences }))
      } catch (error) {
        console.warn('Erreur lors du chargement des préférences d\'accessibilité:', error)
      }
    }
  }, [mounted])

  // Écouter les événements clavier globaux
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Détecter l'utilisation du clavier pour la navigation
      if (event.key === 'Tab') {
        setPreferences(prev => ({ ...prev, keyboardNavigation: true }))
      }

      // Gérer les raccourcis globaux
      keyboardNavigation.handleKeyDown(event)
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [keyboardNavigation])

  const contextValue: AccessibilityContextType = {
    announceToScreenReader,
    focusManagement,
    keyboardNavigation,
    preferences,
    updatePreferences,
    isScreenReaderActive,
    announcements,
  }

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
      {/* Live regions pour les annonces ARIA */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        ref={assertiveRegionRef}
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </AccessibilityContext.Provider>
  )
}

// Hook pour utiliser le contexte d'accessibilité
export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}