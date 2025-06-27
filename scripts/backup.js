const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

// Configuration
const dataDir = path.join(process.cwd(), "public", "data")
const backupDir = path.join(process.cwd(), "backups")
const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
const backupFile = path.join(backupDir, `backup-${timestamp}.json`)

// Créer le répertoire de sauvegarde s'il n'existe pas
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true })
}

try {
  console.log("Démarrage de la sauvegarde...")

  // Vérifier si le répertoire de données existe
  if (!fs.existsSync(dataDir)) {
    console.log("Aucune donnée à sauvegarder. Création du répertoire de données...")
    fs.mkdirSync(dataDir, { recursive: true })
    process.exit(0)
  }

  // Lire les fichiers de données
  const files = fs.readdirSync(dataDir).filter((file) => file.endsWith(".json"))

  if (files.length === 0) {
    console.log("Aucun fichier de données trouvé.")
    process.exit(0)
  }

  // Créer un objet pour stocker toutes les données
  const backupData = {}

  // Lire chaque fichier et ajouter son contenu à l'objet de sauvegarde
  files.forEach((file) => {
    const filePath = path.join(dataDir, file)
    const content = fs.readFileSync(filePath, "utf8")
    try {
      backupData[file.replace(".json", "")] = JSON.parse(content)
    } catch (e) {
      console.error(`Erreur lors de la lecture du fichier ${file}:`, e)
    }
  })

  // Ajouter des métadonnées
  backupData.metadata = {
    timestamp: new Date().toISOString(),
    version: require("../package.json").version,
    files: files,
  }

  // Écrire le fichier de sauvegarde
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2))

  console.log(`Sauvegarde terminée: ${backupFile}`)

  // Créer une copie compressée
  const gzipFile = `${backupFile}.gz`
  execSync(`gzip -c "${backupFile}" > "${gzipFile}"`)
  console.log(`Version compressée créée: ${gzipFile}`)
} catch (error) {
  console.error("Erreur lors de la sauvegarde:", error)
  process.exit(1)
}

