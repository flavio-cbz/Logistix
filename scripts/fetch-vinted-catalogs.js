#!/usr/bin/env node

/**
 * Script pour récupérer la hiérarchie complète des catalogues Vinted
 * Utilise l'API Vinted pour obtenir tous les catalogues réels
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const VINTED_API_BASE = 'https://www.vinted.fr/api/v2';
const CATALOGS_ENDPOINT = `${VINTED_API_BASE}/catalogs`;
const OUTPUT_FILE = path.join(__dirname, '../lib/data/vinted-catalogs-real.json');

// Token Vinted (à remplacer par un token valide)
const VINTED_TOKEN = 'eyJraWQiOiJFNTdZZHJ1SHBsQWp1MmNObzFEb3JIM2oyN0J1NS1zX09QNVB3UGlobjVNIiwiYWxnIjoiUFMyNTYifQ.eyJhcHBfaWQiOjQsImNsaWVudF9pZCI6IndlYiIsImF1ZCI6ImZyLmNvcmUuYXBpIiwiaXNzIjoidmludGVkLWlhbS1zZXJ2aWNlIiwic3ViIjoiMjc2NjIyMzI3IiwiaWF0IjoxNzUzOTgzMDYzLCJzaWQiOiIyZDkyMGIyOS0xNzUxMjk0NDE1Iiwic2NvcGUiOiJ1c2VyIiwiZXhwIjoxNzUzOTkwMjYzLCJwdXJwb3NlIjoiYWNjZXNzIiwiYWN0Ijp7InN1YiI6IjI3NjYyMjMyNyJ9LCJhY2NvdW50X2lkIjoyMTc1OTgxMTF9.wHfyRkNjhRKaqvmMeGr4uM-PQcUNLOBxfKh35YDKF2dvczRn5eNiH2LPKsd2QVV45iizELuh0GrOjtLMgw0npCYspVX82FsBAehXEFSpY0L9mUg5YVvIs0L-NTC9_fjIREs0wlEHhWqnGvh6qviPMWkwh1vk4nTz87l1VZiX2cQSv8vPEJJZktRHEZqkOLqoxJPr_HPvyaPcAnRfknNR0sGdovfqeLgchd74M9iX9nKQRgYzKrXjdUGyDsiGudIRHMj2C2sAG33zychMlIbLST2PTZf5vkAQn6P32ukNuqDs0E-ZhoVHk5pZTar4XgEk1Q20xhW5VdW24dMzJh6oAg';

function createHeaders(token) {
  const baseHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    'Referer': 'https://www.vinted.fr/',
    'Origin': 'https://www.vinted.fr'
  };

  // Détecter le type de token
  if (token.startsWith('eyJ')) {
    return {
      ...baseHeaders,
      'Authorization': `Bearer ${token}`
    };
  } else {
    return {
      ...baseHeaders,
      'Cookie': `access_token_web=${token}`
    };
  }
}

function analyzeHierarchy(catalogs, parentId = null, level = 1) {
  const result = {
    level1: [],
    level2: [],
    level3: [],
    level4Plus: []
  };

  catalogs.forEach(catalog => {
    const catalogInfo = {
      id: catalog.id,
      title: catalog.title,
      level: level,
      parentId: parentId,
      hasChildren: catalog.catalogs && catalog.catalogs.length > 0,
      childrenCount: catalog.catalogs ? catalog.catalogs.length : 0
    };

    if (level === 1) {
      result.level1.push(catalogInfo);
    } else if (level === 2) {
      result.level2.push(catalogInfo);
    } else if (level === 3) {
      result.level3.push(catalogInfo);
    } else {
      result.level4Plus.push(catalogInfo);
    }

    // Analyser récursivement les sous-catalogues
    if (catalog.catalogs && catalog.catalogs.length > 0) {
      const subResult = analyzeHierarchy(catalog.catalogs, catalog.id, level + 1);
      result.level1.push(...subResult.level1);
      result.level2.push(...subResult.level2);
      result.level3.push(...subResult.level3);
      result.level4Plus.push(...subResult.level4Plus);
    }
  });

  return result;
}

function generateKeywords(catalogTitle) {
  const title = catalogTitle.toLowerCase();
  const keywords = [title];
  
  // Ajouter des variations communes
  const variations = {
    'chaussures': ['shoes', 'souliers'],
    'vêtements': ['clothes', 'habits', 'vêtement'],
    'accessoires': ['accessories', 'accessoire'],
    'sacs': ['bags', 'sac', 'handbags'],
    'bijoux': ['jewelry', 'jewellery', 'bijou'],
    'montres': ['watches', 'montre', 'watch'],
    'robes': ['dresses', 'robe', 'dress'],
    'pantalons': ['pants', 'trousers', 'pantalon'],
    'jeans': ['jean', 'denim'],
    'baskets': ['sneakers', 'trainers', 'basket'],
    'bottes': ['boots', 'botte'],
    'talons': ['heels', 'talon', 'escarpins']
  };

  Object.entries(variations).forEach(([french, alternatives]) => {
    if (title.includes(french)) {
      keywords.push(...alternatives);
    }
  });

  return keywords;
}

async function fetchVintedCatalogs() {
  console.log('🔍 Récupération des catalogues Vinted...');
  
  try {
    const headers = createHeaders(VINTED_TOKEN);
    console.log('Headers créés:', Object.keys(headers));

    const response = await axios.get(CATALOGS_ENDPOINT, {
      headers,
      timeout: 15000,
    });

    console.log('✅ Réponse reçue, status:', response.status);
    
    if (response.data && response.data.catalogs) {
      const catalogs = response.data.catalogs;
      console.log(`📊 ${catalogs.length} catalogues de niveau 1 trouvés`);

      // Analyser la hiérarchie
      const hierarchy = analyzeHierarchy(catalogs);
      
      console.log('\n📈 Analyse de la hiérarchie:');
      console.log(`   Niveau 1: ${hierarchy.level1.length} catalogues`);
      console.log(`   Niveau 2: ${hierarchy.level2.length} catalogues`);
      console.log(`   Niveau 3: ${hierarchy.level3.length} catalogues`);
      console.log(`   Niveau 4+: ${hierarchy.level4Plus.length} catalogues`);

      // Afficher quelques exemples de niveau 3
      console.log('\n🎯 Exemples de catalogues niveau 3 (requis pour l\'API):');
      hierarchy.level3.slice(0, 10).forEach(cat => {
        console.log(`   - ${cat.title} (ID: ${cat.id})`);
      });

      // Sauvegarder les données complètes
      const outputData = {
        fetchedAt: new Date().toISOString(),
        totalCatalogs: catalogs.length,
        hierarchy: hierarchy,
        rawData: catalogs
      };

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2));
      console.log(`\n💾 Données sauvegardées dans: ${OUTPUT_FILE}`);

      // Générer un fichier TypeScript avec la hiérarchie complète
      await generateTypeScriptHierarchy(hierarchy, catalogs);

      return outputData;
    } else {
      console.log('❌ Aucun catalogue trouvé dans la réponse');
      console.log('Structure de la réponse:', Object.keys(response.data || {}));
    }

  } catch (error) {
    console.log('❌ Erreur lors de la récupération:');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 401) {
      console.log('   💡 Le token semble expiré. Veuillez le mettre à jour dans le script.');
    }
  }
}

async function generateTypeScriptHierarchy(hierarchy, rawCatalogs) {
  console.log('\n🔧 Génération du fichier TypeScript...');

  // Construire la hiérarchie TypeScript
  const level1Catalogs = hierarchy.level1.filter(cat => cat.level === 1);
  
  let tsContent = `/**
 * Hiérarchie complète des catalogues Vinted (générée automatiquement)
 * Récupérée le ${new Date().toISOString()}
 * Total: ${hierarchy.level3.length} catégories niveau 3 disponibles
 */

