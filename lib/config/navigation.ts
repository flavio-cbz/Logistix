import {
    BarChart3,
    Package,
    ShoppingCart,
    LucideIcon
} from "lucide-react";

export interface NavItem {
    title: string;
    href: string;
    icon: LucideIcon;
    description: string;
    color?: string;
}

export const navItems: NavItem[] = [
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
