"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Menu, 
  X, 
  Package2,
  BarChart3,
  ShoppingCart,
  
  Package,
  Bell,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
    description: "Vue d'ensemble des performances",
  },
  {
    title: "Colis",
    href: "/parcelles",
    icon: Package,
    description: "Gestion des expéditions et colis",
  },
  {
    title: "Produits",
    href: "/produits",
    icon: ShoppingCart,
    description: "Gestion du catalogue",
  },
  {
    title: "Statistiques",
    href: "/statistiques",
    icon: BarChart3,
    description: "Métriques avancées",
  },
];

export function MobileNavDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Bouton menu mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-10 w-10 rounded-xl"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={cn(
        "fixed top-0 left-0 z-50 h-full w-80 bg-background/95 backdrop-blur-xl border-r lg:hidden",
        "transform transition-transform duration-300 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header du drawer */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/80">
                <Package2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-lg font-bold">Logistix</div>
                <div className="text-xs text-muted-foreground">Intelligence logistique</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                      "hover:bg-white/5",
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="flex-1">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Actions rapides mobile */}
          <div className="p-4 border-t">
            <div className="flex items-center justify-around">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs"
                >
                  3
                </Badge>
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}