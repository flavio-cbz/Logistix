"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Package2, 
  Settings, 
  ChevronRight,
  Sparkles,
  Zap,
  BarChart3,
  Package,
  ShoppingCart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { useAuth } from "@/components/auth/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { MobileNavDrawer } from "./mobile-nav-drawer";
import { useHeaderAnimations, useSearchState } from "@/lib/hooks/useHeaderAnimations";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
    description: "Vue d'ensemble des performances",
    color: "from-blue-500 to-blue-600"
  },
  {
    title: "Parcelles",
    href: "/parcelles",
    icon: Package,
    description: "Gestion des expéditions et colis",
    color: "from-emerald-500 to-emerald-600"
  },
  {
    title: "Produits",
    href: "/produits",
    icon: ShoppingCart,
    description: "Gestion des produits",
    color: "from-green-500 to-green-600"
  },
  {
    title: "Statistiques",
    href: "/statistiques",
    icon: BarChart3,
    description: "Métriques avancées",
    color: "from-orange-500 to-orange-600"
  },
];

export function HorizontalNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState<string | null>(null);
  
  // Hooks personnalisés pour les animations
  const { scrolled } = useHeaderAnimations();
  const { isSearchFocused } = useSearchState();

  return (
    <nav 
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-500 ease-out",
        "backdrop-blur-xl border-b border-white/10",
        scrolled 
          ? "bg-background/80 shadow-xl shadow-black/5" 
          : "bg-background/95",
        "supports-[backdrop-filter]:bg-background/60"
      )}
    >
      {/* Container principal avec glassmorphisme */}
      <div className="relative">
        {/* Gradient overlay subtil */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50" />
        
        <div className="relative flex items-center justify-between px-4 lg:px-6 h-16">
          {/* Section gauche - Menu mobile + Logo + Navigation */}
          <div className="flex items-center gap-4 lg:gap-8">
            {/* Menu mobile */}
            <MobileNavDrawer />
            
            {/* Logo moderne avec effet premium */}
            <Link
              href="/dashboard"
              className="group flex items-center gap-3 hover:scale-[1.02] transition-all duration-300"
            >
              <div className="relative">
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-2xl",
                  "bg-gradient-to-br from-primary via-primary/90 to-primary/70",
                  "shadow-lg shadow-primary/25",
                  "group-hover:shadow-xl group-hover:shadow-primary/30",
                  "transition-all duration-300 group-hover:rotate-2"
                )}>
                  <Package2 className="w-5 h-5 text-primary-foreground" />
                </div>
                {/* Sparkle effet */}
                <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                </div>
              </div>
              <div className="hidden sm:block">
                <div className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Logistix
                </div>
                <div className="text-xs text-muted-foreground -mt-1">
                  Intelligence logistique
                </div>
              </div>
            </Link>

            {/* Navigation avec hover effects premium */}
            <div className="hidden lg:flex items-center gap-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <div
                    key={item.href}
                    className="relative"
                    onMouseEnter={() => setIsHovered(item.href)}
                    onMouseLeave={() => setIsHovered(null)}
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-2 px-4 py-2.5 rounded-xl",
                        "font-medium text-sm transition-all duration-300",
                        "hover:bg-white/5 hover:backdrop-blur-sm",
                        isActive
                          ? "text-primary bg-primary/10 shadow-lg shadow-primary/10"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className={cn(
                        "w-4 h-4 transition-all duration-300",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )} />
                      <span>{item.title}</span>
                      
                      {/* Indicateur actif moderne */}
                      {isActive && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
                      )}
                      
                      {/* Tooltip au hover */}
                      {isHovered === item.href && !isActive && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50">
                          <div className="bg-popover/95 backdrop-blur-sm border rounded-lg shadow-xl p-3 min-w-[200px]">
                            <div className="text-sm font-medium text-popover-foreground">
                              {item.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {item.description}
                            </div>
                          </div>
                        </div>
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section droite - Recherche + Actions + Profil */}
          <div className="flex items-center gap-4">
            {/* Barre de recherche moderne */}
            <div className={cn(
              "hidden md:flex items-center relative transition-all duration-300",
              isSearchFocused ? "w-72" : "w-60"
            )}>
              <div className="relative w-full">
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="flex items-center gap-2">
              {/* Paramètres */}
              <Link href="/settings">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl hover:bg-white/10 transition-all duration-300 group"
                >
                  <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                </Button>
              </Link>

              {/* Toggle theme amélioré */}
              <div className="scale-110">
                <ThemeToggle />
              </div>
            </div>

            {/* Séparateur élégant */}
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-border to-transparent" />

            {/* Profil utilisateur premium */}
            <div className="flex items-center">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium text-foreground">
                      {user.username}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.isAdmin ? "Administrateur" : "Utilisateur"}
                    </div>
                  </div>
                  <UserAvatarMenu user={user} />
                </div>
              ) : (
                <Link 
                  href="/login"
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl",
                    "bg-gradient-to-r from-primary to-primary/90",
                    "text-primary-foreground font-medium text-sm",
                    "hover:from-primary/90 hover:to-primary/80",
                    "transition-all duration-300 hover:scale-[1.02]",
                    "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                  )}
                >
                  <Zap className="w-4 h-4" />
                  <span>Se connecter</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile navigation indicator */}
        <div className="lg:hidden px-4 pb-2">
          <div className="flex items-center justify-center gap-1">
            {navItems.map((item) => (
              <div
                key={item.href}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  pathname === item.href
                    ? "bg-primary w-6"
                    : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
