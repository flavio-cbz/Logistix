import { writeFile, mkdir, access } from "fs/promises"
import path from "path"
import { NextResponse } from "next/server"

const testData = {
  parcelles: [
    {
      id: "p1",
      numero: "A123",
      transporteur: "DHL",
      poids: 1500,
      prixTotalUSD: 150,
      prixTotalEUR: 127.5,
      prixParGramme: 0.085,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "p2",
      numero: "B456",
      transporteur: "FedEx",
      poids: 800,
      prixTotalUSD: 95,
      prixTotalEUR: 80.75,
      prixParGramme: 0.101,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  produits: [
    {
      id: "prod1",
      commandeId: "CMD001",
      nom: "Nike Air Max",
      parcelleId: "p1",
      details: "Taille 42, Noir",
      prixArticle: 89.99,
      prixArticleTTC: 95.98,
      poids: 400,
      vendu: true,
      dateVente: "2024-02-15",
      tempsEnLigne: "3 jours",
      prixVente: 159.99,
      plateforme: "Vinted",
      prixLivraison: 5.99,
      benefices: 64.01,
      pourcentageBenefice: 66.69,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "prod2",
      commandeId: "CMD002",
      nom: "Adidas Superstar",
      parcelleId: "p1",
      details: "Taille 41, Blanc",
      prixArticle: 79.99,
      prixArticleTTC: 85.98,
      poids: 350,
      vendu: true,
      dateVente: "2024-02-10",
      tempsEnLigne: "5 jours",
      prixVente: 129.99,
      plateforme: "Vinted",
      prixLivraison: 5.99,
      benefices: 44.01,
      pourcentageBenefice: 51.19,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
}

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), "public", "data")

    // Crée le dossier data s'il n'existe pas
    await mkdir(dbPath, { recursive: true })

    // Vérifie si les fichiers existent déjà
    const parcellesPath = path.join(dbPath, "parcelles.json")
    const produitsPath = path.join(dbPath, "produits.json")

    try {
      // Vérifie si les fichiers existent
      await access(parcellesPath)
      await access(produitsPath)

      // Si les fichiers existent, ne pas les écraser
      return NextResponse.json({ message: "Les fichiers de données existent déjà" })
    } catch {
      // Si les fichiers n'existent pas, les créer avec les données de test
      await writeFile(parcellesPath, JSON.stringify(testData.parcelles, null, 2))
      await writeFile(produitsPath, JSON.stringify(testData.produits, null, 2))

      return NextResponse.json({ message: "Base de données initialisée avec succès" })
    }
  } catch (error) {
    console.error("Erreur lors de l'initialisation de la base de données:", error)
    return NextResponse.json({ error: "Erreur lors de l'initialisation de la base de données" }, { status: 500 })
  }
}

