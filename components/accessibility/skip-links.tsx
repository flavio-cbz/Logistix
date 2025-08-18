"use client"

import React from 'react'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { cn } from '@/lib/utils'

interface SkipLink {
  href: string
  label: string
  description?: string
}

const defaultSkipLinks: SkipLink[] = [
  {
    href: '#main-content',
    label: 'Aller au contenu principal',
    description: 'Passer la navigation et aller directement au contenu principal'
  },
  {
    href: '#main-navigation',
    label: 'Aller à la navigation principale',
    description: 'Accéder au menu de navigation principal'
  },
  {
    href: '#search',
    label: 'Aller à la recherche',
    description: 'Accéder à la fonction de recherche'
  }
]

interface SkipLinksProps {
  links?: SkipLink[]
  className?: string
}

export function SkipLinks({ links = defaultSkipLinks, className }: SkipLinksProps) {
  const { announceToScreenReader } = useAccessibility()

  const handleSkipLinkClick = (link: SkipLink) => {
    const targetElement = document.querySelector(link.href)
    if (targetElement) {
      // Rendre l'élément focusable temporairement s'il ne l'est pas
      const originalTabIndex = targetElement.getAttribute('tabindex')
      if (!originalTabIndex) {
        targetElement.setAttribute('tabindex', '-1')
      }
      
      // Focuser l'élément
      ;(targetElement as HTMLElement).focus()
      
      // Annoncer l'action au lecteur d'écran
      announceToScreenReader(`Navigation vers: ${link.label}`, 'assertive')
      
      // Restaurer l'état original après un délai
      setTimeout(() => {
        if (!originalTabIndex) {
          targetElement.removeAttribute('tabindex')
        }
      }, 100)
    }
  }

  return (
    <nav
      className={cn(
        "skip-links fixed top-0 left-0 z-[9999] bg-background border border-border rounded-md shadow-lg",
        "transform -translate-y-full opacity-0 pointer-events-none",
        "focus-within:translate-y-2 focus-within:opacity-100 focus-within:pointer-events-auto",
        "transition-all duration-200 ease-in-out",
        className
      )}
      aria-label="Liens de navigation rapide"
    >
      <ul className="flex flex-col p-2 space-y-1">
        {links.map((link, index) => (
          <li key={index}>
            <a
              href={link.href}
              onClick={(e) => {
                e.preventDefault()
                handleSkipLinkClick(link)
              }}
              className={cn(
                "block px-3 py-2 text-sm font-medium text-foreground",
                "bg-background hover:bg-accent hover:text-accent-foreground",
                "rounded border border-transparent",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "transition-colors duration-150"
              )}
              title={link.description}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// Hook pour ajouter des landmarks automatiquement
export function useLandmarks() {
  React.useEffect(() => {
    // Ajouter des IDs aux éléments principaux s'ils n'en ont pas
    const addLandmarkId = (selector: string, id: string) => {
      const element = document.querySelector(selector)
      if (element && !element.id) {
        element.id = id
      }
    }

    // Ajouter les IDs aux landmarks principaux
    addLandmarkId('main, [role="main"]', 'main-content')
    addLandmarkId('nav, [role="navigation"]', 'main-navigation')
    addLandmarkId('[data-testid="global-search"], [role="search"]', 'search')
    addLandmarkId('header, [role="banner"]', 'main-header')
    addLandmarkId('footer, [role="contentinfo"]', 'main-footer')
    addLandmarkId('aside, [role="complementary"]', 'sidebar')

    // Ajouter des attributs ARIA aux landmarks
    const enhanceLandmark = (selector: string, label: string) => {
      const element = document.querySelector(selector)
      if (element && !element.getAttribute('aria-label')) {
        element.setAttribute('aria-label', label)
      }
    }

    enhanceLandmark('main, [role="main"]', 'Contenu principal')
    enhanceLandmark('nav, [role="navigation"]', 'Navigation principale')
    enhanceLandmark('[data-testid="global-search"], [role="search"]', 'Recherche')
    enhanceLandmark('header, [role="banner"]', 'En-tête de page')
    enhanceLandmark('footer, [role="contentinfo"]', 'Pied de page')
    enhanceLandmark('aside, [role="complementary"]', 'Contenu complémentaire')
  }, [])
}