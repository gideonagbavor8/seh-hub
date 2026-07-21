import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  
  const isApiRoute = nextUrl.pathname.startsWith("/api");
  const isAuthApiRoute = nextUrl.pathname.startsWith("/api/auth");
  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");
  const isAuthRoute = nextUrl.pathname === "/login" || nextUrl.pathname === "/register" || nextUrl.pathname === "/";

  if (isApiRoute && !isAuthApiRoute) {
    if (!isLoggedIn) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      const role = req.auth?.user?.role;
      if (role === "admin" || role === "teacher") {
        return NextResponse.redirect(new URL("/dashboard/overview", nextUrl));
      }
      return NextResponse.redirect(new URL("/dashboard/feed", nextUrl));
    }
    return NextResponse.next();
  }

  if (isDashboardRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    
    // Redirect /dashboard or /dashboard/ to role-specific sub-routes
    if (nextUrl.pathname === "/dashboard" || nextUrl.pathname === "/dashboard/") {
      const role = req.auth?.user?.role;
      if (role === "admin" || role === "teacher") {
        return NextResponse.redirect(new URL("/dashboard/overview", nextUrl));
      }
      return NextResponse.redirect(new URL("/dashboard/feed", nextUrl));
    }
  }

  if (isLoggedIn) {
    const headers = new Headers(req.headers);
    headers.set("x-user-role", req.auth?.user?.role || "");
    return NextResponse.next({
      request: {
        headers,
      },
    });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
