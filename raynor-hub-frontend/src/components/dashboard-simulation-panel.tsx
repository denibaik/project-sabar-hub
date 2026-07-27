"use client"

import { useMemo, useState } from "react"
import { Activity, CheckCircle2, CircleDollarSign, Clock3, Loader2, PackageCheck, Play, Sparkles, Users, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { orderSimulationService, type SimulationEvent, type OrderSimulationResult } from "@/lib/services"

const agentNames = ["Marketplace Agent", "Supervisor Agent", "Order Agent", "Payment Agent", "Inventory Agent", "Bot Manager Agent", "Delivery Agent", "Verification Agent", "Notification Agent", "Reporting Agent"]

export function DashboardSimulationPanel() {
  const [running, setRunning] = useState(false)
  const [events, setEvents] = useState<SimulationEvent[]>([])
  const [result, setResult] = useState<OrderSimulationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeAgent = useMemo(() => events.find((event) => event.status === "running")?.agent, [events])
  const completedAgents = useMemo(() => new Set(events.filter((event) => event.status === "completed").map((event) => event.agent)), [events])

  async function handleSimulation() {
    setRunning(true)
    setError(null)
    setResult(null)
    setEvents([])

    try {
      const simulation = await orderSimulationService.simulate({
        onEvent: (event) => setEvents((current) => [event, ...current].slice(0, 12)),
      })
      setResult(simulation)
    } catch (simulationError) {
      setError(simulationError instanceof Error ? simulationError.message : "Simulation failed")
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.04] p-4 shadow-xl shadow-indigo-950/10 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-indigo-500/15 p-2.5 text-indigo-300 ring-1 ring-indigo-400/20"><Sparkles className="h-5 w-5" /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">Marketplace Workflow Simulation</h2>
              <Badge variant="outline" className="border-indigo-400/20 bg-indigo-500/10 text-indigo-300">Mock Mode</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-400">Jalankan order marketplace sintetis melalui seluruh workflow multi-agent.</p>
          </div>
        </div>
        <Button onClick={handleSimulation} disabled={running} className="h-10 bg-indigo-600 text-white shadow-lg shadow-indigo-950/30 hover:bg-indigo-500">
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          {running ? "Simulating workflow..." : "Simulate Marketplace Order"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Orders" value={result ? "+1" : "Ready"} icon={PackageCheck} accent="text-indigo-300" />
        <Metric label="Revenue" value={result ? `+Rp ${result.revenueDelta.toLocaleString("id-ID")}` : "Awaiting simulation"} icon={CircleDollarSign} accent="text-emerald-300" />
        <Metric label="Inventory" value={result ? `-${result.inventoryDelta} reserved` : "No changes"} icon={PackageCheck} accent="text-amber-300" />
        <Metric label="Automation" value={result?.automationStatus === "completed" ? "Completed" : running ? "Running" : "Idle"} icon={Zap} accent="text-cyan-300" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="border-white/[0.08] bg-slate-950/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-200"><Activity className="h-4 w-4 text-indigo-300" />Live Workflow Events</CardTitle>
            <CardDescription className="text-xs text-slate-500">Marketplace Listener → Supervisor → Agents</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? <p className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-slate-500">Klik tombol simulasi untuk memulai workflow.</p> : <div className="space-y-2">
              {events.slice(0, 8).map((event, index) => <div key={`${event.timestamp}-${event.stage}-${index}`} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <div className={`h-2 w-2 shrink-0 rounded-full ${event.status === "running" ? "animate-pulse bg-amber-400" : event.status === "completed" ? "bg-emerald-400" : "bg-rose-400"}`} />
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-200">{event.agent} <span className="font-normal text-indigo-300">· {event.action}</span></p><p className="truncate text-xs text-slate-500">{event.detail}</p></div>
                <time className="shrink-0 text-[11px] text-slate-600">{new Date(event.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
              </div>)}
            </div>}
            {error && <p className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-slate-950/50">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm text-slate-200"><Users className="h-4 w-4 text-emerald-300" />Agent Status</CardTitle><CardDescription className="text-xs text-slate-500">Runtime state during simulation</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {agentNames.map((agent) => { const isActive = activeAgent === agent; const isCompleted = completedAgents.has(agent); return <div key={agent} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] px-3 py-2.5"><div className="flex min-w-0 items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${isActive ? "animate-pulse bg-amber-400" : isCompleted ? "bg-emerald-400" : "bg-slate-600"}`} /><span className="truncate text-xs text-slate-300">{agent}</span></div><span className={`text-[10px] ${isActive ? "text-amber-300" : isCompleted ? "text-emerald-300" : "text-slate-600"}`}>{isActive ? "Running" : isCompleted ? "Done" : "Idle"}</span></div> })}
          </CardContent>
        </Card>
      </div>

      {result && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-400" /><span className="text-emerald-300">Order {result.dashboardOrder.id} completed successfully.</span><span className="text-slate-500">{result.dashboardOrder.marketplace} · {result.dashboardOrder.product} · {result.executions.length} agent executions</span><Clock3 className="ml-auto h-4 w-4 text-slate-500" /></div>}
    </section>
  )
}

function Metric({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof Zap; accent: string }) {
  return <div className="rounded-xl border border-white/[0.07] bg-slate-950/40 p-3"><div className="flex items-center gap-2 text-xs text-slate-500"><Icon className={`h-3.5 w-3.5 ${accent}`} />{label}</div><p className="mt-2 truncate text-sm font-semibold text-slate-200">{value}</p></div>
}
