// src/lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { sql } from "drizzle-orm";

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

        // Sign-in cannot use withTenant: RLS needs a current user, and this IS
        // the step that establishes one. app_login_lookup is a SECURITY DEFINER
        // function scoped to a single (slug, email) pair — see rls.sql. A plain
        // SELECT here returns zero rows under RLS and every login fails.
        const result = await db.execute(
          sql`SELECT * FROM app_login_lookup(${schoolSlug}, ${email})`
        );

        const row = (result.rows as Array<{
          user_id: string;
          password_hash: string;
          full_name: string;
          user_role: "admin" | "teacher" | "parent" | "student";
          avatar_url: string | null;
          is_active: boolean;
          school_id: string;
          school_slug: string;
        }>)[0];

        if (!row || !row.is_active) {
          return null; // Unknown school/email, or disabled account
        }

        const passwordMatch = await bcrypt.compare(password, row.password_hash);
        if (!passwordMatch) {
          return null; // Incorrect password
        }

        return {
          id: row.user_id,
          email,
          full_name: row.full_name,
          role: row.user_role,
          school_id: row.school_id,
          school_slug: row.school_slug,
          avatar_url: row.avatar_url,
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
