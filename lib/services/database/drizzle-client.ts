// DEPRECATED: Legacy Drizzle Client
// This file is kept for backward compatibility during migration
// New code should use: import { databaseService } from '@/lib/database/database-service'

import { databaseService } from "@/lib/database/database-service";
import * as newSchema from "@/lib/database/schema";

// Legacy compatibility exports
export const db = databaseService.getDb();
export type DbType = typeof db;

// Re-export schema for compatibility (maps old schema to new unified schema)
export const schema = newSchema;

// Deprecation warning
console.warn(
  "[DEPRECATED] lib/services/database/drizzle-client.ts is deprecated. " +
    "Please use \"import { databaseService } from '@/lib/database/database-service'\" instead.",
);
