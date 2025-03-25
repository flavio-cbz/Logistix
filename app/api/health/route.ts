import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Vérifier l'accès au système de fichiers
    const fs = require("fs")
    const dataDir = process.cwd() + "/public/data"

    try {
      // Vérifier si le répertoire existe, sinon le créer
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      // Vérifier si on peut écrire dans le répertoire
      fs.accessSync(dataDir, fs.constants.W_OK)
    } catch (fsError) {
      console.error("Filesystem check failed:", fsError)
      return NextResponse.json(
        { status: "error", message: "Filesystem check failed", error: String(fsError) },
        { status: 500 },
      )
    }

    // Vérifier la mémoire disponible
    const memoryUsage = process.memoryUsage()
    const memoryCheck = memoryUsage.heapUsed < 1024 * 1024 * 500 // Moins de 500 MB utilisés

    if (!memoryCheck) {
      console.warn("Memory usage is high:", memoryUsage)
    }

    // Tout est OK
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + " MB",
      },
    })
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json({ status: "error", message: "Health check failed", error: String(error) }, { status: 500 })
  }
}

