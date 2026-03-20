/**
 * Firebase Admin SDK — server-side only.
 * Import this ONLY in Next.js API routes / Server Components / Server Actions.
 * Never import in client components.
 */

import * as admin from "firebase-admin"
import { getApp, getApps, initializeApp } from "firebase-admin/app"
import { getMessaging } from "firebase-admin/messaging"

function initFirebaseAdmin() {
  if (getApps().length > 0) return getApp()

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON env var is missing. " +
        "Download the service account JSON from Firebase Console → Project Settings → Service Accounts."
    )
  }

  let serviceAccount: admin.ServiceAccount
  try {
    serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. Ensure the value is a JSON string, not a file path."
    )
  }

  return initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.projectId as string,
  })
}

export function getFirebaseAdmin() {
  return initFirebaseAdmin()
}

export function getFirebaseMessaging() {
  initFirebaseAdmin()
  return getMessaging()
}

export { admin }
