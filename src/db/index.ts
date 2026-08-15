// src/db/index.ts
// Neon PostgreSQL connection via @neondatabase/serverless + Drizzle ORM.
//
// IMPORTANT: this uses the WebSocket driver (neon-serverless), not the HTTP one.
// Row Level Security depends on `set_config('app.current_user_id', …, true)`,
// which is TRANSACTION-LOCAL. The HTTP driver puts every statement in its own
// implicit transaction, so the setting was discarded before the next query ran
// and every policy saw a NULL user. Only a real transaction over a single
// connection keeps the session variables alive — see withTenant() in
// src/lib/db-session.ts, which is the only supported way to query as a user.

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

// Reuse the pool across hot reloads in dev; otherwise every edit leaks connections.
const globalForDb = globalThis as unknown as { __sehPool?: Pool };

const pool =
  globalForDb.__sehPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Neon closes idle connections aggressively; keep the pool small and short-lived
    // so serverless invocations do not hold sockets open.
    max: 5,
    idleTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__sehPool = pool;
}

export const db = drizzle(pool, { schema });

export type DB = typeof db;

/**
 * A transaction handle. Every tenant-scoped query must use one of these rather
 * than `db` directly, so the RLS session variables are in scope.
 */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
