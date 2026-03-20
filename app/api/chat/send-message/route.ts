import { NextResponse } from "next/server"
import { requireCurrentUser, mapMessage2 } from "@/lib/server/api-helpers"

/**
 * POST /api/chat/send-message
 *
 * Body: { conversationId: string; messageText: string }
 *
 * Both participants (student and owner) can send messages.
 * Participant check is enforced both in application logic and via RLS.
 *
 * Response: { message: Message }
 */
export async function POST(request: Request) {
  try {
    const session = await requireCurrentUser()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId, messageText } = body as {
      conversationId?: string
      messageText?: string
    }

    if (!conversationId || !messageText?.trim()) {
      return NextResponse.json(
        { error: "Missing conversationId or messageText" },
        { status: 400 }
      )
    }

    // Verify caller is a participant of this conversation
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
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        message_text: messageText.trim(),
      })
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: mapMessage2(data) }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
