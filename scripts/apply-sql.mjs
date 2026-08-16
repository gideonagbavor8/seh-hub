// scripts/apply-sql.mjs
// Applies a SQL file from src/db/migrations as the OWNER, in one transaction.
//
//   node scripts/apply-sql.mjs 004_homework_timetable.sql

import { Pool } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/apply-sql.mjs <file.sql>");
  process.exit(1);
}

const OWNER_URL = process.env.DATABASE_URL_OWNER || process.env.DATABASE_URL;
if (!OWNER_URL) {
  console.error("Set DATABASE_URL_OWNER to an owner connection string.");
  process.exit(1);
}

const full = path.join(process.cwd(), "src", "db", "migrations", file);
const sql = fs.readFileSync(full, "utf-8");

const pool = new Pool({ connectionString: OWNER_URL });
const client = await pool.connect();

try {
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log(`Applied ${file}.`);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(`Failed — nothing applied:\n${err.message}`);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
