"use client"

import React, { useEffect } from 'react'
import { AccessibilityProvider } from '@/lib/contexts/accessibility-context' // Ajout import
import { useLandmarks } from '@/components/accessibility/skip-links'; // Import du hook useLandmarks

interface AccessibilityLayoutProps {
  children: React.ReactNode
}

export function AccessibilityLayout({ children }: AccessibilityLayoutProps) {
  // Initialize landmarks and keyboard shortcuts
  useLandmarks() // Appel du hook ici

  // Add additional accessibility enhancements
  useEffect(() => {
    // Add skip to content functionality
    const handleSkipToContent = (event: KeyboardEvent) => {
      // Alt + S for skip to content
      if (event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        const mainContent = document.getElementById('main-content')
        if (mainContent) {
          mainContent.focus()
          mainContent.scrollIntoView({ behavior: 'smooth' })
        }
      }
    }

    // Add focus management for modals and dialogs
    const handleModalFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Close any open modals/dialogs
        const openDialog = document.querySelector('[role="dialog"][aria-modal="true"]')
        if (openDialog) {
          const closeButton = openDialog.querySelector('[aria-label*="fermer"], [aria-label*="close"], button[data-dismiss]!')
          if (closeButton) {
            (closeButton as HTMLElement).click()
          }
        }
      }
    }

    // Add roving tabindex for better keyboard navigation
    const handleRovingTabindex = () => {
      // Find all navigation items
      const navItems = document.querySelectorAll('[role="navigation"] a, [role="navigation"] button')
      
      navItems.forEach((item, index) => {
        const element = item as HTMLElement
        
        // Set tabindex based on whether it's the first item or active
        if (index === 0 || element.getAttribute('aria-current') === 'page') {
          element.setAttribute('tabindex', '0')
        } else {
          element.setAttribute('tabindex', '-1')
        }
        
        // Add arrow key navigation
        element.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault()
            const nextIndex = (index + 1) % navItems.length
            const nextItem = navItems[nextIndex]! as HTMLElement
            nextItem.focus()
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault()
            const prevIndex = index === 0 ? navItems.length - 1 : index - 1
            const prevItem = navItems[prevIndex]! as HTMLElement
            prevItem.focus()
          }
        })
      })
    }

    // Initialize roving tabindex after a short delay to ensure DOM is ready
    setTimeout(handleRovingTabindex, 100)

    // Add event listeners
    document.addEventListener('keydown', handleSkipToContent)
    document.addEventListener('keydown', handleModalFocus)

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleSkipToContent)
      document.removeEventListener('keydown', handleModalFocus)
    }
  }, [])

  // Add focus management for page changes
  useEffect(() => {
    const handleRouteChange = () => {
      // Focus main content on route change
      setTimeout(() => {
        const mainContent = document.getElementById('main-content')
        if (mainContent) {
          mainContent.focus()
        }
      }, 100)
    }

    // Listen for navigation events (Next.js specific)
    const handlePopState = () => handleRouteChange()
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Correction : englober les enfants avec AccessibilityProvider
  return (
    <AccessibilityProvider>
      {children}
    </AccessibilityProvider>
  )
}

// Screen reader only utility class
export const srOnly = "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"