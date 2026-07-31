"use client"

import { useCallback, useEffect, useState } from "react"
import { Bot, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Plus, RefreshCw, Send, ShoppingBag, Trash2, UserRound, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { backend, relativeTime, type AvailableItem, type BackendOrder, type OrderStatus } from "@/lib/api/backend"

const PAGE_SIZE = 10

// Label + warna per kanal asal order
const sourceStyle: Record<string, { label: string; cls: string }> = {
  manual:       { label: "Manual",       cls: "border-slate-500/20 bg-slate-500/10 text-slate-300" },
  google_sheet: { label: "Google Sheet", cls: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" },
  vcgamers:     { label: "VCGamers",     cls: "border-violet-500/20 bg-violet-500/10 text-violet-300" },
  u7buy:        { label: "U7Buy",        cls: "border-sky-500/20 bg-sky-500/10 text-sky-300" },
  itemku:       { label: "Itemku",       cls: "border-pink-500/20 bg-pink-500/10 text-pink-300" },
  g2g:          { label: "G2G",          cls: "border-orange-500/20 bg-orange-500/10 text-orange-300" },
  eldorado:     { label: "Eldorado",     cls: "border-amber-500/20 bg-amber-500/10 text-amber-300" },
  webstore:     { label: "Web Store",    cls: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300" },
}
const srcOf = (s: string) => sourceStyle[s] ?? { label: s || "manual", cls: "border-slate-600 bg-slate-800/70 text-slate-400" }

const statusStyle: Record<OrderStatus, string> = {
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  processing: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
  done: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  partial: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-300",
}

// key gabungan "Category::item_key" untuk mencocokkan pilihan dropdown
const itemId = (i: AvailableItem) => `${i.category}::${i.item_key}`
type ItemRow = { id: string; count: string }

export default function OrdersPage() {
  const [orders, setOrders] = useState<BackendOrder[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<Partial<Record<OrderStatus, number>>>({})
  const [stock, setStock] = useState<AvailableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [recipient, setRecipient] = useState("")
  const [rows, setRows] = useState<ItemRow[]>([{ id: "", count: "1" }])
  const [formErr, setFormErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [o, s] = await Promise.all([backend.listOrders(page, PAGE_SIZE), backend.listItems()])
      setOrders(o.items)
      setTotal(o.total)
      setTotalPages(o.total_pages)
      setCounts(o.counts)
      setStock(s)
      setErr(null)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [load])

  // dari `counts` backend: mencakup SEMUA order, bukan cuma halaman ini
  const count = (s: OrderStatus) => counts[s] ?? 0
  const findStock = (id: string) => stock.find((i) => itemId(i) === id)

  async function submit() {
    setFormErr(null)
    if (!recipient.trim()) { setFormErr("Isi username penerima"); return }

    const chosen = rows.filter((r) => r.id)
    if (chosen.length === 0) { setFormErr("Pilih minimal 1 item"); return }

    // validasi stok sebelum kirim — cegah order menggantung
    const items = []
    for (const r of chosen) {
      const s = findStock(r.id)
      if (!s) { setFormErr("Item tidak lagi tersedia — refresh halaman"); return }
      const qty = Math.max(1, parseInt(r.count) || 1)
      if (qty > s.total) { setFormErr(`Stok ${s.item_key} cuma ${s.total}, diminta ${qty}`); return }
      items.push({ category: s.category, item_key: s.item_key, count: qty })
    }

    try {
      await backend.createOrder(recipient.trim(), items)
      setRecipient("")
      setRows([{ id: "", count: "1" }])
      setShowForm(false)
      setPage(1)
      load()
    } catch (e) {
      setFormErr((e as Error).message)
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-10 text-slate-100">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><Badge variant="outline" className="mb-3 border-indigo-400/20 bg-indigo-500/10 text-indigo-300">Fulfillment · Live</Badge><h1 className="text-3xl font-semibold tracking-tight text-white">Orders</h1><p className="mt-1 text-sm text-slate-500">Order otomatis dirutekan ke bot ber-stok, lalu dikirim dan diverifikasi.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={load} className="border-white/10 bg-white/[0.03] text-slate-300"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button onClick={() => setShowForm((v) => !v)} className="bg-indigo-600 text-white hover:bg-indigo-500"><Plus className="mr-2 h-4 w-4" />New Order</Button></div>
      </header>

      {err && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">Backend tidak terjangkau: {err}</p>}

      {showForm && (
        <Card className="border-indigo-400/20 bg-indigo-500/[0.04]">
          <CardHeader className="flex flex-row items-start justify-between"><div><CardTitle className="text-white">Buat Order</CardTitle><CardDescription className="mt-1 text-slate-400">1 order boleh banyak item — bot memecah otomatis kalau &gt;20.</CardDescription></div><Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button></CardHeader>
          <CardContent className="space-y-3">
            <label className="block space-y-2 text-xs text-slate-400">Recipient (username Roblox)<input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="raynorqt" className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-indigo-400/50" /></label>
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Pilih dari stok bot yang online — penulisan kategori/item otomatis benar.</p>
              {stock.length === 0 && <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">Belum ada stok. Jalankan bot yang punya item dulu.</p>}
              {rows.map((r, i) => {
                const s = findStock(r.id)
                const qty = parseInt(r.count) || 0
                const over = s ? qty > s.total : false
                return (
                  <div key={i} className="grid grid-cols-[2.5fr_0.6fr_auto] gap-2">
                    <select
                      value={r.id}
                      onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, id: e.target.value } : x))}
                      className="h-9 rounded-lg border border-white/10 bg-slate-950 px-2 text-xs text-slate-200 outline-none focus:border-indigo-400/50"
                    >
                      <option value="">— pilih item —</option>
                      {stock.map((it) => (
                        <option key={itemId(it)} value={itemId(it)}>
                          {it.category} / {it.display_name} (stok {it.total})
                        </option>
                      ))}
                    </select>
                    <input
                      value={r.count}
                      onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, count: e.target.value } : x))}
                      placeholder="qty"
                      className={`h-9 rounded-lg border bg-slate-950 px-2 text-xs text-slate-200 outline-none ${over ? "border-rose-500/50" : "border-white/10 focus:border-indigo-400/50"}`}
                    />
                    <Button variant="ghost" size="icon" onClick={() => setRows((rs) => rs.length > 1 ? rs.filter((_, j) => j !== i) : rs)}><Trash2 className="h-4 w-4 text-slate-500" /></Button>
                    {s && <p className={`col-span-3 -mt-1 text-[10px] ${over ? "text-rose-400" : "text-slate-600"}`}>{over ? `⚠ melebihi stok (${s.total})` : `${s.display_name} — tersedia ${s.total} di ${s.bots.join(", ")}`}</p>}
                  </div>
                )
              })}
              <Button variant="outline" size="sm" disabled={stock.length === 0} onClick={() => setRows((rs) => [...rs, { id: "", count: "1" }])} className="border-white/10 bg-white/[0.03] text-slate-300"><Plus className="mr-2 h-3.5 w-3.5" />Tambah item</Button>
            </div>
            {formErr && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{formErr}</p>}
            <Button onClick={submit} className="bg-indigo-600 hover:bg-indigo-500"><Send className="mr-2 h-4 w-4" />Kirim Order</Button>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Total Orders" value={String(total)} detail="semua status" icon={ShoppingBag} color="text-indigo-300" />
        <Summary label="Pending" value={String(count("pending"))} detail="menunggu bot ber-stok" icon={Clock3} color="text-amber-300" />
        <Summary label="Processing" value={String(count("processing"))} detail="sedang dikirim" icon={Send} color="text-cyan-300" />
        <Summary label="Done" value={String(count("done"))} detail="terkirim & terverifikasi" icon={CheckCircle2} color="text-emerald-300" />
      </section>

      <Card className="border-white/10 bg-slate-950/60 shadow-xl shadow-black/10">
        <CardHeader><CardTitle className="text-lg text-white">Fulfillment Queue</CardTitle><CardDescription className="text-slate-500">{total > 0 ? `Menampilkan ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} dari ${total}` : "Belum ada order"} · diperbarui tiap 3 detik</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {orders.length === 0 && !loading && <p className="text-sm text-slate-500">Belum ada order. Klik &quot;New Order&quot; untuk membuat.</p>}
          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:border-indigo-400/20 md:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-sm font-medium text-indigo-300">{order.id.slice(0, 8)}</p><Badge variant="outline" className={statusStyle[order.status]}>{order.status}</Badge><Badge variant="outline" className={srcOf(order.source).cls}>{srcOf(order.source).label}</Badge>{order.error && <span className="text-[10px] text-rose-400/80">{order.error}</span>}</div></div>
                <div className="flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{relativeTime(order.updated_at || order.created_at)}</div>
              </div>
              <div className="mt-5 grid gap-4 border-t border-white/[0.06] pt-5 md:grid-cols-2 xl:grid-cols-[1fr_1.6fr_0.6fr_0.8fr]">
                <Info icon={UserRound} label="Recipient" primary={`@${order.recipient}`} secondary="Roblox mailbox" />
                <Info icon={ShoppingBag} label="Items" primary={order.items.map((i) => `${i.item_key} ×${i.count}`).join(", ")} secondary={`${order.items.length} jenis`} />
                <Info icon={Send} label="Sent" primary={`${order.sent_total}/${order.requested_total}`} secondary="terverifikasi" />
                <Info icon={Bot} label="Assigned Bot" primary={order.assigned_bot ?? "—"} secondary={order.status === "pending" ? "menunggu routing" : "routed"} />
              </div>
            </article>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2 text-sm">
              <Button
                variant="outline" size="sm" disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="border-white/10 bg-white/[0.03] text-slate-300 disabled:opacity-40"
              ><ChevronLeft className="h-4 w-4" /></Button>

              <span className="text-slate-400">
                Total: {total} &nbsp;<span className="text-white">{page}</span> / {totalPages}
              </span>

              <Button
                variant="outline" size="sm" disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="border-white/10 bg-white/[0.03] text-slate-300 disabled:opacity-40"
              ><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Summary({ label, value, detail, icon: Icon, color }: { label: string; value: string; detail: string; icon: typeof Bot; color: string }) { return <Card className="border-white/10 bg-slate-950/60"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm text-slate-400">{label}</p><Icon className={`h-5 w-5 ${color}`} /></div><p className="mt-2 text-3xl font-semibold text-white">{value}</p><p className="mt-1 text-xs text-slate-600">{detail}</p></CardContent></Card> }
function Info({ icon: Icon, label, primary, secondary }: { icon: typeof Bot; label: string; primary: string; secondary: string }) { return <div className="min-w-0"><p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-600"><Icon className="h-3.5 w-3.5" />{label}</p><p className="mt-1.5 truncate text-sm font-medium text-slate-200">{primary}</p><p className="truncate text-xs text-slate-600">{secondary}</p></div> }
