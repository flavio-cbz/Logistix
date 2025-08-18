"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { useAccessibility } from "@/lib/contexts/accessibility-context"
import { useFocusManagement } from "@/lib/hooks/use-focus-management"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { cn } from "@/lib/utils"

type CardComponentProps = React.ComponentProps<typeof Card>

export interface KeyboardAction {
  key: string
  action: () => void
  description: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
}

export interface AccessibleCardProps extends Omit<CardComponentProps, 'role'> {
  // Propriétés ARIA
  role?: string
  ariaLabel?: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  ariaExpanded?: boolean
  ariaSelected?: boolean
  
  // Gestion du focus
  focusable?: boolean
  autoFocus?: boolean
  trapFocus?: boolean
  
  // Actions clavier
  keyboardActions?: KeyboardAction[]
  
  // Callbacks d'interaction
  onFocus?: (event: React.FocusEvent<HTMLDivElement>) => void
  onBlur?: (event: React.FocusEvent<HTMLDivElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void
  
  // Annonces pour lecteurs d'écran
  announceOnFocus?: string
  announceOnSelect?: string
  
  // Navigation
  navigable?: boolean
  navigationOrientation?: 'horizontal' | 'vertical' | 'both'
}

const AccessibleCard = React.forwardRef<HTMLDivElement, AccessibleCardProps>(
  ({
    className,
    role,
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
    ariaExpanded,
    ariaSelected,
    focusable = false,
    autoFocus = false,
    trapFocus = false,
    keyboardActions = [],
    onFocus,
    onBlur,
    onKeyDown,
    announceOnFocus,
    announceOnSelect,
    navigable = false,
    navigationOrientation = 'vertical',
    children,
    ...props
  }, ref) => {
    const { announceToScreenReader, preferences } = useAccessibility()
    const [isFocused, setIsFocused] = React.useState(false)
    const [isSelected, setIsSelected] = React.useState(false)
    
    // Gestion du focus si nécessaire
    const { containerRef: focusRef } = useFocusManagement({
      autoFocus,
      trapFocus,
    })
    
    // Navigation clavier si nécessaire
    const { containerRef: navRef } = useKeyboardNavigation({
      shortcuts: keyboardActions.map(action => ({
        key: action.key,
        description: action.description,
        category: 'Card Actions',
        action: action.action,
        ctrlKey: action.ctrlKey,
        altKey: action.altKey,
        shiftKey: action.shiftKey,
      })),
      enableArrowNavigation: navigable,
      orientation: navigationOrientation,
    })

    // Combiner les refs
    const combinedRef = React.useCallback((node: HTMLDivElement) => {
      if (focusable || trapFocus) {
        focusRef.current = node
      }
      if (navigable) {
        navRef.current = node
      }
      if (ref) {
        if (typeof ref === 'function') {
          ref(node)
        } else {
          ref.current = node
        }
      }
    }, [focusRef, navRef, ref, focusable, trapFocus, navigable])

    // Gestionnaires d'événements
    const handleFocus = React.useCallback((event: React.FocusEvent<HTMLDivElement>) => {
      setIsFocused(true)
      
      if (announceOnFocus) {
        announceToScreenReader(announceOnFocus)
      }
      
      onFocus?.(event)
    }, [announceOnFocus, announceToScreenReader, onFocus])

    const handleBlur = React.useCallback((event: React.FocusEvent<HTMLDivElement>) => {
      setIsFocused(false)
      onBlur?.(event)
    }, [onBlur])

    const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
      // Gérer les actions clavier personnalisées
      const action = keyboardActions.find(a => 
        a.key.toLowerCase() === event.key.toLowerCase() &&
        !!a.ctrlKey === event.ctrlKey &&
        !!a.altKey === event.altKey &&
        !!a.shiftKey === event.shiftKey
      )

      if (action) {
        event.preventDefault()
        action.action()
        
        if (announceOnSelect) {
          announceToScreenReader(announceOnSelect)
        }
        
        return
      }

      // Gérer les touches standard
      switch (event.key) {
        case 'Enter':
        case ' ':
          if (focusable && props.onClick) {
            event.preventDefault()
            ;(props.onClick as any)(event)
            setIsSelected(true)
            
            if (announceOnSelect) {
              announceToScreenReader(announceOnSelect)
            }
          }
          break
      }

      onKeyDown?.(event)
    }, [keyboardActions, announceOnSelect, announceToScreenReader, focusable, props.onClick, onKeyDown])

