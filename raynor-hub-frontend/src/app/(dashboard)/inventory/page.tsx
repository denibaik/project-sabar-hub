"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Boxes, PackageCheck, RefreshCw, Warehouse } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { backend, type AvailableItem } from "@/lib/api/backend"

const LOW = 5 // ambang low stock

export default function InventoryPage() {
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

  const totalUnits = items.reduce((s, i) => s + i.total, 0)
  const lowStock = items.filter((i) => i.total <= LOW).length

  return (
    <div className="space-y-6 text-slate-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 border-indigo-400/20 bg-indigo-500/10 text-indigo-300">Live Stock</Badge>
          <h1 className="text-3xl font-bold tracking-tight text-white">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">Stok agregat dari semua bot online — sumber yang sama dengan routing order.</p>
        </div>
        <Button variant="outline" onClick={load} className="border-white/10 bg-white/[0.03] text-slate-300"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      {err && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">Backend tidak terjangkau: {err}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat label="Jenis Item" value={String(items.length)} icon={Boxes} color="text-indigo-300" />
        <Stat label="Total Unit" value={totalUnits.toLocaleString("id-ID")} icon={Warehouse} color="text-cyan-300" />
        <Stat label="In Stock" value={String(items.filter((i) => i.total > 0).length)} icon={PackageCheck} color="text-emerald-300" />
        <Stat label="Low Stock" value={String(lowStock)} icon={AlertTriangle} color="text-amber-300" />
      </div>

      <Card className="border-white/10 bg-slate-950/60">
        <CardHeader><CardTitle className="text-lg text-white">Available Stock</CardTitle><CardDescription className="text-slate-500">Diperbarui otomatis tiap 5 detik · low stock ≤ {LOW}</CardDescription></CardHeader>
        <CardContent>
          {items.length === 0 && !loading && <p className="text-sm text-slate-500">Belum ada stok. Jalankan bot ber-stok — inventory-nya muncul di sini.</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500"><th className="py-2 pr-4">Category</th><th className="py-2 pr-4">Item</th><th className="py-2 pr-4 text-right">Stock</th><th className="py-2 pr-4">Bots</th><th className="py-2">Status</th></tr></thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.category + it.item_key} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-4 text-slate-400">{it.category}</td>
                    <td className="py-2.5 pr-4 font-medium text-slate-200">{it.item_key.length > 24 ? it.item_key.slice(0, 8) + "…" : it.item_key}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-slate-200">{it.total.toLocaleString("id-ID")}</td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500">{it.bots.join(", ")}</td>
                    <td className="py-2.5"><Badge variant="outline" className={it.total <= LOW ? "border-amber-500/20 bg-amber-500/10 text-amber-300" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"}>{it.total <= LOW ? "Low" : "In Stock"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof Boxes; color: string }) {
  return <Card className="border-white/10 bg-slate-950/60"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm text-slate-400">{label}</p><Icon className={`h-5 w-5 ${color}`} /></div><p className="mt-2 text-3xl font-bold text-white">{value}</p></CardContent></Card>
}
