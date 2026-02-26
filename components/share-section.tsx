"use client"

import { Button } from "@/components/ui/button"
import { Share2, Copy, Check } from "lucide-react"
import { useState } from "react"

interface ShareSectionProps {
  serviceName: string
  concept: string
  word1: string
  word2: string
  overallScore: number
}

export function ShareSection({
  serviceName,
  concept,
  word1,
  word2,
  overallScore,
}: ShareSectionProps) {
  const [copied, setCopied] = useState(false)

  const shareText = `「${word1} × ${word2}」→ ${serviceName}\n${concept}\n総合スコア: ${overallScore}/100\n\n#強引事業化 #ビジネスアイデア`

  const handleXShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="relative z-10 flex flex-col items-center gap-4 px-4 pb-16 w-full max-w-4xl mx-auto animate-slide-up animate-delay-3">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
        {"このアイデアを共有する"}
      </span>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={handleXShare} className="gap-2 shadow-sm">
          <Share2 className="size-4" />
          {"Xで共有"}
        </Button>
        <Button variant="outline" onClick={handleCopy} className="gap-2 shadow-sm">
          {copied ? (
            <Check className="size-4" />
          ) : (
            <Copy className="size-4" />
          )}
          {copied ? "コピー完了" : "テキストをコピー"}
        </Button>
      </div>
    </section>
  )
}
