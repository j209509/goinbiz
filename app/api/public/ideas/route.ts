import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

function toMs(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v?.toMillis === "function") return v.toMillis();
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function computePublishAtMs(doc: any): number {
  const createdAtMs = toMs(doc?.createdAtMs) ?? toMs(doc?.createdAt) ?? 0;
  const base = toMs(doc?.publishAtMs) ?? (createdAtMs ? createdAtMs + 24 * 60 * 60 * 1000 : Date.now());
  const prot = toMs(doc?.protectedUntilMs);
  return prot != null ? Math.max(base, prot) : base;
}

function isPublic(doc: any, nowMs: number): boolean {
  const pubAt = computePublishAtMs(doc);
  return nowMs >= pubAt;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") ?? "latest").trim();
    const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit") ?? 30) || 30));

    const nowMs = Date.now();

    // Firestore のクエリ制約上、最新/ランキングともに多めに取得→サーバで公開判定→整形
    const snap = await db
      .collection("ideas")
      .orderBy("createdAtMs", "desc")
      .limit(mode === "ranking" ? 200 : 120)
      .get();

    const items = snap.docs
      .map((d) => {
        const data = d.data() ?? {};
        const idea = data.idea ?? {};
        return {
          id: d.id,
          word1: data.word1 ?? "",
          word2: data.word2 ?? "",
          createdAtMs: toMs(data.createdAtMs) ?? toMs(data.createdAt) ?? null,
          publishAtMs: computePublishAtMs(data),
          protectedUntilMs: toMs(data.protectedUntilMs) ?? null,
          overallScore: Number(idea.overallScore ?? 0) || 0,
          marketScore: Number(idea.marketScore ?? 0) || 0,
          profitScore: Number(idea.profitScore ?? 0) || 0,
          buzzScore: Number(idea.buzzScore ?? 0) || 0,
          serviceName: idea.serviceName ?? "",
          concept: idea.concept ?? "",
          target: idea.target ?? "",
          revenueModel: idea.revenueModel ?? "",
        };
      })
      .filter((x) => isPublic(x, nowMs));

    let out = items;
    if (mode === "ranking") {
      out = [...items]
        .sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0))
        .slice(0, limit);
    } else {
      out = items.slice(0, limit);
    }

    return NextResponse.json({ ok: true, mode, items: out });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
