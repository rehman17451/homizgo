import { NextResponse } from "next/server"
import { requireCurrentUser, mapMessage2 } from "@/lib/server/api-helpers"

/**
 * GET /api/chat/messages/:conversationId
 *
 * Returns all messages for the conversation in ascending chronological order.
 * Caller must be a participant; RLS enforces this at the database level too.
 *
 * Response: { messages: Message[] }
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params

  const session = await requireCurrentUser()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify caller is a participant (belt-and-suspenders on top of RLS)
  const { data: convo, error: convoError } = await session.supabase
    .from("conversations")
    .select("student_id, owner_id")
    .eq("id", conversationId)
    .single()

  if (convoError || !convo) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    )
  }

  const userId = session.user.id
  if (convo.student_id !== userId && convo.owner_id !== userId) {
    return NextResponse.json(
      { error: "You are not a participant in this conversation" },
      { status: 403 }
    )
  }

  const { data, error } = await session.supabase
    .from("messages")
    .select("id, conversation_id, sender_id, message_text, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ messages: (data ?? []).map(mapMessage2) })
}
