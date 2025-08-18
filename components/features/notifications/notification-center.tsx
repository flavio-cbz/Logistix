"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useStore } from "@/lib/services/admin/store"
import { ScrollArea } from "@/components/ui/scroll-area"

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const { notifications, clearNotification } = useStore()
  const notificationRef = useRef<HTMLDivElement>(null)

  // Filtrer les notifications inutiles
  const filteredNotifications = notifications.filter(
    (notification) => !notification.message.includes("Utilisation des données locales"),
  )

  const unreadCount = filteredNotifications.length

  // Fermer le panneau quand on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="relative" ref={notificationRef}>
      <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 z-50"
          >
            <Card className="p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Notifications</h3>
                {filteredNotifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => filteredNotifications.forEach((n) => clearNotification(n.id))}
                  >
                    Tout effacer
                  </Button>
                )}
              </div>

              <ScrollArea className="h-[300px]">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Aucune notification</div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {filteredNotifications.map((notification) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2 }}
                          className={`p-3 rounded-md relative pr-8 ${
                            notification.type === "error"
                              ? "bg-destructive/10 text-destructive"
                              : notification.type === "warning"
                                ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                                : notification.type === "success"
                                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                  : "bg-primary/10 text-primary"
                          }`}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-70 hover:opacity-100"
                            onClick={() => clearNotification(notification.id)}
                          >
                            <span className="sr-only">Fermer</span>
                            <X className="h-3 w-3" />
                          </Button>
                          <p className="text-sm">{notification.message}</p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </ScrollArea>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
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
  )
}

