"use client"

import { useCallback, useEffect, useState } from "react"
import { Plug, Plus, RefreshCw, Save, Store, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  backend, relativeTime,
  type BackendChannel, type U7BuyProduct, type WebhookEvent,
} from "@/lib/api/backend"

/** Satu baris peta, dengan productId dibawa serta agar bisa diedit. */
type Baris = U7BuyProduct & { productId: string }

const BARIS_KOSONG: Baris = { productId: "", category: "", item_key: "", per_unit: 1 }

const gayaStatus: Record<string, string> = {
  processed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  received: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  ignored: "border-slate-600 bg-slate-800/70 text-slate-400",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-300",
}

function keBaris(peta: Record<string, U7BuyProduct>): Baris[] {
  return Object.entries(peta).map(([productId, p]) => ({ productId, ...p }))
}

function kePeta(baris: Baris[]): Record<string, U7BuyProduct> {
  const keluar: Record<string, U7BuyProduct> = {}
  for (const b of baris) {
    const id = b.productId.trim()
    if (!id) continue
    keluar[id] = {
      category: b.category.trim(),
      item_key: b.item_key.trim(),
      per_unit: Math.max(1, Number(b.per_unit) || 1),
      ...(b._produk ? { _produk: b._produk } : {}),
    }
  }
  return keluar
}

