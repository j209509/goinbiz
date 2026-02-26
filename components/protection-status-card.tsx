"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Shield, Globe, Lock } from "lucide-react"

interface ProtectionStatusCardProps {
  onPublish?: () => void
  onExtend?: () => void
}

function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => n.toString().padStart(2, "0")

  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export function ProtectionStatusCard({ onPublish, onExtend }: ProtectionStatusCardProps) {
  const [action, setAction] = useState<"none" | "published" | "extended">("none")
  const countdown = useCountdown(23 * 3600 + 12 * 60 + 13)

  const handlePublish = () => {
    setAction("published")
    onPublish?.()
  }

  const handleExtend = () => {
    setAction("extended")
    onExtend?.()
  }

  /* --- Published state --- */
  if (action === "published") {
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
  if (action === "extended") {
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
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="flex flex-col gap-2.5 md:items-end shrink-0 md:pl-8">
              <Button
                variant="outline"
                className="min-w-[200px] whitespace-nowrap cursor-pointer h-10 text-sm"
                onClick={handlePublish}
              >
                {"今すぐ公開する"}
              </Button>
              <div className="flex flex-col gap-1">
                <Button
                  className="min-w-[200px] whitespace-nowrap cursor-pointer h-10 text-sm"
                  onClick={handleExtend}
                >
                  {"1年間保護する"}
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
