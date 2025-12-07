
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import * as schema from '../../lib/database/schema';
import { logger } from '../../lib/utils/logging/logger';

const DB_PATH = path.resolve(process.cwd(), 'data/logistix.db');
const MIGRATIONS_FOLDER = path.resolve(process.cwd(), 'drizzle/migrations');

async function runMigrations() {
  logger.info('🚀 Starting database migrations...');
  logger.info(`📂 Database path: ${DB_PATH}`);
  logger.info(`📂 Migrations folder: ${MIGRATIONS_FOLDER}`);

  try {
    const sqlite = new Database(DB_PATH);
    const db = drizzle(sqlite, { schema });

    // This will automatically run needed migrations on the database
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

    logger.info('✅ Migrations completed successfully!');
    sqlite.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
