// Profil Button flottant en haut à droite
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Package2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

interface AppHeaderProps {
  className?: string;
  variant?: "default" | "compact" | "minimal";
  showBreadcrumb?: boolean;
}

export function AppHeader({
  className,
  variant = "default",
  showBreadcrumb = true,
}: AppHeaderProps) {
  const pathname = usePathname();
  // const { theme } = useTheme(); // (optionnel)

  // Get page title from pathname
  const getPageTitle = (path: string) => {
    const segments = path.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "dashboard";

    const titles: Record<string, string> = {
      dashboard: "Tableau de bord",
      parcelles: "Colis",
      produits: "Produits",
      statistiques: "Statistiques",
      
      validation: "Validation",
      profile: "Profil",
    };

  return titles[lastSegment] || "Logistix";
  };

  const pageTitle = getPageTitle(pathname);
  const isCompact = variant === "compact";
  const isMinimal = variant === "minimal";

  return (
    <div
      className={cn(
        "flex items-center justify-between w-full max-w-screen-xl mx-auto px-4 transition-all duration-300",
        isMinimal ? "py-3" : isCompact ? "py-4" : "py-6",
        className,
      )}
    >
      {/* Logo and Title Section */}
      <div
        className={cn(
          "flex items-center gap-3 sm:gap-4 md:gap-6 min-w-0",
          !isMinimal && "flex-1",
        )}
      >
        {/* Enhanced Logo */}
        <div
          className={cn(
            "relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg",
            "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
            isMinimal ? "w-8 h-8" : isCompact ? "w-10 h-10" : "w-12 h-12",
            "transition-transform duration-200 hover:scale-[1.05] hover:rotate-2 active:scale-[0.95]",
          )}
        >
          <Package2
            className={cn(
              "h-6 w-6 shrink-0 transition-colors duration-200",
              "relative z-10 transition-transform duration-300",
              isMinimal ? "w-4 h-4" : isCompact ? "w-5 h-5" : "w-6 h-6",
            )}
          />
          {/* Sparkle effect */}
          <div className="absolute -top-1 -right-1">
            <Sparkles className="w-3 h-3 text-[hsl(var(--warning-foreground))]" />
          </div>
        </div>
        {/* Title and Description */}
        {!isMinimal && (
          <div className="transition-all duration-300">
            <div className="flex items-center gap-2">
              <h1
                className={cn(
                  "font-bold tracking-tight leading-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent truncate",
                  isCompact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl",
                )}
              >
                Logistix
              </h1>
              {/* Page indicator */}
              {showBreadcrumb && pageTitle !== "Logistix" && (
                <div className="flex items-center gap-1 transition-all duration-300">
                  <span className="text-muted-foreground">•</span>
                  <span
                    className={cn(
                      "font-medium text-primary",
                      isCompact ? "text-sm" : "text-base",
                    )}
                  >
                    {pageTitle}
                  </span>
                </div>
              )}
            </div>
            {!isCompact && (
              <p className="text-sm text-muted-foreground mt-0.5 transition-opacity duration-300">
                Gestion intelligente de vos colis et produits
              </p>
            )}
          </div>
        )}
      </div>
      {/* Actions Section */}
      <div className="flex items-center gap-3 sm:gap-4 md:gap-6 transition-all duration-300 flex-shrink-0 ml-3">
        {/* Theme Toggle */}
        <ThemeToggle />
        {/* Profil Button à côté du ThemeToggle */}
        <Link
          href="/profile"
          className="flex items-center justify-center rounded-full bg-muted h-8 w-8 sm:h-9 sm:w-9 p-2 sm:p-2.5 hover:bg-primary/10 transition"
          aria-label="Profil"
        >
          <User className="w-5 h-5 text-primary" />
        </Link>
      </div>
    </div>
  );
}
