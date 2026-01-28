#!/usr/bin/env tsx

import 'dotenv/config';
import { databaseService } from '../../lib/database/database-service';
import { ParcelRepository } from "../../lib/repositories/parcel-repository";
import { IntegrationRepository } from "../../lib/repositories/integration-repository";
import { users } from '../../lib/database/schema';
import { SuperbuyAutomationService } from '../../lib/services/superbuy/automation';
import { logger } from '../../lib/utils/logging/logger';
import { eq } from 'drizzle-orm';

async function main() {
  const args = process.argv.slice(2);
  let email = process.env.SUPERBUY_USERNAME || process.env.SUPERBUY_USER;
  let password = process.env.SUPERBUY_PASSWORD || process.env.SUPERBUY_PASS;

  // Simple arg parsing: first arg email, second password
  // Or handle --email --password
  if (args.length >= 2 && !args[0].startsWith('--')) {
    email = args[0];
    password = args[1];
  }

  if (!email || !password) {
    logger.error('Usage: npm run superbuy:login <email> <password>');
    logger.error('Or set SUPERBUY_USERNAME and SUPERBUY_PASSWORD env vars');
    process.exit(1);
  }

  try {
    const db = await databaseService.getDb();

    // Resolve UserId
    // 1. Try to find user by email in users table
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) {
      logger.error(`User with email ${email} not found in users table.`);
      logger.error('Cannot proceed without a valid user.');
      // SECURITY: Do NOT fallback to first user or admin. Fail if user is not found.
      process.exit(1);
    }

    const userId = user.id;
    logger.info(`Resolved userId from users table: ${userId}`);

    logger.info('Initializing SuperbuyAutomationService...');
    // Instantiate repositories correctly
    const parcelsRepo = new ParcelRepository(databaseService);
    const integrationRepo = new IntegrationRepository(databaseService);
    const service = new SuperbuyAutomationService(parcelsRepo, integrationRepo);

    logger.info('Starting sync process...');
    const result = await service.sync(userId, { email, password });

    if (result.success) {
      logger.info('✅ Sync completed successfully!');
      logger.info(`Parcels: ${result.data?.parcelsCount ?? 0}, Orders: ${result.data?.ordersCount ?? 0}`);
      process.exit(0);
    } else {
      logger.error(`❌ Sync failed: ${result.message}`);
      process.exit(1);
    }

  } catch (error) {
    logger.error('Fatal error during execution', { error });
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}
