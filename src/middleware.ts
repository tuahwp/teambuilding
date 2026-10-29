import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "tb_admin_session";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET || "default-secret-key-teambuilding-min-32-chars-long";
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lindungi laluan /urusetia
  if (pathname.startsWith("/urusetia")) {
    const isLoginPage = pathname === "/urusetia/login";
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    let isAuthenticated = false;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, getSecretKey());
        if (payload.role === "admin") {
          isAuthenticated = true;
        }
      } catch {
        isAuthenticated = false;
      }
    }

    if (!isAuthenticated && !isLoginPage) {
      const loginUrl = new URL("/urusetia/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    if (isAuthenticated && isLoginPage) {
      const dashboardUrl = new URL("/urusetia", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/urusetia/:path*"],
};
