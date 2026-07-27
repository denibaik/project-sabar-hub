import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Boxes,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Link2,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Store,
  Tags,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const kpis = [
  { label: "Active Bots", value: "6 / 8", detail: "2 accounts need attention", icon: Bot, tone: "emerald" },
  { label: "Open Orders", value: "12", detail: "4 waiting for payment", icon: PackageCheck, tone: "amber" },
  { label: "Products", value: "48", detail: "6 low stock items", icon: Tags, tone: "cyan" },
  { label: "Channel Orders", value: "104", detail: "86 marketplace · 18 web store", icon: Link2, tone: "indigo" },
]

const sales = [
  { label: "Today", value: "Rp 8,4 jt", detail: "42 orders · 86 items" },
  { label: "7 Days", value: "Rp 48,2 jt", detail: "284 orders · 516 items" },
  { label: "30 Days", value: "Rp 186,7 jt", detail: "1.204 orders · 2.138 items" },
  { label: "All Time", value: "Rp 1,28 M", detail: "8.492 orders · 15.804 items" },
]

const salesChannels = [
  { name: "Eldorado", type: "Marketplace", description: "0/2 bots online", orders: "24 orders", revenue: "Rp 7,8 jt", color: "text-cyan-300", bg: "bg-cyan-500/10" },
  { name: "U7Buy", type: "Marketplace", description: "2/2 bots online", orders: "19 orders", revenue: "Rp 5,6 jt", color: "text-indigo-300", bg: "bg-indigo-500/10" },
  { name: "G2G", type: "Marketplace", description: "2/2 bots online", orders: "18 orders", revenue: "Rp 8,2 jt", color: "text-amber-300", bg: "bg-amber-500/10" },
  { name: "Itemku", type: "Marketplace", description: "2/2 bots online", orders: "25 orders", revenue: "Rp 6,8 jt", color: "text-emerald-300", bg: "bg-emerald-500/10" },
  { name: "Sabar Store", type: "Personal Web Store", description: "Connected · Webhook active", orders: "18 orders", revenue: "Rp 4,1 jt", color: "text-violet-300", bg: "bg-violet-500/10" },
]

const orders = [
  { id: "SH-20260720-08412", game: "Adopt Me", item: "Frost Dragon", buyer: "Deni Saputra", status: "Delivered", when: "2 min ago" },
  { id: "SH-20260720-08411", game: "Grow a Garden", item: "Dragonfly", buyer: "Rizky Aditya", status: "Trading", when: "6 min ago" },
  { id: "SH-20260720-08410", game: "Grow a Garden", item: "Raccoon", buyer: "Alvin Pratama", status: "Waiting Payment", when: "11 min ago" },
  { id: "SH-20260720-08409", game: "Pet Simulator 99", item: "Huge Cat", buyer: "Salsa Rahma", status: "Delivered", when: "18 min ago" },
]

