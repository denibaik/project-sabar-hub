"use client"

import { useCallback, useEffect, useState } from "react"
import { Bot, Boxes, CheckCircle2, Clock3, PackageCheck, RefreshCw, Send, Tags } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { backend, relativeTime, type AvailableItem, type BackendBot, type BackendOrder, type OrderStatus } from "@/lib/api/backend"

const statusStyle: Record<OrderStatus, string> = {
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  processing: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
  done: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  partial: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-300",
}

export default function DashboardPage() {
  const [bots, setBots] = useState<BackendBot[]>([])
  const [orders, setOrders] = useState<BackendOrder[]>([])
  const [items, setItems] = useState<AvailableItem[]>([])
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [b, o, i] = await Promise.all([backend.listBots(), backend.listOrders(), backend.listItems()])
      setBots(b); setOrders(o); setItems(i); setErr(null)
    } catch (e) {
      setErr((e as Error).message)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [load])

  const online = bots.filter((b) => b.status === "online").length
  const open = orders.filter((o) => o.status === "pending" || o.status === "processing").length
  const done = orders.filter((o) => o.status === "done").length
  const failed = orders.filter((o) => o.status === "failed").length
  const totalUnits = items.reduce((s, i) => s + i.total, 0)
  const recent = orders.slice(0, 6)

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 text-slate-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 border-indigo-400/20 bg-indigo-500/10 text-indigo-300">Overview · Live</Badge>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Ringkasan real-time dari backend: bot, order, dan stok.</p>
        </div>
        <Button variant="outline" onClick={load} className="border-white/10 bg-white/[0.03] text-slate-300"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      {err && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">Backend tidak terjangkau: {err}</p>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Bot Online" value={`${online} / ${bots.length}`} detail={`${bots.length - online} offline`} icon={Bot} color="text-emerald-300" />
        <Kpi label="Order Aktif" value={String(open)} detail="pending + processing" icon={PackageCheck} color="text-amber-300" />
        <Kpi label="Order Selesai" value={String(done)} detail={`${failed} gagal`} icon={CheckCircle2} color="text-emerald-300" />
        <Kpi label="Stok (unit)" value={totalUnits.toLocaleString("id-ID")} detail={`${items.length} jenis item`} icon={Boxes} color="text-cyan-300" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="border-white/10 bg-slate-950/60">
          <CardHeader><CardTitle className="text-lg text-white">Order Terbaru</CardTitle><CardDescription className="text-slate-500">6 order terakhir</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {recent.length === 0 && <p className="text-sm text-slate-500">Belum ada order.</p>}
            {recent.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><p className="font-mono text-xs text-indigo-300">{o.id.slice(0, 8)}</p><Badge variant="outline" className={statusStyle[o.status]}>{o.status}</Badge></div>
                  <p className="mt-1 truncate text-xs text-slate-400">@{o.recipient} · {o.items.map((i) => `${i.item_key}×${i.count}`).join(", ")}</p>
                </div>
                <div className="shrink-0 text-right"><p className="text-sm font-medium text-slate-200">{o.sent_total}/{o.requested_total}</p><p className="text-[10px] text-slate-600">{relativeTime(o.updated_at || o.created_at)}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-950/60">
          <CardHeader><CardTitle className="text-lg text-white">Bot Status</CardTitle><CardDescription className="text-slate-500">Heartbeat real-time</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {bots.length === 0 && <p className="text-sm text-slate-500">Belum ada bot.</p>}
            {bots.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center gap-2 min-w-0"><span className={`h-2 w-2 shrink-0 rounded-full ${b.status === "online" ? "bg-emerald-400" : "bg-rose-400"}`} /><p className="truncate text-sm text-slate-200">@{b.username}</p></div>
                <p className="shrink-0 text-[10px] text-slate-600">{relativeTime(b.last_heartbeat_at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Kpi({ label, value, detail, icon: Icon, color }: { label: string; value: string; detail: string; icon: typeof Bot; color: string }) {
  return <Card className="border-white/10 bg-slate-950/60"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm text-slate-400">{label}</p><Icon className={`h-5 w-5 ${color}`} /></div><p className="mt-2 text-3xl font-bold text-white">{value}</p><p className="mt-1 text-xs text-slate-600">{detail}</p></CardContent></Card>
}
