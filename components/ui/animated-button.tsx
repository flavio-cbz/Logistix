"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// import { Haptics } from "@/lib/utils/haptics" // Supprimé car le module n'existe pas

// import { ScreenReader } from "@/components/accessibility/screen-reader" // Supprimé car l'export n'existe pas
// import { motion } from "framer-motion" // Removed unused motion import
import { Loader2, Check } from "lucide-react"; // Importation de Loader2 et Check

const animatedButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-[1.02] active:scale-[0.98]",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:scale-[1.02] active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-[1.02] active:scale-[0.98]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground hover:scale-[1.02] active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-success text-success-foreground hover:bg-success/90 hover:scale-[1.02] active:scale-[0.98]",
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
      // loading et success ne sont pas des variants de style, ils sont gérés par la logique du composant
    },
  },
);

export interface AnimatedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof animatedButtonVariants> {
  asChild?: boolean;
  ripple?: boolean;
  loading?: boolean;
  success?: boolean;
  haptic?: boolean;
  loadingText?: string;
  successText?: string;
  announceStateChanges?: boolean;
  screenReaderDescription?: string;
}

interface RippleEffect {
  x: number;
  y: number;
  size: number;
  id: number;
}

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  (
    {
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
    },
    ref,
  ) => {
    const [ripples, setRipples] = React.useState<RippleEffect[]>([]);

    const [isSuccess, setIsSuccess] = React.useState(false);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    // const { announce } = useLiveRegionContext() // Commenté car le hook n'est pas importé

    // Use callback ref to properly handle ref forwarding without causing infinite loops
    const handleRef = React.useCallback((node: HTMLButtonElement | null) => {
      // @ts-ignore - buttonRef is a mutable ref object
      buttonRef.current = node;
      
      // Handle the external ref
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        // @ts-ignore - ref can be an object with current property
        ref.current = node;
      }
    }, [ref]);

    // Generate a stable ID for screen reader description during initial render
    const [screenReaderId] = React.useState(() => 
      `btn-desc-${Math.random().toString(36).substring(2, 9)}`
    );

    // Handle success state
    React.useEffect(() => {
      if (success) {
        setIsSuccess(true);
        if (announceStateChanges) {
          // announce(successText || "Action réussie", 'polite') // Commenté car le hook n'est pas importé
        }

        const timer = setTimeout(() => setIsSuccess(false), 2000);
        return () => clearTimeout(timer);
      }
      return () => {}; // Ajout d'une clause de retour explicite
    }, [success, announceStateChanges, successText /*, announce*/]); // Commenté car le hook n'est pas importé

    // Handle loading state announcements
    React.useEffect(() => {
      if (loading && announceStateChanges) {
        // announce(loadingText || "Chargement en cours", 'polite') // Commenté car le hook n'est pas importé
      }
      return () => {}; // Ajout d'une clause de retour explicite
    }, [loading, announceStateChanges, loadingText /*, announce*/]); // Commenté car le hook n'est pas importé

    const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!ripple || loading || isSuccess) return;

      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;

      const newRipple: RippleEffect = {
        x,
        y,
        size,
        id: Date.now(),
      };

      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) =>
          prev.filter((ripple) => ripple.id !== newRipple.id),
        );
      }, 600);
    };

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      // Haptic feedback simulation (vibration on supported devices)
      if (haptic && "vibrate" in navigator) {
        navigator.vibrate(50);
      }

      createRipple(event);

      if (onClick && !loading && !isSuccess) {
        onClick(event);
      }
    };

    // Generate comprehensive accessibility attributes
    const getAriaAttributes = React.useCallback(() => {
      const attributes: Record<string, string | boolean> = {};

      if (loading) {
        attributes["aria-busy"] = true;
        attributes["aria-disabled"] = true;
      }

      if (isSuccess) {
        attributes["aria-pressed"] = true;
      }

      if (screenReaderDescription) {
        attributes["aria-describedby"] = screenReaderId;
      }

      return attributes;
    }, [loading, isSuccess, screenReaderDescription, screenReaderId]);

    const Comp = asChild ? Slot : "button";

    const buttonContent = React.useCallback(() => {
      if (loading) {
        return (
          <>
            <Loader2 className="animate-spin" />
            {loadingText || "Loading..."}
          </>
        );
      }

      if (isSuccess) {
        return (
          <>
            <Check className="animate-scale-in" />
            {successText || "Success!"}
          </>
        );
      }

      return children;
    }, [loading, loadingText, isSuccess, successText, children]);

    return (
      <>
        <Comp
          ref={handleRef}
          className={cn(
            animatedButtonVariants({
              variant: isSuccess ? "success" : variant,
              size,
              // loading et success ne sont pas des variants de style
            }),
            className,
          )}
          onClick={handleClick!}
          disabled={loading || isSuccess}
          {...getAriaAttributes()}
          {...props}
        >
          {/* Ripple effects */}
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="absolute rounded-full bg-[hsl(var(--glass-bg))] animate-ping pointer-events-none"
              style={{
                left: ripple.x,
                top: ripple.y,
                width: ripple.size,
                height: ripple.size,
                animationDuration: "600ms",
                animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          ))}

          {/* Button content */}
          <span
            className={cn(
              "relative z-10 flex items-center gap-2 transition-all duration-200",
              loading && "opacity-100",
              isSuccess && "animate-fade-in",
            )}
          >
            {buttonContent()}
          </span>
        </Comp>

        {/* Screen reader description */}
        {screenReaderDescription && (
          <div
            id={screenReaderId}
            className="sr-only"
          >
            {screenReaderDescription}
          </div>
        )}
      </>
    );
  },
);

AnimatedButton.displayName = "AnimatedButton";

export { AnimatedButton, animatedButtonVariants };