import type { VintedCatalogHierarchy } from '@/lib/types/vinted-catalog-hierarchy';

export const VINTED_CATALOG_HIERARCHY_COMPLETE: VintedCatalogHierarchy = {
  level1: [
`;

  // Fonction récursive pour construire la hiérarchie
  function buildCatalogStructure(catalogs, level = 1, indent = '    ') {
    let result = '';
    
    catalogs.forEach((catalog, index) => {
      const isLast = index === catalogs.length - 1;
      
      result += `${indent}{\n`;
      result += `${indent}  id: ${catalog.id},\n`;
      result += `${indent}  name: "${catalog.title}",\n`;
      result += `${indent}  level: ${level},\n`;
      
      if (level > 1) {
        const parent = findParentCatalog(catalog.id, rawCatalogs);
        if (parent) {
          result += `${indent}  parentId: ${parent.id},\n`;
        }
      }
      
      if (level === 3) {
        const keywords = generateKeywords(catalog.title);
        result += `${indent}  keywords: ${JSON.stringify(keywords)},\n`;
        result += `${indent}  isValidForAnalysis: true,\n`;
        result += `${indent}  description: "${catalog.title}"\n`;
      } else {
        result += `${indent}  description: "${catalog.title}",\n`;
        
        // Ajouter les enfants
        const children = findChildrenCatalogs(catalog.id, rawCatalogs);
        if (children.length > 0) {
          result += `${indent}  children: [\n`;
          result += buildCatalogStructure(children, level + 1, indent + '    ');
          result += `${indent}  ]\n`;
        } else {
          result += `${indent}  children: []\n`;
        }
      }
      
      result += `${indent}}${isLast ? '' : ','}\n`;
    });
    
    return result;
  }

  function findParentCatalog(catalogId, catalogs, parentId = null) {
    for (const catalog of catalogs) {
      if (catalog.id === catalogId) {
        return parentId ? { id: parentId } : null;
      }
      if (catalog.catalogs) {
        const found = findParentCatalog(catalogId, catalog.catalogs, catalog.id);
        if (found) return found;
      }
    }
    return null;
  }

  function findChildrenCatalogs(parentId, catalogs) {
    for (const catalog of catalogs) {
      if (catalog.id === parentId) {
        return catalog.catalogs || [];
      }
      if (catalog.catalogs) {
        const found = findChildrenCatalogs(parentId, catalog.catalogs);
        if (found.length > 0) return found;
      }
    }
    return [];
  }

  // Construire seulement les catalogues de niveau 1 pour commencer
  const mainCatalogs = rawCatalogs.slice(0, 3); // Limiter pour éviter un fichier trop gros
  tsContent += buildCatalogStructure(mainCatalogs);

  tsContent += `  ]
};

