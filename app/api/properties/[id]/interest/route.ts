import { NextResponse } from "next/server"
import { requireCurrentUser } from "@/lib/server/api-helpers"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCurrentUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const { data: existing } = await session.supabase
    .from("property_interests")
    .select("property_id,user_id")
    .eq("property_id", id)
    .eq("user_id", session.user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await session.supabase
      .from("property_interests")
      .delete()
      .eq("property_id", id)
      .eq("user_id", session.user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ interested: false })
  }

  const { error } = await session.supabase.from("property_interests").insert({
    property_id: id,
    user_id: session.user.id,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ interested: true })
}
