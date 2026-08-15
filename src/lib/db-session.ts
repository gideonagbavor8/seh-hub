// src/lib/db-session.ts
import { sql } from "drizzle-orm";
import type { DB } from "@/db";

/**
 * Sets the Row Level Security (RLS) session variables for the current database transaction/connection.
 * Must be called before executing queries on behalf of a user.
 */
export async function setDbSession<DBLike extends { execute: (query: ReturnType<typeof sql>) => Promise<unknown> }>(
  db: DB | DBLike,
  userId: string,
  schoolId: string
) {
  await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
  await db.execute(sql`SELECT set_config('app.current_school_id', ${schoolId}, true)`);
}
