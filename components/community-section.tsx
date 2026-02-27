"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableCell, TableHead, TableHeader, TableRow, TableBody } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, TrendingUp, Clock, Flame, Globe } from "lucide-react";

type SortKey = "score" | "buzz" | "new";

type PublicIdeaSummary = {
  id: string;
  word1: string;
  word2: string;
  serviceName: string;
  concept: string;
  overallScore: number;
  marketScore: number;
  profitScore: number;
  buzzScore: number;
  createdAtMs: number | null;
};

type IdeaDetailResponse = {
  ok: boolean;
  id: string;
  word1: string;
  word2: string;
  idea: any;
};

function scoreVariant(score: number) {
  if (score >= 90) return "default";
  if (score >= 80) return "secondary";
  return "outline";
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "outline" {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  return "outline";
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base font-bold text-foreground">{"1"}</span>;
  if (rank === 2) return <span className="text-base font-semibold text-muted-foreground">{"2"}</span>;
  if (rank === 3) return <span className="text-base font-semibold text-muted-foreground">{"3"}</span>;
  return <span className="text-sm text-muted-foreground">{rank}</span>;
}

function fmtDate(ms: number | null) {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleDateString();
  } catch {
    return "";
  }
}

export function CommunitySection() {
  const [items, setItems] = useState<PublicIdeaSummary[]>([]);
  const [ranking, setRanking] = useState<PublicIdeaSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortKey, setSortKey] = useState<SortKey>("score");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<IdeaDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const [a, b] = await Promise.all([
          fetch("/api/public/ideas?mode=latest&limit=24").then((r) => r.json()),
          fetch("/api/public/ideas?mode=ranking&limit=10").then((r) => r.json()),
        ]);
        if (cancelled) return;
        setItems(Array.isArray(a?.items) ? a.items : []);
        setRanking(Array.isArray(b?.items) ? b.items : []);
      } catch {
        if (cancelled) return;
        setItems([]);
        setRanking([]);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load(id: string) {
      try {
        setDetailLoading(true);
        setDetail(null);
        const res = await fetch(`/api/ideas/get?ideaId=${encodeURIComponent(id)}`).then((r) => r.json());
        if (cancelled) return;
        if (res?.ok) setDetail(res);
      } finally {
        if (cancelled) return;
        setDetailLoading(false);
      }
    }
    if (selectedId) load(selectedId);
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const sortedIdeas = useMemo(() => {
    const src = Array.isArray(items) ? [...items] : [];
    switch (sortKey) {
      case "score":
        return src.sort(
          (a, b) =>
            (b.overallScore ?? 0) - (a.overallScore ?? 0) || (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0),
        );
      case "buzz":
        return src.sort(
          (a, b) => (b.buzzScore ?? 0) - (a.buzzScore ?? 0) || (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0),
        );
      case "new":
        return src.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
      default:
        return src;
    }
  }, [items, sortKey]);

  const displayIdeas = useMemo(() => {
    return sortedIdeas.slice(0, 9);
  }, [sortedIdeas]);

  const rankingRows = useMemo(() => {
    return ranking.map((item, i) => ({
      rank: i + 1,
      id: item.id,
      title: `${item.word1} × ${item.word2}`,
      score: item.overallScore,
      date: fmtDate(item.createdAtMs),
    }));
  }, [ranking]);

  return (
    <section className="relative z-10 flex flex-col gap-20 px-4 w-full max-w-4xl mx-auto pb-24">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-balance text-center tracking-tight">
            {"みんなのアイデア"}
          </h2>
          <p className="text-sm text-muted-foreground">{"他のユーザーが生成したアイデア"}</p>
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(loading ? Array.from({ length: 9 }).map((_, i) => i) : displayIdeas).map((item: any, i: number) => {
            if (typeof item === "number") {
              return (
                <Card key={`s-${item}`} className="animate-pulse shadow-sm">
                  <CardContent className="flex flex-col gap-4 pt-6">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-1/2 bg-muted rounded" />
                      <div className="h-5 w-16 bg-muted rounded" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-6 w-3/4 bg-muted rounded" />
                      <div className="h-4 w-1/3 bg-muted rounded" />
                    </div>
                    <div className="h-4 w-24 bg-muted rounded" />
                  </CardContent>
                </Card>
              );
            }

            const title = `${item.word1} × ${item.word2}`;
            const date = fmtDate(item.createdAtMs);
            return (
              <Card
                key={item.id ?? `${title}-${i}`}
                className="group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 shadow-sm cursor-pointer"
                onClick={() => item?.id && setSelectedId(item.id)}
              >
                <CardContent className="flex flex-col gap-4 pt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground tracking-wide">
                      {item.word1}
                      {" x "}
                      {item.word2}
                    </span>
                    <Badge variant={getScoreBadgeVariant(item.overallScore)} className="text-xs tabular-nums">
                      {item.overallScore}
                      {"/100"}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground group-hover:text-foreground/80 transition-colors">
                        {item.serviceName}
                      </span>
                      <Badge
                        variant="outline"
                        className="gap-1 text-[10px] px-1.5 py-0 h-5 text-muted-foreground border-border/60"
                      >
                        <Globe className="size-2.5" />
                        {"公開中"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{date}</span>
                  </div>

                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Flame className="size-3.5" />
                    <span className="text-xs tabular-nums">{item.buzzScore}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2.5">
            <Trophy className="size-5 text-foreground" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-balance text-center tracking-tight">
              {"スコアランキング"}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">{"総合スコア上位のアイデア"}</p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">{"#"}</TableHead>
                  <TableHead>{"アイデア"}</TableHead>
                  <TableHead className="w-24 text-center">{"スコア"}</TableHead>
                  <TableHead className="w-32 text-center hidden md:table-cell">{"生成日"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingRows.map((row) => (
                  <TableRow
                    key={row.rank}
                    className="group cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedId(row.id)}
                  >
                    <TableCell className="text-center">
                      <RankBadge rank={row.rank} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{row.title}</span>
                        <Badge
                          variant="outline"
                          className="gap-1 text-[10px] px-1.5 py-0 h-5 text-muted-foreground border-border/60"
                        >
                          <Globe className="size-2.5" />
                          {"公開中"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={scoreVariant(row.score)} className="text-xs tabular-nums">
                        {row.score}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm hidden md:table-cell">
                      {row.date}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedId} onOpenChange={(o) => (!o ? setSelectedId(null) : null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{detail?.word1 && detail?.word2 ? `${detail.word1} × ${detail.word2}` : "アイデア詳細"}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[75vh] overflow-y-auto pr-1 [@supports(-webkit-overflow-scrolling:touch)]:[-webkit-overflow-scrolling:touch]">
            {detailLoading ? (
              <div className="space-y-3">
                <div className="h-5 w-2/3 bg-muted rounded animate-pulse" />
                <div className="h-4 w-full bg-muted rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
              </div>
            ) : detail?.idea ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">サービス名</p>
                  <p className="text-base">{detail.idea.serviceName}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-xs text-muted-foreground">総合</p>
                      <p className="text-2xl tabular-nums">{detail.idea.overallScore}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-xs text-muted-foreground">市場性</p>
                      <p className="text-2xl tabular-nums">{detail.idea.marketScore}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-xs text-muted-foreground">収益性</p>
                      <p className="text-2xl tabular-nums">{detail.idea.profitScore}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-xs text-muted-foreground">バズ度</p>
                      <p className="text-2xl tabular-nums">{detail.idea.buzzScore}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">コンセプト</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{detail.idea.concept}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">ターゲット</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{detail.idea.target}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">収益モデル</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{detail.idea.monetization}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">実行プラン</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{detail.idea.actionPlan}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">読み込みに失敗しました。</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
