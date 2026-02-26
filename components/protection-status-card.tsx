"use client"

import { useEffect, useState } from "react"

type PublicStatus = "public" | "private" | "protected"

function formatSeconds(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export function ProtectionStatusCard({
  publicStatus,
  revealAt,
}: {
  publicStatus?: string
  revealAt?: string
}) {
  const status = (publicStatus as PublicStatus) || "private"
  const [remainSec, setRemainSec] = useState<number | null>(null)

  useEffect(() => {
    if (status !== "private" || !revealAt) {
      setRemainSec(null)
      return
    }

    const target = new Date(revealAt).getTime()
    if (Number.isNaN(target)) {
      setRemainSec(null)
      return
    }

    const tick = () => {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000))
      setRemainSec(diff)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [status, revealAt])

  const title =
    status === "public" ? "公開中" : status === "protected" ? "保護中" : "非公開"

  const sub =
    status === "private"
      ? revealAt
        ? `自動公開まで: ${remainSec === null ? "-" : formatSeconds(remainSec)}`
        : "自動公開日時が未設定"
      : status === "protected"
      ? "公開保護が有効です"
      : "誰でも閲覧できます"

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  )
}
