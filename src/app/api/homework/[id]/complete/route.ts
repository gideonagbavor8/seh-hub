// src/app/api/homework/[id]/complete/route.ts
// A student ticking their own homework done, or un-ticking it.
// RLS enforces that nobody can mark work done on another student's behalf.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { homeworkCompletions } from "@/db/schema";
import { withTenant, isRlsViolation } from "@/lib/db-session";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "student") {
    return NextResponse.json(
      { success: false, error: "Only students can mark homework done." },
      { status: 403 }
    );
  }

  const { id: homeworkId } = await context.params;

  try {
    await withTenant(session.user, (tx) =>
      tx
        .insert(homeworkCompletions)
        .values({ homeworkId, studentId: session.user.id })
        // Ticking twice is not an error.
        .onConflictDoNothing()
    );

    return NextResponse.json({ success: true, data: { completed: true } });
  } catch (error) {
    if (isRlsViolation(error)) {
      return NextResponse.json(
        { success: false, error: "That homework is not set for your class." },
        { status: 403 }
      );
    }
    console.error("Error marking homework complete:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: homeworkId } = await context.params;

  try {
    await withTenant(session.user, (tx) =>
      tx
        .delete(homeworkCompletions)
        .where(
          and(
            eq(homeworkCompletions.homeworkId, homeworkId),
            eq(homeworkCompletions.studentId, session.user.id)
          )
        )
    );

    return NextResponse.json({ success: true, data: { completed: false } });
  } catch (error) {
    console.error("Error un-marking homework:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
