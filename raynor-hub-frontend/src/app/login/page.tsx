"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { LogIn, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        setErr(j.error || "Login gagal")
        return
      }
      router.replace("/dashboard")
      router.refresh()
    } catch {
      setErr("Tidak bisa menghubungi server")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image src="/sabar-hub-logo.png" alt="Sabar Hub" width={56} height={56} className="h-14 w-14 object-contain" priority />
          <div>
            <h1 className="text-xl font-semibold text-white">Sabar Hub</h1>
            <p className="text-xs text-slate-500">Masuk untuk mengakses dashboard</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl">
          <label className="block space-y-2 text-xs text-slate-400">
            Password admin
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-indigo-400/50"
              placeholder="••••••••"
            />
          </label>
          {err && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{err}</p>}
          <Button type="submit" disabled={busy || !password} className="w-full bg-indigo-600 text-white hover:bg-indigo-500">
            <LogIn className="mr-2 h-4 w-4" />
            {busy ? "Memeriksa…" : "Masuk"}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600"><ShieldCheck className="h-3.5 w-3.5" />Sesi tersimpan sebagai cookie httpOnly</p>
        </form>
      </div>
    </div>
  )
}
