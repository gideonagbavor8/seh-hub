import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { directMessages, users } from "@/db/schema";
import { setDbSession } from "@/lib/db-session";
import { aliasedTable } from "drizzle-orm/alias";
import { and, eq, or, asc } from "drizzle-orm";

const sender = aliasedTable(users, "sender");

function parseThreadId(threadId: string) {
  const parts = threadId.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid thread id");
  }
  return [parts[0], parts[1]] as [string, string];
}

function getThreadCondition(a: string, b: string) {
  return or(
    and(eq(directMessages.senderId, a), eq(directMessages.receiverId, b)),
    and(eq(directMessages.senderId, b), eq(directMessages.receiverId, a))
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, role, school_id: schoolId } = session.user;
  const { threadId } = await context.params;
  const [firstId, secondId] = parseThreadId(threadId);

  if (role === "student") {
    return NextResponse.json(
      { success: false, error: "Students do not have messaging access" },
      { status: 403 }
    );
  }

  if (role !== "admin" && userId !== firstId && userId !== secondId) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await setDbSession(db, userId, schoolId);

  await db
    .update(directMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(directMessages.schoolId, schoolId),
        eq(directMessages.receiverId, userId),
        getThreadCondition(firstId, secondId)
      )
    );

  const rows = await db
    .select({
      id: directMessages.id,
      body: directMessages.body,
      senderId: directMessages.senderId,
      createdAt: directMessages.createdAt,
      isRead: directMessages.isRead,
      senderName: sender.fullName,
      senderAvatarUrl: sender.avatarUrl,
      senderRole: sender.role,
    })
    .from(directMessages)
    .innerJoin(sender, eq(directMessages.senderId, sender.id))
    .where(and(eq(directMessages.schoolId, schoolId), getThreadCondition(firstId, secondId)))
    .orderBy(asc(directMessages.createdAt));

  const messages = rows.map((message) => ({
    id: message.id,
    body: message.body,
    sender_id: message.senderId,
    sender_name: message.senderName,
    sender_avatar_url: message.senderAvatarUrl,
    sender_role: message.senderRole,
    created_at: message.createdAt.toISOString(),
    is_read: message.isRead,
  }));

  return NextResponse.json({ success: true, data: messages });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, role, school_id: schoolId } = session.user;
  const { threadId } = await context.params;
  const [firstId, secondId] = parseThreadId(threadId);

  if (role === "student") {
    return NextResponse.json(
      { success: false, error: "Students do not have messaging access" },
      { status: 403 }
    );
  }

  if (role !== "admin" && userId !== firstId && userId !== secondId) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await setDbSession(db, userId, schoolId);

  await db
    .update(directMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(directMessages.schoolId, schoolId),
        eq(directMessages.receiverId, userId),
        getThreadCondition(firstId, secondId)
      )
    );

  return NextResponse.json({ success: true, data: { updated: true } });
}
