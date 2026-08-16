-- Homework + weekly timetable.
-- Run as the OWNER (scripts/apply-sql.mjs). Idempotent.

CREATE TABLE IF NOT EXISTS homework (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  cohort_id    uuid NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  teacher_id   uuid NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  subject      text NOT NULL,
  title        text NOT NULL,
  instructions text NOT NULL,
  due_date     timestamp NOT NULL,
  created_at   timestamp NOT NULL DEFAULT now(),
  updated_at   timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS homework_cohort_due_idx ON homework (cohort_id, due_date DESC);

CREATE TABLE IF NOT EXISTS homework_completions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id  uuid NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  completed_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT homework_completions_homework_id_student_id_unique UNIQUE (homework_id, student_id)
);

CREATE TABLE IF NOT EXISTS timetable_slots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  cohort_id   uuid NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time  text NOT NULL,
  end_time    text NOT NULL,
  subject     text NOT NULL,
  teacher_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  room        text,
  created_at  timestamp NOT NULL DEFAULT now(),
  updated_at  timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS timetable_cohort_day_idx ON timetable_slots (cohort_id, day_of_week, start_time);

-- The app role is created separately and owns nothing; grant it DML explicitly
-- in case default privileges were not in effect when these tables were made.
GRANT SELECT, INSERT, UPDATE, DELETE ON homework, homework_completions, timetable_slots TO seh_app;
