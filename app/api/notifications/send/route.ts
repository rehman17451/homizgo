import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/server"
import { getFirebaseMessaging } from "@/lib/firebase/admin"

const NOTIFY_SECRET = process.env.NOTIFY_SECRET

/**
 * POST /api/notifications/send
 * Sends a Firebase Cloud Messaging push notification to a target user.
 * Requires the "x-notify-secret" header matching the NOTIFY_SECRET env var.
 *
 * Request body:
 * {
 *   userId: string          — target Supabase user ID
 *   title: string           — notification title
 *   body?: string           — notification body text
 *   data?: Record<string, string>  — arbitrary key/value payload
 *   saveToDb?: boolean      — persist to notifications table (default: true)
 * }
 *
 * Response: { ok: true, sent: number } — count of tokens successfully sent to
 */
export async function POST(request: Request) {
  try {
    // ── Auth: require secret header ────────────────────────────────────────
    if (!NOTIFY_SECRET) {
      return NextResponse.json({ error: "Server misconfiguration: NOTIFY_SECRET not set" }, { status: 500 })
    }
    const secretHeader = request.headers.get("x-notify-secret")
    if (secretHeader !== NOTIFY_SECRET) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, title, body: msgBody, data, saveToDb = true } = body

    if (!userId || !title) {
      return NextResponse.json({ error: "userId and title are required" }, { status: 400 })
    }

    // ── Fetch user's FCM tokens ────────────────────────────────────────────
    const adminSupabase = createAdminSupabaseClient()
    const { data: tokenRows, error: tokenError } = await adminSupabase
      .from("fcm_tokens")
      .select("token")
      .eq("user_id", userId)

    if (tokenError) return NextResponse.json({ error: tokenError.message }, { status: 400 })
    if (!tokenRows || tokenRows.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: "No FCM tokens found for user" })
    }

    const tokens = tokenRows.map((r) => r.token as string)

    // ── Send via Firebase Messaging ────────────────────────────────────────
    const messaging = getFirebaseMessaging()

    const stringData: Record<string, string> = {}
    if (data && typeof data === "object") {
      for (const [k, v] of Object.entries(data)) stringData[k] = String(v)
    }

    const sendResult = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title,
        body: msgBody || "",
      },
      data: stringData,
      webpush: {
        notification: {
          title,
          body: msgBody || "",
          icon: "/icon-192.png",
        },
        fcmOptions: {
          link: stringData.link || "/",
        },
      },
    })

    const successCount = sendResult.successCount

    // ── Persist to notifications table (optional) ──────────────────────────
    if (saveToDb) {
      await adminSupabase.from("notifications").insert({
        user_id: userId,
        title,
        body: msgBody || "",
        data: data || {},
      })
    }

    // ── Clean up invalid tokens ────────────────────────────────────────────
    const invalidTokens: string[] = []
    sendResult.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error?.code === "messaging/registration-token-not-registered") {
        invalidTokens.push(tokens[idx])
      }
    })
    if (invalidTokens.length > 0) {
      await adminSupabase.from("fcm_tokens").delete().in("token", invalidTokens)
    }

    return NextResponse.json({ ok: true, sent: successCount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send notification" }, { status: 500 })
  }
}

/**
 * GET /api/notifications/send
 * Returns the current user's in-app notification history.
 * Requires standard session auth (no secret needed).
 *
 * Query params: ?limit=20&offset=0
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 100)
    const offset = Number(searchParams.get("offset") || "0")

    // We use the Authorization header approach to identify the user here
    // because server cookies may not always carry over in pure API scenarios
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const token = authHeader.slice(7)

    const adminSupabase = createAdminSupabaseClient()
    const { data: userData, error: authError } = await adminSupabase.auth.getUser(token)
    if (authError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await adminSupabase
      .from("notifications")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ notifications: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch notifications" }, { status: 500 })
  }
}
