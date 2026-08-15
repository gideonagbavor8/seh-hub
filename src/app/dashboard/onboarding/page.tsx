"use client";

import React, { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UploadCloud,
  Download,
  Check,
  AlertTriangle,
  Loader2,
  Search,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ClipReveal } from "@/components/motion/ClipReveal";
import { useDashboard } from "@/context/DashboardContext";
import { applySchoolAccent, getCurrentTheme } from "@/lib/theme";

interface PreviewRow {
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

type OnboardPreview = {
  counts: {
    teachers: number;
    students: number;
    parents: number;
    cohorts: number;
  };
  warnings: string[];
  previewRows: PreviewRow[];
};

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  cohort_names: string[];
}

const TAB_OPTIONS = ["Upload", "Users", "School Settings"] as const;

type TabOption = (typeof TAB_OPTIONS)[number];

const COLUMN_GUIDE: [string, string][] = [
  ["teacher_name", "Jane Teacher"],
  ["teacher_email", "teacher@his.edu.gh"],
  ["cohort_name", "JHS 2A"],
  ["student_name", "Sam Student"],
  ["student_email", "student@his.edu.gh"],
  ["parent_name", "Mary Parent"],
  ["parent_email", "parent@his.edu.gh"],
  ["parent_phone", "+233201234567"],
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const templateCsv = `teacher_name,teacher_email,cohort_name,student_name,student_email,parent_name,parent_email,parent_phone
John Doe,teacher@his.edu.gh,JHS 2A,Jane Doe,student@his.edu.gh,Mary Doe,parent@his.edu.gh,+233201234567
Anna Smith,teacher2@his.edu.gh,JHS 2A,Samuel Smith,student2@his.edu.gh,Peter Smith,parent2@his.edu.gh,+233201234568\n`;

function OnboardingConsole() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabOption | null;

  const { user, setPageTitle } = useDashboard();
  const [activeTab, setActiveTab] = useState<TabOption>("Upload");

  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<OnboardPreview | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState({
    name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    primary_color: "#1F6F43",
    secondary_color: "#000000",
    logo_url: "",
    slug: "",
  });
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "teacher" | "parent" | "student">("all");
  const [page, setPage] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeConfirmUser, setActiveConfirmUser] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPageTitle("Onboarding");
  }, [setPageTitle]);

  // Sync tab with URL parameter (e.g. from a sidebar navigation click)
  useEffect(() => {
    if (tabParam && TAB_OPTIONS.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (user.role !== "admin") {
      router.replace("/dashboard/overview");
    }
  }, [router, user.role]);

  const handleTabChange = (tab: TabOption) => {
    setActiveTab(tab);
    setStep(1);
    router.push(`/dashboard/onboarding?tab=${encodeURIComponent(tab)}`);
  };

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      params.set("offset", String(page * 20));
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (userSearch.trim()) params.set("search", userSearch.trim());
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.data.users);
        setTotalUsers(json.data.total);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingUsers(false);
    }
  }, [page, roleFilter, userSearch]);

  const fetchSchoolSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/school");
      const json = await res.json();
      if (json.success) {
        setSchoolSettings({
          name: json.data.name || "",
          slug: json.data.slug || "",
          logo_url: json.data.logo_url || "",
          primary_color: json.data.primary_color || "#1F6F43",
          secondary_color: json.data.secondary_color || "#000000",
          contact_email: json.data.contact_email || "",
          contact_phone: json.data.contact_phone || "",
          address: json.data.address || "",
        });
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "Users") {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  useEffect(() => {
    if (activeTab === "School Settings") {
      fetchSchoolSettings();
    }
  }, [activeTab, fetchSchoolSettings]);

  useEffect(() => {
    if (successAnimation) {
      const timer = window.setTimeout(() => {
        setActiveTab("Users");
        setSuccessAnimation(false);
        setStep(1);
      }, 3000);
      return () => window.clearTimeout(timer);
    }
  }, [successAnimation]);

  function handleFileSelection(selectedFile: File | null) {
    setFile(selectedFile);
    setFileError(null);
    setPreview(null);
    setStep(1);
  }

  function validateFileType(file: File) {
    const accepted = ["csv", "xlsx", "xls"];
    const extension = file.name.split(".").pop()?.toLowerCase();
    return extension ? accepted.includes(extension) : false;
  }

  async function handleValidate() {
    if (!file) {
      setFileError("Please select a CSV or Excel file.");
      return;
    }
    if (!validateFileType(file)) {
      setFileError("Only .csv, .xlsx and .xls files are supported.");
      return;
    }
    setIsValidating(true);
    setFileError(null);
    try {
      const payload = new FormData();
      payload.set("file", file);
      const res = await fetch("/api/admin/onboard/preview", { method: "POST", body: payload });
      const json = await res.json();
      if (!json.success) {
        setFileError(json.error || "Validation failed.");
        return;
      }
      setPreview(json.data);
      setStep(2);
    } catch {
      setFileError("Unable to validate file. Please try again.");
    } finally {
      setIsValidating(false);
    }
  }

  async function handleConfirm() {
    if (!file) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = new FormData();
      payload.set("file", file);
      const res = await fetch("/api/admin/onboard", { method: "POST", body: payload });
      const json = await res.json();
      if (!json.success) {
        setSubmitError(json.error || "Onboarding failed.");
        return;
      }
      setSuccessAnimation(true);
    } catch {
      setSubmitError("An unexpected error occurred during onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDownloadTemplate() {
    const blob = new Blob([templateCsv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "seh-hub-onboarding-template.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function handleToggleActivation(userId: string, isActive: boolean) {
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      fetchUsers();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleSaveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingSettings(true);
    setSettingsMessage(null);
    try {
      const res = await fetch("/api/admin/school", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schoolSettings),
      });
      const json = await res.json();
      if (json.success) {
        setSettingsMessage("Settings saved");
        setTimeout(() => setSettingsMessage(null), 2500);
      }
    } catch (error) {
      console.error(error);
      setSettingsMessage("Unable to save settings");
      setTimeout(() => setSettingsMessage(null), 2500);
    } finally {
      setSavingSettings(false);
    }
  }

  const totalPages = Math.ceil(totalUsers / 20);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      {/* ── Header ── */}
      <div>
        <h2 className="font-heading text-3xl font-semibold text-ink">Onboarding</h2>
        <div className="rule-accent mt-3" />
        <p className="mt-3 max-w-2xl text-sm text-ink-muted">
          Add teachers, students and parents in one batch, then manage accounts and
          school details from here.
        </p>
      </div>

      {/* ── Tabs ── */}
      <div
        role="tablist"
        aria-label="Onboarding sections"
        className="flex w-full flex-wrap items-center gap-1 border-b border-line"
      >
        {TAB_OPTIONS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(tab)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ══ Upload ══ */}
      {activeTab === "Upload" && (
        <div className="space-y-5">
          {successAnimation ? (
            <div className="card flex min-h-[380px] flex-col items-center justify-center p-10 text-center">
              <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
                <Check className="h-8 w-8 text-primary" />
              </span>
              <h3 className="font-heading text-2xl font-semibold text-ink">
                Onboarding complete
              </h3>
              <p className="mt-2 max-w-md text-sm text-ink-muted">
                Accounts, classes and welcome SMS jobs have been queued. Taking you to
                the Users tab…
              </p>
            </div>
          ) : (
            <>
              {/* Step 1 */}
              <ClipReveal from="bottom" className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Step 1
                    </p>
                    <h3 className="mt-1 font-heading text-xl font-semibold text-ink">
                      Upload your file
                    </h3>
                  </div>
                  <button onClick={handleDownloadTemplate} className="btn-secondary">
                    <Download className="h-4 w-4" />
                    Template
                  </button>
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    const droppedFile = event.dataTransfer.files[0];
                    if (droppedFile) handleFileSelection(droppedFile);
                  }}
                  className={`mt-5 rounded-2xl border-2 border-dashed p-8 text-center transition-colors duration-150 ${
                    isDragging
                      ? "border-primary bg-primary-soft"
                      : "border-line-strong bg-surface-2"
                  }`}
                >
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-primary">
                    <UploadCloud className="h-6 w-6" />
                  </span>
                  <p className="mt-3 text-sm text-ink-soft">
                    Drag a CSV or Excel file here, or browse to select one.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-primary mt-4"
                  >
                    Choose file
                  </button>

                  {file && (
                    <div className="mx-auto mt-4 flex max-w-sm items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left">
                      <FileSpreadsheet className="h-5 w-5 flex-shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                        <p className="text-xs text-ink-muted">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(event) =>
                      handleFileSelection(event.target.files?.[0] ?? null)
                    }
                  />
                </div>

                {/* Column guide */}
                <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-5">
                  <h4 className="section-title text-base">Required columns</h4>
                  <p className="mt-1 text-sm text-ink-muted">
                    Every column below must be present, in any order.
                  </p>
                  <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                    {COLUMN_GUIDE.map(([key, example]) => (
                      <div
                        key={key}
                        className="rounded-xl border border-line bg-surface px-3 py-2"
                      >
                        <dt className="font-mono text-xs font-semibold text-primary">
                          {key}
                        </dt>
                        <dd className="mt-0.5 truncate text-sm text-ink-soft">{example}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleValidate}
                    disabled={isValidating}
                    className="btn-primary"
                  >
                    {isValidating && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isValidating ? "Checking…" : "Check file"}
                  </button>
                  {fileError && (
                    <p role="alert" className="text-sm font-medium text-danger">
                      {fileError}
                    </p>
                  )}
                </div>
              </ClipReveal>

              {/* Step 2 */}
              {step === 2 && preview && (
                <ClipReveal from="bottom" className="card p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Step 2
                  </p>
                  <h3 className="mt-1 font-heading text-xl font-semibold text-ink">
                    Review and confirm
                  </h3>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {(
                      [
                        ["Teachers", preview.counts.teachers],
                        ["Students", preview.counts.students],
                        ["Parents", preview.counts.parents],
                        ["Classes", preview.counts.cohorts],
                      ] as [string, number][]
                    ).map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-xl border border-line bg-surface-2 p-4"
                      >
                        <p className="text-sm text-ink-muted">{label}</p>
                        <p className="mt-1 font-heading text-3xl font-semibold text-ink">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {preview.warnings.length > 0 && (
                    <div className="mt-4 rounded-xl bg-warning-soft p-4">
                      <p className="flex items-center gap-2 font-semibold text-ink">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        Warnings
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-ink-soft">
                        {preview.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h4 className="section-title text-base">Preview</h4>
                      <span className="badge-neutral">First 10 rows</span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-line">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-surface-2">
                          <tr>
                            <th className="px-4 py-2.5 font-semibold text-ink-soft">Teacher</th>
                            <th className="px-4 py-2.5 font-semibold text-ink-soft">Student</th>
                            <th className="px-4 py-2.5 font-semibold text-ink-soft">Parent</th>
                            <th className="px-4 py-2.5 font-semibold text-ink-soft">Class</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {preview.previewRows.map((row) => (
                            <tr key={row.rowNumber}>
                              <td className="px-4 py-2.5 text-ink">{row.teacher_name}</td>
                              <td className="px-4 py-2.5 text-ink">{row.student_name}</td>
                              <td className="px-4 py-2.5 text-ink">{row.parent_name}</td>
                              <td className="px-4 py-2.5 text-ink-soft">{row.cohort_name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={isSubmitting}
                      className="btn-primary"
                    >
                      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isSubmitting ? "Creating accounts…" : "Confirm onboarding"}
                    </button>
                  </div>
                  {submitError && (
                    <p role="alert" className="mt-3 text-sm font-medium text-danger">
                      {submitError}
                    </p>
                  )}
                </ClipReveal>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ Users ══ */}
      {activeTab === "Users" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "teacher", "parent", "student"] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    setRoleFilter(role);
                    setPage(0);
                  }}
                  aria-pressed={roleFilter === role}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
                    roleFilter === role
                      ? "border-primary bg-primary text-on-primary"
                      : "border-line-strong bg-surface text-ink-soft hover:text-ink"
                  }`}
                >
                  {role === "all" ? "All" : `${role.charAt(0).toUpperCase()}${role.slice(1)}s`}
                </button>
              ))}
            </div>

            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={userSearch}
                onChange={(event) => {
                  setUserSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Search by name or email"
                aria-label="Search users"
                className="input pl-9"
              />
            </div>
          </div>

          <div className="card overflow-hidden">
            {loadingUsers ? (
              <div className="divide-y divide-line">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="flex items-center gap-3 p-4">
                    <div className="skeleton h-11 w-11 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-3 w-1/4" />
                      <div className="skeleton h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <p className="font-heading text-lg font-semibold text-ink">No users found</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Try a different filter or search term.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {users.map((userItem) => (
                  <li key={userItem.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft font-heading text-sm font-semibold text-primary">
                        {userItem.full_name
                          .split(" ")
                          .map((part: string) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">
                          {userItem.full_name}
                        </p>
                        <p className="truncate text-sm text-ink-muted">{userItem.email}</p>
                      </div>

                      <div className="hidden w-24 sm:block">
                        <span className="badge-neutral capitalize">{userItem.role}</span>
                      </div>

                      <div className="hidden min-w-0 flex-1 md:block">
                        <p className="truncate text-sm text-ink-soft">
                          {userItem.cohort_names.join(", ") || "—"}
                        </p>
                      </div>

                      <span
                        className={userItem.is_active ? "badge-primary" : "badge-danger"}
                      >
                        {userItem.is_active ? "Active" : "Inactive"}
                      </span>

                      <button
                        type="button"
                        onClick={() => setActiveConfirmUser(userItem.id)}
                        className="btn-secondary px-3 py-1.5 text-xs"
                      >
                        {userItem.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>

                    {activeConfirmUser === userItem.id && (
                      <div className="mt-3 rounded-xl bg-surface-2 p-3">
                        <p className="text-sm text-ink-soft">
                          {userItem.is_active
                            ? `${userItem.full_name} will be signed out and blocked from logging in.`
                            : `${userItem.full_name} will be able to log in again.`}
                        </p>
                        <div className="mt-2.5 flex gap-2">
                          <button
                            onClick={() => {
                              handleToggleActivation(userItem.id, userItem.is_active);
                              setActiveConfirmUser(null);
                            }}
                            className={
                              userItem.is_active
                                ? "btn-danger px-3 py-1.5 text-xs"
                                : "btn-primary px-3 py-1.5 text-xs"
                            }
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setActiveConfirmUser(null)}
                            className="btn-ghost px-3 py-1.5 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              className="btn-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-sm text-ink-muted">
              Page {page + 1} of {Math.max(totalPages, 1)} · {totalUsers} users
            </span>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, Math.max(totalPages - 1, 0)))}
              className="btn-secondary"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ══ School Settings ══ */}
      {activeTab === "School Settings" && (
        <div className="space-y-4">
          <form className="card p-6" onSubmit={handleSaveSettings}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-xl font-semibold text-ink">
                  School details
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  These appear across the app and on notices sent to families.
                </p>
              </div>
              {schoolSettings.slug && (
                <span className="badge-neutral">/{schoolSettings.slug}</span>
              )}
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div>
                <label htmlFor="school-name" className="field-label">
                  School name
                </label>
                <input
                  id="school-name"
                  value={schoolSettings.name}
                  onChange={(event) =>
                    setSchoolSettings((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="school-email" className="field-label">
                  Contact email
                </label>
                <input
                  id="school-email"
                  type="email"
                  value={schoolSettings.contact_email}
                  onChange={(event) =>
                    setSchoolSettings((prev) => ({
                      ...prev,
                      contact_email: event.target.value,
                    }))
                  }
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="school-phone" className="field-label">
                  Contact phone
                </label>
                <input
                  id="school-phone"
                  type="tel"
                  value={schoolSettings.contact_phone}
                  onChange={(event) =>
                    setSchoolSettings((prev) => ({
                      ...prev,
                      contact_phone: event.target.value,
                    }))
                  }
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="school-logo" className="field-label">
                  Logo URL
                </label>
                <input
                  id="school-logo"
                  value={schoolSettings.logo_url}
                  onChange={(event) =>
                    setSchoolSettings((prev) => ({ ...prev, logo_url: event.target.value }))
                  }
                  className="input"
                />
              </div>

              <div className="lg:col-span-2">
                <label htmlFor="school-address" className="field-label">
                  Address
                </label>
                <textarea
                  id="school-address"
                  value={schoolSettings.address}
                  onChange={(event) =>
                    setSchoolSettings((prev) => ({ ...prev, address: event.target.value }))
                  }
                  rows={3}
                  className="input resize-none"
                />
              </div>

              <div className="lg:col-span-2">
                <label htmlFor="school-color" className="field-label">
                  Accent colour
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="school-color"
                    type="color"
                    value={schoolSettings.primary_color}
                    onChange={(event) => {
                      const next = event.target.value;
                      setSchoolSettings((prev) => ({ ...prev, primary_color: next }));
                      // Repaint the app live so the choice is visible before saving.
                      applySchoolAccent(next, getCurrentTheme());
                    }}
                    className="h-11 w-14 cursor-pointer rounded-lg border border-line-strong bg-surface p-1"
                  />
                  <span className="font-mono text-sm text-ink-soft">
                    {schoolSettings.primary_color}
                  </span>
                </div>
                <p className="field-hint">
                  Used for buttons, links and highlights across the app. If a shade is
                  too light to read against the page, it is darkened automatically —
                  your saved value is kept as-is.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <button type="submit" disabled={savingSettings} className="btn-primary">
                {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingSettings ? "Saving…" : "Save changes"}
              </button>
              {settingsMessage && (
                <span className="text-sm font-medium text-primary">{settingsMessage}</span>
              )}
            </div>
          </form>

          {schoolSettings.logo_url && (
            <div className="card p-6">
              <h4 className="section-title text-base">Logo preview</h4>
              <div className="mt-3 flex h-28 items-center justify-center rounded-xl border border-line bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={schoolSettings.logo_url}
                  alt="School logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-20 text-sm text-ink-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading…
        </div>
      }
    >
      <OnboardingConsole />
    </Suspense>
  );
}
