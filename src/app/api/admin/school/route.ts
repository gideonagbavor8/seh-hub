import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { schools } from "@/db/schema";
import { withTenant } from "@/lib/db-session";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  const schoolId = session.user.school_id;

  try {
    const [schoolData] = await withTenant(session.user, (tx) =>
      tx
        .select({
          name: schools.name,
          slug: schools.slug,
          logoUrl: schools.logoUrl,
          primaryColor: schools.primaryColor,
          secondaryColor: schools.secondaryColor,
          contactEmail: schools.contactEmail,
          contactPhone: schools.contactPhone,
          address: schools.address,
        })
        .from(schools)
        .where(eq(schools.id, schoolId))
        .limit(1)
    );

    if (!schoolData) {
      return NextResponse.json({ success: false, error: "School not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: schoolData });
  } catch (error) {
    console.error("Error fetching school settings:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  const schoolId = session.user.school_id;

  const body = (await request.json()) as {
    name?: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
  };

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.logo_url === "string") updates.logoUrl = body.logo_url.trim();
  if (typeof body.primary_color === "string") updates.primaryColor = body.primary_color.trim();
  if (typeof body.secondary_color === "string") updates.secondaryColor = body.secondary_color.trim();
  if (typeof body.contact_email === "string") updates.contactEmail = body.contact_email.trim();
  if (typeof body.contact_phone === "string") updates.contactPhone = body.contact_phone.trim();
  if (typeof body.address === "string") updates.address = body.address.trim();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: "No valid fields provided" }, { status: 400 });
  }

  try {
    await withTenant(session.user, (tx) =>
      tx.update(schools).set(updates).where(eq(schools.id, schoolId))
    );
    return NextResponse.json({ success: true, data: { updated: true } });
  } catch (error) {
    console.error("Error updating school settings:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
