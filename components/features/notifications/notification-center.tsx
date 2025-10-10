"use client";

import type React from "react";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/services/admin/store";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { notifications, clearNotification } = useStore();
  const notificationRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Filtrer les notifications inutiles
  const filteredNotifications = notifications.filter(
    (notification) =>
      !notification.message.includes("Utilisation des données locales"),
  );

  const unreadCount = filteredNotifications.length;

  // Gestionnaire de toggle avec callback pour éviter les conflits
  const handleToggle = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(prev => !prev);
  }, []);

  // Fermer le panneau quand on clique en dehors avec délai pour éviter les conflits
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Ne pas fermer si on clique sur le bouton ou dans le dropdown
      if (
        notificationRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    // Utiliser un délai pour éviter la fermeture immédiate
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={notificationRef}>
      <Button 
        ref={buttonRef}
        variant="ghost" 
        size="icon" 
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 z-[100] transition-all duration-200 ease-in-out origin-top-right animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
          role="menu"
          aria-labelledby="notifications-button"
        >
          <Card className="p-4 shadow-lg border bg-background">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium" id="notifications-title">Notifications</h3>
              {filteredNotifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    filteredNotifications.forEach((n) =>
                      clearNotification(n.id),
                    );
                  }}
                  aria-label="Effacer toutes les notifications"
                >
                  Tout effacer
                </Button>
              )}
            </div>

            <ScrollArea className="h-[300px]">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune notification
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      className="p-3 rounded-md relative pr-8 transition-all duration-200 ease-in-out transform hover:bg-accent/50"
                      role="menuitem"
                      tabIndex={index}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-70 hover:opacity-100 focus:opacity-100"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          clearNotification(notification.id);
                        }}
                        aria-label={`Fermer la notification: ${notification.message}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="text-sm pr-2">{notification.message}</p>
                      {notification.timestamp && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  );
}

// Icône X pour fermer les notifications
function X(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
