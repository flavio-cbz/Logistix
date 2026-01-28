<<<<<<< HEAD
"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/shared/utils";
import { Spinner } from "./spinner";
import { RefreshCw } from "lucide-react";

const loadingStateVariants = cva(
    "flex items-center justify-center transition-all duration-300",
    {
        variants: {
            layout: {
                inline: "flex-row gap-2",
                stack: "flex-col gap-3",
                overlay: "absolute inset-0 bg-background/80 backdrop-blur-sm z-50",
                fullscreen: "fixed inset-0 bg-background/95 backdrop-blur-md z-50",
            },
            size: {
                sm: "py-4",
                default: "py-8",
                lg: "py-12",
                full: "min-h-[200px]",
            },
        },
        defaultVariants: {
            layout: "stack",
            size: "default",
        },
    }
);

type LoadingType = "spinner" | "dots" | "pulse" | "skeleton";

export interface LoadingStateProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingStateVariants> {
    /** Message affiché sous l'indicateur */
    message?: string;
    /** Message secondaire plus petit */
    submessage?: string;
    /** Type d'animation de chargement */
    type?: LoadingType;
    /** Afficher un indicateur de progression (0-100) */
    progress?: number;
    /** Icône personnalisée au lieu du spinner */
    icon?: React.ReactNode;
    /** Afficher un bouton de retry */
    showRetry?: boolean;
    /** Callback pour retry */
    onRetry?: () => void;
}

const LoadingDots = () => (
    <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
            <div
                key={i}
                className="h-2 w-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
            />
        ))}
    </div>
);

const PulseLoader = () => (
    <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
        <div className="absolute inset-2 rounded-full bg-primary/50 animate-pulse" />
        <div className="absolute inset-4 rounded-full bg-primary" />
    </div>
);

const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
    (
        {
            className,
            layout,
            size,
            message,
            submessage,
            type = "spinner",
            progress,
            icon,
            showRetry,
            onRetry,
            ...props
        },
        ref
    ) => {
        const renderLoadingIndicator = () => {
            if (icon) return icon;

            switch (type) {
                case "dots":
                    return <LoadingDots />;
                case "pulse":
                    return <PulseLoader />;
                case "skeleton":
                    return (
                        <div className="space-y-2 w-full max-w-sm">
                            <div className="h-4 bg-muted animate-pulse rounded" />
                            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                        </div>
                    );
                default:
                    return <Spinner size="lg" />;
            }
        };

        return (
            <div
                ref={ref}
                className={cn(loadingStateVariants({ layout, size, className }))}
                {...props}
            >
                <div className="flex flex-col items-center gap-4">
                    {renderLoadingIndicator()}

                    {progress !== undefined && (
                        <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                            />
                        </div>
                    )}

                    {message && (
                        <div className="text-center space-y-1">
                            <p className="text-sm font-medium text-foreground">{message}</p>
                            {submessage && (
                                <p className="text-xs text-muted-foreground">{submessage}</p>
                            )}
                            {progress !== undefined && (
                                <p className="text-xs text-muted-foreground font-mono">
                                    {Math.round(progress)}%
                                </p>
                            )}
                        </div>
                    )}

                    {showRetry && onRetry && (
                        <button
                            onClick={onRetry}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:text-primary/80 hover:bg-primary/10 rounded-md transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Réessayer
                        </button>
                    )}
                </div>
            </div>
        );
    }
);

LoadingState.displayName = "LoadingState";

// Composants pré-configurés pour des cas d'usage courants
export interface PageLoadingProps {
    /** Titre principal du loader */
    title?: string;
    /** Message secondaire affiché sous le spinner */
    message?: string;
    /** Icône personnalisée au centre du spinner */
    icon?: React.ReactNode;
}

const PageLoading = ({
    title = "Chargement...",
    message = "Récupération des données...",
    icon
}: PageLoadingProps) => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                {icon && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary">
                        {icon}
                    </div>
                )}
            </div>
            <div className="space-y-2">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-muted-foreground">{message}</p>
            </div>
        </div>
    </div>
);

const InlineLoading = ({ message = "Chargement..." }: { message?: string }) => (
    <LoadingState layout="inline" size="sm" message={message} />
);

const OverlayLoading = ({
    message = "Traitement en cours...",
    submessage,
}: {
    message?: string;
    submessage?: string;
}) => <LoadingState layout="overlay" message={message} submessage={submessage} />;

const FullscreenLoading = ({
    message = "Chargement...",
    progress,
}: {
    message?: string;
    progress?: number;
}) => <LoadingState layout="fullscreen" message={message} progress={progress} />;

export {
    LoadingState,
    loadingStateVariants,
    PageLoading,
    InlineLoading,
    OverlayLoading,
    FullscreenLoading,
    LoadingDots,
    PulseLoader,
};
=======
"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/shared/utils";
import { Spinner } from "./spinner";
import { RefreshCw } from "lucide-react";

