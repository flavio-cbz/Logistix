"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
// import { Haptics } from "@/lib/utils/haptics" // Supprimé car le module n'existe pas

// import { ScreenReaderOnly } from "@/components/accessibility/screen-reader" // Reviendra à l'importation correcte


const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  ripple?: boolean
  haptic?: boolean
  screenReaderDescription?: string
}

const AccessibleButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { 
      className, 
      variant, 
      size, 
      asChild = false, 
      ripple = false, 
      haptic = false,
      screenReaderDescription,
      children,
      ...props 
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    
    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      
      if (ripple) {
        const button = e.currentTarget
        const diameter = Math.max(button.clientWidth, button.clientHeight)
        const radius = diameter / 2
        const circle = document.createElement("span")
        circle.style.width = circle.style.height = `${diameter}px`
        circle.style.left = `${e.clientX - (button.offsetLeft + radius)}px`
        circle.style.top = `${e.clientY - (button.offsetTop + radius)}px`
        circle.classList.add("ripple")
        const rippleElement = button.getElementsByClassName("ripple")[0]
        if (rippleElement) {
          rippleElement.remove()
        }
        button.appendChild(circle)
      }
      if (haptic) {
        // Haptics.light() // Commenté car le module n'existe pas
      }
      props.onMouseDown?.(e)
    }

    const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
      
      props.onMouseUp?.(e)
    }

    const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
      
      if (haptic) {
        // Haptics.light() // Commenté car le module n'existe pas
      }
      props.onTouchStart?.(e)
    }

    const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
      
      props.onTouchEnd?.(e)
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        
        {...props}
      >
        {children}
        {screenReaderDescription && (
          <span className="sr-only">{screenReaderDescription}</span> // Alternative pour screen reader
        )}
      </Comp>
    )
  }
)
AccessibleButton.displayName = "AccessibleButton"

export { AccessibleButton, buttonVariants }