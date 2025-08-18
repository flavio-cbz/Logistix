"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { useAccessibility } from "@/lib/contexts/accessibility-context"
import { useModalFocus } from "@/lib/hooks/use-focus-management"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal

export interface AccessibleModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  
  // Propriétés d'accessibilité
  title: string
  description?: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  
  // Comportement
  closeOnEscape?: boolean
  closeOnOverlayClick?: boolean
  preventScroll?: boolean
  
  // Annonces
  announceOnOpen?: string
  announceOnClose?: string
  
  // Taille et position
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  position?: 'center' | 'top' | 'bottom'
  
  // Callbacks
  onOpen?: () => void
  onClose?: () => void
}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & {
    preferences?: any
  }
>(({ className, preferences, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      preferences?.reducedMotion && "animate-none",
      preferences?.highContrast && "bg-background/95",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    position?: 'center' | 'top' | 'bottom'
    preferences?: any
    showCloseButton?: boolean
    closeButtonLabel?: string
  }
>(({ 
  className, 
  children, 
  size = 'md', 
  position = 'center',
  preferences,
  showCloseButton = true,
  closeButtonLabel = "Fermer",
  ...props 
}, ref) => {
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[95vw] max-h-[95vh]"
  }

  const positionClasses = {
    center: "top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]",
    top: "top-[10%] left-[50%] translate-x-[-50%]",
    bottom: "bottom-[10%] left-[50%] translate-x-[-50%]"
  }

  return (
    <DialogPortal>
      <DialogOverlay preferences={preferences} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 grid w-full gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          sizeClasses[size],
          positionClasses[position],
          preferences?.reducedMotion && "animate-none duration-0",
          preferences?.highContrast && "border-2 border-foreground",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">{closeButtonLabel}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

// Composant principal AccessibleModal
const AccessibleModal = React.forwardRef<HTMLDivElement, AccessibleModalProps>(({
  open,
  onOpenChange,
  children,
  title,
  description,
  ariaLabelledBy,
  ariaDescribedBy,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  preventScroll = true,
  announceOnOpen,
  announceOnClose,
  size = 'md',
  position = 'center',
  onOpen,
  onClose,
}, ref) => {
  const { announceToScreenReader, preferences } = useAccessibility()
  const { containerRef } = useModalFocus()
  const titleId = React.useId()
  const descriptionId = React.useId()

  // Gérer les annonces d'ouverture/fermeture
  React.useEffect(() => {
    if (open) {
      onOpen?.()
      if (announceOnOpen) {
        // Délai pour laisser le temps au modal de s'afficher
        setTimeout(() => {
          announceToScreenReader(announceOnOpen, 'assertive')
        }, 100)
      }
    } else {
      onClose?.()
      if (announceOnClose) {
        announceToScreenReader(announceOnClose)
      }
    }
  }, [open, onOpen, onClose, announceOnOpen, announceOnClose, announceToScreenReader])

  // Gérer le scroll du body
  React.useEffect(() => {
    if (preventScroll && open) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [preventScroll, open])

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    onOpenChange?.(newOpen)
  }, [onOpenChange])

  const handleEscapeKeyDown = React.useCallback((event: KeyboardEvent) => {
    if (!closeOnEscape) {
      event.preventDefault()
    }
  }, [closeOnEscape])

  const handlePointerDownOutside = React.useCallback((event: Event) => {
    if (!closeOnOverlayClick) {
      event.preventDefault()
    }
  }, [closeOnOverlayClick])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        ref={containerRef as unknown as React.Ref<HTMLDivElement>}
        size={size}
        position={position}
        preferences={preferences}
        aria-labelledby={ariaLabelledBy || titleId}
        aria-describedby={ariaDescribedBy || (description ? descriptionId : undefined)}
        onEscapeKeyDown={handleEscapeKeyDown}
        onPointerDownOutside={handlePointerDownOutside}
      >
        <DialogHeader>
          <DialogTitle id={titleId}>
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription id={descriptionId}>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
})

AccessibleModal.displayName = "AccessibleModal"

// Composants spécialisés
export const ConfirmationModal = React.forwardRef<HTMLDivElement, AccessibleModalProps & {
  onConfirm: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
}>(({
  onConfirm,
  onCancel,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  variant = 'default',
  children,
  ...props
}, ref) => {
  const handleConfirm = React.useCallback(() => {
    onConfirm()
    props.onOpenChange?.(false)
  }, [onConfirm, props])

  const handleCancel = React.useCallback(() => {
    onCancel?.()
    props.onOpenChange?.(false)
  }, [onCancel, props])

  return (
    <AccessibleModal ref={ref} {...props}>
      <div className="space-y-4">
        {children}
        
        <DialogFooter>
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={cn(
              "px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2",
              variant === 'destructive' 
                ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
            )}
          >
            {confirmText}
          </button>
        </DialogFooter>
      </div>
    </AccessibleModal>
  )
})

ConfirmationModal.displayName = "ConfirmationModal"

export const AlertModal = React.forwardRef<HTMLDivElement, AccessibleModalProps & {
  type?: 'info' | 'warning' | 'error' | 'success'
  onAcknowledge?: () => void
  acknowledgeText?: string
}>(({
  type = 'info',
  onAcknowledge,
  acknowledgeText = "OK",
  children,
  ...props
}, ref) => {
  const handleAcknowledge = React.useCallback(() => {
    onAcknowledge?.()
    props.onOpenChange?.(false)
  }, [onAcknowledge, props])

  const typeIcons = {
    info: "ℹ️",
    warning: "⚠️",
    error: "❌",
    success: "✅"
  }

  return (
    <AccessibleModal 
      ref={ref} 
      {...props}
      announceOnOpen={`${type === 'error' ? 'Erreur' : type === 'warning' ? 'Attention' : 'Information'}: ${props.title}`}
    >
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <span className="text-2xl" aria-hidden="true">
            {typeIcons[type]}
          </span>
          <div className="flex-1">
            {children}
          </div>
        </div>
        
        <DialogFooter>
          <button
            type="button"
            onClick={handleAcknowledge}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {acknowledgeText}
          </button>
        </DialogFooter>
      </div>
    </AccessibleModal>
  )
})

AlertModal.displayName = "AlertModal"

export {
  AccessibleModal,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}