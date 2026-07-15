// src/lib/auth.ts
// NextAuth configuration for SEH Hub
// Supports four roles: Admin, Teacher, Parent, Student

import NextAuth, { type NextAuthOptions, type DefaultSession } from "next-auth";

// ---------------------------------------------------------------------------
// Module augmentation — extend the built-in session/JWT types with our fields
// ---------------------------------------------------------------------------
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

// ---------------------------------------------------------------------------
// Role type
// ---------------------------------------------------------------------------
export type UserRole = "admin" | "teacher" | "parent" | "student";

// ---------------------------------------------------------------------------
// NextAuth options
// Credentials provider will be wired up when the users table exists.
// ---------------------------------------------------------------------------
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    // Providers (CredentialsProvider) will be added in Phase 2
    // once the database schema and Ed25519 signing are in place.
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },

  pages: {
    // Custom auth pages will be implemented in Phase 2
    signIn: "/auth/login",
    error: "/auth/error",
  },
};

export default NextAuth(authOptions);
