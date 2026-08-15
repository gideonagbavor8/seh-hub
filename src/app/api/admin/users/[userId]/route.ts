import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { users, teacherCohorts, studentCohorts } from "@/db/schema";
import { withTenant } from "@/lib/db-session";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  const { userId } = await context.params;
  const schoolId = session.user.school_id;

  const body = (await request.json()) as {
    full_name?: string;
    phone?: string;
    is_active?: boolean;
  };

  const updates: Record<string, unknown> = {};
  if (typeof body.full_name === "string" && body.full_name.trim()) {
    updates.fullName = body.full_name.trim();
  }
  if (typeof body.phone === "string") {
    updates.phone = body.phone.trim();
  }
  if (typeof body.is_active === "boolean") {
    updates.isActive = body.is_active;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: "No valid fields provided" }, { status: 400 });
  }

  try {
    const affected = await withTenant(session.user, (tx) =>
      tx
        .update(users)
        .set(updates)
        .where(and(eq(users.id, userId), eq(users.schoolId, schoolId)))
    );

    const affectedCount =
      (affected as { rowCount?: number; rowsAffected?: number }).rowCount ??
      (affected as { rowCount?: number; rowsAffected?: number }).rowsAffected ??
      0;

    if (affectedCount === 0) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { updated: true } });
  } catch (error) {
    console.error("Error updating admin user:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  const { userId } = await context.params;
  const schoolId = session.user.school_id;

  try {
    // withTenant already opens the transaction, so these run atomically.
    await withTenant(session.user, async (tx) => {
      await tx.update(users).set({ isActive: false }).where(and(eq(users.id, userId), eq(users.schoolId, schoolId)));
      await tx.delete(teacherCohorts).where(eq(teacherCohorts.teacherId, userId));
      await tx.delete(studentCohorts).where(eq(studentCohorts.studentId, userId));
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("Error deleting admin user:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
