// scripts/apply-rls.mjs
// Applies src/db/migrations/rls.sql using the OWNER connection.
//
// Must run as the owner: only the owner can ALTER TABLE … FORCE ROW LEVEL
// SECURITY and create policies. The app role deliberately cannot.
//
// Run:  node scripts/apply-rls.mjs

import { Pool } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const OWNER_URL = process.env.DATABASE_URL_OWNER || process.env.DATABASE_URL;
if (!OWNER_URL) {
  console.error("Set DATABASE_URL_OWNER (or DATABASE_URL) to an owner connection string.");
  process.exit(1);
}

const rlsPath = path.join(process.cwd(), "src", "db", "migrations", "rls.sql");
const rlsSql = fs.readFileSync(rlsPath, "utf-8");

// NOTE: the previous version of this script split the file on ";" and called
// sql(statement) on the HTTP driver. That is rejected outright by
// @neondatabase/serverless v1 ("can now be called only as a tagged-template
// function"), which is why RLS was never actually applied. It also could not
// have worked regardless: the DO $$ … $$ blocks contain semicolons.
// The pooled client runs the whole file as one script instead.
const pool = new Pool({ connectionString: OWNER_URL });
const client = await pool.connect();

try {
  console.log("Applying RLS policies…");
  await client.query("BEGIN");
  await client.query(rlsSql);
  await client.query("COMMIT");

  const { rows: tables } = await client.query(`
    SELECT c.relname, c.relrowsecurity AS enabled, c.relforcerowsecurity AS forced
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `);

  const { rows: policies } = await client.query(`
    SELECT tablename, count(*)::int AS n
    FROM pg_policies WHERE schemaname = 'public'
    GROUP BY tablename ORDER BY tablename
  `);

  const counts = Object.fromEntries(policies.map((p) => [p.tablename, p.n]));

  console.log("\ntable                  enabled  forced  policies");
  console.log("──────────────────────────────────────────────────");
  let bad = 0;
  for (const t of tables) {
    const ok = t.enabled && t.forced && (counts[t.relname] ?? 0) > 0;
    if (!ok) bad++;
    console.log(
      `${t.relname.padEnd(22)} ${String(t.enabled).padEnd(8)} ${String(t.forced).padEnd(7)} ${counts[t.relname] ?? 0}${ok ? "" : "   <-- CHECK"}`
    );
  }

  console.log(bad === 0 ? "\nAll tables protected." : `\n${bad} table(s) need attention.`);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("\nFailed — nothing was applied:\n", err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
