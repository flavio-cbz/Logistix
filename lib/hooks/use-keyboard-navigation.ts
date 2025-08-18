"use client"

import { useCallback, useEffect, useRef } from 'react'
import { useAccessibility, type KeyboardShortcut } from '@/lib/contexts/accessibility-context'

export interface UseKeyboardNavigationOptions {
  shortcuts?: KeyboardShortcut[]
  enableArrowNavigation?: boolean
  enableHomeEnd?: boolean
  enableTypeAhead?: boolean
  orientation?: 'horizontal' | 'vertical' | 'both'
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const { keyboardNavigation, announceToScreenReader } = useAccessibility()
  const containerRef = useRef<HTMLElement>(null)
  const currentIndexRef = useRef(0)
  const typeAheadRef = useRef('')
  const typeAheadTimeoutRef = useRef<NodeJS.Timeout>()

  const {
    shortcuts = [],
    enableArrowNavigation = false,
    enableHomeEnd = false,
    enableTypeAhead = false,
    orientation = 'vertical'
  } = options

  // Obtenir les éléments navigables
  const getNavigableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return []
    
    const selector = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([aria-disabled="true"])',
      '[role="menuitem"]:not([aria-disabled="true"])',
      '[role="option"]:not([aria-disabled="true"])',
    ].join(', ')

    return Array.from(containerRef.current.querySelectorAll(selector))
  }, [])

  // Naviguer vers un élément par index
  const navigateToIndex = useCallback((index: number) => {
    const elements = getNavigableElements()
    if (elements.length === 0) return

    const clampedIndex = Math.max(0, Math.min(index, elements.length - 1))
    currentIndexRef.current = clampedIndex
    
    const element = elements[clampedIndex]
    element.focus()
    
    // Annoncer la position pour les lecteurs d'écran
    announceToScreenReader(`Élément ${clampedIndex + 1} sur ${elements.length}`)
  }, [getNavigableElements, announceToScreenReader])

  // Navigation par flèches
  const handleArrowNavigation = useCallback((event: KeyboardEvent) => {
    if (!enableArrowNavigation) return false

    const elements = getNavigableElements()
    if (elements.length === 0) return false

    const currentElement = document.activeElement as HTMLElement
    const currentIndex = elements.indexOf(currentElement)
    
    if (currentIndex === -1) return false

    let newIndex = currentIndex

    switch (event.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault()
          newIndex = currentIndex + 1
        }
        break
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault()
          newIndex = currentIndex - 1
        }
        break
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault()
          newIndex = currentIndex + 1
        }
        break
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault()
          newIndex = currentIndex - 1
        }
        break
      default:
        return false
    }

    // Navigation circulaire
    if (newIndex >= elements.length) {
      newIndex = 0
    } else if (newIndex < 0) {
      newIndex = elements.length - 1
    }

    navigateToIndex(newIndex)
    return true
  }, [enableArrowNavigation, orientation, getNavigableElements, navigateToIndex])

  // Navigation Home/End
  const handleHomeEnd = useCallback((event: KeyboardEvent) => {
    if (!enableHomeEnd) return false

    const elements = getNavigableElements()
    if (elements.length === 0) return false

    switch (event.key) {
      case 'Home':
        event.preventDefault()
        navigateToIndex(0)
        return true
      case 'End':
        event.preventDefault()
        navigateToIndex(elements.length - 1)
        return true
      default:
        return false
    }
  }, [enableHomeEnd, getNavigableElements, navigateToIndex])

  // Navigation par saisie (type-ahead)
  const handleTypeAhead = useCallback((event: KeyboardEvent) => {
    if (!enableTypeAhead) return false

    // Ignorer les touches de modification et de navigation
    if (event.ctrlKey || event.altKey || event.metaKey || 
        ['Tab', 'Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return false
    }

    const elements = getNavigableElements()
    if (elements.length === 0) return false

    // Ajouter le caractère à la recherche
    typeAheadRef.current += event.key.toLowerCase()

    // Réinitialiser après un délai
    if (typeAheadTimeoutRef.current) {
      clearTimeout(typeAheadTimeoutRef.current)
    }
    typeAheadTimeoutRef.current = setTimeout(() => {
      typeAheadRef.current = ''
    }, 1000)

    // Chercher l'élément correspondant
    const searchText = typeAheadRef.current
    const currentIndex = elements.indexOf(document.activeElement as HTMLElement)
    
    // Chercher à partir de l'élément suivant
    for (let i = 1; i <= elements.length; i++) {
      const index = (currentIndex + i) % elements.length
      const element = elements[index]
      const text = (element.textContent || element.getAttribute('aria-label') || '').toLowerCase()
      
      if (text.startsWith(searchText)) {
        navigateToIndex(index)
        announceToScreenReader(`Trouvé: ${element.textContent || element.getAttribute('aria-label')}`)
        return true
      }
    }

    return false
  }, [enableTypeAhead, getNavigableElements, navigateToIndex, announceToScreenReader])

  // Gestionnaire principal des événements clavier
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Essayer les différents types de navigation
    if (handleArrowNavigation(event)) return
    if (handleHomeEnd(event)) return
    if (handleTypeAhead(event)) return
  }, [handleArrowNavigation, handleHomeEnd, handleTypeAhead])

  // Enregistrer les raccourcis
  useEffect(() => {
    const unregisterFunctions = shortcuts.map(shortcut => 
      keyboardNavigation.registerShortcut(shortcut)
    )

    return () => {
      unregisterFunctions.forEach(unregister => unregister())
    }
  }, [shortcuts, keyboardNavigation])

  // Ajouter l'écouteur d'événements
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('keydown', handleKeyDown)
      return () => container.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  // Nettoyer les timeouts
  useEffect(() => {
    return () => {
      if (typeAheadTimeoutRef.current) {
        clearTimeout(typeAheadTimeoutRef.current)
      }
    }
  }, [])

  return {
    containerRef,
    navigateToIndex,
    getCurrentIndex: () => currentIndexRef.current,
    getNavigableElements,
  }
}

