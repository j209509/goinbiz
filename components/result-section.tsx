"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { GeneratedIdea } from "@/lib/types"
import { useEffect, useRef, useState } from "react"

function AnimatedNumber({ target, duration = 1000 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate)
      }
    }
    ref.current = requestAnimationFrame(animate)
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current)
    }
  }, [target, duration])

  return <>{current}</>
}

function OverallScoreRing({ score }: { score: number }) {
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-emerald-500"
    if (s >= 60) return "text-amber-500"
    return "text-red-400"
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-36">
        <svg className="size-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-muted/60"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            className={`${getScoreColor(score)} animate-score-ring`}
            style={{
              "--circumference": circumference,
              "--target-offset": strokeDashoffset,
            } as React.CSSProperties}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-foreground tabular-nums">
            <AnimatedNumber target={score} duration={1200} />
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {"/ 100"}
          </span>
        </div>
      </div>
      <span className="text-sm font-semibold text-foreground tracking-wide">
        {"総合スコア"}
      </span>
    </div>
  )
}

function ScoreBar({ label, score, delay }: { label: string; score: number; delay: string }) {
  const getBarColor = (s: number) => {
    if (s >= 80) return "bg-emerald-500"
    if (s >= 60) return "bg-amber-500"
    return "bg-red-400"
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <span className="text-sm font-bold text-foreground tabular-nums">
          <AnimatedNumber target={score} duration={1000} />
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
        <div
          className={`h-full rounded-full animate-progress-fill ${getBarColor(score)}`}
          style={{
            width: `${score}%`,
            animationDelay: delay,
          }}
        />
      </div>
    </div>
  )
}

interface ResultSectionProps {
  idea: GeneratedIdea
}

export function ResultSection({ idea }: ResultSectionProps) {
  return (
    <section className="relative z-10 flex flex-col gap-6 px-4 w-full max-w-4xl mx-auto pb-16">
      {/* Score Card - Full Width, Most Prominent */}
      <Card className="animate-slide-up shadow-lg border-border/60">
        <CardContent className="py-8">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Overall Score Ring */}
            <div className="shrink-0">
              <OverallScoreRing score={idea.overallScore} />
            </div>

            {/* Score Bars */}
            <div className="flex-1 w-full flex flex-col gap-5">
              <ScoreBar label="市場性" score={idea.marketScore} delay="0.3s" />
              <ScoreBar label="収益性" score={idea.profitScore} delay="0.5s" />
              <ScoreBar label="バズ度" score={idea.buzzScore} delay="0.7s" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Overview */}
        <Card className="animate-slide-up animate-delay-1 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">{"事業概要"}</CardTitle>
            <CardDescription>{"生成されたアイデア"}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">
                {"サービス名"}
              </span>
              <span className="text-2xl font-bold text-foreground tracking-tight">
                {idea.serviceName}
              </span>
            </div>
            <Separator />
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">
                {"コンセプト"}
              </span>
              <p className="text-sm text-foreground leading-relaxed">{idea.concept}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">
                {"ターゲット"}
              </span>
              <Badge variant="outline" className="w-fit text-xs">{idea.target}</Badge>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">
                {"収益モデル"}
              </span>
              <p className="text-sm text-foreground leading-relaxed">{idea.revenueModel}</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Details */}
        <Card className="animate-slide-up animate-delay-2 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">{"詳細プラン"}</CardTitle>
            <CardDescription>{"実行に向けたアクション"}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <DetailBlock label="MVP案" content={idea.mvp} />
            <Separator />
            <DetailBlock label="マネタイズ戦略" content={idea.monetize} />
            <Separator />
            <DetailBlock label="拡張アイデア" content={idea.expansion} />
            <Separator />
            <DetailBlock label="初期アクションプラン" content={idea.actionPlan} />
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function DetailBlock({ label, content }: { label: string; content: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">
        {label}
      </span>
      <p className="text-sm text-foreground leading-relaxed">{content}</p>
    </div>
  )
}
