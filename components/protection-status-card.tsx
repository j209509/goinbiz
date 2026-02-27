"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Shield, Globe, Lock } from "lucide-react"

interface ProtectionStatusCardProps {
  ideaId: string | null
  publishAtMs: number | null
  protectedUntilMs: number | null
  onUpdated?: (v: { publishAtMs: number; protectedUntilMs: number | null }) => void
}

function useCountdown(targetMs: number | null) {
  const [now, setNow] = useState(() => Date.now())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const remainSec = Math.max(0, Math.floor(((targetMs ?? now) - now) / 1000))
  const h = Math.floor(remainSec / 3600)
  const m = Math.floor((remainSec % 3600) / 60)
  const s = remainSec % 60
  const pad = (n: number) => n.toString().padStart(2, "0")

  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export function ProtectionStatusCard({ ideaId, publishAtMs, protectedUntilMs, onUpdated }: ProtectionStatusCardProps) {
  const nowMs = Date.now()
  const effectivePublishAtMs = useMemo(() => {
    const base = publishAtMs
    const prot = protectedUntilMs
    if (base == null && prot == null) return null
    if (base == null) return prot
    if (prot == null) return base
    return Math.max(base, prot)
  }, [publishAtMs, protectedUntilMs])

  const countdown = useCountdown(effectivePublishAtMs)
  const isPublic = effectivePublishAtMs != null ? nowMs >= effectivePublishAtMs : false
  const isProtected = protectedUntilMs != null ? nowMs < protectedUntilMs : false

  const [busy, setBusy] = useState<"" | "publish" | "protect">("")
  const [err, setErr] = useState<string>("")

  const call = async (action: "publish_now" | "protect_365") => {
    if (!ideaId) return
    setErr("")
    setBusy(action === "publish_now" ? "publish" : "protect")
    try {
      const r = await fetch("/api/ideas/visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId, action }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) throw new Error(j?.error || "request failed")
      onUpdated?.({ publishAtMs: j.publishAtMs, protectedUntilMs: j.protectedUntilMs ?? null })
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setBusy("")
    }
  }

  if (!ideaId) return null

  /* --- Published state --- */
  if (isPublic) {
    return (
      <div className="relative z-10 animate-slide-up">
        <div className="h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
        <div className="py-5 px-6 flex items-center gap-3">
          <Globe className="size-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            {"このアイデアは公開一覧に表示されています"}
          </p>
        </div>
      </div>
    )
  }

  /* --- Extended state --- */
  if (isProtected) {
    return (
      <div className="relative z-10 animate-slide-up">
        <div className="h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
        <div className="py-5 px-6 flex items-center gap-3">
          <Lock className="size-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            {"1年間非公開に設定されました。公開一覧には表示されません。"}
          </p>
        </div>
      </div>
    )
  }

  /* --- Default: protection panel --- */
  return (
    <div className="relative z-10 animate-slide-up">
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />

      {/* Subtle background gradient */}
      <div className="bg-gradient-to-r from-blue-50/40 via-transparent to-transparent">
        <div className="py-6 px-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

            {/* Left: status info */}
            <div className="flex items-start gap-4">
              <Shield className="size-4 text-foreground/50 mt-1 shrink-0" />
              <div className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
                  {"保護中"}
                </span>
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  {"このアイデアは現在、非公開です"}
                </p>
                <div className="flex items-baseline gap-2.5 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {"公開まで"}
                  </span>
                  <span className="text-xl font-mono font-semibold text-foreground tabular-nums tracking-wide">
                    {countdown}
                  </span>
                </div>
                {err ? (
                  <p className="text-xs text-red-600">{err}</p>
                ) : null}
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="flex flex-col gap-2.5 md:items-end shrink-0 md:pl-8">
              <Button
                variant="outline"
                className="min-w-[200px] whitespace-nowrap cursor-pointer h-10 text-sm"
                onClick={() => call("publish_now")}
                disabled={busy !== ""}
              >
                {busy === "publish" ? "処理中..." : "今すぐ公開する"}
              </Button>
              <div className="flex flex-col gap-1">
                <Button
                  className="min-w-[200px] whitespace-nowrap cursor-pointer h-10 text-sm"
                  onClick={() => call("protect_365")}
                  disabled={busy !== ""}
                >
                  {busy === "protect" ? "処理中..." : "1年間保護する"}
                  <span className="ml-1.5 opacity-70">{"980円"}</span>
                </Button>
                <span className="text-[11px] text-muted-foreground md:text-right">
                  {"公開一覧に表示されません"}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
    </div>
  )
}
