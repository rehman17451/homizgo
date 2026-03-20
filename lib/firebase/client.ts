"use client"

/**
 * Firebase client SDK — browser only.
 * Import this ONLY in Client Components.
 * Provides Firebase Analytics and Cloud Messaging (FCM) for the React frontend.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics"
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// ─── App (singleton) ─────────────────────────────────────────────────────────

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp()
  return initializeApp(firebaseConfig)
}

// ─── Analytics ───────────────────────────────────────────────────────────────

let analyticsInstance: Analytics | null = null

/**
 * Returns the Firebase Analytics instance.
 * Guards against SSR (isSupported() is false in Node).
 *
 * @example
 * const analytics = await getFirebaseAnalytics()
 * if (analytics) logEvent(analytics, "page_view", { page_title: "Home" })
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null
  if (analyticsInstance) return analyticsInstance

  const supported = await isSupported()
  if (!supported) return null

  const app = getFirebaseApp()
  analyticsInstance = getAnalytics(app)
  return analyticsInstance
}

// ─── Messaging (FCM) ─────────────────────────────────────────────────────────

let messagingInstance: Messaging | null = null

function getFirebaseMessagingClient(): Messaging | null {
  if (typeof window === "undefined") return null
  if (messagingInstance) return messagingInstance
  const app = getFirebaseApp()
  messagingInstance = getMessaging(app)
  return messagingInstance
}

/**
 * Requests notification permission and returns the FCM registration token.
 * Returns null if permission is denied or Messaging is not supported.
 *
 * @example
 * const token = await requestNotificationPermission()
 * if (token) await fetch("/api/notifications/fcm-token", { method: "POST", body: JSON.stringify({ token }) })
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) return null

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return null

  const messaging = getFirebaseMessagingClient()
  if (!messaging) return null

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey) {
    console.error("NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set.")
    return null
  }

  try {
    const token = await getToken(messaging, { vapidKey })
    return token || null
  } catch (err) {
    console.error("Failed to get FCM token:", err)
    return null
  }
}

/**
 * Listen for foreground push messages.
 * Call this once in a top-level component to handle in-app notification toasts.
 *
 * @example
 * onForegroundMessage((payload) => toast(payload.notification?.title ?? "New notification"))
 */
export function onForegroundMessage(
  callback: (payload: Parameters<Parameters<typeof onMessage>[1]>[0]) => void
): (() => void) | null {
  const messaging = getFirebaseMessagingClient()
  if (!messaging) return null
  return onMessage(messaging, callback)
}
