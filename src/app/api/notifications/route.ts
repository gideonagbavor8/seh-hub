// src/app/api/notifications/route.ts
// GET: recent notifications for the signed-in user, plus an unread count
// PATCH: mark notifications read (all, or a specific set of ids)

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { notifications } from "@/db/schema";
import { withTenant } from "@/lib/db-session";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, school_id: schoolId } = session.user;

  try {
    const { rows, unread } = await withTenant(session.user, async (tx) => {
      const rows = await tx
        .select({
          id: notifications.id,
          title: notifications.title,
          body: notifications.body,
          type: notifications.type,
          isRead: notifications.isRead,
          meta: notifications.meta,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(and(eq(notifications.schoolId, schoolId), eq(notifications.userId, userId)))
        .orderBy(desc(notifications.createdAt))
        .limit(15);

      const [countRow] = await tx
        .select({ total: sql<number>`COUNT(*)` })
        .from(notifications)
        .where(
          and(
            eq(notifications.schoolId, schoolId),
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );

      return { rows, unread: Number(countRow?.total ?? 0) };
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications: rows.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          type: n.type,
          is_read: n.isRead,
          meta: n.meta,
          created_at: n.createdAt.toISOString(),
        })),
        unreadCount: unread,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, school_id: schoolId } = session.user;
  const body = (await request.json().catch(() => ({}))) as { ids?: string[] };

  try {
    await withTenant(session.user, (tx) => {
      const scope = and(
        eq(notifications.schoolId, schoolId),
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      );

      return tx
        .update(notifications)
        .set({ isRead: true })
        .where(
          Array.isArray(body.ids) && body.ids.length > 0
            ? and(scope, inArray(notifications.id, body.ids))
            : scope
        );
    });

    return NextResponse.json({ success: true, data: { updated: true } });
  } catch (error) {
    console.error("Error marking notifications read:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
