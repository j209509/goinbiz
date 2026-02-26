import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

type GeneratedIdea = {
  serviceName: string;
  concept: string;
  target: string;
  revenueModel: string;
  marketScore: number; // 0-100
  profitScore: number; // 0-100
  buzzScore: number; // 0-100
  overallScore: number; // 0-100
  mvp: string;
  monetization: string;
  roadmap: string;
};

function clampScore(v: any): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function asText(v: any): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

function normalizeIdea(raw: any): GeneratedIdea {
  const idea: GeneratedIdea = {
    serviceName: asText(raw?.serviceName),
    concept: asText(raw?.concept),
    target: asText(raw?.target),
    revenueModel: asText(raw?.revenueModel),
    marketScore: clampScore(raw?.marketScore),
    profitScore: clampScore(raw?.profitScore),
    buzzScore: clampScore(raw?.buzzScore),
    overallScore: clampScore(raw?.overallScore),
    mvp: asText(raw?.mvp),
    monetization: asText(raw?.monetization),
    roadmap: asText(raw?.roadmap),
  };

  // 最低限の穴埋め（空のまま UI が崩れるのを防ぐ）
  if (!idea.serviceName) idea.serviceName = "新規サービス";
  if (!idea.concept) idea.concept = "2語を強引に結びつけた事業アイデア";
  if (!idea.target) idea.target = "一般ユーザー";
  if (!idea.revenueModel) idea.revenueModel = "サブスクリプション / 広告 / 手数料";
  if (!idea.mvp) idea.mvp = "入力→生成→共有ができる最小機能";
  if (!idea.monetization) idea.monetization = "無料枠＋有料プラン";
  if (!idea.roadmap) idea.roadmap = "週1: MVP / 週2: 改善 / 週3: 集客 / 週4: 収益化";
  return idea;
}

function extractJsonObject(text: string): any {
  // 余計な前置きが混ざっても最後に JSON だけ抜く
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("JSON not found");
  const jsonText = text.slice(start, end + 1);
  return JSON.parse(jsonText);
}

async function generateWithOpenAI(word1: string, word2: string): Promise<GeneratedIdea> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const system = [
    "あなたは事業アイデア生成の専門家です。",
    "必ず JSON だけを返してください（コードフェンスや説明文は禁止）。",
    "スコアは 0〜100 の整数で返してください。",
    "過激・危険・違法な提案は避け、一般的に公開可能な内容にしてください。",
  ].join("\n");

  const user = [
    `次の2語を強引に掛け合わせて、事業アイデアを1つ作ってください。`,
    `word1: ${word1}`,
    `word2: ${word2}`,
    "",
    "出力は次のJSONスキーマに厳密に一致させてください：",
    "{",
    '  "serviceName": "サービス名（短く）",',
    '  "concept": "一文でコンセプト",',
    '  "target": "想定ターゲット（短く）",',
    '  "revenueModel": "収益モデル（短く）",',
    '  "marketScore": 0,',
    '  "profitScore": 0,',
    '  "buzzScore": 0,',
    '  "overallScore": 0,',
    '  "mvp": "最小プロダクト（箇条書きではなく短文で）",',
    '  "monetization": "課金設計（短文）",',
    '  "roadmap": "4週間ロードマップ（短文）"',
    "}",
  ].join("\n");

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.9,
    }),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`OpenAI error: ${r.status} ${t}`);
  }

  const data: any = await r.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("OpenAI response is empty");

  const obj = extractJsonObject(content);
  return normalizeIdea(obj);
}

async function handleGenerate(word1Raw: string, word2Raw: string) {
  const word1 = (word1Raw ?? "").trim();
  const word2 = (word2Raw ?? "").trim();
  if (!word1 || !word2) {
    return NextResponse.json({ ok: false, error: "word1 and word2 are required" }, { status: 400 });
  }

  const idea = await generateWithOpenAI(word1, word2);

  // Firestore 保存（失敗しても生成結果は返す）
  let ideaId: string | null = null;
  try {
    const ref = await db.collection("ideas").add({
      word1,
      word2,
      idea,
      createdAt: FieldValue.serverTimestamp(),
      source: "openai",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    });
    ideaId = ref.id;
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true, idea, ideaId });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return await handleGenerate(body?.word1, body?.word2);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

// ブラウザでURL直打ちして確認できるように GET も用意（?word1=...&word2=...）
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const word1 = searchParams.get("word1") ?? "";
    const word2 = searchParams.get("word2") ?? "";
    return await handleGenerate(word1, word2);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
