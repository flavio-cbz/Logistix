"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { useAccessibility } from "@/lib/contexts/accessibility-context"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  
  // Propriétés d'accessibilité
  ariaLabel?: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  ariaExpanded?: boolean
  ariaPressed?: boolean
  ariaHasPopup?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
  
  // États de chargement et de progression
  loading?: boolean
  loadingText?: string
  progress?: number // 0-100 pour les barres de progression
  
  // Annonces pour lecteurs d'écran
  announceOnClick?: string
  announceOnFocus?: string
  
  // Confirmation d'action
  requireConfirmation?: boolean
  confirmationMessage?: string
  
  // Raccourcis clavier
  shortcut?: {
    key: string
    ctrlKey?: boolean
    altKey?: boolean
    shiftKey?: boolean
  }
  
  // Tooltip accessible
  tooltip?: string
  tooltipId?: string
}

const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
    ariaExpanded,
    ariaPressed,
    ariaHasPopup,
    loading = false,
    loadingText = "Chargement...",
    progress,
    announceOnClick,
    announceOnFocus,
    requireConfirmation = false,
    confirmationMessage = "Êtes-vous sûr de vouloir effectuer cette action ?",
    shortcut,
    tooltip,
    tooltipId,
    disabled,
    onClick,
    onFocus,
    children,
    ...props
  }, ref) => {
    const { announceToScreenReader, preferences, keyboardNavigation } = useAccessibility()
    const [isConfirming, setIsConfirming] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)
    const confirmTimeoutRef = React.useRef<NodeJS.Timeout>()

    // Générer un ID unique pour le tooltip si nécessaire
    const generatedTooltipId = React.useId()
    const effectiveTooltipId = tooltipId || (tooltip ? generatedTooltipId : undefined)

    // Enregistrer le raccourci clavier
    React.useEffect(() => {
      if (shortcut && !disabled && !loading) {
        const unregister = keyboardNavigation.registerShortcut({
          key: shortcut.key,
          description: `Activer ${ariaLabel || 'bouton'}`,
          category: 'Boutons',
          action: () => {
            if (onClick) {
              const syntheticEvent = new MouseEvent('click', { bubbles: true })
              onClick(syntheticEvent as any)
            }
          },
          ctrlKey: shortcut.ctrlKey,
          altKey: shortcut.altKey,
          shiftKey: shortcut.shiftKey,
        })

        return unregister
      }
    }, [shortcut, disabled, loading, onClick, ariaLabel, keyboardNavigation])

    // Gestionnaire de clic avec confirmation
    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) {
        event.preventDefault()
        return
      }

      if (requireConfirmation && !isConfirming) {
        event.preventDefault()
        setIsConfirming(true)
        announceToScreenReader(`${confirmationMessage} Cliquez à nouveau pour confirmer.`, 'assertive')
        
        // Auto-annuler après 3 secondes
        confirmTimeoutRef.current = setTimeout(() => {
          setIsConfirming(false)
          announceToScreenReader('Confirmation annulée')
        }, 3000)
        
        return
      }

      // Nettoyer le timeout de confirmation
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current)
        confirmTimeoutRef.current = undefined
      }
      
      setIsConfirming(false)

      if (announceOnClick) {
        announceToScreenReader(announceOnClick)
      }

      onClick?.(event)
    }, [loading, disabled, requireConfirmation, isConfirming, confirmationMessage, announceOnClick, announceToScreenReader, onClick])

    // Gestionnaire de focus
    const handleFocus = React.useCallback((event: React.FocusEvent<HTMLButtonElement>) => {
      setIsFocused(true)
      
      if (announceOnFocus) {
        announceToScreenReader(announceOnFocus)
      }

      onFocus?.(event)
    }, [announceOnFocus, announceToScreenReader, onFocus])

    // Gestionnaire de blur
    const handleBlur = React.useCallback(() => {
      setIsFocused(false)
      
      // Annuler la confirmation si on perd le focus
      if (isConfirming) {
        setIsConfirming(false)
        if (confirmTimeoutRef.current) {
          clearTimeout(confirmTimeoutRef.current)
          confirmTimeoutRef.current = undefined
        }
      }
    }, [isConfirming])

    // Nettoyer les timeouts
    React.useEffect(() => {
      return () => {
        if (confirmTimeoutRef.current) {
          clearTimeout(confirmTimeoutRef.current)
        }
      }
    }, [])

    // Calculer les propriétés ARIA
    const ariaProps = {
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': cn(
        ariaDescribedBy,
        effectiveTooltipId,
        loading && 'loading-status',
        progress !== undefined && 'progress-status'
      ).trim() || undefined,
      'aria-expanded': ariaExpanded,
      'aria-pressed': ariaPressed,
      'aria-haspopup': ariaHasPopup,
      'aria-busy': loading,
      'aria-disabled': disabled || loading,
    }

    // Classes CSS pour l'accessibilité
    const accessibilityClasses = cn(
      buttonVariants({ variant, size, className }),
      // Contraste élevé
      preferences.highContrast && [
        "border-2",
        variant === 'outline' && "border-foreground",
        variant === 'ghost' && "border border-foreground/20 hover:border-foreground",
      ],
      // Réduction de mouvement
      preferences.reducedMotion && "transition-none",
      // État de confirmation
      isConfirming && "ring-2 ring-warning ring-offset-2 bg-warning/10",
      // État de chargement
      loading && "opacity-75 cursor-wait",
      // Navigation clavier
      preferences.keyboardNavigation && "keyboard-navigable"
    )

    const Comp = asChild ? Slot : "button"

    return (
      <>
        <Comp
          ref={ref}
          className={accessibilityClasses}
          disabled={disabled || loading}
          onClick={handleClick}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...ariaProps}
          {...props}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div 
                className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"
                aria-hidden="true"
              />
              <span>{loadingText}</span>
            </div>
          ) : (
            <>
              {children}
              {isConfirming && (
                <span className="ml-2 text-xs" aria-hidden="true">
                  (Confirmer)
                </span>
              )}
            </>
          )}
        </Comp>

        {/* Statut de chargement pour lecteurs d'écran */}
        {loading && (
          <div id="loading-status" className="sr-only" aria-live="polite">
            {loadingText}
          </div>
        )}

        {/* Statut de progression pour lecteurs d'écran */}
        {progress !== undefined && (
          <div id="progress-status" className="sr-only" aria-live="polite">
            Progression: {Math.round(progress)}%
          </div>
        )}

        {/* Tooltip accessible */}
        {tooltip && (
          <div
            id={effectiveTooltipId}
            role="tooltip"
            className={cn(
              "absolute z-50 px-3 py-1.5 text-xs text-popover-foreground bg-popover border rounded-md shadow-md",
              "opacity-0 pointer-events-none transition-opacity",
              isFocused && "opacity-100",
              preferences.reducedMotion && "transition-none"
            )}
            style={{
              top: '-2.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {tooltip}
            {shortcut && (
              <span className="ml-2 text-muted-foreground">
                ({shortcut.ctrlKey ? 'Ctrl+' : ''}{shortcut.altKey ? 'Alt+' : ''}{shortcut.shiftKey ? 'Shift+' : ''}{shortcut.key})
              </span>
            )}
          </div>
        )}
      </>
    )
  }
)

AccessibleButton.displayName = "AccessibleButton"

export { AccessibleButton, buttonVariants }

// Composants spécialisés
export const LoadingButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps & {
  isLoading?: boolean
}>(({ isLoading, children, ...props }, ref) => (
  <AccessibleButton
    ref={ref}
    loading={isLoading}
    {...props}
  >
    {children}
  </AccessibleButton>
))

LoadingButton.displayName = "LoadingButton"

export const ConfirmButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (props, ref) => (
    <AccessibleButton
      ref={ref}
      requireConfirmation
      variant="destructive"
      {...props}
    />
  )
)

ConfirmButton.displayName = "ConfirmButton"

export const IconButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps & {
  icon: React.ReactNode
  label: string
}>(({ icon, label, children, ...props }, ref) => (
  <AccessibleButton
    ref={ref}
    size="icon"
    ariaLabel={label}
    tooltip={label}
    {...props}
  >
    {icon}
    <span className="sr-only">{label}</span>
    {children}
  </AccessibleButton>
))

IconButton.displayName = "IconButton"