import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth"

// Proxy ber-auth ke backend FastAPI. Kunci HANYA di sini (server-side),
// tak pernah dikirim ke browser. Semua panggilan dashboard lewat sini.
const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000"
const ADMIN_KEY = process.env.ADMIN_API_KEY || "dev-admin-key"
const REG_KEY = process.env.BOT_REGISTRATION_KEY || "dev-registration-key"

async function isAdmin(): Promise<boolean> {
  const c = (await cookies()).get(SESSION_COOKIE)?.value
  return verifySessionToken(c)
}

async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const url = `${BACKEND}/${path.join("/")}${req.nextUrl.search}`
  const init: RequestInit = {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": ADMIN_KEY,
      "X-Registration-Key": REG_KEY, // agar register bot lewat dashboard tetap jalan
    },
    cache: "no-store",
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text()
  }
  try {
    const r = await fetch(url, init)

    // 204/205/304 dilarang punya body oleh standar HTTP, dan konstruktor
    // Response melempar galat kalau tetap diberi body — walau string kosong.
    // Galat itu dulu tertangkap catch di bawah dan dilaporkan sebagai
    // "backend unreachable", padahal backend sudah menjawab dengan benar:
    // menghapus bot berhasil, tapi dashboard menampilkan 502.
    if (r.status === 204 || r.status === 205 || r.status === 304) {
      return new NextResponse(null, { status: r.status })
    }

    const body = await r.text()
    return new NextResponse(body, {
      status: r.status,
      headers: { "Content-Type": r.headers.get("Content-Type") || "application/json" },
    })
  } catch (e) {
    return NextResponse.json({ error: `backend unreachable: ${(e as Error).message}` }, { status: 502 })
  }
}

type Ctx = { params: Promise<{ path: string[] }> }
export async function GET(req: NextRequest, ctx: Ctx) { return proxy(req, (await ctx.params).path) }
export async function POST(req: NextRequest, ctx: Ctx) { return proxy(req, (await ctx.params).path) }
export async function PATCH(req: NextRequest, ctx: Ctx) { return proxy(req, (await ctx.params).path) }
export async function DELETE(req: NextRequest, ctx: Ctx) { return proxy(req, (await ctx.params).path) }
