<<<<<<< HEAD
"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash } from "lucide-react";
import { Session } from "../types";

interface SessionsListProps {
    sessions: Session[];
    isLoading: boolean;
    onDeleteClick: (session: Session) => void;
}

export function SessionsList({ sessions, isLoading, onDeleteClick }: SessionsListProps) {
    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        );
    }

    if (sessions.length === 0) {
        return <p className="text-sm text-muted-foreground">Aucune session active</p>;
    }

    return (
        <div className="space-y-2">
            {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                        <div className="font-medium">{s.deviceName || "Appareil inconnu"}</div>
                        <div className="text-sm text-muted-foreground">
                            {s.deviceType} • {s.ipAddress}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Dernière activité: {new Date(s.lastActivityAt).toLocaleString()}
                        </div>
                    </div>
                    {s.isCurrent ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                            Actuelle
                        </span>
                    ) : (
                        <Button variant="ghost" size="sm" onClick={() => onDeleteClick(s)}>
                            <Trash className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            ))}
        </div>
    );
}
=======
"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash } from "lucide-react";
import { Session } from "../types";

interface SessionsListProps {
    sessions: Session[];
    isLoading: boolean;
    onDeleteClick: (session: Session) => void;
}

export function SessionsList({ sessions, isLoading, onDeleteClick }: SessionsListProps) {
    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        );
    }

    if (sessions.length === 0) {
        return <p className="text-sm text-muted-foreground">Aucune session active</p>;
    }

    return (
        <div className="space-y-2">
            {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                        <div className="font-medium">{s.deviceName || "Appareil inconnu"}</div>
                        <div className="text-sm text-muted-foreground">
                            {s.deviceType} • {s.ipAddress}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Dernière activité: {new Date(s.lastActivityAt).toLocaleString()}
                        </div>
                    </div>
                    {s.isCurrent ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                            Actuelle
                        </span>
                    ) : (
                        <Button variant="ghost" size="sm" onClick={() => onDeleteClick(s)}>
                            <Trash className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            ))}
        </div>
    );
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
