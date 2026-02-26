import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";

type GenerateResponse = {
  ideaId: string;
  result: {
    title: string;
    oneLine: string;
    summary: string;
    businessModel: string;
    goToMarket: string;
    risks: string[];
    nextActions: string[];
  };
  score: {
    total: number;
    market: number;
    monetization: number;
    virality: number;
  };
  revealAt: number; // ms
  ownerToken: string;
};

function mustStr(v: unknown, name: string): string {
  if (typeof v !== "string" || !v.trim()) throw new Error(`Invalid ${name}`);
  return v.trim();
}

function hashOwnerToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function clampScore(n: any): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function randomToken(len = 32): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Use POST with JSON body {wordA, wordB} to generate an idea.",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const wordA = mustStr(body.wordA, "wordA");
    const wordB = mustStr(body.wordB, "wordB");

    const prompt = `
あなたは「無関係な2語を強引に結び付けて、事業アイデアにする」プロです。
以下の2語を必ず使って、日本語で事業アイデアを1つ生成してください。

制約:
- 出力は必ずJSONのみ（前後に文章を付けない）
- 数値スコアは0〜100の整数
- 煽りや誇張は控えめ、具体性重視
- タイトルは20文字以内を目安

入力語:
- A: ${wordA}
- B: ${wordB}

出力JSONスキーマ:
{
  "title": string,
  "oneLine": string,
  "summary": string,
  "businessModel": string,
  "goToMarket": string,
  "risks": string[],
  "nextActions": string[],
  "score": { "total": number, "market": number, "monetization": number, "virality": number }
}
`.trim();

    // OpenAI呼び出し（fetchで実装。SDK不要）
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.8,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`OpenAI error: ${r.status} ${t}`);
    }

    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("OpenAI returned no content");

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("OpenAI output was not valid JSON");
    }

    const scoreObj = parsed.score ?? {};
    const score = {
      total: clampScore(scoreObj.total),
      market: clampScore(scoreObj.market),
      monetization: clampScore(scoreObj.monetization),
      virality: clampScore(scoreObj.virality),
    };

    const ownerToken = randomToken(40);
    const now = Date.now();
    const revealAt = now + 24 * 60 * 60 * 1000;

    const doc = {
      wordA,
      wordB,
      result: {
        title: String(parsed.title ?? ""),
        oneLine: String(parsed.oneLine ?? ""),
        summary: String(parsed.summary ?? ""),
        businessModel: String(parsed.businessModel ?? ""),
        goToMarket: String(parsed.goToMarket ?? ""),
        risks: Array.isArray(parsed.risks) ? parsed.risks.map((x: any) => String(x)) : [],
        nextActions: Array.isArray(parsed.nextActions)
          ? parsed.nextActions.map((x: any) => String(x))
          : [],
      },
      score,
      createdAt: FieldValue.serverTimestamp(),
      revealAt: new Date(revealAt),
      privateUntil: new Date(revealAt),
      ownerTokenHash: hashOwnerToken(ownerToken),
    };

    const ref = await db.collection("ideas").add(doc);

    const resp: GenerateResponse = {
      ideaId: ref.id,
      result: doc.result,
      score: doc.score,
      revealAt,
      ownerTokenHash: hashOwnerToken(ownerToken),
    };

    return NextResponse.json(resp);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}