import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

function toMs(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  // Firestore Timestamp
  if (typeof v?.toMillis === "function") return v.toMillis();
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function effectivePublishAtMs(doc: any): number {
  const createdAtMs = toMs(doc?.createdAtMs) ?? toMs(doc?.createdAt) ?? Date.now();
  const basePublishAtMs = toMs(doc?.publishAtMs) ?? createdAtMs + 24 * 60 * 60 * 1000;
  const protectedUntilMs = toMs(doc?.protectedUntilMs);
  if (protectedUntilMs != null) return Math.max(basePublishAtMs, protectedUntilMs);
  return basePublishAtMs;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ideaId = String(body?.ideaId ?? "").trim();
    const action = String(body?.action ?? "").trim();
    if (!ideaId) {
      return NextResponse.json({ ok: false, error: "ideaId is required" }, { status: 400 });
    }
    if (action !== "publish_now" && action !== "protect_365") {
      return NextResponse.json({ ok: false, error: "invalid action" }, { status: 400 });
    }

    const ref = db.collection("ideas").doc(ideaId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ ok: false, error: "idea not found" }, { status: 404 });
    }
    const data = snap.data() ?? {};

    const nowMs = Date.now();
    const currentPublishAtMs = toMs(data?.publishAtMs) ?? effectivePublishAtMs(data);
    const currentProtectedUntilMs = toMs(data?.protectedUntilMs);

    let publishAtMs = currentPublishAtMs;
    let protectedUntilMs = currentProtectedUntilMs;

    if (action === "publish_now") {
      // 既に保護中なら、公開は保護期限まで延期
      if (protectedUntilMs != null && protectedUntilMs > nowMs) publishAtMs = protectedUntilMs;
      else publishAtMs = nowMs;
    }

    if (action === "protect_365") {
      protectedUntilMs = nowMs + 365 * 24 * 60 * 60 * 1000;
      publishAtMs = Math.max(currentPublishAtMs, protectedUntilMs);
    }

    await ref.set(
      {
        publishAtMs,
        protectedUntilMs: protectedUntilMs ?? null,
        updatedAtMs: nowMs,
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, ideaId, publishAtMs, protectedUntilMs });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
