"use client"

import { useEffect, useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Clock, BellRing } from "lucide-react"

interface Props {
  expiration?: Date | null
  /**
   * Minutes before expiration to start showing a warning. Default: 24h
   */
  warningThresholdMinutes?: number
  /**
   * Minutes before expiration to show urgent (red) notice. Default: 60m
   */
  urgentThresholdMinutes?: number
}

/**
 * Affiche une notification visuelle lorsque le token Vinted approche de son expiration.
 * - warningThresholdMinutes : montre un avertissement (jaune) quand le temps restant < seuil
 * - urgentThresholdMinutes : montre une alerte urgente (rouge) quand temps restant < seuil urgent
 */
export default function TokenExpirationNotice({
  expiration,
  warningThresholdMinutes = 24 * 60,
  urgentThresholdMinutes = 60,
}: Props) {
  const router = useRouter()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    // Mettre à jour 'now' chaque minute pour rafraîchir l'affichage du countdown
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  const minutesLeft = useMemo(() => {
    if (!expiration) return null
    const diffMs = new Date(expiration).getTime() - now
    return Math.max(0, Math.ceil(diffMs / 1000 / 60))
  }, [expiration, now])

  if (!expiration || minutesLeft === null) return null

  // Pas d'affichage si loin de l'expiration
  if (minutesLeft > warningThresholdMinutes) return null

  const isUrgent = minutesLeft <= urgentThresholdMinutes
  const label =
    minutesLeft >= 60
      ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m`
      : `${minutesLeft}m`

  return (
    <div>
  <Alert variant={isUrgent ? "destructive" : "default"} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
          </span>
          <div>
            <div className="font-medium">
              {isUrgent ? "Token Vinted proche ou expiré" : "Token Vinted expirant bientôt"}
            </div>
            <AlertDescription>
              {isUrgent
                ? `Expiration imminente : ${label}. Veuillez reconfigurer ou vérifier la session.`
                : `Expiration dans : ${label}. Pensez à reconfigurer si nécessaire.`}
            </AlertDescription>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/profile")}>
            <BellRing className="mr-2 h-4 w-4" />
            Mettre à jour
          </Button>
        </div>
      </Alert>
    </div>
  )
}