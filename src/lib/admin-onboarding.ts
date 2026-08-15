import { parse } from "papaparse";
import * as XLSX from "xlsx";
import { DB, Tx } from "@/db";
import { users, cohorts } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

export const REQUIRED_COLUMNS = [
  "teacher_name",
  "teacher_email",
  "cohort_name",
  "student_name",
  "student_email",
  "parent_name",
  "parent_email",
  "parent_phone",
] as const;

export type OnboardingColumn = (typeof REQUIRED_COLUMNS)[number];

export interface ParsedOnboardingRow {
  rowNumber: number;
  teacher_name: string;
  teacher_email: string;
  cohort_name: string;
  student_name: string;
  student_email: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
}

export interface OnboardValidationResult {
  success: boolean;
  errors: string[];
  duplicateEmails: string[];
  existingEmails: string[];
  uniqueTeachers: number;
  uniqueStudents: number;
  uniqueParents: number;
  uniqueCohorts: number;
}

function normalizeHeader(key: string) {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function buildRow(row: Record<string, unknown>, rowNumber: number) {
  const normalized: Record<string, string> = {};

  Object.entries(row).forEach(([key, value]) => {
    normalized[normalizeHeader(key)] = normalizeValue(value);
  });

  return {
    rowNumber,
    teacher_name: normalized.teacher_name ?? "",
    teacher_email: normalized.teacher_email ?? "",
    cohort_name: normalized.cohort_name ?? "",
    student_name: normalized.student_name ?? "",
    student_email: normalized.student_email ?? "",
    parent_name: normalized.parent_name ?? "",
    parent_email: normalized.parent_email ?? "",
    parent_phone: normalized.parent_phone ?? "",
  };
}

export async function parseOnboardingFile(file: Blob, filename: string): Promise<ParsedOnboardingRow[]> {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (!extension) {
    throw new Error("File extension is required");
  }

  if (extension === "csv") {
    const text = await file.text();
    const parsed = parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
    });

    if (parsed.errors.length > 0) {
      throw new Error(parsed.errors.map((error) => error.message).join("; ") || "CSV parsing failed");
    }

    return parsed.data.map((row, index) => buildRow(row, index + 2));
  }

  if (extension === "xlsx" || extension === "xls") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("Excel file is empty");
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: "",
    });

    if (rows.length === 0) {
      return [];
    }

    const headerRow = rows[0];
    const headers = headerRow.map((value) => normalizeHeader(String(value ?? "")));

    return rows.slice(1).map((rawRow, rowIndex) => {
      const cells = rawRow as Array<unknown>;
      const rowMap: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        rowMap[header] = cells[index] ?? "";
      });
      return buildRow(rowMap, rowIndex + 2);
    });
  }

  throw new Error("Unsupported file format");
}

export function validateOnboardingRows(rows: ParsedOnboardingRow[]): OnboardValidationResult {
  const errors: string[] = [];
  const emailSeen = new Set<string>();
  const duplicateEmails = new Set<string>();

  rows.forEach((row) => {
    const requiredFields: Array<[keyof ParsedOnboardingRow, string]> = [
      ["teacher_name", "Teacher name"],
      ["teacher_email", "Teacher email"],
      ["cohort_name", "Cohort name"],
      ["student_name", "Student name"],
      ["student_email", "Student email"],
      ["parent_name", "Parent name"],
      ["parent_email", "Parent email"],
      ["parent_phone", "Parent phone"],
    ];

    requiredFields.forEach(([key, label]) => {
      if (!String(row[key] ?? "").trim()) {
        errors.push(`Row ${row.rowNumber}: ${label} is required.`);
      }
    });

    if (!String(row.parent_email ?? "").trim()) {
      errors.push(`Row ${row.rowNumber}: Parent email is required for student ${row.student_name}.`);
    }

    if (!String(row.student_email ?? "").trim()) {
      errors.push(`Row ${row.rowNumber}: Student email is required for parent ${row.parent_name}.`);
    }

    [row.teacher_email, row.student_email, row.parent_email].forEach((email) => {
      const normalizedEmail = email.toLowerCase();
      if (!normalizedEmail) {
        return;
      }
      if (emailSeen.has(normalizedEmail)) {
        duplicateEmails.add(normalizedEmail);
      }
      emailSeen.add(normalizedEmail);
    });
  });

  if (duplicateEmails.size > 0) {
    duplicateEmails.forEach((email) => {
      errors.push(`Duplicate email in file: ${email}`);
    });
  }

  const uniqueTeachers = new Set(rows.map((row) => row.teacher_email.toLowerCase())).size;
  const uniqueStudents = new Set(rows.map((row) => row.student_email.toLowerCase())).size;
  const uniqueParents = new Set(rows.map((row) => row.parent_email.toLowerCase())).size;
  const uniqueCohorts = new Set(rows.map((row) => row.cohort_name.toLowerCase())).size;

  return {
    success: errors.length === 0,
    errors,
    duplicateEmails: Array.from(duplicateEmails),
    existingEmails: [],
    uniqueTeachers,
    uniqueStudents,
    uniqueParents,
    uniqueCohorts,
  };
}

export async function findExistingEmails(db: DB | Tx, schoolId: string, emails: string[]) {
  const normalized = emails.map((email) => email.toLowerCase());
  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.schoolId, schoolId), inArray(users.email, normalized)));

  return new Set(rows.map((row) => row.email.toLowerCase()));
}
