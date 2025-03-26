const fs = require("fs")
const path = require("path")
const readline = require("readline")

// Configuration
const dataDir = path.join(process.cwd(), "public", "data")
const backupDir = path.join(process.cwd(), "backups")

// Créer une interface de ligne de commande
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Vérifier si le répertoire de sauvegarde existe
if (!fs.existsSync(backupDir)) {
  console.error("Répertoire de sauvegarde introuvable.")
  process.exit(1)
}

// Lister les fichiers de sauvegarde
const backupFiles = fs
  .readdirSync(backupDir)
  .filter((file) => file.endsWith(".json"))
  .sort((a, b) => b.localeCompare(a)) // Trier par ordre décroissant

if (backupFiles.length === 0) {
  console.error("Aucun fichier de sauvegarde trouvé.")
  process.exit(1)
}

console.log("Fichiers de sauvegarde disponibles:")
backupFiles.forEach((file, index) => {
  console.log(`${index + 1}. ${file}`)
})

rl.question("Sélectionnez un fichier de sauvegarde (numéro): ", async (answer) => {
  const fileIndex = Number.parseInt(answer) - 1

  if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= backupFiles.length) {
    console.error("Sélection invalide.")
    rl.close()
    process.exit(1)
  }

  const selectedFile = backupFiles[fileIndex]
  const backupFilePath = path.join(backupDir, selectedFile)

  rl.question(
    `Êtes-vous sûr de vouloir restaurer ${selectedFile}? Cette action écrasera toutes les données existantes. (oui/non): `,
    async (confirmation) => {
      if (confirmation.toLowerCase() !== "oui") {
        console.log("Restauration annulée.")
        rl.close()
        return
      }

      try {
        console.log("Démarrage de la restauration...")

        // Créer le répertoire de données s'il n'existe pas
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true })
        }

        // Lire le fichier de sauvegarde
        const backupContent = fs.readFileSync(backupFilePath, "utf8")
        const backupData = JSON.parse(backupContent)

        // Supprimer les métadonnées
        const { metadata, ...data } = backupData

        // Écrire chaque section dans un fichier séparé
        for (const [key, value] of Object.entries(data)) {
          const filePath = path.join(dataDir, `${key}.json`)
          fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
          console.log(`Fichier restauré: ${filePath}`)
        }

        console.log("Restauration terminée avec succès.")
      } catch (error) {
        console.error("Erreur lors de la restauration:", error)
      } finally {
        rl.close()
      }
    },
  )
})

