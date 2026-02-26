import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

type BaseIdea = {
  serviceName: string;
  concept: string;
  target: string;
  revenueModel: string;
  marketScore: number;
  profitScore: number;
  buzzScore: number;
  overallScore: number;
  mvp: string;
  monetize: string;
  expansion: string;
  actionPlan: string;
};

type DeepPlan = {
  executionPlan: string;
  costEstimate: string;
  channelStrategy: string;
  techStack: string;
  riskAndFailurePatterns: string;
};

function asText(v: any): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

function extractJsonObject(text: string): any {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("JSON not found");
  const jsonText = text.slice(start, end + 1);
  return JSON.parse(jsonText);
}

function normalizeDeep(raw: any): DeepPlan {
  const deep: DeepPlan = {
    executionPlan: asText(raw?.executionPlan),
    costEstimate: asText(raw?.costEstimate),
    channelStrategy: asText(raw?.channelStrategy),
    techStack: asText(raw?.techStack),
    riskAndFailurePatterns: asText(raw?.riskAndFailurePatterns),
  };

  if (!deep.executionPlan) deep.executionPlan = "（例）2週: MVP→4週: 初回売上→8週: 伸長→12週: 固定化";
  if (!deep.costEstimate) deep.costEstimate = "（例）初期費用と粗利の前提、損益分岐の式を提示";
  if (!deep.channelStrategy) deep.channelStrategy = "（例）最初の販売場所→次の拡張→再現性のある集客";
  if (!deep.techStack) deep.techStack = "（例）最小構成の技術要素と、外注/ノーコード代替";
  if (!deep.riskAndFailurePatterns) deep.riskAndFailurePatterns = "（例）失敗パターンと回避策";

  return deep;
}

async function deepenWithOpenAI(input: {
  word1: string;
  word2: string;
  idea: BaseIdea;
}): Promise<{ deep: DeepPlan; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

  const model = process.env.OPENAI_MODEL || "gpt-5.2-chat-latest";

  const system = [
    "あなたは事業化支援の実務プランナーです。",
    "必ず JSON だけを返してください（コードフェンスや説明文は禁止）。",
    "与えられたアイデアを壊さずに、実行可能性が伝わる粒度まで落とし込んでください。",
    "具体性は出すが、外部検索が必要な固有URLや特定会社名の列挙は避け、探し方や候補カテゴリで書いてください。",
    "数字は仮置きでよいが、前提→計算→結論の順でわかる形にしてください。",
    "出力は指定スキーマのキー名に厳密一致させ、余計なキーは追加しないでください。",
  ].join("\n");

  const user = [
    "次の2語アイデアを『事業化モード』として詳細化してください。",
    `word1: ${input.word1}`,
    `word2: ${input.word2}`,
    "",
    "元アイデア(JSON):",
    JSON.stringify(input.idea),
    "",
    "狙い：読んだ人が『これ、もう動ける』と思うレベルの手順と数字にする。",
    "ただし、夢を壊すほどの細かい枝葉（法律/規約/手続きの長文）は出さない。",
    "",
    "出力JSONスキーマ（キー名一致・文字列で返す）:",
    "{",
    '  \"executionPlan\": \"90日ロードマップ。2週/4週/8週/12週で、やること・成果物・判断基準を箇条書きで\",',
    '  \"costEstimate\": \"初期コスト/運転コスト/粗利の前提と、損益分岐の試算（単価×件数）を短く\",',
    '  \"channelStrategy\": \"最初に売る場所→伸ばす場所→再現性のある集客導線。広告/コミュニティ/検索のどれで刺すか\",',
    '  \"techStack\": \"最小構成の技術スタック。ノーコード代替/外注の切り分けも含める\",',
    '  \"riskAndFailurePatterns\": \"ありがちな失敗3〜5個と、回避策（プロセス/設計で潰す）\"',
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
  return { deep: normalizeDeep(obj), model };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const word1 = asText(body?.word1);
    const word2 = asText(body?.word2);
    const idea = body?.idea as BaseIdea | undefined;
    const ideaId = asText(body?.ideaId);

    if (!word1 || !word2 || !idea) {
      return NextResponse.json({ ok: false, error: "word1, word2, idea are required" }, { status: 400 });
    }

    const { deep, model } = await deepenWithOpenAI({ word1, word2, idea });

    // Firestore 保存（失敗してもレスポンスは返す）
    if (ideaId) {
      try {
        await db.collection("ideas").doc(ideaId).set(
          {
            deep,
            deepGeneratedAt: FieldValue.serverTimestamp(),
            deepModel: model,
          },
          { merge: true }
        );
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ ok: true, deep, ideaId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
