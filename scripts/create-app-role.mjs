// scripts/create-app-role.mjs
// Provisions the restricted role the application connects as.
//
// Why this exists: the app was connecting as neondb_owner, which has
// BYPASSRLS *and* owns every table. Postgres skips row security for either
// reason, so RLS policies would have been silently inert. The app must use a
// role that is neither.
//
// Run once:  node scripts/create-app-role.mjs
// Prints a connection string to put in DATABASE_URL. The owner URL stays in
// DATABASE_URL_OWNER for migrations and seeding.

import { Pool } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const OWNER_URL = process.env.DATABASE_URL_OWNER || process.env.DATABASE_URL;
if (!OWNER_URL) {
  console.error("Set DATABASE_URL_OWNER (or DATABASE_URL) to an owner connection string.");
  process.exit(1);
}

const APP_ROLE = "seh_app";
// URL-safe so it needs no escaping inside a connection string.
const password = randomBytes(24).toString("base64url");

const pool = new Pool({ connectionString: OWNER_URL });
const client = await pool.connect();

try {
  const { rows: existing } = await client.query(
    "SELECT 1 FROM pg_roles WHERE rolname = $1",
    [APP_ROLE]
  );

  // NOTE: neondb_owner holds CREATEROLE but is not superuser, so it may not
  // ALTER role attributes or passwords. It CAN create and drop. Rotation is
  // therefore drop-and-recreate rather than ALTER ... PASSWORD.
  if (existing.length) {
    console.log(`Role ${APP_ROLE} exists — recreating it to set a known password.`);
    // The role owns no objects, it only holds privileges the owner granted.
    // DROP OWNED BY would need role membership; revoking directly does not.
    const dbNameRow = await client.query("SELECT current_database() AS name");
    const existingDb = dbNameRow.rows[0].name;
    for (const stmt of [
      `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${APP_ROLE}`,
      `REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM ${APP_ROLE}`,
      `REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM ${APP_ROLE}`,
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM ${APP_ROLE}`,
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM ${APP_ROLE}`,
      `REVOKE ALL ON SCHEMA public FROM ${APP_ROLE}`,
      `REVOKE ALL ON DATABASE "${existingDb}" FROM ${APP_ROLE}`,
    ]) {
      await client.query(stmt).catch(() => {});
    }
    await client.query(`DROP ROLE ${APP_ROLE}`);
  }

  // CREATE ROLE defaults to NOSUPERUSER / NOBYPASSRLS / NOCREATEDB / NOCREATEROLE,
  // which is exactly what RLS requires. The assertion below proves it rather
  // than assuming it — this is the property the whole security model rests on.
  await client.query(`CREATE ROLE ${APP_ROLE} WITH LOGIN PASSWORD '${password}'`);
  console.log(`Created role ${APP_ROLE}.`);

  const db = await client.query("SELECT current_database() AS name");
  const dbName = db.rows[0].name;

  await client.query(`GRANT CONNECT ON DATABASE "${dbName}" TO ${APP_ROLE}`);
  await client.query(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`);

  // DML only. No DDL, no ownership — so it cannot drop a policy to escape RLS.
  await client.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_ROLE}`
  );
  await client.query(
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_ROLE}`
  );
  await client.query(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_ROLE}`
  );
  await client.query(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${APP_ROLE}`
  );

  // The RLS helper functions must be callable by the app role.
  await client.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${APP_ROLE}`);

  const { rows: check } = await client.query(
    "SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = $1",
    [APP_ROLE]
  );

  if (check[0].rolbypassrls || check[0].rolsuper) {
    throw new Error(`${APP_ROLE} still has BYPASSRLS/SUPERUSER — RLS would not apply.`);
  }

  const appUrl = new URL(OWNER_URL);
  appUrl.username = APP_ROLE;
  appUrl.password = password;

  console.log("\nRole is provisioned and verified NOBYPASSRLS.\n");
  console.log("Put this in .env.local as DATABASE_URL:\n");
  console.log(appUrl.toString());
  console.log("\nKeep the existing owner string as DATABASE_URL_OWNER.");
} finally {
  client.release();
  await pool.end();
}
