import { Bot, CheckCircle2, Clock3, Copy, Filter, MailCheck, PackageCheck, Search, Send, ShoppingBag, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const orders = [
  { id: "SH-20260723-00001", externalId: "TRXOD-1784814004-AE280335-DA81F7EC", channel: "Itemku", customer: "thaniawdha", username: "anonimi621", game: "Grow a Garden 2", item: "Super Watering Can", variant: "Super", quantity: 1, amount: "Rp200", bot: "BOT-03", status: "Delivering", marketplace: "Pending", notification: "Pending", time: "23 Jul 2026 · 20:40:04" },
  { id: "SH-20260723-00002", externalId: "TRXOD-1784813705-89AB0EBC-FC665839", channel: "Itemku", customer: "thaniawdha", username: "anonimi621", game: "Grow a Garden 2", item: "Dragon Breath", variant: null, quantity: 1, amount: "Rp1.900", bot: "BOT-02", status: "Waiting Bot", marketplace: "Pending", notification: "Pending", time: "23 Jul 2026 · 20:35:24" },
  { id: "SH-20260723-00003", externalId: "G2G-882104-7712", channel: "G2G", customer: "gardenbuyer21", username: "RizkyGarden", game: "Grow a Garden 2", item: "Raccoon", variant: "Mythic", quantity: 2, amount: "Rp32.000", bot: "BOT-01", status: "Verifying", marketplace: "Pending", notification: "Pending", time: "23 Jul 2026 · 20:28:11" },
  { id: "SH-20260723-00004", externalId: "WEB-20260723-1048", channel: "Sabar Store", customer: "Deni Saputra", username: "Deni123", game: "Adopt Me", item: "Frost Dragon", variant: null, quantity: 1, amount: "Rp850.000", bot: "BOT-03", status: "Completed", marketplace: "Completed", notification: "Sent", time: "23 Jul 2026 · 20:18:42" },
]

const statusStyle: Record<string, string> = {
  Delivering: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
  "Waiting Bot": "border-amber-500/20 bg-amber-500/10 text-amber-300",
  Verifying: "border-indigo-500/20 bg-indigo-500/10 text-indigo-300",
  Completed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
}

export default function OrdersPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-10 text-slate-100">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><Badge variant="outline" className="mb-3 border-indigo-400/20 bg-indigo-500/10 text-indigo-300">Fulfillment Operations</Badge><h1 className="text-3xl font-semibold tracking-tight text-white">Orders</h1><p className="mt-1 text-sm text-slate-500">Pantau username Roblox, item, quantity, bot assignment, Trade Mail, dan penyelesaian order.</p></div>
        <div className="flex gap-2"><Button variant="outline" className="border-white/10 bg-white/[0.03] text-slate-300"><Filter className="mr-2 h-4 w-4" />Filter</Button><Button variant="outline" className="border-white/10 bg-white/[0.03] text-slate-300"><Search className="mr-2 h-4 w-4" />Search</Button></div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Orders Today" value="42" detail="5 sales channels" icon={ShoppingBag} color="text-indigo-300" />
        <Summary label="Waiting Bot" value="3" detail="Awaiting eligible account" icon={Clock3} color="text-amber-300" />
        <Summary label="Delivering" value="2" detail="Trade Mail in progress" icon={Send} color="text-cyan-300" />
        <Summary label="Completed Today" value="36" detail="98.6% delivery success" icon={CheckCircle2} color="text-emerald-300" />
      </section>

      <Card className="border-white/10 bg-slate-950/60 shadow-xl shadow-black/10">
        <CardHeader><CardTitle className="text-lg text-white">Fulfillment Queue</CardTitle><CardDescription className="text-slate-500">Order berbayar dari marketplace dan personal web store</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {orders.map((order) => <article key={order.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:border-indigo-400/20 hover:bg-indigo-500/[0.025] md:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-sm font-medium text-indigo-300">{order.id}</p><Badge variant="outline" className="border-white/10 bg-white/[0.03] text-[10px] text-slate-400">{order.channel}</Badge><Badge variant="outline" className={statusStyle[order.status]}>{order.status}</Badge></div><p className="mt-2 break-all text-xs text-slate-600">External: {order.externalId}</p></div>
              <div className="flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{order.time}</div>
            </div>

            <div className="mt-5 grid gap-4 border-t border-white/[0.06] pt-5 md:grid-cols-2 xl:grid-cols-[1fr_1.3fr_0.55fr_0.75fr]">
              <Info icon={UserRound} label="Customer" primary={`@${order.username}`} secondary={`${order.customer} · Marketplace account`} copy />
              <Info icon={PackageCheck} label="Product" primary={`${order.item}${order.variant ? ` [${order.variant}]` : ""}`} secondary={order.game} />
              <Info icon={ShoppingBag} label="Quantity / Amount" primary={`× ${order.quantity}`} secondary={order.amount} />
              <Info icon={Bot} label="Assigned Bot" primary={order.bot} secondary={order.status === "Waiting Bot" ? "Assignment pending" : "Heartbeat active"} />
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-white/[0.05] bg-slate-950/50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-4 text-xs"><State label="Trade Mail" value={order.status} ok={order.status === "Completed"} /><State label="Channel Completion" value={order.marketplace} ok={order.marketplace === "Completed"} /><State label="Customer Message" value={order.notification} ok={order.notification === "Sent"} /></div>
              <div className="flex gap-2"><Button variant="outline" size="sm" className="border-white/10 bg-white/[0.03] text-slate-300">View Detail</Button>{order.status !== "Completed" && <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-500">Process Order</Button>}</div>
            </div>
          </article>)}
        </CardContent>
      </Card>
    </div>
  )
}

function Summary({ label, value, detail, icon: Icon, color }: { label: string; value: string; detail: string; icon: typeof Bot; color: string }) { return <Card className="border-white/10 bg-slate-950/60"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-semibold text-white">{value}</p><p className="mt-1 text-xs text-slate-600">{detail}</p></div><div className={`rounded-xl bg-white/[0.04] p-3 ${color}`}><Icon className="h-5 w-5" /></div></CardContent></Card> }
function Info({ icon: Icon, label, primary, secondary, copy }: { icon: typeof Bot; label: string; primary: string; secondary: string; copy?: boolean }) { return <div className="flex min-w-0 gap-3"><div className="mt-0.5 rounded-lg bg-indigo-500/10 p-2 text-indigo-300"><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p><div className="mt-1 flex items-center gap-2"><p className="truncate text-sm font-medium text-slate-200">{primary}</p>{copy && <Copy className="h-3.5 w-3.5 shrink-0 text-slate-600" />}</div><p className="mt-1 truncate text-xs text-slate-500">{secondary}</p></div></div> }
function State({ label, value, ok }: { label: string; value: string; ok: boolean }) { return <div><p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p><p className={`mt-1 flex items-center gap-1.5 font-medium ${ok ? "text-emerald-300" : "text-slate-400"}`}>{ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}{value}</p></div> }
