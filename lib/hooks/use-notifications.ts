import { useStore } from "@/lib/services/admin/store";
import { useToast } from "@/components/ui/use-toast";

export type NotificationType = "success" | "error" | "warning" | "info";

import { type ToastActionElement } from "@/components/ui/toast";

export interface NotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: ToastActionElement;
  persistent?: boolean; // Si true, la notification ne disparaît pas automatiquement
}

/**
 * Hook pour gérer les notifications de manière unifiée
 * Combine les toasts (temporaires) et le centre de notifications (persistant)
 */
export function useNotifications() {
  const { addNotification } = useStore();
  const { toast } = useToast();

  const notify = (
    type: NotificationType,
    message: string,
    options: NotificationOptions = {}
  ) => {
    const { title, description, duration = 5000, action, persistent = false } = options;

    // Ajouter au centre de notifications (persistent)
    addNotification(type, title ? `${title}: ${message}` : message);

    // Afficher aussi comme toast si pas persistant
    if (!persistent) {
      toast({
        title: title || getDefaultTitle(type),
        description: description || message,
        duration,
        variant: type === "error" ? "destructive" : "default",
        ...(action && { action }),
      });
    }
  };

  const getDefaultTitle = (type: NotificationType): string => {
    switch (type) {
      case "success":
        return "Succès";
      case "error":
        return "Erreur";
      case "warning":
        return "Avertissement";
      case "info":
        return "Information";
      default:
        return "Notification";
    }
  };

  return {
    // Méthodes principales
    notify,
    
    // Méthodes de convenance
    success: (message: string, options?: NotificationOptions) => 
      notify("success", message, options),
      
    error: (message: string, options?: NotificationOptions) => 
      notify("error", message, options),
      
    warning: (message: string, options?: NotificationOptions) => 
      notify("warning", message, options),
      
    info: (message: string, options?: NotificationOptions) => 
      notify("info", message, options),

    // Notifications spécialisées
    apiError: (error: any, context?: string) => {
      const message = error?.response?.data?.message || error?.message || "Une erreur inattendue s'est produite";
      const fullMessage = context ? `${context}: ${message}` : message;
      
      notify("error", fullMessage, {
        title: "Erreur API",
        persistent: true, // Les erreurs API sont importantes
      });
    },

    formError: (field: string, message: string) => {
      notify("error", `${field}: ${message}`, {
        title: "Erreur de formulaire",
        duration: 3000,
      });
    },

    saveSuccess: (entityName: string) => {
      notify("success", `${entityName} enregistré avec succès`, {
        duration: 2000,
      });
    },

    deleteSuccess: (entityName: string) => {
      notify("success", `${entityName} supprimé avec succès`, {
        duration: 2000,
      });
    },

    loadingStart: (message: string = "Chargement en cours...") => {
      notify("info", message, {
        title: "Patientez",
        persistent: true,
      });
    },

    operationComplete: (message: string) => {
      notify("success", message, {
        title: "Opération terminée",
        duration: 3000,
      });
    },

    validationWarning: (message: string) => {
      notify("warning", message, {
        title: "Attention",
        duration: 4000,
      });
    },
  };
}

/**
 * Hook pour les notifications en temps réel
 * Utile pour les mises à jour automatiques, WebSocket, etc.
 */
export function useRealtimeNotifications() {
  const { notify } = useNotifications();

  const notifyUpdate = (entityType: string, action: "created" | "updated" | "deleted") => {
    const messages = {
      created: `Nouveau ${entityType} créé`,
      updated: `${entityType} mis à jour`,
      deleted: `${entityType} supprimé`,
    };

    notify("info", messages[action], {
      title: "Mise à jour en temps réel",
      duration: 3000,
    });
  };

  const notifyConnection = (status: "connected" | "disconnected" | "reconnecting") => {
    const config = {
      connected: { type: "success" as const, message: "Connexion établie" },
      disconnected: { type: "error" as const, message: "Connexion perdue" },
      reconnecting: { type: "warning" as const, message: "Reconnexion en cours..." },
    };

    const { type, message } = config[status];
    notify(type, message, {
      title: "État de la connexion",
      persistent: status !== "connected",
    });
  };

  return {
    notifyUpdate,
    notifyConnection,
  };
}