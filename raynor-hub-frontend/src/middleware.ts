import { NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth"

// Lindungi semua halaman dashboard. Yang belum login diarahkan ke /login.
export async function middleware(req: NextRequest) {
  const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)
  if (ok) return NextResponse.next()
  const url = req.nextUrl.clone()
  url.pathname = "/login"
  url.search = ""
  return NextResponse.redirect(url)
}

export const config = {
  // kecualikan: login, semua /api/* (self-auth), aset statis, logo
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico|sabar-hub-logo.png).*)"],
}