// Hook spécialisé pour les listes
export function useListNavigation() {
  return useKeyboardNavigation({
    enableArrowNavigation: true,
    enableHomeEnd: true,
    enableTypeAhead: true,
    orientation: 'vertical',
  })
}

// Hook spécialisé pour les barres d'outils
export function useToolbarNavigation() {
  return useKeyboardNavigation({
    enableArrowNavigation: true,
    enableHomeEnd: true,
    orientation: 'horizontal',
  })
}

// Hook spécialisé pour les grilles
export function useGridNavigation(columns: number) {
  const { containerRef, getNavigableElements, navigateToIndex } = useKeyboardNavigation()
  
  const handleGridKeyDown = useCallback((event: KeyboardEvent) => {
    const elements = getNavigableElements()
    if (elements.length === 0) return

    const currentElement = document.activeElement as HTMLElement
    const currentIndex = elements.indexOf(currentElement)
    
    if (currentIndex === -1) return

    let newIndex = currentIndex

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        newIndex = currentIndex + 1
        if (newIndex >= elements.length) newIndex = currentIndex
        break
      case 'ArrowLeft':
        event.preventDefault()
        newIndex = currentIndex - 1
        if (newIndex < 0) newIndex = currentIndex
        break
      case 'ArrowDown':
        event.preventDefault()
        newIndex = currentIndex + columns
        if (newIndex >= elements.length) newIndex = currentIndex
        break
      case 'ArrowUp':
        event.preventDefault()
        newIndex = currentIndex - columns
        if (newIndex < 0) newIndex = currentIndex
        break
      case 'Home':
        event.preventDefault()
        // Aller au début de la ligne
        newIndex = Math.floor(currentIndex / columns) * columns
        break
      case 'End':
        event.preventDefault()
        // Aller à la fin de la ligne
        const rowStart = Math.floor(currentIndex / columns) * columns
        newIndex = Math.min(rowStart + columns - 1, elements.length - 1)
        break
      case 'PageUp':
        event.preventDefault()
        newIndex = 0
        break
      case 'PageDown':
        event.preventDefault()
        newIndex = elements.length - 1
        break
      default:
        return
    }

    navigateToIndex(newIndex)
  }, [getNavigableElements, navigateToIndex, columns])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('keydown', handleGridKeyDown)
      return () => container.removeEventListener('keydown', handleGridKeyDown)
    }
  }, [handleGridKeyDown])

  return {
    containerRef,
    navigateToIndex,
    getNavigableElements,
  }
}