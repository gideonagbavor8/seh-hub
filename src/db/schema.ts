import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  pgEnum,
  unique,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "teacher", "parent", "student"]);
export const priorityEnum = pgEnum("priority", ["standard", "emergency"]);
export const notificationTypeEnum = pgEnum("type", ["announcement", "message", "emergency", "homework"]);
export const jobStatusEnum = pgEnum("job_status", ["pending", "running", "success", "failed"]);

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
};

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#1F6F43"),
  secondaryColor: text("secondary_color").default("#000000"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  ...timestamps,
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: roleEnum("role").notNull(),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").default(true),
  ...timestamps,
});

export const cohorts = pgTable("cohorts", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  academicYear: text("academic_year").notNull(),
  isActive: boolean("is_active").default(true),
  ...timestamps,
});

export const teacherCohorts = pgTable("teacher_cohorts", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  cohortId: uuid("cohort_id").notNull().references(() => cohorts.id, { onDelete: "cascade" }),
  ...timestamps,
}, (t) => ({
  unq: unique().on(t.teacherId, t.cohortId),
}));

export const studentCohorts = pgTable("student_cohorts", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  cohortId: uuid("cohort_id").notNull().references(() => cohorts.id, { onDelete: "cascade" }),
  ...timestamps,
}, (t) => ({
  unq: unique().on(t.studentId, t.cohortId),
}));

export const parentStudentLinks = pgTable("parent_student_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ...timestamps,
}, (t) => ({
  unq: unique().on(t.parentId, t.studentId),
}));

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  cohortId: uuid("cohort_id").references(() => cohorts.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  mediaUrl: text("media_url"),
  priority: priorityEnum("priority").default("standard"),
  signature: text("signature"),
  isVerified: boolean("is_verified").default(false),
  ...timestamps,
});

export const directMessages = pgTable("direct_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: uuid("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  announcementId: uuid("announcement_id").references(() => announcements.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  isRead: boolean("is_read").default(false),
  ...timestamps,
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: notificationTypeEnum("type").notNull(),
  isRead: boolean("is_read").default(false),
  meta: jsonb("meta"),
  ...timestamps,
});

export const homework = pgTable("homework", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  cohortId: uuid("cohort_id").notNull().references(() => cohorts.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  dueDate: timestamp("due_date").notNull(),
  ...timestamps,
});

/** One row per student who has ticked a piece of homework done. */
export const homeworkCompletions = pgTable("homework_completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeworkId: uuid("homework_id").notNull().references(() => homework.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.homeworkId, t.studentId),
}));

/**
 * A recurring weekly timetable period. Times are stored as "HH:MM" text rather
 * than timestamps: a timetable is a wall-clock pattern, not a moment, so it
 * must not shift with dates or time zones.
 */
export const timetableSlots = pgTable("timetable_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  cohortId: uuid("cohort_id").notNull().references(() => cohorts.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // ISO: 1 = Monday … 5 = Friday
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  subject: text("subject").notNull(),
  teacherId: uuid("teacher_id").references(() => users.id, { onDelete: "set null" }),
  room: text("room"),
  ...timestamps,
});

export const automationJobs = pgTable("automation_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  jobType: text("job_type").notNull(),
  payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
  status: jobStatusEnum("status").default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("max_attempts").default(3).notNull(),
  lastAttemptedAt: timestamp("last_attempted_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  ...timestamps,
});
