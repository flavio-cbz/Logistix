const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: any) {
    if (id === 'server-only') return {};
    return originalRequire.apply(this, arguments);
};

const { databaseService } = require('../lib/database/database-service');
const { products } = require('../lib/database/schema');
const { eq } = require('drizzle-orm');

async function checkPrice() {
    const db = await databaseService.getDb();
    const product = await db.query.products.findFirst({
        where: eq(products.externalId, 'DI25791283517')
    });

    if (product) {
        console.log('Product found:', {
            name: product.name,
            priceEUR: product.price,
            priceUSD: product.priceUSD,
            currency: product.currency,
            externalId: product.externalId
        });
    } else {
        console.log('Product DI25791283517 not found.');
    }
    process.exit(0);
}

checkPrice();
