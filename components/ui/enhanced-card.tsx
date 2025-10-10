import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  generateAriaAttributes,
  generateId,
  type AccessibilityDescriptor,
} from "@/lib/utils/accessibility";

const cardVariants = cva(
  "rounded-lg border text-card-foreground transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        default: "bg-card shadow-enhanced-sm hover:shadow-enhanced-md",
        gradient:
          "bg-gradient-subtle shadow-enhanced-md hover:shadow-enhanced-lg border-primary/20",
        glass: "glass-effect shadow-enhanced-lg hover:shadow-enhanced-xl",
        elevated:
          "bg-card shadow-enhanced-lg hover:shadow-enhanced-xl hover:-translate-y-1",
      },
      interactive: {
        true: "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        false: "",
      },
      loading: {
        true: "animate-pulse pointer-events-none",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
      loading: false,
    },
  },
);

export interface EnhancedCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  skeleton?: boolean;
  accessibility?: AccessibilityDescriptor;
}

const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  (
    {
      className,
      variant,
      interactive,
      loading,
      skeleton,
      accessibility,
      children,
      ...props
    },
    ref,
  ) => {
    const descriptionId = React.useMemo(() => generateId(), []);
    const ariaAttributes = accessibility
      ? generateAriaAttributes(accessibility)
      : {};

    if (skeleton) {
      return (
        <div
          ref={ref}
          className={cn(
            cardVariants({ variant, interactive: false, loading: false }),
            "animate-pulse",
            className,
          )}
          role="status"
          aria-label="Chargement du contenu de la carte"
          aria-busy="true"
          {...props}
        >
          <div className="p-6 space-y-4">
            <div className="h-4 bg-muted rounded animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]" />
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]" />
              <div className="h-3 bg-muted rounded w-3/4 animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, interactive, loading }),
          className,
        )}
        role={interactive ? "button" : "region"}
        tabIndex={interactive ? 0 : undefined}
        aria-busy={loading ?? undefined}
        {...ariaAttributes}
        {...props}
      >
        {accessibility?.description && (
          <div id={descriptionId} className="sr-only">
            {accessibility.description}
          </div>
        )}
        {children}
      </div>
    );
  },
);
EnhancedCard.displayName = "EnhancedCard";

const EnhancedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
EnhancedCardHeader.displayName = "EnhancedCardHeader";

const EnhancedCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
  }
>(({ className, level = 3, children, ...props }, ref) => {
  const Heading = `h${level}` as keyof JSX.IntrinsicElements;

  return React.createElement(
    Heading,
    {
      ref,
      className: cn("typography-heading", className),
      ...props,
    },
    children,
  );
});
EnhancedCardTitle.displayName = "EnhancedCardTitle";

const EnhancedCardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("typography-body text-muted-foreground", className)}
    {...props}
  />
));
EnhancedCardDescription.displayName = "EnhancedCardDescription";

const EnhancedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
EnhancedCardContent.displayName = "EnhancedCardContent";

const EnhancedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
EnhancedCardFooter.displayName = "EnhancedCardFooter";

export {
  EnhancedCard,
  EnhancedCardHeader,
  EnhancedCardFooter,
  EnhancedCardTitle,
  EnhancedCardDescription,
  EnhancedCardContent,
};