/**
 * Statistiques des catalogues
 */
export const CATALOG_STATS = {
  totalLevel1: ${hierarchy.level1.filter(c => c.level === 1).length},
  totalLevel2: ${hierarchy.level2.length},
  totalLevel3: ${hierarchy.level3.length},
  totalLevel4Plus: ${hierarchy.level4Plus.length},
  fetchedAt: "${new Date().toISOString()}"
};

/**
 * Liste de tous les catalogues niveau 3 (valides pour l'analyse)
 */
export const ALL_LEVEL3_CATALOGS = [
${hierarchy.level3.map(cat => `  { id: ${cat.id}, name: "${cat.title}", parentId: ${cat.parentId} }`).join(',\n')}
];
`;

  const tsOutputFile = path.join(__dirname, '../lib/data/vinted-catalogs-complete.ts');
  fs.writeFileSync(tsOutputFile, tsContent);
  console.log(`✅ Fichier TypeScript généré: ${tsOutputFile}`);
  console.log(`   ${hierarchy.level3.length} catégories niveau 3 disponibles pour l'analyse`);
}

// Exécution
if (require.main === module) {
  fetchVintedCatalogs().then(() => {
    console.log('\n🎉 Récupération terminée!');
    console.log('\n💡 Prochaines étapes:');
    console.log('   1. Vérifiez le fichier généré');
    console.log('   2. Intégrez les nouvelles catégories dans le service');
    console.log('   3. Testez avec les vraies catégories niveau 3');
  }).catch(console.error);
}

module.exports = { fetchVintedCatalogs };