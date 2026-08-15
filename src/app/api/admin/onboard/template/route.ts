import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const csvTemplate = `teacher_name,teacher_email,cohort_name,student_name,student_email,parent_name,parent_email,parent_phone
John Doe,teacher@his.edu.gh,JHS 2A,Jane Doe,student@his.edu.gh,Mary Doe,parent@his.edu.gh,+233201234567
Anna Smith,teacher2@his.edu.gh,JHS 2A,Samuel Smith,student2@his.edu.gh,Peter Smith,parent2@his.edu.gh,+233201234568
`;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  return new NextResponse(csvTemplate, {
    status: 200,
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": "attachment; filename=seh-hub-onboarding-template.csv",
    },
  });
}
