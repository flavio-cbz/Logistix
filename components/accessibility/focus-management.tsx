"use client"

import React, { useEffect, useRef, useCallback } from 'react'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { cn } from '@/lib/utils'

interface FocusManagementProps {
  children: React.ReactNode
  className?: string
  trapFocus?: boolean
  restoreOnUnmount?: boolean
  autoFocus?: boolean
  skipLinks?: boolean
}

export function FocusManagement({
  children,
  className,
  trapFocus = false,
  restoreOnUnmount = false,
  autoFocus = false,
  skipLinks = true,
}: FocusManagementProps) {
  const { focusManagement, announceToScreenReader } = useAccessibility()
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const trapCleanupRef = useRef<(() => void) | null>(null)

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

  // Gérer l'échappement du piège à focus
  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && trapFocus && trapCleanupRef.current) {
      event.preventDefault()
      trapCleanupRef.current()
      trapCleanupRef.current = null
      restoreFocus()
      announceToScreenReader('Navigation normale restaurée.', 'assertive')
    }
  }, [trapFocus, restoreFocus, announceToScreenReader])

  // Effet pour gérer le focus
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    // Sauvegarder le focus actuel
    if (trapFocus || restoreOnUnmount) {
      saveFocus()
    }

    // Activer le piège à focus si nécessaire
    if (trapFocus) {
      trapCleanupRef.current = focusManagement.trapFocus(container)
      announceToScreenReader('Navigation limitée à cette zone. Utilisez Tab pour naviguer, Échap pour sortir.', 'assertive')
    }

    // Focus automatique sur le premier élément
    if (autoFocus) {
      focusManagement.focusFirst(container)
    }

    // Ajouter l'écouteur d'échappement
    if (trapFocus) {
      document.addEventListener('keydown', handleEscape)
    }

    // Nettoyer lors du démontage
    return () => {
      if (trapFocus) {
        document.removeEventListener('keydown', handleEscape)
        if (trapCleanupRef.current) {
          trapCleanupRef.current()
          trapCleanupRef.current = null
        }
      }
      
      if (restoreOnUnmount) {
        restoreFocus()
      }
    }
  }, [trapFocus, autoFocus, restoreOnUnmount, focusManagement, handleEscape, saveFocus, restoreFocus, announceToScreenReader])

  return (
    <div
      ref={containerRef}
      className={cn(
        "focus-management-container",
        trapFocus && "focus-trap-active",
        className
      )}
      data-focus-trap={trapFocus}
      data-auto-focus={autoFocus}
    >
      {children}
    </div>
  )
}

