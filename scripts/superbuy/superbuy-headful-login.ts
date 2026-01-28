<<<<<<< HEAD
#!/usr/bin/env tsx

import 'dotenv/config';
import { databaseService } from '../../lib/database/database-service';
import { ParcelRepository } from "../../lib/repositories/parcel-repository";
import { IntegrationRepository } from "../../lib/repositories/integration-repository";
import { users } from '../../lib/database/schema';
import { SuperbuyAutomationService } from '../../lib/services/superbuy/automation';
import { logger } from '../../lib/utils/logging/logger';
import { eq } from 'drizzle-orm';
=======

import 'dotenv/config';
import { databaseService } from '../../lib/database/database-service';
import { ParcelleRepository } from "../../lib/repositories/parcel-repository";
import { parcels, integrationCredentials, users } from '../../lib/database/schema';
import { SuperbuyAutomationService } from '../../lib/services/superbuy/automation';
import { logger } from '../../lib/utils/logging/logger';
import { eq, sql } from 'drizzle-orm';
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

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
<<<<<<< HEAD
    logger.error('Usage: npm run superbuy:login <email> <password>');
    logger.error('Or set SUPERBUY_USERNAME and SUPERBUY_PASSWORD env vars');
=======
    console.error('Usage: npm run superbuy:login <email> <password>');
    console.error('Or set SUPERBUY_USERNAME and SUPERBUY_PASSWORD env vars');
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
    process.exit(1);
  }

  try {
    const db = await databaseService.getDb();

    // Resolve UserId
    // 1. Try to find user by email in users table
<<<<<<< HEAD
=======
    let userId: string | null = null;
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

<<<<<<< HEAD
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
=======
    if (user) {
      userId = user.id;
      logger.info(`Resolved userId from users table: ${userId}`);
    } else {
      // 2. Try to find integration credential with this email
      // JSON query might be tricky depending on driver, but let's try strict match if possible
      // or just list all and filter (inefficient but safe for now)
      // Actually, better to check if there is ANY user if we can't find by email.
      // Or just default to the first user found (often the admin).
      const firstUser = await db.query.users.findFirst();
      if (firstUser) {
        userId = firstUser.id;
        logger.warn(`User with email ${email} not found in users table. Defaulting to first user: ${userId} (${firstUser.username})`);
      }
    }

    if (!userId) {
      logger.error('No user found in database. Cannot proceed.');
      process.exit(1);
    }

    logger.info('Initializing SuperbuyAutomationService...');
    const parcelsRepo = new ParcelsRepository(parcels, databaseService);
    const service = new SuperbuyAutomationService(parcelsRepo);
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

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

<<<<<<< HEAD
// Execute if run directly
if (require.main === module) {
  main();
}
=======
main();
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
