"use client"

import React, { useEffect, useRef } from 'react'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { cn } from '@/lib/utils'

// Screen reader only text component
interface ScreenReaderOnlyProps {
  children: React.ReactNode
  className?: string
}

export function ScreenReaderOnly({ children, className }: ScreenReaderOnlyProps) {
  return (
    <span 
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        className
      )}
    >
      {children}
    </span>
  )
}

// Live region component for dynamic announcements
interface LiveRegionProps {
  children?: React.ReactNode
  priority?: 'polite' | 'assertive'
  atomic?: boolean
  relevant?: 'additions' | 'removals' | 'text' | 'all'
  className?: string
}

export function LiveRegion({ 
  children, 
  priority = 'polite', 
  atomic = true, 
  relevant = 'all',
  className 
}: LiveRegionProps) {
  return (
    <div
      aria-live={priority}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn("sr-only", className)}
    >
      {children}
    </div>
  )
}

// Component for announcing status changes
interface StatusAnnouncerProps {
  status: string
  priority?: 'polite' | 'assertive'
  delay?: number
}

export function StatusAnnouncer({ status, priority = 'polite', delay = 0 }: StatusAnnouncerProps) {
  const [announcement, setAnnouncement] = React.useState('')
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setAnnouncement(status)
      
      // Clear after announcement
      setTimeout(() => {
        setAnnouncement('')
      }, 1000)
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [status, delay])

  if (!announcement) return null

  return (
    <LiveRegion priority={priority}>
      {announcement}
    </LiveRegion>
  )
}

// Enhanced form field with proper labeling
interface AccessibleFormFieldProps {
  id: string
  label: string
  description?: string
  error?: string
  required?: boolean
  children: React.ReactElement
  className?: string
}

export function AccessibleFormField({
  id,
  label,
  description,
  error,
  required = false,
  children,
  className
}: AccessibleFormFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ')

  return (
    <div className={cn("space-y-2", className)}>
      <label 
        htmlFor={id}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && (
          <>
            <span className="text-destructive ml-1" aria-hidden="true">*</span>
            <ScreenReaderOnly>(requis)</ScreenReaderOnly>
          </>
        )}
      </label>
      
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {React.cloneElement(children, {
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? 'true' : undefined,
        'aria-required': required,
      })}
      
      {error && (
        <p 
          id={errorId} 
          className="text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  )
}

// Enhanced table with proper accessibility
interface AccessibleTableProps {
  caption?: string
  children: React.ReactNode
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

export function AccessibleTable({ 
  caption, 
  children, 
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy
}: AccessibleTableProps) {
  return (
    <table 
      className={cn("w-full", className)}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      {caption && <caption className="sr-only">{caption}</caption>}
      {children}
    </table>
  )
}

// Enhanced list with proper semantics
interface AccessibleListProps {
  children: React.ReactNode
  ordered?: boolean
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

export function AccessibleList({ 
  children, 
  ordered = false, 
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy
}: AccessibleListProps) {
  const Component = ordered ? 'ol' : 'ul'
  
  return (
    <Component 
      className={className}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      {children}
    </Component>
  )
}

// Progress indicator with screen reader support
interface AccessibleProgressProps {
  value: number
  max?: number
  label?: string
  description?: string
  className?: string
}

export function AccessibleProgress({ 
  value, 
  max = 100, 
  label, 
  description,
  className 
}: AccessibleProgressProps) {
  const percentage = Math.round((value / max) * 100)
  const progressId = React.useId()
  const labelId = label ? `${progressId}-label` : undefined
  const descriptionId = description ? `${progressId}-description` : undefined

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div id={labelId} className="text-sm font-medium">
          {label}
        </div>
      )}
      
      {description && (
        <div id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </div>
      )}
      
      <div className="relative">
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          className="w-full bg-secondary rounded-full h-2"
        >
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <ScreenReaderOnly>
          {percentage}% terminé
        </ScreenReaderOnly>
      </div>
    </div>
  )
}

// Enhanced button with loading and success states
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  success?: boolean
  loadingText?: string
  successText?: string
  children: React.ReactNode
}

export function AccessibleButton({
  loading = false,
  success = false,
  loadingText = "Chargement...",
  successText = "Terminé",
  children,
  disabled,
  ...props
}: AccessibleButtonProps) {
  const [previousSuccess, setPreviousSuccess] = React.useState(false)
  
  // Announce success state change
  useEffect(() => {
    if (success && !previousSuccess) {
      // Success state changed
    }
    setPreviousSuccess(success)
  }, [success, previousSuccess])

  const buttonText = loading ? loadingText : success ? successText : children
  const isDisabled = disabled || loading

  return (
    <>
      <button
        {...props}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-describedby={loading ? `${props.id}-status` : undefined}
      >
        {buttonText}
      </button>
      
      {loading && (
        <StatusAnnouncer 
          status={loadingText}
          priority="polite"
        />
      )}
      
      {success && (
        <StatusAnnouncer 
          status={successText}
          priority="polite"
        />
      )}
    </>
  )
}

// Hook for managing focus announcements
export function useFocusAnnouncement() {
  const { announceToScreenReader } = useAccessibility()

  const announceFocus = React.useCallback((element: HTMLElement, customMessage?: string) => {
    if (!element) return

    const role = element.getAttribute('role')
    const ariaLabel = element.getAttribute('aria-label')
    const textContent = element.textContent?.trim()
    const tagName = element.tagName.toLowerCase()

    let message = customMessage

    if (!message) {
      if (ariaLabel) {
        message = ariaLabel
      } else if (textContent) {
        message = textContent
      } else {
        // Fallback based on element type
        switch (tagName) {
          case 'button':
            message = 'Bouton'
            break
          case 'input':
            const inputType = element.getAttribute('type') || 'text'
            message = `Champ ${inputType}`
            break
          case 'select':
            message = 'Liste déroulante'
            break
          case 'textarea':
            message = 'Zone de texte'
            break
          default:
            message = role || tagName
        }
      }
    }

    if (message) {
      announceToScreenReader(`Focus sur: ${message}`, 'polite')
    }
  }, [announceToScreenReader])

  return { announceFocus }
}

// Component for complex UI descriptions
interface UIDescriptionProps {
  children: React.ReactNode
  for?: string
  className?: string
}

export function UIDescription({ children, for: htmlFor, className }: UIDescriptionProps) {
  const id = React.useId()

  return (
    <div
      id={htmlFor ? undefined : id}
      className={cn("sr-only", className)}
      role="img"
      aria-label={typeof children === 'string' ? children : undefined}
    >
      {children}
    </div>
  )
}

// Enhanced modal with proper screen reader support
interface AccessibleModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className
}: AccessibleModalProps) {
  const titleId = React.useId()
  const descriptionId = description ? React.useId() : undefined
  const { announceToScreenReader } = useAccessibility()

  useEffect(() => {
    if (isOpen) {
      announceToScreenReader(`Modal ouverte: ${title}`, 'assertive')
    }
  }, [isOpen, title, announceToScreenReader])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/50 backdrop-blur-sm",
        className
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <h2 id={titleId} className="text-lg font-semibold mb-4">
          {title}
        </h2>
        
        {description && (
          <p id={descriptionId} className="text-muted-foreground mb-4">
            {description}
          </p>
        )}
        
        {children}
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2"
          aria-label="Fermer la modal"
        >
          ×
        </button>
      </div>
    </div>
  )
}