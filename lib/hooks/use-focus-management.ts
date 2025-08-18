"use client"

import { useCallback, useRef, useEffect } from 'react'
import { useAccessibility } from '@/lib/contexts/accessibility-context'

export interface UseFocusManagementOptions {
  restoreOnUnmount?: boolean
  trapFocus?: boolean
  autoFocus?: boolean
}

export function useFocusManagement(options: UseFocusManagementOptions = {}) {
  const { focusManagement, announceToScreenReader } = useAccessibility()
  const containerRef = useRef<HTMLElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const trapCleanupRef = useRef<(() => void) | null>(null)

  const { restoreOnUnmount = false, trapFocus = false, autoFocus = false } = options

  // Sauvegarder le focus actuel
  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement
  }, [])

  // Restaurer le focus précédent
  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [])

  // Activer le piège à focus
  const enableFocusTrap = useCallback(() => {
    if (containerRef.current && trapFocus) {
      saveFocus()
      trapCleanupRef.current = focusManagement.trapFocus(containerRef.current)
      announceToScreenReader('Navigation limitée à cette zone. Utilisez Tab pour naviguer, Échap pour sortir.')
    }
  }, [focusManagement, trapFocus, saveFocus, announceToScreenReader])

  // Désactiver le piège à focus
  const disableFocusTrap = useCallback(() => {
    if (trapCleanupRef.current) {
      trapCleanupRef.current()
      trapCleanupRef.current = null
    }
  }, [])

  // Focuser le premier élément
  const focusFirst = useCallback(() => {
    if (containerRef.current) {
      focusManagement.focusFirst(containerRef.current)
    }
  }, [focusManagement])

  // Focuser le dernier élément
  const focusLast = useCallback(() => {
    if (containerRef.current) {
      focusManagement.focusLast(containerRef.current)
    }
  }, [focusManagement])

  // Gérer l'échappement du piège à focus
  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && trapFocus) {
      event.preventDefault()
      disableFocusTrap()
      restoreFocus()
      announceToScreenReader('Navigation normale restaurée.')
    }
  }, [trapFocus, disableFocusTrap, restoreFocus, announceToScreenReader])

  // Effet pour gérer le focus automatique et le piège
  useEffect(() => {
    if (containerRef.current) {
      if (autoFocus) {
        focusFirst()
      }
      
      if (trapFocus) {
        enableFocusTrap()
      }
    }

    // Ajouter l'écouteur d'échappement
    if (trapFocus) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      if (trapFocus) {
        document.removeEventListener('keydown', handleEscape)
        disableFocusTrap()
      }
      
      if (restoreOnUnmount) {
        restoreFocus()
      }
    }
  }, [autoFocus, trapFocus, enableFocusTrap, disableFocusTrap, handleEscape, restoreOnUnmount, restoreFocus, focusFirst])

  return {
    containerRef,
    saveFocus,
    restoreFocus,
    enableFocusTrap,
    disableFocusTrap,
    focusFirst,
    focusLast,
  }
}

// Hook spécialisé pour les modales
export function useModalFocus() {
  return useFocusManagement({
    restoreOnUnmount: true,
    trapFocus: true,
    autoFocus: true,
  })
}

// Hook spécialisé pour les menus déroulants
export function useMenuFocus() {
  const { containerRef, focusFirst, focusLast, restoreFocus } = useFocusManagement({
    restoreOnUnmount: true,
    autoFocus: true,
  })

  const handleMenuKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        // Logique pour naviguer vers l'élément suivant
        break
      case 'ArrowUp':
        event.preventDefault()
        // Logique pour naviguer vers l'élément précédent
        break
      case 'Home':
        event.preventDefault()
        focusFirst()
        break
      case 'End':
        event.preventDefault()
        focusLast()
        break
      case 'Escape':
        event.preventDefault()
        restoreFocus()
        break
    }
  }, [focusFirst, focusLast, restoreFocus])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('keydown', handleMenuKeyDown)
      return () => container.removeEventListener('keydown', handleMenuKeyDown)
    }
  }, [handleMenuKeyDown])

  return {
    containerRef,
    focusFirst,
    focusLast,
    restoreFocus,
  }
}