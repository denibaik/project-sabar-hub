import { Bell, ChevronDown } from "lucide-react"

import { ModeToggle } from "@/components/mode-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

export function TopBar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/[0.07] bg-slate-950/80 px-4 backdrop-blur-xl md:px-6">
      <div>
        <p className="text-lg font-semibold tracking-tight text-white">Sabar Hub</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-300">Sabar Store</p>
          <p className="text-[11px] text-slate-600">Workspace</p>
        </div>

        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg text-slate-400 hover:bg-white/[0.05] hover:text-white" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-400 ring-2 ring-slate-950" />
        </Button>

        <div className="mx-1 h-6 w-px bg-white/[0.08]" />

        <button type="button" className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-white/[0.05]" aria-label="Open user menu">
          <Avatar className="h-8 w-8 border border-cyan-400/20">
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-cyan-500 text-xs font-semibold text-white">SS</AvatarFallback>
          </Avatar>
          <div className="hidden text-left lg:block">
            <p className="text-xs font-medium text-slate-200">Sabar Store</p>
            <p className="text-[10px] text-slate-600">Administrator</p>
          </div>
          <ChevronDown className="hidden h-3.5 w-3.5 text-slate-600 lg:block" />
        </button>

        <ModeToggle />
      </div>
    </header>
  )
}
