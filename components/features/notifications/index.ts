/**
 * Système de notifications unifié pour LogistiX
 * - Centre de notifications avec filtres et statistiques
 * - Toasts automatiques pour les actions
 * - Hook simplifié pour les développeurs
 */

export { EnhancedNotificationCenter, EnhancedNotificationToast } from "./enhanced-notification-center";
export { useNotifications, useRealtimeNotifications } from "../../../lib/hooks/use-notifications";

// Pour une migration facile, on exporte aussi les anciens composants
export { NotificationCenter } from "./notification-center";