import { NextResponse } from "next/server"
import { requireCurrentUser } from "@/lib/server/api-helpers"

export async function POST(request: Request) {
  try {
    const session = await requireCurrentUser()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { otherUserId, otherUserName, propertyId } = body
    if (!otherUserId || !otherUserName) {
      return NextResponse.json({ error: "Missing user info" }, { status: 400 })
    }

    const participants = [session.user.id, otherUserId].sort()
    const participantNames = participants[0] === session.user.id
      ? [session.user.name, otherUserName]
      : [otherUserName, session.user.name]

    const { data: existing } = await session.supabase
      .from("chat_threads")
      .select("*")
      .eq("property_id", propertyId || null)
      .contains("participants", participants)
      .maybeSingle()
    if (existing) return NextResponse.json({ threadId: existing.id })

    const { data, error } = await session.supabase
      .from("chat_threads")
      .insert({
        participants,
        participant_names: participantNames,
        property_id: propertyId || null,
      })
      .select("id")
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ threadId: data.id })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
