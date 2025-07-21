"use client"

import { useEffect } from "react"
import { useStore } from "@/store/store"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const NOTIFICATION_TIMEOUT = 5000 // 5 secondes

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

export function NotificationList() {
  const { notifications, clearNotification } = useStore()

  useEffect(() => {
    // Configurer les timers pour supprimer automatiquement les notifications
    notifications.forEach((notification) => {
      const timer = setTimeout(() => {
        clearNotification(notification.id)
      }, NOTIFICATION_TIMEOUT)

      return () => clearTimeout(timer)
    })
  }, [notifications, clearNotification])

  if (notifications.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {notifications.map((notification) => {
        const Icon = icons[notification.type]

        return (
          <Alert
            key={notification.id}
            variant={notification.type === "error" ? "destructive" : "default"}
            className="pr-8 relative"
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 p-0"
              onClick={() => clearNotification(notification.id)}
            >
              <X className="h-4 w-4" />
            </Button>
            <Icon className="h-4 w-4 mr-2" />
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        )
      })}
    </div>
  )
}

