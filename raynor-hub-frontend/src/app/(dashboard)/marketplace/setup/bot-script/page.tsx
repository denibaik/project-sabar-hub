"use client"

import { useEffect, useState } from "react"
import { Check, Code2, Copy, Download, FileWarning } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const SCRIPT_URL = "/RaynorHubBot.lua"

// URL publik tempat script di-host (backend /files/loader.lua via tunnel/domain)
const LOADER_URL = process.env.NEXT_PUBLIC_LOADER_URL || "https://cdna-gain-washing-gravity.trycloudflare.com/files/loader.lua"

const UNIVERSAL_LOADER = `local u="${LOADER_URL}";local ok,s=pcall(function() return game:HttpGet(u) end);loadstring(ok and s or (request or http_request)({Url=u,Method="GET"}).Body)()`
const SHORT_LOADER = `loadstring(game:HttpGet("${LOADER_URL}"))()`

export default function BotScriptPage() {
  const [code, setCode] = useState<string>("")
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(SCRIPT_URL)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setCode)
      .catch((e) => setErr(e.message))
  }, [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setErr("Gagal menyalin — salin manual dari kotak di bawah.")
    }
  }

  const lines = code ? code.split("\n").length : 0

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-slate-100">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-indigo-500/15 p-3 text-indigo-300 ring-1 ring-indigo-400/20"><Code2 className="h-6 w-6" /></div>
        <div>
          <div className="flex items-center gap-3"><h1 className="text-2xl font-bold tracking-tight text-white">Bot Script</h1><Badge variant="outline" className="border-indigo-400/20 bg-indigo-500/10 text-indigo-300">RaynorHubBot.lua</Badge></div>
          <p className="mt-1 text-sm text-slate-500">Script yang dijalankan di executor Roblox pada tiap akun bot. Salin, sesuaikan CONFIG, lalu Execute.</p>
        </div>
      </div>

      <Card className="border-emerald-500/20 bg-emerald-500/[0.04]">
        <CardHeader><CardTitle className="text-base text-white">Loader singkat (rekomendasi)</CardTitle><CardDescription className="text-slate-500">Satu baris — script diambil dari server, selalu versi terbaru. Tak perlu paste script panjang.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs text-slate-400">Universal (jalan di semua executor):</p>
            <CopyBox text={UNIVERSAL_LOADER} />
          </div>
          <div>
            <p className="mb-2 text-xs text-slate-400">Ringkas — hanya untuk executor yang punya <code className="rounded bg-white/[0.06] px-1 text-indigo-300">game:HttpGet</code>:</p>
            <CopyBox text={SHORT_LOADER} />
          </div>
          <p className="text-xs text-slate-600">Ganti URL di atas kalau alamat backend berubah.</p>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-950/60">
        <CardHeader><CardTitle className="text-base text-white">Sebelum menjalankan</CardTitle><CardDescription className="text-slate-500">Yang perlu dipastikan.</CardDescription></CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-300">
          <Step n={1}>Akun bot sudah <b>masuk game</b> Grow a Garden &amp; <b>selesai tutorial</b> (gifting diblokir saat tutorial).</Step>
          <Step n={2}>Di baris <code className="rounded bg-white/[0.06] px-1 text-indigo-300">CONFIG</code>, samakan <code className="rounded bg-white/[0.06] px-1 text-indigo-300">BASE_URL</code> (default <code className="rounded bg-white/[0.06] px-1 text-indigo-300">http://127.0.0.1:8000</code>) &amp; <code className="rounded bg-white/[0.06] px-1 text-indigo-300">REGISTRATION_KEY</code>.</Step>
          <Step n={3}>Set <code className="rounded bg-white/[0.06] px-1 text-indigo-300">DRY_RUN=true</code> untuk uji tanpa mengirim, <code className="rounded bg-white/[0.06] px-1 text-indigo-300">false</code> untuk kirim sungguhan.</Step>
          <Step n={4}>Paste ke executor, Execute. Bot auto-register (pakai username akun) &amp; mulai heartbeat.</Step>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-950/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle className="text-base text-white">RaynorHubBot.lua</CardTitle><CardDescription className="text-slate-500">{lines > 0 ? `${lines} baris` : "memuat…"}</CardDescription></div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={copy} disabled={!code} className="border-white/10 bg-white/[0.03] text-slate-300">{copied ? <Check className="mr-2 h-4 w-4 text-emerald-300" /> : <Copy className="mr-2 h-4 w-4" />}{copied ? "Tersalin" : "Salin"}</Button>
            <a href={SCRIPT_URL} download="RaynorHubBot.lua"><Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-500"><Download className="mr-2 h-4 w-4" />Unduh</Button></a>
          </div>
        </CardHeader>
        <CardContent>
          {err && <p className="mb-3 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"><FileWarning className="h-4 w-4" />{err}</p>}
          <pre className="max-h-[520px] overflow-auto rounded-xl bg-slate-950 p-4 text-[12px] leading-5 text-slate-300 ring-1 ring-white/[0.06]"><code>{code || "// memuat script…"}</code></pre>
        </CardContent>
      </Card>
    </div>
  )
}

function CopyBox({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <div className="flex items-start gap-2">
      <pre className="flex-1 overflow-x-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-5 text-emerald-300 ring-1 ring-white/[0.06]"><code>{text}</code></pre>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-white/10 bg-white/[0.03] text-slate-300"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text)
            setDone(true)
            setTimeout(() => setDone(false), 1500)
          } catch { /* clipboard ditolak browser — salin manual */ }
        }}
      >
        {done ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return <p className="flex items-start gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[11px] text-indigo-300">{n}</span><span>{children}</span></p>
}
