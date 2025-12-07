import { drizzle } from "drizzle-orm/better-sqlite3";
import { users, userSessions } from "../lib/database/schema";
import { eq } from "drizzle-orm";
import path from "path";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

async function main() {
    const dbPath = path.join(process.cwd(), "data", "logistix.db");
    console.log(`Using database at: ${dbPath}`);

    const client = new Database(dbPath);
    const db = drizzle(client);

    const username = "demo_user";
    console.log(`Creating session for user: ${username}...`);

    const user = await db.select().from(users).where(eq(users.username, username)).get();

    if (!user) {
        console.error("User not found!");
        process.exit(1);
    }

    const sessionId = uuidv4();
    const now = new Date().toISOString();
    // 7 days expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await db.insert(userSessions).values({
        id: sessionId,
        userId: user.id,
        lastActivityAt: now,
        createdAt: now,
        expiresAt: expiresAt,
    });

    console.log(`Session created successfully.`);
    console.log(`SESSION_ID=${sessionId}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
