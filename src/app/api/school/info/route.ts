import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { schools } from "@/db/schema";
import { setDbSession } from "@/lib/db-session";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, school_id: schoolId } = session.user;

  try {
    // Set RLS variables before querying
    await setDbSession(db, userId, schoolId);

    const schoolData = await db
      .select({
        name: schools.name,
        slug: schools.slug,
        logo_url: schools.logoUrl,
        primary_color: schools.primaryColor,
        secondary_color: schools.secondaryColor,
      })
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);

    if (schoolData.length === 0) {
      return NextResponse.json({ success: false, error: "School not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: schoolData[0] });
  } catch (error) {
    console.error("Error fetching school info:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
