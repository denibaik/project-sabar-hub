import { AlertTriangle, Bot, CheckCircle2, ClipboardList, Rocket, Server, Settings } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SetupPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 text-slate-100">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-indigo-500/15 p-3 text-indigo-300 ring-1 ring-indigo-400/20"><Settings className="h-6 w-6" /></div>
        <div>
          <div className="flex items-center gap-3"><h1 className="text-2xl font-bold tracking-tight text-white">Setup &amp; Cara Pakai</h1><Badge variant="outline" className="border-indigo-400/20 bg-indigo-500/10 text-indigo-300">Panduan</Badge></div>
          <p className="mt-1 text-sm text-slate-500">Langkah menjalankan Sabar Hub dari nol sampai order terkirim otomatis.</p>
        </div>
      </div>

      <Card className="border-white/10 bg-slate-950/60">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base text-white"><Rocket className="h-4 w-4 text-indigo-300" />1. Jalankan 3 proses</CardTitle><CardDescription className="text-slate-500">Backend, frontend, dan bot harus hidup bersamaan.</CardDescription></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Step n="a" title="Backend (FastAPI)">
            <Pre>{`cd raynor-hub-backend
./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000 --reload`}</Pre>
            <p className="text-slate-500">Cek: buka <Code>http://127.0.0.1:8000/docs</Code></p>
          </Step>
          <Step n="b" title="Frontend (Next.js)">
            <Pre>{`cd raynor-hub-frontend
npm run dev`}</Pre>
            <p className="text-slate-500">Buka dashboard di <Code>http://localhost:3000</Code></p>
          </Step>
          <Step n="c" title="Bot (di executor Roblox)">
            <p className="text-slate-400">Jalankan <Code>RaynorHubBot.lua</Code> di akun bot yang sudah masuk game. Bot auto-register &amp; mulai heartbeat.</p>
          </Step>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-950/60">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base text-white"><Bot className="h-4 w-4 text-emerald-300" />2. Siapkan akun bot</CardTitle><CardDescription className="text-slate-500">Syarat agar bot bisa mengirim gift.</CardDescription></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Check>Akun sudah <b>menyelesaikan tutorial</b> game (gifting diblokir selama tutorial).</Check>
          <Check>Akun punya <b>stok item</b> yang sah (hasil main, bukan inject client-side).</Check>
          <Check>Jalankan bot di tiap akun — <b>BOT_ID otomatis</b> dari username, jadi unik.</Check>
          <Check>Bot online akan muncul di halaman <Code>Bot Network</Code> dengan heartbeat hidup.</Check>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-950/60">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base text-white"><ClipboardList className="h-4 w-4 text-cyan-300" />3. Buat &amp; pantau order</CardTitle><CardDescription className="text-slate-500">Alur fulfillment otomatis.</CardDescription></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Ol items={[
            <>Buka halaman <Code>Orders</Code> → <b>New Order</b>. Isi <i>recipient</i> (username Roblox) + item (category, item_key, qty). Satu order boleh banyak item.</>,
            <>Backend meng-antre order dan <b>merutekannya ke bot yang punya stoknya</b> (bot kosong dilewati).</>,
            <>Bot claim → kirim gift → <b>verifikasi inventory turun</b> → lapor. Status: <span className="text-amber-300">pending</span> → <span className="text-cyan-300">processing</span> → <span className="text-emerald-300">done</span>.</>,
            <>Pantau real-time di <Code>Dashboard</Code>, <Code>Orders</Code>, dan stok di <Code>Inventory</Code>.</>,
          ]} />
        </CardContent>
      </Card>

      <Card className="border-amber-500/20 bg-amber-500/[0.04]">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base text-amber-200"><AlertTriangle className="h-4 w-4" />Catatan penting</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-300">
          <Bullet><b>Tutorial wajib selesai</b> — kalau belum, server menolak dengan "You can't gift during the tutorial".</Bullet>
          <Bullet><b>Cooldown ~8 detik</b> antar gift. Bot menghormatinya otomatis (jeda ~10 detik).</Bullet>
          <Bullet><b>Maks 20 item</b> distinct per pengiriman — order lebih besar dipecah otomatis oleh bot.</Bullet>
          <Bullet><b>Category &amp; item_key</b> harus sama persis dengan katalog game (case-sensitive), mis. <Code>Sprinklers</Code> / <Code>Super Sprinkler</Code>.</Bullet>
          <Bullet>Kolom <Code>Marketplace</Code> di sidebar (Itemku, G2G, dll) untuk sumber order — koneksinya menyusul.</Bullet>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-950/40">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm text-slate-300"><Server className="h-4 w-4 text-slate-400" />Endpoint utama</CardTitle></CardHeader>
        <CardContent><Pre>{`POST /api/v1/bots            register bot (X-Registration-Key)
POST /api/v1/bots/heartbeat  heartbeat + inventory (Bearer)
POST /api/v1/orders          buat order (X-Registration-Key)
GET  /api/v1/orders          list order
GET  /api/v1/items           stok agregat bot online
Docs interaktif: http://127.0.0.1:8000/docs`}</Pre></CardContent>
      </Card>
    </div>
  )
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="mb-2 flex items-center gap-2 font-medium text-slate-200"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-[11px] text-indigo-300">{n}</span>{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
function Pre({ children }: { children: React.ReactNode }) {
  return <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-300 ring-1 ring-white/[0.06]">{children}</pre>
}
function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[12px] text-indigo-300">{children}</code>
}
function Check({ children }: { children: React.ReactNode }) {
  return <p className="flex items-start gap-2 text-slate-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />{children}</p>
}
function Bullet({ children }: { children: React.ReactNode }) {
  return <p className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />{children}</p>
}
function Ol({ items }: { items: React.ReactNode[] }) {
  return <ol className="space-y-2">{items.map((it, i) => <li key={i} className="flex items-start gap-2 text-slate-300"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-[11px] text-cyan-300">{i + 1}</span><span>{it}</span></li>)}</ol>
}
