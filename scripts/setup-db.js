const fs = require("fs")
const path = require("path")

// Création du dossier data s'il n'existe pas
const dataDir = path.join(process.cwd(), "data")
if (!fs.existsSync(dataDir)) {
  console.log("Création du dossier data...")
  fs.mkdirSync(dataDir, { recursive: true })
}

// Vérification des permissions
try {
  fs.accessSync(dataDir, fs.constants.R_OK | fs.constants.W_OK)
  console.log("Les permissions du dossier data sont correctes.")
} catch (err) {
  console.error("Erreur: Le dossier data n'a pas les bonnes permissions.")
  console.error("Veuillez exécuter: chmod 755 data")
  process.exit(1)
}

console.log("Configuration de la base de données terminée.")

