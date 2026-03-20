import { NextResponse } from "next/server"
import { requireCurrentUser } from "@/lib/server/api-helpers"

export async function POST(request: Request) {
  try {
    const session = await requireCurrentUser()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { threadId, receiverId, message, propertyId } = body
    if (!threadId || !receiverId || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { data, error } = await session.supabase
      .from("chat_messages")
      .insert({
        thread_id: threadId,
        sender_id: session.user.id,
        sender_name: session.user.name,
        receiver_id: receiverId,
        property_id: propertyId || null,
        message,
        timestamp: now,
      })
      .select("*")
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await session.supabase
      .from("chat_threads")
      .update({ last_message: message, last_timestamp: now })
      .eq("id", threadId)

    return NextResponse.json({ message: data })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
