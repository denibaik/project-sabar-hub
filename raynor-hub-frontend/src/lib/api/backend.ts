// Client dashboard → proxy Next.js (/api/backend) → backend FastAPI.
// Semua lewat proxy same-origin: kunci disuntik server-side, TIDAK pernah di browser.

export const API_BASE = "/api/backend"

export interface BackendBot {
  id: string
  name: string
  username: string
  game: string
  status: "online" | "offline" | "maintenance"
  last_heartbeat_at: string | null
  server: string | null
  ping_ms: number | null
}

export interface BackendOrderItem {
  category: string
  item_key: string
  count: number
}

export type OrderStatus = "pending" | "processing" | "done" | "partial" | "failed"

export interface BackendOrder {
  id: string
  recipient: string
  items: BackendOrderItem[]
  note: string
  status: OrderStatus
  assigned_bot: string | null
  sent_total: number
  requested_total: number
  error: string | null
  created_at: string | null
  updated_at: string | null
}

export interface AvailableItem {
  category: string
  item_key: string      // kunci asli untuk SendBatch (mis. UUID pet)
  display_name: string  // nama ramah untuk UI (mis. "Golden Dragonfly")
  total: number
  bots: string[]
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

const jsonHeaders = { "Content-Type": "application/json" }

export const backend = {
  async health(): Promise<boolean> {
    try {
      const r = await fetch(`${API_BASE}/health`, { cache: "no-store" })
      return r.ok
    } catch {
      return false
    }
  },

  async listBots(): Promise<BackendBot[]> {
    const r = await fetch(`${API_BASE}/api/v1/bots`, { cache: "no-store" })
    const d = await unwrap<{ items: BackendBot[]; total: number }>(r)
    return d.items
  },

  async registerBot(name: string, username: string, game: string): Promise<{ bot: BackendBot; token: string }> {
    const r = await fetch(`${API_BASE}/api/v1/bots`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ name, username, game }),
    })
    return unwrap<{ bot: BackendBot; token: string }>(r)
  },

  async listOrders(): Promise<BackendOrder[]> {
    const r = await fetch(`${API_BASE}/api/v1/orders`, { cache: "no-store" })
    const d = await unwrap<{ items: BackendOrder[]; total: number }>(r)
    return d.items
  },

  async createOrder(recipient: string, items: BackendOrderItem[], note = ""): Promise<BackendOrder> {
    const r = await fetch(`${API_BASE}/api/v1/orders`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ recipient, items, note }),
    })
    return unwrap<BackendOrder>(r)
  },

  async listItems(): Promise<AvailableItem[]> {
    const r = await fetch(`${API_BASE}/api/v1/items`, { cache: "no-store" })
    const d = await unwrap<{ items: AvailableItem[]; total: number }>(r)
    return d.items
  },
}

// util: format ISO → "X detik/menit lalu"
export function relativeTime(iso: string | null): string {
  if (!iso) return "Belum pernah"
  const t = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z").getTime()
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return `${s} detik lalu`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} menit lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  return `${Math.floor(h / 24)} hari lalu`
}
