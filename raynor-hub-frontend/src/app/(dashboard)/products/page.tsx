"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Package, RefreshCw, Tags } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { backend, type AvailableItem } from "@/lib/api/backend"

export default function ProductsPage() {
  const [items, setItems] = useState<AvailableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setItems(await backend.listItems())
      setErr(null)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [load])

  const byCategory = useMemo(() => {
    const m: Record<string, AvailableItem[]> = {}
    for (const it of items) (m[it.category] ??= []).push(it)
    return m
  }, [items])

  return (
    <div className="space-y-6 text-slate-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 border-indigo-400/20 bg-indigo-500/10 text-indigo-300">Sellable Catalog</Badge>
          <h1 className="text-3xl font-bold tracking-tight text-white">Products</h1>
          <p className="mt-1 text-sm text-slate-500">Item yang siap dijual — otomatis dari stok bot online. Kategori = kategori mailbox game.</p>
        </div>
        <Button variant="outline" onClick={load} className="border-white/10 bg-white/[0.03] text-slate-300"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      {err && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">Backend tidak terjangkau: {err}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Jenis Produk" value={String(items.length)} icon={Tags} />
        <Stat label="Kategori" value={String(Object.keys(byCategory).length)} icon={Package} />
        <Stat label="Total Unit" value={items.reduce((s, i) => s + i.total, 0).toLocaleString("id-ID")} icon={Package} />
      </div>

      {items.length === 0 && !loading && <p className="text-sm text-slate-500">Belum ada produk. Stok bot online otomatis jadi katalog di sini.</p>}

      {Object.entries(byCategory).map(([cat, list]) => (
        <Card key={cat} className="border-white/10 bg-slate-950/60">
          <CardHeader className="pb-3"><CardTitle className="text-base text-white">{cat}</CardTitle><CardDescription className="text-slate-500">{list.length} jenis · {list.reduce((s, i) => s + i.total, 0)} unit</CardDescription></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((it) => (
                <div key={it.item_key} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium text-slate-200">{it.display_name}</p>
                    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">{it.total}</Badge>
                  </div>
                  <p className="mt-2 truncate text-xs text-slate-600">di {it.bots.length} bot: {it.bots.join(", ")}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Tags }) {
  return <Card className="border-white/10 bg-slate-950/60"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold text-white">{value}</p></div><div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-300"><Icon className="h-5 w-5" /></div></CardContent></Card>
}
