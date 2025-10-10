"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string | undefined;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

// Mapping des segments URL vers des labels lisibles
const segmentLabels: Record<string, string> = {
  dashboard: "Tableau de bord",
  produits: "Produits", 
  parcelles: "Colis",
  colis: "Colis",
  statistiques: "Statistiques",
  "analyse-marche": "Analyse marché",
  notifications: "Notifications",
  settings: "Paramètres",
  profile: "Profil",
  validation: "Validation",
  theme: "Thème"
};

export function Breadcrumb({ items, className, showHome = true }: BreadcrumbProps) {
  const pathname = usePathname();
  
  // Génération automatique des breadcrumbs depuis l'URL si items n'est pas fourni
  const breadcrumbItems = React.useMemo(() => {
    if (items) return items;
    
    const segments = pathname.split('/').filter(Boolean);
    const generatedItems: BreadcrumbItem[] = [];
    
    if (showHome && segments.length > 0) {
      generatedItems.push({
        label: "Accueil",
        href: "/",
        icon: <Home className="h-4 w-4" />
      });
    }
    
    // Construire le breadcrumb pour chaque segment
    segments.forEach((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const label = segmentLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      generatedItems.push({
        label,
        ...(index === segments.length - 1 ? {} : { href }) // Dernière page n'est pas un lien
      });
    });
    
    return generatedItems;
  }, [pathname, items, showHome]);

  if (breadcrumbItems.length === 0) return null;

  return (
    <nav 
      className={cn(
        "flex items-center space-x-1 text-sm text-muted-foreground",
        className
      )}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1">
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center space-x-1">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            )}
            
            {item.href ? (
              <Link 
                href={item.href}
                className="flex items-center space-x-1 hover:text-foreground transition-colors duration-200 px-2 py-1 rounded-md hover:bg-muted/50"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span className="flex items-center space-x-1 text-foreground font-medium px-2 py-1">
                {item.icon}
                <span>{item.label}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Composant wrapper pour les pages qui veulent des breadcrumbs personnalisés
interface PageWithBreadcrumbProps {
  children: React.ReactNode;
  breadcrumbItems?: BreadcrumbItem[];
  title?: string;
  description?: string;
  className?: string;
}

export function PageWithBreadcrumb({ 
  children, 
  breadcrumbItems, 
  title, 
  description,
  className 
}: PageWithBreadcrumbProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <Breadcrumb items={breadcrumbItems || []} />
        
        {(title || description) && (
          <div className="space-y-1">
            {title && (
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-muted-foreground text-base">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
      
      <div>{children}</div>
    </div>
  );
}