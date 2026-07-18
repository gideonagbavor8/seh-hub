import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load the environment variables
dotenv.config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("No DATABASE_URL found in .env.local");
  process.exit(1);
}

const sql = neon(dbUrl);
const rlsPath = path.join(process.cwd(), 'src', 'db', 'migrations', 'rls.sql');
const rlsSql = fs.readFileSync(rlsPath, 'utf-8');

async function main() {
  console.log("Reading RLS migration from src/db/migrations/rls.sql...");
  
  // Split statements by semicolon to execute them one by one
  // (Neon HTTP driver prefers single statements)
  const statements = rlsSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} statements to execute.`);

  for (let i = 0; i < statements.length; i++) {
    try {
      await sql(statements[i]);
      console.log(`[${i + 1}/${statements.length}] Executed successfully.`);
    } catch (err) {
      console.error(`\nError executing statement ${i + 1}:`);
      console.error(statements[i]);
      console.error(err.message);
      process.exit(1);
    }
  }

  console.log("\nAll RLS policies applied successfully!");
}

main();
