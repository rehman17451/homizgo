import { NextResponse } from "next/server"
import { requireCurrentUser, mapConversation } from "@/lib/server/api-helpers"

/**
 * POST /api/chat/start-conversation
 *
 * Body: { ownerId: string }
 *
 * Only users with role 'user' (students) can create a conversation.
 * The target must have role 'landlord' or 'pgowner'.
 * If a conversation between the pair already exists, returns the existing id.
 *
 * Response: { conversationId: string }
 */
export async function POST(request: Request) {
  try {
    const session = await requireCurrentUser()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Role guard — only students (role = 'user') can start conversations
    if (session.user.role !== "user") {
      return NextResponse.json(
        { error: "Only students can start a conversation" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { ownerId } = body as { ownerId?: string }

    if (!ownerId) {
      return NextResponse.json({ error: "Missing ownerId" }, { status: 400 })
    }

    // Verify the target user exists and is a landlord or pgowner
    const { data: ownerProfile, error: ownerError } = await session.supabase
      .from("profiles")
      .select("id,role")
      .eq("id", ownerId)
      .single()

    if (ownerError || !ownerProfile) {
      return NextResponse.json({ error: "Owner not found" }, { status: 404 })
    }

    if (ownerProfile.role !== "landlord" && ownerProfile.role !== "pgowner") {
      return NextResponse.json(
        { error: "Target user must be a landlord or PG owner" },
        { status: 400 }
      )
    }

    // Upsert — return existing conversation if one already exists for this pair
    const { data: existing } = await session.supabase
      .from("conversations")
      .select("id")
      .eq("student_id", session.user.id)
      .eq("owner_id", ownerId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ conversationId: existing.id })
    }

    const { data, error } = await session.supabase
      .from("conversations")
      .insert({ student_id: session.user.id, owner_id: ownerId })
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { conversationId: data.id, conversation: mapConversation(data) },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
