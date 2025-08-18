"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils/cn"

// Enhanced Toast variants with modern designs
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 pr-8 shadow-enhanced-lg transition-all duration-300 data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        success: "border-success/20 bg-success/10 text-success-foreground backdrop-blur-sm",
        error: "border-destructive/20 bg-destructive/10 text-destructive-foreground backdrop-blur-sm",
        warning: "border-warning/20 bg-warning/10 text-warning-foreground backdrop-blur-sm",
        info: "border-info/20 bg-info/10 text-info-foreground backdrop-blur-sm",
      },
      size: {
        sm: "p-3 text-sm",
        md: "p-4",
        lg: "p-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

// Inline validation feedback
const validationVariants = cva(
  "flex items-center space-x-2 text-sm transition-all duration-200 animate-in slide-in-from-top-1",
  {
    variants: {
      variant: {
        success: "text-success",
        error: "text-destructive",
        warning: "text-warning",
        info: "text-info",
      },
    },
    defaultVariants: {
      variant: "error",
    },
  }
)

interface ValidationFeedbackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof validationVariants> {
  message: string
  icon?: boolean
}

const ValidationFeedback = React.forwardRef<HTMLDivElement, ValidationFeedbackProps>(
  ({ className, variant, message, icon = true, ...props }, ref) => {
    const IconComponent = {
      success: CheckCircle2,
      error: AlertCircle,
      warning: AlertTriangle,
      info: Info,
    }[variant || "error"]

    return (
      <div ref={ref} className={cn(validationVariants({ variant }), className)} {...props}>
        {icon && <IconComponent className="h-4 w-4 flex-shrink-0" />}
        <span>{message}</span>
      </div>
    )
  }
)
ValidationFeedback.displayName = "ValidationFeedback"

// Success state with celebration animation
interface SuccessStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  message?: string
  showConfetti?: boolean
  onComplete?: () => void
}

const SuccessState = React.forwardRef<HTMLDivElement, SuccessStateProps>(
  ({ className, title, message, showConfetti = false, onComplete, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false)

    React.useEffect(() => {
      setIsVisible(true)
      if (onComplete) {
        const timer = setTimeout(onComplete, 2000)
        return () => clearTimeout(timer)
      }
    }, [onComplete])

    return (
      <div 
        ref={ref} 
        className={cn(
          "flex flex-col items-center justify-center space-y-4 p-8 text-center",
          "animate-in fade-in-0 zoom-in-95 duration-500",
          className
        )} 
        {...props}
      >
        <div className="relative">
          <div className={cn(
            "rounded-full bg-success/10 p-4 transition-all duration-500",
            isVisible && "scale-110"
          )}>
            <CheckCircle2 className={cn(
              "h-12 w-12 text-success transition-all duration-500",
              isVisible && "animate-bounce"
            )} />
          </div>
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Simple confetti effect with CSS */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute h-2 w-2 rounded-full bg-success animate-ping",
                    `animate-delay-${i * 100}`
                  )}
                  style={{
                    left: `${20 + i * 10}%`,
                    top: `${10 + (i % 2) * 20}%`,
                    animationDuration: `${1 + i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
        
        {title && (
          <h3 className="text-lg font-semibold text-success animate-in slide-in-from-bottom-2 duration-700">
            {title}
          </h3>
        )}
        
        {message && (
          <p className="text-muted-foreground animate-in slide-in-from-bottom-3 duration-900">
            {message}
          </p>
        )}
      </div>
    )
  }
)
SuccessState.displayName = "SuccessState"

// Error state with retry functionality
interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
}

const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  ({ className, title, message, onRetry, retryLabel = "Try Again", ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn(
          "flex flex-col items-center justify-center space-y-4 p-8 text-center",
          "animate-in fade-in-0 slide-in-from-bottom-4 duration-500",
          className
        )} 
        {...props}
      >
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertCircle className="h-12 w-12 text-destructive animate-pulse" />
        </div>
        
        {title && (
          <h3 className="text-lg font-semibold text-destructive">
            {title}
          </h3>
        )}
        
        {message && (
          <p className="text-muted-foreground max-w-md">
            {message}
          </p>
        )}
        
        {onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              "inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground",
              "hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2",
              "transition-colors duration-200"
            )}
          >
            {retryLabel}
          </button>
        )}
      </div>
    )
  }
)
ErrorState.displayName = "ErrorState"

// Loading state with progress
interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string
  progress?: number
  showProgress?: boolean
}

const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ className, message, progress, showProgress = false, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn(
          "flex flex-col items-center justify-center space-y-4 p-8 text-center",
          className
        )} 
        {...props}
      >
        <div className="relative">
          <div className="rounded-full bg-primary/10 p-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
        
        {message && (
          <p className="text-muted-foreground animate-pulse">
            {message}
          </p>
        )}
        
        {showProgress && typeof progress === 'number' && (
          <div className="w-full max-w-xs space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}
      </div>
    )
  }
)
LoadingState.displayName = "LoadingState"

// Form field with validation
interface FormFieldWithValidationProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  error?: string
  success?: string
  warning?: string
  info?: string
  required?: boolean
  children: React.ReactNode
}

const FormFieldWithValidation = React.forwardRef<HTMLDivElement, FormFieldWithValidationProps>(
  ({ className, label, error, success, warning, info, required, children, ...props }, ref) => {
    const hasError = !!error
    const hasSuccess = !!success
    const hasWarning = !!warning
    const hasInfo = !!info

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        <label className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          hasError && "text-destructive",
          hasSuccess && "text-success"
        )}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        
        <div className={cn(
          "relative transition-all duration-200",
          hasError && "animate-shake"
        )}>
          {children}
        </div>
        
        {error && (
          <ValidationFeedback variant="error" message={error} />
        )}
        
        {success && !error && (
          <ValidationFeedback variant="success" message={success} />
        )}
        
        {warning && !error && !success && (
          <ValidationFeedback variant="warning" message={warning} />
        )}
        
        {info && !error && !success && !warning && (
          <ValidationFeedback variant="info" message={info} />
        )}
      </div>
    )
  }
)
FormFieldWithValidation.displayName = "FormFieldWithValidation"

export {
  ValidationFeedback,
  SuccessState,
  ErrorState,
  LoadingState,
  FormFieldWithValidation,
  toastVariants,
  validationVariants,
  type ValidationFeedbackProps,
  type SuccessStateProps,
  type ErrorStateProps,
  type LoadingStateProps,
  type FormFieldWithValidationProps,
}