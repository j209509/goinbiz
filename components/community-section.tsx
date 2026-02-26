"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Heart, Trophy, TrendingUp, Clock, Flame, Globe } from "lucide-react"

type SortKey = "score" | "buzz" | "new"

const communityIdeas = [
  {
    word1: "金魚",
    word2: "サブスク",
    serviceName: "KingyoBox",
    overallScore: 78,
    buzzScore: 88,
    likes: 124,
    date: "2026/02/25",
  },
  {
    word1: "お葬式",
    word2: "AI",
    serviceName: "FarewellAI",
    overallScore: 85,
    buzzScore: 72,
    likes: 98,
    date: "2026/02/24",
  },
  {
    word1: "ラーメン",
    word2: "宇宙",
    serviceName: "CosmicNoodle",
    overallScore: 62,
    buzzScore: 95,
    likes: 203,
    date: "2026/02/23",
  },
  {
    word1: "猫",
    word2: "保険",
    serviceName: "NekoPro",
    overallScore: 91,
    buzzScore: 68,
    likes: 167,
    date: "2026/02/22",
  },
  {
    word1: "温泉",
    word2: "ブロックチェーン",
    serviceName: "OnsenChain",
    overallScore: 54,
    buzzScore: 82,
    likes: 89,
    date: "2026/02/21",
  },
  {
    word1: "盆栽",
    word2: "マッチング",
    serviceName: "BonsaiConnect",
    overallScore: 73,
    buzzScore: 76,
    likes: 145,
    date: "2026/02/20",
  },
]

const rankingData = [
  { rank: 1, word1: "猫", word2: "保険", overallScore: 91, date: "2026/02/25" },
  { rank: 2, word1: "お葬式", word2: "AI", overallScore: 85, date: "2026/02/24" },
  { rank: 3, word1: "金魚", word2: "サブスク", overallScore: 78, date: "2026/02/23" },
  { rank: 4, word1: "盆栽", word2: "マッチング", overallScore: 73, date: "2026/02/22" },
  { rank: 5, word1: "ラーメン", word2: "宇宙", overallScore: 62, date: "2026/02/21" },
]

function getScoreBadgeVariant(score: number): "default" | "secondary" | "outline" {
  if (score >= 80) return "default"
  if (score >= 60) return "secondary"
  return "outline"
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base font-bold text-foreground">{"1"}</span>
  if (rank === 2) return <span className="text-base font-semibold text-muted-foreground">{"2"}</span>
  if (rank === 3) return <span className="text-base font-semibold text-muted-foreground">{"3"}</span>
  return <span className="text-sm text-muted-foreground">{rank}</span>
}

export function CommunitySection() {
  const [sortKey, setSortKey] = useState<SortKey>("score")

  const sortedIdeas = useMemo(() => {
    const sorted = [...communityIdeas]
    switch (sortKey) {
      case "score":
        return sorted.sort((a, b) => b.overallScore - a.overallScore)
      case "buzz":
        return sorted.sort((a, b) => b.likes - a.likes)
      case "new":
        return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      default:
        return sorted
    }
  }, [sortKey])

  return (
    <section className="relative z-10 flex flex-col gap-20 px-4 w-full max-w-4xl mx-auto pb-24">
      {/* Community Ideas */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-balance text-center tracking-tight">
            {"みんなのアイデア"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {"他のユーザーが生成したアイデア"}
          </p>
        </div>

        {/* Sort Tabs */}
        <div className="flex justify-center">
          <Tabs value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <TabsList>
              <TabsTrigger value="score" className="gap-1.5 text-xs">
                <TrendingUp className="size-3.5" />
                {"高スコア"}
              </TabsTrigger>
              <TabsTrigger value="buzz" className="gap-1.5 text-xs">
                <Flame className="size-3.5" />
                {"バズ度"}
              </TabsTrigger>
              <TabsTrigger value="new" className="gap-1.5 text-xs">
                <Clock className="size-3.5" />
                {"新着"}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedIdeas.map((idea, i) => (
            <Card
              key={`${idea.serviceName}-${i}`}
              className="group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
            >
              <CardContent className="flex flex-col gap-4 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground tracking-wide">
                    {idea.word1}
                    {" x "}
                    {idea.word2}
                  </span>
                  <Badge variant={getScoreBadgeVariant(idea.overallScore)} className="text-xs tabular-nums">
                    {idea.overallScore}
                    {"/100"}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground group-hover:text-foreground/80 transition-colors">
                      {idea.serviceName}
                    </span>
                    <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0 h-5 text-muted-foreground border-border/60">
                      <Globe className="size-2.5" />
                      {"公開中"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {idea.date}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Heart className="size-3.5" />
                  <span className="text-xs tabular-nums">{idea.likes}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Ranking */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2.5">
            <Trophy className="size-5 text-foreground" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-balance text-center tracking-tight">
              {"スコアランキング"}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {"総合スコア上位のアイデア"}
          </p>
        </div>
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">{"#"}</TableHead>
                  <TableHead>{"アイデア"}</TableHead>
                  <TableHead className="w-24 text-center">{"スコア"}</TableHead>
                  <TableHead className="w-32 text-center hidden md:table-cell">
                    {"生成日"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingData.map((item) => (
                  <TableRow key={item.rank} className="group">
                    <TableCell className="text-center">
                      <RankBadge rank={item.rank} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {item.word1}
                          {" x "}
                          {item.word2}
                        </span>
                        <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0 h-5 text-muted-foreground border-border/60">
                          <Globe className="size-2.5" />
                          {"公開中"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={getScoreBadgeVariant(item.overallScore)}
                        className="text-xs tabular-nums"
                      >
                        {item.overallScore}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm hidden md:table-cell">
                      {item.date}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
