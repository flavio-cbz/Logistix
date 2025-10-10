import cron, { ScheduledTask } from "node-cron";
import { logger } from "@/lib/utils/logging/logger";

// Tableau pour stocker les taches planifiees
const scheduledTasks: { name: string; task: ScheduledTask }[] = [];

/**
 * Planifie une tache recurrente
 * @param name Nom de la tache
 * @param schedule Expression cron pour la planification
 * @param callback Fonction a executer
 * @param options Options supplementaires
 */
export function scheduleTask(
  name: string,
  schedule: string,
  callback: () => void,
  options?: { runOnInit?: boolean; timezone?: string },
) {
  try {
    const task = cron.schedule(schedule, callback, options);
    scheduledTasks.push({ name, task });

    logger.info(`Tache planifiee : ${name}`, { schedule });

    return task;
  } catch (error) {
    logger.error(`Erreur lors de la planification de la tache ${name}`, {
      error,
    });
    throw error;
  }
}

/**
 * Demarre le planificateur de taches
 */
export function startScheduler() {
  logger.info("Demarrage du planificateur de taches");

  // Exemple de tache : nettoyage quotidien a minuit
  scheduleTask("daily-cleanup", "0 0 * * *", () => {
    logger.info("Execution du nettoyage quotidien");
    // Ajouter ici la logique de nettoyage
  });

  // Exemple de tache : synchronisation des catalogues Vinted toutes les heures
  scheduleTask("vinted-sync", "0 * * * *", () => {
    logger.info("Synchronisation des catalogues Vinted");
    // Ajouter ici la logique de synchronisation
  });

  // Exemple de tache : analyse de marche toutes les 6 heures
  scheduleTask("market-analysis", "0 */6 * * *", () => {
    logger.info("Execution de l'analyse de marche");
    // Ajouter ici la logique d'analyse de marche
  });

  logger.info(`Planificateur demarre avec ${scheduledTasks.length} taches`);
}

/**
 * Arrete toutes les taches planifiees
 */
export function stopScheduler() {
  logger.info("Arret du planificateur de taches");

  scheduledTasks.forEach(({ name, task }) => {
    task.stop();
    logger.info(`Tache arretee : ${name}`);
  });

  scheduledTasks.length = 0;
}

/**
 * Liste toutes les taches planifiees
 */
export function listScheduledTasks() {
  return scheduledTasks.map(({ name, task }) => ({
    name,
    running:
      typeof (task as any).getStatus === "function"
        ? (task as any).getStatus()
        : ((task as any).running ?? false),
  }));
}
