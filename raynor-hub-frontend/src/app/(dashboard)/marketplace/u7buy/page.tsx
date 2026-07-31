"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, Plug, Plus, RefreshCw, Save, Scale, Store, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  backend, relativeTime,
  type BackendChannel, type U7BuyProduct, type U7BuyStockPlan, type WebhookEvent,
} from "@/lib/api/backend"

/** Satu baris peta, dengan productId dibawa serta agar bisa diedit. */
type Baris = U7BuyProduct & { productId: string }

const BARIS_KOSONG: Baris = { productId: "", category: "", item_key: "", per_unit: 1 }

const gayaAksi: Record<string, string> = {
  sesuai:    "border-slate-600 bg-slate-800/70 text-slate-500",
  naikkan:   "border-sky-500/20 bg-sky-500/10 text-sky-300",
  turunkan:  "border-amber-500/20 bg-amber-500/10 text-amber-300",
  kosongkan: "border-rose-500/20 bg-rose-500/10 text-rose-300",
}

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
  const [rencana, setRencana] = useState<U7BuyStockPlan | null>(null)

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

  // Tarik katalog listing dari U7Buy dan tambahkan yang belum ada.
  //
  // Baris yang sudah kamu isi TIDAK disentuh: usulan otomatis hanya menebak dari
  // nama listing, sedangkan isian manualmu bisa jadi hasil pemeriksaan ke
  // katalog game. Menimpanya akan menghapus pekerjaan yang lebih tepat.
  const tarik = () => run("fetch", async () => {
    const offers = await backend.listU7BuyOffers()
    let ditambah = 0
    setBaris((lama) => {
      const ada = new Set(lama.map((b) => b.productId.trim()))
      const baru = offers
        .filter((o) => !ada.has(o.product_id))
        .map((o) => {
          ditambah++
          return {
            productId: o.product_id,
            category: o.category,
            item_key: o.item_key,
            per_unit: o.per_unit,
            _produk: `${o.name} · stok ${o.stock ?? "?"}${o.on_sale ? "" : " · nonaktif"}`,
          }
        })
      return [...lama, ...baru]
    })
    const perlu = offers.filter((o) => !o.category).length
    setPesan(
      `${offers.length} listing ditemukan, ${ditambah} ditambahkan.` +
      (perlu ? ` ${perlu} belum bisa ditebak kategorinya — isi sendiri sebelum menyimpan.` : "") +
      " Belum tersimpan sampai kamu menekan Simpan."
    )
  })

  const periksaStok = () => run("stock", async () => {
    const p = await backend.u7buyStockPlan()
    setRencana(p)
    setPesan(p.mismatched === 0
      ? "Semua listing sudah sesuai dengan stok bot."
      : `${p.mismatched} dari ${p.total} listing tidak sesuai. Belum ada yang diubah.`)
  })

  const terapkanStok = () => run("apply", async () => {
    if (!window.confirm("Tulis stok bot ke listing U7Buy? Ini mengubah listing sungguhan.")) return
    const h = await backend.u7buyStockSync()
    setPesan(`${h.updated} listing diperbarui.` +
      (h.failed.length ? ` ${h.failed.length} gagal — lihat log backend.` : ""))
    setRencana(await backend.u7buyStockPlan())
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
                  Belum ada produk. Tekan <span className="text-slate-400">Tarik dari U7Buy</span>{" "}
                  di bawah untuk mengambil seluruh listing-mu beserta usulan pemetaannya.
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
                <Button onClick={tarik} disabled={busy !== null}
                  variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                  <Download className={`mr-2 h-4 w-4 ${busy === "fetch" ? "animate-pulse" : ""}`} />
                  {busy === "fetch" ? "Menarik…" : "Tarik dari U7Buy"}
                </Button>
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

      {/* ---- perbandingan stok ---- */}
      <Card className="border-white/10 bg-slate-950/60">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base text-white">Stok listing vs stok bot</CardTitle>
            <CardDescription className="text-slate-500">
              Angka stok di U7Buy adalah yang <span className="text-slate-300">kamu ketik</span>,
              bukan yang benar-benar dipegang bot. Selisihnya baru ketahuan saat ada
              yang membeli — dan saat itu pembeli sudah membayar.
            </CardDescription>
          </div>
          <Button onClick={periksaStok} disabled={busy !== null || !channel}
            variant="outline" className="border-white/10 bg-white/[0.03] text-slate-300">
            <Scale className={`mr-2 h-4 w-4 ${busy === "stock" ? "animate-pulse" : ""}`} />
            {busy === "stock" ? "Memeriksa…" : "Periksa stok"}
          </Button>
        </CardHeader>
        <CardContent>
          {!rencana ? (
            <p className="py-2 text-xs text-slate-600">
              Tekan &quot;Periksa stok&quot; untuk membandingkan. Hanya membaca — tidak ada
              yang diubah di marketplace.
            </p>
          ) : rencana.items.length === 0 ? (
            <p className="py-2 text-xs text-slate-600">
              Belum ada listing yang terpetakan untuk dibandingkan.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-xs">
                  <thead className="text-[11px] uppercase tracking-wide text-slate-600">
                    <tr className="border-b border-white/5">
                      <th className="py-2 text-left font-medium">Listing</th>
                      <th className="py-2 text-right font-medium">Stok bot</th>
                      <th className="py-2 text-right font-medium">Tertulis</th>
                      <th className="py-2 text-right font-medium">Seharusnya</th>
                      <th className="py-2 text-right font-medium">Terjual</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {rencana.items.map((r) => (
                      <tr key={r.product_id} className="border-b border-white/5 last:border-0">
                        <td className="py-2 pr-3">
                          <span className="text-slate-200">{r.name.split("|")[0].trim()}</span>
                          <Badge variant="outline" className={`ml-2 ${gayaAksi[r.action]}`}>
                            {r.action}
                          </Badge>
                          {r.per_unit > 1 && (
                            <span className="ml-2 text-slate-600">{r.per_unit}/unit</span>
                          )}
                        </td>
                        <td className="py-2 text-right text-slate-400">{r.bot_stock}</td>
                        <td className="py-2 text-right text-slate-400">{r.listed}</td>
                        <td className={`py-2 text-right ${r.action === "sesuai" ? "text-slate-400" : "text-white"}`}>
                          {r.should_be}
                        </td>
                        <td className="py-2 text-right text-slate-600">{r.sold ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rencana.mismatched === 0 ? (
                <p className="pt-1 text-xs text-emerald-400/80">Semua listing sudah sesuai.</p>
              ) : rencana.can_apply ? (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button onClick={terapkanStok} disabled={busy !== null}
                    className="bg-emerald-600 text-white hover:bg-emerald-500">
                    <Scale className="mr-2 h-4 w-4" />
                    {busy === "apply" ? "Menerapkan…" : `Terapkan ke ${rencana.mismatched} listing`}
                  </Button>
                  <span className="text-xs text-amber-400/80">
                    Ini mengubah listing sungguhan di U7Buy.
                  </span>
                </div>
              ) : (
                <p className="pt-1 text-xs text-amber-400/80">
                  {rencana.mismatched} listing tidak sesuai. Penerapan otomatis masih mati —
                  nyalakan <code className="text-slate-400">U7BUY_STOCK_SYNC_ENABLED</code> di
                  <code className="text-slate-400"> .env</code> backend lalu restart. Sampai itu,
                  perbaiki sendiri di portal U7Buy memakai kolom &quot;Seharusnya&quot;.
                </p>
              )}
            </div>
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
