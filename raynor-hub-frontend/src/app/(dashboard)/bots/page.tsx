"use client"

import { useState } from "react"
import { Activity, Bot, Box, CheckCircle2, Clock3, Gamepad2, KeyRound, Plus, Radio, RefreshCw, Server, ShieldCheck, Signal, Users, WifiOff, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type BotStatus = "Idle" | "Trading" | "Offline" | "Maintenance"
type BotAccount = { id: string; name: string; username: string; status: BotStatus; game: string; server: string; ping: number; inventory: number; task: string; successRate: number; lastHeartbeat: string; token?: string }

const initialBots: BotAccount[] = [
  { id: "BOT-01", name: "Sabar Delivery 01", username: "Sabar_Garden01", status: "Idle", game: "Grow a Garden", server: "SG-1842", ping: 42, inventory: 215, task: "Menunggu order", successRate: 99.4, lastHeartbeat: "8 detik lalu" },
  { id: "BOT-02", name: "Sabar Delivery 02", username: "Sabar_Trade02", status: "Trading", game: "Grow a Garden", server: "SG-2107", ping: 68, inventory: 84, task: "Order SH-2103 · Dragonfly", successRate: 98.8, lastHeartbeat: "3 detik lalu" },
  { id: "BOT-03", name: "Sabar AdoptMe 01", username: "Sabar_Adopt03", status: "Idle", game: "Adopt Me", server: "US-7741", ping: 31, inventory: 192, task: "Menunggu order", successRate: 99.7, lastHeartbeat: "5 detik lalu" },
  { id: "BOT-04", name: "Sabar Pets 01", username: "Sabar_Pets04", status: "Offline", game: "Pet Simulator 99", server: "—", ping: 0, inventory: 126, task: "Koneksi terputus", successRate: 96.2, lastHeartbeat: "18 menit lalu" },
]

const statusStyle: Record<BotStatus, string> = {
  Idle: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  Trading: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  Offline: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  Maintenance: "border-slate-600 bg-slate-800/70 text-slate-300",
}

export default function BotsPage() {
  const [bots, setBots] = useState(initialBots)
  const [showRegistration, setShowRegistration] = useState(false)
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [game, setGame] = useState("Grow a Garden")
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)

  const activeBots = bots.filter((bot) => bot.status === "Idle" || bot.status === "Trading").length
  const tradingBots = bots.filter((bot) => bot.status === "Trading").length
  const totalInventory = bots.reduce((total, bot) => total + bot.inventory, 0)

  function registerBot() {
    if (!name.trim() || !username.trim()) return
    const id = `BOT-${String(bots.length + 1).padStart(2, "0")}`
    const token = `sbr_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`
    setBots((current) => [...current, { id, name, username, game, status: "Offline", server: "—", ping: 0, inventory: 0, task: "Menunggu koneksi pertama", successRate: 100, lastHeartbeat: "Belum pernah", token }])
    setGeneratedToken(token)
    setName("")
    setUsername("")
  }

  function simulateHeartbeat(id: string) {
    setBots((current) => current.map((bot) => bot.id === id ? { ...bot, status: "Idle", server: `SG-${Math.floor(1000 + Math.random() * 8000)}`, ping: Math.floor(28 + Math.random() * 45), task: "Menunggu order", lastHeartbeat: "Baru saja" } : bot))
  }

  function refreshHeartbeats() {
    setBots((current) => current.map((bot) => bot.status === "Idle" || bot.status === "Trading" ? { ...bot, lastHeartbeat: "Baru saja", ping: Math.max(20, bot.ping + Math.floor(Math.random() * 7) - 3) } : bot))
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-10 text-slate-100">
      <section className="rounded-2xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/20 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-indigo-500/15 p-3 text-indigo-300 ring-1 ring-indigo-400/20"><Bot className="h-6 w-6" /></div><Badge variant="outline" className="border-indigo-400/20 bg-indigo-500/10 text-indigo-300">Roblox Operations</Badge></div><h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Roblox Bot Network</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Daftarkan akun Roblox, pantau heartbeat, inventory, latency, dan aktivitas trade otomatis.</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={refreshHeartbeats} className="border-white/10 bg-white/[0.03] text-slate-300"><RefreshCw className="mr-2 h-4 w-4" />Refresh heartbeat</Button><Button onClick={() => setShowRegistration(true)} className="bg-indigo-600 text-white hover:bg-indigo-500"><Plus className="mr-2 h-4 w-4" />Register Bot</Button></div>
        </div>
      </section>

      {showRegistration && <Card className="border-indigo-400/20 bg-indigo-500/[0.04] shadow-xl"><CardHeader className="flex flex-row items-start justify-between"><div><CardTitle className="text-white">Register Roblox Bot</CardTitle><CardDescription className="mt-1 text-slate-400">Buat identitas bot dan mock token untuk script Roblox.</CardDescription></div><Button variant="ghost" size="icon" onClick={() => { setShowRegistration(false); setGeneratedToken(null) }}><X className="h-4 w-4" /></Button></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-3"><Field label="Bot Name" value={name} placeholder="Sabar Garden 04" onChange={setName} /><Field label="Roblox Username" value={username} placeholder="Sabar_Garden04" onChange={setUsername} /><label className="space-y-2 text-xs text-slate-400">Game<select value={game} onChange={(event) => setGame(event.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-indigo-400/50"><option>Grow a Garden</option><option>Adopt Me</option><option>Pet Simulator 99</option></select></label></div><Button onClick={registerBot} disabled={!name.trim() || !username.trim()} className="bg-indigo-600 hover:bg-indigo-500"><KeyRound className="mr-2 h-4 w-4" />Generate Bot Token</Button>{generatedToken && <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4"><p className="text-xs font-medium text-amber-200">Token dibuat — tampilkan hanya sekali</p><code className="mt-2 block break-all rounded-lg bg-slate-950 p-3 text-sm text-amber-300">{generatedToken}</code><p className="mt-2 text-xs text-slate-500">Pasang token pada script bot, lalu gunakan tombol Simulate Connect untuk demo heartbeat pertama.</p></div>}</CardContent></Card>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Registered Accounts" value={String(bots.length)} icon={Users} /><Summary label="Active Accounts" value={`${activeBots}/${bots.length}`} icon={Activity} /><Summary label="Currently Trading" value={String(tradingBots)} icon={Radio} /><Summary label="Network Inventory" value={totalInventory.toLocaleString("id-ID")} icon={Box} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {bots.map((bot) => { const connected = bot.status === "Idle" || bot.status === "Trading"; return <Card key={bot.id} className="border-white/10 bg-slate-950/60 shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:border-indigo-400/25"><CardHeader className="flex flex-row items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><div className={`rounded-xl p-3 ${connected ? "bg-indigo-500/10 text-indigo-300" : "bg-slate-800 text-slate-500"}`}><Gamepad2 className="h-5 w-5" /></div><div className="min-w-0"><CardTitle className="truncate text-base text-white">{bot.name}</CardTitle><CardDescription className="mt-1 text-xs text-slate-500">@{bot.username} · {bot.id}</CardDescription></div></div><Badge variant="outline" className={statusStyle[bot.status]}>{bot.status}</Badge></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-2"><Metric icon={Gamepad2} label="Game" value={bot.game} /><Metric icon={Server} label="Server" value={bot.server} /><Metric icon={Signal} label="Ping" value={bot.ping ? `${bot.ping} ms` : "Unavailable"} /><Metric icon={Box} label="Inventory" value={`${bot.inventory} items`} /></div><div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><p className="text-[11px] uppercase tracking-wider text-slate-600">Current Task</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-300">{connected ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <WifiOff className="h-4 w-4 text-rose-300" />}{bot.task}</p></div><div className="flex items-center justify-between border-t border-white/[0.06] pt-4"><div><p className="flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />Heartbeat</p><p className="mt-1 text-xs text-slate-300">{bot.lastHeartbeat}</p></div>{!connected && <Button size="sm" variant="outline" onClick={() => simulateHeartbeat(bot.id)} className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"><RefreshCw className="mr-2 h-3.5 w-3.5" />Simulate Connect</Button>}</div></CardContent></Card> })}
      </section>
    </div>
  )
}

function Field({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) { return <label className="space-y-2 text-xs text-slate-400">{label}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none placeholder:text-slate-700 focus:border-indigo-400/50" /></label> }
function Summary({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Bot }) { return <Card className="border-white/10 bg-slate-950/60"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-semibold text-white">{value}</p></div><div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-300"><Icon className="h-5 w-5" /></div></CardContent></Card> }
function Metric({ icon: Icon, label, value }: { icon: typeof Bot; label: string; value: string }) { return <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"><p className="flex items-center gap-1.5 text-[11px] text-slate-500"><Icon className="h-3.5 w-3.5" />{label}</p><p className="mt-1.5 truncate text-xs font-medium text-slate-300">{value}</p></div> }
