#!/usr/bin/env node

/**
 * Export SQLite database to neutral format (JSON/CSV)
 * Usage: node scripts/export-sqlite.js [format] [output-dir]
 */

// Note: This is a CommonJS script that would need proper module imports in production
// For now, we'll use a simplified export that doesn't rely on the TypeScript modules

const Database = require('better-sqlite3');
const fs = require('fs').promises;
const path = require('path');

const DEFAULT_OUTPUT_DIR = './data/exports';

async function exportTable(db, tableName, format = 'json') {
  try {
    console.log(`📊 Exporting table: ${tableName}`);
    
    // Check if table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `).get(tableName);
    
    if (!tableExists) {
      console.log(`   ⚠️ Table ${tableName} does not exist, skipping`);
      return { tableName, rows: [], count: 0, error: `Table ${tableName} not found` };
    }
    
    const rows = db.prepare(`SELECT * FROM ${tableName} ORDER BY created_at`).all();
    
    console.log(`   Found ${rows.length} records`);
    return { tableName, rows, count: rows.length };
    
  } catch (error) {
    console.error(`❌ Error exporting ${tableName}:`, error.message);
    return { tableName, rows: [], count: 0, error: error.message };
  }
}

async function exportToJSON(tables, outputDir) {
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      source: 'sqlite',
      totalRecords: tables.reduce((sum, t) => sum + t.count, 0)
    },
    tables: {}
  };

  // Add each table's data
  for (const table of tables) {
    exportData.tables[table.tableName] = {
      count: table.count,
      data: table.rows,
      error: table.error || null
    };
  }

  const outputPath = path.join(outputDir, `logistix-export-${Date.now()}.json`);
  await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
  
  console.log(`💾 JSON export saved to: ${outputPath}`);
  return outputPath;
}

async function exportToCSV(tables, outputDir) {
  const csvFiles = [];
  
  for (const table of tables) {
    if (table.rows.length === 0) continue;
    
    // Generate CSV header from first row keys
    const headers = Object.keys(table.rows[0]);
    const csvRows = [headers.join(',')];
    
    // Add data rows
    for (const row of table.rows) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvRows.push(values.join(','));
    }
    
    const csvContent = csvRows.join('\n');
    const csvPath = path.join(outputDir, `${table.tableName}-${Date.now()}.csv`);
    await fs.writeFile(csvPath, csvContent, 'utf8');
    
    console.log(`💾 CSV export saved: ${csvPath} (${table.count} records)`);
    csvFiles.push(csvPath);
  }
  
  return csvFiles;
}

async function exportDatabase(format = 'json', outputDir = DEFAULT_OUTPUT_DIR) {
  console.log('🚀 Starting SQLite database export...');
  console.log(`   Format: ${format}`);
  console.log(`   Output: ${outputDir}`);
  
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });
  
  // Connect to database
  const dbPath = './data/logistix.db';
  let db;
  
  try {
    db = new Database(dbPath);
    console.log(`   Connected to: ${dbPath}`);
  } catch (error) {
    console.error(`❌ Cannot connect to database: ${error.message}`);
    return { success: false, error: error.message };
  }
  
  // List of tables to export
  const tablesToExport = [
    'users',
    'sessions', 
    'parcelles',
    'produits'
  ];
  
  // Export each table
  const exportResults = [];
  for (const tableName of tablesToExport) {
    const result = await exportTable(db, tableName, format);
    exportResults.push(result);
  }
  
  // Close database connection
  db.close();
  
  // Save in requested format
  let outputPaths;
  if (format.toLowerCase() === 'csv') {
    outputPaths = await exportToCSV(exportResults, outputDir);
  } else {
    outputPaths = [await exportToJSON(exportResults, outputDir)];
  }
  
  // Summary
  const totalRecords = exportResults.reduce((sum, t) => sum + t.count, 0);
  const errorTables = exportResults.filter(t => t.error);
  
  console.log('\n📋 Export Summary:');
  console.log(`   Total records exported: ${totalRecords}`);
  console.log(`   Tables processed: ${exportResults.length}`);
  console.log(`   Errors: ${errorTables.length}`);
  
  if (errorTables.length > 0) {
    console.log('   ❌ Failed tables:', errorTables.map(t => t.tableName).join(', '));
  }
  
  console.log('   📁 Output files:', outputPaths);
  console.log('\n✅ Export completed!');
  
  return {
    totalRecords,
    tables: exportResults.length,
    errors: errorTables.length,
    outputPaths,
    success: true
  };
}

// CLI usage
if (require.main === module) {
  const [,, format = 'json', outputDir = DEFAULT_OUTPUT_DIR] = process.argv;
  
  exportDatabase(format, outputDir)
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Export failed:', error);
      process.exit(1);
    });
}

module.exports = { exportDatabase, exportTable };