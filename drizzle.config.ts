import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load .env.local for local development
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Please configure it in .env.local before running migrations."
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Neon uses standard PostgreSQL wire protocol
  verbose: true,
  strict: true,
});
