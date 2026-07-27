import {
  Activity,
  Bot,
  Boxes,
  CheckCircle2,
  Clock3,
  Cpu,
  Gauge,
  GitBranch,
  ListTodo,
  MemoryStick,
  MessageSquare,
  PackageCheck,
  Radio,
  ScrollText,
  ShieldCheck,
  ShoppingBag,
  Store,
  Workflow,
  Wrench,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const agents = [
  {
    name: "Supervisor Agent",
    role: "Workflow coordinator",
    description: "Mengatur alur fulfillment, exception, retry, dan manual review.",
    status: "Running",
    health: 99,
    tasks: 8,
    execution: "182 ms",
    currentTask: "Orchestrating order SH-2104",
    lastActivity: "5 detik lalu",
    icon: ShieldCheck,
    color: "indigo",
    logs: ["Routed SH-2104 to Fulfillment Agent", "Workflow state persisted"],
  },
  {
    name: "Marketplace Agent",
    role: "Order ingestion and normalization",
    description: "Mengambil order berbayar dan menyatukan format setiap marketplace.",
    status: "Running",
    health: 98,
    tasks: 12,
    execution: "214 ms",
    currentTask: "Normalizing Eldorado order ELD-8472",
    lastActivity: "9 detik lalu",
    icon: Store,
    color: "cyan",
    logs: ["Received paid order from Eldorado", "Username and item data normalized"],
  },
  {
    name: "Fulfillment Agent",
    role: "Trade Mail fulfillment",
    description: "Memvalidasi order, mengatur delivery, dan menyelesaikan proses fulfillment.",
    status: "Running",
    health: 97,
    tasks: 5,
    execution: "268 ms",
    currentTask: "Sending Dragonfly x2 to RizkyGarden",
    lastActivity: "3 detik lalu",
    icon: PackageCheck,
    color: "emerald",
    logs: ["Inventory reserved on BOT-02", "Trade Mail command CMD-8192 queued"],
  },
  {
    name: "Bot Manager Agent",
    role: "Bot selection and allocation",
    description: "Memilih akun Roblox terbaik berdasarkan stok, status, ping, dan success rate.",
    status: "Idle",
    health: 100,
    tasks: 0,
    execution: "156 ms",
    currentTask: "Waiting for bot selection request",
    lastActivity: "38 detik lalu",
    icon: Bot,
    color: "amber",
    logs: ["Selected BOT-02 for SH-2104", "Decision score: 96/100"],
  },
]

const tools = [
  { name: "Order Validation", type: "Business Rule", status: "Healthy", detail: "Username, product mapping, quantity", icon: CheckCircle2 },
  { name: "Payment Check", type: "Validation", status: "Healthy", detail: "Requires marketplace status: paid", icon: ShoppingBag },
  { name: "Inventory Tool", type: "Domain Service", status: "Healthy", detail: "Check, reserve, release, consume", icon: Boxes },
  { name: "Trade Mail Command", type: "Bot Tool", status: "Healthy", detail: "SEND_TRADE_MAIL whitelist", icon: Radio },
  { name: "Delivery Verification", type: "Domain Service", status: "Healthy", detail: "Validates delivery proof", icon: ShieldCheck },
  { name: "Marketplace Completion", type: "Integration Tool", status: "Mock", detail: "Complete external order", icon: Store },
  { name: "Customer Notification", type: "Integration Tool", status: "Mock", detail: "Send completion message", icon: MessageSquare },
  { name: "Audit & Reporting", type: "Application Service", status: "Healthy", detail: "Logs decisions and metrics", icon: ScrollText },
]

const workflow = [
  { label: "Order Received", icon: Store },
  { label: "Normalize", icon: ShoppingBag },
  { label: "Fulfillment", icon: PackageCheck },
  { label: "Select Bot", icon: Bot },
  { label: "Trade Mail", icon: Radio },
  { label: "Verify", icon: ShieldCheck },
  { label: "Complete", icon: CheckCircle2 },
]

const colorStyles: Record<string, string> = {
  indigo: "bg-indigo-500/10 text-indigo-300 ring-indigo-500/20",
  cyan: "bg-cyan-500/10 text-cyan-300 ring-cyan-500/20",
  emerald: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
}

export default function AgentControlPage() {
  const running = agents.filter((agent) => agent.status === "Running").length
  const averageHealth = Math.round(agents.reduce((total, agent) => total + agent.health, 0) / agents.length)
  const queuedTasks = agents.reduce((total, agent) => total + agent.tasks, 0)

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-10 text-slate-100">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/20 md:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-indigo-500/15 p-3 text-indigo-300 ring-1 ring-indigo-400/20"><Workflow className="h-6 w-6" /></div><Badge variant="outline" className="border-indigo-400/20 bg-indigo-500/10 text-indigo-300">Automation Control Plane</Badge></div>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Agent Control</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">Monitor empat agent utama yang mengelola order marketplace hingga Trade Mail selesai. Proses deterministik dijalankan melalui tools dan services.</p>
          </div>
          <Badge variant="outline" className="h-9 gap-2 self-start border-emerald-500/20 bg-emerald-500/10 px-3 text-emerald-300 lg:self-auto"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />Automation operational</Badge>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Core Agents" value="4" detail="Focused responsibilities" icon={Bot} color="text-indigo-300" />
        <Summary label="Running" value={`${running}/4`} detail="1 agent currently idle" icon={Activity} color="text-emerald-300" />
        <Summary label="Average Health" value={`${averageHealth}%`} detail="All agents reachable" icon={Gauge} color="text-cyan-300" />
        <Summary label="Running Tasks" value={String(queuedTasks)} detail="Across the workflow" icon={ListTodo} color="text-amber-300" />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {agents.map((agent) => { const Icon = agent.icon; return <Card key={agent.name} className="group border-white/10 bg-slate-950/60 shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:border-indigo-400/25"><CardHeader className="flex flex-row items-start justify-between gap-4"><div className="flex min-w-0 gap-3"><div className={`rounded-xl p-3 ring-1 ${colorStyles[agent.color]}`}><Icon className="h-5 w-5" /></div><div><CardTitle className="text-base text-white">{agent.name}</CardTitle><CardDescription className="mt-1 text-xs text-slate-500">{agent.role}</CardDescription></div></div><Badge variant="outline" className={agent.status === "Running" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-800/70 text-slate-300"}>{agent.status}</Badge></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-6 text-slate-400">{agent.description}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric icon={Gauge} label="Health" value={`${agent.health}%`} /><Metric icon={ListTodo} label="Tasks" value={String(agent.tasks)} /><Metric icon={Clock3} label="Execution" value={agent.execution} /><Metric icon={Activity} label="Last Active" value={agent.lastActivity} /></div><div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><p className="text-[11px] uppercase tracking-wider text-slate-600">Current Task</p><p className="mt-2 text-sm text-slate-300">{agent.currentTask}</p></div><div className="space-y-2 border-t border-white/[0.06] pt-4"><p className="flex items-center gap-2 text-xs font-medium text-slate-400"><ScrollText className="h-3.5 w-3.5 text-indigo-300" />Recent Logs</p>{agent.logs.map((log) => <p key={log} className="flex items-start gap-2 text-xs text-slate-500"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />{log}</p>)}</div></CardContent></Card> })}
      </section>

      <Card className="border-white/10 bg-slate-950/60 shadow-xl shadow-black/10">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-white"><GitBranch className="h-5 w-5 text-cyan-300" />Fulfillment Workflow</CardTitle><CardDescription className="text-slate-500">Simplified order-to-delivery state flow</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto"><div className="flex min-w-[900px] items-center">{workflow.map((step, index) => { const Icon = step.icon; return <div key={step.label} className="flex flex-1 items-center"><div className="flex min-w-[110px] flex-col items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-4"><div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-300"><Icon className="h-4 w-4" /></div><span className="whitespace-nowrap text-xs text-slate-300">{step.label}</span></div>{index < workflow.length - 1 && <div className="mx-2 h-px flex-1 bg-gradient-to-r from-cyan-500/40 to-indigo-500/20" />}</div> })}</div></CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-950/60 shadow-xl shadow-black/10">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-white"><Wrench className="h-5 w-5 text-amber-300" />Tools & Services</CardTitle><CardDescription className="text-slate-500">Deterministic capabilities used by the core agents</CardDescription></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{tools.map((tool) => { const Icon = tool.icon; return <div key={tool.name} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"><div className="flex items-start justify-between gap-3"><div className="rounded-lg bg-amber-500/10 p-2 text-amber-300"><Icon className="h-4 w-4" /></div><Badge variant="outline" className={tool.status === "Healthy" ? "border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-300" : "border-indigo-500/20 bg-indigo-500/10 text-[10px] text-indigo-300"}>{tool.status}</Badge></div><p className="mt-3 text-sm font-medium text-slate-200">{tool.name}</p><p className="mt-1 text-[11px] uppercase tracking-wider text-slate-600">{tool.type}</p><p className="mt-2 text-xs leading-5 text-slate-500">{tool.detail}</p></div> })}</CardContent>
      </Card>
    </div>
  )
}

function Summary({ label, value, detail, icon: Icon, color }: { label: string; value: string; detail: string; icon: typeof Bot; color: string }) { return <Card className="border-white/10 bg-slate-950/60"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-semibold text-white">{value}</p></div><div className={`rounded-xl bg-white/[0.04] p-3 ${color}`}><Icon className="h-5 w-5" /></div></div><p className="mt-3 text-xs text-slate-600">{detail}</p></CardContent></Card> }
function Metric({ icon: Icon, label, value }: { icon: typeof Bot; label: string; value: string }) { return <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"><p className="flex items-center gap-1.5 text-[11px] text-slate-500"><Icon className="h-3.5 w-3.5" />{label}</p><p className="mt-1.5 truncate text-xs font-medium text-slate-300">{value}</p></div> }
