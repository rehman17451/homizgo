import { NextResponse } from "next/server"
import { requireCurrentUser, mapConversation } from "@/lib/server/api-helpers"

/**
 * GET /api/chat/conversations
 *
 * Returns all conversations where the authenticated user is either the
 * student or the owner participant. Results are ordered newest-first.
 *
 * Response: { conversations: Conversation[] }
 */
export async function GET() {
  const session = await requireCurrentUser()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  // RLS on `conversations` already enforces participant-only access.
  // We OR both columns explicitly so the index is used on both sides.
  const { data, error } = await session.supabase
    .from("conversations")
    .select("id, student_id, owner_id, created_at")
    .or(`student_id.eq.${userId},owner_id.eq.${userId}`)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ conversations: (data ?? []).map(mapConversation) })
}
