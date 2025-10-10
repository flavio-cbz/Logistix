#!/usr/bin/env ts-node

/**
 * Script d'export SQLite vers format portable (JSON/CSV)
 * 
 * Usage:
 *   npm run db:export -- --format=json --output=./export.json
 *   npm run db:export -- --format=csv --output=./export.csv --table=produits
 * 
 * Options:
 *   --format    Format de sortie (json|csv) [défaut: json]
 *   --output    Fichier de sortie [défaut: ./db-export-{timestamp}.{format}]
 *   --table     Table spécifique à exporter (optionnel, exporte toutes par défaut)
 *   --compress  Compresser avec gzip [défaut: false]
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';

interface ExportOptions {
  format: 'json' | 'csv';
  output?: string;
  table?: string;
  compress?: boolean;
}

interface TableData {
  name: string;
  schema: string;
  rows: Record<string, any>[];
  rowCount: number;
}

interface ExportManifest {
  version: string;
  exportDate: string;
  database: string;
  tables: {
    name: string;
    rowCount: number;
    schema: string;
  }[];
}

const DB_PATH = path.join(process.cwd(), 'data', 'logistix.db');
const TABLES_TO_EXPORT = ['users', 'produits', 'parcelles', 'products'];

/**
 * Parse les arguments CLI
 */
function parseArgs(): ExportOptions {
  const args = process.argv.slice(2);
  const options: ExportOptions = {
    format: 'json',
    compress: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--format' && args[i + 1]) {
      options.format = args[i + 1] as 'json' | 'csv';
      i++;
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[i + 1];
      i++;
    } else if (arg === '--table' && args[i + 1]) {
      options.table = args[i + 1];
      i++;
    } else if (arg === '--compress') {
      options.compress = true;
    }
  }

  // Générer nom de fichier par défaut si non spécifié
  if (!options.output) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = options.format === 'json' ? 'json' : 'csv';
    const suffix = options.compress ? `.${ext}.gz` : `.${ext}`;
    options.output = `./db-export-${timestamp}${suffix}`;
  }

  return options;
}

/**
 * Récupère le schéma d'une table
 */
function getTableSchema(db: Database.Database, tableName: string): string {
  const stmt = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`);
  const result = stmt.get(tableName) as { sql: string } | undefined;
  return result?.sql || '';
}

/**
 * Exporte une table en JSON
 */
function exportTableAsJSON(db: Database.Database, tableName: string): TableData {
  console.log(`📦 Exportation de la table "${tableName}"...`);
  
  const schema = getTableSchema(db, tableName);
  const stmt = db.prepare(`SELECT * FROM ${tableName}`);
  const rows = stmt.all() as Record<string, any>[];
  
  console.log(`   ✓ ${rows.length} lignes exportées`);
  
  return {
    name: tableName,
    schema,
    rows,
    rowCount: rows.length,
  };
}

/**
 * Exporte une table en CSV
 */
function exportTableAsCSV(db: Database.Database, tableName: string): string {
  console.log(`📦 Exportation de la table "${tableName}" en CSV...`);
  
  const stmt = db.prepare(`SELECT * FROM ${tableName}`);
  const rows = stmt.all() as Record<string, any>[];
  
  if (rows.length === 0) {
    console.log(`   ⚠️  Table vide`);
    return '';
  }
  
  // Header CSV
  const columns = Object.keys(rows[0]);
  let csv = columns.join(',') + '\n';
  
  // Lignes CSV
  for (const row of rows) {
    const values = columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csv += values.join(',') + '\n';
  }
  
  console.log(`   ✓ ${rows.length} lignes exportées`);
  return csv;
}

/**
 * Export principal en JSON
 */
async function exportAsJSON(db: Database.Database, options: ExportOptions): Promise<void> {
  const tablesToExport = options.table ? [options.table] : TABLES_TO_EXPORT;
  
  const exportData: {
    manifest: ExportManifest;
    tables: TableData[];
  } = {
    manifest: {
      version: '1.0',
      exportDate: new Date().toISOString(),
      database: DB_PATH,
      tables: [],
    },
    tables: [],
  };
  
  for (const tableName of tablesToExport) {
    const tableData = exportTableAsJSON(db, tableName);
    exportData.tables.push(tableData);
    exportData.manifest.tables.push({
      name: tableData.name,
      rowCount: tableData.rowCount,
      schema: tableData.schema,
    });
  }
  
  const jsonContent = JSON.stringify(exportData, null, 2);
  
  if (options.compress) {
    console.log(`🗜️  Compression gzip...`);
    const input = Buffer.from(jsonContent);
    const gzip = createGzip();
    const output = fs.createWriteStream(options.output!);
    
    await pipeline(
      async function* () { yield input; },
      gzip,
      output
    );
  } else {
    fs.writeFileSync(options.output!, jsonContent, 'utf-8');
  }
  
  const stats = fs.statSync(options.output!);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  
  console.log(`✅ Export terminé : ${options.output} (${sizeMB} MB)`);
}

/**
 * Export principal en CSV
 */
async function exportAsCSV(db: Database.Database, options: ExportOptions): Promise<void> {
  if (!options.table) {
    console.error('❌ Erreur : --table requis pour export CSV');
    process.exit(1);
  }
  
  const csv = exportTableAsCSV(db, options.table);
  
  if (options.compress) {
    console.log(`🗜️  Compression gzip...`);
    const { Readable } = await import('stream');
    const input = Readable.from([csv]);
    const gzip = createGzip();
    const output = fs.createWriteStream(options.output!);
    
    await pipeline(input, gzip, output);
    
    const stats = fs.statSync(options.output!);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✅ Export terminé : ${options.output} (${sizeMB} MB)`);
  } else {
    fs.writeFileSync(options.output!, csv, 'utf-8');
    const stats = fs.statSync(options.output!);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✅ Export terminé : ${options.output} (${sizeMB} MB)`);
  }
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Export SQLite Database');
  console.log('========================\n');
  
  const options = parseArgs();
  
  console.log(`📋 Configuration:`);
  console.log(`   Format: ${options.format}`);
  console.log(`   Output: ${options.output}`);
  console.log(`   Table: ${options.table || 'toutes'}`);
  console.log(`   Compression: ${options.compress ? 'oui' : 'non'}\n`);
  
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ Erreur : Base de données introuvable : ${DB_PATH}`);
    process.exit(1);
  }
  
  const db = new Database(DB_PATH, { readonly: true });
  
  try {
    if (options.format === 'json') {
      await exportAsJSON(db, options);
    } else {
      await exportAsCSV(db, options);
    }
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
