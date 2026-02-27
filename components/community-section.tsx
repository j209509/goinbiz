"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

export function CommunitySection() {
  const [latest, setLatest] = useState<PublicIdeaSummary[]>([]);
  const [ranking, setRanking] = useState<PublicIdeaSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<IdeaDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const [a, b] = await Promise.all([
          fetch("/api/public/ideas?mode=latest&limit=12").then((r) => r.json()),
          fetch("/api/public/ideas?mode=ranking&limit=10").then((r) => r.json()),
        ]);
        if (cancelled) return;
        setLatest(Array.isArray(a?.items) ? a.items : []);
        setRanking(Array.isArray(b?.items) ? b.items : []);
      } catch {
        if (cancelled) return;
        setLatest([]);
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

  const rankingRows = useMemo(() => {
    return ranking.map((item, i) => ({
      rank: i + 1,
      id: item.id,
      title: `${item.word1} × ${item.word2}`,
      score: item.overallScore,
      date: item.createdAtMs ? new Date(item.createdAtMs).toLocaleDateString() : "",
    }));
  }, [ranking]);

  return (
    <section className="py-20 px-4 border-t">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">みんなのアイデア</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            公開されたアイデアがここに並びます（生成後24時間、または「今すぐ公開」）。
          </p>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-semibold">新着</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(loading ? Array.from({ length: 4 }).map((_, i) => i) : latest).map((item: any) => {
              if (typeof item === "number") {
                return (
                  <Card key={`s-${item}`} className="animate-pulse">
                    <CardHeader className="pb-3">
                      <div className="h-5 w-3/4 bg-muted rounded" />
                      <div className="h-4 w-1/3 bg-muted rounded" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 w-full bg-muted rounded" />
                      <div className="h-4 w-5/6 bg-muted rounded mt-2" />
                    </CardContent>
                  </Card>
                );
              }

              const title = `${item.word1} × ${item.word2}`;
              return (
                <Card
                  key={item.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedId(item.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-tight">{title}</CardTitle>
                      <Badge variant={scoreVariant(item.overallScore)} className="shrink-0 tabular-nums">
                        {item.overallScore}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.serviceName}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{item.concept}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-semibold">ランキング</h3>
          <Card>
            <CardHeader>
              <CardTitle>スコア上位</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">順位</TableHead>
                    <TableHead>アイデア</TableHead>
                    <TableHead className="w-24 text-center">スコア</TableHead>
                    <TableHead className="w-32 text-center hidden md:table-cell">作成日</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankingRows.map((row) => (
                    <TableRow
                      key={row.rank}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedId(row.id)}
                    >
                      <TableCell className="font-medium text-center">{row.rank}</TableCell>
                      <TableCell className="font-medium">{row.title}</TableCell>
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
      </div>

      <Dialog open={!!selectedId} onOpenChange={(o) => (!o ? setSelectedId(null) : null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {detail?.word1 && detail?.word2 ? `${detail.word1} × ${detail.word2}` : "アイデア詳細"}
            </DialogTitle>
          </DialogHeader>

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
                <p className="whitespace-pre-wrap leading-relaxed">{detail.idea.revenueModel}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">MVP</p>
                <p className="whitespace-pre-wrap leading-relaxed">{detail.idea.mvp}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">マネタイズ</p>
                <p className="whitespace-pre-wrap leading-relaxed">{detail.idea.monetize}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">拡張アイデア</p>
                <p className="whitespace-pre-wrap leading-relaxed">{detail.idea.expansion}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">アクションプラン</p>
                <p className="whitespace-pre-wrap leading-relaxed">{detail.idea.actionPlan}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">読み込みに失敗しました。</p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
