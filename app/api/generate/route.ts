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
  monetize: string;
  expansion: string;
  actionPlan: string;
};

function normalizeScore(v: any): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;

  // Model sometimes returns 0-10 or 0-1 despite instructions.
  // Interpret small ranges and scale up to 0-100.
  let scaled = n;
  if (scaled > 0 && scaled <= 1) scaled = scaled * 100;
  else if (scaled >= 0 && scaled <= 10) scaled = scaled * 10;

  return Math.max(0, Math.min(100, Math.round(scaled)));
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
    marketScore: normalizeScore(raw?.marketScore),
    profitScore: normalizeScore(raw?.profitScore),
    buzzScore: normalizeScore(raw?.buzzScore),
    overallScore: normalizeScore(raw?.overallScore),
    mvp: asText(raw?.mvp),
    // UI 側の期待キーに合わせる（旧キーが来ても吸収）
    monetize: asText(raw?.monetize ?? raw?.monetization),
    expansion: asText(raw?.expansion),
    actionPlan: asText(raw?.actionPlan ?? raw?.roadmap),
  };

  // 最低限の穴埋め（空のまま UI が崩れるのを防ぐ）
  if (!idea.serviceName) idea.serviceName = "新規サービス";
  if (!idea.concept) idea.concept = "2語を強引に結びつけた事業アイデア";
  if (!idea.target) idea.target = "一般ユーザー";
  if (!idea.revenueModel) idea.revenueModel = "サブスクリプション / 広告 / 手数料";
  if (!idea.mvp) idea.mvp = "入力→生成→共有ができる最小機能";
  if (!idea.monetize) idea.monetize = "（例）法人プラン＋紹介手数料の二段構え";
  if (!idea.expansion) idea.expansion = "（例）B2B提携・API提供・周辺カテゴリ横展開";
  if (!idea.actionPlan) idea.actionPlan = "（例）2週: 検証→4週: 初回売上→8週: 伸長施策";
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

type CandidatePack = {
  candidates: any[];
  bestIndex: number;
  reason?: string;
};

