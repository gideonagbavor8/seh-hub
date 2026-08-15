// src/lib/db-session.ts
// Tenant scoping for Row Level Security.
//
// The database enforces isolation through RLS policies that read two session
// variables. Those variables are transaction-local, so they and the queries
// that depend on them must share one transaction on one connection. Everything
// below exists to make that the only convenient way to query.

import { sql } from "drizzle-orm";
import { db, type Tx } from "@/db";

export interface TenantSession {
  id: string;
  school_id: string;
}

/**
 * Runs `fn` inside a transaction with the caller's identity applied, so RLS
 * policies can see who is asking.
 *
 * Use the `tx` handle passed to the callback for every query. Using the
 * module-level `db` inside the callback silently escapes the transaction,
 * which means no session variables and — under RLS — zero rows.
 *
 *   const rows = await withTenant(session.user, (tx) =>
 *     tx.select().from(announcements)
 *   );
 */
export async function withTenant<T>(
  session: TenantSession,
  fn: (tx: Tx) => Promise<T>
): Promise<T> {
  if (!session?.id || !session?.school_id) {
    throw new Error("withTenant requires a session with id and school_id.");
  }

  return db.transaction(async (tx) => {
    // `true` = transaction-local, so the setting cannot leak to the next
    // request that borrows this pooled connection.
    await tx.execute(
      sql`SELECT set_config('app.current_user_id', ${session.id}, true)`
    );
    await tx.execute(
      sql`SELECT set_config('app.current_school_id', ${session.school_id}, true)`
    );

    return fn(tx);
  });
}

/**
 * Runs `fn` with system privileges, for work that belongs to no user — the
 * cron job processor being the only case today.
 *
 * This is a deliberate, narrow escape hatch: the matching policies grant access
 * ONLY to automation_jobs, never to tenant data. Call it exclusively from
 * endpoints already authenticated by CRON_SECRET.
 */
export async function withSystemContext<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.system_context', 'on', true)`);
    return fn(tx);
  });
}
