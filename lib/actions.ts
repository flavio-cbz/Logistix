"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import type { Parcelle, Produit, DashboardConfig } from "@/types"

// Fonction pour récupérer les données du cookie
function getCookieData(key: string) {
  const cookieStore = cookies()
  const data = cookieStore.get(key)
  return data ? JSON.parse(data.value) : null
}

// Fonction pour stocker les données dans un cookie
function setCookieData(key: string, value: any) {
  const cookieStore = cookies()
  cookieStore.set(key, JSON.stringify(value), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  })
}

// Actions pour les produits
export async function getProduits() {
  // Cette fonction est appelée côté serveur, mais nous utilisons les données du store côté client
  // Nous retournons donc un tableau vide, les données réelles seront chargées par le store
  return []
}

export async function addProduit(data: Omit<Produit, "id">) {
  // Cette action est gérée par le store côté client
  revalidatePath("/produits")
  revalidatePath("/dashboard")
  revalidatePath("/statistiques")
}

export async function updateProduit(id: string, data: Partial<Produit>) {
  // Cette action est gérée par le store côté client
  revalidatePath("/produits")
  revalidatePath("/dashboard")
  revalidatePath("/statistiques")
}

export async function deleteProduit(id: string) {
  // Cette action est gérée par le store côté client
  revalidatePath("/produits")
  revalidatePath("/dashboard")
  revalidatePath("/statistiques")
}

// Actions pour les parcelles
export async function getParcelles() {
  // Cette fonction est appelée côté serveur, mais nous utilisons les données du store côté client
  // Nous retournons donc un tableau vide, les données réelles seront chargées par le store
  return []
}

export async function addParcelle(data: Omit<Parcelle, "id">) {
  // Cette action est gérée par le store côté client
  revalidatePath("/parcelles")
  revalidatePath("/dashboard")
  revalidatePath("/statistiques")
}

export async function updateParcelle(id: string, data: Partial<Parcelle>) {
  // Cette action est gérée par le store côté client
  revalidatePath("/parcelles")
  revalidatePath("/dashboard")
  revalidatePath("/statistiques")
}

export async function deleteParcelle(id: string) {
  // Cette action est gérée par le store côté client
  revalidatePath("/parcelles")
  revalidatePath("/dashboard")
  revalidatePath("/statistiques")
}

// Statistiques
export async function getStatistiques() {
  // Cette fonction est appelée côté serveur, mais nous utilisons les données du store côté client
  // Nous retournons donc un objet vide, les données réelles seront calculées par le store
  return {
    produitsVendus: 0,
    ventesTotales: 0,
    beneficesTotaux: 0,
    nombreParcelles: 0,
  }
}

// Actions pour les paramètres et le profil
export async function getAppSettings() {
  // Récupérer les paramètres depuis le cookie ou utiliser les valeurs par défaut
  return (
    getCookieData("app-settings") || {
      defaultCurrency: "EUR",
      exchangeRateAPI: "https://api.exchangerate-api.com/v4/latest/USD",
      enableNotifications: true,
      autoUpdatePrices: false,
      defaultTVA: "20",
      defaultShippingCost: "9.99",
    }
  )
}

export async function updateAppSettings(settings: any) {
  // Stocker les paramètres dans un cookie
  setCookieData("app-settings", settings)
  revalidatePath("/settings")
  return { success: true }
}

export async function getAppProfile() {
  // Récupérer le profil depuis le cookie ou utiliser les valeurs par défaut
  return (
    getCookieData("app-profile") || {
      username: "Admin",
      email: "admin@example.com",
      bio: "Gestionnaire de l'application",
      language: "fr",
      theme: "system",
    }
  )
}

export async function updateAppProfile(profile: any) {
  // Stocker le profil dans un cookie
  setCookieData("app-profile", profile)
  revalidatePath("/profile")
  return { success: true }
}

export async function getDashboardConfig() {
  // Récupérer la configuration du dashboard depuis le cookie ou utiliser les valeurs par défaut
  return (
    getCookieData("dashboard-config") || {
      cards: [
        {
          id: "stats",
          title: "Statistiques principales",
          type: "stats",
          component: "MainStats",
          enabled: true,
          order: 0,
        },
        {
          id: "performance",
          title: "Performance des ventes",
          type: "chart",
          component: "PerformanceChart",
          enabled: true,
          order: 1,
        },
        {
          id: "plateformes",
          title: "Répartition par plateforme",
          type: "chart",
          component: "VentesPlateformes",
          enabled: true,
          order: 2,
        },
        { id: "top-produits", title: "Top produits", type: "table", component: "TopProduits", enabled: true, order: 3 },
        { id: "temps-vente", title: "Temps de vente", type: "chart", component: "TempsVente", enabled: true, order: 4 },
      ],
      layout: ["stats", "performance", "plateformes", "top-produits", "temps-vente"],
    }
  )
}

export async function updateDashboardConfig(config: DashboardConfig) {
  // Stocker la configuration du dashboard dans un cookie
  setCookieData("dashboard-config", config)
  revalidatePath("/dashboard")
  return { success: true }
}

