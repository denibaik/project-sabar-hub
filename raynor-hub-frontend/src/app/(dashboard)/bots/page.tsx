"use client"

import { useCallback, useEffect, useState } from "react"
import { Activity, Bot, Box, CheckCircle2, Clock3, Gamepad2, KeyRound, Plus, Radio, RefreshCw, Server, Signal, Users, WifiOff, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { backend, relativeTime, type BackendBot } from "@/lib/api/backend"

const statusStyle: Record<string, string> = {
  online: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  offline: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  maintenance: "border-slate-600 bg-slate-800/70 text-slate-300",
}
const statusLabel: Record<string, string> = { online: "Online", offline: "Offline", maintenance: "Maintenance" }

const LOADER_URL = process.env.NEXT_PUBLIC_LOADER_URL || "http://127.0.0.1:8000/files/loader.lua"
const LOADER_SNIPPET = `local u="${LOADER_URL}";local ok,s=pcall(function() return game:HttpGet(u) end);loadstring(ok and s or (request or http_request)({Url=u,Method="GET"}).Body)()`

export default function BotsPage() {
  const [bots, setBots] = useState<BackendBot[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [showRegistration, setShowRegistration] = useState(false)
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [game, setGame] = useState("Grow a Garden")
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [regError, setRegError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setBots(await backend.listBots())
      setErr(null)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 5000) // polling heartbeat
    return () => clearInterval(t)
  }, [load])

  const activeBots = bots.filter((b) => b.status === "online").length

  async function registerBot() {
    if (!name.trim() || !username.trim()) return
    setRegError(null)
    try {
      const { token } = await backend.registerBot(name.trim(), username.trim(), game)
      setGeneratedToken(token)
      setName("")
      setUsername("")
      load()
    } catch (e) {
      setRegError((e as Error).message)
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-10 text-slate-100">
      <section className="rounded-2xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/20 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-indigo-500/15 p-3 text-indigo-300 ring-1 ring-indigo-400/20"><Bot className="h-6 w-6" /></div><Badge variant="outline" className="border-indigo-400/20 bg-indigo-500/10 text-indigo-300">Roblox Operations · Live</Badge></div>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Roblox Bot Network</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Data langsung dari backend. Bot online mengirim heartbeat + inventory tiap beberapa detik.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={load} className="border-white/10 bg-white/[0.03] text-slate-300"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            <Button onClick={() => setShowRegistration(true)} className="bg-indigo-600 text-white hover:bg-indigo-500"><Plus className="mr-2 h-4 w-4" />Register Bot</Button>
          </div>
        </div>
        {err && <p className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">Backend tidak terjangkau: {err}. Pastikan uvicorn jalan di {process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"}.</p>}
      </section>

      {showRegistration && (
        <Card className="border-indigo-400/20 bg-indigo-500/[0.04] shadow-xl">
          <CardHeader className="flex flex-row items-start justify-between"><div><CardTitle className="text-white">Register Roblox Bot</CardTitle><CardDescription className="mt-1 text-slate-400">Daftar ke backend, dapatkan token asli untuk script bot.</CardDescription></div><Button variant="ghost" size="icon" onClick={() => { setShowRegistration(false); setGeneratedToken(null); setRegError(null) }}><X className="h-4 w-4" /></Button></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Bot Name" value={name} placeholder="Sabar Garden 04" onChange={setName} />
              <Field label="Roblox Username" value={username} placeholder="Sabar_Garden04" onChange={setUsername} />
              <label className="space-y-2 text-xs text-slate-400">Game<select value={game} onChange={(e) => setGame(e.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-indigo-400/50"><option>Grow a Garden</option><option>Adopt Me</option><option>Pet Simulator 99</option></select></label>
            </div>
            <Button onClick={registerBot} disabled={!name.trim() || !username.trim()} className="bg-indigo-600 hover:bg-indigo-500"><KeyRound className="mr-2 h-4 w-4" />Generate Bot Token</Button>
            {regError && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{regError}</p>}
            {generatedToken && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
                <p className="text-xs font-medium text-amber-200">Token dibuat — hanya ditampilkan sekali</p>
                <code className="mt-2 block break-all rounded-lg bg-slate-950 p-3 text-sm text-amber-300">{generatedToken}</code>
                <p className="mt-3 text-xs text-slate-400">Jalankan ini di executor akun bot:</p>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-5 text-emerald-300"><code>{`getgenv().BOT_TOKEN = "${generatedToken}"\n${LOADER_SNIPPET}`}</code></pre>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(`getgenv().BOT_TOKEN = "${generatedToken}"\n${LOADER_SNIPPET}`).catch(() => {})}
                  className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 hover:bg-white/[0.06]"
                >Salin perintah</button>
                <p className="mt-2 text-xs text-slate-500">Simpan token ini — tidak bisa dilihat lagi. Kalau bocor, cabut bot-nya lalu daftar ulang.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Registered Accounts" value={String(bots.length)} icon={Users} />
        <Summary label="Online Accounts" value={`${activeBots}/${bots.length}`} icon={Activity} />
        <Summary label="Offline" value={String(bots.length - activeBots)} icon={Radio} />
        <Summary label="Backend" value={loading ? "Loading…" : err ? "Disconnected" : "Live"} icon={Box} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {bots.length === 0 && !loading && <p className="text-sm text-slate-500">Belum ada bot. Jalankan RaynorHubBot.lua di akun Roblox — ia auto-register & muncul di sini.</p>}
        {bots.map((bot) => {
          const connected = bot.status === "online"
          return (
            <Card key={bot.id} className="border-white/10 bg-slate-950/60 shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:border-indigo-400/25">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3"><div className={`rounded-xl p-3 ${connected ? "bg-indigo-500/10 text-indigo-300" : "bg-slate-800 text-slate-500"}`}><Gamepad2 className="h-5 w-5" /></div><div className="min-w-0"><CardTitle className="truncate text-base text-white">{bot.name}</CardTitle><CardDescription className="mt-1 text-xs text-slate-500">@{bot.username}</CardDescription></div></div>
                <Badge variant="outline" className={statusStyle[bot.status]}>{statusLabel[bot.status] ?? bot.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Metric icon={Gamepad2} label="Game" value={bot.game} />
                  <Metric icon={Server} label="Server (jobId)" value={bot.server ? bot.server.slice(0, 10) + "…" : "—"} />
                  <Metric icon={Signal} label="Ping" value={bot.ping_ms != null ? `${bot.ping_ms} ms` : "—"} />
                  <Metric icon={Clock3} label="Heartbeat" value={relativeTime(bot.last_heartbeat_at)} />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-slate-300">{connected ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <WifiOff className="h-4 w-4 text-rose-300" />}{connected ? "Online — siap menerima order" : "Offline — tidak ada heartbeat"}</div>
                <Button
                  variant="outline" size="sm"
                  onClick={async () => {
                    if (!window.confirm(`Cabut bot @${bot.username}? Token-nya langsung tidak berlaku dan bot berhenti bekerja.`)) return
                    try { await backend.deleteBot(bot.id); load() } catch (e) { setErr((e as Error).message) }
                  }}
                  className="w-full border-rose-500/20 bg-rose-500/[0.06] text-rose-300 hover:bg-rose-500/[0.12]"
                >Cabut token &amp; hapus bot</Button>
              </CardContent>
            </Card>
          )
        })}
      </section>
    </div>
  )
}

function Field({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (v: string) => void }) { return <label className="space-y-2 text-xs text-slate-400">{label}<input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none placeholder:text-slate-700 focus:border-indigo-400/50" /></label> }
function Summary({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Bot }) { return <Card className="border-white/10 bg-slate-950/60"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-semibold text-white">{value}</p></div><div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-300"><Icon className="h-5 w-5" /></div></CardContent></Card> }
function Metric({ icon: Icon, label, value }: { icon: typeof Bot; label: string; value: string }) { return <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"><p className="flex items-center gap-1.5 text-[11px] text-slate-500"><Icon className="h-3.5 w-3.5" />{label}</p><p className="mt-1.5 truncate text-xs font-medium text-slate-300">{value}</p></div> }
