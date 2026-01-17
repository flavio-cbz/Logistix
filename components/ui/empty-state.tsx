"use client";

import * as React from "react";
import { cn } from "@/lib/shared/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
    icon?: LucideIcon;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    imageSrc?: string;
    className?: string;
    size?: "default" | "sm";
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    imageSrc,
    className,
    size = "default",
    ...props
}: EmptyStateProps) {
    const isSmall = size === "sm";

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg bg-muted/20",
                isSmall ? "p-4 min-h-[200px]" : "p-8 min-h-[400px]",
                className
            )}
            {...props}
        >
            <div className={cn(
                "flex items-center justify-center rounded-full bg-muted/50",
                isSmall ? "w-12 h-12 mb-3" : "w-20 h-20 mb-6"
            )}>
                {imageSrc ? (
                    <img src={imageSrc} alt="Empty state illustration" className={cn("opacity-80", isSmall ? "w-6 h-6" : "w-12 h-12")} />
                ) : Icon ? (
                    <Icon className={cn("text-muted-foreground/60", isSmall ? "w-5 h-5" : "w-10 h-10")} />
                ) : (
                    <div className={cn("bg-muted-foreground/20 rounded-full", isSmall ? "w-5 h-5" : "w-10 h-10")} />
                )}
            </div>

            <h3 className={cn("font-semibold tracking-tight", isSmall ? "text-sm mb-1" : "text-xl mb-2")}>
                {title}
            </h3>

            {description && (
                <p className={cn(
                    "text-muted-foreground max-w-sm text-sm leading-relaxed",
                    isSmall ? "mb-4 text-xs" : "mb-8 text-sm"
                )}>
                    {description}
                </p>
            )}

            {actionLabel && onAction && (
                <Button onClick={onAction} size={isSmall ? "sm" : "lg"} className={isSmall ? "min-w-[120px]" : "min-w-[200px]"}>
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
