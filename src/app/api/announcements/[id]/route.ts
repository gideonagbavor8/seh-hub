// src/app/api/announcements/[id]/route.ts
// GET: single announcement with full details
// DELETE: admin any, teacher own only

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { announcements, users, cohorts, notifications } from "@/db/schema";
import { withTenant } from "@/lib/db-session";
import { getSchoolPublicKey } from "@/lib/crypto";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, school_id: schoolId } = session.user;
  const { id } = await params;

  try {
    return await withTenant(session.user, async (tx) => {
    const results = await tx
      .select({
        id: announcements.id,
        title: announcements.title,
        body: announcements.body,
        priority: announcements.priority,
        signature: announcements.signature,
        mediaUrl: announcements.mediaUrl,
        cohortId: announcements.cohortId,
        createdAt: announcements.createdAt,
        authorId: announcements.authorId,
        authorName: users.fullName,
        authorRole: users.role,
        authorAvatar: users.avatarUrl,
      })
      .from(announcements)
      .innerJoin(users, eq(announcements.authorId, users.id))
      .where(and(eq(announcements.id, id), eq(announcements.schoolId, schoolId)))
      .limit(1);

    if (results.length === 0) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const ann = results[0];

    // Get cohort name
    let cohortName = "School-Wide";
    if (ann.cohortId) {
      const cohortRows = await tx
        .select({ name: cohorts.name })
        .from(cohorts)
        .where(eq(cohorts.id, ann.cohortId))
        .limit(1);
      if (cohortRows.length > 0) cohortName = cohortRows[0].name;
    }

    let publicKey = "";
    try {
      publicKey = getSchoolPublicKey();
    } catch {
      // Key not configured
    }

    return NextResponse.json({
      success: true,
      data: {
        id: ann.id,
        title: ann.title,
        body: ann.body,
        priority: ann.priority,
        signature: ann.signature,
        mediaUrl: ann.mediaUrl,
        createdAt: ann.createdAt?.toISOString() ?? "",
        authorId: ann.authorId,
        authorName: ann.authorName,
        authorRole: ann.authorRole,
        authorAvatar: ann.authorAvatar,
        cohortName,
      },
      publicKey,
    });
    });
  } catch (error) {
    console.error("Error fetching announcement:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, school_id: schoolId, role } = session.user;
  const { id } = await params;

  if (role !== "admin" && role !== "teacher") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    return await withTenant(session.user, async (tx) => {
    // Fetch announcement to check ownership
    const ann = await tx
      .select({ id: announcements.id, authorId: announcements.authorId })
      .from(announcements)
      .where(and(eq(announcements.id, id), eq(announcements.schoolId, schoolId)))
      .limit(1);

    if (ann.length === 0) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    // Teacher can only delete own announcements
    if (role === "teacher" && ann[0].authorId !== userId) {
      return NextResponse.json(
        { success: false, error: "You can only delete your own announcements" },
        { status: 403 }
      );
    }

    // Delete the announcement (cascade handles related data via FK constraints)
    await tx.delete(announcements).where(eq(announcements.id, id));

    return NextResponse.json({ success: true, message: "Announcement deleted" });
    });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
