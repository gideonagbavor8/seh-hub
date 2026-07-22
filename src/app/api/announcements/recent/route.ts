import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { announcements, users } from "@/db/schema";
import { setDbSession } from "@/lib/db-session";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, school_id: schoolId } = session.user;

  try {
    // Set RLS variables before querying database
    await setDbSession(db, userId, schoolId);

    // Fetch the 5 most recent announcements
    const recentAnnouncements = await db
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
      .limit(5);

    return NextResponse.json({ success: true, data: recentAnnouncements });
  } catch (error) {
    console.error("Error fetching recent announcements:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
