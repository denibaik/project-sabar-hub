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

export type OrderSource =
  | "manual" | "google_sheet" | "vcgamers" | "u7buy" | "itemku" | "g2g" | "eldorado" | "webstore"

export interface OrderPage {
  items: BackendOrder[]
  total: number
  page: number
  page_size: number
  total_pages: number
  counts: Partial<Record<OrderStatus, number>>
  sources: Record<string, number>
}

export interface BackendOrder {
  id: string
  recipient: string
  items: BackendOrderItem[]
  note: string
  source: string
  status: OrderStatus
  assigned_bot: string | null
  sent_total: number
  requested_total: number
  error: string | null
  created_at: string | null
  updated_at: string | null
}

export type ChannelType =
  | "itemku" | "g2g" | "eldorado" | "u7buy" | "vcgamers" | "webstore" | "google_sheet"

export interface BackendChannel {
  id: string
  type: ChannelType
  name: string
  enabled: boolean
  status: "disconnected" | "connected" | "error" | "syncing"
  config: Record<string, unknown>
  last_synced_at: string | null
  created_at: string | null
  updated_at: string | null
}

/** Satu notifikasi webhook beserta nasibnya setelah diproses. */
export interface WebhookEvent {
  id: string
  source: string
  event: string
  dedupe_key: string
  /** received = belum diproses · processed · ignored · failed */
  status: string
  error: string | null
  received_at: string | null
  processed_at: string | null
}

/** Satu baris pemetaan produk U7Buy → item katalog game. */
export interface U7BuyProduct {
  category: string
  item_key: string
  per_unit: number
  /** nama produk di U7Buy — hanya acuan manusia, tidak dipakai sistem */
  _produk?: string
}

/** Satu listing di U7Buy, dengan usulan pemetaannya. */
export interface U7BuyOffer {
  product_id: string
  name: string
  stock: number | null
  sold: number | null
  on_sale: boolean
  already_mapped: boolean
  /** kosong bila tak dapat ditentukan — harus diisi manusia, bukan ditebak */
  category: string
  item_key: string
  per_unit: number
}

export interface SyncResult {
  imported: number
  skipped: number
  errors: string[]
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

  async deleteBot(id: string): Promise<void> {
    const r = await fetch(`${API_BASE}/api/v1/bots/${id}`, { method: "DELETE" })
    if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`)
  },

  /** Satu halaman order. `counts`/`sources` mencakup SEMUA order, bukan halaman ini. */
  async listOrders(page = 1, pageSize = 10, source?: string): Promise<OrderPage> {
    const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
    if (source) q.set("source", source)
    const r = await fetch(`${API_BASE}/api/v1/orders?${q}`, { cache: "no-store" })
    return unwrap<OrderPage>(r)
  },

  async createOrder(recipient: string, items: BackendOrderItem[], note = "", source = "manual"): Promise<BackendOrder> {
    const r = await fetch(`${API_BASE}/api/v1/orders`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ recipient, items, note, source }),
    })
    return unwrap<BackendOrder>(r)
  },

  // ---- Marketplace channels ----
  async listChannels(): Promise<BackendChannel[]> {
    const r = await fetch(`${API_BASE}/api/v1/channels`, { cache: "no-store" })
    const d = await unwrap<{ items: BackendChannel[]; total: number }>(r)
    return d.items
  },

  async createChannel(type: ChannelType, name: string, config: Record<string, unknown> = {}): Promise<BackendChannel> {
    const r = await fetch(`${API_BASE}/api/v1/channels`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name, config }),
    })
    return unwrap<BackendChannel>(r)
  },

  async updateChannel(id: string, patch: { name?: string; enabled?: boolean; config?: Record<string, unknown> }): Promise<BackendChannel> {
    const r = await fetch(`${API_BASE}/api/v1/channels/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    return unwrap<BackendChannel>(r)
  },

  async deleteChannel(id: string): Promise<void> {
    const r = await fetch(`${API_BASE}/api/v1/channels/${id}`, { method: "DELETE" })
    if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`)
  },

  async syncChannel(id: string): Promise<SyncResult> {
    const r = await fetch(`${API_BASE}/api/v1/channels/${id}/sync`, { method: "POST" })
    return unwrap<SyncResult>(r)
  },

  async listU7BuyOffers(): Promise<U7BuyOffer[]> {
    const r = await fetch(`${API_BASE}/api/v1/u7buy/offers`, { cache: "no-store" })
    const d = await unwrap<{ items: U7BuyOffer[]; total: number }>(r)
    return d.items
  },

  async listWebhookEvents(): Promise<WebhookEvent[]> {
    const r = await fetch(`${API_BASE}/api/v1/webhooks/events`, { cache: "no-store" })
    const d = await unwrap<{ items: WebhookEvent[]; total: number }>(r)
    return d.items
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
