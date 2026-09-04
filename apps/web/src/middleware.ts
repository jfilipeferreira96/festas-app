import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js Middleware for Gestão de Festas Infantis.
 *
 * Simple middleware that handles:
 * 1. Protected routes - redirect to signin if not authenticated
 * 2. Guest routes - redirect to dashboard if already authenticated
 */

// Paths that should NOT be handled by the middleware
const SKIP_PATHS = [
  "/api/",
  "/_next/",
  "/static/",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/images/",
];

// Paths that are accessible without authentication
const GUEST_PATHS = [
  "/entrar",
  "/registar",
  "/recuperar-palavra-passe",
  "/recuperar-palavra-passe-confirm",
];

export function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Skip middleware for static files, API routes, etc.
  if (SKIP_PATHS.some((path) => url.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Skip middleware for POST/PUT/DELETE/PATCH requests
  if (request.method !== "GET") {
    return NextResponse.next();
  }

  // Check if user has a session cookie
  const sessionToken = request.cookies.get("better-auth.session_token");

  // If user is not authenticated and trying to access a protected route
 if (!sessionToken && !GUEST_PATHS.some((path) => url.pathname.startsWith(path))) {
    const signinUrl = new URL("/entrar", request.url);
    //signinUrl.searchParams.set("callbackUrl", url.pathname);
    return NextResponse.redirect(signinUrl);
  }

  // If user is authenticated and trying to access guest routes, redirect to dashboard
  if (sessionToken && GUEST_PATHS.some((path) => url.pathname.startsWith(path))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
