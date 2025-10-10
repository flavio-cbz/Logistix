#!/bin/bash

# Script pour recompiler better-sqlite3 avec la bonne version de Node.js
# Usage: npm run fix:sqlite3

echo "🔧 Fixing better-sqlite3 module version mismatch..."

# Détecter la version de Node.js utilisée par le système
NODE_VERSION=$(node --version)
echo "📌 Detected Node.js version: $NODE_VERSION"

# Supprimer le build existant
echo "🗑️  Removing old build..."
rm -rf node_modules/better-sqlite3/build

# Recompiler avec node-gyp
echo "🔨 Recompiling better-sqlite3..."
cd node_modules/better-sqlite3
node-gyp rebuild --release
cd ../..

# Tester la compilation
echo "✅ Testing better-sqlite3..."
node -e "const Database = require('better-sqlite3'); const db = new Database('./data/logistix.db'); console.log('✅ better-sqlite3 works with Node.js', process.version); db.close();"

echo "✨ Done! better-sqlite3 is now compatible with $NODE_VERSION"
