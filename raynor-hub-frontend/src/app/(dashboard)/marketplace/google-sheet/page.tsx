"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Link2, Plug, RefreshCw, Save, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { backend, relativeTime, type BackendChannel, type SyncResult } from "@/lib/api/backend"

const statusStyle: Record<string, string> = {
  connected: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  disconnected: "border-slate-600 bg-slate-800/70 text-slate-400",
  error: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  syncing: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
}

export default function GoogleSheetPage() {
  const [channel, setChannel] = useState<BackendChannel | null>(null)
  const [csvUrl, setCsvUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<SyncResult | null>(null)

  const load = useCallback(async () => {
    try {
      const list = await backend.listChannels()
      const ch = list.find((c) => c.type === "google_sheet") ?? null
      setChannel(ch)
      if (ch) setCsvUrl(String(ch.config?.csv_url ?? ""))
      setErr(null)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label); setErr(null)
    try { await fn() } catch (e) { setErr((e as Error).message) } finally { setBusy(null) }
  }

  const connect = () => run("connect", async () => {
    const ch = await backend.createChannel("google_sheet", "Google Sheet Orders", { csv_url: csvUrl.trim() })
    setChannel(ch); await load()
  })

  const save = () => run("save", async () => {
    if (!channel) return
    await backend.updateChannel(channel.id, { config: { csv_url: csvUrl.trim() }, enabled: true })
    await load()
  })

  const sync = () => run("sync", async () => {
    if (!channel) return
    setResult(await backend.syncChannel(channel.id))
    await load()
  })

  const remove = () => run("remove", async () => {
    if (!channel) return
    if (!window.confirm("Hapus koneksi Google Sheet ini?")) return
    await backend.deleteChannel(channel.id)
    setChannel(null); setCsvUrl(""); setResult(null)
    await load()
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6 text-slate-100">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300 ring-1 ring-emerald-400/20"><FileSpreadsheet className="h-6 w-6" /></div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Google Sheet Sync</h1>
            <Badge variant="outline" className={statusStyle[channel?.status ?? "disconnected"]}>
              {channel ? (channel.status === "connected" ? "Terhubung" : channel.status) : "Belum terhubung"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">Impor order dari Google Sheet. Tiap baris jadi satu order, otomatis dirutekan ke bot ber-stok.</p>
        </div>
      </div>

      {err && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{err}</p>}

      <Card className="border-white/10 bg-slate-950/60">
        <CardHeader><CardTitle className="text-base text-white">Cara menyiapkan sheet</CardTitle><CardDescription className="text-slate-500">Sekali saja.</CardDescription></CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <Step n={1}>Di Google Sheet: <b>File → Share → Publish to web</b> → pilih sheet-nya → format <b>CSV</b> → Publish.</Step>
          <Step n={2}>Salin URL yang diberikan (berakhiran <code className="rounded bg-white/[0.06] px-1 text-indigo-300">output=csv</code>), tempel di bawah.</Step>
          <Step n={3}>Baris pertama sheet harus berupa judul kolom:
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-[11px] text-emerald-300"><code>recipient,category,item_key,count,order_ref</code></pre>
            <span className="text-xs text-slate-500">
              <b>recipient</b> = username Roblox pembeli · <b>category</b>/<b>item_key</b> harus persis
              seperti katalog game (mis. <code className="rounded bg-white/[0.06] px-1">Seeds</code> /
              <code className="rounded bg-white/[0.06] px-1">Strawberry</code>) · <b>order_ref</b> = ID unik
              tiap baris, dipakai agar tidak terimpor dua kali.
            </span>
          </Step>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-950/60">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base text-white"><Link2 className="h-4 w-4 text-emerald-300" />Koneksi</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="block space-y-2 text-xs text-slate-400">Published CSV URL
            <input
              value={csvUrl}
              onChange={(e) => setCsvUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
              className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-emerald-400/50"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {!channel ? (
              <Button onClick={connect} disabled={!csvUrl.trim() || busy !== null} className="bg-emerald-600 text-white hover:bg-emerald-500">
                <Plug className="mr-2 h-4 w-4" />{busy === "connect" ? "Menghubungkan…" : "Sambungkan"}
              </Button>
            ) : (
              <>
                <Button onClick={save} disabled={busy !== null} variant="outline" className="border-white/10 bg-white/[0.03] text-slate-300">
                  <Save className="mr-2 h-4 w-4" />{busy === "save" ? "Menyimpan…" : "Simpan URL"}
                </Button>
                <Button onClick={sync} disabled={busy !== null || !csvUrl.trim()} className="bg-emerald-600 text-white hover:bg-emerald-500">
                  <RefreshCw className={`mr-2 h-4 w-4 ${busy === "sync" ? "animate-spin" : ""}`} />{busy === "sync" ? "Menyinkronkan…" : "Sync sekarang"}
                </Button>
                <Button onClick={remove} disabled={busy !== null} variant="outline" className="border-rose-500/20 bg-rose-500/[0.06] text-rose-300 hover:bg-rose-500/[0.12]">
                  <Trash2 className="mr-2 h-4 w-4" />Hapus
                </Button>
              </>
            )}
          </div>

          {channel && (
            <p className="text-xs text-slate-600">
              Terakhir sync: {channel.last_synced_at ? relativeTime(channel.last_synced_at) : "belum pernah"}
            </p>
          )}
          {loading && <p className="text-xs text-slate-600">memuat…</p>}
        </CardContent>
      </Card>

      {result && (
        <Card className={result.errors.length ? "border-amber-500/20 bg-amber-500/[0.04]" : "border-emerald-500/20 bg-emerald-500/[0.04]"}>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-white">
            {result.errors.length ? <AlertTriangle className="h-4 w-4 text-amber-300" /> : <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
            Hasil sync
          </CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex gap-6">
              <div><p className="text-xs text-slate-500">Order dibuat</p><p className="text-2xl font-bold text-emerald-300">{result.imported}</p></div>
              <div><p className="text-xs text-slate-500">Dilewati (sudah pernah)</p><p className="text-2xl font-bold text-slate-400">{result.skipped}</p></div>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3">
                <p className="text-xs font-medium text-amber-200">Masalah:</p>
                <ul className="mt-1 space-y-1">{result.errors.map((e, i) => <li key={i} className="text-xs text-amber-300/90">• {e}</li>)}</ul>
              </div>
            )}
            {result.imported > 0 && <p className="text-xs text-slate-500">Cek halaman <b>Orders</b> — order baru sedang dirutekan ke bot.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return <p className="flex items-start gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] text-emerald-300">{n}</span><span>{children}</span></p>
}
