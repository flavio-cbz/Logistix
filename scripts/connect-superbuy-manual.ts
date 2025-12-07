
// Mock server-only to prevent import errors in standalone script
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'server-only') {
    return {};
  }
  return originalRequire.apply(this, arguments);
};

require('dotenv/config');
const { SuperbuyAutomationService } = require('../lib/services/superbuy/automation');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: npx tsx scripts/connect-superbuy-manual.ts <email> <password> [userId]');
    process.exit(1);
  }

  const email = args[0];
  const password = args[1];
  // Default to admin user ID if not provided
  const userId = args[2] || 'ffcd85cc-f6c3-4a93-8b49-a787ae948aee';

  console.log(`Connecting Superbuy for user ${userId} with email ${email}...`);

  try {
    const service = SuperbuyAutomationService.getInstance();
    const result = await service.connect(userId, email, password);
    console.log('Connect result:', result);
  } catch (error) {
    console.error('Error connecting:', error);
  }
}

main();
