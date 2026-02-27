"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

function pickText(obj: any, keys: string[]): string {
  if (!obj) return "";
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

function clampScore(n: any) {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function AnimatedNumber({ target, duration = 900 }: { target: number; duration?: number }) {
  const safeTarget = clampScore(target);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = current;
    const delta = safeTarget - from;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCurrent(Math.round(from + delta * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeTarget, duration]);

  return <>{current}</>;
}

function OverallScoreRing({ score }: { score: number }) {
  const s = clampScore(score);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (s / 100) * circumference;

  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const t = setTimeout(() => setOffset(targetOffset), 30);
    return () => clearTimeout(t);
  }, [targetOffset]);

  const ringColor =
    s >= 80 ? "text-emerald-500" : s >= 60 ? "text-amber-500" : "text-red-400";

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
            strokeWidth="6"
            className="text-muted/60"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={ringColor}
            style={
              {
                transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)",
              } as CSSProperties
            }
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-foreground tabular-nums">
            <AnimatedNumber target={s} duration={900} />
          </span>
          <span className="text-xs text-muted-foreground font-medium">{"/ 100"}</span>
        </div>
      </div>

      <span className="text-sm font-semibold text-foreground tracking-wide">{"総合スコア"}</span>
    </div>
  );
}

function ScoreBar({
  label,
  score,
  delayMs,
}: {
  label: string;
  score: number;
  delayMs: number;
}) {
  const s = clampScore(score);
  const barColor = s >= 80 ? "bg-emerald-500" : s >= 60 ? "bg-amber-500" : "bg-red-400";

  const [w, setW] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setW(s), Math.max(0, delayMs));
    return () => clearTimeout(t);
  }, [s, delayMs]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <span className="text-sm font-bold text-foreground tabular-nums">
          <AnimatedNumber target={s} duration={800} />
        </span>
      </div>

      <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={
            {
              width: `${w}%`,
              transition: "width 900ms cubic-bezier(0.22, 1, 0.36, 1)",
            } as CSSProperties
          }
        />
      </div>
    </div>
  );
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
            (b.overallScore ?? 0) - (a.overallScore ?? 0) ||
            (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0),
        );
      case "buzz":
        return src.sort(
          (a, b) =>
            (b.buzzScore ?? 0) - (a.buzzScore ?? 0) ||
            (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0),
        );
      case "new":
        return src.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
      default:
        return src;
    }
  }, [items, sortKey]);

  const displayIdeas = useMemo(() => sortedIdeas.slice(0, 9), [sortedIdeas]);

  const rankingRows = useMemo(() => {
    return ranking.map((item, i) => ({
      rank: i + 1,
      id: item.id,
      title: `${item.word1} × ${item.word2}`,
      score: item.overallScore,
      date: fmtDate(item.createdAtMs),
    }));
  }, [ranking]);

  const detailTexts = useMemo(() => {
    const idea = detail?.idea;
    return {
      concept: pickText(idea, ["concept"]),
      target: pickText(idea, ["target"]),
      revenueModel: pickText(idea, ["revenueModel", "monetize", "monetization"]),
      actionPlan: pickText(idea, ["actionPlan", "actionplan", "plan"]),
      mvp: pickText(idea, ["mvp"]),
      expansion: pickText(idea, ["expansion"]),
      pickReason: pickText(idea, ["pickReason", "reason"]),
    };
  }, [detail]);

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
            <DialogTitle>
              {detail?.word1 && detail?.word2 ? `${detail.word1} × ${detail.word2}` : "アイデア詳細"}
            </DialogTitle>
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

                <Card className="shadow-sm">
                  <CardContent className="py-6">
                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                      <div className="shrink-0">
                        <OverallScoreRing score={clampScore(detail.idea.overallScore)} />
                      </div>
                      <div className="flex-1 w-full flex flex-col gap-5">
                        <ScoreBar label="市場性" score={clampScore(detail.idea.marketScore)} delayMs={150} />
                        <ScoreBar label="収益性" score={clampScore(detail.idea.profitScore)} delayMs={250} />
                        <ScoreBar label="バズ度" score={clampScore(detail.idea.buzzScore)} delayMs={350} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {detailTexts.concept ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">コンセプト</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{detailTexts.concept}</p>
                  </div>
                ) : null}

                {detailTexts.target ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">ターゲット</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{detailTexts.target}</p>
                  </div>
                ) : null}

                {detailTexts.revenueModel ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">収益モデル</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{detailTexts.revenueModel}</p>
                  </div>
                ) : null}

                {detailTexts.actionPlan ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">実行プラン</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{detailTexts.actionPlan}</p>
                  </div>
                ) : null}

                {detailTexts.mvp ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">MVP</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{detailTexts.mvp}</p>
                  </div>
                ) : null}

                {detailTexts.expansion ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">拡張</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{detailTexts.expansion}</p>
                  </div>
                ) : null}

                {detailTexts.pickReason ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">選定理由</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{detailTexts.pickReason}</p>
                  </div>
                ) : null}
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