function toInt(v: any, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function pickBestFromPack(pack: CandidatePack): { idea: GeneratedIdea; reason: string } {
  const candidates = Array.isArray(pack?.candidates) ? pack.candidates : [];
  if (candidates.length === 0) throw new Error("No candidates");
  const idxRaw = toInt(pack?.bestIndex, 0);
  const idx = Math.max(0, Math.min(candidates.length - 1, idxRaw));
  const reason = asText(pack?.reason) || "";
  return { idea: normalizeIdea(candidates[idx]), reason };
}

async function generateWithOpenAI(word1: string, word2: string): Promise<GeneratedIdea> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

  // 既定は GPT-5.2 系（環境変数で上書き可）
  const model = process.env.OPENAI_MODEL || "gpt-5.2-chat-latest";

  const system = [
    "あなたは事業アイデア生成の専門家です。",
    "必ず JSON だけを返してください（コードフェンスや説明文は禁止）。",
    "スコアは 0〜100 の整数で返してください。",
    "ありきたりな内容は避け、実際に小さく始めて売上が立つ筋が見える内容にしてください。",
    "各フィールドは短文〜数行で、実現性の根拠（数字/理由/既存の行動様式）を必ず含めてください。",
    "外部リンクや引用は不要です。",
  ].join("\n");

  const user = [
    `次の2語を強引に掛け合わせて、"ありきたりではない" 事業アイデアを1つ作ってください。`,
    `word1: ${word1}`,
    `word2: ${word2}`,
    "",
    "出力は次のJSONスキーマに厳密に一致させてください（キー名も一致）。",
    "ポイント：",
    "- monetize は『どう金が入るか』を、最初の顧客獲得経路と単価感まで書く",
    "- expansion は『同じ仕組みで何を増やせるか』を、提携/横展開/データ資産化の観点で3案",
    "- actionPlan は 2週間で動くMVP→4週間で初回売上→8週間で伸ばす、の順で具体タスク",
    "{",
    '  "serviceName": "サービス名（短く）",',
    '  "concept": "一文でコンセプト",',
    '  "target": "想定ターゲット（短く）",',
    '  "revenueModel": "収益モデル（短く）",',
    '  "marketScore": 0,',
    '  "profitScore": 0,',
    '  "buzzScore": 0,',
    '  "overallScore": 0,',
    '  "mvp": "最小プロダクト（短文。やることが想像できる粒度）",',
    '  "monetize": "マネタイズ戦略（根拠と数字入り）",',
    '  "expansion": "拡張アイデア（3案。短文で）",',
    '  "actionPlan": "短期アクションプラン（2週/4週/8週の順で）"',
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
  return normalizeIdea(obj);
}

async function generateTopIdeaWithSelfReview(
  word1: string,
  word2: string
): Promise<{ idea: GeneratedIdea; model: string; reason: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

  const model = process.env.OPENAI_MODEL || "gpt-5.2-chat-latest";

  const system = [
    "あなたは事業アイデア生成の専門家です。",
    "必ず JSON だけを返してください（コードフェンスや説明文は禁止）。",
    "ありきたりな内容は避け、実際に小さく始めて売上が立つ筋が見える内容にしてください。",
    "各フィールドは短文〜数行で、実現性の根拠（数字/理由/既存の行動様式）を必ず含めてください。",
    "外部リンクや引用は不要です。",
    "出力は指定スキーマに厳密一致させ、余計なキーは追加しないでください。",
  ].join("\n");

  const user = [
    "次の2語を掛け合わせて、候補を3案作り、その中から最も事業化できる1案を自己審査して選んでください。",
    `word1: ${word1}`,
    `word2: ${word2}`,
    "",
    "審査基準（あなたの内部判断に使うだけで、出力には反映しなくてよい）：",
    "- 初回売上までの距離が近い（2〜4週間で最初の課金/受注が見える）",
    "- 単価が上げられる構造（継続課金 or 取引額連動 or 法人課金）",
    "- 集客導線が具体（既存の行動/コミュニティ/検索意図/広告訴求が想像できる）",
    "- 仕組みが横展開できる（同じ型でカテゴリを増やせる）",
    "",
    "出力は次のJSONのみ（キー名一致）。",
    "candidates は必ず3要素。bestIndex は 0/1/2。reason は 1〜2行。",
    "{",
    '  "candidates": [',
    '    {',
    '      "serviceName": "サービス名（短く）",',
    '      "concept": "一文でコンセプト",',
    '      "target": "想定ターゲット（短く）",',
    '      "revenueModel": "収益モデル（短く）",',
    '      "marketScore": 0,',
    '      "profitScore": 0,',
    '      "buzzScore": 0,',
    '      "overallScore": 0,',
    '      "mvp": "最小プロダクト（短文。やることが想像できる粒度）",',
    '      "monetize": "マネタイズ戦略（根拠と数字入り）",',
    '      "expansion": "拡張アイデア（3案。短文で）",',
    '      "actionPlan": "短期アクションプラン（2週/4週/8週の順で）"',
    '    },',
    '    {',
    '      "serviceName": "...",',
    '      "concept": "...",',
    '      "target": "...",',
    '      "revenueModel": "...",',
    '      "marketScore": 0,',
    '      "profitScore": 0,',
    '      "buzzScore": 0,',
    '      "overallScore": 0,',
    '      "mvp": "...",',
    '      "monetize": "...",',
    '      "expansion": "...",',
    '      "actionPlan": "..."',
    '    },',
    '    {',
    '      "serviceName": "...",',
    '      "concept": "...",',
    '      "target": "...",',
    '      "revenueModel": "...",',
    '      "marketScore": 0,',
    '      "profitScore": 0,',
    '      "buzzScore": 0,',
    '      "overallScore": 0,',
    '      "mvp": "...",',
    '      "monetize": "...",',
    '      "expansion": "...",',
    '      "actionPlan": "..."',
    '    }',
    '  ],',
    '  "bestIndex": 0,',
    '  "reason": "この案が勝てる理由（1〜2行）"',
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
  const pack = obj as CandidatePack;
  const picked = pickBestFromPack(pack);
  return { idea: picked.idea, model, reason: picked.reason };
}

async function handleGenerate(word1Raw: string, word2Raw: string) {
  const word1 = (word1Raw ?? "").trim();
  const word2 = (word2Raw ?? "").trim();
  if (!word1 || !word2) {
    return NextResponse.json({ ok: false, error: "word1 and word2 are required" }, { status: 400 });
  }

  // 3案生成→自己審査で最上位1案を返す（失敗時は単発生成へフォールバック）
  let idea: GeneratedIdea;
  let usedModel = process.env.OPENAI_MODEL || "gpt-5.2-chat-latest";
  let pickReason = "";
  try {
    const r = await generateTopIdeaWithSelfReview(word1, word2);
    idea = r.idea;
    usedModel = r.model;
    pickReason = r.reason;
  } catch {
    idea = await generateWithOpenAI(word1, word2);
    usedModel = process.env.OPENAI_MODEL || "gpt-5.2-chat-latest";
  }

  // Firestore 保存（失敗しても生成結果は返す）
  let ideaId: string | null = null;
  try {
    const ref = await db.collection("ideas").add({
      word1,
      word2,
      idea,
      pickReason,
      createdAt: FieldValue.serverTimestamp(),
      source: "openai",
      model: usedModel,
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
