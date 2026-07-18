// src/lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, schools } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        school_slug: { label: "School Slug", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.school_slug) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;
        const schoolSlug = credentials.school_slug as string;

        // Fetch the school first
        const schoolList = await db
          .select()
          .from(schools)
          .where(eq(schools.slug, schoolSlug))
          .limit(1);

        if (schoolList.length === 0) {
          return null; // School not found
        }
        const school = schoolList[0];

        // Fetch the user
        const userList = await db
          .select()
          .from(users)
          .where(and(eq(users.email, email), eq(users.schoolId, school.id)))
          .limit(1);

        if (userList.length === 0) {
          return null; // User not found
        }
        const user = userList[0];

        if (!user.isActive) {
          return null; // Account disabled
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
          return null; // Incorrect password
        }

        return {
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          role: user.role,
          school_id: school.id,
          school_slug: school.slug,
          avatar_url: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.school_id = user.school_id;
        token.school_slug = user.school_slug;
        token.full_name = user.full_name;
        token.avatar_url = user.avatar_url;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.school_id = token.school_id as string;
        session.user.school_slug = token.school_slug as string;
        session.user.full_name = token.full_name as string;
        session.user.avatar_url = (token.avatar_url as string | null) || null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
