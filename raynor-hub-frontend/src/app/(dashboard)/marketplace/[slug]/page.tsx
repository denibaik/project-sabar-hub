"use client"

import { useParams } from "next/navigation"
import { FileSpreadsheet, Gamepad2, Gem, Globe, Link2, Settings, ShoppingBag, ShoppingCart, Store } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Field = { label: string; placeholder: string }
type Meta = { name: string; icon: typeof Globe; desc: string; fields: Field[] }

const CHANNELS: Record<string, Meta> = {
  itemku: { name: "Itemku", icon: ShoppingBag, desc: "Marketplace game Indonesia. Tarik order berbayar otomatis.", fields: [{ label: "API Key", placeholder: "itemku_live_..." }, { label: "Seller / Store ID", placeholder: "123456" }] },
  g2g: { name: "G2G", icon: Globe, desc: "Marketplace global. Sinkron order dari G2G Seller API.", fields: [{ label: "API Key", placeholder: "g2g_..." }, { label: "Secret", placeholder: "••••••" }] },
  eldorado: { name: "Eldorado", icon: Gem, desc: "Marketplace global untuk item & currency game.", fields: [{ label: "API Key", placeholder: "eld_..." }, { label: "Store ID", placeholder: "store-..." }] },
  u7buy: { name: "U7Buy", icon: Store, desc: "Marketplace game global. Order via U7Buy API.", fields: [{ label: "API Key", placeholder: "u7_..." }, { label: "Merchant ID", placeholder: "m-..." }] },
  vcgamers: { name: "VCGamers", icon: Gamepad2, desc: "Marketplace game Indonesia (VCGamers).", fields: [{ label: "API Key", placeholder: "vcg_..." }, { label: "Store ID", placeholder: "vcg-store-..." }] },
  webstore: { name: "Web Store Sendiri", icon: ShoppingCart, desc: "Toko web milikmu. Order masuk via webhook ke backend.", fields: [{ label: "Webhook URL (diberikan)", placeholder: "http://127.0.0.1:8000/api/v1/orders" }, { label: "Webhook Secret", placeholder: "buat string acak" }] },
  "google-sheet": { name: "Google Sheet Sync", icon: FileSpreadsheet, desc: "Impor order dari Google Sheet (File → Publish to web → CSV). Kolom: recipient, category, item_key, count, order_ref.", fields: [{ label: "Published CSV URL", placeholder: "https://docs.google.com/.../pub?output=csv" }] },
  setup: { name: "Marketplace Setup", icon: Settings, desc: "Pengaturan umum integrasi channel.", fields: [{ label: "Backend Base URL", placeholder: "http://127.0.0.1:8000" }, { label: "Registration Key", placeholder: "dev-registration-key" }] },
}

export default function MarketplaceChannelPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const meta = CHANNELS[slug]

  if (!meta) {
    return <div className="text-slate-400">Channel tidak dikenal: {slug}</div>
  }
  const Icon = meta.icon

  return (
    <div className="mx-auto max-w-3xl space-y-6 text-slate-100">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-indigo-500/15 p-3 text-indigo-300 ring-1 ring-indigo-400/20"><Icon className="h-6 w-6" /></div>
        <div className="flex-1">
          <div className="flex items-center gap-3"><h1 className="text-2xl font-bold tracking-tight text-white">{meta.name}</h1><Badge variant="outline" className="border-slate-600 bg-slate-800/70 text-slate-400">Belum terhubung</Badge></div>
          <p className="mt-1 text-sm text-slate-500">{meta.desc}</p>
        </div>
      </div>

      <Card className="border-white/10 bg-slate-950/60">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base text-white"><Link2 className="h-4 w-4 text-indigo-300" />Koneksi</CardTitle><CardDescription className="text-slate-500">Isi kredensial untuk menyambungkan channel. Integrasi tarik-order menyusul.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {meta.fields.map((f) => (
            <label key={f.label} className="block space-y-2 text-xs text-slate-400">{f.label}
              <input disabled placeholder={f.placeholder} className="h-10 w-full cursor-not-allowed rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-500 outline-none placeholder:text-slate-700" />
            </label>
          ))}
          <div className="flex items-center gap-3 pt-1">
            <Button disabled className="bg-indigo-600/50 text-white/70">Sambungkan (segera hadir)</Button>
            <span className="text-xs text-slate-600">Backend channel API sudah siap — wiring form menyusul.</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-950/40">
        <CardHeader className="pb-3"><CardTitle className="text-sm text-slate-300">Status</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"><p className="text-slate-600">Order hari ini</p><p className="mt-1 text-lg font-semibold text-slate-400">—</p></div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"><p className="text-slate-600">Terakhir sync</p><p className="mt-1 text-lg font-semibold text-slate-400">—</p></div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"><p className="text-slate-600">Koneksi</p><p className="mt-1 text-lg font-semibold text-slate-400">Off</p></div>
        </CardContent>
      </Card>
    </div>
  )
}
