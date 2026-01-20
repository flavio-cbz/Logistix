// Centralized database exports
export * from "./database-service";
export * from "./schema";
export * from "./queue-manager";

// Export Drizzle db instance for direct queries
import { databaseService } from "./database-service";
export const getDb = async () => await databaseService.getDb();

// DEPRECATED: Utiliser databaseService directement au lieu du proxy db
// Le proxy db pose des problèmes avec les méthodes asynchrones
// @deprecated Use databaseService instead
