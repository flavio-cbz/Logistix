// Client Drizzle ORM pour SQLite (Better-SQLite3)

import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/services/database/drizzle-schema";
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'logistix.db');
const sqliteDb = new Database(dbPath);

sqliteDb.pragma('journal_mode = WAL');

export const db = drizzle(sqliteDb, { schema, logger: true });