export default function U7BuyPage() {
  const [channel, setChannel] = useState<BackendChannel | null>(null)
  const [baris, setBaris] = useState<Baris[]>([])
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [daftar, ev] = await Promise.all([
        backend.listChannels(),
        backend.listWebhookEvents().catch(() => [] as WebhookEvent[]),
      ])
      const ch = daftar.find((c) => c.type === "u7buy") ?? null
      setChannel(ch)
      if (ch) {
        const peta = (ch.config?.product_map ?? {}) as Record<string, U7BuyProduct>
        setBaris(keBaris(peta))
      }
      setEvents(ev.filter((e) => e.source === "u7buy"))
      setErr(null)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Setelah kegagalan, samakan lagi channel dengan keadaan server — tanpa
  // menghapus pesan error atau isian yang sedang diketik.
  const resync = useCallback(async () => {
    try {
      const daftar = await backend.listChannels()
      setChannel(daftar.find((c) => c.type === "u7buy") ?? null)
    } catch { /* pesan aslinya lebih berguna */ }
  }, [])

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label); setErr(null); setPesan(null)
    try { await fn() } catch (e) { setErr((e as Error).message); await resync() } finally { setBusy(null) }
  }

  const connect = () => run("connect", async () => {
    await backend.createChannel("u7buy", "U7Buy", { product_map: {} })
    await load()
  })

  const simpan = () => run("save", async () => {
    if (!channel) return
    const peta = kePeta(baris)
    await backend.updateChannel(channel.id, { config: { product_map: peta }, enabled: true })
    setPesan(`${Object.keys(peta).length} produk tersimpan.`)
    await load()
  })

  const hapusChannel = () => run("remove", async () => {
    if (!channel) return
    if (!window.confirm("Hapus koneksi U7Buy? Peta produknya ikut terhapus.")) return
    await backend.deleteChannel(channel.id)
    setChannel(null); setBaris([])
    await load()
  })

  const ubah = (i: number, patch: Partial<Baris>) =>
    setBaris((b) => b.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const belumLengkap = baris.some((b) => b.productId.trim() && (!b.category.trim() || !b.item_key.trim()))

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-slate-100">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300 ring-1 ring-emerald-400/20">
          <Store className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">U7Buy</h1>
            <Badge variant="outline" className={channel?.enabled
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-slate-600 bg-slate-800/70 text-slate-400"}>
              {channel ? (channel.enabled ? "Aktif" : "Belum aktif") : "Belum terhubung"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Order dari U7Buy masuk lewat webhook, lalu diterjemahkan menjadi order di antrean.
          </p>
        </div>
      </div>

      {err && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{err}</p>}
      {pesan && <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{pesan}</p>}

      {/* ---- peta produk ---- */}
      <Card className="border-white/10 bg-slate-950/60">
        <CardHeader>
          <CardTitle className="text-base text-white">Pemetaan produk</CardTitle>
          <CardDescription className="text-slate-500">
            Nama produk U7Buy tidak bisa dipakai langsung. Order dengan produk yang
            belum ada di sini <span className="text-slate-300">tidak diproses</span> —
            ditandai agar kamu tangani manual, bukan ditebak.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!channel ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Belum ada koneksi U7Buy.</p>
              <Button onClick={connect} disabled={busy !== null} className="bg-emerald-600 text-white hover:bg-emerald-500">
                <Plug className="mr-2 h-4 w-4" />{busy === "connect" ? "Menghubungkan…" : "Sambungkan"}
              </Button>
            </div>
          ) : (
            <>
              <div className="hidden gap-2 px-1 text-[11px] uppercase tracking-wide text-slate-600 sm:grid sm:grid-cols-[1.4fr_1fr_1.2fr_70px_36px]">
                <span>Product ID</span><span>Category</span><span>Item key</span><span>Per unit</span><span />
              </div>

              {baris.length === 0 && (
                <p className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-4 text-center text-xs text-slate-500">
                  Belum ada produk. Tambahkan baris, atau jalankan{" "}
                  <code className="text-slate-400">scripts/u7buy_products.py</code> untuk melihat
                  produk yang pernah terjual.
                </p>
              )}

              {baris.map((b, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1.2fr_70px_36px]">
                  <input value={b.productId} onChange={(e) => ubah(i, { productId: e.target.value })}
                    placeholder="2066975692396105730" spellCheck={false}
                    className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 font-mono text-xs text-slate-200 outline-none focus:border-emerald-500/40" />
                  <input value={b.category} onChange={(e) => ubah(i, { category: e.target.value })}
                    placeholder="Trowels" spellCheck={false}
                    className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500/40" />
                  <input value={b.item_key} onChange={(e) => ubah(i, { item_key: e.target.value })}
                    placeholder="Trowel" spellCheck={false}
                    className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500/40" />
                  <input value={b.per_unit} onChange={(e) => ubah(i, { per_unit: Number(e.target.value) })}
                    type="number" min={1}
                    className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500/40" />
                  <button onClick={() => setBaris((r) => r.filter((_, j) => j !== i))}
                    title="Hapus baris"
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2 text-slate-500 hover:text-rose-300">
                    <Trash2 className="mx-auto h-4 w-4" />
                  </button>
                  {b._produk && (
                    <p className="col-span-full -mt-1 px-1 text-[11px] text-slate-600">{b._produk}</p>
                  )}
                </div>
              ))}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button onClick={() => setBaris((b) => [...b, { ...BARIS_KOSONG }])}
                  variant="outline" className="border-white/10 bg-white/[0.03] text-slate-300">
                  <Plus className="mr-2 h-4 w-4" />Tambah produk
                </Button>
                <Button onClick={simpan} disabled={busy !== null || belumLengkap}
                  className="bg-emerald-600 text-white hover:bg-emerald-500">
                  <Save className="mr-2 h-4 w-4" />{busy === "save" ? "Menyimpan…" : "Simpan"}
                </Button>
                <Button onClick={hapusChannel} disabled={busy !== null}
                  variant="outline" className="border-white/10 bg-white/[0.03] text-slate-400">
                  <Trash2 className="mr-2 h-4 w-4" />Hapus koneksi
                </Button>
              </div>

              {belumLengkap && (
                <p className="text-xs text-amber-400/80">
                  Ada baris yang product ID-nya terisi tapi category atau item key masih kosong.
                </p>
              )}
              <p className="text-xs text-slate-600">
                <span className="text-slate-500">Per unit</span> = berapa buah item untuk satu unit
                yang dibeli. Produk &quot;150x Trowel&quot; berarti 150 — salah mengisinya membuat
                pembeli menerima 1 dari 150 yang dibayarnya.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* ---- riwayat webhook ---- */}
      <Card className="border-white/10 bg-slate-950/60">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base text-white">Notifikasi masuk</CardTitle>
            <CardDescription className="text-slate-500">
              Nasib tiap notifikasi dari U7Buy, beserta alasannya bila tidak diproses.
            </CardDescription>
          </div>
          <Button onClick={() => run("refresh", load)} disabled={busy !== null}
            variant="outline" className="border-white/10 bg-white/[0.03] text-slate-300">
            <RefreshCw className={`mr-2 h-4 w-4 ${busy === "refresh" ? "animate-spin" : ""}`} />Muat ulang
          </Button>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="py-3 text-xs text-slate-600">
              Belum ada notifikasi. Arahkan webhook U7Buy ke{" "}
              <code className="text-slate-400">/api/v1/webhooks/u7buy</code> pada domain API-mu.
            </p>
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <div key={e.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={gayaStatus[e.status] ?? gayaStatus.ignored}>
                      {e.status}
                    </Badge>
                    <span className="text-xs text-slate-300">{e.event}</span>
                    <span className="font-mono text-[11px] text-slate-600">{e.dedupe_key}</span>
                    <span className="ml-auto text-[11px] text-slate-600">{relativeTime(e.received_at)}</span>
                  </div>
                  {e.error && <p className="mt-1 text-[11px] text-amber-400/80">{e.error}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {loading && <p className="text-xs text-slate-600">memuat…</p>}
    </div>
  )
}
