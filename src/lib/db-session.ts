// src/lib/db-session.ts
import { sql } from "drizzle-orm";
import type { DB } from "@/db";

/**
 * Sets the Row Level Security (RLS) session variables for the current database transaction/connection.
 * Must be called before executing queries on behalf of a user.
 */
export async function setDbSession(db: DB, userId: string, schoolId: string) {
  // Using neon's standard configuration parameter setting mechanism.
  // Note: For neon serverless HTTP driver, true transaction management is required 
  // to ensure these settings persist for subsequent queries in the same request.
  await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
  await db.execute(sql`SELECT set_config('app.current_school_id', ${schoolId}, true)`);
}
