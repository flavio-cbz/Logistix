"use client"

import React, { useState, useEffect } from 'react'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Keyboard, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KeyboardShortcutsProps {
  className?: string
}

export function KeyboardShortcuts({ className }: KeyboardShortcutsProps) {
  const { keyboardNavigation, announceToScreenReader } = useAccessibility()
  const [isOpen, setIsOpen] = useState(false)
  const [shortcuts, setShortcuts] = useState<Array<{
    key: string
    description: string
    category: string
    action: () => void
    ctrlKey?: boolean
    altKey?: boolean
    shiftKey?: boolean
  }>>([])

  // Mettre à jour la liste des raccourcis
  useEffect(() => {
    const updateShortcuts = () => {
      setShortcuts(keyboardNavigation.getShortcuts())
    }

    updateShortcuts()
    
    // Écouter les changements de raccourcis
    const interval = setInterval(updateShortcuts, 1000)
    return () => clearInterval(interval)
  }, [keyboardNavigation])

  // Grouper les raccourcis par catégorie
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, typeof shortcuts>)

  // Formater l'affichage d'un raccourci
  const formatShortcut = (shortcut: typeof shortcuts[0]) => {
    const keys = []
    if (shortcut.ctrlKey) keys.push('Ctrl')
    if (shortcut.altKey) keys.push('Alt')
    if (shortcut.shiftKey) keys.push('Shift')
    keys.push(shortcut.key.toUpperCase())
    return keys.join(' + ')
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      announceToScreenReader('Aide des raccourcis clavier ouverte', 'polite')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          title="Afficher les raccourcis clavier (Ctrl + /)"
          aria-label="Afficher les raccourcis clavier"
        >
          <Keyboard className="h-4 w-4" />
          <HelpCircle className="h-2 w-2 absolute -top-1 -right-1" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Raccourcis clavier
          </DialogTitle>
          <DialogDescription>
            Utilisez ces raccourcis pour naviguer plus rapidement dans l'application.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3 text-foreground">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {formatShortcut(shortcut)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {Object.keys(groupedShortcuts).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Keyboard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun raccourci clavier configuré pour le moment.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook pour enregistrer les raccourcis clavier par défaut
export function useDefaultKeyboardShortcuts() {
  const { keyboardNavigation, focusManagement } = useAccessibility()

  useEffect(() => {
    const shortcuts = [
      // Navigation générale
      {
        key: '/',
        description: 'Afficher l\'aide des raccourcis clavier',
        category: 'Navigation',
        action: () => {
          const helpButton = document.querySelector('[aria-label="Afficher les raccourcis clavier"]') as HTMLButtonElement
          helpButton?.click()
        },
        ctrlKey: true,
      },
      {
        key: 'k',
        description: 'Ouvrir la recherche globale',
        category: 'Navigation',
        action: () => {
          const searchButton = document.querySelector('[data-testid="global-search"]') as HTMLButtonElement
          searchButton?.click()
        },
        ctrlKey: true,
      },
      {
        key: 'Home',
        description: 'Aller au tableau de bord',
        category: 'Navigation',
        action: () => {
          window.location.href = '/dashboard'
        },
        altKey: true,
      },
      
      // Gestion du focus
      {
        key: 'Tab',
        description: 'Naviguer vers l\'élément suivant',
        category: 'Focus',
        action: () => {
          // Géré nativement par le navigateur
        },
      },
      {
        key: 'Tab',
        description: 'Naviguer vers l\'élément précédent',
        category: 'Focus',
        action: () => {
          // Géré nativement par le navigateur
        },
        shiftKey: true,
      },
      {
        key: 'Enter',
        description: 'Activer l\'élément focusé',
        category: 'Focus',
        action: () => {
          // Géré nativement par le navigateur
        },
      },
      {
        key: ' ',
        description: 'Activer les boutons et cases à cocher',
        category: 'Focus',
        action: () => {
          // Géré nativement par le navigateur
        },
      },
      
      // Raccourcis spécifiques à l'application
      {
        key: 'p',
        description: 'Aller aux parcelles',
        category: 'Application',
        action: () => {
          window.location.href = '/parcelles'
        },
        altKey: true,
      },
      {
        key: 'r',
        description: 'Aller aux produits',
        category: 'Application',
        action: () => {
          window.location.href = '/produits'
        },
        altKey: true,
      },
      {
        key: 's',
        description: 'Aller aux statistiques',
        category: 'Application',
        action: () => {
          window.location.href = '/statistiques'
        },
        altKey: true,
      },
      {
        key: 'm',
        description: 'Aller à l\'analyse de marché',
        category: 'Application',
        action: () => {
          window.location.href = '/analyse-marche'
        },
        altKey: true,
      },
      
      // Accessibilité
      {
        key: 'Escape',
        description: 'Fermer les modales et menus',
        category: 'Accessibilité',
        action: () => {
          // Géré par les composants individuels
        },
      },
      {
        key: 'F6',
        description: 'Naviguer entre les régions de la page',
        category: 'Accessibilité',
        action: () => {
          // Implémentation personnalisée pour naviguer entre landmarks
          const landmarks = document.querySelectorAll('main, nav, aside, header, footer, [role="main"], [role="navigation"], [role="complementary"], [role="banner"], [role="contentinfo"]')
          const currentFocus = document.activeElement
          let currentIndex = -1
          
          landmarks.forEach((landmark, index) => {
            if (landmark.contains(currentFocus)) {
              currentIndex = index
            }
          })
          
          const nextIndex = (currentIndex + 1) % landmarks.length
          const nextLandmark = landmarks[nextIndex] as HTMLElement
          
          if (nextLandmark) {
            nextLandmark.focus()
            const label = nextLandmark.getAttribute('aria-label') || nextLandmark.tagName.toLowerCase()
            // announceToScreenReader(`Navigation vers: ${label}`, 'assertive')
          }
        },
      },
    ]

    // Enregistrer tous les raccourcis
    const unregisterFunctions = shortcuts.map(shortcut => 
      keyboardNavigation.registerShortcut(shortcut)
    )

    // Nettoyer lors du démontage
    return () => {
      unregisterFunctions.forEach(unregister => unregister())
    }
  }, [keyboardNavigation, focusManagement])
}