"use client"


import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Bot, Boxes, ChevronDown, ChevronRight, ClipboardList, Code2, FileSpreadsheet, Gamepad2, Gem, Globe, HelpCircle, LayoutDashboard, Package, Settings, ShoppingBag, ShoppingCart, Store, Workflow } from "lucide-react"

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/orders", icon: ClipboardList },
  { label: "Products", href: "/products", icon: Package },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Bot Network", href: "/bots", icon: Bot },
  { label: "Agent Control", href: "/ai-control-center", icon: Workflow },
]

const marketplace = [
  { label: "Itemku", href: "/marketplace/itemku", icon: ShoppingBag },
  { label: "G2G", href: "/marketplace/g2g", icon: Globe },
  { label: "Eldorado", href: "/marketplace/eldorado", icon: Gem },
  { label: "U7Buy", href: "/marketplace/u7buy", icon: Store },
  { label: "VCGamers", href: "/marketplace/vcgamers", icon: Gamepad2 },
  { label: "Web Store", href: "/marketplace/webstore", icon: ShoppingCart },
  { label: "Google Sheet", href: "/marketplace/google-sheet", icon: FileSpreadsheet },
]

const setupItems = [
  { label: "How to Use", href: "/marketplace/setup/how-to-use", icon: HelpCircle },
  { label: "Bot Script", href: "/marketplace/setup/bot-script", icon: Code2 },
]

export function Sidebar() {
  const pathname = usePathname()
  const [setupOpen, setSetupOpen] = useState(pathname.startsWith("/marketplace/setup"))

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  const linkClass = (active: boolean, indent = false) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${indent ? "ml-3 pl-3" : ""} ${
      active ? "bg-cyan-500/10 text-cyan-300 ring-1 ring-inset ring-cyan-400/15" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
    }`

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-white/[0.07] bg-slate-950/90 px-3 py-5 md:flex md:flex-col">
      <div className="mb-8 flex items-center gap-3 px-3">
        <Image src="/sabar-hub-logo.png" alt="Sabar Hub logo" width={44} height={44} className="h-11 w-11 shrink-0 object-contain" priority />
        <div>
          <p className="text-base font-semibold tracking-tight text-white">Sabar Hub</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Marketplace Automation</p>
        </div>
      </div>

      <nav className="space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
              <Icon className={`h-[18px] w-[18px] transition-colors ${active ? "text-cyan-300" : "group-hover:text-cyan-300"}`} />
              <span>{item.label}</span>
            </Link>
          )
        })}

        <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Marketplace</p>
        {marketplace.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
              <Icon className={`h-[18px] w-[18px] transition-colors ${active ? "text-cyan-300" : "group-hover:text-cyan-300"}`} />
              <span>{item.label}</span>
            </Link>
          )
        })}

        {/* Setup — collapsible */}
        <button
          type="button"
          onClick={() => setSetupOpen((v) => !v)}
          className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
            pathname.startsWith("/marketplace/setup") ? "text-cyan-300" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
          }`}
        >
          <Settings className={`h-[18px] w-[18px] ${pathname.startsWith("/marketplace/setup") ? "text-cyan-300" : "group-hover:text-cyan-300"}`} />
          <span className="flex-1 text-left">Setup</span>
          {setupOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {setupOpen && setupItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active, true)}>
              <Icon className={`h-4 w-4 transition-colors ${active ? "text-cyan-300" : "group-hover:text-cyan-300"}`} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />System operational</div>
        <p className="mt-1 text-[11px] leading-4 text-slate-600">Marketplace channels · bot network ready</p>
      </div>
    </aside>
  )
}
