#!/usr/bin/env ts-node
/**
 * Script de maintenance du projet
 * Effectue plusieurs tâches de maintenance automatique
 */

import { exec } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

function run(cmd: string): Promise<{ ok: boolean; stdout: string; stderr: string }>{
  return new Promise(resolve => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 64, windowsHide: true }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout, stderr });
    });
  });
}

async function updateDependencies() {
  console.log('Mise à jour des dépendances...');
  
  // Mettre à jour les dépendances avec npm
  const { ok, stdout, stderr } = await run('npm outdated');
  if (!ok) {
    console.error('Erreur lors de la vérification des dépendances obsolètes:', stderr);
    return;
  }
  
  console.log('Dépendances obsolètes:\n', stdout);
  
  // Générer un rapport
  const reportPath = join(process.cwd(), 'DEPENDENCY_UPDATE_REPORT.md');
  const report = `# Rapport de mise à jour des dépendances

## Dépendances obsolètes

\`\`\`
${stdout}
\`\`\`

## Recommandations

1. Mettre à jour les dépendances une par une pour éviter les conflits
2. Exécuter les tests après chaque mise à jour
3. Vérifier la compatibilité avec la documentation des packages
`;
  
  writeFileSync(reportPath, report);
  console.log(`Rapport généré : ${reportPath}`);
}

async function cleanProject() {
  console.log('Nettoyage du projet...');
  
  // Exécuter les scripts de nettoyage existants
  const cleanScripts = [
    'npm run cleanup:files',
    'npm run cleanup:dormant'
  ];
  
  for (const script of cleanScripts) {
    console.log(`Exécution de : ${script}`);
    const { ok, stderr } = await run(script);
    if (!ok) {
      console.error(`Erreur lors de l'exécution de ${script}:`, stderr);
    }
  }
  
  console.log('Nettoyage terminé.');
}

async function checkSecurity() {
  console.log('Vérification de la sécurité...');
  
  // Exécuter npm audit
  const { ok, stdout, stderr } = await run('npm audit --json');
  if (!ok && stderr) {
    console.error('Erreur lors de la vérification de sécurité:', stderr);
    return;
  }
  
  // Générer un rapport de sécurité
  const reportPath = join(process.cwd(), 'SECURITY_AUDIT_REPORT.md');
  let report = `# Rapport d'audit de sécurité

`;
  
  try {
    const auditData = JSON.parse(stdout);
    report += `## Résumé

- Vulnérabilités faibles : ${auditData.metadata.vulnerabilities.low}
- Vulnérabilités modérées : ${auditData.metadata.vulnerabilities.moderate}
- Vulnérabilités élevées : ${auditData.metadata.vulnerabilities.high}
- Vulnérabilités critiques : ${auditData.metadata.vulnerabilities.critical}

`;
    
    if (auditData.advisories && Object.keys(auditData.advisories).length > 0) {
      report += '## Vulnérabilités détectées\n\n';
      
      interface Advisory {
        id?: string;
        title?: string;
        severity?: string;
        [key: string]: unknown;
      }

      for (const [id, advisory] of Object.entries(auditData.advisories)) {
        const adv = advisory as Advisory;
        report += `### ${adv.title}
- ID: ${id}
- Module: ${adv.module_name}
- Version: ${adv.vulnerable_versions}
- Patchée dans: ${adv.patched_versions}
- Severité: ${adv.severity}
- URL: ${adv.url}

`;
      }
    } else {
      report += 'Aucune vulnérabilité détectée.\n';
    }
  } catch (e) {
    report += `Erreur lors de l'analyse des résultats de l'audit : ${e}\n`;
  }
  
  writeFileSync(reportPath, report);
  console.log(`Rapport de sécurité généré : ${reportPath}`);
}

async function main() {
  console.log('=== Maintenance automatique du projet ===\n');
  
  // Exécuter les différentes tâches de maintenance
  await updateDependencies();
  console.log();
  
  await cleanProject();
  console.log();
  
  await checkSecurity();
  console.log();
  
  console.log('=== Maintenance terminée ===');
}

main();