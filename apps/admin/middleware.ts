import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "admin_session";

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const { pathname } = request.nextUrl;

//   if (pathname === "/login") {
//     if (session) {
//       return NextResponse.redirect(new URL("/dashboard", request.url));
//     }
//     return NextResponse.next();
//   }

//   if (pathname.startsWith("/dashboard")) {
//     if (!session) {
//       return NextResponse.redirect(new URL("/login", request.url));
//     }
//     return NextResponse.next();
//   }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*"]
};
