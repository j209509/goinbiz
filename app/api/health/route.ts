import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
  try {
    const ref = db.collection("_health").doc("ping");
    await ref.set({ ts: FieldValue.serverTimestamp() }, { merge: true });
    const snap = await ref.get();
    return NextResponse.json({ ok: true, ts: snap.data()?.ts ?? null });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}