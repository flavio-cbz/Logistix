#!/usr/bin/env ts-node
/**
 * ensure-port-free.ts
 * Auto-libère un port (par défaut 3000) avant de lancer le serveur dev.
 * - Détecte les processus en écoute (macOS/Linux) via lsof
 * - Envoie SIGTERM puis (optionnellement) SIGKILL si le process résiste
 * - Sécurisé: ne tue que les process qui écoutent précisément sur ce port TCP
 *
 * Utilisation: ts-node scripts/ensure-port-free.ts [port]
 * Intégré dans npm run dev.
 */

import { execSync } from 'node:child_process';

function log(msg: string) {
  // Préfixe simple pour distinguer ce script
  console.log(`[port-guard] ${msg}`);
}

function getPort(): number {
  const arg = process.argv[2];
  if (arg) {
    const n = Number(arg);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  const envPort = process.env['PORT'] && Number(process.env['PORT']);
  if (envPort && !Number.isNaN(envPort)) return envPort;
  return 3000;
}

function listPids(port: number): number[] {
  try {
    // -nP: ne résout pas DNS, montre ports numériques; -sTCP:LISTEN pour écouter uniquement
    const out = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -n -P 2>/dev/null || true`, { encoding: 'utf8' });
    const lines = out.split('\n').filter(l => l.trim());
    // Première ligne = header si présente
    return lines
      .slice(1)
      .map(line => line.split(/\s+/)[1]) // PID est colonne 2
      .filter(Boolean)
      .map(pidStr => Number(pidStr))
      .filter(pid => !Number.isNaN(pid));
  } catch {
    return [];
  }
}

function terminatePids(pids: number[], port: number) {
  if (!pids.length) {
    log(`Port ${port} déjà libre.`);
    return;
  }
  log(`Processus détectés sur le port ${port}: ${pids.join(', ')}`);
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
      log(`SIGTERM envoyé au PID ${pid}`);
    } catch (e) {
      log(`Erreur en envoyant SIGTERM à ${pid}: ${(e as Error).message}`);
    }
  }
  // Attente courte
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300); // pause ~300ms sans setTimeout

  const remaining = pids.filter(pid => {
    try { process.kill(pid, 0); return true; } catch { return false; }
  });

  if (!remaining.length) {
    log('Tous les processus ont terminé proprement.');
    return;
  }
  for (const pid of remaining) {
    try {
      process.kill(pid, 'SIGKILL');
      log(`SIGKILL forcé sur PID ${pid}`);
    } catch (e) {
      log(`Erreur SIGKILL ${pid}: ${(e as Error).message}`);
    }
  }
}

(function main() {
  const port = getPort();
  try {
    const pids = listPids(port);
    terminatePids(pids, port);
  } catch (err) {
    log(`Erreur inattendue: ${(err as Error).message}`);
    process.exitCode = 0; // on ne bloque pas le dev server
  }
})();
