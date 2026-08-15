import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { setDbSession } from "@/lib/db-session";
import { findExistingEmails, parseOnboardingFile, validateOnboardingRows } from "@/lib/admin-onboarding";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  const userId = session.user.id;
  const schoolId = session.user.school_id;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "File is required" }, { status: 400 });
  }

  try {
    const parsedRows = await parseOnboardingFile(file, file.name);
    if (parsedRows.length === 0) {
      return NextResponse.json({ success: false, error: "The file contains no rows to preview." }, { status: 400 });
    }

    await setDbSession(db, userId, schoolId);

    const validation = validateOnboardingRows(parsedRows);
    const lowercasedEmails = Array.from(
      new Set<string>([
        ...parsedRows.map((row) => row.teacher_email.toLowerCase()),
        ...parsedRows.map((row) => row.student_email.toLowerCase()),
        ...parsedRows.map((row) => row.parent_email.toLowerCase()),
      ])
    );
    const existingEmails = await findExistingEmails(db, schoolId, lowercasedEmails);

    if (existingEmails.size > 0) {
      validation.existingEmails = Array.from(existingEmails);
      validation.success = false;
      validation.errors.push(...Array.from(existingEmails).map((email) => `Email already exists in school: ${email}`));
    }

    const previewRows = parsedRows.slice(0, 10).map((row) => ({
      rowNumber: row.rowNumber,
      teacher_name: row.teacher_name,
      teacher_email: row.teacher_email,
      cohort_name: row.cohort_name,
      student_name: row.student_name,
      student_email: row.student_email,
      parent_name: row.parent_name,
      parent_email: row.parent_email,
      parent_phone: row.parent_phone,
    }));

    return NextResponse.json({
      success: true,
      data: {
        previewRows,
        counts: {
          teachers: validation.uniqueTeachers,
          students: validation.uniqueStudents,
          parents: validation.uniqueParents,
          cohorts: validation.uniqueCohorts,
        },
        warnings: validation.errors,
        skipped: [],
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Invalid file" }, { status: 400 });
  }
}
