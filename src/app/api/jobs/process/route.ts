// src/app/api/jobs/process/route.ts
// Cron job processor — triggered by external cron service (cron-job.org)
// Processes pending automation_jobs: emergency_sms via Arkesel, emergency_log

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { automationJobs } from "@/db/schema";
import { eq, and, lt, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get("x-cron-secret");
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    // Fetch pending jobs (no RLS needed — this is a system-level operation)
    const pendingJobs = await db
      .select()
      .from(automationJobs)
      .where(
        and(
          eq(automationJobs.status, "pending"),
          lt(automationJobs.attempts, automationJobs.maxAttempts)
        )
      )
      .orderBy(automationJobs.createdAt)
      .limit(10);

    for (const job of pendingJobs) {
      processed++;

      try {
        // Mark as running
        await db
          .update(automationJobs)
          .set({
            status: "running",
            attempts: job.attempts + 1,
            lastAttemptedAt: new Date(),
          })
          .where(eq(automationJobs.id, job.id));

        // Execute based on job type
        switch (job.jobType) {
          case "emergency_sms": {
            const payload = job.payload as { phone: string; message: string; announcement_id: string };
            const apiKey = process.env.ARKESEL_API_KEY;

            if (!apiKey) {
              console.warn(`[JobProcessor] ARKESEL_API_KEY not set — skipping SMS to ${payload.phone}`);
              await db
                .update(automationJobs)
                .set({
                  status: "success",
                  completedAt: new Date(),
                  errorMessage: "ARKESEL_API_KEY not configured — SMS skipped",
                })
                .where(eq(automationJobs.id, job.id));
              succeeded++;
              continue;
            }

            const smsResponse = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
              method: "POST",
              headers: {
                "api-key": apiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sender: "SEH Hub",
                message: payload.message,
                recipients: [payload.phone],
              }),
            });

            if (!smsResponse.ok) {
              throw new Error(`Arkesel API responded with ${smsResponse.status}`);
            }

            await db
              .update(automationJobs)
              .set({ status: "success", completedAt: new Date() })
              .where(eq(automationJobs.id, job.id));
            succeeded++;
            break;
          }

          case "welcome_sms": {
            const payload = job.payload as {
              phone: string;
              name: string;
              email: string;
              school_name: string;
              school_slug: string;
              temp_password: string;
            };
            const apiKey = process.env.ARKESEL_API_KEY;
            const message = `Welcome to ${payload.school_name}! Your account is ready. Email: ${payload.email}. Password: ${payload.temp_password}. Login at https://${payload.school_slug}.seh-hub.com/login`;

            if (!payload.phone) {
              console.warn(`[JobProcessor] Missing phone for welcome SMS payload: ${JSON.stringify(payload)}`);
              await db
                .update(automationJobs)
                .set({ status: "failed", completedAt: new Date(), errorMessage: "Missing phone number" })
                .where(eq(automationJobs.id, job.id));
              failed++;
              break;
            }

            if (!apiKey) {
              console.warn(`[JobProcessor] ARKESEL_API_KEY not set — skipping welcome SMS to ${payload.phone}`);
              await db
                .update(automationJobs)
                .set({
                  status: "success",
                  completedAt: new Date(),
                  errorMessage: "ARKESEL_API_KEY not configured — SMS skipped",
                })
                .where(eq(automationJobs.id, job.id));
              succeeded++;
              break;
            }

            const smsResponse = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
              method: "POST",
              headers: {
                "api-key": apiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sender: "SEH Hub",
                message,
                recipients: [payload.phone],
              }),
            });

            if (!smsResponse.ok) {
              throw new Error(`Arkesel API responded with ${smsResponse.status}`);
            }

            await db
              .update(automationJobs)
              .set({ status: "success", completedAt: new Date() })
              .where(eq(automationJobs.id, job.id));
            succeeded++;
            break;
          }

          case "emergency_log": {
            const payload = job.payload as Record<string, unknown>;
            console.log("[AuditLog] Emergency announcement dispatched:", JSON.stringify(payload));

            await db
              .update(automationJobs)
              .set({ status: "success", completedAt: new Date() })
              .where(eq(automationJobs.id, job.id));
            succeeded++;
            break;
          }

          default: {
            console.warn(`[JobProcessor] Unknown job type: ${job.jobType}`);
            await db
              .update(automationJobs)
              .set({
                status: "failed",
                errorMessage: `Unknown job type: ${job.jobType}`,
              })
              .where(eq(automationJobs.id, job.id));
            failed++;
          }
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`[JobProcessor] Job ${job.id} failed:`, errMsg);

        // If attempts < max, reset to pending for retry; otherwise mark failed
        const newStatus = job.attempts + 1 < job.maxAttempts ? "pending" : "failed";

        await db
          .update(automationJobs)
          .set({
            status: newStatus as "pending" | "failed",
            errorMessage: errMsg,
          })
          .where(eq(automationJobs.id, job.id));

        failed++;
      }
    }

    return NextResponse.json({ processed, succeeded, failed });
  } catch (error) {
    console.error("[JobProcessor] Critical error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
