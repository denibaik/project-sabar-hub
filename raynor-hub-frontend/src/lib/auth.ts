// Sesi admin sederhana: cookie httpOnly bertanda-tangan HMAC (stateless).
// Pakai Web Crypto agar jalan baik di middleware (edge) maupun route handler (node).

export const SESSION_COOKIE = "sabar_session"

const enc = new TextEncoder()

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(data)))
}

export function sessionSecret(): string {
  return process.env.SESSION_SECRET || "dev-session-secret-change-me"
}

export async function createSessionToken(days = 7): Promise<string> {
  const exp = Date.now() + days * 86_400_000
  const payload = `admin:${exp}`
  return `${payload}.${await sign(sessionSecret(), payload)}`
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const dot = token.lastIndexOf(".")
  if (dot < 0) return false
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (sig !== (await sign(sessionSecret(), payload))) return false
  const exp = Number(payload.split(":")[1])
  return Number.isFinite(exp) && Date.now() < exp
}
