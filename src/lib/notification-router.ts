// src/lib/notification-router.ts
// Dual-channel notification router — in-app + SMS job queuing
// Never sends SMS directly; always queues to automation_jobs for the cron processor.

import { notifications, automationJobs, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { DB } from "@/db";
import { setDbSession } from "./db-session";

export interface AnnouncementPayload {
  id: string;
  title: string;
  body: string;
  priority: "standard" | "emergency";
  schoolId: string;
  authorId: string;
}

/**
 * Routes an announcement to recipients via the appropriate channels.
 *
 * Standard: in-app notification only.
 * Emergency: in-app notification + SMS job queued per recipient with a phone number.
 */
export async function routeAnnouncement(
  announcement: AnnouncementPayload,
  recipientIds: string[],
  db: DB,
  sessionUserId: string,
  sessionSchoolId: string
): Promise<void> {
  if (recipientIds.length === 0) return;

  // Set RLS session
  await setDbSession(db, sessionUserId, sessionSchoolId);

  // 1. Insert in-app notifications for all recipients
  const notificationRows = recipientIds.map((userId) => ({
    userId,
    schoolId: announcement.schoolId,
    title: announcement.title,
    body: announcement.body,
    type: announcement.priority === "emergency" ? ("emergency" as const) : ("announcement" as const),
    meta: { announcement_id: announcement.id },
  }));

  // Insert in batches of 50 to avoid query size limits
  for (let i = 0; i < notificationRows.length; i += 50) {
    const batch = notificationRows.slice(i, i + 50);
    await db.insert(notifications).values(batch);
  }

  // 2. For emergency: queue SMS jobs for recipients with phone numbers
  if (announcement.priority === "emergency") {
    // Fetch phone numbers for recipients
    const recipientUsers = await db
      .select({ id: users.id, phone: users.phone })
      .from(users)
      .where(inArray(users.id, recipientIds));

    const smsJobs = recipientUsers
      .filter((u) => u.phone && u.phone.trim().length > 0)
      .map((u) => ({
        schoolId: announcement.schoolId,
        jobType: "emergency_sms",
        payload: {
          phone: u.phone,
          message: `🚨 EMERGENCY: ${announcement.title}\n\n${announcement.body}`,
          announcement_id: announcement.id,
        },
        status: "pending" as const,
      }));

    if (smsJobs.length > 0) {
      for (let i = 0; i < smsJobs.length; i += 50) {
        const batch = smsJobs.slice(i, i + 50);
        await db.insert(automationJobs).values(batch);
      }
    }

    // 3. Audit log job
    await db.insert(automationJobs).values({
      schoolId: announcement.schoolId,
      jobType: "emergency_log",
      payload: {
        announcement_id: announcement.id,
        title: announcement.title,
        recipients_count: recipientIds.length,
        sms_queued: smsJobs.length,
        triggered_by: announcement.authorId,
      },
      status: "pending" as const,
    });
  }
}
