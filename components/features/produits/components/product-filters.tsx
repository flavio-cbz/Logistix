"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, X, Filter } from "lucide-react"
import { cn } from "@/lib/shared/utils"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ProductFiltersProps {
    searchValue?: string
    onSearchChange?: (value: string) => void
    statusFilter?: ("all" | "available" | "online" | "sold")[]
    onStatusFilterChange?: (statuses: ("all" | "available" | "online" | "sold")[]) => void
    platformFilter?: string[]
    onPlatformFilterChange?: (platforms: string[]) => void
    className?: string
}

const statusOptions = [
    { value: "all", label: "Tous" },
    { value: "available", label: "Disponibles" },
    { value: "online", label: "En ligne" },
    { value: "sold", label: "Vendus" },
] as const

const platformOptions = [
    { value: "Vinted", label: "Vinted" },
    { value: "Leboncoin", label: "Leboncoin" },
    { value: "Amazon", label: "Amazon" },
    { value: "eBay", label: "eBay" },
]

export function ProductFilters({
    searchValue = "",
    onSearchChange,
    statusFilter = ["all"],
    onStatusFilterChange,
    platformFilter = [],
    onPlatformFilterChange,
    className,
}: ProductFiltersProps) {
    const activeFiltersCount =
        (statusFilter.length > 0 && !statusFilter.includes("all") ? 1 : 0) +
        (platformFilter.length > 0 ? 1 : 0)

    const handleClearSearch = () => {
        onSearchChange?.("")
    }

    const toggleStatus = (status: "all" | "available" | "online" | "sold") => {
        if (status === "all") {
            onStatusFilterChange?.(["all"])
        } else {
            const newStatuses = statusFilter.includes(status)
                ? statusFilter.filter((s) => s !== status)
                : [...statusFilter.filter((s) => s !== "all"), status]
            onStatusFilterChange?.(newStatuses.length > 0 ? newStatuses : ["all"])
        }
    }

    const togglePlatform = (platform: string) => {
        const newPlatforms = platformFilter.includes(platform)
            ? platformFilter.filter((p) => p !== platform)
            : [...platformFilter, platform]
        onPlatformFilterChange?.(newPlatforms)
    }

    const handleClearFilters = () => {
        onStatusFilterChange?.(["all"])
        onPlatformFilterChange?.([])
        onSearchChange?.("")
    }

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher un produit..."
                        value={searchValue}
                        onChange={(e) => onSearchChange?.(e.target.value)}
                        className="pl-9 pr-9"
                    />
                    {searchValue && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={handleClearSearch}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Filters dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Filter className="h-4 w-4" />
                            Filtres
                            {activeFiltersCount > 0 && (
                                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                                    {activeFiltersCount}
                                </Badge>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Statut</DropdownMenuLabel>
                        {statusOptions.map((option) => (
                            <DropdownMenuCheckboxItem
                                key={option.value}
                                checked={statusFilter.includes(option.value)}
                                onCheckedChange={() => toggleStatus(option.value)}
                            >
                                {option.label}
                            </DropdownMenuCheckboxItem>
                        ))}

                        <DropdownMenuSeparator />

                        <DropdownMenuLabel>Plateforme</DropdownMenuLabel>
                        {platformOptions.map((option) => (
                            <DropdownMenuCheckboxItem
                                key={option.value}
                                checked={platformFilter.includes(option.value)}
                                onCheckedChange={() => togglePlatform(option.value)}
                            >
                                {option.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Active filters display */}
            {(activeFiltersCount > 0 || searchValue) && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Filtres actifs:</span>
                    {searchValue && (
                        <Badge variant="secondary">
                            Recherche: "{searchValue}"
                            <button onClick={handleClearSearch} className="ml-1">
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {!statusFilter.includes("all") && statusFilter.length > 0 && (
                        <Badge variant="secondary">
                            Statut: {statusFilter.join(", ")}
                        </Badge>
                    )}
                    {platformFilter.length > 0 && (
                        <Badge variant="secondary">
                            Plateforme: {platformFilter.join(", ")}
                        </Badge>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="h-6 text-xs"
                    >
                        Tout effacer
                    </Button>
                </div>
            )}
        </div>
    )
}
