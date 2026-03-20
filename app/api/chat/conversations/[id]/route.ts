import { NextResponse } from "next/server"
import { requireCurrentUser } from "@/lib/server/api-helpers"

/**
 * DELETE /api/chat/conversations/[id]
 * Deletes an entire conversation (and all messages via CASCADE).
 * Only participants (student or owner) can delete.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await requireCurrentUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify caller is a participant
  const { data: convo, error: findErr } = await session.supabase
    .from("conversations")
    .select("student_id, owner_id")
    .eq("id", id)
    .single()

  if (findErr || !convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

  const userId = session.user.id
  if (convo.student_id !== userId && convo.owner_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Delete conversation — messages cascade via FK
  const { error } = await session.supabase
    .from("conversations")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
