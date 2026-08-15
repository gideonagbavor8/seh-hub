import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { and, eq } from "drizzle-orm";
import type { DB } from "./index";
import {
  schools,
  users,
  cohorts,
  teacherCohorts,
  studentCohorts,
  parentStudentLinks,
} from "./schema";

dotenv.config({ path: ".env.local" });

// The seed writes schools and users directly. Under RLS the restricted app
// role cannot do that (there is no session user yet), so seeding runs as the
// owner. Point DATABASE_URL at the owner string only for this process.
const SEED_URL = process.env.DATABASE_URL_OWNER || process.env.DATABASE_URL;

if (!SEED_URL) {
  throw new Error("DATABASE_URL_OWNER environment variable is not set.");
}

process.env.DATABASE_URL = SEED_URL;

let db: DB | null = null;

async function getDb() {
  if (!db) {
    const module = await import("./index");
    db = module.db;
  }

  return db;
}

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

const SCHOOL_SLUG = "his";
const SCHOOL_NAME = "Ho International School";

/**
 * Resolves the seed school by its slug, creating it only if absent.
 * Every downstream record is scoped to the id returned here, so this is the
 * single source of truth for which tenant the seed writes into.
 */
async function findOrCreateSchool() {
  const db = await getDb();

  const projection = { id: schools.id, name: schools.name, slug: schools.slug };

  const [existingSchool] = await db
    .select(projection)
    .from(schools)
    .where(eq(schools.slug, SCHOOL_SLUG))
    .limit(1);

  if (existingSchool) {
    return existingSchool;
  }

  const [inserted] = await db
    .insert(schools)
    .values({ name: SCHOOL_NAME, slug: SCHOOL_SLUG })
    .onConflictDoNothing({ target: schools.slug })
    .returning(projection);

  if (inserted) {
    return inserted;
  }

  // A concurrent run won the insert — re-read rather than failing.
  const [raced] = await db
    .select(projection)
    .from(schools)
    .where(eq(schools.slug, SCHOOL_SLUG))
    .limit(1);

  return raced;
}

type UserRole = "admin" | "teacher" | "parent" | "student";

async function findOrCreateUser(email: string, fullName: string, password: string, role: UserRole, schoolId: string) {
  const db = await getDb();

  const normalizedEmail = email.toLowerCase();
  const projection = { id: users.id, email: users.email, role: users.role, schoolId: users.schoolId };

  // Scope the lookup to the school. Matching on email alone would silently adopt a
  // row belonging to another tenant — that is how the admin ended up on a stale school.
  const [existingUser] = await db
    .select(projection)
    .from(users)
    .where(and(eq(users.email, normalizedEmail), eq(users.schoolId, schoolId)))
    .limit(1);

  if (existingUser) {
    return existingUser;
  }

  // users.email is globally unique, so a row under a different school would fail the
  // insert with an opaque constraint error. Report the conflict in terms of the tenant.
  const [elsewhere] = await db
    .select({ id: users.id, schoolId: users.schoolId })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (elsewhere) {
    throw new Error(
      `${normalizedEmail} already exists under school ${elsewhere.schoolId}, not ${schoolId}. ` +
        "users.email is globally unique — move or remove that row before re-seeding.",
    );
  }

  const passwordHash = await hashPassword(password);
  const [inserted] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      fullName,
      passwordHash,
      role,
      schoolId,
    })
    .returning(projection);

  return inserted;
}

async function findOrCreateCohort(name: string, academicYear: string, schoolId: string) {
  const db = await getDb();

  const projection = { id: cohorts.id, name: cohorts.name, schoolId: cohorts.schoolId };

  const [existingCohort] = await db
    .select(projection)
    .from(cohorts)
    .where(and(eq(cohorts.name, name), eq(cohorts.schoolId, schoolId)))
    .limit(1);

  if (existingCohort) {
    return existingCohort;
  }

  const [inserted] = await db
    .insert(cohorts)
    .values({
      name,
      academicYear,
      schoolId,
    })
    .returning(projection);

  return inserted;
}

async function findOrCreateTeacherCohort(teacherId: string, cohortId: string) {
  const db = await getDb();

  const [existingLink] = await db
    .select({ id: teacherCohorts.id })
    .from(teacherCohorts)
    .where(and(eq(teacherCohorts.teacherId, teacherId), eq(teacherCohorts.cohortId, cohortId)))
    .limit(1);

  if (existingLink) {
    return existingLink;
  }

  const [inserted] = await db
    .insert(teacherCohorts)
    .values({ teacherId, cohortId })
    .returning({ id: teacherCohorts.id });

  return inserted;
}

async function findOrCreateStudentCohort(studentId: string, cohortId: string) {
  const db = await getDb();

  const [existingLink] = await db
    .select({ id: studentCohorts.id })
    .from(studentCohorts)
    .where(and(eq(studentCohorts.studentId, studentId), eq(studentCohorts.cohortId, cohortId)))
    .limit(1);

  if (existingLink) {
    return existingLink;
  }

  const [inserted] = await db
    .insert(studentCohorts)
    .values({ studentId, cohortId })
    .returning({ id: studentCohorts.id });

  return inserted;
}

async function findOrCreateParentStudentLink(parentId: string, studentId: string) {
  const db = await getDb();

  const [existingLink] = await db
    .select({ id: parentStudentLinks.id })
    .from(parentStudentLinks)
    .where(and(eq(parentStudentLinks.parentId, parentId), eq(parentStudentLinks.studentId, studentId)))
    .limit(1);

  if (existingLink) {
    return existingLink;
  }

  const [inserted] = await db
    .insert(parentStudentLinks)
    .values({ parentId, studentId })
    .returning({ id: parentStudentLinks.id });

  return inserted;
}

async function main() {
  const school = await findOrCreateSchool();

  const admin = await findOrCreateUser(
    "admin@his.edu.gh",
    "Admin User",
    "Admin1234",
    "admin",
    school.id,
  );

  const teacher = await findOrCreateUser(
    "teacher@his.edu.gh",
    "Teacher User",
    "Teacher1234",
    "teacher",
    school.id,
  );

  const parent = await findOrCreateUser(
    "parent@his.edu.gh",
    "Parent User",
    "Parent1234",
    "parent",
    school.id,
  );

  const student = await findOrCreateUser(
    "student@his.edu.gh",
    "Student User",
    "Student1234",
    "student",
    school.id,
  );

  const cohort = await findOrCreateCohort("JHS 2A", "2025/2026", school.id);

  await findOrCreateTeacherCohort(teacher.id, cohort.id);
  await findOrCreateStudentCohort(student.id, cohort.id);
  await findOrCreateParentStudentLink(parent.id, student.id);

  // Every seeded user must share the school we resolved above. A drifted row here means
  // login silently fails for that role, since authorize() matches on email AND school_id.
  const strays = [admin, teacher, parent, student].filter((user) => user.schoolId !== school.id);
  if (strays.length) {
    throw new Error(
      `Tenant mismatch — ${strays.map((u) => u.email).join(", ")} not on school ${school.slug} (${school.id}).`,
    );
  }

  console.log("Seed complete:");
  console.log(`- school: ${school.slug} (${school.id})`);
  console.log(`- admin: ${admin.email} (${admin.id})`);
  console.log(`- teacher: ${teacher.email} (${teacher.id})`);
  console.log(`- parent: ${parent.email} (${parent.id})`);
  console.log(`- student: ${student.email} (${student.id})`);
  console.log(`- cohort: ${cohort.name} (${cohort.id})`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
