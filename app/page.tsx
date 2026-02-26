"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { HeroSection } from "@/components/hero-section"
import { ProtectionStatusCard } from "@/components/protection-status-card"
import { ResultSection } from "@/components/result-section"
import { ShareSection } from "@/components/share-section"
import { CommunitySection } from "@/components/community-section"
import { Separator } from "@/components/ui/separator"
import type { GeneratedIdea } from "@/lib/types"

const LOADING_STEPS = [
  { text: "掛け算中...", duration: 800 },
  { text: "事業化中...", duration: 1000 },
  { text: "採点中...", duration: 700 },
]

export default function Page() {
  const [word1, setWord1] = useState("")
  const [word2, setWord2] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingStep, setLoadingStep] = useState("")
  const [idea, setIdea] = useState<GeneratedIdea | null>(null)
  const [meta, setMeta] = useState<{ id: string; publicStatus: string; revealAt?: string | null } | null>(null)
  const [resultKey, setResultKey] = useState(0)
  const resultRef = useRef<HTMLDivElement>(null)

  const handleGenerate = useCallback(async () => {
    const a = word1.trim()
    const b = word2.trim()

    if (!a || !b) {
      setError("2つとも入力してください")
      return
    }

    setError("")
    setIsGenerating(true)
    setLoadingStep("")
    setIdea(null)
    setMeta(null)
    setResultKey(Date.now())

    try {
      for (const step of LOADING_STEPS) {
        setLoadingStep(step.text)
        await new Promise((r) => setTimeout(r, step.duration))
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordA: a, wordB: b }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        const msg = data?.error || `Request failed (${res.status})`
        throw new Error(msg)
      }

      setIdea(data.idea)
      setMeta({ id: data.id, publicStatus: data.publicStatus, revealAt: data.revealAt ?? null })
      setLoadingStep("")
    } catch (e: any) {
      setError(e?.message || "エラーが発生しました")
      setLoadingStep("")
    } finally {
      setIsGenerating(false)
    }
  }, [word1, word2])

  // Scroll to results when generated
  useEffect(() => {
    if (idea && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
    }
  }, [idea, resultKey])

  return (
    <main className="min-h-screen noise-bg bg-gradient-to-b from-background via-background to-muted/30">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-foreground flex items-center justify-center">
            <span className="text-background text-sm font-bold">{"G"}</span>
          </div>
          <span className="font-semibold text-foreground text-sm tracking-tight">
            {"Goin Business"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground hidden md:block font-medium tracking-wide">
          {"強引事業化ジェネレーター"}
        </span>
      </header>

      {/* Hero + Input */}
      {error ? (
        <div className="mx-auto max-w-xl px-4 pt-4 text-sm text-red-600">{error}</div>
      ) : null}

      <HeroSection
        word1={word1}
        word2={word2}
        onWord1Change={setWord1}
        onWord2Change={setWord2}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        loadingStep={loadingStep}
      />

      {/* Result Section */}
      {idea && (
        <div ref={resultRef} key={resultKey}>
          <div className="max-w-4xl mx-auto px-4 pb-4">
            <ProtectionStatusCard publicStatus={meta?.publicStatus} revealAt={meta?.revealAt ?? undefined} />
          </div>
          <ResultSection idea={idea} />
          <ShareSection
            serviceName={idea.serviceName}
            concept={idea.concept}
            word1={word1}
            word2={word2}
            overallScore={idea.overallScore}
          />
        </div>
      )}

      {/* Divider */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <Separator className="opacity-40" />
      </div>

      {/* Community Section */}
      <CommunitySection />

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-10 px-4 bg-muted/20">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">
            {"© 2026 Goin Business. All rights reserved."}
          </span>
          <span className="text-xs text-muted-foreground">
            {"※ 生成されるアイデアはAI/アルゴリズムによるジョークです"}
          </span>
        </div>
      </footer>
    </main>
  )
}
