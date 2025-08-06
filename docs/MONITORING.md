# Documentation du Monitoring de Validation Vinted

Ce document décrit le système de monitoring et d'alerting implémenté pour le processus de validation de l'analyse de marché Vinted.

## Architecture

Le monitoring est centralisé dans le service `ValidationMonitor` (`lib/services/validation/validation-monitor.ts`). Ce service est responsable de :

- Suivre l'état d'une validation en temps réel (En attente, En cours, Terminé, Échoué).
- Collecter les métriques de performance, comme le temps de réponse et le taux de succès des appels API.
- Enregistrer les erreurs critiques qui surviennent pendant la validation.
- Déclencher des alertes pour les anomalies graves.

Le `TestController` s'intègre avec le `ValidationMonitor` pour rapporter les événements clés du cycle de vie de la validation. L'état du monitoring est ensuite stocké dans la session de validation, gérée par le `ValidationSessionManager`.

## Données de Monitoring

L'endpoint de l'API `GET /api/v1/validation/market-analysis/status` retourne un objet `monitoring` qui contient les données suivantes :

- `status`: L'état actuel de la validation (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`).
- `progress`: Le pourcentage de progression de la validation (0-100).
- `metrics`: Un objet contenant les métriques de performance :
  - `startTime`: Timestamp du début de la validation.
  - `endTime`: Timestamp de la fin de la validation.
  - `durationSeconds`: Durée totale de la validation en secondes.
  - `apiCalls`: Nombre total d'appels API effectués.
  - `successfulApiCalls`: Nombre d'appels API réussis.
  - `failedApiCalls`: Nombre d'appels API échoués.
- `errors`: Une liste d'erreurs critiques enregistrées, chacune avec un message, un timestamp et des détails contextuels.
- `alerts`: Une liste des alertes qui ont été déclenchées.

## Alerting

Le système d'alerting est conçu pour notifier les administrateurs des échecs critiques. Dans l'implémentation actuelle, les alertes sont enregistrées dans les logs du serveur avec un niveau `WARN` et ajoutées au tableau `alerts` dans l'état de monitoring.

Pour un environnement de production, ce système peut être étendu pour s'intégrer avec des services externes comme PagerDuty, Slack ou l'envoi d'e-mails.
