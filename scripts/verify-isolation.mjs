// scripts/verify-isolation.mjs
// Proves the RLS policies actually isolate tenants.
//
// Creates a throwaway second school as the OWNER, then connects as the
// restricted app role and checks that a user of school A can neither read nor
// write school B's rows — and that legitimate access still works.
//
// Run:  node scripts/verify-isolation.mjs

import { Pool } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const OWNER_URL = process.env.DATABASE_URL_OWNER;
const APP_URL = process.env.DATABASE_URL;

if (!OWNER_URL || !APP_URL) {
  console.error("Both DATABASE_URL_OWNER and DATABASE_URL must be set.");
  process.exit(1);
}

const ownerPool = new Pool({ connectionString: OWNER_URL });
const appPool = new Pool({ connectionString: APP_URL });

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? "  — " + detail : ""}`);
  }
}

/** Runs fn inside a transaction with the given tenant identity applied. */
async function asUser(userId, schoolId, fn) {
  const c = await appPool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    await c.query("SELECT set_config('app.current_school_id', $1, true)", [schoolId]);
    return await fn(c);
  } finally {
    await c.query("ROLLBACK").catch(() => {});
    c.release();
  }
}

const owner = await ownerPool.connect();
let schoolB;

try {
  // ── Fixture: a second school the app user must never see ────────────────
  const { rows: aRows } = await owner.query("SELECT id FROM schools WHERE slug = 'his'");
  const schoolA = aRows[0].id;
  const { rows: adminRows } = await owner.query(
    "SELECT id FROM users WHERE email = 'admin@his.edu.gh'"
  );
  const adminA = adminRows[0].id;

  await owner.query("DELETE FROM schools WHERE slug = 'rls-probe'");
  const { rows: bRows } = await owner.query(
    `INSERT INTO schools (name, slug) VALUES ('RLS Probe Academy', 'rls-probe') RETURNING id`
  );
  schoolB = bRows[0].id;

  const { rows: bUser } = await owner.query(
    `INSERT INTO users (school_id, email, password_hash, full_name, role)
     VALUES ($1, 'probe@rls.test', 'x', 'Probe Admin', 'admin') RETURNING id`,
    [schoolB]
  );
  await owner.query(
    `INSERT INTO announcements (school_id, author_id, title, body)
     VALUES ($1, $2, 'Secret of School B', 'Must never be visible to school A')`,
    [schoolB, bUser.rows === undefined ? bUser[0].id : bUser[0].id]
  );

  console.log(`\nSchool A (his): ${schoolA}`);
  console.log(`School B (probe): ${schoolB}\n`);

  // ── Negative: school A must not see school B ─────────────────────────────
  console.log("Cross-tenant reads (expect zero rows):");
  await asUser(adminA, schoolA, async (c) => {
    const schools = await c.query("SELECT id FROM schools");
    check(
      "schools: only own school visible",
      schools.rows.length === 1 && schools.rows[0].id === schoolA,
      `saw ${schools.rows.length} rows`
    );

    const bDirect = await c.query("SELECT id FROM schools WHERE id = $1", [schoolB]);
    check("schools: explicit lookup of school B returns nothing", bDirect.rows.length === 0);

    const bUsers = await c.query("SELECT id FROM users WHERE school_id = $1", [schoolB]);
    check("users: school B users invisible", bUsers.rows.length === 0);

    const bAnn = await c.query("SELECT id FROM announcements WHERE school_id = $1", [schoolB]);
    check("announcements: school B announcements invisible", bAnn.rows.length === 0);

    const allUsers = await c.query("SELECT school_id FROM users");
    check(
      "users: unscoped SELECT returns only own tenant",
      allUsers.rows.every((r) => r.school_id === schoolA),
      "a bare SELECT with no WHERE leaked another school"
    );
  });

  // ── Negative: writes into another tenant must be rejected ────────────────
  console.log("\nCross-tenant writes (expect rejection):");
  await asUser(adminA, schoolA, async (c) => {
    try {
      await c.query(
        `INSERT INTO announcements (school_id, author_id, title, body)
         VALUES ($1, $2, 'injected', 'should fail')`,
        [schoolB, adminA]
      );
      check("announcements: cannot insert into school B", false, "insert succeeded");
    } catch {
      check("announcements: cannot insert into school B", true);
    }
  });

  await asUser(adminA, schoolA, async (c) => {
    const r = await c.query("UPDATE schools SET name = 'hijacked' WHERE id = $1", [schoolB]);
    check("schools: cannot rename school B", r.rowCount === 0, `rowCount=${r.rowCount}`);
  });

  // ── Negative: no session variables at all ───────────────────────────────
  console.log("\nUnauthenticated connection (expect zero rows):");
  const bare = await appPool.connect();
  try {
    const u = await bare.query("SELECT id FROM users");
    check("users: no rows without session context", u.rows.length === 0, `saw ${u.rows.length}`);
    const s = await bare.query("SELECT id FROM schools");
    check("schools: no rows without session context", s.rows.length === 0, `saw ${s.rows.length}`);
  } finally {
    bare.release();
  }

  // ── Positive: legitimate access still works ─────────────────────────────
  console.log("\nLegitimate access (expect rows):");
  await asUser(adminA, schoolA, async (c) => {
    const own = await c.query("SELECT id FROM users WHERE school_id = $1", [schoolA]);
    check("users: admin sees own school's users", own.rows.length > 0, `saw ${own.rows.length}`);

    const school = await c.query("SELECT name FROM schools WHERE id = $1", [schoolA]);
    check("schools: admin sees own school", school.rows.length === 1);

    const ins = await c.query(
      `INSERT INTO announcements (school_id, author_id, title, body)
       VALUES ($1, $2, 'probe', 'ok') RETURNING id`,
      [schoolA, adminA]
    );
    check("announcements: admin can post to own school", ins.rows.length === 1);
  });

  // ── The property the whole model rests on ───────────────────────────────
  console.log("\nRole hardening:");
  const attrs = await appPool.query(
    "SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user"
  );
  check("app role has NOBYPASSRLS", attrs.rows[0].rolbypassrls === false);
  check("app role is not superuser", attrs.rows[0].rolsuper === false);

  const forced = await ownerPool.query(`
    SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND NOT (c.relrowsecurity AND c.relforcerowsecurity)
  `);
  check("all tables ENABLE + FORCE row security", forced.rows[0].n === 0, `${forced.rows[0].n} unprotected`);
} finally {
  if (schoolB) {
    await owner.query("DELETE FROM schools WHERE id = $1", [schoolB]).catch(() => {});
  }
  await owner.query("DELETE FROM announcements WHERE title = 'probe'").catch(() => {});
  owner.release();
  await ownerPool.end();
  await appPool.end();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
