import { NextResponse } from "next/server"
import { requireCurrentUser } from "@/lib/server/api-helpers"
import { createAdminSupabaseClient } from "@/lib/supabase/server"

/**
 * POST /api/notifications/fcm-token
 * Saves (or refreshes) a Firebase Cloud Messaging registration token for the current user.
 *
 * Request body: { token: string, deviceInfo?: string }
 * Response:     { ok: true }
 */
export async function POST(request: Request) {
  try {
    const session = await requireCurrentUser()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { token, deviceInfo } = body
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "token is required" }, { status: 400 })
    }

    // Upsert so refreshed tokens don't cause duplicate key errors
    const { error } = await session.supabase.from("fcm_tokens").upsert(
      {
        user_id: session.user.id,
        token,
        device_info: deviceInfo || "",
      },
      { onConflict: "user_id,token" }
    )

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

/**
 * DELETE /api/notifications/fcm-token
 * Removes a specific FCM token on logout or device unregister.
 *
 * Request body: { token: string }
 * Response:     { ok: true }
 */
export async function DELETE(request: Request) {
  try {
    const session = await requireCurrentUser()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { token } = body
    if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 })

    // Use admin client so RLS doesn't block the delete path
    const admin = createAdminSupabaseClient()
    const { error } = await admin
      .from("fcm_tokens")
      .delete()
      .eq("user_id", session.user.id)
      .eq("token", token)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
