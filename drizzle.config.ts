import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load .env.local for local development
dotenv.config({ path: ".env.local" });

// Migrations need the OWNER role. DATABASE_URL is the restricted app role
// (NOBYPASSRLS, no DDL), so it cannot create tables or policies.
const MIGRATION_URL = process.env.DATABASE_URL_OWNER || process.env.DATABASE_URL;

if (!MIGRATION_URL) {
  throw new Error(
    "DATABASE_URL_OWNER is not set. Please configure it in .env.local before running migrations."
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: MIGRATION_URL,
  },
  // Neon uses standard PostgreSQL wire protocol
  verbose: true,
  strict: true,
});
