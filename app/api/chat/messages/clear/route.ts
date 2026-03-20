import { NextResponse } from "next/server"
import { requireCurrentUser } from "@/lib/server/api-helpers"

/**
 * DELETE /api/chat/messages/clear
 * Clears all messages in a conversation but keeps the conversation itself.
 * Body: { conversationId: string }
 * Only participants can clear.
 */
export async function DELETE(request: Request) {
  const session = await requireCurrentUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let conversationId: string
  try {
    const body = await request.json()
    conversationId = body.conversationId
    if (!conversationId) throw new Error("missing conversationId")
  } catch {
    return NextResponse.json({ error: "conversationId is required" }, { status: 400 })
  }

  // Verify participant
  const { data: convo, error: findErr } = await session.supabase
    .from("conversations")
    .select("student_id, owner_id")
    .eq("id", conversationId)
    .single()

  if (findErr || !convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

  const userId = session.user.id
  if (convo.student_id !== userId && convo.owner_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { error } = await session.supabase
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
