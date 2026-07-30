import { NextResponse } from "next/server"
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const expected = process.env.DASHBOARD_PASSWORD || "changeme"
  if (!body?.password || body.password !== expected) {
    return NextResponse.json({ error: "Password salah" }, { status: 401 })
  }
  const token = await createSessionToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 86_400,
  })
  return res
}