    // Calculer les propriétés ARIA
    const ariaProps = {
      role: role || (focusable ? 'button' : undefined),
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      'aria-expanded': ariaExpanded,
      'aria-selected': ariaSelected ?? (isSelected ? true : undefined),
      'aria-pressed': focusable && isSelected ? true : undefined,
    }

    // Calculer les propriétés de focus
    const focusProps = focusable ? {
      tabIndex: 0,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
    } : {}

    // Classes CSS pour l'accessibilité
    const accessibilityClasses = cn(
      // Focus visible
      focusable && [
        "focus:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-ring",
        "focus-visible:ring-offset-2",
        preferences.highContrast && "focus-visible:ring-offset-background",
      ],
      // États visuels
      isFocused && "ring-2 ring-ring ring-offset-2",
      isSelected && "bg-accent",
      // Réduction de mouvement
      preferences.reducedMotion ? "transition-none" : "transition-all duration-200",
      // Navigation clavier
      preferences.keyboardNavigation && "keyboard-navigable",
      className
    )

    return (
      <Card
        ref={combinedRef}
        className={accessibilityClasses}
        {...ariaProps}
        {...focusProps}
        {...props}
      >
        {children}
        
        {/* Aide contextuelle pour les raccourcis clavier */}
        {keyboardActions.length > 0 && preferences.keyboardNavigation && (
          <div className="sr-only" aria-live="polite">
            Raccourcis disponibles: {keyboardActions.map(a => 
              `${a.ctrlKey ? 'Ctrl+' : ''}${a.altKey ? 'Alt+' : ''}${a.shiftKey ? 'Shift+' : ''}${a.key} pour ${a.description}`
            ).join(', ')}
          </div>
        )}
      </Card>
    )
  }
)

AccessibleCard.displayName = "AccessibleCard"

export { AccessibleCard }

// Composants spécialisés
export const InteractiveCard = React.forwardRef<HTMLDivElement, AccessibleCardProps>(
  (props, ref) => (
    <AccessibleCard
      ref={ref}
      focusable
      role="button"
      {...props}
    />
  )
)

InteractiveCard.displayName = "InteractiveCard"

export const SelectableCard = React.forwardRef<HTMLDivElement, AccessibleCardProps & {
  selected?: boolean
  onSelectionChange?: (selected: boolean) => void
}>(({ selected = false, onSelectionChange, ...props }, ref) => {
  const [isSelected, setIsSelected] = React.useState(selected)

  React.useEffect(() => {
    setIsSelected(selected)
  }, [selected])

  const handleClick = React.useCallback(() => {
    const newSelected = !isSelected
    setIsSelected(newSelected)
    onSelectionChange?.(newSelected)
  }, [isSelected, onSelectionChange])

  return (
    <AccessibleCard
      ref={ref}
      focusable
      role="option"
      ariaSelected={isSelected}
      onClick={handleClick}
      announceOnSelect={isSelected ? "Sélectionné" : "Désélectionné"}
      {...props}
    />
  )
})

SelectableCard.displayName = "SelectableCard"

export const ExpandableCard = React.forwardRef<HTMLDivElement, AccessibleCardProps & {
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  expandedContent?: React.ReactNode
}>(({ expanded = false, onExpandedChange, expandedContent, children, ...props }, ref) => {
  const [isExpanded, setIsExpanded] = React.useState(expanded)

  React.useEffect(() => {
    setIsExpanded(expanded)
  }, [expanded])

  const handleToggle = React.useCallback(() => {
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)
    onExpandedChange?.(newExpanded)
  }, [isExpanded, onExpandedChange])

  const keyboardActions: KeyboardAction[] = [
    {
      key: 'Enter',
      action: handleToggle,
      description: isExpanded ? 'Réduire' : 'Développer',
    },
    {
      key: ' ',
      action: handleToggle,
      description: isExpanded ? 'Réduire' : 'Développer',
    },
  ]

  return (
    <AccessibleCard
      ref={ref}
      focusable
      role="button"
      ariaExpanded={isExpanded}
      keyboardActions={keyboardActions}
      announceOnSelect={isExpanded ? "Contenu développé" : "Contenu réduit"}
      onClick={handleToggle}
      {...props}
    >
      {children}
      {isExpanded && expandedContent && (
        <div className="mt-4 pt-4 border-t">
          {expandedContent}
        </div>
      )}
    </AccessibleCard>
  )
})

ExpandableCard.displayName = "ExpandableCard"