import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  pgEnum,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "teacher", "parent", "student"]);
export const priorityEnum = pgEnum("priority", ["standard", "emergency"]);
export const notificationTypeEnum = pgEnum("type", ["announcement", "message", "emergency"]);

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
};

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#00E324"),
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