const loadingStateVariants = cva(
    "flex items-center justify-center transition-all duration-300",
    {
        variants: {
            layout: {
                inline: "flex-row gap-2",
                stack: "flex-col gap-3",
                overlay: "absolute inset-0 bg-background/80 backdrop-blur-sm z-50",
                fullscreen: "fixed inset-0 bg-background/95 backdrop-blur-md z-50",
            },
            size: {
                sm: "py-4",
                default: "py-8",
                lg: "py-12",
                full: "min-h-[200px]",
            },
        },
        defaultVariants: {
            layout: "stack",
            size: "default",
        },
    }
);

type LoadingType = "spinner" | "dots" | "pulse" | "skeleton";

export interface LoadingStateProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingStateVariants> {
    /** Message affiché sous l'indicateur */
    message?: string;
    /** Message secondaire plus petit */
    submessage?: string;
    /** Type d'animation de chargement */
    type?: LoadingType;
    /** Afficher un indicateur de progression (0-100) */
    progress?: number;
    /** Icône personnalisée au lieu du spinner */
    icon?: React.ReactNode;
    /** Afficher un bouton de retry */
    showRetry?: boolean;
    /** Callback pour retry */
    onRetry?: () => void;
}

const LoadingDots = () => (
    <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
            <div
                key={i}
                className="h-2 w-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
            />
        ))}
    </div>
);

const PulseLoader = () => (
    <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
        <div className="absolute inset-2 rounded-full bg-primary/50 animate-pulse" />
        <div className="absolute inset-4 rounded-full bg-primary" />
    </div>
);

const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
    (
        {
            className,
            layout,
            size,
            message,
            submessage,
            type = "spinner",
            progress,
            icon,
            showRetry,
            onRetry,
            ...props
        },
        ref
    ) => {
        const renderLoadingIndicator = () => {
            if (icon) return icon;

            switch (type) {
                case "dots":
                    return <LoadingDots />;
                case "pulse":
                    return <PulseLoader />;
                case "skeleton":
                    return (
                        <div className="space-y-2 w-full max-w-sm">
                            <div className="h-4 bg-muted animate-pulse rounded" />
                            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                        </div>
                    );
                default:
                    return <Spinner size="lg" />;
            }
        };

        return (
            <div
                ref={ref}
                className={cn(loadingStateVariants({ layout, size, className }))}
                {...props}
            >
                <div className="flex flex-col items-center gap-4">
                    {renderLoadingIndicator()}

                    {progress !== undefined && (
                        <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                            />
                        </div>
                    )}

                    {message && (
                        <div className="text-center space-y-1">
                            <p className="text-sm font-medium text-foreground">{message}</p>
                            {submessage && (
                                <p className="text-xs text-muted-foreground">{submessage}</p>
                            )}
                            {progress !== undefined && (
                                <p className="text-xs text-muted-foreground font-mono">
                                    {Math.round(progress)}%
                                </p>
                            )}
                        </div>
                    )}

                    {showRetry && onRetry && (
                        <button
                            onClick={onRetry}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:text-primary/80 hover:bg-primary/10 rounded-md transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Réessayer
                        </button>
                    )}
                </div>
            </div>
        );
    }
);

LoadingState.displayName = "LoadingState";

// Composants pré-configurés pour des cas d'usage courants
export interface PageLoadingProps {
    /** Titre principal du loader */
    title?: string;
    /** Message secondaire affiché sous le spinner */
    message?: string;
    /** Icône personnalisée au centre du spinner */
    icon?: React.ReactNode;
}

const PageLoading = ({
    title = "Chargement...",
    message = "Récupération des données...",
    icon
}: PageLoadingProps) => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                {icon && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary">
                        {icon}
                    </div>
                )}
            </div>
            <div className="space-y-2">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-muted-foreground">{message}</p>
            </div>
        </div>
    </div>
);

const InlineLoading = ({ message = "Chargement..." }: { message?: string }) => (
    <LoadingState layout="inline" size="sm" message={message} />
);

const OverlayLoading = ({
    message = "Traitement en cours...",
    submessage,
}: {
    message?: string;
    submessage?: string;
}) => <LoadingState layout="overlay" message={message} submessage={submessage} />;

const FullscreenLoading = ({
    message = "Chargement...",
    progress,
}: {
    message?: string;
    progress?: number;
}) => <LoadingState layout="fullscreen" message={message} progress={progress} />;

export {
    LoadingState,
    loadingStateVariants,
    PageLoading,
    InlineLoading,
    OverlayLoading,
    FullscreenLoading,
    LoadingDots,
    PulseLoader,
};
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
