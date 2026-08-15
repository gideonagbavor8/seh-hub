// src/app/api/announcements/recent/route.ts
// Returns the 5 most recent announcements for the overview feed
// Lightweight — minimal fields for the activity widget

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { announcements, users } from "@/db/schema";
import { withTenant } from "@/lib/db-session";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { school_id: schoolId } = session.user;

  try {
    // RLS filters by role inside the transaction.
    const recentAnnouncements = await withTenant(session.user, (tx) =>
      tx
        .select({
          id: announcements.id,
          title: announcements.title,
          body: announcements.body,
          priority: announcements.priority,
          createdAt: announcements.createdAt,
          authorName: users.fullName,
        })
        .from(announcements)
        .innerJoin(users, eq(announcements.authorId, users.id))
        .where(eq(announcements.schoolId, schoolId))
        .orderBy(desc(announcements.createdAt))
        .limit(5)
    );

    return NextResponse.json({ success: true, data: recentAnnouncements });
  } catch (error) {
    console.error("Error fetching recent announcements:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
