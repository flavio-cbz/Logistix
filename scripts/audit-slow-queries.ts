// Audit des requêtes SQL lentes et fréquentes

import { enhancedDbQueryLogger } from "../lib/services/database/enhanced-query-logging";

function printSlowAndFrequentQueries() {
  // Récupère les 100 dernières requêtes de plus de 1000ms
  const slowQueries = enhancedDbQueryLogger.getRecentQueryLogs(100, 1000);

  // Comptage des requêtes identiques (hors params)
  const freqMap: Record<string, { count: number; totalDuration: number; example: any }> = {};
  for (const log of slowQueries) {
    const key = log.query.replace(/\s+/g, " ").trim();
    if (!freqMap[key]) {
      freqMap[key] = { count: 0, totalDuration: 0, example: log };
    }
    freqMap[key].count++;
    freqMap[key].totalDuration += log.duration;
  }

  // Affichage des requêtes lentes
  slowQueries.forEach((log, i) => {
  });

  // Affichage des requêtes fréquentes (plus de 3 occurrences)
  Object.entries(freqMap)
    .filter(([_, v]) => v.count > 3)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([query, v]) => {
    });
}

printSlowAndFrequentQueries();