// Composant pour améliorer le focus visible
export function FocusIndicator({ className }: { className?: string }) {
  useEffect(() => {
    // Ajouter des styles CSS pour améliorer la visibilité du focus
    const style = document.createElement('style')
    style.textContent = `
      /* Amélioration du focus visible */
      .focus-visible-enhanced *:focus-visible {
        outline: 2px solid hsl(var(--ring)) !important;
        outline-offset: 2px !important;
        border-radius: 4px !important;
      }
      
      /* Focus spécial pour les boutons */
      .focus-visible-enhanced button:focus-visible {
        box-shadow: 0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring)) !important;
      }
      
      /* Focus spécial pour les liens */
      .focus-visible-enhanced a:focus-visible {
        background-color: hsl(var(--accent)) !important;
        color: hsl(var(--accent-foreground)) !important;
      }
      
      /* Focus spécial pour les inputs */
      .focus-visible-enhanced input:focus-visible,
      .focus-visible-enhanced textarea:focus-visible,
      .focus-visible-enhanced select:focus-visible {
        border-color: hsl(var(--ring)) !important;
        box-shadow: 0 0 0 1px hsl(var(--ring)) !important;
      }
      
      /* Masquer le focus par défaut quand on utilise la souris */
      .focus-visible-enhanced *:focus:not(:focus-visible) {
        outline: none !important;
        box-shadow: none !important;
      }
      
      /* Animation du focus */
      .focus-visible-enhanced *:focus-visible {
        transition: outline 0.15s ease-in-out, box-shadow 0.15s ease-in-out !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div className={cn("focus-visible-enhanced", className)}>
      {/* Ce composant ajoute les styles de focus améliorés */}
    </div>
  )
}

// Hook pour gérer le focus dans les listes
export function useListFocus(itemsCount: number) {
  const [focusedIndex, setFocusedIndex] = React.useState(-1)
  const { announceToScreenReader } = useAccessibility()

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setFocusedIndex(prev => {
          const next = prev < itemsCount - 1 ? prev + 1 : 0
          announceToScreenReader(`Élément ${next + 1} sur ${itemsCount}`, 'polite')
          return next
        })
        break
      case 'ArrowUp':
        event.preventDefault()
        setFocusedIndex(prev => {
          const next = prev > 0 ? prev - 1 : itemsCount - 1
          announceToScreenReader(`Élément ${next + 1} sur ${itemsCount}`, 'polite')
          return next
        })
        break
      case 'Home':
        event.preventDefault()
        setFocusedIndex(0)
        announceToScreenReader(`Premier élément`, 'polite')
        break
      case 'End':
        event.preventDefault()
        setFocusedIndex(itemsCount - 1)
        announceToScreenReader(`Dernier élément`, 'polite')
        break
    }
  }, [itemsCount, announceToScreenReader])

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
  }
}

// Hook pour gérer le focus dans les grilles
export function useGridFocus(rows: number, cols: number) {
  const [focusedPosition, setFocusedPosition] = React.useState({ row: 0, col: 0 })
  const { announceToScreenReader } = useAccessibility()

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { row, col } = focusedPosition

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setFocusedPosition(prev => {
          const newRow = prev.row < rows - 1 ? prev.row + 1 : 0
          announceToScreenReader(`Ligne ${newRow + 1}, colonne ${prev.col + 1}`, 'polite')
          return { ...prev, row: newRow }
        })
        break
      case 'ArrowUp':
        event.preventDefault()
        setFocusedPosition(prev => {
          const newRow = prev.row > 0 ? prev.row - 1 : rows - 1
          announceToScreenReader(`Ligne ${newRow + 1}, colonne ${prev.col + 1}`, 'polite')
          return { ...prev, row: newRow }
        })
        break
      case 'ArrowRight':
        event.preventDefault()
        setFocusedPosition(prev => {
          const newCol = prev.col < cols - 1 ? prev.col + 1 : 0
          announceToScreenReader(`Ligne ${prev.row + 1}, colonne ${newCol + 1}`, 'polite')
          return { ...prev, col: newCol }
        })
        break
      case 'ArrowLeft':
        event.preventDefault()
        setFocusedPosition(prev => {
          const newCol = prev.col > 0 ? prev.col - 1 : cols - 1
          announceToScreenReader(`Ligne ${prev.row + 1}, colonne ${newCol + 1}`, 'polite')
          return { ...prev, col: newCol }
        })
        break
      case 'Home':
        event.preventDefault()
        if (event.ctrlKey) {
          setFocusedPosition({ row: 0, col: 0 })
          announceToScreenReader('Première cellule', 'polite')
        } else {
          setFocusedPosition(prev => ({ ...prev, col: 0 }))
          announceToScreenReader(`Début de la ligne ${row + 1}`, 'polite')
        }
        break
      case 'End':
        event.preventDefault()
        if (event.ctrlKey) {
          setFocusedPosition({ row: rows - 1, col: cols - 1 })
          announceToScreenReader('Dernière cellule', 'polite')
        } else {
          setFocusedPosition(prev => ({ ...prev, col: cols - 1 }))
          announceToScreenReader(`Fin de la ligne ${row + 1}`, 'polite')
        }
        break
    }
  }, [focusedPosition, rows, cols, announceToScreenReader])

  return {
    focusedPosition,
    setFocusedPosition,
    handleKeyDown,
  }
}