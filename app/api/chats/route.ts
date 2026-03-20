import { NextResponse } from "next/server"
import { mapThread, requireCurrentUser } from "@/lib/server/api-helpers"

export async function GET() {
  const session = await requireCurrentUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await session.supabase
    .from("chat_threads")
    .select("id,participants,participant_names,property_id,last_message,last_timestamp,chat_messages(*)")
    .contains("participants", [session.user.id])
    .order("last_timestamp", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ threads: (data || []).map(mapThread) })
}
