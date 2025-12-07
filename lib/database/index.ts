// Centralized database exports
export * from "./database-service";
export * from "./schema";

// Export Drizzle db instance for direct queries
import { databaseService } from "./database-service";
export const getDb = async () => await databaseService.getDb();

// DEPRECATED: Utiliser databaseService directement au lieu du proxy db
// Le proxy db pose des problèmes avec les méthodes asynchrones
// @deprecated Use databaseService instead
// Singleton db promise for synchronous access
// let dbPromise: any = null;
// export const db = new Proxy({}, {
//   get: (_target, prop) => {
//     if (!dbPromise) {
//       dbPromise = databaseService.getDb();
//     }
//     return dbPromise.then((db: any) => db[prop]);
//   },
// }) as any;
