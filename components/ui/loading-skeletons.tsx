"use client";

import * as React from "react";
import { cn } from "@/lib/shared/utils";
import { Skeleton } from "./skeleton";

interface SkeletonProps {
    className?: string;
}

/**
 * Skeleton pour une carte métrique du dashboard
 */
export const MetricCardSkeleton = ({ className }: SkeletonProps) => (
    <div className={cn("rounded-lg border bg-card p-6 space-y-3", className)}>
        <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-20" />
    </div>
);

/**
 * Skeleton pour une ligne de tableau
 */
export const TableRowSkeleton = ({
    columns = 5,
    className,
}: SkeletonProps & { columns?: number }) => (
    <div
        className={cn("flex items-center gap-4 py-3 px-4 border-b", className)}
    >
        {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
                key={i}
                className="h-4 flex-1"
                style={{ maxWidth: i === 0 ? "200px" : undefined }}
            />
        ))}
    </div>
);

/**
 * Skeleton pour un tableau complet
 */
export const TableSkeleton = ({
    rows = 5,
    columns = 5,
    className,
}: SkeletonProps & { rows?: number; columns?: number }) => (
    <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
        {/* Header */}
        <div className="flex items-center gap-4 py-3 px-4 bg-muted/50 border-b">
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
            ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
        ))}
    </div>
);

/**
 * Skeleton pour une carte produit
 */
export const ProductCardSkeleton = ({ className }: SkeletonProps) => (
    <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
        <Skeleton className="aspect-square w-full" />
        <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-8 rounded" />
            </div>
        </div>
    </div>
);

/**
 * Skeleton pour une grille de produits
 */
export const ProductGridSkeleton = ({
    count = 6,
    className,
}: SkeletonProps & { count?: number }) => (
    <div
        className={cn(
            "grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
            className
        )}
    >
        {Array.from({ length: count }).map((_, i) => (
            <ProductCardSkeleton key={i} />
        ))}
    </div>
);

/**
 * Skeleton pour un graphique
 */
export const ChartSkeleton = ({ className }: SkeletonProps) => (
    <div className={cn("rounded-lg border bg-card p-6 space-y-4", className)}>
        <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded" />
                <Skeleton className="h-8 w-20 rounded" />
            </div>
        </div>
        <div className="relative h-[300px] flex items-end gap-2 pt-8">
            {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton
                    key={i}
                    className="flex-1 rounded-t"
                    style={{ height: `${Math.random() * 60 + 30}%` }}
                />
            ))}
        </div>
        <div className="flex justify-center gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-3 w-16" />
                </div>
            ))}
        </div>
    </div>
);

/**
 * Skeleton pour une liste de statistiques
 */
export const StatsListSkeleton = ({
    count = 4,
    className,
}: SkeletonProps & { count?: number }) => (
    <div className={cn("space-y-4", className)}>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>
                <Skeleton className="h-5 w-16" />
            </div>
        ))}
    </div>
);

/**
 * Skeleton pour un formulaire
 */
export const FormSkeleton = ({
    fields = 4,
    className,
}: SkeletonProps & { fields?: number }) => (
    <div className={cn("space-y-6", className)}>
        {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
            </div>
        ))}
        <div className="flex gap-3 pt-4">
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-20 rounded-md" />
        </div>
    </div>
);

/**
 * Skeleton pour la sidebar de navigation
 */
export const SidebarSkeleton = ({ className }: SkeletonProps) => (
    <div className={cn("w-64 border-r bg-card p-4 space-y-6", className)}>
        <Skeleton className="h-8 w-32" />
        <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-4 flex-1" />
                </div>
            ))}
        </div>
        <Skeleton className="h-px w-full" />
        <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-4 flex-1" />
                </div>
            ))}
        </div>
    </div>
);

/**
 * Skeleton pour le profil utilisateur
 */
export const ProfileSkeleton = ({ className }: SkeletonProps) => (
    <div className={cn("space-y-6", className)}>
        <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
            </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
            ))}
        </div>
    </div>
);

/**
 * Skeleton pour une carte d'information détaillée
 */
export const DetailCardSkeleton = ({ className }: SkeletonProps) => (
    <div className={cn("rounded-lg border bg-card p-6 space-y-4", className)}>
        <div className="flex items-start justify-between">
            <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-24" />
                </div>
            ))}
        </div>
    </div>
);

/**
 * Skeleton pour le dashboard complet
 */
export const DashboardSkeleton = ({ className }: SkeletonProps) => (
    <div className={cn("space-y-6", className)}>
        {/* Metric cards row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <MetricCardSkeleton key={i} />
            ))}
        </div>
        {/* Charts row */}
        <div className="grid gap-4 md:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
        </div>
        {/* Table */}
        <TableSkeleton rows={5} columns={6} />
    </div>
);
