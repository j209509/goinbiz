"use client"

// ビルド時の静的プリレンダリングを避ける（prerender で落ちるのを回避）
export const dynamic = "force-dynamic"

import { useState, useCallback, useRef, useEffect } from "react"
import { HeroSection } from "@/components/hero-section"
import { ProtectionStatusCard } from "@/components/protection-status-card"
import { ResultSection } from "@/components/result-section"
import { ShareSection } from "@/components/share-section"
import { CommunitySection } from "@/components/community-section"
import { Separator } from "@/components/ui/separator"
import { generateIdea } from "@/lib/generate-idea"
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
  const [resultKey, setResultKey] = useState(0)
  const resultRef = useRef<HTMLDivElement>(null)

  const handleGenerate = useCallback(() => {
    if (!word1.trim() || !word2.trim()) return
    setIsGenerating(true)
    setIdea(null)

    let stepIndex = 0

    const runStep = () => {
      if (stepIndex < LOADING_STEPS.length) {
        setLoadingStep(LOADING_STEPS[stepIndex].text)
        const dur = LOADING_STEPS[stepIndex].duration
        stepIndex++
        setTimeout(runStep, dur)
      } else {
        const generated = generateIdea(word1, word2)
        setIdea(generated)
        setResultKey((k) => k + 1)
        setIsGenerating(false)
        setLoadingStep("")
      }
    }

    runStep()
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
            <ProtectionStatusCard />
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
