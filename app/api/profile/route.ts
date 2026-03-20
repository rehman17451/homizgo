import { NextResponse } from "next/server"
import { requireCurrentUser } from "@/lib/server/api-helpers"

/**
 * PATCH /api/profile
 * Updates the current user's profile fields.
 *
 * Request body (all fields optional):
 * { name?: string, phone?: string, college?: string, avatar?: string }
 */
export async function PATCH(request: Request) {
  try {
    const session = await requireCurrentUser()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = String(body.name).trim()
    if (body.phone !== undefined) updates.phone = String(body.phone).trim()
    if (body.college !== undefined) updates.college = String(body.college).trim()
    if (body.avatar !== undefined) updates.avatar = body.avatar

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const { error } = await session.supabase
      .from("profiles")
      .update(updates)
      .eq("id", session.user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

/**
 * GET /api/profile
 * Returns the current user's profile (alias for /api/auth/me).
 */
export async function GET() {
  const session = await requireCurrentUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ user: session.user })
}
