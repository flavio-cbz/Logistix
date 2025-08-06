import { NextResponse } from "next/server"
import { db } from "@/lib/services/database/db"
import fs from "fs"
import path from "path"

interface TableInfo {
  name: string;
}

interface CountResult {
  count: number;
}

export async function GET() {
  try {
    // Vérifier si la base de données existe
    const dbPath = path.join(process.cwd(), "data", "logistix.db")
    const dbExists = fs.existsSync(dbPath)

    // Informations sur le fichier de base de données
    let fileInfo = null
    if (dbExists) {
      const stats = fs.statSync(dbPath)
      fileInfo = {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        permissions: stats.mode.toString(8).slice(-3),
      }
    }

    // Vérifier les tables
    let tables: string[] = []
    try {
      const tableList = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as TableInfo[]

      tables = tableList.map((t: TableInfo) => t.name)
    } catch (error: any) {
      tables = [`Erreur: ${error.message}`]
    }

    // Compter les enregistrements dans chaque table
    const counts: Record<string, number | string> = {}
    for (const table of tables) {
      if (typeof table === "string" && !table.startsWith("Erreur") && !table.startsWith("sqlite_")) {
        try {
          const count = (db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as CountResult).count;
          counts[table] = count;
        } catch (error: any) {
          counts[table] = `Erreur: ${error.message}`;
        }
      }
    }

    // Vérifier les utilisateurs
    let users = []
    try {
      users = db.prepare("SELECT id, username FROM users LIMIT 10").all()
    } catch (error: any) {
      users = [`Erreur: ${error.message}`]
    }

    // Vérifier les sessions
    let sessions = []
    try {
      sessions = db.prepare("SELECT id, user_id, expires_at FROM sessions LIMIT 10").all()
    } catch (error: any) {
      sessions = [`Erreur: ${error.message}`]
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      database: {
        exists: dbExists,
        path: dbPath,
        file: fileInfo,
        tables,
        counts,
      },
      users,
      sessions,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

