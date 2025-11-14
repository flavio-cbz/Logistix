#!/usr/bin/env ts-node
/**
 * ensure-port-free.ts
 * Auto-libère un port (par défaut 3000) avant de lancer le serveur dev.
 * - Détecte les processus en écoute (macOS/Linux/Windows)
 * - Envoie SIGTERM puis (optionnellement) SIGKILL si le process résiste
 * - Sécurisé: ne tue que les process qui écoutent précisément sur ce port TCP
 *
 * Utilisation: ts-node scripts/ensure-port-free.ts [port]
 * Intégré dans npm run dev.
 */

import { execSync } from 'node:child_process';
import { platform } from 'node:os';

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
  const isWindows = platform() === 'win32';
  
  try {
    if (isWindows) {
      // Windows: utilise netstat pour trouver les processus qui écoutent sur le port
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const lines = out.split('\n').filter(l => l.includes('LISTENING'));
      const pids = new Set<number>();
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pidStr = parts[parts.length - 1];
        const pid = Number(pidStr);
        if (!Number.isNaN(pid) && pid > 0) {
          pids.add(pid);
        }
      }
      
      return Array.from(pids);
    } else {
      // Unix/Linux/macOS: utilise lsof
      const out = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -n -P 2>/dev/null || true`, { encoding: 'utf8' });
      const lines = out.split('\n').filter(l => l.trim());
      // Première ligne = header si présente
      return lines
        .slice(1)
        .map(line => line.split(/\s+/)[1]) // PID est colonne 2
        .filter(Boolean)
        .map(pidStr => Number(pidStr))
        .filter(pid => !Number.isNaN(pid));
    }
  } catch {
    return [];
  }
}

function terminatePids(pids: number[], port: number) {
  const isWindows = platform() === 'win32';
  
  if (!pids.length) {
    log(`Port ${port} déjà libre.`);
    return;
  }
  log(`Processus détectés sur le port ${port}: ${pids.join(', ')}`);
  
  for (const pid of pids) {
    try {
      if (isWindows) {
        // Windows: utilise taskkill pour terminer le processus
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        log(`Processus ${pid} terminé (taskkill)`);
      } else {
        // Unix/Linux/macOS: utilise SIGTERM
        process.kill(pid, 'SIGTERM');
        log(`SIGTERM envoyé au PID ${pid}`);
      }
    } catch (e) {
      log(`Erreur en terminant le processus ${pid}: ${(e as Error).message}`);
    }
  }
  
  // Attente courte pour les systèmes Unix uniquement
  if (!isWindows) {
    try {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300); // pause ~300ms
    } catch {
      // Fallback si SharedArrayBuffer n'est pas disponible
      const start = Date.now();
      while (Date.now() - start < 300) { /* busy wait */ }
    }

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
