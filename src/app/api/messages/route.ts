import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  directMessages,
  users,
  teacherCohorts,
  studentCohorts,
  parentStudentLinks,
  cohorts,
  notifications,
} from "@/db/schema";
import { setDbSession } from "@/lib/db-session";
import { and, eq, or, desc, inArray, sql } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm/alias";

const sender = aliasedTable(users, "sender");
const receiver = aliasedTable(users, "receiver");

function createThreadId(a: string, b: string) {
  return [a, b].sort().join(":");
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, role, school_id: schoolId } = session.user;
  const countOnly = request.nextUrl.searchParams.get("count") === "true";

  if (role === "student") {
    return NextResponse.json(
      { success: false, error: "Students do not have messaging access" },
      { status: 403 }
    );
  }

  await setDbSession(db, userId, schoolId);

  if (countOnly) {
    const countCondition =
      role === "admin"
        ? and(eq(directMessages.schoolId, schoolId), eq(directMessages.isRead, false))
        : and(
            eq(directMessages.schoolId, schoolId),
            eq(directMessages.receiverId, userId),
            eq(directMessages.isRead, false)
          );

    const [countRow] = await db
      .select({ total: sql`COUNT(*)`.as("total") })
      .from(directMessages)
      .where(countCondition);

    return NextResponse.json({
      success: true,
      data: { totalUnread: Number(countRow?.total ?? 0) },
    });
  }

  const rows = await db
    .select({
      id: directMessages.id,
      body: directMessages.body,
      createdAt: directMessages.createdAt,
      isRead: directMessages.isRead,
      senderId: directMessages.senderId,
      receiverId: directMessages.receiverId,
      senderName: sender.fullName,
      senderRole: sender.role,
      senderAvatar: sender.avatarUrl,
      receiverName: receiver.fullName,
      receiverRole: receiver.role,
      receiverAvatar: receiver.avatarUrl,
    })
    .from(directMessages)
    .innerJoin(sender, eq(directMessages.senderId, sender.id))
    .innerJoin(receiver, eq(directMessages.receiverId, receiver.id))
    .where(
      role === "admin"
        ? eq(directMessages.schoolId, schoolId)
        : and(
            eq(directMessages.schoolId, schoolId),
            or(eq(directMessages.senderId, userId), eq(directMessages.receiverId, userId))
          )
    )
    .orderBy(desc(directMessages.createdAt));

  type ThreadSummary = {
    thread_id: string;
    participant_id: string;
    participant_name: string;
    participant_role: string;
    participant_avatar_url: string | null;
    last_message: string;
    last_message_at: string;
    unread_count: number;
    cohort_name?: string | null;
  };

  const threadMap = new Map<string, ThreadSummary>();

  for (const item of rows) {
    const threadId = createThreadId(item.senderId, item.receiverId);

    if (!threadMap.has(threadId)) {
      let participantId: string;
      let participantName: string;
      let participantRole: string;
      let participantAvatarUrl: string | null;

      if (role === "admin") {
        const teacherInfo =
          item.senderRole === "teacher"
            ? { id: item.senderId, name: item.senderName, avatar: item.senderAvatar }
            : { id: item.receiverId, name: item.receiverName, avatar: item.receiverAvatar };
        const parentInfo =
          item.senderRole === "parent"
            ? { id: item.senderId, name: item.senderName, avatar: item.senderAvatar }
            : { id: item.receiverId, name: item.receiverName, avatar: item.receiverAvatar };

        participantId = teacherInfo.id;
        participantName = `${teacherInfo.name} ↔ ${parentInfo.name}`;
        participantRole = "teacher/parent";
        participantAvatarUrl = teacherInfo.avatar ?? parentInfo.avatar;
      } else {
        const other = item.senderId === userId
          ? {
              id: item.receiverId,
              name: item.receiverName,
              role: item.receiverRole,
              avatar: item.receiverAvatar,
            }
          : {
              id: item.senderId,
              name: item.senderName,
              role: item.senderRole,
              avatar: item.senderAvatar,
            };

        participantId = other.id;
        participantName = other.name;
        participantRole = other.role;
        participantAvatarUrl = other.avatar;
      }

      threadMap.set(threadId, {
        thread_id: threadId,
        participant_id: participantId,
        participant_name: participantName,
        participant_role: participantRole,
        participant_avatar_url: participantAvatarUrl,
        last_message: item.body,
        last_message_at: item.createdAt.toISOString(),
        unread_count: 0,
      });
    }

    const threadSummary = threadMap.get(threadId)!;
    if (item.receiverId === userId && !item.isRead) {
      threadSummary.unread_count += 1;
    }
  }

  if (role === "parent" && threadMap.size > 0) {
    const teacherIds = Array.from(threadMap.values())
      .filter((thread) => thread.participant_role === "teacher")
      .map((thread) => thread.participant_id);

    if (teacherIds.length > 0) {
      const cohortRows = await db
        .select({ teacherId: teacherCohorts.teacherId, cohortName: cohorts.name })
        .from(teacherCohorts)
        .innerJoin(cohorts, eq(teacherCohorts.cohortId, cohorts.id))
        .innerJoin(studentCohorts, eq(studentCohorts.cohortId, teacherCohorts.cohortId))
        .innerJoin(parentStudentLinks, eq(parentStudentLinks.studentId, studentCohorts.studentId))
        .where(
          and(
            eq(parentStudentLinks.parentId, userId),
            inArray(teacherCohorts.teacherId, teacherIds)
          )
        );

      const cohortMap = new Map<string, string>();
      for (const row of cohortRows) {
        if (!cohortMap.has(row.teacherId)) {
          cohortMap.set(row.teacherId, row.cohortName);
        }
      }

      for (const thread of threadMap.values()) {
        if (thread.participant_role === "teacher") {
          thread.cohort_name = cohortMap.get(thread.participant_id) ?? null;
        }
      }
    }
  }

  const data = Array.from(threadMap.values()).sort((a, b) =>
    b.last_message_at.localeCompare(a.last_message_at)
  );

  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: senderId, role, school_id: schoolId } = session.user;
  const body = (await request.json()) as { receiverId?: string; body?: string };
  const receiverId = body.receiverId?.trim();
  const text = body.body?.trim();

  if (!receiverId || !text) {
    return NextResponse.json(
      { success: false, error: "Receiver and message body are required" },
      { status: 400 }
    );
  }

  if (role === "student") {
    return NextResponse.json(
      { success: false, error: "Students do not have messaging access" },
      { status: 403 }
    );
  }

  await setDbSession(db, senderId, schoolId);

  const participants = await db
    .select({ id: users.id, role: users.role, schoolId: users.schoolId, fullName: users.fullName, avatarUrl: users.avatarUrl })
    .from(users)
    .where(inArray(users.id, [senderId, receiverId]));

  if (participants.length !== 2) {
    return NextResponse.json({ success: false, error: "Sender or receiver not found" }, { status: 404 });
  }

  const senderUser = participants.find((item) => item.id === senderId)!;
  const receiverUser = participants.find((item) => item.id === receiverId)!;

  if (senderUser.schoolId !== receiverUser.schoolId || senderUser.schoolId !== schoolId) {
    return NextResponse.json(
      { success: false, error: "Sender and receiver must belong to the same school" },
      { status: 403 }
    );
  }

  if (role === "parent") {
    if (receiverUser.role !== "teacher") {
      return NextResponse.json(
        {
          success: false,
          error: "Direct messaging between parents is not permitted on this platform",
        },
        { status: 403 }
      );
    }
  }

  if (role === "teacher") {
    if (receiverUser.role !== "parent") {
      return NextResponse.json(
        {
          success: false,
          error: "Teachers can only message parents of their students",
        },
        { status: 403 }
      );
    }

    const cohortLink = await db
      .select({ id: parentStudentLinks.id })
      .from(parentStudentLinks)
      .innerJoin(studentCohorts, eq(parentStudentLinks.studentId, studentCohorts.studentId))
      .innerJoin(teacherCohorts, eq(studentCohorts.cohortId, teacherCohorts.cohortId))
      .where(
        and(
          eq(teacherCohorts.teacherId, senderId),
          eq(parentStudentLinks.parentId, receiverId)
        )
      )
      .limit(1);

    if (cohortLink.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Teachers can only message parents of students in their cohorts",
        },
        { status: 403 }
      );
    }
  }

  if (role === "admin") {
    if (receiverUser.role !== "teacher") {
      return NextResponse.json(
        { success: false, error: "Admins can only message teachers" },
        { status: 403 }
      );
    }
  }

  const [created] = await db
    .insert(directMessages)
    .values({
      schoolId,
      senderId,
      receiverId,
      body: text,
      isRead: false,
    })
    .returning();

  await db.insert(notifications).values({
    userId: receiverId,
    schoolId,
    title: `New message from ${senderUser.fullName}`,
    body: text.length > 120 ? `${text.slice(0, 117)}...` : text,
    type: "message",
    meta: { thread_id: createThreadId(senderId, receiverId) },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: created.id,
      senderId,
      receiverId,
      body: created.body,
      isRead: created.isRead,
      createdAt: created.createdAt.toISOString(),
      senderName: senderUser.fullName,
      senderAvatarUrl: senderUser.avatarUrl,
    },
  });
}
