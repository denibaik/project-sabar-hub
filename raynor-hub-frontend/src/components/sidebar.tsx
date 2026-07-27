"use client"


import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot, Boxes, ClipboardList, LayoutDashboard, Package, Workflow } from "lucide-react"

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/orders", icon: ClipboardList },
  { label: "Products", href: "/products", icon: Package },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Bot Network", href: "/bots", icon: Bot },
  { label: "Agent Control", href: "/ai-control-center", icon: Workflow },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-white/[0.07] bg-slate-950/90 px-3 py-5 md:flex md:flex-col">
      <div className="mb-8 flex items-center gap-3 px-3">
        <Image
          src="/sabar-hub-logo.png"
          alt="Sabar Hub logo"
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 object-contain"
          priority
        />
        <div>
          <p className="text-base font-semibold tracking-tight text-white">Sabar Hub</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Marketplace Automation</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = item.href === "/dashboard"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isActive ? "bg-cyan-500/10 text-cyan-300 ring-1 ring-inset ring-cyan-400/15" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}
            >
              <Icon className={`h-[18px] w-[18px] transition-colors ${isActive ? "text-cyan-300" : "group-hover:text-cyan-300"}`} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />System operational</div>
        <p className="mt-1 text-[11px] leading-4 text-slate-600">4 marketplaces · bot network ready</p>
      </div>
    </aside>
  )
}
