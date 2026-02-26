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
import { Button } from "@/components/ui/button"
import { generateIdea } from "@/lib/generate-idea"
import type { GeneratedIdea } from "@/lib/types"

const LOADING_STEPS = [
  { text: "掛け算中...", duration: 800 },
  { text: "事業化中...", duration: 1000 },
  { text: "採点中...", duration: 700 },
]

// API が落ちた時にローカル生成へフォールバックするか（デフォルトOFF）
// 例: NEXT_PUBLIC_USE_LOCAL_FALLBACK=1 のときだけ有効
const USE_LOCAL_FALLBACK = process.env.NEXT_PUBLIC_USE_LOCAL_FALLBACK === "1"

async function generateIdeaViaApi(
  word1: string,
  word2: string
): Promise<{ idea: GeneratedIdea; ideaId?: string }> {
  const r = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word1, word2 }),
  })

  const data = await r.json().catch(() => null)
  if (!r.ok || !data?.ok || !data?.idea) {
    const msg = data?.error ? String(data.error) : `HTTP ${r.status}`
    throw new Error(msg)
  }

  return {
    idea: data.idea as GeneratedIdea,
    ideaId: typeof data.ideaId === "string" ? data.ideaId : undefined,
  }
}

async function deepenIdeaViaApi(params: {
  word1: string
  word2: string
  idea: GeneratedIdea
  ideaId?: string
}): Promise<Pick<
  GeneratedIdea,
  "executionPlan" | "costEstimate" | "channelStrategy" | "techStack" | "riskAndFailurePatterns"
>> {
  const r = await fetch("/api/deepen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      word1: params.word1,
      word2: params.word2,
      ideaId: params.ideaId,
      idea: {
        serviceName: params.idea.serviceName,
        concept: params.idea.concept,
        target: params.idea.target,
        revenueModel: params.idea.revenueModel,
        marketScore: params.idea.marketScore,
        profitScore: params.idea.profitScore,
        buzzScore: params.idea.buzzScore,
        overallScore: params.idea.overallScore,
        mvp: params.idea.mvp,
        monetize: params.idea.monetize,
        expansion: params.idea.expansion,
        actionPlan: params.idea.actionPlan,
      },
    }),
  })

  const data = await r.json().catch(() => null)
  if (!r.ok || !data?.ok || !data?.deep) {
    const msg = data?.error ? String(data.error) : `HTTP ${r.status}`
    throw new Error(msg)
  }

  return data.deep
}

export default function Page() {
  const [word1, setWord1] = useState("")
  const [word2, setWord2] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingStep, setLoadingStep] = useState("")
  const [idea, setIdea] = useState<GeneratedIdea | null>(null)
  const [ideaId, setIdeaId] = useState<string | undefined>(undefined)
  const [resultKey, setResultKey] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [isDeepening, setIsDeepening] = useState(false)
  const [deepenError, setDeepenError] = useState<string>("")
  const resultRef = useRef<HTMLDivElement>(null)

  const handleGenerate = useCallback(() => {
    if (!word1.trim() || !word2.trim()) return
    setIsGenerating(true)
    setIdea(null)
    setIdeaId(undefined)
    setErrorMsg("")
    setDeepenError("")

    let stepIndex = 0

    const runStep = () => {
      if (stepIndex < LOADING_STEPS.length) {
        setLoadingStep(LOADING_STEPS[stepIndex].text)
        const dur = LOADING_STEPS[stepIndex].duration
        stepIndex++
        setTimeout(runStep, dur)
        return
      }

      ;(async () => {
        try {
          const generated = await generateIdeaViaApi(word1, word2)
          setIdea(generated.idea)
          setIdeaId(generated.ideaId)
        } catch (e: any) {
          const msg = e?.message ? String(e.message) : "API error"
          if (USE_LOCAL_FALLBACK) {
            const fallback = generateIdea(word1, word2)
            setIdea(fallback)
            setErrorMsg(`API失敗のためローカル生成に切り替えました: ${msg}`)
          } else {
            setIdea(null)
            setErrorMsg(`生成に失敗しました: ${msg}`)
          }
          console.error("/api/generate failed:", e)
        } finally {
          setResultKey((k) => k + 1)
          setIsGenerating(false)
          setLoadingStep("")
        }
      })()
    }

    runStep()
  }, [word1, word2])

  const canDeepen =
    !!idea &&
    !isGenerating &&
    !isDeepening &&
    !idea.executionPlan &&
    !idea.costEstimate &&
    !idea.channelStrategy &&
    !idea.techStack &&
    !idea.riskAndFailurePatterns

  const handleDeepen = useCallback(() => {
    if (!idea) return

    setIsDeepening(true)
    setDeepenError("")

    ;(async () => {
      try {
        const deep = await deepenIdeaViaApi({ word1, word2, idea, ideaId })
        setIdea({ ...idea, ...deep })
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : "API error"
        setDeepenError(`詳細化に失敗しました: ${msg}`)
        console.error("/api/deepen failed:", e)
      } finally {
        setIsDeepening(false)
      }
    })()
  }, [idea, word1, word2, ideaId])

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

      {!!errorMsg && (
        <div className="max-w-4xl mx-auto px-4 -mt-4 pb-4">
          <div className="rounded-lg border border-border/60 bg-background/70 backdrop-blur-sm px-4 py-3 text-sm text-muted-foreground">
            {errorMsg}
          </div>
        </div>
      )}

      {/* Result Section */}
      {idea && (
        <div ref={resultRef} key={resultKey}>
          <div className="max-w-4xl mx-auto px-4 pb-4">
            <ProtectionStatusCard />
          </div>
          <ResultSection idea={idea} />

          <div className="max-w-4xl mx-auto px-4 -mt-10 pb-10">
            <div className="flex flex-col items-center gap-3">
              {canDeepen && (
                <Button onClick={handleDeepen} disabled={isDeepening} className="w-full sm:w-auto">
                  {isDeepening ? "詳細化中..." : "もっと詳しく"}
                </Button>
              )}

              {!!deepenError && (
                <div className="w-full rounded-lg border border-border/60 bg-background/70 backdrop-blur-sm px-4 py-3 text-sm text-muted-foreground">
                  {deepenError}
                </div>
              )}
            </div>
          </div>

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
