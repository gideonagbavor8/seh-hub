// scripts/seed-demo-data.mjs
// Fills a weekly timetable and a few homework items for every cohort that has
// a teacher assigned. Runs as the OWNER, and is idempotent: re-running clears
// and rewrites the demo rows rather than duplicating them.
//
//   node scripts/seed-demo-data.mjs

import { Pool } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const OWNER_URL = process.env.DATABASE_URL_OWNER || process.env.DATABASE_URL;
if (!OWNER_URL) {
  console.error("Set DATABASE_URL_OWNER.");
  process.exit(1);
}

// A realistic Ghanaian JHS day: assembly, four morning periods, break,
// afternoon periods, closing.
const PERIODS = [
  ["07:30", "07:50", "Assembly"],
  ["07:50", "08:30", null],
  ["08:30", "09:10", null],
  ["09:10", "09:50", null],
  ["09:50", "10:10", "Break"],
  ["10:10", "10:50", null],
  ["10:50", "11:30", null],
  ["11:30", "12:10", null],
  ["12:10", "13:00", "Lunch"],
  ["13:00", "13:40", null],
  ["13:40", "14:20", null],
];

const SUBJECTS_BY_DAY = {
  1: ["Mathematics", "English Language", "Integrated Science", "Social Studies", "ICT", "Ghanaian Language", "Creative Arts", "Physical Education"],
  2: ["English Language", "Mathematics", "Social Studies", "Integrated Science", "Career Technology", "ICT", "Mathematics", "Creative Arts"],
  3: ["Integrated Science", "Mathematics", "English Language", "Ghanaian Language", "Social Studies", "Physical Education", "ICT", "Library"],
  4: ["Mathematics", "Integrated Science", "English Language", "Career Technology", "Ghanaian Language", "Social Studies", "Creative Arts", "ICT"],
  5: ["English Language", "Social Studies", "Mathematics", "Integrated Science", "ICT", "Creative Arts", "Physical Education", "Assembly (Closing)"],
};

const HOMEWORK = [
  {
    subject: "Integrated Science",
    title: "Water filtration write-up",
    instructions:
      "Using the filtration set-up we built in class, write a one-page report covering: the materials used, the order of the layers, and what happened to the muddy water. Draw a labelled diagram of your filter.",
    dueInDays: 3,
  },
  {
    subject: "Mathematics",
    title: "Exercise 4b — fractions and ratios",
    instructions:
      "Complete questions 1 to 12 on page 63. Show all your working. Question 10 is a challenge question — attempt it even if you do not finish.",
    dueInDays: 1,
  },
  {
    subject: "English Language",
    title: "Comprehension: 'The Rains Came Early'",
    instructions:
      "Read the passage on pages 40 to 42 and answer questions A to E in full sentences. Underline any five new words and write their meanings.",
    dueInDays: -2, // deliberately overdue, so the Overdue tab has content
  },
];

const pool = new Pool({ connectionString: OWNER_URL });
const c = await pool.connect();

try {
  // DISTINCT ON: one row per cohort. A plain DISTINCT would include teacher_id
  // in the key, so a cohort with two teachers would be processed twice.
  const { rows: cohorts } = await c.query(`
    SELECT DISTINCT ON (co.id) co.id, co.name, co.school_id, tc.teacher_id
    FROM cohorts co
    JOIN teacher_cohorts tc ON tc.cohort_id = co.id
    ORDER BY co.id, tc.created_at
  `);

  if (cohorts.length === 0) {
    console.log("No cohorts with an assigned teacher — nothing to seed.");
    process.exit(0);
  }

  let slotCount = 0;
  let hwCount = 0;

  for (const cohort of cohorts) {
    // Timetable — replace wholesale so re-running does not duplicate.
    await c.query("DELETE FROM timetable_slots WHERE cohort_id = $1", [cohort.id]);

    for (const day of [1, 2, 3, 4, 5]) {
      const subjects = [...SUBJECTS_BY_DAY[day]];
      for (const [start, end, fixed] of PERIODS) {
        const subject = fixed ?? subjects.shift();
        if (!subject) continue;
        const isBreak = /^(assembly|break|lunch)/i.test(subject);

        await c.query(
          `INSERT INTO timetable_slots
             (school_id, cohort_id, day_of_week, start_time, end_time, subject, teacher_id, room)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            cohort.school_id,
            cohort.id,
            day,
            start,
            end,
            subject,
            isBreak ? null : cohort.teacher_id,
            isBreak ? null : `Room ${cohort.name.replace(/\s+/g, "")}`,
          ]
        );
        slotCount++;
      }
    }

    // Homework
    for (const hw of HOMEWORK) {
      const { rowCount } = await c.query(
        "SELECT 1 FROM homework WHERE cohort_id = $1 AND title = $2",
        [cohort.id, hw.title]
      );
      if (rowCount > 0) continue;

      const due = new Date();
      due.setDate(due.getDate() + hw.dueInDays);
      due.setHours(23, 59, 0, 0);

      await c.query(
        `INSERT INTO homework
           (school_id, cohort_id, teacher_id, subject, title, instructions, due_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [cohort.school_id, cohort.id, cohort.teacher_id, hw.subject, hw.title, hw.instructions, due]
      );
      hwCount++;
    }
  }

  console.log(
    `Seeded ${slotCount} timetable periods and ${hwCount} homework items across ${cohorts.length} cohort(s):`
  );
  cohorts.forEach((c2) => console.log(`  - ${c2.name}`));
} finally {
  c.release();
  await pool.end();
}
