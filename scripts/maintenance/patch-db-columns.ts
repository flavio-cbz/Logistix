import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

logger("Starting DB Patch...");

const dbPath = path.resolve(process.cwd(), "data/logistix.db");
if (!fs.existsSync(dbPath)) {
    console.error("Database not found at:", dbPath);
    process.exit(1);
}

const db = new Database(dbPath);

function logger(msg: string) {
    console.log(`[Patch] ${msg}`);
}

function patchProductsTable() {
    logger("Checking 'products' table...");
    try {
        const columns = db.prepare("PRAGMA table_info(products)").all() as any[];
        const columnNames = columns.map(c => c.name);

        const missingColumns = [
            { name: "source_order_id", type: "TEXT" },
            { name: "source_item_id", type: "TEXT" },
            { name: "source_url", type: "TEXT" }
        ];

        for (const col of missingColumns) {
            if (!columnNames.includes(col.name)) {
                logger(`Adding missing column: ${col.name}`);
                db.prepare(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type}`).run();
                logger(`✅ Added ${col.name}`);
            } else {
                logger(`Column ${col.name} already exists.`);
            }
        }
    } catch (error) {
        console.error("Error patching products:", error);
    }
}

patchProductsTable();
logger("Patch completed.");
