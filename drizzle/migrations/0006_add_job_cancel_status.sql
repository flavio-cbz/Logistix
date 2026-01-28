<<<<<<< HEAD
-- Migration: Add 'cancelling' and 'cancelled' to jobs.status CHECK constraint
-- SQLite doesn't support ALTER TABLE to modify CHECK constraints, so we recreate the table

-- Step 1: Create new table with updated constraint
CREATE TABLE IF NOT EXISTS "jobs_new" (
  "id" text PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'cancelling', 'cancelled')),
  "progress" integer DEFAULT 0,
  "result" text,
  "error" text,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" text NOT NULL,
  "updated_at" text NOT NULL
);

-- Step 2: Copy data from old table
INSERT INTO "jobs_new" SELECT * FROM "jobs";

-- Step 3: Drop old table
DROP TABLE "jobs";

-- Step 4: Rename new table to original name
ALTER TABLE "jobs_new" RENAME TO "jobs";

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS "job_user_idx" ON "jobs" ("user_id");
CREATE INDEX IF NOT EXISTS "job_status_idx" ON "jobs" ("status");
CREATE INDEX IF NOT EXISTS "job_created_at_idx" ON "jobs" ("created_at");
=======
-- Migration: Add 'cancelling' and 'cancelled' to jobs.status CHECK constraint
-- SQLite doesn't support ALTER TABLE to modify CHECK constraints, so we recreate the table

-- Step 1: Create new table with updated constraint
CREATE TABLE IF NOT EXISTS "jobs_new" (
  "id" text PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'cancelling', 'cancelled')),
  "progress" integer DEFAULT 0,
  "result" text,
  "error" text,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" text NOT NULL,
  "updated_at" text NOT NULL
);

-- Step 2: Copy data from old table
INSERT INTO "jobs_new" SELECT * FROM "jobs";

-- Step 3: Drop old table
DROP TABLE "jobs";

-- Step 4: Rename new table to original name
ALTER TABLE "jobs_new" RENAME TO "jobs";

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS "job_user_idx" ON "jobs" ("user_id");
CREATE INDEX IF NOT EXISTS "job_status_idx" ON "jobs" ("status");
CREATE INDEX IF NOT EXISTS "job_created_at_idx" ON "jobs" ("created_at");
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
