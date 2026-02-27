import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

function toMs(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v?.toMillis === "function") return v.toMillis();
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ideaId = String(searchParams.get("ideaId") ?? "").trim();
    if (!ideaId) {
      return NextResponse.json({ ok: false, error: "ideaId is required" }, { status: 400 });
    }
    const snap = await db.collection("ideas").doc(ideaId).get();
    if (!snap.exists) {
      return NextResponse.json({ ok: false, error: "idea not found" }, { status: 404 });
    }
    const data = snap.data() ?? {};
    return NextResponse.json({
      ok: true,
      id: snap.id,
      word1: data.word1 ?? "",
      word2: data.word2 ?? "",
      createdAtMs: toMs(data.createdAtMs) ?? toMs(data.createdAt) ?? null,
      publishAtMs: toMs(data.publishAtMs) ?? null,
      protectedUntilMs: toMs(data.protectedUntilMs) ?? null,
      idea: data.idea ?? null,
      pickReason: data.pickReason ?? "",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
