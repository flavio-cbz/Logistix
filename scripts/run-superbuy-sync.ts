require('dotenv/config');

// Avoid server-only import issues in standalone script
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id:any) {
  if (id === 'server-only') return {};
  return originalRequire.apply(this, arguments);
};

const { SuperbuyAutomationService } = require('../lib/services/superbuy/automation');

async function main() {
  const args = process.argv.slice(2);
  const userId = args[0] || 'ffcd85cc-f6c3-4a93-8b49-a787ae948aee';
  const email = args[1];
  const password = args[2];

  console.log(`Running Superbuy sync for user ${userId}...`);

  const service = SuperbuyAutomationService.getInstance();
  try {
    let credentials = undefined;
    if (email && password) credentials = { email, password };
    const res = await service.sync(userId, credentials);
    console.log('Sync result:', res);
  } catch (e) {
    console.error('Sync failed:', e);
    process.exitCode = 2;
  }
}

main();
