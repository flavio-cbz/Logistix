"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Bell, 
  BellRing,  
  X, 
  Trash2,
  Settings,
  Filter,
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/services/admin/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const notificationVariants = {
  success: "border-l-4 border-l-green-500 bg-gradient-to-r from-green-50/50 to-transparent",
  error: "border-l-4 border-l-red-500 bg-gradient-to-r from-red-50/50 to-transparent",
  warning: "border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50/50 to-transparent",
  info: "border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-transparent",
};

export function EnhancedNotificationCenter() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "success" | "error" | "warning" | "info">("all");
  const { notifications, clearNotification } = useStore();
  const notificationRef = useRef<HTMLDivElement>(null);

  // Filtrer les notifications inutiles et par type
  const filteredNotifications = notifications
    .filter((notification) => 
      !notification.message.includes("Utilisation des données locales")
    )
    .filter((notification) => 
      filter === "all" || notification.type === filter
    );

  const unreadCount = notifications.filter(n => !n.message.includes("Utilisation des données locales")).length;

  // Fermer le panneau quand on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const clearAll = () => {
    filteredNotifications.forEach((n) => clearNotification(n.id));
  };

  const getFilteredStats = () => {
    const all = notifications.filter(n => !n.message.includes("Utilisation des données locales"));
    return {
      all: all.length,
      success: all.filter(n => n.type === "success").length,
      error: all.filter(n => n.type === "error").length,
      warning: all.filter(n => n.type === "warning").length,
      info: all.filter(n => n.type === "info").length,
    };
  };

  const stats = getFilteredStats();

  return (
    <div className="relative" ref={notificationRef}>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setOpen(!open)}
        className={cn(
          "relative transition-all duration-200",
          unreadCount > 0 && "animate-pulse"
        )}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-primary" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-bounce"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-96 z-50 transition-all duration-200 ease-in-out origin-top-right animate-in slide-in-from-top-2"
        >
          <Card className="shadow-xl border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <CardTitle className="text-lg bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    Notifications
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  {/* Filtre */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="w-3 h-3" />
                        {filter === "all" ? "Toutes" : filter}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Filtrer par type</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setFilter("all")}>
                        Toutes ({stats.all})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilter("success")} className="text-green-600">
                        Succès ({stats.success})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilter("error")} className="text-red-600">
                        Erreurs ({stats.error})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilter("warning")} className="text-yellow-600">
                        Avertissements ({stats.warning})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilter("info")} className="text-blue-600">
                        Informations ({stats.info})
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Actions */}
                  {filteredNotifications.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={clearAll}>
                          <Trash2 className="w-3 h-3 mr-2" />
                          Effacer toutes
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Fermer */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setOpen(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Statistiques rapides */}
              {stats.all > 0 && (
                <>
                  <Separator className="my-2" />
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center p-2 rounded-md bg-green-50 text-green-700 border border-green-200">
                      <div className="font-semibold">{stats.success}</div>
                      <div>Succès</div>
                    </div>
                    <div className="text-center p-2 rounded-md bg-red-50 text-red-700 border border-red-200">
                      <div className="font-semibold">{stats.error}</div>
                      <div>Erreurs</div>
                    </div>
                    <div className="text-center p-2 rounded-md bg-yellow-50 text-yellow-700 border border-yellow-200">
                      <div className="font-semibold">{stats.warning}</div>
                      <div>Alertes</div>
                    </div>
                    <div className="text-center p-2 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      <div className="font-semibold">{stats.info}</div>
                      <div>Infos</div>
                    </div>
                  </div>
                </>
              )}
            </CardHeader>

            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <Bell className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">
                      {filter === "all" ? "Aucune notification" : `Aucune notification ${filter}`}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vous êtes à jour !
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 p-4">
                    {filteredNotifications.map((notification) => {
                      const Icon = icons[notification.type as keyof typeof icons];
                      return (
                        <div
                          key={notification.id}
                          className={cn(
                            "group relative p-3 rounded-lg transition-all duration-200 hover:shadow-md",
                            notificationVariants[notification.type as keyof typeof notificationVariants]
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "flex-shrink-0 p-1.5 rounded-full",
                              notification.type === "success" && "bg-green-100 text-green-600",
                              notification.type === "error" && "bg-red-100 text-red-600",
                              notification.type === "warning" && "bg-yellow-100 text-yellow-600",
                              notification.type === "info" && "bg-blue-100 text-blue-600"
                            )}>
                              <Icon className="w-3 h-3" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground font-medium">
                                {notification.message}
                              </p>
                              {notification.timestamp && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(notification.timestamp).toLocaleTimeString()}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                              onClick={() => clearNotification(notification.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Component pour les notifications toast en bas à droite
export function EnhancedNotificationToast() {
  const { notifications, clearNotification } = useStore();

  const recentNotifications = notifications
    .filter(n => !n.message.includes("Utilisation des données locales"))
    .slice(0, 3); // Montrer seulement les 3 plus récentes

  useEffect(() => {
    // Auto-supprimer les notifications après 5 secondes
    recentNotifications.forEach((notification) => {
      const timer = setTimeout(() => {
        clearNotification(notification.id);
      }, 5000);

      return () => clearTimeout(timer);
    });
  }, [recentNotifications, clearNotification]);

  if (recentNotifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {recentNotifications.map((notification) => {
        const Icon = icons[notification.type as keyof typeof icons];
        
        return (
          <Card
            key={notification.id}
            className={cn(
              "relative pr-10 transition-all duration-300 animate-in slide-in-from-right-2 shadow-lg",
              notificationVariants[notification.type as keyof typeof notificationVariants]
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex-shrink-0 p-1.5 rounded-full",
                  notification.type === "success" && "bg-green-100 text-green-600",
                  notification.type === "error" && "bg-red-100 text-red-600",
                  notification.type === "warning" && "bg-yellow-100 text-yellow-600",
                  notification.type === "info" && "bg-blue-100 text-blue-600"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {notification.message}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                onClick={() => clearNotification(notification.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}