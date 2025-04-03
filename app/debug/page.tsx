"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugPage() {
  const [sessionData, setSessionData] = useState<any>(null)
  const [databaseData, setDatabaseData] = useState<any>(null)
  const [cookiesData, setCookiesData] = useState<any>(null)
  const [loading, setLoading] = useState({
    session: false,
    database: false,
    cookies: false,
  })

  const fetchSessionData = async () => {
    setLoading((prev) => ({ ...prev, session: true }))
    try {
      const response = await fetch("/api/debug/session")
      const data = await response.json()
      setSessionData(data)
    } catch (error) {
      console.error("Erreur lors de la récupération des données de session:", error)
    } finally {
      setLoading((prev) => ({ ...prev, session: false }))
    }
  }

  const fetchDatabaseData = async () => {
    setLoading((prev) => ({ ...prev, database: true }))
    try {
      const response = await fetch("/api/debug/database")
      const data = await response.json()
      setDatabaseData(data)
    } catch (error) {
      console.error("Erreur lors de la récupération des données de base de données:", error)
    } finally {
      setLoading((prev) => ({ ...prev, database: false }))
    }
  }

  const fetchCookiesData = async () => {
    setLoading((prev) => ({ ...prev, cookies: true }))
    try {
      const response = await fetch("/api/debug/cookies")
      const data = await response.json()
      setCookiesData(data)
    } catch (error) {
      console.error("Erreur lors de la récupération des données de cookies:", error)
    } finally {
      setLoading((prev) => ({ ...prev, cookies: false }))
    }
  }

  useEffect(() => {
    fetchSessionData()
    fetchDatabaseData()
    fetchCookiesData()
  }, [])

  const formatJson = (data: any) => {
    return JSON.stringify(data, null, 2)
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Page de débogage</h1>
      <p className="text-muted-foreground">Cette page affiche des informations de débogage pour l'authentification.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>Informations sur la session actuelle</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto max-h-80">
              {loading.session ? "Chargement..." : sessionData ? formatJson(sessionData) : "Aucune donnée"}
            </pre>
          </CardContent>
          <CardFooter>
            <Button onClick={fetchSessionData} disabled={loading.session}>
              {loading.session ? "Chargement..." : "Rafraîchir"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Base de données</CardTitle>
            <CardDescription>Informations sur la base de données</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto max-h-80">
              {loading.database ? "Chargement..." : databaseData ? formatJson(databaseData) : "Aucune donnée"}
            </pre>
          </CardContent>
          <CardFooter>
            <Button onClick={fetchDatabaseData} disabled={loading.database}>
              {loading.database ? "Chargement..." : "Rafraîchir"}
            </Button>
          </CardFooter>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Cookies</CardTitle>
            <CardDescription>Informations sur les cookies</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto max-h-80">
              {loading.cookies ? "Chargement..." : cookiesData ? formatJson(cookiesData) : "Aucune donnée"}
            </pre>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={fetchCookiesData} disabled={loading.cookies}>
              {loading.cookies ? "Chargement..." : "Rafraîchir"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                document.cookie = "session_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
                setTimeout(fetchCookiesData, 100)
              }}
            >
              Supprimer le cookie de session
            </Button>
            <Button
              onClick={async () => {
                await fetch("/api/debug/set-cookie")
                setTimeout(fetchCookiesData, 100)
              }}
            >
              Définir un cookie de test direct
            </Button>
            <Button
              onClick={async () => {
                await fetch("/api/debug/set-session")
                setTimeout(() => {
                  fetchSessionData()
                  fetchCookiesData()
                }, 100)
              }}
            >
              Définir le cookie de session manuellement
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => (window.location.href = "/login")}>
          Aller à la page de connexion
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
          Aller au tableau de bord
        </Button>
      </div>
    </div>
  )
}