const statusStyles: Record<string, string> = {
  Delivered: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  Trading: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  "Waiting Payment": "border-slate-600 bg-slate-800/70 text-slate-300",
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-5 pb-10 text-slate-100">
      <div className="flex items-center gap-3 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 text-sm">
        <AlertTriangle className="h-5 w-5 shrink-0 text-rose-300" />
        <p className="flex-1 text-slate-300"><span className="font-semibold text-rose-200">Some bots are offline</span> — inactive accounts cannot connect or deliver orders.</p>
        <Button variant="outline" size="sm" className="border-rose-400/30 text-rose-200 hover:bg-rose-500/10">View Bot Network</Button>
      </div>

      <header className="flex flex-col gap-4 py-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Welcome back, <span className="text-cyan-300">Sabar Store</span></h1>
          <p className="mt-1 text-sm text-slate-500">Your marketplace and Roblox automation at a glance</p>
        </div>
        <Button variant="outline" className="w-fit border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon
          const tones: Record<string, string> = { emerald: "bg-emerald-500/10 text-emerald-300", amber: "bg-amber-500/10 text-amber-300", cyan: "bg-cyan-500/10 text-cyan-300", indigo: "bg-indigo-500/10 text-indigo-300" }
          return <Card key={item.label} className="border-white/10 bg-slate-950/60 shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:border-cyan-400/20"><CardContent className="flex items-center gap-4 p-5"><div className={`rounded-xl p-3 ${tones[item.tone]}`}><Icon className="h-6 w-6" /></div><div><p className="text-3xl font-semibold tracking-tight text-white">{item.value}</p><p className="text-sm text-slate-400">{item.label}</p><p className="mt-1 text-xs text-slate-600">{item.detail}</p></div></CardContent></Card>
        })}
      </section>

      <Card className="border-white/10 bg-slate-950/60 shadow-xl shadow-black/10">
        <CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2 text-lg text-white"><CircleDollarSign className="h-5 w-5 text-cyan-300" />Sales</CardTitle><p className="mt-1 text-sm text-slate-500">Revenue from delivered marketplace orders</p></div><ArrowUpRight className="h-5 w-5 text-cyan-300" /></CardHeader>
        <CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{sales.map((item) => <div key={item.label} className="rounded-xl border border-white/[0.07] bg-slate-900/60 p-4"><p className="text-xs font-medium uppercase tracking-wider text-slate-600">{item.label}</p><p className="mt-2 text-2xl font-semibold text-white">{item.value}</p><p className="mt-1 text-xs text-slate-500">{item.detail}</p></div>)}</div><div className="flex h-28 items-end gap-2 rounded-xl border border-white/[0.05] bg-gradient-to-t from-cyan-500/[0.06] to-transparent px-4 pb-3 pt-6">{[32, 45, 38, 64, 52, 74, 62, 88, 68, 94, 78, 100, 86, 96].map((height, index) => <div key={index} className="flex-1 rounded-t-sm bg-gradient-to-t from-cyan-500/40 to-indigo-400/70 transition-opacity hover:opacity-80" style={{ height: `${height}%` }} />)}</div><div className="flex justify-between text-[11px] uppercase tracking-wider text-slate-600"><span>Last 14 days</span><span>Jul 7 — Jul 20</span></div></CardContent>
      </Card>

      <section className="space-y-3">
        <div><h2 className="text-lg font-semibold text-white">Sales Channels</h2><p className="mt-1 text-sm text-slate-500">Marketplace dan web store yang terhubung ke Sabar Hub</p></div>
        <div className="grid gap-5 lg:grid-cols-2">
          {salesChannels.map((channel) => <Card key={channel.name} className="border-white/10 bg-slate-950/60 shadow-xl shadow-black/10 transition-all hover:border-cyan-400/20"><CardContent className="flex items-center gap-4 p-5"><div className={`rounded-xl p-3 ${channel.bg} ${channel.color}`}><Store className="h-6 w-6" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-white">{channel.name}</h2><Badge variant="outline" className="border-white/10 bg-white/[0.03] text-[10px] text-slate-500">{channel.type}</Badge></div><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{channel.description}</p><div className="mt-3 flex gap-4 text-xs text-slate-500"><span>{channel.orders}</span><span>{channel.revenue}</span></div></div><ChevronRight className="h-5 w-5 text-slate-600" /></CardContent></Card>)}
        </div>
      </section>

      <Card className="border-white/10 bg-slate-950/60 shadow-xl shadow-black/10">
        <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-lg text-white">Recent Orders</CardTitle><p className="mt-1 text-sm text-slate-500">Latest marketplace order activity</p></div><Button variant="ghost" size="sm" className="text-cyan-300 hover:bg-cyan-500/10">View all <ArrowUpRight className="ml-1 h-4 w-4" /></Button></CardHeader>
        <CardContent><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-slate-600"><th className="px-4 py-3">Ref</th><th className="px-4 py-3">Game / Item</th><th className="px-4 py-3">Buyer</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">When</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.025]"><td className="px-4 py-4 font-mono text-xs text-indigo-300">{order.id}</td><td className="px-4 py-4"><p className="font-medium text-slate-200">{order.game}</p><p className="mt-0.5 text-xs text-slate-500">{order.item}</p></td><td className="px-4 py-4 text-slate-300">{order.buyer}</td><td className="px-4 py-4"><Badge variant="outline" className={statusStyles[order.status]}>{order.status}</Badge></td><td className="px-4 py-4 text-right text-xs text-slate-500">{order.when}</td></tr>)}</tbody></table></div></CardContent>
      </Card>
    </div>
  )
}
