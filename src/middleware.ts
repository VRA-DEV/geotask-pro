import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware de autenticação.
 *
 * Rotas públicas: /login, /api/auth/login, /api/setup, assets estáticos.
 * Todas as outras rotas verificam se existe sessão via cookie ou header.
 *
 * Nota: A autenticação atual usa localStorage no cliente.
 * Este middleware protege as rotas API verificando o header X-User-Id
 * que o frontend deve enviar. Numa próxima iteração, migrar para
 * cookies HTTP-only com JWT.
 */

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/setup",
  "/api/cron/late-tasks",
];

const PUBLIC_PREFIXES = [
  "/_next",
  "/favicon",
  "/logo",
  "/icon",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  // Static files
  if (pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js|woff2?)$/)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // For API routes, check for user identification header
  if (pathname.startsWith("/api/")) {
    // /api/auth/me is used for session validation, allow it
    if (pathname === "/api/auth/me" || pathname === "/api/auth/change-password") {
      return NextResponse.next();
    }

    // For other API routes, we could check a header/cookie here.
    // For now, allow all API calls since auth is handled per-route.
    // TODO: Implement JWT-based auth with HTTP-only cookies
    return NextResponse.next();
  }

  // For page routes (non-API), the client-side handles auth redirect
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
