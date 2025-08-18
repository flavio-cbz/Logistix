"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2, Check } from "lucide-react"
import { useLiveRegionContext } from "@/components/ui/live-region"
import { createInteractionDescription } from "@/lib/utils/accessibility"

const animatedButtonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-[1.02] active:scale-[0.98]",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:scale-[1.02] active:scale-[0.98]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-[1.02] active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:scale-[1.02] active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-success text-success-foreground hover:bg-success/90 hover:scale-[1.02] active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
      loading: {
        true: "pointer-events-none",
        false: "",
      },
      success: {
        true: "bg-success text-success-foreground",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      loading: false,
      success: false,
    },
  }
)

export interface AnimatedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof animatedButtonVariants> {
  asChild?: boolean
  ripple?: boolean
  loading?: boolean
  success?: boolean
  haptic?: boolean
  loadingText?: string
  successText?: string
  announceStateChanges?: boolean
  screenReaderDescription?: string
}

interface RippleEffect {
  x: number
  y: number
  size: number
  id: number
}

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    ripple = true,
    loading = false,
    success = false,
    haptic = false,
    loadingText,
    successText,
    announceStateChanges = true,
    screenReaderDescription,
    children,
    onClick,
    ...props 
  }, ref) => {
    const [ripples, setRipples] = React.useState<RippleEffect[]>([])
    const [isSuccess, setIsSuccess] = React.useState(false)
    const buttonRef = React.useRef<HTMLButtonElement>(null)
    const { announce } = useLiveRegionContext()
    
    // Combine refs
    React.useImperativeHandle(ref, () => buttonRef.current!)

    // Handle success state
    React.useEffect(() => {
      if (success) {
        setIsSuccess(true)
        if (announceStateChanges) {
          announce(successText || "Action réussie", 'polite')
        }
        const timer = setTimeout(() => setIsSuccess(false), 2000)
        return () => clearTimeout(timer)
      }
    }, [success, announceStateChanges, successText, announce])

    // Handle loading state announcements
    React.useEffect(() => {
      if (loading && announceStateChanges) {
        announce(loadingText || "Chargement en cours", 'polite')
      }
    }, [loading, announceStateChanges, loadingText, announce])

    const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!ripple || loading || isSuccess) return

      const button = event.currentTarget
      const rect = button.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = event.clientX - rect.left - size / 2
      const y = event.clientY - rect.top - size / 2

      const newRipple: RippleEffect = {
        x,
        y,
        size,
        id: Date.now(),
      }

      setRipples(prev => [...prev, newRipple])

      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id))
      }, 600)
    }

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      // Haptic feedback simulation (vibration on supported devices)
      if (haptic && 'vibrate' in navigator) {
        navigator.vibrate(50)
      }

      createRipple(event)
      
      if (onClick && !loading && !isSuccess) {
        onClick(event)
      }
    }

    // Generate comprehensive accessibility attributes
    const getAriaAttributes = () => {
      const attributes: Record<string, string | boolean> = {}
      
      if (loading) {
        attributes['aria-busy'] = true
        attributes['aria-disabled'] = true
      }
      
      if (isSuccess) {
        attributes['aria-pressed'] = true
      }
      
      if (screenReaderDescription) {
        attributes['aria-describedby'] = `btn-desc-${buttonRef.current?.id || 'default'}`
      }
      
      return attributes
    }

    const Comp = asChild ? Slot : "button"

    const buttonContent = () => {
      if (loading) {
        return (
          <>
            <Loader2 className="animate-spin" />
            {loadingText || "Loading..."}
          </>
        )
      }

      if (isSuccess) {
        return (
          <>
            <Check className="animate-scale-in" />
            {successText || "Success!"}
          </>
        )
      }

      return children
    }

    return (
      <>
        <Comp
          ref={buttonRef}
          className={cn(
            animatedButtonVariants({ 
              variant: isSuccess ? "success" : variant, 
              size, 
              loading, 
              success: isSuccess 
            }), 
            className
          )}
          onClick={handleClick}
          disabled={loading || isSuccess}
          {...getAriaAttributes()}
          {...props}
        >
        {/* Ripple effects */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 animate-ping pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              animationDuration: '600ms',
              animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        ))}
        
        {/* Button content */}
        <span className={cn(
          "relative z-10 flex items-center gap-2 transition-all duration-200",
          loading && "opacity-100",
          isSuccess && "animate-fade-in"
        )}>
          {buttonContent()}
        </span>
      </Comp>
      
      {/* Screen reader description */}
      {screenReaderDescription && (
        <div 
          id={`btn-desc-${buttonRef.current?.id || 'default'}`}
          className="sr-only"
        >
          {screenReaderDescription}
        </div>
      )}
    </>
    )
  }
)

AnimatedButton.displayName = "AnimatedButton"

export { AnimatedButton, animatedButtonVariants }