import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: must("FIREBASE_PROJECT_ID"),
          clientEmail: must("FIREBASE_CLIENT_EMAIL"),
          privateKey: must("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
        }),
      });

export const db = getFirestore(app);
