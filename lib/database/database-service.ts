// import "server-only";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { logger } from "@/lib/utils/logging/logger";
// import { fallbackDb, FallbackDatabaseService } from "./fallback-database-service";
import * as schema from "./schema";

// Importation conditionnelle de better-sqlite3
let Database: any = null;
let useFallback = false;

try {
  Database = require("better-sqlite3");
  // Test si les binaries fonctionnent
  const testDb = new Database(":memory:");
  testDb.close();
} catch (error: unknown) {
  logger.warn("better-sqlite3 not available, using fallback service", {
    error: error instanceof Error ? error.message : String(error)
  });
  useFallback = true;
}

// =====================================================================