import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

const sql = neon(dbUrl);

async function main() {
  console.log("Fixing test user password hash...");
  // The correct bcrypt hash for "password123"
  const correctHash = "$2b$10$FtL/zn.nM832kh9V1igsRuyVlhoJ29QEF7WVmCSRX9zB6jw3HVsA.";
  
  await sql`
    UPDATE users 
    SET password_hash = ${correctHash} 
    WHERE email = 'admin@his.edu.gh';
  `;
  
  console.log("Password hash updated! You can now log in with 'password123'.");
}

main();
