"use client";

import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Lock, LogOut } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Session } from "../types";
import { SessionsList } from "./sessions-list";

interface SecurityTabProps {
    sessions: Session[];
    sessionsLoading: boolean;
    onDeleteSession: (id: string) => Promise<void>;
    onDeleteAllSessions: () => Promise<void>;
}

export function SecurityTab({
    sessions,
    sessionsLoading,
    onDeleteSession,
    onDeleteAllSessions,
}: SecurityTabProps) {
    // Password state
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [changingPassword, setChangingPassword] = useState(false);

    // Session dialogs state
    const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
    const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

    const handlePasswordChange = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("Les mots de passe ne correspondent pas");
            return;
        }

        if (passwordData.newPassword.length < 8) {
            toast.error("Le mot de passe doit contenir au moins 8 caractères");
            return;
        }

        setChangingPassword(true);
        try {
            const response = await fetch("/api/v1/profile/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(passwordData),
            });

            const data = await response.json();
            if (data.success) {
                toast.success("Mot de passe changé avec succès");
                setShowPasswordDialog(false);
                setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            } else {
                throw new Error(data.message || data.error?.message || "Erreur lors du changement de mot de passe");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erreur lors du changement de mot de passe");
        } finally {
            setChangingPassword(false);
        }
    };

    const confirmDeleteSession = async () => {
        if (!sessionToDelete) return;
        setDeletingSessionId(sessionToDelete.id);
        try {
            await onDeleteSession(sessionToDelete.id);
            setSessionToDelete(null); // Close dialog on success
        } catch (_error) {
            // Error is handled by parent or here if we want more control,
            // but for now parent handles toast errors usually? 
            // Actually parent logic had try/catch wrapping the call but toast inside.
            // We assume onDeleteSession throws if it fails.
            toast.error("Erreur lors de la suppression de la session");
        } finally {
            setDeletingSessionId(null);
        }
    };

    const confirmDeleteAll = async () => {
        setDeletingAll(true);
        try {
            await onDeleteAllSessions();
            setShowDeleteAllDialog(false);
        } catch (_error) {
            toast.error("Erreur lors de la suppression des sessions");
        } finally {
            setDeletingAll(false);
        }
    };

    return (
        <div className="space-y-6 mt-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" />
                        Sécurité
                    </CardTitle>
                    <CardDescription>
                        Gérez la sécurité de votre compte
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Mot de passe</p>
                            <p className="text-sm text-muted-foreground">
                                Changez votre mot de passe régulièrement
                            </p>
                        </div>
                        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Lock className="h-4 w-4 mr-2" />
                                    Changer
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Changer le mot de passe</DialogTitle>
                                    <DialogDescription>
                                        Entrez votre mot de passe actuel et choisissez-en un nouveau.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                                        <Input
                                            id="currentPassword"
                                            type="password"
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                                        <Input
                                            id="newPassword"
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Minimum 8 caractères
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirmer</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowPasswordDialog(false)} disabled={changingPassword}>
                                        Annuler
                                    </Button>
                                    <Button onClick={handlePasswordChange} disabled={changingPassword}>
                                        {changingPassword ? "Changement..." : "Changer"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Separator />

                    {/* Sessions Management */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Sessions actives</p>
                                <p className="text-sm text-muted-foreground">
                                    Gérez vos sessions sur différents appareils
                                </p>
                            </div>
                            <Button variant="outline" onClick={() => setShowDeleteAllDialog(true)}>
                                <LogOut className="h-4 w-4 mr-2" />
                                Terminer les autres
                            </Button>
                        </div>

                        <SessionsList
                            sessions={sessions}
                            isLoading={sessionsLoading}
                            onDeleteClick={setSessionToDelete}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Dialogs */}
            <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Terminer les autres sessions</DialogTitle>
                        <DialogDescription>
                            Voulez-vous vraiment terminer toutes les autres sessions actives ?
                            Cette action déconnectera vos sessions sur d'autres appareils.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Sessions trouvées : {sessions.filter((s) => !s.isCurrent).length}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowDeleteAllDialog(false)}>
                            Annuler
                        </Button>
                        <Button onClick={confirmDeleteAll} disabled={deletingAll}>
                            {deletingAll ? "Suppression..." : "Terminer les autres"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Terminer la session</DialogTitle>
                        <DialogDescription>
                            Vous êtes sur le point de terminer la session. Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    {sessionToDelete && (
                        <div className="py-4">
                            <div className="font-medium">{sessionToDelete.deviceName || "Inconnu"}</div>
                            <div className="text-sm text-muted-foreground">
                                {sessionToDelete.deviceType} • {sessionToDelete.ipAddress}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSessionToDelete(null)}>
                            Annuler
                        </Button>
                        <Button onClick={confirmDeleteSession} disabled={!!deletingSessionId}>
                            {deletingSessionId ? "Suppression..." : "Terminer la session"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
