"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowRight, X, Loader2 } from "lucide-react"

const popularCombos = [
  { word1: "金魚", word2: "サブスク" },
  { word1: "お葬式", word2: "AI" },
  { word1: "ラーメン", word2: "宇宙" },
  { word1: "猫", word2: "保険" },
  { word1: "温泉", word2: "ブロックチェーン" },
  { word1: "盆栽", word2: "マッチング" },
]

interface HeroSectionProps {
  word1: string
  word2: string
  onWord1Change: (value: string) => void
  onWord2Change: (value: string) => void
  onGenerate: () => void
  isGenerating: boolean
  loadingStep: string
}

export function HeroSection({
  word1,
  word2,
  onWord1Change,
  onWord2Change,
  onGenerate,
  isGenerating,
  loadingStep,
}: HeroSectionProps) {
  const handleComboClick = (combo: { word1: string; word2: string }) => {
    onWord1Change(combo.word1)
    onWord2Change(combo.word2)
  }

  return (
    <section className="relative z-10 flex flex-col items-center gap-12 pt-28 pb-20 px-4">
      {/* Title */}
      <div className="flex flex-col items-center gap-5 text-center max-w-2xl">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground text-balance leading-[1.1]">
          {"関係ない2つを、"}
          <br />
          <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            {"強引にビジネスにする。"}
          </span>
        </h1>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md">
          {"2つの無関係なワードを入力するだけ。AIが強引に事業化します。"}
        </p>
      </div>

      {/* Input Area */}
      <div className="flex flex-col items-center gap-4 w-full max-w-xl">
        <div className="flex flex-col md:flex-row items-center gap-3 w-full">
          <Input
            placeholder="例）金魚"
            value={word1}
            onChange={(e) => onWord1Change(e.target.value)}
            className="h-12 text-base bg-card shadow-sm"
          />
          <span className="text-muted-foreground shrink-0">
            <X className="size-4" />
          </span>
          <Input
            placeholder="例）サブスク"
            value={word2}
            onChange={(e) => onWord2Change(e.target.value)}
            className="h-12 text-base bg-card shadow-sm"
          />
        </div>
        <Button
          size="lg"
          onClick={onGenerate}
          disabled={isGenerating || !word1.trim() || !word2.trim()}
          className="h-12 px-10 w-full md:w-auto text-base font-semibold"
        >
          {isGenerating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {loadingStep}
            </>
          ) : (
            <>
              {"事業化する"}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>

      {/* Popular Combos */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xl">
        <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
          {"人気の組み合わせ"}
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {popularCombos.map((combo, i) => (
            <button
              key={i}
              onClick={() => handleComboClick(combo)}
              className="px-3 py-1.5 text-xs font-medium rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:shadow-sm transition-all cursor-pointer"
            >
              {combo.word1}
              {" x "}
              {combo.word2}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
