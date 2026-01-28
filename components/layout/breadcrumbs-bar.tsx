<<<<<<< HEAD
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

const routeNameMap: Record<string, string> = {
    dashboard: "Tableau de bord",
    produits: "Produits",
    settings: "Paramètres",
    "market-analysis": "Analyse Marché",
    parcelles: "Parcelles",
    integrations: "Intégrations",
    profile: "Profil",
};

export function BreadcrumbsBar() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter((segment) => segment !== "");

    if (segments.length === 0) return null;

    return (
        <div className="mb-4 px-1">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="/dashboard" className="flex items-center">
                                <Home className="h-4 w-4" />
                                <span className="sr-only">Accueil</span>
                            </Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>

                    {segments.map((segment, index) => {
                        const isLast = index === segments.length - 1;
                        const href = `/${segments.slice(0, index + 1).join("/")}`;

                        // Format name: check map or capitalize
                        let name = routeNameMap[segment];
                        if (!name) {
                            // Try to format nicely if likely an ID
                            if (segment.length > 20 || !isNaN(Number(segment))) {
                                name = "Détail"; // Or truncate ID
                            } else {
                                name = segment.charAt(0).toUpperCase() + segment.slice(1);
                            }
                        }

                        // Skip "dashboard" in list if it's the first segment (since we have Home icon)
                        if (segment === "dashboard" && index === 0) return null;

                        return (
                            <React.Fragment key={href}>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    {isLast ? (
                                        <BreadcrumbPage>{name}</BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink asChild>
                                            <Link href={href}>{name}</Link>
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                            </React.Fragment>
                        );
                    })}
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    );
}

import React from "react";
=======
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

const routeNameMap: Record<string, string> = {
    dashboard: "Tableau de bord",
    produits: "Produits",
    settings: "Paramètres",
    "market-analysis": "Analyse Marché",
    parcelles: "Parcelles",
    integrations: "Intégrations",
    profile: "Profil",
};

export function BreadcrumbsBar() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter((segment) => segment !== "");

    if (segments.length === 0) return null;

    return (
        <div className="mb-4 px-1">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="/dashboard" className="flex items-center">
                                <Home className="h-4 w-4" />
                                <span className="sr-only">Accueil</span>
                            </Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>

                    {segments.map((segment, index) => {
                        const isLast = index === segments.length - 1;
                        const href = `/${segments.slice(0, index + 1).join("/")}`;

                        // Format name: check map or capitalize
                        let name = routeNameMap[segment];
                        if (!name) {
                            // Try to format nicely if likely an ID
                            if (segment.length > 20 || !isNaN(Number(segment))) {
                                name = "Détail"; // Or truncate ID
                            } else {
                                name = segment.charAt(0).toUpperCase() + segment.slice(1);
                            }
                        }

                        // Skip "dashboard" in list if it's the first segment (since we have Home icon)
                        if (segment === "dashboard" && index === 0) return null;

                        return (
                            <React.Fragment key={href}>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    {isLast ? (
                                        <BreadcrumbPage>{name}</BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink asChild>
                                            <Link href={href}>{name}</Link>
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                            </React.Fragment>
                        );
                    })}
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    );
}

import React from "react";
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
