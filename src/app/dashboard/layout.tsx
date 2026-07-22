import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardProvider, DashboardUser } from "@/context/DashboardContext";
import DashboardShell from "@/components/layout/DashboardShell";

export const metadata = {
  title: "Dashboard | SEH Hub",
  description: "School-Home Engagement Platform",
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { id, role, school_id, school_slug, full_name, avatar_url, email } = session.user;

  const initialUser: DashboardUser = {
    id,
    role,
    school_id,
    school_slug,
    full_name,
    avatar_url: avatar_url || null,
    email: email || null,
    name: full_name,
  };

  return (
    <DashboardProvider initialUser={initialUser}>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
